import Trick from '../trick.js';

describe('Trick :Checking array prototype methods and user defined methods', () => {
  let trick = new Trick();
  test("new trick's first element should be undefined", () => expect(trick[0]).toBeUndefined());

  //Checking the play method
  test('Checking the Play Method', () => {
    const card1 = { player: 'user', card: { suit: 'S', rank: 'A' } };
    trick.play(card1);
    expect(trick[0]).toEqual(card1);
  });

  //Checking the array prototype method
  test('Checking the array push method', () => {
    const card2 = { player: 'user', card: { suit: 'S', rank: '2' } };
    trick.push(card2);
    expect(trick.length).toBe(2);
  });

  //Checking the flip set method
  test('Checking the flip', () => {
    expect(() => (trick.flipped = 'true')).toThrow(new TypeError('flip should be a boolean'));
    trick.flipped = true;
    expect(trick.flipped).toBeTruthy();
  });

  test('Checking the trump suit', () => {
    expect(trick.trumpSuit).toBe(undefined);

    // Set the trump suit
    trick.trumpSuit = 'S';
    expect(trick.trumpSuit).toBe('S');

    trick.trumpSuit = undefined;
    expect(trick.trumpSuit).toBe(undefined);
  });
});

describe('Trick: Checking the getValidCards method', () => {
  let trick = new Trick();
  let hand = [
    { suit: 'S', rank: 'K' },
    { suit: 'S', rank: 'Q' },
    { suit: 'D', rank: 'A' },
    { suit: 'C', rank: '6' },
    { suit: 'S', rank: '4' },
    { suit: 'S', rank: '2' },
  ];

  test('When the trick length is zero,it returns the hand itself', () =>
    expect(trick.getValidCards(hand)).toEqual(hand));

  test('When the hand has cards in the same suit. It returns only cards with same suit', () => {
    trick.play({ player: 'user', card: { suit: 'S', rank: 'A' } });
    expect(trick.getValidCards(hand)).toEqual([
      { suit: 'S', rank: 'K' },
      { suit: 'S', rank: 'Q' },
      { suit: 'S', rank: '4' },
      { suit: 'S', rank: '2' },
    ]);
  });

  test('When the hand dont have cards in the same suit. It returns the hand itself', () => {
    let hand = [
      { suit: 'H', rank: 'K' },
      { suit: 'H', rank: 'Q' },
      { suit: 'D', rank: 'A' },
      { suit: 'C', rank: '6' },
      { suit: 'C', rank: '4' },
      { suit: 'C', rank: '2' },
    ];
    expect(trick.getValidCards(hand)).toEqual(hand);
  });
});

describe('Checking the getTrickArray method', () => {
  let trick = new Trick();

  let trickArray = [];

  for (let i = 0; i < 4; i++) {
    let card = { player: 'user', card: { suit: 'S', rank: 'A' } };
    trick.play(card);
    trickArray.push(card);
  }
  test('basically it returns the trick array', () => {
    expect(trick.getTrickArray()).toEqual(trickArray);
  });
});
