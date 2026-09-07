/**
 * Casino Kunterbunt – die Bedienleiste eines Spieltisches
 * =======================================================
 *
 * CONCEPT.md C.3: „Chipwahl, ‚Letzten Einsatz zurücknehmen', ‚Alles
 * zurücknehmen', ‚Wiederholen', ‚Verdoppeln', der Auslöser der Runde, die
 * Anzeige von Buy-in-Bestand und Gesamteinsatz." Dazu das Wechselfeld und
 * CASH OUT aus C.4.
 *
 * Diese Datei fasst das Dokument an. Sie kennt kein Spiel: welche Felder es
 * gibt, was ein Ergebnis ist und wann eine Runde beginnt, weiß sie nicht. Sie
 * verdrahtet data-Attribute und ruft Methoden.
 *
 * WELCHE HAKEN SIE SUCHT (alle innerhalb von root, dem Tisch [data-ck-table])
 * ----------------------------------------------------------------------------
 *   [data-ck-table-controls]        Träger der eigenen Meldungstexte (data-message-*, data-text-*)
 *   [data-ck-table-chip]            die fünf Chip-Radioknöpfe, value = Chipwert
 *   [data-ck-table-rack]            Anzeige des Chipbestands, je Wert ein Element, value im Attribut selbst
 *   [data-ck-table-undo]            letzten Einsatz zurücknehmen
 *   [data-ck-table-clear]           alles zurücknehmen
 *   [data-ck-table-repeat]          wiederholen
 *   [data-ck-table-double]          verdoppeln
 *   [data-ck-table-go]              Auslöser der Runde (FREIWILLIG)
 *   [data-ck-table-buyin-form]      Wechselfeld: Betrag in Chips
 *   [data-ck-table-buyin-input]     das Zahlenfeld darin
 *   [data-ck-table-buyin-add]       Schnellwerte, value = Betrag
 *   [data-ck-table-cashout]         CASH OUT
 *   [data-ck-table-exchange-down]   kleiner wechseln, value = Chipwert
 *   [data-ck-table-exchange-up]     größer wechseln, value = Chipwert
 *   [data-ck-table-amount]          Anzeige des Buy-ins
 *   [data-ck-table-staked]          Anzeige des Gesamteinsatzes
 *   [data-ck-table-status]          der Ansagebereich (Table/Status.html)
 *
 * Findet sie einen Haken nicht, tut sie dafür nichts — kein Fehler, keine
 * Anmeldung. Dieselbe Haltung wie credit-display.js.
 *
 *
 * WOHER DIE DEUTSCHEN SATZBAUTEN KOMMEN — EIGENE FESTLEGUNG
 * -----------------------------------------------------------
 * Der Plan nennt keine Parameter-Form für Texte (anders als table-felt.js mit
 * seinem options.texts). Statt eines zusätzlichen Parameters liest diese Datei
 * ihre Texte aus dem bereits ausgelieferten Markup:
 *
 *   [data-ck-table-controls]  data-message-nocash, data-message-invalid,
 *                              data-message-cashout-blocked,
 *                              data-message-cashout-done, data-message-buyin-done,
 *                              data-message-exchange-down-done,
 *                              data-message-exchange-up-done, data-text-rack-count,
 *                              data-text-amount, data-text-undone,
 *                              data-text-limit (Table/Controls.html)
 *   [data-ck-table-status]    data-text-cleared, data-text-doubled,
 *                              data-text-repeated, data-text-nochip,
 *                              data-text-locked (Table/Status.html, C1-C)
 *
 * table-felt.js las seine Texte schon aus genau diesem Ansagebereich; diese
 * Datei tut dasselbe für die drei Sätze, die C1-C ausdrücklich ihr überlassen
 * hat (table.announce.cleared/doubled/repeated), und ergänzt zwei weitere
 * (table.announce.undone, table.announce.limit) auf dieselbe Art in ihrem
 * EIGENEN Markup — kein bereits abgeschlossenes Teilstück wird dafür
 * angefasst.
 *
 *
 * VERDOPPELN UND WIEDERHOLEN PRÜFEN DEN CHIPBESTAND VOR DER BUCHFÜHRUNG —
 * EIGENE ENTSCHEIDUNG
 * -----------------------------------------------------------------------
 * table-bets.js kennt kein Geld (Kopf von table-bets.js: „KEIN GELD"): sein
 * double()/repeat() prüft nur Feld- und Rundenlimits, nicht, ob im Rack
 * überhaupt die passenden Chips liegen, um jeden bestehenden Einsatz ein
 * zweites Mal zu legen. Bliebe das unbeachtet, könnte die Setzfläche mehr
 * anzeigen, als der Buy-in hergibt. Diese Datei prüft deshalb VOR dem Aufruf,
 * ob für jede benötigte Wertstufe genug Chips im Rack liegen, und lehnt sonst
 * ab, ohne die Setzfläche überhaupt anzufassen — dieselbe Zusage „alles oder
 * nichts" wie im Rest des Bausteins.
 */

/** Dieselben 700 ms wie in credit-display.js und table-felt.js. */
const ANNOUNCE_MS = 700;

/**
 * @param {Element} root der Tisch, [data-ck-table]
 * @param {{bank: import('./table-buyin.js').TableBank, bets: import('./table-bets.js').BetTable,
 *          round?: import('./table-round.js').TableRound, felt?: {refresh: function(): void, destroy: function(): void},
 *          history?: {push: function(Object): void, clear: function(): void, destroy: function(): void},
 *          onGo?: function(): void}} parts
 * @returns {{refresh: function(): void, destroy: function(): void, selectedChip: function(): number}}
 */
export function connectControls(root, parts) {
	const { bank, bets, felt = null, onGo = null } = parts ?? {};

	const messagesEl = root.querySelector('[data-ck-table-controls]');
	const statusEl = root.querySelector('[data-ck-table-status]');

	const texts = {
		nocash: messagesEl?.dataset.messageNocash ?? '',
		invalid: messagesEl?.dataset.messageInvalid ?? '',
		cashoutBlocked: messagesEl?.dataset.messageCashoutBlocked ?? '',
		cashoutDone: messagesEl?.dataset.messageCashoutDone ?? '',
		buyinDone: messagesEl?.dataset.messageBuyinDone ?? '',
		exchangeDownDone: messagesEl?.dataset.messageExchangeDownDone ?? '',
		exchangeUpDone: messagesEl?.dataset.messageExchangeUpDone ?? '',
		rackCount: messagesEl?.dataset.textRackCount ?? '',
		amount: messagesEl?.dataset.textAmount ?? '',
		undone: messagesEl?.dataset.textUndone ?? '',
		limit: messagesEl?.dataset.textLimit ?? '',
		cleared: statusEl?.dataset.textCleared ?? '',
		doubled: statusEl?.dataset.textDoubled ?? '',
		repeated: statusEl?.dataset.textRepeated ?? '',
		nochip: statusEl?.dataset.textNochip ?? '',
		locked: statusEl?.dataset.textLocked ?? '',
		frozen: statusEl?.dataset.textFrozen ?? '',
	};

	const chipInputs = [...root.querySelectorAll('[data-ck-table-chip]')];
	const rackEls = [...root.querySelectorAll('[data-ck-table-rack]')];
	const undoBtn = root.querySelector('[data-ck-table-undo]');
	const clearBtn = root.querySelector('[data-ck-table-clear]');
	const repeatBtn = root.querySelector('[data-ck-table-repeat]');
	const doubleBtn = root.querySelector('[data-ck-table-double]');
	const goBtn = root.querySelector('[data-ck-table-go]');
	const buyinForm = root.querySelector('[data-ck-table-buyin-form]');
	const buyinInput = root.querySelector('[data-ck-table-buyin-input]');
	const buyinAddButtons = [...root.querySelectorAll('[data-ck-table-buyin-add]')];
	const cashoutBtn = root.querySelector('[data-ck-table-cashout]');
	const exchangeDownButtons = [...root.querySelectorAll('[data-ck-table-exchange-down]')];
	const exchangeUpButtons = [...root.querySelectorAll('[data-ck-table-exchange-up]')];
	const amountEl = root.querySelector('[data-ck-table-amount]');
	const stakedEl = root.querySelector('[data-ck-table-staked]');

	let ansageZeitgeber = 0;
	let ersteAnsageAusstehend = true;
	let pagehideHandler = null;

	/** Setzt {0}, {1} … in einer Vorlage ein. Fehlt die Vorlage, wird nichts angesagt. */
	function fuelle(vorlage, werte) {
		if (typeof vorlage !== 'string' || vorlage === '') {
			return '';
		}
		return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
	}

	/** Ansage mit 700 ms Entprellung, erste Ansage sofort — wie table-felt.js. */
	function announce(text) {
		if (!statusEl || typeof text !== 'string' || text === '') {
			return;
		}
		if (ersteAnsageAusstehend) {
			ersteAnsageAusstehend = false;
			statusEl.textContent = text;
			return;
		}
		if (ansageZeitgeber) {
			clearTimeout(ansageZeitgeber);
		}
		ansageZeitgeber = setTimeout(() => {
			ansageZeitgeber = 0;
			statusEl.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** Der gerade gewählte Chipwert — oder der kleinste, den das Rack hergibt, oder 1. */
	function selectedChip() {
		const checked = chipInputs.find((el) => el.checked);
		if (checked) {
			return Number(checked.value);
		}
		const vorhanden = bank.rack.toArray(); // absteigend nach Wert
		if (vorhanden.length > 0) {
			return vorhanden[vorhanden.length - 1].value;
		}
		return 1;
	}

	/** Buy-in, Gesamteinsatz, Chipbestand und CASH OUT neu zeichnen. */
	function refresh() {
		if (amountEl) {
			amountEl.textContent = String(bank.amount);
		}
		if (stakedEl) {
			stakedEl.textContent = String(bets.total);
		}
		for (const el of rackEls) {
			const value = Number(el.getAttribute('data-ck-table-rack'));
			el.textContent = fuelle(texts.rackCount, [bank.rack.countOf(value)]);
		}
		for (const input of chipInputs) {
			const value = Number(input.value);
			// aria-disabled statt disabled (Audit A-06): ein Radioknopf ohne
			// eigenes disabled bleibt Tabstation, auch wenn (wie vor jedem
			// Buy-in) gerade alle fünf leer sind — sonst hätte die ganze
			// Chipwahl keine einzige erreichbare Station. Dieselbe Sperre wie
			// bei den Feldknöpfen der Setzfläche (table-felt.js, paintField):
			// die eigentliche Sperre besteht in placeChip() selbst
			// (table-buyin.js), das ohne Bestand 'nochip' meldet, hörbar über
			// announceReject() in table-felt.js.
			if (bank.rack.countOf(value) <= 0) {
				input.setAttribute('aria-disabled', 'true');
			} else {
				input.removeAttribute('aria-disabled');
			}
		}
		if (cashoutBtn) {
			const gesperrt = bank.hasStake || bank.amount <= 0;
			if (gesperrt) {
				cashoutBtn.setAttribute('aria-disabled', 'true');
			} else {
				cashoutBtn.removeAttribute('aria-disabled');
			}
		}
	}

	async function onCashout(event) {
		event.preventDefault();
		const result = await bank.cashOut();
		if (result.ok === true) {
			announce(fuelle(texts.cashoutDone, [result.moved]));
		} else if (result.reason === 'staked') {
			announce(texts.cashoutBlocked);
		}
		refresh();
	}

	async function doBuyIn(amount) {
		if (!Number.isInteger(amount) || amount < 1 || amount > 999999999) {
			announce(texts.invalid);
			return;
		}
		const result = await bank.buyIn(amount);
		if (result.ok === true) {
			if (buyinInput) {
				buyinInput.value = '';
			}
			announce(fuelle(texts.buyinDone, [result.moved, bank.amount]));
		} else if (result.reason === 'nocash') {
			announce(fuelle(texts.nocash, [result.missing]));
		}
		refresh();
	}

	function onBuyinSubmit(event) {
		event.preventDefault();
		void doBuyIn(buyinInput ? Number(buyinInput.value) : NaN);
	}

	function onBuyinAdd(event) {
		void doBuyIn(Number(event.currentTarget.getAttribute('data-ck-table-buyin-add')));
	}

	function onExchangeDown(event) {
		const value = Number(event.currentTarget.getAttribute('data-ck-table-exchange-down'));
		const result = bank.exchangeDown(value);
		if (result.ok === true) {
			announce(fuelle(texts.exchangeDownDone, [value, bank.rack.countOf(value)]));
		}
		refresh();
	}

	function onExchangeUp(event) {
		const value = Number(event.currentTarget.getAttribute('data-ck-table-exchange-up'));
		const result = bank.exchangeUp(value);
		if (result.ok === true) {
			announce(fuelle(texts.exchangeUpDone, [value, bank.rack.countOf(value)]));
		}
		refresh();
	}

	async function onUndo() {
		const result = bets.undo();
		if (result.ok !== true) {
			if (result.reason === 'locked') {
				announce(texts.locked);
			} else if (result.reason === 'frozen') {
				// Es liegt etwas auf dem Tuch, aber alles davon ist
				// Vertragswette. Ohne diesen Zweig bliebe der Knopf stumm.
				announce(fuelle(texts.frozen, ['']));
			}
			return;
		}
		felt?.refresh();
		refresh();
		await bank.returnChip(result.value);
		announce(fuelle(texts.undone, [bets.total]));
		refresh();
	}

	async function onClear() {
		const removed = bets.clear();
		if (!Array.isArray(removed)) {
			if (removed.reason === 'locked') {
				announce(texts.locked);
			}
			return;
		}
		felt?.refresh();
		refresh();
		for (const { value } of removed) {
			await bank.returnChip(value);
		}
		announce(bets.placements.length > 0 ? fuelle(texts.frozen, ['']) : texts.cleared);
		refresh();
	}

	/**
	 * Zählt, wie viele Chips welchen Werts eine Liste von Platzierungen
	 * braucht — gemeinsame Grundlage für den Bestandscheck von double() und
	 * repeat(), siehe Dateikopf.
	 * @param {Array<{value: number}>} placements
	 * @returns {Map<number, number>}
	 */
	function tally(placements) {
		const needed = new Map();
		for (const p of placements) {
			needed.set(p.value, (needed.get(p.value) ?? 0) + 1);
		}
		return needed;
	}

	/**
	 * @param {Map<number, number>} needed
	 * @returns {?number} der erste nicht ausreichend vorhandene Chipwert, oder null
	 */
	function firstMissingChip(needed) {
		for (const [value, count] of needed) {
			if (bank.rack.countOf(value) < count) {
				return value;
			}
		}
		return null;
	}

	async function onDouble() {
		if (bets.placements.length === 0) {
			return;
		}
		const missing = firstMissingChip(tally(bets.placements));
		if (missing !== null) {
			announce(fuelle(texts.nochip, [missing]));
			return;
		}
		const result = bets.double();
		if (result.ok !== true) {
			if (result.reason === 'locked') {
				announce(texts.locked);
			} else if (result.reason === 'fieldmax' || result.reason === 'roundmax') {
				announce(texts.limit);
			}
			return;
		}
		felt?.refresh();
		refresh();
		for (const { value } of result.added) {
			await bank.placeChip(value);
		}
		announce(fuelle(texts.doubled, [bets.total]));
		refresh();
	}

	async function onRepeat() {
		if (!bets.lastRound || bets.lastRound.length === 0 || bets.placements.length > 0) {
			return;
		}
		const missing = firstMissingChip(tally(bets.lastRound));
		if (missing !== null) {
			announce(fuelle(texts.nochip, [missing]));
			return;
		}
		const result = bets.repeat();
		if (result.ok !== true) {
			if (result.reason === 'locked') {
				announce(texts.locked);
			} else if (result.reason === 'fieldmax' || result.reason === 'roundmax') {
				announce(texts.limit);
			}
			return;
		}
		felt?.refresh();
		refresh();
		for (const { value } of result.placed) {
			await bank.placeChip(value);
		}
		announce(fuelle(texts.repeated, [bets.total]));
		refresh();
	}

	function onGoClick() {
		if (typeof onGo === 'function') {
			onGo();
		}
	}

	function onBankChange(detail) {
		if (detail.reason === 'claimed' && detail.amount > 0) {
			announce(fuelle(texts.amount, [detail.amount]));
		}
		refresh();
	}

	const unsubscribeBank = bank.subscribe(onBankChange);

	undoBtn?.addEventListener('click', onUndo);
	clearBtn?.addEventListener('click', onClear);
	repeatBtn?.addEventListener('click', onRepeat);
	doubleBtn?.addEventListener('click', onDouble);
	goBtn?.addEventListener('click', onGoClick);
	buyinForm?.addEventListener('submit', onBuyinSubmit);
	for (const button of buyinAddButtons) {
		button.addEventListener('click', onBuyinAdd);
	}
	cashoutBtn?.addEventListener('click', onCashout);
	for (const button of exchangeDownButtons) {
		button.addEventListener('click', onExchangeDown);
	}
	for (const button of exchangeUpButtons) {
		button.addEventListener('click', onExchangeUp);
	}
	for (const input of chipInputs) {
		input.addEventListener('change', refresh);
	}

	/*
	 * Der pagehide-Weg liegt hier und nicht im Geldbaustein (table-buyin.js):
	 * wer abräumt, muss den Umfang bestimmen dürfen. Ein Tisch, der diese
	 * Bedienleiste nicht benutzt, muss close() selbst rufen (README).
	 */
	pagehideHandler = () => {
		felt?.destroy();
		void bank.close();
	};
	globalThis.addEventListener('pagehide', pagehideHandler);

	function destroy() {
		unsubscribeBank();
		undoBtn?.removeEventListener('click', onUndo);
		clearBtn?.removeEventListener('click', onClear);
		repeatBtn?.removeEventListener('click', onRepeat);
		doubleBtn?.removeEventListener('click', onDouble);
		goBtn?.removeEventListener('click', onGoClick);
		buyinForm?.removeEventListener('submit', onBuyinSubmit);
		for (const button of buyinAddButtons) {
			button.removeEventListener('click', onBuyinAdd);
		}
		cashoutBtn?.removeEventListener('click', onCashout);
		for (const button of exchangeDownButtons) {
			button.removeEventListener('click', onExchangeDown);
		}
		for (const button of exchangeUpButtons) {
			button.removeEventListener('click', onExchangeUp);
		}
		for (const input of chipInputs) {
			input.removeEventListener('change', refresh);
		}
		if (pagehideHandler) {
			globalThis.removeEventListener('pagehide', pagehideHandler);
			pagehideHandler = null;
		}
		if (ansageZeitgeber) {
			clearTimeout(ansageZeitgeber);
			ansageZeitgeber = 0;
		}
	}

	refresh();

	return { refresh, destroy, selectedChip };
}

export default connectControls;
