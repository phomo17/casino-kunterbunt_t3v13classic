/**
 * Roulette – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-3)
 * ============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Playwright gegen die
 * laufende DDEV-Instanz — Gerüst wörtlich nach dem Vorbild von
 * casino_lobby/probe-lobby-strip.mjs (Anmeldung über /?casinoToken=…, genau
 * der Weg, den ein QR-Code auslöst) und den Fetch-Helfern aus
 * casino_lobby/verify-lobby-live.mjs (zweiTestKennungen()).
 *
 * ZWEI ECHTE PRÜFKONTEN, UND WARUM DAS GENAU SO GEHT: _d2check_ (uid 7,
 * Admin, riesiger Kassenstand) und TestSpieli (uid 6) — genau wie
 * verify-lobby-live.mjs es in V-9 bis V-20 schon tut. Der Auftrag für diesen
 * Lauf verlangt ausdrücklich, TestSpielis Guthaben NICHT anzutasten. Diese
 * Probe hält sich daran, indem sie TestSpieli an KEINER Stelle chippen oder
 * bank.placeChip() aufrufen lässt: er sitzt nur, sieht zu und meldet nichts.
 * Jeder Chip in dieser Probe kommt von _d2check_.
 *
 * ABWEICHUNG VOM PLANTEXT (P-2/P-3, siehe Bericht des Umsetzungslaufs): der
 * Plantext verlangt "beide setzen je einen Chip" für den Nachweis "beide
 * Browser sehen dieselbe Zahl". Das ginge nur, wenn TestSpieli ebenfalls
 * setzt — RouletteRound.start() lehnt eine Runde ohne eigenen Einsatz mit
 * {ok:false, reason:'nostake'} ab (round-roulette.js), das eigene Rad liefe
 * für einen Zuschauer also gar nicht erst an, und data-ro-result bliebe auf
 * TestSpielis Seite leer. STATTDESSEN vergleicht P-2 hier die SAAT, die
 * beide Browser über casino:lobby-runde empfangen, Zeichen für Zeichen —
 * dieselbe Aussage, nur eine Ebene tiefer angesetzt: verify-lobby-roulette.mjs
 * (R-4) beweist bereits rechnend, dass dieselbe Saat in JEDEM Browser
 * dieselbe Zahl ergibt; diese Probe beweist hier zusätzlich, dass beide
 * Browser TATSÄCHLICH dieselbe Saat vom Server bekommen. P-3 (fremde
 * Einsätze sichtbar) bleibt VOLLSTÄNDIG erreichbar, weil es nur verlangt,
 * dass B den Einsatz VON A sieht — das braucht keinen eigenen Einsatz von B.
 *
 * WAS HIER BEWIESEN WIRD (Plan D5, Abschnitt 4.18)
 * ---------------------------------------------------------------
 *   P-1  A und B melden sich an, rufen den Tisch auf, B tritt bei — beide
 *        Seiten tragen [data-cl-strip] mit n=2
 *   P-2  (angepasst, siehe oben) beide Browser empfangen über
 *        casino:lobby-runde dieselbe Saat für dieselbe Runde
 *   P-3  A setzt einen Chip; B sieht den Einsatz von A in der Platzleiste
 *        ([data-cl-seat][data-cl-seat-stake]), ohne selbst zu setzen
 *   M-1  (Geld) A's serverseitiger Kontostand (balance_cash + balance_machine
 *        + balance_win) ändert sich über eine volle Runde um genau den
 *        Nettoausgang, den A's eigener Browser berechnet
 *   M-2  (Geld, der Aussteiger) A setzt, die Runde wird gesperrt, A schließt
 *        seinen Kontext mitten in "laeuft" — A's serverseitiger Kontostand
 *        ist danach um genau den Einsatz kleiner und bleibt es
 *   M-3  (kein zweiter Geldweg) während der ganzen Probe geht an
 *        /casino-lobby/handlung KEINE Anfrage, die einen Geldbetrag bucht
 *
 * Braucht QR-Modus AN (Tests/Acceptance/dbg-schalter.mjs an) — meldet das
 * selbst und bricht sonst kontrolliert ab.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/probe-lobby-roulette.mjs
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

console.log('\nRoulette – Live-Probe des Lobby-Anschlusses, zwei echte Sitzungen (Umsetzungsstück D5-3)');
console.log('============================================================================================\n');

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

/** Gebuchte Anfragen an den Lobby-Endpunkt, für M-3. */
const gebuchteHandlungen = [];
for (const seite of [seiteA, seiteB]) {
	seite.on('request', (request) => {
		if (request.url().includes('/casino-lobby/handlung')) {
			gebuchteHandlungen.push({ url: request.url(), methode: request.method(), rumpf: request.postData() ?? '' });
		}
	});
}

let zustandA = null;
let zustandB = null;

/**
 * Kauft einen 1-Euro-Chip und legt ihn auf das genannte Feld — wie ein
 * echter Klick, in genau dieser Reihenfolge (table-controls.js/
 * table-felt.js). Wartet zwischen den Schritten auf sichtbare Wirkung, statt
 * blind weiterzuklicken: buyChip() und placeChip() sind async.
 * @param {import('playwright').Page} seite
 * @param {string} feldId
 * @returns {Promise<void>}
 */
async function setzeChip(seite, feldId) {
	// NICHT auf data-ro-state warten: RouletteRound.start() lehnt eine Runde
	// ohne eigenen Einsatz ab ('nostake') — solange A noch nichts gesetzt
	// hat, bleibt data-ro-state die ganze Zeit unverändert 'setzen', auch
	// während der LOBBY (der Server-Uhr, siehe sperren() in roulette.js)
	// längst gesperrt hat. Maßgeblich ist der Stand aus casino:lobby-stand
	// (daten.z) — dieselbe Uhr, nach der sperren() das Tuch tatsächlich auf-
	// und zusperrt. Volle Rundenlänge als Zeitfenster, nicht 10 s.
	// undefined als zweites Argument ist Pflicht: waitForFunction(fn, options)
	// mit einer parameterlosen fn interpretiert Playwright das zweite
	// Argument als "arg" (an die Seitenfunktion durchgereicht), NICHT als
	// "options" — der Aufruf liefe sonst STETS mit dem Standardwert 30000 ms,
	// gleich welcher timeout hier steht (an diesem genauen Fehler in genau
	// dieser Datei gemessen — verify-lobby-roulette.mjs prüft das nicht,
	// weil dort kein Playwright läuft).
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
	// PROBEFEHLER, GEFUNDEN UND BEHOBEN: table-controls.js schreibt hier
	// KEINE nackte Zahl, sondern einen XLIFF-Satz ("1 im Bestand", refresh()
	// in table-controls.js über texts.rackCount). Number("1 im Bestand") ist
	// NaN, die Bedingung wurde nie wahr — der Chip WAR im Bestand, dieser
	// Wartepunkt hat es nur nie gesehen. parseInt() liest die führende Zahl
	// und ignoriert den Rest des Satzes.
	await schritt('rack-count-wait', () => seite.waitForFunction(() => parseInt(document.querySelector('[data-ck-table-rack="1"]')?.textContent ?? '0', 10) > 0, undefined, { timeout: 5000 }));
	await schritt('field-click', () => seite.locator(`[data-ck-field="${feldId}"]`).first().click({ timeout: 5000 }));
	await schritt('stack-wait', () => seite.waitForFunction((fid) => {
		const stack = document.querySelector(`[data-ck-field="${fid}"] [data-ck-stack]`);
		return stack !== null && stack.children.length > 0;
	}, feldId, { timeout: 5000 }));
}

try {
	for (const seite of [seiteA, seiteB]) {
		await seite.addInitScript(() => {
			window.__rundeEreignisse = [];
			window.__standEreignisse = [];
			document.addEventListener('casino:lobby-runde', (e) => { window.__rundeEreignisse.push(e.detail); });
			document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
		});
	}

	await seiteA.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteA.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });
	const stateAttrA = await seiteA.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandA = stateAttrA ? JSON.parse(stateAttrA) : null;
	check(zustandA !== null && zustandA.platz === 1, `A eröffnet /roulette und bekommt platz:1 (gefunden: ${JSON.stringify(zustandA)})`);
	if (zustandA === null) {
		throw new Error('kein Zustandsblock für A — Abbruch');
	}

	/* ==================================================== P-1 B tritt bei, beide sehen n=2 */

	console.log('\nP-1  B meldet sich an, ruft denselben Tisch auf und tritt bei — beide Seiten tragen [data-cl-strip] mit n=2');
	await seiteB.goto(`${BASIS}/?casinoToken=${encodeURIComponent(B.token)}`, { waitUntil: 'domcontentloaded' });
	await seiteB.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });
	const uebersichtB = await seiteB.locator('.cl-overview').count().catch(() => 0);
	check(uebersichtB > 0, 'B bekommt die Übersicht (cl-overview) statt automatisch mitzusitzen');
	const joinKnopf = seiteB.locator(`[data-cl-join="${zustandA.lobby}"]`);
	await joinKnopf.click({ timeout: 5000 }).catch(() => {});
	await seiteB.waitForURL(/\/roulette/, { timeout: 5000 }).catch(() => {});
	await seiteB.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
	const stateAttrB = await seiteB.locator('[data-cl-state]').first().textContent().catch(() => null);
	zustandB = stateAttrB ? JSON.parse(stateAttrB) : null;
	check(zustandB !== null && zustandB.platz === 2, `B tritt bei und bekommt platz:2 (gefunden: ${JSON.stringify(zustandB)})`);

	// n (Zahl der besetzten Plätze) kommt aus daten.n in casino:lobby-stand —
	// die Platzleiste selbst zeichnet FREIE Plätze mit dem Text "frei", nicht
	// leer, ein Auszählen über .cl-seat__name-Textinhalt zählte deshalb immer
	// alle acht Plätze mit.
	await seiteA.waitForFunction(() => (window.__standEreignisse.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});
	await seiteB.waitForFunction(() => (window.__standEreignisse.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});
	const besetzteA = await seiteA.evaluate(() => window.__standEreignisse.at(-1)?.n ?? 0);
	const besetzteB = await seiteB.evaluate(() => window.__standEreignisse.at(-1)?.n ?? 0);
	check(besetzteA === 2, `A sieht zwei besetzte Plätze (daten.n aus casino:lobby-stand, gefunden: ${besetzteA})`);
	check(besetzteB === 2, `B sieht zwei besetzte Plätze (daten.n aus casino:lobby-stand, gefunden: ${besetzteB})`);

	/* ==================================================== P-2 dieselbe Saat in beiden Browsern */

	console.log('\nP-2  beide Browser empfangen über casino:lobby-runde dieselbe Saat für dieselbe Runde (angepasst, siehe Kopfkommentar)');
	await seiteA.waitForFunction(() => window.__rundeEreignisse.length > 0, undefined, { timeout: 30000 }).catch(() => {});
	await seiteB.waitForFunction(() => window.__rundeEreignisse.length > 0, undefined, { timeout: 30000 }).catch(() => {});
	const rundeA = await seiteA.evaluate(() => window.__rundeEreignisse[0] ?? null);
	const rundeB = await seiteB.evaluate(() => window.__rundeEreignisse[0] ?? null);
	check(rundeA !== null && rundeB !== null && rundeA.saat === rundeB.saat && rundeA.runde === rundeB.runde,
		`A und B empfangen dieselbe Saat für dieselbe Runde (A: ${JSON.stringify(rundeA)}, B: ${JSON.stringify(rundeB)})`);

	/* ==================================================== P-3 A setzt, B sieht den Einsatz */

	console.log('\nP-3  A setzt einen Chip; B sieht den Einsatz von A in der Platzleiste, ohne selbst zu setzen');
	// KEIN data-ro-total VOR der ersten Runde: laut roulette.js' eigenem
	// Kopfkommentar ("DIE BILANZ ALS EINE ZAHL ... Geschrieben wird sie
	// AUSSCHLIESSLICH hier, in onResult()") existiert dieser Wert client-
	// seitig erst, NACHDEM die erste Runde ausgewertet wurde — vorher steht
	// dort wörtlich die "0" aus dem ausgelieferten Markup (Table.html), nicht
	// A's echtes Guthaben. Ein Vergleichspunkt "vorher" auf Client-Seite ist
	// deshalb für A's allererste Runde gar nicht zu haben; maßgeblich ist der
	// SERVER-seitige Vorher-Wert (kontostandVorA), der jederzeit gilt.
	const kontostandVorA = serverKontostand(A.uid);
	await setzeChip(seiteA, 'n-1').catch((fehlerObjekt) => check(false, `A konnte nicht setzen: ${fehlerObjekt.message}`));

	await seiteB.waitForFunction(() => {
		const el = document.querySelector('[data-cl-seat="1"] [data-cl-seat-stake]');
		return el !== null && /\d/.test(el.textContent ?? '');
	}, undefined, { timeout: 10000 }).catch(() => {});
	const einsatzBeiB = await seiteB.locator('[data-cl-seat="1"] [data-cl-seat-stake]').textContent().catch(() => '');
	check(/1/.test(einsatzBeiB ?? ''), `B sieht den Einsatz von A am Platz 1 (gefunden: "${einsatzBeiB}")`, 'B hat selbst nichts gesetzt');

	/* ==================================================== M-1 Geld: A's Runde läuft zu Ende */

	console.log('\nM-1  (Geld) A\'s serverseitiger Kontostand ändert sich über die volle Runde um genau den Nettoausgang');
	await seiteA.waitForFunction(() => document.querySelector('[data-ro-state]')?.getAttribute('data-ro-state') === 'setzen'
		&& document.querySelector('[data-ro-result]')?.getAttribute('data-ro-result') !== '', undefined, { timeout: 45000 }).catch(() => {});
	// PROBEFEHLER, VORSORGLICH BEHOBEN (Behebungslauf, zuerst bei Blackjack
	// gefunden — dieselbe Bauart hier nachgezogen, obwohl diese Probe bisher
	// grün lief): eine einzelne Lese-Stelle beweist nur, DASS onResult()
	// einmal geschrieben hat, NICHT dass credit.balance zu diesem Zeitpunkt
	// bereits den endgültigen, server-gleichen Wert trägt — ein Zufallstreffer
	// ins richtige Zeitfenster ist keine verlässliche Zusage. Maßgeblich ist
	// deshalb ein echter Konvergenzvergleich: erst abwarten, dass sich der
	// SERVER überhaupt verändert hat, danach abwarten, dass der CLIENT
	// nachgezogen hat.
	let kontostandNachA = serverKontostand(A.uid);
	for (let versuch = 0; versuch < 20 && kontostandNachA.gesamt === kontostandVorA.gesamt; versuch++) {
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1500));
		kontostandNachA = serverKontostand(A.uid);
	}
	let clientTotalNachA = NaN;
	for (let versuch = 0; versuch < 30; versuch++) {
		clientTotalNachA = await seiteA.evaluate(() => Number(document.querySelector('[data-ro-total]')?.getAttribute('data-ro-total') ?? 'NaN'));
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
		`A's eigener Browser (credit.balance + bank.amount + bets.total, jetzt nach onResult() erstmals geschrieben) meldet exakt denselben Gesamtstand wie der Server (Browser: ${clientTotalNachA}, Server: ${kontostandNachA.gesamt})`,
		`vorher (Server): ${JSON.stringify(kontostandVorA)}`, `nachher (Server): ${JSON.stringify(kontostandNachA)}`);

	/* ==================================================== M-2 Geld, der Aussteiger */

	console.log('\nM-2  (Geld, der Aussteiger) A setzt erneut, verlässt mitten in "laeuft" — A\'s Einsatz ist danach weg und bleibt es');
	// WICHTIG FÜR DIE RECHNUNG: table-buyin.js bucht "Chip aufs Tuch" als
	// rack.take(wert) + machineCredit.stake(wert) — der Einsatz verlässt den
	// Gerätekredit BEREITS BEIM ABLEGEN, nicht erst beim Verlassen der Seite
	// (siehe dessen Kopfkommentar, Regel 1: "Ein Einsatz ist über stake()
	// bereits aus dem Gerätekredit heraus; close() bucht nur zurück, was
	// noch drin ist"). "vorher" wird deshalb VOR dem Setzen gelesen, damit
	// die Prüfung den Verlust wirklich SIEHT, statt eine bereits verlorene
	// Zahl gegen sich selbst zu vergleichen.
	//
	// setzeChip() wartet selbst auf die LOBBY-Uhr (siehe dort) — kein
	// eigener Vorab-Wartepunkt hier nötig.
	const kontostandVorEinsatz = serverKontostand(A.uid);
	await setzeChip(seiteA, 'n-2').catch((fehlerObjekt) => check(false, `A konnte nicht erneut setzen: ${fehlerObjekt.message}`));
	const kontostandNachEinsatz = serverKontostand(A.uid);
	check(kontostandNachEinsatz.gesamt === kontostandVorEinsatz.gesamt - 1,
		`der Einsatz verlässt den Gerätekredit bereits beim Ablegen des Chips, nicht erst beim Verlassen (vorher: ${kontostandVorEinsatz.gesamt}, nach dem Setzen: ${kontostandNachEinsatz.gesamt})`);

	await seiteA.waitForFunction(() => document.querySelector('[data-ro-state]')?.getAttribute('data-ro-state') === 'laeuft', undefined, { timeout: 30000 }).catch(() => {});
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
	// "verlassen") — genau das ist die Aussage der Probe. A's Sitzplatz
	// bleibt deshalb stehen, bis entweder der serverseitige 30-s-Verfall
	// greift oder jemand ihn räumt. Damit dieser Lauf die drei
	// Lobby-Tabellen wieder bei 0 hinterlässt (Messhygiene), meldet sich A
	// hier ÜBER DEN ECHTEN WEG noch einmal an (frischer Kontext,
	// ?casinoToken=…) und verlässt regulär — dieselbe Handlung, die auch ein
	// zurückkehrender Spieler auslösen würde.
	try {
		const kontextAufraeumen = await browser.newContext({ ignoreHTTPSErrors: true });
		const seiteAufraeumen = await kontextAufraeumen.newPage();
		await seiteAufraeumen.goto(`${BASIS}/?casinoToken=${encodeURIComponent(A.token)}`, { waitUntil: 'domcontentloaded' });
		await seiteAufraeumen.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });
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

	console.log('\nAufräumen: keine Roulette-Lobby und keine Plätze/Einsätze bleiben stehen');
	try {
		const restLobby = mysql("SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='roulette';");
		const restSeat = mysql('SELECT COUNT(*) FROM tx_casinolobby_seat;');
		const restBet = mysql('SELECT COUNT(*) FROM tx_casinolobby_bet;');
		check(restLobby === '0' && restSeat === '0' && restBet === '0',
			`keine Roulette-Lobby und keine Plätze/Einsätze bleiben stehen (gefunden: lobby=${restLobby}, seat=${restSeat}, bet=${restBet})`,
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
