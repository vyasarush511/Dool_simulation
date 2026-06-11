export const DEFAULT_BETTING_RULES = {
  tableFee: 10,
  ante: 10,
  minBet: 10,
  maxRaisesPerRound: 2,
  maxCommitmentPerPlayer: 300,
  maxPot: 600,
  commitmentCaps: [
    { trick: 0, cap: 40 },
    { trick: 3, cap: 80 },
    { trick: 5, cap: 140 },
    { trick: 7, cap: 220 },
    { trick: 9, cap: 300 },
  ],
};

export const BETTING_RULES_BY_VARIANT = {
  "36_52": {
    ...DEFAULT_BETTING_RULES,
    maxCommitmentPerPlayer: 320,
    maxPot: 640,
    commitmentCaps: [
      { trick: 0, cap: 50 },
      { trick: 3, cap: 90 },
      { trick: 5, cap: 160 },
      { trick: 7, cap: 250 },
      { trick: 8, cap: 320 },
    ],
  },
  "24_36": {
    ...DEFAULT_BETTING_RULES,
    maxCommitmentPerPlayer: 220,
    maxPot: 440,
    commitmentCaps: [
      { trick: 0, cap: 40 },
      { trick: 2, cap: 90 },
      { trick: 4, cap: 150 },
      { trick: 5, cap: 220 },
    ],
  },
};

export function rulesForVariant(variantId = "36_52") {
  const rules = BETTING_RULES_BY_VARIANT[variantId] ?? BETTING_RULES_BY_VARIANT["36_52"];
  return {
    ...rules,
    commitmentCaps: rules.commitmentCaps.map((entry) => ({ ...entry })),
  };
}

export function startBettingHand({ players = ["Player 1", "Player 2"], stacks = [1000, 1000], rules = DEFAULT_BETTING_RULES } = {}) {
  const state = {
    players,
    stacks: [...stacks],
    folded: players.map(() => false),
    pot: 0,
    tableFees: players.map(() => 0),
    committed: players.map(() => 0),
    roundCommitted: players.map(() => 0),
    currentBet: 0,
    raisesThisRound: 0,
    round: 0,
    trick: 0,
    actionLog: [],
  };

  for (let player = 0; player < players.length; player += 1) {
    chargeTableFee(state, player, rules.tableFee);
    postAnte(state, player, rules.ante);
  }

  return snapshotBettingState(state);
}

export function beginBettingRound(state, { trick }) {
  const next = cloneState(state);
  next.round += 1;
  next.trick = trick;
  next.roundCommitted = next.players.map(() => 0);
  next.currentBet = 0;
  next.raisesThisRound = 0;
  next.actionLog.push({
    type: "round_start",
    round: next.round,
    trick,
    cap: commitmentCapForTrick(trick),
  });
  return snapshotBettingState(next);
}

export function legalBettingActions(state, player, rules = DEFAULT_BETTING_RULES) {
  if (state.folded[player]) return [];

  const toCall = amountToCall(state, player);
  const capRemaining = playerCapRemaining(state, player, rules);
  const canAddMoney = capRemaining >= rules.minBet && state.pot < rules.maxPot && state.stacks[player] >= rules.minBet;
  const actions = [];

  if (toCall === 0) {
    actions.push({ type: "check" });
    if (canAddMoney) {
      actions.push({ type: "bet", min: rules.minBet, max: maxAdditionalPayment(state, player, rules) });
    }
    return actions;
  }

  actions.push({ type: "fold" });
  actions.push({ type: "call", amount: Math.min(toCall, capRemaining, state.stacks[player]) });

  if (canAddMoney && state.raisesThisRound < rules.maxRaisesPerRound) {
    const maxRaiseBy = Math.max(0, maxAdditionalPayment(state, player, rules) - toCall);
    if (maxRaiseBy >= rules.minBet) {
      actions.push({ type: "raise", min: rules.minBet, max: maxRaiseBy });
    }
  }

  return actions;
}

export function applyBettingAction(state, action, rules = DEFAULT_BETTING_RULES) {
  const next = cloneState(state);
  const player = Number(action.player);

  if (next.folded[player]) {
    throw new Error(`${next.players[player]} has already folded.`);
  }

  if (action.type === "check") {
    if (amountToCall(next, player) !== 0) throw new Error("Cannot check while facing a bet.");
    next.actionLog.push({ type: "check", player, round: next.round, trick: next.trick });
    return snapshotBettingState(next);
  }

  if (action.type === "fold") {
    next.folded[player] = true;
    next.actionLog.push({ type: "fold", player, round: next.round, trick: next.trick });
    return snapshotBettingState(next);
  }

  if (action.type === "call") {
    const payment = amountToCall(next, player);
    commitChips(next, player, payment, rules);
    next.actionLog.push({ type: "call", player, amount: payment, round: next.round, trick: next.trick });
    return snapshotBettingState(next);
  }

  if (action.type === "bet") {
    if (next.currentBet !== 0) throw new Error("Use raise instead of bet when a bet already exists.");
    const payment = sanitizeBetAmount(action.amount, rules);
    commitChips(next, player, payment, rules);
    next.currentBet = next.roundCommitted[player];
    next.actionLog.push({ type: "bet", player, amount: payment, round: next.round, trick: next.trick });
    return snapshotBettingState(next);
  }

  if (action.type === "raise") {
    const callAmount = amountToCall(next, player);
    const raiseBy = sanitizeBetAmount(action.amount, rules);
    commitChips(next, player, callAmount + raiseBy, rules);
    next.currentBet = next.roundCommitted[player];
    next.raisesThisRound += 1;
    next.actionLog.push({ type: "raise", player, callAmount, raiseBy, round: next.round, trick: next.trick });
    return snapshotBettingState(next);
  }

  throw new Error(`Unknown betting action: ${action.type}`);
}

export function scheduledBettingRounds({ totalTricks = 10, interval = 2, startTrick = 0, includeFinal = false } = {}) {
  const rounds = [];

  for (let trick = startTrick; trick <= totalTricks; trick += interval) {
    if (trick === totalTricks && !includeFinal) continue;
    rounds.push(trick);
  }

  return rounds;
}

export function amountToCall(state, player) {
  return Math.max(0, state.currentBet - state.roundCommitted[player]);
}

export function commitmentCapForTrick(trick, rules = DEFAULT_BETTING_RULES) {
  let cap = rules.commitmentCaps[0]?.cap ?? rules.maxCommitmentPerPlayer;

  for (const entry of rules.commitmentCaps) {
    if (trick >= entry.trick) cap = entry.cap;
  }

  return Math.min(cap, rules.maxCommitmentPerPlayer);
}

export function grossCollected(state) {
  return state.pot + state.tableFees.reduce((total, fee) => total + fee, 0);
}

function chargeTableFee(state, player, amount) {
  const payment = Math.min(amount, state.stacks[player]);
  state.stacks[player] -= payment;
  state.tableFees[player] += payment;
  state.actionLog.push({ type: "table_fee", player, amount: payment });
}

function postAnte(state, player, amount) {
  const payment = Math.min(amount, state.stacks[player]);
  state.stacks[player] -= payment;
  state.committed[player] += payment;
  state.pot += payment;
  state.actionLog.push({ type: "ante", player, amount: payment });
}

function commitChips(state, player, requestedAmount, rules) {
  const payment = Math.min(requestedAmount, maxAdditionalPayment(state, player, rules));

  if (payment < requestedAmount) {
    state.actionLog.push({
      type: "cap_clip",
      player,
      requestedAmount,
      paidAmount: payment,
      round: state.round,
      trick: state.trick,
    });
  }

  state.stacks[player] -= payment;
  state.committed[player] += payment;
  state.roundCommitted[player] += payment;
  state.pot += payment;
}

function maxAdditionalPayment(state, player, rules) {
  const capRemaining = playerCapRemaining(state, player, rules);
  const potRemaining = Math.max(0, rules.maxPot - state.pot);
  return Math.max(0, Math.min(capRemaining, potRemaining, state.stacks[player]));
}

function playerCapRemaining(state, player, rules) {
  const cap = commitmentCapForTrick(state.trick, rules);
  return Math.max(0, cap - state.committed[player]);
}

function sanitizeBetAmount(amount, rules) {
  const cleanAmount = Math.max(0, Number(amount));
  return Math.floor(cleanAmount / rules.minBet) * rules.minBet;
}

function cloneState(state) {
  return {
    ...state,
    stacks: [...state.stacks],
    folded: [...state.folded],
    tableFees: [...state.tableFees],
    committed: [...state.committed],
    roundCommitted: [...state.roundCommitted],
    actionLog: state.actionLog.map((entry) => ({ ...entry })),
  };
}

function snapshotBettingState(state) {
  return {
    ...cloneState(state),
    grossCollected: grossCollected(state),
  };
}
