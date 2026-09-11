/**
 * Casino Kunterbunt – casino_lobby: Live-Probe Brücke und Platzleiste (Umsetzungsstück D5-2)
 * ==============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Playwright gegen die
 * laufende DDEV-Instanz — dieselbe Bauart wie die Live-Blöcke in
 * verify-lobby-round.mjs und dbg-schalter.mjs (Anmeldung über
 * /?casinoToken=…, genau der Weg, den ein QR-Code auslöst).
 *
 * NUR EIN ECHTER SPIELENDER (_d2check_), UND WARUM: ein zweiter Browser
 * bräuchte einen ZWEITEN, von diesem Lauf sicher unterscheidbaren Spielenden.
 * In dieser Installation existieren dafür nur zwei Kandidaten — _d2check_
 * (benutzt) und TestSpieli (uid 6, AUSDRÜCKLICH NICHT ANZUFASSEN, siehe
 * Auftrag: trägt 2004 im Gerätekredit aus einer Messung). Einen neuen
 * Testspielenden anzulegen ist eine Datensatzänderung außerhalb dieses
 * Prüfwerkzeugs. DESHALB PRÜFT DIESER LAUF DIE BRÜCKE MIT EINEM EINZIGEN
 * SPIELENDEN, AN SEINEM EIGENEN PLATZ — das reicht aus, um jeden Schritt der
 * Kette casino:lobby-handlung -> senden() -> POST -> LobbyService ->
 * casino:lobby-stand -> seatsSchreiben() -> DOM zu beobachten, beweist aber
 * NICHT, dass eine zweite Person denselben Einsatz an IHREM Bildschirm sieht.
 * Diese Lücke steht offen im Bericht des Umsetzungslaufs (siehe auch Plan,
 * Live-Proben P-1/P-3 in D5-3: die erste Stelle, an der der Plan wirklich
 * zwei Sitzungen braucht, und wo verify-lobby-live.mjs zweiTestKennungen()
 * dafür TestSpieli mitbenutzt — dort schon vor diesem Lauf so angelegt, hier
 * ausdrücklich NICHT nachgemacht).
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------------------------------------------------------------
 *   L-1  casino:lobby-stand feuert in einem echten Browser, mit den
 *        erwarteten Schlüsseln (r,z,rest,n,runde,m,saat,erg,ergR,t,mv,w,p)
 *   L-2  ohne jede Handlung zeigt der eigene Platz bereits "hat die Würfel"
 *        (Craps: shooterNummer() greift auf den kleinsten besetzten Platz
 *        zurück, wenn niemand in der Warteliste steht — Plan 9)
 *   L-3  ein Klick auf "Würfel übernehmen" meldet sich über
 *        casino:lobby-handlung/shooter an; der Knopftext wechselt auf
 *        "Warteliste verlassen", OHNE dass diese Datei fetch() selbst ruft
 *   L-4  ein Klick auf "Warteliste verlassen" meldet sich wieder ab; der
 *        Knopftext kehrt zu "Würfel übernehmen" zurück
 *   L-5  ein über casino:lobby-handlung/einsatz gemeldeter Einsatz erscheint
 *        am EIGENEN Platz als "10 €" (data-cl-seat-stake), NACHDEM (nicht
 *        WÄHREND) der nächsten Abfrage — das ist die Kette, die in D4 nie
 *        auslöste (Befund 1 aus Plan Abschnitt 1)
 *   L-6  eine über casino:lobby-handlung/bilanz gemeldete Bilanz erscheint
 *        als "−10 €" mit data-cl-tone="loss" am eigenen Platz
 *   L-7  Aufräumen: der Platz wird verlassen; tx_casinolobby_lobby und
 *        tx_casinolobby_seat/_bet tragen danach keine Zeile mehr für diese
 *        Lobby (dieselbe Zusage wie V-17 in verify-lobby-live.mjs)
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/probe-lobby-strip.mjs
 *
 * Braucht QR-Modus AN (Tests/Acceptance/dbg-schalter.mjs an) — meldet das
 * selbst und bricht sonst kontrolliert ab, statt gegen die Torseite zu
 * laufen.
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

console.log('\ncasino_lobby – Live-Probe Brücke und Platzleiste (Umsetzungsstück D5-2)');
console.log('==========================================================================\n');

let qrModeAn = false;
try {
	const registryAusgabe = execFileSync('mysql', ['-e',
		"SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
	{ encoding: 'utf8' });
	qrModeAn = (registryAusgabe.split('\n')[1] ?? '').trim() === 'b:1;';
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
if (!qrModeAn) {
	console.log('ERGEBNIS: übersprungen — der QR-Modus steht auf AUS. Zum Prüfen: ddev exec node Tests/Acceptance/dbg-schalter.mjs an');
	process.exit(0);
}

let kennung;
try {
	const ausgabe = execFileSync('mysql', ['-e',
		"SELECT uid, token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND name='_d2check_' LIMIT 1;"],
	{ encoding: 'utf8' });
	const zeile = (ausgabe.split('\n')[1] ?? '').trim();
	const [uid, token] = zeile.split('\t');
	kennung = { uid, token };
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Suche nach der Testkennung _d2check_ schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
if (!kennung?.token) {
	console.log('\nERGEBNIS: Abbruch — Testkennung "_d2check_" nicht gefunden. TestSpieli (uid 6) wird hier ABSICHTLICH NICHT benutzt (Auftrag: nicht anfassen).');
	process.exit(1);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

let state = null;
try {
	// Jedes casino:lobby-stand-Ereignis mitschreiben — dieselbe Lehre wie in
	// verify-lobby-round.mjs (S-19): auf document hören, nicht auf window,
	// und ohne bubbles.
	await page.addInitScript(() => {
		window.__standEreignisse = [];
		document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
	});

	await page.goto(`${BASIS}/?casinoToken=${encodeURIComponent(kennung.token)}`, { waitUntil: 'domcontentloaded' });
	await page.goto(`${BASIS}/craps`, { waitUntil: 'domcontentloaded' });

	const stateAttr = await page.locator('[data-cl-state]').first().textContent().catch(() => null);
	state = stateAttr ? JSON.parse(stateAttr) : null;
	check(state !== null && state.platz === 1, `_d2check_ eröffnet /craps und bekommt platz:1 (gefunden: ${JSON.stringify(state)})`);
	if (state === null) {
		throw new Error('kein Zustandsblock — Abbruch, die weiteren Schritte bräuchten ihn alle');
	}

	/* ==================================================== L-1 casino:lobby-stand feuert, mit den erwarteten Schlüsseln */

	// undefined als zweites Argument ist Pflicht: waitForFunction(fn, options)
	// mit einer parameterlosen fn interpretiert Playwright das zweite
	// Argument als "arg" (an die Seitenfunktion durchgereicht), NICHT als
	// "options" — jeder hier betroffene Aufruf lief bislang STETS mit
	// Playwrights Standardwert 30000 ms, gleich welcher timeout dastand
	// (Fund aus D5-3, roulette/probe-lobby-roulette.mjs, nachgezogen).
	await page.waitForFunction(() => window.__standEreignisse.length > 0, undefined, { timeout: 5000 }).catch(() => {});
	let erstesStand = await page.evaluate(() => window.__standEreignisse[0] ?? null);
	console.log('L-1  casino:lobby-stand feuert in einem echten Browser, mit den erwarteten Schlüsseln');
	const ERWARTETE_SCHLUESSEL = ['r', 'z', 'rest', 'n', 'runde', 'm', 'saat', 'erg', 'ergR', 't', 'mv', 'w', 'p'];
	const fehlendeSchluessel = erstesStand === null ? ERWARTETE_SCHLUESSEL : ERWARTETE_SCHLUESSEL.filter((k) => !(k in erstesStand));
	check(erstesStand !== null && fehlendeSchluessel.length === 0,
		`casino:lobby-stand.detail trägt alle erwarteten Schlüssel (gefunden: ${JSON.stringify(erstesStand)})`,
		`fehlend: ${fehlendeSchluessel.join(', ')}`);

	/* ==================================================== L-2 ohne Handlung: eigener Platz zeigt "hat die Würfel" */

	console.log('\nL-2  ohne jede Handlung zeigt der eigene Platz bereits "hat die Würfel" (Plan 9: Rückgriff auf den kleinsten besetzten Platz)');
	const eigenerSitz = page.locator('[data-cl-seat="1"][data-cl-seat-mine]');
	await page.waitForFunction(() => {
		const li = document.querySelector('[data-cl-seat="1"][data-cl-seat-mine]');
		return li !== null && li.hasAttribute('data-cl-shooter');
	}, undefined, { timeout: 5000 }).catch(() => {});
	const hatShooterAttribut = await eigenerSitz.evaluate((el) => el.hasAttribute('data-cl-shooter')).catch(() => false);
	check(hatShooterAttribut, 'data-cl-shooter steht am eigenen <li> (der einzige besetzte Platz hält die Würfel, ohne sich einzutragen)');
	const markText1 = await page.locator('[data-cl-seat="1"] .cl-seat__mark').textContent().catch(() => '');
	check((markText1 ?? '').trim() !== '', `die Zugmarke zeigt einen Text (gefunden: "${markText1}")`);

	/* ==================================================== L-3/L-4 der Würfelknopf, ohne eigenes fetch() im Tisch */

	console.log('\nL-3  ein Klick auf "Würfel übernehmen" meldet sich über casino:lobby-handlung an; der Knopftext wechselt');
	const knopf = page.locator('button[data-cl-shooter]');
	const textVorher = (await knopf.textContent().catch(() => '')) ?? '';
	await knopf.click();
	await page.waitForFunction((vorher) => {
		const b = document.querySelector('button[data-cl-shooter]');
		return b !== null && b.textContent !== vorher;
	}, textVorher, { timeout: 5000 }).catch(() => {});
	const textNachEintragen = (await knopf.textContent().catch(() => '')) ?? '';
	check(textNachEintragen !== '' && textNachEintragen !== textVorher,
		`der Knopftext hat sich geändert (vorher: "${textVorher}", nachher: "${textNachEintragen}")`);

	console.log('\nL-4  ein Klick auf "Warteliste verlassen" meldet sich wieder ab; der Knopftext kehrt zurück');
	await knopf.click();
	await page.waitForFunction((vorher) => {
		const b = document.querySelector('button[data-cl-shooter]');
		return b !== null && b.textContent === vorher;
	}, textVorher, { timeout: 5000 }).catch(() => {});
	const textNachAustragen = (await knopf.textContent().catch(() => '')) ?? '';
	check(textNachAustragen === textVorher, `der Knopftext ist wieder der ursprüngliche (gefunden: "${textNachAustragen}")`);

	/* ==================================================== L-5 ein gemeldeter Einsatz erscheint am eigenen Platz */

	console.log('\nL-5  ein über casino:lobby-handlung/einsatz gemeldeter Einsatz erscheint am eigenen Platz als "10 €"');
	const laufendeRunde = erstesStand?.runde ?? 0;
	await page.evaluate((runde) => {
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'einsatz', daten: { runde, felder: [{ f: 'pass', b: 10 }] } },
		}));
	}, laufendeRunde);
	await page.waitForFunction(() => {
		const span = document.querySelector('[data-cl-seat="1"] [data-cl-seat-stake]');
		return span !== null && /10/.test(span.textContent ?? '');
	}, undefined, { timeout: 5000 }).catch(() => {});
	const einsatzText = await page.locator('[data-cl-seat="1"] [data-cl-seat-stake]').textContent().catch(() => '');
	check(/10/.test(einsatzText ?? ''), `data-cl-seat-stake zeigt den gemeldeten Einsatz (gefunden: "${einsatzText}")`);

	/* ==================================================== L-6 eine gemeldete Bilanz erscheint als Verlust */

	console.log('\nL-6  eine über casino:lobby-handlung/bilanz gemeldete Bilanz erscheint als "−10 €" mit data-cl-tone="loss"');
	await page.evaluate((runde) => {
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'bilanz', daten: { runde, aus: { pass: -10 } } },
		}));
	}, laufendeRunde);
	await page.waitForFunction(() => {
		const span = document.querySelector('[data-cl-seat="1"] [data-cl-seat-outcome]');
		return span !== null && span.getAttribute('data-cl-tone') === 'loss';
	}, undefined, { timeout: 5000 }).catch(() => {});
	const outcomeSpan = page.locator('[data-cl-seat="1"] [data-cl-seat-outcome]');
	const outcomeText = await outcomeSpan.textContent().catch(() => '');
	const outcomeTone = await outcomeSpan.getAttribute('data-cl-tone').catch(() => null);
	check(outcomeTone === 'loss' && /10/.test(outcomeText ?? ''),
		`data-cl-seat-outcome zeigt den Verlust (gefunden: Text "${outcomeText}", data-cl-tone "${outcomeTone}")`);
} finally {
	/* ==================================------------- L-7 Aufräumen ------------------------------------------ */
	console.log('\nL-7  Aufräumen: der Platz wird verlassen, keine Zeile bleibt stehen');
	try {
		const stateAttr2 = await page.locator('[data-cl-state]').first().textContent().catch(() => null);
		const state2 = stateAttr2 ? JSON.parse(stateAttr2) : null;
		if (state2?.endpunkte?.handlung) {
			await page.evaluate(async ({ handlung }) => {
				await fetch(handlung, {
					method: 'POST', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ art: 'verlassen' }),
				});
			}, { handlung: state2.endpunkte.handlung });
		}
	} catch { /* best effort */ }
	await browser.close();

	try {
		const restLobby = execFileSync('mysql', ['-e', "SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='craps';"], { encoding: 'utf8' })
			.split('\n')[1]?.trim();
		const restSeat = execFileSync('mysql', ['-e', 'SELECT COUNT(*) FROM tx_casinolobby_seat;'], { encoding: 'utf8' })
			.split('\n')[1]?.trim();
		const restBet = execFileSync('mysql', ['-e', 'SELECT COUNT(*) FROM tx_casinolobby_bet;'], { encoding: 'utf8' })
			.split('\n')[1]?.trim();
		check(restLobby === '0' && restSeat === '0' && restBet === '0',
			`keine Craps-Lobby und keine Plätze/Einsätze bleiben stehen (gefunden: lobby=${restLobby}, seat=${restSeat}, bet=${restBet})`,
			'HINWEIS: bitte manuell prüfen und ggf. über POST /casino-lobby/handlung {"art":"verlassen"} aufräumen.');
	} catch (fehlerObjekt) {
		check(false, `Aufräum-Kontrolle schlug fehl: ${fehlerObjekt.message}`);
	}
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
