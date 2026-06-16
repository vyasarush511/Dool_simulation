import { randomInt } from "node:crypto";
import { SUITS } from "../game/constants.js";

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const FULL_DECK_SIZE = 52;
export const DEAL_STYLES = {
  standard: {
    id: "standard",
    label: "Standard",
    summary: "One card at a time around the table.",
  },
  goulash: {
    id: "goulash",
    label: "Goulash",
    summary: "Bridge-inspired packet deal with suit clustering for wilder shapes.",
  },
};

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

export function dealStyle(styleId = "standard") {
  return DEAL_STYLES[styleId] ?? DEAL_STYLES.standard;
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

export function dealPartialDeck({ variant = "36_52", cardsPerSeat = undefined, dealStyle: styleId = "standard", rng = cryptoRandom } = {}) {
  const selectedVariant = gameVariant(variant);
  const selectedDealStyle = dealStyle(styleId);
  const handLength = cardsPerSeat ?? selectedVariant.cardsPerSeat;
  const universeCards = makeUniverseCards(selectedVariant, rng);
  const deck =
    selectedDealStyle.id === "goulash"
      ? makeGoulashDeck(universeCards, rng)
      : shuffle(universeCards.map((card) => ({ ...card })), rng);
  const hands = Array.from({ length: 4 }, () => []);
  const dealtCards = handLength * hands.length;
  const dealPattern = selectedDealStyle.id === "goulash" ? goulashPacketPattern(handLength, rng) : [1];

  if (dealtCards > deck.length) {
    throw new Error(`Cannot deal ${dealtCards} cards from a ${deck.length}-card deck.`);
  }

  const deadStartIndex =
    selectedDealStyle.id === "goulash"
      ? dealByPackets({ deck, hands, handLength, pattern: dealPattern })
      : dealOneByOne({ deck, hands, dealtCards });

  return {
    variant: selectedVariant,
    dealStyle: selectedDealStyle,
    dealPattern,
    hands,
    liveCards: hands.flat(),
    deadCards: deck.slice(deadStartIndex),
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

function dealOneByOne({ deck, hands, dealtCards }) {
  for (let index = 0; index < dealtCards; index += 1) {
    hands[index % hands.length].push(deck[index]);
  }

  return dealtCards;
}

function dealByPackets({ deck, hands, handLength, pattern }) {
  let deckIndex = 0;

  for (const packetSize of pattern) {
    for (let seat = 0; seat < hands.length; seat += 1) {
      const remaining = handLength - hands[seat].length;
      const take = Math.min(packetSize, remaining);
      hands[seat].push(...deck.slice(deckIndex, deckIndex + take));
      deckIndex += take;
    }
  }

  return deckIndex;
}

function goulashPacketPattern(handLength, rng) {
  if (handLength === 9) {
    return rng() < 0.5 ? [5, 3, 1] : [4, 4, 1];
  }

  if (handLength === 6) {
    return rng() < 0.5 ? [4, 1, 1] : [3, 2, 1];
  }

  const basePatterns = [
    [5, 5, 3],
    [4, 5, 4],
  ];
  const basePattern = basePatterns[Math.floor(rng() * basePatterns.length)];
  return scalePacketPattern(basePattern, handLength);
}

function scalePacketPattern(pattern, targetTotal) {
  const baseTotal = pattern.reduce((sum, value) => sum + value, 0);
  const scaled = pattern.map((value, index) => {
    const raw = (value / baseTotal) * targetTotal;
    return {
      index,
      value: Math.max(1, Math.floor(raw)),
      fraction: raw - Math.floor(raw),
    };
  });
  let total = scaled.reduce((sum, entry) => sum + entry.value, 0);

  while (total < targetTotal) {
    const entry = [...scaled].sort((a, b) => b.fraction - a.fraction || a.index - b.index)[0];
    entry.value += 1;
    entry.fraction = 0;
    total += 1;
  }

  while (total > targetTotal) {
    const entry = [...scaled].filter((candidate) => candidate.value > 1).sort((a, b) => a.fraction - b.fraction || b.index - a.index)[0];
    entry.value -= 1;
    total -= 1;
  }

  const result = scaled.sort((a, b) => a.index - b.index).map((entry) => entry.value);
  if (new Set(result).size === 1 && result[0] > 1) {
    result[0] += 1;
    result[result.length - 1] -= 1;
  }

  return result;
}

function makeGoulashDeck(universeCards, rng) {
  const suitBlocks = shuffle([...SUITS], rng).map((suit) =>
    shuffle(
      universeCards.filter((card) => card.suit === suit).map((card) => ({ ...card })),
      rng,
    ),
  );
  return cutDeck(suitBlocks.flat(), rng);
}

function cutDeck(cards, rng) {
  const cutIndex = Math.floor(rng() * cards.length);
  return [...cards.slice(cutIndex), ...cards.slice(0, cutIndex)];
}

function cryptoRandom() {
  return randomInt(0, 2 ** 32) / 2 ** 32;
}
