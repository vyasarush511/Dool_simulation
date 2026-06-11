import { PlayElement } from '../play_elements/play_element';

/**
 * The abstracts a collection of cards, coins, fruits or any other game piece.
 */
export abstract class Collection {
  /**
   * The possible identifiers of the elements in the collection.
   */
  identifiers: string[];

  /**
   * The possible values of the elements in the collection.
   */
  values: string[];

  /**
   * The game play elements in the collection.
   */
  abstract elements: PlayElement[];

  /**
   * Constructor for the Collection class.
   * @param identifiers the possible identifiers of the elements in the collection.
   * @param values the possible values of the elements in the collection.
   */
  constructor(identifiers: string[], values: string[]) {
    this.identifiers = identifiers;
    this.values = values;
  }

  /**
   * @returns the number of elements in the collection.
   */
  length(): number {
    return this.elements.length;
  }
}
