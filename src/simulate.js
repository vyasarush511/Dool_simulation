import { TwoHandHeuristicBot } from "./bots/twoHandHeuristicBot.js";
import { runTwoSideGame } from "./game/twoSideSimulation.js";

const args = new Set(process.argv.slice(2));
const dealCount = readNumberArg("--deals", 10);
const jsonOutput = args.has("--json");
const detailOutput = args.has("--detail");

const results = [];
const errors = [];

for (let index = 0; index < dealCount; index += 1) {
  try {
    results.push(
      runTwoSideGame({
        bots: [
          new TwoHandHeuristicBot("NS hybrid-search", 0),
          new TwoHandHeuristicBot("EW hybrid-search", 1),
        ],
      }),
    );
  } catch (error) {
    errors.push({
      deal: index + 1,
      message: error.message,
    });
  }
}

const summary = summarizeResults(results, errors);

if (jsonOutput) {
  console.log(JSON.stringify({ summary, sample: detailOutput ? results[0] : undefined }, null, 2));
} else {
  console.log("Dool bot simulation container is running");
  console.log(`Bot model: ${summary.botModel}`);
  console.log(`Deals requested: ${summary.dealsRequested}`);
  console.log(`Deals completed: ${summary.dealsCompleted}`);
  console.log(`Errors: ${summary.errors.length}`);
  console.log(`Contract success rate: ${summary.contractSuccessRate}%`);
  console.log(`Average tricks: NS ${summary.averageTricks.NS}, EW ${summary.averageTricks.EW}`);
  console.log("Contracts:", summary.contracts);

  if (detailOutput && results[0]) {
    console.log("Sample deal:");
    console.log(JSON.stringify(results[0], null, 2));
  }
}

if (errors.length > 0) {
  process.exitCode = 1;
}

function summarizeResults(completedResults, failedResults) {
  const contractGames = completedResults.filter((result) => result.contract);
  const madeContracts = contractGames.filter((result) => result.contractResult?.success);
  const trickTotals = completedResults.reduce(
    (totals, result) => {
      totals[0] += result.trickScore[0] ?? 0;
      totals[1] += result.trickScore[1] ?? 0;
      return totals;
    },
    [0, 0],
  );
  const contracts = {};

  for (const result of contractGames) {
    const label = `${result.contract.level}${result.contract.suit}-${result.sideNames[result.contract.declarer]}`;
    contracts[label] = (contracts[label] ?? 0) + 1;
  }

  return {
    botModel: "hybrid heuristic bidding + double-dummy-style rollout search",
    dealsRequested: dealCount,
    dealsCompleted: completedResults.length,
    errors: failedResults,
    contractSuccessRate: percent(madeContracts.length, contractGames.length),
    averageTricks: {
      NS: average(trickTotals[0], completedResults.length),
      EW: average(trickTotals[1], completedResults.length),
    },
    contracts,
  };
}

function readNumberArg(name, fallback) {
  const rawArg = process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`));
  if (!rawArg) return fallback;

  const value = Number(rawArg.split("=").at(-1));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function average(total, count) {
  if (count === 0) return 0;
  return Math.round((total / count) * 100) / 100;
}

function percent(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}
