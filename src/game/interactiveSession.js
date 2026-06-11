import cards from "@firtoska/cards";
import { randomUUID } from "node:crypto";
import { TwoHandHeuristicBot } from "../bots/twoHandHeuristicBot.js";
import { SIDE_SEATS, sideForSeat } from "./constants.js";
import { bidValue, cardLabel, evaluateSide } from "./evaluation.js";
import { createTwoSideDeal } from "./twoSideSimulation.js";

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60;

export function createInteractiveSession({ humanSide = 0 } = {}) {
  cleanupSessions();

  const dool = createTwoSideDeal();
  const session = {
    id: randomUUID(),
    humanSide: normalizeSide(humanSide),
    dool,
    initialHands: cloneHands(dool.data.players.map((player) => player.hand)),
    initialEvaluationData: cloneEvaluationData(dool.data),
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bots: [
      new TwoHandHeuristicBot("NS hybrid-search", 0),
      new TwoHandHeuristicBot("EW hybrid-search", 1),
    ],
  };

  sessions.set(session.id, session);
  return snapshotSession(session);
}

export function setSessionContract({ sessionId, humanSide, contract }) {
  const session = getSession(sessionId);
  session.humanSide = normalizeSide(humanSide ?? session.humanSide);
  resetSessionToInitialDeal(session);

  const openingContract = normalizeContract(contract);
  validateContract(openingContract, contract);
  const openingSource = openingContract.declarer === session.humanSide ? "human" : "manual";
  addLevelBid({
    dool: session.dool,
    log: session.log,
    side: openingContract.declarer,
    level: openingContract.level,
    suit: openingContract.suit,
    source: openingSource,
  });

  if (openingContract.declarer === session.humanSide) {
    const botSide = (session.humanSide + 1) % 2;
    const botOverbid = chooseBotOverbid(session.dool.data, botSide, openingContract);

    if (botOverbid) {
      addLevelBid({
        dool: session.dool,
        log: session.log,
        side: botSide,
        level: botOverbid.level,
        suit: botOverbid.suit,
        source: "bot",
        reason: "overbid",
      });
      addPassBid({ dool: session.dool, log: session.log, side: session.humanSide, source: "human" });
      finalizeContract({
        dool: session.dool,
        log: session.log,
        contract: botOverbid,
        source: "bot",
        reason: "overbid",
      });
    } else {
      addPassBid({ dool: session.dool, log: session.log, side: botSide, source: "bot" });
      finalizeContract({ dool: session.dool, log: session.log, contract: openingContract, source: openingSource });
    }
  } else {
    const respondingSide = (openingContract.declarer + 1) % 2;
    addPassBid({
      dool: session.dool,
      log: session.log,
      side: respondingSide,
      source: respondingSide === session.humanSide ? "human" : "bot",
    });
    finalizeContract({ dool: session.dool, log: session.log, contract: openingContract, source: openingSource });
  }

  autoAdvanceBots(session);
  session.updatedAt = Date.now();
  return snapshotSession(session);
}

export function passToBotContract({ sessionId, humanSide }) {
  const session = getSession(sessionId);
  session.humanSide = normalizeSide(humanSide ?? session.humanSide);
  resetSessionToInitialDeal(session);

  const botSide = (session.humanSide + 1) % 2;
  const contract = chooseBotContract(session.dool.data, botSide);

  addPassBid({ dool: session.dool, log: session.log, side: session.humanSide, source: "human" });

  applyManualContract({ dool: session.dool, contract, log: session.log, source: "bot", includeBidEvents: true });
  autoAdvanceBots(session);
  session.updatedAt = Date.now();
  return snapshotSession(session);
}

export function playHumanCard({ sessionId, seat, card }) {
  const session = getSession(sessionId);
  const turn = session.dool.getTurn();
  const normalizedSeat = Number(seat);

  if (!turn || turn.type !== "card") {
    throw new Error("It is not card-play time yet.");
  }

  if (turn.players[0] !== normalizedSeat) {
    throw new Error(`It is ${seatLabel(turn.players[0])}'s turn, not ${seatLabel(normalizedSeat)}'s.`);
  }

  if (sideForSeat(normalizedSeat) !== session.humanSide) {
    throw new Error(`${seatLabel(normalizedSeat)} is controlled by the bot.`);
  }

  const hand = session.dool.data.players[normalizedSeat].hand;
  const legalCards = session.dool.data.tricks.getValidCards(hand);
  const selectedCard = legalCards.find((candidate) => candidate.rank === card.rank && candidate.suit === card.suit);

  if (!selectedCard) {
    throw new Error(`${card.rank}${card.suit} is not legal for ${seatLabel(normalizedSeat)} right now.`);
  }

  session.dool.play(normalizedSeat, selectedCard);
  session.log.push({
    type: "card",
    actor: "human",
    seat: normalizedSeat,
    card: cardLabel(selectedCard),
  });

  autoAdvanceBots(session);
  session.updatedAt = Date.now();
  return snapshotSession(session);
}

function autoAdvanceBots(session) {
  for (let actions = 0; actions < 300; actions += 1) {
    const turn = session.dool.getTurn();

    if (!turn || turn.type === "score") return;

    if (turn.type === "leading") {
      const defendingSide = (Number(session.dool.data.declarer) + 1) % 2;
      const leader = session.bots[defendingSide].chooseOpeningLeader({ dool: session.dool });
      session.dool.data.leader = leader;
      session.log.push({ type: "leader", actor: "bot", seat: leader });
      continue;
    }

    if (turn.type === "take") {
      const winner = turn.players[0];
      session.dool.take(winner);
      session.log.push({ type: "take", seat: winner });
      continue;
    }

    if (turn.type === "card") {
      const seat = turn.players[0];
      const side = sideForSeat(seat);

      if (side === session.humanSide) return;

      const bot = session.bots[side];
      const card = bot.chooseCard({ dool: session.dool, seat });
      session.dool.play(seat, card);
      session.log.push({
        type: "card",
        actor: "bot",
        seat,
        card: cardLabel(card),
      });
      continue;
    }

    throw new Error(`Unhandled interactive turn type: ${turn.type}`);
  }

  throw new Error("Interactive session exceeded automatic action limit.");
}

function resetSessionToInitialDeal(session) {
  const data = session.dool.data;

  data.players.forEach((player, index) => {
    player.hand = cloneCards(session.initialHands[index]);
  });

  data.bids = [];
  data.contract = undefined;
  data.declarer = undefined;
  data.leader = undefined;
  data.fold = undefined;
  data.tricks = new cards.Tricks(data.deck);
  data.tricks.maxCards = 4;
  data.handLength = data.players[0].hand.length;
  session.log = [];
}

function applyManualContract({ dool, contract, log, source = "manual", includeBidEvents = false }) {
  const normalizedContract = normalizeContract(contract);
  validateContract(normalizedContract, contract);

  addLevelBid({
    dool,
    log,
    side: normalizedContract.declarer,
    level: normalizedContract.level,
    suit: normalizedContract.suit,
    source,
    logEvent: includeBidEvents,
  });
  addPassBid({
    dool,
    log,
    side: (normalizedContract.declarer + 1) % 2,
    source: source === "bot" ? "human" : "bot",
    logEvent: includeBidEvents,
  });
  finalizeContract({ dool, log, contract: normalizedContract, source });
}

function normalizeContract(contract) {
  return {
    level: Number(contract.level),
    suit: contract.suit,
    double: false,
    redouble: false,
    declarer: Number(contract.declarer),
  };
}

function validateContract(normalizedContract, originalContract = normalizedContract) {
  if (!Number.isInteger(normalizedContract.level) || normalizedContract.level < 1 || normalizedContract.level > 7) {
    throw new Error(`Contract number must be between 1 and 7. Received ${originalContract.level}`);
  }

  if (!["C", "D", "H", "S", "NT"].includes(normalizedContract.suit)) {
    throw new Error(`Trump must be C, D, H, S, or NT. Received ${originalContract.suit}`);
  }

  if (![0, 1].includes(normalizedContract.declarer)) {
    throw new Error(`Contract side must be NS or EW. Received ${originalContract.declarer}`);
  }
}

function addLevelBid({ dool, log, side, level, suit, source, reason, logEvent = true }) {
  dool.data.bids.push({
    player: side,
    bidType: "level",
    level,
    suit,
  });

  if (!logEvent) return;

  log.push({
    type: "bid",
    source,
    reason,
    side,
    bid: { type: "level", level, suit },
  });
}

function addPassBid({ dool, log, side, source, logEvent = true }) {
  dool.data.bids.push({
    player: side,
    bidType: "pass",
  });

  if (!logEvent) return;

  log.push({
    type: "bid",
    source,
    side,
    bid: { type: "pass" },
  });
}

function finalizeContract({ dool, log, contract, source = "manual", reason }) {
  const normalizedContract = normalizeContract(contract);
  validateContract(normalizedContract, contract);

  dool.data.contract = normalizedContract;
  dool.data.declarer = normalizedContract.declarer;
  dool.data.tricks.trumpSuit = normalizedContract.suit === "NT" ? undefined : normalizedContract.suit;

  log.push({
    type: "contract",
    source,
    reason,
    side: normalizedContract.declarer,
    contract: normalizedContract,
  });
}

function chooseBotContract(data, botSide) {
  const bestSuit = chooseBotTrumpCandidate(data, botSide);
  const chosen = bestSuit;

  return {
    level: chooseBotContractLevel(chosen.expectedTricks, chosen.score),
    suit: chosen.suit,
    declarer: botSide,
  };
}

export function chooseBotOverbid(data, botSide, currentContract) {
  const current = normalizeContract(currentContract);
  validateContract(current, currentContract);
  const currentValue = bidValue(current.level, current.suit);
  const evaluation = evaluateSide(data, botSide);
  const candidates = evaluation.candidates
    .filter((candidate) => candidate.suit !== "NT")
    .sort((a, b) => contractChoiceScore(b) - contractChoiceScore(a));

  for (const candidate of candidates) {
    let level = chooseBotContractLevel(candidate.expectedTricks, candidate.score);
    while (level <= 7 && bidValue(level, candidate.suit) <= currentValue) level += 1;
    if (level > 7) continue;

    const targetTricks = level + 6;
    const margin = candidate.expectedTricks - targetTricks;
    const strongFit = candidate.totalTrump >= 7 && candidate.spread >= 2 && candidate.score >= 12;
    const highPower = evaluation.hcp >= 24 && candidate.score >= 13;
    const beneficial =
      margin >= -0.25 ||
      (margin >= -0.65 && (strongFit || highPower)) ||
      (level <= 2 && candidate.score >= 18);

    if (!beneficial) continue;

    return {
      level,
      suit: candidate.suit,
      declarer: botSide,
      double: false,
      redouble: false,
    };
  }

  return null;
}

function chooseBotTrumpCandidate(data, botSide) {
  return evaluateSide(data, botSide).candidates
    .filter((candidate) => candidate.suit !== "NT")
    .sort((a, b) => contractChoiceScore(b) - contractChoiceScore(a))[0];
}

function contractChoiceScore(candidate) {
  return candidate.expectedTricks + candidate.score * 0.03 + (candidate.totalTrump >= 7 ? 0.28 : 0);
}

function chooseBotContractLevel(expectedTricks, fitScore) {
  if (expectedTricks >= 8.7 && fitScore >= 18) return 2;
  if (expectedTricks >= 7.65 && fitScore >= 13) return 2;
  return 1;
}

function snapshotSession(session) {
  const dool = session.dool;
  const turn = dool.getTurn();
  const trickScore = countCompletedTricksBySide(dool);
  const currentTurn = describeCurrentTurn(session, turn);
  const contract = dool.data.contract ?? null;

  return {
    sessionId: session.id,
    mode: "human-vs-bot",
    humanSide: session.humanSide,
    seatLabels: ["N", "E", "S", "W"],
    sideNames: ["NS", "EW"],
    sideSeats: SIDE_SEATS,
    hands: visibleHands(dool, session.humanSide),
    handCounts: dool.data.players.map((player) => player.hand.length),
    currentTrick: currentTrickCards(dool),
    contract,
    trumpSuit: dool.data.tricks?.trumpSuit,
    bids: dool.data.bids,
    events: session.log,
    currentTurn,
    sideEvaluations: [summarizeSideEvaluation(session.initialEvaluationData, 0), summarizeSideEvaluation(session.initialEvaluationData, 1)],
    contractResult: summarizeContractResult(dool.data, contract, trickScore),
    trickScore,
    score: contract && turn?.type === "score" ? calculateScoreQuietly(dool, trickScore) : [0, 0],
    playedCards: session.log.filter((entry) => entry.type === "card").length,
    tricksPlayed: trickScore[0] + trickScore[1],
    message: makeMessage(session, currentTurn),
  };
}

function describeCurrentTurn(session, turn) {
  if (!turn) return { type: "none", actions: [] };

  if (turn.type === "score") {
    return { type: "score", actions: [] };
  }

  if (turn.type === "bid") {
    return { type: "contract", actions: [] };
  }

  if (turn.type === "card") {
    const seat = turn.players[0];
    const side = sideForSeat(seat);
    const legalCards = session.dool.data.tricks.getValidCards(session.dool.data.players[seat].hand);

    return {
      type: "card",
      seat,
      side,
      isHuman: side === session.humanSide,
      legalCards: side === session.humanSide ? legalCards.map(cardLabel) : [],
    };
  }

  return {
    type: turn.type,
    players: turn.players,
    actions: [],
  };
}

function makeMessage(session, currentTurn) {
  if (!session.dool.data.contract) return "Choose the contract for this deal, then press Start.";

  if (currentTurn.type === "score") {
    const result = summarizeContractResult(session.dool.data, session.dool.data.contract, countCompletedTricksBySide(session.dool));
    return `${sideName(result.declarer)} ${result.success ? "made" : "failed"} the contract: ${result.made}/${result.target}.`;
  }

  if (currentTurn.type === "card" && currentTurn.isHuman) {
    return `Your turn: play from ${seatLabel(currentTurn.seat)}.`;
  }

  return "Bot is thinking...";
}

function visibleHands(dool, humanSide) {
  return dool.data.players.map((player, seat) => {
    if (sideForSeat(seat) === humanSide) return player.hand.map(cardLabel);
    return player.hand.map(() => null);
  });
}

function currentTrickCards(dool) {
  const trick = dool.data.tricks?.at(-1);
  if (!trick) return [];

  return trick.getCards().map((play) => ({
    seat: play.player,
    card: cardLabel(play.card),
  }));
}

function countCompletedTricksBySide(dool) {
  const score = [0, 0];

  if (!dool.data.tricks) return score;

  for (let index = 0; index < dool.data.tricks.length; index += 1) {
    const trick = dool.data.tricks[index];
    if (trick.getCards().length !== 4) continue;

    const winner = dool.data.tricks.getWinningCard(index + 1);
    score[sideForSeat(winner.player)] += 1;
  }

  return score;
}

function calculateScoreQuietly(dool, trickScore) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return dool.getDoolScore(trickScore);
  } finally {
    console.log = originalLog;
  }
}

function summarizeSideEvaluation(data, side) {
  const evaluation = evaluateSide(data, side);

  return {
    side,
    hcp: evaluation.hcp,
    best: summarizeCandidate(evaluation.best),
    candidates: evaluation.candidates.slice(0, 5).map(summarizeCandidate),
  };
}

function summarizeCandidate(candidate) {
  return {
    suit: candidate.suit,
    expectedTricks: round(candidate.expectedTricks),
    level: Math.max(1, Math.min(7, Math.floor(candidate.expectedTricks - 6.05))),
    totalTrump: candidate.totalTrump,
    split: candidate.split,
    score: round(candidate.score),
  };
}

function summarizeContractResult(data, contract, trickScore) {
  if (!contract) return null;

  const declarer = Number(contract.declarer);
  const target = data.handLength === 13 ? Number(contract.level) + 6 : Number(contract.level);
  const made = trickScore[declarer];

  return {
    declarer,
    target,
    made,
    success: made >= target,
    margin: made - target,
  };
}

function cloneEvaluationData(data) {
  return {
    players: data.players.map((player) => ({
      hand: cloneCards(player.hand),
    })),
    teams: data.teams.map((team) => [...team]),
  };
}

function cloneHands(hands) {
  return hands.map(cloneCards);
}

function cloneCards(cardList) {
  return cardList.map((card) => ({ suit: card.suit, rank: card.rank }));
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Session not found. Start a new deal.");
  }

  return session;
}

function cleanupSessions() {
  const expiresBefore = Date.now() - SESSION_TTL_MS;

  for (const [id, session] of sessions.entries()) {
    if (session.updatedAt < expiresBefore) sessions.delete(id);
  }
}

function normalizeSide(side) {
  const normalized = Number(side);
  return normalized === 1 ? 1 : 0;
}

function seatLabel(seat) {
  return ["N", "E", "S", "W"][Number(seat)] ?? "?";
}

function sideName(side) {
  return ["NS", "EW"][Number(side)] ?? "?";
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}
