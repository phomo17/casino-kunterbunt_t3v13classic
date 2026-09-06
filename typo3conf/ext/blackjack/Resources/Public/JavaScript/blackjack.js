/**
 * Blackjack – das Einstiegsmodul
 * ===============================
 *
 * Verdrahtet genau einen Tisch. Eingebunden über
 * <f:asset.module identifier="@phomo17/blackjack/blackjack.js" /> in
 * Resources/Private/ContentElements/Table.html.
 *
 * REINE VERDRAHTUNG. Diese Datei sucht Elemente, liest Texte aus
 * data-Attributen und reicht Rückrufe herein. Sie rechnet nichts, entscheidet
 * nichts und bucht nichts — das liegt in round-table-blackjack.js (dokument-
 * und importfrei), damit ein Nachweis mit dem echten Ablauf rechnet statt mit
 * einer Nachbildung. Prüfung V-8/V-9 (verify-view.mjs, Umsetzungsstück C5d)
 * hält das fest: kein settle(, kein sweep(, kein payout(, kein .lock()/
 * .unlock() in dieser Datei.
 *
 * DIE BAUREIHENFOLGE ist wörtlich die aus casino_startpage/README.md,
 * Abschnitt „So verdrahtet muster-tisch.js die Bausteine", um die Stücke
 * erweitert, die ein echtes Spiel gegenüber dem Mustertisch mehr hat:
 *
 *   1  Geld          bank    = openTableBank(key)
 *   2  Setzfläche    bets    = new BetTable({ fields: buildFields(rules), roundMax: roundMax(rules) })
 *   3  Verlauf       history = connectHistory(historyEl, { texts: { empty } })
 *   4  Ansicht       felt    = connectFelt(feltRoot, bets, { … })
 *   5  Bedienleiste  controls = connectControls(root, { bank, bets, felt, history, onGo })
 *   6  Das Bild      view    = connectView(root, { texts, cardTexts, announce })
 *   7  Schlitten     shoe    = new Shoe({ rules, random: drawUint32 })
 *   8  Rundenlogik   game    = new BlackjackRound({ rules, shoe })
 *   9  Zustandswerk  round   = new TableRound()
 *  10  Die Klammer   table   = new BlackjackTable({ round, game, shoe, bets, bank, rules, … })
 *
 * Schritt 5 braucht onGo schon (connectControls() verdrahtet den Klick
 * selbst, diese Datei fügt keinen zweiten Zuhörer hinzu) und meldet den
 * pagehide-Weg an, der felt.destroy() und bank.close() ruft — ein Tisch, der
 * connectControls() benutzt, ruft bank.close() NICHT selbst.
 *
 * WOHER DIE DEUTSCHEN SÄTZE KOMMEN
 * ---------------------------------
 * Aus den data-text-*-Attributen von Table/Blackjack/Status.html, also aus
 * der XLIFF-Datei. In dieser Datei steht kein deutscher Anzeigetext.
 *
 * ZWEI LIVE-BEREICHE, JE EIN EIGENTÜMER FÜR DIE ENTSCHEIDUNG "WAS WIRD GESAGT"
 * ------------------------------------------------------------------------------
 * [data-ck-table-status] (geteilt, Site Package) gehört den Chips
 * (table-felt.js) und der Bedienleiste (table-controls.js) — BEIDE
 * entscheiden dort eigenständig, was angesagt wird, und beide schreiben
 * folglich hinein. Diese Datei selbst trifft diese Entscheidung nirgends:
 * die einzige Stelle, an der sie in dieses Element schreibt, ist der
 * announce-Rückruf, den connectFelt() vertraglich verlangt (Abschnitt „Die
 * Baureihenfolge", Schritt 4) — sie reicht dort nur weiter, was table-felt.js
 * ihr übergibt, ohne selbst zu entscheiden oder umzuformulieren. Behebungslauf
 * 2026-09-06 (AUDITREPORT-2026-09-06.md, Befund L-01): eine frühere Fassung
 * dieses Kommentars behauptete, diese Datei schreibe dort NICHTS hinein — das
 * traf auf den Rückruf nie zu und wurde hier richtiggestellt, statt den
 * Rückruf zu entfernen (er ist Teil des Vertrags von connectFelt(), gemeinsam
 * mit Roulette und dem Mustertisch).
 *
 * Der Rundenausgang hat seinen eigenen Bereich [data-bj-status]
 * (Table/Blackjack/Status.html); view-blackjack.js sagt dort
 * 'versicherung'/'spieler'/'geber' an, diese Datei sagt dort den
 * Rundenausgang (onResult) und die drei Absagen an, die kein Zustandswechsel
 * sind (gesperrt, kein Geld, geschlossen).
 *
 * DER MISCHZEITPUNKT UND DIE GELDBEWEGUNG liegen vollständig in
 * round-table-blackjack.js — diese Datei reicht nur die Bausteine herein und
 * liest deren Rückgabewerte, um anzusagen und den Fokus zu führen.
 */

import { drawUint32, isAvailable } from '@phomo17/blackjack/rng.js';
import * as rules from '@phomo17/blackjack/rules-blackjack.js';
import { buildFields, roundMax } from '@phomo17/blackjack/bets-blackjack.js';
import { Shoe } from '@phomo17/blackjack/shoe.js';
import { BlackjackRound } from '@phomo17/blackjack/round-blackjack.js';
import { BlackjackTable } from '@phomo17/blackjack/round-table-blackjack.js';
import { connectView } from '@phomo17/blackjack/view-blackjack.js';
import { connectSound } from '@phomo17/blackjack/sound-blackjack.js';
import { openTableBank } from '@phomo17/casino-startpage/table-buyin.js';
import { BetTable } from '@phomo17/casino-startpage/table-bets.js';
import { CHIPS, CHIP_VALUES } from '@phomo17/casino-startpage/table-chips.js';
import { connectFelt } from '@phomo17/casino-startpage/table-felt.js';
import { connectControls } from '@phomo17/casino-startpage/table-controls.js';
import { connectHistory } from '@phomo17/casino-startpage/table-history.js';
import { credit } from '@phomo17/casino-startpage/credit.js';
import { TableRound } from '@phomo17/casino-startpage/table-round.js';

/** Dieselben 700 ms wie in credit-display.js, table-felt.js und table-controls.js. */
const ANNOUNCE_MS = 700;

/** Die gewinnenden Stapel bleiben so lange stehen, bevor abgeräumt wird (round-table-blackjack.js, _finish()). */
const SETTLE_DELAY_MS = 1000;

/** Setzt {0}, {1} … in einer Vorlage ein. Fehlt die Vorlage, wird nichts eingesetzt. */
function fuelle(vorlage, werte) {
	if (typeof vorlage !== 'string' || vorlage === '') {
		return '';
	}
	return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
}

/**
 * Ob „Bewegung reduzieren" aktiv ist — dieselbe plaine Abfrage wie in
 * roulette.js, weil BlackjackTable eine feste Zahl (settleDelayMs) erwartet,
 * keine Funktion, die je Runde neu gefragt wird.
 * @returns {boolean}
 */
function reducedMotionActive() {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Bereits verdrahtete Tisch-Wurzeln, damit ein zweiter boot()-Lauf nichts doppelt anmeldet. */
const bound = new WeakSet();

/**
 * Tisch-Schlüssel, für die auf DIESER Seite bereits erfolgreich verdrahtet
 * wurde. Zwei Blackjack-Inhaltselemente auf derselben Seite tragen dasselbe
 * data-ck-table-key="blackjack" fest im Markup; openTableBank() lässt
 * denselben Schlüssel nicht zweimal offen. Ohne diese Prüfung wirft erst
 * openTableBank() mitten in bindTable(), und der zweite Tisch bliebe ein
 * stummer, aber bedienbar aussehender Tisch stehen.
 * @type {Set<string>}
 */
const gebundeneSchluessel = new Set();

/**
 * Verdrahtet genau einen Tisch.
 *
 * @param {Element} root das [data-ck-table]
 * @returns {void}
 */
function bindTable(root) {
	const key = root.getAttribute('data-ck-table-key');
	if (typeof key !== 'string' || key === '') {
		console.error('[blackjack] blackjack.js: [data-ck-table] ohne data-ck-table-key gefunden.');
		return;
	}

	const feltRoot = root.querySelector('[data-bj-felt]');
	if (feltRoot === null) {
		console.error('[blackjack] blackjack.js: [data-bj-felt] fehlt im Markup — Tisch bleibt unverdrahtet.');
		return;
	}

	const feltStatusEl = root.querySelector('[data-ck-table-status]');
	const historyEl = root.querySelector('[data-ck-table-history]');
	const hintEl = root.querySelector('[data-bj-hint]');
	const goButton = root.querySelector('[data-ck-table-go]');
	const emptyHintText = root.querySelector('[data-ck-table-history-empty]')?.textContent ?? '';
	// Die zwei eigenen data-text-…-Attribute am Setzkreis-Knopf (felt.box.name/
	// felt.box.name.empty, Felt.html) — NICHT aus dem geteilten
	// Table/Status.html, dessen Satzbau die Auszahlung nennt, die es an
	// diesem Tisch in dieser Form nicht gibt (siehe Kopfkommentar von
	// bets-blackjack.js).
	const boxButton = feltRoot.querySelector('[data-ck-field="box"]');

	// Der eigene Ansagebereich der RUNDE (Table/Blackjack/Status.html) und
	// der Kartenvorrat (Table/Blackjack/CardSprite.html), der die
	// Kartenwörter als data-Attribute mitbringt (siehe dessen Kopfkommentar).
	const roundStatusEl = root.querySelector('[data-bj-status]');
	const cardSpriteEl = root.querySelector('[data-bj-cardtexts]');

	/** Die deutschen Satzbauten der Runde, aus data-bj-status. */
	const texts = {
		insurance: roundStatusEl?.dataset.textInsurance ?? '',
		player: roundStatusEl?.dataset.textPlayer ?? '',
		playerSplit: roundStatusEl?.dataset.textPlayerSplit ?? '',
		dealer: roundStatusEl?.dataset.textDealer ?? '',
		dealerShows: roundStatusEl?.dataset.textDealerShows ?? '',
		win: roundStatusEl?.dataset.textWin ?? '',
		loss: roundStatusEl?.dataset.textLoss ?? '',
		push: roundStatusEl?.dataset.textPush ?? '',
		stake: roundStatusEl?.dataset.textStake ?? '',
		blocked: roundStatusEl?.dataset.textBlocked ?? '',
		nocash: roundStatusEl?.dataset.textNocash ?? '',
		closed: roundStatusEl?.dataset.textClosed ?? '',
		norandom: roundStatusEl?.dataset.textNorandom ?? '',
		shuffled: roundStatusEl?.dataset.textShuffled ?? '',
		handTotal: roundStatusEl?.dataset.textHandTotal ?? '',
		handTotalSoft: roundStatusEl?.dataset.textHandTotalSoft ?? '',
		handStake: roundStatusEl?.dataset.textHandStake ?? '',
		handNumber: roundStatusEl?.dataset.textHandNumber ?? '',
		outcomeWin: roundStatusEl?.dataset.textOutcomeWin ?? '',
		outcomeLoss: roundStatusEl?.dataset.textOutcomeLoss ?? '',
		outcomePush: roundStatusEl?.dataset.textOutcomePush ?? '',
		outcomeBust: roundStatusEl?.dataset.textOutcomeBust ?? '',
		outcomeBlackjack: roundStatusEl?.dataset.textOutcomeBlackjack ?? '',
		dealerTotal: roundStatusEl?.dataset.textDealerTotal ?? '',
	};

	/** Die Kartenwörter, aus dem Kartenvorrat — dasselbe Objekt, das cards-blackjack.js erwartet. */
	const cardTexts = {
		name: cardSpriteEl?.dataset.textName ?? '',
		faceDown: cardSpriteEl?.dataset.textFacedown ?? '',
		suit: {
			H: cardSpriteEl?.dataset.bjSuitH ?? '',
			D: cardSpriteEl?.dataset.bjSuitD ?? '',
			S: cardSpriteEl?.dataset.bjSuitS ?? '',
			C: cardSpriteEl?.dataset.bjSuitC ?? '',
		},
		// HTML-Regel, an der die erste Fassung gescheitert ist: die Umschrift
		// eines Bindestrichs auf Binnenmajuskel greift in `dataset` nur vor
		// einem BUCHSTABEN. `data-bj-rank-j` wird deshalb zu `bjRankJ`,
		// `data-bj-rank-2` aber NICHT zu `bjRank2` — der Schlüssel hiesse
		// `dataset['bjRank-2']`. `dataset.bjRank2` war also `undefined`, und
		// `?? ''` machte daraus einen leeren Namen: 36 von 52 Karten hiessen
		// nur „Kreuz " statt „Kreuz Sieben" (Befund H-01 des Audits vom
		// 2026-09-06). getAttribute() kennt diese Regel nicht — eine
		// Schreibweise für alle dreizehn Ränge statt zwei, von denen eine
		// still leer bleibt.
		rank: Object.fromEntries(
			['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(
				(r) => [r, cardSpriteEl?.getAttribute(`data-bj-rank-${r.toLowerCase()}`) ?? ''],
			),
		),
	};

	let ansageZeitgeber = 0;
	let ersteAnsageAusstehend = true;

	/**
	 * Ansage im EIGENEN Live-Bereich der Runde [data-bj-status], 700 ms
	 * Entprellung, erste Ansage sofort — wortgleich aus roulette.js
	 * übernommen. view-blackjack.js bekommt diese Funktion hereingereicht
	 * und ist damit neben dieser Datei der einzige Aufrufer dieses Bereichs;
	 * diese Datei selbst ruft sie nur für die drei Absagen, die kein
	 * Zustandswechsel sind (gesperrt, kein Geld, geschlossen), und für den
	 * Rundenausgang (onResult unten).
	 * @returns {void}
	 */
	function announceRound(text) {
		if (!roundStatusEl || typeof text !== 'string' || text === '') {
			return;
		}
		if (ersteAnsageAusstehend) {
			ersteAnsageAusstehend = false;
			roundStatusEl.textContent = text;
			return;
		}
		if (ansageZeitgeber) {
			globalThis.clearTimeout(ansageZeitgeber);
		}
		ansageZeitgeber = globalThis.setTimeout(() => {
			ansageZeitgeber = 0;
			roundStatusEl.textContent = text;
		}, ANNOUNCE_MS);
	}

	// Die Hinweiszeile füllen — die einzige Stelle, an der diese Datei
	// selbst etwas ins Dokument schreibt, was NICHT das Spiel betrifft
	// (Prüfung V-10), und der Grund, warum die beiden Regelzahlen (Mindest-
	// und Höchsteinsatz) nicht im XLIFF stehen: sie sind Regeln und stehen
	// ausschließlich in rules-blackjack.js.
	if (hintEl) {
		hintEl.textContent = fuelle(hintEl.dataset.textStake ?? '', [rules.BET_MIN, rules.BET_MAX]);
	}

	// Ohne sichere Zufallsquelle wird an diesem Tisch nicht gespielt
	// (CONCEPT.md C.5.2).
	if (!isAvailable()) {
		goButton?.setAttribute('aria-disabled', 'true');
		announceRound(texts.norandom);
		return;
	}

	// Zwei Blackjack-Elemente auf derselben Seite tragen denselben Schlüssel
	// fest im Markup — derselbe Weg wie in roulette.js.
	if (gebundeneSchluessel.has(key)) {
		goButton?.setAttribute('aria-disabled', 'true');
		announceRound(texts.blocked);
		console.error(`[blackjack] blackjack.js: Tisch-Schlüssel "${key}" ist auf dieser Seite bereits vergeben — dieser Tisch bleibt unverdrahtet.`);
		return;
	}

	let bank = null;
	let bets = null;
	let history = null;
	let felt = null;
	let controls = null;
	let view = null;
	let sound = null;
	let shoe = null;
	let game = null;
	let round = null;
	let table = null;

	// Für sound?.onDeal(zuwachs) in repaint() (siehe dort): wie viele Karten
	// beim letzten Bild insgesamt auf dem Tisch lagen (Geber + alle Blätter).
	// onGo() setzt sie vor jedem neuen deal() auf 0 zurück — der einzige
	// Augenblick, an dem eine neue Runde beginnt und das Bild der vorigen
	// Runde noch die höhere Kartenzahl der ABGESCHLOSSENEN Runde trägt
	// (game.state bleibt bis zum nächsten begin() auf 'fertig' stehen).
	let vorherigeKartenzahl = 0;

	// Für sound?.onFlip() in repaint(): der Spielzustand des vorigen Bildes,
	// damit der Klang nur beim WECHSEL nach 'geber' kommt, nicht bei jedem
	// weiteren repaint() innerhalb desselben Zustands.
	let zustandVorRepaint = 'bereit';

	/**
	 * Stellt die Momentaufnahme zusammen und ruft view.paint(). Die EINZIGE
	 * Stelle, an der eine Momentaufnahme entsteht.
	 * @returns {void}
	 */
	function repaint() {
		const dealer = game ? game.dealer : { cards: [], total: 0, upcard: null };
		const upcardTotal = dealer.upcard ? rules.handTotal([dealer.upcard.rank]).total : 0;
		const hands = game ? game.hands : [];

		// Klang: eine Karte je tatsächlich gegebener Karte (sound?.onDeal()),
		// das Aufdecken der Lochkarte beim Wechsel nach 'geber' (sound?.onFlip()),
		// und der Leerlauf, solange Spieler oder Geber etwas zu tun haben
		// (sound?.setBusy()). repaint() ist die einzige Stelle, die eine
		// vollständige Momentaufnahme sieht und deshalb weiß, wie viele Karten
		// seit dem letzten Bild dazugekommen sind.
		const aktuelleKartenzahl = dealer.cards.length + hands.reduce((summe, h) => summe + h.cards.length, 0);
		const zuwachs = aktuelleKartenzahl - vorherigeKartenzahl;
		if (zuwachs > 0) {
			sound?.onDeal(zuwachs);
		}
		vorherigeKartenzahl = aktuelleKartenzahl;
		const neuerZustand = game?.state ?? 'bereit';
		if (neuerZustand === 'geber' && zustandVorRepaint !== 'geber') {
			sound?.onFlip();
		}
		sound?.setBusy(neuerZustand !== 'bereit' && neuerZustand !== 'fertig');
		zustandVorRepaint = neuerZustand;
		// Das aktive Blatt: dieselbe Herleitung wie
		// round-table-blackjack.js#_aktiverEinsatz() — das erste Blatt, das
		// noch nicht überkauft und noch nicht ausgewertet ist. Prüfung T-6/
		// T-7 (verify-table.mjs) weisen diese Annahme am echten Spiel nach;
		// fällt eine der beiden durch, war die Annahme falsch (siehe dort).
		let activeIndex = -1;
		if (game && game.state === 'spieler') {
			for (let i = 0; i < hands.length; i += 1) {
				const blatt = hands[i];
				if (blatt.outcome === null && !blatt.busted && blatt.total <= 21) {
					activeIndex = i;
					break;
				}
			}
		}
		view?.paint({
			state: game?.state ?? 'bereit',
			roundState: round?.state ?? 'setzen',
			hands,
			dealer,
			upcardTotal,
			baseStake: table?.baseStake ?? 0,
			insurance: { staked: table?.insuranceStaked ?? 0, returned: game?.report?.insurance?.returned ?? 0 },
			legal: table?.legalActions() ?? [],
			insuranceCost: table?.insuranceCost ?? 0,
			stakeLegal: table?.stakeIsLegal ?? false,
			total: credit.balance + bank.amount + bets.total,
			activeIndex,
		});
	}

	/**
	 * Bewusste Fokusführung: sobald die Runde in 'spieler' oder
	 * 'versicherung' wechselt, wandert der Fokus auf den ersten nicht
	 * gesperrten Knopf der jeweiligen Gruppe — derselbe Griff wie beim
	 * Öffnen eines Dialogs. Bei jedem Rückfall (auch 'geber'/'fertig'/
	 * 'bereit') wandert der Fokus zurück auf den Auslöser, damit die nächste
	 * Runde ohne Tabulator-Wanderung beginnen kann.
	 * @returns {void}
	 */
	function fokusAufErsteHandlung() {
		const zustand = game?.state;
		if (zustand === 'versicherung') {
			root.querySelector('[data-bj-insure="take"]')?.focus();
			return;
		}
		if (zustand === 'spieler') {
			for (const action of table?.legalActions() ?? []) {
				const button = root.querySelector(`[data-bj-act="${action}"]`);
				if (button) {
					button.focus();
					return;
				}
			}
			return;
		}
		goButton?.focus();
	}

	/** An connectControls() gereicht; connectControls() wired den Klick selbst. @returns {void} */
	async function onGo() {
		// Klang: der Zähler aus repaint() muss vor JEDEM neuen deal() auf 0
		// zurück — genau hier beginnt eine neue Runde, und das Bild der
		// vorigen Runde trägt bis dahin noch deren (höhere) Kartenzahl, weil
		// game.state bis zum nächsten begin() auf 'fertig' stehen bleibt.
		vorherigeKartenzahl = 0;
		const antwort = await table.deal();
		if (!antwort.ok) {
			announceRound(antwort.reason === 'stake'
				? fuelle(texts.stake, [rules.BET_MIN, rules.BET_MAX])
				: texts.blocked);
			return;
		}
		repaint();
		fokusAufErsteHandlung();
	}

	/**
	 * Rückruf an BlackjackTable: eine Runde ist ausgewertet und ausgezahlt.
	 * Trägt EINE Marke in den Verlaufsstreifen ein und sagt EINEN Satz an.
	 * Der Rundenausgang braucht die ausgezahlte Summe und den Buy-in danach
	 * — beides kennt view-blackjack.js nicht (siehe dessen Dateikopf), daher
	 * liegt diese Ansage hier und nicht im Zustandswechsel von paint().
	 * @param {{report: Object, credited: number, staked: number}} ergebnis
	 * @returns {void}
	 */
	function onResult({ report, credited, staked }) {
		const net = report.returned - report.staked;
		const ton = net > 0 ? 'win' : (net < 0 ? 'loss' : 'neutral');
		const ausgangswort = ton === 'win' ? texts.outcomeWin : (ton === 'loss' ? texts.outcomeLoss : texts.outcomePush);
		history?.push({ text: ausgangswort, title: fuelle(texts.dealerTotal, [report.dealer.total]), tone: ton });

		const satzbau = ton === 'win' ? texts.win : (ton === 'loss' ? texts.loss : texts.push);
		announceRound(fuelle(satzbau, [ausgangswort, report.dealer.total, credited, staked, bank.amount]));

		// Klang: das finanzielle Gesamtergebnis der Runde (Gewinn/Verlust/
		// Patt, aus net — sound-blackjack.js#onResult()), dazu für JEDES
		// Blatt mit einem der beiden Sonderausgänge, die aus net allein nicht
		// hervorgehen, der eigene Klang (sound-blackjack.js#onHand() —
		// 'blackjack' und 'bust' sind dieselben Zeichenketten, die
		// round-blackjack.js selbst für hand.outcome benutzt).
		sound?.onResult({ net });
		for (const blatt of report.hands) {
			if (blatt.outcome === 'blackjack' || blatt.outcome === 'bust') {
				sound?.onHand({ outcome: blatt.outcome });
			}
		}
	}

	/**
	 * Rückruf an BlackjackTable: vorzeitig gemischt — eine Ereignismarke,
	 * OHNE Begründung (CONCEPT.md C.7.3: „genau wie am echten Tisch").
	 * @returns {void}
	 */
	function onReshuffle() {
		history?.push({ text: texts.shuffled, tone: 'event' });
		sound?.onShuffle();
	}

	/**
	 * Rückruf an BlackjackTable: die Bank war bei der Auszahlung bereits
	 * geschlossen (pagehide während die Hand lief). Sagt das ausdrücklich
	 * an, statt die gewöhnliche Gewinn-/Verlustansage aus onResult() zu
	 * benutzen — ein verschwundener Gewinn darf nicht wie eine ehrliche
	 * Verlustrunde klingen.
	 * @returns {void}
	 */
	function onAbort() {
		goButton?.setAttribute('aria-disabled', 'true');
		announceRound(texts.closed);
	}

	/**
	 * Hängt an jeden [data-bj-act] und jeden [data-bj-insure] einen
	 * Klick-Zuhörer. Jeder prüft zuerst aria-disabled; ist es gesetzt,
	 * geschieht nichts außer einer Ansage.
	 * @returns {void}
	 */
	function bindActions() {
		for (const button of root.querySelectorAll('[data-bj-act]')) {
			button.addEventListener('click', async () => {
				if (button.getAttribute('aria-disabled') === 'true') {
					announceRound(texts.blocked);
					return;
				}
				const antwort = await table.act(button.getAttribute('data-bj-act'));
				if (!antwort.ok && antwort.reason === 'nocash') {
					announceRound(texts.nocash);
				}
				repaint();
				fokusAufErsteHandlung();
			});
		}
		for (const button of root.querySelectorAll('[data-bj-insure]')) {
			button.addEventListener('click', async () => {
				if (button.getAttribute('aria-disabled') === 'true') {
					announceRound(texts.blocked);
					return;
				}
				const art = button.getAttribute('data-bj-insure');
				const antwort = art === 'take' ? await table.takeInsurance() : await table.declineInsurance();
				if (!antwort.ok && antwort.reason === 'nocash') {
					announceRound(texts.nocash);
				}
				repaint();
				fokusAufErsteHandlung();
			});
		}
	}

	try {
		bank = openTableBank(key);
		bets = new BetTable({ fields: buildFields(rules), roundMax: roundMax(rules) });

		if (historyEl) {
			history = connectHistory(historyEl, { texts: { empty: emptyHintText } });
		}

		felt = connectFelt(feltRoot, bets, {
			selectedChip: () => controls?.selectedChip() ?? 1,
			onPlace: async (fieldId, value) => {
				const antwort = await bank.placeChip(value);
				if (antwort.ok) {
					sound?.onChipPlace();
					// Ohne dieses repaint() erführe das Bild nie, dass sich der
					// Einsatz geändert hat: view-blackjack.js gibt [data-ck-table-go]
					// genau dann frei, wenn die Runde noch Einsätze nimmt UND der
					// Einsatz regelgerecht ist (gerade, zwischen BET_MIN und
					// BET_MAX). table-felt.js hat bets.place() bereits vor diesem
					// Rückruf gebucht, bets.total ist hier also schon der neue Wert.
					repaint();
				}
				return antwort;
			},
			onTakeBack: async (fieldId, value) => {
				const antwort = await bank.returnChip(value);
				sound?.onChipRemove();
				// Gegenrichtung zu onPlace(): bets.takeBack() ist vor diesem
				// Rückruf gebucht, der Knopf muss wieder sperren, sobald der
				// Einsatz die Regel verlässt.
				repaint();
				return antwort;
			},
			announce: (text) => {
				if (feltStatusEl) {
					feltStatusEl.textContent = text;
				}
			},
			symbolIdFor: (value) => CHIPS[value]?.symbolId ?? '',
			texts: {
				placed: feltStatusEl?.dataset.textPlaced ?? '',
				removed: feltStatusEl?.dataset.textRemoved ?? '',
				fieldmax: feltStatusEl?.dataset.textFieldmax ?? '',
				roundmax: feltStatusEl?.dataset.textRoundmax ?? '',
				locked: feltStatusEl?.dataset.textLocked ?? '',
				nochip: feltStatusEl?.dataset.textNochip ?? '',
				fieldname: boxButton?.dataset.textFieldname ?? '',
				fieldnameEmpty: boxButton?.dataset.textFieldnameEmpty ?? '',
			},
		});

		// 5  Bedienleiste. onGo wird hier schon übergeben; connectControls()
		//    verdrahtet den Klick selbst, diese Datei fügt keinen zweiten
		//    Zuhörer hinzu.
		controls = connectControls(root, { bank, bets, felt, history, onGo });

		// 6  Das Bild. EINZIGER Schreiber im Dokument, was das Spiel betrifft.
		view = connectView(root, { texts, cardTexts, announce: announceRound });

		// 7  Der Schlitten. Er mischt sich beim Anlegen selbst.
		shoe = new Shoe({ rules, random: drawUint32 });

		// 8  Die Rundenlogik des Spiels.
		game = new BlackjackRound({ rules, shoe });

		// 9  Das Zustandswerk des Tisches — OHNE eigenes onEnter:
		//    BlackjackTable biegt es in seinem eigenen Konstruktor auf sich
		//    selbst um (dieselbe Bauart wie beim Roulette-Tisch,
		//    DECISIONS.md C3d).
		round = new TableRound();

		// 10 Die Klammer.
		table = new BlackjackTable({
			round, game, shoe, bets, bank, rules,
			shouldReshuffle: BlackjackRound.shouldReshuffle,
			chipValues: CHIP_VALUES,
			wait: (ms) => new Promise((r) => globalThis.setTimeout(r, ms)),
			settleDelayMs: reducedMotionActive() ? 0 : SETTLE_DELAY_MS,
			onRound: repaint,
			onResult,
			onReshuffle,
			onAbort,
			onRefresh: () => { felt?.refresh(); controls?.refresh(); },
		});

		// 11 Klang. Zuletzt, wie am Roulette-Tisch: die Rückrufe der übrigen
		//    Bausteine verweisen zwar schon auf `sound`, lesen die Variable
		//    aber erst zur Laufzeit eines Klicks — bis dahin ist dieser
		//    Schritt längst durchlaufen.
		sound = connectSound(root, { bank });

		bindActions();
		repaint();
		gebundeneSchluessel.add(key);
	} catch (error) {
		sound?.destroy();
		view?.destroy();
		controls?.destroy();
		felt?.destroy();
		history?.destroy();
		if (bank) {
			void bank.close();
		}
		goButton?.setAttribute('aria-disabled', 'true');
		announceRound(texts.blocked);
		console.error('[blackjack] blackjack.js: Der Tisch konnte nicht verdrahtet werden.', error);
	}
}

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses
 * Modul kann deshalb schon laufen, bevor der Körper der Seite fertig
 * geparst ist.
 * @returns {void}
 */
function boot() {
	for (const root of document.querySelectorAll('[data-ck-table]')) {
		if (bound.has(root)) {
			continue;
		}
		bound.add(root);
		bindTable(root);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}
