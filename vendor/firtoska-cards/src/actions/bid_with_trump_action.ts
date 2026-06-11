import { ActionTypes } from './action_types';
import { BidAction } from './bid_action';

/**
 * This action is used to represent a bid with a trump identifier in the game.
 */
export class BidWithTrumpAction extends BidAction {
  _type: ActionTypes = ActionTypes.BID_WITH_TRUMP;

  /**
   * The trump identifier for the bid.
   * This can be the suit or any other identifier.
   */
  trumpIdentifier: string | undefined;

  /**
   * Constructor for the BidWithTrumpAction class.
   * @param author the author of the action.
   * @param side the side of the author who is taking the action.
   * @param bidType the type of the bid.
   * @param value the value of the bid.
   * @param trumpIdentifier the trump identifier for the bid.
   */
  constructor(
    author: string,
    side: number,
    bidType?: string,
    value?: number,
    trumpIdentifier?: string
  ) {
    super(author, side, bidType, value);
    this.trumpIdentifier = trumpIdentifier;
  }

  isValidAction(): boolean {
    return super.isValidAction() && !!this.trumpIdentifier;
  }
}
