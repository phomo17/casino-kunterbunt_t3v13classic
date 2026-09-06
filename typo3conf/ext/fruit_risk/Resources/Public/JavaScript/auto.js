/**
 * FruitRisk – der Auto-Modus
 * ============================
 *
 * CONCEPT.md C.14.10, vollständig. Ein EIGENER, sehr kleiner Zustandsautomat
 * neben dem Spielkern und neben den drei Risikospielen — kein Anbau an
 * machine.js und keiner an risk.js.
 *
 * HERKUNFT (CONCEPT.md C.14.13): der AUFBAU ist von video_slot/…/auto.js
 * übernommen — derselbe kleine Zustandsautomat, dieselbe Naht über fr:spin.
 * Angepasst wurden vier Dinge: die Zustandsnamen dieses Geräts (unten,
 * FREE_STATES), dass hier ELF statt zwei Risiko-Tasten stillzulegen sind —
 * was diese Datei NICHT selbst tut, siehe „WAS DIESE DATEI NICHT TUN MUSS"
 * weiter unten —, aria-pressed am Umschalter (video_slot kennt das noch
 * nicht) und die Präfixe (@phomo17/fruit-risk/, fr-, fr:). Dieser
 * Kopfkommentar ist neu geschrieben, nicht mitkopiert.
 *
 *
 * ZWEI ZUSTÄNDE, MEHR NICHT
 * -------------------------
 *   aus   Der Automat wartet auf den Menschen. Diese Datei tut nichts.
 *   an    AUTO MODE schaltet um und leuchtet. Nach jeder Auswertung wartet
 *         der Automat rund eine Sekunde und zieht dann selbst; der Gewinn
 *         wird sofort gutgeschrieben, kein Risikospiel läuft.
 *
 * Der Auto-Modus ist eine BETRIEBSART, kein Rundenzustand. Deshalb hat
 * machine.js keinen Zustand „auto" — dieselbe Begründung, mit der es auch
 * keinen Zustand „risk" gibt: die Zustandsmaschine des Spielkerns beschreibt
 * den ZUG (idle → spinning → stopping → evaluating → offer), nicht die
 * Frage, wer die Taste bedient. Ein Zustand „auto" müsste zudem parallel zu
 * jedem der fünf vorhandenen gelten und die Übergangstabelle verdoppeln.
 *
 *
 * WIE DER NÄCHSTE ZUG AUSGELÖST WIRD — DIE KERNFRAGE DIESER PHASE
 * ---------------------------------------------------------------
 * Über das eingehende Ereignis fr:spin am Gehäuse. machine.js hat dafür
 * genau einen Zuhörer, der nichts weiter tut als startRound() zu rufen.
 *
 * ES IST DERSELBE WEG WIE BEIM MENSCHEN: ab der ersten Zeile von
 * startRound() unterscheidet sich gar nichts. Es wird gezogen, das
 * ABBRECHBARE fr:round wird gefeuert, die Kasse prüft und bucht ab, risk.js
 * sieht das Ereignis in der Erfassungsphase. Es gibt keinen zweiten
 * Rundenweg, an dem Abbuchung oder Veto vorbeiliefen.
 *
 * Eine nachgemachte Bedienung wäre der falsche Weg: ein Automat, der seine
 * eigene Bedienoberfläche mit gefälschten Zeigerereignissen betrügt, ist
 * nicht nachprüfbar — und ein nachgemachtes Ereignis erteilt ohnehin keine
 * Nutzeraktivierung, der Klang bliebe also aus.
 *
 * fr:spin ist NICHT abbrechbar. Das Veto sitzt weiterhin an fr:round, wo es
 * hingehört. Ein zweites Vetorecht wäre ein zweiter Mechanismus für dieselbe
 * Frage.
 *
 *
 * WARUM DIESE DATEI DEN GERÄTEKREDIT NICHT SELBST PRÜFT
 * -------------------------------------------------------
 * Sie importiert weder credit.js noch machine-credit.js und ruft
 * canAfford() nicht. Sie LIEST DAS ERGEBNIS DES VETOS ab:
 *
 *   1. fr:spin senden.
 *   2. Wenn danach der Rundenzustand nicht 'spinning' ist, kam die Runde
 *      nicht zustande — dann schaltet sich der Auto-Modus ab.
 *
 * Das geht, weil dispatchEvent() synchron ist: wenn die Zeile zurückkehrt,
 * hat machine.js gezogen, das Veto ist gefallen oder nicht, und das eigene
 * fr:state ist bereits durch diesen Zuhörer gelaufen.
 *
 * Drei Gründe für diesen Weg:
 *
 *  · EINE WAHRHEIT. Die Deckungsprüfung liegt eindeutig im fr:round-Zuhörer
 *    der Kasse (wallet.js). Eine zweite Prüfung hier wäre eine zweite
 *    Wahrheit über denselben Sachverhalt.
 *  · RICHTIG AUCH MORGEN. Mit einem künftigen serverseitigen Konto ist der
 *    Gerätekredit ein zwischengespeicherter Wert und kann veraltet sein. Das
 *    Veto ist die verbindliche Antwort.
 *  · SICHERE RICHTUNG. Scheitert eine Runde aus irgendeinem anderen Grund,
 *    schaltet sich der Auto-Modus ebenfalls ab. Ein Automat, der stehen
 *    bleibt, ist besser als einer, der im Sekundentakt abgelehnte Runden
 *    feuert.
 *
 *
 * DIE PAUSE — GENAU EIN ZEITGEBER
 * -------------------------------
 * setTimeout, nicht requestAnimationFrame: die Pause ist eine Wartezeit auf
 * der Uhr, keine Bewegung. Es gibt je Automat höchstens EINEN laufenden
 * Zeitgeber; arm() löscht immer erst den alten. Ob einer läuft, steht als
 * data-fr-auto-pending am Gehäuse und ist damit von außen messbar.
 *
 * Wird während der Pause ausgeschaltet, wird sie gelöscht und es beginnt
 * kein Zug mehr.
 *
 *
 * WAS „AB DEM NÄCHSTEN ZUG" GENAU HEISST
 * --------------------------------------
 * Gespannt wird bei fr:result der laufenden Runde. Der erste selbst
 * ausgelöste Zug beginnt also rund eine Sekunde nach der Auswertung.
 *
 * NICHT nach fr:risk phase:'end': dieses Ereignis kommt im Auto-Modus gar
 * nicht, weil das Angebot vorher verhindert wird. fr:result ist der einzige
 * Anker, den JEDE Runde liefert — an diesem Gerät ist „Angebot" zugleich der
 * Ruhezustand nach der Auswertung (machine.js, STATE.OFFER); es gibt keinen
 * eigenen Zustand „result".
 *
 *
 * KEIN RISIKOSPIEL — UND WAS DER SCHALTER WANN BEWIRKT
 * -------------------------------------------------------
 * Vor jedem Angebot fragt risk.js mit dem abbrechbaren fr:risk
 * phase:'offer'. Ist der Auto-Modus an, wird abgebrochen; risk.js schreibt
 * den Gewinn dann sofort gut (settle('auto'), sichtbar an fr:offerend reason
 * "auto") — genau der Weg, den risk.js ohnehin geht, wenn ein künftiger
 * Zuhörer das Angebot ablehnt.
 *
 * Daraus folgt EINE Regel für alle Umschaltzeitpunkte: es entscheidet der
 * Schalterstand im Augenblick des Angebots.
 *
 *   eingeschaltet während eines laufenden Zugs   → Angebot entfällt, sofort
 *                                                   gutgeschrieben (wirkt ab
 *                                                   dem nächsten Zug)
 *   ausgeschaltet während eines laufenden Zugs   → Angebot wie immer, die
 *                                                   drei Starttasten laden ein
 *   eingeschaltet, während das Angebot steht      → fr:riskcollect nimmt den
 *                                                   Gewinn
 *   eingeschaltet, während eine Leiter läuft      → dasselbe (AUSLEGUNG,
 *                                                   siehe unten)
 *
 * C.14.10 nennt nur das stehende Angebot. Dass auch eine LAUFENDE Leiter
 * beim Einschalten aussteigt und gutschreibt, ist eine Auslegung: der
 * Auto-Modus verspricht „keine Risikospiele", die Leiter weiterlaufen zu
 * lassen widerspräche dem sichtbar, und den bereits vervielfachten Gewinn
 * verfallen zu lassen wäre eine Strafe für das Betätigen eines Schalters
 * (→ DECISIONS.md). Deshalb wird fr:riskcollect beim Einschalten IMMER
 * gesendet; im Grundzustand ist es wirkungslos (risk.js:
 * collectCurrent() → settle('reward'), wenn nur ein reiner Anspruch liegt,
 * ladder.collect(), wenn eine Leiter läuft, und gar nichts, wenn keins von
 * beidem zutrifft), es braucht also keine Vorabfrage.
 *
 *
 * WOFÜR DIESE DATEI NICHTS TUN MUSS
 * ---------------------------------
 *  · „Die Walzen halten nacheinander von allein an." Das tut machine.js
 *    schon ohne jeden Tastendruck (AUTO_STOP_S). Der Auto-Modus fasst die
 *    Walzen nicht an und darf es nicht — sonst gäbe es zwei Bewegungsabläufe.
 *  · Die ELF Risiko-Bedienteile dunkel halten. Das braucht KEINEN eigenen
 *    Code in dieser Datei: weil das abbrechbare fr:risk phase:'offer'
 *    verhindert, dass risk.js openInvitation() überhaupt aufruft, bleiben
 *    alle elf aria-disabled="true" und ohne .fr-btn--invite — dieselbe
 *    Zusicherung, mit der risk.js schon jede zweite Gruppe während einer
 *    laufenden Leiter dunkel hält. Ein zweiter, unabhängiger Abschaltweg
 *    hier wäre eine zweite Wahrheit über denselben Zustand.
 *  · START, STOP und REWARD während des Auto-Modus: alle drei verhalten
 *    sich unverändert. STOP verkürzt die Runde, der nächste fr:result spannt
 *    einfach früher. START während der Pause startet eine zusätzliche
 *    Runde; feuert der Zeitgeber dann in einen laufenden Zug, wird nichts
 *    getan und NICHT abgeschaltet — ein besetzter Automat ist kein Veto.
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------
 * destroy() (aus pagehide, siehe fruit-risk.js) löscht den Zeitgeber, meldet
 * alle Zuhörer ab und macht die Taste dunkel. Es wird dabei KEIN fr:auto
 * gemeldet: eine Meldung in eine sterbende Seite ist Lärm, und risk.js
 * verfährt beim Abräumen genauso. fruit-risk.js räumt den Auto-Modus VOR dem
 * Spielkern ab (siehe dort), damit kein Zeitgeber mehr in ein halb
 * abgeräumtes Gerät feuern kann.
 *
 *
 * EREIGNISSE, DIE DIESE DATEI SENDET (alle am .fr-machine, alle bubbles)
 * ------------------------------------------------------------------------
 *   fr:spin          „Drück jetzt START." Nicht abbrechbar.
 *   fr:auto          detail: { on, reason, rounds }. reason ist 'user' oder
 *                     'insufficient'. Eine künftige Phase F5d hängt hier den
 *                     Schaltklang an.
 *   fr:riskcollect   beim Einschalten; im Grundzustand wirkungslos.
 *
 * EREIGNISSE, DIE DIESE DATEI ABHÖRT
 * -----------------------------------
 *   fr:state   Rundenzustand mitführen.
 *   fr:result  die Pause spannen.
 *   fr:risk    bei phase:'offer' abbrechen.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { wirePressButton } from '@phomo17/fruit-risk/press.js';

/**
 * Pause zwischen zwei selbst ausgelösten Zügen, in Millisekunden.
 *
 * CONCEPT.md C.14.10 sagt „rund eine Sekunde". Gemessen wird ab fr:result,
 * also ab der Auswertung — nicht ab dem Stillstand der letzten Walze und
 * nicht ab der Gutschrift.
 */
const PAUSE_MS = 1000;

/**
 * Rundenzustände, in denen ein neuer Zug beginnen darf.
 *
 * An diesem Gerät sind das „idle" und „offer" — es gibt keinen Zustand
 * „result": weil jede Runde einen Gewinn bringt, IST das Angebot der
 * Ruhezustand nach einer Runde (machine.js).
 *
 * Absichtlich als Zeichenketten und nicht über einen Import von STATE aus
 * machine.js: die Zustandsnamen stehen im detail eines DOM-Ereignisses und
 * sind damit Teil des Vertrags zwischen den Phasen, nicht Teil einer
 * Klasse. Angenehmer Nebeneffekt: jeder Zustand, den eine spätere Phase
 * hinzufügt, hält den Auto-Modus von allein an, weil er hier nicht
 * aufgeführt ist. Das ist die sichere Richtung.
 */
const FREE_STATES = Object.freeze(['idle', 'offer']);

/**
 * Der Auto-Modus eines Gehäuses.
 */
export class AutoPlay {
	/**
	 * @param {HTMLElement} root ein .fr-machine
	 * @throws {Error} wenn das Gehäuse nicht dem Markup dieses Geräts entspricht
	 */
	constructor(root) {
		const cabinet = root.querySelector('.fr-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .fr-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;

		// Fehlt die Taste, bleibt der Auto-Modus unerreichbar und diese Datei
		// still — gleiche Haltung wie findNixieGroup(): ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen.
		this.button = cabinet.querySelector('.fr-btn[data-fr-button="auto"]');

		/** Ist der Auto-Modus eingeschaltet? */
		this.enabled = false;

		/** Kennung des laufenden Pausen-Zeitgebers, oder 0. Immer höchstens einer. */
		this.timer = 0;

		/** Vom Auto-Modus ausgelöste Züge. Nur zur Auskunft und zum Nachmessen. */
		this.rounds = 0;

		/**
		 * Der zuletzt gemeldete Rundenzustand. 'idle' ist der Anfangswert des
		 * Spielkerns (machine.js, STATE.IDLE); bis zum ersten fr:state stimmt
		 * er deshalb ohne weiteres Zutun.
		 */
		this.machineState = 'idle';

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		this.fireStep = () => this.fire();

		this.listen(root, 'fr:state', (event) => this.onState(event));
		this.listen(root, 'fr:result', () => this.onResult());
		this.listen(root, 'fr:risk', (event) => this.onRisk(event));

		// wirePressButton() aus press.js, damit die Taste auch mit der
		// Tastatur geht (CONCEPT.md B.1).
		this.disposeButton = wirePressButton(this.button, 'fr-btn--pressed', () => this.toggle());
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
	 * Löst ein Ereignis am Gehäuse aus. Gleiche Bauform wie Machine.emit()
	 * und RiskPanel.emit().
	 *
	 * @param {string} name
	 * @param {object} detail
	 * @param {boolean} [cancelable]
	 * @returns {CustomEvent}
	 */
	emit(name, detail, cancelable = false) {
		const event = new CustomEvent(name, { detail: Object.freeze(detail), cancelable, bubbles: true });
		this.root.dispatchEvent(event);
		return event;
	}

	/**
	 * Umschalten. CONCEPT.md C.14.10: „Die Taste AUTO MODE schaltet um."
	 *
	 * @returns {void}
	 */
	toggle() {
		if (this.enabled) {
			this.disable('user');
		} else {
			this.enable();
		}
	}

	/**
	 * Einschalten.
	 *
	 * @returns {void}
	 */
	enable() {
		if (this.enabled) {
			return;
		}
		this.enabled = true;
		this.button?.classList.add('fr-btn--lit');
		this.button?.setAttribute('aria-pressed', 'true');
		this.syncAttributes();
		this.emit('fr:auto', { on: true, reason: 'user', rounds: this.rounds });

		// CONCEPT.md C.14.10 nennt nur das stehende Angebot; die Auslegung
		// (auch eine laufende Leiter steigt aus) steht im Dateikopf. Ohne
		// Vorabfrage: risk.js behandelt Angebot und laufende Leiter über
		// collectCurrent() gleich und ist im Grundzustand wirkungslos.
		this.emit('fr:riskcollect', {});

		this.arm();
	}

	/**
	 * Ausschalten. 'user' ist der Tastendruck, 'insufficient' die
	 * Selbstabschaltung nach einer abgelehnten Runde.
	 *
	 * @param {'user'|'insufficient'} reason
	 * @returns {void}
	 */
	disable(reason) {
		if (!this.enabled) {
			return;
		}
		this.enabled = false;
		this.disarm();
		this.button?.classList.remove('fr-btn--lit');
		this.button?.setAttribute('aria-pressed', 'false');
		this.syncAttributes();
		this.emit('fr:auto', { on: false, reason, rounds: this.rounds });
	}

	/**
	 * Spannt die Pause — aber nur, wenn der Automat gerade frei ist.
	 *
	 * Läuft noch ein Zug, wird NICHT gespannt: dessen fr:result kommt
	 * ohnehin und spannt dann. Genau daraus folgt „Einschalten mitten in
	 * einem laufenden Zug wirkt ab dem nächsten Zug".
	 *
	 * @returns {void}
	 */
	arm() {
		this.disarm();
		if (!this.enabled || !FREE_STATES.includes(this.machineState)) {
			return;
		}
		this.timer = globalThis.setTimeout(this.fireStep, PAUSE_MS);
		this.syncAttributes();
	}

	/**
	 * Löscht die Pause. Gefahrlos aufrufbar, auch wenn keine läuft.
	 *
	 * @returns {void}
	 */
	disarm() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
			this.timer = 0;
			this.syncAttributes();
		}
	}

	/**
	 * Die Pause ist abgelaufen: ziehen.
	 *
	 * ES IST DERSELBE WEG WIE BEIM MENSCHEN. fr:spin ist die Naht, die
	 * machine.js dafür bereithält: sein Zuhörer tut nichts weiter als
	 * startRound() zu rufen. Ab dessen erster Zeile unterscheidet sich gar
	 * nichts — es wird gezogen, das ABBRECHBARE fr:round wird gefeuert, die
	 * Kasse prüft und bucht ab, risk.js sieht es in der Erfassungsphase. Es
	 * gibt keinen zweiten Rundenweg, an dem Abbuchung oder Veto vorbeiliefen.
	 *
	 * @returns {void}
	 */
	fire() {
		this.timer = 0;

		if (!this.enabled) {
			// Kann nach disarm() nicht mehr vorkommen; die Prüfung kostet
			// nichts und macht die Zusage im Code sichtbar.
			this.syncAttributes();
			return;
		}

		if (!FREE_STATES.includes(this.machineState)) {
			// Der Mensch hat in der Pause selbst gedrückt. Kein Veto, keine
			// Abschaltung — der nächste fr:result spannt neu.
			this.syncAttributes();
			return;
		}

		this.emit('fr:spin', {});

		// dispatchEvent() ist synchron: an dieser Stelle steht fest, ob die
		// Runde zustande kam. Kam sie nicht, hat jemand fr:round
		// abgebrochen — im Regelfall die Kasse wegen zu geringen
		// Gerätekredits. CONCEPT.md C.14.10: „Reicht der Gerätekredit für
		// den nächsten Zug nicht, schaltet sich der Auto-Modus selbst ab."
		if (this.machineState !== 'spinning') {
			this.disable('insufficient');
			return;
		}

		this.rounds += 1;
		this.syncAttributes();
	}

	/**
	 * Rundenzustand mitführen.
	 *
	 * @param {CustomEvent} event fr:state
	 * @returns {void}
	 */
	onState(event) {
		const to = event.detail?.to;
		if (typeof to === 'string' && to !== '') {
			this.machineState = to;
		}
	}

	/**
	 * Die Runde ist ausgewertet: Pause spannen.
	 *
	 * @returns {void}
	 */
	onResult() {
		if (!this.enabled) {
			return;
		}
		this.arm();
	}

	/**
	 * Das Angebot verhindern.
	 *
	 * CONCEPT.md C.14.10: „Keine Risikospiele im Auto-Modus." Wer fr:risk
	 * phase:'offer' abbricht, lässt risk.js den Anspruch nicht anbieten —
	 * es schreibt ihn stattdessen sofort gut (settle('auto')).
	 *
	 * Nur 'offer' ist abbrechbar; die übrigen Phasen werden nur beobachtet
	 * und hier ausdrücklich nicht angefasst.
	 *
	 * @param {CustomEvent} event fr:risk
	 * @returns {void}
	 */
	onRisk(event) {
		if (!this.enabled || event.detail?.phase !== 'offer') {
			return;
		}
		event.preventDefault();
	}

	/**
	 * Schreibt den Zustand als data-Attribute ans Gehäuse.
	 *
	 * Gleiche Absicht wie data-fr-round und data-fr-risk-*: der Zustand ist
	 * von außen ablesbar, und der Nachweis ist ein DOM-Lesevorgang statt
	 * einer Glaubensfrage. data-fr-auto-pending macht zusätzlich die Zusage
	 * „höchstens ein Zeitgeber" messbar.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const data = this.root.dataset;
		data.frAuto = this.enabled ? 'on' : 'off';
		data.frAutoRounds = String(this.rounds);
		data.frAutoPending = this.timer === 0 ? '0' : '1';
	}

	/**
	 * Meldet alles ab und räumt den Zeitgeber weg. Wird beim Verlassen der
	 * Seite gerufen, VOR dem Spielkern (fruit-risk.js, teardown()).
	 *
	 * Kein fr:auto: eine Meldung in eine sterbende Seite ist Lärm, und
	 * RiskPanel.destroy() verfährt genauso.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.disarm();
		this.enabled = false;

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.disposeButton?.();
		this.button?.classList.remove('fr-btn--lit');
		this.button?.setAttribute('aria-pressed', 'false');
		this.syncAttributes();
	}
}

export default AutoPlay;
