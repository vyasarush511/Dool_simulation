import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beginBettingRound, DEFAULT_BETTING_RULES, grossCollected, scheduledBettingRounds, startBettingHand } from "../pokerDool/bettingRules.js";
import { playSimpleBettingRound } from "../pokerDool/bettingBot.js";
import { dealPartialDeck, seededRandom } from "../pokerDool/deck.js";
import { estimateSideEquities, evaluatePokerDoolSide, minimumContractForTricks } from "../pokerDool/handEvaluation.js";

const options = {
  deals: readNumberArg("--deals", 5000),
  cardsPerSeat: readNumberArg("--cards-per-seat", 10),
  seed: readNumberArg("--seed", 20260529),
  outputDir: readStringArg("--out", "analysis-output"),
  json: process.argv.includes("--json"),
};

const rows = analyzePokerDoolStructure(options);
const recommendation = makeRecommendation(rows, options);
await writeOutputs(rows, recommendation, options);

if (options.json) {
  console.log(JSON.stringify({ options, recommendation, rows }, null, 2));
} else {
  printSummary(rows, recommendation, options);
}

export function analyzePokerDoolStructure({ deals, cardsPerSeat, seed }) {
  const rng = seededRandom(seed);
  const totalTricks = cardsPerSeat;
  const structures = [
    { name: "every_trick", interval: 1, startTrick: 0 },
    { name: "alternate_trick", interval: 2, startTrick: 0 },
    { name: "second_half_every_trick", interval: 1, startTrick: Math.ceil(totalTricks / 2) },
    { name: "second_half_alternate", interval: 2, startTrick: Math.ceil(totalTricks / 2) },
  ];

  return structures.map((structure) => simulateStructure({ structure, deals, cardsPerSeat, totalTricks, rng }));
}

function simulateStructure({ structure, deals, cardsPerSeat, totalTricks, rng }) {
  const rounds = scheduledBettingRounds({
    totalTricks,
    interval: structure.interval,
    startTrick: structure.startTrick,
    includeFinal: false,
  });
  const totals = {
    pot: 0,
    grossCollected: 0,
    tableFee: 0,
    folded: 0,
    foldTrickWhenFolded: 0,
    lateFold: 0,
    capHit: 0,
    actions: 0,
    checks: 0,
    bettingRounds: 0,
    checkOnlyRounds: 0,
    maxCommitment: 0,
    trumpLosers: 0,
    noTrumpWinners: 0,
    equitySpread: 0,
  };

  for (let deal = 0; deal < deals; deal += 1) {
    const sample = dealPartialDeck({ cardsPerSeat, rng });
    const sideEvaluations = [
      evaluatePokerDoolSide({ hands: sample.hands, side: 0 }),
      evaluatePokerDoolSide({ hands: sample.hands, side: 1 }),
    ];
    const trueEquities = estimateSideEquities(sideEvaluations[0], sideEvaluations[1]);
    let state = startBettingHand({ players: ["Player 1", "Player 2"], rules: DEFAULT_BETTING_RULES });

    totals.trumpLosers += (sideEvaluations[0].trumpLosers + sideEvaluations[1].trumpLosers) / 2;
    totals.noTrumpWinners += (sideEvaluations[0].noTrumpWinners + sideEvaluations[1].noTrumpWinners) / 2;
    totals.equitySpread += Math.abs(trueEquities[0] - trueEquities[1]);

    for (const trick of rounds) {
      if (state.folded.some(Boolean)) break;

      const actionCountBefore = state.actionLog.length;
      state = beginBettingRound(state, { trick });
      totals.bettingRounds += 1;

      const beliefs = noisyBeliefs(trueEquities, trick, totalTricks, rng);
      const confidences = [confidenceAtTrick(trick, totalTricks), confidenceAtTrick(trick, totalTricks)];
      state = playSimpleBettingRound({
        state,
        firstPlayer: (deal + trick) % 2,
        equities: beliefs,
        confidences,
        rules: DEFAULT_BETTING_RULES,
        rng,
      });

      const roundEvents = state.actionLog.slice(actionCountBefore).filter((event) => !["round_start", "cap_clip"].includes(event.type));
      const moneyEvents = roundEvents.filter((event) => ["bet", "raise", "call"].includes(event.type));
      totals.checkOnlyRounds += Number(roundEvents.length > 0 && roundEvents.every((event) => event.type === "check"));
      totals.checks += roundEvents.filter((event) => event.type === "check").length;
      totals.actions += roundEvents.length;

      if (moneyEvents.length === 0 && structure.name === "every_trick" && rng() < 0.03) {
        break;
      }
    }

    const folded = state.folded.some(Boolean);
    const foldEvent = state.actionLog.find((event) => event.type === "fold");
    const capHit = state.actionLog.some((event) => event.type === "cap_clip" || state.committed.some((amount) => amount >= DEFAULT_BETTING_RULES.maxCommitmentPerPlayer));

    totals.pot += state.pot;
    totals.grossCollected += grossCollected(state);
    totals.tableFee += state.tableFees[0] + state.tableFees[1];
    totals.folded += Number(folded);
    totals.foldTrickWhenFolded += folded ? foldEvent.trick : 0;
    totals.lateFold += Number(folded && (foldEvent?.trick ?? 0) >= Math.ceil(totalTricks * 0.5));
    totals.capHit += Number(capHit);
    totals.maxCommitment += Math.max(...state.committed);
  }

  const row = {
    structure: structure.name,
    rounds: rounds.join("|"),
    bettingRoundCount: rounds.length,
    avgPot: round(totals.pot / deals),
    avgGrossCollected: round(totals.grossCollected / deals),
    avgTableFee: round(totals.tableFee / deals),
    avgMaxCommitment: round(totals.maxCommitment / deals),
    foldRatePct: percent(totals.folded, deals),
    avgFoldTrickWhenFolded: totals.folded ? round(totals.foldTrickWhenFolded / totals.folded) : null,
    lateFoldPct: percent(totals.lateFold, Math.max(1, totals.folded)),
    capHitPct: percent(totals.capHit, deals),
    avgActions: round(totals.actions / deals),
    avgChecks: round(totals.checks / deals),
    checkOnlyRoundPct: percent(totals.checkOnlyRounds, Math.max(1, totals.bettingRounds)),
    avgTrumpLosers: round(totals.trumpLosers / deals),
    avgNoTrumpWinners: round(totals.noTrumpWinners / deals),
    avgEquitySpreadPct: roundPercent(totals.equitySpread / deals),
    structureScore: 0,
  };

  row.structureScore = structureScore(row);
  return row;
}

function noisyBeliefs(trueEquities, trick, totalTricks, rng) {
  const progress = trick / totalTricks;
  const noise = (1 - progress) * 0.18;
  return trueEquities.map((equity) => clamp01(equity + (rng() - 0.5) * noise));
}

function confidenceAtTrick(trick, totalTricks) {
  return clamp01(0.38 + (trick / totalTricks) * 0.48);
}

function structureScore(row) {
  const potScore = clamp01(row.avgPot / 260) * 32;
  const lateFoldScore = clamp01(row.lateFoldPct / 78) * 22;
  const foldRateScore = bell(row.foldRatePct, 28, 18) * 18;
  const actionScore = bell(row.avgActions, 9, 4) * 14;
  const boredomPenalty = clamp01(row.checkOnlyRoundPct / 70) * 8;
  const capSafetyScore = (1 - clamp01(row.capHitPct / 45)) * 14;

  return Math.round(potScore + lateFoldScore + foldRateScore + actionScore + capSafetyScore - boredomPenalty);
}

function makeRecommendation(rows, { cardsPerSeat }) {
  const ranked = [...rows].sort((a, b) => b.structureScore - a.structureScore);
  const best = ranked[0];

  return {
    recommendedStructure: best.structure,
    totalCards: cardsPerSeat * 4,
    cardsPerSeat,
    totalTricks: cardsPerSeat,
    minimumContract: minimumContractForTricks(cardsPerSeat),
    tableFee: DEFAULT_BETTING_RULES.tableFee,
    ante: DEFAULT_BETTING_RULES.ante,
    maxCommitmentPerPlayer: DEFAULT_BETTING_RULES.maxCommitmentPerPlayer,
    maxPot: DEFAULT_BETTING_RULES.maxPot,
    rationale:
      `${best.structure} gave the strongest balance of pot growth, late folds, action density, and cap safety. ` +
      `The default 32-card format creates ${cardsPerSeat} tricks, so the opening contract floor should be ${minimumContractForTricks(cardsPerSeat)} tricks.`,
  };
}

async function writeOutputs(rows, recommendation, { outputDir, deals, seed }) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "poker-dool-structure.csv"), toCsv(rows));
  await writeFile(join(outputDir, "poker-dool-structure-report.md"), toMarkdown(rows, recommendation, { deals, seed }));
}

function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  return `${[headers.join(","), ...rows.map((row) => headers.map((header) => row[header]).join(","))].join("\n")}\n`;
}

function toMarkdown(rows, recommendation, { deals, seed }) {
  const table = [
    "| Structure | Rounds | Avg Pot | Fold Rate | Avg Fold Trick When Folded | Late Folds | Check-Only Rounds | Cap Hit | Score |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.structure} | ${row.rounds.replaceAll("|", ", ")} | ${row.avgPot} | ${row.foldRatePct}% | ${row.avgFoldTrickWhenFolded ?? "-"} | ${row.lateFoldPct}% | ${row.checkOnlyRoundPct}% | ${row.capHitPct}% | ${row.structureScore} |`,
    ),
  ].join("\n");

  return `# Poker Dool Betting Structure Analysis

Monte Carlo deals: ${deals}
Seed: ${seed}

## Recommended Draft

- Format: **${recommendation.totalCards} cards dealt from the selected universe**.
- Cards per player/seat: **${recommendation.cardsPerSeat}**.
- Total tricks: **${recommendation.totalTricks}**.
- Minimum contract/trump bid: **${recommendation.minimumContract} tricks**.
- Table fee: **${recommendation.tableFee} from each player**, outside the pot.
- Ante: **${recommendation.ante} from each player**, inside the pot.
- Min bet/raise: **${DEFAULT_BETTING_RULES.minBet}**.
- Max commitment per player in one hand: **${recommendation.maxCommitmentPerPlayer}**.
- Max pot: **${recommendation.maxPot}**.
- Recommended betting cadence: **${recommendation.recommendedStructure}**.

${recommendation.rationale}

## Rules Draft

1. Each player pays the table fee before the hand starts. This is not part of the pot.
2. Each player posts the ante. The ante starts the pot.
3. A player may **check/pass** only when there is no bet to match.
4. A player facing a bet may **call**, **raise**, or **fold**.
5. Raising is capped by min bet, max raises per round, the progressive commitment cap, and max pot.
6. Early rounds have smaller caps; later rounds unlock larger caps. This keeps users in the hand longer while still allowing larger pots when the story of the hand is clearer.
7. Folded or target-reached hands keep unplayed opponent cards hidden by default. Cards are exposed only for replay, dispute review, cash-out audit, or explicit reveal mode.

## Structure Comparison

${table}

## Hand Evaluation Notes

- **Top-sequence winners**: count sure winners by top sequences in each suit. A is one winner; AK is two; AKQ is three; and so on.
- **Trump losers**: count losers using bridge-style losing trick count. In each suit, missing A/K/Q among the first three cards creates likely losers. Long trump holdings reduce loser count.
- These are not final EV models. They are explainable first-pass inputs for bidding, betting, folding, and cash-out pricing.
`;
}

function printSummary(rows, recommendation, { deals, seed, outputDir }) {
  console.log("Poker Dool betting structure analysis");
  console.log(`Deals: ${deals}`);
  console.log(`Seed: ${seed}`);
  console.log(`Recommendation: ${recommendation.recommendedStructure}`);
  console.log(recommendation.rationale);
  console.table(
    rows.map((row) => ({
      structure: row.structure,
      rounds: row.rounds,
      avgPot: row.avgPot,
      foldRate: row.foldRatePct,
      avgFoldTrick: row.avgFoldTrickWhenFolded,
      lateFolds: row.lateFoldPct,
      checksOnly: row.checkOnlyRoundPct,
      capHit: row.capHitPct,
      score: row.structureScore,
    })),
  );
  console.log(`Wrote ${join(outputDir, "poker-dool-structure.csv")}`);
  console.log(`Wrote ${join(outputDir, "poker-dool-structure-report.md")}`);
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

function bell(value, target, spread) {
  return Math.exp(-((value - target) ** 2) / (2 * spread ** 2));
}
