/**
 * Casino Kunterbunt – die Schwierigkeitskurve der Risiko-Leiter
 * =============================================================
 *
 * Nur Arithmetik. Diese Datei kennt kein Gerät, kein Gehäuse, keinen Gewinn
 * und keine Taste. Sie beantwortet genau eine Frage:
 *
 *     Wie lange ist auf Stufe n eine Seite an der Reihe, und wie lange davon
 *     brennt ihr Lichtfeld wirklich?
 *
 * Sie liegt seit Ausbaustufe 2, Phase 2 im Site Package und nicht mehr in einer
 * Automaten-Extension: mehrere Geräte benutzen dieselbe Leiter (CONCEPT.md
 * B.6.2), und die Sicherheitsgrenze soll genau EINMAL bewiesen werden, nicht je
 * Gerät erneut.
 *
 *
 * WARUM DAS EINE EIGENE DATEI IST — UND WARUM SIE NIE EINEN IMPORT BEKOMMT
 * ------------------------------------------------------------------------
 * CONCEPT.md Teil A 3.4 und Teil B 6.1 setzen eine harte Sicherheitsgrenze:
 * 200 ms je Seite dürfen NIE unterschritten werden. Eine Zusage, die man nur
 * behaupten kann, ist keine.
 *
 * Node kann diese Datei laden und alle Stufen durchrechnen, weil sie keinen
 * Namen aus der Import-Map von TYPO3 auflösen muss. Der Nachweis steht in
 * Resources/Private/Scripts/verify-risk-timing.mjs und rechnet mit DIESER
 * Datei — nicht mit einer Nachbildung. Eine eigens für die Prüfung geschriebene
 * Formel könnte richtig rechnen, während das Spiel falsch blinkt; dann wäre der
 * Nachweis wertlos.
 *
 * Damit Node die Datei als ES-Modul liest, liegt in diesem Verzeichnis eine
 * package.json mit {"type": "module"}. Der Browser sieht sie nie: die Import-Map
 * des Kerns nimmt ausschließlich .js-Dateien auf.
 *
 *
 * DIE KURVE, WÖRTLICH NACH CONCEPT.md ANHANG B (B.12)
 * ---------------------------------------------------
 *     periode(n) = 200                                  — konstant, auf JEDER Stufe
 *     fenster(n) = max(40, round(200 × 0,85^(n+4)))
 *     dunkel(n)  = 200 − fenster(n)
 *
 *     Stufe   Periode je Seite   Trefferfenster   Dunkelzeit
 *         1             200 ms            89 ms       111 ms
 *         2             200 ms            75 ms       125 ms
 *         3             200 ms            64 ms       136 ms
 *         4             200 ms            54 ms       146 ms
 *         5             200 ms            46 ms       154 ms
 *     ab  6             200 ms            40 ms       160 ms
 *
 *
 * WAS SICH GEGENÜBER TEIL A GEÄNDERT HAT — UND WARUM
 * --------------------------------------------------
 * Die alte Kurve (450 ms Startperiode, je Stufe 10 % schneller bis zum Anschlag
 * bei 200 ms auf Stufe 9, danach schrumpfende Einschaltdauer ab Stufe 10) ist
 * VOLLSTÄNDIG ersetzt. Ihre Stufen 1 bis 9 waren praktisch geschenkt: das
 * Lichtfeld brannte lückenlos, ein Fehlgriff war nur durch Danebengreifen
 * möglich.
 *
 * Auch die erste Fassung der neuen Leiter (Exponent 2n−1, Stufe 1 mit 170 ms)
 * begann dem Auftraggeber noch zu leicht. Sie ist deshalb um VIER Schritte nach
 * vorn gerückt: Stufe 1 ist jetzt so schnell wie dort Stufe 3 (89 ms). Daher
 * steht im Exponenten n+4 — vier Schritte Vorsprung, danach EIN Schritt je Stufe.
 *
 * Warum nicht 2n+3, was auf Stufe 1 dieselben 89 ms ergäbe: jene Form liefe schon
 * auf Stufe 4 in den Boden von 40 ms, die Leiter hätte dann faktisch nur noch
 * drei unterscheidbare Stufen statt sechs. Die gewählte Form VERSCHIEBT die ganze
 * Kurve, statt sie zu stauchen, und lässt den Boden dort, wo er lag: auf Stufe 6.
 *
 * Damit verschwinden ersatzlos: SIDE_START_MS (es gibt keine Startperiode mehr,
 * die Periode ist konstant), SIDE_DECAY (nichts wird mehr schneller), CAP_LEVEL
 * (es gibt keinen Tempo-Anschlag mehr, weil es kein Tempo-Gefälle gibt) und
 * dutyFraction() als eigene Funktion (die Einschaltdauer ist keine treibende
 * Größe mehr, sondern ein Ergebnis). DUTY_DECAY heißt jetzt ON_DECAY: derselbe
 * Zahlenwert 0,85, aber eine ANDERE Bedeutung — er schrumpft nicht mehr einen
 * ANTEIL der Periode, sondern unmittelbar das Trefferfenster in Millisekunden.
 * Der Name musste deshalb mitwandern; ein gleichlautender Name mit neuer
 * Bedeutung wäre eine Falle für den nächsten Leser.
 *
 * Neu ist auch: Dunkelzeit gibt es ab Stufe 1 (111 ms), nicht erst ab Stufe 10.
 * Ein Druck in einem Moment, in dem beide Felder dunkel sind, gilt weiterhin
 * als Fehlgriff (CONCEPT.md 3.4).
 *
 *
 * WARUM DIE GRENZE BAULICH NICHT ZU UNTERSCHREITEN IST
 * ----------------------------------------------------
 * sideMs() endet auf Math.max(SIDE_MIN_MS, SIDE_MS). Die beiden Konstanten sind
 * heute wertgleich, aber sie sind NICHT dasselbe: SIDE_MIN_MS ist die
 * Sicherheitsgrenze aus dem Konzept, SIDE_MS ist die Periode dieser Kurve. Wer
 * eines Tages eine schnellere Kurve haben will und SIDE_MS senkt, kommt an
 * Math.max nicht vorbei — die Grenze hält, ohne dass jemand daran denken muss.
 * Genau dafür steht die Konstante doppelt da.
 *
 * onMs() endet auf Math.max(ON_MIN_MS, …). Math.max liefert für jedes ENDLICHE
 * Argument mindestens ON_MIN_MS. Der einzige Weg daran vorbei wäre NaN, denn
 * Math.max(40, NaN) ist NaN. Deshalb läuft jeder Eingabewert zuerst durch
 * normaliseLevel(), das alles, was keine endliche Zahl ist, auf Stufe 1
 * zurückholt. Es gibt in dieser Datei keinen zweiten Rückgabeweg und keine
 * Bedingung, die an Math.max vorbeiführt.
 *
 * Für sehr hohe Stufen läuft 0,85^(n+4) in den Gleitkomma-Unterlauf und wird zu
 * exakt 0 — kein NaN, keine Ausnahme. Math.max(40, 0) ist 40. Stufe 5000 rechnet
 * deshalb genauso sauber wie Stufe 6.
 *
 *
 * WARUM 200 ms ÜBERHAUPT DIE GRENZE IST
 * -------------------------------------
 * Bei 200 ms je Seite braucht ein EINZELNES Lichtfeld für einen vollen Umlauf
 * 400 ms: es leuchtet, das andere leuchtet, dann wieder dieses. Ein Feld blitzt
 * damit 2,5-mal je Sekunde — unter der Grenze von drei Lichtwechseln je Sekunde,
 * ab der Blinken bei lichtempfindlichen Menschen Anfälle auslösen kann.
 * CONCEPT.md 3.4 und B.6.1 erklären diese Grenze für nicht verhandelbar;
 * Abschnitt 4 nimmt sie ausdrücklich vom Nicht-Ziel „Barrierefreiheit" aus, weil
 * sie eine Sicherheitsgrenze ist und keine Barrierefreiheitsmaßnahme.
 *
 * Nachrechnen, ohne einen Browser zu starten:
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-risk-timing.mjs
 */

/**
 * Die Sicherheitsgrenze: kürzer als so darf eine Seite nie an der Reihe sein.
 * Nicht verhandelbar. Siehe Dateikopf.
 */
export const SIDE_MIN_MS = 200;

/**
 * Die Periode je Seite dieser Kurve — auf jeder Stufe dieselbe.
 *
 * Getrennt von SIDE_MIN_MS gehalten, obwohl beide heute 200 sind: die eine ist
 * die Grenze, die andere die Wahl. Siehe Dateikopf.
 */
export const SIDE_MS = 200;

/** Untergrenze des Trefferfensters. 20 % der Periode, wie in Teil A. */
export const ON_MIN_MS = 40;

/** Schrumpffaktor eines einzelnen Schritts: −15 %. */
export const ON_DECAY = 0.85;

/**
 * Die beiden Kurvenformen. Sie beschreiben die STEILHEIT einer Leiter, nicht
 * ein Gerät und keine Taste — dieses Modul kennt weder das eine noch das
 * andere.
 *
 *   flat   ein Schritt je Stufe, vier Schritte Vorsprung  → 89/75/64/54/46/40
 *   steep  zwei Schritte je Stufe, fünf Schritte Vorsprung → 64/46/40
 *
 * Die steile Form ist genau die flache, doppelt so schnell durchlaufen und um
 * einen halben Schritt versetzt: 0,85^(2n+5) trifft auf Stufe 1 denselben Wert
 * wie die flache auf Stufe 3. Eine eigene Zahlenreihe wäre eine zweite
 * Wahrheit über dieselbe Kurve.
 */
export const CURVE_FLAT = 'flat';
export const CURVE_STEEP = 'steep';

export const CURVES = Object.freeze({
	[CURVE_FLAT]: Object.freeze({ id: CURVE_FLAT, stepsPerLevel: 1, levelOffset: 4 }),
	[CURVE_STEEP]: Object.freeze({ id: CURVE_STEEP, stepsPerLevel: 2, levelOffset: 5 }),
});

/** Die Form, die jeder Aufruf ohne zweites Argument bekommt. */
export const CURVE_DEFAULT = CURVE_FLAT;

/**
 * Kürzester erlaubter voller Umlauf: 1000/3 ms.
 *
 * Das ist dieselbe Grenze wie die 200 ms je Seite, nur für beliebig viele
 * Seiten ausgesprochen. Eine EINZELNE Taste blitzt einmal je Umlauf; drei
 * Blitze je Sekunde ist die Schwelle, ab der Blinken bei lichtempfindlichen
 * Menschen Anfälle auslösen kann. Bei zwei Seiten sind das 400 ms, bei vier
 * Seiten 840 ms — beide weit darüber.
 */
export const CYCLE_MIN_MS = 1000 / 3;

/** Wenigste Seiten, die eine Leiter haben kann. */
export const SIDES_MIN = 2;

/**
 * Wie viele dieser Schritte eine Stufe wert ist — abgeleitet aus der flachen
 * Kurve, damit es nur eine Wahrheit über sie gibt.
 *
 * Einer. Die Leiter wird je Stufe um genau einen Schritt schwerer. Ihre Härte am
 * Anfang kommt nicht aus einer größeren Schrittweite, sondern aus dem Vorsprung
 * darunter.
 */
export const ON_STEPS_PER_LEVEL = CURVES[CURVE_FLAT].stepsPerLevel;   // 1

/**
 * Der Vorsprung: Stufe 1 beginnt nicht bei Schritt 1, sondern bei Schritt 5 —
 * abgeleitet aus der flachen Kurve, damit es nur eine Wahrheit über sie gibt.
 *
 * Vier Schritte, deshalb steht im Exponenten n+4. So fordert schon Stufe 1 so viel
 * wie die erste Fassung dieser Kurve auf Stufe 3 (89 ms), ohne dass die Leiter
 * dadurch früher in den Boden von 40 ms läuft — der bleibt auf Stufe 6.
 */
export const ON_LEVEL_OFFSET = CURVES[CURVE_FLAT].levelOffset;        // 4

/**
 * Holt einen beliebigen Wert auf eine gültige Stufe.
 *
 * Alles, was keine endliche Zahl ist, wird zu Stufe 1. Das ist nicht Kosmetik,
 * sondern die Voraussetzung dafür, dass Math.max in onMs() überhaupt greifen
 * kann: Math.max(40, NaN) ist NaN.
 *
 * @param {number} level
 * @returns {number} ganze Zahl ab 1
 */
export function normaliseLevel(level) {
	if (!Number.isFinite(level)) {
		return 1;
	}
	return Math.max(1, Math.trunc(level));
}

/**
 * Periode je Seite in Millisekunden – wie lange eine Seite an der Reihe ist.
 *
 * Der Parameter wird ABSICHTLICH nicht ausgewertet: dass die Periode nicht mehr
 * von der Stufe abhängt, ist genau die Aussage von Anhang B. Er bleibt in der
 * Unterschrift, damit die Aufrufer unverändert bleiben und eine spätere Kurve
 * ihn wieder benutzen kann, ohne dass jede Aufrufstelle angefasst werden muss.
 *
 * @param {number} level wird nicht ausgewertet, siehe oben
 * @returns {number} ganze Zahl, nie kleiner als SIDE_MIN_MS
 */
export function sideMs(level) {
	return Math.max(SIDE_MIN_MS, SIDE_MS);
}

/**
 * Holt eine beliebige Seitenzahl auf einen gültigen Wert. Wie
 * normaliseLevel() die Voraussetzung dafür, dass Math.max unten nie an NaN
 * scheitert.
 *
 * @param {number} sides
 * @returns {number} ganze Zahl ab SIDES_MIN
 */
export function normaliseSides(sides) {
	if (!Number.isFinite(sides)) { return SIDES_MIN; }
	return Math.max(SIDES_MIN, Math.trunc(sides));
}

/** Die Kurvenform zu einem Namen. Unbekanntes fällt auf die flache zurück. */
function curveOf(curve) {
	return CURVES[curve] ?? CURVES[CURVE_DEFAULT];
}

/**
 * Trefferfenster in Millisekunden – wie lange das Lichtfeld wirklich brennt.
 *
 * min(periode, …) ist eine Absicherung gegen einen Rundungsrest und gegen eine
 * spätere Änderung der Konstanten: das Fenster kann nie länger sein als die
 * Periode, in der es liegt.
 *
 * ERWEITERT, NICHT ERSETZT: das zweite Argument ist freiwillig. onMs(n) ist
 * Zeichen für Zeichen dieselbe Rechnung wie bisher.
 *
 * @param {number} level
 * @param {string} [curve] CURVE_FLAT (Voreinstellung) oder CURVE_STEEP
 * @returns {number} ganze Zahl, nie kleiner als ON_MIN_MS
 */
export function onMs(level, curve = CURVE_DEFAULT) {
	const step = normaliseLevel(level);
	const side = sideMs(step);
	const form = curveOf(curve);
	const exponent = form.stepsPerLevel * step + form.levelOffset;
	const shrunk = Math.round(side * ON_DECAY ** exponent);
	return Math.min(side, Math.max(ON_MIN_MS, shrunk));
}

/**
 * Die Pause nach einem vollen Umlauf, in Millisekunden.
 *
 * Sie ist GENAUSO LANG wie das Trefferfenster derselben Stufe (C.14.9) und
 * deshalb kein zweiter Zahlenwert, sondern derselbe. Als eigene Funktion steht
 * sie da, damit an der Aufrufstelle lesbar ist, WOVON die Rede ist — und damit
 * die Untergrenze von 40 ms auch für die Pause aus derselben Klammer kommt.
 *
 * @param {number} level
 * @param {string} [curve]
 * @returns {number} ganze Zahl, nie kleiner als ON_MIN_MS
 */
export function pauseMs(level, curve = CURVE_DEFAULT) {
	return onMs(level, curve);
}

/**
 * Ein voller Umlauf: jede Seite einmal, dazu die Pause, wenn es eine gibt.
 *
 * DIESE FUNKTION IST DIE SICHERHEITSGRENZE FÜR BELIEBIG VIELE TASTEN. Eine
 * einzelne Taste blitzt genau einmal je Umlauf; wie oft je Sekunde, sagt
 * flashesPerSecond() unmittelbar darunter.
 *
 * @param {number} level
 * @param {{sides?: number, curve?: string, pause?: boolean}} [options]
 * @returns {number} ganze Zahl, nie kleiner als CYCLE_MIN_MS
 */
export function cycleMs(level, { sides = SIDES_MIN, curve = CURVE_DEFAULT, pause = false } = {}) {
	const step = normaliseLevel(level);
	const count = normaliseSides(sides);
	return count * sideMs(step) + (pause === true ? pauseMs(step, curve) : 0);
}

/**
 * Wie oft eine EINZELNE Taste je Sekunde blitzt.
 *
 * @param {number} level
 * @param {{sides?: number, curve?: string, pause?: boolean}} [options]
 * @returns {number}
 */
export function flashesPerSecond(level, options = {}) {
	return 1000 / cycleMs(level, options);
}

/**
 * Alle Zeiten einer Stufe auf einmal. Zweites Argument freiwillig; ohne es
 * unverändert.
 *
 * @param {number} level
 * @param {string} [curve] CURVE_FLAT (Voreinstellung) oder CURVE_STEEP
 * @returns {Readonly<{level: number, sideMs: number, onMs: number,
 *                     darkMs: number, dutyFraction: number,
 *                     flashesPerSecond: number}>}
 */
export function stepTiming(level, curve = CURVE_DEFAULT) {
	const step = normaliseLevel(level);
	const side = sideMs(step);
	const on = onMs(step, curve);
	return Object.freeze({
		level: step,
		sideMs: side,
		onMs: on,
		darkMs: side - on,
		// Ergebnis, keine Vorgabe: die neue Kurve steuert das Fenster in
		// Millisekunden, nicht über einen Anteil. Steht hier nur, weil es sich
		// gut ablesen lässt.
		dutyFraction: on / side,
		// Aus cycleMs abgeleitet, nicht ein zweites Mal gerechnet: zwei Seiten,
		// keine Pause — die Bauform, die es vor dieser Phase allein gab.
		flashesPerSecond: flashesPerSecond(step, { sides: SIDES_MIN, curve }),
	});
}

export default stepTiming;
