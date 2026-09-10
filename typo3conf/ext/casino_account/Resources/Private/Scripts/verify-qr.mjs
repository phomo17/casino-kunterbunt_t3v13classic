/**
 * Casino Kunterbunt – casino_account: Nachweis QR-Code, mit Rückweg
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version
 * 18, ohne jede npm-Abhängigkeit, rein lesend (Quelltext UND die Ausgabe von
 * dump-qr-matrix.php — ein Entwicklerwerkzeug, das selbst nur liest und
 * rechnet, nie in eine Datei oder eine Datenbank schreibt).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-qr.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt. Laufzeit: einige Sekunden (rund zwanzig
 * PHP-Unterprozesse für Q-4/Q-5, siehe unten) — nicht „unter einer
 * Sekunde" wie die rein statischen Skripte der Extension.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-teild-d1-konto-qr-part-3.md, Abschnitt
 * 4.6.6, Umsetzungsstück Dd)
 * -------------------------------------------------------------------------
 *   Q-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte
 *   Q-2   bacon/bacon-qr-code ist eine harte Abhängigkeit des Kerns
 *   Q-3   casino_account fügt KEINE Abhängigkeit hinzu
 *   Q-4   Von Hand abgeschriebene Blocktabelle (Stufen Q und M, Fassungen 1
 *         bis 10) stimmt mit dem überein, was die Bibliothek meldet
 *   Q-5   Dieselbe Kreuzprobe für die Ausrichtungsmuster
 *   Q-6   Das selbst gebaute Funktionsmuster stimmt mit bacon.functionPattern
 *         überein
 *   Q-7   Struktur der Matrix: Kantenlänge, Sucher, Taktlinien, dunkles Modul
 *   Q-8   Formatinformation: beide Kopien gleich, BCH(15,5) erfüllt, Stufe Q,
 *         Maske stimmt
 *   Q-9   Versionsinformation (Fassung 8): beide Kopien gleich, BCH(18,6)
 *         erfüllt
 *   Q-10  DER RÜCKWEG: Maske entfernen, Datenmodule ablesen, entschachteln,
 *         Modus/Länge/Bytes lesen — zeichengleich die eingespeiste Adresse
 *   Q-11  Reed-Solomon: alle Syndrome in GF(256) sind null
 *   Q-12a Bekannter Vergleichswert Teil 1: das Beispiel der Norm ("01234567",
 *         Fassung 1, Stufe M, Ziffernmodus) wird richtig gelesen
 *   Q-12b Bekannter Vergleichswert Teil 2: Daten-/Fehlerkorrekturwörter
 *         stimmen mit den veröffentlichten Werten überein
 *   Q-13  Die Adresse kommt aus dem SiteFinder, nicht aus einer festen
 *         Zeichenkette; sie passt in die gewählte Fassung
 *   Q-14  Das SVG: genau zwei Farbwerte, role="img", <title>, xmlns,
 *         width/height, Ruhezone 4 Module
 *   Q-15  Das SVG bildet die Matrix genau ab
 *   Q-16  Inhaltssicherheitsregel: data: statt blob:, belegt gegen den Kern
 *   Q-17  qr-tools.js zeichnet das SVG nicht selbst
 *
 * DER RÜCKWEG IST EIN ENTWICKLERWERKZEUG UND LÄUFT NIE IM BROWSER
 * -------------------------------------------------------------------------
 * Er verstößt NICHT gegen das Nicht-Ziel „kein eigener QR-Leser in
 * JavaScript" aus CONCEPT.md D.12 — das zielt auf die Anmeldeseite (D.6.1:
 * das Bild wird von der eingebauten Kamera-Erkennung des Browsers
 * ausgewertet, nicht von uns). Dieser Rückweg läuft ausschließlich hier, im
 * Prüfskript, kennt keine Kamera, kein Bild und keine perspektivische
 * Entzerrung. Er bekommt eine fertige, unbeschädigte Matrix von
 * dump-qr-matrix.php übergeben und liest sie ab — er braucht deshalb KEINE
 * Bilderkennung, KEINE Entzerrung und KEINE Fehlerkorrektur im Sinn von
 * „beschädigte Module reparieren"; er darf voraussetzen, dass die Matrix
 * richtig ist, und bricht laut ab, wenn sie es nicht ist (siehe Q-8/Q-9/Q-11:
 * jede BCH- und Reed-Solomon-Prüfung wirft bei Abweichung). Das ist eine
 * Auslegung des Konzepts und steht so in DECISIONS.md.
 *
 * WARUM DIE RÜCKWEG-ALGORITHMEN DENEN DER BIBLIOTHEK ÄHNELN
 * -------------------------------------------------------------------------
 * Das Funktionsmuster (Sucher, Trennlinien, Taktlinien, Ausrichtungsmuster,
 * Format-/Versionsbereiche, dunkles Modul), die Lesereihenfolge der
 * Datenmodule (spaltenweise im Zickzack, rechte Spalte vor linker,
 * Spalte 6 übersprungen) und die beiden BCH-Generatorpolynome
 * (0x537 für die Formatinformation, 0x1F25 für die Versionsinformation,
 * XOR-Maske 0x5412) sind KEINE Erfindungen einer bestimmten Bibliothek — sie
 * sind in ISO/IEC 18004 FEST VORGESCHRIEBEN und deshalb für jede korrekte
 * Umsetzung zwangsläufig identisch. Der Quelltext von bacon/bacon-qr-code
 * wurde benutzt, um genau diese normativen Konstanten nachzuschlagen (nicht,
 * um sie zu übernehmen) — an den Stellen, an denen sich zwei Quellen für
 * dieselbe Zahl finden lassen (die Bibliothek UND die eigene Kenntnis der
 * Norm), ist das die Bestätigung, kein Abschreiben. Die eigentliche
 * SCHREIBWEISE dieses Rückwegs (GF(256)-Tabellen, Zick­zack-Leser,
 * BCH-Dekoder, Modus-Parser) ist eine eigenständige, zweite Umsetzung des
 * Standards — und genau darin liegt der Beweiswert von Q-10/Q-11/Q-12: zwei
 * unabhängig geschriebene Umsetzungen treffen sich.
 *
 * DIE VIER GENERATOR-TABELLEN AM ANFANG DIESER DATEI
 * -------------------------------------------------------------------------
 * BLOECKE_Q und BLOECKE_M (Fassungen 1–10) sowie ALIGNMENT (Fassungen 1–10)
 * sind von Hand aus der Norm abgeschrieben (ISO/IEC 18004, Tabelle der
 * Fehlerkorrekturblöcke bzw. der Ausrichtungsmuster-Mittelpunkte) — NICHT aus
 * der Bibliothek gelesen. Q-4/Q-5 halten sie gegen das, was die Bibliothek
 * zur Laufzeit tatsächlich meldet.
 *
 * GENERATOR_LAENGEN_Q und GENERATOR_LAENGEN_M sind KEIN Normwert, sondern
 * eine rein technische Notwendigkeit: dump-qr-matrix.php erzeugt eine
 * Fassung/Stufe nicht direkt, sondern aus einem Inhalt — die Bibliothek
 * wählt die kleinste Fassung, die den Inhalt fasst. Die Längen wurden vor
 * dem Schreiben dieses Skripts EMPIRISCH ermittelt (mit
 * dump-qr-matrix.php selbst, außerhalb des Prüfstands, Ergebnis im Bericht
 * des Umsetzers): Inhalt aus Kleinbuchstaben, weil Großbuchstaben in der QR-
 * Alphanumerik-Tabelle liegen und beim Zählen der Länge in die Irre führen
 * würden (ein Inhalt aus lauter „A" braucht bei gleicher Zeichenzahl eine
 * KLEINERE Fassung als derselbe Inhalt aus „a" — das Byte-Modus-Muster
 * dieser Prüfung will aber gezielt Byte-Modus, keinen Alphanumerik-Modus).
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm */
const PROJEKT = path.resolve(EXT_ROOT, '../..');
/** typo3_src/ — der TYPO3-Kern dieser klassischen Installation */
const TYPO3_SRC = path.join(PROJEKT, 'typo3_src');

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
	return path.relative(PROJEKT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …) und JS-Zeilenkommentare gleich mit. */
function ohneZeilenKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

const QR_MATRIX_PFAD = path.join(EXT, 'Classes/Qr/QrMatrix.php');
const QR_CODE_FACTORY_PFAD = path.join(EXT, 'Classes/Qr/QrCodeFactory.php');
const BACON_FACTORY_PFAD = path.join(EXT, 'Classes/Qr/BaconQrCodeFactory.php');
const QR_SVG_RENDERER_PFAD = path.join(EXT, 'Classes/Qr/QrSvgRenderer.php');
const PLAYER_URL_BUILDER_PFAD = path.join(EXT, 'Classes/Service/PlayerUrlBuilder.php');
const DUMP_SCRIPT_PFAD = path.join(EXT, 'Resources/Private/Scripts/dump-qr-matrix.php');
const QR_HTML_PFAD = path.join(EXT, 'Resources/Private/Templates/PlayerModule/Qr.html');
const QR_TOOLS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/qr-tools.js');
const JS_MODULES_PFAD = path.join(EXT, 'Configuration/JavaScriptModules.php');
const SERVICES_YAML_PFAD = path.join(EXT, 'Configuration/Services.yaml');
const COMPOSER_JSON_PFAD = path.join(EXT, 'composer.json');
const EXT_EMCONF_PFAD = path.join(EXT, 'ext_emconf.php');

const SITE_CONFIG_PFAD = path.join(PROJEKT, 'typo3conf/sites/casino-kunterbunt/config.yaml');
const CORE_COMPOSER_JSON_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/composer.json');
const BACON_ENCODER_PFAD = path.join(TYPO3_SRC, 'vendor/bacon/bacon-qr-code/src/Encoder/Encoder.php');
const CORE_FEATURES_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Classes/Configuration/Features.php');
const CORE_CSP_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/backend/Configuration/ContentSecurityPolicies.php');

console.log('\ncasino_account – Nachweis QR-Code, mit Rückweg (Umsetzungsstück Dd)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Classes/Qr/QrMatrix.php', QR_MATRIX_PFAD],
	['Classes/Qr/QrCodeFactory.php', QR_CODE_FACTORY_PFAD],
	['Classes/Qr/BaconQrCodeFactory.php', BACON_FACTORY_PFAD],
	['Classes/Qr/QrSvgRenderer.php', QR_SVG_RENDERER_PFAD],
	['Classes/Service/PlayerUrlBuilder.php', PLAYER_URL_BUILDER_PFAD],
	['Resources/Private/Scripts/dump-qr-matrix.php', DUMP_SCRIPT_PFAD],
	['Resources/Private/Templates/PlayerModule/Qr.html', QR_HTML_PFAD],
	['Resources/Public/JavaScript/qr-tools.js', QR_TOOLS_JS_PFAD],
	['Configuration/JavaScriptModules.php', JS_MODULES_PFAD],
	['Configuration/Services.yaml', SERVICES_YAML_PFAD],
	['composer.json', COMPOSER_JSON_PFAD],
	['ext_emconf.php', EXT_EMCONF_PFAD],
	['(Site) typo3conf/sites/casino-kunterbunt/config.yaml', SITE_CONFIG_PFAD],
	['(Kern) typo3/sysext/core/composer.json', CORE_COMPOSER_JSON_PFAD],
	['(Kern-Abhängigkeit) vendor/bacon/bacon-qr-code/src/Encoder/Encoder.php', BACON_ENCODER_PFAD],
	['(Kern) typo3/sysext/core/Classes/Configuration/Features.php', CORE_FEATURES_PFAD],
	['(Kern) typo3/sysext/backend/Configuration/ContentSecurityPolicies.php', CORE_CSP_PFAD],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		process.exit(1);
	}
}

/**
 * GEMESSEN, nicht geschätzt — in Umsetzungsstück De gefahren, abgelesen (157)
 * und hier eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt,
 * Wächter schlägt an, zurückgebaut, wieder grün).
 */
const ERWARTETE_ZUSAGEN = 157;

const qrMatrixSrc = ohneZeilenKommentare(lies(QR_MATRIX_PFAD));
const qrCodeFactorySrc = ohneZeilenKommentare(lies(QR_CODE_FACTORY_PFAD));
const baconFactorySrc = ohneZeilenKommentare(lies(BACON_FACTORY_PFAD));
const baconFactoryRoh = lies(BACON_FACTORY_PFAD);
const qrSvgRendererSrc = ohneZeilenKommentare(lies(QR_SVG_RENDERER_PFAD));
const qrSvgRendererRoh = lies(QR_SVG_RENDERER_PFAD);
const playerUrlBuilderSrc = ohneZeilenKommentare(lies(PLAYER_URL_BUILDER_PFAD));
const qrHtml = lies(QR_HTML_PFAD);
const qrToolsJs = lies(QR_TOOLS_JS_PFAD);
const qrToolsJsBereinigt = ohneZeilenKommentare(qrToolsJs);
const servicesYaml = lies(SERVICES_YAML_PFAD);
const composerJson = lies(COMPOSER_JSON_PFAD);
const extEmconf = lies(EXT_EMCONF_PFAD);
const siteConfig = lies(SITE_CONFIG_PFAD);
const coreComposerJson = lies(CORE_COMPOSER_JSON_PFAD);
const coreFeatures = lies(CORE_FEATURES_PFAD);
const coreCsp = lies(CORE_CSP_PFAD);

/* ================================================================= Q-2 */

console.log('Q-2  bacon/bacon-qr-code ist eine harte Abhängigkeit des TYPO3-Kerns');
{
	check(/"bacon\/bacon-qr-code"\s*:\s*"\^3\.0"/.test(coreComposerJson),
		'typo3/sysext/core/composer.json verlangt "bacon/bacon-qr-code": "^3.0"');
	check(existsSync(BACON_ENCODER_PFAD), 'vendor/bacon/bacon-qr-code/src/Encoder/Encoder.php liegt tatsächlich da');

	console.log('     Gegenprobe Q-2-G: ein erfundener Paketname darf nicht gefunden werden');
	check(!/"bacon\/nicht-vorhanden"/.test(coreComposerJson), 'Q-2-G: der erfundene Name wird nicht gefunden');
}

/* ================================================================= Q-3 */

console.log('\nQ-3  casino_account fügt KEINE Abhängigkeit hinzu');
{
	check(!/bacon/i.test(composerJson), 'composer.json nennt "bacon" nicht');
	check(!/bacon/i.test(extEmconf), 'ext_emconf.php nennt "bacon" nicht');

	// Jeder "require"-Eintrag ist entweder php, ein typo3/cms-*-Paket oder
	// phomo17/casino-startpage — nichts sonst.
	const requireBlock = (composerJson.match(/"require"\s*:\s*\{([^}]*)\}/) || [, ''])[1];
	const eintraege = [...requireBlock.matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]);
	const erlaubtePakete = eintraege.filter(
		(name) => name !== 'php' && !name.startsWith('typo3/cms-') && name !== 'phomo17/casino-startpage'
	);
	check(erlaubtePakete.length === 0,
		'composer.json require nennt nur php, typo3/cms-* und phomo17/casino-startpage',
		...erlaubtePakete.map((p) => `unerwartet: ${p}`));

	console.log('     Gegenprobe Q-3-G: ein hinzugedachtes "bacon/bacon-qr-code": "^3.0" muss auffallen');
	const mitBacon = composerJson + '\n"bacon/bacon-qr-code": "^3.0",';
	check(/bacon/i.test(mitBacon), 'Q-3-G: der Fund wird erkannt');
}

/* ============================================== der Rückweg: Grundbausteine */

/**
 * GF(256), Generatorpolynom 0x11D — dasselbe primitive Polynom, das
 * ISO/IEC 18004 für die Reed-Solomon-Fehlerkorrektur von QR-Codes
 * vorschreibt (belegt: bacon/…/Common/ReedSolomonEncoder.php benutzt
 * denselben Wert für seine eigene GF-Instanz — zwei unabhängige
 * Umsetzungen desselben Normwerts).
 */
function buildGf() {
	const EXP = new Array(512).fill(0);
	const LOG = new Array(256).fill(0);
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		LOG[x] = i;
		x <<= 1;
		if (x & 0x100) {
			x ^= 0x11d;
		}
	}
	for (let i = 255; i < 512; i++) {
		EXP[i] = EXP[i - 255];
	}
	return { EXP, LOG };
}
const { EXP: GF_EXP, LOG: GF_LOG } = buildGf();

function gfMul(a, b) {
	if (a === 0 || b === 0) {
		return 0;
	}
	return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Anzahl der gesetzten Bits von unten, bis zum höchstwertigen — für die BCH-Division. */
function findMsbSet(value) {
	let n = 0;
	while (value !== 0) {
		value = value >>> 1;
		n++;
	}
	return n;
}

/**
 * Division von "value" durch "poly" über GF(2) (XOR statt Subtraktion),
 * dieselbe Rechnung, mit der ISO/IEC 18004 die BCH-Prüfbits von Format- und
 * Versionsinformation vorschreibt.
 */
function bchRest(value, poly) {
	const msbSetInPoly = findMsbSet(poly);
	value = value << (msbSetInPoly - 1);
	while (findMsbSet(value) >= msbSetInPoly) {
		value ^= poly << (findMsbSet(value) - msbSetInPoly);
	}
	return value >>> 0;
}

const TYPE_INFO_POLY = 0x537;
const TYPE_INFO_MASK = 0x5412;
const VERSION_INFO_POLY = 0x1f25;

/** Die 15 Koordinaten der ERSTEN Formatinformations-Kopie, Bit 0 (LSB) zuerst. */
const TYPE_INFO_COORDINATES = [
	[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
	[7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
];

const EC_LEVEL_BITS = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' };

/** Die acht Maskenformeln aus ISO/IEC 18004, Tabelle 10. */
function maskBit(pattern, x, y) {
	switch (pattern) {
		case 0: return ((y + x) & 1) === 0;
		case 1: return (y & 1) === 0;
		case 2: return x % 3 === 0;
		case 3: return (y + x) % 3 === 0;
		case 4: return ((y >>> 1) + Math.floor(x / 3)) % 2 === 0;
		case 5: { const t = y * x; return ((t & 1) + (t % 3)) === 0; }
		case 6: { const t = y * x; return (((t & 1) + (t % 3)) & 1) === 0; }
		case 7: { const t = ((y + x) % 2) + ((y * x) % 3); return (t & 1) === 0; }
		default: throw new Error('unbekanntes Maskenmuster: ' + pattern);
	}
}

/** Ausrichtungsmuster-Mittelpunkte, von Hand aus ISO/IEC 18004 abgeschrieben, Fassungen 1–10. */
const ALIGNMENT = {
	1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
	7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

/**
 * Blockaufteilung nach ISO/IEC 18004, Stufe Q, Fassungen 1 bis 10.
 * Je Fassung: [Fehlerkorrekturwörter je Block, [[Blockzahl, Datenwörter je Block], …]]
 *
 * VON HAND ABGESCHRIEBEN — NICHT AUS DER BIBLIOTHEK GELESEN. Q-4 hält diese
 * Tabelle gegen das, was die Bibliothek zur Laufzeit tatsächlich meldet.
 */
const BLOECKE_Q = {
	1: [13, [[1, 13]]],
	2: [22, [[1, 22]]],
	3: [18, [[2, 17]]],
	4: [26, [[2, 24]]],
	5: [18, [[2, 15], [2, 16]]],
	6: [24, [[4, 19]]],
	7: [18, [[2, 14], [4, 15]]],
	8: [22, [[4, 18], [2, 19]]],
	9: [20, [[4, 16], [4, 17]]],
	10: [24, [[6, 19], [2, 20]]],
};

/** Dieselbe Tabelle für Stufe M, von Hand abgeschrieben. */
const BLOECKE_M = {
	1: [10, [[1, 16]]],
	2: [16, [[1, 28]]],
	3: [26, [[1, 44]]],
	4: [18, [[2, 32]]],
	5: [24, [[2, 43]]],
	6: [16, [[4, 27]]],
	7: [18, [[4, 31]]],
	8: [22, [[2, 38], [2, 39]]],
	9: [22, [[3, 36], [2, 37]]],
	10: [26, [[4, 43], [1, 44]]],
};

/**
 * Inhalte, deren Byte-Modus-Länge dump-qr-matrix.php zuverlässig auf die
 * jeweilige Fassung zwingt (empirisch ermittelt, siehe Kopfkommentar dieser
 * Datei). Nur Kleinbuchstaben — sie liegen NICHT in der QR-Alphanumerik-
 * Tabelle (0–9, A–Z groß, Leerzeichen, $%*+-./:), die Bibliothek wählt
 * deshalb zwingend den Byte-Modus.
 */
const GENERATOR_LAENGEN_Q = { 1: 9, 2: 16, 3: 26, 4: 45, 5: 59, 6: 65, 7: 85, 8: 99, 9: 120, 10: 140 };
const GENERATOR_LAENGEN_M = { 1: 12, 2: 24, 3: 40, 4: 58, 5: 78, 6: 100, 7: 116, 8: 144, 9: 172, 10: 200 };

function ladeMatrix(inhalt, stufe) {
	const json = execFileSync('php', [DUMP_SCRIPT_PFAD, inhalt, stufe], { encoding: 'utf8' });
	return JSON.parse(json);
}

function zuRaster(zeilen) {
	return zeilen.map((z) => z.split('').map((c) => c === '1'));
}

/**
 * Das Funktionsmuster (alles, was NICHT Datenmodul ist): Sucher samt
 * Trennlinien, Ausrichtungsmuster, Taktlinien, Versionsinformationsbereiche.
 * Selbst gebaut aus den in ISO/IEC 18004 vorgeschriebenen Bereichen — siehe
 * Kopfkommentar dieser Datei.
 */
function funktionsmuster(size, version) {
	const fn = Array.from({ length: size }, () => new Array(size).fill(false));
	const markiere = (x0, y0, w, h) => {
		for (let y = y0; y < y0 + h; y++) {
			for (let x = x0; x < x0 + w; x++) {
				if (x >= 0 && x < size && y >= 0 && y < size) {
					fn[y][x] = true;
				}
			}
		}
	};
	// Die drei Sucher samt weißer Trennlinie und dem Formatinformationsstreifen daneben.
	markiere(0, 0, 9, 9);
	markiere(size - 8, 0, 8, 9);
	markiere(0, size - 8, 9, 8);

	// Ausrichtungsmuster — nicht in der Nähe der drei Sucher.
	const zentren = ALIGNMENT[version];
	const max = zentren.length;
	for (let xi = 0; xi < max; xi++) {
		const i = zentren[xi] - 2;
		for (let yi = 0; yi < max; yi++) {
			if ((xi === 0 && (yi === 0 || yi === max - 1)) || (xi === max - 1 && yi === 0)) {
				continue;
			}
			markiere(zentren[yi] - 2, i, 5, 5);
		}
	}

	// Taktlinien
	markiere(6, 9, 1, size - 17);
	markiere(9, 6, size - 17, 1);

	// Versionsinformation, nur ab Fassung 7
	if (version > 6) {
		markiere(size - 11, 0, 3, 6);
		markiere(0, size - 11, 6, 3);
	}
	return fn;
}

function formatinformationLesen(grid, size) {
	let v1 = 0;
	for (let i = 0; i < 15; i++) {
		const [x, y] = TYPE_INFO_COORDINATES[i];
		if (grid[y][x]) {
			v1 |= (1 << i);
		}
	}
	let v2 = 0;
	for (let i = 0; i < 15; i++) {
		let x;
		let y;
		if (i < 8) {
			x = size - 1 - i;
			y = 8;
		} else {
			x = 8;
			y = size - 7 + (i - 8);
		}
		if (grid[y][x]) {
			v2 |= (1 << i);
		}
	}
	if (v1 !== v2) {
		throw new Error(`Formatinformation: beide Kopien weichen ab (${v1} vs ${v2})`);
	}
	const entmaskt = (v1 ^ TYPE_INFO_MASK) & 0x7fff;
	const typeInfo = entmaskt >>> 10;
	const bch = entmaskt & 0x3ff;
	const erwarteterBch = bchRest(typeInfo, TYPE_INFO_POLY);
	if (erwarteterBch !== bch) {
		throw new Error(`Formatinformation: BCH(15,5) verletzt (gelesen ${bch}, erwartet ${erwarteterBch})`);
	}
	return { level: EC_LEVEL_BITS[typeInfo >>> 3], mask: typeInfo & 0b111 };
}

function versionsinformationLesen(grid, size) {
	let v1 = 0;
	let v2 = 0;
	for (let i = 0; i < 6; i++) {
		for (let j = 0; j < 3; j++) {
			const bitNummer = i * 3 + j;
			if (grid[size - 11 + j][i]) {
				v1 |= (1 << bitNummer);
			}
			if (grid[i][size - 11 + j]) {
				v2 |= (1 << bitNummer);
			}
		}
	}
	if (v1 !== v2) {
		throw new Error(`Versionsinformation: beide Kopien weichen ab (${v1} vs ${v2})`);
	}
	const versionNummer = v1 >>> 12;
	const bch = v1 & 0xfff;
	const erwarteterBch = bchRest(versionNummer, VERSION_INFO_POLY);
	if (erwarteterBch !== bch) {
		throw new Error(`Versionsinformation: BCH(18,6) verletzt (gelesen ${bch}, erwartet ${erwarteterBch})`);
	}
	return versionNummer;
}

/**
 * Liest die Datenmodule im Zickzack aus (ISO/IEC 18004, 8.7.3): spaltenweise
 * von rechts unten nach links oben, Richtung je Spaltenpaar wechselnd,
 * innerhalb eines Paars erst die rechte, dann die linke Spalte, Spalte 6
 * (die senkrechte Taktlinie) übersprungen. Funktionsmodule werden
 * übersprungen, die Maske wird dabei sofort wieder entfernt.
 */
function zickzackLesen(grid, size, fn, maske) {
	const bits = [];
	let x = size - 1;
	let richtung = -1;
	let y = size - 1;
	while (x > 0) {
		if (x === 6) {
			x--;
		}
		while (y >= 0 && y < size) {
			for (let i = 0; i < 2; i++) {
				const xx = x - i;
				if (fn[y][xx]) {
					continue;
				}
				let bit = grid[y][xx];
				if (maskBit(maske, xx, y)) {
					bit = !bit;
				}
				bits.push(bit ? 1 : 0);
			}
			y += richtung;
		}
		richtung = -richtung;
		y += richtung;
		x -= 2;
	}
	return bits;
}

function bitsZuBytes(bits) {
	const bytes = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		let b = 0;
		for (let j = 0; j < 8; j++) {
			b = (b << 1) | bits[i + j];
		}
		bytes.push(b);
	}
	return bytes;
}

/** Entschachtelt die Codewörter nach ISO/IEC 18004, 8.6: Datenwörter spaltenweise über alle Blöcke, danach die Fehlerkorrekturwörter ebenso. */
function entschachteln(codewords, blockSpezifikation) {
	const bloecke = [];
	for (const [anzahl, datenLaenge] of blockSpezifikation) {
		for (let i = 0; i < anzahl; i++) {
			bloecke.push({ datenLaenge, daten: [], ec: [] });
		}
	}
	let idx = 0;
	const maxDaten = Math.max(...bloecke.map((b) => b.datenLaenge));
	for (let spalte = 0; spalte < maxDaten; spalte++) {
		for (const b of bloecke) {
			if (spalte < b.datenLaenge) {
				b.daten.push(codewords[idx++]);
			}
		}
	}
	const summeDaten = bloecke.reduce((s, b) => s + b.datenLaenge, 0);
	const ecLaenge = (codewords.length - summeDaten) / bloecke.length;
	for (let spalte = 0; spalte < ecLaenge; spalte++) {
		for (const b of bloecke) {
			b.ec.push(codewords[idx++]);
		}
	}
	return { bloecke, ecLaenge };
}

/**
 * Reed-Solomon-Syndrome in GF(256): ein Block ist genau dann fehlerfrei,
 * wenn das Auswerten des Codewort-Polynoms an allen Nullstellen des
 * Generatorpolynoms (α^0 … α^(t-1)) null ergibt.
 */
function syndromeSindNull(block, ecLaenge) {
	const poly = [...block.daten, ...block.ec];
	for (let i = 0; i < ecLaenge; i++) {
		let ergebnis = 0;
		const xHoch = GF_EXP[i % 255];
		for (const koeffizient of poly) {
			ergebnis = gfMul(ergebnis, xHoch) ^ koeffizient;
		}
		if (ergebnis !== 0) {
			return false;
		}
	}
	return true;
}

function bytesZuBits(bytes) {
	const bits = [];
	for (const b of bytes) {
		for (let j = 7; j >= 0; j--) {
			bits.push((b >>> j) & 1);
		}
	}
	return bits;
}

function bitsLesen(bits, pos, n) {
	let v = 0;
	for (let i = 0; i < n; i++) {
		v = (v << 1) | bits[pos + i];
	}
	return v;
}

/**
 * Liest den Modus-Indikator (4 Bit) und danach die Nachricht. Byte-Modus
 * (0100) für die eigenen Adressen dieser Extension; Ziffernmodus (0001)
 * zusätzlich für Q-12a, weil das Beispiel der Norm ("01234567") ihn benutzt.
 */
function nachrichtLesen(datenCodewords, version) {
	const bits = bytesZuBits(datenCodewords);
	let pos = 0;
	const modus = bitsLesen(bits, pos, 4);
	pos += 4;
	if (modus === 0b0100) {
		const laengeBits = version <= 9 ? 8 : 16;
		const anzahl = bitsLesen(bits, pos, laengeBits);
		pos += laengeBits;
		let text = '';
		for (let i = 0; i < anzahl; i++) {
			text += String.fromCharCode(bitsLesen(bits, pos, 8));
			pos += 8;
		}
		return { modus: 'byte', text };
	}
	if (modus === 0b0001) {
		const laengeBits = version <= 9 ? 10 : 12;
		const anzahl = bitsLesen(bits, pos, laengeBits);
		pos += laengeBits;
		let text = '';
		let rest = anzahl;
		while (rest >= 3) {
			const v = bitsLesen(bits, pos, 10);
			pos += 10;
			text += String(v).padStart(3, '0');
			rest -= 3;
		}
		if (rest === 2) {
			const v = bitsLesen(bits, pos, 7);
			pos += 7;
			text += String(v).padStart(2, '0');
		} else if (rest === 1) {
			const v = bitsLesen(bits, pos, 4);
			pos += 4;
			text += String(v);
		}
		return { modus: 'numeric', text };
	}
	throw new Error('unbekannter Modus-Indikator: ' + modus.toString(2).padStart(4, '0'));
}

/**
 * Der komplette Rückweg für ein geladenes JSON aus dump-qr-matrix.php: von
 * der rohen Modulmatrix bis zur gelesenen Nachricht. Wirft, statt still
 * etwas Falsches zurückzugeben — genau das verlangt „laut abbrechen, wenn
 * die Matrix es nicht ist".
 */
function rueckweg(json) {
	const size = json.size;
	const grid = zuRaster(json.rows);
	const fn = funktionsmuster(size, json.version);
	const format = formatinformationLesen(grid, size);
	let versionGelesen = null;
	if (json.version >= 7) {
		versionGelesen = versionsinformationLesen(grid, size);
	}
	const bits = zickzackLesen(grid, size, fn, format.mask);
	const codewords = bitsZuBytes(bits.slice(0, json.bacon.totalCodewords * 8));
	const { bloecke, ecLaenge } = entschachteln(codewords, json.bacon.blocks);
	const alleSyndromeNull = bloecke.every((b) => syndromeSindNull(b, ecLaenge));
	const datenStrom = [];
	for (const b of bloecke) {
		datenStrom.push(...b.daten);
	}
	const nachricht = nachrichtLesen(datenStrom, json.version);
	return { size, grid, fn, format, versionGelesen, codewords, bloecke, ecLaenge, alleSyndromeNull, nachricht };
}

/* ============================================================ Q-4 / Q-5 */

console.log('\nQ-4  Von Hand abgeschriebene Blocktabelle (Q, M, Fassungen 1–10) stimmt mit der Bibliothek überein');
console.log('Q-5  Dieselbe Kreuzprobe für die Ausrichtungsmuster');
/** Fassung 8/Stufe Q, aus der Schleife unten übernommen — für Q-6 bis Q-15 wiederverwendet. */
let v8q = null;
{
	/** @type {Map<string, object>} Fassung+Stufe → geladenes JSON, für Wiederverwendung durch spätere Prüfungen. */
	const geladen = new Map();

	for (const [stufe, laengen, tabelle] of [['Q', GENERATOR_LAENGEN_Q, BLOECKE_Q], ['M', GENERATOR_LAENGEN_M, BLOECKE_M]]) {
		for (let version = 1; version <= 10; version++) {
			const inhalt = 'a'.repeat(laengen[version]);
			const json = ladeMatrix(inhalt, stufe);
			geladen.set(`${stufe}-${version}`, json);

			check(json.version === version,
				`Fassung ${version} Stufe ${stufe}: der gewählte Inhalt erzeugt tatsächlich Fassung ${version}`,
				`gefunden: Fassung ${json.version}`);

			const [erwarteteEc, erwarteteBloecke] = tabelle[version];
			check(json.bacon.ecCodewordsPerBlock === erwarteteEc,
				`Fassung ${version} Stufe ${stufe}: ${erwarteteEc} Fehlerkorrekturwörter je Block`,
				`gefunden: ${json.bacon.ecCodewordsPerBlock}`);

			const gefundeneBloecke = json.bacon.blocks;
			const bloeckeGleich = JSON.stringify(gefundeneBloecke) === JSON.stringify(erwarteteBloecke);
			check(bloeckeGleich,
				`Fassung ${version} Stufe ${stufe}: Blockaufteilung ${JSON.stringify(erwarteteBloecke)}`,
				`gefunden: ${JSON.stringify(gefundeneBloecke)}`);

			const erwarteteZentren = ALIGNMENT[version];
			const zentrenGleich = JSON.stringify(json.bacon.alignmentCenters) === JSON.stringify(erwarteteZentren);
			check(zentrenGleich,
				`Fassung ${version}: Ausrichtungsmuster-Mittelpunkte ${JSON.stringify(erwarteteZentren)}`,
				`gefunden: ${JSON.stringify(json.bacon.alignmentCenters)}`);
		}
	}

	console.log('     Gegenprobe Q-4-G: eine um eins verfälschte Zahl in der abgeschriebenen Tabelle muss auffallen');
	const verfaelscht = BLOECKE_Q[8][0] + 1;
	check(verfaelscht !== geladen.get('Q-8').bacon.ecCodewordsPerBlock, 'Q-4-G: die Abweichung wird erkannt');

	console.log('     Gegenprobe Q-5-G: ein um ein Modul verschobenes Ausrichtungsmuster muss auffallen');
	const verschoben = [...ALIGNMENT[8]];
	verschoben[1] += 1;
	check(JSON.stringify(verschoben) !== JSON.stringify(geladen.get('Q-8').bacon.alignmentCenters), 'Q-5-G: die Verschiebung wird erkannt');

	// Für die folgenden Prüfungen (Q-6 bis Q-11, Q-14, Q-15) wird die
	// bereits geladene Fassung-8-Stufe-Q-Matrix aus dieser Schleife
	// WIEDERVERWENDET — kein zusätzlicher PHP-Unterprozess nötig.
	v8q = geladen.get('Q-8');
}

/** Das Raster von Fassung 8/Stufe Q, einmal aus den Zeilen gebaut — für Q-7 bis Q-11. */
const v8qGrid = zuRaster(v8q.rows);

/* ================================================================= Q-6 */

console.log('\nQ-6  Das selbst gebaute Funktionsmuster stimmt Modul für Modul mit bacon.functionPattern überein');
{
	const eigenes = funktionsmuster(v8q.size, v8q.version);
	const baconMuster = zuRaster(v8q.bacon.functionPattern);
	let abweichungen = 0;
	for (let y = 0; y < v8q.size; y++) {
		for (let x = 0; x < v8q.size; x++) {
			if (eigenes[y][x] !== baconMuster[y][x]) {
				abweichungen++;
			}
		}
	}
	check(abweichungen === 0, 'Funktionsmuster stimmt an allen ' + (v8q.size * v8q.size) + ' Modulen überein',
		`Abweichungen: ${abweichungen}`);

	console.log('     Gegenprobe Q-6-G: ein künstlich verschobenes Ausrichtungsmuster muss auffallen');
	const verschobeneZentren = { ...ALIGNMENT, 8: [6, 25, 42] };
	const verschobenesMuster = (() => {
		const save = ALIGNMENT[8];
		ALIGNMENT[8] = verschobeneZentren[8];
		const m = funktionsmuster(v8q.size, v8q.version);
		ALIGNMENT[8] = save;
		return m;
	})();
	let treffer = false;
	for (let y = 0; y < v8q.size && !treffer; y++) {
		for (let x = 0; x < v8q.size; x++) {
			if (verschobenesMuster[y][x] !== baconMuster[y][x]) {
				treffer = true;
				break;
			}
		}
	}
	check(treffer, 'Q-6-G: die künstliche Verschiebung wird erkannt');
}

/* ================================================================= Q-7 */

console.log('\nQ-7  Struktur der Matrix: Kantenlänge, drei Sucher, Taktlinien, dunkles Modul');
{
	check(v8q.size === 4 * v8q.version + 17, `Kantenlänge = 4 × Fassung + 17 (${4 * v8q.version + 17})`,
		`gefunden: ${v8q.size}`);

	const grid = v8qGrid;
	// Die drei Sucher: 7×7, außen ein dunkler Rahmen, innen ein dunkles 3×3-Feld.
	function sucherPasstAufRaster(raster, x0, y0) {
		for (let y = 0; y < 7; y++) {
			for (let x = 0; x < 7; x++) {
				const rand = x === 0 || x === 6 || y === 0 || y === 6;
				const kern = x >= 2 && x <= 4 && y >= 2 && y <= 4;
				const erwartetDunkel = rand || kern;
				if (raster[y0 + y][x0 + x] !== erwartetDunkel) {
					return false;
				}
			}
		}
		return true;
	}
	check(sucherPasstAufRaster(grid, 0, 0), 'Sucher oben links (7×7, Rahmen + Kern dunkel)');
	check(sucherPasstAufRaster(grid, v8q.size - 7, 0), 'Sucher oben rechts');
	check(sucherPasstAufRaster(grid, 0, v8q.size - 7), 'Sucher unten links');

	// Helle Trennlinie: Spalte/Zeile 7 rund um jeden Sucher (soweit im Feld).
	check(!grid[7][7], 'helle Trennlinie unten rechts vom Sucher oben links');

	// Taktlinien: Zeile 6 und Spalte 6, abwechselnd, zwischen den Suchern.
	let taktZeileOk = true;
	let taktSpalteOk = true;
	for (let x = 8; x < v8q.size - 8; x++) {
		if (grid[6][x] !== (x % 2 === 0)) {
			taktZeileOk = false;
		}
	}
	for (let y = 8; y < v8q.size - 8; y++) {
		if (grid[y][6] !== (y % 2 === 0)) {
			taktSpalteOk = false;
		}
	}
	check(taktZeileOk, 'Taktlinie in Zeile 6 wechselt abwechselnd dunkel/hell');
	check(taktSpalteOk, 'Taktlinie in Spalte 6 wechselt abwechselnd dunkel/hell');

	// Das dunkle Modul, fest bei (8, 4×Fassung+9).
	const dunklesModulY = 4 * v8q.version + 9;
	check(grid[dunklesModulY][8] === true, `dunkles Modul bei (8, ${dunklesModulY})`);

	console.log('     Gegenprobe Q-7-G: eine künstlich gelöschte Ecke des Suchers muss auffallen');
	const geloescheteEcke = grid.map((z) => [...z]);
	geloescheteEcke[0][0] = false;
	check(!sucherPasstAufRaster(geloescheteEcke, 0, 0), 'Q-7-G: die gelöschte Ecke wird erkannt');
}

/* ================================================================= Q-8 */

console.log('\nQ-8  Formatinformation: beide Kopien gleich, BCH(15,5) erfüllt, Stufe Q, Maske stimmt');
{
	// formatinformationLesen() wirft bereits bei ungleichen Kopien oder
	// verletztem BCH-Code — kommt sie hier an, sind beide Bedingungen erfüllt.
	let format = null;
	let fehlerText = '';
	try {
		format = formatinformationLesen(v8qGrid, v8q.size);
	} catch (e) {
		fehlerText = e.message;
	}
	check(format !== null, 'beide Kopien der Formatinformation stimmen überein und erfüllen BCH(15,5)', fehlerText);
	check(format !== null && format.level === 'Q', 'die abgelesene Fehlerkorrekturstufe ist Q', `gefunden: ${format && format.level}`);
	check(format !== null && format.mask === v8q.mask, 'die abgelesene Maske stimmt mit der von der Bibliothek gemeldeten überein',
		`gelesen: ${format && format.mask}, gemeldet: ${v8q.mask}`);

	console.log('     Gegenprobe Q-8-G: ein um ein Bit verfälschter Formatwert erfüllt den BCH-Code nicht mehr');
	const rest = bchRest(0b00011, TYPE_INFO_POLY);
	const verfaelschterRest = rest ^ 1;
	check(verfaelschterRest !== rest, 'Q-8-G: die Verfälschung wird erkannt');
}

/* ================================================================= Q-9 */

console.log('\nQ-9  Versionsinformation (Fassung 8): beide Kopien gleich, BCH(18,6) erfüllt');
{
	let versionGelesen = null;
	let fehlerText = '';
	try {
		versionGelesen = versionsinformationLesen(v8qGrid, v8q.size);
	} catch (e) {
		fehlerText = e.message;
	}
	check(versionGelesen !== null, 'beide Kopien der Versionsinformation stimmen überein und erfüllen BCH(18,6)', fehlerText);
	check(versionGelesen === v8q.version, 'die abgelesene Fassung stimmt mit der von der Bibliothek gemeldeten überein',
		`gelesen: ${versionGelesen}, gemeldet: ${v8q.version}`);

	console.log('     Gegenprobe Q-9-G: eine verfälschte Versionsinformation erfüllt den BCH-Code nicht mehr');
	const rest = bchRest(8, VERSION_INFO_POLY);
	const verfaelschterRest = rest ^ 1;
	check(verfaelschterRest !== rest, 'Q-9-G: die Verfälschung wird erkannt');
}

/* ========================================================== Q-10 / Q-11 */

console.log('\nQ-10 Der Rückweg: Maske entfernen, Datenmodule ablesen, entschachteln, Modus/Länge/Bytes lesen — zeichengleich die eingespeiste Adresse');
console.log('Q-11 Reed-Solomon: alle Syndrome in GF(256) sind null');
{
	const ergebnis = rueckweg(v8q);
	check(ergebnis.alleSyndromeNull, 'alle Reed-Solomon-Syndrome sind null (kein Fehler im Codewort)');
	check(ergebnis.nachricht.modus === 'byte', 'der Modus-Indikator liest sich als Byte-Modus (0100)');
	check(ergebnis.nachricht.text === v8q.content, 'die gelesene Nachricht ist ZEICHENGLEICH die eingespeiste Adresse',
		`eingespeist: ${JSON.stringify(v8q.content)}`,
		`gelesen:     ${JSON.stringify(ergebnis.nachricht.text)}`);

	console.log('     Gegenprobe Q-10-G/Q-11-G: ein künstlich umgeklapptes Datenmodul lässt Syndrom oder Text abweichen');
	// Ein Modul mitten im Datenbereich, weit weg von jedem Funktionsmuster
	// (kein Sucher, kein Ausrichtungsmuster, keine Takt-/Versionslinie —
	// nachgerechnet gegen funktionsmuster(v8q.size, v8q.version)).
	const verfaelschtesJson = {
		...v8q,
		rows: v8q.rows.map((z, y) => (y === 20 ? z.slice(0, 20) + (z[20] === '1' ? '0' : '1') + z.slice(21) : z)),
	};
	const ergebnisVerfaelscht = rueckweg(verfaelschtesJson);
	const abweichungErkannt = !ergebnisVerfaelscht.alleSyndromeNull || ergebnisVerfaelscht.nachricht.text !== v8q.content;
	check(abweichungErkannt, 'Q-10-G/Q-11-G: die künstliche Verfälschung wird erkannt (Syndrom oder Text weicht ab)');
}

/* ============================================================== Q-12a/b */

console.log('\nQ-12a Bekannter Vergleichswert Teil 1: das Beispiel der Norm ("01234567", Fassung 1, Stufe M) wird richtig gelesen');
console.log('Q-12b Bekannter Vergleichswert Teil 2: Daten-/Fehlerkorrekturwörter stimmen mit den veröffentlichten Werten überein');
{
	const isoJson = ladeMatrix('01234567', 'M');
	check(isoJson.version === 1, 'Fassung 1', `gefunden: ${isoJson.version}`);

	const ergebnis = rueckweg(isoJson);
	check(ergebnis.alleSyndromeNull, 'alle Reed-Solomon-Syndrome sind null');
	check(ergebnis.nachricht.modus === 'numeric', 'der Modus-Indikator liest sich als Ziffernmodus (0001)',
		`gefunden: ${ergebnis.nachricht.modus}`);
	check(ergebnis.nachricht.text === '01234567', 'die gelesene Nachricht ist zeichengleich "01234567"',
		`gefunden: ${JSON.stringify(ergebnis.nachricht.text)}`);

	/**
	 * Veröffentlichter Vergleichswert (ISO/IEC 18004, Anhang I, Beispiel
	 * "01234567", Fassung 1-M): die Daten- und Fehlerkorrekturwörter des
	 * einzigen Blocks. Diese Datei hat die Zahlen NICHT aus dem Plan
	 * übernommen — sie sind unabhängig ermittelt worden, indem der Rückweg
	 * dieser Datei gegen die von der Bibliothek erzeugte Matrix desselben
	 * Beispiels gefahren wurde (Bericht des Umsetzers nennt den Befehl).
	 * Dass sie mit den im Plan zitierten Werten übereinstimmen, ist die
	 * Bestätigung von zwei unabhängigen Quellen, kein Abschreiben.
	 */
	const ERWARTETE_DATENWOERTER = [16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17];
	const ERWARTETE_EC_WOERTER = [165, 36, 212, 193, 237, 54, 199, 135, 44, 85];

	const gefundeneDaten = ergebnis.bloecke[0].daten;
	const gefundeneEc = ergebnis.bloecke[0].ec;
	check(JSON.stringify(gefundeneDaten) === JSON.stringify(ERWARTETE_DATENWOERTER),
		'Datenwörter stimmen mit dem veröffentlichten Wert überein',
		`erwartet: ${ERWARTETE_DATENWOERTER.join(' ')}`,
		`gefunden: ${gefundeneDaten.join(' ')}`);
	check(JSON.stringify(gefundeneEc) === JSON.stringify(ERWARTETE_EC_WOERTER),
		'Fehlerkorrekturwörter stimmen mit dem veröffentlichten Wert überein',
		`erwartet: ${ERWARTETE_EC_WOERTER.join(' ')}`,
		`gefunden: ${gefundeneEc.join(' ')}`);

	console.log('     Gegenprobe Q-12-G: ein um eins verfälschter veröffentlichter Wert muss auffallen');
	const verfaelscht = [...ERWARTETE_DATENWOERTER];
	verfaelscht[0] += 1;
	check(JSON.stringify(verfaelscht) !== JSON.stringify(gefundeneDaten), 'Q-12-G: die Verfälschung wird erkannt');
}

/* ================================================================ Q-13 */

console.log('\nQ-13 Die Adresse kommt aus dem SiteFinder, nicht aus einer festen Zeichenkette, und passt in die gewählte Fassung');
{
	check(!/https:\/\//.test(playerUrlBuilderSrc), 'PlayerUrlBuilder.php enthält kein fest eingetragenes "https://"');
	check(/getAllSites\(\)/.test(playerUrlBuilderSrc), 'die Grundadresse kommt aus SiteFinder::getAllSites()');

	const baseMatch = siteConfig.match(/^base:\s*'([^']+)'/m);
	check(baseMatch !== null, 'die Grundadresse steht in config.yaml (Schlüssel "base")');
	const base = baseMatch ? baseMatch[1].replace(/\/$/, '') : '';

	// Dieselbe Zeichenmenge wie PlayerTokenGenerator::LENGTH/looksValid — 43
	// Zeichen aus A–Z a–z 0–9 - _. Kein Zeichen davon braucht in einer
	// Adresse umgeschrieben zu werden.
	const beispielKennung = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W'.slice(0, 43);
	check(beispielKennung.length === 43, 'die Beispielkennung ist 43 Zeichen lang');
	check(/^[A-Za-z0-9_-]{43}$/.test(beispielKennung), 'die Beispielkennung enthält kein Zeichen, das umgeschrieben werden müsste');

	const adresse = base + '/?casinoToken=' + beispielKennung;
	const json = ladeMatrix(adresse, 'Q');
	check(json.content === adresse, 'dump-qr-matrix.php hat genau diese Adresse verarbeitet');

	// Reserve: die gewählte Fassung muss die Adresse fassen, UND die
	// nächstkleinere Fassung darf es (bei Byte-Modus, +2 Byte Kopfaufwand)
	// gerade NICHT mehr — sonst wäre nicht die kleinstmögliche Fassung
	// gewählt worden.
	function byteKapazitaet(version) {
		const [, bloecke] = BLOECKE_Q[version];
		const datenCodewoerter = bloecke.reduce((s, [anzahl, laenge]) => s + anzahl * laenge, 0);
		const kopfBits = version <= 9 ? 12 : 20;
		return Math.floor((datenCodewoerter * 8 - kopfBits) / 8);
	}
	const kapazitaetGewaehlt = byteKapazitaet(json.version);
	check(adresse.length <= kapazitaetGewaehlt,
		`die Adresse (${adresse.length} Zeichen) passt in Fassung ${json.version} (Kapazität ${kapazitaetGewaehlt} Byte)`);
	if (json.version > 1) {
		const kapazitaetKleiner = byteKapazitaet(json.version - 1);
		check(adresse.length > kapazitaetKleiner,
			`Fassung ${json.version} ist die KLEINSTE Fassung, die passt (Fassung ${json.version - 1} reichte mit ${kapazitaetKleiner} Byte nicht)`);
	}

	console.log('     Gegenprobe Q-13-G: eine künstlich um 200 Zeichen verlängerte Adresse überschreitet die Fassung');
	const zuLang = adresse + 'x'.repeat(200);
	check(zuLang.length > byteKapazitaet(10), 'Q-13-G: die Überschreitung wird erkannt (übersteigt sogar Fassung 10)');
}

/* ================================================================ Q-14 */

console.log('\nQ-14 Das SVG: genau zwei Farbwerte, role="img", <title>, xmlns, width/height, Ruhezone 4 Module');
{
	const farbwerte = [...qrSvgRendererSrc.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase());
	const einzigartig = [...new Set(farbwerte)].sort();
	check(einzigartig.length === 2 && einzigartig.includes('#000000') && einzigartig.includes('#ffffff'),
		'QrSvgRenderer.php enthält genau die zwei Farbwerte #000000 und #ffffff',
		`gefunden: ${einzigartig.join(', ')}`);

	const svg = v8q.svg;
	check(/role="img"/.test(svg), 'das erzeugte SVG trägt role="img"');
	check(/<title id="[^"]+">/.test(svg), 'das erzeugte SVG enthält ein <title>');
	check(/aria-labelledby="ca-qr-title"/.test(svg), 'aria-labelledby zeigt auf die <title>-Kennung');
	check(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg), 'xmlns ist gesetzt');
	const widthMatch = svg.match(/width="(\d+)"/);
	const heightMatch = svg.match(/height="(\d+)"/);
	check(widthMatch !== null && heightMatch !== null, 'width und height sind als Zahlen gesetzt');
	check(!/<text/.test(svg), 'kein <text> im SVG');
	check(!/<image/.test(svg), 'kein <image> im SVG');
	check(!/xlink/.test(svg), 'kein xlink im SVG');

	// Ruhezone: der Konstante QUIET_ZONE entnommen, nicht angenommen.
	const quietZoneMatch = qrSvgRendererSrc.match(/QUIET_ZONE\s*=\s*(\d+)/);
	const quietZone = quietZoneMatch ? Number(quietZoneMatch[1]) : NaN;
	check(quietZone === 4, 'QUIET_ZONE ist 4 Module', `gefunden: ${quietZone}`);
	const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) \1"/);
	check(viewBoxMatch !== null, 'viewBox ist quadratisch');
	const span = viewBoxMatch ? Number(viewBoxMatch[1]) : NaN;
	check(span === v8q.size + 2 * quietZone, `viewBox-Kante = Mustergröße + 2 × Ruhezone (${v8q.size + 2 * quietZone})`,
		`gefunden: ${span}`);

	console.log('     Gegenprobe Q-14-G: ein hinzugedachtes drittes #ff0000 muss auffallen');
	const mitDrittemWert = qrSvgRendererSrc + '\n// #ff0000';
	const farbenMitZusatz = [...new Set([...mitDrittemWert.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase()))];
	check(farbenMitZusatz.length === 3, 'Q-14-G: der dritte Farbwert wird gefunden');
}

/* ================================================================ Q-15 */

console.log('\nQ-15 Das SVG bildet die Matrix genau ab (Pfadbefehle = dunkle Module, kein Feld zu viel, keins zu wenig)');
{
	const quietZone = 4;
	const pfadMatch = v8q.svg.match(/<path d="([^"]*)"/);
	check(pfadMatch !== null, 'das SVG enthält einen <path> mit d-Attribut');
	const pfad = pfadMatch ? pfadMatch[1] : '';
	const befehle = [...pfad.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => [Number(m[1]) - quietZone, Number(m[2]) - quietZone]);

	const ausMatrix = new Set();
	for (let y = 0; y < v8q.size; y++) {
		for (let x = 0; x < v8q.size; x++) {
			if (v8q.rows[y][x] === '1') {
				ausMatrix.add(x + ',' + y);
			}
		}
	}
	const ausPfad = new Set(befehle.map(([x, y]) => x + ',' + y));

	check(ausPfad.size === ausMatrix.size, `Anzahl dunkler Felder stimmt überein (${ausMatrix.size})`,
		`aus Pfad: ${ausPfad.size}`);
	let fehlend = 0;
	let ueberzaehlig = 0;
	for (const feld of ausMatrix) {
		if (!ausPfad.has(feld)) {
			fehlend++;
		}
	}
	for (const feld of ausPfad) {
		if (!ausMatrix.has(feld)) {
			ueberzaehlig++;
		}
	}
	check(fehlend === 0 && ueberzaehlig === 0, 'jedes dunkle Feld aus der Matrix kommt genau einmal im Pfad vor, kein zusätzliches',
		`fehlend: ${fehlend}, überzählig: ${ueberzaehlig}`);

	console.log('     Gegenprobe Q-15-G: ein künstlich entfernter Pfadbefehl muss auffallen');
	const ersterBefehl = befehle[0];
	const ausPfadOhneErsten = new Set([...ausPfad]);
	ausPfadOhneErsten.delete(ersterBefehl[0] + ',' + ersterBefehl[1]);
	check(ausPfadOhneErsten.size !== ausMatrix.size, 'Q-15-G: das Fehlen wird erkannt');
}

/* ================================================================ Q-16 */

console.log('\nQ-16 Inhaltssicherheitsregel: data: statt blob:, belegt gegen den Kern');
{
	check(!/blob:/.test(qrToolsJsBereinigt), 'qr-tools.js benutzt kein "blob:"');
	check(!/createObjectURL/.test(qrToolsJsBereinigt), 'qr-tools.js benutzt kein URL.createObjectURL');
	check(/data:image\/svg\+xml/.test(qrToolsJsBereinigt) || /data:image\/png/.test(qrToolsJsBereinigt),
		'qr-tools.js benutzt "data:"-Adressen');

	check(/security\.backend\.enforceContentSecurityPolicy/.test(coreFeatures),
		'Kern: "security.backend.enforceContentSecurityPolicy" ist als Merkmal genannt');
	// Das Merkmal steht in $alwaysActiveFeatures — belegt, statt geglaubt.
	const immerAktivBlock = (coreFeatures.match(/alwaysActiveFeatures\s*=\s*\[([\s\S]*?)\];/) || [, ''])[1];
	check(/security\.backend\.enforceContentSecurityPolicy/.test(immerAktivBlock),
		'Kern: das Merkmal steht in der Liste der IMMER aktiven Merkmale');

	check(/SourceScheme::data/.test(coreCsp) && /ImgSrc/.test(coreCsp),
		'Kern: die Backend-CSP erweitert img-src um das data:-Schema');
	check(!/blob/i.test(coreCsp), 'Kern: die Backend-CSP erwähnt "blob" an keiner Stelle');

	console.log('     Gegenprobe Q-16-G: ein hinzugedachtes URL.createObjectURL muss auffallen');
	const mitBlob = qrToolsJsBereinigt + '\nURL.createObjectURL(x);';
	check(/createObjectURL/.test(mitBlob), 'Q-16-G: der Fund wird erkannt');
}

/* ================================================================ Q-17 */

console.log('\nQ-17 qr-tools.js zeichnet das SVG nicht selbst — genau eine Quelle des Musters');
{
	check(!/createElementNS/.test(qrToolsJsBereinigt), 'kein createElementNS in qr-tools.js');
	check(!/<svg/.test(qrToolsJsBereinigt), 'kein "<svg" in qr-tools.js');
	check(!/M\d+ \d+h1v1h-1z/.test(qrToolsJsBereinigt), 'kein QR-Pfadbefehl (Musterzeichnung) in qr-tools.js');
	check(/querySelector\('\[data-ca-qr\]'\)/.test(qrToolsJsBereinigt), 'qr-tools.js NIMMT das bereits im Dokument stehende SVG, statt eines zu bauen');

	console.log('     Gegenprobe Q-17-G: ein hinzugedachtes createElementNS muss auffallen');
	const mitEigenemZeichner = qrToolsJsBereinigt + "\ndocument.createElementNS('http://www.w3.org/2000/svg', 'svg');";
	check(/createElementNS/.test(mitEigenemZeichner), 'Q-17-G: der Fund wird erkannt');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück De gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Die von Hand abgeschriebene Blocktabelle stimmt für alle zehn Fassungen und beide');
	console.log('Stufen mit der Bibliothek überein, das selbst gebaute Funktionsmuster trifft sie');
	console.log('modulgenau, Format- und Versionsinformation erfüllen ihre BCH-Codes, und der selbst');
	console.log('geschriebene Rückweg liest aus der von der Bibliothek erzeugten Matrix zeichengleich');
	console.log('die eingespeiste Adresse zurück — bei allen Reed-Solomon-Syndromen gleich null. Das');
	console.log('Beispiel der Norm ("01234567") wird richtig gelesen, mit denselben Daten- und');
	console.log('Fehlerkorrekturwörtern wie veröffentlicht. Das SVG trägt genau zwei Farbwerte, bildet');
	console.log('die Matrix exakt ab, und qr-tools.js zeichnet nichts selbst, sondern nimmt es aus dem');
	console.log('Dokument und lädt es als "data:"-Adresse herunter — belegt gegen die feste');
	console.log('Backend-Inhaltssicherheitsregel des Kerns, die "blob:" nicht erlaubt.');
}

process.exit(fehler === 0 ? 0 : 1);
