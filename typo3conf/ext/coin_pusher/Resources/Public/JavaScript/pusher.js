/**
 * Coin Pusher – die Uhr des Geräts
 * ====================================================
 *
 * Der Taktgeber: er hält das Feld, führt die Zeichenschleife, ruft je Bild
 * die richtige Zahl FESTER Zeitschritte auf und meldet als DOM-Ereignisse,
 * was im Feld passiert ist. Er ist der einzige Ort, an dem eine Uhr
 * vorkommt.
 *
 * DER KERN DER SACHE — DETERMINISMUS TROTZ BILDSCHLEIFE
 * -------------------------------------------------------
 * field.step() ist EIN Zeitschritt von DT = 1/240 s. Wie viele davon je Bild
 * laufen, entscheidet ausdrücklich der Aufrufer (so steht es im Kopf von
 * field.js). Eine Bildschleife liefert aber ungleiche Abstände — 16,7 ms auf
 * einem ruhigen Bildschirm, 8,3 ms auf einem 120-Hz-Gerät, 40 ms unter Last.
 * Würde man daraus einen skalierten Zeitschritt machen, wäre die Physik
 * bildratenabhängig und der Quotennachweis wertlos.
 *
 * Deshalb ein SAMMLER: die verstrichene Zeit wird aufaddiert, und es laufen
 * so viele ganze Schritte, wie hineinpassen; der Rest bleibt für das nächste
 * Bild liegen. planSteps() ist als reine Funktion ausgelagert, damit der
 * Nachweis sie ohne Browser prüfen kann.
 */

import { FRAME_HZ, SUBSTEPS, PLATE_PERIOD_STEPS } from '@phomo17/coin-pusher/field.js';

/** Ein Zeitschritt in Millisekunden. Aus field.js hergeleitet, nicht abgeschrieben. */
export const DT_MS = 1000 / (FRAME_HZ * SUBSTEPS);      // 4,1666…

/**
 * Höchstens acht Bilder werden nachgeholt.
 *
 * Kommt die Seite aus einem langen Stillstand zurück — versteckter Tab, ein
 * blockierender Vorgang —, stünden sonst zehntausende Schritte in einem
 * einzigen Bild an, und der Browser hinge. Was darüber liegt, wird
 * VERWORFEN, nicht aufgehoben: das Gerät hat in dieser Zeit stillgestanden,
 * und das ist an einem Münzschieber die ehrlichere Auskunft als ein Haufen,
 * der plötzlich springt.
 */
export const MAX_CATCHUP_STEPS = SUBSTEPS * 8;

/**
 * @param {number} elapsedMs seit dem letzten Bild
 * @param {number} carryMs Rest aus dem letzten Bild
 * @returns {{steps: number, carryMs: number}}
 */
export function planSteps(elapsedMs, carryMs) {
	const span = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
	const pot = carryMs + span;
	const wanted = Math.floor(pot / DT_MS);
	if (wanted > MAX_CATCHUP_STEPS) {
		return { steps: MAX_CATCHUP_STEPS, carryMs: 0 };
	}
	return { steps: wanted, carryMs: pot - wanted * DT_MS };
}

/** Wie oft die Plattenrichtung je Umlauf wechselt (vor und zurück). */
const PLATE_HALF_PERIOD = PLATE_PERIOD_STEPS / 2;

export class Pusher {
	/**
	 * @param {HTMLElement} root das .cp-machine
	 * @param {import('@phomo17/coin-pusher/field.js').Field} field das
	 *        Spielfeld — übergeben, nicht selbst geladen: woher es kommt,
	 *        entscheidet store.js
	 * @param {import('@phomo17/coin-pusher/view.js').FieldView} view die
	 *        Zeichenfläche
	 */
	constructor(root, field, view) {
		this.root = root;
		this.field = field;
		this.view = view;

		this.carryMs = 0;
		this.last = 0;
		this.frame = 0;
		this.forward = (field.stepCount % PLATE_PERIOD_STEPS) < PLATE_HALF_PERIOD;

		this.lastChuteValue = field.chuteValue;
		this.lastValveValue = field.valveValue;
		this.lastCount = field.count;

		this.frameStep = (now) => this.tick(now);
		this.onVisibilityBound = () => this.onVisibility();
		this.root.ownerDocument.addEventListener('visibilitychange', this.onVisibilityBound);

		this.frame = globalThis.requestAnimationFrame(this.frameStep);
	}

	/**
	 * Löst ein Ereignis am Gehäuse aus.
	 *
	 * @param {string} name
	 * @param {object} detail
	 * @returns {void}
	 */
	emit(name, detail) {
		this.root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
	}

	/**
	 * Ein Bild.
	 *
	 * 1. Nächstes Bild sofort anfordern.
	 * 2. Verstrichene Zeit ermitteln — beim allerersten Bild gibt es keinen
	 *    Vorgänger, ein volles Bild ist die richtige Annahme.
	 * 3. planSteps(); carryMs übernehmen.
	 * 4. steps mal field.step(), und nach jedem Schritt watchPlate().
	 * 5. harvest().
	 * 6. view.draw().
	 *
	 * @param {number} now performance.now()-Zeitstempel des Bildes
	 * @returns {void}
	 */
	tick(now) {
		this.frame = globalThis.requestAnimationFrame(this.frameStep);

		const elapsed = this.last === 0 ? DT_MS * SUBSTEPS : now - this.last;
		this.last = now;

		const plan = planSteps(elapsed, this.carryMs);
		this.carryMs = plan.carryMs;

		for (let i = 0; i < plan.steps; i++) {
			this.field.step();
			this.watchPlate();
		}

		this.harvest();
		this.view.draw();
	}

	/**
	 * Meldet jeden Richtungswechsel der Schubplatte als cp:plate. Das ist
	 * alle 2 Sekunden genau ein Ereignis und die Grundlage des Schub-Klangs
	 * in Lauf 2.
	 *
	 * @returns {void}
	 */
	watchPlate() {
		const forwardNow = (this.field.stepCount % PLATE_PERIOD_STEPS) < PLATE_HALF_PERIOD;
		if (forwardNow !== this.forward) {
			this.forward = forwardNow;
			this.emit('cp:plate', { forward: forwardNow });
		}
	}

	/**
	 * Die einzige Stelle, an der Geld aus der Physik herauskommt.
	 *
	 * takeWon() wird in jedem Bild gerufen, auch wenn niemand zuhört. In
	 * Lauf 1 gibt es noch keine Verrechnung; würde der aufgelaufene Gewinn
	 * stehen bleiben, bekäme die Kasse in Lauf 2 beim ersten Bild eine
	 * Gutschrift für alles, was in Lauf 1 heruntergefallen ist. Abgeholt
	 * und nicht gebucht ist der richtige Zustand.
	 *
	 * @returns {void}
	 */
	harvest() {
		const won = this.field.takeWon();
		if (won.total > 0) {
			this.emit('cp:won', {
				total: won.total,
				byValue: won.byValue,
				count: won.byValue.reduce((a, b) => a + b, 0),
			});
		}

		if (this.field.chuteValue !== this.lastChuteValue) {
			this.emit('cp:lost', { total: this.field.chuteValue - this.lastChuteValue });
			this.lastChuteValue = this.field.chuteValue;
		}
		if (this.field.valveValue !== this.lastValveValue) {
			this.emit('cp:valve', { total: this.field.valveValue - this.lastValveValue });
			this.lastValveValue = this.field.valveValue;
		}
		if (this.field.count !== this.lastCount) {
			this.lastCount = this.field.count;
			this.emit('cp:coins', { count: this.field.count });
			this.root.dataset.cpCoins = String(this.field.count);
		}
	}

	/**
	 * Wirft eine Münze ein. In Lauf 1 ruft das niemand; die Methode ist die
	 * Naht, an der Lauf 2 ansetzt.
	 *
	 * @param {number} value
	 * @returns {void}
	 */
	throwCoin(value) {
		const ok = this.field.throwCoin(value);
		this.emit('cp:throw', { value, ok });
	}

	/**
	 * Hält das Feld an, wenn die Seite versteckt wird, und lässt es wieder
	 * anlaufen, wenn sie zurückkommt. Ohne das rechnete ein Hintergrund-Tab
	 * weiter Bilder, die niemand sieht, und der Sammler liefe voll.
	 *
	 * @returns {void}
	 */
	onVisibility() {
		if (this.root.ownerDocument.hidden) {
			if (this.frame !== 0) {
				globalThis.cancelAnimationFrame(this.frame);
				this.frame = 0;
			}
			this.carryMs = 0;
			this.last = 0;
		} else if (this.frame === 0) {
			this.frame = globalThis.requestAnimationFrame(this.frameStep);
		}
	}

	/** Schleife abbestellen, visibilitychange abmelden. */
	destroy() {
		if (this.frame !== 0) {
			globalThis.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
		this.root.ownerDocument.removeEventListener('visibilitychange', this.onVisibilityBound);
	}
}

export default Pusher;
