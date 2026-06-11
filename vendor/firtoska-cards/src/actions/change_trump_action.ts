import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This enum represents all of the possible behaviors of a trump action.
 */
export enum TrumpType {
  /**
   * This means that the trump should take place now.
   */
  NOW = 'now',
  /**
   * This means that the trump should take place on the next trick.
   */
  NEXT = 'next',
}

/**
 * This action is used to represent a trump change in the game.
 */
export class ChangeTrumpAction extends Action {
  _type: ActionTypes = ActionTypes.CHANGE_TRUMP;

  /**
   * The trump value for the changing game play.
   * This can be the suit or no trump.
   */
  trumpIdentifier: string;

  /**
   * The trump value for the changing game play.
   * This can be the suit or no trump.
   */
  type: TrumpType | undefined;

  /**
   * Constructor for the BidWithTrumpAction class.
   * @param author the author of the action.
   * @param side the side of the author who is taking the action.
   * @param trump the trump value is going to change the game
   */
  constructor(author: string, side: number, trump: string, type?: TrumpType) {
    super(author, side);
    this.trumpIdentifier = trump;
    this.type = type;
  }

  isValidAction(): boolean {
    return true;
  }
}
