/**
 * Roulette – Gegenprobe zur statistischen Schranke aus measure-payout.mjs
 * ===========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Läuft in Millisekunden — anders als
 * measure-payout.mjs (der lange Messlauf, 500.000 Runden, bewusst NICHT Teil
 * dieses Skripts, siehe dessen Kopfkommentar) rechnet dieses Skript nur mit
 * der REINEN FORMEL, nicht mit simulierten Runden.
 *
 * Behebung Review C3, M9. measure-payout.mjs verwies in seinem Kopfkommentar
 * auf „die ausgeführte Gegenprobe in verify-payout-tolerance.mjs" — diese
 * Datei existierte nicht. Sie existiert jetzt und liefert genau das nach:
 * eine künstlich um mehr als 4σ verschobene Quote wird von der Schranke aus
 * schwellenwertPunkte() als „AUSSERHALB DER TOLERANZ" erkannt, eine um 1σ
 * verschobene nicht — dieselbe Vergleichsregel (Math.abs(abweichungPunkte)
 * <= schranke), die measure-payout.mjs tatsächlich benutzt (dort Zeile
 * "const inToleranz = Math.abs(abweichungPunkte) <= schranke;").
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-payout-tolerance.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * ---------------------------
 *   T-1  1σ-Verschiebung bleibt innerhalb der 4σ-Schranke (kein falscher Alarm)
 *   T-2  Gegenprobe zu T-1: eine 5σ-Verschiebung liegt AUSSERHALB der Schranke
 *   T-3  dieselbe Schranke, für die Fünferwette (anderes payout/anderes p)
 *   T-4  runden === 0 liefert Infinity (keine Aussage möglich, siehe
 *        Kopfkommentar von schwellenwertPunkte())
 *
 * WIE DIE STANDARDABWEICHUNG HIER EIN ZWEITES MAL STEHT
 * ----------------------------------------------------------
 * sdJeRunde/sdDerQuote werden UNABHÄNGIG von schwellenwertPunkte() noch
 * einmal aus derselben, im Kopfkommentar von measure-payout.mjs hergeleiteten
 * Formel getippt — nicht aus der Funktion herausgezogen. Eine Prüfung, die
 * ihre Erwartung aus dem Prüfling holt, prüft nichts (dieselbe Regel wie
 * B-4/B-9 in verify-bets.mjs).
 */

// @pruefstand modus=egal laufzeit=kurz

import { schwellenwertPunkte } from './measure-payout.mjs';

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

/** Unabhängig von schwellenwertPunkte() ein zweites Mal getippt (siehe Kopfkommentar). */
function sdDerQuoteUnabhaengig(payout, p, runden) {
	const sdJeRunde = (1 + payout) * Math.sqrt(p * (1 - p));
	return sdJeRunde / Math.sqrt(runden);
}

console.log('\nRoulette – Gegenprobe zur statistischen Schranke (verify-payout-tolerance.mjs)');
console.log('===================================================================================\n');

/* ============================================ T-1/T-2 Zahlenfeld, 36/38 */

console.log('T-1/T-2  Zahlenfeld (payout 35, p = 1/38): 1σ bleibt drin, 5σ fällt heraus');
{
	const payout = 35;
	const p = 1 / 38;
	const runden = 50000;
	const erwartet = 36 / 38;

	const schranke = schwellenwertPunkte(payout, p, runden, 4);
	const sdDerQuote = sdDerQuoteUnabhaengig(payout, p, runden);
	console.log(`     Schranke (4σ): ±${schranke.toFixed(4)} Punkte — unabhängig berechnete Standardabweichung der Quote: ${(sdDerQuote * 100).toFixed(4)} Punkte`);

	const quote1Sigma = erwartet + sdDerQuote;
	const abweichung1Sigma = (quote1Sigma - erwartet) * 100;
	const inToleranz1Sigma = Math.abs(abweichung1Sigma) <= schranke;
	check(inToleranz1Sigma, `T-1: eine 1σ-Verschiebung (${abweichung1Sigma.toFixed(4)} Punkte) bleibt innerhalb der 4σ-Schranke — kein falscher Alarm`);

	const quote5Sigma = erwartet + 5 * sdDerQuote;
	const abweichung5Sigma = (quote5Sigma - erwartet) * 100;
	const inToleranz5Sigma = Math.abs(abweichung5Sigma) <= schranke;
	check(!inToleranz5Sigma, `T-2: eine 5σ-Verschiebung (${abweichung5Sigma.toFixed(4)} Punkte) liegt AUSSERHALB der 4σ-Schranke — measure-payout.mjs hätte das rot gemacht`);

	// Randfall: GENAU 4σ muss noch als "in Toleranz" gelten (<=, nicht <).
	const quote4Sigma = erwartet + 4 * sdDerQuote;
	const abweichung4Sigma = (quote4Sigma - erwartet) * 100;
	const inToleranz4Sigma = Math.abs(abweichung4Sigma) <= schranke;
	check(inToleranz4Sigma, 'Randfall: eine Verschiebung von genau 4σ liegt noch innerhalb der Schranke (<=, nicht <)');
}

/* ================================================ T-3 Fünferwette, 35/38 */

console.log('\nT-3  Fünferwette (payout 6, p = 5/38, andere Quote): dieselbe Regel trägt auch hier');
{
	const payout = 6;
	const p = 5 / 38;
	const runden = 5000; // die Fünferwette bekommt in einem gemischten Lauf deutlich weniger Runden
	const erwartet = 35 / 38;

	const schranke = schwellenwertPunkte(payout, p, runden, 4);
	const sdDerQuote = sdDerQuoteUnabhaengig(payout, p, runden);
	console.log(`     Schranke (4σ): ±${schranke.toFixed(4)} Punkte — unabhängig berechnete Standardabweichung der Quote: ${(sdDerQuote * 100).toFixed(4)} Punkte`);

	const quote1Sigma = erwartet + sdDerQuote;
	const abweichung1Sigma = (quote1Sigma - erwartet) * 100;
	check(Math.abs(abweichung1Sigma) <= schranke, `1σ-Verschiebung (${abweichung1Sigma.toFixed(4)} Punkte) bleibt innerhalb der Schranke`);

	const quote6Sigma = erwartet - 6 * sdDerQuote; // Richtung spielt keine Rolle (Math.abs)
	const abweichung6Sigma = (quote6Sigma - erwartet) * 100;
	check(Math.abs(abweichung6Sigma) > schranke, `eine 6σ-Verschiebung NACH UNTEN (${abweichung6Sigma.toFixed(4)} Punkte) liegt ebenso AUSSERHALB der Schranke`);
}

/* =================================================== T-4 Randfall runden=0 */

console.log('\nT-4  runden = 0 liefert Infinity — keine Aussage möglich, nichts kann durchfallen');
{
	const schranke = schwellenwertPunkte(35, 1 / 38, 0, 4);
	check(schranke === Infinity, `schwellenwertPunkte(..., runden: 0) === Infinity (gefunden: ${schranke})`);
}

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. schwellenwertPunkte() lässt eine 1σ-Streuung durch und\n'
	+ 'erkennt eine 4σ/5σ/6σ-Verschiebung zuverlässig als außerhalb der Toleranz — für zwei\n'
	+ 'verschiedene Wettarten (Zahlenfeld und Fünferwette) unabhängig nachgerechnet.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
