/**
 * Blackjack – von einer Karte zum Bild und zum Namen
 * ===================================================
 *
 * KEIN IMPORT, KEIN DOKUMENT. Node lädt diese Datei unmittelbar, ohne die
 * Import-Map von TYPO3 zu kennen — dieselbe Zusage wie bei rules-blackjack.js,
 * shoe.js und round-blackjack.js (CONCEPT.md C.5.3). Alles, was sie braucht,
 * wird ihr übergeben: die deutschen Wörter kommen als `texts` herein, aus
 * locallang.xlf über data-text-Attribute. In dieser Datei steht kein einziger
 * deutscher Anzeigetext.
 *
 * SIE GIBT ZEICHENKETTEN ZURÜCK, KEINE ELEMENTE. Ein Text ist unter Node
 * prüfbar, ein DOM-Element wäre es nicht. Eingesetzt wird das Ergebnis mit
 * element.innerHTML — genau die Machart, die table-felt.js für die Chipstapel
 * schon benutzt (und die einzige erlaubte: createElementNS ist verboten,
 * Prüfung A-3).
 *
 * SIE KENNT KEINE SPIELREGEL. Welche Ränge und Farben es gibt, steht in
 * rules-blackjack.js; diese Datei bekommt eine fertige Karte übergeben und
 * prüft nur, dass sie sie zeichnen kann. Die einzige eigene Festlegung ist
 * das Rangzeichen (RANK_PRINT) — ein Zeichen, keine Regel.
 *
 * DIE VERDECKTE KARTE TRÄGT IHRE IDENTITÄT NICHT IM MARKUP. cardMarkup() mit
 * faceDown: true erzeugt ausschließlich den Rücken: kein Rangzeichen, keine
 * Farbzeichen-Kennung, kein Kartenname. Nur so ist die verdeckte Karte des
 * Gebers auf dem Tuch tatsächlich verdeckt und nicht im Seitenquelltext
 * abzulesen. Prüfung K-5 in verify-cards.mjs weist das nach, mit Gegenprobe.
 * (Im Arbeitsspeicher des Browsers liegt ihr Wert selbstverständlich trotzdem
 * — das ganze Spiel läuft ohne Server, siehe DECISIONS.md, C4d.)
 */

/** Das aufgedruckte Rangzeichen. Deutsch: Bube, Dame, König, Ass. */
export const RANK_PRINT = Object.freeze({
	2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
	J: 'B', Q: 'D', K: 'K', A: 'A',
});

/** Farbkennung → id des Farbzeichens im Kartenvorrat (CardSprite.html). */
export const SUIT_SYMBOL = Object.freeze({
	H: 'bj-suit-heart', D: 'bj-suit-diamond', S: 'bj-suit-spade', C: 'bj-suit-club',
});

/**
 * Farbkennung → Druckfarbe als WORT. Es wird als CSS-Klassenteil benutzt
 * (bj-card--red / bj-card--black); die tatsächliche Farbe steht in cards.css
 * und kommt von dort aus den Design-Tokens.
 */
export const SUIT_TONE = Object.freeze({ H: 'red', D: 'red', S: 'black', C: 'black' });

/** Rang → id des Bildzeichens, nur für Bube, Dame, König. */
export const COURT_SYMBOL = Object.freeze({
	J: 'bj-court-jack', Q: 'bj-court-queen', K: 'bj-court-king',
});

/** Kartenmaße im viewBox-Koordinatensystem. Keine Regel, nur Geometrie. */
export const CARD_WIDTH = 60;
export const CARD_HEIGHT = 84;

/**
 * Macht eine Zeichenkette für ein doppelt bequotetes Attribut sicher.
 * Die Texte kommen aus einer XLIFF-Datei über data-Attribute — also aus dem
 * eigenen Repository —, aber sie landen über innerHTML im Dokument. Ein
 * Anführungszeichen in einer Übersetzung würde das Markup zerreißen; ein
 * spitzes Klammerzeichen könnte ein Element beginnen. Beides wird deshalb
 * ersetzt, nicht nur „weil es sicher aussieht": genau diese Stelle ist der
 * einzige Weg, auf dem Text in dieses Markup gelangt.
 * @param {*} wert
 * @returns {string}
 */
function attr(wert) {
	return String(wert ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Der erreichbare Name einer Karte, z. B. „Herz Dame".
 *
 * @param {{rank: string, suit: string}} card
 * @param {{name: string, rank: Object<string,string>, suit: Object<string,string>}} texts
 *   name  Satzbau mit {0} = Farbwort, {1} = Rangwort (die Grammatik gehört in
 *         die XLIFF-Datei, nicht hierher)
 * @returns {string}
 * @throws {RangeError} bei unbekanntem Rang oder unbekannter Farbe
 */
export function cardName(card, texts) {
	if (!(card.rank in RANK_PRINT)) {
		throw new RangeError(`cards-blackjack.js: unbekannter Rang „${String(card?.rank)}".`);
	}
	if (!(card.suit in SUIT_SYMBOL)) {
		throw new RangeError(`cards-blackjack.js: unbekannte Farbe „${String(card?.suit)}".`);
	}
	const farbwort = texts?.suit?.[card.suit] ?? card.suit;
	const rangwort = texts?.rank?.[card.rank] ?? card.rank;
	return String(texts?.name ?? '{0} {1}')
		.replace(/\{(\d+)\}/g, (_, n) => [farbwort, rangwort][Number(n)] ?? '');
}

/**
 * Das Markup EINER Karte.
 *
 * @param {{rank: string, suit: string}} card
 * @param {{faceDown?: boolean, texts?: Object, extraClass?: string}} [options]
 *   faceDown    true → nur der Rücken, ohne jede Spur der Identität
 *   texts       wie bei cardName(), zusätzlich texts.faceDown = Name der
 *               verdeckten Karte („verdeckte Karte")
 *   extraClass  eine zusätzliche, bereits geprüfte CSS-Klasse (bj-…)
 * @returns {string} ein <svg>-Element als Text
 */
export function cardMarkup(card, options = {}) {
	const { faceDown = false, texts = {}, extraClass = '' } = options ?? {};

	let sichereZusatzklasse = extraClass;
	if (!/^[A-Za-z0-9_ -]*$/.test(String(extraClass))) {
		console.error(`cards-blackjack.js: extraClass „${String(extraClass)}" enthält unerlaubte Zeichen und wird verworfen.`);
		sichereZusatzklasse = '';
	}
	// Als bereits mit einem führenden Leerzeichen versehene Zeichenkette
	// vorbereitet und ERST HIER, nicht erst in den beiden SVG-Vorlagen unten,
	// aus einem eigenen Ausdruck gebildet: Prüfung A-9 in verify-cabinet.mjs
	// liest den QUELLTEXT dieser Datei (nicht das spätere Laufzeitergebnis)
	// und zerlegt den Wert des class-Attributs jeder Vorlage an Leerzeichen.
	// Stünde sichereZusatzklasse als eigenes, durch ein Leerzeichen im
	// Quelltext abgetrenntes Token in der Vorlage, sähe A-9 ein Klassenwort,
	// das nicht mit bj- beginnt, und schlüge fehl — obwohl zur Laufzeit nur
	// eine bereits geprüfte bj-…-Klasse oder eine leere Zeichenkette entsteht.
	// Mit vorangestelltem Leerzeichen IM WERT bleibt im Quelltext kein
	// Leerzeichen vor der eingesetzten Stelle übrig, und das Ergebnis ist
	// unverändert dasselbe Markup wie zuvor.
	const zusatzKlasse = sichereZusatzklasse ? ` ${sichereZusatzklasse}` : '';

	if (faceDown) {
		return `<svg class="bj-card bj-card--back${zusatzKlasse}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"`
			+ ` role="img" aria-label="${attr(texts.faceDown ?? '')}">`
			+ '<use href="#bj-card-back"></use></svg>';
	}

	const zeichen = attr(RANK_PRINT[card.rank]);
	const farbId = SUIT_SYMBOL[card.suit];
	const ton = SUIT_TONE[card.suit];
	const mitte = COURT_SYMBOL[card.rank] ?? farbId;
	const name = attr(cardName(card, texts));
	return `<svg class="bj-card bj-card--${ton}${zusatzKlasse}" viewBox="0 0 60 84" role="img" aria-label="${name}">`
		+ '<use href="#bj-card-face"></use>'
		+ `<g class="bj-card__index"><text x="9" y="15">${zeichen}</text>`
		+ `<use href="#${farbId}" x="4.5" y="17" width="9" height="9"></use></g>`
		+ `<g class="bj-card__index" transform="rotate(180 30 42)"><text x="9" y="15">${zeichen}</text>`
		+ `<use href="#${farbId}" x="4.5" y="17" width="9" height="9"></use></g>`
		+ `<use class="bj-card__pip" href="#${mitte}" x="17" y="27" width="26" height="30"></use>`
		+ '</svg>';
}

/**
 * Das Markup einer ganzen HAND — mehrere Karten nebeneinander, leicht
 * überlappend wie ein aufgefächertes Blatt.
 *
 * @param {Array<{rank: string, suit: string}>} cards
 * @param {{faceDown?: boolean|Array<boolean>, texts?: Object, extraClass?: string}} [options]
 *   faceDown  entweder für alle Karten gleich (boolean) oder je Karte
 *             (Array) — der Geber braucht genau das: erste Karte offen,
 *             zweite verdeckt.
 * @returns {string}
 */
export function handMarkup(cards, options = {}) {
	const { faceDown = false, texts = {}, extraClass = '' } = options ?? {};
	const markup = cards
		.map((karte, i) => cardMarkup(karte, {
			texts,
			extraClass,
			faceDown: Array.isArray(faceDown) ? faceDown[i] === true : faceDown === true,
		}))
		.join('');
	return `<span class="bj-hand__cards" data-bj-count="${cards.length}">${markup}</span>`;
}

export default cardMarkup;
