/**
 * Video Slot – die Verrechnung am Gerät
 * ====================================
 *
 * Die eine Stelle, an der Spielablauf und Geld aufeinandertreffen. Sie
 * verrechnet den Einsatz, schreibt den Gewinn gut, führt die Einsatzwahl samt
 * Sperre und speist die beiden Nixie-Anzeigen GUTHABEN und EINSATZ.
 *
 *
 * SEIT AUSBAUSTUFE 2, PHASE 3 IST „GUTHABEN" DER GERÄTEKREDIT
 * -----------------------------------------------------------
 * CONCEPT.md B.5 teilt das Geld in zwei Töpfe:
 *
 *   die KASSE          der Gesamtbestand, allen Geräten gemeinsam. Sie liegt
 *                      in credit.js und wird an diesem Gehäuse im
 *                      Kassenfenster im Sockel angezeigt (bank.js).
 *   der GERÄTEKREDIT   was der Spieler bewusst in DIESES Gerät geworfen hat.
 *                      Beim Betreten der Seite immer 0. Er liegt in
 *                      machine-credit.js und steht in den GUTHABEN-Röhren.
 *
 * Gespielt wird AUSSCHLIESSLICH vom Gerätekredit (B.5.2). Diese Datei fasst
 * die Kasse deshalb nicht mehr an: sie prüft, bucht ab und schreibt gut
 * ausschließlich über machineCredit. Der Weg von der Kasse ins Gerät ist der
 * Münzschlitz (coinslot.js), der Weg zurück die Taste CASH OUT (bank.js) und
 * das Verlassen der Seite.
 *
 *
 * SIE LEGT DEN GERÄTEKREDIT AN UND SCHLIESST IHN — ALS EINZIGE
 * ------------------------------------------------------------
 * openMachineCredit(MACHINE_KEY) steht in dieser Datei genau einmal, im
 * Konstruktor. machineCredit.close() steht genau einmal, als erste Zeile von
 * destroy(). Nirgends sonst im ganzen Automaten.
 *
 * Der Grund: hier wird damit gespielt. bank.js und coinslot.js bekommen das
 * Objekt gereicht und lesen oder verschieben, legen es aber nicht an. Der
 * geteilte Baustein lässt je Schlüssel und Seite ohnehin nur einen zu und
 * wirft beim zweiten Versuch — die Zusage hängt also nicht an Disziplin.
 *
 * destroy() hängt am pagehide-Weg: video-slot.js meldet teardown() für pagehide
 * an, teardown() ruft wallet.destroy(). Damit erfüllt sich B.5.2 („Verlässt
 * der Spieler die Seite, wandert der Gerätekredit von selbst zurück in die
 * Kasse. Neuladen zählt als Verlassen."), ohne dass der geteilte Baustein sich
 * selbst für pagehide anmelden müsste — was er ausdrücklich nicht tut, damit
 * er dem Münzschieber aus B.5.4 keine falsche Regel aufzwingt.
 *
 *
 * WELCHE data-ATTRIBUTE DIESE DATEI SCHREIBT
 * ------------------------------------------
 *   data-vs-machine-credit   der Gerätekredit
 *   data-vs-mirror           der rohe Spiegelwert aus dem Browserspeicher
 *
 * Und KEINE anderen. data-vs-bank, data-vs-total und data-vs-cashout gehören
 * bank.js. Je Attribut genau ein Schreiber — dieselbe Regel wie bei den
 * Anzeigen, nur eine Ebene tiefer.
 *
 *
 * SIE FASST machine.js NICHT AN
 * -----------------------------
 * Verbunden wird ausschließlich über die vier DOM-Ereignisse, die Phase 6
 * dafür gebaut hat (DECISIONS.md, Phase 6: „Die Phasen 7 bis 10 docken über
 * DOM-Ereignisse an"):
 *
 *   vs:round   abbrechbar, vor dem Anlaufen → hier wird geprüft und abgebucht
 *   vs:result  nach der Auswertung          → hier wird gutgeschrieben
 *   vs:state   jeder Zustandswechsel        → hier wird die Einsatzwahl gesperrt
 *   vs:collect eigenes Ereignis aus payout.js → Kappung melden
 *
 * Ein Import von Machine würde diese Zusage wertlos machen: die Verrechnung
 * hinge dann an der Klasse statt am Vertrag.
 *
 *
 * GEWINN GEHÖRT IHR NICHT
 * -----------------------
 * Die GEWINN-Röhren setzt Phase 6 in machine.js (winDisplay.show(win)). Diese
 * Datei fasst sie NICHT an — sonst schrieben zwei Stellen in dieselbe Anzeige,
 * und CONCEPT.md Abschnitt 5, Grundsatz 8 verbietet genau das („nie parallel
 * gepflegt"). Sie bringt GUTHABEN und EINSATZ, mehr nicht. Das Kassenfenster
 * und die Taste CASH OUT gehören bank.js.
 *
 *
 * ====================================================================
 * DIE ABBUCHUNG — WARUM SO UND NICHT ANDERS
 * ====================================================================
 *
 * Das Problem in einem Satz: vs:round ist abbrechbar und muss deshalb SOFORT
 * entscheiden, aber jede Änderung am Geld ist laut Vertrag ASYNCHRON, und ein
 * Ereigniszuhörer kann nicht warten. Ein Zuhörer, der ein Versprechen
 * zurückgibt, wird vom Browser nicht abgewartet; preventDefault() käme zu spät,
 * die Walzen liefen längst.
 *
 * Die Lösung besteht aus zwei Schritten IM SELBEN SYNCHRONEN BLOCK:
 *
 *   1. machineCredit.canAfford(bet)  — synchron, entscheidet über das Veto
 *   2. machineCredit.stake(bet)      — angestoßen, nicht abgewartet; das
 *                                      Versprechen wird in this.pendingDebit
 *                                      aufbewahrt
 *
 * WARUM DAZWISCHEN NICHTS PASSIEREN KANN
 * --------------------------------------
 * JavaScript läuft einfädig. Zwischen zwei Anweisungen desselben synchronen
 * Blocks kann nichts anderes laufen — kein storage-Ereignis einer zweiten
 * Registerkarte, kein Zeitgeber, kein anderer Zuhörer. Solche Ereignisse sind
 * AUFGABEN und werden frühestens ausgeführt, wenn der laufende Block fertig
 * ist. stake() ist zwar als async deklariert, enthält aber selbst kein
 * einziges await: sein ganzer Rumpf — die Prüfung, das Schreiben des Spiegels,
 * die Benachrichtigung der Zuhörer — läuft synchron ab, nur der Rückgabewert
 * kommt als bereits erfülltes Versprechen. Ein Wettlauf zwischen Prüfung und
 * Abbuchung ist deshalb nicht unwahrscheinlich, sondern UNERREICHBAR.
 *
 * Seit Phase 3 kommt ein zweiter Grund hinzu: der Gerätekredit gehört dieser
 * Seite allein. Eine zweite Registerkarte kann ihn nur ÜBERNEHMEN, und dann
 * steht er hier auf 0 — sie kann ihn nicht heimlich verkleinern, während eine
 * Runde läuft.
 *
 * WAS PASSIERT, WENN ES SPÄTER DOCH SCHIEFGEHT
 * --------------------------------------------
 * Erreichbar wird der Fall mit dem serverseitigen Konto (CONCEPT.md
 * Abschnitt 8): dann macht stake() eine Netzanfrage, in deren Laufzeit eine
 * andere Registerkarte das Konto leeren kann, und die Antwort lautet
 * { ok: false } — während die Walzen schon laufen. Für diesen Tag ist gebaut:
 *
 *   Der laufende Zug        läuft normal zu Ende. Die Walzen halten wie immer,
 *                           das Ergebnis wird angezeigt.
 *   Der Gewinn              wird NICHT ausgezahlt. vs:payout wird gar nicht
 *                           erst gesendet, es entsteht kein Anspruch.
 *   Der Spieler sieht       das Meldungsschild „RUNDE UNGÜLTIG". Die
 *                           GEWINN-Röhren zeigen weiter den erspielten Betrag,
 *                           denn Phase 6 hat sie gesetzt: „das wäre ein Gewinn
 *                           gewesen, gezählt hat er nicht."
 *   Der Gerätekredit        bleibt unangetastet. machine-credit.js sagt zu:
 *                           bei { ok: false } wird NICHTS abgebucht. Kein
 *                           Minusstand, keine doppelte Buchung.
 *   Danach                  ist nichts gesperrt. Der Automat steht in RESULT,
 *                           der nächste Tastendruck läuft durch das normale Veto.
 *   Protokoll               einmal console.error mit dem Rückgabewert.
 *
 * WARUM DAS DIE RICHTIGE AUFLÖSUNG IST
 * ------------------------------------
 *  · Trotzdem auszahlen? Dann erzeugte der Automat unter einem Wettlauf
 *    Kredite aus dem Nichts: Einsatz nicht bezahlt, Gewinn kassiert. Zwei
 *    Registerkarten wären eine Gelddruckmaschine.
 *  · Die Walzen abbrechen? Bräuchte einen Eingriff in machine.js, sähe wie ein
 *    Defekt aus — und brächte nichts: das Ergebnis stand laut CONCEPT.md
 *    Abschnitt 3.3 schon beim Tastendruck fest.
 *  · Vor dem Anlaufen auf die Bestätigung warten? Das ist die saubere Lösung
 *    für ein echtes Konto, kostet aber eine Wartezeit zwischen Tastendruck und
 *    Walzenlauf, die es an einem mechanischen Automaten nicht gibt. Sie gehört
 *    in die Phase, die das Konto einführt — und ist dort der vorgesehene
 *    Nachfolger dieser Stelle.
 *
 * Die gewählte Lösung ist die einzige, die heute nachweislich unerreichbar ist,
 * morgen keinen Kredit erfindet und dabei nichts Sichtbares kaputtmacht.
 * ====================================================================
 *
 *
 * DIE NAHT ZU DER RISIKO-LEITER
 * -----------------------------
 * Nach einem Gewinn wird nicht sofort gebucht, sondern gefragt: ein
 * ABBRECHBARES vs:payout mit einem WinClaim im detail. Sagt niemand etwas,
 * löst diese Datei den Anspruch selbst ein. risk.js ruft preventDefault(),
 * behält den Anspruch und entscheidet über die Leiter. An dieser Datei ändert
 * sich dafür keine Zeile. Einzelheiten im Kopf von payout.js.
 *
 *
 * KASSE UND GERÄT — WARUM DAFÜR KEIN CODE NÖTIG IST
 * -------------------------------------------------
 * Der Kassenstand ist auf Leuchtschild und Gehäuse derselbe, ohne dass hier
 * etwas abgleicht: credit.js schreibt in EINEN gemeinsamen Speicherschlüssel
 * und führt andere Registerkarten über das storage-Ereignis mit. Ein
 * Seitenwechsel liest den Speicher neu, eine zweite Registerkarte bekommt
 * reason: 'remote'. Beides landet über die Anmeldung in bank.js im
 * Kassenfenster. Wer hier eigenen Abgleich-Code schriebe, baute eine zweite
 * Wahrheit neben die erste.
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über das Meldungsschild (message.js).
 */

import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';
import { findNixieGroup } from '@phomo17/video-slot/nixie.js';
import { NixieCounter } from '@phomo17/video-slot/counter.js';
import { MessageBoard } from '@phomo17/video-slot/message.js';
import { WinClaim } from '@phomo17/video-slot/payout.js';
import { CoinSlot } from '@phomo17/video-slot/coinslot.js';

/**
 * Der Schlüssel, unter dem der Gerätekredit dieses Automaten geführt wird.
 *
 * Wortgleich zu VideoSlot::IDENTIFIER in Classes/VideoSlot.php. Er kommt vom
 * GERÄT und steht bewusst nicht in casino_startpage: das Site Package führt
 * keine Liste der Automaten (CONCEPT.md Abschnitt 5, Grundsatz 2). Der
 * vollständige Speicherschlüssel lautet damit
 * casinoKunterbunt.machine.video_slot (B.5.3).
 */
const MACHINE_KEY = 'video_slot';

/** Voreingestellter Einsatz. Muss zu DEFAULT_BET in machine.js passen. */
const DEFAULT_BET = 1;

/**
 * Zustände, in denen die Einsatzwahl offen ist.
 *
 * CONCEPT.md Abschnitt 3.3: „die Einsatzwahl ist bis zum Ende des Zuges
 * gesperrt". Offen ist sie also nur im Leerlauf und nach der Auswertung.
 *
 * Absichtlich als Zeichenketten und nicht über einen Import von STATE aus
 * machine.js: die Zustandsnamen stehen im detail eines DOM-Ereignisses und sind
 * damit Teil des Vertrags zwischen den Phasen, nicht Teil einer Klasse. Der
 * angenehme Nebeneffekt: jeder Zustand, den eine spätere Phase hinzufügt,
 * sperrt die Einsatzwahl von allein, weil er hier nicht aufgeführt ist. Das ist
 * die sichere Richtung.
 *
 * Phase 7 hat entgegen der früheren Vermutung KEINEN Zustand „risk"
 * hinzugefügt: die Risiko-Leiter läuft, während der Automat in „result" steht.
 * Die Einsatzwahl bleibt dabei absichtlich offen — CONCEPT.md Abschnitt 3.3
 * sperrt sie „bis zum Ende des Zuges", und der Zug ist zu diesem Zeitpunkt
 * vorbei. Für den Auto-Modus gilt die Aussage oben unverändert weiter.
 */
const OPEN_STATES = Object.freeze(['idle', 'result']);

/**
 * Die Gründe einer Gerätekredit-Änderung, die als Bedienhandlung gelten.
 *
 * NICHT dabei: 'subscribe' (der Anfangsstand beim Seitenaufbau), 'claimed'
 * (ein Absturzrest aus einer früheren Sitzung wird übernommen), 'surrendered'
 * (eine andere Registerkarte hat den Platz übernommen) und 'closed' (das
 * Aufräumen beim Verlassen). Keiner dieser vier ist etwas, das der Besucher
 * auf DIESER Seite getan hat.
 */
const ENGAGING_REASONS = Object.freeze(['insert', 'stake', 'award', 'cashout']);

/**
 * Die Kasse eines Gehäuses.
 */
export class Wallet {
	/**
	 * @param {HTMLElement} root ein .vs-machine
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase 5 entspricht
	 */
	constructor(root) {
		const cabinet = root.querySelector('.vs-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .vs-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;

		// Die beiden Anzeigen, die Phase 7 übernimmt. GEWINN bleibt bei Phase 6.
		const creditGroup = findNixieGroup(cabinet, 'guthaben');
		const betGroup = findNixieGroup(cabinet, 'einsatz');
		this.creditCounter = creditGroup === null ? null : new NixieCounter(creditGroup);
		this.betCounter = betGroup === null ? null : new NixieCounter(betGroup);

		this.board = new MessageBoard(cabinet.querySelector('.vs-message'));

		// DIE EINE STELLE, an der der Gerätekredit dieses Automaten angelegt
		// wird. Beim Anlegen räumt der geteilte Baustein einen vorgefundenen
		// Restbetrag aus einem Absturz sofort in die Kasse zurück und löscht
		// den Spiegel (B.5.2) — der Automat beginnt danach in jedem Fall bei 0.
		//
		// Geschlossen wird er ebenso an genau einer Stelle: in destroy().
		// bank.js und coinslot.js bekommen das Objekt gereicht und legen
		// keines an; ein zweites openMachineCredit() mit demselben Schlüssel
		// würde ohnehin werfen.
		this.machineCredit = openMachineCredit(MACHINE_KEY);

		// Genau ein Meldungsschild je Gehäuse, also wird es weitergereicht statt
		// dort ein zweites zu bauen — zwei Schilder hätten zwei Zeitgeber und
		// nähmen sich gegenseitig die Anzeige weg. Der Gerätekredit wandert aus
		// demselben Grund mit: der Einwurf nimmt das Geld aus der Kasse und
		// legt es dort hinein.
		this.coinSlot = new CoinSlot(root, this.board, this.machineCredit);

		this.betsGroup = cabinet.querySelector('.vs-bets');
		/** @type {HTMLElement[]} */
		this.betButtons = [...cabinet.querySelectorAll('.vs-bet[data-vs-bet]')];

		// Nur gelesen und mit einer Klasse versehen, nicht angefasst: START
		// selbst gehört machine.js. .vs-start--lit ist in machine.css gezeichnet
		// (P6), wurde aber von niemandem gesetzt — hier bekommt sie ihren
		// einzigen Schreiber: sie leuchtet GENAU dann, wenn ein Zug gerade
		// möglich ist. Siehe reviewAffordability() und setLocked().
		this.startButton = cabinet.querySelector('.vs-start[data-vs-button="start"]');

		/** Ist die Einsatzwahl gerade gesperrt? */
		this.locked = false;

		/**
		 * Hat der Besucher das Gerät schon angefasst?
		 *
		 * Audit L-01: Der Gerätekredit startet seit Phase 3 bei 0 und der
		 * Einsatz bei 1 — beim Betreten der Seite ist also nichts bezahlbar,
		 * und das Meldungsschild sagte das, bevor irgendjemand irgendetwas
		 * getan hatte. Ein Erstbesucher wurde mit einer Fehlermeldung
		 * begrüßt. Bis zur ersten Bedienhandlung schweigt das Schild deshalb;
		 * danach meldet es unverändert wie bisher.
		 */
		this.engaged = false;

		/** Der Einsatz der laufenden Runde. Nur zur Auskunft. */
		this.stake = 0;

		/**
		 * Das Versprechen der laufenden Abbuchung. Wird in vs:result abgewartet,
		 * bevor irgendetwas gutgeschrieben wird. Siehe Dateikopf.
		 *
		 * @type {Promise<boolean>}
		 */
		this.pendingDebit = Promise.resolve(false);

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		this.listen(root, 'vs:round', (event) => this.onRound(event));
		this.listen(root, 'vs:result', (event) => { void this.onResult(event); });
		this.listen(root, 'vs:state', (event) => this.onState(event));
		this.listen(root, 'vs:collect', (event) => this.onCollect(event));

		for (const button of this.betButtons) {
			this.listen(button, 'click', () => this.selectBet(button));
		}

		// Die eine Anmeldung beim Gerätekredit. subscribe() ruft SOFORT einmal
		// auf (reason: 'subscribe') und holt damit die sechs Röhren aus dem
		// Dunkeln, in dem Phase 5 sie absichtlich stehen ließ (DECISIONS.md,
		// Phase 5: „GUTHABEN startet dunkel"). Der erste Wert ist seit B.5.2
		// immer 0 — der Automat ist beim Betreten der Seite leer, und das
		// Meldungsschild sagt das im selben Augenblick.
		this.unsubscribe = this.machineCredit.subscribe((detail) => this.onMachineCreditChange(detail));

		// EINSATZ zeigt im Markup 01 und der Einsatz 1 ist vorgewählt; der
		// Gleichstand wird trotzdem einmal hergestellt, damit die Anzeige auch
		// dann stimmt, wenn das Markup je geändert wird. announce: false
		// (Audit N-04, 2026-09-05/06): das ist der Anfangsstand beim
		// Seitenaufbau, keine Bedienhandlung — ein Hilfsmittel las beim
		// bloßen Laden sonst sofort „Einsatz: 1" vor.
		this.betCounter?.snap(this.readBet(), false);

		// Die beiden data-Attribute dieser Datei einmal setzen, damit sie ab
		// dem ersten Augenblick ablesbar sind und nicht erst nach der ersten
		// Buchung erscheinen.
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
	 * Liest den gewählten Einsatz aus dem Gehäuse.
	 *
	 * Diese vier Zeilen stehen bewusst ein zweites Mal hier, wortgleich zu
	 * Machine.readBet() in machine.js. Der Grund: beide müssen zwingend
	 * dasselbe lesen — die Kasse prüft und bucht ab, die Maschine rechnet den
	 * Gewinn damit aus. Läsen sie verschieden, entstünde genau der Fehler, den
	 * niemand bemerkt. Ein Import von Machine wäre die Alternative, würde aber
	 * die Zusage aus dem Dateikopf brechen (kein Import des Spielkerns). Von
	 * zwei Übeln ist die geteilte Leseregel das kleinere, weil sie
	 * offensichtlich ist und in beiden Dateien kommentiert steht.
	 *
	 * @returns {number}
	 */
	readBet() {
		const chosen = this.cabinet.querySelector('.vs-bet--selected[data-vs-bet]');
		const value = Number.parseInt(chosen?.getAttribute('data-vs-bet') ?? '', 10);
		return Number.isInteger(value) && value > 0 ? value : DEFAULT_BET;
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
	 * Wählt einen Einsatz.
	 *
	 * @param {HTMLElement} button
	 * @returns {void}
	 */
	selectBet(button) {
		if (this.locked) {
			// Während eines Zuges tut die Taste nichts. Die Sperre ist zusätzlich
			// sichtbar (.vs-bets--locked), aber verlassen wird sich auf sie
			// nicht: eine Sperre, die nur aus CSS besteht, ist keine.
			return;
		}

		const value = Number.parseInt(button.getAttribute('data-vs-bet') ?? '', 10);
		if (!Number.isInteger(value) || value < 1) {
			console.error('[video-slot] Einsatztaste ohne gültiges data-vs-bet.', button);
			return;
		}

		for (const candidate of this.betButtons) {
			const chosen = candidate === button;
			candidate.classList.toggle('vs-bet--selected', chosen);
			// Das Markup dieses Geräts drückt die Wahl über aria-pressed aus
			// (Phase 5). Eine Klasse allein sähe ein Hilfsmittel nicht.
			candidate.setAttribute('aria-pressed', chosen ? 'true' : 'false');
		}

		// Springen, nicht hochzählen: der Einsatz ist eine Schalterstellung, kein
		// Zählerstand. Eine Fahrt von 1 auf 10 zeigte unterwegs 3, 4, 6, 7 – also
		// Einsätze, die es nicht gibt. Siehe counter.js, snap().
		this.betCounter?.snap(value);

		// Eine Einsatzwahl ist eine Bedienhandlung: ab jetzt darf das Schild
		// auch von sich aus melden (Audit L-01).
		this.engaged = true;

		// Sofortige Auskunft statt einer Überraschung bei START: wer 10 wählt und
		// nur 5 hat, erfährt es jetzt und nicht erst nach dem Ziehen.
		this.reviewAffordability(value);
	}

	/**
	 * Zeigt oder verbirgt „GUTHABEN ZU GERING", je nachdem, ob der Einsatz
	 * gedeckt ist. Nur außerhalb eines laufenden Zuges.
	 *
	 * @param {number} [bet]
	 * @returns {void}
	 */
	reviewAffordability(bet = this.readBet()) {
		if (this.locked) {
			return;
		}
		const affordable = this.machineCredit.canAfford(bet);
		if (affordable) {
			this.board.hide();
		} else if (this.engaged) {
			this.board.show('insufficient');
		}

		// .vs-start--lit: START leuchtet GENAU dann, wenn ein Zug gerade
		// möglich ist. Gerufen wird diese Methode ausschließlich außerhalb
		// eines Zuges (siehe die Sperre oben und setLocked()), die zweite
		// Bedingung — Ruhezustand — ist also hier immer erfüllt; übrig
		// bleibt die Deckungsprüfung.
		this.startButton?.classList.toggle('vs-start--lit', affordable);
	}

	/**
	 * Sperrt oder öffnet die Einsatzwahl.
	 *
	 * @param {boolean} flag
	 * @returns {void}
	 */
	setLocked(flag) {
		this.locked = flag;
		this.betsGroup?.classList.toggle('vs-bets--locked', flag);
		for (const button of this.betButtons) {
			// aria-disabled und NICHT disabled: liegt der Tastfokus gerade auf
			// einer Einsatztaste, nähme disabled ihn mitten im Zug weg und der
			// Fokus fiele auf das Dokument zurück. Die wirksame Sperre ist die
			// Prüfung in selectBet(); dies hier ist die Ansage dazu.
			button.setAttribute('aria-disabled', flag ? 'true' : 'false');
		}
		if (flag) {
			// Während eines Zuges ist kein weiterer Zug möglich — START darf
			// dann nicht leuchten, unabhängig vom Guthaben.
			this.startButton?.classList.remove('vs-start--lit');
		}
	}

	/**
	 * Jede Änderung des Gerätekredits – gleich woher.
	 *
	 * reason ist 'subscribe' beim ersten Aufruf, danach 'insert' (Einwurf),
	 * 'stake' (Einsatz), 'award' (Gewinn), 'cashout' (Auszahlung), 'claimed'
	 * (ein Absturzrest wurde übernommen), 'surrendered' (eine andere
	 * Registerkarte hat den Platz übernommen) oder 'closed'. Alle Fälle laufen
	 * hier zusammen, deshalb braucht keiner von ihnen eigenen Code.
	 *
	 * @param {{amount: number, previous: number, reason: string}} detail
	 * @returns {void}
	 */
	onMachineCreditChange(detail) {
		if (detail.reason === 'subscribe') {
			// Der allererste Aufruf: die Röhren sind dunkel. Eine Fahrt aus dem
			// Dunkeln heraus hätte keinen Startwert – also setzen, nicht fahren.
			// announce: false (Audit N-04, 2026-09-05/06): der Anfangsstand
			// beim Seitenaufbau ist keine Änderungsmeldung — ein Hilfsmittel
			// las beim bloßen Laden sonst sofort „Guthaben: 0" vor.
			this.creditCounter?.snap(detail.amount, false);
		} else {
			this.creditCounter?.ramp(detail.amount);
		}

		// Einwurf, Einsatz, Gewinn, Auszahlung: alles Bedienhandlungen. Der
		// Anfangsstand ('subscribe') und die drei Verwaltungsgründe sind
		// keine — siehe ENGAGING_REASONS (Audit L-01).
		if (ENGAGING_REASONS.includes(detail.reason)) {
			this.engaged = true;
		}

		// Wer nachwirft, soll das Schild sofort verschwinden sehen – nicht erst,
		// wenn die 2,6 Sekunden abgelaufen sind.
		this.reviewAffordability();
		this.syncAttributes();
	}

	/**
	 * START wurde gedrückt. Prüfen, gegebenenfalls absagen, sonst abbuchen.
	 *
	 * Der genaue Ablauf und warum zwischen Prüfung und Abbuchung nichts
	 * dazwischenkommen kann: siehe Dateikopf, Abschnitt „DIE ABBUCHUNG".
	 *
	 * @param {CustomEvent} event abbrechbares vs:round
	 * @returns {void}
	 */
	onRound(event) {
		// START gedrückt — spätestens jetzt ist das Gerät bedient worden.
		this.engaged = true;

		const bet = Number(event.detail?.bet);

		if (!this.machineCredit.canAfford(bet)) {
			// CONCEPT.md Abschnitt 3.3, seit B.5.2 auf den GERÄTEKREDIT bezogen:
			// „Reicht der Gerätekredit für den gewählten Einsatz nicht, ist der
			// Zug nicht auslösbar und die Anzeige zeigt GUTHABEN ZU GERING."
			// Der Spieler kann nachwerfen, solange die Kasse etwas hergibt.
			// preventDefault() lässt die Runde nicht zustande kommen;
			// startRound() liefert daraufhin false, START bleibt eine gewöhnliche
			// Drucktaste und braucht kein Zurückschnellen wie ein Hebel. Es wird NICHTS
			// abgebucht — stake() wird gar nicht erst gerufen.
			event.preventDefault();
			this.board.show('insufficient');
			return;
		}

		this.board.hide();
		this.stake = bet;

		// Ab hier läuft die Runde. Die Abbuchung wird im SELBEN synchronen Block
		// angestoßen und ihr Versprechen aufbewahrt; abgewartet wird es in
		// onResult(), lange bevor irgendetwas gutgeschrieben werden könnte.
		this.pendingDebit = this.machineCredit.stake(bet).then(
			(result) => {
				if (result.ok !== true) {
					console.error(
						'[video-slot] Der Einsatz konnte nicht abgebucht werden. Die Runde wird nicht ausgezahlt.',
						result
					);
					return false;
				}
				return true;
			},
			(error) => {
				console.error('[video-slot] Die Abbuchung ist fehlgeschlagen.', error);
				return false;
			}
		);
	}

	/**
	 * Die Walzen stehen und es ist ausgewertet. Jetzt wird verrechnet.
	 *
	 * @param {CustomEvent} event vs:result
	 * @returns {Promise<void>}
	 */
	async onResult(event) {
		try {
			// Erst sicherstellen, dass der Einsatz wirklich bezahlt ist. Heute ist
			// das Versprechen längst erfüllt (die Walzen brauchen mindestens 1,8
			// Sekunden, die Buchung einen Mikrotask); mit einem serverseitigen
			// Konto ist es die entscheidende Zeile.
			const paid = await this.pendingDebit;
			if (!paid) {
				this.board.show('void');
				return;
			}

			const win = Number(event.detail?.win);
			if (!Number.isFinite(win) || win <= 0) {
				return;
			}

			// Der Anspruch schreibt dem GERÄTEKREDIT gut, nicht der Kasse:
			// „Einsatz und Gewinn verrechnen sich dort" (B.5.2). Deshalb
			// bekommt er ihn als drittes Argument; payout.js kennt die Kasse
			// seit dieser Phase gar nicht mehr.
			const claim = new WinClaim(this.root, win, this.machineCredit);

			// Die Frage an risk.js: will jemand diesen Gewinn übernehmen?
			const asked = this.emit('vs:payout', {
				win,
				bet: event.detail?.bet ?? this.stake,
				claim,
			}, true);

			if (asked.defaultPrevented) {
				// Ja – die Risiko-Leiter hat übernommen. Sie schreibt später selbst
				// gut (claim.collect()) oder verwirft (claim.discard()).
				return;
			}

			// Nein – Phase 7 zahlt sofort aus. Das ist zugleich das Verhalten, das
			// CONCEPT.md Abschnitt 3.5 für den Auto-Modus verlangt.
			await claim.collect();
		} catch (error) {
			// Ein Fehler in der Verrechnung darf die Seite nicht mitreißen; er
			// gehört gemeldet, nicht verschluckt.
			console.error('[video-slot] Die Verrechnung der Runde ist fehlgeschlagen.', error);
		}
	}

	/**
	 * Zustandswechsel des Automaten: Einsatzwahl auf oder zu.
	 *
	 * @param {CustomEvent} event vs:state
	 * @returns {void}
	 */
	onState(event) {
		const to = String(event.detail?.to ?? '');
		this.setLocked(!OPEN_STATES.includes(to));

		// Zurück im Ruhestand: wenn der nächste Zug nicht bezahlbar ist, sagt der
		// Automat das, ohne dass man erst START drücken muss.
		if (!this.locked) {
			this.reviewAffordability();
		}
	}

	/**
	 * Ein Gewinn wurde gutgeschrieben – gleich, ob unmittelbar oder später von
	 * der Risiko-Leiter.
	 *
	 * Der einzige Grund, warum das hier zugehört: die Kappung am Höchststand
	 * muss gesagt werden, und das Meldungsschild gehört der Kasse. Weil die
	 * Meldung an das EREIGNIS hängt und nicht an den Auszahlungsweg, gilt sie
	 * auch für die Leiter, ohne dass dort etwas dafür getan wird.
	 *
	 * @param {CustomEvent} event vs:collect
	 * @returns {void}
	 */
	onCollect(event) {
		if (event.detail?.capped === true) {
			this.board.show('capped');
		}
	}

	/**
	 * Schreibt den Gerätekredit und seinen Spiegel als data-Attribute ans
	 * Gehäuse.
	 *
	 * Gleiche Absicht wie data-vs-round (Phase 6), data-vs-risk-* (dieser Phase) und
	 * data-vs-auto-* (dieser Phase): der Zustand ist von außen ablesbar, und der
	 * Nachweis ist ein DOM-Lesevorgang statt einer Glaubensfrage.
	 *
	 * data-vs-mirror kommt aus machineCredit.mirror und NICHT aus dem
	 * localStorage — der Automat greift nicht selbst auf den Speicher zu
	 * (CONCEPT.md B.5.3). Genau dafür hat die Schnittstelle diesen Lesezugang.
	 * Der Wert hat die Form "<kennung>|<betrag>" und ist leer, solange der
	 * Gerätekredit 0 ist; damit ist zugleich nachprüfbar, dass im Ruhezustand
	 * nur die in B.5.3 genannten Schlüssel im Speicher liegen.
	 *
	 * Diese Datei schreibt AUSSCHLIESSLICH diese beiden Attribute.
	 * data-vs-bank, data-vs-total und data-vs-cashout gehören bank.js.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const data = this.root.dataset;
		data.vsMachineCredit = String(this.machineCredit.amount);
		data.vsMirror = this.machineCredit.mirror;
	}

	/**
	 * Meldet alles ab. Wird beim Verlassen der Seite gerufen; CONCEPT.md
	 * Phase 9 verlangt „sauberes Aufräumen laufender Zeitgeber" ausdrücklich.
	 *
	 * @returns {void}
	 */
	destroy() {
		// ZUERST auszahlen, solange noch alles steht. close() bucht den
		// Gerätekredit vollständig in die Kasse zurück und löscht den Spiegel
		// (B.5.2: „Verlässt der Spieler die Seite, wandert der Gerätekredit von
		// selbst zurück in die Kasse. Neuladen zählt als Verlassen. Es kann
		// kein Geld irgendwo liegenbleiben.").
		//
		// DIES IST DIE EINZIGE STELLE IM AUTOMATEN, DIE close() RUFT. Der Weg
		// dorthin: video-slot.js meldet teardown() für pagehide an, teardown()
		// ruft wallet.destroy(). bank.js bucht beim Abräumen ausdrücklich
		// nicht — zwei Stellen wären zwei Wahrheiten über denselben Betrag.
		//
		// Es wird nicht abgewartet: beim Verlassen der Seite läuft keine
		// Fortsetzung mehr. Der Speicher ist aber bereits geschrieben, wenn
		// diese Zeile zurückkehrt, weil der ganze Rumpf von close() synchron
		// abläuft und nur der Rückgabewert ein Versprechen ist — dieselbe
		// Eigenschaft, auf der schon die Abbuchung beruht (siehe Dateikopf).
		//
		// Ein zu diesem Zeitpunkt noch offener Gewinn der Risiko-Leiter ist
		// bereits dem Gerätekredit gutgeschrieben: video-slot.js räumt die
		// Bedienfelder VOR den Verrechnungen ab. Er wandert also mit zurück.
		void this.machineCredit.close();

		this.unsubscribe?.();
		this.unsubscribe = null;

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.coinSlot.destroy();
		this.board.destroy();
		this.creditCounter?.destroy();
		this.betCounter?.destroy();
		this.betsGroup?.classList.remove('vs-bets--locked');
		for (const button of this.betButtons) {
			// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse.
			button.removeAttribute('aria-disabled');
		}
		this.startButton?.classList.remove('vs-start--lit');

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse — genau
		// wie data-vs-round in machine.js.
		delete this.root.dataset.vsMachineCredit;
		delete this.root.dataset.vsMirror;
	}
}

export default Wallet;
