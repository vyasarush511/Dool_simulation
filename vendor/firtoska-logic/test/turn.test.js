import cards from '@firtoska/cards'
import Faeko from '../index.js'

describe("Finding out the turn type", () => {
  // Some test data
  let deck = new cards.Deck()
  let hands = deck.deal(4).hands
  let dealers = hands.map(h => ({
        hand: h,
  }))

  test("turn is empty at beginning of game", () => {
    let faeko = new Faeko({})
    expect(faeko.getTurn().type).toBe(null)
  })

  test("bidding starts when hands are dealt out", () => {
    let faeko = new Faeko({
      players: hands.map(h => ({
        hand: h,
      })),
      dealers: [...dealers]
    })

    expect(faeko.getTurn().type).toBe('bid')
  })

  test("bidding starts even if only one hand is dealt out", () => {
    let faeko = new Faeko({
      players: [
        {},
        {},
        { hand: hands[3] },
        {},
      ],
      dealers: [...dealers]
    })

    expect(faeko.getTurn().type).toBe('bid')
  })

  test("cardplay starts when bids are complete", () => {
    let faeko = new Faeko({
      players: hands.map(h => ({
        hand: h,
        bid: 3,
      })),
      dealers: [...dealers]
    })

    expect(faeko.getTurn().type).toBe('card')
  })

  test("cardplay starts even when bids are unknown", () => {
    let faeko = new Faeko({
      players: hands.map(h => ({
        hand: h,
        bid: true,
      })),
      dealers: [...dealers]
    })

    expect(faeko.getTurn().type).toBe('card')
  })
})


describe("Finding out players for turn: bid", () => {
  // Some test data
  let deck = new cards.Deck()
  let hands = deck.deal(3).hands
  let players = hands.map(h => ({
    hand: [...h],
  }))
  let dealers = [...players]

  test("everyone bids to start with", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(3)
    expect(turn.players[0]).toBe(0)
    expect(turn.players[1]).toBe(1)
    expect(turn.players[2]).toBe(2)
  })

  test("when one is done, the others do", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    faeko.data.players[0].bid = 8

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(2)
    expect(turn.players[0]).toBe(1)
    expect(turn.players[1]).toBe(2)
  })

  test("when one is done, the others do (blind version)", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    faeko.data.players[0].bid = true

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(2)
    expect(turn.players[0]).toBe(1)
    expect(turn.players[1]).toBe(2)
  })

  test("when two are done, there remains one", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    faeko.data.players[0].bid = 5
    faeko.data.players[2].bid = 6

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(1)
  })

  test("when two are done, there remains one (blind version)", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    faeko.data.players[0].bid = true
    faeko.data.players[2].bid = true

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(1)
  })

})


describe("Finding out players for turn: first trick", () => {
  // Some test data
  let deck = new cards.Deck()
  let hands = deck.deal(5).hands
  let players = hands.map(h => ({
    hand: [...h],
    bid: 3, // nice, irrelevant number
  }))
  let dealers = [
    { nickname: 'one', inactive: false, dealer: false },
    { nickname: 'two', inactive: false, dealer: true }
  ]

  test("dealer plays to start with", () => {
    let faeko = new Faeko({
      players: [...players],
      dealers: [...dealers]
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(0)
  })

  test("custom dealer", () => {
    let faeko = new Faeko({
      players: [...players],
      // dealer: 4,
      dealers: [...dealers]
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    // expect(turn.players[0]).toBe(1)
  })

  test("next person follows dealer", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // Play one card
    faeko.data.tricks.play({
      player: 0,
      card: faeko.data.players[0].hand.pop(),
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(1)
  })

  test("next person follows dealer: custom dealer", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealer: 3,
      dealers: [...dealers]
    })

    // Play one card
    faeko.data.tricks.play({
      player: 3,
      card: faeko.data.players[3].hand.pop(),
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(4)
  })

  test("after dealer, they follow each other", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // Play one card
    faeko.data.tricks.play({
      player: 0,
      card: faeko.data.players[0].hand.pop(),
    })

    // Play another card
    faeko.data.tricks.play({
      player: 1,
      card: faeko.data.players[1].hand.pop(),
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(2)
  })

  test("loop round to next player on reaching end", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealer: 3,
      dealers: [...dealers]
    })

    // Play one card
    faeko.data.tricks.play({
      player: 3,
      card: faeko.data.players[3].hand.pop(),
    })

    // Play from the last side
    faeko.data.tricks.play({
      player: 4,
      card: faeko.data.players[4].hand.pop(),
    })

    // Did we loop round to 0?
    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(0)
  })
})


describe("Finding out players for turn: moving to next trick", () => {
  // Some test data
  let deck = new cards.Deck()
  let hands = deck.deal(5).hands
  let players = hands.map(h => ({
    hand: [...h],
    bid: 3, // nice, irrelevant number
  }))
  let dealers = [...players];

  test("winner starts the next round", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealers: [...dealers],
    })

    // We're going to rig the play a bit here.
    // We'll take whatever cards are in the hand,
    // but when played they'll magically turn
    // into the exact cards we wanted.
    faeko.data.players[0].hand.pop()
    faeko.data.tricks.play({
      player: 0,
      card: { suit: 'S', rank: '3' },
    })

    faeko.data.players[1].hand.pop()
    faeko.data.tricks.play({
      player: 1,
      card: { suit: 'S', rank: '2' },
    })

    faeko.data.players[2].hand.pop()
    faeko.data.tricks.play({
      player: 2,
      card: { suit: 'S', rank: '8' },
    })

    // The winning card!
    faeko.data.players[3].hand.pop()
    faeko.data.tricks.play({
      player: 3,
      card: { suit: 'S', rank: 'A' },
    })

    faeko.data.players[4].hand.pop()
    faeko.data.tricks.play({
      player: 4,
      card: { suit: 'S', rank: '10' },
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(3)
  })

  test("winner starts the next round (with discard)", () => {
    let faeko = new Faeko({
      players: [...players],
      tricks: new cards.Tricks(),
      dealers: [...dealers],
    })

    // We're going to rig the play a bit here.
    // We'll take whatever cards are in the hand,
    // but when played they'll magically turn
    // into the exact cards we wanted.
    faeko.data.players[0].hand.pop()
    faeko.data.tricks.play({
      player: 0,
      card: { suit: 'S', rank: '3' },
    })

    faeko.data.players[1].hand.pop()
    faeko.data.tricks.play({
      player: 1,
      card: { suit: 'S', rank: '2' },
    })

    // The winning card!
    faeko.data.players[2].hand.pop()
    faeko.data.tricks.play({
      player: 2,
      card: { suit: 'S', rank: '8' },
    })

    // A losing card!
    faeko.data.players[3].hand.pop()
    faeko.data.tricks.play({
      player: 3,
      card: { suit: 'C', rank: 'A' },
    })

    faeko.data.players[4].hand.pop()
    faeko.data.tricks.play({
      player: 4,
      card: { suit: 'S', rank: '7' },
    })

    let turn = faeko.getTurn()

    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(2)
  })
})


describe("Finding out players for turn: after the next trick", () => {
  // Some test data
  let players = JSON.stringify([
    {
      hand: [
        { suit: 'S', rank: '3' },
        { suit: 'H', rank: 'A' },
        { suit: 'C', rank: '3' },
        { suit: 'C', rank: '3' },
      ],
      bid: 3,
    },
    {
      hand: [
        { suit: 'H', rank: 'K' },
        { suit: 'H', rank: 'Q' },
        { suit: 'D', rank: '5' },
        { suit: 'C', rank: '3' },
      ],
      bid: 2,
    },
    {
      hand: [
        { suit: 'S', rank: '9' },
        { suit: 'H', rank: '3' },
        { suit: 'D', rank: 'J' },
        { suit: 'D', rank: '9' },
      ],
      bid: 4,
    },
  ])
  let dealers = [...players]

  test("continuing to play second trick", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // Play out the first trick
    faeko.play(0, { suit: 'S', rank: '3'})
    faeko.play(1, { suit: 'C', rank: '3'})
    faeko.play(2, { suit: 'S', rank: '9'})

    // two won
    expect(faeko.getTurn().players[0]).toBe(2)

    // Now, play the next card
    faeko.play(2, { suit: 'D', rank: 'J'})

    // Did it work?
    let turn = faeko.getTurn()
    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(0)
  })
})


describe("Finding out the beginning and end of a game", () => {
  // Some test data
  let players = JSON.stringify([
    {
      hand: [
        { suit: 'S', rank: '3' },
      ],
      bid: 3,
    },
    {
      hand: [
        { suit: 'H', rank: 'K' },
      ],
      bid: 2,
    },
    {
      hand: [
        { suit: 'S', rank: '9' },
      ],
      bid: 4,
    },
  ])
  let dealers = [...players]

  test("waiting for the last take", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // Play out the (first and) last trick
    faeko.play(0, { suit: 'S', rank: '3'})
    faeko.play(1, { suit: 'H', rank: 'K'})
    faeko.play(2, { suit: 'S', rank: '9'})

    // The game should have ended
    let turn = faeko.getTurn()

    // if its ended and the take or flip action already took means 
    // it will return 'score' otherwise it will return 'card'
    expect(turn.type).toBe('take')
    expect(turn.players.length).toBe(1) // because only one winner
    expect(turn.players[0]).toBe(2)
  })

  test("the game ends", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // Play out the (first and) last trick
    faeko.play(0, { suit: 'S', rank: '3'})
    faeko.play(1, { suit: 'H', rank: 'K'})
    faeko.play(2, { suit: 'S', rank: '9'})

    // take the last trick
    faeko.take(2) // won with 9 of spades

    // now, the game should have ended
    let turn = faeko.getTurn()
    expect(turn.type).toBe('score')
    expect(turn.players.length).toBe(0)
  })

  test("last trick when we don't know other peoples' hands", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // We don't know the cards of players 0 and 2
    faeko.data.players[1].hand = null
    faeko.data.players[2].hand = null

    // Play out our last card
    faeko.play(0, { suit: 'S', rank: '3'})

    // The game should still be going on
    let turn = faeko.getTurn()
    expect(turn.type).toBe('card')
    expect(turn.players.length).toBe(1)
    expect(turn.players[0]).toBe(1)
  })

  test("game has not started yet", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
      dealers: [...dealers]
    })

    // All hands are empty (eg. not dealt out yet)
    faeko.data.players[0].hand = null
    faeko.data.players[1].hand = null
    faeko.data.players[2].hand = null

    // The game should still be going on
    let turn = faeko.getTurn()
    expect(turn.type).toBeFalsy()
    expect(turn.players.length).toBe(0)
  })
})
