import Faeko from '../index.js'
import cards from '@firtoska/cards'

describe("Importing the object", () => {

  test("object is created with empty data", () => {
    let faeko = new Faeko({})
    expect(typeof(faeko.data)).toBe('object')
  })

  test("object is created with nonempty data", () => {
    let faeko = new Faeko({
      happened: true,
    })
    expect(faeko.data.happened).toBeTruthy()
  })

})

describe("Integrating with cards library", () => {

  test("using the 'add trick' method", () => {
    let faeko = new Faeko({
      tricks: new cards.Tricks(),
    })

    expect(faeko.data.tricks.length).toBe(0)

    faeko.data.tricks.addTrick()
    expect(faeko.data.tricks.length).toBe(1)

    faeko.data.tricks.addTrick()
    expect(faeko.data.tricks.length).toBe(2)
  })
})
