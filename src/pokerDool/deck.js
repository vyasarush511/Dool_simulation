import { randomInt } from "node:crypto";
import { SUITS } from "../game/constants.js";

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const FULL_DECK_SIZE = 52;

export const POKER_DOOL_VARIANTS = {
  "36_52": {
    id: "36_52",
    label: "36 / 52",
    name: "36 cards from 52",
    totalDeckCards: 52,
    dealtCards: 36,
    cardsPerSeat: 9,
    ranks: RANKS,
    bettingRounds: [0, 3, 5, 7, 8],
    deckSummary: "Full 52-card deck: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2 in each suit. Deal 36; 16 stay hidden.",
  },
  "24_36": {
    id: "24_36",
    label: "24 / 36",
    name: "24 cards from a random 36-card universe",
    totalDeckCards: 36,
    dealtCards: 24,
    cardsPerSeat: 6,
    ranks: RANKS,
    randomUniverseSize: 36,
    bettingRounds: [0, 2, 4, 5],
    deckSummary: "Random 36-card universe sampled from the full 52-card deck. Deal 24; 12 universe cards stay hidden.",
  },
};

export function gameVariant(variantId = "36_52") {
  return POKER_DOOL_VARIANTS[variantId] ?? POKER_DOOL_VARIANTS["36_52"];
}

export function makeDeck({ ranks = RANKS } = {}) {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

export function dealPartialDeck({ variant = "36_52", cardsPerSeat = undefined, rng = cryptoRandom } = {}) {
  const selectedVariant = gameVariant(variant);
  const handLength = cardsPerSeat ?? selectedVariant.cardsPerSeat;
  const universeCards = makeUniverseCards(selectedVariant, rng);
  const deck = shuffle(universeCards.map((card) => ({ ...card })), rng);
  const hands = Array.from({ length: 4 }, () => []);
  const dealtCards = handLength * hands.length;

  if (dealtCards > deck.length) {
    throw new Error(`Cannot deal ${dealtCards} cards from a ${deck.length}-card deck.`);
  }

  for (let index = 0; index < dealtCards; index += 1) {
    hands[index % hands.length].push(deck[index]);
  }

  return {
    variant: selectedVariant,
    hands,
    liveCards: hands.flat(),
    deadCards: deck.slice(dealtCards),
    universeCards,
  };
}

export function seededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(cards, rng) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
}

function makeUniverseCards(variant, rng) {
  const fullDeck = shuffle(makeDeck({ ranks: RANKS }), rng);

  if (variant.randomUniverseSize) {
    return fullDeck.slice(0, variant.randomUniverseSize).map((card) => ({ ...card }));
  }

  return makeDeck({ ranks: variant.ranks }).map((card) => ({ ...card }));
}

function cryptoRandom() {
  return randomInt(0, 2 ** 32) / 2 ** 32;
}
