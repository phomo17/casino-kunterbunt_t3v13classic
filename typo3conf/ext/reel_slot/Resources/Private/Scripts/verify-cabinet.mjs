/**
 * Reel Slot – Nachweis Negativliste (A-1)
 * ========================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * -----------------------
 *   A-1  Kein fremder Hersteller-, Modell- oder Spieltitel (Negativliste)
 *
 * WARUM DIESE DATEI NEU ENTSTEHT, STATT EINEM VORHANDENEN SKRIPT ANGEHÄNGT
 * ZU WERDEN
 * --------------------------------------------------------------------------
 * `reel_slot` hatte bislang zwei Prüfskripte, `verify-payout.mjs` (Quote) und
 * `verify-sound.mjs` (Klang) — beide mit einem eigenen, engen Prüfgegenstand,
 * in den eine Negativlisten-Prüfung inhaltlich nicht passt. In jeder anderen
 * Geräte-Extension (`coin_pusher`, `roulette`, `fruit_risk`) trägt dieselbe
 * Prüfung den Dateinamen `verify-cabinet.mjs`; `video_slot` hat sie dort seit
 * diesem Behebungslauf ebenfalls (Kennung A-13, weil A-5 dort bereits eine
 * andere Prüfung ist). Der Name `verify-cabinet.mjs` ist damit die
 * projektweite Konvention für genau diese Prüfung — auch für ein künftiges
 * Gerät ist er die naheliegende Stelle, an der man zuerst nachsieht. `reel_slot`
 * bekommt deshalb dieselbe Datei, hier bewusst schlank gehalten: nur die eine
 * Prüfung, die ihr fehlte, ohne den Rest (Farben, Tokens, Gehäuse-Vertrag,
 * Kürzel-Präfix, Registry-Anmeldung), den es für dieses längst fertige und
 * eingefrorene Gerät nachträglich einzuführen keinen Sinn hätte.
 *
 * A-1 liest den vollen Text jeder Datei dieser Extension, Kommentare
 * eingeschlossen: ein öffentliches Repository liefert die Quelldateien
 * vollständig mit aus, der Unterschied zwischen Kommentar und sichtbarem Text
 * verschwindet damit (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) — dieselbe Begründung
 * wie bei A-5 in `coin_pusher`/`roulette`/`fruit_risk` und bei A-13 in
 * `video_slot`.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from '../../../../casino_startpage/Resources/Private/Scripts/negativliste.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/reel_slot/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/**
 * Diese Datei selbst — nicht mehr für eine Namensausnahme (siehe A-1 unten:
 * die Negativliste steht seit Befund B-6 nicht mehr hier), sondern nur noch
 * dafür, dass A-1 die drei Zeichen ©/™/® ausschließlich in DIESER Datei
 * unschädlich macht, bevor sie geprüft wird. Diese Datei muss die drei
 * Zeichen wörtlich enthalten — als Prüf-Array UND im Ausgabetext —, um
 * überhaupt gegen sie prüfen zu können; jede andere Datei bleibt unangetastet
 * und wird normal auf die Zeichen geprüft (dieselbe Art Ausnahme wie
 * fruit_risk/…/verify-cabinet.mjs seit Stand F2).
 */
const DIESE_DATEI = fileURLToPath(import.meta.url);

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

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

/** Alle Dateien unterhalb eines Verzeichnisses, rekursiv, sortiert. */
function alleDateien(wurzel) {
	const gefunden = [];
	const offen = [wurzel];
	while (offen.length > 0) {
		const verzeichnis = offen.pop();
		for (const name of readdirSync(verzeichnis).sort()) {
			const voll = path.join(verzeichnis, name);
			if (statSync(voll).isDirectory()) {
				offen.push(voll);
			} else {
				gefunden.push(voll);
			}
		}
	}
	return gefunden.sort();
}

console.log('\nReel Slot – Nachweis Negativliste (A-1)');
console.log('==========================================\n');

/* ========================================= A-1 Kein fremder Name */

console.log('A-1  Kein fremder Hersteller-, Modell- oder Spieltitel');
{
	// Struktureller Befund der Copyright-Prüfung roulette vom 2026-09-09:
	// NEGATIVLISTE.length wurde weiter unten nur AUSGEGEBEN, nie GEPRÜFT —
	// eine leere oder halb geschriebene Liste hätte diese Prüfung mit
	// "bestanden" durchlaufen lassen, ohne dass ein einziger Name wirklich
	// geprüft worden wäre. MINDESTLAENGE ist in negativliste.mjs begründet.
	check(NEGATIVLISTE.length >= MINDESTLAENGE,
		`NEGATIVLISTE trägt mindestens ${MINDESTLAENGE} Einträge (tatsächlich`
		+ ` ${NEGATIVLISTE.length}) — sonst liefe diese Prüfung mit einer`
		+ ' leeren oder halb geschriebenen Liste weiter und meldete'
		+ ' fälschlich "bestanden"');

	// Die Negativliste selbst führt seit Befund B-6 der Copyright-Prüfung
	// craps vom 2026-09-09 nur noch EINE Datei für alle acht Geräte:
	// casino_startpage/…/negativliste.mjs (siehe deren Kopfkommentar). Diese
	// Datei hier enthält die Liste nicht mehr wörtlich und braucht deshalb
	// auch keine Selbstausnahme mehr — anders als bis zum 2026-09-08, als
	// die Liste noch als eigenes Array in dieser Datei stand.
	const GEPRUEFT = alleDateien(EXT);
	const treffer = [];
	for (const datei of GEPRUEFT) {
		// KEIN Kommentar-Ausschnitt hier: A-1 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen. Weitere Ausnahme: in dieser Datei selbst
		// werden die drei Zeichen ©/™/® unschädlich gemacht (siehe
		// DIESE_DATEI oben) — sie muss sie wörtlich enthalten, um überhaupt
		// gegen sie prüfen zu können.
		const roh = lies(datei);
		const inhalt = datei === DIESE_DATEI ? roh.replace(/[©™®]/g, '·') : roh;
		const inhaltKlein = inhalt.toLowerCase();
		for (const name of NEGATIVLISTE) {
			if (musterFuer(name).test(inhaltKlein)) {
				treffer.push(`${kurz(datei)}: „${name}"`);
			}
		}
		for (const zeichen of ['©', '™', '®']) {
			if (inhalt.includes(zeichen)) {
				treffer.push(`${kurz(datei)}: Zeichen „${zeichen}"`);
			}
		}
	}
	check(treffer.length === 0,
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen, geteilt mit`
		+ ' den sieben übrigen Geräten und casino_startpage) und keins der drei'
		+ ' Zeichen ©/™/® in dieser Extension — README eingeschlossen. Diese'
		+ ' Datei selbst kennt keine Ausnahme mehr: sie trägt die Liste nicht'
		+ ' mehr wörtlich (Befund B-6 der Copyright-Prüfung craps vom'
		+ ' 2026-09-09)',
		...treffer);

	console.log('     Gegenprobe A-1-G: dieselbe Prüfung (musterFuer) muss einen gelisteten Namen auch in Versalien und ohne Trennzeichen erkennen');
	// Befund B-3 der Copyright-Prüfung craps vom 2026-09-09: diese sechs
	// Skripte hatten zu ihrer Negativliste bislang GAR KEINE Gegenprobe. Die
	// Gegenprobe benutzt dieselbe musterFuer()-Funktion wie der Hauptlauf
	// oben. Der Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt (ein
	// mehrwortiger Eintrag aus reinen Buchstaben), statt als eigenes
	// Zeichenkettenliteral in diese Datei geschrieben zu werden — sonst
	// geriete der geschützte Name selbst in den Quelltext dieser Datei und
	// A-1 schlüge gegen die eigene Gegenprobe an. Der erfundene Text testet
	// zugleich Befund B-1: zusammengeschrieben und in Versalien.
	const gegenprobeName = NEGATIVLISTE.find((name) => / /.test(name) && /^[A-Za-z ]+$/.test(name));
	const erfundeneZeile = `Dieser Testtext erwähnt versehentlich ${gegenprobeName.toUpperCase().replace(/ /g, '')} und ${NEGATIVLISTE[0]}.`.toLowerCase();
	const gegenprobeGefunden = NEGATIVLISTE.filter((name) => musterFuer(name).test(erfundeneZeile));
	check(gegenprobeGefunden.length >= 2,
		'A-1-G: sowohl der zusammengeschriebene Versalien-Name als auch der erste Listeneintrag werden erkannt',
		...gegenprobeGefunden);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Kein fremder Hersteller-, Modell-'
	+ '\noder Spieltitel in dieser Extension.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
