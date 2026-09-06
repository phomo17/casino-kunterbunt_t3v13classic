/**
 * FruitRisk – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)
 * ======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * -----------------------
 *   A-1  Keine eigene Farbe (Ausnahme: die beiden Backend-Icons)
 *   A-2  Jeder benutzte --ck-Token existiert in casino_startpage/tokens.css
 *   A-3  Keine Datei von außen; kein createElementNS in JavaScript
 *   A-4  Trennung: casino_startpage koppelt sich nicht an dieses Gerät —
 *        geprüft im CODE, nicht in Kommentaren (dieselbe Begründung wie G-9)
 *   A-5  Kein fremder Hersteller-, Modell- oder Spieltitel (Negativliste)
 *   A-6  Die Lizenzangaben widersprechen sich nicht
 *   A-7  Die acht übernommenen Symbole sind zeichengleich zum Original, und
 *        alle zwölf Paare fr-sym-X/fr-mini-X sind zeichengleich zueinander
 *   A-8  Der Gehäuse-Vertrag der Saal-Miniatur
 *   A-9  Das Kürzel-Präfix "fr-" wird eingehalten
 *   A-10 Die Anmeldung bei der Registry stimmt
 *   A-11 Das grosse Gehäuse, sein Maßraster und seine use-Verweise
 *   A-12 Barrierefreiheit: Live-Bereiche, Überschrift, Verbergen
 *   A-13 Keine Abhängigkeit auf ein anderes Gerät
 *   A-14 Miniatur und großes Gehäuse zeigen dasselbe (Zonenkatalog, Symbolfolge)
 *   A-15 Genau zwölf Symbole, kein BAR-Block, kein Scatter
 *   A-16 Jedes Bedienteil hat einen eigenen, nicht leeren Namen
 *   A-17 Der Leuchtzustand der Risiko-Tasten kennt keinen Übergang
 *   A-18 Die Risiko-Lampen leuchten bernstein, weit unter der Blitzschwelle
 *   A-19 Der Haken-Katalog im Kopf von machine.css deckt sich mit dem Regelteil
 *   A-20 Die Koordinatentabelle ist vollständig
 *   A-21 Der Gewinnplan druckt keine Zahl AUS DEM MARKUP
 *   A-22 Die vier neuen Motive sind formstark und tokenrein
 *   A-23 Jedes Symbol aus Rules::SYMBOLS ist gezeichnet
 *   A-24 Der Gewinnplan bleibt im Papierrahmen der Koordinatentabelle
 *   A-25 Das Walzenwerk: Bandlänge, Fenster und Gewinnlinien
 *   A-26 Geldreihe, Tafel und die Grenze der vier Live-Bereiche
 *   A-27 Der feste Einsatz steht nur einmal geschrieben (Rules::STAKE)
 *   A-29 Die Frequenzgrenze (3 Hz) gilt auch für das Einladungsblinken (H4)
 *   A-30 Kontrast (SC 1.4.3): rechnet für jede Tastenbeschriftung den
 *        Kontrast gegen JEDEN benannten Farbstopp ihres Untergrunds nach —
 *        statisch aus tokens.css und machine.css, ohne Browser
 *        (Behebungslauf 2026-09-05, N-01). Deckt START und CASH OUT ab
 *        (beide behoben); meldet für STOP, AUTO MODE, REWARD, TON und die
 *        Aufladeknöpfe einen rechnerischen Fund am jeweils ungünstigsten
 *        Stopp, der in diesem Lauf NICHT behoben wurde (siehe Bericht)
 *
 * STAND F4-Behebungslauf (REVIEW-fruitrisk-f4.md [M6]): A-27 ist neu und
 * bindet den festen Einsatz — bislang an drei Stellen ausgeschrieben
 * (locallang.xlf, die EINSATZ-Röhren, der Schnellwert-Knopf +10) — an
 * Rules::STAKE zurück.
 *
 * STAND F2: Das Gehäuse ist fertig gezeichnet und beschriftet, aber
 * unbedient — kein Verhalten, kein Spielkern, kein Geld, keine Leiter, kein
 * Klang. Diese Prüfungen sind hier neu (A-14 bis A-22) oder erweitert
 * (A-7, A-11, A-12, siehe die jeweiligen Abschnitte unten).
 *
 * STAND F3: A-21 wird SCHÄRFER, nicht schwächer — seit der Gewinnplan aus
 * Classes/Rules.php gedruckt wird (CabinetProcessor), darf im MARKUP
 * überhaupt keine Ziffer mehr stehen, auch die Spaltenköpfe 3/4/5/6 nicht.
 * A-11 zählt die zwölf use-Verweise des Gewinnplans deshalb nicht mehr mit
 * (sie zeigen jetzt auf das dynamische #fr-sym-{row.symbol}); an ihre Stelle
 * tritt die neue A-23, die den Zeichenvorrat direkt an Rules::SYMBOLS bindet.
 *
 * STAND F4a (Teilstück „Das Sichtfeld wird ein Walzenwerk"): Grid.html baut
 * aus dreißig festen Zellen sechs Bänder zu je 40 Zellen (Rules::STRIPS über
 * den CabinetProcessor). A-11 und A-14 ändern dadurch ihre GRUNDLAGE, nicht
 * ihre AUSSAGE (siehe die jeweiligen Abschnitte unten); A-19 zählt zwei neue
 * Katalogeinträge (.fr-payline--win, --fr-reel-pos); A-25 ist neu und prüft
 * das Walzenwerk selbst (Bandlänge, Fenster, Gewinnlinien-Overlay). Die
 * Zählung „A-24 wächst auf dreizehn Katalogeinträge" aus dem F4-Plan setzt
 * einen freien Platz für „A-24" voraus, den es hier nicht gibt (A-24 ist seit
 * F3 „Der Gewinnplan bleibt im Papierrahmen") — die neue Walzenwerk-Prüfung
 * heißt deshalb A-25, und A-19 zählt nur die beiden Haken, die dieses
 * Teilstück tatsächlich einführt (siehe DECISIONS.md).
 *
 * STAND F4b (Teilstück „Sockel, Tafel und Sprache"): Machine/Cabinet.html
 * bekommt die Tafel, den Münzschlitz mit den drei Schnellwerten und dem Feld
 * für den freien Betrag, das Kassenfenster und CASH OUT; Machine/Button.html
 * bekommt das Argument disabled für die neun in dieser Phase noch
 * wirkungslosen Tasten. A-19 zählt fünf neue Katalogeinträge
 * (.fr-message--shown, .fr-cashout--lit, .fr-coinslot__coin--drop,
 * .fr-coinslot__slot--flash, .fr-machine--duplicate); A-20 bekommt zwei neue
 * Abschnitts-Zonen (8 → „Geldeinbauten im Sockel", 9 → „Fenster", weil die
 * Tafel im Fenster-Block der Koordinatentabelle mitgeführt wird); A-26 ist
 * neu und prüft die Geldreihe, die Tafel und die Grenze der vier
 * Live-Bereiche — dieselbe Prüfnummer, die die F4a-Entscheidung
 * (DECISIONS.md) für dieses Teilstück bereits vorgesehen hat.
 *
 * STAND F5b (Teilstück „die drei Tastengruppen"): die acht Risiko-Tasten
 * sind verdrahtet (risk.js) und rufen Machine/Button.html ohne disabled: 1
 * mehr auf; AUTO MODE bleibt BEWUSST unverändert gesperrt (disabled: 1) —
 * das nimmt erst eine künftige Phase F5c zurück. A-19 zählt einen neuen
 * Katalogeintrag (.fr-btn--invite, Abschnitt 6); A-26 dreht die Erwartung an
 * die gesperrten/freien Bedienteile um (nur noch "auto" ist gesperrt, elf
 * sind frei) und prüft zusätzlich die drei neuen Satzmuster des Live-
 * Bereichs „risk".
 *
 * STAND F5c (Teilstück „der Auto-Modus"): AUTO MODE ist verdrahtet
 * (auto.js) und ruft Machine/Button.html jetzt mit toggle: 1 statt
 * disabled: 1 auf — kein Bedienteil dieses Geräts reicht disabled noch
 * durch. A-19 bekommt KEINEN neuen Katalogeintrag: der Auto-Modus
 * verwendet ausschließlich die bereits gezählte Klasse .fr-btn--lit, keine
 * eigene. A-26 dreht die Erwartung an die gesperrten/freien Bedienteile ein
 * zweites Mal um (kein Bedienteil mehr gesperrt, alle zwölf frei) und prüft
 * zusätzlich, dass AUTO MODE mit toggle: 1 aufgerufen wird.
 *
 * BEHEBUNGSLAUF 2026-09-05 (AUDITREPORT-2026-09-05.md, Befund N-05): die
 * acht Risiko-Tasten rufen Machine/Button.html WIEDER mit disabled: 1 auf.
 * "Kein Bedienteil reicht disabled noch durch" (Absatz oben) galt nur bis zu
 * diesem Behebungslauf: ohne das Argument lieferte Machine/Button.html
 * aria-disabled="false" aus, obwohl beim Laden nie ein Angebot besteht — ein
 * Hilfsmittel las im ersten Moment das Gegenteil des geltenden Zustands. Die
 * Erwartung an die gesperrten/freien Bedienteile dreht sich damit ein
 * drittes Mal um: gesperrt sind jetzt genau die acht Risiko-Tasten, frei
 * sind START, STOP, AUTO MODE und REWARD.
 *
 * STAND „Starttaste je Gruppe": jede der drei Risikogruppen bekommt unter
 * ihrer Tastenzeile eine eigene, beschriftete Starttaste (risk-start,
 * risk4-start, risk8-start, Bauform "tab"). A-16 und A-26 zählen jetzt
 * fünfzehn Aufrufe von Machine/Button.html statt zwölf, elf davon gesperrt
 * (die acht Richtungstasten UND die drei Starttasten) statt acht; A-19 nimmt
 * .fr-btn--tab in die Ausnahmeliste der Bauform-Klassen auf (bezeichnet
 * keinen Zustand); A-30 benennt die drei Starttasten jetzt ausdrücklich,
 * statt sie stillschweigend über dieselbe Namensschild-Regel wie
 * START/STOP/AUTO MODE/REWARD mitzudecken. Acht der fünfzehn Bedienteile
 * bleiben runde Kappen ohne Aufschrift, sieben tragen sichtbaren Text. Die
 * drei gedruckten Gruppenbeschriftungen entfallen dafür — ihr Text steht
 * jetzt auf der Kappe der jeweiligen Starttaste.
 *
 * WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN
 * ----------------------------------------------
 * Dieselbe Begründung wie bei G-9 in casino_startpage/…/verify-gattung.mjs:
 * ein Wortabgleich über Kommentare könnte „nennt die Extension" und „nennt
 * das Spiel" nicht mehr unterscheiden. Der eigene Extension-Schlüssel wird
 * aus path.basename(EXT) ABGELEITET, nicht eingetragen — dieselbe Bauart wie
 * die GERAETE_EXTENSIONS-Ermittlung im Site Package.
 *
 * NICHT betroffen ist A-5: die Negativliste fremder Marken läuft weiterhin
 * über JEDE Zeile, Kommentare eingeschlossen — das ist die rechtliche
 * Prüfung (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und wird nicht angetastet.
 *
 * WARUM A-5 KOMMENTARE MITLIEST UND A-4 NICHT
 * ---------------------------------------------
 * Zwei verschiedene Fragen, zwei verschiedene Reichweiten. A-4 ist eine
 * Architekturfrage — koppelt sich casino_startpage an dieses Gerät? —, und
 * eine Kopplung lebt im CODE (Pfad, Bezeichner, CSS-Klasse, data-Attribut),
 * nie in einem erklärenden Kommentar. A-5 dagegen ist die rechtliche Prüfung:
 * Ein öffentliches Repository liefert die Quelldateien vollständig mit aus,
 * Kommentare eingeschlossen — der Unterschied zwischen Kommentar und
 * sichtbarem Text verschwindet damit für V.7 Nr. 5. A-5 liest deshalb den
 * vollen Text jeder geprüften Datei, ohne Kommentare herauszuschneiden.
 *
 * WARUM A-7 DIE QUELL-EXTENSION BEIM NAMEN NENNEN DARF, A-13 ABER NICHT
 * ------------------------------------------------------------------------
 * A-7 liegt unter Resources/Private/Scripts und gehört damit nicht zur
 * ausgelieferten Menge (AUSGELIEFERT) — sie erzeugt zur Laufzeit keine
 * Kopplung. A-13 verbietet jede Nennung eines Nachbargeräts im ausgelieferten
 * Code; das ist der maschinelle Nachweis von CONCEPT.md C.14.3/C.14.15
 * ("Nur casino_startpage").
 *
 * WARUM A-5 AB PHASE F2 AUCH DIESE DATEI SELBST PRÜFT
 * -----------------------------------------------------
 * Bis Phase F1 war diese Datei komplett von A-5 ausgenommen, weil sie die
 * Negativliste als ausführbares JS-Array wörtlich enthalten muss. Das nahm
 * damit auch jeden erklärenden Kommentar dieser Datei aus der Prüfung heraus
 * — ein verbotener Name, der hier in einen neuen Kommentar geriete, wäre
 * nie aufgefallen. Ausgenommen ist jetzt nur noch der eine Bereich zwischen
 * "const NEGATIVLISTE = [" und der zugehörigen schließenden Klammer; der
 * Rest der Datei, Kommentare eingeschlossen, wird mitgeprüft.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/fruit_risk/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');
/** Der eigene Extension-Schlüssel, ABGELEITET aus dem Verzeichnisnamen. */
const EIGENER_SCHLUESSEL = path.basename(EXT);
/** diese Datei selbst, für die Ausnahme in A-5 */
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

/**
 * Liest eine `public const NAME = [ INDEX => ['a', …], … ];`-Konstante aus
 * Classes/Rules.php als TEXT — kein PHP, kein Unterprozess. Dieselbe Bauart
 * wie Resources/Private/Scripts/verify-payout.mjs (dort: extractIndexedStringLists()).
 */
function leseIndexierteStringlisten(rulesQuelltext, name) {
	const block = new RegExp(`public const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`).exec(rulesQuelltext)?.[1] ?? '';
	const ergebnis = [];
	for (const m of block.matchAll(/(\d+)\s*=>\s*\[([^\]]*)\]/g)) {
		ergebnis[Number(m[1])] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
	}
	return ergebnis;
}

/** Liest eine `public const NAME = [ 0, 0, … ];`-Konstante als Zahlenliste. */
function leseIntliste(rulesQuelltext, name) {
	const block = new RegExp(`public const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`).exec(rulesQuelltext)?.[1] ?? '';
	return [...block.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
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

/** Entfernt alle <f:comment>-Blöcke. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt zusätzlich PHP/CSS/JS-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return ohneKommentare(inhalt).replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Ersetzt einen Fund durch ebenso viele Zeilenumbrüche, damit Zeilennummern
 * stimmen bleiben (dieselbe Bauart wie in verify-gattung.mjs G-9).
 */
function alsLeerzeilen(text) {
	return text.replace(/[^\n]/g, '');
}

/** Schneidet ALLE Kommentararten heraus: <f:comment>, Blockkommentare, //. */
function ohneAlleKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, alsLeerzeilen)
		.replace(/\/\*[\s\S]*?\*\//g, alsLeerzeilen)
		.replace(/\/\/.*$/gm, '');
}

/**
 * Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren. Prüfskripte,
 * README und LICENSE stehen bewusst nicht darin — reiner Fließtext bzw.
 * GPL-Boilerplate, wird nie ins Frontend gerendert (wortgleiche Ausnahme wie
 * bei den vorhandenen Geräten).
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentFruitRisk.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

console.log('\nFruitRisk – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)');
console.log('======================================================================\n');

/* ============================================================= A-1 Farben */

console.log('A-1  Keine eigene Farbe');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS) {
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(HEX)) {
			treffer.push(`${kurz(datei)}: ${m[0]}`);
		}
		for (const m of inhalt.matchAll(FUNKTION)) {
			treffer.push(`${kurz(datei)}: ${m[0]}…`);
		}
	}
	check(treffer.length === 0,
		`kein ausgeschriebener Farbwert in ${OHNE_ICONS.length} Dateien`
		+ ' (die beiden Backend-Icons sind ausgenommen: sie stehen außerhalb'
		+ ' des Frontend-Dokuments und können keine Custom Properties benutzen)',
		...treffer);
}

/* ============================================================= A-2 Tokens */

console.log('\nA-2  Alle benutzten Design-Tokens existieren');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Map();
	for (const datei of OHNE_ICONS) {
		for (const m of lies(datei).matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], kurz(datei));
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in casino_startpage/…/tokens.css definiert`
		+ ` (dort stehen ${definiert.size})`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
}

/* =========================================== A-3 Keine Datei von außen */

console.log('\nA-3  Keine Datei von außen; kein createElementNS in JavaScript');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		const istIcon = ICONS.includes(rel);
		for (const zeile of lies(datei).split('\n')) {
			const gesaeubert = zeile
				.replace(/url\(#[^)]*\)/g, '')
				.replace(/href="#[^"]*"/g, '');
			const rest = istIcon
				? gesaeubert.replace('http://www.w3.org/2000/svg', '')
				: gesaeubert;
			for (const muster of [/@import/, /url\(/, /src=/, /https?:\/\//, /<img\b/, /@font-face/]) {
				if (muster.test(rest)) {
					treffer.push(`${kurz(datei)}: ${zeile.trim().slice(0, 110)}`);
					break;
				}
			}
		}
	}
	check(treffer.length === 0,
		'kein @import, kein url(…) auf eine Datei, kein src=, keine http-Adresse,'
		+ ' kein <img>, kein @font-face',
		...treffer);

	const jsTreffer = [];
	for (const datei of AUSGELIEFERT) {
		if (!datei.endsWith('.js')) {
			continue;
		}
		if (ohneBlockKommentare(lies(datei)).includes('createElementNS')) {
			jsTreffer.push(kurz(datei));
		}
	}
	check(jsTreffer.length === 0,
		'kein createElementNS in einer JavaScript-Datei — wo SVG aus JavaScript'
		+ ' entstehen müsste, wäre innerHTML der richtige Weg; in dieser'
		+ ' Extension entsteht überhaupt kein SVG aus JavaScript',
		...jsTreffer);
}

/* ============================================================ A-4 Trennung */

console.log(`\nA-4  casino_startpage kennt "${EIGENER_SCHLUESSEL}" nicht (im Code)`);
{
	const roh = EIGENER_SCHLUESSEL;
	const kuerzel = roh.length <= 8 ? roh.slice(0, 2) : roh.split('_').map((t) => t.charAt(0)).join('');
	const NAMEN = [
		new RegExp(roh, 'i'),
		new RegExp(roh.replace(/_/g, '-'), 'i'),
		new RegExp(roh.replace(/_/g, ''), 'i'),
		new RegExp(roh.replace(/_/g, ' '), 'i'),
		new RegExp(roh.charAt(0).toUpperCase() + roh.slice(1)),
	];
	const PRAEFIX = new RegExp(`(^|[^-a-z])${kuerzel}-[a-z]`);
	const treffer = [];
	for (const datei of alleDateien(SITE)) {
		const zeilen = ohneAlleKommentare(lies(datei)).split('\n');
		zeilen.forEach((zeile, n) => {
			if (NAMEN.some((m) => m.test(zeile)) || PRAEFIX.test(zeile)) {
				treffer.push(`${kurz(datei)}:${n + 1}: ${zeile.trim().slice(0, 110)}`);
			}
		});
	}
	check(treffer.length === 0,
		`keine einzige Nennung des Geräts und kein ${kuerzel}-Präfix im CODE`
		+ ' des Site Packages (Kommentare dürfen das Spiel benennen, sie'
		+ ' koppeln nichts — CONCEPT.md C.2: allgemeine Spielnamen)',
		...treffer);
}

/* ========================================= A-5 Kein fremder Name */

console.log('\nA-5  Kein fremder Hersteller-, Modell- oder Spieltitel');
{
	const NEGATIVLISTE = [
		// Spielautomatenhersteller und Spieltitel (CONCEPT.md B.3 Nr. 4)
		'Novomatic', 'Novomatix', 'Greentube', 'Merkur', 'Gauselmann', 'Bally',
		'Aristocrat', 'IGT', 'Mills', 'Jennings', 'Watling', 'Light & Wonder',
		'Bell-Fruit', 'Sizzling Hot', 'Book of Ra', 'Book of Sand',
		"Lucky Lady's Charm", 'Penny Falls',
		// Rad- und Tischhersteller sowie deren Modell-/Bauteilnamen
		// (Befund B-2 der Copyright-Prüfung vom 2026-09-04)
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
		// Recherche zu diesem Gerät (CONCEPT.md C.14.18). Sie erscheinen nirgends
		// — nicht in sichtbarem Text, nicht in Dateinamen, nicht in CSS-Klassen,
		// nicht in Kommentaren, nicht in Variablennamen. Erfasst sind neben der
		// Marken-Schreibweise auch Klein-, GROSS- und Bindestrich-Schreibweisen,
		// wie ein Name realistisch in einer CSS-Klasse, einem Bezeichner oder
		// einem Kommentar auftauchen würde (Befund C-2 der Copyright-Prüfung vom
		// 2026-09-06; gemessen statt vermutet — keine der Varianten löst einen
		// Fehlalarm im vorhandenen Bestand aus, siehe DECISIONS.md).
		'Megaways', 'MEGAWAYS', 'megaways',
		'Cluster Pays', 'CLUSTER PAYS', 'cluster pays', 'ClusterPays', 'clusterPays', 'cluster-pays',
		'InfiniReels', 'INFINIREELS', 'infinireels', 'Infini Reels', 'infini-reels',
		'Tumbling Reels', 'TUMBLING REELS', 'tumbling reels', 'TumblingReels', 'tumblingReels', 'tumbling-reels',
	];
	const ALLE = alleDateien(EXT);
	/*
	 * Enger gefasste Ausnahme (STAND F2, Nebenbefund aus der F1-Prüfung):
	 * übersprungen wird nur noch der eine Bereich zwischen
	 * "const NEGATIVLISTE = [" und der zugehörigen schließenden "];" in dieser
	 * Datei selbst — er muss die Liste als ausführbares JS-Array wörtlich
	 * enthalten, um überhaupt gegen sie prüfen zu können (dieselbe Art
	 * Ausnahme wie in verify-gattung.mjs G-7). Der Rest dieser Datei,
	 * Kommentare eingeschlossen, wird jetzt mitgeprüft.
	 */
	function ohneEigeneListe(inhalt, pfad) {
		if (pfad !== DIESE_DATEI) {
			return inhalt;
		}
		// Das Suchmuster braucht den Zeilenumbruch direkt nach der öffnenden
		// eckigen Klammer: der erklärende Kommentarabsatz weiter oben in dieser
		// Datei zitiert dieselbe Zeichenkette in Anführungszeichen, gefolgt von
		// Fließtext auf derselben Zeile statt von einem Zeilenumbruch — ohne
		// dieses Unterscheidungsmerkmal fände indexOf() das Zitat statt der
		// wirklichen Deklaration.
		const start = inhalt.indexOf('const NEGATIVLISTE = [\n');
		const ende = inhalt.indexOf('\t];', start);
		let ergebnis = inhalt;
		if (start !== -1 && ende !== -1) {
			ergebnis = inhalt.slice(0, start) + alsLeerzeilen(inhalt.slice(start, ende + 3)) + inhalt.slice(ende + 3);
		}
		// Dieselbe Ausnahme gilt für die drei Zeichen ©/™/®: auch sie muss diese
		// Datei wörtlich enthalten (als Prüf-Array und in der Ausgabetext), um
		// überhaupt gegen sie prüfen zu können. Ein Ersetzen unabhängig von der
		// Position ist hier zulässig, weil diese drei Zeichen sonst nirgends in
		// dieser Datei vorkommen.
		return ergebnis.replace(/[©™®]/g, '·');
	}
	const treffer = [];
	for (const datei of ALLE) {
		// KEIN Kommentar-Ausschnitt hier: A-5 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — anders als A-4, die eine reine
		// Architekturfrage prueft (siehe Kopfkommentar dieser Datei oben).
		const inhalt = ohneEigeneListe(lies(datei), datei);
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
		+ ' (Ausnahme: die NEGATIVLISTE-Programmzeile dieser Datei selbst; ihr'
		+ ' Kopfkommentar und der Rest der Datei werden mitgeprüft)',
		...treffer);
}

/* ====================================== A-6 Widerspruchsfreie Lizenzangaben */

console.log('\nA-6  Die Lizenzangaben widersprechen sich nicht');
{
	const LIZENZ = 'AGPL-3.0-or-later';
	const AUTOR = 'Phomo17';
	const EMAIL = 'phomo17@users.noreply.github.com';

	const license = lies(path.join(EXT, 'LICENSE'));
	const composer = JSON.parse(lies(path.join(EXT, 'composer.json')));
	const emconf = lies(path.join(EXT, 'ext_emconf.php'));

	check(license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'),
		'LICENSE ist die AGPL-Fassung');
	check(composer.license === LIZENZ, `composer.json nennt ${LIZENZ} (gefunden: ${composer.license})`);
	check(emconf.includes(`'license' => '${LIZENZ}'`), `ext_emconf.php nennt ${LIZENZ}`);

	check(composer.authors?.[0]?.name === AUTOR && composer.authors?.[0]?.email === EMAIL,
		`composer.json nennt Autor ${AUTOR} und die E-Mail aus CONCEPT.md C.14.3`);
	check(emconf.includes(`'author' => '${AUTOR}'`) && emconf.includes(`'author_email' => '${EMAIL}'`),
		`ext_emconf.php nennt Autor ${AUTOR} und dieselbe E-Mail`);

	// README.md entsteht erst in Teilstück F1d. Bis dahin wird sie hier
	// übersprungen statt fälschlich als Fehler gemeldet.
	const readmePfad = path.join(EXT, 'README.md');
	if (existsSync(readmePfad)) {
		check(lies(readmePfad).includes(LIZENZ), `README.md nennt ${LIZENZ}`);
	} else {
		console.log('  · README.md übersprungen — entsteht erst in Teilstück F1d');
	}
}

/* ============================ A-7 Die acht übernommenen Symbole */

console.log('\nA-7  Die acht übernommenen Symbole sind zeichengleich zum Original,'
	+ ' und alle zwölf Paare fr-sym-X/fr-mini-X stimmen überein');
{
	const MOTIVE = ['kirsche', 'zitrone', 'orange', 'melone',
		'glocke', 'sieben', 'pflaume', 'weintraube'];
	const ALLE_MOTIVE = ['ananas', 'apfel', 'banane', 'erdbeere', 'glocke',
		'kirsche', 'melone', 'orange', 'pflaume', 'sieben', 'weintraube', 'zitrone'];
	const miniEigen = lies(path.join(EXT,
		'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html'));
	const symEigen = lies(path.join(EXT,
		'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));

	// Ein <symbol> mit gegebener id herausschneiden und auf eine Zeile
	// normalisieren, damit Einrückung und Zeilenumbrüche nicht zählen.
	const schnitt = (inhalt, id) => {
		const treffer = new RegExp(
			`<symbol\\s+id="${id}"[\\s\\S]*?<\\/symbol>`
		).exec(inhalt);
		return treffer === null ? null : treffer[0].replace(/\s+/g, ' ').trim();
	};

	/*
	 * Teil (a): die acht übernommenen Symbole gegen das Original des
	 * vorhandenen Fünf-Walzen-Geräts — sowohl in der Saal-Miniatur
	 * (fr-mini-X gegen vs-mini-X) als auch im großen Gehäuse
	 * (fr-sym-X gegen vs-sym-X, STAND F2 neu).
	 */
	const QUELLE_MINI = path.join(EXT_ROOT, 'video_slot',
		'Resources/Private/Partials/Automat/VideoSlot/Cabinet.html');
	const QUELLE_SYM = path.join(EXT_ROOT, 'video_slot',
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Shell.html');
	if (!existsSync(QUELLE_MINI) || !existsSync(QUELLE_SYM)) {
		console.log('  · Teil (a) übersprungen — die Quell-Extension ist nicht'
			+ ' installiert. Das ist KEIN Fehler: diese Extension hängt zur'
			+ ' Laufzeit an keiner anderen (CONCEPT.md C.14.3), die Kopie ist'
			+ ' vollständig. Nur der Abgleich gegen das Original lässt sich'
			+ ' dann nicht führen.');
	} else {
		const fremdMini = lies(QUELLE_MINI);
		const fremdSym = lies(QUELLE_SYM);
		for (const motiv of MOTIVE) {
			const meins = schnitt(miniEigen, `fr-mini-${motiv}`);
			const original = schnitt(fremdMini, `vs-mini-${motiv}`);
			if (meins === null || original === null) {
				check(false, `Miniatur ${motiv}: beide Definitionen vorhanden`,
					meins === null ? 'fr-mini-… fehlt' : 'Original fehlt');
				continue;
			}
			// Der einzige erlaubte Unterschied ist das ID-Präfix.
			check(meins === original.replace(`id="vs-mini-${motiv}"`, `id="fr-mini-${motiv}"`),
				`Miniatur ${motiv}: zeichengleich, geändert ist nur die id`);
		}
		for (const motiv of MOTIVE) {
			const meins = schnitt(symEigen, `fr-sym-${motiv}`);
			const original = schnitt(fremdSym, `vs-sym-${motiv}`);
			if (meins === null || original === null) {
				check(false, `Gehäuse ${motiv}: beide Definitionen vorhanden`,
					meins === null ? 'fr-sym-… fehlt' : 'Original fehlt');
				continue;
			}
			check(meins === original.replace(`id="vs-sym-${motiv}"`, `id="fr-sym-${motiv}"`),
				`Gehäuse ${motiv}: zeichengleich, geändert ist nur die id`);
		}
	}
	check(!miniEigen.includes('scatter') && !symEigen.includes('scatter'),
		'kein Scatter-Symbol übernommen (CONCEPT.md C.14.6)');

	/*
	 * Teil (b), STAND F2 neu: alle zwölf Paare fr-sym-X (großes Gehäuse) und
	 * fr-mini-X (Saal-Miniatur) sind UNTEREINANDER zeichengleich — das sichert
	 * auch die vier neuen Motive gegen ein Auseinanderlaufen der beiden
	 * Zeichnungen ab, unabhängig davon, ob video_slot installiert ist.
	 */
	for (const motiv of ALLE_MOTIVE) {
		const gross = schnitt(symEigen, `fr-sym-${motiv}`);
		const mini = schnitt(miniEigen, `fr-mini-${motiv}`);
		if (gross === null || mini === null) {
			check(false, `${motiv}: beide Definitionen (fr-sym-…/fr-mini-…) vorhanden`,
				gross === null ? 'fr-sym-… fehlt' : 'fr-mini-… fehlt');
			continue;
		}
		check(gross.replace(`id="fr-sym-${motiv}"`, '') === mini.replace(`id="fr-mini-${motiv}"`, ''),
			`${motiv}: fr-sym-… und fr-mini-… sind zeichengleich zueinander`);
	}
}

/* ==================================================== A-8 Gehäuse-Vertrag */

console.log('\nA-8  Der Gehäuse-Vertrag der Saal-Miniatur');
{
	const rel = 'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html';
	const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

	const spans = [...inhalt.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spans.length === 1, `${rel}: genau ein span.ck-cabinet (gefunden: ${spans.length})`);

	const svgs = [...inhalt.matchAll(/<svg\b[^>]*\bclass="ck-cabinet__drawing"[^>]*>/g)];
	check(svgs.length === 1, `${rel}: genau ein svg.ck-cabinet__drawing (gefunden: ${svgs.length})`);

	if (svgs.length === 1) {
		const tag = svgs[0][0];
		check(tag.includes('viewBox="0 0 100 160"'), `${rel}: viewBox="0 0 100 160" (Gattung Automat, hochkant)`);
		check(tag.includes('aria-hidden="true"'), `${rel}: aria-hidden="true"`);
		check(tag.includes('focusable="false"'), `${rel}: focusable="false"`);
	}

	check(!inhalt.includes('<title>'), `${rel}: kein <title>`);
}

/* ======================================================== A-9 Kürzel-Präfix */

console.log('\nA-9  Das Kürzel-Präfix "fr-" wird eingehalten');
{
	/*
	 * Geteilte Haken aus casino_startpage, die absichtlich KEIN fr-Präfix
	 * tragen. Dieses Gerät benutzt keine Tisch-Bausteine, deshalb ist die
	 * Menge kleiner als bei den Tisch-Extensions.
	 */
	const GETEILT = new Set(['ck-room-fill']);
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|css|js)$/.test(rel)) {
			continue;
		}
		const inhalt = ohneKommentare(lies(datei));
		for (const m of inhalt.matchAll(/\bclass="([^"]*)"/g)) {
			for (const klasse of m[1].split(/\s+/).filter(Boolean)) {
				// ck-* sind die geteilten Vertragsklassen (ck-cabinet,
				// ck-cabinet__drawing, ck-room-fill …) — erlaubt wie jeder
				// andere geteilte Haken, kein Fund.
				const erlaubt = klasse.startsWith('fr-') || klasse.startsWith('ck-') || GETEILT.has(klasse);
				if (!erlaubt) {
					treffer.push(`${kurz(datei)}: class="${klasse}"`);
				}
			}
		}
		for (const m of inhalt.matchAll(/\b(id|data-[a-z-]+)="([^"]*)"/g)) {
			const attr = m[1];
			const wert = m[2];
			if (attr === 'id') {
				// L5 (Review): vorher ein blindes continue mit der Begründung,
				// ids trügen "hier bereits" das eigene Präfix — das ist eine
				// Annahme, keine Prüfung. Beide id-Welten (fr-sym-…,
				// fr-mini-…) beginnen mit fr-, genau wie jede Klasse.
				if (!wert.startsWith('fr-')) {
					treffer.push(`${kurz(datei)}: id="${wert}"`);
				}
				continue;
			}
			if (!attr.startsWith('data-fr-') && !GETEILT.has(attr)) {
				treffer.push(`${kurz(datei)}: ${attr}="${wert}"`);
			}
		}
	}
	check(treffer.length === 0,
		'jede eigene CSS-Klasse, jedes eigene data-Attribut beginnt mit fr-'
		+ ' oder ist einer der ausdrücklich geteilten Haken',
		...treffer);
}

/* =========================================== A-10 Anmeldung bei der Registry */

console.log('\nA-10 Die Anmeldung bei der Registry stimmt');
{
	const localconf = lies(path.join(EXT, 'ext_localconf.php'));
	check(/AutomatRegistry::register\s*\(/.test(localconf),
		'ext_localconf.php ruft AutomatRegistry::register() auf');
	check(!/gattung\s*:/.test(localconf),
		'die Anmeldung nennt KEINE Gattung — der Vorgabewert Gattung::Automat ist hier der richtige');
	check(!/identifier:\s*'fruit_risk'/.test(localconf) && /FruitRisk::IDENTIFIER/.test(localconf),
		'der Schlüssel kommt aus FruitRisk::IDENTIFIER, nicht als ausgeschriebene Zeichenkette');
	check(/FruitRisk::LANG_FRONTEND/.test(localconf) && /FruitRisk::EXTENSION_KEY/.test(localconf)
		&& /FruitRisk::CABINET_PARTIAL/.test(localconf),
		'title, extensionKey und cabinetPartial kommen ebenfalls aus FruitRisk::…');
	// STAND F3: der Gewinnplan wird jetzt vorgerechnet, deshalb dreht sich die
	// Aussage um — ohneBlockKommentare(), damit der erklärende Kommentar über
	// die frühere Ausbaustufe (siehe dort, Abschnitt 2) das Ergebnis nicht
	// verfälscht, dieselbe Art Unterscheidung wie zwischen A-4 (Code) und
	// A-5 (voller Text) oben.
	const ohneKomm = ohneBlockKommentare(localconf);
	check(/addTypoScriptSetup\s*\(/.test(localconf)
		&& /dataProcessing\s*\{/.test(ohneKomm)
		&& /10\s*=\s*fruit-risk-cabinet/.test(ohneKomm)
		&& /10\.as\s*=\s*machine/.test(ohneKomm),
		'das Rendering wird über addTypoScriptSetup() angemeldet, MIT dem'
		+ ' DataProcessor fruit-risk-cabinet, der Rules::PAYTABLE vorrechnet'
		+ ' (Phase F3)');
}

/* ============================== A-11 Das grosse Gehäuse und sein Maßraster */

console.log('\nA-11 Das grosse Gehäuse, sein Maßraster und seine use-Verweise');
{
	const shellPfad = path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html');
	const gridPfad = path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Grid.html');
	const shell = lies(shellPfad);
	const grid = lies(gridPfad);
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	check((shell.match(/viewBox="0 0 160 160"/g) ?? []).length === 1,
		'Shell.html: genau ein viewBox="0 0 160 160" (CONCEPT.md C.14.4)');
	check(/aria-hidden="true"/.test(shell) && /focusable="false"/.test(shell),
		'Shell.html: die Zeichnung ist aria-hidden und nicht fokussierbar');
	check(/--fr-u:\s*0\.625cqi/.test(css),
		'machine.css legt eine viewBox-Einheit genau einmal fest (--fr-u: 0.625cqi)');
	check(/aspect-ratio:\s*1\s*\/\s*1/.test(css),
		'machine.css: .fr-cabinet ist quadratisch — cqi und cqb rechnen gleich');
	check(/container:\s*fr-cabinet\s*\/\s*size/.test(css),
		'machine.css: .fr-cabinet ist ein Container-Query-Container mit Größenbezug');

	/*
	 * STAND F2 neu, in der F1-Prüfung als Aufgabe für F2 vermerkt: jeder
	 * use-Verweis auf ein fr-sym-… zeigt auf eine wirklich definierte id
	 * (kein toter Verweis), und die beiden Präfix-Welten fr-sym-… (großes
	 * Gehäuse) und fr-mini-… (Saal-Miniatur) mischen sich nirgends — ein
	 * use in Shell.html/Grid.html zeigt nie auf ein fr-mini-…, und die
	 * Miniatur zeigt nie auf ein fr-sym-….
	 */
	/*
	 * STAND F4a: Grid.html tippt keine dreissig festen use-Verweise mehr ab —
	 * es erzeugt sie ZUR LAUFZEIT aus {reel.cells}, sechs Baender zu je
	 * vierzig Zellen, macht 240 use-Elemente im gerenderten HTML. Im
	 * QUELLTEXT (der hier gelesen wird) steht dieser Verweis dagegen nur
	 * EINMAL, als Platzhalter href="#fr-sym-{cell.symbol}" innerhalb der
	 * f:for-Schleife — eine Zaehlung "30 → 240" ist an dieser Datei nicht
	 * mehr moeglich, weil ein Quelltext-Scan nicht sieht, wie oft eine
	 * Schleife beim Rendern LAEUFT, nur wie oft sie im Text STEHT.
	 *
	 * Geprueft wird deshalb zweigeteilt: (a) der Platzhalter steht genau
	 * einmal und bindet an {cell.symbol}; (b) fuer jeden Wert, den
	 * {cell.symbol} laut Rules::SYMBOLS annehmen kann, ist in Shell.html eine
	 * <symbol id="fr-sym-…"> definiert — das prueft A-23 bereits vollstaendig
	 * und wird hier nicht verdoppelt. Der alte, literale Tot-Verweis-Scan
	 * bleibt zusaetzlich stehen (er findet seit F4a naturgemaess null
	 * Treffer in Grid.html, faengt aber weiterhin jeden literalen
	 * fr-sym-…-Verweis andernorts ab, z. B. in Shell.html).
	 */
	const gridSymbolPlatzhalter = [...grid.matchAll(/href="#fr-sym-\{cell\.symbol\}"/g)];
	check(gridSymbolPlatzhalter.length === 1,
		'Grid.html: genau ein Platzhalter href="#fr-sym-{cell.symbol}" in der Zellschleife'
		+ ` (gefunden: ${gridSymbolPlatzhalter.length}) — er erzeugt beim Rendern 6 × 40 = 240`
		+ ' use-Elemente, eines je Bandzelle; dass jeder mögliche Wert von {cell.symbol} eine'
		+ ' definierte id trifft, prüft A-23');

	const definierteSymIds = new Set(
		[...shell.matchAll(/<symbol\s+id="(fr-sym-[a-z]+)"/g)].map((m) => m[1]));
	const verweiseSym = [
		...shell.matchAll(/<use\s+href="#(fr-sym-[a-z]+)"/g),
		...grid.matchAll(/<use\s+href="#(fr-sym-[a-z]+)"/g),
	].map((m) => m[1]);
	const toteVerweise = verweiseSym.filter((id) => !definierteSymIds.has(id));
	check(toteVerweise.length === 0,
		`${verweiseSym.length} literale use-Verweise auf fr-sym-… außerhalb der Zellschleife`
		+ ' (Shell.html/Grid.html), alle zeigen auf eine in Shell.html definierte id',
		...[...new Set(toteVerweise)].map((id) => `toter Verweis: #${id}`));

	const fremdPraefixInGross = [
		...shell.matchAll(/href="#(fr-mini-[a-z]+)"/g),
		...grid.matchAll(/href="#(fr-mini-[a-z]+)"/g),
	].map((m) => m[1]);
	check(fremdPraefixInGross.length === 0,
		'kein use-Verweis im großen Gehäuse zeigt auf ein fr-mini-… der Saal-Miniatur',
		...fremdPraefixInGross);

	const miniPfad = path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html');
	const fremdPraefixInMini = [...lies(miniPfad).matchAll(/href="#(fr-sym-[a-z]+)"/g)].map((m) => m[1]);
	check(fremdPraefixInMini.length === 0,
		'kein use-Verweis der Saal-Miniatur zeigt auf ein fr-sym-… des großen Gehäuses',
		...fremdPraefixInMini);
}

/* ============ A-12 Barrierefreiheit: Live-Bereiche, Überschrift, Verbergen */

console.log('\nA-12 Barrierefreiheit: Live-Bereiche, Überschrift, Verbergen');
{
	const rel = 'Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html';
	const cab = ohneKommentare(lies(path.join(EXT, rel)));

	const bereiche = [...cab.matchAll(/<p\b[^>]*role="status"[^>]*>([\s\S]*?)<\/p>/g)];
	check(bereiche.length === 4,
		`${rel}: genau vier Live-Bereiche (gefunden: ${bereiche.length})`);
	check(bereiche.every((m) => m[1].trim() === ''),
		'alle Live-Bereiche werden LEER ausgeliefert — ein Bereich, den ein Skript'
		+ ' anlegt UND füllt, wird von Hilfsmitteln nicht angesagt');

	const namen = [...cab.matchAll(/data-fr-announce="([a-z]+)"/g)].map((m) => m[1]).sort();
	check(namen.join(',') === 'credit,grid,machine,risk',
		`jeder Live-Bereich trägt eine eigene Kennung (gefunden: ${namen.join(', ')})`);

	const mitH1 = AUSGELIEFERT.filter((d) => /<h1\b/.test(lies(d)));
	check(mitH1.length === 0,
		'keine Datei dieser Extension gibt eine h1 aus — die einzige Überschrift'
		+ ' der Seite liefert das Site Package aus dem Seitentitel (CONCEPT.md C.14.12)',
		...mitH1.map(kurz));

	const css = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/machine.css')));
	check(!/display:\s*none/.test(css) && !/visibility:\s*hidden/.test(css),
		'machine.css verbirgt nichts über display oder visibility — beide nähmen'
		+ ' einen Live-Bereich aus dem Barrierebaum');
	check(/\.fr-offscreen[\s\S]*?clip-path:\s*inset\(50%\)/.test(css),
		'.fr-offscreen verbirgt über clip-path');
	check(/\.fr-cabinet\s+:focus-visible/.test(css),
		'es gibt genau eine Regel für den sichtbaren Fokusrahmen des ganzen Gehäuses');

	/*
	 * STAND F2 neu: „vier, und danach fest" (CONCEPT.md C.14.12) wird zur
	 * Prüfung statt zur Absicht. In KEINER ausgelieferten Datei steht ein
	 * weiteres role="status" außerhalb der vier aus Machine/Cabinet.html, und
	 * kein aria-live kommt irgendwo vor — auch nicht in den neuen Partials
	 * Grid.html, NixieGroup.html, NixieTube.html und Button.html.
	 */
	let rollenGesamt = 0;
	const ariaLiveTreffer = [];
	for (const datei of AUSGELIEFERT) {
		// ohneBlockKommentare(), nicht nur ohneKommentare(): machine.css nennt
		// role="status" auch in einem CSS-Blockkommentar (/* … */), der von
		// <f:comment> allein nicht erfasst würde.
		const ohneKomm = ohneBlockKommentare(lies(datei));
		rollenGesamt += (ohneKomm.match(/role="status"/g) ?? []).length;
		if (/aria-live/.test(ohneKomm)) {
			ariaLiveTreffer.push(kurz(datei));
		}
	}
	check(rollenGesamt === 4,
		`genau vier role="status" in der ganzen Extension (gefunden: ${rollenGesamt})`);
	check(ariaLiveTreffer.length === 0,
		'kein aria-live in einer ausgelieferten Datei', ...ariaLiveTreffer);
}

/* ==================================== A-13 Keine Abhängigkeit auf ein anderes Gerät */

console.log('\nA-13 Keine Abhängigkeit auf ein anderes Gerät');
{
	// Die Nachbargeräte werden aus dem Dateisystem ERMITTELT, nicht
	// eingetragen — dieselbe Bauart wie GERAETE_EXTENSIONS im Site Package.
	// Ein fünftes Gerät wird damit von selbst mitgeprüft.
	const NACHBARN = readdirSync(EXT_ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.filter((name) => name !== EIGENER_SCHLUESSEL && name !== 'casino_startpage'
			&& existsSync(path.join(EXT_ROOT, name, 'ext_localconf.php')))
		.sort();
	const muster = NACHBARN.flatMap((name) => {
		const teile = name.split('_');
		const kurzform = teile.length === 1 ? teile[0].slice(0, 2) : teile.map((t) => t.charAt(0)).join('');
		return [
			new RegExp(teile.join('_'), 'i'),
			new RegExp(`@phomo17/${teile.join('-')}/`, 'i'),
			new RegExp(`(^|[^-a-z])${kurzform}-[a-z]`),
		];
	});
	const treffer = [];
	// AUSGELIEFERT schliesst Resources/Private/Scripts aus — genau deshalb
	// darf A-7 oben die Quell-Extension beim Namen nennen, ohne hier
	// aufzuschlagen. Ein Prüfskript wird nicht ausgeliefert und koppelt zur
	// Laufzeit nichts.
	for (const datei of AUSGELIEFERT) {
		ohneAlleKommentare(lies(datei)).split('\n').forEach((zeile, n) => {
			if (muster.some((m) => m.test(zeile))) {
				treffer.push(`${kurz(datei)}:${n + 1}: ${zeile.trim().slice(0, 110)}`);
			}
		});
	}
	check(treffer.length === 0,
		`keine der ${NACHBARN.length} Nachbar-Extensions wird im ausgelieferten Code`
		+ ' genannt; die einzige Abhängigkeit ist casino_startpage', ...treffer);

	const emconf = lies(path.join(EXT, 'ext_emconf.php'));
	const composer = JSON.parse(lies(path.join(EXT, 'composer.json')));
	check(NACHBARN.every((name) => !emconf.includes(`'${name}'`)),
		'ext_emconf.php verlangt kein anderes Gerät');
	check(Object.keys(composer.require).every((p) => !/^phomo17\/(?!casino-startpage)/.test(p)),
		'composer.json verlangt kein anderes Gerät');
}

/* =============================== A-14 Miniatur und großes Gehäuse zeigen dasselbe */

console.log('\nA-14 Miniatur und großes Gehäuse zeigen dasselbe');
{
	const mini = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html'));
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));
	const grid = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Grid.html'));
	const rules = lies(path.join(EXT, 'Classes/Rules.php'));

	const ERWARTETE_ZONEN = ['bank', 'coinslot', 'grid', 'panel', 'paytable', 'start', 'stop', 'tray', 'tubes'];
	const zonenMini = [...mini.matchAll(/data-fr-zone="([a-z]+)"/g)].map((m) => m[1]).sort();
	const zonenGross = [...shell.matchAll(/data-fr-zone="([a-z]+)"/g)].map((m) => m[1]).sort();
	check(zonenMini.join(',') === ERWARTETE_ZONEN.join(','),
		`Saal-Miniatur: genau die neun erwarteten Zonen (gefunden: ${zonenMini.join(', ') || '(keine)'})`);
	check(zonenGross.join(',') === ERWARTETE_ZONEN.join(','),
		`großes Gehäuse: genau die neun erwarteten Zonen (gefunden: ${zonenGross.join(', ') || '(keine)'})`);

	/*
	 * Die Folge der dreißig Symbolnamen der Saal-Miniatur, zeilenweise
	 * gelesen, aus ihren (weiterhin literalen) use-Verweisen.
	 */
	const miniFolge = [...mini.matchAll(/<use\s+href="#fr-mini-([a-z]+)"/g)].map((m) => m[1]);
	check(miniFolge.length === 30, `Saal-Miniatur: dreißig use-Verweise (gefunden: ${miniFolge.length})`);

	/*
	 * STAND F4a: Grid.html traegt keine Grundstellung mehr im Klartext ab —
	 * sie ergibt sich aus den sechs Baendern und ihrer Startlage. Das ist
	 * die STAERKERE Aussage: verglichen wird jetzt, was das Geraet WIRKLICH
	 * zeigen wird, und nicht, was jemand ins Markup getippt hat.
	 *
	 * Fluid rendert die Werte erst zur Laufzeit; im Quelltext stehen die
	 * Platzhalter {reel.symbolList} und {reel.defaultPosition}. Geprueft
	 * wird deshalb hier: (a) Grid.html holt beide Werte aus {machine.reels}
	 * und tippt sie nicht ab, (b) die Bandfolge aus Rules::STRIPS ergibt an
	 * Rules::DEFAULT_POSITIONS Feld fuer Feld dieselbe Folge wie die
	 * dreissig use-Verweise der Saal-Miniatur.
	 */
	check(/data-fr-strip="\{reel\.symbolList\}"/.test(grid),
		'Grid.html holt die Bandfolge aus {machine.reels} (data-fr-strip="{reel.symbolList}")');
	check(/--fr-reel-pos:\s*\{reel\.defaultPosition\}/.test(grid),
		'Grid.html holt die Startlage aus {machine.reels} (--fr-reel-pos: {reel.defaultPosition})');
	check(/href="#fr-sym-\{cell\.symbol\}"/.test(grid),
		'Grid.html tippt kein Symbol mehr ab — jedes use kommt aus {cell.symbol}');

	// Die Grundstellung aus Rules.php nachrechnen (Bandregel 5).
	const strips = leseIndexierteStringlisten(rules, 'STRIPS');
	const positionen = leseIntliste(rules, 'DEFAULT_POSITIONS');
	const fensterFolge = [];
	for (let row = 0; row < 5; row++) {
		for (let reel = 0; reel < 6; reel++) {
			fensterFolge.push(strips[reel]?.[(positionen[reel] + row) % 20]);
		}
	}
	const abweichungen = [];
	for (let i = 0; i < 30; i++) {
		if (miniFolge[i] !== fensterFolge[i]) {
			abweichungen.push(`Feld ${i}: Miniatur "${miniFolge[i] ?? '—'}" ≠ Band "${fensterFolge[i] ?? '—'}"`);
		}
	}
	check(abweichungen.length === 0,
		'die Saal-Miniatur zeigt Feld für Feld die Grundstellung der sechs Bänder'
		+ ' (aus Rules::STRIPS an Rules::DEFAULT_POSITIONS nachgerechnet)',
		...abweichungen);
}

/* =============================== A-15 Genau zwölf Symbole, kein BAR, kein Scatter */

console.log('\nA-15 Genau zwölf Symbole, kein BAR-Block, kein Scatter');
{
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));
	const mini = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html'));
	const ERWARTETE_MOTIVE = ['ananas', 'apfel', 'banane', 'erdbeere', 'glocke', 'kirsche',
		'melone', 'orange', 'pflaume', 'sieben', 'weintraube', 'zitrone'];

	const symIds = [...shell.matchAll(/<symbol\s+id="fr-sym-([a-z]+)"/g)].map((m) => m[1]).sort();
	const miniIds = [...mini.matchAll(/<symbol\s+id="fr-mini-([a-z]+)"/g)].map((m) => m[1]).sort();
	check(symIds.length === 12, `Shell.html: genau zwölf <symbol> (gefunden: ${symIds.length})`);
	check(miniIds.length === 12, `Cabinet.html: genau zwölf <symbol> (gefunden: ${miniIds.length})`);
	check(symIds.join(',') === ERWARTETE_MOTIVE.join(','),
		`Shell.html: die Namensmenge ist wortgleich (gefunden: ${symIds.join(', ')})`);
	check(miniIds.join(',') === ERWARTETE_MOTIVE.join(','),
		`Cabinet.html: die Namensmenge ist wortgleich (gefunden: ${miniIds.join(', ')})`);

	const barOderScatter = /id="[^"]*(bar|scatter)[^"]*"/i;
	check(!barOderScatter.test(shell) && !barOderScatter.test(mini),
		'weder "bar" noch "scatter" kommt in einer id vor (CONCEPT.md C.14.6)');
}

/* =============================== A-16 Jedes Bedienteil hat einen eigenen Namen */

console.log('\nA-16 Jedes Bedienteil hat einen eigenen, nicht leeren Namen');
{
	const cab = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html'));
	const xliff = lies(path.join(EXT, 'Resources/Private/Language/locallang.xlf'));

	const xliffKarte = new Map(
		[...xliff.matchAll(/<trans-unit id="([^"]+)">\s*<source>([^<]*)<\/source>/g)]
			.map((m) => [m[1], m[2]]));

	const aufrufe = [...cab.matchAll(
		/<f:render partial="Automat\/FruitRisk\/Machine\/Button"\s+arguments="\{([^}]*)\}"/g
	)].map((m) => m[1]);
	check(aufrufe.length === 15, `Machine/Cabinet.html: genau fünfzehn Button-Aufrufe (gefunden: ${aufrufe.length})`);

	const buttons = aufrufe.map((arg) => {
		const key = /key:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		const labelKey = /labelKey:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		const ariaLabelKey = /ariaLabelKey:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		const wirksamerSchluessel = ariaLabelKey !== '' ? ariaLabelKey : labelKey;
		return { key, text: xliffKarte.get(wirksamerSchluessel) ?? null };
	});
	check(buttons.every((b) => b.text !== null && b.text.trim() !== ''),
		'jedes der fünfzehn Bedienteile löst zu einem nicht leeren deutschen Namen auf',
		...buttons.filter((b) => !b.text || b.text.trim() === '').map((b) => `${b.key}: kein Text gefunden`));

	const texte = buttons.map((b) => b.text).filter((t) => t);
	const eindeutig = new Set(texte);
	check(eindeutig.size === texte.length,
		`alle Namen sind paarweise verschieden (${texte.length} Tasten, ${eindeutig.size} verschiedene Namen)`,
		...[...eindeutig].filter((t) => texte.filter((x) => x === t).length > 1)
			.map((t) => `mehrfach vergeben: "${t}"`));
}

/* =============================== A-17 Kein Übergang beim Leuchten der Risiko-Tasten */

console.log('\nA-17 Der Leuchtzustand der Risiko-Tasten kennt keinen Übergang');
{
	const cssRoh = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = cssRoh.indexOf('*/') + 2;
	const regelteil = ohneBlockKommentare(cssRoh.slice(kopfEnde));

	/** @keyframes-Blöcke enthalten selbst geschweifte Klammern (0%, 100% …) und
	 *  würden die einfache, nicht verschachtelte Blockzerlegung unten
	 *  durcheinanderbringen. Sie werden deshalb balanciert herausgeschnitten. */
	function ohneKeyframes(css) {
		let ergebnis = '';
		let i = 0;
		while (i < css.length) {
			const an = css.indexOf('@keyframes', i);
			if (an === -1) {
				ergebnis += css.slice(i);
				break;
			}
			ergebnis += css.slice(i, an);
			let tiefe = 1;
			let k = css.indexOf('{', an) + 1;
			while (tiefe > 0 && k < css.length) {
				if (css[k] === '{') tiefe++;
				else if (css[k] === '}') tiefe--;
				k++;
			}
			i = k;
		}
		return ergebnis;
	}
	const flach = ohneKeyframes(regelteil);

	/*
	 * Behebungslauf REVIEW-fruitrisk-f5.md [L4]: die ursprüngliche Prüfung
	 * traf nur, wenn der Selektor eine der DREI wörtlichen Zeichenketten
	 * fr-btn--round/fr-btn--risk/fr-btn__cap::after enthielt. Eine Regel wie
	 * ".fr-cabinet *::after { transition: … }" erreicht die Lichtlage genauso
	 * (jeder Nachfahre, dessen ::after existiert, ist getroffen), nennt aber
	 * keine der drei Zeichenketten und wäre unentdeckt geblieben. Ergänzt:
	 * JEDER Selektor, der überhaupt ::after adressiert — unabhängig davon,
	 * was davor steht (Klasse, Nachfahre, Sternchen) — zählt jetzt mit.
	 */
	const treffer = [];
	for (const m of flach.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selektor = m[1];
		const deklaration = m[2];
		if ((/fr-btn--round|fr-btn--risk/.test(selektor) || /::after\b/.test(selektor))
			&& /transition\s*:/.test(deklaration)) {
			treffer.push(selektor.trim().replace(/\s+/g, ' '));
		}
	}
	check(treffer.length === 0,
		'keine Regel, deren Selektor fr-btn--round, fr-btn--risk nennt oder überhaupt ::after adressiert,'
		+ ' setzt eine transition (animation bleibt ausdrücklich erlaubt)',
		...treffer);

	check(!flach.includes('fr-btn__cap::before'),
		'es gibt keine zweite, ausklingende Lichtlage (::before) auf .fr-btn__cap');
}

/* =============================== A-18 Die Risiko-Lampen leuchten bernstein */

console.log('\nA-18 Die Risiko-Lampen leuchten bernstein, weit unter der Blitzschwelle');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	// ohneBlockKommentare(): der Kopf und der Regelteil ERKLÄREN in Prosa
	// ausdrücklich, welche beiden Tokens NICHT benutzt werden — genau diese
	// Erklärung enthält die verbotenen Namen wörtlich. Geprüft wird deshalb
	// nur der tatsächliche Code, ohne jeden Kommentar.
	const cssMaschine = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/machine.css')));

	// farbWert()/rotAnteil() lesen sowohl #rrggbb als auch rgba(r, g, b, a) —
	// --ck-bulb-halo (unten in der Erlaubnisliste) steht in tokens.css als
	// rgba(), die Alpha-Komponente ändert den Rotanteil der Lichtfarbe selbst
	// nicht und wird deshalb ignoriert.
	function farbWert(token) {
		const treffer = new RegExp(`^\\s*${token}\\s*:\\s*(#[0-9a-fA-F]{6}|rgba?\\([^)]+\\))`, 'm')
			.exec(tokensCss);
		return treffer ? treffer[1] : null;
	}
	function rotAnteil(wert) {
		const hexTreffer = /^#([0-9a-fA-F]{6})$/.exec(wert);
		if (hexTreffer) {
			const r = parseInt(hexTreffer[1].slice(0, 2), 16);
			const g = parseInt(hexTreffer[1].slice(2, 4), 16);
			const b = parseInt(hexTreffer[1].slice(4, 6), 16);
			return r / (r + g + b);
		}
		const rgbTreffer = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/.exec(wert);
		if (!rgbTreffer) return null;
		const [, r, g, b] = rgbTreffer.map(Number);
		return r / (r + g + b);
	}

	check(!/--ck-bulb-hot\b/.test(cssMaschine) && !/--ck-bulb-afterglow\b/.test(cssMaschine),
		'machine.css benutzt weder --ck-bulb-hot noch --ck-bulb-afterglow');

	for (const token of ['--ck-bulb-core', '--ck-bulb-glow']) {
		const wert = farbWert(token);
		if (wert === null) {
			check(false, `${token}: Farbwert in tokens.css gefunden`);
			continue;
		}
		const anteil = rotAnteil(wert);
		check(anteil !== null && anteil < 0.8,
			`${token} (${wert}): R/(R+G+B) = ${anteil === null ? 'unbestimmt' : anteil.toFixed(2)}, unter der Blitzschwelle 0,8`
			+ ' — nachgerechnet, nicht geglaubt');
	}

	// M5 (Review): Die beiden Prüfungen oben stellen nur fest, dass die
	// VERBOTENEN Tokens fehlen und dass --ck-bulb-core/--ck-bulb-glow FALLS
	// benutzt unter der Schwelle liegen — nicht, dass die Lichtlage
	// .fr-btn__cap::after diese Tokens auch WIRKLICH einsetzt. Eine künftige
	// Umstellung der Lichtlage auf einen anderen, stärker roten Token (der
	// weder --ck-bulb-hot noch --ck-bulb-afterglow heißt) bliebe damit
	// unentdeckt — dasselbe Muster wie video_slot/…/verify-credit.mjs, das
	// nur noch seine eigene Vorbelegung prüft. Deshalb wird die Lichtlage
	// jetzt selbst herausgeschnitten und gegen eine ausdrückliche
	// Erlaubnisliste geprüft, mit Rotanteil-Nachweis für jeden dort
	// tatsächlich benutzten Token.
	const lichtlageStart = cssMaschine.indexOf('.fr-btn__cap::after');
	check(lichtlageStart !== -1, '.fr-btn__cap::after (die Lichtlage der Tasten) im Regelteil gefunden');
	if (lichtlageStart !== -1) {
		const blockStart = cssMaschine.indexOf('{', lichtlageStart) + 1;
		const blockEnde = cssMaschine.indexOf('}', blockStart);
		const lichtlage = cssMaschine.slice(blockStart, blockEnde);

		const ERLAUBTE_LICHTTOKENS = new Set(['--ck-bulb-core', '--ck-bulb-glow', '--ck-bulb-halo']);
		const benutzteTokens = new Set(
			[...lichtlage.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]));
		const unerlaubt = [...benutzteTokens].filter((t) => !ERLAUBTE_LICHTTOKENS.has(t));
		check(unerlaubt.length === 0,
			'die Lichtlage .fr-btn__cap::after benutzt ausschließlich Tokens aus der'
			+ ` Erlaubnisliste (${[...ERLAUBTE_LICHTTOKENS].join(', ')})`,
			...unerlaubt);

		for (const token of benutzteTokens) {
			if (!ERLAUBTE_LICHTTOKENS.has(token)) continue;
			const wert = farbWert(token);
			if (wert === null) {
				check(false, `${token}: Farbwert in tokens.css gefunden`);
				continue;
			}
			const anteil = rotAnteil(wert);
			check(anteil !== null && anteil < 0.8,
				`${token} (${wert}), tatsächlich von der Lichtlage benutzt: R/(R+G+B) = `
				+ `${anteil === null ? 'unbestimmt' : anteil.toFixed(2)}, unter der Blitzschwelle 0,8`);
		}
	}
}

/* =============================== A-19 Haken-Katalog deckt sich mit dem Regelteil */

console.log('\nA-19 Der Haken-Katalog deckt sich mit dem Regelteil');
{
	const cssRoh = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = cssRoh.indexOf('*/') + 2;
	const kopf = cssRoh.slice(0, kopfEnde);
	const regelteil = ohneBlockKommentare(cssRoh.slice(kopfEnde));

	const katalogStart = kopf.indexOf('DIE HAKEN, DIE SPÄTERE PHASEN SETZEN');
	const katalogEnde = kopf.indexOf('DIE BLITZSICHERHEIT IST HIER BAULICH VORBEREITET');
	const katalogText = katalogStart !== -1 && katalogEnde !== -1
		? kopf.slice(katalogStart, katalogEnde) : '';
	const katalog = new Set(
		[...katalogText.matchAll(/^\s*\*\s+(\.[a-z0-9_-]+|--fr-[a-z0-9-]+)/gm)]
			.map((m) => m[1].replace(/^\./, '')));
	// STAND F4a: zwei neue Haken kamen dazu — .fr-payline--win (§3) und
	// --fr-reel-pos (§3, Lage eines Bandes).
	// STAND F4b: fünf weitere — .fr-message--shown, .fr-cashout--lit,
	// .fr-coinslot__coin--drop, .fr-coinslot__slot--flash (alle §8/§9) und
	// .fr-machine--duplicate (§8). Massgeblich ist, was diese Prüfung
	// tatsächlich im Kopf zählt, nicht eine Zahl aus einem Plan.
	// STAND F5b: ein weiterer — .fr-btn--invite (§6, das Einladungsblinken).
	// STAND F5d: ein weiterer — .fr-sound--on (§10, der Ton-Schalter).
	check(katalog.size === 15,
		`fünfzehn Katalogeinträge im Kopf gelesen (gefunden: ${katalog.size}: ${[...katalog].join(', ')})`);

	/*
	 * Zwei Arten von Ausnahmen, beide hier als Liste und in der Ausgabe
	 * benannt: Bauform-Klassen (bezeichnen keinen Zustand, CONCEPT.md-Vorgabe
	 * dieses Plans) und Positionsklassen, die Fluid einmalig je
	 * Bedienteil-Schlüssel erzeugt und die nie durch ein Skript einer
	 * späteren Phase umgeschaltet werden. Bei den Custom Properties ebenso
	 * ausgenommen: --fr-u (Maßraster-Absatz) und die drei Röhren-Eigenschaften
	 * --fr-cathode/--fr-depth/--fr-tube, die Fluid einmalig beim Rendern
	 * setzt, nicht ein Skript einer späteren Phase.
	 */
	const AUSNAHME_KLASSEN = new Set([
		'fr-btn--square', 'fr-btn--key', 'fr-btn--round', 'fr-btn--tab',
		'fr-btn--start', 'fr-btn--stop',
		'fr-btn--risk8-up', 'fr-btn--risk8-left', 'fr-btn--risk8-right', 'fr-btn--risk8-down',
	]);
	const AUSNAHME_EIGENSCHAFTEN = new Set(['--fr-u', '--fr-cathode', '--fr-depth', '--fr-tube']);

	// STAND F4b: [a-z0-9_-]* statt [a-z0-9-]* VOR dem "--" — .fr-coinslot__
	// coin--drop und .fr-coinslot__slot--flash sind BEM-Klassen mit einem
	// Element-Unterstrich VOR dem Modifikator-Doppelstrich; ohne den
	// Unterstrich im Zeichensatz bräche das Muster mitten im Klassennamen ab
	// und fände die Klasse gar nicht erst (getestet: mit dem alten Muster
	// meldete diese Prüfung beide als "keine Regel gefunden", obwohl die
	// Regeln existieren).
	const gefundeneKlassen = new Set(
		[...regelteil.matchAll(/\.(fr-[a-z][a-z0-9_-]*--[a-z0-9-]+)\b/g)].map((m) => m[1]));
	const gefundeneEigenschaften = new Set(
		[...regelteil.matchAll(/--fr-[a-z0-9-]+/g)].map((m) => m[0]));

	const unbekannteKlassen = [...gefundeneKlassen]
		.filter((k) => !AUSNAHME_KLASSEN.has(k) && !katalog.has(k));
	const unbekannteEigenschaften = [...gefundeneEigenschaften]
		.filter((p) => !AUSNAHME_EIGENSCHAFTEN.has(p) && !katalog.has(p));
	check(unbekannteKlassen.length === 0 && unbekannteEigenschaften.length === 0,
		'jede Zustandsklasse und jede eigene Custom Property des Regelteils steht im Katalog'
		+ ` (Ausnahmen: ${[...AUSNAHME_KLASSEN].join(', ')}; ${[...AUSNAHME_EIGENSCHAFTEN].join(', ')})`,
		...unbekannteKlassen.map((k) => `Klasse .${k} fehlt im Katalog`),
		...unbekannteEigenschaften.map((p) => `Custom Property ${p} fehlt im Katalog`));

	const verwaisteEintraege = [...katalog].filter((eintrag) =>
		!gefundeneKlassen.has(eintrag) && !gefundeneEigenschaften.has(eintrag));
	check(verwaisteEintraege.length === 0,
		'jeder Katalogeintrag hat mindestens eine Regel im Regelteil',
		...verwaisteEintraege.map((e) => `${e}: keine Regel gefunden`));
}

/* =============================== A-20 Die Koordinatentabelle ist vollständig */

console.log('\nA-20 Die Koordinatentabelle ist vollständig');
{
	const cssRoh = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = cssRoh.indexOf('*/') + 2;
	const kopf = cssRoh.slice(0, kopfEnde);
	const regelteil = ohneBlockKommentare(cssRoh.slice(kopfEnde));

	const tabStart = kopf.indexOf('KOORDINATENTABELLE');
	const tabEnde = kopf.indexOf('STAPELEBENEN (Z-INDEX)');
	const tabelle = tabStart !== -1 && tabEnde !== -1 ? kopf.slice(tabStart, tabEnde) : '';
	check(tabelle !== '', 'die Koordinatentabelle wurde im Kopf gefunden');

	const ZONEN_ABSCHNITT = {
		grid: 'Fenster', start: 'START/STOP-Feld', stop: 'START/STOP-Feld',
		tubes: 'Röhrenplatte', panel: 'Bedienfeld', paytable: 'Gewinnplan hinter Glas',
		coinslot: 'Münzschlitz', bank: 'Kassenfenster', tray: 'Auswurfschale',
	};
	const fehlendeZonen = Object.entries(ZONEN_ABSCHNITT)
		.filter(([, abschnitt]) => !tabelle.includes(abschnitt))
		.map(([zone]) => zone);
	check(fehlendeZonen.length === 0,
		'jede der neun Zonen aus data-fr-zone kommt in der Koordinatentabelle vor'
		+ ' (über den Namen ihres Abschnitts)',
		...fehlendeZonen.map((z) => `${z}: Abschnitt "${ZONEN_ABSCHNITT[z]}" nicht gefunden`));

	/*
	 * Bekannte Zahlen der Tabelle: jeder Randwert eines Bereichs "A–B", jede
	 * daraus gebildete Breite/Höhe B-A, und jede sonst frei stehende Zahl
	 * (Stückzahlen, Rasterschritte, Durchmesser, Schriftgrößen).
	 */
	const bekannteZahlen = new Set();
	const zuZahl = (s) => Number(s.replace(',', '.'));
	for (const m of tabelle.matchAll(/(-?[0-9]+(?:[.,][0-9]+)?)\s*[–-]\s*(-?[0-9]+(?:[.,][0-9]+)?)/g)) {
		const a = zuZahl(m[1]);
		const b = zuZahl(m[2]);
		bekannteZahlen.add(a);
		bekannteZahlen.add(b);
		bekannteZahlen.add(Math.round((b - a) * 100) / 100);
	}
	for (const m of tabelle.matchAll(/(-?[0-9]+(?:[.,][0-9]+)?)/g)) {
		bekannteZahlen.add(zuZahl(m[1]));
	}
	function bekannt(zahl, menge = bekannteZahlen) {
		for (const b of menge) {
			if (Math.abs(b - zahl) < 0.01) {
				return true;
			}
		}
		return false;
	}

	/*
	 * M6 (Review), Teil (a): "bekannt" hieß bisher nur "irgendwo in der
	 * ganzen Tabelle" — eine Zahl aus dem Bedienfeld galt damit auch dann als
	 * belegt, wenn sie nur zufällig beim Kassenfenster stand. Jede der vier
	 * CSS-Abschnitte 3–6 hat eine eigene Zone in der Tabelle
	 * (3 Sichtfeld → Fenster, 4 Röhrenanzeigen → Röhrenplatte,
	 * 5 START/STOP → START/STOP-Feld, 6 Bedienfeld → Bedienfeld); eine Zahl
	 * aus einem dieser Abschnitte muss jetzt in GENAU diesem
	 * Tabellenabschnitt stehen, nicht nur irgendwo. Abschnitte 1/2/7 (Bühne,
	 * Sammelregel, Fokus) haben keine eigene Positions-Zone und bleiben am
	 * Maßstab der ganzen Tabelle.
	 */
	// STAND F4b: zwei neue CSS-Abschnitte. §8 (Geldeinbauten im Sockel) misst
	// gegen den gleichnamigen Tabellen-Top-Level-Eintrag; §9 (die Tafel) misst
	// gegen „Fenster", weil die Tafel als eingerückte Fortsetzung des
	// Fenster-Blocks in der Koordinatentabelle steht (dieselbe Bauform wie
	// die Bandlänge aus F4a, siehe DECISIONS.md Nr. 7).
	// STAND F5d: §10 (Der Ton-Schalter) bekommt seinen EIGENEN
	// Tabellenabschnitt „Ton-Schalter am Sockel" — damit werden die Maße des
	// neuen Abschnitts gegen GENAU diesen Tabellenblock geprüft, nicht nur
	// gegen irgendeine Zahl irgendwo in der Tabelle.
	const ABSCHNITT_ZONE = {
		3: 'Fenster', 4: 'Röhrenplatte', 5: 'START/STOP-Feld', 6: 'Bedienfeld',
		8: 'Geldeinbauten im Sockel', 9: 'Fenster', 10: 'Ton-Schalter am Sockel',
	};

	// Oberste Tabellenzeilen: genau EIN Leerzeichen nach dem führenden "*",
	// direkt gefolgt von einem Nicht-Leerzeichen. Unterzeilen (Details einer
	// Zone) sind mit drei oder mehr Leerzeichen eingerückt und fallen damit
	// heraus.
	const topLevel = [...tabelle.matchAll(/^ \* (\S[^\n]*)$/gm)].map((m) => ({ index: m.index, text: m[1] }));
	function abschnittsZahlen(zoneName) {
		const treffer = topLevel.find((t) => t.text.includes(zoneName));
		if (!treffer) return null;
		const folgende = topLevel.find((t) => t.index > treffer.index);
		const slice = folgende ? tabelle.slice(treffer.index, folgende.index) : tabelle.slice(treffer.index);
		const menge = new Set();
		for (const m of slice.matchAll(/(-?[0-9]+(?:[.,][0-9]+)?)\s*[–-]\s*(-?[0-9]+(?:[.,][0-9]+)?)/g)) {
			const a = zuZahl(m[1]);
			const b = zuZahl(m[2]);
			menge.add(a);
			menge.add(b);
			menge.add(Math.round((b - a) * 100) / 100);
		}
		for (const m of slice.matchAll(/(-?[0-9]+(?:[.,][0-9]+)?)/g)) {
			menge.add(zuZahl(m[1]));
		}
		return menge;
	}
	const ABSCHNITT_ZAHLEN = Object.fromEntries(
		Object.entries(ABSCHNITT_ZONE).map(([nr, zone]) => [nr, abschnittsZahlen(zone)]));

	// Welchem CSS-Abschnitt (Banner "N  Name" aus dem Regelteil) ein
	// Fundort angehört — auf dem ROHEN Text ermittelt, weil die Banner
	// Blockkommentare sind und ohneBlockKommentare() sie entfernt. Die vier
	// geprüften Eigenschaften stehen nirgends in einem Kommentar dieser
	// Datei, ein Fehlalarm durch Kommentartext ist damit ausgeschlossen.
	const koerper = cssRoh.slice(kopfEnde);
	const bannerMuster = /\/\*\s*=+\s*\r?\n\s*([0-9]+)\s{2}[^\r\n]+\r?\n\s*=+\s*\*\//g;
	const abschnittsGrenzen = [...koerper.matchAll(bannerMuster)].map((m) => ({
		nummer: Number(m[1]), start: m.index,
	}));
	function abschnittBei(index) {
		let aktuell = null;
		for (const g of abschnittsGrenzen) {
			if (g.start <= index) aktuell = g.nummer; else break;
		}
		return aktuell;
	}

	/*
	 * Beschränkt auf Positions- und Maßeigenschaften — genau das, was die
	 * Koordinatentabelle führt. Dekorative Werte (Schatten, Ränder, Deckkraft,
	 * Schriftgrößen der Beschriftung, Abstände) sind absichtlich außen vor:
	 * die Tabelle ist eine Koordinatentabelle, kein Stilkatalog. Grenze dieser
	 * Prüfung: sie beweist Vollständigkeit auf Zonen- und Zahlenebene, nicht
	 * die Richtigkeit jeder einzelnen Zuordnung über den Abschnitt hinaus, in
	 * dem sie steht.
	 */
	const gefunden = [];
	for (const m of koerper.matchAll(
		/\b(inset-inline-start|inset-block-start|inline-size|block-size)\s*:\s*calc\(\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\*\s*var\(--fr-u\)\)/g
	)) {
		gefunden.push([m[1], Number(m[2]), abschnittBei(m.index)]);
	}
	for (const m of koerper.matchAll(
		/grid-template-(?:columns|rows)\s*:\s*repeat\(\s*3\s*,\s*calc\(\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\*\s*var\(--fr-u\)\)\)/g
	)) {
		gefunden.push(['grid-template', Number(m[1]), abschnittBei(m.index)]);
	}
	const fehlendeZahlen = gefunden.filter(([, zahl, abschnitt]) => {
		const eigeneMenge = ABSCHNITT_ZAHLEN[abschnitt];
		return eigeneMenge ? !bekannt(zahl, eigeneMenge) : !bekannt(zahl);
	});
	check(fehlendeZahlen.length === 0,
		`${gefunden.length} Positions- und Maßangaben geprüft (inset-inline-start,`
		+ ' inset-block-start, inline-size, block-size, Rasterschritt des Kreuzes),'
		+ ' alle im richtigen Abschnitt der Koordinatentabelle wiedergefunden',
		...fehlendeZahlen.map(([eig, zahl, abschnitt]) =>
			`${eig}: ${zahl} (Regelteil-Abschnitt ${abschnitt ?? '?'}) nicht im zugehörigen`
			+ ` Tabellenabschnitt (${ABSCHNITT_ZONE[abschnitt] ?? 'ganze Tabelle'}) gefunden`));

	/*
	 * M6 (Review), Teil (b): ein Widerspruchstest innerhalb der Tabelle
	 * selbst. "Oberkante y" und "Mitte y"/"Gruppenmitte" beschreiben jeweils
	 * dieselbe Größe (die Oberkante der Bedienfeld-Tastenzeile bzw. die
	 * y-Mitte aller zwölf Tasten) an mehreren Stellen der Tabelle — genau das
	 * war bei M1 auseinandergelaufen (95,5 gegen 96,3, 107,0 gegen 107,8).
	 * Zwei verschiedene Zahlen für dieselbe benannte Größe sind ein Fund,
	 * unabhängig davon, ob A-20 oben grün ist.
	 */
	function widerspruchsfrei(label, muster) {
		const werte = new Set([...tabelle.matchAll(muster)].map((m) => zuZahl(m[1])));
		check(werte.size <= 1,
			`"${label}" steht in der Tabelle überall mit derselben Zahl`
			+ ` (gefunden: ${[...werte].join(', ') || 'keine Stelle'})`);
	}
	widerspruchsfrei('Oberkante y', /Oberkante y\s*(-?[0-9]+(?:,[0-9]+)?)/g);
	widerspruchsfrei('Mitte y / Gruppenmitte',
		/(?:Mitte y|Gruppenmitte \/)\s*(-?[0-9]+(?:,[0-9]+)?)/g);
}

/* =============================== A-21 Der Gewinnplan druckt keine Zahl AUS DEM MARKUP */

console.log('\nA-21 Der Gewinnplan druckt keine Zahl AUS DEM MARKUP');
{
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));
	const startMarke = '<g data-fr-zone="paytable">';
	const start = shell.indexOf(startMarke);
	check(start !== -1, 'die Zone data-fr-zone="paytable" wurde in Shell.html gefunden');

	if (start !== -1) {
		// Balanciertes Herausschneiden bis zum passenden schließenden </g>, weil
		// die Zone selbst wieder <g>-Elemente ohne data-fr-zone verschachtelt.
		const tagMuster = /<g\b[^>]*>|<\/g>/g;
		tagMuster.lastIndex = start;
		let tiefe = 0;
		let ende = -1;
		let m;
		while ((m = tagMuster.exec(shell)) !== null) {
			if (m[0] === '</g>') {
				tiefe--;
				if (tiefe === 0) {
					ende = m.index + m[0].length;
					break;
				}
			} else {
				tiefe++;
			}
		}
		const zone = ende !== -1 ? shell.slice(start, ende) : '';
		check(zone !== '', 'die paytable-Zone lässt sich vollständig herausschneiden (schließendes </g> gefunden)');

		// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [H1]): [^<]* im
		// Textinhalt griff nicht mehr, sobald ein <text>-Element ein
		// verschachteltes Tag traegt (z. B. <f:translate .../> — wegen des
		// "<" bricht [^<]* dort ab, und das ganze Element fiel aus der
		// Pruefung heraus). [\s\S]*? erfasst jetzt den vollen Inhalt
		// EINSCHLIESSLICH verschachtelter Tags, die anschliessend entfernt
		// werden (/<[^>]*>/g) — geprueft wird nur noch der reine Text
		// AUSSERHALB solcher Tags. Ein Zahlenliteral direkt neben einem
		// <f:translate>/<f:for>/{variable} waere damit weiterhin ein Fund,
		// nicht mehr eine unsichtbare Luecke.
		const textInhalte = [...zone.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
			.map((m2) => m2[1].replace(/<[^>]*>/g, '').trim());
		const digitTreffer = textInhalte.filter((t) => /[0-9]/.test(t));
		check(digitTreffer.length === 0,
			'kein Ziffernzeichen im Textinhalt der paytable-Zone — weder Wert noch'
			+ ' Spaltenkopf. Jede Zahl kommt zur Laufzeit aus Classes/Rules.php über'
			+ ' den CabinetProcessor (CONCEPT.md C.14.4). Ein Zahlenliteral hier wäre'
			+ ' eine zweite Wahrheit neben Rules.php.',
			...digitTreffer);

		// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [H1]), zweite Haelfte:
		// die obige Pruefung sieht nur das Markup, nicht die Sprachdatei — ein
		// Zahlenliteral direkt im <source> eines <trans-unit> in locallang.xlf
		// waere von ihr nicht erfasst (genau das war der urspruengliche Fund).
		// Diese Pruefung bindet deshalb zusaetzlich die Sprachdatei selbst:
		// kein <source> mit einer id, die im Namensraum "machine.paytable."
		// liegt, darf ein Ziffernzeichen enthalten — die Zahlen kommen seit
		// diesem Behebungslauf ausschliesslich aus CabinetProcessor::buildFieldLadderNote()
		// (Rules::FIELD_LADDER), nicht aus der XLIFF-Datei.
		const xlf = lies(path.join(EXT, 'Resources/Private/Language/locallang.xlf'));
		const paytableTransUnits = [...xlf.matchAll(
			/<trans-unit\s+id="(machine\.paytable\.[a-zA-Z]+)">\s*<source>([^<]*)<\/source>/g
		)];
		check(paytableTransUnits.length > 0,
			'locallang.xlf enthält mindestens eine trans-unit im Namensraum "machine.paytable."');
		const xlfDigitTreffer = paytableTransUnits.filter(([, , source]) => /[0-9]/.test(source));
		check(xlfDigitTreffer.length === 0,
			'kein Ziffernzeichen im <source> einer "machine.paytable."-trans-unit in locallang.xlf —'
			+ ' die Feldtreppe kommt seit REVIEW-fruitrisk-f3.md [H1] ausschließlich aus'
			+ ' Rules::FIELD_LADDER über CabinetProcessor::buildFieldLadderNote(), nicht mehr'
			+ ' als Fließtext aus der Sprachdatei.',
			...xlfDigitTreffer.map(([id, source]) => `${id}: "${source}"`));

		const forSchleifen = [...zone.matchAll(/<f:for\s+each="\{machine\.(paytableHeads|paytable)\}"/g)]
			.map((m2) => m2[1]).sort();
		check(forSchleifen.join(',') === 'paytable,paytableHeads',
			'die Zone enthält genau zwei <f:for>-Schleifen über {machine.paytableHeads}'
			+ ' und {machine.paytable}', ...forSchleifen);

		check(/<use\s+href="#fr-sym-\{row\.symbol\}"/.test(zone),
			'die Zone enthält einen use-Verweis mit {row.symbol}');

		check(!/&#8211;/.test(zone),
			'kein Gedankenstrich &#8211; mehr in der Zone: die Werte stehen jetzt fest');
	}
}

/* =============================== A-23 Jedes Symbol aus Rules::SYMBOLS ist gezeichnet */

console.log('\nA-23 Jedes Symbol aus Rules::SYMBOLS ist gezeichnet');
{
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));
	const mini = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Cabinet.html'));
	const rules = lies(path.join(EXT, 'Classes/Rules.php'));

	// Rules::SYMBOLS als TEXT gelesen — kein PHP, kein Unterprozess, dieselbe
	// Bauart wie verify-payout.mjs. Damit ist der Zeichenvorrat erstmals an
	// das Regelwerk gebunden statt an eine Zahl im Skript.
	const symbolsBlock = /public const SYMBOLS = \[([\s\S]*?)\];/.exec(rules)?.[1] ?? '';
	const symbols = [...symbolsBlock.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
	check(symbols.length === 12,
		`Classes/Rules.php::SYMBOLS als Text gelesen: zwölf Namen (gefunden: ${symbols.length})`);

	const symIds = new Set([...shell.matchAll(/<symbol\s+id="fr-sym-([a-z]+)"/g)].map((m) => m[1]));
	const miniIds = new Set([...mini.matchAll(/<symbol\s+id="fr-mini-([a-z]+)"/g)].map((m) => m[1]));

	const fehltInShell = symbols.filter((s) => !symIds.has(s));
	check(fehltInShell.length === 0,
		'jedes Symbol aus Rules::SYMBOLS hat eine <symbol id="fr-sym-…"> in Shell.html',
		...fehltInShell.map((s) => `fehlt: fr-sym-${s}`));

	const fehltInMini = symbols.filter((s) => !miniIds.has(s));
	check(fehltInMini.length === 0,
		'jedes Symbol aus Rules::SYMBOLS hat eine <symbol id="fr-mini-…"> in der Saal-Miniatur',
		...fehltInMini.map((s) => `fehlt: fr-mini-${s}`));

	const unbekanntInShell = [...symIds].filter((s) => !symbols.includes(s));
	check(unbekanntInShell.length === 0,
		'Shell.html definiert keine <symbol>, die nicht in Rules::SYMBOLS steht',
		...unbekanntInShell.map((s) => `unbekannt: fr-sym-${s}`));

	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [L10]): für die
	// Saal-Miniatur fehlte diese Gegenrichtung bisher — eine <symbol
	// id="fr-mini-…">, die nicht in Rules::SYMBOLS vorkommt, fiel nicht auf.
	const unbekanntInMini = [...miniIds].filter((s) => !symbols.includes(s));
	check(unbekanntInMini.length === 0,
		'die Saal-Miniatur definiert keine <symbol>, die nicht in Rules::SYMBOLS steht',
		...unbekanntInMini.map((s) => `unbekannt: fr-mini-${s}`));
}

/* =============================== A-22 Die vier neuen Motive sind formstark und tokenrein */

console.log('\nA-22 Die vier neuen Motive sind formstark und tokenrein');
{
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html'));
	const NEUE_MOTIVE = ['erdbeere', 'banane', 'apfel', 'ananas'];
	const ERLAUBTE_PRAEFIXE = ['--ck-fruit-', '--ck-print-', '--ck-paper-'];

	for (const motiv of NEUE_MOTIVE) {
		const treffer = new RegExp(`<symbol\\s+id="fr-sym-${motiv}"[\\s\\S]*?<\\/symbol>`).exec(shell);
		if (treffer === null) {
			check(false, `${motiv}: <symbol id="fr-sym-${motiv}"> gefunden`);
			continue;
		}
		const block = treffer[0];
		check(/stroke="var\(--ck-print-ink\)"/.test(block),
			`${motiv}: mindestens eine Kontur stroke="var(--ck-print-ink)" — die Form als`
			+ ' eigener Kanal neben der Farbe');
		const tokens = [...block.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]);
		const unerlaubt = tokens.filter((t) => !ERLAUBTE_PRAEFIXE.some((p) => t.startsWith(p)));
		check(unerlaubt.length === 0,
			`${motiv}: benutzt ausschließlich Tokens aus --ck-fruit-*/--ck-print-*/--ck-paper-*`,
			...[...new Set(unerlaubt)]);
	}
}

/* =============================== A-24 Der Gewinnplan bleibt im Papierrahmen */

console.log('\nA-24 Der Gewinnplan bleibt im Papierrahmen der Koordinatentabelle');
{
	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M6]): der Review
	// bemängelte, die Koordinatentabelle nenne zum Gewinnplan nur den Rahmen,
	// keinen der vierzehn Werte aus dem CabinetProcessor — das trifft auf die
	// TATSÄCHLICHE Tabelle nicht zu (die Unterzeilen unter „Gewinnplan hinter
	// Glas" führen Blockanfang, Spaltenkopf-Versätze, Zeilenraster und
	// Wertegrundlinie bereits als Formeln mit denselben Zahlen). Diese
	// Prüfung ergänzt trotzdem die vom Review empfohlene rechnerische
	// Absicherung: sie liest sowohl den Rahmen aus machine.css als auch die
	// vierzehn Werte aus CabinetProcessor.php als TEXT (kein PHP, kein
	// Unterprozess) und rechnet nach, dass die rechteste Wertespalte und die
	// unterste Symbolzeile innerhalb des Rahmens bleiben — genau die zwei
	// Ungleichungen, die der Review nennt.
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const proc = lies(path.join(EXT, 'Classes/DataProcessing/CabinetProcessor.php'));

	const zuZahl = (s) => Number(s.replace(',', '.'));
	const rahmen = /Gewinnplan hinter Glas\s+x\s+([\d,]+)–([\d,]+)\s+y\s+([\d,]+)–([\d,]+)/.exec(css);
	check(rahmen !== null, 'der Rahmen "Gewinnplan hinter Glas" steht in der Koordinatentabelle von machine.css');

	const parsePhpMap = (name) => {
		const block = new RegExp(`private const ${name}\\s*=\\s*\\[([^\\]]*)\\];`).exec(proc)?.[1] ?? '';
		return Object.fromEntries(
			[...block.matchAll(/(\d+)\s*=>\s*([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]));
	};
	const parsePhpScalar = (name) => {
		const m = new RegExp(`private const ${name}\\s*=\\s*([\\d.]+);`).exec(proc);
		return m === null ? null : Number(m[1]);
	};

	const blockX = parsePhpMap('BLOCK_X');
	const valueDx = parsePhpMap('VALUE_DX');
	const firstSymbolY = parsePhpScalar('FIRST_SYMBOL_Y');
	const rowHeight = parsePhpScalar('ROW_HEIGHT');
	const symbolSize = parsePhpScalar('SYMBOL_SIZE');
	const rowsPerBlock = parsePhpScalar('ROWS_PER_BLOCK');

	check(Object.keys(blockX).length === 4 && Object.keys(valueDx).length === 4
		&& [firstSymbolY, rowHeight, symbolSize, rowsPerBlock].every((v) => v !== null),
		'alle vierzehn Werte (BLOCK_X ×4, VALUE_DX ×4, FIRST_SYMBOL_Y, ROW_HEIGHT, SYMBOL_SIZE,'
		+ ' ROWS_PER_BLOCK) wurden aus CabinetProcessor.php gelesen');

	if (rahmen !== null && Object.keys(blockX).length === 4 && Object.keys(valueDx).length === 4) {
		const rahmenRechts = zuZahl(rahmen[2]);
		const rahmenUnten = zuZahl(rahmen[4]);
		const rechtesteWertespalte = Math.max(...Object.values(blockX)) + Math.max(...Object.values(valueDx));
		const untersteSymbolkante = firstSymbolY + (rowsPerBlock - 1) * rowHeight + symbolSize;

		check(rechtesteWertespalte <= rahmenRechts,
			`rechteste Wertespalte ${rechtesteWertespalte} liegt innerhalb des Rahmens (≤ ${rahmenRechts})`);
		check(untersteSymbolkante <= rahmenUnten,
			`unterste Symbolkante ${untersteSymbolkante.toFixed(1)} liegt innerhalb des Rahmens (≤ ${rahmenUnten})`);
	}
}

/* =============================== A-25 Das Walzenwerk: Bandlänge, Fenster und Gewinnlinien */

console.log('\nA-25 Das Walzenwerk: Bandlänge, Fenster und Gewinnlinien');
{
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const grid = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Grid.html'));
	const proc = lies(path.join(EXT, 'Classes/DataProcessing/CabinetProcessor.php'));

	check(/viewBox="0 0 15 320"/.test(grid), 'Grid.html: ein Band ist 15 × 320 Einheiten groß');
	check(/block-size:\s*calc\(320 \* var\(--fr-u\)\)/.test(css),
		'machine.css: .fr-reel__strip ist 320 Einheiten hoch (40 Zellen zu 8)');
	check(/STRIP_LAPS = 2/.test(proc), 'CabinetProcessor: zwei Umläufe je Band');

	const stripStart = css.indexOf('.fr-reel__strip {');
	const paylinesStart = css.indexOf('.fr-paylines {');
	check(stripStart !== -1 && paylinesStart !== -1 && stripStart < paylinesStart,
		'.fr-reel__strip und .fr-paylines im Regelteil gefunden, in dieser Reihenfolge');
	check(!/transition/.test(css.slice(stripStart, paylinesStart)),
		'das Band hat KEINEN CSS-Übergang — gebremst wird rechnerisch (reel.js, Phase F4c)');

	check(/viewBox="0 0 90 40"/.test(grid) && /class="fr-paylines"/.test(grid),
		'Grid.html: das Gewinnlinien-Overlay ist deckungsgleich mit dem Sichtfeld (viewBox 90 × 40)');

	const paylineRuleStart = css.indexOf('.fr-payline {');
	const paylineWinStart = css.indexOf('.fr-payline--win {');
	check(paylineRuleStart !== -1 && paylineWinStart !== -1,
		'.fr-payline und .fr-payline--win im Regelteil gefunden');
	check(/opacity:\s*0;/.test(css.slice(paylineRuleStart, paylineWinStart)),
		'die Gewinnlinien sind anfangs verborgen — über opacity: 0, nicht über display/visibility');
	check(/opacity:\s*1;/.test(css.slice(paylineWinStart, css.indexOf('}', paylineWinStart))),
		'.fr-payline--win zeigt die getroffene Linie über opacity: 1');

	// ohneBlockKommentare(): der Kopf nennt .fr-payline--win selbst im
	// Haken-Katalog (Prosa, kein Code) — ungefiltert traf die Suche nach
	// "{...display" dort auf die naechste ECHTE Regel im Kopf und meldete
	// einen Fund, der keiner ist.
	check(!/\.fr-payline(?:--win)?[^{]*\{[^}]*(visibility|display)\s*:/.test(ohneBlockKommentare(css)),
		'weder .fr-payline noch .fr-payline--win wird über visibility oder display verborgen');

	/*
	 * Gegenprobe (verlangt vom Plan, Abschnitt 10 Nr. 3): eine absichtlich
	 * falsche Grundlage muss diese Prüfungen tatsächlich rot werden lassen,
	 * sonst wären sie nur zufällig grün. Hier lokal statt global, damit sie
	 * die Gesamtbilanz nicht verfälscht.
	 */
	{
		let lokaleFehler = 0;
		const lokalCheck = (ok) => { if (!ok) lokaleFehler++; };
		lokalCheck(/block-size:\s*calc\(999 \* var\(--fr-u\)\)/.test(css)); // absichtlich falsch
		lokalCheck(/STRIP_LAPS = 999/.test(proc)); // absichtlich falsch
		check(lokaleFehler === 2,
			'Gegenprobe: dieselben Regexe schlagen bei absichtlich falschem Inhalt fehl'
			+ ' (kein Bestehen gegen eine Vorbelegung, die niemand geschrieben hat)');
	}
}

/* =============================== A-26 Geldreihe, Tafel und die Grenze der vier Live-Bereiche */

console.log('\nA-26 Geldreihe, Tafel und die Grenze der vier Live-Bereiche');
{
	const rel = 'Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html';
	const cab = ohneKommentare(lies(path.join(EXT, rel)));

	// Die harte Grenze: die Tafel und das Kassenfenster dürfen KEIN
	// role="status" tragen. A-12 zählt weiterhin vier; diese Prüfung sagt,
	// WARUM es bei vier bleibt, obwohl zwei neue Anzeigen dazugekommen sind.
	check(/class="fr-message"[^>]*aria-hidden="true"/.test(cab),
		'die Tafel ist eine gezeichnete Anzeige (aria-hidden) und kein fünfter Live-Bereich');
	check(!/class="fr-message"[^>]*role="status"/.test(cab),
		'die Tafel trägt kein role="status"');
	check(/data-fr-bank-display[^>]*aria-hidden="true"/.test(cab),
		'das Kassenfenster ist eine gezeichnete Anzeige (aria-hidden)');

	// Jedes neue Bedienteil hat einen Namen — sichtbar oder unsichtbar.
	for (const [selektor, name] of [
		['data-fr-coin-add="10"', '+10'], ['data-fr-coin-add="100"', '+100'],
		['data-fr-coin-add="500"', '+500'],
	]) {
		check(cab.includes(selektor), `Münzschlitz: Schnellwert ${name} vorhanden`);
	}
	check((cab.match(/fr-coinslot__legend/g) ?? []).length === 2,
		'Schlitz und Eingabefeld tragen je eine unsichtbare Beschriftung');
	check(/data-fr-coin-input[\s\S]*?max="9999999"/.test(cab),
		'das Feld für den freien Betrag ist auf die Anzeigekapazität begrenzt');
	check(/class="fr-cashout"[^>]*aria-disabled="true"/.test(cab),
		'CASH OUT wird gesperrt ausgeliefert (aria-disabled, nicht disabled)');
	check(!/class="fr-cashout"[^>]*\sdisabled\b/.test(cab),
		'CASH OUT trägt KEIN echtes disabled — sonst fiele es aus dem Tastaturweg');

	/*
	 * STAND F5c: KEIN Bedienteil sagt mehr "ich tue nichts" — geprüft an den
	 * f:render-Aufrufen, nicht an einem literalen <button>: Cabinet.html
	 * ruft für jede Taste Machine/Button.html per f:render auf und enthält
	 * selbst kein einziges data-fr-button-Attribut im Quelltext (das
	 * entsteht erst beim Rendern des Partials). Dieselbe Bauart wie A-16.
	 * AUTO MODE ist seit diesem Teilstück verdrahtet (auto.js) und ruft
	 * Machine/Button.html mit toggle: 1 statt disabled: 1 auf.
	 *
	 * BEHEBUNGSLAUF 2026-09-05 (AUDITREPORT-2026-09-05.md, N-05): die acht
	 * Risiko-Tasten rufen Machine/Button.html WIEDER mit disabled: 1 auf —
	 * ohne das Argument lieferte das HTML aria-disabled="false" aus, obwohl
	 * beim Laden nie ein Angebot besteht. Die Erwartung dreht sich damit ein
	 * drittes Mal: gesperrt sind jetzt genau die acht Risiko-Tasten, frei
	 * sind START, STOP, AUTO MODE und REWARD.
	 */
	const buttonAufrufe = [...cab.matchAll(
		/<f:render partial="Automat\/FruitRisk\/Machine\/Button"\s+arguments="\{([^}]*)\}"/g
	)].map((arg) => ({
		key: /key:\s*'([^']*)'/.exec(arg)?.[1] ?? '',
		disabled: /disabled:\s*1\b/.test(arg),
		toggle: /toggle:\s*1\b/.test(arg),
	}));
	check(buttonAufrufe.length === 15,
		`Machine/Cabinet.html: genau fünfzehn Button-Aufrufe (gefunden: ${buttonAufrufe.length})`);

	const gesperrt = buttonAufrufe.filter((b) => b.disabled).map((b) => b.key).sort();
	check(gesperrt.join(',') === 'risk-left,risk-right,risk-start,'
		+ 'risk4-left,risk4-right,risk4-start,'
		+ 'risk8-down,risk8-left,risk8-right,risk8-start,risk8-up',
		'genau die elf Risiko-Bedienteile tragen disabled: 1 — die acht Richtungstasten UND die drei'
		+ ' Starttasten liefern aria-disabled="true" aus, weil beim Laden nie ein Angebot besteht'
		+ ` (N-05) (gefunden: ${gesperrt.join(', ') || 'keiner'})`);

	// START, STOP, AUTO MODE und REWARD tragen kein disabled: 1 — Button.html
	// löst das per f:if(condition: disabled, …) zu aria-disabled="false" auf,
	// und das ist für diese vier auch beim Laden schon der richtige Zustand:
	// START/STOP sind immer wirksam, AUTO MODE ist ein verdrahteter
	// Umschalter (toggle: 1, siehe unten), REWARD bleibt ohne eigene
	// aria-disabled-Verwaltung (kein Fund dieses Behebungslaufs, siehe N-05
	// im Auditbericht — dort sind ausdrücklich nur die acht runden
	// Risiko-Tasten genannt).
	const frei = buttonAufrufe.filter((b) => !b.disabled).map((b) => b.key).sort();
	check(frei.join(',') === 'auto,reward,start,stop',
		`START, STOP, AUTO MODE und REWARD rufen Button.html OHNE disabled: 1 auf (gefunden: ${frei.join(', ')})`);

	// AUTO MODE ist ein Umschalter, kein Drucktaster: er trägt toggle: 1,
	// und NUR er — damit Machine/Button.html den dritten Zweig (aria-pressed)
	// ausschließlich für diese eine Taste nimmt.
	const umschalter = buttonAufrufe.filter((b) => b.toggle).map((b) => b.key).sort();
	check(umschalter.join(',') === 'auto',
		`genau AUTO MODE ruft Button.html mit toggle: 1 auf und bekommt dadurch aria-pressed`
		+ ` (gefunden: ${umschalter.join(', ') || 'keiner'})`);

	// Kein deutscher Anzeigetext im Markup: alles über f:translate.
	check(!/>[A-ZÄÖÜ][A-ZÄÖÜ ]{3,}</.test(cab.replace(/\{[^}]*\}/g, '')),
		'kein ausgeschriebener Anzeigetext im Markup — alles kommt aus locallang.xlf');

	// Jeder benutzte Sprachschlüssel existiert wirklich — der nützlichste
	// Einzelfund dieser Prüfung: ein Tippfehler zeigt sich im Frontend nur
	// als roher Schlüsseltext und wird sonst leicht übersehen.
	const xlf = lies(path.join(EXT, 'Resources/Private/Language/locallang.xlf'));
	const benutzt = [...cab.matchAll(/locallang\.xlf:([a-z0-9.]+)/g)].map((m) => m[1]);
	const fehlend = [...new Set(benutzt)].filter((k) => !xlf.includes(`id="${k}"`));
	check(fehlend.length === 0, `${new Set(benutzt).size} Sprachschlüssel im Markup, alle in locallang.xlf vorhanden`,
		...fehlend.map((k) => `fehlt in locallang.xlf: ${k}`));

	// Die Satzmuster der Live-Bereiche "grid", "credit" und seit F5b auch
	// "risk" sind da; nur "machine" bleibt ohne data-fr-text-… (sein
	// Eigentümer, message.js, liest ausschließlich .fr-message selbst aus).
	const grid = cab.match(/<p[^>]*data-fr-announce="grid"[^>]*>/)?.[0] ?? '';
	const credit = cab.match(/<p[^>]*data-fr-announce="credit"[^>]*>/)?.[0] ?? '';
	const risk = cab.match(/<p[^>]*data-fr-announce="risk"[^>]*>/)?.[0] ?? '';
	check(/data-fr-text-grid=/.test(grid) && /data-fr-text-result=/.test(grid)
		&& /data-fr-text-resultfield=/.test(grid) && /data-fr-text-resultlinesonly=/.test(grid)
		&& /data-fr-text-fieldpart=/.test(grid),
		'der Live-Bereich "grid" trägt seine fünf Satzmuster');
	check((grid.match(/data-fr-name-/g) ?? []).length === 12,
		`der Live-Bereich "grid" trägt zwölf Symbolnamen (gefunden: ${(grid.match(/data-fr-name-/g) ?? []).length})`);
	check(/data-fr-text-credit=/.test(credit),
		'der Live-Bereich "credit" trägt sein eines Satzmuster (Kasse UND Gerätekredit, EIN Schreiber)');
	check(/data-fr-text-offer=/.test(risk) && /data-fr-text-won=/.test(risk) && /data-fr-text-lost=/.test(risk),
		'der Live-Bereich "risk" trägt seine drei Satzmuster (Angebot, gewonnen, verloren)');

	// Nach wie vor bleiben alle role="status" LEER — auch mit den neuen
	// data-Attributen daran (A-12 prüft das bereits global; hier lokal
	// gegenprobiert, weil dieser Abschnitt die Attribute erst einführt).
	const bereiche = [...cab.matchAll(/<p\b[^>]*role="status"[^>]*>([\s\S]*?)<\/p>/g)];
	check(bereiche.length === 4 && bereiche.every((m) => m[1].trim() === ''),
		'alle vier Live-Bereiche bleiben LEER ausgeliefert, auch nachdem "grid" und'
		+ ' "credit" ihre Satzmuster als data-Attribute bekommen haben');
}

/* =============================== A-27 Der feste Einsatz steht nur einmal geschrieben */

console.log('\nA-27 Der feste Einsatz steht nur einmal geschrieben (Rules::STAKE)');
{
	// Behebungslauf REVIEW-fruitrisk-f4.md [M6]: STAKE=10 stand vorher an
	// drei Stellen ausgeschrieben (locallang.xlf, die EINSATZ-Röhren in
	// Cabinet.html, der Schnellwert-Knopf +10 im Münzschlitz). Diese Prüfung
	// bindet alle drei an Classes/Rules.php::STAKE zurück.
	const rules = lies(path.join(EXT, 'Classes/Rules.php'));
	const stakeMatch = /public const STAKE = (\d+);/.exec(rules);
	check(stakeMatch !== null, 'Classes/Rules.php::STAKE als Text gelesen');
	const stake = stakeMatch === null ? null : Number(stakeMatch[1]);

	const processor = lies(path.join(EXT, 'Classes/DataProcessing/CabinetProcessor.php'));
	check(/'stake'\s*=>\s*Rules::STAKE/.test(processor),
		'CabinetProcessor liefert {machine.stake} live aus Rules::STAKE, keine eigene Zahl');
	check(/buildStakeTubes\(\)/.test(processor) && /Rules::STAKE/.test(processor),
		'CabinetProcessor leitet die EINSATZ-Röhrenziffern ({machine.stakeTubes}) aus Rules::STAKE ab');

	const cab = ohneKommentare(lies(path.join(EXT,
		'Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html')));
	check(/displayKey:\s*'einsatz',\s*tubes:\s*machine\.stakeTubes/.test(cab),
		'Cabinet.html füllt die EINSATZ-Röhren aus {machine.stakeTubes}, nicht mehr aus einem eigenen Fluid-Array');
	check(/machine\.stake\.note['"][\s\S]{0,80}arguments="\{0:\s*machine\.stake\}"/.test(cab),
		'Cabinet.html übergibt {machine.stake} als f:translate-Argument an machine.stake.note');

	if (stake !== null) {
		check(cab.includes(`data-fr-coin-add="${stake}"`),
			`der Münzschlitz hat einen Schnellwert-Knopf, der genau dem festen Einsatz entspricht`
			+ ` (Rules::STAKE = ${stake}, gesucht: data-fr-coin-add="${stake}")`);
	}
}

/* =============================== A-28 Der Ton-Schalter */

console.log('\nA-28 Der Ton-Schalter');
{
	const cabRoh = lies(path.join(EXT, 'Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html'));
	const cab = ohneKommentare(cabRoh);

	const schalterTreffer = [...cab.matchAll(/<button\b[^>]*\bdata-fr-sound\b[^>]*>/g)];
	check(schalterTreffer.length === 1,
		`Cabinet.html enthält genau EIN [data-fr-sound] (gefunden: ${schalterTreffer.length})`);

	const schalter = schalterTreffer[0]?.[0] ?? '';
	check(/^<button\s+type="button"/.test(schalter),
		'der Ton-Schalter ist ein <button type="button">, kein div');
	check(/aria-pressed="true"/.test(schalter),
		'er trägt aria-pressed="true" (der Ton ist standardmäßig eingeschaltet)');
	check(!/\sdisabled\b/.test(schalter) && !/aria-disabled/.test(schalter),
		'er trägt weder disabled noch aria-disabled');
	check(!/role="status"/.test(schalter),
		'er trägt kein role="status" — es bleibt bei vier Live-Bereichen');

	const xliff = lies(path.join(EXT, 'Resources/Private/Language/locallang.xlf'));
	const xliffKarte = new Map(
		[...xliff.matchAll(/<trans-unit id="([^"]+)">\s*<source>([^<]*)<\/source>/g)]
			.map((m) => [m[1], m[2]]));
	const soundName = xliffKarte.get('machine.sound.label') ?? null;
	check(soundName !== null && soundName.trim() !== '',
		'machine.sound.label existiert in locallang.xlf und ist nicht leer');

	// Dieselbe Bauart wie A-16: der wirksame Name der fünfzehn Machine/
	// Button.html-Bedienteile kommt aus ariaLabelKey, sonst aus labelKey.
	const aufrufe = [...cabRoh.matchAll(
		/<f:render partial="Automat\/FruitRisk\/Machine\/Button"\s+arguments="\{([^}]*)\}"/g
	)].map((m) => m[1]);
	const bedienteilNamen = new Set(aufrufe.map((arg) => {
		const key = /key:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		const labelKey = /labelKey:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		const ariaLabelKey = /ariaLabelKey:\s*'([^']*)'/.exec(arg)?.[1] ?? '';
		void key;
		const wirksamerSchluessel = ariaLabelKey !== '' ? ariaLabelKey : labelKey;
		return xliffKarte.get(wirksamerSchluessel) ?? '';
	}).filter((name) => name !== ''));
	check(soundName !== null && !bedienteilNamen.has(soundName),
		'sein Name unterscheidet sich von allen zwölf Bedienteilnamen'
		+ ` (${soundName === null ? 'kein Name gefunden' : `"${soundName}"`})`);

	const cssKopf = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const katalogStart = cssKopf.indexOf('DIE HAKEN, DIE SPÄTERE PHASEN SETZEN');
	const katalogEnde = cssKopf.indexOf('DIE BLITZSICHERHEIT IST HIER BAULICH VORBEREITET');
	const katalogText = katalogStart !== -1 && katalogEnde !== -1
		? cssKopf.slice(katalogStart, katalogEnde) : '';
	check(/\.fr-sound--on\b/.test(katalogText),
		'.fr-sound--on steht im Haken-Katalog von machine.css (A-19 zählt sie bereits mit)');
}

/* =============================== A-29 Die Frequenzgrenze gilt auch für das Einladungsblinken */

console.log('\nA-29 Das Einladungsblinken passiert dieselbe 3-Hz-Grenze wie die Leitern (Behebungslauf [H4])');
{
	/*
	 * A-17 prüft an dieser Lage bisher nur, dass KEINE transition gesetzt
	 * ist, und erklärt animation ausdrücklich für erlaubt — das begrenzt
	 * aber nicht, WIE SCHNELL diese animation blinken darf. Anders als die
	 * drei Leitern (risk-timing.js, jede Kurve endet auf
	 * Math.max(SIDE_MIN_MS, …)) läuft das Einladungsblinken an dieser
	 * Klammer vollständig vorbei: es ist eine reine CSS-Zahl. Anders als bei
	 * einer laufenden Leiter blinken hier zudem ALLE ACHT Tasten gleichzeitig
	 * — die Fläche ist größer, die Grenze gilt trotzdem unverändert
	 * (Behebungslauf REVIEW-fruitrisk-f5.md [H4]).
	 */
	const cssRoh = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = cssRoh.indexOf('*/') + 2;
	const regelteil = ohneBlockKommentare(cssRoh.slice(kopfEnde));

	// Die Zeitfunktion steps(…) steht bereits WÖRTLICH im Suchmuster: findet
	// dieser Treffer überhaupt etwas, ist damit zugleich belegt, dass die
	// animation SPRINGT statt zu überblenden — ease/linear/cubic-bezier(…)
	// würden das Muster gar nicht erst treffen.
	const animMuster = /\.fr-btn--invite\s+\.fr-btn__cap::after\s*\{[^}]*animation\s*:\s*fr-btn-invite\s+([\d.]+)(m?s)\s+steps\([^)]*\)/;
	const animTreffer = animMuster.exec(regelteil);
	check(animTreffer !== null,
		'die animation-Deklaration der Einladungslage (.fr-btn--invite .fr-btn__cap::after) gefunden, mit'
		+ ' steps(…) als Zeitfunktion — sie springt, statt zu überblenden');

	if (animTreffer !== null) {
		const [, zahl, einheit] = animTreffer;
		const dauerMs = einheit === 'ms' ? Number(zahl) : Number(zahl) * 1000;
		const blitzeJeSekunde = 1000 / dauerMs;
		check(blitzeJeSekunde <= 3,
			`die animation-duration (${dauerMs} ms) ergibt höchstens drei Blitze je Sekunde`
			+ ` (gefunden: ${blitzeJeSekunde.toFixed(2)} je Sekunde)`);

		// GEGENPROBE: dieselbe Formel muss bei einer zu kurzen Dauer tatsächlich
		// rot werden können. 200 ms ergäben 5 Blitze je Sekunde, klar über der
		// Grenze — die Prüfung oben ist also keine, die niemals fehlschlagen kann.
		const gegenprobeDauerMs = 200;
		const gegenprobeBlitze = 1000 / gegenprobeDauerMs;
		check(!(gegenprobeBlitze <= 3),
			`GEGENPROBE A-29: dieselbe Formel würde bei ${gegenprobeDauerMs} ms Dauer`
			+ ` (${gegenprobeBlitze} Blitze/s) rot werden`);
	}

	// Zweitens: die @keyframes selbst erzeugen ausschließlich Sprungwerte
	// (0 oder 1), keinen Zwischenwert der Deckkraft. Ein künftiger Wechsel
	// auf einen Zwischenwert (etwa opacity: 0.5) würde aus dem Springen ein
	// Überblenden machen, ohne dass A-17 (das nur transition ausschließt)
	// das bemerken würde.
	function extrahiereKeyframes(css, name) {
		const start = css.indexOf(`@keyframes ${name}`);
		if (start === -1) {
			return null;
		}
		const blockStart = css.indexOf('{', start);
		let tiefe = 1;
		let i = blockStart + 1;
		while (tiefe > 0 && i < css.length) {
			if (css[i] === '{') tiefe++;
			else if (css[i] === '}') tiefe--;
			i++;
		}
		return css.slice(blockStart + 1, i - 1);
	}

	const keyframesInhalt = extrahiereKeyframes(regelteil, 'fr-btn-invite');
	check(keyframesInhalt !== null, '@keyframes fr-btn-invite im Regelteil gefunden');
	if (keyframesInhalt !== null) {
		const opazitaeten = [...keyframesInhalt.matchAll(/opacity\s*:\s*([\d.]+)/g)].map((m) => Number(m[1]));
		check(opazitaeten.length > 0, 'mindestens ein opacity-Wert in @keyframes fr-btn-invite gefunden');
		check(opazitaeten.every((wert) => wert === 0 || wert === 1),
			'jeder opacity-Wert in @keyframes fr-btn-invite ist entweder 0 oder 1, kein Zwischenwert'
			+ ` (gefunden: ${opazitaeten.join(', ')})`);
	}
}

/* ===================================================================== A-30
   Kontrast (SC 1.4.3) — ohne Browser, aus tokens.css und machine.css
   ===================================================================== */

/*
 * Behebungslauf 2026-09-05 (AUDITREPORT-2026-09-05.md, Befund N-01): "START"
 * erreichte 2,4:1 statt 4,5:1, weil axe-core diese Stelle wegen des
 * `background-image`-Verlaufs als "unentschieden" durchließ (siehe
 * Auditbericht, Abschnitt "Verfahrenshinweis") — kein Prüfskript dieses
 * Projekts hätte den Fehler vorher gefangen. A-30 schließt genau diese
 * Lücke, so weit das ohne gerenderte Pixel geht: Text- und
 * Hintergrundfarbe(n) kommen NICHT aus einer Annahme, sondern werden aus
 * den tatsächlichen CSS-Regeln und den tatsächlichen Token-Werten gelesen,
 * und geprüft wird gegen JEDEN benannten Farbstopp eines Verlaufs — der
 * Mindestwert über alle Stopps ist der Kontrast an der Stelle, die für die
 * TATSÄCHLICHE Schriftfarbe am ungünstigsten ist (bei dunkler Schrift ist
 * das rechnerisch immer der dunkelste Stopp, bei heller Schrift immer der
 * hellste — die Prüfung entscheidet das nicht durch eine Annahme über
 * "hell" oder "dunkel", sondern indem sie den Kontrast gegen JEDEN Stopp
 * tatsächlich ausrechnet und das Minimum nimmt; die Gegenprobe unten
 * belegt, dass das für beide Richtungen richtig funktioniert).
 *
 * NACHTRAG (noch am 2026-09-05, nach Hinweis): ein erster Entwurf prüfte
 * stattdessen nur gegen den HELLSTEN Stopp, weil ein Test mit "jeder
 * Stopp" mehrere tatsächlich lesbare Tasten (STOP, AUTO MODE, REWARD, CASH
 * OUT, die Aufladeknöpfe) als gescheitert meldete. Das war die FALSCHE
 * Lehre daraus: der hellste Stopp ist für eine dunkle Schrift der
 * GÜNSTIGSTE, nicht der ungünstigste Fall — eine Prüfung, die nur den
 * günstigsten Fall ansieht, kann eine echte Schwäche im dunklen Teil eines
 * Verlaufs prinzipiell nicht finden. Die richtige Lehre: die Prüfung muss
 * TATSÄCHLICH jeden Stopp gegen die TATSÄCHLICHE Schriftfarbe ausrechnen.
 * CASH OUT stellte sich dabei als echter, jetzt behobener zweiter Fund
 * heraus (4,09:1 am dunklen Stopp, siehe unten); was bei STOP, AUTO MODE,
 * REWARD und den Aufladeknöpfen an ihrem jeweils dunkelsten Stopp
 * rechnerisch übrig bleibt, wird jetzt als eigener Befund gemeldet statt
 * verschwiegen (siehe die Prüfungsmeldungen unten und den Bericht).
 *
 * GRENZE DIESER PRÜFUNG (ehrlich benannt, wie der Auditbericht selbst eine
 * benennt): ein `radial-gradient`/`linear-gradient` kann zwischen zwei
 * benannten Stopps beliebig interpolieren; diese Prüfung kennt nur die
 * benannten Stopps selbst. Für zwei Farbstopps ist das ausreichend, weil
 * die Leuchtdichte zwischen ihnen monoton verläuft (kein Extremum
 * dazwischen) — die beiden benannten Stopps SIND die Extremwerte des
 * Verlaufs. Ob der tatsächlich GERENDERTE Text (abhängig von
 * Kappengeometrie, Mittelpunkt des radial-gradient, Textposition) den
 * dunkelsten Punkt überhaupt erreicht, weiß nur eine Messung an echten
 * Bildpunkten (siehe N-01: dort reichte der Text nicht bis zum dunklen
 * Stopp, das Ergebnis blieb trotzdem korrekt behebungsbedürftig, weil schon
 * der HELLE Stopp scheiterte). Diese Prüfung ersetzt deshalb nicht die
 * Bildpunktmessung des Auditberichts, sie ergänzt sie um einen Fall, den
 * axe-core bauartbedingt nicht entscheiden kann.
 *
 * Auch KEIN Ersatz für die "große Text"-Ausnahme (3:1 statt 4,5:1 ab 18,66 px
 * fett oder 24 px): alle hier geprüften Aufschriften sind klein und nicht
 * fett, deshalb gilt hartkodiert 4,5:1. Eine künftige Taste mit großer
 * Schrift bräuchte eine eigene Ausnahme in dieser Liste.
 */
console.log('\nA-30 Kontrast (SC 1.4.3): jede Tastenbeschriftung gegen den ungünstigsten Farbstopp ihres Untergrunds');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	const cssMaschine = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/machine.css')));

	function leuchtdichte([r, g, b]) {
		const f = (v) => {
			const x = v / 255;
			return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	}
	function kontrast(c1, c2) {
		const l1 = leuchtdichte(c1);
		const l2 = leuchtdichte(c2);
		const [hell, dunkel] = l1 >= l2 ? [l1, l2] : [l2, l1];
		return (hell + 0.05) / (dunkel + 0.05);
	}
	function hexZuRgb(hex) {
		return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
	}

	// Löst einen --ck-…-Token aus einer Tokens-Quelle in eine oder mehrere
	// RGB-Farben auf. Ein einfacher Token (#hex, rgb()/rgba()) liefert genau
	// eine Farbe; ein zusammengesetzter Token (ein Verlauf wie
	// --ck-chrome-polish, der selbst wieder --ck-…-Tokens benennt) liefert
	// die Farbe JEDES darin benannten Tokens — genau die Stopps, über die
	// A-30 rechnet.
	function tokenFarben(quelle, token, tiefe = 0) {
		if (tiefe > 6) return [];
		const muster = new RegExp(`(?:^|[\\s;{])${token}\\s*:\\s*([^;]+);`, 'm');
		const treffer = muster.exec(quelle);
		if (!treffer) return [];
		const wert = treffer[1];
		const hex = /#([0-9a-fA-F]{6})\b/.exec(wert);
		if (hex) return [hexZuRgb(hex[1])];
		const rgb = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/.exec(wert);
		if (rgb) return [[Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]];
		const verschachtelt = [...wert.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]);
		return verschachtelt.flatMap((t) => tokenFarben(quelle, t, tiefe + 1));
	}

	// Schneidet den Rumpf EINER exakten Regel aus dem Regelteil (dieselbe
	// Klammerzählung wie extrahiereKeyframes() oben, nur für eine
	// Selektor-Regel statt eine @keyframes-Regel).
	function regelRumpf(css, selektor) {
		const escaped = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// KEIN "m"-Flag: "^" soll den Stringanfang meinen, nicht jeden
		// Zeilenanfang — sonst matcht ".fr-sound" faelschlich auch als
		// LETZTES Glied einer kommagetrennten Selektorliste (etwa der
		// Sammelregel aus Abschnitt 2), weil dort eine eigene Zeile beginnt,
		// obwohl kein "}" davorsteht (Fund beim Bau dieser Pruefung).
		const muster = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{`);
		const treffer = muster.exec(css);
		if (!treffer) return null;
		let i = css.indexOf('{', treffer.index) + 1;
		let tiefe = 1;
		const start = i;
		while (i < css.length && tiefe > 0) {
			if (css[i] === '{') tiefe++;
			else if (css[i] === '}') tiefe--;
			i++;
		}
		return css.slice(start, i - 1);
	}
	function eigenschaftsWert(rumpf, eigenschaft) {
		const muster = new RegExp(`${eigenschaft}\\s*:\\s*([^;]+);`, 'm');
		const treffer = muster.exec(rumpf);
		return treffer ? treffer[1] : null;
	}
	// Textfarbe UND Hintergrundfarben eines Bedienteils, gelesen aus zwei
	// (ggf. gleichen) Selektoren im tatsächlichen Regelteil — keine
	// angenommenen Tokennamen.
	function farbenEinesBedienteils(textSelektor, hintergrundSelektor, hintergrundEigenschaft) {
		const textRumpf = regelRumpf(cssMaschine, textSelektor);
		const hintergrundRumpf = regelRumpf(cssMaschine, hintergrundSelektor);
		if (!textRumpf || !hintergrundRumpf) return null;
		const textWert = eigenschaftsWert(textRumpf, 'color');
		const hgWert = eigenschaftsWert(hintergrundRumpf, hintergrundEigenschaft);
		if (!textWert || !hgWert) return null;
		const textToken = /var\((--ck-[a-z0-9-]+)\)/.exec(textWert)?.[1];
		const textFarben = textToken ? tokenFarben(tokensCss, textToken) : [];
		const hgTokens = [...hgWert.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]);
		const hgFarben = hgTokens.flatMap((t) => tokenFarben(tokensCss, t));
		return { textFarben, hgFarben };
	}

	// Alle vier Tasten mit .fr-btn__label (START/STOP/AUTO MODE/REWARD)
	// teilen sich seit dem zweiten Nachtrag zu N-01 dieselbe Namensschild-
	// Regel .fr-btn:not(.fr-btn--lit) .fr-btn__label — "hg" zeigt deshalb
	// bei allen vieren auf genau diese eine Regel.
	const NAMENSSCHILD_BTN = '.fr-btn:not(.fr-btn--lit) .fr-btn__label';
	const PRUEFUNGEN = [
		{ name: 'START (Ruhelage, nach dem Behebungslauf N-01)',
			text: '.fr-btn__label', hg: NAMENSSCHILD_BTN, eig: 'background-color' },
		{ name: 'STOP (nach dem Behebungslauf N-01, Nachtrag)',
			text: '.fr-btn__label', hg: NAMENSSCHILD_BTN, eig: 'background-color' },
		{ name: 'AUTO MODE (nach dem Behebungslauf N-01, Nachtrag)',
			text: '.fr-btn__label', hg: NAMENSSCHILD_BTN, eig: 'background-color' },
		{ name: 'REWARD (nach dem Behebungslauf N-01, Nachtrag)',
			text: '.fr-btn__label', hg: NAMENSSCHILD_BTN, eig: 'background-color' },
		{ name: 'RISK/RISK x4/RISK x8 START (Starttasten der Risikogruppen)',
			text: '.fr-btn__label', hg: NAMENSSCHILD_BTN, eig: 'background-color' },
		{ name: 'CASH OUT (Ruhelage, nach dem Behebungslauf Nachtrag zu N-01)',
			text: '.fr-cashout', hg: '.fr-cashout__label', eig: 'background-color' },
		{ name: 'TON (nach dem Behebungslauf N-01, Nachtrag)',
			text: '.fr-sound', hg: '.fr-sound__label', eig: 'background-color' },
		{ name: 'Aufladeknöpfe (+10/+100/+500, nach dem Behebungslauf N-01, Nachtrag)',
			text: '.fr-coinslot__button', hg: '.fr-coinslot__button-label', eig: 'background-color' },
	];

	// Kontrast gegen JEDEN gefundenen Farbstopp, das Minimum ist der
	// ungünstigste Fall für die TATSÄCHLICHE Schriftfarbe dieses
	// Bedienteils — kein Rateschritt über "hell" oder "dunkel", sondern
	// eine echte Rechnung gegen jeden Stopp (siehe Kommentar oben).
	for (const p of PRUEFUNGEN) {
		const farben = farbenEinesBedienteils(p.text, p.hg, p.eig);
		if (!farben || farben.textFarben.length === 0 || farben.hgFarben.length === 0) {
			check(false, `${p.name}: Text- und Hintergrundfarbe aus machine.css gelesen`,
				`Selektoren nicht gefunden oder ohne auflösbaren Token (Text: ${p.text}, Hintergrund: ${p.hg})`);
			continue;
		}
		const [textFarbe] = farben.textFarben;
		const werte = farben.hgFarben.map((hg) => kontrast(textFarbe, hg));
		const ungünstigsterIndex = werte.indexOf(Math.min(...werte));
		const ungünstigster = werte[ungünstigsterIndex];
		check(ungünstigster >= 4.5,
			`${p.name}: ungünstigster von ${werte.length} Farbstopp(s) `
			+ `${ungünstigster.toFixed(2)}:1 (Soll ≥ 4,5:1)`
			+ (ungünstigster < 4.5 ? ` — UNTER der Schwelle` : ''));
	}

	// GEGENPROBE A: dieselbe Rechnung (dieselben Funktionen, keine zweite
	// Implementierung) muss rot werden, wenn "START" wie vor dem
	// Behebungslauf ohne das Namensschild direkt auf der roten Kappe läge —
	// mit den ECHTEN Farbwerten dieses Geräts, gegen BEIDE Stopps (das
	// Minimum ist der dunkle Stopp, --ck-bakelite-red, nicht der helle).
	// Fällt diese Gegenprobe nicht mehr rot aus, hat sich der Kappenverlauf
	// so geändert, dass A-30 neu bewertet werden muss.
	{
		const textFarbe = tokenFarben(tokensCss, '--ck-chrome-500')[0];
		const stopps = [
			...tokenFarben(tokensCss, '--ck-bakelite-red-light'),
			...tokenFarben(tokensCss, '--ck-bakelite-red'),
		];
		const ungünstigster = Math.min(...stopps.map((s) => kontrast(textFarbe, s)));
		check(ungünstigster < 4.5,
			`GEGENPROBE A-30-A: dieselbe Rechnung wird rot für die ursprüngliche, unbehobene`
			+ ` Kombination (--ck-chrome-500 direkt auf der roten Kappe, beide Stopps geprüft)`
			+ ` — gefunden: ${ungünstigster.toFixed(2)}:1, unter 4,5:1`);
	}

	// GEGENPROBE B: die Rechnung darf NICHT von einer Annahme "Schrift ist
	// dunkel" abhängen — sie muss auch für eine HELLE Schrift den
	// tatsächlich ungünstigen Stopp finden, und das ist dort der HELLE, nicht
	// der dunkle. Erfundene Werte, bewusst NICHT aus tokens.css (keine reale
	// Kombination dieses Geräts — dieses Gerät hat nirgends helle Schrift auf
	// einem Verlauf): Schrift (240,240,240), Stopp A (225,225,225) — sehr
	// hell, scheitert erwartbar —, Stopp B (40,40,40) — dunkel, bestände für
	// sich genommen komfortabel. Eine Prüfung, die pauschal "bei heller
	// Schrift den dunkelsten Stopp nehmen" täte, verfehlte diesen Fehlschlag
	// exakt so, wie die ursprüngliche "immer den hellsten"-Regel ihn bei
	// dunkler Schrift verfehlt hätte.
	{
		const helleSchrift = [240, 240, 240];
		const stoppHell = [225, 225, 225];
		const stoppDunkel = [40, 40, 40];
		const kontrastHell = kontrast(helleSchrift, stoppHell);
		const kontrastDunkel = kontrast(helleSchrift, stoppDunkel);
		const ungünstigster = Math.min(kontrastHell, kontrastDunkel);
		check(kontrastHell < 4.5 && kontrastDunkel >= 4.5 && ungünstigster === kontrastHell,
			`GEGENPROBE A-30-B: für eine erfundene HELLE Schrift erkennt dieselbe Rechnung den`
			+ ` HELLEN Stopp als ungünstigsten (${kontrastHell.toFixed(2)}:1, unter 4,5:1), obwohl`
			+ ` der dunkle Stopp für sich genommen bestünde (${kontrastDunkel.toFixed(2)}:1) —`
			+ ` die Rechnung nimmt tatsächlich das Minimum, keine Annahme über "hell" oder`
			+ ` "dunkel"`);
	}
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Gerät zeichnet ausschließlich mit'
	+ '\nDesign-Tokens, lädt keine Datei von außen, casino_startpage kennt es nicht'
	+ '\nim Code, die Lizenzangaben stimmen überein, alle zwölf Symbole sind intakt'
	+ '\nund zeichengleich (acht zum Original, alle zwölf zwischen Miniatur und'
	+ '\ngroßem Gehäuse), der Gehäuse-Vertrag der Saal-Miniatur ist erfüllt, das'
	+ '\ngroße Gehäuse steht in seinem eigenen, vollständigen Maßraster, das'
	+ '\nKürzel-Präfix fr- wird eingehalten, die Anmeldung bei der Registry stimmt,'
	+ '\ndas Gehäuse ist barrierefrei vorbereitet und liefert weiterhin genau vier'
	+ '\nleere Live-Bereiche aus, es besteht keine Abhängigkeit auf ein anderes Gerät,'
	+ '\nMiniatur und großes Gehäuse zeigen dasselbe, jedes Bedienteil hat einen'
	+ '\neigenen Namen, die Risiko-Tasten leuchten bernstein und ohne Übergang, der'
	+ '\nHaken-Katalog deckt sich mit dem Regelteil, und der Gewinnplan trägt seine'
	+ '\nZahlen ausschließlich aus Rules.php ein. Das Gerät sieht fertig aus. AUTO MODE'
	+ '\nist als Umschalter (toggle: 1, aria-pressed) verdrahtet, und genau die elf'
	+ '\nRisiko-Bedienteile rufen Machine/Button.html mit disabled: 1 auf — sie liefern'
	+ '\naria-disabled="true" aus, weil beim Laden nie ein Angebot besteht (N-05).'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
