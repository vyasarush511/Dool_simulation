import { randomUUID } from "node:crypto";
import {
  amountToCall,
  applyBettingAction,
  beginBettingRound,
  commitmentCapForTrick,
  grossCollected,
  legalBettingActions,
  rulesForVariant,
  startBettingHand,
} from "./bettingRules.js";
import { dealPartialDeck, gameVariant, POKER_DOOL_VARIANTS } from "./deck.js";
import { estimateSideEquities, evaluatePokerDoolSide, minimumContractForTricks } from "./handEvaluation.js";
import { createReplayLog, recordReplayEvent, summarizeReplay } from "./replayLog.js";

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60;
const PLAYERS = ["Player 1", "Player 2"];
const DEFAULT_TRUMP = "NT";
const DEFAULT_CONTRACT_TRICKS = 5;
const RANK_VALUE = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function createPokerDoolSession({ player = 0, variant = "36_52" } = {}) {
  cleanupSessions();

  const session = buildPokerDoolSession({ variant });
  sessions.set(session.id, session);
  return snapshotPokerDoolSession(session, normalizePlayer(player));
}

export function redealPokerDoolSession({ sessionId, player = 0, variant = undefined } = {}) {
  const existingSession = getSession(sessionId);
  const nextSession = buildPokerDoolSession({
    id: existingSession.id,
    createdAt: existingSession.createdAt,
    variant: variant ?? existingSession.variant.id,
  });

  sessions.set(existingSession.id, nextSession);
  return snapshotPokerDoolSession(nextSession, normalizePlayer(player));
}

function buildPokerDoolSession({ id = randomUUID(), createdAt = Date.now(), variant = "36_52" } = {}) {
  const selectedVariant = gameVariant(variant);
  const cardsPerSeat = selectedVariant.cardsPerSeat;
  const deal = dealPartialDeck({ variant: selectedVariant.id });
  const trumpSuit = DEFAULT_TRUMP;
  const contractTricks = minimumContractForTricks(cardsPerSeat);
  const evaluations = [
    evaluatePokerDoolSide({ hands: deal.hands, side: 0, trumpSuit }),
    evaluatePokerDoolSide({ hands: deal.hands, side: 1, trumpSuit }),
  ];
  const equities = estimateSideEquities(evaluations[0], evaluations[1]);
  const rules = rulesForVariant(selectedVariant.id);
  const betting = startBettingHand({ players: PLAYERS, rules });
  const session = {
    id,
    createdAt,
    updatedAt: Date.now(),
    players: PLAYERS,
    variant: selectedVariant,
    rules,
    cardsPerSeat,
    totalTricks: cardsPerSeat,
    bettingRounds: [...selectedVariant.bettingRounds],
    nextRoundIndex: 0,
    trumpSuit,
    contractTricks,
    betting,
    activeRound: false,
    pendingPlayer: null,
    actedSinceAggression: [false, false],
    folded: false,
    foldNegotiation: null,
    showdown: false,
    playStarted: false,
    currentSeat: null,
    leaderSeat: 0,
    currentTrick: [],
    lastTrick: [],
    tricksPlayed: 0,
    tricksWon: [0, 0],
    hands: deal.hands,
    deadCards: deal.deadCards,
    deckUniverseCards: deal.universeCards,
    evaluations,
    equities,
    replay: createReplayLog({
      handId: randomUUID(),
      players: PLAYERS,
      cardsPerSeat,
      rules,
    }),
  };

  recordReplayEvent(session.replay, {
    type: "deal",
    variant: selectedVariant.id,
    cardsPerSeat,
    totalCards: cardsPerSeat * 4,
    deadCards: deal.deadCards.length,
    universeCards: deal.universeCards.length,
  });

  return session;
}

export function getPokerDoolSession({ sessionId, player = 0 }) {
  return snapshotPokerDoolSession(getSession(sessionId), normalizePlayer(player));
}

export function startNextPokerDoolBettingRound({ sessionId, player = 0 }) {
  const session = getSession(sessionId);

  if (session.folded || session.showdown) {
    throw new Error("This hand is already complete. Start a new Poker-Dool hand.");
  }

  if (session.activeRound) {
    return snapshotPokerDoolSession(session, normalizePlayer(player));
  }

  const trick = session.bettingRounds[session.nextRoundIndex];
  if (trick === undefined) {
    session.showdown = true;
    recordReplayEvent(session.replay, { type: "showdown" });
    session.updatedAt = Date.now();
    return snapshotPokerDoolSession(session, normalizePlayer(player));
  }

  openBettingRound(session, trick, trick === 0 ? 0 : sideForSeat(session.currentSeat ?? session.leaderSeat));

  session.updatedAt = Date.now();
  return snapshotPokerDoolSession(session, normalizePlayer(player));
}

export function applyPokerDoolHumanAction({ sessionId, player, action }) {
  const session = getSession(sessionId);
  const actingPlayer = normalizePlayer(player);

  if (session.foldNegotiation) {
    throw new Error("Resolve the Ready to Fold bid negotiation first.");
  }

  if (!session.activeRound || session.pendingPlayer === null) {
    throw new Error("There is no active betting turn.");
  }

  if (actingPlayer !== session.pendingPlayer) {
    throw new Error(`It is ${session.players[session.pendingPlayer]}'s betting turn.`);
  }

  if (
    session.betting.trick === 0 &&
    ["bet", "raise"].includes(action.type) &&
    (action.contractTricks !== undefined || action.trumpSuit !== undefined)
  ) {
    updatePokerDoolContract(session, {
      contractTricks: action.contractTricks,
      trumpSuit: action.trumpSuit,
      player: actingPlayer,
      allowActivePreflop: true,
    });
  }

  applyActionToSession(session, { ...action, player: session.pendingPlayer });
  session.updatedAt = Date.now();
  return snapshotPokerDoolSession(session, actingPlayer);
}

export function playPokerDoolCard({ sessionId, player, seat, card }) {
  const session = getSession(sessionId);
  const viewerPlayer = normalizePlayer(player);
  const cleanSeat = Number(seat);
  const cleanCard = normalizeCard(card);

  if (session.activeRound) {
    throw new Error("Finish the betting window before playing a card.");
  }

  if (session.foldNegotiation) {
    throw new Error("Resolve the ready-to-fold offer before playing a card.");
  }

  if (!session.playStarted || session.currentSeat === null) {
    throw new Error("Card play has not started yet.");
  }

  if (session.showdown || session.folded) {
    throw new Error("This hand is complete.");
  }

  if (cleanSeat !== session.currentSeat) {
    throw new Error(`It is ${seatLabel(session.currentSeat)}'s turn to play.`);
  }

  if (sideForSeat(cleanSeat) !== viewerPlayer) {
    throw new Error(`This is ${session.players[sideForSeat(cleanSeat)]}'s card to play.`);
  }

  const legalCards = legalCardsForSeat(session, cleanSeat);
  if (!legalCards.some((candidate) => sameCard(candidate, cleanCard))) {
    throw new Error("That card is not legal here. Follow suit if possible.");
  }

  const hand = session.hands[cleanSeat];
  const cardIndex = hand.findIndex((candidate) => sameCard(candidate, cleanCard));
  const [playedCard] = hand.splice(cardIndex, 1);
  session.currentTrick.push({ seat: cleanSeat, card: playedCard });
  recordReplayEvent(session.replay, { type: "card", seat: cleanSeat, player: viewerPlayer, card: cardLabel(playedCard) });

  if (session.currentTrick.length < 4) {
    session.currentSeat = (cleanSeat + 1) % 4;
  } else {
    completeCurrentTrick(session);
  }

  session.updatedAt = Date.now();
  return snapshotPokerDoolSession(session, viewerPlayer);
}

export function requestPokerDoolReadyFold({ sessionId, player }) {
  const session = getSession(sessionId);
  const requester = normalizePlayer(player);

  if (session.foldNegotiation) {
    throw new Error("There is already a ready-to-fold offer pending.");
  }

  if (!session.activeRound || session.betting.trick !== 0 || session.pendingPlayer === null) {
    throw new Error("Ready to Fold is only available during trump bidding.");
  }

  if (session.pendingPlayer !== requester) {
    throw new Error("Ready to Fold is only available on your bidding turn.");
  }

  session.foldNegotiation = {
    status: "awaiting_offer",
    phase: "trump_bidding",
    requester,
    responder: 1 - requester,
    requestedSeat: null,
    requestedTrick: 0,
    originalContractTricks: session.contractTricks,
    originalTrumpSuit: session.trumpSuit,
    proposedContractTricks: session.contractTricks,
    proposedTrumpSuit: session.trumpSuit,
    offerAmount: 0,
  };
  session.betting.actionLog.push({
    type: "ready_fold_bid",
    player: requester,
    round: session.betting.round,
    trick: 0,
    contractTricks: session.contractTricks,
    trumpSuit: session.trumpSuit,
  });
  recordReplayEvent(session.replay, {
    type: "ready_fold_bid",
    player: requester,
    contractTricks: session.contractTricks,
    trumpSuit: session.trumpSuit,
  });
  session.updatedAt = Date.now();
  return snapshotPokerDoolSession(session, requester);
}

export function respondPokerDoolReadyFold({ sessionId, player, action, amount, contractTricks, trumpSuit }) {
  const session = getSession(sessionId);
  const actor = normalizePlayer(player);
  const negotiation = session.foldNegotiation;

  if (!negotiation) {
    throw new Error("There is no ready-to-fold offer pending.");
  }

  if (negotiation.status === "awaiting_offer") {
    if (actor !== negotiation.responder) {
      throw new Error(`${session.players[negotiation.responder]} must respond with an offer.`);
    }

    if (action === "let_fold") {
      finalizeFold(session, negotiation.requester, { reason: "ready-fold-declined" });
      return snapshotPokerDoolSession(session, actor);
    }

    if (action !== "offer") {
      throw new Error(`Unknown ready-to-fold response: ${action}`);
    }

    const offerAmount = sanitizeOfferAmount(amount, session, actor, { allowZero: true });
    const contractChoice = validateContractChoice(session, {
      contractTricks: contractTricks ?? session.contractTricks,
      trumpSuit: trumpSuit ?? session.trumpSuit,
    });
    negotiation.status = "awaiting_accept";
    negotiation.offerAmount = offerAmount;
    negotiation.proposedContractTricks = contractChoice.contractTricks;
    negotiation.proposedTrumpSuit = contractChoice.trumpSuit;
    session.betting.actionLog.push({
      type: "bid_save_offer",
      player: actor,
      amount: offerAmount,
      contractTricks: contractChoice.contractTricks,
      trumpSuit: contractChoice.trumpSuit,
      round: session.betting.round,
      trick: 0,
    });
    recordReplayEvent(session.replay, {
      type: "bid_save_offer",
      player: actor,
      amount: offerAmount,
      contractTricks: contractChoice.contractTricks,
      trumpSuit: contractChoice.trumpSuit,
    });
    session.updatedAt = Date.now();
    return snapshotPokerDoolSession(session, actor);
  }

  if (negotiation.status === "awaiting_accept") {
    if (actor !== negotiation.requester) {
      throw new Error(`${session.players[negotiation.requester]} must accept or fold.`);
    }

    if (action === "accept") {
      updatePokerDoolContract(session, {
        contractTricks: negotiation.proposedContractTricks,
        trumpSuit: negotiation.proposedTrumpSuit,
        player: actor,
        allowActivePreflop: true,
      });
      if (negotiation.offerAmount > 0) {
        applySaveOfferPayment(session, negotiation.responder, negotiation.offerAmount);
      }
      recordReplayEvent(session.replay, {
        type: "bid_save_offer_accept",
        player: actor,
        offeredBy: negotiation.responder,
        amount: negotiation.offerAmount,
        contractTricks: negotiation.proposedContractTricks,
        trumpSuit: negotiation.proposedTrumpSuit,
      });
      session.foldNegotiation = null;
      const settleAction = amountToCall(session.betting, actor) > 0 ? { type: "call" } : { type: "check" };
      applyActionToSession(session, { ...settleAction, player: actor });
      session.updatedAt = Date.now();
      return snapshotPokerDoolSession(session, actor);
    }

    if (action === "fold") {
      finalizeFold(session, negotiation.requester, { reason: "ready-fold-rejected" });
      return snapshotPokerDoolSession(session, actor);
    }
  }

  throw new Error(`Unknown ready-to-fold action: ${action}`);
}

export function setPokerDoolTrump({ sessionId, player = 0, trumpSuit }) {
  const session = getSession(sessionId);

  updatePokerDoolContract(session, { trumpSuit, player });
  return snapshotPokerDoolSession(session, normalizePlayer(player));
}

export function setPokerDoolContract({ sessionId, player = 0, contractTricks, trumpSuit }) {
  const session = getSession(sessionId);

  updatePokerDoolContract(session, { contractTricks, trumpSuit, player });
  return snapshotPokerDoolSession(session, normalizePlayer(player));
}

function updatePokerDoolContract(
  session,
  { contractTricks = session.contractTricks, trumpSuit = session.trumpSuit, player = 0, allowActivePreflop = false },
) {
  const contractChoice = validateContractChoice(session, { contractTricks, trumpSuit });

  const isActivePreflopChoice =
    allowActivePreflop &&
    session.activeRound &&
    session.betting.trick === 0 &&
    session.pendingPlayer === normalizePlayer(player);

  if (!isActivePreflopChoice && (session.activeRound || session.folded || session.showdown || session.nextRoundIndex > 0)) {
    throw new Error("Contract and trump can only be changed before preflop betting starts.");
  }

  session.trumpSuit = contractChoice.trumpSuit;
  session.contractTricks = contractChoice.contractTricks;
  session.evaluations = [
    evaluatePokerDoolSide({ hands: session.hands, side: 0, trumpSuit: contractChoice.trumpSuit }),
    evaluatePokerDoolSide({ hands: session.hands, side: 1, trumpSuit: contractChoice.trumpSuit }),
  ];
  session.equities = estimateSideEquities(session.evaluations[0], session.evaluations[1]);
  recordReplayEvent(session.replay, { type: "set_contract", contractTricks: session.contractTricks, trumpSuit: contractChoice.trumpSuit });
  session.updatedAt = Date.now();
}

function validateContractChoice(session, { contractTricks = session.contractTricks, trumpSuit = session.trumpSuit }) {
  if (!["C", "D", "H", "S", "NT"].includes(trumpSuit)) {
    throw new Error(`Invalid trump: ${trumpSuit}`);
  }

  const cleanContractTricks = Number(contractTricks);
  const minimumContract = minimumContractForTricks(session.totalTricks);
  if (!Number.isInteger(cleanContractTricks) || cleanContractTricks < minimumContract || cleanContractTricks > session.totalTricks) {
    throw new Error(`Contract target must be between ${minimumContract} and ${session.totalTricks} tricks.`);
  }

  return {
    contractTricks: cleanContractTricks,
    trumpSuit,
  };
}

function applyActionToSession(session, action) {
  const beforeLength = session.betting.actionLog.length;
  session.betting = applyBettingAction(session.betting, action, session.rules);
  const appliedEvents = session.betting.actionLog.slice(beforeLength);

  for (const event of appliedEvents) {
    recordReplayEvent(session.replay, event);
  }

  if (action.type === "fold") {
    finalizeFold(session, action.player, { reason: "betting-fold" });
    return;
  }

  if (action.type === "bet" || action.type === "raise") {
    session.actedSinceAggression = [false, false];
  }

  session.actedSinceAggression[action.player] = true;

  if (isRoundSettled(session)) {
    session.activeRound = false;
    session.pendingPlayer = null;
    recordReplayEvent(session.replay, { type: "round_complete", trick: session.betting.trick });
    if (session.betting.trick === 0 && !session.playStarted && !session.folded) {
      startCardPlay(session);
    }
    return;
  }

  session.pendingPlayer = (action.player + 1) % 2;
}

function openBettingRound(session, trick, firstPlayer) {
  session.betting = beginBettingRound(session.betting, { trick });
  session.activeRound = true;
  session.pendingPlayer = normalizePlayer(firstPlayer);
  session.actedSinceAggression = [false, false];
  session.nextRoundIndex += 1;
  recordReplayEvent(session.replay, { type: "betting_round", trick, cap: commitmentCapForTrick(trick, session.rules) });
}

function startCardPlay(session) {
  session.playStarted = true;
  session.leaderSeat = 0;
  session.currentSeat = 0;
  recordReplayEvent(session.replay, { type: "leader", seat: session.currentSeat });
}

function completeCurrentTrick(session) {
  const completedTrick = [...session.currentTrick];
  const winningPlay = winningTrickPlay(completedTrick, session.trumpSuit);
  const winningSide = sideForSeat(winningPlay.seat);

  session.tricksPlayed += 1;
  session.tricksWon[winningSide] += 1;
  session.lastTrick = completedTrick;
  session.currentTrick = [];
  session.leaderSeat = winningPlay.seat;
  session.currentSeat = winningPlay.seat;
  recordReplayEvent(session.replay, { type: "take", seat: winningPlay.seat, trick: session.tricksPlayed });

  if (session.tricksPlayed >= session.totalTricks) {
    session.showdown = true;
    session.currentSeat = null;
    recordReplayEvent(session.replay, { type: "showdown" });
    return;
  }

  const nextBettingTrick = session.bettingRounds[session.nextRoundIndex];
  if (nextBettingTrick === session.tricksPlayed) {
    openBettingRound(session, nextBettingTrick, winningSide);
  }
}

function finalizeFold(session, foldedPlayer, { reason }) {
  session.folded = true;
  session.activeRound = false;
  session.pendingPlayer = null;
  session.currentSeat = null;
  session.foldNegotiation = null;
  session.betting.folded[foldedPlayer] = true;
  if (reason !== "betting-fold") {
    session.betting.actionLog.push({
      type: "fold",
      player: foldedPlayer,
      reason,
      round: session.betting.round,
      trick: session.tricksPlayed,
    });
  }
  recordReplayEvent(session.replay, { type: "fold", player: foldedPlayer, reason });
  session.updatedAt = Date.now();
}

function isRoundSettled(session) {
  return (
    session.actedSinceAggression.every(Boolean) &&
    amountToCall(session.betting, 0) === 0 &&
    amountToCall(session.betting, 1) === 0
  );
}

function snapshotPokerDoolSession(session, viewerPlayer = 0) {
  const cleanViewer = normalizePlayer(viewerPlayer);
  const activeActions = session.activeRound && session.pendingPlayer !== null ? bettingActionsForSession(session) : [];
  const currentCap = commitmentCapForTrick(session.betting.trick, session.rules);
  const nextTrick = session.bettingRounds[session.nextRoundIndex] ?? null;
  const activePlayer = session.pendingPlayer;
  const currentTurn = currentTurnForViewer(session, cleanViewer);

  return {
    sessionId: session.id,
    mode: "poker-dool",
    viewerPlayer: cleanViewer,
    viewerName: session.players[cleanViewer],
    players: session.players,
    variant: session.variant,
    variants: Object.values(POKER_DOOL_VARIANTS).map(({ id, label, name, deckSummary, dealtCards, totalDeckCards, cardsPerSeat }) => ({
      id,
      label,
      name,
      deckSummary,
      dealtCards,
      totalDeckCards,
      cardsPerSeat,
    })),
    cardsPerSeat: session.cardsPerSeat,
    totalCards: session.cardsPerSeat * 4,
    totalDeckCards: session.variant.totalDeckCards,
    deadCards: session.deadCards.length,
    deckSummary: session.variant.deckSummary,
    deckUniverseCards: session.deckUniverseCards.map(cardLabel),
    totalTricks: session.totalTricks,
    minimumContract: minimumContractForTricks(session.totalTricks),
    contractTricks: session.contractTricks,
    trumpSuit: session.trumpSuit,
    bettingRounds: session.bettingRounds,
    nextRoundIndex: session.nextRoundIndex,
    nextBettingTrick: nextTrick,
    activeRound: session.activeRound,
    pendingPlayer: activePlayer,
    pendingPlayerName: activePlayer === null ? null : session.players[activePlayer],
    folded: session.folded,
    foldNegotiation: describeFoldNegotiation(session, cleanViewer),
    showdown: session.showdown,
    playStarted: session.playStarted,
    currentSeat: session.currentSeat,
    currentTrick: session.currentTrick.map((play) => ({ seat: play.seat, player: sideForSeat(play.seat), card: cardLabel(play.card) })),
    lastTrick: session.lastTrick.map((play) => ({ seat: play.seat, player: sideForSeat(play.seat), card: cardLabel(play.card) })),
    tricksPlayed: session.tricksPlayed,
    tricksWon: session.tricksWon,
    currentTurn,
    rules: session.rules,
    betting: session.betting,
    currentCap,
    amountToCall: activePlayer === null ? 0 : amountToCall(session.betting, activePlayer),
    activeActions,
    humanActions: activeActions,
    hands: visibleHands(session, cleanViewer),
    evaluations: session.evaluations.map((evaluation, side) => ({
      side,
      hcp: evaluation.hcp,
      bestTrumpSuit: evaluation.bestTrumpSuit,
      bestTrumpFit: evaluation.bestTrumpFit,
      noTrumpWinners: evaluation.noTrumpWinners,
      trumpLosers: evaluation.trumpLosers,
      strength: evaluation.strength,
      equity: session.equities[side],
    })),
    events: session.betting.actionLog,
    replaySummary: summarizeReplay(session.replay),
    message: makeMessage(session),
  };
}

function bettingActionsForSession(session) {
  const actions = legalBettingActions(session.betting, session.pendingPlayer, session.rules);

  if (session.activeRound && !actions.some((action) => action.type === "fold")) {
    actions.push({ type: "fold" });
  }

  return actions;
}

function currentTurnForViewer(session, viewerPlayer) {
  if (session.foldNegotiation) {
    const negotiation = session.foldNegotiation;
    const activePlayer = negotiation.status === "awaiting_offer" ? negotiation.responder : negotiation.requester;
    return {
      type: "ready_fold",
      player: activePlayer,
      isViewer: activePlayer === viewerPlayer,
      role: activePlayer === negotiation.responder ? "responder" : "requester",
    };
  }

  if (session.activeRound) {
    return {
      type: "betting",
      player: session.pendingPlayer,
      isViewer: session.pendingPlayer === viewerPlayer,
    };
  }

  if (session.playStarted && session.currentSeat !== null && !session.showdown && !session.folded) {
    const player = sideForSeat(session.currentSeat);
    return {
      type: "card",
      seat: session.currentSeat,
      player,
      isViewer: player === viewerPlayer,
      legalCards: player === viewerPlayer ? legalCardsForSeat(session, session.currentSeat).map(cardLabel) : [],
    };
  }

  return { type: "idle", isViewer: false };
}

function describeFoldNegotiation(session, viewerPlayer) {
  if (!session.foldNegotiation) return null;

  const negotiation = session.foldNegotiation;
  return {
    status: negotiation.status,
    requester: negotiation.requester,
    requesterName: session.players[negotiation.requester],
    responder: negotiation.responder,
    responderName: session.players[negotiation.responder],
    requestedSeat: negotiation.requestedSeat,
    requestedTrick: negotiation.requestedTrick,
    offerAmount: negotiation.offerAmount,
    proposedContractTricks: negotiation.proposedContractTricks,
    proposedTrumpSuit: negotiation.proposedTrumpSuit,
    originalContractTricks: negotiation.originalContractTricks,
    originalTrumpSuit: negotiation.originalTrumpSuit,
    isRequester: viewerPlayer === negotiation.requester,
    isResponder: viewerPlayer === negotiation.responder,
    maxOffer: maxSaveOffer(session, negotiation.responder),
  };
}

function visibleHands(session, viewerPlayer) {
  return session.hands.map((hand, seat) => {
    if (session.showdown || session.folded || sideForSeat(seat) === viewerPlayer) {
      return hand.map(cardLabel);
    }

    return hand.map(() => null);
  });
}

function makeMessage(session) {
  if (session.folded) {
    const winner = session.betting.folded[0] ? 1 : 0;
    return `${session.players[winner]} wins the pot after a fold.`;
  }

  if (session.showdown) {
    return `Showdown. Player 1 won ${session.tricksWon[0]} tricks; Player 2 won ${session.tricksWon[1]} tricks.`;
  }

  if (session.foldNegotiation) {
    const negotiation = session.foldNegotiation;
    if (negotiation.status === "awaiting_offer") {
      return `${session.players[negotiation.requester]} is ready to fold the trump bid. ${session.players[negotiation.responder]} can offer a new target/trump.`;
    }

    return `${session.players[negotiation.requester]} can accept ${negotiation.proposedContractTricks} with ${negotiation.proposedTrumpSuit} or fold.`;
  }

  if (session.activeRound) {
    const timing = session.betting.trick === 0 ? "before play starts" : "at this betting window";
    return `${session.players[session.pendingPlayer]} to act ${timing}.`;
  }

  if (session.nextRoundIndex === 0) {
    return "Choose the contract target and trump, then open the first betting window.";
  }

  if (session.playStarted && session.currentSeat !== null) {
    return `${session.players[sideForSeat(session.currentSeat)]} to play from ${seatLabel(session.currentSeat)}.`;
  }

  const nextTrick = session.bettingRounds[session.nextRoundIndex];
  if (nextTrick === undefined) return "No more betting windows. Move to showdown.";
  return `Continue the hand. The next betting window will open automatically.`;
}

function applySaveOfferPayment(session, player, requestedAmount) {
  const payment = sanitizeOfferAmount(requestedAmount, session, player);
  if (payment <= 0) return;

  session.betting.stacks[player] -= payment;
  session.betting.committed[player] += payment;
  session.betting.pot += payment;
  session.betting.grossCollected = grossCollected(session.betting);
  session.betting.actionLog.push({
    type: "bid_save_offer_paid",
    player,
    amount: payment,
    round: session.betting.round,
    trick: 0,
  });
}

function sanitizeOfferAmount(amount, session, player, { allowZero = false } = {}) {
  const cleanAmount = Math.floor(Math.max(0, Number(amount ?? 0)) / session.rules.minBet) * session.rules.minBet;
  const maxOffer = maxSaveOffer(session, player);

  if (allowZero && cleanAmount === 0) return 0;

  if (cleanAmount < session.rules.minBet) {
    throw new Error(`Offer must be at least ${session.rules.minBet}.`);
  }

  if (maxOffer < session.rules.minBet) {
    throw new Error("No offer is available under the current cap.");
  }

  return Math.min(cleanAmount, maxOffer);
}

function maxSaveOffer(session, player) {
  const cap = commitmentCapForTrick(session.betting.trick, session.rules);
  const capRemaining = Math.max(0, cap - session.betting.committed[player]);
  const potRemaining = Math.max(0, session.rules.maxPot - session.betting.pot);
  return Math.max(0, Math.min(capRemaining, potRemaining, session.betting.stacks[player]));
}

function legalCardsForSeat(session, seat) {
  const hand = session.hands[seat];
  if (session.currentTrick.length === 0) return hand;

  const leadSuit = session.currentTrick[0].card.suit;
  const followSuitCards = hand.filter((card) => card.suit === leadSuit);
  return followSuitCards.length > 0 ? followSuitCards : hand;
}

function winningTrickPlay(plays, trumpSuit) {
  return plays.reduce((winner, play) => (cardBeats(play.card, winner.card, plays[0].card.suit, trumpSuit) ? play : winner));
}

function cardBeats(challenger, currentWinner, leadSuit, trumpSuit) {
  const challengerIsTrump = trumpSuit !== "NT" && challenger.suit === trumpSuit;
  const winnerIsTrump = trumpSuit !== "NT" && currentWinner.suit === trumpSuit;

  if (challengerIsTrump && !winnerIsTrump) return true;
  if (!challengerIsTrump && winnerIsTrump) return false;
  if (challenger.suit !== currentWinner.suit) return challenger.suit === leadSuit && currentWinner.suit !== leadSuit;
  return RANK_VALUE[challenger.rank] > RANK_VALUE[currentWinner.rank];
}

function normalizeCard(card) {
  if (typeof card === "string") {
    return {
      rank: card.slice(0, -1),
      suit: card.at(-1),
    };
  }

  return {
    rank: String(card.rank),
    suit: card.suit,
  };
}

function sameCard(cardA, cardB) {
  return cardA.rank === cardB.rank && cardA.suit === cardB.suit;
}

function sideForSeat(seat) {
  return Number(seat) % 2;
}

function seatLabel(seat) {
  return ["N", "E", "S", "W"][seat] ?? String(seat);
}

function normalizePlayer(player) {
  const cleanPlayer = Number(player);
  return cleanPlayer === 1 ? 1 : 0;
}

function roundLabel(trick) {
  return trick === 0 ? "preflop" : `after trick ${trick}`;
}

function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Poker-Dool session not found. Start a new betting hand.");
  }

  return session;
}

function cleanupSessions() {
  const expiresBefore = Date.now() - SESSION_TTL_MS;

  for (const [id, session] of sessions.entries()) {
    if (session.updatedAt < expiresBefore) sessions.delete(id);
  }
}
