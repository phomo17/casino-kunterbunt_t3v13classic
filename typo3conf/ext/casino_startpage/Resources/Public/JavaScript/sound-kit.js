/**
 * Casino Kunterbunt – der Klangbaukasten
 * ======================================
 *
 * Die benannten Klänge, aus denen sich jedes Gerät bedient: Münze, Kaskade,
 * Metall auf Metall, Blechrutschen, Klinke, Registrierkasse, Zählschritt.
 * CONCEPT.md B.7 verlangt sie ausdrücklich „als wiederverwendbare Bausteine im
 * Site Package".
 *
 * Einbindung in einer Automaten-Extension:
 *
 *   import { coin, coinCascade } from '@phomo17/casino-startpage/sound-kit.js';
 *
 *
 * DREI EBENEN, NICHT ZWEI
 * -----------------------
 *   sound.js       WIE ein Klang entsteht. Oszillator, Rauschen, Hüllkurve,
 *                  Filter, Begrenzer, Schalter, Speicher. Kennt keinen Klang.
 *   diese Datei    WIE EINE MÜNZE KLINGT. Kennt Klänge, aber kein Gerät und
 *                  kein Ereignis.
 *   Gerät          WANN eine Münze klingt. Kennt beides.
 *
 * Die mittlere Ebene ist neu und der eigentliche Inhalt dieser Phase. Ohne sie
 * stünde die Frage „wie klingt eine Münze?" in jedem Gerät noch einmal, und
 * die weiteren Geräte des Hauses (CONCEPT.md B.8, B.9) hätten drei verschiedene
 * Antworten darauf. Ein Haus, in dem jeder Automat eine andere Münze hat,
 * klingt nicht nach einem Haus.
 *
 *
 * SIE KENNT KEIN EINZIGES GERÄT — UND ZWAR BAULICH
 * ------------------------------------------------
 * CONCEPT.md Teil A, Abschnitt 5, Grundsatz 2. In dieser Datei steht kein
 * Element, kein Selektor, keine CSS-Klasse, kein Ereignisname, kein Attribut
 * und kein Gerätename. Sie KANN kein Gerät erreichen, weil ihr nichts
 * übergeben wird, womit sie eines erreichen könnte — dieselbe Eigenschaft, auf
 * der schon risk-ladder.js und machine-credit.js beruhen.
 *
 * Bedient wird über Funktionen, nicht über Ereignisse. Das Gerät ruft sie; sie
 * ruft nie zurück.
 *
 *
 * JEDE FUNKTION NIMMT DENSELBEN UMSCHLAG
 * --------------------------------------
 *   at        Versatz in Sekunden ab jetzt. So legt ein Gerät einen Klang
 *             HINTER einen anderen, statt ihn darüberzulegen.
 *   gain      Lautstärkefaktor. 1 ist die vorgesehene Lautstärke des
 *             Bausteins; das Gerät regelt damit, nicht mit eigenen Zahlen.
 *   key       Klangschlüssel für den Mindestabstand in sound.js. OHNE
 *             Schlüssel gibt es KEINE Drosselung — bei einem Klang, der aus
 *             einem Ereignishagel kommen kann, ist das Weglassen ein Fehler.
 *   minGap    Mindestabstand in Sekunden.
 *
 * Rückgabewert ist immer die Kontextzeit, zu der der Klang endet, oder 0, wenn
 * nichts gespielt wurde (Ton aus, keine Nutzergeste, Drosselung). Damit lässt
 * sich anhängen statt überlagern.
 *
 *
 * WARUM HIER Math.random() ERLAUBT IST
 * ------------------------------------
 * Weil hier nichts GEZOGEN wird. Eine Münzkaskade, deren Münzen alle gleich
 * hoch klingen und im exakt gleichen Abstand fallen, ist kein Haufen Münzen,
 * sondern ein Metronom. Die Streuung ist Klangfarbe, kein Spielwert.
 * Spielwerte kommen in diesem Projekt ausnahmslos aus crypto.getRandomValues,
 * und diese Datei zieht keinen einzigen. Dieselbe Begründung steht im Kopf von
 * sound.js über dem Rauschpuffer.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';

/**
 * Liest eine Zahl aus dem Umschlag, mit Ersatzwert.
 *
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function num(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Liest eine Zahl und hält sie in Grenzen.
 *
 * Die Grenzen sind kein Misstrauen gegen den Aufrufer, sondern eine Zusage an
 * das Ohr: eine Tonhöhe mal vierzig wäre kein Klang mehr, sondern ein Zischen,
 * und eine Dauer von zehn Sekunden hielte einen Stimmenplatz zehn Sekunden
 * lang besetzt.
 *
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function clampNum(value, min, max, fallback) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, parsed));
}

/**
 * Die Beschreibung eines RUTSCHENS: Rauschen mit wandernder Filterfrequenz.
 *
 * Steht als eigene Funktion da, weil drei Bausteine dasselbe brauchen — das
 * Blechrutschen selbst, die aufgezogene Kassenschublade und das Ausrollen
 * einer Münze. Drei Stellen mit denselben Zahlen wären drei Wahrheiten über
 * dasselbe Geräusch.
 *
 * @param {{at: number, duration: number, from: number, to: number,
 *          gain: number, q?: number, rate?: number}} spec
 * @returns {object} ein noise-Bauteil für sound.js
 */
function slideNoise(spec) {
	return {
		at: spec.at,
		duration: spec.duration,
		// Ein Rutschen setzt nicht ein, es schwillt an. Ohne diese
		// Anschwellzeit wäre der Anfang ein Stoß, und ein Stoß ist ein
		// Aufschlag, kein Gleiten.
		attack: Math.min(0.03, spec.duration * 0.2),
		gain: spec.gain,
		rate: spec.rate ?? 0.85,
		filter: {
			type: 'bandpass',
			freq: spec.from,
			freqEnd: spec.to,
			q: spec.q ?? 1.3,
		},
	};
}

/**
 * EINE MÜNZE. Aufkommen, Klimpern, wahlweise Ausrollen.
 *
 * Aus drei Teilen, in dieser Reihenfolge hörbar:
 *
 *  1. AUFKOMMEN — ein sehr kurzer heller Rauschstoß. Das ist der Augenblick
 *     der Berührung; ohne ihn beginnt die Münze aus dem Nichts und klingt nach
 *     Glocke statt nach Metall, das irgendwo anschlägt. Darunter der dumpfe
 *     Stoß in der Schale, ein tiefer absackender Ton.
 *  2. KLIMPERN — zwei metallische Teiltöne mit engem Bandpass, der zweite
 *     35 ms später und höher. Ein einzelner Ton klänge nach Piepser; erst der
 *     zweite, versetzte macht daraus etwas, das taumelt.
 *  3. AUSROLLEN — Rauschen mit wandernder Filterfrequenz von hoch nach tief.
 *     Eine Münze, die liegen bleibt, hat das nicht; eine, die in eine Schale
 *     fällt, rollt aus. Deshalb ist es abschaltbar (roll: 0).
 *
 * ZWEI TONHÖHEN, NICHT EINE. pitch bewegt das KLIMPERN, body das AUFKOMMEN und
 * das AUSROLLEN. Der Grund ist praktisch: eine kleine Münze klimpert höher,
 * aber der Behälter, in den sie fällt, bleibt derselbe. Mit einer einzigen
 * Tonhöhe rutschte der dumpfe Stoß in den unhörbaren Bereich, sobald man das
 * Klimpern tiefer stellt.
 *
 * MIT DEN VOREINSTELLUNGEN (pitch 1, body 1, roll 0) ergibt diese Funktion Ton
 * für Ton dieselben Zahlen wie der handgebaute Münzeinwurf aus Teil A: 2100
 * und 2640 Hz, 190 → 150 Hz, Hochpass bei 5000 Hz. Das ist Absicht — jener
 * Klang war freigegeben, und der Baukasten ist für ihn nur der neue
 * Aufbewahrungsort, keine Neufassung.
 *
 * @param {{at?: number, gain?: number, pitch?: number, body?: number,
 *          roll?: number, key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function coin(spec = {}) {
	const at = num(spec.at, 0);
	const level = clampNum(spec.gain, 0, 4, 1);
	const pitch = clampNum(spec.pitch, 0.2, 4, 1);
	const body = clampNum(spec.body, 0.2, 4, 1);
	const roll = clampNum(spec.roll, 0, 2, 0);

	const f1 = 2100 * pitch;
	const f2 = 2640 * pitch;

	const tones = [
		{ type: 'triangle', freq: f1, at, duration: 0.045, gain: 0.14 * level,
			filter: { type: 'bandpass', freq: f1, q: 8 } },
		{ type: 'triangle', freq: f2, at: at + 0.035, duration: 0.06, gain: 0.12 * level,
			filter: { type: 'bandpass', freq: f2, q: 8 } },
		{ type: 'square', freq: 190 * body, freqEnd: 150 * body, at: at + 0.09,
			duration: 0.09, gain: 0.14 * level,
			filter: { type: 'lowpass', freq: 700 * body, q: 0.7 } },
	];

	const noises = [
		{ at, duration: 0.04, gain: 0.07 * level,
			filter: { type: 'highpass', freq: 5000, q: 0.7 } },
	];

	if (roll > 0) {
		noises.push(slideNoise({
			at: at + 0.15,
			duration: Math.min(0.6, 0.18 + roll * 0.22),
			from: 1800 * body,
			to: 520 * body,
			gain: 0.045 * level,
			q: 3,
			rate: 0.8,
		}));
	}

	return sound.sequence({ key: spec.key, minGap: num(spec.minGap, 0.06), tones, noises });
}

/**
 * VIELE MÜNZEN kurz hintereinander, mit Streuung in Tonhöhe und Zeit.
 *
 * WARUM NICHT EINFACH coin() IN EINER SCHLEIFE
 * --------------------------------------------
 * Weil jede Münze dann vier Stimmen kostete. Neun Münzen wären 36 Stimmen für
 * einen Vorgang, der als SUMME gehört wird und nicht als neun Einzelereignisse
 * — und sie belegten diese Plätze vom Augenblick des Planens an (siehe Kopf
 * von sound.js, Sperre 3).
 *
 * Deshalb: je Münze EIN metallischer Ton, und darunter EIN gemeinsames
 * Rauschbett für das Blech der Schale, dessen Filterfrequenz mitwandert,
 * während sich die Schale füllt. Neun Münzen kosten damit zehn Stimmen statt
 * sechsunddreißig, und man hört keinen Unterschied — im Gegenteil: einzelne
 * Aufkommensgeräusche neben dem gemeinsamen Bett klängen doppelt.
 *
 * DIE STREUUNG ist der ganze Unterschied zwischen Münzen und einem Metronom:
 *   Zeit     der Abstand schwankt um rund ein Drittel
 *   Tonhöhe  jede Münze ist eine andere Münze
 *   Fall     der Grundton wandert leicht nach unten — die Schale füllt sich
 *
 * @param {{at?: number, gain?: number, count?: number, spread?: number,
 *          pitch?: number, key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function coinCascade(spec = {}) {
	const at = num(spec.at, 0);
	const level = clampNum(spec.gain, 0, 4, 1);
	const pitch = clampNum(spec.pitch, 0.2, 4, 1);
	// Höchstens neun. Nicht aus Sparsamkeit: ab etwa neun hört man keine
	// einzelnen Münzen mehr, sondern nur noch Dauer — und Dauer allein ist kein
	// Klang, sondern Warten.
	const count = Math.max(2, Math.min(9, Math.trunc(num(spec.count, 4))));
	const spread = clampNum(spec.spread, 0.025, 0.16, 0.055);

	const tones = [];
	let last = at;
	for (let i = 0; i < count; i++) {
		last = i === 0 ? at : last + spread * (0.66 + Math.random() * 0.68);
		const wobble = 0.86 + Math.random() * 0.28;
		const fall = 1 - (i / count) * 0.18;
		const freq = 2093 * pitch * wobble * fall;
		tones.push({
			type: 'triangle',
			freq,
			at: last,
			duration: 0.05,
			gain: 0.085 * level,
			filter: { type: 'bandpass', freq, q: 7 },
		});
	}

	// Auf 0,7 s begrenzt: der Rauschpuffer in sound.js ist eine Sekunde lang
	// und schneidet für jeden Stoß eine zufällige Stelle heraus. Bei einer
	// Dauer nahe der Pufferlänge bliebe dafür kein Spielraum mehr, und jede
	// Kaskade klänge an derselben Stelle gleich.
	const span = Math.min(0.7, Math.max(0.1, last - at + 0.09));

	const noises = [
		slideNoise({
			at,
			duration: span,
			from: 1500 * pitch,
			to: 620 * pitch,
			gain: 0.05 * level,
			q: 1.4,
			rate: 0.9,
		}),
	];

	return sound.sequence({ key: spec.key, minGap: num(spec.minGap, 0.2), tones, noises });
}

/**
 * METALL AUF METALL. Ein harter Anschlag, kurz und ohne Nachklang.
 *
 * Der zweite Teilton liegt bewusst NICHT harmonisch zum ersten: Faktor 2,76
 * statt 2 oder 3. Genau daran erkennt das Ohr Metall. Ein harmonischer Oberton
 * klingt nach Musikinstrument, ein unharmonischer nach Blech, Feder und
 * Anschlag — und darum geht es an einem Gerät aus den 1950er Jahren
 * (CONCEPT.md Abschnitt 3.7: „retro-mechanisch, piepsig-metallisch. Kein
 * Orchester, kein Hollywood.").
 *
 * @param {{at?: number, gain?: number, pitch?: number,
 *          key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function metal(spec = {}) {
	const at = num(spec.at, 0);
	const level = clampNum(spec.gain, 0, 4, 1);
	const pitch = clampNum(spec.pitch, 0.2, 4, 1);
	const f = 620 * pitch;

	return sound.sequence({
		key: spec.key,
		minGap: num(spec.minGap, 0.06),
		noises: [
			{ at, duration: 0.006, attack: 0.0004, gain: 0.16 * level,
				filter: { type: 'highpass', freq: 3200, q: 0.8 } },
			slideNoise({ at: at + 0.004, duration: 0.05, from: f * 1.6, to: f * 0.8,
				gain: 0.09 * level, q: 2.2, rate: 1 }),
		],
		tones: [
			{ type: 'triangle', freq: f, at, duration: 0.09, gain: 0.13 * level,
				filter: { type: 'bandpass', freq: f, q: 5 } },
			{ type: 'triangle', freq: f * 2.76, at, duration: 0.06, gain: 0.06 * level,
				filter: { type: 'bandpass', freq: f * 2.76, q: 6 } },
		],
	});
}

/**
 * BLECHRUTSCHEN. Etwas gleitet über Blech.
 *
 * Ein einziger Rauschstoß, dessen Filterfrequenz von hoch nach tief wandert.
 * Genau dafür ist die Filterrampe in sound.js gebaut worden; ohne sie wären
 * das zwei übereinandergelegte Stöße mit einem hörbaren Absatz in der Mitte.
 *
 * Benutzt für die Kassenschublade und für die Auswurfschale, in die Münzen
 * fallen.
 *
 * @param {{at?: number, gain?: number, duration?: number, from?: number,
 *          to?: number, key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function sheet(spec = {}) {
	const level = clampNum(spec.gain, 0, 4, 1);
	return sound.noise({
		key: spec.key,
		minGap: num(spec.minGap, 0.08),
		...slideNoise({
			at: num(spec.at, 0),
			duration: clampNum(spec.duration, 0.05, 1, 0.22),
			from: clampNum(spec.from, 60, 12000, 1400),
			to: clampNum(spec.to, 40, 12000, 380),
			gain: 0.085 * level,
		}),
	});
}

/**
 * KLINKE / RASTWERK. Eine Reihe sehr kurzer Klicks.
 *
 * Die Abstände werden von Klick zu Klick KÜRZER (tighten unter 1). So klingt
 * eine Klinke, die in ein anlaufendes Werk einrastet. Gleiche Abstände klängen
 * nach Uhr, größer werdende nach Auslaufen — beides ist etwas anderes.
 *
 * Jeder Klick ist ein Rauschstoß von fünf Millisekunden. Fünf Millisekunden
 * haben keine Tonhöhe, sondern nur einen Ort im Frequenzband; genau das ist
 * ein Klick.
 *
 * @param {{at?: number, gain?: number, count?: number, step?: number,
 *          tighten?: number, pitch?: number, key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function ratchet(spec = {}) {
	const at = num(spec.at, 0);
	const level = clampNum(spec.gain, 0, 4, 1);
	const pitch = clampNum(spec.pitch, 0.2, 4, 1);
	const count = Math.max(1, Math.min(8, Math.trunc(num(spec.count, 3))));
	const tighten = clampNum(spec.tighten, 0.5, 1.5, 0.88);
	let gap = clampNum(spec.step, 0.006, 0.12, 0.022);

	const noises = [];
	let t = at;
	for (let i = 0; i < count; i++) {
		noises.push({
			at: t,
			duration: 0.005,
			attack: 0.0004,
			// Nach hinten leiser: die Klinke fällt ein, sie schlägt nicht
			// dreimal gleich hart zu.
			gain: 0.15 * level * (1 - i / (count * 2)),
			filter: { type: 'highpass', freq: 3400 * pitch, q: 0.9 },
		});
		t += gap;
		gap *= tighten;
	}

	return sound.sequence({ key: spec.key, minGap: num(spec.minGap, 0.05), noises });
}

/**
 * REGISTRIERKASSE. Glocke, dann die aufgezogene Schublade.
 *
 * Vorhanden war das schon (Teil A, Phase 10, zweiter Durchgang); B.7 verlangt
 * die Verallgemeinerung. Neu ist deshalb nur, dass es hier steht statt im
 * Gerät — und der Regler size.
 *
 * DIE GLOCKE sind zwei Dreiecktöne im Quintabstand mit sehr engem Bandpass.
 * Das ist der metallische Anschlag; das enge Filter macht aus einem Dreieck
 * einen Glockenton, ohne dass dafür ein zweiter Oszillator nötig wäre.
 *
 * DIE SCHUBLADE ist ein Rutschen (siehe sheet()), 85 ms nach der Glocke. Nicht
 * gleichzeitig: erst klingelt es, dann geht die Lade auf. Umgekehrt wäre es
 * keine Kasse, sondern ein Geräusch.
 *
 * size (0 bis 1) regelt beides zugleich: eine kleine Buchung klingelt kürzer
 * und leiser als eine große. Das ist der Unterschied zwischen „reich" und
 * „aufdringlich" — bei einem Gewinn, der in gut einem Drittel aller Züge
 * fällt, darf die Kasse nicht wie ein Jackpot klingen.
 *
 * @param {{at?: number, gain?: number, size?: number, pitch?: number,
 *          key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function cashRegister(spec = {}) {
	const at = num(spec.at, 0);
	const level = clampNum(spec.gain, 0, 4, 1);
	const size = clampNum(spec.size, 0, 1, 0.5);
	const bell = 2489 * clampNum(spec.pitch, 0.5, 2, 1);

	return sound.sequence({
		key: spec.key,
		minGap: num(spec.minGap, 0.25),
		tones: [
			{ type: 'triangle', freq: bell, at, duration: 0.11 + size * 0.09,
				gain: (0.070 + size * 0.045) * level,
				filter: { type: 'bandpass', freq: bell, q: 12 } },
			{ type: 'triangle', freq: bell * 1.335, at: at + 0.004,
				duration: 0.075 + size * 0.045, gain: (0.030 + size * 0.022) * level,
				filter: { type: 'bandpass', freq: bell * 1.335, q: 12 } },
		],
		noises: [
			{ at, duration: 0.05, gain: 0.05 * level,
				filter: { type: 'highpass', freq: 6000, q: 0.7 } },
			slideNoise({ at: at + 0.085, duration: 0.09 + size * 0.09,
				from: 900, to: 300, gain: 0.075 * level }),
		],
	});
}

/**
 * EIN SCHRITT einer aufsteigenden Tonfolge beim Hochzählen.
 *
 * CONCEPT.md B.7: „Aufsteigende Tonfolge beim Hochzählen eines Gewinns, an die
 * Zählgeschwindigkeit gekoppelt." GEKOPPELT heißt: das Gerät ruft diese
 * Funktion EINMAL JE SICHTBAREM ZÄHLSCHRITT und übergibt, der wievielte von
 * wie vielen es ist. Nicht: eine Folge im Voraus planen, die dieselbe Fahrt
 * ein zweites Mal nachrechnet.
 *
 * Der Unterschied ist nicht kosmetisch. Eine vorausgeplante Folge belegt ihre
 * Stimmenplätze sofort und alle auf einmal, und sie geht falsch, sobald die
 * Fahrt unterwegs ein neues Ziel bekommt — was sie darf.
 *
 * DIE LEITER IST PENTATONISCH: fünf Stufen je Oktave, ohne Halbtonschritt.
 * Der Grund ist nicht Geschmack, sondern Robustheit: eine Pentatonik klingt in
 * JEDER Reihenfolge und JEDER Länge richtig. Eine gewöhnliche Tonleiter bliebe
 * bei einer abgebrochenen Fahrt auf einem Ton stehen, der nach „unfertig"
 * klingt — und Fahrten brechen ab, denn zwölf Schritte reichen für jeden
 * Betrag, aber nicht jeder Betrag braucht zwölf.
 *
 * @param {{index?: number, steps?: number, at?: number, gain?: number,
 *          base?: number, key?: string, minGap?: number}} spec
 * @returns {number} Kontextzeit des Endes; 0, wenn nichts gespielt wurde
 */
export function countStep(spec = {}) {
	const steps = Math.max(1, Math.trunc(num(spec.steps, 1)));
	const index = Math.max(0, Math.min(steps, Math.trunc(num(spec.index, 0))));
	const level = clampNum(spec.gain, 0, 4, 1);
	const base = clampNum(spec.base, 100, 4000, 784);

	// Zehn Sprossen über knapp zwei Oktaven, gleichmäßig über die Fahrt
	// verteilt: eine Fahrt über drei Schritte steigt genauso weit wie eine über
	// zwölf, sie steigt nur in größeren Schritten.
	const RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
	const rung = Math.round((index / steps) * 9);
	const freq = base * RATIOS[rung % 5] * 2 ** Math.floor(rung / 5);

	return sound.tone({
		key: spec.key,
		minGap: num(spec.minGap, 0.03),
		type: 'triangle',
		freq,
		at: num(spec.at, 0),
		duration: 0.055,
		attack: 0.001,
		// Leise. Dieser Klang kommt zwölfmal hintereinander und begleitet nur;
		// er darf die Kasse nicht übertönen, unter der er läuft.
		gain: 0.055 * level,
		filter: { type: 'bandpass', freq, q: 6 },
	});
}

export default {
	coin,
	coinCascade,
	metal,
	sheet,
	ratchet,
	cashRegister,
	countStep,
};
