import { Card, Deck, RANKS, SUITS } from '../deck.js';

describe('Creating a Deck without specifying ranks and suits', () => {
  test('checking ranks', () => {
    let d = new Deck();
    expect(d.ranks).toEqual(RANKS);
  });

  test('checking suits', () => {
    let d = new Deck();
    expect(d.suits).toEqual(SUITS);
  });

  test('checking length of cards', () => {
    let d = new Deck();
    expect(d.cards.length).toBe(52);
  });

  test('setting and getting trump value', () => {
    let d = new Deck();
    d.trump = 'NT';
    expect(d.trump).toBe('NT');
  });

  test('card count specification', () => {
    let d = new Deck();
    const { hands, remaining } = d.deal(0, 0);
    expect(hands.length).toBe(0);
    expect(remaining.length).toBe(52);
  });

  test('Checking the cards limit to distribute in deck', () => {
    let d = new Deck();
    const { hands, remaining } = d.deal(3, 5);
    function arr() {
      let cardCount = 0;
      let no_of_cards = 5;
      for (let i = 1; i <= hands.length; i++) {
        for (let j = 1; j <= no_of_cards; j++) {
          cardCount++;
        }
      }
      return cardCount;
    }
    expect(arr()).toBe(15);
    expect(remaining.length).toBe(37);
  });

  test('Whether the cardCount meets the deckLimit', () => {
    let d = new Deck();
    expect(() => {
      d.deal(3, 50);
    }).toThrow();
  });

  test('Whether the deck has particular limit', () => {
    let d = new Deck();
    const { hands, remaining } = d.deal(2, 26);
    expect(hands.length).toBe(2);
    expect(remaining.length).toBe(0);
  });

  test('Whether the card count is automatically set', () => {
    let d = new Deck();
    const { hands, remaining } = d.deal(4);
    expect(hands.length).toBe(4);
    expect(hands[0].length).toBe(13);
    expect(remaining.length).toBe(0);
  });

  test('Check if the cards in the hand also be in the Remaining [] ', () => {
    let d = new Deck();
    const { hands, remaining } = d.deal(3, 10);
    function contain() {
      let flag = true;
      remaining.forEach(item => {
        hands.forEach(hand => {
          hand.forEach(card => {
            if (card.rank === item.rank && card.suit === item.suit) {
              flag = false;
            }
          });
        });
      });
      return flag;
    }
    expect(contain()).toBeTruthy();
  });

  test('checking the compare function', () => {
    let deck = new Deck(
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      ['B', 'G', 'R', 'Y', 'T']
    );

    let case1 = deck.compare({ rank: '1', suit: 'B' }, { rank: '3', suit: 'B' });
    expect(case1 > 0).toBeTruthy();

    let case2 = deck.compare({ rank: '2', suit: 'B' }, { rank: '3', suit: 'B' });
    expect(case2 > 0).toBeTruthy();
  });
});
