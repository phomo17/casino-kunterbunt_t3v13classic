/**
 * Reel Slot – der Hebel
 * =====================================
 *
 * CONCEPT.md Abschnitt 3.2: „Der Hebel wirkt körperlich am Gerät befestigt und
 * wird gezogen, nicht geklickt." Deshalb löst ein bloßer Klick hier nichts
 * aus. Ausgelöst wird ausschließlich durch eine gezogene Bewegung nach unten,
 * mit der Maus genauso wie mit dem Finger.
 *
 * Pointer-Ereignisse statt getrennter Maus- und Berührungsbehandlung: sie
 * decken Maus, Finger und Stift mit einem Satz Zuhörer ab, und
 * setPointerCapture() sorgt dafür, dass der Zug auch dann weiterläuft, wenn
 * der Zeiger den Hebel verlässt — man zieht ja an einem Griff, man fährt nicht
 * über eine Fläche.
 *
 * touch-action wird hier aus JavaScript gesetzt und nicht in machine.css:
 * ohne JavaScript soll die Seite ganz normal scrollbar bleiben. Die
 * Eigenschaft ist eine Folge der Bedienung, nicht der Gestaltung, und gehört
 * deshalb dorthin, wo die Bedienung entsteht.
 *
 * Die Winkel stammen aus machine.css Abschnitt 6 und DECISIONS.md Phase 5:
 * Ruhelage −25°, gezogen +80°, ein Bogen von 105°.
 */

/** Ruhelage in Grad. Muss zum Vorgabewert in machine.css passen. */
const REST_DEG = -25;

/** Gezogene Endlage in Grad. Muss zu .rs-lever--pulled passen. */
const PULLED_DEG = 80;

/**
 * Zugweg als Anteil der Gehäusehöhe.
 *
 * 0,22 heißt: auf einem 800 Pixel hohen Gehäuse sind rund 176 Pixel Zug nötig,
 * um von der Ruhelage bis zum Anschlag zu kommen. Als Anteil und nicht in
 * Pixeln, weil das Gehäuse auf jedem Bildschirm anders groß ist — der Zug muss
 * sich am Handy genauso anfühlen wie am großen Schirm.
 */
const PULL_FRACTION = 0.22;

/**
 * Ab welchem Anteil des Zugwegs der Automat auslöst.
 *
 * 0,7 ist der Punkt, an dem die Klinke eines echten Geräts überspringt: weit
 * genug, dass ein versehentliches Antippen nichts auslöst, früh genug, dass
 * man nicht bis zum letzten Grad durchziehen muss.
 */
const TRIGGER = 0.7;

/** Dauer des Nachschlags bis zum Anschlag, wenn früher losgelassen wurde. */
const THROW_MS = 90;

/**
 * Dauer des Zurückschnellens.
 *
 * DESIGNBRIEF.md Abschnitt 2 verlangt ein „langsameres Zurückschnellen, das
 * oben ausläuft" und klar vom Zug unterscheidbar ist. 520 ms mit der Kurve
 * --ck-ease-mech aus machine.css leisten genau das.
 */
const RETURN_MS = 520;

/**
 * Der Hebel eines Gehäuses.
 */
export class Lever {
	/**
	 * @param {HTMLElement} element das .rs-lever
	 * @param {HTMLElement} cabinet das .rs-cabinet – liefert den Maßstab
	 * @param {function(): boolean} onPull wird beim Auslösen gerufen; liefert
	 *        false, wenn der Automat den Zug nicht annimmt (Phase 7: zu wenig
	 *        Guthaben). Der Hebel schnellt dann trotzdem sauber zurück.
	 */
	constructor(element, cabinet, onPull) {
		this.element = element;
		this.cabinet = cabinet;
		this.onPull = onPull;

		this.dragging = false;
		this.pointerId = -1;
		this.startY = 0;
		this.travel = 1;
		this.progress = 0;
		/** @type {?number} */
		this.throwTimer = null;

		// Ohne das rollt ein Fingerzug die Seite, statt den Hebel zu ziehen.
		this.element.style.touchAction = 'none';

		this.onDown = (event) => this.handleDown(event);
		this.onMove = (event) => this.handleMove(event);
		this.onUp = (event) => this.handleUp(event);

		this.element.addEventListener('pointerdown', this.onDown);
		this.element.addEventListener('pointermove', this.onMove);
		this.element.addEventListener('pointerup', this.onUp);
		this.element.addEventListener('pointercancel', this.onUp);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleDown(event) {
		if (this.dragging || !event.isPrimary) {
			return;
		}

		const box = this.cabinet.getBoundingClientRect();
		this.travel = Math.max(1, box.height * PULL_FRACTION);
		this.startY = event.clientY;
		this.progress = 0;
		this.dragging = true;
		this.pointerId = event.pointerId;
		this.element.setPointerCapture(event.pointerId);

		// Während des Ziehens folgt der Hebel dem Finger ohne Verzögerung.
		this.element.style.setProperty('--rs-lever-duration', '0ms');
		this.setAngle(REST_DEG);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleMove(event) {
		if (!this.dragging || event.pointerId !== this.pointerId) {
			return;
		}
		this.progress = Math.min(1, Math.max(0, (event.clientY - this.startY) / this.travel));
		this.setAngle(REST_DEG + (PULLED_DEG - REST_DEG) * this.progress);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleUp(event) {
		if (!this.dragging || event.pointerId !== this.pointerId) {
			return;
		}
		this.dragging = false;
		if (this.element.hasPointerCapture(event.pointerId)) {
			this.element.releasePointerCapture(event.pointerId);
		}

		const triggered = event.type === 'pointerup' && this.progress >= TRIGGER;

		// Erst die inline gesetzte Lage abräumen: eine Inline-Angabe schlägt
		// jede Klasse, .rs-lever--pulled bliebe sonst wirkungslos.
		this.element.style.removeProperty('--rs-lever-angle');

		if (!triggered) {
			this.springBack();
			return;
		}

		// Der Nachschlag: bis zum Anschlag durchziehen, dann zurückschnellen.
		this.element.style.setProperty('--rs-lever-duration', `${THROW_MS}ms`);
		this.element.classList.add('rs-lever--pulled');
		this.clearThrowTimer();
		this.throwTimer = globalThis.setTimeout(() => {
			this.throwTimer = null;
			this.element.classList.remove('rs-lever--pulled');
			this.springBack();
		}, THROW_MS);

		this.onPull();
	}

	/**
	 * @param {number} degrees
	 * @returns {void}
	 */
	setAngle(degrees) {
		this.element.style.setProperty('--rs-lever-angle', `${degrees.toFixed(1)}deg`);
	}

	/** Federbelastetes Zurückgehen in die Ruhelage. */
	springBack() {
		this.element.style.setProperty('--rs-lever-duration', `${RETURN_MS}ms`);
	}

	/** @returns {void} */
	clearThrowTimer() {
		if (this.throwTimer !== null) {
			globalThis.clearTimeout(this.throwTimer);
			this.throwTimer = null;
		}
	}

	/**
	 * Meldet alle Zuhörer ab und räumt den Zeitgeber weg.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.clearThrowTimer();
		this.element.removeEventListener('pointerdown', this.onDown);
		this.element.removeEventListener('pointermove', this.onMove);
		this.element.removeEventListener('pointerup', this.onUp);
		this.element.removeEventListener('pointercancel', this.onUp);
		this.element.classList.remove('rs-lever--pulled');
		this.element.style.removeProperty('--rs-lever-angle');
		this.element.style.removeProperty('--rs-lever-duration');
	}
}

export default Lever;
