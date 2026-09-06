/**
 * Coin Pusher – die Lichtdrossel
 * ====================================================
 *
 * CONCEPT.md B.9.3: „Die Kaskade darf keine Lichtquelle erzeugen, die
 * häufiger als dreimal je Sekunde hell wird." Die Lampe an der Auswurfschale
 * ist genau dieser kritische Fall: fallen Münzen im Schwall, käme ohne
 * Bremse ein Stroboskop dabei heraus. Die Grenze ist laut B.6.1 NICHT
 * verhandelbar, und sie darf nicht davon abhängen, dass ein Aufrufer
 * aufpasst. Deshalb steckt sie baulich in der Lampe, nicht bei ihrem
 * Aufrufer.
 */

/** Kürzeste Leuchtdauer. Ein Aufleuchten unter dieser Zeit gibt es nicht. */
export const LAMP_MIN_ON_MS = 400;

/** Kürzeste Dunkelzeit danach. */
export const LAMP_MIN_OFF_MS = 200;

export class Lamp {
	/**
	 * @param {?HTMLElement} element die Lampe, oder null
	 * @param {string} [onClass]
	 * @param {() => number} [now] nur für den Nachweis austauschbar
	 */
	constructor(element, onClass = 'cp-tray__lamp--on', now = () => globalThis.performance.now()) {
		this.element = element;
		this.onClass = onClass;
		this.now = now;

		/** true, solange die Lampe hell ist. */
		this.lit = false;
		/** Zeitpunkt, ab dem eingeschaltet werden darf (Sperrzeit). */
		this.readyAt = -Infinity;
		/** Zeitpunkt, ab dem ausgeschaltet werden darf/soll. */
		this.offAt = -Infinity;
		/** Kennung des laufenden Ausschalt-Zeitgebers, oder 0. */
		this.timer = 0;
	}

	/**
	 * Löst ein Aufleuchten aus.
	 *
	 * - Leuchtet die Lampe schon: die Löschzeit wird VERLÄNGERT — es beginnt
	 *   KEIN neues Aufleuchten. Ein Dauerregen macht daraus ein ruhiges
	 *   Dauerlicht, nicht ein Flackern.
	 * - Ist sie dunkel und die Sperrzeit abgelaufen: einschalten.
	 * - Ist sie dunkel und die Sperrzeit läuft noch: nichts, und der
	 *   Auslöser wird auch nicht gemerkt. Ein gemerkter Auslöser wäre eine
	 *   Warteschlange, und eine Warteschlange wäre wieder ein Takt.
	 *
	 * @returns {void}
	 */
	trigger() {
		const t = this.now();

		if (this.lit) {
			this.offAt = t + LAMP_MIN_ON_MS;
			this.scheduleOff();
			return;
		}

		if (t < this.readyAt) {
			return;
		}

		this.lit = true;
		this.element?.classList.add(this.onClass);
		this.offAt = t + LAMP_MIN_ON_MS;
		this.scheduleOff();
	}

	/**
	 * Bestellt den nächsten Ausschalt-Zeitgeber auf this.offAt.
	 *
	 * @returns {void}
	 */
	scheduleOff() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
		}
		const delay = Math.max(0, this.offAt - this.now());
		this.timer = globalThis.setTimeout(() => this.turnOff(), delay);
	}

	/**
	 * Schaltet aus und setzt die Sperrzeit für das nächste Aufleuchten.
	 *
	 * @returns {void}
	 */
	turnOff() {
		this.timer = 0;
		this.lit = false;
		this.element?.classList.remove(this.onClass);
		this.readyAt = this.now() + LAMP_MIN_OFF_MS;
	}

	/** Zeitgeber weg, Lampe aus. */
	destroy() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
			this.timer = 0;
		}
		this.element?.classList.remove(this.onClass);
	}
}

export default Lamp;
