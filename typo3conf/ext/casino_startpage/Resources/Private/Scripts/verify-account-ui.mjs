/**
 * Casino Kunterbunt – casino_startpage: Nachweis Gewinnspeicher, Sperre,
 * Leuchtschild (Umsetzungsstück D3c, PLAN-d3-guthaben.md, Abschnitt 4.25)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18
 * (globales fetch), ohne jede npm-Abhängigkeit — dieselbe Bauart wie
 * verify-gate.mjs, verify-booking.mjs und verify-account-backend.mjs.
 *
 * GERÄTEFREI: dieses Skript nennt keine Geräte-Extension und kein
 * Kürzel-Präfix einer solchen (CONCEPT.md Abschnitt 5, Grundsatz 2 — dieselbe
 * Zusage, die verify-account-backend.mjs A-8 bereits für account-backend.js
 * selbst nachweist). Es prüft ausschließlich Dateien aus casino_startpage und
 * casino_account.
 *
 * DER SCHALTER WIRD GELESEN, NIE GESETZT (dieselbe Zusage wie in
 * verify-booking.mjs/verify-gate.mjs). U-8 läuft nur bei eingeschaltetem
 * Modus; beide Zustände zusammen zeigt der Messlauf der Hauptsitzung
 * (Plan, Abschnitt 7.3), nicht ein einzelner Lauf dieses Skripts.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-account-ui.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan, Abschnitt 4.25)
 * -------------------------------------------------------------------------
 *   U-1  Wächter: Pflichtdateien da, kein NUL-Byte
 *   U-2  Beide Leitern haben GENAU DREI Haken (konto.istServer) und keinen in
 *        collect()/destroy(); risk-timing.js ist byte-identisch zum Stand vor
 *        D3 (SHA-256)
 *   U-3  Node, lokaler Modus: eine vollständige Leiterfolge verhält sich wie
 *        vor D3 — kein fetch, claim.amount 1 → 2 → 4, Gewinn 0 danach
 *   U-4  Node, Servermodus mit Ersatz-fetch: dieselbe Folge sendet genau vier
 *        Buchungen (angebot, verdoppeln, verdoppeln, verloren); steigt der
 *        Spieler stattdessen aus, sind es angebot, verdoppeln, verdoppeln,
 *        gewinn — kein zusätzlicher verloren-Aufruf
 *   U-5  credit-set.js und credit-display.js entfernen ihre Bedienteile im
 *        Servermodus ohne Admin-Recht aus dem Dokument (nachgestelltes DOM)
 *        und lassen sie mit Admin-Recht bzw. im lokalen Modus stehen; Anzeige
 *        und Ansagebereich bleiben in jedem Fall erhalten
 *   U-6  frontend.css (casino_account) trägt die :has()-Regel für beide Haken,
 *        und beide Haken kommen im Markup von casino_startpage tatsächlich
 *        vor (beide Richtungen, wie G-6 es für die Torseite tut)
 *   U-7  die Sperranzeige steht als leeres <dialog> mit role="status",
 *        aria-labelledby auf eine echte id, zwei echten button-Elementen,
 *        ohne onclick; account-live.js hält cancel auf und enthält keinen
 *        deutschen Text
 *   U-8  live: bei eingeschaltetem Modus enthält die ausgelieferte Startseite
 *        für jeden Spielenden data-ck-credit (die Anzeige); geprüft wird
 *        zusätzlich am gelieferten HTML UND an der in U-6 bewiesenen
 *        CSS-Regel, ob [data-ca-bar] das Merkmal [data-ca-admin] trägt — bei
 *        einem Nicht-Admin fehlt es (die Regel greift, Aufladeteile
 *        unsichtbar), bei einem Admin steht es (die Regel greift nicht).
 *        HINWEIS: data-ck-credit-set/-form selbst stehen bei BEIDEN immer im
 *        HTML (serverseitig ungekürzt gerendert, per CSS/JS ausgeblendet,
 *        nicht weggelassen — Plan Befund 2/D.9) und sind deshalb kein
 *        geeignetes textuelles Prüfmerkmal ohne einen echten Browser.
 */

// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst und fährt bei eingeschaltetem Modus den
//  vollen Umfang, sonst eine Teilmenge. Läuft deshalb in BEIDEN Läufen.)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Das ECHTE fetch, gesichert BEVOR irgendein Testszenario globalThis.fetch
 * mit einem Ersatz überschreibt (U-8 braucht es für die echten Netzanfragen
 * am Ende — dieselbe Zusage wie in verify-account-backend.mjs). */
const ECHTES_FETCH = globalThis.fetch;
/** Node selbst (undici) benutzt globalThis.performance intern für sein
 * eigenes fetch() (Ressourcen-Zeitmessung) — die winzige Uhr für
 * RiskLadder.startLoop() (U-3/U-4) muss deshalb VOR U-8 wieder weichen,
 * sonst bricht das echte fetch() der laufenden Anwendung. */
const ECHTES_PERFORMANCE = globalThis.performance;

/* ============================================================================
   Pfade
   ============================================================================ */

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const RISK_LADDER_URL = new URL('risk-ladder.js', JS_DIR);
const RISK_LADDER_MULTI_URL = new URL('risk-ladder-multi.js', JS_DIR);
const RISK_TIMING_URL = new URL('risk-timing.js', JS_DIR);
const ACCOUNT_URL = new URL('account-backend.js', JS_DIR);
const CREDIT_URL = new URL('credit.js', JS_DIR);
const CREDIT_SET_URL = new URL('credit-set.js', JS_DIR);
const CREDIT_DISPLAY_URL = new URL('credit-display.js', JS_DIR);

/** typo3conf/ext/ — vier Ebenen über diesem Skript. */
const EXT_ROOT = new URL('../../../../', import.meta.url);
const ACCOUNT_CSS_URL = new URL('casino_account/Resources/Public/Css/frontend.css', EXT_ROOT);
const ACCOUNT_LIVE_JS_URL = new URL('casino_account/Resources/Public/JavaScript/account-live.js', EXT_ROOT);
const ACCOUNT_BAR_TEMPLATE_URL = new URL(
	'casino_account/Resources/Private/Templates/AccountBar/Index.html', EXT_ROOT
);
const HALL_CREDIT_SET_URL = new URL(
	'../../Private/PageView/Partials/Hall/CreditSet.html', import.meta.url
);
const HALL_CREDIT_URL = new URL(
	'../../Private/PageView/Partials/Hall/Credit.html', import.meta.url
);

/* ============================================================================
   Werkzeuge
   ============================================================================ */

let failed = false;
let zusagen = 0;

/**
 * @param {boolean} condition
 * @param {string} text
 * @param {...string} zeilen
 * @returns {void}
 */
function check(condition, text, ...zeilen) {
	zusagen += 1;
	console.log(`  ${condition ? '✓' : '✗'} ${text}`);
	if (!condition) {
		failed = true;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

/** Ein einzelnes NUL-Zeichen — als String.fromCharCode gebaut, damit kein
 * echtes Steuerzeichen im Quelltext dieses Prüfskripts selbst steht. */
const NUL_BYTE = String.fromCharCode(0);

/* ============================================================================
   U-1 — Wächter
   ============================================================================ */

console.log('U-1  Wächter: Pflichtdateien da, kein NUL-Byte');

const PFLICHTDATEIEN = [
	RISK_LADDER_URL, RISK_LADDER_MULTI_URL, RISK_TIMING_URL, ACCOUNT_URL,
	CREDIT_URL, CREDIT_SET_URL, CREDIT_DISPLAY_URL,
	ACCOUNT_CSS_URL, ACCOUNT_LIVE_JS_URL, ACCOUNT_BAR_TEMPLATE_URL,
	HALL_CREDIT_SET_URL, HALL_CREDIT_URL,
];
/** @type {Map<string, string>} */
const quellenText = new Map();
for (const url of PFLICHTDATEIEN) {
	let inhalt;
	try {
		inhalt = await readFile(fileURLToPath(url), 'utf8');
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — ${url.href} lässt sich nicht lesen: ${fehlerObjekt.message}`);
		process.exit(1);
	}
	check(!inhalt.includes(NUL_BYTE), `U-1: ${url.href.split('/').pop()} enthält kein NUL-Byte`);
	quellenText.set(url.href, inhalt);
}

const riskLadderSource = quellenText.get(RISK_LADDER_URL.href);
const riskLadderMultiSource = quellenText.get(RISK_LADDER_MULTI_URL.href);
const riskTimingSource = quellenText.get(RISK_TIMING_URL.href);
const accountBackendSource = quellenText.get(ACCOUNT_URL.href);
const creditSource = quellenText.get(CREDIT_URL.href);
const creditSetSource = quellenText.get(CREDIT_SET_URL.href);
const creditDisplaySource = quellenText.get(CREDIT_DISPLAY_URL.href);
const frontendCss = quellenText.get(ACCOUNT_CSS_URL.href);
const accountLiveSource = quellenText.get(ACCOUNT_LIVE_JS_URL.href);
const accountBarTemplate = quellenText.get(ACCOUNT_BAR_TEMPLATE_URL.href);
const hallCreditSetTemplate = quellenText.get(HALL_CREDIT_SET_URL.href);
const hallCreditTemplate = quellenText.get(HALL_CREDIT_URL.href);

/* ============================================================================
   U-2 — genau drei Haken je Leiter, collect()/destroy() unberührt,
   risk-timing.js unverändert
   ============================================================================ */

console.log('\nU-2  beide Leitern haben genau drei Haken (konto.istServer), keinen in collect()/destroy(); risk-timing.js ist byte-identisch zum Stand vor D3');

/**
 * Extrahiert den Rumpf einer Methode `name() { … }` durch Klammerzählung —
 * robust gegenüber der Einrücktiefe, anders als ein einfacher Regelausdruck.
 *
 * @param {string} source
 * @param {string} name
 * @returns {?string}
 */
function methodenRumpf(source, name) {
	const kopf = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{`);
	const treffer = kopf.exec(source);
	if (treffer === null) {
		return null;
	}
	const start = source.indexOf('{', treffer.index);
	let tiefe = 0;
	for (let i = start; i < source.length; i++) {
		if (source[i] === '{') {
			tiefe += 1;
		} else if (source[i] === '}') {
			tiefe -= 1;
			if (tiefe === 0) {
				return source.slice(start, i + 1);
			}
		}
	}
	return null;
}

for (const [label, source] of [['risk-ladder.js', riskLadderSource], ['risk-ladder-multi.js', riskLadderMultiSource]]) {
	const hakenZahl = (source.match(/konto\.istServer/g) || []).length;
	check(hakenZahl === 3, `U-2: ${label} hat genau drei Verweise auf konto.istServer (gefunden: ${hakenZahl})`);

	const collect = methodenRumpf(source, 'collect');
	const destroy = methodenRumpf(source, 'destroy');
	check(collect !== null && !collect.includes('konto'), `U-2: ${label}: collect() kennt konto nicht`);
	check(destroy !== null && !destroy.includes('konto'), `U-2: ${label}: destroy() kennt konto nicht`);
}

console.log('     Gegenprobe U-2-G: ein erfundener vierter Verweis wird als Abweichung erkannt');
const verfaelscht = `${riskLadderSource}\n// konto.istServer — ein vierter, erfundener Verweis`;
const verfaelschteZahl = (verfaelscht.match(/konto\.istServer/g) || []).length;
check(verfaelschteZahl === 4, 'U-2-G: der erfundene vierte Verweis wird gezählt (Zählung selbst funktioniert)');

/** Stand vor D3 (gemessen, bevor D3c risk-ladder.js/risk-ladder-multi.js
 * anfasste) — risk-timing.js selbst wird von D3 nicht berührt. */
const RISK_TIMING_HASH_VOR_D3 = '142f22678afac9ed4362ab30db42dcafc2059f6cc8af3de49c4bca7636bc740e';
const riskTimingHash = createHash('sha256').update(riskTimingSource, 'utf8').digest('hex');
check(riskTimingHash === RISK_TIMING_HASH_VOR_D3,
	`U-2: risk-timing.js SHA-256 unverändert (${riskTimingHash === RISK_TIMING_HASH_VOR_D3 ? 'stimmt' : `${riskTimingHash} ≠ ${RISK_TIMING_HASH_VOR_D3}`})`);

/* ============================================================================
   Werkzeuge — frische Modulinstanzen mit gesteuertem globalThis.document
   ============================================================================ */

let variantenZaehler = 0;

/**
 * Baut eine FRISCHE data:-URL von account-backend.js. account-backend.js hat
 * keinen einzigen Import (siehe Dateikopf) und lässt sich deshalb direkt so
 * laden. Der Zähler-Kommentar macht jede Kopie zu einer EIGENEN
 * Modul-Kennung — ohne ihn würde Node dieselbe URL (und damit denselben
 * bereits ausgewerteten `konto`) wiederverwenden, auch wenn sich
 * globalThis.document zwischen zwei Testfällen geändert hat (dasselbe
 * Verfahren wie ladeKonto() in verify-account-backend.mjs).
 *
 * @returns {string}
 */
function frischeKontoUrl() {
	variantenZaehler += 1;
	const variante = `${accountBackendSource}\n// verify-ui-konto-${variantenZaehler}`;
	return `data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`;
}

/**
 * Ein nachgestelltes document: querySelector liefert den Zustandsblock (oder
 * null), querySelectorAll liefert immer eine leere Liste (harmlos für den
 * Selbststart am Dateiende von credit-set.js/credit-display.js),
 * addEventListener/dispatchEvent sind ein minimaler, aber echter Ereignisbus.
 *
 * @param {?string} zustandJson
 * @returns {object}
 */
function baueSzenarioDokument(zustandJson) {
	/** @type {Map<string, Set<function>>} */
	const zuhoerer = new Map();
	return {
		querySelector(selector) {
			if (selector === 'script[type="application/json"][data-ca-state]' && zustandJson !== null) {
				return { textContent: zustandJson };
			}
			return null;
		},
		querySelectorAll() {
			return [];
		},
		addEventListener(type, handler) {
			if (!zuhoerer.has(type)) {
				zuhoerer.set(type, new Set());
			}
			zuhoerer.get(type).add(handler);
		},
		removeEventListener(type, handler) {
			zuhoerer.get(type)?.delete(handler);
		},
		dispatchEvent(event) {
			for (const handler of [...(zuhoerer.get(event.type) ?? [])]) {
				handler(event);
			}
			return true;
		},
	};
}

/** Ein Zustandsblock, der als Ausgangslage für U-4 dient. */
function basiszustand() {
	return {
		endpunkte: {
			buchung: 'https://konto.invalid/casino-konto/buchung',
			stand: 'https://konto.invalid/casino-konto/stand',
			feld: 'https://konto.invalid/casino-konto/feld',
		},
		kasse: 0,
		geraet: 0,
		gewinn: 0,
		gesamt: 0,
		admin: false,
		max: 999999999,
		speicher: {},
	};
}

let riskLadderVariantenZaehler = 0;

/**
 * Lädt eine FRISCHE Instanz von risk-ladder.js, dessen Import von
 * account-backend.js auf eine ebenso frische Konto-Instanz umgeschrieben ist.
 * globalThis.document MUSS vor dem Aufruf schon feststehen.
 *
 * @returns {Promise<{RiskLadder: function, konto: object}>}
 */
async function ladeRiskLadder() {
	const kontoUrl = frischeKontoUrl();
	const gepatcht = riskLadderSource.replaceAll(
		"'@phomo17/casino-startpage/risk-timing.js'", JSON.stringify(RISK_TIMING_URL.href)
	).replaceAll(
		"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(kontoUrl)
	);
	riskLadderVariantenZaehler += 1;
	const variante = `${gepatcht}\n// verify-ui-risk-ladder-${riskLadderVariantenZaehler}`;
	const modul = await import(`data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`);
	const { konto } = await import(kontoUrl);
	return { RiskLadder: modul.RiskLadder, konto };
}

/* ============================================================================
   Eine winzige virtuelle Uhr für RiskLadder.startLoop() — dieselbe Bauart wie
   in verify-risk-timing.mjs. Die Zeichenschleife selbst wird hier NICHT
   angestoßen (kein advance()): U-3/U-4 werten this.lit synchron aus, direkt
   nach offer()/start()/hit() — requestAnimationFrame muss nur EXISTIEREN,
   damit startLoop() nicht auf eine fehlende Browser-API trifft.
   ============================================================================ */

let frameZaehler = 0;
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => { frameZaehler += 1; return frameZaehler; };
globalThis.cancelAnimationFrame = () => {};

/* ============================================================================
   U-3 — Node, lokaler Modus: unverändert wie vor D3
   ============================================================================ */

console.log('\nU-3  Node, lokaler Modus: eine vollständige Leiterfolge verhält sich wie vor D3 — kein fetch, claim.amount 1 → 2 → 4, Gewinn 0 danach');

{
	let fetchAufrufe = 0;
	globalThis.fetch = async () => {
		fetchAufrufe += 1;
		throw new Error('fetch hätte im lokalen Modus NIE gerufen werden dürfen');
	};
	// Kein Zustandsblock: account-backend.js fällt von selbst in den
	// lokalen Modus (zustandLesen() findet nichts).
	globalThis.document = baueSzenarioDokument(null);

	const { RiskLadder, konto } = await ladeRiskLadder();
	check(konto.istServer === false, 'U-3: konto.istServer ist ohne Zustandsblock false');

	const claim = { amount: 1, collect: () => {}, discard: () => {} };
	const ladder = new RiskLadder({ draw: () => 0, paint: () => {}, notify: () => {} });

	ladder.offer(claim);
	ladder.start();
	ladder.guess(ladder.lit);               // Treffer: 1 → 2
	const nach1 = claim.amount;
	ladder.guess(ladder.lit);                // Treffer: 2 → 4
	const nach2 = claim.amount;
	const falscheSeite = ladder.lit === 'left' ? 'right' : 'left';
	ladder.guess(falscheSeite);              // Fehlgriff

	check(nach1 === 2 && nach2 === 4, `U-3: claim.amount läuft 1 → 2 → 4 (gefunden: 1 → ${nach1} → ${nach2})`);
	check(ladder.win === 0, `U-3: nach dem Fehlgriff zeigt die Leiter 0 (gefunden: ${ladder.win})`);
	check(fetchAufrufe === 0, `U-3: über die ganze Folge wurde fetch NIE gerufen (gezählt: ${fetchAufrufe})`);
}

/* ============================================================================
   U-4 — Node, Servermodus mit Ersatz-fetch
   ============================================================================ */

console.log('\nU-4  Node, Servermodus mit Ersatz-fetch: angebot, verdoppeln, verdoppeln, verloren — bzw. …, gewinn beim Aussteigen, kein zusätzliches verloren');

/**
 * Wartet, bis mindestens `mindestens` Buchungen aufgezeichnet sind, oder
 * gibt nach spätestens zwei Sekunden auf — die Buchungen aus offer()/hit()/
 * miss() laufen NICHT awaited (B.6.1: die Zeitmessung der Leiter darf nicht
 * verschoben werden), sondern über die serialisierte Kette in
 * account-backend.js.
 *
 * @param {Array} liste
 * @param {number} mindestens
 * @returns {Promise<void>}
 */
async function warteAufBuchungen(liste, mindestens) {
	const start = Date.now();
	while (liste.length < mindestens && Date.now() - start < 2000) {
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => { globalThis.setTimeout(resolve, 5); });
	}
}

{
	/** @type {string[]} */
	const gebuchteArten = [];
	globalThis.document = baueSzenarioDokument(JSON.stringify(basiszustand()));
	globalThis.fetch = async (url, optionen) => {
		const rumpf = JSON.parse(optionen.body);
		gebuchteArten.push(rumpf.art);
		return {
			ok: true,
			async json() {
				return { ok: true, kasse: 0, geraet: 0, gewinn: 1, gesamt: 1, bewegt: 1, gekappt: false, doppelt: false };
			},
		};
	};

	const { RiskLadder, konto } = await ladeRiskLadder();
	check(konto.istServer === true, 'U-4: konto.istServer ist mit Zustandsblock true');

	const claim = { amount: 1, collect: () => {}, discard: () => {} };
	const ladder = new RiskLadder({ draw: () => 0, paint: () => {}, notify: () => {} });

	ladder.offer(claim);
	ladder.start();
	ladder.guess(ladder.lit);
	ladder.guess(ladder.lit);
	const falscheSeite = ladder.lit === 'left' ? 'right' : 'left';
	ladder.guess(falscheSeite);

	await warteAufBuchungen(gebuchteArten, 4);
	check(gebuchteArten.join(',') === 'angebot,verdoppeln,verdoppeln,verloren',
		`U-4: die Buchungsfolge ist angebot, verdoppeln, verdoppeln, verloren (gefunden: ${gebuchteArten.join(',') || '(keine)'})`);
}

{
	/** @type {string[]} */
	const gebuchteArten = [];
	globalThis.document = baueSzenarioDokument(JSON.stringify(basiszustand()));
	globalThis.fetch = async (url, optionen) => {
		const rumpf = JSON.parse(optionen.body);
		gebuchteArten.push(rumpf.art);
		return {
			ok: true,
			async json() {
				return { ok: true, kasse: 0, geraet: 0, gewinn: 1, gesamt: 1, bewegt: 1, gekappt: false, doppelt: false };
			},
		};
	};

	const { RiskLadder, konto } = await ladeRiskLadder();
	// Der Anspruch bucht beim Einlösen selbst 'gewinn' — GENAU SO, wie es
	// machine-credit.js::award() im Betrieb tut (konto.gewinn(amount)); siehe
	// dessen Kopf. Dieser Prüffall bildet nur diesen einen Aufruf nach, ohne
	// ein Gerät oder machine-credit.js selbst zu laden — die Leiter kennt
	// beides nicht (Dateikopf, „SIE KENNT KEIN EINZIGES GERÄT").
	const claim = {
		amount: 1,
		collect: () => { void konto.gewinn(claim.amount); },
		discard: () => {},
	};
	const ladder = new RiskLadder({ draw: () => 0, paint: () => {}, notify: () => {} });

	ladder.offer(claim);
	ladder.start();
	ladder.guess(ladder.lit);
	ladder.guess(ladder.lit);
	ladder.collect();

	await warteAufBuchungen(gebuchteArten, 4);
	check(gebuchteArten.join(',') === 'angebot,verdoppeln,verdoppeln,gewinn',
		`U-4: steigt der Spieler statt dessen aus, ist die Folge angebot, verdoppeln, verdoppeln, gewinn (gefunden: ${gebuchteArten.join(',') || '(keine)'})`);
	check(!gebuchteArten.includes('verloren'), 'U-4: kein zusätzlicher verloren-Aufruf beim Einlösen');
}

// Das echte fetch UND die echte performance zurück — U-8 braucht sie für
// die laufende Anwendung; Node's eigenes fetch() (undici) benutzt
// performance intern.
globalThis.fetch = ECHTES_FETCH;
globalThis.performance = ECHTES_PERFORMANCE;
delete globalThis.document;

/* ============================================================================
   U-5 — credit-set.js und credit-display.js entfernen ihre Bedienteile nur
   im Servermodus ohne Admin-Recht
   ============================================================================ */

console.log('\nU-5  credit-set.js/credit-display.js entfernen ihre Bedienteile im Servermodus ohne Admin-Recht aus dem Dokument, sonst nicht');

let variantenZaehlerModul = 0;

/**
 * NACHBESSERUNG (Behebungslauf nach D3-Audit, Befund N-01): credit.js
 * importiert account-backend.js seit der Korrektur vom 2026-09-10 wieder
 * über das PRÄFIX (Kommentar an credit.js, Zeile 63 ff.) statt relativ. Die
 * echte Datei-Adresse CREDIT_URL.href lässt sich deshalb nicht mehr
 * unverändert importieren — Node kennt die Import-Karte des Kerns nicht und
 * bräche mit ERR_MODULE_NOT_FOUND ab. Genau dieselbe Auflösung wie in
 * verify-machine-credit.mjs (dort creditDataUrl genannt): credit.js wird
 * EINMAL als Text gelesen (creditSource, oben aus PFLICHTDATEIEN), sein
 * eigener account-backend.js-Import auf die echte, unpatchte Adresse von
 * account-backend.js umgeschrieben (die Datei hat selbst keinen einzigen
 * Import, siehe deren Dateikopf) und als EIN data:-Modul bereitgestellt.
 * Dieselbe Adresse für jeden Aufruf von ladeCreditModul() — genau wie zuvor
 * CREDIT_URL.href für jeden Aufruf dieselbe Adresse war —, damit `credit`
 * über die ganze Prüfung hinweg derselbe Modul-Singleton bleibt.
 */
const patchedCreditSource = creditSource.replaceAll(
	"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(ACCOUNT_URL.href)
);
check(patchedCreditSource !== creditSource, 'U-5: der Modulname in credit.js wurde für Node aufgelöst');
const CREDIT_PATCHED_URL = `data:text/javascript;base64,${Buffer.from(patchedCreditSource, 'utf8').toString('base64')}`;

/**
 * Lädt eine FRISCHE Instanz von credit-set.js ODER credit-display.js, mit
 * ihrem Import von credit.js auf die für Node aufgelöste Adresse und ihrem
 * Import von account-backend.js auf eine frische Konto-Instanz umgeschrieben.
 * globalThis.document MUSS vor dem Aufruf schon feststehen.
 *
 * @param {string} source
 * @param {string} label
 * @returns {Promise<object>}
 */
async function ladeCreditModul(source, label) {
	const gepatcht = source.replaceAll(
		"'@phomo17/casino-startpage/credit.js'", JSON.stringify(CREDIT_PATCHED_URL)
	).replaceAll(
		"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(frischeKontoUrl())
	);
	variantenZaehlerModul += 1;
	const variante = `${gepatcht}\n// verify-ui-${label}-${variantenZaehlerModul}`;
	return import(`data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`);
}

/**
 * Ein winziges, nachgestelltes Element: merkt sich, ob remove() gerufen
 * wurde, und beantwortet querySelector/querySelectorAll aus einer Map.
 *
 * @param {{querySelector?: Map<string, object>, querySelectorAll?: Map<string, object[]>}} [antworten]
 * @returns {{remove: function, removed: boolean, querySelector: function, querySelectorAll: function, addEventListener: function, dataset: object}}
 */
function fakeElement(antworten = {}) {
	const qs = antworten.querySelector ?? new Map();
	const qsa = antworten.querySelectorAll ?? new Map();
	const el = {
		removedFlag: false,
		remove() { el.removedFlag = true; },
		querySelector(sel) { return qs.get(sel) ?? null; },
		querySelectorAll(sel) { return qsa.get(sel) ?? []; },
		addEventListener() {},
		dataset: {},
	};
	return el;
}

/**
 * @param {object[]} elemente
 * @returns {{querySelectorAll: function}}
 */
function fakeRoot(elemente) {
	return { querySelectorAll: () => elemente };
}

/**
 * Prüft credit-set.js: lädt eine frische Instanz mit dem gegebenen
 * Zustandsblock und ruft bindCreditSet() mit einem nachgestellten
 * [data-ck-credit-set]-Bedienteil auf.
 *
 * @param {?string} dokumentJson
 * @returns {Promise<boolean>} ob der Bedienteil entfernt wurde
 */
async function pruefeCreditSet(dokumentJson) {
	globalThis.document = baueSzenarioDokument(dokumentJson);
	const { bindCreditSet } = await ladeCreditModul(creditSetSource, 'credit-set');
	const formEl = fakeElement();
	const part = fakeElement({ querySelector: new Map([['[data-ck-credit-set-form]', formEl]]) });
	bindCreditSet(fakeRoot([part]));
	return part.removedFlag;
}

/**
 * Prüft credit-display.js: lädt eine frische Instanz mit dem gegebenen
 * Zustandsblock und ruft bindCreditDisplays() mit einem nachgestellten
 * [data-ck-credit]-Schild auf, dessen [data-ck-credit-form] entfernt werden
 * soll.
 *
 * @param {?string} dokumentJson
 * @returns {Promise<boolean>} ob das Formular entfernt wurde
 */
async function pruefeCreditDisplay(dokumentJson) {
	globalThis.document = baueSzenarioDokument(dokumentJson);
	const { bindCreditDisplays } = await ladeCreditModul(creditDisplaySource, 'credit-display');
	const formEl = fakeElement();
	const sign = fakeElement({ querySelector: new Map([['[data-ck-credit-form]', formEl]]) });
	bindCreditDisplays(fakeRoot([sign]));
	return formEl.removedFlag;
}

for (const [modulName, pruefen] of [['credit-set.js', pruefeCreditSet], ['credit-display.js', pruefeCreditDisplay]]) {
	// eslint-disable-next-line no-await-in-loop
	const lokal = await pruefen(null);
	check(lokal === false, `U-5: ${modulName}: lokaler Modus entfernt nichts`);

	// eslint-disable-next-line no-await-in-loop
	const serverNichtAdmin = await pruefen(JSON.stringify({ ...basiszustand(), admin: false }));
	check(serverNichtAdmin === true, `U-5: ${modulName}: Servermodus ohne Admin-Recht entfernt den Bedienteil`);

	// eslint-disable-next-line no-await-in-loop
	const serverAdmin = await pruefen(JSON.stringify({ ...basiszustand(), admin: true }));
	check(serverAdmin === false, `U-5: ${modulName}: Servermodus MIT Admin-Recht entfernt nichts`);
}

delete globalThis.document;

/* ============================================================================
   U-6 — frontend.css und das Markup von casino_startpage stimmen überein
   ============================================================================ */

console.log('\nU-6  frontend.css trägt die :has()-Regel für beide Haken, und beide Haken kommen im Markup tatsächlich vor (beide Richtungen)');

{
	const inCss = new Set([...frontendCss.matchAll(/\[(data-ck-credit-[a-z-]+)]/g)].map((m) => m[1]));
	const HAKEN = ['data-ck-credit-set', 'data-ck-credit-form'];
	for (const haken of HAKEN) {
		check(inCss.has(haken), `U-6: frontend.css enthält den Selektor [${haken}]`);
	}
	check(new RegExp(`:has\\(\\[data-ca-bar]:not\\(\\[data-ca-admin]\\)\\)\\s*\\[data-ck-credit-set]`).test(frontendCss),
		'U-6: die :has()-Regel gilt für [data-ck-credit-set]');
	check(new RegExp(`:has\\(\\[data-ca-bar]:not\\(\\[data-ca-admin]\\)\\)\\s*\\[data-ck-credit-form]`).test(frontendCss),
		'U-6: die :has()-Regel gilt für [data-ck-credit-form]');

	const markup = hallCreditSetTemplate + '\n' + hallCreditTemplate;
	for (const haken of HAKEN) {
		check(new RegExp(`\\b${haken}="`).test(markup), `U-6: ${haken} kommt im Markup von casino_startpage tatsächlich vor`);
	}

	console.log('     Gegenprobe U-6-G: ein erfundenes [data-ck-credit-xy] wird als in der Vorlage fehlend erkannt');
	const erfundenGefunden = new RegExp('\\bdata-ck-credit-xy="').test(markup);
	check(erfundenGefunden === false, 'U-6-G: das erfundene Attribut ist zurecht nicht im Markup');
}

/* ============================================================================
   U-7 — Sperranzeige und account-live.js
   ============================================================================ */

console.log('\nU-7  die Sperranzeige steht als leeres <dialog> mit role="status" und zwei echten Schaltflächen; account-live.js hält cancel auf und enthält keinen deutschen Text');

{
	const dialogTreffer = /<dialog\b[^>]*class="ca-lock"[^>]*>[\s\S]*?<\/dialog>/.exec(accountBarTemplate);
	check(dialogTreffer !== null, 'U-7: ein <dialog class="ca-lock"> steht in der Vorlage');
	const dialogBlock = dialogTreffer?.[0] ?? '';

	check(/aria-labelledby="ca-lock-titel"/.test(dialogBlock), 'U-7: das <dialog> trägt aria-labelledby="ca-lock-titel"');
	check(/id="ca-lock-titel"/.test(dialogBlock), 'U-7: eine id="ca-lock-titel" existiert wirklich im selben Block');
	check(/role="status"/.test(dialogBlock), 'U-7: der Text-Absatz trägt role="status"');
	check((dialogBlock.match(/<button\b/g) || []).length === 2, 'U-7: es stehen genau zwei echte <button>-Elemente im Dialog');
	check(!/onclick=/.test(dialogBlock), 'U-7: kein onclick-Attribut im Dialog');
	check(/data-ca-lock-retry/.test(dialogBlock) && /data-ca-lock-reload/.test(dialogBlock),
		'U-7: beide Schaltflächen tragen ihr data-Kennzeichen');

	check(!/\bimport\b/.test(accountLiveSource), 'U-7: account-live.js hat keinen einzigen Import');
	check(/addEventListener\(\s*['"]cancel['"]/.test(accountLiveSource), "U-7: account-live.js hört auf 'cancel'");
	check(/preventDefault\(\)/.test(accountLiveSource), 'U-7: … und ruft dort preventDefault() — die Sperre lässt sich nicht wegdrücken');

	// Kommentare zuerst entfernt (dieselbe Bauart wie ohneJsKommentare() in
	// verify-gate.mjs): sonst koppelt eine deutsche „…"-Anführung im
	// Kommentarkopf (schließendes " ist ein gerades Anführungszeichen,
	// Hausstil) mit dem nächsten echten Zeichenkettenzeichen im Code und die
	// Prüfung liest den ganzen dazwischenliegenden Quelltext als eine
	// „Zeichenkette" mit.
	const ohneKommentare = accountLiveSource
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
	const stringLiterale = [...ohneKommentare.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/g)].map((m) => m[0]);
	const mitLeerzeichen = stringLiterale.filter((s) => / /.test(s.slice(1, -1)));
	check(mitLeerzeichen.length === 0, 'U-7: keine Zeichenkette in account-live.js enthält ein Leerzeichen (also keinen sichtbaren deutschen Satz)', ...mitLeerzeichen);
}

/* ============================================================================
   U-8 — live
   ============================================================================ */

console.log('\nU-8  live: bei eingeschaltetem Modus enthält die Startseite data-ck-credit; [data-ca-bar] trägt [data-ca-admin] nur beim Admin (U-6-Regel greift entsprechend)');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const WEG1_BASIS = 'https://casino-kunterbunt.ddev.site';
const WEG2_BASIS = 'http://127.0.0.1';
const HOST_KOPFZEILE = 'casino-kunterbunt.ddev.site';
let benutzterWeg = null;

/**
 * @param {string} pfad
 * @param {object} [optionen]
 * @returns {Promise<{status: number, text: string}>}
 */
async function seite(pfad, optionen = {}) {
	const versuche = [
		{ basis: WEG1_BASIS, headers: {} },
		{ basis: WEG2_BASIS, headers: { Host: HOST_KOPFZEILE } },
	];
	let letzterFehler = null;
	for (const versuch of versuche) {
		try {
			const antwort = await fetch(versuch.basis + pfad, {
				method: optionen.methode ?? 'GET',
				headers: { ...versuch.headers, ...(optionen.headers ?? {}) },
				redirect: optionen.redirect ?? 'follow',
			});
			const text = await antwort.text();
			if (benutzterWeg === null) {
				benutzterWeg = versuch.basis;
			}
			return { status: antwort.status, text };
		} catch (fehlerObjekt) {
			letzterFehler = fehlerObjekt;
		}
	}
	console.log(`\nERGEBNIS: Abbruch — die laufende Website ist nicht erreichbar: ${letzterFehler?.message}`);
	console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand — U-8 wurde NICHT übersprungen, sondern konnte nicht laufen.');
	process.exit(1);
}

let registryAusgabe;
try {
	registryAusgabe = execFileSync(
		'mysql',
		['-e', "SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
		{ encoding: 'utf8' }
	);
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
const registryZeile = (registryAusgabe.split('\n')[1] ?? '').trim();
const qrModeAn = registryZeile === 'b:1;';
console.log(`\n(gemessener Schalterstand: ${qrModeAn ? 'AN' : 'AUS'}${registryZeile === '' ? ' — noch nie geschaltet' : ''})`);

if (qrModeAn) {
	/**
	 * @param {string} sql
	 * @returns {string}
	 */
	function zeile(sql) {
		const ausgabe = execFileSync('mysql', ['-e', sql], { encoding: 'utf8' });
		return (ausgabe.split('\n')[1] ?? '').trim();
	}

	const adminToken = zeile(
		"SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 "
		+ "AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;"
	) || zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 ORDER BY uid LIMIT 1;');
	const nichtAdminToken = zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=0 ORDER BY uid LIMIT 1;');

	if (adminToken === '' || nichtAdminToken === '') {
		console.log('\nERGEBNIS: Abbruch — U-8 braucht einen Admin UND einen Nicht-Admin in tx_casinoaccount_player; mindestens einer fehlt.');
		process.exit(1);
	}

	/**
	 * @param {string} token
	 * @returns {Promise<string>} der Sitzungs-Cookie
	 */
	async function anmelden(token) {
		const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
		const basis = benutzterWeg ?? WEG1_BASIS;
		const antwort = await fetch(basis + '/?casinoToken=' + encodeURIComponent(token), {
			redirect: 'manual',
			headers: headerZusatz,
		});
		const setCookieZeilen = typeof antwort.headers.getSetCookie === 'function' ? antwort.headers.getSetCookie() : [];
		return setCookieZeilen.map((z) => z.split(';')[0]).join('; ');
	}

	/**
	 * @param {string} cookie
	 * @returns {Promise<void>}
	 */
	async function abmelden(cookie) {
		await seite('/', { methode: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' } });
	}

	/**
	 * data-ck-credit-set/-form stehen IMMER im ausgelieferten HTML (Fluid
	 * rendert sie serverseitig unbedingt; ausgeblendet wird per CSS/JS, nicht
	 * durch Weglassen — das ist die zweite Verteidigungslinie aus Befund 2,
	 * die serverseitige aus D.9/BookingService::NUR_ADMIN die erste). Wonach
	 * hier deshalb tatsächlich gesucht wird: die Vorbedingung, unter der die
	 * in U-6 bereits bewiesene :has()-Regel greift — [data-ca-bar] MIT oder
	 * OHNE das Geschwister-Attribut [data-ca-admin]. „Geprüft am gelieferten
	 * HTML UND an der CSS-Regel" (Plan 4.25) heißt genau diese Kombination,
	 * nicht eine (hier unmögliche) Prüfung nach Skriptlauf ohne Browser.
	 *
	 * @param {string} html
	 * @returns {?boolean} true, wenn [data-ca-bar] das Merkmal [data-ca-admin]
	 *          trägt; null, wenn keine Kontenleiste im HTML steht
	 */
	function traegtAdminMerkmal(html) {
		const treffer = /<div class="ca-bar"[^>]*>/.exec(html);
		if (treffer === null) {
			return null;
		}
		return treffer[0].includes('data-ca-admin');
	}

	// erste Anfrage stellt WEG1/WEG2 fest
	await seite('/');

	const nichtAdminCookie = await anmelden(nichtAdminToken);
	const nichtAdminSeite = await seite('/', { headers: { Cookie: nichtAdminCookie } });
	check(nichtAdminSeite.text.includes('data-ck-credit'), 'U-8: Nicht-Admin: die Startseite enthält data-ck-credit (die Anzeige)');
	check(traegtAdminMerkmal(nichtAdminSeite.text) === false,
		'U-8: Nicht-Admin: [data-ca-bar] trägt KEIN [data-ca-admin] — die :has()-Regel aus U-6 greift, das Leuchtschild bleibt ohne Aufladeteile');
	await abmelden(nichtAdminCookie);

	const adminCookie = await anmelden(adminToken);
	const adminSeite = await seite('/', { headers: { Cookie: adminCookie } });
	check(adminSeite.text.includes('data-ck-credit'), 'U-8: Admin: die Startseite enthält data-ck-credit (die Anzeige)');
	check(traegtAdminMerkmal(adminSeite.text) === true,
		'U-8: Admin: [data-ca-bar] trägt [data-ca-admin] — die :has()-Regel aus U-6 greift NICHT, die Aufladeteile bleiben stehen');
	await abmelden(adminCookie);
} else {
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — siehe Messlauf der Hauptsitzung, Plan 7.3)');
}

/* ============================================================================ */

console.log(failed
	? `\nERGEBNIS: mindestens eine Prüfung ist rot (${zusagen} Zusagen geprüft).`
	: `\nERGEBNIS: alle ${zusagen} Zusagen stimmen.`);
process.exit(failed ? 1 : 0);
