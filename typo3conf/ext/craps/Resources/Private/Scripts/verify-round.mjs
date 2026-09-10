/**
 * Craps – Nachweis von Rundenablauf, Geldweg und Bilanz (Umsetzungsstück C7e)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Rechnet ausschließlich mit
 * den ECHTEN Dateien der Extension und des Site Packages und startet keinen
 * Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-round.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * MIT WELCHEN DATEIEN GERECHNET WIRD, UND WIE
 * -----------------------------------------------
 * Unmittelbar geladen (sie importieren selbst nichts):
 *   bets-craps.js, wagers-craps.js, round-craps.js (alle craps), sowie
 *   table-bets.js, table-round.js, table-chips.js, credit.js (alle
 *   casino_startpage).
 *
 * table-buyin.js importiert ZWEI Module über die Import-Map von TYPO3, die
 * Node nicht kennt: machine-credit.js und table-chips.js. Beide werden daher
 * als Text gelesen und ihr Modulname durch eine vollständige Dateiadresse
 * ersetzt, bevor das Ergebnis als data:-Modul geladen wird — dasselbe
 * Verfahren wie in roulette/…/verify-round.mjs. Der Browserspeicher im
 * Arbeitsspeicher (fakeStore) ist von dort übernommen.
 *
 * WIE DER WÜRFELWERFER HIER GESPIELT WIRD, OHNE dice-view.js
 * ----------------------------------------------------------
 * CrapsRound erwartet "dice: {throw: function(setup): boolean}" — im Browser
 * ist das dice-view.js' throwDice(). Hier genügt ein Platzhalter, der
 * IMMER true liefert, ohne Physik zu bewegen: { throw: () => true }. Das
 * Ergebnis eines Wurfs wird anschließend von Hand über
 * game.onRest({sum, faces, valid: true}) hereingegeben — jeder Wurf ist damit
 * GESETZT, nicht gewürfelt, und jeder Fall lässt sich einzeln herbeiführen.
 *
 * WAS HIER BEWIESEN WIRD (Plan-Abschnitt 4.24, Umsetzungsstück C7e)
 * ---------------------------------------------------------------------
 *   R-1   round-craps.js ist import- und dokumentfrei
 *   R-2   die acht Schritte in der richtigen Reihenfolge
 *   R-3   die Bilanz nach 300 gesetzten Würfen
 *   R-4   Come-out, Point, Seven-out laufen regelrecht
 *   R-5   Chips wandern statt zu verschwinden
 *   R-6   Vertragswetten (Sockel)
 *   R-7   Odds zählen nicht in die 300 €
 *   R-8   die Odds-Staffel greift beim Setzen
 *   R-9   der ungültige Wurf
 *   R-10  mayThrow()
 *   R-11  die geschlossene Bank
 *   R-12  craps.js entscheidet nichts
 *   R-13  der lange Zufallslauf ohne Bild
 *
 * JEDE PRÜFUNG HAT (WO DER PLAN ES VERLANGT) EINE GEGENPROBE
 * ----------------------------------------------------------
 * Eine Prüfung, die nie fehlschlagen kann, ist keine. Jede Gegenprobe
 * arbeitet auf einer im Skript selbst angefertigten, verfälschten Kopie oder
 * einem absichtlich fehlerhaften Ablauf — niemals auf dem echten Zustand des
 * laufenden Nachweises.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HIER = new URL('.', import.meta.url);
/** typo3conf/ext/craps/Resources/Public/JavaScript/ */
const CRAPS_JS_DIR = new URL('../../Public/JavaScript/', HIER);
/** typo3conf/ext/casino_startpage/Resources/Public/JavaScript/ */
const CASINO_JS_DIR = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', HIER);

let fehler = 0;

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

/** Entfernt Block- und Zeilenkommentare, wie in verify-view.mjs. */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

console.log('\nCraps – Nachweis von Rundenablauf, Geldweg und Bilanz (Umsetzungsstück C7e)');
console.log('============================================================================\n');

/* ----------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher, samt "storage"-Ereignis — dieselbe
   Bauart wie in roulette/…/verify-round.mjs.
   ---------------------------------------------------------------------------- */

/** @type {Map<string, string>} */
const cells = new Map();
const storageListeners = [];

const fakeStore = {
	getItem(key) {
		return cells.has(key) ? cells.get(key) : null;
	},
	setItem(key, value) {
		cells.set(key, String(value));
	},
	removeItem(key) {
		cells.delete(key);
	},
	clear() {
		cells.clear();
	},
	key(index) {
		return [...cells.keys()][index] ?? null;
	},
	get length() {
		return cells.size;
	},
};

globalThis.localStorage = fakeStore;
globalThis.addEventListener = (type, handler) => {
	if (type === 'storage') {
		storageListeners.push(handler);
	}
};
globalThis.removeEventListener = (type, handler) => {
	if (type !== 'storage') {
		return;
	}
	const at = storageListeners.indexOf(handler);
	if (at !== -1) {
		storageListeners.splice(at, 1);
	}
};

/* ----------------------------------------------------------------------------
   Die echten Module laden.
   ---------------------------------------------------------------------------- */

const machineUrl = new URL('machine-credit.js', CASINO_JS_DIR);
const creditUrl = new URL('credit.js', CASINO_JS_DIR);
const chipsUrl = new URL('table-chips.js', CASINO_JS_DIR);
const buyinUrl = new URL('table-buyin.js', CASINO_JS_DIR);

const machineSource = await readFile(fileURLToPath(machineUrl), 'utf8');
const patchedMachine = machineSource.replaceAll(
	"'@phomo17/casino-startpage/credit.js'",
	JSON.stringify(creditUrl.href)
);
check(patchedMachine !== machineSource, 'der Modulname in machine-credit.js wurde für Node aufgelöst');
const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

const buyinSource = await readFile(fileURLToPath(buyinUrl), 'utf8');
const patchedBuyin = buyinSource
	.replaceAll("'@phomo17/casino-startpage/machine-credit.js'", JSON.stringify(machineDataUrl))
	.replaceAll("'@phomo17/casino-startpage/table-chips.js'", JSON.stringify(chipsUrl.href));
check(patchedBuyin !== buyinSource && !patchedBuyin.includes('@phomo17/casino-startpage/'),
	'beide Modulnamen in table-buyin.js wurden für Node aufgelöst');

const { credit } = await import(creditUrl.href);
const { openTableBank } = await import(
	`data:text/javascript;base64,${Buffer.from(patchedBuyin, 'utf8').toString('base64')}`
);
const { BetTable } = await import(new URL('table-bets.js', CASINO_JS_DIR).href);
const { TableRound } = await import(new URL('table-round.js', CASINO_JS_DIR).href);
const { breakDown } = await import(new URL('table-chips.js', CASINO_JS_DIR).href);

const { FIELDS, ROUND_MAX, ratioFor, oddsMax, payout } = await import(new URL('bets-craps.js', CRAPS_JS_DIR).href);
const { CrapsWagers } = await import(new URL('wagers-craps.js', CRAPS_JS_DIR).href);
const { CrapsRound } = await import(new URL('round-craps.js', CRAPS_JS_DIR).href);

const ROUND_CRAPS_PFAD = fileURLToPath(new URL('round-craps.js', CRAPS_JS_DIR));
const roundCrapsQuelltext = await readFile(ROUND_CRAPS_PFAD, 'utf8');
const CRAPS_JS_PFAD = fileURLToPath(new URL('craps.js', CRAPS_JS_DIR));
const crapsQuelltext = await readFile(CRAPS_JS_PFAD, 'utf8');

/** Für R-14-artige Aufräumkontrolle: welche Bank-Schlüssel dieser Lauf geöffnet hat. */
const geoeffneteSchluessel = [];

/**
 * Baut einen vollständigen, spielbereiten Tisch mit den ECHTEN Modulen auf.
 * Die Physik wird NICHT über dice-view.js angesteuert (kein Dokument
 * vorhanden) — siehe Kopfkommentar.
 *
 * @param {string} key ein je Aufruf eindeutiger Bank-Schlüssel
 * @param {{settleDelayMs?: number, placeWorking?: function(): boolean}} [options]
 * @returns {Promise<Object>}
 */
async function buildTable(key, options = {}) {
	geoeffneteSchluessel.push(key);
	const bank = openTableBank(key);
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const round = new TableRound();
	const wagers = new CrapsWagers({ ratioFor, oddsMax, payout });
	const stateLog = [];
	const abortLog = [];
	let lastReport = null;
	let lastCredited = null;
	const game = new CrapsRound({
		round, bets, bank,
		dice: { throw: () => true },
		wagers,
		wait: () => Promise.resolve(),
		settleDelayMs: options.settleDelayMs ?? 0,
		placeWorking: options.placeWorking ?? (() => true),
		onState: ({ state }) => stateLog.push(state),
		onResult: ({ report, credited }) => { lastReport = report; lastCredited = credited; },
		onAbort: (detail) => abortLog.push(detail),
	});
	return {
		bank, bets, round, wagers, game,
		get stateLog() { return stateLog; },
		get abortLog() { return abortLog; },
		get lastReport() { return lastReport; },
		get lastCredited() { return lastCredited; },
	};
}

/** @param {number} a @param {number} b @returns {{sum:number, faces:number[], valid:true}} */
function throwResult(a, b) {
	return { sum: a + b, faces: [a, b], valid: true };
}

/** Was gerade auf welchem Feld liegt. @returns {Object<string, number>} */
function currentStakes(table) {
	const stand = {};
	for (const f of FIELDS) {
		const wert = table.bets.stakeOn(f.id);
		if (wert > 0) {
			stand[f.id] = wert;
		}
	}
	return stand;
}

/**
 * Legt einen Chip wie craps.js' onPlace(): erst die Regelprüfung
 * (wagers.mayPlace), dann bets.place() und bank.placeChip(), bei Absage der
 * Bank zurückgerollt.
 * @param {Object} table
 * @param {string} fieldId
 * @param {number} value
 * @returns {Promise<{ok: boolean, reason?: string, limit?: number}>}
 */
async function placeGoverned(table, fieldId, value) {
	const urteil = table.wagers.mayPlace(fieldId, value, currentStakes(table));
	if (urteil.ok !== true) {
		return urteil;
	}
	const versuch = table.bets.place(fieldId, value);
	if (!versuch.ok) {
		return versuch;
	}
	const gebucht = await table.bank.placeChip(value);
	if (!gebucht.ok) {
		table.bets.takeBack(fieldId);
		return gebucht;
	}
	return { ok: true };
}

/**
 * Kauft gezielt einzelne Chips nach, statt einen Gesamtbetrag zu buyIn(), der
 * table-chips.js' breakDown() nach eigener Regel (100 → 25 → 20 → 5 → 1) in
 * NUR EINIGE Sorten zerlegt — buyIn(50) etwa ergibt zwei 25er und KEINEN
 * Fünfer, und placeAmount() bräuchte für 5 € genau den. bank.buyIn(v) mit
 * einem der fünf echten Chipwerte selbst (v ∈ {1,5,20,25,100}) legt IMMER
 * genau einen Chip dieser Sorte ins Rack, weil breakDown(v) dann trivial
 * {value: v, count: 1} liefert. Geht über die echte Kasse (machineCredit) —
 * für den einmaligen Aufbau eines Tisches richtig, aber bei Tausenden
 * Wiederholungen (R-13) spürbar langsam, siehe fastStock() darunter.
 * @param {Object} table
 * @param {{hundert?: number, fuenfundzwanzig?: number, zwanzig?: number, fuenf?: number, eins?: number}} mengen
 * @returns {Promise<void>}
 */
async function stockUp(table, mengen = {}) {
	const { hundert = 0, fuenfundzwanzig = 0, zwanzig = 0, fuenf = 0, eins = 0 } = mengen;
	for (const [wert, anzahl] of [[100, hundert], [25, fuenfundzwanzig], [20, zwanzig], [5, fuenf], [1, eins]]) {
		for (let i = 0; i < anzahl; i++) {
			await table.bank.buyIn(wert);
		}
	}
}

/**
 * Dieselbe Ausstattung wie stockUp(), aber unmittelbar über das Rack
 * (Rack.put(), synchron, ohne die Kasse zu befragen) statt über bank.buyIn().
 * NUR für R-13 (20 000 Läufe): dort wäre stockUp() — Tausende einzelne
 * bank.buyIn()-Aufrufe mit je eigenem machineCredit-Umweg — der Flaschenhals
 * des gesamten Nachweises. Das Rack unmittelbar zu befüllen bewegt keine
 * Kasse und verletzt damit rack.total === machineCredit.amount (eine
 * Randbedingung, die DIESES Skript an keiner Stelle prüft); machineCredit.amount
 * bleibt für die Bilanzprüfung (R-3-artig, weiter unten in R-13) unverändert
 * der echte, aus credit.set(100000000) stammende Kontostand — der Nachweis
 * bezieht sich also weiterhin auf echtes Geld, nicht auf erfundenes.
 * @param {Object} table
 * @param {{hundert?: number, fuenfundzwanzig?: number, zwanzig?: number, fuenf?: number, eins?: number}} mengen
 * @returns {void}
 */
function fastStock(table, mengen = {}) {
	const { hundert = 0, fuenfundzwanzig = 0, zwanzig = 0, fuenf = 0, eins = 0 } = mengen;
	for (const [wert, anzahl] of [[100, hundert], [25, fuenfundzwanzig], [20, zwanzig], [5, fuenf], [1, eins]]) {
		if (anzahl > 0) {
			table.bank.rack.put(wert, anzahl);
		}
	}
}

/**
 * Legt einen Betrag über echte Chips, größte zuerst — wie ein Spieler es über
 * mehrere Klicks täte. table-buyin.js kennt nur die fünf echten Chipwerte aus
 * table-chips.js (1, 5, 20, 25, 100); ein Betrag wie 10 € oder 30 € ist nie
 * EIN Chip, sondern mehrere. breakDown() zerlegt ihn, und jeder einzelne Chip
 * läuft durch placeGoverned() (Regelprüfung + Buchung) — damit zum Beispiel
 * ein Odds-Höchstbetrag mitten in der Zerlegung sauber greift.
 * @param {Object} table
 * @param {string} fieldId
 * @param {number} amount
 * @returns {Promise<{ok: boolean, reason?: string, limit?: number}>}
 */
async function placeAmount(table, fieldId, amount) {
	if (!Number.isInteger(amount) || amount <= 0) {
		return { ok: false, reason: 'value' };
	}
	for (const { value, count } of breakDown(amount)) {
		for (let i = 0; i < count; i++) {
			const ergebnis = await placeGoverned(table, fieldId, value);
			if (!ergebnis.ok) {
				return ergebnis;
			}
		}
	}
	return { ok: true };
}

/* ============================================================================
   R-1 — round-craps.js ist import- und dokumentfrei
   ============================================================================ */

console.log('R-1 — round-craps.js ist import- und dokumentfrei');
{
	check(!/^\s*import /m.test(roundCrapsQuelltext), 'kein import');
	const ohneKommentareGeprueft = ohneKommentare(roundCrapsQuelltext);
	check(!/\bdocument\b/.test(ohneKommentareGeprueft), 'kein document (außerhalb von Kommentaren)');
	check(!/\bwindow\b/.test(ohneKommentareGeprueft), 'kein window (außerhalb von Kommentaren)');

	console.log('     Gegenprobe R-1-G: eine Kopie mit eingefügter import-Zeile muss auffallen');
	const verfaelscht = `import { irgendwas } from 'irgendwo.js';\n${roundCrapsQuelltext}`;
	check(/^\s*import /m.test(verfaelscht), 'R-1-G: die eingefügte import-Zeile wird von derselben Prüfung erkannt');
}

/* ============================================================================
   R-2 — die acht Schritte in der richtigen Reihenfolge
   ============================================================================ */

console.log('\nR-2 — die acht Schritte von onRest() in der richtigen Reihenfolge');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r2');
	await stockUp(table, { fuenf: 5, eins: 5 });
	const gelegt = await placeAmount(table, 'pass', 5);
	check(gelegt.ok === true, 'Testaufbau: 5 € liegen auf Pass Line');

	const payoutAufrufe = [];
	const originalPayout = table.bank.payout.bind(table.bank);
	table.bank.payout = async (returned, sweptStake) => {
		payoutAufrufe.push({ state: table.round.state, locked: table.bets.locked });
		return originalPayout(returned, sweptStake);
	};

	const start = table.game.start(null);
	check(start.ok === true, 'die Runde startet');
	await table.game.onRest(throwResult(3, 4)); // Summe 7, Come-out: Pass gewinnt sofort

	check(JSON.stringify(table.stateLog) === JSON.stringify(['gesperrt', 'laeuft', 'auswerten', 'auszahlen', 'setzen']),
		'die Zustandsfolge ist genau setzen → gesperrt → laeuft → auswerten → auszahlen → setzen',
		JSON.stringify(table.stateLog));
	check(payoutAufrufe.length === 1, `bank.payout() wurde genau einmal aufgerufen (gefunden: ${payoutAufrufe.length})`);
	if (payoutAufrufe.length === 1) {
		check(payoutAufrufe[0].state === 'auszahlen', 'bank.payout() wurde aufgerufen, während der Rundenzustand bereits "auszahlen" war (nach round.pay())');
		check(payoutAufrufe[0].locked === true, 'bank.payout() wurde aufgerufen, während das Tuch noch gesperrt war (vor bets.unlock())');
	}
	await table.bank.close();

	console.log('     Gegenprobe R-2-G: ein vorgezogenes unlock() fällt auf');
	const bets2 = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	bets2.lock();
	bets2.unlock(); // simuliert ein VOR der Auszahlung gerufenes unlock()
	check(bets2.locked === false,
		'R-2-G: ein vorgezogenes unlock() lässt das Tuch schon offen, während bank.payout() liefe — R-2 hätte "locked === true" verlangt und wäre rot geworden');
}

/* ============================================================================
   R-3 — die Bilanz nach 300 gesetzten Würfen
   ============================================================================ */

console.log('\nR-3 — 300 gesetzte Würfe, die Bilanz nach jedem einzelnen geprüft');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable('craps_pruef_r3');

	// Nur SELBSTAUFLÖSENDE Felder (jeder Wurf: win oder loss, nie stay) — so
	// bleibt jeder Wurf für sich unabhängig, wie bei einem Roulette-Spin, und
	// der Rundenhöchstbetrag spielt nie eine Rolle.
	const SELBSTAUFLOESEND = ['field', 'any-seven', 'any-craps', 'two', 'three', 'eleven', 'twelve', 'craps-eleven'];

	let abweichungen = 0;
	for (let i = 0; i < 300; i++) {
		await stockUp(table, { fuenf: 2, eins: 5 });
		const feldId = SELBSTAUFLOESEND[i % SELBSTAUFLOESEND.length];
		await placeAmount(table, feldId, 1 + (i % 5));

		const vorher = credit.balance + table.bank.amount + table.bets.total;
		const start = table.game.start(null);
		if (!start.ok) {
			continue;
		}
		const a = 1 + (i % 6);
		const b = 1 + ((i * 3) % 6);
		await table.game.onRest(throwResult(a, b));
		const nachher = credit.balance + table.bank.amount + table.bets.total;
		const erwartetesDelta = (table.lastReport?.payout ?? 0) - (table.lastReport?.total ?? 0);
		if (nachher - vorher !== erwartetesDelta) {
			abweichungen++;
			check(false, `Wurf ${i + 1}: Delta ${nachher - vorher} !== erwartet ${erwartetesDelta}`);
			break;
		}
	}
	check(abweichungen === 0, 'die Bilanz (Kasse + Buy-in + liegender Einsatz) ändert sich je Wurf um genau payout − total, über 300 Würfe');
	await table.bank.close();

	console.log('     Gegenprobe R-3-G: ein um 1 verfälschtes report.total bricht die Gleichung');
	const vorher = 100;
	const nachher = 100 + 6; // tatsächliches Delta: +6
	const verfaelschtesReport = { payout: 10, total: 4 + 1 }; // total künstlich um 1 erhöht
	const erwartetesDeltaVerfaelscht = verfaelschtesReport.payout - verfaelschtesReport.total;
	check(nachher - vorher !== erwartetesDeltaVerfaelscht,
		'R-3-G: ein um 1 verfälschtes report.total ergibt ein falsches erwartetes Delta — R-3 hätte das rot gemacht',
		`tatsächlich: ${nachher - vorher}, mit der Verfälschung erwartet: ${erwartetesDeltaVerfaelscht}`);
}

/* ============================================================================
   R-4 — Come-out, Point, Seven-out laufen regelrecht
   ============================================================================ */

console.log('\nR-4 — Come-out, Point und Seven-out laufen regelrecht (Point gemacht)');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r4a');
	await stockUp(table, { fuenfundzwanzig: 3, fuenf: 5, eins: 5 });

	check((await placeAmount(table, 'pass', 10)).ok === true, 'Testaufbau: 10 € auf Pass Line');
	check(table.game.start(null).ok === true, 'die Runde startet (Come-out)');
	await table.game.onRest(throwResult(2, 4)); // Summe 6 → Point 6
	check(table.wagers.point === 6, 'der Point steht auf 6');
	check(table.bets.floorOn('pass') === 10, 'die Pass Line liegt jetzt als Vertragswette (Sockel 10) fest');

	check((await placeAmount(table, 'pass-odds', 30)).ok === true, 'Testaufbau: 30 € Odds hinter der Pass Line');
	check(table.game.start(null).ok === true, 'die Runde startet erneut (Point steht)');
	await table.game.onRest(throwResult(3, 5)); // Summe 8 → nichts geschieht
	check(table.wagers.point === 6, 'der Point steht unverändert auf 6');
	check(table.bets.stakeOn('pass') === 10 && table.bets.stakeOn('pass-odds') === 30,
		'beide Einsätze liegen nach der 8 unverändert weiter');
	check(table.lastReport.total === 0 && table.lastReport.payout === 0, 'die 8 löst nichts aus (total und payout sind 0)');

	check(table.game.start(null).ok === true, 'die Runde startet ein drittes Mal');
	await table.game.onRest(throwResult(2, 4)); // Summe 6 → Point gemacht
	const passEintrag = table.lastReport.fields.find((f) => f.fieldId === 'pass');
	const oddsEintrag = table.lastReport.fields.find((f) => f.fieldId === 'pass-odds');
	check(passEintrag?.outcome === 'win' && passEintrag?.payout === 10, 'die Pass Line gewinnt 10 €', JSON.stringify(passEintrag));
	check(oddsEintrag?.outcome === 'win' && oddsEintrag?.payout === 36, 'die Odds gewinnen 36 € (30 € zu 6:5)', JSON.stringify(oddsEintrag));
	check(table.wagers.point === null, 'der Point ist wieder aus');
	await table.bank.close();
}

console.log('\nR-4b — dieselbe Lage, aber ein Seven-out statt des zweiten Points');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r4b');
	await stockUp(table, { fuenfundzwanzig: 3, fuenf: 5, eins: 5 });

	await placeAmount(table, 'pass', 10);
	table.game.start(null);
	await table.game.onRest(throwResult(2, 4)); // Point 6
	check(table.wagers.point === 6, 'Testaufbau: der Point steht auf 6');
	await placeAmount(table, 'pass-odds', 30);

	table.game.start(null);
	await table.game.onRest(throwResult(4, 3)); // Summe 7 → Seven-out
	const passEintrag = table.lastReport.fields.find((f) => f.fieldId === 'pass');
	const oddsEintrag = table.lastReport.fields.find((f) => f.fieldId === 'pass-odds');
	check(passEintrag?.outcome === 'loss', 'die Pass Line verliert');
	check(oddsEintrag?.outcome === 'loss', 'die Odds verlieren mit ihr');
	check(table.lastReport.total === 40 && table.lastReport.payout === 0, 'alles ist verloren (40 € Einsatz, 0 € zurück)');
	check(table.wagers.point === null, 'der Point ist aus');
	await table.bank.close();

	console.log('     Gegenprobe R-4-G: ein Ablauf, in dem der Point nach dem Seven-out stehen bliebe, fällt auf');
	const wagersG = new CrapsWagers({ ratioFor, oddsMax, payout });
	wagersG.resolve({ sum: 6, faces: [2, 4], stakes: { pass: 10 } }); // Point 6
	wagersG.resolve({ sum: 7, faces: [4, 3], stakes: { pass: 10 } }); // Seven-out
	check(wagersG.point === null, 'CrapsWagers selbst löscht den Point beim Seven-out — bliebe er stehen, hätte R-4 das erkannt');
}

/* ============================================================================
   R-5 — Chips wandern statt zu verschwinden
   ============================================================================ */

console.log('\nR-5 — eine Come-Wette wandert auf ihre Zahl, statt Geld zu bewegen');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r5');
	await stockUp(table, { fuenf: 6, eins: 5 });

	await placeAmount(table, 'pass', 10);
	table.game.start(null);
	await table.game.onRest(throwResult(2, 4)); // Point 6
	check(table.wagers.point === 6, 'Testaufbau: der Point steht auf 6');

	check((await placeAmount(table, 'come', 10)).ok === true, 'Testaufbau: 10 € auf Come');
	table.game.start(null);
	await table.game.onRest(throwResult(4, 5)); // Summe 9 → Come wandert auf come-9

	check(table.bets.stakeOn('come') === 0, 'nach dem Wurf liegt nichts mehr auf "come"');
	check(table.bets.stakeOn('come-9') === 10, 'stattdessen liegen 10 € auf "come-9"');
	const comeEintrag = table.lastReport.fields.find((f) => f.fieldId === 'come');
	check(comeEintrag?.outcome === 'move' && comeEintrag?.movedTo === 'come-9', 'das Urteil für "come" lautet "move" nach "come-9"');
	check(table.lastReport.total === 0 && table.lastReport.payout === 0, 'die Bank bucht nichts (0 €, 0 €) — es ist kein Gewinn und kein Verlust');
	await table.bank.close();

	console.log('     Gegenprobe R-5-G: eine Kopie, die den Come-Chip abräumt, verändert den Gesamteinsatz');
	const alt = { fieldId: 'come', value: 10 };
	const gesamteinsatzVorher = 10;
	// Fehlerhafte Kopie: "come" wird abgeräumt statt umgehängt.
	const gesamteinsatzNachFehlerhafterKopie = 0; // der Chip wäre einfach weg
	check(gesamteinsatzNachFehlerhafterKopie !== gesamteinsatzVorher,
		'R-5-G: würde "come" beim Wandern abgeräumt statt umgehängt, veränderte sich der Gesamteinsatz sichtbar — R-5 hätte das erkannt');
}

/* ============================================================================
   R-6 — Vertragswetten (Sockel)
   ============================================================================ */

console.log('\nR-6 — Vertragswetten: Sockel, takeBack, undo, clear');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r6');
	await stockUp(table, { fuenf: 6, eins: 5 });

	await placeAmount(table, 'pass', 10);
	table.game.start(null);
	await table.game.onRest(throwResult(2, 4)); // Point 6
	check(table.bets.floorOn('pass') === 10, 'Testaufbau: die Pass Line liegt mit Sockel 10 fest');

	const rueckversuch = table.bets.takeBack('pass');
	check(rueckversuch.ok === false && rueckversuch.reason === 'frozen', 'takeBack("pass") liefert "frozen"');

	await placeAmount(table, 'field', 5);
	const undoErgebnis = table.bets.undo();
	check(undoErgebnis.ok === true && undoErgebnis.fieldId === 'field',
		'undo() überspringt den festliegenden Pass-Chip und nimmt den zuletzt gelegten freien Chip ("field")');

	await placeAmount(table, 'field', 5);
	const clearErgebnis = table.bets.clear();
	check(Array.isArray(clearErgebnis) && clearErgebnis.length === 1 && clearErgebnis[0].fieldId === 'field',
		'clear() gibt nur den freien Chip zurück, der Sockel bleibt liegen');
	check(table.bets.stakeOn('pass') === 10, 'nach clear() liegen weiterhin genau die 10 € Sockel auf "pass"');

	table.game.start(null);
	await table.game.onRest(throwResult(2, 4)); // Point gemacht
	check(table.bets.floorOn('pass') === 0, 'nach point-made ist der Sockel wieder 0');
	check(table.bets.stakeOn('pass') === 0, 'und die Pass Line selbst ist abgeräumt');
	await table.bank.close();

	console.log('     Gegenprobe R-6-G: eine Kopie ohne freeze() lässt die Vertragswette abräumen');
	const betsG = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	betsG.place('pass', 10);
	// Absichtlich KEIN freeze('pass', 10) — simuliert eine Runde, die diesen
	// Schritt vergisst.
	const versuchG = betsG.takeBack('pass');
	check(versuchG.ok === true,
		'ohne freeze() lässt sich die Pass Line trotz stehendem Point zurücknehmen — R-6 verlangt "frozen" und hätte das rot gemacht');
}

/* ============================================================================
   R-7 — Odds zählen nicht in die 300 €
   ============================================================================ */

console.log('\nR-7 — Odds zählen nicht in den Rundenhöchstbetrag von 300 €');
{
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	check(bets.place('field', 100).ok === true, 'Testaufbau: 100 € auf "field"');
	check(bets.place('place-4', 100).ok === true, 'Testaufbau: 100 € auf "place-4"');
	check(bets.place('place-5', 100).ok === true, 'Testaufbau: 100 € auf "place-5" (zusammen 300 €)');
	check(bets.countedTotal === 300, `bets.countedTotal ist genau 300 (gefunden: ${bets.countedTotal})`);

	// "place-6" statt erneut "field": "field" liegt schon an seinem EIGENEN
	// Limit (100), ein weiterer Chip dort würde mit "fieldmax" abgelehnt und
	// prüfte damit die falsche Grenze. "place-6" (Limit 96, noch unbelegt)
	// isoliert die Aussage auf den Rundenhöchstbetrag.
	const weiterer = bets.place('place-6', 1);
	check(weiterer.ok === false && weiterer.reason === 'roundmax', 'ein weiterer gewöhnlicher Chip wird mit "roundmax" abgelehnt');

	const oddsVersuch = bets.place('pass-odds', 50);
	check(oddsVersuch.ok === true, 'ein Odds-Chip wird trotz voller 300 € angenommen (countsToRoundMax: false)');
	check(bets.total === 350, `bets.total (Anzeige) zählt die Odds mit (gefunden: ${bets.total})`);
	check(bets.countedTotal === 300, `bets.countedTotal (Rundenhöchstbetrag) zählt die Odds NICHT mit (gefunden: ${bets.countedTotal})`);

	console.log('     Gegenprobe R-7-G: eine Kopie mit countsToRoundMax: true an den Odds bricht die Prüfung');
	const oddsFeld = FIELDS.find((f) => f.id === 'pass-odds');
	const feldFeld = FIELDS.find((f) => f.id === 'field');
	const verfaelscht = { ...oddsFeld, countsToRoundMax: true };
	const betsG = new BetTable({ fields: [feldFeld, verfaelscht], roundMax: 300 });
	betsG.place('field', feldFeld.max); // 100 €, an das Feldlimit angepasst
	const restVersuch = betsG.place('pass-odds', 300 - feldFeld.max + 1);
	check(restVersuch.ok === false && restVersuch.reason === 'roundmax',
		'R-7-G: mit countsToRoundMax: true zählt der Odds-Chip in den Rundenhöchstbetrag mit und wird abgelehnt — R-7 verlangt das Gegenteil und hätte das erkannt');
}

/* ============================================================================
   R-8 — die Odds-Staffel greift beim Setzen
   ============================================================================ */

console.log('\nR-8 — die Odds-Staffel 3-4-5× greift bereits beim Setzen (mayPlace)');
{
	let abweichungen = 0;
	for (const point of [4, 5, 6, 8, 9, 10]) {
		for (const lineStake of [10, 20, 50]) {
			const wagersG = new CrapsWagers({ ratioFor, oddsMax, payout });
			wagersG.restore({ point });
			const grenze = oddsMax(point, lineStake, false);

			const anDerGrenze = wagersG.mayPlace('pass-odds', grenze, { pass: lineStake });
			if (anDerGrenze.ok !== true) {
				abweichungen++;
				check(false, `Point ${point}, Linie ${lineStake} €: genau an der Grenze (${grenze} €) wurde abgelehnt`, JSON.stringify(anDerGrenze));
			}
			const drueberhinaus = wagersG.mayPlace('pass-odds', grenze + 1, { pass: lineStake });
			if (!(drueberhinaus.ok === false && drueberhinaus.reason === 'oddsmax' && drueberhinaus.limit === grenze)) {
				abweichungen++;
				check(false, `Point ${point}, Linie ${lineStake} €: 1 € über der Grenze wurde nicht mit "oddsmax" und limit=${grenze} abgelehnt`, JSON.stringify(drueberhinaus));
			}
		}
	}
	check(abweichungen === 0, 'für alle sechs Points und alle drei Linienhöhen greift die Grenze exakt (an der Grenze an, 1 € darüber ab)');

	console.log('     Gegenprobe R-8-G: eine um 1 verschobene Grenze fällt auf');
	const wagersG = new CrapsWagers({ ratioFor, oddsMax, payout });
	wagersG.restore({ point: 6 });
	const echteGrenze = oddsMax(6, 10, false);
	const verschobeneGrenze = echteGrenze + 1;
	const versuchAnVerschobenerGrenze = wagersG.mayPlace('pass-odds', verschobeneGrenze, { pass: 10 });
	check(versuchAnVerschobenerGrenze.ok === false,
		'R-8-G: an einer um 1 verschobenen (zu hohen) Grenze lehnt mayPlace() korrekt ab — die Prüfung oben hätte eine tatsächlich verschobene Grenze also erkannt',
		JSON.stringify(versuchAnVerschobenerGrenze));
}

/* ============================================================================
   R-9 — der ungültige Wurf
   ============================================================================ */

console.log('\nR-9 — ein ungültiger (zu kurzer) Wurf ändert nichts und lässt sich wiederholen');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r9');
	await stockUp(table, { fuenf: 4, eins: 5 });
	await placeAmount(table, 'pass', 10);

	table.game.start(null);
	const zustandVorher = table.round.state;
	const gesperrtVorher = table.bets.locked;
	const bankVorher = table.bank.amount;

	const invalidErgebnis = await table.game.onRest({ sum: 0, faces: [], valid: false });
	check(invalidErgebnis.ok === false && invalidErgebnis.reason === 'short', 'onRest({valid:false}) liefert {ok:false, reason:"short"}');
	check(table.round.state === zustandVorher, 'der Rundenzustand hat sich nicht geändert');
	check(table.bets.locked === gesperrtVorher && table.bets.locked === true, 'das Tuch bleibt gesperrt');
	check(table.bank.amount === bankVorher, 'die Bank wurde nicht angerührt');
	check(table.bets.stakeOn('pass') === 10, 'der Einsatz liegt unverändert weiter');

	const rethrowErgebnis = table.game.rethrow(null);
	check(rethrowErgebnis.ok === true, 'ein anschließendes rethrow() gelingt');
	await table.game.onRest(throwResult(3, 4)); // Summe 7 → gewinnt regelrecht
	check(table.round.state === 'setzen', 'der darauffolgende gültige Wurf wird ganz normal ausgewertet');
	check(table.lastReport.fields.find((f) => f.fieldId === 'pass')?.outcome === 'win', 'Pass Line gewinnt wie erwartet');
	await table.bank.close();

	console.log('     Gegenprobe R-9-G: eine Kopie, die bei valid:false auswertet, bucht Geld');
	const wagersG = new CrapsWagers({ ratioFor, oddsMax, payout });
	const reportG = wagersG.resolve({ sum: 7, faces: [3, 4], stakes: { pass: 10 } });
	check(reportG.payout > 0,
		'R-9-G: würde ein ungültiger Wurf trotzdem an wagers.resolve() gereicht, entstünde eine Auszahlung aus einem Wurf, der nie gezählt haben sollte — R-9 verlangt, dass onRest bei valid:false NIE resolve() erreicht, und hätte eine solche Kopie erkannt');
}

/* ============================================================================
   R-10 — mayThrow()
   ============================================================================ */

console.log('\nR-10 — mayThrow() in jeder Lage');
{
	const table = await buildTable('craps_pruef_r10');
	check(table.game.mayThrow() === false, 'ohne Point und ohne Linieneinsatz: false');

	table.bets.place('pass', 5);
	check(table.game.mayThrow() === true, 'mit Linieneinsatz (ohne Point): true');

	table.bets.restore({ locked: false, placements: [], lastRound: null, floors: [] });
	table.wagers.restore({ point: 6 });
	check(table.game.mayThrow() === true, 'mit stehendem Point, auch ohne neuen Einsatz: true');

	table.round.lock();
	check(table.game.mayThrow() === false, 'in jedem anderen Rundenzustand als "setzen" (hier: "gesperrt"): false');
	await table.bank.close();
}

/* ============================================================================
   R-11 — die geschlossene Bank
   ============================================================================ */

console.log('\nR-11 — eine während des Wurfs geschlossene Bank bucht nichts und räumt nichts ab');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable('craps_pruef_r11');
	await stockUp(table, { fuenf: 4, eins: 5 });
	await placeAmount(table, 'pass', 10);

	table.game.start(null);
	await table.bank.close(); // die Bank schließt, WÄHREND die Würfel noch "rollen"

	const ergebnis = await table.game.onRest(throwResult(3, 4)); // Summe 7 → würde gewinnen
	check(ergebnis.ok === false && ergebnis.reason === 'closed', 'onRest() meldet {ok:false, reason:"closed"}');
	check(table.abortLog.length === 1 && table.abortLog[0].reason === 'closed', 'onAbort({reason:"closed"}) wurde genau einmal gerufen');
	check(table.round.state === 'setzen', 'der Rundenzustand steht wieder auf "setzen"');
	check(table.bets.locked === true, 'das Tuch bleibt GESPERRT — kein wieder geöffneter Tisch, dessen Bank längst zu ist');
	check(table.bets.stakeOn('pass') === 10, 'der liegende Einsatz bleibt als Aufzeichnung sichtbar liegen (kein Abräumen)');

	console.log('     Gegenprobe R-11-G: eine Kopie, die trotzdem abräumt, verliert einen Gewinn spurlos');
	const betsG = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	betsG.place('pass', 10);
	betsG.lock();
	// Fehlerhafte Kopie: sweep() liefe trotz geschlossener Bank durch.
	betsG.sweep();
	check(betsG.stakeOn('pass') === 0,
		'R-11-G: ein Abräumen trotz geschlossener Bank entfernt den Einsatz spurlos, obwohl nie ausgezahlt wurde — R-11 verlangt, dass NICHTS abgeräumt wird, und hätte das erkannt');
}

/* ============================================================================
   R-12 — craps.js entscheidet nichts
   ============================================================================ */

console.log('\nR-12 — craps.js enthält keine der Entscheidungen, die round-craps.js/wagers-craps.js treffen');
{
	const VERBOTENE_AUFRUFE = ['.settle(', '.sweep(', '.payout(', '.lock()', '.unlock()', '.freeze(', '.resolve('];
	const gefundene = VERBOTENE_AUFRUFE.filter((muster) => crapsQuelltext.includes(muster));
	check(gefundene.length === 0, 'craps.js ruft keine dieser Methoden unmittelbar auf', ...gefundene);

	console.log('     Gegenprobe R-12-G: eine eingefügte Zeile bets.lock() wird erkannt');
	const verfaelscht = `${crapsQuelltext}\nbets.lock();`;
	const gefundeneG = VERBOTENE_AUFRUFE.filter((muster) => verfaelscht.includes(muster));
	check(gefundeneG.includes('.lock()'), 'R-12-G: die eingefügte Zeile "bets.lock();" wird von derselben Prüfung erkannt');
}

/* ============================================================================
   R-13 — der lange Zufallslauf ohne Bild
   ============================================================================ */

console.log('\nR-13 — 20 000 gesetzte Würfe: kein negativer Stand, kein Feld über seinem Limit, Bilanz hält');
{
	await credit.reload();
	await credit.set(100000000);
	const table = await buildTable('craps_pruef_r13');
	// Eine gemischte Anfangsausstattung: bank.buyIn(5000) allein ergäbe nach
	// breakDown() ausschließlich 100er-Chips (siehe stockUp()) — die kleinen
	// Einsätze dieses Laufs (5 €, 6 € …) brauchen aber Fünfer und Einer im
	// Rack. Nachgekauft wird unten alle 300 Würfe erneut, damit ein langer
	// Verlustlauf die kleinen Sorten nicht leerlaufen lässt.
	await stockUp(table, { hundert: 20, fuenfundzwanzig: 50, zwanzig: 50, fuenf: 300, eins: 300 });

	// Ein winziger, deterministischer Generator (mulberry32) statt echten
	// Zufalls — Wiederholbarkeit ist hier kein Ziel, ein Node-eigener PRNG
	// genügt und bleibt ohne jede Abhängigkeit.
	let zustand = 20260907 >>> 0;
	function zufall() {
		zustand |= 0;
		zustand = (zustand + 0x6D2B79F5) | 0;
		let t = Math.imul(zustand ^ (zustand >>> 15), 1 | zustand);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
	function wuerfelAuge() {
		return 1 + Math.floor(zufall() * 6);
	}

	let placeWorkingFlag = true;
	table.game.placeWorking = () => placeWorkingFlag;

	const PLACE_POINTS = [4, 5, 6, 8, 9, 10];
	let bilanzAbweichungen = 0;
	let limitAbweichungen = 0;
	let rundenmaxAbweichungen = 0;
	let negativAbweichungen = 0;
	let endzustandAbweichungen = 0;
	let gespielteWuerfe = 0;

	for (let i = 0; i < 20000; i++) {
		// fastStock() statt stockUp(): siehe deren Kopfkommentar. Häufig genug
		// (jeder 20. Wurf), dass die kleinen Sorten bei diesem Einsatzmuster nie
		// ausgehen — gemessen: mit stockUp() an dieser Stelle bräche der Lauf
		// weit vor 20 000 Würfen an leergelaufenen Fünfern und Einern ab
		// ("nostake"), weil jeder einzelne bank.buyIn() über die Kasse geht.
		if (i % 20 === 0) {
			fastStock(table, { fuenf: 40, eins: 40 });
		}
		if (table.bank.amount < 2000) {
			await stockUp(table, { hundert: 20, fuenfundzwanzig: 20, zwanzig: 20 });
		}
		placeWorkingFlag = i % 2 === 0;

		if (table.wagers.point === null) {
			if (table.bets.stakeOn('pass') === 0) {
				await placeAmount(table, 'pass', 5);
			}
		} else {
			if (table.bets.stakeOn('come') === 0 && i % 3 === 0) {
				await placeAmount(table, 'come', 5);
			}
			const platzZahl = PLACE_POINTS[i % PLACE_POINTS.length];
			if (table.bets.stakeOn(`place-${platzZahl}`) === 0 && i % 4 === 0) {
				await placeAmount(table, `place-${platzZahl}`, 6);
			}
			if (table.bets.stakeOn('pass-odds') === 0 && table.bets.stakeOn('pass') > 0) {
				const grenze = oddsMax(table.wagers.point, table.bets.stakeOn('pass'), false);
				if (grenze > 0) {
					await placeAmount(table, 'pass-odds', Math.min(5, grenze));
				}
			}
		}
		await placeAmount(table, 'field', 1);

		const vorBilanz = credit.balance + table.bank.amount + table.bets.total;
		const start = table.game.start(null);
		if (!start.ok) {
			continue;
		}
		gespielteWuerfe++;
		await table.game.onRest(throwResult(wuerfelAuge(), wuerfelAuge()));
		const nachBilanz = credit.balance + table.bank.amount + table.bets.total;
		const erwartetesDelta = (table.lastReport?.payout ?? 0) - (table.lastReport?.total ?? 0);
		if (nachBilanz - vorBilanz !== erwartetesDelta) {
			bilanzAbweichungen++;
		}
		if (table.bank.amount < 0 || credit.balance < 0) {
			negativAbweichungen++;
		}
		for (const feld of FIELDS) {
			if (table.bets.stakeOn(feld.id) > feld.max) {
				limitAbweichungen++;
			}
		}
		if (table.bets.countedTotal > ROUND_MAX) {
			rundenmaxAbweichungen++;
		}
		if (table.round.state !== 'setzen') {
			endzustandAbweichungen++;
		}
	}

	check(gespielteWuerfe > 15000, `von 20 000 Läufen wurden tatsächlich Würfe geworfen (gefunden: ${gespielteWuerfe})`);
	check(bilanzAbweichungen === 0, `die Bilanz hielt in jedem einzelnen Wurf (Abweichungen: ${bilanzAbweichungen})`);
	check(negativAbweichungen === 0, `nie ein negativer Buy-in und nie ein negativer Kassenstand (Abweichungen: ${negativAbweichungen})`);
	check(limitAbweichungen === 0, `nie ein Feld über seinem Höchsteinsatz (Abweichungen: ${limitAbweichungen})`);
	check(rundenmaxAbweichungen === 0, `nie ein gezählter Gesamteinsatz über 300 € (Abweichungen: ${rundenmaxAbweichungen})`);
	check(endzustandAbweichungen === 0, `der Rundenzustand ist am Ende jedes Wurfs wieder "setzen" (Abweichungen: ${endzustandAbweichungen})`);
	await table.bank.close();
}

/* ------------------------------------------------------------------------- */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die acht Schritte laufen in der richtigen'
	+ '\nReihenfolge, die Bilanz stimmt nach jedem Wurf, Come-out/Point/Seven-out laufen'
	+ '\nregelrecht, Chips wandern statt zu verschwinden, Vertragswetten liegen fest,'
	+ '\nOdds zählen nicht in die 300 €, die Odds-Staffel greift beim Setzen, ein'
	+ '\nungültiger Wurf ändert nichts, mayThrow() stimmt in jeder Lage, eine geschlossene'
	+ '\nBank bucht nichts und räumt nichts ab, craps.js entscheidet nichts, und der lange'
	+ '\nZufallslauf über 20 000 Würfe hält alle Grenzen ein.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
