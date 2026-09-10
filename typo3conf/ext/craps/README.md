# Craps

## Zweck

Vierter Spieltisch des Spaß-Casinos **Casino Kunterbunt**: eine Wanne mit
hohen Banden, Messingkante, grünem Tuch und Pyramidengummi. Zwei selbst
gezeichnete Würfel werden mit der Maus, dem Finger oder der Tastatur
geworfen; das Ergebnis entsteht ausschließlich aus der Physik der Simulation,
nie aus einer gezogenen Zahl. Ein Wurf, der die gegenüberliegende Bande nicht
erreicht, zählt nicht (Mindestwurf-Regel).

Diese Extension enthält alles, was dieses Spiel ausmacht. Sie lässt sich
installieren und entfernen, ohne dass an `casino_startpage` oder an einer
anderen Extension etwas geändert werden muss.

## Eckdaten

| | |
|---|---|
| Extension-Key | `craps` |
| Composer-Name | `phomo17/craps` |
| Namespace | `Phomo17\Craps\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.4.0 (Design-Tokens, Registry, Kasse) |
| Lizenz | AGPL-3.0-or-later |
| Autor | Phomo17 |
| Zustand | 0.4.0 / alpha |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate craps
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach die Backend-Struktur anlegen — entweder von Hand:

1. Unterhalb der Startseite eine Seite **Craps** anlegen.
2. Auf diese Seite in der Spalte „main" ein Inhaltselement **„Craps"** legen.
   Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Tisch wählen und als Zielseite die Seite aus Schritt 1 angeben.
4. Cache leeren und beide Seiten aufrufen.

— oder über das mitgelieferte Wegwerfskript im Projektstamm, das dieselben
drei Datensätze über den `DataHandler` anlegt:

```
ddev exec php build-craps-structure.php --dry-run
ddev exec php build-craps-structure.php
```

Diese Schritte sind Backend-Arbeit und nicht Teil dieser Extension — siehe
Abschnitt „Stand".

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: Craps::IDENTIFIER,
    title: Craps::LANG_FRONTEND . 'automat.title',
    description: Craps::LANG_FRONTEND . 'automat.description',
    extensionKey: Craps::EXTENSION_KEY,
    cabinetPartial: Craps::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));
```

Einziger Unterschied zu einer Automaten-Extension: `gattung: Gattung::Tisch`.
Davon hängt allein ab, wie der Saal die Bühne baut (kein Podest, breiter
Bodenschatten, viewBox quer 160 : 100) und in welcher Gruppe das Gerät in der
Backend-Auswahlliste steht.

`register()` hängt `Resources/Private/Partials/` automatisch an die
`partialRootPaths` des Inhaltselements „Casino-Automat" an. Eine weitere
Anmeldung für die Saal-Ansicht gibt es nicht.

Alle festen Bezeichner — Registry-Schlüssel, `CType`, Gehäuse-Partial, Icon,
der Schlüssel des Buy-ins und die beiden XLIFF-Präfixe — stehen ausschließlich
in `Classes/Craps.php`.

Zusätzlich hängt `ext_localconf.php` an das eigene Inhaltselement den
geräteneutralen Baustein `casino-device-description` aus `casino_startpage`
(Schritt `20` der `dataProcessing`-Kette, mit `gattung = tisch`): er liefert
`<meta name="description">` und einen `Game`-Eintrag in strukturierten Daten
für die eigene Spielseite. `casino_startpage` kennt dafür kein einziges
Gerät — jede Geräte-Extension hängt den Baustein an ihre eigene
dataProcessing-Kette.

## Inhaltselement „Craps"

| | |
|---|---|
| `CType` | `craps` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.craps` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()` |
| Template | `Resources/Private/ContentElements/Table.html` |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht vollständig
im Browser.

Bewusst **kein** eigenes Site Set für das TypoScript: ein Set wirkt erst, wenn
die Site-Konfiguration es einbindet — ein weiteres Gerät müsste dafür
`typo3conf/sites/casino-kunterbunt/config.yaml` ändern, und genau das
verbietet den Architektur-Grundsatz, dass eine Geräte-Extension ohne Änderung
an anderen Stellen installierbar ist.

**Stand nach Phase C7:** Die Spielseite zeigt Wanne, Tuch, Bedienleiste,
Wurfleiste und Verlaufsstreifen. `dataProcessing` hat zwei Schritte:
`casino-device-description` (Schritt 20, geräteneutrale Metadaten) und
`craps-felt` (Schritt 30, `Classes/DataProcessing/FeltProcessor.php` —
rechnet die 48 Feldknöpfe des Tuchs samt ihrer Lage im Gitter aus
`Classes/BetLayout.php` vor). `partialRootPaths.20` (die Partials des Site
Packages, `Table/ChipSprite`, `Table/Status`, `Table/Controls`,
`Table/BuyIn`, `Table/History`) stand seit Umsetzungsstück C6a ungenutzt da
und wird seit Phase C7 tatsächlich gebraucht — Craps' **eigene** Partials
(`Table/Craps/Felt`, `Table/Craps/Round`, `Table/Craps/SoundSwitch` und alle
übrigen) liegen unverändert unter `partialRootPaths.10`.

## Die Wetten und ihre Quoten

Die vollständige Tabelle aus `CONCEPT.md` Anhang H, wie sie in
`Resources/Public/JavaScript/bets-craps.js` steht (`RATIO`, ausschließlich als
exakte Brüche — nirgends als Kommazahl gerechnet, siehe Dateikopf dort) und
in `Classes/BetLayout.php` ein zweites Mal für die serverseitige Zeichnung.
Der Hausvorteil steht als Bruch **und** in Prozent; beide Formen stammen aus
`verify-bets.mjs`, Prüfung B-9 (36 gleich wahrscheinliche Würfelpaare, exakte
Bruchrechnung).

| Wette | Auszahlung | Hausvorteil | Höchsteinsatz | Einheit |
|---|---|---|---|---|
| Pass Line, Come | 1 : 1 | −7/495 (1,41 %) | 100 € | 1 € |
| Don't Pass, Don't Come | 1 : 1 | −3/220 (1,36 %) | 100 € | 1 € |
| Odds hinter Pass/Come (hell) | 2:1 (Point 4/10), 3:2 (5/9), 6:5 (6/8) | 0 (0,00 %) | Staffel 3-4-5× | 1 € |
| Odds hinter Don't Pass/Don't Come (dunkel) | 1:2 (4/10), 2:3 (5/9), 5:6 (6/8) | 0 (0,00 %) | so viel, dass der mögliche Gewinn ebenfalls das Sechsfache der Linienwette beträgt | 1 € |
| Place 4, Place 10 | 9 : 5 | −1/15 (6,67 %) | 100 € | 5 € |
| Place 5, Place 9 | 7 : 5 | −1/25 (4,00 %) | 100 € | 5 € |
| Place 6, Place 8 | 7 : 6 | −1/66 (1,52 %) | 96 € | 6 € |
| Field | 1:1 (die meisten Summen), 2:1 (die 2), 3:1 (die 12) | −1/36 (2,78 %) | 100 € | 1 € |
| Hard 4, Hard 10 | 7 : 1 | −1/9 (11,11 %) | 10 € | 1 € |
| Hard 6, Hard 8 | 9 : 1 | −1/11 (9,09 %) | 10 € | 1 € |
| Any Seven | 4 : 1 | −1/6 (16,67 %) | 10 € | 1 € |
| Any Craps | 7 : 1 | −1/9 (11,11 %) | 10 € | 1 € |
| Die 2, Die 12 | 30 : 1 | −5/36 (13,89 %) | 10 € | 1 € |
| Die 3, Die 11 | 15 : 1 | −1/9 (11,11 %) | 10 € | 1 € |

**Odds zählen nicht in die 300 € je Wurf.** `ROUND_MAX` (Anhang H, 300 €) gilt
für die Summe aller Nicht-Odds-Felder; jedes Odds-Feld trägt
`countsToRoundMax: false` (`bets-craps.js`, `feld()`) und wird von
`table-bets.js` seit Umsetzungsstück C7c entsprechend behandelt.

**Die Staffel 3-4-5×** heißt: der Höchsteinsatz der hellen Odds ist das
Dreifache der Linienwette bei Point 4/10, das Vierfache bei 5/9, das
Fünffache bei 6/8 — bei **jedem** Point ist der dadurch mögliche
**Höchstgewinn** gleich hoch, nämlich das **Sechsfache** der Linienwette
(3×2:1, 4×3:2, 5×6:5 ergeben alle sechs). Die dunkle Seite (Odds hinter
Don't Pass/Don't Come) folgt derselben Sechsfach-Gewinngrenze in die
Gegenrichtung, mit einem entsprechend größeren Höchsteinsatz (Anhang H,
`oddsMax()` in `bets-craps.js` und `BetLayout::oddsMax()`).

**Was dieser Tisch ausdrücklich nicht anbietet:** Big 6/Big 8 (dieselbe Wette
wie Place 6/8, nur schlechter bezahlt — ein Feld, dessen einziger Zweck es
wäre, den Spieler schlechter zu stellen) und Buy-/Lay-Wetten (sie brauchen
eine Kommission, also einen zweiten Geldweg neben dem Einsatz, den weder
`BetTable` noch `TableBank` kennen). `CONCEPT.md` Anhang H erlaubt dem Agenten
ausdrücklich, sie nachzurüsten — er sieht dafür keinen Grund (Begründung im
Plan, Abschnitt 9).

## Das Tuch und seine Maßordnung

`Classes/BetLayout.php` ist die **einzige** Quelle der Lage jedes der 48
Felder im Gitter — `felt.css` zeichnet nur ein Raster aus `--cr-track`-Spuren,
keine einzige Position steht dort. `verify-felt.mjs`, Prüfung F-1, gleicht
`BetLayout.php` Feld für Feld gegen `bets-craps.js` ab (Kennung, Auszahlung,
Höchsteinsatz, `countsToRoundMax`); gerechnet wird im Browser ausschließlich
mit `bets-craps.js`, `BetLayout.php` zeichnet nur.

**96 Spaltenspuren, 11 Zeilenspuren** (Ansage vom 2026-09-08: die Anordnung
folgt jetzt der Bildvorlage des allgemein üblichen amerikanischen Tisches,
nicht mehr nur ihrer verbalen Beschreibung). Eine Spur ist `--cr-track:
0.75rem` (12 Bildpunkte), der Spalt zwischen zwei Feldern ist **0** —
benachbarte Felder teilen sich ihre Linien, und wo zwei Umrandungen
aufeinandertreffen, entsteht die **doppelte Linie**, die die Vorlage
zwischen den Zahlenkästen tatsächlich zeigt. Zeile 1 ist die Puck-Spur (kein
Feld). Die Anordnung und Beschriftung folgen dem allgemein üblichen
Craps-Tisch — das ist als **funktionaler Aufbau** nicht geschützt (US
Copyright Office, Circular 33; § 2 Abs. 2 UrhG i. V. m. BGH „Geburtstagszug",
der den Funktionsanteil ausdrücklich ausnimmt) — selbst gezeichnet, in
eigener Gestaltung, und mit **unseren** Auszahlungen aus Anhang H statt denen
eines fremden Plans.

Zur Herkunft, vollständig: es lagen **zwei** Vorlagen vor. Übernommen wurde die
Anordnung der **tatsächlich benutzten** Vorlage — ausgewählt nicht wegen ihrer
Optik, sondern wegen ihrer Zählweise: sie schreibt „for 1" (Einsatz
eingerechnet), was sich verlustfrei in unsere „zu 1"-Rechnung nach Anhang H
übersetzt. Die andere, nicht benutzte Vorlage hätte überall eine Einheit mehr
gezahlt und führt zudem BIG 6 / BIG 8, die wir bewusst weglassen. **Keine der
beiden Bilddateien ist je ins Projekt gekommen**; sie sind weder eingebunden
noch abgepaust noch nachgezeichnet worden, und das Repository enthält keine
davon. Die Rechtefrage an der benutzten Vorlage hat der Auftraggeber selbst
geprüft und freigegeben (`DECISIONS.md`, 2026-09-07 und 2026-09-08).

Spaltenbänder (Gitterlinien):

| von … bis | Breite | Inhalt |
|---|---|---|
| 1 … 37 | 36 | linke Seitensektion — **gespiegelt, nur gezeichnet** |
| 37 … 40 | 3 | gespiegelte E/C-Kreisspalte |
| 40 … 58 | 18 | Mittensektion — beiden Tischseiten gemeinsam, **nicht** gespiegelt |
| 58 … 61 | 3 | E/C-Kreisspalte, **bespielbar** |
| 61 … 97 | 36 | rechte Seitensektion, **bespielbar** |

Die rechte Seitensektion von innen nach außen:

| von … bis | Breite | Inhalt |
|---|---|---|
| 61 … 65 | 4 | Zahlenkasten **10** |
| 65 … 69 | 4 | Zahlenkasten **NINE** |
| 69 … 73 | 4 | Zahlenkasten **8** |
| 73 … 77 | 4 | Zahlenkasten **SIX** |
| 77 … 81 | 4 | Zahlenkasten **5** |
| 81 … 85 | 4 | Zahlenkasten **4** |
| 85 … 90 | 5 | Don't-Come-Kasten („Don't Come / Bar" + Würfelpaar) |
| 90 … 93 | 3 | Schenkel der **Don't Pass Bar** |
| 93 … 97 | 4 | Schenkel der **PASS LINE** |

Die Querbänder COME, FIELD und Don't Pass Bar laufen von Linie 65 bis 90; die
PASS LINE von 65 bis 93, weil sie außen um die Don't Pass Bar herumführt. Die
Spuren 61…65 bleiben in den Zeilen 7…12 **leer** — das ist die Ecke, in der
ein anderes Haus BIG 6 / BIG 8 drucken würde; wir bieten beide nicht an
(Anhang H, `verify-bets.mjs`), und die Vorlage führt sie ebenfalls nicht
(Prüfung F-19).

Zeilenspuren (Gitterlinien 1…12) mit ihrer Höhe als `fr`-Anteil:

| Zeile | Anteil | rechte Sektion | Mittensektion |
|---|---|---|---|
| 1…2 | 0.6 | **Puck-Spur**, kein Feld | Puck-Ruhelage („OFF") |
| 2…3 | 1.1 | `dont-come-N` (breiter Streifen) | — |
| 3…4 | 0.8 | `dont-come-odds-N` (an der Zahl) | **Seven**, volle Breite |
| 4…5 | 2.0 | **`place-N`** — der Kasten mit der großen Zahl | Hard 6 / Hard 10 |
| 5…6 | 0.8 | `come-odds-N` (an der Zahl) | Hard 8 / Hard 4 |
| 6…7 | 0.8 | `come-N` (äußerer Streifen) | die 3 / die 2 / die 12 |
| 7…8 | 1.8 | **COME** | die 11 (zweimal gedruckt, **ein** Feld) |
| 8…9 | 1.6 | **FIELD** | **Any Craps**, volle Breite |
| 9…10 | 1.0 | **Don't Pass Bar** (+ Schenkel 90…93, Zeilen 2…10) | — |
| 10…11 | 1.4 | **PASS LINE** (+ Schenkel 93…97, Zeilen 2…11) | — |
| 11…12 | 1.0 | **Schulter**: Don't-Pass-Odds / Pass-Odds | — |

Die E/C-Spalte belegt die Zeilen 3…12. Die linke Sektion zeigt in jeder
Zeile dasselbe Bild spiegelverkehrt — außer in der Mittensektion, die beiden
Seiten gemeinsam ist und deshalb nur einmal gezeichnet wird.

**Woher die Zahlen kommen.** Die Spurbreiten sind aus der Vorlage abgemessen
und auf ganze Spuren gerundet: Zahlenkasten 117 Bildpunkte, Don't-Come-Kasten
107, Pass-Schenkel 85, Don't-Pass-Schenkel 60 — im Verhältnis
4 : 3,6 : 2,9 : 2,0, gerundet auf 4 : 5 : 4 : 3 Spuren (der
Don't-Come-Kasten bekommt eine Spur mehr, weil „Don't Come", „Bar" und das
Würfelpaar untereinander hineinmüssen). Die Zeilenanteile sind ebenso
abgemessen und dort angehoben, wo die Zielgröße es verlangt.

**Zielgröße.** Eine Spur ist 12 Bildpunkte breit — das ist NICHT mehr die
Zielgröße selbst: das schmalste **Feld** des Tuchs (die E/C-Kreisspalte, der
Don't-Pass-Schenkel) ist drei Spuren breit, also 36 Bildpunkte. Die elf
Zeilen sind verschieden hoch (`BetLayout::ROW_FRACTIONS`); die kleinste
Tischbreite ergibt sich aus 96 Spuren zu 12 Bildpunkten mal 240/200 (Rahmen
und Bande) = **1382 Bildpunkte**, die Spielfläche ist dann 1152 × 576 —
darauf misst die niedrigste Feldzeile (0.8 fr) rund 35,7 Bildpunkte hoch.
Beides liegt über den 24 × 24 aus WCAG 2.2 SC 2.5.8. **Prüfung F-7 rechnet
das für alle 48 Felder und beide Schenkel einzeln nach, statt es einer
Spurbreite zu glauben** — ein schärferer Nachweis als eine Zahl im
Stylesheet, weil er das tatsächliche Maß jedes Feldes liefert, nicht eine
Absicht wiederholt.

**Der Puck** ist ein Spielstein, kein Bedienteil: `aria-hidden`, nicht
fokussierbar, ohne eigene Aussage. Er steht in Zeile 1 und wandert über
`grid-column` in die Spur des stehenden Points (`BetLayout::puckLanes()`,
sechs Regeln in `felt.css`, ein einziger Schreiber `data-cr-point` an der
Tischwurzel, ausschließlich `craps.js`). Was er zeigt, steht zusätzlich als
Text in `.cr-round__point` (Partial `Table/Craps/Round`) und wird nach jedem
Wurf einmal im craps-eigenen Live-Bereich angesagt — ein zweiter Live-Bereich
für denselben Stand hieße, jeden Wurf zweimal zu hören.

`grid-column` ist keine animierbare CSS-Eigenschaft; die `transition` in
`felt.css` wirkt deshalb nur auf `background-color`, der Puck **springt**
zwischen den Spuren, statt über die Felder dazwischen hinwegzugleiten — ein
springender Puck ist ehrlicher als ein gleitender, der scheinbar über Felder
fährt, auf denen nichts geschieht (Absicht, so im Kommentar in `felt.css`
vermerkt).

## Die Aufschrift ist englisch, der Name ist deutsch

**Ansage des Auftraggebers vom 2026-09-08:** Die Aufschrift auf dem Tuch
bleibt **englisch, wörtlich wie auf der Vorlage** — sie hebt die frühere
Festlegung „aufgedruckt wird unsere Schreibweise" auf. Drei Punkte folgen
daraus.

**1. Die Aufschrift ist Zeichnung, nicht Text.** Sie wird nicht übersetzt,
nie und in keiner Sprachfassung — sie ist die Beschriftung eines Spielgeräts
wie die Augen auf einem Würfel. Sie steht deshalb als **Klartext in
`BetLayout::fields()`**, nicht in `locallang.xlf`; die früheren
`felt.print.*`-Kennungen gibt es nicht mehr. Das ist keine Aufweichung der
Hausregel „im Quelltext steht kein Anzeigetext", sondern ihre saubere
Anwendung: die Regel schützt *übersetzbaren* Text, und dieser Fall war schon
vorher ausgenommen (die Ziffer „4" stand seit jeher unmittelbar in
`POINT_PRINT`). Prüfung **F-24** hält jede Aufschrift gegen eine wörtliche
Abschrift der Vorlage und schlägt an, sobald ein deutsches Wort oder ein
Umlaut auf das Tuch gerät.

**2. Die Zahlen bleiben unsere — die Vorlage schreibt sie nur anders.**
„N FOR 1" heißt: das N-fache des Einsatzes kommt zurück, Einsatz
eingerechnet. Unser „a zu b" heißt: a Gewinn auf b Einsatz, Einsatz kommt
zusätzlich zurück. Für b = 1 ist also N = a + 1:

| Wette | Anhang H (unsere) | daraus gerechnet | Vorlage druckt |
|---|---|---|---|
| Any Seven | 4 zu 1 | 5 FOR 1 | `5 FOR 1` |
| Hard 6 / Hard 8 | 9 zu 1 | 10 FOR 1 | `10 FOR 1` |
| Hard 4 / Hard 10 | 7 zu 1 | 8 FOR 1 | `8 FOR 1` |
| die 2 / die 12 | 30 zu 1 | 31 FOR 1 | `31 FOR 1` |
| die 3 / die 11 | 15 zu 1 | 16 FOR 1 | `16 FOR 1` |
| Any Craps | 7 zu 1 | 8 FOR 1 | `8 FOR 1` |
| FIELD, die 2 | 2 zu 1 | doppelte Rückgabe | `PAYS DOUBLE` |
| FIELD, die 12 | 3 zu 1 | dreifache Rückgabe | `PAYS TRIPLE` |

Jede Zahl der Vorlage bildet sich lückenlos auf eine Quote aus Anhang H ab.
Aufgedruckt wird die englische Form trotzdem nicht *abgeschrieben*, sondern
**gerechnet**: `BetLayout::forOne()` bildet sie aus derselben Quote, die auch
ausgezahlt wird, und Prüfung **F-15** rechnet sie gegen `ratioFor()` aus
`bets-craps.js` nach. Änderte jemand eine Quote, änderte sich der Aufdruck
mit — oder die Prüfung schlüge an.

**3. Der erreichbare Name bleibt deutsch und nennt beide Zählweisen.** Sonst
liest ein sehender Spieler „31" und ein blinder hört „30", und das sieht aus
wie ein Fehler:

> „Die 12 im nächsten Wurf, zahlt 31 for 1, also 30 zu 1."

Prüfung **F-23** verlangt für jedes Feld mit englischem Zahlenaufdruck, dass
sein Name beide Zeichenketten enthält. Prüfung **F-22** verlangt, dass jede
englische Aufschrift im Markup mit `lang="en"` ausgezeichnet ist (WCAG 2.2 SC
3.1.2); reine Ziffern bekommen **kein** `lang`-Attribut, weil eine Ziffer
keine Sprache hat und ein `lang="en"` aus „10" ein gesprochenes „ten" statt
„zehn" machen würde. Bekannte Grenze: in einem `aria-label` lässt sich kein
Sprachwechsel auszeichnen — der Name wird deshalb durchgehend in einer
Sprache gesprochen, ein Preis dafür, dass Label in Name (SC 2.5.3) erfüllt
bleibt.

## Ein Kasten, fünf Zonen

Auf einem echten Craps-Tisch ist jede Point-Zahl **ein** Kasten, und die Höhe
der Chiplage sagt, welche Wette gemeint ist. Genau das zeigt das Tuch: einen
Kasten mit der großen Zahl in der Mitte, darüber und darunter je zwei
schmale Streifen — fünf `<button>` übereinander, die wie ein einziger
Kasten aussehen, weil die waagerechten Trennlinien der vier Streifen
Haarlinien in gedecktem Ton sind, die senkrechten Umrandungen dagegen die
kräftige Aufschrift-Farbe bleiben.

Die **eine Regel**, die man sich dabei merken muss: die Odds liegen an der
Zahl, die flachen Wetten außen. Von außen nach innen (siehe Zeilentabelle
oben):

1. Don't Come — der breite äußere Streifen, doppelter Rahmen
2. Don't-Come-Odds — schmal, unmittelbar an der Zahl
3. **die Zahl selbst** — Come/Don't-Come-Point bzw. Place
4. Come-Odds — schmal, unmittelbar an der Zahl
5. Come — der breite äußere Streifen, einfacher Rahmen

Zone 2 und Zone 4 (`.cr-felt__field--odds`) tragen **beide, unabhängig von
der Seite,** denselben dunkleren Tuchton — nicht, weil die Vorlage das täte
(sie zeigt alle Kästen im selben Grün), sondern weil fünf gleich gefärbte
Zonen übereinander nicht mehr unterscheidbar wären; die Bedienbarkeit steht
in der Ansage ausdrücklich über der originalgetreuen Farbverteilung. Die
Farbe ist dabei nicht die einzige Aussage (WCAG 2.2 SC 1.4.1): jeder
Odds-Streifen liegt an seiner Zahl, und sein erreichbarer Name beginnt mit
„Odds hinter …" — das unterscheidet Don't-Come-Odds von Come-Odds, nicht die
Farbe, die für beide gleich ist. Die Don't-Seite bekommt ihre eigene FORM
statt einer eigenen Farbe (Zone 1, der doppelte Rahmen) — derselbe Grundsatz
wie bei PASS LINE/Don't Pass Bar und COME/DON'T COME.

## C & E

„Craps & Eleven" ist die einzige **abgeleitete** Wette des Tisches — keine
eigene Quote, sondern eine Aufteilung: der Einsatz zählt je zur Hälfte für
Any Craps (7 zu 1) und für die Elf (15 zu 1). Beide Quoten stehen bereits in
Anhang H, deshalb braucht diese Wette **keinen eigenen** 500.000-Runden-
Nachweis — nur die Rechnung, dass die Aufteilung aufgeht (`verify-bets.mjs`,
Prüfung B-13).

Auf den ganzen Einsatz umgerechnet zahlt sie:

| Wurf | Auszahlung | umgerechnet |
|---|---|---|
| 2, 3 oder 12 | die halbe Wette 8fach zurück | 4 × Einsatz → 3 zu 1 |
| 11 | die halbe Wette 16fach zurück | 8 × Einsatz → 7 zu 1 |

Beide Ergebnisse sind für **jeden ganzen Einsatz** wieder ganzzahlig — 4s und
8s sind ganze Zahlen, auch wenn s ungerade ist. Deshalb braucht ungerade
Einsätze **keine eigene Regel** und keinen Rundungsverlust: die Halbierung
ist die Erklärung der Wette, kein Rechenschritt, der aufgehen müsste.

Der Erwartungswert je 1 € ist 4/36 · (+3) + 2/36 · (+7) + 30/36 · (−1) =
(12 + 14 − 30)/36 = **−1/9**, also 11,11 % Hausvorteil — genau die Zeile, die
Anhang H für Any Craps ohnehin führt. `verify-bets.mjs` (B-9) rechnet ihn
nach, `verify-wagers.mjs` (W-15) ein zweites Mal am echten Zustandswerk, und
der lange Messlauf bestätigt ihn ein drittes Mal an 500.000 echten Würfen
(„Craps & Eleven", siehe „Der lange Messlauf" unten).

## Der Wettzustand über mehrere Würfe

`Resources/Public/JavaScript/wagers-craps.js` (`CrapsWagers`) führt den Point
und beurteilt jeden Wurf gegen den Zustand **vor** diesem Wurf. Fünf Urteile,
nicht die drei aus Roulette/Blackjack:

| Urteil | Bedeutung |
|---|---|
| `win` | gewonnen: Einsatz und Gewinn gehen zurück, die Chips gehen vom Tuch |
| `loss` | verloren: die Chips gehen vom Tuch, nichts kommt zurück |
| `push` | Patt (Don't Pass/Don't Come bei der 12, „Bar 12"): der Einsatz kommt zurück |
| `stay` | unentschieden: die Chips bleiben liegen und warten auf den nächsten Wurf |
| `move` | die Chips wandern auf ein anderes Feld (Come → die getroffene Come-Zahl) |

`stay` ist der Fall, den Roulette und Blackjack nicht kennen und der Grund,
warum diese Datei existiert: `BetTable.settle()` fällt für **jedes** belegte
Feld ein Urteil und `sweep()` räumt **alles** ab — eine Wette, die über
mehrere Würfe liegen bleibt, kann das nicht ausdrücken. `matches()` jedes
Craps-Feldes wirft deshalb absichtlich; ein Aufruf wäre ein
Programmierfehler.

**Die Reihenfolge ist bindend: erst der neue Point, dann die Urteile.** Jede
Wette wird gegen den Zustand vor dem Wurf beurteilt — wer die Reihenfolge
umdreht, ließe eine Pass Line gegen einen Point verlieren, den derselbe Wurf
gerade erst gesetzt hat.

**Zwei Hausregeln, die Anhang H offenlässt — eigene Festlegung:**

1. **Odds und Hardways arbeiten immer**, auch beim Come-out. Ihr Hausvorteil
   ist in jedem Fall unverändert (0 % bzw. 11,11 %/9,09 %) — ein Ruhen beim
   Come-out änderte an der Quote nichts und bräuchte nur einen weiteren
   Schalter.
2. **Place-Wetten ruhen beim Come-out immer** (klassische, für den Spieler
   günstige Regel) und sind während des Points über **einen** Schalter
   (`[data-cr-place-working]`, Partial `Table/Craps/Felt`) gemeinsam an- und
   abschaltbar — `CONCEPT.md` C.8.4 verlangt Schaltbarkeit, nicht
   Einzelschaltbarkeit.

**Die Abrundungsregel und ihre Einheit.** `payout()` rundet stets ab
(`Math.floor`), weil es keine halben Chips gibt. Ein Einsatz, der kein
Vielfaches der Einheit ist (Spalte „Einheit" oben, immer der Nenner der
Quote), verliert dadurch einen Teil der möglichen Auszahlung — verschwiegen
wird nichts: das Tuch nennt die Einheit im erreichbaren Namen jedes
betroffenen Feldes, und `wagers-craps.js` sagt sie an, sobald ein Einsatz sie
verfehlt (`round.hint.unit`). Erzwungen wird sie nicht: mit den Chips 1, 5,
20, 25, 100 ließe sich eine 6-€-Einheit (Place 6/8) mit einem einzelnen
5er-Chip nie exakt aufbauen.

## Geld am Tisch

**Buy-in** läuft über die geteilten Bausteine des Site Packages
(`table-buyin.js`, `openTableBank('craps')`) — genau wie bei Roulette und
Blackjack, ohne eine einzige eigene Zeile Geldlogik. **CASH OUT** ist
gesperrt, solange Chips auf dem Tuch liegen (dieselbe Regel wie überall im
Haus).

**Chips werden seit Umsetzungsstück Tf einzeln gekauft und zurückgegeben**
(Ansage vom 2026-09-07), am Craps-Tisch wie an jedem anderen Gerät mit
Buy-in: die Chipkasse in `Table/BuyIn.html` ersetzt das frühere
Betragsformular, das einen eingetippten Betrag selbsttätig in möglichst
große Chips zerlegte. Für jede Chipsorte gibt es jetzt einen eigenen Kauf-
und Rückgabeknopf. `bank.buyChip(wert)` bucht über
`machineCredit.insert(wert)` und legt den Chip unmittelbar ins Rack;
`bank.sellChip(wert)` nimmt ihn aus dem Rack und bucht über die neue
Bausteinmethode `machineCredit.withdraw(wert)` — eine **Teilrückbuchung**
des Gerätekredits, anders als `cashOut()`, das weiterhin alles auf einmal
zurückbucht und für keinen Automaten geändert wurde. `buyIn(betrag)` bleibt
als Schnittstelle bestehen, obwohl seit dieser Ansage kein Bedienteil mehr
dorthin führt: die Nachweisskripte rechnen weiterhin damit, und ein
Server-Guthaben (Stufe 3) wird einen Betrag wieder in einem Zug wechseln
wollen. Alle drei Methoden sind geteilte Bausteine des Site Packages
(`casino_startpage/README.md`), keine Craps-eigene Geldlogik.

**Die Vertragswette und ihr Sockel.** Am echten Tisch dürfen eine stehende
Pass Line und eine bereits auf ihre Zahl gewanderte Come-Wette nicht mehr
zurückgenommen werden. `table-bets.js` bildet das seit Umsetzungsstück C7c
über einen **Sockel** ab (`freeze(fieldId, betrag)`/`floorOn()`): bis zu
diesem Betrag darf `takeBack()` nicht abräumen. Ein Sockel statt einer
Vollsperre, weil `table-felt.js` einen Chip zuerst legt und das Geld danach
bucht — eine abgelehnte Buchung wird über `takeBack()` zurückgenommen, und
ein vollständig gesperrtes Feld ließe genau diese Rücknahme fehlschlagen und
einen unbezahlten Chip zurück. `round-craps.js`, `applyReport()`, löscht
jeden Sockel zuerst und setzt ihn danach neu: ein Point, der gerade gefallen
ist, darf seine Pass Line nicht weiter festhalten.

**Die 300-€-Grenze ohne Odds** (`ROUND_MAX`) wird von `table-bets.js` an
derselben Stelle geprüft wie bei jedem anderen Tisch (`place()`,
`countedTotal`) — keine dritte, craps-eigene Prüfung nötig.

**Zwei Erweiterungen des Site Packages, beide rückwärtsverträglich**
(Umsetzungsstück C7c): `countsToRoundMax` an `BetField` (Vorgabewert `true`,
von Roulette/Blackjack unverändert genutzt) und der Sockel-Mechanismus
(`freeze`/`unfreeze`/`floorOn`, Vorgabewert „kein Sockel"). Alle acht
`verify-*.mjs` des Site Packages sowie alle Skripte von Roulette und
Blackjack laufen nach dieser Erweiterung unverändert grün — das ist gezeigt,
nicht behauptet (siehe `casino_startpage/README.md`).

## Klang

`Resources/Public/JavaScript/sound-craps.js` ordnet jedem Ereignis dieses
Tisches einen Klang zu — ausschließlich aus Tonfrequenzen im Browser
erzeugt, keine Audiodatei, kein Netzzugriff, keine Melodie
(`CONCEPT.md` B.3 Nr. 11):

| Ereignis | Baustein | `key` |
|---|---|---|
| Chip aufs Tuch gelegt | `metal({pitch: tief})` | `cr-chip-place` |
| Chip zurückgenommen | `metal({pitch: höher, leiser})` | `cr-chip-remove` |
| Wurf beginnt | `ratchet()` — das Rasseln in der Hand, einmal | `cr-shake` |
| Würfel liegen | `metal({pitch: hoch})` — ein Aufschlag | `cr-dice-rest` |
| Point wird gesetzt | `metal({pitch: tief, laut})` — der Puck wird umgelegt | `cr-puck` |
| Seven-out | `sheet()` — das Abräumen | `cr-sevenout` |
| Gewinn | `coinCascade()` | `cr-payout` |
| Teilrückgabe | `coin()` | `cr-partial` |
| Verlust mit Einsatz | `sheet()` | `cr-loss` |
| CASH OUT | `cashRegister()` | `cr-cashout` |

**Kein Dauerklang.** Der Roulette-Tisch hält zwei Dauerklänge (Radscheibe,
Kugel), weil er zwei laufende Körper mit hörbar wechselnder Geschwindigkeit
hat. Dieser Tisch hält **keinen**: die Würfelansicht (`dice-view.js`) bleibt
unangetastet und hat keinen Bild-für-Bild-Rückruf, an dem ein Poltern hängen
könnte. Ein Rasseln beim Wurfbeginn und ein Aufschlag beim Liegenbleiben sind
zwei echte, punktuelle Ereignisse; ein nachgeschobenes Poltern ohne Bezug zur
tatsächlichen Physik wäre erfunden. Der Messpunkt `data-cr-sound-sustained`
steht deshalb **immer** auf `'0'` — geschrieben, um genau das zu belegen,
nicht um einen laufenden Dauerklang zu zählen.

**Ehrlich, nicht spannungssteigernd** (B.7): `onResult()` spielt genau eine
der vier sich ausschließenden Geldantworten (kein Einsatz, Gewinn,
Teilrückgabe, Verlust), als eine einzige `if`/`else if`-Kette. Das
Ereignisgeräusch (Puck, Seven-out) ist davon unabhängig und kommt **vor**
der Geldantwort, nicht statt ihrer — der Point kann auch ganz ohne Einsatz
stehen, und das Stehen selbst ist ein eigenes, wirklich stattfindendes
Ereignis.

Der Ton-Schalter (`Table/Craps/SoundSwitch`) ist ein echter
`<button type="button">` mit `aria-pressed`, sichtbarem Text und einem
hellen Namensschild (`.cr-sound__label`, Kontrast 14,95 : 1 gemessen) —
dieselbe Bauart wie am Roulette-Tisch.

## Der Tisch als eine Fläche

**Seit Umsetzungsstück Td ist der Tisch eine einzige Fläche, nicht mehr zwei
nebeneinanderstehende Zeichnungen** (Ansage vom 2026-09-07: „beim echten
Craps wird dort gewürfelt, wo auch die Chips liegen"). `Table.html` stapelt
dafür drei Schichten in **einem** Kasten (`.cr-cloth`):

1. `.cr-cloth__ground` — der Untergrund aus `Cloth.html`: Rahmen, Messing­
   kante, Tuch, Pyramidengummi.
2. `.cr-felt` — das Wettgitter, als durchsichtige Überlagerung auf dem
   Untergrund (siehe „Das Tuch und seine Maßordnung" oben).
3. `.cr-cloth__dice` — die Würfelschicht aus `Dice.html`, ganz oben, weil ein
   Würfel über die Felder rollt und nicht darunter.

**Das Seitenverhältnis von `.cr-cloth` ist fest auf `240 / 140`** und NICHT
frei gewählt: es ist die Maßordnung, in der `dice-physics.js` rechnet. Weicht
es ab, landen die Würfel neben der Stelle, an der die Physik sie berechnet
hat — deshalb steht `aspect-ratio: 240 / 140` unmittelbar auf `.cr-cloth`,
und keine der drei Schichten bringt eine eigene Höhe mit.

**Die Lage des Gitters auf der Spielfläche** ist eine Rechnung mit vier
Prozentzahlen, keine gerundete Zahl: `.cr-felt` sitzt bei `100% * 20/240` von
links, `100% * 20/140` von oben, misst `100% * 200/240` in der Breite und
`100% * 100/140` in der Höhe — dieselbe Bandeninnenkante, an der auch
`dice-physics.js` die Wand ansetzt.

**Die Rollkette**, von außen nach innen, jedes Glied mit
`min-inline-size: 0`, sonst reißt sie an der ersten Stelle ab, die es nicht
trägt (Auditbefund H-02 beim Roulette, ein halbes Jahr unbemerkt):
`.ck-hall__content` → `.ck-room-fill` → `.cr-table` → `.cr-cloth-area` →
`.cr-cloth__scroll` (`overflow-x: auto`) → `.cr-cloth`. Erst das letzte
Glied ist breiter als der Bildschirm, und nur dort wird gerollt.

Alle Zahlen der Maßordnung stehen **einmal** in
`Resources/Public/JavaScript/dice-geometry.js` und werden von der Zeichnung
(`Cloth.html`) und von der Physik (`dice-physics.js`, dort ausgeschrieben
wiederholt, weil sie importfrei bleiben muss) benutzt. `verify-tray.mjs`
(D-1) und `verify-physics.mjs` (P-9) gleichen beide Kopien bei jedem Lauf
gegen diese eine Quelle ab.

Blick von oben, `viewBox="0 0 240 140"`, `x` nach rechts, `y` nach unten,
alle Längen in viewBox-Einheiten:

| Kante | `x` | `y` |
|---|---|---|
| Wannenaußenkante | 2…238 | 2…138 |
| Messingkante | 8…232 | 8…132 |
| Bandeninnenkante = Tuch (**hier spielt die Physik**) | 20…220 | 20…120 |

Kantenlänge eines Würfels: **12** Einheiten. Die Zacken des Pyramidengummis
sitzen alle 10 Einheiten (`PYRAMID_PITCH`) und ragen 5 Einheiten in die Wanne
hinein (`PYRAMID_DEPTH`, rein zeichnerisch).

Geworfen wird von **rechts**. Die Gegenbande ist damit die **linke** Bande
(`x = 20`) — die Bande, die ein Wurf berühren muss, damit er nach der
Mindestwurf-Regel überhaupt zählt (siehe „Aufnehmen, Schütteln, Werfen"
unten). Die Wurfstrecke ist mit 200 Einheiten rund das Sechzehnfache einer
Würfelkante lang: auf dieser Strecke kippt ein Würfel mehrfach und stößt
mindestens einmal an einer Bande an — eine kürzere Wanne hätte dem Ergebnis
zu wenig Weg gelassen, um sich zu mischen.

## Die Würfel und ihre 24 Lagen

Ein Würfel ist über drei Augenzahlen vollständig beschrieben: `top` (was oben
liegt), `front` (was in Richtung der Körperachse +Y zeigt) und `right` (was
in Richtung +X zeigt). Die übrigen drei Flächen ergeben sich aus der
Würfelregel „gegenüberliegende Flächen ergeben zusammen sieben"
(`opposite(face) = 7 - face`).

Es gibt genau **24** solche Lagen — sechs mögliche obere Flächen mal vier
Vierteldrehungen um die Senkrechte. Sie stehen in `ORIENTATIONS` vollständig
ausgeschrieben, nicht als Schleife erzeugt: der Zuschauen-Modus muss eine
davon ziehen können, und der Nachweis muss sie einzeln durchgehen können.

**Berichtigung gegenüber dem ursprünglichen Plantext (Umsetzungsstück C6b):**
Die 24 Zeilen, die der Plan zunächst vorgab, bestanden weder die
Rechtshändigkeitsprobe (`kreuz(right, front) = top`) noch die Abgeschlossenheit
unter dem Kippen — beides deckt Prüfung D-6 auf. Die jetzt stehenden 24 Zeilen
sind stattdessen durch vollständigen Abschluss (Breitensuche) aus der
Ausgangslage `[1, 2, 3]` unter allen vier Kipprichtungen erzeugt und danach von
Hand abgeschrieben — dieselbe Bauart, aber geprüft rechtshändig und
geschlossen. `verify-tray.mjs`, Prüfung D-6, rechnet das bei **jedem** Lauf neu
nach; „es gilt die Messung, nicht der Plan".

**Ein Kippschritt als Tabelle.** Gekippt wird über eine der vier unteren
Kanten der Körperachse:

| Richtung | Kante | Was passiert |
|---|---|---|
| 0 | +X (rechte Kante) | die rechte Fläche geht nach unten, die obere Fläche wird zur rechten, `7 − top` wird zur oberen |
| 1 | −X (linke Kante) | die linke Fläche geht nach unten, `7 − right` wird zur oberen, die alte obere Fläche wird zur rechten |
| 2 | +Y (vordere Kante) | die vordere Fläche geht nach unten, die obere wird zur vorderen, `7 − front` wird zur oberen |
| 3 | −Y (hintere Kante) | die hintere Fläche geht nach unten, `7 − top` wird zur vorderen, die alte vordere bleibt liegen |

Die jeweils vierte Fläche (die auf der Drehachse) bleibt beim Kippen
unverändert stehen. `tipFaces()` in `dice-geometry.js` und `kippeFlaechen()`
in `dice-physics.js` rechnen genau das — zweimal geschrieben, weil
`dice-physics.js` importfrei bleiben muss, und von Prüfung P-9 über alle 24
Lagen und alle vier Richtungen abgeglichen.

Die Augen selbst (`PIP_LAYOUT`) sind Punkte auf einem Raster, gezeichnet als
Kreise — es gibt in dieser Extension **kein** `<text>`, keine Ziffer und
ausdrücklich keins der sechs Unicode-Würfelzeichen. Die Punktanordnung
(Einsen mittig, Zweien/Dreien auf der Diagonalen, Vieren/Fünfen auf den
Ecken, Sechsen in zwei Dreierreihen) ist seit Jahrhunderten üblich und gehört
niemandem (`CONCEPT.md` B.3 Nr. 2, „was frei ist").

**Der plastische Würfel, seit Umsetzungsstück Te (Ansage vom 2026-09-07:
„nur die Optik wird plastisch, die Physik bleibt das Kippkanten-Modell").**
Ein Würfel in `Dice.html` besteht aus **vier Geschwistern**, nicht aus
ineinander geschachtelten Gruppen:

1. `.cr-die__shadow` — der Schattenwurf, am tiefsten versetzt, wächst mit der
   Flughöhe (`--cr-h` aus `dice-view.js`).
2. `.cr-die__side--far` — die abgewandte Körperfläche, dunkler getönt.
3. `.cr-die__side--near` — die zugewandte Körperfläche, mittlerer Ton.
4. `.cr-die__face` — die Deckfläche mit den Augen.

Jede der vier Schichten trägt in `tray.css` ihre **eigene, vollständige**
Transformationskette und wird um ein Vielfaches von `--cr-dx`/`--cr-dy`
versetzt (`--cr-lift` 0/1/2 je Schicht). **Der Versatz liegt im
Bildschirmraum, nicht im Körperraum:** die Gierlage dreht den Würfel um die
Senkrechte, aber die Blickrichtung „an ihm vorbei" ändert sich dabei nicht —
`translate()` steht deshalb VOR `matrix()` in der Kette. Läge der Versatz
stattdessen innerhalb der Drehung, schwänke der Körper bei jeder Drehung hin
und her, als kippte der Tisch. **Vier Geschwister statt Schachtelung,** weil
`transform-box: view-box` mit `transform-origin: 0 0` in einer bereits
verschobenen Elterngruppe nicht mehr auf den Würfel zeigt, sondern auf den
Ursprung der Zeichenfläche — die Drehung liefe dann um die linke obere Ecke
des Tisches.

**Die Physik bleibt dabei vollständig unberührt.** Der Versatz ist eine reine
Zeichenregel: `dice-physics.js` weiß nichts von ihm, `dice-view.js` schreibt
unverändert dieselben acht Zahlen an die Gruppe `.cr-die`, und alle vier
Schichten erben sie. Der Gleichverteilungs- und Unabhängigkeitsnachweis über
500.000 Würfe bleibt uneingeschränkt gültig; Prüfung P-11 hält fest, dass
`dice-physics.js` und `dice-geometry.js` zu ihrem Stand vor Phase T
buchstabengleich sind — **kein einziges Zeichen Physik** wurde für die
plastische Optik verändert. (Der Plan nannte diese Prüfung „P-10 (neu)"; die
Kennung P-10 war zu diesem Zeitpunkt bereits vergeben, deshalb trägt sie in
`verify-physics.mjs` die nächste freie Kennung P-11.)

## Physik: wie das Ergebnis entsteht

`Resources/Public/JavaScript/dice-physics.js` **erzeugt** das Ergebnis eines
Wurfs, es stellt es nicht dar. Es gibt darin keine einzige Zeile, die eine
Augenzahl auswählt — es gibt nur zwei Würfel, die fliegen, aufkommen, kippen,
an Banden abprallen, aneinanderstoßen und irgendwann liegen bleiben. Was oben
liegt, wird abgelesen. Zufällig ist ausschließlich, **womit** die Simulation
startet (Kräfte, Winkel, Anstoßpunkte, die gezogene Startlage), nicht, wie
sie ausgeht (`CONCEPT.md` C.5.1).

**Ein kippender Quader, kein Starrkörper im Raum.** `CONCEPT.md` C.8.3
überlässt die Wahl des Modells ausdrücklich dem Umsetzer. Gewählt ist das
Kippmodell, weil nur es die beiden harten Zusagen baulich erfüllt statt sie
nachträglich zu erzwingen: kein Würfel verlässt je den Tisch (der Mittelpunkt
wird nach jedem Schritt in das Rechteck der Bandeninnenkante geklemmt, und
ein Bandenstoß ist ein echter Stoß mit Rückprall), und kein Würfel bleibt auf
einer Kante liegen (Ruhe ist nur möglich, wenn eine Fläche flach aufliegt).

**Ein Kippschritt ist eine Rechnung, keine Animation.** Der Mittelpunkt des
Würfels muss beim Kippen über die Kante steigen — von `a/2` auf `a/2·√2`
(`HILL_PEAK`). Unterwegs gilt `v(t)² = v₀² − INERTIA·GRAVITY·hügel(t)` mit
`hügel(t) = HILL_PEAK·4t(1−t)`. Wird `v(t)²` unterwegs null, fällt der Würfel
auf die Fläche zurück, von der er kam — kein Neuwurf, kein Nachhelfen, kein
gezogenes Ergebnis. Genau dieser Mechanismus lässt einen Würfel von selbst
zur Ruhe kommen. `hügel(t)` ist bewusst eine **Parabel und kein Sinus**: die
wahre Höhe wäre `DIAG_HALF·sin(θ+45°)`, aber `Math.sin` legt die
ECMAScript-Norm nicht bitgenau fest, und ohne bitgenaue Rechenarten wäre ein
Nachweis über hunderttausende Würfe auf jeder Maschine anders ausgegangen.
Die Parabel trifft dieselben drei Punkte (Anfang 0, Scheitel `HILL_PEAK` bei
`t = 0,5`, Ende 0) — über das Gelingen eines Kippschritts entscheidet allein
der Scheitel, und der stimmt exakt.

**Die Gierlage ist ein Einheitsvektor, kein Winkel** — aus demselben Grund:
ein Winkel bräuchte `Math.sin`/`Math.cos`/`Math.atan2`. Die Drehung erster
Ordnung mit anschließender Normierung ist reine Strich-, Punkt- und
Wurzelrechnung und damit bitgenau; sie dreht dabei rund ein Promille je
Sekunde langsamer als eine ideale Drehung — eine benannte
Auslegungseigenschaft, auf jeder Maschine dieselbe.

**Die bewusste Vereinfachung.** Ein Würfel, der schräg zu seinen eigenen
Kanten läuft, würde in Wirklichkeit taumeln und dabei seine Laufrichtung
verändern. Das Modell wählt stattdessen bei jedem Kippschritt die Kante, die
am nächsten quer zur Laufrichtung liegt, und lässt die Laufrichtung
unverändert — der Würfel läuft zwischen zwei Bandenstößen geradeaus, während
die Gierdrehung dafür sorgt, dass die gewählte Kante über den Lauf hinweg
mehrfach wechselt.

**Die drei Mischer:**

1. **Die Gierdrehung** wechselt die Kippkante. Ohne sie kämen nur vier der
   sechs Flächen je nach oben — die zwei auf der Drehachse blieben für immer
   außen vor. Das ist die wichtigste Falle dieses Modells; Prüfung P-7 weist
   nach, dass sie geschlossen ist.
2. **Der Pyramidengummi der Bande.** Wo ein Würfel auf einer Zacke auftrifft,
   entscheidet, wohin er weiterläuft — gerechnet aus dem Auftreffpunkt
   (`u = laengs / PYRAMID_PITCH`), nicht gezogen.
3. **Der Zusammenstoß der beiden Würfel.** Sie stoßen wirklich aneinander.
   Genau deshalb ist die Unabhängigkeitsprüfung (siehe unten) eine echte
   Aussage und keine Selbstverständlichkeit — wären die Würfel entkoppelt,
   bewiese ein bestandener Unabhängigkeitstest nichts.

**Die Mindestwurf-Regel steht hier, nicht im Spiel.** „Erreichen die Würfel
die gegenüberliegende Bande nicht, gilt der Wurf nicht" ist eine Tischregel,
aber sie wird an einer rein körperlichen Tatsache abgelesen: hat der Würfel
die linke Bande berührt (`farWall`). Spiel und Nachweis benutzen dadurch
dieselbe Regel.

**Alle 32 numerischen Exporte von `dice-physics.js`** — Auslegungswerte, keine
Naturkonstanten. Widerspricht eine Messung einer dieser Zahlen, gilt die
Messung, und die Stellschraube wird nachjustiert, niemals der Zufallsgeber
und niemals ein Ergebnis (`CONCEPT.md` C.5.4). Die Tabelle listet, was
`Object.entries(modul).filter(([, w]) => typeof w === 'number')` tatsächlich
liefert — nicht eine im Text behauptete Anzahl, die vom Quelltext abweichen
könnte:

| Name | Wert | Bedeutung |
|---|---|---|
| `DT` | 1/240 s | fester Zeitschritt, 240 Rechenschritte je Sekunde |
| `SUBSTEPS` | 4 | Rechenschritte je Bild bei 60 Bildern/s |
| `MAX_CATCHUP_STEPS` | 32 | höchstens so viele Schritte werden nach einem Stillstand nachgeholt |
| `MAX_STEPS` | 4800 | Notbremse nach 20 s Wurfdauer — darf nie greifen (P-6) |
| `FELT_LEFT` / `FELT_RIGHT` / `FELT_TOP` / `FELT_BOTTOM` | 20 / 220 / 20 / 120 | Bandeninnenkante, siehe „Die Wanne" oben |
| `DIE_EDGE` | 12 | Kantenlänge eines Würfels |
| `PYRAMID_PITCH` | 10 | Teilung des Pyramidengummis |
| `HALF_EDGE` | 6 | halbe Kantenlänge |
| `DIAG_HALF` | 8,48528136 | halbe Diagonale des senkrechten Querschnitts, `a/2·√2` |
| `HILL_PEAK` | 2,48528136 | Höhe, die der Mittelpunkt beim Kippen übersteigen muss |
| `TIP_ARC` | 13,32864876 | Bogenlänge einer Vierteldrehung um die Kippkante |
| `INERTIA` | 1,5 | Trägheitsbeiwert der Kippbewegung — hergeleitet, keine Stellschraube |
| `TURN` | 6,28318531 | ein Umlauf in Umdrehungen (2π, ausgeschrieben statt `Math.PI`) |
| `GRAVITY` | 900 | Fallbeschleunigung |
| `AIR_DRAG` | 0,35 | Luftwiderstand im Flug |
| `BOUNCE_KEEP` | 0,34 | Anteil der Fallgeschwindigkeit, der ein Aufkommen übersteht |
| `BOUNCE_MIN` | 26 | unterhalb dieser Fallgeschwindigkeit wird gerollt statt gehüpft |
| `LAND_KEEP` | 0,82 | Anteil des Bodentempos, der ein Aufkommen übersteht |
| `ROLL_FRICTION_LIN` / `ROLL_FRICTION_QUAD` | 12 / 0,02 | Rollreibung, fester und tempoabhängiger Anteil |
| `TIP_KEEP` | 0,945 | Anteil des Tempos, der einen vollendeten Kippschritt übersteht — der wichtigste Hebel des ganzen Modells |
| `FALLBACK_KEEP` | 0,30 | Anteil des Tempos, der ein misslungenes Kippen (Zurückfallen) übersteht |
| `WALL_KEEP` | 0,75 | Anteil des Tempos, der einen Bandenstoß übersteht |
| `PYRAMID_SPREAD` | 0,42 | wie schräg eine Zacke höchstens stellt |
| `PYRAMID_SPIN` | 0,7 | wie stark ein außermittiger Zackentreffer verdreht — **berichtigt von 0,35 auf 0,7**, siehe unten |
| `COLLIDE_KEEP` | 0,6 | Anteil der Annäherungsgeschwindigkeit, der einen Würfelstoß übersteht |
| `COLLIDE_RADIUS` | 7 | Stoßhalbmesser eines Würfels |
| `SPIN_FRICTION` | 0,12 | Abbau der Gierdrehung |
| `REST_SPEED_SQ` | 3355,129836 | unterhalb dieses (quadrierten) Tempos gilt ein Würfel als liegend |

**Zwei Nachbesserungen nach dem Messlauf M-C6-1** (`DECISIONS.md`
2026-09-07): `PYRAMID_SPIN` wurde von 0,35 auf 0,7 erhöht, und der gezogene
Bereich der Gierdrehung beim Wurf (in `roll()`, kein eigener Export) von
0,15–0,60 auf 0,15–1,50 Umdrehungen je Sekunde erweitert. Beides verstärkt
denselben Mischer — die Gierdrehung und ihre Wirkung an der Bande —, weil
genau er es war, der die Gegenprobe „feste Startlage" (siehe unten) hat
durchfallen lassen. Die Reihenfolge des Nachbesserns folgt `CONCEPT.md`
C.5.4 und ist verbindlich, falls ein künftiger Nachweis wieder durchfällt:

1. `TIP_KEEP` — der stärkste Hebel für die Zahl der Kippschritte je Wurf.
2. `ROLL_FRICTION_LIN` / `ROLL_FRICTION_QUAD` — dieselbe Richtung, feiner.
3. `PYRAMID_SPREAD` und `PYRAMID_SPIN` — der Hebel, wenn die Verteilung je
   Würfel bereits stimmt, aber die Unabhängigkeit nicht.
4. `SPIN_FRICTION` und der gezogene Bereich der Gierdrehung — der Hebel, wenn
   eine einzelne Augenzahl systematisch zu selten oder zu häufig kommt.
5. `COLLIDE_KEEP` und `COLLIDE_RADIUS` — nur, wenn die Unabhängigkeit danach
   noch durchfällt. Letzte Möglichkeit, ausdrücklich benannt: den
   Zusammenstoß der Würfel ganz entfallen zu lassen — ein Verlust an
   Wahrhaftigkeit, der eine ausdrückliche Begründung in `DECISIONS.md`
   verlangt.
6. `GRAVITY`, `DIE_EDGE`, die Wannenmaße — zuletzt, und nur, wenn nichts
   anderes trägt.

**Nie:** `rng.js`, das Verwerfungsverfahren, `ORIENTATIONS`, `INERTIA`,
`HILL_PEAK` oder `TIP_ARC` — die letzten drei sind hergeleitet, keine
Stellschrauben.

## Zufall und Wiederholbarkeit

**Zwei Geber, eine Form, eine benannte Wechselstelle.** `rng.js` liefert
beide über dieselbe Schnittstelle (eine vorzeichenlose 32-Bit-Zahl):
`drawUint32()` zieht echten Zufall aus `crypto.getRandomValues()` — das läuft
im Spiel. `createSeeded(saat)` liefert stattdessen eine wiederholbare Folge
über einen Zählergenerator mit SplitMix-Verwirbelung (`Math.imul`) — das
benutzt ausschließlich der Nachweis. Welcher Geber läuft, entscheidet sich an
**einer** Stelle: `new DiceTable({ random })`. Die Physik importiert keinen
der beiden Geber, sie bekommt ihn eingespeist — deshalb bleibt
`dice-physics.js` importfrei und lädt unter Node ohne jede Vorbereitung
(`CONCEPT.md` C.5.3). Prüfung V-6 in `verify-view.mjs` weist nach, dass
`craps.js` im Spiel ausschließlich `drawUint32` einspeist; `createSeeded()`
wird im Spiel nie benutzt.

**Das Verwerfungsverfahren, nicht der Rest-Operator.** `zieheGanzzahl()`
braucht ganzzahlige Werte aus Bereichen, die 2^32 nicht glatt teilen — ein
schlichtes „gezogener Wert % Bereichsgröße" bevorzugte dabei systematisch die
niedrigen Werte (`CONCEPT.md` C.5.2). Jeder Wert über der letzten vollen
Vielfachen der Bereichsgröße wird verworfen und neu gezogen; die Schleife
läuft praktisch immer genau einmal.

**Keine Winkelfunktion, nirgends in dieser Datei.** Erlaubt sind
ausschließlich `+ − × ÷` sowie `Math.abs`, `Math.min`, `Math.max`,
`Math.floor`, `Math.sqrt`, `Math.imul` — die einzigen Rechenarten, die die
ECMAScript-Norm bitgenau festlegt. Nur so gilt „gleicher Startzustand plus
gleiche Zufallsfolge ergibt exakt denselben Verlauf" auch auf einer anderen
Maschine. `verify-physics.mjs`, Prüfung P-1, weist das nach; P-2 belegt die
Wiederholbarkeit selbst (gleiche Saat → bitgleicher Verlauf), P-3 die
Gegenprobe (verschiedene Saat → verschiedene Folge).

## Gleichverteilungs- und Unabhängigkeitsnachweis

`Resources/Private/Scripts/measure-dice.mjs` ist der Nachweis nach
`CONCEPT.md` C.5.4 in voller Länge — mindestens 500.000 gültige Würfe, ein
einziges `DiceTable`-Objekt für den ganzen Lauf, `createSeeded(saat)` statt
echtem Zufall, gerechnet mit `dice-physics.js` selbst (nicht mit einer
Nachbildung). Aufruf:

```
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-dice.mjs --runs=500000 --seed=20260907
```

Bestanden ist ein Block bei **p > 0,01** aus dem Chi-Quadrat-Test — nie eine
feste Prozentzahl auf einer Messgröße. Vier Blöcke:

1. **Gleichverteilung je Würfel** — zwei Zähltabellen zu je sechs Feldern,
   `df = 5`.
2. **Unabhängigkeit der beiden Würfel** — die 6×6-Kreuztabelle, `df = 25`.
3. **Die Summenverteilung** (2…12) — reine Diagnose, keine Prüfgröße: sie ist
   eine Folge der ersten beiden Blöcke, und ein dritter Test auf denselben
   Daten wäre nur eine weitere Gelegenheit für einen Fehlalarm.
4. **Der Beleg, dass das Modell nicht hohl ist** — mittlere/größte
   Wurfdauer, mittlere Kippschritte und Bandenstöße je Würfel, Anteil der
   Würfe mit Zusammenstoß, Anteil ungültiger (wiederholter) Würfe, und die
   Zeile „Verwendete Werte" mit allen numerischen Exporten von
   `dice-physics.js` (siehe Tabelle oben) — maschinell ermittelt, nicht
   abgeschrieben.

**Die Gegenprobe „feste Startlage" ist der wichtigste Teil des ganzen
Nachweises.** Nach dem Hauptlauf läuft ein zweiter Lauf mit `runs / 5`
Würfen, bei dem **beide Würfel in jedem Wurf** mit derselben festen Lage
`[1, 2, 3]` starten — gezogen werden nur noch die Wurfparameter, nicht mehr
die Lage. Auch dieser Lauf muss `p > 0,01` je Würfel liefern. Der Grund: die
gezogene Startlage allein würde die Gleichverteilung schon erzeugen, selbst
wenn die Physik gar nichts mischte und der Würfel einfach liegen bliebe. Ein
bestandener Hauptlauf beweist deshalb für sich genommen **nicht**, dass die
Physik mischt — erst die Gegenprobe mit konstanter Startlage beweist es.

### Ergebnis von Messlauf M-C6-1

Gefahren am 7. September 2026 mit 500.000 gültigen Würfen, Saat 20260907,
`dice-physics.js` unverändert gegenüber dem ausgelieferten Stand:

- **Block 1, Gleichverteilung:** Würfel 0 χ²=1,128, df=5, **p=0,95158**,
  Tabelle `[83138, 83381, 83417, 83222, 83324, 83518]`; Würfel 1 χ²=4,254,
  df=5, **p=0,51340**, Tabelle `[83384, 83503, 82893, 83459, 83147, 83614]`.
- **Block 2, Unabhängigkeit:** χ²=19,574, df=25, **p=0,76880**.
- **Gegenprobe „feste Startlage"** (100.000 Würfe): Würfel 0 χ²=5,860,
  **p=0,32004**; Würfel 1 χ²=7,300, **p=0,19924**.
- **Block 4 (Beleg):** mittlere Wurfdauer 1,995 s, größte Wurfdauer 3,129 s,
  mittlere Kippschritte je Würfel 10,45, mittlere Bandenstöße je Würfel 1,33,
  Zusammenstoß in 23,14 % der Würfe, ungültige (wiederholte) Würfe 21,23 %
  (634.785 Versuche für 500.000 gezählte Würfe), Laufzeit Hauptlauf 66,6 s.

**BESTANDEN**, mit den in dieser Datei stehenden, bereits berichtigten
Auslegungswerten (`PYRAMID_SPIN = 0,7`, gezogene Gierdrehung 0,15–1,50
Umdrehungen/s).

**Die Lehre, ausdrücklich mit dokumentiert:** Mit den *vorherigen*
Auslegungswerten (`PYRAMID_SPIN = 0,35`, Gierdrehung 0,15–0,60) bestand der
Hauptlauf mit p=0,82 bzw. p=0,81 und die Unabhängigkeit mit p=0,57 — **alle
drei bequem über der Schranke**. Durchgefallen ist ausschließlich die
Gegenprobe „feste Startlage" (p=0,00082 bzw. p=0,00170, weit unter 0,01). Der
Hauptlauf allein hätte also ein zu schwach mischendes Modell durchgewinkt —
die gezogene Startlage allein reichte, um Block 1 und Block 2 bestehen zu
lassen, obwohl die Physik zu wenig dazu beitrug. Genau deshalb darf die
Gegenprobe nicht wegoptimiert oder übersprungen werden, auch wenn sie den
Nachweis verlängert: sie ist der einzige der vier Blöcke, der tatsächlich
misst, ob die **Physik** mischt, statt nur die gezogene Startlage
durchzureichen. Derselbe Warnhinweis steht im Kopfkommentar von
`measure-dice.mjs`.

Wiederholung:

```
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-dice.mjs --runs=500000 --seed=20260907
```

## Aufnehmen, Schütteln, Werfen

`throw-input.js` verdrahtet Maus, Finger und Stift über Pointer-Ereignisse
(`setPointerCapture()`, damit der Zug auch dann weiterläuft, wenn der Zeiger
die Wanne verlässt). Vier Zustände:

| Zustand | Auslöser | Was passiert |
|---|---|---|
| `bereit` | Anfangszustand | die Würfel liegen rechts an der Wurfkante |
| `hand` | `pointerdown`, wenn `isArmed()` zusagt | die Würfel folgen dem Zeiger |
| `schuetteln` | `pointermove` | je `SHAKE_STEP` (16 px) angesammelter Bewegung kippt **beide** Würfel einmal in Bewegungsrichtung — über `tipFaces()`, nichts wird dabei gezogen |
| `geworfen` | `pointerup` | die Wurfkraft aus den letzten rund 120 ms Zeigerbewegung wird zu einem `setup` und an `onThrow()` gereicht, zurück nach `bereit` |

**Die Mindestwurf-Regel im Ablauf.** Ein ungültiger Wurf wird nicht sofort
wiederholt — der Spieler soll sehen, wie weit die Würfel gekommen sind. Im
Zuschauen-Modus wirft der Tisch nach einer Sekunde von selbst erneut; beim
Selbst-werfen bleibt der Auslöser frei, und der Spieler wirft erneut.

**Die Wurfkraft macht das Ergebnis nicht steuerbar (T-6).** `CONCEPT.md` C.8.2
verlangt das ausdrücklich. Für die Wurfkraft-Schiene ohne Zeigegerät (Taste
„Würfel werfen") sah der ursprüngliche Plantext eine **feste, mittige
Startlage** vor. Eine gemessene Gegenprobe (Prüfung T-6 in
`verify-throw.mjs`) zeigt, dass eine feste Startlage in Verbindung mit fester
Wurfkraft — unabhängig vom genauen Kraftwert und über mehrere Zufallssaaten
hinweg reproduzierbar — eine deutlich ungleichmäßige Verteilung der Augenzahl
ergibt (p ≪ 0,001 bei mehreren geprüften Lage/Kraft-Paaren), während eine
**gezogene** Lage bei gleichzeitig fester Wurfkraft die Gleichverteilung
zuverlässig einhält (p zwischen 0,05 und 0,94 über dieselben Stichproben).
Mit der ursprünglichen Planvorgabe hätte ein Spieler, der die Schiene stets
auf denselben Wert stellt, einen Weg gehabt, das Ergebnis leicht zu
verschieben — genau das schließt C.8.2 aus. Berichtigt wurde deshalb
ausschließlich, welche Felder `craps.js` beim Druck auf den Auslöser
vorbelegt: **nur die Wurfkraft steht fest, die Lage wird gezogen**, genau wie
bei jedem Zuschauen-Wurf. Der Physikkern selbst blieb dabei unverändert.

## Der Ereignis- und Messpunktvertrag

**Neun Messpunkte am Wurzelelement** (`[data-ck-table]`), jeder mit genau
einem Schreiber — `craps.js` (Prüfung A-10/V-2):

| Messpunkt | Bedeutung |
|---|---|
| `data-cr-state` | `'ruht'` \| `'rollt'` \| `'liegt'` \| `'ungueltig'` |
| `data-cr-throws` | die Zahl aller bisherigen Würfe (`table.throws`) |
| `data-cr-valid` | `'ja'` \| `'nein'`, nur nach einem beendeten Wurf gesetzt |
| `data-cr-die-a` / `data-cr-die-b` | die Augenzahl je Würfel des letzten **gültigen** Wurfs |
| `data-cr-sum` | ihre Summe |
| `data-cr-round` | der Zustand des Rundenablaufs (`'setzen'`, `'gesperrt'`, `'laeuft'`, `'auswerten'`, `'auszahlen'`) |
| `data-cr-point` | der stehende Point, oder leer — steuert zugleich den Puck in `felt.css` |
| `data-cr-total` | die Bilanz aus Kasse, Buy-in und liegendem Einsatz (Nachweis R-3: nichts verschwindet, nichts entsteht aus dem Nichts) |

**Der Ton-Messpunkt** `data-cr-sound-on` (0/1, Ton-Schalter) kommt aus
`sound-craps.js` dazu, ebenso `data-cr-sound-sustained` — dieser steht seit
C7f **immer** auf `'0'` (siehe Abschnitt „Klang" oben), er zählt keinen
laufenden Dauerklang, weil dieser Tisch keinen hat.

**Neun Custom Properties je Würfelgruppe** (`[data-cr-die="0"]` /
`[data-cr-die="1"]`), geschrieben ausschließlich von `dice-view.js` (Prüfung
V-2): `--cr-x`, `--cr-y`, `--cr-h` (Ort und Höhe), `--cr-m11`, `--cr-m12`,
`--cr-m21`, `--cr-m22` (die Drehmatrix aus der Gierlage, kein Winkel) sowie
`--cr-sx`, `--cr-sy` (die Verkürzung beim Kippen, rein optisch). Während des
Aufnehmens und Schüttelns bewegt `throw-input.js` dieselben Gruppen
stattdessen über eine **eigene**, unabhängige Inline-Eigenschaft
(`style.transform`) und räumt sie beim Loslassen wieder ab — zwei getrennte,
sich zeitlich nie überlappende Schreibwege statt eines gemeinsamen.

**Weitere Haken, keine Messpunkte im engeren Sinn:** `[data-cr-tray]` (die
Wanne selbst), `[data-cr-power]` (die Wurfkraft-Schiene, 1–10),
`[data-cr-mode]` (die beiden Radioknöpfe `shoot`/`watch`) und
`[data-ck-table-go]`. **Dieser Auslöser steht weiterhin in `Throw.html`**,
zusammen mit Modewahl und Wurfkraft-Schiene, wo er seit Umsetzungsstück C6d
sachlich hingehört — `Table/Controls` wird in `Table.html` ausdrücklich
**ohne** das Argument `{go}` gerendert, damit dort kein zweiter,
toter Auslöser mit demselben Haken entsteht (`connectControls()` fände über
`querySelector` sonst nur den ersten).

**Drei Ansagewege, jeder mit einem Eigentümer.** `[data-ck-table-status]`
(geteilt: Chips und Bedienleiste) bekommt von `craps.js` ausschließlich das,
was `connectFelt()` über den `announce`-Rückruf übergibt. `[data-cr-status]`
(`role="status"`, craps-eigen) gehört ausschließlich `craps.js` und wird
**leer** ausgeliefert — ein Bereich, den ein Skript anlegt UND füllt, wird
von Hilfsmitteln nicht angesagt. `[data-cr-point-text]` (Partial
`Table/Craps/Round`) ist ausdrücklich **kein** dritter Live-Bereich, nur der
sichtbare, jederzeit ansteuerbare Point-Stand als gewöhnlicher Text (Prüfung
A-10d) — ein zweiter Live-Bereich für denselben Stand hieße, jeden Wurf
zweimal zu hören.

## Barrierefreiheit

**Tastaturalternative zum Ziehen (WCAG 2.2, SC 2.5.7 „Dragging Movements").**
Aufnehmen und Schütteln ist eine Ziehbewegung; die Wurfkraft-Schiene
(`<input type="range">`) plus die Taste „Würfel werfen" sind ihr
gleichwertiger Ersatz. Bewusst **kein laufender Kraftbalken**, den man im
richtigen Augenblick anhält: das machte die Wurfkraft von der Reaktionszeit
abhängig und wäre bei „Bewegung reduzieren" gar nicht mehr bedienbar. Die
Schiene ist stattdessen ein natives Bedienteil — Pfeiltasten, Pos1/Ende,
angesagter Wert, keine Zeitvorgabe.

**Zielgröße (SC 2.5.8).** Die Schiene ist 2,75 rem hoch, wie jedes andere
Bedienteil eines Tisches in diesem Haus.

**Fokusrahmen mit zwei Ringen (SC 1.4.11).** Der Messingring der Schiene
allein erreicht auf der hellen Bedienleiste keinen verlässlichen Kontrast
gegen jede Nachbarfarbe; ein zweiter, dunkler Ring (`box-shadow`) sitzt
zusätzlich außerhalb des Messingrings — dieselbe Bauart wie an jedem anderen
Bedienteil dieses Hauses, seit Behebung H-02 vom 2026-09-06.

**Leerer Live-Bereich**, siehe „Der Ereignis- und Messpunktvertrag" oben.

**`aria-disabled` statt `disabled`.** Der Auslöser wird nie mit einem echten
`disabled`-Attribut gesperrt: ein `disabled`-Knopf fiele aus der
Tastaturreihenfolge und beantwortete nicht, warum er gerade nicht geht.

**`prefers-reduced-motion: reduce`.** Wer das eingestellt hat, bekommt das
Ergebnis eines Wurfs sofort statt seines Ablaufs: `dice-view.js` lässt die
Physik unverändert vollständig durchrechnen (`table.roll(setup)` gefolgt von
`table.step()` bis zum Stillstand) und malt nur einmal, am Ende. Es entfallen
die Bilder, nicht die Rechnung.

**Die Modewahl ist eine echte Radiogruppe** in `fieldset`/`legend`, jede
Option zusätzlich über `aria-describedby` mit einer eigenen, kurzen Erklärung
verknüpft — ohne `legend` hörte ein Vorleseprogramm zwei zusammenhanglose
Optionen ohne die Frage dazu.

**Doppelaussage aus Augenzahlen und Summe.** Die Ansage nach einem gültigen
Wurf nennt beide Augenzahlen **und** ihre Summe (`throw.announce.result`,
„{0} und {1}, zusammen {2}"), nicht nur eine der beiden Formen.

**Sprunglink über 48 Tabstationen.** `.ck-skiplink.cr-felt__skip` (Partial
`Table/Craps/Felt`, direkt vor dem ersten Feldknopf) führt an den 48
Wettfeldern des Tuchs vorbei direkt zur Bedienleiste — ohne ihn müsste ein
Tastaturweg durch alle 48 Knöpfe, bevor er die Bedienung erreicht. Sichtbar
nur bei `:focus-visible`, damit die versteckte Position aus `base.css` nicht
durch eine bedingungslose Fassung aufgehoben wird.

**Rollbereich statt Schrumpfen (WCAG 2.2, SC 1.4.10), seit dem Umbau nach der
Bildvorlage (2026-09-08) auf das neue 96-Spuren-Gitter umgerechnet.** Der
ganze Tisch (`.cr-cloth`) ist mindestens `96 × 0,75 rem × 240/200` breit —
rund 1382 Bildpunkte bei 16 px Wurzelschriftgröße — und wird bei Platzmangel
**gerollt**, nicht verkleinert: die Zielgröße ist eine Zusage, die
Bildschirmbreite keine. Damit `overflow-x: auto` an `.cr-cloth__scroll`
überhaupt greift, muss `min-inline-size: 0` die ganze Rollkette hindurch
durchgelassen werden (ein Flex-Kind hat sonst von Haus aus `min-width: auto`
und schrumpft nie unter seine Inhaltsbreite) — siehe die Rollkette in „Der
Tisch als eine Fläche" oben.

**Zielgröße des neuen Gitters (SC 2.5.8), seit dem Umbau feldweise
gerechnet.** `--cr-track` ist 0,75 rem (12 Bildpunkte) — das ist NICHT mehr
die Zielgröße selbst, weil die Vorlage sehr verschiedene Feldbreiten zeigt
(Zahlenkasten, Don't-Come-Kasten, zwei Schenkel wie 4 : 5 : 4 : 3). Das
schmalste **Feld** (E/C-Kreisspalte, Don't-Pass-Schenkel) ist drei Spuren
breit, also 36 Bildpunkte; die niedrigste Feldzeile misst bei der
Mindestbreite rund 35,7 Bildpunkte hoch — beides über den geforderten 24, mit
Reserve. Prüfung **F-7** rechnet das für jedes der 48 Felder und beide
Schenkel einzeln nach, siehe „Das Tuch und seine Maßordnung" oben.

**Die gezeichnete Gegenseite ist reine Optik, kein zweites Bedienteil.** Die
linke Seitensektion zeigt dasselbe Bild wie die rechte, spiegelverkehrt — sie
trägt `aria-hidden="true"` und `pointer-events: none`, weil sie nichts
Eigenes zu setzen gibt: ein Doppel derselben 48 Felder wäre eine zweite,
verwirrende Tastaturstation für dieselbe Wette. Direkt davor steht deshalb
eine **sichtbare** Erklärung (`.cr-felt__mirror-hint`, nicht selbst
`aria-hidden`), die sagt, dass die linke Seite nur Bild ist — ein
Bildschirmleser überspringt die ausgeblendete Fläche ohnehin, sähe aber ohne
diesen Satz nicht, warum sie fehlt. Seit Umsetzungsstück Ue trägt auch die
Gegenseite den Schenkel der beiden L-förmigen Linienwetten (derselbe
Abschnitt „Aufdruck" wird für beide Seiten gerendert, F-16), weiterhin ohne
eigenes Klickziel (`pointer-events: none` am Schenkel selbst).

**„Label in Name" an den Chipknöpfen (SC 2.5.3), seit Umsetzungsstück Tb.**
Die Kauf- und Rückgabeknöpfe der Chipkasse (`Table/BuyIn.html`) zeigen
sichtbar nur „Kaufen"/„Zurück"; die Ergänzung „ein Chip zu … Euro" steht
zusätzlich, aber NUR für Hilfsmittel sichtbar, hinter dem sichtbaren Wort —
nicht als vorangestelltes `aria-label`. Der erreichbare Name muss mit dem
sichtbaren Text beginnen, sonst hört eine Spracheingabe „Kaufen" sagen und
trifft nichts (genau der Fehler aus Auditbefund H7-02 vom 2026-09-07).

**Der gesperrte Rückgabeknopf behält seinen Fokusrahmen.** Ist eine Chipsorte
leer, wird ihr Rückgabeknopf mit `aria-disabled="true"` markiert und optisch
abgeblendet (`opacity: 0.45`) — **außer** wenn er gerade den Fokus trägt
(`:not(:focus-visible)`): `opacity` wirkt auf das ganze Element einschließlich
`outline`/`box-shadow`, und beim Betreten des Tisches ist jede Sorte leer.
Ohne diese Ausnahme verlöre ein Tastaturbenutzer auf fünf Stationen
hintereinander seine Ortsangabe (dieselbe Bauart wie bei der Chipwahl,
Auditbefund H7-01).

**Der Place-Schalter ist ein natives Kontrollkästchen** (`[data-cr-place-working]`,
`aria-describedby="cr-working-hint"`) — ein Kontrollkästchen, kein Umschalter
wie der Ton-Schalter, weil er eine Einstellung sammelt statt sofort eine
Wirkung auszulösen (Abschnitt „Klang" oben erklärt den umgekehrten Fall).

**Form statt Farbe, auch auf der dunklen Seite (SC 1.4.1).** Die drei
`dontline`/`dontcome`/`dontpoint`-Feldgruppen bekommen einen doppelten
Rahmen statt nur eine andere Farbe — wer die beiden Grüntöne nicht
unterscheiden kann, sieht trotzdem, dass hier gegen den Schützen gesetzt
wird; der ausgeschriebene Name „Don't …" steht ohnehin im Aufdruck.

**Der Puck ist `aria-hidden` mit Textentsprechung.** Er trägt selbst keine
Aussage; was er zeigt, steht als gewöhnlicher Text in `.cr-round__point`
(siehe „Das Tuch und seine Maßordnung" oben).

**Jede craps-eigene Absage ist hörbar.** Eine Regelverletzung (Vertragswette,
kein Point, keine Grundwette, Odds-Höchstbetrag) wird im craps-eigenen
Live-Bereich `[data-cr-status]` angesagt, nie nur visuell markiert.

**Was ein Skript nicht beweisen kann.** `verify-view.mjs` (V-1 bis V-14),
`verify-throw.mjs` (T-1 bis T-9), `verify-felt.mjs` (F-1 bis F-24),
`verify-round.mjs` (R-1 bis R-13) und `verify-sound.mjs` (S-1 bis S-9)
prüfen Quelltext, Rechnung und Verhalten, nicht das Erlebnis: ob das Werfen
und Setzen mit einem echten Vorleseprogramm und auf einem kleinen Bildschirm
tatsächlich angenehm ist, und ob der Klang gut klingt und an kein bestimmtes
fremdes Spiel erinnert, kann kein Skript beantworten. Das gehört als von Hand
zu prüfender Schritt in `test.txt`.

## Prüfskripte

```
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-cabinet.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-tray.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-physics.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-view.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-throw.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-bets.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-wagers.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-felt.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-round.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-sound.mjs
```

Alle zehn nur lesend, ohne jede Abhängigkeit außer `stats.mjs` (von
`verify-physics.mjs` und `measure-dice.mjs` mitbenutzt), Laufzeit je unter
zwei Sekunden. Rückgabewert 0, wenn alles stimmt, sonst 1.

`verify-cabinet.mjs` (Kennungen A-1 bis A-11): keine eigene Farbe, jeder
benutzte Design-Token existiert, keine Datei von außen, `casino_startpage`
kennt dieses Gerät nicht im Code, kein fremder Hersteller-, Modell-,
Spielbank- oder Spieltitel (Negativliste, einschließlich der Würfel- und
Craps-Seitenwetten-Begriffe dieser Extension), die Lizenzangaben widersprechen
sich nicht, Kachel und Spielseite zeigen dieselbe Bauform, der
Gehäuse-Vertrag stimmt (einschließlich: kein `<text>`), das Kürzel-Präfix
`cr-` wird eingehalten, Anmeldung/Live-Bereiche/Messpunkte stimmen, und
höchstens ein `f:asset.module` ist eingebunden.

`verify-tray.mjs` (Kennungen D-1 bis D-12): die Maßordnung steht in
`Cloth.html` (seit Umsetzungsstück Td, zuvor `Tray.html`) wörtlich so wie in
`dice-geometry.js`, die vier Gummileisten liegen auf den vier
Bandeninnenkanten mit der richtigen `<pattern>`-Teilung, genau zwei
Würfelgruppen liegen innerhalb der Spielfläche, jede der sechs Flächen trägt
die richtige Zahl Augen an der richtigen Stelle, kein Schriftzeichen als
Auge, die 24 Lagen sind vollständig/doppelfrei/rechtshändig/geschlossen
(D-6), die Farben tragen ausreichend Kontrast, die Zeichnung hat keinen
erreichbaren Namen und keinen Fokus, und jede benutzte Custom Property hat
einen Vorgabewert. **D-10** (neu, Td): `Cloth.html` und `Dice.html` tragen
dieselbe Maßordnung, und `felt.css` legt das Gitter prozentual genau darauf.
**D-11** (neu, Td): ein Wettfeld löst keinen Wurf aus — `pointer-events` an
der Würfelschicht, `data-cr-tray` genau einmal. **D-12** (neu, Te): der
Körper liegt im Bildschirmraum, nicht im Körperraum — `translate()` vor
`matrix()`, die Lift-Vielfachen wachsen streng 0/1/2.

`verify-physics.mjs` (Kennungen P-1 bis P-11, Laufzeit unter zwei Sekunden):
nur bitgenau festgelegte Rechenarten, Wiederholbarkeit bei gleicher Saat und
die Gegenprobe bei verschiedener Saat, kein Würfel verlässt je den Tisch und
keiner bleibt auf einer Kante liegen, jeder Wurf endet mit genau zwei
Augenzahlen, die Notbremse greift nie, alle sechs Flächen kommen vor (P-7,
die wichtigste Falle des Modells), die Würfel erleben wirklich etwas und das
Auslegungsband stimmt (P-8), die doppelt geführten Zahlen zwischen
`dice-physics.js` und `dice-geometry.js` stimmen überein (P-9), und das
Verwerfungsverfahren zieht sauber (P-10). **P-11** (neu, Te): `dice-physics.js`
und `dice-geometry.js` sind buchstabengleich zu ihrem Stand vor Phase T — der
Nachweis, dass die plastische Optik der Würfel kein einziges Zeichen Physik
verändert hat.

`verify-view.mjs` (Kennungen V-1 bis V-14): genau ein `f:asset.module` und es
ist `craps.js`, jeder Live-Bereich leer und jeder Messpunkt hat genau einen
Schreiber, die drei rechnenden Dateien sind import- und dokumentfrei, jedes
Bedienteil ist ein natives Element, Zielgrößen und Fokus stimmen, im Spiel
wird nur echter Zufall eingespeist (V-6), kein deutscher Anzeigetext steht im
JavaScript, `craps.js` rechnet nichts und entscheidet nichts (V-8), die
Bewegungsdrosselung ist gebaut, die Zeichenschleife hört auf
`visibilitychange` und räumt ab, alle benutzten XLIFF-Kennungen existieren
und keine ist unbenutzt, jeder Abbruchpfad sperrt den Auslöser und sagt einen
eigenen Satz an, die Ansage nennt beide Augenzahlen und die Summe (V-13), und
die Drehmatrix wird aus dem Vektor geschrieben, nicht aus einem Winkel.

`verify-throw.mjs` (Kennungen T-1 bis T-10, rechnet mit `dice-physics.js`
selbst): ein vollständig übergebenes `setup` wird unverändert übernommen,
fehlende Felder werden aus dem eingespeisten Geber gezogen, die
Mindestwurf-Regel greift in beide Richtungen, `wurfBisGueltig()` wiederholt
wirklich und liefert nur Gültiges, die Wurfkraft wirkt monoton auf die
Wurfweite, die Wurfkraft macht das Ergebnis **nicht** steuerbar (T-6, siehe
„Aufnehmen, Schütteln, Werfen" oben), die Schüttellage wirkt, aber wird nicht
zum Ergebnis, die Umrechnung der Zeigergeschwindigkeit ist nachvollziehbar,
und die Wanne bleibt dicht, auch bei sinnlosen Eingaben. **T-10** (neu, Te):
der Handversatz wird vollständig abgeräumt — jeder Weg zu
`raeumeDarstellungAuf()` entfernt `data-cr-hand` UND `--cr-hx`/`--cr-hy`,
`male()` setzt alle drei.

`verify-bets.mjs` (Kennungen B-1 bis B-13): `bets-craps.js` ist import- und
dokumentfrei, genau 48 Felder im richtigen Muster, jede Wettart aus Anhang H
kommt vor und keine, die er nicht kennt, `RATIO` und jeder Höchsteinsatz
stimmen mit Anhang H überein, die Odds-Staffel 3-4-5× arbeitet bei allen
sechs Points, **der rechnerische Quotennachweis** (B-9, 36 gleich
wahrscheinliche Würfelpaare, exakte Brüche) und **Odds mit Hausvorteil exakt
0** (B-10), `matches()` wirft, und `ROUND_MAX` liegt zwischen dem größten
Einzelhöchsteinsatz und der Summe aller Höchsteinsätze ohne Odds. **B-13**
(neu, Ua): die Halbierung von Craps & Eleven geht bei jedem ganzen Einsatz
auf, siehe „C & E" oben.

`verify-wagers.mjs` (Kennungen W-1 bis W-15): `wagers-craps.js` ist import-
und dokumentfrei, Come-out/Point-Phase/Come/Don't-Come laufen über alle 36
Würfelpaare regelrecht, Odds folgen ihrer Grundwette, Place ruht beim
Come-out, Field und die sechs Einmalwetten lösen sich nie als `'stay'` auf,
eine erschöpfende Probe über 48 Felder × 7 Zustände × 36 Paare = 12 096
Urteile, die Bilanzprobe je Urteil, jede der sechs Absagen von `mayPlace()`
sitzt an der richtigen Stelle, und **der Quotennachweis am echten
Zustandswerk** (W-15) — eine von B-9 unabhängige zweite Herleitung derselben
Zahlen, einschließlich der neuen Zeile „Craps & Eleven".

`verify-felt.mjs` (Kennungen F-1 bis F-24): `BetLayout.php` und
`bets-craps.js` stimmen Feld für Feld überein, die Knopf-Vorlage ist ein
echtes `<button type="button">`, jedes Feld trägt `aria-label` und
`data-ck-field-label` mit demselben Inhalt, alle 48 Felder liegen innerhalb
des 96×11-Gitters ohne Überlappung, Zielgröße und Kontrast stimmen
(einschließlich der dunklen Odds-Streifen), Form statt nur Farbe auf der
dunklen Seite (F-10), der Sprunglink ist das erste fokussierbare Element.
**F-14**: der Spiegel der linken Seitensektion ist vollständig und
rechnerisch richtig — `mirrorCol`/`mirrorColEnd` stimmen für alle 38
gespiegelten Felder, die Mittensektion bleibt ungespiegelt. **F-15**: der
Aufdruck ist unsere Auszahlung aus Anhang H, nicht die eines fremden Plans.
**F-16**: der Spiegel ist keine Falle — `aria-hidden`, kein `<button>`, kein
`<a>`, kein `tabindex`, kein `data-ck-field`, `pointer-events: none`, und der
gespiegelte Schenkel liegt wirklich im Abschnitt „Aufdruck", nicht nur in
einer Regel, die im Markup nichts träfe (Umsetzungsstück Ue). **F-17** (neu,
Ub): beide Schenkel der L-förmigen Linienwetten liegen genau dort, wo
`BetLayout::legLanes()` sie hinlegt, mit ausdrücklichem Verbot von `opacity`,
`clip-path`, `mask` und `overflow: hidden` an dieser Stelle — jedes davon
nähme den gemeinsamen Fokusrahmen von Band und Schenkel mit. **F-18** (neu,
Ub, seit Uc scharf geschaltet): die drei geschwungenen Bandlinien aus
`Cloth.html` treffen die Gitterkanten, laufen parallel und haben positive
Eckenhalbmesser. **F-19** (neu, Ub): die Ecke, in der ein anderes Haus
BIG 6 / BIG 8 drucken würde, trägt kein Feld. **F-20** (neu, Ub): jedes
gedruckte Würfelpaar ergibt die Zahl seines Feldes (ein Hardway-Paar ist ein
Pasch, ein Bar-Paar zeigt die 12). **F-21** (neu, Ub): genau die Kästen SIX
und NINE stehen schräg. **F-22** (neu, Ub): jede englische Aufschrift trägt
`lang="en"`, reine Ziffern tragen keines. **F-23** (neu, Ub): jeder
erreichbare Name enthält seine sichtbare englische Aufschrift und, wo eine
Zahl gedruckt ist, beide Zählweisen. **F-24** (neu, Ub): jede Aufschrift
steht wörtlich in der Abschrift der Vorlage, kein Umlaut und kein
`f:translate` gerät auf das Tuch.

`verify-round.mjs` (Kennungen R-1 bis R-13): `round-craps.js` ist import- und
dokumentfrei, die acht Schritte von `onRest()` laufen in der richtigen
Reihenfolge, **die Bilanz nach 300 gesetzten Würfen stimmt auf den Euro**,
Come-out/Point/Seven-out laufen regelrecht, Chips wandern statt zu
verschwinden, Vertragswetten (Sockel) und die Odds-Staffel greifen beim
Setzen, Odds zählen nicht in die 300 €, ein ungültiger Wurf sperrt nichts,
`mayThrow()` und eine geschlossene Bank verhalten sich richtig, `craps.js`
entscheidet nichts selbst (R-12), und ein langer Zufallslauf ohne
Bildschirm besteht.

`verify-sound.mjs` (Kennungen S-1 bis S-9): keine Audiodatei, kein
Netzzugriff, kein eigener `AudioContext`, `sound.unlock()` nur aus einem
echten (`isTrusted`) Zeiger- oder Tastaturereignis, jeder Klangschlüssel
beginnt mit `cr-` und ist eindeutig, **kein Dauerklang** — `data-cr-sound-sustained`
steht immer auf `'0'` —, `destroy()` räumt vollständig ab und ist mehrfach
aufrufbar, die Geldantwort ist eine einzige `if`/`else if`-Kette mit genau
einer klingenden Antwort, keine Melodie, und der Ton-Schalter erreicht den
geforderten Kontrast.

`measure-dice.mjs` und `measure-payout.mjs` sind kein Teil dieser Liste —
sie sind die beiden langen Messläufe (siehe unten) und laufen nicht bei
jeder Umsetzung mit.

Die Skripte ersetzen keinen Blick auf das Gerät: ob es richtig **aussieht**,
ob sich Tastatur und Bildschirmleser wirklich richtig anfühlen, kann kein
Skript beantworten (siehe „Barrierefreiheit" oben).

## Der lange Messlauf

```
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-dice.mjs --runs=500000 --seed=20260907
```

**Erwartete Laufzeit, als gemessene Größe, nicht als Planschätzung** — beim
anderen Tisch lag eine reine Schätzung um den Faktor 50 daneben. Eigene
Selbsttests vor dem vollen Lauf:

| Umfang | Laufzeit Hauptlauf | Laufzeit Gegenprobe | Gesamt (`ddev exec`, inkl. Node-Start) |
|---|---|---|---|
| 20.000 | 2,0 s | 0,5 s | 3,3 s |
| 100.000 | 23,4 s | 3,3 s | 27,8 s |

Linear auf 500.000 hochgerechnet ergäbe das rund 117 s Hauptlauf plus rund
17 s Gegenprobe, zusammen rund 135–150 s. **Tatsächlich gemessen** hat der
volle Lauf (Messlauf M-C6-1, 7. September 2026, siehe „Gleichverteilungs- und
Unabhängigkeitsnachweis" oben) **66,6 s** für den Hauptlauf — spürbar
schneller als die lineare Hochrechnung aus den kleinen Selbsttests, vermutlich
weil die Selbsttests unter merklich schwankender Auslastung des
Entwicklungscontainers liefen. Maßgeblich ist die tatsächlich gemessene Zahl
aus M-C6-1, nicht die Hochrechnung.

### `measure-payout.mjs` — die Auszahlungsmessung (Umsetzungsstück C7f)

```
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-payout.mjs --rounds=500000 --seed=20260907
```

Die Gegenprobe zur **Verdrahtung**, nicht zur Tabelle: der rechnerische
Quotennachweis steht bereits zweifach unabhängig fest (B-9/B-10 aus den 36
Würfelpaaren, W-15 am echten Zustandswerk). Dieses Skript spielt echte Würfe
über `CrapsRound`, `CrapsWagers`, `table-bets.js` und `table-buyin.js` mit
echter Physik (`DiceTable`, `wurfBisGueltig()`), setzt vor jedem Wurf, was
die Regeln in diesem Zustand zulassen (siehe Kopfkommentar der Datei), und
vergleicht am Ende drei Dinge: die Bilanz auf den Euro, die Rückflussquote
je Wettart (14 Zeilen aus Anhang H, seit Umsetzungsstück Ua einschließlich
„Craps & Eleven", mit einer Toleranz aus vier
Standardabweichungen der tatsächlichen Rundenzahl) und — rein zum Beleg,
keine Prüfgröße — den Punktverlauf.

**Läuft nicht bei jeder Umsetzung mit** (`DECISIONS.md`, 2026-09-04, hier auf
Craps übertragen): der Agentenlauf hat drei Selbsttests gefahren, nicht den
vollen Lauf.

| Umfang | Laufzeit | Ergebnis |
|---|---|---|
| 2.000 | 0,5 s | bestanden (Bilanz stimmt, alle 13 Zeilen in Toleranz) |
| 20.000 | 4,1 s | bestanden |
| 50.000 | 11,8 s | bestanden |

Hochgerechnet auf 500.000 Würfe (Faktor 10 gegenüber dem letzten,
größten Selbsttest): rund **118 Sekunden**, also knapp zwei Minuten. Diese
Hochrechnung beruht auf einer echten Messung, nicht auf einer Schätzung.

## Stand

Version 0.4.0 (alpha). Beim Bauen wurde nicht hochgezählt (`CONCEPT.md` V.6);
die Zahl kam beim Feierabend des 2026-09-09 auf den projektweiten Stand, den
alle neun Extensions gemeinsam tragen. Phase C6 UND Phase C7 sind
**vollständig eingearbeitet**:

- **C6a** — Gerüst, Anmeldung bei der Registry als Spieltisch, Kachel im
  Saal, leere Spielseite.
- **C6b** — die Wanne mit Messingkante, grünem Tuch und Pyramidengummi, die
  Maßordnung, die Würfelzeichnung und die 24 Lagen.
- **C6c** — der Zufalls- und Physikkern (`dice-physics.js`), der
  Gleichverteilungs- und Unabhängigkeitsnachweis einschließlich der
  Gegenprobe „feste Startlage", und der lange Messlauf M-C6-1 (bestanden,
  siehe oben).
- **C6d** — die Ansicht, Aufnehmen/Schütteln/Werfen mit Maus, Finger und
  Tastatur, die Mindestwurf-Regel im Ablauf, der Ereignis- und
  Messpunktvertrag, und die Barrierefreiheit dieser Bedienung.
- **C6e** — diese Dokumentation, die erweiterte Negativliste in
  `verify-cabinet.mjs` und die Copyright-Vorarbeit nach `CONCEPT.md` V.7
  (siehe `DECISIONS.md`).
- **C7a** — `bets-craps.js`: die 47 Felder, ihre Quoten als exakte Brüche,
  die Staffel 3-4-5×, `verify-bets.mjs` (B-1 bis B-12) einschließlich des
  rechnerischen Quotennachweises.
- **C7b** — `wagers-craps.js`: der Wettzustand über mehrere Würfe, die
  fünf Urteile (`win`/`loss`/`push`/`stay`/`move`), `verify-wagers.mjs`
  (W-1 bis W-15) einschließlich des Quotennachweises am echten Zustandswerk.
- **C7c** — die geteilten Bausteine des Site Packages um
  `countsToRoundMax` und den Sockel-Mechanismus (`freeze`) erweitert,
  rückwärtsverträglich für Roulette und Blackjack (siehe „Geld am Tisch"
  oben und `casino_startpage/README.md`).
- **C7d** — das Tuch: `Classes/BetLayout.php`, `FeltProcessor.php`, die 47
  Feldknöpfe, der Puck, der Sprunglink, `verify-felt.mjs` (F-1 bis F-13).
- **C7e** — Geld, Runde und Verdrahtung: `round-craps.js`, die neue
  `craps.js`, `verify-round.mjs` (R-1 bis R-13, einschließlich der Bilanz
  nach 300 gesetzten Würfen).
- **C7f** — Klang (`sound-craps.js`, `verify-sound.mjs`, S-1 bis S-9), die
  erweiterte Negativliste und diese Dokumentation, sowie das Werkzeug für
  den langen Auszahlungs-Messlauf (`measure-payout.mjs`, siehe oben).

Phase T (Tischumbau, Ansage vom 2026-09-07) ist ebenfalls **vollständig
eingearbeitet**: der Craps-Tisch ist eine einzige Fläche statt zweier
Zeichnungen (`Cloth.html`/`Dice.html` statt `Tray.html`), die Würfel sind
plastisch gezeichnet, ohne dass ein Zeichen Physik sich geändert hat (P-11),
und Chips werden an jedem Tisch einzeln gekauft und zurückgegeben statt über
ein Betragsformular. Der Spielplan selbst folgte in Phase T zunächst einem
28×9-Raster mit drei Sektionen (abgelöst vom noch früheren 12×11-Gitter);
seit dem Umbau nach der Bildvorlage (Ansage vom 2026-09-08, Plan
„Craps-Tuch nach Vorlage") steht stattdessen die 96×11-Anordnung aus „Das
Tuch und seine Maßordnung" oben — dasselbe Vorbild, jetzt anhand des
tatsächlichen Bildes statt nur seiner verbalen Beschreibung nachgebaut.

Der Tisch ist damit **vollständig spielbar**: Pass Line, Come, Field, Hard
Ways und alle übrigen Wetten aus `CONCEPT.md` Anhang H, Point und Puck,
Auszahlungen, ein Verlaufsstreifen, Klang, der Buy-in an diesem Tisch und die
geteilte Bedienleiste. Ausdrücklich **nicht** gebaut, mit Begründung im Plan
(Abschnitt 9): Big 6/Big 8 und Buy-/Lay-Wetten (Anhang H erlaubt sie, ein
Grund dafür fehlt), die zwei hohen Chips (500 €/1.000 €, `CONCEPT.md` C.4.1:
„werden jetzt noch nicht gebaut"), sowie mehrere Personen an einem Tisch,
eine Zeituhr und ein QR-Konto (Teil D, `CONCEPT.md` C.10).

**Bauabschnitt U** (Umsetzungsstücke Ua bis Ue, Plan „Craps-Tuch nach
Vorlage") hat den Umbau nach der Bildvorlage fertiggestellt: Aus den
ursprünglich 47 Wettfeldern sind **48** geworden — das neue Feld **C & E**
bildet die sieben Kreispaare der Vorlage als ein einziges Wettfeld mit
einem Tabstopp ab (siehe „C & E" oben). `verify-felt.mjs` ist danach von
zwölf auf zwanzig Prüfungen gewachsen, alle grün. Anschließend hat ein
eigener Gestaltungslauf dem Tisch Material, Licht und Rhythmus gegeben,
ohne eine der Prüfungen zu verletzen. Die Copyright-Prüfung nach
`CONCEPT.md` V.7 ist für den umgebauten Tisch abgeschlossen und ohne
offenen Punkt der Kategorie „ändern vor Veröffentlichung". Mit **Phase C8**
ist Teil C insgesamt abgenommen: 36 PASS, 0 FAIL, 0 BLOCKED im Abnahmetest,
plus fünf von Hand nachgemessene Bedienläufe.
