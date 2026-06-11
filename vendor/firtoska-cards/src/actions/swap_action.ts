import { PlayElement } from '../play_elements/play_element';
import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * The class to represent the swap details.
 */
export class SwapDetails {
  /**
   * The side from which the cards are swapped.
   */
  from: number;
  /**
   * The side to which the cards are swapped.
   */
  to: number;
  /**
   * The play element that are swapped.
   */
  playElements: PlayElement[];

  /**
   * Constructor for the SwapDetails class.
   * @param from the side from which the cards are swapped.
   * @param to the side to which the cards are swapped.
   * @param playElements the play element that are swapped.
   */
  constructor(from: number, to: number, playElements: PlayElement[]) {
    this.from = from;
    this.to = to;
    this.playElements = playElements;
  }
}

/**
 * A class to represent a swap action.
 */
export class SwapAction extends Action {
  _type: ActionTypes = ActionTypes.SWAP;

  /**
   * The details of the swap. If undefined then the author did not want to swap.
   */
  swapDetails: SwapDetails[] | undefined;

  /**
   * Constructor for the SwapAction class.
   * @param author the author of the action.
   * @param side the side of the game board.
   * @param swapDetails the details of the swap. If undefined then the author did not want to swap.
   */
  constructor(author: string, side: number, swapDetails?: SwapDetails[]) {
    super(author, side);
    this.swapDetails = swapDetails;
  }

  /**
   * Checks if the swap is valid.
   * @returns true if the swap is valid, false otherwise.
   */
  isValidAction(): boolean {
    return (
      this.swapDetails?.every(swapDetail => {
        return swapDetail.playElements.length !== 0;
      }) || true
    );
  }
}
