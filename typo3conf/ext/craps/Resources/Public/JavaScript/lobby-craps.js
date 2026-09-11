/**
 * Craps – der Anschluss an die Lobby (CONCEPT.md D.10, Phase D5a)
 * =================================================================
 *
 * Aufbau wie roulette/lobby-roulette.js (D5-3, Plan 4.14/4.16) — dieselben
 * vier Ereignisse, dieselbe Regel „kein fetch-Aufruf, keine Adresse, kein Geld".
 * Vier Unterschiede, alle unten dokumentiert:
 *
 *   (1) der Wurf kommt IMMER aus der Saat, nie aus der Hand (aufRunde() ruft
 *       teile.starten(null) — „alles ziehen", round-craps.js).
 *   (2) ein ungültiger Wurf bleibt gleichläufig — der Geber wird NICHT
 *       zurückgestellt, bevor ein gültiges Ergebnis gemeldet ist.
 *   (3) die Ergebnis-Nutzlast trägt den Point und die Seven-out-Marke
 *       (nutzlast()).
 *   (4) der Point wird bei JEDER geänderten Abfrage aus dem festgeschriebenen
 *       Ergebnis des Servers nachgezogen (pointAusStand()) — geldkritisch,
 *       siehe dort.
 *
 * DIE WÜRFEL-WARTELISTE (D.10.6, Plan 4.16 Punkt 5): stand.w (die Platznummer
 * des Shooters) und stand.p[].sn (Wartelistennummern) werden von der
 * PLATZLEISTE ausgewertet — Anzeige und Ein-/Austragen stehen bereits
 * vollständig in casino_lobby (SeatStrip.php, Strip.html, lobby-live.js,
 * Umsetzungsstück D5-2). craps.js selbst braucht dafür NICHTS zu tun, weil
 * die Wurfschiene in der Lobby ohnehin für JEDEN Platz stillliegt (Punkt 1:
 * der Wurf kommt immer aus der Saat, nie aus der Hand — nicht nur für
 * Nicht-Shooter). Eine zweite, shooter-abhängige Sperre wäre wirkungslose
 * Dopplung derselben Bedingung. Diese Datei liest stand.w/stand.p[].sn
 * deshalb nicht gesondert — ABWEICHUNG vom Plantext, im Bericht benannt.
 *
 * KEIN fetch-Aufruf, KEINE ADRESSE, KEIN GELD. KEIN DOKUMENT AUSSER DEN VIER
 * EREIGNISSEN.
 */

/** Die Zustände, in denen das Tuch für eigene Chips offen ist. */
const OFFEN = 'setzen';

/**
 * Die Nutzlast, die der Server festschreibt (D.10.4) — und zugleich das
 * Einzige, woran ein Browser, der eine Runde verpasst hat, den geltenden
 * Point wieder erkennt.
 *
 * Form:  "<würfel1>_<würfel2>_<ereignis>_<point>"
 * etwa:  "4_3_so_0"   Seven-out, kein Point mehr
 *        "6_2_ps_8"   Point gesetzt auf 8
 *        "5_1_r_8"    gewöhnlicher Wurf, Point bleibt 8
 *
 * Unterstriche statt Doppelpunkten, weil der Endpunkt nur [A-Za-z0-9_-]
 * annimmt (LobbyEndpoint::wert()).
 *
 * DIE MARKE "_so" IST DAS EINZIGE, WAS DER SERVER AN DIESER ZEICHENKETTE
 * VERSTEHT: er gibt daraufhin die Würfel weiter (LobbyService::ergebnis()).
 * Er rechnet das Seven-out NICHT nach — er kann es nicht, die Regeln liegen
 * in JavaScript. Dieselbe offengelegte Grenze wie bei D.10.4.
 *
 * @param {{faces: number[], event: string}} report
 * @param {?number} point
 * @returns {string}
 */
export function nutzlast(report, point) {
	const kurz = { 'seven-out': 'so', 'point-set': 'ps', 'point-made': 'pm',
	               natural: 'na', craps: 'cr', roll: 'r' };
	return `${report.faces[0]}_${report.faces[1]}_${kurz[report.event] ?? 'r'}_${point ?? 0}`;
}

/**
 * DER GELDKRITISCHE TEIL DIESES ADAPTERS — die Rechnung, ohne Seiteneffekt.
 *
 * Der Point ist beim Craps Tischzustand, nicht Spielerzustand: er entscheidet
 * mit, ob eine Place-Wette arbeitet oder ruht und wie eine Pass Line
 * ausgeht. Ein Browser, der eine Runde verpasst hat — Registerkarte im
 * Hintergrund, Netz kurz weg, oder gerade erst beigetreten —, hätte einen
 * ALTEN Point und rechnete seine EIGENEN Einsätze danach ab. Das wäre ein
 * Geldfehler, den niemand sieht: die Zahlen sind plausibel, nur falsch.
 *
 * Deshalb wird der Point bei JEDER geänderten Abfrage aus dem
 * festgeschriebenen Ergebnis des Servers gelesen, nicht aus dem eigenen
 * Gedächtnis — und zwar auch dann, wenn er sich scheinbar nicht geändert hat.
 * stand.ergR sagt, zu welcher Runde die Nutzlast gehört; ist sie älter als
 * die laufende Runde minus eins, wurde eine Runde ohne Meldung durchgefallen,
 * und der Aufrufer (connectLobby() unten) darf den Point NICHT nachziehen —
 * der sichere Zustand ist dann der zuletzt bekannte, nicht ein geratener.
 *
 * REINE FUNKTION, wie nutzlast() oben: sie liest nur ihr Argument und
 * schreibt nichts — deshalb kann verify-lobby-craps.mjs (C-6) mit ihr
 * rechnen, ohne einen Adapter aufzubauen.
 *
 * @param {{erg?: string, ergR?: number, runde?: number}} stand
 * @returns {number|null|undefined} der nachzuziehende Point (null = kein
 *          Point steht), oder undefined, wenn NICHT nachgezogen werden darf
 *          (die Nutzlast ist zu alt oder fehlt)
 */
export function pointAusStand(stand) {
	const teileNutzlast = String(stand.erg ?? '').split('_');
	if (teileNutzlast.length === 4 && Number(stand.ergR) >= Number(stand.runde) - 1) {
		return Number(teileNutzlast[3]) || null;
	}
	return undefined;
}

/**
 * Verdrahtet einen Craps-Tisch mit der Lobby.
 *
 * @param {{
 *   saatGeber: function(string): function(): number,
 *   geberSetzen: function(?function(): number): void,
 *   starten: function(?Array<object>): {ok: boolean, reason?: string},
 *   einsaetze: function(): Array<{f: string, b: number}>,
 *   sperren: function(boolean): void,
 *   fremdeEinsaetze: function(Array<object>): void,
 *   pointSetzen: function(?number): void,
 *   uhr: function(number, string): void
 * }} teile
 * @returns {{melden: function(object): void, destroy: function(): void}}
 */
export function connectLobby(teile) {
	let runde = 0;
	let gemeldet = false;
	let letzteFelder = '';

	/** Die Saat wird zum Geber, der Wurf kommt „aus der Saat" (Punkt 1). */
	function aufRunde(ereignis) {
		const saat = String(ereignis.detail?.saat ?? '');
		runde = Number(ereignis.detail?.runde ?? 0);
		gemeldet = false;
		if (saat === '') {
			return;
		}
		teile.geberSetzen(teile.saatGeber(saat));
		const ergebnis = teile.starten(null);
		if (ergebnis.ok !== true) {
			teile.geberSetzen(null);
		}
	}

	/**
	 * Der Tisch hat sein Ergebnis. An die Lobby geht die Nutzlast (Punkt 3)
	 * und die eigene Bilanz je betroffenem Feld — nur die WIRKLICH
	 * abgerechneten Felder (win/loss/push); was liegen bleibt ('stay') oder
	 * wandert ('move'), hat in diesem Wurf keinen Ausgang.
	 *
	 * @param {{report: Object, point: ?number}} ausgang
	 */
	function melden(ausgang) {
		if (gemeldet) {
			return;
		}
		gemeldet = true;
		teile.geberSetzen(null);
		document.dispatchEvent(new CustomEvent('casino:lobby-fertig', {
			detail: { ergebnis: nutzlast(ausgang.report, ausgang.point) },
		}));
		const aus = {};
		for (const feld of ausgang.report.fields) {
			if (feld.outcome === 'win' || feld.outcome === 'loss' || feld.outcome === 'push') {
				aus[feld.fieldId] = feld.returned - feld.staked;
			}
		}
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'bilanz', daten: { runde, aus } },
		}));
	}

	/**
	 * Jede geänderte Abfrage: Point nachziehen (Punkt 4, geldkritisch), das
	 * Tuch nach dem Zustand des Servers sperren, die Einsätze der anderen
	 * weiterreichen, den eigenen Einsatz melden, wenn er sich geändert hat.
	 */
	function aufStand(ereignis) {
		const stand = ereignis.detail ?? {};
		const point = pointAusStand(stand);
		if (point !== undefined) {
			teile.pointSetzen(point);
		}
		teile.sperren(stand.z !== OFFEN);
		teile.uhr(Number(stand.rest) || 0, String(stand.z ?? ''));
		teile.fremdeEinsaetze(Array.isArray(stand.p) ? stand.p : []);

		if (stand.z === OFFEN) {
			const felder = teile.einsaetze();
			const abdruck = JSON.stringify(felder);
			if (abdruck !== letzteFelder) {
				letzteFelder = abdruck;
				document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
					detail: { art: 'einsatz', daten: { runde: Number(stand.runde ?? 0), felder } },
				}));
			}
		} else {
			letzteFelder = '';
		}
	}

	document.addEventListener('casino:lobby-runde', aufRunde);
	document.addEventListener('casino:lobby-stand', aufStand);

	return {
		melden,
		destroy() {
			document.removeEventListener('casino:lobby-runde', aufRunde);
			document.removeEventListener('casino:lobby-stand', aufStand);
		},
	};
}

export default connectLobby;
