import { BID_SUITS, HIGH_CARD_POINTS, RANK_VALUE, SIDE_SEATS, SUITS } from "./constants.js";

export function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

export function playLabel(play) {
  return `${play.player}:${cardLabel(play.card)}`;
}

export function highCardPoints(hand) {
  return hand.reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
}

export function sideHands(data, side) {
  return SIDE_SEATS[side].map((seat) => data.players[seat].hand);
}

export function sideCards(data, side) {
  return sideHands(data, side).flat();
}

export function sideHighCardPoints(data, side) {
  return sideCards(data, side).reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
}

export function handSuitProfile(hand) {
  const profile = Object.fromEntries(SUITS.map((suit) => [suit, { count: 0, hcp: 0, honors: [] }]));

  for (const card of hand) {
    if (!profile[card.suit]) continue;
    profile[card.suit].count += 1;
    profile[card.suit].hcp += HIGH_CARD_POINTS[card.rank] ?? 0;
    if (HIGH_CARD_POINTS[card.rank]) profile[card.suit].honors.push(card.rank);
  }

  return profile;
}

export function suitProfile(cards) {
  const profile = Object.fromEntries(SUITS.map((suit) => [suit, { count: 0, hcp: 0, topRanks: 0 }]));

  for (const card of cards) {
    if (!profile[card.suit]) continue;
    profile[card.suit].count += 1;
    profile[card.suit].hcp += HIGH_CARD_POINTS[card.rank] ?? 0;
    if (RANK_VALUE[card.rank] >= RANK_VALUE.Q) {
      profile[card.suit].topRanks += 1;
    }
  }

  return profile;
}

export function evaluateSide(data, side) {
  const hands = sideHands(data, side);
  const cards = hands.flat();
  const hcp = sideHighCardPoints(data, side);
  const suitEvaluations = SUITS.map((suit) => evaluateTrumpSuit(hands, suit));
  const noTrumpEvaluation = evaluateNoTrump(hands, hcp);
  const candidates = [...suitEvaluations, noTrumpEvaluation].sort((a, b) => b.expectedTricks - a.expectedTricks);
  const best = candidates[0];

  return {
    hcp,
    cards,
    candidates,
    best,
    recommendedBid: {
      type: "level",
      level: expectedTricksToContractLevel(best.expectedTricks),
      suit: best.suit,
    },
  };
}

export function bestTrumpSuit(cards) {
  const pseudoData = {
    players: [
      { hand: cards.slice(0, Math.ceil(cards.length / 2)) },
      { hand: [] },
      { hand: cards.slice(Math.ceil(cards.length / 2)) },
    ],
  };

  return evaluateSide(pseudoData, 0).best.suit;
}

export function evaluateTrumpSuit(hands, suit) {
  const [frontHand, backHand] = hands;
  const handProfiles = hands.map(handSuitProfile);
  const cards = hands.flat();
  const trumpCards = cards.filter((card) => card.suit === suit);
  const nonTrumpCards = cards.filter((card) => card.suit !== suit);
  const totalTrump = trumpCards.length;
  const frontTrump = frontHand.filter((card) => card.suit === suit).length;
  const backTrump = backHand.filter((card) => card.suit === suit).length;
  const spread = Math.min(frontTrump, backTrump);
  const imbalancePenalty = Math.abs(frontTrump - backTrump) * 0.16;
  const trumpHcp = trumpCards.reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
  const trumpControlScore = trumpCards.reduce((total, card) => {
    if (card.rank === "A") return total + 0.95;
    if (card.rank === "K") return total + 0.58;
    if (card.rank === "Q") return total + 0.32;
    if (card.rank === "J") return total + 0.14;
    return total;
  }, 0);
  const sideControls = nonTrumpCards.reduce((total, card) => {
    if (card.rank === "A") return total + 0.58;
    if (card.rank === "K") return total + 0.28;
    if (card.rank === "Q") return total + 0.1;
    return total;
  }, 0);
  const shortnessRuffValue = SUITS.filter((candidate) => candidate !== suit).reduce((total, sideSuit) => {
    const frontCount = handProfiles[0][sideSuit].count;
    const backCount = handProfiles[1][sideSuit].count;
    const shortage = Number(frontCount <= 1 && backTrump >= 3) + Number(backCount <= 1 && frontTrump >= 3);
    return total + shortage * 0.34;
  }, 0);

  const hcp = cards.reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
  const lengthFit = Math.max(0, totalTrump - 6) * 0.22;
  const spreadFit = spread * 0.1;
  const highCardBase = (hcp - 20) * 0.1;
  const expectedTricks =
    6.25 +
    highCardBase +
    lengthFit +
    spreadFit +
    trumpControlScore * 0.25 +
    sideControls * 0.12 +
    shortnessRuffValue * 0.15 -
    imbalancePenalty +
    trumpHcp * 0.01;

  return {
    suit,
    expectedTricks,
    totalTrump,
    split: [frontTrump, backTrump],
    spread,
    trumpHcp,
    score:
      totalTrump * 1.25 +
      spread * 1.1 +
      trumpHcp * 0.7 +
      trumpControlScore +
      shortnessRuffValue -
      imbalancePenalty,
  };
}

export function evaluateNoTrump(hands, hcp) {
  const profiles = hands.map(handSuitProfile);
  const cards = hands.flat();
  const stopperScore = SUITS.reduce((total, suit) => {
    const hasAce = cards.some((card) => card.suit === suit && card.rank === "A");
    const hasKingQueen = ["K", "Q"].every((rank) => cards.some((card) => card.suit === suit && card.rank === rank));
    const hasQueenJackTen = ["Q", "J", "10"].every((rank) => cards.some((card) => card.suit === suit && card.rank === rank));
    return total + Number(hasAce) * 0.55 + Number(hasKingQueen) * 0.34 + Number(hasQueenJackTen) * 0.2;
  }, 0);
  const shapePenalty = SUITS.reduce((total, suit) => {
    const totalCount = profiles[0][suit].count + profiles[1][suit].count;
    return total + (totalCount <= 3 ? 0.22 : 0);
  }, 0);

  return {
    suit: "NT",
    expectedTricks: 6.15 + (hcp - 20) * 0.11 + stopperScore * 0.16 - shapePenalty,
    totalTrump: 0,
    split: [0, 0],
    spread: 0,
    trumpHcp: 0,
    score: hcp * 0.45 + stopperScore - shapePenalty,
  };
}

export function expectedTricksToContractLevel(expectedTricks) {
  return Math.max(1, Math.min(7, Math.floor(expectedTricks - 6.05)));
}

export function highestLevelBid(bids) {
  let highest = null;

  for (const bid of bids) {
    if (bid.bidType !== "level") continue;
    if (!highest) {
      highest = bid;
      continue;
    }

    const currentValue = bidValue(bid.level, bid.suit);
    const highestValue = bidValue(highest.level, highest.suit);
    if (currentValue > highestValue) highest = bid;
  }

  return highest;
}

export function bidValue(level, suit) {
  return Number(level) * 10 + BID_SUITS.indexOf(suit);
}

export function compareCardHighToLow(deck, cardA, cardB) {
  return deck.compare(cardA, cardB);
}

export function sortCardsHighToLow(deck, cards) {
  return [...cards].sort((a, b) => compareCardHighToLow(deck, a, b));
}

export function lowestCard(deck, cards) {
  return sortCardsHighToLow(deck, cards).at(-1);
}

export function highestCard(deck, cards) {
  return sortCardsHighToLow(deck, cards)[0];
}
