/**
 * FruitRisk – die drei Risikospiele an diesem Gehäuse
 * ======================================================
 *
 * Das AUSSEHEN der drei Risikospiele an genau diesem Gerät: welche Taste zu
 * welcher Leiter gehört, wie das Angebot aussieht, wie die Ausgänge angesagt
 * werden. Das SPIELWERK selbst — das Blinken, die Wertung, die Kappung —
 * liegt im Site Package (`risk-ladder-multi.js`); in dieser Datei steht keine
 * einzige Zeitangabe und keine Wertungsregel.
 *
 *
 * WARUM NEU GEBAUT UND NICHT AUS video_slot KOPIERT (CONCEPT.md C.14.13)
 * -----------------------------------------------------------------------
 * Dort ist es EINE Leiter mit ZWEI Tasten. Hier sind es DREI Leitern mit
 * ACHT Tasten, ein Angebot in JEDER Runde (Gewinngarantie, C.14.7) und ein
 * erster Druck, der zugleich der erste Versuch ist. Es bliebe nichts stehen.
 *
 *
 * WIE DIESE DATEI ANDOCKT, OHNE machine.js ODER wallet.js UMZUBAUEN
 * -----------------------------------------------------------------------
 *   hinein:
 *     fr:offer       (abbrechbar, von wallet.js)       preventDefault(), den
 *                    Anspruch übernehmen
 *     fr:round       (abbrechbar, von machine.js,       im Angebot
 *                    ERFASSUNGSPHASE AM DOKUMENT)       gutschreiben und
 *                                                        durchlassen; in der
 *                                                        Leiter
 *                                                        preventDefault() UND
 *                                                        stopPropagation()
 *     fr:riskcollect (von einer künftigen Phase F5c,     aussteigen und
 *                    auto.js)                           gutschreiben; im
 *                                                        Grundzustand
 *                                                        wirkungslos
 *   hinaus:
 *     fr:risk        phase: 'offer' ABBRECHBAR (die eine Frage an einen
 *                    künftigen Auto-Modus), danach start/hit/miss/collect/end
 *                    als reine Meldung
 *     fr:risktick    das gemalte Feld hat gewechselt — hier hängt später der
 *                    Klang
 *     fr:offerend    reward · start · auto · ladder-collect · ladder-lost
 *
 * WARUM fr:round IN DER ERFASSUNGSPHASE AM DOKUMENT ABGEHÖRT WIRD
 * -----------------------------------------------------------------------
 * Ein Zuhörer an einem VORFAHREN in der Erfassungsphase läuft garantiert VOR
 * allen Zuhörern am Ziel selbst (hier: wallet.js, das am Gehäuse in der
 * Blasenphase hört). Zwei Gründe, beide zwingend:
 *
 *  1. Im ANGEBOT muss der Gewinn gutgeschrieben sein, BEVOR wallet.js prüft,
 *     ob der Gerätekredit für den Einsatz reicht. Sonst könnte jemand mit
 *     Gerätekredit 0 und 25 offenem Gewinn START nicht drücken.
 *  2. In der LAUFENDEN LEITER genügt preventDefault() nicht: ein
 *     abgebrochenes Ereignis erreicht später angemeldete Zuhörer trotzdem,
 *     und die Kasse buchte den Einsatz für eine Runde ab, die gar nicht
 *     zustande kommt. Deshalb zusätzlich stopPropagation().
 *
 *
 * DIE LEITER STARTEN UND DER ERSTE VERSUCH SIND ZWEI HANDLUNGEN
 * -----------------------------------------------------------------------
 * BEWUSSTE ABWEICHUNG VON CONCEPT.md C.14.5. Dort steht: „Der erste Druck ist
 * zugleich der erste Versuch … es gibt keine getrennte ‚Leiter wählen'- und
 * ‚jetzt drücken'-Handlung." Diese Regel gilt seit dem Auftrag „Starttaste je
 * Gruppe" NICHT mehr, und dieser Kopf behauptet sie deshalb auch nicht mehr —
 * ein Dateikopf, der das Gegenteil des Codes behauptet, ist schlimmer als gar
 * keiner. Es gilt jetzt:
 *
 *  1. Im ANGEBOT blinken NUR die drei Starttasten (openInvitation()). Die acht
 *     Richtungstasten bleiben dunkel und aria-disabled="true": sie können vor
 *     dem Start nichts bewirken, und eine einladende Taste ohne Wirkung wäre
 *     eine sichtbare Lüge.
 *  2. Ein Druck auf eine Starttaste beginnt GENAU DIESE Leiter auf Stufe 1
 *     (onStart() → ladder.start()). Er ist KEIN Versuch: gewertet wird nichts,
 *     es kann dabei nichts verloren gehen, und REWARD holt unmittelbar danach
 *     noch den ungeschmälerten Anspruch zurück.
 *  3. Erst danach sind die Richtungstasten DIESER Gruppe erreichbar
 *     (render(), Zweig 'level'); der erste Richtungsdruck ist der erste
 *     Versuch (onPress() → ladder.guess()). Die Chance auf Stufe 1 bleibt
 *     dadurch unverändert 1 zu (Zahl der Richtungstasten dieser Gruppe): beim
 *     Paar die Hälfte, beim Kreuz ein Viertel — reine Chance, ohne Können.
 *
 * DIE GETEILTE LEITER WURDE DAFÜR NICHT ANGEFASST. MultiRiskLadder trennt
 * offer(), start() und guess() seit jeher (dieselbe Bauform wie risk-ladder.js
 * am Fünf-Walzen-Gerät). Bisher rief onPress() start() und guess() im selben
 * synchronen Block; jetzt ruft onStart() nur start() und onPress() nur
 * guess(). In risk-ladder-multi.js ändert sich keine Zeile — der Baustein
 * gehört dem Site Package und wird auch von künftigen Geräten benutzt.
 *
 * EINMAL GESTARTET, BLEIBT DIE LEITER: ein Druck auf eine Richtungstaste einer
 * ANDEREN Gruppe ODER auf irgendeine der drei Starttasten ist während einer
 * laufenden Leiter WIRKUNGSLOS, kein Fehlgriff — bestraft würde sonst ein
 * Druck auf eine Taste, die gar nicht Teil der laufenden Leiter ist, eine
 * versteckte Regel, die niemand am Gerät ablesen kann.
 *
 *
 * NIE ZWEI TASTEN GLEICHZEITIG (WCAG 2.2 SC 2.3.1)
 * -----------------------------------------------------------------------
 * paintLit() schreibt in EINER Schleife über alle Tasten ALLER drei Gruppen,
 * mit einem Vergleich gegen genau einen Index. Es gibt keinen Weg, zwei davon
 * gleichzeitig auf .fr-btn--lit zu setzen. Die Tasten der beiden untätigen
 * Gruppen werden dabei mit gelöscht — sie sind während einer laufenden Leiter
 * ohnehin wirkungslos und dürfen dann auch nicht leuchten.
 *
 * Die drei Starttasten tragen NIE .fr-btn--lit — sie sind kein Lichtfeld einer
 * Leiter, sondern nur im Angebot .fr-btn--invite, und dort blinken sie
 * gemeinsam mit einer Periode von 1,2 s (machine.css, A-29).
 *
 *
 * DIE ANSAGE NENNT DEN AUSGANG, NICHT JEDE STUFE (CONCEPT.md C.14.12)
 * -----------------------------------------------------------------------
 * Eine Leiter über acht Treffer erzeugte sonst acht Ansagen in zwei Sekunden
 * — unbenutzbar. Angesagt wird deshalb genau zweimal je Runde: einmal, dass
 * ein Risikospiel möglich ist (openInvitation()), und einmal, wie es
 * ausgegangen ist (announceOutcome(), bei reason 'settled'). Nach einem
 * Fehlgriff wird ausdrücklich NICHTS Zusätzliches angesagt oder angezeigt —
 * insbesondere nicht, was ein Treffer gebracht hätte.
 *
 * Die Satzmuster stehen als data-Attribute am Live-Bereich (Machine/
 * Cabinet.html) und kommen aus locallang.xlf — in dieser Datei steht kein
 * deutscher Anzeigetext.
 *
 *
 * DIE RÖHRENGRUPPEN STUFE UND GEWINN: ZEITLICH GETEILTE EIGENTÜMERSCHAFT
 * -----------------------------------------------------------------------
 * Die Gruppe STUFE gehört ausschließlich dieser Datei. Die Gruppe GEWINN
 * gehört machine.js vom Rundenbeginn bis fr:result, danach — im Angebot und
 * in der Leiter — dieser Datei, und ab dem nächsten fr:round wieder
 * machine.js: zu jedem Zeitpunkt genau ein Eigentümer, nie zwei gleichzeitig.
 * Beide Dateien bauen dafür je eine EIGENE NixieCounter-Instanz auf derselben
 * Röhrengruppe; das ist zulässig, weil sie einander im Zugriff zeitlich nie
 * überschneiden.
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { drawIndex } from '@phomo17/fruit-risk/rng.js';
import { findNixieGroup } from '@phomo17/fruit-risk/nixie.js';
import { NixieCounter } from '@phomo17/fruit-risk/counter.js';
import { wirePressButton } from '@phomo17/fruit-risk/press.js';
import {
	MultiRiskLadder, ORDER_PER_LEVEL, ORDER_PER_PASS, NO_SIDE, PHASE_OFF,
} from '@phomo17/casino-startpage/risk-ladder-multi.js';
import { CURVE_FLAT, CURVE_STEEP } from '@phomo17/casino-startpage/risk-timing.js';

/**
 * Die drei Tastengruppen dieses Geräts (CONCEPT.md C.14.9).
 *
 * Die Seitenzahl steht NICHT als eigene Zahl da: sie ist die Länge von
 * buttons. Zwei Zahlen für dieselbe Sache liefen irgendwann auseinander.
 *
 * Die Reihenfolge der Tasten in buttons IST die Reihenfolge der Seitennummern,
 * die die geteilte Leiter kennt (0 … sides-1). Sie folgt der Aufzählung aus
 * C.14.9: links, rechts, oben, unten.
 *
 * start ist die STARTTASTE der Gruppe (unter ihrer Tastenzeile) und steht
 * bewusst NICHT in buttons: die Länge von buttons IST die Seitenzahl der
 * Leiter (sides). Eine Starttaste in dieser Liste machte aus einem Paar eine
 * Leiter mit drei Seiten und verschöbe die Chance auf Stufe 1.
 */
export const GROUPS = Object.freeze([
	Object.freeze({
		id: 'risk', factor: 2, curve: CURVE_FLAT, order: ORDER_PER_LEVEL, pause: false,
		start: 'risk-start',
		buttons: Object.freeze(['risk-left', 'risk-right']),
	}),
	Object.freeze({
		id: 'risk4', factor: 4, curve: CURVE_STEEP, order: ORDER_PER_LEVEL, pause: false,
		start: 'risk4-start',
		buttons: Object.freeze(['risk4-left', 'risk4-right']),
	}),
	Object.freeze({
		id: 'risk8', factor: 8, curve: CURVE_STEEP, order: ORDER_PER_PASS, pause: true,
		start: 'risk8-start',
		buttons: Object.freeze(['risk8-left', 'risk8-right', 'risk8-up', 'risk8-down']),
	}),
]);

/**
 * Die drei Risikospiele an einem Gehäuse.
 */
export class RiskPanel {
	/**
	 * @param {HTMLElement} root ein .fr-machine
	 * @param {import('./announce.js').LiveRegion} region der Bereich „risk"
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase F2 entspricht
	 */
	constructor(root, region) {
		const cabinet = root.querySelector('.fr-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .fr-cabinet im Automaten gefunden.');
		}
		this.root = root;
		this.cabinet = cabinet;
		this.region = region;

		/** Die drei Satzmuster dieses Bereichs, aus locallang.xlf über das Markup. */
		this.textOffer = region.data.frTextOffer ?? '';
		this.textWon = region.data.frTextWon ?? '';
		this.textLost = region.data.frTextLost ?? '';

		this.rewardButton = cabinet.querySelector('.fr-btn[data-fr-button="reward"]');

		const stufeGroup = findNixieGroup(cabinet, 'stufe');
		this.levelCounter = stufeGroup === null ? null : new NixieCounter(stufeGroup);
		const gewinnGroup = findNixieGroup(cabinet, 'gewinn');
		this.winCounter = gewinnGroup === null ? null : new NixieCounter(gewinnGroup);

		/** Alle acht Risiko-Tasten, flach nach ihrem Schlüssel — paintLit() braucht das. */
		this.buttons = {};
		for (const group of GROUPS) {
			for (const key of group.buttons) {
				this.buttons[key] = cabinet.querySelector(`.fr-btn[data-fr-button="${key}"]`);
			}
		}

		/**
		 * Die drei Starttasten, flach nach ihrem Schlüssel. Sie sind KEINE
		 * Seite einer Leiter (siehe GROUPS) und leuchten nie.
		 */
		this.startButtons = {};
		for (const group of GROUPS) {
			this.startButtons[group.start] = cabinet.querySelector(`.fr-btn[data-fr-button="${group.start}"]`);
		}

		/** Der Anspruch, solange noch KEINE Leiter gewählt ist. */
		this.claim = null;

		/** Die id der laufenden Leiter, oder null im Grundzustand und im reinen Angebot. */
		this.active = null;

		/** Eine MultiRiskLadder je Gruppe, in derselben Reihenfolge wie GROUPS. */
		this.ladders = GROUPS.map((group) => new MultiRiskLadder({
			sides: group.buttons.length,
			factor: group.factor,
			curve: group.curve,
			order: group.order,
			pause: group.pause,
			// Dieselbe kryptographische Quelle, aus der auch die Walzen gezogen
			// werden. Kein Math.random(), kein Rückfall.
			draw: (bound) => drawIndex(bound),
			paint: (view) => this.render(group, view),
			notify: (message) => this.report(group, message),
		}));

		/** Abmelde-Funktionen für alle über wirePressButton() verdrahteten Tasten. */
		this.disposers = [];
		for (const group of GROUPS) {
			const disposeStart = wirePressButton(this.startButtons[group.start], 'fr-btn--pressed',
				() => this.onStart(group));
			if (disposeStart !== null) {
				this.disposers.push(disposeStart);
			}
			group.buttons.forEach((key, index) => {
				const dispose = wirePressButton(this.buttons[key], 'fr-btn--pressed',
					() => this.onPress(group, index));
				if (dispose !== null) {
					this.disposers.push(dispose);
				}
			});
		}
		const disposeReward = wirePressButton(this.rewardButton, 'fr-btn--pressed',
			() => this.collectCurrent());
		if (disposeReward !== null) {
			this.disposers.push(disposeReward);
		}

		this.onOfferBound = (event) => this.onOffer(event);
		this.root.addEventListener('fr:offer', this.onOfferBound);

		// Für eine künftige Phase F5c (Auto-Modus): im Grundzustand wirkungslos.
		// reason 'auto' (Behebungslauf REVIEW-fruitrisk-f5.md [M4]): trifft
		// fr:riskcollect auf ein REINES Angebot (noch keine Leiter gewählt),
		// muss fr:offerend erkennbar bleiben, dass der Auto-Modus eingelöst
		// hat, nicht REWARD. Läuft bereits eine Leiter, bleibt es bei
		// collect()/reason "ladder-collect" — unabhängig davon, wer collect()
		// ausgelöst hat, siehe collectCurrent() unten.
		this.onRiskCollectBound = () => this.collectCurrent('auto');
		this.root.addEventListener('fr:riskcollect', this.onRiskCollectBound);

		// fr:round wird in der ERFASSUNGSPHASE AM DOKUMENT abgehört — siehe
		// Dateikopf. Das ist der EINZIGE Zuhörer dieses Automaten, der nicht am
		// Gehäuse selbst hängt.
		this.onRoundCaptureBound = (event) => this.onRoundCapture(event);
		this.root.ownerDocument.addEventListener('fr:round', this.onRoundCaptureBound, true);

		// Grundzustand herstellen: alle acht Tasten aria-disabled, unabhängig
		// davon, was das ausgelieferte HTML mitbringt. Seit dem Behebungslauf
		// 2026-09-05 (N-05) liefert Machine/Button.html hier bereits
		// aria-disabled="true" aus (Cabinet.html reicht disabled: 1 durch);
		// dieser Aufruf bleibt trotzdem defensiv unbedingt — dieser Automat
		// wartet nicht auf ein Angebot, das noch nicht da ist, unabhängig
		// davon, was ein künftiger Markup-Stand mitbringt. Dasselbe gilt für
		// die drei Starttasten.
		for (const group of GROUPS) {
			this.setGroupEnabled(group, false);
			this.setStartEnabled(group, false);
		}
		this.resetAttributes();
	}

	/**
	 * Löst ein Ereignis am Gehäuse aus. Gleiche Bauform wie Machine.emit()
	 * und Wallet.emit().
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
	 * Die Leiter, die zu einer Gruppe gehört.
	 *
	 * @param {object} group ein Eintrag aus GROUPS
	 * @returns {MultiRiskLadder}
	 */
	ladderOf(group) {
		return this.ladders[GROUPS.indexOf(group)];
	}

	/**
	 * Ein Gewinn liegt vor. Ab dieser Phase übernimmt IMMER diese Datei.
	 *
	 * Auch im Auto-Modus (künftige Phase F5c): dort wird der Anspruch nicht
	 * angeboten, sondern SOFORT gutgeschrieben (CONCEPT.md C.14.10: „der
	 * Gewinn wird sofort gutgeschrieben"). Ließe man ihn stattdessen bei
	 * wallet.js liegen, wanderte er erst mit dem nächsten START ins Guthaben —
	 * eine Sekunde später, und sichtbar falsch an den GUTHABEN-Röhren.
	 *
	 * @param {CustomEvent} event abbrechbares fr:offer
	 * @returns {void}
	 */
	onOffer(event) {
		const claim = event.detail?.claim;
		const amount = Number(claim?.amount);
		if (claim === undefined || claim === null
			|| typeof claim.collect !== 'function' || typeof claim.discard !== 'function'
			|| !Number.isFinite(amount) || amount <= 0) {
			return;                            // nicht übernehmen: wallet.js zahlt wie bisher
		}
		event.preventDefault();
		this.claim = claim;

		// Die eine Frage an einen künftigen Auto-Modus: darf überhaupt
		// angeboten werden? Antwortet niemand (heute: immer), geht das Gerät
		// ins Angebot.
		if (this.emit('fr:risk', { phase: 'offer', ladder: 'none', level: 0, win: amount }, true)
			.defaultPrevented) {
			this.settle('auto');
			return;
		}
		this.openInvitation(amount);
	}

	/**
	 * Eine RICHTUNGSTASTE wurde gedrückt: das ist ein Versuch — und nur das.
	 *
	 * Eine Leiter wird hier NICHT mehr gestartet (das tut onStart()). Ist
	 * gerade keine Leiter dieser Gruppe unterwegs, ist der Druck wirkungslos,
	 * kein Fehlgriff: er trifft eine Taste, die gar nicht Teil einer laufenden
	 * Leiter ist. Ein einziger Vergleich deckt drei Fälle ab — kein Angebot,
	 * ein Angebot ohne gestartete Leiter, und eine laufende Leiter einer
	 * anderen Gruppe.
	 *
	 * @param {object} group ein Eintrag aus GROUPS
	 * @param {number} side der Index der gedrückten Taste innerhalb der Gruppe
	 * @returns {void}
	 */
	onPress(group, side) {
		if (this.active !== group.id) {
			return;
		}
		this.ladderOf(group).guess(side);
	}

	/**
	 * Eine STARTTASTE wurde gedrückt: diese Leiter beginnt auf Stufe 1.
	 *
	 * DIESER DRUCK IST KEIN VERSUCH. Gerufen wird ausschließlich
	 * ladder.start(); guess() steht hier absichtlich nicht. Es kann dabei
	 * nichts verloren gehen — REWARD holt unmittelbar danach noch den
	 * ungeschmälerten Anspruch zurück.
	 *
	 * Läuft bereits eine Leiter, ist JEDE der drei Starttasten wirkungslos,
	 * auch die der laufenden Gruppe — aus demselben Grund wie bei den
	 * Richtungstasten einer fremden Gruppe.
	 *
	 * Die Reihenfolge der Zeilen ist dieselbe wie bisher im Start-Zweig von
	 * onPress(): ladder.offer() malt zuerst intern 'offer' (→ deactivate()),
	 * closeInvitation() nimmt das Einladungsblinken ab, und ladder.start()
	 * malt unmittelbar darauf 'level', das genau diese Gruppe wieder freigibt.
	 * Der Zwischenstand ist innerhalb desselben synchronen Blocks nie sichtbar.
	 *
	 * @param {object} group ein Eintrag aus GROUPS
	 * @returns {void}
	 */
	onStart(group) {
		if (this.active !== null || this.claim === null) {
			return;
		}
		const ladder = this.ladderOf(group);
		if (!ladder.offer(this.claim)) {
			return;                           // die Leiter hat nicht übernommen
		}
		this.claim = null;                    // ab jetzt hält sie die Leiter
		this.active = group.id;
		this.closeInvitation();
		// Der Einladungssatz nennt die drei Starttasten; die sind ab jetzt
		// wirkungslos. Ein Hilfsmittel, das den Bereich auf Anforderung erneut
		// vorliest, bekäme sonst eine Auskunft, die nicht mehr gilt.
		// GELEERT wird nur — angesagt wird NICHTS: es bleibt bei genau zwei
		// Ansagen je Runde (C.14.12), und ein leerer Bereich löst keine Ansage
		// aus (announce.js, clear() → say('', immediate)).
		this.region.clear();
		ladder.start();
	}

	/**
	 * REWARD gedrückt, oder fr:riskcollect empfangen (Auto-Modus, Phase F5c):
	 * jederzeit aussteigen und gutschreiben. Im Grundzustand wirkungslos.
	 *
	 * reason (Behebungslauf REVIEW-fruitrisk-f5.md [M4]): gilt nur für den
	 * REINEN-Angebot-Zweig unten (noch keine Leiter gewählt) — läuft schon
	 * eine Leiter, meldet ladder.collect() selbst IMMER "ladder-collect",
	 * unabhängig vom Auslöser (REWARD oder Auto-Modus); das war schon vor
	 * diesem Behebungslauf richtig und bleibt unverändert.
	 *
	 * @param {'reward'|'auto'} [reason] Standard "reward" (REWARD gedrückt)
	 * @returns {void}
	 */
	collectCurrent(reason = 'reward') {
		if (this.active !== null) {
			const group = GROUPS.find((candidate) => candidate.id === this.active);
			this.ladderOf(group)?.collect();
			return;
		}
		this.settle(reason);
	}

	/**
	 * fr:round in der Erfassungsphase am Dokument — siehe Dateikopf.
	 *
	 * @param {CustomEvent} event abbrechbares fr:round
	 * @returns {void}
	 */
	onRoundCapture(event) {
		if (event.target !== this.root) {
			return;                           // ein anderes Gehäuse auf derselben Seite
		}
		// Der Live-Bereich "risk" wird bei JEDEM Rundenbeginn geleert, BEVOR
		// entschieden wird, was als Nächstes angesagt wird. Ohne das bleibt
		// die Einladung ab der zweiten Runde stumm: da C.14.7 in jeder Runde
		// einen Gewinn garantiert, ist der Einladungssatz in jeder Runde
		// wörtlich gleich, und LiveRegion.say() vergleicht gegen den
		// AKTUELLEN Text des Bereichs (announce.js, "GRENZE, EHRLICH
		// BENANNT") — ein identischer Folgesatz gälte sonst als "keine
		// Änderung" und würde nie erneut vorgelesen (Behebungslauf
		// REVIEW-fruitrisk-f5.md [H2]).
		this.region.clear();
		if (this.active !== null) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (this.claim !== null) {
			this.settle('start');
		}
	}

	/**
	 * Löst einen im REINEN ANGEBOT liegenden Anspruch ein — noch bevor eine
	 * Leiter gewählt wurde. Für das Einlösen WÄHREND einer laufenden Leiter
	 * ist collectCurrent()/ladder.collect() zuständig, nicht diese Methode.
	 *
	 * @param {'reward'|'start'|'auto'} reason
	 * @returns {void}
	 */
	settle(reason) {
		const claim = this.claim;
		if (claim === null) {
			return;
		}
		this.claim = null;
		this.closeInvitation();
		const amount = claim.amount;
		void claim.collect();
		this.rewardButton?.classList.remove('fr-btn--lit');
		this.emit('fr:offerend', { reason, amount });
		this.resetAttributes();
		// Sonst behält der Live-Bereich "risk" die Einladung, obwohl kein
		// Angebot mehr besteht — eine falsche Auskunft für ein Hilfsmittel,
		// das den Bereich auf Anforderung erneut vorliest (Behebungslauf
		// REVIEW-fruitrisk-f5.md [H2]/[L7]).
		this.region.clear();
	}

	/**
	 * Öffnet das Angebot: NUR die drei Starttasten laden ein, REWARD leuchtet,
	 * der Live-Bereich sagt einmal an.
	 *
	 * Die acht Richtungstasten bleiben dunkel und aria-disabled="true": sie
	 * können vor dem Start einer Leiter nichts bewirken (onPress() prüft
	 * this.active), und eine einladende Taste ohne Wirkung wäre eine sichtbare
	 * Lüge. Sie werden erst frei, wenn render() den Zweig 'level' malt.
	 *
	 * @param {number} amount
	 * @returns {void}
	 */
	openInvitation(amount) {
		const data = this.root.dataset;
		data.frRiskPhase = 'offer';
		data.frRiskLadder = 'none';
		data.frRiskLevel = '0';
		data.frRiskWin = String(amount);
		data.frRiskSide = '0';
		data.frRiskOn = '0';
		data.frRiskPause = '0';
		data.frRiskCycle = '0';
		data.frRiskLit = 'none';
		this.rewardButton?.classList.add('fr-btn--lit');
		for (const group of GROUPS) {
			this.setGroupEnabled(group, false);
			this.setStartEnabled(group, true);
			this.startButtons[group.start]?.classList.add('fr-btn--invite');
		}
		this.region.say(this.textOffer);
	}

	/**
	 * Nimmt das Einladungsblinken und die Erreichbarkeit ALLER elf
	 * Risiko-Bedienteile zurück — der drei Starttasten und der acht
	 * Richtungstasten. Wird auch von render() aufgerufen (Gruppe für Gruppe),
	 * sobald eine Leiter endet; dort ist der zweite Aufruf für dieselbe Taste
	 * wirkungslos, aber harmlos.
	 *
	 * Die Richtungstasten tragen seit der Einführung der Starttasten gar kein
	 * .fr-btn--invite mehr; das Abräumen bleibt trotzdem stehen — es kostet
	 * nichts und schützt vor einer stehen gebliebenen Klasse aus einem
	 * künftigen Markup- oder Skriptstand.
	 *
	 * @returns {void}
	 */
	closeInvitation() {
		for (const group of GROUPS) {
			this.setGroupEnabled(group, false);
			this.setStartEnabled(group, false);
			this.startButtons[group.start]?.classList.remove('fr-btn--invite');
			for (const key of group.buttons) {
				this.buttons[key]?.classList.remove('fr-btn--invite');
			}
		}
	}

	/**
	 * @param {object} group ein Eintrag aus GROUPS
	 * @param {boolean} enabled
	 * @returns {void}
	 */
	setGroupEnabled(group, enabled) {
		for (const key of group.buttons) {
			this.buttons[key]?.setAttribute('aria-disabled', enabled ? 'false' : 'true');
		}
	}

	/**
	 * @param {object} group ein Eintrag aus GROUPS
	 * @param {boolean} enabled
	 * @returns {void}
	 */
	setStartEnabled(group, enabled) {
		this.startButtons[group.start]?.setAttribute('aria-disabled', enabled ? 'false' : 'true');
	}

	/**
	 * Nur die Lichter. Der häufigste Fall: mehrmals je Sekunde je Seite.
	 *
	 * HIER LIEGT DIE ZUSAGE „NIE ZWEI TASTEN GLEICHZEITIG": geschrieben wird
	 * in EINER Schleife über alle Tasten ALLER drei Gruppen, mit einem
	 * Vergleich gegen genau einen Index. Es gibt keinen Weg, zwei davon auf
	 * true zu setzen. Die Tasten der übrigen beiden Gruppen werden dabei mit
	 * gelöscht — sie sind in einer laufenden Leiter ohnehin wirkungslos und
	 * dürfen dann auch nicht leuchten.
	 *
	 * Die drei Starttasten stehen absichtlich NICHT in dieser Schleife: sie
	 * tragen nie .fr-btn--lit.
	 *
	 * @param {object} group die Gruppe, deren Momentaufnahme gerade gemalt wird
	 * @param {{lit: number}} view
	 * @returns {void}
	 */
	paintLit(group, view) {
		for (const other of GROUPS) {
			const active = other.id === group.id;
			other.buttons.forEach((key, index) => {
				this.buttons[key]?.classList.toggle('fr-btn--lit', active && view.lit === index);
			});
		}
		this.root.dataset.frRiskLit = view.lit === NO_SIDE ? 'none' : group.buttons[view.lit];
	}

	/**
	 * Schreibt die acht Messpunkte, die von der laufenden Leiter abhängen
	 * (data-fr-risk-lit wird von paintLit() geschrieben, nicht hier).
	 *
	 * @param {object} group
	 * @param {{level: number, win: number, sideMs: number, onMs: number,
	 *          pauseMs: number, cycleMs: number}} view
	 * @returns {void}
	 */
	syncAttributes(group, view) {
		const data = this.root.dataset;
		data.frRiskPhase = this.active === null ? 'off' : 'ladder';
		data.frRiskLadder = this.active ?? 'none';
		data.frRiskLevel = String(view.level ?? 0);
		data.frRiskWin = String(view.win ?? 0);
		data.frRiskSide = String(view.sideMs ?? 0);
		data.frRiskOn = String(view.onMs ?? 0);
		data.frRiskPause = String(view.pauseMs ?? 0);
		data.frRiskCycle = String(view.cycleMs ?? 0);
	}

	/**
	 * Setzt alle neun Messpunkte auf den Grundzustand zurück — beim Bau und
	 * jedes Mal, wenn ein reiner Anspruch (noch keine Leiter) eingelöst wird.
	 *
	 * @returns {void}
	 */
	resetAttributes() {
		const data = this.root.dataset;
		data.frRiskPhase = 'off';
		data.frRiskLadder = 'none';
		data.frRiskLevel = '0';
		data.frRiskWin = '0';
		data.frRiskSide = '0';
		data.frRiskOn = '0';
		data.frRiskPause = '0';
		data.frRiskCycle = '0';
		data.frRiskLit = 'none';
	}

	/**
	 * DIE LEITER SAGT IHREN AUSGANG AN, NICHT JEDE STUFE (CONCEPT.md C.14.12).
	 * Eine Leiter über acht Treffer erzeugte sonst acht Ansagen in zwei
	 * Sekunden — unbenutzbar. Angesagt wird deshalb genau zweimal je Runde:
	 * einmal, dass ein Risikospiel möglich ist (openInvitation()), und einmal,
	 * wie es ausgegangen ist. view.level trägt beim Ausgang noch die erreichte
	 * Stufe; die Leiter setzt erst danach zurück.
	 *
	 * Nach einem FEHLGRIFF wird ausdrücklich NICHTS Zusätzliches angesagt —
	 * insbesondere nicht, was ein Treffer gebracht hätte.
	 *
	 * @param {{level: number, win: number}} view
	 * @param {boolean} won
	 * @returns {void}
	 */
	announceOutcome(view, won) {
		const pattern = won ? this.textWon : this.textLost;
		this.region.say(won
			? pattern.replace('{0}', String(view.win)).replace('{1}', String(view.level))
			: pattern.replace('{0}', String(view.level)));
	}

	/**
	 * Eine Gruppe kehrt in den Grundzustand zurück: alles aus, `active`
	 * zurücksetzen (falls es noch diese Gruppe war), `aria-disabled` wieder
	 * auf „true", das Überlaufblinken der GEWINN-Gruppe abräumen.
	 *
	 * Wird auch beim internen `render('offer', …)` der eben gewählten Leiter
	 * aufgerufen (siehe render()) — dort unmittelbar gefolgt von
	 * closeInvitation() und dem ersten `render('level', …)`, das diese Gruppe
	 * augenblicklich wieder freigibt. Der Zwischenstand ist innerhalb
	 * desselben synchronen Blocks nie sichtbar.
	 *
	 * @param {object} group
	 * @returns {void}
	 */
	deactivate(group) {
		this.paintLit(group, { lit: NO_SIDE });
		this.setGroupEnabled(group, false);
		if (this.active === group.id) {
			this.active = null;
		}
		// STUFE gehört ausschließlich dieser Datei und startet dunkel (siehe
		// Machine/Cabinet.html). group.clear() setzt die Röhren zurück auf
		// --fr-digit -1; das interne value des Zählwerks wird eine Zeile
		// darunter mitgezogen, damit die nächste Leiter nicht scheinbar von
		// der zuletzt erreichten Stufe „herunterzählt".
		this.levelCounter?.group.clear();
		if (this.levelCounter !== null) {
			this.levelCounter.value = 0;
		}
		// GEWINN gehört ab jetzt wieder machine.js (zeitlich geteilte
		// Eigentümerschaft, siehe Dateikopf) — und ein Überlaufblinken aus
		// einer hoch geleiterten Stufe darf nicht stehen bleiben.
		this.winCounter?.snap(0);
		this.syncAttributes(group, { level: 0, win: 0, sideMs: 0, onMs: 0, pauseMs: 0, cycleMs: 0 });
	}

	/**
	 * Lässt eine Gruppe malen. Verzweigt über view.reason, wie bei den beiden
	 * geteilten Leitern:
	 *
	 *   'level'            Stufe, Gewinn, Licht, Messpunkte
	 *   'lit'              nur das Licht (paintLit schreibt auch
	 *                      data-fr-risk-lit selbst)
	 *   'settled'          nur der Betrag und die eine Ansage des Ausgangs
	 *   'sync'             eine Serverbuchung wurde bestätigt oder
	 *                      korrigiert — nur der Gewinnbetrag (siehe render(),
	 *                      Zweig 'sync', Behebungslauf 2026-09-11)
	 *   'offer'/'init'/'end'  alles aus (deactivate())
	 *
	 * @param {object} group
	 * @param {object} view die Momentaufnahme einer MultiRiskLadder
	 * @returns {void}
	 */
	render(group, view) {
		switch (view.reason) {
			case 'level':
				// closeInvitation() hat kurz zuvor ALLE acht Tasten wieder auf
				// aria-disabled="true" gesetzt (siehe onPress()) — genau DIESE
				// Gruppe ist ab jetzt aber wieder erreichbar, solange die
				// Leiter läuft.
				this.setGroupEnabled(group, true);
				this.levelCounter?.ramp(view.level);
				this.winCounter?.ramp(view.win);
				this.paintLit(group, view);
				this.syncAttributes(group, view);
				break;
			case 'lit':
				this.paintLit(group, view);
				break;
			case 'settled':
				this.winCounter?.ramp(view.win);
				this.announceOutcome(view, view.win > 0);
				break;
			case 'sync':
				// Die Serverbuchung aus hit() ist eingetroffen (der optimistische
				// Wert galt bis dahin, siehe risk-ladder-multi.js hit()) — oder,
				// seltener, die aus offer(); die läuft bei dieser Leiter aber
				// praktisch immer schon vor dem nächsten synchronen Zeilenblock
				// durch (onStart() ruft ladder.start() unmittelbar nach
				// ladder.offer()), sodass phase hier so gut wie nie noch
				// 'offer' ist. NUR der Gewinnbetrag wird nachgezogen — kein
				// Licht, keine Tastenfreigabe, keine Ansage, keine
				// Stufenänderung (Behebungslauf 2026-09-11). Trifft ein sync
				// ein, nachdem diese Gruppe längst zurückgesetzt ist (phase
				// 'off' — der Anspruch ist dann schon weg), wird nichts mehr
				// angefasst: GEWINN gehört dann längst wieder machine.js.
				if (view.phase === PHASE_OFF) {
					break;
				}
				this.winCounter?.ramp(view.win);
				this.root.dataset.frRiskWin = String(view.win);
				break;
			case 'offer':
			case 'init':
			case 'end':
				this.deactivate(group);
				break;
			default:
				break;
		}
	}

	/**
	 * Nimmt eine fachliche Meldung einer Leiter entgegen und macht daraus die
	 * Ereignisse dieses Geräts.
	 *
	 * @param {object} group
	 * @param {{type: string, level: number, win: number, lit?: number,
	 *          on?: boolean, lost?: number}} message
	 * @returns {void}
	 */
	report(group, message) {
		switch (message.type) {
			case 'start':
				this.emit('fr:risk', { phase: 'start', ladder: group.id, level: message.level, win: message.win });
				break;
			case 'hit':
				this.emit('fr:risk', { phase: 'hit', ladder: group.id, level: message.level, win: message.win });
				break;
			case 'miss':
				this.emit('fr:risk', {
					phase: 'miss', ladder: group.id, level: message.level, win: 0, lost: message.lost,
				});
				this.rewardButton?.classList.remove('fr-btn--lit');
				this.emit('fr:offerend', { reason: 'ladder-lost', amount: 0 });
				break;
			case 'collect':
				this.emit('fr:risk', { phase: 'collect', ladder: group.id, level: message.level, win: message.win });
				this.rewardButton?.classList.remove('fr-btn--lit');
				this.emit('fr:offerend', { reason: 'ladder-collect', amount: message.win });
				break;
			case 'end':
				this.emit('fr:risk', { phase: 'end', ladder: group.id, level: 0, win: 0 });
				break;
			case 'tick':
				this.emit('fr:risktick', { ladder: group.id, level: message.level, lit: message.lit, on: message.on });
				break;
			default:
				break;
		}
	}

	/**
	 * Beim Verlassen der Seite.
	 *
	 * Reicht an alle drei Leitern weiter — eine laufende schreibt ihren
	 * offenen Gewinn GUT, sie verfällt nicht — und schreibt zusätzlich einen
	 * Anspruch gut, den diese Datei im ANGEBOT noch selbst hält (noch keine
	 * Leiter gewählt). Gemeldet wird dabei NICHTS: eine Meldung in eine
	 * sterbende Seite ist Lärm.
	 *
	 * Diese Reihenfolge ist zwingend: sie läuft VOR wallet.destroy(), das den
	 * Gerätekredit schließt (fruit-risk.js, teardown()).
	 *
	 * @returns {void}
	 */
	destroy() {
		this.root.ownerDocument.removeEventListener('fr:round', this.onRoundCaptureBound, true);
		this.root.removeEventListener('fr:offer', this.onOfferBound);
		this.root.removeEventListener('fr:riskcollect', this.onRiskCollectBound);
		for (const dispose of this.disposers) {
			dispose();
		}
		this.disposers = [];

		for (const ladder of this.ladders) {
			ladder.destroy();
		}
		if (this.claim !== null) {
			const claim = this.claim;
			this.claim = null;
			void claim.collect();
		}

		this.rewardButton?.classList.remove('fr-btn--lit');
		for (const group of GROUPS) {
			this.startButtons[group.start]?.classList.remove('fr-btn--invite', 'fr-btn--lit');
			this.startButtons[group.start]?.setAttribute('aria-disabled', 'true');
			for (const key of group.buttons) {
				this.buttons[key]?.classList.remove('fr-btn--invite', 'fr-btn--lit');
				this.buttons[key]?.setAttribute('aria-disabled', 'true');
			}
		}
		this.levelCounter?.destroy();
		this.winCounter?.destroy();

		delete this.root.dataset.frRiskPhase;
		delete this.root.dataset.frRiskLadder;
		delete this.root.dataset.frRiskLevel;
		delete this.root.dataset.frRiskWin;
		delete this.root.dataset.frRiskSide;
		delete this.root.dataset.frRiskOn;
		delete this.root.dataset.frRiskPause;
		delete this.root.dataset.frRiskCycle;
		delete this.root.dataset.frRiskLit;
	}
}

export default RiskPanel;
