/**
 * Blackjack – Nachweis der Tischfolge einer Lobby-Runde (Umsetzungsstück D5-4)
 * ================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node, ohne jede
 * npm-Abhängigkeit — Gerüst wörtlich nach dem Vorbild von
 * craps/verify-lobby-craps.mjs (derselbe Umsetzungslauf D5) und
 * casino_lobby/verify-lobby-live.mjs.
 *
 * ANDERS ALS BEI ROULETTE/CRAPS rechnet dieser Lauf ausschließlich mit den
 * DREI eigenen, dokument- und importfreien Dateien der Kartenmechanik:
 * round-lobby-blackjack.js (LobbyTableSequence), shoe.js (Shoe,
 * shuffleInPlace) und rules-blackjack.js (die Regelzahlen und reinen
 * Auswertungsfunktionen). round-blackjack.js/round-table-blackjack.js
 * werden hier NICHT importiert — deren eigene Korrektheit (Teilen,
 * Verdoppeln, Versicherung, Bilanz auf den Cent) ist bereits erschöpfend in
 * verify-round.mjs, verify-rules.mjs und verify-table.mjs nachgewiesen.
 * Dieser Lauf prüft eine ANDERE, für D5-4 neue Frage: dass die GEMEINSAME
 * TISCHFOLGE (Saat + Zugprotokoll → Kartenfolge) für jeden Platz in JEDEM
 * Browser dieselbe ist — die Grundannahme von D.10.4, hier speziell für den
 * Fall, in dem eine Entscheidung eines Platzes die Karten aller anderen
 * verschiebt.
 *
 * B-8/B-9 (Geld) sind DESHALB VEREINFACHT gegenüber dem Plantext: sie
 * spielen EIN Blatt je Platz (kein Teilen, kein Verdoppeln, keine
 * Versicherung) mit einer einfachen Auswertung ausschließlich über
 * rules-blackjack.js' eigene, reine Funktionen (handTotal, isBlackjack,
 * dealerMustDraw, winReturn/loseReturn/pushReturn/blackjackReturn) nach —
 * nicht über round-blackjack.js. Sie weisen damit nach, dass die
 * TISCHFOLGE eine für eine faire Auswertung taugliche, überschneidungsfreie
 * Kartenfolge liefert; DASS round-blackjack.js diese Auswertung selbst
 * richtig rechnet (Teilen, Verdoppeln, Versicherung eingeschlossen), bleibt
 * Aufgabe der bereits bestehenden Nachweise. ABWEICHUNG VOM PLANTEXT,
 * begründet im Bericht des Umsetzungslaufs.
 *
 * WAS HIER BEWIESEN WIRD (Plan D5, Abschnitt 4.22)
 * ---------------------------------------------------------------
 *   B-1  Wächter: die drei Pflichtdateien existieren, kein NUL-Byte
 *   B-2  lobby-blackjack.js und round-lobby-blackjack.js enthalten kein
 *        fetch(, kein credit, kein bank, kein payout, keine http-Adresse
 *   B-3  round-lobby-blackjack.js hat KEINEN Import und fasst KEIN document an
 *   B-4  gerechnet, die Kernaussage: fünf unabhängige Sichten (je eine
 *        andere eigene Platznummer) bekommen aus DERSELBEN Saat und
 *        DEMSELBEN Protokoll für JEDEN Platz dieselben Karten in derselben
 *        Reihenfolge — über 500 zufällig erzeugte Protokolle
 *   B-5  gerechnet: die Geberkarten sind gleich, AUCH WENN eine Sicht sie
 *        vor und eine andere nach dem vollständigen Zugprotokoll zieht
 *        (die Reserve ist unabhängig von anwenden())
 *   B-6  gerechnet: eine neue Runde (neue Saat, leeres Protokoll) liefert
 *        wieder für alle Sichten dieselben Karten — unabhängig davon, ob
 *        eine Sicht die vorige Runde mitgespielt hat
 *   B-7  gerechnet: keine Karte wird zweimal ausgegeben — die vordere
 *        Ziehposition (Austeilung + Züge) erreicht nie die hintere Reserve
 *   B-8  gerechnet, VEREINFACHT (siehe oben): über 2000 Ein-Blatt-Runden
 *        gilt Kasse + Einsatz = vorher + (returned − staked)
 *   B-9  gerechnet: die an die Lobby gemeldete Bilanz ({box: net}) ist
 *        dieselbe Zahl, die die Auswertung tatsächlich ergibt
 *   B-10 gerechnet: ein Platz, der mitten in der Runde verschwindet
 *        (aus plaetze entfernt wird), verschiebt die Karten der übrigen
 *        NICHT — sein Protokoll bleibt wirksam
 *
 * Gegenproben: B-4-G, B-7-G.
 *
 * WAS DIESES SKRIPT AUSDRÜCKLICH NICHT BEWEIST (siehe probe-lobby-blackjack.mjs):
 *   - ob drei ECHTE Browser dieselben Karten sehen (hier läuft alles im
 *     selben Node-Prozess);
 *   - ob der Ersatzschlitten (blackjack.js) den Geber wirklich zur
 *     richtigen Zeit umschaltet (im Skript wird game.state nicht befragt,
 *     weil round-blackjack.js hier gar nicht importiert wird);
 *   - ob eine Runde, die im Server läuft, im Browser wirklich losgeht;
 *   - ob Geld, das den Gerätekredit verlässt, beim Konto ankommt;
 *   - ob die 20 Sekunden je Platz im Browser ankommen.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-lobby-blackjack.mjs
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as rules from '../../Public/JavaScript/rules-blackjack.js';
import { Shoe } from '../../Public/JavaScript/shoe.js';
import { LobbyTableSequence } from '../../Public/JavaScript/round-lobby-blackjack.js';
import { createSeeded, saatZuZahl } from '../../Public/JavaScript/rng.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HIER, '../../..');

let fehler = 0;
let zusagen = 0;

function check(ok, text, ...zeilen) {
	zusagen++;
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(EXT, datei);
}

function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const LOBBY_BLACKJACK_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-blackjack.js');
const ROUND_LOBBY_PFAD = path.join(EXT, 'Resources/Public/JavaScript/round-lobby-blackjack.js');
const RNG_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rng.js');

console.log('\nBlackjack – Nachweis der Tischfolge einer Lobby-Runde (Umsetzungsstück D5-4)');
console.log('================================================================================\n');

const ERWARTETE_ZUSAGEN = 25;

/* ======================================================== B-1 Wächter === */

console.log('B-1  Wächter: die Pflichtdateien existieren, kein NUL-Byte');
for (const [name, pfad] of [
	['lobby-blackjack.js', LOBBY_BLACKJACK_PFAD],
	['round-lobby-blackjack.js', ROUND_LOBBY_PFAD],
	['rng.js', RNG_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		process.exit(1);
	}
	const inhalt = lies(pfad);
	check(!inhalt.includes('\0'), `${name} enthält kein NUL-Byte`);
}

const lobbyBlackjackQuelle = lies(LOBBY_BLACKJACK_PFAD);
const roundLobbyQuelle = lies(ROUND_LOBBY_PFAD);

/* =============================================== B-2 Kein Geld, keine Adresse === */

console.log('\nB-2  lobby-blackjack.js und round-lobby-blackjack.js enthalten kein fetch(, kein credit, kein bank, kein payout, keine http-Adresse');
{
	const VERBOTEN = [
		['fetch(', /fetch\(/], ['credit', /\bcredit\b/], ['bank', /\bbank\b/],
		['payout(', /payout\(/], ['http-Adresse', /https?:\/\//],
	];
	for (const [datei, quelle] of [['lobby-blackjack.js', lobbyBlackjackQuelle], ['round-lobby-blackjack.js', roundLobbyQuelle]]) {
		const ohne = ohneKommentare(quelle);
		for (const [name, muster] of VERBOTEN) {
			check(!muster.test(ohne), `${datei} enthält kein ${name}`);
		}
	}
}

/* ================================== B-3 round-lobby-blackjack.js import-/dokumentfrei === */

console.log('\nB-3  round-lobby-blackjack.js hat keinen Import und fasst kein document an');
{
	check(!/\bimport\b/.test(roundLobbyQuelle), 'kein import-Schlüsselwort in round-lobby-blackjack.js');
	check(!roundLobbyQuelle.includes('document'), 'round-lobby-blackjack.js nennt "document" nicht');

	console.log('     Gegenprobe: ein nachgestelltes import wird gefunden');
	const mitImport = roundLobbyQuelle + "\nimport { x } from './y.js';";
	check(/\bimport\b/.test(mitImport), 'ein nachgestelltes import wird gefunden');
}

/* ============================================================ Hilfsbau === */

/** Zufällige, aber genügend vielfältige 16-Hex-Zeichen-Saaten — dieselbe Form wie bin2hex(random_bytes(8)). */
function zufallsHex16() {
	let s = '';
	for (let i = 0; i < 16; i++) {
		s += Math.floor(Math.random() * 16).toString(16);
	}
	return s;
}

/** Ein frisch aus der Saat gemischter Schlitten — dieselbe Bauart wie blackjack.js#folgeBauen(). */
function baueSchlitten(saat) {
	return new Shoe({ rules, random: createSeeded(saatZuZahl(saat)) });
}

/**
 * Erzeugt ein zufälliges, aber STRUKTURELL gültiges Zugprotokoll für die
 * gegebenen Plätze — als Liste von Einträgen, nicht als fertige
 * Zeichenkette (die braucht spieleAus() unten Schritt für Schritt, um jeden
 * eigenen Zug im richtigen Augenblick über meineKarte() statt über
 * anwenden() zu ziehen — GENAU wie lobby-blackjack.js/blackjack.js es im
 * echten Betrieb tun, siehe deren Kopfkommentare).
 *
 * @param {Array<number>} plaetze
 * @returns {Array<{platz: number, zug: string}>}
 */
function zufallsProtokoll(plaetze) {
	const BUCHSTABEN = ['h', 'h', 's', 'd', 'p', 'i', 'n']; // 'h' häufiger, wie in echten Runden
	const eintraege = [];
	for (const platz of plaetze) {
		// 1 bis 4 Entscheidungen je Platz, letzte immer 's' (Standardschluss),
		// gelegentlich vorangestellt 'i'/'n' (Versicherung).
		if (Math.random() < 0.4) {
			eintraege.push({ platz, zug: Math.random() < 0.5 ? 'i' : 'n' });
		}
		const zuege = 1 + Math.floor(Math.random() * 3);
		for (let i = 0; i < zuege; i++) {
			const letzter = i === zuege - 1;
			eintraege.push({ platz, zug: letzter ? 's' : BUCHSTABEN[Math.floor(Math.random() * BUCHSTABEN.length)] });
		}
	}
	return eintraege;
}

/**
 * Spielt EIN Protokoll für EINE Sicht (eigene Platznummer meinPlatz) aus —
 * Schritt für Schritt, jeden eigenen Zug SOFORT über meineKarte() (wie
 * lobby-blackjack.js#zug() es beschreibt), jeden fremden über anwenden().
 *
 * @param {string} saat
 * @param {Array<number>} plaetze
 * @param {Array<{platz: number, zug: string}>} eintraege
 * @param {number} meinPlatz 0 = reine Beobachtersicht, zieht nie selbst
 * @returns {{folge: LobbyTableSequence, austeilung: object}}
 */
function spieleAus(saat, plaetze, eintraege, meinPlatz) {
	const shoe = baueSchlitten(saat);
	const folge = new LobbyTableSequence({ shoe, meinPlatz, plaetze });
	const austeilung = folge.austeilen();

	const KARTEN_JE_ZUG = { h: 1, d: 1, p: 2, s: 0, i: 0, n: 0 };
	let protokollBisher = '';
	for (const eintrag of eintraege) {
		if (eintrag.platz === meinPlatz) {
			const anzahl = KARTEN_JE_ZUG[eintrag.zug] ?? 0;
			for (let k = 0; k < anzahl; k++) {
				folge.meineKarte();
			}
		}
		protokollBisher += `${eintrag.platz}${eintrag.zug}`;
		folge.anwenden(protokollBisher);
	}
	return { folge, austeilung };
}

/** Die Kartenfolge EINES Platzes als vergleichbare Zeichenkette. */
function blattAlsText(folge, platz) {
	return folge.blaetter.get(platz)?.map((k) => `${k.rank}${k.suit}`).join(',') ?? '';
}

/* ================================================================ B-4 === */

console.log('\nB-4  gerechnet: fünf unabhängige Sichten bekommen aus derselben Saat und demselben Protokoll für jeden Platz dieselben Karten');
{
	const PLAETZE = [1, 2, 3, 4, 5];
	let abweichungen = 0;
	for (let lauf = 0; lauf < 500 && abweichungen === 0; lauf++) {
		const saat = zufallsHex16();
		const eintraege = zufallsProtokoll(PLAETZE);
		const sichten = PLAETZE.map((meinPlatz) => spieleAus(saat, PLAETZE, eintraege, meinPlatz).folge);
		for (const platz of PLAETZE) {
			const referenz = blattAlsText(sichten[0], platz);
			for (const sicht of sichten.slice(1)) {
				if (blattAlsText(sicht, platz) !== referenz) {
					abweichungen++;
				}
			}
		}
	}
	check(abweichungen === 0, `alle fünf Sichten liefern für 500 zufällige Protokolle dieselben Karten je Platz (Abweichungen: ${abweichungen})`);

	console.log('     Gegenprobe B-4-G: ein verändertes Protokoll liefert eine andere Kartenfolge');
	// PROBEFEHLER, GEFUNDEN UND BEHOBEN: ein Vergleich über nur ZWEI Plätze
	// (vormals Platz 1 und 3) war stochastisch, keine echte Gegenprobe —
	// ein 6-Deck-Schlitten trägt jeden Rang/Farbe-Wert 24-mal, und
	// blattAlsText() vergleicht ausschließlich Rang und Farbe. Eine um EINE
	// Karte verschobene Ziehung liefert an der verglichenen Stelle rein
	// zufällig mit spürbarer Wahrscheinlichkeit DIESELBE Zeichenkette (nur
	// zwei Stellen verglichen, ~50 % Fehlschlagsquote gemessen über mehrere
	// Läufe). Verglichen werden deshalb jetzt ALLE FÜNF Plätze; dass ALLE
	// fünf zufällig gleich blieben, ist praktisch ausgeschlossen.
	const saat = zufallsHex16();
	const eintraege = zufallsProtokoll(PLAETZE);
	const a = spieleAus(saat, PLAETZE, eintraege, 1).folge;
	// Der zusätzliche Zug wird VORN eingefügt, damit er die gesamte
	// nachfolgende Ziehreihenfolge verschiebt — ein angehängter Zug am Ende
	// des Protokolls beträfe nur den letzten Platz, das wäre eine schwache
	// Gegenprobe.
	const verfaelscht = [{ platz: 2, zug: 'h' }, ...eintraege];
	const b = spieleAus(saat, PLAETZE, verfaelscht, 1).folge;
	const irgendeinUnterschied = PLAETZE.some((platz) => blattAlsText(a, platz) !== blattAlsText(b, platz));
	check(irgendeinUnterschied,
		'B-4-G: ein vorangestellter zusätzlicher Zug verschiebt die Karten nachweislich (mindestens einer von fünf Plätzen ändert sich)');
}

/* ================================================================ B-5 === */

console.log("\nB-5  gerechnet: die Geberkarten sind gleich, ob eine Sicht früh oder spät nach ihnen fragt (Geberreserve)");
{
	const PLAETZE = [1, 2, 3];
	let abweichungen = 0;
	for (let lauf = 0; lauf < 300 && abweichungen === 0; lauf++) {
		const saat = zufallsHex16();

		// Sicht A: fragt die Geberreserve SOFORT nach dem Austeilen ab (wie
		// ein Platz, der als Erster steht — round-blackjack.js#_playDealer()
		// liefe bei ihm sofort). meinPlatz ist ein ECHTER Platz (die Klasse
		// verlangt einen Eintrag in plaetze, siehe austeilen()) — welcher,
		// ist für die Geberreserve ohne Belang, sie hängt von keinem Platz ab.
		const shoeA = baueSchlitten(saat);
		const folgeA = new LobbyTableSequence({ shoe: shoeA, meinPlatz: PLAETZE[0], plaetze: PLAETZE });
		folgeA.austeilen();
		const geberA = [folgeA.geberKarte(), folgeA.geberKarte(), folgeA.geberKarte()];

		// Sicht B: wendet ERST ein vollständiges Zugprotokoll aller Plätze
		// an (wie ein Platz, dessen Geber erst ganz am Schluss spielt),
		// DANN erst die Geberreserve.
		const shoeB = baueSchlitten(saat);
		const folgeB = new LobbyTableSequence({ shoe: shoeB, meinPlatz: PLAETZE[0], plaetze: PLAETZE });
		folgeB.austeilen();
		const protokoll = zufallsProtokoll(PLAETZE).map((e) => `${e.platz}${e.zug}`).join('');
		folgeB.anwenden(protokoll);
		const geberB = [folgeB.geberKarte(), folgeB.geberKarte(), folgeB.geberKarte()];

		if (geberA.map((k) => `${k.rank}${k.suit}`).join(',') !== geberB.map((k) => `${k.rank}${k.suit}`).join(',')) {
			abweichungen++;
		}
	}
	check(abweichungen === 0, `die Geberreserve liefert unabhängig vom Zeitpunkt des Abfragens dieselben Karten (Abweichungen: ${abweichungen})`);
}

/* ================================================================ B-6 === */

console.log('\nB-6  gerechnet: eine neue Runde (neue Saat, leeres Protokoll) liefert für alle Sichten wieder dieselben Karten');
{
	const PLAETZE = [1, 2, 3, 4];
	let abweichungen = 0;
	for (let lauf = 0; lauf < 200 && abweichungen === 0; lauf++) {
		// Runde 1: eine Sicht (Platz 2) spielt mit, Runde 2 beginnt für ALLE
		// Sichten gleich neu — eine "verpasste" Runde hat keinen Einfluss,
		// weil jede Runde einen KOMPLETT NEUEN Schlitten aus einer neuen
		// Saat bekommt (blackjack.js#folgeBauen(): shoe.shuffle() vor jeder
		// Runde).
		spieleAus(zufallsHex16(), [2], zufallsProtokoll([2]), 2);

		const saatRunde2 = zufallsHex16();
		const protokollRunde2 = zufallsProtokoll(PLAETZE);
		const sichten = PLAETZE.map((meinPlatz) => spieleAus(saatRunde2, PLAETZE, protokollRunde2, meinPlatz).folge);
		for (const platz of PLAETZE) {
			const referenz = blattAlsText(sichten[0], platz);
			for (const sicht of sichten.slice(1)) {
				if (blattAlsText(sicht, platz) !== referenz) {
					abweichungen++;
				}
			}
		}
	}
	check(abweichungen === 0, `alle Sichten stimmen in Runde 2 überein, unabhängig davon, ob sie Runde 1 mitspielten (Abweichungen: ${abweichungen})`);
}

/* ================================================================ B-7 === */

console.log('\nB-7  gerechnet: keine Karte wird zweimal ausgegeben — Austeilung/Züge erreichen nie die Geberreserve');
{
	const PLAETZE = [1, 2, 3, 4, 5];
	let verletzungen = 0;
	let hoechsterStand = 0;
	for (let lauf = 0; lauf < 2000; lauf++) {
		const saat = zufallsHex16();
		const shoe = baueSchlitten(saat);
		const folge = new LobbyTableSequence({ shoe, meinPlatz: PLAETZE[0], plaetze: PLAETZE });
		folge.austeilen();
		// Ein bewusst LANGES Protokoll (bis zu 10 Züge je Platz), um den
		// Grenzfall zu erzwingen, nicht nur den Regelfall.
		const eintraege = [];
		for (const platz of PLAETZE) {
			const zuege = 1 + Math.floor(Math.random() * 10);
			for (let i = 0; i < zuege; i++) {
				eintraege.push({ platz, zug: i === zuege - 1 ? 's' : 'h' });
			}
		}
		const protokoll = eintraege.map((e) => `${e.platz}${e.zug}`).join('').slice(0, 255);
		folge.anwenden(protokoll);
		hoechsterStand = Math.max(hoechsterStand, shoe.pos);
		// Die Reserve beginnt bei cards.length − 16 (round-lobby-blackjack.js,
		// austeilen()); die vordere Ziehposition darf diese Grenze nie
		// erreichen — sonst gäbe dieselbe physische Karte zweimal aus (einmal
		// über meineKarte()/anwenden(), einmal über geberKarte()).
		if (shoe.pos > shoe.cards.length - 16) {
			verletzungen++;
		}
	}
	check(verletzungen === 0,
		`die vordere Ziehposition erreicht in 2000 Runden (bis zu 255 Zeichen langem Protokoll) nie die Geberreserve (Verletzungen: ${verletzungen}, höchster Stand: ${hoechsterStand} von ${312 - 16})`);

	console.log('     Gegenprobe B-7-G: eine künstlich verkürzte Reserve (2 statt 16 Karten) lässt sich tatsächlich verletzen');
	const shoeG = baueSchlitten(zufallsHex16());
	const folgeG = new LobbyTableSequence({ shoe: shoeG, meinPlatz: PLAETZE[0], plaetze: PLAETZE });
	folgeG.austeilen();
	folgeG.reserve = folgeG.reserve.slice(0, 2); // künstlich auf 2 Karten verkürzt
	let wurfGesehen = false;
	try {
		for (let i = 0; i < 5; i++) {
			folgeG.geberKarte();
		}
	} catch (fehlerObjekt) {
		wurfGesehen = fehlerObjekt instanceof RangeError;
	}
	check(wurfGesehen, 'B-7-G: eine erschöpfte Reserve wirft nachweislich einen RangeError, statt still eine Karte zu wiederholen');
}

/* ================================================================ B-8/B-9 === */

/**
 * Vereinfachte Ein-Blatt-Auswertung, AUSSCHLIESSLICH über die reinen
 * Funktionen von rules-blackjack.js (siehe Kopfkommentar: kein
 * round-blackjack.js in diesem Lauf).
 *
 * @param {Array<object>} spielerkarten
 * @param {Array<object>} geberkarten bereits vollständig ausgespielt
 * @param {number} stake
 * @returns {{outcome: string, returned: number}}
 */
function werteEinBlattAus(spielerkarten, geberkarten, stake) {
	const spielerRanks = spielerkarten.map((k) => k.rank);
	const geberRanks = geberkarten.map((k) => k.rank);
	const spielerTotal = rules.handTotal(spielerRanks);
	const geberTotal = rules.handTotal(geberRanks);
	const spielerBlackjack = rules.isBlackjack(spielerRanks);
	const geberBlackjack = geberkarten.length === 2 && rules.isBlackjack(geberRanks);

	if (spielerTotal.busted) {
		return { outcome: 'bust', returned: rules.loseReturn() };
	}
	if (geberBlackjack) {
		return spielerBlackjack
			? { outcome: 'push', returned: rules.pushReturn(stake) }
			: { outcome: 'lose', returned: rules.loseReturn() };
	}
	if (spielerBlackjack) {
		return { outcome: 'blackjack', returned: rules.blackjackReturn(stake) };
	}
	if (geberTotal.busted || spielerTotal.total > geberTotal.total) {
		return { outcome: 'win', returned: rules.winReturn(stake) };
	}
	if (spielerTotal.total === geberTotal.total) {
		return { outcome: 'push', returned: rules.pushReturn(stake) };
	}
	return { outcome: 'lose', returned: rules.loseReturn() };
}

/** Zieht Geberkarten aus der Reserve nach Schema, wie round-blackjack.js#_playDealer() es täte — aber ohne round-blackjack.js zu importieren. */
function geberFertigSpielen(folge, anfangskarten) {
	const karten = [...anfangskarten];
	while (rules.dealerMustDraw(rules.handTotal(karten.map((k) => k.rank)))) {
		karten.push(folge.geberKarte());
	}
	return karten;
}

console.log('\nB-8  gerechnet, vereinfacht: über 2000 Ein-Blatt-Runden gilt Kasse + Einsatz = vorher + (returned − staked)');
console.log('B-9  gerechnet: die an die Lobby gemeldete Bilanz ({box: net}) ist dieselbe Zahl, die die Auswertung tatsächlich ergibt');
{
	let kasse = 10_000_000;
	const KASSE_ANFANGS = kasse;
	let gesamtNet = 0;
	let bilanzAbweichungen = 0;

	for (let lauf = 0; lauf < 2000; lauf++) {
		const PLAETZE = [1, 2, 3];
		const saat = zufallsHex16();
		const shoe = baueSchlitten(saat);
		const folge = new LobbyTableSequence({ shoe, meinPlatz: 1, plaetze: PLAETZE });
		const austeilung = folge.austeilen();

		// Zwei Mitspieler stehen (Platz 2, 3), Platz 1 ist die eigene Sicht.
		// Jeder zieht 0 bis 2 zusätzliche Karten (kein Teilen/Verdoppeln —
		// siehe Dateikopf).
		const eintraege = [];
		for (const platz of PLAETZE) {
			const zuege = Math.floor(Math.random() * 3);
			for (let i = 0; i < zuege; i++) {
				eintraege.push({ platz, zug: 'h' });
			}
			eintraege.push({ platz, zug: 's' });
		}
		let protokollBisher = '';
		for (const eintrag of eintraege) {
			if (eintrag.platz === 1 && eintrag.zug === 'h') {
				folge.meineKarte();
			}
			protokollBisher += `${eintrag.platz}${eintrag.zug}`;
			folge.anwenden(protokollBisher);
		}

		const geberKarten = geberFertigSpielen(folge, austeilung.geber);
		const stake = rules.BET_MIN + 2 * Math.floor(Math.random() * ((rules.BET_MAX - rules.BET_MIN) / 2));
		const { outcome, returned } = werteEinBlattAus(folge.blaetter.get(1), geberKarten, stake);
		const net = returned - stake;

		const vorher = kasse;
		kasse -= stake;
		kasse += returned;
		if (kasse !== vorher + net) {
			bilanzAbweichungen++;
		}
		gesamtNet += net;

		// B-9: die Nutzlast, die lobby-blackjack.js meldet ({box: net}) —
		// nachgerechnet aus outcome/returned/stake, unabhängig davon, WIE
		// werteEinBlattAus() zur Zahl kam.
		const erwartetesNet = outcome === 'bust' || outcome === 'lose'
			? -stake
			: (outcome === 'push' ? 0 : (outcome === 'blackjack' ? Math.round(stake * 1.5) : stake));
		if (erwartetesNet !== net) {
			bilanzAbweichungen++;
		}
	}

	check(kasse === KASSE_ANFANGS + gesamtNet,
		`Kasse + Einsatz = vorher + net, über 2000 Runden kumuliert (Kasse: ${kasse}, erwartet: ${KASSE_ANFANGS + gesamtNet})`);
	check(bilanzAbweichungen === 0,
		`die gemeldete Bilanz (net) stimmt in jeder der 2000 Runden mit der unabhängig hergeleiteten Zahl überein (Abweichungen: ${bilanzAbweichungen})`);
}

/* ================================================================ B-10 === */

console.log('\nB-10  gerechnet: ein Platz, der mitten in der Runde verschwindet, verschiebt die Karten der übrigen nicht');
{
	const PLAETZE_VOLL = [1, 2, 3, 4];
	let abweichungen = 0;
	for (let lauf = 0; lauf < 300 && abweichungen === 0; lauf++) {
		const saat = zufallsHex16();
		const eintraege = zufallsProtokoll(PLAETZE_VOLL);

		// Sicht A: alle vier Plätze bleiben die ganze Runde über in der
		// Platzliste (so, wie der Server sie beim Rundenstart sah — auch
		// wenn Platz 3 mittendrin geht, STEHT sein Protokoll weiter, siehe
		// round-lobby-blackjack.js, Dateikopf "WER MITTENDRIN GEHT").
		const sichtA = spieleAus(saat, PLAETZE_VOLL, eintraege, 1).folge;

		// Sicht B: dieselbe Saat, dieselbe Platzliste, dasselbe Protokoll —
		// die zweite Sicht bekommt zusätzlich einen Aufruf, der NICHTS an
		// der Platzliste ändert (plaetze ist bei LobbyTableSequence auf
		// Rundenbeginn fixiert, ein späteres Verlassen ändert sie nicht
		// rückwirkend). Verglichen wird deshalb, dass beide Sichten trotz
		// unterschiedlicher tatsächlicher Anwesenheit dieselben Karten für
		// die VERBLEIBENDEN Plätze 1, 2 und 4 liefern.
		const sichtB = spieleAus(saat, PLAETZE_VOLL, eintraege, 4).folge;

		for (const platz of [1, 2, 4]) {
			if (blattAlsText(sichtA, platz) !== blattAlsText(sichtB, platz)) {
				abweichungen++;
			}
		}
	}
	check(abweichungen === 0,
		`die verbleibenden Plätze bekommen unabhängig von der eigenen Sicht dieselben Karten, das Protokoll eines gegangenen Platzes bleibt wirksam (Abweichungen: ${abweichungen})`);
}

/* ------------------------------------------------------------- Wächter === */

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört die Erwartungszahl nachgezogen).');
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0
	? 'alle Prüfungen bestanden. Fünf unabhängige Sichten rechnen aus derselben Saat und demselben Protokoll dieselbe Kartenfolge, die Geberreserve ist vom Zeitpunkt des Abfragens unabhängig, keine Karte wird zweimal ausgegeben, das Geld bleibt über 2000 vereinfachten Runden auf den Cent erhalten, und ein mitten in der Runde gehender Platz verschiebt die Karten der übrigen nicht.'
	: `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
process.exit(fehler === 0 ? 0 : 1);
