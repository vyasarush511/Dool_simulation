import cards from '@firtoska/cards'
import Faeko from '..'

describe('chekcing deal function', () => { 
    let ranks = [
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      'J',
      'Q',
      'K',
      'A',
    ]

  test('dealing cards when one player', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: [
        'player1'
      ]
    })
    
    expect(faeko.dealCards()).toBeUndefined()
  })

  test('dealing cards in two player game', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: ['player1', 'player2'],
    })

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 2
    expect(handsAndRemaining.hands).toHaveLength(2)

    //cards in the hands to Be 12
    expect(handsAndRemaining.hands[0]).toHaveLength(12)

    //ranks '2' , '3' , '4' , '5' , '6' should not be in the hands
    handsAndRemaining.hands.every(hand => {
      return hand.every(card => expect(ranks.indexOf(card.rank)).toBeGreaterThan(4))
    })

    //remaining cards length should be 8
    expect(handsAndRemaining.remaining).toHaveLength(8)
  })

  test('dealing cards in three player game', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: ['player1', 'player2', 'player3'],
    })

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 3
    expect(handsAndRemaining.hands).toHaveLength(3)

    //cards in the hands to Be 12
    expect(handsAndRemaining.hands[0]).toHaveLength(12)

    //ranks '2' , '3' , '4' , '5'  should not be in the hands
    handsAndRemaining.hands.every(hand => {
      return hand.every(card => expect(ranks.indexOf(card.rank)).toBeGreaterThan(3))
    })

    //remaining cards length should be 0
    expect(handsAndRemaining.remaining).toHaveLength(0)
  })

  
  test('dealing cards in four player game', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: ['player1', 'player2', 'player3','player4'],
    })

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 4
    expect(handsAndRemaining.hands).toHaveLength(4)

    //cards in the hands to Be 13
    expect(handsAndRemaining.hands[0]).toHaveLength(13)

    //remaining cards length should be 0
    expect(handsAndRemaining.remaining).toHaveLength(0)
  })

  
  test('dealing cards in five player game', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: ['player1', 'player2', 'player3', 'player4', 'player5'],
    })

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 5
    expect(handsAndRemaining.hands).toHaveLength(5)

    //cards in the hands to Be 10
    expect(handsAndRemaining.hands[0]).toHaveLength(10)

    // S2 and C2 cards should be removed

    handsAndRemaining.hands.every(hand => {
      return hand.every(card => expect(card).not.toEqual({ suit: 'S', rank: '2'}))
    })

    handsAndRemaining.hands.every(hand => {
      return hand.every(card =>
        expect(card).not.toEqual({ suit: 'C', rank: '2' })
      )
    })
    
    //remaining cards length should be 0
    expect(handsAndRemaining.remaining).toHaveLength(0)
  })

  
  test('dealing cards in six player game', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: [
        'player1',
        'player2',
        'player3',
        'player4',
        'player5',
        'player6',
      ],
    })

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 6
    expect(handsAndRemaining.hands).toHaveLength(6)

    //cards in the hands to Be 8
    expect(handsAndRemaining.hands[0]).toHaveLength(8)

    //the rank '2' should not be in the hand
    handsAndRemaining.hands.every(hand => {
      return hand.every(card =>
        expect(card.rank).not.toBe('2')
      )
    })

    //remaining cards length should be 0
    expect(handsAndRemaining.remaining).toHaveLength(0)
  })

  test('dealing cards for playerCount above six', () => {
    let faeko = new Faeko({
      deck: new cards.Deck(),
      players: [
        'player1',
        'player2',
        'player3',
        'player4',
        'player5',
        'player6',
        'player7',
        'player8'
      ],
    })

    // if the playerCount exceeds six,we are dealing cards 52/playerCount

    let handsAndRemaining = faeko.dealCards()

    //hands length to Be 2
    expect(handsAndRemaining.hands).toHaveLength(8)

    //cards in the hands to Be 12
    expect(handsAndRemaining.hands[0]).toHaveLength(6)

    //remaining cards length should be 8
    expect(handsAndRemaining.remaining).toHaveLength(4)
  })
})
