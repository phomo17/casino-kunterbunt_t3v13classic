/**
 * Reel Slot – der Klang des Geräts
 * ================================================
 *
 * Hier steht, WELCHER Klang zu WELCHEM Ereignis gehört. Die Klangerzeugung
 * selbst steht in casino_startpage und weiß von diesem Automaten nichts
 * (CONCEPT.md Abschnitt 5, Grundsatz 5). Dieselbe Aufteilung wie beim
 * Guthaben: dort der Vertrag, hier das Gerät.
 *
 *
 * SIE FASST DEN SPIELKERN NICHT AN
 * --------------------------------
 * Kein Import von Machine, Wallet, RiskPanel oder AutoPlay. Verbunden wird
 * ausschließlich über die DOM-Ereignisse am .rs-machine, die die Phasen 6
 * bis 9 dafür gebaut haben. Diese Datei HÖRT NUR ZU; sie ändert keinen
 * Zustand des Spiels, bricht kein Ereignis ab und ruft keine Methode eines
 * anderen Moduls.
 *
 *   rs:state       to === 'spinning'  → Hebelklack, Klappern beginnt
 *                   to === 'evaluating' → Klappern endet
 *                  BUSY_STATES → Leerlaufgeräusche treten zurück
 *   rs:reelrest    → Walzenstopp, je Walze eine andere Tonhöhe
 *   rs:result      → Gewinn-Jingle, nach detail.factor gestaffelt
 *   rs:collect     → Kasse und Münzkaskade, nach detail.credited gestaffelt
 *   rs:count       → ein Zählschritt der Guthaben-Röhren, nur aufwärts
 *   rs:coin        reason 'ok' → Münzeinwurf, sonst die erste Absage
 *   rs:cashout     moved > 0 → Schale und Münzen
 *   rs:risk        phase 'hit' → Risiko-Gewinn, 'miss' → Risiko-Verlust
 *                  'start' → Leerlauf tritt zurück, 'miss'/'collect'/'end' → zurück
 *   rs:risktick    detail.on === true → Blinkton, Tonhöhe je Seite
 *   rs:auto        → Schaltklang der AUTO-Taste
 *   rs:round       am DOKUMENT, Blasenphase, defaultPrevented → zweite Absage
 *
 *
 * DREI EBENEN, NICHT ZWEI
 * -----------------------
 *   sound.js im Site Package   WIE ein Klang entsteht. Kennt keinen Klang.
 *   sound-kit.js               WIE EINE MÜNZE KLINGT. Kennt kein Gerät.
 *   diese Datei                WANN eine Münze klingt. Kennt beides.
 *
 * Deshalb steht in dieser Datei seit dem Klangausbau keine Frequenz mehr für
 * Münze, Kasse, Metall, Blech und Zählschritt: die stehen einmal im Baukasten,
 * damit Video Slot und Coin Pusher (B.8, B.9) nicht drei verschiedene
 * Antworten auf die Frage „wie klingt eine Münze?" bekommen. Die Frequenzen
 * der GERÄTEEIGENEN Klänge — Hebel, Walzenstopp, Klappern, Jingle, Risiko,
 * AUTO, Ton-Schalter — bleiben hier: sie sind die Klangsprache genau dieses
 * Automaten und gehören keinem anderen.
 *
 *
 * DIE LEERLAUFGERÄUSCHE GEHÖREN DIESEM GEHÄUSE
 * --------------------------------------------
 * Brummen, Relaisklick und Ticken kommen aus IdleNoise, einer Instanz JE
 * GEHÄUSE. Stehen zwei Automaten auf einer Seite, brummt jeder für sich, und
 * wird einer abgeräumt, muss sein Brummen gehen und das des anderen bleiben.
 * Das ist die eine Ausnahme von der Regel „destroy() bricht keinen Klang ab":
 * der Kontext gehört der Seite, dieser Dauerklang aber gehört diesem Gerät.
 *
 * Sie schweigen vollständig, solange das Gerät ARBEITET — und das kommt aus
 * ZWEI Quellen: dem Rundenzustand (BUSY_STATES) und der laufenden
 * Risiko-Leiter. Beide zusammen, nicht abwechselnd: eine Leiter läuft in
 * 'result' weiter, und ein Relaisklick zwischen zwei Blinkschritten klänge
 * wie ein Defekt.
 *
 *
 * ZWEI VERSCHIEDENE ABSAGEN — UND EINE DRITTE, DIE STUMM BLEIBT
 * -------------------------------------------------------------
 *  1. MÜNZE ABGELEHNT (rs:coin, reason ≠ 'ok'): zwei dumpfe Anschläge, kein
 *     Metall. Die Münze fällt durch, statt hineinzugehen.
 *  2. ZUG ABGELEHNT (rs:round mit defaultPrevented): ein einzelner tiefer
 *     Anschlag. Der Hebel geht, aber es passiert nichts.
 *  3. HEBEL IN DER RISIKO-LEITER: bleibt STUMM. risk.js fängt rs:round in der
 *     Erfassungsphase am Dokument ab und ruft dort stopPropagation() — das
 *     Ereignis erreicht die Blasenphase nie, und ein Zuhörer, der es hören
 *     wollte, müsste sich vor risk.js drängeln. Das ist kein Mangel: während
 *     der Leiter blinkt und piept es ohnehin zehnmal je Sekunde.
 *
 * Beide hörbaren Absagen haben eine SICHTBARE Entsprechung am Meldungsschild
 * ('nocash'/'capped'/'invalid' bzw. 'insufficient'). Der Klang ist Zugabe, nie
 * die einzige Auskunft — sonst wäre er für jeden ohne Ton eine verlorene
 * Information.
 *
 *
 * WARUM rs:round AM DOKUMENT UND IN DER BLASENPHASE
 * -------------------------------------------------
 * Ein Zuhörer am Gehäuse sähe defaultPrevented im selben Takt noch als false:
 * reel-slot.js baut das Klangpult als ERSTES (siehe dort, bindMachines()),
 * sein Zuhörer läuft also VOR dem der Kasse, die preventDefault() ruft. Am
 * Dokument in der Blasenphase ist die ganze Reise durch das Gehäuse vorbei;
 * dort steht die Absage fest. Es ist der ZWEITE Zuhörer dieses Ereignisses am
 * Dokument — risk.js hat den ersten, in der Erfassungsphase.
 *
 *
 * WARUM DER HEBELKLANG AN rs:state HÄNGT UND NICHT AN rs:round
 * --------------------------------------------------------------
 * rs:round ist abbrechbar und wird auch dann gefeuert, wenn die Runde NICHT
 * zustande kommt: bei zu geringem Guthaben ruft die Kasse preventDefault(),
 * aber kein stopPropagation() — ein Zuhörer am Gehäuse sähe das Ereignis also
 * trotzdem, und defaultPrevented ist im selben Takt noch false (in Phase 9
 * gemessen). Ein Hebelklang bei abgelehntem Zug wäre eine Lüge. rs:state mit
 * to === 'spinning' kommt dagegen genau einmal je wirklich zustande gekommener
 * Runde — beim Hebelzug eines Menschen wie beim rs:spin des Auto-Modus.
 *
 *
 * WARUM DIE AUSZAHLUNG HINTER DEM JINGLE LIEGT
 * --------------------------------------------
 * Im Auto-Modus fallen rs:result und rs:collect in denselben Takt: die
 * Risiko-Leiter wird dort abgebrochen, die Kasse löst den Anspruch sofort ein.
 * Zwei Klänge exakt übereinander sind genau die Überlagerung, die CONCEPT.md
 * Phase 10 ausschließt. Deshalb merkt sich diese Datei die Kontextzeit, zu der
 * der Jingle endet, und legt die Münzkaskade dahinter. Web Audio plant
 * sample-genau in die Zukunft; das kostet keinen Zeitgeber.
 *
 *
 * DAS KLAPPERN IST DER EINZIGE ZEITGEBER DIESER DATEI
 * ---------------------------------------------------
 * (Der zweite Zeitgeber im Spiel, der für Relaisklick und Ticken, gehört
 * IdleNoise und wird dort gespannt und dort gelöscht.)
 * Es gibt kein Ereignis je durchlaufender Rasterposition, und es soll auch
 * keines geben — der Spielkern wird für den Klang nicht geändert. Also läuft
 * ein sich selbst neu spannender setTimeout mit CLATTER_MS, solange der
 * Automat in 'spinning' oder 'stopping' steht. Höchstens EINER je Gerät;
 * gelöscht wird beim Zustandswechsel, beim Verstecken des Fensters und beim
 * Verlassen der Seite.
 *
 *
 * VERSTECKTES FENSTER
 * -------------------
 * Ein verstecktes Fenster hält die Zeichenschleife der Walzen an, drosselt
 * setTimeout aber nur. Ohne Gegenmaßnahme klackerte ein Hintergrund-Tab
 * hörbar weiter, während sich nichts bewegt. Deshalb: bei 'hidden' Klappern
 * löschen und alle Stimmen abbrechen, bei der Rückkehr nur dann wieder
 * anwerfen, wenn der Automat noch läuft.
 *
 *
 * ZWEI AUTOMATEN AUF EINER SEITE
 * ------------------------------
 * Sie teilen sich EINEN AudioContext (Begründung im Kopf des Moduls in
 * casino_startpage). Deshalb beendet destroy() hier nur den eigenen
 * Zeitgeber und die eigenen Zuhörer und bricht KEINE Stimmen ab — das
 * schnitte dem anderen Gerät den Ton ab. Das seitenweite Abschalten macht
 * shutdownSound() genau einmal, aus reel-slot.js.
 *
 *
 * DER SPEICHER
 * ------------
 * Diese Datei fasst den Browserspeicher NICHT an. Die Ton-Einstellung gehört
 * dem Modul in casino_startpage, genauso wie das Guthaben — dieselbe Regel
 * wie in CONCEPT.md Abschnitt 3.6.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Ton-Schalter trägt
 * seine Beschriftung aus der Sprachdatei im Markup.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import {
	cashRegister,
	coin,
	coinCascade,
	countStep,
	metal,
	ratchet,
	sheet,
} from '@phomo17/casino-startpage/sound-kit.js';
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';

/**
 * Abstand zweier Klacker beim Walzenlauf, in Millisekunden.
 *
 * 85 statt der ursprünglichen 70: bei rund zwölf Rasten je Sekunde hört man die
 * einzelne Raste noch, bei vierzehn verschmelzen sie zum Rasseln. Die
 * Rückmeldung zu Phase 10 lautete „soll mechanischer klingen, nicht so
 * klackernd" — das ist zur Hälfte eine Frage des Takts und zur Hälfte eine des
 * Klangs (siehe clatter()).
 */
const CLATTER_MS = 85;

/** Rundenzustände, in denen die Walzen laufen. */
const RUNNING_STATES = Object.freeze(['spinning', 'stopping']);

/**
 * Rundenzustände, in denen das Gerät ARBEITET.
 *
 * Eine Zeile mehr als RUNNING_STATES: 'evaluating' ist der Augenblick zwischen
 * dem letzten Walzenstopp und dem Jingle. Die Walzen laufen dort nicht mehr,
 * aber ein Relaisklick mitten in die Auswertung wäre der eine Zeitpunkt, an
 * dem er wie eine Rückmeldung auf das Ergebnis klänge — und ein Klang, der
 * etwas andeutet, das er nicht ist, ist genau der Spannungstrick, den
 * CONCEPT.md B.7 ausschließt.
 *
 * 'result' steht bewusst NICHT drin: dort ruht das Gerät und wartet auf den
 * nächsten Hebelzug. Genau dann soll es wieder hörbar leben.
 */
const BUSY_STATES = Object.freeze(['spinning', 'stopping', 'evaluating']);

/**
 * Die vier Stufen des Gewinn-Jingles, nach dem FAKTOR aus der Auszahlungs-
 * tabelle (CONCEPT.md Abschnitt 3.3), nicht nach dem Betrag.
 *
 * Grund: derselbe Walzenbefund muss immer gleich klingen. Bei Einsatz 10 zahlt
 * eine einzelne Kirsche zehn Kredite, drei Orangen bei Einsatz 1 ebenfalls —
 * nach Betrag gestaffelt klänge die häufigste Zeile des Spiels wie ein
 * Dreiertreffer.
 *
 * Die Schnitte folgen dem Bau der Tabelle:
 *   1, 3        die beiden Kirschen-Sonderzeilen, zusammen 36 % ALLER Züge
 *   5 … 14      die Dreiertreffer der Früchte, zusammen 4,675 %
 *   20, 50      Glocke und BAR, zusammen 0,125 %
 *   100         die Sieben, Jackpot 1 zu 4000 (Anhang C)
 */
const WIN_TIERS = Object.freeze([
	Object.freeze({ from: 100, id: 'jackpot' }),
	Object.freeze({ from: 20, id: 'gross' }),
	Object.freeze({ from: 5, id: 'mittel' }),
	Object.freeze({ from: 1, id: 'klein' }),
]);

/** Ein weicher Tiefpass nimmt dem Rechteck die Schärfe, ohne ihm das Piepsige zu nehmen. */
const SOFT = Object.freeze({ type: 'lowpass', freq: 5200, q: 0.7 });

/**
 * Grundton der Zählleiter in Hertz.
 *
 * 784 Hz ist g''. Er liegt über dem Klappern (124 Hz) und unter dem Klimpern
 * einer Münze (2100 Hz), also in der einen Lücke, die im Klangbild dieses
 * Geräts noch frei ist. Die Leiter selbst baut sound-kit.js pentatonisch
 * darauf auf; WELCHER Grundton, entscheidet das Gerät — genau wie bei jeder
 * anderen Frequenz in dieser Datei.
 */
const COUNT_BASE = 784;

/**
 * Die einzige Anzeige, deren Fahrt klingt.
 *
 * Heute ist ohnehin nur GUTHABEN ein Zählwerk (wallet.js); EINSATZ wird
 * gesetzt statt gefahren, GEWINN und STUFE werden direkt geschrieben. Die
 * Prüfung steht trotzdem da: bekäme eine weitere Anzeige später ein Zählwerk,
 * fiele sonst ohne jede Absicht ein zweiter Zählklang an, und niemand käme auf
 * die Idee, ihn hier zu suchen.
 */
const COUNT_DISPLAY = 'guthaben';

/**
 * Der Klang eines Gehäuses.
 */
export class MachineSound {
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

		// Fehlt der Schalter, klingt der Automat trotzdem – er ist dann nur
		// nicht abschaltbar. Gleiche Haltung wie findNixieGroup() in nixie.js:
		// ein fehlendes Bedienteil legt kein Gerät still.
		this.button = cabinet.querySelector('[data-rs-sound]');

		/** Kennung des Klapper-Zeitgebers, oder 0. Immer höchstens einer. */
		this.clatterTimer = 0;

		/** Laufen die Walzen gerade? */
		this.running = false;

		/** Arbeitet der Spielkern gerade? Aus rs:state. */
		this.machineBusy = false;

		/** Läuft die Risiko-Leiter gerade? Aus rs:risk. */
		this.riskBusy = false;

		/**
		 * Die Leerlaufgeräusche GENAU DIESES Gehäuses.
		 *
		 * Ohne Argumente: ein Gerät, das nichts übergibt, klingt wie ein Gerät
		 * dieses Hauses — und genau das ist der Sinn eines geteilten Bausteins.
		 * Angelegt wird sie VOR sound.subscribe() weiter unten, denn subscribe()
		 * ruft paint() sofort einmal auf, und paint() fasst sie an.
		 */
		this.idle = new IdleNoise();

		/** Kontextzeit, zu der der zuletzt begonnene Jingle endet. */
		this.jingleEnd = 0;

		/** @type {Array<{target: EventTarget, type: string, handler: function, capture: boolean}>} */
		this.bound = [];

		this.clatterStep = () => this.clatter();

		// Die Nutzergeste, an der die Autoplay-Sperre hängt. Erfassungsphase,
		// damit sie vor allem anderen läuft: beim pointerup des Hebelzugs ist
		// der Kontext dann schon warm und der erste Klang kommt ohne Stocken.
		this.listen(root, 'pointerdown', (event) => this.onGesture(event), true);

		this.listen(root, 'rs:state', (event) => this.onState(event));
		this.listen(root, 'rs:reelrest', (event) => this.onReelRest(event));
		this.listen(root, 'rs:result', (event) => this.onResult(event));
		this.listen(root, 'rs:collect', (event) => this.onCollect(event));
		this.listen(root, 'rs:count', (event) => this.onCount(event));
		this.listen(root, 'rs:coin', (event) => this.onCoin(event));
		this.listen(root, 'rs:cashout', (event) => this.onCashOut(event));
		this.listen(root, 'rs:risk', (event) => this.onRisk(event));
		this.listen(root, 'rs:risktick', (event) => this.onRiskTick(event));
		this.listen(root, 'rs:auto', (event) => this.onAuto(event));

		// Am DOKUMENT und in der BLASENPHASE, nicht am Gehäuse: nur dort steht
		// defaultPrevented schon fest. Begründung im Dateikopf.
		this.listen(root.ownerDocument, 'rs:round', (event) => this.onRoundRefused(event));

		this.listen(root.ownerDocument, 'visibilitychange', () => this.onVisibility());

		// click und nicht pointerdown, anders als bei den Bakelit-Tasten: der
		// Ton-Schalter hat keine Rolle im Zeitverhalten des Spiels, das CSS
		// kennt für ihn keinen gedrückten Zustand, und click ist das Ereignis,
		// das die Nutzeraktivierung zweifelsfrei erteilt.
		if (this.button !== null) {
			this.listen(this.button, 'click', () => this.onSwitch());
		}

		// Die eine Anmeldung beim Schalterzustand. subscribe() ruft SOFORT
		// einmal auf und bringt damit das Markup mit dem gespeicherten Wert in
		// Übereinstimmung — auch dann, wenn dort rs-sound--on steht und der
		// Spieler den Ton beim letzten Besuch abgeschaltet hatte.
		this.unsubscribe = sound.subscribe((detail) => this.paint(detail));
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
	 * Erste echte Nutzerhandlung am Gehäuse.
	 *
	 * event.isTrusted ist die entscheidende Zeile: ein nachgemachtes Ereignis
	 * erteilt in Chromium KEINE Nutzeraktivierung. Würde es hier trotzdem als
	 * Geste durchgehen, entstünde ein Kontext ohne Aktivierung — und genau das
	 * ist die Konsolenwarnung, die Phase 10 vermeiden soll.
	 *
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	onGesture(event) {
		if (event.isTrusted !== true) {
			return;
		}
		sound.unlock();

		// Erst nach unlock(): vorher gibt es keinen AudioContext, und
		// sound.sustain() liefert dann null. start() ist genau dafür beliebig
		// oft aufrufbar — es legt nie einen zweiten Dauerklang an und der
		// erste Aufruf, der greifen kann, greift. Deshalb steht es hier und
		// nicht in einem einmaligen Sonderweg.
		this.idle.start();

		// Jeder echte Zeigerdruck bringt auch die Messwerte am Gehäuse auf
		// Stand. Das ist der Griff, mit dem ein Prüfskript die Zähler abfragen
		// kann, ohne den Spielablauf anzufassen.
		this.syncAttributes();
	}

	/**
	 * Zustandswechsel des Automaten.
	 *
	 * @param {CustomEvent} event rs:state
	 * @returns {void}
	 */
	onState(event) {
		const to = String(event.detail?.to ?? '');
		this.running = RUNNING_STATES.includes(to);
		this.machineBusy = BUSY_STATES.includes(to);
		this.updateBusy();

		if (to === 'spinning') {
			// Klack der einrastenden Klinke plus das anlaufende Werk.
			sound.sequence({
				key: 'lever',
				minGap: 0.15,
				noises: [{ duration: 0.06, attack: 0.001, gain: 0.30, filter: { type: 'bandpass', freq: 1600, q: 1.2 } }],
				tones: [{ type: 'square', freq: 140, freqEnd: 70, duration: 0.10, attack: 0.002, gain: 0.20, filter: { type: 'lowpass', freq: 900, q: 0.7 } }],
			});
			this.startClatter();
		} else if (to === 'evaluating') {
			this.stopClatter();
		}

		this.syncAttributes();
	}

	/**
	 * Führt die Leerlaufgeräusche nach: schweigen sie oder nicht?
	 *
	 * ODER, nicht ENTWEDER-ODER. Der Spielkern und die Risiko-Leiter arbeiten
	 * nacheinander UND überlappend: die Leiter läuft im Rundenzustand
	 * 'result' weiter, in dem der Kern längst ruht. Nur die Verknüpfung
	 * beider Merker beschreibt „das Gerät hat gerade zu tun" richtig.
	 *
	 * setBusy() ist gegen doppelte Aufrufe gefeit — es vergleicht selbst mit
	 * seinem letzten Stand und tut sonst nichts. Diese Methode darf also aus
	 * jedem Zuhörer heraus gerufen werden, ohne mitzuzählen.
	 *
	 * @returns {void}
	 */
	updateBusy() {
		this.idle.setBusy(this.machineBusy || this.riskBusy);
	}

	/**
	 * Eine Walze steht.
	 *
	 * Je später die Walze, desto tiefer der Ton: so setzt sich ein Werk.
	 *
	 * @param {CustomEvent} event rs:reelrest
	 * @returns {void}
	 */
	onReelRest(event) {
		const index = Number(event.detail?.reel);
		const slot = Number.isInteger(index) && index >= 1 && index <= 3 ? index : 1;
		const start = [340, 300, 260][slot - 1];
		const end = [150, 135, 120][slot - 1];

		// Drei Anteile, in dieser Reihenfolge hörbar:
		//   1. der KLICK der einschnappenden Klinke — 5 ms, hoch, hart. Er kommt
		//      zuerst und ist das, was man als „einrasten" hört.
		//   2. das EINFALLEN des Werks — derselbe absackende Ton wie bisher, aber
		//      etwas länger, damit das Einrasten Zeit hat.
		//   3. der AUFSCHLAG — ein dumpfer Stoß, um 8 ms versetzt, damit er nicht
		//      im Klick untergeht.
		// Je später die Walze, desto tiefer: so setzt sich ein Werk.
		sound.sequence({
			key: `stop-${slot}`,
			minGap: 0.06,
			noises: [
				{ at: 0, duration: 0.005, attack: 0.0004, gain: 0.19, filter: { type: 'highpass', freq: 3800, q: 0.8 } },
				{ at: 0.008, duration: 0.034, attack: 0.001, gain: 0.17, filter: { type: 'bandpass', freq: 700, q: 1.2 } },
			],
			tones: [{ type: 'square', freq: start, freqEnd: end, at: 0.004, duration: 0.09, attack: 0.001, gain: 0.26, filter: { type: 'lowpass', freq: 1100, q: 0.9 } }],
		});
	}

	/**
	 * Die Runde ist ausgewertet.
	 *
	 * @param {CustomEvent} event rs:result
	 * @returns {void}
	 */
	onResult(event) {
		const factor = Number(event.detail?.factor);
		if (!Number.isFinite(factor) || factor < 1) {
			this.jingleEnd = 0;
			this.syncAttributes();
			return;
		}

		const tier = WIN_TIERS.find((candidate) => factor >= candidate.from) ?? WIN_TIERS[WIN_TIERS.length - 1];
		this.jingleEnd = this.playJingle(tier.id);
		this.syncAttributes();
	}

	/**
	 * Spielt einen Jingle und liefert seine Endzeit in Kontextzeit.
	 *
	 * @param {string} tier 'klein' | 'mittel' | 'gross' | 'jackpot'
	 * @returns {number}
	 */
	playJingle(tier) {
		const key = `win-${tier}`;
		const minGap = 0.20;

		if (tier === 'klein') {
			// ZWEITE Änderung an diesem einen Klang, und die erste ist vom
			// Auftraggeber noch nicht gehört worden (Punkt 15 in test.txt).
			// Der Grund, es trotzdem zu tun: der erste Umbau hat den Piepser
			// durch etwas ersetzt, das eine Münze nur NACHBAUT — mit
			// handgeschriebenen Frequenzen an einer Stelle, an der es seit
			// diesem Ausbau eine Münze GIBT. Zwei Münzen mit verschiedenen
			// Zahlen in einem Haus sind genau das, was der Baukasten verhindern
			// soll. Gehört wird jetzt beides zusammen in einem Durchgang.
			//
			// pitch 0.5      halb so hoch wie eine Einwurfmünze: es ist eine
			//                andere, größere Münze — die, die HERAUSKOMMT
			// body 0.85      der Behälter klingt tiefer als der Einwurfschacht
			// roll 0.9       sie fällt in eine SCHALE und rollt aus. Genau das
			//                unterscheidet den Gewinn vom Einwurf, bei dem die
			//                Münze in einem Schacht verschwindet
			// gain 0.9       etwas leiser als eine Einwurfmünze. Dieser Klang
			//                fällt in 36 % aller Züge; im Auto-Modus ist er
			//                alle gut vier Sekunden zu hören
			return coin({ key, minGap, pitch: 0.5, body: 0.85, roll: 0.9, gain: 0.9 });
		}

		if (tier === 'mittel') {
			return sound.sequence({
				key,
				minGap,
				tones: [
					{ type: 'square', freq: 659, at: 0, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 880, at: 0.08, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 1047, at: 0.16, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 1319, at: 0.24, duration: 0.18, gain: 0.17, filter: SOFT },
				],
			});
		}

		if (tier === 'gross') {
			return sound.sequence({
				key,
				minGap,
				tones: [
					{ type: 'square', freq: 523, at: 0, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 659, at: 0.09, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 784, at: 0.18, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1047, at: 0.27, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1319, at: 0.36, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1568, at: 0.45, duration: 0.34, gain: 0.18, filter: SOFT },
				],
				noises: [{ at: 0.45, duration: 0.22, gain: 0.05, filter: { type: 'highpass', freq: 6000, q: 0.7 } }],
			});
		}

		// Jackpot: Lauf, drei Schläge, ein gehaltener Ton. Rund 1,5 Sekunden —
		// die einzige Zeile, die 1 zu 4000 fällt (Anhang C).
		return sound.sequence({
			key,
			minGap,
			tones: [
				{ type: 'square', freq: 523, at: 0, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 659, at: 0.09, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 784, at: 0.18, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1047, at: 0.27, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1319, at: 0.36, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1568, at: 0.45, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2093, at: 0.54, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2093, at: 0.66, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2093, at: 0.80, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2093, at: 0.94, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2093, at: 1.08, duration: 0.45, gain: 0.20, filter: SOFT },
			],
			noises: [{ at: 0.54, duration: 0.55, gain: 0.05, filter: { type: 'highpass', freq: 5000, q: 0.7 } }],
		});
	}

	/**
	 * Ein Gewinn ist gutgeschrieben. Die Kasse klingelt, dann fallen Münzen.
	 *
	 * GESTAFFELT WIRD NACH detail.credited, NICHT NACH detail.amount. Die
	 * beiden sind nur meistens gleich: steht der Gerätekredit am Höchststand,
	 * ist amount der ANSPRUCH und credited das, was wirklich angekommen ist
	 * (payout.js, WinClaim.collect()). Eine Kasse, die über einen Betrag
	 * klingelt, der gar nicht geflossen ist, wäre eine Lüge — und bei
	 * credited === 0 klingt deshalb gar nichts. Das Meldungsschild sagt dann
	 * „KONTO VOLL"; der Spieler bleibt also nicht ohne Auskunft.
	 *
	 * Die Kaskade wird HINTER das Ende des laufenden Jingles gelegt — siehe
	 * Dateikopf. Läuft keiner (Risiko-Leiter, Auszahlung nach dem Aussteigen),
	 * beginnt sie sofort.
	 *
	 * ZWEI Klangschlüssel, nicht einer: Glocke und Münzen sind seit dem
	 * Klangausbau zwei Aufrufe, und jeder Aufruf braucht seinen eigenen
	 * Mindestabstand. Ein gemeinsamer Schlüssel ließe den zweiten Aufruf am
	 * ersten scheitern, weil zwischen beiden keine 250 ms liegen.
	 *
	 * @param {CustomEvent} event rs:collect
	 * @returns {void}
	 */
	onCollect(event) {
		const credited = Number(event.detail?.credited);
		if (!Number.isFinite(credited) || credited <= 0) {
			this.jingleEnd = 0;
			this.syncAttributes();
			return;
		}

		// Die Stellenzahl, nicht der Betrag: zwischen 40 und 50 Krediten hört
		// niemand einen Unterschied, zwischen 40 und 4000 sehr wohl. Ein
		// linearer Regler wäre bei den kleinen Beträgen, die in 36 % aller
		// Züge fallen, ohne jede Wirkung.
		const digits = Math.floor(Math.log10(Math.max(1, credited)));
		const offset = Math.max(0, this.jingleEnd - sound.now) + 0.06;

		// size 0 bis 1: eine kleine Buchung klingelt kürzer und leiser als eine
		// große. 1..9 → 0, 10..99 → 0,25, … ab 10 000 → 1.
		cashRegister({
			key: 'collect',
			minGap: 0.25,
			at: offset,
			size: Math.min(1, digits / 4),
		});

		// + 0,13 s: die Münzen fallen NACH der Kassenglocke, nicht in sie
		// hinein. Die Glocke ist bei offset + 0,16 s ausgeklungen.
		// count wird von coinCascade() selbst auf 2 bis 9 begrenzt; hier steht
		// die Absicht, nicht die Grenze.
		coinCascade({
			key: 'collect-coins',
			minGap: 0.25,
			at: offset + 0.13,
			count: 2 + digits,
		});

		this.jingleEnd = 0;
		this.syncAttributes();
	}

	/**
	 * Eine Münze ist eingeworfen worden — oder eben nicht.
	 *
	 * detail.reason kommt aus coinslot.js: 'ok', 'nocash' (die Kasse gibt so
	 * viel nicht her), 'full' (der Gerätekredit steht am Höchststand) oder
	 * 'closed'. Geprüft wird zusätzlich moved > 0: bei „alles oder nichts"
	 * (DECISIONS.md, Phase 3) kann ok nicht mit moved === 0 zusammenfallen,
	 * aber der Klang soll an der BEWEGUNG hängen und nicht an einer Zusage.
	 *
	 * @param {CustomEvent} event rs:coin
	 * @returns {void}
	 */
	onCoin(event) {
		const moved = Number(event.detail?.moved);

		if (event.detail?.reason === 'ok' && Number.isFinite(moved) && moved > 0) {
			// Mit den Voreinstellungen des Baukastens (pitch 1, body 1,
			// roll 0) ist das Ton für Ton derselbe Klang wie bisher: 2100 und
			// 2640 Hz, 190 → 150 Hz, Hochpass bei 5000 Hz. Der Baukasten ist
			// für ihn nur der neue Aufbewahrungsort, keine Neufassung — dieser
			// Klang war freigegeben. KEIN Ausrollen: die Münze verschwindet in
			// einem Schacht, sie fällt nicht in eine Schale.
			coin({ key: 'coin', minGap: 0.07 });
			return;
		}

		// ABSAGE 1 VON 2 (siehe Dateikopf): zwei dumpfe Anschläge in gleichem
		// Abstand (tighten 1), tief (pitch 0.55) und ohne jeden metallischen
		// Nachklang. So klingt eine Münze, die zurückfällt, statt hineinzugehen.
		// Der Mindestabstand von 250 ms verhindert eine Salve, wenn jemand
		// mehrmals hintereinander auf einen leeren Kassenstand drückt.
		ratchet({
			key: 'coin-refused',
			minGap: 0.25,
			count: 2,
			step: 0.075,
			tighten: 1,
			pitch: 0.55,
			gain: 0.9,
		});
	}

	/**
	 * Ein sichtbarer Schritt des Guthaben-Zählwerks.
	 *
	 * NUR AUFWÄRTS. Eine Fahrt nach unten ist ein Einsatz, eine Auszahlung
	 * oder eine Rückbuchung — dafür gibt es jeweils schon einen eigenen Klang
	 * (Hebel, Schale, Münzen), und eine absteigende Tonfolge obendrauf klänge
	 * nach Verlust, wo gar keiner ist. B.7 verlangt die Tonfolge ausdrücklich
	 * „beim HOCHZÄHLEN eines Gewinns".
	 *
	 * Ein Aufruf JE SCHRITT, nicht eine Folge im Voraus: die Fahrt darf
	 * unterwegs ein neues Ziel bekommen (counter.js, ramp()), und eine
	 * vorausgeplante Folge ginge dann falsch und hielte außerdem alle
	 * Stimmenplätze vom Augenblick des Planens an besetzt.
	 *
	 * @param {CustomEvent} event rs:count
	 * @returns {void}
	 */
	onCount(event) {
		const detail = event.detail;
		if (detail?.display !== COUNT_DISPLAY || detail.direction !== 'up') {
			return;
		}
		countStep({
			key: 'count',
			// 30 ms. Die Schritte liegen 70 ms auseinander, es wird also nichts
			// verworfen; die Sperre fängt nur den Fall ab, dass zwei Zählwerke
			// desselben Gehäuses irgendwann gleichzeitig fahren.
			minGap: 0.03,
			index: detail.index,
			steps: detail.steps,
			base: COUNT_BASE,
		});
	}

	/**
	 * CASH OUT: der Gerätekredit ist in die Kasse zurückgebucht.
	 *
	 * moved === 0 bleibt STILL. Das ist der Fall „Kasse voll, der Rest bleibt
	 * im Gerät stehen" (DECISIONS.md, Phase 3) — es ist nichts geflossen, also
	 * fällt auch nichts in die Schale. Das Meldungsschild zeigt „KONTO VOLL".
	 *
	 * Zwei Teile, in dieser Reihenfolge hörbar: die Klappe der Auswurfschale
	 * (ein Rutschen von hoch nach tief), und 100 ms später die Münzen. Die
	 * Klappe zuerst, weil sie sich öffnet, BEVOR etwas hindurchfällt.
	 *
	 * @param {CustomEvent} event rs:cashout
	 * @returns {void}
	 */
	onCashOut(event) {
		const moved = Number(event.detail?.moved);
		if (!Number.isFinite(moved) || moved <= 0) {
			return;
		}

		const digits = Math.floor(Math.log10(Math.max(1, moved)));

		sheet({
			key: 'cashout-tray',
			minGap: 0.4,
			duration: 0.20,
			from: 1000,
			to: 320,
			gain: 0.9,
		});

		// Etwas mehr Münzen als bei einer einzelnen Gutschrift (3 + Stellen
		// statt 2 + Stellen) und minimal tiefer: hier wird der ganze
		// Gerätekredit ausgeschüttet, nicht ein einzelner Gewinn.
		coinCascade({
			key: 'cashout',
			minGap: 0.4,
			at: 0.10,
			count: 3 + digits,
			pitch: 0.95,
			spread: 0.07,
		});

		this.syncAttributes();
	}

	/**
	 * Ein Zug ist ABGELEHNT worden.
	 *
	 * Läuft am DOKUMENT in der BLASENPHASE — der einzige Ort, an dem
	 * defaultPrevented schon feststeht. Begründung im Dateikopf.
	 *
	 * Die Prüfung auf event.target ist Pflicht und nicht Vorsicht: am Dokument
	 * kommen die rs:round ALLER Gehäuse dieser Seite an. Ohne sie antwortete
	 * jeder Automat auf die abgelehnte Runde jedes anderen.
	 *
	 * ABSAGE 2 VON 2: ein einzelner tiefer Anschlag. Metall, weil es der Hebel
	 * ist, der auf einen Anschlag läuft; tief (pitch 0.45), weil nichts in
	 * Gang kommt. Er darf keinem Gewinnklang ähneln — deshalb kein zweiter Ton
	 * und kein Aufwärtsintervall.
	 *
	 * @param {CustomEvent} event rs:round
	 * @returns {void}
	 */
	onRoundRefused(event) {
		if (event.target !== this.root || !event.defaultPrevented) {
			return;
		}
		metal({ key: 'round-refused', minGap: 0.30, pitch: 0.45, gain: 0.85 });
	}

	/**
	 * Treffer oder Fehlgriff in der Risiko-Leiter.
	 *
	 * Die übrigen Phasen ('offer', 'start', 'collect', 'end') bekommen
	 * absichtlich keinen eigenen Klang: das Angebot ist am blinkenden RISK
	 * schon sichtbar, und der Start der Leiter fällt mit dem Tastendruck
	 * zusammen, dessen Blinkton unmittelbar folgt.
	 *
	 * @param {CustomEvent} event rs:risk
	 * @returns {void}
	 */
	onRisk(event) {
		const phase = event.detail?.phase;

		// Die zweite Quelle für „das Gerät arbeitet". 'offer' zählt NICHT dazu:
		// da blinkt nur die RISK-Taste und das Gerät wartet auf eine
		// Entscheidung — genau der Augenblick, in dem ein leise tickendes
		// Zählwerk richtig ist. Ab 'start' tickt die Leiter selbst zehnmal je
		// Sekunde, und dazwischen gehört kein Relais.
		if (phase === 'start') {
			this.riskBusy = true;
			this.updateBusy();
		} else if (phase === 'miss' || phase === 'collect' || phase === 'end') {
			this.riskBusy = false;
			this.updateBusy();
		}

		if (phase === 'hit') {
			sound.sequence({
				key: 'riskhit',
				minGap: 0.12,
				tones: [
					{ type: 'square', freq: 784, at: 0, duration: 0.07, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1175, at: 0.07, duration: 0.13, gain: 0.18, filter: SOFT },
				],
			});
			return;
		}

		if (phase === 'miss') {
			sound.sequence({
				key: 'riskmiss',
				minGap: 0.30,
				tones: [{ type: 'sawtooth', freq: 320, freqEnd: 80, at: 0, duration: 0.45, attack: 0.004, gain: 0.20, filter: { type: 'lowpass', freq: 900, q: 1 } }],
				noises: [{ at: 0, duration: 0.18, gain: 0.10, filter: { type: 'bandpass', freq: 380, q: 1 } }],
			});
		}
	}

	/**
	 * Das gemalte Lichtfeld hat gewechselt.
	 *
	 * Gefiltert wird auf detail.on === true — Phase 8 hat dieses Ereignis
	 * ausdrücklich dafür gebaut. Seit der neuen Kurve aus CONCEPT.md Anhang B
	 * ist die Periode auf JEDER Stufe 200 ms; das Feld wechselt also überall
	 * zehnmal je Sekunde, und davon tragen FÜNF on === true, denn zwischen zwei
	 * Einschaltvorgängen liegt immer ein Ausschaltvorgang. Fünf Pips von je
	 * 30 ms können sich nicht überlagern. minGap von 90 ms verwirft dabei
	 * nichts: zwischen zwei Einschaltvorgängen liegen 200 ms.
	 *
	 * @param {CustomEvent} event rs:risktick
	 * @returns {void}
	 */
	onRiskTick(event) {
		if (event.detail?.on !== true) {
			return;
		}
		const freq = event.detail?.lit === 'right' ? 1397 : 1175;
		sound.tone({
			key: 'risktick',
			minGap: 0.09,
			type: 'square',
			freq,
			duration: 0.03,
			attack: 0.001,
			gain: 0.11,
			filter: { type: 'bandpass', freq, q: 6 },
		});
	}

	/**
	 * Die AUTO-Taste wurde umgelegt: ein Relais.
	 *
	 * @param {CustomEvent} event rs:auto
	 * @returns {void}
	 */
	onAuto(event) {
		const on = event.detail?.on === true;
		sound.sequence({
			key: 'auto',
			minGap: 0.10,
			noises: [{ duration: 0.012, attack: 0.0005, gain: 0.20, filter: { type: 'bandpass', freq: 2400, q: 2 } }],
			tones: [{ type: 'square', freq: on ? 240 : 180, duration: 0.05, attack: 0.001, gain: 0.16, filter: { type: 'lowpass', freq: 1200, q: 0.7 } }],
		});
		this.syncAttributes();
	}

	/**
	 * Der Ton-Schalter am Gehäuse.
	 *
	 * Beim Einschalten bestätigt ein Relaisklack samt Pip, dass der Ton
	 * wirklich läuft. Beim Ausschalten klingt nichts — der letzte Ton wäre
	 * sonst ausgerechnet der, den man abstellen wollte.
	 *
	 * @returns {void}
	 */
	onSwitch() {
		const on = sound.toggle();
		if (on) {
			sound.unlock();
			sound.sequence({
				key: 'switch',
				minGap: 0.15,
				noises: [{ duration: 0.012, attack: 0.0005, gain: 0.20, filter: { type: 'bandpass', freq: 2400, q: 2 } }],
				tones: [
					{ type: 'square', freq: 300, at: 0, duration: 0.05, attack: 0.001, gain: 0.16, filter: { type: 'lowpass', freq: 1200, q: 0.7 } },
					{ type: 'square', freq: 1319, at: 0.06, duration: 0.09, gain: 0.12, filter: SOFT },
				],
			});
		}
		this.syncAttributes();
	}

	/**
	 * Das Fenster wurde versteckt oder kommt zurück. Siehe Dateikopf.
	 *
	 * @returns {void}
	 */
	onVisibility() {
		if (this.root.ownerDocument.visibilityState === 'hidden') {
			this.stopClatter();

			// ZUERST stopAll(): es blendet auch Dauerklänge in 12 ms aus und
			// erwischt damit das Brummen zusammen mit allem anderen.
			sound.stopAll();

			// DANN idle.stop(): der Griff ist jetzt tot, es bleibt der eigene
			// ZEITGEBER. Der ist der eigentliche Grund für diese Zeile —
			// setTimeout wird in einem versteckten Tab nur gedrosselt, nicht
			// angehalten, und ein Relaisklick alle paar Sekunden aus einem
			// Fenster, in dem sich nichts bewegt, ist genau das, was Phase 10
			// für das Klappern schon einmal abstellen musste.
			this.idle.stop();
			return;
		}
		if (this.running) {
			this.startClatter();
		}

		// Beliebig oft aufrufbar: legt das Brummen neu an, wenn es abgebrochen
		// wurde, und tut nichts, wenn keine Geste vorlag oder der Ton aus ist.
		this.idle.start();
		this.syncAttributes();
	}

	/**
	 * Startet das Klappern, falls es nicht schon läuft.
	 *
	 * Der erste Klacker kommt erst nach CLATTER_MS: der Hebelklang deckt den
	 * Augenblick des Anlaufens bereits ab.
	 *
	 * @returns {void}
	 */
	startClatter() {
		if (this.clatterTimer !== 0 || !sound.enabled) {
			return;
		}
		this.clatterTimer = globalThis.setTimeout(this.clatterStep, CLATTER_MS);
	}

	/**
	 * Ein Klacker, dann der nächste.
	 *
	 * Die Abspielrate schwankt bei jedem Stoß leicht. Ohne diese Streuung
	 * klingen vierzehn gleiche Klacker je Sekunde nach Maschinengewehr statt
	 * nach Mechanik.
	 *
	 * @returns {void}
	 */
	clatter() {
		this.clatterTimer = 0;
		if (!this.running) {
			return;
		}
		// Zwei Anteile machen aus dem Klacken ein Werk: ein gedämpfter Stoß bei
		// 1100 Hz — das Blech der Trommel, nicht die Spitze eines Ticks — und
		// darunter ein sehr kurzer tiefer Ton, der die Masse hörbar macht, die
		// sich dabei bewegt. Beides streut in der Tonhöhe, sonst klingen zwölf
		// gleiche Rasten je Sekunde nach Maschine statt nach Mechanik.
		const swing = 0.85 + Math.random() * 0.3;
		sound.sequence({
			key: 'clatter',
			minGap: 0.05,
			noises: [{
				duration: 0.018,
				attack: 0.0008,
				gain: 0.06,
				rate: swing,
				filter: { type: 'bandpass', freq: 1100, q: 1.6 },
			}],
			tones: [{
				type: 'square',
				freq: 124 * swing,
				freqEnd: 92 * swing,
				duration: 0.022,
				attack: 0.001,
				gain: 0.05,
				filter: { type: 'lowpass', freq: 600, q: 0.8 },
			}],
		});
		this.clatterTimer = globalThis.setTimeout(this.clatterStep, CLATTER_MS);
	}

	/** Hält das Klappern an. Gefahrlos aufrufbar, auch wenn keines läuft. */
	stopClatter() {
		if (this.clatterTimer !== 0) {
			globalThis.clearTimeout(this.clatterTimer);
			this.clatterTimer = 0;
		}
	}

	/**
	 * Bringt den Schalter mit dem gespeicherten Zustand in Übereinstimmung.
	 *
	 * @param {{enabled: boolean, reason: string}} detail
	 * @returns {void}
	 */
	paint(detail) {
		this.button?.classList.toggle('rs-sound--on', detail.enabled === true);

		if (detail.enabled !== true) {
			this.stopClatter();
			// Der Ton-Schalter schaltet ALLES ab, Leerlaufgeräusche
			// eingeschlossen. sound.disable() hat das Brummen schon
			// ausgeblendet (stopAllVoices räumt Dauerklänge mit ab); hier geht
			// zusätzlich der Zeitgeber weg, der sonst weiter ins Leere feuerte.
			// reason kann auch 'remote' sein — dann hat eine andere
			// Registerkarte abgeschaltet, und diese hier verstummt mit.
			this.idle.stop();
		} else {
			if (this.running) {
				this.startClatter();
			}
			this.idle.start();
		}

		this.syncAttributes();
	}

	/**
	 * Schreibt den Zustand als data-Attribute ans Gehäuse.
	 *
	 * Gleiche Absicht wie data-rs-round (P6), data-rs-risk-* (P8) und
	 * data-rs-auto-* (P9): der Zustand ist von außen ablesbar, und der
	 * Nachweis ist ein DOM-Lesevorgang statt einer Glaubensfrage. Beim Klang
	 * ist das besonders wichtig, weil sich ein Ton nicht ansehen lässt.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const stats = sound.stats();
		const data = this.root.dataset;
		data.rsSoundState = stats.enabled ? 'on' : 'off';
		data.rsSoundContext = stats.contextState;
		data.rsSoundPlayed = String(stats.startedVoices);
		data.rsSoundPeakVoices = String(stats.peakVoices);
		data.rsSoundDropped = String(stats.droppedVoices);
		data.rsSoundGap = String(stats.gapDrops);
		data.rsSoundLevel = stats.peakLevel.toFixed(3);

		// Dauerklänge stehen GETRENNT von den Stimmen, weil sie einer anderen
		// Sperre unterliegen (MAX_SUSTAINED statt MAX_VOICES). Eine gemeinsame
		// Zahl machte beide Aussagen wertlos. -sustained ist zugleich die
		// Leckprüfung: nach dem Abräumen muss dort 0 stehen.
		data.rsSoundSustained = String(stats.sustainedVoices);
		data.rsSoundSustainDropped = String(stats.droppedSustained);

		data.rsSoundKeys = JSON.stringify(stats.byKey);
	}

	/**
	 * Meldet alles ab und räumt den Zeitgeber weg.
	 *
	 * Bricht ABSICHTLICH keine Stimmen ab: der Kontext gehört der Seite, nicht
	 * diesem Gerät (siehe Dateikopf). Das seitenweite Abschalten macht
	 * shutdownSound().
	 *
	 * @returns {void}
	 */
	destroy() {
		this.stopClatter();
		this.running = false;
		this.machineBusy = false;
		this.riskBusy = false;

		// DIE EINE AUSNAHME von „destroy() bricht keinen Klang ab": der
		// AudioContext gehört der Seite, dieser Dauerklang aber gehört DIESEM
		// Gehäuse. Stehen zwei Automaten auf einer Seite, muss beim Abräumen
		// des einen sein Brummen gehen und das des anderen bleiben. Ein
		// Dauerklang, den niemand anhält, wäre ein Leck, das bis zum Verlassen
		// der Seite hörbar bliebe.
		this.idle.destroy();

		this.unsubscribe?.();
		this.unsubscribe = null;

		for (const { target, type, handler, capture } of this.bound) {
			target.removeEventListener(type, handler, capture);
		}
		this.bound = [];

		// Ein LETZTES Mal die Messwerte ans Gehäuse schreiben. Ohne diese Zeile
		// bliebe data-rs-sound-sustained auf „1" stehen, obwohl das Brummen
		// gerade abgeräumt wurde — und ein Prüfskript, das nach dem Abräumen
		// liest, hielte genau das für ein Leck. Der Zustand muss nach dem
		// letzten Handgriff stimmen, nicht vor ihm.
		this.syncAttributes();
	}
}

/**
 * Schaltet den Klang der ganzen Seite ab und schließt den Kontext.
 *
 * Genau einmal je Seite aufzurufen, beim Verlassen — nicht je Gerät. Steht
 * hier und nicht in reel-slot.js, damit die Einstiegsdatei kein Modul einer
 * anderen Extension importieren muss.
 *
 * @returns {void}
 */
export function shutdownSound() {
	sound.shutdown();
}

export default MachineSound;
