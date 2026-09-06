/**
 * Roulette – die Radanordnung
 * ===========================
 *
 * CONCEPT.md Anhang F, wörtlich. Die Reihenfolge ist die des amerikanischen
 * Rades und keine erfundene; sie ist Teil der Physik, weil benachbarte Fächer
 * im Modell auch benachbart sein müssen (C.6.1).
 *
 * KEIN IMPORT, KEIN DOKUMENT
 * --------------------------
 * Kein import, kein document, kein window, kein Math.random. Diese Datei wird
 * von den Prüfskripten unmittelbar unter Node geladen — Node kennt die
 * Import-Map von TYPO3 nicht. Dieselbe Regel wie bei table-chips.js im Site
 * Package.
 *
 * WARUM DIE FÄCHER ZEICHENKETTEN SIND UND KEINE ZAHLEN
 * ----------------------------------------------------
 * '00' ist keine Zahl: 00 === 0 wäre wahr, und die doppelte Null wäre
 * verschwunden. Anhang F verlangt 38 UNTERSCHEIDBARE Fächer. Die Beschriftung
 * ist deshalb durchgehend eine Zeichenkette, auch bei '17'. Wer rechnen will
 * (Phase C3: gerade/ungerade, 1–18/19–36), wandelt an genau der Stelle um und
 * behandelt '0' und '00' vorher gesondert — an einem echten Tisch gewinnen
 * beide bei keiner einfachen Chance.
 */

/**
 * Die 38 Fächer im Uhrzeigersinn, beginnend bei der Null (Anhang F).
 * Fach mit dem Zeiger 0 liegt in der Zeichnung auf zwölf Uhr.
 */
export const WHEEL_ORDER = Object.freeze([
	'0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
	'5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
	'27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
	'21', '33', '16', '4', '23', '35', '14', '2',
]);

/** Die roten Zahlen (Anhang F). */
export const RED = Object.freeze([
	'1', '3', '5', '7', '9', '12', '14', '16', '18',
	'19', '21', '23', '25', '27', '30', '32', '34', '36',
]);

/** Die schwarzen Zahlen (Anhang F). */
export const BLACK = Object.freeze([
	'2', '4', '6', '8', '10', '11', '13', '15', '17',
	'20', '22', '24', '26', '28', '29', '31', '33', '35',
]);

/** Die beiden grünen Fächer (Anhang F). Sie liegen sich gegenüber. */
export const GREEN = Object.freeze(['0', '00']);

/**
 * Die Farbe eines Fachs.
 * @param {string} label Beschriftung aus WHEEL_ORDER
 * @returns {'red'|'black'|'green'}
 */
export function colourOf(label) {
	if (GREEN.includes(label)) {
		return 'green';
	}
	if (RED.includes(label)) {
		return 'red';
	}
	if (BLACK.includes(label)) {
		return 'black';
	}
	throw new RangeError(`Unbekanntes Fach: "${String(label)}"`);
}

/**
 * Die Beschriftung des Fachs mit diesem Zeiger.
 * @param {number} index 0 bis 37
 * @returns {string}
 */
export function labelOf(index) {
	if (!Number.isInteger(index) || index < 0 || index >= WHEEL_ORDER.length) {
		throw new RangeError(`Fachzeiger außerhalb 0…${WHEEL_ORDER.length - 1}: ${String(index)}`);
	}
	return WHEEL_ORDER[index];
}

/**
 * Der Drehwinkel eines Fachs in Grad, gemessen von zwölf Uhr im
 * Uhrzeigersinn — genau der Winkel, mit dem die Zeichnung ihr Fach dreht.
 * Wird auch von Classes/WheelGeometry.php gerechnet; verify-wheel.mjs
 * vergleicht beide Rechnungen Fach für Fach.
 * @param {number} index 0 bis 37
 * @returns {number}
 */
export function angleOf(index) {
	labelOf(index);
	return (index * 360) / WHEEL_ORDER.length;
}
