import cards from '@firtoska/cards'
import scorer from "bridge-scorer";

export default function Firtoska(data) {

  // A data object (could be a datastore or
  // just a vanilla object
  this.data = data

  // TODO: You can override this stages array. 
  // `this.stages` should be initialized in the logic module of
  //  the every particular game, like `dool-logic`, `faeko-logic`.

  // Order of the stages for `firtoska`
  // this.stages = [this.isNullTurn, this.isBiddingTurn, this.isCardTurn, this.isScoreTurn];

  this.startGame = (gameID, hands, trump = undefined) => {

    // Set the game ID
    this.gameID = gameID

    // Decide deck based on player count
    this.deck = new cards.Deck()
    this.deck.trump = trump

    // Initialise tricks
    this.data.tricks = new cards.Tricks(this.deck)
    this.data.tricks.maxLength = hands.length

    // Deal out the cards
    this.data.hands = hands.map(c => deck.getcard(c))

    // Reset the bids
    this.data.bids = hands.map(_ => null)
  }

  /**
   * A Band aid to help increment the deal number when the game starts
   * as this.startGame() is not being used.
   */
  this.incrementDealNumber = () => {
    if(this.data && this.data.dealNumber === undefined) {
      this.data.dealNumber = 0;
    } else if(this.data && this.data.dealNumber !== undefined) {
      // Increment the deal number
      this.data.dealNumber += 1;
    }
  };

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
        // for four player game deal all the 52 cards
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
   * Get Active Players
   *
   * This function returns all the active players
   * (i.e. those who haven't left the game). An
   * "index" field is added so that you know the
   * original position of the player in the list.
   */
  this.getActivePlayers = () => {
    return this.data.players
      .map((p, i) => ({ ...p, index: i }))
      .filter((p) => !p.inactive);
  };

  /**
   * Next Active Player
   *
   * If the given player has left, this function
   * returns the next player on the list (looping
   * around if necessary). If the given player is
   * active, there is no need for this so it just
   * returns the given player.
   */
  this.nextActivePlayer = (player) => {
    if (this.data.players[player].inactive) {

      let activePlayers = this.getActivePlayers()

      let nextPlayer = activePlayers.find(p =>
        p.index >= player)

      // Loop around if necessary
      if (!nextPlayer) {
        nextPlayer = activePlayers[0]
      }

      return nextPlayer.index
    }

    return player
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

    const stages = [this.isNullTurn, this.isBiddingTurn, this.isCardTurn, this.isScoreTurn];

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

    // If there is no dealer data, it's nobody's turn
    if (!this.data?.dealers?.length) {
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

  this.isBiddingTurn = () => {
    // If the bids aren't full, those who haven't
    // bid must do so
    let turn = {
      type: null,
      players: []
    }

    let activePlayers = this.getActivePlayers()

    if (
      !activePlayers.every(p =>
        typeof (p.bid) == 'number' ||
        p.bid == true)
    ) {
      turn.type = 'bid'
      turn.players = (activePlayers
        .filter(p =>
          typeof (p.bid) != 'number' && p.bid != true) // empty bids
        .map(p => p.index)) // return indexes

      return turn
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
          this.data.tricks[0].length == 0
        )
      ) {
        // If the dealer is not defined, the dealer
        // is 0 (that is, the first player).

        if (typeof this.data.dealer != "number") {
          this.data.dealer = 0;
        } else {
          // if the `dealer` is already there,
          // then set it for dealer! 
          this.data.dealer = this.data.dealer
        }

        turn.type = 'card' // there's nothing to take!
        turn.players = [this.data.dealer]
        return turn
      }

      // If it's not the first card ever, we should
      // inspect the current trick to find out what's
      // going on
      let currentTrick = this.data.tricks[this.data.tricks.length - 1]

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
   * Is valid bid?
   *
   * Check if the given bid is valid. Note that this does not
   * check whether it is the right *time* to bid; it merely
   * checks that the bid is not to high or too low, based on
   * the number of cards the player currently has. (A valid
   * bid means one that is between zero and the maximum
   * number of cards, both inclusive).
   */
  this.isValidBid = (bid, player = -1) => {

    // First things first: it should be a number
    if (typeof (bid) != 'number') return false

    // Next things next: it should be an actual number
    if (isNaN(bid)) return false

    // Check the maximum allowed value. We do this by counting
    // the number of cards the given player has in their hand.
    // If no player is specified, we count the hands of all the
    // players and select the maximum value
    let maxAllowed = this.data.players[player]?.hand?.length
    if (!maxAllowed) {
      maxAllowed = Math.max(...this.data.players.map(p =>
        p.hand?.length || 0))
    }

    return 0 <= bid && bid <= maxAllowed
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
    let ourTrick = this.data.tricks[trickIndex]

    // Find the active players
    let activePlayers = this.getActivePlayers()

    // Make sure that every active player has played in this trick
    return activePlayers.every(p =>
      ourTrick.find(t => t.player == p.index))
  }

  /**
   * Play a card
   *
   * This function removes the given card from the user's hand
   * and plays it out into the tricks.
   */
  this.play = (player, card, requirePop = true) => {

    // Check the player
    if (
      typeof (player) != 'number' ||
      player < 0 ||
      player > (this.data.players.length - 1)
    ) {
      throw `Player must be between 0 and ${this.data.players.length - 1}! We got: ${player}`
    }

    // Check the card
    if (
      [card.suit, card.rank].some(p =>
        typeof (p) == 'undefined')
    ) {
      throw `Card ${card} doesn't have a proper suit and rank!`
    }

    // Check if we have that hand
    if (!this.data.players[player]?.hand) {

      // We don't!
      if (requirePop) {
        throw `Could not find a hand for player ${player}!`
      }
    } else {

      // Locate the card
      let cardIndex = this.data
        .players[player]
        .hand
        .findIndex(c =>
          c.suit == card.suit && c.rank == card.rank)

      if (cardIndex < 0) {
        throw `Player ${player} does not have card ${card.rank} of ${card.suit}!`
      }

      // Remove the card from the hand...
      this.data.players[player].hand.splice(cardIndex, 1)
    }

    // Either way, we process the trick

    // Add the next trick if the current one is full
    if (this.isTrickComplete()) {
      this.data.tricks.addTrick()
    }

    // Now actually place the card!
    this.data.tricks.play({
      player: player,
      card: {
        suit: card.suit,
        rank: card.rank,
      }
    })

    // And that's it; we're done ;)
    return
  }


  /**
   * Take a trick
   *
   * This function is a "safe" way to move on to the next trick.
   * It marks a trick as "taken" by adding the next trick to the
   * array - but before that, it makes sure that the current trick
   * is complete and also that the given player is indeed the
   * winner of the current trick.
   */
  this.take = (player) => {
    if (!this.isTrickComplete()) throw 'Only completed tricks can be taken!'

    let winner = this
      .data
      .tricks
      .getWinningCard(this.data.tricks.length) // it's 1-indexed
      .player
    if (winner != player) throw 'Only the winner can take a trick!'

    // Actually add a trick to signify that the current one has been
    // taken
    this.data.tricks.addTrick()
  }

  /**
   * get trick score
   * 
   * this function returns the score of all players
   * only completed tricks
   */
  this.getTrickScore = () => {
    // create a initial score array
    let scores = this.data.players.map(_ => 0)

    if (this.data.tricks.length > 0) {
      // Is the current trick complete?
      let skipLast = !this.isTrickComplete()

      this.data.tricks.forEach((_, i) => {
        // Skip the last trick if incomplete
        if (skipLast) {
          if (i >= this.data.tricks.length - 1) return
        }

        // Find the winning card
        let winner = this.data.tricks.getWinningCard(i + 1) // 1-indexed

        // Increment the winner's score
        scores[winner.player] += 1
      })
    }

    return scores
  }

  /**
   *  getDealScore
   *
   *  this function returns the deal score of all players.
   *  dealscore is based on tricks they won and bid they made
   *
   */
  this.getDealScore = () => {
    // first findout how many players in the game including the inactive players
    let playerCount = this.data.players.length

    // get the trick score
    let trickScore = this.getTrickScore()

    let lastTrick = this.data.tricks[this.data.tricks.length - 1].getTrickArray()

    // find players who played the last trick.
    // because we are calculating score only for players who played the last trick
    let playersPlayed = new Map(lastTrick.map(t => [t.player, true]));

    // find the players who made the contract bid
    let playersWon = trickScore.map((s, i) => {
      if (s == this.data.players[i].bid) return true
      else return false
    })

    let dealScore = Array(playerCount).fill(0)
    // if no one is made the contract means return score of zero
    if (playersWon.every(f => !f)) return dealScore

    /**
     *  calculate the offset score
     *
     *  dealScore is based on players who didn't made the contract
     *  for example in four player , if two player made the contract
     *  another two didn't made. so players who made contract get points
     *  from those didn't made which is based on bid difference.
     *  bid difference is diff between what they bid and what they got.
     */

    let initialScore = 0
    let totalScore = playersWon.reduce((accumulator, currentValue, index) => {
      //only if they played the last trick
      if (!currentValue && playersPlayed.get(index)) {
        //difference between bid they made and tricks they got
        let bidDiff = Math.abs(
          Number(trickScore[index]) - Number(this.data.players[index].bid)
        )

        return accumulator + (bidDiff * (bidDiff + 1)) / 2
      } else {
        return accumulator
      }
    }, initialScore)

    //if totalscore is zero means everyone made the contract except the disconnected players . so winners get bonus of 5
    if (totalScore == 0) {
      dealScore.forEach((_, i) => {
        if (playersPlayed.get(i)) {
          dealScore[i] = 5;
        }
      });
    }

    //change the score players who made the contract
    if (totalScore) {
      playersWon.forEach((flag, i) => {
        if (flag && playersPlayed.get(i)) dealScore.splice(i, 1, totalScore);
      });
    }

    //finally return the dealscore
    return dealScore
  }

  /**
   * Calculates the score based on bridge rules.
   * @param {*} contractType This must be one of ['NT', 'S', 'H', 'D', 'C']
   * @param {*} contractLevel This must be between 1-7
   * @param {*} contractMultiplier This must be one of ['', 'X', 'XX']
   * @param {*} declarerSide This is a number between 0-3 indicating the declarer's side.
   * or a negative number indicating the number of tricks down on the contract.
   * @param {*} trickScore An object with keys 0-3 and values indicating the number of tricks taken by each side.
   * @returns The scores for each side.
   */
  this.getBridgeScoring = (
    contractType,
    contractLevel,
    contractMultiplier,
    declarerSide,
    trickScore,
  ) => {
    const vulnerability = this.getVulnerability(this.data.dealNumber);
    const isVul = vulnerability.includes(declarerSide);
    const tricksMade = trickScore[declarerSide];
    const contract = {
      level: contractLevel,
      denomination: contractType,
      risk: contractMultiplier.toUpperCase(), //convert to uppercase, just in case it's not
    };
    const score = scorer.contractTricks(contract, isVul, tricksMade);

    // Based on the score, we can determine the scores for each side.
    const scores = [0,0]
    if(score < 0) {
      // If the score is negative, the declarer's opponents get the absolute value of the score.
      scores[(declarerSide + 1) % 2] = Math.abs(score)
    } else {
      // If the score is positive, the declarer's side gets the score.
      scores[declarerSide] = score
    }
    console.log(
      "===========================BRIDGE SCORING===========================",
      {
        dealNo: this.data.dealNumber,
        declarerSide,
        contract,
        isVul,
        vulnerability,
        trickScore,
        tricksMade,
        score,
        scores
      }
    );
    return scores;
  };

  /**
   * Gets the vulnerability for a given deal number.
   * @returns an array of sides that are vulnerable.
   */
  this.getVulnerability = (dealNo) => {
    const cycle = (dealNo % 16) +1;
    switch (cycle) {
      case 1:
      case 8:
      case 11:
      case 14:
          return []; // No team is vulnerable
      case 2:
      case 5:
      case 12:
      case 15:
          return [0, 2]; // Assuming indices 0 and 2 represent South and North respectively
      case 3:
      case 6:
      case 9:
      case 16:
          return [1, 3]; // Assuming indices 1 and 3 represent West and East respectively
      case 4:
      case 7:
      case 10:
      case 13:
          return [0, 1, 2, 3]; // All teams are vulnerable
      default:
          return []; // Fallback, although this line is theoretically unreachable
    }
  };
}
