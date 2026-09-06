/**
 * Roulette – Rad und Kugel
 * ========================
 *
 * CONCEPT.md C.5.1, der Satz, an dem diese Datei hängt:
 *
 *   „Das Ergebnis einer Runde entsteht AUS DER SIMULATION. Es wird NICHT
 *    vorher gezogen und die Animation dann darauf hingelenkt. Zufällig ist
 *    allein, WOMIT die Simulation startet — Kräfte, Winkel, Anstoßpunkte —,
 *    nicht, wie sie ausgeht."
 *
 * Es gibt in dieser Datei deshalb keine Zeile, die ein Fach auswählt. Es gibt
 * nur eine Kugel, die läuft, stößt und irgendwann liegen bleibt. Wo sie liegt,
 * wird abgelesen.
 *
 * KEIN IMPORT, KEIN DOKUMENT, KEINE UHR
 * -------------------------------------
 * Kein import, kein document, kein window, kein localStorage, kein
 * Math.random, kein Date, kein performance. CONCEPT.md C.5.3: „Die Physik
 * liegt in Dateien ohne Importe aus dem Browserumfeld, damit Node sie ohne
 * Bild laden kann. Der Nachweis rechnet mit DIESEN Dateien, nicht mit einer
 * Nachbildung."
 *
 * Der Zufallsgeber wird EINGESPEIST: new Wheel({ random }). Im Spiel ist das
 * drawUint32() aus rng.js, im Nachweis createSeeded(saat). Das ist die eine
 * benannte Stelle aus C.5.2.
 *
 * NUR BITGENAU FESTGELEGTE RECHENARTEN
 * ------------------------------------
 * + − * / sowie Math.abs, Math.min, Math.max, Math.floor, Math.ceil,
 * Math.sqrt, Math.imul — mehr nicht. Keine Winkelfunktion, keine
 * Potenzfunktion, kein Rest-Operator auf Fließkommazahlen, keine Uhr. Nur
 * diese Rechenarten legt die Sprachnorm bitgenau fest; nur so gilt „gleicher
 * Startzustand plus gleiche Zufallsfolge ergibt exakt denselben Verlauf" auch
 * auf einer anderen Maschine (dieselbe Regel wie beim Münzschieber,
 * DECISIONS.md 2026-09-03).
 *
 * WARUM DAS RAD OHNE SINUS AUSKOMMT
 * ---------------------------------
 * Es wird durchgehend in Polarkoordinaten gerechnet: Winkel, Winkel-
 * geschwindigkeit, Halbmesser, Radialgeschwindigkeit, Sprunghöhe. In diesen
 * Größen ist jede Bewegungsgleichung eine Strich- und Punktrechnung, und jede
 * Kollision ist ein Vergleich von Winkelabständen oder Halbmessern. Ein Sinus
 * wäre erst nötig, um daraus x und y zu machen — und das tut der Browser beim
 * Zeichnen (siehe wheel-view.js und wheel.css), nicht diese Datei.
 *
 * DIE WINKELEINHEIT IST DIE UMDREHUNG
 * -----------------------------------
 * Eine volle Drehung ist 1.0, eine halbe 0.5. Damit ist Math.PI nie nötig, das
 * Zeichnen braucht nur eine Multiplikation, und der Fachzeiger ist
 * floor(Winkel × 38). Gewickelt wird mit t − Math.floor(t): der
 * Rest-Operator % steht nicht in der Liste der bitgenauen Rechenarten.
 *
 * DER LAUF IN FÜNF ABSCHNITTEN
 * ----------------------------
 *   'ruht'      keine Kugel im Rad; nur die Radscheibe dreht sich weiter
 *   'bahn'      die Kugel rollt auf der äußeren Laufbahn, an der Wand
 *   'abstieg'   die Wand trägt nicht mehr, die Kugel fällt nach innen und
 *               kann eine der acht Rauten treffen
 *   'rotor'     die Kugel ist auf der drehenden Scheibe, springt über Rillen
 *   'liegt'     sie ruht in genau einem Fach; das Ergebnis steht
 *
 * DAS RAD WIRD ZWISCHEN DEN RUNDEN NIE ZURÜCKGESETZT (C.6.2). wheelTurn läuft
 * über alle Runden hinweg weiter; launch() gibt der Scheibe nur einen neuen
 * Schwung, genau wie ein Croupier.
 */

/* ------------------------------------------------ Zeit und Zeitschritte */

/**
 * Fester Zeitschritt: 240 Rechenschritte je Sekunde. Vier je Bild bei 60
 * Bildern/s. Dieselbe Zahl wie beim Münzschieber, aus demselben Grund: ein
 * Stoß gegen eine Rille von 0,35 Grad Breite darf nicht zwischen zwei
 * Schritte fallen.
 */
export const DT = 1 / 240;
export const SUBSTEPS = 4;

/**
 * Höchstens acht Bilder werden nach einem langen Stillstand nachgeholt
 * (versteckter Tab, blockierender Vorgang). Was darüber liegt, wird verworfen,
 * nicht aufgehoben — dieselbe Festlegung und dieselbe Begründung wie beim
 * Münzschieber (DECISIONS.md 2026-09-03 13:23).
 */
export const MAX_CATCHUP_STEPS = SUBSTEPS * 8;

/**
 * Notbremse: nach 45 Sekunden Laufzeit wird die Kugel in das Fach gelegt,
 * über dem sie gerade steht. Sie darf NIE greifen — verify-physics.mjs P-8
 * prüft über 20.000 Läufe, dass sie es nicht tut. Sie steht hier trotzdem,
 * weil „ein Lauf ohne Ergebnis ist nicht möglich" (C.6.3) eine Zusage ist und
 * keine Hoffnung.
 */
export const MAX_STEPS = 240 * 45;

/* -------------------------------------------------------- Maßordnung */
/* Dieselben Zahlen wie in der Zeichnung (Wheel.html, viewBox 0 0 200 200,
   Mittelpunkt 100/100). verify-wheel.mjs vergleicht beide. */

export const POCKET_COUNT = 38;
export const TRACK_RADIUS = 88;
export const DEFLECTOR_RADIUS = 72;
export const ROTOR_RADIUS = 62;
export const POCKET_RADIUS = 50;
export const CONE_RADIUS = 34;
export const BALL_RADIUS = 3;
export const DEFLECTOR_COUNT = 8;

/* --------------------------------------------- Antrieb und Reibung */

/**
 * Dm und Am aus CONCEPT.md C.6.2 — die FESTEN Mittelwerte, die nie gezogen
 * werden, und die ausdrücklich VERSCHIEDEN voneinander sein müssen. Einheit:
 * Umdrehungen je Sekunde.
 *
 * Die Kugel läuft rund viermal so schnell wie das Rad. Das ist das Verhältnis
 * an einem echten Tisch und zugleich die Voraussetzung für einen langen Lauf:
 * je öfter die Kugel das Rad überholt, desto stärker wirkt sich eine winzige
 * Änderung der Anstoßkraft auf das Ergebnis aus.
 */
export const WHEEL_DRIVE_MEAN = 0.62;
export const BALL_DRIVE_MEAN = 2.35;

/** Reibung der Radscheibe: sie kommt nach rund 40 s von selbst zur Ruhe. */
export const WHEEL_FRICTION = 0.016;

/**
 * Reibung der Kugel auf der Bahn, in zwei Anteilen: ein fester (Rollreibung)
 * und ein geschwindigkeitsabhängiger (Luft). Der zweite ist der Grund, warum
 * ein kräftiger Wurf nicht einfach länger dauert, sondern anders verläuft.
 */
export const BALL_FRICTION_LIN = 0.055;
export const BALL_FRICTION_QUAD = 0.030;

/**
 * Unter dieser Winkelgeschwindigkeit trägt die Bahnwand die Kugel nicht mehr
 * und sie fällt nach innen. Physikalisch der Punkt, an dem die Fliehkraft
 * kleiner wird als die Hangabtriebskraft.
 */
export const LEAVE_SPEED = 0.78;

/** Beschleunigung nach innen im Abstieg, in Radeinheiten je Sekunde². */
export const FALL_ACCEL = 26;

/**
 * Anteil der Drehimpulserhaltung beim Einwärtsfallen: eine Kugel, die nach
 * innen rutscht, wird schneller (dasselbe wie eine Eiskunstläuferin, die die
 * Arme anlegt). 1 wäre die reibungsfreie Erhaltung; 0,55 ist der Anteil, der
 * die Reibung auf der schrägen Wand berücksichtigt.
 */
export const SPIN_UP = 0.55;

/**
 * CONCEPT.md C.6.3: „Die Kugel hat eine Höchstgeschwindigkeit, die ein Stoß
 * erzeugen kann. Kein Stoß kann sie über die Laufbahnwand hinaus
 * beschleunigen." Diese Schranke wird nach JEDEM Stoß angelegt.
 */
export const MAX_BALL_SPEED = 3.2;

/* ------------------------------------------------------------ Rauten */

/** Halbe Winkelbreite einer Raute, in Umdrehungen (rund 6,5 Grad). */
export const DEFLECTOR_HALF = 0.018;

/** Anteil der Winkelgeschwindigkeit, der einen Rautenstoß übersteht. */
export const DEFLECTOR_KEEP = 0.34;

/**
 * Wie stark der Auftreffpunkt den Ausgang spreizt. Mit KEEP 0,34 und SPREAD
 * 0,46 reicht das Ergebnis von −0,12 bis +0,80: ein Streifschuss am Rand
 * schickt die Kugel weiter, ein Volltreffer kann sie sogar zurückwerfen.
 * GENAU DAS ist der Punkt, an dem eine Änderung im dritten Nachkommastellen
 * der Anstoßkraft das Ergebnis vollständig ändert — und damit die Quelle der
 * Gleichverteilung.
 */
export const DEFLECTOR_SPREAD = 0.46;

/** Sprunggeschwindigkeit nach oben nach einem Rautentreffer. */
export const DEFLECTOR_HOP = 9;

/* ------------------------------------------------- Rillen und Fächer */

/** Halbe Winkelbreite einer Rille, in Umdrehungen (rund 1,26 Grad). */
export const FRET_HALF = 0.0035;

/** Anteil der Relativgeschwindigkeit, der einen Rillenstoß übersteht. */
export const FRET_RESTITUTION = 0.55;

/** Sprunghöhe nach einem Rillenstoß, je Einheit Relativgeschwindigkeit. */
export const FRET_HOP = 2.2;

/**
 * Unter dieser Relativgeschwindigkeit kommt die Kugel nicht mehr über eine
 * Rille. Sie fällt dann in das Fach zurück, aus dem sie kam.
 */
export const FRET_CLIMB_SPEED = 0.20;

/** Reibung der Radscheibe an der Kugel: sie zieht die Kugel auf Radtempo. */
export const ROTOR_FRICTION = 0.9;

/** Unterhalb dieser Relativgeschwindigkeit gilt die Kugel als liegend. */
export const REST_SPEED = 0.055;

/** Fallbeschleunigung für die Sprunghöhe, in Radeinheiten je Sekunde². */
export const GRAVITY = 62;

/** Anteil der Sprunggeschwindigkeit, der ein Aufkommen übersteht. */
export const BOUNCE_KEEP = 0.42;

/** Wickelt einen Winkel auf [0, 1). Ohne Rest-Operator, siehe Kopfkommentar. */
function wrap(turn) {
	return turn - Math.floor(turn);
}

/**
 * Zieht eine ganze Zahl aus [0, bound) — gleichverteilt, mit dem
 * Verwerfungsverfahren aus CONCEPT.md C.5.2. Eine Restdivision auf den rohen
 * Zufallswert ist dort ausdrücklich verboten: 2^32 ist weder durch 201 noch
 * durch 360 teilbar, und ein schlichtes „wert % bound" bevorzugte die
 * niedrigen Werte. Der überstehende Rest wird deshalb verworfen und neu
 * gezogen; die Schleife läuft praktisch immer genau einmal.
 *
 * Steht hier und nicht in rng.js, weil diese Datei importfrei bleiben muss.
 */
function zieheGanzzahl(random, bound) {
	const RANGE = 4294967296;
	const limit = RANGE - (RANGE % bound);
	let wert;
	do {
		wert = random();
	} while (wert >= limit);
	return wert % bound;
}

/**
 * Verringert einen Betrag um „amount", ohne das Vorzeichen umzudrehen.
 * Reibung bremst; sie beschleunigt nie rückwärts.
 */
function decay(omega, amount) {
	if (omega > 0) {
		const neu = omega - amount;
		return neu < 0 ? 0 : neu;
	}
	if (omega < 0) {
		const neu = omega + amount;
		return neu > 0 ? 0 : neu;
	}
	return 0;
}

/** Betrag ohne Math.abs an heißen Stellen — Math.abs ist erlaubt, dies ist Geschmack. */
function betrag(x) {
	return x < 0 ? -x : x;
}

export class Wheel {
	/**
	 * @param {{random: function(): number, wheelTurn?: number, direction?: number}} options
	 *   random     liefert eine vorzeichenlose 32-Bit-Zahl. DIE eine Stelle,
	 *              an der das Spiel und der Nachweis sich unterscheiden
	 *              (CONCEPT.md C.5.2).
	 *   wheelTurn  Anfangsstellung der Radscheibe. Vorgabe 0.
	 *   direction  Drehrichtung der Scheibe für die ERSTE Runde, +1 oder −1.
	 *              Danach wechselt sie von selbst je Runde (C.6.2).
	 */
	constructor({ random, wheelTurn = 0, direction = 1 }) {
		if (typeof random !== 'function') {
			throw new TypeError('Wheel braucht einen Zufallsgeber: new Wheel({ random }).');
		}
		this.random = random;

		/* Zustand der Radscheibe — überlebt jede Runde (C.6.2). */
		this.wheelTurn = wrap(wheelTurn);
		this.wheelOmega = 0;
		this.direction = direction < 0 ? -1 : 1;

		/* Zustand der Kugel. */
		this.phase = 'ruht';
		this.ballTurn = 0;
		this.ballOmega = 0;
		this.ballR = 0;
		this.ballVr = 0;
		this.ballH = 0;
		this.ballVh = 0;
		this.lastOmegaRel = 0;

		this.steps = 0;
		/** @type {number|null} Fachzeiger 0…37, sobald die Kugel liegt. */
		this.result = null;
		/** Für den Nachweis: was in diesem Lauf gezogen wurde. */
		this.draw = null;
	}

	/**
	 * Wirft die Kugel ein und gibt dem Rad einen neuen Schwung.
	 *
	 * ES WIRD NUR DER START GEZOGEN, NIE DAS ERGEBNIS (C.5.1). Gezogen werden
	 * genau drei Dinge, alle mit dem Verwerfungsverfahren:
	 *
	 *   d  ∈ {0,900 … 1,100} in Tausendstelschritten (201 Werte), Drehkraft
	 *      des Rades: die tatsächliche Kraft ist d × Dm      (C.6.2)
	 *   a  ∈ derselben Menge, Anstoßkraft der Kugel: a × Am  (C.6.2)
	 *   e  Einwurfpunkt auf der Laufbahn, 1/360 Umdrehung genau (C.6.2)
	 *
	 * NICHT gezogen wird die Drehrichtung: sie wechselt je Runde, wie am
	 * echten Tisch (C.6.2). Und NICHT zurückgesetzt wird die Stellung der
	 * Radscheibe: „Das Rad dreht dort weiter, wo es stehen geblieben ist."
	 * Genau diese fortlaufende, nie zurückgesetzte Stellung ist die Quelle,
	 * aus der die Gleichverteilung am Ende kommt.
	 *
	 * @returns {boolean} false, wenn schon eine Kugel unterwegs ist
	 */
	launch() {
		if (this.phase !== 'ruht' && this.phase !== 'liegt') {
			return false;
		}
		this.direction = -this.direction;

		const dIndex = zieheGanzzahl(this.random, 201);
		const aIndex = zieheGanzzahl(this.random, 201);
		const eIndex = zieheGanzzahl(this.random, 360);
		const d = (900 + dIndex) / 1000;
		const a = (900 + aIndex) / 1000;

		this.draw = { d, a, entry: eIndex };

		this.wheelOmega = this.direction * d * WHEEL_DRIVE_MEAN;
		this.ballOmega = -this.direction * a * BALL_DRIVE_MEAN;
		this.ballTurn = wrap(this.wheelTurn + eIndex / 360);
		this.ballR = TRACK_RADIUS;
		this.ballVr = 0;
		this.ballH = 0;
		this.ballVh = 0;
		this.lastOmegaRel = this.ballOmega - this.wheelOmega;

		this.phase = 'bahn';
		this.steps = 0;
		this.result = null;
		return true;
	}

	/** Ein fester Zeitschritt. */
	step() {
		/* Die Radscheibe läuft IMMER — auch ohne Kugel, auch nach dem
		   Ergebnis. Das ist die sichtbare Seite von C.6.2. */
		this.wheelOmega = decay(this.wheelOmega, WHEEL_FRICTION * DT);
		this.wheelTurn = wrap(this.wheelTurn + this.wheelOmega * DT);

		if (this.phase === 'ruht' || this.phase === 'liegt') {
			if (this.phase === 'liegt') {
				/* Eine liegende Kugel fährt mit dem Rad mit. */
				this.ballTurn = wrap(this.ballTurn + this.wheelOmega * DT);
			}
			return;
		}

		this.steps += 1;
		if (this.steps >= MAX_STEPS) {
			this.forceSettle();
			return;
		}

		if (this.phase === 'bahn') {
			this.stepTrack();
		} else if (this.phase === 'abstieg') {
			this.stepDescent();
		} else {
			this.stepRotor();
		}

		this.clamp();
	}

	stepTrack() {
		const speed = betrag(this.ballOmega);
		this.ballOmega = decay(
			this.ballOmega,
			(BALL_FRICTION_LIN + BALL_FRICTION_QUAD * speed) * DT
		);
		this.ballTurn = wrap(this.ballTurn + this.ballOmega * DT);
		if (betrag(this.ballOmega) < LEAVE_SPEED) {
			this.phase = 'abstieg';
			this.ballVr = 0;
		}
	}

	stepDescent() {
		const speed = betrag(this.ballOmega);
		this.ballOmega = decay(
			this.ballOmega,
			(BALL_FRICTION_LIN + BALL_FRICTION_QUAD * speed) * DT
		);

		const rVorher = this.ballR;
		this.ballVr += FALL_ACCEL * DT;
		let rNeu = this.ballR - this.ballVr * DT;
		if (rNeu < CONE_RADIUS) {
			rNeu = CONE_RADIUS;
		}

		/* Drehimpuls: einwärts wird die Kugel winkelschneller. */
		this.ballOmega = this.ballOmega * (1 + SPIN_UP * (rVorher - rNeu) / rNeu);
		this.ballR = rNeu;
		this.ballTurn = wrap(this.ballTurn + this.ballOmega * DT);

		/* Rauten: nur beim Überschreiten des Rautenringes von außen nach
		   innen, und dann genau einmal. */
		if (rVorher > DEFLECTOR_RADIUS && rNeu <= DEFLECTOR_RADIUS) {
			this.hitDeflector();
		}

		if (this.ballR <= ROTOR_RADIUS) {
			this.phase = 'rotor';
		}
	}

	/**
	 * Ein Stoß gegen eine der acht Rauten.
	 *
	 * Die Rauten sitzen auf dem FESTEN Teil der Schüssel, also bei den
	 * absoluten Winkeln 0, 1/8, 2/8 … Getroffen wird, wenn der Winkelabstand
	 * zur nächsten Rautenmitte kleiner ist als ihre halbe Breite.
	 *
	 * Der Ausgang hängt allein davon ab, WO die Kugel die Raute trifft:
	 * mittig bremst stark und wirft hoch, am Rand streift nur. Nichts wird
	 * gezogen — genau das verlangt C.5.1.
	 */
	hitDeflector() {
		const inRauten = this.ballTurn * DEFLECTOR_COUNT;
		const anteil = inRauten - Math.floor(inRauten);
		const versatz = anteil < 0.5 ? anteil : anteil - 1;   // −0,5 … +0,5
		const versatzTurn = versatz / DEFLECTOR_COUNT;
		if (betrag(versatzTurn) >= DEFLECTOR_HALF) {
			return;                                            // vorbei
		}
		const t = versatzTurn / DEFLECTOR_HALF;                // −1 … +1
		this.ballOmega = this.ballOmega * (DEFLECTOR_KEEP + DEFLECTOR_SPREAD * t);
		this.ballVh = DEFLECTOR_HOP * (1 - betrag(t));
		this.ballVr = this.ballVr * 0.35;
	}

	stepRotor() {
		/* Sprunghöhe. Solange die Kugel in der Luft ist, sieht sie keine
		   Rille — genau deshalb springt eine echte Kugel über mehrere
		   Fächer hinweg. */
		if (this.ballH > 0 || this.ballVh > 0) {
			this.ballVh -= GRAVITY * DT;
			this.ballH += this.ballVh * DT;
			if (this.ballH <= 0) {
				this.ballH = 0;
				this.ballVh = this.ballVh < 0 ? -this.ballVh * BOUNCE_KEEP : 0;
				if (this.ballVh < 1) {
					this.ballVh = 0;
				}
			}
		}

		/* Weiter nach innen, bis die Fachmitte erreicht ist. */
		if (this.ballR > POCKET_RADIUS) {
			this.ballVr += FALL_ACCEL * DT * 0.5;
			const rNeu = this.ballR - this.ballVr * DT;
			this.ballR = rNeu < POCKET_RADIUS ? POCKET_RADIUS : rNeu;
		}

		/* Die Scheibe zieht die Kugel auf ihr eigenes Tempo. */
		const omegaRel = this.ballOmega - this.wheelOmega;
		this.ballOmega = this.wheelOmega + decay(omegaRel, ROTOR_FRICTION * DT);
		this.ballTurn = wrap(this.ballTurn + this.ballOmega * DT);

		const relNachher = this.ballOmega - this.wheelOmega;
		if (relNachher !== 0) {
			this.lastOmegaRel = relNachher;
		}

		/* Rillen sieht nur eine aufliegende Kugel. */
		if (this.ballH === 0) {
			this.hitFret(relNachher);
		}

		/* Ruhebedingung (C.6.3): langsam GEGENÜBER DEM RAD, aufliegend,
		   unten angekommen. */
		if (this.ballH === 0
			&& this.ballR <= POCKET_RADIUS
			&& betrag(relNachher) < REST_SPEED) {
			this.settle();
		}
	}

	/**
	 * Stoß gegen eine Rille (CONCEPT.md C.6.3: „Die Rillen sind Körper mit
	 * Kollision, kein gemaltes Muster").
	 *
	 * Gemessen wird der Winkelabstand zur nächsten Fachkante, RELATIV zum
	 * drehenden Rad. Ist die Kugel nah genug an einer Kante:
	 *
	 *   schnell genug  → sie springt darüber und wird zurückgeworfen
	 *   zu langsam     → sie kommt nicht darüber und fällt in ihr Fach zurück
	 */
	hitFret(omegaRel) {
		const rel = wrap(this.ballTurn - this.wheelTurn);
		const inFaechern = rel * POCKET_COUNT;
		const anteil = inFaechern - Math.floor(inFaechern);
		const abstand = anteil < 0.5 ? anteil : 1 - anteil;
		const abstandTurn = abstand / POCKET_COUNT;
		if (abstandTurn >= FRET_HALF) {
			return;
		}
		const tempo = betrag(omegaRel);
		if (tempo < FRET_CLIMB_SPEED) {
			/* Die Rille hält sie auf. Sie bleibt in dem Fach, aus dem sie
			   kam — die Richtung der letzten Restbewegung entscheidet. */
			this.ballOmega = this.wheelOmega;
			this.ballVh = 0;
			this.settle();
			return;
		}
		const neuRel = -omegaRel * FRET_RESTITUTION;
		this.ballOmega = this.wheelOmega + neuRel;
		this.ballVh = FRET_HOP * tempo;
		this.lastOmegaRel = neuRel;
	}

	/**
	 * Liest ab, in welchem Fach die Kugel liegt.
	 *
	 * Der Grenzfall aus C.6.3 („Kommt sie in einer Rille zur Ruhe — was
	 * physikalisch ein Grenzfall ist —, entscheidet die Richtung der letzten
	 * Restbewegung"): steht die Kugel innerhalb einer halben Rillenbreite auf
	 * einer Kante, fällt sie in das Fach, aus dem sie kam. Lief sie relativ
	 * zum Rad vorwärts, ist das das Fach dahinter; lief sie rückwärts, das
	 * davor.
	 */
	settle() {
		const rel = wrap(this.ballTurn - this.wheelTurn);
		const inFaechern = rel * POCKET_COUNT;
		let zeiger = Math.floor(inFaechern);
		const anteil = inFaechern - zeiger;

		const aufKante = anteil < FRET_HALF * POCKET_COUNT
			|| anteil > 1 - FRET_HALF * POCKET_COUNT;
		if (aufKante) {
			if (anteil < 0.5 && this.lastOmegaRel > 0) {
				zeiger -= 1;
			} else if (anteil > 0.5 && this.lastOmegaRel < 0) {
				zeiger += 1;
			}
			zeiger = zeiger < 0 ? zeiger + POCKET_COUNT : zeiger;
			zeiger = zeiger >= POCKET_COUNT ? zeiger - POCKET_COUNT : zeiger;
		}

		/* Die Kugel setzt sich mittig ins Fach und fährt fortan mit. */
		this.ballTurn = wrap(this.wheelTurn + (zeiger + 0.5) / POCKET_COUNT);
		this.ballR = POCKET_RADIUS;
		this.ballVr = 0;
		this.ballH = 0;
		this.ballVh = 0;
		this.ballOmega = this.wheelOmega;
		this.phase = 'liegt';
		this.result = zeiger;
	}

	/**
	 * Notbremse nach MAX_STEPS. Sie legt die Kugel in das Fach, über dem sie
	 * gerade steht — sie WÄHLT keins. Ein Lauf ohne Ergebnis ist damit
	 * ausgeschlossen (C.6.3), und P-8 weist nach, dass sie nie greift.
	 */
	forceSettle() {
		this.ballR = POCKET_RADIUS;
		this.ballH = 0;
		this.ballVh = 0;
		this.settle();
	}

	/**
	 * Die zwei harten Zusagen aus C.6.3, nach jedem Schritt angelegt:
	 * die Kugel verlässt das Rad nie, und kein Stoß beschleunigt sie über
	 * ihre Höchstgeschwindigkeit hinaus.
	 *
	 * Der Rücksprung an der Bahnwand ist ein echter Stoß und keine stille
	 * Berichtigung: eine Kugel, die von einer Raute nach außen geworfen wird,
	 * prallt an der Wand ab und kommt zurück.
	 */
	clamp() {
		if (this.ballR > TRACK_RADIUS) {
			this.ballR = TRACK_RADIUS;
			this.ballVr = this.ballVr < 0 ? -this.ballVr * 0.4 : this.ballVr;
		}
		if (this.ballR < CONE_RADIUS) {
			this.ballR = CONE_RADIUS;
			this.ballVr = this.ballVr > 0 ? -this.ballVr * 0.4 : this.ballVr;
		}
		if (this.ballOmega > MAX_BALL_SPEED) {
			this.ballOmega = MAX_BALL_SPEED;
		} else if (this.ballOmega < -MAX_BALL_SPEED) {
			this.ballOmega = -MAX_BALL_SPEED;
		}
	}

	/**
	 * Lässt einen Lauf ohne Bild bis zum Ende rechnen und liefert den
	 * Fachzeiger. DIE Methode, mit der der Nachweis arbeitet — und dieselbe,
	 * die die Ansicht bei „Bewegung reduzieren" benutzt.
	 * @returns {number} 0…37
	 */
	runToRest() {
		if (this.phase === 'ruht' || this.phase === 'liegt') {
			this.launch();
		}
		while (this.phase !== 'liegt') {
			this.step();
		}
		return this.result;
	}

	/** Momentaufnahme für Prüfskripte und für die Ansicht. */
	snapshot() {
		return {
			phase: this.phase,
			wheelTurn: this.wheelTurn,
			wheelOmega: this.wheelOmega,
			direction: this.direction,
			ballTurn: this.ballTurn,
			ballOmega: this.ballOmega,
			ballR: this.ballR,
			ballVr: this.ballVr,
			ballH: this.ballH,
			ballVh: this.ballVh,
			steps: this.steps,
			result: this.result,
		};
	}
}

export default Wheel;
