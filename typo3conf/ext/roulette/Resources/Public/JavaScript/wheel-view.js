/**
 * Roulette – die Ansicht des Rades
 * ================================
 *
 * Die zweite Hälfte: das ANZEIGEN. Gerechnet wird in wheel-physics.js, und
 * diese Datei rechnet nichts nach. Sie schreibt je Bild vier Zahlen an zwei
 * Elemente und tut sonst nichts.
 *
 * KEINE WINKELFUNKTION, AUCH HIER NICHT
 * -------------------------------------
 * Die Umrechnung von „Winkel und Halbmesser" in „x und y" macht der Browser
 * über rotate() und translate() (siehe wheel.css). Diese Datei setzt nur
 * Custom Properties. Das ist nicht bloß bequem: es hält die Zusage aus
 * CONCEPT.md C.5.3 auch dort, wo sie streng genommen nicht gälte, und es ist
 * schneller als vier Zahlen je Bild selbst auszurechnen.
 *
 * BEWEGUNGSDROSSELUNG (CONCEPT.md C.3, letzter Punkt)
 * ---------------------------------------------------
 * Wer im Betriebssystem „Bewegung reduzieren" eingestellt hat, bekommt das
 * ERGEBNIS des Laufs sofort statt seines Ablaufs: der Lauf wird über
 * wheel.runToRest() vollständig durchgerechnet und nur sein Ende gezeigt.
 * Die Physik läuft dabei UNVERÄNDERT durch — es entfallen die Bilder
 * dazwischen, nicht die Rechnung. Genau so steht es schon in table.css:
 * „Nichts verschwindet dabei — nur die Zeit dazwischen."
 *
 * Nichts an dieser Ansicht blinkt. Die einzige schnelle Änderung ist die
 * Drehung selbst, und eine Drehung ist kein Aufblitzen (B.6.1 gilt
 * projektweit).
 *
 * KEINE BILDER FÜR EINEN VERSTECKTEN TAB
 * --------------------------------------
 * Bei document.hidden hält die Zeichenschleife an und der Zeitübertrag wird
 * verworfen — dieselbe Festlegung wie beim Münzschieber (DECISIONS.md
 * 2026-09-03 13:23). Nach höchstens MAX_CATCHUP_STEPS Schritten hört das
 * Nachholen ohnehin auf.
 *
 * WER WANN MALT
 * --------------
 * Diese Datei entscheidet, wann gezeichnet wird — nicht die Physik. Es steht
 * kein requestAnimationFrame in wheel-physics.js, und es steht keine Zeile
 * Physik hier: das ist dieselbe Trennung wie bei den bestehenden Automaten.
 *
 * DIE SCHLEIFE HÄLT VON SELBST AN UND VON SELBST WIEDER AN
 * ----------------------------------------------------------
 * Sie läuft, solange entweder eine Kugel unterwegs ist (Physik-Zustand
 * 'bahn', 'abstieg' oder 'rotor') oder die Radscheibe sich noch dreht
 * (wheelOmega ist nicht 0 — das gilt auch im Zustand 'liegt': die liegende
 * Kugel fährt mit dem Rad mit, siehe wheel-physics.js). Sind beide zur Ruhe
 * gekommen, hält die Schleife an; launch() wirft sie wieder an.
 */

import { Wheel, DT, SUBSTEPS, MAX_CATCHUP_STEPS } from '@phomo17/roulette/wheel-physics.js';

/** Ein Zeitschritt der Physik, in Millisekunden. Aus DT hergeleitet, nicht abgeschrieben. */
const DT_MS = DT * 1000;

/**
 * Die Sprunghöhe, ab der die Kugel beim Überspringen einer Rille „ganz oben"
 * aussieht. Rein optisch, keine physikalische Größe.
 */
const HOP_SCALE = 6;

/**
 * Vorgabe für options.reducedMotion. Getrennt von connectWheel(), damit ein
 * Nachweis sie überschreiben kann, ohne die Einstellung des Betriebssystems
 * zu ändern.
 *
 * @returns {boolean}
 */
function defaultReducedMotion() {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Verdrahtet die Ansicht eines Rades.
 *
 * @param {Element} root das [data-ro-wheel]
 * @param {import('./wheel-physics.js').Wheel} wheel die Physik
 * @param {{onRest?: function(number): void, reducedMotion?: function(): boolean,
 *          onFret?: function(number): void, onDeflector?: function(): void,
 *          onFrame?: function({phase: string, wheelOmega: number,
 *                              ballOmega: number, ballR: number}): void,
 *          onMotionEnd?: function(): void}} options
 * @returns {{launch: function(): boolean, paint: function(): void, destroy: function(): void, ok: boolean}}
 *   ok ist false GENAU DANN, wenn [data-ro-head]/[data-ro-ball] im Markup
 *   fehlen und launch() deshalb ein wirkungsloser Platzhalter bleibt
 *   (Behebung Review C3, M6) — roulette.js prüft das VOR dem ersten Druck
 *   auf den Auslöser, nicht erst danach.
 *
 * onRest()        wird EINMAL je Lauf gerufen, sobald die Kugel liegt, mit
 *                 dem Fachzeiger. Der einzige Weg nach draußen — dieselbe
 *                 Bauart wie paint() bei der Risiko-Leiter.
 * reducedMotion() darf überschrieben werden, damit der Nachweis beide Wege
 *                 prüfen kann, ohne die Einstellung des Betriebssystems zu
 *                 ändern. Vorgabe: matchMedia('(prefers-reduced-motion: reduce)').
 *
 * DIE VIER RÜCKRUFE DES KLANGS (Teilstück C3e) — ALLE GELESEN, KEINER GERECHNET
 * ------------------------------------------------------------------------------
 * sound-roulette.js braucht vier zusätzliche Meldungen, um zu wissen, WANN
 * etwas zu hören ist. Keine davon fügt der Physik eine einzige Zeile hinzu
 * oder verändert ein Ergebnis — sie LESEN nur ab, was wheel-physics.js schon
 * öffentlich macht (phase, ballH, ballVh, wheelOmega, ballOmega, ballR), und
 * zwar VOR und NACH jedem einzelnen wheel.step(). Die Physik selbst bleibt
 * damit so, wie sie mit 500.000 Läufen als gleichverteilt nachgewiesen ist
 * (CONCEPT.md C.5.3): kein Zähler, kein Ereignis, kein Wissen von Klang.
 *
 *   onFret(zahl)  Ein Rillenstoß hat gerade stattgefunden: die Kugel lag auf
 *                 der Rotorscheibe auf (ballH === 0, ballVh === 0), hat eine
 *                 Rille getroffen und ist wieder hochgesprungen (ballVh > 0
 *                 danach). Das ist GENAU der Augenblick, in dem
 *                 wheel-physics.js intern hitFret() aufruft — nur von außen
 *                 gesehen, ohne dass diese Datei den Namen hitFret() kennt.
 *                 zahl ist ein REIN ZÄHLENDER Wert (1, 2, 3 … je Lauf, auf 0
 *                 gestellt bei jedem launch()) — kein Spielwert, nur eine
 *                 Zählung für den Klang.
 *   onDeflector() Derselbe Kunstgriff für den einmaligen Rautenstoß beim
 *                 Übergang von der Laufbahn zur Schüssel (phase === 'abstieg',
 *                 ballVh springt von 0 auf einen Wert > 0).
 *   onFrame()     Einmal je GEZEICHNETEM Bild (nicht je Physikschritt) die
 *                 vier Zahlen, aus denen ein Dauerklang seine Tonhöhe ableiten
 *                 kann. sound-roulette.js entscheidet selbst, wie oft davon
 *                 wirklich ein neuer Ton entsteht — diese Datei drosselt
 *                 nichts, sie meldet nur.
 *   onMotionEnd() Die Zeichenschleife hat gerade von SICH AUS angehalten
 *                 (inBewegung() ist falsch geworden). Der Klang hört daran,
 *                 dass jetzt wirklich nichts mehr in Bewegung ist — Rad UND
 *                 Kugel —, und kann seine beiden Dauerklänge sauber ausblenden
 *                 statt sie an destroy() hängen zu müssen.
 *
 * Bei aktiver Bewegungsdrosselung (launch() ruft wheel.runToRest() ohne
 * Zeichenschleife) laufen KEINE dieser vier Meldungen: wer „Bewegung
 * reduzieren" eingestellt hat, bekommt das Ergebnis sofort und keine
 * Zwischentöne — dieselbe Haltung wie bei den Bildern selbst.
 */
export function connectWheel(root, wheel, options = {}) {
	const {
		onRest = null,
		reducedMotion = defaultReducedMotion,
		onFret = null,
		onDeflector = null,
		onFrame = null,
		onMotionEnd = null,
	} = options ?? {};

	const head = root.querySelector('[data-ro-head]');
	const ball = root.querySelector('[data-ro-ball]');
	if (head === null || ball === null) {
		console.error('[roulette] wheel-view.js: [data-ro-head] oder [data-ro-ball] fehlt im Markup — Rad bleibt unverdrahtet.');
		// ok: false (Behebung Review C3, M6): roulette.js kann diesen
		// Platzhalter so von einem echten Anschluss unterscheiden und den
		// Tisch schon beim Verdrahten sperren, statt erst beim ersten Druck
		// auf den Auslöser mitten in einer eingeleiteten Runde abzubrechen.
		return { launch: () => false, paint: () => {}, destroy: () => {}, ok: false };
	}

	let frame = 0;
	let last = 0;
	let carryMs = 0;

	/**
	 * Wie viele Rillenstöße dieser EINE Lauf schon hatte. Reine Zählung für
	 * onFret(zahl) — auf 0 gestellt bei jedem launch(), sonst nirgends
	 * verändert. Kein Spielwert, nichts, das gezogen wird: nur ein Zähler für
	 * den Klang, der damit hörbar machen kann, dass die Stöße gegen Ende einer
	 * Runde dichter aufeinanderfolgen.
	 */
	let fretHitCount = 0;

	/**
	 * Schreibt genau vier Zahlen an die zwei Elemente. Rechnet dabei keinen
	 * Sinus: rotate() und translate() in wheel.css machen die Umrechnung.
	 * @returns {void}
	 */
	function paint() {
		head.style.setProperty('--ro-wheel-turn', String(wheel.wheelTurn));
		ball.style.setProperty('--ro-ball-turn', String(wheel.ballTurn));
		ball.style.setProperty('--ro-ball-r', String(wheel.ballR));
		ball.style.setProperty('--ro-ball-hop', String(wheel.ballH / HOP_SCALE));
		ball.hidden = wheel.phase === 'ruht';
	}

	/** @returns {boolean} true, solange etwas am Rad noch in Bewegung ist */
	function inBewegung() {
		return (wheel.phase !== 'ruht' && wheel.phase !== 'liegt') || wheel.wheelOmega !== 0;
	}

	/** @returns {void} */
	function schleifeAnhalten() {
		if (frame !== 0) {
			globalThis.cancelAnimationFrame(frame);
			frame = 0;
		}
		last = 0;
	}

	/** @returns {void} */
	function schleifeAnwerfen() {
		if (frame === 0) {
			last = 0;
			carryMs = 0;
			frame = globalThis.requestAnimationFrame(bild);
		}
	}

	/**
	 * Ein Bild: fester Zeitschritt, gesammelter Zeitübertrag, höchstens
	 * MAX_CATCHUP_STEPS Schritte je Bild.
	 *
	 * @param {number} now performance.now()-Zeitstempel von requestAnimationFrame
	 * @returns {void}
	 */
	function bild(now) {
		frame = globalThis.requestAnimationFrame(bild);

		const verstrichen = last === 0 ? DT_MS * SUBSTEPS : now - last;
		last = now;

		const vorrat = carryMs + verstrichen;
		let schritte = Math.floor(vorrat / DT_MS);
		if (schritte > MAX_CATCHUP_STEPS) {
			schritte = MAX_CATCHUP_STEPS;
			carryMs = 0;
		} else {
			carryMs = vorrat - schritte * DT_MS;
		}

		let liegtJetzt = false;
		let ergebnis = null;
		for (let i = 0; i < schritte; i++) {
			const warLiegend = wheel.phase === 'liegt';
			// Vor dem Schritt gemerkt: genau die drei Werte, aus denen sich
			// hinterher ablesen lässt, OB und WELCHER Stoß eben stattfand —
			// siehe der lange Kommentar bei connectWheel() weiter oben.
			const vorPhase = wheel.phase;
			const vorBallH = wheel.ballH;
			const vorBallVh = wheel.ballVh;

			wheel.step();

			if (!warLiegend && wheel.phase === 'liegt') {
				liegtJetzt = true;
				ergebnis = wheel.result;
			}

			// Rautenstoß: nur während des Abstiegs, und die Physik prüft ihn
			// selbst nur einmal je Lauf (Kommentar in hitDeflector()) — ballVh
			// springt dabei von 0 auf einen Wert > 0.
			if (vorPhase === 'abstieg' && vorBallVh === 0 && wheel.ballVh > 0
				&& typeof onDeflector === 'function') {
				onDeflector();
			}

			// Rillenstoß: nur auf der Rotorscheibe, und nur, wenn die Kugel
			// vorher wirklich AUFLAG (ballH === 0 UND ballVh === 0) — sonst
			// wäre es die Landung nach einem vorigen Sprung, kein neuer Stoß.
			if (vorPhase === 'rotor' && vorBallH === 0 && vorBallVh === 0 && wheel.ballVh > 0) {
				fretHitCount += 1;
				if (typeof onFret === 'function') {
					onFret(fretHitCount);
				}
			}
		}

		paint();

		if (liegtJetzt && typeof onRest === 'function') {
			onRest(ergebnis);
		}

		if (typeof onFrame === 'function') {
			onFrame({
				phase: wheel.phase,
				wheelOmega: wheel.wheelOmega,
				ballOmega: wheel.ballOmega,
				ballR: wheel.ballR,
			});
		}

		if (!inBewegung()) {
			schleifeAnhalten();
			if (typeof onMotionEnd === 'function') {
				onMotionEnd();
			}
		}
	}

	/**
	 * Wirft die Kugel ein.
	 *
	 * Bei Bewegungsdrosselung wird der Lauf vollständig durchgerechnet und
	 * nur sein Ende gezeigt — keine Zeichenschleife.
	 *
	 * @returns {boolean} false, wenn schon eine Kugel unterwegs ist
	 */
	function launch() {
		const gestartet = wheel.launch();
		if (!gestartet) {
			return false;
		}
		fretHitCount = 0;

		if (reducedMotion()) {
			wheel.runToRest();
			paint();
			if (typeof onRest === 'function') {
				onRest(wheel.result);
			}
			return true;
		}

		paint();
		schleifeAnwerfen();
		return true;
	}

	/**
	 * Bei document.hidden hält die Schleife an und der Zeitübertrag wird
	 * verworfen. Kommt die Seite zurück und ist noch etwas in Bewegung, läuft
	 * die Schleife wieder an.
	 * @returns {void}
	 */
	function onVisibility() {
		if (root.ownerDocument.hidden) {
			schleifeAnhalten();
			carryMs = 0;
		} else if (inBewegung()) {
			schleifeAnwerfen();
		}
	}
	root.ownerDocument.addEventListener('visibilitychange', onVisibility);

	/** Schleife abbestellen, visibilitychange abmelden. @returns {void} */
	function destroy() {
		schleifeAnhalten();
		root.ownerDocument.removeEventListener('visibilitychange', onVisibility);
	}

	paint();

	return { launch, paint, destroy, ok: true };
}

export default connectWheel;
