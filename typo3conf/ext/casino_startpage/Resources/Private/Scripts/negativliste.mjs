/**
 * Die geteilte Marken-Negativliste aller acht Geräte (Befund B-6 der
 * Copyright-Prüfung craps vom 2026-09-09)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Diese Datei führt selbst nichts aus —
 * sie liefert nur Daten und eine Hilfsfunktion für die acht `verify-*.mjs`,
 * die tatsächlich prüfen (die sieben `verify-cabinet.mjs` der Geräte-
 * Extensions und `casino_startpage/…/verify-gattung.mjs`).
 *
 * WARUM EINE GETEILTE DATEI STATT SIEBEN ABGEGLICHENER KOPIEN
 * -------------------------------------------------------------
 * Bis zum 2026-09-09 führte jedes der acht Skripte seine eigene Abschrift
 * dieser Liste. Zwei der acht Extensions waren mit 159 Einträgen
 * deckungsgleich (Befund B-2 der Vorprüfung vom 2026-09-08, nachgemessen und
 * behoben), eine blieb mit 128 zurück, fünf weitere bei den ursprünglichen 85
 * (Befund B-6 — die genaue Verteilung steht im Reviewbericht, nicht hier,
 * damit diese Datei keine der betroffenen Extensions beim Namen nennen muss).
 * Eine abgeglichene Kopie kann jederzeit wieder auseinanderlaufen — genau das
 * ist bereits einmal passiert. Diese Datei ist deshalb die EINE Stelle, die
 * die Liste als ausführbares JS-Array trägt; alle acht Prüfskripte lesen sie
 * über einen relativen `import` und führen keine eigene Abschrift mehr. Das
 * ist ohne zusätzliche Abhängigkeit möglich, weil alle neun Skripte ohnehin
 * reines Node-ESM ohne Bundler sind und `casino_startpage` bereits die
 * gemeinsame Laufzeit-Abhängigkeit aller sieben Geräte-Extensions ist
 * (composer.json: `phomo17/casino-startpage`).
 *
 * WARUM DIESE DATEI SELBST NUR ENG AUSGENOMMEN WIRD (Befund B-4)
 * -------------------------------------------------------------
 * Jedes der acht importierenden Skripte prüft (A-5/A-13/A-1/G-7, je nach
 * Datei) den vollen Text seiner eigenen Extension gegen genau diese Liste.
 * `casino_startpage/…/verify-gattung.mjs` prüft dabei auch diese Datei hier
 * mit, weil sie im selben Extensionsbaum liegt. Ausgenommen davon ist NICHT
 * die ganze Datei — das wäre wieder der zu weite Zuschnitt aus Befund B-4 —,
 * sondern nur der eine Bereich zwischen `export const NEGATIVLISTE = [` und
 * der zugehörigen schließenden `];`. Diese Vorlage stammt wörtlich aus
 * `fruit_risk/…/verify-cabinet.mjs` (Stand F2). Der Rest dieser Datei,
 * einschließlich dieses Kopfkommentars, wird mitgeprüft — deshalb darf hier
 * (wie in jeder anderen Datei außerhalb der Liste selbst) kein geschützter
 * Name in Prosa vorkommen, der nicht Teil der Liste ist.
 *
 * WARUM DAS SUCHMUSTER TRENNZEICHEN-UNEMPFINDLICH IST (Befund B-1)
 * -------------------------------------------------------------------
 * Bis zum 2026-09-08 verglich jedes Skript ohne Wortgrenzen (`includes()`),
 * was kurze, mehrdeutige Kürzel der Liste mitten in gewöhnlichen Wörtern
 * hätte anschlagen lassen können. Der Umbau vom 2026-09-08 brachte
 * Wortgrenzen (`\b`) und Groß-/Kleinschreibungs-Unempfindlichkeit, verglich
 * einen mehrwortigen Eintrag aber weiterhin nur gegen ein WÖRTLICHES
 * Leerzeichen — die zusammengeschriebene, die Bindestrich- und die mit
 * Unterstrich getrennte Schreibweise rutschten durch (Befund B-1 der
 * Copyright-Prüfung craps vom 2026-09-09), obwohl das genau die
 * Schreibweisen sind, in denen ein Name realistisch in eine CSS-Klasse, eine
 * Kennung, einen Variablennamen oder ein `data-`Attribut gerät. `musterFuer()`
 * unten ersetzt jedes Leerzeichen eines mehrwortigen Eintrags durch eine
 * optionale Trennzeichenklasse (`[\s_-]?`) und behält die Wortgrenzen bei
 * jedem einzelnen Wortteil bei. Kurze Einzelwort-Einträge dieser Liste sind
 * davon nicht betroffen, weil sie kein Leerzeichen enthalten — ihr
 * Suchmuster ändert sich durch diesen Umbau nicht. (Diese Erläuterung nennt
 * absichtlich keinen der Einträge namentlich als Beispiel: ein geschützter
 * Name als Beispiel in einem Kommentar würde von der eigenen Prüfung
 * mitgelesen und schlüge gegen die Liste an, in der er tatsächlich steht —
 * dasselbe Muster, das in diesem Projekt schon mehrfach aufgetreten ist.)
 */

/**
 * Baut das Suchmuster für einen Listeneintrag: Wortgrenzen an Anfang und
 * Ende, Sonderzeichen des Eintrags maskiert, jedes Leerzeichen durch eine
 * optionale Trennzeichenklasse (Leerraum, Unter- oder Bindestrich) ersetzt.
 * Hauptlauf UND Gegenprobe jedes importierenden Skripts benutzen DIESELBE
 * Funktion (Befund B-3 der Copyright-Prüfung craps vom 2026-09-09) — vorher
 * verglich mancherorts die Gegenprobe mit `includes()`, während der Hauptlauf
 * bereits mit einem `\b`-Regex verglich, und bewies damit weniger, als sie
 * behauptete.
 *
 * @param {string} name Ein Eintrag aus NEGATIVLISTE, in Originalschreibweise.
 * @returns {RegExp} Das fertige, gegen KLEINGESCHRIEBENEN Inhalt zu
 *   prüfende Suchmuster (der Aufrufer schreibt den Eintrag selbst noch klein,
 *   siehe die Benutzung in den einzelnen Prüfskripten).
 */
export function musterFuer(name) {
	const kern = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`\\b${kern.replace(/ /g, '[\\s_-]?')}\\b`);
}

/**
 * Die Mindestlänge der geteilten Liste — eine SCHARFE Untergrenze, kein
 * bloßer Hinweiswert (struktureller Befund der Copyright-Prüfung roulette
 * vom 2026-09-09: `NEGATIVLISTE.length` wurde in allen neun importierenden
 * Skripten bislang nur AUSGEGEBEN, nie GEPRÜFT — ein Importfehler, ein
 * leeres Feld oder ein halb geschriebenes Modul hätte alle acht
 * `verify-cabinet.mjs` und `verify-gattung.mjs` mit einer LEEREN Liste
 * weiterlaufen und „bestanden" melden lassen, ohne dass irgendetwas davon
 * tatsächlich geprüft worden wäre. Dieselbe Fehlerklasse — eine Prüfung, die
 * stumm nichts prüft, aber wie eine bestandene aussieht —, die dieses
 * Projekt in einer Woche bereits mehrfach getroffen hat).
 *
 * Gewählt: 100. Der heutige Bestand (159, nach dem Nachtrag der
 * Roulette-Handelsnamen aus Befund B-1 175) liegt deutlich darüber, und der
 * bisherige Zuwachs je Bauabschnitt (14 bis 16 Einträge) erreicht diese
 * Schwelle auf absehbare Zeit nicht — die Zahl muss also nicht bei jeder
 * Erweiterung nachgezogen werden. Gleichzeitig ist sie hoch genug, dass ein
 * leeres oder auf einen Bruchteil zusammengebrochenes Array zuverlässig
 * auffällt: ein einzelner defekter Abschnittsimport oder ein abgeschnittenes
 * Array käme realistisch nie auf 100 Einträge. Jedes importierende Skript
 * prüft `NEGATIVLISTE.length >= MINDESTLAENGE` als eigene, scharfe Prüfung
 * (siehe DECISIONS.md, 2026-09-09).
 */
export const MINDESTLAENGE = 100;

/**
 * Die geteilte Negativliste. Wörtlich aus CONCEPT.md B.3 Regel 4, erweitert
 * um Rad-, Tisch- und Chiphersteller, Modellnamen, Spielbanken und
 * Live-Casino-Marken (Befund B-2 der Copyright-Prüfung roulette vom
 * 2026-09-04), um Kartenspiel-Begriffe (Phase C5), um Würfel- und
 * Craps-Seitenwetten (Phase C6/Ue), zusammengeführt zur EINEN Liste für alle
 * acht Geräte (Befund B-6 der Copyright-Prüfung craps vom 2026-09-09), und um
 * Handelsnamen von Roulette-Varianten (Befund B-1 der Copyright-Prüfung
 * roulette vom 2026-09-09). Wird NICHT aufgeweicht.
 */
export const NEGATIVLISTE = [
	// Spielautomatenhersteller und Spieltitel (CONCEPT.md B.3 Nr. 4)
	'Novomatic', 'Novomatix', 'Greentube', 'Merkur', 'Gauselmann', 'Bally',
	'Aristocrat', 'IGT', 'Mills', 'Jennings', 'Watling', 'Light & Wonder',
	'Bell-Fruit', 'Sizzling Hot', 'Book of Ra', 'Book of Sand',
	"Lucky Lady's Charm", 'Penny Falls',
	// Rad- und Tischhersteller sowie deren Modell-/Bauteilnamen
	'TCSJohnHuxley', 'John Huxley', 'Cammegh', 'Abbiati', 'Matsui',
	'CTC Holdings', 'Alfastreet', 'Interblock', 'Mercury 360', 'Slingshot',
	'Saturn Glo', 'Garnite', 'EyeBall', 'Velstone', 'Starburst',
	// Chiphersteller
	'Gaming Partners International', 'GPI', 'Paulson', 'Bud Jones',
	'Chipco', 'Dal Negro',
	// Spielbanken und Casinomarken
	'Bellagio', 'Caesars', 'Wynn', 'Venetian', 'MGM', 'Mirage', 'Flamingo',
	'Golden Nugget', 'Tropicana', 'Stardust', 'Riviera', 'Sands', 'Luxor',
	'Harrah', 'Monte Carlo',
	// Live-Casino- und Spielesoftwaremarken
	'Evolution Gaming', 'Playtech', 'Pragmatic Play', 'Microgaming',
	'NetEnt', 'Scientific Games', 'WMS', 'Barcrest', 'Cirsa', 'Konami',
	'All rights reserved',
	// Zusätzlich zu B.3 Nr. 4: geschützte Mechanik-Bezeichnungen (Befund C-2
	// der Copyright-Prüfung roulette vom 2026-09-06). Erfasst in Klein-,
	// GROSS- und camelCase-/Bindestrich-Schreibweisen (diese Varianten
	// bleiben als eigene Einträge stehen, obwohl musterFuer() sie inzwischen
	// auch aus der jeweiligen Grundform allein fände — siehe DECISIONS.md).
	'Megaways', 'MEGAWAYS', 'megaways',
	'Cluster Pays', 'CLUSTER PAYS', 'cluster pays', 'ClusterPays', 'clusterPays', 'cluster-pays',
	'InfiniReels', 'INFINIREELS', 'infinireels', 'Infini Reels', 'infini-reels',
	'Tumbling Reels', 'TUMBLING REELS', 'tumbling reels', 'TumblingReels', 'tumblingReels', 'tumbling-reels',
	// Ergänzung des Kartentisches (CONCEPT.md C.14, Kartenspiel-spezifisch):
	// Spielkartenhersteller.
	'Bicycle', 'Bee', 'Tally-Ho', 'KEM', 'Copag', 'Fournier', 'Modiano',
	'Piatnik', 'Cartamundi', 'Gemaco', 'Aristocrat Playing Cards',
	// Kartenschlitten und Mischmaschinen.
	'Shuffle Master', 'ShuffleMaster', 'Deckmate', 'DeckMate', 'i-Deal',
	'MD3', 'One2Six', 'Angel Eye', 'SecureStep',
	// Handelsnamen von Blackjack-Seitenwetten und -Varianten.
	'Perfect Pairs', '21+3', 'Lucky Ladies', 'Royal Match', 'Super Sevens',
	'Blackjack Switch', 'Free Bet Blackjack', 'Spanish 21', 'Pontoon',
	'Zappit', 'Buster Blackjack', 'Bet Behind', 'Infinite Blackjack',
	'Lightning Blackjack', 'Power Blackjack',
	// Zusätzlich zur Zeichenprüfung: Zähl-/Autorennamen, damit kein Gerät
	// versehentlich einen geschützten Zählnamen statt eines ungeschützten
	// Gattungsnamens (z. B. "Hi-Lo", der selbst NICHT auf dieser Liste steht)
	// trägt.
	'Hi-Opt', 'Wong Halves', 'KO Count', 'Omega II',
	// Kartenhersteller, Kartenmarken und benannte Rückenmuster.
	'Bee Diamond Back', 'Diamond Back', 'Bicycle Rider Back', 'Rider Back',
	// Würfel und Craps-Seitenwetten (Plan-Abschnitt 4.18, Phase C6). Aus
	// allgemein bekanntem Marktwissen, NICHT aus einer förmlichen
	// Markenrecherche. NICHT ABSCHLIESSEND GEKLÄRT: die förmliche
	// Markenrecherche bei DPMA und EUIPO (Auftrag A) und die
	// Bildrückwärtssuche (Auftrag B) aus dem Copyright-Bericht craps bleiben
	// offene Aufträge an den Auftraggeber. Grund für die besondere Vorsicht
	// bei Fire Bet / Bonus Craps / All-Tall-Small (Rechtsprüfung vom
	// 2026-09-07): Fire Bet ist Marke UND US-Patent (6.655.689); Bonus Craps
	// und All-Tall-Small sind ebenfalls geschützt. Alle drei bleiben deshalb
	// dauerhaft draußen.
	'Midwest Game Supply', 'Paul-Son', 'Paulson Dice', 'Blue Chip Dice',
	'Fire Bet', 'Bonus Craps', 'All Tall', 'All Small', 'All Tall Small',
	'All-Tall-Small', "Make 'Em All",
	'Crapless Craps', 'High Point Craps', 'Sharpshooter', 'Repeater Bet',
	'Sidewinder', 'Muggsy',
	// Handelsnamen elektronischer Craps-Geräte und weiterer Craps-
	// Seitenwetten. Ausschließlich MEHRWORTIGE Einträge — ein einzelnes
	// Craps-Fachwort (Craps, Come, Pass, Field, Odds, Place, Hard, Puck, Yo,
	// Boxcars) darf NICHT auf diese Liste, weil es im eigenen, erlaubten Text
	// vorkommt. Aus allgemein bekanntem Marktwissen, NICHT aus einer
	// förmlichen Markenrecherche — NICHT ABSCHLIESSEND GEKLÄRT, siehe
	// Auftrag A im Copyright-Bericht craps.
	'Shoot to Win', 'Roll to Win', 'Bubble Craps', 'Card Craps',
	'Die Rich Craps', 'Rapid Craps', 'Craps Cubed', 'Dice Duel',
	'Lightning Dice', 'Super Sic Bo', 'Hot Roller', 'Twice as Nice',
	'Ride the Line', 'Bonus Frenzy',
	// Handelsnamen von Roulette-Varianten (Befund B-1 der Copyright-Prüfung
	// roulette vom 2026-09-09) — ausgerechnet das Umfeld, aus dem die zwei
	// Bildvorlagen für den Tisch stammen. Ausschließlich MEHRWORTIGE
	// Einträge, aus demselben Grund wie bei den Craps-Seitenwetten oben: ein
	// einzelnes Roulette-Fachwort (Roulette, Split, Street, Corner, Line,
	// Even, Odd, Dozen, Column) darf NICHT auf diese Liste, weil es im
	// eigenen, erlaubten Text vorkommt. Aus allgemein bekanntem Marktwissen,
	// NICHT aus einer förmlichen Markenrecherche — NICHT ABSCHLIESSEND
	// GEKLÄRT, siehe Auftrag A im Copyright-Bericht roulette. Registerbelegt
	// ist bislang EIN Eintrag: „Lightning Roulette" ist eine eingetragene
	// US-Wortmarke (Reg.-Nr. 5707929, Evolution Malta Limited, eingetragen
	// 26.03.2019; Beleg: trademarks.justia.com/878/96/lightning-87896216.html)
	// — der europäische Registerstand ist noch offen (Auftrag A). Für die
	// übrigen fünfzehn wird KEINE Schutzlage behauptet.
	'Lightning Roulette', 'Quantum Roulette', 'Immersive Roulette',
	'Instant Roulette', 'Speed Roulette', 'Auto Roulette',
	'First Person Roulette', 'Double Ball Roulette', 'Age of the Gods',
	'Mega Fire Blaze', 'Triple Bonus Spin', 'Sands Roulette',
	'Golden Chip Roulette', 'Football Studio Roulette', 'Dragonara Roulette',
	'XXXtreme Lightning Roulette',
];
