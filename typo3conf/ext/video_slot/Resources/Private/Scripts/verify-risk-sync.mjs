/**
 * Video Slot – Nachweis: render('sync') erreicht tatsächlich das Gerät
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-risk-sync.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Behebungslauf 2026-09-11)
 * ---------------------------------------------------
 * Vor diesem Lauf kannte render() in risk.js keinen Zweig 'sync' — eine
 * spät eintreffende Serverbestätigung fiel auf den default-Zweig und damit
 * auf paintOff(), mitten in einer laufenden Leiter: RISK-Blinken aus,
 * Risiko-Tasten dunkel, STUFE auf 0 — obwohl die Leiter weiterlief.
 *
 *   VS-1  render('sync') WÄHREND DIE LEITER LÄUFT zieht NUR den
 *         Gewinnbetrag nach (Röhrengruppe UND Messpunkt data-vs-risk-win) —
 *         und lässt STUFE/Tastenzustand unangetastet (kein Rückfall auf
 *         paintOff()).
 *   VS-2  render('sync') WÄHREND NOCH KEINE LEITER LÄUFT (die Buchung aus
 *         offer()) zieht NUR den Messpunkt nach, fasst die (noch
 *         machine.js gehörende) Röhrengruppe NICHT an.
 *
 * Gerechnet wird mit den ECHTEN Dateien dieses Geräts (risk.js, rng.js,
 * nixie.js, press.js) UND den echten geteilten Dateien
 * (risk-ladder.js, risk-timing.js, account-backend.js) — als Text gelesen
 * und über data:-Adressen geladen, wie in den übrigen Prüfskripten des
 * Hauses. Nachgestellt wird nur der wahre äußere Rand: ein Gehäuse ohne
 * echtes Markup (RiskPanel braucht davon nur .vs-cabinet, alles andere ist
 * über "?." abgesichert) und globalThis.fetch als steuerbare Warteschlange.
 * Die beiden Röhrengruppen (findNixieGroup liefert an einem Gehäuse ohne
 * Markup ohnehin null) werden NACH dem Bau durch aufzeichnende Attrappen
 * ersetzt — dieselben Eigenschaften, die render() auch anfasst, nur mit
 * einem Mitschnitt statt echter Röhren.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OWN_JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const RISK_URL = new URL('risk.js', OWN_JS_DIR);
const RNG_URL = new URL('rng.js', OWN_JS_DIR);
const NIXIE_URL = new URL('nixie.js', OWN_JS_DIR);
const PRESS_URL = new URL('press.js', OWN_JS_DIR);

const SHARED_JS_DIR = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const RISK_LADDER_URL = new URL('risk-ladder.js', SHARED_JS_DIR);
const TIMING_FILE_URL = new URL('risk-timing.js', SHARED_JS_DIR).href;
const ACCOUNT_URL = new URL('account-backend.js', SHARED_JS_DIR);

let failed = false;

/** @param {boolean} condition @param {string} message @returns {void} */
function check(condition, message) {
	if (condition) { console.log(`  OK      ${message}`); return; }
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

/**
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

/** @param {?string} zustandJson @returns {object} */
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
		removeEventListener(type, handler) { zuhoerer.get(type)?.delete(handler); },
		dispatchEvent(event) {
			for (const handler of [...(zuhoerer.get(event.type) ?? [])]) { handler(event); }
			return true;
		},
	};
}

const accountQuelle = await readFile(fileURLToPath(ACCOUNT_URL), 'utf8');
let variantenZaehler = 0;

/**
 * Lädt eine frische Instanz der echten account-backend.js im Servermodus.
 *
 * @param {object} zustand
 * @returns {Promise<{url: string}>}
 */
async function ladeServerKonto(zustand) {
	variantenZaehler += 1;
	globalThis.document = baueFakeDocument(JSON.stringify(zustand));
	const variante = `${accountQuelle}\n// verify-risk-sync-variante-${variantenZaehler}`;
	const url = `data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`;
	await import(url);
	return { url };
}

function basiszustand() {
	return {
		endpunkte: {
			buchung: 'https://konto.invalid/casino-konto/buchung',
			stand: 'https://konto.invalid/casino-konto/stand',
			feld: 'https://konto.invalid/casino-konto/feld',
		},
		kasse: 0, geraet: 0, gewinn: 0, gesamt: 0, admin: false, max: 999999999, speicher: {},
	};
}

/** @returns {{fn: function, wartend: Array<object>}} */
function baueFetchWarteschlange() {
	const wartend = [];
	const fn = (url, optionen) => new Promise((resolve) => {
		wartend.push({ resolve, url, optionen, rumpf: JSON.parse(optionen.body) });
	});
	return { fn, wartend };
}

/** @param {object} eintrag @param {object} daten @returns {void} */
function antworten(eintrag, daten) {
	eintrag.resolve({ ok: true, async json() { return daten; } });
}

/** @returns {Promise<void>} */
function flush() {
	return new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * Eine aufzeichnende Attrappe einer Nixie-Röhrengruppe: dieselben
 * Eigenschaften, die risk.js anfasst (show/clear/announce/element/destroy),
 * nur mit einem Mitschnitt statt echter Röhren.
 *
 * @returns {{group: object, calls: Array<object>}}
 */
function baueAufzeichnendeGruppe() {
	const calls = [];
	const group = {
		length: 3,
		show(amount) { calls.push({ method: 'show', amount }); },
		clear() { calls.push({ method: 'clear' }); },
		announce(text) { calls.push({ method: 'announce', text }); },
		element: { classList: { toggle() {}, add() {}, remove() {} } },
		destroy() { calls.push({ method: 'destroy' }); },
	};
	return { group, calls };
}

/**
 * Baut ein minimales, aber ECHTES EventTarget-Gehäuse mit genau einem
 * .vs-cabinet-Kind, das selbst nichts findet (alle Tasten/Lampen/Röhren
 * bleiben null — überall in risk.js über "?." abgesichert). Das genügt, weil
 * dieser Nachweis panel.ladder DIREKT bedient statt über echte Tastendrücke.
 *
 * @returns {{root: EventTarget, cabinet: object}}
 */
function baueGehaeuse() {
	const cabinet = { querySelector: () => null };
	const root = new EventTarget();
	root.dataset = {};
	root.ownerDocument = { addEventListener() {}, removeEventListener() {} };
	root.querySelector = (selector) => (selector === '.vs-cabinet' ? cabinet : null);
	return { root, cabinet };
}

/* ==========================================================================
   VS-1 — render('sync') WÄHREND DIE LEITER LÄUFT
   ========================================================================== */

console.log('VS-1  render(\'sync\') während die Leiter läuft: nur der Gewinnbetrag, STUFE/Tastenzustand unangetastet');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const riskModuleUrl = await toModule(RISK_URL, [
		['@phomo17/video-slot/rng.js', RNG_URL.href],
		['@phomo17/video-slot/nixie.js', NIXIE_URL.href],
		['@phomo17/video-slot/press.js', PRESS_URL.href],
		['@phomo17/casino-startpage/risk-ladder.js', ladderModuleUrl],
	]);
	const { RiskPanel } = await import(riskModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const { root } = baueGehaeuse();
	const panel = new RiskPanel(root);

	// Die beiden Röhrengruppen sind nach dem Bau null (kein Markup gefunden)
	// — jetzt durch Attrappen ersetzt, die genau das aufzeichnen, was
	// render() an sie schreibt.
	const win = baueAufzeichnendeGruppe();
	const step = baueAufzeichnendeGruppe();
	panel.winGroup = win.group;
	panel.stepGroup = step.group;
	panel.winCeiling = 10 ** win.group.length - 1;
	panel.stepCeiling = 10 ** step.group.length - 1;

	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	panel.ladder.offer(claim);
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'angebot', 'VS-1  offer() löst die Buchung "angebot" aus');
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 10, gesamt: 10 });
	await flush();

	panel.ladder.start();
	panel.ladder.guess(panel.ladder.lit);              // Treffer: optimistisch auf 20, Buchung noch offen
	check(win.calls.some((c) => c.method === 'show' && c.amount === 20),
		'VS-1  die Röhrengruppe zeigt den optimistischen Betrag 20 schon vor jeder Serverantwort (reason \'level\')');

	const anzahlVorSync = win.calls.length;
	const stufeAnzahlVorSync = step.calls.length;
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'verdoppeln', 'VS-1  die Buchung des Treffers ist unterwegs');
	// Der (nachgestellte) Server bestätigt einen ANDEREN Betrag als den
	// optimistischen (15 statt 20) — nur so lässt sich unterscheiden, ob
	// wirklich render('sync') die Röhrengruppe erreicht, statt zufällig
	// derselbe Wert wie beim 'level'-Aufruf davor stehen zu bleiben.
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 15, gesamt: 15 });
	await flush();

	check(win.calls.length > anzahlVorSync && win.calls.at(-1).method === 'show' && win.calls.at(-1).amount === 15,
		`VS-1  render('sync') zieht die Röhrengruppe auf den bestätigten Betrag 15 nach (letzter Aufruf: `
		+ `${JSON.stringify(win.calls.at(-1))})`);
	check(root.dataset.vsRiskWin === '15',
		`VS-1  der Messpunkt data-vs-risk-win steht auf "15" (gefunden: "${root.dataset.vsRiskWin}")`);
	check(step.calls.length === stufeAnzahlVorSync,
		`VS-1  die STUFE-Röhrengruppe wurde von render('sync') NICHT angefasst (${step.calls.length} `
		+ `Aufrufe vor und nach dem Sync unverändert) — kein Rückfall auf paintOff()`);
	check(panel.ladder.phase === 'ladder',
		`VS-1  die Leiter läuft nach dem sync unverändert weiter (phase: "${panel.ladder.phase}")`);

	panel.destroy();
}

/* ==========================================================================
   VS-2 — render('sync') WÄHREND NOCH KEINE LEITER LÄUFT (offer())
   ========================================================================== */

console.log('\nVS-2  render(\'sync\') aus offer(), bevor RISK gedrückt wurde: nur der Messpunkt, die Röhrengruppe bleibt unangetastet');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const riskModuleUrl = await toModule(RISK_URL, [
		['@phomo17/video-slot/rng.js', RNG_URL.href],
		['@phomo17/video-slot/nixie.js', NIXIE_URL.href],
		['@phomo17/video-slot/press.js', PRESS_URL.href],
		['@phomo17/casino-startpage/risk-ladder.js', ladderModuleUrl],
	]);
	const { RiskPanel } = await import(riskModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const { root } = baueGehaeuse();
	const panel = new RiskPanel(root);
	const win = baueAufzeichnendeGruppe();
	panel.winGroup = win.group;
	panel.winCeiling = 10 ** win.group.length - 1;

	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	panel.ladder.offer(claim);                          // RISK blinkt jetzt — die Leiter läuft NICHT
	await flush();
	check(panel.ladder.phase === 'offer', `VS-2  die Leiter steht im Angebot, noch keine Leiter (phase: "${panel.ladder.phase}")`);
	check(wartend.length === 1, 'VS-2  offer() hat die Buchung ausgelöst');

	const anzahlVorSync = win.calls.length;
	// Der Server korrigiert bereits das Angebot selbst (z. B. eine
	// Admin-Deckelung) — 7 statt 10.
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 7, gesamt: 7 });
	await flush();

	check(win.calls.length === anzahlVorSync,
		`VS-2  die Röhrengruppe wurde NICHT angefasst (${win.calls.length} Aufrufe vor und nach dem Sync `
		+ 'unverändert) — im Angebot gehört sie noch machine.js');
	check(root.dataset.vsRiskWin === '7',
		`VS-2  der Messpunkt data-vs-risk-win wurde trotzdem auf "7" nachgezogen (gefunden: "${root.dataset.vsRiskWin}")`);

	panel.destroy();
}

console.log(failed
	? '\nERGEBNIS: render(\'sync\') erreicht das Gerät NICHT wie zugesagt.'
	: '\nERGEBNIS: eine Serverbestätigung zieht während einer laufenden Leiter genau die Röhrengruppe und den '
	+ 'Messpunkt nach, ohne STUFE oder Tastenzustand anzufassen; vor dem Start der Leiter zieht sie nur den '
	+ 'Messpunkt nach und lässt die (noch machine.js gehörende) Röhrengruppe unberührt.');

process.exit(failed ? 1 : 0);
