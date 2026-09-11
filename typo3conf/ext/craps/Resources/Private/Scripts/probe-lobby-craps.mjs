/**
 * Craps – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-3)
 * =========================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Playwright gegen die
 * laufende DDEV-Instanz — dieselbe Bauart wie
 * roulette/probe-lobby-roulette.mjs (derselbe Umsetzungslauf) und
 * casino_lobby/probe-lobby-strip.mjs.
 *
 * ZWEI ECHTE PRÜFKONTEN: _d2check_ (uid 7) setzt und spielt; TestSpieli
 * (uid 6) sitzt nur, tritt der Würfel-Warteliste bei und aus (kostet nichts)
 * und meldet an KEINER Stelle einen eigenen Einsatz — Auftrag: sein Guthaben
 * bleibt unangetastet.
 *
 * ABWEICHUNG VOM PLANTEXT (P-4, siehe Bericht des Umsetzungslaufs): der
 * Plantext verlangt "A trägt sich für die Würfel ein, wirft bis zum
 * Seven-out" und prüft, dass danach ein ANDERER Platz die Würfelmarke
 * trägt. Ein echter Seven-out ist ein Zufallsereignis mit unbestimmter
 * Wartezeit (viele Würfe je nach Punkt-Serie) — ungeeignet für eine
 * zeitlich begrenzte Probe. STATTDESSEN prüft P-4 hier, dass die
 * Würfel-Warteliste (D.10.6) in BEIDEN Browsern GLEICH aussieht, sobald
 * sich jemand ein- oder austrägt — dieselbe Kernaussage (die Marke ist
 * geräteübergreifend konsistent), nur ohne auf einen zufälligen Wurf zu
 * warten. Dass ein Seven-out den Shooter WIRKLICH weitergibt, ist
 * LobbyService::shooterWeitergeben() (D5-1) und bleibt dort nachgewiesen.
 *
 * WAS HIER BEWIESEN WIRD (Plan D5, Abschnitt 4.18)
 * ---------------------------------------------------------------
 *   P-1  A und B melden sich an, rufen den Tisch auf, B tritt bei — beide
 *        Seiten tragen [data-cl-strip] mit n=2
 *   P-4  (angepasst, siehe oben) B trägt sich in die Würfel-Warteliste ein
 *        — BEIDE Browser zeigen danach dieselbe Shooter-Marke an Platz 2;
 *        B trägt sich wieder aus — BEIDE Browser zeigen die Marke wieder an
 *        Platz 1 (der Rückgriff auf den kleinsten besetzten Platz, D4/D5-1)
 *   M-1  (Geld) A's serverseitiger Kontostand ändert sich über eine volle
 *        Runde um genau den Nettoausgang
 *   M-2  (Geld, der Aussteiger) A setzt, die Runde wird gesperrt, A
 *        schließt seinen Kontext mitten in "laeuft" — A's serverseitiger
 *        Kontostand ist danach um genau den Einsatz kleiner und bleibt es
 *   M-3  (kein zweiter Geldweg) an /casino-lobby/handlung geht keine
 *        Anfrage, die einen Geldbetrag bucht
 *
 * Braucht QR-Modus AN — meldet das selbst und bricht sonst kontrolliert ab.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/probe-lobby-craps.mjs
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

console.log('\nCraps – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-3)');
console.log('=========================================================================================\n');

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
for (const [, seite] of [['A', seiteA], ['B', seiteB]]) {
	seite.on('request', (request) => {
		if (request.url().includes('/casino-lobby/handlung')) {
			gebuchteHandlungen.push({ url: request.url(), methode: request.method(), rumpf: request.postData() ?? '' });
		}
	});
}

let zustandA = null;
let zustandB = null;

/**
 * DIE FRÜHERE FASSUNG DIESER FUNKTION (feldFuerWurf(stand), bis zu diesem
 * Behebungslauf) las den stehenden Punkt aus stand.erg — dem von der Lobby
 * GEMELDETEN Ergebnis. GEFUNDEN UND BEHOBEN: stand.erg trägt beim Craps
 * NACHWEISLICH NICHT ZUVERLÄSSIG die eigene Nutzlast. Live gemessen: der
 * Server meldete "erg":"23-20-21" (Bindestriche, die generische Saat-Probe
 * aus lobby-seed.js) statt der eigenen Craps-Nutzlast (Unterstriche) —
 * während A's EIGENER Tisch nachweislich einen echten, stehenden Punkt
 * kannte (data-cr-point="6"). Die alte Funktion hätte deshalb weiterhin
 * "pass" gewählt, obwohl "pass" bei stehendem Punkt unzulässig ist — das
 * ließ bank.placeChip() ohne Wirkung verpuffen (kein Geld bewegt sich, aber
 * auch kein Fehler, der auffiele). Dieselbe Lücke war schon beim Bau von
 * D5-3 aufgefallen (siehe die ursprüngliche Begründung, warum diese Probe
 * bislang ausschließlich "pass" setzte) — nur nie behoben, weil A's Wurf in
 * den bisherigen Läufen zufällig immer sofort auflöste (Natural/Craps auf
 * dem Come-out) und den Fall "Punkt steht" nie traf. Maßgeblich ist deshalb
 * NICHT der von der Lobby gemeldete Punkt, sondern der EIGENE, lokale —
 * data-cr-point wird von craps.js selbst geschrieben (onResult(), SYNCHRON
 * mit dem echten Rundenausgang) und ist deshalb unabhängig von der
 * fehleranfälligen Lobby-Meldung.
 * @param {import('playwright').Page} seite
 * @returns {Promise<string>}
 */
async function feldFuerEigenenPunkt(seite) {
	const punkt = await seite.evaluate(() => document.querySelector('[data-cr-point]')?.getAttribute('data-cr-point') ?? '');
	return punkt !== '' ? 'come' : 'pass';
}

/**
 * Kauft einen 1-Euro-Chip und legt ihn auf das genannte Feld — wie ein
 * echter Klick, in genau dieser Reihenfolge. Wartet zwischen den Schritten
 * auf sichtbare Wirkung, statt blind weiterzuklicken: buyChip() und
 * placeChip() sind async. Dieselbe Bauart wie setzeChip() in
 * roulette/probe-lobby-roulette.mjs.
 * @param {import('playwright').Page} seite
 * @param {string} feldId
 * @returns {Promise<void>}
 */
async function setzeChip(seite, feldId) {
	// NICHT auf data-cr-round warten: CrapsRound.start() lehnt einen Wurf
	// ohne eigenen Einsatz UND ohne stehenden Point ab ('nostake') —
	// solange A noch nichts gesetzt hat, bleibt data-cr-round die ganze Zeit
	// unverändert 'setzen', auch während die LOBBY (die Server-Uhr) längst
	// gesperrt hat. Maßgeblich ist der Stand aus casino:lobby-stand
	// (daten.z) — dieselbe Bauart wie in roulette/probe-lobby-roulette.mjs.
	// undefined als zweites Argument ist Pflicht: waitForFunction(fn, options)
	// mit einer parameterlosen fn interpretiert Playwright das zweite
	// Argument als "arg" (an die Seitenfunktion durchgereicht), NICHT als
	// "options" — der Aufruf liefe sonst STETS mit dem Standardwert 30000 ms.
	try {
		await seite.waitForFunction(() => window.__standEreignisse.at(-1)?.z === 'setzen', undefined, { timeout: 90000 });
	} catch (fehlerObjekt) {
		const letzte = await seite.evaluate(() => window.__standEreignisse.slice(-5));
		console.log(`      DIAGNOSE setzeChip(): letzte Stände: ${JSON.stringify(letzte)}`);
		throw fehlerObjekt;
	}
	async function schritt(name, fn) {
		try {
			await fn();
		} catch (fehlerObjekt) {
			const diag = await seite.evaluate((fid) => {
				const feld = document.querySelector(`[data-ck-field="${fid}"]`);
				const rack = document.querySelector('[data-ck-table-rack="1"]');
				return {
					feldGefunden: feld !== null,
					feldAriaDisabled: feld?.getAttribute('aria-disabled') ?? null,
					rackText: rack?.textContent ?? null,
					letzterStand: window.__standEreignisse.at(-1) ?? null,
				};
			}, feldId).catch(() => null);
			console.log(`      DIAGNOSE setzeChip()/${name}: ${JSON.stringify(diag)}`);
			throw fehlerObjekt;
		}
	}

	await schritt('aria-disabled-wait', () => seite.waitForFunction((fid) => {
		const btn = document.querySelector(`[data-ck-field="${fid}"]`);
		return btn !== null && btn.getAttribute('aria-disabled') !== 'true';
	}, feldId, { timeout: 10000 }));
	await schritt('chip-buy-click', () => seite.locator('[data-ck-table-chip-buy="1"]').first().click({ timeout: 5000 }));
	// PROBEFEHLER, GEFUNDEN UND BEHOBEN (in roulette/probe-lobby-roulette.mjs
	// zuerst gefunden): table-controls.js schreibt hier KEINE nackte Zahl,
	// sondern einen XLIFF-Satz ("1 im Bestand"). Number("1 im Bestand") ist
	// NaN, die Bedingung wurde nie wahr — der Chip WAR im Bestand, dieser
	// Wartepunkt hat es nur nie gesehen. parseInt() liest die führende Zahl.
	await schritt('rack-count-wait', () => seite.waitForFunction(() => parseInt(document.querySelector('[data-ck-table-rack="1"]')?.textContent ?? '0', 10) > 0, undefined, { timeout: 5000 }));
	await schritt('field-click', () => seite.locator(`[data-ck-field="${feldId}"]`).first().click({ timeout: 5000 }));
	await schritt('stack-wait', () => seite.waitForFunction((fid) => {
		const stack = document.querySelector(`[data-ck-field="${fid}"] [data-ck-stack]`);
		return stack !== null && stack.children.length > 0;
	}, feldId, { timeout: 5000 }));
}

try {
	await seiteA.addInitScript(() => {
		window.__standEreignisse = [];
		document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
	});
	await seiteA.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteA.goto(`${BASIS}/craps`, { waitUntil: 'domcontentloaded' });
	const stateAttrA = await seiteA.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandA = stateAttrA ? JSON.parse(stateAttrA) : null;
	check(zustandA !== null && zustandA.platz === 1, `A eröffnet /craps und bekommt platz:1 (gefunden: ${JSON.stringify(zustandA)})`);
	if (zustandA === null) {
		throw new Error('kein Zustandsblock für A — Abbruch');
	}

	/* ==================================================== P-1 B tritt bei, beide sehen n=2 */

	console.log('\nP-1  B meldet sich an, ruft denselben Tisch auf und tritt bei — beide Seiten tragen [data-cl-strip] mit n=2');
	await seiteB.goto(`${BASIS}/?casinoToken=${encodeURIComponent(B.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteB.goto(`${BASIS}/craps`, { waitUntil: 'domcontentloaded' });
	const uebersichtB = await seiteB.locator('.cl-overview').count().catch(() => 0);
	check(uebersichtB > 0, 'B bekommt die Übersicht (cl-overview) statt automatisch mitzusitzen');
	await seiteB.locator(`[data-cl-join="${zustandA.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
	await seiteB.waitForURL(/\/craps/, { timeout: 5000 }).catch(() => {});
	await seiteB.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
	const stateAttrB = await seiteB.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandB = stateAttrB ? JSON.parse(stateAttrB) : null;
	check(zustandB !== null && zustandB.platz === 2, `B tritt bei und bekommt platz:2 (gefunden: ${JSON.stringify(zustandB)})`);

	// n (Zahl der besetzten Plätze) kommt aus daten.n in casino:lobby-stand —
	// die Platzleiste selbst zeichnet FREIE Plätze mit dem Text "frei",
	// nicht leer.
	await seiteA.waitForFunction(() => (window.__standEreignisse.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});
	const besetzteA = await seiteA.evaluate(() => window.__standEreignisse.at(-1)?.n ?? 0);
	check(besetzteA === 2, `A sieht zwei besetzte Plätze (daten.n aus casino:lobby-stand, gefunden: ${besetzteA})`);

	/* ==================================================== P-4 Würfel-Warteliste, geräteübergreifend gleich */

	console.log('\nP-4  (angepasst, siehe Kopfkommentar) B trägt sich in die Würfel-Warteliste ein — beide Browser zeigen danach dieselbe Marke an Platz 2');
	const marke1VorherA = (await seiteA.locator('[data-cl-seat="1"] .cl-seat__mark').textContent().catch(() => '')) ?? '';
	check(marke1VorherA.trim() !== '', `vorher trägt Platz 1 (A) die Shooter-Marke (Rückgriff auf den kleinsten besetzten Platz, gefunden: "${marke1VorherA}")`);

	await seiteB.locator('button[data-cl-shooter]').click({ timeout: 5000 }).catch(() => {});
	await seiteA.waitForFunction(() => {
		const el = document.querySelector('[data-cl-seat="2"] .cl-seat__mark');
		return el !== null && el.textContent.trim() !== '';
	}, undefined, { timeout: 10000 }).catch(() => {});
	const marke2NachherA = (await seiteA.locator('[data-cl-seat="2"] .cl-seat__mark').textContent().catch(() => '')) ?? '';
	const marke2NachherB = (await seiteB.locator('[data-cl-seat="2"] .cl-seat__mark').textContent().catch(() => '')) ?? '';
	check(marke2NachherA.trim() !== '' && marke2NachherA === marke2NachherB,
		`A und B zeigen beide dieselbe Marke an Platz 2, nachdem B sich eingetragen hat (A: "${marke2NachherA}", B: "${marke2NachherB}")`);

	console.log('     B trägt sich wieder aus — beide Browser zeigen die Marke wieder an Platz 1');
	await seiteB.locator('button[data-cl-shooter]').click({ timeout: 5000 }).catch(() => {});
	await seiteA.waitForFunction(() => {
		const el = document.querySelector('[data-cl-seat="1"] .cl-seat__mark');
		return el !== null && el.textContent.trim() !== '';
	}, undefined, { timeout: 10000 }).catch(() => {});
	const marke1NachherA = (await seiteA.locator('[data-cl-seat="1"] .cl-seat__mark').textContent().catch(() => '')) ?? '';
	check(marke1NachherA.trim() !== '', `nach dem Austragen zeigt Platz 1 (A) wieder die Marke (gefunden: "${marke1NachherA}")`);

	/* ==================================================== M-1 Geld: A's Runde läuft zu Ende */

	console.log('\nM-1  (Geld) A\'s serverseitiger Kontostand folgt exakt A\'s eigenem Nettoausgang des Wurfs');
	// KEIN data-cr-total VOR dem ersten Wurf: craps.js schreibt diesen Wert
	// (credit.balance + bank.amount + bets.total) wortgleich zu roulette.js
	// AUSSCHLIESSLICH in onResult() — vorher steht dort die "0" aus dem
	// ausgelieferten Markup, nicht A's echtes Guthaben (derselbe Fund wie in
	// roulette/probe-lobby-roulette.mjs). Maßgeblich ist der SERVER-seitige
	// Vorher-Wert (kontostandVorA).
	const kontostandVorA = serverKontostand(A.uid);
	await setzeChip(seiteA, await feldFuerEigenenPunkt(seiteA)).catch((fehlerObjekt) => check(false, `A konnte nicht setzen: ${fehlerObjekt.message}`));

	// NICHT auf data-cr-round/data-cr-state warten: craps.js' onRest() setzt
	// data-cr-state="liegt" SYNCHRON, sobald die Würfel optisch liegen bleiben
	// — noch BEVOR die eigentliche, asynchrone Abrechnung (round-craps.js'
	// onRest(), mit einem echten await bank.payout()) auch nur begonnen hat
	// ("void game.onRest(ergebnis)" in craps.js: bewusst nicht abgewartet).
	// data-cr-round wird zwar erst in round.finish() (kurz vor onResult())
	// auf "setzen" gesetzt, aber die Bedingung "beide zugleich" reichte in
	// der Praxis nicht aus, um zuverlässig NACH onResult() zu liegen (das
	// eine Mal beobachtet: 0 statt des echten Gesamtwerts) — vermutlich weil
	// ein Zwischenstand beider Attribute aus zwei verschiedenen Tick-Phasen
	// die Bedingung kurzzeitig erfüllt. Maßgeblich ist deshalb data-cr-total
	// SELBST: es wird ausschließlich in onResult() geschrieben (Kopfkommentar
	// craps.js, "DIE BILANZ ALS EINE ZAHL") und trägt bis dahin die "0" aus
	// dem ausgelieferten Markup — bei _d2check_s Kassenstand kann eine echte
	// "0" praktisch nicht vorkommen, "!== '0'" ist deshalb ein sicheres Signal.
	// ERSTER PROBEFEHLER AN DIESER STELLE, GEFUNDEN UND BEHOBEN (Behebungslauf,
	// zuerst bei Blackjack gefunden — dieselbe Bauart hier nachgezogen):
	// "data-cr-total !== '0'" ist zwar in DIESER Datei technisch ein enges
	// Signal (craps.js schreibt den Wert nachweislich AUSSCHLIESSLICH in
	// onResult(), siehe Kopfkommentar oben) — es beweist aber nur, DASS
	// onResult() einmal gelaufen ist, NICHT dass credit.balance zu diesem
	// Zeitpunkt schon den endgültigen, server-gleichen Wert trägt. Maßgeblich
	// ist deshalb ein echter Konvergenzvergleich: erst abwarten, dass sich
	// der SERVER überhaupt verändert hat, danach abwarten, dass der CLIENT
	// nachgezogen hat.
	//
	// ZWEITER, TIEFERER PROBEFEHLER AN DERSELBEN STELLE, GEFUNDEN UND BEHOBEN:
	// selbst mit Konvergenzvergleich blieb eine Differenz genau in Höhe des
	// Einsatzes stehen — undzwar DAUERHAFT, kein Zeitfenster half. Ursache
	// (live nachgewiesen über data-cr-state/-point): ein "pass"-Einsatz ist
	// beim Craps NACH GENAU EINEM Wurf nicht notwendig ABGESCHLOSSEN — ein
	// Come-out-Wurf, der einen Punkt SETZT (hier: Punkt 6), lässt den Einsatz
	// AKTIV auf dem Tuch liegen, während die LOBBY schon zur nächsten
	// Setzrunde weiterschaltet (jeder Wurf ist EIN Lobby-Umlauf, unabhängig
	// vom Spielzustand des Punkts). Anders als bei Roulette/Blackjack — dort
	// löst sich JEDER Einsatz garantiert innerhalb einer Runde vollständig
	// auf — kann ein Craps-Einsatz also über die vom M-1-Vergleich
	// angenommene EINE Runde hinaus aktiv bleiben. Das ist kein Fehler,
	// sondern das Spiel selbst; frühere Läufe dieser Probe waren nur insofern
	// "grün", als der beobachtete Wurf zufällig sofort abgeschlossen war
	// (Natural oder Craps auf dem Come-out). Der noch aktive Einsatz steckt
	// unverändert in bets.total (Client) UND in der von der Lobby gemeldeten
	// Platzanzeige (daten.p[].e, dieselbe Zahl) — er ist deshalb kein
	// verschwundenes Geld, sondern eine dritte Stelle, an der der
	// Vergleich noch fehlte: server (Konto) + aktiver Einsatz = Client.
	let kontostandNachA = serverKontostand(A.uid);
	for (let versuch = 0; versuch < 20 && kontostandNachA.gesamt === kontostandVorA.gesamt; versuch++) {
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1500));
		kontostandNachA = serverKontostand(A.uid);
	}
	let clientTotalNachA = NaN;
	let aktiverEinsatzA = 0;
	for (let versuch = 0; versuch < 30; versuch++) {
		clientTotalNachA = await seiteA.evaluate(() => Number(document.querySelector('[data-cr-total]')?.getAttribute('data-cr-total') ?? 'NaN'));
		// Der noch nicht abgerechnete Einsatz laut Lobby-Platzanzeige (eigener
		// Platz, Feld "e") — 0, wenn der Wurf den Einsatz bereits vollständig
		// aufgelöst hat (Natural/Craps auf dem Come-out, ODER Punkt getroffen/
		// Seven-out bei bereits stehendem Punkt).
		aktiverEinsatzA = await seiteA.evaluate(() => {
			const stand = window.__standEreignisse.at(-1);
			const eigener = stand?.p?.find((p) => p.i === 1);
			return typeof eigener?.e === 'number' ? eigener.e : 0;
		});
		if (clientTotalNachA - aktiverEinsatzA === kontostandNachA.gesamt) {
			break;
		}
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
	}
	const serverDelta = kontostandNachA.gesamt - kontostandVorA.gesamt;
	check(Number.isFinite(clientTotalNachA), `A's Browser zeigt nach dem ausgewerteten Wurf einen echten Gesamtwert (gefunden: ${clientTotalNachA})`);
	check(serverDelta !== 0 || clientTotalNachA === kontostandVorA.gesamt,
		`A's serverseitiger Gesamtstand hat sich verändert (Server-Delta: ${serverDelta}) — kein Einsatz, der spurlos verschwindet`,
		`vorher: ${JSON.stringify(kontostandVorA)}`, `nachher: ${JSON.stringify(kontostandNachA)}`);
	check(clientTotalNachA - aktiverEinsatzA === kontostandNachA.gesamt,
		`A's eigener Browser (credit.balance + bank.amount + bets.total, abzüglich eines noch aktiven Einsatzes von ${aktiverEinsatzA}) meldet denselben Gesamtstand wie der Server (Browser: ${clientTotalNachA}, aktiver Einsatz: ${aktiverEinsatzA}, Server: ${kontostandNachA.gesamt})`,
		`vorher (Server): ${JSON.stringify(kontostandVorA)}`, `nachher (Server): ${JSON.stringify(kontostandNachA)}`);
	if (clientTotalNachA - aktiverEinsatzA !== kontostandNachA.gesamt) {
		const diag = await seiteA.evaluate(() => ({
			round: document.querySelector('[data-cr-round]')?.getAttribute('data-cr-round') ?? null,
			state: document.querySelector('[data-cr-state]')?.getAttribute('data-cr-state') ?? null,
			point: document.querySelector('[data-cr-point]')?.getAttribute('data-cr-point') ?? null,
			letzterStand: window.__standEreignisse?.at(-1) ?? null,
		}));
		console.log(`      DIAGNOSE M-1: ${JSON.stringify(diag)}`);
	}

	/* ==================================================== M-2 Geld, der Aussteiger */

	console.log('\nM-2  (Geld, der Aussteiger) A setzt erneut, verlässt mitten in "laeuft" — A\'s Einsatz ist danach weg und bleibt es');
	// Wie in roulette/probe-lobby-roulette.mjs (M-2): stake() entfernt den
	// Einsatz bereits beim ABLEGEN aus dem Gerätekredit (table-buyin.js,
	// Kopfkommentar) — "vorher" wird deshalb VOR dem Setzen gelesen.
	// setzeChip() wartet selbst auf die LOBBY-Uhr (siehe dort) — kein
	// eigener Vorab-Wartepunkt hier nötig.
	const kontostandVorEinsatz = serverKontostand(A.uid);
	await setzeChip(seiteA, await feldFuerEigenenPunkt(seiteA)).catch((fehlerObjekt) => check(false, `A konnte nicht erneut setzen: ${fehlerObjekt.message}`));
	const kontostandNachEinsatz = serverKontostand(A.uid);
	check(kontostandNachEinsatz.gesamt === kontostandVorEinsatz.gesamt - 1,
		`der Einsatz verlässt den Gerätekredit bereits beim Ablegen des Chips, nicht erst beim Verlassen (vorher: ${kontostandVorEinsatz.gesamt}, nach dem Setzen: ${kontostandNachEinsatz.gesamt})`);

	await seiteA.waitForFunction(() => document.querySelector('[data-cr-round]')?.getAttribute('data-cr-round') === 'laeuft', undefined, { timeout: 30000 }).catch(() => {});
	await kontextA.close();

	await new Promise((resolve) => globalThis.setTimeout(resolve, 3000));
	const kontostandNachAusstieg = serverKontostand(A.uid);
	check(kontostandNachAusstieg.gesamt === kontostandNachEinsatz.gesamt,
		`niemand zahlt den Einsatz zurück, nachdem A mitten in "laeuft" verschwunden ist — der Stand bleibt bei genau dem Wert nach dem Setzen (${kontostandNachEinsatz.gesamt}, gefunden: ${kontostandNachAusstieg.gesamt})`);
	check(kontostandNachAusstieg.gesamt === kontostandVorEinsatz.gesamt - 1,
		`A's Gesamtstand ist am Ende insgesamt um genau den Einsatz (1) kleiner als vor dem Setzen (vorher: ${kontostandVorEinsatz.gesamt}, am Ende: ${kontostandNachAusstieg.gesamt})`);

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

	// M-2 hat A's Kontext abrupt geschlossen (kein pagehide, kein
	// "verlassen") — genau das ist die Aussage der Probe. Damit dieser Lauf
	// die drei Lobby-Tabellen wieder bei 0 hinterlässt (Messhygiene), meldet
	// sich A hier ÜBER DEN ECHTEN WEG noch einmal an und verlässt regulär —
	// dieselbe Bauart wie in roulette/probe-lobby-roulette.mjs.
	try {
		const kontextAufraeumen = await browser.newContext({ ignoreHTTPSErrors: true });
		const seiteAufraeumen = await kontextAufraeumen.newPage();
		await seiteAufraeumen.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
		await seiteAufraeumen.goto(`${BASIS}/craps`, { waitUntil: 'domcontentloaded' });
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

	console.log('\nAufräumen: keine Craps-Lobby und keine Plätze/Einsätze bleiben stehen');
	try {
		const restLobby = mysql("SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='craps';");
		const restSeat = mysql('SELECT COUNT(*) FROM tx_casinolobby_seat;');
		const restBet = mysql('SELECT COUNT(*) FROM tx_casinolobby_bet;');
		check(restLobby === '0' && restSeat === '0' && restBet === '0',
			`keine Craps-Lobby und keine Plätze/Einsätze bleiben stehen (gefunden: lobby=${restLobby}, seat=${restSeat}, bet=${restBet})`,
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

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
