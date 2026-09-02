/**
 * Reel Slot – das Bedienfeld der Risiko-Leiter
 * ============================================
 *
 * Seit Ausbaustufe 2, Phase 2 steht hier nur noch das AUSSEHEN. Das Spielwerk
 * der Leiter — Blinken, Wertung, Verwaltung des offenen Gewinns samt Kappung —
 * liegt im Site Package (CONCEPT.md B.6.2):
 *
 *   @phomo17/casino-startpage/risk-ladder.js   das Werk
 *   @phomo17/casino-startpage/risk-timing.js   die Schwierigkeitskurve
 *
 * Der Grund für die Trennung: Video Slot und Coin Pusher benutzen dieselbe
 * Leiter, und die 200-ms-Sicherheitsgrenze soll genau einmal bewiesen werden,
 * nicht je Gerät erneut. Der geteilte Baustein darf deshalb keinen Automaten
 * kennen — er kennt weder .rs-btn noch rs:risk noch eine Nixie-Röhre.
 *
 *
 * WAS DIESE DATEI TUT — GENAU VIER DINGE
 * --------------------------------------
 *  1. Sie sucht die Bedienteile dieses Gehäuses: RISK, REWARD, die beiden
 *     Risiko-Tasten, die beiden Lichtfelder, die Röhrengruppen STUFE und
 *     GEWINN.
 *  2. Sie leitet Tastendrücke an die Leiter weiter.
 *  3. Sie malt, was die Leiter herüberreicht (paint).
 *  4. Sie übersetzt zwischen den Ereignissen dieses Automaten und den Methoden
 *     der Leiter (rs:payout, rs:round, rs:riskcollect hinein; rs:risk und
 *     rs:risktick hinaus).
 *
 * Sie enthält keine einzige Zeitangabe und keine Wertungsregel. Wer wissen
 * will, WARUM das gemalte Lichtfeld gewertet wird und nicht die Uhr, warum es
 * keine Kulanzspanne gibt und warum die Zeichenschleife nicht driften kann,
 * liest den Kopf von risk-ladder.js.
 *
 *
 * DIE DREI ZUSTÄNDE (sie gehören der Leiter, nicht dieser Datei)
 * -------------------------------------------------------------
 *   off      nichts los. Alle Tasten der Leiter sind wirkungslos.
 *   offer    Es liegt ein Gewinn vor, RISK blinkt. Der Spieler hat drei Wege:
 *              Hebel  → Gewinn wird gutgeschrieben, nächster Zug beginnt
 *              RISK   → Leiter startet
 *              REWARD → Gewinn wird gutgeschrieben, kein neuer Zug
 *   ladder   Die Leiter läuft. Nur links, rechts und REWARD wirken.
 *
 *
 * WIE SIE ANDOCKT — OHNE machine.js ODER wallet.js ANZUFASSEN
 * -----------------------------------------------------------
 * Über die abbrechbaren Ereignisse, die die Phasen 6 und 7 dafür gebaut haben.
 *
 *   rs:payout   (von wallet.js, abbrechbar) → preventDefault(), Anspruch an die
 *                Leiter übergeben. Genau der Fall, den der Kopf von payout.js
 *                beschreibt.
 *   rs:round    (von machine.js, abbrechbar) → im Angebot durchlassen und dabei
 *                gutschreiben; in der Leiter abbrechen.
 *
 * Es gibt in dieser Datei KEINEN Import von Machine und keinen von Wallet.
 *
 *
 * WARUM rs:round IN DER ERFASSUNGSPHASE AM DOKUMENT ABGEHÖRT WIRD
 * -----------------------------------------------------------------
 * addEventListener(…, true) an root.ownerDocument. Zuhörer der Erfassungsphase
 * an einem Vorfahren laufen VOR allen Zuhörern am Ziel selbst. Das ist hier
 * kein Kunstgriff, sondern zwingend, und zwar aus zwei Gründen:
 *
 *  1. Im ANGEBOT muss der Gewinn gutgeschrieben sein, BEVOR wallet.js
 *     credit.canAfford(bet) prüft. Sonst könnte ein Spieler mit Stand 0 und 100
 *     offenem Gewinn den Hebel nicht ziehen — die Kasse sagte „GUTHABEN ZU
 *     GERING" und der Gewinn bliebe hängen.
 *  2. In der LEITER genügt preventDefault() NICHT. Ein abgebrochenes Ereignis
 *     erreicht später angemeldete Zuhörer trotzdem (in Phase 7 gemessen), die
 *     Kasse würde den Einsatz für eine Runde abbuchen, die gar nicht zustande
 *     kommt. Deshalb zusätzlich stopPropagation().
 *
 * Die Alternative „in reel-slot.js einfach vor der Kasse bauen" wäre eine
 * unsichtbare Kopplung an eine Zeilenreihenfolge. So steht die Zusage im Code.
 *
 *
 * WARUM machine.js KEINEN ZUSTAND „risk" BEKOMMEN HAT
 * ---------------------------------------------------
 * Weil der Hebel in den beiden Abschnitten VERSCHIEDEN wirken muss: im Angebot
 * nimmt er den Gewinn und startet den nächsten Zug, in der Leiter tut er nichts
 * (CONCEPT.md 3.4). Ein Zustand mit canPull === false könnte nur das Zweite.
 * Der Automat bleibt deshalb während Angebot UND Leiter in „result"; wirkungslos
 * ist der Hebel in der Leiter durch das Veto oben. Ein Mechanismus, nicht zwei.
 *
 * Nebeneffekt, ausdrücklich gewollt: die Einsatzwahl bleibt bedienbar. Der Zug
 * ist vorbei; CONCEPT.md 3.3 sperrt sie nur „bis zum Ende des Zuges".
 *
 *
 * WEM DIE ANZEIGEN GEHÖREN
 * ------------------------
 * CONCEPT.md Abschnitt 5, Grundsatz 8 verbietet, dass zwei Stellen dieselbe
 * Anzeige pflegen. Die GEWINN-Röhren werden deshalb ÜBERGEBEN, nicht geteilt:
 *
 *   Rundenbeginn bis rs:result   machine.js (clearResult / winDisplay.show)
 *   Angebot und Leiter            diese Datei
 *   ab dem nächsten rs:round     wieder machine.js
 *
 * Zu jedem Zeitpunkt genau ein Eigentümer. Deshalb fassen paintOffer() und
 * paintOff() die GEWINN-Gruppe NICHT an: beim Angebot steht dort noch der
 * Betrag, den machine.js gesetzt hat, und im Grundzustand gehört sie wieder
 * ihm. Nur 'level' und 'settled' schreiben hinein. Beim Rückgeben räumt diese
 * Datei ein stehen gebliebenes Überlaufblinken ab (clearWinOverflow). Die
 * STUFE-Gruppe gehört ausschließlich dieser Datei.
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------
 * destroy() (aus pagehide, siehe reel-slot.js) reicht an RiskLadder.destroy()
 * weiter, und das schreibt einen offenen Gewinn GUT.
 *
 * Warum nicht verfallen lassen, warum das nicht doppelt gutschreiben kann und
 * warum der Wert die Seite überlebt: Kopf von risk-ladder.js, Abschnitt „BEIM
 * ABRÄUMEN WIRD GUTGESCHRIEBEN, NICHT VERWORFEN". Danach steht das Gehäuse
 * wieder im Grundzustand — kommt die Seite aus dem Vor-/Zurück-Zwischenspeicher
 * zurück, spielt niemand eine bereits bezahlte Leiter weiter.
 *
 *
 * EINE ANDERE REGISTERKARTE ÄNDERT DAS GUTHABEN, WÄHREND DIE LEITER LÄUFT
 * -----------------------------------------------------------------------
 * Kein Sonderfall, und mit Absicht keine Zeile Code. Der offene Gewinn liegt
 * AUSSERHALB des Kontos, im Anspruch. Was die andere Karte tut, landet über das
 * storage-Ereignis in credit.js und von dort über die Anmeldung der Kasse in
 * den GUTHABEN-Röhren; die Leiter merkt davon nichts. Erst beim Gutschreiben
 * trifft der Anspruch auf den DANN gültigen Stand. Ein Wettlauf ist nicht
 * möglich, weil es nichts gibt, worum gewettlaufen werden könnte.
 * Läuft das Konto dabei über, meldet wallet.js wie gehabt „KONTO VOLL"; die
 * Kappung sitzt in WinClaim.collect() und nicht hier (Kopf von payout.js).
 *
 *
 * EREIGNISSE, DIE DIESE DATEI SENDET (alle am .rs-machine, alle bubbles)
 * -----------------------------------------------------------------------
 *   rs:risk phase:'offer'    ABBRECHBAR. Vor jedem Angebot. Wer abbricht,
 *                             verhindert die Leiter; die Kasse zahlt dann
 *                             sofort aus. Genau das verlangt CONCEPT.md 3.5
 *                             für den Auto-Modus.
 *   rs:risk phase:'start'    Leiter läuft an, Stufe 1.
 *   rs:risk phase:'hit'      Treffer. level und win sind bereits die neuen.
 *   rs:risk phase:'miss'     Fehlgriff. detail.lost ist der verlorene Betrag.
 *   rs:risk phase:'collect'  Ausgestiegen und gutgeschrieben.
 *   rs:risk phase:'end'      Grundzustand wiederhergestellt.
 *   rs:risktick              Das gemalte Lichtfeld hat gewechselt.
 *                             detail: { level, lit, on }. sound.js hängt hier
 *                             den Risiko-Blinkton an und filtert auf on.
 *
 * Diese sieben Ereignisse und ihre detail-Felder sind gegenüber Teil A
 * UNVERÄNDERT. auto.js und sound.js mussten für den Umzug deshalb nicht
 * angefasst werden — das ist zugleich der Nachweis, dass die Ereignisnaht aus
 * Teil A, Phase 6 an der richtigen Stelle lag.
 *
 * EREIGNIS, DAS DIESE DATEI ENTGEGENNIMMT
 * ---------------------------------------
 *   rs:riskcollect           „Steig jetzt aus und schreib gut." Im
 *                             Grundzustand wirkungslos. Das ist die Naht für
 *                             CONCEPT.md 3.5: „Einschalten, während RISK
 *                             blinkt: der Gewinn wird gutgeschrieben, die
 *                             Leiter entfällt."
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { drawIndex } from '@phomo17/reel-slot/rng.js';
import { findNixieGroup } from '@phomo17/reel-slot/nixie.js';
import {
	RiskLadder,
	PHASE_OFFER,
	PHASE_LADDER,
} from '@phomo17/casino-startpage/risk-ladder.js';

/**
 * Das Bedienfeld der Risiko-Leiter an EINEM Gehäuse.
 *
 * Es hält alles, was dieses Gerät ausmacht — die Elemente, die CSS-Klassen, die
 * data-Attribute und die rs:-Ereignisse — und gibt jede Entscheidung an die
 * geteilte RiskLadder weiter. Umgekehrt malt es, was die Leiter ihm
 * herüberreicht. Eine Zeitangabe oder eine Wertungsregel steht hier nicht.
 */
export class RiskPanel {
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

		this.riskButton = cabinet.querySelector('.rs-btn[data-rs-button="risk"]');
		this.rewardButton = cabinet.querySelector('.rs-btn[data-rs-button="reward"]');

		/** Die beiden Risiko-Tasten, links und rechts neben RISK. */
		this.buttons = {
			left: cabinet.querySelector('.rs-btn[data-rs-button="risk-left"]'),
			right: cabinet.querySelector('.rs-btn[data-rs-button="risk-right"]'),
		};

		/** Die Lichtfelder darüber. */
		this.lamps = {
			left: cabinet.querySelector('.rs-lamp[data-rs-lamp="risk-left"]'),
			right: cabinet.querySelector('.rs-lamp[data-rs-lamp="risk-right"]'),
		};

		// Fehlt eine Gruppe, spielt der Automat ohne diese Anzeige weiter –
		// gleiche Haltung wie findNixieGroup() selbst.
		this.stepGroup = findNixieGroup(cabinet, 'stufe');
		this.winGroup = findNixieGroup(cabinet, 'gewinn');
		this.stepCeiling = this.stepGroup === null ? 0 : 10 ** this.stepGroup.length - 1;
		this.winCeiling = this.winGroup === null ? 0 : 10 ** this.winGroup.length - 1;

		/**
		 * Das geteilte Spielwerk. Es bekommt drei Funktionen und sonst nichts —
		 * kein Element, keine Klasse, keinen Ereignisnamen. drawIndex(2) ist
		 * dieselbe Quelle, aus der auch die Walzen gezogen werden
		 * (crypto.getRandomValues, ohne Modulo-Bias).
		 */
		this.ladder = new RiskLadder({
			draw: () => drawIndex(2),
			paint: (view) => this.render(view),
			notify: (message) => this.report(message),
		});

		/** @type {Array<{target: EventTarget, type: string, handler: function, capture: boolean}>} */
		this.bound = [];

		this.listen(root, 'rs:payout', (event) => this.onPayout(event));
		this.listen(root, 'rs:riskcollect', () => this.ladder.collect());

		// Erfassungsphase am Dokument – siehe Dateikopf.
		this.listen(root.ownerDocument, 'rs:round', (event) => this.onRound(event), true);

		this.wireButton(this.riskButton, () => this.ladder.start());
		this.wireButton(this.rewardButton, () => this.ladder.collect());
		this.wireButton(this.buttons.left, () => this.ladder.guess('left'));
		this.wireButton(this.buttons.right, () => this.ladder.guess('right'));

		// Grundzustand einmal malen. Die Leiter malt beim Bau NICHT von selbst:
		// sie weiß nicht, ob das Gerät schon fertig gebaut ist.
		this.render(this.ladder.view('init'));
	}

	/**
	 * @param {EventTarget} target
	 * @param {string} type
	 * @param {function} handler
	 * @param {boolean} [capture]
	 * @returns {void}
	 */
	listen(target, type, handler, capture = false) {
		target.addEventListener(type, handler, capture);
		this.bound.push({ target, type, handler, capture });
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
	 * Verdrahtet eine Taste auf pointerdown.
	 *
	 * pointerdown und nicht click: eine Taste an einem Spielautomaten reagiert
	 * im Moment des Drückens. Bei einer Leiter mit 40 ms Trefferfenster ist das
	 * nicht Geschmackssache – click feuert erst beim Loslassen.
	 * .rs-btn--pressed wird immer gesetzt, auch wenn die Taste gerade nichts
	 * bewirkt: eine Kappe fährt ein, wenn man draufdrückt.
	 *
	 * @param {?HTMLElement} button
	 * @param {function(): void} action
	 * @returns {void}
	 */
	wireButton(button, action) {
		if (button === null) {
			return;
		}
		const down = (event) => {
			if (!event.isPrimary) {
				return;
			}
			button.classList.add('rs-btn--pressed');
			action();
		};
		const release = () => {
			button.classList.remove('rs-btn--pressed');
		};
		this.listen(button, 'pointerdown', down);
		this.listen(button, 'pointerup', release);
		this.listen(button, 'pointercancel', release);
		this.listen(button, 'pointerleave', release);
	}

	/* ---------------------------------------------------------------- *
	 * Hinein: Ereignisse dieses Automaten → Methoden der Leiter
	 * ---------------------------------------------------------------- */

	/**
	 * Ein Gewinn liegt vor. Übernimmt die Leiter ihn?
	 *
	 * Die Reihenfolge ist Absicht: erst die Rückfrage an den Auto-Modus, dann
	 * die Übergabe an die Leiter, und ERST WENN die zugegriffen hat, wird
	 * rs:payout abgebrochen. Lehnt die Leiter ab, bleibt rs:payout unangetastet
	 * und wallet.js zahlt wie immer sofort aus — ein Gewinn kann auf diesem Weg
	 * nicht verlorengehen.
	 *
	 * @param {CustomEvent} event abbrechbares rs:payout aus wallet.js
	 * @returns {void}
	 */
	onPayout(event) {
		const claim = event.detail?.claim;
		const amount = Number(claim?.amount);
		if (claim === undefined || claim === null
			|| typeof claim.collect !== 'function'
			|| !Number.isFinite(amount) || amount <= 0) {
			return;
		}

		// Die eine Frage an auto.js: darf die Leiter überhaupt angeboten werden?
		// Im Auto-Modus nicht (CONCEPT.md 3.5).
		if (this.emit('rs:risk', { phase: 'offer', level: 0, win: amount }, true).defaultPrevented) {
			return;
		}

		if (!this.ladder.offer(claim)) {
			return;
		}

		event.preventDefault();
	}

	/**
	 * Der Hebel wurde gezogen – oder es wurde versucht.
	 *
	 * Läuft in der Erfassungsphase am Dokument, also garantiert vor der Kasse.
	 * Begründung im Dateikopf.
	 *
	 * @param {CustomEvent} event abbrechbares rs:round
	 * @returns {void}
	 */
	onRound(event) {
		if (event.target !== this.root) {
			return;
		}

		if (this.ladder.phase === PHASE_LADDER) {
			// CONCEPT.md 3.4: „Der Hebel ist in der Risiko-Leiter wirkungslos."
			// preventDefault() lässt die Runde nicht zustande kommen;
			// stopPropagation() hält zusätzlich die Kasse davon ab, den Einsatz
			// für eine Runde abzubuchen, die es nicht geben wird.
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		if (this.ladder.phase === PHASE_OFFER) {
			// CONCEPT.md 3.4: „Hebel ziehen → der Gewinn wird gutgeschrieben,
			// RISK geht aus, der nächste Zug beginnt." Nicht abbrechen: die
			// Runde SOLL zustande kommen. collect() bucht bis einschließlich
			// credit.add() synchron, die Kasse sieht also gleich den neuen Stand.
			this.ladder.collect();
		}

		// Rückgabe der GEWINN-Röhren an machine.js: ein stehen gebliebenes
		// Überlaufblinken darf nicht in die nächste Runde hineinlaufen.
		this.clearWinOverflow();
	}

	/* ---------------------------------------------------------------- *
	 * Hinaus: Meldungen der Leiter → Ereignisse dieses Automaten
	 * ---------------------------------------------------------------- */

	/**
	 * Übersetzt eine Meldung der Leiter in ein Ereignis am Gehäuse.
	 *
	 * Die Namen und detail-Felder sind wortgleich die aus Teil A, Phase 8 —
	 * deshalb mussten auto.js und sound.js für den Umzug nicht angefasst werden.
	 *
	 * @param {{type: string, level: number, win: number, lost?: number,
	 *          lit?: string, on?: boolean}} message
	 * @returns {void}
	 */
	report(message) {
		if (message.type === 'tick') {
			this.emit('rs:risktick', { level: message.level, lit: message.lit, on: message.on });
			return;
		}

		const detail = { phase: message.type, level: message.level, win: message.win };
		if (message.type === 'miss') {
			detail.lost = message.lost;
		}
		this.emit('rs:risk', detail);
	}

	/* ---------------------------------------------------------------- *
	 * Malen: die Momentaufnahme der Leiter → dieses Gehäuse
	 * ---------------------------------------------------------------- */

	/**
	 * Der einzige Weg der Leiter an dieses Gehäuse.
	 *
	 * Läuft SYNCHRON, ohne Umweg über einen Zeitgeber oder ein Versprechen —
	 * darauf beruht die Wertung (Kopf von risk-ladder.js).
	 *
	 * @param {{reason: string, phase: string, level: number, win: number,
	 *          lit: string, sideMs: number, onMs: number}} view
	 * @returns {void}
	 */
	render(view) {
		switch (view.reason) {
			case 'offer':
				this.paintOffer(view);
				break;
			case 'level':
				this.paintLevel(view);
				break;
			case 'lit':
				this.paintLit(view);
				break;
			case 'settled':
				// Nur der Betrag. Alles andere kommt gleich darauf mit 'end'.
				this.showWin(view.win);
				break;
			default:
				// 'init' und 'end' – beides ist der Grundzustand.
				this.paintOff(view);
				break;
		}
	}

	/**
	 * Nur die Lichtfelder. Zehnmal je Sekunde der häufigste Fall, deshalb so
	 * klein wie möglich: zwei classList.toggle und ein data-Attribut.
	 *
	 * @param {object} view
	 * @returns {void}
	 */
	paintLit(view) {
		this.lamps.left?.classList.toggle('rs-lamp--on', view.lit === 'left');
		this.lamps.right?.classList.toggle('rs-lamp--on', view.lit === 'right');
		this.root.dataset.rsRiskLit = view.lit;
	}

	/**
	 * Eine neue Stufe: RISK hört auf zu blinken, die beiden Risiko-Tasten
	 * leuchten, STUFE und GEWINN stehen neu.
	 *
	 * Die drei Klassenwechsel stehen hier und nicht in einem eigenen Zweig für
	 * „Leiter startet": sie sind wirkungsgleich beim zweiten Aufruf, und ein
	 * Sonderfall weniger ist ein Fehler weniger.
	 *
	 * @param {object} view
	 * @returns {void}
	 */
	paintLevel(view) {
		this.riskButton?.classList.remove('rs-btn--blink');
		this.buttons.left?.classList.add('rs-btn--lit');
		this.buttons.right?.classList.add('rs-btn--lit');
		this.showStep(view.level);
		this.showWin(view.win);
		this.paintLit(view);
		this.syncAttributes(view);
	}

	/**
	 * Das Aussehen des Angebots: RISK blinkt, REWARD leuchtet.
	 *
	 * REWARD leuchtet mit, weil es hier bedienbar ist („steigt jederzeit aus").
	 * Eine bedienbare, aber dunkle Taste widerspräche der Bildsprache des
	 * Geräts, in der Licht Bedienbarkeit bedeutet.
	 *
	 * Die GEWINN-Gruppe wird NICHT angefasst – sie gehört zu diesem Zeitpunkt
	 * noch machine.js. Siehe Dateikopf.
	 *
	 * @param {object} view
	 * @returns {void}
	 */
	paintOffer(view) {
		this.riskButton?.classList.add('rs-btn--blink');
		this.rewardButton?.classList.add('rs-btn--lit');
		this.buttons.left?.classList.remove('rs-btn--lit');
		this.buttons.right?.classList.remove('rs-btn--lit');
		this.paintLit(view);
		this.showStep(0);
		this.syncAttributes(view);
	}

	/**
	 * Das Aussehen des Grundzustands. Fasst die GEWINN-Gruppe NICHT an – die
	 * gehört dann wieder machine.js.
	 *
	 * @param {object} view
	 * @returns {void}
	 */
	paintOff(view) {
		this.riskButton?.classList.remove('rs-btn--blink', 'rs-btn--lit');
		this.rewardButton?.classList.remove('rs-btn--lit');
		this.buttons.left?.classList.remove('rs-btn--lit');
		this.buttons.right?.classList.remove('rs-btn--lit');
		this.paintLit(view);
		this.showStep(0);
		this.syncAttributes(view);
	}

	/**
	 * Die Stufenanzeige. 0 lässt beide Röhren dunkel.
	 *
	 * Über 99 zeigt die Gruppe lauter Neunen und blinkt – dieselbe Überlaufregel
	 * wie beim Guthaben (DECISIONS.md, Phase 7). Die Neunen setzt
	 * NixieGroup.show() von allein.
	 *
	 * @param {number} level
	 * @returns {void}
	 */
	showStep(level) {
		if (this.stepGroup === null) {
			return;
		}
		if (level <= 0) {
			this.stepGroup.clear();
		} else {
			this.stepGroup.show(level);
		}
		this.stepGroup.element.classList.toggle('rs-nixie-group--overflow', level > this.stepCeiling);
	}

	/**
	 * Die Gewinnanzeige, solange die Leiter sie besitzt.
	 *
	 * Gesetzt, nicht hochgezählt: DECISIONS.md Phase 7 hält fest, dass nur das
	 * GUTHABEN sichtbar hochzählt. In der Leiter kommt hinzu, dass eine Fahrt
	 * von mehreren hundert Millisekunden mit einem 200-ms-Takt kollidierte.
	 *
	 * @param {number} amount
	 * @returns {void}
	 */
	showWin(amount) {
		if (this.winGroup === null) {
			return;
		}
		this.winGroup.show(amount);
		this.winGroup.element.classList.toggle('rs-nixie-group--overflow', amount > this.winCeiling);
	}

	/** Räumt ein Überlaufblinken der GEWINN-Gruppe ab. Siehe Dateikopf. */
	clearWinOverflow() {
		this.winGroup?.element.classList.remove('rs-nixie-group--overflow');
	}

	/**
	 * Schreibt den Zustand als data-Attribute ans Gehäuse.
	 *
	 * Gleiche Absicht wie data-rs-round in Phase 6: der Zustand ist von außen
	 * ablesbar, und der Nachweis ist ein DOM-Lesevorgang statt einer
	 * Glaubensfrage. data-rs-risk-side und -on machen zusätzlich die
	 * 200-ms-Grenze im laufenden Browser nachprüfbar — seit Anhang B steht dort
	 * auf jeder Stufe 200.
	 *
	 * @param {object} view
	 * @returns {void}
	 */
	syncAttributes(view) {
		const data = this.root.dataset;
		data.rsRiskPhase = view.phase;
		data.rsRiskLevel = String(view.level);
		data.rsRiskWin = String(view.win);
		data.rsRiskSide = String(view.sideMs);
		data.rsRiskOn = String(view.onMs);
		data.rsRiskLit = view.lit;
	}

	/**
	 * Meldet alles ab. Ein offener Gewinn wird dabei von der Leiter
	 * gutgeschrieben – siehe Dateikopf.
	 *
	 * @returns {void}
	 */
	destroy() {
		// Zuerst: die Leiter räumt ab, schreibt gut und malt den Grundzustand.
		// Erst danach dürfen die Röhrengruppen sterben, sonst liefe ihr letzter
		// Zündvorgang in eine schon abgeräumte Gruppe.
		this.ladder.destroy();

		for (const { target, type, handler, capture } of this.bound) {
			target.removeEventListener(type, handler, capture);
		}
		this.bound = [];

		for (const button of [this.riskButton, this.rewardButton, this.buttons.left, this.buttons.right]) {
			button?.classList.remove('rs-btn--pressed');
		}

		this.stepGroup?.destroy();
		this.winGroup?.destroy();
	}
}

export default RiskPanel;
