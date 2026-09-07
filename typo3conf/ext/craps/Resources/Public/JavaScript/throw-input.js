/**
 * Craps – Aufnehmen, Schütteln, Werfen (Maus und Finger)
 * =========================================================
 *
 * CONCEPT.md C.8.2: Aufnehmen, Schütteln und Werfen mit Maus und Finger.
 * Diese Datei steht für sich, weil sie eine BEDIENUNG ist und keine Physik
 * und keine Ansicht — dieselbe Trennung wie beim Hebel des
 * Drei-Walzen-Automaten (lever.js), dessen Bauart hier übernommen wird.
 *
 * POINTER-EREIGNISSE STATT GETRENNTER MAUS-/BERÜHRUNGSBEHANDLUNG
 * -------------------------------------------------------------------
 * Sie decken Maus, Finger und Stift mit einem Satz Zuhörer ab, und
 * setPointerCapture() sorgt dafür, dass der Zug auch dann weiterläuft, wenn
 * der Zeiger die Wanne verlässt — man hält ja etwas in der Hand, man fährt
 * nicht über eine Fläche. element.style.touchAction = 'none' wird AUS DEM
 * JAVASCRIPT gesetzt und nicht im Stylesheet: ohne JavaScript soll die Seite
 * ganz normal scrollbar bleiben. Beide Sätze wörtlich aus lever.js
 * übernommen.
 *
 * DIE VIER ZUSTÄNDE
 * ------------------
 *   bereit       Anfangszustand — die Würfel liegen rechts an der Wurfkante.
 *   hand         pointerdown auf der Wanne, wenn hooks.isArmed() zusagt:
 *                setPointerCapture, die Würfel folgen dem Zeiger, onPick().
 *   schuetteln   pointermove in hand: jede angesammelte Bewegung von
 *                SHAKE_STEP Bildpunkten kippt beide Würfel einmal in
 *                Bewegungsrichtung (tipFaces() aus dice-geometry.js — NICHTS
 *                daran wird gezogen, die Lage beim Loslassen ist eine
 *                Funktion der Zeigerspur); der Geschwindigkeitspuffer wird
 *                gefüllt.
 *   geworfen     pointerup: Wurfkraft aus dem Puffer, onThrow(setup), zurück
 *                nach bereit.
 *
 * WIE DIE WÜRFEL SICHTBAR DEM ZEIGER FOLGEN, OHNE --cr-* ANZUFASSEN
 * ---------------------------------------------------------------------
 * dice-view.js ist der EINZIGE Schreiber der Custom Properties --cr-x, --cr-y
 * und der Drehmatrix an einer Würfelgruppe (Prüfung V-2) — und das zu Recht:
 * die Physik hat während des Aufnehmens/Schüttelns noch gar nicht zu laufen
 * begonnen (table.phase bleibt 'ruht', kein Wurf ist gestartet). Diese Datei
 * bewegt die beiden Gruppen deshalb über eine EIGENE, unabhängige Eigenschaft
 * — die Inline-Eigenschaft style.transform, die jede CSS-Regel (auch die
 * durch --cr-* gesteuerte matrix()-Regel aus tray.css) so lange überschreibt,
 * wie sie gesetzt ist. Beim Loslassen oder Abbrechen wird sie wieder entfernt
 * (raeumeDarstellungAuf()), bevor onThrow()/onCancel() gerufen wird — erst
 * danach darf dice-view.js die Gruppe wieder über --cr-* führen. Zwei
 * getrennte, sich zeitlich nie überlappende Schreibwege statt eines
 * gemeinsamen: EIGENE ENTSCHEIDUNG dieses Umsetzungsstücks, siehe
 * DECISIONS.md.
 *
 * DIE WURFKRAFT AUS DER ZEIGERGESCHWINDIGKEIT DER LETZTEN AUGENBLICKE
 * -----------------------------------------------------------------------
 * C.8.2 wörtlich: „ergibt sich aus der Geschwindigkeit der Zeigerbewegung in
 * den letzten Augenblicken vor dem Loslassen." Bei jedem pointermove wird
 * {t, x, y} (in Wanneneinheiten) in einen Ringpuffer geschrieben. Beim
 * Loslassen werden alle Einträge verworfen, die älter als WINDOW_MS sind; aus
 * dem ältesten verbleibenden und dem jüngsten ergibt sich der zurückgelegte
 * Weg und die verstrichene Zeit, daraus die Geschwindigkeit in
 * Wanneneinheiten je Sekunde — die Größe, in der die Physik rechnet — und
 * dann begrenzt auf [SPEED_MIN, SPEED_MAX]. SPEED_MIN liegt BEWUSST
 * unterhalb dessen, was für einen gültigen Wurf reicht (rund 240): ein zu
 * schwacher Wurf SOLL möglich sein und an der Mindestwurf-Regel scheitern.
 *
 * Die Richtung ist die Richtung der letzten Bewegung, auf einen
 * Einheitsvektor gebracht; zeigt sie nach rechts (von der Gegenbande weg),
 * wird sie an der Senkrechten gespiegelt — an einem echten Tisch wirft man
 * nicht rückwärts. Dieser eine Eingriff greift in die RICHTUNG, nie in das
 * ERGEBNIS. bx/by (die Gierlage im setup) werden auf dieselbe Richtung
 * gesetzt wie dx/dy — eine einfache, klar benannte Festlegung, da eine
 * Zeigerspur keine eigene Körperachse misst.
 */

import {
	FELT_LEFT, FELT_RIGHT, FELT_TOP, FELT_BOTTOM, HALF_EDGE, VIEW_W, tipFaces,
} from '@phomo17/craps/dice-geometry.js';

/** Fenster, über das die Wurfkraft gemittelt wird. */
const WINDOW_MS = 120;
/** Länge des Ringpuffers. Bei 120 Hz Zeigerrate deckt er gut 200 ms ab. */
const SAMPLES = 24;
/** Wurfkraft in Wanneneinheiten je Sekunde: langsamster und schnellster nutzbarer Wurf. */
export const SPEED_MIN = 90;
export const SPEED_MAX = 520;
/** Angesammelte Zeigerbewegung (Bildpunkte), ab der ein Schüttelschritt auslöst. */
const SHAKE_STEP = 16;

/**
 * Die feste Ausgangslage beider Würfel beim Aufnehmen — zwei beliebige,
 * gültige Lagen aus den 24 in dice-geometry.js (ORIENTATIONS enthält
 * [1, 2, 3] und [4, 5, 6]).
 */
const START_LAGE = [
	{ top: 1, front: 2, right: 3 },
	{ top: 4, front: 5, right: 6 },
];

/** @param {[number, number, number]} lage @returns {{top:number, front:number, right:number}} */
function alsLage([top, front, right]) {
	return { top, front, right };
}

/** Die Kipprichtung aus dem Vorzeichen der Bewegung — keine Winkelfunktion. */
function schuettelRichtung(dx, dy) {
	if (Math.abs(dx) >= Math.abs(dy)) {
		return dx >= 0 ? 0 : 1;
	}
	return dy >= 0 ? 2 : 3;
}

/**
 * @param {Element} root das [data-cr-tray]
 * @param {{isArmed: function(): boolean,
 *          onPick: function(): void,
 *          onShake: function(Array<{top:number,front:number,right:number}>): void,
 *          onThrow: function(Array<object>): void,
 *          onCancel: function(): void}} hooks
 * @returns {{destroy: function(): void, faces: function(): Array<object>}}
 *
 * isArmed()  liefert false, wenn gerade nicht geworfen werden darf (ein Wurf
 *            läuft, oder der Modus ist „Zuschauen"). Dann wird gar nicht
 *            erst aufgenommen — ein Aufnehmen, das nichts bewirkt, wäre eine
 *            sichtbare Lüge.
 * onThrow()  bekommt je Würfel ein setup-Objekt für DiceTable.roll(): x, y,
 *            dx, dy, speed, bx, by, top, front, right. Höhe, Steigen,
 *            Gierdrehung und Taumeln fehlen ABSICHTLICH und werden von der
 *            Physik gezogen — eine Zeigerspur misst sie nicht.
 */
export function connectThrow(root, hooks) {
	const {
		isArmed = () => true,
		onPick = () => {},
		onShake = () => {},
		onThrow = () => {},
		onCancel = () => {},
	} = hooks ?? {};

	const gruppen = [
		root.querySelector('[data-cr-die="0"]'),
		root.querySelector('[data-cr-die="1"]'),
	];
	const flaechen = gruppen.map((g) => g?.querySelector('.cr-die__face') ?? null);

	// Ohne das rollt ein Fingerzug die Seite, statt die Würfel aufzunehmen.
	root.style.touchAction = 'none';

	let zustand = 'bereit';
	let pointerId = -1;
	let skala = 1;
	let rectLeft = 0;
	let rectTop = 0;
	let letzteX = 0;
	let letzteY = 0;
	let angesammelt = 0;
	/** @type {Array<{top:number, front:number, right:number}>} */
	let lagen = [{ ...START_LAGE[0] }, { ...START_LAGE[1] }];
	/** @type {Array<{x:number, y:number}>} */
	let positionen = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
	/** @type {Array<{t:number, x:number, y:number}>} Wanneneinheiten. */
	let puffer = [];

	/** @returns {{x:number, y:number}} Zeigerort in Wanneneinheiten. */
	function neuePosition(clientX, clientY) {
		return { x: (clientX - rectLeft) * skala, y: (clientY - rectTop) * skala };
	}

	/** @returns {{x:number, y:number}} auf die Spielfläche geklemmt. */
	function begrenze(pos) {
		return {
			x: Math.min(FELT_RIGHT - HALF_EDGE, Math.max(FELT_LEFT + HALF_EDGE, pos.x)),
			y: Math.min(FELT_BOTTOM - HALF_EDGE, Math.max(FELT_TOP + HALF_EDGE, pos.y)),
		};
	}

	/** Bewegt beide Gruppen über eine eigene Inline-Eigenschaft, siehe Dateikopf. */
	function male() {
		for (let i = 0; i < 2; i++) {
			const g = gruppen[i];
			if (!g) {
				continue;
			}
			const p = positionen[i];
			g.style.transform = `translate(${p.x}px, ${p.y}px)`;
			const use = flaechen[i];
			if (use) {
				use.setAttribute('href', `#cr-face-${lagen[i].top}`);
			}
		}
	}

	/** Gibt die Gruppen wieder an die --cr-*-gesteuerte CSS-Regel zurück. */
	function raeumeDarstellungAuf() {
		for (const g of gruppen) {
			g?.style.removeProperty('transform');
		}
	}

	function mittelpunkte(zeigerMitte) {
		return [
			begrenze({ x: zeigerMitte.x, y: zeigerMitte.y - 10 }),
			begrenze({ x: zeigerMitte.x, y: zeigerMitte.y + 10 }),
		];
	}

	/** @param {PointerEvent} event */
	function handleDown(event) {
		if (zustand !== 'bereit' || !event.isPrimary || !isArmed()) {
			return;
		}
		const svg = root.querySelector('.cr-tray__drawing');
		const rect = (svg ?? root).getBoundingClientRect();
		if (rect.width <= 0) {
			return;
		}
		skala = VIEW_W / rect.width;
		rectLeft = rect.left;
		rectTop = rect.top;

		zustand = 'hand';
		pointerId = event.pointerId;
		/*
		 * Die Fangschaltung ist eine Annehmlichkeit, keine Voraussetzung:
		 * setPointerCapture() wirft, wenn der Zeiger zu diesem Augenblick
		 * schon wieder losgelassen ist (sehr kurzer Tipp) oder wenn das
		 * Ereignis nicht von einem echten Zeiger stammt. Ohne Fangschaltung
		 * läuft der Zug weiter, er endet nur, wenn die Wanne verlassen wird —
		 * ein unbehandelter Fehler in der Konsole wäre der schlechtere Tausch.
		 * Im Bedienlauf der Hauptsitzung (2026-09-07) trat genau das auf.
		 */
		try {
			root.setPointerCapture(pointerId);
		} catch {
			/* ohne Fangschaltung weiter — siehe oben */
		}

		lagen = [{ ...START_LAGE[0] }, { ...START_LAGE[1] }];
		const mitte = neuePosition(event.clientX, event.clientY);
		positionen = mittelpunkte(mitte);
		letzteX = event.clientX;
		letzteY = event.clientY;
		angesammelt = 0;
		puffer = [{ t: globalThis.performance.now(), x: mitte.x, y: mitte.y }];

		male();
		onPick();
	}

	/** @param {PointerEvent} event */
	function handleMove(event) {
		if (zustand === 'bereit' || event.pointerId !== pointerId) {
			return;
		}
		zustand = 'schuetteln';

		const mitte = neuePosition(event.clientX, event.clientY);
		positionen = mittelpunkte(mitte);

		const dx = event.clientX - letzteX;
		const dy = event.clientY - letzteY;
		letzteX = event.clientX;
		letzteY = event.clientY;
		angesammelt += Math.sqrt(dx * dx + dy * dy);

		while (angesammelt >= SHAKE_STEP) {
			angesammelt -= SHAKE_STEP;
			const dir0 = schuettelRichtung(dx, dy);
			const dir1 = (dir0 + 1) % 4;
			lagen[0] = alsLage(tipFaces(lagen[0].top, lagen[0].front, lagen[0].right, dir0));
			lagen[1] = alsLage(tipFaces(lagen[1].top, lagen[1].front, lagen[1].right, dir1));
		}

		puffer.push({ t: globalThis.performance.now(), x: mitte.x, y: mitte.y });
		if (puffer.length > SAMPLES) {
			puffer.shift();
		}

		male();
		onShake([{ ...lagen[0] }, { ...lagen[1] }]);
	}

	/** @returns {{speed:number, dx:number, dy:number}} */
	function wurfkraftUndRichtung() {
		const jetzt = globalThis.performance.now();
		const gueltig = puffer.filter((p) => jetzt - p.t <= WINDOW_MS);
		if (gueltig.length < 2) {
			return { speed: SPEED_MIN, dx: -1, dy: 0 };
		}
		const erster = gueltig[0];
		const letzter = gueltig[gueltig.length - 1];
		const zeitS = (letzter.t - erster.t) / 1000;
		const wegX = letzter.x - erster.x;
		const wegY = letzter.y - erster.y;
		const weg = Math.sqrt(wegX * wegX + wegY * wegY);
		let speed = zeitS > 0 ? weg / zeitS : 0;
		speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));

		let dx = weg > 0 ? wegX / weg : -1;
		let dy = weg > 0 ? wegY / weg : 0;
		if (dx > 0) {
			// Gespiegelt an der Senkrechten: nie rückwärts werfen. Greift in
			// die Richtung, nie in das Ergebnis.
			dx = -dx;
		}
		return { speed, dx, dy };
	}

	function beendeGeste() {
		if (pointerId !== -1 && root.hasPointerCapture(pointerId)) {
			root.releasePointerCapture(pointerId);
		}
		zustand = 'bereit';
		pointerId = -1;
		raeumeDarstellungAuf();
	}

	/** @param {PointerEvent} event */
	function handleUp(event) {
		if (zustand === 'bereit' || event.pointerId !== pointerId) {
			return;
		}
		const warAbbruch = event.type === 'pointercancel';
		beendeGeste();

		if (warAbbruch) {
			// Ein weggerissener Finger hat nicht geworfen.
			onCancel();
			return;
		}

		const { speed, dx, dy } = wurfkraftUndRichtung();
		const setup = [0, 1].map((i) => ({
			x: positionen[i].x,
			y: positionen[i].y,
			dx,
			dy,
			bx: dx,
			by: dy,
			speed,
			top: lagen[i].top,
			front: lagen[i].front,
			right: lagen[i].right,
		}));
		onThrow(setup);
	}

	/** @returns {Array<object>} eine Abschrift der aktuellen Lagen, für Prüfzwecke. */
	function faces() {
		return lagen.map((l) => ({ ...l }));
	}

	root.addEventListener('pointerdown', handleDown);
	root.addEventListener('pointermove', handleMove);
	root.addEventListener('pointerup', handleUp);
	root.addEventListener('pointercancel', handleUp);

	/**
	 * Meldet alle vier Zuhörer ab und gibt eine noch gehaltene Zeigererfassung
	 * frei.
	 * @returns {void}
	 */
	function destroy() {
		root.removeEventListener('pointerdown', handleDown);
		root.removeEventListener('pointermove', handleMove);
		root.removeEventListener('pointerup', handleUp);
		root.removeEventListener('pointercancel', handleUp);
		if (pointerId !== -1 && root.hasPointerCapture(pointerId)) {
			root.releasePointerCapture(pointerId);
		}
		raeumeDarstellungAuf();
	}

	return { destroy, faces };
}

export default connectThrow;
