import Dool from "..";

describe("Test Dool Scoring", () => {
  const testScenarios = [
    {
      declarer: 0, // NS
      contractLevel: 1,
      contractMultiplier: "",
      trickScores: [4, 2], // made 4
      expectedScore: [0, 0], //level 1, 0 points
    },
    {
      declarer: 0, // NS
      contractLevel: 3,
      contractMultiplier: "",
      trickScores: [4, 2], // made 4
      expectedScore: [0, 0], //level 3, 0 points
    },
    {
      declarer: 0, // NS
      contractLevel: 4,
      contractMultiplier: "",
      trickScores: [4, 2], // made 4
      expectedScore: [100, 0], //level 4, 100 points
    },
    {
      declarer: 0, // NS
      contractLevel: 5,
      contractMultiplier: "",
      trickScores: [5, 1], // made 5
      expectedScore: [200, 0], //level 5, 200 points
    },
    {
      declarer: 0, // NS
      contractLevel: 6,
      contractMultiplier: "",
      trickScores: [6, 0], // made all 6
      expectedScore: [400, 0], // level 6, 400 points
    },
    {
      declarer: 0, // NS
      contractLevel: 4,
      contractMultiplier: "",
      trickScores: [6, 0], // made 6 - 2 overtricks
      expectedScore: [100, 0], // level 4, 100 points (no overtricks points)
    },
    {
      declarer: 0, // NS
      contractLevel: 6,
      contractMultiplier: "X",
      trickScores: [6, 0], // made all 6
      expectedScore: [800, 0], // level 6 doubled, 800 points
    },
    {
      declarer: 0, // NS
      contractLevel: 6,
      contractMultiplier: "XX",
      trickScores: [6, 0], // made all 6
      expectedScore: [1600, 0], // level 6 redoubled, 1600 points
    },
    {
      declarer: 1, // EW
      contractLevel: 1,
      contractMultiplier: "",
      trickScores: [6, 0], // down 1
      expectedScore: [100, 0], // down 1, 100 points
    },
    {
      declarer: 0, // NS
      contractLevel: 4,
      contractMultiplier: "",
      trickScores: [2, 4], // down 2
      expectedScore: [0, 200], // down 2, 200 points
    },
    {
      declarer: 0, // NS
      contractLevel: 4,
      contractMultiplier: "X",
      trickScores: [2, 4], // down 2
      expectedScore: [0, 400], // down 2 doubled, 400 points
    },
    {
      declarer: 0, // NS
      contractLevel: 4,
      contractMultiplier: "XX",
      trickScores: [2, 4], // down 2
      expectedScore: [0, 800], // down 2 redoubled, 800 points
    },
  ];

  test("Test dool scoring for various scenarios", () => {
    testScenarios.forEach((scenario) => {
      const dool = new Dool();
      const score = dool._getDoolScoring(
        scenario.declarer,
        scenario.contractLevel,
        scenario.contractMultiplier,
        scenario.trickScores
      );
      console.log(score);
      expect(score).toStrictEqual(scenario.expectedScore);
    });
  });
});

describe("Test Deal Scoring for Dool", () => {
  test("For handLength of 13, bridge scoring must be used.", () => {
    const dool = new Dool({
      handLength: 13,
      dealNumber: 0, // non vul
    });
    dool.getContract = () => {
      return {
        level: '7',
        suit: 'NT',
        double: true,
        redouble: true,
        declarer: 0, // NS
      };
    };
    dool.trickScore = () => {
      return [13, 0];
    };

    const score = dool.getDoolScore();
    expect(score).toStrictEqual([2280, 0]);
  });

  test("For hand length of 10, no scoring must happen", () => {
    const dool = new Dool({
      handLength: 10,
      dealNumber: 0, // non vul
    });
    dool.getContract = () => {
      return {
        level: '7',
        suit: 'NT',
        double: true,
        redouble: true,
        declarer: 0, // NS
      };
    };
    dool.trickScore = () => {
      return [13, 0];
    };

    const score = dool.getDoolScore();
    expect(score).toStrictEqual([0, 0]);
  });

  test("For hand length of 6, dool scoring must be used", () => {
    const dool = new Dool({
      handLength: 6,
      dealNumber: 0, // non vul
    });
    dool.getContract = () => {
      return {
        level: '6',
        suit: 'NT',
        double: true,
        redouble: true,
        declarer: 0, // NS
      };
    };
    dool.trickScore = () => {
      return [6, 0];
    };

    const score = dool.getDoolScore();
    expect(score).toStrictEqual([1600, 0]);
  });
});
