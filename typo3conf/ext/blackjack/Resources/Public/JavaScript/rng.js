/**
 * Blackjack – Zufallsziehung
 * ==========================
 *
 * Die einzige Stelle in dieser Extension, an der gewürfelt wird — und der
 * eine Schalter, über den ein Nachweislauf den echten Zufall gegen eine
 * wiederholbare Folge tauscht. CONCEPT.md C.5.2 verlangt beides ausdrücklich,
 * und zwar über EINE benannte Stelle statt über verstreute Abfragen.
 *
 * Zwei Geber, dieselbe Form: beide liefern eine vorzeichenlose 32-Bit-Zahl.
 *
 *   drawUint32()          echter Zufall aus crypto.getRandomValues() — im Spiel
 *   createSeeded(saat)()  wiederholbare Folge — im Nachweis
 *
 * Der Geber wird in den Schlitten und in die Runde EINGESPEIST
 * (new Shoe({ rules, random }), new BlackjackRound({ rules, shoe })), nicht
 * von ihnen importiert (Plan Abschnitt 4, Festlegung 3). Genau dieselbe
 * Bauart wie beim Roulette (new Wheel({ random })) und beim Münzschieber; der
 * Grund ist auch hier derselbe: shoe.js und round-blackjack.js bleiben
 * importfrei und damit unter Node unmittelbar ladbar, ohne die Import-Map von
 * TYPO3 nachzubilden.
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
 * Prüft einmalig, ob gespielt werden kann. Das Einstiegsmodul (ab Phase C5)
 * fragt das beim Start ab und verdrahtet den Tisch gar nicht erst, wenn die
 * Antwort nein lautet — lieber ein stiller Tisch als einer, der bei jedem
 * Druck einen Fehler in die Konsole schreibt.
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
 * ER WIRD NIE IM SPIEL BENUTZT. Ein spätere statische Prüfung (Phase C5) hält
 * das fest, wie es beim Roulette V-14 schon tut.
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

export default drawUint32;
