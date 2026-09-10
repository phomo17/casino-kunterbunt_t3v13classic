/**
 * Roulette – das Einstiegsmodul
 * =============================
 *
 * Verdrahtet genau einen Tisch. Eingebunden über
 * <f:asset.module identifier="@phomo17/roulette/roulette.js" /> in
 * Resources/Private/ContentElements/Table.html.
 *
 * SEIT TEILSTÜCK C3d WIRD HIER TATSÄCHLICH GESPIELT
 * ---------------------------------------------------
 * Geld, Auswertung und Auszahlung liegen NICHT in dieser Datei — sie liegen in
 * round-roulette.js, dokument- und importfrei, damit ein Nachweis mit dem
 * echten Ablauf rechnet statt mit einer Nachbildung (siehe dessen Kopfkommentar
 * und verify-round.mjs). Diese Datei bleibt reine Verdrahtung: Elemente
 * suchen, Texte aus data-Attributen holen, Rückrufe hereinreichen. Prüfung
 * V-14 (verify-view.mjs) hält das fest — kein settle(, kein sweep(, kein
 * payout(, kein .lock()/.unlock() in dieser Datei.
 *
 * DIE BAUREIHENFOLGE
 * -------------------
 * Wörtlich nach der Anleitung in casino_startpage/README.md ("So verdrahtet
 * muster-tisch.js die Bausteine"), um die zwei Stücke erweitert, die ein
 * echtes Spiel gegenüber dem Mustertisch mehr hat — die Physik und die Runde:
 *
 *   1  Geld         bank    = openTableBank('roulette')
 *   2  Setzfläche   bets    = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX })
 *   3  Verlauf      history = connectHistory(historyEl, { texts: { empty } })
 *   4  Ansicht      felt    = connectFelt(feltRoot, bets, { … })
 *   5  Physik       wheel   = new Wheel({ random: drawUint32 })
 *   6  Rad-Ansicht  view    = connectWheel(wheelRoot, wheel, { onRest, onFret, … })
 *   7  Zustandswerk round   = new TableRound()
 *   8  Runde        game    = new RouletteRound({ round, bets, bank, wheel: view, … })
 *   9  Bedienleiste controls = connectControls(root, { bank, bets, felt, history, onGo })
 *  10  Klang        sound   = connectSound(root, { bank })
 *
 * Schritt 9 zuletzt unter den Bausteinen, weil connectControls() alle übrigen
 * braucht UND weil es den pagehide-Weg anmeldet, der felt.destroy() und
 * bank.close() ruft. Ein Tisch, der connectControls() benutzt, muss
 * bank.close() NICHT selbst rufen — das steht so im Vertrag des Site Packages
 * und gilt hier unverändert.
 *
 * Schritt 10 (Teilstück C3e) kommt zuletzt, wörtlich nach dem Plan. Die
 * Rückrufe an connectWheel() (Schritt 6) und an RouletteRound (Schritt 8)
 * verweisen trotzdem schon auf sound — das geht, weil `sound` als `let`
 * VOR dem try-Block steht und erst zur LAUFZEIT eines Klicks gelesen wird,
 * nicht beim Aufbau: bis ein Besucher das Rad überhaupt in Gang setzt, ist
 * Schritt 10 längst durchlaufen.
 *
 * WOHER DIE DEUTSCHEN SÄTZE KOMMEN
 * ---------------------------------
 * Aus den data-text-*-Attributen von Table/Roulette/Status.html, also aus der
 * XLIFF-Datei. In dieser Datei steht kein deutscher Anzeigetext — dieselbe
 * Machart wie in table-felt.js und table-controls.js.
 *
 * ZWEI LIVE-BEREICHE, JE EIN EIGENTÜMER FÜR DIE ENTSCHEIDUNG "WAS WIRD GESAGT"
 * ------------------------------------------------------------------------------
 * [data-ck-table-status] (geteilt, Site Package) gehört den Chips
 * (table-felt.js) und der Bedienleiste (table-controls.js) — BEIDE
 * entscheiden dort eigenständig, was angesagt wird, und beide schreiben
 * folglich hinein. Diese Datei selbst trifft diese Entscheidung nirgends:
 * die einzige Stelle, an der sie in dieses Element schreibt, ist der
 * announce-Rückruf, den connectFelt() vertraglich verlangt — sie reicht dort
 * nur weiter, was table-felt.js ihr übergibt, ohne selbst zu entscheiden oder
 * umzuformulieren. Behebungslauf 2026-09-06 (AUDITREPORT-2026-09-06.md,
 * Befund L-01, dort an blackjack.js behoben): eine frühere Fassung dieses
 * Kommentars behauptete, diese Datei schreibe dort NICHTS hinein — das traf
 * auf den Rückruf nie zu und wurde hier richtiggestellt, statt den Rückruf zu
 * entfernen (er ist Teil des Vertrags von connectFelt(), gemeinsam mit
 * Blackjack und dem Mustertisch).
 *
 * Der Rundenausgang hat seinen eigenen Bereich [data-ro-status]
 * (Table/Roulette/Status.html), und diese Datei ist sein EINZIGER Schreiber.
 * Ein Satz je Runde: "Die Kugel läuft." beim Start, der vollständige
 * Ergebnissatz am Ende — nichts dazwischen.
 *
 * DER RUNDENAUSLÖSER ALS RICHTIGER KNOPF
 * -----------------------------------------
 * [data-ck-table-go] ist in Table/Controls.html (geteilte Bedienleiste) ein
 * <button type="button">. connectControls() wired seinen Klick bereits auf
 * den hier übergebenen onGo-Rückruf — diese Datei fügt KEINEN zweiten
 * click-Zuhörer hinzu. Gesperrt heißt aria-disabled, nie disabled: ein
 * disabled-Knopf fiele aus der Tastaturreihenfolge und beantwortete nicht,
 * warum er nicht geht.
 *
 * DIE BILANZ ALS EINE ZAHL
 * ---------------------------
 * data-ro-total = credit.balance (die gemeinsame Kasse) + bank.amount (der
 * Buy-in) + bets.total (der liegende Einsatz). An ihr wird nachgewiesen, dass
 * nichts liegenbleibt und nichts aus dem Nichts entsteht (R-3, verify-round.mjs).
 * Geschrieben wird sie ausschließlich hier, in onResult().
 */

import { drawUint32, isAvailable } from '@phomo17/roulette/rng.js';
import { Wheel } from '@phomo17/roulette/wheel-physics.js';
import { connectWheel } from '@phomo17/roulette/wheel-view.js';
import { labelOf, colourOf } from '@phomo17/roulette/wheel-geometry.js';
import { FIELDS, ROUND_MAX } from '@phomo17/roulette/bets-roulette.js';
import { RouletteRound } from '@phomo17/roulette/round-roulette.js';
import { connectSound } from '@phomo17/roulette/sound-roulette.js';
import { openTableBank } from '@phomo17/casino-startpage/table-buyin.js';
import { BetTable } from '@phomo17/casino-startpage/table-bets.js';
import { CHIPS } from '@phomo17/casino-startpage/table-chips.js';
import { connectFelt } from '@phomo17/casino-startpage/table-felt.js';
import { connectControls } from '@phomo17/casino-startpage/table-controls.js';
import { connectHistory } from '@phomo17/casino-startpage/table-history.js';
import { credit } from '@phomo17/casino-startpage/credit.js';
import { TableRound } from '@phomo17/casino-startpage/table-round.js';

/** Dieselben 700 ms wie in credit-display.js, table-felt.js und table-controls.js. */
const ANNOUNCE_MS = 700;

/**
 * Die gewinnenden Stapel bleiben so lange sichtbar, bevor sie abgeräumt
 * werden (round-roulette.js, Schritt 4). Dieselbe Zahl wie PAUSE_MS in
 * fruit_risk/reel_slot/video_slot: eine Sekunde ist der Rhythmus, in dem
 * dieses Projekt ein Ergebnis stehen lässt, bevor es weitergeht.
 */
const SETTLE_DELAY_MS = 1000;

/**
 * Ob "Bewegung reduzieren" aktiv ist. Getrennt von der Baufunktion, damit sie
 * für sich lesbar bleibt — dieselbe Bauart wie defaultReducedMotion() in
 * wheel-view.js, hier aber als plaine Abfrage: RouletteRound erwartet eine
 * feste Zahl (settleDelayMs), keine Funktion, die je Runde neu gefragt wird.
 * @returns {boolean}
 */
function reducedMotionActive() {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Verdrahtet genau einen Tisch.
 *
 * @param {Element} root das [data-ck-table]
 * @returns {void}
 */
function bindTable(root) {
	const key = root.getAttribute('data-ck-table-key');
	if (typeof key !== 'string' || key === '') {
		console.error('[roulette] roulette.js: [data-ck-table] ohne data-ck-table-key gefunden.');
		return;
	}

	const wheelRoot = root.querySelector('[data-ro-wheel]');
	const feltRoot = root.querySelector('[data-ro-felt]');
	if (wheelRoot === null || feltRoot === null) {
		console.error('[roulette] roulette.js: [data-ro-wheel] oder [data-ro-felt] fehlt im Markup — Tisch bleibt unverdrahtet.');
		return;
	}

	const goButton = root.querySelector('[data-ck-table-go]');
	const roundStatusEl = root.querySelector('[data-ro-status]');
	const historyEl = root.querySelector('[data-ck-table-history]');
	const emptyHintText = root.querySelector('[data-ck-table-history-empty]')?.textContent ?? '';
	const feltStatusEl = root.querySelector('[data-ck-table-status]');

	const texts = {
		running: roundStatusEl?.dataset.textRunning ?? '',
		evaluating: roundStatusEl?.dataset.textEvaluating ?? '',
		blocked: roundStatusEl?.dataset.textBlocked ?? '',
		norandom: roundStatusEl?.dataset.textNorandom ?? '',
		nostake: roundStatusEl?.dataset.textNostake ?? '',
		unavailable: roundStatusEl?.dataset.textUnavailable ?? '',
		closed: roundStatusEl?.dataset.textClosed ?? '',
		win: roundStatusEl?.dataset.textWin ?? '',
		loss: roundStatusEl?.dataset.textLoss ?? '',
		partial: roundStatusEl?.dataset.textPartial ?? '',
		nobet: roundStatusEl?.dataset.textNobet ?? '',
		colourRed: roundStatusEl?.dataset.textColourRed ?? '',
		colourBlack: roundStatusEl?.dataset.textColourBlack ?? '',
		colourGreen: roundStatusEl?.dataset.textColourGreen ?? '',
	};

	let ansageZeitgeber = 0;
	let ersteAnsageAusstehend = true;

	/** Ansage im EIGENEN Live-Bereich der Runde, 700 ms Entprellung, erste Ansage sofort. @returns {void} */
	function announceRound(text) {
		if (!roundStatusEl || typeof text !== 'string' || text === '') {
			return;
		}
		if (ersteAnsageAusstehend) {
			ersteAnsageAusstehend = false;
			roundStatusEl.textContent = text;
			return;
		}
		if (ansageZeitgeber) {
			globalThis.clearTimeout(ansageZeitgeber);
		}
		ansageZeitgeber = globalThis.setTimeout(() => {
			ansageZeitgeber = 0;
			roundStatusEl.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** Setzt {0}, {1} … in einer Vorlage ein. @returns {string} */
	function fuelle(vorlage, werte) {
		if (typeof vorlage !== 'string' || vorlage === '') {
			return '';
		}
		return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
	}

	/** @returns {string} */
	function colourName(colour) {
		if (colour === 'red') {
			return texts.colourRed;
		}
		if (colour === 'black') {
			return texts.colourBlack;
		}
		return texts.colourGreen;
	}

	if (!isAvailable()) {
		if (goButton) {
			goButton.setAttribute('aria-disabled', 'true');
		}
		announceRound(texts.norandom);
		return;
	}

	if (!goButton) {
		console.error('[roulette] roulette.js: [data-ck-table-go] fehlt im Markup — Tisch bleibt unverdrahtet.');
		return;
	}

	let bank = null;
	let bets = null;
	let history = null;
	let felt = null;
	let wheel = null;
	let view = null;
	let round = null;
	let game = null;
	let controls = null;
	let sound = null;

	/**
	 * Rückruf an RouletteRound: schreibt data-ro-state und führt aria-disabled
	 * am Rundenauslöser nach. Hier — und nur an den drei Stellen dieser
	 * Funktion, onResult() und onRefresh() — fasst roulette.js das Dokument an.
	 * @param {{state: string}} detail
	 * @returns {void}
	 */
	function onState({ state }) {
		root.setAttribute('data-ro-state', state);
		if (state === 'setzen') {
			goButton.removeAttribute('aria-disabled');
		} else {
			goButton.setAttribute('aria-disabled', 'true');
		}
		// Der Leerlauf tritt zurück, solange der Tisch nicht beim Setzen steht
		// (CONCEPT.md B.7) — dieselbe Regel wie an jedem anderen Gerät dieses
		// Hauses, hier über den Rundenzustand statt über ein eigenes Ereignis.
		sound?.setBusy(state !== 'setzen');
	}

	/**
	 * Rückruf an RouletteRound: schreibt data-ro-result, data-ro-colour,
	 * data-ro-total, trägt EINE Marke in den Verlaufsstreifen ein und sagt
	 * EINEN Satz im eigenen Live-Bereich der Runde an.
	 * @param {{label: string, colour: string, report: Object, credited: number, staked: number}} ergebnis
	 * @returns {void}
	 */
	function onResult({ label, colour, report, credited, staked }) {
		root.setAttribute('data-ro-result', label);
		root.setAttribute('data-ro-colour', colour);
		root.setAttribute('data-ro-total', String(credit.balance + bank.amount + bets.total));

		if (history) {
			history.push({ text: label, title: colourName(colour), tone: colour });
		}

		// Behebung Review C3, L5: credited > 0 allein sagt nichts über Gewinn
		// oder Verlust — es sagt nur, dass ETWAS zurückkam. Wer 20 € verteilt
		// und 18 € zurückbekommt, hat netto verloren, hörte aber vorher
		// "Auszahlung 18 Euro" unter dem GEWINN-Satzbau. Jetzt drei Fälle:
		// echter Gewinn (mehr zurück als eingesetzt), Teilrückgabe (etwas,
		// aber nicht mehr als der Einsatz, zurück — netto kein Gewinn), und
		// totaler Verlust (nichts zurück).
		if (report.total <= 0) {
			announceRound(fuelle(texts.nobet, [label, colourName(colour)]));
		} else if (credited > staked) {
			announceRound(fuelle(texts.win, [label, colourName(colour), credited, staked, bank.amount]));
		} else if (credited > 0) {
			announceRound(fuelle(texts.partial, [label, colourName(colour), credited, staked, bank.amount]));
		} else {
			announceRound(fuelle(texts.loss, [label, colourName(colour), credited, staked, bank.amount]));
		}

		sound?.onResult({ hadBet: report.total > 0, credited, staked });
	}

	/**
	 * Rückruf an RouletteRound (Behebung Review C3, M8): die Bank war bei der
	 * Auszahlung bereits geschlossen (z. B. pagehide während die Kugel noch
	 * lief). Sagt das ausdrücklich an, statt die gewöhnliche Gewinn-/
	 * Verlustansage aus onResult() zu benutzen — ein verschwundener Gewinn
	 * würde sonst wie eine ehrliche Verlustrunde klingen. Der Rundenautomat
	 * (TableRound) steht danach zwar wieder auf "setzen" und hat darüber
	 * bereits aria-disabled am Auslöser aufgehoben (onState oben) — dieser
	 * Tisch ist auf dieser Seite aber endgültig zu Ende: round-roulette.js
	 * lässt das Tuch dafür ABSICHTLICH gesperrt (kein unlock()), und hier
	 * wird der Auslöser gleich wieder gesperrt, statt einen Tisch
	 * vorzutäuschen, der noch spielt.
	 * @returns {void}
	 */
	function onAbort() {
		goButton.setAttribute('aria-disabled', 'true');
		announceRound(texts.closed);
	}

	/** Rückruf an RouletteRound: Tuch und Bedienleiste neu zeichnen. @returns {void} */
	function onRefresh() {
		felt?.refresh();
		controls?.refresh();
	}

	/**
	 * Wird EINMAL je Lauf gerufen, sobald die Kugel liegt. Die Brücke von der
	 * Physik zur Runde — mehr nicht. Zahl, Farbe, Verrechnung, Verlaufsmarke
	 * und Ansage liegen in round-roulette.js beziehungsweise den drei
	 * Rückrufen oben.
	 * @param {number} index Fachzeiger 0…37
	 * @returns {void}
	 */
	function onRest(index) {
		sound?.onBallRest();
		void game.settleAt(labelOf(index));
	}

	/** An connectControls() gereicht; connectControls() wired den Klick selbst. @returns {void} */
	function onGo() {
		const ergebnis = game.start();
		if (ergebnis.ok !== true) {
			if (ergebnis.reason === 'state') {
				announceRound(texts.blocked);
			} else if (ergebnis.reason === 'nostake') {
				announceRound(texts.nostake);
			}
			return;
		}
		sound?.onRoundStart();
		// Behebung Review C3, L4: bei aktiver Bewegungsdrosselung rechnet
		// launch() den ganzen Lauf sofort zu Ende (runToRest(), kein Bild
		// dazwischen) — "Die Kugel läuft." wäre dann eine Bewegung, die es
		// nicht gibt, und stünde bis zu 700 ms (die Entprellung von
		// announceRound()), bevor sie vom Ergebnissatz ersetzt wird.
		announceRound(reducedMotionActive() ? texts.evaluating : texts.running);
	}

	// Behebung Review C3, M5: bricht ab, BEVOR openTableBank() überhaupt
	// versucht wird, wenn dieser Schlüssel auf der Seite schon vergeben ist
	// (zweites Roulette-Inhaltselement auf derselben Seite). Derselbe Weg wie
	// bei fehlender Zufallsquelle oben: aria-disabled am Auslöser, eigene
	// Ansage, kein Tisch, der 159 wirkungslose Tabstationen hinterlässt.
	if (gebundeneSchluessel.has(key)) {
		goButton.setAttribute('aria-disabled', 'true');
		announceRound(texts.unavailable);
		console.error(`[roulette] roulette.js: Tisch-Schlüssel "${key}" ist auf dieser Seite bereits vergeben — dieser Tisch bleibt unverdrahtet.`);
		return;
	}

	try {
		bank = openTableBank(key);
		bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });

		if (historyEl) {
			history = connectHistory(historyEl, { texts: { empty: emptyHintText } });
		}

		felt = connectFelt(feltRoot, bets, {
			selectedChip: () => controls?.selectedChip() ?? 1,
			onPlace: (fieldId, value) => bank.placeChip(value),
			onTakeBack: (fieldId, value) => bank.returnChip(value),
			announce: (text) => {
				if (feltStatusEl) {
					feltStatusEl.textContent = text;
				}
			},
			symbolIdFor: (value) => CHIPS[value]?.symbolId ?? '',
			texts: {
				placed: feltStatusEl?.dataset.textPlaced ?? '',
				removed: feltStatusEl?.dataset.textRemoved ?? '',
				fieldmax: feltStatusEl?.dataset.textFieldmax ?? '',
				roundmax: feltStatusEl?.dataset.textRoundmax ?? '',
				locked: feltStatusEl?.dataset.textLocked ?? '',
				nochip: feltStatusEl?.dataset.textNochip ?? '',
				fieldname: feltStatusEl?.dataset.textFieldname ?? '',
				fieldnameEmpty: feltStatusEl?.dataset.textFieldnameEmpty ?? '',
				// Behebungslauf 2026-09-09 (Befund M-02): nur bei den drei
				// Kolonnen nötig (ihre Grundbeschriftung nennt "2 zu 1" schon,
				// Prüfung F-20) — table-felt.js wählt diese Fassung selbst.
				fieldnameStated: feltStatusEl?.dataset.textFieldnameStated ?? '',
				fieldnameStatedEmpty: feltStatusEl?.dataset.textFieldnameStatedEmpty ?? '',
			},
		});

		wheel = new Wheel({ random: drawUint32 });
		view = connectWheel(wheelRoot, wheel, {
			onRest,
			// sound ist zu diesem Zeitpunkt noch null (Schritt 10 kommt erst
			// nach der Bedienleiste) — die Pfeilfunktionen lesen die Variable
			// aber erst, wenn das Rad WIRKLICH läuft, also lange nachdem
			// Schritt 10 durchlaufen ist. Siehe Dateikopf.
			onFret: (zahl) => sound?.onFret(zahl),
			onDeflector: () => sound?.onDeflector(),
			onFrame: (frame) => sound?.onFrame(frame),
			onMotionEnd: () => sound?.onMotionEnd(),
		});
		if (view.ok === false) {
			// Behebung Review C3, M6: connectWheel() liefert ok: false, wenn
			// [data-ro-head]/[data-ro-ball] im Markup fehlen — der Wurf würde
			// sonst erst beim ersten Druck auf den Auslöser als
			// wirkungsloser Platzhalter auffallen, mitten in einer schon
			// gesperrten Runde. Derselbe catch-Zweig wie bei jedem anderen
			// Verdrahtungsfehler räumt auf, sperrt den Auslöser und sagt es an.
			throw new Error('wheel-view.js: Rad ohne echten Anschluss (fehlendes Markup) — Tisch bleibt unverdrahtet.');
		}

		round = new TableRound();
		game = new RouletteRound({
			round,
			bets,
			bank,
			wheel: view,
			colourOf,
			wait: (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms)),
			settleDelayMs: reducedMotionActive() ? 0 : SETTLE_DELAY_MS,
			onState,
			onResult,
			onAbort,
			onRefresh,
		});

		controls = connectControls(root, { bank, bets, felt, history, onGo });
		sound = connectSound(root, { bank });
		gebundeneSchluessel.add(key);
	} catch (error) {
		sound?.destroy();
		controls?.destroy();
		view?.destroy();
		felt?.destroy();
		history?.destroy();
		if (bank) {
			void bank.close();
		}
		// Behebung Review C3, M5: derselbe Weg wie bei fehlender Zufallsquelle
		// (siehe isAvailable() oben) — ohne das bliebe ein vollständig
		// gerenderter, aber wirkungsloser Tisch mit 159 fokussierbaren
		// Feldknöpfen stehen, ohne jeden Hinweis für Tastatur- oder
		// Vorleseprogramm-Benutzer.
		goButton.setAttribute('aria-disabled', 'true');
		announceRound(texts.unavailable);
		console.error('[roulette] roulette.js: Der Tisch konnte nicht verdrahtet werden.', error);
	}
}

/** Bereits verdrahtete Tische, damit ein zweiter boot()-Lauf nichts doppelt anmeldet. */
const bound = new WeakSet();

/**
 * Tisch-Schlüssel, für die auf DIESER Seite bereits erfolgreich verdrahtet
 * wurde (Behebung Review C3, M5). Zwei Roulette-Inhaltselemente auf
 * derselben Seite tragen dasselbe data-ck-table-key="roulette" fest im
 * Markup; openTableBank() lässt denselben Schlüssel nicht zweimal offen. Ohne
 * diese Prüfung wirft erst openTableBank() mitten in bindTable(), und der
 * zweite Tisch bliebe ein stummer, aber bedienbar aussehender Tisch stehen.
 * @type {Set<string>}
 */
const gebundeneSchluessel = new Set();

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses Modul
 * kann deshalb schon laufen, bevor der Körper der Seite fertig geparst ist.
 * @returns {void}
 */
function boot() {
	for (const root of document.querySelectorAll('[data-ck-table]')) {
		if (bound.has(root)) {
			continue;
		}
		bound.add(root);
		bindTable(root);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}
