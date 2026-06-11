import Faeko from "..";
import cards from "@firtoska/cards";

describe('testing the get trick Score function', () => {
  // Some test data
  let players = JSON.stringify([
    {
      hand: [
        { suit: 'C', rank: 'J' },
        { suit: 'C', rank: '3' },
        { suit: 'D', rank: 'Q' },
        { suit: 'H', rank: '9' },
        { suit: 'S', rank: 'J' },
      ],
    },
    {
      hand: [
        { suit: 'C', rank: '7' },
        { suit: 'D', rank: 'K' },
        { suit: 'H', rank: 'Q' },
        { suit: 'H', rank: 'J' },
        { suit: 'H', rank: '2' },
      ],
    },
    {
      hand: [
        { suit: 'D', rank: 'A' },
        { suit: 'D', rank: '4' },
        { suit: 'H', rank: 'A' },
        { suit: 'H', rank: '3' },
        { suit: 'S', rank: '8' },
      ],
    },
    {
      hand: [
        { suit: 'C', rank: '2' },
        { suit: 'C', rank: '9' },
        { suit: 'D', rank: 'A' },
        { suit: 'H', rank: '6' },
        { suit: 'S', rank: '3' },
      ],
    },
  ])

  test('checking the after finishing the game', () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // trick one
    faeko.play(0, { suit: 'C', rank: 'J' })
    faeko.play(1, { suit: 'C', rank: '7' })
    faeko.play(2, { suit: 'D', rank: 'A' })
    faeko.play(3, { suit: 'C', rank: '2' })

    // trick two
    faeko.play(0, { suit: 'H', rank: '9' })
    faeko.play(1, { suit: 'H', rank: 'J' })
    faeko.play(2, { suit: 'H', rank: '3' })
    faeko.play(3, { suit: 'H', rank: '6' })

    // trick three
    faeko.play(1, { suit: 'H', rank: 'Q' })
    faeko.play(2, { suit: 'H', rank: 'A' })
    faeko.play(0, { suit: 'D', rank: 'Q' })
    faeko.play(3, { suit: 'C', rank: '9' })
    
    // trick four
    faeko.play(2, { suit: 'S', rank: '8' })
    faeko.play(0, { suit: 'S', rank: 'J' })
    faeko.play(1, { suit: 'H', rank: '2' })
    faeko.play(3, { suit: 'S', rank: '3' })

    //trick five
    faeko.play(0, { suit: 'C', rank: '3' })
    faeko.play(1, { suit: 'D', rank: 'K' })
    faeko.play(2, { suit: 'D', rank: '4' })
    faeko.play(3, { suit: 'D', rank: 'A' })

    let score = { "0_2": 4, "1_3": 1 }
    
    //trick score needs to be [3,1,1]
    expect(faeko.trickScore()).toEqual(score)
  })

})
