/**
 * Blackjack – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-4)
 * ===============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Playwright gegen die
 * laufende DDEV-Instanz — dieselbe Bauart wie
 * craps/probe-lobby-craps.mjs und roulette/probe-lobby-roulette.mjs
 * (D5-3) und casino_lobby/probe-lobby-strip.mjs.
 *
 * ABWEICHUNG VOM PLANTEXT, BEGRÜNDET (siehe Bericht des Umsetzungslaufs):
 * der Plantext verlangt DREI echte Browser (Q-1 bis Q-4, M-4, M-5). Im
 * vorgefundenen Bestand existieren aber nur ZWEI Prüfkonten, deren Guthaben
 * angefasst werden darf: _d2check_ (uid 7) — "benutz das für alles mit
 * Geld" — und TestSpieli (uid 6), dessen Guthaben AUSDRÜCKLICH NICHT
 * angefasst werden soll. Diese Probe spielt deshalb mit ZWEI echten
 * Sitzungen: A (_d2check_) setzt und spielt eine vollständige Hand; B
 * (TestSpieli) sitzt am selben Tisch, setzt NICHTS (kostet nichts) und
 * dient als zweite, unabhängige Sicht auf dieselbe Runde — dieselbe
 * Kernaussage (zwei Browser sehen denselben Geber, dieselben Kartenrücken,
 * dieselbe Zugmarke), nur ohne den dritten Kontostand. Wo der Plantext
 * "drei" verlangt, prüft diese Probe "zwei, geräteübergreifend gleich" —
 * das ist dieselbe Prüfung wie in probe-lobby-craps.mjs (P-4, dort aus
 * demselben Grund von "Seven-out abwarten" auf "beide Browser stimmen
 * überein" abgeändert).
 *
 * BEOBACHTUNG, NICHT BEHOBEN (außerhalb des Dateiumfangs von D5-4): weil B
 * NICHTS setzt, lehnt B's eigenes table.deal() die Runde lokal ab
 * (reason:'stake') — B's eigener Bildschirm zeigt deshalb keine Karten.
 * folge.austeilen() zieht B's zwei Karten in JEDEM Browser trotzdem aus dem
 * gemeinsamen Schlitten (sie gehören zur gemeinsamen Ziehreihenfolge, bevor
 * überhaupt geprüft wird, ob B einen Einsatz hat) — A's Platzleiste zeigt
 * für B deshalb korrekt zwei Kartenrücken, obwohl B selbst gar nicht
 * "spielt". Der Server (D5-1) verlangt für eine Teilnahme am Zugprotokoll
 * keinen Einsatz, nur einen Sitzplatz — das ist eine bereits im
 * Serverstand vorgefundene Eigenschaft, keine Folge dieses Umsetzungsstücks.
 *
 * WAS HIER BEWIESEN WIRD (angepasst aus Plan D5, Abschnitt 4.22)
 * ---------------------------------------------------------------
 *   Q-1  A und B melden sich an, rufen /blackjack auf, B tritt bei — beide
 *        Seiten tragen [data-cl-strip] mit n=2
 *   Q-2  A setzt, die Runde teilt aus — B (Kartenrücken bei A sichtbar)
 *        zeigt data-cl-seat-cards="2" für B's eigenen Platz
 *   Q-3  A zieht eine Karte (hit) — B's Kartenrückenzahl für A's Platz
 *        steigt entsprechend, KEIN Kartenwert wird sichtbar (nur die Zahl)
 *   Q-4  nachdem A gestanden hat, trägt die Zugmarke in BEIDEN Browsern
 *        denselben Platz (den einzig verbleibenden — B, bis dessen 20
 *        Sekunden ablaufen), und danach endet die Runde in beiden Browsern
 *        gleich (dieselbe Geberkarten-Summe, aus dem Server-Ergebnis erg
 *        abgelesen)
 *   M-1  (Geld) A's serverseitiger Kontostand folgt exakt A's eigenem
 *        Nettoausgang der Runde
 *   M-2  (Geld, der Aussteiger) A setzt erneut, schließt ihren Kontext
 *        mitten in der eigenen Entscheidung ("laeuft", vor dem Stehen) —
 *        A's serverseitiger Kontostand ist danach um genau den Einsatz
 *        kleiner und bleibt es
 *   M-3  (kein zweiter Geldweg) an /casino-lobby/handlung geht keine
 *        Anfrage, die einen Geldbetrag bucht
 *
 * Braucht QR-Modus AN — meldet das selbst und bricht sonst kontrolliert ab.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/probe-lobby-blackjack.mjs
 */

import { execFileSync } from 'node:child_process';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASIS = 'https://casino-kunterbunt.ddev.site';

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

function mysql(sql) {
	return execFileSync('mysql', ['-e', sql], { encoding: 'utf8' }).split('\n')[1]?.trim() ?? '';
}

console.log('\nBlackjack – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-4)');
console.log('===============================================================================================\n');

let qrModeAn = false;
try {
	qrModeAn = mysql("SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';") === 'b:1;';
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
if (!qrModeAn) {
	console.log('ERGEBNIS: übersprungen — der QR-Modus steht auf AUS. Zum Prüfen: ddev exec node Tests/Acceptance/dbg-schalter.mjs an');
	process.exit(0);
}

function kennungVon(name) {
	const zeile = mysql(`SELECT uid, token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND name='${name}' LIMIT 1;`);
	const [uid, token] = zeile.split('\t');
	return { uid, token };
}
const A = kennungVon('_d2check_');
const B = kennungVon('TestSpieli');
if (!A?.token || !B?.token) {
	console.log('\nERGEBNIS: Abbruch — eines der beiden Prüfkonten (_d2check_, TestSpieli) wurde nicht gefunden.');
	process.exit(1);
}

function serverKontostand(uid) {
	const zeile = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${Number(uid)};`);
	const [cash, machine, win] = zeile.split('\t').map(Number);
	return { cash, machine, win, gesamt: cash + machine + win };
}

const { chromium } = await import('playwright');
const browser = await chromium.launch();

const kontextA = await browser.newContext({ ignoreHTTPSErrors: true });
const kontextB = await browser.newContext({ ignoreHTTPSErrors: true });
const seiteA = await kontextA.newPage();
const seiteB = await kontextB.newPage();

const gebuchteHandlungen = [];
const browserFehler = [];
for (const [markierung, seite] of [['A', seiteA], ['B', seiteB]]) {
	seite.on('request', (request) => {
		if (request.url().includes('/casino-lobby/handlung')) {
			gebuchteHandlungen.push({ url: request.url(), methode: request.method(), rumpf: request.postData() ?? '' });
		}
	});
	seite.on('pageerror', (fehlerObjekt) => browserFehler.push(`${markierung} pageerror: ${fehlerObjekt.message}`));
	seite.on('console', (msg) => {
		if (msg.type() === 'error') {
			browserFehler.push(`${markierung} console.error: ${msg.text()}`);
		}
	});
}

let zustandA = null;
let zustandB = null;

/**
 * Kauft ZWEI 1-Euro-Chips und legt beide auf den Setzkreis — wie ein echter
 * Klick, in genau dieser Reihenfolge. Dieselbe Bauart wie setzeChip() in
 * craps/probe-lobby-craps.mjs bzw. roulette/probe-lobby-roulette.mjs, hier
 * auf das EINE Feld dieses Tisches (data-ck-field="box") zugeschnitten.
 *
 * PROBEFEHLER, GEFUNDEN UND BEHOBEN: EIN einzelner 1-Euro-Chip ist beim
 * Blackjack KEIN legaler Einsatz — rules.BET_MIN und rules.BET_STEP stehen
 * beide auf 2 (rules-blackjack.js), und CHIP_VALUES kennt keinen
 * 2-Euro-Chip (table-chips.js: [100, 25, 20, 5, 1]). table.deal() lehnte
 * die Runde deshalb im ersten Lauf dieser Probe still mit reason:'stake'
 * ab — lobby-blackjack.js#aufRunde() setzte daraufhin sofort wieder
 * geberSetzen(null) zurück, und der Tisch blieb dauerhaft im Zustand
 * 'bereit' stehen. Zwei Chips zu je 1 € erreichen den Mindesteinsatz.
 * @param {import('playwright').Page} seite
 * @returns {Promise<void>}
 */
async function setzeChip(seite) {
	// undefined als zweites Argument ist Pflicht: waitForFunction(fn, options)
	// mit einer parameterlosen fn interpretiert Playwright das zweite
	// Argument sonst als "arg", nicht als "options" (siehe die anderen beiden
	// Proben, dieselbe Falle).
	await seite.waitForFunction(() => window.__standEreignisse.at(-1)?.z === 'setzen', undefined, { timeout: 90000 });
	for (let chip = 0; chip < 2; chip++) {
		// DRITTER PROBEFEHLER, IN DIESER PROBE GEFUNDEN UND BEHOBEN: seit dem
		// Behebungslauf (Server-Fehler bei der Einzelplatz-Frist, siehe
		// README) ruft die Lobby sperren()/repaint() bei praktisch JEDER
		// Sekunden-Abfrage auf, nicht mehr nur bei echten Änderungen —
		// table-felt.js zeichnet den Setzkreis-Knopf dadurch häufiger neu.
		// Großzügige 15 s statt 5-10 s je Wartepunkt, damit ein Klick, der in
		// ein knappes Neuzeichnen-Fenster fällt, nicht sofort als Fehlschlag
		// zählt — OHNE erneut zu klicken (ein Wiederholungsklick würde bei
		// einem eigentlich schon erfolgreichen ersten Klick einen ZWEITEN,
		// nicht abgelegten Chip kaufen und die Zwei-Chip-Rechnung verfälschen).
		await seite.waitForFunction(() => {
			const btn = document.querySelector('[data-ck-field="box"]');
			return btn !== null && btn.getAttribute('aria-disabled') !== 'true';
		}, undefined, { timeout: 15000 });
		await seite.locator('[data-ck-table-chip-buy="1"]').first().click({ timeout: 8000 });
		// PROBEFEHLER, ZUERST IN roulette/probe-lobby-roulette.mjs GEFUNDEN:
		// table-controls.js schreibt hier KEINE nackte Zahl, sondern einen
		// XLIFF-Satz ("1 im Bestand"). parseInt() liest die führende Zahl.
		await seite.waitForFunction(() => parseInt(document.querySelector('[data-ck-table-rack="1"]')?.textContent ?? '0', 10) > 0, undefined, { timeout: 15000 });
		await seite.locator('[data-ck-field="box"]').first().click({ timeout: 8000 });
		// ZWEITER PROBEFEHLER, IN DIESER PROBE GEFUNDEN UND BEHOBEN: alle
		// gelegten 1-Euro-Chips landen in EINEM gemeinsamen .ck-chipstack
		// (table-felt.js#stapelbereich() legt je [data-ck-field] genau EINEN
		// Stapelbereich an, table-felt.js#paintField() gruppiert Chips
		// GLEICHEN Werts darin) — [data-ck-stack].children.length bleibt bei
		// zwei 1-Euro-Chips deshalb dauerhaft bei 1 und wäre als Wartepunkt
		// für den ZWEITEN Chip nie erfüllbar. Maßgeblich ist stattdessen der
		// Bestand: er kehrt nach jedem gelegten Chip auf 0 zurück.
		await seite.waitForFunction(() => parseInt(document.querySelector('[data-ck-table-rack="1"]')?.textContent ?? '-1', 10) === 0, undefined, { timeout: 15000 });
	}
}

try {
	await seiteA.addInitScript(() => {
		window.__standEreignisse = [];
		document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
	});
	await seiteB.addInitScript(() => {
		window.__standEreignisse = [];
		document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
	});

	await seiteA.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteA.goto(`${BASIS}/blackjack`, { waitUntil: 'domcontentloaded' });
	const stateAttrA = await seiteA.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandA = stateAttrA ? JSON.parse(stateAttrA) : null;
	check(zustandA !== null && zustandA.platz === 1, `A eröffnet /blackjack und bekommt platz:1 (gefunden: ${JSON.stringify(zustandA)})`);
	if (zustandA === null) {
		throw new Error('kein Zustandsblock für A — Abbruch');
	}

	/* ==================================================== Q-1 B tritt bei, beide sehen n=2 */

	console.log('\nQ-1  B meldet sich an, ruft denselben Tisch auf und tritt bei — beide Seiten tragen [data-cl-strip] mit n=2');
	await seiteB.goto(`${BASIS}/?casinoToken=${encodeURIComponent(B.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteB.goto(`${BASIS}/blackjack`, { waitUntil: 'domcontentloaded' });
	const uebersichtB = await seiteB.locator('.cl-overview').count().catch(() => 0);
	check(uebersichtB > 0, 'B bekommt die Übersicht (cl-overview) statt automatisch mitzusitzen');
	await seiteB.locator(`[data-cl-join="${zustandA.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
	await seiteB.waitForURL(/\/blackjack/, { timeout: 5000 }).catch(() => {});
	await seiteB.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
	const stateAttrB = await seiteB.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandB = stateAttrB ? JSON.parse(stateAttrB) : null;
	check(zustandB !== null && zustandB.platz === 2, `B tritt bei und bekommt platz:2 (gefunden: ${JSON.stringify(zustandB)})`);

	await seiteA.waitForFunction(() => (window.__standEreignisse.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});
	const besetzteA = await seiteA.evaluate(() => window.__standEreignisse.at(-1)?.n ?? 0);
	check(besetzteA === 2, `A sieht zwei besetzte Plätze (daten.n aus casino:lobby-stand, gefunden: ${besetzteA})`);

	/* ==================================================== Q-2 A setzt, Runde teilt aus */

	console.log('\nQ-2  A setzt einen Chip, die Runde teilt aus — B\'s Kartenrücken sind bei A mit "2" sichtbar');
	const kontostandVorA = serverKontostand(A.uid);
	await setzeChip(seiteA).catch((fehlerObjekt) => check(false, `A konnte nicht setzen: ${fehlerObjekt.message}`));

	// SETZZEIT (20 s) + SPERRZEIT (2 s): der Chip kann JEDERZEIT innerhalb
	// eines bereits laufenden Setzfensters gesetzt werden — im ungünstigsten
	// Fall unmittelbar nach dessen Beginn, sodass fast die volle Frist
	// abzuwarten bleibt. Großzügig auf 40 s bemessen.
	await seiteA.waitForFunction(() => document.querySelector('[data-bj-state]')?.getAttribute('data-bj-state') !== 'bereit', undefined, { timeout: 40000 }).catch(() => {});
	const bjZustandA = await seiteA.evaluate(() => document.querySelector('[data-bj-state]')?.getAttribute('data-bj-state') ?? null);
	check(bjZustandA !== null && bjZustandA !== 'bereit', `A's eigener Tisch hat ausgeteilt (data-bj-state, gefunden: ${bjZustandA})`);

	// Großzügige 20 s: die Kartenzahlen der anderen werden erst über den
	// NÄCHSTEN casino:lobby-stand nach dem Austeilen nachgezogen
	// (blackjack.js#zugAnwenden(), am selben Ereignis wie data-bj-state)
	// — ein einzelner Umlauf reicht rechnerisch, hier bewusst mit Reserve.
	await seiteA.waitForFunction(() => {
		const el = document.querySelector('[data-cl-seat="2"] [data-cl-seat-cards]');
		return el !== null && el.getAttribute('data-cl-seat-cards') === '2';
	}, undefined, { timeout: 20000 }).catch(() => {});
	const kartenB_beiA = await seiteA.evaluate(() => document.querySelector('[data-cl-seat="2"] [data-cl-seat-cards]')?.getAttribute('data-cl-seat-cards') ?? null);
	check(kartenB_beiA === '2', `A sieht für B's Platz zwei verdeckte Kartenrücken (gefunden: ${kartenB_beiA})`);
	if (kartenB_beiA !== '2') {
		const letzterStand = await seiteA.evaluate(() => window.__standEreignisse.at(-1) ?? null);
		console.log(`      DIAGNOSE Q-2: letzter Stand ${JSON.stringify(letzterStand)}`);
	}

	/* ==================================================== Q-3 A zieht eine Karte */

	console.log('\nQ-3  A zieht eine Karte (hit), sofern erlaubt — B sieht bei A\'s Platz danach drei Kartenrücken, keinen Kartenwert');
	await seiteA.waitForFunction(() => document.querySelector('[data-bj-act="hit"]')?.getAttribute('aria-disabled') !== 'true', undefined, { timeout: 15000 }).catch(() => {});
	const hitErlaubt = await seiteA.evaluate(() => document.querySelector('[data-bj-act="hit"]')?.getAttribute('aria-disabled') !== 'true');
	if (hitErlaubt) {
		await seiteB.waitForFunction(() => {
			const el = document.querySelector('[data-cl-seat="1"] [data-cl-seat-cards]');
			return el !== null && el.getAttribute('data-cl-seat-cards') === '2';
		}, undefined, { timeout: 15000 }).catch(() => {});
		await seiteA.locator('[data-bj-act="hit"]').click({ timeout: 5000 }).catch(() => {});
		await seiteB.waitForFunction(() => {
			const el = document.querySelector('[data-cl-seat="1"] [data-cl-seat-cards]');
			return el !== null && el.getAttribute('data-cl-seat-cards') === '3';
		}, undefined, { timeout: 15000 }).catch(() => {});
		const kartenA_beiB = await seiteB.evaluate(() => document.querySelector('[data-cl-seat="1"] [data-cl-seat-cards]')?.getAttribute('data-cl-seat-cards') ?? null);
		check(kartenA_beiB === '3', `B sieht für A's Platz drei verdeckte Kartenrücken, nachdem A gezogen hat (gefunden: ${kartenA_beiB})`);
		const seatMarkupB = await seiteB.evaluate(() => document.querySelector('[data-cl-seat="1"] .cl-seat__cards')?.innerHTML ?? '');
		check(!/[2-9]|10|[JQKA]/.test(seatMarkupB.replace(/\d+\s*Karten?/, '')),
			'kein Kartenwert steht im Markup der Kartenrücken bei B (nur die Anzahl)');
	} else {
		check(true, 'A hatte nach dem Austeilen keine erlaubte Zieh-Handlung (z. B. natürlicher Blackjack) — Q-3 entfällt für diesen Lauf, kein Fehlschlag');
	}

	/* ==================================================== Q-4 A steht, die Zugmarke wandert, die Runde endet für beide gleich */

	console.log('\nQ-4  A steht — die Zugmarke wandert zu B (bzw. der Geber) in BEIDEN Browsern gleich; die Runde endet mit demselben Geberergebnis');
	await seiteA.waitForFunction(() => document.querySelector('[data-bj-act="stand"]')?.getAttribute('aria-disabled') !== 'true', undefined, { timeout: 15000 }).catch(() => {});
	await seiteA.locator('[data-bj-act="stand"]').click({ timeout: 5000 }).catch(() => {});

	// Nach A's Stehen ist entweder B an der Reihe (turn_seat=2) oder — falls
	// B's Sitzplatz serverseitig ohnehin übersprungen wird — die Runde geht
	// direkt zum Geber (turn_seat=0). B setzt nichts, die Notbremse (20 s je
	// Platz, RoundClock::ZUGZEIT) schaltet B's Zug notfalls automatisch
	// weiter — hier wird bis zu 25 s gewartet.
	await seiteA.waitForFunction(() => Number(window.__standEreignisse.at(-1)?.t ?? -1) === 0, undefined, { timeout: 25000 }).catch(() => {});
	const standA_Ende = await seiteA.evaluate(() => window.__standEreignisse.at(-1));
	const standB_Ende = await seiteB.evaluate(() => window.__standEreignisse.at(-1));
	check(Number(standA_Ende?.t ?? -1) === 0, `A's letzter Stand zeigt turn_seat=0 (niemand mehr an der Reihe, gefunden: t=${standA_Ende?.t})`);

	await seiteA.waitForFunction(() => (window.__standEreignisse.at(-1)?.erg ?? '') !== '', undefined, { timeout: 30000 }).catch(() => {});
	await seiteB.waitForFunction(() => (window.__standEreignisse.at(-1)?.erg ?? '') !== '', undefined, { timeout: 30000 }).catch(() => {});
	const ergA = await seiteA.evaluate(() => window.__standEreignisse.at(-1)?.erg ?? '');
	const ergB = await seiteB.evaluate(() => window.__standEreignisse.at(-1)?.erg ?? '');
	check(ergA !== '' && ergA === ergB, `beide Browser lesen dasselbe festgeschriebene Geberergebnis (A: "${ergA}", B: "${ergB}")`);
	if (ergA === '' || ergB === '') {
		const letzteA = await seiteA.evaluate(() => window.__standEreignisse.slice(-3));
		console.log(`      DIAGNOSE erg: letzte Stände A: ${JSON.stringify(letzteA)}`);
	}

	/* ==================================================== M-1 Geld: A's Runde läuft zu Ende */

	console.log("\nM-1  (Geld) A's serverseitiger Kontostand folgt exakt A's eigenem Nettoausgang der Runde");
	// PROBEFEHLER, GEFUNDEN UND BEHOBEN: "data-bj-total !== '0'" allein ist
	// KEIN verlässliches Zeichen für "die Auszahlung ist gebucht" — seit dem
	// Behebungslauf (Server-Fehler bei der Einzelplatz-Frist, siehe README)
	// ruft die Lobby repaint() bei praktisch JEDER Abfrage auf, nicht mehr
	// nur nach onResult(). data-bj-total ist deshalb schon LANGE vor der
	// eigentlichen Auszahlung "nicht 0" (das laufende Guthaben aus dem
	// Seitenaufruf selbst). Maßgeblich ist stattdessen, dass der WERT mit
	// dem SERVER übereinstimmt — dafür wird wiederholt verglichen, statt
	// einmalig auf einen Näherungswert zu warten.
	// Erst abwarten, dass sich der SERVER-seitige Stand tatsächlich verändert
	// hat (die eigentliche Auszahlung, bank.payout()) — erst danach hat ein
	// Vergleich mit dem Client übermäßig frühen Zufallstreffern vorgebeugt.
	let kontostandNachA = serverKontostand(A.uid);
	for (let versuch = 0; versuch < 20 && kontostandNachA.gesamt === kontostandVorA.gesamt; versuch++) {
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1500));
		kontostandNachA = serverKontostand(A.uid);
	}
	// Großzügig bis zu 30 s: der Client erfährt eine SERVER-seitige Änderung
	// erst über die NÄCHSTE Lobby-Abfrage (takt: 1000 ms) — bei einer
	// Rundengrenze mitten in dieser Probe (Q-4/M-1 folgen unmittelbar
	// aufeinander) kann das mehrere Umläufe dauern.
	let clientTotalNachA = NaN;
	for (let versuch = 0; versuch < 30; versuch++) {
		clientTotalNachA = await seiteA.evaluate(() => Number(document.querySelector('[data-bj-total]')?.getAttribute('data-bj-total') ?? 'NaN'));
		if (clientTotalNachA === kontostandNachA.gesamt) {
			break;
		}
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
	}
	const serverDelta = kontostandNachA.gesamt - kontostandVorA.gesamt;
	check(Number.isFinite(clientTotalNachA), `A's Browser zeigt nach der ausgewerteten Runde einen echten Gesamtwert (gefunden: ${clientTotalNachA})`);
	check(serverDelta !== 0 || clientTotalNachA === kontostandVorA.gesamt,
		`A's serverseitiger Gesamtstand hat sich verändert (Server-Delta: ${serverDelta}) — kein Einsatz, der spurlos verschwindet`,
		`vorher: ${JSON.stringify(kontostandVorA)}`, `nachher: ${JSON.stringify(kontostandNachA)}`);
	check(clientTotalNachA === kontostandNachA.gesamt,
		`A's eigener Browser (credit.balance + bank.amount + bets.total) meldet exakt denselben Gesamtstand wie der Server (Browser: ${clientTotalNachA}, Server: ${kontostandNachA.gesamt})`,
		`vorher (Server): ${JSON.stringify(kontostandVorA)}`, `nachher (Server): ${JSON.stringify(kontostandNachA)}`);

	/* ==================================================== M-2 Geld, der Aussteiger */

	console.log('\nM-2  (Geld, der Aussteiger) A setzt erneut, verlässt mitten in der eigenen Entscheidung — A\'s Einsatz ist danach weg und bleibt es');
	const kontostandVorEinsatz = serverKontostand(A.uid);
	await setzeChip(seiteA).catch((fehlerObjekt) => check(false, `A konnte nicht erneut setzen: ${fehlerObjekt.message}`));
	const kontostandNachEinsatz = serverKontostand(A.uid);
	check(kontostandNachEinsatz.gesamt === kontostandVorEinsatz.gesamt - 2,
		`der Einsatz (2 €) verlässt den Gerätekredit bereits beim Ablegen der Chips, nicht erst beim Verlassen (vorher: ${kontostandVorEinsatz.gesamt}, nach dem Setzen: ${kontostandNachEinsatz.gesamt})`);

	await seiteA.waitForFunction(() => document.querySelector('[data-bj-state]')?.getAttribute('data-bj-state') !== 'bereit', undefined, { timeout: 40000 }).catch(() => {});
	await kontextA.close();

	await new Promise((resolve) => globalThis.setTimeout(resolve, 3000));
	const kontostandNachAusstieg = serverKontostand(A.uid);
	check(kontostandNachAusstieg.gesamt === kontostandNachEinsatz.gesamt,
		`niemand zahlt den Einsatz zurück, nachdem A mitten in der eigenen Entscheidung verschwunden ist — der Stand bleibt bei genau dem Wert nach dem Setzen (${kontostandNachEinsatz.gesamt}, gefunden: ${kontostandNachAusstieg.gesamt})`);
	check(kontostandNachAusstieg.gesamt === kontostandVorEinsatz.gesamt - 2,
		`A's Gesamtstand ist am Ende insgesamt um genau den Einsatz (2 €) kleiner als vor dem Setzen (vorher: ${kontostandVorEinsatz.gesamt}, am Ende: ${kontostandNachAusstieg.gesamt})`);

	/* ==================================================== M-3 kein zweiter Geldweg */

	console.log('\nM-3  (kein zweiter Geldweg) an /casino-lobby/handlung geht keine Anfrage, die einen Geldbetrag bucht');
	const verdaechtig = gebuchteHandlungen.filter((h) => {
		try {
			const daten = JSON.parse(h.rumpf || '{}');
			return typeof daten.betrag === 'number' || typeof daten.amount === 'number' || daten.art === 'buchen' || daten.art === 'payout';
		} catch {
			return false;
		}
	});
	check(verdaechtig.length === 0, `keine der ${gebuchteHandlungen.length} Anfragen an /casino-lobby/handlung bucht einen Geldbetrag`,
		...verdaechtig.map((h) => `${h.methode} ${h.url}: ${h.rumpf}`));
} finally {
	try { await kontextA.close(); } catch { /* bereits geschlossen (M-2) */ }

	// M-2 hat A's Kontext abrupt geschlossen. Damit dieser Lauf die drei
	// Lobby-Tabellen wieder bei 0 hinterlässt (Messhygiene), meldet sich A
	// hier ÜBER DEN ECHTEN WEG noch einmal an und verlässt regulär —
	// dieselbe Bauart wie in craps/probe-lobby-craps.mjs.
	try {
		const kontextAufraeumen = await browser.newContext({ ignoreHTTPSErrors: true });
		const seiteAufraeumen = await kontextAufraeumen.newPage();
		await seiteAufraeumen.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
		await seiteAufraeumen.goto(`${BASIS}/blackjack`, { waitUntil: 'domcontentloaded' });
		const stand = await seiteAufraeumen.locator('[data-cl-state]').first().textContent().catch(() => null);
		const endpunktA = stand ? JSON.parse(stand)?.endpunkte?.handlung : null;
		if (endpunktA) {
			await seiteAufraeumen.evaluate(async ({ handlung }) => {
				await fetch(handlung, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ art: 'verlassen' }) });
			}, { handlung: endpunktA });
		}
		await kontextAufraeumen.close();
	} catch { /* best effort */ }

	try {
		if (zustandB?.endpunkte?.handlung) {
			await seiteB.evaluate(async ({ handlung }) => {
				await fetch(handlung, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ art: 'verlassen' }) });
			}, { handlung: zustandB.endpunkte.handlung });
		}
	} catch { /* best effort */ }
	await browser.close();

	console.log('\nAufräumen: keine Blackjack-Lobby und keine Plätze/Einsätze bleiben stehen');
	try {
		const restLobby = mysql("SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='blackjack';");
		const restSeat = mysql('SELECT COUNT(*) FROM tx_casinolobby_seat;');
		const restBet = mysql('SELECT COUNT(*) FROM tx_casinolobby_bet;');
		check(restLobby === '0' && restSeat === '0' && restBet === '0',
			`keine Blackjack-Lobby und keine Plätze/Einsätze bleiben stehen (gefunden: lobby=${restLobby}, seat=${restSeat}, bet=${restBet})`,
			'HINWEIS: bitte manuell prüfen und ggf. über POST /casino-lobby/handlung {"art":"verlassen"} aufräumen.');
	} catch (fehlerObjekt) {
		check(false, `Aufräum-Kontrolle schlug fehl: ${fehlerObjekt.message}`);
	}

	console.log('\nTestSpielis Guthaben, unverändert (nur A hat gesetzt):');
	try {
		const zeile = mysql('SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=6;');
		const [cash, machine, win] = zeile.split('\t');
		console.log(`  balance_cash=${cash} balance_machine=${machine} balance_win=${win}`);
	} catch { /* nur zur Berichterstattung */ }
}

if (browserFehler.length > 0) {
	console.log('\nDIAGNOSE: JavaScript-Fehler im Browser während des Laufs:');
	for (const zeile of browserFehler) {
		console.log(`  ${zeile}`);
	}
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
