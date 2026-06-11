import { RANK_VALUE, sideForSeat } from "./constants.js";
import { cardLabel, lowestCard, sortCardsHighToLow } from "./evaluation.js";

const DEFAULT_NODE_LIMIT = 120000;
const DEFAULT_MAX_CARDS_PER_HAND = 7;

export function chooseExactDoubleDummyCard({
  dool,
  seat,
  side,
  nodeLimit = DEFAULT_NODE_LIMIT,
  maxCardsPerHand = DEFAULT_MAX_CARDS_PER_HAND,
}) {
  const position = makePosition(dool, seat, side);

  if (!position) return null;
  if (!isPlausiblePosition(position)) return null;
  if (Math.max(...position.hands.map((hand) => hand.length)) > maxCardsPerHand) return null;

  const legalCards = validCards(position.hands[seat], position.currentTrick);
  if (legalCards.length <= 1) return legalCards[0] ?? null;

  const context = {
    bestLine: new Map(),
    memo: new Map(),
    nodeLimit,
    nodes: 0,
    side,
    trumpSuit: position.trumpSuit,
  };
  const orderedCards = orderCardsForSearch(position, seat, legalCards);
  let best = null;
  let alpha = -Infinity;

  for (const card of orderedCards) {
    const nextPosition = playCard(position, seat, card);
    const score = solvePosition(nextPosition, context, alpha, Infinity);

    if (!best || score > best.score || (score === best.score && cardTieBreak(position, card, best.card) > 0)) {
      best = { card, score };
    }

    alpha = Math.max(alpha, score);

    if (context.nodes >= nodeLimit) return null;
  }

  return best?.card ?? null;
}

export function exactDoubleDummyTricks({ dool, side, nodeLimit = DEFAULT_NODE_LIMIT, maxCardsPerHand = DEFAULT_MAX_CARDS_PER_HAND }) {
  const turn = dool.getTurn?.();
  const seat = turn?.type === "card" ? turn.players[0] : undefined;
  const position = makePosition(dool, seat, side);

  if (!position) return null;
  if (!isPlausiblePosition(position)) return null;
  if (Math.max(...position.hands.map((hand) => hand.length)) > maxCardsPerHand) return null;

  const context = {
    bestLine: new Map(),
    memo: new Map(),
    nodeLimit,
    nodes: 0,
    side,
    trumpSuit: position.trumpSuit,
  };
  const score = solvePosition(position, context, -Infinity, Infinity);

  if (context.nodes >= nodeLimit) return null;

  return {
    score,
    nodes: context.nodes,
  };
}

function solvePosition(position, context, alpha, beta) {
  context.nodes += 1;
  if (context.nodes >= context.nodeLimit) return position.tricksWonBySide;

  if (isTerminal(position)) return position.tricksWonBySide;

  const key = positionKey(position);
  const cached = context.memo.get(key);
  if (cached !== undefined) return cached;

  const seat = position.nextSeat;
  const maximizing = sideForSeat(seat) === context.side;
  const legalCards = orderCardsForSearch(position, seat, validCards(position.hands[seat], position.currentTrick));
  if (legalCards.length === 0) return position.tricksWonBySide;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const card of legalCards) {
    const nextPosition = playCard(position, seat, card);
    const score = solvePosition(nextPosition, context, alpha, beta);

    if (maximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }

    if (alpha >= beta) break;
  }

  context.memo.set(key, bestScore);
  return bestScore;
}

function playCard(position, seat, card) {
  const hands = position.hands.map((hand, index) => (index === seat ? removeCard(hand, card) : hand));
  const currentTrick = [...position.currentTrick, { player: seat, card }];

  if (currentTrick.length === 4) {
    const winner = winningPlay(currentTrick, position.trumpSuit).player;
    const trickPoint = sideForSeat(winner) === position.side ? 1 : 0;

    return {
      ...position,
      currentTrick: [],
      hands,
      nextSeat: winner,
      tricksWonBySide: position.tricksWonBySide + trickPoint,
    };
  }

  return {
    ...position,
    currentTrick,
    hands,
    nextSeat: (seat + 1) % 4,
  };
}

function makePosition(dool, seat, side) {
  const hands = dool.data.players.map((player) => player.hand?.map(cloneCard) ?? []);
  const currentTrick = dool.data.tricks?.at(-1)?.getCards?.().map((play) => ({
    player: play.player,
    card: cloneCard(play.card),
  })) ?? [];
  const nextSeat = Number.isInteger(seat) ? seat : inferNextSeat(dool, currentTrick);

  if (!Number.isInteger(nextSeat)) return null;

  return {
    currentTrick,
    hands,
    nextSeat,
    side,
    tricksWonBySide: 0,
    trumpSuit: dool.data.tricks?.trumpSuit,
  };
}

function inferNextSeat(dool, currentTrick) {
  const turn = dool.getTurn?.();
  if (turn?.type === "card") return turn.players[0];
  if (currentTrick.length > 0) return (currentTrick.at(-1).player + 1) % 4;
  if (Number.isInteger(dool.data.leader)) return dool.data.leader;
  return null;
}

function isTerminal(position) {
  return position.hands.every((hand) => hand.length === 0) && position.currentTrick.length === 0;
}

function isPlausiblePosition(position) {
  const lengths = position.hands.map((hand) => hand.length);

  return Math.max(...lengths) - Math.min(...lengths) <= 1;
}

function validCards(hand, currentTrick) {
  if (currentTrick.length === 0) return hand;

  const leadSuit = currentTrick[0].card.suit;
  const followSuit = hand.filter((card) => card.suit === leadSuit);

  return followSuit.length > 0 ? followSuit : hand;
}

function winningPlay(plays, trumpSuit) {
  const leadSuit = plays[0].card.suit;

  return plays.slice(1).reduce((winner, play) => {
    if (cardBeats(play.card, winner.card, leadSuit, trumpSuit)) return play;
    return winner;
  }, plays[0]);
}

function cardBeats(challenger, currentWinner, leadSuit, trumpSuit) {
  const challengerIsTrump = trumpSuit !== undefined && challenger.suit === trumpSuit;
  const winnerIsTrump = trumpSuit !== undefined && currentWinner.suit === trumpSuit;

  if (challengerIsTrump && !winnerIsTrump) return true;
  if (!challengerIsTrump && winnerIsTrump) return false;

  if (challenger.suit !== currentWinner.suit) {
    return challenger.suit === leadSuit && currentWinner.suit !== leadSuit;
  }

  return RANK_VALUE[challenger.rank] > RANK_VALUE[currentWinner.rank];
}

function orderCardsForSearch(position, seat, cards) {
  const currentTrick = position.currentTrick;

  if (currentTrick.length === 0) {
    return sortCardsHighToLow(fakeDeck, cards);
  }

  const winners = cards.filter((card) => winningPlay([...currentTrick, { player: seat, card }], position.trumpSuit).player === seat);
  const losers = cards.filter((card) => !winners.includes(card));

  return [...sortCardsHighToLow(fakeDeck, winners), ...sortCardsHighToLow(fakeDeck, losers)];
}

function cardTieBreak(position, candidate, currentBest) {
  const candidateIsTrump = position.trumpSuit !== undefined && candidate.suit === position.trumpSuit;
  const currentIsTrump = position.trumpSuit !== undefined && currentBest.suit === position.trumpSuit;

  if (candidateIsTrump !== currentIsTrump) return candidateIsTrump ? -1 : 1;

  return RANK_VALUE[currentBest.rank] - RANK_VALUE[candidate.rank];
}

function positionKey(position) {
  const handsKey = position.hands.map((hand) => hand.map(cardLabel).sort().join(".")).join("|");
  const trickKey = position.currentTrick.map((play) => `${play.player}:${cardLabel(play.card)}`).join(".");

  return `${position.nextSeat};${position.trumpSuit ?? "NT"};${position.tricksWonBySide};${trickKey};${handsKey}`;
}

function removeCard(hand, card) {
  const index = hand.findIndex((candidate) => candidate.suit === card.suit && candidate.rank === card.rank);
  if (index < 0) return hand;

  return [...hand.slice(0, index), ...hand.slice(index + 1)];
}

function cloneCard(card) {
  return {
    suit: card.suit,
    rank: card.rank,
  };
}

const fakeDeck = {
  compare: (cardA, cardB) => RANK_VALUE[cardB.rank] - RANK_VALUE[cardA.rank],
};
