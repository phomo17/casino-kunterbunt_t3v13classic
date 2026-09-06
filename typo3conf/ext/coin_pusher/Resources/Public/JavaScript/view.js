/**
 * Coin Pusher – die Zeichenfläche
 * ====================================================
 *
 * Die einzige Datei, die malt. Sie kennt die Physik nur lesend und
 * verändert an ihr nichts.
 *
 * DIE ACHSEN. Im Feld läuft y von der Abwurfkante (0) nach hinten
 * (FIELD_DEPTH). Auf dem Bildschirm liegt hinten oben. Deshalb
 * toCanvasY(y) = (FIELD_DEPTH + DRAW_TOP − y) · scale: y = 0 landet am
 * unteren Rand, y = FIELD_DEPTH DRAW_TOP Einheiten unter dem oberen. Ohne
 * diese Spiegelung schöbe die Platte nach oben aus dem Bild heraus.
 *
 * KEIN requestAnimationFrame in dieser Datei. Wer wann malt, entscheidet
 * pusher.js. Ohne diese Trennung hinge die Physik an der Zeichenschleife,
 * und der Determinismus wäre dahin.
 *
 * SEIT DEM UMBAU AUF ZWEI EBENEN (Lauf 1): das Feld selbst hat zwei Ebenen
 * (field.js), aber diese Ansicht bildet weiterhin nur eine gespiegelte
 * DRAUFSICHT ab – bewusst noch NICHT umgebaut, siehe DRAW_TOP unten. Ein
 * Stapel ist nur an einem zweiten, schwächeren Schatten zu erkennen, die
 * Stufe zwischen den Ebenen nur an einer Linie. Der perspektivische Umbau
 * ist Lauf 2 (PLAN-coin-pusher-zwei-ebenen-part-2.md, Abschnitt 4.10).
 */

import { FIELD_WIDTH, FIELD_DEPTH, DECK_HEIGHT, FRONT_ZONE_DEPTH, PIN_ROWS, PIN_STEP, SLOT_X, COIN_VALUES }
	from '@phomo17/coin-pusher/field.js';

/** Wie weit die Zeichnung seitlich über den Feldboden hinausgeht: der Platz
 *  der beiden Verlustschächte. */
export const DRAW_MARGIN_X = 6;

/**
 * Das Seitenverhältnis des Sichtfelds im Gehäuse: 84 x 48,6 Rastereinheiten
 * (machine.css, Koordinatentabelle), also 140 : 81. Diese Zahl ist
 * GESTALTUNG und wird von diesem Umbau nicht angefasst – A-10 in
 * verify-cabinet.mjs gleicht sie gegen .cp-field ab.
 */
export const VIEW_RATIO = 140 / 81;

/**
 * Streifen über der hintersten Lage der Platte, in dem der Stift-Slalom
 * sitzt.
 *
 * ABGELEITET, nicht gewählt. Mit der vierten Auslegung ändern sich
 * FIELD_WIDTH und FIELD_DEPTH; bliebe DRAW_TOP eine feste 8, änderte sich
 * das Verhältnis DRAW_WIDTH : DRAW_HEIGHT, A-10 schlüge fehl und das Bild
 * wäre verzerrt. DRAW_TOP ist deshalb der Streifen, der genau VIEW_RATIO
 * herstellt. In Lauf 2 entfällt diese Ableitung wieder, weil die
 * Zeichenfläche dann ein Projektionsziel und keine skalierte Draufsicht mehr
 * ist.
 */
export const DRAW_TOP = (FIELD_WIDTH + 2 * DRAW_MARGIN_X) / VIEW_RATIO - FIELD_DEPTH;

export const DRAW_WIDTH = FIELD_WIDTH + 2 * DRAW_MARGIN_X;
export const DRAW_HEIGHT = FIELD_DEPTH + DRAW_TOP;

/**
 * Feldkoordinate → Zeichenflächenkoordinate (x-Achse). Reine Funktion,
 * damit der Nachweis sie ohne Browser prüfen kann.
 *
 * @param {number} x
 * @param {number} scale
 * @returns {number}
 */
export function toCanvasX(x, scale) {
	return (x + DRAW_MARGIN_X) * scale;
}

/**
 * Feldkoordinate → Zeichenflächenkoordinate (y-Achse), gespiegelt: hinten
 * (großes y) liegt auf dem Bildschirm oben.
 *
 * @param {number} y
 * @param {number} scale
 * @returns {number}
 */
export function toCanvasY(y, scale) {
	return (FIELD_DEPTH + DRAW_TOP - y) * scale;
}

/**
 * Malreihenfolge: von hinten nach vorn, von unten nach oben.
 *
 * Reine Funktion, damit der Nachweis sie ohne Browser prüfen kann. Sie
 * liefert Spaltennummern, nicht Münzen – kopiert wird nichts.
 *
 * Die drei Stufen der Sortierung, jede mit ihrem Grund:
 *   1. y absteigend: was weiter hinten liegt, wird zuerst gemalt und danach
 *      von allem Näheren überdeckt (Malerverfahren).
 *   2. bei gleichem y: z aufsteigend – in einem Stapel wird die unterste
 *      Münze zuerst gemalt.
 *   3. bei gleichem y und z: die Spaltennummer. Nicht weil sie etwas
 *      bedeutete, sondern damit die Reihenfolge überhaupt eindeutig ist:
 *      zwei gleich weit hinten und gleich hoch liegende Münzen dürfen nicht
 *      von Bild zu Bild die Plätze tauschen.
 *
 * @param {import('@phomo17/coin-pusher/field.js').Field} field
 * @returns {number[]}
 */
export function drawOrder(field) {
	const order = [];
	for (let i = 0; i < field.count; i++) { order.push(i); }
	order.sort((a, b) => {
		if (field.y[a] !== field.y[b]) { return field.y[b] - field.y[a]; }
		if (field.z[a] !== field.z[b]) { return field.z[a] - field.z[b]; }
		return a - b;
	});
	return order;
}

/** Die Namen der Farbschlüssel, wie sie auf .cp-field stehen (machine.css,
 *  Abschnitt 1) — dieselbe Reihenfolge, in der draw() sie benutzt. */
const COLOUR_KEYS = [
	'--cp-floor', '--cp-floor-light', '--cp-floor-edge', '--cp-chute',
	'--cp-plate', '--cp-plate-light', '--cp-lip', '--cp-lip-light', '--cp-pin',
	'--cp-shadow',
	'--cp-coin-1-face', '--cp-coin-1-rim',
	'--cp-coin-2-face', '--cp-coin-2-rim',
	'--cp-coin-5-face', '--cp-coin-5-rim',
	'--cp-coin-10-face', '--cp-coin-10-rim', '--cp-coin-10-core',
];

export class FieldView {
	/**
	 * @param {HTMLElement} root das .cp-field
	 * @param {import('@phomo17/coin-pusher/field.js').Field} field das
	 *        Spielfeld — übergeben, nicht selbst geladen: woher es kommt,
	 *        entscheidet store.js
	 */
	constructor(root, field) {
		const canvas = root.querySelector('.cp-field__canvas');
		if (canvas === null) {
			throw new Error('Kein .cp-field__canvas im Feld-Container gefunden.');
		}

		this.root = root;
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.field = field;
		this.colours = {};
		this.scale = 1;

		this.readColours();

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.root);
		this.resize();
	}

	/**
	 * Liest die Farbschlüssel aus CSS. Einmal beim Anlegen und erneut bei
	 * jedem resize() — mehr nicht; getComputedStyle je Bild wäre eine der
	 * teuersten Operationen, die es gibt.
	 *
	 * @returns {void}
	 */
	readColours() {
		const style = globalThis.getComputedStyle(this.root);
		for (const key of COLOUR_KEYS) {
			this.colours[key] = style.getPropertyValue(key).trim();
		}
	}

	/**
	 * Größe der Zeichenfläche an ihre CSS-Größe angleichen.
	 *
	 * Mit devicePixelRatio: ohne ihn sind die Münzen auf einem hoch­
	 * auflösenden Bildschirm unscharf; die Zeichenfläche hat, anders als
	 * SVG, eine feste Bildpunktzahl.
	 *
	 * @returns {void}
	 */
	resize() {
		const cssWidth = this.root.clientWidth;
		const cssHeight = this.root.clientHeight;
		if (cssWidth <= 0 || cssHeight <= 0) {
			return;
		}
		const ratio = globalThis.devicePixelRatio || 1;
		const width = Math.round(cssWidth * ratio);
		const height = Math.round(cssHeight * ratio);
		if (this.canvas.width !== width) {
			this.canvas.width = width;
		}
		if (this.canvas.height !== height) {
			this.canvas.height = height;
		}
		this.scale = this.canvas.width / DRAW_WIDTH;
		this.readColours();
	}

	/**
	 * EIN Bild.
	 *
	 * Malreihenfolge: Verlustschächte, Feldboden, Stift-Slalom, Schubplatte,
	 * Abwurfkante, Münzen.
	 *
	 * @returns {void}
	 */
	draw() {
		const ctx = this.context;
		const scale = this.scale;
		const field = this.field;

		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// --- Verlustschächte und feste Seitenwand ---------------------
		// Nur im vorderen Bereich (y < FRONT_ZONE_DEPTH) existiert der
		// Schacht überhaupt (field.js, applyChuteWalls()); darüber ist Wand.
		const frontTop = toCanvasY(FRONT_ZONE_DEPTH, scale);
		const bottom = toCanvasY(0, scale);
		const wallTop = toCanvasY(FIELD_DEPTH, scale);

		ctx.fillStyle = this.colours['--cp-chute'];
		ctx.fillRect(0, frontTop, toCanvasX(0, scale), bottom - frontTop);
		ctx.fillRect(toCanvasX(FIELD_WIDTH, scale), frontTop,
			toCanvasX(FIELD_WIDTH + DRAW_MARGIN_X, scale) - toCanvasX(FIELD_WIDTH, scale), bottom - frontTop);

		ctx.fillStyle = this.colours['--cp-floor-edge'];
		ctx.fillRect(0, wallTop, toCanvasX(0, scale), frontTop - wallTop);
		ctx.fillRect(toCanvasX(FIELD_WIDTH, scale), wallTop,
			toCanvasX(FIELD_WIDTH + DRAW_MARGIN_X, scale) - toCanvasX(FIELD_WIDTH, scale), frontTop - wallTop);

		// --- Feldboden ---------------------------------------------------
		const floorLeft = toCanvasX(0, scale);
		const floorWidth = toCanvasX(FIELD_WIDTH, scale) - floorLeft;
		ctx.fillStyle = this.colours['--cp-floor'];
		ctx.fillRect(floorLeft, wallTop, floorWidth, bottom - wallTop);
		ctx.fillStyle = this.colours['--cp-floor-light'];
		ctx.fillRect(floorLeft, wallTop, floorWidth, Math.max(1, 1.2 * scale));

		// --- Stift-Slalom (Zierrat) ---------------------------------------
		// Ausdrücklich Zierrat: die Physik rechnet den Slalom als
		// Galtonbrett und hat keine Stiftkörper (DECISIONS.md, Phase 8).
		// Hier wird nichts kollidiert, nur gemalt.
		ctx.fillStyle = this.colours['--cp-pin'];
		const pinRadius = 0.5 * scale;
		const rowHeight = DRAW_TOP / PIN_ROWS;
		for (let row = 0; row < PIN_ROWS; row++) {
			const count = row % 2 === 0 ? 5 : 4;
			const y = toCanvasY(FIELD_DEPTH + (row + 0.5) * rowHeight, scale);
			for (let k = 0; k < count; k++) {
				const fieldX = SLOT_X + (k - (count - 1) / 2) * PIN_STEP;
				const x = toCanvasX(fieldX, scale);
				ctx.beginPath();
				ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// --- Schubplatte / Grenze zur oberen Ebene -------------------------
		// Diese Linie markiert zugleich, wo die obere Ebene beginnt: was
		// dahinter (bildschirmoben) liegt, ist NICHT mehr Teil der unteren
		// Ebene, sondern die Oberseite des Blocks. In Lauf 1 bleibt das eine
		// einzelne Linie statt eines gezeichneten Absatzes – das ist die
		// Trennstelle zu Lauf 2 (perspektivischer Umbau), siehe field.js.
		const plateTop = toCanvasY(field.plateY(), scale);
		ctx.fillStyle = this.colours['--cp-plate'];
		ctx.fillRect(floorLeft, 0, floorWidth, plateTop);
		ctx.fillStyle = this.colours['--cp-plate-light'];
		ctx.fillRect(floorLeft, Math.max(0, plateTop - 1.2 * scale), floorWidth, Math.max(1, 1.2 * scale));

		// --- Abwurfkante ---------------------------------------------------
		const lipHeight = Math.max(1, 1.4 * scale);
		ctx.fillStyle = this.colours['--cp-lip'];
		ctx.fillRect(floorLeft, bottom - lipHeight, floorWidth, lipHeight);
		ctx.fillStyle = this.colours['--cp-lip-light'];
		ctx.fillRect(floorLeft, bottom - lipHeight, floorWidth, Math.max(1, 0.4 * scale));

		// --- Münzen -----------------------------------------------------
		// Reihenfolge über drawOrder(): von hinten nach vorn, in einem Stapel
		// von unten nach oben — ohne das flackern Stapel, weil welche Münze
		// oben liegt sonst von der zufälligen Spaltennummer abhinge (die sich
		// bei jedem remove() ändert). Der zweite, schwächere Schatten macht
		// eine Münze der OBEREN Ebene (z >= DECK_HEIGHT) sichtbar, solange die
		// Ansicht noch die flache Draufsicht ist (Trennstelle zu Lauf 2).
		const order = drawOrder(field);
		for (let k = 0; k < order.length; k++) {
			const i = order[k];
			const value = field.value[i];
			const r = field.r[i] * scale;
			const x = toCanvasX(field.x[i], scale);
			const y = toCanvasY(field.y[i], scale);

			if (field.z[i] >= DECK_HEIGHT) {
				ctx.globalAlpha = 0.18;
				ctx.fillStyle = this.colours['--cp-shadow'];
				ctx.beginPath();
				ctx.arc(x, y + 1.1 * scale, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
			}

			// Schatten, leicht nach unten (in Bildschirmrichtung) versetzt.
			ctx.globalAlpha = 0.35;
			ctx.fillStyle = this.colours['--cp-shadow'];
			ctx.beginPath();
			ctx.arc(x, y + 0.5 * scale, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;

			ctx.fillStyle = this.colours[`--cp-coin-${value}-face`];
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();

			ctx.strokeStyle = this.colours[`--cp-coin-${value}-rim`];
			ctx.lineWidth = 0.28 * r;
			ctx.stroke();

			if (value === COIN_VALUES[COIN_VALUES.length - 1]) {
				ctx.fillStyle = this.colours['--cp-coin-10-core'];
				ctx.beginPath();
				ctx.arc(x, y, 0.55 * r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	/** Meldet den ResizeObserver ab. */
	destroy() {
		this.resizeObserver.disconnect();
	}
}

export default FieldView;
