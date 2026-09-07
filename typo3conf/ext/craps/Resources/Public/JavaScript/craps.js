/**
 * Craps – Einstiegsmodul
 * ======================
 *
 * Die EINZIGE Datei dieser Extension, die über <f:asset.module> eingebunden
 * wird (Prüfung V-1), und reine Verdrahtung: sie sucht Elemente, holt Texte
 * aus data-text-*-Attributen und reicht Rückrufe herein. Sie trifft KEINE
 * Wurfentscheidung, rechnet keine Quote und wertet keine Wette aus
 * (Prüfungen V-8 und V-15) — das ist Sache von dice-physics.js,
 * wagers-craps.js und round-craps.js.
 *
 * DIE BAUREIHENFOLGE (Umsetzungsstück C7e)
 * ----------------------------------------
 *   1  Zufall       isAvailable() — sonst wird der Tisch gar nicht verdrahtet
 *   2  Geld         bank    = openTableBank('craps')
 *   3  Setzfläche   bets    = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX })
 *   4  Verlauf      history = connectHistory(historyEl, …)
 *   5  Tuch         felt    = connectFelt(feltRoot, bets, …)
 *   6  Physik       table   = new DiceTable({ random: drawUint32 })
 *   7  Würfelbild   view    = connectDice(trayEl, table, { onRest })
 *   8  Wurfbedienung input  = connectThrow(trayEl, …)
 *   9  Zustandswerk round   = new TableRound()
 *  10  Wettzustand  wagers  = new CrapsWagers({ ratioFor, oddsMax, payout })
 *  11  Runde        game    = new CrapsRound({ round, bets, bank, dice: view, wagers, … })
 *  12  Bedienleiste controls = connectControls(root, { bank, bets, felt, history, onGo })
 *  13  Klang        sound   = connectSound(root, { bank })          (C7f)
 *
 * Schritt 12 zuletzt unter den Bausteinen, weil connectControls() alle
 * übrigen braucht.
 *
 * DER pagehide-WEG WIRD NICHT DOPPELT GEBAUT
 * ------------------------------------------
 * connectControls() meldet pagehide selbst an und ruft dort felt.destroy()
 * und bank.close(). Diese Datei meldet pagehide ZUSÄTZLICH an — aber
 * ausschließlich für das, was die Bedienleiste nicht kennt: input.destroy(),
 * view.destroy() und den Wiederholungs-Zeitgeber. Sie ruft KEIN bank.close()
 * und KEIN felt.destroy(); zweimal abräumen wäre schlimmer als einmal.
 * Prüfung V-16 hält das fest. (Der Kopfkommentar von C6d hatte genau davor
 * gewarnt.)
 *
 * DER RUNDENAUSLÖSER STEHT NUR EINMAL AUF DER SEITE
 * -------------------------------------------------
 * Table/Controls.html gibt einen [data-ck-table-go] nur aus, wenn ihm das
 * Argument {go} übergeben wird. Table.html übergibt es NICHT: der Auslöser
 * dieses Tisches steht seit C6d in Table/Craps/Throw.html, zusammen mit
 * Modewahl und Wurfkraft-Schiene, wo er hingehört. Zwei Knöpfe mit demselben
 * Haken wären ein toter zweiter Auslöser, weil connectControls() mit
 * querySelector nur den ersten fände.
 *
 * DREI ANSAGEWEGE, JEDER MIT EINEM EIGENTÜMER
 * -------------------------------------------
 *   [data-ck-table-status]  geteilt: Chips und Bedienleiste (table-felt.js,
 *                           table-controls.js). Diese Datei schreibt dort nur
 *                           das, was connectFelt() ihr über den
 *                           announce-Rückruf übergibt — sie entscheidet
 *                           nichts davon selbst.
 *   [data-cr-status]        craps-eigen: Wurf, Ergebnis, Geld und jede
 *                           craps-eigene Absage. EINZIGER Schreiber ist diese
 *                           Datei (Prüfung V-2).
 *   [data-cr-point-text]    KEIN Live-Bereich, nur der sichtbare Point-Stand.
 *
 * DER AUSLÖSER WIRD NACHGEFÜHRT, SOBALD SICH DER EINSATZ ÄNDERT
 * -------------------------------------------------------------
 * zeichneAusloeser() läuft nicht nur beim Zustandswechsel, sondern auch in
 * onPlace und onTakeBack. Am Kartentisch war genau das der Fehler, den ein
 * Prüfstand aus 92 Einzelprüfungen nicht gesehen hat: der Auslöser wurde nie
 * freigegeben, weil beim Aufbau der Einsatz 0 ist und niemand neu zeichnete
 * (DECISIONS.md, 2026-09-06). Prüfung V-17 hält es diesmal fest.
 *
 * ÜBERNOMMEN AUS C6d, UNVERÄNDERT IN DER SACHE: WURFKRAFT UND MINDESTWURF
 * ------------------------------------------------------------------------
 * wurfSetup() baut ein setup MIT NICHTS als der aus der Schiene abgebildeten
 * speed — top, front, right, x, y, dx, dy, bx, by, h, vh, spin und tumble
 * fehlen ABSICHTLICH. DiceTable.roll() zieht jedes fehlende Feld selbst,
 * einschließlich der Lage, genau wie bei jedem Zuschauen-Wurf. Diese Datei
 * zieht dafür selbst NICHTS (Prüfung V-8).
 *
 * BERICHTIGUNG M-01 (Audit vom 2026-09-07), hier in wurfSetup() statt in der
 * seinerzeitigen onGoClick(): im Zuschauen-Modus wird ALLES gezogen, auch die
 * Wurfkraft — CONCEPT.md C.8.2 („Die Würfel werden vom Tisch geworfen;
 * Startkräfte und Winkel werden nach C.5.2 gezogen"). Eine frühere Fassung
 * las die Schiene unabhängig vom Modus; mit der Schiene auf 1 warf der Tisch
 * im Zuschauen-Modus gemessen viermal von vier Malen zu kurz, während die
 * Erläuterung neben der Option das Gegenteil versprach. Es war die Handlung,
 * die nicht stimmte, nicht der Satz. wurfSetup() liefert deshalb im
 * Zuschauen-Modus null („alles ziehen"), gleich wer zuletzt an der Schiene
 * war — dieselbe Zusage, die C.8.2 verlangt: die Wurfkraft beeinflusst das
 * Ergebnis nicht.
 *
 * Ein ungültiger (zu kurzer) Wurf wird NICHT sofort wiederholt: der Spieler
 * soll sehen, wie weit die Würfel gekommen sind. Im Zuschauen-Modus wirft der
 * Tisch nach REPEAT_MS von selbst noch einmal (onInvalid() → game.rethrow(null));
 * beim Selbst-werfen bleibt der Auslöser frei und der Spieler wirft erneut.
 */

import { isAvailable, drawUint32 } from '@phomo17/craps/rng.js';
import { DiceTable } from '@phomo17/craps/dice-physics.js';
import { connectDice } from '@phomo17/craps/dice-view.js';
import { connectThrow, SPEED_MIN, SPEED_MAX } from '@phomo17/craps/throw-input.js';
import { FIELDS, ROUND_MAX, ratioFor, oddsMax, payout } from '@phomo17/craps/bets-craps.js';
import { CrapsWagers } from '@phomo17/craps/wagers-craps.js';
import { CrapsRound } from '@phomo17/craps/round-craps.js';
import { connectSound } from '@phomo17/craps/sound-craps.js';
import { openTableBank } from '@phomo17/casino-startpage/table-buyin.js';
import { BetTable } from '@phomo17/casino-startpage/table-bets.js';
import { CHIPS } from '@phomo17/casino-startpage/table-chips.js';
import { connectFelt } from '@phomo17/casino-startpage/table-felt.js';
import { connectControls } from '@phomo17/casino-startpage/table-controls.js';
import { connectHistory } from '@phomo17/casino-startpage/table-history.js';
import { TableRound } from '@phomo17/casino-startpage/table-round.js';
import { credit } from '@phomo17/casino-startpage/credit.js';

/** Dieselben 700 ms wie an jedem anderen Tisch dieses Hauses. */
const ANNOUNCE_MS = 700;

/** Wartezeit vor der Wiederholung eines zu kurzen Wurfs im Zuschauen-Modus. */
const REPEAT_MS = 1000;

/**
 * Die gewinnenden Stapel bleiben so lange sichtbar, bevor abgeräumt wird.
 * Dieselbe Sekunde wie an jedem anderen Gerät dieses Hauses.
 */
const SETTLE_DELAY_MS = 1000;

/** @returns {boolean} */
function reducedMotionActive() {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Verdrahtet genau einen Tisch.
 * @param {Element} root das [data-ck-table]
 * @returns {void}
 */
function bindTable(root) {
	const key = root.getAttribute('data-ck-table-key');
	const trayEl = root.querySelector('[data-cr-tray]');
	const statusEl = root.querySelector('[data-cr-status]');
	const feltRoot = root.querySelector('[data-cr-felt]');
	const roundEl = root.querySelector('[data-cr-round-texts]');
	const pointEl = root.querySelector('[data-cr-point-text]');
	const workingEl = root.querySelector('[data-cr-place-working]');
	const modeInputs = [...root.querySelectorAll('[data-cr-mode]')];
	const powerInput = root.querySelector('[data-cr-power]');
	const goButton = root.querySelector('[data-ck-table-go]');
	const historyEl = root.querySelector('[data-ck-table-history]');
	const emptyHintText = root.querySelector('[data-ck-table-history-empty]')?.textContent ?? '';
	const sharedStatusEl = root.querySelector('[data-ck-table-status]');

	if (!trayEl || !statusEl || !goButton || !feltRoot || !roundEl) {
		console.error('[craps] craps.js: Grundgerüst fehlt im Markup ([data-cr-tray], [data-cr-status], [data-cr-felt], [data-cr-round-texts] oder [data-ck-table-go]) — Tisch bleibt unverdrahtet.');
		return;
	}

	const texts = {
		// aus Table/Craps/Status.html (Wurf, seit C6d unverändert)
		picked: statusEl.dataset.textPicked ?? '',
		rolling: statusEl.dataset.textRolling ?? '',
		result: statusEl.dataset.textResult ?? '',
		short: statusEl.dataset.textShort ?? '',
		blocked: statusEl.dataset.textBlocked ?? '',
		norandom: statusEl.dataset.textNorandom ?? '',
		power: statusEl.dataset.textPower ?? '',
		// aus Table/Craps/Round.html (Runde, neu in C7e)
		pointNone: roundEl.dataset.textPointnone ?? '',
		pointSet: roundEl.dataset.textPointset ?? '',
		natural: roundEl.dataset.textNatural ?? '',
		craps: roundEl.dataset.textCraps ?? '',
		pointSetRoll: roundEl.dataset.textPointsetroll ?? '',
		pointMade: roundEl.dataset.textPointmade ?? '',
		sevenOut: roundEl.dataset.textSevenout ?? '',
		roll: roundEl.dataset.textRoll ?? '',
		moneyWin: roundEl.dataset.textMoneywin ?? '',
		moneyPartial: roundEl.dataset.textMoneypartial ?? '',
		moneyLoss: roundEl.dataset.textMoneyloss ?? '',
		moneyNone: roundEl.dataset.textMoneynone ?? '',
		nostake: roundEl.dataset.textNostake ?? '',
		unavailable: roundEl.dataset.textUnavailable ?? '',
		closed: roundEl.dataset.textClosed ?? '',
		contract: roundEl.dataset.textContract ?? '',
		comeout: roundEl.dataset.textComeout ?? '',
		traveled: roundEl.dataset.textTraveled ?? '',
		nopoint: roundEl.dataset.textNopoint ?? '',
		nobase: roundEl.dataset.textNobase ?? '',
		oddsmax: roundEl.dataset.textOddsmax ?? '',
		unit: roundEl.dataset.textUnit ?? '',
		historyPoint: roundEl.dataset.textHistorypoint ?? '',
	};

	let ansageZeitgeber = 0;
	let ersteAnsageAusstehend = true;

	/** Ansage im craps-eigenen Live-Bereich, 700 ms Entprellung. @returns {void} */
	function sag(text) {
		if (typeof text !== 'string' || text === '') {
			return;
		}
		if (ersteAnsageAusstehend) {
			ersteAnsageAusstehend = false;
			statusEl.textContent = text;
			return;
		}
		if (ansageZeitgeber) {
			globalThis.clearTimeout(ansageZeitgeber);
		}
		ansageZeitgeber = globalThis.setTimeout(() => {
			ansageZeitgeber = 0;
			statusEl.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** Setzt {0}, {1}, {2} … in einer Vorlage ein. @returns {string} */
	function fuelle(vorlage, werte) {
		if (typeof vorlage !== 'string' || vorlage === '') {
			return '';
		}
		return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
	}

	/** @returns {string} 'shoot' oder 'watch'. */
	function modus() {
		return modeInputs.find((el) => el.checked)?.value ?? 'shoot';
	}

	/** @returns {boolean} */
	function placeArbeitet() {
		return workingEl ? workingEl.checked === true : true;
	}

	if (!isAvailable()) {
		goButton.setAttribute('aria-disabled', 'true');
		sag(texts.norandom);
		return;
	}
	if (typeof key !== 'string' || key === '' || gebundeneSchluessel.has(key)) {
		goButton.setAttribute('aria-disabled', 'true');
		sag(texts.unavailable);
		console.error(`[craps] craps.js: Tisch-Schlüssel "${String(key)}" fehlt oder ist auf dieser Seite bereits vergeben — dieser Tisch bleibt unverdrahtet.`);
		return;
	}

	let bank = null;
	let bets = null;
	let history = null;
	let felt = null;
	let table = null;
	let view = null;
	let input = null;
	let round = null;
	let wagers = null;
	let game = null;
	let controls = null;
	let sound = null;
	let wiederholung = 0;
	let pagehideHandler = null;

	/**
	 * Was gerade auf welchem Feld liegt — wahlweise ohne einen bestimmten,
	 * eben gelegten Chip. table-bets.js bucht den Chip, BEVOR onPlace läuft;
	 * die Regelprüfung braucht aber den Stand VORHER.
	 * @param {?string} ausser
	 * @param {number} betrag
	 * @returns {Object<string, number>}
	 */
	function einsaetze(ausser = null, betrag = 0) {
		const stand = {};
		for (const feld of FIELDS) {
			const wert = bets.stakeOn(feld.id) - (feld.id === ausser ? betrag : 0);
			if (wert > 0) {
				stand[feld.id] = wert;
			}
		}
		return stand;
	}

	/** Der Satz zu einer craps-eigenen Absage. @returns {string} */
	function absageSatz(urteil) {
		if (urteil.reason === 'oddsmax') {
			return fuelle(texts.oddsmax, [urteil.limit]);
		}
		return {
			contract: texts.contract,
			comeout: texts.comeout,
			traveled: texts.traveled,
			nopoint: texts.nopoint,
			nobase: texts.nobase,
		}[urteil.reason] ?? '';
	}

	/** Der Satz zum Ausgang eines Wurfs. @returns {string} */
	function ereignisSatz(report) {
		const werte = [report.faces[0], report.faces[1], report.sum];
		return fuelle({
			natural: texts.natural,
			craps: texts.craps,
			'point-set': texts.pointSetRoll,
			'point-made': texts.pointMade,
			'seven-out': texts.sevenOut,
			roll: texts.roll,
		}[report.event] ?? texts.roll, werte);
	}

	/** Der Satz zum Geld. @returns {string} */
	function geldSatz(report, credited) {
		if (report.total <= 0) {
			return texts.moneyNone;
		}
		const werte = [credited, report.total, bank.amount];
		if (credited > report.total) {
			return fuelle(texts.moneyWin, werte);
		}
		if (credited > 0) {
			return fuelle(texts.moneyPartial, werte);
		}
		return fuelle(texts.moneyLoss, werte);
	}

	/** aria-disabled statt disabled — nie disabled selbst. @returns {void} */
	function zeichneAusloeser() {
		const frei = (round.state === 'setzen' && game.mayThrow())
			|| (round.state === 'laeuft' && table.phase !== 'rollt');
		if (frei) {
			goButton.removeAttribute('aria-disabled');
		} else {
			goButton.setAttribute('aria-disabled', 'true');
		}
	}

	/** @returns {?Array<object>} null heißt „alles ziehen" (Zuschauen-Modus). */
	function wurfSetup() {
		if (modus() === 'watch') {
			return null;
		}
		const wert = powerInput ? Number(powerInput.value) : 6;
		const speed = SPEED_MIN + ((Math.min(10, Math.max(1, wert)) - 1) / 9) * (SPEED_MAX - SPEED_MIN);
		return [{ speed }, { speed }];
	}

	/* --- Rückrufe an die Wanne (unverändert seit C6d, plus die Brücke) --- */

	/** @param {{faces: number[], sum: number, valid: boolean}} ergebnis @returns {void} */
	function onRest(ergebnis) {
		root.setAttribute('data-cr-throws', String(table.throws));
		if (ergebnis.valid !== true) {
			root.setAttribute('data-cr-valid', 'nein');
			root.setAttribute('data-cr-state', 'ungueltig');
		} else {
			root.setAttribute('data-cr-valid', 'ja');
			root.setAttribute('data-cr-die-a', String(ergebnis.faces[0]));
			root.setAttribute('data-cr-die-b', String(ergebnis.faces[1]));
			root.setAttribute('data-cr-sum', String(ergebnis.sum));
			root.setAttribute('data-cr-state', 'liegt');
		}
		sound?.onDiceRest();
		void game.onRest(ergebnis);
	}

	/* --- Rückrufe an die Runde --- */

	/** @param {{state: string}} detail @returns {void} */
	function onState({ state }) {
		root.setAttribute('data-cr-round', state);
		zeichneAusloeser();
		sound?.setBusy(state !== 'setzen');
	}

	/** @returns {void} */
	function onThrowStart() {
		root.setAttribute('data-cr-state', 'rollt');
		sag(texts.rolling);
		zeichneAusloeser();
		sound?.onThrow();
	}

	/** Der Wurf war zu kurz. Er wird NICHT gewertet, aber gezeigt. @returns {void} */
	function onInvalid() {
		sag(texts.short);
		zeichneAusloeser();
		if (modus() === 'watch') {
			wiederholung = globalThis.setTimeout(() => {
				wiederholung = 0;
				game.rethrow(null);
			}, REPEAT_MS);
		}
	}

	/** @param {{report: Object, credited: number, staked: number}} ergebnis @returns {void} */
	function onResult({ report, credited }) {
		root.setAttribute('data-cr-point', report.point === null ? '' : String(report.point));
		root.setAttribute('data-cr-total', String(credit.balance + bank.amount + bets.total));
		if (pointEl) {
			pointEl.textContent = report.point === null
				? texts.pointNone
				: fuelle(texts.pointSet, [report.point]);
		}
		if (history) {
			history.push({
				text: `${report.faces[0]}+${report.faces[1]}`,
				title: report.point === null ? '' : fuelle(texts.historyPoint, [report.point]),
				tone: {
					natural: 'win', 'point-made': 'win',
					craps: 'loss', 'seven-out': 'loss',
					'point-set': 'event', roll: 'neutral',
				}[report.event] ?? 'neutral',
			});
		}
		sag(`${ereignisSatz(report)} ${geldSatz(report, credited)}`.trim());
		sound?.onResult({ event: report.event, hadBet: report.total > 0, credited, staked: report.total });
	}

	/** @returns {void} */
	function onAbort() {
		goButton.setAttribute('aria-disabled', 'true');
		sag(texts.closed);
	}

	/** @returns {void} */
	function onRefresh() {
		felt?.refresh();
		controls?.refresh();
		zeichneAusloeser();
	}

	/* --- Rückrufe an Tuch und Bedienleiste --- */

	/**
	 * Die Regelprüfung läuft VOR jeder Geldbewegung. Eine craps-eigene Absage
	 * wird im craps-eigenen Bereich angesagt und mit einem Grund
	 * zurückgegeben, den der geteilte Ansagebereich NICHT kennt — sonst
	 * stünde derselbe Satz zweimal auf der Seite.
	 * @returns {Promise<{ok: boolean, reason?: string}>}
	 */
	async function onPlace(fieldId, value) {
		const urteil = wagers.mayPlace(fieldId, value, einsaetze(fieldId, value));
		if (urteil.ok !== true) {
			sag(absageSatz(urteil));
			return { ok: false, reason: 'craps' };
		}
		const geld = await bank.placeChip(value);
		if (!geld || geld.ok !== true) {
			return geld ?? { ok: false, reason: 'nochip' };
		}
		if (urteil.hint === 'unit') {
			sag(fuelle(texts.unit, [urteil.unit]));
		}
		zeichneAusloeser();
		return geld;
	}

	/** @returns {Promise<object>} */
	async function onTakeBack(fieldId, value) {
		const geld = await bank.returnChip(value);
		zeichneAusloeser();
		return geld;
	}

	/** An connectControls() gereicht; connectControls() wired den Klick selbst. */
	function onGo() {
		if (round.state === 'laeuft') {
			if (table.phase === 'rollt') {
				sag(texts.blocked);
				return;
			}
			game.rethrow(wurfSetup());
			return;
		}
		const ergebnis = game.start(wurfSetup());
		if (ergebnis.ok !== true) {
			if (ergebnis.reason === 'state') {
				sag(texts.blocked);
			} else if (ergebnis.reason === 'nostake') {
				sag(texts.nostake);
			} else {
				sag(texts.unavailable);
			}
		}
	}

	/** @param {Array<object>} setup je Würfel, aus throw-input.js @returns {void} */
	function onThrowFromInput(setup) {
		if (powerInput && Array.isArray(setup) && setup[0]) {
			const wert = Math.round(1 + ((setup[0].speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 9);
			// Der Rückweg der einen Größe — nachgeführt, aber ohne Ansage:
			// eine Ansage, die niemand ausgelöst hat, wäre Geplapper.
			powerInput.value = String(Math.min(10, Math.max(1, wert)));
		}
		if (round.state === 'laeuft') {
			game.rethrow(setup);
			return;
		}
		game.start(setup);
	}

	try {
		bank = openTableBank(key);
		bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });

		if (historyEl) {
			history = connectHistory(historyEl, { texts: { empty: emptyHintText } });
		}

		felt = connectFelt(feltRoot, bets, {
			selectedChip: () => controls?.selectedChip() ?? 1,
			onPlace,
			onTakeBack,
			announce: (text) => {
				if (sharedStatusEl) {
					sharedStatusEl.textContent = text;
				}
			},
			symbolIdFor: (value) => CHIPS[value]?.symbolId ?? '',
			texts: {
				placed: sharedStatusEl?.dataset.textPlaced ?? '',
				removed: sharedStatusEl?.dataset.textRemoved ?? '',
				fieldmax: sharedStatusEl?.dataset.textFieldmax ?? '',
				roundmax: sharedStatusEl?.dataset.textRoundmax ?? '',
				locked: sharedStatusEl?.dataset.textLocked ?? '',
				nochip: sharedStatusEl?.dataset.textNochip ?? '',
				frozen: sharedStatusEl?.dataset.textFrozen ?? '',
				// Der Feldname kommt aus dem TUCH, nicht aus dem geteilten
				// Ansagebereich: die Auszahlung steht am Craps-Tisch bereits im
				// Namen selbst („Place 6, zahlt 7 zu 6"), und ein zweites
				// „zahlt 1,1666 zu 1" wäre falsch und unlesbar zugleich.
				fieldname: feltRoot.dataset.textFieldname ?? '',
				fieldnameEmpty: feltRoot.dataset.textFieldnameEmpty ?? '',
			},
		});

		table = new DiceTable({ random: drawUint32 });
		view = connectDice(trayEl, table, { onRest });
		if (view.ok === false) {
			throw new Error('dice-view.js: keine Übereinstimmung zwischen Physik und Markup ([data-cr-die] fehlt).');
		}

		input = connectThrow(trayEl, {
			isArmed: () => table.phase !== 'rollt' && modus() === 'shoot'
				&& (game.mayThrow() || round.state === 'laeuft'),
			onPick: () => sag(texts.picked),
			onShake: () => sag(texts.picked),
			onThrow: onThrowFromInput,
			onCancel: () => {},
		});

		round = new TableRound();
		wagers = new CrapsWagers({ ratioFor, oddsMax, payout });
		game = new CrapsRound({
			round, bets, bank,
			dice: { throw: (setup) => view.throwDice(setup) },
			wagers,
			wait: (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms)),
			settleDelayMs: reducedMotionActive() ? 0 : SETTLE_DELAY_MS,
			placeWorking: placeArbeitet,
			onState, onThrowStart, onInvalid, onResult, onAbort, onRefresh,
		});

		controls = connectControls(root, { bank, bets, felt, history, onGo });
		sound = connectSound(root, { bank });

		if (powerInput) {
			powerInput.addEventListener('input', () => {
				sag(fuelle(texts.power, [powerInput.value]));
			});
		}

		// Nur das, was die Bedienleiste NICHT abräumt. Kein bank.close(),
		// kein felt.destroy() — siehe Kopfkommentar.
		pagehideHandler = () => {
			if (wiederholung) {
				globalThis.clearTimeout(wiederholung);
				wiederholung = 0;
			}
			input?.destroy();
			view?.destroy();
		};
		globalThis.addEventListener('pagehide', pagehideHandler);

		gebundeneSchluessel.add(key);
		zeichneAusloeser();
	} catch (error) {
		sound?.destroy();
		if (pagehideHandler) {
			globalThis.removeEventListener('pagehide', pagehideHandler);
		}
		controls?.destroy();
		input?.destroy();
		view?.destroy();
		felt?.destroy();
		history?.destroy();
		if (bank) {
			void bank.close();
		}
		goButton.setAttribute('aria-disabled', 'true');
		sag(texts.unavailable);
		console.error('[craps] craps.js: Der Tisch konnte nicht verdrahtet werden.', error);
	}
}

/** Bereits verdrahtete Tische, damit ein zweiter boot()-Lauf nichts doppelt anmeldet. */
const bound = new WeakSet();

/** Tisch-Schlüssel, die auf DIESER Seite schon vergeben sind. @type {Set<string>} */
const gebundeneSchluessel = new Set();

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses
 * Modul kann deshalb schon laufen, bevor der Körper der Seite fertig
 * geparst ist.
 * @returns {void}
 */
function boot() {
	for (const root of document.querySelectorAll('[data-ck-table][data-ck-table-key="craps"]')) {
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
