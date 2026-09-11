# Casino Kunterbunt – Lobby

## Zweck

Zehnte Extension des Spaß-Casinos **Casino Kunterbunt**: das Lobby-System.
Mehrere Personen sitzen an einem Tisch, sehen einander, teilen eine
gemeinsame Runde, eine gemeinsame Setzuhr und dieselbe Saat — damit alle
dieselbe Kugel, dieselben Würfel und dieselben Karten erleben (CONCEPT.md
D.10). Angeboten werden drei Spiele: Roulette und Craps mit je acht Plätzen,
Blackjack mit fünf; höchstens vier Tische je Spiel.

Diese Extension ist **rein additiv**: kein bestehender Pfad wird verändert,
und ohne eingeschalteten QR-Modus aus `casino_account` ist die Lobby
vollständig unsichtbar — keine Adresse, kein Markup, kein Zeichen
Unterschied zur heutigen Website (D.1). Die drei Tische selbst
(`roulette`, `blackjack`, `craps`) werden von dieser Extension **nicht**
angefasst; ihre eigene Simulation bleibt unverändert, bis Phase D5 sie an
die Lobby anschließt.

## Eckdaten

| | |
|---|---|
| Extension-Key | `casino_lobby` |
| Composer-Name | `phomo17/casino-lobby` |
| Namespace | `Phomo17\CasinoLobby\` |
| Tabellen | `tx_casinolobby_lobby`, `tx_casinolobby_seat`, `tx_casinolobby_bet` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeiten | `casino_startpage` >= 0.5.0, `casino_account` >= 0.5.0 |
| Lizenz | AGPL-3.0-or-later |
| Zustand | 0.5.0 / alpha |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_lobby
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 extension:setup
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

`extension:setup` legt die drei Tabellen an (13 / 10 / 10 Spalten,
`uid`/`pid`/`tstamp`/`crdate` eingeschlossen). Ohne `cache:flush` läuft
keine der beiden Middleware-Schichten aus Umsetzungsstück D4b — und zwar
ohne Fehlermeldung, weil TYPO3 den Middleware-Stapel zwischenspeichert.

## Wie eine Lobby entsteht und wieder verschwindet

Eine Lobby ist **kein Seitendatensatz und keine eigene Adresse** — sie ist
die Antwort einer Middleware unter der Adresse des Tisches selbst
(`/roulette`, `/blackjack`, `/craps`), genau wie die Torseite aus
`casino_account`. Damit gibt es bei ausgeschaltetem QR-Modus schlicht
nichts, was zurückbliebe.

Wer eine Tischadresse aufruft und noch keinen Platz hat:

- findet das System **keine** Lobby für dieses Spiel vor, eröffnet es
  automatisch eine und setzt die aufrufende Person auf Platz 1
  (D.10.3, „Wer ein Lobbyspiel öffnet und findet keine Lobby vor,
  eröffnet automatisch eine.");
- gibt es bereits eine oder mehrere, zeigt die Übersichtsseite die
  Belegung und einen Knopf zum Beitreten oder zum Aufmachen eines neuen
  Tisches, solange `LobbyGames::MAX_LOBBYS` (4) nicht erreicht ist.

Ein Beitritt bekommt die **kleinste freie Platznummer**. Eine Lobby
**schließt sich von selbst**, sobald ihr letzter Platz frei wird — durch
ein ordentliches Verlassen, durch 30 Sekunden ohne Lebenszeichen, oder
beim Abmelden. Es gibt dafür keinen Scheduler-Auftrag: aufgeräumt wird
immer dann, wenn jemand eine Handlung an diesem Spiel auslöst oder eine
Abfrage stellt (`LobbyService::aufraeumen()`).

## Die Platzvergabe

Platz **1 ist der rechte Platz** am Tisch (D.10.3, „die eröffnende Person
ganz rechts"); optisch gedreht über das Stylesheet (`.cl-strip__seats`,
`flex-direction: row-reverse`), nicht durch die Reihenfolge, in der die
Plätze gespeichert oder übertragen werden. Der Server vergibt bei jedem
Beitritt schlicht die **kleinste freie Platznummer** von 1 bis
`seats_max` — auch nach einem Freiwerden, damit keine Lücken entstehen.

Wer an einem **anderen** Spiel bereits sitzt, wird dort automatisch
abgemeldet, sobald er sich an einem neuen Tisch setzt: eine Person steht
immer nur an einem Gerät (D.7.2), und `UNIQUE KEY player` in
`tx_casinolobby_seat` hält das ohnehin fest.

## Der Rundentakt und die Setzuhr

Vier Zustände (`RoundClock`), im Kreis: **setzen** → **gesperrt** →
**läuft** → **auswerten** → zurück zu **setzen**.

- Die **Setzuhr läuft erst ab zwei besetzten Plätzen** (20 Sekunden,
  `RoundClock::SETZZEIT`). Sitzt jemand allein — der Normalfall im
  Wohnzimmer —, gibt es keine Uhr; er löst die Runde selbst über
  `starten` aus, genau wie ohne Lobby-System. Setzt sich ein Zweiter dazu,
  springt die Uhr an; sitzt am Ende nur noch einer, hält sie wieder an.
- Nach der Setzzeit sperrt der Tisch für 2 Sekunden (`SPERRZEIT`) — lang
  genug, dass jeder Browser die neue Saat bei seiner nächsten Abfrage
  (Takt 1 s) sicher bekommt, bevor die Runde losläuft —, zieht eine neue
  Saat und erhöht die Rundennummer.
- Meldet niemand innerhalb von 20 Sekunden (`LAUFFRIST`) ein Ergebnis,
  endet die Runde ohne eines und es wird neu gesetzt.
- Ein Ergebnis bleibt 5 Sekunden stehen (`ERGEBNISZEIT`), bevor wieder
  gesetzt werden darf.
- Ein Platz verfällt nach 30 Sekunden ohne Lebenszeichen
  (`Player::SESSION_TIMEOUT`, dieselbe Frist wie beim Konto) — **aber
  nur in den Zuständen `setzen` und `gesperrt`**. Während `läuft` und
  `auswerten` läuft keine Frist, sonst verlöre jeder seinen Platz, dessen
  Runde länger als 30 Sekunden dauert.

**Behebungslauf D5-4: `state_until` trägt beim Blackjack zwei
verschiedene Fristen in derselben Spalte** — die 20 Sekunden EINES
Platzes (`turn_seat > 0`, `RoundClock::ZUGZEIT`) und, sobald `turn_seat`
wieder 0 ist, die allgemeine „niemand hat ein Ergebnis gemeldet"-Notbremse
(`LAUFFRIST`, oben). `RoundClock::faellig()` ist eine reine Funktion ohne
Kenntnis der Plätze und konnte die beiden Fälle nicht unterscheiden — sie
behandelte jede abgelaufene Einzelplatz-Frist als hätte niemand
gemeldet und brach die ganze Runde zur Setzzeit ab, **ohne** je zum
nächsten Platz weiterzuschalten (gefunden live, mit zwei echten Browsern:
`blackjack/probe-lobby-blackjack.mjs`, Q-2 bis Q-4 blieben tot). Behoben
in `LobbyService::aufraeumenEinzeln()`: die blackjack-eigene
Einzelplatz-Prüfung (`zugWeiterschalten()`) läuft jetzt VOR dem
allgemeinen `RoundClock::faellig()`-Aufruf, nicht mehr danach — geprüft,
nicht nur behauptet, siehe der Kommentar dort. Roulette und Craps kennen
keinen `turn_seat > 0` und sind von diesem Fehler nicht betroffen
(geprüft: `roulette/probe-lobby-roulette.mjs`,
`craps/probe-lobby-craps.mjs`, weiterhin grün).

## Wie alle dieselbe Kugel sehen (die Saat)

Der Server zieht bei jedem Sperren eine Saat (`random_bytes(8)`, als 16
Hex-Zeichen) und verteilt sie an alle Sitzenden. `lobby-seed.js` macht im
Browser daraus über `saatZuZahl()` (FNV-1a) und `createSeeded()`
(SplitMix, bitgenau **dieselbe** Bauart wie in `roulette/rng.js`,
`craps/rng.js` und `blackjack/rng.js` — nachgeprüft, nicht nur behauptet,
siehe „Der Prüfstand" unten) eine wiederholbare Zufallsfolge. Damit
rechnet jeder Browser dieselbe Simulation, ohne dass irgendjemand das
Ergebnis wählen könnte.

`probe(saat)` liefert die ersten drei Ziehungen als Vergleichswert
(„12-4-31") — **kein Spielergebnis**, sondern der Messpunkt, an dem sich
zeigt, ob zwei Browser wirklich dasselbe rechnen. In D4 ist sie zugleich
das Ergebnis, das gemeldet wird, weil es noch keinen angeschlossenen
Tisch gibt; in D5 tritt an ihre Stelle das echte Tischergebnis, die Probe
bleibt als Vergleichswert.

**Gemeldet wird das Ergebnis vom Melder** — dem besetzten Platz mit der
**kleinsten Nummer**, nicht von der eröffnenden Person: steht die
eröffnende Person auf, meldet sonst niemand mehr, und jeder Browser kann
den Melder selbst aus der Platzliste ausrechnen, ohne zu fragen. Meldet
ein anderer Platz ein abweichendes Ergebnis, gilt weiter das zuerst
festgeschriebene; die Abweichung landet im TYPO3-Protokoll.

## Abfragen im Takt — Takt, Antwortgröße, Ruhezustand

**Abgefragt, nicht gestreamt** (D.10.5) — dieselbe Entscheidung wie überall
in diesem Haus gegen Server-Sent-Events und WebSockets, weil jede offene
Verbindung in dieser klassischen Installation dauerhaft einen PHP-Arbeiter
bände. Ein einziger, verketteter `setTimeout` je Seite — nie
`setInterval`: die nächste Abfrage wird erst geplant, nachdem die vorige
beantwortet ist.

- **Takt:** 1 Sekunde am Tisch (`LobbyState::TAKT_MS`), 3 Sekunden in der
  Übersicht (`TAKT_UEBERSICHT_MS`).
- **Antwortgröße:** hat sich nichts geändert, antwortet der Server mit
  **HTTP 204 „No Content"** — null Byte Rumpf. Hat sich etwas geändert,
  trägt die Antwort nur kurze Schlüssel (`r`, `z`, `rest`, `n`, `p` …), um
  bei vielen gleichzeitigen Abfragen jedes Byte zu sparen.
- **Ruhezustand:** im Hintergrund (`document.visibilityState === 'hidden'`)
  wird **gar nicht** gefragt; während einer laufenden Runde (Zustand
  `läuft`) ebenfalls nicht — D.10.5 verlangt das ausdrücklich.
- **Rückfall bei Störung:** wachsender Abstand 1 s, 2 s, 5 s, 10 s, 30 s;
  ab dem dritten Fehlschlag zeigt die Platzleiste einen Hinweis. Kommt die
  Antwort wieder, kehrt der Takt auf 1 s zurück.
- **`last_seen` wird höchstens alle 5 Sekunden geschrieben**, nicht bei
  jeder Abfrage — sonst wäre die ganze Ersparnis aus dem 204-Rückgabewert
  wieder aufgehoben, ohne dass die 30-Sekunden-Frist ungenauer würde.

Die Rechnung, warum vier Lobbys mit je acht Plätzen den Server nicht
zudeckt: höchstens 4 × 8 = 32 gleichzeitige Sitzende, jede höchstens einmal
je Sekunde — 32 Abfragen/s, überwiegend mit leerem 204-Rumpf beantwortet.
Nachgemessen wird das mit `Tests/Acceptance/messlauf-d4.mjs` (siehe „Der
Prüfstand").

## Die Adressen

| Adresse | Methode | Zweck |
|---|---|---|
| `/casino-lobby/stand?r=<Stand-Nummer>` | GET | die Abfrage am Tisch — 204 bei unveränderter Stand-Nummer, sonst der volle Zustand |
| `/casino-lobby/uebersicht?spiel=<key>&r=<Stand>` | GET | die Abfrage in der Übersicht, Takt 3 s |
| `/casino-lobby/handlung` | POST, `application/json` | `{"art": "eroeffnen"\|"beitreten"\|"verlassen"\|"starten"\|"ergebnis", …}` |
| `/roulette`, `/blackjack`, `/craps` | GET | die Weiche: Tisch mit Platzleiste (bereits ein Platz) oder Übersicht (noch keiner) |

Keine dieser Adressen existiert bei ausgeschaltetem QR-Modus — die beiden
Middlewares (`LobbyEndpoint`, `LobbyTable`) prüfen den Schalter als
Allererstes und reichen die Anfrage sonst unverändert durch.

## Das Datenmodell

Drei Tabellen (`ext_tables.sql`, Anhang I aus `CONCEPT.md`):

- **`tx_casinolobby_lobby`** — eine Lobby: Spiel, Höchstplätze, Zustand,
  Zustandsende, Stand-Nummer (`revision`), Rundennummer, Saat, Ergebnis,
  eröffnende Person.
- **`tx_casinolobby_seat`** — ein Platz: Lobby, Spielende, Platznummer,
  letztes Lebenszeichen, beigetreten in Runde, Wartelistenplatz für den
  Shooter (Craps, wird erst in D5 gefüllt). `UNIQUE KEY player`: höchstens
  ein Platz je Person im ganzen Haus. `UNIQUE KEY lobby_seat`: ein Platz
  ist einmal da.
- **`tx_casinolobby_bet`** — ein Einsatz: Lobby, Spielende, Runde, Feld,
  Betrag, Ergebnis. In D4 **angelegt, aber von nichts gelesen oder
  geschrieben** — D5 füllt sie, wenn die Tische in der Lobby setzen.

Keine der drei Tabellen führt `deleted` oder `hidden`: eine Lobby ist
Maschinenzustand mit einer Lebensdauer von Minuten, kein redaktionelles
Gut — eine leer gewordene Lobby wird **gelöscht**, nicht versteckt.

## Der Prüfstand

Sechs reine Leseprüfungen unter `Resources/Private/Scripts/`, dazu eine
Live-Probe:

| Skript | Umfang | Aufruf |
|---|---|---|
| `verify-lobby-schema.mjs` | Datenmodell: TCA ↔ SQL ↔ locallang.xlf, `LobbyGames`/`RoundClock` gegen `CONCEPT.md`, laufende Datenbank | `ddev exec node …/verify-lobby-schema.mjs` |
| `verify-lobby-endpoint.mjs` | Middleware-Kette, Adressen, Weiche — statisch und gegen die laufende Website, beide Schalterstellungen | `ddev exec node …/verify-lobby-endpoint.mjs` |
| `verify-lobby-live.mjs` | Platzleiste, Saat/Probe, mit **zwei echten Sitzungen**: Beitritt, gemeinsame Saat, Setzuhr, Aufräumen | `ddev exec node …/verify-lobby-live.mjs` (89 Zusagen ohne, 95 mit eingeschaltetem QR-Modus und laufender Live-Prüfung) |
| `verify-lobby-round.mjs` | Umsetzungsstück D5-1: dass in der Lobby wirklich eine Runde läuft — `LobbyService::stand()` liefert Saat und Ergebnis, `casino:lobby-runde` feuert wirklich, der Alleinstart funktioniert; seit dem 2026-09-11 zusätzlich S-20/S-21/S-21-G (siehe unten) | `ddev exec node …/verify-lobby-round.mjs` (98 von 98 Zusagen) |
| `verify-lobby-strip.mjs` | Umsetzungsstück D5-2: die Platzleiste zeigt je Platz Einsatz, Ergebnis, Shooter- und Zugmarke richtig an | `ddev exec node …/verify-lobby-strip.mjs` (103 Zusagen) |
| `verify-lobby-timeout.mjs` | **Messlauf, ~80 s** — die 30-Sekunden-Frist, während und außerhalb einer laufenden Runde | `ddev exec node …/verify-lobby-timeout.mjs` (von der Hauptsitzung gefahren, nicht im Reihenlauf) |

Zusätzlich `Tests/Acceptance/messlauf-d4.mjs` (außerhalb dieser Extension,
~60 s): 32 gleichzeitige Abrufe je Sekunde gegen `/casino-lobby/stand`,
misst Rückgabewerte und Antwortzeit — bewertet aber nicht, ob das Ergebnis
„gut genug" ist; das ist eine Entscheidung für `DECISIONS.md`.

`verify-lobby-live.mjs` und `verify-lobby-timeout.mjs` sind die einzigen
Skripte dieser Extension, die schreiben (sie treten Lobbys bei und verlassen
sie wieder) — beide weisen am Ende nach, keine Zeile in
`tx_casinolobby_lobby` oder `tx_casinolobby_seat` hinterlassen zu haben.

**Die vier Live-Proben mit echten Browsern, eine je Umsetzungsstück ab
D5-2:** `probe-lobby-strip.mjs` (hier, D5-2) sowie `probe-lobby-roulette.mjs`,
`probe-lobby-craps.mjs` und `probe-lobby-blackjack.mjs` (in den jeweiligen
Tisch-Extensions, D5-3/D5-4). Keine davon ist eine reine Leseprüfung — jede
braucht eine laufende Website mit eingeschaltetem QR-Modus und mindestens
zwei echte Browsersitzungen, deshalb stehen sie nicht im Reihenlauf oben und
werden einzeln, von der Hauptsitzung, gefahren. **Vorbedingung vor jedem
Lauf: `tx_casinolobby_lobby` und `tx_casinolobby_seat` müssen auf 0 stehen**
— eine Lobby, die ein vorheriger, rot geendeter Lauf stehen gelassen hat,
lässt den nächsten Lauf an seiner eigenen Vorbedingung scheitern, und das
sieht aus wie ein neuer Fehler, ist aber keiner (siehe `DECISIONS.md`,
2026-09-11).

## Grenzen, offen gelegt

- **Der Schutz richtet sich gegen Versehen und Neugier, nicht gegen
  Angriffe** (`CONCEPT.md` D.9). Die Lobby setzt einen eingeschalteten
  QR-Modus und eine gültige Sitzung voraus; sie bucht dabei **nicht selbst**
  — jeder Geldbetrag geht durch `BookingService` von `casino_account`. Die
  vollständige Fassung steht in `casino_account/README.md`, Abschnitt
  „Grenzen, offen gelegt".
- **Der Server kann das Ergebnis nicht nachrechnen** — die Physik einer
  Runde liegt in JavaScript, nicht in PHP. Wer der Melder ist und seinen
  eigenen Browser fälscht, kann ein falsches Ergebnis festschreiben. Die
  Alternative — die gesamte Physik ein zweites Mal in PHP zu schreiben —
  wäre ein eigenes, fehleranfälliges Projekt für sich.
- **Kein Prüfskript sieht, ob die Anlage nach der ersten Runde noch atmet.**
  Am 2026-09-11 setzte `lobby-live.js` beim Rundenstart eine Sperre, deren
  einzige Rücksetzstelle hinter dem Wächter lag, der bei gesetzter Sperre
  sofort zurückspringt: ein Browser, der einmal eine Runde gesehen hatte,
  fragte **nie wieder ab**. Behoben. Gefunden hat es eine Live-Probe mit
  zwei Browsern, nicht eine der Zusagen dieser Extension — die prüfen Felder
  und Quelltext. Wer hier etwas ändert, fährt deshalb eine der
  `probe-lobby-*.mjs`, nicht nur die `verify-lobby-*.mjs`.
- **Ein Platz kann bei einer Netzstörung bis zu 30 Sekunden lang blockiert
  bleiben**, bevor er automatisch frei wird.
- **`lobby-live.js` gab bis zum 2026-09-11 auf JEDES `pagehide` hin ein
  `verlassen` ab** — auch bei einem bloßen `reload()` derselben Tischseite,
  nicht nur beim echten Schließen des Tabs. Saß man dabei allein am Tisch,
  löschte das die eigene Lobby, obwohl man sie noch aufgerufen hatte: die
  nächste Person, die dasselbe Spiel öffnete, fand keine Lobby vor und
  eröffnete automatisch eine neue, mit der nächsten Auto-Increment-Nummer
  (immer genau eins höher als die verschwundene). Gefunden über
  `casino_account/probe-abend.mjs` (Phase P6, Roulette mit drei Personen),
  behoben durch ersatzloses Entfernen des `pagehide`-Aufrufs — das
  ausdrückliche Verlassen über den Leiste-Knopf und die ohnehin vorhandene
  30-Sekunden-Frist genügen. Regressionswächter: `verify-lobby-round.mjs`
  S-20/S-21/S-21-G.
- **Eine Lobby, die niemand mehr aufruft, bleibt als Zeile in der
  Datenbank stehen**, bis das nächste Mal jemand dieses Spiel öffnet — es
  gibt keinen Scheduler-Auftrag, der im Hintergrund aufräumt (Begründung:
  „Wie eine Lobby entsteht und wieder verschwindet" oben).
- **Barrierefreiheit (D.12) ist für die Platzleiste und die Übersicht in
  den Umsetzungsstücken D4c/D4d nicht umgesetzt** — ausdrückliche Ansage
  des Auftraggebers (2026-09-11). Weder die Platzleiste noch der
  Live-Betrieb tragen eine Live-Region, ARIA-Kennzeichnung über das aus
  D4b vorhandene Maß hinaus, Fokusrahmen-Absicherung oder
  `prefers-reduced-motion`-Behandlung. Das bereits in D4a/D4b gebaute
  Markup (Übersichtsseite) bleibt unverändert stehen.

## Was die drei Tische hier einhängt

**Phase D5 ist seit dem 2026-09-11 vollständig eingearbeitet** — alle drei
Tische hängen in der Lobby. **Kein Tisch importiert etwas aus
`casino_lobby`.** Sie reden ausschließlich über vier DOM-Ereignisse, die
`lobby-live.js` als das **alleinige** Tor zum Server sendet bzw. entgegennimmt
(kein `fetch()` in einer der drei Tisch-Extensions):

| Ereignis | Richtung | Inhalt |
|---|---|---|
| `casino:lobby-stand` | hinaus, bei jeder geänderten Abfrage | der vollständige Stand: Zustand, Runde, Plätze, Restzeit, Saat |
| `casino:lobby-runde` | hinaus, beim Start einer Runde | `{saat, zahl, runde, melder, plaetze, mein}` |
| `casino:lobby-fertig` | **herein**, vom Tisch | `{ergebnis}` — meldet das lokal gerechnete Rundenergebnis |
| `casino:lobby-handlung` | **herein**, vom Tisch | `{art, daten}` — Einsatz, Shooter-Wechsel, Zug; wird unverändert an den Server weitergereicht |

Der Grund für die strikte Ereignis-Grenze statt eines Imports: eine einzige
Import-Zeile in einer Tisch-Extension hinterließe auch bei
**ausgeschaltetem** QR-Modus eine Lobby-Spur im ausgelieferten HTML — und
genau das widerspräche der geprüften Zusage weiter unten. Umgesetzt in vier
Schritten:

- **D5-1** — der Server einer Lobby-Runde: `LobbyService::stand()` liefert
  Saat und Ergebnis, `RoundClock` erlaubt den Alleinstart.
- **D5-2** — die Brücke (`lobby-live.js` sendet/empfängt alle vier Ereignisse)
  und die Platzleiste (Einsatz, Ergebnis, Shooter- und Zugmarke je Platz).
- **D5-3** — Roulette und Craps hängen an der Brücke: je ein Adapter
  (`lobby-roulette.js`, `lobby-craps.js`), ein dritter, wiederholbarer
  Geberzustand, gespeist aus der Saat dieser Extension
  (`saatZuZahl()`, wortgleich in `lobby-seed.js` und den beiden `rng.js`).
- **D5-4** — Blackjack hängt an derselben Brücke: zusätzlich ein
  Zugprotokoll (`tx_casinolobby_lobby.moves`), weil dort eine Entscheidung
  die Karten der anderen Plätze verschiebt, und eine Geberreserve am
  Schlittenende, damit ein früh stehender Platz nicht einen anderen Geber
  bekommt als ein spät stehender — Einzelheiten in `blackjack/README.md`.

Die Spalten `shooter_no` (Craps-Warteliste) und `joined_round` (Nachzügler
setzen erst ab der nächsten Runde mit) sind seit D5-2/D5-3 in Gebrauch. Die
Tabelle `tx_casinolobby_bet` wird weiterhin **nicht** gelesen oder
geschrieben — die Einsätze der drei Tische bleiben Sache der jeweiligen
Tisch-Extension und ihrer eigenen Buchführung über `casino_account`.

## Stand

Version 0.5.0 (alpha). **Phase D5 ist mit allen vier Umsetzungsstücken
(D5-1 bis D5-4) vollständig eingearbeitet — alle drei Tische (Roulette,
Craps, Blackjack) hängen in der Lobby.**

Die Lobby ist damit vollständig: Datenmodell, Verwaltung (Eröffnen,
Beitreten, Verlassen, Aufräumen), die beiden Frontend-Schichten (Endpunkt
und Weiche), die Übersichtsseite, die Platzleiste am Tisch mit gemeinsamer
Saat, Setzuhr und Zeitüberschreitung, und seit D5 die vollständige
Verdrahtung der drei Tische über die vier DOM-Ereignisse (siehe „Was die
drei Tische hier einhängt").

**Die Geldkette ist live bewiesen**, an allen drei Tischen, in echten
Browsern, je zweimal: der Einsatz verlässt den Gerätekredit beim Ablegen
des Chips, wer mitten in der Runde geht, verliert ihn, und der Gesamtstand
stimmt am Ende zentgenau mit dem Server überein. Keine Buchung läuft an
`casino_account` vorbei — die Lobby bucht nach wie vor **nicht selbst**
(siehe „Grenzen, offen gelegt").

**Ohne eingeschalteten QR-Modus gibt es die Lobby nicht** — kein Endpunkt,
keine Übersicht, kein Zustandsblock, keine Zeile im HTML. Das ist geprüft
und nicht bloß beabsichtigt.
