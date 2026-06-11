import { BID_SUITS, SIDE_SEATS } from "../game/constants.js";
import { chooseCardByDoubleDummyRollout, chooseOpeningLeaderByDoubleDummy } from "../game/cardPlaySearch.js";
import { bidValue, evaluateSide, expectedTricksToContractLevel, highestLevelBid } from "../game/evaluation.js";

export class TwoHandHeuristicBot {
  constructor(name, side) {
    this.name = name;
    this.side = side;
    this.seats = SIDE_SEATS[side];
  }

  chooseBid({ dool }) {
    const legalBids = generateLegalBids(dool);
    const pass = legalBids.find((bid) => bid.type === "pass");
    const evaluation = evaluateSide(dool.data, this.side);
    const highestBid = highestLevelBid(dool.data.bids);
    const highestValue = highestBid ? bidValue(highestBid.level, highestBid.suit) : 0;

    const candidateBids = evaluation.candidates
      .map((candidate) => ({
        type: "level",
        level: expectedTricksToContractLevel(candidate.expectedTricks),
        suit: candidate.suit,
        expectedTricks: candidate.expectedTricks,
        score: candidate.score,
      }))
      .filter((bid) => bid.level >= 1)
      .filter((bid) => bidValue(bid.level, bid.suit) > highestValue)
      .map((bid) => ({
        ...bid,
        targetTricks: bid.level + 6,
        margin: bid.expectedTricks - (bid.level + 6),
      }))
      .filter((bid) => bid.margin >= -0.35 || bid.score >= 15)
      .sort((a, b) => bidUtility(b) - bidUtility(a));

    const bestLegalBid = candidateBids.find((candidate) =>
      legalBids.some(
        (bid) => bid.type === "level" && Number(bid.level) === candidate.level && bid.suit === candidate.suit,
      ),
    );

    if (bestLegalBid) {
      return {
        type: "level",
        level: bestLegalBid.level,
        suit: bestLegalBid.suit,
      };
    }

    const canDouble = legalBids.some((bid) => bid.type === "double");
    if (canDouble && highestBid?.player !== this.side && evaluation.hcp >= 25 && evaluation.best.expectedTricks >= 8.4) {
      return { type: "double" };
    }

    return pass;
  }

  chooseOpeningLeader({ dool }) {
    return chooseOpeningLeaderByDoubleDummy({ dool, side: this.side });
  }

  chooseCard({ dool, seat }) {
    const legalCards = dool.data.tricks.getValidCards(dool.data.players[seat].hand);
    if (legalCards.length === 0) {
      throw new Error(`${this.name} has no legal cards for seat ${seat}`);
    }

    const selectedCard = chooseCardByDoubleDummyRollout({ dool, seat, side: this.side });

    if (legalCards.some((card) => card.rank === selectedCard.rank && card.suit === selectedCard.suit)) {
      return selectedCard;
    }

    return legalCards[0];
  }
}

export function generateLegalBids(dool) {
  const bids = [{ type: "pass" }];

  for (let level = 1; level <= 7; level += 1) {
    for (const suit of BID_SUITS) {
      if (dool.isValidBid("level", level, suit)) {
        bids.push({ type: "level", level, suit });
      }
    }
  }

  if (dool.isValidBid("double")) bids.push({ type: "double" });
  if (dool.isValidBid("redouble")) bids.push({ type: "redouble" });

  return bids;
}

function bidUtility(bid) {
  const confidence = bid.margin * 6;
  const fitQuality = (bid.score ?? 0) * 0.08;
  const levelRisk = (bid.level - 1) * 0.45;

  return confidence + fitQuality - levelRisk;
}
