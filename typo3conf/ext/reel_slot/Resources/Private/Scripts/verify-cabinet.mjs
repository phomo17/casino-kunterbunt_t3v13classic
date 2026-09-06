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

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/reel_slot/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** diese Datei selbst, für die Ausnahme in A-1 */
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
	const NEGATIVLISTE = [
		// Spielautomatenhersteller und Spieltitel (CONCEPT.md B.3 Nr. 4)
		'Novomatic', 'Novomatix', 'Greentube', 'Merkur', 'Gauselmann', 'Bally',
		'Aristocrat', 'IGT', 'Mills', 'Jennings', 'Watling', 'Light & Wonder',
		'Bell-Fruit', 'Sizzling Hot', 'Book of Ra', 'Book of Sand',
		"Lucky Lady's Charm", 'Penny Falls',
		// Rad- und Tischhersteller sowie deren Modell-/Bauteilnamen
		'TCSJohnHuxley', 'John Huxley', 'Cammegh', 'Abbiati', 'Matsui',
		'CTC Holdings', 'Alfastreet', 'Interblock', 'Mercury 360', 'Slingshot',
		'Saturn Glo', 'Garnite', 'EyeBall', 'Velstone', 'Starburst',
		// Chiphersteller
		'Gaming Partners International', 'GPI', 'Paulson', 'Bud Jones',
		'Chipco', 'Dal Negro',
		// Spielbanken und Casinomarken
		'Bellagio', 'Caesars', 'Wynn', 'Venetian', 'MGM', 'Mirage', 'Flamingo',
		'Golden Nugget', 'Tropicana', 'Stardust', 'Riviera', 'Sands', 'Luxor',
		'Harrah', 'Monte Carlo',
		// Live-Casino- und Spielesoftwaremarken
		'Evolution Gaming', 'Playtech', 'Pragmatic Play', 'Microgaming',
		'NetEnt', 'Scientific Games', 'WMS', 'Barcrest', 'Cirsa', 'Konami',
		'All rights reserved',
		// Zusätzlich zu B.3 Nr. 4: geschützte Mechanik-Bezeichnungen aus der
		// Recherche zu diesem Gerät (CONCEPT.md C.14.18). Sie erscheinen
		// nirgends — nicht in sichtbarem Text, nicht in Dateinamen, nicht in
		// CSS-Klassen, nicht in Kommentaren, nicht in Variablennamen. Erfasst
		// sind neben der Marken-Schreibweise auch Klein-, GROSS- und
		// Bindestrich-Schreibweisen, wie ein Name realistisch in einer
		// CSS-Klasse, einem Bezeichner oder einem Kommentar auftauchen würde
		// (Befund C-2 der Copyright-Prüfung vom 2026-09-06; gemessen statt
		// vermutet — keine der Varianten löst einen Fehlalarm im vorhandenen
		// Bestand aus, siehe DECISIONS.md).
		'Megaways', 'MEGAWAYS', 'megaways',
		'Cluster Pays', 'CLUSTER PAYS', 'cluster pays', 'ClusterPays', 'clusterPays', 'cluster-pays',
		'InfiniReels', 'INFINIREELS', 'infinireels', 'Infini Reels', 'infini-reels',
		'Tumbling Reels', 'TUMBLING REELS', 'tumbling reels', 'TumblingReels', 'tumblingReels', 'tumbling-reels',
	];
	// Ausnahme für genau eine Datei: diese Prüfskript-Datei selbst muss die
	// Negativliste als ausführbares JS-Array wörtlich enthalten, um überhaupt
	// gegen sie prüfen zu können — dieselbe Art Ausnahme wie in
	// coin_pusher/roulette/fruit_risk verify-cabinet.mjs (dort A-5) und in
	// video_slot verify-cabinet.mjs (dort A-13).
	const GEPRUEFT = alleDateien(EXT).filter((d) => d !== DIESE_DATEI);
	const treffer = [];
	for (const datei of GEPRUEFT) {
		// KEIN Kommentar-Ausschnitt hier: A-1 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen.
		const inhalt = lies(datei);
		for (const name of NEGATIVLISTE) {
			if (inhalt.includes(name)) {
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
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen) und keins`
		+ ' der drei Zeichen ©/™/® in dieser Extension — README eingeschlossen'
		+ ' (Ausnahme: diese Datei selbst, die die Liste als Programmzeile'
		+ ' enthalten muss, um sie zu prüfen)',
		...treffer);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Kein fremder Hersteller-, Modell-'
	+ '\noder Spieltitel in dieser Extension.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
