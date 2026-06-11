import { sideForSeat } from "./constants.js";
import { cardLabel } from "./evaluation.js";
import { generateLegalBids } from "../bots/twoHandHeuristicBot.js";

export function describeTurn(dool) {
  const turn = dool.getTurn();

  if (!turn) return { type: "none", actions: [] };

  if (turn.type === "bid") {
    return {
      type: "bid",
      side: turn.players[0],
      actions: generateLegalBids(dool),
    };
  }

  if (turn.type === "leading") {
    const declarerTeam = dool.data.teams.find((team) => team.includes(dool.data.declarer));
    return {
      type: "leading",
      side: dool.data.declarer,
      actions: [0, 1, 2, 3]
        .filter((seat) => !declarerTeam.includes(seat))
        .map((seat) => ({ type: "leader", seat })),
    };
  }

  if (turn.type === "card") {
    const seat = turn.players[0];
    return {
      type: "card",
      seat,
      side: sideForSeat(seat),
      actions: legalCardActions(dool, seat),
    };
  }

  if (turn.type === "take") {
    return {
      type: "take",
      seat: turn.players[0],
      side: sideForSeat(turn.players[0]),
      actions: [{ type: "take", seat: turn.players[0] }],
    };
  }

  return {
    type: turn.type,
    players: turn.players,
    actions: [],
  };
}

export function legalCardActions(dool, seat) {
  return dool.data.tricks.getValidCards(dool.data.players[seat].hand).map((card) => ({
    type: "card",
    seat,
    card,
    label: cardLabel(card),
  }));
}
