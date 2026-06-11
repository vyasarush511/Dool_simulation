import { PlayElement } from './play_element';

/**
 * Possible suits of a card.
 */
export enum PlayingCardSuits {
  SPADES = 'S',
  HEARTS = 'H',
  DIAMONDS = 'D',
  CLUBS = 'C',
}

/**
 * Possible ranks of a card.
 */
export enum PlayingCardRanks {
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A',
}

/**
 * A class that represents a standard playing card.
 */
export class PlayingCard extends PlayElement {
  static TYPE: string = 'playing-card';
  _type: string = PlayingCard.TYPE;

  /**
   * Constructor for the PlayingCard class.
   * @param suit the suit of the playing card.
   * @param rank the rank of the playing card.
   */
  constructor(suit: PlayingCardSuits, rank: PlayingCardRanks) {
    super(suit, rank);
  }

  /**
   * Checks if the current is higher than the given card in the same suit.
   * @param card the given card;
   */
  isHigherThan(card: PlayingCard): boolean {
    if (!this.isSameSuit(card)) {
      throw new Error('Cards are not the same suit.');
    }
    return this.getComparableValue() > card.getComparableValue();
  }

  /**
   * Checks if the current card is the same suit as the given card.
   * @param card the given card.
   * @returns true if the suits are the same, false otherwise.
   */
  isSameSuit(card: PlayingCard): boolean {
    return this.identifier === card.identifier;
  }

  /**
   * Implementation of the abstract method to get the value of the card rank. Which is used to compare cards.
   * @returns the value of the card rank.
   */
  getComparableValue(): number {
    switch (this.value) {
      case PlayingCardRanks.TWO:
        return 2;
      case PlayingCardRanks.THREE:
        return 3;
      case PlayingCardRanks.FOUR:
        return 4;
      case PlayingCardRanks.FIVE:
        return 5;
      case PlayingCardRanks.SIX:
        return 6;
      case PlayingCardRanks.SEVEN:
        return 7;
      case PlayingCardRanks.EIGHT:
        return 8;
      case PlayingCardRanks.NINE:
        return 9;
      case PlayingCardRanks.TEN:
        return 10;
      case PlayingCardRanks.JACK:
        return 11;
      case PlayingCardRanks.QUEEN:
        return 12;
      case PlayingCardRanks.KING:
        return 13;
      case PlayingCardRanks.ACE:
        return 14;
      default:
        return NaN;
    }
  }
}
