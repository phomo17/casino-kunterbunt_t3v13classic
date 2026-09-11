/**
 * Craps – Zufallsziehung
 * =======================
 *
 * Die EINE Stelle im Tisch, an der gewürfelt wird — und der eine Schalter,
 * über den ein Nachweislauf den echten Zufall gegen eine wiederholbare Folge
 * tauscht. CONCEPT.md C.5.2 verlangt beides ausdrücklich, und ausdrücklich,
 * dass der Wechsel über EINE benannte Stelle läuft und nicht über verstreute
 * Abfragen.
 *
 * Zwei Geber, dieselbe Form: beide liefern eine vorzeichenlose 32-Bit-Zahl.
 *
 *   drawUint32()          echter Zufall aus crypto.getRandomValues() — im Spiel
 *   createSeeded(saat)()  wiederholbare Folge — im Nachweis
 *
 * Der Geber wird in die Physik EINGESPEIST (new DiceTable({ random })), nicht
 * von ihr importiert — deshalb bleibt dice-physics.js importfrei und unter
 * Node unmittelbar ladbar (CONCEPT.md C.5.3).
 *
 * createSeeded() wird im EINZELSPIEL nie benutzt. SEIT D5-3 speist craps.js
 * createSeeded(saatZuZahl(saat)) an genau einer Stelle ein — als Geber der
 * gemeinsamen Lobby-Runde (D.10.4), wenn eine Lobby läuft. Prüfung V-6 in
 * verify-view.mjs weist die dafür geschärfte Fassung nach: createSeeded
 * kommt in craps.js genau einmal vor, und zwar dort. Außerhalb einer
 * Lobby-Runde bleibt es bei drawUint32.
 *
 * WARUM KOPIERT UND NICHT GETEILT
 * --------------------------------
 * Projektregel: keine Extension greift zur Laufzeit auf eine Datei einer
 * anderen zu. Diese Datei ist zeichengleich zu
 * typo3conf/ext/roulette/Resources/Public/JavaScript/rng.js bzw.
 * typo3conf/ext/blackjack/…/rng.js — mit diesem neu geschriebenen
 * Kopfkommentar. Was übernommen wird, wird kopiert; das hält seit den
 * geteilten Walzensymbolen dieses Projekts eine eigene Prüfung zusammen
 * (hier P-2/P-3 in verify-physics.mjs).
 *
 * Dieses Modul hat selbst keine Importe und ist deshalb auch außerhalb des
 * Browsers lesbar und prüfbar.
 */

/** 2^32 – der Wertebereich einer vorzeichenlosen 32-Bit-Zahl. */
const RANGE = 4294967296;

/** Wiederverwendeter Puffer. JavaScript läuft einfädig, das ist gefahrlos. */
const buffer = new Uint32Array(1);

/**
 * Liefert die Zufallsquelle des Browsers oder wirft.
 *
 * @returns {Crypto}
 * @throws {Error} wenn keine sichere Zufallsquelle bereitsteht
 */
function source() {
	const provider = globalThis.crypto;
	if (provider === undefined || typeof provider.getRandomValues !== 'function') {
		throw new Error(
			'crypto.getRandomValues steht nicht zur Verfügung. Der Tisch spielt '
			+ 'nicht ohne sichere Zufallsquelle (CONCEPT.md C.5.2).'
		);
	}
	return provider;
}

/**
 * Prüft einmalig, ob gespielt werden kann. craps.js fragt das beim Start ab
 * und verdrahtet den Tisch gar nicht erst, wenn die Antwort nein lautet —
 * lieber ein stiller Tisch als einer, der bei jedem Druck einen Fehler in
 * die Konsole schreibt.
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
 * Eine echte Zufallszahl aus [0, 2^32).
 * @returns {number}
 */
export function drawUint32() {
	source().getRandomValues(buffer);
	return buffer[0];
}

/**
 * Ein wiederholbarer Zählergenerator, wie ihn CONCEPT.md C.5.2 für
 * Nachweisläufe vorsieht („ein einfacher, dokumentierter Zählergenerator").
 *
 * WIE ER ARBEITET
 * ---------------
 * Er zählt einen 32-Bit-Zähler um eine feste, ungerade Schrittweite hoch und
 * verwirbelt den Zählerstand danach mit drei Runden aus Multiplikation und
 * Rechtsschieben (die verbreitete Bauart „SplitMix"). Weil der Zähler
 * schlicht hochzählt, ist die Folge vollständig durch die Saat bestimmt und
 * lässt sich an jeder Stelle wiederholen; die Verwirbelung sorgt dafür, dass
 * aufeinanderfolgende Ausgaben nichts miteinander zu tun haben.
 *
 * WARUM ER BITGENAU IST
 * ---------------------
 * Math.imul, ^, >>> und + auf 32-Bit-Zahlen sind in der Sprachnorm exakt
 * festgelegt. Der Nachweis liefert damit auf jeder Maschine dieselbe Folge —
 * die Voraussetzung dafür, dass ein durchgefallener Lauf überhaupt
 * nachvollzogen werden kann.
 *
 * IM EINZELSPIEL WIRD ER NIE BENUTZT. Seit D5-3 speist ihn craps.js einmal
 * ein — als Geber der Lobby-Runde. verify-view.mjs (V-6) prüft das genau
 * dort nach, nirgends sonst.
 *
 * @param {number} seed ganze Zahl; wird auf 32 Bit gestutzt
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
 * Aus der Saat des Servers (16 Hex-Zeichen) eine vorzeichenlose 32-Bit-Zahl.
 *
 * FNV-1a, wie in casino_lobby/lobby-seed.js — und ABSICHTLICH noch einmal
 * hier, aus demselben Grund, aus dem createSeeded() schon viermal im Haus
 * steht: die Referenz in casino_lobby und die drei Fassungen der Tische sind
 * VERSCHIEDENE Dateien, deren Gleichheit nachgewiesen wird (V-21 in
 * verify-lobby-live.mjs, verify-lobby-craps.mjs C-4). Wären es dieselbe
 * Datei, bewiese der Vergleich nichts — und der Tisch müsste aus
 * casino_lobby importieren, was Plan D5, Abschnitt 4.0, ausschließt.
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

export default drawUint32;
