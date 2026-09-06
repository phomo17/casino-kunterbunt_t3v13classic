/**
 * Coin Pusher – Zufallsziehung
 * ==========================================
 *
 * Anhang E (B.15) verlangt wörtlich beides: „Die Zufallsfolge ist im Spiel
 * crypto-basiert, im Messskript gesetzt (Startwert dokumentiert)."
 * crypto.getRandomValues ist die Zufallsquelle des Browsers; sie ist nicht
 * wiederholbar — das ist im Spiel erwünscht und für den Nachweis unbrauchbar.
 * Für den Nachweis braucht es einen GESETZTEN Geber: gleicher Startwert →
 * gleiche Folge → wiederholbarer Lauf. Deshalb stehen beide in einer Datei,
 * und der Aufrufer entscheidet, welchen er einspeist.
 *
 * Dieses Modul hat keine Importe. Node kennt die Import-Map von TYPO3 nicht
 * und könnte einen Namen wie '@phomo17/coin-pusher/…' nicht auflösen.
 * Dieselbe Regel gilt schon für video_slot/rng.js und video_slot/paytable.js.
 * Importfrei heißt: dieselbe Datei, mit der der Browser spielt, lässt sich
 * in Node über ihre Dateiadresse laden — genau das macht den Nachweis
 * überhaupt beweiskräftig.
 *
 * Ein gesetzter Geber muss auf JEDER JavaScript-Maschine Bit für Bit dieselbe
 * Folge liefern, sonst ist der Determinismus-Nachweis wertlos. sfc32 rechnet
 * ausschließlich mit vorzeichenlosen 32-Bit-Ganzzahlen (>>> 0, Math.imul, <<,
 * ^, +); diese Rechenarten sind in der Sprachnorm exakt festgelegt. Jede
 * Kommazahl-Funktion (Math.sin, Math.pow, Math.exp, Math.hypot …) ist es
 * NICHT — sie darf je nach Maschine um das letzte Bit abweichen. Deshalb
 * kommt in dieser Datei und in field.js keine davon vor.
 */

/** 2^32 – der Wertebereich einer vorzeichenlosen 32-Bit-Zahl. */
const RANGE = 4294967296;

/** Wiederverwendeter Puffer. JavaScript läuft einfädig, das ist gefahrlos. */
const buffer = new Uint32Array(1);

/**
 * Liefert die Zufallsquelle des Browsers oder wirft.
 *
 * @returns {Crypto}
 * @throws {Error} wenn der Browser keine sichere Zufallsquelle anbietet
 */
function source() {
	const provider = globalThis.crypto;
	if (provider === undefined || typeof provider.getRandomValues !== 'function') {
		throw new Error(
			'crypto.getRandomValues steht nicht zur Verfügung. Der Coin Pusher spielt '
			+ 'nicht ohne sichere Zufallsquelle (CONCEPT.md Anhang E).'
		);
	}
	return provider;
}

/**
 * Prüft einmalig, ob gespielt werden kann.
 *
 * @returns {boolean}
 */
export function isAvailable() {
	try {
		source();
		return true;
	} catch {
		return false;
	}
}

/**
 * Der Geber des SPIELS: eine vorzeichenlose 32-Bit-Zufallszahl aus der
 * Zufallsquelle des Browsers. Nicht wiederholbar – genau so gewollt.
 *
 * @returns {number} ganze Zahl aus [0, 2^32)
 */
export function drawUint32() {
	const provider = source();
	provider.getRandomValues(buffer);
	return buffer[0];
}

/**
 * Der Geber des NACHWEISES: sfc32, mit einem Startwert gesetzt.
 *
 * Der Startwert wird über einen kleinen Streuschritt (splitmix32) auf die
 * vier inneren Zustandswörter verteilt, damit ein glatter Startwert wie 1
 * nicht in einer auffällig kurzen Anlaufphase mündet. Anschließend werden
 * zwölf Werte verworfen (Einlauf).
 *
 * @param {number} seed ganze Zahl ab 0
 * @returns {() => number} liefert je Aufruf eine ganze Zahl aus [0, 2^32)
 */
export function createSeeded(seed) {
	if (!Number.isInteger(seed) || seed < 0 || seed >= RANGE) {
		throw new RangeError(`createSeeded() erwartet eine ganze Zahl aus [0, 2^32), bekam: ${String(seed)}`);
	}

	let s = seed >>> 0;
	const mix = () => {
		s = (s + 0x9e3779b9) >>> 0;
		let z = s;
		z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
		z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
		return (z ^ (z >>> 15)) >>> 0;
	};

	let a = mix(), b = mix(), c = mix(), d = mix();

	const next = () => {
		const t = (a + b + d) >>> 0;
		d = (d + 1) >>> 0;
		a = (b ^ (b >>> 9)) >>> 0;
		b = (c + (c << 3)) >>> 0;
		c = ((c << 21) | (c >>> 11)) >>> 0;
		c = (c + t) >>> 0;
		return t;
	};

	for (let i = 0; i < 12; i++) { next(); }
	return next;
}

/**
 * Ganze Zahl aus [0, bound) ohne Modulo-Bias, aus einem beliebigen
 * uint32-Geber. Verwerfungsverfahren wie in video_slot/rng.js.
 *
 * @param {() => number} draw
 * @param {number} bound obere Grenze, ausschließlich; ganze Zahl ab 1
 * @returns {number} ganze Zahl aus [0, bound)
 */
export function below(draw, bound) {
	if (!Number.isInteger(bound) || bound < 1 || bound > RANGE) {
		throw new RangeError(`below() erwartet eine ganze Zahl von 1 bis 2^32, bekam: ${String(bound)}`);
	}

	const limit = RANGE - (RANGE % bound);

	let value;
	do {
		value = draw();
	} while (value >= limit);

	return value % bound;
}
