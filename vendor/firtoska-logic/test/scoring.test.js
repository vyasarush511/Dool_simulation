import Firtoska from "..";

describe("Bridge Scoring Test", () => {
    const testCases = [
        {
            dealNumber: 1, // North-South vulnerable
            declarerSide: 0, // NS
            contract: {
                level: 5,
                suit: "H",
                risk: "xx"
            },
            tricksScore: [10, 3],
            scoreExpected: [0 ,400]
        },
        {
            dealNumber: 0,  // Neither side vulnerable
            declarerSide: 0,  // NS
            contract: {
                level: 3,
                suit: "NT",
                risk: ""
            },
            tricksScore: [9, 4],  // Tricks made exactly as bid
            scoreExpected: [400, 0]  // Basic score for making 3NT
        },
        {
            dealNumber: 1,  // North-South vulnerable
            declarerSide: 0,  // NS
            contract: {
                level: 4,
                suit: "S",
                risk: "x"
            },
            tricksScore: [11, 2],  // One overtrick
            scoreExpected: [990, 0]  // Score for making a doubled contract vulnerable with one overtrick
        },
        {
            dealNumber: 13,  // Neither side vulnerable
            declarerSide: 1,  // EW
            contract: {
                level: 2,
                suit: "H",
                risk: ""
            },
            tricksScore: [5, 8],  // Made exactly
            scoreExpected: [0, 110]  // Base score for making 2 Hearts
        },
        {
            dealNumber: 2,  // East-West vulnerable
            declarerSide: 1,  // EW
            contract: {
                level: 6,
                suit: "C",
                risk: "XX"
            },
            tricksScore: [2, 11],  // One down
            scoreExpected: [400, 0]  // Penalty for one down redoubled vulnerable
        },
        {
            dealNumber: 15,  // East-West vulnerable
            declarerSide: 0,  // NS
            contract: {
                level: 7,
                suit: "NT",
                risk: ""
            },
            tricksScore: [13, 0],  // Grand slam made
            scoreExpected: [1520, 0]  // Points for making a grand slam in NT
        },
        {
            dealNumber: 6,  // Both sides vulnerable
            declarerSide: 1,  // EW
            contract: {
                level: 5,
                suit: "D",
                risk: "X"
            },
            tricksScore: [9, 4],  // Down by 7
            scoreExpected: [2000, 0]  // Large penalty for being down by 6 doubled and vulnerable
        },
        {
            dealNumber: 4,  // North-South vulnerable
            declarerSide: 0,  // NS
            contract: {
                level: 5,
                suit: "H",
                risk: "XX"
            },
            tricksScore: [4, 9],  // Down by 7
            scoreExpected: [0, 4000]  // Severe penalty for down 7 redoubled and vulnerable
        }
    ];    

    test("Test various scenarios", () => {
        testCases.forEach(testCase => {

        const firtoska = new Firtoska({
            dealNumber: testCase.dealNumber,
        });
        const result = firtoska.getBridgeScoring(
            testCase.contract.suit,
            testCase.contract.level,
            testCase.contract.risk,
            testCase.declarerSide,
            testCase.tricksScore
        );
        expect(result).toStrictEqual(testCase.scoreExpected);
    });
    });
})