import { PlayingCard, PlayingCardRanks, PlayingCardSuits } from '../play_elements/playing_card';
import { Collection } from './collection';

/**
 * This is a collection of customized deck of playing cards.
 * This is useful for games that require a customized deck of playing cards with a specific set of suits and ranks.
 */
export class PlayingCardsDeck extends Collection {
  /**
   * The playing cards in the deck.
   */
  elements: PlayingCard[] = [];

  /**
   * Creates an instance of the PlayingCardsDeck class.
   * @param identifiers the possible identifiers of the playing cards.
   * @param values the possible values of the playing cards.
   */
  constructor(identifiers: PlayingCardSuits[], values: PlayingCardRanks[]) {
    super(identifiers, values);

    // Create the deck of playing cards.
    for (const identifier of identifiers) {
      for (const value of values) {
        this.elements.push(new PlayingCard(identifier, value));
      }
    }
  }
}
