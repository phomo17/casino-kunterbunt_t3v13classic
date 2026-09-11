/**
 * Casino Kunterbunt – der Prüfstand des ganzen Hauses (Phase D6)
 * ==============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit. Es ÄNDERT KEINE DATEI und schreibt nur dann in
 * die Datenbank, wenn --lobby-leeren ausdrücklich mitgegeben wird (dann werden
 * ausschließlich die drei Lobby-Tabellen geleert, nie eine andere).
 *
 * WARUM ES DIESES WERKZEUG GIBT
 * -----------------------------------------------------------------------------
 * Fünfmal in fünf Phasen war der Prüfstand vollständig grün, während die
 * Anwendung kaputt war. Zwei der Ursachen kann ein Reihenlauf abstellen:
 *
 *   1. NIEMAND FUHR ALLES. Es wurden nur die Skripte des jeweils bearbeiteten
 *      Bereichs gefahren; rote Skripte in einem anderen Bereich blieben
 *      deshalb tagelang unbemerkt (DECISIONS.md, 2026-09-09).
 *   2. EIN ÜBERSPRUNGENER BLOCK SIEHT AUS WIE EIN BESTANDENER. Ein gutes
 *      Drittel der vorhandenen Prüfskripte hat mindestens einen Zweig, der
 *      "übersprungen" meldet und trotzdem mit Rückgabewert 0 endet. Wer nur
 *      den Rückgabewert ansieht, bekommt grün.
 *
 * DESHALB ZÄHLT DIESES WERKZEUG DREI DINGE, NICHT EINS:
 *   Zusagen (✓ / OK), Fehler (✗ / FEHLER) UND LÜCKEN (Zeilen mit
 *   "übersprungen"). Ein Skript mit 0 Fehlern und mindestens 1 Lücke heißt
 *   hier "grün MIT LÜCKE" und ist im Schlussstand EIGENS AUFGEFÜHRT — nie
 *   stillschweigend unter "grün" verbucht.
 *
 * WARUM ES KEINE NAMENSLISTE FÜHRT
 * -----------------------------------------------------------------------------
 * Dieses Site Package darf keine einzelne Geräte-Extension namentlich kennen
 * — mehrere Prüfskripte des Hauses weisen genau das nach. Dieses Werkzeug
 * folgt derselben Lösung: es FINDET jedes
 * typo3conf/ext/<beliebig>/Resources/Private/Scripts/verify-*.mjs über ein
 * Namensmuster, statt eine feste Liste zu pflegen, und liest die Eigenschaften
 * jedes gefundenen Skripts aus dessen EIGENEM Kopf (eine Zeile, beginnend mit
 * "@pruefstand"). Damit prüft es eine elfte Extension von selbst mit und muss
 * für eine künftige Phase nicht angefasst werden.
 *
 * EIN SKRIPT OHNE DIESE KOPFZEILE IST KEIN FEHLER. Es gelten dann die
 * eingebauten Vorgaben (VORGABE, unten) — ein solches Skript wird ganz normal
 * mitgefahren, nur im Schlussstand als "ohne @pruefstand-Kopfzeile" gezählt,
 * damit sichtbar bleibt, was noch nicht selbstbeschreibend ist.
 *
 * WAS ES GRUNDSÄTZLICH NICHT SEHEN KANN
 * -----------------------------------------------------------------------------
 *   - Ob eine Zusage das Richtige misst. Es liest Ausgaben, es bewertet sie
 *     nicht.
 *   - Ob die Anwendung nach der ersten Runde noch atmet. Das sieht nur eine
 *     Live-Probe mit echten Browsern (die eigenen probe-*.mjs-Werkzeuge).
 *   - Ob ein Skript existiert, das fehlen würde. Es findet, was da ist.
 *
 * WARUM DAS KINDPROZESS-STDIN AUSDRÜCKLICH GESCHLOSSEN WIRD
 * -----------------------------------------------------------------------------
 * Dieselbe Fallenart wie bei einer Shell-Schleife, die ihre Dateiliste über
 * eine Pipe liest und darin selbst wieder einen Unterprozess aufruft, der vom
 * selben Eingabestrom liest: der Unterprozess kann dem äußeren Lauf die
 * Eingabe wegnehmen. Jeder hier gestartete Unterprozess bekommt deshalb
 * ausdrücklich stdio: ['ignore', 'pipe', 'pipe'] — sein Eingabestrom ist von
 * Anfang an geschlossen, nicht nur unbenutzt.
 *
 * Aufruf
 * -----------------------------------------------------------------------------
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/pruefstand.mjs \
 *        [--lang] [--nur=<muster>] [--liste] [--lobby-leeren] [--json=<pfad>]
 *
 *   (keiner)        alle kurzen Skripte, die zum GEMESSENEN QR-Schalterstand passen
 *   --lang          nimmt zusätzlich die als laufzeit=lang gekennzeichneten
 *                    Skripte mit (lange Stichprobenläufe über viele Durchgänge)
 *   --nur=<muster>  nur Pfade, die <muster> enthalten, z. B. --nur=account
 *   --liste         führt NICHTS aus, gibt nur die Tafel der gefundenen
 *                    Skripte samt gelesener Eigenschaften aus
 *   --lobby-leeren  leert vor jedem isolation=lobby-Skript die drei
 *                    Lobby-Tabellen; ohne diesen Schalter wird nur geprüft
 *                    und bei Bedarf blockiert (siehe lobbyLeer())
 *   --json=<pfad>   schreibt das Ergebnis zusätzlich maschinenlesbar
 *
 * Der Rückgabewert ist 0 NUR, wenn: kein unerwartetes Rot, keine Blockade und
 * keine unerklärte Lücke — eine Lücke ist dabei NUR, was ein Skript selbst
 * mit der Marke @pruefstand:luecke meldet (siehe LUECKE_MARKE weiter unten),
 * nicht jede Zeile mit dem Wort "übersprungen". Eine Lücke gilt als erklärt,
 * wenn ihr Text den gemessenen QR-Schalterstand nennt, ODER wenn die
 * Kopfzeile des Skripts abgeschrieben-block trägt — alles andere muss ein
 * Mensch ansehen. Das ist die einzige Stelle, an der dieses Werkzeug
 * strenger ist als der bisherige Bestand, und der eigentliche Grund, es zu
 * bauen.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_startpage/ */
const EXT = resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = resolve(EXT, '..');
/** Projektstamm — zwei Ebenen über typo3conf/ext/. */
const WURZEL = resolve(EXT_ROOT, '../..');

/** Dieselbe, im Haus durchgängig benutzte Adresse (siehe z. B. verify-gate.mjs, WEG1_BASIS). */
const BASIS = 'https://casino-kunterbunt.ddev.site';

/* ============================================================ 1 · Entdeckung */

/**
 * Findet jedes typo3conf/ext/<beliebig>/Resources/Private/Scripts/verify-*.mjs.
 * KEINE Namensliste: eine weitere Extension wird von selbst mitgeprüft, und
 * das Site Package lernt dabei keinen Gerätenamen (Kopplungszusage).
 * @returns {Promise<string[]>} absolute Pfade, alphabetisch
 */
async function finde() {
	const treffer = [];
	for (const eintrag of await readdir(EXT_ROOT, { withFileTypes: true })) {
		if (!eintrag.isDirectory()) {
			continue;
		}
		const ordner = resolve(EXT_ROOT, eintrag.name, 'Resources/Private/Scripts');
		let dateien = [];
		try {
			dateien = await readdir(ordner);
		} catch {
			continue;
		}
		for (const datei of dateien) {
			if (datei.startsWith('verify-') && datei.endsWith('.mjs')) {
				treffer.push(resolve(ordner, datei));
			}
		}
	}
	return treffer.sort();
}

/* ==================================================== 2 · Die Kopfzeile lesen */

/** Voreinstellung für ein Skript ohne @pruefstand-Zeile. */
const VORGABE = {
	modus: 'egal', laufzeit: 'kurz', isolation: 'keine', arg: '',
	bekanntRot: '', abgeschrieben: '', abgeschriebenBlock: '',
};

/**
 * Die sechs bekannten Schlüssel. bekannt-rot, abgeschrieben und
 * abgeschrieben-block nehmen den REST der Zeile als Wert.
 *
 * abgeschrieben-block UNTERSCHEIDET SICH von abgeschrieben: abgeschrieben
 * lässt das ganze Skript gar nicht erst starten (siehe Hauptlauf). Ein
 * einzelnes Skript kann aber teils gültige, teils gegenstandslose Blöcke
 * haben (Block A prüft Quelltext, bleibt gültig; Block B braucht eine
 * laufende Adresse, ist bei einer abgeschriebenen Extension gegenstandslos)
 * — abgeschrieben=… für das ganze Skript wäre hier zu grob, es schaltete
 * auch die weiterhin gültigen Prüfungen ab. abgeschrieben-block lässt das
 * Skript normal laufen und erklärt nur seine @pruefstand:luecke-Marken.
 */
const SCHLUESSEL_KURZ = ['modus', 'laufzeit', 'isolation', 'arg'];
const SCHLUESSEL_RESTZEILE = ['bekannt-rot', 'abgeschrieben', 'abgeschrieben-block'];
const ERLAUBT = {
	modus: ['aus', 'an', 'egal'],
	laufzeit: ['kurz', 'mittel', 'lang'],
	isolation: ['keine', 'lobby'],
};

/**
 * Liest die Zeile   // @pruefstand modus=an laufzeit=lang isolation=lobby arg=… bekannt-rot=…
 * aus den ersten 8 KB der Datei. Unbekannte Schlüssel werden GEMELDET, nicht
 * verschluckt — ein Tippfehler in der Kopfzeile darf nicht still zur Vorgabe
 * zurückfallen (dieselbe Falle wie eine übersprungene Prüfung).
 *
 * bekannt-rot, abgeschrieben und abgeschrieben-block stehen laut Vereinbarung
 * als LETZTER Schlüssel auf der Zeile und nehmen den Rest der Zeile als Wert
 * (ihr Text braucht Leerzeichen und Doppelpunkte). Von den dreien darf immer
 * nur EINER gesetzt sein.
 *
 * @param {string} pfad
 * @returns {Promise<{modus:string,laufzeit:string,isolation:string,arg:string,
 *   bekanntRot:string,abgeschrieben:string,abgeschriebenBlock:string,
 *   kopfzeileGefunden:boolean,warnungen:string[]}>}
 */
async function eigenschaften(pfad) {
	const inhalt = await readFile(pfad, 'utf8');
	const kopf = inhalt.slice(0, 8192);
	const zeile = kopf.split('\n').find((z) => z.includes('@pruefstand'));
	const ergebnis = { ...VORGABE, kopfzeileGefunden: false, warnungen: [] };
	if (!zeile) {
		return ergebnis;
	}
	ergebnis.kopfzeileGefunden = true;

	let rest = zeile.slice(zeile.indexOf('@pruefstand') + '@pruefstand'.length).trim();

	// ABSICHTLICHE REIHENFOLGE: "abgeschrieben-block=" muss VOR "abgeschrieben="
	// geprüft werden. "abgeschrieben-block=" enthält die Zeichenkette
	// "abgeschrieben=" zwar nicht (es folgt "-block=", kein "="), trotzdem
	// bleibt die Prüfreihenfolge hier bewusst so herum, damit ein künftiger
	// dritter, ähnlich benannter Schlüssel nicht wieder in dieselbe Falle
	// laufen kann.
	for (const schluessel of ['abgeschrieben-block', 'bekannt-rot', 'abgeschrieben']) {
		const marke = `${schluessel}=`;
		const stelle = rest.indexOf(marke);
		if (stelle === -1) {
			continue;
		}
		const feld = { 'bekannt-rot': 'bekanntRot', abgeschrieben: 'abgeschrieben', 'abgeschrieben-block': 'abgeschriebenBlock' }[schluessel];
		ergebnis[feld] = rest.slice(stelle + marke.length).trim();
		rest = rest.slice(0, stelle).trim();
	}
	const gesetzt = ['bekanntRot', 'abgeschrieben', 'abgeschriebenBlock'].filter((f) => ergebnis[f]);
	if (gesetzt.length > 1) {
		ergebnis.warnungen.push(`mehrere von bekannt-rot/abgeschrieben/abgeschrieben-block gleichzeitig gesetzt (${gesetzt.join(', ')}) — nur eins ist gültig`);
	}

	if (rest !== '') {
		for (const teil of rest.split(/\s+/)) {
			const gleich = teil.indexOf('=');
			if (gleich === -1) {
				ergebnis.warnungen.push(`unlesbares Feld in der Kopfzeile: "${teil}"`);
				continue;
			}
			const schluessel = teil.slice(0, gleich);
			const wert = teil.slice(gleich + 1);
			if (!SCHLUESSEL_KURZ.includes(schluessel)) {
				ergebnis.warnungen.push(`unbekannter Schlüssel in der Kopfzeile: "${schluessel}"`);
				continue;
			}
			if (ERLAUBT[schluessel] && !ERLAUBT[schluessel].includes(wert)) {
				ergebnis.warnungen.push(`unerlaubter Wert für ${schluessel}: "${wert}" (erlaubt: ${ERLAUBT[schluessel].join('/')})`);
				continue;
			}
			ergebnis[schluessel] = wert;
		}
	}
	return ergebnis;
}

/* ================================================ 3 · Drei Zahlen, nicht eine */

/**
 * DIE LÜCKEN-MARKE — eine abgesprochene Marke statt einer Wortsuche.
 *
 * Die erste Fassung suchte jede Zeile nach dem Wort "übersprungen" ab. Am
 * lebenden Objekt gefunden (2026-09-11): mehrere Prüftexte BESTÄTIGEN
 * gerade, dass nichts übersprungen wurde ("sein Zeitgeber ist gelöscht,
 * nicht nur übersprungen"; "keine Überschriftenstufe wird übersprungen") —
 * die Wortsuche meldete dort eine Lücke, wo keine war. Ein Werkzeug mit
 * falschen Warnungen wird nach ein paar Tagen ignoriert, und dann ist die
 * echte Lücke wieder unsichtbar. Deshalb jetzt eine MARKE, keine Wortsuche:
 *
 *   @pruefstand:luecke <Begründung>
 *
 * Die drei geforderten Eigenschaften:
 *   - EINDEUTIG: "@pruefstand:luecke" kommt in einem gewöhnlichen Prüftext
 *     nicht zufällig vor — dieselbe Überlegung wie bei der Kopfzeile selbst,
 *     die denselben Namensraum "@pruefstand" benutzt.
 *   - AM ZEILENANFANG erkennbar (nach optionalem Leerraum), nicht irgendwo
 *     im Satz — RegExp mit ^-Anker, nicht test() über die ganze Zeile.
 *   - NACHRÜSTBAR: ein Skript, das die Marke noch nicht benutzt, zeigt
 *     deshalb schlicht KEINE Lücke — nie einen Fehler. Vorerst tragen sie
 *     nur die Fundstellen, an denen tatsächlich etwas ungeprüft bleibt
 *     (casino_account/verify-booking.mjs, die beiden verify-cabinet.mjs mit
 *     Block B) — jede weitere Extension rüstet nach, sobald sie eine
 *     eigene, wirkliche Lücke hat.
 */
const LUECKE_MARKE = /^\s*@pruefstand:luecke\b\s*(.*)$/;

/**
 * @param {string} ausgabe  stdout+stderr des Skripts
 * @param {number} rueckgabe Rückgabewert
 * @returns {{zusagen:number, fehler:number, luecken:string[], abbruch:boolean, ergebnis:string}}
 */
function auswerten(ausgabe, rueckgabe) {
	const zeilen = ausgabe.split('\n');
	// GROSS-/KLEINSCHREIBUNG: am lebenden Objekt geprüft (2026-09-11) — fünf
	// Skripte in casino_startpage (u. a. verify-account-backend.mjs) schreiben
	// "  ok  " klein, nicht "  OK  " groß. Ohne /i zählten sie 0 Zusagen, obwohl
	// sie tatsächlich liefen — genau die Art stiller Lücke, die dieses
	// Werkzeug aufdecken soll, diesmal im Werkzeug selbst gefunden.
	const zusagen = zeilen.filter((z) => /(^|\s)✓|^\s{2,}OK\s/i.test(z)).length;
	const fehler = zeilen.filter((z) => /(^|\s)✗|^\s{2,}FEHLER\s/i.test(z)).length;
	const luecken = zeilen
		.map((z) => LUECKE_MARKE.exec(z))
		.filter((m) => m !== null)
		.map((m) => m[1].trim());
	const ergebnis = zeilen.filter((z) => z.startsWith('ERGEBNIS')).at(-1) ?? '(keine ERGEBNIS-Zeile)';
	const abbruch = /ERGEBNIS:\s*Abbruch/.test(ergebnis);
	return { zusagen, fehler, luecken, abbruch, ergebnis };
}

/**
 * Ordnet einer Lücke ihre Erklärung zu, oder null, wenn sie UNERKLÄRT bleibt.
 * Zwei Wege zu einer Erklärung:
 *   1. Der Text der Marke selbst nennt den Schalterstand (die Skripte
 *      schreiben das bewusst so, siehe die drei nachgerüsteten Stellen).
 *   2. Die Kopfzeile des Skripts trägt abgeschrieben-block — dann ist JEDE
 *      Lücke dieses Skripts durch diese eine Begründung erklärt, unabhängig
 *      von ihrem Text (siehe eigenschaften(), Schlüssel abgeschrieben-block).
 * @param {string} text
 * @param {{abgeschriebenBlock:string}} eig
 * @returns {string|null}
 */
function lueckeErklaerung(text, eig) {
	if (eig.abgeschriebenBlock) {
		return `abgeschrieben-block: ${eig.abgeschriebenBlock}`;
	}
	if (/modus|schalterstand/i.test(text)) {
		return 'Schalterstand';
	}
	return null;
}

/* =============================================== 4 · Isolation je Prüfblock */

/**
 * Ein rot geendetes Lobby-Prüfskript lässt eine Lobby stehen, und der NÄCHSTE
 * Lauf scheitert an seiner Vorbedingung und sieht aus wie ein neuer Fehler.
 *
 * @param {boolean} leeren true = mit --lobby-leeren wirklich löschen
 * @returns {{leer:boolean, stand:string}}
 */
function lobbyLeer(leeren) {
	const zaehle = (t) => Number(execFileSync('mysql', ['-N', '-e', `SELECT COUNT(*) FROM ${t};`], { encoding: 'utf8' }).trim());
	const TABELLEN = ['tx_casinolobby_lobby', 'tx_casinolobby_seat', 'tx_casinolobby_bet'];
	const stand = Object.fromEntries(TABELLEN.map((t) => [t, zaehle(t)]));
	const summe = TABELLEN.reduce((s, t) => s + stand[t], 0);
	if (summe === 0) {
		return { leer: true, stand: '0/0/0' };
	}
	const gelesenerStand = TABELLEN.map((t) => stand[t]).join('/');
	if (!leeren) {
		return { leer: false, stand: gelesenerStand };
	}
	// Reihenfolge: Einsätze, Plätze, Lobbys — die Fremdschlüssel-Richtung.
	for (const t of [...TABELLEN].reverse()) {
		execFileSync('mysql', ['-e', `DELETE FROM ${t};`]);
	}
	return { leer: true, stand: `${gelesenerStand} (geleert)` };
}

/* ============================================== 5 · QR-Schalterstand messen */

/**
 * Misst den QR-Schalterstand — REIN LESEND, legt ihn nie um (derselbe Weg wie
 * in verify-gate.mjs & Co.).
 * @returns {boolean}
 */
function qrModusMessen() {
	let ausgabe;
	try {
		ausgabe = execFileSync(
			'mysql',
			['-e', "SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
			{ encoding: 'utf8' },
		);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Abfrage des QR-Schalterstands schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const zeile = (ausgabe.split('\n')[1] ?? '').trim();
	return zeile === 'b:1;';
}

/* =========================================== 6 · Ein Skript starten */

/**
 * Startet ein einzelnes Prüfskript mit `node …` — stdin des Kindprozesses
 * wird AUSDRÜCKLICH geschlossen (siehe Kopfkommentar).
 *
 * WICHTIG: pruefstand.mjs selbst läuft bereits INNERHALB des DDEV-Containers
 * (der Aufruf lautet `ddev exec node pruefstand.mjs`). Ein erneutes `ddev
 * exec` von hier aus geht NICHT gegen den Container, sondern gegen den im
 * Container mitgelieferten ddev-Platzhalterbefehl — der meldet nur einen
 * Hinweis und endet still mit 0, OHNE das Kindskript je zu starten (am
 * lebenden Objekt gefunden: alle Läufe kamen mit 0 Zusagen und 0,0 s zurück,
 * obwohl derselbe Aufruf von Hand normal lief). Hier wird deshalb direkt
 * `node` aufgerufen, ohne `ddev exec` davor.
 * @param {string} pfad absoluter Pfad des Skripts
 * @param {string|undefined} argument optionales Zusatzargument (z. B. eine Adresse)
 * @returns {Promise<{ausgabe:string, rueckgabe:number}>}
 */
function starteSkript(pfad, argument) {
	return new Promise((erledigt) => {
		const argumente = [relative(WURZEL, pfad)];
		if (argument) {
			argumente.push(argument);
		}
		const kind = spawn('node', argumente, {
			cwd: WURZEL,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let ausgabe = '';
		kind.stdout.on('data', (stueck) => { ausgabe += stueck.toString('utf8'); });
		kind.stderr.on('data', (stueck) => { ausgabe += stueck.toString('utf8'); });
		kind.on('close', (code) => erledigt({ ausgabe, rueckgabe: code ?? 1 }));
		kind.on('error', (fehlerObjekt) => erledigt({ ausgabe: ausgabe + `\n[Startfehler: ${fehlerObjekt.message}]`, rueckgabe: 1 }));
	});
}

function zeitstempel() {
	const d = new Date();
	const zwei = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())} ${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/* ========================================================= 7 · Hauptlauf */

const ARGV = process.argv.slice(2);
const langFlag = ARGV.includes('--lang');
const listeFlag = ARGV.includes('--liste');
const lobbyLeerenFlag = ARGV.includes('--lobby-leeren');
const nurTreffer = ARGV.find((a) => a.startsWith('--nur='));
const nurMuster = nurTreffer ? nurTreffer.slice('--nur='.length) : null;
const jsonTreffer = ARGV.find((a) => a.startsWith('--json='));
const jsonPfad = jsonTreffer ? jsonTreffer.slice('--json='.length) : null;

const qrModusAn = qrModusMessen();

const gefundenePfade = (await finde()).filter((p) => !nurMuster || relative(EXT_ROOT, p).includes(nurMuster));

const gefunden = [];
for (const pfad of gefundenePfade) {
	gefunden.push({ pfad, kurz: relative(EXT_ROOT, pfad), eig: await eigenschaften(pfad) });
}

console.log(`\nPRÜFSTAND CASINO KUNTERBUNT — ${zeitstempel()} — QR-Modus: ${qrModusAn ? 'AN' : 'AUS'}`);
console.log('='.repeat(69));

if (listeFlag) {
	console.log(`\n${gefunden.length} gefundene Prüfskripte (verify-*.mjs), unter typo3conf/ext/:\n`);
	for (const g of gefunden) {
		const e = g.eig;
		const teile = [`modus=${e.modus}`, `laufzeit=${e.laufzeit}`, `isolation=${e.isolation}`];
		if (e.arg) { teile.push(`arg=${e.arg}`); }
		if (e.bekanntRot) { teile.push('bekannt-rot=…'); }
		if (e.abgeschrieben) { teile.push('abgeschrieben=…'); }
		if (e.abgeschriebenBlock) { teile.push('abgeschrieben-block=…'); }
		if (!e.kopfzeileGefunden) { teile.push('(ohne @pruefstand-Kopfzeile, Vorgabe angenommen)'); }
		console.log(`  ${g.kurz}`);
		console.log(`      ${teile.join(' ')}`);
		for (const w of e.warnungen) {
			console.log(`      WARNUNG: ${w}`);
		}
	}
	process.exit(0);
}

const ergebnisse = [];
for (const g of gefunden) {
	const { pfad, kurz, eig } = g;

	if (eig.warnungen.length > 0) {
		console.log(`  ⚠ ${kurz}: ${eig.warnungen.join('; ')}`);
	}

	if (eig.modus !== 'egal' && (eig.modus === 'an') !== qrModusAn) {
		ergebnisse.push({ kurz, eig, zustand: 'AUSGELASSEN (Schalter)' });
		console.log(`  ⏸ ${kurz} — ausgelassen (braucht Modus ${eig.modus}, gemessen ${qrModusAn ? 'AN' : 'AUS'})`);
		continue;
	}
	if (eig.abgeschrieben) {
		ergebnisse.push({ kurz, eig, zustand: 'ABGESCHRIEBEN' });
		console.log(`  ⚐ ${kurz} — abgeschrieben: ${eig.abgeschrieben}`);
		continue;
	}
	if (eig.laufzeit === 'lang' && !langFlag) {
		ergebnisse.push({ kurz, eig, zustand: 'NICHT GEFAHREN (lang, ohne --lang)' });
		console.log(`  ⏭ ${kurz} — nicht gefahren (laufzeit=lang, ohne --lang)`);
		continue;
	}
	if (eig.isolation === 'lobby') {
		const stand = lobbyLeer(lobbyLeerenFlag);
		if (!stand.leer) {
			ergebnisse.push({ kurz, eig, zustand: `BLOCKIERT (Vorbedingung: Lobby-Tabellen nicht leer, ${stand.stand}; mit --lobby-leeren fahren)` });
			console.log(`  ⛔ ${kurz} — blockiert: Lobby-Tabellen nicht leer (${stand.stand})`);
			continue;
		}
	}

	const argument = eig.arg ? eig.arg.replace('{basis}', BASIS) : undefined;
	const begonnen = Date.now();
	const { ausgabe, rueckgabe } = await starteSkript(pfad, argument);
	const dauer = ((Date.now() - begonnen) / 1000).toFixed(1);
	const auswertung = auswerten(ausgabe, rueckgabe);
	const istFehlerhaft = auswertung.fehler > 0 || rueckgabe !== 0 || auswertung.abbruch;

	if (istFehlerhaft && eig.bekanntRot) {
		ergebnisse.push({ kurz, eig, ...auswertung, rueckgabe, dauer, zustand: 'BEKANNT ROT' });
		console.log(`  ⚑ ${kurz} — bekannt rot (${dauer}s): ${eig.bekanntRot}`);
	} else if (istFehlerhaft) {
		ergebnisse.push({ kurz, eig, ausgabe, ...auswertung, rueckgabe, dauer, zustand: 'ROT' });
		console.log(`  ✗ ${kurz} — ${auswertung.fehler} Fehler, ${auswertung.zusagen} Zusagen (${dauer}s)`);
	} else if (!istFehlerhaft && eig.bekanntRot) {
		ergebnisse.push({ kurz, eig, ...auswertung, rueckgabe, dauer, zustand: 'GRÜN (bekannt-rot-Vermerk vermutlich veraltet)' });
		console.log(`  ✓ ${kurz} — jetzt GRÜN, obwohl als bekannt-rot vermerkt: ${eig.bekanntRot}`);
	} else if (auswertung.luecken.length > 0) {
		ergebnisse.push({ kurz, eig, ...auswertung, rueckgabe, dauer, zustand: 'GRÜN MIT LÜCKE' });
		console.log(`  ! ${kurz} — grün MIT ${auswertung.luecken.length} Lücke(n) (${dauer}s)`);
	} else {
		ergebnisse.push({ kurz, eig, ...auswertung, rueckgabe, dauer, zustand: 'GRÜN' });
		console.log(`  ✓ ${kurz} — ${auswertung.zusagen} Zusagen (${dauer}s)`);
	}
}

/* ========================================================== 8 · Schlusstafel */

const zaehlung = {
	gruen: ergebnisse.filter((e) => e.zustand === 'GRÜN').length,
	rot: ergebnisse.filter((e) => e.zustand === 'ROT').length,
	gruenMitLuecke: ergebnisse.filter((e) => e.zustand === 'GRÜN MIT LÜCKE').length,
	ausgelassen: ergebnisse.filter((e) => e.zustand === 'AUSGELASSEN (Schalter)').length,
	nichtGefahren: ergebnisse.filter((e) => e.zustand.startsWith('NICHT GEFAHREN')).length,
	blockiert: ergebnisse.filter((e) => e.zustand.startsWith('BLOCKIERT')).length,
	bekanntRot: ergebnisse.filter((e) => e.zustand === 'BEKANNT ROT').length,
	abgeschrieben: ergebnisse.filter((e) => e.zustand === 'ABGESCHRIEBEN').length,
	jetztGruenTrotzVermerk: ergebnisse.filter((e) => e.zustand.startsWith('GRÜN (bekannt-rot')).length,
	ohneKopfzeile: ergebnisse.filter((e) => !e.eig.kopfzeileGefunden).length,
};

const alleLuecken = ergebnisse
	.filter((e) => e.zustand === 'GRÜN MIT LÜCKE')
	.flatMap((e) => e.luecken.map((text) => ({ kurz: e.kurz, text, erklaerung: lueckeErklaerung(text, e.eig) })));
const unerklaerteLuecken = alleLuecken.filter((l) => l.erklaerung === null);

console.log(`\nPRÜFSTAND CASINO KUNTERBUNT — ${zeitstempel()} — QR-Modus: ${qrModusAn ? 'AN' : 'AUS'}`);
console.log('='.repeat(69));
console.log('');
console.log(`  ✓ grün                                                       ${zaehlung.gruen}`);
console.log(`  ✗ rot                                                         ${zaehlung.rot}`);
console.log(`  ! grün MIT LÜCKE                                              ${zaehlung.gruenMitLuecke}`);
console.log(`  ⏸ ausgelassen (Schalter)                                      ${zaehlung.ausgelassen}`);
console.log(`  ⏭ nicht gefahren (lang, ohne --lang)                          ${zaehlung.nichtGefahren}`);
console.log(`  ⛔ blockiert (Vorbedingung)                                    ${zaehlung.blockiert}`);
console.log(`  ⚑ bekannt rot (zählt nicht in den Rückgabewert)               ${zaehlung.bekanntRot}`);
console.log(`  ⚐ abgeschrieben (zählt nicht in den Rückgabewert)             ${zaehlung.abgeschrieben}`);
console.log(`                                                          -------`);
console.log(`                                                              ${ergebnisse.length}`);
if (zaehlung.ohneKopfzeile > 0) {
	console.log(`\n  (${zaehlung.ohneKopfzeile} Skript(e) ohne @pruefstand-Kopfzeile, mit Vorgabe gefahren)`);
}
if (zaehlung.jetztGruenTrotzVermerk > 0) {
	console.log(`\n  (${zaehlung.jetztGruenTrotzVermerk} als bekannt-rot vermerkte(s) Skript(e) ist/sind jetzt grün — Vermerk prüfen)`);
}

if (alleLuecken.length > 0) {
	console.log(`\nDIE ${alleLuecken.length} LÜCKE(N), EINZELN — jede ist eine Zusage, die NICHT gemessen wurde:`);
	for (const l of alleLuecken) {
		console.log(`  ${l.kurz}${l.erklaerung !== null ? ` (erklärt: ${l.erklaerung})` : ' (UNERKLÄRT)'}`);
		console.log(`      „${l.text}"`);
	}
}

const rotListe = ergebnisse.filter((e) => e.zustand === 'ROT');
if (rotListe.length > 0) {
	console.log(`\nDIE ${rotListe.length} ROTEN:`);
	for (const e of rotListe) {
		console.log(`  ${e.kurz} — ${e.ergebnis}`);
	}
}

const bekanntRotListe = ergebnisse.filter((e) => e.zustand === 'BEKANNT ROT');
if (bekanntRotListe.length > 0) {
	console.log(`\nDIE ${bekanntRotListe.length} BEKANNT ROTEN:`);
	for (const e of bekanntRotListe) {
		console.log(`  ${e.kurz} — ${e.eig.bekanntRot}`);
	}
}

const abgeschriebenListe = ergebnisse.filter((e) => e.zustand === 'ABGESCHRIEBEN');
if (abgeschriebenListe.length > 0) {
	console.log(`\nDIE ${abgeschriebenListe.length} ABGESCHRIEBENEN:`);
	for (const e of abgeschriebenListe) {
		console.log(`  ${e.kurz} — ${e.eig.abgeschrieben}`);
	}
}

const blockiertListe = ergebnisse.filter((e) => e.zustand.startsWith('BLOCKIERT'));
if (blockiertListe.length > 0) {
	console.log(`\nDIE ${blockiertListe.length} BLOCKIERTEN:`);
	for (const e of blockiertListe) {
		console.log(`  ${e.kurz} — ${e.zustand}`);
	}
}

const exitCode = (zaehlung.rot > 0 || zaehlung.blockiert > 0 || unerklaerteLuecken.length > 0) ? 1 : 0;
console.log(`\nERGEBNIS: ${zaehlung.rot} unerwartete Fehler, ${unerklaerteLuecken.length} unerklärte von ${alleLuecken.length} Lücke(n), ${zaehlung.blockiert} blockiert.`);
console.log(exitCode === 0
	? 'Der Reihenlauf endet mit 0.'
	: 'Der Reihenlauf endet mit 1, solange ein unerwartetes Rot, eine Blockade oder eine unerklärte Lücke offen ist.');

if (jsonPfad) {
	await writeFile(jsonPfad, JSON.stringify({ zeitpunkt: zeitstempel(), qrModusAn, zaehlung, ergebnisse, unerklaerteLuecken }, null, 2), 'utf8');
	console.log(`\n(Ergebnis zusätzlich geschrieben nach ${jsonPfad})`);
}

process.exit(exitCode);
