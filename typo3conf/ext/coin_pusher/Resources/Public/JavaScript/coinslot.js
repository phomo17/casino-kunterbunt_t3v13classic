/**
 * Coin Pusher – der Münzeinwurf über dem Feld
 * ====================================================
 *
 * Der feste Einwurfschlitz über dem Feld (B.9.2) und die Münzwertwahl.
 *
 * NICHT ZU VERWECHSELN mit moneyslot.js, dem Geldeinwurf am Sockel: dieser
 * hier nimmt Geld aus dem GERÄTEKREDIT und macht daraus SPIELMATERIAL; jener
 * holt Geld aus der KASSE in den GERÄTEKREDIT.
 *
 *
 * selectValue(value) — DIE MÜNZWERTWAHL
 * --------------------------------------
 * Setzt cp-value--selected und aria-pressed auf genau einer der vier Tasten
 * und schreibt den Wert in die Nixie-Gruppe MÜNZWERT. Der Anfangswert ist 1
 * — so steht es seit Lauf 1 im Markup, und diese Datei liest ihn von dort,
 * statt ihn noch einmal festzulegen.
 *
 *
 * drop() — DER EINWURF, UND DIE REIHENFOLGE IST DAS WESENTLICHE
 * -----------------------------------------------------------------
 * Erst zahlen, dann werfen. Umgekehrt läge die Münze im Feld, bevor
 * feststeht, ob sie bezahlt ist — und wäre bei einer Absage nicht mehr
 * zurückzuholen, denn eine liegende Münze ist Spielmaterial und kein Kredit
 * (B.5.4). Die gezeichnete Münze fällt trotzdem VOR der Buchung: sie war in
 * der Hand, der Druck ist angekommen. Fiele sie erst nach der Verrechnung,
 * sähe der Einwurf träge aus.
 *
 * Die Verzögerung durch await ist unschädlich: machineCredit.stake() fasst
 * die Kasse nicht an und rechnet nur lokal; das Versprechen löst sich in
 * derselben Mikroaufgabenschleife auf, lange vor dem nächsten Bild. Zwischen
 * Druck und Wurf liegt damit KEIN Zeitschritt der Physik (B.9.2: der
 * Einwurfzeitpunkt ist die einzige Steuerung) — Prüfung C-6 weist das nach.
 *
 * busy verhindert, dass ein zweiter Druck während der laufenden Buchung eine
 * zweite Münze erzeugt.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { wirePressButton } from '@phomo17/coin-pusher/press.js';
import { findNixie } from '@phomo17/coin-pusher/nixie.js';
import { COIN_VALUES } from '@phomo17/coin-pusher/field.js';

const SELECTOR_DROP = '[data-cp-drop]';
const SELECTOR_VALUE = '[data-cp-value]';
const DROP_CLASS = 'cp-drop__coin--drop';
const FLASH_CLASS = 'cp-drop--flash';

/** Laufzeit der Einwurf-Animation. Muss zu @keyframes cp-drop-coin-fall in machine.css passen. */
const DROP_MS = 420;

/**
 * Münzwertwahl und Münzeinwurf ins Feld.
 */
export class CoinSlot {
	/**
	 * @param {HTMLElement} root das .cp-machine
	 * @param {Wallet} wallet bucht ab; angelegt hat ihn niemand sonst
	 * @param {Pusher} pusher wirft die Münze ins Feld
	 */
	constructor(root, wallet, pusher) {
		this.root = root;
		this.wallet = wallet;
		this.pusher = pusher;

		this.display = findNixie(root, 'muenzwert');

		this.dropButton = root.querySelector(SELECTOR_DROP);
		this.dropCoin = this.dropButton === null ? null : this.dropButton.querySelector('[data-cp-drop-coin]');

		/** @type {HTMLElement[]} */
		this.valueButtons = [...root.querySelectorAll(SELECTOR_VALUE)];

		/** Der gerade gewählte Münzwert. Aus dem Markup gelesen, nicht neu festgelegt. */
		const selected = this.valueButtons.find((button) => button.classList.contains('cp-value--selected'));
		const initial = Number.parseInt(selected?.getAttribute('data-cp-value') ?? '', 10);
		this.value = COIN_VALUES.includes(initial) ? initial : COIN_VALUES[0];
		this.display?.set(this.value);

		/** Sperre gegen einen zweiten Druck während der laufenden Buchung. */
		this.busy = false;

		/** Laufender Zeitgeber der Münzanimation, oder 0. */
		this.dropTimer = 0;

		/** @type {Array<() => void>} */
		this.disposers = [];

		const dropDisposer = wirePressButton(this.dropButton, FLASH_CLASS, () => { void this.drop(); });
		if (dropDisposer !== null) {
			this.disposers.push(dropDisposer);
		}

		for (const button of this.valueButtons) {
			const value = Number.parseInt(button.getAttribute('data-cp-value') ?? '', 10);
			const disposer = wirePressButton(button, 'cp-value--pressed', () => this.selectValue(value));
			if (disposer !== null) {
				this.disposers.push(disposer);
			}
		}
	}

	/**
	 * Wählt einen Münzwert.
	 *
	 * @param {number} value
	 * @returns {void}
	 */
	selectValue(value) {
		if (!COIN_VALUES.includes(value)) {
			return;
		}
		this.value = value;
		for (const button of this.valueButtons) {
			const chosen = Number.parseInt(button.getAttribute('data-cp-value') ?? '', 10) === value;
			button.classList.toggle('cp-value--selected', chosen);
			button.setAttribute('aria-pressed', chosen ? 'true' : 'false');
		}
		this.display?.set(value);
	}

	/**
	 * Wirft eine Münze ein: erst zahlen, dann werfen.
	 *
	 * @returns {Promise<boolean>}
	 */
	async drop() {
		if (this.busy) {
			// ein Druck, eine Münze
			return false;
		}
		this.busy = true;
		this.playCoin();
		const paid = await this.wallet.spend(this.value);
		this.busy = false;
		if (!paid) {
			// wallet hat schon gemeldet, warum
			return false;
		}
		this.pusher.throwCoin(this.value);
		return true;
	}

	/**
	 * Lässt die gezeichnete Münze in den Einwurfschlitz fallen.
	 *
	 * @returns {void}
	 */
	playCoin() {
		if (this.dropCoin === null) {
			return;
		}

		this.clearDropTimer();

		this.dropCoin.classList.remove(DROP_CLASS);
		void this.dropCoin.offsetWidth;
		this.dropCoin.classList.add(DROP_CLASS);

		this.dropTimer = globalThis.setTimeout(() => {
			this.dropTimer = 0;
			this.dropCoin?.classList.remove(DROP_CLASS);
		}, DROP_MS);
	}

	/** @returns {void} */
	clearDropTimer() {
		if (this.dropTimer !== 0) {
			globalThis.clearTimeout(this.dropTimer);
			this.dropTimer = 0;
		}
	}

	/**
	 * Meldet alle Zuhörer ab und räumt den Zeitgeber weg.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.clearDropTimer();
		this.dropCoin?.classList.remove(DROP_CLASS);

		for (const dispose of this.disposers) {
			dispose();
		}
		this.disposers = [];

		this.display?.destroy();
	}
}

export default CoinSlot;
