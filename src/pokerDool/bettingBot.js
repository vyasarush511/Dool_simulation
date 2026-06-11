import { amountToCall, applyBettingAction, commitmentCapForTrick, legalBettingActions } from "./bettingRules.js";

export function chooseBettingAction({ state, player, equity, confidence, rules, rng = Math.random }) {
  const legal = legalBettingActions(state, player, rules);
  const toCall = amountToCall(state, player);
  const progress = Math.max(0, Math.min(1, state.trick / 10));
  const potOdds = toCall === 0 ? 0 : toCall / Math.max(1, state.pot + toCall);
  const cap = commitmentCapForTrick(state.trick, rules);
  const capRoom = Math.max(0, cap - state.committed[player]);
  const noisyEquity = clamp01(equity + (rng() - 0.5) * (1 - confidence) * 0.18);

  if (toCall > 0) {
    const foldBuffer = progress < 0.55 ? 0.18 : 0.06;
    const disastrous = noisyEquity < potOdds - 0.22 && toCall >= rules.minBet * 3;

    if ((progress >= 0.55 && noisyEquity < potOdds - foldBuffer) || disastrous) {
      return { type: "fold", player };
    }

    const raise = legal.find((action) => action.type === "raise");
    if (raise && noisyEquity >= 0.68 && confidence >= 0.58 && capRoom >= toCall + rules.minBet * 2) {
      return { type: "raise", player, amount: Math.min(raise.max, scaledBetSize(noisyEquity, progress, rules)) };
    }

    return { type: "call", player };
  }

  const bet = legal.find((action) => action.type === "bet");
  if (!bet) return { type: "check", player };

  const pressureThreshold = progress < 0.45 ? 0.64 : 0.56;
  const canPressure = noisyEquity >= pressureThreshold && confidence >= 0.42;

  if (!canPressure) return { type: "check", player };

  return {
    type: "bet",
    player,
    amount: Math.min(bet.max, scaledBetSize(noisyEquity, progress, rules)),
  };
}

export function playSimpleBettingRound({ state, firstPlayer, equities, confidences, rules, rng = Math.random }) {
  let next = state;
  const secondPlayer = (firstPlayer + 1) % 2;
  const firstAction = chooseBettingAction({
    state: next,
    player: firstPlayer,
    equity: equities[firstPlayer],
    confidence: confidences[firstPlayer],
    rules,
    rng,
  });
  next = applyBettingAction(next, firstAction, rules);

  if (next.folded.some(Boolean)) return next;

  const secondAction = chooseBettingAction({
    state: next,
    player: secondPlayer,
    equity: equities[secondPlayer],
    confidence: confidences[secondPlayer],
    rules,
    rng,
  });
  next = applyBettingAction(next, secondAction, rules);

  if (next.folded.some(Boolean)) return next;

  if (amountToCall(next, firstPlayer) > 0) {
    const closeAction = chooseBettingAction({
      state: next,
      player: firstPlayer,
      equity: equities[firstPlayer],
      confidence: confidences[firstPlayer],
      rules,
      rng,
    });
    next = applyBettingAction(next, closeAction, rules);
  }

  return next;
}

function scaledBetSize(equity, progress, rules) {
  const units = equity >= 0.76 ? 4 : equity >= 0.66 ? 3 : 2;
  const progressBoost = progress >= 0.65 ? 1.5 : progress >= 0.35 ? 1.15 : 1;
  return Math.max(rules.minBet, Math.round((rules.minBet * units * progressBoost) / rules.minBet) * rules.minBet);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
