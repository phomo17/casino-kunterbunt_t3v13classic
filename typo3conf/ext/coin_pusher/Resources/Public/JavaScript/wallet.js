/**
 * Coin Pusher – der Gerätekredit
 * ====================================================
 *
 * Die eine Stelle, an der Spielablauf und Geld aufeinandertreffen. Sie legt
 * den Gerätekredit an, bucht Einwürfe ab, schreibt gefallene Münzen gut und
 * speist die Nixie-Gruppe GUTHABEN.
 *
 * Der Geldfluss dieses Geräts steht im Ganzen am Anfang von Teil 2 des Plans:
 * drei Töpfe (KASSE, GERÄTEKREDIT, FELD), und eine eingeworfene Münze ist ab
 * dem Einwurf Spielmaterial, kein Kredit mehr (CONCEPT.md B.5.4).
 *
 *
 * SIE LEGT DEN GERÄTEKREDIT AN UND SCHLIESST IHN — ALS EINZIGE
 * ------------------------------------------------------------
 * openMachineCredit(MACHINE_KEY) steht in dieser Datei genau einmal, im
 * Konstruktor; machineCredit.close() genau einmal, als erste Zeile von
 * destroy(). Nirgends sonst. bank.js und moneyslot.js bekommen das Objekt
 * GEREICHT. Der geteilte Baustein lässt je Schlüssel und Seite ohnehin nur
 * einen zu und wirft beim zweiten Versuch — die Zusage hängt also nicht an
 * Disziplin.
 *
 *
 * WELCHE data-ATTRIBUTE DIESE DATEI SCHREIBT
 * ------------------------------------------
 *   data-cp-machine-credit   der Gerätekredit
 *   data-cp-mirror           der rohe Spiegelwert aus dem Browserspeicher
 *
 * Und KEINE anderen. data-cp-bank, data-cp-total und data-cp-cashout gehören
 * bank.js. Je Attribut genau ein Schreiber.
 *
 *
 * SIE FASST pusher.js NICHT AN
 * -----------------------------
 * Verbunden wird ausschließlich über das DOM-Ereignis cp:won, das Lauf 1
 * dafür gebaut hat. Ein Import von Pusher würde die Verrechnung an die
 * Klasse hängen statt an den Vertrag.
 *
 *
 * B.5.4, DER KERN: BEIM VERLASSEN DER SEITE WANDERT NUR DER GERÄTEKREDIT
 * ------------------------------------------------------------------------
 * destroy() ruft als ERSTE Zeile machineCredit.close() — der Gerätekredit
 * wandert vollständig in die Kasse zurück und der Spiegel wird gelöscht
 * (B.5.2: „Verlässt der Spieler die Seite, wandert der Gerätekredit von
 * selbst zurück in die Kasse. Neuladen zählt als Verlassen."). DAS FELD WIRD
 * DABEI NICHT ANGEFASST — liegende Münzen sind Spielmaterial, kein Kredit
 * mehr, und storage.clear() wird von keinem Bedienteil gerufen.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über das Meldungsschild (message.js).
 */

import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';
import { findNixie } from '@phomo17/coin-pusher/nixie.js';

/** Der Schlüssel dieses Geräts. Er bestimmt zugleich den Spiegel im
 *  Browserspeicher: casinoKunterbunt.machine.coin_pusher (CONCEPT.md B.5.2). */
const MACHINE_KEY = 'coin_pusher';

/**
 * Der Gerätekredit eines Gehäuses.
 */
export class Wallet {
	/**
	 * @param {HTMLElement} root das .cp-machine
	 * @param {MessageBoard} board das Meldungsschild
	 */
	constructor(root, board) {
		this.root = root;
		this.board = board;

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		this.display = findNixie(root, 'guthaben');

		// DIE EINE STELLE, an der der Gerätekredit dieses Automaten angelegt
		// wird. Geschlossen wird er ebenso an genau einer Stelle: in
		// destroy(). bank.js und moneyslot.js bekommen das Objekt gereicht
		// und legen keines an.
		this.machineCredit = openMachineCredit(MACHINE_KEY);

		this.listen(root, 'cp:won', (event) => { void this.award(event.detail.total); });

		// subscribe() ruft SOFORT einmal mit dem aktuellen Stand auf
		// (reason: 'subscribe'), damit die frisch angebundene Anzeige nicht
		// leer bleibt. Beim Betreten der Seite ist der Gerätekredit IMMER 0
		// (B.5.2) — außer der geteilte Baustein findet einen Spiegel aus
		// einem Absturz und bucht ihn zurück; auch das läuft über denselben
		// Weg und braucht hier keine Sonderbehandlung.
		this.unsubscribe = this.machineCredit.subscribe((detail) => this.onCredit(detail));
	}

	/**
	 * @param {EventTarget} target
	 * @param {string} type
	 * @param {function} handler
	 * @returns {void}
	 */
	listen(target, type, handler) {
		target.addEventListener(type, handler);
		this.bound.push({ target, type, handler });
	}

	/**
	 * Jede Änderung des Gerätekredits – gleich woher.
	 *
	 * Schreibt DREI Dinge: die Röhren, data-cp-machine-credit und
	 * data-cp-mirror. Und KEINE anderen — data-cp-bank, data-cp-total und
	 * data-cp-cashout gehören bank.js.
	 *
	 * @param {{amount: number, previous: number, reason: string}} detail
	 * @returns {void}
	 */
	onCredit(detail) {
		this.display?.set(detail.amount);
		this.root.dataset.cpMachineCredit = String(this.machineCredit.amount);
		this.root.dataset.cpMirror = this.machineCredit.mirror;
	}

	/**
	 * Nimmt den Münzwert aus dem Gerätekredit.
	 *
	 * stake() fasst die Kasse NICHT an: gespielt wird ausschließlich vom
	 * Gerätekredit (B.5.2). Reicht er nicht, wird nichts abgebucht, und das
	 * Schild sagt GUTHABEN ZU GERING.
	 *
	 * @param {number} value
	 * @returns {Promise<boolean>}
	 */
	async spend(value) {
		const result = await this.machineCredit.stake(value);
		if (result.ok !== true) {
			this.board.show('insufficient');
			return false;
		}
		this.board.hide();
		return true;
	}

	/**
	 * Schreibt gefallene Münzen gut.
	 *
	 * Gekappt wird am Höchststand; capped meldet das zurück, damit das Gerät
	 * die Wahrheit anzeigen kann, statt still zu schlucken.
	 *
	 * @param {number} total
	 * @returns {Promise<void>}
	 */
	async award(total) {
		const result = await this.machineCredit.award(total);
		if (result.capped) {
			this.board.show('capped');
		}
	}

	/**
	 * Schließt den Gerätekredit. Wird beim Verlassen der Seite gerufen; die
	 * EINZIGE Stelle, an der close() gerufen wird.
	 *
	 * @returns {void}
	 */
	destroy() {
		// ERSTE Zeile: der Gerätekredit wandert vollständig in die Kasse
		// zurück und der Spiegel wird gelöscht. Das Feld wird dabei NICHT
		// angefasst — genau das ist B.5.4.
		void this.machineCredit.close();

		this.unsubscribe?.();
		this.unsubscribe = null;

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.display?.destroy();

		delete this.root.dataset.cpMachineCredit;
		delete this.root.dataset.cpMirror;
	}
}

export default Wallet;
