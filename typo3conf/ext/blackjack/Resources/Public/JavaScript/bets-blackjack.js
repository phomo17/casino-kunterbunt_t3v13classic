/**
 * Blackjack – die Feldliste des Tuchs
 * ====================================
 *
 * CONCEPT.md C.3: „Jedes Spiel liefert nur seine Feldliste; das Legen,
 * Stapeln, Zurücknehmen, Anzeigen und Auszahlen ist geteilter Baustein."
 *
 * Beim Blackjack ist die Feldliste kurz: EIN Feld, der Setzkreis. Alles
 * Weitere — Verdoppeln, Teilen, Versicherung — ist kein zweites SETZFELD,
 * sondern Geld, das MITTEN in der Runde nachgelegt wird, wenn das Tuch längst
 * gesperrt ist. Es läuft deshalb nicht über diese Liste, sondern über
 * round-table-blackjack.js (Umsetzungsstück C5c).
 *
 * KEIN IMPORT, KEIN DOKUMENT — Node lädt diese Datei unmittelbar.
 *
 * KEINE REGELZAHL. Der Höchsteinsatz ist eine Regel und steht ausschließlich
 * in rules-blackjack.js. Deshalb nimmt buildFields() das Regelmodul entgegen,
 * statt eine Zahl fest zu verdrahten (Prüfung A-11).
 *
 * WARUM DAS FELD EIN payout VON 1 TRÄGT UND WARUM DAS NIE BENUTZT WIRD.
 * BetField verlangt eine Auszahlungszahl. Die 1 ist der Grundfall des Spiels
 * (eine gewonnene Hand zahlt so viel, wie sie kostet). Gerechnet wird damit
 * aber NIE: BetTable.settle() wird an diesem Tisch an KEINER Stelle
 * aufgerufen — die Auszahlung einer Hand hängt von Blackjack, Patt,
 * Überkaufen, Verdoppeln und Versicherung ab und wird ausschließlich von
 * round-blackjack.js gerechnet (dessen report). Prüfung V-9 in
 * verify-view.mjs stellt sicher, dass „settle(" in dieser Extension nirgends
 * vorkommt. „covers: []" ist aus demselben Grund leer: es würde nur von
 * settle() gelesen.
 */

/** Die Kennung des einen Feldes. Sie steht als data-ck-field im Markup. */
export const BOX_FIELD_ID = 'box';

/**
 * Die Feldliste für new BetTable({ fields, roundMax }).
 *
 * @param {{BET_MAX: number}} rules das Regelmodul (rules-blackjack.js)
 * @returns {Array<{id: string, label: string, covers: Array, payout: number, max: number}>}
 */
export function buildFields(rules) {
	return [{
		id: BOX_FIELD_ID,
		label: 'felt.box',
		covers: [],
		payout: 1,
		max: rules.BET_MAX,
	}];
}

/**
 * Der Gesamteinsatz einer Runde über ALLE Felder. Bei einem einzigen Feld ist
 * das derselbe Wert wie dessen Höchsteinsatz — der Höchsteinsatz gilt für den
 * GRUNDEINSATZ; Verdoppeln und Teilen legen darüber hinaus nach und laufen
 * bewusst nicht über diese Schranke (CONCEPT.md C.7.5).
 *
 * @param {{BET_MAX: number}} rules
 * @returns {number}
 */
export function roundMax(rules) {
	return rules.BET_MAX;
}

export default buildFields;
