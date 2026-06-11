import { Deck } from '../deck.js';
import Tricks from '../tricks.js';

describe('Creating tricks instance properties', () => {
  let deck = new Deck();
  let tricks = new Tricks(deck);
  test('tricks length should be zero', () => expect(tricks.length).toBe(0));

  test('Tricks: Checking the maxlength property', () => {
    expect(() => (tricks.maxCards = '5')).toThrow(new TypeError('maxCards should be number'));
    tricks.maxCards = 4;
    expect(tricks.maxCards).toBe(4);
  });

  test('Tricks: Checking the trump property', () => {
    expect(() => (tricks.trumpSuit = 'A')).toThrow(new TypeError('Trump should be valid'));
    tricks.trumpSuit = 'C';
    expect(tricks.trumpSuit).toBe('C');
  });

  test('Tricks: Checking the flip property', () => {
    expect(() => (tricks.flipped = 'true')).toThrow(new TypeError('flip should be a boolean'));
    tricks.flipped = true;
    expect(tricks.flipped).toBeTruthy();
  });
});

describe('Tricks: Checking the play', () => {
  let tricks = new Tricks();
  tricks.flipped = false;
  tricks.maxCards = 4;
  // When we call the play method for the first time it should create a trick obj and stores card and player
  let card = { player: 'user1', card: { rank: 'A', suit: 'S' } };
  test('Calling the play method first time', () => {
    expect(tricks.play(card)).toBeUndefined();
  });

  test('Checking the first element in tricks obj', () => {
    expect(tricks[0][0]).toEqual(card);
  });

  //Checking the flip of the trick
  test('checking the flip property of the trick', () => {
    expect(tricks[0].flipped).not.toBeTruthy();
  });

  test('Checking the length of tricks', () => {
    tricks.play({ player: 'user2', card: { rank: '2', suit: 'S' } });
    tricks.play({ player: 'user3', card: { rank: '7', suit: 'S' } });
    tricks.play({ player: 'user4', card: { rank: 'J', suit: 'S' } });
    expect(tricks[0].length).toBe(4);
  });

  test('Checking the tricks length after completing a trick', () => {
    tricks.play({ player: 'user1', card: { rank: 'K', suit: 'S' } });
    expect(tricks.length).toBe(2);

    //Checking the first card of second trick
    expect(tricks[1][0]).toEqual({ player: 'user1', card: { rank: 'K', suit: 'S' } });
  });
});

describe('Tricks: Checking the getWinningCard method', () => {
  let deck = new Deck();
  let tricks = new Tricks(deck);
  tricks.maxCards = 4;

  test('getWinningCard when the length of trick is zero', () =>
    expect(tricks.getWinningCard()).toBeUndefined());

  test('getWinningCard before flip', () => {
    tricks.play({ player: 'user1', card: { rank: '2', suit: 'S' } });
    tricks.play({ player: 'user2', card: { rank: '7', suit: 'S' } });
    tricks.play({ player: 'user3', card: { rank: 'J', suit: 'S' } });
    tricks.play({ player: 'user4', card: { rank: 'A', suit: 'S' } });

    expect(tricks.getWinningCard()).toEqual({
      player: 'user4',
      card: { rank: 'A', suit: 'S' },
    });
  });

  test('getWinningCard after flip', () => {
    tricks.play({ player: 'user4', card: { rank: 'A', suit: 'C' } });
    tricks.play({ player: 'user1', card: { rank: '2', suit: 'C' } });
    tricks.play({ player: 'user2', card: { rank: '7', suit: 'C' } });
    tricks.play({ player: 'user3', card: { rank: 'J', suit: 'C' } });

    tricks.flip();
    expect(tricks.getWinningCard()).toEqual({ player: 'user1', card: { rank: '2', suit: 'C' } });
  });

  test('getWinningCard of earlier trick after current trick is flipped', () => {
    expect(tricks.getWinningCard(1)).toEqual({
      player: 'user4',
      card: { rank: 'A', suit: 'S' },
    });
  });

  test('getWinningCard: trump : "S" and flip true', () => {
    tricks.trumpSuit = 'S';
    tricks.play({ player: 'user1', card: { rank: 'A', suit: 'D' } });
    tricks.play({ player: 'user2', card: { rank: 'J', suit: 'S' } });
    tricks.play({ player: 'user3', card: { rank: '10', suit: 'C' } });
    expect(tricks.play({ player: 'user4', card: { rank: 'K', suit: 'S' } })).toEqual({
      player: 'user2',
      card: { rank: 'J', suit: 'S' },
    });
  });

  test('when no one played the trump suit', () => {
    tricks.flip();
    tricks.play({ player: 'user1', card: { rank: 'J', suit: 'H' } });
    tricks.play({ player: 'user2', card: { rank: '10', suit: 'H' } });
    tricks.play({ player: 'user3', card: { rank: '10', suit: 'C' } });
    expect(tricks.play({ player: 'user4', card: { rank: 'K', suit: 'H' } })).toEqual({
      player: 'user4',
      card: { rank: 'K', suit: 'H' },
    });
  });

  test('getWinningCard', () => {
    let deck = new Deck(
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      ['B', 'G', 'R', 'Y', 'T']
    );

    let tricks = new Tricks(deck);
    tricks.maxCards = 3;
    tricks.maxLength.trump = 'T';

    tricks.play({ player: 0, card: { rank: '1', suit: 'B' } });
    tricks.play({ player: 0, card: { rank: '3', suit: 'B' } });
    tricks.play({ player: 0, card: { rank: '8', suit: 'B' } });

    expect(tricks.getWinningCard()).toEqual({
      player: 0,
      card: { rank: '8', suit: 'B' },
    });
  });
});

describe('Checking the getTricks Method', () => {
  let tricks = new Tricks();
  tricks.maxCards = 3;

  let tricksArray = [];
  for (let i = 0; i < 3; i++) {
    let trickArray = [];
    for (let j = 0; j < 3; j++) {
      let cardObj = { player: `user${j}`, card: { suit: 'S', rank: 'A' } };
      tricks.play(cardObj);
      trickArray.push(cardObj);
    }
    tricksArray.push(trickArray);
  }

  test('checking the tricks array', () => {
    expect(tricks.getTricksArray()).toEqual(tricksArray);
  });
});

describe('Checking the addTrick Method', () => {
  let tricks = new Tricks();

  test('checking if a trick is added', () => {
    expect(tricks.length).toBe(0);

    tricks.addTrick();
    expect(tricks.length).toBe(1);

    tricks.addTrick();
    expect(tricks.length).toBe(2);
  });

  test('checking the default flip value', () => {
    expect(tricks[0].flipped).toBeFalsy();
  });

  test('checking if the flip propagates to the next trick', () => {
    tricks.flip();
    expect(tricks[1].flipped).toBeTruthy();

    tricks.addTrick();
    expect(tricks.length).toBe(3);
    expect(tricks[2].flipped).toBeTruthy();
  });

  test('checking if we can flip back', () => {
    tricks.flip();
    expect(tricks[2].flipped).toBeFalsy();

    tricks.addTrick();
    expect(tricks[3].flipped).toBeFalsy();
  });

  test('checking if we can flip without affecting the current trick', () => {
    tricks.addTrick();
    expect(tricks[4].flipped).toBeFalsy();

    tricks.flip(false); // don't auto-update the current trick

    expect(tricks[4].flipped).toBeFalsy; // should still be the same

    tricks.addTrick();
    expect(tricks[5].flipped).toBeTruthy; // now it should have updated
  });

  test('checking the default trump value', () => {
    expect(tricks[5].trumpSuit).toBeUndefined();
  });

  test('checking if the trump propagates to the next trick', () => {
    tricks.trumpSuit = 'S';
    expect(tricks[5].trumpSuit).toBeUndefined();

    tricks.addTrick();
    expect(tricks[6].trumpSuit).toBe('S');
  });
});

describe('Loading an array', () => {
  let tricks = new Tricks();

  test('loading a basic array', () => {
    expect(tricks.length).toBe(0);

    tricks.loadArray([
      [
        { player: 0, card: { suit: 'S', rank: 'A' } },
        { player: 1, card: { suit: 'S', rank: '9' } },
        { player: 2, card: { suit: 'S', rank: '2' } },
      ],
      [
        { player: 0, card: { suit: 'C', rank: 'J' } },
        { player: 1, card: { suit: 'C', rank: 'K' } },
        { player: 2, card: { suit: 'H', rank: 'K' } },
      ],
      [
        { player: 1, card: { suit: 'H', rank: '9' } },
        { player: 2, card: { suit: 'H', rank: '4' } },
        { player: 0, card: { suit: 'H', rank: '6' } },
      ],
    ]);

    expect(tricks.length).toBe(3);
    expect(tricks.every(trick => trick.length == 3)).toBeTruthy();

    expect(tricks[0][0].player).toBe(0);
    expect(tricks[0][0].card.suit).toBe('S');
    expect(tricks[0][0].card.rank).toBe('A');

    expect(tricks[1][1].player).toBe(1);
    expect(tricks[1][1].card.suit).toBe('C');
    expect(tricks[1][1].card.rank).toBe('K');

    expect(tricks[2][2].player).toBe(0);
    expect(tricks[2][2].card.suit).toBe('H');
    expect(tricks[2][2].card.rank).toBe('6');
  });
});
