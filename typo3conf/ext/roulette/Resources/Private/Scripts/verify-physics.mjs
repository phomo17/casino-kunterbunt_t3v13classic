/**
 * Roulette – Nachweis Physikkern (Wiederholbarkeit, Grenzen, grobe Gleichverteilung)
 * ====================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter drei Minuten (Plan
 * Abschnitt 4.29) — gemessen liegt sie deutlich darunter, siehe README.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-physics.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.29)
 * ---------------------------------------------
 *   P-1   Quelltext: nur bitgenau festgelegte Rechenarten, keine
 *         Winkelfunktion, kein % auf einer Fließkommazahl
 *   P-2   Wiederholbarkeit: gleiche Saat → exakt gleicher Verlauf
 *         (2.000 Fachzeiger UND die Momentaufnahme alle 500 Schritte)
 *   P-3   verschiedene Saat → verschiedene Folge (Gegenprobe zu P-2)
 *   P-4   die Kugel verlässt das Rad nie, keine Geschwindigkeit über der
 *         Höchstgrenze
 *   P-5   jeder Lauf endet mit genau einem ganzzahligen Fachzeiger
 *   P-6   die Ablesung (settle()) stimmt mit der eigenen Formel überein
 *   P-7   das Rad wird zwischen den Runden nie zurückgesetzt
 *   P-8   die Notbremse (MAX_STEPS) greift nie; mittlere Laufdauer 8–22 s
 *   P-9   das Verwerfungsverfahren zieht sauber (alle 201 Werte, Chi-Quadrat
 *         p > 0,001 über 200.000 Ziehungen — Begründung für die Abweichung
 *         vom ursprünglich geplanten „< 4 % größte Abweichung" siehe der
 *         Kommentar bei P-9 weiter unten: bei 201 Fächern und rund 995
 *         Ziehungen je Fach fällt selbst random() % 201 ohne jedes
 *         Verwerfungsverfahren regelmäßig auf ~11 % größte Abweichung,
 *         der 4-%-Grenzwert wäre bei diesem Stichprobenumfang aussagelos)
 *   P-10  die Kugel erlebt wirklich Stöße (kein hohles Modell)
 *   P-11  über 20.000 Läufe keine offensichtliche Schieflage (Chi-Quadrat)
 *
 * WARUM DIESE DATEI SICH SELBST NICHT AUSFÜHRT, WENN SIE IMPORTIERT WIRD
 * ------------------------------------------------------------------------
 * measure-uniformity.mjs braucht chiSquareUniform()/gammaQ() aus genau
 * dieser Datei (Plan Abschnitt 4.29: „sie steht einmal in
 * verify-physics.mjs und wird von measure-uniformity.mjs daraus
 * importiert"). Ein ES-Modul führt seinen Code aber beim ersten Import
 * sofort aus — stünde der gesamte Prüflauf einschließlich process.exit()
 * auf der obersten Ebene, würde jeder Import dieser Datei sofort alle
 * P-1 bis P-11 mitlaufen lassen und den Prozess DANACH beenden, bevor
 * measure-uniformity.mjs auch nur eine Zeile seines eigenen Laufs
 * erreicht. Deshalb steht der komplette Prüflauf in main(), und main()
 * wird nur aufgerufen, wenn diese Datei das unmittelbar gestartete
 * Programm ist (Prüfung weiter unten über process.argv[1]). Der Import
 * von chiSquareUniform()/gammaQ() bleibt dabei folgenlos: beide sind
 * reine Funktionen ohne Seiteneffekt.
 *
 * WARUM DER REST-OPERATOR-CHECK IN P-1 GENAU EINE STELLE AUSNIMMT
 * -------------------------------------------------------------------
 * zieheGanzzahl() in wheel-physics.js wendet % ausschließlich auf
 * 32-Bit-Ganzzahlen an (das Verwerfungsverfahren aus CONCEPT.md C.5.2) —
 * dort ist der Rest-Operator bitgenau, weil beide Operanden ganze Zahlen
 * unterhalb 2^53 sind. Überall sonst in der Physik wäre % auf einer
 * Fließkommazahl NICHT bitgenau festgelegt. Die Prüfung schneidet deshalb
 * genau den Funktionskörper von zieheGanzzahl() heraus und verlangt, dass
 * im Rest der Datei kein einziges % mehr vorkommt.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

/** Entfernt Block- und Zeilenkommentare. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Wickelt einen Winkel auf [0, 1) — unabhängige Nachrechnung, wie W-6 es für den Fachwinkel tut. */
function wrap(turn) {
	return turn - Math.floor(turn);
}

/* =====================================================================
 * Chi-Quadrat-Anpassungstest gegen die Gleichverteilung, ohne fremde
 * Bibliothek. Wird sowohl von P-11 unten als auch von measure-uniformity.mjs
 * benutzt (relativer Import zwischen zwei Dateien desselben Verzeichnisses).
 *
 * Math.exp und Math.log sind HIER ausdrücklich erlaubt: dies ist ein
 * Auswertungswerkzeug, keine Physik (Plan Abschnitt 4.29). Sein Ergebnis
 * fließt nie in eine Simulation zurück.
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
 * @param {number[]} counts Trefferzahl je Fach
 * @returns {{chi2: number, df: number, p: number}}
 */
export function chiSquareUniform(counts) {
	const n = counts.length;
	const summe = counts.reduce((s, c) => s + c, 0);
	const erwartung = summe / n;
	let chi2 = 0;
	for (const c of counts) {
		const diff = c - erwartung;
		chi2 += (diff * diff) / erwartung;
	}
	const df = n - 1;
	const p = gammaQ(df / 2, chi2 / 2);
	return { chi2, df, p };
}

/* ===================================================== Der Prüflauf ===== */

async function main() {
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

	console.log('\nRoulette – Nachweis Physikkern (Wiederholbarkeit, Grenzen, grobe Gleichverteilung)');
	console.log('====================================================================================\n');

	const PHYSICS_PATH = path.join(EXT, 'Resources/Public/JavaScript/wheel-physics.js');
	const PHYSICS_SOURCE = lies(PHYSICS_PATH);
	const PHYSICS_CLEAN = ohneKommentare(PHYSICS_SOURCE);

	console.log('P-1  Quelltext: nur bitgenau festgelegte Rechenarten, keine Winkelfunktion');
	{
		const VERBOTENE_NAMEN = ['import', 'document', 'window', 'localStorage', 'Date', 'performance'];
		for (const name of VERBOTENE_NAMEN) {
			check(!new RegExp(`\\b${name}\\b`).test(PHYSICS_CLEAN), `kein ${name} im Quelltext`);
		}
		check(!/Math\.random/.test(PHYSICS_CLEAN), 'kein Math.random im Quelltext');

		const VERBOTENE_FUNKTIONEN = [
			'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'hypot',
			'pow', 'exp', 'log', 'cbrt', 'sign',
		];
		for (const fn of VERBOTENE_FUNKTIONEN) {
			check(!new RegExp(`Math\\.${fn}\\b`).test(PHYSICS_CLEAN), `kein Math.${fn} im Quelltext`);
		}
		check(!/\*\*/.test(PHYSICS_CLEAN), 'kein ** (Potenzoperator) im Quelltext');

		const ziehFn = /function\s+zieheGanzzahl\([^)]*\)\s*\{[\s\S]*?\n\}/.exec(PHYSICS_CLEAN);
		check(ziehFn !== null, 'zieheGanzzahl() ist im Quelltext zu finden');
		const ohneZiehFn = ziehFn !== null ? PHYSICS_CLEAN.replace(ziehFn[0], '') : PHYSICS_CLEAN;
		check(!/%/.test(ohneZiehFn),
			'der Rest-Operator % kommt nirgends außerhalb von zieheGanzzahl() vor'
			+ ' (dort ausschließlich auf 32-Bit-Ganzzahlen, im Verwerfungsverfahren)');
	}

	let modul;
	let rngModul;
	try {
		modul = await import(new URL('../../Public/JavaScript/wheel-physics.js', import.meta.url));
		rngModul = await import(new URL('../../Public/JavaScript/rng.js', import.meta.url));
		check(true, 'wheel-physics.js und rng.js laden unter Node ohne jede Vorbereitung');
	} catch (fehlerObjekt) {
		check(false, 'wheel-physics.js und rng.js laden unter Node ohne jede Vorbereitung', String(fehlerObjekt));
		console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
		process.exit(1);
	}

	const {
		Wheel, DT, MAX_STEPS, POCKET_COUNT, TRACK_RADIUS, CONE_RADIUS,
		WHEEL_DRIVE_MEAN, BALL_DRIVE_MEAN, MAX_BALL_SPEED,
	} = modul;
	const { createSeeded } = rngModul;

	/* ========================================================= P-2 ===== */

	console.log('\nP-2  Wiederholbarkeit: gleiche Saat, gleicher Startzustand → exakt gleicher Verlauf');
	{
		const SEED = 777;
		const LAUNCHES = 2000;

		function lauf(seed, n) {
			const w = new Wheel({ random: createSeeded(seed) });
			const results = [];
			const snapshots = [];
			let stepCounter = 0;
			for (let i = 0; i < n; i++) {
				w.launch();
				while (w.phase !== 'liegt') {
					w.step();
					stepCounter++;
					if (stepCounter % 500 === 0) {
						snapshots.push(JSON.stringify(w.snapshot()));
					}
				}
				results.push(w.result);
			}
			return { results, snapshots };
		}

		const a = lauf(SEED, LAUNCHES);
		const b = lauf(SEED, LAUNCHES);

		check(JSON.stringify(a.results) === JSON.stringify(b.results),
			`${LAUNCHES} Läufe mit Saat ${SEED} liefern zweimal Zeichen für Zeichen dieselbe Folge von Fachzeigern`);
		check(a.snapshots.length === b.snapshots.length && a.snapshots.length > 0,
			`beide Läufe erzeugen dieselbe Anzahl Momentaufnahmen (gefunden: ${a.snapshots.length})`);
		const abweichend = [];
		for (let i = 0; i < Math.min(a.snapshots.length, b.snapshots.length); i++) {
			if (a.snapshots[i] !== b.snapshots[i]) {
				abweichend.push(`Momentaufnahme ${i}: ${a.snapshots[i]} ≠ ${b.snapshots[i]}`);
			}
		}
		check(abweichend.length === 0,
			`alle ${a.snapshots.length} Momentaufnahmen (je 500 Schritte) sind bitgleich (JSON.stringify(snapshot()))`,
			...abweichend.slice(0, 3));
	}

	/* ========================================================= P-3 ===== */

	console.log('\nP-3  Verschiedene Saat, verschiedene Folge');
	{
		const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const N = 200;
		const folgen = SEEDS.map((seed) => {
			const w = new Wheel({ random: createSeeded(seed) });
			const results = [];
			for (let i = 0; i < N; i++) {
				w.launch();
				results.push(w.runToRest());
			}
			return JSON.stringify(results);
		});
		const treffer = [];
		for (let i = 0; i < folgen.length; i++) {
			for (let j = i + 1; j < folgen.length; j++) {
				if (folgen[i] === folgen[j]) {
					treffer.push(`Saat ${SEEDS[i]} und Saat ${SEEDS[j]} liefern dieselbe Folge`);
				}
			}
		}
		check(treffer.length === 0,
			`alle ${SEEDS.length} Saaten liefern ${SEEDS.length} verschiedene Folgen von je ${N} Läufen`,
			...treffer);
	}

	/* ========================================== P-4, P-5, P-6, P-7, P-8, P-10, P-11 ===== */
	/* Ein einziges Wheel-Objekt für alle sieben Nachweise (C.6.2): die
	   Radstellung wandert über 20.000 Läufe mit, genau wie im Spiel und
	   genau wie es die Gleichverteilung am Ende trägt. */

	console.log('\nDer große Nachweislauf: 20.000 Läufe auf einem einzigen Wheel-Objekt (C.6.2)');
	{
		const SEED = 424242;
		const N = 20000;
		const w = new Wheel({ random: createSeeded(SEED) });

		/* P-10: Instrumentierung der Stöße durch einen Zähler um die
		   Prototyp-Methoden herum — der Physikkern selbst bleibt
		   unverändert, es wird nur mitgezählt, wie oft er zwei seiner
		   eigenen Methoden aufruft. */
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
		const grenzverletzungen = [];
		const geschwindigkeitsverletzungen = [];
		let notbremseCount = 0;
		let ergebnisUngueltig = 0;
		let ablesungFalsch = 0;
		let totalSteps = 0;
		let maxSteps = 0;

		/* P-7: nur die ersten 500 Läufe. */
		const P7_N = 500;
		const wheelTurnStart = [];
		const wheelTurnEnd = [];
		const directionAfterLaunch = [];

		for (let i = 0; i < N; i++) {
			w.launch();
			if (i < P7_N) {
				wheelTurnStart.push(w.wheelTurn);
				directionAfterLaunch.push(w.direction);
			}
			while (w.phase !== 'liegt') {
				w.step();
				if (w.ballR > TRACK_RADIUS || w.ballR < CONE_RADIUS) {
					grenzverletzungen.push(`Lauf ${i}: ballR=${w.ballR}`);
				}
				if (Math.abs(w.ballOmega) > MAX_BALL_SPEED) {
					geschwindigkeitsverletzungen.push(`Lauf ${i}: ballOmega=${w.ballOmega}`);
				}
			}
			if (i < P7_N) {
				wheelTurnEnd.push(w.wheelTurn);
			}

			totalSteps += w.steps;
			if (w.steps > maxSteps) {
				maxSteps = w.steps;
			}
			if (w.steps >= MAX_STEPS) {
				notbremseCount++;
			}

			if (Number.isInteger(w.result) && w.result >= 0 && w.result < POCKET_COUNT) {
				counts[w.result]++;
			} else {
				ergebnisUngueltig++;
			}

			const rel = wrap(w.ballTurn - w.wheelTurn);
			const zeiger = Math.floor(rel * POCKET_COUNT);
			if (zeiger !== w.result) {
				ablesungFalsch++;
			}
		}

		Wheel.prototype.hitDeflector = origHitDeflector;
		Wheel.prototype.hitFret = origHitFret;

		console.log('\nP-4  Die Kugel verlässt das Rad nie');
		check(grenzverletzungen.length === 0,
			`ballR blieb in allen ${N} Läufen zwischen ${CONE_RADIUS} und ${TRACK_RADIUS}`,
			...grenzverletzungen.slice(0, 5));
		check(geschwindigkeitsverletzungen.length === 0,
			`|ballOmega| blieb in allen ${N} Läufen ≤ ${MAX_BALL_SPEED}`,
			...geschwindigkeitsverletzungen.slice(0, 5));

		console.log('\nP-5  Genau ein Fach, immer');
		check(ergebnisUngueltig === 0,
			`alle ${N} Läufe enden mit phase 'liegt' und einem ganzzahligen Fachzeiger 0…${POCKET_COUNT - 1}`);
		check(counts.reduce((s, c) => s + c, 0) === N, `${N} Ergebnisse gezählt`);

		console.log('\nP-6  Die Ablesung stimmt mit der Zeichnung überein');
		check(ablesungFalsch === 0,
			`floor(wrap(ballTurn − wheelTurn) × ${POCKET_COUNT}) === result in allen ${N} Läufen`);

		console.log('\nP-7  Das Rad wird zwischen den Runden nie zurückgesetzt');
		{
			const bruch = [];
			for (let i = 0; i < P7_N - 1; i++) {
				if (wheelTurnEnd[i] !== wheelTurnStart[i + 1]) {
					bruch.push(`nach Lauf ${i}: Ende=${wheelTurnEnd[i]} Start(${i + 1})=${wheelTurnStart[i + 1]}`);
				}
				if (directionAfterLaunch[i + 1] !== -directionAfterLaunch[i]) {
					bruch.push(`Richtung wechselt bei Lauf ${i + 1} nicht (${directionAfterLaunch[i]} → ${directionAfterLaunch[i + 1]})`);
				}
			}
			check(bruch.length === 0,
				`${P7_N} aufeinanderfolgende Läufe auf einem Wheel: wheelTurn läuft nahtlos weiter, die Richtung wechselt jedes Mal`,
				...bruch.slice(0, 5));
			check(WHEEL_DRIVE_MEAN !== BALL_DRIVE_MEAN,
				`WHEEL_DRIVE_MEAN (${WHEEL_DRIVE_MEAN}) ist verschieden von BALL_DRIVE_MEAN (${BALL_DRIVE_MEAN})`);
		}

		console.log('\nP-8  Die Notbremse greift nie');
		const mittlereSekunden = (totalSteps / N) * DT;
		const groessteSekunden = maxSteps * DT;
		console.log(`      mittlere Laufdauer: ${mittlereSekunden.toFixed(2)} s   größte: ${groessteSekunden.toFixed(2)} s`);
		check(notbremseCount === 0, `MAX_STEPS (${MAX_STEPS}) wurde in keinem der ${N} Läufe erreicht`);
		check(mittlereSekunden >= 8 && mittlereSekunden <= 22,
			`mittlere Laufdauer liegt zwischen 8 und 22 s (gemessen: ${mittlereSekunden.toFixed(2)} s)`);

		console.log('\nP-10  Die Kugel erlebt wirklich Stöße');
		const deflectorProLauf = deflectorHits / N;
		const fretProLauf = fretHits / N;
		console.log(`      Rautentreffer je Lauf: ${deflectorProLauf.toFixed(3)}   Rillenstöße je Lauf: ${fretProLauf.toFixed(2)}`);
		check(deflectorProLauf >= 1,
			`mindestens ein Rautentreffer je Lauf im Mittel (gemessen: ${deflectorProLauf.toFixed(3)})`);
		check(fretProLauf >= 3,
			`mindestens drei Rillenstöße je Lauf im Mittel (gemessen: ${fretProLauf.toFixed(2)})`);

		console.log('\nP-11  Keine offensichtliche Schieflage (weicheres Kriterium als der lange Nachweis)');
		const minCount = Math.min(...counts);
		const maxCount = Math.max(...counts);
		const erwartung = N / POCKET_COUNT;
		const { chi2, df, p } = chiSquareUniform(counts);
		console.log(`      Erwartungswert je Fach: ${erwartung.toFixed(2)}   kleinste: ${minCount}   größte: ${maxCount}`);
		console.log(`      Chi-Quadrat: ${chi2.toFixed(3)}   Freiheitsgrade: ${df}   p-Wert: ${p.toFixed(4)}`);
		check(counts.every((c) => c > 0), 'alle 38 Fächer wurden mindestens einmal getroffen');
		check(maxCount <= erwartung * 1.6,
			`kein Fach über dem 1,6-fachen Erwartungswert (gemessen: ${(maxCount / erwartung).toFixed(2)}×)`);
		check(minCount >= erwartung * 0.55,
			`kein Fach unter dem 0,55-fachen Erwartungswert (gemessen: ${(minCount / erwartung).toFixed(2)}×)`);
		check(p > 0.001, `Chi-Quadrat-Test besteht mit p > 0,001 (gemessen: p=${p.toFixed(4)})`);
	}

	/* ========================================================= P-9 ===== */

	console.log('\nP-9  Die Ziehung ist sauber (Verwerfungsverfahren, C.5.2)');
	{
		/*
		 * ABWEICHUNG VOM PLANWORTLAUT, GEMESSEN BEGRÜNDET (Plan Abschnitt
		 * 4.29 nennt „< 4 %" als Kriterium für die größte Abweichung über
		 * 200.000 Ziehungen). Die erste Fassung dieser Prüfung hat genau
		 * diese Zahl geprüft und ist mit rund 14 % durchgefallen — auch
		 * für die REINE Zufallsquelle random() % 201 OHNE jedes
		 * Verwerfungsverfahren (gemessen: 11,15 %). Bei 201 Fächern und
		 * rund 995 Ziehungen je Fach beträgt die statistisch zu
		 * erwartende GRÖSSTE Einzelabweichung (Extremwertverteilung von
		 * 201 nahezu unabhängigen Zählern) rund 10 %, mit einzelnen Läufen
		 * deutlich darüber — ein Schwellwert von 4 % wäre bei diesem
		 * Stichprobenumfang selbst für einen fehlerfreien Zufallsgeber
		 * regelmäßig durchgefallen und hätte damit nichts über die
		 * Ziehung ausgesagt (dieselbe Lehre wie beim Münzschieber: eine
		 * Prüfung, die auch das Richtige durchfallen lässt, taugt nicht).
		 * Der Plan selbst löst genau dieses Problem für die Fachverteilung
		 * bereits mit einem Chi-Quadrat-Test (P-11) statt eines
		 * Grenzwerts auf die größte Einzelabweichung — dieselbe, bereits
		 * vorhandene Rechnung wird hier für die Ziehung selbst
		 * zweitverwendet. Kriterium: p > 0,001, dieselbe Schwelle wie
		 * P-11 (ein früher, weicher Nachweis; der scharfe Nachweis mit
		 * p > 0,01 ist der lange Messlauf, Abschnitt 7.5 des Plans). Die
		 * größte Einzelabweichung wird weiterhin ausgegeben, aber nur zur
		 * Information, nicht mehr als Kriterium.
		 */
		const SEED = 99;
		const DRAWS_PER_KIND = 100000; // × 2 (d und a) = 200.000 Ziehungen
		const w = new Wheel({ random: createSeeded(SEED) });
		const dIndices = [];
		const aIndices = [];
		for (let i = 0; i < DRAWS_PER_KIND; i++) {
			w.launch();
			dIndices.push(Math.round((w.draw.d - 0.9) * 1000));
			aIndices.push(Math.round((w.draw.a - 0.9) * 1000));
			/* Nur die Ziehung selbst wird geprüft, nicht der ganze Lauf —
			   'liegt' setzt launch() unmittelbar wieder in Bereitschaft,
			   ohne die Physik von 100.000 Läufen mitzurechnen. */
			w.phase = 'liegt';
		}

		check(new Set(dIndices).size === 201, `d nimmt alle 201 Werte 0,900…1,100 an (gefunden: ${new Set(dIndices).size})`);
		check(new Set(aIndices).size === 201, `a nimmt alle 201 Werte 0,900…1,100 an (gefunden: ${new Set(aIndices).size})`);

		const combinedCounts = new Array(201).fill(0);
		for (const idx of dIndices) {
			combinedCounts[idx]++;
		}
		for (const idx of aIndices) {
			combinedCounts[idx]++;
		}
		const total = DRAWS_PER_KIND * 2;
		const erwartung = total / 201;
		let groessteAbweichung = 0;
		for (const c of combinedCounts) {
			const abw = Math.abs(c - erwartung) / erwartung;
			if (abw > groessteAbweichung) {
				groessteAbweichung = abw;
			}
		}
		const { chi2, df, p } = chiSquareUniform(combinedCounts);
		console.log(`      ${total} Ziehungen, größte Einzelabweichung (nur zur Information): ${(groessteAbweichung * 100).toFixed(2)} %`);
		console.log(`      Chi-Quadrat: ${chi2.toFixed(3)}   Freiheitsgrade: ${df}   p-Wert: ${p.toFixed(4)}`);
		check(p > 0.001,
			`Chi-Quadrat-Test der 201 Ziehungswerte besteht mit p > 0,001 (gemessen: p=${p.toFixed(4)})`);
	}

	/* ------------------------------------------------------------- Ergebnis */

	console.log(fehler === 0
		? '\nERGEBNIS: alle Prüfungen bestanden. Der Physikkern ist wiederholbar,'
		+ '\nverlässt das Rad nie, endet immer in genau einem Fach, das Rad wird'
		+ '\nnie zurückgesetzt, die Notbremse greift nie, das Verwerfungsverfahren'
		+ '\nzieht sauber, die Kugel erlebt wirklich Stöße, und über 20.000 Läufe'
		+ '\nist keine grobe Schieflage zu sehen.'
		: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

	process.exit(fehler === 0 ? 0 : 1);
}

const DIESE_DATEI = fileURLToPath(import.meta.url);
if (process.argv[1] === DIESE_DATEI) {
	await main();
}
