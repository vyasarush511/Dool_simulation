# Poker Dool Betting Structure Analysis

Monte Carlo deals: 5000
Seed: 20260529

## Recommended Draft

- Format: **40 cards dealt from 52**.
- Cards per player/seat: **10**.
- Total tricks: **10**.
- Minimum contract/trump bid: **5 tricks**.
- Table fee: **10 from each player**, outside the pot.
- Ante: **10 from each player**, inside the pot.
- Min bet/raise: **10**.
- Max commitment per player in one hand: **300**.
- Max pot: **600**.
- Recommended betting cadence: **second_half_every_trick**.

second_half_every_trick gave the strongest balance of pot growth, late folds, action density, and cap safety. The default 40-card format creates 10 tricks, so the opening contract floor should be 5 tricks.

## Rules Draft

1. Each player pays the table fee before the hand starts. This is not part of the pot.
2. Each player posts the ante. The ante starts the pot.
3. A player may **check/pass** only when there is no bet to match.
4. A player facing a bet may **call**, **raise**, or **fold**.
5. Raising is capped by min bet, max raises per round, the progressive commitment cap, and max pot.
6. Early rounds have smaller caps; later rounds unlock larger caps. This keeps users in the hand longer while still allowing larger pots when the story of the hand is clearer.
7. Folded hands may be **mucked** by default. Cards are exposed only for replay, dispute review, cash-out audit, or explicit reveal mode.

## Structure Comparison

| Structure | Rounds | Avg Pot | Fold Rate | Avg Fold Trick When Folded | Late Folds | Check-Only Rounds | Cap Hit | Score |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| every_trick | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 | 302.15 | 9.5% | 1.17 | 2.74% | 47.05% | 0% | 53 |
| alternate_trick | 0, 2, 4, 6, 8 | 177.38 | 10.94% | 2.48 | 11.7% | 49.12% | 0% | 58 |
| second_half_every_trick | 5, 6, 7, 8, 9 | 261.28 | 15.12% | 5.1 | 100% | 22.22% | 0% | 92 |
| second_half_alternate | 5, 7, 9 | 166.54 | 17.78% | 5.42 | 100% | 22.91% | 0% | 81 |

## Hand Evaluation Notes

- **No Trump**: count sure winners by top sequences in each suit. A is one winner; AK is two; AKQ is three; and so on.
- **Trump**: count losers using bridge-style losing trick count. In each suit, missing A/K/Q among the first three cards creates likely losers. Long trump holdings reduce loser count.
- These are not final EV models. They are explainable first-pass inputs for bidding, betting, folding, and cash-out pricing.
