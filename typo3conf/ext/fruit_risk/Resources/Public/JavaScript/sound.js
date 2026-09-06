/**
 * FruitRisk – der Klang des Geräts
 * ================================================
 *
 * Hier steht, WELCHER Klang zu WELCHEM Ereignis gehört. Die Klangerzeugung
 * selbst steht in casino_startpage und weiß von diesem Automaten nichts
 * (CONCEPT.md Abschnitt 5, Grundsatz 5).
 *
 *
 * SIE FASST DEN SPIELKERN NICHT AN
 * --------------------------------
 * Kein Import von Machine, Wallet, RiskPanel oder AutoPlay. Verbunden wird
 * ausschließlich über die DOM-Ereignisse am .fr-machine, die machine.js,
 * wallet.js, risk.js und auto.js dieses Geräts dafür gebaut haben. Diese
 * Datei HÖRT NUR ZU; sie ändert keinen Zustand des Spiels, bricht kein
 * Ereignis ab und ruft keine Methode eines anderen Moduls.
 *
 *   fr:state       to === 'spinning'  → Startklang, Laufgeräusch beginnt
 *                  BUSY_STATES        → Leerlaufgeräusche treten zurück
 *   fr:reelrest    → Walzenstopp, sechs STEIGENDE Tonhöhen
 *   fr:result      → Gewinn-Jingle, nach vier Betragsstufen gestaffelt
 *   fr:collect     → Münzkaskade, nach Betrag gestaffelt
 *   fr:count       → ein Zählschritt, NUR für die Anzeige "guthaben"
 *   fr:coin        reason 'ok' → Münzeinwurf, sonst die zurückgegebene Münze
 *   fr:cashout     moved > 0 → Schale und Münzen
 *   fr:risk        phase 'offer' → KEIN Klang; 'hit'/'miss' → Treffer/Verlust;
 *                  'start' → Leerlauf tritt zurück, 'miss'/'collect'/'end' → zurück
 *   fr:risktick    → Blinkton, Tonhöhe je Leiter bzw. je Taste (risk8)
 *   fr:auto        → Schaltklang, Richtung nach Zustand
 *   fr:round       am DOKUMENT, Blasenphase, defaultPrevented → hörbare Absage
 *
 *
 * WARUM DIESE DATEI NICHT AUS video_slot KOPIERT WIRD (CONCEPT.md C.14.11,
 * B.3 Nummer 11) — DER WICHTIGSTE UNTERSCHIED DIESES GERÄTS
 * -------------------------------------------------------------------------
 * Ein kopierter Klang machte zwei Geräte ununterscheidbar. Die
 * Klangzuordnung IST die Stimme eines Automaten, und diese Stimme ist hier
 * neu erfunden. Am fünf-Walzen-Gerät FALLEN die Walzenstopps in der Tonhöhe
 * (Dreieckstöne); HIER STEIGEN sechs Rechteckstöne in ganztönigen Schritten
 * (262–466 Hz). Ein Zuhörer erkennt an der Richtung, welches Gerät läuft.
 * Dieselbe Ganztonleiter trägt auch den Gewinn-Jingle — eine Ganztonleiter
 * hat keinen Grundton und keine Kadenz, sie ist Geräusch mit Ordnung, keine
 * Melodie (B.3 Nummer 11: "im Zweifel Geräusch statt Melodie"). Die
 * gerätunabhängigen Geräusche (Münze, Kaskade, Metall, Blech, Klinke,
 * Registrierkasse, Zählschritt) kommen aus dem geteilten Baukasten
 * (sound-kit.js) — sie sollen in diesem Haus überall gleich klingen —, alles
 * Übrige ist neu erfunden.
 *
 *
 * DREI EBENEN, NICHT ZWEI
 * -----------------------
 *   sound.js im Site Package   WIE ein Klang entsteht. Kennt keinen Klang.
 *   sound-kit.js                WIE EINE MÜNZE KLINGT. Kennt kein Gerät.
 *   diese Datei                 WANN eine Münze klingt. Kennt beides.
 *
 *
 * DIE DREI RISIKOSPIELE HABEN JE EINEN EIGENEN TICK, UND risk8 VIER
 * ------------------------------------------------------------------
 * risk.js meldet fr:risktick mit einer NUMERISCHEN Position (0 … sides−1,
 * risk-ladder-multi.js) statt einer Zeichenkette 'left'/'right' wie die alte
 * Leiter. Die Reihenfolge der Positionen ist der Reihenfolge der Tasten in
 * risk.js::GROUPS entnommen — dort dokumentiert als "links, rechts, oben,
 * unten" (CONCEPT.md C.14.9) — und hier als feste Zahlenfolge nachgebildet,
 * OHNE risk.js zu importieren: das wäre eine Kopplung an den Spielkern, die
 * diese Datei ausdrücklich nicht eingeht. Die Übersetzung Zahl → Name ist
 * damit Teil des Ereignisvertrags, nicht des Codes von risk.js.
 *
 *
 * WARUM fr:risk PHASE 'offer' STUMM BLEIBT
 * -----------------------------------------
 * Weil an diesem Gerät JEDE Runde einen Gewinn bringt (Gewinngarantie,
 * C.14.7), käme dieser Klang in jeder einzigen Runde — und würde zu einem
 * Dauerton, der nichts mehr ankündigt.
 *
 *
 * WARUM DER STARTKLANG AN fr:state HÄNGT UND NICHT AN fr:round
 * ---------------------------------------------------------------
 * fr:round ist abbrechbar und wird auch dann gefeuert, wenn die Runde NICHT
 * zustande kommt (zu geringer Gerätekredit). Ein Startklang bei abgelehntem
 * Zug wäre eine Lüge. fr:state mit to === 'spinning' kommt dagegen genau
 * einmal je wirklich zustande gekommener Runde — bei einem Tastendruck auf
 * START wie beim fr:spin des Auto-Modus.
 *
 *
 * WARUM fr:round AM DOKUMENT UND IN DER BLASENPHASE ABGEHÖRT WIRD
 * -------------------------------------------------------------------
 * Ein Zuhörer am Gehäuse sähe defaultPrevented im selben Takt noch als
 * false: wallet.js ruft preventDefault() in seinem eigenen Zuhörer, der vor
 * dieser Datei angemeldet wird. Am Dokument in der Blasenphase ist die ganze
 * Reise durch das Gehäuse vorbei; dort steht die Absage fest. risk.js hat den
 * ERSTEN Zuhörer dieses Ereignisses am Dokument, in der ERFASSUNGSPHASE mit
 * stopPropagation() — währenddessen bleibt diese Datei deshalb folgerichtig
 * stumm, dieselbe dritte, stumme Absage wie am Nachbargerät.
 *
 *
 * DIE LEERLAUFGERÄUSCHE GEHÖREN DIESEM GEHÄUSE
 * --------------------------------------------
 * Brummen, Relaisklick und Ticken kommen aus IdleNoise, einer Instanz JE
 * GEHÄUSE. Sie schweigen vollständig, solange das Gerät ARBEITET — und das
 * kommt aus ZWEI Quellen: dem Rundenzustand (BUSY_STATES) und einer
 * laufenden Risiko-Leiter (riskBusy, aus fr:risk 'start'/'miss'/'collect'/
 * 'end'). Beide zusammen, nicht abwechselnd. Das ist die eine Ausnahme von
 * der Regel "destroy() bricht keinen Klang ab": der Kontext gehört der
 * Seite, dieser Dauerklang aber gehört diesem Gerät.
 *
 *
 * DAS LAUFGERÄUSCH IST DER EINZIGE ZEITGEBER DIESER DATEI
 * ---------------------------------------------------------
 * (Der zweite Zeitgeber im Spiel, der für Relaisklick und Ticken, gehört
 * IdleNoise und wird dort gespannt und dort gelöscht.) Es gibt kein
 * Ereignis je durchlaufender Rasterposition — ein sich selbst neu
 * spannender setTimeout läuft, solange der Automat in 'spinning' oder
 * 'stopping' steht. Höchstens EINER je Gerät; gelöscht bei Zustandswechsel,
 * beim Verstecken des Fensters und beim Verlassen der Seite.
 *
 *
 * VOR DER ERSTEN ECHTEN NUTZERGESTE ENTSTEHT KEIN AudioContext
 * ----------------------------------------------------------------
 * Das ist keine Höflichkeit, sondern eine Zusage aus B.7 und ein
 * Fertig-Kriterium dieser Phase. Der Kontext wird ERST in sound.unlock()
 * angelegt, unlock() wird NUR aus einem Zuhörer für ein Ereignis mit
 * event.isTrusted === true gerufen, und DER TASTATURWEG SCHALTET EBENSO
 * FREI WIE DER ZEIGER: pointerdown, keydown und click sind alle drei
 * angemeldete Auslöser, in der ERFASSUNGSPHASE am Gehäuse. Ein
 * nachgemachtes Ereignis erteilt keine Aktivierung, und jeder Klangaufruf
 * liefert davor still 0.
 *
 *
 * DER TON-SCHALTER BLEIBT BEIM AUSSCHALTEN STUMM
 * -------------------------------------------------
 * sound.disable() blendet laufende Stimmen sofort aus. Ein Klick, der
 * unmittelbar danach käme, würde abgeschnitten; einer davor müsste künstlich
 * vorgezogen werden. Die eintretende Stille IST die Rückmeldung, und die
 * sichtbare Lampe am Schalter ist die zweite (→ DECISIONS.md).
 *
 *
 * ZWEI AUTOMATEN AUF EINER SEITE
 * ------------------------------
 * Sie teilen sich EINEN AudioContext (Begründung im Kopf des Moduls in
 * casino_startpage). destroy() hier beendet nur den eigenen Zeitgeber, die
 * eigenen Zuhörer und das eigene Brummen — es bricht KEINE fremden Stimmen
 * ab. Das seitenweite Abschalten macht shutdownSound() genau einmal, aus
 * fruit-risk.js.
 *
 *
 * DER SPEICHER
 * ------------
 * Diese Datei fasst den Browserspeicher NICHT an. Die Ton-Einstellung
 * gehört dem Modul in casino_startpage, genauso wie das Guthaben.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Ton-Schalter trägt
 * seine Beschriftung aus der Sprachdatei über das Markup.
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
 * 52 ms — ein eigener Wert für dieses Gerät, weder die 60 ms des Video Slot
 * noch die 85 ms des Reel Slot. Drei verschiedene Zahlen für dasselbe
 * Grundgeräusch sind Absicht: jedes Gerät hat sein eigenes Tempo.
 */
const RUN_MS = 52;

/** Rundenzustände, in denen die Walzen laufen. */
const RUNNING_STATES = Object.freeze(['spinning', 'stopping']);

/**
 * Rundenzustände, in denen das Gerät ARBEITET.
 *
 * 'offer' steht bewusst NICHT drin: an diesem Gerät ist das Angebot der
 * Ruhezustand nach einer Runde (machine.js, C.14.7) — genau dann soll das
 * Gerät wieder hörbar leben, nicht erst danach.
 */
const BUSY_STATES = Object.freeze(['spinning', 'stopping', 'evaluating']);

/**
 * Die vier Stufen des Gewinn-Jingles, absteigend nach Schwelle geordnet
 * (CONCEPT.md-Vorgabe dieser Phase, F5d-Klangtabelle): 1–3 → zwei Töne,
 * 4–9 → drei, 10–39 → vier, ab 40 → fünf. Reine Klangentscheidung, keine
 * Spielregel — sie steht deshalb hier und nicht in Classes/Rules.php.
 */
const WIN_TIERS = Object.freeze([
	Object.freeze({ from: 40, tones: 5 }),
	Object.freeze({ from: 10, tones: 4 }),
	Object.freeze({ from: 4, tones: 3 }),
	Object.freeze({ from: 1, tones: 2 }),
]);

/** Grundton des Gewinn-Jingles, in Hertz. */
const JINGLE_BASE = 392;

/**
 * Ein Ganzton im gleichstufigen System: zwei Halbtonschritte.
 * 392 → 439,8 → 493,3 → 553,4 → 620,9 Hz — dieselbe Bauform wie die sechs
 * steigenden Walzenstopps, nur mit anderem Grundton und anderer Schrittzahl.
 */
const WHOLE_TONE = 2 ** (2 / 12);

/** Ein weicher Tiefpass nimmt dem Rechteck die Schärfe, ohne das Piepsige zu nehmen. */
const SOFT = Object.freeze({ type: 'lowpass', freq: 5200, q: 0.7 });

/**
 * Die sechs Walzenstopps, STEIGEND — der hörbare Unterschied zu video_slot
 * (dort fallend). Eine Ganztonleiter aufwärts: 262 (c'), 294 (d'), 330 (e'),
 * 370 (f#'), 415 (g#'), 466 Hz (a#') — sechs gleich große Schritte, kein
 * Grundton, keine Kadenz.
 */
const STOP_FREQ = Object.freeze([262, 294, 330, 370, 415, 466]);

/**
 * Die Reihenfolge der Positionen einer risk8-Leiter — siehe Dateikopf,
 * "DIE DREI RISIKOSPIELE HABEN JE EINEN EIGENEN TICK". Index = risk.js'
 * numerisches lit (0…3); Name nur für den Klangschlüssel, Frequenz für die
 * vier unterscheidbaren Tonhöhen.
 */
const RISK8_POSITIONS = Object.freeze([
	Object.freeze({ name: 'left', freq: 392 }),
	Object.freeze({ name: 'right', freq: 494 }),
	Object.freeze({ name: 'up', freq: 587 }),
	Object.freeze({ name: 'down', freq: 698 }),
]);

/**
 * Die einzige Anzeige, deren Fahrt klingt (F5d-Klangtabelle: "nur Anzeige
 * guthaben"). GEWINN und STUFE fahren an diesem Gerät ebenfalls (risk.js),
 * aber ein Zählklang neben den eigenen Leiterklängen wäre zu viel auf
 * einmal — das ist eine Klangentscheidung dieser Datei, keine technische
 * Notwendigkeit.
 */
const COUNT_DISPLAY = 'guthaben';

/**
 * Der Klang eines Gehäuses.
 */
export class MachineSound {
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

		// Fehlt der Schalter, klingt der Automat trotzdem – er ist dann nur
		// nicht abschaltbar. Gleiche Haltung wie findNixieGroup() in nixie.js:
		// ein fehlendes Bedienteil legt kein Gerät still.
		this.button = cabinet.querySelector('[data-fr-sound]');

		/** Kennung des Klapper-Zeitgebers, oder 0. Immer höchstens einer. */
		this.runTimer = 0;

		/** Laufen die Walzen gerade? */
		this.running = false;

		/** Arbeitet der Spielkern gerade? Aus fr:state. */
		this.machineBusy = false;

		/** Läuft eine Risiko-Leiter gerade? Aus fr:risk. */
		this.riskBusy = false;

		/**
		 * Die Leerlaufgeräusche GENAU DIESES Gehäuses. Ohne Argumente: ein
		 * Gerät, das nichts übergibt, klingt wie ein Gerät dieses Hauses.
		 * Angelegt VOR sound.subscribe() weiter unten, denn subscribe() ruft
		 * paint() sofort einmal auf, und paint() fasst sie an.
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
		// DREI Wege, nicht zwei: dieses Gerät ist vollständig mit der
		// Tastatur bedienbar. pointerdown und click allein deckten eine
		// Bedienung ab, die den Zeiger nie berührt, nur unzuverlässig ab —
		// keydown macht den Tastaturweg zu einem eigenständigen, jederzeit
		// wirksamen dritten Auslöser (F5d-Fertig-Kriterium).
		//
		// event.isTrusted ist in allen drei Fällen die entscheidende Zeile:
		// ein nachgemachtes Ereignis erteilt in Chromium KEINE
		// Nutzeraktivierung. Ginge es hier trotzdem als Geste durch, entstünde
		// ein Kontext ohne Aktivierung — und genau das ist die Konsolenwarnung,
		// die diese Phase vermeiden soll.
		this.listen(root, 'pointerdown', (event) => this.onGesture(event), true);
		this.listen(root, 'keydown', (event) => this.onGesture(event), true);
		this.listen(root, 'click', (event) => this.onGesture(event), true);

		this.listen(root, 'fr:state', (event) => this.onState(event));
		this.listen(root, 'fr:reelrest', (event) => this.onReelRest(event));
		this.listen(root, 'fr:result', (event) => this.onResult(event));
		this.listen(root, 'fr:collect', (event) => this.onCollect(event));
		this.listen(root, 'fr:count', (event) => this.onCount(event));
		this.listen(root, 'fr:coin', (event) => this.onCoin(event));
		this.listen(root, 'fr:cashout', (event) => this.onCashOut(event));
		this.listen(root, 'fr:risk', (event) => this.onRisk(event));
		this.listen(root, 'fr:risktick', (event) => this.onRiskTick(event));
		this.listen(root, 'fr:auto', (event) => this.onAuto(event));

		// Am DOKUMENT und in der BLASENPHASE, nicht am Gehäuse: nur dort steht
		// defaultPrevented schon fest. Begründung im Dateikopf.
		this.listen(root.ownerDocument, 'fr:round', (event) => this.onRoundRefused(event));

		this.listen(root.ownerDocument, 'visibilitychange', () => this.onVisibility());

		// click, nicht pointerdown: der Ton-Schalter hat keine Rolle im
		// Zeitverhalten des Spiels, und click ist das Ereignis, das die
		// Nutzeraktivierung zweifelsfrei erteilt (auch über die Tastatur, da
		// ein echter <button> Enter/Leertaste selbst in ein click übersetzt).
		if (this.button !== null) {
			this.listen(this.button, 'click', (event) => this.onSwitch(event));
		}

		// Die eine Anmeldung beim Schalterzustand. subscribe() ruft SOFORT
		// einmal auf und bringt damit das Markup mit dem gespeicherten Wert in
		// Übereinstimmung.
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
	 * @param {Event} event
	 * @returns {void}
	 */
	onGesture(event) {
		if (event.isTrusted !== true) {
			return;
		}
		sound.unlock();

		// Erst nach unlock(): vorher gibt es keinen AudioContext, und
		// sound.sustain() liefert dann null. start() ist genau dafür beliebig
		// oft aufrufbar.
		this.idle.start();

		this.syncAttributes();
	}

	/**
	 * Zustandswechsel des Automaten.
	 *
	 * @param {CustomEvent} event fr:state
	 * @returns {void}
	 */
	onState(event) {
		const to = String(event.detail?.to ?? '');
		this.running = RUNNING_STATES.includes(to);
		this.machineBusy = BUSY_STATES.includes(to);
		this.updateBusy();

		if (to === 'spinning') {
			// Der Startklang dieses Geräts: zwei Rechteckstöne, die anlaufen,
			// dann eine einrastende Klinke — anders aufgebaut als am
			// Nachbargerät (dort ein einzelner Ton mit Rauschstoß).
			sound.tone({
				key: 'start', minGap: 0.15, type: 'square', freq: 180, freqEnd: 240,
				duration: 0.09, attack: 0.004, gain: 0.12,
				filter: { type: 'lowpass', freq: 2600, q: 0.7 },
			});
			ratchet({ key: 'start-ratchet', minGap: 0.15, count: 3, step: 0.045 });
			this.startRunning();
		} else if (to === 'evaluating') {
			this.stopRunning();
		}

		this.syncAttributes();
	}

	/**
	 * Führt die Leerlaufgeräusche nach: schweigen sie oder nicht?
	 *
	 * ODER, nicht ENTWEDER-ODER: der Spielkern und eine Risiko-Leiter
	 * arbeiten nacheinander UND überlappend (eine Leiter läuft während des
	 * Angebots weiter, in dem der Kern längst ruht). Nur die Verknüpfung
	 * beider Merker beschreibt "das Gerät hat gerade zu tun" richtig.
	 *
	 * @returns {void}
	 */
	updateBusy() {
		this.idle.setBusy(this.machineBusy || this.riskBusy);
	}

	/**
	 * Eine Walze steht. SECHS STEIGENDE Tonhöhen — der hörbare Unterschied
	 * zu video_slot (dort fallend, Dreieckstöne). Dazu ein kurzer, hoher
	 * Blechschlag, der das Einrasten markiert.
	 *
	 * @param {CustomEvent} event fr:reelrest
	 * @returns {void}
	 */
	onReelRest(event) {
		const index = Number(event.detail?.reel);
		const slot = Number.isInteger(index) && index >= 1 && index <= STOP_FREQ.length ? index : 1;
		const freq = STOP_FREQ[slot - 1];

		sound.sequence({
			key: `stop-${slot}`,
			minGap: 0.06,
			tones: [{
				type: 'square', freq, duration: 0.07, attack: 0.002, gain: 0.11,
				filter: { type: 'lowpass', freq: 4200, q: 0.7 },
			}],
			noises: [{
				duration: 0.022, attack: 0.0008, gain: 0.05,
				filter: { type: 'bandpass', freq: 1750, q: 6 },
			}],
		});
	}

	/**
	 * Die Runde ist ausgewertet: der Gewinn-Jingle, gestaffelt nach dem
	 * erspielten Betrag (F5d-Klangtabelle: 1–3 / 4–9 / 10–39 / ab 40 Kredite).
	 * Der Betrag ist an diesem Gerät IMMER positiv (Gewinngarantie, C.14.7).
	 *
	 * @param {CustomEvent} event fr:result
	 * @returns {void}
	 */
	onResult(event) {
		const win = Number(event.detail?.win);
		if (!Number.isFinite(win) || win < 1) {
			// Baulich unerreichbar (Gewinngarantie) — trotzdem behandelt statt
			// behauptet.
			this.jingleEnd = 0;
			this.syncAttributes();
			return;
		}

		const tier = WIN_TIERS.find((candidate) => win >= candidate.from) ?? WIN_TIERS[WIN_TIERS.length - 1];
		this.jingleEnd = this.playJingle(tier.tones);
		this.syncAttributes();
	}

	/**
	 * Spielt den Jingle einer Stufe und liefert seine Endzeit in Kontextzeit.
	 *
	 * Eine STEIGENDE Ganztonleiter ab 392 Hz, je Stufe zwei bis fünf Töne,
	 * gefolgt von der Registrierkasse aus dem Baukasten. Dieselbe Bauform wie
	 * die sechs Walzenstopps — beide erzählen "es geht aufwärts", ohne dabei
	 * eine Melodie zu werden.
	 *
	 * @param {number} count 2 bis 5
	 * @returns {number}
	 */
	playJingle(count) {
		const tones = [];
		for (let i = 0; i < count; i++) {
			tones.push({
				type: 'square',
				freq: JINGLE_BASE * WHOLE_TONE ** i,
				at: i * 0.07,
				duration: 0.08,
				gain: 0.17,
				filter: SOFT,
			});
		}
		const end = sound.sequence({ key: `win-${count}`, minGap: 0.25, tones });

		// Die Registrierkasse hinter dem letzten Ton, nicht darüber — dieselbe
		// Vorkehrung wie am Video Slot gegen die Überlagerung zweier Klänge im
		// selben Augenblick (CONCEPT.md Phase 10 / B.7).
		return cashRegister({
			key: 'win-bell', minGap: 0.25,
			at: Math.max(0, end - sound.now) + 0.03,
			size: 0.8,
		});
	}

	/**
	 * Ein Gewinn ist gutgeschrieben (nach dem Angebot oder einer Leiter).
	 * NUR die Kaskade — die Registrierkasse klang bereits beim Jingle
	 * (F5d-Klangtabelle: fr:collect trägt hier keine eigene Glocke).
	 *
	 * @param {CustomEvent} event fr:collect
	 * @returns {void}
	 */
	onCollect(event) {
		const credited = Number(event.detail?.credited);
		if (!Number.isFinite(credited) || credited <= 0) {
			return;
		}
		const digits = Math.floor(Math.log10(Math.max(1, credited)));
		coinCascade({ key: 'collect-coins', minGap: 0.25, count: 3 + digits });
	}

	/**
	 * Eine Münze ist eingeworfen worden — oder eben nicht.
	 *
	 * @param {CustomEvent} event fr:coin
	 * @returns {void}
	 */
	onCoin(event) {
		const moved = Number(event.detail?.moved);

		if (event.detail?.reason === 'ok' && Number.isFinite(moved) && moved > 0) {
			coin({ key: 'coin', minGap: 0.06, roll: 0.6 });
			return;
		}

		// Die zurückgegebene Münze: tiefer, ohne Ausrollen (sie geht nirgends
		// hinein), dann ein dumpfer Anschlag als sie sichtbar zurückfällt.
		const end = coin({ key: 'coin-refused', minGap: 0.25, pitch: 0.7, body: 0.8, gain: 0.7 });
		sound.tone({
			key: 'coin-refused-thud', minGap: 0.25,
			at: Math.max(0, end - sound.now) + 0.02,
			type: 'square', freq: 120, freqEnd: 90, duration: 0.12, gain: 0.15,
			filter: { type: 'lowpass', freq: 600, q: 0.7 },
		});
	}

	/**
	 * Ein sichtbarer Schritt des GUTHABEN-Zählwerks. NUR diese Anzeige klingt
	 * (F5d-Klangtabelle) — GEWINN und STUFE fahren an diesem Gerät ebenfalls,
	 * aber ein Zählklang neben den eigenen Leiterklängen wäre zu viel.
	 *
	 * NUR AUFWÄRTS: eine Fahrt nach unten ist ein Einsatz oder eine
	 * Rückbuchung, dafür gibt es je einen eigenen Klang.
	 *
	 * @param {CustomEvent} event fr:count
	 * @returns {void}
	 */
	onCount(event) {
		const detail = event.detail;
		if (detail?.display !== COUNT_DISPLAY || detail.direction !== 'up') {
			return;
		}
		countStep({ key: 'count', minGap: 0.03, index: detail.index, steps: detail.steps, base: 880 });
	}

	/**
	 * CASH OUT: der Gerätekredit ist in die Kasse zurückgebucht.
	 * moved === 0 bleibt STILL — "KONTO VOLL" sagt es sichtbar.
	 *
	 * @param {CustomEvent} event fr:cashout
	 * @returns {void}
	 */
	onCashOut(event) {
		const moved = Number(event.detail?.moved);
		if (!Number.isFinite(moved) || moved <= 0) {
			return;
		}
		sheet({ key: 'cashout-tray', minGap: 0.4, duration: 0.20, from: 1000, to: 320, gain: 0.9 });
		coinCascade({ key: 'cashout', minGap: 0.4, at: 0.10, count: 14 });
	}

	/**
	 * Eine Risiko-Leiter meldet Treffer oder Fehlgriff — und die zweite
	 * Quelle für "das Gerät arbeitet" (riskBusy). 'offer' trägt ABSICHTLICH
	 * keinen Klang, siehe Dateikopf; 'start' klingt nicht extra: die Leiter
	 * beginnt zu blinken, und der erste fr:risktick folgt unmittelbar darauf.
	 * (Seit der Einführung der Starttasten ist der Start ein eigener Druck;
	 * ein eigener Startklang wäre möglich, ist aber nicht beauftragt — er
	 * bliebe sonst ein Klang ohne Prüfung im Klangnachweis.)
	 *
	 * @param {CustomEvent} event fr:risk
	 * @returns {void}
	 */
	onRisk(event) {
		const phase = event.detail?.phase;

		if (phase === 'start') {
			this.riskBusy = true;
			this.updateBusy();
		} else if (phase === 'miss' || phase === 'collect' || phase === 'end') {
			this.riskBusy = false;
			this.updateBusy();
		}

		if (phase === 'hit') {
			sound.sequence({
				key: 'riskhit', minGap: 0.12,
				tones: [
					{ type: 'square', freq: 523, at: 0, duration: 0.07, gain: 0.16, filter: SOFT },
					{ type: 'square', freq: 784, at: 0.06, duration: 0.07, gain: 0.16, filter: SOFT },
				],
			});
			metal({ key: 'riskhit-metal', minGap: 0.12, pitch: 1.25, gain: 0.6 });
			return;
		}

		if (phase === 'miss') {
			sound.sequence({
				key: 'riskmiss', minGap: 0.30,
				tones: [{
					type: 'sawtooth', freq: 220, freqEnd: 110, at: 0, duration: 0.26, attack: 0.004,
					gain: 0.16, filter: { type: 'lowpass', freq: 700, q: 1 },
				}],
				noises: [{ at: 0, duration: 0.05, gain: 0.10, filter: { type: 'lowpass', freq: 320, q: 1 } }],
			});
		}
	}

	/**
	 * Das gemalte Lichtfeld einer Leiter hat gewechselt. Gefiltert wird auf
	 * detail.on === true — dieselbe Bauform wie am Nachbargerät.
	 *
	 * Jede der drei Leitern hat ihre eigene Tonhöhe; risk8 hat sogar VIER,
	 * eine je Taste (F5d-Klangtabelle) — siehe Dateikopf, "DIE DREI
	 * RISIKOSPIELE HABEN JE EINEN EIGENEN TICK".
	 *
	 * @param {CustomEvent} event fr:risktick
	 * @returns {void}
	 */
	onRiskTick(event) {
		if (event.detail?.on !== true) {
			return;
		}
		const ladder = event.detail?.ladder;

		if (ladder === 'risk' || ladder === 'risk4') {
			sound.tone({
				key: 'risk-tick', minGap: 0.15, type: 'square',
				freq: ladder === 'risk' ? 523 : 698,
				duration: 0.022, gain: 0.09, filter: { type: 'lowpass', freq: 3600, q: 0.7 },
			});
			return;
		}

		if (ladder === 'risk8') {
			const lit = Number(event.detail?.lit);
			const position = RISK8_POSITIONS[lit];
			if (position === undefined) {
				return;
			}
			sound.tone({
				key: `risk8-${position.name}`, minGap: 0.15, type: 'square', freq: position.freq,
				duration: 0.022, gain: 0.09, filter: { type: 'lowpass', freq: 3600, q: 0.7 },
			});
		}
	}

	/**
	 * Die AUTO-Taste wurde umgelegt. Richtung nach Zustand: EIN steigt,
	 * AUS fällt — dieselbe kleine Regel wie überall an diesem Gerät
	 * (Walzenstopps und Jingle steigen ebenfalls).
	 *
	 * @param {CustomEvent} event fr:auto
	 * @returns {void}
	 */
	onAuto(event) {
		const on = event.detail?.on === true;
		sound.tone({
			key: 'auto', minGap: 0.10, type: 'triangle',
			freq: on ? 330 : 440, freqEnd: on ? 440 : 330,
			duration: 0.07, gain: 0.14,
		});
		this.syncAttributes();
	}

	/**
	 * Der Ton-Schalter am Sockel.
	 *
	 * Beim Einschalten bestätigt eine kurze, doppelte Klinke, dass der Ton
	 * wirklich läuft. Beim Ausschalten klingt nichts — siehe Dateikopf.
	 *
	 * event.isTrusted (Behebungslauf REVIEW-fruitrisk-f5.md [M7]): sound.
	 * toggle() darf ein nachgemachter click weiterhin auslösen — dieselbe
	 * Kasse wird auch fremdgesteuert über eine andere Registerkarte
	 * umgeschaltet, siehe onStorage(). sound.unlock() (und die hörbare
	 * Bestätigung) dagegen NICHT: onGesture() oben prüft event.isTrusted an
	 * jeder anderen Stelle, an der ein Nutzergeste den Kontext anlegen darf
	 * — der Schalter war die einzige Lücke.
	 *
	 * @param {?Event} [event]
	 * @returns {void}
	 */
	onSwitch(event) {
		const on = sound.toggle();
		if (on && event?.isTrusted === true) {
			sound.unlock();
			ratchet({ key: 'switch', minGap: 0.15, count: 2, step: 0.05 });
		}
		this.syncAttributes();
	}

	/**
	 * Ein Zug ist ABGELEHNT worden. Läuft am DOKUMENT in der BLASENPHASE —
	 * der einzige Ort, an dem defaultPrevented schon feststeht.
	 *
	 * Die Prüfung auf event.target ist Pflicht: am Dokument kommen die
	 * fr:round ALLER Gehäuse dieser Seite an.
	 *
	 * @param {CustomEvent} event fr:round
	 * @returns {void}
	 */
	onRoundRefused(event) {
		if (event.target !== this.root || !event.defaultPrevented) {
			return;
		}
		sound.tone({
			key: 'round-refused', minGap: 0.30, type: 'square', freq: 90, duration: 0.18,
			gain: 0.15, filter: { type: 'lowpass', freq: 400, q: 1 },
		});
	}

	/**
	 * Das Fenster wurde versteckt oder kommt zurück.
	 *
	 * @returns {void}
	 */
	onVisibility() {
		if (this.root.ownerDocument.visibilityState === 'hidden') {
			this.stopRunning();
			sound.stopAll();
			this.idle.stop();
			return;
		}
		if (this.running) {
			this.startRunning();
		}
		this.idle.start();
		this.syncAttributes();
	}

	/**
	 * Startet das Laufgeräusch, falls es nicht schon läuft.
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
	 * Ein Rauschstoß des Laufgeräuschs, dann der nächste. ±4 % Streuung in
	 * Tonhöhe und Abspielrate — ohne sie klänge eine gleichmäßig laufende
	 * Anzeige nach einem Metronom.
	 *
	 * @returns {void}
	 */
	runTick() {
		this.runTimer = 0;
		if (!this.running) {
			return;
		}
		const swing = 0.96 + Math.random() * 0.08;
		sound.noise({
			key: 'run', minGap: 0.03, duration: 0.018, attack: 0.0008, gain: 0.05,
			rate: 0.9 * swing, filter: { type: 'bandpass', freq: 520 * swing, q: 1.1 },
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
		this.button?.classList.toggle('fr-sound--on', on);
		this.button?.setAttribute('aria-pressed', on ? 'true' : 'false');

		if (detail.enabled !== true) {
			this.stopRunning();
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
	 * Schreibt den Zustand als data-Attribute ans Gehäuse. Genau drei — die
	 * README nennt keinen weiteren (F5d-Messpunkttabelle).
	 *
	 * data-fr-sound-on, NICHT data-fr-sound (Behebungslauf, Abnahmetest T-84):
	 * data-fr-sound ist bereits am Ton-Schalter selbst vergeben — dort als
	 * bloße Kennung ohne Wert, mit der der Konstruktor oben den Schalter
	 * findet (this.button = cabinet.querySelector('[data-fr-sound]')). Ein
	 * Zustandsspiegel unter demselben Namen auf .fr-machine liefe zur
	 * Laufzeit zwei Elemente mit demselben Attribut: die Kennung des
	 * Bedienteils und der Zustand des Geräts wären nicht mehr auseinanderzu-
	 * halten. data-fr-sound-on folgt demselben Muster wie
	 * data-fr-sound-sustained/-dropped direkt darunter: ein eigener,
	 * eindeutiger Name je Messpunkt.
	 *
	 * @returns {void}
	 */
	syncAttributes() {
		const stats = sound.stats();
		const data = this.root.dataset;
		data.frSoundOn = stats.enabled ? 'on' : 'off';
		data.frSoundSustained = this.idle.hum?.running === true ? '1' : '0';
		data.frSoundDropped = String(stats.droppedVoices);
	}

	/**
	 * Meldet alles ab und räumt den Zeitgeber weg.
	 *
	 * Bricht ABSICHTLICH keine fremden Stimmen ab: der Kontext gehört der
	 * Seite, nicht diesem Gerät. Die EINE Ausnahme ist das eigene Brummen
	 * dieses Gehäuses (idle.destroy(), siehe Dateikopf).
	 *
	 * @returns {void}
	 */
	destroy() {
		this.stopRunning();
		this.running = false;
		this.machineBusy = false;
		this.riskBusy = false;

		this.idle.destroy();

		this.unsubscribe?.();
		this.unsubscribe = null;

		for (const { target, type, handler, capture } of this.bound) {
			target.removeEventListener(type, handler, capture);
		}
		this.bound = [];

		delete this.root.dataset.frSoundOn;
		delete this.root.dataset.frSoundSustained;
		delete this.root.dataset.frSoundDropped;
	}
}

/**
 * Schaltet den Klang der ganzen Seite ab und schließt den Kontext.
 *
 * Genau einmal je Seite aufzurufen, beim Verlassen — nicht je Gerät. Steht
 * hier und nicht in fruit-risk.js, damit die Einstiegsdatei kein Modul einer
 * anderen Extension importieren muss.
 *
 * @returns {void}
 */
export function shutdownSound() {
	sound.shutdown();
}

export default MachineSound;
