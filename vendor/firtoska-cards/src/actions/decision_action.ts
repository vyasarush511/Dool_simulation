import { Action } from './action';

/**
 * This Action is used to represent an action that players need to make a decision on in the game.
 * This is useful for games that require multiple players to approve/reject an action before it can be executed.
 */
export abstract class DecisionAction extends Action {
  /**
   * State that stores if the decision state
   */
  decision: number;

  /**
   * Constructor for the ApprovalAction class.
   * @param author the author of the action.
   * @param side the side of the game board.
   * @param decision the state that represents the decision state
   */
  constructor(
    author: string,
    side: number,
    decision: number
  ) {
    super(author, side);
    this.decision = decision;
  }
}
