/**
 * Casino Kunterbunt – Platzleiste und Übersicht im Betrieb (CONCEPT.md D.10, D4c)
 * ================================================================================
 *
 * Bedient BEIDE Seiten, die den Zustandsblock [data-cl-state] tragen: den
 * Tisch (Platzleiste, [data-cl-strip]) und die Übersicht ([data-cl-list]).
 * Erkannt wird der Fall am Zustandsblock selbst: zustand.platz === 0 heißt
 * Übersicht, sonst Tisch (Plan 4.30, Punkt 7).
 *
 * DER EINZIGE IMPORT, UND WARUM ER RELATIV IST: lobby-seed.js liegt im selben
 * ausgelieferten Verzeichnis. Ein Import über die Import-Karte des Kerns
 * bräuchte ein <f:asset.module>, das keine der beiden Seiten rendert — ein
 * relativer Import braucht keine Karte. Es gibt genau EINEN Importeur und
 * genau EINEN Namen, also keine Gefahr, dass die Datei zweimal im Speicher
 * landet (die D3-Lehre).
 *
 * ABGEFRAGT, NICHT GESTREAMT (D.10.5): ein einziger, verketteter setTimeout
 * je Seite — nie setInterval. Die nächste Abfrage wird erst geplant, NACHDEM
 * die vorige beantwortet ist; so kann sich nie eine Anfrage stauen.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Jeder Satz kommt aus
 * einem data-cl-text-*-Attribut der Vorlage und damit aus locallang.xlf.
 */

import { probe } from './lobby-seed.js';

/** Rückfall bei Netzstörung, wachsender Abstand (Plan 4.30, Punkt 3). */
const RUECKFALL_MS = [1000, 2000, 5000, 10000, 30000];

/** Ab diesem Fehlschlag in Folge zeigt die Leiste "getrennt" an. */
const RUECKFALL_ANZEIGE_AB = 3;

/** Wartezeit auf ein Ergebnis vom Tisch, bevor die Lobby selbst weitermacht (Plan 4.30, Punkt 5). In D4 gibt es keinen Tisch, der Rückfall greift also immer. */
const LAUF_RUECKFALL_MS = 3000;

const zustandBlock = document.querySelector('script[type="application/json"][data-cl-state]');

function lesenZustand() {
	if (zustandBlock === null) {
		return null;
	}
	try {
		const geparst = JSON.parse(zustandBlock.textContent ?? '');
		return geparst !== null && typeof geparst === 'object' ? geparst : null;
	} catch {
		return null;
	}
}

const zustand = lesenZustand();
if (zustand !== null) {
	if (zustand.platz > 0) {
		tisch(zustand);
	} else {
		uebersicht(zustand);
	}
}

/**
 * Der Tisch: die Platzleiste am Leben halten (Plan 4.30).
 *
 * @param {object} zustand aus data-cl-state
 */
function tisch(zustand) {
	const strip = document.querySelector('[data-cl-strip]');
	if (strip === null) {
		return;
	}

	const seatsListe = strip.querySelector('[data-cl-seats]');
	const zusammenText = strip.querySelector('[data-cl-together]');
	const stateText = strip.querySelector('[data-cl-state-text]');
	const timerText = strip.querySelector('[data-cl-timer]');
	const seedText = strip.querySelector('[data-cl-seed]');
	const probeText = strip.querySelector('[data-cl-probe]');
	const notice = strip.querySelector('[data-cl-notice]');
	const noticeText = notice?.querySelector('[data-cl-notice-text]') ?? null;
	const noticeReload = notice?.querySelector('[data-cl-notice-reload]') ?? null;
	const leaveButton = strip.querySelector('[data-cl-leave]');

	const textZustand = {
		setzen: strip.dataset.clTextSetzen ?? '',
		gesperrt: strip.dataset.clTextGesperrt ?? '',
		laeuft: strip.dataset.clTextLaeuft ?? '',
		auswerten: strip.dataset.clTextAuswerten ?? '',
	};
	const textRestVorlage = strip.dataset.clTextRest ?? '';
	const textKeine = strip.dataset.clTextKeine ?? '';
	const textAllein = strip.dataset.clTextAllein ?? '';
	const textZusammenVorlage = strip.dataset.clTextZusammenVorlage ?? '';
	const textPlatzfrei = strip.dataset.clTextPlatzfrei ?? '';
	const textGetrennt = strip.dataset.clTextGetrennt ?? '';
	const textFrei = strip.dataset.clTextFrei ?? '';
	// Die Brücke zu den drei Tischen (Plan 4.0, 4.9, 4.11): Einsatz, Gewinn/
	// Verlust, Würfelmarke und Zugmarke je Platz.
	const textEinsatzVorlage = strip.dataset.clTextEinsatz ?? '';
	const textEinsatzKeiner = strip.dataset.clTextEinsatzKeiner ?? '';
	const textGewinnVorlage = strip.dataset.clTextGewinn ?? '';
	const textVerlustVorlage = strip.dataset.clTextVerlust ?? '';
	const textShooter = strip.dataset.clTextShooter ?? '';
	const textDran = strip.dataset.clTextDran ?? '';
	const textDranIchVorlage = strip.dataset.clTextDranIch ?? '';

	const shooterButton = strip.querySelector('button[data-cl-shooter]');
	const textShooterEin = shooterButton?.dataset.clTextEin ?? '';
	const textShooterAus = shooterButton?.dataset.clTextAus ?? '';
	/** Der eigene Wartelistenstatus, aus dem zuletzt gesehenen Stand — der Knopf schickt das Gegenteil davon. */
	let binEingetragen = false;

	shooterButton?.addEventListener('click', () => {
		// Kein eigenes fetch(): derselbe Weg wie ein Tisch, über
		// casino:lobby-handlung (Plan 4.0, 4.9c).
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'shooter', daten: { ein: !binEingetragen } },
		}));
	});

	let angehalten = false;
	let gesehenR = null;
	let letzterZustand = null;
	let laufender = false;
	let fehlschlaegeInFolge = 0;
	let uhrTimer = null;
	let restMsLokal = Number(strip.querySelector('[data-cl-timer]')?.dataset.clRest ?? 0) || 0;
	/** Der zuletzt gesehene vollständige Stand — die Brücke zu den drei Tischen (Plan 4.0, 4.9b) braucht ihn beim Rundenstart. */
	let letzterStand = null;

	function uhrSchreiben(restMs) {
		restMsLokal = Math.max(0, restMs);
		if (timerText === null) {
			return;
		}
		if (restMsLokal <= 0) {
			timerText.textContent = textKeine;
			return;
		}
		const sekunden = Math.ceil(restMsLokal / 1000);
		timerText.textContent = textRestVorlage.replace('{0}', String(sekunden));
	}

	// Lokaler Sekundenzähler zwischen zwei Antworten — entscheidet nichts,
	// zeigt nur an; was gilt, sagt der Server über z/rest bei jeder Antwort.
	if (uhrTimer === null) {
		uhrTimer = setInterval(() => {
			if (restMsLokal > 0) {
				uhrSchreiben(restMsLokal - 1000);
			}
		}, 1000);
	}

	/**
	 * @param {Array<object>} plaetze daten.p — s, v, i, sn, e, o, f je Platz
	 * @param {number} dranSeat daten.t — der gefragte Platz beim Blackjack (0 = niemand)
	 * @param {number} shooterSeat daten.w — wer die Würfel hält (Craps)
	 */
	function seatsSchreiben(plaetze, dranSeat, shooterSeat) {
		if (seatsListe === null || !Array.isArray(plaetze)) {
			return;
		}
		const eintraege = seatsListe.querySelectorAll('[data-cl-seat]');
		for (const eintrag of eintraege) {
			const nr = Number(eintrag.getAttribute('data-cl-seat'));
			const gefunden = plaetze.find((p) => p.s === nr);
			const nameSpan = eintrag.querySelector('.cl-seat__name');
			if (nameSpan !== null) {
				nameSpan.textContent = gefunden ? String(gefunden.v ?? '') : textFrei;
			}
			if (gefunden && gefunden.i === 1) {
				eintrag.setAttribute('data-cl-seat-mine', '');
				binEingetragen = (gefunden.sn ?? 0) > 0;
				if (shooterButton !== null) {
					shooterButton.textContent = binEingetragen ? textShooterAus : textShooterEin;
				}
			} else {
				eintrag.removeAttribute('data-cl-seat-mine');
			}

			// Einsatz und Bilanz dieses Platzes (D.10.6: „Jeder sieht in
			// Echtzeit, was die anderen setzen und gewinnen, mit Namen am
			// Platz"). Ohne gemeldeten Betrag: "nichts gesetzt".
			const stakeSpan = eintrag.querySelector('.cl-seat__stake');
			if (stakeSpan !== null) {
				const einsatz = gefunden && typeof gefunden.e === 'number' ? gefunden.e : 0;
				stakeSpan.textContent = gefunden
					? (einsatz > 0 ? textEinsatzVorlage.replace('{0}', String(einsatz)) : textEinsatzKeiner)
					: '';
			}
			const outcomeSpan = eintrag.querySelector('.cl-seat__outcome');
			if (outcomeSpan !== null) {
				const ausgang = gefunden && typeof gefunden.o === 'number' ? gefunden.o : 0;
				if (gefunden && ausgang !== 0) {
					outcomeSpan.textContent = (ausgang > 0 ? textGewinnVorlage : textVerlustVorlage)
						.replace('{0}', String(Math.abs(ausgang)));
					outcomeSpan.setAttribute('data-cl-tone', ausgang > 0 ? 'win' : 'loss');
				} else {
					outcomeSpan.textContent = '';
					outcomeSpan.removeAttribute('data-cl-tone');
				}
			}

			// Wer die Würfel hält (Craps) und wer am Zug ist (Blackjack) —
			// zwei unabhängige, sich nie überschneidende Marken (D.10.6).
			const istShooter = gefunden !== undefined && shooterSeat > 0 && gefunden.s === shooterSeat;
			const istDran = gefunden !== undefined && dranSeat > 0 && gefunden.s === dranSeat;
			if (istShooter) {
				eintrag.setAttribute('data-cl-shooter', '');
			} else {
				eintrag.removeAttribute('data-cl-shooter');
			}
			if (istDran) {
				eintrag.setAttribute('data-cl-turn', '');
			} else {
				eintrag.removeAttribute('data-cl-turn');
			}
			const markSpan = eintrag.querySelector('.cl-seat__mark');
			if (markSpan !== null) {
				if (istDran && gefunden?.i === 1) {
					markSpan.textContent = textDranIchVorlage.replace('{0}', String(Math.ceil(restMsLokal / 1000)));
				} else if (istDran) {
					markSpan.textContent = textDran;
				} else if (istShooter) {
					markSpan.textContent = textShooter;
				} else {
					markSpan.textContent = '';
				}
			}
		}
		if (zusammenText !== null) {
			const anzahl = plaetze.length;
			zusammenText.textContent = anzahl <= 1 ? textAllein : textZusammenVorlage.replace('{0}', String(anzahl));
		}
	}

	function zustandSchreiben(z, ergebnis) {
		if (stateText === null) {
			return;
		}
		if (z === 'auswerten') {
			stateText.textContent = textZustand.auswerten.replace('{0}', String(ergebnis ?? ''));
			return;
		}
		stateText.textContent = textZustand[z] ?? '';
	}

	function noticeAnzeigen(text, mitNeuLaden) {
		if (notice === null) {
			return;
		}
		if (noticeText !== null) {
			noticeText.textContent = text;
		}
		if (noticeReload !== null) {
			noticeReload.hidden = !mitNeuLaden;
		}
		notice.hidden = false;
	}

	function noticeVerbergen() {
		if (notice !== null) {
			notice.hidden = true;
		}
	}

	noticeReload?.addEventListener('click', () => {
		globalThis.location.reload();
	});

	function rundeStarten(saat, runde) {
		const wert = probe(saat);
		if (probeText !== null) {
			probeText.textContent = wert;
		}
		document.dispatchEvent(new CustomEvent('casino:lobby-runde', {
			detail: {
				saat,
				zahl: wert,
				runde,
				// Nicht zustand.melder (Momentaufnahme beim Laden der Seite) —
				// wer Melder ist, ändert sich, sobald jemand mit kleinerer
				// Platznummer geht oder kommt. letzterStand.m sagt es bei
				// jedem Durchlauf neu (Plan 4.9b).
				melder: letzterStand?.m === 1,
				// Die Plätze, wie der Server sie beim Rundenstart sah — der
				// Blackjack-Tisch braucht sie für die Austeilfolge (Plan
				// 4.19); Roulette und Craps ignorieren sie.
				plaetze: Array.isArray(letzterStand?.p) ? letzterStand.p.map((p) => p.s) : [],
				mein: zustand.platz,
			},
		}));

		let fertig = false;
		function ergebnisMelden(wert) {
			if (fertig) {
				return;
			}
			fertig = true;
			// DIE SPERRE MUSS HIER FALLEN, SONST FRAGT DIESER BROWSER NIE
			// WIEDER AB. `laufender` wird beim Rundenstart gesetzt, damit
			// waehrend der Animation nicht abgefragt wird (D.10.5). Die
			// einzige andere Stelle, die sie zuruecksetzt, steht MITTEN IN
			// abfragen() — und dorthin kommt der Ablauf nie, weil der
			// Waechter ganz oben in abfragen() bei gesetztem `laufender`
			// sofort zurueckspringt. weiterPlanen() plante also einen Aufruf,
			// der nichts tat, und der Tisch stand ab der ersten Runde still.
			// Gefunden beim Bau von D5-3 (Live-Proben von Roulette und Craps
			// blieben genau hier haengen), behoben in der Hauptsitzung.
			laufender = false;
			document.removeEventListener('casino:lobby-fertig', aufFertig);
			void senden('ergebnis', { wert, runde }).finally(() => {
				weiterPlanen();
			});
		}
		function aufFertig(ereignis) {
			ergebnisMelden(String(ereignis.detail?.ergebnis ?? wert));
		}
		document.addEventListener('casino:lobby-fertig', aufFertig);
		// Der Rückfall ist die Notbremse, falls der Tisch gar nicht
		// antwortet. Beim Blackjack darf er nicht nach drei Sekunden greifen
		// — dort wartet die Runde ABSICHTLICH auf Menschen (bis zu
		// seatsMax × 20s). Er wird deshalb an die serverseitige Notbremse
		// angeglichen (Plan 4.9d).
		const rueckfallMs = zustand.spiel === 'blackjack'
			? Math.max(LAUF_RUECKFALL_MS, (zustand.max + 1) * 20000)
			: LAUF_RUECKFALL_MS;
		globalThis.setTimeout(() => ergebnisMelden(wert), rueckfallMs);
	}

	// Das eine Tor zum Server (Plan 4.0). Ein Tisch ruft NIE selbst fetch():
	// er sagt, was er melden will, und diese Datei bringt es hin. So steht
	// keine Endpunktadresse und keine Anmeldeinformation in einer der drei
	// Spielextensions — und es kann dort auch niemand versehentlich einen
	// zweiten Geldweg aufmachen (D.10.7).
	document.addEventListener('casino:lobby-handlung', (ereignis) => {
		const art = String(ereignis.detail?.art ?? '');
		if (art === '') {
			return;
		}
		void senden(art, ereignis.detail?.daten ?? {});
	});

	async function senden(art, zusatz) {
		try {
			const antwort = await fetch(zustand.endpunkte.handlung, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ art, lobby: zustand.lobby, ...(zusatz ?? {}) }),
			});
			return antwort.ok ? antwort.json().catch(() => null) : null;
		} catch {
			return null;
		}
	}

	function weiterPlanen(verzoegerungMs) {
		if (angehalten) {
			return;
		}
		globalThis.setTimeout(abfragen, verzoegerungMs ?? zustand.takt ?? 1000);
	}

	async function abfragen() {
		if (angehalten || document.visibilityState === 'hidden' || laufender) {
			return;
		}
		const query = gesehenR !== null ? `?r=${encodeURIComponent(gesehenR)}` : '';
		let antwort;
		try {
			antwort = await fetch(zustand.endpunkte.stand + query, { method: 'GET', credentials: 'same-origin' });
		} catch {
			return netzstoerung();
		}

		if (antwort.status === 401) {
			angehalten = true;
			globalThis.location.reload();
			return;
		}
		if (antwort.status !== 204 && !antwort.ok) {
			return netzstoerung();
		}

		fehlschlaegeInFolge = 0;
		noticeVerbergen();

		if (antwort.status === 204) {
			weiterPlanen();
			return;
		}

		let daten;
		try {
			daten = await antwort.json();
		} catch {
			return netzstoerung();
		}

		if (daten.weg === 1) {
			angehalten = true;
			noticeAnzeigen(textPlatzfrei, true);
			return;
		}

		gesehenR = daten.r;
		letzterStand = daten;
		seatsSchreiben(daten.p, Number(daten.t) || 0, Number(daten.w) || 0);
		zustandSchreiben(daten.z, daten.erg);
		uhrSchreiben(Number(daten.rest) || 0);
		if (seedText !== null && daten.saat) {
			seedText.textContent = String(daten.saat).slice(0, 8);
		}

		// DIE BRÜCKE ZU DEN DREI TISCHEN (Plan 4.0). Der Tisch bekommt den
		// vollständigen Stand und entscheidet selbst, was ihn davon angeht:
		// die Einsätze der anderen, wer die Würfel hält, wer am Zug ist. Es
		// gibt ABSICHTLICH kein zweites Abfragen und keinen zweiten Takt —
		// eine Abfrage, ein Ereignis, drei mögliche Zuhörer.
		document.dispatchEvent(new CustomEvent('casino:lobby-stand', { detail: daten }));

		const zustandGewechselt = daten.z !== letzterZustand;
		letzterZustand = daten.z;

		if (zustandGewechselt && daten.z === 'laeuft' && daten.saat) {
			// D.10.5: „Während einer laufenden Animation wird NICHT
			// abgefragt: alle rechnen ohnehin dasselbe aus derselben Saat."
			//
			// BEIM BLACKJACK IST 'laeuft' KEINE ANIMATION, sondern die Reihe
			// der Entscheidungen: die Plätze werden nacheinander gefragt, und
			// wer nicht abfragt, erfährt nicht, dass er dran ist, und
			// erfährt auch nicht, was die anderen entschieden haben — ohne
			// das rechnet er ab der ersten gezogenen Karte eine ANDERE
			// Kartenfolge. Die Begründung der Regel verlangt hier also ihr
			// Gegenteil, nicht ihre Ausnahme (Plan 4.9d).
			laufender = zustand.spiel !== 'blackjack';
			rundeStarten(daten.saat, daten.runde);
			if (laufender) {
				return; // kein weiterer Abfragezyklus, solange die Runde läuft (D.10.5)
			}
		}
		if (laufender && daten.z !== 'laeuft') {
			laufender = false;
		}

		weiterPlanen();
	}

	function netzstoerung() {
		fehlschlaegeInFolge++;
		if (fehlschlaegeInFolge >= RUECKFALL_ANZEIGE_AB) {
			noticeAnzeigen(textGetrennt, false);
		}
		const index = Math.min(fehlschlaegeInFolge - 1, RUECKFALL_MS.length - 1);
		weiterPlanen(RUECKFALL_MS[index]);
	}

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !angehalten && !laufender) {
			void abfragen();
		}
	});

	leaveButton?.addEventListener('click', () => {
		angehalten = true;
		void senden('verlassen').finally(() => {
			globalThis.location.reload();
		});
	});

	// KEIN 'verlassen' AUF 'pagehide' MEHR (BEHOBENER FEHLER, Protokollfund
	// probe-abend.mjs P6, Behebungslauf D6/4B): 'pagehide' feuert nicht nur
	// beim echten Schließen des Tabs, sondern GENAUSO bei einem reload()
	// DERSELBEN Tischseite — etwa nach einem kurzen Netzwackler oder einem
	// bewussten Neuladen. Der Aufruf hier lief als keepalive-Anfrage im
	// Hintergrund weiter, NACHDEM die neu geladene Seite ihre eigene Antwort
	// (mit dem eigenen, damals noch gültigen data-cl-state) bereits erhalten
	// hatte — und löschte dann, verzögert, genau DIESEN Platz. Saß man
	// allein am Tisch, verschwand damit die ganze Lobby: die im Zustandsblock
	// gemeldete Nummer blieb stehen, obwohl die Zeile in tx_casinolobby_lobby
	// längst weg war (die nächste Person, die eine Lobby für dasselbe Spiel
	// suchte, fand keine mehr vor und eröffnete automatisch eine neue — mit
	// der nächsten Auto-Increment-Nummer, immer genau eins höher). Saß man
	// NICHT allein, verlor die reloadende Person durch denselben Aufruf
	// mitten in einer Runde unbemerkt ihren Platz und ihre gesetzten
	// Einsätze (D.10.3), ohne selbst 'verlassen' angeklickt zu haben.
	//
	// 'pagehide' kann ein Neuladen derselben Seite von einem echten
	// Verlassen nicht unterscheiden — es gibt dafür kein verlässliches
	// Merkmal im Ereignis selbst. Ein sofortiges Freigeben beim Schließen
	// des Tabs ist deshalb keine sichere Optimierung. Zwei Wege bleiben
	// bewusst bestehen und genügen: der Leiste-Knopf oben (ausdrücklicher
	// Klick, kein Rätselraten) und die ohnehin vorhandene 30-Sekunden-Frist
	// (D.10.5, RoundClock::FRIST/aufraeumenEinzeln), die einen wirklich
	// verwaisten Platz zuverlässig räumt — nur eben nicht sofort, sondern
	// binnen höchstens 30 Sekunden.

	void abfragen();
}

/**
 * Die Übersicht: Belegung nachführen, Beitreten und Eröffnen bedienen (Plan
 * 4.30, Punkt 7).
 *
 * @param {object} zustand aus data-cl-state
 */
function uebersicht(zustand) {
	const liste = document.querySelector('[data-cl-list]');
	if (liste === null) {
		return;
	}

	const textBelegungVorlage = liste.dataset.clTextBelegungVorlage ?? '';

	let angehalten = false;
	let gesehenR = null;
	let fehlschlaegeInFolge = 0;

	function weiterPlanen(verzoegerungMs) {
		if (angehalten) {
			return;
		}
		globalThis.setTimeout(abfragen, verzoegerungMs ?? zustand.taktUebersicht ?? 3000);
	}

	async function abfragen() {
		if (angehalten || document.visibilityState === 'hidden') {
			return;
		}
		const query = `?spiel=${encodeURIComponent(zustand.spiel)}${gesehenR !== null ? `&r=${encodeURIComponent(gesehenR)}` : ''}`;
		let antwort;
		try {
			antwort = await fetch(zustand.endpunkte.uebersicht + query, { method: 'GET', credentials: 'same-origin' });
		} catch {
			return netzstoerung();
		}

		if (antwort.status === 401) {
			angehalten = true;
			globalThis.location.reload();
			return;
		}
		if (antwort.status !== 204 && !antwort.ok) {
			return netzstoerung();
		}

		fehlschlaegeInFolge = 0;
		if (antwort.status === 204) {
			weiterPlanen();
			return;
		}

		let daten;
		try {
			daten = await antwort.json();
		} catch {
			return netzstoerung();
		}

		gesehenR = daten.r;
		if (Array.isArray(daten.l)) {
			for (const lobby of daten.l) {
				const eintrag = liste.querySelector(`[data-cl-lobby="${lobby.u}"]`);
				const belegung = eintrag?.querySelector('[data-cl-belegung]');
				if (belegung !== null && belegung !== undefined && textBelegungVorlage !== '') {
					belegung.textContent = textBelegungVorlage.replace('{0}', String(lobby.n)).replace('{1}', String(daten.max ?? zustand.max));
				}
			}
		}
		// Eine geänderte Belegung kann eine Lobby voll oder wieder frei machen
		// — dieser Fall lädt die Seite neu, statt die Liste feingranular
		// umzubauen (der Normalfall ist ohnehin ein Beitritt, der selbst schon
		// neu lädt).
		if (daten.neu !== undefined) {
			const offenKnopf = document.querySelector('[data-cl-open]');
			if (offenKnopf !== null) {
				offenKnopf.hidden = daten.neu !== 1;
			}
		}

		weiterPlanen();
	}

	function netzstoerung() {
		fehlschlaegeInFolge++;
		const index = Math.min(fehlschlaegeInFolge - 1, RUECKFALL_MS.length - 1);
		weiterPlanen(RUECKFALL_MS[index]);
	}

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !angehalten) {
			void abfragen();
		}
	});

	async function handlung(art, extra) {
		try {
			const antwort = await fetch(zustand.endpunkte.handlung, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ art, ...(extra ?? {}) }),
			});
			const daten = await antwort.json().catch(() => null);
			if (daten?.ok === true) {
				globalThis.location.reload();
			}
		} catch {
			// Ein Fehlschlag hier ändert nichts an der Seite — der nächste
			// Klick versucht es erneut.
		}
	}

	liste.querySelectorAll('[data-cl-join]').forEach((knopf) => {
		knopf.addEventListener('click', () => {
			// Ein voller Tisch trägt aria-disabled="true" (Overview.html, D4b) —
			// der Klick wird hier abgefangen, statt eine Beitrittsanfrage zu
			// senden, die der Server ohnehin mit grund:"voll" abweisen würde.
			if (knopf.getAttribute('aria-disabled') === 'true') {
				return;
			}
			const lobbyUid = Number(knopf.getAttribute('data-cl-join'));
			void handlung('beitreten', { lobby: lobbyUid });
		});
	});
	document.querySelector('[data-cl-open]')?.addEventListener('click', () => {
		void handlung('eroeffnen', { spiel: zustand.spiel });
	});

	void abfragen();
}
