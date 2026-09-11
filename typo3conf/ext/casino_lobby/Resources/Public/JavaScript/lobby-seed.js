/**
 * Casino Kunterbunt – die Saat einer Lobby-Runde (CONCEPT.md D.10.4, C.5.2)
 * =========================================================================
 *
 * KEIN IMPORT, KEIN DOKUMENT. Diese Datei wird von einem Prüfskript
 * unmittelbar unter Node geladen — dieselbe Regel wie für risk-timing.js,
 * table-chips.js, table-bets.js und table-round.js im Site Package. Ein
 * Import über einen Kartennamen wäre für Node nicht auflösbar.
 *
 * WOZU. Der Server zieht zu Rundenbeginn eine Saat (random_bytes(8), als
 * 16 Hex-Zeichen) und schickt sie an alle. Jeder Browser macht daraus
 * dieselbe Zahl und daraus dieselbe Folge — und rechnet deshalb dieselbe
 * Simulation. Kein Mitspieler kann die Saat wählen.
 *
 * WARUM createSeeded HIER NOCH EINMAL STEHT, OBWOHL JEDER TISCH ES SCHON
 * HAT: die drei rng.js der Tische sind Teil ihrer Extension und werden in D5
 * gebraucht; diese Datei ist die REFERENZ, gegen die geprüft wird. Der
 * Nachweis lädt alle vier unter Node und vergleicht 1000 Ziehungen Zahl für
 * Zahl. Wären es dieselbe Datei, bewiese der Vergleich nichts; sind es
 * verschiedene und stimmen sie überein, ist die Grundannahme von D.10.4
 * tatsächlich belegt.
 */

/**
 * Aus der Saat (Hex-Zeichenkette) eine vorzeichenlose 32-Bit-Zahl.
 *
 * FNV-1a, weil er kurz, in der Sprachnorm eindeutig festgelegt (Math.imul,
 * ^, >>> auf 32 Bit) und damit auf jeder Maschine gleich ist. Er ist KEINE
 * Zufallsquelle und soll keine sein — der Zufall steckt in der Saat, die vom
 * Server kommt.
 *
 * @param {string} hex
 * @returns {number}
 */
export function saatZuZahl(hex) {
	let h = 0x811c9dc5;
	const text = String(hex ?? '');
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

/**
 * Der aussäbare Geber. BITGENAU DERSELBE wie createSeeded() in
 * roulette/rng.js, craps/rng.js und blackjack/rng.js — nachgeprüft vom
 * Prüfskript, nicht behauptet.
 *
 * @param {number} seed
 * @returns {function(): number}
 */
export function createSeeded(seed) {
	let counter = seed >>> 0;
	return function () {
		counter = (counter + 0x9e3779b9) >>> 0;
		let z = counter;
		z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
		z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
		return (z ^ (z >>> 15)) >>> 0;
	};
}

/**
 * Die Probeziehung einer Runde: die ersten drei Ziehungen aus der Saat, auf
 * 0–36 gebracht, als "12-4-31".
 *
 * SIE IST KEIN SPIELERGEBNIS und wird niemandem angezeigt. Sie ist der
 * Vergleichswert, an dem sich zeigt, ob zwei Browser wirklich dasselbe
 * rechnen (D.10.4). In D4 ist sie zugleich das Ergebnis, das der Melder
 * festschreibt — es gibt noch kein anderes. In D5 tritt das echte Ergebnis
 * des Tisches an ihre Stelle, und die Probe bleibt als Vergleichswert.
 *
 * Gezogen wird mit dem VERWERFUNGSVERFAHREN, nicht per Restdivision
 * (C.5.2) — auch hier, wo es nur um einen Vergleichswert geht: eine zweite,
 * schlampigere Ziehweise im Haus wäre eine Vorlage zum Abschreiben.
 *
 * @param {string} hex
 * @param {number} [anzahl]
 * @returns {string}
 */
export function probe(hex, anzahl = 3) {
	const zieh = createSeeded(saatZuZahl(hex));
	const GRENZE = 37;
	const OBERSTE = Math.floor(4294967296 / GRENZE) * GRENZE;   // Verwerfungsschwelle
	const zahlen = [];
	while (zahlen.length < anzahl) {
		const roh = zieh();
		if (roh < OBERSTE) {
			zahlen.push(roh % GRENZE);
		}
	}
	return zahlen.join('-');
}
