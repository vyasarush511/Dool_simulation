import cards from '@firtoska/cards'
import Faeko from '../index.js'

describe("Is the trick complete?", () => {
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

  let played = [
    { suit: 'C', rank: 'J'},
    { suit: 'C', rank: '7'},
    { suit: 'D', rank: '4'},
  ]

  test("ordinary trick is complete", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.tricks.loadArray([
      [
        { player: 0, card: { suit: 'C', rank: 'J'} },
        { player: 1, card: { suit: 'C', rank: '7'} },
        { player: 2, card: { suit: 'D', rank: '4'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(true)
  })

  test("trick completed with different starting point", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.tricks.loadArray([
      [
        { player: 2, card: { suit: 'D', rank: '4'} },
        { player: 0, card: { suit: 'C', rank: 'J'} },
        { player: 1, card: { suit: 'C', rank: '7'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(true)
  })

  test("incomplete trick", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.tricks.loadArray([
      [
        { player: 0, card: { suit: 'C', rank: 'J'} },
        { player: 1, card: { suit: 'C', rank: '7'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(false)
  })

  test("incomplete trick with different starting point", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.tricks.loadArray([
      [
        { player: 2, card: { suit: 'D', rank: '4'} },
        { player: 0, card: { suit: 'C', rank: 'J'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(false)
  })

  test("trick finished with 1 inactive player", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.players[1].inactive = true

    faeko.data.tricks.loadArray([
      [
        { player: 0, card: { suit: 'C', rank: 'J'} },
        { player: 2, card: { suit: 'D', rank: '4'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(true)
  })

  test("player left in middle of trick", () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks()
    })

    faeko.data.players[1].inactive = true

    faeko.data.tricks.loadArray([
      [
        { player: 0, card: { suit: 'C', rank: 'J'} },
        { player: 1, card: { suit: 'C', rank: '7'} },
        { player: 2, card: { suit: 'D', rank: '4'} },
      ],
    ])

    expect(faeko.isTrickComplete()).toBe(true)
  })

})
