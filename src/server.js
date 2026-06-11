import { createReadStream, existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TwoHandHeuristicBot } from "./bots/twoHandHeuristicBot.js";
import { createInteractiveSession, passToBotContract, playHumanCard, setSessionContract } from "./game/interactiveSession.js";
import { runTwoSideGame } from "./game/twoSideSimulation.js";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT ?? 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/game") {
    try {
      sendJson(response, makeGame(url.searchParams));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (url.pathname === "/api/session/new") {
    try {
      const body = request.method === "POST" ? await readJson(request) : {};
      sendJson(response, createInteractiveSession({ humanSide: body.humanSide ?? url.searchParams.get("humanSide") }));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/session/contract") {
    try {
      const body = await readJson(request);
      sendJson(response, setSessionContract(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/session/pass") {
    try {
      const body = await readJson(request);
      sendJson(response, passToBotContract(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/session/card") {
    try {
      const body = await readJson(request);
      sendJson(response, playHumanCard(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/new") {
    try {
      const body = request.method === "POST" ? await readJson(request) : {};
      sendJson(response, createPokerDoolSession(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/view") {
    try {
      const body = request.method === "POST" ? await readJson(request) : Object.fromEntries(url.searchParams);
      sendJson(response, getPokerDoolSession(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/redeal") {
    try {
      const body = await readJson(request);
      sendJson(response, redealPokerDoolSession(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/next-round") {
    try {
      const body = await readJson(request);
      sendJson(response, startNextPokerDoolBettingRound(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/trump") {
    try {
      const body = await readJson(request);
      sendJson(response, setPokerDoolTrump(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/contract") {
    try {
      const body = await readJson(request);
      sendJson(response, setPokerDoolContract(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/action") {
    try {
      const body = await readJson(request);
      sendJson(response, applyPokerDoolHumanAction(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/card") {
    try {
      const body = await readJson(request);
      sendJson(response, playPokerDoolCard(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/ready-fold") {
    try {
      const body = await readJson(request);
      sendJson(response, requestPokerDoolReadyFold(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (url.pathname === "/api/poker-dool/ready-fold-response") {
    try {
      const body = await readJson(request);
      sendJson(response, respondPokerDoolReadyFold(body));
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const filePath = resolvePublicPath(url.pathname);

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Poker-Dool prototype running at http://localhost:${port}`);
});

function makeGame(searchParams) {
  const contract = readManualContract(searchParams);

  return runTwoSideGame({
    bots: [
      new TwoHandHeuristicBot("NS heuristic", 0),
      new TwoHandHeuristicBot("EW heuristic", 1),
    ],
    contract,
  });
}

function readManualContract(searchParams) {
  const level = searchParams.get("level");
  const suit = searchParams.get("suit");
  const declarer = searchParams.get("declarer");

  if (!level && !suit && !declarer) return null;

  return {
    level: Number(level),
    suit,
    declarer: Number(declarer),
  };
}

function resolvePublicPath(pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(normalizedPath);
  const filePath = path.normalize(path.join(publicDir, decodedPath));

  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

function sendJson(response, payload) {
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: error.message ?? String(error) }));
}

async function readJson(request) {
  if (request.method !== "POST") return {};

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) return {};

  return JSON.parse(rawBody);
}
