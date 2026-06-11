import cards from '@firtoska/cards'
import Firtoska from '@firtoska/logic'

export default function Dool(data) {

  // Inherit behaviors and functions from Firtoska
  Firtoska.apply(this)

  // A data object (could be a datastore or
  // just a vanilla object
  this.data = data

  /*
   * Deal Cards
   * 
   * This function returns cards to all the players
   * based on the player count.
   * (eg) : if the player count is 4 , we are returning
   * 13 cards per hand
   */
  this.dealCards = () => {
    let playerCount = this.data.players.length
    let handsAndRemaining
    let deck

    let ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

    switch (playerCount) {
      case (1):
        break

      case (2): {
        // for two player game remove
        // all the 2,3,4,5,6 ranks from deck
        ranks.splice(0, 5)
        deck = new cards.Deck(ranks)

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(2, 12)
        break
      }

      case (3): {
        // for three player game remove
        // all the 2,3,4,5 ranks from deck
        ranks.splice(0, 4)
        deck = new cards.Deck(ranks)

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(3, 12)
        break
      }

      case (4): {
        deck = new cards.Deck()

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(4, 13)
        break
      }

      case (5): {
        // for five player game remove '2S' and '2C'
        deck = new cards.Deck()
        // remove the club 2
        deck.cards.splice(39, 1)

        // remove the spade 2
        deck.cards.splice(0, 1)

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(5, 10)
        break
      }

      case (6): {
        // for six player game remove all the 2 rank from deck
        ranks.splice(0, 1)
        deck = new cards.Deck(ranks)

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(6, 8)
        break
      }

      default: {
        // for all other player counts deal the cards
        deck = new cards.Deck()

        //we are setting the data deck for later use
        this.data.deck = deck

        handsAndRemaining = deck.deal(playerCount)
        break
      }
    }

    return handsAndRemaining
  }

  /**
 * Is trick complete?
 *
 * Check if the current trick is full. We could have used the
 * Trick.maxLength setting for this, but we're using custom
 * behaviour because our maxLength may keep changing depending
 * on players leaving mid-game, etc.
 */
  this.isTrickComplete = (trickIndex = undefined) => {

    // Philosophical question: are non-existent tricks
    // ever complete?
    if (!this.data.tricks || this.data.tricks.length == 0) return false

    // If there's no trickIndex given, we work on the current trick
    if (trickIndex == undefined) {
      trickIndex = this.data.tricks.length - 1
    }

    // If the index is out of range, we return false (here
    // comes that philosophical question again!)
    if (trickIndex > this.data.tricks.length - 1) return false

    // Get the trick we want to work on
    let ourTrick = this.data.tricks[trickIndex].getCards()

    // Find the active players
    let activePlayers = this.getActivePlayers()

    // Make sure that every active player has played in this trick
    return activePlayers.every(p =>
      ourTrick.find(t => t.player == p.index))
  }

  /**
   * Get Turn
   *
   * This function inspects the game state and figures out
   * whose turn it is. There could be multiple players (eg.
   * in the case of bidding), so we return the result as an
   * array.
   */
  this.getTurn = () => {
    /**
     * It involves breaking down the logic of determining the current turn 
     * into smaller, more manageable parts or stages. Every game has various 
     * stage order - based on this order, the getTurn() will check its child
     * functions, based on their returning value - iterate the stages!
     */

    const stages = [this.isNullTurn, this.isSwapTurn, this.isEarlyExitTurn, this.isBiddingTurn, this.isLeadingTurn, this.isCardTurn, this.isScoreTurn];

    for (const stage of stages) {
      let turnValue = stage();

      if (turnValue == undefined) continue;
      else return turnValue
    }
  }

  /**
   * Children functions for getTurn
   */

  this.isNullTurn = () => {
    let turn = {
      type: null,
      players: []
    }

    // If there is no player data, it's nobody's turn
    if (!this.data?.players?.length) {
      return turn;
    }

    // From now on, we process only active players
    let activePlayers = this.getActivePlayers();

    // If there are no active players, or only one
    // player, then it's game over!
    if (!activePlayers.length) {
      return turn
    }

    // If there are no hands, we inspect the tricks
    // to figure out the status.
    if (
      activePlayers.every(p =>
        !p.hand || !p.hand.length)
    ) {
      // One possibility:
      if (!this.data.tricks.length) {

        // Either there are no tricks and the game
        // hasn't started yet...
        return turn
      }

      // If it's neither of those, it means the game is
      // actually in progress but we just can't see the
      // cards (eg. if we played out all our cards and are
      // waiting for our opponents to play cards that we
      // can't see). In this case, we don't return but
      // continue processing the logic...
    }
  }

  this.isSwapTurn = () => {
    let turn = {
      type: null,
      players: [],
    }

    // From now on, we process only active players
    let activePlayers = this.getActivePlayers();

    if (
      !activePlayers.every(p =>
        p.swap == true)
    ) {
      turn.type = 'swap'
      turn.players = (activePlayers
        .filter(p =>
          p.swap != true) // empty bids
        .map(p => p.index)) // return indexes

      return turn
    }
  }

  this.isBiddingTurn = () => {
    // If the bids aren't full, those who haven't
    // bid must do so
    let turn = {
      type: null,
      players: []
    }

    if (this.data.bids.length >= 0 && !this.hasPassed()) {
      turn.type = 'bid'

      // this is for setting dealer's turn
      if (this.data.bids.length == 0) {
        // when game starts, check for the dealer
        // if the dealer is already in a data then go for else
        // if not set a dealer to `0`, cuz whoever starts the table
        // sits in `0`th place in the array!.
        if (typeof this.data.dealer != "number") {
          this.data.dealer = 0
        } else {
          // get the dealer from dealers' array - based on the 
          // dealer's truthy value!
          this.data.dealer = this.data.dealer;
        }

        turn.players = [this.data.dealer]
      } else if (this.data.bids.length > 0) {

        // Case 1: Check for next bidding until `Pass`
        if (this.hasLastBid()) {
          // The next player can bid until the bid is complete
          const lastBid = this.data.bids[this.data.bids.length - 1];
          const nextPlayer = (+lastBid.player + 1) % 2;       // cuz, only `two` players takes place in `bidding`.
          turn.type = 'bid';
          turn.players = [nextPlayer];
          return turn;
        }
      }

      return turn
    }
  }

  this.isEarlyExitTurn = () => {
    // it can be either 4 `consecutive passes`
    // or the great `Fold`. In this scenario
    // setting the turn to `score`
    let turn = {
      type: null,
      players: []
    }

    // If the `fold` is true, then set the turn 
    // to `score` - show `scoreBoard`!
    if (this.data.fold) {
      turn.type = 'score'; // End of the game
      return turn;
    }

    // first check bids array has more than one element
    // then check for allPasses!
    if (this.data.bids.length > 0) {
      // Check for all passes to determine the end of the game
      const biddingPlayersLength = 2  // variable for 2 players

      // if two players passes consecutively, then move to the next game.
      // i.e., needs to end the game and show the score stage! 
      if (this.allPasses(biddingPlayersLength)) {
        turn.type = 'score'; // End of the game
        return turn;
      }
    }

    // Setting turn to claim, if tricks has 
    // claim in progress
    if (this.data.tricks && this.data.tricks.length > 0) {

      let trick = this.data.tricks[this.data.tricks.length - 1]

      if (this.data.tricks.isClaimGoingOn()) {
        if (trick.getClaim()) {
          let acceptedUser = trick.getClaim().acceptedBy[0]
          turn.players.push(acceptedUser)
        }

        turn.type = "claim"
        return turn
      }

      if (trick.getClaim()?.isClaimAccepted()) {
        turn.type = "score"
        return turn
      }
    }
  }

  this.isLeadingTurn = () => {
    let turn = {
      type: null,
      players: [],
    }

    if (this.data.leader == undefined && this.data.declarer != undefined) {
      turn.type = "leading"
      turn.players = [this.data.declarer]

      return turn;
    }
  }

  this.isCardTurn = () => {
    // If bids are complete but hands still have cards,
    // it must be time to take or play tricks.
    let turn = {
      type: null,
      players: [],
    }

    let activePlayers = this.getActivePlayers()

    if (
      activePlayers.every(p => !p.hand || !p.hand.length) && this.isTrickComplete()
    ) {
      return;
    }

    if (!activePlayers.every(p => p.hand?.length == 0)) {
      turn.type = 'take'

      // If it's the first card ever, the dealer starts
      if (
        !this.data.tricks?.length ||
        (
          this.data.tricks.length == 1 &&
          this.data.tricks[0].getCards().length == 0
        )
      ) {
        // If the dealer is not defined, the dealer
        // is 0 (that is, the first player).

        if (typeof this.data.dealer != "number") {
          this.data.dealer = 0;
        } else if (this.data.leader !== undefined) {
          turn.type = 'card'
          turn.players = [this.data.leader]
          return turn
        } else {
          // If the activeDealers array has some active
          // dealer then we have to get it from there.
          // Will return the index of the dealer.
          this.data.dealer = this.data.dealer
        }

        turn.type = 'card' // there's nothing to take!
        turn.players = [this.data.dealer]
        return turn
      }

      // If it's not the first card ever, we should
      // inspect the current trick to find out what's
      // going on
      let currentTrick = this.data.tricks[this.data.tricks.length - 1].getCards()

      // If this trick is full, the winner can choose to take
      if (
        activePlayers.every(p =>
          currentTrick.find(t =>
            t.player == p.index))
      ) {
        let thisWinner = (this.data.tricks
          .getWinningCard(this.data.tricks.length - 1 + 1) // 1-indexed
          .player)

        // Make sure it's an active player
        let nextPlayer = this.nextActivePlayer(thisWinner)

        turn.type = 'take'
        turn.players = [nextPlayer]
        return turn
      }

      // If it's the first card of another trick, then
      // the winner of the previous trick starts
      if (currentTrick.length == 0) {
        let previousWinner = (this.data.tricks
          .getWinningCard(this.data.tricks.length - 2 + 1) // 1-indexed
          .player)

        // Make sure it's an active player
        let nextPlayer = this.nextActivePlayer(previousWinner)

        turn.type = 'card'
        turn.players = [nextPlayer]
        return turn
      }

      // If it's not a first card at all, we have it easy:
      // just follow the person who played earlier
      let lastPlayer = currentTrick[currentTrick.length - 1].player

      let nextPlayer = this.nextActivePlayer(
        (lastPlayer + 1)
        % this.data.players.length
      )

      turn.type = 'card'
      turn.players = [nextPlayer]
      return turn
    }
  }

  this.isScoreTurn = () => {
    let turn = {
      type: null,
      players: [],
    }

    if (
      this.data.tricks.length >= 2
      && this.isTrickComplete(this.data.tricks.length - 1)
    ) {

      // ...or the penultimate trick is complete and
      // we have an empty trick at the end, which means
      // the trick's been taken and the game's over.
      //
      // (The empty trick at the end is to signify
      // the 'taken'ness)

      turn.type = 'score'
      return turn
    }
  }

  /**
   * get trick score
   * 
   * this function returns the score of all players
   * only completed tricks
   */

  this.trickScore = () => {
    let trickScores = [0, 0]; // Initialize an array for scores

    for (let i = 0; i < this.data.tricks.length; i++) {
      const trick = this.data.tricks[i];

      // Is the current trick complete?
      let skipLast = !this.isTrickComplete();

      // Skip the last trick if incomplete
      if (skipLast) {
        if (i >= this.data.tricks.length - 1) return trickScores;
      }

      // don't do empty tricks
      if (trick.length > 0) {
        if (this.isTrickComplete()) {
          // Get the winning card for the current trick
          const winningCard = this.data.tricks.getWinningCard(i + 1); // Adding 1 to index to simulate trick number

          // Determine the winner's team
          const winnerTeam = winningCard.player === 0 || winningCard.player === 2 ? 0 : 1;

          // Increment the trick count for the winning team
          trickScores[winnerTeam] += 1;
        }
      }
    }

    return trickScores;
  };

  /**
   * Calculate the dool score for a given deal
   * @param {*} declarer the declarer's index/side
   * @param {*} contractLevel the level of the contract between 1 and 6
   * @param {*} contractMultiplier the contract multiplier (e.g. '', 'X', 'XX')
   * @param {*} trickScores an array of the number of tricks taken by each side
   * @returns an array of the scores for each side
   */
  this._getDoolScoring = (declarer, contractLevel, contractMultiplier, trickScores) => {
    let doolScores = [0, 0]; // Initialize an array for scores
    const risk = contractMultiplier === "XX" ? 4 : contractMultiplier === "X" ? 2 : 1;
    // If the declarer's side has taken at least as many tricks as the contract level
    if (trickScores[declarer] >= contractLevel) {
      const baseScores = {
        1: 100,
        2: 200,
        3: 400,
      };
      // Calculate the initial score based on the level
      doolScores[declarer] = (baseScores[contractLevel] || 0) * risk;
    } else {
      // if the declarer's side has not taken enough tricks
      const downScore = 100 * (contractLevel - trickScores[declarer]);
      doolScores[(declarer + 1) % 2] = downScore * risk;
    }
    return doolScores;
  }

  /**
 *  getDealScore
 *
 *  this function returns the deal score of all players.
 *  dealscore is based on tricks they won and contract they made
 *  It is returning doolScore right - so it's name is `doolScore` :)
 */

  this.getDoolScore = (score=undefined) => {
    let contract = this.getContract()
    let finalScore = [0, 0]; // Initialize an array for scores

    // The tricks taken on each side (NS, EW)
    const tricksScorePerSide = score ? score : this.trickScore();

    if (this.data.handLength === 13) {
      // Bridge scoring if using full deck
      // use bridge scoring
      finalScore = this.getBridgeScoring(
        contract.suit,
        +contract.level,
        contract.redouble ? "XX" : contract.double ? "X" : "",
        +contract.declarer,
        tricksScorePerSide
      );
    } else if (this.data.handLength === 6) {
      // Dool scoring for 24/24 game

      finalScore = this._getDoolScoring(
        +contract.declarer,
        +contract.level,
        contract.redouble ? "XX" : contract.double ? "X" : "",
        tricksScorePerSide
      )
    }

    return finalScore;
  }

  /**
  * Is valid bid?
  *
  * Check if the given bid is valid. Note that this does not
  * check whether it is the right *time* to bid; it merely
  * checks that the bid contains any of these modifiers
  *     [`pass`, `level`, `double`, `redouble`].
  * Will return true if it is valid, false if it is not.
  */

  this.isValidBid = (bidType, level, suit) => {

    // suit order
    const SUIT_ORDER = ['C', 'D', 'H', 'S', 'NT'];

    if (bidType === 'pass') {
      // If the current bid is a pass, it's always valid
      return true;
    }

    if (bidType === 'double') {
      // If the current bid is a double, check if the last bid was a level bid
      return this.data.bids.length > 0 && this.data.bids[this.data.bids.length - 1].bidType === 'level';
    }

    if (bidType === 'redouble') {
      // If the current bid is a redouble, check if the last bid was a double
      return (
        this.data.bids.length > 0 &&
        this.data.bids[this.data.bids.length - 1].bidType === 'double'
      );
    }

    if (bidType === 'level') {
      // If the current bid is a level bid, it's valid if the last bid was a pass, double, redouble, or another level bid
      if (
        this.data.bids.length === 0 ||
        ['pass', 'double', 'redouble', 'level'].includes(
          this.data.bids[this.data.bids.length - 1].bidType
        )
      ) {
        const currentRank = +level;
        const currentSuit = suit;

        // Check if the rank is between 1 and 7, and the suit is a valid suit in the correct order
        if (
          currentRank >= 1 &&
          currentRank <= 7 &&
          SUIT_ORDER.includes(currentSuit)
        ) {
          // Calculate the highest bid made so far
          const highestBid = this.data.bids.reduce((maxBid, bid) => {
            if (bid.bidType === 'level') {
              const bidValue = +bid.level * 10 + SUIT_ORDER.indexOf(bid.suit);
              return bidValue > maxBid ? bidValue : maxBid;
            }
            return maxBid;
          }, 0);

          // If the current bid is higher than the highest bid, it's valid
          const currentBidValue = currentRank * 10 + SUIT_ORDER.indexOf(currentSuit);
          return currentBidValue > highestBid;
        }
      }
    }

    // If the current bid type is not recognized or does not meet the conditions, return false
    return false;

  }

  // calculate final contract (when bidding is over)
  this.getContract = () => {
    let finalContract = {
      level: null,
      suit: null,
      double: false,
      redouble: false,
      declarer: null,
    };

    // Iterate through bids in reverse order
    for (let i = this.data.bids.length - 1; i >= 0; i--) {
      let currentBid = this.data.bids[i];

      if (
        currentBid.bidType === 'level' &&
        (finalContract.level === null || currentBid.level > finalContract.level)
      ) {
        // Update the finalContract with level, suit, and declarer
        finalContract.level = currentBid.level;
        finalContract.suit = currentBid.suit;
        finalContract.declarer = currentBid.player;
        break;
      } else if (currentBid.bidType === 'double') {
        // Update double flag and set the lastBidWasDouble flag
        finalContract.double = true;
      } else if (currentBid.bidType === 'redouble') {
        // Update redouble flag and set the lastBidWasReDouble flag
        finalContract.redouble = true;
      }
    }

    // Clear 'all pass' contract
    if (finalContract.level === null || finalContract.suit === null) {
      finalContract = {};
    }

    return finalContract;
  }

  // Function to check if there are consecutive passes in bids array
  this.hasPassed = () => {

    // return if no bids?!
    if (this.data.bids.length < 0) return

    if (this.data.bids.length < 2) {
      return false; // Not enough bids for the condition
    }

    // lastMost bid in the bids array
    const lastBid = this.data.bids[this.data.bids.length - 1];
    // secondLastMost bid, to check its bidType is either of the one
    const secondToLastBid = this.data.bids[this.data.bids.length - 2];

    return lastBid.bidType === 'pass' && ['level', 'double', 'redouble'].includes(secondToLastBid.bidType);
  };

  // Function to check if all bids are passes
  this.allPasses = (numberOfPlayers) => {
    return this.data.bids.length === numberOfPlayers && this.data.bids.every((bid) => bid.bidType === 'pass');
  }

  // To check if the last bid includes specified bid types and the player
  this.hasLastBid = () => {
    const lastBidType = this.data.bids[this.data.bids.length - 1].bidType
    const lastPlayer = this.data.bids[this.data.bids.length - 1].player        // not needed, but check it anyway

    if (this.data.bids.length > 0) {
      return ['pass', 'level', 'double', 'redouble'].includes(lastBidType);
    }
  };

}
