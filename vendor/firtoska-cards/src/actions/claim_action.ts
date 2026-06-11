import { ActionTypes } from './action_types';
import { DecisionAction } from './decision_action';

/**
 * This object represents the proposal for the claim action.
 * Where the key is the side and the value is the number of tricks claimed by that side.
 */
export interface ClaimProposal {
  /**
   * The side and the number of tricks claimed by that side.
   */
  [side: number]: number;
}

export enum ClaimActionDecision {
  ACCEPT = 1,
  REJECT = 0
}

/**
 * A class to represent a claim action.
 * This is used when a player/side decides to claim the remaining tricks.
 */
export class ClaimAction extends DecisionAction {
  _type: ActionTypes = ActionTypes.CLAIM;

  /**
   * The proposal proposed by the side.
   */
  proposal: ClaimProposal | undefined;

  /**
   * Constructor for the ClaimAction class.
   * @param author the author of the action.
   * @param side the side of the game board.
   * @param proposal the proposal proposed by the side.
   * @param decision If the proposal was accepted or rejected.
   */
  constructor(
    author: string,
    side: number,
    proposal: ClaimProposal | undefined,
    decision: ClaimActionDecision = ClaimActionDecision.ACCEPT,
  ) {
    super(author, side, decision);
    this.proposal = proposal;
  }

  isValidAction(): boolean {
    return this.proposal ? Object.keys(this.proposal).length > 0 : true;
  }
}
