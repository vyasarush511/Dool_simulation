import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HIGH_CARD_POINTS, RANK_VALUE, SUITS } from "../game/constants.js";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const FULL_DECK_SIZE = 52;
const SIDE_SEATS = [
  [0, 2],
  [1, 3],
];

const options = {
  deals: readNumberArg("--deals", 20000),
  minTotalCards: readNumberArg("--min", 16),
  maxTotalCards: readNumberArg("--max", 52),
  step: readNumberArg("--step", 4),
  seed: readNumberArg("--seed", 20260527),
  outputDir: readStringArg("--out", "analysis-output"),
  json: process.argv.includes("--json"),
};

const rows = analyzeCardCounts(options);
const recommendation = makeRecommendation(rows);
await writeOutputs(rows, recommendation, options);

if (options.json) {
  console.log(JSON.stringify({ options, recommendation, rows }, null, 2));
} else {
  printConsoleSummary(rows, recommendation, options);
}

export function analyzeCardCounts({ deals, minTotalCards, maxTotalCards, step, seed }) {
  const rng = seededRandom(seed);
  const rows = [];

  for (let totalCards = minTotalCards; totalCards <= maxTotalCards; totalCards += step) {
    if (totalCards % 4 !== 0) continue;

    const cardsPerSeat = totalCards / 4;
    if (!Number.isInteger(cardsPerSeat) || cardsPerSeat < 1 || totalCards > FULL_DECK_SIZE) continue;

    rows.push(summarizeCardCount({ cardsPerSeat, deals, rng }));
  }

  return rows.sort((a, b) => a.totalCards - b.totalCards);
}

function summarizeCardCount({ cardsPerSeat, deals, rng }) {
  const totalCards = cardsPerSeat * 4;
  const sideCards = cardsPerSeat * 2;
  const unseenFromOneSide = FULL_DECK_SIZE - sideCards;
  const opponentLiveCards = sideCards;
  const deadCards = FULL_DECK_SIZE - totalCards;
  const missingCardLiveOdds = opponentLiveCards / unseenFromOneSide;
  const missingCardDeadOdds = deadCards / unseenFromOneSide;
  const strongFitThreshold = Math.max(4, Math.ceil(sideCards * 0.34));
  const totals = {
    liveAces: 0,
    liveHonors: 0,
    missingAces: 0,
    hcpGap: 0,
    hcpShareGap: 0,
    bestFit: 0,
    fitGap: 0,
    favoriteEdge: 0,
    allAcesLive: 0,
    noAcesLive: 0,
    balancedHcp: 0,
    blowoutHcp: 0,
    strongFit: 0,
    twoPlusAcesEitherSide: 0,
    favoriteVeryClear: 0,
  };

  for (let deal = 0; deal < deals; deal += 1) {
    const sample = dealCards(cardsPerSeat, rng);
    const sideStats = [sideSummary(sample.hands, 0), sideSummary(sample.hands, 1)];
    const liveAces = sample.liveCards.filter((card) => card.rank === "A").length;
    const liveHonors = sample.liveCards.filter((card) => RANK_VALUE[card.rank] >= RANK_VALUE.J).length;
    const dealtHcp = sideStats[0].hcp + sideStats[1].hcp;
    const hcpGap = Math.abs(sideStats[0].hcp - sideStats[1].hcp);
    const hcpShareGap = dealtHcp === 0 ? 0 : hcpGap / dealtHcp;
    const bestFit = Math.max(sideStats[0].bestFit, sideStats[1].bestFit);
    const fitGap = Math.abs(sideStats[0].bestFit - sideStats[1].bestFit);
    const favoriteEdge = Math.abs(sideStrength(sideStats[0]) - sideStrength(sideStats[1]));

    totals.liveAces += liveAces;
    totals.liveHonors += liveHonors;
    totals.missingAces += 4 - liveAces;
    totals.hcpGap += hcpGap;
    totals.hcpShareGap += hcpShareGap;
    totals.bestFit += bestFit;
    totals.fitGap += fitGap;
    totals.favoriteEdge += favoriteEdge;
    totals.allAcesLive += Number(liveAces === 4);
    totals.noAcesLive += Number(liveAces === 0);
    totals.balancedHcp += Number(hcpShareGap <= 0.18);
    totals.blowoutHcp += Number(hcpShareGap >= 0.38);
    totals.strongFit += Number(bestFit >= strongFitThreshold);
    totals.twoPlusAcesEitherSide += Number(sideStats.some((side) => side.aces >= 2));
    totals.favoriteVeryClear += Number(favoriteEdge >= sideCards * 0.85);
  }

  const row = {
    cardsPerSeat,
    totalCards,
    deckDealtPct: percent(totalCards, FULL_DECK_SIZE),
    cardsUnseenFromOneSide: unseenFromOneSide,
    missingCardLiveOddsPct: roundPercent(missingCardLiveOdds),
    missingCardDeadOddsPct: roundPercent(missingCardDeadOdds),
    avgLiveAces: round(totals.liveAces / deals),
    avgMissingAces: round(totals.missingAces / deals),
    allAcesLivePct: percent(totals.allAcesLive, deals),
    noAcesLivePct: percent(totals.noAcesLive, deals),
    avgLiveHonors: round(totals.liveHonors / deals),
    avgHcpGap: round(totals.hcpGap / deals),
    avgHcpShareGapPct: roundPercent(totals.hcpShareGap / deals),
    balancedHcpPct: percent(totals.balancedHcp, deals),
    blowoutHcpPct: percent(totals.blowoutHcp, deals),
    avgBestTrumpFit: round(totals.bestFit / deals),
    strongFitThreshold,
    strongFitPct: percent(totals.strongFit, deals),
    avgFitGap: round(totals.fitGap / deals),
    twoPlusAcesEitherSidePct: percent(totals.twoPlusAcesEitherSide, deals),
    clearFavoritePct: percent(totals.favoriteVeryClear, deals),
    engagementScore: 0,
  };

  row.engagementScore = engagementScore(row);
  return row;
}

function dealCards(cardsPerSeat, rng) {
  const deck = shuffle(makeDeck(), rng);
  const hands = Array.from({ length: 4 }, () => []);

  for (let seat = 0; seat < hands.length; seat += 1) {
    hands[seat] = deck.splice(0, cardsPerSeat);
  }

  return {
    hands,
    liveCards: hands.flat(),
    deadCards: deck,
  };
}

function sideSummary(hands, side) {
  const cards = SIDE_SEATS[side].flatMap((seat) => hands[seat]);
  const suitCounts = Object.fromEntries(SUITS.map((suit) => [suit, 0]));
  let hcp = 0;
  let aces = 0;
  let topCards = 0;

  for (const card of cards) {
    suitCounts[card.suit] += 1;
    hcp += HIGH_CARD_POINTS[card.rank] ?? 0;
    aces += Number(card.rank === "A");
    topCards += Number(RANK_VALUE[card.rank] >= RANK_VALUE.Q);
  }

  return {
    hcp,
    aces,
    topCards,
    bestFit: Math.max(...Object.values(suitCounts)),
  };
}

function sideStrength(side) {
  return side.hcp * 1.15 + side.bestFit * 1.35 + side.aces * 1.2 + side.topCards * 0.35;
}

function engagementScore(row) {
  const depthScore = bell(row.cardsPerSeat, 8.5, 2.15);
  const uncertaintyScore = bell(row.missingCardDeadOddsPct, 50, 18);
  const balanceScore = clamp01(row.balancedHcpPct / 58);
  const blowoutPenalty = clamp01(row.blowoutHcpPct / 42);
  const clearFavoriteScore = bell(row.clearFavoritePct, 32, 20);
  const fitScore = bell(row.strongFitPct, 62, 24);

  const score =
    depthScore * 30 +
    uncertaintyScore * 24 +
    balanceScore * 18 +
    clearFavoriteScore * 14 +
    fitScore * 10 +
    (1 - blowoutPenalty) * 4;

  return Math.round(score);
}

function bell(value, target, spread) {
  return Math.exp(-((value - target) ** 2) / (2 * spread ** 2));
}

function makeRecommendation(rows) {
  const ranked = [...rows].sort((a, b) => b.engagementScore - a.engagementScore);
  const best = ranked[0];
  const runnerUp = ranked[1];

  return {
    bestTotalCards: best.totalCards,
    bestCardsPerSeat: best.cardsPerSeat,
    bestDeckDealtPct: best.deckDealtPct,
    score: best.engagementScore,
    runnerUpTotalCards: runnerUp?.totalCards,
    rationale:
      `${best.totalCards} cards gives ${best.cardsPerSeat} cards per seat, keeps a missing card live about ` +
      `${best.missingCardLiveOddsPct}% of the time, and leaves enough undealt-card uncertainty ` +
      `without reducing the hand to a mostly random short game.`,
  };
}

async function writeOutputs(rows, recommendation, { outputDir, deals, seed }) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "card-count-odds.csv"), toCsv(rows));
  await writeFile(join(outputDir, "card-count-odds-report.md"), toMarkdown(rows, recommendation, { deals, seed }));
}

function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => row[header]).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function toMarkdown(rows, recommendation, { deals, seed }) {
  const headers = [
    "Cards",
    "Per Seat",
    "Deck Dealt",
    "Missing Card Live",
    "Missing Card Dead",
    "Balanced HCP",
    "Strong Fit",
    "Clear Favorite",
    "Score",
  ];
  const table = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) =>
      `| ${[
        row.totalCards,
        row.cardsPerSeat,
        `${row.deckDealtPct}%`,
        `${row.missingCardLiveOddsPct}%`,
        `${row.missingCardDeadOddsPct}%`,
        `${row.balancedHcpPct}%`,
        `${row.strongFitPct}%`,
        `${row.clearFavoritePct}%`,
        row.engagementScore,
      ].join(" | ")} |`,
    ),
  ].join("\n");

  return `# Card Count vs Odds Analysis

Monte Carlo deals: ${deals}
Seed: ${seed}

## Recommendation

Use **${recommendation.bestTotalCards} total cards (${recommendation.bestCardsPerSeat} per seat)** as the first serious candidate for product testing.

${recommendation.rationale}

The runner-up in this run is **${recommendation.runnerUpTotalCards} total cards**.

## How to Read the Odds

- **Missing Card Live**: if our side does not hold a specific card, this is the probability that the opposing side has it.
- **Missing Card Dead**: if our side does not hold a specific card, this is the probability that it was never dealt.
- **Balanced HCP**: how often the live high-card points are reasonably close between the two sides.
- **Strong Fit**: how often at least one side has a meaningful trump fit for that card count.
- **Clear Favorite**: how often one side has a large pre-play material/shape edge.
- **Score**: a heuristic engagement score, not a mathematical truth. It rewards decision depth, uncertainty, balanced deals, and enough but not excessive favorite signal.

${table}

## Product Interpretation

- Very low card counts are volatile because most missing cards are not live. That creates surprise, but the user has less ability to reason.
- Full 52-card deals maximize information. If a card is missing from our side, the opponents must have it, so the game becomes much more deterministic.
- The middle range, especially 32 to 36 total cards, is where the game has enough card-play decisions while still keeping meaningful uncertainty.
`;
}

function printConsoleSummary(rows, recommendation, { deals, seed, outputDir }) {
  console.log("Card count vs odds analysis");
  console.log(`Deals per card count: ${deals}`);
  console.log(`Seed: ${seed}`);
  console.log(`Recommended starting point: ${recommendation.bestTotalCards} cards (${recommendation.bestCardsPerSeat} per seat)`);
  console.log(recommendation.rationale);
  console.table(
    rows.map((row) => ({
      cards: row.totalCards,
      perSeat: row.cardsPerSeat,
      dealtPct: row.deckDealtPct,
      liveOdds: row.missingCardLiveOddsPct,
      deadOdds: row.missingCardDeadOddsPct,
      balancedHcp: row.balancedHcpPct,
      strongFit: row.strongFitPct,
      clearFav: row.clearFavoritePct,
      score: row.engagementScore,
    })),
  );
  console.log(`Wrote ${join(outputDir, "card-count-odds.csv")}`);
  console.log(`Wrote ${join(outputDir, "card-count-odds-report.md")}`);
}

function makeDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

function shuffle(cards, rng) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
}

function seededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function readNumberArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!raw) return fallback;

  const value = Number(raw.split("=").at(-1));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStringArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!raw) return fallback;

  return raw.slice(name.length + 1) || fallback;
}

function percent(part, total) {
  if (!total) return 0;
  return roundPercent(part / total);
}

function roundPercent(ratio) {
  return round(ratio * 100);
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
