import cards from '@firtoska/cards'
import Faeko from '..'

describe('testing the dealScore function', () => {
  // Some test data
  let players = JSON.stringify([
    {
      bid: 3,
      hand: [
        { suit: 'C', rank: 'J' },
        { suit: 'C', rank: '3' },
        { suit: 'D', rank: 'Q' },
        { suit: 'H', rank: '9' },
        { suit: 'S', rank: 'J' },
      ],
      inactive: false,
    },
    {
      bid: 4,
      hand: [
        { suit: 'C', rank: '7' },
        { suit: 'D', rank: 'K' },
        { suit: 'H', rank: 'Q' },
        { suit: 'H', rank: 'J' },
        { suit: 'H', rank: '2' },
      ],
      inactive: false,
    },
    {
      bid: 3,
      hand: [
        { suit: 'D', rank: 'A' },
        { suit: 'D', rank: '4' },
        { suit: 'H', rank: 'A' },
        { suit: 'H', rank: '3' },
        { suit: 'S', rank: '8' },
      ],
      inactive: false,
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

    // trick two
    faeko.play(0, { suit: 'H', rank: '9' })
    faeko.play(1, { suit: 'H', rank: 'J' })
    faeko.play(2, { suit: 'H', rank: '3' })

    // trick three
    faeko.play(1, { suit: 'H', rank: 'Q' })
    faeko.play(2, { suit: 'H', rank: 'A' })
    faeko.play(0, { suit: 'D', rank: 'Q' })

    // trick four
    faeko.play(2, { suit: 'S', rank: '8' })
    faeko.play(0, { suit: 'S', rank: 'J' })
    faeko.play(1, { suit: 'H', rank: '2' })

    //trick five
    faeko.play(0, { suit: 'C', rank: '3' })
    faeko.play(1, { suit: 'D', rank: 'K' })
    faeko.play(2, { suit: 'D', rank: '4' })

    // score = [3,1,1] only the first player made the contract
    // so he gets the score from other two players
    // the second player's score is off by 3 and third player's score is off by 2 so 6 + 3 = 9
    expect(faeko.getDealScore()).toEqual([9, 0, 0])

    //if every one made the contract , all get the bonus of five points
    faeko.data.players[1].bid = 1
    faeko.data.players[2].bid = 1

    expect(faeko.getDealScore()).toEqual([5, 5, 5])

    //if no one made the contract
    faeko.data.players[0].bid = 4
    faeko.data.players[1].bid = 2
    faeko.data.players[2].bid = 2

    expect(faeko.getDealScore()).toEqual([0, 0, 0])

    //if two players made the contract, they get the score from other players
    faeko.data.players[1].bid = 1
    faeko.data.players[2].bid = 1

    expect(faeko.getDealScore()).toEqual([0, 1, 1])
  })

  test('calculating the score for only active players', () => {
    let faeko = new Faeko({
      players: JSON.parse(players),
      tricks: new cards.Tricks(),
    })

    // trick one
    faeko.play(0, { suit: 'C', rank: 'J' })
    faeko.play(1, { suit: 'C', rank: '7' })
    faeko.play(2, { suit: 'D', rank: 'A' })

    // trick two
    faeko.play(0, { suit: 'H', rank: '9' })
    faeko.play(1, { suit: 'H', rank: 'J' })
    faeko.play(2, { suit: 'H', rank: '3' })

    // trick three
    faeko.play(1, { suit: 'H', rank: 'Q' })
    faeko.play(2, { suit: 'H', rank: 'A' })
    faeko.play(0, { suit: 'D', rank: 'Q' })

    // trick four
    faeko.play(2, { suit: 'S', rank: '8' })
    faeko.play(0, { suit: 'S', rank: 'J' })
    faeko.play(1, { suit: 'H', rank: '2' })

    // after playing the fourth trick player 1 disconnects
    faeko.data.players[1].inactive = true

    // trick five
    faeko.play(0, { suit: 'C', rank: '3' })
    faeko.play(2, { suit: 'D', rank: '4' })

    // now the player 1 has been disconnected so the total score will be
    // only the player 2 didn't made the contract
    expect(faeko.getDealScore()).toEqual([3, 0, 0])

    // if the disconnected player made the contract at the time of disconnect he
    // gets zero only
    faeko.data.players[1].bid = 1
    expect(faeko.getDealScore()).toEqual([3, 0, 0]);
    
    faeko.data.players[2].bid = 1
    
    // now every one made expect the disconnected player , winners get bonus of 5
    expect(faeko.getDealScore()).toEqual([5, 0, 5])

    // if no one made the contract all should be zero only
    faeko.data.players[0].bid = 4
    faeko.data.players[2].bid = 2
    expect(faeko.getDealScore()).toEqual([0, 0, 0]);

  })

})
