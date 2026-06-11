import { Action } from './action';
import { ActionTypes } from './action_types';

/**
 * This action is used to represent a doubling cube in the game.
 * The doubling cube is used to multiply the stakes of the game by 2 to the power of n where n is 0 -> maxValue.
 */
export class DoublingCubeAction extends Action {
  _type: ActionTypes = ActionTypes.DOUBLING_CUBE;

  /**
   * The value of the exponent of the doubling cube.
   */
  exponentValue: number;

  /**
   * The maximum value the exponent of the doubling cube can reach.
   */
  maxExponentValue: number;

  /**
   * Constructor for the DoublingCubeAction class.
   * @param author The author of the action.
   * @param side The side of the author who is taking the action.
   * @param currentValue The current value of the doubling cube.
   * @param maxValue The maximum value the doubling cube can reach.
   */
  constructor(author: string, side: number, currentValue: number, maxValue: number) {
    super(author, side);
    this.exponentValue = currentValue;
    this.maxExponentValue = maxValue;
  }

  /**
   * Doubles the value of the doubling cube.
   * @returns true if the value was doubled, false otherwise.
   */
  double(): boolean {
    if (this.exponentValue < this.maxExponentValue) {
      this.exponentValue++;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Gets the value to which the stakes should be multiplied.
   * @returns The multiplier of the doubling cube.
   */
  getMultiplier(): number {
    return Math.pow(2, this.exponentValue);
  }

  isValidAction(): boolean {
    return this.exponentValue <= this.maxExponentValue;
  }
}
