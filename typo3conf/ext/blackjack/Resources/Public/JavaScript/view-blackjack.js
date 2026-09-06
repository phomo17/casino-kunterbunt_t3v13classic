/**
 * Blackjack – das Bild der Runde
 * ===============================
 *
 * Der EINZIGE Schreiber im Dokument, was das Spiel betrifft: Karten,
 * Chipstapel, Zustände, Sperren und der Ansagesatz der Runde. blackjack.js
 * sucht die Elemente und ruft paint(); es schreibt selbst nichts. „Ein
 * Messpunkt, ein Schreiber" (Prüfung A-12 und V-6).
 *
 * DIE VORGABE DES AUFTRAGGEBERS. Dieselbe Hand wird zweimal gezeichnet: auf
 * dem Tuch VERDECKT (Kartenrücken), in der Bedienleiste rechts unten
 * AUFGEDECKT. cards-blackjack.js sorgt dafür, dass die verdeckte Fassung die
 * Identität der Karte nirgends im Markup trägt (Prüfung K-5) — beide Bilder
 * sind also wirklich verschieden, nicht nur verschieden gestaltet.
 *
 * KEINE DOPPELTE ANSAGE. Die verdeckte Karte heißt für Hilfsmittel „verdeckte
 * Karte" und nennt keine Identität; die aufgedeckte heißt „Herz Dame". Jede
 * Karte wird damit genau einmal mit Inhalt vorgelesen.
 *
 * SVG ENTSTEHT ÜBER innerHTML, nicht über createElementNS (Prüfung A-3) —
 * dieselbe Machart wie in table-felt.js. Alles, was eingesetzt wird, kommt
 * entweder aus cards-blackjack.js (dort maskiert) oder aus table-chips.js
 * (Chipwerte und Symbol-Kennungen, beide keine Nutzereingabe) oder ist eine
 * Zahl.
 *
 * KEIN DEUTSCHER ANZEIGETEXT. Jeder Satz kommt als Satzbau mit {0}, {1} …
 * aus den data-text-Attributen von Table/Blackjack/Status.html herein.
 *
 * DIE SCHLUSSANSAGE EINER RUNDE (Gewinn/Verlust/Patt) LIEGT NICHT HIER.
 * Sie braucht die ausgezahlte Summe und den Buy-in danach — beides kennt
 * erst blackjack.js in seinem onResult()-Rückruf, der direkt von
 * round-table-blackjack.js kommt. Diese Datei sagt deshalb nur die drei
 * Zustände an, die aus der Momentaufnahme allein zu beschreiben sind:
 * 'versicherung', 'spieler', 'geber'. Der Rundenausgang wird von
 * blackjack.js selbst über denselben announce()-Rückruf angesagt — der
 * Rückruf hat wie hier immer nur EINEN Aufrufer je Zeitpunkt, nie zwei
 * gleichzeitig, weil onResult() erst NACH dem letzten paint() einer Runde
 * feuert (round-table-blackjack.js, _finish()).
 */

import { cardMarkup, handMarkup } from '@phomo17/blackjack/cards-blackjack.js';
import { CHIPS, breakDown } from '@phomo17/casino-startpage/table-chips.js';

/** Setzt {0}, {1} … in einer Vorlage ein. Wortgleich mit blackjack.js/roulette.js. */
function fuelle(vorlage, werte) {
	if (typeof vorlage !== 'string' || vorlage === '') {
		return '';
	}
	return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
}

/**
 * round-blackjack.js meldet einen Ausgang als 'lose', blackjack.css kennt
 * dafür die Klasse .bj-outcome--loss. Diese Tabelle übersetzt einmal an
 * dieser einen Stelle, statt „lose"/„loss" im Code zu verwechseln.
 */
const OUTCOME_CLASS = Object.freeze({ win: 'win', blackjack: 'blackjack', push: 'push', bust: 'bust', lose: 'loss' });

/** Ausgang → Schlüssel in `texts` (outcomeWin/outcomeLoss/outcomePush/outcomeBust/outcomeBlackjack). */
const OUTCOME_TEXT = Object.freeze({ win: 'outcomeWin', blackjack: 'outcomeBlackjack', push: 'outcomePush', bust: 'outcomeBust', lose: 'outcomeLoss' });

/**
 * Die Markup-Form EINES Chipstapelbereichs — wortgleich zu
 * table-felt.js#paintField(), damit die Stapel auf dem ganzen Tuch gleich
 * aussehen. Ein Stapel je Chipwert, höchstens acht sichtbare Chips, der Rest
 * als Zahl.
 * @param {number} amount
 * @returns {string}
 */
function stapelMarkup(amount) {
	const teileMarkup = [];
	for (const { value, count } of breakDown(Math.max(0, Math.trunc(amount) || 0))) {
		const symbolId = CHIPS[value]?.symbolId ?? '';
		const sichtbareChips = Math.min(count, 8);
		let markup = '';
		for (let i = 0; i < sichtbareChips; i += 1) {
			markup += `<svg class="ck-chip"><use href="#${symbolId}"></use></svg>`;
		}
		if (count > sichtbareChips) {
			markup += `<span class="ck-chipstack__count">${count}</span>`;
		}
		teileMarkup.push(`<span class="ck-chipstack">${markup}</span>`);
	}
	return teileMarkup.join('');
}

/**
 * @param {Element} root das [data-ck-table]
 * @param {{texts: Object, cardTexts: Object, announce: function(string): void}} teile
 * @returns {{paint: function(Object): void, reset: function(): void, destroy: function(): void}}
 */
export function connectView(root, teile) {
	const { texts = {}, cardTexts = {}, announce = null } = teile ?? {};

	const dealerCardsEl = root.querySelector('[data-bj-dealer-cards]');
	const dealerTotalEl = root.querySelector('[data-bj-dealer-total]');
	const handsEl = root.querySelector('[data-bj-hands]');
	const insuranceStackEl = root.querySelector('[data-bj-insurance-stack]');
	const panelEl = root.querySelector('[data-bj-panel]');
	const panelEmptyEl = root.querySelector('[data-bj-panel-empty]');
	const insureGroupEl = root.querySelector('[data-bj-insure-group]');
	const insureTakeButton = root.querySelector('[data-bj-insure="take"]');
	const goButton = root.querySelector('[data-ck-table-go]');
	/** @type {Map<string, Element>} Handlung → Knopf, aus den vier [data-bj-act]-Knöpfen. */
	const actButtons = new Map(
		[...root.querySelectorAll('[data-bj-act]')].map((el) => [el.getAttribute('data-bj-act'), el])
	);

	/** @returns {void} */
	function sag(text) {
		if (typeof announce === 'function' && typeof text === 'string' && text !== '') {
			announce(text);
		}
	}

	/** Der Text für eine Handsumme, mit dem Zusatz „weich" bei Bedarf. @returns {string} */
	function summenText(total, soft) {
		return fuelle(soft ? texts.handTotalSoft : texts.handTotal, [total]);
	}

	/** Die erlaubten Handlungen als Wortliste, aus den sichtbaren Knopfbeschriftungen. @returns {string} */
	function handlungenAlsWorte(legal) {
		return legal
			.map((a) => actButtons.get(a)?.textContent.trim() ?? '')
			.filter((wort) => wort !== '')
			.join(', ');
	}

	/** Das Ausgangswort einer Hand, oder ''. @returns {string} */
	function ausgangText(outcome) {
		const schluessel = outcome === null || outcome === undefined ? null : OUTCOME_TEXT[outcome];
		return schluessel ? String(texts[schluessel] ?? '') : '';
	}

	/** Die Ausgangsmarke — IMMER ein Wort, die Farbe ist Zugabe (WCAG 1.4.1). @returns {string} */
	function ausgangMarkup(outcome) {
		const wort = ausgangText(outcome);
		if (wort === '') {
			return '';
		}
		// cssKlasse wird ERST HIER, aus einem eigenen Ausdruck, gebildet —
		// dieselbe Vorsichtsmaßnahme wie zusatzKlasse in cardMarkup()
		// (cards-blackjack.js): Prüfung A-9 liest den QUELLTEXT dieser Datei
		// und würde bei einem eingebetteten „?? ''" innerhalb des
		// class-Attributs die eingebetteten Anführungszeichen selbst als
		// Attributgrenze lesen.
		const cssKlasse = OUTCOME_CLASS[outcome] ?? '';
		return `<span class="bj-outcome bj-outcome--${cssKlasse}">${wort}</span>`;
	}

	/**
	 * @param {{
	 *   state?: string, roundState?: string, hands?: Array, dealer?: Object,
	 *   upcardTotal?: number, baseStake?: number,
	 *   insurance?: {staked: number, returned: number},
	 *   legal?: Array<string>, insuranceCost?: number, stakeLegal?: boolean,
	 *   total?: number, activeIndex?: number
	 * }} snapshot
	 * @returns {void}
	 */
	function paint(snapshot) {
		const {
			state = 'bereit',
			roundState = 'setzen',
			hands = [],
			dealer = { cards: [], total: 0, upcard: null },
			upcardTotal = 0,
			baseStake = 0,
			insurance = { staked: 0, returned: 0 },
			legal = [],
			insuranceCost = 0,
			stakeLegal = false,
			total = 0,
			activeIndex = -1,
		} = snapshot ?? {};

		// 1  Zustand am Wurzelelement — die einzigen zwei
		//    setAttribute('data-bj-…')-Aufrufe der ganzen Extension (A-12 (c)).
		root.setAttribute('data-bj-state', state);
		root.setAttribute('data-bj-total', String(total));

		// 2  Die verdeckte Karte des Gebers. Solange nicht aufgedeckt, ist die
		//    ZWEITE Karte (Index 1) verdeckt — genau hier liegt die Zusage,
		//    dass die Lochkarte nicht im Seitenquelltext steht.
		const aufgedeckt = (state === 'geber' || state === 'fertig');
		if (dealerCardsEl) {
			dealerCardsEl.innerHTML = dealer.cards.length === 0
				? ''
				: handMarkup(dealer.cards, {
					texts: cardTexts,
					faceDown: dealer.cards.map((_, i) => i === 1 && !aufgedeckt),
				});
		}

		// 3  Die Summe des Gebers. Solange die Lochkarte liegt, wird NUR die
		//    offene Karte gerechnet — sonst verriete die Anzeige, was
		//    verdeckt liegt. upcardTotal kommt aus blackjack.js, gerechnet
		//    über rules.handTotal() — kein Wert dieser Datei ist eine Regel.
		if (dealerTotalEl) {
			dealerTotalEl.textContent = dealer.cards.length === 0
				? ''
				: (aufgedeckt
					? fuelle(texts.dealerTotal, [dealer.total])
					: fuelle(texts.dealerShows, [upcardTotal]));
		}

		// 4  Die Blätter auf dem Tuch, VERDECKT — mit dem nachgelegten
		//    Chipstapel (Verdoppeln/Teilen) und, sobald vorhanden, der
		//    Ausgangsmarke.
		if (handsEl) {
			handsEl.innerHTML = hands
				.map((blatt, i) => {
					const extra = blatt.stake - (i === 0 ? baseStake : 0);
					return `<li class="bj-seat__hand" data-bj-hand="${i}" data-bj-active="${i === activeIndex}">`
						+ handMarkup(blatt.cards, { faceDown: true, texts: cardTexts })
						+ stapelMarkup(extra)
						+ ausgangMarkup(blatt.outcome)
						+ '</li>';
				})
				.join('');
		}

		// 5/6  Der nachgelegte Stapel steht in Schritt 4; hier nur die
		//      Versicherung, in derselben Markup-Form.
		if (insuranceStackEl) {
			insuranceStackEl.innerHTML = stapelMarkup(insurance.staked);
		}

		// 7  Die Handtafel in der Bedienleiste: dieselben Blätter, AUFGEDECKT,
		//    dazu Summe (mit „weich"), Einsatz und, sobald vorhanden, der
		//    Ausgang im Klartext. Das ist die Stelle, an der der Spieler sein
		//    Blatt tatsächlich liest.
		if (panelEl) {
			panelEl.innerHTML = hands
				.map((blatt, i) => {
					// Die Kennung „Blatt {0}" nur bei mehr als einer Hand
					// (nach einer Teilung) — bei genau einem Blatt wäre sie
					// überflüssiges Rauschen.
					const nummer = hands.length > 1
						? `<span class="bj-panel__hand-number">${fuelle(texts.handNumber, [i + 1])}</span>`
						: '';
					return `<li class="bj-panel__hand" data-bj-hand="${i}" data-bj-active="${i === activeIndex}">`
						+ nummer
						+ handMarkup(blatt.cards, { faceDown: false, texts: cardTexts })
						+ '<p class="bj-panel__meta">'
						+ `<span>${summenText(blatt.total, blatt.soft)}</span>`
						+ `<span>${fuelle(texts.handStake, [blatt.stake])}</span>`
						+ ausgangMarkup(blatt.outcome)
						+ '</p></li>';
				})
				.join('');
		}
		if (panelEmptyEl) {
			panelEmptyEl.hidden = hands.length > 0;
		}

		// 8  Die Bedienteile sperren.
		for (const [action, button] of actButtons) {
			if (legal.includes(action)) {
				button.removeAttribute('aria-disabled');
			} else {
				button.setAttribute('aria-disabled', 'true');
			}
		}
		// Die Versicherung: sichtbar NUR im Zustand 'versicherung', über
		// hidden — ein Knopf, den es gerade nicht gibt, gehört nicht in die
		// Tastaturreihenfolge (anders als 'aria-disabled': „geht gerade nicht").
		if (insureGroupEl) {
			insureGroupEl.hidden = state !== 'versicherung';
		}
		// Was die Versicherung KOSTET, steht nicht im Markup (Regelzahl,
		// Prüfung A-11) — es wird hier aus dem mitgereisten Satzbau
		// data-text-take gefüllt und als aria-label gesetzt. Der Satzbau
		// beginnt mit „Versichern" — demselben Wort wie der sichtbare Text
		// des Knopfs (WCAG 2.5.3).
		if (insureTakeButton) {
			const beschriftung = fuelle(insureTakeButton.dataset.textTake ?? '', [insuranceCost]);
			if (beschriftung !== '') {
				insureTakeButton.setAttribute('aria-label', beschriftung);
			}
		}
		if (goButton) {
			if (roundState !== 'setzen' || !stakeLegal) {
				goButton.setAttribute('aria-disabled', 'true');
			} else {
				goButton.removeAttribute('aria-disabled');
			}
		}

		// 9  Die Ansage — ein Satz je Zustand, in dem SPIELER ODER GEBER
		//    etwas zu entscheiden bzw. zu tun haben. Der Rundenausgang
		//    ('fertig') wird bewusst NICHT hier angesagt, sondern von
		//    blackjack.js#onResult() — siehe Dateikopf.
		if (state === 'versicherung') {
			sag(fuelle(texts.insurance, [insuranceCost]));
		} else if (state === 'spieler') {
			const blatt = activeIndex >= 0 ? hands[activeIndex] : null;
			if (blatt) {
				const worte = handlungenAlsWorte(legal);
				const eigeneSumme = summenText(blatt.total, blatt.soft);
				sag(hands.length > 1
					? fuelle(texts.playerSplit, [activeIndex + 1, hands.length, eigeneSumme, upcardTotal, worte])
					: fuelle(texts.player, [eigeneSumme, upcardTotal, worte]));
			}
		} else if (state === 'geber') {
			sag(fuelle(texts.dealer, [dealer.total]));
		}
	}

	/** Setzt alles auf den ausgelieferten Anfangszustand zurück. @returns {void} */
	function reset() {
		if (dealerCardsEl) { dealerCardsEl.innerHTML = ''; }
		if (dealerTotalEl) { dealerTotalEl.textContent = ''; }
		if (handsEl) { handsEl.innerHTML = ''; }
		if (insuranceStackEl) { insuranceStackEl.innerHTML = ''; }
		if (panelEl) { panelEl.innerHTML = ''; }
		if (panelEmptyEl) { panelEmptyEl.hidden = false; }
		if (insureGroupEl) { insureGroupEl.hidden = true; }
		root.setAttribute('data-bj-state', 'bereit');
		root.setAttribute('data-bj-total', '0');
	}

	function destroy() {
		reset();
	}

	return { paint, reset, destroy };
}

export default connectView;
