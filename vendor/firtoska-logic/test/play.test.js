import cards from '@firtoska/cards'
import Faeko from '../index.js'


describe("Playing a card when we know all hands", () => {
  // Some test data
  let players = JSON.stringify([
    {
      bid: 3,
      hand: [
        { suit: 'C', rank: 'J'},
        { suit: 'C', rank: '3'},
        { suit: 'D', rank: 'Q'},
        { suit: 'H', rank: '9'},
        { suit: 'S', rank: 'J'},
      ],
    },
    {
      bid: 4,
      hand: [
        { suit: 'C', rank: '7'},
        { suit: 'D', rank: 'A'},
        { suit: 'H', rank: 'Q'},
        { suit: 'H', rank: 'J'},
        { suit: 'H', rank: '2'},
      ],
    },
    {
      bid: 3,
      hand: [
        { suit: 'D', rank: 'A'},
        { suit: 'D', rank: '4'},
        { suit: 'H', rank: 'A'},
        { suit: 'H', rank: '3'},
        { suit: 'S', rank: '8'},
      ],
    },
  ])

  test("card gets moved from single hand", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Play a card!
    faeko.play(0, {suit: 'C', rank: 'J'})

    expect(faeko.data.players[0].hand.length).toBe(4)
    expect(
      faeko.data
      .players[0]
      .hand
      .find(c => c.suit == 'C' && c.rank == 'J')
    ).toBeFalsy()

    expect(faeko.data.tricks.length).toBe(1)
    expect(faeko.data.tricks[0].length).toBe(1)

    expect(faeko.data.tricks[0][0].player).toBe(0)
    expect(faeko.data.tricks[0][0].card.suit).toBe('C')
    expect(faeko.data.tricks[0][0].card.rank).toBe('J')
  })

  test("card gets moved from single hand (custom dealer)", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealer: 2,
    })

    // Play a card!
    faeko.play(2, {suit: 'H', rank: 'A'})

    expect(faeko.data.players[2].hand.length).toBe(4)
    expect(
      faeko.data
      .players[2]
      .hand
      .find(c => c.suit == 'H' && c.rank == 'A')
    ).toBeFalsy()

    expect(faeko.data.tricks.length).toBe(1)
    expect(faeko.data.tricks[0].length).toBe(1)

    expect(faeko.data.tricks[0][0].player).toBe(2)
    expect(faeko.data.tricks[0][0].card.suit).toBe('H')
    expect(faeko.data.tricks[0][0].card.rank).toBe('A')
  })

  test("rejecting when player does not have card", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Play K of C, which we don't have
    expect(() => faeko.play(0, {suit: 'C', rank: 'K'}))
      .toThrow('Player 0 does not have card K of C!')
  })

  test("rejecting when player hand is empty", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Empty the hand!
    faeko.data.players[0].hand = []

    // Play J of C, which we don't have any more
    expect(() => faeko.play(0, {suit: 'C', rank: 'J'}))
      .toThrow('Player 0 does not have card J of C!')
  })

  test("rejecting when player hand is undefined", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Forget about the hand!
    faeko.data.players[0].hand = undefined

    // Play J of C, which we had but don't know about
    expect(() => faeko.play(0, {suit: 'C', rank: 'J'}))
      .toThrow('Could not find a hand for player 0!')
  })
})


describe("Playing a card when we only know some hands", () => {
  // Some test data
  let players = JSON.stringify([
    {
      bid: 3,
      hand: [
        { suit: 'C', rank: 'J'},
        { suit: 'C', rank: '3'},
        { suit: 'D', rank: 'Q'},
        { suit: 'H', rank: '9'},
        { suit: 'S', rank: 'J'},
      ],
    },
    {
      bid: 4,
      hand: [
        { suit: 'C', rank: '7'},
        { suit: 'D', rank: 'A'},
        { suit: 'H', rank: 'Q'},
        { suit: 'H', rank: 'J'},
        { suit: 'H', rank: '2'},
      ],
    },
    {
      bid: 3,
      hand: [
        { suit: 'D', rank: 'A'},
        { suit: 'D', rank: '4'},
        { suit: 'H', rank: 'A'},
        { suit: 'H', rank: '3'},
        { suit: 'S', rank: '8'},
      ],
    },
  ])

  test("playing when we don't know the hand", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Forget about the hands
    faeko.data.players = faeko.data.players.map(p => ({
      ...p,
      hand: undefined,
    }))

    // Play a card!
    faeko.play(0, {suit: 'C', rank: 'J'}, false)

    expect(typeof(faeko.data.players[0].hand))
      .toBe('undefined')

    expect(faeko.data.tricks.length).toBe(1)
    expect(faeko.data.tricks[0].length).toBe(1)

    expect(faeko.data.tricks[0][0].player).toBe(0)
    expect(faeko.data.tricks[0][0].card.suit).toBe('C')
    expect(faeko.data.tricks[0][0].card.rank).toBe('J')
  })

  test("rejecting when we know the hands but they are empty", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Forget about the hands
    faeko.data.players = faeko.data.players.map(p => ({
      ...p,
      hand: [],
    }))

    // Play a card!
    expect(() => faeko.play(0, {suit: 'C', rank: 'J'}, false))
      .toThrow('Player 0 does not have card J of C!')
  })

  test("playing when we know this hand but not others", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealer: 1,
    })

    faeko.data.players[0] = undefined
    faeko.data.players[2] = undefined

    // Play a card!
    faeko.play(1, {suit: 'D', rank: 'A'}, false)

    expect(faeko.data.players[1].hand.length).toBe(4)
    expect(
      faeko.data
      .players[1]
      .hand
      .find(c => c.suit == 'D' && c.rank == 'A')
    ).toBeFalsy()

    expect(faeko.data.tricks.length).toBe(1)
    expect(faeko.data.tricks[0].length).toBe(1)

    expect(faeko.data.tricks[0][0].player).toBe(1)
    expect(faeko.data.tricks[0][0].card.suit).toBe('D')
    expect(faeko.data.tricks[0][0].card.rank).toBe('A')
  })

  test("playing when we know other hands but not this one", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealer: 1,
    })

    faeko.data.players[1].hand = undefined

    // Play a card!
    faeko.play(1, {suit: 'D', rank: 'A'}, false)

    expect(typeof(faeko.data.players[1].hand))
      .toBe('undefined')

    expect(faeko.data.tricks.length).toBe(1)
    expect(faeko.data.tricks[0].length).toBe(1)

    expect(faeko.data.tricks[0][0].player).toBe(1)
    expect(faeko.data.tricks[0][0].card.suit).toBe('D')
    expect(faeko.data.tricks[0][0].card.rank).toBe('A')
  })

  test("rejecting when player does not have card, and we don't know other hands", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    faeko.data.players[1].hand = undefined
    faeko.data.players[2].hand = undefined

    // Play K of C, which we don't have
    expect(() => faeko.play(0, {suit: 'C', rank: 'K'}, false))
      .toThrow('Player 0 does not have card K of C!')
  })

})


describe("Playing cards across multiple tricks", () => {
  // Some test data
  let players = JSON.stringify([
    {
      bid: 3,
      hand: [
        { suit: 'C', rank: 'J'},
        { suit: 'C', rank: '3'},
        { suit: 'D', rank: 'Q'},
        { suit: 'H', rank: '9'},
        { suit: 'S', rank: 'J'},
      ],
    },
    {
      bid: 4,
      hand: [
        { suit: 'C', rank: '7'},
        { suit: 'D', rank: 'A'},
        { suit: 'H', rank: 'Q'},
        { suit: 'H', rank: 'J'},
        { suit: 'H', rank: '2'},
      ],
    },
    {
      bid: 3,
      hand: [
        { suit: 'D', rank: 'A'},
        { suit: 'D', rank: '4'},
        { suit: 'H', rank: 'A'},
        { suit: 'H', rank: '3'},
        { suit: 'S', rank: '8'},
      ],
    },
  ])

  test("adding next trick when previous one is completed", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // Start the trick
    faeko.play(0, {suit: 'C', rank: 'J'})

    expect(faeko.data.tricks.length).toBe(1)

    // Finish the trick
    faeko.play(1, {suit: 'C', rank: '7'})
    faeko.play(2, {suit: 'D', rank: 'A'})

    // Start the next trick
    faeko.play(2, {suit: 'H', rank: '3'})

    expect(faeko.data.tricks.length).toBe(2)

    // Complete the second trick
    faeko.play(0, {suit: 'H', rank: '9'})
    faeko.play(1, {suit: 'H', rank: 'J'})

    // Start the third trick
    faeko.play(1, {suit: 'H', rank: 'Q'})

    expect(faeko.data.tricks.length).toBe(3)
  })

})
