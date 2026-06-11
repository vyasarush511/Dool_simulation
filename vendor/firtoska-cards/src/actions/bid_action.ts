import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This action is used to represent a simple bid in the game.
 */
export class BidAction extends Action {
  _type: ActionTypes = ActionTypes.BID;

  /**
   * This determines what type of bid is being made. This changes based on the game.
   * For example, in Bridge, this could be `pass`, `double`, `redouble`, `level`, etc.
   */
  bidType: string | undefined;
  /**
   * This determines the value of the bid. This changes based on the game.
   * For example, in Bridge, this could be the level of the bid like 1, 2, 3, etc.
   */
  value: number | undefined;

  /**
   * Creates a new bid action.
   * @param author the author of the action.
   * @param side the side of the author who is taking the action.
   * @param bidType the type of the bid.
   * @param value the value of the bid.
   */
  constructor(author: string, side: number, bidType?: string, value?: number) {
    super(author, side);
    this.bidType = bidType;
    this.value = value;
  }

  /**
   * Checks if the bid is valid.
   * @returns true if the bid is valid, false otherwise.
   */
  isValidAction(): boolean {
    return !!this.bidType || !!this.value;
  }
}
