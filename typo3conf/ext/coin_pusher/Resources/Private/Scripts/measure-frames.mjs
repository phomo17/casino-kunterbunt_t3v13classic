/**
 * Coin Pusher – Bildratenmessung
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Abnahmekriterium 3
 * dieser Phase, wörtlich:
 *
 *   „Ein volles Feld läuft im Browser flüssig (gemessene Bildrate
 *   dokumentiert, auch auf einer gedrosselten Maschine)"
 *
 * SONDERFALL UNTER DEN VIER SKRIPTEN DIESER PHASE: Die drei anderen laufen
 * in Node, ohne Browser. Eine Bildrate lässt sich nur in einem echten
 * Browser messen. Playwright steuert einen echten Browser fern; es ist im
 * Projekt bereits vorhanden (@playwright/test in der package.json der
 * Projektwurzel, Chromium im DDEV-Container, benutzt von den Audit-Läufen
 * unter Tests/Audit/). Dieses Skript installiert NICHTS nach – fehlt
 * Playwright oder Chromium, beendet es sich mit einer klaren Meldung und
 * Rückgabewert 2.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/measure-frames.mjs
 *
 * Rückgabewert: 0, wenn beide Durchgänge über den Schwellen liegen; 1, wenn
 * mindestens einer darunter liegt; 2, wenn Playwright oder Chromium fehlen.
 * Das Skript schreibt KEINE Datei – die gedruckten Zahlen werden von Hand in
 * die README übernommen.
 *
 *
 * WARUM EINE EIGENE, WEGWERFBARE ZEICHENFLÄCHE
 * ------------------------------------------------
 * Phase 8 hat kein Gehäuse – es gibt nichts zu sehen. Dieses Skript baut
 * sich deshalb im Browser eine nackte <canvas>-Zeichenfläche und malt die
 * Münzen als schlichte graue Kreise. Diese Zeichenfläche ist
 * Entwicklerwerkzeug und erreicht die Website nie: sie entsteht zur
 * Laufzeit im Browserspeicher, benutzt bewusst KEINE Design-Tokens, keine
 * Farbe aus tokens.css, keine Formgebung – sonst nähme sie Phase 9 die
 * Gestaltung vorweg. Gemessen wird damit die RECHENLAST DER PHYSIK, plus ein
 * sehr kleiner Zeichenanteil. Phase 9 misst die Bildrate am fertigen Gerät
 * erneut; entscheidet Phase 9 sich gegen <canvas>, ist auch das kein
 * Ersatz, sondern eine neue Messung.
 */

import { chromium } from '@playwright/test';

const BASE_URL = 'https://casino-kunterbunt.ddev.site/';
const FIELD_JS_URL = '/typo3conf/ext/coin_pusher/Resources/Public/JavaScript/field.js';
const RNG_JS_URL = '/typo3conf/ext/coin_pusher/Resources/Public/JavaScript/rng.js';

const FRAMES_MEASURED = 900;
const THROTTLE_RATE = 4;
const FRAME_BUDGET_MS = 1000 / 60;   // 16,7 ms
const THRESHOLD_UNTHROTTLED = 55;    // Bilder/s im Mittel
const THRESHOLD_THROTTLED = 25;      // Bilder/s im Mittel, vierfach gedrosselt

/**
 * Prüft, ob Playwright einen Chromium-Browser tatsächlich starten kann,
 * OHNE etwas nachzuinstallieren.
 *
 * @returns {Promise<import('@playwright/test').Browser|null>}
 */
async function tryLaunch() {
	try {
		return await chromium.launch();
	} catch {
		return null;
	}
}

/**
 * Läuft IM BROWSER (als Argument von page.evaluate()). Lädt field.js und
 * rng.js über ihre Dateiadresse – dieselben Dateien, mit denen das Spiel
 * später läuft –, baut eine nackte Zeichenfläche, füllt ein Feld bis
 * needsRelief() greift, misst framesWanted Bilder über
 * requestAnimationFrame und gibt die Zeitreihe zurück.
 *
 * @param {{fieldUrl: string, rngUrl: string, framesWanted: number}} args
 * @returns {Promise<{
 *   frameDurationsMs: number[], physicsDurationsMs: number[],
 *   coinsInField: number, throwsToFill: number,
 * }>}
 */
async function measureInBrowser({ fieldUrl, rngUrl, framesWanted }) {
	const { createField, COIN_VALUES, SUBSTEPS } = await import(fieldUrl);
	const { drawUint32 } = await import(rngUrl);

	const field = createField({ random: drawUint32 });

	let throwsToFill = 0;
	while (!field.needsRelief() && throwsToFill < 20000) {
		field.throwCoin(COIN_VALUES[throwsToFill % COIN_VALUES.length]);
		for (let s = 0; s < 48; s++) { field.step(); }
		throwsToFill++;
	}

	const canvas = document.createElement('canvas');
	canvas.width = 400;
	canvas.height = 480;
	canvas.style.position = 'fixed';
	canvas.style.left = '-9999px';   // Entwicklerwerkzeug, nie sichtbar
	document.body.appendChild(canvas);
	const ctx = canvas.getContext('2d');

	function draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = '#888';
		for (let i = 0; i < field.count; i++) {
			ctx.beginPath();
			ctx.arc(field.x[i] * 3, field.y[i] * 3, field.r[i] * 3, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	const frameDurationsMs = [];
	const physicsDurationsMs = [];

	await new Promise((resolveFrames) => {
		let lastTimestamp = null;
		let framesDone = 0;

		function onFrame(timestamp) {
			if (lastTimestamp !== null) {
				frameDurationsMs.push(timestamp - lastTimestamp);
			}
			lastTimestamp = timestamp;

			const physicsStart = performance.now();
			for (let s = 0; s < SUBSTEPS; s++) { field.step(); }
			physicsDurationsMs.push(performance.now() - physicsStart);

			draw();

			framesDone++;
			if (framesDone >= framesWanted) {
				document.body.removeChild(canvas);
				resolveFrames();
				return;
			}
			requestAnimationFrame(onFrame);
		}
		requestAnimationFrame(onFrame);
	});

	return { frameDurationsMs, physicsDurationsMs, coinsInField: field.count, throwsToFill };
}

/**
 * @param {number[]} durationsMs
 * @returns {{meanFps: number, p5Fps: number, worstMs: number, shareUnderBudget: number}}
 */
function summarise(durationsMs) {
	const sorted = [...durationsMs].sort((a, b) => a - b);
	const meanMs = durationsMs.reduce((sum, v) => sum + v, 0) / durationsMs.length;
	// „schlechtestes Zwanzigstel": die 5 % LÄNGSTEN Bilder, also das
	// 95.-Perzentil der Dauer – als Bildrate ausgedrückt ist das der
	// NIEDRIGSTE Wert dieses Zwanzigstels.
	const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
	const p95Ms = sorted[p95Index];
	const worstMs = sorted[sorted.length - 1];
	const underBudget = durationsMs.filter((ms) => ms <= FRAME_BUDGET_MS).length;

	return {
		meanFps: 1000 / meanMs,
		p5Fps: 1000 / p95Ms,
		worstMs,
		shareUnderBudget: underBudget / durationsMs.length,
	};
}

/**
 * @param {string} label
 * @param {{meanFps: number, p5Fps: number, worstMs: number, shareUnderBudget: number}} summary
 * @param {number} physicsMeanMs
 * @param {number} threshold
 * @returns {boolean} true, wenn die mittlere Bildrate den Schwellenwert erreicht
 */
function report(label, summary, physicsMeanMs, threshold) {
	console.log(`\n${label}`);
	console.log(`  Bildrate im Mittel        ${summary.meanFps.toFixed(1)} Bilder/s`);
	console.log(`  schlechtestes Zwanzigstel ${summary.p5Fps.toFixed(1)} Bilder/s`);
	console.log(`  langsamstes Bild          ${summary.worstMs.toFixed(2)} ms`);
	console.log(`  Bilder unter 16,7 ms       ${(summary.shareUnderBudget * 100).toFixed(1)} %`);
	console.log(`  reine Physikzeit je Bild  ${physicsMeanMs.toFixed(2)} ms`);
	const ok = summary.meanFps >= threshold;
	console.log(`  Schwelle ${threshold} Bilder/s im Mittel: ${ok ? 'OK' : 'FEHLER'}`);
	return ok;
}

const browser = await tryLaunch();
if (browser === null) {
	console.log('Playwright kann keinen Chromium-Browser starten (Browser-Binärdateien fehlen vermutlich unter '
		+ '~/.cache/ms-playwright). Dieses Skript installiert nichts nach – bitte im DDEV-Container '
		+ '`npx playwright install` ausführen und danach erneut aufrufen.');
	process.exit(2);
}

try {
	const context = await browser.newContext({ ignoreHTTPSErrors: true });
	const page = await context.newPage();

	// Nur lesend: irgendeine Seite der Instanz öffnen, damit die anschließend
	// nachgeladenen Module dieselbe Herkunft (Origin) haben. Nichts wird
	// angeklickt, nichts verändert.
	await page.goto(BASE_URL);

	console.log(`Fülle das Feld und messe ${FRAMES_MEASURED} Bilder, ungedrosselt …`);
	const unthrottled = await page.evaluate(measureInBrowser,
		{ fieldUrl: FIELD_JS_URL, rngUrl: RNG_JS_URL, framesWanted: FRAMES_MEASURED });
	console.log(`Feld gefüllt: ${unthrottled.coinsInField} Münzen nach ${unthrottled.throwsToFill} Einwürfen.`);

	const summaryUnthrottled = summarise(unthrottled.frameDurationsMs);
	const physicsMeanUnthrottled = unthrottled.physicsDurationsMs
		.reduce((sum, v) => sum + v, 0) / unthrottled.physicsDurationsMs.length;
	const okUnthrottled = report('Ungedrosselt', summaryUnthrottled, physicsMeanUnthrottled, THRESHOLD_UNTHROTTLED);

	console.log(`\nSetze CPU-Drosselung auf das ${THROTTLE_RATE}-fache (Emulation.setCPUThrottlingRate) …`);
	const cdp = await context.newCDPSession(page);
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE_RATE });

	console.log(`Fülle ein zweites Feld und messe ${FRAMES_MEASURED} Bilder, vierfach gedrosselt …`);
	const throttled = await page.evaluate(measureInBrowser,
		{ fieldUrl: FIELD_JS_URL, rngUrl: RNG_JS_URL, framesWanted: FRAMES_MEASURED });
	console.log(`Feld gefüllt: ${throttled.coinsInField} Münzen nach ${throttled.throwsToFill} Einwürfen.`);

	const summaryThrottled = summarise(throttled.frameDurationsMs);
	const physicsMeanThrottled = throttled.physicsDurationsMs
		.reduce((sum, v) => sum + v, 0) / throttled.physicsDurationsMs.length;
	const okThrottled = report(`Vierfach gedrosselt`, summaryThrottled, physicsMeanThrottled, THRESHOLD_THROTTLED);

	console.log('\n' + '='.repeat(72));
	console.log('README-BLOCK (Abschnitt „Bildrate")');
	console.log('='.repeat(72));
	console.log(`Volles Feld (${unthrottled.coinsInField} Münzen), ${FRAMES_MEASURED} Bilder, Chromium im `
		+ 'DDEV-Container:');
	console.log(`ungedrosselt ${summaryUnthrottled.meanFps.toFixed(1)} Bilder/s im Mittel `
		+ `(${summaryUnthrottled.p5Fps.toFixed(1)} im schlechtesten Zwanzigstel),`);
	console.log(`bei vierfacher Drosselung ${summaryThrottled.meanFps.toFixed(1)} / `
		+ `${summaryThrottled.p5Fps.toFixed(1)}.`);
	console.log('='.repeat(72));

	await browser.close();

	const failed = !okUnthrottled || !okThrottled;
	console.log(failed
		? '\nERGEBNIS: mindestens ein Durchgang liegt unter der Schwelle.'
		: '\nERGEBNIS: beide Durchgänge liegen über der Schwelle.');
	process.exit(failed ? 1 : 0);
} catch (error) {
	await browser.close();
	console.log(`Abgebrochen wegen eines unerwarteten Fehlers: ${error.message}`);
	process.exit(1);
}
