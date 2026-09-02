/**
 * Video Slot – Zufallsziehung
 * ==========================================
 *
 * Die einzige Stelle im Automaten, an der gewürfelt wird.
 *
 * CONCEPT.md Abschnitt 6, Phase 6 verlangt ausdrücklich
 * crypto.getRandomValues. Math.random() gibt es hier bewusst nicht — auch
 * nicht als Rückfalloption. Eine stille Rückfalloption würde die Zusage
 * „jede der 25 Positionen gleich wahrscheinlich" unbemerkt aufweichen, und
 * genau darauf steht die Auszahlungsquote von 97,993 % (Anhang D).
 *
 * Eigene Kopie der Bauform aus reel_slot/rng.js — nichts aus reel_slot wird
 * importiert (die beiden Extensions bleiben unabhängig; Gemeinsames gehörte
 * ins Site Package, und ein Zufallsgenerator ist kein Gestaltungsbaustein).
 *
 * Dieses Modul hat keine Importe. Es ist damit auch außerhalb des Browsers
 * lesbar und prüfbar.
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
			+ 'nicht ohne sichere Zufallsquelle (CONCEPT.md Abschnitt 6, Phase 6).'
		);
	}
	return provider;
}

/**
 * Prüft einmalig, ob gespielt werden kann.
 *
 * video-slot.js fragt das beim Start ab und verdrahtet das Gehäuse gar nicht
 * erst, wenn die Antwort nein lautet — lieber ein stiller Automat als einer,
 * der bei jedem Tastendruck einen Fehler in die Konsole schreibt.
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
 * Warum das Verwerfungsverfahren: 2^32 ist nicht durch 25 teilbar
 * (2^32 mod 25 = 21). Ein schlichtes „wert % 25" würde die ersten 21
 * Positionen um den Faktor 1 + 21/2^32 bevorzugen. Das ist winzig, aber es
 * ist eine Abweichung von „jede der 25 Rasterpositionen gleich
 * wahrscheinlich", und genau diese Gleichverteilung ist die Voraussetzung
 * der Zahlen aus Anhang D. Deshalb wird der überstehende Rest verworfen und
 * neu gezogen. Die Verwerfungswahrscheinlichkeit liegt bei 21 / 2^32, also
 * rund 1 zu 204,5 Millionen; die Schleife läuft praktisch immer genau
 * einmal.
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
