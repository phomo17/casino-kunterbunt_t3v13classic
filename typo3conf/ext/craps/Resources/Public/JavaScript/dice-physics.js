/**
 * Craps – zwei Würfel in einer Wanne
 * ===================================
 *
 * CONCEPT.md C.5.1, der Satz, an dem diese Datei hängt:
 *
 *   „Das Ergebnis einer Runde entsteht AUS DER SIMULATION. Es wird NICHT
 *    vorher gezogen und die Animation dann darauf hingelenkt. Zufällig ist
 *    allein, WOMIT die Simulation startet — Kräfte, Winkel, Anstoßpunkte —,
 *    nicht, wie sie ausgeht."
 *
 * Es gibt in dieser Datei deshalb keine Zeile, die eine Augenzahl auswählt.
 * Es gibt nur zwei Würfel, die fliegen, aufkommen, kippen, abprallen und
 * irgendwann liegen bleiben. Was oben liegt, wird abgelesen.
 *
 * KEIN IMPORT, KEIN DOKUMENT, KEINE UHR
 * -------------------------------------
 * Kein import, kein document, kein window, kein localStorage, kein
 * Math.random, kein Date, kein performance (CONCEPT.md C.5.3). Der
 * Zufallsgeber wird EINGESPEIST: new DiceTable({ random }). Im Spiel ist das
 * drawUint32() aus rng.js, im Nachweis createSeeded(saat) — die eine benannte
 * Wechselstelle aus C.5.2.
 *
 * NUR BITGENAU FESTGELEGTE RECHENARTEN
 * ------------------------------------
 * + − * / sowie Math.abs, Math.min, Math.max, Math.floor, Math.sqrt,
 * Math.imul — mehr nicht. Keine Winkelfunktion, keine Potenzfunktion, kein
 * Rest-Operator auf einer Fließkommazahl, kein Math.PI, keine Uhr. Nur diese
 * Rechenarten legt die Sprachnorm bitgenau fest; nur so gilt „gleicher
 * Startzustand plus gleiche Zufallsfolge ergibt exakt denselben Verlauf" auch
 * auf einer anderen Maschine (dieselbe Regel wie beim Rad des anderen
 * Tisches).
 *
 * DIE MASSORDNUNG STEHT DOPPELT — MIT ABSICHT
 * -------------------------------------------
 * Die Zahlen der Wanne stehen auch in dice-geometry.js. Weil ein import hier
 * verboten ist, sind sie hier ausgeschrieben wiederholt; Prüfung P-9 in
 * verify-physics.mjs gleicht beide Sätze Zahl für Zahl ab. Dieselbe Lösung
 * und derselbe Grund wie bei der Radanordnung des anderen Tisches.
 *
 * DAS MODELL: EIN KIPPENDER QUADER AUF EINER EBENE
 * -------------------------------------------------
 * CONCEPT.md C.8.3 überlässt die Wahl ausdrücklich dem Agenten. Gewählt ist
 * das Kippmodell und nicht der Starrkörper im Raum, weil nur es die zwei
 * harten Zusagen BAULICH erfüllt statt durch nachträgliche Berichtigung:
 *
 *   Kein Würfel verlässt je den Tisch — der Mittelpunkt wird nach jedem
 *   Schritt in das Rechteck der Bandeninnenkante geklemmt, und ein
 *   Bandenstoß ist ein echter Stoß mit Rückprall, keine stille Korrektur.
 *
 *   Kein Würfel bleibt auf einer Kante liegen — Ruhe ist nur bei tipPhase
 *   gleich null möglich, und das heißt „eine Fläche liegt flach auf".
 *
 * EIN KIPPSCHRITT IST EINE RECHNUNG, KEINE ANIMATION
 * ----------------------------------------------------
 * Der Mittelpunkt muss über die Kante steigen, von a/2 auf a/2·√2. Diese Höhe
 * heißt HILL_PEAK. Unterwegs gilt
 *
 *   v(t)² = v0² − INERTIA · GRAVITY · huegel(t),  huegel(t) = HILL_PEAK·4t(1−t)
 *
 * Wird v(t)² null, fällt der Würfel auf die Fläche zurück, von der er kam.
 * Kein Neuwurf, kein Nachhelfen. Genau so kommt ein Würfel von selbst zur
 * Ruhe.
 *
 * huegel() ist eine PARABEL und kein Sinus: dieselben drei Punkte (Anfang 0,
 * Scheitel HILL_PEAK bei t = 0,5, Ende 0), aber ohne Winkelfunktion. Über das
 * Gelingen eines Kippschritts entscheidet allein der Scheitel — und der
 * stimmt exakt.
 *
 * WARUM DIE GIERLAGE EIN VEKTOR IST
 * ----------------------------------
 * Ein Winkel bräuchte Math.sin/cos/atan2. Als Einheitsvektor genügt eine
 * Drehung erster Ordnung mit anschließender Normierung — Strich-, Punkt- und
 * Wurzelrechnung, bitgenau. Sie dreht rund ein Promille je Sekunde langsamer
 * als eine ideale Drehung; das ist eine benannte Auslegungseigenschaft, auf
 * jeder Maschine dieselbe.
 *
 * DIE DREI MISCHER
 * -----------------
 *   1  Die Gierdrehung wechselt die Kippkante. OHNE SIE kämen nur vier der
 *      sechs Flächen nach oben — die zwei auf der Drehachse blieben für immer
 *      außen vor. Das ist die wichtigste Falle dieses Modells; Prüfung P-7
 *      weist nach, dass sie geschlossen ist.
 *   2  Der Pyramidengummi der Bande. Wo ein Würfel auf einer Zacke auftrifft,
 *      entscheidet, wohin er weiterläuft. GERECHNET aus dem Auftreffpunkt,
 *      nicht gezogen — dieselbe Bauart wie die Rauten des anderen Tisches.
 *   3  Der Zusammenstoß der beiden Würfel. Sie stoßen wirklich aneinander.
 *      Genau deshalb ist die Unabhängigkeitsprüfung aus C.5.4 eine echte
 *      Aussage und keine Selbstverständlichkeit.
 *
 * DIE MINDESTWURF-REGEL STEHT HIER UND NICHT IM SPIEL
 * -----------------------------------------------------
 * „Erreichen die Würfel die gegenüberliegende Bande nicht, gilt der Wurf
 * nicht" (C.8.2) ist eine Tischregel — aber sie wird an einer rein
 * körperlichen Tatsache abgelesen: hat der Würfel die linke Bande berührt.
 * Deshalb führt jeder Würfel das Merkmal farWall selbst mit, und valid liest
 * es nur ab. So benutzen das Spiel UND der Nachweis dieselbe Regel; ein
 * Nachweis, der ungültige Würfe mitzählte, während das Spiel sie verwirft,
 * bewiese nichts über das Spiel.
 *
 * ALLE ZAHLEN UNTER „AUSLEGUNG" SIND AUSLEGUNGSWERTE, KEINE NATURKONSTANTEN.
 * Fällt der Nachweis nach C.5.4 durch, werden SIE nachgebessert — niemals der
 * Zufallsgeber und niemals ein Ergebnis. Die Reihenfolge des Nachbesserns
 * steht im README dieser Extension.
 */

/* ------------------------------------------------ Zeit und Zeitschritte */

/** Fester Zeitschritt: 240 Rechenschritte je Sekunde, vier je Bild bei 60 Bildern/s. */
export const DT = 1 / 240;
export const SUBSTEPS = 4;

/** Höchstens acht Bilder werden nach einem Stillstand nachgeholt, der Rest verworfen. */
export const MAX_CATCHUP_STEPS = SUBSTEPS * 8;

/**
 * Notbremse: nach 20 Sekunden Wurfdauer werden die Würfel dort hingelegt, wo
 * sie stehen. Sie darf NIE greifen — P-6 prüft das über 20.000 Würfe. Sie
 * steht hier trotzdem, weil „ein Wurf ohne Ergebnis ist nicht möglich" eine
 * Zusage ist und keine Hoffnung.
 */
export const MAX_STEPS = 240 * 20;

/* ---------------------------------------------------------- Maßordnung */
/* Dieselben Zahlen wie in dice-geometry.js und in Tray.html. P-9 gleicht ab. */

export const FELT_LEFT = 20;
export const FELT_RIGHT = 220;
export const FELT_TOP = 20;
export const FELT_BOTTOM = 120;
export const DIE_EDGE = 12;
export const PYRAMID_PITCH = 10;

export const HALF_EDGE = DIE_EDGE / 2;
export const DIAG_HALF = 0.70710678 * DIE_EDGE;
export const HILL_PEAK = DIAG_HALF - HALF_EDGE;
export const TIP_ARC = 1.11072073 * DIE_EDGE;
export const INERTIA = 1.5;

/** Ein Umlauf in Umdrehungen — die Gierdrehung rechnet in Umdrehungen je Sekunde. */
export const TURN = 6.28318531;

/* ------------------------------------------------------------ Auslegung */

/** Fallbeschleunigung in Wanneneinheiten je Sekunde². */
export const GRAVITY = 900;

/** Luftwiderstand im Flug, Anteil des Tempos je Sekunde. */
export const AIR_DRAG = 0.35;

/** Anteil der Fallgeschwindigkeit, der ein Aufkommen übersteht. */
export const BOUNCE_KEEP = 0.34;

/** Unter dieser Fallgeschwindigkeit hüpft der Würfel nicht mehr, sondern rollt. */
export const BOUNCE_MIN = 26;

/** Anteil des Bodentempos, der ein Aufkommen übersteht. */
export const LAND_KEEP = 0.82;

/** Rollreibung: ein fester und ein tempoabhängiger Anteil. */
export const ROLL_FRICTION_LIN = 12;
export const ROLL_FRICTION_QUAD = 0.02;

/**
 * Anteil des Tempos, der einen vollendeten Kippschritt übersteht — das ist
 * der Aufschlag der fallenden Fläche auf dem Tuch. Der wichtigste
 * Auslegungswert des ganzen Modells: er allein bestimmt, wie viele
 * Kippschritte ein Wurf hat, und damit, wie gut er sich mischt.
 */
export const TIP_KEEP = 0.945;

/** Anteil des Tempos, der ein misslungener Kippversuch (Zurückfallen) übersteht. */
export const FALLBACK_KEEP = 0.30;

/** Anteil des Tempos, der einen Bandenstoß übersteht. */
export const WALL_KEEP = 0.75;

/** Wie schräg eine Zacke des Pyramidengummis höchstens stellt (Anteil der Normalen). */
export const PYRAMID_SPREAD = 0.42;

/**
 * Wie stark ein außermittiger Zackentreffer den Würfel verdreht (Umdrehungen
 * je Sekunde). BERICHTIGUNG (Umsetzungsstück C6c, DECISIONS.md 2026-09-07,
 * Nachbesserung nach durchgefallener Gegenprobe „feste Startlage" in
 * Messlauf M-C6-1): von 0,35 auf 0,7 erhöht — siehe die ausführliche
 * Begründung im Kopfkommentar von roll().
 */
export const PYRAMID_SPIN = 0.7;

/** Anteil der Annäherungsgeschwindigkeit, der einen Würfelstoß übersteht. */
export const COLLIDE_KEEP = 0.6;

/** Stoßhalbmesser eines Würfels: zwischen einbeschriebenem (6) und umschriebenem (8,49). */
export const COLLIDE_RADIUS = 7;

/** Abbau der Gierdrehung, Umdrehungen je Sekunde². */
export const SPIN_FRICTION = 0.12;

/** Unter diesem Tempo gilt ein Würfel als liegend (Quadrat, spart eine Wurzel). */
export const REST_SPEED_SQ = INERTIA * GRAVITY * HILL_PEAK;

/* -------------------------------------------------------- Hilfsrechnungen */

/**
 * Zieht eine ganze Zahl aus [0, bound) — gleichverteilt, mit dem
 * Verwerfungsverfahren aus CONCEPT.md C.5.2. Eine Restdivision auf den rohen
 * Zufallswert ist dort ausdrücklich verboten: 2^32 ist weder durch 24 noch
 * durch 241 teilbar, und ein schlichtes „wert % bound" bevorzugte die
 * niedrigen Werte. Der überstehende Rest wird verworfen und neu gezogen; die
 * Schleife läuft praktisch immer genau einmal.
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

/** Betrag ohne Vorzeichenwechsel. */
function betrag(x) {
	return x < 0 ? -x : x;
}

/** Verringert einen Betrag um „amount", ohne das Vorzeichen umzudrehen. */
function decay(wert, amount) {
	if (wert > 0) {
		const neu = wert - amount;
		return neu < 0 ? 0 : neu;
	}
	if (wert < 0) {
		const neu = wert + amount;
		return neu > 0 ? 0 : neu;
	}
	return 0;
}

/** Die Höhe des Mittelpunkts über der Ruhelage während eines Kippschritts. */
function huegel(t) {
	return HILL_PEAK * 4 * t * (1 - t);
}

/**
 * Ein Kippschritt als reine Tabelle — dieselbe Rechnung wie tipFaces() in
 * dice-geometry.js. Sie steht hier ein zweites Mal, weil diese Datei
 * importfrei bleiben muss; P-9 gleicht beide über alle 24 Lagen und alle
 * vier Richtungen ab.
 *
 * @param {Die} die
 * @param {number} dir 0 = +X, 1 = −X, 2 = +Y, 3 = −Y der Körperachse
 */
function kippeFlaechen(die, dir) {
	const { top, front, right } = die;
	if (dir === 0) {
		die.top = 7 - right; die.right = top;
	} else if (dir === 1) {
		die.top = right; die.right = 7 - top;
	} else if (dir === 2) {
		die.top = 7 - front; die.front = top;
	} else {
		die.top = front; die.front = 7 - top;
	}
}

/* ------------------------------------------------------------- Ein Würfel */

export class Die {
	constructor() {
		/* Ort und Höhe. */
		this.x = 0;
		this.y = 0;
		this.h = 0;
		this.vh = 0;

		/* Laufrichtung als Einheitsvektor, Tempo getrennt. */
		this.dx = -1;
		this.dy = 0;
		this.speed = 0;

		/* Gierlage als Einheitsvektor, Gierdrehung in Umdrehungen je Sekunde. */
		this.bx = 1;
		this.by = 0;
		this.spin = 0;

		/* Die Lage: drei Augenzahlen, eine der 24 aus dice-geometry.js. */
		this.top = 1;
		this.front = 2;
		this.right = 3;

		/* Der laufende Kippschritt. */
		this.tipDir = 0;
		this.tipPhase = 0;
		this.tipSpeed0 = 0;

		/* Im Flug: Kippschritte je Sekunde, unabhängig vom Bodentempo. */
		this.tumble = 0;

		this.phase = 'ruht';

		/* Nur für Nachweis und Mindestwurf-Regel. Kein Spielwert. */
		this.tips = 0;
		this.wallHits = 0;
		this.farWall = false;
	}

	/** Normiert die Gierlage nach einer Drehung erster Ordnung. */
	normiereGier() {
		const len = Math.sqrt(this.bx * this.bx + this.by * this.by);
		if (len > 0) {
			this.bx = this.bx / len;
			this.by = this.by / len;
		}
	}

	/** Normiert die Laufrichtung nach einem Stoß. */
	normiereLauf() {
		const len = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (len > 0) {
			this.dx = this.dx / len;
			this.dy = this.dy / len;
		}
	}

	/**
	 * Wählt die Kippkante: die, die am nächsten quer zur Laufrichtung liegt.
	 * Reine Vergleichsrechnung aus zwei Skalarprodukten, keine Winkelfunktion.
	 * Die Laufrichtung bleibt dabei UNVERÄNDERT — siehe die bewusste
	 * Vereinfachung im Kopfkommentar.
	 */
	waehleKante() {
		const laengs = this.dx * this.bx + this.dy * this.by;
		const quer = this.dx * -this.by + this.dy * this.bx;
		if (betrag(laengs) >= betrag(quer)) {
			this.tipDir = laengs >= 0 ? 0 : 1;
		} else {
			this.tipDir = quer >= 0 ? 2 : 3;
		}
	}

	/**
	 * Löst einen unterbrochenen Kippschritt ehrlich auf: über der Hälfte
	 * fällt der Würfel auf die neue Fläche, darunter auf die alte zurück.
	 * Es wird nichts gewählt — die Lage entscheidet.
	 */
	loeseKippschrittAuf() {
		if (this.tipPhase >= 0.5) {
			kippeFlaechen(this, this.tipDir);
			this.tips += 1;
		}
		this.tipPhase = 0;
	}

	/** Zur Ruhe. Nur bei tipPhase gleich null erreichbar — das ist die Zusage. */
	lege() {
		this.tipPhase = 0;
		this.speed = 0;
		this.spin = 0;
		this.h = 0;
		this.vh = 0;
		this.phase = 'liegt';
	}
}

/* ------------------------------------------------------------- Die Wanne */

export class DiceTable {
	/**
	 * @param {{random: function(): number, count?: number}} options
	 *   random  liefert eine vorzeichenlose 32-Bit-Zahl. DIE eine Stelle, an
	 *           der das Spiel und der Nachweis sich unterscheiden (C.5.2).
	 *   count   Zahl der Würfel. Vorgabe 2; ein anderer Wert ist nur für den
	 *           Nachweis gedacht.
	 */
	constructor({ random, count = 2 }) {
		if (typeof random !== 'function') {
			throw new TypeError('DiceTable braucht einen Zufallsgeber: new DiceTable({ random }).');
		}
		this.random = random;
		this.dice = [];
		for (let i = 0; i < count; i++) {
			this.dice.push(new Die());
		}
		this.phase = 'ruht';
		this.steps = 0;
		this.throws = 0;
		/** Für den Nachweis: was in diesem Wurf gezogen wurde. @type {?Array<object>} */
		this.draw = null;
	}

	/**
	 * Wirft. ES WIRD NUR DER START GEZOGEN, NIE DAS ERGEBNIS (C.5.1).
	 *
	 * Ohne setup (Zuschauen-Modus, C.8.2) wird JEDER Startwert gezogen, alle
	 * mit dem Verwerfungsverfahren:
	 *
	 *   Lage        eine der 24 aus ORIENTATIONS — „ihre Lage beim Loslassen
	 *               ist Teil des Startzustands" (C.8.2)
	 *   Gierlage    eine Vierteldrehung genügt: ein Würfel ist um seine
	 *               senkrechte Achse vierzählig, und die restlichen drei
	 *               Viertel stecken bereits in der gezogenen Lage
	 *   Ort         auf der Wurfseite rechts, die beiden Würfel 20 Einheiten
	 *               auseinander — mehr als der doppelte Stoßhalbmesser, damit
	 *               sie sich beim Start nicht schon überlappen — und mit
	 *               Sicherheitsabstand zur oberen/unteren Bande (siehe
	 *               BERICHTIGUNG unten)
	 *   Richtung    nach links, mit einer Steigung von −0,075 bis +0,075
	 *               (BERICHTIGUNG, siehe unten — ursprünglich geplant war
	 *               −0,6 bis +0,6)
	 *   Tempo       240 bis 480 Einheiten je Sekunde
	 *   Höhe        14 bis 30 Einheiten über dem Tuch
	 *   Steigen     −10 bis +30 Einheiten je Sekunde
	 *   Gierdrehung Betrag 0,15 bis 1,50 Umdrehungen je Sekunde (BERICHTIGUNG,
	 *               siehe unten — ursprünglich geplant war 0,15 bis 0,60),
	 *               Vorzeichen gezogen. NIE null: eine Gierdrehung von genau
	 *               null ließe den Würfel für immer über dieselbe Kante
	 *               rollen, und nur vier der sechs Flächen kämen je nach oben
	 *               (siehe Kopfkommentar, dritter Mischer)
	 *   Taumeln     3,0 bis 9,0 Kippschritte je Sekunde im Flug
	 *
	 * Mit setup (Selbst-werfen, C.8.2) kommen Ort, Richtung, Tempo, Gierlage
	 * und die Lage aus der Zeigerbewegung; Höhe, Steigen, Gierdrehung und
	 * Taumeln werden weiterhin gezogen — eine Zeigerspur misst sie nicht.
	 *
	 * BERICHTIGUNG GEGENÜBER DER PLAN-AUSGANGSBELEGUNG (Umsetzungsstück C6c,
	 * DECISIONS.md 2026-09-07): mit der ursprünglich geplanten Steigung von
	 * −0,6 bis +0,6 driftet ein Würfel auf der rund 190 Einheiten langen
	 * Wurfstrecke im Mittel um mehr als die Wannenhöhe (100 Einheiten) quer
	 * — er trifft dadurch schon während des Flugs mehrfach die obere/untere
	 * Bande (gemessen: ⌀ 1,9–2,4 Bandenstöße je Würfel statt der geplanten
	 * ~1) und verliert über WALL_KEEP so viel Bewegungsenergie, dass P-8
	 * („Anteil ungültiger Würfe zwischen 0,5 % und 25 %") mit **67,8 %**
	 * ungültigen Würfen durchfiel. TIP_KEEP, ROLL_FRICTION_LIN/QUAD,
	 * PYRAMID_SPREAD/SPIN, SPIN_FRICTION und COLLIDE_KEEP/RADIUS (4.34,
	 * Schritte 1–5) wurden der Reihe nach gemessen nachgestellt — keiner
	 * senkt den Anteil unter rund 55–60 %, weil sie alle an der Energie je
	 * Bandenstoß ansetzen, nicht an der ZAHL der Bandenstöße. Die Steigung
	 * ist keiner der in 4.34 benannten Auslegungswerte, fällt aber unter
	 * denselben Grundsatz („alle Zahlen unter „Auslegung" sind
	 * Auslegungswerte, keine Naturkonstanten") und wurde deshalb ebenfalls
	 * gemessen nachgebessert: −0,075 bis +0,075 senkt den Anteil auf
	 * **21,3 %** (innerhalb des Bandes), bei unverändert bestandenem P-7
	 * (Kippkante wechselt weiter im Mittel 3,6-mal je Wurf). Der senkrechte
	 * Startabstand zur Bande wurde zusätzlich von 0 auf mindestens 4
	 * Einheiten vergrößert (Ort-Zeile oben) — Würfel 0 konnte zuvor exakt
	 * auf der Bandeninnenkante starten. Weder der Zufallsgeber noch das
	 * Verwerfungsverfahren noch ein Ergebnis wurden dabei angefasst; beide
	 * Werte bleiben gezogene Startwerte aus demselben Geber.
	 *
	 * ZWEITE BERICHTIGUNG — MESSLAUF M-C6-1, GEGENPROBE „FESTE STARTLAGE"
	 * (Umsetzungsstück C6c, DECISIONS.md 2026-09-07, Nachbesserung nach der
	 * ersten Rückmeldung der Hauptsitzung): der volle Messlauf über 500.000
	 * Würfe bestand Block 1 und 2 (p=0,89/0,56 bzw. p=0,77), aber die
	 * Gegenprobe „feste Startlage" (100.000 Würfe) fiel mit p=0,00082 bzw.
	 * p=0,00170 durch — Auge 1 (die Startfläche) systematisch zu selten.
	 * URSACHE, gemessen (nicht vermutet): mit der oben verengten Steigung
	 * bleibt die Laufrichtung (dx,dy) über weite Strecken eines Wurfs nahezu
	 * konstant; waehleKante() wählt die Kippkante allein nach dem Winkel
	 * zwischen dieser (fast konstanten) Laufrichtung und der Gierlage. Eine
	 * eigene Messung der 24 Endlagen bei fester Startlage zeigte: die vier
	 * Lagen des `dir=0`-Vierertakts ab [1,2,3] ([1,2,3]→[4,2,1]→[6,2,4]→
	 * [3,2,6]→…) UND die vier Lagen des `dir=2`-Vierertakts ab [1,2,3]
	 * ([1,2,3]→[5,1,3]→[6,5,3]→[2,6,3]→…) waren gegenüber der Gleichverteilung
	 * krass überrepräsentiert (bis zu 1.986 statt 1.250 erwartet über 30.000
	 * Würfe), während Lagen, die einen Wechsel ZWISCHEN beiden Vierertakten
	 * verlangen, unterrepräsentiert waren (bis hinunter auf 599). Der Würfel
	 * bleibt über weite Strecken eines Wurfs auf EINER Kippachse (0/1 oder
	 * 2/3) hängen und dreht sich dort im Kreis, statt zwischen beiden Achsen
	 * zu wechseln — exakt der in CONCEPT.md C.5.4 benannte Fall „die Kippkante
	 * wechselt zu selten". NACHGEBESSERT nach 4.34, Schritt 4 (SPIN_FRICTION
	 * und der gezogene Bereich der Gierdrehung — dort ausdrücklich als Hebel
	 * für „eine einzelne Augenzahl systematisch zu selten" benannt): der
	 * gezogene Bereich der Gierdrehung wurde von 0,15–0,60 auf 0,15–1,50
	 * Umdrehungen je Sekunde verbreitert (schnellere Drehung wechselt die
	 * Kippachse öfter je Wurf), UND — weil das allein bei 100.000 Würfen noch
	 * knapp durchfiel (p=0,012/0,078) — PYRAMID_SPIN (Schritt 3 der Reihe,
	 * dort für die Würfel-Unabhängigkeit benannt, hier zusätzlich wirksam
	 * gegen dieselbe Ursache) von 0,35 auf 0,7 erhöht: ein Bandenstoß
	 * verdreht die Gierlage dadurch stärker und bricht die Kreisbewegung
	 * zusätzlich zur erhöhten Grunddrehung auf. SPIN_FRICTION (0,12) und die
	 * Steigung (±0,075, siehe oben) blieben unverändert — mehrere Läufe mit
	 * verstärkter/verbreiterter Steigung allein (bis ±0,3) bestanden die
	 * Gegenprobe bei 100.000 Würfen weiterhin NICHT (p bis 0,00002) und
	 * hätten zugleich P-8 wieder verletzt; die Kombination aus verbreiterter
	 * Gierdrehung und erhöhtem PYRAMID_SPIN besteht dagegen über sechs
	 * verschiedene Saaten (1, 7, 20260907, 42, 99, und eine weitere) bei
	 * 100.000 UND bei 200.000 Würfen durchweg mit p zwischen 0,02 und 0,91 —
	 * keine der sechs Proben unter 0,01. P-4 bis P-10 aus verify-physics.mjs
	 * bleiben bei dieser Änderung vollständig grün (70/70), insbesondere P-7
	 * (Kippkante wechselt weiter im Mittel > 2-mal je Wurf) und P-8 (Band
	 * unverändert eingehalten, da PYRAMID_SPIN und die Gierdrehung die
	 * Reichweite zur Gegenbande nicht messbar verändern). Weder der
	 * Zufallsgeber noch das Verwerfungsverfahren noch ein Ergebnis wurden
	 * dabei angefasst.
	 *
	 * @param {?Array<object>} setup je Würfel ein Objekt oder null
	 * @returns {boolean} false, wenn schon ein Wurf läuft
	 */
	roll(setup = null) {
		if (this.phase === 'rollt') {
			return false;
		}
		const baseX = FELT_RIGHT - HALF_EDGE - 6;
		const baseY = FELT_TOP + HALF_EDGE + 20 + zieheGanzzahl(this.random, 49);
		this.draw = [];
		for (let i = 0; i < this.dice.length; i++) {
			const y = baseY + (i === 0 ? -10 : 10);
			this.draw.push(this.starteWuerfel(this.dice[i], setup === null ? null : setup[i], baseX, y));
		}
		this.phase = 'rollt';
		this.steps = 0;
		this.throws += 1;
		return true;
	}

	/**
	 * @param {Die} die
	 * @param {?object} setup
	 * @param {number} baseX
	 * @param {number} baseY
	 * @returns {object} was gezogen wurde — nur für den Nachweis
	 */
	starteWuerfel(die, setup, baseX, baseY) {
		const s = setup === null ? {} : setup;

		/* Lage. */
		if (s.top === undefined) {
			const o = ORIENTATION_TABLE[zieheGanzzahl(this.random, 24)];
			die.top = o[0]; die.front = o[1]; die.right = o[2];
		} else {
			die.top = s.top; die.front = s.front; die.right = s.right;
		}

		/* Gierlage. */
		if (s.bx === undefined) {
			const t = zieheGanzzahl(this.random, 201) / 200;
			die.bx = 1 - t; die.by = t;
		} else {
			die.bx = s.bx; die.by = s.by;
		}
		die.normiereGier();

		/* Ort. */
		die.x = s.x === undefined ? baseX : s.x;
		die.y = s.y === undefined ? baseY : s.y;

		/* Richtung. */
		if (s.dx === undefined) {
			const steigung = (zieheGanzzahl(this.random, 241) - 120) / 1600;
			die.dx = -1; die.dy = steigung;
		} else {
			die.dx = s.dx; die.dy = s.dy;
		}
		die.normiereLauf();

		/* Tempo, Höhe, Steigen. */
		die.speed = s.speed === undefined ? 240 + zieheGanzzahl(this.random, 241) : s.speed;
		die.h = s.h === undefined ? 14 + zieheGanzzahl(this.random, 17) : s.h;
		die.vh = s.vh === undefined ? zieheGanzzahl(this.random, 41) - 10 : s.vh;

		/* Gierdrehung — nie null. */
		const betragSpin = (15 + zieheGanzzahl(this.random, 136)) / 100;
		die.spin = zieheGanzzahl(this.random, 2) === 0 ? -betragSpin : betragSpin;

		/* Taumeln im Flug. */
		die.tumble = (30 + zieheGanzzahl(this.random, 61)) / 10;

		die.tipPhase = 0;
		die.tipSpeed0 = 0;
		die.tips = 0;
		die.wallHits = 0;
		die.farWall = false;
		die.phase = 'flug';
		die.waehleKante();

		return {
			top: die.top, front: die.front, right: die.right,
			x: die.x, y: die.y, dx: die.dx, dy: die.dy,
			speed: die.speed, h: die.h, vh: die.vh,
			spin: die.spin, tumble: die.tumble,
		};
	}

	/** Ein fester Zeitschritt für die ganze Wanne. */
	step() {
		if (this.phase !== 'rollt') {
			return;
		}
		this.steps += 1;
		if (this.steps >= MAX_STEPS) {
			for (const die of this.dice) {
				if (die.phase !== 'liegt') {
					die.loeseKippschrittAuf();
					die.lege();
				}
			}
			this.phase = 'liegt';
			return;
		}

		for (const die of this.dice) {
			this.schrittWuerfel(die);
		}
		this.stossZwischenWuerfeln();
		/*
		 * BERICHTIGUNG (Umsetzungsstück C6c, DECISIONS.md 2026-09-07): der
		 * Zusammenstoß zweier Würfel verschiebt ihre Mittelpunkte (Auflösung
		 * der Überdeckung), OHNE dabei die Bandeninnenkante zu prüfen — ein
		 * Würfel, der beim Anstoß bereits nahe der Bande liegt, konnte dadurch
		 * für einen einzelnen Rechenschritt außerhalb des Tuchs zu liegen
		 * kommen (P-4, gemessen: bis zu 0,013 Einheiten). C.9 verlangt „kein
		 * Würfel verlässt je den Tisch" für JEDEN Schritt, nicht nur für den
		 * Schritt vor einem Zusammenstoß. Deshalb wird nach der
		 * Zusammenstoßauflösung ein zweites Mal geklemmt — für einen Würfel,
		 * der bereits innerhalb der Bandeninnenkante liegt, ist das ein
		 * folgenloser Leerlauf (klemmeAnBande() ändert dann nichts); nur ein
		 * durch den Stoß hinausgeschobener Würfel wird hier tatsächlich
		 * zurückgeklemmt und prallt regelkonform an der Bande ab.
		 */
		for (const die of this.dice) {
			this.klemmeAnBande(die);
		}

		let alleLiegen = true;
		for (const die of this.dice) {
			if (die.phase !== 'liegt') {
				alleLiegen = false;
			}
		}
		if (alleLiegen) {
			this.phase = 'liegt';
		}
	}

	/** @param {Die} die */
	schrittWuerfel(die) {
		if (die.phase === 'liegt' || die.phase === 'ruht') {
			return;
		}

		/* Gierdrehung: erste Ordnung, danach normiert. */
		die.spin = decay(die.spin, SPIN_FRICTION * DT);
		const dreh = die.spin * TURN * DT;
		const bxAlt = die.bx;
		die.bx = die.bx - die.by * dreh;
		die.by = die.by + bxAlt * dreh;
		die.normiereGier();

		if (die.phase === 'flug') {
			this.schrittFlug(die);
		} else {
			this.schrittRollen(die);
		}
		this.klemmeAnBande(die);
	}

	/** @param {Die} die */
	schrittFlug(die) {
		die.vh -= GRAVITY * DT;
		die.h += die.vh * DT;
		die.speed = decay(die.speed, AIR_DRAG * die.speed * DT);
		die.x += die.dx * die.speed * DT;
		die.y += die.dy * die.speed * DT;

		/* Im Flug taumelt der Würfel mit fester Rate, unabhängig vom Tempo. */
		die.tipPhase += die.tumble * DT;
		while (die.tipPhase >= 1) {
			kippeFlaechen(die, die.tipDir);
			die.tips += 1;
			die.tipPhase -= 1;
			die.waehleKante();
		}

		if (die.h <= 0) {
			die.h = 0;
			const fall = -die.vh;
			die.speed = die.speed * LAND_KEEP;
			if (fall > BOUNCE_MIN) {
				die.vh = fall * BOUNCE_KEEP;
				return;
			}
			/* Aufgekommen und liegengeblieben: der Kippschritt wird ehrlich
			   aufgelöst, dann wird gerollt. */
			die.vh = 0;
			die.loeseKippschrittAuf();
			die.waehleKante();
			die.phase = 'rollen';
			if (die.speed * die.speed < REST_SPEED_SQ) {
				die.lege();
			}
		}
	}

	/** @param {Die} die */
	schrittRollen(die) {
		if (die.tipPhase === 0) {
			if (die.speed * die.speed < REST_SPEED_SQ) {
				die.lege();
				return;
			}
			die.tipSpeed0 = die.speed;
			die.waehleKante();
		}

		die.tipSpeed0 = decay(
			die.tipSpeed0,
			(ROLL_FRICTION_LIN + ROLL_FRICTION_QUAD * die.tipSpeed0) * DT
		);

		const vSq = die.tipSpeed0 * die.tipSpeed0 - INERTIA * GRAVITY * huegel(die.tipPhase);
		if (vSq <= 0) {
			/* Der Berg war zu hoch: der Würfel fällt auf die Fläche zurück,
			   von der er kam. Es wird nichts gewählt. */
			die.tipPhase = 0;
			die.speed = die.tipSpeed0 * FALLBACK_KEEP;
			die.h = 0;
			if (die.speed * die.speed < REST_SPEED_SQ) {
				die.lege();
			}
			return;
		}

		const v = Math.sqrt(vSq);
		die.speed = v;
		die.tipPhase += (v / TIP_ARC) * DT;
		die.x += die.dx * v * DT;
		die.y += die.dy * v * DT;
		die.h = huegel(die.tipPhase);

		if (die.tipPhase >= 1) {
			kippeFlaechen(die, die.tipDir);
			die.tips += 1;
			die.tipPhase = 0;
			die.h = 0;
			die.speed = die.tipSpeed0 * TIP_KEEP;
			if (die.speed * die.speed < REST_SPEED_SQ) {
				die.lege();
			}
		}
	}

	/**
	 * Die harte Zusage aus CONCEPT.md C.9: kein Würfel verlässt je den Tisch.
	 * Der Mittelpunkt wird in das Rechteck der Bandeninnenkante geklemmt, und
	 * die Berührung ist ein echter Stoß am Pyramidengummi — keine stille
	 * Berichtigung.
	 *
	 * @param {Die} die
	 */
	klemmeAnBande(die) {
		const minX = FELT_LEFT + HALF_EDGE;
		const maxX = FELT_RIGHT - HALF_EDGE;
		const minY = FELT_TOP + HALF_EDGE;
		const maxY = FELT_BOTTOM - HALF_EDGE;

		if (die.x < minX) {
			die.x = minX;
			die.farWall = true;
			this.stosseAnBande(die, 0, -1, die.y);
		} else if (die.x > maxX) {
			die.x = maxX;
			this.stosseAnBande(die, 0, 1, die.y);
		}
		if (die.y < minY) {
			die.y = minY;
			this.stosseAnBande(die, 1, -1, die.x);
		} else if (die.y > maxY) {
			die.y = maxY;
			this.stosseAnBande(die, 1, 1, die.x);
		}
	}

	/**
	 * Ein Stoß gegen den Pyramidengummi.
	 *
	 * Der Ort innerhalb einer Zacke wird GERECHNET: laengs / PYRAMID_PITCH
	 * liefert den Bruchteil, daraus der Versatz −1 … +1, daraus die Neigung
	 * der Normalen. Mittig trifft heißt gerade zurück, am Rand heißt schräg
	 * weiter. NICHTS wird gezogen — dieselbe Bauart wie die Rauten des
	 * anderen Tisches (C.5.1).
	 *
	 * @param {Die} die
	 * @param {number} achse 0 = senkrechte Bande (x), 1 = waagerechte (y)
	 * @param {number} vorzeichen −1 = kleine Seite, +1 = große Seite
	 * @param {number} laengs Ort entlang der Bande
	 */
	stosseAnBande(die, achse, vorzeichen, laengs) {
		const u = laengs / PYRAMID_PITCH;
		const anteil = u - Math.floor(u);
		const versatz = 2 * anteil - 1;

		let nx;
		let ny;
		if (achse === 0) {
			nx = -vorzeichen;
			ny = PYRAMID_SPREAD * versatz;
		} else {
			nx = PYRAMID_SPREAD * versatz;
			ny = -vorzeichen;
		}
		const len = Math.sqrt(nx * nx + ny * ny);
		nx = nx / len;
		ny = ny / len;

		const skalar = die.dx * nx + die.dy * ny;
		if (skalar < 0) {
			die.dx = die.dx - 2 * skalar * nx;
			die.dy = die.dy - 2 * skalar * ny;
			die.normiereLauf();
		}

		die.speed = die.speed * WALL_KEEP;
		die.tipSpeed0 = die.tipSpeed0 * WALL_KEEP;
		die.spin = die.spin + PYRAMID_SPIN * versatz * -vorzeichen;
		die.wallHits += 1;

		if (die.phase === 'rollen') {
			die.loeseKippschrittAuf();
			die.waehleKante();
			if (die.speed * die.speed < REST_SPEED_SQ) {
				die.lege();
			}
		}
	}

	/**
	 * Zusammenstoß der beiden Würfel — der dritte Mischer.
	 *
	 * Gerechnet als zwei gleich schwere Scheiben mit COLLIDE_RADIUS: die
	 * Überdeckung wird hälftig aufgelöst, die Anteile längs der Verbindungs-
	 * linie werden getauscht und um COLLIDE_KEEP gedämpft, und der Anteil
	 * quer dazu verdreht beide (ein Streifschuss dreht, ein Volltreffer
	 * bremst).
	 */
	stossZwischenWuerfeln() {
		for (let i = 0; i < this.dice.length; i++) {
			for (let j = i + 1; j < this.dice.length; j++) {
				const a = this.dice[i];
				const b = this.dice[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const abstandSq = dx * dx + dy * dy;
				const grenze = 2 * COLLIDE_RADIUS;
				if (abstandSq >= grenze * grenze || abstandSq === 0) {
					continue;
				}
				const abstand = Math.sqrt(abstandSq);
				const nx = dx / abstand;
				const ny = dy / abstand;
				const ueberdeckung = grenze - abstand;

				a.x -= nx * ueberdeckung * 0.5;
				a.y -= ny * ueberdeckung * 0.5;
				b.x += nx * ueberdeckung * 0.5;
				b.y += ny * ueberdeckung * 0.5;

				const avx = a.dx * a.speed;
				const avy = a.dy * a.speed;
				const bvx = b.dx * b.speed;
				const bvy = b.dy * b.speed;

				const an = avx * nx + avy * ny;
				const bn = bvx * nx + bvy * ny;
				if (an - bn <= 0) {
					continue;                       // sie entfernen sich schon
				}
				const dAn = (bn - an) * COLLIDE_KEEP;
				const neuAx = avx + dAn * nx;
				const neuAy = avy + dAn * ny;
				const neuBx = bvx - dAn * nx;
				const neuBy = bvy - dAn * ny;

				this.setzeBewegung(a, neuAx, neuAy);
				this.setzeBewegung(b, neuBx, neuBy);

				const quer = (avx - bvx) * -ny + (avy - bvy) * nx;
				a.spin += quer * 0.002;
				b.spin -= quer * 0.002;

				for (const die of [a, b]) {
					if (die.phase === 'rollen') {
						die.loeseKippschrittAuf();
						die.waehleKante();
					}
				}
			}
		}
	}

	/**
	 * Zerlegt einen Geschwindigkeitsvektor wieder in Richtung und Tempo. Bei
	 * Tempo null bleibt die alte Richtung stehen — ein Nullvektor hat keine.
	 */
	setzeBewegung(die, vx, vy) {
		const len = Math.sqrt(vx * vx + vy * vy);
		die.speed = len;
		die.tipSpeed0 = len;
		if (len > 0) {
			die.dx = vx / len;
			die.dy = vy / len;
		}
	}

	/**
	 * Die Mindestwurf-Regel (C.8.2): erreichen die Würfel die gegenüber-
	 * liegende Bande nicht, gilt der Wurf nicht. Abgelesen an einer rein
	 * körperlichen Tatsache — hat der Würfel die linke Bande berührt.
	 *
	 * @returns {boolean}
	 */
	get valid() {
		for (const die of this.dice) {
			if (!die.farWall) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Rechnet einen Wurf ohne Bild bis zum Ende. DIE Methode, mit der der
	 * Nachweis arbeitet — und dieselbe, die die Ansicht bei „Bewegung
	 * reduzieren" benutzt.
	 *
	 * @returns {{faces: number[], sum: number, valid: boolean}}
	 */
	runToRest() {
		if (this.phase !== 'rollt') {
			this.roll();
		}
		while (this.phase === 'rollt') {
			this.step();
		}
		return this.result();
	}

	/** @returns {{faces: number[], sum: number, valid: boolean}} */
	result() {
		const faces = this.dice.map((die) => die.top);
		let sum = 0;
		for (const f of faces) {
			sum += f;
		}
		return { faces, sum, valid: this.valid };
	}

	/** Momentaufnahme für Prüfskripte und für die Ansicht. */
	snapshot() {
		return {
			phase: this.phase,
			steps: this.steps,
			throws: this.throws,
			valid: this.valid,
			dice: this.dice.map((d) => ({
				phase: d.phase, x: d.x, y: d.y, h: d.h, vh: d.vh,
				dx: d.dx, dy: d.dy, speed: d.speed,
				bx: d.bx, by: d.by, spin: d.spin,
				top: d.top, front: d.front, right: d.right,
				tipDir: d.tipDir, tipPhase: d.tipPhase,
				tips: d.tips, wallHits: d.wallHits, farWall: d.farWall,
			})),
		};
	}
}

/**
 * Die 24 Lagen, ausgeschrieben. Wortgleich zu ORIENTATIONS in
 * dice-geometry.js; sie stehen hier ein zweites Mal, weil diese Datei
 * importfrei bleiben muss. P-9 gleicht beide Listen Zeile für Zeile ab.
 *
 * BERICHTIGUNG GEGENÜBER DER PLAN-AUSGANGSBELEGUNG (Umsetzungsstück C6b,
 * DECISIONS.md 2026-09-07 08:24): die im Plantext stehenden 24 Zeilen waren
 * weder durchgehend rechtshändig noch unter tipFaces()/kippeFlaechen()
 * geschlossen. Diese Liste ist die per Breitensuche neu erzeugte, geprüfte
 * Fassung — identisch zu ORIENTATIONS in dice-geometry.js. Die Plan-Fassung
 * wird an dieser Stelle NICHT verwendet.
 */
const ORIENTATION_TABLE = [
	[1, 2, 3], [1, 3, 5], [1, 4, 2], [1, 5, 4],
	[2, 1, 4], [2, 3, 1], [2, 4, 6], [2, 6, 3],
	[3, 1, 2], [3, 2, 6], [3, 5, 1], [3, 6, 5],
	[4, 1, 5], [4, 2, 1], [4, 5, 6], [4, 6, 2],
	[5, 1, 3], [5, 3, 6], [5, 4, 1], [5, 6, 4],
	[6, 2, 4], [6, 3, 2], [6, 4, 5], [6, 5, 3],
];

export default DiceTable;
