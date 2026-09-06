/**
 * Coin Pusher – der Grundhaufen, ZWEI EBENEN
 * ====================================================
 *
 * CONCEPT.md B.9.5: „Beim ersten Besuch liegt bereits ein vorgefüllter
 * Grundhaufen im Feld, damit das Gerät nicht leer und sinnlos wirkt. Diese
 * Münzen sind Ausstattung, kein Kredit."
 *
 * DER KUNSTGRIFF, UND WARUM ER WICHTIG IST
 * -----------------------------------------
 * Der Grundhaufen wird NICHT durch Schreiben in die Innereien von Field
 * erzeugt und NICHT durch echte Einwürfe mit anschließendem Vorlauf —
 * Ersteres griffe in den fertigen, nachgewiesenen Physikkern ein, Letzteres
 * würde als „eingeworfen" gezählt und ließe Münzen vorn herausfallen, also
 * echtes Geld aus dem Nichts entstehen. Stattdessen schreibt buildSeedState()
 * einen Speicherstand im Format „cp2" — genau das Format, das
 * Field.serialize() erzeugt und Field.restore() liest, mitsamt Prüfsumme
 * über die exportierte Funktion checksum(). Der Grundhaufen ist damit ein
 * gespeicherter Zustand wie jeder andere, geht durch dieselbe Prüfung und
 * fasst field.js nicht an. Das gilt unverändert seit der ersten Fassung.
 *
 *
 * WARUM DIESE DATEI VOLLSTÄNDIG NEU GERECHNET WERDEN MUSSTE
 * -------------------------------------------------------------
 * Zwei Gründe. ERSTENS die Maßordnung: sie ist mit dem Umbau auf zwei Ebenen
 * eine andere, und der Haufen muss auf BEIDE Ebenen verteilt werden, sonst
 * sähe eine der beiden beim ersten Besuch leer aus.
 *
 * ZWEITENS Befund M2 aus Reviews/REVIEW-phase10-videoslot-coinpusher.md: die
 * Zusage im damaligen Kopf dieser Datei („mit SEED_FIRST_Y = 11 und
 * SEED_STEP = 8,7 passen genau acht Reihen hinein, ohne diese Grenze zu
 * verletzen") war RECHNERISCH FALSCH — die achte Reihe lag bei y = 71,9,
 * zulässig waren höchstens 68,6; alle vierzehn Münzen der letzten Reihe
 * verletzten die Grenze, und zwar für jeden der vier Münzwerte. Die im
 * Bericht vorgerechneten Ersatzwerte wurden ausdrücklich NICHT übernommen:
 * der Bericht verwirft zwei davon im selben Absatz selbst
 * („8,36 < 8,4" reißt die harte Überlappungsgrenze) und schreibt „Die
 * Zahlen sind nachzurechnen und nicht ungeprüft zu übernehmen." Die
 * Rechnung unten ist NEU geführt, und V-4 in verify-view.mjs prüft die
 * Tiefe seither ausdrücklich mit — genau die Prüfung, die den Fehler
 * durchgelassen hatte.
 *
 *
 * DIE NEUE BAUFORM: ZWEI RASTER STATT EINEM
 * ---------------------------------------------
 * Dieselbe einfache Doppelschleife wie bisher, zweimal aufgerufen — einmal
 * für die untere Ebene (z = 0), einmal für die obere (z = DECK_HEIGHT).
 *
 * DIE FÜNF RECHNUNGEN, DIE DER IMPLEMENTIERER GEFÜHRT HAT (mit den
 * GEMESSENEN Werten aus tune-layout.mjs, nicht mit den Startwerten aus
 * field.js):
 *
 * 1. ÜBERLAPPUNG (gilt für BEIDE Ebenen). Das zyklische Verteilungsmuster
 *    legt stets AUFEINANDERFOLGENDE Werte nebeneinander; das ungünstigste
 *    Paar ist Fünfer/Zehner mit der Radiensumme 4,0 + 4,4 = 8,4. Der
 *    Schrittabstand muss SEED_STEP − 2 × SEED_JITTER > 8,4 erfüllen — eine
 *    HARTE, nicht nur statistische Grenze, weil SEED_JITTER eine feste
 *    Schranke ist und kein Erwartungswert. SEED_STEP = 8,7 und
 *    SEED_JITTER = 0,12 erfüllen das mit 8,46 > 8,4 und bleiben deshalb
 *    unverändert gültig — der Fehler in M2 lag ausschließlich in der
 *    Tiefenrechnung, nicht hier.
 * 2. TIEFE DER OBEREN EBENE. Beim Laden steht der Block in Phase 0, also in
 *    seiner HINTERSTEN Lage: plateY() = LOWER_DEPTH. Die obere Ebene reicht
 *    damit von LOWER_DEPTH bis FIELD_DEPTH. Für JEDEN der vier Halbmesser
 *    muss gelten LOWER_DEPTH + r <= y <= FIELD_DEPTH - r, also mit
 *    MAX_RADIUS und der festen Streuung:
 *      SEED_UPPER_FIRST_Y - SEED_JITTER >= LOWER_DEPTH + MAX_RADIUS
 *      SEED_UPPER_FIRST_Y + (SEED_UPPER_ROWS - 1) * SEED_STEP + SEED_JITTER
 *        <= FIELD_DEPTH - MAX_RADIUS
 *    Das ist genau die Rechnung, die in M2 falsch geführt wurde. Sie wird
 *    hier mit beiden Klammern ausgeführt und in V-4 nachgemessen, statt nur
 *    behauptet zu werden.
 * 3. TIEFE DER UNTEREN EBENE. Sie reicht bei Phase 0 von y = 0 bis
 *    y = LOWER_DEPTH. Es muss gelten:
 *      SEED_LOWER_FIRST_Y - SEED_JITTER >= FRONT_ZONE_DEPTH + MAX_RADIUS
 *      SEED_LOWER_FIRST_Y + (SEED_LOWER_ROWS - 1) * SEED_STEP + SEED_JITTER
 *        <= LOWER_DEPTH - MAX_RADIUS
 *    Die UNTERE Grenze ist die wichtigere: läge eine Saatmünze im vorderen
 *    Bereich, könnte sie im ersten Bild seitlich in den Verlustschacht
 *    rutschen oder vorn herausfallen — und damit GELD AUS DEM NICHTS
 *    erzeugen. V-4 und V-5 prüfen beides.
 * 4. BREITE. margin = (FIELD_WIDTH - (SEED_COLS - 1) * SEED_STEP) / 2 muss
 *    >= MAX_RADIUS + SEED_JITTER sein, sonst ragte die äußerste Spalte über
 *    den Feldboden.
 * 5. HÖHE. Alle Saatmünzen liegen EINLAGIG: die unteren bei z = 0, die
 *    oberen bei z = DECK_HEIGHT; vx = vy = vz = 0. Ein gestapelter
 *    Grundhaufen wäre möglich, wird aber nicht gebaut — er brächte eine
 *    zweite, komplexere Packrechnung für keinen erkennbaren Gewinn, und die
 *    erste Minute Spiel erzeugt die Stapel ohnehin selbst.
 *
 * DIE STÜCKZAHL. Der Auftraggeber hat am 2026-09-03 die Spanne 110 bis 130
 * gesetzt (der Haufen wirkte mit 78 halbleer), sicher unter COIN_CAP_MIN
 * (150). Die tatsächlich erreichte Stückzahl und – falls die Spanne mit der
 * neuen Maßordnung nicht erreichbar war – der Grund und die Rechnung dazu
 * stehen in DECISIONS.md.
 */

import { checksum, FIELD_WIDTH, FIELD_DEPTH, LOWER_DEPTH, DECK_HEIGHT,
	FRONT_ZONE_DEPTH, MAX_RADIUS, COIN_VALUES, COIN_RADIUS, FORMAT_VERSION }
	from '@phomo17/coin-pusher/field.js';

/**
 * Reihen je Ebene und Spalten. Zusammen (SEED_LOWER_ROWS + SEED_UPPER_ROWS)
 * * SEED_COLS Münzen.
 *
 * NOCH NICHT GEMESSEN / ENDGÜLTIG: Startwerte, die auf den Platzhaltermaßen
 * von field.js beruhen. Sobald tune-layout.mjs die vier Maße geliefert hat,
 * werden diese drei Zahlen anhand der fünf Rechnungen im Kopfkommentar so
 * groß gewählt, wie es die Geometrie zulässt, mit Ziel auf die Spanne
 * 110–130 (siehe DECISIONS.md für die tatsächlich erreichte Stückzahl).
 */
export const SEED_LOWER_ROWS = 3;
export const SEED_UPPER_ROWS = 5;
export const SEED_COLS = 13;

/** Die vorderste Saatreihe je Ebene. Beide abgeleitet, siehe Kopfkommentar,
 *  Rechnungen 2 und 3. */
export const SEED_LOWER_FIRST_Y = FRONT_ZONE_DEPTH + MAX_RADIUS + 1;
export const SEED_UPPER_FIRST_Y = LOWER_DEPTH + MAX_RADIUS + 1;

/** Abstand der Saatplätze, in beiden Achsen gleich. Unverändert aus der
 *  ersten Fassung – Rechnung 1 im Kopfkommentar bestätigt sie weiterhin. */
export const SEED_STEP = 8.7;

/** Streuung je Platz. Unverändert – Rechnung 1 im Kopfkommentar. */
export const SEED_JITTER = 0.12;

/**
 * Baut den Grundhaufen als Nutzlast im Speicherformat, das field.js bereits
 * versteht: Phase 0 (die Vorderwand des Blocks in ihrer hintersten Lage,
 * damit der Haufen der oberen Ebene den vollen ersten Schub bekommt),
 * gefolgt von der Stückzahl und der Münzliste.
 *
 * @param {() => number} random liefert je Aufruf eine ganze Zahl aus
 *        [0, 2^32) — im Spiel drawUint32() aus rng.js
 * @returns {string} vollständiger Speicherstand im Format "cp2|…"
 */
export function buildSeedState(random) {
	/**
	 * Wandelt eine gezogene Zahl in eine gleichverteilte Streuung aus
	 * [-SEED_JITTER, SEED_JITTER] um. 2^32 = 4294967296.
	 *
	 * @returns {number}
	 */
	function jitter() {
		return (random() / 4294967296 - 0.5) * 2 * SEED_JITTER;
	}

	// Eine einzige gezogene Zahl bestimmt, mit welchem Wert das Muster
	// beginnt. Dadurch sieht der Grundhaufen bei zwei Spielern nicht gleich
	// aus, ohne dass je Münze gewürfelt würde.
	const turn = random() % COIN_VALUES.length;
	const margin = (FIELD_WIDTH - (SEED_COLS - 1) * SEED_STEP) / 2;

	const coins = [];
	let born = 0;

	/**
	 * Legt ein Raster aus rows * SEED_COLS Münzen ab der Tiefe firstY auf die
	 * Höhe z. Dieselbe Schleife für beide Ebenen – der einzige Unterschied
	 * ist, wo sie anfängt und wie hoch sie liegt.
	 *
	 * Im Muster steht (r + c + born + turn) und nicht (r + c + turn): grid()
	 * wird ZWEIMAL gerufen, und ohne den durchlaufenden born läge über jeder
	 * unteren Münze dieselbe Wertfolge wie darunter – zwei Ebenen mit
	 * identischem Streifenmuster sähen wie ein Druckfehler aus. born ist die
	 * einzige Zahl, die über beide Aufrufe durchläuft; sie stammt aus einem
	 * Zähler und NICHT aus random().
	 *
	 * RICHTIGSTELLUNG (Befund beim Umbau, gilt auch für die erste Fassung
	 * dieser Datei): buildSeedState() zieht NICHT „genau zwei Zahlen". jitter()
	 * zieht je Aufruf einmal aus random(), und sie wird PRO SAATMÜNZE ZWEIMAL
	 * gerufen (einmal für x, einmal für y). Die tatsächliche Zugzahl ist
	 * 1 + 2 * Anzahl der Saatmünzen – eine für turn, zwei je Münze. Diese Zahl
	 * STEHT FEST und ändert sich nicht mit der Maßordnung; V-5 in
	 * verify-view.mjs prüft sie mit einem zählenden Zufallsgeber nach der
	 * Formel, statt eine geratene Zahl zu erwarten.
	 *
	 * @param {number} rows
	 * @param {number} firstY
	 * @param {number} z
	 * @returns {void}
	 */
	function grid(rows, firstY, z) {
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < SEED_COLS; c++) {
				const value = COIN_VALUES[(r + c + born + turn) % COIN_VALUES.length];
				const radius = COIN_RADIUS[COIN_VALUES.indexOf(value)];
				let x = margin + c * SEED_STEP + jitter();
				if (x < radius) { x = radius; }
				if (x > FIELD_WIDTH - radius) { x = FIELD_WIDTH - radius; }
				const y = firstY + r * SEED_STEP + jitter();
				coins.push(`${value},${born},${x},${y},${z},0,0,0`);
				born++;
			}
		}
	}

	grid(SEED_LOWER_ROWS, SEED_LOWER_FIRST_Y, 0);
	grid(SEED_UPPER_ROWS, SEED_UPPER_FIRST_Y, DECK_HEIGHT);

	// Phase 0: der Block steht in seiner hintersten Lage, der Haufen bekommt
	// beim ersten Schub den vollen Hub. spawnCount = born, damit die
	// Altersnummern lückenlos sind und das Ventil eine eindeutige
	// Reihenfolge hat.
	const payload = `0|${born}|${coins.join(';')}`;
	return `${FORMAT_VERSION}|${checksum(payload)}|${payload}`;
}

export default buildSeedState;
