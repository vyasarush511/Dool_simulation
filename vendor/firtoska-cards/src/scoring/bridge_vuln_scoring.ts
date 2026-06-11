import { Scoring } from './scoring';

export class BridgeVulnerableScoring extends Scoring {
  /**
   * Contract suit is a string that represents the suit of the contract made by the declarer.
   */
  contractType: 'C' | 'D' | 'H' | 'S' | 'NT';
  /**
   * Contract level is a number that represents the level of the contract made by the declarer.
   */
  contractLevel: number;
  /**
   * Contract multiplier is a string that represents the multiplier of the contract made by the declarer.
   */
  contractMultiplier: '' | 'x' | 'xx';
  /**
   * Vulnerable is a boolean that represents if the declarer is vulnerable or not.
   */
  vulnerable: boolean;
  /**
   * Tricks made is a number that represents the number of tricks made by the declarer.
   */
  tricksMade: number;

  /**
   * Constructor for the BridgeVulnerableScoring class.
   * @param contractType the suit of the contract made by the declarer.
   * @param contractLevel the level of the contract made by the declarer.
   * @param contractMultiplier the multiplier of the contract made by the declarer.
   * @param vulnerable if the declarer is vulnerable or not.
   * @param tricksMade the number of tricks made by the declarer.
   */
  constructor(
    contractType: 'C' | 'D' | 'H' | 'S' | 'NT',
    contractLevel: number,
    contractMultiplier: '' | 'x' | 'xx',
    vulnerable: boolean,
    tricksMade: number
  ) {
    super();
    this.contractType = contractType;
    this.contractLevel = contractLevel;
    this.contractMultiplier = contractMultiplier;
    this.vulnerable = vulnerable;
    this.tricksMade = tricksMade;
  }

  calculateScore(): number {
    const score = 0;
    // TODO: Add bridge-scoring library to calculate the score and implement the logic here.

    return score;
  }
}
