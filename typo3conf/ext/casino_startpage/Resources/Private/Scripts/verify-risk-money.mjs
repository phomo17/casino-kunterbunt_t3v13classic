/**
 * Casino Kunterbunt – Nachweis: der erste Erhöhungsschritt der Risiko-Leiter
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-risk-money.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Behebungslauf 2026-09-11)
 * ---------------------------------------------------
 * Gemeldeter Fehler: im SERVERMODUS blieb nach dem ersten richtigen Tipp
 * (Stufe 1 → 2) die Erhöhung aus — weder verdoppelt noch vervielfacht. Ab
 * Stufe 2 → 3 stimmte es wieder. Ursache (in hit() beider geteilter Leitern):
 * this.claim.amount wurde im Servermodus GAR NICHT sofort gesetzt, sondern
 * erst im .then() der Serverbuchung, Millisekunden später. Bis dahin lasen
 * sowohl die Anzeige (render('level')/report()) als auch ein zweiter,
 * schneller Tastendruck noch den ALTEN Betrag — und der zweite Druck bucht
 * auf dessen Basis zu wenig: aus 10 → 20 → 40 wurde 10 → 20 → 30, ein echter
 * Geldverlust, nicht nur ein Anzeigefehler. Zusätzlich kannte kein einziges
 * Gerät render('sync') — die spätere Serverkorrektur erreichte deshalb nie
 * die Anzeige.
 *
 *   RL-1  risk-ladder.js (Faktor 2, fest, Vorgang "verdoppeln"):
 *         Servermodus, zwei Treffer BEVOR die erste Buchung zurück ist →
 *         10 → 20 → 40, nicht 10 → 20 → 30. Anzeige UND gesendete
 *         Buchungsbeträge werden geprüft.
 *   RL-2  risk-ladder-multi.js, Faktor 4 und Faktor 8 (Vorgang "angebot",
 *         additiv): dieselbe Prüfung, denselben Aufbau — die Kappungs- und
 *         Additionslogik aus D.7.2 gilt für jeden Faktor gleich.
 *   RL-3  render('sync') trägt am Ende den vom (nachgestellten) Server
 *         bestätigten Betrag — für beide Dateien.
 *   RL-4  collect() liest sofort den optimistischen (bereits erhöhten)
 *         Betrag, nicht den noch nicht bestätigten alten Stand.
 *   RL-5  lokaler Modus (konto.istServer === false): unverändert synchron,
 *         ohne jede Netzanfrage — reine Rückwärtskompatibilitätsprobe.
 *
 * Gerechnet wird mit den ECHTEN Dateien risk-ladder.js, risk-ladder-multi.js
 * UND account-backend.js — als Text gelesen und über eine data:-Adresse
 * geladen (dasselbe Verfahren wie in verify-risk-timing.mjs und
 * verify-account-backend.mjs). Gefälscht wird NUR der wahre äußere Rand:
 * globalThis.fetch — als eine Warteschlange, die eine Antwort erst dann
 * ausliefert, wenn dieses Skript es ausdrücklich verlangt. Damit lässt sich
 * "zwei Treffer, bevor die erste Buchung zurück ist" exakt nachstellen, ohne
 * irgendeine der drei Dateien selbst nachzubauen.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const RISK_LADDER_URL = new URL('risk-ladder.js', JS_DIR);
const RISK_LADDER_MULTI_URL = new URL('risk-ladder-multi.js', JS_DIR);
const TIMING_FILE_URL = new URL('risk-timing.js', JS_DIR).href;
const ACCOUNT_URL = new URL('account-backend.js', JS_DIR);

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

/**
 * requestAnimationFrame/cancelAnimationFrame existieren in Node nicht von
 * selbst; beginLevel() ruft sie über startLoop() dennoch auf. Für diesen
 * Nachweis genügt ein wirkungsloser Ersatz — geprüft wird hier ausschließlich
 * die Geldrechnung und render('sync'), nicht der Blinktakt (der ist Sache von
 * verify-risk-timing.mjs). globalThis.performance existiert in Node bereits
 * echt und bleibt unangetastet.
 */
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

/**
 * Lädt ein Modul mit Import als Text, ersetzt Modulnamen der Import-Map durch
 * die vollständige Adresse und liefert es als data:-Modul zurück. Dasselbe
 * Verfahren wie in verify-risk-timing.mjs.
 *
 * @param {URL} url
 * @param {Array<[string, string]>} replacements
 * @returns {Promise<string>}
 */
async function toModule(url, replacements) {
	const source = await readFile(fileURLToPath(url), 'utf8');
	let patched = source;
	for (const [name, target] of replacements) {
		patched = patched.replaceAll(`'${name}'`, JSON.stringify(target));
	}
	return `data:text/javascript;base64,${Buffer.from(patched, 'utf8').toString('base64')}`;
}

/**
 * Ein nachgestelltes document, wortgleiches Verfahren wie
 * verify-account-backend.mjs: querySelector liefert den Zustandsblock (oder
 * null), addEventListener/removeEventListener/dispatchEvent sind ein
 * minimaler, aber echter Ereignisbus.
 *
 * @param {?string} zustandJson
 * @returns {object}
 */
function baueFakeDocument(zustandJson) {
	/** @type {Map<string, Set<function>>} */
	const zuhoerer = new Map();
	return {
		visibilityState: 'visible',
		querySelector(selector) {
			if (selector === 'script[type="application/json"][data-ca-state]' && zustandJson !== null) {
				return { textContent: zustandJson };
			}
			return null;
		},
		addEventListener(type, handler) {
			if (!zuhoerer.has(type)) { zuhoerer.set(type, new Set()); }
			zuhoerer.get(type).add(handler);
		},
		removeEventListener(type, handler) {
			zuhoerer.get(type)?.delete(handler);
		},
		dispatchEvent(event) {
			for (const handler of [...(zuhoerer.get(event.type) ?? [])]) { handler(event); }
			return true;
		},
	};
}

const accountQuelle = await readFile(fileURLToPath(ACCOUNT_URL), 'utf8');
let accountVariantenZaehler = 0;

/**
 * Lädt eine FRISCHE Instanz der ECHTEN account-backend.js im Servermodus
 * (mit nachgestelltem document + Zustandsblock). Jede Instanz bekommt eine
 * eigene, eindeutig gemachte Textvariante, weil dasselbe data:-Modul sonst
 * gecacht und wiederverwendet würde (siehe verify-account-backend.mjs).
 *
 * @param {object} zustand
 * @returns {Promise<{konto: object, url: string}>}
 */
async function ladeServerKonto(zustand) {
	accountVariantenZaehler += 1;
	globalThis.document = baueFakeDocument(JSON.stringify(zustand));
	const variante = `${accountQuelle}\n// verify-risk-money-variante-${accountVariantenZaehler}`;
	const url = `data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`;
	const modul = await import(url);
	return { konto: modul.konto, url };
}

/** Ein Zustandsblock, plausibel, aber die genauen Zahlen sind ohne Belang. */
function basiszustand() {
	return {
		endpunkte: {
			buchung: 'https://konto.invalid/casino-konto/buchung',
			stand: 'https://konto.invalid/casino-konto/stand',
			feld: 'https://konto.invalid/casino-konto/feld',
		},
		kasse: 500,
		geraet: 20,
		gewinn: 0,
		gesamt: 520,
		admin: false,
		max: 999999999,
		speicher: {},
	};
}

/**
 * Eine steuerbare fetch-Warteschlange: jeder Aufruf hängt, bis dieses Skript
 * ihn ausdrücklich beantwortet — genau der Baustein, mit dem sich "zwei
 * Treffer, bevor die erste Buchung zurück ist" nachstellen lässt.
 *
 * @returns {{fn: function, wartend: Array<object>}}
 */
function baueFetchWarteschlange() {
	const wartend = [];
	const fn = (url, optionen) => new Promise((resolve) => {
		wartend.push({ resolve, url, optionen, rumpf: JSON.parse(optionen.body) });
	});
	return { fn, wartend };
}

/**
 * Beantwortet einen wartenden fetch-Aufruf.
 *
 * @param {object} eintrag ein Eintrag aus wartend
 * @param {object} daten
 * @returns {void}
 */
function antworten(eintrag, daten) {
	eintrag.resolve({ ok: true, async json() { return daten; } });
}

/** Lässt alle bereits angestoßenen Promise-Ketten (senden() → json() →
 * uebernehmen() → syncWin().then()) vollständig durchlaufen, bevor das
 * Skript weiterprüft. Ein echter Zeitgeber statt gezählter
 * Promise.resolve()-Aufrufe, weil die Kettentiefe zwischen den Vorgängen
 * unterschiedlich ist und nicht von diesem Skript nachgezählt werden soll.
 * @returns {Promise<void>} */
function flush() {
	return new Promise((resolve) => { setTimeout(resolve, 0); });
}

/* ==========================================================================
   RL-1 — risk-ladder.js (Faktor 2, Vorgang "verdoppeln")
   ========================================================================== */

console.log('RL-1  risk-ladder.js (Faktor 2): Servermodus, zwei Treffer BEVOR die erste Buchung zurück ist');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const { RiskLadder } = await import(ladderModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const painted = [];
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const ladder = new RiskLadder({ draw: () => 0, paint: (view) => painted.push(view), notify: () => {} });

	// account-backend.js schickt JEDE Buchung, auch die erste, über EINEN
	// .then() auf der eigenen Kette (D.7.2, "Reihe") — der tatsächliche
	// fetch()-Aufruf läuft deshalb erst nach einem Bild-Wechsel (Mikrotask),
	// nie im selben synchronen Block wie offer()/guess() selbst. Vor jedem
	// Blick in wartend steht deshalb ein flush().
	ladder.offer(claim);
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'angebot',
		`RL-1  offer() löst genau eine Buchung aus, Vorgang "${wartend[0]?.rumpf.art}" (erwartet "angebot")`);
	antworten(wartend.shift(), { ok: true, kasse: 500, geraet: 20, gewinn: 10, gesamt: 530 });
	await flush();
	// Die eine 'sync'-Ansicht aus der Bestätigung des Angebots selbst ist ab
	// hier erledigt und wird nicht mehr gebraucht — der Rest dieses Blocks
	// zählt ausschließlich die 'sync'-Ansichten der beiden Treffer.
	painted.length = 0;

	ladder.start();
	const vorTreffern = ladder.win;
	// Zwei Treffer OHNE jedes await dazwischen — genau der gemeldete Fall:
	// der zweite Druck kommt, bevor irgendetwas vom ersten beim Server war.
	ladder.guess(ladder.lit);                          // erster Treffer
	const nachErstemTreffer = ladder.win;
	ladder.guess(ladder.lit);                          // zweiter Treffer — BEVOR die erste Buchung zurück ist
	const nachZweitemTreffer = ladder.win;

	check(vorTreffern === 10, `RL-1  Ausgangsgewinn ${vorTreffern} (erwartet 10)`);
	check(nachErstemTreffer === 20,
		`RL-1  nach dem ersten Treffer, VOR jeder Serverantwort: ${nachErstemTreffer} (erwartet 20)`);
	check(nachZweitemTreffer === 40,
		`RL-1  nach dem zweiten, schnellen Treffer, VOR jeder Serverantwort: ${nachZweitemTreffer} `
		+ '(erwartet 40 — NICHT 30, das wäre der behobene Fehler)');

	// account-backend.js lässt NIE zwei Anfragen gleichzeitig unterwegs sein
	// (A-5 in verify-account-backend.mjs) — die Buchung des zweiten Treffers
	// wartet intern auf die des ersten, unabhängig davon, dass BEIDE
	// guess()-Aufrufe oben längst synchron durchgelaufen sind. Genau das
	// beweist die Zeile darüber schon: die Anzeige ist korrekt, bevor
	// überhaupt eine einzige Anfrage das Skript verlassen hat.
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'verdoppeln',
		`RL-1  nach den zwei Treffern ist genau EINE Buchung "verdoppeln" tatsächlich unterwegs (die des ersten `
		+ `Treffers; die des zweiten wartet intern auf sie) — gezählt: ${wartend.length}`);
	antworten(wartend.shift(), { ok: true, kasse: 500, geraet: 20, gewinn: 20, gesamt: 540 });
	await flush();
	let syncViews = painted.filter((view) => view.reason === 'sync');
	check(syncViews.length === 1 && syncViews[0].win === 20,
		`RL-1  nach der ersten Serverantwort: eine 'sync'-Ansicht mit win=${syncViews[0]?.win} (erwartet 20)`);

	// Jetzt erst reicht die interne Kette die Buchung des ZWEITEN Treffers
	// weiter — sie war vorher noch nicht einmal gesendet.
	check(wartend.length === 1 && wartend[0].rumpf.art === 'verdoppeln',
		`RL-1  die Buchung des zweiten Treffers ist jetzt unterwegs (gezählt: ${wartend.length})`);
	antworten(wartend.shift(), { ok: true, kasse: 500, geraet: 20, gewinn: 40, gesamt: 560 });
	await flush();
	syncViews = painted.filter((view) => view.reason === 'sync');
	check(syncViews.length === 2 && syncViews[1].win === 40,
		`RL-1  nach der zweiten Serverantwort: zwei 'sync'-Ansichten, die letzte mit win=${syncViews[1]?.win} `
		+ '(erwartet 40)');
	check(ladder.win === 40, `RL-1  Endstand nach beiden Serverantworten: ${ladder.win} (erwartet 40)`);

	ladder.destroy();
}

/* ==========================================================================
   RL-2 — risk-ladder-multi.js, Faktor 4 und Faktor 8 (Vorgang "angebot")
   ========================================================================== */

console.log('\nRL-2  risk-ladder-multi.js: Servermodus, zwei Treffer BEVOR die erste Buchung zurück ist — Faktor 4 und 8');

for (const { factor, cumulative } of [
	{ factor: 4, cumulative: [10, 40, 160] },
	{ factor: 8, cumulative: [10, 80, 640] },
]) {
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_MULTI_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const { MultiRiskLadder } = await import(ladderModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const painted = [];
	const claim = { amount: cumulative[0], collect: () => {}, discard: () => {} };
	const ladder = new MultiRiskLadder({
		draw: () => 0,
		paint: (view) => painted.push(view),
		notify: () => {},
		sides: 2,
		factor,
	});

	ladder.offer(claim);
	await flush();
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: cumulative[0], gesamt: cumulative[0] });
	await flush();
	painted.length = 0;

	ladder.start();
	// Zwei Treffer OHNE jedes await dazwischen — genau der gemeldete Fall.
	ladder.guess(ladder.lit);                          // erster Treffer
	const nachErstemTreffer = ladder.win;
	ladder.guess(ladder.lit);                          // zweiter Treffer — BEVOR die erste Buchung zurück ist
	const nachZweitemTreffer = ladder.win;

	check(nachErstemTreffer === cumulative[1],
		`RL-2  Faktor ${factor}: nach dem ersten Treffer, VOR jeder Serverantwort: ${nachErstemTreffer} `
		+ `(erwartet ${cumulative[1]})`);
	check(nachZweitemTreffer === cumulative[2],
		`RL-2  Faktor ${factor}: nach dem zweiten, schnellen Treffer, VOR jeder Serverantwort: `
		+ `${nachZweitemTreffer} (erwartet ${cumulative[2]} — der behobene Fehler hätte hier zu wenig gebucht)`);

	// account-backend.js lässt nie zwei Anfragen gleichzeitig unterwegs sein
	// (A-5 in verify-account-backend.mjs) — die Buchung des zweiten Treffers
	// wartet intern auf die des ersten. Die Anzeige oben war trotzdem schon
	// korrekt, bevor überhaupt eine einzige Anfrage das Skript verlassen hat.
	await flush();
	const erwarteterErsterDelta = cumulative[0] * (factor - 1);
	check(wartend.length === 1 && wartend[0].rumpf.art === 'angebot' && wartend[0].rumpf.betrag === erwarteterErsterDelta,
		`RL-2  Faktor ${factor}: genau EINE Buchung "angebot" tatsächlich unterwegs, Betrag ${wartend[0]?.rumpf.betrag} `
		+ `(erwartet ${erwarteterErsterDelta} — die Differenz des ERSTEN Treffers)`);
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: cumulative[1], gesamt: cumulative[1] });
	await flush();
	let syncViews = painted.filter((view) => view.reason === 'sync');
	check(syncViews.length === 1 && syncViews[0].win === cumulative[1],
		`RL-2  Faktor ${factor}: nach der ersten Serverantwort eine 'sync'-Ansicht mit win=${syncViews[0]?.win} `
		+ `(erwartet ${cumulative[1]})`);

	// Jetzt erst reicht die interne Kette die Buchung des zweiten Treffers
	// weiter, mit dem Betrag, der auf Basis des SCHON erhöhten current
	// berechnet wurde — nicht auf Basis des veralteten.
	const erwarteterZweiterDelta = cumulative[1] * (factor - 1);
	check(wartend.length === 1 && wartend[0].rumpf.betrag === erwarteterZweiterDelta,
		`RL-2  Faktor ${factor}: die Buchung des zweiten Treffers ist jetzt unterwegs, Betrag `
		+ `${wartend[0]?.rumpf.betrag} (erwartet ${erwarteterZweiterDelta})`);
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: cumulative[2], gesamt: cumulative[2] });
	await flush();
	syncViews = painted.filter((view) => view.reason === 'sync');
	check(syncViews.length === 2 && syncViews[1].win === cumulative[2],
		`RL-2  Faktor ${factor}: zwei 'sync'-Ansichten, die letzte mit win=${syncViews[1]?.win} `
		+ `(erwartet ${cumulative[2]})`);
	check(ladder.win === cumulative[2],
		`RL-2  Faktor ${factor}: Endstand nach beiden Serverantworten: ${ladder.win} (erwartet ${cumulative[2]})`);

	ladder.destroy();
}

/* ==========================================================================
   RL-3 — collect() liest sofort den optimistischen Betrag
   ========================================================================== */

console.log('\nRL-3  collect() liest SOFORT den optimistischen Betrag, nicht den noch nicht bestätigten alten Stand');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const { RiskLadder } = await import(ladderModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	let collected = null;
	const claim = { amount: 10, collect: () => { collected = 'aufgerufen'; }, discard: () => {} };
	const ladder = new RiskLadder({ draw: () => 0, paint: () => {}, notify: () => {} });

	ladder.offer(claim);
	await flush();
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 10, gesamt: 10 });
	await flush();

	ladder.start();
	ladder.guess(ladder.lit);                          // Treffer, Buchung bleibt bewusst unbeantwortet
	await flush();
	check(wartend.length === 1, 'RL-3  die Buchung des Treffers ist absichtlich noch unbeantwortet');

	const amount = ladder.collect();                   // sofort danach aussteigen
	check(amount === 20, `RL-3  collect() liefert sofort ${amount} (erwartet 20, NICHT der alte Stand 10)`);
	check(collected === 'aufgerufen', 'RL-3  der Anspruch wurde eingelöst (claim.collect() gerufen)');
}

/* ==========================================================================
   RL-4 — lokaler Modus: unverändert synchron, ohne jede Netzanfrage
   ========================================================================== */

console.log('\nRL-4  lokaler Modus (konto.istServer === false): unverändert synchron, keine Netzanfrage');

{
	delete globalThis.document;
	let fetchAufrufe = 0;
	globalThis.fetch = async () => { fetchAufrufe += 1; throw new Error('im lokalen Modus darf fetch nie laufen'); };

	const lokalesKontoModul = await import(
		`data:text/javascript;base64,${Buffer.from(`${accountQuelle}\n// verify-risk-money-lokal`, 'utf8').toString('base64')}`
	);
	check(lokalesKontoModul.konto.istServer === false, 'RL-4  ohne Zustandsblock ist konto.istServer false');

	const ladderModuleUrl = await toModule(RISK_LADDER_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', ACCOUNT_URL.href],
	]);
	const { RiskLadder } = await import(ladderModuleUrl);
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const ladder = new RiskLadder({ draw: () => 0, paint: () => {}, notify: () => {} });
	ladder.offer(claim);
	ladder.start();
	ladder.guess(ladder.lit);
	ladder.guess(ladder.lit);
	check(ladder.win === 40, `RL-4  risk-ladder.js lokal, zwei Treffer: ${ladder.win} (erwartet 40)`);
	ladder.destroy();

	const multiModuleUrl = await toModule(RISK_LADDER_MULTI_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', ACCOUNT_URL.href],
	]);
	const { MultiRiskLadder } = await import(multiModuleUrl);
	const claimMulti = { amount: 10, collect: () => {}, discard: () => {} };
	const multi = new MultiRiskLadder({ draw: () => 0, paint: () => {}, notify: () => {}, sides: 2, factor: 4 });
	multi.offer(claimMulti);
	multi.start();
	multi.guess(multi.lit);
	multi.guess(multi.lit);
	check(multi.win === 160, `RL-4  risk-ladder-multi.js lokal, Faktor 4, zwei Treffer: ${multi.win} (erwartet 160)`);
	multi.destroy();

	check(fetchAufrufe === 0, `RL-4  über die ganze Spielfolge wurde fetch NIE gerufen (gezählt: ${fetchAufrufe})`);
}

/* ==========================================================================
   Ergebnis
   ========================================================================== */

console.log(failed
	? '\nERGEBNIS: der Geldfehler im Risikospiel ist NICHT vollständig behoben.'
	: '\nERGEBNIS: im Servermodus steht der erhöhte Betrag SOFORT — auch wenn ein zweiter, schneller Treffer '
	+ 'eintrifft, bevor die erste Buchung zurück ist (10 → 20 → 40, nicht 10 → 20 → 30). Die gesendeten '
	+ 'Buchungsbeträge stimmen, render(\'sync\') trägt am Ende den bestätigten Betrag, collect() liest immer den '
	+ 'aktuellen Stand, und der lokale Modus rechnet unverändert ohne jede Netzanfrage.');

process.exit(failed ? 1 : 0);
