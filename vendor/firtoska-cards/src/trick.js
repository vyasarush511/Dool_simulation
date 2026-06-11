import Claim from '../claim.js';

export default function Trick() {
  // private variables
  this._flipped = false;
  this._trumpSuit = undefined;

  // for flipping the tricks
  this.flip = function () {
    this.flipped = !this.flipped;
  };

  // Add old getters and setters for backward compatibility
  Object.defineProperty(this.flip, 'getFlip', {
    get: function () {
      console.warn(
        'Trick.flip.getFlip is deprecated. Please access Trick.flipped directly instead.'
      );
      return this.parent.flipped;
    },
  });

  Object.defineProperty(this.flip, 'setFlip', {
    set: function (value) {
      console.warn('Trick.flip.setFlip is deprecated. Please set Trick.flipped directly instead.');
      this.parent.flipped = value;
    },
  });

  this.flip.parent = this;

  this.play = ({ player, card }) => {
    this.push({ player, card });
  };

  this.getValidCards = hand => {
    // first check the length of the played Cards. If its 0 then return the hand
    if (this.getCards().length == 0) return hand;

    // Lets get the  suit of the played Card
    let suit = this.getCards()[0].card.suit;

    // If the player doesn't have the same suit, then return the hand
    if (hand.findIndex(card => card.suit === suit) == -1) return hand;

    // else return the cards with same suit
    return hand.filter(card => card.suit == suit);
  };

  this.getTrickArray = () => {
    let trick = [];
    for (let i = 0; i < this.length; i++) {
      trick.push(this[i]);
    }
    return trick;
  };

  this.addClaim = (proposal, accepted, rejected, participants) => {
    return new Claim(proposal, accepted, rejected, participants);
  };

  this.claim = () => {
    this.push({});
  };

  this.getCards = () => {
    return this.filter(element => element.card !== undefined);
  };

  this.getClaim = () => {
    for (let i = this.length - 1; i >= 0; i--) {
      if (this[i].proposal) {
        return this[i];
      }
    }
    return null;
  };
}
Object.setPrototypeOf(Trick.prototype, Array.prototype);

// Set custom getter and setter for flipped
Object.defineProperty(Trick.prototype, 'flipped', {
  set: function (value) {
    if (typeof value == 'boolean') this._flipped = value;
    else throw TypeError('flip should be a boolean');
  },
  get: function () {
    return this._flipped;
  },
});

// Set custom getter and setter for trumpSuit
Object.defineProperty(Trick.prototype, 'trumpSuit', {
  set: function (value) {
    // TODO: validate on suits somehow (with undefined as "no trump")
    this._trumpSuit = value;
  },
  get: function () {
    return this._trumpSuit;
  },
});
