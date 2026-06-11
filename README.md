# Poker-Dool Betting Simulation

Dockerized full-stack prototype for a hidden-information trick-taking card game that combines Dool/Bridge-style contracts with poker-style betting rounds.

The project includes a shared-room browser game, card/deck simulation scripts, betting-structure analysis, bot/search logic, and replay/audit foundations for future cash-out pricing.

The simulation models the real game as two side-level players:

```text
NS bot controls seats 0 and 2
EW bot controls seats 1 and 3
```

## Project map

- `public/` contains the browser prototype shown at `http://localhost:3000`.
  - `public/index.html` is the page structure.
  - `public/styles.css` controls the table, cards, panels, and responsive layout.
  - `public/app.js` calls the server APIs, renders the hands grouped by suit, and sends human bids/cards.
- `src/` contains our bot and simulation code.
  - `src/server.js` starts the web server and exposes the demo/simulation APIs.
  - `src/simulate.js` runs bot-vs-bot Monte Carlo style terminal simulations.
  - `src/verify.js` runs automated checks for bidding, card play, and interactive behavior.
  - `src/bots/twoHandHeuristicBot.js` is the bot wrapper: bid, choose opening leader, choose card.
  - `src/game/evaluation.js` scores hands, trump suits, HCP, expected tricks, and bid ordering.
  - `src/game/interactiveSession.js` keeps a live human-vs-bot deal, contract flow, and bot auto-play.
  - `src/game/cardPlaySearch.js` chooses cards using tactical rules, rollout search, and exact search when small enough.
  - `src/game/exactDoubleDummy.js` is the exact minimax solver used for tractable late-game positions.
  - `src/game/twoSideSimulation.js` creates deals and runs complete two-side games.
  - `src/game/constants.js`, `actions.js`, and `stateClone.js` are shared helpers.
  - `src/pokerDool/` contains the Poker-Dool prototype: 36/52 and 24/36 variants, betting rules, betting bot policy, hand evaluation, deck helpers, and replay/expose/muck logging.
  - `src/analysis/` contains analysis scripts for card-count odds and poker-Dool betting structure.
- `vendor/` contains the original game/card logic we copied in as local dependencies.
  - `vendor/dool-logic/index.js` is the core Dool state machine, bidding, deck setup, and scoring reference.
  - `vendor/firtoska-cards/trick.js` defines trick mechanics, legal cards, winner selection, and trump behavior.
  - `vendor/firtoska-logic/` is the related upstream logic package kept for compatibility.
- `Dockerfile` defines the Node 20 container used to run the demo and simulations.
- `.dockerignore` keeps unnecessary files out of Docker builds.
- `package.json` defines the commands: `demo`, `simulate`, and `verify`.
- `package-lock.json` pins the dependency versions.

## Commands

Build the image:

```powershell
docker build -t dool-bot-sim .
```

Run the terminal simulation:

```powershell
docker run --rm dool-bot-sim npm run simulate -- --deals=10
```

Run the card-count odds analysis:

```powershell
New-Item -ItemType Directory -Force analysis-output | Out-Null
docker run --rm -v "${PWD}\analysis-output:/app/analysis-output" dool-bot-sim npm run analyze:cards -- --deals=20000
```

This writes:

```text
analysis-output/card-count-odds.csv
analysis-output/card-count-odds-report.md
```

Run the poker-Dool betting structure analysis:

```powershell
New-Item -ItemType Directory -Force analysis-output | Out-Null
docker run --rm -v "${PWD}\analysis-output:/app/analysis-output" dool-bot-sim npm run analyze:poker-dool -- --deals=5000
```

This writes:

```text
analysis-output/poker-dool-structure.csv
analysis-output/poker-dool-structure-report.md
```

Run verification:

```powershell
docker run --rm dool-bot-sim npm run verify
```

Run the browser demo:

```powershell
docker run --rm -p 3000:3000 dool-bot-sim
```

Then open:

```text
http://localhost:3000
```

The browser opens on the Poker-Dool launch prototype. It is a two-player betting table with two variants:

- `36 / 52`: full 52-card deck, 36 cards dealt, 9 cards per hand, 16 hidden.
- `24 / 36`: randomly sample a 36-card universe from the full 52-card deck, deal 24 cards, 6 cards per hand, 12 universe cards hidden.

Each player controls two hands. Player 1 and Player 2 both see their own hands in the north/south positions on their own shared link, while the opponent's cards stay hidden. Cards are grouped by suit, trump and target tricks are chosen in the preflop betting round, and later betting windows open on the variant's scheduled trick cadence.

The Classic tab is still available as the earlier human-vs-bot Dool view. There the human controls one side's two hands, the bot controls the other side's two hands, and the deal stays fixed when you press Start to apply a contract.

## Current bot logic

- Classic trump and contract selection live in `src/game/evaluation.js` and `src/bots/twoHandHeuristicBot.js`.
- The bot evaluates both hands owned by one side, not one isolated seat.
- Suit contracts are scored using trump length, trump split across the two owned hands, trump honors, side-suit controls, shortness/ruffing value, and high-card points.
- No-trump contracts are scored using high-card points, suit stoppers, and shape risk.
- Contract level is conservative: the bot only bids when expected tricks clear the contract target.
- Overbidding uses the same trump evaluation. The bot chooses its best suit, raises the level until the bid legally beats the human bid, and accepts the overbid only if the expected-trick margin or trump-fit strength is good enough.
- Opening lead and card play use `src/game/cardPlaySearch.js`, which clones the current game, tries legal candidate cards, rolls the rest of the deal forward with perfect-information heuristics, and picks the card with the best contract outcome.
- For small enough remaining positions, card play first calls `src/game/exactDoubleDummy.js` for exact minimax/double-dummy search before falling back to tactical and rollout logic.
- `src/game/actions.js` exposes legal turn actions, which is the foundation for making the same bot play against a human-controlled side later.
- `src/game/interactiveSession.js` keeps the current browser deal alive on the server, applies the chosen contract without reshuffling, auto-plays bot turns, and returns only the human side's legal cards as clickable actions.

## Poker-Dool prototype logic

- `src/pokerDool/session.js` runs the live two-player betting hand.
- `src/pokerDool/deck.js` defines the 36/52 and 24/36 deck variants, samples the random 36-card universe for 24/36, and deals by shuffling first, then distributing one card at a time around the four seats.
- `src/pokerDool/bettingRules.js` defines table fee, ante, check/call/fold/bet/raise, max raises, max pot, and per-player commitment caps. The 36/52 game opens betting at preflop, trick 3, trick 5, trick 7, and trick 8; the 24/36 game opens at preflop, trick 2, trick 4, and trick 5.
- `src/pokerDool/handEvaluation.js` gives the model estimate shown in the UI: HCP, best trump fit, no-trump winners, trump losers, strength, and win estimate.
- Ready to Fold is a trump-bidding feature only: a player facing a trump bid can ask for a new target/trump offer before folding.
- `src/pokerDool/bettingBot.js` is kept for simulations and future AI; the current launch UI is a two-human shared-room prototype, not bot-controlled.
- `src/pokerDool/replayLog.js` tracks deal, betting, expose, muck, and showdown events for later replay/cash-out audit work.

## Why not raw RL yet?

This final draft uses a hybrid search bot instead of raw reinforcement learning. RL is still the next research step, but it needs thousands of self-play games, a stable reward function, and model evaluation before it is safe to present as the main bot. The current bot is explainable, deterministic enough to debug, works inside Docker, and can generate self-play data for RL later.
