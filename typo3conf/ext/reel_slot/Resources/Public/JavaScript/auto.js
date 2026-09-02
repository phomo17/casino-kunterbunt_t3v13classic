/**
 * Reel Slot – der Auto-Modus
 * ==========================================
 *
 * CONCEPT.md Abschnitt 3.5, vollständig. Ein EIGENER, sehr kleiner
 * Zustandsautomat neben dem Spielkern und neben der Risiko-Leiter — kein Anbau
 * an machine.js und keiner an risk.js.
 *
 *
 * ZWEI ZUSTÄNDE, MEHR NICHT
 * -------------------------
 *   aus   Der Automat wartet auf den Menschen. Diese Datei tut nichts.
 *   an    AUTO MODE leuchtet. Nach jeder Auswertung wartet der Automat rund
 *         eine Sekunde und zieht dann selbst.
 *
 * Der Auto-Modus ist eine BETRIEBSART, kein Rundenzustand. Deshalb hat
 * machine.js keinen Zustand „auto" bekommen — dieselbe Begründung, mit der
 * Phase 8 auf einen Zustand „risk" verzichtet hat: die Zustandsmaschine des
 * Spielkerns beschreibt den ZUG (idle → spinning → stopping → evaluating →
 * result), nicht die Frage, wer den Hebel bedient. Ein Zustand „auto" müsste
 * zudem parallel zu jedem der fünf vorhandenen gelten und die Übergangstabelle
 * verdoppeln.
 *
 *
 * WIE DER NÄCHSTE ZUG AUSGELÖST WIRD — DIE KERNFRAGE DIESER PHASE
 * ---------------------------------------------------------------
 * Über das eingehende Ereignis rs:spin am Gehäuse. machine.js hat dafür genau
 * einen Zuhörer, der nichts weiter tut als startRound() zu rufen.
 *
 * Entscheidend ist, dass es DERSELBE WEG ist wie beim Menschen: ab der ersten
 * Zeile von startRound() unterscheidet sich gar nichts. Es wird gewürfelt, das
 * ABBRECHBARE rs:round wird gefeuert, die Kasse prüft und bucht ab, risk.js
 * sieht das Ereignis in der Erfassungsphase. Es gibt keinen zweiten
 * Rundenweg, an dem Abbuchung oder Veto vorbeiliefen.
 *
 * Ein simulierter Hebelzug wäre der falsche Weg: lever.js ruft
 * setPointerCapture() mit der pointerId des echten Zeigers — für eine erfundene
 * Kennung wirft der Browser NotFoundError —, es bräuchte gültige clientY-Werte
 * aus getBoundingClientRect() und einen 90-ms-Nachschlag. Ein Automat, der
 * seine eigene Bedienoberfläche mit gefälschten Zeigerereignissen betrügt, ist
 * außerdem nicht nachprüfbar.
 *
 * rs:spin ist NICHT abbrechbar. Das Veto sitzt weiterhin an rs:round, wo es
 * hingehört. Ein zweites Vetorecht wäre ein zweiter Mechanismus für dieselbe
 * Frage.
 *
 *
 * WARUM DIESE DATEI DAS GUTHABEN NICHT SELBST PRÜFT
 * -------------------------------------------------
 * Sie importiert credit.js nicht und ruft canAfford() nicht. Sie LIEST DAS
 * ERGEBNIS DES VETOS ab:
 *
 *   1. rs:spin senden.
 *   2. Wenn danach der Rundenzustand nicht 'spinning' ist, kam die Runde nicht
 *      zustande — dann schaltet sich der Auto-Modus ab.
 *
 * Das geht, weil dispatchEvent() synchron ist: wenn die Zeile zurückkehrt, hat
 * machine.js gewürfelt, das Veto ist gefallen oder nicht, und das eigene
 * rs:state ist bereits durch diesen Zuhörer gelaufen.
 *
 * Vier Gründe für diesen Weg:
 *
 *  · EINE WAHRHEIT. DECISIONS.md Phase 7 legt die Deckungsprüfung eindeutig in
 *    den rs:round-Zuhörer der Kasse. Eine zweite Prüfung hier wäre eine zweite
 *    Wahrheit über denselben Sachverhalt (CONCEPT.md Grundsatz 8).
 *  · KEIN DRITTER ABZUG von readBet(). Die Leseregel steht heute schon zweimal
 *    wortgleich da; eine dritte Kopie wäre eine dritte Stelle, die auseinander
 *    laufen kann.
 *  · RICHTIG AUCH MORGEN. Mit dem serverseitigen Konto (CONCEPT.md Abschnitt 8)
 *    ist credit.balance ein zwischengespeicherter Wert und kann veraltet sein.
 *    Das Veto ist die verbindliche Antwort.
 *  · SICHERE RICHTUNG. Scheitert eine Runde aus irgendeinem anderen Grund,
 *    schaltet sich der Auto-Modus ebenfalls ab. Ein Automat, der stehenbleibt,
 *    ist besser als einer, der im Sekundentakt abgelehnte Runden feuert.
 *
 * Eine eigene Meldung gibt es dafür nicht: die Kasse hat im selben Augenblick
 * schon GUTHABEN ZU GERING gezeigt, und die dunkel werdende Taste ist die
 * zweite Rückmeldung. Ein fünfter Text verdrängte nur den richtigen.
 *
 *
 * DIE PAUSE — GENAU EIN ZEITGEBER
 * -------------------------------
 * setTimeout, nicht requestAnimationFrame: die Pause ist eine Wartezeit auf der
 * Uhr, keine Bewegung. Es gibt je Automat höchstens EINEN laufenden Zeitgeber;
 * arm() löscht immer erst den alten. Ob einer läuft, steht als
 * data-rs-auto-pending am Gehäuse und ist damit von außen messbar.
 *
 * Wird während der Pause ausgeschaltet, wird sie gelöscht und es beginnt kein
 * Zug mehr. Ein verstecktes Browserfenster hält die Zeichenschleife des
 * Spielkerns an; der Zeitgeber läuft gedrosselt weiter, aber weil erst bei
 * rs:result neu gespannt wird, kann höchstens EINE angefangene Runde
 * stehenbleiben. Kein Stapel, kein Ereignisstau.
 *
 *
 * WAS „AB DEM NÄCHSTEN ZUG" GENAU HEISST
 * --------------------------------------
 * Gespannt wird beim rs:result der laufenden Runde. Der erste selbst
 * ausgelöste Zug beginnt also rund eine Sekunde nach der Auswertung.
 *
 * NICHT nach rs:risk phase:'end': dieses Ereignis kommt im Auto-Modus gar
 * nicht, weil das Angebot vorher verhindert wird. Und bei einer verlorenen
 * Runde käme überhaupt kein Risiko-Ereignis. rs:result ist der einzige Anker,
 * den JEDE Runde liefert.
 *
 *
 * KEINE RISIKO-LEITER — UND WAS DER SCHALTER WANN BEWIRKT
 * -------------------------------------------------------
 * Vor jedem Angebot fragt risk.js mit dem abbrechbaren rs:risk phase:'offer'.
 * Ist der Auto-Modus an, wird abgebrochen; wallet.js schreibt den Gewinn dann
 * sofort gut (genau der Weg, den Phase 7 ohnehin geht, wenn niemand übernimmt).
 *
 * Daraus folgt EINE Regel für alle Umschaltzeitpunkte: es entscheidet der
 * Schalterstand im Augenblick des Angebots.
 *
 *   eingeschaltet während des Laufs   → Angebot entfällt, sofort gutgeschrieben
 *   ausgeschaltet während des Laufs   → Angebot wie immer, RISK blinkt
 *   eingeschaltet, während RISK blinkt → rs:riskcollect nimmt den Gewinn
 *   eingeschaltet, während die Leiter läuft → dasselbe (AUSLEGUNG, siehe unten)
 *
 * CONCEPT.md 3.5 nennt nur den blinkenden RISK. Dass auch eine LAUFENDE Leiter
 * beim Einschalten aussteigt und gutschreibt, ist eine Auslegung: der
 * Auto-Modus verspricht „keine Risiko-Leiter", die Leiter weiterlaufen zu
 * lassen widerspräche dem sichtbar, und den bereits verdoppelten Gewinn
 * verfallen zu lassen wäre eine Strafe für das Betätigen eines Schalters —
 * dieselbe Erwägung, mit der Phase 8 beim Verlassen der Seite gutschreibt.
 * Deshalb wird rs:riskcollect beim Einschalten IMMER gesendet; im
 * Grundzustand ist es wirkungslos, es braucht also keine Vorabfrage.
 *
 *
 * WOFÜR DIESE DATEI NICHTS TUN MUSS
 * ---------------------------------
 *  · „Die Walzen halten nacheinander von allein an." Das tut machine.js schon
 *    ohne jeden Tastendruck: tickFrame() befiehlt den Halt bei 1,2 / 1,9 /
 *    2,6 Sekunden ab Hebelzug (AUTO_STOP_S). Der Auto-Modus fasst die Walzen
 *    nicht an und darf es nicht — sonst gäbe es zwei Bewegungsabläufe.
 *  · STOP, Hebel, RISK und REWARD während des Auto-Modus: alle vier verhalten
 *    sich unverändert. STOP verkürzt die Runde, der nächste rs:result spannt
 *    einfach früher. Der Hebel während der Pause startet eine zusätzliche
 *    Runde; feuert der Zeitgeber dann in einen laufenden Zug, wird nichts
 *    getan und NICHT abgeschaltet — ein besetzter Automat ist kein Veto.
 *    RISK und REWARD sind wirkungslos, weil risk.js in 'off' steht.
 *
 *
 * SPEICHERVERBRAUCH ÜBER 50+ ZÜGE
 * -------------------------------
 * Er wächst nicht, und das hängt an genau drei Dingen:
 *
 *  1. ZUHÖRER: alle werden EINMAL im Konstruktor angemeldet und in this.bound
 *     verzeichnet. Je Runde kommt keiner hinzu.
 *  2. ZEITGEBER: höchstens einer, immer erst gelöscht, dann neu gespannt.
 *  3. ANSPRUCHSOBJEKTE: diese Datei hält KEIN WinClaim fest. Sie verhindert das
 *     Angebot und rührt den Anspruch nicht an; wallet.js löst ihn im selben
 *     Takt ein, danach ist er unerreichbar und wird eingesammelt.
 *
 * Messbar im Browser: die Zahl der DOM-Knoten (document.querySelectorAll('*')
 * .length) ist nach 50 Zügen identisch, data-rs-auto-pending ist nie etwas
 * anderes als 0 oder 1, und die Bilanz aus addEventListener minus
 * removeEventListener bleibt ab dem ersten Zug konstant.
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------
 * destroy() (aus pagehide, siehe reel-slot.js) löscht den Zeitgeber, meldet alle
 * Zuhörer ab und macht die Taste dunkel. Es wird dabei KEIN rs:auto gemeldet:
 * eine Meldung in eine sterbende Seite ist Lärm, und risk.js verfährt beim
 * Abräumen genauso.
 *
 *
 * EREIGNISSE, DIE DIESE DATEI SENDET (alle am .rs-machine, alle bubbles)
 * ----------------------------------------------------------------------
 *   rs:spin          „Zieh jetzt den Hebel." Nicht abbrechbar.
 *   rs:auto          detail: { on, reason, rounds }. reason ist 'user' oder
 *                     'insufficient'. Phase 10 hängt hier den Schaltklang an.
 *   rs:riskcollect   beim Einschalten; im Grundzustand wirkungslos.
 *
 * EREIGNISSE, DIE DIESE DATEI ABHÖRT
 * ----------------------------------
 *   rs:state         Rundenzustand mitführen.
 *   rs:result        die Pause spannen.
 *   rs:risk          bei phase:'offer' abbrechen.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

/**
 * Pause zwischen zwei selbst ausgelösten Zügen, in Millisekunden.
 *
 * CONCEPT.md 3.5 sagt „ca. 1 s Pause". Gemessen wird ab rs:result, also ab der
 * Auswertung — nicht ab dem Stillstand der letzten Walze und nicht ab der
 * Gutschrift. Die Gutschrift ist zu diesem Zeitpunkt eine Mikroaufgabe entfernt
 * und damit lange vor Ablauf der Pause erledigt.
 */
const PAUSE_MS = 1000;

/**
 * Rundenzustände, in denen ein neuer Zug beginnen darf.
 *
 * Absichtlich als Zeichenketten und nicht über einen Import von STATE aus
 * machine.js — dieselbe Begründung wie in wallet.js: die Zustandsnamen stehen
 * im detail eines DOM-Ereignisses und sind damit Teil des Vertrags zwischen den
 * Phasen, nicht Teil einer Klasse. Angenehmer Nebeneffekt: jeder Zustand, den
 * eine spätere Phase hinzufügt, hält den Auto-Modus von allein an, weil er hier
 * nicht aufgeführt ist. Das ist die sichere Richtung.
 */
const FREE_STATES = Object.freeze(['idle', 'result']);

/**
 * Der Auto-Modus eines Gehäuses.
 */
export class AutoPlay {
	/**
	 * @param {HTMLElement} root ein .rs-machine
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase 5 entspricht
	 */
	constructor(root) {
		const cabinet = root.querySelector('.rs-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .rs-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;

		// Fehlt die Taste, bleibt der Auto-Modus unerreichbar und diese Datei
		// still — gleiche Haltung wie findNixieGroup(): ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen.
		this.button = cabinet.querySelector('.rs-btn[data-rs-button="auto"]');

		/** Ist der Auto-Modus eingeschaltet? */
		this.enabled = false;

		/** Kennung des laufenden Pausen-Zeitgebers, oder 0. Immer höchstens einer. */
		this.timer = 0;

		/** Vom Auto-Modus ausgelöste Züge. Nur zur Auskunft und zum Nachmessen. */
		this.rounds = 0;

		/**
		 * Der zuletzt gemeldete Rundenzustand. 'idle' ist der Anfangswert des
		 * Spielkerns (machine.js, STATE.IDLE); bis zum ersten rs:state stimmt
		 * er deshalb ohne weiteres Zutun.
		 */
		this.machineState = 'idle';

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		this.fireStep = () => this.fire();

		this.listen(root, 'rs:state', (event) => this.onState(event));
		this.listen(root, 'rs:result', () => this.onResult());
		this.listen(root, 'rs:risk', (event) => this.onRisk(event));

		this.wireButton();
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
		const event = new CustomEvent(name, { detail, cancelable, bubbles: true });
		this.root.dispatchEvent(event);
		return event;
	}

	/**
	 * Verdrahtet die Taste AUTO MODE.
	 *
	 * pointerdown und nicht click, wie bei STOP, RISK und REWARD: eine Taste an
	 * einem Spielautomaten reagiert im Moment des Drückens.
	 * .rs-btn--pressed hält die Kappe unten, solange gedrückt wird;
	 * machine.css hat dafür zusätzlich :active, das aber verloren geht, sobald
	 * der Zeiger die Taste verlässt.
	 *
	 * @returns {void}
	 */
	wireButton() {
		if (this.button === null) {
			return;
		}
		const down = (event) => {
			if (!event.isPrimary) {
				return;
			}
			this.button.classList.add('rs-btn--pressed');
			this.toggle();
		};
		const release = () => {
			this.button.classList.remove('rs-btn--pressed');
		};
		this.listen(this.button, 'pointerdown', down);
		this.listen(this.button, 'pointerup', release);
		this.listen(this.button, 'pointercancel', release);
		this.listen(this.button, 'pointerleave', release);
	}

	/**
	 * Umschalten. CONCEPT.md 3.5: „Die Taste AUTO MODE schaltet um."
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
		this.button?.classList.add('rs-btn--lit');
		this.syncAttributes();
		this.emit('rs:auto', { on: true, reason: 'user', rounds: this.rounds });

		// CONCEPT.md 3.5: „Einschalten, während RISK blinkt: der Gewinn wird
		// gutgeschrieben, die Leiter entfällt." Ohne Vorabfrage: risk.js
		// behandelt Angebot und laufende Leiter gleich und ist im Grundzustand
		// wirkungslos. cashOut() bucht bis einschließlich credit.add() synchron
		// — wenn diese Zeile zurückkehrt, steht der Gewinn im Konto.
		this.emit('rs:riskcollect', {});

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
		this.button?.classList.remove('rs-btn--lit');
		this.syncAttributes();
		this.emit('rs:auto', { on: false, reason, rounds: this.rounds });
	}

	/**
	 * Spannt die Pause — aber nur, wenn der Automat gerade frei ist.
	 *
	 * Läuft noch ein Zug, wird NICHT gespannt: dessen rs:result kommt ohnehin
	 * und spannt dann. Genau daraus folgt „Einschalten mitten in einem
	 * laufenden Zug wirkt ab dem nächsten Zug".
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
	 * @returns {void}
	 */
	fire() {
		this.timer = 0;

		if (!this.enabled) {
			// Kann nach disarm() nicht mehr vorkommen; die Prüfung kostet nichts
			// und macht die Zusage im Code sichtbar.
			this.syncAttributes();
			return;
		}

		if (!FREE_STATES.includes(this.machineState)) {
			// Der Mensch hat in der Pause selbst gezogen. Kein Veto, keine
			// Abschaltung — der nächste rs:result spannt neu.
			this.syncAttributes();
			return;
		}

		// Derselbe Weg wie ein Hebelzug. machine.js ruft daraufhin
		// startRound(), würfelt und feuert das abbrechbare rs:round.
		this.emit('rs:spin', {});

		// dispatchEvent() ist synchron: an dieser Stelle steht fest, ob die
		// Runde zustande kam. Kam sie nicht, hat jemand rs:round abgebrochen —
		// im Regelfall die Kasse wegen zu geringen Guthabens. CONCEPT.md 3.5:
		// „Reicht das Guthaben für den nächsten Zug nicht mehr, schaltet sich
		// der Auto-Modus selbst ab."
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
	 * @param {CustomEvent} event rs:state
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
	 * Das Angebot der Risiko-Leiter verhindern.
	 *
	 * CONCEPT.md 3.5: „Keine Risiko-Leiter im Auto-Modus. RISK blinkt dort
	 * nicht." Wer rs:risk phase:'offer' abbricht, lässt rs:payout
	 * unangetastet — wallet.js schreibt den Gewinn dann sofort gut. Genau diese
	 * Naht hat Phase 8 dafür gebaut (DECISIONS.md, Phase 8).
	 *
	 * Nur 'offer' ist abbrechbar; die übrigen Phasen werden nur beobachtet und
	 * hier ausdrücklich nicht angefasst.
	 *
	 * @param {CustomEvent} event rs:risk
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
	 * Gleiche Absicht wie data-rs-round (Phase 6) und data-rs-risk-* (Phase 8):
	 * der Zustand ist von außen ablesbar, und der Nachweis ist ein
	 * DOM-Lesevorgang statt einer Glaubensfrage. data-rs-auto-pending macht
	 * zusätzlich die Zusage „höchstens ein Zeitgeber" messbar.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const data = this.root.dataset;
		data.rsAuto = this.enabled ? 'on' : 'off';
		data.rsAutoRounds = String(this.rounds);
		data.rsAutoPending = this.timer === 0 ? '0' : '1';
	}

	/**
	 * Meldet alles ab und räumt den Zeitgeber weg. Wird beim Verlassen der
	 * Seite gerufen — CONCEPT.md Phase 9 verlangt „sauberes Aufräumen laufender
	 * Zeitgeber" ausdrücklich.
	 *
	 * Kein rs:auto: eine Meldung in eine sterbende Seite ist Lärm, und
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

		this.button?.classList.remove('rs-btn--lit', 'rs-btn--pressed');
		this.syncAttributes();
	}
}

export default AutoPlay;
