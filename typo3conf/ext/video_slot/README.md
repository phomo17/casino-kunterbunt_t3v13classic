# Video Slot

## Zweck

Zweiter Spielautomat des Spaß-Casinos **Casino Kunterbunt**: fünf Walzen, drei
Reihen, fünf feste Gewinnlinien und ein Scatter. Das Gerät steht im Gehäuse
derselben Chrom-und-Holz-Familie wie der Reel Slot, ist aber eine Generation
jünger — flachere Schulter, hinterleuchtetes Kopfschild, ein leuchtendes
Fenster statt gedruckter Walzenbänder und eine große START-Taste dort, wo am
älteren Gerät der Hebel sitzt.

Diese Extension enthält alles, was dieses Spiel ausmacht. Sie lässt sich
installieren und entfernen, ohne dass an `casino_startpage` oder an einer
anderen Extension etwas geändert werden muss.

## Eckdaten

| | |
|---|---|
| Extension-Key | `video_slot` |
| Composer-Name | `phomo17/video-slot` |
| Namespace | `Phomo17\VideoSlot\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.1.0 (Design-Tokens, darunter die beiden neuen Fruchtfarben) |
| Lizenz | AGPL-3.0-or-later |
| Quelltext | https://github.com/phomo17/casino-kunterbunt_t3v13classic |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate video_slot
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach im Backend:

1. Unterhalb der Startseite eine Seite **Video Slot** mit dem URL-Segment
   `/video-slot` anlegen — **ohne** eigenes Backend-Layout. Nur dann greift
   `Pages/Default.html` mit dem Weg zurück in den Saal; das Layout
   „startseite" wäre der Saal selbst.
2. Auf diese Seite in der Spalte „main" ein Inhaltselement **„Video Slot"**
   legen. Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Automaten wählen und als Zielseite die Seite aus Schritt 1 angeben.
4. Cache leeren und beide Seiten aufrufen.

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: VideoSlot::IDENTIFIER,
    title: VideoSlot::LANG_FRONTEND . 'automat.title',
    description: VideoSlot::LANG_FRONTEND . 'automat.description',
    extensionKey: VideoSlot::EXTENSION_KEY,
    cabinetPartial: VideoSlot::CABINET_PARTIAL,
));
```

`register()` hängt `Resources/Private/Partials/` automatisch an die
`partialRootPaths` des Inhaltselements „Casino-Automat" an. Eine weitere
Anmeldung für die Saal-Ansicht gibt es nicht.

Alle festen Bezeichner — Registry-Schlüssel, `CType`, Gehäuse-Partial, Icon
und die beiden XLIFF-Präfixe — stehen ausschließlich in
`Classes/VideoSlot.php`.

## Inhaltselement „Video Slot"

| | |
|---|---|
| `CType` | `video_slot` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.video_slot` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()` |
| Template | `Resources/Private/ContentElements/Machine.html` |
| Stylesheet | `Resources/Public/Css/machine.css`, eingebunden per `<f:asset.css>` und damit nur auf Seiten geladen, auf denen das Element steht |
| DataProcessor | `Phomo17\VideoSlot\DataProcessing\CabinetProcessor`, im TypoScript unter dem Namen `video-slot-cabinet` |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht ab Phase 6
vollständig im Browser.

Bewusst **kein** eigenes Site Set für das TypoScript: ein Set wirkt erst,
wenn die Site-Konfiguration es einbindet — ein zweiter Automat müsste dafür
`typo3conf/sites/casino-kunterbunt/config.yaml` ändern, und genau das
verbietet der Architektur-Grundsatz, dass eine Automaten-Extension ohne
Änderung an anderen Stellen installierbar ist.

## Gehäuse

Es gibt **zwei** Zeichnungen, und sie sind nicht zu verwechseln:

| Datei | Wofür |
|---|---|
| `Resources/Private/Partials/Automat/VideoSlot/Cabinet.html` | die **Miniatur** im Saal. Vertrag aus `casino_startpage/README.md`: genau ein `.ck-cabinet`, darin genau ein `<svg class="ck-cabinet__drawing">` mit `viewBox`-Verhältnis 100 : 160. Breite, Podest, Schattenwurf und Licht von oben liefert der Saal. |
| `Resources/Private/Partials/Automat/VideoSlot/Machine/Cabinet.html` | das **große, bedienbare Gehäuse** auf der Automatenseite, zusammengesetzt aus `Machine/Shell.html` (feste Zeichnung), `Machine/Grid.html` (Sichtfeld), `Machine/NixieGroup.html` / `Machine/NixieTube.html` (Anzeigen) und `Machine/Button.html` (Tasten). |

Das Maßraster ist für beide dasselbe: `viewBox 0 0 100 160`. `.vs-cabinet` ist
ein Container-Query-Container mit genau diesem Seitenverhältnis, deshalb gilt
in allen Kindern **1cqi = 1 viewBox-Einheit — in beiden Achsen**. Ein
HTML-Kasten auf `left: 12cqi` liegt punktgenau über dem SVG-Rechteck `x="12"`.
Die **vollständige Koordinatentabelle** steht im Kopf von
`Resources/Public/Css/machine.css`; sie ist die einzige Quelle dafür.

Diese Extension definiert **keine eigenen Farben**. Was ihr fehlte, wurde als
Token in `casino_startpage/Resources/Public/Css/tokens.css` ergänzt:
`--ck-fruit-plum`, `--ck-fruit-plum-shade`, `--ck-fruit-grape` und
`--ck-fruit-grape-shade`. Tokennamen tragen den Werkstoff, nie ein Gerät —
deshalb ist das keine Kopplung des Site Packages an diesen Automaten.

Eigene CSS-Klassen tragen den Präfix `vs-`. Geteilt werden nur die
Vertragsklassen `ck-cabinet`, `ck-cabinet__drawing` (Miniatur) und
`ck-room-fill` (bildschirmfüllendes Gerät).

Dieses Gerät hat **keinen Hebel** — Geräte dieser Bauart hatten keinen. An
seiner Stelle sitzt die START-Taste auf einer Chrom-Konsole an der rechten
Flanke.

## Symbole

Neun Symbole, alle als `<symbol>` in `<defs>` von `Machine/Shell.html`
definiert und überall nur per `<use href="#vs-sym-…">` verwendet.

| Symbol | Herkunft |
|---|---|
| `sieben` | zeichengleich vom Reel Slot übernommen |
| `glocke` | zeichengleich vom Reel Slot übernommen |
| `weintraube` | **neu** – sechs Beeren in blauviolettem Vollton |
| `melone` | zeichengleich vom Reel Slot übernommen |
| `pflaume` | **neu** – rotviolettes Oval mit Naht und Blatt |
| `orange` | zeichengleich vom Reel Slot übernommen |
| `zitrone` | zeichengleich vom Reel Slot übernommen |
| `kirsche` | zeichengleich vom Reel Slot übernommen |
| `scatter` | **neu** – achtstrahliger Stern auf Messingscheibe |

Der **BAR-Block fehlt ausdrücklich**: er bleibt dem Reel Slot vorbehalten.

Warum die sechs Motive **kopiert** und nicht geteilt sind: ein gemeinsamer
Symbolvorrat müsste entweder in `casino_startpage` liegen — dann kennte das
Site Package Gerätemotive — oder `video_slot` müsste aus `reel_slot` lesen,
und das Entfernen des Reel Slot machte den Video Slot blind. Die Kopie ist der
Preis für zwei wirklich unabhängige Geräte. Sie ist mechanisch und wird vom
Prüfskript gegen das Original abgeglichen.

Aus demselben Grund bringt die Saal-Miniatur ihre neun Definitionen ein
zweites Mal mit, unter den IDs `vs-mini-…`: beide Ansichten könnten auf
derselben Seite liegen, und dokumentweit doppelte IDs wären ungültiges HTML.
Auch diese Kopie prüft das Skript.

## Gewinnplan und Regelwerk

`Classes/Rules.php` ist die einzige Quelle für Symbole, Gewinnlinien,
Gewinnwerte und die Grundstellung des Sichtfelds. Der `CabinetProcessor`
rechnet daraus die Zeichenkoordinaten aus; der Gewinnplan hinter Glas wird
aus derselben Tabelle gedruckt.

Die fünf festen Gewinnlinien (Zeilennummer je Walze, 0 = oben):

| Linie | Walze 1 | 2 | 3 | 4 | 5 | Verlauf |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 1 | 1 | Mitte |
| 2 | 0 | 0 | 0 | 0 | 0 | oben |
| 3 | 2 | 2 | 2 | 2 | 2 | unten |
| 4 | 0 | 0 | 1 | 2 | 2 | fallend |
| 5 | 2 | 2 | 1 | 0 | 0 | steigend |

Alle fünf sind immer aktiv. Gewertet wird von links; die Kirsche zahlt schon
ab zwei gleichen, der Scatter zählt überall im Feld.

**Die Gewinnwerte** (bezogen auf Einsatz 1, aus `Rules::PAYTABLE`):

| Symbol | 2 gleiche | 3 gleiche | 4 gleiche | 5 gleiche |
|---|---|---|---|---|
| Sieben | – | 30 | 180 | 900 |
| Glocke | – | 18 | 100 | 500 |
| Weintraube | – | 12 | 60 | 300 |
| Melone | – | 9 | 40 | 200 |
| Pflaume | – | 7 | 30 | 120 |
| Orange | – | 5 | 18 | 75 |
| Zitrone | – | 3 | 12 | 50 |
| Kirsche | 1 | 2 | 8 | 30 |
| Scatter (überall im Feld, unabhängig von den Linien) | – | 3 | 10 | 50 |

Die Grundstellung `Rules::DEFAULT_GRID` ist so gewählt, dass **alle neun
Symbole gleichzeitig im Feld liegen** und die Stellung trotzdem **kein
Gewinn** ist. Beides prüft das Skript nach.

## Walzenbänder und Quote

Fünf Walzenbänder zu je 25 Positionen (`Rules::STRIPS`), vier bauliche Regeln,
alle von `verify-payout.mjs` geprüft:

1. genau 25 Positionen je Walze;
2. keine zwei gleichen Symbole nebeneinander, Rundumschluss eingeschlossen;
3. genau ein Scatter je Walze;
4. Position 0/1/2 jeder Walze ergibt von oben nach unten genau die Spalte
   dieser Walze aus `DEFAULT_GRID` — nur so zeigt das Gerät die geprüfte
   Grundstellung und ist trotzdem aus einem echten Band gebaut.

Innerhalb jeder Walze wachsen die Symbolzahlen entlang der Rangfolge: je
wertvoller eine Kombination, desto seltener.

Ausgezählt wurden alle 25⁵ = 9.765.625 Walzenstellungen vollständig, nicht
geschätzt:

| Kennzahl | Wert |
|---|---|
| Auszahlung | 9.569.630 von 9.765.625 Einsatz-Einheiten |
| **Auszahlungsquote** | **0,979930 = 97,993 %** |
| Beitrag je Linie | 1.815.268 Einheiten, 529.375 Treffer — für alle fünf Linien gleich |
| Scatter-Anteil | 493.290 Einheiten, 139.833 Treffer |
| Trefferhäufigkeit je Runde | **0,192662** (die fünf Linien lesen dieselben Stoppositionen und sind nicht unabhängig — nur eine vollständige Auszählung liefert diesen Wert) |
| Höchster Gewinn | 5× Sieben auf einer Linie, Faktor 900, 10 von 9.765.625 Stellungen = **1 zu 976.563** |

Exakt 98,000 % ist arithmetisch unmöglich: 0,98 × 9.765.625 = 9.570.312,5 ist
keine ganze Zahl. Die 683 fehlenden Einheiten wären nur über krumme
Gewinnwerte auf einer gedruckten Karte zu holen — 0,007 Prozentpunkte gegen
eine verunstaltete Karte.

Nachgewiesen von `verify-payout.mjs` (Abschnitt „Prüfskript" weiter unten).

## Spielkern

Acht ES-Module unter `Resources/Public/JavaScript/`, eingebunden über die
Import-Map aus `Configuration/JavaScriptModules.php` (Präfix
`@phomo17/video-slot/`). Einziges vom Template angefordertes Modul ist
`video-slot.js`, alles andere zieht es sich selbst nach.

| Datei | Aufgabe |
|---|---|
| `rng.js` | `crypto.getRandomValues`, ohne Modulo-Bias; kein `Math.random()`-Rückfall |
| `reel.js` | eine Walze: Symbolfolge, Bewegung (Zeichenschleife, kein CSS-Übergang), punktgenaue Landung |
| `paytable.js` | Gewinnlinien und Auswertung (aus Phase 6b, importfrei) |
| `nixie.js` | eine Röhrengruppe ansteuern; Phase 6 nutzt sie nur für GEWINN |
| `message.js` | das Meldungsschild, in Phase 6 nur für **AUSSER BETRIEB** |
| `grid-announce.js` | der Live-Bereich des Sichtfelds — ein Satz je Runde |
| `machine.js` | Zustandsmaschine, Rundenablauf, Auswertung, Hervorhebung |
| `video-slot.js` | Einstieg: verdrahtet `.vs-machine`, räumt beim Verlassen der Seite auf |

Der Automat spielt **nicht ohne sichere Zufallsquelle**: fehlt
`crypto.getRandomValues`, bleibt das Gehäuse unverdrahtet und die Tafel zeigt
**AUSSER BETRIEB**.

Vier DOM-Ereignisse am Gehäuse (`.vs-machine`), alle `bubbles: true` — die
Naht zu Phase 7:

| Ereignis | Wann | `detail` |
|---|---|---|
| `vs:round` | vor dem Anlaufen, abbrechbar | `{draw, bet}` |
| `vs:reelrest` | je Walze beim Stillstand | `{reel, cell, symbols}` |
| `vs:result` | nach dem Anzeigen | `{grid, lines, scatter, factor, bet, win}` |
| `vs:state` | jeder Zustandswechsel | `{from, to}` |

Entgegengenommen wird `vs:spin` — „starte jetzt eine Runde" — und führt zu
genau demselben `startRound()` wie ein Tastendruck.

**START und STOP reagieren auf Zeiger *und* Tastatur** (`wirePressButton()` in
`machine.js`): mehr, als der Reel Slot heute kann, dessen STOP-Taste nur auf
`pointerdown` hört.

## Geld, Leiter, Auto-Modus und Klang

Seit Phase 7 spielt der Automat vollständig mit Geld, kennt die Risiko-Leiter
und den Auto-Modus, und klingt.

**Die zwei Töpfe** (CONCEPT.md B.5): die **Kasse** (`casinoKunterbunt.credits`,
allen Geräten dieser Seite gemeinsam, im Kassenfenster im Sockel sichtbar) und
der **Gerätekredit** (`casinoKunterbunt.machine.video_slot`, beim Betreten der
Seite immer 0, in den GUTHABEN-Röhren). Gespielt wird ausschließlich vom
Gerätekredit.

**Der Weg des Geldes:** Kasse → Münzschlitz → Gerät → Einsatz/Gewinn →
`CASH OUT` oder Verlassen der Seite → zurück in die Kasse. Es kann nichts
liegenbleiben.

**Die Ereignisliste des Geräts:**

| Ereignis | Wann | `detail` |
|---|---|---|
| `vs:round` | vor dem Anlaufen, abbrechbar | `{draw, bet}` |
| `vs:reelrest` | je Walze beim Stillstand | `{reel, cell, symbols}` |
| `vs:result` | nach dem Anzeigen | `{grid, lines, scatter, factor, bet, win}` |
| `vs:state` | jeder Zustandswechsel | `{from, to}` |
| `vs:spin` | eingehend – „starte jetzt eine Runde" | — |
| `vs:payout` | ein Gewinn liegt vor, abbrechbar | `{win, bet, claim}` |
| `vs:collect` | ein Anspruch wurde eingelöst | `{amount, credited, capped, machineCredit}` |
| `vs:coin` | ein Einwurf, angenommen oder abgelehnt | `{amount, moved, reason, machineCredit}` |
| `vs:cashout` | `CASH OUT` gedrückt | `{moved, capped, machineCredit}` |
| `vs:count` | ein sichtbarer Zählschritt | `{display, value, index, steps, direction}` |
| `vs:risk` | Phase `offer` abbrechbar, sonst nur beobachtbar | `{phase, level, win, lost?}` |
| `vs:risktick` | das gemalte Lichtfeld hat gewechselt | `{level, lit, on}` |
| `vs:riskcollect` | eingehend – „steig jetzt aus und schreib gut" | — |
| `vs:auto` | der Auto-Modus wurde umgeschaltet | `{on, reason, rounds}` |

**Die Messpunkte am Gehäuse:**

| Attribut | Bedeutung | Eigentümerdatei |
|---|---|---|
| `data-vs-round` | Ziehung der laufenden Runde | `machine.js` |
| `data-vs-machine-credit`, `data-vs-mirror` | Gerätekredit und Spiegelwert | `wallet.js` |
| `data-vs-bank`, `data-vs-total`, `data-vs-cashout` | Kassenstand, Bilanz aus Kasse + Gerät, Zustand der Auszahltaste | `bank.js` |
| `data-vs-risk-*` | Zustand der Risiko-Leiter (`phase`, `level`, `win`, `side`, `on`, `lit`) | `risk.js` |
| `data-vs-auto`, `data-vs-auto-rounds`, `data-vs-auto-pending` | Zustand des Auto-Modus | `auto.js` |
| `data-vs-sound-*` | Klangzustand und Messwerte | `sound.js` |

**Die Klangzuordnung:** aus dem geteilten Baukasten (`sound-kit.js`) kommen
Münze, Münzkaskade, Metall, Blech, Klinke, Registrierkasse und Zählschritt.
Diesem Gerät eigen sind Startklang, Walzenstopp (fünf Tonhöhen), Laufgeräusch,
Gewinn-Jingle, Risiko-Klänge, `AUTO` und der Ton-Schalter — sie sind die
Klangsprache genau dieses Automaten, siehe Kopf von `sound.js`.

Neun weitere ES-Module unter `Resources/Public/JavaScript/`:

| Datei | Aufgabe |
|---|---|
| `press.js` | Drucktasten für Zeiger und Tastatur — der gemeinsame Helfer für alle Spieltasten |
| `counter.js` | ein Zählwerk vor einer Röhrengruppe, importfrei |
| `payout.js` | der Gewinnanspruch (`WinClaim`) |
| `coinslot.js` | der Geldeinwurf am Gehäuse |
| `wallet.js` | Verrechnung, Einsatzwahl, GUTHABEN und EINSATZ |
| `bank.js` | Kassenfenster und `CASH OUT` |
| `risk.js` | das Bedienfeld der geteilten Risiko-Leiter (`@phomo17/casino-startpage/risk-ladder.js`) |
| `auto.js` | der Auto-Modus |
| `sound.js` | Klangzuordnung des Geräts |

## Barrierefreiheit

Dieses Gerät ist vollständig neu, deshalb gilt für **jedes** seiner
Bedienteile, was am Reel Slot nur für die nachträglich hinzugekommenen galt:

- Die beiden Risiko-Tasten tragen keine sichtbare Beschriftung und bekommen
  ihren Namen über `aria-label` aus der Sprachdatei. Am Reel Slot durften sie
  namenlos bleiben.
- Die vier Einsatztasten zeigen nur eine Ziffer; als Name eines Bedienteils
  ist eine nackte „1" sinnlos, also lautet er „Einsatz 1".
- Die Einsatzwahl benutzt **`aria-pressed`, keine Radiogruppe**: eine
  Radiogruppe verlangt Pfeiltastensteuerung mit wanderndem `tabindex`, also
  JavaScript — und diese Phase hat keines. `aria-pressed` ist ohne eine Zeile
  Skript korrekt und bleibt es auch, wenn Phase 7 die Wahl beweglich macht.
- **Sieben leere Live-Bereiche** (`role="status"`) stehen von Anfang an im
  ausgelieferten HTML: Meldungsschild, Sichtfeld, die vier Röhrengruppen und
  das Kassenfenster. Leer, weil ein Live-Bereich, den ein Skript anlegt *und*
  füllt, von Hilfsmitteln nicht angesagt wird.
- Jede **gezeichnete Anzeige** ist zweigeteilt: die Zeichnung trägt
  `aria-hidden="true"` — für ein Hilfsmittel wären Beschriftung und Zahl sonst
  zwei lose Textbrocken ohne Zusammenhang —, und daneben steht der unsichtbare
  Ansagebereich mit Beschriftung und Wert in **einem** Satz („Guthaben: 250").
- Jedes Bedienteil bekommt einen sichtbaren **Fokusrahmen** über eine einzige
  Regel `.vs-cabinet :focus-visible`.
- Verborgen wird ausschließlich über `opacity` und `pointer-events`, nie über
  `visibility` oder `display`: beide nähmen den Live-Bereich aus dem
  Barrierebaum und machten `role="status"` wirkungslos.

Seit Phase 6 (Walzenwerk und Bedienung) zusätzlich:

- **Sieben Live-Bereiche bleiben sieben.** Kein neuer `role="status"` für das
  Rundenergebnis — es reist durch den bereits vorhandenen Bereich des
  Sichtfelds (`grid-announce.js`).
- **Ein Satz je Runde**, nicht fünfzehn Bruchstücke: erst der Feldzustand
  Walze für Walze, dann Betrag und getroffene Linien. Der Bereich wird beim
  Rundenstart geleert, damit während des Laufs keine veraltete Behauptung
  dasteht.
- **START und STOP sind mit der Tastatur bedienbar** — beide reagieren auf
  Zeiger *und* auf Enter/Leertaste (`wirePressButton()` in `press.js`).
  Ausdrücklich mehr, als der Reel Slot heute kann, dessen STOP-Taste nur auf
  `pointerdown` hört.
- **Kein Kanal ist rein farblich:** der Treffer trägt einen Rahmen (Form,
  `.vs-cell--win`), die Gewinnlinie erscheint zusätzlich sichtbar (Form), und
  die Ansage im Live-Bereich nennt Betrag und Linien (Text).

Seit Phase 7 (Kasse, Risiko-Leiter, Auto-Modus, Klang) zusätzlich:

- **Alle Spieltasten reagieren auf Zeiger *und* Tastatur:** START, STOP,
  RISK, REWARD, die beiden Risiko-Tasten und AUTO MODE (`wirePressButton()`
  in `press.js`, seit dieser Phase in einer eigenen Datei, weil ihn auch
  `risk.js` und `auto.js` brauchen).
- `CASH OUT` und die Einsatztasten sind echte Schaltflächen und reagieren auf
  `click` — Eingabe- und Leertaste lösen sie damit ohne eine eigene Zeile aus.
- **Die Einsatzwahl wird während eines Zuges über `aria-disabled` gesperrt,
  nicht über `disabled`:** `disabled` nähme den Tastfokus mitten im Zug weg,
  wenn er gerade auf einer Einsatztaste liegt. Die wirksame Sperre bleibt die
  Prüfung im Code; `aria-disabled` ist die Ansage dazu.
- **Die Ansage der Gruppe STUFE nennt den Ausgang der Leiter, nicht jede
  einzelne Stufe** (`NixieGroup.html`): eine Leiter über mehrere Treffer
  erzeugte sonst mehrere Ansagen in wenigen Sekunden.
- **Der Ton lässt sich auch mit der Tastatur freischalten:** die
  Autoplay-Sperre hängt an `pointerdown` *und* an `click`, damit ein Spieler
  ohne Zeigergerät nicht dauerhaft stumm bleibt.

Drei Grenzen, ehrlich benannt statt behoben:

- Die **Mindestzielgröße von 24 × 24 Bildpunkten** (WCAG 2.2, 2.5.8)
  erreichen die kleinen Tasten erst ab einer gerenderten Gehäusebreite von
  rund 290 Bildpunkten. Das ist die Maßordnung des ganzen Gehäuses und ließe
  sich nur durch ein anderes Gehäuse ändern. Die START-Taste ist mit ⌀ 12,4
  Einheiten die größte des Geräts und erreicht sie deutlich früher.
- **A-07 (Auditbericht 2026-09-05/06) — dieselbe Zielgröße, aber für
  `+10`/`+50`/`+100`** (`.vs-coinslot__button`): sie sind **Bedienung**, keine
  Spielfläche, die obige Ausnahme gilt für sie nicht. Sie erreichen 24×24 px
  erst **ab 480 px Fensterbreite** (360 px: 18,7–21,6 × 19,0 px; 480 px:
  25,3–29,1 × 25,7 px — Messwerte identisch zum Reel Slot, siehe dort). Der
  Grund steht bereits in `machine.css`, Abschnitt „ZIELGROESSE, dokumentierte
  Abweichung (Audit V-04)": der Block der drei Knöpfe (20 Einheiten) liegt
  unmittelbar vor dem gezeichneten Münzschlitz (2 Einheiten Abstand); 24 px
  bei 360 px verlangten rund 25 Einheiten und schöben den Block in den
  Schlitz hinein — „behebbar nur durch eine Neuaufteilung der Sockelreihe an
  beiden Geräten". Anders als beim Vorbild FruitRisk gibt es hier keinen
  ungezeichneten Freiraum bis zur nächsten festen Zone, den eine
  Vergrößerung ausnutzen könnte, ohne das Gehäuse zu verziehen.
- **`prefers-reduced-motion`** bleibt laut Konzept Nicht-Ziel. Das Fehlen
  einer Bewegungsdrosselung ist Absicht, kein Versehen.

**Behebungslauf 2026-09-05/06** (zusätzlich zu den obigen Punkten):

- **A-08 · Tastenbeschriftungen knapp unter dem Sollwert.** STOP, AUTO MODE
  und RISK erreichten bei 7,5 px nur 4,22–4,36:1 statt 4,5:1 (SC 1.4.3), weil
  `.vs-btn__label` direkt auf der gezeichneten Bedienleiste liegt, ohne
  eigenen Untergrund. `.vs-btn__label:not(:empty)` legt jetzt ein
  blickdichtes Namensschild (`--ck-chrome-100`) dahinter — übernommenes
  Muster aus `fruit_risk/machine.css` (dort N-01/A-30). Nachgemessen (1440 px,
  `rgb(61, 69, 76)` auf `rgb(246, 249, 251)`): **9,22:1**. `:not(:empty)`
  lässt die beiden unbeschrifteten Risiko-Tasten ausdrücklich aus.
- **N-04 · Vier Live-Bereiche füllten sich innerhalb von 300 ms nach dem
  Laden** — darunter das gesamte Walzenbild —, bevor irgendjemand etwas
  bedient hatte. `machine.js` rief in seinem Konstruktor bislang
  `gridAnnouncer.showGrid(this.readGrid())` auf; dieser Aufruf ist ersatzlos
  entfernt (übernommenes Muster aus `fruit_risk/machine.js`), das Sichtfeld
  bleibt jetzt leer, bis `finishRound()` den ersten echten Satz meldet. Für
  GUTHABEN, EINSATZ und KASSE gilt dieselbe Behebung wie am Reel Slot:
  `show()`/`clear()` (`nixie.js`) und `snap()`/`paint()` (`counter.js`)
  nehmen ein zweites Argument `announce` (Vorgabe `true`, `wallet.js` ruft
  den Anfangsstand mit `false` auf), und `bank.js` sagt bei
  `reason === 'subscribe'` nichts an.

Dies ist eine Aufzählung dessen, was getan wurde — **keine Aussage über
Konformität**. Ob das Ergebnis eine Norm erfüllt, kann nur eine Prüfung durch
Menschen feststellen.

## Prüfskripte

Vier voneinander unabhängige Nachweisskripte, alle nur lesend:

```
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-payout.mjs
```

Zählt alle 25⁵ = 9.765.625 Walzenstellungen vollständig aus (Abschnitt
„Walzenbänder und Quote"): die vier Bandregeln, `Rules::PAYTABLE` gegen
`paytable.js` Wert für Wert in beide Richtungen, die Auszahlungsquote im Band
97,0–99,0 % (bestimmt den Rückgabewert), Beitrag je Linie, Scatter-Anteil,
Trefferhäufigkeit je Runde und die Wahrscheinlichkeit des höchsten Gewinns.
Rückgabewert 0, wenn alles stimmt, sonst 1.

```
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-cabinet.mjs
```

Nur lesend, ohne jede Abhängigkeit. Rückgabewert 0, wenn alles stimmt,
sonst 1. Geprüft wird: keine eigene Farbe, jeder benutzte Token existiert,
keine Datei von außen, `casino_startpage` kennt den Video Slot nicht, genau
die neun Symbole ohne BAR, die sechs übernommenen Symbole sind zeichengleich
zum Reel Slot, Miniatur und großes Gehäuse zeigen dasselbe, die Grundstellung
ist kein Gewinn, alle neun Symbole sind gleichzeitig sichtbar, jedes
Bedienteil hat einen Namen, die Live-Bereiche werden leer ausgeliefert, der
Haken-Katalog im Kopf von `machine.css` deckt sich mit dem Regelteil, und
(seit dem Behebungslauf 2026-09-06, Kennung A-13) kein fremder Hersteller-,
Modell- oder Spieltitel gegen dieselbe Negativliste wie in
`coin_pusher`/`roulette`/`fruit_risk`.

Wird die Adresse der Automatenseite angehängt, prüft das Skript zusätzlich
das ausgelieferte HTML — Statuscode, Zahl der Walzen, Felder, Gewinnlinien und
Röhren, und dass außer den eigenen Stylesheets und dem Favicon nichts geladen
wird:

```
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-cabinet.mjs \
  https://casino-kunterbunt.ddev.site/video-slot
```

Das Skript ersetzt keinen Blick auf das Gerät: ob es richtig **aussieht**,
kann kein Skript beantworten.

```
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-credit.mjs
```

Prüft Kasse, Verrechnung, Risiko-Leiter und Auto-Modus mit den echten Modulen
(`wallet.js`, `bank.js`, `coinslot.js`, `payout.js`, `risk.js`, `auto.js`,
dazu die vier geteilten Bausteine aus `casino_startpage`). Nachgewiesen wird
unter anderem: die Bilanz aus Kasse und Gerätekredit stimmt über 50 Züge nach
jedem einzelnen exakt, der Vertrag aus `machine.js` (`vs:round`, `vs:state`,
`vs:reelrest`, `vs:result`, `vs:spin`) steht wortgleich wie geprüft, ein
zweites Einlösen desselben Gewinnanspruchs bucht nichts, die Risiko-Leiter
folgt auf jeder Stufe derselben Kurve wie am Reel Slot (`risk-timing.js`),
und der Auto-Modus läuft 50 Züge stabil ohne Leiter und schaltet sich bei zu
geringem Gerätekredit selbst ab. Rückgabewert 0, wenn alles stimmt, sonst 1.

```
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-sound.mjs
```

Prüft den Klang mit den echten Modulen (`sound.js` dieses Geräts, dazu
`sound.js`, `sound-kit.js` und `idle-noise.js` aus `casino_startpage`).
Nachgewiesen wird unter anderem: vor der ersten echten Nutzergeste entsteht
kein `AudioContext`, der Tastaturweg schaltet den Ton ebenso frei wie der
Zeiger, der Zählklang hängt an der sichtbaren Fahrt, zwei Absagen klingen
hörbar verschieden und eine dritte bleibt stumm, die fünf Walzenstopps sind an
fallenden Grundtönen unterscheidbar, `aria-pressed` am Ton-Schalter folgt dem
Zustand auch bei einer fremden Registerkarte, und ein Dauerlauf über 50 Runden
verwirft keine Stimme und bleibt rechnerisch unter dem Übersteuern (Ausschlag
< 1,0). Rückgabewert 0, wenn alles stimmt, sonst 1.

## Stand

Version 0.2.0 (alpha). Aus Teil B sind die Phasen 5, 6 und 7 eingearbeitet:
Gerüst, Registrierung und Gehäuse stehen, der Automat spielt vollständig im
Browser — Walzenwerk, Zufallsziehung, Auswertung nach den fünf Gewinnlinien
und dem Scatter, Hervorhebung der Treffer, Ansage im Live-Bereich des
Sichtfelds und ein mit Zeiger *und* Tastatur bedienbares START/STOP —, und
seit Phase 7 verrechnet der Automat Geld: die Kasse und der Gerätekredit sind
verdrahtet, der Münzschlitz nimmt Einwürfe an, `CASH OUT` zahlt aus, die
Einsatzwahl ist bedienbar, das Gerät kennt die Risiko-Leiter aus dem Site
Package (dieselbe Kurve, dasselbe Verhalten wie am Reel Slot), den Auto-Modus
und den vollständigen Klang. Alle dafür bereits gezeichneten Zustände des
Gehäuses sind über CSS-Klassen ausgelöst — der vollständige Katalog steht im
Kopf von `machine.css`.
