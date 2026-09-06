/**
 * Coin Pusher – der Spielstand im Browserspeicher
 * ===============================================
 *
 * CONCEPT.md B.11 Nr. 2 verlangt: „Jeder Automat hat genau eine benannte
 * Stelle, an der sein Spielstand herkommt (bei Coin Pusher das Feld)."
 * Diese Datei ist diese Stelle. Sie weiß nichts über Münzen, Platten oder
 * Schächte – sie reicht Text durch. Das Format kennt field.js, das Regal
 * kennt storage.js. Wird der Spielstand in Ausbaustufe 3 serverseitig
 * geführt (B.11), ändert sich genau diese eine Datei.
 *
 * Alle Funktionen bekommen das Speicherobjekt übergeben (read(store) statt
 * read()). Node hat keinen Browserspeicher; so lässt sich das Modul im
 * Nachweisskript mit einem nachgebauten Regal prüfen, ohne eine Zeile
 * Sonderbehandlung. Dieselbe Bauform benutzt
 * casino_startpage/verify-machine-credit.mjs.
 */

/**
 * Der Schlüssel aus CONCEPT.md B.5.3 und Anhang E. Wörtlich so und nicht anders –
 * er steht in der Tabelle der Schlüssel, die nach Ausbaustufe 2 im Browser liegen.
 */
export const STORAGE_KEY = 'casinoKunterbunt.coinPusher.field';

/**
 * Liest den Spielstand. Kein Speicher, kein Eintrag, kein Zugriffsrecht
 * (privates Fenster, abgeschaltete Speicherung) → null, ohne Fehler und ohne
 * Konsolenausgabe.
 *
 * @param {Storage} store
 * @returns {string|null}
 */
export function read(store) {
	try {
		return store?.getItem(STORAGE_KEY) ?? null;
	} catch {
		return null;
	}
}

/**
 * Schreibt den Spielstand. Ist der Speicher voll oder gesperrt, wird das
 * still hingenommen: ein verlorener Haufen ist ärgerlich, ein abstürzender
 * Automat wäre schlimmer.
 *
 * @param {Storage} store
 * @param {string} text
 * @returns {boolean} true, wenn geschrieben wurde
 */
export function write(store, text) {
	if (store == null) { return false; }
	try {
		store.setItem(STORAGE_KEY, text);
		return true;
	} catch {
		return false;
	}
}

/**
 * Entfernt den Spielstand. NICHT für eine Rückstell-Taste – die gibt es
 * ausdrücklich nicht (CONCEPT.md B.5.4) – sondern für den Fall, dass ein
 * unlesbarer Stand im Speicher steht und Platz belegt.
 *
 * @param {Storage} store
 * @returns {boolean}
 */
export function clear(store) {
	if (store == null) { return false; }
	try {
		store.removeItem(STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}
