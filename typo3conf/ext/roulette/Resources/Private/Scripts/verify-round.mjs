/**
 * Roulette – Nachweis der Rundenlogik, der Auszahlung und der Kassenführung
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Rechnet ausschließlich mit
 * den ECHTEN Dateien der Extension und des Site Packages und startet keinen
 * Browser. Laufzeit unter zwei Sekunden.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-round.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * MIT WELCHEN DATEIEN GERECHNET WIRD, UND WIE
 * -----------------------------------------------
 * Unmittelbar geladen (sie importieren selbst nichts):
 *   bets-roulette.js, round-roulette.js, wheel-physics.js, wheel-geometry.js,
 *   rng.js (alle roulette), sowie table-bets.js, table-round.js,
 *   table-chips.js, credit.js (alle casino_startpage).
 *
 * table-buyin.js importiert ZWEI Module über die Import-Map von TYPO3, die
 * Node nicht kennt: machine-credit.js und table-chips.js. Beide werden daher
 * als Text gelesen und ihr Modulname durch eine vollständige Dateiadresse
 * ersetzt, bevor das Ergebnis als data:-Modul geladen wird — dasselbe
 * Verfahren wie in verify-table-money.mjs, Zeile für Zeile derselbe Code, nur
 * mit anderen Modulnamen. Der Browserspeicher im Arbeitsspeicher (fakeStore)
 * ist von dort übernommen, mit diesem, neu geschriebenen Kopfkommentar: er
 * bildet localStorage.getItem/setItem/removeItem/clear/key/length sowie das
 * "storage"-Ereignis nach, damit machine-credit.js und credit.js unverändert
 * darauf arbeiten können, ohne dass ein echter Browser beteiligt wäre.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.21, Teilstück C3d)
 * ---------------------------------------------------------------
 *   R-1   Wiederholbarkeit: gleiche Saat, gleiche Rundenfolge
 *   R-2   Gegenprobe zu R-1: verschiedene Saaten, verschiedene Folgen
 *   R-3   die Bilanz stimmt nach JEDER einzelnen Runde
 *   R-4   die Invariante des Racks (rack.total === machineCredit.amount)
 *   R-5   bank.staked === bets.total nach jedem Schritt
 *   R-6   JEDES der 159 Felder zahlt richtig, über ALLE 38 Ergebnisse (Behebung
 *         Review C3, H2: vorher ein Vertreterfeld je Wettart, 380 Aussagen)
 *   R-7   kein Feld lässt sich über sein Limit belegen
 *   R-8   der Rundenhöchstbetrag greift, "verdoppeln" ist alles oder nichts
 *   R-9   während der Runde nimmt das Tuch nichts an
 *   R-10  CASH OUT ist gesperrt, solange Chips liegen — auch bei leerem Rack
 *   R-11  beim Verlassen der Seite bleibt nichts liegen
 *   R-12  der Rundenablauf wird vollständig durchlaufen
 *   R-13  eine Runde ohne Einsatz wird abgelehnt
 *   R-14  es entsteht kein neuer Speicherschlüssel
 *   R-15  ein Rad, dessen launch() false liefert, hinterlässt den Tisch in
 *         "setzen" mit offenem Tuch statt für immer in "laeuft" (Behebung
 *         Review C3, M6)
 *
 * WAS DIESES SKRIPT AUSDRÜCKLICH NICHT BEWEIST
 * -------------------------------------------------
 * Den Weg vom Klick auf einen Feldknopf bis zum Chip auf dem Tuch — der liegt
 * in table-felt.js und ist seit Phase C1 durch verify-table-bets.mjs und
 * verify-table-money.mjs bewiesen. Dieses Skript legt seine Chips über
 * dieselben zwei Aufrufe in derselben Reihenfolge, die table-felt.js benutzt
 * (bets.place(), dann bank.placeChip(), bei Absage zurückrollen); dass
 * table-felt.js diese Reihenfolge einhält, prüft verify-felt.mjs /
 * verify-table-view.mjs statisch.
 *
 * WIE DIE PHYSIK HIER GESPIELT WIRD, OHNE wheel-view.js
 * ----------------------------------------------------------
 * RouletteRound erwartet "wheel: {launch: Function}" — im Browser ist das der
 * Rückgabewert von connectWheel() (die ANSICHT). Hier genügt ein winziger
 * Platzhalter, dessen launch() unmittelbar die ECHTE Physik (wheel-physics.js)
 * anwirft: { launch: () => physics.launch() }. Nach game.start() liest dieses
 * Skript physics.runToRest() — dieselbe Methode, mit der auch wheel-view.js
 * bei "Bewegung reduzieren" arbeitet (siehe dessen Kopfkommentar und V-7 in
 * verify-view.mjs) — und reicht das Ergebnis über labelOf() an
 * game.settleAt() weiter. Es fehlt damit nur die Zeichenschleife (RequestAni-
 * mationFrame); jede Rechnung läuft mit den echten Modulen.
 *
 * JEDE NEUE PRÜFUNG HAT EINE GEGENPROBE
 * ----------------------------------------
 * Eine Prüfung, die nie fehlschlagen kann, ist keine. Jede Gegenprobe arbeitet
 * auf einer im Skript selbst angefertigten, verfälschten Kopie oder einem
 * absichtlich fehlerhaften Ablauf — niemals auf dem echten Zustand des
 * laufenden Nachweises.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HIER = new URL('.', import.meta.url);
/** typo3conf/ext/roulette/Resources/Public/JavaScript/ */
const ROULETTE_JS_DIR = new URL('../../Public/JavaScript/', HIER);
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

console.log('\nRoulette – Nachweis der Rundenlogik, der Auszahlung und der Kassenführung');
console.log('============================================================================\n');

/* ----------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher, samt "storage"-Ereignis — dasselbe
   Verfahren wie in verify-table-money.mjs (casino_startpage), hier neu
   geschrieben und ohne dessen Projektbezüge.
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

const { FIELDS, ROUND_MAX } = await import(new URL('bets-roulette.js', ROULETTE_JS_DIR).href);
const { RouletteRound } = await import(new URL('round-roulette.js', ROULETTE_JS_DIR).href);
const { Wheel } = await import(new URL('wheel-physics.js', ROULETTE_JS_DIR).href);
const { WHEEL_ORDER, labelOf, colourOf } = await import(new URL('wheel-geometry.js', ROULETTE_JS_DIR).href);
const { createSeeded } = await import(new URL('rng.js', ROULETTE_JS_DIR).href);

/** Für R-14: welche Bank-Schlüssel dieser Lauf insgesamt geöffnet hat. */
const geoeffneteSchluessel = [];

/**
 * Baut einen vollständigen, spielbereiten Tisch mit den ECHTEN Modulen auf.
 * Die Physik wird NICHT über wheel-view.js angesteuert (kein Dokument
 * vorhanden) — siehe Kopfkommentar, Abschnitt "WIE DIE PHYSIK HIER GESPIELT
 * WIRD".
 *
 * @param {number} seed
 * @param {string} key ein je Aufruf eindeutiger Bank-Schlüssel
 * @returns {Promise<Object>}
 */
async function buildTable(seed, key) {
	geoeffneteSchluessel.push(key);
	const bank = openTableBank(key);
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const physics = new Wheel({ random: createSeeded(seed) });
	const round = new TableRound();
	const stateLog = [];
	let lastReport = null;
	const game = new RouletteRound({
		round,
		bets,
		bank,
		wheel: { launch: () => physics.launch() },
		colourOf,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		onState: ({ state }) => stateLog.push(state),
		onResult: ({ report }) => { lastReport = report; },
	});
	return {
		bank, bets, physics, round, game,
		get stateLog() { return stateLog; },
		get lastReport() { return lastReport; },
	};
}

/**
 * Legt Chips wie table-felt.js: erst bets.place(), dann bank.placeChip(),
 * bei Absage zurückrollen (siehe Kopfkommentar).
 * @param {Object} table
 * @param {Array<{fieldId: string, value: number}>} plan
 * @returns {Promise<void>}
 */
async function placeBets(table, plan) {
	for (const { fieldId, value } of plan) {
		const versuch = table.bets.place(fieldId, value);
		if (!versuch.ok) {
			continue;
		}
		const gebucht = await table.bank.placeChip(value);
		if (!gebucht.ok) {
			table.bets.takeBack(fieldId);
		}
	}
}

/**
 * Spielt eine vollständige Runde mit den echten Modulen durch.
 * @param {Object} table
 * @returns {Promise<{startResult: Object, label: ?string, settleResult: ?Object}>}
 */
async function playRound(table) {
	const startResult = table.game.start();
	if (startResult.ok !== true) {
		return { startResult, label: null, settleResult: null };
	}
	const index = table.physics.runToRest();
	const label = labelOf(index);
	const settleResult = await table.game.settleAt(label);
	return { startResult, label, settleResult };
}

/** Ein deterministischer, gleichmäßig über alle Felder laufender Setzplan. */
function betPlanFor(runde) {
	return [{ fieldId: FIELDS[runde % FIELDS.length].id, value: 1 }];
}

/**
 * Kauft VOR jeder Runde genau einen frischen 1-Euro-Chip nach, statt sich auf
 * einen einzigen großen Buy-in zu Beginn zu verlassen. Grund: ob ein 1-Euro-
 * Chip nach einer Auszahlung wieder im Rack liegt, hängt von breakDown() des
 * jeweils ausgezahlten Betrags ab (Verluste legen NIE etwas nach) — ein
 * langer Verlustlauf hätte das Rack sonst leerlaufen lassen und Runden ab
 * diesem Punkt mit 'nostake' abgelehnt, obwohl das nicht die Aussage der
 * jeweiligen Prüfung ist. Für R-1/R-2 ist das unschädlich, weil beide
 * Sitzungen identisch betroffen wären (Determinismus bliebe erhalten) — für
 * R-4/R-5/R-9/R-12 würde es aber die falsche Sache prüfen (eine ausgetrocknete
 * Kasse statt der eigentlich gemeinten Regel). Ein Euro zusätzlicher Buy-in
 * pro Runde ist gegenüber dem Kassenstand (1.000.000) vernachlässigbar.
 * @param {Object} table
 * @param {number} runde
 * @returns {Promise<void>}
 */
async function ensureChipAndBet(table, runde) {
	await table.bank.buyIn(1);
	await placeBets(table, betPlanFor(runde));
}

/* ============================================================================
   R-1 — Wiederholbarkeit
   ============================================================================ */

console.log('R-1 — 500 Runden, zweimal mit derselben Saat gespielt');
{
	await credit.reload();
	await credit.set(1000000);

	async function spieleSitzung(key) {
		const table = await buildTable(20260905, key);
		const folge = [];
		for (let i = 0; i < 500; i++) {
			await ensureChipAndBet(table, i);
			const { label, settleResult } = await playRound(table);
			folge.push({
				label,
				credited: table.lastReport?.payout ?? null,
				staked: table.lastReport?.total ?? null,
				buyIn: table.bank.amount,
				ok: settleResult?.ok ?? null,
			});
		}
		await table.bank.close();
		return folge;
	}

	const folgeEins = await spieleSitzung('roulette_pruef_r1_eins');
	const folgeZwei = await spieleSitzung('roulette_pruef_r1_zwei');
	check(JSON.stringify(folgeEins) === JSON.stringify(folgeZwei),
		'zwei Sitzungen mit derselben Saat liefern Zeichen für Zeichen dieselbe Folge über 500 Runden');
}

/* ============================================================================
   R-2 — Gegenprobe zu R-1
   ============================================================================ */

console.log('\nR-2 — zehn verschiedene Saaten liefern zehn verschiedene Folgen');
{
	await credit.reload();
	await credit.set(1000000);

	const folgen = [];
	for (let s = 1; s <= 10; s++) {
		const table = await buildTable(20260900 + s, `roulette_pruef_r2_${s}`);
		const folge = [];
		for (let i = 0; i < 50; i++) {
			await ensureChipAndBet(table, i);
			const { label } = await playRound(table);
			folge.push(label);
		}
		await table.bank.close();
		folgen.push(JSON.stringify(folge));
	}
	const eindeutig = new Set(folgen);
	check(eindeutig.size === folgen.length,
		`alle ${folgen.length} Saaten liefern paarweise verschiedene Folgen (eindeutige Folgen: ${eindeutig.size})`);
}

/* ============================================================================
   R-3 — die Bilanz stimmt nach JEDER einzelnen Runde
   ============================================================================ */

console.log('\nR-3 — 500 Runden, die Bilanz nach jeder einzelnen geprüft');
{
	// Behebung Review C3, M3: README behauptete 500 Runden, R-3 spielte nur
	// 300 — angehoben auf 500 statt die README-Zahl zu senken, damit sie zur
	// README passt (dieselben 500 wie R-1/R-12), gemessen weiterhin unter
	// zwei Sekunden für das gesamte Skript.
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable(20260905, 'roulette_pruef_r3');

	let abweichungen = 0;
	for (let i = 0; i < 500; i++) {
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
			check(false, `Runde ${i + 1}: Delta ${nachher - vorher} !== erwartet ${erwartetesDelta}`);
			break;
		}
	}
	check(abweichungen === 0, 'die Bilanz (Kasse + Buy-in + liegender Einsatz) ändert sich je Runde um genau payout − total');
	await table.bank.close();
}

console.log('\n     Gegenprobe R-3-G: ein zweites, fehlerhaftes payout() macht die Bilanzprüfung rot');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable(20260905, 'roulette_pruef_r3g');
	await table.bank.buyIn(1); // genau ein 1-Euro-Chip, damit place() unten sicher greift
	await placeBets(table, [{ fieldId: 'n-1', value: 1 }]);
	check(table.bets.total === 1, 'Testaufbau: 1 Euro liegt auf "n-1"');

	const vorher = credit.balance + table.bank.amount + table.bets.total;
	const report = table.bets.settle('1'); // 'n-1' deckt '1' — ein erzwungener Gewinn
	await table.bank.payout(report.payout, report.total);
	// Der Fehler: ein zweites Mal gutschreiben, als hätte payoutSumme zweimal gezählt.
	await table.bank.payout(report.payout, 0);
	table.bets.sweep();
	const nachher = credit.balance + table.bank.amount + table.bets.total;
	const erwartetesDelta = report.payout - report.total;
	check(nachher - vorher !== erwartetesDelta,
		'ein doppeltes payout() lässt das tatsächliche Delta vom erwarteten abweichen — R-3 hätte das rot gemacht',
		`tatsächlich: ${nachher - vorher}, erwartet: ${erwartetesDelta}`);
	await table.bank.close();
}

/* ============================================================================
   R-4 — die Invariante des Racks
   ============================================================================ */

console.log('\nR-4 — rack.total === machineCredit.amount nach jedem Platzieren und jeder Auswertung');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable(20260905, 'roulette_pruef_r4');

	let abweichungen = 0;
	for (let i = 0; i < 200; i++) {
		await ensureChipAndBet(table, i);
		if (table.bank.rack.total !== table.bank.amount) {
			abweichungen++;
		}
		await playRound(table);
		if (table.bank.rack.total !== table.bank.amount) {
			abweichungen++;
		}
	}
	check(abweichungen === 0, 'rack.total === machineCredit.amount hielt nach jedem Platzieren und jeder Auswertung',
		`Abweichungen: ${abweichungen}`);
	await table.bank.close();
}

/* ============================================================================
   R-5 — bank.staked === bets.total
   ============================================================================ */

console.log('\nR-5 — bank.staked === bets.total nach Legen, Zurücknehmen und Auswertung');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable(20260905, 'roulette_pruef_r5');

	let abweichungen = 0;
	for (let i = 0; i < 100; i++) {
		await ensureChipAndBet(table, i);
		if (table.bank.staked !== table.bets.total) {
			abweichungen++;
		}
		const zurueck = table.bets.takeBack(FIELDS[i % FIELDS.length].id);
		if (zurueck.ok) {
			await table.bank.returnChip(zurueck.value);
		}
		if (table.bank.staked !== table.bets.total) {
			abweichungen++;
		}
		// Der zurückgenommene Chip liegt jetzt wieder im Rack — kein neuer
		// Buy-in nötig, nur die Buchung wiederholen.
		await placeBets(table, betPlanFor(i));
		await playRound(table);
		if (table.bank.staked !== table.bets.total) {
			abweichungen++;
		}
	}
	check(abweichungen === 0, 'bank.staked === bets.total hielt nach jedem Legen, Zurücknehmen und jeder Auswertung',
		`Abweichungen: ${abweichungen}`);
	await table.bank.close();
}

/* ============================================================================
   R-6 — jede Wettart zahlt richtig, über ALLE 38 Ergebnisse
   ============================================================================ */

console.log('\nR-6 — jedes der 159 Felder zahlt richtig, über alle 38 möglichen Ergebnisse');
{
	// Behebung Review C3, H2. Vorher lief diese Prüfung nur über ein
	// Vertreterfeld je Wettart (10 von 159 Feldern, 380 Aussagen) und war
	// zusätzlich gegenüber der Feldliste zirkulär: "erwartet" wurde aus
	// feld.payout gezogen — demselben Wert, den auch BetTable.settle() aus
	// demselben Feldobjekt liest. Ein falscher Eintrag in
	// PAYOUT_BY_COVERED (bets-roulette.js) hätte diese Prüfung nie rot
	// gemacht: beide Seiten hätten denselben falschen Wert benutzt.
	//
	// Jetzt: (1) ALLE 159 Felder statt einem Vertreter je Wettart, macht
	// 159 × 38 = 6042 Einzelaussagen. (2) Die Auszahlung kommt aus einer
	// eigenen, unabhängig getippten Tabelle (wörtlich aus Anhang F, nach
	// Anzahl der abgedeckten Zahlen — dieselbe Technik wie B-4 in
	// verify-bets.mjs), NICHT aus feld.payout. Ein verfälschter Eintrag in
	// PAYOUT_BY_COVERED macht diese Prüfung jetzt tatsächlich rot (siehe
	// Gegenprobe R-6-G unten, die genau diesen Fall nachstellt).
	//
	// Was R-6 WEITERHIN NICHT beweist: dass covers geometrisch richtig
	// liegt (welche Zahlen ein Feld abdeckt) — trifft benutzt
	// feld.covers.includes(label), denselben Ausdruck wie
	// BetField.outcome() in table-bets.js. R-6 kann also nur zeigen, dass
	// settle() aus EINEM gegebenen covers/payout-Paar die richtige Summe
	// bildet — nicht, dass covers selbst stimmt. DAS beweisen B-7 und B-9
	// in verify-bets.mjs (Geometrie) und F-1 (PHP-Spiegel).
	const ERWARTETE_AUSZAHLUNG_JE_ANZAHL = { 1: 35, 2: 17, 3: 11, 4: 8, 5: 6, 6: 5, 12: 2, 18: 1 };

	let gesamtAussagen = 0;
	let abweichungenR6 = 0;
	for (const feld of FIELDS) {
		const auszahlungLautAnhangF = ERWARTETE_AUSZAHLUNG_JE_ANZAHL[feld.covers.length];
		for (const label of WHEEL_ORDER) {
			const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
			bets.place(feld.id, 1);
			const report = bets.settle(label);
			const eintrag = report.fields.find((f) => f.fieldId === feld.id);
			const trifft = feld.covers.includes(label);
			const erwartet = trifft ? 1 + Math.floor(1 * auszahlungLautAnhangF) : 0;
			gesamtAussagen++;
			if (eintrag.returned !== erwartet) {
				abweichungenR6++;
				console.log(`      Feld "${feld.id}" (${feld.kind}), Ergebnis "${label}": returned=${eintrag.returned}, erwartet ${erwartet}`);
			}
		}
	}
	check(abweichungenR6 === 0, `${gesamtAussagen} Einzelaussagen über alle 159 Felder × 38 Ergebnisse geprüft, alle richtig`,
		`Abweichungen: ${abweichungenR6}`);
}

console.log('\n     Gegenprobe R-6-G: eine verfälschte Quelle (PAYOUT_BY_COVERED, 34 statt 35) fällt jetzt tatsächlich auf');
{
	// Reproduziert R-6s eigene Rechnung (unabhängige Tabelle gegen
	// eintrag.returned), NICHT nur eine Rechnung gegen den Originalwert —
	// sonst zeigte die Gegenprobe nur, dass settle() irgendeinen falschen
	// Wert liefert, nicht, dass R-6 selbst ihn findet. Das war der Fehler
	// der alten Gegenprobe: sie verglich gegen original.payout statt gegen
	// die unabhängige Anhang-F-Tabelle, die R-6 jetzt tatsächlich benutzt —
	// vorher hätte eine verfälschte PAYOUT_BY_COVERED, die R-6s "erwartet"
	// aus demselben feld.payout zieht, R-6 nie rot gemacht.
	const ERWARTETE_AUSZAHLUNG_JE_ANZAHL = { 1: 35, 2: 17, 3: 11, 4: 8, 5: 6, 6: 5, 12: 2, 18: 1 };
	const original = FIELDS.find((f) => f.id === 'n-17');
	const verfaelscht = { ...original, payout: 34 };
	const betsG = new BetTable({ fields: [verfaelscht], roundMax: ROUND_MAX });
	betsG.place(verfaelscht.id, 1);
	const report = betsG.settle('17');
	const eintrag = report.fields[0];
	const trifft = verfaelscht.covers.includes('17');
	const erwartetNachR6 = trifft ? 1 + Math.floor(1 * ERWARTETE_AUSZAHLUNG_JE_ANZAHL[verfaelscht.covers.length]) : 0;
	check(eintrag.returned !== erwartetNachR6,
		'mit einer verfälschten Quelle (payout: 34 statt 35) weicht settle() von R-6s unabhängiger Erwartung ab — R-6 hätte das rot gemacht',
		`verfälscht ausgezahlt: ${eintrag.returned}, R-6 hätte erwartet: ${erwartetNachR6}`);
}

/* ============================================================================
   R-7 — kein Feld lässt sich über sein Limit belegen
   ============================================================================ */

console.log('\nR-7 — keines der 159 Felder lässt sich über sein Limit belegen');
{
	let abweichungen = 0;
	for (const feld of FIELDS) {
		const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
		for (let i = 0; i < feld.max; i++) {
			bets.place(feld.id, 1);
		}
		const vorher = bets.total;
		const versuch = bets.place(feld.id, 1);
		if (versuch.ok !== false || versuch.reason !== 'fieldmax' || bets.total !== vorher) {
			abweichungen++;
			check(false, `Feld "${feld.id}": Überschreiten des Limits (${feld.max}) wurde nicht mit 'fieldmax' abgelehnt`,
				JSON.stringify(versuch));
		}
	}
	check(abweichungen === 0, 'alle 159 Felder lehnen einen Chip über ihrem Limit mit "fieldmax" ab, ohne etwas zu verändern');
}

console.log('\n     Gegenprobe R-7-G: ein künstlich auf 999 gesetztes Limit lehnt an der echten Grenze nicht mehr ab');
{
	const original = FIELDS.find((f) => f.id === 'n-17');
	const verfaelscht = { ...original, max: 999 };
	const bets = new BetTable({ fields: [verfaelscht], roundMax: 999 });
	for (let i = 0; i < original.max; i++) {
		bets.place(verfaelscht.id, 1);
	}
	const versuch = bets.place(verfaelscht.id, 1);
	check(versuch.ok === true,
		'mit max: 999 statt 10 nimmt das Feld an der ORIGINALEN Grenze weiterhin Chips an — R-7 hätte das (fälschlich fehlende) "fieldmax" rot gemacht');
}

/* ============================================================================
   R-8 — der Rundenhöchstbetrag greift, "verdoppeln" ist alles oder nichts
   ============================================================================ */

console.log('\nR-8 — der Rundenhöchstbetrag (100 €) und die Alles-oder-nichts-Regel bei "verdoppeln"');
{
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const voll = bets.place('dz-1', 100); // ein Dutzend, max = 100, deckt die Runde exakt
	check(voll.ok === true && bets.total === 100, 'ein Einsatzbild von genau 100 € lässt sich legen');
	const weiterer = bets.place('dz-2', 1);
	check(weiterer.ok === false && weiterer.reason === 'roundmax' && bets.total === 100,
		'ein Einsatzbild von genau 100 € nimmt keinen weiteren Chip an');

	// Auf ZWEI Dutzend-Felder verteilt (je Höchsteinsatz 100 €), damit das
	// Verdoppeln an keinem einzelnen Feldlimit scheitert (26×2=52 und
	// 25×2=50 liegen beide unter 100) und ausschließlich der Rundenhöchst-
	// betrag (51×2=102 > 100) die Absage auslöst — die Aussage soll
	// "roundmax" treffen, nicht zufällig "fieldmax".
	const betsVerdoppeln = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	betsVerdoppeln.place('dz-1', 26);
	betsVerdoppeln.place('dz-2', 25);
	check(betsVerdoppeln.total === 51, 'Testaufbau: 51 € verteilt auf zwei Dutzend-Felder');
	const doppelt = betsVerdoppeln.double();
	check(doppelt.ok === false && doppelt.reason === 'roundmax' && betsVerdoppeln.total === 51,
		'bei mehr als 50 € Gesamteinsatz wird "verdoppeln" vollständig abgelehnt (alles oder nichts)');
}

/* ============================================================================
   R-9 — während der Runde nimmt das Tuch nichts an
   ============================================================================ */

console.log('\nR-9 — place/takeBack/clear/double/repeat sind während der Runde gesperrt');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable(20260905, 'roulette_pruef_r9');
	await table.bank.buyIn(999999);
	await placeBets(table, [{ fieldId: 'n-1', value: 1 }]);
	check(table.bets.total === 1, 'Testaufbau: 1 Euro liegt auf "n-1"');

	const start = table.game.start();
	check(start.ok === true, 'die Runde startet');

	check(table.bets.place('n-2', 1).reason === 'locked', 'place() ist während der Runde gesperrt');
	check(table.bets.takeBack('n-1').reason === 'locked', 'takeBack() ist während der Runde gesperrt');
	const clearErgebnis = table.bets.clear();
	check(!Array.isArray(clearErgebnis) && clearErgebnis.reason === 'locked', 'clear() ist während der Runde gesperrt');
	check(table.bets.double().reason === 'locked', 'double() ist während der Runde gesperrt');
	check(table.bets.repeat().reason === 'locked', 'repeat() ist während der Runde gesperrt');

	const index = table.physics.runToRest();
	await table.game.settleAt(labelOf(index));

	const wiederFrei = table.bets.place('n-3', 1);
	check(wiederFrei.ok === true, 'nach der Auswertung nimmt das Tuch wieder Einsätze an');
	await table.bank.close();
}

console.log('\n     Gegenprobe R-9-G: ohne bets.lock() bliebe das Tuch fälschlich offen');
{
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	bets.place('n-1', 1);
	// Absichtlich KEIN bets.lock() — simuliert eine Runde, die diesen Schritt vergisst.
	const versuch = bets.place('n-2', 1);
	check(versuch.ok === true,
		'ohne bets.lock() nimmt das Tuch während der (gedachten) laufenden Runde weiterhin Chips an — R-9 verlangt "locked" und hätte das rot gemacht');
}

/* ============================================================================
   R-10 — CASH OUT ist gesperrt, solange Chips liegen, auch bei leerem Rack
   ============================================================================ */

console.log('\nR-10 — CASH OUT ist gesperrt, solange etwas gesetzt ist, auch bei leerem Rack');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable(20260905, 'roulette_pruef_r10');
	await table.bank.buyIn(1); // wechselt in genau einen 1-Euro-Chip
	check(table.bank.rack.total === 1, 'Testaufbau: genau ein Chip im Rack');
	await table.bank.placeChip(1);
	check(table.bank.rack.total === 0 && table.bank.hasStake === true,
		'das Rack ist jetzt leer, aber es liegt etwas auf dem (gedachten) Tuch');
	const versuch = await table.bank.cashOut();
	check(versuch.ok === false && versuch.reason === 'staked',
		'CASH OUT bleibt gesperrt, obwohl das Rack leer ist — die Sperre hängt am Einsatz, nicht am Rack');
	await table.bank.close();
}

/* ============================================================================
   R-11 — beim Verlassen der Seite mitten in einer laufenden Runde bleibt
   nichts liegen
   ============================================================================ */

console.log('\nR-11 — bank.close() mitten in einer laufenden Runde');
{
	await credit.reload();
	await credit.set(500);
	const creditVorBuyin = credit.balance;
	const table = await buildTable(20260905, 'roulette_pruef_r11');
	await table.bank.buyIn(80);
	// 'dz-1' (ein Dutzend, Höchsteinsatz 100) verträgt jeden Chipwert, den
	// breakDown(80) liefert (25er und 5er) — anders als ein Zahlenfeld
	// (Höchsteinsatz 10), das einen 25er sofort mit 'fieldmax' abgelehnt hätte.
	const chipwert = table.bank.rack.toArray()[0]?.value ?? 1;
	await placeBets(table, [{ fieldId: 'dz-1', value: chipwert }]);
	check(table.bets.total > 0, `Testaufbau: ${chipwert} Euro liegen auf dem Tuch`);
	const start = table.game.start();
	check(start.ok === true, 'Testaufbau: die Runde läuft');
	await table.bank.close();
	check(table.bank.amount === 0, 'der Gerätekredit ist danach 0');
	check(fakeStore.getItem('casinoKunterbunt.machine.roulette_pruef_r11') === null,
		'im Speicher liegt danach kein Spiegel dieses Tisches mehr');

	// Behebung Review C3, M8, Aussage (1): der liegende Einsatz verfällt
	// (C.4), alles andere kommt in den Gerätekredit zurück — R-11 prüfte das
	// bisher NICHT, nur bank.amount === 0 und den fehlenden Speicher-Spiegel.
	await credit.reload();
	check(credit.balance === creditVorBuyin - chipwert,
		`credit.balance nach close() entspricht Startkasse minus dem verfallenen Einsatz (${chipwert} €)`,
		`erwartet: ${creditVorBuyin - chipwert}, tatsächlich: ${credit.balance}`);
}

console.log('\n     Behebung Review C3, M8, Aussage (2): ein settleAt() NACH close() bucht nichts gut und lässt kein offenes Tuch zurück');
{
	// Reproduziert GENAU den bfcache-Fall aus M8: die Seite wird verlassen
	// (bank.close() läuft), die Kugel liegt aber noch — die Zeichenschleife
	// aus dem Vor-/Zurück-Speicher ruft settleAt() danach trotzdem noch auf.
	await credit.reload();
	await credit.set(500);
	const creditVorBuyin = credit.balance;
	const table = await buildTable(20260905, 'roulette_pruef_r11b');
	await table.bank.buyIn(80);
	const chipwert = table.bank.rack.toArray()[0]?.value ?? 1;
	await placeBets(table, [{ fieldId: 'dz-1', value: chipwert }]);
	const start = table.game.start();
	check(start.ok === true, 'Testaufbau: die Runde läuft (M8)');
	await table.bank.close();

	// 'dz-1' (Höchsteinsatz 100) verträgt jeden Chipwert aus breakDown(80),
	// gewinnt bei rund einem Drittel der Ergebnisse — hier zählt nur, WAS
	// settleAt() nach einer geschlossenen Bank mit dem Ergebnis tut, nicht ob
	// es gewinnt. wheel-physics selbst ist unangetastet; die Kugel läuft
	// unverändert bis zur Ruhe.
	const index = table.physics.runToRest();
	const ergebnis = await table.game.settleAt(labelOf(index));

	check(ergebnis.ok === false && ergebnis.reason === 'closed',
		'settleAt() nach close() meldet {ok: false, reason: "closed"}, statt eine gewöhnliche Runde zu Ende zu bringen');
	await credit.reload();
	check(credit.balance === creditVorBuyin - chipwert,
		'settleAt() nach close() bucht dem Gerätekredit NICHTS gut, auch nicht bei einem gewinnenden Ergebnis',
		`erwartet: ${creditVorBuyin - chipwert}, tatsächlich: ${credit.balance}`);
	check(table.round.state === 'setzen', 'der Rundenautomat steht wieder auf "setzen" (abort(), kein Sackgassen-Zustand)');
	check(table.bets.open === false, 'das Tuch bleibt GESPERRT — kein offener Tisch, dessen Bank längst zu ist');
	check(table.bets.stakeOn('dz-1') === chipwert, 'der liegende Einsatz bleibt als Aufzeichnung sichtbar liegen (kein sweep())');
}

/* ============================================================================
   R-12 — der Rundenablauf wird vollständig durchlaufen
   ============================================================================ */

console.log('\nR-12 — 500 Runden, die Zustandsfolge ausnahmslos vollständig');
{
	await credit.reload();
	await credit.set(1000000);
	const table = await buildTable(20260905, 'roulette_pruef_r12');

	let zweiterDruckAbweichung = 0;
	for (let i = 0; i < 500; i++) {
		await ensureChipAndBet(table, i);
		const start = table.game.start();
		const zweiterDruck = table.game.start();
		if (!(zweiterDruck.ok === false && zweiterDruck.reason === 'state')) {
			zweiterDruckAbweichung++;
		}
		if (!start.ok) {
			continue;
		}
		const index = table.physics.runToRest();
		await table.game.settleAt(labelOf(index));
	}
	check(zweiterDruckAbweichung === 0, 'ein zweiter Druck auf den Auslöser während einer laufenden Runde ändert nichts und wirft nicht');

	const MUSTER = ['gesperrt', 'laeuft', 'auswerten', 'auszahlen', 'setzen'];
	check(table.stateLog.length === 500 * MUSTER.length,
		`die Zustandsfolge hat die erwartete Länge (${500 * MUSTER.length})`,
		`tatsächlich: ${table.stateLog.length}`);
	let musterAbweichung = 0;
	for (let i = 0; i < 500; i++) {
		const ausschnitt = table.stateLog.slice(i * MUSTER.length, (i + 1) * MUSTER.length);
		if (JSON.stringify(ausschnitt) !== JSON.stringify(MUSTER)) {
			musterAbweichung++;
		}
	}
	check(musterAbweichung === 0, 'jede der 500 Runden folgt ausnahmslos setzen → gesperrt → laeuft → auswerten → auszahlen → setzen');
	await table.bank.close();
}

console.log('\n     Gegenprobe R-12-G: TableRound verweigert eine übersprungene Auswertung');
{
	const round = new TableRound();
	round.lock();
	round.run();
	// Der Versuch, aus 'laeuft' DIREKT nach 'setzen' zu springen (also
	// 'auswerten' und 'auszahlen' zu überspringen), ist kein erlaubter
	// Übergang. TableRound lehnt ihn ab — genau das würde eine Aufzeichnung,
	// die trotzdem eine übersprungene Auswertung zeigte, als Fehler in der
	// Aufzeichnung selbst entlarven, nicht als tatsächlichen Spielverlauf.
	const uebersprungen = round.finish();
	check(uebersprungen.ok === false && round.state === 'laeuft',
		'TableRound verweigert den Sprung "laeuft" → "setzen" ohne auswerten/auszahlen',
		JSON.stringify(uebersprungen));
}

/* ============================================================================
   R-13 — eine Runde ohne Einsatz wird abgelehnt
   ============================================================================ */

console.log('\nR-13 — eine Runde ohne Einsatz wird abgelehnt, das Rad bleibt stehen');
{
	await credit.reload();
	await credit.set(1000);
	const table = await buildTable(20260905, 'roulette_pruef_r13');
	await table.bank.buyIn(50);

	const phaseVorher = table.physics.phase;
	const wheelTurnVorher = table.physics.wheelTurn;
	const versuch = table.game.start();
	check(versuch.ok === false && versuch.reason === 'nostake', 'eine Runde ohne Einsatz wird mit "nostake" abgelehnt');
	check(table.physics.phase === phaseVorher && table.physics.wheelTurn === wheelTurnVorher,
		'die Physik ist unangetastet — wheel.launch() wurde nicht aufgerufen');
	check(table.stateLog.length === 0, 'kein Zustandswechsel fand statt');
	await table.bank.close();
}

/* ============================================================================
   R-15 — ein Rad ohne echten Anschluss hinterlässt den Tisch in "setzen"
   ============================================================================ */

console.log('\nR-15 — ein Rad, dessen launch() false liefert, hinterlässt den Tisch in "setzen" mit offenem Tuch');
{
	// Behebung Review C3, M6. Stellt genau den Fall nach, den connectWheel()
	// liefert, wenn [data-ro-head]/[data-ro-ball] im Markup fehlen: ein
	// Platzhalter, dessen launch() unmittelbar false zurückgibt. Vorher blieb
	// die Runde für immer in "laeuft" stehen — Chips gesperrt, CASH OUT
	// blockiert, kein Ausgang. abort() ist jetzt der vorgesehene Rückweg.
	await credit.reload();
	await credit.set(1000);
	const key = 'roulette_pruef_r15';
	geoeffneteSchluessel.push(key);
	const bank = openTableBank(key);
	await bank.ready;
	await bank.buyIn(50);
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	bets.place('n-17', 5);
	await bank.placeChip(5);
	const round = new TableRound();
	const stateLog = [];
	const game = new RouletteRound({
		round, bets, bank,
		wheel: { launch: () => false },
		colourOf,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		onState: ({ state }) => stateLog.push(state),
		onResult: () => {},
	});

	const ergebnis = game.start();
	check(ergebnis.ok === false && ergebnis.reason === 'wheel', 'start() meldet {ok: false, reason: "wheel"}, statt unbemerkt weiterzulaufen');
	check(round.state === 'setzen', 'die Runde steht danach wieder in "setzen", nicht für immer in "laeuft"');
	check(bets.open === true, 'das Tuch nimmt wieder Einsätze an — bets.unlock() lief');
	check(bets.stakeOn('n-17') === 5, 'der liegende Einsatz bleibt erhalten — kein eingesperrtes Geld');
	check(stateLog.at(-1) === 'setzen', 'onState wurde für den Rücksprung nach "setzen" tatsächlich aufgerufen (abort() meldet sich)');

	await bank.close();
}

console.log('\n     Gegenprobe R-15-G: ohne abort() bliebe die Runde tatsächlich für immer in "laeuft" stehen');
{
	// Baut den Fehlerzustand von VOR der Behebung mit TableRounds eigenen,
	// öffentlichen Übergängen nach (lock() + run(), ohne den anschließenden
	// abort()) — keine Kopie von round-roulette.js, nur der Nachweis, dass
	// "laeuft" tatsächlich ein Zustand ist, aus dem TableRound nicht von
	// selbst wieder herausfindet.
	const round = new TableRound();
	round.lock();
	round.run();
	check(round.state === 'laeuft', 'R-15-G: ohne abort() bliebe die Runde tatsächlich für immer in "laeuft" stehen');
}

/* ============================================================================
   R-14 — es entsteht kein neuer Speicherschlüssel
   ============================================================================ */

console.log('\nR-14 — im Ruhezustand liegt genau die Schlüsselliste aus B.5.3');
{
	/** Dieselbe erlaubte Liste wie in verify-table-money.mjs (casino_startpage). */
	const ERLAUBTE_SCHLUESSEL = new Set(['casinoKunterbunt.credits', 'casinoKunterbunt.sound']);
	const vorhandeneSchluessel = [...cells.keys()];
	const unerwartet = vorhandeneSchluessel.filter((key) => {
		if (ERLAUBTE_SCHLUESSEL.has(key)) {
			return false;
		}
		return !key.startsWith('casinoKunterbunt.machine.');
	});
	check(unerwartet.length === 0, 'keine unbekannten Schlüssel im Speicher',
		`gefunden: ${unerwartet.join(', ') || '—'}`);
	const restMachineKeys = vorhandeneSchluessel.filter((key) => key.startsWith('casinoKunterbunt.machine.'));
	check(restMachineKeys.length === 0,
		'kein Geräte-Spiegel bleibt nach dem Schließen aller in diesem Lauf geöffneten Bänke stehen',
		`gefunden: ${restMachineKeys.join(', ') || '—'}`);
	check(geoeffneteSchluessel.length > 0, `Testaufbau: ${geoeffneteSchluessel.length} Bank-Schlüssel wurden in diesem Lauf geöffnet und wieder geschlossen`);
}

/* ------------------------------------------------------------------------- */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die Bilanz stimmt nach jeder Runde, Höchsteinsatz und '
	+ '\nRundenhöchstbetrag werden durchgesetzt, eine Runde ohne Einsatz wird abgelehnt, und der '
	+ '\nRundenablauf läuft in allen 500 geprüften Runden vollständig und wiederholbar durch.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
