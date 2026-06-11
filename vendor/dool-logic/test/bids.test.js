import Faeko from '../index.js'

describe("Checking valid bids", () => {
  test("bid falls within specified range", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(3, 0)).toBeTruthy()
  })

  test("bid falls outside specified range", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(10, 0)).toBeFalsy()
  })

  test("edge case: zero bid should pass", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(0, 0)).toBeTruthy()
  })

  test("edge case: 0 should pass", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(0, 0)).toBeTruthy()
  })

  test("edge case: max bid should pass", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(4, 0)).toBeTruthy()
  })

  test("edge case: 1 above max should fail", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(5, 0)).toBeFalsy()
  })

  test("calling with no player specified", () => {
    let faeko = new Faeko({
      players: [{
        // hand can hold random values, since we're only checking the length
        hand: ['a','b','c','d'],
      }]
    })

    expect(faeko.isValidBid(5)).toBeFalsy()
  })

  test("using max value when no player specified", () => {
    let faeko = new Faeko({
      players: [
        { hand: ['a','b','c'] },
        { hand: ['a','b','c','d','e'] },
        { hand: ['a','b','c','d'] },
      ]
    })

    expect(faeko.isValidBid(5)).toBeTruthy()
  })

  test("rejecting invalid bid: string", () => {
    let faeko = new Faeko({
      players: [
        { hand: ['a','b','c','d'] },
      ]
    })

    expect(faeko.isValidBid('four')).toBeFalsy()
  })

  test("rejecting invalid bid: number but NaN", () => {
    let faeko = new Faeko({
      players: [
        { hand: ['a','b','c','d'] },
      ]
    })

    expect(faeko.isValidBid(NaN)).toBeFalsy()
  })
})
