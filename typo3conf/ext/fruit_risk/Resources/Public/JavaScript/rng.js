/**
 * FruitRisk – Zufallsziehung
 * ==========================
 *
 * Die einzige Stelle im Automaten, an der gewürfelt wird.
 *
 * CONCEPT.md C.14.14 verlangt ausdrücklich crypto.getRandomValues.
 * Math.random() gibt es hier bewusst nicht — auch nicht als Rückfalloption.
 * Eine stille Rückfalloption würde die Zusage „jede der 20 Bandpositionen
 * gleich wahrscheinlich" unbemerkt aufweichen, und genau darauf steht die
 * über 64.000.000 Stellungen ausgezählte Quote von 97,8952 % (README.md,
 * Abschnitt „Walzenbänder und Quote").
 *
 * Gleiche Bauform wie in den übrigen Automaten dieses Projekts (video_slot,
 * reel_slot) — nichts wird von dort importiert, die Extensions bleiben
 * unabhängig; ein Zufallsgenerator ist kein Gestaltungsbaustein, den man
 * teilt.
 *
 * Dieses Modul hat keine Importe. Es ist damit auch außerhalb des Browsers
 * lesbar und prüfbar (Resources/Private/Scripts/verify-credit.mjs).
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
			'crypto.getRandomValues steht nicht zur Verfügung. Der Automat spielt '
			+ 'nicht ohne sichere Zufallsquelle (CONCEPT.md C.14.14).'
		);
	}
	return provider;
}

/**
 * Prüft einmalig, ob gespielt werden kann.
 *
 * fruit-risk.js fragt das beim Start ab und verdrahtet das Gehäuse gar nicht
 * erst, wenn die Antwort nein lautet — die Tafel zeigt dann AUSSER BETRIEB,
 * dauerhaft, statt bei jedem Tastendruck einen Fehler in die Konsole zu
 * schreiben.
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
 * Zieht eine ganze Zahl aus [0, bound) – gleichverteilt, ohne Modulo-Bias.
 *
 * Warum das Verwerfungsverfahren: 2^32 ist nicht durch 20 teilbar
 * (2^32 mod 20 = 16). Ein schlichtes „wert % 20" würde die ersten 16
 * Positionen um den Faktor 1 + 16/2^32 bevorzugen. Das ist winzig, aber es
 * ist eine Abweichung von „jede der 20 Rasterpositionen gleich
 * wahrscheinlich", und genau diese Gleichverteilung ist die Voraussetzung der
 * über 64.000.000 Stellungen ausgezählten Quote. Deshalb wird der
 * überstehende Rest verworfen und neu gezogen. Die Verwerfungswahrschein-
 * lichkeit liegt bei 16 / 2^32, also rund 1 zu 268 Millionen; die Schleife
 * läuft praktisch immer genau einmal.
 *
 * @param {number} bound obere Grenze, ausschließlich; ganze Zahl ab 1
 * @returns {number} ganze Zahl aus [0, bound)
 * @throws {RangeError|Error}
 */
export function drawIndex(bound) {
	if (!Number.isInteger(bound) || bound < 1 || bound > RANGE) {
		throw new RangeError(`drawIndex() erwartet eine ganze Zahl von 1 bis 2^32, bekam: ${String(bound)}`);
	}

	const provider = source();
	const limit = RANGE - (RANGE % bound);

	let value;
	do {
		provider.getRandomValues(buffer);
		value = buffer[0];
	} while (value >= limit);

	return value % bound;
}

export default drawIndex;
