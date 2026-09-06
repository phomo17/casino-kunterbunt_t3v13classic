/**
 * Reel Slot – die Kasse am Gehäuse
 * ================================
 *
 * Zwei Bedienteile, ein Thema: der Gesamtbestand.
 *
 *   .rs-bank       das beleuchtete Fenster im Sockel, das die KASSE zeigt
 *   .rs-cashout    die Taste CASH OUT auf der Auswurfschale
 *
 * CONCEPT.md B.5.1 verlangt: „Die Kasse ist auf JEDER Seite sichtbar, im Saal
 * am Leuchtschild und am Gerät als eigene Anzeige neben dem Gerätekredit."
 * Auf der Automatenseite gibt es kein Leuchtschild — CONCEPT.md Abschnitt 3.2
 * schließt jeden Kasten neben dem Gerät aus. Also zeichnet das Gerät die
 * Anzeige selbst, wie es das für das Guthaben schon immer tut.
 *
 *
 * WARUM NICHT credit-display.js AUS DEM SITE PACKAGE
 * --------------------------------------------------
 * Dieselbe Begründung wie im Kopf von coinslot.js: credit.js ist der VERTRAG
 * und wird benutzt, credit-display.js ist die Verdrahtung eines BESTIMMTEN
 * MARKUPS — es schreibt in [data-ck-credit-display] und braucht eine
 * Statuszeile [data-ck-credit-status]. Das Gehäuse hat weder das eine noch das
 * andere; es hat ein Kassenfenster und ein Meldungsschild. Übernähme es das
 * fremde Markup, hinge sein Sockel an den ck-credit__*-Stilen des
 * Leuchtschildes. Geteilt wird die Rechnung, nicht das Blech.
 *
 *
 * WEM WAS GEHÖRT (CONCEPT.md Abschnitt 5, Grundsatz 8)
 * ----------------------------------------------------
 * Diese Datei ist DURCHGEHEND und ALLEIN Eigentümerin von:
 *
 *   .rs-bank__value        der Kassenstand am Gerät
 *   .rs-bank__announce     der Ansage-Bereich für Hilfsmittel (Audit A-02)
 *   .rs-cashout            die Auszahl-Taste samt ihrem Leuchten und ihrer
 *                          Sperre (aria-disabled, Audit A-06)
 *   data-rs-bank           der Kassenstand, von außen ablesbar
 *   data-rs-total          Kasse + Gerätekredit. Die Bilanz aus CONCEPT.md
 *                          B.10, Phase 3 als EINE Zahl: sie darf sich durch
 *                          Einwurf, Einsatz, Gewinn und Auszahlung NIE ändern.
 *   data-rs-cashout        on | off
 *
 * Sie fasst KEINE Nixie-Röhre an. GUTHABEN und EINSATZ gehören wallet.js,
 * STUFE gehört risk.js, GEWINN wechselt zwischen machine.js und risk.js. Zwei
 * Stellen dürfen nie dieselbe Anzeige pflegen.
 *
 * Sie schreibt auch NICHT data-rs-machine-credit und NICHT data-rs-mirror —
 * die gehören wallet.js. Je Attribut genau ein Schreiber; sonst wäre die
 * Aufteilung nur eine Absichtserklärung.
 *
 * Seit dem Klangausbau sendet sie außerdem EIN Ereignis am Gehäuse:
 *
 *   rs:cashout   { moved, capped, machineCredit }
 *
 * moved ist, was wirklich in die Kasse gewandert ist, capped meldet die
 * Kappung am Höchststand, machineCredit ist der Rest, der im Gerät stehen
 * bleibt. Gesendet wird NACH der Buchung und AUSSCHLIESSLICH von der Taste.
 *
 * Der zweite Weg, auf dem derselbe Betrag zurückwandert — machineCredit.close()
 * beim Verlassen der Seite —, läuft NICHT durch diese Methode, sondern durch
 * cashOut() des geteilten Bausteins selbst. Er bleibt deshalb baulich stumm,
 * und das ist Absicht: reel-slot.js räumt die Klangpulte als ERSTES ab (siehe
 * dort, teardown(), Punkt 0), damit niemand mehr Klang in eine sterbende Seite
 * plant. Ein Ereignis im geteilten Baustein träfe beide Wege und hebelte
 * genau das aus.
 *
 * Umgekehrt gehört ihr der GERÄTEKREDIT NICHT: sie bekommt das Objekt von
 * wallet.js gereicht und liest es. Angelegt (openMachineCredit) und
 * geschlossen (close) wird es ausschließlich dort, denn dort wird damit
 * gespielt. Ein zweites openMachineCredit() mit demselben Schlüssel würde
 * ohnehin einen Fehler werfen — der geteilte Baustein lässt je Schlüssel und
 * Seite genau einen zu.
 *
 *
 * DIE TASTE HÖRT AUF click UND NICHT AUF pointerdown
 * --------------------------------------------------
 * Das ist eine bewusste Abweichung von STOP, AUTO MODE, RISK und REWARD. Jene
 * vier sind Spieltasten an einem mechanischen Gerät: sie sollen im Moment des
 * Drückens wirken, deshalb hängen sie an pointerdown. CASH OUT ist keine
 * Spielhandlung, sondern das Beenden — und für diese Phase ist ausdrücklich
 * verlangt, dass das neue Bedienteil mit der Tastatur bedienbar ist. Ein
 * click-Zuhörer an einem echten button-Element wird von der Eingabe- UND der
 * Leertaste ausgelöst, ein pointerdown-Zuhörer von keiner von beiden.
 *
 * Ist nichts im Gerät, trägt die Taste aria-disabled="true" (Audit A-06): sie
 * ist dunkel (B.5.2, „Sie ist dunkel, wenn nichts drin ist") und tut nichts,
 * bleibt aber im Tastaturweg erreichbar — ein echtes disabled nähme sie aus
 * der Tabulatorfolge. Die eigentliche Sperre besteht in cashOut() selbst, das
 * bei Gerätekredit 0 ein folgenloses No-op ist (machine-credit.js). Das
 * Attribut steht schon im Markup, damit die Taste auch ohne JavaScript nicht
 * so aussieht, als sei sie ein Angebot.
 *
 *
 * WARUM DER KASSENSTAND GESETZT UND NICHT HOCHGEZÄHLT WIRD
 * --------------------------------------------------------
 * DECISIONS.md, Phase 7 hält fest, dass nur das GUTHABEN sichtbar hochzählt.
 * Zwei Zählwerke nebeneinander, die verschieden schnell laufen — die Röhren
 * mit 70 ms je Schritt, das Fenster mit irgendetwas anderem —, läsen sich als
 * Defekt. Das Fenster springt deshalb auf den neuen Wert.
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------
 * destroy() meldet ab und räumt seine drei data-Attribute weg. Es zahlt NICHT
 * aus: das tut wallet.js über machineCredit.close(), und zwar genau einmal.
 * Zwei Stellen, die beim Abräumen buchen, wären zwei Wahrheiten über denselben
 * Betrag. Die Reihenfolge in reel-slot.js ist entsprechend: Kassenanzeigen vor
 * den Verrechnungen.
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über das Meldungsschild (message.js); was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { credit } from '@phomo17/casino-startpage/credit.js';

/** Das Kassenfenster im Sockel. */
const SELECTOR_BANK = '[data-rs-bank-display]';

/** Die Auszahl-Taste auf der Auswurfschale. */
const SELECTOR_CASHOUT = '[data-rs-cashout]';

/** Der Haken, der die Taste leuchten lässt (machine.css, Abschnitt 8). */
const LIT_CLASS = 'rs-cashout--lit';

/** Der Bereich, den nur Hilfsmittel lesen (Cabinet.html, Audit A-02). */
const SELECTOR_ANNOUNCE = '[data-rs-bank-announce]';

/**
 * Ruhezeit vor einer Ansage des Kassenstands, in Millisekunden.
 *
 * Der Kassenstand kann in kurzer Folge mehrfach springen — drei Einwürfe
 * hintereinander sind drei Änderungen in gut einer Sekunde. Angesagt wird
 * deshalb erst, wenn so lange keine neue Änderung mehr kam; aus einer
 * Zählfahrt wird EINE Ansage mit dem Endstand. Die sichtbare Zahl wartet
 * NICHT — sie springt weiterhin sofort.
 */
const ANNOUNCE_MS = 700;

/**
 * Die Kasse eines Gehäuses.
 */
export class Bank {
	/**
	 * @param {HTMLElement} root ein .rs-machine
	 * @param {object} machineCredit der Gerätekredit, angelegt in wallet.js
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        das Meldungsschild — als Objekt übergeben, nicht importiert, damit
	 *        es je Gehäuse bei genau einem bleibt; zwei Schilder hätten zwei
	 *        Zeitgeber und nähmen sich gegenseitig die Anzeige weg
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase 5 entspricht
	 */
	constructor(root, machineCredit, board) {
		const cabinet = root.querySelector('.rs-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .rs-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;
		this.machineCredit = machineCredit;
		this.board = board;

		// Fehlt eines der beiden Bedienteile, tut diese Klasse insoweit nichts.
		// Gleiche Haltung wie findNixieGroup() in nixie.js: ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen.
		this.display = cabinet.querySelector(SELECTOR_BANK);
		this.button = cabinet.querySelector(SELECTOR_CASHOUT);

		// Der Bereich für Hilfsmittel und sein Satzbau. Der Satz kommt aus der
		// Sprachdatei (CONCEPT.md Abschnitt 4); {0} ist der Platz der Zahl.
		// Fehlt das Attribut, wird EINMAL gemeldet und danach geschwiegen —
		// eine Meldung je paint() wäre eine Konsole voller Zeilen.
		this.announcer = cabinet.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.rsTextBank ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			console.error('[reel-slot] Am Kassenfenster fehlt data-rs-text-bank.');
			this.announcer = null;
		}

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		if (this.button !== null) {
			this.listen(this.button, 'click', () => { void this.cashOut(); });
		}

		// Zwei Anmeldungen, zwei Quellen: der Kassenstand kommt aus credit.js,
		// der Zustand der Taste aus dem Gerätekredit. Beide rufen SOFORT einmal
		// auf (reason: 'subscribe') und setzen damit den Anfangszustand — es
		// braucht dafür keinen zweiten Weg.
		//
		// Dass hier zweimal dasselbe paint() hängt, ist kein Versehen: die
		// Anzeige zeigt beide Zahlen, also muss sie sich bei jeder von beiden
		// erneuern. Ein doppelter Aufruf im selben Takt schadet nicht, paint()
		// schreibt nur.
		//
		// reason wird durchgereicht (Audit N-04, 2026-09-05/06): paint()
		// sagt bei 'subscribe' nichts an, siehe dort.
		this.unsubscribeBank = credit.subscribe((detail) => this.paint(detail.reason));
		this.unsubscribeMachine = this.machineCredit.subscribe((detail) => this.paint(detail.reason));
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
	 * Bucht den Gerätekredit vollständig in die Kasse zurück (B.5.2).
	 *
	 * Die Kappung am Höchststand kommt aus machine-credit.js: passt nicht
	 * alles hinein, bleibt der Rest im Gerät stehen und „KONTO VOLL" sagt es.
	 * Das ist die Regel aus Teil A, Phase 7 — jetzt an der Kasse. Verschwinden
	 * kann dabei nichts.
	 *
	 * Der Erfolgsfall räumt das Schild ab: wer eben noch „GUTHABEN ZU GERING"
	 * gelesen hat und dann auszahlt, soll die Meldung nicht stehen sehen.
	 *
	 * @returns {Promise<void>}
	 */
	async cashOut() {
		try {
			const result = await this.machineCredit.cashOut();
			if (result.capped) {
				this.board.show('capped');
			} else if (result.moved > 0) {
				this.board.hide();
			}

			// Nach der Buchung, mit den Zahlen, die die Schnittstelle SELBST
			// gemeldet hat — nicht mit nachgerechneten. Siehe Dateikopf.
			this.root.dispatchEvent(new CustomEvent('rs:cashout', {
				detail: Object.freeze({
					moved: result.moved,
					capped: result.capped,
					machineCredit: result.amount,
				}),
				bubbles: true,
			}));
		} catch (error) {
			// Ein Fehler beim Auszahlen darf die Seite nicht mitreißen; er
			// gehört gemeldet, nicht verschluckt.
			console.error('[reel-slot] Die Auszahlung ist fehlgeschlagen.', error);
		}
	}

	/**
	 * Schreibt Kassenstand, Tastenzustand und die drei data-Attribute.
	 *
	 * data-rs-total ist der eigentliche Nachweis dieser Phase: die Summe aus
	 * Kasse und Gerätekredit. Sie darf sich durch Einwurf und Auszahlung nie
	 * ändern; Einsatz und Gewinn verschieben sie um genau den Betrag, der
	 * gesetzt bzw. gewonnen wurde. Damit ist die Bilanz aus CONCEPT.md B.10,
	 * Phase 3 im DOM messbar statt eine Glaubensfrage.
	 *
	 * Behebungslauf (Audit N-04, 2026-09-05/06): reason ist 'subscribe'
	 * genau einmal je Quelle, beim synchronen Erstaufruf in subscribe() —
	 * noch bevor irgendjemand etwas bedient hat. Die sichtbare Anzeige
	 * (Kassenfenster, Taste, data-rs-*) bekommt ihren Anfangsstand trotzdem
	 * sofort, wie schon immer; nur die Ansage bleibt dabei aus. Jeder
	 * spätere Aufruf trägt einen anderen reason und sagt normal an.
	 *
	 * @param {string} [reason] der Anlass des jeweiligen Aufrufs
	 * @returns {void}
	 */
	paint(reason) {
		const bank = credit.balance;
		const machine = this.machineCredit.amount;

		const formatted = credit.format(bank);

		if (this.display !== null && this.display.textContent !== formatted) {
			this.display.textContent = formatted;
		}

		// Dieselbe Zahl noch einmal, für Hilfsmittel — verzögert. Siehe
		// announce(). NICHT beim Anfangsstand (reason 'subscribe'): sonst
		// läse ein Hilfsmittel beim bloßen Laden der Seite bereits
		// „Kasse: …" vor, obwohl niemand etwas getan hat.
		if (reason !== 'subscribe') {
			this.announce(formatted);
		}

		const lit = machine > 0;
		if (this.button !== null) {
			this.button.classList.toggle(LIT_CLASS, lit);
			// aria-disabled statt disabled (Audit A-06): eine gesperrte Taste
			// bleibt erreichbar, die Sperre selbst besteht in cashOut(), das
			// bei Gerätekredit 0 ein folgenloses No-op ist (machine-credit.js).
			// Ein echtes disabled nähme die Taste aus der Tabulatorfolge.
			if (lit) {
				this.button.removeAttribute('aria-disabled');
			} else {
				this.button.setAttribute('aria-disabled', 'true');
			}
		}

		const data = this.root.dataset;
		data.rsBank = String(bank);
		data.rsTotal = String(bank + machine);
		data.rsCashout = lit ? 'on' : 'off';
	}

	/**
	 * Sagt den Kassenstand an — entprellt.
	 *
	 * Geschrieben wird in den unsichtbaren Bereich mit role="status"
	 * (Cabinet.html). Erst dessen Textänderung löst die Ansage aus; die
	 * gezeichnete Anzeige daneben trägt aria-hidden und ist für Hilfsmittel
	 * gar nicht da. Deshalb steht hier der GANZE Satz und nicht nur die Zahl.
	 *
	 * Die allererste Ansage geht ohne Wartezeit hinaus. Sie fällt in den
	 * Seitenaufbau und ist damit keine Meldung „es hat sich etwas geändert",
	 * sondern der Anfangsstand — sie soll dastehen, sobald das Gerät steht.
	 *
	 * @param {string} value der bereits formatierte Kassenstand
	 * @returns {void}
	 */
	announce(value) {
		if (this.announcer === null) {
			return;
		}

		const text = this.announceTemplate.replace('{0}', value);
		if (this.announcer.textContent === text) {
			// Nichts geändert — kein Schreiben, keine Ansage. paint() läuft
			// auch bei Änderungen des GERÄTEKREDITS, bei denen die Kasse
			// gleich bleibt.
			return;
		}

		this.clearAnnounceTimer();

		if (!this.announced) {
			this.announced = true;
			this.announcer.textContent = text;
			return;
		}

		this.announceTimer = globalThis.setTimeout(() => {
			this.announceTimer = 0;
			this.announcer.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** @returns {void} */
	clearAnnounceTimer() {
		if (this.announceTimer !== 0) {
			globalThis.clearTimeout(this.announceTimer);
			this.announceTimer = 0;
		}
	}

	/**
	 * Meldet alles ab. Wird beim Verlassen der Seite gerufen; CONCEPT.md
	 * Phase 9 verlangt „sauberes Aufräumen laufender Zeitgeber" ausdrücklich —
	 * seit dem Audit-Nachlauf gibt es genau einen, den der Ansage, dazu zwei
	 * Anmeldungen und einen Zuhörer.
	 *
	 * Es wird dabei NICHT ausgezahlt: siehe Dateikopf.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.unsubscribeBank?.();
		this.unsubscribeBank = null;
		this.unsubscribeMachine?.();
		this.unsubscribeMachine = null;

		// CONCEPT.md Phase 9: kein Zeitgeber überlebt das Verlassen der Seite.
		// Der Dateikopf sagte bisher „hier gibt es keinen" — seit dem
		// Audit-Nachlauf gibt es einen.
		this.clearAnnounceTimer();
		if (this.announcer !== null) {
			this.announcer.textContent = '';
		}

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.button?.classList.remove(LIT_CLASS);

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse — genau
		// wie data-rs-round in machine.js und data-rs-auto-* in auto.js.
		delete this.root.dataset.rsBank;
		delete this.root.dataset.rsTotal;
		delete this.root.dataset.rsCashout;
	}
}

export default Bank;
