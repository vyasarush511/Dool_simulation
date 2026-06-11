import { RANK_VALUE, sideForSeat } from "./constants.js";
import { cloneCard, cloneDool } from "./stateClone.js";
import { chooseExactDoubleDummyCard } from "./exactDoubleDummy.js";
import { highestCard, lowestCard, sortCardsHighToLow } from "./evaluation.js";

const MAX_ROLLOUT_ACTIONS = 120;

export function chooseCardByDoubleDummyRollout({ dool, seat, side }) {
  const hand = dool.data.players[seat].hand;
  const legalCards = dool.data.tricks.getValidCards(hand);
  const tacticalCard = chooseImmediateTacticalCard(dool, seat, legalCards);

  if (legalCards.length === 0) {
    throw new Error(`No legal cards available for seat ${seat}`);
  }

  if (legalCards.length === 1) return legalCards[0];

  const exactCard = chooseExactDoubleDummyCard({ dool, seat, side });
  if (exactCard) return exactCard;

  if (tacticalCard) return tacticalCard;

  const candidates = legalCards.map((card) => scoreCandidateCard({ dool, seat, side, card }));

  candidates.sort((a, b) => b.score - a.score || b.texture - a.texture);
  return candidates[0].card;
}

export function chooseOpeningLeaderByDoubleDummy({ dool, side }) {
  const declarerTeam = dool.data.teams.find((team) => team.includes(dool.data.declarer));
  const defendingSeats = [0, 1, 2, 3].filter((seat) => !declarerTeam.includes(seat));
  const scoredSeats = defendingSeats.map((seat) => {
    const legalCards = dool.data.players[seat].hand;
    const defenderBestAgainstDeclarer = legalCards.reduce((worstScore, card) => {
      const trial = cloneDool(dool);
      trial.data.leader = seat;
      const trialCard = findCard(trial.data.players[seat].hand, card);
      trial.play(seat, trialCard);
      rolloutRemainder(trial);
      return Math.min(worstScore, scorePosition(trial, side));
    }, Infinity);

    return {
      seat,
      score: defenderBestAgainstDeclarer,
    };
  });

  scoredSeats.sort((a, b) => b.score - a.score);
  return scoredSeats[0].seat;
}

function scoreCandidateCard({ dool, seat, side, card }) {
  try {
    const trial = cloneDool(dool);
    const trialCard = findCard(trial.data.players[seat].hand, card);
    trial.play(seat, trialCard);
    takeCompletedTrickIfNeeded(trial);
    rolloutRemainder(trial);

    return {
      card,
      score: scorePosition(trial, side),
      texture: cardTextureScore(dool, seat, card),
    };
  } catch {
    return {
      card,
      score: Number.NEGATIVE_INFINITY,
      texture: cardTextureScore(dool, seat, card),
    };
  }
}

export function takeCompletedTrickIfNeeded(dool) {
  const currentTrick = dool.data.tricks.at(-1);

  if (!currentTrick || currentTrick.getCards().length !== 4) return;

  const winner = dool.data.tricks.getWinningCard(dool.data.tricks.length).player;
  dool.take(winner);
}

function rolloutRemainder(dool) {
  let actions = 0;

  while (actions < MAX_ROLLOUT_ACTIONS) {
    actions += 1;
    const turn = dool.getTurn();

    if (!turn || turn.type === "score") return;

    if (turn.type === "leading") {
      const declarerTeam = dool.data.teams.find((team) => team.includes(dool.data.declarer));
      dool.data.leader = [0, 1, 2, 3].find((seat) => !declarerTeam.includes(seat));
      continue;
    }

    if (turn.type === "take") {
      dool.take(turn.players[0]);
      continue;
    }

    if (turn.type === "card") {
      const seat = turn.players[0];
      const legalCards = dool.data.tricks.getValidCards(dool.data.players[seat].hand);
      const card = chooseRolloutCard(dool, seat, legalCards);
      dool.play(seat, card);
      takeCompletedTrickIfNeeded(dool);
      continue;
    }

    return;
  }
}

function chooseRolloutCard(dool, seat, legalCards) {
  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  const tacticalCard = chooseImmediateTacticalCard(dool, seat, legalCards);

  if (tacticalCard) return tacticalCard;

  if (currentTrick.length === 0) {
    return leadFromLongestSuit(dool, legalCards);
  }

  const winningCards = legalCards.filter((card) => wouldWinCurrentTrick(dool, seat, card));
  if (winningCards.length > 0 && currentTrick.length >= 2) {
    return lowestCard(dool.data.deck, winningCards);
  }

  return lowestCard(dool.data.deck, legalCards);
}

function leadFromLongestSuit(dool, legalCards) {
  const aceLead = chooseBestAceLead(dool, null, legalCards);

  if (aceLead) return aceLead;

  const groups = new Map();

  for (const card of legalCards) {
    const suitCards = groups.get(card.suit) ?? [];
    suitCards.push(card);
    groups.set(card.suit, suitCards);
  }

  const longest = [...groups.values()].sort((a, b) => b.length - a.length)[0];
  const sorted = sortCardsHighToLow(dool.data.deck, longest);

  if (sorted.some((card) => card.rank === "A")) {
    return highestCard(dool.data.deck, sorted);
  }

  return sorted.at(-1);
}

function chooseImmediateTacticalCard(dool, seat, legalCards) {
  if (!legalCards.length) return null;

  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  const side = sideForSeat(seat);
  const trumpSuit = dool.data.tricks.trumpSuit;

  if (currentTrick.length === 0) {
    return chooseLeadTacticalCard(dool, seat, legalCards);
  }

  const currentWinner = getCurrentWinningPlay(dool);
  const ownSideCurrentlyWinning = currentWinner && sideForSeat(currentWinner.player) === side;

  if (ownSideCurrentlyWinning) {
    return chooseSafeDiscard(dool, legalCards);
  }

  const forcedTrickWinner = chooseForcedTrickWinner(dool, seat, legalCards);

  if (forcedTrickWinner) {
    return forcedTrickWinner;
  }

  const winningCards = legalCards.filter((card) => wouldWinCurrentTrick(dool, seat, card));

  if (winningCards.length > 0) {
    const winningTrumps = trumpSuit ? winningCards.filter((card) => card.suit === trumpSuit) : [];
    if (winningTrumps.length > 0) {
      return lowestCard(dool.data.deck, winningTrumps);
    }

    const winningAces = winningCards.filter((card) => card.rank === "A");
    if (winningAces.length > 0) {
      return chooseBestAceLead(dool, seat, winningAces) ?? winningAces[0];
    }

    return lowestCard(dool.data.deck, winningCards);
  }

  return null;
}

function chooseLeadTacticalCard(dool, seat, legalCards) {
  const side = sideForSeat(seat);
  const declarerSide = Number(dool.data.contract?.declarer ?? dool.data.declarer);
  const trumpLead = chooseBestTrumpLead(dool, seat, legalCards, side === declarerSide);

  if (side === declarerSide && trumpLead) {
    return trumpLead;
  }

  const aceLead = chooseBestAceLead(dool, seat, legalCards);
  if (aceLead) return aceLead;

  return trumpLead;
}

function chooseBestTrumpLead(dool, seat, legalCards, isDeclarerSide) {
  const trumpSuit = dool.data.tricks.trumpSuit;
  if (!trumpSuit) return null;

  const trumpCards = legalCards.filter((card) => card.suit === trumpSuit);
  if (trumpCards.length === 0) return null;

  const sortedTrumps = sortCardsHighToLow(dool.data.deck, trumpCards);
  const highestTrump = sortedTrumps[0];

  if (isDeclarerSide) {
    if (trumpCards.length >= 3) return highestTrump;
    if (["A", "K"].includes(highestTrump.rank)) return highestTrump;
    return null;
  }

  if (highestTrump.rank === "A") return highestTrump;
  if (trumpCards.length >= 4 && ["K", "Q"].includes(highestTrump.rank)) return highestTrump;

  return null;
}

function chooseSafeDiscard(dool, legalCards) {
  const trumpSuit = dool.data.tricks.trumpSuit;
  const nonTrumps = trumpSuit ? legalCards.filter((card) => card.suit !== trumpSuit) : legalCards;

  if (nonTrumps.length > 0) {
    return lowestCard(dool.data.deck, nonTrumps);
  }

  return lowestCard(dool.data.deck, legalCards);
}

function chooseForcedTrickWinner(dool, seat, legalCards) {
  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  if (currentTrick.length === 0) return null;

  const side = sideForSeat(seat);
  const remainingSeats = remainingSeatsInTrick(seat, currentTrick.length + 1);
  const sideWinningCards = legalCards.filter((card) =>
    sideCanForceTrickWin(dool, side, [...currentTrick, { player: seat, card }], remainingSeats),
  );

  if (sideWinningCards.length === 0) return null;

  const trumpSuit = dool.data.tricks.trumpSuit;
  const winningTrumps = trumpSuit ? sideWinningCards.filter((card) => card.suit === trumpSuit) : [];

  return lowestCard(dool.data.deck, winningTrumps.length > 0 ? winningTrumps : sideWinningCards);
}

function sideCanForceTrickWin(dool, side, plays, remainingSeats) {
  if (remainingSeats.length === 0) {
    return sideForSeat(getWinningPlay(dool, plays).player) === side;
  }

  const [seat, ...nextSeats] = remainingSeats;
  const hand = dool.data.players[seat].hand;
  const legalCards = validCardsForPlays(hand, plays);

  if (sideForSeat(seat) === side) {
    return legalCards.some((card) => sideCanForceTrickWin(dool, side, [...plays, { player: seat, card }], nextSeats));
  }

  return legalCards.every((card) => sideCanForceTrickWin(dool, side, [...plays, { player: seat, card }], nextSeats));
}

function remainingSeatsInTrick(nextSeat, cardsAfterPlay) {
  const seats = [];
  let seat = (nextSeat + 1) % 4;

  while (cardsAfterPlay + seats.length < 4) {
    seats.push(seat);
    seat = (seat + 1) % 4;
  }

  return seats;
}

function validCardsForPlays(hand, plays) {
  if (plays.length === 0) return hand;

  const leadSuit = plays[0].card.suit;
  const sameSuit = hand.filter((card) => card.suit === leadSuit);

  return sameSuit.length > 0 ? sameSuit : hand;
}

function chooseBestAceLead(dool, seat, legalCards) {
  const aces = legalCards.filter((card) => card.rank === "A");

  if (aces.length === 0) return null;

  return aces
    .map((card) => ({
      card,
      score: aceLeadScore(dool, seat, card),
    }))
    .sort((a, b) => b.score - a.score || RANK_VALUE[b.card.rank] - RANK_VALUE[a.card.rank])[0].card;
}

function aceLeadScore(dool, seat, card) {
  const trumpSuit = dool.data.tricks.trumpSuit;
  const hand = Number.isInteger(seat) ? dool.data.players[seat].hand : [];
  const sameSuit = hand.filter((candidate) => candidate.suit === card.suit);
  const supportedByHonor = sameSuit.some((candidate) => ["K", "Q", "J", "10"].includes(candidate.rank));
  const isTrump = trumpSuit !== undefined && card.suit === trumpSuit;

  return 1 + sameSuit.length * 0.15 + Number(supportedByHonor) * 0.25 + Number(isTrump) * 0.1;
}

function wouldWinCurrentTrick(dool, seat, card) {
  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  const winner = getWinningPlay(dool, [...currentTrick, { player: seat, card }]);

  return winner.player === seat;
}

function getCurrentWinningPlay(dool) {
  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  if (currentTrick.length === 0) return null;
  return getWinningPlay(dool, currentTrick);
}

function getWinningPlay(dool, plays) {
  const leadSuit = plays[0].card.suit;
  const trumpSuit = dool.data.tricks.trumpSuit;

  return plays.slice(1).reduce((winner, play) => {
    if (cardBeats(dool, play.card, winner.card, leadSuit, trumpSuit)) {
      return play;
    }

    return winner;
  }, plays[0]);
}

function cardBeats(dool, challenger, currentWinner, leadSuit, trumpSuit) {
  const challengerIsTrump = trumpSuit !== undefined && challenger.suit === trumpSuit;
  const winnerIsTrump = trumpSuit !== undefined && currentWinner.suit === trumpSuit;

  if (challengerIsTrump && !winnerIsTrump) return true;
  if (!challengerIsTrump && winnerIsTrump) return false;

  if (challenger.suit !== currentWinner.suit) {
    return challenger.suit === leadSuit && currentWinner.suit !== leadSuit;
  }

  return dool.data.deck.compare(challenger, currentWinner) < 0;
}

function scorePosition(dool, side) {
  const trickScore = countCompletedTricksBySide(dool);
  const contract = dool.data.contract;
  const declarerSide = Number(contract?.declarer ?? 0);
  const contractTarget = contract ? Number(contract.level) + 6 : 7;
  const declarerTricks = trickScore[declarerSide];
  const sideTricks = trickScore[side];
  const opponentTricks = trickScore[(side + 1) % 2];
  const contractMargin = declarerTricks - contractTarget;

  if (!contract) return sideTricks - opponentTricks;

  if (side === declarerSide) {
    return contractMargin >= 0 ? 100 + contractMargin * 8 + sideTricks : contractMargin * 18 + sideTricks;
  }

  return contractMargin < 0 ? 100 + Math.abs(contractMargin) * 10 + sideTricks : -contractMargin * 18 + sideTricks;
}

function countCompletedTricksBySide(dool) {
  const score = [0, 0];

  for (let index = 0; index < dool.data.tricks.length; index += 1) {
    const trick = dool.data.tricks[index];
    if (trick.getCards().length !== 4) continue;

    const winner = dool.data.tricks.getWinningCard(index + 1);
    score[sideForSeat(winner.player)] += 1;
  }

  return score;
}

function cardTextureScore(dool, seat, card) {
  const currentTrick = dool.data.tricks.at(-1)?.getCards() ?? [];
  const trumpSuit = dool.data.tricks.trumpSuit;
  const isTrump = trumpSuit !== undefined && card.suit === trumpSuit;
  const rankScore = RANK_VALUE[card.rank] / 100;

  if (currentTrick.length === 0) {
    const sameSuitCount = dool.data.players[seat].hand.filter((candidate) => candidate.suit === card.suit).length;
    return sameSuitCount * 0.08 - rankScore + Number(card.rank === "A") * 0.2;
  }

  return Number(isTrump) * 0.06 - rankScore;
}

function findCard(hand, card) {
  const found = hand.find((candidate) => candidate.suit === card.suit && candidate.rank === card.rank);
  if (!found) {
    throw new Error(`Could not find card ${card.rank}${card.suit} in trial hand`);
  }
  return cloneCard(found);
}
