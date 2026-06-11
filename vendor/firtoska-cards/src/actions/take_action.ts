import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This action is used to represent a take in the game.
 * A take is issued by the system at the end of the trick to determine the winner of the trick.
 */
export class TakeAction extends Action {
  _type: ActionTypes = ActionTypes.TAKE;

  /**
   * The player who is taking the trick.
   */
  trickWinner: string;

  /**
   * The side of the player who is taking the trick.
   */
  trickWinnerSide: string;

  /**
   * The current trick number.
   */
  trickNumber: number;

  /**
   * Creates a Take action that is issued by the system at the end of the trick to determine the winner of the trick.
   * @param trickWinner The player who is taking the trick.
   * @param trickWinnerSide The side of the player who is taking the trick.
   * @param trickNumber The current trick number.
   */
  constructor(trickWinner: string, trickWinnerSide: string, trickNumber: number) {
    super(Action.AUTHOR_SYSTEM, Action.SIDE_SYSTEM);
    this.trickWinner = trickWinner;
    this.trickWinnerSide = trickWinnerSide;
    this.trickNumber = trickNumber;
  }

  isValidAction(): boolean {
    return true;
  }
}
