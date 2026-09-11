/**
 * Blackjack – Nachweis der Kartenbilder (Umsetzungsstück C5a)
 * =============================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Startet keinen Browser, ändert keine
 * Datei, braucht keine laufende TYPO3-Instanz.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-cards.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.6, Umsetzungsstück C5a)
 * -------------------------------------------------------------------
 *   K-1  Der Kartenvorrat ist vollständig und richtig gebaut
 *   K-2  cards-blackjack.js ist import- und dokumentfrei
 *   K-3  Jeder Rang und jede Farbe aus dem Regelwerk ist zeichenbar
 *   K-4  Alle 52 Karten erzeugen gültiges Markup
 *   K-5  Die verdeckte Karte verrät nichts
 *   K-6  Vier verschiedene Silhouetten
 *   K-7  Text wird maskiert
 *   K-8  Keine eigene Farbe, alle Tokens vorhanden
 *   K-9  Die Kontraste stimmen
 *   K-10 Jede erwartete XLIFF-Kennung ist da
 *   K-11 Kein Anzeigetext im Modul
 *   K-12 Keine Regelzahl im Bild
 *   K-13 Keine fremde Kartenschrift, kein fremdes Kartenzeichen
 *
 * WARUM K-5 AN aria-label UND href PRÜFT, NICHT AN EINER BLINDEN
 * ZEICHENKETTENSUCHE
 * -------------------------------------------------------------------
 * Ein blinder Suchlauf nach dem Rangzeichen als Teilzeichenkette scheitert an
 * echten Kollisionen: die Ziffern aus CARD_WIDTH/CARD_HEIGHT ("60 84") würden
 * bei den Rängen 6, 8, 4 und 10 fälschlich als Fund gelten, und der
 * Großbuchstabe „K" aus „verdeckte Karte" würde beim Rang König denselben
 * Fehlalarm auslösen. Stattdessen prüft K-5 STRUKTURELL, wie das verdeckte
 * Markup laut cardMarkup() tatsächlich aufgebaut ist: es gibt kein <text>
 * (das Rangzeichen wird ausschließlich in <text> gesetzt), jedes href zeigt
 * ausschließlich auf #bj-card-back, und aria-label ist Zeichen für Zeichen
 * die maskierte Fassung von texts.faceDown — nicht mehr und nicht weniger.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');

let fehler = 0;

function check(ok, text, ...zeilen) {
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
	return path.relative(EXT_ROOT, datei);
}

/** Alle Dateien unterhalb eines Verzeichnisses, rekursiv, sortiert. */
function alleDateien(wurzel) {
	const gefunden = [];
	const offen = [wurzel];
	while (offen.length > 0) {
		const verzeichnis = offen.pop();
		for (const name of readdirSync(verzeichnis).sort()) {
			const voll = path.join(verzeichnis, name);
			if (statSync(voll).isDirectory()) {
				offen.push(voll);
			} else {
				gefunden.push(voll);
			}
		}
	}
	return gefunden.sort();
}

/** Entfernt Block- und Zeilenkommentare (CSS/JS) sowie Fluid-Kommentare (HTML). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/** Entfernt die String-Argumente von console.error/console.warn/console.log. */
function ohneKonsolenmeldungen(inhalt) {
	return inhalt.replace(/console\.(?:error|warn|log)\([\s\S]*?\);/g, 'console.MELDUNG();');
}

/** Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren (wie in verify-cabinet.mjs). */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

console.log('\nBlackjack – Nachweis der Kartenbilder (Umsetzungsstück C5a)');
console.log('=============================================================\n');

const CARDSPRITE_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/CardSprite.html');
const CARDS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/cards-blackjack.js');
const CARDS_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/cards.css');
const RULES_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rules-blackjack.js');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const TOKENS_PFAD = path.join(SITE, 'Resources/Public/Css/tokens.css');

const cardSpriteQuelltext = lies(CARDSPRITE_PFAD);
const cardsJsQuelltext = lies(CARDS_JS_PFAD);
const cardsCssQuelltext = lies(CARDS_CSS_PFAD);
const localesQuelltext = lies(LOCALLANG_PFAD);
const tokensQuelltext = lies(TOKENS_PFAD);

/** Die neun erwarteten Symbol-Kennungen aus dem Kartenvorrat. */
const ERWARTETE_SYMBOLE = [
	'bj-card-face', 'bj-card-back',
	'bj-suit-heart', 'bj-suit-diamond', 'bj-suit-spade', 'bj-suit-club',
	'bj-court-jack', 'bj-court-queen', 'bj-court-king',
];

/* ================================================================= K-1 */

console.log('K-1  Der Kartenvorrat ist vollständig und richtig gebaut');
{
	const ohneKomm = ohneKommentare(cardSpriteQuelltext);

	const spriteSvgs = [...ohneKomm.matchAll(/<svg\b[^>]*class="bj-cardsprite"[^>]*>/g)];
	check(spriteSvgs.length === 1, `genau ein <svg class="bj-cardsprite"> (gefunden: ${spriteSvgs.length})`);
	if (spriteSvgs.length === 1) {
		const tag = spriteSvgs[0][0];
		check(tag.includes('aria-hidden="true"'), 'trägt aria-hidden="true"');
		check(tag.includes('focusable="false"'), 'trägt focusable="false"');
	}

	const symbolTags = [...ohneKomm.matchAll(/<symbol\b[^>]*>/g)].map((m) => m[0]);
	const gefundeneIds = symbolTags
		.map((tag) => tag.match(/\bid="([^"]+)"/)?.[1])
		.filter(Boolean);
	check(gefundeneIds.length === ERWARTETE_SYMBOLE.length
		&& ERWARTETE_SYMBOLE.every((id) => gefundeneIds.includes(id))
		&& gefundeneIds.every((id) => ERWARTETE_SYMBOLE.includes(id)),
		`genau die ${ERWARTETE_SYMBOLE.length} erwarteten <symbol id="…"> (gefunden: ${gefundeneIds.join(', ')})`,
		`erwartet: ${ERWARTETE_SYMBOLE.join(', ')}`);

	const ohneViewBox = symbolTags.filter((tag) => !/\bviewBox="[^"]+"/.test(tag));
	check(ohneViewBox.length === 0, 'jedes <symbol> trägt viewBox', ...ohneViewBox);

	check(!/<title\b/i.test(ohneKomm), 'kein <title> im Kartenvorrat');
	check(!/<image\b/i.test(ohneKomm), 'kein <image> im Kartenvorrat');
}

/* ================================================================= K-2 */

console.log('\nK-2  cards-blackjack.js ist import- und dokumentfrei');
{
	const ohneKomm = ohneKommentare(cardsJsQuelltext);
	check(!/\bimport\s/.test(ohneKomm), 'kein import');
	check(!/\bdocument\b/.test(ohneKomm), 'kein document');
	check(!/\bwindow\b/.test(ohneKomm), 'kein window');
	check(!/\blocalStorage\b/.test(ohneKomm), 'kein localStorage');
	check(!/Math\.random/.test(ohneKomm), 'kein Math.random');
}

/* ================================================================= K-3 */

console.log('\nK-3  Jeder Rang und jede Farbe aus dem Regelwerk ist zeichenbar');
const regeln = await import(pathToFileURL(RULES_PFAD).href);
const karten = await import(pathToFileURL(CARDS_JS_PFAD).href);
{
	const { RANKS, SUITS } = regeln;
	const { RANK_PRINT, SUIT_SYMBOL, SUIT_TONE } = karten;

	const fehlendeRaenge = RANKS.filter((r) => !(r in RANK_PRINT));
	check(fehlendeRaenge.length === 0, 'jeder Rang aus RANKS hat ein RANK_PRINT', ...fehlendeRaenge);

	const fehlendeFarbenSymbol = SUITS.filter((s) => !(s in SUIT_SYMBOL));
	check(fehlendeFarbenSymbol.length === 0, 'jede Farbe aus SUITS hat ein SUIT_SYMBOL', ...fehlendeFarbenSymbol);

	const fehlendeFarbenTon = SUITS.filter((s) => !(s in SUIT_TONE));
	check(fehlendeFarbenTon.length === 0, 'jede Farbe aus SUITS hat ein SUIT_TONE', ...fehlendeFarbenTon);

	const rangzeichenMenge = new Set(RANKS.map((r) => RANK_PRINT[r]));
	check(rangzeichenMenge.size === RANKS.length,
		`die ${RANKS.length} Rangzeichen sind paarweise verschieden (verschiedene: ${rangzeichenMenge.size})`);

	const toene = SUITS.map((s) => SUIT_TONE[s]);
	const rot = toene.filter((t) => t === 'red').length;
	const schwarz = toene.filter((t) => t === 'black').length;
	check(rot === 2 && schwarz === 2, `die vier Töne teilen sich in genau zwei red und zwei black (gefunden: ${rot} rot, ${schwarz} schwarz)`);

	console.log('     Gegenprobe K-3-G: zwei gleiche Rangzeichen müssen auffallen');
	const verfaelscht = { ...RANK_PRINT, Q: RANK_PRINT.J };
	const verfaelschteMenge = new Set(RANKS.map((r) => verfaelscht[r]));
	check(verfaelschteMenge.size === RANKS.length - 1,
		'K-3-G: die verfälschte Kopie mit zwei gleichen Rangzeichen wird erkannt');
}

/* ================================================================= K-4 */

/** Baut die texts-Struktur aus locallang.xlf für cardName()/cardMarkup(). */
function baueTexts() {
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}
	const suit = {};
	const rank = {};
	for (const s of regeln.SUITS) {
		suit[s] = einheiten.get(`card.suit.${s}`) ?? '';
	}
	for (const r of regeln.RANKS) {
		rank[r] = einheiten.get(`card.rank.${r}`) ?? '';
	}
	return {
		name: einheiten.get('card.name') ?? '{0} {1}',
		faceDown: einheiten.get('card.facedown') ?? '',
		suit,
		rank,
	};
}

const texts = baueTexts();

console.log('\nK-4  Alle 52 Karten erzeugen gültiges Markup');
{
	const { RANKS, SUITS } = regeln;
	const { cardMarkup } = karten;
	const treffer = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			const svg = cardMarkup({ rank, suit }, { texts });
			const rollen = [...svg.matchAll(/role="img"/g)];
			if (rollen.length !== 1) {
				treffer.push(`${rank}${suit}: role="img" ${rollen.length}× statt 1×`);
			}
			const ariaLabel = svg.match(/aria-label="([^"]*)"/)?.[1] ?? '';
			if (ariaLabel === '') {
				treffer.push(`${rank}${suit}: aria-label ist leer`);
			}
			if (!ariaLabel.includes(texts.suit[suit]) || !ariaLabel.includes(texts.rank[rank])) {
				treffer.push(`${rank}${suit}: aria-label „${ariaLabel}" enthält nicht beide Wörter`);
			}
			const hrefs = [...svg.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
			const unbekannteHrefs = hrefs.filter((id) => !ERWARTETE_SYMBOLE.includes(id));
			if (unbekannteHrefs.length > 0) {
				treffer.push(`${rank}${suit}: unbekannte href-Kennung ${unbekannteHrefs.join(', ')}`);
			}
			const faceCount = [...svg.matchAll(/href="#bj-card-face"/g)].length;
			if (faceCount !== 1) {
				treffer.push(`${rank}${suit}: bj-card-face ${faceCount}× statt 1×`);
			}
			const indexCount = [...svg.matchAll(/class="bj-card__index"/g)].length;
			if (indexCount !== 2) {
				treffer.push(`${rank}${suit}: bj-card__index ${indexCount}× statt 2×`);
			}
			const pipCount = [...svg.matchAll(/class="bj-card__pip"/g)].length;
			if (pipCount !== 1) {
				treffer.push(`${rank}${suit}: bj-card__pip ${pipCount}× statt 1×`);
			}
		}
	}
	check(treffer.length === 0,
		`alle ${SUITS.length * RANKS.length} Kombinationen erzeugen gültiges Markup`,
		...treffer);
}

/* ================================================================= K-5 */

console.log('\nK-5  Die verdeckte Karte verrät nichts');
{
	const { RANKS, SUITS } = regeln;
	const { cardMarkup } = karten;

	/** Prüft strukturell: kein <text>, jedes href zeigt auf bj-card-back, aria-label = texts.faceDown. */
	function faceDownIstEhrlich(svg) {
		const befunde = [];
		if (/<text\b/.test(svg)) {
			befunde.push('enthält <text>');
		}
		const hrefs = [...svg.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
		const fremdeHrefs = hrefs.filter((id) => id !== 'bj-card-back');
		if (fremdeHrefs.length > 0) {
			befunde.push(`href zeigt auf ${fremdeHrefs.join(', ')}`);
		}
		const ariaLabel = svg.match(/aria-label="([^"]*)"/)?.[1] ?? null;
		const erwarteteAriaLabel = String(texts.faceDown ?? '')
			.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
		if (ariaLabel !== erwarteteAriaLabel) {
			befunde.push(`aria-label „${ariaLabel}" weicht vom Namen der verdeckten Karte ab`);
		}
		return befunde;
	}

	const treffer = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			const svg = cardMarkup({ rank, suit }, { faceDown: true, texts });
			for (const befund of faceDownIstEhrlich(svg)) {
				treffer.push(`${rank}${suit} (verdeckt): ${befund}`);
			}
		}
	}
	check(treffer.length === 0,
		'für alle 52 Karten verrät die verdeckte Fassung weder Rangzeichen, Farbzeichen-Kennung, Farbwort noch Rangwort',
		...treffer);

	console.log('     Gegenprobe K-5-G: eine Fassung, die das aria-label der offenen Karte auch verdeckt setzt, wird erkannt');
	const beispielkarte = { rank: 'K', suit: 'H' };
	const fehlerhafteFassung = cardMarkup(beispielkarte, { texts }); // OHNE faceDown: true — simuliert den Fehler
	const befundeGegenprobe = faceDownIstEhrlich(fehlerhafteFassung);
	check(befundeGegenprobe.length > 0,
		'K-5-G: die fehlerhafte Fassung (offenes Markup als „verdeckt" ausgegeben) wird von derselben Prüfung erkannt',
		...befundeGegenprobe);
}

/* ================================================================= K-6 */

console.log('\nK-6  Vier verschiedene Silhouetten');
{
	function symbolRumpf(id) {
		const ohneKomm = ohneKommentare(cardSpriteQuelltext);
		const start = ohneKomm.indexOf(`<symbol id="${id}"`);
		const ende = ohneKomm.indexOf('</symbol>', start);
		return ohneKomm.slice(start, ende).replace(/\s+/g, '');
	}

	const suitIds = ['bj-suit-heart', 'bj-suit-diamond', 'bj-suit-spade', 'bj-suit-club'];
	const rumpfe = Object.fromEntries(suitIds.map((id) => [id, symbolRumpf(id)]));

	const paare = [];
	for (let i = 0; i < suitIds.length; i++) {
		for (let j = i + 1; j < suitIds.length; j++) {
			paare.push([suitIds[i], suitIds[j]]);
		}
	}
	const gleiche = paare.filter(([a, b]) => rumpfe[a] === rumpfe[b]);
	check(gleiche.length === 0,
		'die vier Farbzeichen-Rümpfe sind paarweise ungleich',
		...gleiche.map(([a, b]) => `${a} === ${b}`));

	const roteIds = ['bj-suit-heart', 'bj-suit-diamond'];
	const schwarzeIds = ['bj-suit-spade', 'bj-suit-club'];
	const kreuzvergleich = [];
	for (const rot of roteIds) {
		for (const schwarz of schwarzeIds) {
			if (rumpfe[rot] === rumpfe[schwarz]) {
				kreuzvergleich.push(`${rot} === ${schwarz}`);
			}
		}
	}
	check(kreuzvergleich.length === 0,
		'jedes rote Zeichen unterscheidet sich von jedem schwarzen Zeichen',
		...kreuzvergleich);

	console.log('     Gegenprobe K-6-G: zwei künstlich gleichgemachte Rümpfe müssen auffallen');
	const kuenstlich = { ...rumpfe, [suitIds[1]]: rumpfe[suitIds[0]] };
	const gefundenGleich = kuenstlich[suitIds[0]] === kuenstlich[suitIds[1]];
	check(gefundenGleich, 'K-6-G: zwei künstlich gleichgemachte Rümpfe werden als gleich erkannt');
}

/* ================================================================= K-7 */

console.log('\nK-7  Text wird maskiert');
{
	const { cardMarkup } = karten;
	const boesesWort = 'A"><script>';
	const boeseTexts = { ...texts, suit: { ...texts.suit, H: boesesWort } };
	const svg = cardMarkup({ rank: '2', suit: 'H' }, { texts: boeseTexts });
	const ariaLabel = svg.match(/aria-label="([^"]*)"/)?.[1] ?? '';
	check(!ariaLabel.includes('"') && !ariaLabel.includes('<'),
		'cardMarkup() maskiert ein bösartiges Farbwort im aria-label',
		`aria-label: ${ariaLabel}`);

	console.log('     Gegenprobe K-7-G: eine Fassung ohne Maskierung muss auffallen');
	const unmaskiertesLabel = `${boeseTexts.suit.H} Zwei`; // wie cardName() ohne attr() bauen würde
	check(unmaskiertesLabel.includes('"') || unmaskiertesLabel.includes('<'),
		'K-7-G: die unmaskierte Fassung enthält tatsächlich " oder <');
}

/* ================================================================= K-8 */

console.log('\nK-8  Keine eigene Farbe, alle Tokens vorhanden');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const geprueft = [
		[CARDSPRITE_PFAD, cardSpriteQuelltext],
		[CARDS_CSS_PFAD, cardsCssQuelltext],
	];
	const farbTreffer = [];
	for (const [pfad, inhalt] of geprueft) {
		const ohneKomm = ohneKommentare(inhalt);
		for (const m of ohneKomm.matchAll(HEX)) {
			farbTreffer.push(`${kurz(pfad)}: ${m[0]}`);
		}
		for (const m of ohneKomm.matchAll(FUNKTION)) {
			farbTreffer.push(`${kurz(pfad)}: ${m[0]}…`);
		}
	}
	check(farbTreffer.length === 0, 'kein ausgeschriebener Farbwert in CardSprite.html oder cards.css', ...farbTreffer);

	const definiert = new Set([...tokensQuelltext.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Set();
	for (const [, inhalt] of geprueft) {
		for (const m of inhalt.matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			benutzt.add(m[1]);
		}
	}
	const unbekannt = [...benutzt].filter((name) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in tokens.css definiert (einschließlich der drei neuen Karten-Tokens)`,
		...unbekannt);
	check(definiert.has('--ck-card-back') && definiert.has('--ck-card-back-line') && definiert.has('--ck-card-edge'),
		'die drei neuen Karten-Tokens (--ck-card-back, --ck-card-back-line, --ck-card-edge) sind in tokens.css definiert');
}

/* ================================================================= K-9 */

console.log('\nK-9  Die Kontraste stimmen');
{
	function token(name) {
		const treffer = tokensQuelltext.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`));
		if (!treffer) {
			throw new Error(`Token ${name} nicht in tokens.css gefunden.`);
		}
		return treffer[1];
	}

	function hexZuRgb(hex) {
		let h = hex.slice(1);
		if (h.length === 3 || h.length === 4) {
			h = h.split('').map((c) => c + c).join('');
		}
		const num = parseInt(h.slice(0, 6), 16);
		return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
	}

	function linear(kanal) {
		const c = kanal / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}

	function relLuminanz([r, g, b]) {
		return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
	}

	function kontrast(hexA, hexB) {
		const lA = relLuminanz(hexZuRgb(hexA));
		const lB = relLuminanz(hexZuRgb(hexB));
		const hell = Math.max(lA, lB);
		const dunkel = Math.min(lA, lB);
		return (hell + 0.05) / (dunkel + 0.05);
	}

	const PAARE = [
		['--ck-print-red', '--ck-paper-100', 4.5],
		['--ck-print-ink', '--ck-paper-100', 4.5],
		['--ck-card-edge', '--ck-paper-100', 3],
		['--ck-card-back-line', '--ck-card-back', 3],
		['--ck-paper-100', '--ck-felt-green', 3],
	];
	for (const [a, b, mindest] of PAARE) {
		const verhaeltnis = kontrast(token(a), token(b));
		check(verhaeltnis >= mindest,
			`${a} auf ${b}: ${verhaeltnis.toFixed(2)} : 1 (mindestens ${mindest} : 1 verlangt)`);
	}

	console.log('     Gegenprobe K-9-G: Schwarz auf Weiß muss 21 : 1 ergeben');
	const schwarzWeiss = kontrast('#000000', '#ffffff');
	check(Math.abs(schwarzWeiss - 21) < 0.01,
		`K-9-G: #000000 auf #ffffff ergibt ${schwarzWeiss.toFixed(2)} : 1 (erwartet 21 : 1)`);
}

/* ================================================================ K-10 */

console.log('\nK-10 Jede erwartete XLIFF-Kennung ist da');
{
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}
	const erwartet = ['card.name', 'card.facedown',
		...regeln.SUITS.map((s) => `card.suit.${s}`),
		...regeln.RANKS.map((r) => `card.rank.${r}`)];
	const fehlend = erwartet.filter((id) => !einheiten.has(id) || einheiten.get(id).trim() === '');
	check(fehlend.length === 0,
		`alle ${erwartet.length} erwarteten Kennungen sind in locallang.xlf vorhanden und nicht leer`,
		...fehlend);
}

/* ================================================================ K-11 */

console.log('\nK-11 Kein Anzeigetext im Modul');
{
	// Nur echte deutsche Sätze zählen als Fund: card.name hat als <source> die
	// reine Platzhaltervorlage "{0} {1}" ohne einen einzigen Buchstaben — die
	// darf in cardName() als Rückfallwert wörtlich stehen, ohne ein Fund zu
	// sein, denn sie ist kein Anzeigetext, sondern nur ein Satzbau-Muster.
	const mehrwortigeSaetze = [...localesQuelltext.matchAll(/<source>([^<]*)<\/source>/g)]
		.map((m) => m[1])
		.filter((satz) => satz.trim().includes(' ') && /[a-zA-ZäöüÄÖÜß]/.test(satz));

	const UMLAUT = /[äöüÄÖÜß]/;
	const geprueft = ohneKonsolenmeldungen(ohneKommentare(cardsJsQuelltext));
	check(!UMLAUT.test(geprueft), 'cards-blackjack.js enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut');

	const treffer = mehrwortigeSaetze.filter((satz) => geprueft.includes(satz));
	check(treffer.length === 0, 'cards-blackjack.js enthält keinen wörtlichen Satz aus locallang.xlf', ...treffer);
}

/* ================================================================ K-12 */

console.log('\nK-12 Keine Regelzahl im Bild');
{
	const VERBOTENE_ZEICHENKETTEN = [
		'3:2', '3 zu 2', '2:1', '2 zu 1', '6 Deck', 'sechs Deck', '312',
		'75 %', '0,40', '0.40', 'S17', 'weiche 17', 'weichen 17', '+3',
		'Trennkarte bei',
	];
	const treffer = [];
	for (const [pfad, inhalt] of [[CARDSPRITE_PFAD, cardSpriteQuelltext], [CARDS_CSS_PFAD, cardsCssQuelltext]]) {
		for (const zk of VERBOTENE_ZEICHENKETTEN) {
			if (inhalt.includes(zk)) {
				treffer.push(`${kurz(pfad)}: „${zk}"`);
			}
		}
	}
	check(treffer.length === 0, 'keine der 15 verbotenen Zeichenketten in CardSprite.html oder cards.css', ...treffer);
}

/* ================================================================ K-13 */

console.log('\nK-13 Keine fremde Kartenschrift, kein fremdes Kartenzeichen');
{
	/** true, wenn ein Codepunkt im Block der Unicode-Spielkartenzeichen liegt. */
	function istKartenCodepunkt(cp) {
		return (cp >= 0x2660 && cp <= 0x2667) || (cp >= 0x1F0A0 && cp <= 0x1F0FF);
	}

	function enthaeltKartenCodepunkt(text) {
		for (const zeichen of text) {
			const cp = zeichen.codePointAt(0);
			if (istKartenCodepunkt(cp)) {
				return true;
			}
		}
		return false;
	}

	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		if (enthaeltKartenCodepunkt(lies(datei))) {
			treffer.push(kurz(datei));
		}
	}
	check(treffer.length === 0,
		'kein Unicode-Spielkartenzeichen (U+2660…U+2667, U+1F0A0…U+1F0FF) in einer ausgelieferten Datei',
		...treffer);

	console.log('     Gegenprobe K-13-G: ein per String.fromCodePoint() erzeugtes Zeichen muss auffallen');
	const erzeugtesZeichen = String.fromCodePoint(0x2660); // Pik-Ass-Zeichen, nur zur Laufzeit erzeugt
	check(enthaeltKartenCodepunkt(erzeugtesZeichen), 'K-13-G: das erzeugte Zeichen wird als Kartenzeichen erkannt');

	const fontTreffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(css|html)$/.test(rel)) {
			continue;
		}
		const ohneKomm = ohneKommentare(lies(datei));
		for (const m of ohneKomm.matchAll(/font-family\s*:\s*([^;]+);/g)) {
			const wert = m[1].trim();
			if (!/^var\(--ck-font-[a-z-]+\)$/.test(wert)) {
				fontTreffer.push(`${kurz(datei)}: font-family: ${wert}`);
			}
		}
	}
	check(fontTreffer.length === 0,
		'jede font-family-Angabe in einer .css- oder .html-Datei besteht ausschließlich aus var(--ck-font-…)',
		...fontTreffer);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Der Kartenvorrat ist vollständig und'
	+ '\nrichtig gebaut, cards-blackjack.js ist import- und dokumentfrei, jeder Rang'
	+ '\nund jede Farbe des Regelwerks ist zeichenbar, alle 52 Karten erzeugen'
	+ '\ngültiges Markup, die verdeckte Karte verrät nichts, die vier Silhouetten'
	+ '\nsind verschieden, Text wird maskiert, keine eigene Farbe kommt vor, alle'
	+ '\nKontraste stimmen, jede XLIFF-Kennung ist da, kein Anzeigetext steht im'
	+ '\nModul, keine Regelzahl steht im Bild, und kein fremdes Kartenzeichen und'
	+ '\nkeine fremde Kartenschrift kommen vor.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
