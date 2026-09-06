/**
 * Blackjack – Messlauf Auszahlungsquote (M-C4-2)
 * =================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Der ZWEITE der beiden
 * langen Messläufe aus CONCEPT.md C.5.4. Er wird von diesem Umsetzungsstück
 * GEBAUT, aber NICHT in voller Länge gefahren — lange Läufe gehören nicht in
 * einen Agentenlauf; die Hauptsitzung führt ihn in vollem Umfang aus und
 * trägt das Ergebnis in README.md und MEMORY.md nach (Plan Abschnitt 7).
 *
 * Aufruf, mit den in C.5.4 verlangten Vorgaben:
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/measure-payout.mjs \
 *       --hands=10000000 --seed=20260906
 *
 * Ohne Angabe: --hands=10000000, --seed=1, --stake=10. Ein kleinerer Umfang
 * wird angenommen, aber im Bericht ausdrücklich als „UNTER DEM GEFORDERTEN
 * UMFANG" gekennzeichnet — C.5.4 verlangt für den abschließenden Nachweis
 * mindestens 10.000.000 Hände. Rückgabewert 0, wenn die Quote in der Toleranz
 * liegt UND die Bilanz auf den Cent stimmt UND die Gegenprobe deutlich
 * niedriger liegt; 1 sonst.
 *
 * AUF WELCHE GRÖSSE DIE QUOTE GEMESSEN WIRD (Plan Abschnitt 4, Festlegung 5)
 * -------------------------------------------------------------------------------
 * Die Zusage aus C.5.4/Anhang G lautet 99,6 % ± 0,3 Prozentpunkte, entsprechend
 * einem Hausvorteil von rund 0,40 % — bezogen, wie jede Hausvorteilsangabe beim
 * Blackjack, auf den GRUNDEINSATZ, nicht auf den gesamten umgesetzten Betrag.
 * Die PRÜFGRÖSSE ist deshalb:
 *
 *   Quote = 1 + (Summe aller Nettoergebnisse) / (Summe aller Grundeinsätze)
 *
 * report.initialStake (round-blackjack.js) ist genau diese Bezugsgröße, für
 * jede Runde einzeln festgehalten und NIE mit report.staked (Grundeinsatz +
 * Verdoppeln + Teilen + Versicherung) vermengt — das Vermengen wäre die
 * naheliegende, aber falsche Alternative: sie ergibt eine ANDERE, systematisch
 * höhere Zahl, weil Verdoppeln für den Spieler vorteilhaft ist. Diese zweite
 * Größe (Quote je umgesetztem Euro) wird trotzdem berichtet, klar als
 * NEBENANGABE beschriftet, und entscheidet nichts.
 *
 * WIE DIE TOLERANZ ZUSTANDE KOMMT
 * -----------------------------------
 * Bestanden ist der Lauf, wenn die gemessene Quote im FESTEN Fenster
 * 99,6 % ± 0,3 Punkte liegt — das ist wörtlich die Zusage des Konzepts, keine
 * aus der Stichprobe abgeleitete Schranke (anders als beim Roulette, wo die
 * Zusage selbst schon "eine Prozentzahl mit impliziter Unsicherheit" ist und
 * die Schranke deshalb an die Stichprobe gekoppelt werden MUSSTE, um den
 * Fehlalarm vom 2026-09-05 zu vermeiden — siehe DECISIONS.md). ABER: eine
 * feste Schranke gegen eine schwankende Messgröße ohne jede Einordnung ist
 * GENAU die Fehlerklasse, die beim Roulette den Fehlalarm verursacht hat, wenn
 * man sie unkommentiert stehen lässt. Deshalb rechnet dieses Skript ZUSÄTZLICH
 * die EMPIRISCHE Standardabweichung DES MITTELWERTS aus der TATSÄCHLICHEN
 * Stichprobe (stdDevOfMean() aus stats.mjs, nicht aus einer Annahme) und weist
 * aus:
 *   - die gemessene Abweichung vom Zielwert 99,6 % in Vielfachen dieser
 *     empirischen Streuung (Sigma),
 *   - ob das feste Konzept-Fenster (±0,3 Punkte) für DIESEN Stichprobenumfang
 *     überhaupt aussagekräftig eng bzw. weit genug ist: das Verhältnis
 *     0,3 / SE(Quote) sagt, das WIEVIELFACHE der Streuung das Fenster breit
 *     ist. Bei zehn Millionen Händen liegt SE(Quote) in der Größenordnung von
 *     0,04 Prozentpunkten, das Fenster ist also rund ACHTFACH so weit — ein
 *     Fehlalarm durch reine Streuung ist dort praktisch ausgeschlossen. Bei
 *     einem verkürzten Lauf (z. B. der Kurzprobe dieses Umsetzungsstücks) ist
 *     SE(Quote) viel größer, das Verhältnis entsprechend klein, und dieses
 *     Skript sagt das AUSDRÜCKLICH: es nennt das Fenster, das zu diesem
 *     Umfang PASSEN würde (±4 × SE, dieselbe Sigma-Wahl wie beim
 *     Roulette-Nachtrag vom 2026-09-05, aus demselben Grund: bei mehreren
 *     gleichzeitig laufenden Prüfungen — hier zusätzlich die Bilanz und die
 *     Gegenprobe — braucht es Reserve gegen einen zufälligen Fehlalarm).
 * DAMIT IST DIE SCHRANKE SELBST DAS KONZEPT-FENSTER (das ist die Zusage, die
 * geprüft werden soll), UND DIE EMPIRISCHE STREUUNG IST DER MASSSTAB, AN DEM
 * MAN ABLESEN KANN, OB EIN FEHLSCHLAG EINE ECHTE ABWEICHUNG ODER NUR
 * STICHPROBENSTREUUNG IST — genau die Formulierung aus Plan Abschnitt 4,
 * Festlegung 5 und aus dem Auftrag dieses Laufs.
 *
 * DIE GEGENPROBE — WARUM SIE HIER BESONDERS WICHTIG IST
 * -----------------------------------------------------------
 * Ein Quotenlauf mit einer falschen Strategietabelle liefert eine falsche
 * Quote, und man sähe es der Zahl allein nicht an. Deshalb läuft VOR dem
 * Hauptlauf eine kurze Vergleichsmessung über 200.000 Hände mit
 * mimicDealer() aus basic-strategy.mjs — der Strategie eines Spielers, der
 * einfach wie der Geber spielt und NIE verdoppelt, teilt oder versichert.
 * Ihre Quote muss DEUTLICH niedriger liegen (Größenordnung 94 %; geprüft wird
 * „mindestens drei Prozentpunkte unter dem Grundstrategie-Ergebnis" DIESES
 * Laufs). Kommt bei beiden dasselbe heraus, ist die Grundstrategie nicht
 * angeschlossen oder die Verrechnung ignoriert Verdoppeln und Teilen — und
 * dieses Skript sagt das und gibt 1 zurück, statt einen grünen Hauptlauf zu
 * melden.
 *
 * DIE BILANZIDENTITÄT
 * -----------------------
 * Über den ganzen Hauptlauf muss die Summe aller report.net EXAKT gleich
 * Summe(returned) − Summe(staked) sein — auf den Cent, nicht im Rahmen einer
 * Toleranz. Das ist eine reine Buchungsidentität (dieselbe Zusage wie Q-11 in
 * verify-round.mjs, hier über den vollen Lauf statt über 200.000 Runden).
 *
 * DER EINGEBAUTE SELBSTTEST — ZWEI TEILE, BEIDE VOR DEM EIGENTLICHEN LAUF
 * ----------------------------------------------------------------------------
 * (1) stats.mjs prüft sich gegen ihre von Hand abgeschriebenen
 *     Referenzwerte. Schlägt das fehl, BRICHT DIESER LAUF AB.
 * (2) basic-strategy.mjs prüft sich gegen eine unabhängig abgetippte
 *     Abschrift der veröffentlichten S17/DAS-Tabelle. Schlägt das fehl,
 *     BRICHT DIESER LAUF EBENFALLS AB: eine Quote, die mit einer falschen
 *     Grundstrategie gemessen wird, ist bedeutungslos.
 *
 * DER ZUFALLSGEBER IST createSeeded(seed), NIE drawUint32 — ein Nachweis muss
 * auf jeder Maschine dieselbe Zahl liefern (C.5.2/C.5.3). Ein EINZIGER Shoe
 * läuft über den gesamten Lauf, genau wie am echten Tisch: er mischt
 * ausschließlich, wenn shoe.needsShuffle zwischen zwei Runden wahr ist — der
 * Aufruf dieses Skripts entspricht damit exakt der Bauart, mit der auch
 * verify-round.mjs (Q-9, Q-11, Q-12, Q-13) simuliert.
 *
 * WAS PASSIERT, WENN DER LAUF DURCHFÄLLT. C.5.4 ist eindeutig: nachgebessert
 * wird in dieser Reihenfolge, und NIE der Zufallsgenerator verbogen und NIE
 * ein Ergebnis nachträglich verschoben:
 *   (1) die Gegenprobe ansehen — ist sie NICHT deutlich niedriger, liegt der
 *       Fehler in der VERDRAHTUNG dieses Messlaufs (basic-strategy.mjs falsch
 *       angeschlossen, oder das Sammeln der Kennzahlen ignoriert Verdoppeln/
 *       Teilen), nicht im Spiel selbst;
 *   (2) verify-round.mjs Q-10/Q-11 laufen lassen — stimmt die Ganzzahligkeit
 *       und die Bilanz je Runde am echten Rundenmodul;
 *   (3) die Strategietabellen in basic-strategy.mjs gegen die Hausregeln
 *       prüfen, insbesondere die Spalten für weiche Blätter und die
 *       Paarentscheidungen (deren Selbsttest zuerst laufen lassen);
 *   (4) erst danach die Auszahlungsfaktoren in rules-blackjack.js
 *       (R-6/R-10 in verify-rules.mjs) ansehen.
 */

import * as rules from '../../Public/JavaScript/rules-blackjack.js';
import { Shoe } from '../../Public/JavaScript/shoe.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';
import { BlackjackRound } from '../../Public/JavaScript/round-blackjack.js';
import { decide, mimicDealer, selbsttest as strategieSelbsttest } from './basic-strategy.mjs';
import { stdDevOfMean, selbsttest as statsSelbsttest } from './stats.mjs';

/* ================================================== Kommandozeile ======= */

function parseArgs(argv) {
	const werte = { hands: 10000000, seed: 1, stake: 10 };
	for (const arg of argv) {
		const treffer = /^--(hands|seed|stake)=(-?\d+)$/.exec(arg);
		if (treffer) {
			werte[treffer[1]] = Number(treffer[2]);
		}
	}
	return werte;
}

const { hands: ANZAHL, seed: SAAT, stake: EINSATZ } = parseArgs(process.argv.slice(2));
const MINDESTUMFANG = 10000000;
/** Vielfaches der empirischen Streuung für das "zu diesem Umfang passende" Fenster. */
const SIGMA_FUER_KLEINE_LAEUFE = 4;
/** Mindestabstand der Gegenprobe unter der Grundstrategie, in Prozentpunkten. */
const GEGENPROBE_MINDESTABSTAND_PUNKTE = 3;

console.log('\nBlackjack – Messlauf Auszahlungsquote (M-C4-2)');
console.log('=================================================\n');

/* ============================================ Selbsttest, Teil 1: stats = */

console.log('Selbsttest 1/2: stats.mjs gegen von Hand abgeschriebene Referenzwerte');
if (!statsSelbsttest((ok, text) => console.log(`  ${ok ? '✓' : '✗'} ${text}`))) {
	console.error('\nABBRUCH: der Selbsttest von stats.mjs ist fehlgeschlagen. Eine Messung mit'
		+ ' falscher Statistik soll gar nicht erst laufen (CONCEPT.md C.5.4).');
	process.exit(1);
}
console.log('  → bestanden.\n');

/* ================================== Selbsttest, Teil 2: Grundstrategie == */

console.log('Selbsttest 2/2: basic-strategy.mjs gegen eine unabhängig abgetippte Tabellenabschrift');
const strategieErgebnis = strategieSelbsttest((ok, text) => console.log(`  ${ok ? '✓' : '✗'} ${text}`));
if (!strategieErgebnis.bestanden) {
	console.error('\nABBRUCH: der Selbsttest von basic-strategy.mjs ist fehlgeschlagen. Eine'
		+ ' Auszahlungsquote mit einer falschen Grundstrategie ist bedeutungslos.');
	process.exit(1);
}
console.log(`  → bestanden (${strategieErgebnis.geprueft} geprüfte Lagen).\n`);

/* ====================================================== Eine Runde spielen */

/**
 * Verschiebt den lokalen "aktuelles Blatt"-Zeiger über bereits erledigte
 * geteilte Ass-Blätter hinweg (sie sind laut round-blackjack.js sofort nach
 * dem Teilen fertig, ohne dass eine Handlung nötig war).
 */
function ueberSofortFertigeBlaetterHinweg(round, idx) {
	while (round.hands[idx] && round.hands[idx].fromSplitAce) {
		idx++;
	}
	return idx;
}

/**
 * Spielt das/die aktiven Blätter EINER Runde bis zu Ende, über eine
 * übergebene Entscheidungsfunktion. `strategie(hand, upcardRank, legalActions)`
 * liefert eine der von legalActions zugelassenen Handlungen.
 *
 * Diese Funktion dupliziert KEINE Spielregel — sie verfolgt ausschließlich,
 * WELCHER Index im öffentlich sichtbaren round.hands-Array gerade "an der
 * Reihe" ist (dieselbe Buchführung, die round-blackjack.js intern über
 * _currentHand() ohnehin führt), damit die Strategiefunktion das richtige
 * Blatt zu sehen bekommt. Jede Spielentscheidung selbst kommt ausschließlich
 * aus round.legalActions()/round.act().
 *
 * @param {BlackjackRound} round
 * @param {(hand: Object, upcard: string, legalActions: string[]) => string} strategie
 */
function spieleAktiveBlaetter(round, strategie) {
	let idx = ueberSofortFertigeBlaetterHinweg(round, 0);
	while (round.state === 'spieler') {
		const legalActions = round.legalActions();
		if (legalActions.length === 0) {
			throw new Error('spieleAktiveBlaetter(): legalActions() ist leer, obwohl state === "spieler"');
		}
		const hand = round.hands[idx];
		if (hand === undefined) {
			throw new Error(`spieleAktiveBlaetter(): kein Blatt an Index ${idx}`);
		}
		const upcard = round.dealer.upcard.rank;
		const action = legalActions.length === 1 ? legalActions[0] : strategie(hand, upcard, legalActions);
		const ergebnis = round.act(action);
		if (!ergebnis.ok) {
			throw new Error(`spieleAktiveBlaetter(): act('${action}') abgewiesen (${ergebnis.reason}) — `
				+ `Blatt ${JSON.stringify(hand)}, upcard ${upcard}, legalActions ${JSON.stringify(legalActions)}`);
		}
		if (action === 'split') {
			idx = ueberSofortFertigeBlaetterHinweg(round, idx);
			continue;
		}
		if (action === 'hit') {
			if (round.hands[idx].busted) {
				idx = ueberSofortFertigeBlaetterHinweg(round, idx + 1);
			}
			continue;
		}
		// 'stand' oder 'double': dieses Blatt ist fertig, weiter zum nächsten.
		idx = ueberSofortFertigeBlaetterHinweg(round, idx + 1);
	}
}

/**
 * Spielt EINE vollständige Runde (mischen, falls nötig; Einsatz; Versicherung
 * ablehnen — beide hier gemessenen Strategien versichern nie; Blätter des
 * Spielers; der Geber zieht automatisch) und liefert den Bericht.
 *
 * @param {BlackjackRound} round
 * @param {Shoe} shoe
 * @param {(hand: Object, upcard: string, legalActions: string[]) => string} strategie
 * @param {number} stake
 * @returns {{report: Object, gemischt: boolean, mischGrund: ?string}}
 */
function spieleRunde(round, shoe, strategie, stake) {
	let gemischt = false;
	let mischGrund = null;
	if (shoe.needsShuffle) {
		mischGrund = shoe.shuffleReason;
		shoe.shuffle();
		gemischt = true;
	}
	const begonnen = round.begin(stake);
	if (!begonnen.ok) {
		throw new Error(`spieleRunde(): begin(${stake}) abgewiesen (${begonnen.reason})`);
	}
	if (round.state === 'versicherung') {
		// Weder die Grundstrategie noch die Gegenprobe versichern jemals —
		// die Versicherung ist ohne Kartenzählen eine Wette mit negativem
		// Erwartungswert (allgemein bekannt, keine Zahl aus Anhang G).
		round.declineInsurance();
	}
	spieleAktiveBlaetter(round, strategie);
	return { report: round.report, gemischt, mischGrund };
}

/**
 * Spielt `anzahl` Runden mit der übergebenen Strategie über einen frischen
 * Shoe und fasst die Kennzahlen zusammen.
 *
 * @param {{seed: number, anzahl: number, stake: number,
 *           strategie: Function, fortschritt?: boolean, label?: string}} optionen
 */
function spieleLauf({ seed, anzahl, stake, strategie, fortschritt = false, label = '' }) {
	const shoe = new Shoe({ rules, random: createSeeded(seed) });
	const round = new BlackjackRound({ rules, shoe });

	let summeGrundeinsatz = 0;
	let summeStaked = 0;
	let summeReturned = 0;
	let summeNet = 0;
	const netzWerteJeGrundeinsatz = new Float64Array(anzahl); // für stdDevOfMean()

	const ausgaenge = { blackjack: 0, win: 0, push: 0, lose: 0, bust: 0 };
	let handsGesamt = 0;
	let doublesGesamt = 0;
	let splitsGesamt = 0;
	let versicherungenGenommen = 0;
	let mischungenGesamt = 0;
	const mischGruende = { cut: 0, count: 0 };

	const schritt = Math.max(1, Math.floor(anzahl / 20));
	const start = Date.now();

	for (let n = 0; n < anzahl; n++) {
		const { report, gemischt, mischGrund } = spieleRunde(round, shoe, strategie, stake);

		summeGrundeinsatz += report.initialStake;
		summeStaked += report.staked;
		summeReturned += report.returned;
		summeNet += report.net;
		netzWerteJeGrundeinsatz[n] = report.net;

		handsGesamt += report.hands.length;
		splitsGesamt += report.hands.length - 1;
		for (const hand of report.hands) {
			ausgaenge[hand.outcome] = (ausgaenge[hand.outcome] ?? 0) + 1;
			if (hand.doubled) {
				doublesGesamt++;
			}
		}
		if (report.insurance.staked > 0) {
			versicherungenGenommen++;
		}
		if (gemischt) {
			mischungenGesamt++;
			mischGruende[mischGrund] = (mischGruende[mischGrund] ?? 0) + 1;
		}

		if (fortschritt && (n + 1) % schritt === 0) {
			console.log(`  … ${label}${(((n + 1) / anzahl) * 100).toFixed(0)} %`
				+ ` (${(n + 1).toLocaleString('de-DE')} / ${anzahl.toLocaleString('de-DE')} Hände)`);
		}
	}

	const dauerMs = Date.now() - start;
	const quoteJeGrundeinsatz = 1 + summeNet / summeGrundeinsatz;
	const quoteJeUmsatz = 1 + summeNet / summeStaked;
	const bilanzStimmt = summeNet === summeReturned - summeStaked;
	const standardfehlerNetto = stdDevOfMean(netzWerteJeGrundeinsatz);
	// Standardfehler der QUOTE (als Bruchteil): der Grundeinsatz ist über den
	// ganzen Lauf konstant (derselbe --stake-Wert jede Runde), deshalb genügt
	// die Division durch stake — dieselbe Rechnung wie
	// SE(1 + mean(net)/stake) = SE(mean(net)) / stake.
	const standardfehlerQuote = standardfehlerNetto / stake;

	return {
		anzahl, seed, stake, dauerMs,
		summeGrundeinsatz, summeStaked, summeReturned, summeNet,
		quoteJeGrundeinsatz, quoteJeUmsatz, bilanzStimmt,
		standardfehlerQuote,
		ausgaenge, handsGesamt, doublesGesamt, splitsGesamt,
		versicherungenGenommen, mischungenGesamt, mischGruende,
	};
}

/** Ersetzt den Dezimalpunkt durch ein Komma — deutsche Zahlenschreibweise im Bericht. */
function de(zahl, nachkommastellen = 4) {
	return zahl.toFixed(nachkommastellen).replace('.', ',');
}

function berichteLauf(ergebnis, ueberschrift) {
	console.log(`\n${ueberschrift}`);
	console.log(`  Umfang                    ${ergebnis.anzahl.toLocaleString('de-DE')} Hände`);
	console.log(`  Saat                      ${ergebnis.seed}`);
	console.log(`  Grundeinsatz je Hand      ${ergebnis.stake} €`);
	console.log(`  Laufzeit                  ${(ergebnis.dauerMs / 1000).toFixed(1)} s`);
	console.log(`  Summe Grundeinsätze       ${ergebnis.summeGrundeinsatz.toLocaleString('de-DE')} €`);
	console.log(`  Summe aller Einsätze      ${ergebnis.summeStaked.toLocaleString('de-DE')} € (Grund + Verdoppeln + Teilen + Versicherung)`);
	console.log(`  Summe aller Rückgaben     ${ergebnis.summeReturned.toLocaleString('de-DE')} €`);
	console.log(`  Bilanz                    ${ergebnis.bilanzStimmt ? 'STIMMT — auf den Cent' : 'STIMMT NICHT'}`);
	console.log(`  Quote je GRUNDEINSATZ     ${de(ergebnis.quoteJeGrundeinsatz * 100, 4)} %  ← PRÜFGRÖSSE (C.5.4)`);
	console.log(`  Quote je umgesetztem Euro ${de(ergebnis.quoteJeUmsatz * 100, 4)} %  (Nebenangabe, entscheidet nichts)`);
	console.log(`  Standardfehler der Quote  ${de(ergebnis.standardfehlerQuote * 100, 4)} Prozentpunkte (empirisch, aus dieser Stichprobe)`);
	console.log(`  Ausgänge (je Blatt)       blackjack ${ergebnis.ausgaenge.blackjack ?? 0}, win ${ergebnis.ausgaenge.win ?? 0},`
		+ ` push ${ergebnis.ausgaenge.push ?? 0}, lose ${ergebnis.ausgaenge.lose ?? 0}, bust ${ergebnis.ausgaenge.bust ?? 0}`
		+ ` (Blätter gesamt: ${ergebnis.handsGesamt})`);
	console.log(`  Verdoppelt                ${ergebnis.doublesGesamt}`);
	console.log(`  Teilungen (zusätzl. Blätter) ${ergebnis.splitsGesamt}`);
	console.log(`  Versicherung genommen     ${ergebnis.versicherungenGenommen} (muss 0 sein — Grundstrategie versichert nie)`);
	console.log(`  Mischungen                ${ergebnis.mischungenGesamt} (Grund: cut ${ergebnis.mischGruende.cut ?? 0}, count ${ergebnis.mischGruende.count ?? 0})`);
}

/* ================================== Gegenprobe: mimicDealer, 200.000 Hände */

console.log(`Gegenprobe VOR dem Hauptlauf: 200.000 Hände mit mimicDealer() (Karte bis 16, Stehen`);
console.log('ab 17, nie verdoppeln/teilen/versichern) — muss deutlich niedriger liegen als die');
console.log('Grundstrategie.\n');

const GEGENPROBE_UMFANG = 200000;
function mimicDealerStrategie(hand) {
	return mimicDealer(hand);
}
const gegenprobe = spieleLauf({
	seed: SAAT + 900000,
	anzahl: GEGENPROBE_UMFANG,
	stake: EINSATZ,
	strategie: mimicDealerStrategie,
	fortschritt: false,
});
berichteLauf(gegenprobe, 'Gegenprobe (mimicDealer, ' + GEGENPROBE_UMFANG.toLocaleString('de-DE') + ' Hände):');

/* ===================================================== Der eigentliche Lauf */

if (ANZAHL < MINDESTUMFANG) {
	console.log(`\nACHTUNG: --hands=${ANZAHL} liegt UNTER DEM GEFORDERTEN UMFANG von`
		+ ` ${MINDESTUMFANG.toLocaleString('de-DE')} Händen aus CONCEPT.md C.5.4. Dieser Lauf ist eine`
		+ ' Kurzprobe, kein abschließender Nachweis.');
}

console.log(`\nHauptlauf: ${ANZAHL.toLocaleString('de-DE')} Hände, Saat ${SAAT}, Grundstrategie (decide())`);
const hauptlauf = spieleLauf({
	seed: SAAT,
	anzahl: ANZAHL,
	stake: EINSATZ,
	strategie: (hand, upcard, legalActions) => decide(hand, upcard, { legalActions }),
	fortschritt: ANZAHL >= 100000,
});
berichteLauf(hauptlauf, `Hauptlauf (Grundstrategie, ${ANZAHL.toLocaleString('de-DE')} Hände):`);

/* ================================================== Bewertung, Fenster === */

const ZIELWERT_PROZENT = 99.6;
const KONZEPT_FENSTER_PUNKTE = 0.3;
const gemesseneAbweichungPunkte = hauptlauf.quoteJeGrundeinsatz * 100 - ZIELWERT_PROZENT;
const seJePunkt = hauptlauf.standardfehlerQuote * 100;
const abweichungInSigma = seJePunkt > 0 ? gemesseneAbweichungPunkte / seJePunkt : 0;
const fensterInSigma = seJePunkt > 0 ? KONZEPT_FENSTER_PUNKTE / seJePunkt : Infinity;

console.log('\n--- Bewertung ---\n');
console.log(`Zielwert (CONCEPT.md Anhang G)      ${de(ZIELWERT_PROZENT, 1)} %`);
console.log(`Konzept-Fenster (feste Schranke)    ± ${de(KONZEPT_FENSTER_PUNKTE, 1)} Prozentpunkte`);
console.log(`Gemessene Abweichung vom Zielwert   ${gemesseneAbweichungPunkte >= 0 ? '+' : ''}${de(gemesseneAbweichungPunkte, 4)} Prozentpunkte`
	+ ` (${de(abweichungInSigma, 2)} σ der empirischen Streuung dieses Laufs)`);
console.log(`Empirischer Standardfehler (SE)     ${de(seJePunkt, 4)} Prozentpunkte`);
console.log(`Fensterbreite in Vielfachen von SE  ${Number.isFinite(fensterInSigma) ? de(fensterInSigma, 1) + ' σ' : '∞ (keine Streuung messbar)'}`);
if (Number.isFinite(fensterInSigma) && fensterInSigma < 3) {
	const empfohleneHalbbreite = SIGMA_FUER_KLEINE_LAEUFE * seJePunkt;
	console.log(`\nHINWEIS: bei ${ANZAHL.toLocaleString('de-DE')} Händen ist das feste Konzept-Fenster von`
		+ ` ±${de(KONZEPT_FENSTER_PUNKTE, 1)} Punkten nur ${de(fensterInSigma, 1)} σ breit — für DIESEN`
		+ ' Stichprobenumfang ist ein Fehlalarm durch reine Streuung nicht auszuschließen. Ein zu diesem'
		+ ` Umfang PASSENDES Fenster wäre ± ${de(empfohleneHalbbreite, 2)} Punkte`
		+ ` (${SIGMA_FUER_KLEINE_LAEUFE} × der empirischen Streuung dieses Laufs). Das Konzept-Fenster ist`
		+ ' trotzdem die geprüfte Schranke — siehe Kopfkommentar, Abschnitt "WIE DIE TOLERANZ ZUSTANDE KOMMT".');
} else if (Number.isFinite(fensterInSigma)) {
	console.log(`\nDas Konzept-Fenster ist bei diesem Umfang rund ${de(fensterInSigma, 1)} × so breit wie die`
		+ ' empirische Streuung — ein Fehlalarm durch reine Streuung ist bei diesem Umfang praktisch'
		+ ' ausgeschlossen.');
}

const quoteInToleranz = Math.abs(gemesseneAbweichungPunkte) <= KONZEPT_FENSTER_PUNKTE;

const gegenprobenAbstandPunkte = hauptlauf.quoteJeGrundeinsatz * 100 - gegenprobe.quoteJeGrundeinsatz * 100;
const gegenprobeDeutlichNiedriger = gegenprobenAbstandPunkte >= GEGENPROBE_MINDESTABSTAND_PUNKTE;
console.log(`\nGegenprobe: mimicDealer liegt ${de(gegenprobenAbstandPunkte, 2)} Prozentpunkte UNTER der`
	+ ` Grundstrategie (verlangt: mindestens ${GEGENPROBE_MINDESTABSTAND_PUNKTE} Punkte Abstand)`
	+ ` → ${gegenprobeDeutlichNiedriger ? 'bestanden' : 'NICHT bestanden'}`);
if (!gegenprobeDeutlichNiedriger) {
	console.error('\nWARNUNG: die Gegenprobe ist NICHT deutlich niedriger als die Grundstrategie.'
		+ ' Das ist entweder ein Zeichen, dass die Grundstrategie nicht angeschlossen ist, oder dass'
		+ ' die Verrechnung Verdoppeln/Teilen ignoriert (siehe Kopfkommentar, Abschnitt "WAS PASSIERT,'
		+ ' WENN DER LAUF DURCHFÄLLT").');
}

const bestanden = quoteInToleranz && hauptlauf.bilanzStimmt && gegenprobe.bilanzStimmt && gegenprobeDeutlichNiedriger;

console.log(`\nHauptlauf in Toleranz (±${de(KONZEPT_FENSTER_PUNKTE, 1)} Punkte)  ${quoteInToleranz ? 'JA' : 'NEIN'}`);
console.log(`Bilanz Hauptlauf stimmt              ${hauptlauf.bilanzStimmt ? 'JA' : 'NEIN'}`);
console.log(`Bilanz Gegenprobe stimmt             ${gegenprobe.bilanzStimmt ? 'JA' : 'NEIN'}`);

console.log(`\nERGEBNIS: ${bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Rückgabewert ${bestanden ? 0 : 1}).`);
if (!bestanden) {
	console.log('Nachbessern in der im Kopfkommentar dieser Datei genannten Reihenfolge — niemals den'
		+ ' Zufallsgenerator verbiegen, niemals ein Ergebnis nachträglich verschieben.');
}

process.exit(bestanden ? 0 : 1);
