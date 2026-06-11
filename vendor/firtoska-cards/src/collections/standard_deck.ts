import { PlayingCard, PlayingCardRanks, PlayingCardSuits } from '../play_elements/playing_card';
import { Collection } from './collection';

/**
 * This is a collection/standard deck of playing cards.
 * This deck contains 52 cards(standard 4 suits and 13 ranks).
 */
export class StandardDeck extends Collection {
  /**
   * The playing cards in the deck.
   */
  elements: PlayingCard[] = [];

  /**
   * Creates the standard deck of playing cards with the standard 4 suits and 13 ranks.
   */
  constructor() {
    // Get the possible identifiers and values for the playing cards.
    const identifiers = Object.values(PlayingCardSuits);
    const values = Object.values(PlayingCardRanks);
    super(identifiers, values);

    // Create the deck of playing cards.
    for (const identifier of identifiers) {
      for (const value of values) {
        this.elements.push(new PlayingCard(identifier, value));
      }
    }
  }
}
