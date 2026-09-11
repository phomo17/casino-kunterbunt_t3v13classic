/**
 * Casino Kunterbunt – Nachweis der Setzfläche und des Rundenablaufs (Phase C1, Teilstück C)
 * ============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-table-bets.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------
 *   B-0   table-bets.js und table-round.js sind ohne Browser ladbar
 *   B-1   Feldbeschreibung: ungültige Angaben werfen
 *   B-2   Feldlimit greift, ohne den Bestand bei einer Absage zu verändern
 *   B-3   Rundenlimit greift über mehrere Felder hinweg
 *   B-4   Stapeln: mehrere Werte auf einem Feld ergeben mehrere sortierte Stapel
 *   B-5   Zurücknehmen: takeBack() feldweise, undo() insgesamt, leeres Feld sagt ab
 *   B-6   Alles oder nichts bei double() und repeat()
 *   B-7   Auswertung: eine Tabelle von Hand gerechneter Fälle
 *   B-8   settle() räumt nicht ab; erst sweep() leert das Tuch
 *   B-9   Momentaufnahme: restore(snapshot()) ergibt denselben Zustand
 *   B-10  Rundenablauf: alle 25 Kombinationen aus fünf Zuständen und fünf Übergängen
 *   B-11  gesperrt heißt gesperrt — für alle sechs verändernden Methoden
 *
 * Phase C7, Umsetzungsstück C7c — rückwärtsverträgliche Erweiterung um
 * countsToRoundMax (Odds zählen nicht in den Rundenhöchstbetrag) und um einen
 * Sockel für Vertragswetten (freeze/unfreeze), CONCEPT.md Anhang H:
 *   TB-neu-1  countsToRoundMax: ohne Angabe true, mit false zählt das Feld
 *             nicht in countedTotal, wohl aber weiter in total und sein max
 *   TB-neu-2  Sockel: freeze()/unfreeze(), takeBack() unter dem Sockel
 *   TB-neu-3  undo()/clear()/double() mit Sockel
 *   TB-neu-4  snapshot()/restore() führen die Sockel mit
 *
 * WARUM UNMITTELBAR GELADEN UND NICHT NACHGEBILDET
 * -------------------------------------------------
 * Beide Dateien importieren nichts (siehe ihre eigenen Kopfkommentare). Der
 * Nachweis lädt deshalb GENAU DIESE Dateien über einen normalen import() –
 * keine Nachbildung, die richtig rechnen könnte, während das Spiel falsch
 * bucht (CONCEPT.md C.5.3).
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_startpage/ */
const EXT = path.resolve(HIER, '../../..');

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

function lies(rel) {
	return readFileSync(path.join(EXT, rel), 'utf8');
}

/** Entfernt JS-Blockkommentare (/* … *\/) und Zeilenkommentare (//). */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Kleiner deterministischer Zufallsgenerator (mulberry32) – reproduzierbar über Läufe hinweg. */
function zufallsgenerator(saat) {
	let zustand = saat >>> 0;
	return function () {
		zustand |= 0;
		zustand = (zustand + 0x6d2b79f5) | 0;
		let t = Math.imul(zustand ^ (zustand >>> 15), 1 | zustand);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function tiefGleich(a, b) {
	return JSON.stringify(a) === JSON.stringify(b);
}

console.log('\nCasino Kunterbunt – Nachweis der Setzfläche und des Rundenablaufs (Phase C1, Teilstück C)');
console.log('============================================================================================\n');

const BETS_PFAD = 'Resources/Public/JavaScript/table-bets.js';
const ROUND_PFAD = 'Resources/Public/JavaScript/table-round.js';
const BETS_QUELLTEXT = ohneKommentare(lies(BETS_PFAD));
const ROUND_QUELLTEXT = ohneKommentare(lies(ROUND_PFAD));

/* ==================================================== B-0 Ohne Vorbereitung */

console.log('B-0  table-bets.js und table-round.js sind ohne Browser ladbar');
{
	for (const [name, quelltext] of [['table-bets.js', BETS_QUELLTEXT], ['table-round.js', ROUND_QUELLTEXT]]) {
		check(!/\bimport\b/.test(quelltext), `${name}: kein import im Quelltext (Kommentare ausgenommen)`);
		check(!/\bdocument\b/.test(quelltext), `${name}: kein document im Quelltext`);
		check(!/\bwindow\b/.test(quelltext), `${name}: kein window im Quelltext`);
		check(!/\blocalStorage\b/.test(quelltext), `${name}: kein localStorage im Quelltext`);
		check(!/Math\.random/.test(quelltext), `${name}: kein Math.random im Quelltext`);
	}
}

let betsModul;
let roundModul;
try {
	betsModul = await import(new URL('../../Public/JavaScript/table-bets.js', import.meta.url));
	check(true, 'der import() von table-bets.js gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() von table-bets.js gelingt unmittelbar', String(fehlerObjekt));
}
try {
	roundModul = await import(new URL('../../Public/JavaScript/table-round.js', import.meta.url));
	check(true, 'der import() von table-round.js gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() von table-round.js gelingt unmittelbar', String(fehlerObjekt));
}
if (!betsModul || !roundModul) {
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, ein Modul lädt nicht).`);
	process.exit(1);
}

const { BetField, BetTable } = betsModul;
const { ROUND_STATES, TableRound } = roundModul;

function wirft(fn) {
	try {
		fn();
		return null;
	} catch (fehlerObjekt) {
		return fehlerObjekt;
	}
}

/* ============================================================ B-1 Feldbeschreibung */

console.log('\nB-1  Feldbeschreibung: ungültige Angaben werfen');
{
	check(wirft(() => new BetField({ id: 'x', label: 'X', payout: 1, max: 10 })) instanceof TypeError,
		'ein Feld ohne covers UND ohne matches wirft einen TypeError');

	check(wirft(() => new BetField({ id: 'x', label: 'X', covers: [1], payout: 0, max: 10 })) instanceof RangeError,
		'payout: 0 wirft einen RangeError');
	check(wirft(() => new BetField({ id: 'x', label: 'X', covers: [1], payout: -5, max: 10 })) instanceof RangeError,
		'payout: -5 wirft einen RangeError');

	check(wirft(() => new BetField({ id: 'x', label: 'X', covers: [1], payout: 1, max: 10.5 })) instanceof RangeError,
		'max als Kommazahl (10.5) wirft einen RangeError');
	check(wirft(() => new BetField({ id: 'x', label: 'X', covers: [1], payout: 1, max: 0 })) instanceof RangeError,
		'max: 0 wirft einen RangeError');

	check(wirft(() => new BetField({ id: '', label: 'X', covers: [1], payout: 1, max: 10 })) instanceof TypeError,
		'eine leere id wirft einen TypeError');

	const doppelteId = wirft(() => new BetTable({
		fields: [
			{ id: 'a', label: 'A', covers: [1], payout: 1, max: 10 },
			{ id: 'a', label: 'A2', covers: [2], payout: 1, max: 10 },
		],
		roundMax: 100,
	}));
	check(doppelteId instanceof Error, 'eine doppelte Feld-id in einer Feldliste wirft');

	// Gültige Angabe wirft NICHT — Gegenprobe, damit obige Prüfungen nicht aus Zufall bestehen.
	check(wirft(() => new BetField({ id: 'ok', label: 'OK', covers: [1, 2], payout: 1, max: 10 })) === null,
		'eine gültige Feldbeschreibung wirft nicht');
	check(wirft(() => new BetField({ id: 'ok2', label: 'OK2', matches: () => true, payout: 1, max: 10 })) === null,
		'eine gültige Feldbeschreibung mit matches statt covers wirft nicht');
}

/* ==================================================================== B-2 Feldlimit */

console.log('\nB-2  Feldlimit greift, ohne den Bestand bei einer Absage zu verändern');
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [1], payout: 1, max: 10 }],
		roundMax: 1000,
	});
	const erster = tisch.place('f', 5);
	const zweiter = tisch.place('f', 5);
	check(erster.ok === true && zweiter.ok === true, 'zwei Fünfer auf ein Feld mit max:10 gelingen beide');
	check(tisch.total === 10, `Gesamteinsatz nach zwei Fünfern ist 10 (gefunden: ${tisch.total})`);

	const dritter = tisch.place('f', 5);
	check(dritter.ok === false && dritter.reason === 'fieldmax',
		`ein dritter Fünfer wird mit reason:'fieldmax' abgelehnt (gefunden: ${JSON.stringify(dritter)})`);
	check(tisch.total === 10, `der Gesamteinsatz bleibt nach der Absage bei 10 (gefunden: ${tisch.total})`);
}

/* ================================================================== B-3 Rundenlimit */

console.log('\nB-3  Rundenlimit greift über mehrere Felder hinweg');
{
	const tisch = new BetTable({
		fields: [
			{ id: 'a', label: 'A', covers: [1], payout: 1, max: 1000 },
			{ id: 'b', label: 'B', covers: [1], payout: 1, max: 1000 },
			{ id: 'c', label: 'C', covers: [1], payout: 1, max: 1000 },
			{ id: 'd', label: 'D', covers: [1], payout: 1, max: 1000 },
		],
		roundMax: 100,
	});
	check(tisch.place('a', 25).ok === true, 'a: 25 gelingt');
	check(tisch.place('a', 25).ok === true, 'a: weitere 25 gelingt (Summe 50)');
	check(tisch.place('b', 20).ok === true, 'b: 20 gelingt (Summe 70)');
	check(tisch.place('c', 15).ok === true, 'c: 15 gelingt (Summe 85)');
	check(tisch.place('d', 10).ok === true, 'd: 10 gelingt (Summe 95)');
	check(tisch.total === 95, `Gesamteinsatz ist 95 (gefunden: ${tisch.total})`);

	const ablehnung = tisch.place('a', 10);
	check(ablehnung.ok === false && ablehnung.reason === 'roundmax',
		`ein weiterer Zehner wird mit reason:'roundmax' abgelehnt (gefunden: ${JSON.stringify(ablehnung)})`);
	check(tisch.total === 95, `der Gesamteinsatz bleibt nach der Absage bei 95 (gefunden: ${tisch.total})`);
}

/* ======================================================================== B-4 Stapeln */

console.log('\nB-4  Stapeln: mehrere Werte auf einem Feld ergeben mehrere sortierte Stapel');
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [1], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	for (const wert of [5, 5, 5, 1, 1]) {
		tisch.place('f', wert);
	}
	const stapel = tisch.stacksOn('f');
	check(tiefGleich(stapel, [{ value: 5, count: 3 }, { value: 1, count: 2 }]),
		`stacksOn('f') ist [{5,3},{1,2}] (gefunden: ${JSON.stringify(stapel)})`);
	check(tisch.stakeOn('f') === 17, `stakeOn('f') ist 17 (gefunden: ${tisch.stakeOn('f')})`);
}

/* ================================================================ B-5 Zurücknehmen */

console.log('\nB-5  Zurücknehmen: takeBack() feldweise, undo() insgesamt, leeres Feld sagt ab');
{
	const tisch = new BetTable({
		fields: [
			{ id: 'a', label: 'A', covers: [1], payout: 1, max: 1000 },
			{ id: 'b', label: 'B', covers: [1], payout: 1, max: 1000 },
			{ id: 'c', label: 'C', covers: [1], payout: 1, max: 1000 },
		],
		roundMax: 1000,
	});
	// Reihenfolge von Hand mitgeführt: a:5(#1), b:10(#2), a:1(#3), b:5(#4)
	tisch.place('a', 5);
	tisch.place('b', 10);
	tisch.place('a', 1);
	tisch.place('b', 5);

	const zurueckA = tisch.takeBack('a');
	check(zurueckA.ok === true && zurueckA.value === 1,
		`takeBack('a') liefert den zuletzt AUF DIESEM FELD gelegten Chip, Wert 1 (gefunden: ${JSON.stringify(zurueckA)})`);
	check(tisch.stakeOn('a') === 5, `auf 'a' liegt danach noch der Fünfer (gefunden: ${tisch.stakeOn('a')})`);

	const undoErgebnis = tisch.undo();
	check(undoErgebnis.ok === true && undoErgebnis.fieldId === 'b' && undoErgebnis.value === 5,
		`undo() liefert den zuletzt ÜBERHAUPT gelegten Chip, b:5 (gefunden: ${JSON.stringify(undoErgebnis)})`);
	check(tisch.stakeOn('b') === 10, `auf 'b' liegt danach noch der Zehner (gefunden: ${tisch.stakeOn('b')})`);
	check(tisch.total === 15, `Gesamteinsatz ist jetzt 15 (a:5 + b:10) (gefunden: ${tisch.total})`);

	const leer = tisch.takeBack('c');
	check(leer.ok === false && leer.reason === 'empty',
		`takeBack() auf ein leeres Feld sagt mit reason:'empty' ab (gefunden: ${JSON.stringify(leer)})`);

	const unbekannt = tisch.takeBack('nicht-vorhanden');
	check(unbekannt.ok === false && unbekannt.reason === 'unknown',
		`takeBack() auf ein unbekanntes Feld sagt mit reason:'unknown' ab (gefunden: ${JSON.stringify(unbekannt)})`);
}

/* ============================================================== B-6 Alles oder nichts */

console.log("\nB-6  Alles oder nichts bei double() und repeat()");
{
	// double(): x darf höchstens 10, es liegen 6 — verdoppelt wären 12, also Absage.
	const tisch = new BetTable({
		fields: [
			{ id: 'x', label: 'X', covers: [1], payout: 1, max: 10 },
			{ id: 'y', label: 'Y', covers: [1], payout: 1, max: 100 },
		],
		roundMax: 1000,
	});
	tisch.place('x', 6);
	tisch.place('y', 6);
	const vorher = tisch.snapshot();
	const verdoppelt = tisch.double();
	check(verdoppelt.ok === false && verdoppelt.reason === 'fieldmax',
		`double() sagt mit reason:'fieldmax' ab, weil x überliefe (gefunden: ${JSON.stringify(verdoppelt)})`);
	check(tiefGleich(tisch.snapshot(), vorher),
		'double() hat bei der Absage GAR NICHTS verändert (auch y nicht angerührt)');

	// repeat(): lastRound künstlich über restore() gesetzt, mit einem Feld über seinem Limit.
	const tisch2 = new BetTable({
		fields: [{ id: 'z', label: 'Z', covers: [1], payout: 1, max: 50 }],
		roundMax: 1000,
	});
	tisch2.restore({ locked: false, placements: [], lastRound: [{ fieldId: 'z', value: 80 }] });
	const wiederholt = tisch2.repeat();
	check(wiederholt.ok === false && wiederholt.reason === 'fieldmax',
		`repeat() sagt mit reason:'fieldmax' ab, wenn die letzte Runde ein Feldlimit überschritte (gefunden: ${JSON.stringify(wiederholt)})`);
	check(tisch2.placements.length === 0, 'repeat() hat bei der Absage nichts auf das Tuch gelegt');
}

/* ==================================================================== B-7 Auswertung */

console.log('\nB-7  Auswertung: eine Tabelle von Hand gerechneter Fälle');
{
	const tisch = new BetTable({
		fields: [
			{ id: 'single', label: 'Single', covers: [7], payout: 35, max: 1000 },
			{ id: 'dozen', label: 'Dozen', covers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payout: 2, max: 1000 },
			{ id: 'odd', label: 'Odd', covers: [1, 3, 5, 7, 9, 11, 13], payout: 1, max: 1000 },
			{ id: 'place', label: 'Place', covers: [7], payout: 7 / 6, max: 1000 },
			{ id: 'pushfeld', label: 'Push', covers: [], push: [7], payout: 1, max: 1000 },
			{ id: 'lossfeld', label: 'Loss', covers: [2], payout: 1, max: 1000 },
			{ id: 'matchesfeld', label: 'Matches', matches: (r) => r % 2 === 1, payout: 4, max: 1000 },
		],
		roundMax: 1000,
	});
	tisch.place('single', 10);
	tisch.place('dozen', 20);
	tisch.place('odd', 15);
	tisch.place('place', 10);
	tisch.place('pushfeld', 8);
	tisch.place('lossfeld', 12);
	tisch.place('matchesfeld', 9);

	const bericht = tisch.settle(7);

	const ERWARTET = {
		single: { staked: 10, outcome: 'win', payout: 350, returned: 360 },
		dozen: { staked: 20, outcome: 'win', payout: 40, returned: 60 },
		odd: { staked: 15, outcome: 'win', payout: 15, returned: 30 },
		place: { staked: 10, outcome: 'win', payout: 11, returned: 21 }, // 10 * 7/6 = 11,666… → abgerundet 11
		pushfeld: { staked: 8, outcome: 'push', payout: 0, returned: 8 },
		lossfeld: { staked: 12, outcome: 'loss', payout: 0, returned: 0 },
		matchesfeld: { staked: 9, outcome: 'win', payout: 36, returned: 45 },
	};

	for (const eintrag of bericht.fields) {
		const soll = ERWARTET[eintrag.fieldId];
		check(soll !== undefined
			&& eintrag.staked === soll.staked
			&& eintrag.outcome === soll.outcome
			&& eintrag.payout === soll.payout
			&& eintrag.returned === soll.returned,
			`Feld "${eintrag.fieldId}": staked ${soll?.staked}, outcome ${soll?.outcome}, payout ${soll?.payout}, returned ${soll?.returned}`
			+ ` (gefunden: ${JSON.stringify(eintrag)})`);
	}
	check(bericht.fields.length === Object.keys(ERWARTET).length,
		`genau ${Object.keys(ERWARTET).length} Feldberichte (gefunden: ${bericht.fields.length})`);

	const summeStaked = Object.values(ERWARTET).reduce((s, e) => s + e.staked, 0);
	const summeReturned = Object.values(ERWARTET).reduce((s, e) => s + e.returned, 0);
	check(bericht.total === summeStaked, `Summe total ist ${summeStaked} (gefunden: ${bericht.total})`);
	check(bericht.payout === summeReturned, `Summe payout ist ${summeReturned} (gefunden: ${bericht.payout})`);
}

/* ============================================================ B-8 settle() räumt nicht ab */

console.log('\nB-8  settle() räumt nicht ab; erst sweep() leert das Tuch');
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [7], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	tisch.place('f', 10);
	tisch.settle(7);
	check(tisch.total === 10, `nach settle() liegt der Chip noch (gefunden: ${tisch.total})`);
	check(tiefGleich(tisch.stacksOn('f'), [{ value: 10, count: 1 }]), 'der Stapel ist nach settle() unverändert');

	const gefegt = tisch.sweep();
	check(tisch.total === 0, `nach sweep() ist das Tuch leer (gefunden: ${tisch.total})`);
	check(tiefGleich(gefegt, [{ fieldId: 'f', value: 10 }]), `sweep() liefert die eingesammelten Chips (gefunden: ${JSON.stringify(gefegt)})`);
	check(tiefGleich(tisch.lastRound, [{ fieldId: 'f', value: 10 }]), 'sweep() füllt lastRound für repeat()');

	const wiederholt = tisch.repeat();
	check(wiederholt.ok === true && tisch.total === 10, 'repeat() legt danach dieselbe Runde erneut');
}

/* =============================================================== B-9 Momentaufnahme */

console.log('\nB-9  Momentaufnahme: restore(snapshot()) ergibt denselben Zustand');
{
	const FELDER = ['f1', 'f2', 'f3', 'f4'].map((id) => ({ id, label: id, covers: Array.from({ length: 38 }, (_, i) => i), payout: 1, max: 1000 }));
	const neuerTisch = () => new BetTable({ fields: FELDER.map((f) => ({ ...f })), roundMax: 5000 });

	function zufallsBefehl(rnd) {
		const felder = ['f1', 'f2', 'f3', 'f4'];
		const r = rnd();
		if (r < 0.45) {
			return { type: 'place', fieldId: felder[Math.floor(rnd() * 4)], value: 1 + Math.floor(rnd() * 20) };
		}
		if (r < 0.65) {
			return { type: 'takeBack', fieldId: felder[Math.floor(rnd() * 4)] };
		}
		if (r < 0.75) {
			return { type: 'undo' };
		}
		if (r < 0.80) {
			return { type: 'lock' };
		}
		if (r < 0.85) {
			return { type: 'unlock' };
		}
		if (r < 0.93) {
			return { type: 'settleSweep', result: Math.floor(rnd() * 38) };
		}
		if (r < 0.97) {
			return { type: 'double' };
		}
		return { type: 'repeat' };
	}

	function wende(tisch, befehl) {
		if (befehl.type === 'place') {
			tisch.place(befehl.fieldId, befehl.value);
		} else if (befehl.type === 'takeBack') {
			tisch.takeBack(befehl.fieldId);
		} else if (befehl.type === 'undo') {
			tisch.undo();
		} else if (befehl.type === 'lock') {
			tisch.lock();
		} else if (befehl.type === 'unlock') {
			tisch.unlock();
		} else if (befehl.type === 'settleSweep') {
			tisch.settle(befehl.result);
			tisch.sweep();
		} else if (befehl.type === 'double') {
			tisch.double();
		} else if (befehl.type === 'repeat') {
			tisch.repeat();
		}
	}

	const rnd = zufallsgenerator(2026_09_04);
	const befehle = Array.from({ length: 250 }, () => zufallsBefehl(rnd));

	const tischA = neuerTisch();
	const tischB = neuerTisch();
	for (const befehl of befehle.slice(0, 200)) {
		wende(tischA, befehl);
		wende(tischB, befehl);
	}

	const aufnahme = tischA.snapshot();
	for (const befehl of befehle.slice(200)) {
		wende(tischA, befehl);
	}
	check(!tiefGleich(tischA.snapshot(), aufnahme) || befehle.slice(200).length === 0,
		'zur Kontrolle: die weiteren 50 Schritte verändern tischA tatsächlich (Testaufbau prüft sich selbst)');

	tischA.restore(aufnahme);

	check(tischA.locked === tischB.locked, `locked stimmt überein (A: ${tischA.locked}, B: ${tischB.locked})`);
	check(tiefGleich(tischA.placements, tischB.placements), 'placements stimmen nach restore() exakt überein');
	check(tiefGleich(tischA.lastRound, tischB.lastRound), 'lastRound stimmt nach restore() exakt überein');
	for (const feld of FELDER) {
		check(tischA.stakeOn(feld.id) === tischB.stakeOn(feld.id),
			`stakeOn('${feld.id}') stimmt überein (A: ${tischA.stakeOn(feld.id)}, B: ${tischB.stakeOn(feld.id)})`);
		check(tiefGleich(tischA.stacksOn(feld.id), tischB.stacksOn(feld.id)),
			`stacksOn('${feld.id}') stimmt überein`);
	}
}

/* =================================================================== B-10 Rundenablauf */

console.log('\nB-10  Rundenablauf: alle 25 Kombinationen aus fünf Zuständen und fünf Übergängen');
{
	const ALLOWED_ZUM_TEST = {
		setzen: 'gesperrt',
		gesperrt: 'laeuft',
		laeuft: 'auswerten',
		auswerten: 'auszahlen',
		auszahlen: 'setzen',
	};

	check(Array.isArray(ROUND_STATES) && ROUND_STATES.length === 5
		&& tiefGleich(ROUND_STATES, ['setzen', 'gesperrt', 'laeuft', 'auswerten', 'auszahlen']),
		`ROUND_STATES ist genau die fünf Zustände in Ablaufreihenfolge (gefunden: ${JSON.stringify(ROUND_STATES)})`);

	let initCalls = 0;
	const initRunde = new TableRound({ onEnter: (m) => { initCalls += 1; check(m.previous === null && m.detail.reason === 'init', 'die erste Meldung hat previous:null und detail.reason:"init"'); } });
	check(initCalls === 1, `onEnter wird beim Bau genau einmal gerufen (gefunden: ${initCalls})`);
	check(initRunde.state === 'setzen', 'der Grundzustand ist "setzen"');

	for (const start of ROUND_STATES) {
		let rufe = 0;
		const runde = new TableRound({ onEnter: () => { rufe += 1; } });
		// von 'setzen' aus über die erlaubte Kette bis zum gewünschten Startzustand fahren
		while (runde.state !== start) {
			runde.go(ALLOWED_ZUM_TEST[runde.state], {});
		}

		const validesZiel = ALLOWED_ZUM_TEST[start];
		for (const ziel of ROUND_STATES) {
			if (ziel === validesZiel) {
				continue;
			}
			const vorher = runde.state;
			const ergebnis = runde.go(ziel, {});
			check(ergebnis.ok === false && ergebnis.reason === 'state' && runde.state === vorher,
				`${start} → ${ziel}: unerlaubt, {ok:false, reason:'state'}, Zustand bleibt ${vorher}`
				+ ` (gefunden: ${JSON.stringify(ergebnis)})`);
		}

		rufe = 0;
		const zuvor = runde.state;
		const erfolg = runde.go(validesZiel, {});
		check(erfolg.ok === true && runde.state === validesZiel && erfolg.previous === zuvor,
			`${start} → ${validesZiel}: erlaubt, neuer Zustand ${validesZiel} (gefunden: ${JSON.stringify(erfolg)})`);
		check(rufe === 1, `onEnter wurde bei diesem einen erlaubten Übergang genau einmal gerufen (gefunden: ${rufe})`);
	}

	// Kein Wurf über alle 25 Kombinationen — bereits durch obige Schleife erwiesen, da jeder
	// go()-Aufruf synchron ein Ergebnisobjekt liefert und kein try/catch nötig war.
	check(true, 'kein einziger der zwanzig unerlaubten Übergänge hat geworfen');

	for (const start of ROUND_STATES) {
		let rufe = 0;
		const runde = new TableRound({ onEnter: () => { rufe += 1; } });
		while (runde.state !== start) {
			runde.go(ALLOWED_ZUM_TEST[runde.state], {});
		}
		rufe = 0;
		const ergebnis = runde.abort('test');
		check(ergebnis.ok === true && runde.state === 'setzen', `abort() aus "${start}" führt nach 'setzen' (gefunden: ${JSON.stringify(ergebnis)})`);
		check(rufe === 1, `onEnter wurde bei abort() genau einmal gerufen (gefunden: ${rufe})`);
	}
}

/* ================================================================ B-11 gesperrt heißt gesperrt */

console.log("\nB-11  gesperrt heißt gesperrt — für alle sechs verändernden Methoden");
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [1], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	tisch.lock();

	const place = tisch.place('f', 5);
	check(place.ok === false && place.reason === 'locked', `place() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(place)})`);

	const takeBack = tisch.takeBack('f');
	check(takeBack.ok === false && takeBack.reason === 'locked', `takeBack() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(takeBack)})`);

	const undoErgebnis = tisch.undo();
	check(undoErgebnis.ok === false && undoErgebnis.reason === 'locked', `undo() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(undoErgebnis)})`);

	const clearErgebnis = tisch.clear();
	check(clearErgebnis.ok === false && clearErgebnis.reason === 'locked', `clear() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(clearErgebnis)})`);

	const doubleErgebnis = tisch.double();
	check(doubleErgebnis.ok === false && doubleErgebnis.reason === 'locked', `double() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(doubleErgebnis)})`);

	const repeatErgebnis = tisch.repeat();
	check(repeatErgebnis.ok === false && repeatErgebnis.reason === 'locked', `repeat() sagt bei gesperrtem Tuch mit reason:'locked' ab (gefunden: ${JSON.stringify(repeatErgebnis)})`);
}

/* ============================================================ TB-neu-1 countsToRoundMax */

console.log('\nTB-neu-1  countsToRoundMax: Odds zählen nicht in den Rundenhöchstbetrag');
{
	const tisch = new BetTable({
		fields: [
			{ id: 'gewoehnlich', label: 'G', covers: [1], payout: 1, max: 1000 },
			{ id: 'odds', label: 'O', covers: [1], payout: 1, max: 1000, countsToRoundMax: false },
		],
		roundMax: 50,
	});

	check(tisch.fields.get('gewoehnlich').countsToRoundMax === true,
		'ohne Angabe ist countsToRoundMax true (bestehende Tische ändern sich nicht)');
	check(tisch.fields.get('odds').countsToRoundMax === false,
		'mit countsToRoundMax:false steht die Eigenschaft auch am Feld auf false');

	check(tisch.place('gewoehnlich', 50).ok === true, 'ein zählendes Feld darf bis roundMax belegt werden');
	check(tisch.countedTotal === 50, `countedTotal ist nach dem zählenden Einsatz 50 (gefunden: ${tisch.countedTotal})`);
	check(tisch.total === 50, `total ist ebenfalls 50 (gefunden: ${tisch.total})`);

	const ablehnung = tisch.place('gewoehnlich', 1);
	check(ablehnung.ok === false && ablehnung.reason === 'roundmax',
		`ein weiterer Euro auf das zählende Feld wird mit reason:'roundmax' abgelehnt (gefunden: ${JSON.stringify(ablehnung)})`);

	const odds1 = tisch.place('odds', 500);
	check(odds1.ok === true, `ein nicht zählendes Feld darf über roundMax hinaus belegt werden (gefunden: ${JSON.stringify(odds1)})`);
	check(tisch.countedTotal === 50, `countedTotal bleibt bei 50, das Odds-Feld zählt nicht mit (gefunden: ${tisch.countedTotal})`);
	check(tisch.total === 550, `total zählt weiterhin ALLES, also 550 (gefunden: ${tisch.total})`);

	const odds2 = tisch.place('odds', 501);
	check(odds2.ok === false && odds2.reason === 'fieldmax',
		`das Odds-Feld unterliegt weiterhin seinem eigenen max (gefunden: ${JSON.stringify(odds2)})`);
}

/* =========================================================================== TB-neu-2 Sockel */

console.log('\nTB-neu-2  Sockel: freeze()/unfreeze(), takeBack() unter dem Sockel');
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [1], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	tisch.place('f', 10);
	tisch.place('f', 5);
	tisch.freeze('f', 10);

	check(tisch.floorOn('f') === 10, `floorOn('f') ist 10 (gefunden: ${tisch.floorOn('f')})`);

	const ueberSockel = tisch.takeBack('f');
	check(ueberSockel.ok === true && ueberSockel.value === 5,
		`takeBack() über dem Sockel gelingt (Rest 10, genau der Sockel) (gefunden: ${JSON.stringify(ueberSockel)})`);
	check(tisch.stakeOn('f') === 10, `auf 'f' liegt danach noch genau der Sockel (gefunden: ${tisch.stakeOn('f')})`);

	const unterSockel = tisch.takeBack('f');
	check(unterSockel.ok === false && unterSockel.reason === 'frozen' && unterSockel.floor === 10,
		`takeBack() unter den Sockel wird mit reason:'frozen', floor:10 abgelehnt (gefunden: ${JSON.stringify(unterSockel)})`);
	check(tisch.stakeOn('f') === 10, 'der Sockel liegt nach der Absage unverändert weiter');

	tisch.unfreeze('f');
	check(tisch.floorOn('f') === 0, `unfreeze() hebt den Sockel auf (gefunden: ${tisch.floorOn('f')})`);
	const nachUnfreeze = tisch.takeBack('f');
	check(nachUnfreeze.ok === true && nachUnfreeze.value === 10,
		`nach unfreeze() gelingt takeBack() wieder vollständig (gefunden: ${JSON.stringify(nachUnfreeze)})`);

	// freeze(f, 0) hebt den Sockel ebenso auf wie unfreeze().
	tisch.place('f', 20);
	tisch.freeze('f', 10);
	tisch.freeze('f', 0);
	check(tisch.floorOn('f') === 0, `freeze(f, 0) hebt den Sockel auf wie unfreeze() (gefunden: ${tisch.floorOn('f')})`);
}

/* ================================================================ TB-neu-3 undo/clear/double */

console.log('\nTB-neu-3  undo()/clear()/double() mit Sockel');
{
	// undo(): überspringt den geschützten Chip und nimmt den nächsten freien.
	const tisch = new BetTable({
		fields: [
			{ id: 'geschuetzt', label: 'P', covers: [1], payout: 1, max: 1000 },
			{ id: 'frei', label: 'F', covers: [1], payout: 1, max: 1000 },
		],
		roundMax: 1000,
	});
	tisch.place('geschuetzt', 10); // #1
	tisch.freeze('geschuetzt', 10);
	tisch.place('frei', 7); // #2, zuletzt gelegt, aber frei

	const undo1 = tisch.undo();
	check(undo1.ok === true && undo1.fieldId === 'frei' && undo1.value === 7,
		`undo() überspringt den geschützten Chip und nimmt den freien (gefunden: ${JSON.stringify(undo1)})`);

	const undo2 = tisch.undo();
	check(undo2.ok === false && undo2.reason === 'frozen',
		`undo() sagt mit reason:'frozen' ab, wenn nur noch geschützte Chips liegen (gefunden: ${JSON.stringify(undo2)})`);
	check(tisch.stakeOn('geschuetzt') === 10, 'der geschützte Chip liegt nach beiden undo()-Läufen unverändert');

	// clear(): lässt genau den Sockel liegen, gibt den Rest in ursprünglicher Reihenfolge zurück.
	const tisch2 = new BetTable({
		fields: [
			{ id: 'a', label: 'A', covers: [1], payout: 1, max: 1000 },
			{ id: 'b', label: 'B', covers: [1], payout: 1, max: 1000 },
		],
		roundMax: 1000,
	});
	tisch2.place('a', 10); // #1
	tisch2.place('b', 20); // #2
	tisch2.place('a', 4); // #3
	tisch2.freeze('a', 10);

	const geraeumt = tisch2.clear();
	check(Array.isArray(geraeumt), `clear() liefert ein Array (gefunden: ${JSON.stringify(geraeumt)})`);
	check(tiefGleich(geraeumt, [{ fieldId: 'b', value: 20 }, { fieldId: 'a', value: 4 }]),
		`clear() gibt genau den Rest zurück, in ursprünglicher Legereihenfolge (gefunden: ${JSON.stringify(geraeumt)})`);
	check(tisch2.stakeOn('a') === 10, `der Sockel auf 'a' bleibt liegen (gefunden: ${tisch2.stakeOn('a')})`);
	check(tisch2.stakeOn('b') === 0, `'b' ist vollständig abgeräumt (gefunden: ${tisch2.stakeOn('b')})`);

	// double(): Felder MIT Sockel bleiben unangetastet, die übrigen verdoppeln.
	const tisch3 = new BetTable({
		fields: [
			{ id: 'vertrag', label: 'V', covers: [1], payout: 1, max: 1000 },
			{ id: 'offen', label: 'O', covers: [1], payout: 1, max: 1000 },
		],
		roundMax: 1000,
	});
	tisch3.place('vertrag', 15);
	tisch3.freeze('vertrag', 15);
	tisch3.place('offen', 6);

	const verdoppelt = tisch3.double();
	check(verdoppelt.ok === true, `double() gelingt (gefunden: ${JSON.stringify(verdoppelt)})`);
	check(tisch3.stakeOn('vertrag') === 15, `'vertrag' bleibt unverdoppelt bei 15 (gefunden: ${tisch3.stakeOn('vertrag')})`);
	check(tisch3.stakeOn('offen') === 12, `'offen' wird verdoppelt auf 12 (gefunden: ${tisch3.stakeOn('offen')})`);
	check(tiefGleich(verdoppelt.added, [{ fieldId: 'offen', value: 6 }]),
		`double() meldet nur den frei verdoppelten Chip zurück (gefunden: ${JSON.stringify(verdoppelt.added)})`);

	// Gegenprobe: liegt NUR eine Vertragswette, sagt double() 'empty' und ändert nichts.
	const tisch4 = new BetTable({
		fields: [{ id: 'vertrag', label: 'V', covers: [1], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	tisch4.place('vertrag', 15);
	tisch4.freeze('vertrag', 15);
	const vorher4 = tisch4.snapshot();
	const ablehnung4 = tisch4.double();
	check(ablehnung4.ok === false && ablehnung4.reason === 'empty',
		`GEGENPROBE: double() mit AUSSCHLIESSLICH gesockelten Feldern sagt mit reason:'empty' ab (gefunden: ${JSON.stringify(ablehnung4)})`);
	check(tiefGleich(tisch4.snapshot(), vorher4), 'GEGENPROBE: dabei wurde nichts verändert');
}

/* =========================================================== TB-neu-4 snapshot/restore mit Sockel */

console.log('\nTB-neu-4  snapshot()/restore() führen die Sockel mit');
{
	const tisch = new BetTable({
		fields: [{ id: 'f', label: 'F', covers: [1], payout: 1, max: 1000 }],
		roundMax: 1000,
	});
	tisch.place('f', 20);
	tisch.freeze('f', 10);

	const aufnahme = tisch.snapshot();
	check(tiefGleich(aufnahme.floors, [['f', 10]]), `snapshot() führt die Sockel mit (gefunden: ${JSON.stringify(aufnahme.floors)})`);

	tisch.unfreeze('f');
	check(tisch.floorOn('f') === 0, 'zur Kontrolle: der Sockel ist jetzt tatsächlich aufgehoben');

	tisch.restore(aufnahme);
	check(tisch.floorOn('f') === 10, `restore() stellt den Sockel wieder her (gefunden: ${tisch.floorOn('f')})`);

	// Ein wiederhergestellter Tisch verhält sich in takeBack() genau wie vorher.
	const zuFruehesTakeBack = tisch.takeBack('f');
	check(zuFruehesTakeBack.ok === false && zuFruehesTakeBack.reason === 'frozen',
		`nach restore() sperrt takeBack() unter den wiederhergestellten Sockel genau wie vorher (gefunden: ${JSON.stringify(zuFruehesTakeBack)})`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Legen, Stapeln, Zurücknehmen, Feld- und'
	+ '\nRundenlimits, Auswertung, der Rundenablauf, countsToRoundMax und die'
	+ '\nSockel für Vertragswetten sind unter Node bewiesen.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
