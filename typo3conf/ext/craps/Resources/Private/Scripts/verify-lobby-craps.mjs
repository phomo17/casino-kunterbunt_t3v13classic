/**
 * Craps – Nachweis des Lobby-Anschlusses (Umsetzungsstück D5-3)
 * =================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node, ohne jede
 * npm-Abhängigkeit — Gerüst wörtlich nach dem Vorbild von
 * roulette/verify-lobby-roulette.mjs (derselbe Umsetzungslauf) und
 * casino_lobby/verify-lobby-live.mjs. Die Geldrechnung (C-5) übernimmt
 * wörtlich das Verfahren aus craps/verify-round.mjs: die ECHTEN Module von
 * casino_startpage laufen gegen einen Browserspeicher im Arbeitsspeicher
 * (fakeStore), kein Netzwerk, keine laufende Website nötig.
 *
 * WAS HIER BEWIESEN WIRD (Plan D5, Abschnitt 4.18)
 * ---------------------------------------------------------------
 *   C-1  Wächter: Zahl der Zusagen stimmt
 *   C-2  lobby-craps.js enthält kein fetch(, kein credit, kein bank, kein
 *        payout, keine http-Adresse
 *   C-3  craps.js speist "geber" in new DiceTable ein, und "geber" wird
 *        ausschließlich an zwei Stellen zugewiesen (Anfangswert und
 *        geberSetzen) — die schärfere Gegenprobe zur nachgezogenen Zusage
 *        V-6 in verify-view.mjs und R-12 in verify-round.mjs (siehe dort)
 *   C-4  gerechnet: createSeeded(saatZuZahl(saat)) liefert für 50 Saaten je
 *        500 Ziehungen in craps/rng.js und casino_lobby/lobby-seed.js
 *        dieselbe Folge
 *   C-5  gerechnet, Geld: CrapsRound wird mit CrapsWagers, einem aus der Saat
 *        gespeisten DiceTable und der ECHTEN Bank über 200 Würfe gespielt
 *        (mindestens drei vollständige Point-Serien); nach jedem GEWERTETEN
 *        Wurf gilt Kasse + Buy-in + liegender Einsatz = vorher + (payout −
 *        total). Zwei unabhängige Läufe mit DERSELBEN Saat liefern dieselbe
 *        Folge, zwei mit VERSCHIEDENEN nicht. Ein ungültiger Wurf (zu kurz)
 *        wird automatisch wiederholt, OHNE den Geber zurückzustellen (Plan
 *        4.16, Punkt 2) — genau das prüft dieser Lauf mit, weil er
 *        craps.js' eigenen Wiederholungsweg (game.rethrow(null)) benutzt.
 *   C-6  gerechnet: aus nutzlast() und pointAusStand() (lobby-craps.js)
 *        lässt sich der Point verlustfrei wiederherstellen — 500 zufällige
 *        Serien, nach jedem Wurf die Nutzlast gebildet, in eine zweite,
 *        "frische" CrapsWagers eingespielt, beide Points verglichen
 *   C-7  gerechnet: ein Browser, der genau eine Runde überspringt und sich
 *        danach über die Nutzlast synchronisiert, kennt ab dem nächsten
 *        Wurf denselben Point wie einer, der durchgehend dabei war — und
 *        rechnet deshalb ab dort dieselben Auszahlungen
 *
 * WAS DIESES SKRIPT AUSDRÜCKLICH NICHT BEWEIST (siehe Bericht für die
 * Live-Probe, probe-lobby-craps.mjs): siehe verify-lobby-roulette.mjs,
 * Kopfkommentar — dieselben fünf Punkte, hier zusätzlich: ob die
 * Shooter-Warteliste in einem echten Browser wirklich weitergegeben wird
 * (P-4 in probe-lobby-craps.mjs).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-lobby-craps.mjs
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HIER, '../../..');
const EXT_ROOT = path.resolve(EXT, '..');
const CRAPS_JS_DIR_URL = new URL('../../Public/JavaScript/', new URL('.', import.meta.url));
const CASINO_JS_DIR_URL = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', new URL('.', import.meta.url));

let fehler = 0;
let zusagen = 0;

function check(ok, text, ...zeilen) {
	zusagen++;
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const LOBBY_CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-craps.js');
const CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/craps.js');
const CRAPS_RNG_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rng.js');
const LOBBY_SEED_PFAD = path.join(EXT_ROOT, 'casino_lobby/Resources/Public/JavaScript/lobby-seed.js');

console.log('\nCraps – Nachweis des Lobby-Anschlusses (Umsetzungsstück D5-3)');
console.log('=================================================================\n');

const ERWARTETE_ZUSAGEN = 21;

/* ================================================ C-2 lobby-craps.js kann kein Geld bewegen */

console.log('C-2  lobby-craps.js enthält kein fetch(, kein credit, kein bank, kein payout, keine http-Adresse');
{
	const quelltext = ohneKommentare(lies(LOBBY_CRAPS_PFAD));
	const VERBOTEN = [
		['fetch(', /\bfetch\s*\(/],
		['credit', /\bcredit\b/],
		['bank', /\bbank\b/],
		['payout', /\bpayout\b/],
		['http-Adresse', /https?:\/\//],
	];
	for (const [name, muster] of VERBOTEN) {
		check(!muster.test(quelltext), `lobby-craps.js enthält kein ${name}`, kurz(LOBBY_CRAPS_PFAD));
	}

	console.log('     Gegenprobe C-2-G: eine eingefügte Zeile "void fetch(url);" wird erkannt');
	const verfaelscht = `${quelltext}\nvoid fetch(url);`;
	check(/\bfetch\s*\(/.test(verfaelscht), 'C-2-G: der eingefügte Aufruf wird von derselben Prüfung erkannt');
}

/* ================================================ C-3 geber wird an genau zwei Stellen zugewiesen */

console.log('\nC-3  craps.js speist "geber" in new DiceTable ein; "geber" wird ausschließlich an zwei Stellen zugewiesen');
{
	const quelltext = ohneKommentare(lies(CRAPS_PFAD));
	check(/new DiceTable\(\{\s*random:\s*\(\)\s*=>\s*geber\(\)\s*\}\)/.test(quelltext),
		'new DiceTable({ random: () => geber() }) steht im Quelltext');

	const zuweisungen = [...quelltext.matchAll(/(?<![.\w])geber\s*=(?!=)/g)];
	check(zuweisungen.length === 2, `"geber" wird an genau zwei Stellen zugewiesen (gefunden: ${zuweisungen.length})`);
	check(/let geber = drawUint32;/.test(quelltext), 'die erste Zuweisung ist der Anfangswert "let geber = drawUint32;"');
	check(/geber = neu \?\? drawUint32;/.test(quelltext), 'die zweite Zuweisung liegt im geberSetzen-Rückruf');

	console.log('     Gegenprobe C-3-G: eine eingefügte dritte Zuweisung wird erkannt');
	const verfaelscht = `${quelltext}\ngeber = drawUint32;`;
	const zuweisungenG = [...verfaelscht.matchAll(/(?<![.\w])geber\s*=(?!=)/g)];
	check(zuweisungenG.length === 3, 'C-3-G: die eingefügte dritte Zuweisung wird von derselben Zählung erkannt');
}

/* ================================================ C-4 saatZuZahl bitgenau gleich */

console.log('\nC-4  gerechnet: createSeeded(saatZuZahl(saat)) liefert für 50 Saaten je 500 Ziehungen in craps/rng.js und casino_lobby/lobby-seed.js dieselbe Folge');
{
	function ladeFunktion(quelle, name) {
		const treffer = new RegExp(`export function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`).exec(quelle);
		if (!treffer) {
			throw new Error(`${name}() nicht gefunden`);
		}
		const body = treffer[0].replace('export function', 'return function');
		// eslint-disable-next-line no-new-func
		return new Function(body)();
	}

	const crapsRng = lies(CRAPS_RNG_PFAD);
	const lobbySeed = lies(LOBBY_SEED_PFAD);

	const saatZuZahlA = ladeFunktion(crapsRng, 'saatZuZahl');
	const saatZuZahlB = ladeFunktion(lobbySeed, 'saatZuZahl');
	const createSeededA = ladeFunktion(crapsRng, 'createSeeded');
	const createSeededB = ladeFunktion(lobbySeed, 'createSeeded');

	let abweichungen = 0;
	for (let s = 1; s <= 50; s++) {
		const saat = s.toString(16).padStart(16, '0');
		if (saatZuZahlA(saat) !== saatZuZahlB(saat)) {
			abweichungen++;
			continue;
		}
		const gA = createSeededA(saatZuZahlA(saat));
		const gB = createSeededB(saatZuZahlB(saat));
		for (let i = 0; i < 500; i++) {
			if (gA() !== gB()) {
				abweichungen++;
				break;
			}
		}
	}
	check(abweichungen === 0, `alle 50 Saaten × 500 Ziehungen stimmen bitgenau überein (Abweichungen: ${abweichungen})`);

	console.log('     Gegenprobe C-4-G: eine verfälschte FNV-Konstante schlägt an');
	function ladeVerfaelscht(quelle) {
		const verfaelscht = quelle.replace('0x01000193', '0x01000192');
		return ladeFunktion(verfaelscht, 'saatZuZahl');
	}
	const saatZuZahlVerfaelscht = ladeVerfaelscht(crapsRng);
	check(saatZuZahlA('a1b2c3d4e5f60718') !== saatZuZahlVerfaelscht('a1b2c3d4e5f60718'),
		'C-4-G: die verfälschte Konstante liefert eine andere Zahl');
}

/* ============================================================================
   C-5/C-6/C-7 — mit den echten Modulen von casino_startpage und craps
   ============================================================================ */

const cells = new Map();
const storageListeners = [];
const fakeStore = {
	getItem: (key) => (cells.has(key) ? cells.get(key) : null),
	setItem: (key, value) => { cells.set(key, String(value)); },
	removeItem: (key) => { cells.delete(key); },
	clear: () => { cells.clear(); },
	key: (index) => [...cells.keys()][index] ?? null,
	get length() { return cells.size; },
};
globalThis.localStorage = fakeStore;
globalThis.addEventListener = (type, handler) => { if (type === 'storage') { storageListeners.push(handler); } };
globalThis.removeEventListener = (type, handler) => {
	if (type !== 'storage') { return; }
	const at = storageListeners.indexOf(handler);
	if (at !== -1) { storageListeners.splice(at, 1); }
};

const machineUrl = new URL('machine-credit.js', CASINO_JS_DIR_URL);
const creditUrl = new URL('credit.js', CASINO_JS_DIR_URL);
const chipsUrl = new URL('table-chips.js', CASINO_JS_DIR_URL);
const buyinUrl = new URL('table-buyin.js', CASINO_JS_DIR_URL);
const accountUrl = new URL('account-backend.js', CASINO_JS_DIR_URL);

const creditSource = await readFile(fileURLToPath(creditUrl), 'utf8');
const patchedCredit = creditSource.replaceAll("'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(accountUrl.href));
const creditDataUrl = `data:text/javascript;base64,${Buffer.from(patchedCredit, 'utf8').toString('base64')}`;

const machineSource = await readFile(fileURLToPath(machineUrl), 'utf8');
const patchedMachine = machineSource
	.replaceAll("'@phomo17/casino-startpage/credit.js'", JSON.stringify(creditDataUrl))
	.replaceAll("'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(accountUrl.href));
const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

const buyinSource = await readFile(fileURLToPath(buyinUrl), 'utf8');
const patchedBuyin = buyinSource
	.replaceAll("'@phomo17/casino-startpage/machine-credit.js'", JSON.stringify(machineDataUrl))
	.replaceAll("'@phomo17/casino-startpage/table-chips.js'", JSON.stringify(chipsUrl.href));

const { credit } = await import(creditDataUrl);
const { openTableBank } = await import(`data:text/javascript;base64,${Buffer.from(patchedBuyin, 'utf8').toString('base64')}`);
const { BetTable } = await import(new URL('table-bets.js', CASINO_JS_DIR_URL).href);
const { TableRound } = await import(new URL('table-round.js', CASINO_JS_DIR_URL).href);
const { FIELDS, ROUND_MAX, ratioFor, oddsMax, payout } = await import(new URL('bets-craps.js', CRAPS_JS_DIR_URL).href);
const { CrapsWagers } = await import(new URL('wagers-craps.js', CRAPS_JS_DIR_URL).href);
const { CrapsRound } = await import(new URL('round-craps.js', CRAPS_JS_DIR_URL).href);
const { DiceTable } = await import(new URL('dice-physics.js', CRAPS_JS_DIR_URL).href);
const { createSeeded, saatZuZahl } = await import(new URL('rng.js', CRAPS_JS_DIR_URL).href);
const { nutzlast, pointAusStand } = await import(new URL('lobby-craps.js', CRAPS_JS_DIR_URL).href);

/**
 * Baut einen vollständigen, spielbereiten Tisch mit den ECHTEN Modulen auf —
 * die Würfel gespeist aus createSeeded(saatZuZahl(saat)), genau wie
 * lobby-craps.js es beim Rundenstart tut (saatGeber-Rückruf).
 * @param {string} saat
 * @param {string} key
 * @returns {Promise<Object>}
 */
async function buildTable(saat, key) {
	const bank = openTableBank(key);
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const round = new TableRound();
	const wagers = new CrapsWagers({ ratioFor, oddsMax, payout });
	const dice = new DiceTable({ random: createSeeded(saatZuZahl(saat)) });
	let lastReport = null;
	const game = new CrapsRound({
		round, bets, bank,
		dice: { throw: (setup) => dice.roll(setup) },
		wagers,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		placeWorking: () => true,
		onResult: ({ report }) => { lastReport = report; },
	});
	return { bank, bets, round, wagers, dice, game, get lastReport() { return lastReport; } };
}

/**
 * Ein Wurf „aus der Saat" (Plan 4.16 Punkt 1): game.start(null), dann
 * table.runToRest() bis zum ERSTEN gültigen Ergebnis — ein ungültiger Wurf
 * wird automatisch wiederholt (game.rethrow(null)), OHNE den Geber
 * zurückzustellen (derselbe Weg wie craps.js' onInvalid() bei inLobby).
 * @param {Object} table
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function wurfAusDerSaat(table) {
	const start = table.game.start(null);
	if (start.ok !== true) {
		return start;
	}
	for (let versuch = 0; versuch < 20; versuch++) {
		const ergebnis = table.dice.runToRest();
		const antwort = await table.game.onRest(ergebnis);
		if (antwort.ok === true) {
			return antwort;
		}
		if (antwort.reason !== 'short') {
			return antwort;
		}
		table.game.rethrow(null);
	}
	throw new Error('wurfAusDerSaat: 20 ungültige Würfe in Folge — Testaufbau prüfen');
}

console.log('\nC-5  gerechnet, Geld: 200 Würfe mit einem aus der Saat gespeisten DiceTable; Kasse + Buy-in + liegender Einsatz ändert sich je gewertetem Wurf um genau payout − total');
{
	await credit.reload();
	await credit.set(1000000);
	const SAAT = 'a1b2c3d4e5f60718';
	const table = await buildTable(SAAT, 'lobby_craps_pruef_c5');

	let abweichungen = 0;
	let pointSerien = 0;
	let vorherigerPoint = null;
	for (let i = 0; i < 200; i++) {
		if (table.wagers.point === null && table.bets.stakeOn('pass') === 0) {
			await table.bank.buyIn(5);
			const versuch = table.bets.place('pass', 5);
			if (versuch.ok) {
				const gebucht = await table.bank.placeChip(5);
				if (!gebucht.ok) {
					table.bets.takeBack('pass');
				}
			}
		}
		const vorher = credit.balance + table.bank.amount + table.bets.total;
		const antwort = await wurfAusDerSaat(table);
		if (!antwort.ok) {
			continue;
		}
		if (vorherigerPoint === null && table.wagers.point !== null) {
			pointSerien++;
		}
		vorherigerPoint = table.wagers.point;
		const nachher = credit.balance + table.bank.amount + table.bets.total;
		const erwartetesDelta = table.lastReport.payout - table.lastReport.total;
		if (nachher - vorher !== erwartetesDelta) {
			abweichungen++;
			break;
		}
	}
	check(abweichungen === 0, 'die Bilanz stimmt nach jedem der 200 gewerteten Würfe');
	check(pointSerien >= 3, `mindestens drei vollständige Point-Serien liefen (gefunden: ${pointSerien})`);
	await table.bank.close();

	console.log('     C-5b: zwei unabhängige Läufe mit DERSELBEN Saat liefern dieselbe Folge');
	async function spieleSitzung(saat, key) {
		await credit.reload();
		await credit.set(1000000);
		const t = await buildTable(saat, key);
		const folge = [];
		for (let i = 0; i < 60; i++) {
			if (t.wagers.point === null && t.bets.stakeOn('pass') === 0) {
				await t.bank.buyIn(5);
				const versuch = t.bets.place('pass', 5);
				if (versuch.ok) {
					const gebucht = await t.bank.placeChip(5);
					if (!gebucht.ok) { t.bets.takeBack('pass'); }
				}
			}
			const antwort = await wurfAusDerSaat(t);
			folge.push({ ok: antwort.ok, faces: t.lastReport?.faces ?? null, payout: t.lastReport?.payout ?? null, point: t.wagers.point });
		}
		await t.bank.close();
		return folge;
	}
	const eins = await spieleSitzung(SAAT, 'lobby_craps_pruef_c5b_eins');
	const zwei = await spieleSitzung(SAAT, 'lobby_craps_pruef_c5b_zwei');
	check(JSON.stringify(eins) === JSON.stringify(zwei), 'zwei Sitzungen mit derselben Saat liefern Zeichen für Zeichen dieselbe Folge über 60 Würfe');

	console.log('     C-5c (Gegenprobe): zwei Läufe mit VERSCHIEDENEN Saaten liefern eine andere Folge');
	const drei = await spieleSitzung('ffffffffffffffff', 'lobby_craps_pruef_c5c');
	check(JSON.stringify(eins) !== JSON.stringify(drei), 'eine andere Saat liefert tatsächlich eine andere Folge — C-5b ist also keine leere Bedingung');
}

console.log('\nC-6  gerechnet: aus nutzlast() und pointAusStand() lässt sich der Point verlustfrei wiederherstellen — 500 zufällige Serien');
{
	let abweichungen = 0;
	let rundenNummer = 0;
	for (let serie = 0; serie < 500; serie++) {
		rundenNummer++;
		const original = new CrapsWagers({ ratioFor, oddsMax, payout });
		const frisch = new CrapsWagers({ ratioFor, oddsMax, payout });
		// Ein zufälliger Wurf reicht, um point/previousPoint durchzuspielen —
		// C-6 prüft die verlustfreie WIEDERHERSTELLUNG, nicht die Serienlänge
		// (das leistet C-5).
		const w1 = 1 + Math.floor(Math.random() * 6);
		const w2 = 1 + Math.floor(Math.random() * 6);
		const report = original.resolve({ sum: w1 + w2, faces: [w1, w2], stakes: {}, placeWorking: true });

		const nutzlastText = nutzlast(report, original.point);
		const stand = { erg: nutzlastText, ergR: rundenNummer, runde: rundenNummer };
		const wiederhergestellterPoint = pointAusStand(stand);
		if (wiederhergestellterPoint === undefined) {
			abweichungen++;
			continue;
		}
		frisch.restore({ point: wiederhergestellterPoint });
		if (frisch.point !== original.point) {
			abweichungen++;
		}
	}
	check(abweichungen === 0, `500 zufällige Würfe: der wiederhergestellte Point stimmt immer mit dem Original überein (Abweichungen: ${abweichungen})`);

	console.log('     Gegenprobe C-6-G: eine zu alte Nutzlast (ergR zwei Runden zurück) wird NICHT angewendet');
	const zuAlt = pointAusStand({ erg: '4_3_ps_8', ergR: 10, runde: 13 });
	check(zuAlt === undefined, 'C-6-G: pointAusStand() liefert undefined (nicht anwenden) statt eines geratenen Points', `gefunden: ${zuAlt}`);
}

console.log('\nC-7  gerechnet: eine genau eine Runde übersprungene Sitzung kennt ab dem nächsten Wurf denselben Point wie eine durchgehende');
{
	// REIN RECHNEND, wie C-6 — kein Tisch, kein Geld, keine eigenen Würfel
	// für "uebersprungen". Das bildet den echten Weg nach (Plan 4.16, Punkt
	// 4): pointAusStand()/pointSetzen() läuft bei JEDER Abfrage, nicht nur
	// beim Nachholen — der Point kommt IMMER vom Server, nie aus einer
	// eigenen, potenziell lückenhaften Fortschreibung. "uebersprungen" führt
	// deshalb absichtlich KEIN eigenes wagers.resolve() — dieselbe
	// Aufgabenteilung wie im echten Adapter (aufStand() ruft pointSetzen(),
	// nicht resolve()).
	let abweichungen = 0;
	const DURCHLAEUFE = 200;
	const UEBERSPRUNGENE_RUNDE_MIN = 3;
	for (let lauf = 0; lauf < DURCHLAEUFE; lauf++) {
		const wahrheit = new CrapsWagers({ ratioFor, oddsMax, payout });
		const uebersprungen = new CrapsWagers({ ratioFor, oddsMax, payout });
		const uebersprungeneRunde = UEBERSPRUNGENE_RUNDE_MIN + Math.floor(Math.random() * 3);
		const ANZAHL_RUNDEN = uebersprungeneRunde + 4;

		for (let runde = 1; runde <= ANZAHL_RUNDEN; runde++) {
			const w1 = 1 + Math.floor(Math.random() * 6);
			const w2 = 1 + Math.floor(Math.random() * 6);
			const report = wahrheit.resolve({ sum: w1 + w2, faces: [w1, w2], stakes: {}, placeWorking: true });
			if (runde === uebersprungeneRunde) {
				continue; // die verpasste Abfrage — "uebersprungen" bekommt diese Runde NICHT
			}
			const point = pointAusStand({ erg: nutzlast(report, wahrheit.point), ergR: runde, runde });
			if (point !== undefined) {
				uebersprungen.restore({ point });
			}
			if (runde > uebersprungeneRunde && uebersprungen.point !== wahrheit.point) {
				abweichungen++;
			}
		}
	}
	check(abweichungen === 0,
		`ab der Runde nach der übersprungenen kennt "uebersprungen" denselben Point wie "wahrheit" — durchgehend in jeder Folgerunde (${DURCHLAEUFE} Läufe)`);

	console.log('     Gegenprobe C-7-G: ZWEI übersprungene Runden werden NICHT nachgezogen (die Freigrenze ist genau eine Runde)');
	const wahrheitG = new CrapsWagers({ ratioFor, oddsMax, payout });
	const w1a = wahrheitG.resolve({ sum: 8, faces: [5, 3], stakes: {}, placeWorking: true }); // Point 8
	const standRunde1 = { erg: nutzlast(w1a, wahrheitG.point), ergR: 1, runde: 1 };
	// Zwei Runden ohne Abfrage vergehen (Runde 2 und 3 werden NICHT gelesen);
	// bei Runde 3 angekommen ist ergR (1) älter als runde (3) minus eins (2).
	const punktG = pointAusStand({ erg: standRunde1.erg, ergR: standRunde1.ergR, runde: 3 });
	check(punktG === undefined, 'C-7-G: pointAusStand() verweigert die Anwendung, wenn zwei Runden statt einer übersprungen wurden', `gefunden: ${punktG}`);
}

/* ------------------------------------------------------------- Wächter/Ergebnis */

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
