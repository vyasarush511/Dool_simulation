import Dool from "@dool/logic";
import cards from "@firtoska/cards";
import { SIDE_SEATS, sideForSeat } from "./constants.js";
import { cardLabel, evaluateSide, playLabel } from "./evaluation.js";

export function createTwoSideDeal() {
  const data = {
    players: makeLogicalSeats(),
    teams: [SIDE_SEATS[0], SIDE_SEATS[1]],
    bids: [],
    dealNumber: 0,
  };

  const dool = new Dool(data);
  const deal = dool.dealCards();

  deal.hands.forEach((hand, index) => {
    data.players[index].hand = hand;
  });

  data.handLength = data.players[0].hand.length;
  data.tricks = new cards.Tricks(data.deck);
  data.tricks.maxCards = 4;

  return dool;
}

export function runTwoSideGame({ bots, contract = null, maxActions = 500 }) {
  const dool = createTwoSideDeal();
  const initialHands = dool.data.players.map((player) => player.hand.map(cardLabel));
  const initialEvaluationData = cloneEvaluationData(dool.data);
  const log = [];
  let actions = 0;

  if (contract) {
    applyManualContract({ dool, contract, log });
  } else {
    runBidding({ dool, bots, log });
  }

  if (dool.getTurn()?.type === "score") {
    return summarizeGame(dool, log, "all-pass", initialHands, initialEvaluationData);
  }

  while (actions < maxActions) {
    actions += 1;
    const turn = dool.getTurn();

    if (!turn || turn.type === "score") break;

    if (turn.type === "leading") {
      const bot = bots[dool.data.declarer];
      dool.data.leader = bot.chooseOpeningLeader({ dool });
      log.push({ type: "leader", seat: dool.data.leader });
      continue;
    }

    if (turn.type === "take") {
      const winner = turn.players[0];
      dool.take(winner);
      log.push({ type: "take", seat: winner });
      continue;
    }

    if (turn.type === "card") {
      const seat = turn.players[0];
      const bot = bots[sideForSeat(seat)];
      const card = bot.chooseCard({ dool, seat });
      dool.play(seat, card);
      log.push({ type: "card", seat, card: `${card.rank}${card.suit}` });
      continue;
    }

    throw new Error(`Unhandled turn type: ${turn.type}`);
  }

  if (actions >= maxActions) {
    throw new Error(`Simulation exceeded max action count ${maxActions}`);
  }

  return summarizeGame(dool, log, "played", initialHands, initialEvaluationData);
}

function runBidding({ dool, bots, log }) {
  while (true) {
    const turn = dool.getTurn();
    if (!turn || turn.type !== "bid") return;

    const side = turn.players[0];
    const bid = bots[side].chooseBid({ dool });

    if (!dool.isValidBid(bid.type, bid.level, bid.suit)) {
      throw new Error(`${bots[side].name} chose invalid bid ${JSON.stringify(bid)}`);
    }

    dool.data.bids.push({
      player: side,
      bidType: bid.type,
      level: bid.level,
      suit: bid.suit,
    });

    log.push({ type: "bid", side, bid });

    if (dool.data.bids.length >= 2 && dool.hasPassed()) {
      const contract = dool.getContract();
      dool.data.contract = contract;
      dool.data.declarer = Number(contract.declarer);
      dool.data.tricks.trumpSuit = contract.suit === "NT" ? undefined : contract.suit;
      return;
    }
  }
}

function applyManualContract({ dool, contract, log }) {
  const normalizedContract = {
    level: Number(contract.level),
    suit: contract.suit,
    double: false,
    redouble: false,
    declarer: Number(contract.declarer),
  };

  if (!Number.isInteger(normalizedContract.level) || normalizedContract.level < 1 || normalizedContract.level > 7) {
    throw new Error(`Manual contract level must be between 1 and 7. Received ${contract.level}`);
  }

  if (!["C", "D", "H", "S", "NT"].includes(normalizedContract.suit)) {
    throw new Error(`Manual contract suit must be C, D, H, S, or NT. Received ${contract.suit}`);
  }

  if (![0, 1].includes(normalizedContract.declarer)) {
    throw new Error(`Manual declarer must be side 0 or 1. Received ${contract.declarer}`);
  }

  dool.data.bids.push({
    player: normalizedContract.declarer,
    bidType: "level",
    level: normalizedContract.level,
    suit: normalizedContract.suit,
  });
  dool.data.bids.push({
    player: (normalizedContract.declarer + 1) % 2,
    bidType: "pass",
  });

  dool.data.contract = normalizedContract;
  dool.data.declarer = normalizedContract.declarer;
  dool.data.tricks.trumpSuit = normalizedContract.suit === "NT" ? undefined : normalizedContract.suit;

  log.push({
    type: "contract",
    side: normalizedContract.declarer,
    contract: normalizedContract,
  });
}

function summarizeGame(dool, log, outcome, initialHands, initialEvaluationData) {
  const contract = dool.data.contract ?? null;
  const trickScore = dool.data.tricks?.length ? countCompletedTricksBySide(dool) : [0, 0];
  const score = contract ? calculateScoreQuietly(dool, trickScore) : [0, 0];
  const playedCards = log.filter((entry) => entry.type === "card").length;
  const tricks = [];

  if (dool.data.tricks) {
    for (let index = 0; index < dool.data.tricks.length; index += 1) {
      const trick = dool.data.tricks[index];
      const trickCards = trick.getCards();
      if (trickCards.length === 0) continue;
      tricks.push({
        cards: trickCards.map(playLabel),
        winner: dool.data.tricks.getWinningCard(index + 1)?.player,
      });
    }
  }

  return {
    outcome,
    seatLabels: ["N", "E", "S", "W"],
    sideNames: ["NS", "EW"],
    sideSeats: SIDE_SEATS,
    initialHands,
    contract,
    trumpSuit: dool.data.tricks?.trumpSuit,
    bids: dool.data.bids,
    events: log,
    sideEvaluations: [summarizeSideEvaluation(initialEvaluationData, 0), summarizeSideEvaluation(initialEvaluationData, 1)],
    contractResult: summarizeContractResult(dool.data, contract, trickScore),
    trickScore,
    score,
    playedCards,
    tricksPlayed: tricks.length,
    firstThreeTricks: tricks.slice(0, 3),
  };
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

function countCompletedTricksBySide(dool) {
  const score = [0, 0];

  for (let index = 0; index < dool.data.tricks.length; index += 1) {
    const trick = dool.data.tricks[index];
    if (trick.getCards().length !== 4) continue;

    const winner = dool.data.tricks.getWinningCard(index + 1);
    score[sideForSeat(winner.player)] += 1;
  }

  return score;
}

function makeLogicalSeats() {
  return ["N", "E", "S", "W"].map((label, index) => ({
    index,
    label,
    nickname: label,
    team: sideForSeat(index),
    swap: true,
  }));
}

function cloneEvaluationData(data) {
  return {
    players: data.players.map((player) => ({
      hand: player.hand.map((card) => ({ suit: card.suit, rank: card.rank })),
    })),
    teams: data.teams.map((team) => [...team]),
  };
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
  const target = contractTarget(data, contract);
  const made = trickScore[declarer];

  return {
    declarer,
    target,
    made,
    success: made >= target,
    margin: made - target,
  };
}

function contractTarget(data, contract) {
  if (data.handLength === 13) return Number(contract.level) + 6;
  return Number(contract.level);
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}
