# Card Count vs Odds Analysis

Monte Carlo deals: 20000
Seed: 20260527

## Recommendation

Use **36 total cards (9 per seat)** as the first serious candidate for product testing.

36 cards gives 9 cards per seat, keeps a missing card live about 52.94% of the time, and leaves enough undealt-card uncertainty without reducing the hand to a mostly random short game.

The runner-up in this run is **32 total cards**.

## How to Read the Odds

- **Missing Card Live**: if our side does not hold a specific card, this is the probability that the opposing side has it.
- **Missing Card Dead**: if our side does not hold a specific card, this is the probability that it was never dealt.
- **Balanced HCP**: how often the live high-card points are reasonably close between the two sides.
- **Strong Fit**: how often at least one side has a meaningful trump fit for that card count.
- **Clear Favorite**: how often one side has a large pre-play material/shape edge.
- **Score**: a heuristic engagement score, not a mathematical truth. It rewards decision depth, uncertainty, balanced deals, and enough but not excessive favorite signal.

| Cards | Per Seat | Deck Dealt | Missing Card Live | Missing Card Dead | Balanced HCP | Strong Fit | Clear Favorite | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | 4 | 30.77% | 18.18% | 81.82% | 31.14% | 60.97% | 37.9% | 41 |
| 20 | 5 | 38.46% | 23.81% | 76.19% | 34.23% | 92.67% | 33.82% | 46 |
| 24 | 6 | 46.15% | 30% | 70% | 37.81% | 73.55% | 28.08% | 64 |
| 28 | 7 | 53.85% | 36.84% | 63.16% | 40.56% | 95.33% | 25.35% | 73 |
| 32 | 8 | 61.54% | 44.44% | 55.56% | 42.86% | 78.59% | 21.85% | 87 |
| 36 | 9 | 69.23% | 52.94% | 47.06% | 46.14% | 55.07% | 18.27% | 90 |
| 40 | 10 | 76.92% | 62.5% | 37.5% | 49.27% | 79.16% | 16.18% | 78 |
| 44 | 11 | 84.62% | 73.33% | 26.67% | 50.73% | 55.46% | 14.39% | 63 |
| 48 | 12 | 92.31% | 85.71% | 14.29% | 53.13% | 34.63% | 12.29% | 44 |
| 52 | 13 | 100% | 100% | 0% | 53.22% | 51.67% | 11.5% | 41 |

## Product Interpretation

- Very low card counts are volatile because most missing cards are not live. That creates surprise, but the user has less ability to reason.
- Full 52-card deals maximize information. If a card is missing from our side, the opponents must have it, so the game becomes much more deterministic.
- The middle range, especially 32 to 36 total cards, is where the game has enough card-play decisions while still keeping meaningful uncertainty.
