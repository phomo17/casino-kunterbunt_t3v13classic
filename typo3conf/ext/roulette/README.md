# Roulette

## Zweck

Erstes Tischspiel des Spaß-Casinos **Casino Kunterbunt**: das amerikanische Rad
mit 38 Fächern (Zahlen 1–36, `0` und `00`), Mahagoni-Ring, Messingrillen und
eine Kugel, die wirklich läuft — das Ergebnis einer Runde entsteht aus der
Simulation und wird nicht vorher gezogen.

Diese Extension enthält alles, was dieses Spiel ausmacht. Sie lässt sich
installieren und entfernen, ohne dass an `casino_startpage` oder an einer
anderen Extension etwas geändert werden muss.

## Eckdaten

| | |
|---|---|
| Extension-Key | `roulette` |
| Composer-Name | `phomo17/roulette` |
| Namespace | `Phomo17\Roulette\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.4.0 (Design-Tokens, darunter die sechs neuen Rad-Farben) |
| Lizenz | AGPL-3.0-or-later |
| Quelltext | https://github.com/phomo17/casino-kunterbunt_t3v13classic |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate roulette
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach im Backend (oder über das Wegwerfskript `build-roulette-structure.php`
im Projektstamm, zuerst mit `--dry-run`):

1. Unterhalb der Startseite eine Seite **Roulette** mit dem URL-Segment
   `/roulette` anlegen — **ohne** eigenes Backend-Layout.
2. Auf diese Seite in der Spalte „main" ein Inhaltselement **„Roulette"**
   legen. Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Tisch wählen und als Zielseite die Seite aus Schritt 1 angeben.
4. Cache leeren und beide Seiten aufrufen.

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: Roulette::IDENTIFIER,
    title: Roulette::LANG_FRONTEND . 'automat.title',
    description: Roulette::LANG_FRONTEND . 'automat.description',
    extensionKey: Roulette::EXTENSION_KEY,
    cabinetPartial: Roulette::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));
```

Einziger Unterschied zu einer Automaten-Extension: `gattung: Gattung::Tisch`
(CONCEPT.md C.1 Nr. 1). Davon hängt allein ab, wie der Saal die Bühne baut und
in welcher Gruppe das Gerät in der Backend-Auswahlliste steht.

`register()` hängt `Resources/Private/Partials/` automatisch an die
`partialRootPaths` des Inhaltselements „Casino-Automat" an. Eine weitere
Anmeldung für die Saal-Ansicht gibt es nicht.

Alle festen Bezeichner — Registry-Schlüssel, `CType`, Gehäuse-Partial, Icon
und die beiden XLIFF-Präfixe — stehen ausschließlich in
`Classes/Roulette.php`.

## Inhaltselement „Roulette"

| | |
|---|---|
| `CType` | `roulette` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.roulette` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()` |
| Template | `Resources/Private/ContentElements/Table.html` |
| DataProcessor | `Phomo17\Roulette\DataProcessing\WheelProcessor`, im TypoScript unter dem Namen `roulette-wheel` |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht vollständig
im Browser.

Bewusst **kein** eigenes Site Set für das TypoScript: ein Set wirkt erst,
wenn die Site-Konfiguration es einbindet — ein weiteres Gerät müsste dafür
`typo3conf/sites/casino-kunterbunt/config.yaml` ändern, und genau das
verbietet der Architektur-Grundsatz, dass eine Geräte-Extension ohne Änderung
an anderen Stellen installierbar ist.

## Der Tisch und das Rad

Seit dem Umbau nach den zwei Bildvorlagen (Ansage vom 2026-09-08) stehen Rad
und Spielplan auf **einer** Fläche, ringsum ein Holzrahmen — nicht mehr als
zwei nebeneinanderstehende Kästen. Der Tisch ist ein Kasten mit festem
Seitenverhältnis **504 : 160** und **drei gestapelten Schichten**:

| Datei | Schicht | Wofür |
|---|---|---|
| `Resources/Private/Partials/Table/Roulette/Cloth.html` | 1 (unten) | die **Zeichnung** des Tisches: Schatten, Holzrahmen, Maserung, Messingfase, Zarge, Tuch, Radmulde und die gerechneten Umrisse der zwei Pfeilfelder `0`/`00`. `aria-hidden`, sie sagt nichts, was nicht auch als Text dasteht. |
| `Resources/Private/Partials/Table/Roulette/Wheel.html` | 2 (Mitte) | das **große Rad**, unverändert, mit allen 38 Fächern nach Anhang F, gerechnet vom `WheelProcessor`, jetzt absolut in der Radmulde platziert. |
| `Resources/Private/Partials/Table/Roulette/Felt.html` | 3 (oben) | das **Tuch**: 159 echte Bedienteile nach Anhang F als durchsichtige Überlagerung, gerechnet vom `FeltProcessor` — siehe „Das Tuch" unten. |

Dazu die **Miniatur** im Saal, `Resources/Private/Partials/Table/Roulette/Cabinet.html`:
Vertrag aus `casino_startpage/README.md`, genau ein `.ck-cabinet`, darin genau
ein `<svg class="ck-cabinet__drawing">` mit `viewBox`-Verhältnis 160 : 100
(Gattung Tisch, quer). Zeigt Tischplatte, Rad und das Zahlenfeld des Tuchs —
als Zeichen, keine Maßzeichnung.

**Die Maßordnung, aus der alles folgt** (`Classes/BetLayout.php`): die
`viewBox` von `Cloth.html` ist `0 0 504 160`. Darin liegt das Tuch bei
x 20…484, y 20…140, die Radmulde bei Mittelpunkt 86/80 mit Halbmesser 58, und
der Spielplankasten (das Gitter der 159 Felder) bei x 152…480, y 24…136 —
also **328 × 112**. Das ist **genau** das Verhältnis 41 : 14 der Spursummen
des CSS-Gitters (27 Spaltenspuren, 9 Zeilenspuren): `328 × 14 = 112 × 41 =
4592`. Diese eine Gleichung ist das Herzstück des Umbaus — nur weil sie
stimmt, füllen die `fr`-Anteile des Gitters den Spielplankasten der Zeichnung
ohne Verzerrung aus, und Prüfung **F-13** in `verify-felt.mjs` rechnet sie bei
jedem Lauf nach.

Rad und Tuch benutzen dieselbe Bauform (Ring, Messingrille, Fächerkranz,
Chromkegel, Kugel) und ausschließlich gedrehte Kopien eines einzigen
Fach-Segments (`transform="rotate(…)"`) statt für jedes Fach einzeln
gerechneter Koordinaten.

Diese Extension definiert **keine eigenen Farben**. Was ihr fehlte, wurde als
Token in `casino_startpage/Resources/Public/Css/tokens.css` ergänzt:
`--ck-pocket-red`, `--ck-pocket-black`, `--ck-pocket-green`,
`--ck-pocket-mark`, `--ck-pocket-edge` und `--ck-ivory-100`. Tokennamen tragen
den Werkstoff, nie ein Gerät — deshalb ist das keine Kopplung des Site
Packages an dieses Gerät.

Eigene CSS-Klassen tragen den Präfix `ro-`. Geteilt werden nur die
Vertragsklassen `ck-cabinet`, `ck-cabinet__drawing` (Miniatur),
`ck-room-fill` und die Tisch-Bausteine aus `casino_startpage`
(`data-ck-table-go`, `data-ck-table-status`, `data-ck-table-history`,
`data-ck-table-history-empty`).

### Die Ansicht: `wheel-view.js` und `roulette.js`

Seit Teilstück C2-D dreht sich das Rad wirklich. Zwei Dateien tragen das,
strikt getrennt von der Physik:

| Datei | Aufgabe |
|---|---|
| `Resources/Public/JavaScript/wheel-view.js` | zeichnet. Liest `wheel-physics.js` und schreibt je Bild vier Zahlen (`--ro-wheel-turn`, `--ro-ball-turn`, `--ro-ball-r`, `--ro-ball-hop`) als Custom Properties an `[data-ro-head]` und `[data-ro-ball]`. Verändert an der Physik nichts. |
| `Resources/Public/JavaScript/roulette.js` | verdrahtet den Tisch: Zufallsgeber, Physik, Ansicht, den geteilten Rundenablauf `table-round.js` (Phase C1) und den Verlaufsstreifen. Löst damit den ersten Browser-Einsatz von `table-round.js` aus (`casino_startpage/README.md`, „Der Mustertisch"). |

**Wer wann malt, entscheidet ausschließlich die Ansicht.** In
`wheel-physics.js` steht kein `requestAnimationFrame` — dieselbe Trennung wie
bei den bestehenden Automaten. `wheel-view.js` läuft mit demselben festen
Zeitschritt wie die Physik (240 Schritte/s, `DT`), sammelt die verstrichene
Zeit und holt höchstens `MAX_CATCHUP_STEPS` Schritte nach; ein versteckter Tab
hält die Schleife an (`visibilitychange`) und verwirft den Zeitübertrag.

**Ein `Wheel`-Objekt je Seitenaufruf, nicht je Wurf.** `roulette.js` erzeugt
die Physik genau einmal beim Verdrahten des Tisches und ruft `launch()` bei
jedem Knopfdruck auf demselben Objekt — deshalb läuft die Radscheibe über
beliebig viele Würfe hinweg weiter, wo sie stand (CONCEPT.md C.6.2), solange
die Seite nicht neu geladen wird. Ein Neuladen der Seite ist im ganzen
Projekt ein Neuanfang, kein Zustand, der über die Seitenansicht hinaus
gesichert wird (dieselbe Haltung wie beim Guthaben: „Neuladen zählt als
Verlassen"); die Radstellung wandert deshalb bewusst NICHT über
`localStorage` oder `sessionStorage` in eine neue Seitenansicht hinüber —
das verlangt weder C.6.2 noch C.5.3, und C.5.3 verbietet `localStorage` in
der Physik ausdrücklich.

**Ergebnis, Ansage, Verlaufsstreifen.** Sobald `wheel.step()` die Kugel in ein
Fach legt, ruft `wheel-view.js` `onRest(fachzeiger)` genau einmal.
`roulette.js` liest daraus Zahl und Farbe (`wheel-geometry.js`), durchläuft
den Rundenablauf vollständig bis zurück nach `'setzen'`, trägt eine Marke im
Verlaufsstreifen ein (Zahl als Text, Farbname als `title`, nie Farbe allein)
und sagt „Ergebnis: {Zahl}, {Farbe}." im Live-Bereich an — mit 700 ms
Entprellung und sofortiger erster Ansage, dieselbe Regel wie in
`table-controls.js` und `credit-display.js`.

## Die Radgeometrie (Anhang F)

Die Radanordnung des amerikanischen Rades — 38 Fächer, ihre Reihenfolge, ihre
Farben — steht an **drei** Orten, und alle drei müssen übereinstimmen:

| Ort | Rolle |
|---|---|
| `Resources/Public/JavaScript/wheel-geometry.js` | die **maßgebliche Fassung**. Importfrei, läuft unverändert unter Node und im Browser. Von hier rechnet später auch die Physik (Teilstück C2-C). |
| `Classes/WheelGeometry.php` | der **PHP-Spiegel**, damit das Rad serverseitig gezeichnet werden kann (Fluid kann keine JavaScript-Datei lesen). Keine zweite Wahrheit, sondern eine geprüfte Abschrift. |
| `Classes/DataProcessing/WheelProcessor.php` | rechnet aus der PHP-Fassung die 84 Drehwinkel vor (38 Fachwinkel, 38 Rillenwinkel, 8 Rautenwinkel), damit `Wheel.html` keinen einzigen Winkel von Hand enthält. |

**Warum die Reihenfolge nicht frei gewählt ist.** Beim amerikanischen Rad
liegen sich gegenüberliegende Fächer als Paar aufeinanderfolgender Zahlen
gegenüber (`{2k−1, 2k}`), und `0` liegt `00` gegenüber. Das ist kein
Designdetail, sondern das Erkennungsmerkmal dieses Radtyps — eine andere
Reihenfolge wäre ein anderes Spiel.

**Wie die Zeichnung ohne Sinus und Kosinus auskommt.** `Wheel.html` setzt
jedes Fach, jede Messingrille und jede Raute als **gedrehte Kopie** eines
einzigen `<defs>`-Bausteins ein (`<use transform="rotate(…)">`). Der
`WheelProcessor` liefert dafür nur Winkel in Grad — keine Koordinaten. Die
Umrechnung „Winkel und Halbmesser → x und y" übernimmt ausschließlich der
Browser beim Zeichnen. Dieselbe Bauart trägt später die Ansicht (Teilstück
C2-D, CSS `rotate()`) und ist die Grundlage dafür, dass auch die Physik
(Teilstück C2-C) ganz ohne Winkelfunktion rechnen kann — siehe dort.

Die Maßordnung von `Wheel.html`, `viewBox="0 0 200 200"`, Mittelpunkt
100/100:

| Name | Halbmesser | Bedeutung |
|---|---|---|
| Außenkante Holzring | 99 | Mahagoni-Ring |
| Messingrille | 94 | schmaler Grat |
| Laufbahn (`TRACK_RADIUS`) | 88 | Mitte der Kugel an der Bahnwand |
| Rautenring (`DEFLECTOR_RADIUS`) | 72 | die acht Rauten |
| Radscheibe (`ROTOR_RADIUS`) | 62 | Außenkante der drehenden Scheibe |
| Fachmitte (`POCKET_RADIUS`) | 50 | Ruhelage der Kugel |
| Kegel (`CONE_RADIUS`) | 34 | die Kugel kommt nicht dahinter |
| Kugel (`BALL_RADIUS`) | 3 | |

Dieselben acht Zahlen stehen in `wheel-physics.js` (Teilstück C2-C);
`verify-wheel.mjs` (Kennung W-5) gleicht sie gegen `Wheel.html` ab, sobald
diese Datei existiert.

**Kontrast.** Die aufgemalte Fachzahl (`--ck-pocket-mark`) erreicht auf
allen drei Fachfarben mindestens 4,5 : 1 (WCAG 2.2, Erfolgskriterium 1.4.3),
nachgerechnet von `verify-wheel.mjs` (Kennung W-7) — gemessen (Stand dieses
Teilstücks): 6,88 : 1 auf Rot, 16,09 : 1 auf Schwarz, 5,76 : 1 auf Grün.

## Physik: wie das Ergebnis entsteht

`Resources/Public/JavaScript/wheel-physics.js` ist die wichtigste Datei dieser
Extension: Sie **erzeugt** das Ergebnis einer Runde, sie stellt es nicht dar.
Es gibt darin keine einzige Zeile, die ein Fach auswählt — es gibt nur eine
Kugel, die läuft, stößt und irgendwann liegen bleibt. Wo sie liegt, wird
abgelesen. Zufällig ist ausschließlich, **womit** die Simulation startet
(Kräfte, Winkel, Anstoßpunkt), nicht, wie sie ausgeht (CONCEPT.md C.5.1).

**Nur Polarkoordinaten, keine Winkelfunktion.** Gerechnet wird durchgehend in
Winkel (`turn`, eine volle Umdrehung ist `1.0`), Winkelgeschwindigkeit
(`omega`), Halbmesser (`r`), Radialgeschwindigkeit (`vr`) und Sprunghöhe
(`h`). In diesen Größen ist jede Bewegungsgleichung eine reine Strich- und
Punktrechnung, und jede Kollision ist ein Vergleich von Winkelabständen oder
Halbmessern — ein Fach ist ein Winkelbereich, eine Rille eine Winkelkante,
eine Raute ein fester Winkel auf der Schüssel. Ein Sinus wäre erst nötig, um
daraus x und y zu machen, und genau das übernimmt ausschließlich der Browser
beim Zeichnen (`rotate()`/`translate()`, siehe `wheel.css` und
`Wheel.html`); sein Ergebnis fließt nie in die Simulation zurück. Grund:
`Math.sin`/`Math.cos` legt die Sprachnorm nicht bitgenau fest, ein Nachweis
über hunderttausende Läufe müsste aber auf jeder Maschine dasselbe letzte Bit
liefern (dieselbe Regel wie beim Münzschieber, `DECISIONS.md`
2026-09-03). Erlaubt sind ausschließlich `+ − × ÷`, `Math.sqrt`, `Math.abs`,
`Math.min`, `Math.max`, `Math.floor`, `Math.ceil`, `Math.imul` — nachgewiesen
durch `verify-physics.mjs`, Prüfung P-1.

**Fester Zeitschritt.** 240 Rechenschritte je Sekunde, vier je Bild bei 60
Bildern/Sekunde — dieselbe Zahl wie beim Münzschieber und aus demselben
Grund: eine Rille von rund 1,26 Grad Breite darf nicht zwischen zwei
Schritte fallen.

**Ein Lauf durchläuft bis zu fünf Abschnitte**, jeder eine eigene Methode der
Klasse `Wheel`:

| Abschnitt | Was passiert |
|---|---|
| `ruht` | keine Kugel im Rad; nur die Radscheibe dreht sich weiter |
| `bahn` | die Kugel rollt außen an der Laufbahnwand, bis die Fliehkraft nicht mehr trägt |
| `abstieg` | sie fällt nach innen, wird dabei schneller, und kann eine der acht Rauten treffen |
| `rotor` | sie liegt auf der drehenden Scheibe und springt über die Rillen |
| `liegt` | sie ruht in genau einem Fach; das Ergebnis steht fest |

**Es wird nichts gezogen außer dem Start.** `launch()` zieht genau drei
Werte, alle über das Verwerfungsverfahren aus dem nächsten Abschnitt: die
Drehkraft des Rades, die Anstoßkraft der Kugel, und ihr Einwurfpunkt auf der
Laufbahn. Danach entscheidet ausschließlich die Physik. Rautentreffer und
Rillenstöße sind reine Funktionen des Auftreffpunkts — an keiner dieser
Stellen wird noch einmal gewürfelt.

**Das Rad wird zwischen den Runden nie zurückgesetzt** (CONCEPT.md C.6.2):
`wheelTurn` läuft über alle Runden hinweg weiter, `launch()` gibt der
Scheibe nur einen neuen Schwung, genau wie ein Croupier. Diese fortlaufende,
nie zurückgesetzte Stellung ist die eigentliche Quelle der Gleichverteilung
— nicht ein besonders raffinierter Zufallsgeber.

**Die 21 Auslegungswerte.** Alle folgenden Zahlen sind Konstruktionsent­
scheidungen, keine Naturkonstanten. Widerspricht eine Messung einer dieser
Zahlen, gilt die Messung (CONCEPT.md C.5.4), und die Stellschraube wird
nachjustiert, nie der Zufallsgeber (`verify-physics.mjs`, bei P-10/P-11
niedergeschrieben).

| Konstante | Wert | Bedeutung |
|---|---|---|
| `WHEEL_DRIVE_MEAN` | 0,62 | mittlere Drehkraft des Rades (Umdrehungen/s) |
| `BALL_DRIVE_MEAN` | 2,35 | mittlere Anstoßkraft der Kugel (Umdrehungen/s) — rund viermal so schnell wie das Rad |
| `WHEEL_FRICTION` | 0,016 | Reibung der Radscheibe; sie kommt nach rund 40 s von selbst zur Ruhe |
| `BALL_FRICTION_LIN` | 0,055 | Rollreibung der Kugel auf der Laufbahn |
| `BALL_FRICTION_QUAD` | 0,030 | geschwindigkeitsabhängiger (Luft-)Anteil derselben Reibung |
| `LEAVE_SPEED` | 0,78 | Winkelgeschwindigkeit, unter der die Bahnwand die Kugel nicht mehr trägt |
| `FALL_ACCEL` | 26 | Beschleunigung nach innen im Abstieg |
| `SPIN_UP` | 0,55 | Anteil der Drehimpulserhaltung beim Einwärtsfallen |
| `MAX_BALL_SPEED` | 3,2 | Höchstgeschwindigkeit der Kugel; kein Stoß kann sie darüber beschleunigen (C.6.3) |
| `DEFLECTOR_HALF` | 0,018 | halbe Winkelbreite einer Raute (rund 6,5°) |
| `DEFLECTOR_KEEP` | 0,34 | Anteil der Winkelgeschwindigkeit, der einen Rautenstoß übersteht |
| `DEFLECTOR_SPREAD` | 0,46 | wie stark der Auftreffpunkt den Ausgang spreizt — die eigentliche Quelle der Empfindlichkeit gegenüber der Anstoßkraft |
| `DEFLECTOR_HOP` | 9 | Sprunggeschwindigkeit nach oben nach einem Rautentreffer |
| `FRET_HALF` | 0,0035 | halbe Winkelbreite einer Rille (rund 1,26°) |
| `FRET_RESTITUTION` | 0,55 | Anteil der Relativgeschwindigkeit, der einen Rillenstoß übersteht |
| `FRET_HOP` | 2,2 | Sprunghöhe nach einem Rillenstoß je Einheit Relativgeschwindigkeit |
| `FRET_CLIMB_SPEED` | 0,20 | unterhalb dieser Relativgeschwindigkeit kommt die Kugel nicht mehr über eine Rille |
| `ROTOR_FRICTION` | 0,9 | wie stark die Radscheibe die Kugel auf ihr eigenes Tempo zieht |
| `REST_SPEED` | 0,055 | unterhalb dieser Relativgeschwindigkeit gilt die Kugel als liegend |
| `GRAVITY` | 62 | Fallbeschleunigung für die Sprunghöhe |
| `BOUNCE_KEEP` | 0,42 | Anteil der Sprunggeschwindigkeit, der ein Aufkommen übersteht |

Zwei weitere Konstanten liegen daneben, gehören aber zur Zeitrechnung, nicht
zur Kraftauslegung: `DT` (1/240 s, der feste Zeitschritt) und `MAX_STEPS`
(240 × 45, die Notbremse aus dem nächsten Abschnitt).

## Zufall und Wiederholbarkeit

**Zwei Geber, eine Form, eine benannte Wechselstelle.**
`Resources/Public/JavaScript/rng.js` liefert beide über dieselbe Schnittstelle
(eine vorzeichenlose 32-Bit-Zahl): `drawUint32()` zieht echten Zufall aus
`crypto.getRandomValues()` — das ist es, was im Spiel läuft. `createSeeded(saat)`
liefert stattdessen eine wiederholbare Folge über einen einfachen
Zählergenerator (Zähler plus SplitMix-Verwirbelung mit `Math.imul`) — das
benutzt ausschließlich der Nachweis. Welcher Geber läuft, entscheidet sich an
**einer** Stelle: `new Wheel({ random })`. Die Physik selbst importiert
keinen der beiden Geber, sie bekommt ihn eingespeist — dieselbe Bauart wie
beim Münzschieber (`DECISIONS.md` 2026-09-03: „Der Zufallsgeber wird in
field.js eingespeist, nicht importiert"), aus demselben Grund: `wheel-physics.js`
bleibt dadurch importfrei und lädt unter Node ohne jede Vorbereitung.

**Das Verwerfungsverfahren, nicht der Rest-Operator.** `d`, `a` und `e`
brauchen je einen ganzzahligen Wert aus einem Bereich, der 2^32 nicht glatt
teilt (201 bzw. 360 Werte). Ein einfaches „gezogener Wert % Bereichsgröße"
bevorzugte dabei systematisch die niedrigen Werte. `zieheGanzzahl()` in
`wheel-physics.js` verwirft deshalb jeden gezogenen Wert, der über der
letzten vollen Vielfachen der Bereichsgröße liegt, und zieht neu — die
Schleife läuft praktisch immer genau einmal.

**Wiederholbarkeit ohne ein einziges Bit Unsicherheit.** Derselbe Startzustand
plus dieselbe Zufallsfolge ergibt exakt denselben Verlauf, auf jeder
Maschine — dafür rechnet `wheel-physics.js` ausschließlich mit Rechenarten,
die die ECMAScript-Norm bitgenau festlegt (`+ − × ÷`, `Math.sqrt`,
`Math.abs`, `Math.min`, `Math.max`, `Math.floor`, `Math.ceil`, `Math.imul`;
siehe „Physik" oben). `verify-physics.mjs`, Prüfung P-2, belegt das: zwei
Läufe mit derselben Saat über 2.000 Runden liefern Zeichen für Zeichen
dieselbe Folge von Fachzeigern, und die vollständige Momentaufnahme alle 500
Rechenschritte ist in beiden Läufen bitgleich. P-3 ist die Gegenprobe: zehn
verschiedene Saaten liefern zehn verschiedene Folgen.

**Erste, schnelle Belege des Physikkerns** (`verify-physics.mjs`, Laufzeit
unter zwei Sekunden, 20.000 bis 200.000 Läufe je nach Prüfung):

- Die Kugel verlässt das Rad **nie** und **jeder** Lauf endet mit genau
  einem Fach (P-4, P-5, P-6) — geprüft über 20.000 Läufe.
- Das Rad wird zwischen den Runden **nie zurückgesetzt** (P-7) — geprüft
  über 500 aufeinanderfolgende Läufe auf einem einzigen `Wheel`-Objekt.
- Über diese 20.000 Läufe ist **keine offensichtliche Schieflage** zu sehen:
  Chi-Quadrat 32,35 bei 37 Freiheitsgraden, p = 0,6867 (weit über der für
  diesen frühen, weichen Nachweis verlangten Schwelle p > 0,001) — jedes der
  38 Fächer wurde getroffen, keins über dem 1,6-fachen oder unter dem
  0,55-fachen Erwartungswert.

Dies ist ausdrücklich **nicht** der abschließende Gleichverteilungsnachweis
— der verlangt mindestens 500.000 Läufe (CONCEPT.md C.5.4) und steht im
nächsten Abschnitt.

## Gleichverteilungsnachweis

Gefahren am 4. September 2026 mit

    ddev exec node Resources/Private/Scripts/measure-uniformity.mjs \
        --runs=500000 --seed=20260904

Laufzeit 34 Sekunden. **Bestanden.**

| Größe | Wert |
|---|---|
| Umfang | 500.000 Kugelläufe |
| Saat | 20260904 |
| Chi-Quadrat | 31,740 |
| Freiheitsgrade | 37 |
| **p-Wert** | **0,7138** (gefordert: > 0,01) |
| Größte Abweichung | Fach „31": +1,56 % (13.363 statt 13.158) |
| Rot / Schwarz / Grün | 237.206 / 236.298 / 26.496 (erwartet 236.842 / 236.842 / 26.316) |

Der p-Wert von 0,71 sagt: Eine so gleichmäßige oder ungleichmäßigere Verteilung
käme bei einem wirklich gleichverteilten Rad in 71 von 100 Fällen heraus. Es gibt
also keinen Hinweis auf eine Schieflage — kein Fach wird bevorzugt, keins gemieden.

Zwei weitere Zahlen aus demselben Lauf belegen, dass dieses Ergebnis **aus der
Physik** stammt und nicht aus einer gezogenen Zufallszahl, der man nachträglich
eine Kugel hinterhergerechnet hätte:

| Größe | Wert |
|---|---|
| Mittlere Laufdauer | 17,5 s (größte 19,8 s) |
| Rillenstöße je Lauf | 39,8 |
| Rautentreffer je Lauf | 1,00 |

Die Kugel legt also je Lauf rund vierzig Stöße gegen die Trennstege zurück, ehe
sie liegen bleibt. Die rechnerische Auszahlungsquote des amerikanischen Rades
beträgt unverändert 94,7368 % für Einzelwetten und 92,1053 % für die Fünferwette
(CONCEPT.md Anhang F) — sie folgt aus den Quoten, nicht aus dieser Messung.

## Das Tuch

Seit Phase C3 hat der Tisch ein Tuch: die Setzfläche, auf der Chips liegen,
mit allen neun Wettarten des amerikanischen Spiels nach Anhang F.

**Die Anordnung.** Zwölf Tuchspalten zu drei Zeilen. Tuchspalte `i` trägt die
Zahlen `3i−2` (Zeile 1), `3i−1` (Zeile 2), `3i` (Zeile 3) — Zeile 1 ist damit
Kolonne 1 (1, 4, … 34), Zeile 3 Kolonne 3 (3, 6, … 36). Links davon die
Nullspalte: `0` liegt an Zeile 1 an, `00` an Zeile 3; beide reichen mit ihrer
eigenen, doppelt so hohen Fläche bis an die mittlere Zeile 2 heran, ohne sie
zu erreichen — dazwischen liegt der Split `0/00`. Unter dem Zahlenfeld
folgen die drei Dutzende, dann die sechs einfachen Chancen. Aus genau dieser
Anordnung folgen die Nachbarschaften, aus den Nachbarschaften die Splits,
Ecken und Dreier-/Sechserreihen — sie werden **gerechnet**, nicht
abgeschrieben (`verify-bets.mjs`, Prüfung B-7). Die drei Trios an der Null
liegen dort von Hand gesetzt, weil sie die Nullspalte mit der Zahlenfläche
verbinden; B-7 prüft für sie, dass jede abgedeckte Zahl das Feld mit einer
Kante oder in einem Eckpunkt berührt. Die Fünferwette ist eine ausdrücklich
dokumentierte Ausnahme von genau dieser Regel (siehe unten, „Wetten, die es
hier nicht gibt").

**Die Aufschrift ist englisch, der Vorlesetext deutsch.** Ansage des
Auftraggebers vom 2026-09-08: aufgedruckt wird wörtlich, was auf der
Bildvorlage steht — die acht Aufschriften `2 to 1`, `1st 12`, `2nd 12`,
`3rd 12`, `1–18`, `Even`, `Odd`, `19–36`. Damit ist die Aufschrift **kein
übersetzbarer Text** mehr, sondern die Beschriftung eines Spielgeräts — wie
die Augen auf einem Würfel. Sie steht deshalb als Klartext-Konstante in
`Classes/BetLayout.php` und läuft **nicht** durch `f:translate`; eine
englische Sprachfassung soll auf dem Tuch nichts anderes zeigen als eine
deutsche. Jeder Aufschriftteil trägt seine Sprache mit sich (`lang="en"` für
Buchstaben, kein `lang` für eine reine Zahlenangabe wie `1–18` — ein
`lang="en"` an einer Ziffer machte aus „12" ein gesprochenes „twelve" statt
„zwölf", WCAG 2.2 SC 3.1.2). Der **Vorlesetext** bleibt deutsch, kommt
weiterhin aus `locallang.xlf` (Kennungen `felt.name.*`) und beginnt bei jedem
Feld mit sichtbarer Aufschrift mit genau dieser Aufschrift (WCAG 2.2 SC 2.5.3
„Label in Name", Prüfung F-20) — wer den Tisch mit der Stimme bedient, sagt
das Wort, das er sieht.

**Die zehn Bauformen der neun Wettarten** (Dreierreihe und Trio zahlen beide
11:1, sind aber zwei verschiedene, unabhängig codierte Zweige in
`bets-roulette.js` und werden deshalb getrennt gezählt — siehe
`DECISIONS.md`), **mit Anzahl, Auszahlung und Höchsteinsatz:**

| Wettart | Kennungspräfix | Anzahl | abgedeckte Zahlen | Auszahlung | Höchsteinsatz |
|---|---|---|---|---|---|
| Zahlenfeld (inkl. `0`/`00`) | `n-` | 38 | 1 | 35 : 1 | 10 € |
| Split (zwei Zahlen) | `s-` | 60 | 2 | 17 : 1 | 20 € |
| Dreierreihe | `st-` | 12 | 3 | 11 : 1 | 30 € |
| Trio (an der Null) | `t-` | 3 | 3 | 11 : 1 | 30 € |
| Viererblock (Ecke) | `c-` | 22 | 4 | 8 : 1 | 40 € |
| Fünferwette | `five` | 1 | 5 | **6 : 1** | 50 € |
| Sechserreihe | `sl-` | 11 | 6 | 5 : 1 | 60 € |
| Kolonne | `col-` | 3 | 12 | 2 : 1 | 100 € |
| Dutzend | `dz-` | 3 | 12 | 2 : 1 | 100 € |
| Einfache Chance (Rot/Schwarz/Gerade/Ungerade/1–18/19–36) | — | 6 | 18 | 1 : 1 | 100 € |

**Ovale, Rauten, Pfeilfelder.** Die 38 Zahlenfelder tragen ihre Ziffer als
farbiges Oval statt als schlichten Text — Farbe kommt aus
`WheelGeometry::RED`/`::BLACK`, damit dieselbe Zahl auf dem Tuch nie anders
gefärbt sein kann als am Rad (Prüfung F-16). Nachgerechnet nach der
WCAG-2.2-Formel: die aufgemalte Fachzahl (`--ck-pocket-mark`) erreicht 6,88:1
auf Rot, 16,09:1 auf Schwarz und 5,76:1 auf Grün (Soll ≥ 4,5:1, SC 1.4.3); die
helle Ovalkontur (`--ck-felt-line`) erreicht 6,32:1 gegen das Tuch (Soll ≥
3:1, SC 1.4.11) — ohne sie wäre ein rotes Oval mit nur 1,01:1 auf dem Tuch
praktisch unsichtbar. Rot und Schwarz tragen als einfache Chancen statt eines
Wortes eine **Raute** in ihrer Farbe; beide bekommen dieselbe helle Kontur,
und **zusätzlich nur die schwarze** eine feine Schraffur — der zweite,
farbunabhängige Unterschied, den WCAG 2.2 SC 1.4.1 verlangt (Prüfung F-10).
Der erreichbare Name jedes Zahlenfeldes nennt seine Farbe ausgeschrieben
(„17, schwarz"), damit eine Aussage, die auf dem Tuch nur über Farbe
transportiert wird, nicht verloren geht. Die Umrisse der zwei Pfeilfelder `0`
und `00` werden **gerechnet** (`BetLayout::arrowPaths()`) und liegen in der
Zeichenschicht `Cloth.html`, nicht als `clip-path` am Knopf — ein `clip-path`
schnitte den Fokusrahmen mit ab, derselbe Fehler, den `opacity` in diesem
Haus bereits viermal verursacht hat (Prüfung F-15).

Zusammen **159 Felder** — nachgezählt in `verify-bets.mjs`, Prüfung B-2/B-3.
Diese Tabelle ist eine Lesehilfe, kein vierter Ort für Anhang F: Anzahl,
Auszahlung und Höchsteinsatz jeder Wettart sind maßgeblich in
`bets-roulette.js` festgelegt (gespiegelt in `Classes/BetLayout.php`, F-1)
und werden gegen eine eigene, unabhängig getippte Tabelle geprüft
(`verify-bets.mjs`, Prüfung B-3 für die Anzahl, B-4 für die Auszahlung, B-5
für den Höchsteinsatz) — kein Nachweis vergleicht diese README-Tabelle
selbst dagegen, sie kann also veralten, ohne dass etwas rot wird.

**Das Höchsteinsatzprinzip:** `min(10 € × abgedeckte Zahlen, 100 €)`. Ein Feld,
das mehr Zahlen abdeckt, zahlt weniger aus und darf deshalb höher bespielt
werden — bis zur Deckelung bei 100 €, sobald zwölf oder mehr Zahlen betroffen
sind (Kolonnen, Dutzende, einfache Chancen).

**Der Rundenhöchstbetrag** liegt bei **100 €** über **alle** Felder
zusammen — deutlich unter der Summe der 159 Feldhöchsteinsätze, sonst wäre er
wirkungslos (`verify-bets.mjs`, Prüfung B-12; `verify-round.mjs`, R-8).

**Warum die Fünferwette als einzige 92,11 % statt 94,74 % ergibt.** Die
rechnerische Rückflussquote einer Wette ist `(Auszahlung + 1) × abgedeckte
Zahlen / 38`. Für alle Wettarten außer der Fünferwette geht das exakt auf
`36/38 = 94,7368 %` — nicht zufällig: `Auszahlung + 1` ist bei ihnen immer
`38/abgedeckte Zahlen` (35+1=36 bei 1 Zahl … 1+1=2 bei 18 Zahlen, jeweils mal
abgedeckte Zahlen ergibt 36). Die Fünferwette deckt fünf Zahlen ab, zahlt aber
nur 6 : 1 statt der „passenden" 7,6 : 1 — sie ist am amerikanischen Tisch die
einzige Wette, deren Auszahlung nicht zur Anzahl der abgedeckten Zahlen passt
(historisch: `0`, `00`, `1`, `2`, `3` lassen sich auf dem Tuch nicht als
zusammenhängende Fläche mit einem „passenden" Auszahlungsverhältnis anordnen).
Ihre Quote liegt deshalb bei `(6+1) × 5 / 38 = 35/38 = 92,1053 %` — spürbar
schlechter für die Spielerin, und genau deshalb der höchste Hausvorteil des
ganzen Tisches. Rechnerisch nachgewiesen in `verify-bets.mjs`, Prüfung B-11
(gegen zwei im Prüfskript wörtlich niedergeschriebene Brüche, nicht gegen die
geprüfte Datei selbst), und über 500.000 gespielte Runden bestätigt (siehe
„Der lange Messlauf: Auszahlung" unten).

**Die drei Orte der Feldliste**, dieselbe Bauart wie beim Rad:

| Ort | Rolle |
|---|---|
| `Resources/Public/JavaScript/bets-roulette.js` | die **maßgebliche Fassung der Buchführung**: Kennung, Art, abgedeckte Zahlen, Auszahlung, Höchsteinsatz und Gitterlage. Importfrei, läuft unverändert unter Node und im Browser; `table-bets.js` (Phase C1) macht daraus die Buchführung im Browser. Seit dem Umbau nach der Bildvorlage führt sie **nicht** mehr die Aufschrift oder den Namen — die wurden von keiner einzigen Zeile JavaScript gelesen. |
| `Classes/BetLayout.php` | der **geprüfte Buchführungsspiegel und alles, was gezeichnet wird**: Aufschrift (englisch, Klartext), Ovalfarbe, Rautenzuordnung, `labelKey`/`labelArgs` des deutschen Vorlesetexts, und die Maßordnung der Tischzeichnung (`viewBox`, Tuch, Radmulde, Spielplankasten, die zwei Pfeilumrisse). `verify-felt.mjs`, Prüfung F-1, gleicht die Buchführungsdaten beider Fassungen für alle 159 Felder Feld für Feld ab; F-13 rechnet die Maßordnung nach. |
| `Classes/DataProcessing/FeltProcessor.php` | rechnet aus der PHP-Fassung die Gitterlage (`grid-column`/`grid-row`) für Fluid vor und bereitet Aufschrift, Name und Gruppierung für `Felt.html` auf, damit dort keine einzige Zahl und kein Text von Hand steht. |

## Woher die Form des Tuchs kommt

Für die Copyright-Prüfung nach V.7: das Tuch besteht ausschließlich aus
Gitterspuren (CSS-Grid), Rechtecken mit gerundeten Ecken (die Namensschilder)
und einer Raute (die Farbfelder Rot/Schwarz) — keine Vorlage wurde
abgezeichnet, importiert oder vektorisiert. Seit dem Umbau nach den zwei
Bildvorlagen (Ansage vom 2026-09-08) gilt dasselbe für die Tischzeichnung
(`Cloth.html`): Holzrahmen, Messingfase, Zarge, Tuch und Radmulde sind
gerechnete SVG-Rechtecke und ein gerechneter Kreis, die zwei Pfeilumrisse für
`0`/`00` sind gerechnete SVG-Pfade (`BetLayout::arrowPaths()`) — auch hier
keine Bilddatei, kein importierter Pfad, keine Vektorisierung. Als Vorbild
dienten zwei Bildvorlagen, die der Rechteinhaber dieses Projekts vor der
Verwendung selbst rechtlich geprüft und freigegeben hat (`DECISIONS.md`,
2026-09-08); keine von beiden ist Bestandteil dieses Repositoriums, keine
wurde eingebettet und keine vektorisiert. Die erste war für den
**Spielplan** maßgeblich — übernommen ist von ihr allein der funktionale
Feldaufbau des üblichen amerikanischen Tableaus, der als Spielregel und
funktionale Anordnung nicht geschützt ist (CONCEPT.md B.3 Nr. 1; US
Copyright Office Circular 33; § 2 Abs. 2 UrhG i. V. m. BGH
„Geburtstagszug"), gezeichnet in eigener Gestaltung und mit unseren Quoten
aus Anhang F. Die zweite diente ausdrücklich **nur der Orientierung** für
die Gesamtwirkung — ein Tisch, ringsum ein Holzrahmen, Rad und Spielplan
auf einer Fläche —, nicht als Vorlage zum Nachbau: das **Raddesign dieses
Projekts ist unverändert das eigene**. Kein fremder Name steht in
Text, Datei, Klasse, Kommentar oder Bezeichner; keine Schriftdatei wird
nachgeladen; keine Farbsystem-Nummer oder sonstige Herstellerfarbangabe kommt
vor — jede Farbe ist ein `--ck-…`-Token aus `casino_startpage/tokens.css`.

## Wetten, die es hier nicht gibt

Auf dieser Tuchanordnung berühren sich `0` und `2` nicht, ebenso wenig `00`
und `2` — ein Split ist die Linie zwischen zwei Feldern, die tatsächlich
aneinandergrenzen, und ein Feld an einen Ort zu legen, an dem seine Bedeutung
nicht abzulesen ist, wäre eine Lüge im Bild. Die Splits `0-2` und `00-2`
entfallen deshalb bewusst; die Deckung `0`+`00`+`2` gibt es weiterhin, als
Dreierwette (`t-0-00-2`). Ebenso bewusst nicht aufgenommen: jede Wette, die
das amerikanische Spiel ohnehin nicht kennt (das europäische Rad mit nur
einer Null hat eine andere Fünferwette und andere Nachbarschaften — das ist
ein anderes Spiel, kein fehlendes Feld dieses hier).

**Die Fünferwette (`five`) ist eine dokumentierte Ausnahme von der
Nachbarschaftsregel.** Sie deckt `0`, `00`, `1`, `2` und `3` ab, liegt aber
an einer einzigen Stelle (Spalte 2, Zeile 1) und berührt davon tatsächlich
nur `0` und `1` — je in einem Eckpunkt, nicht mit einer Kante; `00`, `2` und
`3` berührt sie gar nicht. Das ist ein bewusstes Tischzeichen: am
amerikanischen Tisch sitzt die „Top Line"-Wette traditionell an genau dieser
Stelle, obwohl sie geometrisch nicht zu allen fünf abgedeckten Zahlen
gleichermaßen benachbart ist — anders als jede andere Linienwette dieses
Tuchs, deren Lage ihre Bedeutung vollständig trägt. `verify-bets.mjs`,
Prüfung B-7, hält diese Ausnahme ausdrücklich fest (Lage und die genau zwei
berührten Zahlen), statt sie stillschweigend von der allgemeinen Regel
auszunehmen: verschiebt sich `five` künftig, ohne dass diese Prüfung mitgeht,
fällt das dort auf.

## Geld am Tisch

Wie am Mustertisch (Phase C1): **Buy-in**, fünf Chipwerte, `CASH OUT`. Ein
Chip wandert in der Reihenfolge `bets.place()` → `bank.placeChip()` aufs
Tuch; schlägt die Buchung fehl, rollt `bets.takeBack()` die eben gelegte
Buchung sofort zurück (`table-felt.js`, geteilter Baustein — Vertrag in
`casino_startpage/README.md`). `CASH OUT` ist gesperrt, solange Chips auf dem
Tuch liegen (`bank.cashOut()` liefert `'staked'`).

**Beim Verlassen der Seite** (`pagehide`, angemeldet von `connectControls()`)
verfällt ein offener Einsatz — er ist längst nicht mehr im Gerätekredit,
genau wie CONCEPT.md C.4 es beschreibt. Der Buy-in kommt in die gemeinsame
Kasse zurück.

**Es bleibt nichts liegen und entsteht nichts aus dem Nichts.** Nachgewiesen
über 500 gespielte Runden (`verify-round.mjs`, Prüfung R-3: die Bilanz —
Kasse plus Buy-in plus liegender Einsatz — ändert sich je Runde um genau
`Auszahlung − Einsatz` und um sonst nichts) und über einen Seitenverlassen
mitten in einer laufenden Runde (Prüfung R-11).

## Der Ereignis- und Messpunktvertrag

Jeder `data-ro-*`-Messpunkt hat **genau einen Schreiber** — dieselbe Regel wie
im ganzen Projekt, hier zusätzlich durch `verify-view.mjs` (Prüfung V-13) und
`verify-sound.mjs` (Prüfung S-7 für die beiden Dauerklang-Zähler) in beide
Richtungen nachgerechnet:

| Messpunkt | Eigentümer | Bedeutung |
|---|---|---|
| `data-ro-state` | `roulette.js` | `'setzen'` \| `'gesperrt'` \| `'laeuft'` \| `'auswerten'` \| `'auszahlen'` |
| `data-ro-result` | `roulette.js` | die Fachbeschriftung des letzten Ergebnisses (`'0'`, `'00'`, `'1'` … `'36'`) |
| `data-ro-colour` | `roulette.js` | `'red'` \| `'black'` \| `'green'` |
| `data-ro-total` | `roulette.js` | die Bilanz als eine Zahl: Kasse + Buy-in + liegender Einsatz — geschrieben **ausschließlich** nach einer Auswertung (`onResult()`); zwischen den Runden (nach Buy-in, CASH OUT, jedem gelegten Chip) wird sie NICHT nachgeführt und zeigt bis zur nächsten Auswertung den Stand der letzten Runde (Behebung Review C3, L2) |
| `data-ro-sound-on` | `sound-roulette.js` | `'1'`, solange der Ton eingeschaltet ist, sonst `'0'` |
| `data-ro-sound-sustained` | `sound-roulette.js` | wie viele der beiden eigenen Dauerklänge (Radscheibe, Kugel) gerade laufen (0/1/2) |

Zwei weitere Marken sind reine **Container-Marken**, kein Messpunkt: `data-ro-felt`
und `data-ro-status` stehen fest im Markup und werden nur per `querySelector`
gelesen, nie beschrieben — ebenso `data-ro-sound` (die Kennung des
Ton-Schalters selbst).

**Ausdrücklich benannte Ausnahme (Behebung Review C3, L1): `aria-label` an
`[data-ck-field]`.** Anfangswert serverseitig (`Felt.html`, aus `labelKey`);
Laufzeit-Eigentümer ist `table-felt.js` (`nameField()`), das es beim ersten
`refresh()` durch den vollständigen Namen mit Auszahlung, Höchsteinsatz und
liegendem Einsatz überschreibt. Das ist gewolltes Progressive Enhancement
(ohne JavaScript bleibt der serverseitige Name stehen) und keine Verletzung
von „ein Messpunkt, ein Schreiber" im engeren Sinn — aber dieselbe Form
(„ein Attribut mit zwei Bedeutungen"), die das Projekt schon zweimal als
Befund geführt hat, deshalb hier ausdrücklich als Ausnahme benannt.

**Zwei Live-Bereiche, je ein Eigentümer.** `[data-ck-table-status]` (geteilt,
Site Package) gehört den Chips und der Bedienleiste; `[data-ro-status]`
(dieser Tisch) gehört ausschließlich `roulette.js` und trägt den
Rundenausgang — „Die Kugel läuft." beim Start, der vollständige Ergebnissatz
am Ende, nichts dazwischen. Ein dritter Schreiber auf einem gemeinsamen
Bereich hätte sich mit den beiden bestehenden Entprellungen überschrieben.

## Barrierefreiheit

Barrierefreiheit ist hier Vorgabe, kein Nachbesserungspunkt — ein drehendes
Rad ist genau der Fall, an dem das früh entschieden werden muss.

**Bewegungsdrosselung** (`prefers-reduced-motion: reduce`). Wer das im
Betriebssystem eingestellt hat, bekommt das Ergebnis eines Laufs sofort statt
seines Ablaufs: `wheel-view.js` lässt `wheel.runToRest()` den ganzen Lauf ohne
Bild durchrechnen und zeigt nur sein Ende. Die Physik läuft dabei
UNVERÄNDERT durch — es entfallen die Bilder dazwischen, nicht die Rechnung
(dieselbe Haltung wie in `table.css`: „Nichts verschwindet dabei — nur die
Zeit dazwischen"). `verify-view.mjs`, Kennung V-7, weist zusätzlich nach,
dass beide Wege — durchgerechnet und Bild für Bild gezeichnet — über 200
Läufe mit gesetzter Saat bitgleich enden.

**Zwei Live-Bereiche, je ein Eigentümer, je ein Satz.** `[data-ck-table-status]`
(geteilt) und `[data-ro-status]` (dieser Tisch, seit Phase C3) werden beide
LEER ausgeliefert und erst von JavaScript gefüllt — ein Bereich, den ein
Skript anlegt UND füllt, wird von Hilfsmitteln nicht angesagt. Beide sagen mit
700 ms Entprellung und sofortiger erster Ansage an; siehe „Der
Ereignis- und Messpunktvertrag" oben für die genaue Aufteilung.

**Der Sprunglink über das Tuch.** 159 Feldknöpfe sind 159 Tabstationen. Als
erstes fokussierbares Element im Tuch steht deshalb ein Sprunglink zur
Bedienleiste (WCAG 2.2, Erfolgskriterium 2.4.1 „Bypass Blocks"), über die im
Site Package schon vorhandene Klasse `.ck-skiplink` — er versteckt sich seit
dem 2026-09-09 über seine **Größe** (1 × 1 Bildpunkt, `clip-path: inset(50%)`),
nicht mehr über eine negative Lage: damit gibt es keinen Bezugsrahmen mehr,
der falsch sein könnte, und der Link ist unsichtbar, wo immer er im
Rollbereich steht. Nie über `display`, sonst bekäme er nie den Fokus.

**Tastaturbedienung, überall.** Jedes Bedienteil — die 159 Feldknöpfe, der
Ton-Schalter, der Rundenauslöser (heute Teil der geteilten Bedienleiste,
`Table/Controls.html`) — ist ein echter `<button type="button">`, kein
`<div role="…">`: Rolle, Fokusreihenfolge und die Bedienung mit Eingabe- und
Leertaste kommen dadurch von selbst mit. Gesperrt heißt überall
`aria-disabled="true"`, **nirgends** `disabled`: ein `disabled`-Knopf fiele
aus der Tastaturreihenfolge und beantwortete nicht, warum er gerade nicht
geht — das gilt für Felder während einer laufenden Runde, für Chips ohne
Deckung und für `CASH OUT`, solange Chips auf dem Tuch liegen.

**Zielgröße (WCAG 2.2, Erfolgskriterium 2.5.8).** Seit dem Umbau nach der
Bildvorlage liegt das Tuch als Überlagerung auf der Tischzeichnung und die
Gitterspuren tragen `fr`-Anteile statt fester `rem`-Breiten
(`COLUMN_FRACTIONS`/`ROW_FRACTIONS` in `Classes/BetLayout.php`, gespiegelt in
`felt.css`). Die Zielgröße wird deshalb **feldweise gerechnet**, nicht mehr an
einer einzelnen Spurbreite abgelesen: `verify-felt.mjs`, Prüfung F-7, rechnet
für **jedes** der 159 Felder aus Spurgewicht und der Untergrenze `--ro-line`
(1,5 rem, 24 px) nach, dass es mindestens 24 × 24 Bildpunkte misst — das
schmalste Feld trifft die Untergrenze genau, kein Feld fällt darunter. Der
Tisch ist dadurch mindestens **1512 Bildpunkte** breit (41 Spaltenanteile ×
1,5 rem × 504/328). Reicht der Platz nicht, wird das Tuch **gerollt**, nie
verkleinert — die Zielgröße ist eine Zusage, die Bildschirmbreite ist keine.
Der Ton-Schalter und der Rundenauslöser sind weiterhin mindestens 2,75 rem
groß.

**Namen für alle 159 Felder.** Bis zum Umbau nach der Bildvorlage hatten nur
Felder ohne sichtbare Aufschrift (Split, Ecke, Dreier- oder Sechserreihe —
auf 24 Bildpunkten ist ohnehin kein Platz für Schrift) einen eigenen Namen;
Zahlen-, Dutzend- und Chancenfelder brauchten keinen, weil ihre Aufschrift
deutsch und eindeutig war. Seit die Aufschrift englisch ist (`Even`,
`1st 12`) oder ganz fehlt (die zwei Rauten Rot/Schwarz), bliebe ein Feld ohne
eigenen Namen für ein Vorleseprogramm unverständlich oder stumm — deshalb
trägt jetzt **jedes** der 159 Felder seinen Namen serverseitig als
`aria-label` UND als `data-ck-field-label`, beginnend mit seiner sichtbaren
Aufschrift, wo es eine gibt (WCAG 2.2, Erfolgskriterium 2.5.3 „Label in
Name", Prüfung F-20) — ein rückwärtsverträglicher, zweizeiliger Vertrag im
geteilten Baustein `table-felt.js` (`casino_startpage/README.md`, „Vertrag
für das Tuch eines Spiels"), der den vollständigen, mit dem gesetzten Betrag
nachgeführten Namen daraus baut.

**Farbe ist nie die einzige Aussage (WCAG 1.4.1).** Jedes Fach der
Radzeichnung trägt seine Zahl als `<text>`; jede Marke im Verlaufsstreifen
bekommt ein `text`-Feld und den Farbnamen als `title`. Auf dem Tuch sind Rot
und Schwarz der heikelste Fall, weil die Farben das Spiel selbst sind: seit
dem Umbau nach der Bildvorlage druckt die Vorlage auf diesen beiden Feldern
kein Wort mehr, sondern je eine Raute in ihrer Farbe. Beide Rauten tragen
deshalb dieselbe helle Kontur (`--ck-felt-line`) — ohne sie wäre Rot mit nur
1,01:1 auf dem Tuch praktisch unsichtbar —, und **zusätzlich nur die
schwarze** eine feine Schraffur: der zweite, farbunabhängige Unterschied
zwischen beiden (Prüfung F-10). Jedes der 38 Zahlenfelder nennt seine Farbe
zusätzlich ausgeschrieben im erreichbaren Namen („17, schwarz") — auch in
Graustufen oder bei fehlerhafter Farbwiedergabe bleibt „hier liegt eine
Farbwette" ablesbar.

**Das Namensschild.** Jedes Bedienteil mit sichtbarer Aufschrift — Ziffern,
„2 zu 1", „1. Dutzend", „Rot", „Ton" — trägt ein helles, blickdichtes
Namensschild dahinter (`.ro-felt__print`, `.ro-sound__label`). Ohne dieses
Schild hinge der Kontrast davon ab, über welchem Teil der Tuchwebung oder des
Messingverlaufs die Schrift gerade sitzt.

**Kontrast (SC 1.4.3), statisch gerechnet gegen JEDEN benannten Farbstopp des
Untergrunds, das Minimum entscheidet** (`verify-felt.mjs` F-9,
`verify-sound.mjs` S-9; die aufgemalte Fachzahl auf dem Rad siehe „Die
Radgeometrie" oben):

| Aufschrift | Untergrund | gemessen |
|---|---|---|
| jede aufgedruckte Tuch-Aufschrift (`.ro-felt__print`) | Tuchwebung | 9,40 : 1 |
| der Ton-Schalter (`.ro-sound__label`) | Bakelit-Bedienteil | 17,80 : 1 |
| Fachzahl (`--ck-pocket-mark`) | Ovalfarbe Rot | 6,88 : 1 |
| Fachzahl (`--ck-pocket-mark`) | Ovalfarbe Schwarz | 16,09 : 1 |
| Fachzahl (`--ck-pocket-mark`) | Ovalfarbe Grün | 5,76 : 1 |
| Ovalkontur (`--ck-felt-line`) | Tuch (SC 1.4.11) | 6,32 : 1 |

**Kein Messpunkt mit zwei Bedeutungen.** Der Zustandsspiegel des Ton-Schalters
heißt `data-ro-sound-on`, nicht `data-ro-sound` — dieses Attribut ist bereits
die bloße Kennung des Schalters selbst (`aria-pressed` trägt seinen Zustand
für Hilfsmittel). Ein Attribut mit zwei Bedeutungen war im Projekt zweimal ein
Befund.

Nachgewiesen von `verify-view.mjs` (Kennungen V-1 bis V-15),
`verify-felt.mjs` (F-1 bis F-21) und `verify-sound.mjs` (S-1 bis S-10, siehe
„Prüfskripte" unten). Ein Skript ersetzt keinen echten Tastatur- und
Bildschirmleser-Durchgang — das bleibt ein von Hand zu prüfender Schritt.

## Klang

Alle Klänge dieses Tisches entstehen im Browser aus Tonfrequenzen über die
Web Audio API — keine Audiodatei, nichts gesampelt, keine Melodie
nachgebaut (CONCEPT.md B.3 Nr. 11). Die gerätunabhängigen Bausteine
(`sound.js`, `sound-kit.js`, `idle-noise.js`) kommen aus `casino_startpage`;
**welcher Klang zu welchem Ereignis gehört, ist ausschließlich die Sache
dieses Tisches** (`Resources/Public/JavaScript/sound-roulette.js`) und wird
von keinem anderen Gerät übernommen — ein Roulette klingt anders als ein
Automat, weil es ein laufendes Rad, eine Kugel, die über die Rillen springt,
und einen Moment hat, in dem sie liegen bleibt.

| Ereignis | Klang |
|---|---|
| Chip aufs Tuch gelegt | ein trockener, tiefer Metallanschlag |
| Chip zurückgenommen | derselbe Anschlag höher und leiser |
| „Nichts geht mehr" (Rundenstart) | zwei kurze, absteigende Holzschläge |
| Radscheibe dreht | ein leiser Dauerklang, dessen Tonhöhe der Winkelgeschwindigkeit des Rades folgt |
| Kugel auf der Laufbahn | ein zweiter, hellerer Dauerklang, der mit der Kugelgeschwindigkeit abfällt |
| Rillenstoß | ein sehr kurzer, harter Klick |
| Rautentreffer | ein tieferer, deutlicherer Anschlag |
| Kugel liegt | drei enger werdende Klicks |
| Gewinn wird ausgezählt | eine aufsteigende, pentatonische Zählleiter |
| Auszahlung | eine Münzkaskade, deren Länge am Betrag hängt |
| Verlust | ein einmaliges Blechrutschen |
| `CASH OUT` | eine Registrierkasse |
| Leerlauf | Brummen, Relaisklicken, Ticken — eine Instanz je Gerät, tritt zurück, solange der Tisch nicht beim Setzen steht |

**Ehrlich, nicht spannungssteigernd** (ausdrückliche Vorgabe des
Auftraggebers): jeder Klang gehört zu etwas, das wirklich passiert. Kein
hervorgehobener Beinahe-Treffer, keine Verlustrunde, die wie ein Gewinn
klingt, kein Klang für ein Ereignis, das es nicht gibt.

**Woher die Rillenstöße kommen.** `wheel-physics.js` bekommt dafür **keine
einzige Zeile** — jede Änderung hätte den 500.000-Läufe-
Gleichverteilungsnachweis entwertet. Stattdessen liest `wheel-view.js` (die
Ansicht, keine Physik) vor und nach jedem Rechenschritt drei bereits
öffentliche Werte (Rad-Phase, Sprunghöhe, Sprunggeschwindigkeit der Kugel) und
erkennt daran, ob und welcher Stoß eben stattfand; ein rein zählender Rückruf
`onFret(zahl)` (ebenso `onDeflector()` für den einmaligen Rautenstoß) meldet
das nach außen. Siehe `DECISIONS.md` für die vollständige Begründung.

**Der Ton-Schalter** (`Table/Roulette/SoundSwitch.html`) ist ein eigenes
Bedienteil dieses Tisches, kein Teil der geteilten Bedienleiste — er wandert
dorthin erst, sobald ein dritter Tisch ihn zum dritten Mal gleich baut
(`DECISIONS.md`). Er trägt seinen Namen „Ton" sichtbar im Knopf,
`aria-pressed` für Hilfsmittel und den Messpunkt `data-ro-sound-on` zum
Ablesen; beim Ausschalten erklingt kein Klick — die eintretende Stille ist
die Rückmeldung.

`aria-pressed="true"` steht schon im ausgelieferten Markup, nicht erst ab dem
ersten JavaScript-Lauf — dieselbe, projektweite Vorgabe wie am Ton-Schalter
der drei Automaten (`fruit_risk`, `coin_pusher`, `video_slot`): Ton ist
standardmäßig AN. Steht im Speicher `casinoKunterbunt.sound = aus`, meldet
der Knopf bis zum ersten `paintSwitch()` einen falschen Zustand — ohne
JavaScript dauerhaft, exakt wie an den drei anderen Geräten (Behebung Review
C3, L6: kein Fund, da projektweit konsistent und andernorts bereits
begründet; hier ausdrücklich mitbenannt statt stillschweigend geerbt).

**Autoplay-Sperre.** Vor der ersten echten Nutzergeste entsteht kein
`AudioContext`; der Tastaturweg schaltet ihn ebenso frei wie der Zeiger.
Nachgewiesen in `verify-sound.mjs`, Prüfung S-3.

**Was nur ein Mensch beurteilen kann.** Ob ein Klang GUT ist, ob er zu diesem
Tisch passt und ob er an ein bestimmtes fremdes Spiel erinnert, kann kein
Skript entscheiden — die Prüffrage „Erinnert dich das an ein bestimmtes
Spiel?" beantwortet ausschließlich ein Mensch (siehe `test.txt`).

## Prüfskripte

```
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-cabinet.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-wheel.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-physics.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-view.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-bets.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-felt.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-round.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-sound.mjs
```

Alle acht nur lesend, ohne jede Abhängigkeit, Laufzeit je unter zwei
Sekunden. Rückgabewert 0, wenn alles stimmt, sonst 1. **Jede neue Prüfung
seit Phase C3 hat eine benannte Gegenprobe** — ein Nachweis, der nur richtige
Eingaben je gesehen hat, hat nie bewiesen, dass er wirklich prüft und nicht
bloß behauptet.

`verify-cabinet.mjs` (Kennungen A-1 bis A-10, seit Phase C3 erweitert um das
Tuch in beiden Zeichnungen — Prüfung A-7): keine eigene Farbe, jeder benutzte
Token existiert, keine Datei von außen, `casino_startpage` kennt dieses Gerät
nicht, die Lizenzangaben widersprechen sich nicht, Kachel und Spielseite
zeigen dieselbe Bauform (jetzt einschließlich des Tuchs), der
Gehäuse-Vertrag stimmt, das Kürzel-Präfix `ro-` wird eingehalten, und die
Anmeldung bei der Registry ist korrekt.

`verify-wheel.mjs` (Kennungen W-0 bis W-8): die Radanordnung ist wörtlich
Anhang F, gegenüberliegende Fächer bilden Paare aufeinanderfolgender Zahlen,
die Farben stimmen, PHP und JavaScript stimmen überein, der Fachwinkel ist
überall derselbe, der Kontrast reicht, Zeichnung und Physik stimmen überein
(W-5), und Farbe ist im Verlaufsstreifen nie die einzige Aussage (W-8).

`verify-physics.mjs` (Kennungen P-1 bis P-11, Laufzeit unter zwei Sekunden):
der Physikkern ist wiederholbar, verlässt das Rad nie, endet immer in genau
einem Fach, das Rad wird zwischen den Runden nie zurückgesetzt, die
Notbremse greift nie, das Verwerfungsverfahren zieht sauber, die Kugel
erlebt wirklich Stöße, und über 20.000 Läufe ist keine grobe Schieflage zu
sehen. Wird seit Phase C3 **nicht erneut gefahren**, solange keine Zeile
dieser Datei sich ändert — ein erneuter Lauf bewiese nur dasselbe noch einmal.

`verify-view.mjs` (Kennungen V-1 bis V-15): keine Winkelfunktion in Ansicht,
Rundenlogik oder Klangzuordnung, beide Live-Bereiche bleiben leer, jedes
Bedienteil ist ein echter Knopf mit `aria-disabled` statt `disabled` und
ausreichender Mindestgröße, der Fokus bleibt sichtbar, die
Bewegungsdrosselung liefert dasselbe Ergebnis wie der gezeichnete Weg, Farbe
ist im Verlaufsstreifen nie die einzige Aussage, der Haken-Katalog stimmt in
beide Richtungen (V-9), kein deutscher Anzeigetext steht im JavaScript, die
Zeichenschleife hält von selbst an, der Rundenablauf wird vollständig
durchlaufen, jeder `data-ro-*`-Messpunkt hat genau einen Schreiber (V-13),
und `roulette.js` trifft keine Rundenentscheidung mehr (V-14).

`verify-bets.mjs` (Kennungen B-1 bis B-12): genau 159 Felder, vollzählig je
Wettart, jede Auszahlung und jeder Höchsteinsatz gegen eine im Prüfskript
wörtlich niedergeschriebene Tabelle (nicht gegen die geprüfte Datei selbst),
jede Nachbarschaft gerechnet, der rechnerische Quotennachweis (B-11:
36/38 für alle Felder außer der Fünferwette, 35/38 für sie), und der
Rundenhöchstbetrag liegt unter der Summe der Feldhöchsteinsätze.

`verify-felt.mjs` (Kennungen F-1 bis F-21, seit dem Umbau nach der
Bildvorlage um neun Prüfungen erweitert): PHP-Spiegel und JavaScript stimmen
für die Buchführungsdaten aller 159 Felder überein (F-1), es gibt genau eine
Knopf-Vorlage mit einem `<f:section name="Aufdruck">` (F-2), jeder Feldknopf
ist ein echter `<button>` (F-3), `aria-label`/`data-ck-field-label` sitzen an
allen 159 Feldern und ergeben paarweise verschiedene Namen (F-4), jede
benutzte XLIFF-Kennung existiert und keine `felt.print.*`-Kennung kommt
zurück (F-5), `style`-Attribute enthalten ausschließlich
`grid-column`/`grid-row` (F-6), die Zielgröße stimmt feldweise gerechnet für
alle 159 Felder (F-7), `felt.css` hat keine eigene Farbe und keinen
fehlenden Token (F-8), jede aufgedruckte Aufschrift und jedes Oval erreichen
mindestens 4,5 : 1 Kontrast (F-9), Rot/Schwarz sind auch ohne
Farbwahrnehmung erkennbar (F-10), der Sprunglink funktioniert (F-11), und
die Überschriftenstufen stimmen (F-12). **Neu seit dem Umbau nach der
Bildvorlage:** die Maßordnung von Zeichnung, Stylesheet und Gitter passt
zueinander, `328 × 14 = 112 × 41` (F-13); genau eine Fläche mit drei
Schichten, kein Rest der alten Zwei-Kästen-Anordnung (F-14); die zwei
Pfeilfelder `0`/`00` sind gerechnete Umrisse ohne `clip-path` am Knopf
(F-15); die 38 Ovale stimmen mit der Radanordnung überein (F-16); kein
gesperrter Zustand dimmt den Fokusrahmen mit `opacity`, ohne
`:not(:focus-visible)` auszunehmen (F-17); die Aufschrift steht wörtlich in
einer unabhängigen Abschrift der Vorlage (F-18); `lang="en"` sitzt an jedem
Aufschriftteil mit Buchstaben und an keinem ohne (F-19); und jeder
erreichbare Name enthält die sichtbare Aufschrift seines Feldes, „Label in
Name" (F-20). **Ebenfalls neu, aus einer zurückgestellten Gestaltungsfrage**
(siehe `DECISIONS.md`): die auslaufende Kante des Rollbereichs sitzt an einem
umschließenden Element (`.ro-cloth__frame`), nicht an `.ro-cloth__scroll`
selbst — sonst wanderte sie beim Rollen mit — und deckt kein fokussierbares
Element ab (F-21). Ein **Wächterblock** am Anfang und Ende des Skripts bricht laut
ab, sobald eine Pflichtdatei fehlt oder ein NUL-Byte enthält, und hält die
Anzahl der tatsächlich ausgegebenen Zusagen gegen eine im Skript erklärte
Zahl (`ERWARTETE_ZUSAGEN`) — eine stumm übersprungene Prüfung soll nicht
mehr wie eine bestandene aussehen.

`verify-round.mjs` (Kennungen R-1 bis R-15, rechnet mit den echten Bausteinen
— `round-roulette.js`, `bets-roulette.js`, `table-bets.js`, `table-buyin.js`,
`wheel-physics.js` —, Laufzeit unter zwei Sekunden): der Rundenablauf ist
wiederholbar, die Bilanz stimmt nach **jeder einzelnen** Runde, das Rack
bleibt zu jedem Zeitpunkt der Buy-in in Chips, **jedes der 159 Felder** zahlt
über alle 38 möglichen Ergebnisse richtig (159 × 38 = 6042 einzelne
Aussagen, keine Stichprobe; die Auszahlung kommt dabei aus einer eigenen,
unabhängig von `bets-roulette.js` getippten Tabelle nach Anzahl der
abgedeckten Zahlen, nicht aus dem Feld selbst — sonst bewiese die Prüfung
nur, dass `BetTable.settle()` mit sich selbst übereinstimmt), kein Feld
lässt sich über sein Limit belegen, der
Rundenhöchstbetrag greift, das Tuch nimmt während einer laufenden Runde
nichts an, `CASH OUT` ist gesperrt, solange Chips liegen, beim Verlassen der
Seite bleibt nichts liegen, eine Runde ohne Einsatz wird abgelehnt, ein Rad
ohne echten Anschluss (`launch()` liefert `false`) hinterlässt den Tisch in
`setzen` mit offenem Tuch statt für immer in `laeuft` (R-15), und im
Speicher entsteht kein neuer Schlüssel.

`verify-sound.mjs` (Kennungen S-1 bis S-10): keine Audiodatei, kein
Netzzugriff, kein eigener `AudioContext`, `sound.unlock()` nur aus einem
Zuhörer, der `event.isTrusted` prüft, jedes Ereignis der Klangtabelle hat
genau eine Sendestelle in beiden Richtungen, kein Klang für ein Ereignis, das
es nicht gibt, der rechnerisch ausgerechnete Ausschlag bleibt unter 1,0,
höchstens zwei Dauerklänge laufen gleichzeitig und keiner bleibt nach
`destroy()` zurück, die Rillenklicks tragen `key`/`minGap`, der Ton-Schalter
erreicht den geforderten Kontrast, und der Leerlauf hat genau eine Instanz.

`measure-uniformity.mjs` und `measure-payout.mjs` sind kein Teil dieser
Liste: es sind die beiden langen Messläufe (Gleichverteilung, siehe oben;
Auszahlung, siehe „Der lange Messlauf: Auszahlung" unten) und laufen nicht
bei jeder Umsetzung mit.

`verify-payout-tolerance.mjs`: die Gegenprobe zur statistischen Schranke aus
`measure-payout.mjs` (`schwellenwertPunkte()`) — läuft in Millisekunden, ohne
eine einzige simulierte Runde: eine künstlich um mehr als 4σ verschobene
Quote wird als „AUSSERHALB DER TOLERANZ" erkannt, eine um 1σ verschobene
nicht, für zwei Wettarten mit unterschiedlicher Auszahlung und
Trefferwahrscheinlichkeit unabhängig nachgerechnet.

Die Skripte ersetzen keinen Blick auf das Gerät: ob es richtig **aussieht**,
ob sich Tastatur und Bildschirmleser wirklich richtig anfühlen, und ob ein
Klang GUT ist oder an ein bestimmtes fremdes Spiel erinnert, kann kein
Skript beantworten.

## Der lange Messlauf: Auszahlung

```
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/measure-payout.mjs \
    --rounds=500000 --seed=20260905
```

Gefahren am 5. September 2026. **Bestanden:** über 500.000 Runden, verteilt
reihum auf alle 159 Felder, stimmt die Bilanz — Summe aller Einsätze minus
Summe aller Rückgaben — zentgenau mit der Summe der Hausvorteile überein, und
alle zehn Wettarten liegen innerhalb der aus Auszahlungshöhe,
Trefferwahrscheinlichkeit und der tatsächlich gemessenen Rundenzahl
berechneten Toleranz (vier Standardabweichungen — Begründung und die
Gegenprobe mit einem absichtlich eingebauten Fehler in `DECISIONS.md`). Dies
ist die **Gegenprobe zur Verdrahtung**, nicht der Quotennachweis selbst — der
ist rechnerisch (`verify-bets.mjs`, Prüfung B-11) und steht bereits fest.

## Stand

Version 0.4.0 (alpha). Phase C2 (Rad und Physik) und Phase C3 (Tuch, Wetten,
Auszahlung, Klang) sind vollständig eingearbeitet.

**Phase C2** (fünf Teilstücke C2-A bis C2-E): die Extension ist
installierbar, meldet sich als Spieltisch bei der Geräte-Registry an, steht
als Kachel im Saal mit einer Tischzeichnung samt Rad, ihr Inhaltselement ist
im Backend anlegbar, und auf der Spielseite dreht sich das vollständige Rad
mit allen 38 Fächern nach Anhang F wirklich. Die Radstellung wandert über
beliebig viele Würfe innerhalb einer Seitenansicht mit und wird zwischen den
Runden nie zurückgesetzt. Der Gleichverteilungsnachweis über 500.000 Läufe
ist bestanden (p = 0,7138, siehe „Gleichverteilungsnachweis" oben).

**Phase C3** (fünf Teilstücke C3a bis C3e): das Tuch steht mit allen 159
Feldern und allen neun Wettarten nach Anhang F (C3a/C3b), seiner Optik samt
Zielgrößen und Kontrast (C3c), der vollständigen Verdrahtung von Geld,
Auswertung und Auszahlung gegen die gemeinsame Kasse (C3d) und dem Klang
samt Ton-Schalter (C3e). Die Physik entscheidet über jede Runde — es wird
nichts gezogen außer dem Start eines Laufs (C.5.1) —, und der lange Messlauf
über 500.000 gespielte Runden bestätigt, dass die Verdrahtung diese Physik
zentgenau in Geld übersetzt (siehe „Der lange Messlauf: Auszahlung" oben).

Barrierefreiheit — Bewegungsdrosselung, Tastaturbedienung überall, zwei Live-
Bereiche mit je einem Eigentümer, der Sprunglink über das Tuch, Zielgrößen,
Namen für alle 159 Felder, Farbe nie als einzige Aussage,
Namensschilder und ihr Kontrast — ist eingearbeitet und in „Barrierefreiheit"
oben vollständig dokumentiert.

**Bauabschnitt V** (Umsetzungsstücke Va bis Ve, Ansage vom 2026-09-08): der
Tisch ist nach zwei Bildvorlagen umgebaut — Rad und Spielplan liegen jetzt
auf **einer** Fläche mit Holzrahmen statt in zwei nebeneinanderstehenden
Kästen, das amerikanische Tableau ist bis auf die Zahlenanordnung (die
unverändert blieb) nachgebildet: `0`/`00` als Pfeilfelder, die 38 Zahlen als
farbige Ovale, `2 to 1`/die Dutzende/die einfachen Chancen als wörtliche
Aufschrift der Vorlage, Rot/Schwarz als Rauten mit einem zweiten,
farbunabhängigen Unterschied. Die Aufschrift ist seither englisch, der
Vorlesetext bleibt deutsch (siehe „Das Tuch" oben). `verify-felt.mjs` ist von
zwölf auf zwanzig Prüfungen gewachsen und trägt seither einen Wächterblock
gegen eine stumm übersprungene Prüfung — eine Fehlerklasse, die dieses
Projekt binnen einer Woche dreimal getroffen hat (siehe „Prüfskripte" oben).

**Der vollständige Prüfstand**, acht Skripte, alle grün, jede neue Prüfung
mit einer benannten Gegenprobe: `verify-cabinet`, `verify-wheel`,
`verify-physics`, `verify-view`, `verify-bets`, `verify-felt`,
`verify-round`, `verify-sound` (siehe „Prüfskripte" oben für die einzelnen
Kennungen).

**Was nur ein Mensch beurteilen kann** (siehe `test.txt`): ob das Tuch
richtig **aussieht**, ob die Tastaturreihenfolge sich richtig anfühlt, ob ein
Bildschirmleser die 159 Feldnamen gut vorliest, und ob ein Klang GUT ist oder
an ein bestimmtes fremdes Spiel erinnert.

Bewusst noch nicht Teil dieser Extension: der Mehrspielerbetrieb an einem
Tisch (Teil D, `CONCEPT.md`) und die beiden hohen Chips zu 500 € und 1.000 €
(sie wären mit einem Feldhöchsteinsatz von 100 € nirgends legbar).

Nach **Bauabschnitt V** hat ein eigener Gestaltungslauf dem Tisch Material,
Licht und eine Mulde gegeben, ohne eine der Prüfungen zu verletzen — alle 37
Prüfskripte des Projekts liefen danach erneut grün nach. Die
Copyright-Prüfung nach `CONCEPT.md` V.7 ist für den umgebauten Tisch
abgeschlossen; der einzige „beobachten"-Befund (die Werkstoffnamen
„Bakelit"/„Nixie") wurde geprüft und bewusst **nicht** geändert, weil es
sich um Gattungsbezeichnungen für Werkstoffe und Röhrentechnik handelt, nicht
um geschützte Marken. Mit **Phase C8** ist Teil C insgesamt abgenommen: 36
PASS, 0 FAIL, 0 BLOCKED im Abnahmetest, plus fünf von Hand nachgemessene
Bedienläufe.
