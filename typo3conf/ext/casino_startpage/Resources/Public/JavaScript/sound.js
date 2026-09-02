/**
 * Casino Kunterbunt – gemeinsame Klangerzeugung
 * =============================================
 *
 * Dies ist die einzige Stelle im gesamten Projekt, die Töne erzeugt, und die
 * einzige, die die Ton-Einstellung speichert. Kein Automat erzeugt selbst
 * Klang, und keiner fasst den Speicher an — dieselbe Aufteilung wie beim
 * Guthaben (CONCEPT.md Abschnitt 3.6 und 3.7, Abschnitt 5 Grundsatz 5).
 *
 * Einbindung in einer Automaten-Extension:
 *
 *   import { sound } from '@phomo17/casino-startpage/sound.js';
 *
 *
 * DIESE DATEI KENNT KEIN EINZIGES GERÄT
 * -------------------------------------
 * Sie weiß nicht, welche Ereignisse es gibt, welche Teile ein Gerät hat und
 * wann etwas klingen soll. Sie liefert Bausteine:
 *
 *   tone()      ein Ton: Wellenform, Frequenz oder Frequenzverlauf, Dauer,
 *               Hüllkurve, wahlweise ein Filter
 *   noise()     ein Rauschstoß aus einem selbst gefüllten Puffer
 *   sequence()  eine kurze Tonfolge aus mehreren Tönen und Rauschstößen mit
 *               eigenem Zeitversatz, gemeinsam gedrosselt
 *   setVolume() die Gesamtlautstärke
 *   enable/disable/toggle   an und aus, gespeichert
 *
 * WELCHER Klang zu WELCHEM Ereignis gehört, entscheidet ausschließlich die
 * jeweilige Automaten-Extension. Sie übergibt jede Klangbeschreibung als
 * schlichtes Datenobjekt. Deshalb steht in dieser Datei keine einzige
 * Frequenz eines Geräts.
 *
 *
 * KEINE AUDIODATEIEN, KEIN NETZZUGRIFF
 * ------------------------------------
 * CONCEPT.md Abschnitt 2, harte Regel 1. Jeder Klang entsteht aus
 * OscillatorNode, AudioBufferSourceNode mit selbst gefülltem Rauschpuffer,
 * GainNode und BiquadFilterNode. Es gibt kein fetch(), keine Datei, kein
 * fremdes Werkzeug.
 *
 *
 * DIE AUTOPLAY-SPERRE — WANN DER KONTEXT ENTSTEHT
 * -----------------------------------------------
 * Browser lassen Ton erst nach der ersten Nutzerhandlung zu (CONCEPT.md
 * Abschnitt 3.7). Ein AudioContext, der schon beim Laden angelegt wird, ist in
 * Chromium eine Konsolenwarnung. Deshalb gilt hier:
 *
 *  1. Beim Import passiert NICHTS außer: gespeicherten Schalterzustand lesen
 *     und einen storage-Zuhörer anmelden. Kein Kontext, kein Zeitgeber.
 *  2. ensureContext() baut den Kontext erst, wenn BEIDES stimmt:
 *     der Ton ist eingeschaltet UND das Dokument hat eine Nutzeraktivierung
 *     (navigator.userActivation.hasBeenActive; ersatzweise ein eigenes
 *     Merkzeichen, das nur unlock() setzt).
 *  3. Weil er damit innerhalb einer echten Geste entsteht, startet er sofort
 *     als "running". resume() wird nur bei state === 'suspended' gerufen, und
 *     sein Versprechen bekommt immer ein .catch() — eine unbehandelte
 *     Ablehnung wäre ihrerseits eine Konsolenausgabe.
 *  4. Fehlt die Geste noch, liefert jeder Klangaufruf still 0 zurück. Kein
 *     Ton, keine Warnung, kein Fehler.
 *
 * Ein Aufrufer ruft unlock() aus einem Zuhörer für ein ECHTES Ereignis
 * (event.isTrusted === true). Ein nachgemachtes Ereignis darf keine
 * Aktivierung vortäuschen, sonst entstünde die Warnung doch.
 *
 *
 * KEIN ÜBERSTEUERN, KEINE ÜBERLAGERUNG — VIER SPERREN
 * ---------------------------------------------------
 *  1. Master-Verstärkung 0,45 vor dem Ausgang.
 *  2. Ein DynamicsCompressorNode davor fängt ab, was die Rechnung nicht
 *     vorhersieht (Schwelle -16 dB, Verhältnis 12:1).
 *  3. Höchstens MAX_VOICES gleichzeitig GEPLANTE Quellen. Gezählt wird ab dem
 *     Planen, nicht ab dem Erklingen: eine Tonfolge, die anderthalb Sekunden
 *     in die Zukunft reicht, belegt ihre Plätze sofort und gibt sie erst
 *     frei, wenn ihr letzter Ton verklungen ist. Das ist eine Durchgehsperre,
 *     kein Lautstärkeschutz; jede verworfene Stimme wird gezählt.
 *  4. Mindestabstand je Klangschlüssel: derselbe Klang kann sich nicht
 *     stapeln, auch nicht bei einem Ereignishagel.
 *
 *
 * DAUERKLÄNGE — DIE FÜNFTE ART VON STIMME
 * ---------------------------------------
 * Seit dem Klangausbau (CONCEPT.md B.7) gibt es Klänge, die nicht aufhören:
 * das leise Brummen eines eingeschalteten Geräts. Ein solcher Klang lässt
 * sich mit tone() nicht bauen. Ein Ton mit fester Dauer müsste immer wieder
 * neu geplant werden — das wären Stimmen im Sekundentakt für etwas, das gar
 * nicht neu anfängt.
 *
 * sustain() legt deshalb eine Quelle an, die läuft, bis jemand sie anhält,
 * und liefert einen GRIFF dafür zurück: setLevel() und stop(). Dauerklänge
 * werden GETRENNT gezählt (sustained, MAX_SUSTAINED) und nicht gegen
 * MAX_VOICES gerechnet. Drei Gründe:
 *
 *  · Ein Dauerklang ist kein Ereignis in einem Hagel. Er kann sich nicht
 *    stapeln, weil ihn jemand ausdrücklich hält.
 *  · Er würde sonst einen Platz für immer belegen und die Durchgehsperre für
 *    die kurzen Klänge um genau diesen Platz verengen.
 *  · Die Messschleife hinter dem Master läuft nur, SOLANGE STIMMEN GEPLANT
 *    SIND, und hält danach von allein an (siehe startMeter). Zählte ein
 *    Dauerklang mit, liefe sie für immer, und der Ruhezustand kostete
 *    plötzlich jedes Bild Rechenzeit. Der Pegel eines Dauerklangs wird
 *    trotzdem gemessen: er ist zu hören, wann immer sonst etwas klingt, und
 *    dann läuft die Schleife.
 *
 * Abgebrochen wird ein Dauerklang von allem, was auch kurze Stimmen
 * abbricht: stopAll(), Ausschalten, shutdown(). Wer ihn danach wiederhaben
 * will, legt einen neuen an — der Griff sagt über running, dass der alte tot
 * ist.
 *
 * Gemessen wird das über einen AnalyserNode hinter der Master-Verstärkung.
 * Seine Zeichenschleife läuft NUR, solange Stimmen geplant sind, und hält
 * danach von allein an. Der größte je gesehene Absolutwert steht in
 * stats().peakLevel; 1,0 wäre Übersteuern.
 *
 *
 * DIE EINSTELLUNG WIRD GESPEICHERT
 * --------------------------------
 * Schlüssel casinoKunterbunt.sound, Werte '1' und '0'. Standard ist EIN
 * (CONCEPT.md 3.7). Geschrieben wird erst, wenn der Spieler wirklich schaltet
 * — ein Besucher, der den Schalter nie anrührt, hinterlässt keinen Eintrag.
 * Andere Registerkarten werden über das storage-Ereignis mitgeführt, genau wie
 * beim Guthaben in credit.js.
 *
 * ANDERS ALS BEI credit.js SIND DIE ÄNDERENDEN METHODEN HIER SYNCHRON.
 * Beim Guthaben ist das asynchrone Versprechen die Bruchstelle für ein
 * späteres serverseitiges Konto (CONCEPT.md Abschnitt 8). Für einen
 * Ton-Schalter gibt es diese Zukunft nicht: er ist eine Eigenschaft dieses
 * Browsers und wird es bleiben. Ein await auf einen Klick wäre eine
 * Umständlichkeit ohne Gegenwert.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier an Text steht,
 * sind Entwicklermeldungen für die Browserkonsole.
 */

/** Der eine gemeinsame Schlüssel im Browserspeicher. */
const STORAGE_KEY = 'casinoKunterbunt.sound';

/** Nur zum Prüfen, ob der Speicher überhaupt beschreibbar ist. */
const PROBE_KEY = 'casinoKunterbunt.probe';

/** CONCEPT.md Abschnitt 3.7: „Standardmäßig eingeschaltet". */
const DEFAULT_ENABLED = true;

/** Gesamtlautstärke. Siehe Dateikopf, Sperre 1. */
const DEFAULT_VOLUME = 0.45;

/**
 * Höchstzahl gleichzeitig geplanter Quellen. Siehe Dateikopf, Sperre 3.
 *
 * 48 statt der ursprünglichen 24. Der Grund ist nicht Lautstärke, sondern
 * Buchführung: gezählt wird ab dem PLANEN. Der dichteste Augenblick eines
 * Zuges ist seit dem Klangausbau ein Jackpot — dessen Jingle hält 1,53
 * Sekunden lang zwölf Plätze, und unmittelbar danach plant die Kasse Glocke,
 * Schublade und Münzkaskade mit rund weiteren zwanzig. Mit 24 würden dort
 * Stimmen verworfen, OHNE DASS IRGENDETWAS ZU LAUT WÄRE: die Sperre schlüge
 * für den falschen Sachverhalt an, und die Abnahme aus CONCEPT.md B.10,
 * Phase 4 („null verworfene Stimmen") wäre nicht zu halten, obwohl der Klang
 * in Ordnung ist.
 *
 * Gegen ZU LAUT schützen unverändert die Master-Verstärkung (Sperre 1), der
 * Begrenzer (Sperre 2) und die Mindestabstände je Klangschlüssel (Sperre 4).
 * Nachgewiesen wird es doppelt: im Browser über stats().peakLevel und unter
 * Node über verify-sound.mjs, das die Summe ALLER Hüllkurven über die Zeit
 * ausrechnet und damit eine obere Schranke liefert, die keine Messung
 * unterlaufen kann.
 */
const MAX_VOICES = 48;

/**
 * Höchstzahl gleichzeitig laufender Dauerklänge. Siehe Dateikopf.
 *
 * Vier reichen für jedes denkbare Gerät auf einer Seite. Die Zahl ist nicht
 * als Spielraum gedacht, sondern als Reißleine: ein Dauerklang, den niemand
 * mehr anhält, ist ein Leck — und ein Leck soll auffallen, statt sich still
 * zu häufen.
 */
const MAX_SUSTAINED = 4;

/** Ausblendzeit beim harten Abbruch, in Sekunden. Ohne sie knackt es. */
const CUT_S = 0.012;

/** Länge des Rauschpuffers in Sekunden. */
const NOISE_S = 1;

/** Kleinster Wert für eine exponentielle Rampe. Sie darf nie auf 0 laufen. */
const MIN_GAIN = 0.0001;

/** Wartezeit, bevor ein stillgelegter Kontext angehalten wird, in ms. */
const SUSPEND_MS = 80;

/**
 * Der Speicher – oder null, wenn es keinen gibt.
 *
 * Gleiche Vorgehensweise wie in credit.js: im privaten Modus mancher Browser
 * ist localStorage vorhanden, wirft beim Schreiben aber. Deshalb wird einmal
 * probeweise geschrieben. Ohne Speicher gilt die Voreinstellung und der
 * Schalter wirkt nur bis zum nächsten Seitenwechsel.
 */
const store = (() => {
	try {
		const candidate = globalThis.localStorage;
		if (!candidate) {
			return null;
		}
		candidate.setItem(PROBE_KEY, '1');
		candidate.removeItem(PROBE_KEY);
		return candidate;
	} catch {
		return null;
	}
})();

/** Alle angemeldeten Zuhörer auf dieser Seite. */
const listeners = new Set();

/** Die geplanten und klingenden Stimmen. @type {Set<{source: AudioScheduledSourceNode, gain: GainNode}>} */
const voices = new Set();

/**
 * Die laufenden Dauerklänge. Getrennt von voices — siehe Dateikopf.
 *
 * @type {Set<{gain: GainNode, sources: AudioScheduledSourceNode[],
 *             level: number, stopped: boolean, pending: number}>}
 */
const sustained = new Set();

/** Zeitpunkt des letzten Starts je Klangschlüssel, in Kontextzeit. */
const lastStart = new Map();

/** Wie oft ein Klangschlüssel gespielt wurde. Nur zur Nachprüfung. */
const playCounts = new Map();

/** Ist der Ton eingeschaltet? */
let enabled = readStored();

/** Gesamtlautstärke, 0 bis 1. */
let volume = DEFAULT_VOLUME;

/** @type {?AudioContext} */
let ctx = null;
/** @type {?DynamicsCompressorNode} Sammelschiene: hier hängt jede Stimme. */
let bus = null;
/** @type {?GainNode} */
let master = null;
/** @type {?AnalyserNode} */
let meter = null;
/** @type {?Float32Array} */
let meterData = null;
/** @type {?AudioBuffer} */
let noiseBuffer = null;

/** Ersatzmerkzeichen für Browser ohne navigator.userActivation. */
let gestureSeen = false;

/** Kennung des Zeitgebers, der den Kontext anhält, oder 0. */
let suspendTimer = 0;

/** Kennung der laufenden Messschleife, oder 0. */
let meterFrame = 0;

/* Zähler. Sie sind der maschinell prüfbare Teil dieser Phase. */
let startedVoices = 0;
let droppedVoices = 0;
let gapDrops = 0;
let peakVoices = 0;
let peakLevel = 0;

/* Dasselbe für Dauerklänge. Getrennt geführt, weil sie einer anderen Sperre
   unterliegen: eine gemeinsame Zahl machte beide Aussagen wertlos. */
let startedSustained = 0;
let droppedSustained = 0;

/**
 * Liest den gespeicherten Schalterzustand.
 *
 * Ein unbekannter Inhalt gilt als Voreinstellung und wird NICHT repariert:
 * anders als beim Guthaben hängt hier kein Wert dran, den jemand manipulieren
 * könnte.
 *
 * @returns {boolean}
 */
function readStored() {
	if (store === null) {
		return DEFAULT_ENABLED;
	}
	let raw = null;
	try {
		raw = store.getItem(STORAGE_KEY);
	} catch {
		return DEFAULT_ENABLED;
	}
	if (raw === '0') {
		return false;
	}
	if (raw === '1') {
		return true;
	}
	return DEFAULT_ENABLED;
}

/**
 * @param {boolean} flag
 * @returns {void}
 */
function writeStored(flag) {
	if (store === null) {
		return;
	}
	try {
		store.setItem(STORAGE_KEY, flag ? '1' : '0');
	} catch {
		// Absichtlich still: ein voller Speicher ist kein Grund, den Ton
		// abzustellen.
	}
}

/**
 * Meldet eine Änderung an alle Zuhörer dieser Seite. Ein Fehler in einem
 * Zuhörer darf die anderen nicht mitreißen.
 *
 * @param {string} reason 'subscribe' | 'user' | 'remote'
 * @returns {void}
 */
function notify(reason) {
	const detail = Object.freeze({ enabled, reason });
	for (const listener of [...listeners]) {
		try {
			listener(detail);
		} catch (error) {
			console.error('[casino] Ein Ton-Zuhörer hat einen Fehler geworfen.', error);
		}
	}
}

/**
 * Hat das Dokument eine Nutzeraktivierung?
 *
 * Die Eigenschaft des Browsers hat Vorrang vor dem eigenen Merkzeichen. Genau
 * das ist der Punkt: ein nachgemachtes Ereignis setzt zwar unser Merkzeichen,
 * erzeugt in Chromium aber keine Aktivierung — und dann bleibt es still,
 * statt eine Warnung zu erzeugen.
 *
 * @returns {boolean}
 */
function hasActivation() {
	const activation = globalThis.navigator?.userActivation;
	if (activation !== undefined && activation !== null && typeof activation.hasBeenActive === 'boolean') {
		return activation.hasBeenActive;
	}
	return gestureSeen;
}

/**
 * Liefert den Kontext – und baut ihn beim ersten Mal.
 *
 * @returns {?AudioContext} null, wenn nicht gebaut werden darf oder kann
 */
function ensureContext() {
	if (!enabled) {
		return null;
	}
	if (ctx !== null) {
		if (ctx.state === 'closed') {
			return null;
		}
		if (ctx.state === 'suspended') {
			void ctx.resume().catch(() => {});
		}
		return ctx;
	}
	if (!hasActivation()) {
		return null;
	}

	const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
	if (typeof Ctor !== 'function') {
		return null;
	}

	try {
		ctx = new Ctor({ latencyHint: 'interactive' });
	} catch (error) {
		console.error('[casino] Der Klang konnte nicht gestartet werden.', error);
		ctx = null;
		return null;
	}

	bus = ctx.createDynamicsCompressor();
	bus.threshold.value = -16;
	bus.knee.value = 10;
	bus.ratio.value = 12;
	bus.attack.value = 0.004;
	bus.release.value = 0.18;

	master = ctx.createGain();
	master.gain.value = volume;

	meter = ctx.createAnalyser();
	meter.fftSize = 1024;
	meterData = new Float32Array(meter.fftSize);

	bus.connect(master);
	master.connect(meter);
	meter.connect(ctx.destination);

	if (ctx.state === 'suspended') {
		void ctx.resume().catch(() => {});
	}
	return ctx;
}

/**
 * Der Rauschpuffer. Einmal je Kontext gefüllt und danach von jedem Rauschstoß
 * benutzt.
 *
 * Math.random() ist hier richtig: das ist Rauschen, keine Ziehung eines
 * Spiels. Für Ziehungen gilt in diesem Projekt crypto.getRandomValues, und
 * diese Datei zieht nichts.
 *
 * @returns {?AudioBuffer}
 */
function ensureNoise() {
	if (noiseBuffer !== null) {
		return noiseBuffer;
	}
	if (ctx === null) {
		return null;
	}
	const frames = Math.max(1, Math.floor(ctx.sampleRate * NOISE_S));
	const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < frames; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	noiseBuffer = buffer;
	return noiseBuffer;
}

/**
 * Darf dieser Klangschlüssel jetzt spielen?
 *
 * Ohne Schlüssel gibt es keine Drosselung. Mit Schlüssel wird der Abstand zum
 * letzten Start geprüft — so kann sich derselbe Klang nicht stapeln.
 *
 * @param {*} key
 * @param {*} minGap Mindestabstand in Sekunden
 * @returns {boolean}
 */
function allow(key, minGap) {
	if (typeof key !== 'string' || key === '') {
		return true;
	}
	const now = ctx === null ? 0 : ctx.currentTime;
	const gap = Number(minGap);
	if (Number.isFinite(gap) && gap > 0) {
		const previous = lastStart.get(key);
		if (previous !== undefined && now - previous < gap) {
			gapDrops++;
			return false;
		}
	}
	lastStart.set(key, now);
	playCounts.set(key, (playCounts.get(key) ?? 0) + 1);
	return true;
}

/**
 * Ist noch Platz für eine weitere Stimme? Wird VOR dem Bau der Knoten
 * gefragt, damit keine unbenutzten Knoten im Graphen hängen bleiben.
 *
 * @returns {boolean}
 */
function reserve() {
	if (voices.size >= MAX_VOICES) {
		droppedVoices++;
		return false;
	}
	return true;
}

/**
 * Nimmt eine Stimme in die Buchführung auf.
 *
 * @param {AudioScheduledSourceNode} source
 * @param {GainNode} gain
 * @returns {void}
 */
function register(source, gain) {
	const voice = { source, gain };
	voices.add(voice);
	startedVoices++;
	if (voices.size > peakVoices) {
		peakVoices = voices.size;
	}
	source.onended = () => {
		voices.delete(voice);
	};
	startMeter();
}

/** Startet die Messschleife, falls sie nicht schon läuft. */
function startMeter() {
	if (meterFrame !== 0 || meter === null) {
		return;
	}
	if (typeof globalThis.requestAnimationFrame !== 'function') {
		return;
	}
	meterFrame = globalThis.requestAnimationFrame(meterStep);
}

/**
 * Ein Messbild. Die Schleife hält von allein an, sobald keine Stimme mehr
 * geplant ist — im Ruhezustand kostet die Messung also nichts.
 *
 * @returns {void}
 */
function meterStep() {
	meterFrame = 0;
	if (meter === null || meterData === null) {
		return;
	}
	meter.getFloatTimeDomainData(meterData);
	let peak = 0;
	for (let i = 0; i < meterData.length; i++) {
		const value = Math.abs(meterData[i]);
		if (value > peak) {
			peak = value;
		}
	}
	if (peak > peakLevel) {
		peakLevel = peak;
	}
	if (voices.size > 0) {
		meterFrame = globalThis.requestAnimationFrame(meterStep);
	}
}

/**
 * Hängt Quelle, wahlweise Filter und Hüllkurve an die Sammelschiene.
 *
 * NEU seit dem Klangausbau: der Filter darf WANDERN. Steht in filterSpec ein
 * freqEnd, fährt die Filterfrequenz von freq nach freqEnd, solange der Klang
 * dauert.
 *
 * Das ist der Unterschied zwischen einem Rauschstoß und einem RUTSCHEN: wenn
 * Blech über Blech gleitet oder eine Kassenschublade herausgezogen wird,
 * wandert der Schwerpunkt des Geräuschs, während der Pegel abklingt. Ohne
 * diese Rampe müsste man zwei Stöße mit verschiedenen Filtern übereinander
 * legen — zwei Stimmen für etwas, das eine ist, und ein hörbarer Absatz in
 * der Mitte.
 *
 * @param {AudioNode} source
 * @param {GainNode} gain
 * @param {*} filterSpec {type, freq, freqEnd, q} oder nichts
 * @param {AudioContext} context
 * @param {number} t0 Beginn in Kontextzeit
 * @param {number} tEnd Ende in Kontextzeit
 * @returns {void}
 */
function connectChain(source, gain, filterSpec, context, t0, tEnd) {
	let node = source;
	if (filterSpec !== undefined && filterSpec !== null) {
		const filter = context.createBiquadFilter();
		filter.type = typeof filterSpec.type === 'string' ? filterSpec.type : 'lowpass';
		const start = Math.max(20, Number(filterSpec.freq) || 1000);
		filter.frequency.setValueAtTime(start, t0);
		const end = Number(filterSpec.freqEnd);
		if (Number.isFinite(end) && end > 0 && tEnd > t0) {
			// Exponentiell, nicht linear: Tonhöhe hört das Ohr logarithmisch.
			// Eine lineare Fahrt von 1400 auf 380 Hz klänge, als bliebe sie
			// oben stehen und fiele erst ganz am Ende ab.
			filter.frequency.exponentialRampToValueAtTime(Math.max(20, end), tEnd);
		}
		filter.Q.value = Math.max(0.0001, Number(filterSpec.q) || 1);
		node.connect(filter);
		node = filter;
	}
	node.connect(gain);
	gain.connect(bus);
}

/**
 * Hängt einen Bestandteil eines DAUERKLANGS an dessen gemeinsame Verstärkung.
 *
 * Absichtlich ohne Rampe und ohne Hüllkurve: ein Dauerklang hat keinen Anfang
 * und kein Ende, die man formen könnte. Geformt wird nur die gemeinsame
 * Verstärkung, und zwar von außen über setLevel().
 *
 * @param {AudioNode} source
 * @param {GainNode} partGain
 * @param {*} filterSpec
 * @param {AudioContext} context
 * @param {GainNode} target die gemeinsame Verstärkung des Dauerklangs
 * @returns {void}
 */
function connectPart(source, partGain, filterSpec, context, target) {
	let node = source;
	if (filterSpec !== undefined && filterSpec !== null) {
		const filter = context.createBiquadFilter();
		filter.type = typeof filterSpec.type === 'string' ? filterSpec.type : 'lowpass';
		filter.frequency.value = Math.max(20, Number(filterSpec.freq) || 1000);
		filter.Q.value = Math.max(0.0001, Number(filterSpec.q) || 1);
		node.connect(filter);
		node = filter;
	}
	node.connect(partGain);
	partGain.connect(target);
}

/**
 * Baut einen Dauerklang. Ohne Drosselung – die macht der öffentliche Aufruf.
 *
 * Alle Bestandteile hängen an EINER gemeinsamen Verstärkung. Nur sie wird
 * später bewegt; die einzelnen Teiltöne stehen fest zueinander, sonst
 * veränderte jede Lautstärkeänderung auch die Klangfarbe.
 *
 * @param {object} spec siehe sound.sustain()
 * @returns {?object} der innere Griff, oder null
 */
function playSustain(spec) {
	const context = ensureContext();
	if (context === null) {
		return null;
	}
	if (sustained.size >= MAX_SUSTAINED) {
		droppedSustained++;
		return null;
	}

	const level = Math.min(1, Math.max(0, Number(spec.gain) || 0.02));
	const attack = Math.max(0.01, Number(spec.attack) || 0.35);
	const t0 = context.currentTime;

	const gain = context.createGain();
	// Von echter Null herauf, damit es beim Einschalten nicht knackt. Ein
	// Gerät, dessen Brummen einsetzt wie ein Lichtschalter, klingt kaputt.
	gain.gain.setValueAtTime(0, t0);
	gain.gain.linearRampToValueAtTime(level, t0 + attack);

	// AN DIE SAMMELSCHIENE. Ohne diese Zeile ist der ganze Dauerklang gebaut,
	// gezählt und steuerbar — und trotzdem nicht zu hören, weil seine Kette
	// nirgends endet. connectPart() hängt die Bestandteile an DIESEN Knoten;
	// dass DIESER Knoten selbst weitergeht, kann nur hier stehen.
	gain.connect(bus);

	/** @type {AudioScheduledSourceNode[]} */
	const sources = [];

	for (const part of spec.tones ?? []) {
		const osc = context.createOscillator();
		osc.type = typeof part.type === 'string' ? part.type : 'sine';
		osc.frequency.setValueAtTime(Math.max(10, Number(part.freq) || 50), t0);
		const detune = Number(part.detune);
		if (Number.isFinite(detune) && detune !== 0) {
			osc.detune.setValueAtTime(detune, t0);
		}
		const partGain = context.createGain();
		partGain.gain.value = Math.min(1, Math.max(0, Number(part.gain) || 1));
		connectPart(osc, partGain, part.filter, context, gain);
		sources.push(osc);
		osc.start(t0);
	}

	if (spec.noise !== undefined && spec.noise !== null) {
		const buffer = ensureNoise();
		if (buffer !== null) {
			const source = context.createBufferSource();
			source.buffer = buffer;
			// Die einzige Stelle im ganzen Modul, an der ein Puffer in
			// Schleife läuft. Bei einer Sekunde Rauschen, tief gefiltert und
			// sehr leise, ist die Wiederholung nicht herauszuhören — sie trägt
			// keine erkennbare Gestalt, an der man sie wiedererkennen könnte.
			source.loop = true;
			source.playbackRate.value = Math.min(4, Math.max(0.25, Number(spec.noise.rate) || 1));
			const partGain = context.createGain();
			partGain.gain.value = Math.min(1, Math.max(0, Number(spec.noise.gain) || 0.2));
			connectPart(source, partGain, spec.noise.filter, context, gain);
			sources.push(source);
			source.start(t0);
		}
	}

	if (sources.length === 0) {
		// Nichts zu hören, also auch nichts zu verwalten. Ein leerer Griff
		// wäre ein Leck, das nie auffiele.
		gain.disconnect();
		return null;
	}

	const handle = { gain, sources, level, stopped: false, pending: sources.length };
	for (const source of sources) {
		source.onended = () => {
			handle.pending--;
			if (handle.pending <= 0) {
				try {
					gain.disconnect();
				} catch {
					// Ein bereits getrennter Knoten wirft. Kein Fehler.
				}
			}
		};
	}
	sustained.add(handle);
	startedSustained++;
	return handle;
}

/**
 * Hält einen Dauerklang an – ausgeblendet, nicht abgeschnitten.
 *
 * Gleiche Begründung wie bei stopAllVoices(): ein hartes stop() bei laufender
 * Amplitude ist ein Knall, und ausgerechnet beim Ausschalten des Tons wäre das
 * die schlechteste denkbare Rückmeldung.
 *
 * @param {object} handle
 * @param {number} fade Ausblendzeit in Sekunden
 * @returns {boolean} false, wenn er schon angehalten war
 */
function stopSustain(handle, fade) {
	if (handle === null || handle === undefined || handle.stopped) {
		return false;
	}
	handle.stopped = true;
	sustained.delete(handle);
	if (ctx === null) {
		return true;
	}
	const now = ctx.currentTime;
	const seconds = Math.max(CUT_S, Number(fade) || 0.25);
	try {
		handle.gain.gain.cancelScheduledValues(now);
		handle.gain.gain.setValueAtTime(Math.max(MIN_GAIN, handle.gain.gain.value), now);
		handle.gain.gain.linearRampToValueAtTime(0, now + seconds);
	} catch {
		// Siehe stopAllVoices(): ein Knoten an einem sterbenden Kontext wirft.
	}
	for (const source of handle.sources) {
		try {
			source.stop(now + seconds + 0.02);
		} catch {
			// Eine bereits beendete Quelle wirft. Normalfall beim Abräumen.
		}
	}
	return true;
}

/**
 * Legt die Hüllkurve auf einen GainNode.
 *
 * Linear hinauf (von echter Null, damit es nicht knackt), exponentiell
 * hinunter (so klingt jedes mechanische Geräusch ab), dann hart auf Null.
 * Eine exponentielle Rampe darf nie auf 0 laufen, deshalb das Tausendstel.
 *
 * @param {GainNode} gain
 * @param {number} t0
 * @param {number} attack
 * @param {number} decay
 * @param {number} peak
 * @returns {void}
 */
function shape(gain, t0, attack, decay, peak) {
	gain.gain.setValueAtTime(0, t0);
	gain.gain.linearRampToValueAtTime(peak, t0 + attack);
	gain.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, peak * 0.001), t0 + attack + decay);
	gain.gain.setValueAtTime(0, t0 + attack + decay + 0.001);
}

/**
 * Spielt einen Ton. Ohne Drosselung – die macht der öffentliche Aufruf.
 *
 * @param {object} spec siehe sound.tone()
 * @returns {number} Kontextzeit, zu der dieser Ton endet; 0, wenn nichts kam
 */
function playTone(spec) {
	const context = ensureContext();
	if (context === null || !reserve()) {
		return 0;
	}

	const at = Math.max(0, Number(spec.at) || 0);
	const duration = Math.max(0.01, Number(spec.duration) || 0.08);
	const attack = Math.min(Math.max(0.0005, Number(spec.attack) || 0.002), duration * 0.5);
	const decay = Math.max(0.005, duration - attack);
	const peak = Math.min(1, Math.max(0.0002, Number(spec.gain) || 0.15));
	const t0 = context.currentTime + at;
	const tEnd = t0 + attack + decay;

	const osc = context.createOscillator();
	osc.type = typeof spec.type === 'string' ? spec.type : 'square';
	osc.frequency.setValueAtTime(Math.max(20, Number(spec.freq) || 440), t0);
	const freqEnd = Number(spec.freqEnd);
	if (Number.isFinite(freqEnd) && freqEnd > 0) {
		osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), tEnd);
	}
	const detune = Number(spec.detune);
	if (Number.isFinite(detune) && detune !== 0) {
		osc.detune.setValueAtTime(detune, t0);
	}

	const gain = context.createGain();
	shape(gain, t0, attack, decay, peak);
	connectChain(osc, gain, spec.filter, context, t0, tEnd);

	register(osc, gain);
	osc.start(t0);
	osc.stop(tEnd + 0.02);
	return tEnd;
}

/**
 * Spielt einen Rauschstoß. Ohne Drosselung – die macht der öffentliche Aufruf.
 *
 * @param {object} spec siehe sound.noise()
 * @returns {number} Kontextzeit, zu der der Stoß endet; 0, wenn nichts kam
 */
function playNoise(spec) {
	const context = ensureContext();
	if (context === null || !reserve()) {
		return 0;
	}
	const buffer = ensureNoise();
	if (buffer === null) {
		return 0;
	}

	const at = Math.max(0, Number(spec.at) || 0);
	const duration = Math.max(0.005, Number(spec.duration) || 0.03);
	const attack = Math.min(Math.max(0.0003, Number(spec.attack) || 0.001), duration * 0.5);
	const decay = Math.max(0.003, duration - attack);
	const peak = Math.min(1, Math.max(0.0002, Number(spec.gain) || 0.12));
	const t0 = context.currentTime + at;
	const tEnd = t0 + attack + decay;

	const source = context.createBufferSource();
	source.buffer = buffer;
	source.playbackRate.value = Math.min(4, Math.max(0.25, Number(spec.rate) || 1));

	// Jeder Stoß schneidet an einer anderen Stelle aus dem Puffer. Ohne das
	// klänge jedes Klacken exakt gleich – das hört man sofort als Schleife.
	const room = Math.max(0, buffer.duration - duration - 0.05);
	const offset = room > 0 ? Math.random() * room : 0;

	const gain = context.createGain();
	shape(gain, t0, attack, decay, peak);
	connectChain(source, gain, spec.filter ?? { type: 'bandpass', freq: 2000, q: 1 }, context, t0, tEnd);

	register(source, gain);
	source.start(t0, offset);
	source.stop(tEnd + 0.02);
	return tEnd;
}

/**
 * Bricht alle Stimmen ab – ausgeblendet, nicht abgeschnitten.
 *
 * Ein hartes stop() bei laufender Amplitude ist ein Knall. Deshalb wird jede
 * Stimme über CUT_S auf Null gefahren und erst danach angehalten.
 *
 * @returns {number} Anzahl der abgebrochenen Stimmen
 */
function stopAllVoices() {
	if (ctx === null) {
		return 0;
	}
	const now = ctx.currentTime;
	let count = 0;
	for (const voice of [...voices]) {
		try {
			const current = Math.max(MIN_GAIN, voice.gain.gain.value);
			voice.gain.gain.cancelScheduledValues(now);
			voice.gain.gain.setValueAtTime(current, now);
			voice.gain.gain.linearRampToValueAtTime(0, now + CUT_S);
			voice.source.stop(now + CUT_S + 0.002);
			count++;
		} catch {
			// Eine bereits beendete Quelle wirft. Das ist kein Fehler, sondern
			// der Normalfall bei einem Abbruch im letzten Augenblick.
		}
	}
	// Dauerklänge gehen mit. Wer den Ton abstellt oder in eine andere
	// Registerkarte wechselt, will vollständige Stille — ein weiterlaufendes
	// Brummen wäre genau das Gegenteil dessen, was der Schalter zusagt.
	for (const handle of [...sustained]) {
		if (stopSustain(handle, CUT_S)) {
			count++;
		}
	}
	lastStart.clear();
	return count;
}

/** Löscht den Zeitgeber, der den Kontext anhalten würde. */
function clearSuspendTimer() {
	if (suspendTimer !== 0) {
		globalThis.clearTimeout(suspendTimer);
		suspendTimer = 0;
	}
}

/**
 * Hält den Kontext kurz nach dem Ausschalten an.
 *
 * Nicht sofort: die letzten Stimmen sollen noch sauber ausblenden. Nicht
 * close(): der Spieler kann jederzeit wieder einschalten, und ein
 * angehaltener Kontext kostet nichts, während ein geschlossener neu gebaut
 * werden müsste.
 *
 * @returns {void}
 */
function scheduleSuspend() {
	clearSuspendTimer();
	suspendTimer = globalThis.setTimeout(() => {
		suspendTimer = 0;
		if (!enabled && ctx !== null && ctx.state === 'running') {
			void ctx.suspend().catch(() => {});
		}
	}, SUSPEND_MS);
}

/**
 * Schaltet um und speichert.
 *
 * @param {boolean} flag
 * @param {string} reason
 * @returns {boolean} der neue Zustand
 */
function applyEnabled(flag, reason) {
	const next = flag === true;
	if (next === enabled) {
		return enabled;
	}
	enabled = next;
	writeStored(enabled);

	if (enabled) {
		clearSuspendTimer();
		if (ctx !== null && ctx.state === 'suspended') {
			void ctx.resume().catch(() => {});
		}
	} else {
		stopAllVoices();
		scheduleSuspend();
	}

	notify(reason);
	return enabled;
}

/**
 * Die öffentliche Schnittstelle.
 */
export const sound = {
	STORAGE_KEY,
	DEFAULT_ENABLED,
	MAX_VOICES,
	MAX_SUSTAINED,

	/** Ist der Ton eingeschaltet? Synchron. @returns {boolean} */
	get enabled() {
		return enabled;
	},

	/** Gesamtlautstärke, 0 bis 1. @returns {number} */
	get volume() {
		return volume;
	},

	/** Die Uhr des Kontexts in Sekunden, 0 ohne Kontext. @returns {number} */
	get now() {
		return ctx === null ? 0 : ctx.currentTime;
	},

	/** 'none' | 'running' | 'suspended' | 'closed'. @returns {string} */
	get contextState() {
		return ctx === null ? 'none' : ctx.state;
	},

	/** Zurzeit geplante und klingende Stimmen. @returns {number} */
	get activeVoices() {
		return voices.size;
	},

	/** Größte je gleichzeitig geplante Stimmenzahl. @returns {number} */
	get peakVoices() {
		return peakVoices;
	},

	/** Größter je gemessener Ausschlag am Ausgang. 1,0 wäre Übersteuern. */
	get peakLevel() {
		return peakLevel;
	},

	/**
	 * Setzt die Gesamtlautstärke.
	 *
	 * @param {number} value 0 bis 1
	 * @returns {number} der übernommene Wert
	 */
	setVolume(value) {
		const next = Number(value);
		volume = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : DEFAULT_VOLUME;
		if (master !== null && ctx !== null) {
			master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
		}
		return volume;
	},

	/**
	 * Aus einem Zuhörer für ein ECHTES Nutzerereignis aufzurufen. Legt den
	 * Kontext an, wenn er noch fehlt, und setzt einen angehaltenen fort.
	 *
	 * @returns {string} der Zustand des Kontexts danach
	 */
	unlock() {
		gestureSeen = true;
		ensureContext();
		return ctx === null ? 'none' : ctx.state;
	},

	/** @returns {boolean} */
	enable() {
		return applyEnabled(true, 'user');
	},

	/** @returns {boolean} */
	disable() {
		return applyEnabled(false, 'user');
	},

	/** @returns {boolean} der neue Zustand */
	toggle() {
		return applyEnabled(!enabled, 'user');
	},

	/**
	 * @param {boolean} flag
	 * @returns {boolean}
	 */
	setEnabled(flag) {
		return applyEnabled(flag, 'user');
	},

	/**
	 * Ein Ton.
	 *
	 * @param {{key?: string, minGap?: number, at?: number, type?: string,
	 *          freq?: number, freqEnd?: number, duration?: number,
	 *          attack?: number, gain?: number, detune?: number,
	 *          filter?: {type: string, freq: number, q: number}}} spec
	 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
	 */
	tone(spec) {
		if (!enabled || ensureContext() === null) {
			return 0;
		}
		if (!allow(spec.key, spec.minGap)) {
			return 0;
		}
		return playTone(spec);
	},

	/**
	 * Ein Rauschstoß.
	 *
	 * @param {{key?: string, minGap?: number, at?: number, duration?: number,
	 *          attack?: number, gain?: number, rate?: number,
	 *          filter?: {type: string, freq: number, q: number}}} spec
	 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
	 */
	noise(spec) {
		if (!enabled || ensureContext() === null) {
			return 0;
		}
		if (!allow(spec.key, spec.minGap)) {
			return 0;
		}
		return playNoise(spec);
	},

	/**
	 * Eine kurze Tonfolge: mehrere Töne und Rauschstöße mit eigenem
	 * Zeitversatz, EINMAL gemeinsam gedrosselt.
	 *
	 * @param {{key?: string, minGap?: number, tones?: object[], noises?: object[]}} spec
	 * @returns {number} Kontextzeit, zu der der letzte Teil endet; 0 sonst
	 */
	sequence(spec) {
		if (!enabled || ensureContext() === null) {
			return 0;
		}
		if (!allow(spec.key, spec.minGap)) {
			return 0;
		}
		let end = 0;
		for (const step of spec.tones ?? []) {
			end = Math.max(end, playTone(step));
		}
		for (const step of spec.noises ?? []) {
			end = Math.max(end, playNoise(step));
		}
		return end;
	},

	/**
	 * Ein DAUERKLANG: eine Quelle, die läuft, bis jemand sie anhält.
	 *
	 * Gedacht für das leise Brummen eines eingeschalteten Geräts (CONCEPT.md
	 * B.7, „Leerlaufgeräusche"). NICHT gedacht für alles, was ein Ereignis
	 * hat — dafür sind tone(), noise() und sequence() da.
	 *
	 * Der Rückgabewert ist der GRIFF. Ohne ihn ließe sich der Klang nie wieder
	 * anhalten; er ist deshalb kein Nebenprodukt, sondern der Zweck des
	 * Aufrufs. Wer ihn wegwirft, hat ein Leck gebaut.
	 *
	 *   griff.running            läuft er noch?
	 *   griff.setLevel(v, sek)   Lautstärke sanft nachführen
	 *   griff.stop(sek)          ausblenden und anhalten
	 *
	 * Liefert null, wenn der Ton aus ist, noch keine Nutzergeste vorliegt oder
	 * MAX_SUSTAINED erreicht wäre. Ein Aufrufer prüft deshalb auf null und
	 * versucht es später wieder — genau wie bei jedem anderen Klang, der vor
	 * der ersten Geste still 0 liefert.
	 *
	 * @param {{gain?: number, attack?: number,
	 *          tones?: Array<{type?: string, freq: number, gain?: number,
	 *                         detune?: number, filter?: object}>,
	 *          noise?: {gain?: number, rate?: number, filter?: object}}} spec
	 * @returns {?{running: boolean, setLevel: function(number, number=): void,
	 *             stop: function(number=): boolean}}
	 */
	sustain(spec) {
		if (!enabled) {
			return null;
		}
		const handle = playSustain(spec ?? {});
		if (handle === null) {
			return null;
		}
		return Object.freeze({
			get running() {
				return handle.stopped !== true;
			},
			setLevel(value, seconds = 0.25) {
				if (handle.stopped || ctx === null) {
					return;
				}
				const next = Math.min(1, Math.max(0, Number(value) || 0));
				handle.level = next;
				// setTargetAtTime statt einer Rampe: die Zeitangabe ist eine
				// Zeitkonstante, kein Endpunkt. Damit ist es gleichgültig, wie
				// oft und wie schnell hintereinander nachgeführt wird — es gibt
				// keine zwei widersprüchlichen Rampen, die sich überlagern
				// könnten.
				handle.gain.gain.setTargetAtTime(
					next,
					ctx.currentTime,
					Math.max(0.01, Number(seconds) || 0.25) / 3
				);
			},
			stop(seconds = 0.25) {
				return stopSustain(handle, seconds);
			},
		});
	},

	/**
	 * Bricht alles ab, was gerade klingt oder geplant ist.
	 *
	 * @returns {number}
	 */
	stopAll() {
		return stopAllVoices();
	},

	/** Setzt die Messwerte zurück. Für Messläufe. @returns {void} */
	resetPeak() {
		peakLevel = 0;
		peakVoices = voices.size;
	},

	/**
	 * Alles anhalten und den Kontext schließen. Genau einmal je Seite, beim
	 * Verlassen. Danach ist contextState wieder 'none'.
	 *
	 * @returns {void}
	 */
	shutdown() {
		stopAllVoices();
		clearSuspendTimer();
		if (meterFrame !== 0) {
			globalThis.cancelAnimationFrame(meterFrame);
			meterFrame = 0;
		}
		voices.clear();
		sustained.clear();
		lastStart.clear();

		const dying = ctx;
		ctx = null;
		bus = null;
		master = null;
		meter = null;
		meterData = null;
		noiseBuffer = null;

		if (dying !== null && dying.state !== 'closed') {
			void dying.close().catch(() => {});
		}
	},

	/**
	 * Meldet einen Zuhörer für den Schalterzustand an. Er wird sofort einmal
	 * gerufen (reason: 'subscribe'), damit eine frisch angebundene Anzeige
	 * nicht falsch stehen bleibt.
	 *
	 * @param {function({enabled: boolean, reason: string}): void} listener
	 * @returns {function(): void} Abmeldefunktion
	 * @throws {TypeError}
	 */
	subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('sound.subscribe() erwartet eine Funktion.');
		}
		listeners.add(listener);
		try {
			listener(Object.freeze({ enabled, reason: 'subscribe' }));
		} catch (error) {
			console.error('[casino] Ein Ton-Zuhörer hat einen Fehler geworfen.', error);
		}
		return () => {
			listeners.delete(listener);
		};
	},

	/**
	 * Alle Messwerte auf einen Blick. Gedacht für die Abnahme: ein Aufrufer
	 * schreibt sie in data-Attribute, ein Prüfskript liest sie dort ab.
	 *
	 * @returns {object}
	 */
	stats() {
		return Object.freeze({
			enabled,
			contextState: ctx === null ? 'none' : ctx.state,
			volume,
			activeVoices: voices.size,
			peakVoices,
			startedVoices,
			droppedVoices,
			gapDrops,
			peakLevel,
			// Dauerklänge stehen getrennt: eine gemeinsame Zahl machte beide
			// Aussagen wertlos, weil sie verschiedenen Sperren unterliegen.
			sustainedVoices: sustained.size,
			startedSustained,
			droppedSustained,
			byKey: Object.fromEntries(playCounts),
		});
	},
};

/**
 * Andere Registerkarten desselben Browsers.
 *
 * Dasselbe Verfahren wie in credit.js: das storage-Ereignis feuert
 * ausschließlich in den anderen Karten, nie in der schreibenden — eine
 * Rückkopplung ist damit ausgeschlossen. Schaltet jemand dort den Ton aus,
 * verstummt diese Karte sofort mit.
 */
if (typeof globalThis.addEventListener === 'function') {
	globalThis.addEventListener('storage', (event) => {
		// event.key ist null, wenn der ganze Speicher geleert wurde.
		if (event.key !== null && event.key !== STORAGE_KEY) {
			return;
		}
		if (store !== null && event.storageArea !== null && event.storageArea !== store) {
			return;
		}
		const next = readStored();
		if (next === enabled) {
			return;
		}
		enabled = next;
		if (enabled) {
			clearSuspendTimer();
		} else {
			stopAllVoices();
			scheduleSuspend();
		}
		notify('remote');
	});
}

export default sound;
