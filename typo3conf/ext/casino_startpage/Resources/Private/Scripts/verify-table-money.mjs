/**
 * Casino Kunterbunt – Nachweis des Geldes am Spieltisch (Buy-in)
 * ================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-table-money.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung. Laufzeit
 * wenige Sekunden.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md C.4, Teilstück C1-D)
 * --------------------------------------------------------
 *  1. Die tragende Invariante von table-buyin.js gilt nach JEDEM einzelnen
 *     Schritt: rack.total === machineCredit.amount.
 *  2. Der Buy-in wechselt in möglichst große Chips (C.4.1, gierig).
 *  3. CASH OUT ist gesperrt, solange Chips auf dem Tuch liegen — und zwar VOR
 *     jeder anderen Prüfung.
 *  4. Beim Verlassen der Seite verfallen offene Einsätze; im Speicher bleibt
 *     kein Gerätekredit-Spiegel zurück.
 *  5. Die Absturzsicherung aus B.5.2 bucht einen vorgefundenen Rest in die
 *     KASSE, nicht in das Rack.
 *  6. Es entsteht KEIN neuer Speicherschlüssel — im Ruhezustand liegt genau
 *     die aus B.5.3 bekannte Liste im Speicher.
 *  7. Wechseln (exchangeDown/exchangeUp) berührt die Kasse nie.
 *  8. Schlägt die Buchung fehl, kommt der Chip unverändert ins Rack zurück.
 *  9. machine-credit.js und credit.js sind seit Phase C1 buchstabengleich
 *     geblieben (Zusage an die Automaten, insbesondere den eingefrorenen
 *     Münzschieber).
 * 10. withdraw() bewegt einen Teilbetrag, ohne dass die Summe aus Kasse und
 *     Gerätekredit sich ändert.
 * 11. buyChip()/sellChip() bewegen GENAU EINEN Chip und GENAU seinen Wert.
 * 12. Über 3000 zufällige Schritte hinweg hält die Invariante, und beim
 *     Verlassen kommt die Kasse auf ihren Ausgangswert zurück.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * -------------------------------------
 * Wie verify-machine-credit.mjs: eine eigens geschriebene Nachbildung könnte
 * richtig rechnen, während der Tisch falsch bucht. Gerechnet wird deshalb mit
 * credit.js, machine-credit.js, table-chips.js und table-buyin.js selbst.
 *
 * table-buyin.js importiert ZWEI Module über die Import-Map von TYPO3, die
 * Node nicht kennt: machine-credit.js und table-chips.js. Beide werden daher
 * als Text gelesen und ihr Modulname durch eine vollständige Dateiadresse
 * ersetzt, bevor das Ergebnis als data:-Modul geladen wird — table-chips.js
 * unmittelbar über seine echte Dateiadresse (es importiert selbst nichts),
 * machine-credit.js über SEINE eigene, schon gepatchte data:-Adresse (es
 * importiert seinerseits credit.js über die Import-Map). Es ist in beiden
 * Fällen Zeile für Zeile derselbe Code; nur die Modulnamen sind andere.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const CREDIT_URL = new URL('credit.js', JS_DIR);
const MACHINE_URL = new URL('machine-credit.js', JS_DIR);
const CHIPS_URL = new URL('table-chips.js', JS_DIR);
const BUYIN_URL = new URL('table-buyin.js', JS_DIR);

const CREDIT_KEY = 'casinoKunterbunt.credits';

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} label
 * @returns {void}
 */
function check(condition, label) {
	if (!condition) {
		failed = true;
	}
	console.log(`${condition ? '  ok  ' : '  FEHLER  '}${label}`);
}

/* --------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher, samt Ereignissen — wortgleich zu
   verify-machine-credit.mjs.
   -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
   Die echten Module laden.
   -------------------------------------------------------------------------- */

const machineSource = await readFile(fileURLToPath(MACHINE_URL), 'utf8');
const patchedMachine = machineSource.replaceAll(
	"'@phomo17/casino-startpage/credit.js'",
	JSON.stringify(CREDIT_URL.href)
);
check(patchedMachine !== machineSource, 'der Modulname in machine-credit.js wurde für Node aufgelöst');
const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

const buyinSource = await readFile(fileURLToPath(BUYIN_URL), 'utf8');
const patchedBuyin = buyinSource
	.replaceAll("'@phomo17/casino-startpage/machine-credit.js'", JSON.stringify(machineDataUrl))
	.replaceAll("'@phomo17/casino-startpage/table-chips.js'", JSON.stringify(CHIPS_URL.href));
check(patchedBuyin !== buyinSource && !patchedBuyin.includes('@phomo17/casino-startpage/'),
	'beide Modulnamen in table-buyin.js wurden für Node aufgelöst');

const { credit } = await import(CREDIT_URL.href);
const { CHIP_VALUES } = await import(CHIPS_URL.href);
const { openTableBank } = await import(
	`data:text/javascript;base64,${Buffer.from(patchedBuyin, 'utf8').toString('base64')}`
);

/* --------------------------------------------------------------------------
   Ein kleiner, wiederholbarer Zufallsgenerator (kein Math.random) — dieselbe
   Bauart wie in verify-machine-credit.mjs, damit ein Fehlschlag nachstellbar
   ist.
   -------------------------------------------------------------------------- */

function sequence(seed) {
	let state = seed;
	return (limit) => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state % limit;
	};
}

/* ============================================================================
   M-1 — Buy-in wechselt richtig
   ============================================================================ */

console.log('M-1 — Buy-in wechselt in möglichst große Chips');

await credit.reload();
await credit.set(1000);

const bankEins = openTableBank('muster_pruef_eins');
await bankEins.ready;
check(bankEins.amount === 0, 'der Buy-in ist beim Betreten des Tisches 0 (C.4)');

const buyinResult = await bankEins.buyIn(137);
check(buyinResult.ok === true && buyinResult.moved === 137, 'buyIn(137) meldet Erfolg und 137 bewegt');
check(bankEins.rack.total === 137 && bankEins.amount === 137,
	`rack.total (${bankEins.rack.total}) === machineCredit.amount (${bankEins.amount}) === 137`);
const zusammensetzung = bankEins.rack.toArray();
check(
	zusammensetzung.length === 4
	&& zusammensetzung[0].value === 100 && zusammensetzung[0].count === 1
	&& zusammensetzung[1].value === 25 && zusammensetzung[1].count === 1
	&& zusammensetzung[2].value === 5 && zusammensetzung[2].count === 2
	&& zusammensetzung[3].value === 1 && zusammensetzung[3].count === 2,
	`Gierrechnung: 100 + 25 + 5 + 5 + 1 + 1 — tatsächlich: ${JSON.stringify(zusammensetzung)}`
);
await bankEins.close();

/* ============================================================================
   M-2 — die Bilanz stimmt nach JEDEM Schritt
   ============================================================================ */

console.log('\nM-2 — 500 Schritte, nach jedem Schritt geprüft');

await credit.reload();
await credit.set(100000);

const bankZwei = openTableBank('muster_pruef_zwei');
await bankZwei.ready;

/** Individuelle Chipwerte, die gerade auf dem (gedachten) Tuch liegen. */
let stakedChips = [];
/** Gesamtsumme im System: Kasse + Rack + Tuch. Ändert sich nur bei payout(). */
let expectedTotal = credit.balance + bankZwei.amount;

const draw = sequence(20260904);
let steps = 0;

for (let i = 0; i < 500; i++) {
	const action = draw(6);
	if (action === 0) {
		// Buy-in
		const amount = 1 + draw(300);
		if (credit.canAfford(amount)) {
			await bankZwei.buyIn(amount);
		}
	} else if (action === 1) {
		// Chip legen — nur, wenn das Rack einen hergibt.
		const vorhanden = bankZwei.rack.toArray();
		if (vorhanden.length > 0) {
			const wahl = vorhanden[draw(vorhanden.length)];
			const result = await bankZwei.placeChip(wahl.value);
			if (result.ok === true) {
				stakedChips.push(wahl.value);
			}
		}
	} else if (action === 2) {
		// Chip zurücknehmen — nur, wenn etwas liegt.
		if (stakedChips.length > 0) {
			const index = draw(stakedChips.length);
			const value = stakedChips[index];
			const result = await bankZwei.returnChip(value);
			if (result.ok === true) {
				stakedChips.splice(index, 1);
			}
		}
	} else if (action === 3) {
		// Auswertung: die ganze Tuchsumme wird abgeräumt und nach Zufall
		// verloren, zurückgegeben (push) oder verdoppelt (Gewinn).
		if (stakedChips.length > 0) {
			const sweptStake = stakedChips.reduce((sum, v) => sum + v, 0);
			const factor = [0, 1, 2][draw(3)];
			const returned = sweptStake * factor;
			await bankZwei.payout(returned, sweptStake);
			expectedTotal += returned - sweptStake;
			stakedChips = [];
		}
	} else if (action === 4) {
		bankZwei.exchangeDown([100, 25, 20, 5][draw(4)]);
	} else if (action === 5) {
		bankZwei.exchangeUp([100, 25, 20, 5][draw(4)]);
	}

	steps += 1;
	const summeJetzt = credit.balance + bankZwei.rack.total
		+ stakedChips.reduce((sum, v) => sum + v, 0);
	if (bankZwei.rack.total !== bankZwei.amount) {
		check(false, `Schritt ${i + 1}: rack.total (${bankZwei.rack.total}) !== machineCredit.amount (${bankZwei.amount})`);
		break;
	}
	if (summeJetzt !== expectedTotal) {
		check(false, `Schritt ${i + 1}: Systemsumme ${summeJetzt} !== erwartet ${expectedTotal}`);
		break;
	}
}
check(!failed, `${steps} Schritte gespielt, die Invariante rack.total === machineCredit.amount hielt nach jedem einzelnen`);

/* ============================================================================
   M-3 — die CASH-OUT-Sperre
   ============================================================================ */

console.log('\nM-3 — CASH OUT ist gesperrt, solange Chips liegen');

// Das Tuch für einen sauberen Test leeren, ohne die laufende Bilanzprüfung
// weiter zu belasten.
for (const value of [...stakedChips]) {
	await bankZwei.returnChip(value);
}
stakedChips = [];

await bankZwei.buyIn(20);
const gelegt = bankZwei.rack.toArray()[0];
if (gelegt) {
	const vorherGesperrt = credit.balance + bankZwei.amount;
	await bankZwei.placeChip(gelegt.value);
	const gesperrt = await bankZwei.cashOut();
	check(gesperrt.ok === false && gesperrt.reason === 'staked',
		'cashOut() sagt mit reason "staked" ab, solange ein Chip liegt, und bewegt nichts');
	check(credit.balance + bankZwei.amount === vorherGesperrt - gelegt.value,
		'die Ablehnung bewegt nichts — der Chip liegt lediglich auf dem (gedachten) Tuch');
	await bankZwei.returnChip(gelegt.value);
	const buyInVorCashout = bankZwei.amount;
	const kasseVorCashout = credit.balance;
	const frei = await bankZwei.cashOut();
	check(frei.ok === true && frei.moved === buyInVorCashout,
		`CASH OUT bewegt genau den Buy-in (${frei.moved} von ${buyInVorCashout})`);
	check(credit.balance === kasseVorCashout + buyInVorCashout && bankZwei.amount === 0,
		'nichts geht verloren — die Kasse wächst um genau den ausgezahlten Buy-in');
} else {
	check(false, 'M-3 konnte keinen Chip legen (Rack war leer) — Testaufbau prüfen');
}

/* ============================================================================
   M-4 — Verlassen der Seite
   ============================================================================ */

console.log('\nM-4 — offene Einsätze verfallen beim Verlassen, kein Spiegel bleibt');

await credit.reload();
await credit.set(500);
const bankDrei = openTableBank('muster_pruef_drei');
await bankDrei.ready;
await bankDrei.buyIn(80);
const rackVorSchliessen = bankDrei.rack.toArray();
let inSpiel = 0;
for (const { value } of rackVorSchliessen) {
	const result = await bankDrei.placeChip(value);
	if (result.ok === true) {
		inSpiel += value;
	}
}
check(inSpiel > 0, `Testaufbau: ${inSpiel} Euro liegen auf dem (gedachten) Tuch`);
const kasseVorSchliessen = credit.balance;
await bankDrei.close();
check(credit.balance === kasseVorSchliessen + (80 - inSpiel),
	`die Kasse hat genau Ausgangssumme minus Einsatz: ${credit.balance} === ${kasseVorSchliessen + (80 - inSpiel)}`);
check(fakeStore.getItem('casinoKunterbunt.machine.muster_pruef_drei') === null,
	'im Speicher liegt danach kein Spiegel dieses Tisches mehr');

/* ============================================================================
   M-5 — Absturzsicherung
   ============================================================================ */

console.log('\nM-5 — ein vorgefundener Spiegel wird in die Kasse gebucht');

const kasseVorAbsturz = credit.balance;
fakeStore.setItem('casinoKunterbunt.machine.muster_pruef_absturz', '25');
const bankVier = openTableBank('muster_pruef_absturz');
await bankVier.ready;
check(credit.balance === kasseVorAbsturz + 25, 'der Rest wandert in die KASSE, nicht in das Rack');
check(bankVier.amount === 0 && bankVier.rack.total === 0,
	'das Rack steht danach auf dem tatsächlichen Gerätekredit (hier 0)');
check(fakeStore.getItem('casinoKunterbunt.machine.muster_pruef_absturz') === null,
	'der Spiegel wurde gelöscht');
await bankVier.close();

/* ============================================================================
   M-6 — keine neuen Schlüssel
   ============================================================================ */

console.log('\nM-6 — im Ruhezustand liegt genau die Schlüsselliste aus B.5.3');

/**
 * Die projektweiten Schlüssel aus CONCEPT.md B.5.3, ohne den vierten, der
 * einem einzelnen Gerät gehört und den dieser Lauf nie berührt (G-9 verbietet
 * dem Site Package ohnehin, ein Gerät beim Namen zu nennen). Ein zusätzlicher
 * Schlüssel hier wäre ein Verstoß gegen die Zusage aus Teilstück C1-D, dass
 * Phase C1 keinen neuen Speicherschlüssel anlegt.
 */
const ERLAUBTE_SCHLUESSEL = new Set([
	'casinoKunterbunt.credits',
	'casinoKunterbunt.sound',
	// casinoKunterbunt.machine.<key> — nur solange ein Gerätekredit > 0 ist,
	// im Ruhezustand also gar nicht vorhanden.
]);
const vorhandeneSchluessel = [...cells.keys()];
const unerwartet = vorhandeneSchluessel.filter((key) => {
	if (ERLAUBTE_SCHLUESSEL.has(key)) {
		return false;
	}
	return !key.startsWith('casinoKunterbunt.machine.');
});
check(unerwartet.length === 0,
	`keine unbekannten Schlüssel im Speicher (gefunden: ${vorhandeneSchluessel.join(', ') || '—'})`);
const restMachineKeys = vorhandeneSchluessel.filter((key) => key.startsWith('casinoKunterbunt.machine.'));
check(restMachineKeys.length === 0,
	`kein Geräte-Spiegel bleibt nach dem Schließen aller Testbanken stehen (gefunden: ${restMachineKeys.join(', ') || '—'})`);

/* ============================================================================
   M-7 — Wechseln berührt die Kasse nicht
   ============================================================================ */

console.log('\nM-7 — 2000 Wechselvorgänge lassen Kasse und Gerätekredit unverändert');

await credit.reload();
await credit.set(1000);
const bankFuenf = openTableBank('muster_pruef_wechsel');
await bankFuenf.ready;
await bankFuenf.buyIn(300);
const kasseVorWechsel = credit.balance;
const betragVorWechsel = bankFuenf.amount;
const rackSummeVorWechsel = bankFuenf.rack.total;
const drawWechsel = sequence(20260904 + 1);
for (let i = 0; i < 2000; i++) {
	const value = [100, 25, 20, 5][drawWechsel(4)];
	if (drawWechsel(2) === 0) {
		bankFuenf.exchangeDown(value);
	} else {
		bankFuenf.exchangeUp(value);
	}
}
check(credit.balance === kasseVorWechsel, 'die Kasse ist nach 2000 Wechselvorgängen unverändert');
check(bankFuenf.amount === betragVorWechsel, 'der Buy-in-Betrag ist unverändert');
check(bankFuenf.rack.total === rackSummeVorWechsel, 'die Rack-Summe ist unverändert');
await bankFuenf.close();

/* ============================================================================
   M-8 — kein Chip entsteht, keiner verschwindet
   ============================================================================ */

console.log('\nM-8 — schlägt das Buchen fehl, kommt der Chip zurück ins Rack');

await credit.reload();
await credit.set(1000);
const bankSechs = openTableBank('muster_pruef_rollback');
await bankSechs.ready;
await bankSechs.buyIn(50);
// Den Gerätekredit künstlich absenken, ohne das Rack anzufassen — genau der
// Zustand, den ein intaktes Rack nie selbst herbeiführen kann, aber den
// placeChip() trotzdem sauber abfangen muss.
await bankSechs.machineCredit.stake(bankSechs.machineCredit.amount);
check(bankSechs.machineCredit.amount === 0 && bankSechs.rack.total === 50,
	'Testaufbau: Gerätekredit künstlich auf 0, Rack zeigt weiterhin 50');
const rackVorFehlschlag = bankSechs.rack.toArray();
const stakedVorFehlschlag = bankSechs.staked;
const versuch = await bankSechs.placeChip(rackVorFehlschlag[0].value);
check(versuch.ok === false && versuch.reason === 'insufficient',
	`placeChip() sagt ab, wenn machineCredit.stake() fehlschlägt (Grund: ${versuch.reason})`);
check(JSON.stringify(bankSechs.rack.toArray()) === JSON.stringify(rackVorFehlschlag),
	'der Chip ist wieder im Rack — dieselbe Zusammensetzung wie vor dem Versuch');
check(bankSechs.staked === stakedVorFehlschlag, 'staked ist unverändert');
await bankSechs.close();

/* ============================================================================
   M-10 — withdraw() bewegt einen Teilbetrag, ohne die Gesamtsumme zu ändern
   ============================================================================ */

console.log('\nM-10 — machineCredit.withdraw() bewegt genau den angeforderten Teilbetrag');

await credit.reload();
await credit.set(500);
const bankSieben = openTableBank('muster_pruef_withdraw');
await bankSieben.ready;
await bankSieben.machineCredit.insert(200);
check(bankSieben.machineCredit.amount === 200, 'Testaufbau: Gerätekredit über insert() auf 200 gebracht');

const summeVorTeilrueckgabe = credit.balance + bankSieben.machineCredit.amount;
const teilrueckgabe = await bankSieben.machineCredit.withdraw(60);
check(teilrueckgabe.ok === true && teilrueckgabe.moved === 60,
	`withdraw(60) meldet Erfolg und bewegt genau 60 (moved: ${teilrueckgabe.moved})`);
check(bankSieben.machineCredit.amount === 140,
	`der Gerätekredit sinkt um genau 60 auf 140 (${bankSieben.machineCredit.amount})`);
check(credit.balance + bankSieben.machineCredit.amount === summeVorTeilrueckgabe,
	'die Summe aus Kasse und Gerätekredit ist vor und nach withdraw() gleich');

const zuViel = await bankSieben.machineCredit.withdraw(bankSieben.machineCredit.amount + 1);
check(zuViel.ok === false && zuViel.reason === 'insufficient' && zuViel.moved === 0,
	'ein Betrag über dem Gerätekredit wird mit "insufficient" abgelehnt und bewegt nichts');
check(bankSieben.machineCredit.amount === 140,
	'der abgelehnte Versuch hat den Gerätekredit nicht verändert');

await bankSieben.close();
const nachSchliessen = await bankSieben.machineCredit.withdraw(1);
check(nachSchliessen.ok === false && nachSchliessen.reason === 'closed' && nachSchliessen.moved === 0,
	'nach close() liefert withdraw() "closed" und bewegt nichts');

/* ============================================================================
   M-11 — buyChip()/sellChip() bewegen GENAU EINEN Chip und GENAU seinen Wert
   ============================================================================ */

console.log('\nM-11 — buyChip()/sellChip() bewegen genau einen Chip und genau seinen Wert, für alle fünf Werte');

await credit.reload();
await credit.set(100000);
const bankAcht = openTableBank('muster_pruef_chipkasse');
await bankAcht.ready;

for (const value of CHIP_VALUES) {
	const kasseVorKauf = credit.balance;
	const buyInVorKauf = bankAcht.amount;
	const zahlVorKauf = bankAcht.rack.countOf(value);
	const kauf = await bankAcht.buyChip(value);
	check(kauf.ok === true && kauf.value === value && kauf.count === zahlVorKauf + 1,
		`buyChip(${value}) erhöht die Stückzahl um genau 1 (${kauf.count})`);
	check(bankAcht.amount === buyInVorKauf + value,
		`buyChip(${value}) erhöht den Buy-in um genau ${value} (${bankAcht.amount})`);
	check(credit.balance === kasseVorKauf - value,
		`buyChip(${value}) belastet die Kasse um genau ${value}`);

	const zahlVorVerkauf = bankAcht.rack.countOf(value);
	const buyInVorVerkauf = bankAcht.amount;
	const kasseVorVerkauf = credit.balance;
	const verkauf = await bankAcht.sellChip(value);
	check(verkauf.ok === true && verkauf.value === value && verkauf.count === zahlVorVerkauf - 1,
		`sellChip(${value}) senkt die Stückzahl um genau 1 (${verkauf.count})`);
	check(bankAcht.amount === buyInVorVerkauf - value,
		`sellChip(${value}) senkt den Buy-in um genau ${value} (${bankAcht.amount})`);
	check(credit.balance === kasseVorVerkauf + value,
		`sellChip(${value}) schreibt der Kasse genau ${value} gut`);
}

const leererVerkauf = await bankAcht.sellChip(CHIP_VALUES[0]);
check(leererVerkauf.ok === false && leererVerkauf.reason === 'nochip',
	'sellChip() auf eine leere Sorte meldet "nochip" und bewegt nichts');
check(bankAcht.rack.countOf(CHIP_VALUES[0]) === 0 && bankAcht.amount === 0,
	'der Fehlschlag hat weder Rack noch Buy-in verändert');

const kasseVorUnbekannt = credit.balance;
const unbekannterKauf = await bankAcht.buyChip(3);
check(unbekannterKauf.ok === false && unbekannterKauf.reason === 'unknown',
	'buyChip() mit einem unbekannten Wert (3) meldet "unknown" und bewegt nichts');
check(bankAcht.amount === 0 && credit.balance === kasseVorUnbekannt,
	'der abgelehnte Kauf hat weder Buy-in noch Kasse verändert');
await bankAcht.close();

/* ============================================================================
   M-12 — 3000 zufällige Schritte: die Ansage vom 2026-09-07, rechnerisch belegt
   ============================================================================ */

console.log('\nM-12 — 3000 zufällige Schritte aus buyChip/sellChip/placeChip/returnChip/payout');

await credit.reload();
const startKasseM12 = 5000;
await credit.set(startKasseM12);
const bankNeun = openTableBank('muster_pruef_dauerlauf');
await bankNeun.ready;

/** Individuelle Chipwerte, die gerade auf dem (gedachten) Tuch liegen. */
let stakedM12 = [];
const drawM12 = sequence(20260907);
let schritteM12 = 0;

for (let i = 0; i < 3000; i++) {
	const aktion = drawM12(5);
	if (aktion === 0) {
		// Chip kaufen
		const value = CHIP_VALUES[drawM12(CHIP_VALUES.length)];
		if (credit.canAfford(value)) {
			await bankNeun.buyChip(value);
		}
	} else if (aktion === 1) {
		// Chip verkaufen — nur, wenn das Rack einen hergibt.
		const vorhanden = bankNeun.rack.toArray();
		if (vorhanden.length > 0) {
			const wahl = vorhanden[drawM12(vorhanden.length)];
			await bankNeun.sellChip(wahl.value);
		}
	} else if (aktion === 2) {
		// Chip legen — nur, wenn das Rack einen hergibt.
		const vorhanden = bankNeun.rack.toArray();
		if (vorhanden.length > 0) {
			const wahl = vorhanden[drawM12(vorhanden.length)];
			const result = await bankNeun.placeChip(wahl.value);
			if (result.ok === true) {
				stakedM12.push(wahl.value);
			}
		}
	} else if (aktion === 3) {
		// Chip zurücknehmen — nur, wenn etwas liegt.
		if (stakedM12.length > 0) {
			const index = drawM12(stakedM12.length);
			const value = stakedM12[index];
			const result = await bankNeun.returnChip(value);
			if (result.ok === true) {
				stakedM12.splice(index, 1);
			}
		}
	} else {
		// Auswertung ohne Gewinn oder Verlust: was auf dem Tuch liegt, geht
		// unverändert zurück. M-12 prüft die Buchführung dieser Datei, nicht
		// eine Gewinnquote — die tragen verify-bets.mjs und verify-wagers.mjs.
		if (stakedM12.length > 0) {
			const summe = stakedM12.reduce((sum, v) => sum + v, 0);
			await bankNeun.payout(summe, summe);
			stakedM12 = [];
		}
	}

	schritteM12 += 1;
	if (bankNeun.rack.total !== bankNeun.amount) {
		check(false, `Schritt ${schritteM12}: rack.total (${bankNeun.rack.total}) !== machineCredit.amount (${bankNeun.amount})`);
		break;
	}
}
check(!failed, `${schritteM12} Schritte gespielt, die Invariante rack.total === machineCredit.amount hielt nach jedem einzelnen`);

const verfallenBeiSchluss = stakedM12.reduce((sum, v) => sum + v, 0);
const geraeteBetragVorSchluss = bankNeun.amount;
const kasseVorSchluss = credit.balance;
await bankNeun.close();
check(credit.balance === kasseVorSchluss + geraeteBetragVorSchluss,
	`beim Schließen wandert der gesamte verbliebene Gerätekredit (${geraeteBetragVorSchluss}) in die Kasse`);
check(credit.balance === startKasseM12 - verfallenBeiSchluss,
	`die Kasse steht nach dem Schließen exakt auf ihrem Ausgangswert (${startKasseM12}) abzüglich dessen, `
	+ `was auf dem Tuch verfallen ist (${verfallenBeiSchluss}): ${credit.balance}`);

/* ============================================================================
   M-9 — die Zusage an die Automaten
   ============================================================================ */

console.log('\nM-9 — machine-credit.js und credit.js sind unverändert');

/**
 * Prüfsumme beider Dateien, gesetzt am 2026-09-04 beim Bau von Teilstück
 * C1-D (`sha256sum machine-credit.js credit.js`). Fällt diese Prüfung, ist
 * entweder versehentlich ein geteilter Baustein angefasst worden — dann ist
 * der eingefrorene Münzschieber (DECISIONS.md 2026-09-04 14:23) erneut zu
 * prüfen — oder die Prüfsumme ist nach einer AUSDRÜCKLICH gewollten Änderung
 * bewusst zu erneuern. Beides soll auffallen, nicht durchrutschen.
 */
const ERWARTETE_PRUEFSUMMEN = {
	// Erneuert am Tag von Phase T: machine-credit.js hat mit withdraw() eine
	// zusätzliche Methode bekommen (Ansage „Chips einzeln zurückgeben",
	// 2026-09-07). Nichts Bestehendes wurde geändert; die Zusage an die
	// Automaten prüft seither M-9b Zeile für Zeile statt über die Prüfsumme.
	'machine-credit.js': 'f1c78305429470bf74cd2aeacda6aa09889c61892c3c9b8670aed55beced3be1',
	'credit.js': '226f66c0e73a52ac40f0e27cb3197204d37f7a2f73058df9368fb46cdb07b752',
};
for (const [datei, erwartet] of Object.entries(ERWARTETE_PRUEFSUMMEN)) {
	const inhalt = await readFile(fileURLToPath(new URL(datei, JS_DIR)), 'utf8');
	const tatsaechlich = createHash('sha256').update(inhalt, 'utf8').digest('hex');
	check(tatsaechlich === erwartet, `${datei} ist buchstabengleich zu seinem Stand vor Phase C1 (${tatsaechlich})`);
}

console.log('\nM-9b — die sechs Methoden, auf die sich die Automaten verlassen, sind unverändert');

/**
 * Die Rümpfe, die der eingefrorene Münzschieber und die drei Automaten
 * benutzen. Sie werden aus dem Quelltext ausgeschnitten (von „	async NAME("
 * bis zur schließenden Klammer auf derselben Einrückung) und gegen ihre
 * Prüfsumme gehalten. Kommt eine Methode hinzu — wie withdraw() —, ändert das
 * hier nichts; wird eine BESTEHENDE angefasst, fällt es auf.
 */
const ERWARTETE_METHODEN = {
	insert: '5394f911784256e42a15196056ed12aa1efc25244fdbd6fb0348c86227eee50c',
	cashOut: 'f777bccfc28c764defeb709082472525102ecc5aa4012b004bb74e108f8966b5',
	stake: '211a1a14f663aa1fed83a382771b62239ac3de72b648599d1c30e9eb86654308',
	award: '88bfd8760eebbbdb6dc455a544ca04a3ffb45e972130cc12b854fa794cb7f426',
	close: '32518bf7b71f5a7c31f669583b2bba51a48e9f65d11b217ee2edf9b702deac5b',
	claim: '367273773b0baa92b6d62c29c21d66fa30d42f94ba42a9607b9cc33db8da1cab',
};

/** Schneidet den Rumpf einer Methode aus dem Quelltext. @returns {?string} */
function methodenRumpf(quelle, name) {
	const anfang = quelle.indexOf(`\n\tasync ${name}(`);
	if (anfang === -1) {
		return null;
	}
	const ende = quelle.indexOf('\n\t}\n', anfang);
	return ende === -1 ? null : quelle.slice(anfang, ende + 4);
}

const machineJetzt = await readFile(fileURLToPath(MACHINE_URL), 'utf8');
for (const [name, erwartet] of Object.entries(ERWARTETE_METHODEN)) {
	const rumpf = methodenRumpf(machineJetzt, name);
	const gemessen = rumpf === null
		? 'FEHLT'
		: createHash('sha256').update(rumpf, 'utf8').digest('hex');
	check(gemessen === erwartet, `machine-credit.js: ${name}() ist unverändert (${gemessen})`);
}
check(methodenRumpf(machineJetzt, 'withdraw') !== null,
	'machine-credit.js: withdraw() existiert');

console.log(failed
	? '\nERGEBNIS: das Geld am Spieltisch stimmt NICHT.'
	: '\nERGEBNIS: das Rack ist zu jedem Zeitpunkt der Buy-in in Chips, der Buy-in wechselt gierig, '
	+ 'CASH OUT ist gesperrt, solange Chips liegen, offene Einsätze verfallen beim Verlassen ohne '
	+ 'Spiegel-Leiche, die Absturzsicherung bucht in die Kasse, kein neuer Speicherschlüssel entsteht, '
	+ 'Wechseln berührt die Kasse nie, ein Buchungsfehlschlag verliert keinen Chip, und die Automaten '
	+ 'sind unangetastet.');

process.exit(failed ? 1 : 0);
