/**
 * An abstract class that represent various physical game pieces.
 * This can be extended to create a card, coin, fruit or any other game piece that a player uses.
 */
export abstract class PlayElement {
  /**
   * This identifies the play element.
   */
  identifier: string;
  /**
   * This is the value assigned to the play element.
   */
  value: string;

  /**
   * A member to help identify the instance type of the class.
   */
  abstract _type: string;

  /**
   * Initializes the play element.
   * @param identifier the identifier of the play element.
   * @param value the value of the play element.
   */
  constructor(identifier: string, value: string) {
    this.identifier = identifier;
    this.value = value;
  }

  /**
   * A method to get the value of the play element that can be compared to other play elements.
   * @returns the value in number form.
   */
  abstract getComparableValue(): number;
}
