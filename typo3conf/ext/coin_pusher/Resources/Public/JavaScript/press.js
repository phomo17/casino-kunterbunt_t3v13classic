/**
 * Coin Pusher – Drucktasten für Zeiger UND Tastatur
 * ================================================
 *
 * Eine einzige Funktion, damit derselbe Block nicht in coinslot.js,
 * moneyslot.js, bank.js und sound.js viermal steht. Sie hat KEINEN Import:
 * ein Tastenhelfer, der irgendetwas importierte, wäre der erste Baustein, der
 * an dieser Stelle eine Kopplung einführte, die niemand braucht.
 *
 * WARUM DER ZEIGER SOFORT WIRKT
 * -----------------------------
 * pointerdown, nicht click: eine Taste an einem Spielautomaten reagiert im
 * Moment des Drückens. click feuert erst beim Loslassen.
 *
 * WARUM DIE TASTATUR TROTZDEM GEHT
 * --------------------------------
 * Eine per Enter oder Leertaste ausgelöste Schaltfläche feuert ein click OHNE
 * vorheriges pointerdown. Unterschieden werden die beiden Wege an
 * event.detail: ein vom Zeiger erzeugtes click zählt ab 1, ein von der
 * Tastatur oder einem Hilfsmittel erzeugtes steht auf 0.
 *
 * Bewusst OHNE Merker: eine Fassung, die sich „gerade lief ein Zeigerdruck"
 * merkt, bleibt hängen, sobald der Zeiger die Taste vor dem Loslassen
 * verlässt — dann kommt gar kein click, der Merker steht weiter, und die
 * nächste Tastaturbedienung wird verschluckt. Ein zustandsloser Test kann
 * das nicht.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

/**
 * Verdrahtet eine Drucktaste für Zeiger UND Tastatur.
 *
 * @param {?HTMLElement} element die Taste, oder null
 * @param {string} pressedClass Klasse für die gedrückte Kappe
 * @param {() => void} action was beim Drücken geschehen soll
 * @returns {?() => void} Abmelde-Funktion, oder null, wenn element fehlt
 */
export function wirePressButton(element, pressedClass, action) {
	if (element === null) {
		return null;
	}

	const onPointerDown = (event) => {
		if (!event.isPrimary) {
			return;
		}
		element.classList.add(pressedClass);
		action();
	};
	const onClick = (event) => {
		// detail 0 = Tastatur oder Hilfsmittel. Alles andere ist der
		// Zeigerweg, und der hat oben schon ausgelöst.
		if (event.detail === 0) {
			action();
		}
	};
	const onRelease = () => {
		element.classList.remove(pressedClass);
	};

	element.addEventListener('pointerdown', onPointerDown);
	element.addEventListener('click', onClick);
	element.addEventListener('pointerup', onRelease);
	element.addEventListener('pointercancel', onRelease);
	element.addEventListener('pointerleave', onRelease);

	return () => {
		element.removeEventListener('pointerdown', onPointerDown);
		element.removeEventListener('click', onClick);
		element.removeEventListener('pointerup', onRelease);
		element.removeEventListener('pointercancel', onRelease);
		element.removeEventListener('pointerleave', onRelease);
		element.classList.remove(pressedClass);
	};
}

export default wirePressButton;
