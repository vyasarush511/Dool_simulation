import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This enum represents all of the possible behaviors of a flip action.
 */
export enum FlipType {
  /**
   * This means that the flip should take place now.
   */
  NOW = 'now',
  /**
   * This means that the flip should take place on the next trick.
   */
  NEXT = 'next',
}

/**
 * This action represents that a flip has taken place in the game.
 * A flip is when a player decides to flip the logic of comparing the play elements. e.g. Ace is now the lowest card.
 */
export class FlipAction extends Action {
  _type: ActionTypes = ActionTypes.FLIP;

  /**
   * This determines when the flip needs to take place,
   * For example, if now=true then it will flip the current trick,
   * otherwise will flip the next one.
   */
  type: FlipType;

  /**
   * Creates a new flip action.
   * @param author the author of the action.
   * @param side the side of the author who is taking the action.
   * @param type the type of flip that is taking place.
   */
  constructor(author: string, side: number, type: FlipType) {
    super(author, side);
    this.type = type;
  }

  isValidAction(): boolean {
    return true;
  }
}
