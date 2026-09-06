/**
 * Roulette – Gleichverteilungsnachweis (der lange Messlauf)
 * ============================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * DIESES SKRIPT WIRD IN TEILSTÜCK C2-C GEBAUT, ABER NICHT IN VOLLER LÄNGE
 * GEFAHREN (DECISIONS.md 2026-09-04 11:03, Punkt 3: „Lange Messläufe werden
 * aus dem Agentenlauf herausgezogen. Der Agent schreibt das Messskript; das
 * Warten und das Auswerten übernimmt die Hauptsitzung."). Der volle
 * Nachweis über mindestens 500.000 Läufe ist Messlauf M-C2-1 und wird von
 * der Hauptsitzung gefahren — siehe die Ausführungsanleitung im README
 * dieser Extension und im Abschlussbericht des Teilstücks.
 *
 * Aufruf (nur lesend, schreibt nichts außer seiner eigenen Ausgabe):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/measure-uniformity.mjs \
 *       --runs=500000 --seed=20260904
 *
 * Beide Argumente haben einen Vorgabewert: --runs=500000, --seed=1.
 * --runs unter 500.000 wird angenommen, aber im Bericht ausdrücklich als
 * „unter dem geforderten Umfang" gekennzeichnet (C.5.4 verlangt mindestens
 * 500.000 Läufe für den ABSCHLIESSENDEN Nachweis; ein kleinerer Wert taugt
 * nur als Selbsttest des Werkzeugs selbst).
 *
 * Rückgabewert 0, wenn der Chi-Quadrat-Test mit p > 0,01 besteht; 1 sonst.
 *
 * EIN EINZIGES Wheel-OBJEKT FÜR DEN GANZEN LAUF (C.6.2)
 * -------------------------------------------------------
 * Alle Läufe finden auf demselben Wheel statt, damit die Stellung der
 * Radscheibe von Lauf zu Lauf mitwandert — genau diese fortlaufende,
 * nie zurückgesetzte Stellung ist die Quelle der Gleichverteilung, nicht
 * ein frisch gemischter Zufallsgeber je Lauf. Der Zufallsgeber ist
 * createSeeded(seed) aus rng.js, NICHT drawUint32 — der Nachweis muss auf
 * jeder Maschine dieselbe Zahl liefern.
 *
 * ES WIRD MIT wheel-physics.js SELBST GERECHNET (C.5.3)
 * ----------------------------------------------------------
 * Kein Nachbau der Physik, kein vereinfachtes Modell — dasselbe Modul, das
 * auch im Browser läuft. Ein Nachbau, der richtig rechnet, während das
 * Spiel falsch liefe, wäre wertlos.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chiSquareUniform } from './verify-physics.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');

/** Ersetzt den Dezimalpunkt durch ein Komma — deutsche Zahlenschreibweise im Bericht. */
function de(zahl, nachkommastellen = 2) {
	return zahl.toFixed(nachkommastellen).replace('.', ',');
}

/** Liest --name=wert aus process.argv, mit Vorgabewert. */
function argument(name, vorgabe) {
	const praefix = `--${name}=`;
	const treffer = process.argv.find((a) => a.startsWith(praefix));
	if (treffer === undefined) {
		return vorgabe;
	}
	const wert = Number(treffer.slice(praefix.length));
	if (!Number.isFinite(wert)) {
		throw new RangeError(`--${name} muss eine Zahl sein (gefunden: "${treffer.slice(praefix.length)}")`);
	}
	return wert;
}

async function main() {
	const t0 = Date.now();

	const RUNS = argument('runs', 500000);
	const SEED = argument('seed', 1);
	const MINDESTUMFANG = 500000;

	const { Wheel, DT, POCKET_COUNT } = await import(new URL('../../Public/JavaScript/wheel-physics.js', import.meta.url));
	const { createSeeded } = await import(new URL('../../Public/JavaScript/rng.js', import.meta.url));

	console.log('\nRoulette – Gleichverteilungsnachweis (der lange Messlauf)');
	console.log('============================================================\n');
	console.log(`Umfang            ${RUNS} Läufe${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG (mindestens 500.000, C.5.4)' : ''}`);
	console.log(`Saat              ${SEED}`);
	console.log(`Fächer            ${POCKET_COUNT}\n`);

	const w = new Wheel({ random: createSeeded(SEED) });

	/* Instrumentierung der Stöße — derselbe Kunstgriff wie in
	   verify-physics.mjs P-10, ohne den Physikkern zu ändern. */
	let deflectorHits = 0;
	let fretHits = 0;
	const origHitDeflector = Wheel.prototype.hitDeflector;
	const origHitFret = Wheel.prototype.hitFret;
	Wheel.prototype.hitDeflector = function (...args) {
		deflectorHits++;
		return origHitDeflector.apply(this, args);
	};
	Wheel.prototype.hitFret = function (...args) {
		fretHits++;
		return origHitFret.apply(this, args);
	};

	const counts = new Array(POCKET_COUNT).fill(0);
	let redCount = 0;
	let blackCount = 0;
	let greenCount = 0;
	let totalSteps = 0;
	let maxSteps = 0;

	const { RED, GREEN, WHEEL_ORDER } = await import(new URL('../../Public/JavaScript/wheel-geometry.js', import.meta.url));

	const FORTSCHRITT_ALLE = 25000;
	let letzteMeldung = t0;

	for (let i = 0; i < RUNS; i++) {
		w.launch();
		const zeiger = w.runToRest();
		counts[zeiger]++;
		totalSteps += w.steps;
		if (w.steps > maxSteps) {
			maxSteps = w.steps;
		}

		const label = WHEEL_ORDER[zeiger];
		if (GREEN.includes(label)) {
			greenCount++;
		} else if (RED.includes(label)) {
			redCount++;
		} else {
			blackCount++;
		}

		if ((i + 1) % FORTSCHRITT_ALLE === 0) {
			const jetzt = Date.now();
			const vergangenSek = (jetzt - t0) / 1000;
			const proLaufMs = (jetzt - t0) / (i + 1);
			const restLaeufe = RUNS - (i + 1);
			const hochrechnungSek = (restLaeufe * proLaufMs) / 1000;
			console.log(
				`  … ${i + 1} / ${RUNS} Läufe`
				+ `  (${de(vergangenSek, 1)} s vergangen,`
				+ ` Hochrechnung Rest: ${de(hochrechnungSek, 1)} s,`
				+ ` gesamt rund ${de(vergangenSek + hochrechnungSek, 1)} s)`
			);
			letzteMeldung = jetzt;
		}
	}

	Wheel.prototype.hitDeflector = origHitDeflector;
	Wheel.prototype.hitFret = origHitFret;

	const { chi2, df, p } = chiSquareUniform(counts);
	const erwartung = RUNS / POCKET_COUNT;

	let groessterIndex = 0;
	let kleinsterIndex = 0;
	for (let i = 1; i < counts.length; i++) {
		if (counts[i] > counts[groessterIndex]) {
			groessterIndex = i;
		}
		if (counts[i] < counts[kleinsterIndex]) {
			kleinsterIndex = i;
		}
	}
	const groessteAbwProzent = ((counts[groessterIndex] - erwartung) / erwartung) * 100;
	const kleinsteAbwProzent = ((counts[kleinsterIndex] - erwartung) / erwartung) * 100;

	const mittlereSekunden = (totalSteps / RUNS) * DT;
	const groessteSekunden = maxSteps * DT;
	const deflectorProLauf = deflectorHits / RUNS;
	const fretProLauf = fretHits / RUNS;

	const gesamtSekunden = (Date.now() - t0) / 1000;

	console.log('\n--- Bericht ---\n');
	console.log(`Umfang            ${RUNS} Läufe${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG' : ''}`);
	console.log(`Saat              ${SEED}`);
	console.log(`Fächer            ${POCKET_COUNT}`);
	console.log(`Erwartungswert    ${de(erwartung, 2)} je Fach`);
	console.log(`Chi-Quadrat       ${de(chi2, 3)}`);
	console.log(`Freiheitsgrade    ${df}`);
	console.log(`p-Wert            ${de(p, 4)}        ← ${p > 0.01 ? 'BESTANDEN' : 'DURCHGEFALLEN'}, wenn > 0,01`);
	console.log(`Größte Abweichung Fach "${WHEEL_ORDER[groessterIndex]}": ${groessteAbwProzent >= 0 ? '+' : ''}${de(groessteAbwProzent, 2)} % (${counts[groessterIndex]} statt ${Math.round(erwartung)})`);
	console.log(`Kleinste          Fach "${WHEEL_ORDER[kleinsterIndex]}": ${kleinsteAbwProzent >= 0 ? '+' : ''}${de(kleinsteAbwProzent, 2)} % (${counts[kleinsterIndex]} statt ${Math.round(erwartung)})`);
	console.log(`Rot / Schwarz / Grün   ${redCount} / ${blackCount} / ${greenCount}   (erwartet ${Math.round(RUNS * 18 / 38)} / ${Math.round(RUNS * 18 / 38)} / ${Math.round(RUNS * 2 / 38)})`);
	console.log(`Mittlere Laufdauer     ${de(mittlereSekunden, 1)} s     Größte ${de(groessteSekunden, 1)} s`);
	console.log(`Rautentreffer je Lauf  ${de(deflectorProLauf, 2)}       Rillenstöße je Lauf  ${de(fretProLauf, 1)}`);

	const physicsModul = await import(new URL('../../Public/JavaScript/wheel-physics.js', import.meta.url));
	const konstanten = Object.entries(physicsModul)
		.filter(([, wert]) => typeof wert === 'number')
		.map(([name, wert]) => `${name}=${wert}`)
		.join(', ');
	console.log(`Verwendete Werte  ${konstanten}`);

	console.log('\nZähltabelle aller 38 Fächer:');
	for (let i = 0; i < counts.length; i++) {
		const label = WHEEL_ORDER[i].padStart(2, ' ');
		const abw = ((counts[i] - erwartung) / erwartung) * 100;
		console.log(`  Fach "${label}"  ${String(counts[i]).padStart(7, ' ')}   (${abw >= 0 ? '+' : ''}${de(abw, 2)} %)`);
	}

	console.log('\nRechnerische Quote (C.5.4 — gerechnet, nicht gemessen, Folge der Gleichverteilung');
	console.log('und der Auszahlungstabelle aus Anhang F; die Wetten selbst entstehen erst in Phase C3):');
	console.log(`  einfache und mehrfache Chancen außer der Fünferwette: 36/38 = ${de((36 / 38) * 100, 4)} %`);
	console.log(`  Fünferwette (0, 00, 1, 2, 3):                         35/38 = ${de((35 / 38) * 100, 4)} %`);

	console.log(`\nGesamtlaufzeit: ${de(gesamtSekunden, 1)} s`);
	console.log(`\nERGEBNIS: ${p > 0.01 ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Rückgabewert ${p > 0.01 ? 0 : 1}).`);

	process.exit(p > 0.01 ? 0 : 1);
}

const DIESE_DATEI = fileURLToPath(import.meta.url);
if (process.argv[1] === DIESE_DATEI) {
	await main();
}
