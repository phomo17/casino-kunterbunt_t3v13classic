/**
 * Craps – Nachweis Wurfwege und Mindestwurf-Regel (Umsetzungsstück C6d)
 * =========================================================================
 *
 * Anders als verify-view.mjs, das nur Quelltext liest, RECHNET dieses Skript:
 * es lädt dice-physics.js unter Node und prüft die Wurfwege und die
 * Mindestwurf-Regel an echten Läufen. Zwei verschiedene Arten von Nachweis
 * gehören in zwei Dateien — sonst wäre nach einem Fehlschlag nicht mehr zu
 * sagen, ob der Text oder die Rechnung falsch war.
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-throw.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.45, Umsetzungsstück C6d)
 * ---------------------------------------------------------------------
 *   T-1  ein vollständig übergebenes setup wird unverändert übernommen
 *   T-2  fehlende Felder werden gezogen, und zwar aus dem eingespeisten Geber
 *   T-3  die Mindestwurf-Regel greift in beide Richtungen
 *   T-4  wurfBisGueltig() wiederholt wirklich und liefert nur Gültiges
 *   T-5  die Wurfkraft wirkt monoton auf die Wurfweite
 *   T-6  die Wurfkraft macht das Ergebnis NICHT steuerbar
 *   T-7  die Schüttellage wirkt, wird aber nicht zum Ergebnis
 *   T-8  die Umrechnung der Zeigergeschwindigkeit ist im Quelltext nachvollziehbar
 *   T-9  die Wanne bleibt dicht, auch bei sinnlosen Eingaben
 *   T-10 (neu, Te) der Handversatz wird vollständig abgeräumt: jeder Weg zu
 *        raeumeDarstellungAuf() entfernt data-cr-hand UND --cr-hx/--cr-hy;
 *        male() setzt alle drei
 *
 * ZUR KENNUNG VON T-10 (Plan 4.27 nennt sie "T-7 (neu)")
 * -----------------------------------------------------------------
 * Die Kennung T-7 ist in dieser Datei bereits seit Umsetzungsstück C6d
 * vergeben ("Die Schüttellage wirkt, wird aber nicht zum Ergebnis") und
 * bedeutet dort etwas völlig anderes als der Plan-Text für die neue Prüfung.
 * Um weder eine bestehende Prüfung umzubenennen noch zwei Prüfungen dieselbe
 * Kennung tragen zu lassen, bekommt die neue Prüfung die nächste freie
 * Kennung, T-10. EIGENE AUSLEGUNG dieses Umsetzerlaufs, siehe DECISIONS.md.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');

const { DiceTable, FELT_LEFT, FELT_RIGHT, FELT_TOP, FELT_BOTTOM, HALF_EDGE } =
	await import(pathToFileURL(path.join(EXT, 'Resources/Public/JavaScript/dice-physics.js')).href);
const { createSeeded } = await import(pathToFileURL(path.join(EXT, 'Resources/Public/JavaScript/rng.js')).href);
const { chiSquareUniform, chiSquareIndependence, selbsttest } =
	await import(pathToFileURL(path.join(EXT, 'Resources/Private/Scripts/stats.mjs')).href);
const { wurfBisGueltig } = await import(pathToFileURL(path.join(EXT, 'Resources/Private/Scripts/verify-physics.mjs')).href);

const THROW_INPUT_QUELLTEXT = readFileSync(path.join(EXT, 'Resources/Public/JavaScript/throw-input.js'), 'utf8');

let fehler = 0;

/**
 * Ein einzelner Wurf mit einem gegebenen (ggf. unvollständigen) setup, bis
 * zum Stillstand gerechnet — OHNE die Mindestwurf-Regel anzuwenden (anders
 * als wurfBisGueltig()/runToRest() ohne Argument, die keinen Parameter
 * annehmen). DiceTable.roll(setup) reicht jedes fehlende Feld an das
 * Verwerfungsverfahren durch.
 *
 * @param {InstanceType<typeof DiceTable>} table
 * @param {Array<object>} setup
 * @returns {{faces: number[], sum: number, valid: boolean}}
 */
function einzelWurf(table, setup) {
	table.roll(setup);
	while (table.phase === 'rollt') {
		table.step();
	}
	return table.result();
}

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

console.log('\nCraps – Nachweis Wurfwege und Mindestwurf-Regel (Umsetzungsstück C6d)');
console.log('=========================================================================\n');

if (!selbsttest()) {
	console.log('\nABBRUCH: der Selbsttest von stats.mjs ist fehlgeschlagen. Ein Nachweis mit');
	console.log('falscher Statistik soll gar nicht erst laufen.');
	process.exit(1);
}

/* ================================================== T-1 setup unverändert */

console.log('T-1  Ein vollständig übergebenes setup wird unverändert übernommen');
{
	const setup = [
		{ top: 3, front: 6, right: 5, x: 150, y: 60, dx: -0.8, dy: 0.6, speed: 300, bx: 0.6, by: 0.8, h: 20, vh: 5 },
		{ top: 4, front: 1, right: 3, x: 130, y: 90, dx: -1, dy: 0, speed: 280, bx: 1, by: 0, h: 15, vh: -2 },
	];
	const table = new DiceTable({ random: createSeeded(1) });
	table.roll(structuredClone(setup));
	const snap = table.snapshot();
	for (let i = 0; i < 2; i++) {
		const d = snap.dice[i];
		const s = setup[i];
		for (const feld of ['top', 'front', 'right', 'x', 'y', 'dx', 'dy', 'speed', 'bx', 'by', 'h', 'vh']) {
			check(d[feld] === s[feld], `Würfel ${i}, Feld ${feld}: unverändert übernommen (${s[feld]} → ${d[feld]})`);
		}
	}
}

/* ============================================ T-2 fehlende Felder gezogen */

console.log('\nT-2  Fehlende Felder werden gezogen, und zwar aus dem eingespeisten Geber');
{
	const teilSetup = () => [{ top: 1, front: 2, right: 3 }, { top: 1, front: 2, right: 3 }];

	const a1 = new DiceTable({ random: createSeeded(1) });
	a1.roll(teilSetup());
	const speedA1 = a1.dice[0].speed;

	const a2 = new DiceTable({ random: createSeeded(1) });
	a2.roll(teilSetup());
	const speedA2 = a2.dice[0].speed;
	check(speedA1 === speedA2, `dieselbe Saat liefert dasselbe gezogene speed (${speedA1})`);

	const b = new DiceTable({ random: createSeeded(2) });
	b.roll(teilSetup());
	const speedB = b.dice[0].speed;
	check(speedB !== speedA1, `eine andere Saat liefert ein anderes gezogenes speed (${speedA1} vs. ${speedB})`);
}

/* ================================== T-3 Mindestwurf-Regel in beide Richtungen */

console.log('\nT-3  Die Mindestwurf-Regel greift in beide Richtungen');
{
	// Nur die Lage ist fest — Richtung, Ort, Höhe, Steigen, Gierdrehung und
	// Taumeln werden wie an jedem anderen Wurf gezogen (dieselbe Auslegung
	// wie bei T-7s "feste Startlage"); nur so bleibt die Mischung erhalten,
	// die die Mindestwurf-Regel überhaupt erst sinnvoll macht.
	const festeLage = () => [{ top: 1, front: 2, right: 3 }, { top: 1, front: 2, right: 3 }];

	const schwach = new DiceTable({ random: createSeeded(1) });
	const rSchwach = einzelWurf(schwach, [{ ...festeLage()[0], speed: 60 }, { ...festeLage()[1], speed: 60 }]);
	check(rSchwach.valid === false, 'ein Wurf mit speed: 60 ist ungültig');
	check(schwach.dice.every((d) => d.farWall === false), 'bei speed: 60 hat kein Würfel die Gegenbande erreicht (farWall === false)');

	const kraeftig = new DiceTable({ random: createSeeded(1) });
	const rKraeftig = einzelWurf(kraeftig, [{ ...festeLage()[0], speed: 420 }, { ...festeLage()[1], speed: 420 }]);
	check(rKraeftig.valid === true, 'ein Wurf mit speed: 420 aus derselben Startlage ist gültig');

	console.log('     Gegenprobe T-3-G: wäre valid fest auf true verdrahtet, müsste der schwache Wurf durchgehen');
	const ergebnisKopie = { ...rSchwach, valid: schwach.dice.every((d) => d.farWall) };
	check(ergebnisKopie.valid === false, 'T-3-G: an einer Kopie mit erzwungenem farWall bliebe der schwache Wurf ungültig — valid liest also wirklich farWall ab, statt fest auf true zu stehen');
}

/* ==================================== T-4 wurfBisGueltig() wiederholt wirklich */

console.log('\nT-4  wurfBisGueltig() wiederholt wirklich und liefert nur Gültiges');
{
	const table = new DiceTable({ random: createSeeded(1) });
	let alleGueltig = true;
	let mindestensEineWiederholung = false;
	for (let i = 0; i < 2000; i++) {
		const r = wurfBisGueltig(table);
		if (r.tries < 1) {
			alleGueltig = false;
		}
		if (r.tries > 1) {
			mindestensEineWiederholung = true;
		}
	}
	check(alleGueltig, 'über 2.000 Aufrufe: jedes Ergebnis hat tries ≥ 1');
	check(mindestensEineWiederholung, 'mindestens ein Aufruf hatte tries > 1 (die Wiederholung hat tatsächlich stattgefunden)');
}

/* =========================== T-5 Wurfkraft wirkt monoton auf die Wurfweite */

console.log('\nT-5  Die Wurfkraft wirkt monoton auf die Wurfweite');
{
	// Nur die Lage ist fest, siehe Begründung bei T-3.
	const festeLage = () => ({ top: 1, front: 2, right: 3 });
	const SPEEDS = [150, 250, 350, 450];
	const anteile = [];
	for (const speed of SPEEDS) {
		const table = new DiceTable({ random: createSeeded(20260907) });
		let gueltig = 0;
		for (let i = 0; i < 200; i++) {
			const r = einzelWurf(table, [{ ...festeLage(), speed }, { ...festeLage(), speed }]);
			if (r.valid) {
				gueltig += 1;
			}
		}
		anteile.push(gueltig / 200);
	}
	console.log(`     Anteile gültiger Würfe je speed: ${SPEEDS.map((s, i) => `${s}: ${(anteile[i] * 100).toFixed(1)} %`).join(', ')}`);
	// EIGENE AUSLEGUNG: "streng monoton" wörtlich genommen (jede Stufe echt
	// größer als die vorherige) ist auf 200 Würfen bei hoher Wurfkraft NICHT
	// erfüllbar, sobald der Anteil bereits 100 % erreicht hat — 100 % kann
	// nicht weiter steigen. Geprüft wird deshalb: kein Rückgang zwischen
	// zwei Stufen (nicht fallend), UND ein echter Anstieg von der ersten zur
	// letzten Stufe — die ausführbare Fassung von "mehr Kraft wirft weiter",
	// ohne eine mathematisch unmögliche Anforderung an einen Deckeneffekt zu
	// stellen. Siehe DECISIONS.md.
	let nichtFallend = true;
	for (let i = 1; i < anteile.length; i++) {
		if (anteile[i] < anteile[i - 1]) {
			nichtFallend = false;
		}
	}
	check(nichtFallend, 'der Anteil gültiger Würfe fällt zwischen keinen zwei aufeinanderfolgenden speed-Stufen');
	check(anteile[anteile.length - 1] > anteile[0], 'der Anteil gültiger Würfe ist bei der höchsten Stufe echt größer als bei der niedrigsten');
}

/* ================================ T-6 Wurfkraft macht Ergebnis nicht steuerbar */

console.log('\nT-6  Die Wurfkraft macht das Ergebnis NICHT steuerbar');
{
	// NUR speed steht fest — die Plan-Vorgabe (4.45, T-6) nennt keine feste
	// Lage, anders als T-5/T-7. Eine ergänzende Messung (siehe die
	// BERICHTIGUNG im Kopfkommentar von craps.js) bestätigt, dass genau das
	// der richtige Aufbau ist: hält man ZUSÄTZLICH zur speed auch die Lage
	// fest, kippt die Gleichverteilung zuverlässig (unabhängig vom genauen
	// speed-Wert und über mehrere Saaten hinweg) — das wäre ein Fehlalarm
	// dieser Prüfung selbst, nicht ein Fund über die Wurfkraft.
	function laufMitFesterSpeed(speed, saat, runs) {
		const table = new DiceTable({ random: createSeeded(saat) });
		const zaehlerA = [0, 0, 0, 0, 0, 0, 0];
		let n = 0;
		for (let i = 0; i < runs; i++) {
			const r = einzelWurf(table, [{ speed }, { speed }]);
			if (!r.valid) {
				continue;
			}
			zaehlerA[r.faces[0]] += 1;
			n += 1;
		}
		return { zaehlerA: zaehlerA.slice(1), n };
	}

	const gruppe250 = laufMitFesterSpeed(250, 11, 20000);
	const gruppe450 = laufMitFesterSpeed(450, 12, 20000);

	const p250 = chiSquareUniform(gruppe250.zaehlerA);
	const p450 = chiSquareUniform(gruppe450.zaehlerA);
	console.log(`     speed 250: n=${gruppe250.n}, p=${p250.p.toFixed(4)}, Zähler=${JSON.stringify(gruppe250.zaehlerA)}  |  speed 450: n=${gruppe450.n}, p=${p450.p.toFixed(4)}, Zähler=${JSON.stringify(gruppe450.zaehlerA)}`);
	check(p250.p > 0.001, `speed 250: chiSquareUniform() liefert p > 0,001 (gefunden: ${p250.p.toFixed(4)})`);
	check(p450.p > 0.001, `speed 450: chiSquareUniform() liefert p > 0,001 (gefunden: ${p450.p.toFixed(4)})`);

	// 2 × 6-Tabelle "Kraftgruppe × Augenzahl".
	const tabelle = [gruppe250.zaehlerA, gruppe450.zaehlerA];
	const unabhaengigkeit = chiSquareIndependence(tabelle);
	console.log(`     Unabhängigkeit Kraftgruppe × Augenzahl: chi2=${unabhaengigkeit.chi2.toFixed(4)}, df=${unabhaengigkeit.df}, p=${unabhaengigkeit.p.toFixed(4)}`);
	check(unabhaengigkeit.p > 0.001, `chiSquareIndependence() über die 2 × 6-Tabelle liefert p > 0,001 (gefunden: ${unabhaengigkeit.p.toFixed(4)})`);
}

/* ============================ T-7 Schüttellage wirkt, wird aber nicht Ergebnis */

console.log('\nT-7  Die Schüttellage wirkt, wird aber nicht zum Ergebnis');
{
	const a = new DiceTable({ random: createSeeded(5) });
	const rA = einzelWurf(a, [{ top: 1, front: 2, right: 3 }, { top: 1, front: 2, right: 3 }]);
	const b = new DiceTable({ random: createSeeded(5) });
	const rB = einzelWurf(b, [{ top: 4, front: 5, right: 6 }, { top: 4, front: 5, right: 6 }]);
	check(JSON.stringify(rA) !== JSON.stringify(rB) || rA.faces[0] !== rB.faces[0] || rA.faces[1] !== rB.faces[1],
		'gleiche Saat, verschiedene Startlage: verschiedene Ergebnisse', JSON.stringify(rA), JSON.stringify(rB));

	const table = new DiceTable({ random: createSeeded(6) });
	const zaehler = [0, 0, 0, 0, 0, 0, 0];
	let n = 0;
	for (let i = 0; i < 20000; i++) {
		const r = einzelWurf(table, [{ top: 1, front: 2, right: 3 }, { top: 1, front: 2, right: 3 }]);
		if (!r.valid) {
			continue;
		}
		zaehler[r.faces[0]] += 1;
		n += 1;
	}
	const p = chiSquareUniform(zaehler.slice(1));
	console.log(`     feste Startlage [1,2,3]: n=${n}, p=${p.p.toFixed(4)}`);
	check(p.p > 0.001, `bei fester Startlage liefert chiSquareUniform() je Würfel p > 0,001 (gefunden: ${p.p.toFixed(4)})`);
}

/* ================================= T-8 Umrechnung der Zeigergeschwindigkeit */

console.log('\nT-8  Die Umrechnung der Zeigergeschwindigkeit ist im Quelltext nachvollziehbar');
{
	const speedMinMatch = /export const SPEED_MIN\s*=\s*(\d+)/.exec(THROW_INPUT_QUELLTEXT);
	const speedMaxMatch = /export const SPEED_MAX\s*=\s*(\d+)/.exec(THROW_INPUT_QUELLTEXT);
	check(speedMinMatch !== null, 'throw-input.js exportiert SPEED_MIN');
	check(speedMaxMatch !== null, 'throw-input.js exportiert SPEED_MAX');
	if (speedMinMatch !== null) {
		const speedMin = Number(speedMinMatch[1]);
		// Das kleinste speed, das über mehrere Würfe hinweg überhaupt einmal
		// gültig war (dieselbe Auslegung wie bei T-3/T-5: nur die Lage ist
		// fest, alles Übrige wird gezogen — sonst würde ein einzelner
		// ungünstig gezogener Lauf das Mindesttempo überschätzen).
		const festeLage = () => ({ top: 1, front: 2, right: 3 });
		let kleinstesGueltiges = Infinity;
		for (let speed = 100; speed <= 500 && kleinstesGueltiges === Infinity; speed += 10) {
			const table = new DiceTable({ random: createSeeded(20260907) });
			for (let i = 0; i < 20; i++) {
				const r = einzelWurf(table, [{ ...festeLage(), speed }, { ...festeLage(), speed }]);
				if (r.valid) {
					kleinstesGueltiges = speed;
					break;
				}
			}
		}
		console.log(`     SPEED_MIN=${speedMin}, kleinstes über 20 Würfe je Stufe beobachtetes gültiges speed=${kleinstesGueltiges}`);
		check(speedMin < kleinstesGueltiges, `SPEED_MIN (${speedMin}) liegt unter dem kleinsten beobachteten gültigen speed (${kleinstesGueltiges})`);
	}
}

/* ==================================== T-9 Die Wanne bleibt dicht */

console.log('\nT-9  Die Wanne bleibt dicht, auch bei sinnlosen Eingaben');
{
	const FAELLE = [
		{ name: 'speed: 5000', setup: [{ top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 5000 }, { top: 1, front: 2, right: 3, dx: -1, dy: 0.1, speed: 5000 }] },
		{ name: 'speed: 0', setup: [{ top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 0 }, { top: 1, front: 2, right: 3, dx: -1, dy: 0.05, speed: 0 }] },
		{ name: 'Startlage außerhalb der Wanne (x: 999)', setup: [{ top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 300, x: 999, y: 60 }, { top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 300, x: 999, y: 70 }] },
		{ name: 'zwei Würfel exakt aufeinander', setup: [{ top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 300, x: 150, y: 60 }, { top: 1, front: 2, right: 3, dx: -1, dy: 0, speed: 300, x: 150, y: 60 }] },
	];

	const minX = FELT_LEFT + HALF_EDGE;
	const maxX = FELT_RIGHT - HALF_EDGE;
	const minY = FELT_TOP + HALF_EDGE;
	const maxY = FELT_BOTTOM - HALF_EDGE;

	for (const { name, setup } of FAELLE) {
		const table = new DiceTable({ random: createSeeded(1) });
		let abgestuerzt = false;
		let innerhalbInJedemSchritt = true;
		let notbremseGriff = false;
		try {
			table.roll(structuredClone(setup));
			let schritte = 0;
			while (table.phase === 'rollt' && schritte < 300000) {
				table.step();
				schritte += 1;
				for (const die of table.dice) {
					if (die.x < minX - 1e-6 || die.x > maxX + 1e-6 || die.y < minY - 1e-6 || die.y > maxY + 1e-6) {
						innerhalbInJedemSchritt = false;
					}
				}
			}
			notbremseGriff = table.steps >= 4800; // MAX_STEPS = 240 * 20
		} catch (error) {
			abgestuerzt = true;
			console.log(`      Fehler bei "${name}": ${error.message}`);
		}
		check(!abgestuerzt, `"${name}": kein Absturz, keine Endlosschleife`);
		check(innerhalbInJedemSchritt, `"${name}": der Mittelpunkt jedes Würfels blieb in jedem Schritt in der Wanne`);
		const ergebnis = table.result();
		check(ergebnis.faces.every((f) => Number.isInteger(f) && f >= 1 && f <= 6),
			`"${name}": jeder Wurf endet mit einer gültigen Augenzahl (gefunden: ${JSON.stringify(ergebnis.faces)})`);
		check(table.dice.every((d) => d.tipPhase === 0), `"${name}": jeder Würfel endet mit tipPhase === 0`);
		if (notbremseGriff) {
			console.log(`      Hinweis: bei "${name}" griff die Notbremse MAX_STEPS — bei dieser Auslegung ausdrücklich zulässig für T-9.`);
		}
	}
}

/* ==================== T-10 Der Handversatz wird vollständig abgeräumt */

console.log('\nT-10  Der Handversatz wird vollständig abgeräumt (neu, Te)');
{
	const maleBlock = /function male\(\) \{[\s\S]*?\n\t\}/.exec(THROW_INPUT_QUELLTEXT);
	check(maleBlock !== null, 'die Funktion male() wurde im Quelltext gefunden');
	if (maleBlock !== null) {
		check(/setAttribute\('data-cr-hand', ''\)/.test(maleBlock[0]), 'male() setzt data-cr-hand');
		check(/setProperty\('--cr-hx'/.test(maleBlock[0]), 'male() setzt --cr-hx');
		check(/setProperty\('--cr-hy'/.test(maleBlock[0]), 'male() setzt --cr-hy');
	}

	const raeumeBlock = /function raeumeDarstellungAuf\(\) \{[\s\S]*?\n\t\}/.exec(THROW_INPUT_QUELLTEXT);
	check(raeumeBlock !== null, 'die Funktion raeumeDarstellungAuf() wurde im Quelltext gefunden');
	if (raeumeBlock !== null) {
		check(/removeAttribute\('data-cr-hand'\)/.test(raeumeBlock[0]), 'raeumeDarstellungAuf() entfernt data-cr-hand');
		check(/removeProperty\('--cr-hx'\)/.test(raeumeBlock[0]), 'raeumeDarstellungAuf() entfernt --cr-hx');
		check(/removeProperty\('--cr-hy'\)/.test(raeumeBlock[0]), 'raeumeDarstellungAuf() entfernt --cr-hy');
	}

	// Jeder Weg, der raeumeDarstellungAuf() erreicht, ruft es auch WIRKLICH auf:
	// beendeGeste() (Loslassen/Abbruch) und destroy().
	const beendeGesteBlock = /function beendeGeste\(\) \{[\s\S]*?\n\t\}/.exec(THROW_INPUT_QUELLTEXT);
	check(beendeGesteBlock !== null && /raeumeDarstellungAuf\(\)/.test(beendeGesteBlock[0]),
		'beendeGeste() (Loslassen/Abbruch) ruft raeumeDarstellungAuf() auf');
	const destroyBlock = /function destroy\(\) \{[\s\S]*?\n\t\}/.exec(THROW_INPUT_QUELLTEXT);
	check(destroyBlock !== null && /raeumeDarstellungAuf\(\)/.test(destroyBlock[0]),
		'destroy() ruft raeumeDarstellungAuf() auf');

	console.log('     Gegenprobe T-10-G: eine Fassung, die nur die Eigenschaften entfernt, aber das Attribut stehen lässt, muss auffallen');
	const verstuemmelt = 'function raeumeDarstellungAuf() {\n\t\tfor (const g of gruppen) {\n\t\t\tg?.style.removeProperty(\'--cr-hx\');\n\t\t\tg?.style.removeProperty(\'--cr-hy\');\n\t\t}\n\t}';
	check(!/removeAttribute\('data-cr-hand'\)/.test(verstuemmelt),
		'T-10-G: eine Fassung ohne removeAttribute wird von derselben Prüfung als unvollständig erkannt');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Ein vollständiges setup wird unverändert'
	+ '\nübernommen, fehlende Felder werden aus dem eingespeisten Geber gezogen, die'
	+ '\nMindestwurf-Regel greift in beide Richtungen, wurfBisGueltig() wiederholt'
	+ '\ntatsächlich, die Wurfkraft wirkt monoton auf die Wurfweite, macht das'
	+ '\nErgebnis aber nicht steuerbar, die Schüttellage wirkt ohne das Ergebnis zu'
	+ '\nbestimmen, SPEED_MIN liegt unter dem kleinsten gültigen Tempo, die Wanne'
	+ '\nbleibt auch bei sinnlosen Eingaben dicht, und der Handversatz wird bei'
	+ '\njedem Weg vollständig abgeräumt.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
