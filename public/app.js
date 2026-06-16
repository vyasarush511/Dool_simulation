const seatLabels = ["N", "E", "S", "W"];
const sideNames = ["NS", "EW"];
const suitSymbols = {
  C: "\u2663",
  D: "\u2666",
  H: "\u2665",
  S: "\u2660",
};
const suitSortOrder = { S: 0, H: 1, D: 2, C: 3 };
const rankSortOrder = { A: 0, K: 1, Q: 2, J: 3, "10": 4, "9": 5, "8": 6, "7": 7, "6": 8, "5": 9, "4": 10, "3": 11, "2": 12 };

const state = {
  game: null,
  poker: null,
  mode: "poker",
  viewerPlayer: readViewerPlayer(),
  selectedVariant: new URLSearchParams(window.location.search).get("variant") ?? "36_52",
  selectedDealStyle: new URLSearchParams(window.location.search).get("deal") ?? "standard",
  pokerSessionId: new URLSearchParams(window.location.search).get("room"),
  selectedTrickNumber: null,
  busy: false,
};

const els = {
  sidePanel: document.querySelector(".side-panel"),
  classicModeButton: document.querySelector("#classicModeButton"),
  pokerModeButton: document.querySelector("#pokerModeButton"),
  tableTitle: document.querySelector("#tableTitle"),
  contractText: document.querySelector("#contractText"),
  trumpText: document.querySelector("#trumpText"),
  trickScoreText: document.querySelector("#trickScoreText"),
  scoreText: document.querySelector("#scoreText"),
  statusLine: document.querySelector("#statusLine"),
  currentTrick: document.querySelector("#currentTrick"),
  botAnalysis: document.querySelector("#botAnalysis"),
  bidHistory: document.querySelector("#bidHistory"),
  playHistory: document.querySelector("#playHistory"),
  resetButton: document.querySelector("#resetButton"),
  newPokerHandButton: document.querySelector("#newPokerHandButton"),
  startContractButton: document.querySelector("#startContractButton"),
  passButton: document.querySelector("#passButton"),
  humanSideSelect: document.querySelector("#humanSideSelect"),
  declarerSelect: document.querySelector("#declarerSelect"),
  levelSelect: document.querySelector("#levelSelect"),
  suitSelect: document.querySelector("#suitSelect"),
  contractPanel: document.querySelector(".contract-panel"),
  analysisPanel: document.querySelector(".analysis-panel"),
  pokerPanel: document.querySelector("#pokerPanel"),
  pokerAnalysisPanel: document.querySelector("#pokerAnalysisPanel"),
  pokerAnalysis: document.querySelector("#pokerAnalysis"),
  bidPanelTitle: document.querySelector("#bidPanelTitle"),
  playPanelTitle: document.querySelector("#playPanelTitle"),
  pokerPotText: document.querySelector("#pokerPotText"),
  pokerGrossText: document.querySelector("#pokerGrossText"),
  pokerTrickText: document.querySelector("#pokerTrickText"),
  pokerCapText: document.querySelector("#pokerCapText"),
  pokerTurnText: document.querySelector("#pokerTurnText"),
  gameVariantSelect: document.querySelector("#gameVariantSelect"),
  dealStyleSelect: document.querySelector("#dealStyleSelect"),
  variantInfoText: document.querySelector("#variantInfoText"),
  deckUniverseButton: document.querySelector("#deckUniverseButton"),
  deckUniverseDock: document.querySelector("#deckUniverseDock"),
  deckUniverseCountText: document.querySelector("#deckUniverseCountText"),
  deckUniverseDockBody: document.querySelector("#deckUniverseDockBody"),
  deckUniverseDockGrid: document.querySelector("#deckUniverseDockGrid"),
  trickHistoryList: document.querySelector("#trickHistoryList"),
  deckUniverseModal: document.querySelector("#deckUniverseModal"),
  deckUniverseTitle: document.querySelector("#deckUniverseTitle"),
  deckUniverseBody: document.querySelector("#deckUniverseBody"),
  deckUniverseGrid: document.querySelector("#deckUniverseGrid"),
  closeDeckUniverseButton: document.querySelector("#closeDeckUniverseButton"),
  closeDeckUniverseTopButton: document.querySelector("#closeDeckUniverseTopButton"),
  pokerContractSelect: document.querySelector("#pokerContractSelect"),
  pokerTrumpSelect: document.querySelector("#pokerTrumpSelect"),
  pokerToCallText: document.querySelector("#pokerToCallText"),
  pokerStackText: document.querySelector("#pokerStackText"),
  pokerCommitText: document.querySelector("#pokerCommitText"),
  bettingModal: document.querySelector("#bettingModal"),
  bettingStageText: document.querySelector("#bettingStageText"),
  bettingModalTitle: document.querySelector("#bettingModalTitle"),
  modalPotText: document.querySelector("#modalPotText"),
  modalContractControls: document.querySelector("#modalContractControls"),
  modalContractSelect: document.querySelector("#modalContractSelect"),
  modalTrumpSelect: document.querySelector("#modalTrumpSelect"),
  viewerText: document.querySelector("#viewerText"),
  copyPlayerOneLinkButton: document.querySelector("#copyPlayerOneLinkButton"),
  copyPlayerTwoLinkButton: document.querySelector("#copyPlayerTwoLinkButton"),
  nextBettingRoundButton: document.querySelector("#nextBettingRoundButton"),
  readyFoldButton: document.querySelector("#readyFoldButton"),
  readyFoldHint: document.querySelector("#readyFoldHint"),
  modalReadyFoldButton: document.querySelector("#modalReadyFoldButton"),
  checkButton: document.querySelector("#checkButton"),
  callButton: document.querySelector("#callButton"),
  foldButton: document.querySelector("#foldButton"),
  betAmountInput: document.querySelector("#betAmountInput"),
  betRaiseButton: document.querySelector("#betRaiseButton"),
  readyFoldModal: document.querySelector("#readyFoldModal"),
  readyFoldTitle: document.querySelector("#readyFoldTitle"),
  readyFoldBody: document.querySelector("#readyFoldBody"),
  saveOfferControls: document.querySelector("#saveOfferControls"),
  saveOfferContractField: document.querySelector("#saveOfferContractField"),
  saveOfferTrumpField: document.querySelector("#saveOfferTrumpField"),
  saveOfferContractSelect: document.querySelector("#saveOfferContractSelect"),
  saveOfferTrumpSelect: document.querySelector("#saveOfferTrumpSelect"),
  saveOfferAmountInput: document.querySelector("#saveOfferAmountInput"),
  makeSaveOfferButton: document.querySelector("#makeSaveOfferButton"),
  letFoldButton: document.querySelector("#letFoldButton"),
  acceptOfferControls: document.querySelector("#acceptOfferControls"),
  acceptSaveOfferButton: document.querySelector("#acceptSaveOfferButton"),
  rejectSaveOfferButton: document.querySelector("#rejectSaveOfferButton"),
  trickDetailModal: document.querySelector("#trickDetailModal"),
  trickDetailTitle: document.querySelector("#trickDetailTitle"),
  trickDetailBody: document.querySelector("#trickDetailBody"),
  trickDetailCards: document.querySelector("#trickDetailCards"),
  closeTrickDetailButton: document.querySelector("#closeTrickDetailButton"),
  closeTrickDetailTopButton: document.querySelector("#closeTrickDetailTopButton"),
};

els.classicModeButton.addEventListener("click", () => setMode("classic"));
els.pokerModeButton.addEventListener("click", () => setMode("poker"));
els.resetButton.addEventListener("click", () => createNewSession());
els.newPokerHandButton.addEventListener("click", () => redealPokerSession());
els.startContractButton.addEventListener("click", () => applyContractToCurrentDeal());
els.passButton.addEventListener("click", () => passToBot());
els.humanSideSelect.addEventListener("change", () => createNewSession());
els.nextBettingRoundButton.addEventListener("click", () => startNextBettingRound());
els.gameVariantSelect.addEventListener("change", () => changePokerVariant());
els.dealStyleSelect.addEventListener("change", () => changeDealStyle());
els.deckUniverseButton.addEventListener("click", () => openDeckUniverseModal());
els.closeDeckUniverseButton.addEventListener("click", () => closeDeckUniverseModal());
els.closeDeckUniverseTopButton.addEventListener("click", () => closeDeckUniverseModal());
els.closeTrickDetailButton.addEventListener("click", () => closeTrickDetailModal());
els.closeTrickDetailTopButton.addEventListener("click", () => closeTrickDetailModal());
els.pokerContractSelect.addEventListener("change", () => setPokerContract());
els.pokerTrumpSelect.addEventListener("change", () => setPokerContract());
els.copyPlayerOneLinkButton.addEventListener("click", () => copyShareLink(0));
els.copyPlayerTwoLinkButton.addEventListener("click", () => copyShareLink(1));
els.readyFoldButton.addEventListener("click", () => requestReadyFold());
els.modalReadyFoldButton.addEventListener("click", () => requestReadyFold());
els.checkButton.addEventListener("click", () => sendPokerAction({ type: "check" }));
els.callButton.addEventListener("click", () => sendPokerAction({ type: "call" }));
els.foldButton.addEventListener("click", () => sendPokerAction({ type: "fold" }));
els.betRaiseButton.addEventListener("click", () => {
  const action = currentBetRaiseAction();
  if (!action) return;
  sendPokerAction({ type: action.type, amount: Number(els.betAmountInput.value) });
});
els.makeSaveOfferButton.addEventListener("click", () =>
  sendReadyFoldResponse({
    action: "offer",
    amount: Number(els.saveOfferAmountInput.value),
    contractTricks: Number(els.saveOfferContractSelect.value),
    trumpSuit: els.saveOfferTrumpSelect.value,
  }),
);
els.letFoldButton.addEventListener("click", () => sendReadyFoldResponse({ action: "let_fold" }));
els.acceptSaveOfferButton.addEventListener("click", () => sendReadyFoldResponse({ action: "accept" }));
els.rejectSaveOfferButton.addEventListener("click", () => sendReadyFoldResponse({ action: "fold" }));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDeckUniverseModal();
    closeTrickDetailModal();
  }
});

els.gameVariantSelect.value = state.selectedVariant;
els.dealStyleSelect.value = state.selectedDealStyle;

if (state.mode === "poker") {
  if (state.pokerSessionId) {
    await refreshPokerSession();
  } else {
    await createPokerSession();
  }
} else {
  await createNewSession();
}

window.setInterval(() => {
  if (state.mode === "poker" && state.pokerSessionId && !state.busy) {
    if (state.poker?.activeRound && state.poker?.currentTurn?.isViewer) return;
    if (state.poker?.foldNegotiation && state.poker?.currentTurn?.isViewer) return;
    refreshPokerSession({ silent: true });
  }
}, 1200);

async function setMode(mode) {
  state.mode = mode;

  if (mode === "classic" && !state.game) {
    await createNewSession();
    return;
  }

  if (mode === "poker" && !state.poker) {
    await createPokerSession();
    return;
  }

  render();
}

async function createNewSession() {
  await runRequest(async () => {
    state.game = await postJson("/api/session/new", {
      humanSide: Number(els.humanSideSelect.value),
    });
  });
}

async function createPokerSession() {
  await runRequest(async () => {
    state.viewerPlayer = 0;
    state.selectedVariant = els.gameVariantSelect.value || state.selectedVariant;
    state.selectedDealStyle = els.dealStyleSelect.value || state.selectedDealStyle;
    state.poker = await postJson("/api/poker-dool/new", {
      player: state.viewerPlayer,
      variant: state.selectedVariant,
      dealStyle: state.selectedDealStyle,
    });
    state.pokerSessionId = state.poker.sessionId;
    updatePokerUrl();
  });
}

async function redealPokerSession() {
  if (!state.pokerSessionId) {
    await createPokerSession();
    return;
  }

  await runRequest(async () => {
    state.selectedVariant = els.gameVariantSelect.value || state.selectedVariant;
    state.selectedDealStyle = els.dealStyleSelect.value || state.selectedDealStyle;
    state.poker = await postJson("/api/poker-dool/redeal", {
      sessionId: state.pokerSessionId,
      player: state.viewerPlayer,
      variant: state.selectedVariant,
      dealStyle: state.selectedDealStyle,
    });
    state.pokerSessionId = state.poker.sessionId;
    updatePokerUrl();
  });
}

async function refreshPokerSession({ silent = false } = {}) {
  if (!state.pokerSessionId) return;

  const action = async () => {
    state.poker = await postJson("/api/poker-dool/view", {
      sessionId: state.pokerSessionId,
      player: state.viewerPlayer,
    });
  };

  if (silent) {
    try {
      await action();
      render();
    } catch {
      // Ignore transient refresh failures so the active player is not interrupted.
    }
    return;
  }

  await runRequest(action);
}

async function applyContractToCurrentDeal() {
  if (!state.game) return;

  await runRequest(async () => {
    state.game = await postJson("/api/session/contract", {
      sessionId: state.game.sessionId,
      humanSide: Number(els.humanSideSelect.value),
      contract: readSelectedContract(),
    });
  });
}

async function passToBot() {
  if (!state.game) return;

  await runRequest(async () => {
    state.game = await postJson("/api/session/pass", {
      sessionId: state.game.sessionId,
      humanSide: Number(els.humanSideSelect.value),
    });
  });
}

async function startNextBettingRound() {
  if (!state.poker) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/next-round", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
    });
  });
}

async function changePokerVariant() {
  state.selectedVariant = els.gameVariantSelect.value;
  await redealPokerSession();
}

async function changeDealStyle() {
  state.selectedDealStyle = els.dealStyleSelect.value;
  await redealPokerSession();
}

async function setPokerTrump() {
  if (!state.poker || state.busy) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/trump", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
      trumpSuit: els.pokerTrumpSelect.value,
    });
  });
}

async function setPokerContract() {
  if (!state.poker || state.busy) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/contract", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
      contractTricks: Number(els.pokerContractSelect.value),
      trumpSuit: els.pokerTrumpSelect.value,
    });
  });
}

async function sendPokerAction(action) {
  if (!state.poker || state.busy) return;

  const finalAction = { ...action };
  if (isPreflopBetting(state.poker) && ["bet", "raise"].includes(finalAction.type)) {
    finalAction.contractTricks = Number(els.modalContractSelect.value);
    finalAction.trumpSuit = els.modalTrumpSelect.value;
  }

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/action", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
      action: finalAction,
    });
  });
}

async function playPokerCard(seat, card) {
  if (!state.poker || state.busy) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/card", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
      seat,
      card,
    });
  });
}

async function requestReadyFold() {
  if (!state.poker || state.busy) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/ready-fold", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
    });
  });
}

async function sendReadyFoldResponse({ action, amount }) {
  if (!state.poker || state.busy) return;

  await runRequest(async () => {
    state.poker = await postJson("/api/poker-dool/ready-fold-response", {
      sessionId: state.poker.sessionId,
      player: state.viewerPlayer,
      action,
      amount,
      contractTricks: Number(els.saveOfferContractSelect.value),
      trumpSuit: els.saveOfferTrumpSelect.value,
    });
  });
}

async function playCard(seat, card) {
  if (!state.game || state.busy) return;

  await runRequest(async () => {
    state.game = await postJson("/api/session/card", {
      sessionId: state.game.sessionId,
      seat,
      card,
    });
  });
}

async function runRequest(action) {
  try {
    setBusy(true);
    await action();
  } catch (error) {
    els.statusLine.textContent = error.message;
  } finally {
    setBusy(false);
    render();
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

function setBusy(busy) {
  state.busy = busy;
  if (!busy) return;

  els.startContractButton.disabled = busy;
  els.passButton.disabled = busy;
  els.resetButton.disabled = busy;
  els.newPokerHandButton.disabled = busy;
  els.nextBettingRoundButton.disabled = busy;
  els.readyFoldButton.disabled = busy;
  els.deckUniverseButton.disabled = busy;
  els.modalReadyFoldButton.disabled = busy;
  els.gameVariantSelect.disabled = busy;
  els.dealStyleSelect.disabled = busy;
  els.pokerContractSelect.disabled = busy;
  els.pokerTrumpSelect.disabled = busy;
  els.checkButton.disabled = busy;
  els.callButton.disabled = busy;
  els.foldButton.disabled = busy;
  els.betRaiseButton.disabled = busy;
  els.modalContractSelect.disabled = busy;
  els.modalTrumpSelect.disabled = busy;
  els.makeSaveOfferButton.disabled = busy;
  els.letFoldButton.disabled = busy;
  els.acceptSaveOfferButton.disabled = busy;
  els.rejectSaveOfferButton.disabled = busy;
}

function render() {
  renderModePanels();

  if (state.mode === "poker") {
    if (!state.poker) return;
    renderPoker();
    return;
  }

  if (!state.game) return;

  renderSeatRoles();
  renderHeader();
  renderAnalysis();
  renderHands();
  renderCurrentTrick();
  renderHistory();
  renderStatus();
}

function renderModePanels() {
  const isPoker = state.mode === "poker";
  els.classicModeButton.classList.toggle("is-active", !isPoker);
  els.pokerModeButton.classList.toggle("is-active", isPoker);
  els.contractPanel.classList.toggle("is-hidden", isPoker);
  els.analysisPanel.classList.toggle("is-hidden", isPoker);
  els.pokerPanel.classList.toggle("is-hidden", !isPoker);
  els.pokerAnalysisPanel.classList.toggle("is-hidden", !isPoker);
  els.deckUniverseDock.classList.toggle("is-hidden", !isPoker);
  els.sidePanel.classList.toggle("is-poker", isPoker);
  if (!isPoker) els.bettingModal.classList.add("is-hidden");
  if (!isPoker) els.readyFoldModal.classList.add("is-hidden");
  if (!isPoker) els.deckUniverseModal.classList.add("is-hidden");
  els.resetButton.classList.toggle("is-hidden", isPoker);
  els.newPokerHandButton.classList.toggle("is-hidden", !isPoker);
  els.bidPanelTitle.textContent = isPoker ? "Ledger" : "Bidding";
  els.playPanelTitle.textContent = isPoker ? "Hand" : "Play";
}

function renderPoker() {
  renderPokerSeatRoles();
  renderPokerHeader();
  renderPokerHands();
  renderPokerCurrentTrick();
  renderPokerPanel();
  renderDeckUniverseDock();
  renderTrickHistory();
  renderTrickDetailModal();
  renderReadyFoldModal();
  if (!els.deckUniverseModal.classList.contains("is-hidden")) renderDeckUniverseModal();
  renderPokerAnalysis();
  renderPokerHistory();
  renderPokerStatus();
}

function renderPokerSeatRoles() {
  els.tableTitle.textContent = `Poker-Dool ${state.poker.variant.label}`;

  const labels = ["Player 1 front", "Player 2 front", "Player 1 back", "Player 2 back"];
  const visualMap = visualSeatMap();
  for (let visualSeat = 0; visualSeat < 4; visualSeat += 1) {
    const actualSeat = visualMap[visualSeat];
    const roleEl = document.querySelector(`#seat-role-${visualSeat}`);
    roleEl.textContent = labels[actualSeat];
  }
}

function renderPokerHeader() {
  const poker = state.poker;
  els.contractText.textContent = `${poker.contractTricks} tricks`;
  els.trumpText.textContent = formatTrump(poker.trumpSuit);
  els.trickScoreText.textContent = `${poker.tricksWon[0]} - ${poker.tricksWon[1]}`;
  els.scoreText.textContent = `Pot ${poker.betting.pot}`;
}

function renderPokerHands() {
  const visualMap = visualSeatMap();
  for (let visualSeat = 0; visualSeat < 4; visualSeat += 1) {
    const actualSeat = visualMap[visualSeat];
    const handEl = document.querySelector(`#hand-${visualSeat}`);
    handEl.innerHTML = "";

    const legalCards = new Set(state.poker.currentTurn?.legalCards ?? []);
    const activeSeat = state.poker.currentTurn?.seat;

    for (const label of sortHandLabels(state.poker.hands[actualSeat])) {
      const card = label ? parseCard(label) : { hidden: true };
      const isLegal = label && state.poker.currentTurn?.type === "card" && actualSeat === activeSeat && legalCards.has(label);
      handEl.append(cardElement(card, { seat: actualSeat, isLegal }));
    }
  }
}

function renderPokerCurrentTrick() {
  els.currentTrick.innerHTML = `
    <div class="table-pot">
      <span>Pot</span>
      <strong>${state.poker.betting.pot}</strong>
      <small>${state.poker.message}</small>
    </div>
  `;

  for (const play of state.poker.tableTrick ?? state.poker.currentTrick) {
    const cardEl = cardElement(parseCard(play.card), { seat: play.seat, isLegal: false });
    cardEl.classList.add("played-card", `seat-${actualToVisualSeat(play.seat)}`);
    els.currentTrick.append(cardEl);
  }
}

function renderPokerPanel() {
  const poker = state.poker;
  const legalTypes = new Set((poker.activeActions ?? poker.humanActions).map((action) => action.type));
  const betRaise = currentBetRaiseAction();
  const activePlayer = poker.pendingPlayer ?? 0;
  const activeStack = poker.betting.stacks[activePlayer];
  const activeCommitted = poker.betting.committed[activePlayer];

  syncContractOptions(els.pokerContractSelect, poker.minimumContract, poker.totalTricks);
  syncContractOptions(els.modalContractSelect, poker.minimumContract, poker.totalTricks);
  syncContractOptions(els.saveOfferContractSelect, poker.minimumContract, poker.totalTricks);
  state.selectedVariant = poker.variant.id;
  state.selectedDealStyle = poker.dealStyle?.id ?? state.selectedDealStyle;
  els.gameVariantSelect.value = poker.variant.id;
  els.dealStyleSelect.value = state.selectedDealStyle;
  els.variantInfoText.textContent = `${poker.deckSummary} Deal: ${poker.dealStyle?.label ?? "Standard"}${poker.dealPattern?.length ? ` (${poker.dealPattern.join("-")})` : ""}. Betting rounds: ${poker.bettingRounds.map(formatRoundLabel).join(", ")}.`;
  els.deckUniverseButton.textContent = `Expand Universe (${remainingUniverseCount(poker)}/${poker.totalDeckCards})`;
  els.pokerPotText.textContent = poker.betting.pot;
  els.pokerGrossText.textContent = poker.betting.grossCollected;
  els.pokerTrickText.textContent = poker.activeRound ? "Betting now" : nextStepLabel(poker);
  els.pokerCapText.textContent = poker.activeRound ? `${poker.currentCap}` : "-";
  els.pokerTurnText.textContent = poker.activeRound ? `${poker.pendingPlayerName} to act` : "Waiting";
  els.viewerText.textContent = poker.viewerName;
  els.pokerContractSelect.value = String(poker.contractTricks);
  els.pokerTrumpSelect.value = poker.trumpSuit;
  els.modalContractSelect.value = String(poker.contractTricks);
  els.modalTrumpSelect.value = poker.trumpSuit;
  els.saveOfferContractSelect.value = String(poker.contractTricks);
  els.saveOfferTrumpSelect.value = poker.trumpSuit;
  els.gameVariantSelect.disabled =
    state.busy || state.viewerPlayer !== 0 || poker.activeRound || poker.nextRoundIndex > 0 || poker.folded || poker.showdown;
  els.dealStyleSelect.disabled =
    state.busy || state.viewerPlayer !== 0 || poker.activeRound || poker.nextRoundIndex > 0 || poker.folded || poker.showdown;
  els.pokerContractSelect.disabled =
    state.busy || state.viewerPlayer !== 0 || poker.activeRound || poker.nextRoundIndex > 0 || poker.folded || poker.showdown;
  els.pokerTrumpSelect.disabled =
    state.busy || state.viewerPlayer !== 0 || poker.activeRound || poker.nextRoundIndex > 0 || poker.folded || poker.showdown;
  els.pokerToCallText.textContent = poker.amountToCall;
  els.pokerStackText.textContent = activeStack;
  els.pokerCommitText.textContent = activeCommitted;
  els.modalPotText.textContent = poker.betting.pot;
  els.bettingStageText.textContent = bettingWindowTitle(poker.betting.trick);
  els.bettingModalTitle.textContent = poker.pendingPlayerName ? bettingModalTitle(poker) : "Betting complete";
  els.bettingModal.classList.toggle("is-hidden", !(poker.activeRound && poker.currentTurn?.type === "betting" && poker.currentTurn?.isViewer));
  els.modalContractControls.classList.toggle("is-hidden", !isPreflopBetting(poker));
  els.modalContractSelect.disabled = state.busy || !isPreflopBetting(poker) || !poker.currentTurn?.isViewer;
  els.modalTrumpSelect.disabled = state.busy || !isPreflopBetting(poker) || !poker.currentTurn?.isViewer;

  els.nextBettingRoundButton.disabled = state.busy || !canOpenFirstBettingWindow(poker);
  els.nextBettingRoundButton.classList.toggle("is-hidden", poker.nextRoundIndex > 0 || poker.folded || poker.showdown);
  els.nextBettingRoundButton.textContent = nextButtonLabel(poker);
  const canReadyFold = canUseReadyFold(poker);
  els.readyFoldButton.disabled = state.busy || !canReadyFold;
  els.modalReadyFoldButton.disabled = state.busy || !canReadyFold;
  els.modalReadyFoldButton.classList.toggle("is-hidden", false);
  els.readyFoldHint.textContent = readyFoldHint(poker);
  els.checkButton.disabled = state.busy || !legalTypes.has("check");
  els.checkButton.textContent = isPreflopBetting(poker) ? "Pass" : "Check";
  els.callButton.disabled = state.busy || !legalTypes.has("call");
  els.callButton.textContent = poker.amountToCall > 0 ? `Call ${poker.amountToCall}` : "Call";
  els.foldButton.disabled = state.busy || !legalTypes.has("fold");

  els.betRaiseButton.disabled = state.busy || !betRaise;
  els.betRaiseButton.textContent = isPreflopBetting(poker) || betRaise?.type === "raise" ? "Raise" : "Bet";
  els.betAmountInput.disabled = state.busy || !betRaise;
  els.newPokerHandButton.disabled = state.busy;
  els.deckUniverseButton.disabled = state.busy || !remainingUniverseCards(poker).length;

  if (betRaise) {
    els.betAmountInput.min = betRaise.min;
    els.betAmountInput.max = betRaise.max;
    if (Number(els.betAmountInput.value) < betRaise.min || Number(els.betAmountInput.value) > betRaise.max) {
      els.betAmountInput.value = Math.min(betRaise.max, Math.max(betRaise.min, 20));
    }
  }
}

function renderReadyFoldModal() {
  const negotiation = state.poker.foldNegotiation;
  const showModal = Boolean(negotiation && state.poker.currentTurn?.type === "ready_fold" && state.poker.currentTurn?.isViewer);

  els.readyFoldModal.classList.toggle("is-hidden", !showModal);
  if (!showModal) return;

  if (negotiation.status === "awaiting_offer" && negotiation.isResponder) {
    const isTrumpBid = negotiation.phase === "trump_bidding";
    els.readyFoldTitle.textContent = `${negotiation.requesterName} may fold`;
    els.readyFoldBody.textContent = isTrumpBid
      ? `Offer a new target/trump to keep ${negotiation.requesterName} in the hand, or let them fold now.`
      : `Offer chips into the pot to keep ${negotiation.requesterName} in this betting round, or let them fold now.`;
    els.saveOfferControls.classList.remove("is-hidden");
    els.acceptOfferControls.classList.add("is-hidden");
    els.saveOfferContractField.classList.toggle("is-hidden", !isTrumpBid);
    els.saveOfferTrumpField.classList.toggle("is-hidden", !isTrumpBid);
    els.saveOfferContractSelect.value = String(negotiation.proposedContractTricks ?? state.poker.contractTricks);
    els.saveOfferTrumpSelect.value = negotiation.proposedTrumpSuit ?? state.poker.trumpSuit;
    els.saveOfferAmountInput.min = 0;
    els.saveOfferAmountInput.max = negotiation.maxOffer;
    if (Number(els.saveOfferAmountInput.value) < 0 || Number(els.saveOfferAmountInput.value) > negotiation.maxOffer) {
      els.saveOfferAmountInput.value = 0;
    }
    els.makeSaveOfferButton.textContent = isTrumpBid ? "Make Bid Offer" : "Make Continue Offer";
    els.makeSaveOfferButton.disabled = state.busy;
    els.letFoldButton.disabled = state.busy;
    return;
  }

  if (negotiation.status === "awaiting_accept" && negotiation.isRequester) {
    const potOfferText = negotiation.offerAmount > 0 ? ` plus ${negotiation.offerAmount} into the pot` : "";
    if (negotiation.phase === "trump_bidding") {
      els.readyFoldTitle.textContent = `${negotiation.responderName} offers ${negotiation.proposedContractTricks} with ${formatTrump(negotiation.proposedTrumpSuit)}`;
      els.readyFoldBody.textContent = `Accept this trump bid${potOfferText}, or fold the hand now.`;
    } else {
      els.readyFoldTitle.textContent = `${negotiation.responderName} offers to continue`;
      els.readyFoldBody.textContent = `Accept${potOfferText || " this continue offer"}, or fold the hand now.`;
    }
    els.saveOfferControls.classList.add("is-hidden");
    els.acceptOfferControls.classList.remove("is-hidden");
    els.acceptSaveOfferButton.disabled = state.busy;
    els.rejectSaveOfferButton.disabled = state.busy;
  }
}

function openDeckUniverseModal() {
  if (!remainingUniverseCards(state.poker).length) return;

  els.deckUniverseModal.classList.remove("is-hidden");
  renderDeckUniverseModal();
}

function closeDeckUniverseModal() {
  els.deckUniverseModal.classList.add("is-hidden");
}

function openTrickDetailModal(trickNumber) {
  state.selectedTrickNumber = Number(trickNumber);
  els.trickDetailModal.classList.remove("is-hidden");
  renderTrickDetailModal();
}

function closeTrickDetailModal() {
  state.selectedTrickNumber = null;
  els.trickDetailModal.classList.add("is-hidden");
}

function renderDeckUniverseModal() {
  const poker = state.poker;
  const cards = remainingUniverseCards(poker);
  els.deckUniverseTitle.textContent = `${poker.variant.label} Remaining Universe`;
  els.deckUniverseBody.textContent = universeBodyText(poker);
  renderDeckUniverseCards(els.deckUniverseGrid, cards);
}

function renderDeckUniverseDock() {
  const poker = state.poker;
  const cards = remainingUniverseCards(poker);
  els.deckUniverseCountText.textContent = `${cards.length} / ${poker.totalDeckCards}`;
  els.deckUniverseDockBody.textContent = universeBodyText(poker);
  renderDeckUniverseCards(els.deckUniverseDockGrid, cards);
}

function renderDeckUniverseCards(gridEl, cards) {
  gridEl.innerHTML = "";

  for (const suit of ["S", "H", "D", "C"]) {
    const group = document.createElement("section");
    group.className = "deck-suit-group";
    const suitCards = sortHandLabels(cards.filter((label) => label?.endsWith(suit)));
    group.innerHTML = `<h3>${suitSymbols[suit]} ${suitName(suit)} <span>${suitCards.length}</span></h3>`;

    const row = document.createElement("div");
    row.className = "deck-card-row";
    for (const label of suitCards) {
      row.append(cardElement(parseCard(label), { seat: null, isLegal: false }));
    }
    group.append(row);
    gridEl.append(group);
  }
}

function renderTrickHistory() {
  const tricks = state.poker.completedTricks ?? [];
  els.trickHistoryList.innerHTML = "";

  if (tricks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "trick-history-empty";
    empty.textContent = "No completed tricks yet.";
    els.trickHistoryList.append(empty);
    return;
  }

  for (const trick of [...tricks].reverse()) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "trick-history-row";
    row.innerHTML = `
      <span>Trick ${trick.trick}</span>
      <strong>${state.poker.players[trick.winnerPlayer]} via ${seatLabels[trick.winnerSeat]}</strong>
      <small>${trick.cards.map((play) => `${seatLabels[play.seat]} ${play.card}`).join(" | ")}</small>
    `;
    row.addEventListener("click", () => openTrickDetailModal(trick.trick));
    els.trickHistoryList.append(row);
  }
}

function renderTrickDetailModal() {
  if (els.trickDetailModal.classList.contains("is-hidden")) return;

  const trick = (state.poker.completedTricks ?? []).find((candidate) => candidate.trick === state.selectedTrickNumber);
  if (!trick) {
    closeTrickDetailModal();
    return;
  }

  els.trickDetailTitle.textContent = `Trick ${trick.trick}`;
  els.trickDetailBody.textContent = `${state.poker.players[trick.winnerPlayer]} won from ${seatLabels[trick.winnerSeat]}.`;
  els.trickDetailCards.innerHTML = "";

  for (const play of trick.cards) {
    const item = document.createElement("div");
    item.className = "trick-detail-card";
    item.innerHTML = `<span>${seatLabels[play.seat]}</span>`;
    item.append(cardElement(parseCard(play.card), { seat: play.seat, isLegal: false }));
    els.trickDetailCards.append(item);
  }
}

function universeBodyText(poker) {
  const played = poker.playedUniverseCards?.length ?? 0;
  const source =
    poker.variant.id === "24_36"
      ? "Random 36-card universe from the full deck."
      : "Full 52-card universe.";
  return `${source} ${played} played card${played === 1 ? "" : "s"} removed live.`;
}

function remainingUniverseCards(poker) {
  return poker?.remainingUniverseCards ?? poker?.deckUniverseCards ?? [];
}

function remainingUniverseCount(poker) {
  return remainingUniverseCards(poker).length;
}

function renderPokerAnalysis() {
  els.pokerAnalysis.innerHTML = "";

  for (const evaluation of state.poker.evaluations) {
    if (evaluation.side !== state.viewerPlayer) continue;

    const row = document.createElement("div");
    row.className = "analysis-row";
    row.innerHTML = `
      <strong>${state.poker.players[evaluation.side]}</strong>
      <span>${Math.round(evaluation.equity * 100)}% win estimate | ${evaluation.hcp} HCP | ${evaluation.bestTrumpFit} ${evaluation.bestTrumpSuit} fit | ${evaluation.noTrumpWinners} NT winners | ${evaluation.trumpLosers} trump losers</span>
    `;
    els.pokerAnalysis.append(row);
  }
}

function renderPokerHistory() {
  els.bidHistory.innerHTML = "";
  els.playHistory.innerHTML = "";

  for (const event of state.poker.events) {
    els.bidHistory.append(historyRow(formatPokerEvent(event)));
  }

  els.playHistory.append(historyRow(`Contract: ${state.poker.contractTricks} tricks with ${formatTrump(state.poker.trumpSuit)}`));
  els.playHistory.append(historyRow(`${state.poker.totalCards}/${state.poker.totalDeckCards}: ${state.poker.cardsPerSeat} cards per hand, ${state.poker.deadCards} hidden`));
  els.playHistory.append(historyRow(state.poker.deckSummary));
  els.playHistory.append(historyRow(`You can only see ${state.poker.viewerName}'s cards`));
  if (state.poker.goalReached) {
    els.playHistory.append(historyRow(`Goal reached; remaining cards mucked`));
  } else {
    els.playHistory.append(historyRow(state.poker.folded ? "Hand ended by fold" : "System opens betting windows when needed"));
  }
}

function renderPokerStatus() {
  els.statusLine.textContent = state.poker.message;
}

function renderSeatRoles() {
  els.tableTitle.textContent = `${sideNames[state.game.humanSide]} Human vs ${sideNames[(state.game.humanSide + 1) % 2]} Bot`;

  for (let seat = 0; seat < 4; seat += 1) {
    const roleEl = document.querySelector(`#seat-role-${seat}`);
    const side = sideForSeat(seat);
    roleEl.textContent = side === state.game.humanSide ? `${sideNames[side]} Human` : `${sideNames[side]} Bot`;
  }
}

function renderHeader() {
  const contract = state.game.contract;
  els.contractText.textContent = contract ? `${contract.level}${contract.suit} ${sideNames[contract.declarer]}` : "-";
  els.trumpText.textContent = contract ? state.game.trumpSuit ?? "NT" : "-";
  els.trickScoreText.textContent = `${state.game.trickScore[0]} - ${state.game.trickScore[1]}`;
  els.scoreText.textContent =
    state.game.currentTurn?.type === "score" ? `${state.game.score[0]} - ${state.game.score[1]}` : "-";
}

function renderAnalysis() {
  els.botAnalysis.innerHTML = "";

  for (const evaluation of state.game.sideEvaluations ?? []) {
    const row = document.createElement("div");
    row.className = "analysis-row";
    row.innerHTML = `
      <strong>${sideNames[evaluation.side]}</strong>
      <span>${evaluation.hcp} HCP | best ${formatCandidate(evaluation.best)}</span>
    `;
    els.botAnalysis.append(row);
  }
}

function renderHands() {
  const legalCards = new Set(state.game.currentTurn?.legalCards ?? []);
  const activeSeat = state.game.currentTurn?.seat;

  for (let seat = 0; seat < 4; seat += 1) {
    const handEl = document.querySelector(`#hand-${seat}`);
    handEl.innerHTML = "";

    for (const label of sortHandLabels(state.game.hands[seat])) {
      const card = label ? parseCard(label) : { hidden: true };
      const isLegal = label && seat === activeSeat && legalCards.has(label);
      handEl.append(cardElement(card, { seat, isLegal }));
    }
  }
}

function renderCurrentTrick() {
  els.currentTrick.innerHTML = "";

  for (const play of state.game.currentTrick) {
    const cardEl = cardElement(parseCard(play.card), { seat: play.seat, isLegal: false });
    cardEl.classList.add("played-card", `seat-${play.seat}`);
    els.currentTrick.append(cardEl);
  }
}

function renderHistory() {
  els.bidHistory.innerHTML = "";
  els.playHistory.innerHTML = "";

  for (const event of state.game.events) {
    if (event.type === "contract") {
      const actor = event.source === "bot" ? "Bot" : sideNames[event.side];
      const verb = event.reason === "overbid" ? "wins contract" : "sets";
      els.bidHistory.append(historyRow(`${actor} ${verb} ${event.contract.level}${event.contract.suit}`));
    } else if (event.type === "bid") {
      const actor = event.source === "bot" ? "Bot" : sideNames[event.side];
      const verb = event.reason === "overbid" ? " overbids" : "";
      els.bidHistory.append(historyRow(`${actor}${verb} ${formatBid(event.bid)}`));
    } else {
      els.playHistory.append(historyRow(formatPlayEvent(event)));
    }
  }
}

function renderStatus() {
  els.statusLine.textContent = state.game.message;
  els.resetButton.disabled = state.busy;
  els.startContractButton.disabled = state.busy || state.game.currentTurn?.type === "score";
  els.passButton.disabled = state.busy || state.game.currentTurn?.type === "score";
}

function cardElement(card, { seat, isLegal }) {
  const el = document.createElement("div");
  el.className = card.hidden ? "card back" : `card ${card.suit}`;

  if (card.hidden) {
    el.innerHTML = "";
    return el;
  }

  el.innerHTML = `
    <span class="rank">${card.rank}</span>
    <span class="suit">${suitSymbols[card.suit]}</span>
    <span class="suit-small">${suitSymbols[card.suit]}</span>
  `;

  if (isLegal) {
    el.classList.add("is-legal");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", () => {
      if (state.mode === "poker") {
        playPokerCard(seat, card);
      } else {
        playCard(seat, card);
      }
    });
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (state.mode === "poker") {
        playPokerCard(seat, card);
      } else {
        playCard(seat, card);
      }
    });
  }

  return el;
}

function historyRow(text) {
  const row = document.createElement("div");
  row.className = "history-row";
  row.innerHTML = `<strong>${text}</strong>`;
  return row;
}

function currentBetRaiseAction() {
  const actions = state.poker?.activeActions ?? state.poker?.humanActions;
  if (!actions) return null;
  return actions.find((action) => action.type === "raise") ?? actions.find((action) => action.type === "bet") ?? null;
}

function formatPokerEvent(event) {
  const player = event.player === undefined ? "" : `${state.poker.players[event.player]} `;

  if (event.type === "table_fee") return `${player}table fee ${event.amount}`;
  if (event.type === "ante") return `${player}ante ${event.amount}`;
  if (event.type === "round_start") return "Betting window opened";
  if (event.type === "check") return `${player}checks`;
  if (event.type === "bet") return `${player}bets ${event.amount}`;
  if (event.type === "call") return `${player}calls ${event.amount}`;
  if (event.type === "raise") return `${player}raises ${event.raiseBy}`;
  if (event.type === "ready_fold_bid") {
    return event.phase === "trump_bidding" ? `${player}is ready to fold the trump bid` : `${player}is ready to fold this betting window`;
  }
  if (event.type === "bid_save_offer") {
    const chipText = event.amount > 0 ? ` + ${event.amount}` : "";
    if (event.phase === "trump_bidding") return `${player}offers ${event.contractTricks} with ${formatTrump(event.trumpSuit)}${chipText}`;
    return `${player}offers continue${chipText}`;
  }
  if (event.type === "bid_save_offer_paid") return `${player}adds save offer ${event.amount}`;
  if (event.type === "save_offer") return `${player}offers ${event.amount} to continue`;
  if (event.type === "save_offer_paid") return `${player}pays save offer ${event.amount}`;
  if (event.type === "fold") return `${player}folds`;
  if (event.type === "cap_clip") return `${player}cap clips ${event.requestedAmount} to ${event.paidAmount}`;
  return event.type;
}

function formatRoundLabel(trick) {
  if (trick === null || trick === undefined) return "-";
  return Number(trick) === 0 ? "Preflop" : `Trick ${trick}`;
}

function syncContractOptions(select, minimum, maximum) {
  const current = Number(select.value);
  const desiredValues = [];
  for (let trick = minimum; trick <= maximum; trick += 1) {
    desiredValues.push(String(trick));
  }

  const existingValues = [...select.options].map((option) => option.value);
  if (existingValues.join("|") !== desiredValues.join("|")) {
    select.innerHTML = "";
    for (const value of desiredValues) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = `${value} tricks`;
      select.append(option);
    }
  }

  if (desiredValues.includes(String(current))) {
    select.value = String(current);
  } else {
    select.value = String(minimum);
  }
}

function bettingWindowTitle(trick) {
  if (Number(trick) === 0) return "Trump Betting";
  return "Betting Window";
}

function bettingModalTitle(poker) {
  if (isPreflopBetting(poker)) return `${poker.pendingPlayerName}, choose trump or respond`;
  return `${poker.pendingPlayerName}, choose action`;
}

function nextButtonLabel(poker) {
  if (Number(poker.nextBettingTrick) === 0) return "Start Trump Betting";
  return "Waiting For Play";
}

function nextStepLabel(poker) {
  if (poker.showdown) return "Showdown";
  if (poker.nextBettingTrick === null) return "Showdown";
  if (Number(poker.nextBettingTrick) === 0) return "First bet";
  return "Continue";
}

function canOpenFirstBettingWindow(poker) {
  return !poker.activeRound && !poker.folded && !poker.showdown && poker.nextRoundIndex === 0 && state.viewerPlayer === 0;
}

function canUseReadyFold(poker) {
  return (
    poker.currentTurn?.type === "betting" &&
    poker.currentTurn.isViewer &&
    !poker.foldNegotiation &&
    !poker.folded &&
    !poker.showdown
  );
}

function readyFoldHint(poker) {
  if (poker.foldNegotiation) return "A save offer is already open.";
  if (poker.folded || poker.showdown) return "Start a new hand to use Ready to Fold.";
  if (poker.currentTurn?.type !== "betting") return "Available during a betting popup.";
  if (!poker.currentTurn.isViewer) return "Available on your own betting turn.";
  if (isPreflopBetting(poker)) return "Ask for a new target/trump before you fold.";
  return "Ask for a continue offer before you fold this betting round.";
}

function isPreflopBetting(poker) {
  return Boolean(poker?.activeRound && Number(poker.betting?.trick) === 0);
}

function visualSeatMap() {
  return state.mode === "poker" && state.viewerPlayer === 1 ? [1, 2, 3, 0] : [0, 1, 2, 3];
}

function actualToVisualSeat(actualSeat) {
  const visualMap = visualSeatMap();
  const visualSeat = visualMap.indexOf(Number(actualSeat));
  return visualSeat === -1 ? Number(actualSeat) : visualSeat;
}

async function copyShareLink(player) {
  const url = shareLink(player);
  await navigator.clipboard.writeText(url);
  els.statusLine.textContent = `${player === 0 ? "Player 1" : "Player 2"} link copied.`;
}

function shareLink(player) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", state.pokerSessionId ?? state.poker?.sessionId ?? "");
  url.searchParams.set("player", String(player));
  url.searchParams.set("variant", state.poker?.variant?.id ?? state.selectedVariant);
  url.searchParams.set("deal", state.poker?.dealStyle?.id ?? state.selectedDealStyle);
  return url.toString();
}

function updatePokerUrl() {
  const nextUrl = shareLink(state.viewerPlayer);
  window.history.replaceState(null, "", nextUrl);
}

function readViewerPlayer() {
  return new URLSearchParams(window.location.search).get("player") === "1" ? 1 : 0;
}

function formatTrump(suit) {
  if (!suit || suit === "NT") return "No Trump";
  return `${suitSymbols[suit]} ${suit}`;
}

function suitName(suit) {
  if (suit === "S") return "Spades";
  if (suit === "H") return "Hearts";
  if (suit === "D") return "Diamonds";
  if (suit === "C") return "Clubs";
  return suit;
}

function formatPlayEvent(event) {
  if (event.type === "leader") return `${seatLabels[event.seat]} leads`;
  if (event.type === "take") return `${seatLabels[event.seat]} takes`;
  if (event.type === "card") {
    const actor = event.actor === "human" ? "You" : "Bot";
    return `${actor}: ${seatLabels[event.seat]} ${event.card}`;
  }

  return event.type;
}

function formatBid(bid) {
  if (bid.type === "pass") return "Pass";
  if (bid.type === "double") return "Double";
  if (bid.type === "redouble") return "Redouble";
  return `${bid.level}${bid.suit}`;
}

function formatCandidate(candidate) {
  if (!candidate) return "-";

  const suit = candidate.suit === "NT" ? "NT" : suitSymbols[candidate.suit];
  const split = candidate.split?.some((count) => count > 0) ? ` split ${candidate.split.join("-")}` : "";
  return `${candidate.level}${candidate.suit} (${candidate.expectedTricks} exp, ${suit}${split})`;
}

function parseCard(label) {
  const suit = label.at(-1);
  return {
    rank: label.slice(0, -1),
    suit,
  };
}

function sortHandLabels(labels) {
  return [...labels].sort((labelA, labelB) => {
    if (!labelA || !labelB) return Number(Boolean(labelB)) - Number(Boolean(labelA));

    const cardA = parseCard(labelA);
    const cardB = parseCard(labelB);
    const suitDiff = suitSortOrder[cardA.suit] - suitSortOrder[cardB.suit];

    if (suitDiff !== 0) return suitDiff;

    return rankSortOrder[cardA.rank] - rankSortOrder[cardB.rank];
  });
}

function readSelectedContract() {
  return {
    declarer: Number(els.declarerSelect.value),
    level: Number(els.levelSelect.value),
    suit: els.suitSelect.value,
  };
}

function sideForSeat(seat) {
  return seat % 2;
}
