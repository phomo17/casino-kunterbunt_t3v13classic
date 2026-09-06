/**
 * Video Slot – der Klang des Geräts
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
 * ausschließlich über die DOM-Ereignisse am .vs-machine, die machine.js,
 * wallet.js, risk.js und auto.js dieses Geräts dafür gebaut haben. Diese
 * Datei HÖRT NUR ZU; sie ändert keinen
 * Zustand des Spiels, bricht kein Ereignis ab und ruft keine Methode eines
 * anderen Moduls.
 *
 *   vs:state       to === 'spinning'  → Startklang, Laufgeräusch beginnt
 *                   to === 'evaluating' → Laufgeräusch endet
 *                  BUSY_STATES → Leerlaufgeräusche treten zurück
 *   vs:reelrest    → Walzenstopp, je Walze eine andere Tonhöhe
 *   vs:result      → Gewinn-Jingle, nach detail.factor gestaffelt
 *   vs:collect     → Kasse und Münzkaskade, nach detail.credited gestaffelt
 *   vs:count       → ein Zählschritt der Guthaben-Röhren, nur aufwärts
 *   vs:coin        reason 'ok' → Münzeinwurf, sonst die erste Absage
 *   vs:cashout     moved > 0 → Schale und Münzen
 *   vs:risk        phase 'hit' → Risiko-Gewinn, 'miss' → Risiko-Verlust
 *                  'start' → Leerlauf tritt zurück, 'miss'/'collect'/'end' → zurück
 *   vs:risktick    detail.on === true → Blinkton, Tonhöhe je Seite
 *   vs:auto        → Schaltklang der AUTO-Taste
 *   vs:round       am DOKUMENT, Blasenphase, defaultPrevented → zweite Absage
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
 * der GERÄTEEIGENEN Klänge — Start, Walzenstopp, Laufgeräusch, Jingle, Risiko,
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
 *  1. MÜNZE ABGELEHNT (vs:coin, reason ≠ 'ok'): zwei dumpfe Anschläge, kein
 *     Metall. Die Münze fällt durch, statt hineinzugehen.
 *  2. ZUG ABGELEHNT (vs:round mit defaultPrevented): ein einzelner tiefer
 *     Anschlag. START wird gedrückt, aber es passiert nichts.
 *  3. START IN DER RISIKO-LEITER: bleibt STUMM. risk.js fängt vs:round in der
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
 * WARUM vs:round AM DOKUMENT UND IN DER BLASENPHASE
 * -------------------------------------------------
 * Ein Zuhörer am Gehäuse sähe defaultPrevented im selben Takt noch als false:
 * video-slot.js baut das Klangpult als ERSTES (siehe dort, bindMachines()),
 * sein Zuhörer läuft also VOR dem der Kasse, die preventDefault() ruft. Am
 * Dokument in der Blasenphase ist die ganze Reise durch das Gehäuse vorbei;
 * dort steht die Absage fest. Es ist der ZWEITE Zuhörer dieses Ereignisses am
 * Dokument — risk.js hat den ersten, in der Erfassungsphase.
 *
 *
 * WARUM DER STARTKLANG AN vs:state HÄNGT UND NICHT AN vs:round
 * --------------------------------------------------------------
 * vs:round ist abbrechbar und wird auch dann gefeuert, wenn die Runde NICHT
 * zustande kommt: bei zu geringem Guthaben ruft die Kasse preventDefault(),
 * aber kein stopPropagation() — ein Zuhörer am Gehäuse sähe das Ereignis also
 * trotzdem, und defaultPrevented ist im selben Takt noch false (in Phase 9
 * gemessen). Ein Startklang bei abgelehntem Zug wäre eine Lüge. vs:state mit
 * to === 'spinning' kommt dagegen genau einmal je wirklich zustande gekommener
 * Runde — bei einem Tastendruck auf START wie beim vs:spin des Auto-Modus.
 *
 *
 * WARUM DIE AUSZAHLUNG HINTER DEM JINGLE LIEGT
 * --------------------------------------------
 * Im Auto-Modus fallen vs:result und vs:collect in denselben Takt: die
 * Risiko-Leiter wird dort abgebrochen, die Kasse löst den Anspruch sofort ein.
 * Zwei Klänge exakt übereinander sind genau die Überlagerung, die CONCEPT.md
 * Phase 10 ausschließt. Deshalb merkt sich diese Datei die Kontextzeit, zu der
 * der Jingle endet, und legt die Münzkaskade dahinter. Web Audio plant
 * sample-genau in die Zukunft; das kostet keinen Zeitgeber.
 *
 *
 * DAS LAUFGERÄUSCH IST DER EINZIGE ZEITGEBER DIESER DATEI
 * ---------------------------------------------------
 * (Der zweite Zeitgeber im Spiel, der für Relaisklick und Ticken, gehört
 * IdleNoise und wird dort gespannt und dort gelöscht.)
 * Es gibt kein Ereignis je durchlaufender Rasterposition, und es soll auch
 * keines geben — der Spielkern wird für den Klang nicht geändert. Also läuft
 * ein sich selbst neu spannender setTimeout mit RUN_MS, solange der
 * Automat in 'spinning' oder 'stopping' steht. Höchstens EINER je Gerät;
 * gelöscht wird beim Zustandswechsel, beim Verstecken des Fensters und beim
 * Verlassen der Seite.
 *
 *
 * VERSTECKTES FENSTER
 * -------------------
 * Ein verstecktes Fenster hält die Zeichenschleife der Walzen an, drosselt
 * setTimeout aber nur. Ohne Gegenmaßnahme liefe ein Hintergrund-Tab
 * hörbar weiter, während sich nichts bewegt. Deshalb: bei 'hidden' das
 * Laufgeräusch löschen und alle Stimmen abbrechen, bei der Rückkehr nur dann wieder
 * anwerfen, wenn der Automat noch läuft.
 *
 *
 * ZWEI AUTOMATEN AUF EINER SEITE
 * ------------------------------
 * Sie teilen sich EINEN AudioContext (Begründung im Kopf des Moduls in
 * casino_startpage). Deshalb beendet destroy() hier nur den eigenen
 * Zeitgeber und die eigenen Zuhörer und bricht KEINE Stimmen ab — das
 * schnitte dem anderen Gerät den Ton ab. Das seitenweite Abschalten macht
 * shutdownSound() genau einmal, aus video-slot.js.
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
 * Abstand zweier Laufgeräusche, in Millisekunden.
 *
 * 60 statt der 85 des Reel Slot. Dort rastet ein mechanisches Werk; hier
 * wandert Licht durch ein Fenster. Dichter, trockener, deutlich leiser — das
 * ist der hörbare Unterschied zwischen einem Werk und einer Anzeige, und er
 * kommt ohne eine einzige Melodie aus (CONCEPT.md B.3 Nr. 11: im Zweifel
 * Geräusch statt Melodie).
 */
const RUN_MS = 60;

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
 * nächsten Tastendruck auf START. Genau dann soll es wieder hörbar leben.
 */
const BUSY_STATES = Object.freeze(['spinning', 'stopping', 'evaluating']);

/**
 * Die vier Stufen des Gewinn-Jingles, nach dem FAKTOR aus paytable.js.
 *
 * Die Schnitte folgen dem Bau der Tabelle (Anhang D), nicht denen des Reel
 * Slot — dessen Tabelle ist eine andere:
 *   1 … 4     Kirschenpaar (1), Kirschen-Dreier (2), Zitronen-Dreier (3),
 *             Scatter-Dreier (3) — die häufigen Zeilen
 *   5 … 17    die Dreiertreffer der übrigen Früchte
 *   18 … 99   Glocke aufwärts und die Vierertreffer der Früchte
 *   ab 100    Glocke×4 (100), Sieben×4 (180), jeder Fünfertreffer
 *
 * Die Trefferhäufigkeit liegt bei 0,192662 je Runde (README, „Walzenbänder
 * und Quote"); die unterste Stufe ist damit der bei Weitem häufigste Klang
 * und muss entsprechend zurückhaltend sein.
 */
const WIN_TIERS = Object.freeze([
	Object.freeze({ from: 100, id: 'jackpot' }),
	Object.freeze({ from: 18, id: 'gross' }),
	Object.freeze({ from: 5, id: 'mittel' }),
	Object.freeze({ from: 1, id: 'klein' }),
]);

/** Ein weicher Tiefpass nimmt dem Rechteck die Schärfe, ohne ihm das Piepsige zu nehmen. */
const SOFT = Object.freeze({ type: 'lowpass', freq: 5200, q: 0.7 });

/**
 * Grundton der Zählleiter in Hertz.
 *
 * 880 Hz ist a''. Er liegt über dem Laufgeräusch (196 Hz Ton, 2600 Hz
 * Rauschband) und unter dem Klimpern einer Münze (2100 Hz), also in der
 * einen Lücke, die im Klangbild dieses Geräts frei ist — und einen Ganzton
 * über dem Grundton des Reel Slot, wie die Jingles auch. WELCHER Grundton,
 * entscheidet laut Baukasten das Gerät; die Leiter darauf baut sound-kit.js
 * pentatonisch.
 */
const COUNT_BASE = 880;

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

		// Fehlt der Schalter, klingt der Automat trotzdem – er ist dann nur
		// nicht abschaltbar. Gleiche Haltung wie findNixieGroup() in nixie.js:
		// ein fehlendes Bedienteil legt kein Gerät still.
		this.button = cabinet.querySelector('[data-vs-sound]');

		/** Kennung des Klapper-Zeitgebers, oder 0. Immer höchstens einer. */
		this.runTimer = 0;

		/** Laufen die Walzen gerade? */
		this.running = false;

		/** Arbeitet der Spielkern gerade? Aus vs:state. */
		this.machineBusy = false;

		/** Läuft die Risiko-Leiter gerade? Aus vs:risk. */
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

		this.runStep = () => this.runTick();

		// Die Nutzergeste, an der die Autoplay-Sperre hängt. Erfassungsphase,
		// damit sie vor allem anderen läuft.
		//
		// ZWEI Wege, nicht einer: dieses Gerät ist vollständig mit der
		// Tastatur bedienbar (CONCEPT.md B.1), und eine per Enter oder
		// Leertaste ausgelöste Taste feuert KEIN pointerdown. Ein Spieler,
		// der nur die Tastatur benutzt, bliebe sonst dauerhaft ohne Ton.
		//
		// event.isTrusted ist in beiden Fällen die entscheidende Zeile: ein
		// nachgemachtes Ereignis erteilt in Chromium KEINE Nutzeraktivierung.
		// Ginge es hier trotzdem als Geste durch, entstünde ein Kontext ohne
		// Aktivierung — und genau das ist die Konsolenwarnung, die diese
		// Phase vermeiden soll.
		this.listen(root, 'pointerdown', (event) => this.onGesture(event), true);
		this.listen(root, 'click', (event) => this.onGesture(event), true);

		this.listen(root, 'vs:state', (event) => this.onState(event));
		this.listen(root, 'vs:reelrest', (event) => this.onReelRest(event));
		this.listen(root, 'vs:result', (event) => this.onResult(event));
		this.listen(root, 'vs:collect', (event) => this.onCollect(event));
		this.listen(root, 'vs:count', (event) => this.onCount(event));
		this.listen(root, 'vs:coin', (event) => this.onCoin(event));
		this.listen(root, 'vs:cashout', (event) => this.onCashOut(event));
		this.listen(root, 'vs:risk', (event) => this.onRisk(event));
		this.listen(root, 'vs:risktick', (event) => this.onRiskTick(event));
		this.listen(root, 'vs:auto', (event) => this.onAuto(event));

		// Am DOKUMENT und in der BLASENPHASE, nicht am Gehäuse: nur dort steht
		// defaultPrevented schon fest. Begründung im Dateikopf.
		this.listen(root.ownerDocument, 'vs:round', (event) => this.onRoundRefused(event));

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
		// Übereinstimmung — auch dann, wenn dort vs-sound--on steht und der
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

		// Jede echte Bedienung — Zeiger oder Tastatur — bringt auch die
		// Messwerte am Gehäuse auf Stand. Das ist der Griff, mit dem ein
		// Prüfskript die Zähler abfragen kann, ohne den Spielablauf anzufassen.
		this.syncAttributes();
	}

	/**
	 * Zustandswechsel des Automaten.
	 *
	 * @param {CustomEvent} event vs:state
	 * @returns {void}
	 */
	onState(event) {
		const to = String(event.detail?.to ?? '');
		this.running = RUNNING_STATES.includes(to);
		this.machineBusy = BUSY_STATES.includes(to);
		this.updateBusy();

		if (to === 'spinning') {
			// Der Startklang dieses Geräts: ein Relais zieht an, dann läuft
			// die Anzeige HOCH. Am Reel Slot fällt der Ton, weil dort ein
			// mechanisches Werk einrastet; hier ist es der umgekehrte
			// Vorgang, und genau daran sind die beiden Geräte hörbar
			// auseinanderzuhalten.
			sound.sequence({
				key: 'start',
				minGap: 0.15,
				noises: [{ duration: 0.05, attack: 0.0008, gain: 0.28, filter: { type: 'bandpass', freq: 1900, q: 1.4 } }],
				tones: [{ type: 'square', freq: 180, freqEnd: 260, duration: 0.11, attack: 0.002, gain: 0.20, filter: { type: 'lowpass', freq: 1100, q: 0.7 } }],
			});
			this.startRunning();
		} else if (to === 'evaluating') {
			this.stopRunning();
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
	 * @param {CustomEvent} event vs:reelrest
	 * @returns {void}
	 */
	onReelRest(event) {
		const index = Number(event.detail?.reel);
		const slot = Number.isInteger(index) && index >= 1 && index <= 5 ? index : 1;
		const start = [360, 330, 300, 275, 250][slot - 1];
		const end = [160, 150, 140, 130, 120][slot - 1];

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
	 * @param {CustomEvent} event vs:result
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
			// Wie am Reel Slot ist der kleine Gewinn KEIN Tonfolgen-Jingle,
			// sondern eine ausgeworfene Münze aus dem Baukasten — eine größere
			// Münze, die in eine Schale fällt und ausrollt. Zwei verschiedene
			// Münzklänge in einem Haus wären genau das, was der Baukasten
			// verhindern soll; dieser hier ist der freigegebene Klang des
			// Hauses, an keiner Stelle neu erfunden.
			//
			// pitch 0.5      halb so hoch wie eine Einwurfmünze: es ist eine
			//                andere, größere Münze — die, die HERAUSKOMMT
			// body 0.85      der Behälter klingt tiefer als der Einwurfschacht
			// roll 0.9       sie fällt in eine SCHALE und rollt aus. Genau das
			//                unterscheidet den Gewinn vom Einwurf, bei dem die
			//                Münze in einem Schacht verschwindet
			// gain 0.9       etwas leiser als eine Einwurfmünze. Dieser Klang
			//                ist bei Weitem der häufigste (Trefferhäufigkeit
			//                0,192662 je Runde, README „Walzenbänder und
			//                Quote") und muss entsprechend zurückhaltend sein
			return coin({ key, minGap, pitch: 0.5, body: 0.85, roll: 0.9, gain: 0.9 });
		}

		if (tier === 'mittel') {
			return sound.sequence({
				key,
				minGap,
				tones: [
					{ type: 'square', freq: 740, at: 0, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 988, at: 0.08, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 1175, at: 0.16, duration: 0.08, gain: 0.17, filter: SOFT },
					{ type: 'square', freq: 1480, at: 0.24, duration: 0.18, gain: 0.17, filter: SOFT },
				],
			});
		}

		if (tier === 'gross') {
			return sound.sequence({
				key,
				minGap,
				tones: [
					{ type: 'square', freq: 587, at: 0, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 740, at: 0.09, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 880, at: 0.18, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1175, at: 0.27, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1480, at: 0.36, duration: 0.09, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1760, at: 0.45, duration: 0.34, gain: 0.18, filter: SOFT },
				],
				noises: [{ at: 0.45, duration: 0.22, gain: 0.05, filter: { type: 'highpass', freq: 6000, q: 0.7 } }],
			});
		}

		// Jackpot: Lauf, drei Schläge, ein gehaltener Ton. Rund 1,5 Sekunden —
		// der höchste Gewinn dieses Geräts (5× Sieben auf einer Linie, Faktor
		// 900, 1 zu 976.563, README „Walzenbänder und Quote").
		return sound.sequence({
			key,
			minGap,
			tones: [
				{ type: 'square', freq: 587, at: 0, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 740, at: 0.09, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 880, at: 0.18, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1175, at: 0.27, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1480, at: 0.36, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 1760, at: 0.45, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2349, at: 0.54, duration: 0.09, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2349, at: 0.66, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2349, at: 0.80, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2349, at: 0.94, duration: 0.08, gain: 0.18, filter: SOFT },
				{ type: 'square', freq: 2349, at: 1.08, duration: 0.45, gain: 0.20, filter: SOFT },
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
	 * @param {CustomEvent} event vs:collect
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
	 * @param {CustomEvent} event vs:coin
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
	 * (Start, Schale, Münzen), und eine absteigende Tonfolge obendrauf klänge
	 * nach Verlust, wo gar keiner ist. B.7 verlangt die Tonfolge ausdrücklich
	 * „beim HOCHZÄHLEN eines Gewinns".
	 *
	 * Ein Aufruf JE SCHRITT, nicht eine Folge im Voraus: die Fahrt darf
	 * unterwegs ein neues Ziel bekommen (counter.js, ramp()), und eine
	 * vorausgeplante Folge ginge dann falsch und hielte außerdem alle
	 * Stimmenplätze vom Augenblick des Planens an besetzt.
	 *
	 * @param {CustomEvent} event vs:count
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
	 * @param {CustomEvent} event vs:cashout
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
	 * kommen die vs:round ALLER Gehäuse dieser Seite an. Ohne sie antwortete
	 * jeder Automat auf die abgelehnte Runde jedes anderen.
	 *
	 * ABSAGE 2 VON 2: ein einzelner tiefer Anschlag. Metall, weil im Inneren ein
	 * Relais gegen einen Anschlag läuft; tief (pitch 0.45), weil nichts in
	 * Gang kommt. Er darf keinem Gewinnklang ähneln — deshalb kein zweiter Ton
	 * und kein Aufwärtsintervall.
	 *
	 * @param {CustomEvent} event vs:round
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
	 * @param {CustomEvent} event vs:risk
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
					{ type: 'square', freq: 880, at: 0, duration: 0.07, gain: 0.18, filter: SOFT },
					{ type: 'square', freq: 1480, at: 0.07, duration: 0.13, gain: 0.18, filter: SOFT },
				],
			});
			return;
		}

		if (phase === 'miss') {
			sound.sequence({
				key: 'riskmiss',
				minGap: 0.30,
				tones: [{ type: 'sawtooth', freq: 300, freqEnd: 70, at: 0, duration: 0.45, attack: 0.004, gain: 0.20, filter: { type: 'lowpass', freq: 900, q: 1 } }],
				noises: [{ at: 0, duration: 0.18, gain: 0.10, filter: { type: 'bandpass', freq: 340, q: 1 } }],
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
	 * @param {CustomEvent} event vs:risktick
	 * @returns {void}
	 */
	onRiskTick(event) {
		if (event.detail?.on !== true) {
			return;
		}
		const freq = event.detail?.lit === 'right' ? 1480 : 1245;
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
	 * @param {CustomEvent} event vs:auto
	 * @returns {void}
	 */
	onAuto(event) {
		const on = event.detail?.on === true;
		sound.sequence({
			key: 'auto',
			minGap: 0.10,
			noises: [{ duration: 0.012, attack: 0.0005, gain: 0.20, filter: { type: 'bandpass', freq: 2400, q: 2 } }],
			tones: [{ type: 'square', freq: on ? 260 : 190, duration: 0.05, attack: 0.001, gain: 0.16, filter: { type: 'lowpass', freq: 1200, q: 0.7 } }],
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
					{ type: 'square', freq: 1480, at: 0.06, duration: 0.09, gain: 0.12, filter: SOFT },
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
			this.stopRunning();

			// ZUERST stopAll(): es blendet auch Dauerklänge in 12 ms aus und
			// erwischt damit das Brummen zusammen mit allem anderen.
			sound.stopAll();

			// DANN idle.stop(): der Griff ist jetzt tot, es bleibt der eigene
			// ZEITGEBER. Der ist der eigentliche Grund für diese Zeile —
			// setTimeout wird in einem versteckten Tab nur gedrosselt, nicht
			// angehalten, und ein Relaisklick alle paar Sekunden aus einem
			// Fenster, in dem sich nichts bewegt, ist genau das, was schon beim
			// Reel Slot für sein Laufgeräusch abgestellt werden musste.
			this.idle.stop();
			return;
		}
		if (this.running) {
			this.startRunning();
		}

		// Beliebig oft aufrufbar: legt das Brummen neu an, wenn es abgebrochen
		// wurde, und tut nichts, wenn keine Geste vorlag oder der Ton aus ist.
		this.idle.start();
		this.syncAttributes();
	}

	/**
	 * Startet das Laufgeräusch, falls es nicht schon läuft.
	 *
	 * Der erste Ton kommt erst nach RUN_MS: der Startklang deckt den
	 * Augenblick des Anlaufens bereits ab.
	 *
	 * @returns {void}
	 */
	startRunning() {
		if (this.runTimer !== 0 || !sound.enabled) {
			return;
		}
		this.runTimer = globalThis.setTimeout(this.runStep, RUN_MS);
	}

	/**
	 * Ein Ton des Laufgeräuschs, dann der nächste.
	 *
	 * Die Abspielrate schwankt bei jedem Ton leicht. Ohne diese Streuung
	 * klänge eine gleichmäßig wandernde Anzeige nach einem Metronom statt
	 * nach einer Anzeige.
	 *
	 * @returns {void}
	 */
	runTick() {
		this.runTimer = 0;
		if (!this.running) {
			return;
		}
		const swing = 0.9 + Math.random() * 0.2;
		sound.sequence({
			key: 'run',
			minGap: 0.04,
			noises: [{
				duration: 0.010,
				attack: 0.0005,
				gain: 0.040,
				rate: swing,
				filter: { type: 'bandpass', freq: 2600, q: 2.2 },
			}],
			tones: [{
				type: 'square',
				freq: 196 * swing,
				duration: 0.014,
				attack: 0.0008,
				gain: 0.034,
				filter: { type: 'lowpass', freq: 900, q: 0.8 },
			}],
		});
		this.runTimer = globalThis.setTimeout(this.runStep, RUN_MS);
	}

	/** Hält das Laufgeräusch an. Gefahrlos aufrufbar, auch wenn keines läuft. */
	stopRunning() {
		if (this.runTimer !== 0) {
			globalThis.clearTimeout(this.runTimer);
			this.runTimer = 0;
		}
	}

	/**
	 * Bringt den Schalter mit dem gespeicherten Zustand in Übereinstimmung.
	 *
	 * @param {{enabled: boolean, reason: string}} detail
	 * @returns {void}
	 */
	paint(detail) {
		const on = detail.enabled === true;
		this.button?.classList.toggle('vs-sound--on', on);
		// Das Markup dieses Geräts drückt den Schalterstand über aria-pressed
		// aus. Ohne diese Zeile bliebe er für ein Hilfsmittel für immer „an",
		// auch wenn der Ton aus ist — und auch dann, wenn eine andere
		// Registerkarte abgeschaltet hat (reason 'remote').
		this.button?.setAttribute('aria-pressed', on ? 'true' : 'false');

		if (detail.enabled !== true) {
			this.stopRunning();
			// Der Ton-Schalter schaltet ALLES ab, Leerlaufgeräusche
			// eingeschlossen. sound.disable() hat das Brummen schon
			// ausgeblendet (stopAllVoices räumt Dauerklänge mit ab); hier geht
			// zusätzlich der Zeitgeber weg, der sonst weiter ins Leere feuerte.
			// reason kann auch 'remote' sein — dann hat eine andere
			// Registerkarte abgeschaltet, und diese hier verstummt mit.
			this.idle.stop();
		} else {
			if (this.running) {
				this.startRunning();
			}
			this.idle.start();
		}

		this.syncAttributes();
	}

	/**
	 * Schreibt den Zustand als data-Attribute ans Gehäuse.
	 *
	 * Gleiche Absicht wie data-vs-round (P6), data-vs-risk-* (dieser Phase) und
	 * data-vs-auto-* (dieser Phase): der Zustand ist von außen ablesbar, und der
	 * Nachweis ist ein DOM-Lesevorgang statt einer Glaubensfrage. Beim Klang
	 * ist das besonders wichtig, weil sich ein Ton nicht ansehen lässt.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const stats = sound.stats();
		const data = this.root.dataset;
		data.vsSoundState = stats.enabled ? 'on' : 'off';
		data.vsSoundContext = stats.contextState;
		data.vsSoundPlayed = String(stats.startedVoices);
		data.vsSoundPeakVoices = String(stats.peakVoices);
		data.vsSoundDropped = String(stats.droppedVoices);
		data.vsSoundGap = String(stats.gapDrops);
		data.vsSoundLevel = stats.peakLevel.toFixed(3);

		// Dauerklänge stehen GETRENNT von den Stimmen, weil sie einer anderen
		// Sperre unterliegen (MAX_SUSTAINED statt MAX_VOICES). Eine gemeinsame
		// Zahl machte beide Aussagen wertlos. -sustained ist zugleich die
		// Leckprüfung: nach dem Abräumen muss dort 0 stehen.
		data.vsSoundSustained = String(stats.sustainedVoices);
		data.vsSoundSustainDropped = String(stats.droppedSustained);

		data.vsSoundKeys = JSON.stringify(stats.byKey);
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
		this.stopRunning();
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
		// bliebe data-vs-sound-sustained auf „1" stehen, obwohl das Brummen
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
 * hier und nicht in video-slot.js, damit die Einstiegsdatei kein Modul einer
 * anderen Extension importieren muss.
 *
 * @returns {void}
 */
export function shutdownSound() {
	sound.shutdown();
}

export default MachineSound;
