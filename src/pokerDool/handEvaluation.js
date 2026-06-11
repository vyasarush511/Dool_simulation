import { HIGH_CARD_POINTS, RANK_VALUE, SIDE_SEATS, SUITS } from "../game/constants.js";

const WINNER_SEQUENCE = ["A", "K", "Q", "J", "10"];

export function minimumContractForTricks(totalTricks) {
  return Math.ceil(Number(totalTricks) / 2);
}

export function evaluatePokerDoolSide({ hands, side, trumpSuit = undefined }) {
  const sideHands = SIDE_SEATS[side].map((seat) => hands[seat]);
  const cards = sideHands.flat();
  const hcp = cards.reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
  const suitCounts = countSuits(cards);
  const bestTrumpSuit = Object.entries(suitCounts).sort((a, b) => b[1] - a[1] || suitPower(cards, b[0]) - suitPower(cards, a[0]))[0][0];
  const selectedTrump = trumpSuit && trumpSuit !== "NT" ? trumpSuit : bestTrumpSuit;
  const noTrumpWinners = countNoTrumpWinners(cards);
  const trumpLosers = sideHands.reduce((total, hand) => total + countTrumpLosers(hand, selectedTrump), 0);
  const bestTrumpFit = suitCounts[bestTrumpSuit];
  const trumpControl = cards
    .filter((card) => card.suit === selectedTrump)
    .reduce((total, card) => total + trumpControlValue(card.rank), 0);
  const ntStrength = hcp * 0.42 + noTrumpWinners * 1.4;
  const trumpStrength = hcp * 0.36 + bestTrumpFit * 1.15 + trumpControl * 0.9 - trumpLosers * 0.55;

  return {
    side,
    hcp,
    cards,
    suitCounts,
    bestTrumpSuit,
    bestTrumpFit,
    noTrumpWinners,
    trumpLosers: round(trumpLosers),
    ntStrength: round(ntStrength),
    trumpStrength: round(trumpStrength),
    strength: round(Math.max(ntStrength, trumpStrength)),
  };
}

export function countNoTrumpWinners(cards) {
  const grouped = groupBySuit(cards);
  let winners = 0;

  for (const suit of SUITS) {
    const ranks = new Set(grouped[suit].map((card) => card.rank));

    for (const rank of WINNER_SEQUENCE) {
      if (!ranks.has(rank)) break;
      winners += 1;
    }
  }

  return winners;
}

export function countTrumpLosers(hand, trumpSuit = undefined) {
  const grouped = groupBySuit(hand);
  let losers = 0;

  for (const suit of SUITS) {
    const suitCards = grouped[suit].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
    const length = suitCards.length;

    if (length === 0) continue;

    const maxLosers = Math.min(3, length);
    const ranks = new Set(suitCards.slice(0, 3).map((card) => card.rank));
    let suitLosers = 0;

    if (!ranks.has("A")) suitLosers += 1;
    if (maxLosers >= 2 && !ranks.has("K")) suitLosers += 1;
    if (maxLosers >= 3 && !ranks.has("Q")) suitLosers += 1;

    if (suit === trumpSuit && length >= 5) {
      suitLosers = Math.max(0, suitLosers - 1);
    }

    losers += suitLosers;
  }

  return losers;
}

export function estimateSideEquities(evaluationA, evaluationB) {
  const diff = evaluationA.strength - evaluationB.strength;
  const equityA = sigmoid(diff / 7.5);

  return [roundProbability(equityA), roundProbability(1 - equityA)];
}

function groupBySuit(cards) {
  const grouped = Object.fromEntries(SUITS.map((suit) => [suit, []]));

  for (const card of cards) {
    grouped[card.suit]?.push(card);
  }

  return grouped;
}

function countSuits(cards) {
  const counts = Object.fromEntries(SUITS.map((suit) => [suit, 0]));

  for (const card of cards) {
    counts[card.suit] += 1;
  }

  return counts;
}

function suitPower(cards, suit) {
  return cards
    .filter((card) => card.suit === suit)
    .reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
}

function trumpControlValue(rank) {
  if (rank === "A") return 1;
  if (rank === "K") return 0.7;
  if (rank === "Q") return 0.45;
  if (rank === "J") return 0.25;
  return 0;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundProbability(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;
}
