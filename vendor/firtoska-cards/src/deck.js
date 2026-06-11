import crypto_shuffle from 'crypto-shuffle';

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUITS = ['C', 'D', 'H', 'S'];

export function Deck(ranks, suits) {
  if (!ranks) this.ranks = [...RANKS];
  else this.ranks = ranks;

  if (!suits) this.suits = [...SUITS];
  else this.suits = suits;

  //packing a full deck of cards
  this.cards = [];

  for (let s of this.suits) {
    for (let r of this.ranks) {
      this.cards.push(new Card(s, r));
    }
  }

  // creating getter and setter for trump property
  this.trump = {
    set: value => {
      //if the value is other than {undefined, S, H, C, D} then throw an error or else save it to trump property
      if ([...this.suits, undefined].includes(value)) {
        this.trump = value;
      } else {
        throw new TypeError(`Invalid trump value: ${value}`);
      }
    },
    get: () => {
      return this.trump;
    },
  };

  // flip value is either true or false, other than that will propmts an error
  this.flip = {
    set: value => {
      if (value === true || value === false) {
        this.flip = value;
      } else {
        throw TypeError(`Invalid input value`);
      }
    },
    get: () => {
      return this.flip;
    },
  };

  this.getCard = card => {
    if (!card) return;

    let cardFound;
    this.cards.forEach((c, index) => {
      if (c.suit === card.suit && c.rank === card.rank) {
        this.cards.splice(index, 1);
        cardFound = card;
      }
    });

    return cardFound;
  };

  this.compare = (c1, c2) => {
    let s1 = this.suits.indexOf(c1.suit);
    let s2 = this.suits.indexOf(c2.suit);

    // return by suit value if different
    if (s1 != s2) {
      return s2 - s1;
    }

    // otherwise, suit must be same
    // compare by rank instead
    let r1 = this.ranks.indexOf(c1.rank);
    let r2 = this.ranks.indexOf(c2.rank);

    return r2 - r1;
  };

  // To deal the cards to each player hand
  this.deal = (no_of_players, cardCount = -1) => {
    // Automatically decide card count
    if (cardCount < 0) {
      cardCount = Math.floor(this.cards.length / no_of_players);
    }

    const hands = [];
    let deck = this.shuffle([...this.cards]);

    // Check whether the given card count is out of box
    if (this.cards.length < no_of_players * cardCount) {
      throw Error(`Not enough cards to deal in the deck`);
    }

    // First initialize an empty array
    let empty = [];
    for (let j = 0; j < no_of_players; j++) {
      for (let i = 0; i < cardCount; i++) {
        empty.push(deck.pop());
      }
      hands.splice(j, 0, empty);
      empty = [];
    }

    // Return array of hands and remaining
    return { hands, remaining: deck };
  };
}

// Used a crypto-shuffle module to shuffle the cards
Deck.prototype.shuffle = deck => {
  return crypto_shuffle(deck);
};

export function Card(suit, rank) {
  this.suit = suit.toUpperCase();
  this.rank = rank.toUpperCase();
}
