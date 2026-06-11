import { PlayElement } from '../play_elements/play_element';
import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This Action is used to represent an action where a player plays the game element.
 * This is useful for games that require players to play a card, coin, fruit or any other game piece.
 */
export class PlayElementAction extends Action {
  _type: ActionTypes = ActionTypes.PLAY;

  /**
   * The instance of the play element that is played.
   */
  playElement: PlayElement;

  /**
   * Creates an instance of the PlayElementAction class.
   * @param author the author of the action.
   * @param side the side of the game board.
   * @param element the play element that is played.
   */
  constructor(author: string, side: number, element: PlayElement) {
    super(author, side);
    this.playElement = element;
  }

  isValidAction(): boolean {
    return true;
  }
}
