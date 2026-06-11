import { Deck } from './deck.js';
import Trick from './trick.js';

function Tricks(deck) {
  if (deck) {
    this.deck = deck;
  } else {
    this.deck = new Deck();
  }

  // Private properties. We will define getters and
  // setters for these later.
  this._flipped = false;
  this._trump = undefined;
  this._maxCards = Infinity;

  // for flipping the tricks
  // 'now' means we flip the current trick as well
  this.flip = function (now = true) {
    this.flipped = !this.flipped

    // Flip the current trick too, if it exists
    if (now && this.length) {
      this[this.length - 1].flipped = this.flipped
    }

    return this.flipped;
  };

  Object.defineProperty(this.flip, 'getFlip', {
    get: function () {
      console.warn('Tricks.flip.getFlip is deprecated. Please access Tricks.flipped directly instead.')
      return this.parent.flipped
    }
  })

  Object.defineProperty(this.flip, 'setFlip', {
    set: function (value) {
      console.warn('Tricks.flip.setFlip is deprecated. Please set Tricks.flipped directly instead.')
      this.parent.flipped = value
    }
  })

  this.flip.parent = this;

  // for adding the new trick into tricks
  this.addTrick = () => {
    let trick = new Trick();

    // propagate flips
    if (this.flipped) trick.flipped = this.flipped;
    else trick.flipped = false;

    // propagate trumps
    if (this.trumpSuit) trick.trumpSuit = this.trumpSuit;

    this.push(trick);
  };

  this.play = ({ player, card }) => {
    let length = this.length;

    // if the length of the tricks is zero or
    // the length of lastly added trick is equals to the player count
    // we are adding new Trick to the tricks array
    if (length == 0 || this[length - 1].length == this.maxCards) {
      this.addTrick();
      //updating the length
      length = this.length;
    }

    this[length - 1].play({ player, card });

    if (this[length - 1].length == this.maxCards) return this.getWinningCard();

    return;
  };

  this.undo = () => {
    if (this.length < 0) return;
    if (this[this.length - 1].getCards().length > 0) return this[this.length - 1].splice(-2, 1);
    else return this[this.length - 2].pop();
  };

  this.getValidCards = hand => {
    if (this.length > 0) return this[this.length - 1].getValidCards(hand);
    else return hand;
  };

  this.getWinningCard = trickNumber => {
    //(eg) trickNumber = 1 means first trick
    if (this.length == 0) return;

    let suit;
    let trick;
    let flipped;

    /**
     * Tricks is an array of array. Inside each
     * trick it will have various objects like
     * `card`, `claim` and the other properties.
     * 
     * When calculating winningCard, we need to consider
     * only the object which has the key `card` or `player`.
     * So call getCards function to filter out `cards`
     */

    if (
      trickNumber &&
      trickNumber <= this.length &&
      this[trickNumber - 1].getCards().length > 0
    ) {
      suit = this[trickNumber - 1].getCards()[0].card.suit;
      trick = this[trickNumber - 1].getCards();
      flipped = this[trickNumber - 1].flipped;
    } else if (this[this.length - 1].length !== this.maxCards) {
      suit = this[this.length - 2].getCards()[0].card.suit;
      trick = this[this.length - 2].getCards();
      flipped = this[this.length - 2].flipped;
    } else {
      suit = this[this.length - 1].getCards()[0].card.suit;
      trick = this[this.length - 1].getCards();
      flipped = this[this.length - 1].flipped;
    }

    if (this.trumpSuit !== undefined) {
      let trumpCards = trick.filter((x) => x.card.suit == this.trumpSuit);
      if (trumpCards.length == 1) {
        return trumpCards[0];
      }
      if (trumpCards.length > 0) {
        trumpCards.sort((card1, card2) => this.deck.compare(card1.card, card2.card));

        if (flipped) {
          return trumpCards[trumpCards.length - 1];
        } else return trumpCards[0];
      }
    }

    let sameSuit = trick.filter(x => x.card.suit == suit);

    if (sameSuit.length == 1) {
      return trick[0];
    }

    sameSuit.sort((card1, card2) => this.deck.compare(card1.card, card2.card));
    if (flipped) {
      return sameSuit[sameSuit.length - 1];
    } else return sameSuit[0];
  };

  this.getTricksArray = () => {
    let tricks = [];
    for (let i = 0; i < this.length; i++) {
      tricks.push(this[i].getTrickArray());
    }
    return tricks;
  };

  this.claim = () => {
    this[this.length - 1].claim()
  }

  //Making the trick from array
  this.loadArray = tricks => {
    if (tricks === undefined || tricks.length === 0) return;

    tricks.forEach(trick => {
      this.addTrick();

      trick.forEach((card) => {
        if (card.player == undefined) {
          this.claim()
        } else {
          this.play(card);
        }
      });
    });
  };

  // Add deprecation warnings for old properties

  this.trump = {
    set setTrump(value) {
      console.warn(
        'Tricks.trump.setTrump is deprecated. Please set the value of Tricks.trumpSuit directly instead.'
      );
      this.parent.trumpSuit = value;
    },
    get getTrump() {
      console.warn('Tricks.trump.getTrump is deprecated. Please access Tricks.trumpSuit directly instead.')
      return this.parent.trumpSuit
    },
  };
  this.trump.parent = this;

  this.maxLength = {
    set setMaxLength(value) {
      console.warn(
        'Tricks.maxLength.setMaxLength is deprecated. Please set Tricks.maxCards directly instead.'
      );
      this.parent.maxCards = value;
    },
    get getMaxLength() {
      console.warn(
        'Tricks.maxLength.getMaxLength is deprecated. Please access Tricks.maxCards directly instead.'
      );
      return this.parent.maxCards;
    },
  }
  this.maxLength.parent = this

  this.isClaimGoingOn = () => {
    let trick = this[this.length - 1];

    if (!trick.getClaim()) {
      return false
    } else {
      if (trick.getClaim() && trick.getClaim().isClaimGoingOn()) {
        return true
      } else {
        return false
      }
    }
  }
}

Object.setPrototypeOf(Tricks.prototype, Array.prototype);

// Set custom getters and setters

// Flip
Object.defineProperty(Tricks.prototype, 'flipped', {
  set: function (value) {
    if (typeof value == "boolean") this._flipped = value;
    else throw TypeError("flip should be a boolean");
  },
  get: function () {
    return this._flipped;
  },
});

// Trump suit
Object.defineProperty(Tricks.prototype, 'trumpSuit', {
  set: function (value) {
    if ([...this.deck.suits, undefined].indexOf(value) != -1) this._trump = value;
    else throw TypeError("Trump should be valid");
  },
  get: function (value) {
    return this._trump;
  },
});

// Max cards per trick
Object.defineProperty(Tricks.prototype, 'maxCards', {
  set: function (value) {
    if (typeof value === "number") this._maxCards = value;
    else throw TypeError("maxCards should be number");
  },
  get: function (value) {
    return this._maxCards;
  },
});

export default Tricks;
