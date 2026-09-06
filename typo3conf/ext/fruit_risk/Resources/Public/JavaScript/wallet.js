/**
 * FruitRisk – die Verrechnung am Gerät
 * =======================================
 *
 * Die eine Stelle, an der Spielablauf und Geld aufeinandertreffen. Sie legt
 * den Gerätekredit an, bucht den Einsatz ab, hält den offenen Gewinnanspruch,
 * schreibt ihn auf REWARD oder START gut und speist die Röhrengruppen
 * GUTHABEN und EINSATZ.
 *
 *
 * KASSE UND GERÄTEKREDIT (CONCEPT.md B.5)
 * -------------------------------------------
 *   die KASSE          der Gesamtbestand, allen Geräten gemeinsam. Sie liegt
 *                      in credit.js und wird an diesem Gehäuse im
 *                      Kassenfenster im Sockel angezeigt (bank.js).
 *   der GERÄTEKREDIT   was der Spieler bewusst in DIESES Gerät geworfen hat.
 *                      Beim Betreten der Seite immer 0. Er liegt in
 *                      machine-credit.js und steht in den GUTHABEN-Röhren.
 *
 * Gespielt wird AUSSCHLIESSLICH vom Gerätekredit (B.5.2). Diese Datei fasst
 * die Kasse deshalb nicht an: sie prüft, bucht ab und schreibt gut
 * ausschließlich über machineCredit. Der Weg von der Kasse ins Gerät ist der
 * Münzschlitz (coinslot.js), der Weg zurück die Taste CASH OUT (bank.js) und
 * das Verlassen der Seite.
 *
 *
 * SIE LEGT DEN GERÄTEKREDIT AN UND SCHLIESST IHN — ALS EINZIGE
 * ------------------------------------------------------------------
 * openMachineCredit(MACHINE_KEY) steht in dieser Datei genau einmal, im
 * Konstruktor. machineCredit.close() steht genau einmal, als erste Zeile von
 * destroy(). Nirgends sonst im ganzen Automaten.
 *
 *
 * VIER ANPASSUNGEN GEGENÜBER DEN ÜBRIGEN AUTOMATEN DIESES PROJEKTS
 * ---------------------------------------------------------------------
 *  1. KEIN EINSATZWAHL-CODE. Es gibt keine Einsatztasten (CONCEPT.md
 *     C.14.5); der Einsatz ist fest 10. readBet(), selectBet(),
 *     setLocked(), die Klasse fr-bets--locked und alles daran Hängende
 *     entfallen ersatzlos. Der Einsatz kommt als STAKE aus paytable.js —
 *     derselben Datei, aus der auch die Auswertung kommt. Damit gibt es
 *     genau eine Quelle.
 *  2. SIE HÄLT DEN OFFENEN ANSPRUCH. Das ist die tragende Änderung dieser
 *     Phase. An diesem Gerät endet JEDE Runde im Angebot (C.14.5); der
 *     Gewinn wird erst durch REWARD oder das nächste START gutgeschrieben.
 *  3. SIE VERDRAHTET REWARD.
 *  4. SIE SAGT NICHTS AN. Die Ansage des Geldes gehört bank.js, das beide
 *     Zahlen sieht (Kasse und Gerätekredit) und daraus EINEN Satz macht.
 *     Zwei Schreiber in einem Live-Bereich wären zwei Wahrheiten.
 *
 *
 * ====================================================================
 * DIE ABBUCHUNG — WARUM SO UND NICHT ANDERS
 * ====================================================================
 * Das Problem in einem Satz: fr:round ist abbrechbar und muss deshalb SOFORT
 * entscheiden, aber jede Änderung am Geld ist laut Vertrag ASYNCHRON, und ein
 * Ereigniszuhörer kann nicht warten. Die Lösung besteht aus zwei Schritten IM
 * SELBEN SYNCHRONEN BLOCK:
 *
 *   1. machineCredit.canAfford(STAKE)  — synchron, entscheidet über das Veto
 *   2. machineCredit.stake(STAKE)      — angestoßen, nicht abgewartet; das
 *                                        Versprechen wird in
 *                                        this.pendingDebit aufbewahrt
 *
 * JavaScript läuft einfädig. Zwischen zwei Anweisungen desselben synchronen
 * Blocks kann nichts anderes laufen. stake() ist zwar als async deklariert,
 * enthält aber selbst kein einziges await: sein ganzer Rumpf läuft synchron
 * ab, nur der Rückgabewert kommt als bereits erfülltes Versprechen. Ein
 * Wettlauf zwischen Prüfung und Abbuchung ist deshalb nicht unwahrscheinlich,
 * sondern UNERREICHBAR.
 * ====================================================================
 *
 *
 * DIE ÜBERGABESTELLE FÜR PHASE F5
 * -----------------------------------
 * Nach einer Auswertung wird nicht sofort gebucht, sondern gefragt: ein
 * ABBRECHBARES fr:offer mit einem WinClaim im detail. Sagt niemand etwas,
 * behält diese Datei den Anspruch und löst ihn auf REWARD oder das nächste
 * START ein. Eine künftige Phase F5 ruft preventDefault(), behält den
 * Anspruch und entscheidet über ein Risikospiel. An dieser Datei ändert sich
 * dafür keine Zeile. Einzelheiten im Kopf von payout.js und im
 * Ereignisvertrag (README.md).
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über die Tafel (message.js).
 */

import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';
import { STAKE } from '@phomo17/fruit-risk/paytable.js';
import { findNixieGroup } from '@phomo17/fruit-risk/nixie.js';
import { NixieCounter } from '@phomo17/fruit-risk/counter.js';
import { WinClaim } from '@phomo17/fruit-risk/payout.js';
import { CoinSlot } from '@phomo17/fruit-risk/coinslot.js';
import { wirePressButton } from '@phomo17/fruit-risk/press.js';

/**
 * Der Schlüssel des Gerätekredits. Wortgleich zu FruitRisk::CREDIT_KEY in
 * Classes/FruitRisk.php. Er kommt vom GERÄT; das Site Package führt keine
 * Liste der Automaten. Vollständiger Speicherschlüssel:
 * casinoKunterbunt.machine.fruit_risk (CONCEPT.md B.5.3).
 */
const MACHINE_KEY = 'fruit_risk';

/** Gründe einer Kreditänderung, die als Bedienhandlung gelten. */
const ENGAGING_REASONS = Object.freeze(['insert', 'stake', 'award', 'cashout']);

export class Wallet {
	/**
	 * @param {HTMLElement} root ein .fr-machine
	 * @param {import('./message.js').MessageBoard} board die Tafel
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase F4 entspricht
	 */
	constructor(root, board) {
		const cabinet = root.querySelector('.fr-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .fr-cabinet im Automaten gefunden.');
		}
		this.root = root;
		this.cabinet = cabinet;
		this.board = board;

		const creditGroup = findNixieGroup(cabinet, 'guthaben');
		const stakeGroup = findNixieGroup(cabinet, 'einsatz');
		this.creditCounter = creditGroup === null ? null : new NixieCounter(creditGroup);
		this.stakeCounter = stakeGroup === null ? null : new NixieCounter(stakeGroup);

		// DIE EINE STELLE, an der der Gerätekredit angelegt wird. Der
		// geteilte Baustein räumt dabei einen vorgefundenen Restbetrag aus
		// einem Absturz sofort in die Kasse zurück (B.5.2) — der Automat
		// beginnt in jedem Fall bei 0. Geschlossen wird er ebenso an genau
		// einer Stelle: in destroy().
		this.machineCredit = openMachineCredit(MACHINE_KEY);
		this.coinSlot = new CoinSlot(root, this.board, this.machineCredit);

		this.startButton = cabinet.querySelector('.fr-btn[data-fr-button="start"]');
		this.rewardButton = cabinet.querySelector('.fr-btn[data-fr-button="reward"]');

		/**
		 * Der offene Gewinnanspruch dieser Runde, oder null.
		 *
		 * An diesem Gerät endet JEDE Runde im Angebot (C.14.5). Der Gewinn
		 * bleibt hier liegen, bis REWARD oder START ihn gutschreiben — oder
		 * bis eine künftige Phase F5 ihn übernimmt (siehe onResult()).
		 * @type {?WinClaim}
		 */
		this.openClaim = null;

		/** Hat der Besucher das Gerät schon angefasst? Siehe reviewAffordability(). */
		this.engaged = false;

		/** @type {Promise<boolean>} Versprechen der laufenden Abbuchung. */
		this.pendingDebit = Promise.resolve(false);

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		this.listen(root, 'fr:round', (event) => this.onRound(event));
		this.listen(root, 'fr:result', (event) => { void this.onResult(event); });
		this.listen(root, 'fr:collect', (event) => this.onCollect(event));

		// REWARD gehört in Phase F4 dem Geld: es löst das Angebot ein. Eine
		// künftige Phase F5 verdrahtet dieselbe Taste ein zweites Mal; beide
		// Zuhörer sind folgenlos, solange sie keinen Anspruch halten — genau
		// das ist die Naht (siehe settleOffer()).
		this.disposeReward = wirePressButton(this.rewardButton, 'fr-btn--pressed',
			() => { void this.settleOffer('reward'); });

		this.unsubscribe = this.machineCredit.subscribe((detail) => this.onCreditChange(detail));

		// EINSATZ zeigt im Markup 10 und ist fest; der Gleichstand wird
		// trotzdem einmal hergestellt, damit die Anzeige auch dann stimmt,
		// wenn das Markup je geändert wird.
		this.stakeCounter?.snap(STAKE);
		this.syncAttributes();
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
	 * Löst ein Ereignis am Gehäuse aus. Gleiche Bauform wie Machine.emit().
	 *
	 * @param {string} name
	 * @param {object} detail
	 * @param {boolean} [cancelable]
	 * @returns {CustomEvent}
	 */
	emit(name, detail, cancelable = false) {
		// Object.freeze() wie überall in diesem Automaten (README.md, „Der
		// Ereignis- und Messpunktvertrag"): ein Zuhörer, der das detail
		// verändert, verändert es für alle nachfolgenden Zuhörer.
		const event = new CustomEvent(name, { detail: Object.freeze(detail), cancelable, bubbles: true });
		this.root.dispatchEvent(event);
		return event;
	}

	/**
	 * START wurde gedrückt: erst das Angebot einlösen, dann prüfen, dann
	 * abbuchen.
	 *
	 * WARUM DAS ANGEBOT ZUERST KOMMT: „REWARD oder START schreiben den
	 * Gewinn gut. START beginnt zusätzlich unmittelbar die nächste Runde"
	 * (C.14.5). Wer mit 0 Gerätekredit einen Gewinn von 25 stehen hat, muss
	 * mit START weiterspielen können.
	 *
	 * WARUM DAS SYNCHRON AUFGEHT, OBWOHL collect() ASYNCHRON IST: `await x`
	 * wertet x SOFORT aus; award() im geteilten Baustein hat in seinem
	 * Rumpf kein einziges await, schreibt also synchron. Wenn diese Zeile
	 * zurückkehrt, steht der Gewinn bereits im Gerätekredit — nur der
	 * Rückgabewert kommt später. Genau darauf beruht schon die Abbuchung
	 * (nächster Absatz); verify-credit.mjs weist es nach, statt es zu
	 * glauben.
	 *
	 * DIE ABBUCHUNG: fr:round ist abbrechbar und muss SOFORT entscheiden,
	 * aber jede Geldänderung ist laut Vertrag asynchron. Deshalb zwei
	 * Schritte im SELBEN synchronen Block: canAfford() entscheidet über das
	 * Veto, stake() wird angestoßen und sein Versprechen aufbewahrt.
	 * JavaScript läuft einfädig — zwischen zwei Anweisungen desselben
	 * Blocks kann nichts dazwischenkommen.
	 *
	 * @param {CustomEvent} event abbrechbares fr:round
	 * @returns {void}
	 */
	onRound(event) {
		this.engaged = true;

		if (this.openClaim !== null) {
			void this.settleOffer('start');
		}

		if (!this.machineCredit.canAfford(STAKE)) {
			// C.14.5/B.5.2: reicht der GERÄTEKREDIT nicht, ist der Zug nicht
			// auslösbar. Es wird NICHTS abgebucht; ein eben eingelöster
			// Gewinn bleibt selbstverständlich gutgeschrieben.
			event.preventDefault();
			this.board.show('insufficient');
			return;
		}

		this.board.hide();
		this.pendingDebit = this.machineCredit.stake(STAKE).then(
			(result) => {
				if (result.ok !== true) {
					console.error('[fruit-risk] Der Einsatz konnte nicht abgebucht werden.'
						+ ' Die Runde wird nicht ausgezahlt.', result);
					return false;
				}
				return true;
			},
			(error) => {
				console.error('[fruit-risk] Die Abbuchung ist fehlgeschlagen.', error);
				return false;
			}
		);
	}

	/**
	 * Die Walzen stehen, es ist ausgewertet: das Angebot entsteht.
	 *
	 * @param {CustomEvent} event fr:result
	 * @returns {Promise<void>}
	 */
	async onResult(event) {
		try {
			const paid = await this.pendingDebit;
			if (!paid) {
				this.board.show('void');
				return;
			}

			const win = Number(event.detail?.win);
			if (!Number.isFinite(win) || win <= 0) {
				// An diesem Gerät baulich unerreichbar (Gewinngarantie,
				// C.14.7). Trotzdem behandelt statt behauptet.
				return;
			}

			// SCHUTZ GEGEN EIN ÜBERSCHRIEBENES ANGEBOT (Behebungslauf
			// REVIEW-fruitrisk-f4.md [M2]): Träfe hier je ein zweites
			// fr:result ein, bevor der vorige Anspruch eingelöst ist, würde
			// die Zuweisung weiter unten ihn sonst ersatzlos überschreiben —
			// er würde weder collect()-et noch discard()-et, nur die
			// Referenz ginge verloren. Heute ist das nur deshalb
			// unerreichbar, weil machineCredit.stake() (casino_startpage)
			// einen rein synchronen Rumpf hat (siehe Dateikopf); dieser
			// Riegel sichert das auch dann noch ab, wenn stake() einmal eine
			// echte Netzanfrage wird.
			if (this.openClaim !== null) {
				await this.settleOffer('superseded');
			}

			const claim = new WinClaim(this.root, win, this.machineCredit);

			// DIE ÜBERGABESTELLE FÜR EINE KÜNFTIGE PHASE F5.
			// Abbrechbares fr:offer: „hier ist ein Anspruch — will ihn
			// jemand?" In Phase F4 antwortet niemand, die Kasse behält ihn
			// und löst ihn auf REWARD oder START ein. An DIESER Datei
			// ändert sich dafür keine Zeile.
			const asked = this.emit('fr:offer', { win, stake: STAKE, claim }, true);
			if (asked.defaultPrevented) {
				this.openClaim = null;
				this.syncAttributes();
				return;
			}

			this.openClaim = claim;
			this.rewardButton?.classList.add('fr-btn--lit');
			this.syncAttributes();
		} catch (error) {
			console.error('[fruit-risk] Die Verrechnung der Runde ist fehlgeschlagen.', error);
		}
	}

	/**
	 * Löst ein offenes Angebot ein — durch REWARD, durch START oder beim
	 * Verlassen der Seite.
	 *
	 * Hält diese Datei keinen Anspruch, tut sie nichts. Genau das macht den
	 * zweiten REWARD-Zuhörer einer künftigen Phase F5 gefahrlos: es kann
	 * immer nur eine Stelle den Anspruch haben, und nur sie handelt.
	 *
	 * @param {'reward'|'start'|'teardown'|'superseded'} reason
	 * @returns {Promise<void>}
	 */
	async settleOffer(reason) {
		const claim = this.openClaim;
		if (claim === null) {
			return;
		}
		this.openClaim = null;
		this.rewardButton?.classList.remove('fr-btn--lit');

		const amount = claim.amount;
		void claim.collect();          // schreibt synchron gut, siehe onRound()
		this.emit('fr:offerend', { reason, amount });
		this.syncAttributes();
	}

	/**
	 * Jede Änderung des Gerätekredits — gleich woher. reason ist
	 * 'subscribe' beim ersten Aufruf, danach 'insert', 'stake', 'award',
	 * 'cashout', 'claimed', 'surrendered' oder 'closed'.
	 *
	 * @param {{amount: number, previous: number, reason: string}} detail
	 * @returns {void}
	 */
	onCreditChange(detail) {
		if (detail.reason === 'subscribe') {
			// Die Röhren sind dunkel; eine Fahrt aus dem Dunkeln heraus
			// hätte keinen Startwert — also setzen, nicht fahren.
			this.creditCounter?.snap(detail.amount);
		} else {
			this.creditCounter?.ramp(detail.amount);
		}
		if (ENGAGING_REASONS.includes(detail.reason)) {
			this.engaged = true;
		}
		this.reviewAffordability();
		this.syncAttributes();
	}

	/**
	 * Zeigt „GUTHABEN ZU GERING", wenn der feste Einsatz nicht gedeckt ist,
	 * und lässt START genau dann leuchten, wenn ein Zug möglich ist.
	 *
	 * this.engaged: der Gerätekredit startet bei 0, es wäre also ohne
	 * Zutun sofort nichts bezahlbar — ein Erstbesucher würde mit einer
	 * Fehlermeldung begrüßt. Bis zur ersten Bedienhandlung schweigt die
	 * Tafel deshalb.
	 *
	 * @returns {void}
	 */
	reviewAffordability() {
		const affordable = this.machineCredit.canAfford(STAKE);
		if (affordable) {
			this.board.hide();
		} else if (this.engaged) {
			this.board.show('insufficient');
		}
		this.startButton?.classList.toggle('fr-btn--lit', affordable);
	}

	/**
	 * Kappung am Höchststand melden — gleich, wer gutgeschrieben hat.
	 *
	 * @param {CustomEvent} event fr:collect
	 * @returns {void}
	 */
	onCollect(event) {
		if (event.detail?.capped === true) {
			this.board.show('capped');
		}
	}

	/**
	 * Schreibt die vier Messpunkte dieser Datei. Je Attribut genau ein
	 * Schreiber; data-fr-bank/-total/-cashout gehören bank.js,
	 * data-fr-round/-state/-win gehören machine.js.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const data = this.root.dataset;
		data.frMachineCredit = String(this.machineCredit.amount);
		data.frMirror = this.machineCredit.mirror;
		data.frOffer = this.openClaim === null ? 'none' : 'open';
		data.frClaim = String(this.openClaim?.amount ?? 0);
	}

	/**
	 * Beim Verlassen der Seite.
	 *
	 * REIHENFOLGE, AUF DIE ES ANKOMMT:
	 *  1. ein noch offenes Angebot wird EINGELÖST, nicht verworfen. Der
	 *     Gewinn ist erspielt; ihn beim Weggehen zu verwerfen, hieße Geld
	 *     vernichten (B.5.2: „Es kann nichts liegenbleiben").
	 *  2. danach close(): der Gerätekredit wandert vollständig in die Kasse
	 *     zurück und der Spiegel wird gelöscht. DIES IST DIE EINZIGE
	 *     STELLE IM AUTOMATEN, DIE close() RUFT.
	 * Nicht abgewartet: beim Verlassen läuft keine Fortsetzung mehr, aber
	 * der Speicher ist geschrieben, wenn die Zeile zurückkehrt (synchroner
	 * Rumpf, siehe onRound()).
	 *
	 * @returns {void}
	 */
	destroy() {
		void this.settleOffer('teardown');
		void this.machineCredit.close();

		this.unsubscribe?.();
		this.unsubscribe = null;
		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];
		this.disposeReward?.();
		this.coinSlot.destroy();
		this.creditCounter?.destroy();
		this.stakeCounter?.destroy();
		this.startButton?.classList.remove('fr-btn--lit');
		this.rewardButton?.classList.remove('fr-btn--lit');

		// Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse.
		delete this.root.dataset.frMachineCredit;
		delete this.root.dataset.frMirror;
		delete this.root.dataset.frOffer;
		delete this.root.dataset.frClaim;
	}
}

export default Wallet;
