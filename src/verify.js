import assert from "node:assert/strict";
import { TwoHandHeuristicBot } from "./bots/twoHandHeuristicBot.js";
import { bidValue } from "./game/evaluation.js";
import { chooseCardByDoubleDummyRollout } from "./game/cardPlaySearch.js";
import {
  chooseBotOverbid,
  createInteractiveSession,
  passToBotContract,
  playHumanCard,
  setSessionContract,
} from "./game/interactiveSession.js";
import { runTwoSideGame } from "./game/twoSideSimulation.js";
import { applyBettingAction, beginBettingRound, grossCollected, startBettingHand } from "./pokerDool/bettingRules.js";
import { dealPartialDeck, seededRandom } from "./pokerDool/deck.js";
import { countNoTrumpWinners, countTrumpLosers, minimumContractForTricks } from "./pokerDool/handEvaluation.js";
import { createReplayLog, exposeCards, muckCards, summarizeReplay } from "./pokerDool/replayLog.js";
import {
  applyPokerDoolHumanAction,
  createPokerDoolSession,
  getPokerDoolSession,
  playPokerDoolCard,
  redealPokerDoolSession,
  requestPokerDoolReadyFold,
  respondPokerDoolReadyFold,
  setPokerDoolContract,
  setPokerDoolTrump,
  startNextPokerDoolBettingRound,
} from "./pokerDool/session.js";

const bots = () => [
  new TwoHandHeuristicBot("NS hybrid-search", 0),
  new TwoHandHeuristicBot("EW hybrid-search", 1),
];

const cases = [
  { name: "auto bidding", options: {} },
  { name: "manual 1C NS", options: { contract: { level: 1, suit: "C", declarer: 0 } } },
  { name: "manual 2S EW", options: { contract: { level: 2, suit: "S", declarer: 1 } } },
  { name: "manual 1NT NS", options: { contract: { level: 1, suit: "NT", declarer: 0 } } },
];

for (const testCase of cases) {
  const result = runTwoSideGame({
    bots: bots(),
    ...testCase.options,
  });

  assert.equal(result.playedCards, 52, `${testCase.name}: expected all 52 cards to be played`);
  assert.equal(result.tricksPlayed, 13, `${testCase.name}: expected 13 tricks`);
  assert.equal(
    result.trickScore[0] + result.trickScore[1],
    13,
    `${testCase.name}: expected side trick scores to total 13`,
  );
  assert.ok(result.sideEvaluations[0].best, `${testCase.name}: expected NS evaluation`);
  assert.ok(result.sideEvaluations[1].best, `${testCase.name}: expected EW evaluation`);
}

const session = createInteractiveSession({ humanSide: 0 });
const northBeforeStart = session.hands[0].join(",");
const interactiveGame = setSessionContract({
  sessionId: session.sessionId,
  humanSide: 0,
  contract: { level: 1, suit: "S", declarer: 0 },
});
assert.equal(interactiveGame.hands[0].join(","), northBeforeStart, "interactive start must not reshuffle the deal");
assert.equal(interactiveGame.mode, "human-vs-bot", "interactive session should be human-vs-bot");

if (interactiveGame.currentTurn.type === "card" && interactiveGame.currentTurn.isHuman) {
  const label = interactiveGame.currentTurn.legalCards[0];
  const nextGame = playHumanCard({
    sessionId: interactiveGame.sessionId,
    seat: interactiveGame.currentTurn.seat,
    card: {
      rank: label.slice(0, -1),
      suit: label.at(-1),
    },
  });
  assert.ok(nextGame.playedCards >= interactiveGame.playedCards + 1, "human card should advance the interactive game");
}

const passSession = createInteractiveSession({ humanSide: 0 });
const botContractGame = passToBotContract({
  sessionId: passSession.sessionId,
  humanSide: 0,
});
assert.equal(botContractGame.contract.declarer, 1, "human pass should let the bot side choose the contract");
assert.notEqual(botContractGame.contract.suit, "NT", "bot pass response should choose a trump suit");

const strongDiamondOverbid = chooseBotOverbid(strongDiamondDeal(), 1, { level: 1, suit: "C", declarer: 0 });
assert.ok(strongDiamondOverbid, "bot should overbid a weak human contract with a strong trump fit");
assert.equal(strongDiamondOverbid.suit, "D", "bot should overbid in its best trump suit");
assert.ok(
  bidValue(strongDiamondOverbid.level, strongDiamondOverbid.suit) > bidValue(1, "C"),
  "bot overbid must legally beat the human bid",
);

const bumpedDiamondOverbid = chooseBotOverbid(strongDiamondDeal(), 1, { level: 2, suit: "S", declarer: 0 });
assert.ok(bumpedDiamondOverbid, "bot should raise the level when its best suit must beat a higher human bid");
assert.equal(bumpedDiamondOverbid.level, 3, "bot should bump diamonds to 3D over 2S when the fit is strong enough");
assert.equal(bumpedDiamondOverbid.suit, "D", "bot should keep the beneficial trump suit when bumping the level");

const rankOrder = {
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

const aceLead = chooseCardByDoubleDummyRollout({
  side: 1,
  seat: 1,
  dool: tacticalDool({
    seat: 1,
    hand: [{ suit: "H", rank: "A" }, { suit: "D", rank: "2" }],
    plays: [],
  }),
});
assert.deepEqual(aceLead, { suit: "H", rank: "A" }, "bot should cash an available ace when leading");

const trumpRuff = chooseCardByDoubleDummyRollout({
  side: 1,
  seat: 1,
  dool: tacticalDool({
    seat: 1,
    trumpSuit: "S",
    hand: [{ suit: "S", rank: "A" }, { suit: "S", rank: "2" }, { suit: "D", rank: "3" }],
    plays: [{ player: 0, card: { suit: "H", rank: "A" } }],
  }),
});
assert.deepEqual(trumpRuff, { suit: "S", rank: "2" }, "bot should ruff with the lowest winning trump");

const safeDiscard = chooseCardByDoubleDummyRollout({
  side: 1,
  seat: 3,
  dool: tacticalDool({
    seat: 3,
    trumpSuit: "S",
    hand: [{ suit: "S", rank: "2" }, { suit: "D", rank: "3" }],
    plays: [{ player: 1, card: { suit: "H", rank: "A" } }],
  }),
});
assert.deepEqual(safeDiscard, { suit: "D", rank: "3" }, "bot should not waste trump when partner is already winning");

const declarerTrumpLead = chooseCardByDoubleDummyRollout({
  side: 1,
  seat: 1,
  dool: tacticalDool({
    seat: 1,
    trumpSuit: "S",
    contract: { declarer: 1 },
    hand: [
      { suit: "S", rank: "4" },
      { suit: "S", rank: "3" },
      { suit: "S", rank: "2" },
      { suit: "H", rank: "A" },
    ],
    plays: [],
  }),
});
assert.deepEqual(declarerTrumpLead, { suit: "S", rank: "4" }, "declarer bot should lead trump when holding a trump stack");

const durableTrumpWinner = chooseCardByDoubleDummyRollout({
  side: 1,
  seat: 1,
  dool: tacticalDool({
    seat: 1,
    trumpSuit: "D",
    hand: [{ suit: "D", rank: "A" }, { suit: "D", rank: "6" }],
    plays: [{ player: 0, card: { suit: "D", rank: "5" } }],
    otherHands: {
      0: [{ suit: "C", rank: "2" }],
      2: [{ suit: "D", rank: "10" }, { suit: "C", rank: "3" }],
      3: [{ suit: "D", rank: "2" }, { suit: "C", rank: "4" }],
    },
  }),
});
assert.deepEqual(durableTrumpWinner, { suit: "D", rank: "A" }, "bot should not play a low trump that the next human hand can beat");

let bettingState = startBettingHand({ players: ["Player 1", "Player 2"] });
assert.equal(bettingState.pot, 20, "antes should start a 20 pot");
assert.equal(grossCollected(bettingState), 40, "table fee plus ante should collect 40 before voluntary betting");
bettingState = beginBettingRound(bettingState, { trick: 0 });
bettingState = applyBettingAction(bettingState, { type: "bet", player: 1, amount: 10 });
assert.equal(bettingState.pot, 30, "a 10 bet after antes should move pot to 30");
bettingState = applyBettingAction(bettingState, { type: "call", player: 0 });
assert.equal(bettingState.pot, 40, "matching a 10 bet should move pot to 40");
assert.equal(grossCollected(bettingState), 60, "table fee plus matched pot should be 60 collected");

let cappedState = startBettingHand({ players: ["Player 1", "Player 2"] });
cappedState = beginBettingRound(cappedState, { trick: 0 });
cappedState = applyBettingAction(cappedState, { type: "bet", player: 0, amount: 100 });
assert.equal(cappedState.committed[0], 40, "early cap should limit player commitment to 40 including ante");
assert.ok(cappedState.actionLog.some((event) => event.type === "cap_clip"), "over-cap bets should be logged as clipped");

assert.equal(minimumContractForTricks(10), 5, "40-card / 10-trick game should start contracts at minimum 5");
assert.equal(
  countNoTrumpWinners([
    { suit: "S", rank: "A" },
    { suit: "S", rank: "K" },
    { suit: "S", rank: "Q" },
    { suit: "H", rank: "A" },
  ]),
  4,
  "NT winners should count top rank sequences by suit",
);
assert.equal(
  countTrumpLosers([
    { suit: "S", rank: "A" },
    { suit: "S", rank: "K" },
    { suit: "S", rank: "Q" },
    { suit: "H", rank: "2" },
  ], "S"),
  1,
  "trump losers should use bridge-style losing trick count",
);

const replay = createReplayLog({ handId: "verify-hand", players: ["Player 1", "Player 2"], cardsPerSeat: 10, rules: { ante: 10 } });
exposeCards(replay, { player: 0, cards: [{ suit: "S", rank: "A" }], reason: "cash-out-audit" });
muckCards(replay, { player: 1, reason: "folded" });
assert.deepEqual(
  summarizeReplay(replay),
  { handId: "verify-hand", cardsPerSeat: 10, eventCount: 2, exposedEvents: 1, muckEvents: 1, bettingEvents: 0, cardEvents: 0 },
  "replay log should track expose and muck events",
);

let pokerSession = createPokerDoolSession({ variant: "32_42" });
assert.equal(pokerSession.variant.id, "32_42", "Poker-Dool UI session should default to the 32/42 game");
assert.equal(pokerSession.totalCards, 32, "32/42 Poker-Dool should deal 32 cards");
assert.equal(pokerSession.totalDeckCards, 42, "32/42 Poker-Dool should use a 42-card sampled universe");
assert.equal(pokerSession.cardsPerSeat, 8, "32/42 Poker-Dool should deal 8 cards to each hand");
assert.equal(pokerSession.deadCards, 10, "32/42 Poker-Dool should leave 10 cards hidden");
assert.equal(pokerSession.deckUniverseCards.length, 26, "32/42 universe view should exclude the viewer's own 16 cards");
assert.equal(pokerSession.minimumContract, 4, "32/42 Poker-Dool should show a 4-trick contract floor");
assert.ok(
  [...pokerSession.hands[0], ...pokerSession.hands[2]].every((label) => !pokerSession.remainingUniverseCards.includes(label)),
  "viewer-owned cards should not appear in the live universe",
);
const shortDeckSession = createPokerDoolSession({ variant: "24_36" });
assert.equal(shortDeckSession.totalCards, 24, "24/36 Poker-Dool should deal 24 cards");
assert.equal(shortDeckSession.totalDeckCards, 36, "24/36 Poker-Dool should use a 36-card sampled universe");
assert.equal(shortDeckSession.cardsPerSeat, 6, "24/36 Poker-Dool should deal 6 cards to each hand");
assert.equal(shortDeckSession.deadCards, 12, "24/36 Poker-Dool should leave 12 cards hidden");
assert.equal(shortDeckSession.minimumContract, 3, "24/36 Poker-Dool should show a 3-trick contract floor");
assert.equal(shortDeckSession.deckUniverseCards.length, 24, "24/36 universe view should exclude the viewer's own 12 cards");
assert.equal(new Set(shortDeckSession.deckUniverseCards).size, 24, "24/36 universe should not contain duplicate cards");
assert.ok(
  [...shortDeckSession.hands[0], ...shortDeckSession.hands[2]].every((label) => !shortDeckSession.deckUniverseCards.includes(label)),
  "visible 24/36 cards should be removed from the viewer's universe",
);
const goulashDeal = dealPartialDeck({ variant: "32_42", dealStyle: "goulash", rng: seededRandom(7) });
assert.equal(goulashDeal.dealStyle.id, "goulash", "goulash deal should record its deal style");
assert.equal(goulashDeal.dealPattern.reduce((sum, value) => sum + value, 0), 8, "32/42 goulash packets should sum to hand length");
assert.equal(goulashDeal.hands.every((hand) => hand.length === 8), true, "goulash should deal equal hand sizes");
assert.ok(goulashDeal.hands.some((hand) => largestSuitCount(hand) >= 5), "goulash should produce at least one skewed suit shape");
const redealProbe = createPokerDoolSession({ variant: "32_42" });
const redealtShortDeck = redealPokerDoolSession({ sessionId: redealProbe.sessionId, player: 0, variant: "24_36", dealStyle: "goulash" });
assert.equal(redealtShortDeck.sessionId, redealProbe.sessionId, "shared redeal should keep the same room id");
assert.equal(redealtShortDeck.variant.id, "24_36", "shared redeal should update the room variant");
assert.equal(redealtShortDeck.dealStyle.id, "goulash", "shared redeal should update the room deal style");
assert.equal(redealtShortDeck.totalCards, 24, "shared redeal should replace the hand for the same room");
pokerSession = setPokerDoolTrump({ sessionId: pokerSession.sessionId, trumpSuit: "S" });
assert.equal(pokerSession.trumpSuit, "S", "Poker-Dool session should allow trump selection before preflop");
pokerSession = setPokerDoolContract({ sessionId: pokerSession.sessionId, contractTricks: 7, trumpSuit: "H" });
assert.equal(pokerSession.contractTricks, 7, "Poker-Dool session should allow target trick selection before preflop");
assert.equal(pokerSession.trumpSuit, "H", "Poker-Dool contract setup should save trump with target tricks");
const pokerRound = startNextPokerDoolBettingRound({ sessionId: pokerSession.sessionId });
assert.ok(pokerRound.activeRound, "Poker-Dool next round should open a betting round");
assert.equal(pokerRound.betting.trick, 0, "Poker-Dool should start with preflop betting");
assert.equal(pokerRound.pendingPlayer, 0, "preflop should start with Player 1");
assert.ok(pokerRound.activeActions.some((action) => action.type === "fold"), "preflop trump betting should allow folding");
assert.ok(pokerRound.activeActions.some((action) => action.type === "bet"), "preflop trump betting should allow an opening raise");
const afterPlayerOneRaise = applyPokerDoolHumanAction({
  sessionId: pokerRound.sessionId,
  player: 0,
  action: { type: "bet", amount: 10, contractTricks: 8, trumpSuit: "D" },
});
assert.equal(afterPlayerOneRaise.contractTricks, 8, "active preflop raiser should be able to choose target tricks");
assert.equal(afterPlayerOneRaise.trumpSuit, "D", "active preflop raiser should be able to choose trump");
assert.equal(afterPlayerOneRaise.contractOwner, 0, "the player who raises the trump bid should own the contract target");
assert.equal(afterPlayerOneRaise.pendingPlayer, 1, "after Player 1 raises, Player 2 should act");
const readyFoldBid = requestPokerDoolReadyFold({ sessionId: pokerRound.sessionId, player: 1 });
assert.equal(readyFoldBid.foldNegotiation.status, "awaiting_offer", "ready-to-fold bid should ask the opponent for a new bid");
assert.equal(readyFoldBid.currentTurn.player, 0, "ready-to-fold bid offer should pass action to the opponent");
const bidOffer = respondPokerDoolReadyFold({
  sessionId: pokerRound.sessionId,
  player: 0,
  action: "offer",
  amount: 10,
  contractTricks: 6,
  trumpSuit: "S",
});
assert.equal(bidOffer.foldNegotiation.status, "awaiting_accept", "bid save offer should return decision to the folding player");
assert.equal(bidOffer.foldNegotiation.proposedContractTricks, 6, "bid save offer should include the new target");
assert.equal(bidOffer.foldNegotiation.proposedTrumpSuit, "S", "bid save offer should include the new trump");
const afterPlayerTwoCall = respondPokerDoolReadyFold({ sessionId: pokerRound.sessionId, player: 1, action: "accept" });
assert.equal(afterPlayerTwoCall.activeRound, false, "a matched preflop raise should close the betting round");
assert.equal(afterPlayerTwoCall.playStarted, true, "card play should start after preflop betting closes");
assert.equal(afterPlayerTwoCall.contractTricks, 6, "accepted bid save offer should update the target");
assert.equal(afterPlayerTwoCall.trumpSuit, "S", "accepted bid save offer should update trump");
assert.equal(afterPlayerTwoCall.contractOwner, 0, "accepted bid save offer should assign contract ownership to the offering player");
assert.deepEqual(afterPlayerTwoCall.sideTargets, [6, 7], "opponent target should be one trick higher than the bidder target");
const firstLegalCard = pokerRound.hands[0][0];
const afterFirstCard = playPokerDoolCard({ sessionId: pokerRound.sessionId, player: 0, seat: 0, card: firstLegalCard });
assert.equal(afterFirstCard.currentTrick.length, 1, "playing a legal card should add it to the current trick");
assert.equal(
  afterFirstCard.remainingUniverseCards.length,
  afterPlayerTwoCall.remainingUniverseCards.length,
  "playing a viewer-owned card should not change the unknown universe because it was already excluded",
);
assert.ok(!afterFirstCard.remainingUniverseCards.includes(firstLegalCard), "played cards should leave the live universe");
const opponentCardView = getPokerDoolSession({ sessionId: pokerRound.sessionId, player: 1 });
const opponentCard = opponentCardView.currentTurn.legalCards[0];
playPokerDoolCard({
  sessionId: opponentCardView.sessionId,
  player: 1,
  seat: opponentCardView.currentTurn.seat,
  card: opponentCard,
});
const afterOpponentCardForPlayerOne = getPokerDoolSession({ sessionId: pokerRound.sessionId, player: 0 });
assert.equal(
  afterOpponentCardForPlayerOne.remainingUniverseCards.length,
  afterFirstCard.remainingUniverseCards.length - 1,
  "opponent-played cards should leave the viewer's live universe",
);
assert.ok(!afterOpponentCardForPlayerOne.remainingUniverseCards.includes(opponentCard), "opponent-played cards should be removed live");
assert.throws(
  () => requestPokerDoolReadyFold({ sessionId: pokerRound.sessionId, player: 1 }),
  /betting window/,
  "ready-to-fold should not be available during card play",
);

let laterBetSession = createPokerDoolSession({ variant: "24_36" });
laterBetSession = startNextPokerDoolBettingRound({ sessionId: laterBetSession.sessionId });
laterBetSession = applyPokerDoolHumanAction({ sessionId: laterBetSession.sessionId, player: 0, action: { type: "check" } });
laterBetSession = applyPokerDoolHumanAction({ sessionId: laterBetSession.sessionId, player: 1, action: { type: "check" } });
while (laterBetSession.tricksPlayed < 2) {
  const activePlayer = laterBetSession.currentTurn.player;
  const activeView = getPokerDoolSession({ sessionId: laterBetSession.sessionId, player: activePlayer });
  laterBetSession = playPokerDoolCard({
    sessionId: activeView.sessionId,
    player: activePlayer,
    seat: activeView.currentTurn.seat,
    card: activeView.currentTurn.legalCards[0],
  });
}
assert.equal(laterBetSession.activeRound, true, "24/36 should open a later betting window after trick 2");
assert.ok(
  laterBetSession.activeActions.some((action) => action.type === "fold"),
  "later betting windows should allow folding even before a bet is made",
);
assert.equal(laterBetSession.completedTricks.length, 2, "completed tricks should be available for trick review");
assert.equal(laterBetSession.tableTrick.length, 4, "the just-completed trick should remain visible briefly");
const laterReadyFold = requestPokerDoolReadyFold({ sessionId: laterBetSession.sessionId, player: laterBetSession.pendingPlayer });
assert.equal(laterReadyFold.foldNegotiation.phase, "betting_window", "ready-to-fold should work in later betting windows");
const laterContinueOffer = respondPokerDoolReadyFold({
  sessionId: laterBetSession.sessionId,
  player: laterReadyFold.foldNegotiation.responder,
  action: "offer",
  amount: 10,
});
assert.equal(laterContinueOffer.foldNegotiation.status, "awaiting_accept", "later ready-to-fold should accept a continue offer");
assert.equal(laterContinueOffer.foldNegotiation.phase, "betting_window", "later save offer should preserve betting-window phase");
const laterContinueAccepted = respondPokerDoolReadyFold({
  sessionId: laterBetSession.sessionId,
  player: laterReadyFold.foldNegotiation.requester,
  action: "accept",
});
assert.equal(laterContinueAccepted.foldNegotiation, null, "accepted later continue offer should clear negotiation");

let goalSession = createPokerDoolSession({ variant: "24_36" });
goalSession = startNextPokerDoolBettingRound({ sessionId: goalSession.sessionId });
goalSession = settlePokerRoundWithChecks(goalSession);
let goalGuard = 0;
while (!goalSession.showdown && goalGuard < 80) {
  goalGuard += 1;
  if (goalSession.activeRound) {
    goalSession = settlePokerRoundWithChecks(goalSession);
    continue;
  }

  const activePlayer = goalSession.currentTurn.player;
  const activeView = getPokerDoolSession({ sessionId: goalSession.sessionId, player: activePlayer });
  goalSession = playPokerDoolCard({
    sessionId: activeView.sessionId,
    player: activePlayer,
    seat: activeView.currentTurn.seat,
    card: activeView.currentTurn.legalCards[0],
  });
}

assert.ok(goalSession.goalReached, "Poker-Dool should stop as soon as a player reaches the target");
assert.ok(goalSession.mucked, "target-reached endings should muck remaining cards");
assert.ok(
  goalSession.tricksWon[goalSession.winningPlayer] >= goalSession.sideTargets[goalSession.winningPlayer],
  "winner should have reached their side-specific target",
);
assert.equal(goalSession.currentSeat, null, "target-reached endings should stop card play immediately");
const goalWinnerView = getPokerDoolSession({ sessionId: goalSession.sessionId, player: goalSession.winningPlayer });
const hiddenOpponentCards = goalWinnerView.hands
  .filter((_, seat) => seat % 2 !== goalSession.winningPlayer)
  .flat();
assert.ok(hiddenOpponentCards.every((card) => card === null), "mucked target stop should keep opponent cards hidden");

console.log("Verification passed: bot logic, poker-Dool betting, hand evaluation, and replay summaries are valid.");

function settlePokerRoundWithChecks(sessionSnapshot) {
  let next = sessionSnapshot;

  while (next.activeRound) {
    next = applyPokerDoolHumanAction({
      sessionId: next.sessionId,
      player: next.pendingPlayer,
      action: { type: "check" },
    });
  }

  return next;
}

function largestSuitCount(hand) {
  const counts = new Map();

  for (const card of hand) {
    counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  }

  return Math.max(...counts.values());
}

function tacticalDool({ seat, hand, plays, trumpSuit = undefined, contract = undefined, otherHands = {} }) {
  const players = Array.from({ length: 4 }, () => ({ hand: [] }));
  players[seat].hand = hand;

  for (const [playerSeat, playerHand] of Object.entries(otherHands)) {
    players[Number(playerSeat)].hand = playerHand;
  }

  return {
    data: {
      contract,
      deck: {
        compare: (cardA, cardB) => rankOrder[cardB.rank] - rankOrder[cardA.rank],
      },
      players,
      tricks: {
        trumpSuit,
        getValidCards: (cards) => cards,
        at: () => ({ getCards: () => plays }),
      },
    },
  };
}

function strongDiamondDeal() {
  return {
    players: [
      {
        hand: [
          { suit: "C", rank: "2" },
          { suit: "C", rank: "3" },
          { suit: "H", rank: "4" },
          { suit: "H", rank: "5" },
          { suit: "S", rank: "6" },
          { suit: "S", rank: "7" },
          { suit: "C", rank: "8" },
        ],
      },
      {
        hand: [
          { suit: "D", rank: "A" },
          { suit: "D", rank: "K" },
          { suit: "D", rank: "Q" },
          { suit: "D", rank: "J" },
          { suit: "D", rank: "10" },
          { suit: "S", rank: "A" },
          { suit: "S", rank: "K" },
        ],
      },
      {
        hand: [
          { suit: "H", rank: "2" },
          { suit: "H", rank: "3" },
          { suit: "S", rank: "4" },
          { suit: "S", rank: "5" },
          { suit: "C", rank: "6" },
          { suit: "C", rank: "7" },
        ],
      },
      {
        hand: [
          { suit: "D", rank: "9" },
          { suit: "D", rank: "8" },
          { suit: "D", rank: "7" },
          { suit: "D", rank: "6" },
          { suit: "H", rank: "A" },
          { suit: "H", rank: "K" },
          { suit: "H", rank: "Q" },
        ],
      },
    ],
    teams: [
      [0, 2],
      [1, 3],
    ],
  };
}
