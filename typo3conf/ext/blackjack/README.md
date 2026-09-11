# Blackjack

## Zweck

Dritter Spieltisch des Spaß-Casinos **Casino Kunterbunt**: ein Kartentisch mit
grünem Tuch, Messingkante und Kartenschlitten. Der Geber spielt nach einer
festen Hausregel, von der er nie abweicht; das Mischen entsteht aus sicherem
Zufall und ist gleichverteilt.

Diese Extension enthält alles, was dieses Spiel ausmacht. Sie lässt sich
installieren und entfernen, ohne dass an `casino_startpage` oder an einer
anderen Extension etwas geändert werden muss.

Seit Phase C5 ist der Tisch **spielbar**: Tuch, selbst gezeichnete Karten,
Bedienleiste, Klang und Verlaufsstreifen sind fertig und gegen die geteilten
Tisch-Bausteine des Site Packages verdrahtet.

## Eckdaten

| | |
|---|---|
| Extension-Key | `blackjack` |
| Composer-Name | `phomo17/blackjack` |
| Namespace | `Phomo17\Blackjack\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.5.0 (Design-Tokens, Registry, Kasse) |
| Lizenz | AGPL-3.0-or-later |
| Zustand | 0.5.0 / alpha |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate blackjack
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach im Backend:

1. Unterhalb der Startseite eine Seite **Blackjack** anlegen.
2. Auf diese Seite in der Spalte „main" ein Inhaltselement **„Blackjack"**
   legen. Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Tisch wählen und als Zielseite die Seite aus Schritt 1 angeben.
4. Cache leeren und beide Seiten aufrufen.

Diese vier Schritte sind Backend-Arbeit und nicht Teil dieser Extension —
siehe Abschnitt „Stand".

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: Blackjack::IDENTIFIER,
    title: Blackjack::LANG_FRONTEND . 'automat.title',
    description: Blackjack::LANG_FRONTEND . 'automat.description',
    extensionKey: Blackjack::EXTENSION_KEY,
    cabinetPartial: Blackjack::CABINET_PARTIAL,
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
in `Classes/Blackjack.php`.

Zusätzlich hängt `ext_localconf.php` an das eigene Inhaltselement den
geräteneutralen Baustein `casino-device-description` aus `casino_startpage`
(Schritt `20` der `dataProcessing`-Kette, mit `gattung = tisch`): er liefert
`<meta name="description">` und einen `Game`-Eintrag in strukturierten Daten
für die eigene Spielseite. `casino_startpage` kennt dafür kein einziges Gerät
— jede Geräte-Extension hängt den Baustein an ihre eigene dataProcessing-Kette.

## Inhaltselement „Blackjack"

| | |
|---|---|
| `CType` | `blackjack` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.blackjack` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()` |
| Template | `Resources/Private/ContentElements/Table.html` |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht vollständig
im Browser.

Bewusst **kein** eigenes Site Set für das TypoScript: ein Set wirkt erst, wenn
die Site-Konfiguration es einbindet — ein weiteres Gerät müsste dafür
`typo3conf/sites/casino-kunterbunt/config.yaml` ändern, und genau das
verbietet den Architektur-Grundsatz, dass eine Geräte-Extension ohne Änderung
an anderen Stellen installierbar ist.

**Stand nach Phase C5:** Die Spielseite zeigt den vollständigen Tisch — Tuch
in D-Form, selbst gezeichnete Karten, Bedienleiste mit Handtafel, Ton-Schalter
und Verlaufsstreifen. Ein einziges JavaScript-Modul (`blackjack.js`) verdrahtet
alles; die Abschnitte „Der Tisch", „Die Karten", „Die Bedienung" und „Klang"
unten beschreiben das gerenderte Markup im Einzelnen.

## Der Tisch

Das Tuch (`Resources/Private/Partials/Table/Blackjack/Felt.html`,
`Resources/Public/Css/felt.css`) hat eine **D-Form**: die Geberseite liegt
gerade oben, der Bogen der Spielerplätze darunter. Rechts vom Geber steht der
**Kartenschlitten**, links die **Ablage** für ausgespielte Karten — genau die
Anordnung eines echten Blackjack-Tisches. Über dem Setzkreis liegt der
**Versicherungsbogen**, der nur sichtbar wird, wenn der Geber ein Ass zeigt.

**Die Kernvorgabe des Auftraggebers:** die eigenen Karten liegen **auf dem
Tuch verdeckt** (Kartenrücken, kein Rückschluss auf die Identität möglich —
siehe Prüfung K-5) und **in der Bedienleiste rechts unten aufgedeckt**, in der
sogenannten Handtafel. Dort, und nur dort, liest der Spieler sein Blatt
tatsächlich. Beide Bilder entstehen aus derselben Karte
(`cards-blackjack.js#handMarkup()`), einmal mit `faceDown: true`, einmal mit
`faceDown: false` — Prüfung V-12 weist das am ausgelieferten Quelltext nach,
mit Gegenprobe.

## Die Karten

52 Karten und ein Kartenrücken entstehen zur Laufzeit aus einem Vorrat von
neun SVG-Zeichnungen (`Resources/Private/Partials/Table/Blackjack/
CardSprite.html`): der leeren Kartenfläche, dem Rücken, den vier Farbzeichen
und den drei Bildzeichen für Bube, Dame und König. Eine einzelne Karte setzt
`cards-blackjack.js#cardMarkup()` daraus zusammen — Fläche, zwei Rangecken und
ein großes Mittelbild — statt 52 fertige Zeichnungen vorzuhalten.

**Die Rangzeichen sind deutsch:** `B`, `D`, `K`, `A` für Bube, Dame, König,
Ass, statt der international geläufigen `J`/`Q`/`K` — das ganze Projekt ist
deutsch, und ein eigenes Zeichen ist der internationalen Abkürzung vorzuziehen.

**Herkunft:** Die vier Farbzeichen des französischen Blattes sind seit dem
15. Jahrhundert Allgemeingut; geschützt sein kann immer nur eine bestimmte
Zeichnung, nie das System. Alle vier Zeichen hier sind aus Grundformen
konstruiert (Kreisbögen, eine Raute, Rechtecke) und zeichnen nichts ab. Die
drei Bildzeichen für Bube, Dame und König sind **ausdrücklich nicht** die
überlieferten Figurenbilder eines französischen Blattes, sondern eigene,
abstrakte Zeichen. Es wird **keine Schrift für Kartenzeichen** benutzt und
**kein Unicode-Zeichen** aus dem Bereich der Spielkarten — das Rangzeichen ist
gewöhnlicher Text in der Anzeigeschrift des Projekts. Prüfung **K-13** in
`verify-cards.mjs` weist beides nach.

**Drei voneinander unabhängige Merkmale** trägt jede offene Karte: den Rang
als Text, ein Farbzeichen mit eigener, unterscheidbarer Silhouette (vier
verschiedene Umrisse, nicht zweimal derselbe Umriss in zwei Farben), und einen
für Hilfsmittel lesbaren Namen („Herz Dame"). Farbe ist damit Zugabe, nie
Information.

## Die Bedienung

Vier Handlungsknöpfe stehen während des eigenen Zuges bereit
(`Resources/Private/Partials/Table/Blackjack/Actions.html`):

| Knopf | Wirkung |
|---|---|
| **Karte** | eine weitere Karte auf das laufende Blatt |
| **Stehen** | das Blatt bleibt, wie es ist |
| **Doppeln** | der Einsatz dieses Blattes wird noch einmal nachgelegt, genau eine Karte kommt, danach steht das Blatt |
| **Teilen** | aus einem Paar werden zwei Blätter, das zweite mit demselben Einsatz |

**Warum „Doppeln" und nicht „Verdoppeln":** Die geteilte Bedienleiste des
Site Packages hat bereits einen Knopf „Verdoppeln", der den **Einsatz vor der
Runde** verdoppelt. Zwei Bedienteile mit demselben sichtbaren Text sind für
eine Sprachsteuerung nicht auseinanderzuhalten (WCAG 2.4.6) — „Doppeln" ist
geläufiges Kartentisch-Deutsch und unterscheidet sich hörbar.

**Versicherung:** Zeigt der Geber ein Ass, erscheinen zwei weitere Knöpfe
(„Versichern"/„Ohne Versicherung"). Sie sind `hidden`, solange keine
Versicherung angeboten wird — ein Knopf, den es gerade nicht *gibt*, gehört
nicht in die Tastaturreihenfolge, anders als ein Knopf, der *gerade nicht
geht* (`aria-disabled`).

**Tastaturwege:** jeder Knopf ist ein echter `<button type="button">`, mit
`Tab` erreichbar und mit `Enter`/`Leertaste` auslösbar; kein Bedienteil
benutzt ein echtes `disabled` (Prüfung A-13/V-3). Beim Wechsel in den
Zustand `'spieler'` oder `'versicherung'` wandert der Fokus **von selbst**
auf den ersten gerade erlaubten Knopf, und beim Rückfall zurück auf den
Auslöser „Geben" — Prüfung V-15 weist das nach.

## Die eine Quelle

Kartenwerte, Ablauf, Hausregeln und das Zieh-Schema des Gebers stehen
**ausschließlich** in `Resources/Public/JavaScript/rules-blackjack.js`. Diese
README wiederholt keine einzige davon — auch nicht als „nur zur Übersicht".
Eine zweite Abschrift ist genau der Fehler, den Review C3 am Roulette
gefunden hat: dort stand die Feldliste am Ende an mehreren Stellen, und nicht
alle davon verglich jemand. Wer die Regeln lesen will, lässt sie sich aus der
einen Quelle ausdrucken:

```
ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/dump-rules.mjs
```

Das druckt die Kartenwerte, die Hi-Lo-Marke je Rang, die vollständige
Hausregeltabelle und das Zieh-Schema des Gebers — Letzteres nicht als
abgeschriebener Text, sondern als **berechnete** Tabelle über jede erreichbare
Geberlage.

Es gibt bewusst **keine** PHP-Spiegelung des Regelwerks (anders als beim
Roulette, wo eine solche Spiegelung zu Folgeabschriften geführt hat, die
niemand mehr verglichen hat). `shoe.js` und `round-blackjack.js` bekommen das
Regelmodul stattdessen als Ganzes **eingespeist** und importieren es nicht
relativ — deshalb können sie gar keine eigene Regelzahl kennen, selbst wenn
sie wollten.

Prüfung **A-11** in `verify-cabinet.mjs` setzt das in beide Richtungen durch:
sie schlägt fehl, sobald eine Regelzahl außerhalb von `rules-blackjack.js`
auftaucht — in dieser README, in `ext_emconf.php`, in einer XLIFF-Datei oder
in einem ausgelieferten Fluid-/CSS-Dokument —, **und** sie schlägt ebenso
fehl, wenn eine tragende Zahl aus dem Regelwerk dort **fehlt**.

Die **Grundstrategie** (das Spielverfahren, mit dem der Quotennachweis
misst) ist ausdrücklich **kein Teil des Spiels** und liegt deshalb nicht
neben dem Regelwerk, sondern unter `Resources/Private/Scripts/basic-strategy.mjs`
— einem Verzeichnis, das über das Web nicht erreichbar ist. Das Gerät selbst
gibt keine Empfehlung; Prüfung **R-11** in `verify-rules.mjs` stellt sicher,
dass unter `Resources/Public/` keine Strategietabelle dieser Art existiert.

## Der Schlitten

`Resources/Public/JavaScript/shoe.js` führt mehrere gemischte Kartendecks als
einen einzigen Kartenschlitten: das Mischen, das Ziehen, die Trennkarte und
den mitlaufenden Hi-Lo-Zähler des Hauses.

Gemischt wird mit **Fisher-Yates, rückwärts**: für jede Position wird eine
noch nicht vertauschte Karte per Zufall ausgewählt und getauscht, mit der
korrekten (und in der Praxis am häufigsten falsch gewählten) Schranke. Eine
ganze Zahl aus dem Zufallsgeber zu ziehen geschieht über das
**Verwerfungsverfahren**: statt den rohen Zufallswert einfach auf den
gewünschten Bereich zu reduzieren (was die untersten Werte hauchdünn
bevorzugte), wird ein zu großer Wert verworfen und neu gezogen — eine
Schieflage, die kein Nachweis über bloßes Beobachten je fände, aber die es
gäbe, würde man sie nicht durch Konstruktion ausschließen.

Die **Trennkarte** sitzt an einer festen, im Regelwerk hinterlegten Position;
ist sie erreicht, muss vor der nächsten Runde neu gemischt werden. Ein
Schlitten, der mitten in einer Hand leer wird, mischt **nicht** heimlich
nach — er wirft einen Fehler. Das ist Absicht: ein Gerät, das mitten im Spiel
unbemerkt neu mischt, wäre ein lügendes Gerät.

Der Aufbau (sechseinhalb Reihen Karten in jedem frischen Schlitten aus jeweils
derselben festen Kartenfolge, dann gemischt) ist so gewählt, dass der Nachweis
„keine Karte geht verloren, keine wird erfunden" eine echte Aussage über den
Aufbau ist, nicht nur über das Mischen.

## Der Zähler des Hauses

Jede den Schlitten verlassende Karte trägt eine Hi-Lo-Marke (positiv, neutral
oder negativ, je nach Kartenwert); ihre laufende Summe ist der **laufende
Zähler**. Geteilt durch die noch nicht gezogene Kartenzahl (in vollen Decks
ausgedrückt) ergibt sich der **wahre Zähler**.

Steigt der wahre Zähler über eine im Regelwerk festgelegte Schwelle, wird vor
der nächsten Runde vorzeitig neu gemischt („Shuffle up") — zusätzlich zu dem
ohnehin fälligen Mischen bei erreichter Trennkarte. Dieser Zähler ist
**niemals sichtbar** und beeinflusst **niemals** eine Spielentscheidung des
Gebers: `rules-blackjack.js`, das Modul, das die Zieh-Entscheidung trifft,
kennt gar keinen Zähler — er lebt ausschließlich im Schlitten (`shoe.js`).
Prüfung **R-12** in `verify-rules.mjs` und Prüfung **Q-9** in
`verify-round.mjs` weisen das aus zwei unabhängigen Blickwinkeln nach: einmal
über den vollständigen Zustandsabschluss des Zieh-Schemas, einmal am
tatsächlich gespielten Spiel, mit einem Zählerstand, der absichtlich auf
gegensätzliche Extreme gesetzt wird, ohne dass sich die Geberentscheidungen
ändern.

Der Zähler zählt jede Karte, sobald sie den Schlitten verlässt — auch die
verdeckte Karte des Gebers. Das betrifft ausschließlich den Zeitpunkt des
Mischens (siehe `DECISIONS.md`).

## Zufall und Wiederholbarkeit

`Resources/Public/JavaScript/rng.js` ist die **einzige** Stelle in dieser
Extension, an der gewürfelt wird, und die eine benannte Umschaltstelle
zwischen zwei Gebern derselben Form:

- **im Spiel:** `drawUint32()` — echter Zufall aus `crypto.getRandomValues()`.
  Steht keine sichere Zufallsquelle bereit, **wirft** die Funktion; es gibt
  keinen Rückfall auf einen unsicheren Zufallsgeber.
- **im Nachweis:** `createSeeded(saat)()` — ein einfacher, dokumentierter
  Zählergenerator, der bei gleicher Saat auf jeder Maschine dieselbe Folge
  liefert. Er wird **nie** im Spiel benutzt.

Sowohl `shoe.js` als auch `round-blackjack.js` bekommen ihren Zufallsgeber
bzw. ihren Schlitten **eingespeist**, statt ihn selbst zu importieren — genau
dieselbe Bauart wie beim Roulette. Das hält beide Dateien import- und
dokumentfrei und macht sie unter Node unmittelbar ladbar, ohne die
Import-Map von TYPO3 nachzubilden — die Voraussetzung dafür, dass jeder
Nachweis mit dem **echten** Code rechnet, nicht mit einer Nachbildung davon.

**Ein dritter Geberzustand seit Umsetzungsstück D5-4 (die Lobby).** Läuft
dieser Tisch in einer QR-Lobby (CONCEPT.md D.10), tritt zur Rundenlaufzeit
ein `createSeeded(saatZuZahl(saat))` an die Stelle von `drawUint32` — die
Saat kommt vom Server (`casino_lobby`) und ist für jeden Sitzenden dieselbe.
`saatZuZahl()` steht dafür wortgleich (nachgewiesen, nicht nur behauptet:
`casino_lobby/verify-lobby-live.mjs`, V-21) in dieser `rng.js`, in
`roulette/rng.js`, in `craps/rng.js` und in `casino_lobby/lobby-seed.js`.
`createSeeded(` wird in `blackjack.js` genau EINMAL AUFGERUFEN — im
`saatGeber`-Rückruf an `connectLobby()` — nirgends sonst (`verify-view.mjs`,
V-18).

**Drei offengelegte Grenzen, alle in `round-lobby-blackjack.js` und
`lobby-blackjack.js` ausführlich begründet:**

- **Jede Lobby-Runde beginnt mit einem frisch aus der Rundensaat gemischten
  Schlitten.** Am Einzeltisch läuft ein Schlitten über viele Runden, bis die
  Trennkarte kommt (Abschnitt „Der Schlitten"). In der Lobby geht das nicht
  — die Saat kommt je Runde neu vom Server, und ein Schlitten, der über
  Runden hinweg lebt, müsste seine Position an jeden Browser weitergeben,
  auch an einen, der gerade beitritt. **Kartenzählen bringt in der Lobby
  deshalb nichts.**
- **Die Geberreserve.** Beim Blackjack ziehen alle Plätze aus EINEM
  gemeinsamen Schlitten (dem einzigen, an dem eine Entscheidung eines
  Platzes die Karten aller anderen verschiebt — die eine Stelle in
  `CONCEPT.md` D.10, an der eine Saat allein nicht reicht; das
  Zugprotokoll, serverseitig `tx_casinolobby_lobby.moves`, macht die Folge
  erst vollständig deterministisch). Ein Platz, der zuerst steht, spielt
  seinen Geber SOFORT lokal aus (`round-blackjack.js#_maybeAdvanceToDealer()`
  kennt keine Lobby und wartet auf niemanden) — zöge der Geber dabei regulär
  weiter aus dem Schlitten, bekäme ein früh stehender Platz einen ANDEREN
  Geber als ein spät stehender. Die Geberkarten kommen deshalb NACH den
  ersten beiden (die aus der regulären Austeilfolge stammen) aus einer zu
  Rundenbeginn abgeschnittenen Reserve am Schlittenende (die letzten 16
  Karten) — unabhängig davon, wann welcher Browser danach fragt. Der Preis:
  diese Karten hängen nicht mehr davon ab, wie oft die Plätze vorher gezogen
  haben; auf die Quote hat das keinen Einfluss (eine Karte vom Ende eines
  gemischten Schlittens ist so zufällig wie eine vom Anfang), wohl aber auf
  das Kartenzählen — dieselbe Grenze wie oben, aus einem zweiten Grund.
- **Die Versicherung wird pro Platz gestellt, nicht allen gleichzeitig.** Am
  echten Tisch bietet der Geber die Versicherung allen an, bevor gespielt
  wird. In der Lobby ist sie stattdessen die erste Frage im EIGENEN Zug
  jedes Platzes (Buchstaben `i`/`n` im Zugprotokoll) — eine zusätzliche
  Tischphase bräuchte eine fünfte Uhr und einen fünften Zustand für einen
  Nebenfall. Auf das Geld hat das keinen Einfluss: die Versicherung ist eine
  Einzelwette gegen den Geber und hängt von keinem anderen Platz ab.

Nachgewiesen in `verify-lobby-blackjack.mjs` (B-1 bis B-10, gerechnet mit dem
echten `round-lobby-blackjack.js`, dem echten `shoe.js` und dem echten
`rules-blackjack.js`) und live in `probe-lobby-blackjack.mjs`. Der Ersatz-
Schlitten, der `round-blackjack.js` unverändert an die gemeinsame Tischfolge
anschließt (`blackjack.js#ersatzSchlitten()`), liest den Geberzustand LIVE aus
`game.state` statt über einen von außen gesetzten Zeitpunkt — begründet im
Kopfkommentar dieser Funktion (`blackjack.js`).

**Behebungslauf, gefunden live mit zwei echten Browsern:** `lobby-live.js`
sendet `casino:lobby-stand` bei JEDER Abfrage IMMER VOR `casino:lobby-runde`
(dieselbe Antwort, zwei Ereignisse nacheinander). Ausgerechnet auf der einen
Abfrage, die eine Runde startet, lief `lobby-blackjack.js#aufStand()` deshalb
EINEN Umlauf zu früh — mit `meinPlatz` noch auf dem Wert der vorigen Runde
und ohne die gerade erst gebaute Tischfolge (`folge`). Die Kartenrücken der
anderen blieben dadurch auf „0" stehen, der eigene Zug erschien fälschlich
gesperrt, und weil eine frisch ausgeteilte Runde von sich aus nichts meldet
(reine Client-Rechnung, keine Buchung), kam der nächste echte Umlauf oft erst
mit der vollen 20-Sekunden-Notbremse. Behoben, indem `aufRunde()` denselben,
gerade gesehenen Stand (`letzterStand`) ein zweites Mal verarbeitet, sobald
`meinPlatz` und `folge` stehen — gefahrlos wiederholbar, weil
`LobbyTableSequence.anwenden()` selbst mitzählt, wie weit es schon gekommen
ist, und `gemeldet`/`eigenerZugGemeldet`/`letzteFelder` jede doppelte Meldung
an den Server verhindern. Siehe außerdem den zweiten, serverseitigen Fund in
`casino_lobby/README.md` (Abschnitt „Der Rundentakt und die Setzuhr").

## Geld am Tisch

Das Guthaben dieses Casinos ist eine **ganze Zahl** — `credit.js` und
`machine-credit.js` verweigern jeden Betrag, der keine ganze Zahl ist. Das
Regelwerk verlangt gleichzeitig eine Blackjack-Auszahlung mit einem
Bruchteilfaktor größer eins und eine Versicherung von höchstens der Hälfte
des Einsatzes; bei einem Mindesteinsatz von einem Euro wären beide Beträge
nicht ganzzahlig.

**Deshalb gilt an diesem Tisch eine bewusste, dokumentierte Abweichung vom
Wortlaut des Konzepts: der Einsatz ist geradzahlig, mit einem Mindesteinsatz
von 2 €.** Das ist der einzige Punkt, an dem diese Extension vom Konzepttext
abweicht; die Begründung, die verworfenen Alternativen und das Kriterium,
woran man einen Irrtum erkennen würde, stehen ausführlich in `DECISIONS.md`.
Verdoppeln und Teilen legen weiterhin genau den bisherigen Einsatz nach, auch
über die sonst geltende Obergrenze hinaus — diese Obergrenze gilt für den
Grundeinsatz. Die genauen Zahlen (Mindest- und Höchsteinsatz, Schrittweite)
stehen, wie jede andere Regelzahl auch, ausschließlich in
`rules-blackjack.js` und lassen sich mit `dump-rules.mjs` ausdrucken.

**Der Nachlegeweg.** Der Grundeinsatz wandert über die geteilten
Tisch-Bausteine aufs Tuch (Chip legen → Setzfläche bucht → Kasse bucht).
Verdoppeln, Teilen und Versicherung brauchen dagegen mitten in der Runde
einen **Betrag**, keinen Chip — und der Spieler hat vielleicht gerade keinen
passenden Chip im Rack. `round-table-blackjack.js#_stakeAmount()` legt
deshalb abwechselnd den größten *passenden* Chip und wechselt, wenn keiner
passt, den kleinsten *zu großen* klein (`bank.exchangeDown()`, ändert den
Wert des Racks nicht). Reicht der Buy-in nicht, werden bereits gelegte Chips
vollständig zurückgenommen, und die Handlung wird abgelehnt, ohne dass eine
Karte den Schlitten verlassen hätte — dieselbe Alles-oder-nichts-Zusage wie
beim Einwerfen. Geprüft (mit echtem Nachlegeweg, nicht nachgebildet) in
`verify-table.mjs`, T-6, T-7, T-8 und T-12.

## Prüfskripte

Alle Prüfskripte sind reine Lesewerkzeuge: sie ändern keine Datei, starten
keinen Browser und brauchen keine laufende TYPO3-Instanz.

| Skript | Prüft | Umfang | Laufzeit |
|---|---|---|---|
| `verify-cabinet.mjs` | Geometrie, Gestaltung, Trennung von `casino_startpage`, Negativliste fremder Namen, die eine Quelle des Regelwerks (A-1 bis A-13) | 13 Prüfgruppen mit mehreren Gegenproben | unter einer Sekunde |
| `verify-rules.mjs` | Kartenwerte, Zieh-Schema (vollständig über jede erreichbare Geberlage, nicht als Stichprobe), Hausregeltabelle (R-1 bis R-12) | u. a. alle Zweikarten-Paare, alle legalen Einsätze | unter fünf Sekunden |
| `verify-shoe.mjs` | Mischen, Ziehen, Trennkarte, Zähler, das Verwerfungsverfahren und die richtige Fisher-Yates-Schranke (S-1 bis S-11) | 33 Aussagen, dazu eine Gleichverteilungsprobe über 200.000 Mischungen eines kleinen Stapels | rund 1,6 Sekunden |
| `verify-round.mjs` | Der vollständige Ablauf einer Runde, der starre Geber, Ganzzahligkeit, Bilanz, Mischzeitpunkt (Q-1 bis Q-16) | 119 Aussagen, davon mehrere über 200.000 echt gespielte Runden | rund 2,2 Sekunden |
| `dump-rules.mjs` | nichts — druckt das Regelwerk aus der einen Quelle | — | unter einer Sekunde |
| `basic-strategy.mjs` (direkt aufgerufen) | die Grundstrategie gegen eine unabhängig abgetippte Abschrift derselben veröffentlichten Tabelle | 68 geprüfte Lagen | unter einer Sekunde |
| `verify-cards.mjs` | der Kartenvorrat: alle 52 Karten zeichenbar, die verdeckte Karte verrät nichts, vier verschiedene Silhouetten, Text wird maskiert, Kontraste, kein fremdes Kartenzeichen (K-1 bis K-13) | mehrere Gegenproben, u. a. alle 52 Kombinationen einzeln durchgerechnet | rund 1 Sekunde |
| `verify-felt.mjs` | das Tuch: Geometrie, Live-Bereiche, Bewegungsdrosselung, XLIFF-Vollständigkeit (F-1 bis F-12) | mehrere Gegenproben | rund 2,5 Sekunden |
| `verify-table.mjs` | die Runde am Tisch: Wiederholbarkeit, Bilanz auf den Cent, Nachlegeweg, Teilen, Versicherung, Mischzeitpunkt (T-1 bis T-16) | über 2000 echt gespielte Runden, mehrere Gegenproben | rund 1,5 Sekunden |
| `verify-view.mjs` | Ansicht und Barrierefreiheit: dokumentfreie Dateien, ein Schreiber je Live-Bereich, echte Knöpfe, Zielgrößen, Fokus, Haken-Katalog, kein deutscher Text im JavaScript, Fokusführung, Abbruchpfade, XLIFF-Vollständigkeit (V-1 bis V-17) | mehrere Gegenproben | rund 1 Sekunde |
| `verify-sound.mjs` | der Klang: kein Netzzugriff, key/minGap an jedem Aufruf, alle zwölf Klangereignisse tatsächlich ausgeführt, Ehrlichkeit, Spitzenausschlag unter 1,0, Autoplay-Sperre, Bewegungsdrosselung, der Ton-Schalter (N-1 bis N-10) | ein nachgebildeter Web-Audio-Kontext, mehrere Gegenproben | rund 1 Sekunde |
| `verify-lobby-blackjack.mjs` | der Lobby-Anschluss aus Umsetzungsstück D5-4: `lobby-blackjack.js` kann kein Geld bewegen und keinen Server erreichen, `createSeeded(saatZuZahl(saat))` liefert dieselbe Folge wie `casino_lobby/lobby-seed.js`, die Geberreserve trennt Geberkarten zuverlässig von den regulär gezogenen (B-1 bis B-10) | 25 Zusagen, gerechnet mit dem echten `round-lobby-blackjack.js`, dem echten `shoe.js` und dem echten `rules-blackjack.js` | unter zwei Sekunden |

Jede Prüfung mit Gegenprobe fertigt ihre verfälschte oder künstlich
eingeschränkte Kopie selbst im Arbeitsspeicher an und arbeitet nie am echten
Zustand des laufenden Nachweises — eine Prüfung, die nie fehlschlagen kann,
ist keine.

**`probe-lobby-blackjack.mjs`** (nicht in der Tabelle: keine reine
Leseprüfung) ist die Live-Probe mit zwei echten Browsersitzungen, die
nachweist, was `verify-lobby-blackjack.mjs` nicht sehen kann: ob zwei echte
Browser wirklich dieselbe Geberfolge und dasselbe Rundenergebnis sehen
(siehe „Zufall und Wiederholbarkeit"). Sie braucht eine laufende Website mit
eingeschaltetem QR-Modus — deshalb steht sie nicht im Reihenlauf oben und
wird gesondert gefahren.

## Klang

`Resources/Public/JavaScript/sound-blackjack.js` ist die Stimme dieses
Tisches — sie weiß, **wann** etwas zu hören ist; **wie** ein Klang entsteht
und **wie** eine Münze oder eine Registrierkasse klingt, liegt unverändert im
Site Package (`sound.js`, `sound-kit.js`). Alles entsteht aus Tonfrequenzen im
Browser: keine Audiodatei, kein Netzzugriff, keine Melodie, kein Sample.

| Ereignis | Klang |
|---|---|
| Chip auf den Setzkreis gelegt / zurückgenommen | ein Metallanschlag, tiefer beim Legen, höher und leiser beim Zurücknehmen |
| Karte wird gegeben | ein kurzes Wischen über Filz, eine Karte je gegebener Karte |
| Karte des Gebers wird aufgedeckt | dasselbe Wischen, kürzer und heller |
| Neu gemischt | Blattrauschen, dann das Einsetzen des Schlittens |
| Blatt überkauft | ein dunkles, absteigendes Rutschen |
| Blackjack | eine kurze aufsteigende Tonfolge, dann eine helle Münzkaskade |
| Hand gewonnen | eine Münzkaskade |
| Patt | ein einzelner, gedämpfter Metallanschlag |
| Hand verloren | ein Rutschen |
| `CASH OUT` | Glocke, dann die aufgezogene Kassenschublade |
| Leerlauf | ein leises Brummen, solange nichts zu entscheiden ist |

**Ehrlich, nicht spannungssteigernd:** jeder Klang gehört zu etwas, das
wirklich passiert. Kein hervorgehobener Beinahe-Treffer, keine Verlustrunde,
die wie ein Gewinn klingt. Ein Blackjack und ein Überkauf sind aus dem reinen
Zahlenwert einer Runde nicht ableitbar (beides könnte ein gewöhnlicher Gewinn
bzw. Verlust sein) und tragen deshalb ihren je eigenen Klang; das übrige
Rundenergebnis (Gewinn/Verlust/Patt) entscheidet die Vorzeichenfrage des
finanziellen Ergebnisses. Nachgewiesen in `verify-sound.mjs`, N-3 und N-4.

**Der Ton-Schalter** (`Resources/Private/Partials/Table/Blackjack/
SoundSwitch.html`) ist ein echter `<button type="button">` mit `aria-pressed`
und sichtbarem Text „Ton". Sein Zustand steht nie allein in der Farbe: ein
Ring wechselt von durchgezogen auf gestrichelt.

**Bei gedrosselter Bewegung** (`prefers-reduced-motion: reduce`) klingt eine
ausgeteilte Hand nicht als Kette einzelner Karten, sondern als ein einziger,
etwas vollerer Klang — die Kette ist eine Bewegung in der Zeit und wird
gedrosselt wie jede andere.

## Die beiden langen Messläufe

Zwei Messungen laufen deutlich länger als die übrigen Prüfskripte und gehören
deshalb nicht in einen Agentenlauf, sondern werden gesondert, in voller Länge,
ausgeführt und hier dokumentiert.

### Mischgleichverteilung (`measure-shuffle.mjs`)

```
ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/measure-shuffle.mjs \
    --shuffles=1000000 --seed=20260906
```

Prüft die Verteilung der Position einer markierten Karte über einen
vollständigen Kartenschlitten mittels Chi-Quadrat-Anpassungstest, bestanden
bei p > 0,01.

**Ergebnis dieses Laufs:** eine Million Mischungen, Saat 20260906,
χ² = 302,389 bei 311 Freiheitsgraden, **p = 0,6262**, größte Einzelabweichung
−3,22 σ, Laufzeit 19,6 Sekunden. Die zusätzliche Bonferroni-Diagnose über die
volle Kartenmatrix (jede Karte über jeden möglichen Platz) war unauffällig.
Die eingebaute Gegenprobe (die naive, falsch geschrankte Mischfunktion) ist
wie gefordert durchgefallen. **Bestanden.**

### Auszahlungsquote (`measure-payout.mjs`)

```
ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/measure-payout.mjs \
    --hands=10000000 --seed=20260906
```

Misst die Auszahlungsquote bezogen auf den **Grundeinsatz** (nicht auf den
gesamten umgesetzten Betrag — diese zweite Größe wird zusätzlich als
Nebenangabe ausgewiesen) über eine mit `basic-strategy.mjs` optimal spielende
Simulation, gegen eine Gegenprobe mit einer bewusst schlechteren Strategie
(„wie der Geber spielen"). Die Toleranz ist das feste Fenster aus
CONCEPT.md Anhang G; zusätzlich weist der Lauf die empirische Streuung dieser
konkreten Stichprobe aus, damit erkennbar bleibt, ob ein Fehlschlag eine echte
Abweichung oder bloße Stichprobenstreuung wäre (`DECISIONS.md` hält die
Herleitung fest).

**Stand — der volle Lauf ist gefahren, und er hat einen Konzeptverstoß
zutage gefördert.** `--hands=10000000 --seed=20260906`, Laufzeit 62 s:
gemessene Quote (bezogen auf den Grundeinsatz) **99,3015 %** — außerhalb des
im Konzept zugesagten Fensters, formal nur knapp gehalten, sachlich eine
Abweichung von über acht Standardfehlern und damit kein Zufallsergebnis.
Bilanz auf beiden Seiten exakt, Gegenprobe deutlich niedriger. Drei
zusätzliche, unabhängige Läufe über je eine Million Hände (andere Saaten)
bestätigen eine Quote im selben Bereich (rund 99,3 % im Mittel) — das
Ergebnis ist reproduzierbar, kein Ausreißer.

**Die anschließende Untersuchung hat keinen Fehler im Code gefunden.** Drei
unabhängige Prüfmethoden — eine komplett eigene, aus erster Prinzip
hergeleitete Wahrscheinlichkeitsrechnung, ein zellenweiser Vergleich dieser
Herleitung gegen jede einzelne Zeile von `basic-strategy.mjs`, und ein
präzise geriggter, aber mit dem echten Schlitten und der echten Runde
gespielter Test der Verdoppel-Mechanik — bestätigen übereinstimmend: die
Grundstrategie ist für diese Hausregeln praktisch optimal, das
Teilungslimit und die Regel für geteilte Asse sind korrekt umgesetzt, das
Verdoppeln (auch nach dem Teilen) zahlt exakt so viel aus, wie es sollte,
und der Kern des Spiels (Geben, Geberschema, Überkauf, Auszahlung) stimmt
mit der theoretischen Erwartung auf wenige Hundertstel Prozentpunkte genau
überein. Die vollständige Herleitung, jede geprüfte Einzelvermutung mit
ihrer gemessenen Wirkung und der ausführlich hergeleitete tatsächliche
Hausvorteil dieser Hausregeln stehen in `DECISIONS.md`.

**Deshalb bleibt der Code unverändert, und diese README nennt die
GEMESSENE Zahl statt der im Konzept erhofften:** die aus den Hausregeln
dieses Tisches tatsächlich folgende Quote liegt bei rund 99,3 %, nicht bei
dem in Anhang G genannten Zielwert. Das ist ein bewusst hingenommener,
ausdrücklich festgehaltener Konzeptverstoß — neben dem bereits
dokumentierten geradzahligen Mindesteinsatz der zweite dieser Art an diesem
Tisch. `measure-payout.mjs` behält seine feste Schranke aus dem Konzept
unverändert bei (sie wird nicht aufgeweicht) und wird bei einem künftigen
vollen Lauf deshalb erwartungsgemäß weiterhin durchfallen — das Skript
prüft ehrlich gegen das, was zugesagt wurde, auch wenn die Zusage selbst zu
optimistisch war.

## Barrierefreiheit

**Was in Phase C4 bereits gilt:** Die Zeichnung des Tisches ist
`aria-hidden` und trägt keinen zweiten, redundanten Namen; was auf der Seite
steht, sagt zusätzlich ein Absatz in Worten. Die Seite trägt kein echtes
`disabled`, keinen Live-Bereich ohne Eigentümer und keinen Messpunkt ohne
Schreiber (Prüfungen A-12, A-13).

**Was Phase C5 eingelöst hat** — die sieben Punkte waren Planungsvorgabe für
den Tisch; so sind sie tatsächlich gebaut, mit der Prüfung, die es je
nachweist:

1. **Eine Karte unterscheidet sich nie allein durch Farbe.** Jede Karte
   trägt drei voneinander unabhängige Merkmale: den Rang als Text, ein
   Farbzeichen mit eigener, unterscheidbarer Silhouette (vier verschiedene
   Umrisse, nicht zwei rote und zwei schwarze Varianten desselben Umrisses),
   und einen für Hilfsmittel lesbaren Namen (z. B. „Herz Dame"). Farbe ist
   Zugabe, nicht Information. Nachgewiesen in `verify-cards.mjs`, K-4 und
   K-6; die Ausgangsmarke jeder Hand trägt zusätzlich immer ein Wort
   (`verify-view.mjs`, V-14).
2. Jedes Bedienteil mit sichtbarer Aufschrift, dessen Untergrund kein
   einfarbiges Feld ist (der Ton-Schalter auf dem Messingverlauf), bekommt
   ein helles Namensschild hinter dem Text; die statische Kontrastprüfung
   rechnet gegen jeden benannten Farbstopp und nimmt das Minimum. Nachgewiesen
   in `verify-sound.mjs`, N-10.
3. Kein echtes `disabled`, immer `aria-disabled`, damit der Tastaturweg
   bleibt. Nachgewiesen in `verify-cabinet.mjs`, A-13, und `verify-view.mjs`,
   V-3.
4. Live-Bereiche werden leer ausgeliefert, füllen sich nicht beim Laden,
   haben je Bereich genau einen Eigentümer und geben einen Satz je
   Zustandswechsel. Nachgewiesen in `verify-view.mjs`, V-2 und V-16.
5. Jeder Messpunkt hat genau einen Schreiber; ein `data-`Attribut, das
   zugleich Marke und Zustandsspiegel ist, war in diesem Projekt bereits
   zweimal ein Befund. Zustandsspiegel heißen `-on` (`data-bj-sound-on`).
   Nachgewiesen in `verify-view.mjs`, V-6 und V-10.
6. Zielgrößen: mindestens 2,75rem (deutlich über den von WCAG 2.2, SC 2.5.8
   geforderten 24×24 CSS-Pixel) für jedes Bedienteil, ausreichender
   Textkontrast und ausreichender Kontrast für Bedienteilgrenzen; sichtbare
   Fokusrahmen überall, kein `outline: none` ohne Ersatz. Nachgewiesen in
   `verify-view.mjs`, V-4 und V-5.
7. Der Ablauf einer Hand ist eine Zustandsfolge und wird angesagt — wer
   nicht sieht, dass der Geber gerade zieht, hört den Satz im eigenen
   Live-Bereich der Runde. Nachgewiesen in `verify-view.mjs`, V-13, mit der
   Fokusführung aus V-15.

**Was nur ein Mensch beurteilen kann:** ob die Kartenzeichnung bei realer
Bildschirmgröße und mit echten Screenreadern/Tastatur tatsächlich benutzbar
ist, ob der Klang zu diesem Tisch passt und nicht an ein bestimmtes fremdes
Spiel erinnert, und ob die Ansagen in sinnvoller Reihenfolge vorgelesen
werden. Ein Prüfskript kann Struktur, Kontrastwerte und rechnerische
Klanggrenzen gegen die Tokens bzw. gegen einen nachgebildeten Web-Audio-
Kontext prüfen, aber keinen echten Bedienversuch mit echten Hilfsmitteln
ersetzen — das gehört in `test.txt`.

## Grenzen, offen gelegt

Dieser Tisch arbeitet seit Phase D3 gegen ein **serverseitiges Konto**, wenn
der QR-Modus eingeschaltet ist. Daraus folgen fünf Grenzen, die hier stehen,
damit niemand mehr hineinliest, als da ist.

- **Der Schutz richtet sich gegen Versehen und Neugier, nicht gegen
  Angriffe** (`CONCEPT.md` D.9). Wer den QR-Code einer anderen Person
  abfotografiert, kann sich als sie anmelden. Wer den Spielverlauf im
  eigenen Browser fälscht, kann sich Geld erschwindeln. Das ist eine
  Spaßseite in einem Wohnzimmer, kein Wettbüro. Die vollständige Fassung
  steht in `casino_account/README.md`, Abschnitt „Grenzen, offen gelegt".
- **Der Tisch selbst kennt den Schalter nicht.** Er ruft ausschließlich die
  Kassen-Schnittstelle des Site Package auf (`credit.js`, `table-buyin.js`);
  ob dahinter der Browserspeicher oder der Server steht, entscheidet
  `account-backend.js`. Ein Fehler in dieser einen Datei träfe deshalb alle
  sieben Geräte und Tische gleichzeitig — genau die Fehlerklasse, die am
  2026-09-11 an den Risiko-Leitern der Automaten aufgetreten ist.
- **Wer mitten im Spiel die Verbindung verliert**, bekommt die Sperranzeige;
  solange sie steht, wird nichts gebucht und nichts weitergerechnet. Was in
  der Sekunde des Abrisses noch nicht gebucht war, ist verloren.
- **In der Lobby kann der Server das Ergebnis nicht nachrechnen**
  (`CONCEPT.md` D.10.4). Der Server zieht die Saat, jeder Browser rechnet
  daraus dieselbe Runde, und das Ergebnis wird von **einem** Browser gemeldet
  und einmal festgeschrieben. Wer der Melder ist und seinen eigenen Browser
  fälscht, kann ein falsches Ergebnis festschreiben. Die Alternative — die
  gesamte Physik ein zweites Mal in PHP zu schreiben — wäre ein eigenes,
  fehleranfälliges Projekt für sich. Die vollständige Fassung steht in
  `casino_lobby/README.md`, Abschnitt „Grenzen, offen gelegt". Beim
  Blackjack kommt eine geräteeigene Ausprägung hinzu: die Geberreserve und
  das Zugprotokoll, siehe „Zufall und Wiederholbarkeit" oben.
- **In der Lobby wird vor jeder Runde neu gemischt.** Ein Schlitten, der wie
  am Einzeltisch über viele Runden lebt, müsste seine Position an jeden
  Browser weitergeben, auch an einen, der gerade erst beitritt — das leistet
  die gemeinsame Saat nicht. **Kartenzählen bringt in der Lobby deshalb
  nichts** (siehe „Zufall und Wiederholbarkeit").

## Stand

Phase C4 (Blackjack, Deck und Regelwerk) ist **vollständig**: Gerüst und
Anmeldung (C4a), das Regelwerk (C4b), der Kartenschlitten mit bestandenem
Mischnachweis (C4c), die vollständige Runde mit dem starren Geber (C4d)
sowie die Grundstrategie und der Quotennachweis (C4e). Der volle,
zehn Millionen Hände lange Auszahlungslauf ist gefahren; er hat einen
zweiten, ausdrücklich festgehaltenen Konzeptverstoß zutage gefördert (die
tatsächliche Quote dieser Hausregeln liegt bei rund 99,3 %, nicht bei dem im
Konzept genannten Zielwert) — siehe den Abschnitt „Die beiden langen
Messläufe" oben und die vollständige Herleitung in `DECISIONS.md`. Der Code
selbst ist nach eingehender, mehrfach unabhängig geführter Untersuchung
unverändert richtig.

Phase C5 (Blackjack, Tisch und Bedienung) ist **vollständig**: die
Kartenbilder (C5a), Tuch, Platz und Geldweg (C5b), Runde, Bedienung und Bild
(C5c) sowie Klang, Nachweise, README und Copyright-Vorarbeit (C5d). Der Tisch
ist damit spielbar — Buy-in, Setzen, Geben, Karte, Stehen, Doppeln, Teilen,
Versicherung, Auswertung und Auszahlung laufen vollständig über die geteilten
Tisch-Bausteine des Site Packages und die eigene Rundenlogik aus Phase C4.

Zwei aus Phase C4 übernommene, dokumentierte Konzeptabweichungen bleiben
bestehen und werden von Phase C5 nicht berührt: der geradzahlige
Mindesteinsatz (Abschnitt „Geld am Tisch") und die gemessene Auszahlungsquote
von rund 99,3 % (Abschnitt „Die beiden langen Messläufe"). Beide sind
Eigenschaften der Hausregeln dieses Tisches, keine Fehler, und ausführlich in
`DECISIONS.md` hergeleitet.

**Phase D3** (serverseitiges Konto) hat an diesem Tisch **keine einzige
Zeile geändert.** `blackjack.js` bezog Kasse und Gerätekredit schon seit
Phase C5 über die geteilten Bausteine des Site Package (`credit.js`,
`table-buyin.js`); ob dahinter der Browserspeicher oder der Server steht,
entscheidet ausschließlich `account-backend.js` im Site Package (siehe
„Grenzen, offen gelegt").

Mit **Umsetzungsstück D5-4** (CONCEPT.md D.10) hängt dieser Tisch in der
QR-Lobby: derselbe Tisch, ein dritter Geberzustand, ein neuer Adapter
(`lobby-blackjack.js`, importiert aus `casino_lobby` NICHTS — nur vier
DOM-Ereignisse) und eine neue, dokument- und importfreie Datei
(`round-lobby-blackjack.js`, die gemeinsame Tischfolge aus Saat und
Zugprotokoll). Drei offengelegte Grenzen — Kartenzählen wirkungslos, die
Geberreserve, die pro Platz gestellte Versicherung — stehen im Abschnitt
„Zufall und Wiederholbarkeit". Neuer Nachweis `verify-lobby-blackjack.mjs`
(25 Zusagen, gerechnet gegen die echten drei Kartendateien, keine
Nachbildung) und eine Live-Probe `probe-lobby-blackjack.mjs`.
