/**
 * Casino Kunterbunt – die austauschbare Rückseite der Kasse (CONCEPT.md D.1.1)
 * ===========================================================================
 *
 * B.11 hat diese Bruchstelle vorbereitet, hier wird sie benutzt. Die Kasse
 * bleibt der einzige Zugriff auf den Speicher (B.5.3); neu ist, dass sie
 * ZWEI Rückseiten kennt:
 *
 *   LOKAL   der Browserspeicher. Gilt immer, wenn der QR-Modus aus ist oder
 *           casino_account gar nicht installiert ist. Verhalten Zeile für
 *           Zeile wie nach Teil C.
 *   SERVER  das Konto. Gilt, wenn der QR-Modus an ist und jemand angemeldet
 *           ist.
 *
 * WORAN DIESES MODUL DEN SERVERMODUS ERKENNT: an einem <script
 * type="application/json" data-ca-state> im Kopf der Seite. Diesen Block
 * speist casino_account in die fertige Antwort ein — NACH dem
 * Seitenzwischenspeicher, deshalb kann er nie einer falschen Person gehören.
 * Ist casino_account nicht installiert oder der Modus aus, gibt es den Block
 * nicht, und dieses Modul kennt casino_account nicht einmal dem Namen nach.
 * Genau das verlangt D.1: „Ist casino_account nicht installiert, verhält
 * sich die Seite exakt wie nach Teil C."
 *
 * WARUM DIE UMSCHALTUNG BEIM LADEN GESCHIEHT UND NICHT SPÄTER ANGEMELDET
 * WIRD: credit.balance ist laut B.5.3 SYNCHRON lesbar. Würde eine andere
 * Datei die Rückseite erst nachträglich einhängen, hätte ein Gerät, das
 * früher lädt, für einen Augenblick den falschen Stand gelesen. Der Kern
 * bindet Module mit "async" ein — auf die Reihenfolge ist kein Verlass.
 *
 * WAS DIESE DATEI NICHT TUT: sie fasst kein Bedienelement an, kennt keinen
 * Automaten und keinen Speicherschlüssel eines Automaten. In ihr steht kein
 * deutscher Anzeigetext.
 *
 *
 * DIE ÖFFENTLICHE SCHNITTSTELLE — EIN EINZIGES OBJEKT `konto`
 * -------------------------------------------------------------------------
 *   konto.istServer                    boolean, synchron
 *   konto.darfVerwalten                boolean, synchron (lokal immer true;
 *                                      am Server nur für Admins)
 *   konto.gesperrt                     boolean, synchron — der Server
 *                                      antwortet nicht, es wird nichts mehr
 *                                      gebucht
 *   konto.kasse / .geraet               number, synchron
 *   konto.gesamt                       number, synchron — die Summe aus
 *                                      Kasse, Gerätekredit UND dem offenen
 *                                      Gewinn (der offene Gewinn selbst hat
 *                                      KEINE eigene synchrone Eigenschaft —
 *                                      der Name konto.gewinn gehört dem
 *                                      Vorgang unten; wer ihn braucht, liest
 *                                      ihn aus antwort.gewinn)
 *   konto.max                          number — Höchststand
 *   konto.abonnieren(fn)               → Abmeldefunktion; fn bekommt bei
 *                                      jeder autoritativen Änderung
 *                                      {kasse, geraet, gewinn, gesamt, grund}
 *                                      (gewinn hier: Feld der ANTWORT, siehe
 *                                      unten — keine gleichnamige Methode)
 *   konto.uebernahme() … konto.setzen(b)   Promise<Antwort> — die elf
 *                                      Vorgänge, NUR IM SERVERMODUS
 *   konto.stand()                      Promise<Antwort> — Abgleich
 *   konto.speicher                     Storage-förmig (getItem/setItem/
 *                                      removeItem) für Gerätespeicherstände
 *   konto.wiederholen()                Promise<void> — die liegengebliebene
 *                                      Buchung erneut senden
 *
 * Antwortform (identisch für alle Vorgänge, damit kein Aufrufer Fälle
 * unterscheiden muss):
 *
 *   {ok, grund?, kasse, geraet, gewinn, gesamt, bewegt, gekappt, doppelt}
 *
 * Im LOKALEN Modus ist konto ein Objekt mit istServer: false,
 * darfVerwalten: true, gesperrt: false und speicher: null; die elf Vorgänge
 * existieren dort nicht (undefined), damit ein versehentlicher Aufruf laut
 * scheitert statt still zu schweigen.
 *
 * Ereignisse (nur im Servermodus, auf document): casino:konto,
 * casino:konto-gesperrt, casino:konto-frei; gehört wird
 * casino:konto-wiederholen.
 *
 * Abgleich zwischen Registerkarten: kein Takt, keine Dauerabfrage (D.10.5
 * schließt Server-Sent-Events und WebSockets aus, und eine Dauerabfrage wäre
 * Sache von D4). Abgeglichen wird bei pageshow (Rückkehr aus dem
 * Vor-/Zurück-Zwischenspeicher) und bei visibilitychange auf sichtbar — dann
 * einmal stand().
 */

/** Höchststand jedes einzelnen Betrags — derselbe wie credit.js MAX_CREDITS
 * und BookingService::MAX. */
const MAX = 999999999;

/**
 * Vorgänge, die auch beim Verlassen der Seite noch abgeschickt werden
 * (close() über cashOut(), das Übernehmen eines Platzes beim Öffnen eines
 * Geräts). Sie werden mit fetch(keepalive: true) gesendet, damit sie das
 * Schließen des Dokuments überleben — ohne das ginge eine Rückbuchung beim
 * Seitenwechsel regelmäßig verloren.
 */
const SCHLUSSVORGAENGE = new Set(['auszahlung', 'uebernahme']);

/** Ruhefenster, in dem mehrere konto.speicher-Schreibvorgänge gesammelt und
 * als EINE Anfrage verschickt werden (A-7). */
const SPEICHER_VERZOEGERUNG_MS = 400;

/**
 * Liest den Zustandsblock aus dem Dokumentkopf, oder null.
 *
 * Robust gegen ein fehlendes `document` (Node, siehe die drei bestehenden
 * Node-Prüfskripte des Site Package, die dieses Modul jetzt mitladen) —
 * dieselbe Robustheit, die credit.js schon für einen fehlenden localStorage
 * mitbringt.
 *
 * @returns {?object}
 */
function zustandLesen() {
	if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
		return null;
	}
	const block = document.querySelector('script[type="application/json"][data-ca-state]');
	if (block === null) {
		return null;
	}
	try {
		const geparst = JSON.parse(block.textContent ?? '');
		return geparst !== null && typeof geparst === 'object' ? geparst : null;
	} catch {
		return null;
	}
}

/**
 * Löst ein Ereignis auf document aus, oder tut nichts, wenn es kein
 * document mit dispatchEvent gibt.
 *
 * @param {string} name
 * @param {object} detail
 * @returns {void}
 */
function feuer(name, detail) {
	if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') {
		return;
	}
	try {
		document.dispatchEvent(new CustomEvent(name, { detail }));
	} catch {
		// Kein CustomEvent verfügbar — die Website selbst hat immer einen
		// echten Browser; das betrifft höchstens einen sehr alten Prüfstand.
	}
}

/**
 * Erzeugt die Kennung dieses Browsers (kunde in der Vorgangs-API, D.7.2).
 *
 * Sie ist eine KENNUNG, kein Spielwert — das Verbot von Math.random() aus
 * diesem Projekt betrifft Spielwerte. Benutzt wird deshalb
 * crypto.getRandomValues(), mit Uhrzeit und einem Zähler als Rückfall für
 * Umgebungen ohne Kryptomodul (Node im Prüfskript).
 *
 * 1–32 Zeichen aus [A-Za-z0-9_-] — dieselbe Gestalt, die BookingEndpoint auf
 * der Serverseite verlangt.
 *
 * @returns {string}
 */
let kennungZaehler = 0;
function kennungBauen() {
	try {
		if (typeof globalThis.crypto?.getRandomValues === 'function') {
			const bytes = new Uint8Array(16);
			globalThis.crypto.getRandomValues(bytes);
			return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
		}
	} catch {
		// fällt durch auf den Rückfall unten
	}
	kennungZaehler += 1;
	return `${Date.now().toString(36)}-${kennungZaehler.toString(36)}`;
}

/**
 * Baut das Konto-Objekt für den LOKALEN Modus.
 *
 * @returns {object}
 */
function baueLokalesKonto() {
	return Object.freeze({
		istServer: false,
		darfVerwalten: true,
		gesperrt: false,
		kasse: 0,
		geraet: 0,
		gewinn: 0,
		gesamt: 0,
		max: MAX,
		speicher: null,
		abonnieren() {
			// Niemand meldet sich im lokalen Modus an (siehe credit.js) — ein
			// no-op-Rückgabewert genügt trotzdem, falls doch.
			return () => {};
		},
	});
}

/**
 * Baut das Konto-Objekt für den SERVERMODUS.
 *
 * @param {object} zustand der geparste Zustandsblock
 * @returns {object}
 */
function baueServerKonto(zustand) {
	const endpunkte = zustand.endpunkte ?? {};
	const max = typeof zustand.max === 'number' ? zustand.max : MAX;
	const darfVerwalten = zustand.admin === true;

	let kasse = Number(zustand.kasse) || 0;
	let geraet = Number(zustand.geraet) || 0;
	let gewinn = Number(zustand.gewinn) || 0;
	let gesperrt = false;
	/** @type {?{rumpf: string, art: string}} die liegengebliebene Buchung */
	let ausstehend = null;

	/* 1 — die Kennung dieses Browsers. Sie unterscheidet zwei Registerkarten
	 *     derselben Person, damit die Doppel-Erkennung des Servers nicht die
	 *     Buchung der zweiten Karte verschluckt (Plan 9.2). */
	const kunde = kennungBauen();

	/* 2 — die Reihe. Alle Buchungen laufen durch EINE Versprechenskette,
	 *     damit nie zwei Anfragen gleichzeitig unterwegs sind. Ohne sie
	 *     könnten zwei schnelle Klicks ihre Nummern überholen, und der
	 *     Server verwürfe eine davon als „doppelt". */
	let naechsteNummer = 1;
	let kette = Promise.resolve();

	const abonnenten = new Set();

	function gesamt() {
		return kasse + geraet + gewinn;
	}

	/**
	 * Meldet eine autoritative Änderung an alle Zuhörer UND auf document.
	 *
	 * @param {string} grund
	 * @returns {void}
	 */
	function melde(grund) {
		const detail = Object.freeze({ kasse, geraet, gewinn, gesamt: gesamt(), grund });
		for (const zuhoerer of [...abonnenten]) {
			try {
				zuhoerer(detail);
			} catch (fehler) {
				console.error('[casino] Ein Konto-Zuhörer hat einen Fehler geworfen.', fehler);
			}
		}
		feuer('casino:konto', detail);
	}

	/**
	 * Übernimmt einen vom Server gemeldeten Stand. DER SERVER IST DIE
	 * ALLEINIGE WAHRHEIT (D.7.2) — angezeigt wird IMMER, was er zurückgibt,
	 * ob die Buchung angenommen wurde oder nicht.
	 *
	 * @param {object} daten
	 * @param {string} grund
	 * @returns {void}
	 */
	function uebernehmen(daten, grund) {
		kasse = Number(daten.kasse) || 0;
		geraet = Number(daten.geraet) || 0;
		gewinn = Number(daten.gewinn) || 0;
		melde(grund);
	}

	/** @param {string} grund @returns {object} */
	function absage(grund) {
		return {
			ok: false,
			grund,
			kasse,
			geraet,
			gewinn,
			gesamt: gesamt(),
			bewegt: 0,
			gekappt: false,
			doppelt: false,
		};
	}

	/* 4 — die Sperre. Eine ABLEHNUNG (ok:false mit 200) ist KEINE Sperre: der
	 *     Server hat geantwortet, er hat nur nein gesagt. Gesperrt wird nur
	 *     bei Schweigen, bei einem Fehlercode oder bei unlesbarer Antwort.
	 *     Die liegengebliebene Anfrage bleibt mit UNVERÄNDERTER Nummer
	 *     stehen; wiederholen() schickt genau sie noch einmal. */
	function sperren(grund, rumpf, art) {
		const warSchonGesperrt = gesperrt;
		gesperrt = true;
		ausstehend = { rumpf, art };
		if (!warSchonGesperrt) {
			feuer('casino:konto-gesperrt', { grund });
		}
		return absage('gesperrt');
	}

	/* 3 — der Sendevorgang. */
	async function senden(rumpf, art) {
		let antwort;
		try {
			antwort = await fetch(endpunkte.buchung, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: rumpf,
				credentials: 'same-origin',
				keepalive: SCHLUSSVORGAENGE.has(art),
			});
		} catch {
			return sperren('offline', rumpf, art);   // KEINE Antwort → Sperre
		}
		if (!antwort.ok) {
			return sperren('fehler', rumpf, art);
		}
		let daten;
		try {
			daten = await antwort.json();
		} catch {
			return sperren('fehler', rumpf, art);
		}
		if (typeof daten?.gesamt !== 'number') {
			return sperren('fehler', rumpf, art);
		}

		uebernehmen(daten, art);
		naechsteNummer += 1;   // erst NACH einer eindeutigen Antwort
		if (gesperrt) {
			gesperrt = false;
			ausstehend = null;
			feuer('casino:konto-frei', {});
		}
		return daten;
	}

	/**
	 * Baut den Anfragerumpf eines Vorgangs und sendet ihn.
	 *
	 * @param {string} art
	 * @param {?number} betrag
	 * @returns {Promise<object>}
	 */
	async function ausfuehren(art, betrag) {
		if (gesperrt) {
			return absage('gesperrt');
		}
		const rumpf = JSON.stringify({ kunde, nummer: naechsteNummer, art, betrag: betrag ?? null });
		return senden(rumpf, art);
	}

	/**
	 * Reiht einen Vorgang in die Kette ein (A-5: zwei Buchungen kurz
	 * hintereinander laufen NACHEINANDER, nicht gleichzeitig).
	 *
	 * @param {string} art
	 * @param {?number} [betrag]
	 * @returns {Promise<object>}
	 */
	function vorgang(art, betrag = null) {
		const naechste = kette.then(() => ausfuehren(art, betrag));
		kette = naechste.then(() => undefined, () => undefined);
		return naechste;
	}

	/**
	 * Abgleich, ohne einen eigenen Vorgang zu buchen (GET /stand). Wird bei
	 * pageshow (bfcache) und bei visibilitychange auf sichtbar aufgerufen.
	 *
	 * @returns {Promise<object>}
	 */
	async function stand() {
		try {
			const antwort = await fetch(endpunkte.stand, { method: 'GET', credentials: 'same-origin' });
			if (!antwort.ok) {
				return absage('fehler');
			}
			const daten = await antwort.json();
			if (typeof daten?.gesamt !== 'number') {
				return absage('fehler');
			}
			uebernehmen(daten, 'stand');
			return daten;
		} catch {
			return absage('offline');
		}
	}

	/**
	 * Schickt die liegengebliebene Buchung erneut — denselben Rumpf, dieselbe
	 * Nummer. Der Server erkennt sie entweder als doppelt oder führt sie aus;
	 * beides ist richtig.
	 *
	 * @returns {Promise<void>}
	 */
	async function wiederholen() {
		if (!gesperrt || ausstehend === null) {
			return;
		}
		const { rumpf, art } = ausstehend;
		await senden(rumpf, art);
	}

	/* --------------------------------------------------------------------
	 * konto.speicher — Storage-förmiger Adapter für Gerätespeicherstände
	 * (D.8, D.13). Sammelt Schreibvorgänge und schickt sie GEBÜNDELT nach
	 * einem Ruhefenster, damit zehn setItem() in Folge höchstens eine
	 * Anfrage erzeugen (A-7). Kennt keinen einzigen Schlüsselnamen eines
	 * Automaten — der Schlüssel ist für dieses Modul eine undurchsichtige
	 * Zeichenkette, genau wie für machine-credit.js.
	 * -------------------------------------------------------------------- */

	/** @type {object<string, string>} der zuletzt bekannte Stand je Schlüssel */
	const anfangsSpeicher = { ...(zustand.speicher && typeof zustand.speicher === 'object' ? zustand.speicher : {}) };
	/** @type {Map<string, string>} noch nicht gesendete Schreibvorgänge, '' bedeutet Löschen */
	const speicherPuffer = new Map();
	let speicherTimer = null;

	function speicherPlanen() {
		if (speicherTimer !== null) {
			return;
		}
		speicherTimer = setTimeout(() => {
			speicherTimer = null;
			void speicherSenden();
		}, SPEICHER_VERZOEGERUNG_MS);
	}

	async function speicherSenden() {
		if (speicherPuffer.size === 0) {
			return;
		}
		const staende = Object.fromEntries(speicherPuffer);
		speicherPuffer.clear();
		try {
			await fetch(endpunkte.feld, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 'stände': staende }),
				credentials: 'same-origin',
				keepalive: true,
			});
		} catch {
			// Ein verlorenes Feld ist kein Geld (D.8) — es wird nicht gesperrt.
		}
	}

	const speicher = {
		getItem(schluessel) {
			if (speicherPuffer.has(schluessel)) {
				const wert = speicherPuffer.get(schluessel);
				return wert === '' ? null : wert;
			}
			return Object.prototype.hasOwnProperty.call(anfangsSpeicher, schluessel)
				? anfangsSpeicher[schluessel]
				: null;
		},
		setItem(schluessel, wert) {
			const text = String(wert);
			speicherPuffer.set(schluessel, text);
			anfangsSpeicher[schluessel] = text;
			speicherPlanen();
		},
		removeItem(schluessel) {
			speicherPuffer.set(schluessel, '');
			delete anfangsSpeicher[schluessel];
			speicherPlanen();
		},
	};

	/* --------------------------------------------------------------------
	 * Ereignisse und Abgleich zwischen Registerkarten.
	 * -------------------------------------------------------------------- */

	if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
		document.addEventListener('casino:konto-wiederholen', () => {
			void wiederholen();
		});
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				void stand();
			}
		});
	}
	if (typeof globalThis.addEventListener === 'function') {
		globalThis.addEventListener('pageshow', (ereignis) => {
			if (ereignis.persisted === true) {
				void stand();
			}
		});
	}

	// KEIN "get gewinn()" HIER: der offene Gewinn als synchrone Zahl würde
	// denselben Objektschlüssel beanspruchen wie der Vorgang konto.gewinn(b)
	// (Gutschrift eines Gewinns, Teil der elf ARTEN) — in einem einzigen
	// Objektliteral gewinnt zwangsläufig die letzte gleichnamige Eigenschaft,
	// die andere verschwindet kommentarlos (genau das brach A-3/A-6 im
	// Prüflauf, bis es hier gefunden wurde). Gebraucht wird im ganzen Plan
	// D3a-D3d ausschließlich der VORGANG konto.gewinn(b) — als eigenständige
	// synchrone Zahl liest ihn keine Datei; der offene Gewinn kommt dort, wo
	// er gebraucht wird, aus der Antwort einer Buchung (antwort.gewinn), nicht
	// von hier. konto.gesamt bleibt die korrekte Summe aus allen drei Töpfen.
	return Object.freeze({
		istServer: true,
		get darfVerwalten() { return darfVerwalten; },
		get gesperrt() { return gesperrt; },
		get kasse() { return kasse; },
		get geraet() { return geraet; },
		get gesamt() { return gesamt(); },
		max,
		speicher,

		abonnieren(zuhoerer) {
			if (typeof zuhoerer !== 'function') {
				throw new TypeError('konto.abonnieren() erwartet eine Funktion.');
			}
			abonnenten.add(zuhoerer);
			return () => {
				abonnenten.delete(zuhoerer);
			};
		},

		uebernahme: () => vorgang('uebernahme'),
		einwurf: (betrag) => vorgang('einwurf', betrag),
		auszahlung: (betrag = null) => vorgang('auszahlung', betrag),
		einsatz: (betrag) => vorgang('einsatz', betrag),
		gewinn: (betrag) => vorgang('gewinn', betrag),
		angebot: (betrag) => vorgang('angebot', betrag),
		verdoppeln: () => vorgang('verdoppeln'),
		verloren: () => vorgang('verloren'),
		aufladen: (betrag) => vorgang('aufladen', betrag),
		abbuchen: (betrag) => vorgang('abbuchen', betrag),
		setzen: (betrag) => vorgang('setzen', betrag),

		stand,
		wiederholen,
	});
}

const zustand = zustandLesen();

/** Die öffentliche Schnittstelle. Siehe Dateikopf. */
export const konto = zustand !== null ? baueServerKonto(zustand) : baueLokalesKonto();

export default konto;
