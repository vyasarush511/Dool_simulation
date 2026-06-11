export function createReplayLog({ handId, players, cardsPerSeat, rules }) {
  return {
    handId,
    players,
    cardsPerSeat,
    rulesSnapshot: structuredCloneSafe(rules),
    events: [],
  };
}

export function recordReplayEvent(log, event) {
  log.events.push({
    index: log.events.length,
    at: new Date().toISOString(),
    ...event,
  });
  return log;
}

export function exposeCards(log, { player, cards, reason }) {
  return recordReplayEvent(log, {
    type: "expose_cards",
    player,
    cards: cards.map(cardLabel),
    reason,
  });
}

export function muckCards(log, { player, reason }) {
  return recordReplayEvent(log, {
    type: "muck_cards",
    player,
    reason,
  });
}

export function summarizeReplay(log) {
  return {
    handId: log.handId,
    cardsPerSeat: log.cardsPerSeat,
    eventCount: log.events.length,
    exposedEvents: log.events.filter((event) => event.type === "expose_cards").length,
    muckEvents: log.events.filter((event) => event.type === "muck_cards").length,
    bettingEvents: log.events.filter((event) => ["bet", "raise", "call", "check", "fold"].includes(event.type)).length,
    cardEvents: log.events.filter((event) => event.type === "card").length,
  };
}

function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
