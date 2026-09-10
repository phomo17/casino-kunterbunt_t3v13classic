# FruitRisk

## Zweck

Vierter Automat des Spaß-Casinos **Casino Kunterbunt**: ein breiter
Fruchtautomat mit sechs Walzen und fünf Reihen, gebaut um ein Risikospiel
herum, das nach jeder Runde entscheidet, was aus dem Gewinn wird.

Diese Extension enthält alles, was dieses Gerät ausmacht. Sie lässt sich
installieren und entfernen, ohne dass an `casino_startpage` oder an einer
anderen Extension etwas geändert werden muss.

## Eckdaten

| | |
|---|---|
| Extension-Key | `fruit_risk` |
| Composer-Name | `phomo17/fruit-risk` |
| Namespace | `Phomo17\FruitRisk\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.4.0 |
| Import-Map-Präfix | `@phomo17/fruit-risk/` |
| CSS-Präfix | `fr-` |
| Lizenz | AGPL-3.0-or-later |
| Quelltext | https://github.com/phomo17/casino-kunterbunt_t3v13classic |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate fruit_risk
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach im Backend (oder über das Wegwerfskript
`build-fruit-risk-structure.php` im Projektstamm, zuerst mit `--dry-run`):

1. Unterhalb der Startseite eine Seite **FruitRisk** mit dem URL-Segment
   `/fruit-risk` anlegen — **ohne** eigenes Backend-Layout.
2. Auf diese Seite in der Spalte „main" ein Inhaltselement **„FruitRisk"**
   legen. Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Automaten wählen und als Zielseite die Seite aus Schritt 1 angeben.
4. Cache leeren und beide Seiten aufrufen.

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: FruitRisk::IDENTIFIER,
    title: FruitRisk::LANG_FRONTEND . 'automat.title',
    description: FruitRisk::LANG_FRONTEND . 'automat.description',
    extensionKey: FruitRisk::EXTENSION_KEY,
    cabinetPartial: FruitRisk::CABINET_PARTIAL,
));
```

Die Gattung wird bewusst **nicht** genannt: sie ist der letzte
Konstruktorparameter mit dem Vorgabewert `Gattung::Automat`, und FruitRisk ist
ein Automat. Nichts zu nennen ist hier die richtige Angabe, nicht eine
fehlende.

`register()` hängt `Resources/Private/Partials/` automatisch an die
`partialRootPaths` des Inhaltselements „Casino-Automat" an. Eine weitere
Anmeldung für die Saal-Ansicht gibt es nicht.

Alle festen Bezeichner — Registry-Schlüssel, `CType`, Gehäuse-Partial, Icon,
der Schlüssel des Gerätekredits und die beiden XLIFF-Präfixe — stehen
ausschließlich in `Classes/FruitRisk.php`.

## Inhaltselement „FruitRisk"

| | |
|---|---|
| `CType` | `fruit_risk` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.fruit_risk` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()`; seit Phase F3 mit `dataProcessing` (`fruit-risk-cabinet`, siehe „Die Mathematik") |
| Template | `Resources/Private/ContentElements/Machine.html` |
| Stylesheet | `Resources/Public/Css/machine.css`, eingebunden per `<f:asset.css>` und damit nur auf Seiten geladen, auf denen das Element steht |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht erst ab
Phase F4 im Browser.

Bewusst **kein** eigenes Site Set für das TypoScript: ein Set wirkt erst,
wenn die Site-Konfiguration es einbindet — ein weiterer Automat müsste dafür
`typo3conf/sites/casino-kunterbunt/config.yaml` ändern, und genau das
verbietet der Architektur-Grundsatz, dass eine Geräte-Extension ohne
Änderung an anderen Stellen installierbar ist.

## Die beiden Zeichnungen

Es gibt **zwei** Zeichnungen, und sie sind nicht zu verwechseln:

| Datei | Wofür |
|---|---|
| `Resources/Private/Partials/Automat/FruitRisk/Cabinet.html` | die **Miniatur** im Saal. Vertrag aus `casino_startpage/README.md`: genau ein `.ck-cabinet`, darin genau ein `<svg class="ck-cabinet__drawing">` mit `viewBox`-Verhältnis 100 : 160. Breite, Podest, Schattenwurf und Licht von oben liefert der Saal. |
| `Resources/Private/Partials/Automat/FruitRisk/Machine/Shell.html` | das **große Gehäuse** auf der Automatenseite, `viewBox 0 0 160 160` — 60 % breiter als die vorhandenen Geräte bei gleicher Höhe. |

Beide zeigen dasselbe Gerät. Die Miniatur ist nur in das schmalere Format
100 : 160 der Saal-Reihe gestellt: der breite Eindruck bleibt erhalten, weil
der Korpus fast die volle Rahmenbreite einnimmt und die Schultern
abgeschrägt statt gerundet sind.

Beide Zeichnungen zeigen inzwischen **alle zwölf Symbole** – acht davon
zeichengleiche Kopien aus `video_slot` (Kirsche, Zitrone, Orange, Melone,
Glocke, Sieben, Pflaume, Weintraube), nur mit geändertem ID-Präfix; vier neu
konstruiert (Erdbeere, Banane, Apfel, Ananas). Die gezeigte Stellung der
dreißig Felder ist in Saal-Miniatur und großem Gehäuse **dieselbe** und seit
Phase F3 **endgültig**: Sie ist keine freie Wahl, sondern folgt zwingend aus
den Positionen 0 bis 4 der sechs Walzenbänder (`Rules::STRIPS`) und steht als
`Rules::DEFAULT_GRID` fest (siehe „Die Mathematik" unten). Diese Extension
definiert **keine eigenen Farben**.

### Herkunft der vier neuen Motive

Für die Copyright-Prüfung nach CONCEPT.md V.7, die unmittelbar nach Phase F2
fällig wird:

- **Erdbeere, Banane und Apfel** gehen auf die Kaugummi-Fruchtsorten von 1913
  zurück, mit denen die Symbolik der mechanischen Spielautomaten begann – als
  Motiv seit über hundert Jahren branchenweites Allgemeingut, unabhängig von
  jedem einzelnen Hersteller.
- Bei der **Ananas** widersprechen sich die verfügbaren Quellen darüber, ob
  sie zu diesem ursprünglichen Sechser-Satz gehörte oder erst später
  dazukam; beide Lesarten führen zum selben Ergebnis – ein Gattungsmotiv,
  das niemandem gehört.
- **Keine Vorlage wurde abgezeichnet.** Jede der vier Formen ist aus
  Grundformen konstruiert (Kreis, Ellipse, Dreieck, Kreisbogen, Rechteck);
  für jedes Motiv wurden mindestens drei verschiedene Vorlagen aus
  verschiedenen Quellen angesehen und zu etwas Eigenem verbunden. Die
  Vorlagen selbst liegen nicht im Projekt.
- **Silhouettenprobe:** Erdbeere ist eine Herzform mit Kelch, Banane eine
  Sichel aus zwei Kreisbögen, Apfel zwei überlappende Kreise mit Einkerbung,
  Ananas eine Fasstonne mit Rautengitter und Krone. Keine dieser vier Formen
  bildet den Umriss eines bestimmten fremden Symbolsatzes nach.
- Eine **Bildmarken-Recherche nach Wiener Klassifikation** für diese vier
  Motive war maschinell nicht möglich und bleibt – wie die
  Rückwärtssuche über ein Bildschirmfoto des fertigen Geräts – als
  menschliche Aufgabe offen (CONCEPT.md C.14.18).

Das ist eine Aufzählung dessen, was bei der Herkunftsprüfung berücksichtigt
wurde – **keine Aussage über die rechtliche Unbedenklichkeit**. Ob die
Motive tatsächlich frei von fremden Rechten sind, kann nur eine Prüfung
durch Menschen (Marken- und Bildmarkenrecherche) feststellen.

## Das Maßraster

Der viewBox der großen Zeichnung ist `0 0 160 160`. Weil bei einem 160er
Raster ein `1cqi` bereits 1,6 viewBox-Einheiten sind, nicht eine, legt
`machine.css` eine eigene, ehrliche Einheit einmalig fest:
`--fr-u: 0.625cqi` (= 100 / 160). Jede Positionsangabe eines HTML-Teils
lautet `calc(<Zahl aus der Koordinatentabelle> * var(--fr-u))` – dieselbe
Koordinate gilt dadurch in beiden Achsen gleich. Die Koordinatentabelle im
Kopf von `machine.css` ist seit Phase F2 **vollständig für die tragenden
Maße** (Zonen, ihre Ränder und die Lage jedes HTML-Teils: Fenster,
START/STOP-Feld, Röhrenplatte, Bedienfeld, Gewinnplan, Geldeinbauten im
Sockel) und bleibt deren **einzige Quelle**; eine tragende Koordinate, die
in der Zeichnung steht und dort fehlt, ist ein Fehler. Zierteile innerhalb
einer Zone (Glanzbänder, Leisten, Innenkanten) stehen nur in der Zeichnung
selbst, nicht in der Tabelle.

## Das Bedienfeld

Fünfzehn Bedienteile, alle als echte `<button>`, alle mit eigenem Namen:

| Bauform | Bedienteil | Sichtbare Aufschrift / erreichbarer Name | Wirksam ab |
|---|---|---|---|
| viereckig, 19 × 19 | START | „START" | Phase F4 |
| viereckig, 19 × 19 | STOP | „STOP" | Phase F4 |
| Kappe, 20 × 10 | AUTO MODE | „AUTO MODE" | Phase F5 |
| rund, ⌀ 7,4, Kreuz | RISK x8 oben | „Risiko x8 oben" (aria-label) | Phase F5 |
| rund, ⌀ 7,4, Kreuz | RISK x8 links | „Risiko x8 links" (aria-label) | Phase F5 |
| rund, ⌀ 7,4, Kreuz | RISK x8 rechts | „Risiko x8 rechts" (aria-label) | Phase F5 |
| rund, ⌀ 7,4, Kreuz | RISK x8 unten | „Risiko x8 unten" (aria-label) | Phase F5 |
| flach, 16,8 × 2,6 | RISK x8 START | „RISK x8 START" (sichtbare Aufschrift) | Phase F5 |
| rund, ⌀ 7,4, Paar | RISK x4 links | „Risiko x4 links" (aria-label) | Phase F5 |
| rund, ⌀ 7,4, Paar | RISK x4 rechts | „Risiko x4 rechts" (aria-label) | Phase F5 |
| flach, 16,8 × 2,6 | RISK x4 START | „RISK x4 START" (sichtbare Aufschrift) | Phase F5 |
| rund, ⌀ 7,4, Paar | RISK links | „Risiko links" (aria-label) | Phase F5 |
| rund, ⌀ 7,4, Paar | RISK rechts | „Risiko rechts" (aria-label) | Phase F5 |
| flach, 16,8 × 2,6 | RISK START | „RISK START" (sichtbare Aufschrift) | Phase F5 |
| Kappe, 20 × 10 | REWARD | „REWARD" | Phase F5 |

Für sichtbaren Text am Gerät gilt „RISK" bzw. „Risiko", nicht der andere, im
deutschen Markt stark mit einem Hersteller verknüpfte Begriff für eine
Risikoleiter – der erscheint an diesem Gerät nirgends (CONCEPT.md C.14.18).

Die acht Risiko-Tasten leuchten **selbst**: Es gibt keine getrennten
Lichtfelder daneben, gedrückt wird die Taste, die im jeweiligen Moment
leuchtet. START, STOP, AUTO MODE und REWARD tragen keinen eigenen
Leuchtzustand. In Phase F2 tut **keine** der fünfzehn Tasten etwas – sie sind
gezeichnet, benannt und mit der Tabulatortaste erreichbar, aber ohne
Wirkung.

## Die drei Risikospiele

Jede Runde endet im Angebot (Gewinngarantie, C.14.7 — es gibt keine Runde ohne
Gewinn und damit keine ohne Angebot). Wer den Gewinn nicht sofort mit
`REWARD` gutschreiben lässt, wählt eines von drei unabhängigen Risikospielen
– durch einen Druck auf dessen **Starttaste**:

| Risikospiel | Tasten | Faktor je Treffer | Trefferfenster je Stufe | Reihenfolge | Pause nach vollem Umlauf |
|---|---|---|---|---|---|
| RISK | `risk-start` (Start) · `risk-left`, `risk-right` (2 Seiten) | × 2 | flach: 200 ms Periode, Fenster 89/75/64/54/46/40 ms | je Stufe neu gezogen (klassisches Hin und Her) | keine (Umlauf 400 ms) |
| RISK x4 | `risk4-start` (Start) · `risk4-left`, `risk4-right` (2 Seiten) | × 4 | steil: 200 ms Periode, Fenster 64/46/40 ms | je Stufe neu gezogen | keine (Umlauf 400 ms) |
| RISK x8 | `risk8-start` (Start) · `risk8-left`, `risk8-right`, `risk8-up`, `risk8-down` (4 Seiten) | × 8 | steil: 200 ms Periode, Fenster 64/46/40 ms | **je Umlauf neu gezogen** – kein Rhythmus erlernbar | 64/46/40 ms je nach Stufe (Umlauf 864/846/840 ms) |

Die Kurvenformen (flach, steil) und der volle Umlauf mit seiner Pause stammen
aus dem geteilten Baustein `risk-ladder-multi.js`
(`casino_startpage/README.md`, „Die Mehrtasten-Leiter") – dieses Gerät legt
nur fest, welche Taste zu welcher Leiter gehört.

**Leiter starten und erster Versuch sind zwei Handlungen** (bewusste Abweichung
von CONCEPT.md C.14.5, Auftrag „Starttaste je Gruppe"): Im Angebot blinken
**nur** die drei Starttasten unter den Gruppen; die acht Richtungstasten bleiben
dunkel und `aria-disabled="true"`. Ein Druck auf eine Starttaste beginnt genau
diese Leiter auf Stufe 1 und **wertet nicht** – es kann dabei nichts verloren
gehen, `REWARD` holt unmittelbar danach noch den ungeschmälerten Anspruch
zurück. Erst der darauffolgende Druck auf eine **Richtungstaste** dieser Gruppe
ist der erste Versuch. Die Chance auf Stufe 1 bleibt dadurch unverändert reine
Chance, ohne Können: 1 zu 2 beim Paar (RISK, RISK x4), 1 zu 4 beim Kreuz
(RISK x8). Ab Stufe 2 entscheidet das Auge, weil die brennende Taste dann
sichtbar ist.

Der geteilte Baustein `risk-ladder-multi.js` wurde dafür **nicht angefasst**: er
trennt `offer()`, `start()` und `guess()` seit jeher. Geändert hat sich allein,
dass `risk.js` `start()` und `guess()` nicht mehr im selben synchronen Block
ruft (`onStart()` bzw. `onPress()`). Auch die acht Richtungstasten blieben
unverändert (⌀ 7,4, Kreuz-Rasterschritt 6,5/7,8): die Starttaste sitzt dort, wo
bis dahin die gedruckte Gruppenbeschriftung stand, und trägt deren Text.

**Einmal gewählt, bleibt die Leiter.** Ein Druck auf eine Richtungstaste einer
anderen Gruppe, während eine Leiter läuft, oder auf eine der drei Starttasten
ist wirkungslos, kein Fehlgriff – bestraft würde sonst ein Druck auf eine
Taste, die gar nicht Teil der laufenden Leiter ist, eine versteckte Regel, die
niemand am Gerät ablesen kann.

**Ein Fehlgriff kostet den gesamten offenen Gewinn.** Er wird verworfen,
nicht gutgeschrieben, und das Gerät zeigt und sagt danach ausdrücklich
**nichts Zusätzliches** an – insbesondere nicht, was ein Treffer gebracht
hätte (C.14.9). `REWARD` schreibt den jeweils aktuellen Leiterstand
jederzeit gut und beendet die laufende Leiter.

### Die Blitzsicherheit – bewiesen, nicht behauptet

Bei zwei Tasten (RISK, RISK x4) blitzt eine einzelne Taste 2,5-mal je
Sekunde (kein Umlauf mit Pause: 2 × 200 ms = 400 ms). Bei vier Tasten
(RISK x8) liegt zusätzlich nach jedem vollen Umlauf eine Pause, die genauso
lang ist wie das Trefferfenster derselben Stufe: der volle Umlauf dauert
864 ms auf Stufe 1, 846 ms auf Stufe 2 und 840 ms ab Stufe 3 – rund 1,2
Blitze je Sekunde. Beide Werte liegen weit unter der Grenze von drei
Lichtwechseln je Sekunde, ab der Blinken bei lichtempfindlichen Menschen
Anfälle auslösen kann (WCAG 2.2 SC 2.3.1). Bei vier Tasten leuchtet oder
überblendet **nie mehr als eine gleichzeitig** – dieselbe Zusicherung wie bei
zwei Tasten, nur auf `risk-ladder-multi.js` verallgemeinert: `paintLit()`
schreibt in einer einzigen Schleife über alle acht Tasten mit einem
Vergleich gegen genau einen Index. Die drei Starttasten tragen nie
`.fr-btn--lit`.

**Diese Grenze wird ein einziges Mal im Site Package bewiesen**
(`casino_startpage/Resources/Private/Scripts/verify-risk-timing.mjs`), nicht
je Gerät erneut – siehe „Nachweis" unten und `casino_startpage/README.md`,
Abschnitt „Risiko-Leiter".

## Der Auto-Modus

`AUTO MODE` ist ein Umschalter (`aria-pressed`, zusätzlich leuchtend). Ist er
eingeschaltet, spielt das Gerät selbstständig weiter, genau denselben Weg wie
ein Mensch: dasselbe `fr:round`, dieselbe Deckungsprüfung durch `wallet.js`,
keine nachgemachten Zeigerereignisse.

**Rund eine Sekunde** nach jeder Auswertung (`fr:result`) löst der Auto-Modus
die nächste Runde selbst über `fr:spin` aus – dieselbe Naht, an der auch
`machine.js` seinen einzigen Zuhörer hat. **Reicht der Gerätekredit für den
nächsten Zug nicht**, kommt die Runde nicht zustande (dasselbe Veto wie bei
einem Menschen), und der Auto-Modus schaltet sich **selbst ab** (`fr:auto`
`reason: "insufficient"`).

Im Auto-Modus entfällt jedes Angebot: `risk.js` fragt vor jedem Angebot mit
dem abbrechbaren `fr:risk` `phase: 'offer'`, ob überhaupt angeboten werden
darf; der Auto-Modus bricht ab, und der Gewinn wird **sofort**
gutgeschrieben (`fr:offerend` `reason: "auto"`). Maßgeblich ist dabei stets
der Schalterstand **im Augenblick des Angebots**, nicht der zum Zeitpunkt
des Tastendrucks – daraus folgen vier Übergänge, je nach Umschaltzeitpunkt:

| Umschaltzeitpunkt | Wirkung | `fr:offerend` `reason` |
|---|---|---|
| eingeschaltet während eines laufenden Zugs | Angebot dieses Zugs entfällt, Gewinn sofort gutgeschrieben; die selbst ausgelöste Runden­folge beginnt erst mit der nächsten Auswertung | `"auto"` |
| ausgeschaltet während eines laufenden Zugs | Angebot wie immer, die drei Starttasten laden ein | – (kein `fr:offerend`, das Angebot steht noch) |
| eingeschaltet, während das Angebot steht | `fr:riskcollect` nimmt den Gewinn, kein Risikospiel | `"auto"` (nicht `"reward"` – sonst nicht von einer Handbedienung zu unterscheiden) |
| eingeschaltet, während eine Leiter läuft | dieselbe Wirkung – eine Auslegung von CONCEPT.md C.14.10, das nur das stehende Angebot ausdrücklich nennt (Begründung: `DECISIONS.md`) | `"ladder-collect"` (unverändert – die Leiter meldet das selbst, unabhängig vom Auslöser) |

`auto.js` prüft den Gerätekredit nicht selbst; es liest ausschließlich das
Ergebnis des Vetos ab, das `wallet.js` an der einen dafür zuständigen Stelle
fällt (`fr:round`). Höchstens **ein** Zeitgeber läuft je Gerät
(`data-fr-auto-pending`); die Walzen selbst hält der Auto-Modus nicht an –
das erledigt `machine.js` bereits ohne jeden Tastendruck. Kein neuer
Live-Bereich: der Zustand reist über `aria-pressed`.

## Die Mathematik

Das Regelwerk – Symbole, Rangfolge, die 30 Gewinnlinien, die Gewinnwerte, die
Feldtreppe, die sechs Walzenbänder und die Grundstellung – hat genau **eine**
Quelle: `Classes/Rules.php`. Daraus lesen der `CabinetProcessor` (druckt den
Gewinnplan hinter Glas), `verify-payout.mjs` (der vollständige Nachweis,
siehe „Nachweis" unten) und ab Phase F4 das Walzenwerk. Dieselben Werte
stehen ein zweites Mal, wertgleich und maschinell abgeglichen, in
`Resources/Public/JavaScript/paytable.js` – weil PHP kein JavaScript
importieren kann und ein Erzeugungsschritt selbst ein Bauschritt wäre. Eine
dritte Kopie gibt es nicht: der gedruckte Gewinnplan wird aus
`Rules::PAYTABLE` **erzeugt**, nicht abgeschrieben – im Markup von
`Machine/Shell.html` steht seit Phase F3 keine einzige Zahl der
Gewinntabelle mehr.

### Das Sichtfeld und die zwei Gewinnwege

Sechs Walzen zu je fünf Reihen ergeben 30 sichtbare Felder. Bei festem
Einsatz **10** Krediten zahlen zwei Wege, die sich **addieren** – trifft eine
Frucht auf beiden, wird sie doppelt gewertet, und auf den Rundengewinn gibt
es **keinen** Deckel:

1. **30 feste Gewinnlinien**, immer alle aktiv, von links ab drei gleichen
   Symbolen, lückenlos. Sie entstehen aus sechs geometrischen Formen zu je
   fünf senkrechten Verschiebungen, sodass jedes der 30 Felder auf genau
   sechs Linien liegt (linienausgewogen) – nur dadurch ist „Beitrag je
   Linie" überhaupt eine sinnvolle Kennzahl. Der höchste Linienwert ist
   **genau 100** und steht bei Sieben über sechs Walzen.
2. **Die Feldzählung** der drei kleinen Früchte (Kirsche, Zitrone, Orange),
   unabhängig von jeder Linie, im ganzen Sichtfeld, für jede Fruchtsorte
   einzeln nach der Feldtreppe:

   | Stück im Feld | 0–1 | 2 | 3 | 4 | 5 | ab 6 |
   |---|---|---|---|---|---|---|
   | Gewinn | 0 | 1 | 2 | 3 | 4 | 5 (Deckel) |

   Höchster Feldgewinn einer Runde: drei Früchte × Deckel 5 = 15.

### Die Gewinngarantie ist baulich erzwungen, nicht erhofft

Anders als beim Fünf-Walzen-Gerät gibt es hier **keine** Runde ohne Gewinn
(C.14.8) – und das ist keine Eigenschaft, die gemessen werden musste, sondern
ein Bandbeweis: Vier der sechs Walzen (`Rules::GUARANTEED_REELS`) tragen in
**jedem** ihrer 20 Fenster mindestens eine kleine Frucht. Zeigen alle vier
mindestens eine, liegen im Feld immer mindestens vier kleine Früchte,
verteilt auf drei Sorten – nach dem Schubfachprinzip hat dann mindestens
eine Sorte zwei Stück, also Feldgewinn ≥ 1. Geprüft wird das an den 80
Fenstern der vier garantierten Walzen (P-4 prüft zur Sicherheit alle 120
Fenster aller sechs Walzen), nicht an 64 Millionen Stellungen; der
vollständige Nachweis (unten) bestätigt nur noch, dass es stimmt.

Sieben Bandregeln binden die sechs Walzenbänder an dieses Ergebnis und an
die übrige Karte, alle von `verify-payout.mjs` geprüft: genau 20 Positionen
je Band; keine zwei gleichen Symbole nebeneinander (Rundumschluss
eingeschlossen); die neun Liniensymbole höchstens einmal je Fünferfenster;
die vier garantierten Walzen wie oben, die beiden übrigen mit Fenstern ganz
ohne kleine Frucht (sonst wäre Gewinn 1 unerreichbar); Position 0–4 jeder
Walze ergibt die Grundstellung `Rules::DEFAULT_GRID`; die neun
Liniensymbole werden seltener, je wertvoller sie sind; und jedes der zwölf
Symbole liegt mindestens einmal auf jedem Band, damit kein gedruckter Wert
strukturell unerreichbar ist.

## Der Ereignis- und Messpunktvertrag

Die Module dieses Geräts importieren einander nur dort, wo eine Klasse eine
andere wirklich baut. Verständigt wird sich über Ereignisse am Gehäuse
(`.fr-machine`) und über Messpunkte am selben Element. Alle Ereignisse steigen
auf (`bubbles: true`), sind also auch am Dokument zu hören; ihr `detail` ist
mit `Object.freeze()` versiegelt, damit ein Zuhörer es nicht für die
nachfolgenden verändert.

**Dieser Abschnitt ist der Vertrag selbst, nicht seine Beschreibung.**
`Resources/Private/Scripts/verify-credit.mjs` liest die beiden Tabellen und
prüft sie gegen den Quelltext und gegen den laufenden Prüfstand. Wer eine Zeile
hier ändert, ohne den Code zu ändern (oder umgekehrt), bekommt einen roten
Nachweis.

### Ereignisse

| Ereignis | Absender | abbrechbar | Felder im `detail` |
|---|---|---|---|
| `fr:round` | `machine.js` | ja | `draw`, `stake` |
| `fr:reelrest` | `machine.js` | nein | `reel`, `cell`, `symbols` |
| `fr:result` | `machine.js` | nein | `grid`, `lines`, `field`, `lineAmount`, `fieldAmount`, `stake`, `win` |
| `fr:state` | `machine.js` | nein | `from`, `to` |
| `fr:offer` | `wallet.js` | ja | `win`, `stake`, `claim` |
| `fr:offerend` | `wallet.js` · `risk.js` | nein | `reason`, `amount` |
| `fr:risk` | `risk.js` | ja | `phase`, `ladder`, `level`, `win`, `lost` (nur bei `phase: 'miss'` — der verlorene Betrag) |
| `fr:risktick` | `risk.js` | nein | `ladder`, `level`, `lit`, `on` |
| `fr:auto` | `auto.js` | nein | `on`, `reason`, `rounds` |
| `fr:spin` | `auto.js` | nein | keine (leeres detail) |
| `fr:riskcollect` | `auto.js` | nein | keine (leeres detail) |
| `fr:collect` | `payout.js` | nein | `amount`, `credited`, `capped`, `machineCredit` |
| `fr:coin` | `coinslot.js` | nein | `amount`, `moved`, `reason`, `machineCredit` |
| `fr:cashout` | `bank.js` | nein | `moved`, `capped`, `machineCredit` |
| `fr:count` | `counter.js` | nein | `display`, `value`, `index`, `steps`, `direction` |

Entgegengenommen wird:

| Ereignis | Empfänger | Wirkung |
|---|---|---|
| `fr:spin` | `machine.js` | genau ein `startRound()` — derselbe Weg wie beim Menschen |
| `fr:riskcollect` | `risk.js` | jederzeit aussteigen und gutschreiben; im Grundzustand wirkungslos |
| `fr:offerend` | `machine.js` | geht in den Ruhezustand, sofern `START` nicht bereits die nächste Runde begonnen hat |

**Was die drei tragenden Ereignisse bedeuten**

- **`fr:round`** wird gesendet, *bevor* die Walzen anlaufen, und ist abbrechbar.
  `wallet.js` löst hier ein noch offenes Angebot ein, prüft den Gerätekredit und
  bucht den festen Einsatz 10 ab; reicht er nicht, ruft es `preventDefault()` und
  die Runde kommt nicht zustande.
- **`fr:offer`** ist die Übergabestelle. Weil an diesem Gerät jede Runde einen
  Gewinn bringt, endet jede Runde im Angebot: Es entsteht ein *Gewinnanspruch*
  (ein Betrag, der erspielt, aber noch nicht gutgeschrieben ist), und das
  abbrechbare `fr:offer` fragt, ob ihn jemand übernehmen will. **Seit Phase
  F5** antwortet `risk.js`: es ruft `preventDefault()` und übernimmt den
  Anspruch immer, fragt seinerseits mit dem abbrechbaren `fr:risk`
  `phase: 'offer'`, ob überhaupt angeboten werden darf (der Auto-Modus,
  `auto.js`), und öffnet sonst das Angebot der drei Starttasten (siehe „Die
  drei Risikospiele"). `wallet.js` behält den Anspruch nur noch dann, wenn
  `risk.js` aus irgendeinem Grund nicht antwortet — der ausgebaute Rückfall
  aus Phase F4, weiterhin geprüft (Block R). An `machine.js` und `wallet.js`
  hat sich dafür keine Zeile geändert.
- **`fr:risk`** ist NUR in der Phase `'offer'` abbrechbar — das ist die eine
  Frage an den Auto-Modus (`auto.js`, seit Phase F5c), ob überhaupt angeboten
  werden darf. Alle übrigen Phasen (`start`/`hit`/`miss`/`collect`/`end`)
  sind reine, nicht abbrechbare Meldungen. `risk.js` hält dafür **zwei**
  getrennte Sendestellen, die abbrechbare textlich **vor** der nicht
  abbrechbaren — Block V prüft nur die erste im Quelltext gefundene Stelle.
- **`fr:offerend`** meldet, dass das Angebot erledigt ist, mit `reason`:
  `reward` · `start` · `teardown` · `superseded` (aus `wallet.js`) und seit
  Phase F5b zusätzlich `auto` · `ladder-collect` · `ladder-lost` (aus
  `risk.js`). `machine.js` geht daraufhin in den Ruhezustand — es sei
  denn, `START` hat bereits die nächste Runde begonnen. `superseded`
  (Behebungslauf `REVIEW-fruitrisk-f4.md` [M2]) ist eine reine
  Verteidigungsmaßnahme: träfe ein zweites `fr:result` ein, bevor der vorige
  Anspruch eingelöst ist, würde der alte Anspruch damit zuerst eingelöst,
  statt ersatzlos überschrieben zu werden. In Phase F4 ist dieser Fall
  baulich unerreichbar (siehe `wallet.js`, Dateikopf).

### Messpunkte

Je Attribut genau **ein** Schreiber. Alle stehen am `.fr-machine` und werden
beim Verlassen der Seite wieder entfernt: Sie gehören zum laufenden Betrieb,
nicht zum Gehäuse.

| Attribut | Schreiber | Inhalt |
|---|---|---|
| `data-fr-round` | `machine.js` | die sechs gezogenen Bandpositionen, mit `-` verbunden |
| `data-fr-state` | `machine.js` | `idle` · `spinning` · `stopping` · `evaluating` · `offer` |
| `data-fr-win` | `machine.js` | der Gewinn der laufenden Runde |
| `data-fr-machine-credit` | `wallet.js` | der Gerätekredit |
| `data-fr-mirror` | `wallet.js` | der rohe Spiegelwert der Absturzsicherung, oder leer |
| `data-fr-offer` | `wallet.js` | `open` · `none` |
| `data-fr-claim` | `wallet.js` | der offene Gewinnanspruch, sonst `0` |
| `data-fr-bank` | `bank.js` | der Kassenstand |
| `data-fr-total` | `bank.js` | Kasse + Gerätekredit — die Bilanz als **eine** Zahl |
| `data-fr-cashout-on` | `bank.js` | `on` · `off` |
| `data-fr-risk-phase` | `risk.js` | `off` · `offer` · `ladder` |
| `data-fr-risk-ladder` | `risk.js` | `none` · `risk` · `risk4` · `risk8` |
| `data-fr-risk-level` | `risk.js` | erreichte Stufe, `0` außerhalb |
| `data-fr-risk-win` | `risk.js` | der offene Gewinn der laufenden Leiter bzw. des reinen Angebots |
| `data-fr-risk-side` | `risk.js` | Periode je Taste in ms — die Sicherheitszahl, im laufenden Browser ablesbar |
| `data-fr-risk-on` | `risk.js` | Trefferfenster in ms |
| `data-fr-risk-pause` | `risk.js` | Pause nach einem vollen Umlauf in ms, `0` ohne Pause |
| `data-fr-risk-cycle` | `risk.js` | voller Umlauf in ms — hier ist „nie unter 333 ms" nachmessbar |
| `data-fr-risk-lit` | `risk.js` | Schlüssel der brennenden Taste, sonst `none` |
| `data-fr-auto` | `auto.js` | `on` · `off` |
| `data-fr-auto-rounds` | `auto.js` | selbst ausgelöste Züge (nur zur Auskunft und zum Nachmessen) |
| `data-fr-auto-pending` | `auto.js` | `0` · `1` — macht die Zusage „höchstens ein Zeitgeber" messbar |
| `data-fr-sound-on` | `sound.js` | `on` · `off` (folgt `sound.enabled`, auch aus einer anderen Registerkarte) |
| `data-fr-sound-sustained` | `sound.js` | laufende Dauerklänge dieses Gehäuses: `0` · `1` — macht ein Leck sichtbar |
| `data-fr-sound-dropped` | `sound.js` | verworfene Stimmen aus `sound.stats()` — im Dauerlauf muss `0` stehen |

`data-fr-round` ist zugleich das **Prüfsiegel**: Die Ziehung steht ab dem
Tastendruck und damit **vor** dem ersten `STOP` von außen ablesbar am Gehäuse.
`data-fr-total` ist der Kern des Geldnachweises: Einwurf und Auszahlung dürfen
sie **nie** ändern, Einsatz und Gewinn nur um genau den gebuchten Betrag.

**Warum `data-fr-sound-on` und nicht `data-fr-sound` (Behebungslauf,
Abnahmetest T-84):** `data-fr-sound` ist bereits vergeben — als bloße Kennung,
ohne Wert, am Ton-Schalter selbst (`Machine/Cabinet.html`, siehe A-28), mit
der `sound.js` seinen Schalter im DOM findet. Trüge der Zustandsspiegel
dieses Geräts denselben Namen, gäbe es zur Laufzeit **zwei** Elemente mit
`data-fr-sound` — den Schalter und `.fr-machine` –, mit zwei verschiedenen
Bedeutungen unter demselben Namen: „hier ist das Bedienteil" und „so steht
der Ton". Das ist keine Messstelle mehr, sondern eine Falle; genau daran
scheiterte T-84. `data-fr-sound-on` folgt demselben Muster wie
`data-fr-sound-sustained`/`-dropped` direkt darunter: ein eigener,
eindeutiger Name je Messpunkt.

**Derselbe Fehlertyp, derselbe Befund, ein zweites Mal gefunden:**
`data-fr-cashout-on` statt `data-fr-cashout` aus genau demselben Grund —
`data-fr-cashout` ist bereits die bloße Kennung der `CASH OUT`-Taste selbst
(`Machine/Cabinet.html`), mit der `bank.js` seine Taste findet
(`SELECTOR_CASHOUT`). Gefunden wurde das nicht an einem eigenen Testfall wie
T-84, sondern durch die generische Doppelbelegungs-Prüfung (siehe
„Nachweis" unten), die seit diesem Behebungslauf das **ganze** Feld der
Messpunkte gegen eine Doppelbelegung prüft, statt nur einen benannten Namen.

**Grenze, ehrlich benannt (Behebungslauf `REVIEW-fruitrisk-f4.md` [L10]):**
`data-fr-state` wechselt auf `offer`, **bevor** `data-fr-offer` auf `open`
wechselt — dazwischen liegt eine Mikroaufgabe (`wallet.js` wartet in
`onResult()` auf `this.pendingDebit`). Für einen Menschen ist das unsichtbar;
ein Modul, das auf `fr:state` reagiert und im
selben Zug `data-fr-offer` liest, bekäme dort noch `none` (`auto.js` liest
`data-fr-offer` an keiner Stelle und ist davon nicht betroffen). Wer beides
zusammen braucht, hört stattdessen auf `fr:result` — das kommt erst, nachdem
`data-fr-offer` bereits steht.

### Anzeigen und ihr genau einer Eigentümer

| Anzeige | Eigentümer |
|---|---|
| Röhren `GUTHABEN`, `EINSATZ` | `wallet.js` |
| Röhren `GEWINN` | **zeitlich geteilt**: `machine.js` vom Rundenbeginn bis `fr:result`, danach — im Angebot und in einer laufenden Leiter — `risk.js`, ab dem nächsten `fr:round` wieder `machine.js`. Beide Dateien führen dafür je eine eigene `NixieCounter`-Instanz auf derselben Röhrengruppe; zulässig, weil sich ihr Zugriff zeitlich nie überschneidet — zu jedem Zeitpunkt genau ein Eigentümer |
| Röhren `STUFE` | `risk.js` |
| Die Tafel `.fr-message` | `message.js` |
| Kassenfenster `.fr-bank__value`, `CASH OUT` | `bank.js` |
| Der Ton-Schalter | `sound.js` |
| Leuchtfelder und Gewinnlinien im Sichtfeld | `machine.js` |
| Live-Bereich `machine` | `message.js` |
| Live-Bereich `grid` | `grid-announce.js` |
| Live-Bereich `credit` | `bank.js` |
| Live-Bereich `risk` | `risk.js` |

Zwei Stellen dürfen nie dieselbe Anzeige pflegen (CONCEPT.md Teil A Abschnitt 5,
Grundsatz 8).

### Verlassen der Seite: zwei Fälle, zwei Ausgänge

`fruit-risk.js`s `teardown()` räumt beim Verlassen der Seite in fester
Reihenfolge ab: Spielkern zuerst (Zeichenschleife aus), dann die
Kassenanzeige, dann die Verrechnung, zuletzt die Live-Bereiche. Zwei Fälle
sind dabei zu unterscheiden — sie sehen ähnlich aus, enden aber
unterschiedlich:

- **Ein bereits OFFENES Angebot** (die Runde ist fertig ausgewertet,
  `data-fr-offer` steht auf `open`) wird **eingelöst, nicht verworfen**:
  `wallet.js`s `destroy()` ruft zuerst `settleOffer('teardown')` — der
  erspielte Gewinn wandert damit vollständig in die Kasse zurück, bevor
  `machineCredit.close()` den Rest des Gerätekredits ebenfalls zurückbucht.
  Es bleibt nichts liegen (`verify-credit.mjs` K-9).
- **Eine noch LAUFENDE Runde** (`data-fr-state` steht auf `spinning`,
  `stopping` oder `evaluating` — die Walzen laufen noch oder werten gerade
  aus) wird beim Abbruch **nicht mehr zu Ende ausgewertet**:
  `Machine.destroy()` hält die Zeichenschleife nur an, `finishRound()` läuft
  nie, es entsteht kein `fr:result` und damit kein Angebot. Der beim
  Tastendruck bereits abgebuchte feste Einsatz (10 Kredite) und der zu
  diesem Zeitpunkt garantierte, aber noch nicht ausgewertete Gewinn
  (C.14.7) sind damit **unwiderruflich weg** — es entsteht dabei kein Geld,
  es verschwindet nur; die Bilanz aus Kasse und Gerätekredit bleibt stimmig
  (`verify-credit.mjs`, Block M, M-11).

**Diese Entscheidung ist bewusst getroffen, nicht übersehen** (Behebungslauf
`REVIEW-fruitrisk-f4.md` [H4]): sie übernimmt für dieses Gerät dieselbe
Entscheidung, die bereits für `reel_slot` und `video_slot` gilt
(`DECISIONS.md`, 2026-09-03 15:27 CEST) — wer mitten im Zug geht, gibt den
Zug auf. Der Unterschied zwischen den beiden Fällen ist real, nicht nur
graduell: ein offenes Angebot ist ein STEHENDER Zustand zwischen zwei
Entscheidungen des Spielers (er hat bereits gewonnen und wartet auf eine
weitere, freiwillige Handlung), eine laufende Walzenrunde dagegen ein noch
nicht abgeschlossener Vorgang, den der Spieler selbst durch das Verlassen
der Seite beendet. `Machine.destroy()` eine laufende Runde nachträglich
selbst auswerten zu lassen, verhielte sich an dieser einen Stelle anders als
überall sonst im Projekt, wo ein nicht zu Ende geführter Vorgang auch nicht
nachträglich zu Ende geführt wird (vgl. B.5.4 zum Münzschieber: liegende
Münzen bleiben liegen). Es führte außerdem einen neuen, selbst wieder zu
prüfenden Sonderfall im Abräumweg ein, für ein Ereignis, das in der Praxis
selten ist (die rund 1,2 bis 3,7 s zwischen Tastendruck und dem letzten
Stillstand).

## Der Klang

Aller Klang entsteht **im Browser aus Tonfrequenzen** (Web Audio API,
`casino_startpage/sound.js`) – **keine Audiodatei, nichts gesampelt**
(CONCEPT.md Abschnitt 2, harte Regel 1). `fruit_risk/…/sound.js` entscheidet
nur, **welcher** Klang zu **welchem** Ereignis gehört; **wie** ein Klang
entsteht, weiß allein das Site Package, **wie eine Münze klingt**, allein der
geteilte Klangbaukasten (`sound-kit.js`) – drei Ebenen, nicht zwei.

**Vor der ersten echten Nutzergeste entsteht kein `AudioContext`.** Der
Kontext wird erst in `sound.unlock()` angelegt, aus einem Zuhörer für ein
Ereignis mit `event.isTrusted === true` – und der Tastaturweg (`keydown`)
schaltet ebenso frei wie der Zeiger (`pointerdown`) und `click`. Ein
nachgemachtes Ereignis erteilt keine Aktivierung, und jeder Klangaufruf
liefert davor still `0`.

**Die Klangzuordnung – der hörbare Unterschied zum Nachbargerät:** Am
Fünf-Walzen-Gerät fallen die Walzenstopps in der Tonhöhe (Dreieckstöne);
hier **steigen** sechs Rechteckstöne in ganztönigen Schritten
(262/294/330/370/415/466 Hz), und derselbe Aufbau trägt auch den
Gewinn-Jingle. Eine Ganztonleiter hat keinen Grundton und keine Kadenz – sie
ist Geräusch mit Ordnung, keine Melodie (B.3 Nummer 11: „im Zweifel Geräusch
statt Melodie"). `video_slot/…/sound.js` wurde ausdrücklich **nicht**
kopiert (CONCEPT.md C.14.11) – ein kopierter Klang machte zwei Geräte
ununterscheidbar. Die gerätunabhängigen Geräusche (Münze, Kaskade, Metall,
Blech, Klinke, Registrierkasse, Zählschritt) kommen aus dem geteilten
Baukasten, weil sie in diesem Haus überall gleich klingen sollen; alles
Übrige ist neu erfunden.

Die vollständige Zuordnung:

| Auslöser | Klang |
|---|---|
| erste echte Nutzergeste | Kontext entsteht, Leerlaufgeräusch beginnt – kein Ton |
| Runde startet (`fr:state` → `spinning`) | Startklang: zwei steigende Rechteckstöne (180 → 240 Hz) + Klinke |
| Walzen laufen | Laufgeräusch, ein Rauschstoß alle 52 ms |
| jede Walze steht (`fr:reelrest`) | Walzenstopp: sechs **steigende** Töne 262/294/330/370/415/466 Hz + kurzer Blechschlag |
| Rundengewinn (`fr:result`) | Gewinn-Jingle, 2 bis 5 steigende Ganztonschritte ab 392 Hz je nach Höhe des Gewinns (Stufen 1–3/4–9/10–39/ab 40 Kredite), gefolgt von der Registrierkasse aus dem Baukasten |
| Angebot steht (`fr:risk` `phase: 'offer'`) | **kein Klang** – käme sonst in jeder Runde und würde zum Dauerton |
| Leiter „RISK" blinkt (`fr:risktick`) | ein Tick bei 523 Hz |
| Leiter „RISK x4" blinkt | derselbe Tick, höher: 698 Hz |
| Leiter „RISK x8" blinkt | vier unterscheidbare Tonhöhen, eine je Taste: links 392, rechts 494, oben 587, unten 698 Hz |
| Treffer (`fr:risk` `phase: 'hit'`) | zwei steigende Töne (523 → 784 Hz) + Metallschlag |
| Fehlgriff (`fr:risk` `phase: 'miss'`) | ein fallender Ton (220 → 110 Hz), wie ein abfallendes Relais |
| `AUTO MODE` umgelegt (`fr:auto`) | Umschaltklang, Richtung nach Zustand: ein steigt (330 → 440 Hz), aus fällt (440 → 330 Hz) |
| Ton-Schalter eingeschaltet | eine kurze, doppelte Klinke |
| Ton-Schalter ausgeschaltet | **kein Klick** – die eintretende Stille ist die Rückmeldung |
| Münzeinwurf angenommen / abgelehnt (`fr:coin`) | Münzklang aus dem Baukasten bzw. die zurückgegebene Münze + ein tiefer Anschlag |
| Gewinn gutgeschrieben (`fr:collect`) | Münzkaskade aus dem Baukasten, nach Betrag gestaffelt |
| `CASH OUT` (`fr:cashout`) | Blech + Münzkaskade aus dem Baukasten |
| Zählschritt der Anzeige GUTHABEN (`fr:count`) | ein Zählschritt aus dem Baukasten, einmal je sichtbarem Schritt – kein Klang für GEWINN oder STUFE |
| abgelehnter Zug (`fr:round`, am Dokument, Blasenphase, `defaultPrevented`) | ein tiefer, hörbarer Anschlag – die Absage |
| Leerlauf | Brummen aus dem Site Package (`IdleNoise`, eine Instanz je Gehäuse); es schweigt vollständig, solange das Gerät arbeitet **oder** eine Leiter läuft |

**Warum der Startklang an `fr:state` hängt und nicht an `fr:round`:**
`fr:round` ist abbrechbar und wird auch dann gefeuert, wenn die Runde nicht
zustande kommt; ein Startklang bei abgelehntem Zug wäre eine Lüge. `fr:state`
mit `to === 'spinning'` kommt dagegen genau einmal je wirklich zustande
gekommener Runde – bei einem Tastendruck wie beim `fr:spin` des Auto-Modus.

Der Ton-Schalter am Sockel ist ein eigener `aria-pressed`-Umschalter,
standardmäßig eingeschaltet, keiner der zwölf Bedienteile aus
`Machine/Button.html`. Er schaltet ausschließlich **diesen** Automaten –
mehrere Automaten auf einer Seite teilen sich zwar einen `AudioContext`
(`casino_startpage/sound.js`), aber nicht ihren Ein/Aus-Zustand.

## Barrierefreiheit

Vier Live-Bereiche (`role="status"`) stehen im ausgelieferten HTML von
`Machine/Cabinet.html` **leer** und werden seit Phase F4 von genau je einem
Modul gefüllt — nie von zwei Stellen zugleich:

| `data-fr-announce` | Wofür | Eigentümer | Ab Phase |
|---|---|---|---|
| `machine` | Betriebszustand des Geräts, die Tafel | `message.js` | F4 |
| `grid` | Feldzustand und Rundenergebnis, ein Satz je Runde | `grid-announce.js` | F4 |
| `credit` | Kasse und Gerätekredit, ein Satz für beide | `bank.js` | F4 |
| `risk` | Angebot und Ausgang eines Risikospiels | `risk.js` | F5 |

Sie wurden **leer ausgeliefert**, damit ein Hilfsmittel den Bereich schon beim
Rendern registriert: ein Live-Bereich, den ein Skript anlegt *und* füllt, wird
von Hilfsmitteln nicht angesagt. Ihre Zahl ist seit Phase F1 auf vier
festgelegt und bleibt es – die vier Röhrengruppen (GUTHABEN, EINSATZ, STUFE,
GEWINN) bringen ausdrücklich **keinen** eigenen fünften Live-Bereich mit; ihre
Werte reisen seit Phase F4 durch die vorhandenen vier. Für das Rundenergebnis
wurde ebenfalls **kein** neuer angelegt – es reist durch den Bereich des
Sichtfelds (`grid`), wie seit Phase F1 vorgesehen.

**Leer ausgeliefert reicht nicht — sie müssen es auch BLEIBEN, bis wirklich
etwas geschieht** (Behebungslauf, Abnahmetest): Bis zu diesem Behebungslauf
füllten sich „grid" und „credit" bereits beim Aufbau der Seite selbst —
`machine.js` sagte im eigenen Konstruktor den Anfangszustand des Sichtfelds
an, `bank.js` sagte über `paint()` beim allerersten, synchronen
`subscribe()`-Aufruf bereits Kasse und Gerätekredit an. Beides geschah **vor**
jeder Bedienung: ein Hilfsmittel bekäme beim bloßen Öffnen der Seite eine
Ansage, ohne dass irgendetwas passiert wäre — genau das verbietet C.14.12
ebenso wie das leere Ausliefern selbst. `machine.js` ruft diese erste Ansage
seitdem nicht mehr auf; `bank.js`s `paint()` bekommt den `reason` seiner
Quelle durchgereicht und sagt bei `reason === 'subscribe'` nichts an — nur die
sichtbare Anzeige bekommt weiterhin sofort ihren Anfangsstand. `LR-1`
(`verify-credit.mjs`) prüft das jetzt unmittelbar: alle vier Bereiche sind
nach dem Aufbau eines vollständigen Gehäuses leer, vor jeder Bedienung.

**Ein Satz je Runde, nicht dreißig Bruchstücke:** `grid-announce.js` baut aus
Feldzustand, Betrag, getroffenen Linien und Feldzählung genau **einen** Satz
(erst der Feldzustand, dann der Rest) und leert den Bereich beim Rundenstart
(`clear()`), damit während des Laufs keine veraltete Behauptung dasteht.
Beschriftung und Wert stehen dabei immer in **einem** Satz, nie getrennt –
dieselbe Regel gilt für `bank.js`, das Kasse und Gerätekredit in **einem** Satz
ansagt („Kasse: 250, Guthaben: 40"), weil beide Zahlen aria-hidden gezeichnet
sind und sonst kein Hilfsmittel sie läse. Alle vier Entprellungen laufen über
das gemeinsame Modul `announce.js` (`LiveRegion`), damit sich zwei Schreiber
an einem geteilten Bereich (`machine`, `credit`) nicht gegenseitig
überschreiben können.

**Kein Kanal ist rein farblich:** Ein Treffer bekommt zusätzlich eine Form
(`.fr-cell--win`, ein Rahmen), die getroffene Gewinnlinie wird als sichtbare
Linie eingeblendet (`.fr-payline--win`, über `opacity`, nie über `display`
oder `visibility`), und die Ansage im Bereich `grid` nennt Betrag und Linien
zusätzlich als Text.

**Alle zwölf Bedienteile sind seit Phase F5 verdrahtet.** Die **elf**
Risiko-Bedienteile tragen `aria-disabled` jetzt zur **Laufzeit**: `risk.js`
setzt es an den drei Starttasten auf `"false"`, solange ein Angebot steht, und
an den Richtungstasten einer Gruppe, solange deren Leiter läuft – nie länger,
als die Taste wirklich etwas tut. `AUTO MODE` und der neue
Ton-Schalter sind **Umschalter** und tragen `aria-pressed`
(`"true"`/`"false"`), das mit ihrem Zustand mitwandert; beide leuchten
zusätzlich (`.fr-btn--lit` bzw. `.fr-sound--on`), damit der Zustand nicht rein
über `aria-pressed` transportiert wird.

**Die Leiter sagt ihren Ausgang an, nicht jede Stufe** (CONCEPT.md C.14.12):
Angesagt wird genau zweimal je Runde mit Risikospiel – einmal, dass ein
Risikospiel möglich ist, einmal, wie es ausgegangen ist. Acht Ansagen in zwei
Sekunden (eine je Stufe einer x8-Leiter) wären unbenutzbar. Nach einem
Fehlgriff wird ausdrücklich **nichts Zusätzliches** angesagt oder angezeigt –
insbesondere nicht, was ein Treffer gebracht hätte.

Verborgen wird ausschließlich über `clip-path` (`.fr-offscreen`) bzw. über
`opacity`/`pointer-events` (die Tafel `.fr-message`), nie über `display` oder
`visibility` — alle drei nähmen das jeweilige Element aus dem Barrierebaum.
Eine einzige Regel (`.fr-cabinet :focus-visible`) setzt einen sichtbaren
Fokusrahmen für jedes der fünfzehn Bedienteile; alle Bedienteile reagieren auf
Zeiger **und** Tastatur, einschließlich `CASH OUT` (Eingabe- **und**
Leertaste).

**Zeiger und Tastatur, ohne eine Unterscheidung an `event.detail`**
(Behebungslauf `REVIEW-fruitrisk-f4.md` [M9]): `press.js` (`wirePressButton()`)
unterschied bis zu diesem Behebungslauf den Zeiger- vom Tastaturweg an
`event.detail` eines nachfolgenden `click` (0 = Tastatur, ≥1 = Zeiger) — eine
Annahme, die sich ohne ein echtes Hilfsmittel nicht belegen ließ: ob
Spracheingabe (Dragon, „Klick START"), Windows Voice Access, Switch Access
oder ein Bildschirmleser wirklich ein `click` mit `detail 0` synthetisieren
oder ein gewöhnliches, war offen. Die Unterscheidung war dafür gar nicht
nötig: `press.js` löst jetzt an der jeweils EIGENEN Quelle aus —
`pointerdown` für den Zeiger, `keydown` (Enter/Leertaste) für die Tastatur,
und ein `click` OHNE vorheriges `pointerdown`/`keydown` (der Weg jedes
Hilfsmittels, das `click` direkt synthetisiert) löst ebenfalls aus,
**unabhängig von `event.detail`**. `verify-credit.mjs` (Block M, M-12) prüft
diesen Vertrag isoliert von jeder Spiellogik: genau ein Auslösen je Weg, kein
doppeltes Auslösen durch den jeweiligen Folge-`click`. Was damit **nicht**
geprüft ist und ein echtes Hilfsmittel braucht: ob Spracheingabe, Switch
Access oder ein Bildschirmleser tatsächlich eines der drei bekannten Ereignisse
(`pointerdown`, `keydown`, `click`) auslösen, statt eines vierten,
unbekannten Wegs — das bleibt ein offener Live-Check.

**Zielgröße 24 × 24 (WCAG 2.2 SC 2.5.8) — Grenze ehrlich benannt**
(Behebungslauf `REVIEW-fruitrisk-f4.md`, needs-verification zur Zielgröße):
Jedes Bedienteil skaliert mit dem Gehäuse (`--fr-u`, siehe „Das Maßraster"),
`--fr-u` selbst mit der verfügbaren Breite der Bühne (`.fr-machine`, deren
Breite wiederum vom Site Package abhängt — `casino_startpage`, `.ck-room__hall`
mit `padding-inline: 1rem` je Seite). Nachgerechnet für die drei verlangten
Fensterbreiten, unter der Annahme, dass die Bühnenbreite die engere Grenze ist
(Bühnenbreite ≈ Fensterbreite − 32 px; ist stattdessen die Bühnen**höhe** die
engere Grenze — bei einem breiten, aber flachen Fenster, wie es bei 1440 px oft
vorkommt –, fällt das Gehäuse und mit ihm jedes Bedienteil noch **kleiner**
aus als hier gerechnet; die folgenden Werte sind damit obere Schranken, keine
Zusicherungen):

| Bedienteil | Maß (Koordinatentabelle) | 360 px | 768 px | 1440 px (obere Schranke) |
|---|---|---|---|---|
| `.fr-coinslot__slot` | 5 × 5 | ≈ 10 px | ≈ 23 px | ≈ 44 px |
| `.fr-cashout` (Höhe) | 4,8 | ≈ 10 px | ≈ 22 px | ≈ 42 px |
| `.fr-coinslot__button` | 9 × 7 | ≈ 14 px | ≈ 32 px | ≈ 62 px |
| `.fr-coinslot__input` (Höhe) | 8 | ≈ 16 px | ≈ 37 px | ≈ 70 px |
| `.fr-btn--round` | ⌀ 7,4 | ≈ 15 px | ≈ 34 px | ≈ 65 px |
| `.fr-btn--key` | 20 × 10 | ≈ 21 px | ≈ 46 px | ≈ 88 px |
| `.fr-btn--tab` | 16,8 × 2,6 | ≈ 34 × 5 px | ≈ 77 × 12 px | ≈ 148 × 23 px |

Bei 360 px Fensterbreite unterschreitet **jedes** dieser sechs Bedienteile
24 × 24 px, einige davon deutlich — nicht nur die Geldbedienteile, sondern
auch `.fr-btn--key` (`AUTO MODE`/`REWARD`). Bei 768 px liegen `.fr-coinslot__slot`
(≈ 23 px) und `.fr-cashout` (≈ 22 px) noch knapp darunter, alle übrigen
darüber. CONCEPT.md C.14.12 nimmt die Unterschreitung ausdrücklich nur für
„die kleinen Tasten" hin — die **Geldbedienteile** (Münzschlitz, CASH OUT)
sind aber die kleinsten von allen und zugleich die einzigen, die man an
diesem Gerät **benutzen muss**, um überhaupt zu spielen (Einwurf, Auszahlung).
Eine Vergrößerung innerhalb der Maßordnung der Koordinatentabelle (etwa
`.fr-cashout` von 4,8 auf 6 Einheiten) verschöbe diese Zahlen nur
proportional mit und rettete die 360-px-Spalte nicht — das Problem ist keine
einzelne zu knapp bemessene Koordinate, sondern dass **das gesamte Gehäuse**
bei schmalen Fenstern unter eine nutzbare Bedientaststellengröße schrumpft,
weil jede Koordinate an derselben, einen Bühnenbreite hängt. Eine absolute
Mindestgröße für einzelne Bedienteile (etwa über `max()`/`clamp()`) würde sie
aus dem proportionalen Verhältnis zur gezeichneten Gehäusefassung
herauslösen und an schmalen Fenstern sichtbar größer wirken als ihre
gezeichnete Aussparung — eine Entwurfsentscheidung, die über diesen
Behebungslauf hinausgeht. Ob die Ausnahme aus C.14.12 auch für die
Geldbedienteile gelten soll, ist deshalb eine Auftraggeberfrage, keine, die
dieser Lauf beantwortet; er benennt nur die Zahlen, statt sie zu verschweigen.

Der Gewinnplan hinter Glas ist echter SVG-Text, liegt aber vollständig
innerhalb der als `aria-hidden="true"` ausgezeichneten Zeichnung
(`Machine/Shell.html`) und existiert damit für ein Hilfsmittel nicht
(REVIEW-fruitrisk-f3.md, Befund M8). `Machine/Cabinet.html` trägt deshalb
seit dem F3-Behebungslauf zusätzlich eine visuell verborgene (`.fr-offscreen`,
also `clip-path`, nie `display`/`visibility`) `<table>` mit denselben 48
Werten, derselben Quelle (`{machine}`) und dem Feldtreppen-Hinweis –
kein fünfter Live-Bereich, weil eine statische Tabelle sich nach dem
Rendern nie mehr ändert.

Die acht Risiko-Tasten leuchten bernstein (`--ck-bulb-core`/`--ck-bulb-glow`)
und **ohne Übergang, ohne Nachglühen** – anders als die Tasten des
vorhandenen Fünf-Walzen-Geräts. WCAG 2.2 behandelt gesättigtes Rot bei der
Blitzschwelle strenger als jede andere Farbe (eigener „red flash threshold",
ausgelöst ab R/(R+G+B) ≥ 0,8); die beiden benutzten Tokens liegen mit 0,36
und 0,49 weit darunter. Das harte Schalten ohne Übergang ist die bauliche
Voraussetzung dafür, dass in Phase F5 nie zwei Risiko-Tasten gleichzeitig
leuchten oder überblenden können.

**Zwei Grenzen, ehrlich benannt statt behoben:**

- Die **Mindestzielgröße von 24 × 24 Bildpunkten** (WCAG 2.2 SC 2.5.8)
  erreichen START und STOP (19 × 19 Einheiten) bereits bei kleinen
  Gehäusebreiten. Die acht runden Risiko-Tasten (⌀ 7,4 Einheiten) erreichen
  24 Bildpunkte dagegen erst ab einer gerenderten Gehäusebreite von rund
  520 Bildpunkten — die Laufzeitprüfung vom 2026-09-05 hat das nachgemessen
  und bestätigt: **528 Bildpunkte Gehäusebreite (560 Bildpunkte
  Fensterbreite)**, die Vorhersage traf auf 2 % genau. Das ist die
  Maßordnung des Gehäuses: ein Kreuz aus vier Tasten, das auch auf einem
  schmalen Bildschirm 24 Bildpunkte je Taste erreichte, sprengte die
  Bedienfeldhöhe und damit die ganze Frontplatte. **Diese Ausnahme gilt
  ausdrücklich nur für die acht Risiko-Tasten** — sie sind Teil der
  Spielfläche und ihre Größe folgt zwingend dem Gehäuse. Für die
  Geldbedienteile und den Ton-Schalter gilt sie nicht, siehe den eigenen
  Abschnitt unten.
- Die drei **Starttasten** der Risikogruppen (`.fr-btn--tab`, 16,8 × 2,6
  Einheiten) erreichen 24 Bildpunkte in der **Höhe** bei keiner der drei
  gemessenen Fensterbreiten. Sie fallen nicht unter die Ausnahme der acht
  runden Tasten, sondern unter die **Abstandsausnahme** von SC 2.5.8 — dieselbe,
  die schon für `CASH OUT` gilt. Nachgemessen im Browser (Laufzeitprüfung
  2026-09-06, `Tests/Acceptance/specs/behebung-0905-n01-n02.spec.ts`), nicht nur
  gerechnet, und im Ergebnis unterschiedlich je Gruppe:
  - **`RISK START` und `RISK x4 START` tragen die Ausnahme bei jeder geprüften
    Gehäusebreite.** Der nächstgelegene andere Bedienteil-Mittelpunkt (die
    runde Richtungstaste derselben Gruppe) liegt 13,63 Einheiten entfernt,
    solange diese Richtungstaste selbst unter 24 Bildpunkten bleibt; sobald sie
    das ab rund 519 Bildpunkten Gehäusebreite überschreitet, gilt statt des
    Mittelpunktabstands der Kantenabstand zu ihrer Umrissbox — der wächst dabei
    auf 18,29 bis 18,31 Einheiten. In beiden Fällen bleibt reichlich Luft über
    24 Bildpunkten.
  - **`RISK x8 START` trägt die Ausnahme dagegen erst ab rund 738 Bildpunkten
    Gehäusebreite (rund 770 Bildpunkte Fensterbreite).** Der nächstgelegene
    andere Bedienteil-Mittelpunkt ist die untere Kreuztaste (`risk8-down`);
    gemessen sind es **6,30 bis 6,31 Einheiten**, nicht 6,5, solange
    `risk8-down` selbst unter 24 Bildpunkten bleibt. Überschreitet `risk8-down`
    diese Schwelle (ab denselben rund 519 Bildpunkten Gehäusebreite wie oben),
    gilt der Kantenabstand zu ihrer Umrissbox statt des Mittelpunktabstands —
    gemessen **5,20 bis 5,21 Einheiten**. Erst wenn dieser Kantenabstand selbst
    wieder 24 Bildpunkte erreicht, kippt die Ausnahme: rechnerisch bei 738,5
    Bildpunkten Gehäusebreite (24 ÷ 5,20 × 160), nachgemessen exakt dort
    bestätigt (728 px Gehäuse: 23,70 px; 738 px Gehäuse: 24,02 px). **Unterhalb
    von rund 770 Bildpunkten Fensterbreite — also auf jedem Mobiltelefon —
    verfehlt `RISK x8 START` damit die Zielgröße von SC 2.5.8**, auch über die
    Abstandsausnahme. Das ist der bindende, nicht der günstigste Fall.

  Warum die Taste nicht größer ist: unter der Tastenzeile (Höhe 23, aus
  „Oberkante y 95,5" und „Mitte y 107,0" zwingend) und über der Plattenkante
  (121,5) sind genau 3,0 Einheiten frei, von denen 2,2 bis dahin die
  Gruppenbeschriftung belegte. Eine höhere Taste verlangte, die
  Bedienfeldplatte nach unten wachsen zu lassen — darunter liegt ab y 123,5 der
  Gewinnplan hinter Glas, es sind also nur 2,0 Einheiten Luft; das wäre ein
  Umbau der unteren Gehäusehälfte, keine Maßänderung, und ist in diesem Lauf
  ausdrücklich nicht vorgesehen (siehe DECISIONS.md).
- **`prefers-reduced-motion` bleibt Nicht-Ziel.** Das Fehlen einer
  Bewegungsdrosselung ist Absicht, keine Unterlassung (CONCEPT.md C.14.15).

Dies ist eine Aufzählung dessen, was getan wurde — **keine Aussage über
Konformität**. Ob das Ergebnis eine Norm erfüllt, kann nur eine Prüfung durch
Menschen feststellen.

### Zielgröße der Geldbedienteile und des Ton-Schalters — kein Teil der obigen Ausnahme

Behebungslauf 2026-09-05 (`AUDITREPORT-2026-09-05.md`, Befund N-02): die
Laufzeitprüfung stellte fest, dass fünf Bedienteile von der oben genannten
Ausnahme gar nicht gedeckt sind, weil sie **Bedienung** sind, keine
Spielfläche — man muss sie benutzen können, unabhängig vom Gehäusemaßstab.
`+10`/`+100`/`+500` und das Feld für den freien Betrag wurden deshalb in
`machine.css` von 34 × 8 auf 37 × 8,8 Einheiten (Aufladeknöpfe) bzw. von 8
auf 8,8 Einheiten Höhe (Feld freier Betrag) vergrößert; der Ton-Schalter von
26 × 4,8 auf 26 × 5,2 Einheiten. Alle drei Werte nutzen den vorhandenen,
ungezeichneten Freiraum bis an die jeweils nächste feste Zone (Münzschlitz,
Auswurfschale, Sockelkante) vollständig aus — mehr ist ohne den Sockel
selbst zu verschieben nicht drin.

Nachgemessen (Playwright, `Tests/Acceptance/specs/behebung-0905-n01-n02.spec.ts`,
Fensterhöhe 900 px — bei anderer Fensterhöhe ändern sich die Werte ab 768 px
Fensterbreite, siehe unten):

| Bedienteil | 360 px | 560 px | 768 px | 1440 px |
|---|---|---|---|---|
| `+10`/`+100`/`+500` | 24,5 × 18 px | 39,4 × 29 px | 52,8 × 38,9 px | 52,8 × 38,9 px |
| Feld freier Betrag | 67,6 × 18 px | 108,9 × 29 px | 146 × 38,9 px | 146 × 38,9 px |
| Ton-Schalter | 53,3 × 10,7 px | 85,8 × 17,2 px | 115 × 23 px | 115 × 23 px |

**`+10`/`+100`/`+500` und das Feld freier Betrag erreichen 24 × 24 ab
rund 469 Bildpunkten Fensterbreite** (bei 900 px Fensterhöhe; nachgemessen:
23,97 px Höhe bei 468 px, 24,08 px bei 470 px — die Breite selbst reicht bei
diesen beiden Bedienteilen schon ab 360 px, die Höhe ist die engere Grenze).
**Der Ton-Schalter
erreicht 24 × 24 bei keiner der vier gemessenen Fensterbreiten** — seine
Höhe bleibt bei 900 px Fensterhöhe durchweg unter 24 px (höchstens 23 px, ab
768 px unverändert). CASH OUT wurde in diesem Lauf **nicht** vergrößert: der
Auditbericht führt es nicht unter den fünf betroffenen Bedienteilen, weil
axe es bereits als bestanden wertet (die Abstandsausnahme aus SC 2.5.8
greift dort); es teilt sich zudem dieselbe knappe Sockelzeile wie der
Ton-Schalter.

**Warum 768 px und 1440 px in der Tabelle identisch sind:** ab 768 px
Fensterbreite ist bei 900 px Fensterhöhe nicht mehr die Fensterbreite die
engere Grenze, sondern die Fensterhöhe (dieselbe Unsicherheit, die weiter
oben im Abschnitt „Zielgröße 24 × 24" für die anderen Bedienteile bereits
gilt: „ist stattdessen die Bühnenhöhe die engere Grenze … fällt das Gehäuse
noch kleiner aus"). Bei einer höheren Fensterhöhe wächst das Gehäuse weiter:
bei 900 × 1200 Bildpunkten misst der Ton-Schalter bereits 28,2 px in der
Höhe. Die 24-px-Schwelle ist also erreichbar, aber nicht bei jeder üblichen
Kombination aus Fensterbreite und Fensterhöhe gemeinsam — das ist die Zahl,
die dieser Lauf nachliefert, statt die Lücke unter die Risiko-Tasten-Ausnahme
zu schieben.

## Nachweis

```
ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-cabinet.mjs
```

Nur lesend, ohne jede Abhängigkeit. Rückgabewert 0, wenn alles stimmt, sonst
1 — der letzte Lauf zählte **193** Einzelprüfungen, alle grün.

- A-1 Keine eigene Farbe (Ausnahme: die beiden Backend-Icons)
- A-2 Jeder benutzte Design-Token existiert in `casino_startpage/tokens.css`
- A-3 Keine Datei von außen; kein `createElementNS` in JavaScript
- A-4 `casino_startpage` kennt dieses Gerät nicht (im Code)
- A-5 Kein fremder Hersteller-, Modell- oder Spieltitel
- A-6 Die Lizenzangaben widersprechen sich nicht
- A-7 Die acht übernommenen Symbole sind zeichengleich zum Original, und alle
  zwölf Paare `fr-sym-X`/`fr-mini-X` sind zeichengleich zueinander
- A-8 Der Gehäuse-Vertrag der Saal-Miniatur
- A-9 Das Kürzel-Präfix `fr-` wird eingehalten
- A-10 Die Anmeldung bei der Registry stimmt
- A-11 Das große Gehäuse, sein Maßraster und seine `use`-Verweise
- A-12 Barrierefreiheit: Live-Bereiche, Überschrift, Verbergen
- A-13 Keine Abhängigkeit auf ein anderes Gerät
- A-14 Miniatur und großes Gehäuse zeigen dasselbe (Zonenkatalog, Symbolfolge)
- A-15 Genau zwölf Symbole, kein BAR-Block, kein Scatter
- A-16 Jedes Bedienteil hat einen eigenen, nicht leeren Namen
- A-17 Der Leuchtzustand der Risiko-Tasten kennt keinen Übergang
- A-18 Die Risiko-Lampen leuchten bernstein, weit unter der Blitzschwelle
- A-19 Der Haken-Katalog im Kopf von `machine.css` deckt sich mit dem Regelteil
- A-20 Die Koordinatentabelle ist vollständig
- A-21 Der Gewinnplan druckt keine Zahl aus dem Markup – jede Zahl kommt zur
  Laufzeit aus `Classes/Rules.php` über den `CabinetProcessor`
- A-22 Die vier neuen Motive sind formstark und tokenrein
- A-23 Jedes Symbol aus `Rules::SYMBOLS` ist gezeichnet
- A-24 Der Gewinnplan bleibt im Papierrahmen der Koordinatentabelle
  (`CabinetProcessor` gegen `machine.css`, rechnerisch)
- A-25 Das Walzenwerk: Bandlänge, Fenster und Gewinnlinien
- A-26 Geldreihe, Tafel und die Grenze der vier Live-Bereiche
- A-27 Der feste Einsatz steht nur einmal geschrieben (`Rules::STAKE`), nicht
  an drei Stellen ausgeschrieben
- A-28 Der Ton-Schalter: genau ein `[data-fr-sound]`, ein echter
  `<button type="button">`, `aria-pressed="true"` im ausgelieferten HTML, kein
  `disabled`/`aria-disabled`, sein Name kommt aus `locallang.xlf` und
  unterscheidet sich von den zwölf Bedienteilnamen, kein eigener `role="status"`
  — es bleibt bei vier Live-Bereichen
- A-29 Die Frequenzgrenze von drei Lichtwechseln je Sekunde (SC 2.3.1) gilt
  auch für das Einladungsblinken der Risiko-Tasten (Behebungslauf [H4])
- A-30 Kontrast (SC 1.4.3): jede Tastenbeschriftung mit sichtbarem Text
  (START, STOP, AUTO MODE, REWARD, CASH OUT, der Ton-Schalter, die drei
  Aufladeknöpfe) erreicht 4,5:1 gegen JEDEN benannten Farbstopp ihres
  Untergrunds — das Minimum über alle Stopps, nicht nur den günstigsten —
  statisch aus `tokens.css` und `machine.css` nachgerechnet, mit zwei
  Gegenproben (eine bestätigt, dass die Prüfung die ursprüngliche
  START-Regression weiterhin über den tatsächlich ungünstigen, nicht nur
  den hellen Stopp fängt; eine zweite bestätigt dieselbe Rechnung für eine
  erfundene helle Schrift). Behebungslauf 2026-09-05, Befund N-01 und
  Nachträge desselben Tages: jede Beschriftung sitzt auf einem eigenen
  blickdichten Namensschild aus `--ck-chrome-100`, sodass der Kontrast
  nicht mehr davon abhängt, über welchem Teil eines Verlaufs die Schrift
  sitzt

Zwei weitere Prüfskripte liegen in `casino_startpage` und decken dieses Gerät
mit ab, ohne es zu kennen: `Resources/Private/Scripts/verify-risk-timing.mjs`
(**112** Einzelprüfungen, alle grün) beweist die Blitzsicherheit der beiden
Kurvenformen und der Mehrtasten-Leiter, die dieses Gerät nur benutzt (siehe
„Die drei Risikospiele"); `Resources/Private/Scripts/verify-gattung.mjs`
prüft **jede** Geräte-Extension des Hauses, `fruit_risk` eingeschlossen,
gegen dieselbe Negativliste fremder Marken und stellt sicher, dass
`casino_startpage` `fruit_risk` in keiner Datei und in keiner Schreibweise
nennt.

### Die Mathematik: `verify-payout.mjs`

Ein zweites, unabhängiges Skript zählt die Auszahlungsmathematik nach –
mit derselben `evaluate()`-Funktion aus `paytable.js`, mit der ab Phase F4
auch der Browser zahlt, kein Nachbau:

```
ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-payout.mjs --schnell
ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-payout.mjs
```

`--schnell` (unter einer Sekunde) prüft alle Struktur- und Tabellenprüfungen
sowie die Quote und die Feldverteilung in **geschlossener Form** – ohne
einen vollen Lauf. Ohne den Schalter zählt es zusätzlich **alle**
20⁶ = 64.000.000 Stellungen einzeln aus; das ist der eigentliche Nachweis
(Laufzeit 6 Minuten). Rückgabewert 0, wenn alle Prüfungen bestehen; 1, wenn
mindestens eine Prüfung abweicht – das Skript läuft dabei trotzdem
**vollständig durch** und meldet jede Abweichung, es bricht nicht bei der
ersten ab.

**Alle folgenden Kennzahlen stammen aus dem vollständigen Durchlauf über alle
64.000.000 Stellungen vom 2026-09-05 (Laufzeit rund 6 Minuten). Er endete mit
Rückgabewert 0 — jede einzelne Prüfung grün, einschließlich der vollständigen
Auszählung:**

| Kennzahl | Wert |
|---|---|
| Auszahlungsquote | 97,8952 % (Ziel 98 %, Band 95,0–99,5 % – erfüllt) |
| Auszahlung gesamt | 626.529.160 Kredite (Linien 365.541.660, Feldzählung 260.987.500) |
| Gewinngarantie | **null** Stellungen ohne Gewinn (baulich ausnahmslos erzwungen, siehe oben) |
| Trefferhäufigkeit | 100,0000 % je Runde |
| Rundenhöchstgewinn | 386 (4 ×) |
| Stellungen mit Rundengewinn 1 | 7.750.340 (12,1099 %) |
| Stellungen mit Rundengewinn 2 | 7.732.010 (12,0813 %) |
| Stellungen mit Rundengewinn 3 | 8.197.760 (12,8090 %) |
| Ausgleich der drei kleinsten | 5,46 % relativ (Vorgabe ±10 % – **erfüllt**) |
| Stellungen mit Rundengewinn 10 | 584.595 (seltener als jeder der drei kleinsten – erfüllt) |
| P(Feld = 1) (geschlossene Form, exakt) | 13,3880 % |
| P(Feld = 2) (geschlossene Form, exakt) | 13,3880 % |
| P(Feld = 3) (geschlossene Form, exakt) | 14,5498 % |
| Höchster Linienwert | 100 (Sieben über sechs Walzen) |
| Gewinnwert der Grundstellung | 10 (reiner Feldgewinn, keine Linie trifft – `evaluate(Rules::DEFAULT_GRID)`) |

**Der Konzeptverstoß gegen C.14.8 ist behoben.** Drei Suchdurchgänge hatten
den Feldausgleich von 50,4 % über 27,85 % auf 26,08 % relativer Abweichung
gedrückt und dann nichts mehr bewegt. Ein Review zu Phase F3
(`Reviews/REVIEW-fruitrisk-f3.md`, Befund H2) zeigte, dass keiner dieser
drei Durchgänge die Fruchtgeometrie der vier garantierten Walzen als eigene
Suchgröße geführt hatte; ein vierter Durchgang öffnete diese Größe, fand
aber bei unveränderter Gewinntabelle keine Verbesserung, weil jede geringere
Fruchtdichte die Quote unter das Band drückte. Ein fünfter Durchgang hob
diese selbst auferlegte Einschränkung auf (Geometrie UND Gewinntabelle
gemeinsam gesucht, `tune-strips.mjs --joint-suche` – zu jeder Geometrie wird
der Exponent einer Potenzabbildung gesucht, der die Quote ins Band
zurückholt, danach erst wird nach dem Ausgleich bewertet) und senkte den
Ausgleich auf 20,78 %, aber nicht unter 10 %. Ein sechster Durchgang nahm
zwei weitere, bis dahin feste Größen dazu: Lage UND Anzahl der kleinen
Früchte auf den BEIDEN FREIEN Walzen (vorher fest auf „block", einem
Strukturbeweis aus dem zweiten Durchgang, der nur bewies, dass „block" die
Vereinigungsmenge minimiert – nicht, dass es bei inzwischen asymmetrischen
garantierten Walzen auch den Ausgleich minimiert), und ein deutlich dichter
abgetasteter Katalog UNGLEICHER Mischungen auf den garantierten Walzen.
Ein Koordinatenabstieg allein fand darin keine Verbesserung; erst ein
Mehrfachstart aus zufälligen, weit entfernten Startpunkten fand ein ganz
anderes Gebiet: **genau zwei** der vier garantierten Walzen auf das
bauliche Minimum von vier Fruchtpositionen zurückgenommen (mit
verschiedenen verdoppelten Sorten je Walze), die beiden übrigen
garantierten Walzen und beide freien Walzen unverändert. Feldausgleich
**7,99 %** – **unter der verlangten Grenze von 10 %.** Dieses Ergebnis kehrte
in 20 unabhängigen Mehrfachstarts siebenmal identisch wieder (robuster
Anziehungspunkt); weder ein zweiter Koordinatenabstieg noch ein
Paar-Nachlauf (2-opt) fanden danach noch etwas Besseres. Die Gewinntabelle
wurde dafür erneut per Potenzabbildung neu abgestimmt (Exponent p ≈ 0,817),
Höchstwert weiterhin exakt 100. **P-15 sollte nach diesem Durchgang GRÜN
sein** – zu bestätigen mit dem vollen Lauf. Die vollständige Begründung für
alle vier Durchgänge – die Zwischenwerte, die geprüften Kombinationen und
die verworfenen Alternativen – steht in `DECISIONS.md`, Einträge vom
2026-09-05 04:27 CEST, 2026-09-05 05:16 CEST, 2026-09-05 05:59 CEST und
2026-09-05 06:30 CEST.

### Kasse, Angebot und Vertrag: `verify-credit.mjs`

Ein drittes, unabhängiges Skript prüft den Ereignis- und Messpunktvertrag
dieses Dokuments gegen den Quelltext und spielt den Spielkern und die Kasse
gegen die echten Module — seit dem Behebungslauf zu `REVIEW-fruitrisk-f4.md`
**einschließlich des echten `machine.js` selbst**, nicht mehr nur gegen einen
Treiber, der seine Ereignisse nachahmt, und seit Phase F5 zusätzlich
**einschließlich des echten `risk.js` und `auto.js`**:

```
ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-credit.mjs
```

Nur lesend, ändert keine Datei. Rückgabewert 0, wenn alle Prüfungen bestehen —
der letzte vollständige Lauf zählte **906** Einzelprüfungen, alle grün. Neun
Blöcke:

- **S** — Selbstprüfung des Prüfstands: weist mit Gegenproben nach, dass
  seine eigene `checkWritten()`-Prüfung wirklich rot werden kann (siehe die
  „Stub-Falle" im Kopf der Datei), statt gegen eine nie geschriebene
  Vorbelegung grün zu bleiben.
- **K** — Kasse, Einwurf, Auszahlung, Bilanz, das Angebot beim Verlassen der
  Seite, der doppelte Einlöse-Schutz eines Gewinnanspruchs.
- **V** — der Ereignis- und Messpunktvertrag aus dem vorigen Abschnitt, in
  drei Richtungen geprüft: **Dokumentation → Code** (steht jedes in der
  README genannte Ereignis wirklich, mit den genannten Feldern, der
  genannten Abbrechbarkeit und der zugesagten `Object.freeze()`-Versiegelung,
  im genannten Absender?), **Code → Dokumentation** (ist jedes irgendwo unter
  `Resources/Public/JavaScript/` gesendete `fr:`-Ereignis in der README
  genannt — kein undokumentiertes Ereignis?) und **Quelltext gegen
  Quelltext** (schreibt jeder Messpunkt von genau einer Datei?). Block V
  **liest** die Absenderdateien nur als Text — er prüft Dokumentation gegen
  Quelltext, keine Semantik und keinen Lauf; dass die dokumentierten
  Ereignisse tatsächlich mit den dokumentierten Feldern über die Bühne gehen,
  weist ausschließlich Block M nach (siehe unten).
- **R** — Runden und Angebot mit einem von Hand geschriebenen TREIBER (nicht
  `machine.js`): 50 Züge, nach **jedem einzelnen** stimmt die Bilanz (Kasse +
  Gerätekredit) exakt; jede Runde endet im Angebot; `REWARD` und `START`
  schreiben gut und beenden das Angebot; die Deckungsprüfung löst zuerst ein,
  dann prüft sie; ein Zuhörer, der `fr:offer` abbricht — die Bauform, die
  `risk.js` seit Phase F5 tatsächlich benutzt —, bekommt den Anspruch
  tatsächlich übergeben. Der Treiber sendet `fr:round`/`fr:result` von
  Hand — `wallet.js` unterscheidet
  nicht, wer sie sendet, und diese 50 Züge prüfen `wallet.js`/`bank.js`
  gründlicher, als es 3,7 s Walzenlauf je Zug erlaubte. Dass im
  Normalbetrieb wirklich `machine.js` diese Ereignisse sendet, prüft
  ausschließlich Block M.
- **M** — **der ECHTE `machine.js`, tatsächlich gespielt** (siehe „Was Block M
  nachweist" unten).
- **L** — **die drei ECHTEN Risikospiele**, gespielt gegen `risk.js` und
  `risk-ladder-multi.js` selbst, mit dem echten `machine.js` und der echten
  `wallet.js`: das Angebot mit den drei Starttasten und seine drei Satzmuster;
  der Start ohne Wertung und der erste Richtungsdruck als erster Versuch
  (Treffer verdoppelt/vervierfacht/verachtfacht den Anspruch, Fehlgriff
  verwirft ihn ohne Einlösung); jede Leiter auf ihrer eigenen Kurve
  (`data-fr-risk-side`/`-on`/`-pause`/`-cycle` gegen die Tabelle aus „Die drei
  Risikospiele"); „einmal gewählt, bleibt die Leiter" (Tasten der beiden
  untätigen Gruppen bleiben wirkungslos); nie zwei Tasten gleichzeitig
  `.fr-btn--lit` über 30 Sekunden virtueller Uhr; die drei Wege zum
  Aussteigen (`REWARD` im Angebot, `REWARD` in der Leiter, `START` im
  Angebot) und dass `START` in einer laufenden Leiter nichts bewirkt; das
  Verlassen der Seite mit offenem Angebot bzw. laufender Leiter (der
  offene Gewinn wird gutgeschrieben, die Bilanz stimmt exakt); die Kappung
  bei sehr hohen Beträgen; L-10 (der Start ist kein Versuch), L-11 (danach ist
  genau diese Gruppe erreichbar), L-12 (Starttasten sind während einer
  laufenden Leiter und im Grundzustand wirkungslos), L-13 (der Live-Bereich
  „risk" wird beim Start geleert, ohne etwas Neues anzusagen).
- **AU** — **der ECHTE Auto-Modus** (`auto.js`), tatsächlich gespielt:
  Umschalten (`data-fr-auto`, `aria-pressed`, `.fr-btn--lit`); 50 selbst
  ausgelöste Züge, bei denen zu keinem Zeitpunkt eine Risiko-Taste leuchtet
  oder einlädt und die Bilanz nach jedem einzelnen Zug exakt stimmt; die
  sofortige Gutschrift noch vor Ablauf der nächsten Pause
  (`fr:offerend` `reason: "auto"`); die Selbstabschaltung, sobald der
  Gerätekredit für den festen Einsatz nicht mehr reicht; höchstens **ein**
  laufender Zeitgeber (`data-fr-auto-pending`); die drei Umschaltzeitpunkte
  (während eines laufenden Zugs, während des Angebots, während einer
  laufenden Leiter).
- **LR** — baut ein vollständiges Gehäuse (`machine.js`, `wallet.js`,
  `bank.js`, `risk.js`, alle vier Live-Bereiche) und verlangt, dass
  „machine", „grid", „credit" und „risk" **nach dem Aufbau, vor jeder
  Bedienung**, leer sind (C.14.12) — die Gegenprobe zum Abnahmetest-Befund,
  dass „grid" und „credit" sich beim bloßen Laden von selbst füllten.
- **D** — die **generische** Doppelbelegungs-Prüfung über das ganze Feld der
  README-Tabelle „Messpunkte" (mit Ausnahme der drei `sound.js`-Zeilen, die
  `verify-sound.mjs`, T-11, unabhängig prüft): baut das vollständigste
  Gehäuse (`buildFullMachineWithRiskAndAuto()`, alle zwölf Bedienteile,
  CASH OUT, eine echte Runde), zählt für **jede** Zeile, wie viele Elemente
  im Gehäuse sie tragen, und verlangt genau eins — statt nur nach einem
  einzelnen benannten Namen zu fragen. Fand damit sofort einen zweiten,
  bis dahin unbenannten Fall desselben Fehlertyps wie T-84: `data-fr-cashout`
  (jetzt `data-fr-cashout-on`).

Der volle Lauf von `verify-payout.mjs` (64.000.000 Stellungen) muss dafür
**nicht** wiederholt werden: Phase F5 fasst weder `Classes/Rules.php` noch
`paytable.js` an, Quote, Verteilung und Bandregeln bleiben unverändert.

#### Was Block M nachweist — und was nicht

Bis zu diesem Behebungslauf hatte `machine.js` (544 Zeilen, das Herzstück
dieser Phase) **keine einzige ausgeführte Prüfung**: Block V las es nur als
Text, Block R spielte gegen einen Treiber. Block M lädt jetzt den echten
`machine.js` samt dem echten `reel.js`, `grid-announce.js` und `rng.js` — mit
demselben Prüfstand (Stub-DOM, Schreibbuch, `checkWritten()`), aber gegen das
wirkliche Modul statt gegen eine Nachbildung — und spielt tatsächlich damit:

- eine vollständige Runde von `startRound()` bis `fr:result` über die
  virtuelle Uhr, mit der ECHTEN, kryptographischen Ziehung aus `rng.js`;
- die sechs Ruhelagen der Walzen gegen `data-fr-round` (das Prüfsiegel) und
  gegen `fr:reelrest`;
- `data-fr-state` über die volle Zustandsfolge `spinning → stopping →
  evaluating → offer`;
- dass ein zweiter `startRound()`-Anstoß **während** `spinning` nichts
  abbucht und keine zweite Runde beginnt;
- `STOP` von Hand, sechsmal hintereinander, mit einer echten
  Reihenfolgeprüfung der Ruhezeiten (`commandStop()`/`tickFrame()`);
- dass `fr:spin` denselben Weg nimmt wie ein Tastendruck (Einsatz, Zustand);
- den in `press.js` neu gebauten Vertrag (Zeiger UND Tastatur lösen aus,
  ihr jeweiliger Folge-`click` NICHT ein zweites Mal, ein Rechts-/Mittelklick
  nie) — isoliert von jeder Idempotenz-Sperre in `machine.js`/`wallet.js`
  geprüft, damit die eine die andere nicht verdeckt;
- den bewusst **unveränderten** Abbruch einer laufenden Runde beim Verlassen
  der Seite (siehe unten, „Verlassen der Seite").

Jede der sechs Walzen des Prüfstands trägt für Block M ausschließlich
`SYMBOLS[0]` („sieben") — nicht, um die Ziehung zu manipulieren
(`drawIndex()` bleibt der echte, kryptographische Zufall), sondern damit der
Rundengewinn unabhängig von der tatsächlich gezogenen, zufälligen
Landeposition vorher berechenbar ist (alle 30 Linien zahlen denselben
Höchstwert) und sich deterministisch nachrechnen lässt.

Bewusst **nicht** geprüft bleibt: das genaue optische Bewegungsbild der
Walzen (Anlauf, Bremse, Nachfedern — reine Physik ohne Geldbezug) und alles,
was nur ein echter Browser zeigt (Fokusreihenfolge, Bildschirmleser-Ausgabe,
Zielgröße der Bedienteile, ob ein Klang **gut** klingt — siehe
„Barrierefreiheit" und `test.txt`). Die drei Risikospiele prüft seither Block
L, den Auto-Modus Block AU (beide oben).

### Der Klang: `verify-sound.mjs`

Ein viertes, unabhängiges Skript weist den Klang nach — Entwicklerwerkzeug,
kein Bestandteil der Website, nur lesend:

```
ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-sound.mjs
```

Geladen werden **fünf** echte Module über zwei Extensions —
`casino_startpage`: `sound.js`, `sound-kit.js`, `idle-noise.js`; `fruit_risk`:
`sound.js` (das Klangpult) und `counter.js` (sendet `fr:count`). Node hat
weder Web Audio noch ein Dokument; alle drei werden vorher bereitgestellt,
die Zeit läuft virtuell in Schritten von 8 ms. Unter Node klingt nichts, eine
Messung ergäbe 0 — der Ausschlag wird deshalb für jeden Augenblick aus der
Summe aller geplanten Hüllkurven **ausgerechnet**, eine **obere Schranke**,
die der echte Ausschlag nie überschreiten kann.

Rückgabewert 0, wenn alles stimmt, sonst 1 bei der ersten Abweichung — der
letzte Lauf zählte **109** Einzelprüfungen, alle grün. Elf Blöcke (T-1 bis
T-11): kein `AudioContext` und kein Ton vor der ersten echten Geste, auch bei
einem nachgemachten Ereignis nicht (T-1); der Tastaturweg (`keydown`)
schaltet ebenso frei wie der Zeiger (T-2); die sechs Walzenstopps sind
unterscheidbar und **streng steigend** (262/294/330/370/415/466 Hz, T-3); die
drei Leitern klingen verschieden, `risk8` liefert vier unterscheidbare
Tonhöhen ohne Stapelung (T-4); der Zählklang hängt an der Fahrt der Anzeige
GUTHABEN und an keiner anderen (T-5); genau ein Leerlaufgeräusch je Gehäuse,
still, solange das Gerät arbeitet oder eine Leiter läuft (T-6); zwei hörbare
Absagen — ein abgelehnter Zug und ein abgelehnter Einwurf klingen, ein
angenommener Zug bleibt still (T-7); ein Dauerlauf über 50 Runden mit allen
vier Gewinnstufen, Einwürfen, Auszahlungen, allen drei Leiterläufen und
Auto-Modus liefert null verworfene Stimmen, null verworfene Dauerklänge, null
wegen Mindestabstand verworfene Klänge, null Konsolenausgaben und keinen
zurückbleibenden Dauerklang (T-8); der ausgerechnete Ausschlag über den
ganzen Lauf bleibt größer 0 und unter 1,0 (T-9); `aria-pressed` und
`data-fr-sound-on` folgen `sound.enabled` auch dann, wenn eine **andere**
Registerkarte abgeschaltet hat (T-10); **kein** dataset-Feld dieses Gehäuses
ist doppelt belegt — generisch über das ganze Feld geprüft, nicht nur
`data-fr-sound` (T-11, Abnahmetest T-84).

**Was dieses Skript ausdrücklich nicht prüfen kann:** ob der Klang **gut**
ist, ob er zu diesem Gerät passt und ob er an ein bestimmtes fremdes Spiel
erinnert (CONCEPT.md B.3 Nummer 11). Das kann nur ein Mensch — siehe
`test.txt`.

## Was noch nicht da ist

Bis auf das serverseitige Guthaben ist nichts mehr offen – das Gerät ist mit
Phase F5 vollständig.

- Serverseitiges Guthaben – ausdrückliches Nicht-Ziel (CONCEPT.md C.14.15).

## Stand

Version 0.4.0 (alpha). **Phase F5 abgeschlossen: Das Gerät ist vollständig.**
Zusätzlich zu allem aus Phase F4 (sechs laufende Walzen zu je 40 Bandzellen,
sicherer Zufall über `crypto.getRandomValues` ohne jeden Rückfall,
`START`/`STOP` für Zeiger und Tastatur, Hervorhebung der Treffer, ein Satz
Ansage je Runde, Kasse, Gerätekredit, Münzschlitz, `CASH OUT`, fester Einsatz
10, Gewinngarantie in jeder Runde) spielt das Gerät jetzt drei unabhängige
Risikospiele (RISK ×2, RISK x4 und RISK x8 mit zwei bzw. vier Tasten, siehe
„Die drei Risikospiele"), einen Auto-Modus (siehe „Der Auto-Modus") und hat
eine eigene, erfundene Stimme (siehe „Der Klang"). Alle zwölf Bedienteile
sind verdrahtet; `aria-disabled` an den elf Risiko-Bedienteilen wechselt zur
Laufzeit mit dem Angebot, `AUTO MODE` und der neue Ton-Schalter sind
`aria-pressed`-Umschalter. Fehlt die sichere Zufallsquelle, bleibt das
Gehäuse weiterhin unverdrahtet und die Tafel zeigt dauerhaft
„AUSSER BETRIEB".

Für Phase F5 wurden zwei geteilte Bausteine in `casino_startpage` erweitert
bzw. neu angelegt: `risk-timing.js` bekam eine zweite Kurvenform, den vollen
Umlauf mit Pause und die Blitzrate für beliebig viele Tasten
(rückwärtskompatibel, ein einstelliger Aufruf rechnet unverändert);
`risk-ladder-multi.js`
kam als Schwester von `risk-ladder.js` neu dazu — `risk-ladder.js` selbst
blieb unangetastet und wird weiterhin unverändert von `reel_slot` und
`video_slot` benutzt (siehe `casino_startpage/README.md`, Abschnitt
„Risiko-Leiter"). Keine weitere Geräte-Extension wurde für Phase F5 angefasst.
Serverseitiges Guthaben bleibt ausdrückliches Nicht-Ziel (CONCEPT.md
C.14.15).
