/**
 * Roulette – Nachweis des Lobby-Anschlusses (Umsetzungsstück D5-3)
 * ====================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node, ohne jede
 * npm-Abhängigkeit — Gerüst wörtlich nach dem Vorbild von
 * casino_lobby/verify-lobby-live.mjs (check()-Zähler, lies(), kurz(),
 * Wächterzahl am Ende). Die Geldrechnung (R-5/R-6) übernimmt wörtlich das
 * Verfahren aus verify-round.mjs (derselben Extension): die ECHTEN Module
 * von casino_startpage laufen gegen einen Browserspeicher im Arbeitsspeicher
 * (fakeStore), kein Netzwerk, keine laufende Website nötig, Laufzeit unter
 * zwei Sekunden.
 *
 * WAS HIER BEWIESEN WIRD (Plan D5, Abschnitt 4.18)
 * ---------------------------------------------------------------
 *   R-1  Wächter: Zahl der Zusagen stimmt
 *   R-2  lobby-roulette.js enthält kein fetch(, kein credit, kein bank, kein
 *        payout, keine http-Adresse — der Adapter kann kein Geld bewegen und
 *        keinen Server erreichen
 *   R-3  roulette.js speist "geber" in new Wheel ein, und "geber" wird
 *        ausschließlich an zwei Stellen zugewiesen (Anfangswert und
 *        geberSetzen) — die schärfere Gegenprobe zur nachgezogenen Zusage
 *        V-14 in verify-view.mjs (siehe dort)
 *   R-4  gerechnet: createSeeded(saatZuZahl(saat)) liefert für 50 Saaten je
 *        500 Ziehungen in roulette/rng.js und casino_lobby/lobby-seed.js
 *        dieselbe Folge
 *   R-5  gerechnet, Geld: RouletteRound wird mit einem aus der Saat
 *        gespeisten Rad und der ECHTEN Bank 200 Runden gespielt; nach jeder
 *        Runde gilt Kasse + Buy-in + liegender Einsatz = vorher +
 *        (report.payout − report.total). Zwei unabhängige Läufe mit
 *        DERSELBEN Saat liefern dieselbe Zahlenfolge und dieselbe Bilanz,
 *        zwei mit VERSCHIEDENEN Saaten nicht
 *   R-6  gerechnet, Geld: die aus report.fields gebildeten outcome-Werte
 *        summieren sich über alle Felder auf report.payout − report.total —
 *        die Zahl, die die anderen am Platz sehen (D.10.6), ist dieselbe,
 *        die der eigene Buy-in erfahren hat
 *
 * WAS DIESES SKRIPT AUSDRÜCKLICH NICHT BEWEIST (siehe Bericht des
 * Umsetzungslaufs für die Live-Probe, probe-lobby-roulette.mjs):
 *   - ob zwei ECHTE Browser dieselbe Zahl fallen sehen (hier läuft beides im
 *     selben Node-Prozess);
 *   - ob der Geber im Browser wirklich zur richtigen Zeit umgestellt wird;
 *   - ob eine im Server laufende Runde im Browser auch losgeht;
 *   - ob Geld, das den Gerätekredit verlässt, beim Konto ankommt;
 *   - ob der Verlust eines mitten in der Runde gehenden Spielers eintritt.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-lobby-roulette.mjs
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HIER, '../../..');
const EXT_ROOT = path.resolve(EXT, '..');
const ROULETTE_JS_DIR_URL = new URL('../../Public/JavaScript/', new URL('.', import.meta.url));
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

/** Entfernt Block- und Zeilenkommentare, damit eine dokumentierte Grenze
 *  ("kein fetch(") nicht ihre eigene Prüfung auslöst. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const LOBBY_ROULETTE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-roulette.js');
const ROULETTE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/roulette.js');
const ROULETTE_RNG_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rng.js');
const LOBBY_SEED_PFAD = path.join(EXT_ROOT, 'casino_lobby/Resources/Public/JavaScript/lobby-seed.js');

console.log('\nRoulette – Nachweis des Lobby-Anschlusses (Umsetzungsstück D5-3)');
console.log('====================================================================\n');

const ERWARTETE_ZUSAGEN = 17;

/* ================================================ R-2 lobby-roulette.js kann kein Geld bewegen */

console.log('R-2  lobby-roulette.js enthält kein fetch(, kein credit, kein bank, kein payout, keine http-Adresse');
{
	const quelltext = ohneKommentare(lies(LOBBY_ROULETTE_PFAD));
	const VERBOTEN = [
		['fetch(', /\bfetch\s*\(/],
		['credit', /\bcredit\b/],
		['bank', /\bbank\b/],
		['payout', /\bpayout\b/],
		['http-Adresse', /https?:\/\//],
	];
	for (const [name, muster] of VERBOTEN) {
		check(!muster.test(quelltext), `lobby-roulette.js enthält kein ${name}`, kurz(LOBBY_ROULETTE_PFAD));
	}

	console.log('     Gegenprobe R-2-G: eine eingefügte Zeile "void fetch(url);" wird erkannt');
	const verfaelscht = `${quelltext}\nvoid fetch(url);`;
	check(/\bfetch\s*\(/.test(verfaelscht), 'R-2-G: der eingefügte Aufruf wird von derselben Prüfung erkannt');
}

/* ================================================ R-3 geber wird an genau zwei Stellen zugewiesen */

console.log('\nR-3  roulette.js speist "geber" in new Wheel ein; "geber" wird ausschließlich an zwei Stellen zugewiesen');
{
	const quelltext = ohneKommentare(lies(ROULETTE_PFAD));
	check(/new Wheel\(\{\s*random:\s*\(\)\s*=>\s*geber\(\)\s*\}\)/.test(quelltext),
		'new Wheel({ random: () => geber() }) steht im Quelltext');

	// GENAU ZWEI Zuweisungen: "let geber = drawUint32;" (Anfangswert) und
	// "geber = neu ?? drawUint32;" (im geberSetzen-Rückruf). Eine gezählte
	// Zuweisung ist mehr wert als eine bloße Abwesenheitsprüfung — die
	// schärfere Prüfung, die die Risikotabelle des Plans für die
	// nachgezogene Zusage V-14 verlangt.
	const zuweisungen = [...quelltext.matchAll(/(?<![.\w])geber\s*=(?!=)/g)];
	check(zuweisungen.length === 2, `"geber" wird an genau zwei Stellen zugewiesen (gefunden: ${zuweisungen.length})`);
	check(/let geber = drawUint32;/.test(quelltext), 'die erste Zuweisung ist der Anfangswert "let geber = drawUint32;"');
	check(/geber = neu \?\? drawUint32;/.test(quelltext), 'die zweite Zuweisung liegt im geberSetzen-Rückruf');

	console.log('     Gegenprobe R-3-G: eine eingefügte dritte Zuweisung wird erkannt');
	const verfaelscht = `${quelltext}\ngeber = drawUint32;`;
	const zuweisungenG = [...verfaelscht.matchAll(/(?<![.\w])geber\s*=(?!=)/g)];
	check(zuweisungenG.length === 3, 'R-3-G: die eingefügte dritte Zuweisung wird von derselben Zählung erkannt');
}

/* ================================================ R-4 saatZuZahl bitgenau gleich */

console.log('\nR-4  gerechnet: createSeeded(saatZuZahl(saat)) liefert für 50 Saaten je 500 Ziehungen in roulette/rng.js und casino_lobby/lobby-seed.js dieselbe Folge');
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

	const rouletteRng = lies(ROULETTE_RNG_PFAD);
	const lobbySeed = lies(LOBBY_SEED_PFAD);

	const saatZuZahlA = ladeFunktion(rouletteRng, 'saatZuZahl');
	const saatZuZahlB = ladeFunktion(lobbySeed, 'saatZuZahl');
	const createSeededA = ladeFunktion(rouletteRng, 'createSeeded');
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

	console.log('     Gegenprobe R-4-G: eine verfälschte FNV-Konstante schlägt an');
	function ladeVerfaelscht(quelle) {
		const verfaelscht = quelle.replace('0x01000193', '0x01000192');
		return ladeFunktion(verfaelscht, 'saatZuZahl');
	}
	const saatZuZahlVerfaelscht = ladeVerfaelscht(rouletteRng);
	check(saatZuZahlA('a1b2c3d4e5f60718') !== saatZuZahlVerfaelscht('a1b2c3d4e5f60718'),
		'R-4-G: die verfälschte Konstante liefert eine andere Zahl');
}

/* ============================================================================
   R-5/R-6 — Geld, mit den echten Modulen von casino_startpage
   ============================================================================ */

/** Browserspeicher im Arbeitsspeicher — dasselbe Verfahren wie verify-round.mjs. */
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
const { FIELDS, ROUND_MAX } = await import(new URL('bets-roulette.js', ROULETTE_JS_DIR_URL).href);
const { RouletteRound } = await import(new URL('round-roulette.js', ROULETTE_JS_DIR_URL).href);
const { Wheel } = await import(new URL('wheel-physics.js', ROULETTE_JS_DIR_URL).href);
const { labelOf, colourOf } = await import(new URL('wheel-geometry.js', ROULETTE_JS_DIR_URL).href);
const { createSeeded, saatZuZahl } = await import(new URL('rng.js', ROULETTE_JS_DIR_URL).href);

/**
 * Baut einen vollständigen, spielbereiten Tisch mit den ECHTEN Modulen auf —
 * das Rad gespeist aus createSeeded(saatZuZahl(saat)), genau wie
 * lobby-roulette.js es beim Rundenstart tut (saatGeber-Rückruf).
 * @param {string} saat
 * @param {string} key
 * @returns {Promise<Object>}
 */
async function buildTable(saat, key) {
	const bank = openTableBank(key);
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const physics = new Wheel({ random: createSeeded(saatZuZahl(saat)) });
	const round = new TableRound();
	let lastReport = null;
	const game = new RouletteRound({
		round, bets, bank,
		wheel: { launch: () => physics.launch() },
		colourOf,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		onResult: ({ report }) => { lastReport = report; },
	});
	return { bank, bets, physics, round, game, get lastReport() { return lastReport; } };
}

async function ensureChipAndBet(table, runde) {
	await table.bank.buyIn(1);
	const feld = FIELDS[runde % FIELDS.length].id;
	const versuch = table.bets.place(feld, 1);
	if (versuch.ok) {
		const gebucht = await table.bank.placeChip(1);
		if (!gebucht.ok) {
			table.bets.takeBack(feld);
		}
	}
}

async function playRound(table) {
	const startResult = table.game.start();
	if (startResult.ok !== true) {
		return { startResult, label: null };
	}
	const index = table.physics.runToRest();
	const label = labelOf(index);
	await table.game.settleAt(label);
	return { startResult, label };
}

console.log('\nR-5  gerechnet, Geld: 200 Runden mit einem aus der Saat gespeisten Rad; Kasse + Buy-in + liegender Einsatz ändert sich je Runde um genau payout − total');
{
	await credit.reload();
	await credit.set(1000000);
	const SAAT = 'a1b2c3d4e5f60718';
	const table = await buildTable(SAAT, 'lobby_roulette_pruef_r5');

	let abweichungen = 0;
	for (let i = 0; i < 200; i++) {
		await ensureChipAndBet(table, i);
		const vorher = credit.balance + table.bank.amount + table.bets.total;
		const { startResult } = await playRound(table);
		if (!startResult.ok) {
			continue;
		}
		const nachher = credit.balance + table.bank.amount + table.bets.total;
		const erwartetesDelta = table.lastReport.payout - table.lastReport.total;
		if (nachher - vorher !== erwartetesDelta) {
			abweichungen++;
			break;
		}
	}
	check(abweichungen === 0, 'die Bilanz stimmt nach jeder der 200 Runden');
	await table.bank.close();

	console.log('     R-5b: zwei unabhängige Läufe mit DERSELBEN Saat liefern dieselbe Folge und dieselbe Bilanz');
	async function spieleSitzung(saat, key) {
		await credit.reload();
		await credit.set(1000000);
		const t = await buildTable(saat, key);
		const folge = [];
		for (let i = 0; i < 50; i++) {
			await ensureChipAndBet(t, i);
			const { label } = await playRound(t);
			folge.push({ label, payout: t.lastReport?.payout ?? null, buyIn: t.bank.amount });
		}
		await t.bank.close();
		return folge;
	}
	const eins = await spieleSitzung(SAAT, 'lobby_roulette_pruef_r5b_eins');
	const zwei = await spieleSitzung(SAAT, 'lobby_roulette_pruef_r5b_zwei');
	check(JSON.stringify(eins) === JSON.stringify(zwei),
		'zwei Sitzungen mit derselben Saat liefern Zeichen für Zeichen dieselbe Folge über 50 Runden');

	console.log('     R-5c (Gegenprobe): zwei Läufe mit VERSCHIEDENEN Saaten liefern eine andere Folge');
	const drei = await spieleSitzung('ffffffffffffffff', 'lobby_roulette_pruef_r5c');
	check(JSON.stringify(eins) !== JSON.stringify(drei),
		'eine andere Saat liefert tatsächlich eine andere Folge — R-5b ist also keine leere Bedingung');
}

console.log('\nR-6  gerechnet, Geld: die aus report.fields gebildeten Ausgänge summieren sich auf payout − total');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable('0011223344556677', 'lobby_roulette_pruef_r6');

	let abweichungen = 0;
	for (let i = 0; i < 100; i++) {
		// Mehrere Felder zugleich, damit die Summenbildung wirklich mehrere
		// Einträge zusammenzählt, nicht nur einen.
		await table.bank.buyIn(3);
		for (const feldId of [FIELDS[i % FIELDS.length].id, FIELDS[(i + 7) % FIELDS.length].id, FIELDS[(i + 13) % FIELDS.length].id]) {
			const versuch = table.bets.place(feldId, 1);
			if (versuch.ok) {
				const gebucht = await table.bank.placeChip(1);
				if (!gebucht.ok) {
					table.bets.takeBack(feldId);
				}
			}
		}
		const { startResult } = await playRound(table);
		if (!startResult.ok) {
			continue;
		}
		const ausgaenge = Object.fromEntries(
			table.lastReport.fields.map((f) => [f.fieldId, f.returned - f.staked])
		);
		const summe = Object.values(ausgaenge).reduce((a, b) => a + b, 0);
		const erwartet = table.lastReport.payout - table.lastReport.total;
		if (summe !== erwartet) {
			abweichungen++;
			break;
		}
	}
	check(abweichungen === 0, 'die Summe der gemeldeten Ausgänge (returned − staked je Feld) stimmt über 100 Runden mit payout − total überein');
	await table.bank.close();
}

/* ------------------------------------------------------------- Wächter/Ergebnis */

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
