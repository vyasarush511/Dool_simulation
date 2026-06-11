import Dool from "@dool/logic";
import cards from "@firtoska/cards";

export function cloneDool(dool) {
  const deck = new cards.Deck([...dool.data.deck.ranks], [...dool.data.deck.suits]);
  deck.cards = dool.data.deck.cards.map(cloneCard);

  const data = {
    ...dool.data,
    deck,
    players: dool.data.players.map((player) => ({
      ...player,
      hand: player.hand?.map(cloneCard) ?? [],
    })),
    teams: dool.data.teams?.map((team) => [...team]) ?? [],
    bids: dool.data.bids?.map((bid) => ({ ...bid })) ?? [],
    contract: dool.data.contract ? { ...dool.data.contract } : undefined,
  };

  data.tricks = cloneTricks(dool.data.tricks, deck);

  return new Dool(data);
}

export function cloneCard(card) {
  return {
    suit: card.suit,
    rank: card.rank,
  };
}

function cloneTricks(sourceTricks, deck) {
  const targetTricks = new cards.Tricks(deck);

  if (!sourceTricks) return targetTricks;

  targetTricks.maxCards = sourceTricks.maxCards;
  targetTricks.trumpSuit = sourceTricks.trumpSuit;
  targetTricks.flipped = sourceTricks.flipped;

  for (const sourceTrick of sourceTricks) {
    targetTricks.addTrick();
    const targetTrick = targetTricks.at(-1);
    targetTrick.flipped = sourceTrick.flipped;

    for (const item of sourceTrick) {
      if (item.card !== undefined) {
        targetTrick.push({
          player: item.player,
          card: cloneCard(item.card),
        });
      } else if (item.proposal !== undefined) {
        targetTrick.push({ ...item });
      } else {
        targetTrick.push({ ...item });
      }
    }
  }

  return targetTricks;
}
