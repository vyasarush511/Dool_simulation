import { ActionTypes } from './action_types';

/**
 * A class to represent an action.
 * An action is when the user/player/system takes an action in the game.
 */
export abstract class Action {
  /**
   * Use this constant to represent the system as the author of the action.
   */
  static AUTHOR_SYSTEM: string = 'system';
  /**
   * Use this constant to represent the system as the side of the action since the system is not a player.
   */
  static SIDE_SYSTEM: number = -1;

  /**
   * Represents the author of the action.
   * This can be the jid, username, or any other unique identifier. If the system is the author, then use the constant `AUTHOR_SYSTEM`.
   */
  author: string;
  /**
   * Represents the side of the author who is taking the action.
   * This can be the side of the game board or player position or any other identifier. If the system is the author, then use the constant `SIDE_SYSTEM`.
   */
  side: number;
  /**
   * A member to help identify the instance type of the class.
   */
  abstract _type: ActionTypes;

  /**
   * Constructor for the Action class.
   * @param author the author of the action.
   * @param side the side of the game board.
   * @param type the type of the action.
   */
  constructor(author: string, side: number) {
    this.author = author;
    this.side = side;
  }

  abstract isValidAction(): boolean;
}
