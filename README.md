# Casino Kunterbunt

**Version 0.5.0 — alpha.** Frühe Entwicklungsfassung, nichts ist stabil.

Quelltext: <https://github.com/phomo17/casino-kunterbunt_t3v13classic>

## Worum es geht

Casino Kunterbunt wird ein **Social Deduction Game** — ein Gesellschaftsspiel,
bei dem eine Gruppe gemeinsam herausfinden muss, wer unter ihnen heimlich zur
Gegenseite gehört. Es ist von *Blood on the Clocktower* **inspiriert**, aber
keine Nachbildung: Es wird am Ende nicht nach dem üblichen BotC- oder Werwolf-Prinzip
funktionieren. Gespielt wird außerdem nicht in einem Dorf, sondern in einem
**Casino**.

## Was heute schon da ist — und was noch fehlt

**Das Spiel selbst gibt es noch nicht.** Es existieren bisher keine ausformulierten Rollen, 
keine Regeln, kein Rundenablauf, keine Mitspielendenverwaltung. Wer das
Projekt heute startet, sieht deshalb ein Casino und kein Gesellschaftsspiel —
das ist so gewollt und nicht der Endzustand.

Gebaut ist die Welt, in der das Spiel stattfinden wird:

| | Stand |
|---|---|
| **Vegas-Saal** als Startseite mit Leuchtreklame, Automaten- und Tischreihen und Kasse | fertig |

**Vier Automaten:**

| | Stand |
|---|---|
| **Reel Slot** — klassischer Drei-Walzen-Automat mit Risiko-Leiter, Auto-Modus und Klang | fertig |
| **Video Slot** — Fünf-Walzen-Automat mit fünf Gewinnlinien, Scatter, Risiko-Leiter, Auto-Modus und Klang | fertig |
| **Coin Pusher** — Münzschieber mit eigener 2D-Physik | **eingefroren.** Auf ausdrücklichen Wunsch angehalten, bevor die Maßordnung fertig eingestellt war; der vorgesehene Rückbau ist auf Ansage übersprungen. **Drei der sechs Prüfskripte sind seit dem 2026-09-04 rot** (`verify-view.mjs`, `verify-physics.mjs`, `verify-payout.mjs`): der Physikkern trägt eine Münze aus dem Feld, und das Gerät schüttet rund doppelt so viel aus wie es einnimmt. Vollständig beschrieben in der README dieser Extension, Abschnitt „Der offene Befund vom 2026-09-04" |
| **FruitRisk** — breiter Fruchtautomat mit sechs Walzen, 30 Gewinnlinien, festem Einsatz, Gewinn in jeder Runde und drei Risikospielen | fertig |

**Vier Tische:**

| | Stand |
|---|---|
| **Roulette** — amerikanisches Rad mit doppelter Null auf **einer** Fläche mit Holzrahmen ringsum, echter Kugelphysik, Tableau nach Bildvorlage (Pfeilfelder für `0`/`00`, farbige Zahlenovale, 159 Felder) und Auszahlung | fertig |
| **Mustertisch** — kein eigenes Spiel, sondern die Vorlage der Gattung Tisch (Chips, Setzfläche, Bedienleiste, Buy-in), Beleg dafür, dass ein neuer Tisch mit denselben Bausteinen auskommt | fertig als Vorlage |
| **Blackjack** — Kartenschlitten, Mischverfahren, Regelwerk, Rundenlogik, Tuch mit selbst gezeichneten Karten und vollständige Bedienung | fertig |
| **Craps** — zwei selbst geworfene Würfel mit echter Physik auf **einer** Fläche mit Banden, dazu 48 Wettfelder nach einer Bildvorlage (Aufschriften englisch, Vorlesetext deutsch), Point und Puck, Odds nach der Staffel 3-4-5×, Place-Wetten und Auszahlung | fertig |

| | Stand |
|---|---|
| **Konten** — Backend-Reiter „Casino" mit den Modulen „Spielende" und „QR-Modus", automatische Kennung, persönlicher QR-Code | fertig |
| **Anmeldung im Frontend** — ist der QR-Modus an, führt jede Adresse zur Anmeldung: Kennung abtippen, Bild hochladen oder mit der Kamera scannen | fertig |
| **Serverseitiges Guthaben** — die drei Beträge (Kasse, Gerätekredit, Gewinnspeicher) liegen auf dem Server, nicht mehr im Browser; jede Änderung wird sofort gebucht | fertig |
| **Lobby** — mehrere Personen an einem Tisch, gemeinsame Runde und gemeinsame Setzuhr, an allen drei Tischen (Roulette, Craps, Blackjack) mit Shooter-Warteliste bzw. Plätzen und Zugreihenfolge, je nach Spiel | fertig |
| Weitere Geräte | geplant |
| Rollen, Regeln, Rundenablauf des Gesellschaftsspiels | geplant |

## Wie es gebaut ist

TYPO3 13.4 in einer klassischen (nicht Composer-basierten) Installation,
lokal in DDEV. Das Frontend hat bewusst enge Grenzen:

- **kein Bauschritt** — kein Bundler, kein Transpiler, kein Sass
- **keine Fremdbibliothek** — kein Framework, kein fremdes JavaScript
- **keine externen Dateien** — kein Bild, keine Schriftdatei, keine Einbindung
  von außen

Diese drei Grenzen gelten für das **Frontend** — dort stimmen sie
uneingeschränkt weiter. Im **Backend** benutzt `casino_account` für die
persönlichen QR-Codes der Spielenden die Bibliothek `bacon/bacon-qr-code`.
Das ist **keine neue Abhängigkeit**: TYPO3 13.4 bringt sie selbst als harte
Voraussetzung mit und benutzt sie für den QR-Code der eigenen
Zwei-Faktor-Anmeldung (`typo3_src/vendor/bacon/bacon-qr-code/`). Die
`composer.json` dieses Projekts bleibt davon unberührt.

Alles Sichtbare entsteht im Browser: die Gehäuse aus CSS und eingebettetem
SVG, die Anzeigen aus Custom Properties, die Geräusche aus der
Web-Audio-Schnittstelle. Ausgeliefert werden ES-Module direkt, über die
Import-Map von TYPO3.

Jede Seite liefert außerdem strukturierte Daten (JSON-LD), eine
Meta-Beschreibung und einen Eintrag in `llms.txt` aus — geräteneutral über
einen gemeinsamen Baustein in `casino_startpage`, damit ein neues Gerät sich
auch hier nur anmelden statt selbst etwas bauen muss.

## Installation

Gebraucht werden **DDEV** und **Docker**. Alles Weitere läuft im Container —
auf dem eigenen Rechner müssen weder PHP noch eine Datenbank installiert sein.

### 1. Repository holen und Container starten

```bash
git clone https://github.com/phomo17/casino-kunterbunt_t3v13classic.git casino-kunterbunt
cd casino-kunterbunt
ddev start
```

Die DDEV-Konfiguration liegt im Repository (`.ddev/config.yaml`): PHP 8.4,
nginx-fpm, MariaDB 11.8, Dokumentwurzel ist der Projektstamm.

### 2. TYPO3-Kern nachladen

Der Kern liegt bewusst **nicht** im Repository — er sind über 130 MB fremder
Code. Diese Installation ist *klassisch*, also nicht Composer-basiert: Der Kern
wird als Quellpaket entpackt und über zwei Symlinks eingehängt.

```bash
ddev exec 'curl -fSL -o typo3_src.tar.gz https://get.typo3.org/13.4.33   && tar -xzf typo3_src.tar.gz   && mv typo3_src-13.4.33 typo3_src   && rm typo3_src.tar.gz   && ln -s typo3_src/index.php index.php   && ln -s typo3_src/typo3 typo3'
```

Eine neuere 13.4er Fassung geht auch; dann beide Stellen mit der Versionsnummer
anpassen. Ein Sprung auf 14 ist **nicht** getestet.

### 3. TYPO3 einrichten

```bash
touch FIRST_INSTALL
ddev launch
```

`FIRST_INSTALL` ist eine leere Datei, die TYPO3 als Erlaubnis versteht, den
Installationsassistenten zu öffnen; er löscht sie danach selbst wieder. Im
Assistenten die Datenbankdaten von DDEV eintragen — Benutzer `db`, Passwort
`db`, Datenbank `db`, Server **`db`** (nicht `localhost`, die Datenbank läuft in
einem eigenen Container). Beim Schritt „Was möchten Sie tun?" **„Leere
Startseite"** wählen.

### 4. Die zehn Extensions aktivieren

```bash
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_startpage
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_account
ddev exec php typo3/sysext/core/bin/typo3 extension:activate reel_slot
ddev exec php typo3/sysext/core/bin/typo3 extension:activate video_slot
ddev exec php typo3/sysext/core/bin/typo3 extension:activate coin_pusher
ddev exec php typo3/sysext/core/bin/typo3 extension:activate fruit_risk
ddev exec php typo3/sysext/core/bin/typo3 extension:activate roulette
ddev exec php typo3/sysext/core/bin/typo3 extension:activate blackjack
ddev exec php typo3/sysext/core/bin/typo3 extension:activate craps
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_lobby
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Wichtig: `casino_startpage` **zuerst** — alle acht übrigen Extensions bauen
darauf auf, `casino_account` genauso wie die sieben Geräte- und
Tisch-Extensions. Untereinander haben die acht keine Reihenfolge.

### 5. Seiten und Inhalte anlegen

**Das ist der Schritt, der Handarbeit verlangt.** Der Seitenbaum und die
Inhaltselemente stehen in der Datenbank, und eine Datenbank gehört nicht ins
Repository — sie enthielte Benutzerkonten und Passwort-Hashes. Nach der
Installation steht deshalb ein leeres TYPO3 da. Anzulegen im Backend:

| Seite | Inhalt |
|---|---|
| **Saal** (Wurzelseite, Backend-Layout „Startseite (Spielsaal)") | je ein Inhaltselement **„Casino-Automat"** pro Gerät bzw. Tisch (Reel Slot, Video Slot, Coin Pusher, FruitRisk, Roulette, Mustertisch, Blackjack, Craps), im Feld *Automat* den jeweiligen Eintrag und im Feld *Ziel* seine Spielseite wählen |
| **Reel Slot** (Unterseite) | ein Inhaltselement **„Reel Slot"** |
| **Video Slot** (Unterseite) | ein Inhaltselement **„Video Slot"** |
| **Coin Pusher** (Unterseite) | ein Inhaltselement **„Coin Pusher"** |
| **Mustertisch (Testdaten C1-D)** (Unterseite) | ein Inhaltselement **„Mustertisch"** |
| **Roulette** (Unterseite) | ein Inhaltselement **„Roulette"** |
| **FruitRisk** (Unterseite) | ein Inhaltselement **„FruitRisk"** |
| **Blackjack** (Unterseite) | ein Inhaltselement **„Blackjack"** |
| **Craps** (Unterseite) | ein Inhaltselement **„Craps"** |

Alle neun Inhaltselement-Typen stehen im Backend unter der Gruppe
**„Casino Kunterbunt"**. Die Geräte- und Tisch-Elemente haben keine
Einstellungen — alles, was ein Gerät oder ein Tisch braucht, bringt es
selbst mit.

Anschließend die mitgelieferte Site-Konfiguration
(`typo3conf/sites/casino-kunterbunt/`) im Backend unter *Site-Verwaltung*
öffnen und die Wurzelseite sowie die Basis-URL auf die eigene Installation
anpassen — hinterlegt ist `https://casino-kunterbunt.ddev.site/`.

### 6. Prüfen

Alle Prüfskripte aller zehn Extensions auf einmal:

```bash
ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/pruefstand.mjs
```

Er findet die Skripte selbst, lässt aus, was im gerade eingestellten
QR-Modus nichts beweisen kann, und zählt **drei** Dinge statt eines:
erfüllte Zusagen, Fehler **und Lücken** — jede Zeile, in der ein Skript
„übersprungen" meldet. Ein Skript ohne Fehler, das seinen wichtigsten Block
übersprungen hat, heißt hier „grün mit Lücke" und steht einzeln im
Schlussstand. Das ist der Unterschied zwischen „der Prüfstand ist grün" und
„es wurde alles geprüft".

Jede Geräte- und Tisch-Extension bringt außerdem ihre eigenen Prüfskripte
einzeln mit, die ohne Abhängigkeiten auskommen, zum Beispiel:

```bash
ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-payout.mjs
ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-bets.mjs
ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-wagers.mjs
```

Je nach Extension zählen sie alle möglichen Stellungen vollständig aus oder
spielen eine große Zahl an Runden durch, und enden nur dann mit Rückgabewert
0, wenn das zugesagte Verhalten oder die zugesagte Auszahlungsquote
zutrifft. Welche Skripte es je Extension gibt und was sie im Einzelnen
nachweisen, steht im Abschnitt „Prüfskripte" ihrer eigenen `README.md`.

## Aufbau

| Extension | Aufgabe |
|---|---|
| `typo3conf/ext/casino_startpage` | Site Package: der Saal, die Design-Tokens, die geteilten Bausteine (Kasse, Gerätekredit, Klang, Risiko-Leiter, Chips, Setzfläche, Rundenablauf, Buy-in) und die Registry, bei der sich jedes Gerät und jeder Tisch anmeldet. Enthält außerdem den Mustertisch als Vorlage der Gattung Tisch |
| `typo3conf/ext/casino_account` | Konten der Spielenden: Backend-Reiter „Casino" mit den Modulen „Spielende" und „QR-Modus", automatische Kennung, persönlicher QR-Code (Ansehen, Herunterladen, Drucken). Dazu die Anmeldung im Frontend, der Zugriffsschutz und der Buchungsendpunkt, über den das Guthaben serverseitig geführt wird. Liefert kein Inhaltselement, aber bei eingeschaltetem QR-Modus eigene Antworten (Anmeldeseite, Kontenleiste) |
| `typo3conf/ext/reel_slot` | der Drei-Walzen-Automat |
| `typo3conf/ext/video_slot` | der Fünf-Walzen-Automat |
| `typo3conf/ext/coin_pusher` | der Münzschieber — eingefroren, wird später zurückgebaut |
| `typo3conf/ext/fruit_risk` | der breite Fruchtautomat mit sechs Walzen und drei Risikospielen |
| `typo3conf/ext/roulette` | der Roulette-Tisch |
| `typo3conf/ext/blackjack` | der Blackjack-Tisch |
| `typo3conf/ext/craps` | der Craps-Tisch — Würfelphysik, Tuch, Wetten und Auszahlung |
| `typo3conf/ext/casino_lobby` | das Lobby-System: mehrere Personen an einem Tisch, gemeinsame Runde, gemeinsame Setzuhr und dieselbe Saat für alle. Ohne eingeschalteten QR-Modus vollständig unsichtbar |

Ein Gerät oder ein Tisch ist ein eigenständiges Inhaltselement. Das Site
Package kennt keinen einzelnen davon und muss nicht geändert werden, wenn
ein weiteres dazukommt. `casino_account` ist die Ausnahme: Es liefert kein
Inhaltselement und keine Spielseite, sondern ausschließlich ein Backend-Modul.

Jede Extension hat ihre eigene `README.md` mit den Einzelheiten.

## Wie KI an diesem Projekt beteiligt ist

**Das Konzept ist meins.** Was Casino Kunterbunt werden soll, wie die Geräte sich anfühlen
müssen, welche Regeln gelten, was ausdrücklich nicht gebaut wird — jede inhaltliche
Festlegung stammt von mir.

**Der Code und die Gestaltung entstehen mit Claude** (Anthropic), über Claude Code. Das gilt
für die Extensions, die Fluid-Vorlagen, das CSS, die SVG-Zeichnungen der Gehäuse und
Symbole, die Klangerzeugung und die Prüfskripte.

**Nichts davon geht ungesehen ins Repository.** Ich sehe jede Änderung durch, bevor ich sie
committe und pushe — das Veröffentlichen mache ich von Hand, es gibt keine Automatik, die
das für mich erledigt.

**Bei der Gestaltung wird ausdrücklich auf Urheber- und Markenrecht geprüft.** Für jedes
neue Gerät läuft eine eigene Recherche, bevor daraus etwas veröffentlicht wird: Woher
stammen die Symbole, ist eine Form geschützt, kollidiert ein Name mit einer eingetragenen
Marke, steckt irgendwo fremdes Material im Code. Gegebenfalls werden die betroffenen
Stellen angepasst, sodass kein Urheber- und Markenrecht verletzt wird.

## Versionierung

Es gibt zwei Ebenen, die getrennt gezählt werden:

- **Das Projekt** — die Version oben in dieser Datei. Sie beschreibt den Stand
  des Spiels als Ganzes.
- **Die einzelnen Extensions** — je eine Version in ihrer `ext_emconf.php`.

Zurzeit stehen alle zehn Extensions wie das Projekt auf **0.5.0** im
Zustand **alpha**. Solange die Spielregeln des Gesellschaftsspiels noch nicht
existieren, sagt eine höhere Zahl ohnehin wenig über Reife aus — sie zählt
bislang nur mit, wie viele Geräte und Tische dazugekommen sind.

## Nicht im Repository

Nachladbar oder erzeugt, deshalb ausgeschlossen: der TYPO3-Kern
(`typo3_src/`) samt der beiden Symlinks `index.php` und `typo3`,
`node_modules/`, `typo3temp/`, `fileadmin/` sowie die erzeugten Dateien unter
`typo3conf/` (`autoload/`, `l10n/`, `PackageStates.php`).

Ausgeschlossen ist außerdem `typo3conf/system/` — dort liegen
Zugangsdaten und der `encryptionKey` der lokalen Installation.

Von `.ddev/` kommt nur `config.yaml` mit, damit sich die Umgebung
nachbauen lässt; der Rest ist erzeugt und enthält unter anderem die
TLS-Schlüssel der lokalen Installation.

Nicht im Repository ist auch die **Datenbank** und damit der Seitenbaum —
siehe Schritt 5 der Installation.

Ebenfalls ausgeschlossen sind die `build-*-structure.php`-Wegwerfskripte im
Projektstamm, mit denen Seite und Inhaltselemente der einzelnen Geräte und
Tische einmalig angelegt wurden: einmal gelaufen, nicht wiederverwendbar und
kein Teil des Aufbauwegs aus Schritt 5.

Nicht im Repository sind außerdem die Arbeitsdateien der Entwicklung selbst —
sie sind Werkzeug, nicht Teil der laufenden Anwendung: `Plans/` und
`Reviews/` (die Ausgabedateien der planenden und prüfenden Agenten), `Tests/`
und `test.txt` (Testpläne und Testprotokolle) sowie die Begleitdateien im
Projektstamm `APPROVAL.md`, `CONCEPT.md`, `DECISIONS.md`, `DESIGNBRIEF.md`,
`MEMORY.md`, `OPINION.txt` und `RESEARCH.md`.

## Rechtliches

Ein Spaßprojekt mit Spielgeld: kein Einsatz, keine Auszahlung, keine
Anmeldung, kein Glücksspielangebot. Gerätenamen, Gehäuse, Symbole und
Gewinnpläne sind eigene Entwürfe und bilden kein vorhandenes Produkt nach.

## Lizenz

Copyright (C) 2026 Phomo17

**GNU Affero General Public License, Version 3 oder später** (AGPL-3.0-or-later).
Der vollständige Text steht in [`LICENSE`](LICENSE).
Der Quelltext, den Abschnitt 13 verlangt, liegt unter <https://github.com/phomo17/casino-kunterbunt_t3v13classic>
und wird von der laufenden Anwendung selbst im Saal verlinkt.

Was das bedeutet:

- **Du darfst** dieses Projekt herunterladen, benutzen, verändern, weitergeben
  und in eigene Projekte einbauen — auch kommerziell.
- **Du musst** dabei die Urheberschaft nennen und die Lizenz mitliefern.
- **Du musst** deine Änderungen ebenfalls unter der AGPL veröffentlichen, wenn
  du sie weitergibst — **und auch dann, wenn du eine geänderte Fassung nur als
  Website betreibst.** Genau darin unterscheidet sich die AGPL von der GPL: Wer
  dieses Projekt umbaut und ins Netz stellt, muss seinen Quelltext denjenigen
  zugänglich machen, die die Seite benutzen.
