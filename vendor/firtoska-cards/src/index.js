import { Card, Deck, RANKS, SUITS } from './deck.js';
import Trick from './trick.js';
import Tricks from './tricks.js';

let cards = {
  RANKS,
  SUITS,
  Deck,
  Card,
  Trick,
  Tricks,
};

if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  // set variables for browser
  window.cards = cards;
}

export default cards;
