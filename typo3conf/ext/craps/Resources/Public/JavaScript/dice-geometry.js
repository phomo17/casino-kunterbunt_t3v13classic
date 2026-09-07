/**
 * Craps – Maßordnung der Wanne und Kunde vom Würfel
 * ==================================================
 *
 * Zahlen und Tabellen, keine Bewegung. Die Bewegung steht in dice-physics.js,
 * die Zeichnung in Table/Craps/Tray.html — und beide benutzen AUSSCHLIESSLICH
 * die Werte aus dieser Datei. verify-tray.mjs vergleicht sie Zeile für Zeile
 * gegen die Zeichnung; weicht eine ab, gilt die Messung und nicht der Plan.
 *
 * KEIN IMPORT
 * -----------
 * Diese Datei wird von den Prüfskripten unmittelbar unter Node geladen. Node
 * kennt die Import-Map von TYPO3 nicht (CONCEPT.md C.5.3).
 *
 * DAS KOORDINATENSYSTEM
 * ---------------------
 * Blick von oben. viewBox 0 0 240 140, x nach rechts, y nach unten. Alle
 * Längen sind viewBox-Einheiten; wie groß eine Einheit auf dem Bildschirm
 * ist, entscheidet allein das Stylesheet.
 *
 *   Wannenaußenkante          x 2…238   y 2…138
 *   Messingkante              x 8…232   y 8…132
 *   Bandeninnenkante = Tuch   x 20…220  y 20…120     ← hier spielt die Physik
 *   Kantenlänge eines Würfels 12
 *
 * WELCHE BANDE WELCHE IST
 * -----------------------
 * Geworfen wird von RECHTS. Die Gegenbande ist damit die LINKE (x = 20) — die
 * Bande, die ein gültiger Wurf erreichen muss (CONCEPT.md C.8.2,
 * Mindestwurf-Regel). Die Wurfstrecke beträgt 200 Einheiten, das ist rund das
 * Sechzehnfache einer Würfelkante; auf dieser Strecke kippt ein Würfel
 * mehrfach und stößt mindestens einmal an. Eine kürzere Wanne hätte dem
 * Ergebnis zu wenig Weg gelassen, um sich zu mischen.
 *
 * WARUM DIE AUGEN NIE EIN SCHRIFTZEICHEN SIND
 * -------------------------------------------
 * PIP_LAYOUT beschreibt jede Augenzahl als Liste von Punkten auf einem
 * Raster. Gezeichnet wird daraus ein Kreis je Auge. Es gibt in dieser
 * Extension kein <text>, keine Ziffer und ausdrücklich keins der
 * Unicode-Würfelzeichen (CONCEPT.md B.3 und die Auflage dieser Phase).
 */

/* ------------------------------------------------------------- Die Wanne */

/** Zeichenfläche der Spielseite. */
export const VIEW_W = 240;
export const VIEW_H = 140;

/** Bandeninnenkante = Spielfläche. Innerhalb dieser vier Zahlen rechnet die Physik. */
export const FELT_LEFT = 20;
export const FELT_RIGHT = 220;
export const FELT_TOP = 20;
export const FELT_BOTTOM = 120;

/**
 * Teilung des Pyramidengummis: alle 10 Einheiten sitzt eine Zacke. Dieselbe
 * Zahl benutzt die Zeichnung als Kachelbreite ihrer beiden <pattern> und die
 * Physik als Teilung ihres Ablenkwinkels. Weichen sie voneinander ab, lenkt
 * die Bande sichtbar woanders ab als gerechnet — deshalb steht die Zahl hier
 * und nur hier.
 */
export const PYRAMID_PITCH = 10;

/** Zackenhöhe des Gummis, senkrecht zur Bande. Rein zeichnerisch. */
export const PYRAMID_DEPTH = 5;

/* ------------------------------------------------------------ Der Würfel */

/** Kantenlänge. */
export const DIE_EDGE = 12;

/** Halbe Kantenlänge — der Abstand des Mittelpunkts zur Bande beim Anstoß. */
export const HALF_EDGE = DIE_EDGE / 2;

/**
 * Halbe Diagonale des senkrechten Querschnitts, also der Abstand des
 * Mittelpunkts von der Kippkante: a/2 · √2. Die Zahl 0.70710678 steht
 * AUSGESCHRIEBEN da und wird nicht zur Laufzeit aus Math.SQRT2 geholt —
 * dieselbe Haltung wie beim Rad: was bitgenau festliegen muss, steht als
 * Ziffernfolge im Quelltext.
 */
export const DIAG_HALF = 0.70710678 * DIE_EDGE;

/**
 * Wie hoch der Mittelpunkt beim Kippen über die Kante steigt: von a/2 auf
 * a/2·√2. Das ist der „Berg", den jeder Kippschritt überwinden muss — und
 * damit der Grund, warum ein Würfel irgendwann von selbst liegen bleibt,
 * ohne dass irgendetwas nachhilft.
 */
export const HILL_PEAK = DIAG_HALF - HALF_EDGE;

/**
 * Bogenlänge einer Vierteldrehung um die Kippkante: DIAG_HALF · π/2. Der
 * Faktor 1.11072073 = 0.70710678 · 1.57079633 steht ausgeschrieben; Math.PI
 * kommt in keiner rechnenden Datei dieses Geräts vor.
 */
export const TIP_ARC = 1.11072073 * DIE_EDGE;

/**
 * Trägheitsbeiwert der Kippbewegung. Um die Kippkante hat ein Würfel das
 * Massenträgheitsmoment I = (2/3)·m·a²; mit v = ω·DIAG_HALF wird daraus die
 * Bewegungsenergie (2/3)·m·v². Aus (2/3)·v² ≥ g·Δh folgt v² ≥ 1,5·g·Δh —
 * dieser Faktor 1,5 ist INERTIA. Er ist keine Stellschraube, sondern
 * hergeleitet; er wird beim Nachbessern NICHT verändert.
 */
export const INERTIA = 1.5;

/* ---------------------------------------------- Die vierundzwanzig Lagen */

/**
 * Ein Würfel ist über drei Augenzahlen vollständig beschrieben: was oben
 * liegt (top), was in Richtung der Körperachse +Y zeigt (front) und was in
 * Richtung +X zeigt (right). Die übrigen drei ergeben sich aus der
 * Würfelregel „gegenüberliegende Flächen ergeben zusammen sieben".
 *
 * Es gibt genau 24 solche Lagen: sechs mögliche obere Flächen mal vier
 * Vierteldrehungen. Sie stehen hier vollständig, weil der Zuschauen-Modus
 * eine davon ziehen muss („die Lage beim Loslassen ist Teil des
 * Startzustands", CONCEPT.md C.8.2) und weil der Nachweis sie einzeln
 * durchgehen können muss.
 *
 * Erzeugt wird die Liste NICHT zur Laufzeit aus einer Schleife, sondern sie
 * steht ausgeschrieben da: verify-tray.mjs rechnet sie unabhängig nach
 * (D-6), und eine Liste, die sich selbst erzeugt, kann von ihrer eigenen
 * Prüfung nicht widerlegt werden.
 *
 * BERICHTIGUNG GEGENÜBER DER PLAN-AUSGANGSBELEGUNG (Umsetzungsstück C6b):
 * Plan-Abschnitt 4.22 gibt ausdrücklich nur eine Ausgangsbelegung und
 * verlangt die Nachrechnung durch D-6 — "gilt die Messung, nicht der Plan".
 * Die im Plantext stehenden 24 Zeilen bestehen weder die
 * Rechtshändigkeitsprobe (kreuz(right, front) = top) noch die
 * Abgeschlossenheit unter tipFaces(). Die hier stehenden 24 Zeilen sind
 * stattdessen durch vollständigen Abschluss (Breitensuche) aus der
 * Ausgangslage [1, 2, 3] unter allen vier Kipprichtungen erzeugt und dann
 * von Hand abgeschrieben — dieselbe Zahl Zeilen, dieselbe Bauart, aber
 * geprüft rechtshändig und geschlossen. D-6 rechnet das bei jedem Lauf nach.
 *
 * @type {Array<[number, number, number]>} [top, front, right]
 */
export const ORIENTATIONS = [
	[1, 2, 3], [1, 3, 5], [1, 4, 2], [1, 5, 4],
	[2, 1, 4], [2, 3, 1], [2, 4, 6], [2, 6, 3],
	[3, 1, 2], [3, 2, 6], [3, 5, 1], [3, 6, 5],
	[4, 1, 5], [4, 2, 1], [4, 5, 6], [4, 6, 2],
	[5, 1, 3], [5, 3, 6], [5, 4, 1], [5, 6, 4],
	[6, 2, 4], [6, 3, 2], [6, 4, 5], [6, 5, 3],
];

/**
 * Ein Kippschritt als reine Tabelle. Gekippt wird über eine der vier unteren
 * Kanten; welche, sagt die Richtung:
 *
 *   0  in Richtung +X der Körperachse   (rechte Kante)
 *   1  in Richtung −X                   (linke Kante)
 *   2  in Richtung +Y                   (vordere Kante)
 *   3  in Richtung −Y                   (hintere Kante)
 *
 * Beispiel für Richtung 2 (der Würfel rollt nach vorn): die vordere Fläche
 * geht nach unten, die obere wird zur vorderen, die hintere (7 − vorn) wird
 * zur oberen. Die rechte Fläche bleibt, wo sie ist — sie liegt auf der
 * Drehachse.
 *
 * @param {number} top
 * @param {number} front
 * @param {number} right
 * @param {number} dir 0…3
 * @returns {[number, number, number]}
 */
export function tipFaces(top, front, right, dir) {
	if (dir === 0) {
		return [7 - right, front, top];
	}
	if (dir === 1) {
		return [right, front, 7 - top];
	}
	if (dir === 2) {
		return [7 - front, top, right];
	}
	return [front, 7 - top, right];
}

/* -------------------------------------------------------------- Die Augen */

/**
 * Die Augen jeder Fläche, als Punkte auf einem Raster mit dem Mittelpunkt im
 * Ursprung. Die Einheit ist ein Viertel der Kantenlänge, damit dieselbe
 * Tabelle für die Kachel (Kantenlänge 16) und für die Spielseite
 * (Kantenlänge 12) taugt: ein Punkt [-1, -1] liegt bei
 * (-DIE_EDGE/4, -DIE_EDGE/4).
 *
 * Die Anordnung ist die seit Jahrhunderten übliche und gehört niemandem:
 * Einsen mittig, Zweien und Dreien auf der Diagonalen, Vieren und Fünfen auf
 * den Ecken, Sechsen in zwei Dreierreihen. Sie ist ein Motiv, keine fremde
 * Gestaltung (CONCEPT.md B.3, „was frei ist").
 *
 * @type {Object<number, Array<[number, number]>>}
 */
export const PIP_LAYOUT = {
	1: [[0, 0]],
	2: [[-1, -1], [1, 1]],
	3: [[-1, -1], [0, 0], [1, 1]],
	4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
	5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
	6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

/** Halbmesser eines Auges, in denselben Rastereinheiten wie PIP_LAYOUT. */
export const PIP_RADIUS = 0.44;

/**
 * Die Gegenprobe der Würfelregel: gegenüberliegende Flächen ergeben sieben.
 * Als Funktion und nicht als Tabelle, weil eine Tabelle mit sechs Einträgen
 * hier nur eine Abschrift derselben Regel wäre.
 *
 * @param {number} face 1…6
 * @returns {number}
 */
export function opposite(face) {
	return 7 - face;
}
