/**
 * Craps – die Ansicht der Wanne
 * ==============================
 *
 * Die zweite Hälfte von CONCEPT.md C.5.1/C.5.3: das ANZEIGEN. Gerechnet wird
 * ausschließlich in dice-physics.js; diese Datei rechnet nichts nach. Sie
 * schreibt je Bild und je Würfel acht Zahlen an eine Gruppe und tauscht bei
 * Bedarf eine href.
 *
 * KEINE WINKELFUNKTION, AUCH HIER NICHT
 * --------------------------------------
 * Die Gierlage eines Würfels ist bereits ein Einheitsvektor (bx, by) — also
 * unmittelbar die erste Spalte einer Drehmatrix. Die zweite Spalte ist
 * (-by, bx). Diese Datei schreibt die vier Zahlen als Custom Properties, und
 * matrix() in tray.css macht daraus die Drehung. Ein Math.atan2() wäre nur
 * nötig, um denselben Sachverhalt in einen Winkel zurückzurechnen, den
 * rotate() dann wieder in dieselben vier Zahlen umrechnete.
 *
 * WER WANN MALT
 * --------------
 * Diese Datei entscheidet, wann gezeichnet wird — nicht die Physik. Es steht
 * kein requestAnimationFrame in dice-physics.js und keine Zeile Physik hier.
 * Die Schleife hält von selbst an (table.phase === 'liegt') und von selbst
 * wieder an (throwDice() startet sie neu). Bei document.hidden hält sie an
 * und der Zeitübertrag wird verworfen (dieselbe Festlegung wie beim
 * Münzschieber) — ein wieder sichtbares Fenster holt keine Bilder nach, die
 * es nicht gesehen hat.
 *
 * BEWEGUNGSDROSSELUNG
 * --------------------
 * Wer „Bewegung reduzieren" eingestellt hat, bekommt das ERGEBNIS sofort
 * statt seines Ablaufs: table.roll(setup) gefolgt von einer table.step()-
 * Schleife bis zum Stillstand rechnet den Wurf vollständig durch, danach
 * wird einmal gemalt. Die Physik läuft dabei unverändert durch — es
 * entfallen die Bilder, nicht die Rechnung. BEWUSST NICHT
 * table.runToRest(): diese Methode nimmt selbst kein setup entgegen und
 * würde das übergebene setup (Wurfkraft, geschüttelte Lage) verwerfen —
 * ein eigener Fund vor Auslieferung (DECISIONS.md 2026-09-07 10:23).
 *
 * --cr-* AN DEN WÜRFELGRUPPEN HAT GENAU EINEN SCHREIBER: DIESE DATEI
 * ---------------------------------------------------------------------
 * paint() ist die einzige Stelle im gesamten Projekt, die --cr-x, --cr-y,
 * --cr-h, --cr-m11…--cr-m22, --cr-sx und --cr-sy an einer Würfelgruppe
 * schreibt (Prüfung V-2). throw-input.js bewegt die Würfel beim Aufnehmen und
 * Schütteln über eine eigene, unabhängige Inline-Eigenschaft
 * (style.transform) — nie über diese Custom Properties — und räumt sie beim
 * Loslassen wieder ab, damit die hier geschriebenen Werte anschließend wieder
 * wirken.
 */

import { tipFaces } from '@phomo17/craps/dice-geometry.js';
import { DT, MAX_CATCHUP_STEPS } from '@phomo17/craps/dice-physics.js';

/**
 * @param {Element} root das [data-cr-tray]
 * @param {import('@phomo17/craps/dice-physics.js').DiceTable} table die Physik
 * @param {{onRest?: function({faces: number[], sum: number, valid: boolean}): void,
 *          reducedMotion?: function(): boolean}} options
 * @returns {{throwDice: function(?Array<object>): boolean,
 *            paint: function(): void,
 *            destroy: function(): void,
 *            ok: boolean}}
 *   ok ist false GENAU DANN, wenn nicht für jeden Würfel der Physik eine
 *   Gruppe [data-cr-die="i"] im Markup steht — craps.js prüft das VOR dem
 *   ersten Wurf und sperrt den Tisch, statt mitten in einem eingeleiteten
 *   Wurf abzubrechen (dieselbe Vorsorge wie beim anderen Tisch).
 */
export function connectDice(root, table, options = {}) {
	const { onRest = null, reducedMotion = null } = options ?? {};

	const pruefeBewegungReduziert = typeof reducedMotion === 'function'
		? reducedMotion
		: () => (globalThis.matchMedia
			? globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false);

	const groups = [];
	const faceUses = [];
	const faces = [];
	let ok = true;
	for (let i = 0; i < table.dice.length; i++) {
		const g = root.querySelector(`[data-cr-die="${i}"]`);
		groups.push(g ?? null);
		faceUses.push(g ? g.querySelector('.cr-die__face') : null);
		faces.push(null);
		if (!g) {
			ok = false;
		}
	}

	let raf = 0;
	let last = 0;
	let carryMs = 0;

	/** Die Verkürzung beim Kippen, rein optisch. Ändert kein Ergebnis. */
	function kippBild(die) {
		const f = Math.max(0.06, Math.abs(1 - 2 * die.tipPhase));
		if (die.tipDir === 0 || die.tipDir === 1) {
			return { sx: f, sy: 1 };
		}
		return { sx: 1, sy: f };
	}

	/** Welche Fläche ab der Hälfte eines Kippschritts schon gezeigt wird. */
	function vorschauFlaeche(die) {
		return tipFaces(die.top, die.front, die.right, die.tipDir)[0];
	}

	/** Genau das, und nichts weiter. */
	function paint() {
		for (let i = 0; i < table.dice.length; i++) {
			const die = table.dice[i];
			const g = groups[i];
			if (!g) {
				continue;
			}
			g.style.setProperty('--cr-x', String(die.x));
			g.style.setProperty('--cr-y', String(die.y));
			g.style.setProperty('--cr-h', String(die.h));
			g.style.setProperty('--cr-m11', String(die.bx));
			g.style.setProperty('--cr-m12', String(die.by));
			g.style.setProperty('--cr-m21', String(-die.by));
			g.style.setProperty('--cr-m22', String(die.bx));
			const k = kippBild(die);
			g.style.setProperty('--cr-sx', String(k.sx));
			g.style.setProperty('--cr-sy', String(k.sy));
			const face = die.tipPhase < 0.5 ? die.top : vorschauFlaeche(die);
			if (faces[i] !== face) {
				faces[i] = face;
				if (faceUses[i]) {
					faceUses[i].setAttribute('href', `#cr-face-${face}`);
				}
			}
		}
	}

	/** @param {number} now performance.now()-Zeitstempel von requestAnimationFrame */
	function bild(now) {
		if (last === 0) {
			last = now;
		}
		let uebrig = carryMs + (now - last);
		last = now;
		let schritte = 0;
		while (uebrig >= DT * 1000 && schritte < MAX_CATCHUP_STEPS) {
			table.step();
			uebrig -= DT * 1000;
			schritte += 1;
		}
		carryMs = uebrig;
		paint();

		if (table.phase === 'rollt') {
			raf = globalThis.requestAnimationFrame(bild);
			return;
		}
		raf = 0;
		last = 0;
		carryMs = 0;
		if (typeof onRest === 'function') {
			onRest(table.result());
		}
	}

	function starteSchleife() {
		last = 0;
		carryMs = 0;
		if (raf === 0) {
			raf = globalThis.requestAnimationFrame(bild);
		}
	}

	/** Bei document.hidden hält die Schleife an, der Zeitübertrag wird verworfen. */
	function onVisibilityChange() {
		if (globalThis.document?.hidden) {
			if (raf !== 0) {
				globalThis.cancelAnimationFrame(raf);
				raf = 0;
			}
			carryMs = 0;
			last = 0;
			return;
		}
		if (table.phase === 'rollt' && raf === 0) {
			starteSchleife();
		}
	}
	globalThis.document?.addEventListener('visibilitychange', onVisibilityChange);

	/**
	 * @param {?Array<object>} setup wie DiceTable.roll()
	 * @returns {boolean}
	 */
	function throwDice(setup = null) {
		if (!ok) {
			return false;
		}
		if (pruefeBewegungReduziert()) {
			// NICHT table.runToRest(): das nähme, falls noch kein Wurf läuft,
			// IMMER this.roll() OHNE Argument — das übergebene setup (Wurfkraft,
			// Lage aus dem Schütteln) ginge dabei verloren. Stattdessen wird
			// derselbe Ablauf hier mit dem setup nachgebildet.
			if (table.phase !== 'rollt') {
				const gestartet = table.roll(setup);
				if (!gestartet) {
					return false;
				}
			}
			while (table.phase === 'rollt') {
				table.step();
			}
			const ergebnis = table.result();
			paint();
			if (typeof onRest === 'function') {
				onRest(ergebnis);
			}
			return true;
		}
		const gestartet = table.roll(setup);
		if (!gestartet) {
			return false;
		}
		starteSchleife();
		return true;
	}

	function destroy() {
		if (raf !== 0) {
			globalThis.cancelAnimationFrame(raf);
			raf = 0;
		}
		globalThis.document?.removeEventListener('visibilitychange', onVisibilityChange);
	}

	return { throwDice, paint, destroy, ok };
}

export default connectDice;
