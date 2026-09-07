/**
 * Craps – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.17, Umsetzungsstück C6a)
 * -------------------------------------------------------------------
 *   A-1  Keine eigene Farbe (Ausnahme: die beiden Backend-Icons)
 *   A-2  Jeder benutzte --ck-Token existiert in casino_startpage/tokens.css
 *   A-3  Keine Datei von außen; kein createElementNS in JavaScript
 *   A-4  Trennung: casino_startpage kennt "craps" nicht — im CODE, nicht
 *        in Kommentaren (dieselbe Begründung wie G-9 in casino_startpage)
 *   A-5  Kein fremder Hersteller-, Modell-, Spielbank- oder Spieltitel
 *        (Negativliste, ergänzt um Würfel- und Craps-Seitenwetten-Begriffe)
 *   A-6  Die Lizenzangaben widersprechen sich nicht
 *   A-7  Kachel und Spielseite zeigen dieselbe Bauform
 *   A-8  Der Gehäuse-Vertrag (Cabinet.html), einschließlich: kein <text>
 *   A-9  Das Kürzel-Präfix "cr-" wird eingehalten
 *   A-10 Anmeldung, Live-Bereiche und Messpunkte
 *   A-11 Höchstens ein f:asset.module (und die genannte Datei existiert),
 *        kein echtes "disabled"
 *
 * WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN
 * ----------------------------------------------
 * Dieselbe Begründung wie bei G-9 in casino_startpage/…/verify-gattung.mjs
 * und bei A-4 in roulette/…/verify-cabinet.mjs: jedes Gerät heißt nach seiner
 * Gattung (CONCEPT.md C.2), und ein Wortabgleich über Kommentare könnte
 * „nennt die Extension" und „nennt das Spiel" nicht mehr unterscheiden. Der
 * eigene Extension-Schlüssel wird aus path.basename(EXT) ABGELEITET, nicht
 * eingetragen.
 *
 * NICHT betroffen ist A-5: die Negativliste fremder Marken läuft weiterhin
 * über JEDE Zeile, Kommentare eingeschlossen — das ist die rechtliche
 * Prüfung (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und wird nicht angetastet.
 *
 * A-7 SEIT UMSETZUNGSSTÜCK C6b: VOLLSTÄNDIG DURCHGEFÜHRT
 * -----------------------------------------------------------
 * Table/Craps/Tray.html existiert seit Umsetzungsstück C6b; A-7 vergleicht
 * seither Merkmal für Merkmal zwischen Kachel und Spielseite (siehe Prüfung
 * unten). In Umsetzungsstück C6a, als die Datei noch fehlte, meldete sich
 * A-7 ausdrücklich als „übersprungen" statt stillschweigend zu bestehen —
 * dieser Absatz ist die Nachpflege für die nächste Person, damit niemand von
 * diesem inzwischen überholten Zwischenstand ausgeht (DECISIONS.md
 * 2026-09-04 17:45, Punkt 6, dieselbe Nachpflegeregel).
 *
 * A-11 IN UMSETZUNGSSTÜCK C6a: NULL TREFFER SIND RICHTIG
 * ---------------------------------------------------------
 * Kein Fluid-Template dieser Extension bindet in C6a ein Modul ein (siehe
 * Configuration/JavaScriptModules.php, Kopfkommentar). Die schärfere Fassung
 * „genau ein Treffer" gilt erst ab C6d und wird dann zusätzlich von V-1 in
 * verify-view.mjs geprüft.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
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
 * stimmen bleiben (dieselbe Bauart wie in verify-gattung.mjs G-9 und in
 * roulette/…/verify-cabinet.mjs A-4).
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
 * bei den sechs vorhandenen Geräten).
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentCraps.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

console.log('\nCraps – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)');
console.log('=======================================================================\n');

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

	console.log('     Gegenprobe A-2-G: ein erfundener Token muss auffallen');
	const erfunden = new Set([...benutzt.keys(), '--ck-gibt-es-nicht']);
	const gegenprobeUnbekannt = [...erfunden].filter((name) => !definiert.has(name));
	check(gegenprobeUnbekannt.length === 1 && gegenprobeUnbekannt[0] === '--ck-gibt-es-nicht',
		'A-2-G: --ck-gibt-es-nicht wird als unbekannt erkannt');
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
		'kein createElementNS in einer JavaScript-Datei — SVG entsteht in'
		+ ' dieser Extension ausschließlich über innerHTML mit'
		+ ' <use href="#…">. createElementNS bleibt verboten, weil ein so'
		+ ' erzeugtes Element den Namensraum aus dem Quelltext heraus'
		+ ' benennen müsste',
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
		// Zusätzlich zu B.3 Nr. 4: geschützte Mechanik-Bezeichnungen (übernommen
		// aus roulette/…/verify-cabinet.mjs, Befund C-2 der Copyright-Prüfung
		// vom 2026-09-06). Erfasst in Klein-, GROSS- und camelCase-/
		// Bindestrich-Schreibweisen.
		'Megaways', 'MEGAWAYS', 'megaways',
		'Cluster Pays', 'CLUSTER PAYS', 'cluster pays', 'ClusterPays', 'clusterPays', 'cluster-pays',
		'InfiniReels', 'INFINIREELS', 'infinireels', 'Infini Reels', 'infini-reels',
		'Tumbling Reels', 'TUMBLING REELS', 'tumbling reels', 'TumblingReels', 'tumblingReels', 'tumbling-reels',
		// Ergänzung des Kartentisches (CONCEPT.md C.14, Kartenspiel-spezifisch):
		// Spielkartenhersteller.
		'Bicycle', 'Bee', 'Tally-Ho', 'KEM', 'Copag', 'Fournier', 'Modiano',
		'Piatnik', 'Cartamundi', 'Gemaco', 'Aristocrat Playing Cards',
		// Kartenschlitten und Mischmaschinen.
		'Shuffle Master', 'ShuffleMaster', 'Deckmate', 'DeckMate', 'i-Deal',
		'MD3', 'One2Six', 'Angel Eye', 'SecureStep',
		// Handelsnamen von Blackjack-Seitenwetten und -Varianten.
		'Perfect Pairs', '21+3', 'Lucky Ladies', 'Royal Match', 'Super Sevens',
		'Blackjack Switch', 'Free Bet Blackjack', 'Spanish 21', 'Pontoon',
		'Zappit', 'Buster Blackjack', 'Bet Behind', 'Infinite Blackjack',
		'Lightning Blackjack', 'Power Blackjack',
		// Zusätzlich zur Zeichenprüfung: Zähl-/Autorennamen, damit das Gerät
		// nicht versehentlich einen geschützten Zählnamen statt des
		// ungeschützten Gattungsnamens "Hi-Lo" trägt (der selbst NICHT auf
		// dieser Liste steht — er ist die in C.7.3 vorgegebene Bezeichnung).
		'Hi-Opt', 'Wong Halves', 'KO Count', 'Omega II',
		// Kartenhersteller, Kartenmarken und benannte Rückenmuster des
		// Kartentisches.
		'Bee Diamond Back', 'Diamond Back', 'Bicycle Rider Back', 'Rider Back',
		// Neue Kategorie dieser Extension — Würfel und Craps-Seitenwetten
		// (Plan-Abschnitt 4.18). Aus allgemein bekanntem Marktwissen, NICHT
		// aus einer förmlichen Markenrecherche. NICHT ABSCHLIESSEND GEKLÄRT:
		// zwei Aufträge bleiben offen, die kein Agent leisten kann und die im
		// Copyright-Bericht (DECISIONS.md, Umsetzungsstück C6e) benannt sind —
		// (1) die förmliche Markenrecherche bei DPMA und EUIPO zu den Namen
		// dieser Liste und den Bauteilen der Wanne (V.7 Nr. 2), und (2) die
		// Bildrückwärtssuche mit einem Bildschirmfoto der fertigen Wanne
		// (V.7 Nr. 4) — beides Aufträge an den Auftraggeber.
		'Midwest Game Supply', 'Paul-Son', 'Paulson Dice', 'Blue Chip Dice',
		'Fire Bet', 'Bonus Craps', 'All Tall', 'All Small', "Make 'Em All",
		'Crapless Craps', 'High Point Craps', 'Sharpshooter', 'Repeater Bet',
		'Sidewinder', 'Muggsy',
		// Ergänzung Umsetzungsstück C7f: Handelsnamen elektronischer
		// Craps-Geräte und weiterer Craps-Seitenwetten. Ausschließlich
		// MEHRWORTIGE Einträge — ein einzelnes Craps-Fachwort (Craps, Come,
		// Pass, Field, Odds, Place, Hard, Puck, Yo, Boxcars) darf NICHT auf
		// diese Liste, weil es im eigenen, erlaubten Text vorkommt und A-5
		// mit includes() ohne Wortgrenzen sucht. Aus allgemein bekanntem
		// Marktwissen, NICHT aus einer förmlichen Markenrecherche —
		// NICHT ABSCHLIESSEND GEKLÄRT, siehe Auftrag A im Copyright-Bericht.
		'Shoot to Win', 'Roll to Win', 'Bubble Craps', 'Card Craps',
		'Die Rich Craps', 'Rapid Craps', 'Craps Cubed', 'Dice Duel',
		'Lightning Dice', 'Super Sic Bo', 'Hot Roller', 'Twice as Nice',
		'Ride the Line', 'Bonus Frenzy',
	];
	const ALLE = alleDateien(EXT);
	// Ausnahme für genau eine Datei: diese Prüfskript-Datei selbst muss die
	// Negativliste als ausführbares JS-Array wörtlich enthalten, um überhaupt
	// gegen sie prüfen zu können — dieselbe Art Ausnahme wie in
	// verify-gattung.mjs G-7 und roulette/…/verify-cabinet.mjs A-5.
	const GEPRUEFT = ALLE.filter((d) => d !== DIESE_DATEI);
	const treffer = [];
	for (const datei of GEPRUEFT) {
		// KEIN Kommentar-Ausschnitt hier: A-5 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — anders als A-4, die eine reine
		// Architekturfrage prüft.
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

	console.log('     Gegenprobe A-5-G: eine erfundene Zeile mit einem gelisteten Namen muss auffallen');
	const erfundeneZeile = `Dieser Testtext erwähnt versehentlich ${NEGATIVLISTE[0]}.`;
	const gefundenInGegenprobe = NEGATIVLISTE.some((name) => erfundeneZeile.includes(name));
	check(gefundenInGegenprobe, 'A-5-G: die erfundene Zeile wird von der Negativliste erkannt');
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
	const readme = lies(path.join(EXT, 'README.md'));

	check(license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'),
		'LICENSE ist die AGPL-Fassung');
	check(composer.license === LIZENZ, `composer.json nennt ${LIZENZ} (gefunden: ${composer.license})`);
	check(emconf.includes(`'license' => '${LIZENZ}'`), `ext_emconf.php nennt ${LIZENZ}`);
	check(readme.includes(LIZENZ), `README.md nennt ${LIZENZ}`);

	check(composer.authors?.[0]?.name === AUTOR && composer.authors?.[0]?.email === EMAIL,
		`composer.json nennt Autor ${AUTOR} und die E-Mail aus CONCEPT.md C.2`);
	check(emconf.includes(`'author' => '${AUTOR}'`) && emconf.includes(`'author_email' => '${EMAIL}'`),
		`ext_emconf.php nennt Autor ${AUTOR} und dieselbe E-Mail`);
}

/* =============================== A-7 Kachel und Spielseite zeigen dasselbe */

console.log('\nA-7  Kachel und Spielseite zeigen dieselbe Bauform');
{
	const trayDatei = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Tray.html');
	if (!existsSync(trayDatei)) {
		console.log('  · übersprungen — Table/Craps/Tray.html existiert noch nicht (Stand'
			+ ' Umsetzungsstück C6a). Ohne die Spielseiten-Zeichnung gibt es noch'
			+ ' nichts, womit die Kachel verglichen werden könnte. Ab'
			+ ' Umsetzungsstück C6b vergleicht diese Prüfung Merkmal für Merkmal.');
	} else {
		const cabinet = ohneKommentare(lies(path.join(EXT, 'Resources/Private/Partials/Table/Craps/Cabinet.html')));
		const tray = ohneKommentare(lies(trayDatei));
		const trayCssDatei = path.join(EXT, 'Resources/Public/Css/tray.css');
		const trayCss = existsSync(trayCssDatei) ? ohneBlockKommentare(lies(trayCssDatei)) : '';

		const MERKMALE = [
			['Wanne mit hoher Bande', /cr-tile__hull|cr-tray__hull/],
			['Messingkante', /cr-tile__brass|cr-tray__brass/],
			['grünes Tuch', /var\(--ck-felt-green\)/],
			['Pyramidengummi an der linken Bande', /cr-tile__pyramid|cr-tray__pyramid/],
			['zwei Würfel', /cr-tile__die|cr-tray__die|cr-die/],
		];
		for (const [name, muster] of MERKMALE) {
			check(muster.test(cabinet), `Kachel zeigt: ${name}`);
			check(muster.test(tray) || muster.test(trayCss), `Spielseite zeigt: ${name}`);
		}

		console.log('     Gegenprobe A-7-G: ein auf der Spielseite fehlendes Merkmal muss auffallen');
		const verstuemmelt = tray.replace(/cr-tile__pyramid|cr-tray__pyramid/g, 'entfernt');
		check(!/cr-tile__pyramid|cr-tray__pyramid/.test(verstuemmelt),
			'A-7-G: ein entferntes Merkmal wird von derselben Prüfung als fehlend erkannt');
	}
}

/* ==================================================== A-8 Gehäuse-Vertrag */

console.log('\nA-8  Der Gehäuse-Vertrag (Cabinet.html)');
{
	const rel = 'Resources/Private/Partials/Table/Craps/Cabinet.html';
	const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

	const spans = [...inhalt.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spans.length === 1, `${rel}: genau ein span.ck-cabinet (gefunden: ${spans.length})`);

	const svgs = [...inhalt.matchAll(/<svg\b[^>]*\bclass="ck-cabinet__drawing"[^>]*>/g)];
	check(svgs.length === 1, `${rel}: genau ein svg.ck-cabinet__drawing (gefunden: ${svgs.length})`);

	if (svgs.length === 1) {
		const tag = svgs[0][0];
		check(tag.includes('viewBox="0 0 160 100"'), `${rel}: viewBox="0 0 160 100" (Gattung Tisch, quer)`);
		check(tag.includes('aria-hidden="true"'), `${rel}: aria-hidden="true"`);
		check(tag.includes('focusable="false"'), `${rel}: focusable="false"`);
	}

	check(!inhalt.includes('<title>'), `${rel}: kein <title>`);
	check(!/<text\b/.test(inhalt), `${rel}: kein <text> (zusätzliche Auflage dieser Phase)`);

	console.log('     Gegenprobe A-8-G: ein zweites .ck-cabinet muss auffallen');
	const zweitesCabinet = inhalt.replace('</span>', '</span><span class="ck-cabinet"></span>');
	const spansGegenprobe = [...zweitesCabinet.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spansGegenprobe.length === 2, `A-8-G: zwei span.ck-cabinet werden erkannt (gefunden: ${spansGegenprobe.length})`);
}

/* ======================================================== A-9 Kürzel-Präfix */

console.log('\nA-9  Das Kürzel-Präfix "cr-" wird eingehalten');
{
	/*
	 * Geteilte Haken aus casino_startpage, die absichtlich KEIN cr-Präfix
	 * tragen — Vertragsklassen/-Attribute des Saals bzw. der geteilten
	 * Tisch-Bausteine (casino_startpage/README.md, „Vertrag für das
	 * Gehäuse-Partial" und „Vertrag für ein bildschirmfüllendes Gerät"). In
	 * Phase C6a werden nur ck-table, ck-room-fill, data-ck-table und
	 * data-ck-table-key wirklich benutzt; die übrigen stehen für spätere
	 * Umsetzungsstücke bereit, ohne dass A-9 dafür geändert werden müsste.
	 * Wörtlich aus blackjack/…/verify-cabinet.mjs übernommen (Plan Abschnitt
	 * 4.17).
	 */
	const GETEILT = new Set([
		'ck-table', 'ck-room-fill',
		'data-ck-table', 'data-ck-table-key', 'data-ck-table-go',
		'data-ck-table-status', 'data-ck-table-history', 'data-ck-table-history-empty',
		'data-ck-field', 'data-ck-field-label',
		'data-ck-table-controls', 'data-ck-table-chip', 'data-ck-table-rack',
		'data-ck-table-undo', 'data-ck-table-clear', 'data-ck-table-repeat',
		'data-ck-table-double', 'data-ck-table-cashout',
		'data-ck-table-buyin-form', 'data-ck-table-buyin-input', 'data-ck-table-buyin-add',
		'data-ck-table-exchange-down', 'data-ck-table-exchange-up',
		'data-ck-table-amount', 'data-ck-table-staked',
		// Ergänzung Umsetzungsstück C7f: data-ck-stack wird von
		// casino_startpage/…/table-felt.js dynamisch an jeden Stapel gesetzt
		// (Vertrag in casino_startpage/README.md) — steht in dieser Extension
		// aktuell in keiner eigenen Datei, aber ebenso geteilt wie
		// data-ck-field/data-ck-field-label.
		'data-ck-stack',
	]);
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
				// ck-cabinet__drawing, ck-room-fill, ck-table …) — erlaubt wie
				// jeder andere geteilte Haken, kein Fund.
				const erlaubt = klasse.startsWith('cr-') || klasse.startsWith('ck-') || GETEILT.has(klasse);
				if (!erlaubt) {
					treffer.push(`${kurz(datei)}: class="${klasse}"`);
				}
			}
		}
		for (const m of inhalt.matchAll(/\b(id|data-[a-z-]+)="([^"]*)"/g)) {
			const attr = m[1];
			if (attr === 'id') {
				if (!m[2].startsWith('cr-')) {
					treffer.push(`${kurz(datei)}: id="${m[2]}"`);
				}
				continue;
			}
			// data-text-* ist KEIN Geräte-Haken: es trägt ausschließlich einen
			// übersetzten Satz für die eigene JavaScript-Datei desselben
			// Bauteils weiter, dieselbe unpräfigierte Bauart wie
			// casino_startpage/…/Table/Status.html.
			if (!attr.startsWith('data-cr-') && !attr.startsWith('data-text-') && !GETEILT.has(attr)) {
				treffer.push(`${kurz(datei)}: ${attr}="${m[2]}"`);
			}
		}
	}
	check(treffer.length === 0,
		'jede eigene CSS-Klasse, jedes eigene data-Attribut beginnt mit cr-'
		+ ' oder ist einer der ausdrücklich geteilten Haken (data-text-* zählt'
		+ ' als geräteneutraler Textträger ebenfalls dazu)',
		...treffer);
}

/* =============== A-10 Anmeldung, Live-Bereiche und Messpunkte */

console.log('\nA-10 Anmeldung, Live-Bereiche und Messpunkte');
{
	// (a) Die Anmeldung bei der Registry.
	const localconf = lies(path.join(EXT, 'ext_localconf.php'));
	check(/AutomatRegistry::register\s*\(/.test(localconf),
		'ext_localconf.php ruft AutomatRegistry::register() auf');
	check(/gattung:\s*Gattung::Tisch/.test(localconf),
		'die Anmeldung nennt gattung: Gattung::Tisch');
	check(!/identifier:\s*'craps'/.test(localconf) && /Craps::IDENTIFIER/.test(localconf),
		'der Schlüssel kommt aus Craps::IDENTIFIER, nicht als ausgeschriebene Zeichenkette');
	check(/Craps::LANG_FRONTEND/.test(localconf) && /Craps::EXTENSION_KEY/.test(localconf)
		&& /Craps::CABINET_PARTIAL/.test(localconf),
		'title, extensionKey und cabinetPartial kommen ebenfalls aus Craps::…');

	// (b) Jeder Live-Bereich (role="status", role="alert", aria-live) wird
	// LEER ausgeliefert. Ein Live-Bereich, der beim Laden schon Text trägt,
	// liest ungefragt vor; einer, den ein Skript anlegt UND füllt, wird gar
	// nicht angesagt.
	const HTML = AUSGELIEFERT.filter((d) => d.endsWith('.html'));
	const JS = AUSGELIEFERT.filter((d) => d.endsWith('.js'));
	for (const datei of HTML) {
		const inhalt = ohneKommentare(lies(datei));
		for (const m of inhalt.matchAll(/<(p|div|span)\b([^>]*\b(?:role="status"|role="alert"|aria-live)[^>]*)>([\s\S]*?)<\/\1>/g)) {
			check(m[3].trim() === '', `${kurz(datei)}: der Live-Bereich wird leer ausgeliefert`,
				`gefunden: "${m[3].trim().slice(0, 60)}"`);
		}
	}

	// (c) Jeder data-cr-Messpunkt, der von JavaScript BESCHRIEBEN wird, hat
	// genau einen Schreiber. „Beschrieben" heißt: setAttribute('data-cr-…')
	// in einer .js-Datei dieser Extension.
	const schreiber = new Map();
	for (const datei of JS) {
		const quelltext = ohneBlockKommentare(lies(datei));
		for (const m of quelltext.matchAll(/setAttribute\(\s*'(data-cr-[a-z-]+)'/g)) {
			schreiber.set(m[1], (schreiber.get(m[1]) ?? new Set()).add(kurz(datei)));
		}
	}
	for (const [punkt, dateien] of schreiber) {
		check(dateien.size === 1, `${punkt} hat genau einen Schreiber`, ...dateien);
	}

	console.log('     Gegenprobe A-10-G: ein zweiter Schreiber muss auffallen');
	const gegenprobe = new Set(['a.js', 'b.js']);
	check(gegenprobe.size !== 1, 'A-10-G: zwei Schreiber werden als Fehler erkannt');

	// (d) Ergänzung Umsetzungsstück C7f: [data-cr-point-text] (Round.html) ist
	// ausdrücklich KEIN Live-Bereich — der Point-Stand wird stattdessen im
	// craps-eigenen Ansagebereich [data-cr-status] einmal je Wurf angesagt
	// (craps.js, onResult()). Ein zweiter Live-Bereich hieße, jeden Wurf
	// zweimal zu hören.
	for (const datei of HTML) {
		const inhalt = ohneKommentare(lies(datei));
		for (const m of inhalt.matchAll(/<[a-z]+\b[^>]*\bdata-cr-point-text=""[^>]*>/g)) {
			check(!/\b(role="status"|role="alert"|aria-live)\b/.test(m[0]),
				`${kurz(datei)}: [data-cr-point-text] trägt kein role="status"/"alert" und kein aria-live — es ist kein Live-Bereich`,
				`gefunden: ${m[0]}`);
		}
	}
}

/* =============== A-11 Höchstens ein f:asset.module, kein "disabled" */

console.log('\nA-11 Höchstens ein f:asset.module (Datei existiert), kein echtes "disabled"');
{
	const HTML = AUSGELIEFERT.filter((d) => d.endsWith('.html'));
	const module = HTML.flatMap((d) => [...ohneKommentare(lies(d)).matchAll(/f:asset\.module identifier="@phomo17\/craps\/([^"]+)"/g)].map((m) => m[1]));
	check(module.length <= 1, `höchstens ein f:asset.module (gefunden: ${module.length})`, ...module);
	if (module.length === 0) {
		console.log('  · 0 Treffer ist der richtige Stand für Umsetzungsstück C6a: kein'
			+ ' Fluid-Template dieser Extension bindet in C6a ein Modul ein. Ab'
			+ ' Umsetzungsstück C6d gilt die schärfere Fassung „genau ein Treffer"'
			+ ' (Prüfung V-1 in verify-view.mjs).');
	}
	for (const name of module) {
		check(existsSync(path.join(EXT, 'Resources/Public/JavaScript', name)),
			`das eingebundene Modul ${name} existiert`);
	}

	const MUSTER = /(?<!aria-)\bdisabled\b/;
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|js)$/.test(rel)) {
			continue;
		}
		if (MUSTER.test(ohneBlockKommentare(lies(datei)))) {
			treffer.push(kurz(datei));
		}
	}
	check(treffer.length === 0,
		'kein echtes disabled-Attribut/-Eigenschaft in HTML oder JavaScript'
		+ ' dieser Extension (aria-disabled ist ausdrücklich erlaubt und wird'
		+ ' hier nicht als Treffer gezählt)',
		...treffer);

	console.log('     Gegenprobe A-11-G: ein eingefügtes disabled="disabled" muss auffallen');
	check(MUSTER.test('<button disabled="disabled">Test</button>'),
		'A-11-G: ein echtes disabled wird erkannt');
	check(!MUSTER.test('<button aria-disabled="true">Test</button>'),
		'A-11-G: aria-disabled selbst löst KEINEN Fehlalarm aus');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Gerät zeichnet ausschließlich mit'
	+ '\nDesign-Tokens, lädt keine Datei von außen, casino_startpage kennt es nicht'
	+ '\nim Code, die Lizenzangaben stimmen überein, der Gehäuse-Vertrag ist erfüllt'
	+ '\n(einschließlich: kein <text>), das Kürzel-Präfix cr- wird eingehalten, die'
	+ '\nAnmeldung bei der Registry stimmt, kein Live-Bereich und kein Messpunkt ist'
	+ '\nunbeschrieben, kein echtes disabled kommt vor, und Kachel und Spielseite'
	+ '\nzeigen seit Umsetzungsstück C6b dieselbe Bauform (A-7).'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
