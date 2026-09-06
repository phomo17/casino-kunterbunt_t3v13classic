/**
 * Blackjack – Statistik für die Nachweisläufe
 * =============================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Liefert den
 * Chi-Quadrat-Anpassungstest samt p-Wert und die empirische Streuung des
 * Mittelwerts — die beiden Rechnungen, mit denen measure-shuffle.mjs
 * (Umsetzungsstück C4c) und measure-payout.mjs (Umsetzungsstück C4e) ihre
 * jeweilige Zusage aus CONCEPT.md C.5.4 / Anhang G prüfen.
 *
 * WARUM DIESE DATEI NICHT AUS DEM ROULETTE ÜBERNOMMEN WIRD
 * ------------------------------------------------------------
 * Zwei Gründe. Erstens die Projektregel: keine Extension greift zur Laufzeit
 * auf eine Datei einer anderen zu — was übernommen wird, wird KOPIERT, mit
 * neu geschriebenem Kopfkommentar (Auftrag dieser Phase). Zweitens, und
 * wichtiger: eine Statistik, die selbst nicht geprüft ist, ist eine Annahme.
 * Ein übernommener p-Wert-Rechner wäre genau das. Deshalb hat diese Datei
 * einen eigenen Selbsttest, der unten beschrieben ist.
 *
 * DER SELBSTTEST — UNABHÄNGIGE ERWARTUNG, NICHT AUS DIESER DATEI
 * --------------------------------------------------------------------
 * Wird diese Datei UNMITTELBAR gestartet (nicht importiert), prüft sie sich
 * gegen kritische Werte einer gebräuchlichen Chi-Quadrat-Tabelle (z. B.
 * Wikipedia „Chi-Quadrat-Verteilung", Abschnitt „Kritische Werte"), von Hand
 * abgeschrieben — nicht aus gammaQ()/chiSquareUniform() hergeleitet. Diese
 * Werte sind unabhängig von jeder Zeile Code in dieser Datei: sie stammen aus
 * einer veröffentlichten mathematischen Tabelle, Jahrzehnte älter als dieses
 * Projekt. Bricht der Selbsttest ab, brechen measure-shuffle.mjs und
 * measure-payout.mjs beim Start ebenfalls ab — ein Messlauf mit falscher
 * Statistik soll gar nicht erst laufen (CONCEPT.md C.5.4).
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/stats.mjs
 *
 * Rückgabewert 0, wenn der Selbsttest besteht; 1 sonst.
 */

import { fileURLToPath } from 'node:url';

/* =====================================================================
 * Chi-Quadrat-Anpassungstest gegen die Gleichverteilung, ohne fremde
 * Bibliothek. Math.exp und Math.log sind HIER ausdrücklich erlaubt: dies
 * ist ein Auswertungswerkzeug, keine Spiellogik. Sein Ergebnis fließt nie
 * in eine Simulation zurück — es liest nur, nach dem Lauf, was geschah.
 * ===================================================================== */

/** Log-Gamma-Funktion nach der Lanczos-Näherung („Numerical Recipes"). */
function logGamma(x) {
	const KOEFFIZIENTEN = [
		76.18009172947146, -86.50532032941677, 24.01409824083091,
		-1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
	];
	let y = x;
	let tmp = x + 5.5;
	tmp -= (x + 0.5) * Math.log(tmp);
	let ser = 1.000000000190015;
	for (let j = 0; j < 6; j++) {
		y += 1;
		ser += KOEFFIZIENTEN[j] / y;
	}
	return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Untere unvollständige Gammafunktion als Reihe, für x < a + 1. */
function gammaReiheP(a, x) {
	const ITMAX = 200;
	const EPS = 3e-16;
	const gln = logGamma(a);
	if (x <= 0) {
		return { wert: 0, gln };
	}
	let ap = a;
	let summe = 1 / a;
	let delta = summe;
	for (let n = 1; n <= ITMAX; n++) {
		ap += 1;
		delta *= x / ap;
		summe += delta;
		if (Math.abs(delta) < Math.abs(summe) * EPS) {
			break;
		}
	}
	return { wert: summe * Math.exp(-x + a * Math.log(x) - gln), gln };
}

/** Obere unvollständige Gammafunktion als Kettenbruch nach Lentz, für x ≥ a + 1. */
function gammaKettenbruchQ(a, x) {
	const ITMAX = 200;
	const EPS = 3e-16;
	const FPMIN = 1e-300;
	const gln = logGamma(a);
	let b = x + 1 - a;
	let c = 1 / FPMIN;
	let d = 1 / b;
	let h = d;
	for (let i = 1; i <= ITMAX; i++) {
		const an = -i * (i - a);
		b += 2;
		d = an * d + b;
		if (Math.abs(d) < FPMIN) {
			d = FPMIN;
		}
		c = b + an / c;
		if (Math.abs(c) < FPMIN) {
			c = FPMIN;
		}
		d = 1 / d;
		const delta = d * c;
		h *= delta;
		if (Math.abs(delta - 1) < EPS) {
			break;
		}
	}
	return { wert: Math.exp(-x + a * Math.log(x) - gln) * h, gln };
}

/**
 * Obere Schwanzwahrscheinlichkeit der Chi-Quadrat-Verteilung, also der
 * p-Wert: Q(a, x) mit a = Freiheitsgrade / 2, x = Chi-Quadrat / 2.
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
export function gammaQ(a, x) {
	if (x < 0 || a <= 0) {
		throw new RangeError('gammaQ: a > 0 und x ≥ 0 verlangt');
	}
	if (x === 0) {
		return 1;
	}
	if (x < a + 1) {
		return 1 - gammaReiheP(a, x).wert;
	}
	return gammaKettenbruchQ(a, x).wert;
}

/**
 * Chi-Quadrat-Anpassungstest gegen die Gleichverteilung.
 *
 * Liefert zusätzlich maxDeviation: die größte Abweichung eines einzelnen
 * Fachs vom Erwartungswert, absolut und in Vielfachen der Standardabweichung
 * einer Fachbesetzung unter der Nullhypothese (Näherung über die
 * Poisson-Streuung √Erwartung — für die hier verlangte Berichtsangabe „wie
 * viele Sigma weicht das schlechteste Fach ab" reicht diese Näherung; sie
 * geht in keine Entscheidung dieses Tests ein, sondern nur in den Bericht).
 * CONCEPT.md C.5.4 verlangt diese Angabe ausdrücklich.
 *
 * @param {number[]} counts Trefferzahl je Fach
 * @returns {{chi2: number, df: number, p: number,
 *            maxDeviation: {index: number, absolute: number, sigmas: number}}}
 */
export function chiSquareUniform(counts) {
	const n = counts.length;
	const summe = counts.reduce((s, c) => s + c, 0);
	const erwartung = summe / n;
	let chi2 = 0;
	let maxAbs = 0;
	let maxIndex = 0;
	counts.forEach((c, i) => {
		const diff = c - erwartung;
		chi2 += (diff * diff) / erwartung;
		if (Math.abs(diff) > Math.abs(maxAbs)) {
			maxAbs = diff;
			maxIndex = i;
		}
	});
	const df = n - 1;
	const p = gammaQ(df / 2, chi2 / 2);
	const sigma = Math.sqrt(erwartung);
	return {
		chi2,
		df,
		p,
		maxDeviation: {
			index: maxIndex,
			absolute: maxAbs,
			sigmas: sigma > 0 ? maxAbs / sigma : 0,
		},
	};
}

/**
 * Die empirische Streuung des MITTELWERTS einer Stichprobe (Standardfehler),
 * NICHT die Streuung der Einzelwerte: Standardabweichung der Stichprobe
 * geteilt durch die Wurzel des Stichprobenumfangs. Wird von
 * measure-payout.mjs (Umsetzungsstück C4e) benutzt, um die Toleranz an der
 * TATSÄCHLICHEN Stichprobengröße zu messen statt an einer festen Prozentzahl
 * (Plan Abschnitt 4, Festlegung 5 — genau die Fehlerklasse, die beim
 * Roulette bereits einen Falschbefund verursacht hat).
 *
 * @param {number[]} values
 * @returns {number} der Standardfehler des Mittelwerts; 0 bei weniger als 2 Werten
 */
export function stdDevOfMean(values) {
	const n = values.length;
	if (n < 2) {
		return 0;
	}
	const mittelwert = values.reduce((s, v) => s + v, 0) / n;
	const summeQuadrate = values.reduce((s, v) => s + (v - mittelwert) * (v - mittelwert), 0);
	const stichprobenStreuung = Math.sqrt(summeQuadrate / (n - 1));
	return stichprobenStreuung / Math.sqrt(n);
}

/* ============================================================ Selbsttest */

/**
 * Führt den Selbsttest aus und gibt true zurück, wenn er besteht. Wird von
 * measure-shuffle.mjs und measure-payout.mjs (jeweils per Import) vor dem
 * eigentlichen Lauf aufgerufen — ein Messlauf mit falscher Statistik soll
 * gar nicht erst starten.
 *
 * @param {(ok: boolean, text: string, ...zeilen: string[]) => void} [melder]
 *   optionaler Ausgabe-Callback; ohne Angabe wird console.log benutzt
 * @returns {boolean}
 */
export function selbsttest(melder) {
	let fehler = 0;
	const check = melder ?? ((ok, text, ...zeilen) => {
		console.log(`  ${ok ? '✓' : '✗'} ${text}`);
		if (!ok) {
			for (const zeile of zeilen) {
				console.log(`      ${zeile}`);
			}
		}
	});
	function pruefe(ok, text, ...zeilen) {
		if (!ok) {
			fehler++;
		}
		check(ok, text, ...zeilen);
	}

	/*
	 * Von Hand abgeschriebene kritische Werte einer gebräuchlichen
	 * Chi-Quadrat-Tabelle (Freiheitsgrade, kritischer Chi-Quadrat-Wert,
	 * zugehöriger p-Wert). Per Definition des kritischen Werts gilt an jeder
	 * dieser Stützstellen gammaQ(df/2, chi2/2) = p — das ist eine
	 * unabhängige, veröffentlichte mathematische Tatsache, keine aus dieser
	 * Datei hergeleitete Zahl.
	 */
	const REFERENZTABELLE = [
		{ df: 1, chi2: 3.841, p: 0.050 },
		{ df: 1, chi2: 6.635, p: 0.010 },
		{ df: 5, chi2: 11.070, p: 0.050 },
		{ df: 5, chi2: 15.086, p: 0.010 },
		{ df: 10, chi2: 18.307, p: 0.050 },
		{ df: 10, chi2: 23.209, p: 0.010 },
		{ df: 20, chi2: 31.410, p: 0.050 },
		{ df: 20, chi2: 37.566, p: 0.010 },
	];
	const TOLERANZ = 0.0015;
	for (const { df, chi2, p } of REFERENZTABELLE) {
		const berechnet = gammaQ(df / 2, chi2 / 2);
		pruefe(Math.abs(berechnet - p) < TOLERANZ,
			`gammaQ(df=${df}, chi2=${chi2}) ≈ ${p} (berechnet: ${berechnet.toFixed(4)})`);
	}

	pruefe(gammaQ(5, 0) === 1, 'gammaQ(a, 0) === 1 (Randfall, per Definition)');
	const sehrGross = gammaQ(5, 500);
	pruefe(sehrGross < 1e-10, `gammaQ(a, sehr groß) ≈ 0 (berechnet: ${sehrGross})`);

	// Chi-Quadrat: eine exakt gleichverteilte Stichprobe ergibt chi2 = 0, p = 1.
	const gleich = chiSquareUniform([100, 100, 100, 100]);
	pruefe(gleich.chi2 === 0 && gleich.p === 1 && gleich.maxDeviation.absolute === 0,
		'chiSquareUniform bei exakter Gleichverteilung: chi2 = 0, p = 1, keine Abweichung',
		`gefunden: chi2=${gleich.chi2}, p=${gleich.p}`);

	// Von Hand nachgerechnetes Beispiel: vier Fächer, Erwartung 100, Zählungen
	// 90/95/105/110. chi2 = (100+25+25+100)/100 = 2,5; df = 3. Größte
	// Abweichung (Betrag 10) tritt zweimal auf (Fach 0: −10, Fach 3: +10);
	// bei einem Gleichstand behält chiSquareUniform() den ZUERST gefundenen.
	const beispiel = chiSquareUniform([90, 95, 105, 110]);
	pruefe(Math.abs(beispiel.chi2 - 2.5) < 1e-9,
		`chiSquareUniform am Handbeispiel: chi2 = 2,5 (berechnet: ${beispiel.chi2})`);
	pruefe(beispiel.maxDeviation.index === 0 && beispiel.maxDeviation.absolute === -10,
		'chiSquareUniform am Handbeispiel: größte Abweichung im ersten Fach, Betrag −10',
		`gefunden: index=${beispiel.maxDeviation.index}, absolute=${beispiel.maxDeviation.absolute}`);

	// stdDevOfMean am Handbeispiel [1,2,3,4,5]: Mittelwert 3, Varianz
	// (4+1+0+1+4)/4 = 2,5, Streuung √2,5 ≈ 1,58114, Standardfehler /√5 ≈ 0,70711.
	const sem = stdDevOfMean([1, 2, 3, 4, 5]);
	pruefe(Math.abs(sem - 0.70710678) < 1e-6,
		`stdDevOfMean am Handbeispiel [1,2,3,4,5] ≈ 0,70711 (berechnet: ${sem.toFixed(8)})`);
	pruefe(stdDevOfMean([]) === 0 && stdDevOfMean([1]) === 0,
		'stdDevOfMean liefert 0 bei weniger als zwei Werten, statt durch null zu teilen');

	return fehler === 0;
}

/* --------------------------------------------------------- Direktaufruf */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	console.log('\nBlackjack – Statistik für die Nachweisläufe: Selbsttest');
	console.log('=========================================================\n');
	const bestanden = selbsttest();
	console.log(bestanden
		? '\nERGEBNIS: Selbsttest bestanden. gammaQ() trifft jede abgeschriebene'
		+ '\nTabellenstützstelle innerhalb der Toleranz, die Randfälle stimmen,'
		+ '\nchiSquareUniform() und stdDevOfMean() stimmen an den Handbeispielen.'
		: '\nERGEBNIS: Selbsttest fehlgeschlagen — kein Messlauf sollte auf dieser'
		+ '\nDatei aufbauen, bevor der Fehler behoben ist.');
	process.exit(bestanden ? 0 : 1);
}
