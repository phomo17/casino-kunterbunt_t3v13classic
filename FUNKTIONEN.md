# Funktionsverzeichnis — Casino Kunterbunt

**Was hier steht:** jede Funktion, die ein Mensch an diesem Haus bedienen kann — im
Frontend am Gerät oder Tisch, und im Backend als Admin. Zu jeder steht, **was sie tut,
wie sie ausgelöst wird, was danach beobachtbar anders ist, was vorher gelten muss, und
woran man von außen sieht, dass sie geschehen ist.**

**Wozu:** Grundlage jeder Prüfung. Die Zeile „Beobachtbar an" entscheidet, ob ein Agent
eine Funktion selbständig prüfen kann oder ob ein Mensch hinsehen muss.

**Was hier NICHT steht:** Prüfskripte und Entwicklerwerkzeuge — die sind ihr eigener
Nachweis. Und der **Coin Pusher**: abgeschrieben und deaktiviert, seine Dateien liegen
unverändert im Baum, aber er wird nicht mehr geprüft.

**Wie es entstanden ist:** neun Agenten, je einer pro Extension, haben am 2026-09-11
gleichzeitig den Quelltext gelesen — mit dem ausdrücklichen Auftrag zu **inventarisieren,
nicht zu urteilen**. Wo Quelltext und README auseinandergingen, steht beides da. Was
einem Agenten auffiel, ohne Inventurpunkt zu sein, steht je Extension unter
„Beobachtungen, nicht bewertet" — **unbewertet und nicht nachverfolgt.**

**Stand:** 2026-09-11 · 676 Funktionen in neun Extensions

| Extension | Funktionen | Wofür |
|---|---:|---|
| casino_account | 94 | QR-Konto, Torseite, Guthaben, Buchungsendpunkt, zwei Backend-Module |
| casino_startpage | 83 | Saal, Registry und alle geteilten Bausteine (Kasse, Klang, Risiko-Leiter, Tisch) |
| casino_lobby | 80 | Gemeinsames Spielen: Plätze, Rundentakt, Zeitregeln, Endpunkt |
| video_slot | 84 | Automat mit Gewinnlinien |
| craps | 71 | Würfeltisch mit 20 Wettarten auf 48 Feldern |
| fruit_risk | 68 | Automat mit drei Risiko-Leitern |
| roulette | 67 | Kessel und Tuch mit zehn Einsatzarten |
| reel_slot | 65 | Einarmiger Bandit mit Hebel |
| blackjack | 64 | Kartentisch mit Schlitten und Geberregeln |

---


<!-- ===================== casino_account ===================== -->

# Funktionsinventur: `casino_account` (Konten und QR-Codes)

Diese Extension verwaltet die Konten der Spielenden: sie vergibt jedem Menschen eine
43-stellige Kennung samt persönlichem QR-Code, trägt den Schalter „QR-Modus", die
Torseite mit der Anmeldung, das serverseitige Guthaben aus drei Geldwerten (Kasse,
Gerätekredit, Gewinnspeicher), den Buchungsendpunkt, die Kontenleiste im Frontend und
zwei Backend-Module („Spielende", „QR-Modus").

Fast alles hier hängt am QR-Schalter; bei jeder Funktion steht deshalb, in welcher
Schalterstellung es sie gibt.

---

## Der Buchungsendpunkt — Rahmen

### F-ACCOUNT-01  Buchungsadresse `/casino-konto/buchung`
- **Was:** Nimmt einen einzelnen Geldvorgang eines Geräts entgegen, rechnet ihn
  serverseitig aus und gibt den neuen Stand aller drei Geldwerte zurück.
- **Wie ausgelöst:** `POST` auf `/casino-konto/buchung` mit `Content-Type:
  application/json` und dem Rumpf `{kunde, nummer, art, betrag?}`.
- **Soll-Ergebnis:** JSON-Antwort `{ok, grund?, kasse, geraet, gewinn, gesamt, bewegt,
  gekappt, doppelt}`; bei `ok: true` stehen die drei Geldspalten des Spielenden in der
  Datenbank auf den zurückgegebenen Werten.
- **Vorbedingung:** QR-Modus AN; gültige Frontend-Sitzung; `art` aus
  `BookingService::ARTEN`; `kunde` 1–32 Zeichen `[A-Za-z0-9_-]`; `nummer` >= 1.
- **Beobachtbar an:** HTTP-Antwort 200 mit dem JSON-Objekt oben; Spalten
  `balance_cash`, `balance_machine`, `balance_win`, `booking_seq`, `booking_client` in
  `tx_casinoaccount_player`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:53-113`,
  `Classes/Service/BookingService.php:66-140`.

### F-ACCOUNT-02  Standabfrage `/casino-konto/stand`
- **Was:** Liest die drei Geldwerte der angemeldeten Person, ohne etwas zu buchen.
- **Wie ausgelöst:** `GET` auf `/casino-konto/stand`.
- **Soll-Ergebnis:** JSON mit `ok: true` und den aktuellen Werten `kasse`, `geraet`,
  `gewinn`, `gesamt`; keine Spalte in der Datenbank ändert sich.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** HTTP 200, JSON-Feld `gesamt` = `kasse + geraet + gewinn`;
  `booking_seq` bleibt unverändert.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:81-83`,
  `Classes/Service/BookingService.php:149-169`.

### F-ACCOUNT-03  Gerätespeicher `/casino-konto/feld`
- **Was:** Schreibt einen maschinellen Speicherstand eines Geräts (Coin Pusher) —
  ausdrücklich kein Geld, keine Buchungsnummer.
- **Wie ausgelöst:** `POST` auf `/casino-konto/feld` mit JSON `{ "stände": {
  "<schlüssel>": "<text>" } }`.
- **Soll-Ergebnis:** JSON `{ok: true}`; je Schlüssel eine Zeile in
  `tx_casinoaccount_coinfield` mit `player`, `store_key`, `payload`.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung; höchstens 4 Schlüssel je Aufruf;
  Schlüssel nach `[A-Za-z0-9._-]{1,191}`; Text höchstens `CoinFieldRepository::MAX_LAENGE`.
- **Beobachtbar an:** HTTP 200 `{"ok":true}`; Tabellenzeile in
  `tx_casinoaccount_coinfield`. Verstöße: 400 mit `grund` `unbrauchbar`, `schluessel`
  oder `zu_lang`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:99-101,190-213`.

### F-ACCOUNT-04  Abweisung ohne Sitzung (JSON statt Torseite)
- **Was:** Ein Aufruf der drei Adressen ohne angemeldete Person bekommt eine saubere
  JSON-Absage statt der Torseite als HTML.
- **Wie ausgelöst:** Aufruf einer der drei Adressen ohne gültige Frontend-Sitzung.
- **Soll-Ergebnis:** HTTP 401 mit `{"ok":false,"grund":"keine_sitzung"}`; das Gerät im
  Browser geht nicht in die Sperranzeige, weil die Antwort lesbar ist.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** HTTP-Status 401, JSON-Feld `grund` = `keine_sitzung`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:71-74`,
  `Configuration/RequestMiddlewares.php` (Schicht vor `qr-gate`).

### F-ACCOUNT-05  Die drei Adressen gibt es nur bei QR-Modus AN
- **Was:** Bei ausgeschaltetem Schalter beantwortet der Endpunkt gar nichts, die
  Adressen laufen in die gewöhnliche Seitenauflösung.
- **Wie ausgelöst:** Aufruf einer der drei Adressen bei QR-Modus AUS.
- **Soll-Ergebnis:** Die gewöhnliche 404-Seite des Hauses statt einer JSON-Antwort.
- **Vorbedingung:** QR-Modus AUS.
- **Beobachtbar an:** HTTP-Status 404 und HTML statt `application/json`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:60-62`.

### F-ACCOUNT-06  Nur JSON wird angenommen
- **Was:** Ein Buchungs- oder Feldaufruf ohne JSON-Inhaltstyp wird abgewiesen — zugleich
  der Schutz gegen ein untergeschobenes Formular einer fremden Seite.
- **Wie ausgelöst:** `POST` ohne `Content-Type: application/json`, oder mit einem
  Rumpf, der kein lesbares JSON-Objekt ist.
- **Soll-Ergebnis:** HTTP 415 `{"ok":false,"grund":"inhaltstyp"}` bzw. HTTP 400
  `{"ok":false,"grund":"unlesbar"}`; nichts wird gebucht.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** HTTP-Status 415 bzw. 400 und das jeweilige `grund`-Feld.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:91-97`.

### F-ACCOUNT-07  Falsche Methode wird abgewiesen
- **Was:** `/stand` nimmt nur `GET`, `/buchung` und `/feld` nur `POST`.
- **Wie ausgelöst:** Aufruf mit der jeweils anderen Methode.
- **Soll-Ergebnis:** HTTP 405 `{"ok":false,"grund":"methode"}`.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** HTTP-Status 405, JSON-Feld `grund` = `methode`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:76-79`.

### F-ACCOUNT-08  Fremde Spieler-Kennung im Aufruf wird ignoriert
- **Was:** Wer im Aufruf die Kennung einer anderen Person mitschickt, bucht trotzdem nur
  auf sein eigenes Konto — der Endpunkt liest keine Kennung aus der Anfrage.
- **Wie ausgelöst:** Buchungsaufruf mit zusätzlichem Feld für eine fremde Kennung.
- **Soll-Ergebnis:** Gebucht wird auf das Konto der laufenden Sitzung; das fremde Konto
  bleibt unverändert.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** Die Geldspalten des fremden Spielenden in
  `tx_casinoaccount_player` ändern sich nicht; die eigenen schon.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:68-74,123-142`.

### F-ACCOUNT-09  Doppelte Buchung wird erkannt
- **Was:** Schickt derselbe Browser dieselbe oder eine ältere Buchungsnummer noch
  einmal, bucht der Server kein zweites Mal.
- **Wie ausgelöst:** Zweiter `POST` mit gleichem `kunde` und `nummer` <= der zuletzt
  verarbeiteten Nummer.
- **Soll-Ergebnis:** JSON mit `doppelt: true` und unveränderten Beträgen; `bewegt: 0`.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung; vorangegangene Buchung desselben
  `kunde`.
- **Beobachtbar an:** JSON-Feld `doppelt` = `true`; `balance_*` unverändert.
- **Umgesetzt in:** `Classes/Service/BookingService.php:93-96`.

### F-ACCOUNT-10  Zwei Registerkarten zählen unabhängig
- **Was:** Ein zweiter Browser bzw. eine zweite Registerkarte derselben Person zählt
  ihre Buchungsnummern für sich; ihre Buchung wird nie fälschlich als doppelt verworfen.
- **Wie ausgelöst:** Buchung mit einer anderen `kunde`-Kennung als der zuletzt
  gespeicherten.
- **Soll-Ergebnis:** Die Buchung wird ausgeführt, `doppelt: false`.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** Spalte `booking_client` in `tx_casinoaccount_player` wechselt auf
  die neue Kennung; JSON-Feld `doppelt` = `false`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:93`,
  `Classes/Middleware/BookingEndpoint.php:173-179`.

### F-ACCOUNT-11  Unbekannter Vorgang / unbrauchbarer Aufruf
- **Was:** Eine Buchungsart, die nicht in der Liste steht, oder eine fehlende
  Browserkennung/Nummer wird abgelehnt.
- **Wie ausgelöst:** `POST` mit `art` außerhalb von `BookingService::ARTEN`, mit
  `nummer < 1` oder mit unzulässigem `kunde`.
- **Soll-Ergebnis:** HTTP 400 `{"ok":false,"grund":"unbrauchbar"}`; nichts wird gebucht.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** HTTP-Status 400, JSON-Feld `grund` = `unbrauchbar`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:109-111`,
  `Classes/Service/BookingService.php:260` (`unbekannte_art`).

### F-ACCOUNT-12  Ablehnung ist kein Fehler
- **Was:** Eine Buchung, die der Server aus Spielgründen nicht ausführt (zu wenig Geld,
  kein Admin), kommt als normale Antwort zurück, nicht als Serverfehler.
- **Wie ausgelöst:** Jeder abbuchende Vorgang über dem verfügbaren Betrag, oder ein
  Admin-Vorgang durch eine Person ohne Admin-Recht.
- **Soll-Ergebnis:** HTTP 200 mit `ok: false` und einem `grund`; die Sperranzeige der
  Kontenleiste erscheint dabei ausdrücklich **nicht**.
- **Vorbedingung:** QR-Modus AN; gültige Sitzung.
- **Beobachtbar an:** HTTP-Status 200 zusammen mit JSON-Feld `ok` = `false`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:167-170`,
  `Classes/Service/BookingService.php:324-337`.

### F-ACCOUNT-13  Konto unbekannt
- **Was:** Gehört die Sitzung zu einem gelöschten oder versteckten Konto, antwortet der
  Dienst mit Nullbeträgen statt zu buchen.
- **Wie ausgelöst:** Buchung oder Standabfrage für einen Spielenden mit `deleted = 1`
  oder `hidden = 1`.
- **Soll-Ergebnis:** `{ok: false, grund: 'unbekannt', kasse: 0, geraet: 0, gewinn: 0}`.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** JSON-Feld `grund` = `unbekannt`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:79-82,159-161`.

### F-ACCOUNT-14  Antworten werden nicht zwischengespeichert
- **Was:** Jede Antwort des Endpunkts trägt die Anweisung, sie nicht abzulegen.
- **Wie ausgelöst:** Jeder Aufruf der drei Adressen.
- **Soll-Ergebnis:** Ein zweiter Aufruf bekommt immer den echten aktuellen Stand.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Antwortkopf `Cache-Control: no-store, private`.
- **Umgesetzt in:** `Classes/Middleware/BookingEndpoint.php:169`.

---

## Die elf Buchungsarten

Alle elf: QR-Modus AN, gültige Sitzung, Aufruf über `POST /casino-konto/buchung`.
Kein Betrag kann unter 0 fallen — abbuchende Vorgänge weisen ab statt zu kappen;
gutschreibende kappen bei `MAX = 999999999` und melden das über `gekappt: true`.
Beobachtbar ist jede Art an den drei JSON-Feldern `kasse`/`geraet`/`gewinn` der Antwort
und an den Spalten `balance_cash`/`balance_machine`/`balance_win`.

### F-ACCOUNT-15  `uebernahme` — Platz übernehmen
- **Was:** Räumt Gerätekredit **und** Gewinnspeicher vollständig zurück in die Kasse —
  der einzige Weg, einen nach einem Absturz stehen gebliebenen offenen Gewinn wieder
  einzusammeln.
- **Wie ausgelöst:** `art: 'uebernahme'` (ohne Betrag); gerufen beim Öffnen eines Geräts.
- **Soll-Ergebnis:** `kasse` steigt um `geraet + gewinn`; `geraet` und `gewinn` stehen
  danach auf 0. Passt nicht alles in die Kasse, bleibt der Rest im **Gerät** stehen und
  `gekappt` ist `true`.
- **Vorbedingung:** keine über die allgemeinen hinaus. Jeder Spielende darf.
- **Beobachtbar an:** JSON `geraet: 0`, `gewinn: 0`, `bewegt` = umgebuchter Betrag.
- **Umgesetzt in:** `Classes/Service/BookingService.php:196`, Hilfsrechnung `:275-280`.

### F-ACCOUNT-16  `einwurf` — Geld ins Gerät werfen
- **Was:** Bucht einen Betrag aus der Kasse in den Gerätekredit um.
- **Wie ausgelöst:** `art: 'einwurf'`, `betrag` >= 1.
- **Soll-Ergebnis:** `kasse` sinkt um den Betrag, `geraet` steigt um denselben Betrag;
  das Gesamtvermögen bleibt gleich.
- **Vorbedingung:** Kasse >= Betrag; jeder Spielende darf.
- **Beobachtbar an:** JSON `gesamt` unverändert, `bewegt` = Betrag. Zu wenig Geld:
  `ok: false`, `grund: 'kasse_zu_gering'`. Fehlender/zu kleiner Betrag: `grund: 'betrag'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:198-200`.

### F-ACCOUNT-17  `auszahlung` — Geld aus dem Gerät holen
- **Was:** Bucht Gerätekredit zurück in die Kasse — ohne Betrag alles (Cash Out), mit
  Betrag ein Teilbetrag (ein Chip zurück).
- **Wie ausgelöst:** `art: 'auszahlung'`, `betrag` = null (= alles) oder eine Zahl >= 0.
- **Soll-Ergebnis:** `geraet` sinkt, `kasse` steigt um denselben Betrag; der
  Gewinnspeicher bleibt unangetastet.
- **Vorbedingung:** Gewünschter Betrag <= Gerätekredit; jeder Spielende darf.
- **Beobachtbar an:** JSON `bewegt` = tatsächlich umgebuchter Betrag; `gekappt: true`,
  wenn die Kasse voll ist und der Rest im Gerät bleibt. Zu viel gewünscht: `ok: false`,
  `grund: 'geraet_zu_gering'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:203-208`.

### F-ACCOUNT-18  `einsatz` — Einsatz am Gerät
- **Was:** Zieht einen Einsatz vom Gerätekredit ab; das Geld ist damit weg (kein anderer
  Topf bekommt es).
- **Wie ausgelöst:** `art: 'einsatz'`, `betrag` >= 1.
- **Soll-Ergebnis:** `geraet` sinkt um den Betrag; `kasse` und `gewinn` bleiben gleich;
  das Gesamtvermögen sinkt um den Betrag.
- **Vorbedingung:** Gerätekredit >= Betrag; jeder Spielende darf.
- **Beobachtbar an:** JSON `bewegt` = Betrag, `gesamt` um den Betrag kleiner. Zu wenig:
  `ok: false`, `grund: 'geraet_zu_gering'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:210-212`.

### F-ACCOUNT-19  `gewinn` — Gewinn gutschreiben
- **Was:** Schreibt einen Gewinn auf den Gerätekredit gut und leert dabei zuerst den
  Gewinnspeicher, damit ein über die Risiko-Leiter gelaufener Gewinn nicht doppelt zählt.
- **Wie ausgelöst:** `art: 'gewinn'`, `betrag` >= 1.
- **Soll-Ergebnis:** `geraet` steigt um den Betrag; `gewinn` sinkt um den kleineren der
  beiden Werte (Gewinnspeicher, Betrag) — ohne Leiter ist der Speicher 0 und bleibt es.
- **Vorbedingung:** jeder Spielende darf.
- **Beobachtbar an:** JSON `geraet` erhöht, `gewinn` auf 0 oder um den Betrag
  verringert; `gekappt: true`, wenn der Gerätekredit am Höchststand anstößt.
- **Umgesetzt in:** `Classes/Service/BookingService.php:221-226`.

### F-ACCOUNT-20  `angebot` — Gewinn auf die Risiko-Leiter legen
- **Was:** Legt einen Betrag in den Gewinnspeicher — das Angebot, um das auf der
  Risiko-Leiter gespielt wird.
- **Wie ausgelöst:** `art: 'angebot'`, `betrag` >= 1.
- **Soll-Ergebnis:** `gewinn` steigt um den Betrag; `kasse` und `geraet` bleiben gleich.
- **Vorbedingung:** jeder Spielende darf.
- **Beobachtbar an:** JSON `gewinn` erhöht, `bewegt` = tatsächlich eingelegter Betrag;
  `gekappt: true` bei Anstoßen an den Höchststand.
- **Umgesetzt in:** `Classes/Service/BookingService.php:228-232`.

### F-ACCOUNT-21  `verdoppeln` — Risikostufe gewonnen
- **Was:** Verdoppelt den Gewinnspeicher; die Rechnung macht ausschließlich der Server.
- **Wie ausgelöst:** `art: 'verdoppeln'` (ohne Betrag).
- **Soll-Ergebnis:** `gewinn` steht auf dem doppelten Wert, höchstens auf `MAX`;
  `kasse` und `geraet` bleiben gleich.
- **Vorbedingung:** Gewinnspeicher >= 1; jeder Spielende darf.
- **Beobachtbar an:** JSON `gewinn` = altem Wert mal zwei, `bewegt` = altem Wert;
  `gekappt: true` bei Sättigung. Leerer Speicher: `ok: false`, `grund: 'kein_gewinn'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:237-238`.

### F-ACCOUNT-22  `verloren` — Risikostufe verloren
- **Was:** Leert den Gewinnspeicher; der darin liegende Betrag ist verloren.
- **Wie ausgelöst:** `art: 'verloren'` (ohne Betrag).
- **Soll-Ergebnis:** `gewinn` steht auf 0; `kasse` und `geraet` bleiben gleich; das
  Gesamtvermögen sinkt um den vorherigen Gewinnspeicher.
- **Vorbedingung:** jeder Spielende darf.
- **Beobachtbar an:** JSON `gewinn: 0`, `bewegt` = vorherigem Gewinnspeicher.
- **Umgesetzt in:** `Classes/Service/BookingService.php:240`.

### F-ACCOUNT-23  `aufladen` — Kasse erhöhen (nur Admin)
- **Was:** Legt einen Betrag in die Kasse, ohne Gegenbuchung — ein reines
  Verwaltungswerkzeug.
- **Wie ausgelöst:** `art: 'aufladen'`, `betrag` >= 1.
- **Soll-Ergebnis:** `kasse` steigt um den Betrag; `geraet` und `gewinn` bleiben gleich.
- **Vorbedingung:** Der Spielende der Sitzung hat `is_admin = 1`.
- **Beobachtbar an:** JSON `kasse` erhöht; ohne Admin-Recht `ok: false`,
  `grund: 'kein_admin'` bei unveränderten Beträgen, dazu eine Warnung im TYPO3-Protokoll.
- **Umgesetzt in:** `Classes/Service/BookingService.php:242-246`, Admin-Grenze `:98-105`.

### F-ACCOUNT-24  `abbuchen` — Kasse verringern (nur Admin)
- **Was:** Nimmt einen Betrag aus der Kasse heraus, ohne Gegenbuchung.
- **Wie ausgelöst:** `art: 'abbuchen'`, `betrag` >= 1.
- **Soll-Ergebnis:** `kasse` sinkt um den Betrag; `geraet` und `gewinn` bleiben gleich.
- **Vorbedingung:** `is_admin = 1`; Kasse >= Betrag.
- **Beobachtbar an:** JSON `kasse` verringert; ohne Admin-Recht `grund: 'kein_admin'`,
  bei zu wenig Geld `grund: 'kasse_zu_gering'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:248-250`.

### F-ACCOUNT-25  `setzen` — Gesamtvermögen frei festlegen (nur Admin)
- **Was:** Setzt das Gesamtvermögen auf einen genannten Betrag — derselbe Regelsatz wie
  das Feld „Guthaben" im Backend.
- **Wie ausgelöst:** `art: 'setzen'`, `betrag` zwischen 0 und `MAX`.
- **Soll-Ergebnis:** `kasse` = Betrag, `geraet` = 0, `gewinn` = 0.
- **Vorbedingung:** `is_admin = 1`.
- **Beobachtbar an:** JSON `geraet: 0`, `gewinn: 0`, `kasse` = eingetragenem Betrag;
  ohne Admin-Recht `grund: 'kein_admin'`. Betrag außerhalb der Grenzen: `grund: 'betrag'`.
- **Umgesetzt in:** `Classes/Service/BookingService.php:257-258`.

---

## Backend: die Modulgruppe „Casino"

### F-ACCOUNT-26  Modulgruppe „Casino" im linken Menü
- **Was:** Legt direkt unter „Web" eine eigene oberste Modulgruppe „Casino" mit eigenem
  Symbol (Spielchip) an, in der die beiden Module dieser Extension liegen.
- **Wie ausgelöst:** Anmeldung am TYPO3-Backend; die Gruppe steht im linken Menü.
- **Soll-Ergebnis:** Ein Menüeintrag „Casino" unter „Web", beim Anklicken öffnet sich
  das erste Untermodul („Spielende"). Die Gruppe bekommt bewusst **keinen** Seitenbaum
  an die linke Seite.
- **Vorbedingung:** Extension aktiv; Backend-Benutzer mit Zugriff (`access: 'user'`).
  Unabhängig vom QR-Schalter — beide Stellungen.
- **Beobachtbar an:** Sichtbarer Menüeintrag „Casino"; Symbolbezeichner
  `modulegroup-casino`; kein Seitenbaum-Bereich neben dem Modulinhalt.
- **Umgesetzt in:** `Configuration/Backend/Modules.php:37-45`,
  `Configuration/Icons.php`, `Resources/Public/Icons/ModuleGroupCasino.svg`.

---

## Backend-Modul „QR-Modus"

### F-ACCOUNT-27  Zustandsanzeige des Schalters
- **Was:** Sagt in einem vollständigen Satz, ob der QR-Modus an oder aus ist.
- **Wie ausgelöst:** Öffnen von *Casino › QR-Modus*.
- **Soll-Ergebnis:** Bei AN steht „Der QR-Modus ist an. Ohne Anmeldung kommt niemand in
  den Saal."; bei AUS „Der QR-Modus ist aus. Der Saal steht allen offen, das Guthaben
  liegt im Browser."
- **Vorbedingung:** keine. Das Modul ist in beiden Schalterstellungen erreichbar.
- **Beobachtbar an:** Absatz mit Klasse `ca-qrmode__state--on` bzw.
  `ca-qrmode__state--off` und dem jeweiligen Satz.
- **Umgesetzt in:** `Resources/Private/Templates/QrModeModule/Index.html:28-33`,
  `Classes/Controller/QrModeModuleController.php:82`.

### F-ACCOUNT-28  Einschalten, Schritt 1: „Einschalten …"
- **Was:** Führt auf dieselbe Seite mit einer ausdrücklichen Warnung, statt sofort zu
  schalten.
- **Wie ausgelöst:** Klick auf den Knopf „Einschalten …".
- **Soll-Ergebnis:** Dieselbe Modulseite mit `?confirm=on`; der Warnkasten und ein
  zweiter Knopf sind sichtbar; der Schalter steht noch auf AUS.
- **Vorbedingung:** QR-Modus AUS.
- **Beobachtbar an:** Adresse enthält `confirm=on`; sichtbarer `callout callout-warning`
  mit den zwei Warnsätzen; Registry-Eintrag `tx_casinoaccount/qrMode` unverändert.
- **Umgesetzt in:** `Resources/Private/Templates/QrModeModule/Index.html:49-74`,
  `Classes/Controller/QrModeModuleController.php:83,88`.

### F-ACCOUNT-29  Einschalten, Schritt 2: „Ja, QR-Modus einschalten"
- **Was:** Schaltet den QR-Modus tatsächlich ein.
- **Wie ausgelöst:** Klick auf „Ja, QR-Modus einschalten" (sendet `POST` mit
  `state=on`).
- **Soll-Ergebnis:** Umleitung zurück auf die Modulübersicht, dort die Meldung „Der
  QR-Modus ist jetzt an."; ab sofort führt jede Frontend-Adresse ohne Sitzung auf die
  Torseite.
- **Vorbedingung:** QR-Modus AUS; der Warnschritt wurde angezeigt.
- **Beobachtbar an:** Registry-Eintrag `tx_casinoaccount` / `qrMode` steht auf wahr;
  Meldungskasten „QR-Modus eingeschaltet"; ein Frontend-Aufruf liefert die Torseite.
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:100-121`,
  `Classes/Service/QrMode.php:51-56`.

### F-ACCOUNT-30  Ausschalten
- **Was:** Schaltet den QR-Modus mit einem einzigen Klick wieder aus — ohne Warnung,
  weil Ausschalten nur wieder freigibt.
- **Wie ausgelöst:** Klick auf „QR-Modus ausschalten" (`POST` mit `state=off`).
- **Soll-Ergebnis:** Meldung „Der QR-Modus ist jetzt aus."; das Frontend ist wieder frei
  zugänglich; **zusätzlich** wird liegengebliebenes Gerätegeld in die Kasse zurückgebucht.
  Bestehende Sitzungen bleiben ausdrücklich erhalten.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Registry-Eintrag `qrMode` auf falsch; Frontend liefert wieder die
  gewohnte Seite; bei betroffenen Konten steht `balance_machine` und `balance_win` auf 0
  und `balance_cash` ist um die Summe gestiegen.
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:100-121` (Zeile
  106-112), `Classes/Service/PlayerSessionService.php:112-126`.

### F-ACCOUNT-31  Meldung „Es hat sich nichts geändert"
- **Was:** Stand der Schalter schon so, sagt das Modul das, statt fälschlich
  „eingeschaltet" zu melden (zwei Fenster, zweimal geklickt).
- **Wie ausgelöst:** Absenden des Schaltformulars mit der bereits eingestellten Stellung.
- **Soll-Ergebnis:** Meldungskasten „Unverändert — Es hat sich nichts geändert, der
  Schalter stand bereits so."
- **Vorbedingung:** keine.
- **Beobachtbar an:** Sichtbarer Meldungstext; Registry-Eintrag unverändert.
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:114-118`,
  `Classes/Service/QrMode.php:52-56`.

### F-ACCOUNT-32  Schalten nur per Absendeformular (kein Aufruf per Adresse)
- **Was:** Die Schaltadressen nehmen ausschließlich `POST` an, damit ein Lesezeichen,
  ein Vorauslader oder ein Suchdienst den Saal nicht versehentlich zusperrt.
- **Wie ausgelöst:** Aufruf von `casino_qr_mode.toggle` oder
  `casino_qr_mode.logout_all` per `GET`.
- **Soll-Ergebnis:** Der Backend-Router weist den Aufruf ab; es wird nicht geschaltet.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Fehlerantwort des Backend-Routers statt einer Umleitung;
  Registry-Eintrag `qrMode` unverändert.
- **Umgesetzt in:** `Configuration/Backend/Modules.php:90-97` (`'methods' => ['POST']`).

### F-ACCOUNT-33  Anzeige „Wer ist angemeldet"
- **Was:** Listet die gerade angemeldeten Spielenden mit Namen und „zuletzt gesehen vor
  N Sekunden" und nennt ihre Anzahl.
- **Wie ausgelöst:** Öffnen von *Casino › QR-Modus*.
- **Soll-Ergebnis:** Überschrift „Wer ist angemeldet", der Satz „%d Spielende sind
  gerade angemeldet." und eine Liste mit je Name und Sekundenangabe. Ausdrücklich
  **nicht** angezeigt: Rolle und Kennung.
- **Vorbedingung:** Mindestens eine gültige Frontend-Sitzung; sonst siehe F-ACCOUNT-34.
  Sitzungen entstehen nur bei QR-Modus AN, die Liste kann aber auch bei AUS noch
  Sitzungen zeigen.
- **Beobachtbar an:** `<ul class="ca-qrmode__online">` mit `<li>`-Einträgen und
  `<span class="ca-qrmode__seen">`; Quelle ist `fe_sessions` (nicht `last_seen`).
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:77,84-85,145-162`,
  `Classes/Service/PlayerSessionService.php:53-61,133-163`,
  `Resources/Private/Templates/QrModeModule/Index.html:78-102`.

### F-ACCOUNT-34  „Gerade ist niemand angemeldet" statt eines ausgegrauten Knopfs
- **Was:** Ist niemand da, erscheint der Satz, der die Lage erklärt — und der Knopf
  „Alle abmelden" gar nicht erst (bewusst kein `disabled`).
- **Wie ausgelöst:** Öffnen des Moduls ohne gültige Frontend-Sitzung.
- **Soll-Ergebnis:** Der Satz „Gerade ist niemand angemeldet."; kein Abmelde-Knopf im
  Dokument.
- **Vorbedingung:** keine gültige Sitzung.
- **Beobachtbar an:** Sichtbarer Satz; kein `<form>` auf die Abmelde-Adresse und kein
  Element mit `disabled` im ausgelieferten HTML.
- **Umgesetzt in:** `Resources/Private/Templates/QrModeModule/Index.html:93-101`.

### F-ACCOUNT-35  „Alle abmelden"
- **Was:** Beendet sämtliche Frontend-Sitzungen und bucht dabei jedem Betroffenen
  Gerätekredit und Gewinnspeicher in die Kasse zurück.
- **Wie ausgelöst:** Klick auf „Alle abmelden" (`POST` auf
  `casino_qr_mode.logout_all`).
- **Soll-Ergebnis:** Meldung „%d Sitzungen wurden beendet."; die Liste der Angemeldeten
  ist danach leer; bei jedem Betroffenen ist `balance_machine` und `balance_win` auf 0
  und `balance_cash` um deren Summe gestiegen. Backend-Sitzungen bleiben unberührt.
- **Vorbedingung:** mindestens eine gültige Sitzung.
- **Beobachtbar an:** Keine Zeilen mehr in `fe_sessions` für die Schattendatensätze;
  Meldungskasten „Alle abgemeldet"; die drei Geldspalten in `tx_casinoaccount_player`.
  War niemand da: Meldung „Es war niemand angemeldet."
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:124-134`,
  `Classes/Service/PlayerSessionService.php:71-88`,
  `Classes/Service/AccountBookkeeper.php:54-86`.

### F-ACCOUNT-36  Aufräumen beim Öffnen des Moduls
- **Was:** Beim bloßen Öffnen des Moduls wird Gerätegeld von Konten **ohne** gültige
  Sitzung automatisch in die Kasse zurückgebucht — das Netz für Sitzungen, die von
  selbst abgelaufen sind (für die es kein Ereignis gibt).
- **Wie ausgelöst:** Jeder Aufruf von *Casino › QR-Modus*.
- **Soll-Ergebnis:** Betroffene Konten haben `balance_machine = 0`, `balance_win = 0`,
  `balance_cash` um die Summe erhöht; gemeldet wird nur, wenn wirklich etwas getan wurde.
- **Vorbedingung:** Konten mit `balance_machine + balance_win > 0` und ohne gültige
  Sitzung. Wiederholbar und still, wenn nichts zu tun ist.
- **Beobachtbar an:** Meldung „Bei %d Konten wurde liegengebliebenes Gerätegeld in die
  Kasse zurückgebucht." (Titel „Aufgeräumt"); die drei Geldspalten.
- **Umgesetzt in:** `Classes/Controller/QrModeModuleController.php:69-72`,
  `Classes/Service/PlayerSessionService.php:112-126`.

### F-ACCOUNT-37  Verweis „Zum Modul ‚Spielende'"
- **Was:** Ein Link vom QR-Modus-Modul zurück in die Spielendenliste.
- **Wie ausgelöst:** Klick auf „Zum Modul „Spielende"".
- **Soll-Ergebnis:** Das Modul „Spielende" öffnet sich.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<a href>` auf die Backend-Route `casino_players`.
- **Umgesetzt in:** `Resources/Private/Templates/QrModeModule/Index.html:104-106`,
  `Classes/Controller/QrModeModuleController.php:89`.

---

## Backend-Modul „Spielende"

Alle Funktionen dieses Moduls gibt es in **beiden** Schalterstellungen des QR-Modus;
die Anzeigespalte „Anmeldezustand" ist bei AUS in aller Regel leer, weil ohne QR-Modus
keine Sitzungen entstehen.

### F-ACCOUNT-38  Liste aller Spielenden
- **Was:** Zeigt eine Tabelle aller Konten mit Name, Gesamtvermögen, Rolle,
  Anmeldezustand und zwei Schaltflächen je Zeile.
- **Wie ausgelöst:** Öffnen von *Casino › Spielende*.
- **Soll-Ergebnis:** Tabelle mit Überschrift „Alle Spielenden des Hauses"; das
  Gesamtvermögen steht mit Tausenderpunkt und ist die Summe der drei Geldwerte; ein
  stillgelegtes Konto trägt zusätzlich die Kennzeichnung „stillgelegt".
- **Vorbedingung:** Der Kontenordner existiert (siehe F-ACCOUNT-41).
- **Beobachtbar an:** `<table class="… ca-players">` mit fünf Spaltenköpfen; Zellklasse
  `ca-players__number` trägt das Gesamtvermögen; `<span class="badge badge-warning">`
  bei stillgelegten Konten.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:78-122,235-261`,
  `Resources/Private/Templates/PlayerModule/Index.html:35-99`.

### F-ACCOUNT-39  Spalte „Anmeldezustand"
- **Was:** Sagt je Zeile, ob die Person gerade angemeldet ist.
- **Wie ausgelöst:** Öffnen der Liste.
- **Soll-Ergebnis:** In der Spalte steht „angemeldet" oder „nicht angemeldet". Maßstab
  ist eine gültige Sitzung in `fe_sessions`, ausdrücklich **nicht** „zuletzt gesehen".
- **Vorbedingung:** keine.
- **Beobachtbar an:** Sichtbarer Text „angemeldet" / „nicht angemeldet" in der vierten
  Spalte; Abgleich mit `fe_sessions`.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:241,249`,
  `Resources/Private/Templates/PlayerModule/Index.html:66-71`.

### F-ACCOUNT-40  Leere Liste
- **Was:** Ist noch niemand angelegt, steht dort ein erklärender Satz statt einer leeren
  Tabelle.
- **Wie ausgelöst:** Öffnen der Liste ohne einen einzigen Spielenden.
- **Soll-Ergebnis:** Der Satz „Noch ist niemand angelegt. Mit „Neuen Spielenden
  anlegen" geht es los."
- **Vorbedingung:** keine Konten im Kontenordner.
- **Beobachtbar an:** Sichtbarer Satz; keine `<table>` im Dokument.
- **Umgesetzt in:** `Resources/Private/Templates/PlayerModule/Index.html:96-98`.

### F-ACCOUNT-41  Kontenordner anlegen beim Öffnen
- **Was:** Fehlt der Systemordner „Casino Kunterbunt — Konten", legt das Modul ihn beim
  Öffnen selbst an; fehlt das Recht dazu, sagt es das.
- **Wie ausgelöst:** Öffnen von *Casino › Spielende*.
- **Soll-Ergebnis:** Ein Systemordner mit dem Titel „Casino Kunterbunt — Konten" unter
  der ersten Seitenwurzel, eingestellt auf `fe_users`; seine Nummer steht in der
  Registry unter `tx_casinoaccount/storagePid`. Schlägt das fehl, erscheint die Warnung
  „Kontenordner fehlt" und eine leere Liste.
- **Vorbedingung:** Für das Anlegen ein Backend-Benutzer mit ausreichenden Rechten
  (Administrator).
- **Beobachtbar an:** Neuer Eintrag in `pages` mit `doktype` Systemordner;
  `sys_registry`-Zeile `tx_casinoaccount` / `storagePid`; im Fehlfall der
  Meldungskasten „Kontenordner fehlt".
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:88-94`,
  `Classes/Service/AccountStorage.php:52-64,92-116`.

### F-ACCOUNT-42  Abgleich der Backend-Benutzer beim Öffnen
- **Was:** Jeder Backend-Benutzer ohne Spielenden-Eintrag bekommt beim Öffnen des Moduls
  einen — mit 1.000.000 in der Kasse.
- **Wie ausgelöst:** Jeder Aufruf von *Casino › Spielende*.
- **Soll-Ergebnis:** Für jeden solchen Benutzer eine neue Zeile in
  `tx_casinoaccount_player` mit `name` = Benutzername, `balance_cash` = 1000000,
  `be_user` = Nummer des Backend-Benutzers, `is_admin` = 1; Meldung „%d Backend-Benutzer
  sind neu als Spielende angelegt worden, jeweils mit 1.000.000 in der Kasse."
- **Vorbedingung:** Kontenordner vorhanden. Wiederholbar; eine Einbahnstraße —
  Umbenennen oder Löschen eines Backend-Benutzers ändert den Spielenden-Eintrag nicht.
- **Beobachtbar an:** Neue Zeilen in `tx_casinoaccount_player`; Meldungskasten
  „Backend-Benutzer abgeglichen"; die Liste zeigt die Namen.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:104-107`,
  `Classes/Service/BackendUserMirror.php:54-66,102-122,135-159`.

### F-ACCOUNT-43  Abgleich beim Aktivieren der Extension
- **Was:** Schon beim Einschalten der Extension bekommen alle vorhandenen
  Backend-Benutzer ihren Spielenden-Eintrag.
- **Wie ausgelöst:** Aktivieren der Extension (PSR-14-Ereignis).
- **Soll-Ergebnis:** Wie F-ACCOUNT-42, aber ohne Meldung im Modul.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Zeilen in `tx_casinoaccount_player` unmittelbar nach der
  Aktivierung.
- **Umgesetzt in:** `Classes/EventListener/ActivateExtension.php`.

### F-ACCOUNT-44  Abgleich bei jedem neuen Backend-Benutzer
- **Was:** Wird ein Backend-Benutzer angelegt, entsteht sofort sein Spielenden-Eintrag —
  auch bei Anlage über die Kommandozeile.
- **Wie ausgelöst:** Speichern eines neuen `be_users`-Datensatzes (Backend-Formular oder
  `backend:user:create`).
- **Soll-Ergebnis:** Neue Zeile in `tx_casinoaccount_player` mit 1.000.000 in der Kasse.
- **Vorbedingung:** Kontenordner vorhanden.
- **Beobachtbar an:** Der neue Benutzer steht sofort in der Liste des Moduls
  „Spielende".
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:147-151`,
  `Classes/Service/BackendUserMirror.php:69-83`.

### F-ACCOUNT-45  „Neuen Spielenden anlegen"
- **Was:** Öffnet das gewöhnliche Bearbeitungsformular des TYPO3-Kerns für einen neuen
  Spielenden — diese Extension bringt keine eigene Formularmaschine mit.
- **Wie ausgelöst:** Klick auf „Neuen Spielenden anlegen".
- **Soll-Ergebnis:** Das Kernformular `record_edit` für `tx_casinoaccount_player` im
  Kontenordner öffnet sich; nach dem Speichern führt es zurück in die Liste.
- **Vorbedingung:** Kontenordner vorhanden (sonst fehlt der Knopf ganz).
- **Beobachtbar an:** `<a class="btn btn-primary">` mit einer Adresse auf die Route
  `record_edit` samt `edit[tx_casinoaccount_player][<pid>]=new` und `returnUrl`.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:111-114`,
  `Resources/Private/Templates/PlayerModule/Index.html:26-33`.

### F-ACCOUNT-46  „Bearbeiten" je Zeile
- **Was:** Öffnet den vorhandenen Spielenden im Kernformular.
- **Wie ausgelöst:** Klick auf den Namen oder auf die Schaltfläche mit dem
  Öffnen-Symbol.
- **Soll-Ergebnis:** Das Kernformular mit den Feldern dieses Spielenden; nach dem
  Speichern zurück in die Liste.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Adresse auf `record_edit` mit
  `edit[tx_casinoaccount_player][<uid>]=edit`; die für Bildschirmleser sichtbare
  Beschriftung „%s bearbeiten".
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:250-253`,
  `Resources/Private/Templates/PlayerModule/Index.html:73-80`.

### F-ACCOUNT-47  „QR-Code anzeigen" je Zeile
- **Was:** Öffnet die QR-Ansicht dieses Spielenden.
- **Wie ausgelöst:** Klick auf die Schaltfläche mit dem QR-Symbol.
- **Soll-Ergebnis:** Die QR-Ansicht mit dem persönlichen Code der Person.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Adresse auf die Backend-Route `casino_players.qr` mit
  `player=<uid>`; Beschriftung „QR-Code von %s anzeigen".
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:254-257`,
  `Resources/Private/Templates/PlayerModule/Index.html:81-88`.

---

## Backend: das Formular eines Spielenden (Felder und Speichern)

Das Formular ist das gewöhnliche TYPO3-Kernformular; diese Extension bestimmt nur, welche
Felder darin stehen und was beim Speichern geschieht. In beiden Schalterstellungen
erreichbar.

### F-ACCOUNT-48  Feld „Name"
- **Was:** Der sichtbare Name der Person, Pflichtfeld.
- **Wie ausgelöst:** Eingabe im Reiter „Allgemein".
- **Soll-Ergebnis:** Der Name steht in der Liste und in der Kontenleiste im Frontend.
  Alle Zeichen erlaubt, kein Zuschneiden, keine Einmaligkeit — zwei Personen dürfen
  gleich heißen.
- **Vorbedingung:** darf nicht leer sein (`required`), höchstens 255 Zeichen.
- **Beobachtbar an:** Spalte `name` in `tx_casinoaccount_player`; Anzeige in der Liste.
- **Umgesetzt in:** `Configuration/TCA/tx_casinoaccount_player.php:116-131`.

### F-ACCOUNT-49  Feld „Guthaben" — Eingabe und Wirkung beim Speichern
- **Was:** Das einzige eingebbare Geldfeld. Der eingetragene Betrag ist das
  **Gesamtvermögen** und landet beim Speichern vollständig in der Kasse; Gerätekredit
  und Gewinnspeicher werden dabei auf 0 gesetzt.
- **Wie ausgelöst:** Wert im Feld „Guthaben" (Reiter „Allgemein") ändern und speichern.
- **Soll-Ergebnis:** `balance_cash` = eingetragener Betrag (mindestens 0),
  `balance_machine` = 0, `balance_win` = 0. Das Gesamtvermögen ist danach genau der
  eingetragene Betrag. Wird nichts eingetragen, ist es 0.
- **Vorbedingung:** ganze Zahl zwischen 0 und 999999999. Die Umbuchung läuft nur, wenn
  der Wert **tatsächlich geändert** wurde, nicht beim bloßen Wiederspeichern.
- **Beobachtbar an:** Die drei Spalten `balance_cash`/`balance_machine`/`balance_win`;
  beim erneuten Öffnen zeigt „Gesamtvermögen" denselben Betrag.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:90-103`,
  `Configuration/TCA/tx_casinoaccount_player.php:175-187`.

### F-ACCOUNT-50  Warnung beim Setzen des Guthabens während einer laufenden Anmeldung
- **Was:** Wird das Guthaben geändert, während die Person angemeldet ist, sagt das Modul
  ausdrücklich, dass damit Geld aus einem laufenden Spiel eingezogen wurde — verhindert
  wird es aber nicht.
- **Wie ausgelöst:** Speichern eines geänderten „Guthaben" bei einer Person, die als
  angemeldet gilt.
- **Soll-Ergebnis:** Warnmeldung „%s ist gerade angemeldet. Das eingetragene Guthaben
  zieht Geld aus einem laufenden Spiel ein: Gerätekredit und Gewinnspeicher wurden auf
  null gesetzt." (Titel „Geld aus einem laufenden Spiel eingezogen").
- **Vorbedingung:** Bearbeiten eines vorhandenen Datensatzes (kein Neuanlegen);
  `Player::isOnline()` ist wahr.
- **Beobachtbar an:** Sichtbarer Warn-Meldungskasten nach dem Speichern.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:97-102,239-242`.

### F-ACCOUNT-51  Feld „Rolle"
- **Was:** Eine Auswahlliste, die derzeit nur einen leeren Eintrag („—") enthält.
- **Wie ausgelöst:** Aufklappen im Reiter „Allgemein".
- **Soll-Ergebnis:** Auswahl bleibt bei 0; in der Liste steht in der Spalte „Rolle"
  immer „—".
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<select>` mit einem einzigen Eintrag; Spalte `role` = 0.
- **Umgesetzt in:** `Configuration/TCA/tx_casinoaccount_player.php:149-165`.

### F-ACCOUNT-52  Anzeige „Gesamtvermögen" (nur lesbar)
- **Was:** Zeigt beim Öffnen die Summe der drei Geldwerte; sie wird nie gespeichert,
  sondern jedes Mal gerechnet.
- **Wie ausgelöst:** Öffnen eines vorhandenen Spielenden, Reiter „Konto".
- **Soll-Ergebnis:** Der angezeigte Wert ist `balance_cash + balance_machine +
  balance_win`; das Feld lässt sich nicht bearbeiten und hat keine eigene Spalte.
- **Vorbedingung:** Bearbeiten eines vorhandenen Datensatzes (beim Neuanlegen leer).
- **Beobachtbar an:** Anzeigefeld ohne `name`-Attribut im Formular; keine Spalte
  `balance` in der Datenbank.
- **Umgesetzt in:** `Classes/Backend/FormEngine/CurrentBalanceProvider.php:29-45`,
  `Configuration/TCA/tx_casinoaccount_player.php:132-148`.

### F-ACCOUNT-53  Anzeigen „Gerätekredit" und „Gewinnspeicher" (nur lesbar)
- **Was:** Zeigen die beiden übrigen Geldwerte: was gerade im bespielten Gerät steckt
  und was auf der Risiko-Leiter liegt.
- **Wie ausgelöst:** Öffnen eines Spielenden, Reiter „Konto".
- **Soll-Ergebnis:** Beide Werte stehen da, lassen sich aber nicht ändern.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Zwei schreibgeschützte Zahlenfelder; Spalten `balance_machine`,
  `balance_win`.
- **Umgesetzt in:** `Configuration/TCA/tx_casinoaccount_player.php:188-205`.

### F-ACCOUNT-54  Anzeige „Darf sein Guthaben selbst setzen" (nur lesbar)
- **Was:** Ein Schalter, der nur anzeigt, ob dieser Spielende Admin-Rechte hat — er wird
  nie eingegeben, sondern abgeleitet.
- **Wie ausgelöst:** Speichern eines Spielenden, bei dem das Feld `be_user` gesetzt wird
  (also beim Spiegeln eines Backend-Benutzers).
- **Soll-Ergebnis:** `is_admin` = 1, wenn der Datensatz zu einem Backend-Benutzer
  gehört, sonst 0. Davon hängen die drei Admin-Buchungsarten ab (F-ACCOUNT-23 bis 25).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Schreibgeschützter Schalter im Reiter „Konto"; Spalte `is_admin`.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:108-110`,
  `Configuration/TCA/tx_casinoaccount_player.php:206-215`.

### F-ACCOUNT-55  Schalter „stillgelegt" (verbergen)
- **Was:** Ein Spielender lässt sich über den Sichtbarkeitsschalter des Kerns stilllegen.
- **Wie ausgelöst:** Schalter im Reiter „Zugriff" umlegen und speichern.
- **Soll-Ergebnis:** In der Liste trägt die Zeile die Kennzeichnung „stillgelegt"; der
  Buchungsendpunkt antwortet für dieses Konto mit `grund: 'unbekannt'`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Spalte `hidden` = 1; `<span class="badge badge-warning">` in der
  Liste; JSON-Feld `grund` = `unbekannt` bei einer Buchung.
- **Umgesetzt in:** `Configuration/TCA/tx_casinoaccount_player.php:81-83,101-115`,
  `Classes/Service/BookingService.php:74`.

### F-ACCOUNT-56  Kennung wird beim Anlegen automatisch vergeben
- **Was:** Jeder neue Spielende bekommt beim Speichern eine einmalige 43-stellige
  Kennung; ein mitgeschickter Wert wird überschrieben.
- **Wie ausgelöst:** Speichern eines neuen Spielenden.
- **Soll-Ergebnis:** Spalte `token` trägt 43 Zeichen aus dem URL-tauglichen
  Base64-Alphabet; sie ändert sich danach nie wieder, auch nicht beim Umbenennen.
- **Vorbedingung:** Neuanlage (Status `new`).
- **Beobachtbar an:** Spalte `token` in `tx_casinoaccount_player`, Länge 43; der
  `UNIQUE KEY` in `ext_tables.sql` verhindert Doppelvergabe. Im Formular steht sie
  bewusst **nicht** — nur in der QR-Ansicht.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:116-119`,
  `Classes/Service/PlayerTokenGenerator.php`, `ext_tables.sql`.

### F-ACCOUNT-57  Schattendatensatz in `fe_users` wird mitgeführt
- **Was:** Zu jedem Spielenden entsteht ein technischer Frontend-Benutzer, weil TYPO3
  für eine Sitzung einen braucht; er wird mit angelegt, umbenannt, gelöscht und
  zurückgeholt.
- **Wie ausgelöst:** Anlegen, Umbenennen, Löschen oder Zurückholen eines Spielenden.
- **Soll-Ergebnis:** Beim Anlegen ein `fe_users`-Datensatz mit Benutzername `casino-<Nr>`
  und einem Zufallspasswort, das nirgends aufbewahrt wird; beim Umbenennen folgt sein
  `name` (nicht sein `username`); beim Löschen/Zurückholen folgt er mit.
- **Vorbedingung:** Kontenordner vorhanden.
- **Beobachtbar an:** Zeile in `fe_users` im Kontenordner mit `username` beginnend mit
  `casino-`; Spalten `tx_casinoaccount_player` (Rückverweis) und
  `tx_casinoaccount_player.fe_user`.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:121-126,162-175,216-237`,
  `Classes/Service/ShadowUserService.php`.

### F-ACCOUNT-58  Kopieren eines Spielenden wird verweigert
- **Was:** Ein Spielender lässt sich nicht vervielfältigen — die Kopie trüge dieselbe
  einmalige Kennung.
- **Wie ausgelöst:** Befehl „Kopieren" (auch „Übersetzen"/`copyToLanguage`) auf einem
  Spielenden.
- **Soll-Ergebnis:** Nichts wird kopiert; stattdessen die Fehlermeldung „Ein Spielender
  lässt sich nicht kopieren: seine Kennung ist einmalig und sein Schattendatensatz gehört
  ihm allein. Bitte einen neuen Spielenden anlegen." (Titel „Kopieren nicht möglich").
- **Vorbedingung:** keine.
- **Beobachtbar an:** Roter Meldungskasten; keine neue Zeile in
  `tx_casinoaccount_player`; kein roher Datenbankfehler.
- **Umgesetzt in:** `Classes/Hook/PlayerDataHandlerHook.php:192-209`.

### F-ACCOUNT-59  Tabelle „Gerätespeicher" ist im Backend nicht bearbeitbar
- **Was:** Die Tabelle `tx_casinoaccount_coinfield` erscheint in keinem Formular und in
  keiner Listenansicht — sie enthält maschinelle Speicherstände, kein redaktionelles Gut.
- **Wie ausgelöst:** Suche nach der Tabelle in *Web › Liste*.
- **Soll-Ergebnis:** Die Tabelle wird nicht angeboten.
- **Vorbedingung:** keine.
- **Beobachtbar an:** TCA-Einstellungen `hideTable` und `adminOnly` in
  `Configuration/TCA/tx_casinoaccount_coinfield.php`.
- **Umgesetzt in:** `Configuration/TCA/tx_casinoaccount_coinfield.php`.

---

## Backend: die QR-Ansicht eines Spielenden

In beiden Schalterstellungen erreichbar. Anmelden kann man sich mit dem Code allerdings
nur bei QR-Modus AN.

### F-ACCOUNT-60  QR-Code anzeigen
- **Was:** Zeigt den persönlichen QR-Code der Person als Bild, darunter Name, Kennung im
  Klartext und die Adresse hinter dem Code.
- **Wie ausgelöst:** Aufruf der Backend-Route `casino_players.qr` mit `player=<uid>`
  (Schaltfläche in der Liste).
- **Soll-Ergebnis:** Ein SVG-Bild des Codes; er trägt ausschließlich die Adresse
  `<Adresse des Hauses>/?casinoToken=<Kennung>` — ausdrücklich nicht den Namen, das
  Guthaben oder ein anderes personenbezogenes Datum. Über dem Bild steht der Name,
  darunter die Kennung zum Abtippen.
- **Vorbedingung:** Der Spielende existiert; im Haus ist mindestens eine Site
  eingerichtet (sonst bricht die Adressbildung mit einer Meldung ab).
- **Beobachtbar an:** `<svg class="ca-qr__image" data-ca-qr role="img">` mit einem
  `<title>`, der lautet „QR-Code von %s. Er führt zur Anmeldung des Casino Kunterbunt.";
  `<dd class="ca-qr__token">` mit der 43-stelligen Kennung; `<dd class="ca-qr__url">`
  mit der Adresse.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:127-178`,
  `Classes/Qr/QrSvgRenderer.php:49-79`, `Classes/Service/PlayerUrlBuilder.php:36-39`,
  `Resources/Private/Templates/PlayerModule/Qr.html:20-73`.

### F-ACCOUNT-61  Unbekannter Spielender in der QR-Ansicht
- **Was:** Ein Lesezeichen auf einen gelöschten Spielenden führt zurück in die Liste
  statt auf eine Fehlerseite.
- **Wie ausgelöst:** Aufruf von `casino_players.qr` mit einer Nummer, zu der es keinen
  Datensatz gibt.
- **Soll-Ergebnis:** Umleitung auf die Liste des Moduls „Spielende".
- **Vorbedingung:** keine.
- **Beobachtbar an:** HTTP-Umleitung auf die Route `casino_players`.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:132-139`.

### F-ACCOUNT-62  „Als SVG herunterladen"
- **Was:** Lädt den QR-Code als Vektordatei herunter.
- **Wie ausgelöst:** Klick auf „Als SVG herunterladen".
- **Soll-Ergebnis:** Eine Datei `qr-<name>.svg` wird angeboten; sie enthält dasselbe
  Bild wie die Ansicht. Der Dateiname ist auf unstrittige Zeichen zurechtgestutzt;
  bleibt nichts übrig, heißt sie `qr-code.svg`.
- **Vorbedingung:** Der Spielende existiert (sonst HTTP 404).
- **Beobachtbar an:** Antwortkopf `Content-Type: image/svg+xml; charset=utf-8`,
  `Content-Disposition: attachment; filename="qr-….svg"` und
  `Cache-Control: no-store, private`.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:186-225`,
  `Resources/Private/Templates/PlayerModule/Qr.html:39-42`.

### F-ACCOUNT-63  „Als PNG herunterladen"
- **Was:** Erzeugt aus dem angezeigten SVG **im Browser** ein PNG-Bild und lädt es
  herunter — der Server erzeugt kein PNG.
- **Wie ausgelöst:** Klick auf „Als PNG herunterladen".
- **Soll-Ergebnis:** Eine Datei `qr-<name>.png` wird heruntergeladen; im Meldebereich
  steht „Das PNG-Bild ist fertig und wird heruntergeladen."
- **Vorbedingung:** Browser mit `<canvas>`; JavaScript aktiv.
- **Beobachtbar an:** Text im Element `[data-ca-qr-status]` (`role="status"`); die
  heruntergeladene Datei. Kann der Browser es nicht: dort steht stattdessen „Dieser
  Browser kann das PNG nicht erzeugen. Das SVG lässt sich trotzdem herunterladen und
  drucken."
- **Umgesetzt in:** `Resources/Public/JavaScript/qr-tools.js:73-121`,
  `Resources/Private/Templates/PlayerModule/Qr.html:43-50,64`.

### F-ACCOUNT-64  „Drucken"
- **Was:** Öffnet den Druckdialog; auf den Ausdruck kommen nur der Code und der Name.
- **Wie ausgelöst:** Klick auf „Drucken".
- **Soll-Ergebnis:** Der Druckdialog des Browsers erscheint; in der Druckvorschau sind
  alle übrigen Teile der Seite ausgeblendet.
- **Vorbedingung:** JavaScript aktiv.
- **Beobachtbar an:** Nur `.ca-qr__print` ist in der Druckvorschau sichtbar (Regel in
  `Resources/Public/Css/backend.css`).
- **Umgesetzt in:** `Resources/Public/JavaScript/qr-tools.js:123-127`,
  `Resources/Private/Templates/PlayerModule/Qr.html:51-54,22-25`.

### F-ACCOUNT-65  Kennung zum Abtippen
- **Was:** Unter dem Code steht die 43-stellige Kennung im Klartext, damit sie sich
  eintippen lässt, wenn der Code nicht gescannt werden kann.
- **Wie ausgelöst:** Öffnen der QR-Ansicht.
- **Soll-Ergebnis:** Die Kennung ist lesbar, mit der Erklärung „Wer den Code nicht
  scannen kann, tippt diese Zeichenfolge auf der Anmeldeseite ein."
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<dd class="ca-qr__token">` mit 43 Zeichen.
- **Umgesetzt in:** `Resources/Private/Templates/PlayerModule/Qr.html:66-69`.

### F-ACCOUNT-66  „Zurück zur Liste"
- **Was:** Zwei Wege zurück in die Liste: eine Schaltfläche oben in der Modulleiste und
  ein Verweis unten auf der Seite.
- **Wie ausgelöst:** Klick auf „Zurück zur Liste" (oben oder unten).
- **Soll-Ergebnis:** Die Liste des Moduls „Spielende" öffnet sich.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Schaltfläche mit dem Symbol `actions-view-go-back` in der
  Kopfleiste; `<a href>` auf die Route `casino_players` am Seitenende.
- **Umgesetzt in:** `Classes/Controller/PlayerModuleController.php:166-175`,
  `Resources/Private/Templates/PlayerModule/Qr.html:75-79`.

---

## Frontend: der Zugriffsschutz und die Torseite

Alles in diesem Abschnitt gibt es **nur bei QR-Modus AN**. Bei AUS verhält sich die
Website exakt wie ohne diese Extension.

### F-ACCOUNT-67  Zugriffsschutz — jede Adresse führt auf die Torseite
- **Was:** Ohne gültige Sitzung liefert jede Adresse des Hauses die Anmeldeseite statt
  der gewünschten Seite.
- **Wie ausgelöst:** Aufruf irgendeiner Frontend-Adresse ohne Anmeldung.
- **Soll-Ergebnis:** Die Torseite als HTML, mit Rückgabewert **200** (bewusst kein 401 —
  die Torseite ist kein Fehlerzustand, sondern der beabsichtigte Inhalt für einen Gast).
- **Vorbedingung:** QR-Modus AN; die Adresse ist keine „offene Route" der
  Site-Konfiguration.
- **Beobachtbar an:** HTTP 200 mit `<body class="ca-gate">`; Antwortköpfe
  `Cache-Control: no-store, private` und `X-Robots-Tag: noindex, nofollow`; im Dokument
  `<meta name="robots" content="noindex,nofollow">`.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:112-165`,
  `Classes/Frontend/GatePage.php:99-131`,
  `Resources/Private/Templates/Gate/Index.html`.

### F-ACCOUNT-68  Offene Routen bleiben erreichbar
- **Was:** Adressen, die in der Site-Konfiguration als eigene Route eingetragen sind
  (z. B. `robots.txt`, `llms.txt`, `favicon.ico`), kommen auch ohne Anmeldung durch.
- **Wie ausgelöst:** Aufruf einer solchen Adresse bei QR-Modus AN.
- **Soll-Ergebnis:** Der gewohnte Inhalt statt der Torseite.
- **Vorbedingung:** QR-Modus AN; Eintrag unter `routes` in der Site-Konfiguration.
- **Beobachtbar an:** Der jeweilige Inhalt mit Rückgabewert 200; nicht `<body
  class="ca-gate">`.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:114,214-235`.

### F-ACCOUNT-69  Sitemap-Zeile wird bei QR-Modus AN entfernt
- **Was:** Solange der Saal zu ist, nennt keine ausgelieferte Datei mehr den Verweis auf
  die Sitemap.
- **Wie ausgelöst:** Aufruf einer offenen Route, deren Inhalt eine Zeile `Sitemap: …`
  enthält (typischerweise `robots.txt`), bei QR-Modus AN.
- **Soll-Ergebnis:** Der Inhalt kommt ohne diese Zeile; alles andere bleibt unverändert.
  Bei QR-Modus AUS bleibt die Zeile stehen.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Keine Zeile, die mit `Sitemap:` beginnt, im Antwortkörper.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:116-128,257-267`.

### F-ACCOUNT-70  Anmeldung von Hand (43-stellige Kennung eintippen)
- **Was:** Der Pflichtweg: die Kennung in ein Feld eintippen und „Eintreten" drücken.
  Funktioniert auf jedem Gerät, ohne Kamera und ohne JavaScript.
- **Wie ausgelöst:** Eingabe im Feld „Ihre Kennung" auf der Torseite und Absenden des
  Formulars (`POST` an dieselbe, von Anmeldespuren gesäuberte Adresse).
- **Soll-Ergebnis:** Bei richtiger Kennung: Anmeldung, danach sofortige Umleitung auf
  eine saubere Adresse (HTTP 303), und auf jeder Seite erscheint die Kontenleiste.
- **Vorbedingung:** QR-Modus AN; die Kennung gehört zu einem nicht stillgelegten
  Spielenden mit benutzbarem Schattendatensatz.
- **Beobachtbar an:** `<form class="ca-gate__form" method="post">` mit
  `<input id="ca-gate-token" name="casinoToken" maxlength="43" required autofocus>`;
  nach dem Absenden HTTP 303 und danach `<div class="ca-bar">` im Dokument; Zeile in
  `fe_sessions` für den Schattendatensatz.
- **Umgesetzt in:** `Resources/Private/Templates/Gate/Index.html:57-85`,
  `Classes/Middleware/QrTokenLogin.php:42-67`,
  `Classes/Authentication/PlayerAuthenticationService.php:61-124`,
  `Classes/Middleware/QrGate.php:134-147`.

### F-ACCOUNT-71  Anmeldung über eine Adresse (`?casinoToken=…`)
- **Was:** Wer den QR-Code mit einer beliebigen Kamera-App öffnet, landet auf einer
  Adresse mit der Kennung und ist damit angemeldet — der eigentliche Sinn des Codes.
- **Wie ausgelöst:** Aufruf von `https://<Haus>/?casinoToken=<Kennung>`.
- **Soll-Ergebnis:** Anmeldung ohne Formular; sofortige Umleitung (HTTP 303) auf
  dieselbe Adresse **ohne** die Kennung, damit sie nicht im Verlauf, in der Adresszeile
  oder in einem Lesezeichen hängenbleibt.
- **Vorbedingung:** QR-Modus AN; gültige Kennung. Für diesen Weg stellt die Extension
  das sonst nötige Anfragezeichen selbst aus.
- **Beobachtbar an:** HTTP 303 mit einem `Location`, in dem `casinoToken` nicht mehr
  vorkommt; danach die Kontenleiste auf der Seite.
- **Umgesetzt in:** `Classes/Middleware/QrTokenLogin.php:50-66`,
  `Classes/EventListener/AllowUrlTokenLogin.php:70-86`,
  `Classes/Middleware/QrGate.php:137-145,275-283`.

### F-ACCOUNT-72  Anmeldung per Kamera
- **Was:** Den QR-Code vor die Gerätekamera halten; wird er erkannt, wird die Anmeldung
  von selbst abgeschickt.
- **Wie ausgelöst:** Klick auf „Kamera einschalten" auf der Torseite; danach den Code
  ins Bild halten.
- **Soll-Ergebnis:** Das Kamerabild läuft; alle 250 ms wird geprüft; bei Erkennung steht
  die Kennung im Eingabefeld, die Kamera hält an und das Formular wird abgeschickt.
- **Vorbedingung:** QR-Modus AN; Browser mit eingebauter Erkennung
  (`BarcodeDetector`) — eine eigene Erkennung schreibt diese Extension nicht;
  Kamerafreigabe durch den Browser.
- **Beobachtbar an:** Kippschalter `[data-ca-gate-camera]` mit `aria-pressed="true"`;
  Text in `[data-ca-gate-status]` (`role="status"`): „Die Kamera läuft. Halten Sie den
  Code ins Bild." → „Code erkannt. Sie werden angemeldet."; bei verweigerter Freigabe
  „Der Browser gibt die Kamera nicht frei. Tippen Sie die Kennung ein."
- **Umgesetzt in:** `Resources/Public/JavaScript/gate-scan.js:102-162`,
  `Resources/Private/Templates/Gate/Index.html:104-134`.

### F-ACCOUNT-73  Kamera wieder ausschalten
- **Was:** Derselbe Knopf hält die Kamera wieder an.
- **Wie ausgelöst:** Erneuter Klick auf den Kameraknopf (beschriftet dann „Kamera
  ausschalten"); außerdem automatisch, wenn die Seite verlassen wird.
- **Soll-Ergebnis:** Das Kamerabild endet, die Aufnahme wird freigegeben.
- **Vorbedingung:** Kamera läuft.
- **Beobachtbar an:** `aria-pressed="false"`, Knopfbeschriftung zurück auf „Kamera
  einschalten", Statustext „Die Kamera ist aus."
- **Umgesetzt in:** `Resources/Public/JavaScript/gate-scan.js:82-96,155-162,197`.

### F-ACCOUNT-74  Anmeldung über ein Bild des Codes
- **Was:** Ein bereits aufgenommenes Foto des Codes auswählen — dieselbe eingebaute
  Erkennung, nur auf einem Einzelbild.
- **Wie ausgelöst:** Datei über „Ein Bild des Codes auswählen" wählen.
- **Soll-Ergebnis:** Bei Erkennung steht die Kennung im Feld und das Formular wird
  abgeschickt; sonst die Ansage „Auf dem Bild war kein Code zu finden."
- **Vorbedingung:** QR-Modus AN; Browser mit eingebauter Erkennung.
- **Beobachtbar an:** `<input id="ca-gate-file" type="file" accept="image/*">`; Text in
  `[data-ca-gate-status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/gate-scan.js:166-193`,
  `Resources/Private/Templates/Gate/Index.html:136-139`.

### F-ACCOUNT-75  Kamera- und Bildweg erscheinen nur, wenn sie gehen
- **Was:** Fehlt dem Browser die eingebaute Erkennung, erscheint der ganze
  Kamerabereich gar nicht — stattdessen steht ein ruhiger Satz da, keine Fehlermeldung
  und kein toter Knopf.
- **Wie ausgelöst:** Öffnen der Torseite in einem Browser ohne `BarcodeDetector` (oder
  ohne JavaScript).
- **Soll-Ergebnis:** Sichtbar: „Auf diesem Gerät geben Sie die Kennung von Hand ein.";
  der Scan-Bereich bleibt verborgen. Bringt der Browser die Erkennung mit, ist es
  umgekehrt.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** `<section class="ca-gate__scan" data-ca-gate-scan hidden>` im
  ausgelieferten HTML; `[data-ca-gate-handonly]` sichtbar. Nach dem Laden im fähigen
  Browser vertauscht. Kein `disabled` irgendwo.
- **Umgesetzt in:** `Resources/Public/JavaScript/gate-scan.js:38-69`,
  `Resources/Private/Templates/Gate/Index.html:100-104`.

### F-ACCOUNT-76  Meldung „Diese Kennung kennt das Haus nicht"
- **Was:** Ein fehlgeschlagener Anmeldeversuch führt zurück auf die Torseite mit einer
  Meldung, die bewusst nie verrät, ob es die Kennung gibt.
- **Wie ausgelöst:** Absenden einer falschen oder unbekannten Kennung.
- **Soll-Ergebnis:** Die Torseite mit dem Satz „Diese Kennung kennt das Haus nicht.
  Bitte prüfen Sie die Groß- und Kleinschreibung." Der Text nennt **nie** die eingegebene
  Kennung.
- **Vorbedingung:** QR-Modus AN; es wurde überhaupt eine Kennung mitgeschickt.
- **Beobachtbar an:** `<p class="ca-gate__error" id="ca-gate-error" role="alert">` mit
  diesem Text; das Eingabefeld trägt dann `aria-invalid="true"` und
  `aria-describedby="ca-gate-hint ca-gate-error"`.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:299-315`,
  `Resources/Private/Templates/Gate/Index.html:45-49,63-77`,
  `Resources/Private/Language/locallang.xlf:28-30`.

### F-ACCOUNT-77  Meldung „Die Seite lag zu lange offen"
- **Was:** Lag die Torseite so lange offen, dass ihr Anfragezeichen nicht mehr gilt,
  sagt sie das und bittet um einen erneuten Versuch.
- **Wie ausgelöst:** Absenden des Formulars ohne gültiges Anfragezeichen.
- **Soll-Ergebnis:** Die Torseite mit dem Satz „Die Seite lag zu lange offen. Bitte
  versuchen Sie es gleich noch einmal."
- **Vorbedingung:** QR-Modus AN; Formularweg (der Adressweg kann diesen Fall nie
  auslösen).
- **Beobachtbar an:** `<p class="ca-gate__error">` mit diesem Text.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:304-313`,
  `Classes/Frontend/GatePage.php:75,147-164`.

### F-ACCOUNT-78  Begrenzung der Anmeldeversuche
- **Was:** Nach zu vielen Fehlversuchen in kurzer Zeit nimmt das Haus vorübergehend
  keinen weiteren Versuch mehr an.
- **Wie ausgelöst:** Mehr als 10 Anmeldeversuche innerhalb einer Minute von derselben
  Absenderadresse.
- **Soll-Ergebnis:** Die Torseite mit dem Satz „Zu viele Versuche. Bitte warten Sie eine
  Minute." und Rückgabewert **429** — kein roher Ausnahmefehler.
- **Vorbedingung:** QR-Modus AN. Die beiden Einstellwerte stehen in `ext_localconf.php`,
  nicht in der Datenbank; mit der Extension sind sie weg.
- **Beobachtbar an:** HTTP-Status 429 zusammen mit `<p class="ca-gate__error">` und dem
  genannten Text.
- **Umgesetzt in:** `ext_localconf.php:117-118`,
  `Classes/Middleware/QrTokenLogin.php:69-84`, `Classes/Frontend/GatePage.php:76`.

### F-ACCOUNT-79  Protokolleintrag bei fehlgeschlagener Anmeldung — ohne Kennung
- **Was:** Jeder Fehlversuch wird protokolliert, aber ausdrücklich **ohne** die
  eingegebene Kennung: nur Absenderadresse, Länge und ob die Eingabe überhaupt
  wohlgeformt war.
- **Wie ausgelöst:** Jeder fehlgeschlagene Frontend-Anmeldeversuch.
- **Soll-Ergebnis:** Eine Warnung im TYPO3-Protokoll der Form „Fehlgeschlagene Anmeldung
  am Casino von {ip}. Kennung {laenge} Zeichen lang, {form} übermittelt." — `form` ist
  „wohlgeformt" oder „unbrauchbar".
- **Vorbedingung:** Frontend-Anmeldung (Backend-Anmeldungen werden übergangen).
- **Beobachtbar an:** Zeile im TYPO3-Protokoll ohne jede Kennung im Klartext.
- **Umgesetzt in:** `Classes/EventListener/LogFailedLogin.php:44-59`.

### F-ACCOUNT-80  Abweisung einer Sitzung, deren Konto nicht mehr gilt
- **Was:** Wird ein Spielender gelöscht oder stillgelegt, während er angemeldet ist,
  wird seine Sitzung beim nächsten Seitenaufruf beendet.
- **Wie ausgelöst:** Seitenaufruf mit einer Sitzung, deren Spielender nicht mehr
  auffindbar oder `hidden` ist.
- **Soll-Ergebnis:** Die Sitzung wird abgemeldet; die Torseite erscheint.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Die Zeile in `fe_sessions` verschwindet; die Antwort ist die
  Torseite statt der gewünschten Seite.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:196-203`.

### F-ACCOUNT-81  Sitzungsablauf
- **Was:** Eine Sitzung, die zu lange nicht benutzt wurde, gilt nicht mehr — gerechnet
  wird wie im TYPO3-Kern, unabhängig davon, ob die Zeile schon aufgeräumt wurde.
- **Wie ausgelöst:** Zeitablauf ohne Seitenaufruf (`ses_tstamp + FE.sessionTimeout`
  liegt in der Vergangenheit).
- **Soll-Ergebnis:** Die Person gilt als nicht mehr angemeldet; sie erscheint weder in
  der Liste „Wer ist angemeldet" noch als „angemeldet" im Modul „Spielende"; ihr
  liegengebliebenes Gerätegeld wird beim nächsten Aufräumgang in die Kasse gebucht.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Fehlen in der Online-Liste des QR-Modus-Moduls; die drei
  Geldspalten nach dem Aufräumgang (F-ACCOUNT-36).
- **Umgesetzt in:** `Classes/Service/PlayerSessionService.php:133-146`,
  `Classes/Service/PlayerSessionService.php:112-126`.

### F-ACCOUNT-82  „Zuletzt gesehen" wird mitgeführt
- **Was:** Bei jedem Seitenaufruf einer angemeldeten Person wird der Zeitstempel
  „zuletzt gesehen" nachgehalten — höchstens alle 5 Sekunden, um Schreibvorgänge zu
  sparen.
- **Wie ausgelöst:** Jeder Frontend-Seitenaufruf einer angemeldeten Person.
- **Soll-Ergebnis:** Spalte `last_seen` liegt nie mehr als wenige Sekunden zurück;
  das QR-Modus-Modul zeigt daraus „zuletzt gesehen vor %d Sekunden".
- **Vorbedingung:** QR-Modus AN; angemeldet.
- **Beobachtbar an:** Spalte `last_seen` in `tx_casinoaccount_player`; Angabe in
  `<span class="ca-qrmode__seen">`.
- **Umgesetzt in:** `Classes/Middleware/QrGate.php:135`,
  `Classes/Service/AccountBookkeeper.php:39,97-115`.

### F-ACCOUNT-83  Torseite in der Gestaltung des Hauses
- **Was:** Die Torseite benutzt die Farb- und Maßwerte der übrigen Website, damit sie
  nicht wie eine Fremdseite wirkt.
- **Wie ausgelöst:** Öffnen der Torseite.
- **Soll-Ergebnis:** Dieselben Farben und Maße wie im Saal; die Seitensprache steht auf
  der Sprache der Site (Rückfall „de").
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Zwei `<link rel="stylesheet">` in dieser Reihenfolge:
  `tokens.css` aus `casino_startpage`, dann `frontend.css` dieser Extension;
  `<html lang="…">`.
- **Umgesetzt in:** `Classes/Frontend/GatePage.php:117-120,183-187`,
  `Resources/Private/Templates/Gate/Index.html:1-24`.

---

## Frontend: die Kontenleiste

Alles in diesem Abschnitt gibt es **nur bei QR-Modus AN und angemeldeter Person**. Bei
AUS wird gar nichts eingehängt.

### F-ACCOUNT-84  Die Kontenleiste auf jeder Seite
- **Was:** Oben auf jeder Seite steht eine schmale Leiste mit dem Namen und dem
  Gesamtvermögen der angemeldeten Person sowie einem Knopf „Abmelden".
- **Wie ausgelöst:** Jeder Seitenaufruf im angemeldeten Zustand.
- **Soll-Ergebnis:** Die Leiste erscheint; die Zahl ist die Summe der drei Geldwerte,
  mit Tausenderpunkt und der Einheit „Kredite". Ausdrücklich **nicht** angezeigt: die
  Rolle und die Kennung.
- **Vorbedingung:** QR-Modus AN; angemeldet; die Antwort ist eine fertige HTML-Seite mit
  Rückgabewert 200 (Bilder, JSON, Sitemaps und Umleitungen werden nicht angefasst).
- **Beobachtbar an:** `<div class="ca-bar" data-ca-bar role="complementary" id="ca-bar"
  aria-label="Ihr Konto">` unmittelbar vor `</body>`; `<span class="ca-bar__total"
  data-ca-bar-total data-value="<Gesamtvermögen>">`; Antwortkopf
  `Cache-Control: no-store, private`.
- **Umgesetzt in:** `Classes/Middleware/AccountBar.php:65-189,196-225`,
  `Resources/Private/Templates/AccountBar/Index.html:77-99`.

### F-ACCOUNT-85  „Abmelden"
- **Was:** Meldet die Person ab und bucht dabei alles, was noch im Gerät oder auf der
  Risiko-Leiter liegt, in die Kasse zurück.
- **Wie ausgelöst:** Klick auf „Abmelden" (ein Absendeformular, kein Verweis — damit
  kein Vorauslader oder Lesezeichen jemanden versehentlich abmeldet).
- **Soll-Ergebnis:** Die Sitzung endet; `balance_machine` und `balance_win` stehen auf
  0, `balance_cash` ist um deren Summe gestiegen; anschließend eine Umleitung (HTTP 303)
  und die Torseite.
- **Vorbedingung:** QR-Modus AN; angemeldet.
- **Beobachtbar an:** `<form class="ca-bar__form" method="post">` mit
  `<input type="hidden" name="logintype" value="logout">` und
  `<button class="ca-bar__logout">`; danach: keine Zeile mehr in `fe_sessions`, die drei
  Geldspalten wie beschrieben, HTTP 303.
- **Umgesetzt in:** `Resources/Private/Templates/AccountBar/Index.html:95-98`,
  `Classes/EventListener/BookOnLogout.php:59-76`,
  `Classes/Middleware/QrGate.php:150-156`.

### F-ACCOUNT-86  Sprunglink „Zur Kontoleiste springen"
- **Was:** Ein Link ganz am Anfang des Dokuments, der mit der Tastatur direkt zur
  Kontenleiste führt — sonst lägen auf manchen Seiten über 80 Tabulatorstationen davor.
- **Wie ausgelöst:** Erster Tabulatorsprung auf einer Seite.
- **Soll-Ergebnis:** Der Link wird sichtbar, sobald er den Tastaturfokus hat, und führt
  auf `#ca-bar`.
- **Vorbedingung:** QR-Modus AN; angemeldet.
- **Beobachtbar an:** `<a href="#ca-bar" class="ca-bar__skiplink">Zur Kontoleiste
  springen</a>` unmittelbar hinter dem öffnenden `<body>`.
- **Umgesetzt in:** `Classes/Middleware/AccountBar.php:139-148`,
  `Resources/Private/Language/locallang.xlf:89-91`.

### F-ACCOUNT-87  Der Zustandsblock im Kopf jeder Seite
- **Was:** In jede Seite wird unmittelbar hinter dem öffnenden `<head>` ein
  JSON-Datenblock eingespeist, an dem die Geräte erkennen, dass der Server das Guthaben
  führt — und mit welchen Adressen sie buchen.
- **Wie ausgelöst:** Jeder Seitenaufruf im angemeldeten Zustand.
- **Soll-Ergebnis:** Der Block enthält die drei Beträge, ihre Summe, die drei
  vollständigen Endpunkt-Adressen, ob die Person Admin ist, den Höchststand je Betrag
  und die Gerätespeicherstände. Ausdrücklich **kein** Name, **keine** Kennung, **keine**
  Rolle.
- **Vorbedingung:** QR-Modus AN; angemeldet; die Seite hat einen `<head>`.
- **Beobachtbar an:** `<script type="application/json" data-ca-state>` als erstes Kind
  des `<head>`, mit den Schlüsseln `endpunkte`, `kasse`, `geraet`, `gewinn`, `gesamt`,
  `admin`, `max`, `speicher`.
- **Umgesetzt in:** `Classes/Middleware/AccountBar.php:105-127`,
  `Classes/Service/AccountState.php:40-59`.

### F-ACCOUNT-88  Kennzeichnung als Admin
- **Was:** Gehört die Leiste einem Admin, trägt sie ein zusätzliches Merkmal — daran
  hängt, ob die Aufladeteile des Guthaben-Leuchtschilds im Saal sichtbar sind.
- **Wie ausgelöst:** Anmeldung einer Person mit `is_admin = 1`.
- **Soll-Ergebnis:** Für Nicht-Admins werden die Aufladeteile ausgeblendet. Das ist eine
  Bedienbarkeitszusage — der eigentliche Schutz ist die serverseitige Admin-Grenze
  (F-ACCOUNT-23 bis 25).
- **Vorbedingung:** QR-Modus AN; angemeldet.
- **Beobachtbar an:** Attribut `data-ca-admin` auf `<div class="ca-bar">`; zusätzlich
  `admin: true` im Zustandsblock.
- **Umgesetzt in:** `Resources/Private/Templates/AccountBar/Index.html:79`,
  `Classes/Service/AccountState.php:55`.

### F-ACCOUNT-89  Die Zahl läuft im Betrieb mit
- **Was:** Nach jeder Buchung ändert sich die Zahl in der Leiste sofort, ohne dass die
  Seite neu geladen wird.
- **Wie ausgelöst:** Ereignis `casino:konto` mit dem neuen Gesamtwert (gesendet vom
  Gerät, nachdem der Server geantwortet hat).
- **Soll-Ergebnis:** Die sichtbare Zahl und das Rohwert-Attribut stehen auf dem neuen
  Stand.
- **Vorbedingung:** QR-Modus AN; angemeldet; JavaScript aktiv.
- **Beobachtbar an:** `data-value` auf `[data-ca-bar-total]` und der Text in
  `[data-ca-bar-total-value]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:119-140`.

### F-ACCOUNT-90  Gedrosselte Ansage für Bildschirmleser
- **Was:** Ein zweites, optisch verborgenes Element sagt den vollständigen Satz
  „Gesamtvermögen … Kredite" an — höchstens alle 2 Sekunden, damit ein Bildschirmleser
  nicht ununterbrochen redet.
- **Wie ausgelöst:** Wie F-ACCOUNT-89.
- **Soll-Ergebnis:** Die sichtbare Zahl läuft ohne Verzögerung mit; die Ansage kommt
  gebündelt, aber bei jeder tatsächlichen Änderung.
- **Vorbedingung:** wie F-ACCOUNT-89.
- **Beobachtbar an:** `<span class="ca-visually-hidden" role="status" aria-atomic="true"
  data-ca-bar-announce>` mit dem vollständigen Satz; der sichtbare Teil trägt
  ausdrücklich **kein** `role="status"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:56-100,139`,
  `Resources/Private/Templates/AccountBar/Index.html:86`.

### F-ACCOUNT-91  Die Sperranzeige bei Verbindungsabbruch
- **Was:** Antwortet der Server nicht mehr, sperrt sich die ganze Seite mit einem
  echten Dialogfenster; der Zustand steht als Satz da, nicht als Farbe.
- **Wie ausgelöst:** Ereignis `casino:konto-gesperrt` mit einem Grund (`offline` oder
  Serverfehler) — ausgelöst nur, wenn der Browser die Antwort **nicht** erkennt
  (Netzabbruch, 5xx, unlesbares JSON). Eine abgelehnte Buchung (HTTP 200 mit
  `ok: false`) löst sie ausdrücklich **nicht** aus.
- **Soll-Ergebnis:** Der Rest der Seite ist für Maus, Tastatur und Hilfsmittel
  unerreichbar; der Fokus steht im Knopf „Erneut versuchen"; Escape schließt **nicht**.
  Im Text steht je nach Grund „Die Verbindung zum Konto ist unterbrochen. Es wird nichts
  gebucht, solange diese Meldung steht." oder „Der Server hat mit einem Fehler
  geantwortet. …"
- **Vorbedingung:** QR-Modus AN; angemeldet; JavaScript aktiv.
- **Beobachtbar an:** `<dialog class="ca-lock" data-ca-lock>` steht offen (`open`);
  Text in `[data-ca-lock-text]` (`role="status"`).
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:142-159`,
  `Resources/Private/Templates/AccountBar/Index.html:140-150`.

### F-ACCOUNT-92  „Erneut versuchen" in der Sperranzeige
- **Was:** Schickt die liegengebliebene Buchung noch einmal hinaus.
- **Wie ausgelöst:** Klick auf „Erneut versuchen".
- **Soll-Ergebnis:** Im Text steht „Die liegengebliebene Buchung wird noch einmal
  versucht …"; das Gerät sendet die Buchung erneut. Kam die erste Buchung doch an, wird
  sie als doppelt erkannt (F-ACCOUNT-09) und nichts wird zweimal gebucht.
- **Vorbedingung:** Sperranzeige ist offen.
- **Beobachtbar an:** Ereignis `casino:konto-wiederholen`; geänderter Text in
  `[data-ca-lock-text]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:161-167`.

### F-ACCOUNT-93  „Seite neu laden" in der Sperranzeige
- **Was:** Lädt die Seite neu — der Weg heraus, wenn das erneute Senden nicht hilft.
- **Wie ausgelöst:** Klick auf „Seite neu laden".
- **Soll-Ergebnis:** Die Seite wird neu geladen; der Zustandsblock trägt danach den
  echten Serverstand.
- **Vorbedingung:** Sperranzeige ist offen.
- **Beobachtbar an:** Neuer Seitenaufruf im Browser.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:168-170`.

### F-ACCOUNT-94  Sperranzeige schließt sich wieder
- **Was:** Ist die Verbindung wieder da, verschwindet die Sperre von selbst.
- **Wie ausgelöst:** Ereignis `casino:konto-frei`.
- **Soll-Ergebnis:** Das Dialogfenster schließt; die Seite ist wieder bedienbar.
- **Vorbedingung:** Sperranzeige war offen.
- **Beobachtbar an:** `<dialog class="ca-lock">` trägt kein `open` mehr.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-live.js:154-156`.

---

## Beobachtungen, nicht bewertet

- „Angemeldet" bedeutet in dieser Extension an zwei Stellen Verschiedenes: die
  Modul-Listen rechnen mit einer gültigen Sitzung in `fe_sessions`
  (`PlayerSessionService`), die Warnung beim Speichern des Guthabens dagegen mit
  `Player::isOnline()` — `last_seen` jünger als 30 Sekunden.
- Die README zählt die drei Anmeldewege als „1. Von Hand, 2. Kamera, 3. Bild"; die
  Kommentare in `Resources/Private/Templates/Gate/Index.html` nennen die Handeingabe
  „WEG 3" und Kamera/Bild „WEGE 1 UND 2".
- Der Schlüssel im Rumpf von `/casino-konto/feld` heißt `stände` — mit Umlaut
  (`Classes/Middleware/BookingEndpoint.php:192`).
- Die README beschreibt den Coin Pusher als seit dem 2026-09-11 abgeschrieben und
  deaktiviert; der Gerätespeicher-Endpunkt `/casino-konto/feld` und die Tabelle
  `tx_casinoaccount_coinfield` bestehen weiter.
- Die README nennt in „Der Buchungsendpunkt" als neue Spalte nur `booking_client`;
  `ext_tables.sql` führt daneben `booking_seq` und `last_seen`.
- Die README beschreibt einen offenen, hier nicht behobenen Fund aus
  `probe-abend.mjs` (Lobby-Nummer um eins zu niedrig), dessen Ursache sie in
  `casino_lobby` verortet.
- Die README verzeichnet zu `BookOnLogout` einen behobenen Geldfehler; der Quelltext
  liest die Kennung inzwischen über `$event->getUserSession()?->getUserId()`.
- Die README sagt zur Torseite nichts über den Rückgabewert; der Quelltext liefert
  bewusst 200 (und 429 bei zu vielen Versuchen), nicht 401
  (`Classes/Middleware/QrGate.php:158-164`).

---

<!-- ===================== casino_startpage ===================== -->

# Funktionsinventur: `casino_startpage` (Site Package)

Das Site Package trägt den Vegas-Saal als Startseite, die Geräte-Registry, über die sich
Automaten und Tische selbst eintragen, und alle geteilten Bausteine des Hauses (Kasse,
Gerätekredit, Klang, Risiko-Leiter, Tischbausteine, austauschbare Konto-Rückseite).
Vieles hier ist kein unmittelbar bedienbares Gerät, sondern ein Baustein, den andere
Extensions benutzen — bei diesen steht unter „Wie ausgelöst" und „Beobachtbar an" jeweils,
wie sich der Baustein am Gerät äußert (Taste, `data-`Attribut, Ereignis).

Stand des Quelltexts: Version 0.5.0 (alpha), TYPO3 13.4, klassische Installation.

---

## Saal und Seitengerüst

### F-STARTPAGE-001  Vegas-Saal als Startseite
- **Was:** Die Startseite wird als Spielsaal ausgegeben — Wandband mit Leuchtreklame oben, darunter der Boden mit den Gerätekacheln.
- **Wie ausgelöst:** Aufruf der Seite, deren Backend-Layout „Startseite (Spielsaal)" (`pagets__startseite`) gesetzt ist.
- **Soll-Ergebnis:** PAGEVIEW rendert `Pages/Startseite.html` über `Layouts/Default.html`; die Seite enthält Leuchtschild, Guthabenschild und die Inhaltsspalte im Geräte-Raster.
- **Vorbedingung:** Backend-Layout `startseite` auf der Seite gesetzt; Site Set `phomo17/casino-kunterbunt` der Site zugewiesen.
- **Beobachtbar an:** `div.ck-room` > `header.ck-room__marquee` + `main#ck-main.ck-room__hall`; darin `div.ck-hall__content.ck-hall__content--devices`. Seitentitel ohne vorangestellten Site-Titel (`config.showWebsiteTitle = 0` nur bei diesem Layout).
- **Umgesetzt in:** `Configuration/Sets/CasinoKunterbunt/page.tsconfig:7-28`, `Configuration/Sets/CasinoKunterbunt/setup.typoscript:3-31,83-85`, `Resources/Private/PageView/Pages/Startseite.html:1-13`, `Resources/Private/PageView/Layouts/Default.html:14-22`

### F-STARTPAGE-002  Unterseite mit Messingschild und Rückweg
- **Was:** Jede Seite ohne eigenes Backend-Layout bekommt statt der Leuchtreklame ein Messingschild mit dem Seitentitel und einem Verweis zurück in den Saal.
- **Wie ausgelöst:** Aufruf einer Seite ohne Backend-Layout `startseite` (z. B. eine Geräteseite).
- **Soll-Ergebnis:** `Pages/Default.html` rendert `Hall/PageHead`; die Inhaltsspalte steht im gewöhnlichen Fluss (`--plain` statt `--devices`).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `div.ck-pagehead` mit `h1.ck-pagehead__title` (Seitentitel) und `a.ck-pagehead__back` mit dem Text „Zurück in den Saal"; Ziel ist die oberste Seite der Rootline (`lib.rootPageUid`, `leveluid : 0`), nicht eine feste UID.
- **Umgesetzt in:** `Resources/Private/PageView/Pages/Default.html:1-9`, `Resources/Private/PageView/Partials/Hall/PageHead.html:16-21`, `Configuration/Sets/CasinoKunterbunt/setup.typoscript:125-131`

### F-STARTPAGE-003  Leuchtreklame mit einstellbarem Haustitel
- **Was:** Über dem Saal brennt ein Neonschild mit dem Namen des Hauses; der Text ist eine Site-Einstellung.
- **Wie ausgelöst:** Rendern der Startseite; Text aus der typisierten Site-Einstellung `casinoKunterbunt.hall.title` (Vorgabe `CASINO KUNTERBUNT`), im Backend unter Site-Einstellungen pflegbar.
- **Soll-Ergebnis:** Der eingestellte Text erscheint als einzige `h1` der Seite, zweilagig (unbeleuchtete Röhre + brennende Röhre) mit Flackern.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `div.ck-sign > div.ck-sign__board > h1.ck-sign__text[data-text="<Titel>"] > span.ck-sign__tube` — der Titel steht zweimal: als `data-text` und als sichtbarer Text.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Hall/Sign.html:18-22`, `Configuration/Sets/CasinoKunterbunt/settings.definitions.yaml:6-10`

### F-STARTPAGE-004  Sprunglink „zum Inhalt"
- **Was:** Erstes Element jeder Seite ist ein Verweis, der die bis zu sieben Fokusstationen des Leuchtschilds überspringt.
- **Wie ausgelöst:** Tabulatortaste als allererste Eingabe auf der Seite.
- **Soll-Ergebnis:** Der zuvor optisch verborgene Verweis wird sichtbar; Betätigen springt zu `#ck-main`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `a.ck-skiplink[href="#ck-main"]` als erstes Kind des Bodys; Zielelement `main#ck-main`.
- **Umgesetzt in:** `Resources/Private/PageView/Layouts/Default.html:12-13`, `Resources/Public/Css/base.css` (`.ck-skiplink`)

### F-STARTPAGE-005  Quelltexthinweis im Seitenfuß (AGPL § 13)
- **Was:** Unter jeder Seite steht ein Hinweis mit Verweis auf den Quelltext des Projekts.
- **Wie ausgelöst:** jedes Rendern einer Seite; kein Zutun nötig.
- **Soll-Ergebnis:** Ein Fußbereich außerhalb des Saals (damit er einem bildschirmfüllenden Gerät keine Höhe wegnimmt) mit einem Verweis auf das GitHub-Projekt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `footer.ck-colophon` mit `a.ck-colophon__source[rel="noopener"]`, außerhalb von `div.ck-room`.
- **Umgesetzt in:** `Resources/Private/PageView/Layouts/Default.html:34-39`, `Resources/Private/Language/locallang.xlf` (`hall.colophon.*`)

### F-STARTPAGE-006  Geräte-Raster des Saals (4 / 2 / 1 pro Reihe)
- **Was:** Die Gerätekacheln stellen sich je nach Bildschirmbreite zu viert, zu zweit oder einzeln in eine Reihe.
- **Wie ausgelöst:** Rendern der Startseite mit `layout: 'devices'`; Breitenwechsel des Fensters.
- **Soll-Ergebnis:** Umbruch des Rasters ohne waagerechtes Scrollen; auf Unterseiten (`plain`) gilt gewöhnlicher Inhaltsfluss.
- **Vorbedingung:** mindestens ein Inhaltselement in der Spalte `main`.
- **Beobachtbar an:** `div.ck-hall__content--devices` bzw. `--plain`; die Spaltenzahl steht in `base.css`. Ohne Inhaltselemente wird der Container gar nicht ausgegeben.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Content/Column.html:13-19`, `Resources/Public/Css/base.css`

### F-STARTPAGE-007  Bildschirmfüllendes Gerät (`ck-room-fill`)
- **Was:** Ein Gerät auf seiner eigenen Seite kann verlangen, dass der Saal genau eine Bildschirmhöhe hoch wird, damit das Gerät ohne Scrollen vollständig sichtbar ist.
- **Wie ausgelöst:** Das Inhaltselement des Geräts setzt die Klasse `ck-room-fill` auf sein äußerstes Element.
- **Soll-Ergebnis:** Der Saal ordnet sich als Spalte von einer Bildschirmhöhe: Wandband oben in seiner Höhe, Boden mit dem ganzen Rest; das Gerät bekommt einen Kasten bekannter Höhe. Ohne die Klasse ändert sich nichts; auf der Startseite wird sie nicht gesetzt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Klasse `ck-room-fill` am Geräteelement; Seitenhöhe = Bildschirmhöhe, keine senkrechte Bildlaufleiste im Saal.
- **Umgesetzt in:** `Resources/Public/Css/base.css` (`.ck-room-fill`), README „Vertrag für ein bildschirmfüllendes Gerät"

### F-STARTPAGE-008  Symbol im Browser-Reiter
- **Was:** Die Seite liefert ein selbst gezeichnetes SVG-Favicon aus.
- **Wie ausgelöst:** jedes Rendern einer Seite.
- **Soll-Ergebnis:** Der Browser zeigt das Symbol; die frühere 404-Anfrage auf `/favicon.ico` entfällt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<link rel="icon" href="…/casino_startpage/Resources/Public/Icons/Favicon.svg">` im `<head>`.
- **Umgesetzt in:** `Configuration/Sets/CasinoKunterbunt/setup.typoscript:50`, `Resources/Public/Icons/Favicon.svg`

### F-STARTPAGE-009  Fehlerseite 404 „Zurück in den Saal"
- **Was:** Eine unbekannte Adresse liefert eine eigene, deutsche Fehlerseite im Hausstil statt der eingebauten TYPO3-Seite.
- **Wie ausgelöst:** Aufruf einer nicht vorhandenen Adresse (HTTP 404).
- **Soll-Ergebnis:** Vollständiges eigenständiges HTML-Dokument mit `<html lang="de-DE">`, `<meta name="robots" content="noindex, follow">`, Hausfarben (`tokens.css`/`base.css` über feste Pfade) und einem Verweis „Zurück in den Saal" auf `/`.
- **Vorbedingung:** `errorHandling` mit `errorCode: 404` und `Fluid`-Behandler in `typo3conf/sites/casino-kunterbunt/config.yaml` (liegt außerhalb dieser Extension).
- **Beobachtbar an:** HTTP-Status 404 und im Rumpf `lang="de-DE"`, der Text „Zurück in den Saal", Verweisziel `/`.
- **Umgesetzt in:** `Resources/Private/Templates/PageError/PageNotFound.html:1-69`

---

## Geräte-Registry und Gerätekacheln

### F-STARTPAGE-010  Geräte-Registry: ein Gerät meldet sich selbst an
- **Was:** Eine fremde Extension trägt ihr Gerät (Automat oder Tisch) mit einem einzigen Aufruf in den Saal ein; das Site Package kennt kein einzelnes Gerät.
- **Wie ausgelöst:** `AutomatRegistry::register(new Automat(identifier, title, description, extensionKey, cabinetPartial, gattung))` in der `ext_localconf.php` der Geräte-Extension.
- **Soll-Ergebnis:** Das Gerät steht in der Backend-Auswahlliste des Inhaltselements „Casino-Gerät", und sein Partial-Verzeichnis `EXT:<key>/Resources/Private/Partials/` hängt ab Index 100 an `tt_content.casino_automat.partialRootPaths` (jedes Verzeichnis genau einmal, eigener Index je Gerät). Ein bereits vorhandener Schlüssel wird überschrieben.
- **Vorbedingung:** Geräte-Extension hängt in `ext_emconf.php` von `casino_startpage` (`0.5.0-0.99.99`) ab, damit die Ladereihenfolge stimmt; danach einmal `cache:flush`.
- **Beobachtbar an:** Der Gerätename erscheint im Auswahlfeld `tx_casinostartpage_automat`; im Frontend rendert die Kachel `div.ck-slot[data-automat="<identifier>"]`. Unbekannter Schlüssel → `get()` liefert `null`, das Template gibt nichts aus (kein Fehler).
- **Umgesetzt in:** `Classes/Automat/AutomatRegistry.php:78-126`, `Classes/Automat/Automat.php:44-91`

### F-STARTPAGE-011  Schlüsselprüfung beim Anmelden
- **Was:** Ein fehlerhaft angemeldetes Gerät bricht beim Anmelden hörbar ab, statt still falsch zu laufen.
- **Wie ausgelöst:** `new Automat(...)` mit ungültigen Werten.
- **Soll-Ergebnis:** `InvalidArgumentException` — Code `1788220801` (Schlüssel nicht `[a-z0-9_]{1,64}`), `1788220802` (Extension-Key ungültig), `1788220803` (Name leer), `1788220804` (Gehäuse-Partial leer).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Ausnahme mit der jeweiligen Nummer im TYPO3-Fehlerbild bzw. Log.
- **Umgesetzt in:** `Classes/Automat/Automat.php:54-80`

### F-STARTPAGE-012  Zwei Gattungen: Automat und Tisch
- **Was:** Der Saal zeigt stehende Automaten und liegende Tische gleichrangig, baut ihnen aber unterschiedliche Bühnen.
- **Wie ausgelöst:** Argument `gattung:` bei `register()` — `Gattung::Automat` (Vorgabe) oder `Gattung::Tisch`.
- **Soll-Ergebnis:** Automat: Podest, Schattenwurf, hochkant, viewBox `0 0 100 160`. Tisch: kein Podest, breiter Bodenschatten, quer, viewBox `0 0 160 100`. Ohne Angabe gilt Automat, deshalb laufen vor Teil C angemeldete Geräte unverändert.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Am Kachelrumpf `div.ck-slot.ck-slot--automat` bzw. `ck-slot--tisch` und `data-gattung="automat"` / `"tisch"`.
- **Umgesetzt in:** `Classes/Automat/Gattung.php:39-70`, `Resources/Private/ContentElements/CasinoAutomat.html:35-37`

### F-STARTPAGE-013  Gerätekachel im Saal, verlinkt auf die Geräteseite
- **Was:** Jedes aufgestellte Gerät erscheint als anklickbare Kachel mit gezeichnetem Gehäuse und sichtbarem Namensschild.
- **Wie ausgelöst:** Ein Inhaltselement „Casino-Gerät" (`CType casino_automat`) auf der Saal-Seite, mit gewähltem Gerät und gewählter Zielseite; Klick oder Eingabetaste auf der Kachel.
- **Soll-Ergebnis:** Der Browser wechselt auf die im Feld „Zielseite" hinterlegte Seite. Ohne hinterlegte oder auflösbare Zielseite wird der Inhalt unverlinkt ausgegeben (kein `<a>`).
- **Vorbedingung:** Gerät angemeldet (F-STARTPAGE-010), Schlüssel im Datensatz gesetzt.
- **Beobachtbar an:** `div.ck-slot[data-automat][data-gattung]` > `a.ck-slot__link` > `span.ck-slot__stage` (Gehäuse-SVG) + `span.ck-slot__plate` (Name). Erreichbarer Name des Verweises = Text des Namensschilds; das SVG trägt `aria-hidden="true"` und hat kein `<title>`.
- **Umgesetzt in:** `Resources/Private/ContentElements/CasinoAutomat.html:35-56`, `Classes/DataProcessing/AutomatProcessor.php:36-57`

### F-STARTPAGE-014  Platzhalter-Gehäuse, wenn ein Gerät keines mitbringt
- **Was:** Fehlt das Gehäuse-Partial einer Geräte-Extension, zeichnet der Saal ein gattungsgerechtes Ersatzgehäuse statt einer Lücke oder eines Fehlers.
- **Wie ausgelöst:** Rendern einer Kachel, deren Partial `<cabinetPartial>.html` nicht existiert.
- **Soll-Ergebnis:** Gattung Automat → Standautomat mit Walzenfenster, Gewinnplan, Hebel (`Hall/CabinetPlaceholder`). Gattung Tisch → Tuch von oben mit sechs Setzfeldern und Chipstapel (`Hall/TablePlaceholder`). Keine Ausnahme, keine leere Kachel.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `span.ck-cabinet.ck-cabinet--placeholder` bzw. `span.ck-cabinet.ck-cabinet--table-placeholder` mit `svg.ck-cabinet__drawing[viewBox="0 0 100 160"]` bzw. `[viewBox="0 0 160 100"]`.
- **Umgesetzt in:** `Resources/Private/ContentElements/CasinoAutomat.html:40-49`, `Resources/Private/PageView/Partials/Hall/CabinetPlaceholder.html:11-59`, `Resources/Private/PageView/Partials/Hall/TablePlaceholder.html:14-58`

### F-STARTPAGE-015  Gerät verschwindet folgenlos
- **Was:** Ein deinstalliertes oder umbenanntes Gerät hinterlässt keine kaputte Seite.
- **Wie ausgelöst:** Inhaltselement mit einem Schlüssel, den die Registry nicht (mehr) kennt; oder gar kein Schlüssel gewählt.
- **Soll-Ergebnis:** Das Inhaltselement gibt nichts aus — kein Fehler, kein Platzhalter, keine Lücke im Quelltext. Es wird bewusst nichts geloggt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Im ausgelieferten HTML fehlt jede `div.ck-slot` zu diesem Datensatz; der Saal rückt zusammen.
- **Umgesetzt in:** `Classes/DataProcessing/AutomatProcessor.php:49-55`, `Resources/Private/ContentElements/CasinoAutomat.html:35`

---

## Rückseite: Backend-Pflege

### F-STARTPAGE-016  Inhaltselement „Casino-Automat" anlegen
- **Was:** Der Redakteur stellt ein Gerät in den Saal, indem er ein Inhaltselement dieses Typs anlegt.
- **Wie ausgelöst:** Backend → Seite → Neues Inhaltselement → Gruppe „Casino Kunterbunt" (steht ganz oben) → „Casino-Automat".
- **Soll-Ergebnis:** Ein `tt_content`-Datensatz mit `CType = casino_automat` und genau zwei eigenen Feldern im Formular; Systemfelder (Typ, Spalte, Sprache, Zugriff, Notizen) ergänzt der Kern. Bewusst **kein** Überschriftenfeld.
- **Vorbedingung:** Backend-Anmeldung mit Schreibrecht auf der Seite.
- **Beobachtbar an:** Spalte `tt_content.CType` = `casino_automat`; Icon `content-casino-automat`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:76-111`, `Configuration/Icons.php`

### F-STARTPAGE-017  Feld „Gerät" — Auswahlliste nach Gattungen gruppiert
- **Was:** Ein Auswahlfeld listet alle angemeldeten Geräte, getrennt in „Automaten" und „Tische".
- **Wie ausgelöst:** Öffnen des Auswahlfelds `tx_casinostartpage_automat` im Inhaltselement.
- **Soll-Ergebnis:** Ganz oben der gruppenlose Leereintrag („bitte wählen"), darunter die Gruppe Automaten, dann die Gruppe Tische; jeder Eintrag mit Name, Kurzbeschreibung und dem Icon seiner Gattung. Gespeichert wird der Registry-Schlüssel (varchar(64), aus der TCA abgeleitet, keine `ext_tables.sql`).
- **Vorbedingung:** mindestens ein Gerät angemeldet; ohne Anmeldung bleibt die Liste gültig und leer bedienbar.
- **Beobachtbar an:** Spaltenwert `tt_content.tx_casinostartpage_automat`; Gruppenüberschriften aus `gattung.automat.plural` / `gattung.tisch.plural`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:25-58`, `Classes/Backend/FormEngine/AutomatItemsProvider.php:32-48`

### F-STARTPAGE-018  Feld „Zielseite" (TypoLink, nur Seiten)
- **Was:** Der Redakteur wählt, wohin die Kachel führt.
- **Wie ausgelöst:** Feld `tx_casinostartpage_target` im Inhaltselement, Seitenbrowser mit eigenem Fenstertitel.
- **Soll-Ergebnis:** Nur Seitenverweise erlaubt (`allowedTypes: [page]`); gespeichert als TypoLink-Text (Spalte TEXT, aus der TCA abgeleitet).
- **Vorbedingung:** Backend-Anmeldung.
- **Beobachtbar an:** Spaltenwert `tt_content.tx_casinostartpage_target` (z. B. `t3://page?uid=12`); im Frontend entsteht daraus `a.ck-slot__link`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:60-70`

### F-STARTPAGE-019  Backend-Vorschau des Geräte-Inhaltselements
- **Was:** Im Seitenmodul zeigt das Element auf einen Blick, welches Gerät gewählt ist und wohin es führt — samt Warnungen.
- **Wie ausgelöst:** Öffnen des Seitenmoduls (Seite → Spaltenansicht); läuft beim Speichern bzw. Neuladen.
- **Soll-Ergebnis:** Zeile 1: Gattungs-Abzeichen (`badge-info`) + fetter Gerätename + graue Kurzbeschreibung. Kein Gerät gewählt → gelbes Abzeichen (`preview.automat.missing`); unbekannter Schlüssel → rotes Abzeichen mit dem Schlüssel (`preview.automat.unknown`). Zeile 2: Zielseitentitel mit UID; keine Zielseite → gelb, nicht auflösbarer Verweis → rot (`preview.target.broken`), gelöschte Seite → rot mit UID (`preview.target.deleted`).
- **Vorbedingung:** Backend-Anmeldung.
- **Beobachtbar an:** `div.ck-automat-preview` mit `span.badge.badge-info|warning|danger` im Seitenmodul.
- **Umgesetzt in:** `Classes/Backend/Preview/AutomatPreviewRenderer.php:37-124`, `Resources/Private/Language/locallang_be.xlf` (`preview.*`)

### F-STARTPAGE-020  Backend-Layout „Startseite (Spielsaal)"
- **Was:** Ein wählbares Seitenlayout mit genau einer Inhaltsspalte („Saal"), das zugleich bestimmt, welche Fluid-Datei die Seite rendert.
- **Wie ausgelöst:** Seiteneigenschaften → Erscheinungsbild → Backend-Layout → „Startseite (Spielsaal)".
- **Soll-Ergebnis:** Die Seite rendert `Pages/Startseite.html`; im Seitenmodul gibt es eine Spalte mit `colPos = 0`, Bezeichner `main`. Der Site-Titel wird dem Seitentitel nicht vorangestellt.
- **Vorbedingung:** Site Set der Site zugewiesen.
- **Beobachtbar an:** `pages.backend_layout` = `pagets__startseite`; Seitentitel im `<title>` ohne „Casino Kunterbunt: "-Vorsatz.
- **Umgesetzt in:** `Configuration/Sets/CasinoKunterbunt/page.tsconfig:7-28`, `Configuration/Sets/CasinoKunterbunt/setup.typoscript:83-85`

### F-STARTPAGE-021  Site-Einstellung „Titel der Leuchtreklame"
- **Was:** Ein Admin ändert den Namen auf dem Neonschild, ohne Code anzufassen.
- **Wie ausgelöst:** Backend → Site-Verwaltung → Einstellungen → Kategorie „Saal" → `casinoKunterbunt.hall.title`.
- **Soll-Ergebnis:** Nach dem Speichern trägt das Leuchtschild den neuen Text.
- **Vorbedingung:** Admin-Rechte; Site Set zugewiesen.
- **Beobachtbar an:** `h1.ck-sign__text[data-text="<neuer Text>"]` im ausgelieferten HTML.
- **Umgesetzt in:** `Configuration/Sets/CasinoKunterbunt/settings.definitions.yaml:1-10`, `Configuration/Sets/CasinoKunterbunt/labels.xlf`

---

## KI-Auffindbarkeit (GEO)

### F-STARTPAGE-022  Hauskennwerte als strukturierte Daten auf jeder Seite
- **Was:** Jede Seite liefert maschinenlesbare Angaben über das Haus und den Weg zur aktuellen Seite.
- **Wie ausgelöst:** automatisch bei jedem Seitenrendering (`page.10.dataProcessing.20 = casino-site-jsonld`).
- **Soll-Ergebnis:** Drei `<script type="application/ld+json">` im `<head>`: `Organization`, `WebSite` (mit `inLanguage: de-DE` und Verweis auf die Organisation) und `BreadcrumbList` (auf der Wurzelseite ein Eintrag, sonst zwei). Ohne Site-Kontext wird nichts ausgegeben.
- **Vorbedingung:** Site-Konfiguration vorhanden.
- **Beobachtbar an:** Drei JSON-LD-Blöcke im `<head>`; `@id` endet auf `#organization` bzw. `#website`.
- **Umgesetzt in:** `Classes/DataProcessing/SiteJsonLdProcessor.php:60-111,137-183`, `Configuration/Sets/CasinoKunterbunt/setup.typoscript:29`

### F-STARTPAGE-023  Meta-Beschreibung der Wurzelseite, gezählt aus der Registry
- **Was:** Die Startseite beschreibt sich selbst mit der aktuellen Zahl an Automaten und Tischen.
- **Wie ausgelöst:** automatisch beim Rendern der Wurzelseite (uid = rootPageId).
- **Soll-Ergebnis:** `<meta name="description">` mit dem Satz „Ein Spaß-Casino ohne echtes Geld: N Spielautomaten und M Tische, …". Die Zahlen stammen aus `AutomatRegistry::all()`, **gezählt, nicht benannt** — kein Gerätename im Text.
- **Vorbedingung:** aktuelle Seite ist die Wurzelseite der Site.
- **Beobachtbar an:** `<meta name="description" content="… N Spielautomaten und M Tische …">`; N/M ändern sich, wenn ein Gerät ab- oder angemeldet wird (nach `cache:flush`).
- **Umgesetzt in:** `Classes/DataProcessing/SiteJsonLdProcessor.php:83-85,118-132`

### F-STARTPAGE-024  Gerätebeschreibung beisteuern (`casino-device-description`)
- **Was:** Ein geteilter, gerätefreier Baustein, mit dem eine Geräteseite ihre eigene Beschreibung und einen `Game`-Eintrag ausliefert.
- **Wie ausgelöst:** Die Geräte-Extension hängt `20 = casino-device-description` mit `title`, `description` und wahlweise `gattung = tisch` an die `dataProcessing`-Kette **ihres eigenen** Inhaltselements. Läuft nur, wenn dieses Inhaltselement tatsächlich rendert.
- **Soll-Ergebnis:** `<meta name="description">` mit dem übergebenen Text und ein `<script type="application/ld+json">` mit `@type: Game`, `name`, `description`, `genre` (`Tischspiel` bei `gattung = tisch`, sonst `Automatenspiel`) und der aktuellen URL. Leere `description` → gar keine Ausgabe; leerer `title` → nur die Meta-Beschreibung, kein JSON-LD.
- **Vorbedingung:** die drei TypoScript-Zeilen am eigenen Inhaltselement; ohne sie liefert die Geräteseite schlicht keine Beschreibung (kein Fehler).
- **Beobachtbar an:** Auf der Geräteseite `<meta name="description">` und ein JSON-LD-Block mit `"@type":"Game"`.
- **Umgesetzt in:** `Classes/DataProcessing/DeviceDescriptionProcessor.php:53-92`

---

## Kasse — Guthaben-Leuchtschild im Saal

### F-STARTPAGE-025  Guthabenstand ablesen
- **Was:** Das Leuchtschild im Saal zeigt den aktuellen Kassenstand in deutscher Schreibweise (z. B. `1.234`).
- **Wie ausgelöst:** Laden einer Seite, die `Hall/Credit` rendert; danach bei jeder Änderung des Kassenstands.
- **Soll-Ergebnis:** Die Zahl steht in der Anzeige und bekommt bei jeder Änderung einen kurzen Ruck (Klasse `ck-credit__value--kick`, 190 ms). Erstbesuch: `100`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `span.ck-credit__value[data-ck-credit-display]` — Textinhalt = formatierter Stand. Die gezeichnete Tafel `div.ck-credit__board` trägt `aria-hidden="true"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit-display.js:68-92,247-276`, `Resources/Private/PageView/Partials/Hall/Credit.html:28-32`

### F-STARTPAGE-026  Ansage des Guthabenstands für Hilfsmittel
- **Was:** Ein unsichtbarer Bereich sagt den vollständigen Satz „Guthaben: N Kredite" an, aber erst bei einer echten Änderung.
- **Wie ausgelöst:** jede Änderung des Kassenstands außer dem Anfangsstand beim Laden (`reason: 'subscribe'` sagt nichts an).
- **Soll-Ergebnis:** Der Text wird entprellt gesetzt (Ruhezeit 700 ms), damit drei schnelle Einwürfe nicht dreimal angesagt werden; die allererste tatsächliche Änderung geht ohne Wartezeit hinaus.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `span.ck-credit__announce[role="status"][data-ck-credit-announce]` — beim Laden leer, danach der Satz aus `data-ck-text-credit` mit `{0}` ersetzt.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit-display.js:40,83-140`, `Resources/Private/PageView/Partials/Hall/Credit.html:38-39`

### F-STARTPAGE-027  Münzeinwurf mit Schnellwerten 10 / 50 / 100
- **Was:** Drei Knöpfe auf der Chromleiste laden den Kassenstand um einen festen Betrag auf.
- **Wie ausgelöst:** Klick (oder Eingabe-/Leertaste) auf `[data-ck-credit-add="10|50|100"]`.
- **Soll-Ergebnis:** Der Kassenstand steigt um den Betrag; am Höchststand (999.999.999) wird gekappt und die Meldung „gekappt" angezeigt.
- **Vorbedingung:** Im QR-Modus (Servermodus) nur für Admins — der ganze Einwurfteil wird für Nicht-Admins aus dem Dokument entfernt.
- **Beobachtbar an:** `button.ck-credit__coin[data-ck-credit-add]`; danach neuer Wert in `[data-ck-credit-display]`; bei Kappung Text aus `data-message-capped` in `p.ck-credit__status`.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit-display.js:164-174,221-225`, `Resources/Private/PageView/Partials/Hall/Credit.html:42-44`

### F-STARTPAGE-028  Freier Einwurfbetrag
- **Was:** Ein Zahlenfeld nimmt einen beliebigen Betrag entgegen und schreibt ihn gut.
- **Wie ausgelöst:** Betrag in `[data-ck-credit-input]` eintippen, Formular absenden (Knopf „Einwerfen" oder Eingabetaste).
- **Soll-Ergebnis:** Bei gültiger ganzer Zahl von 1 bis 999.999.999 wird gutgeschrieben und das Feld geleert. Bei ungültiger Eingabe erscheint die Meldung aus `data-message-invalid`, das Feld bleibt stehen. Wurde wegen Höchststand nichts gutgeschrieben, bleibt das Feld ebenfalls stehen. Die Seite lädt nicht neu.
- **Vorbedingung:** wie F-STARTPAGE-027 (im Servermodus nur Admins).
- **Beobachtbar an:** `form.ck-credit__slot[data-ck-credit-form]`, `input.ck-credit__input[min=1][max=999999999]`, Meldungstext in `p.ck-credit__status[data-ck-credit-status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit-display.js:181-191,227-234`, `Resources/Private/PageView/Partials/Hall/Credit.html:46-54`

### F-STARTPAGE-029  Kassenstand frei setzen (Verwaltungsteil)
- **Was:** Ein eigener, klar abgesetzter Bedienteil setzt den Kassenstand auf einen beliebigen Wert — auch nach unten, auch auf 0.
- **Wie ausgelöst:** Wert in `[data-ck-credit-set-input]` eintippen, Formular absenden.
- **Soll-Ergebnis:** `credit.set()` wird gerufen; die Statuszeile meldet den neuen Stand (`data-message-done`, `{betrag}` ersetzt), das Feld wird geleert. Ungültige Eingabe (nicht 1–9 Ziffern, <0, >999.999.999): `aria-invalid="true"` am Feld, Meldung `data-message-invalid`, Fokus springt zurück ins Feld.
- **Vorbedingung:** Im QR-Modus (Servermodus) wird der gesamte Bedienteil für Nicht-Admins **aus dem Dokument entfernt** (nicht nur ausgeblendet); serverseitig ist `setzen` ohnehin Admins vorbehalten. Ohne QR-Modus ist er für alle da.
- **Beobachtbar an:** `div.ck-credit__set[data-ck-credit-set]` mit `form[data-ck-credit-set-form]`, `input#ck-credit-set-input`, `p#ck-credit-set-status[role="status"]`; im Servermodus für Nicht-Admins ist dieser Block gar nicht im HTML-Baum.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit-set.js:115-187`, `Resources/Private/PageView/Partials/Hall/CreditSet.html:30-46`

### F-STARTPAGE-030  Kasse als geteilter Baustein (`credit.js`)
- **Was:** Der gemeinsame Gesamtbestand aller Geräte; jedes Gerät liest und bucht ausschließlich hierüber, nie direkt im Browserspeicher.
- **Wie ausgelöst:** Import `@phomo17/casino-startpage/credit.js`. Lesen synchron: `credit.balance`, `canAfford()`, `format()`, Konstanten. Ändern asynchron: `await credit.add() / subtract() / set() / reload()`.
- **Soll-Ergebnis:** Ganze Kredite von 0 bis 999.999.999, Startguthaben 100. `subtract()` bei zu wenig Guthaben bucht **nichts** und liefert `{ok:false, reason:'insufficient', missing}`. `add()`/`subtract()` werfen `RangeError` bei unsinnigem Betrag (Programmierfehler). `subscribe(fn)` ruft sofort einmal mit `reason:'subscribe'` auf und liefert die Abmeldefunktion; danach `add|subtract|set|reload|remote`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Am Gerät: jede Guthabenanzeige, die über `subscribe()` hängt (im Saal `[data-ck-credit-display]`). Im lokalen Modus zusätzlich `localStorage['casinoKunterbunt.credits']`.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit.js:360-508`

### F-STARTPAGE-031  Zwei Registerkarten laufen nicht auseinander
- **Was:** Ändert eine zweite Registerkarte desselben Browsers die Kasse, zieht diese Karte mit.
- **Wie ausgelöst:** `storage`-Ereignis auf `casinoKunterbunt.credits` (lokaler Modus); im Servermodus stattdessen `konto.abonnieren()`.
- **Soll-Ergebnis:** Der Stand wird neu gelesen und alle Zuhörer mit `reason: 'remote'` benachrichtigt; jede angebundene Anzeige geht ohne eigene Änderung mit.
- **Vorbedingung:** `localStorage` verfügbar (lokaler Modus) bzw. QR-Modus an (Servermodus).
- **Beobachtbar an:** Die Zahl in `[data-ck-credit-display]` der einen Karte ändert sich, nachdem in der anderen Karte gebucht wurde.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit.js:301-334`

### F-STARTPAGE-032  Rückkehr aus dem Vor-/Zurück-Zwischenspeicher
- **Was:** Wer mit dem Zurück-Knopf auf eine Seite kommt, sieht nicht den veralteten Kassenstand.
- **Wie ausgelöst:** `pageshow` mit `event.persisted === true` (bfcache).
- **Soll-Ergebnis:** `credit.reload()` liest den Stand neu ein; die Anzeige geht mit (`reason: 'reload'`).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Nach „Zurück" steht in `[data-ck-credit-display]` der Stand, der zwischenzeitlich in einer anderen Karte gebucht wurde.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit.js:349-357`

### F-STARTPAGE-033  Beschädigter oder fehlender Speicher
- **Was:** Ein kaputter oder fehlender Speicherwert bringt das Spiel nicht zum Stehen.
- **Wie ausgelöst:** Laden einer Seite mit unsinnigem Inhalt in `casinoKunterbunt.credits`.
- **Soll-Ergebnis:** nichts gespeichert → `100` (wird sofort geschrieben); Text/Komma/leer/unsinnig lang → `0` (zurückgeschrieben); negativ → `0`; größer als der Höchststand → auf `999999999` gekappt; `localStorage` nicht beschreibbar (privater Modus) → das Guthaben lebt nur bis zum nächsten Seitenwechsel, das Spiel läuft weiter.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Wert in `[data-ck-credit-display]` und in `localStorage['casinoKunterbunt.credits']` nach dem Laden.
- **Umgesetzt in:** `Resources/Public/JavaScript/credit.js` (`readStore()`), README „Beschädigter oder fehlender Speicher"

---

## Gerätekredit — was in einem Gerät steckt

### F-STARTPAGE-034  Gerätekredit öffnen (`openMachineCredit`)
- **Was:** Jedes Gerät führt einen eigenen Betrag, der aus der Kasse hineingeworfen wird; gespielt wird ausschließlich vom Gerätekredit.
- **Wie ausgelöst:** `openMachineCredit('<schlüssel>')` im Startweg des Geräts. Der Schlüssel kommt vom Gerät (Buchstaben, Ziffern, Strich, Unterstrich); das Site Package führt keine Geräteliste.
- **Soll-Ergebnis:** Ein `MachineCredit`-Objekt mit synchronem `amount`, `canAfford()`, `MAX`/`MIN` (999999999 / 0), `key`, `storageKey`, `token`, `mirror`. Ein **zweiter** Aufruf mit demselben Schlüssel auf derselben Seite wirft — zwei Stellen wären zwei Wahrheiten über denselben Betrag.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Am Gerät: das Kreditfenster/Guthabenfeld des Geräts. Im lokalen Modus `localStorage['casinoKunterbunt.machine.<schlüssel>']` in der Form `"<kennung>|<betrag>"` (verschwindet bei 0).
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:120,255-336,992-1008`

### F-STARTPAGE-035  Einwurf: Kasse → Gerät
- **Was:** Der Spieler entscheidet, wie viel er dem Gerät aussetzt.
- **Wie ausgelöst:** `await machineCredit.insert(betrag)` — am Gerät typischerweise der Einwurf-/Münzknopf.
- **Soll-Ergebnis:** Alles oder nichts. Erfolg `{ok:true, amount, moved}`; Absage `{ok:false, reason:'nocash'|'full'|'closed', moved:0}`. `RangeError` bei unsinnigem Betrag.
- **Vorbedingung:** genug Kasse; Gerätekredit nicht am Höchststand; Gerät nicht geschlossen.
- **Beobachtbar an:** Kassenanzeige sinkt, Geräteanzeige steigt um denselben Betrag; Zuhörer bekommen `reason: 'insert'`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:389-443`

### F-STARTPAGE-036  Auszahlung: Gerät → Kasse (`CASH OUT`)
- **Was:** Der Spieler holt sein Geld aus dem Gerät zurück.
- **Wie ausgelöst:** `await machineCredit.cashOut()` (vollständig) oder `withdraw(betrag)` (Teilbetrag) — am Gerät die Taste `CASH OUT`.
- **Soll-Ergebnis:** `{ok:true, moved, amount, capped}`. Ist die Kasse am Höchststand, bleibt der Rest im Gerät und `capped` ist `true` — nichts verschwindet. `withdraw()` bewegt einen Teilbetrag, ohne die Summe aus Kasse und Gerätekredit zu ändern.
- **Vorbedingung:** Gerät nicht geschlossen; bei `withdraw()` genug Gerätekredit.
- **Beobachtbar an:** Geräteanzeige sinkt, Kassenanzeige steigt; Zuhörer `reason: 'cashout'` bzw. `'withdraw'`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:444-517`

### F-STARTPAGE-037  Einsatz und Gewinn am Gerätekredit
- **Was:** Das Spiel bucht Einsatz ab und Gewinn gut — ohne die Kasse anzufassen.
- **Wie ausgelöst:** `await machineCredit.stake(betrag)` / `await machineCredit.award(betrag)` — am Gerät der Hebel, der Startknopf, die Auswertung einer Runde.
- **Soll-Ergebnis:** `stake()`: `{ok:true, amount, debited}` oder `{ok:false, reason:'insufficient'|'closed', missing}` — reicht es nicht, wird **nichts** abgebucht. `award()`: `{ok:true, amount, credited, capped}`. Beide werfen `RangeError` bei unsinnigem Betrag.
- **Vorbedingung:** laufendes Gerät, genug Gerätekredit für den Einsatz.
- **Beobachtbar an:** Geräteanzeige ändert sich, Kassenanzeige **nicht**; Zuhörer `reason: 'stake'` bzw. `'award'`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:522-577`

### F-STARTPAGE-038  Gerät abräumen (`close()`) — das Gerät entscheidet
- **Was:** Beim Verlassen der Seite wandert der nicht verspielte Gerätekredit in die Kasse zurück.
- **Wie ausgelöst:** `await machineCredit.close()` aus dem eigenen Abräumweg des Geräts. Dieses Modul meldet sich **nicht** selbst für `pagehide` an.
- **Soll-Ergebnis:** Alles zurück in die Kasse, Spiegel gelöscht, Zuhörer abgemeldet; Zuhörer `reason: 'closed'`. Was das Gerät über `stake()` herausgenommen hat, ist beim Abräumen nicht mehr da (Münzschieber-Regel).
- **Vorbedingung:** keine. **Ein Tisch, der `connectControls()` nicht benutzt, muss `bank.close()` selbst rufen** — sonst wandert der Buy-in nicht zurück.
- **Beobachtbar an:** Nach dem Seitenwechsel steht der Betrag wieder in der Kassenanzeige; `localStorage['casinoKunterbunt.machine.<schlüssel>']` ist weg.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:578-615`

### F-STARTPAGE-039  Absturzsicherung und zwei Registerkarten am Gerät
- **Was:** Ein Gerätekredit geht weder verloren noch wird er doppelt gebucht, wenn der Browser abstürzt oder dasselbe Gerät in zwei Karten offen ist.
- **Wie ausgelöst:** `claim()` beim Öffnen des Geräts; `storage`-Ereignis auf `casinoKunterbunt.machine.<schlüssel>`.
- **Soll-Ergebnis:** Vorgefundener Rest → sofort in die Kasse gebucht, Schlüssel gelöscht, Gerät beginnt bei 0 (`reason: 'claimed'`). Andere Karte löscht meinen Eintrag → ich gehe auf 0 und buche nichts nach. Andere Karte schreibt ihren Betrag darüber → ich buche **meinen** Betrag zurück und gehe auf 0 (`reason: 'surrendered'`). Kasse am Höchststand → es wird gebucht, was hineinpasst, der Rest bleibt im Gerät. Kein `localStorage` → keine Absturzsicherung, sonst alles wie gehabt.
- **Vorbedingung:** lokaler Modus (im Servermodus gibt es keinen Spiegel).
- **Beobachtbar an:** `machineCredit.mirror` (roher Spiegelwert oder `''`), Kassenanzeige, `localStorage['casinoKunterbunt.machine.<schlüssel>']`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine-credit.js:616-748,778-814`

---

## Austauschbare Rückseite: Browserspeicher oder serverseitiges Konto

### F-STARTPAGE-040  Rückseite erkennen (`account-backend.js`)
- **Was:** Die eine Stelle im ganzen Site Package, die entscheidet, ob Kasse und Gerätekredit im Browser oder auf dem Server geführt werden.
- **Wie ausgelöst:** Beim Laden der Seite: Gibt es im `<head>` ein `<script type="application/json" data-ca-state>`? Diesen Block speist eine andere Extension in die fertige, zwischengespeicherte Antwort ein.
- **Soll-Ergebnis:** Block vorhanden → Servermodus (`konto.istServer === true`), `credit.js` und `machine-credit.js` buchen über `/casino-konto/buchung`; kein Schreiben oder Lesen von `casinoKunterbunt.credits`, kein Gerätespiegel, kein `storage`-Zuhörer. Block fehlt → lokaler Modus, alles verhält sich wie vor Ausbaustufe 3. **Kein Gerät musste dafür geändert werden.**
- **Vorbedingung:** QR-Modus an und Konto-Extension installiert (dieses Site Package kennt sie an keiner Stelle beim Namen).
- **Beobachtbar an:** Im HTML-Kopf `script[type="application/json"][data-ca-state]`; im Browser `konto.istServer`; im Netzwerkmitschnitt `POST /casino-konto/buchung` statt `localStorage`-Schreibvorgängen.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:117-129,184-193,544-546`

### F-STARTPAGE-041  Die elf Buchungsvorgänge im Servermodus
- **Was:** Jede Geldbewegung wird einzeln beim Server angemeldet; der Server, nie der Browser, rechnet die drei Beträge (Kasse, Gerätekredit, offener Gewinn) und die Kappung aus.
- **Wie ausgelöst:** `uebernahme` (`machineCredit.claim()` beim Öffnen eines Geräts), `einwurf` (`insert()`), `auszahlung` (`cashOut()`/`withdraw()`), `einsatz` (`stake()`), `gewinn` (`award()`), `angebot`/`verdoppeln`/`verloren` (Risiko-Leiter), `aufladen` (`credit.add()`), `abbuchen` (`credit.subtract()`), `setzen` (`credit.set()`/`credit-set.js`).
- **Soll-Ergebnis:** Einheitliche Antwortform `{ok, grund?, kasse, geraet, gewinn, gesamt, bewegt, gekappt, doppelt}`. Die drei Verwaltungsvorgänge (`aufladen`, `abbuchen`, `setzen`) sind Admins vorbehalten; ein Nicht-Admin bekommt `{ok:false, grund:'kein_admin'}`, die Beträge bleiben unverändert. `auszahlung` und `uebernahme` werden mit `keepalive: true` gesendet, damit sie das Schließen der Seite überleben.
- **Vorbedingung:** Servermodus; für die drei letzten zusätzlich Admin-Recht (die Sicherheitsgrenze zieht ausschließlich der Server).
- **Beobachtbar an:** `POST /casino-konto/buchung`; danach Ereignis `casino:konto` auf `document` mit `{kasse, geraet, gewinn, gesamt, grund}` und ein Aufruf aller `konto.abonnieren()`-Zuhörer.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:230-345,505-543`

### F-STARTPAGE-042  Sperranzeige bei Verbindungsabbruch
- **Was:** Antwortet der Server nicht mehr, wird nichts mehr gebucht, statt Beträge zu erfinden.
- **Wie ausgelöst:** `fetch()` schlägt fehl, ein Fehlercode oder eine unlesbare Antwort kommt zurück.
- **Soll-Ergebnis:** `konto.gesperrt = true`, Ereignis `casino:konto-gesperrt` mit `{grund: 'offline'|'fehler'}`; die liegengebliebene Buchung bleibt mit **unveränderter** Nummer stehen. `konto.wiederholen()` (bzw. Ereignis `casino:konto-wiederholen`) sendet genau sie noch einmal; gelingt es, folgt `casino:konto-frei`. Eine **Ablehnung** des Servers (zu wenig Guthaben, kein Admin) ist keine Sperre — sie kommt mit `ok:false` und `grund` zurück.
- **Vorbedingung:** Servermodus.
- **Beobachtbar an:** DOM-Ereignisse `casino:konto-gesperrt` / `casino:konto-frei` auf `document`; die Kontenleiste der anderen Extension zeigt daraufhin ihre Sperranzeige.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:288-345,477-480`

### F-STARTPAGE-043  Abgleich zwischen Registerkarten im Servermodus
- **Was:** Zwei Registerkarten derselben Person teilen dieselbe Wahrheit auf dem Server.
- **Wie ausgelöst:** `pageshow` (Rückkehr aus dem Vor-/Zurück-Zwischenspeicher) und `visibilitychange` auf sichtbar — dann einmal `konto.stand()`. Kein Takt, keine Dauerabfrage.
- **Soll-Ergebnis:** Der gemeldete Stand wird übernommen; alle Zuhörer und `credit.js` gehen mit (`reason: 'remote'`).
- **Vorbedingung:** Servermodus.
- **Beobachtbar an:** Beim Zurückwechseln auf die Karte ändert sich die Guthabenanzeige auf den Serverstand; `casino:konto` feuert.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:78-85,505-543`

### F-STARTPAGE-044  `konto.speicher` — Gerätespeicher, der kein Kredit ist
- **Was:** Ein Storage-förmiger Baustein (`getItem`/`setItem`/`removeItem`) für Gerätezustände, die kein Geld sind (z. B. was auf einem Spielfeld liegt).
- **Wie ausgelöst:** `konto.speicher.setItem(schlüssel, text)` aus dem Gerät; im lokalen Modus ist `konto.speicher` `null`.
- **Soll-Ergebnis:** Schreibvorgänge werden in einem Ruhefenster gesammelt und **gebündelt** an `/casino-konto/feld` geschickt, nie einzeln je Spieleinheit. Dieser Weg berührt keinen der drei Beträge und keine Buchungsnummer.
- **Vorbedingung:** Servermodus.
- **Beobachtbar an:** `POST /casino-konto/feld` mit mehreren Ständen in einer Anfrage.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:99,406-476`

---

## Klang — geteilter Baustein

### F-STARTPAGE-045  Ton an / aus
- **Was:** Ein Schalter, der den ganzen Klang des Hauses stummschaltet; die Einstellung merkt sich der Browser.
- **Wie ausgelöst:** `sound.enable()` / `disable()` / `toggle()` / `setEnabled(flag)` — am Gerät die Lautsprecher-Taste. Synchron, nicht asynchron.
- **Soll-Ergebnis:** Beim Ausschalten werden laufende Stimmen ausgeblendet (nicht abgeschnitten) und der Audiokontext angehalten; der Zustand wird gespeichert. Voreinstellung: **eingeschaltet**; geschrieben wird erst beim ersten Umschalten durch den Spieler. Eine andere Registerkarte zieht über das `storage`-Ereignis mit.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `localStorage['casinoKunterbunt.sound']` = `'1'` / `'0'`; `sound.enabled`; `sound.stats().enabled` und `contextState` (`none`/`running`/`suspended`/`closed`) — ein Aufrufer schreibt diese Werte in `data-`Attribute, damit sie ablesbar sind.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:135,1021-1051,1220-1240`

### F-STARTPAGE-046  Autoplay-Sperre: der erste Ton braucht eine echte Geste
- **Was:** Vor der ersten echten Nutzerhandlung bleibt es still, und der Browser meldet keine Warnung.
- **Wie ausgelöst:** `sound.unlock()` aus einem Zuhörer für ein echtes Ereignis (`event.isTrusted === true`).
- **Soll-Ergebnis:** Der `AudioContext` wird **erst dann** angelegt, und auch nur, wenn der Ton eingeschaltet ist und das Dokument eine Nutzeraktivierung hat. Fehlt die Geste, liefert jeder Klangaufruf still `0`. Wer nur importiert und nie `unlock()` ruft, bekommt keinen Kontext.
- **Vorbedingung:** echte Nutzergeste.
- **Beobachtbar an:** `sound.stats().contextState` wechselt von `none` auf `running`; vorher liefert `sound.tone()` den Rückgabewert `0`.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:1014-1020`

### F-STARTPAGE-047  Klang erzeugen (Ton, Rauschen, Folge, Dauerklang)
- **Was:** Töne entstehen aus Frequenzen über die Web Audio API — keine Audiodateien, kein Netzzugriff.
- **Wie ausgelöst:** `sound.tone(spec)`, `sound.noise(spec)`, `sound.sequence({tones, noises})`, `sound.sustain(spec)`, `sound.setVolume(v)`, `sound.stopAll()`. Welcher Klang zu welchem Ereignis gehört, entscheidet das Gerät.
- **Soll-Ergebnis:** Jeder Aufruf liefert die Kontextzeit zurück, zu der der Klang endet (`0`, wenn nichts gespielt wurde) — damit lässt sich ein Klang **hinter** einen anderen legen. `key` + `minGap` verhindern, dass sich derselbe Klang bei einem Ereignishagel stapelt. Gesamtlautstärke 0,45, danach ein Kompressor; höchstens 48 gleichzeitig geplante Stimmen. `sustain()` liefert einen Griff (`running`, `setLevel()`, `stop()`) oder `null` (Ton aus, Geste fehlt, Grenze erreicht); Dauerklänge werden **nicht** gedrosselt und gegen eine eigene Grenze von 4 gezählt.
- **Vorbedingung:** Ton an, `unlock()` gelaufen.
- **Beobachtbar an:** `sound.stats()` → `activeVoices`, `peakVoices`, `startedVoices`, `droppedVoices`, `gapDrops`, `peakLevel`, `byKey`, `sustainedVoices`, `startedSustained`, `droppedSustained`. `peakLevel` 1,0 wäre Übersteuern.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:166,176,473,625,1052-1186,1241-1293`

### F-STARTPAGE-048  Klangbaukasten (`sound-kit.js`) — wie eine Münze klingt
- **Was:** Die mittlere Ebene zwischen Klangerzeugung und Gerät: sie weiß, *wie* eine Münze klingt, damit nicht jedes Gerät eine andere Münze hat.
- **Wie ausgelöst:** `coin({pitch, body, roll})`, `coinCascade({count, spread, pitch})`, `metal({pitch})`, `sheet({duration, from, to})`, `ratchet({count, step, tighten})`, `cashRegister({size})`, `countStep({index, steps, base})` — gerufen vom Gerät zum passenden Zeitpunkt.
- **Soll-Ergebnis:** Jede Funktion nimmt denselben Umschlag (`at`, `gain`, `key`, `minGap`) und liefert die Kontextzeit des Endes bzw. `0`. `countStep()` wird **einmal je sichtbarem Zählschritt** gerufen, nicht einmal je Fahrt; die Leiter ist pentatonisch, damit sie in jeder Länge und an jeder Abbruchstelle richtig klingt.
- **Vorbedingung:** Ton an, `unlock()` gelaufen.
- **Beobachtbar an:** `sound.stats().byKey` zeigt die benutzten Klangschlüssel; am Gerät hörbar beim Münzeinwurf, bei der Auszahlung, beim Zählen eines Gewinns.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound-kit.js:169-500`

### F-STARTPAGE-049  Leerlaufgeräusch eines Geräts (`IdleNoise`)
- **Was:** Ein leises Transformatorbrummen (50/100/150 Hz) mit Relaisklicken und Ticken in zufälligen Abständen von 2,2 bis 9 Sekunden.
- **Wie ausgelöst:** `new IdleNoise()`, dann `idle.start()` nach jeder echten Nutzergeste (beliebig oft aufrufbar), `idle.setBusy(true/false)`, `idle.stop()`, `idle.destroy()`.
- **Soll-Ergebnis:** `setBusy(true)` lässt Klick und Ticken vollständig schweigen und nimmt das Brummen auf 55 % zurück — nicht auf null. `start()` bewirkt vor der ersten Geste nichts und legt den Klang nach einem Abbruch neu an. **Eine Instanz je Gerät**: wird ein Gerät abgeräumt, muss sein Brummen gehen und das des anderen bleiben — die eine Stelle im Projekt, an der ein Abräumen ausdrücklich einen Klang abbricht.
- **Vorbedingung:** Ton an, echte Nutzergeste; versteckter Tab → `stop()`.
- **Beobachtbar an:** `sound.stats().sustainedVoices` steigt/sinkt; hörbar am Gerät.
- **Umgesetzt in:** `Resources/Public/JavaScript/idle-noise.js:101-297`

### F-STARTPAGE-050  Klang beim Verlassen der Seite abräumen
- **Was:** Alle Klänge brechen ab und der Audiokontext wird geschlossen.
- **Wie ausgelöst:** `sound.shutdown()` — **einmal je Seite, nicht je Gerät**; alle Geräte einer Seite teilen sich einen Kontext.
- **Soll-Ergebnis:** Nichts läuft weiter; `contextState` wird `closed`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `sound.stats().contextState === 'closed'`, `activeVoices === 0`.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:1187-1219`

---

## Risiko-Leiter — geteilter Baustein

### F-STARTPAGE-051  Risiko-Leiter mit zwei Tasten (`RiskLadder`)
- **Was:** Ein erspielter Gewinn kann Stufe für Stufe verdoppelt werden: ein Licht wandert zwischen zwei Feldern, der Spieler tippt auf die Seite, die er für richtig hält.
- **Wie ausgelöst:** Das Gerät baut `new RiskLadder({draw, paint, notify})` und ruft die Methoden: `offer(anspruch)`, `start()`, `guess('left'|'right')`, `collect()`, `destroy()`. **Welche Taste welche Methode ruft, entscheidet allein das Gerät** — der Baustein kennt kein Gehäuse, keinen Selektor, keine CSS-Klasse und keinen Ereignisnamen.
- **Soll-Ergebnis:** `offer()` liefert `true`, wenn der Anspruch übernommen wurde (bei `false` zahlt das Gerät wie immer selbst aus). `start()` startet Stufe 1 (`false`, wenn kein Angebot vorliegt). `guess()` liefert `'hit'`, `'miss'` oder `null`. `collect()` steigt aus und schreibt gut — im Angebot wie in der Leiter, im Grundzustand gar nicht. `destroy()` schreibt einen offenen Gewinn **gut**, statt ihn zu verwerfen. `ladder.phase` ist `'off'`, `'offer'` oder `'ladder'`.
- **Vorbedingung:** `draw()` (liefert 0 oder 1 aus der **eigenen** Zufallsquelle des Geräts; etwas anderes wirft) und `paint()` (muss **synchron** malen) sind Pflicht; `notify()` ist freiwillig. Es wird nie auf `Math.random()` zurückgefallen.
- **Beobachtbar an:** Am Gerät nur über die drei angemeldeten Funktionen: `paint(view)` bekommt `{reason, phase, level, win, lit, sideMs, onMs, darkMs}` mit `lit` = `'left'`/`'right'`/`'none'`; `notify(msg)` bekommt `{type: 'start'|'hit'|'miss'|'lost'|'collect'|'end', level, win}` und `{type:'tick', level, lit, on}`. Das Gerät macht daraus seine eigenen DOM-Ereignisse.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-ladder.js:190-704`

### F-STARTPAGE-052  Momentaufnahme und ihre Anlässe (`reason`)
- **Was:** Der einzige Weg an die Anzeige: die Leiter reicht bei jedem Anlass eine Momentaufnahme heraus.
- **Wie ausgelöst:** automatisch bei jedem Zustandswechsel; zusätzlich auf Abruf über `ladder.view(reason)`.
- **Soll-Ergebnis:** `init` (Grundzustand), `offer` (Angebotsoptik, Stufe aus — die Gewinn-Anzeige gehört zu diesem Zeitpunkt noch dem Spielkern), `level` (neue Stufe: Stufe, offener Gewinn, Lichtfeld), `lit` (nur das Lichtfeld), `settled` (nur den Gewinnbetrag: 0 nach Fehlgriff, gutgeschriebener Betrag nach Ausstieg), `sync` (**nur** den Gewinnbetrag nachziehen — kein Licht, keine Tastenfreigabe, keine Ansage), `end` (alles aus).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Am Gerät: was `paint()` malt. Ein Gerät, das `'sync'` nicht kennt, bekommt die Serverkorrektur nicht zu sehen.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-ladder.js:306-340`, `risk-ladder-multi.js:283-321`

### F-STARTPAGE-053  Anspruch: offener Gewinn und seine Sättigung
- **Was:** Der offene Gewinn wird als „Anspruch" übergeben — ein Betrag, der erspielt, aber noch nicht gutgeschrieben ist.
- **Wie ausgelöst:** `offer({amount, collect(), discard()})` aus dem Gerät.
- **Soll-Ergebnis:** Die Leiter schreibt beim Verdoppeln in `amount`. Die **Stufe** zählt ohne Grenze weiter; der **Betrag** sättigt bei 2^53−1 (`MAX_WIN`), weil JavaScript darüber nicht mehr exakt mit ganzen Zahlen rechnet. Die Kappung auf den auszahlbaren Höchstbetrag ist Sache des Anspruchs, nicht der Leiter.
- **Vorbedingung:** ein vom Gerät gelieferter Anspruch.
- **Beobachtbar an:** `view.win` und `view.level` am Gerät.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-ladder.js:205,381-412,478-532`

### F-STARTPAGE-054  Servermodus: erst optimistisch, dann bestätigt
- **Was:** Ein Treffer erhöht den Betrag sofort, auch wenn die Serverbuchung noch unterwegs ist.
- **Wie ausgelöst:** `guess()` mit Ergebnis `'hit'` im Servermodus.
- **Soll-Ergebnis:** Der vervielfachte Betrag steht **immer unbedingt und zuerst**, bevor Stufe, Malen und Meldung folgen. Zwei schnelle Treffer vor der ersten Antwort ergeben 10 → 20 → 40 (nicht 10 → 20 → 30). Die Serverbuchung läuft nebenher und bestätigt oder korrigiert den Wert; das kommt als `reason: 'sync'` an und kann auch eintreffen, während noch keine Leiter läuft (die Buchung aus `offer()`).
- **Vorbedingung:** Servermodus (QR-Modus an). Im lokalen Modus läuft alles unverändert ohne jede Netzanfrage.
- **Beobachtbar an:** `paint()` mit `reason: 'sync'` und dem bestätigten `win`; Buchungen `angebot`/`verdoppeln`/`verloren` an `/casino-konto/buchung`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-ladder.js:478-532`, `risk-ladder-multi.js:485-546`

### F-STARTPAGE-055  Blitzrate unter der Anfallsgrenze (`risk-timing.js`)
- **Was:** Die Lichtkurve der Leiter ist so gerechnet, dass sie bei lichtempfindlichen Menschen keine Anfälle auslösen kann.
- **Wie ausgelöst:** rein rechnerisch: `sideMs(n)` = konstant 200 ms auf **jeder** Stufe, `onMs(n)` = Trefferfenster, `pauseMs(n)`, `cycleMs(level, {sides, curve, pause})`, `flashesPerSecond(level, options)`, `stepTiming(level, curve)`.
- **Soll-Ergebnis:** Flach: 89 / 75 / 64 / 54 / 46 ms, ab Stufe 6 konstant 40 ms. Steil (`CURVE_STEEP`): 64 / 46 / 40 ms, ab Stufe 3 konstant. Nie unter `ON_MIN_MS` = 40 ms; kein voller Umlauf unter `CYCLE_MIN_MS` = 1000/3 ms. Bei zwei Tasten blitzt eine Taste 2,5-mal je Sekunde, bei vier Tasten rund 1,2 — beide unter der Grenze von drei Lichtwechseln je Sekunde. **Diese Grenze ist nicht verhandelbar.**
- **Vorbedingung:** Bedingung an das Gerät: nie zwei Tasten gleichzeitig leuchten oder überblenden, keine Übergänge, kein Nachglühen.
- **Beobachtbar an:** `view.sideMs`, `view.onMs`, `view.darkMs` an der Momentaufnahme; `flashesPerSecond()` als Zahl.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-timing.js:123-343`

### F-STARTPAGE-056  Mehrtasten-Leiter (`MultiRiskLadder`)
- **Was:** Dieselbe Leiter für beliebig viele Tasten statt nur links/rechts — für Geräte mit einem Kreuz aus vier Tasten oder jeder späteren Anordnung.
- **Wie ausgelöst:** `new MultiRiskLadder({draw(anzahl), paint, notify, sides, factor, curve, order, pause})`; `guess(<seitennummer>)`.
- **Soll-Ergebnis:** `sides` ≥ 2, `factor` ≥ 2 (ganzzahlig), `curve` = `'flat'`/`'steep'`, `order` = `'level'` (eine Reihenfolge je Stufe) oder `'pass'` (jeder Umlauf zieht neu), `pause` = dunkle Pause nach jedem vollen Umlauf. `lit` ist eine **Zahl** (`NO_SIDE = -1` oder `0 … sides−1`), keine Zeichenkette. Die Reihenfolge wird ausdrücklich **nicht** herausgereicht — ein Gerät, das sie sähe, könnte die nächste Seite vorwegnehmen. Die Momentaufnahme trägt zusätzlich `sides`, `factor`, `pauseMs`, `cycleMs`; die `tick`-Meldung zusätzlich `pass`.
- **Vorbedingung:** `draw(anzahl)` liefert `0 … anzahl−1` (Fisher-Yates braucht wechselnde Obergrenzen).
- **Beobachtbar an:** Am Gerät über `paint(view)` mit `view.lit` als Zahl; `risk-ladder.js` liegt unverändert daneben, welche Leiter ein Gerät benutzt, entscheidet es selbst.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk-ladder-multi.js:153-742`

---

## Tischbausteine — Chips, Setzfläche, Bedienleiste

### F-STARTPAGE-057  Fünf Chipsorten und das Chiprack (`table-chips.js`)
- **Was:** Die Recheneinheit des Tisches ist der Chip, nicht ein eingetippter Betrag. Es gibt fünf Sorten: 100, 25, 20, 5, 1.
- **Wie ausgelöst:** Import des Moduls; `new Rack(...)`, `breakDown(betrag)` (zerlegt einen Betrag in möglichst große Chips), `exchangeDown(wert)` / `exchangeUp(wert)` nach der Tabelle `CHIP_SPLIT`.
- **Soll-Ergebnis:** `CHIP_VALUES` = `[100, 25, 20, 5, 1]` (absteigend); jede Sorte hat einen `symbolId` für die gezeichnete Chipmarke. Der Einer lässt sich weder zerlegen noch zusammensetzen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Am Tisch: `span[data-ck-table-rack="<wert>"]` zeigt die Stückzahl je Sorte (an zwei Stellen — Chipwahl und Chipkasse —, aus **einer** Schleife gefüllt, also keine zweite Wahrheit).
- **Umgesetzt in:** `Resources/Public/JavaScript/table-chips.js:40-273`, `Resources/Private/PageView/Partials/Table/ChipSprite.html`

### F-STARTPAGE-058  Chipwahl (Radiogruppe)
- **Was:** Der Spieler wählt, welchen Chip er als Nächstes legt.
- **Wie ausgelöst:** Klick oder Pfeiltasten in der Radiogruppe `name="ck-table-chip"` in der Bedienleiste.
- **Soll-Ergebnis:** Genau ein Chipwert ist gewählt; der Browser liefert Pfeiltastensteuerung, Gruppenansage und Auswahlsemantik von selbst. Jeder Chip trägt seinen Namen als **sichtbaren** Text (nur verkleinert), damit eine Sprachsteuerung „klicke fünf Euro" findet.
- **Vorbedingung:** keine. Ohne Bestand an dieser Sorte tragen die Knöpfe `aria-disabled` (kein echtes `disabled`, sonst verlöre die Gruppe ihre Tabstationen); die eigentliche Sperre sitzt in `placeChip()`, das `'nochip'` meldet.
- **Beobachtbar an:** `fieldset.ck-table__chips` mit `legend`; `input[type=radio][data-ck-table-chip][value="<wert>"]`; Stückzahl in `span.ck-table__chip-count[data-ck-table-rack]`.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/Controls.html:69-84`, `Resources/Public/JavaScript/table-controls.js:95-499`

### F-STARTPAGE-059  Chip auf ein Feld legen
- **Was:** Ein Klick auf ein Feld des Tuchs legt den gewählten Chip dorthin; mehrere Chips stapeln sich.
- **Wie ausgelöst:** Klick oder Eingabe-/Leertaste auf einem `button[data-ck-field="…"]` im Tuch.
- **Soll-Ergebnis:** Der Chip wird vom Chiprack abgebucht und auf dem Feld gezeichnet; die Ansage nennt Wert, Feldnamen und neuen Gesamteinsatz (`data-text-placed`). Absagen: `nochip` (kein Chip dieser Sorte), `fieldmax` (Feldgrenze), `roundmax` (Rundengrenze), `locked` (Tuch gesperrt), `frozen` (Vertragswette).
- **Vorbedingung:** Chipsorte gewählt, Bestand vorhanden, Tuch nicht gesperrt.
- **Beobachtbar an:** `span[data-ck-stack].ck-chipstack__group` im Feldknopf (vom Skript angelegt, `aria-hidden`); Ansagetext in `p.ck-table__status[role=status]`; `aria-label` des Feldknopfs wird nachgeführt.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-felt.js:134-352`, `Resources/Public/JavaScript/table-bets.js:290-318`

### F-STARTPAGE-060  Obersten Chip zurücknehmen
- **Was:** Ein einzelner Chip wird wieder vom Feld genommen.
- **Wie ausgelöst:** **Umschalt-Klick** auf das Feld oder **Entf**- bzw. **Rücktaste** auf dem fokussierten Feldknopf.
- **Soll-Ergebnis:** Der oberste Chip geht ins Chiprack zurück; Ansage mit Wert, Feldnamen und neuem Gesamteinsatz (`data-text-removed`). Liegt ein Sockel (`freeze`) darunter, wird `frozen` abgesagt.
- **Vorbedingung:** mindestens ein zurücknehmbarer Chip auf dem Feld.
- **Beobachtbar an:** Der Stapel im Feldknopf wird kleiner; Text in `p.ck-table__status`. Die Bedienung steht sichtbar in `p.ck-table__hint` — sie wäre sonst nirgends abzulesen.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-felt.js:354-382`, `Resources/Private/PageView/Partials/Table/Status.html:37-39`

### F-STARTPAGE-061  Erreichbarer Name eines Setzfelds
- **Was:** Jedes Feld sagt Hilfsmitteln, wie es heißt, was es zahlt und wie viel darauf liegt.
- **Wie ausgelöst:** automatisch nach jeder Änderung am Feld.
- **Soll-Ergebnis:** `aria-label` aus `data-text-fieldname` (`{0}` Name, `{1}` Auszahlung, `{2}` Höchstbetrag, `{3}` gesetzt). Leeres Feld → `data-text-fieldname-empty` („nichts gesetzt" statt „0 Euro gesetzt"). Nennt die sichtbare Aufschrift die Auszahlung bereits (erkannt am Satzbau „zahlt … zu"), treten `-stated` / `-stated-empty` an ihre Stelle, damit kein Bildschirmleser sie zweimal sagt. Fehlt ein Attribut, bleibt es bei der bisherigen Zusage.
- **Vorbedingung:** Feld ist ein echter `<button type="button" data-ck-field="…">`; sonst bleibt es unverdrahtet und es erscheint eine Konsolenmeldung.
- **Beobachtbar an:** `aria-label` am Feldknopf. Felder ohne Platz für eine Aufschrift nennen ihren Namen in `data-ck-field-label` und bringen zusätzlich ein serverseitig gesetztes `aria-label` mit.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-felt.js:196-236,383-440`, `Resources/Private/PageView/Partials/Table/Status.html:41-55`

### F-STARTPAGE-062  Setzfläche als Zustand (`BetTable`)
- **Was:** Das Werk hinter dem Tuch: welche Felder es gibt, was darauf liegt, was erlaubt ist.
- **Wie ausgelöst:** `new BetTable({fields, roundMax})`; danach `place()`, `takeBack()`, `undo()`, `clear()`, `double()`, `repeat()`, `settle(ergebnis)`, `sweep()`, `lock()`, `unlock()`, `snapshot()`, `restore()`, `stakeOn()`, `stacksOn()`.
- **Soll-Ergebnis:** Je Feld ein `BetField` mit `id`, `label`, `payout`, `max`, `covers`/`matches`/`push` und `countsToRoundMax` (ohne Angabe `true`). Ein Feld mit `countsToRoundMax: false` unterliegt nur seinem eigenen `max` — für Zusatzwetten, die von der Rundengrenze ausgenommen sind.
- **Vorbedingung:** Feldliste und Rundenhöchstbetrag.
- **Beobachtbar an:** Am Tisch: `bets.total` in der Anzeige `[data-ck-table-amount]`; die gezeichneten Stapel je Feld.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-bets.js:113-567`

### F-STARTPAGE-063  Vertragswetten (`freeze` / `unfreeze`)
- **Was:** Ein Feld bekommt einen Sockel, der nicht mehr abgeräumt werden darf — etwa die Pass Line beim Craps, sobald ihr Point steht.
- **Wie ausgelöst:** `bets.freeze(feldId, betrag)` aus dem Spiel; `bets.unfreeze(feldId)` hebt ihn auf.
- **Soll-Ergebnis:** Bis auf den Sockel darf abgeräumt werden, darunter nicht. `takeBack()` sagt `frozen` ab, `undo()` überspringt geschützte Chips, `clear()` lässt den Sockel liegen, `double()` lässt Felder mit Sockel unangetastet. Ohne `freeze()` ändert sich nichts.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Ansage aus `data-text-frozen` am Ansagebereich; die untersten Chips bleiben liegen.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-bets.js:221-243,319-346,347-453`

### F-STARTPAGE-064  Zurücknehmen, Alles zurück, Verdoppeln, Wiederholen
- **Was:** Vier Knöpfe der Bedienleiste bearbeiten den gelegten Einsatz als Ganzes.
- **Wie ausgelöst:** `[data-ck-table-undo]` (letzter Chip zurück), `[data-ck-table-clear]` (alles zurück), `[data-ck-table-repeat]` (letzten Einsatz wiederholen), `[data-ck-table-double]` (Einsatz verdoppeln).
- **Soll-Ergebnis:** Der Einsatz ändert sich entsprechend; Ansage aus `data-text-undone` bzw. aus `data-text-cleared` / `-doubled` / `-repeated` am Ansagebereich. Rundengrenze überschritten → `data-text-limit`.
- **Vorbedingung:** Tuch nicht gesperrt; für `repeat()` ein vorheriger Einsatz.
- **Beobachtbar an:** `div.ck-table__actions` mit den vier `button.ck-table__button`; Gesamteinsatz in `[data-ck-table-amount]`; Ansage in `[data-ck-table-status]`.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/Controls.html:87-103`, `Resources/Public/JavaScript/table-bets.js:347-510`, `Resources/Public/JavaScript/table-controls.js:95-499`

### F-STARTPAGE-065  Rundenauslöser (nur wenn das Spiel einen hat)
- **Was:** Ein zusätzlicher Knopf startet die Runde — Rad drehen, Würfel werfen, Karten geben.
- **Wie ausgelöst:** Das Spiel übergibt `{go}` (die Beschriftung) an `Table/Controls`. Fehlt sie, wird **kein** Auslöser ausgegeben — der Mustertisch hat keinen.
- **Soll-Ergebnis:** `button.ck-table__button--go[data-ck-table-go]` erscheint bzw. fehlt.
- **Vorbedingung:** das Spiel muss eine Beschriftung übergeben.
- **Beobachtbar an:** Vorhandensein von `[data-ck-table-go]` im HTML.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/Controls.html:100-102`

### F-STARTPAGE-066  Chipkasse: je Sorte einzeln kaufen und zurückgeben
- **Was:** Für jede Chipsorte gibt es einen Kauf- und einen Rückgabeknopf; es wird immer **genau ein** Chip bewegt. Ein Betragsformular gibt es nicht mehr.
- **Wie ausgelöst:** `[data-ck-table-chip-buy="<wert>"]` bzw. `[data-ck-table-chip-sell="<wert>"]`; dahinter `bank.buyChip(wert)` / `bank.sellChip(wert)`.
- **Soll-Ergebnis:** Kauf: Gerätekredit sinkt um den Chipwert, Bestand steigt um 1, Ansage `data-message-chip-buy-done`. Rückgabe: umgekehrt, Ansage `data-message-chip-sell-done`; ohne Bestand `data-message-chip-sell-none`, ohne Kasse `data-message-nocash`, am Höchststand `data-message-chip-full`. Der **Kaufknopf wird nie gesperrt**; der Rückgabeknopf zeigt seinen gesperrten Zustand über `aria-disabled`, ohne den Fokusrahmen mitzunehmen.
- **Vorbedingung:** Guthaben bzw. Chipbestand. **Ein Tisch bekommt diese Chipkasse ohne eine einzige Zeile eigenen Codes** — er rendert `Table/Controls` und übergibt `{chips}`.
- **Beobachtbar an:** `fieldset.ck-table__chipbank`; die sichtbare Beschriftung ist „Kaufen"/„Zurück", die Ergänzung („ein Chip zu 25 Euro") steht als `span.ck-table__hidden-detail` **hinter** dem sichtbaren Wort (WCAG 2.2 SC 2.5.3). Bestand in `[data-ck-table-rack]`.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/BuyIn.html:46-73`, `Resources/Public/JavaScript/table-buyin.js:188-244`

### F-STARTPAGE-067  Chips wechseln (kleiner / größer)
- **Was:** Ein Chip wird in die nächstkleineren zerlegt oder aus ihnen zusammengesetzt — ohne die Kasse zu berühren.
- **Wie ausgelöst:** `[data-ck-table-exchange-down="<wert>"]` bzw. `[data-ck-table-exchange-up="<wert>"]`.
- **Soll-Ergebnis:** Der Bestand ändert sich entsprechend; Ansage `data-message-exchange-down-done` / `-up-done`. Der Einer fehlt in beiden Listen: er hat keine kleineren Stufen.
- **Vorbedingung:** passender Bestand.
- **Beobachtbar an:** `fieldset.ck-table__exchange` mit `button.ck-table__button--small`; die Zahlen in `[data-ck-table-rack]` ändern sich, der Gerätekredit **nicht**.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/BuyIn.html:75-106`, `Resources/Public/JavaScript/table-buyin.js:355-377`, `Resources/Public/JavaScript/table-chips.js:123-137`

### F-STARTPAGE-068  `CASH OUT` am Tisch
- **Was:** Der Spieler tauscht seine Chips zurück und holt das Geld in die Kasse.
- **Wie ausgelöst:** `[data-ck-table-cashout]`; dahinter `bank.cashOut()`.
- **Soll-Ergebnis:** Chipbestand → Gerätekredit → Kasse; Ansage `data-message-cashout-done`. Solange Chips auf dem Tuch liegen, ist der Knopf gesperrt und meldet `data-message-cashout-blocked` — die Sperre ist eine **Regel**, kein Fehler.
- **Vorbedingung:** keine Chips auf dem Tuch.
- **Beobachtbar an:** `button.ck-table__button--cashout[data-ck-table-cashout][aria-disabled="true"|"false"]` — der Knopf bleibt auch im gesperrten Zustand fokussierbar (kein echtes `disabled`, sonst könnte er die Frage „warum geht das nicht" nirgends beantworten).
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/BuyIn.html:108-111`, `Resources/Public/JavaScript/table-buyin.js:245-272`

### F-STARTPAGE-069  Anzeigen: Einsatz und Bestand
- **Was:** Zwei Zähler zeigen den aktuellen Einsatz und den gesetzten Betrag.
- **Wie ausgelöst:** jede Änderung am Einsatz oder am Bestand.
- **Soll-Ergebnis:** Die gezeichnete Tafel wird nachgeführt; angesagt wird der ganze Satz über den Ansagebereich (`data-text-amount`, `data-text-rack-count`), die Tafel selbst trägt `aria-hidden="true"`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `div.ck-table__meters[aria-hidden="true"]` mit `[data-ck-table-amount]` und `[data-ck-table-staked]`.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/Controls.html:105-117`

### F-STARTPAGE-070  Verlaufsstreifen der letzten Ergebnisse
- **Was:** Eine Chronik der zuletzt gefallenen Ergebnisse zum Nachsehen.
- **Wie ausgelöst:** `connectHistory(element, optionen)`; gefüllt vom Spiel nach jeder Runde.
- **Soll-Ergebnis:** Einträge in einer `<ol>` (die Reihenfolge **ist** die Aussage). **Kein** Live-Bereich — jedes Ergebnis spricht ohnehin schon der Ansagebereich; beides zugleich hieße, es zweimal zu hören. Solange die Liste leer ist, steht ein eigener Absatz da (kein Listeneintrag, damit die Liste nicht fälschlich einen Eintrag meldet).
- **Vorbedingung:** keine. Am Mustertisch bleibt der Streifen leer, weil dort nie eine Runde endet.
- **Beobachtbar an:** `ol.ck-history[data-ck-table-history]` und `p.ck-table__history-empty[data-ck-table-history-empty]`.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/History.html:16-22`, `Resources/Public/JavaScript/table-history.js:65-126`

### F-STARTPAGE-071  Rundenablauf als Zustandswerk (`table-round.js`)
- **Was:** Der geteilte Ablauf einer Runde: `setzen` → `gesperrt` → `laeuft` → `auswerten` → `auszahlen` → `setzen`.
- **Wie ausgelöst:** Übergangsmethoden aus dem Spiel; `abort()` führt aus **jedem** Zustand zurück nach `setzen`.
- **Soll-Ergebnis:** Ein unerlaubter Übergang liefert `{ok:false}` und ändert nichts — die Maschine **wirft nicht**, weil der häufigste unerlaubte Übergang der zweite Klick auf „drehen" vor Abschluss des ersten ist. `gesperrt` ist ein eigener Zustand („Nichts geht mehr"), nicht nur ein Augenblick.
- **Vorbedingung:** keine. Am Mustertisch wird dieses Modul **nicht** eingebunden — ein Zustandswerk ohne Ereignis sähe aus wie ein Spiel und wäre keines.
- **Beobachtbar an:** Der Zustandsname landet am Gerät als `data-`Attribut und als CSS-Klassenteil (deshalb `laeuft` ohne Umlaut).
- **Umgesetzt in:** `Resources/Public/JavaScript/table-round.js:48-135`

### F-STARTPAGE-072  Tischkasse (`openTableBank`) und Abräumweg
- **Was:** Die Geldseite eines Tisches: Gerätekredit, Chipbestand, Buy-in, Auszahlung.
- **Wie ausgelöst:** `openTableBank('<schlüssel>')`; danach `canPlace()`, `buyIn()`, `buyChip()`, `sellChip()`, `cashOut()`, `placeChip()`, `returnChip()`, `payout(returned, sweptStake)`, `exchangeDown()`, `exchangeUp()`, `close()`, `subscribe()`.
- **Soll-Ergebnis:** Die fünf Bausteine werden in der Reihenfolge Geld → Setzfläche → Verlauf → Ansicht → Bedienleiste verdrahtet; schlägt ein Schritt fehl, werden die schon gebauten in umgekehrter Reihenfolge abgeräumt. Der `pagehide`-Weg liegt in `table-controls.js` (nicht im Geldbaustein): sie ruft `felt.destroy()` und `bank.close()`.
- **Vorbedingung:** **Ein Tisch, der `connectControls()` nicht benutzt, muss `bank.close()` beim Verlassen der Seite selbst rufen** — sonst wandert der Buy-in nicht in die Kasse zurück.
- **Beobachtbar an:** Nach dem Verlassen der Tischseite steht der Betrag wieder in der Kassenanzeige des Saals.
- **Umgesetzt in:** `Resources/Public/JavaScript/table-buyin.js:95-462`, `Resources/Public/JavaScript/table-controls.js:95-499`

---

## Der Mustertisch — der Beispieltisch ohne Spiel

### F-STARTPAGE-073  Inhaltselement „Mustertisch" anlegen
- **Was:** Der Redakteur stellt den Beispieltisch auf eine Seite.
- **Wie ausgelöst:** Backend → Neues Inhaltselement → Gruppe „Casino Kunterbunt" → „Mustertisch". Es gibt **nichts** auszuwählen: anlegen und speichern.
- **Soll-Ergebnis:** `tt_content.CType = casino_tisch_muster`, Icon `content-casino-tisch`, keine eigene Datenbankspalte, kein Schema-Schritt. Gerendert über `tt_content.casino_tisch_muster` (FLUIDTEMPLATE, per `addTypoScriptSetup()` in `ext_localconf.php`, nicht über das Site Set — damit der Mustertisch sich genauso anmeldet wie eine fremde Tisch-Extension).
- **Vorbedingung:** Backend-Anmeldung.
- **Beobachtbar an:** Spaltenwert `CType = casino_tisch_muster`; im Frontend `div.ck-table.ck-room-fill[data-ck-table][data-ck-table-key="muster_tisch"]`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:129-138`, `ext_localconf.php:67-82`, `Resources/Private/ContentElements/CasinoTischMuster.html:27-40`

### F-STARTPAGE-074  Mustertisch-Kachel im Saal
- **Was:** Der Mustertisch meldet sich bei der Registry an wie jedes fremde Gerät und erscheint als Tischkachel im Saal.
- **Wie ausgelöst:** `AutomatRegistry::register()` in der `ext_localconf.php` dieser Extension mit Schlüssel `muster_tisch`, Gattung `Tisch`, Gehäuse-Partial `Table/MustertischCabinet`.
- **Soll-Ergebnis:** Der Tisch steht in der Backend-Auswahlliste unter „Tische"; im Saal rendert `div.ck-slot--tisch[data-automat="muster_tisch"]`. Zugleich liefert die Geräteseite über `casino-device-description` ihre Meta-Beschreibung und einen `Game`-Eintrag mit `genre: Tischspiel`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-automat="muster_tisch"][data-gattung="tisch"]`; auf der Tischseite `<meta name="description">` und JSON-LD mit `"genre":"Tischspiel"`.
- **Umgesetzt in:** `ext_localconf.php:43-50,67-82`, `Classes/Automat/Mustertisch.php:42-66`, `Resources/Private/Partials/Table/MustertischCabinet.html`

### F-STARTPAGE-075  Tuch mit vier Feldern A–D
- **Was:** Vier Setzfelder mit echten Auszahlungen und Höchsteinsätzen, aber ohne Ergebnis.
- **Wie ausgelöst:** Klick / Umschalt-Klick / Entf auf einem der vier Feldknöpfe (siehe F-STARTPAGE-059 und -060).
- **Soll-Ergebnis:** A zahlt 1:1 (Höchsteinsatz 100), B 2:1 (100), C 8:1 (40), D 35:1 (10); Gesamteinsatz je Runde höchstens 100. `covers` ist überall leer — **ohne Ergebnis gewinnt kein Feld**.
- **Vorbedingung:** Chip gewählt und im Bestand.
- **Beobachtbar an:** `div.ck-felt--muster` mit vier `button.ck-felt__field[data-ck-field="feld-a|b|c|d"]`; jedes trägt `data-ck-field-label` mit **nur** dem Feldnamen (ohne die sichtbare Quote daneben), damit die Quote nicht zweimal im erreichbaren Namen steht.
- **Umgesetzt in:** `Resources/Private/PageView/Partials/Table/MusterCloth.html:37-58`, `Resources/Public/JavaScript/muster-tisch.js:47-54`

### F-STARTPAGE-076  Was der Mustertisch hat und was ausdrücklich nicht
- **Was:** Er zeigt die geteilten Tischbausteine vollständig, ist aber kein Spiel.
- **Wie ausgelöst:** Aufruf der Seite mit dem Inhaltselement „Mustertisch".
- **Soll-Ergebnis:** Vorhanden: die fünf Chips, die Setzfläche als Zustand und als Ansicht, der Buy-in gegen die Kasse, die Bedienleiste mit Chipwahl / Zurücknehmen / Alles zurück / Wiederholen / Verdoppeln / Wechselfeld / `CASH OUT`, der Verlaufsstreifen (bleibt leer, weil nie eine Runde endet). **Nicht** vorhanden: ein Ergebnis, ein Rundenauslöser, ein Klang; `table-round.js` wird nicht eingebunden.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Im HTML fehlt `[data-ck-table-go]`; `ol.ck-history` bleibt leer und `p.ck-table__history-empty` sichtbar; kein Ton.
- **Umgesetzt in:** `Resources/Public/JavaScript/muster-tisch.js:1-147`, `Resources/Private/ContentElements/CasinoTischMuster.html:34-40`

### F-STARTPAGE-077  Reihenfolge beim Durchgehen mit der Tastatur
- **Was:** Wer den Tisch zum ersten Mal betritt, hört zuerst, wie er bedient wird.
- **Wie ausgelöst:** Tabulatortaste auf der Tischseite.
- **Soll-Ergebnis:** Hinweis und Ansage → Tuch → Bedienleiste → Verlauf. Der Chipsatz (`Table/ChipSprite`) wird als Erstes gerendert, weil ein `<use>` nur auf ein schon im Dokument stehendes `<symbol>` zeigen kann.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Reihenfolge der Kindelemente in `div.ck-table`: ChipSprite, Status, MusterCloth, Controls, History.
- **Umgesetzt in:** `Resources/Private/ContentElements/CasinoTischMuster.html:34-40`

### F-STARTPAGE-078  Fehlerhaft aufgebauter Tisch reißt die Seite nicht mit
- **Was:** Ein Tisch mit falschem Markup fällt aus, ohne den Rest der Seite zu beschädigen.
- **Wie ausgelöst:** Fehlendes `data-ck-table-key`, ein `[data-ck-field]`, das kein `<button type="button">` ist, oder eine Feldkennung, die die Feldliste nicht kennt.
- **Soll-Ergebnis:** Konsolenmeldung; die schon gebauten Bausteine werden in umgekehrter Reihenfolge abgeräumt (`controls.destroy()`, `felt.destroy()`, `bank.close()`). Ein einzelnes unbekanntes Feld bleibt unverdrahtet, der Rest läuft.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Meldung in der Browserkonsole (`[casino] muster-tisch.js: …` bzw. `table-felt.js: …`); der Saal darum herum bleibt bedienbar.
- **Umgesetzt in:** `Resources/Public/JavaScript/muster-tisch.js:68-123`, `Resources/Public/JavaScript/table-felt.js:383-440`

---

## Gemeinsame Grundlage, die sich am Gerät äußert

### F-STARTPAGE-079  Design-Tokens (`tokens.css`)
- **Was:** Der gemeinsame Farb-, Schrift- und Abstandsvorrat des Hauses; Saal und Geräte leben aus demselben Vorrat.
- **Wie ausgelöst:** `page.includeCSS` lädt `tokens.css` **vor** `base.css` (die Reihenfolge ist bindend); eine Geräte-Extension benutzt die Tokennamen in ihrem eigenen CSS und SVG.
- **Soll-Ergebnis:** Rund 176 CSS Custom Properties nach dem Schema `--ck-<werkstoff>-<abstufung|rolle>` (z. B. `--ck-neon-pink`, `--ck-chrome-300`, `--ck-felt-green`, `--ck-fruit-cherry`). Eine Automaten-Extension definiert **keine eigenen Farben**. Fehlt ein Werkstoff, gehört der neue Token nach `tokens.css` und trägt den Namen des **Werkstoffs**, nie den des Geräts.
- **Vorbedingung:** Site Set zugewiesen.
- **Beobachtbar an:** `<link>` auf `tokens.css` vor `base.css` im `<head>`; in den SVG der Gehäuse steht `fill="var(--ck-wood-300)"` statt einer ausgeschriebenen Farbe.
- **Umgesetzt in:** `Resources/Public/Css/tokens.css`, `Configuration/Sets/CasinoKunterbunt/setup.typoscript:39-44`

### F-STARTPAGE-080  Import-Map-Präfix `@phomo17/casino-startpage/`
- **Was:** Der eine Name, unter dem jedes Gerät die geteilten Browser-Bausteine lädt.
- **Wie ausgelöst:** `<f:asset.module identifier="@phomo17/casino-startpage/xyz.js" />` im Template; `import { … } from '@phomo17/casino-startpage/xyz.js'` im Modul. Es gibt keinen Build-Schritt und kein `page.includeJSModule` (existiert in TYPO3 13.4 nicht).
- **Soll-Ergebnis:** Das Präfix zeigt auf `EXT:casino_startpage/Resources/Public/JavaScript/`. **Ausnahmslos** über dieses Präfix importieren, nie relativ zwischen Extensions: dieselbe Datei unter zwei Adressen ist für den Browser zweimal dasselbe Modul — gemessen am 2026-09-10 ergab das zwei `konto`-Objekte, zwei Kundenkennungen und zwei Buchungsnummern-Zähler (Audit N-01, behoben).
- **Vorbedingung:** Die Geräte-Extension trägt `'dependencies' => ['casino_startpage']` **und** ihr eigenes Präfix in `Configuration/JavaScriptModules.php`; ohne den `dependencies`-Eintrag bricht der Browser mit „Failed to resolve module specifier" ab.
- **Beobachtbar an:** `<script type="importmap">` im ausgelieferten HTML mit dem Eintrag `@phomo17/casino-startpage/`.
- **Umgesetzt in:** `Configuration/JavaScriptModules.php:73-78`

### F-STARTPAGE-081  Gattungs-Icons im Backend
- **Was:** Automat und Tisch haben je ein eigenes, selbst gezeichnetes Symbol.
- **Wie ausgelöst:** `Gattung::getIcon()` liefert `content-casino-automat` bzw. `content-casino-tisch`.
- **Soll-Ergebnis:** Das Symbol erscheint im Seitenmodul, im Assistenten „Neues Inhaltselement" und in der Geräte-Auswahlliste.
- **Vorbedingung:** Backend-Anmeldung.
- **Beobachtbar an:** Icon-Bezeichner im Backend-Markup; Dateien `Resources/Public/Icons/ContentCasinoAutomat.svg` / `ContentCasinoTisch.svg`.
- **Umgesetzt in:** `Configuration/Icons.php:18-27`, `Classes/Automat/Gattung.php:64-70`

### F-STARTPAGE-082  Tischbausteine reden mit einer Lobby, ohne sie zu kennen
- **Was:** An den Tisch-Bausteinen kann eine Lobby hängen, ohne dass dieses Site Package die Lobby kennt.
- **Wie ausgelöst:** Vier DOM-Ereignisse, über die die Tische ausschließlich reden: `casino:lobby-stand`, `casino:lobby-runde`, `casino:lobby-fertig`, `casino:lobby-handlung`.
- **Soll-Ergebnis:** Der Lobby-Mechanismus (`lobby-seed.js` u. a.) liegt vollständig in `casino_lobby`, nicht hier; für diese Extension ändert sich dadurch nichts.
- **Vorbedingung:** Lobby-Extension installiert.
- **Beobachtbar an:** Die vier Ereignisnamen im Ereignismitschnitt des Browsers. **Anmerkung:** In den Dateien dieser Extension selbst kommt keiner der vier Namen vor — sie stehen nur in der README (Abschnitt „Stand").
- **Umgesetzt in:** README.md (Abschnitt „Stand"); in `Resources/Public/JavaScript/` dieser Extension nicht auffindbar

### F-STARTPAGE-083  QR-Modus als Schalter über allem
- **Was:** Ist der QR-Modus eingeschaltet, laufen Kasse und Risiko-Leiter dieses Site Packages über das serverseitige Konto statt über den Browserspeicher.
- **Wie ausgelöst:** Der Schalter liegt in der Konten-Extension; hier wirkt er allein über das Vorhandensein von `script[type="application/json"][data-ca-state]` im `<head>` (siehe F-STARTPAGE-040).
- **Soll-Ergebnis:** QR-Modus **aus** → alles verhält sich exakt wie vor Ausbaustufe 3. QR-Modus **an** → Buchungen gehen an den Server; das freie Setzen und der ganze Aufladeteil des Leuchtschilds verschwinden für Nicht-Admins aus dem Dokument. Der Schutz dahinter richtet sich gegen Versehen und Neugier, nicht gegen Angriffe.
- **Vorbedingung:** Konten-Extension installiert (dieses Site Package kennt sie an keiner Stelle beim Namen).
- **Beobachtbar an:** Vorhandensein von `[data-ca-state]` im `<head>`; Fehlen von `[data-ck-credit-form]` und `[data-ck-credit-set]` im HTML-Baum für Nicht-Admins.
- **Umgesetzt in:** `Resources/Public/JavaScript/account-backend.js:117-129`, `Resources/Public/JavaScript/credit-display.js:217-219`, `Resources/Public/JavaScript/credit-set.js:180-183`

---

## Beobachtungen, nicht bewertet

- Die README nennt zwölf geteilte Browser-Bausteine; unter `Resources/Public/JavaScript/` liegen 19 Produktionsmodule — neben den zwölf noch `risk-timing.js`, `table-controls.js`, `table-history.js`, `credit-display.js`, `credit-set.js`, `account-backend.js` und `muster-tisch.js`.
- Der Abschnitt „Stand" der README nennt die vier Lobby-Ereignisse (`casino:lobby-stand`, `-runde`, `-fertig`, `-handlung`); in den Dateien dieser Extension kommt keiner der vier Namen vor.
- Die README beschreibt unter „Ein fertiges Leuchtschild statt eigener Verdrahtung", dass der Bedienteil `credit-set.js` in Stufe 3 „ersatzlos verschwindet" und dafür zwei Dateien plus eine `<f:render>`-Zeile gelöscht werden; der Dateikopf von `credit-set.js` hält im Nachtrag fest, dass dieser Rückbau nicht stattfindet und das Ausblenden stattdessen zur Laufzeit und nur für Nicht-Admins geschieht.
- Die README nennt als Vertrag für das Gehäuse-Partial „eine `viewBox` im Seitenverhältnis 100 : 160 (DESIGNBRIEF.md Abschnitt 1) — je nach Gattung, siehe Tabelle oben"; die Tabelle darüber nennt für einen Tisch `0 0 160 100`.
- `table-buyin.js` enthält weiterhin die Methode `buyIn(amount)`; laut README und dem Kopf von `Table/BuyIn.html` führt seit dem 2026-09-07 kein Bedienteil mehr dorthin.
- `Resources/Private/Partials/Table/MustertischCabinet.html` liegt unter `Resources/Private/Partials/` (dem Verzeichnis, das der Registry-Vertrag vorschreibt), während alle übrigen Tisch-Partials unter `Resources/Private/PageView/Partials/Table/` liegen.
- Der Mustertisch übergibt an `connectFelt()` kein `texts.frozen`, `texts.fieldnameStated` und `texts.fieldnameStatedEmpty`, obwohl `Table/Status.html` die zugehörigen `data-text-*`-Attribute ausliefert.

---

<!-- ===================== casino_lobby ===================== -->

# Funktionsinventur: `casino_lobby` (das gemeinsame Spielen)

Diese Extension bringt die Lobbys an Roulette, Blackjack und Craps: mehrere
Personen sitzen an einem Tisch, sehen einander namentlich, teilen eine Runde,
eine Setzuhr und dieselbe Zufallssaat. Sie ist **rein additiv** — ohne
eingeschalteten QR-Modus aus `casino_account` existiert nichts davon.

Kennung der Funktionen: `F-LOBBY-<Nr.>`. Dateipfade sind relativ zu
`typo3conf/ext/casino_lobby/`.

---

## Die Weiche an der Tischadresse

### F-LOBBY-01  Weiche: Tisch oder Übersicht
- **Was:** Wer `/roulette`, `/blackjack` oder `/craps` aufruft, bekommt entweder den Tisch mit Platzleiste (wenn er schon einen Platz hat oder gerade einen bekommt) oder die Übersichtsseite "An welchem Tisch möchtest du spielen?".
- **Wie ausgelöst:** Gewöhnlicher Seitenaufruf der Tischadresse (GET).
- **Soll-Ergebnis:** Entweder die gewohnte Tischseite, um eine Platzleiste vor `</body>` ergänzt — oder eine völlig andere, selbst gezeichnete HTML-Seite mit Tischliste.
- **Vorbedingung:** QR-Modus AN, gültige Sitzung (Merkmal `casino_account.player`), auf der Seite liegt ein Inhaltselement mit `CType` `roulette`, `blackjack` oder `craps`.
- **Beobachtbar an:** Tischfall — `<div class="cl-strip" data-cl-strip id="cl-strip">` im HTML; Übersichtsfall — `<body class="cl-page">` mit `<ul data-cl-list>`, Kopfzeile `X-Robots-Tag: noindex, nofollow`. Beide Fälle: `Cache-Control: no-store, private`.
- **Umgesetzt in:** `Classes/Middleware/LobbyTable.php:60-93`

### F-LOBBY-02  Spielerkennung über das Inhaltselement der Seite
- **Was:** Das System erkennt, welches Spiel auf der aufgerufenen Seite steht, indem es in der Datenbank nach einem Inhaltselement mit passendem Typ sucht — der Mustertisch (`casino_tisch_muster`) fällt dabei durch.
- **Wie ausgelöst:** Automatisch bei jedem Seitenaufruf mit eingeschaltetem QR-Modus und gültiger Sitzung.
- **Soll-Ergebnis:** Auf einer Seite ohne eines der drei Inhaltselemente passiert gar nichts — die Seite wird unverändert durchgereicht, ohne Platzleiste und ohne Zustandsblock.
- **Vorbedingung:** QR-Modus AN, Sitzung vorhanden, aufgelöste Seiten-ID > 0.
- **Beobachtbar an:** Fehlen von `data-cl-strip` und `<script data-cl-state>` im HTML einer Nicht-Tischseite.
- **Umgesetzt in:** `Classes/Middleware/LobbyTable.php:104-133`

### F-LOBBY-03  Automatisches Eröffnen beim ersten Aufruf
- **Was:** Wer ein Lobbyspiel öffnet und keine einzige Lobby dafür vorfindet, eröffnet automatisch eine und sitzt sofort auf Platz 1.
- **Wie ausgelöst:** Seitenaufruf der Tischadresse, wenn `tx_casinolobby_lobby` für dieses Spiel leer ist.
- **Soll-Ergebnis:** Neue Zeile in `tx_casinolobby_lobby` (Zustand `setzen`, `round_no` 0, `revision` 1, `owner` = eigene Spieler-Nummer), neue Zeile in `tx_casinolobby_seat` mit `seat_no` 1; die Tischseite erscheint samt Platzleiste, keine Übersicht.
- **Vorbedingung:** QR-Modus AN, angemeldet, keine bestehende Lobby dieses Spiels.
- **Beobachtbar an:** `data-cl-strip` im HTML; `<script data-cl-state>` enthält `"platz":1`; Tabellenzeilen in `tx_casinolobby_lobby` / `tx_casinolobby_seat`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:442-476` (`platzHolen`), `Classes/Service/LobbyService.php:516-573` (`eroeffnen`)

### F-LOBBY-04  Umzug von einem anderen Spiel beim Seitenaufruf
- **Was:** Wer bereits an einem anderen Spiel sitzt und die Adresse eines anderen Tisches aufruft, wird am alten Tisch stillschweigend abgemeldet — eine Person steht immer nur an einem Gerät.
- **Wie ausgelöst:** Seitenaufruf einer Tischadresse eines anderen Spiels.
- **Soll-Ergebnis:** Der alte Platz verschwindet aus `tx_casinolobby_seat`, die alte Lobby bekommt `revision` + 1 (und schließt sich beim nächsten Aufräumen, wenn sie dadurch leer wurde); am neuen Spiel wird beigetreten oder eröffnet.
- **Vorbedingung:** QR-Modus AN, angemeldet, bestehender Platz an einem anderen Spiel.
- **Beobachtbar an:** `tx_casinolobby_seat` enthält für diese Person nur noch die neue Zeile (`UNIQUE KEY player`); die anderen am alten Tisch sehen den Platz als `frei`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:449-462`

### F-LOBBY-05  Einspeisen von Stylesheet, Zustandsblock und Platzleiste
- **Was:** In die fertig gerenderte Tischseite werden nachträglich drei Dinge hineingeschrieben: das Lobby-Stylesheet, ein maschinenlesbarer Zustandsblock im Kopf und die Platzleiste vor `</body>`.
- **Wie ausgelöst:** Automatisch, nachdem TYPO3 die Tischseite gerendert hat (Status 200, `text/html`).
- **Soll-Ergebnis:** Im Kopf steht unmittelbar nach `<head…>` ein `<script type="application/json" data-cl-state>` mit Endpunktadressen, Spiel, Lobby-Nummer, eigener Platznummer, Platzzahl, Melder-Kennzeichen, Takt (1000/3000 ms) und Frist (30); dahinter das Stylesheet; vor `</body>` die Leiste. `Content-Length` wird entfernt, damit der Webserver die gewachsene Seite nicht abschneidet.
- **Vorbedingung:** QR-Modus AN, eigener Platz vorhanden, Antwort enthält `<head>` und `</head>`.
- **Beobachtbar an:** `<script type="application/json" data-cl-state>` als erstes Kind von `<head>`; `<link rel="stylesheet" …lobby.css>`; fehlende `Content-Length`-Kopfzeile.
- **Umgesetzt in:** `Classes/Middleware/LobbyTable.php:140-202`, `Classes/Service/LobbyState.php:43-70`

---

## Die Übersichtsseite ("An welchem Tisch möchtest du spielen?")

### F-LOBBY-06  Tischliste mit Belegung
- **Was:** Die Übersicht listet alle offenen Tische dieses Spiels auf, jeweils mit Namen ("Tisch 9") und Belegung als Satz ("3 von 8 Plätzen belegt").
- **Wie ausgelöst:** Aufruf der Tischadresse ohne eigenen Platz, wenn mindestens eine Lobby existiert.
- **Soll-Ergebnis:** Eine `<ul>` mit einem `<li>` je Lobby; Überschrift "An welchem Tisch möchtest du spielen?", Einleitungssatz "An diesem Tisch wird schon gespielt. Setz dich dazu oder mach einen neuen Tisch auf."
- **Vorbedingung:** QR-Modus AN, angemeldet, kein eigener Platz, mindestens eine Lobby dieses Spiels.
- **Beobachtbar an:** `<li class="cl-overview__item" data-cl-lobby="<uid>">` mit `<span data-cl-belegung>`; Seitentitel "`<Spielname>` – An welchem Tisch möchtest du spielen?".
- **Umgesetzt in:** `Classes/Frontend/LobbyOverviewPage.php:45-90`, `Resources/Private/Templates/Lobby/Overview.html:40-68`

### F-LOBBY-07  Knopf "Hier setzen" (Beitreten)
- **Was:** Ein Knopf je Tisch, der die aufrufende Person an diesen Tisch setzt.
- **Wie ausgelöst:** Klick auf `button[data-cl-join="<uid>"]`; schickt POST `{"art":"beitreten","lobby":<uid>}`.
- **Soll-Ergebnis:** Neue Zeile in `tx_casinolobby_seat` mit der kleinsten freien Platznummer; die Seite lädt sich neu und zeigt jetzt den Tisch mit Platzleiste statt der Übersicht.
- **Vorbedingung:** QR-Modus AN, angemeldet, kein eigener Platz, Tisch nicht voll.
- **Beobachtbar an:** Antwort `{"ok":true,"lobby":<uid>,"platz":<nr>}`; nach dem Neuladen `data-cl-strip` im HTML.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:612-623`, `Classes/Service/LobbyService.php:607-676`

### F-LOBBY-08  Voller Tisch: Knopf bleibt erreichbar, aber wirkungslos
- **Was:** An einem vollen Tisch trägt der Beitreten-Knopf `aria-disabled="true"` statt `disabled`, damit er in der Tabulatorreihenfolge bleibt; der Klick wird abgefangen, zusätzlich steht "Dieser Tisch ist voll." daneben.
- **Wie ausgelöst:** Klick auf einen Beitreten-Knopf mit `aria-disabled="true"`.
- **Soll-Ergebnis:** Keine Anfrage an den Server, keine Änderung an der Seite.
- **Vorbedingung:** QR-Modus AN, Übersicht sichtbar, Belegung des Tisches = `seats_max`.
- **Beobachtbar an:** `button … aria-disabled="true" data-cl-join="<uid>"` plus `<span class="cl-overview__full">Dieser Tisch ist voll.</span>`; keine Netzanfrage beim Klick.
- **Umgesetzt in:** `Resources/Private/Templates/Lobby/Overview.html:57-65`, `Resources/Public/JavaScript/lobby-live.js:613-618`

### F-LOBBY-09  Knopf "Neuen Tisch aufmachen"
- **Was:** Eröffnet einen weiteren Tisch desselben Spiels und setzt die eröffnende Person auf Platz 1.
- **Wie ausgelöst:** Klick auf `button[data-cl-open]`; schickt POST `{"art":"eroeffnen","spiel":"<key>"}`.
- **Soll-Ergebnis:** Neue Lobby-Zeile, eigener Platz 1, Seite lädt neu und zeigt den Tisch.
- **Vorbedingung:** QR-Modus AN, angemeldet, kein eigener Platz, weniger als 4 Lobbys dieses Spiels.
- **Beobachtbar an:** Antwort `{"ok":true,"lobby":…,"platz":1}`; eine zusätzliche Zeile in `tx_casinolobby_lobby`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:624-626`, `Classes/Service/LobbyService.php:516-573`

### F-LOBBY-10  Obergrenze von vier Tischen je Spiel
- **Was:** Mehr als vier Tische je Spiel gibt es nicht; statt des Knopfes steht dann der Satz "Mehr als 4 Tische gibt es bei diesem Spiel nicht."
- **Wie ausgelöst:** Anzeige der Übersicht bei bereits 4 Lobbys; bzw. eine trotzdem gesendete `eroeffnen`-Handlung.
- **Soll-Ergebnis:** Kein Eröffnen-Knopf im HTML; eine dennoch gesendete Handlung antwortet `{"ok":false,"grund":"zu_viele"}` mit HTTP 200.
- **Vorbedingung:** QR-Modus AN, 4 Lobbys dieses Spiels vorhanden (`LobbyGames::MAX_LOBBYS`).
- **Beobachtbar an:** `<span class="cl-overview__note">` statt `button[data-cl-open]`; Antwortfeld `"neu":0` an `/casino-lobby/uebersicht`.
- **Umgesetzt in:** `Classes/Lobby/LobbyGames.php:40`, `Classes/Service/LobbyService.php:530-534`, `Resources/Private/Templates/Lobby/Overview.html:70-75`

### F-LOBBY-11  Übersicht führt sich selbst nach (Takt 3 Sekunden)
- **Was:** Die Belegungszahlen der Tischliste werden alle drei Sekunden nachgeführt, ohne dass man die Seite neu lädt; der Eröffnen-Knopf erscheint oder verschwindet entsprechend.
- **Wie ausgelöst:** Zeitablauf — verketteter `setTimeout` mit `zustand.taktUebersicht` (3000 ms) gegen `GET /casino-lobby/uebersicht?spiel=<key>&r=<Stand>`.
- **Soll-Ergebnis:** Der Text in `[data-cl-belegung]` ändert sich auf die neue Zahl; `button[data-cl-open]` wird über `hidden` ein- oder ausgeblendet.
- **Vorbedingung:** QR-Modus AN, Übersicht offen, Registerkarte sichtbar.
- **Beobachtbar an:** Wiederkehrende Anfragen an `/casino-lobby/uebersicht` im Sekundenabstand 3; geänderter Textinhalt von `[data-cl-belegung]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:505-580`, `Classes/Middleware/LobbyEndpoint.php:138-165`

### F-LOBBY-12  Übersichtsseite mit Kontenleiste und ohne Suchmaschinen
- **Was:** Die selbst gezeichnete Übersichtsseite bekommt die Kontenleiste aus `casino_account` wie jede andere Seite und ist für Suchmaschinen gesperrt.
- **Wie ausgelöst:** Automatisch beim Rendern der Übersicht.
- **Soll-Ergebnis:** Gesamtvermögen und Abmelden-Knopf oben auf der Seite; `<meta name="robots" content="noindex,nofollow">` und Kopfzeile `X-Robots-Tag: noindex, nofollow`; HTTP 200 (nicht 401, nicht 302).
- **Vorbedingung:** QR-Modus AN, angemeldet, kein eigener Platz.
- **Beobachtbar an:** Kopfzeile `X-Robots-Tag`, `<meta name="robots">`, Statuscode 200.
- **Umgesetzt in:** `Classes/Frontend/LobbyOverviewPage.php:86-89`, `Configuration/RequestMiddlewares.php:74-80`

---

## Platzvergabe

### F-LOBBY-13  Kleinste freie Platznummer
- **Was:** Ein Beitritt bekommt immer die kleinste noch freie Platznummer von 1 bis `seats_max` — auch nach einem Freiwerden, damit keine Lücken entstehen.
- **Wie ausgelöst:** Handlung `beitreten` (Knopf "Hier setzen").
- **Soll-Ergebnis:** `tx_casinolobby_seat.seat_no` = kleinste freie Zahl; wird Platz 2 von 5 frei und tritt jemand bei, bekommt er 2 und nicht 6.
- **Vorbedingung:** QR-Modus AN, angemeldet, kein eigener Platz, mindestens eine freie Nummer.
- **Beobachtbar an:** Antwortfeld `"platz"` der Handlung; Spalte `seat_no`; die Platzleiste zeigt den Namen an genau dieser Stelle.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:630-644`

### F-LOBBY-14  Voller Tisch wird abgesagt
- **Was:** Ist keine Platznummer mehr frei, wird der Beitritt abgelehnt — ohne Fehlerseite.
- **Wie ausgelöst:** Handlung `beitreten` an eine volle Lobby.
- **Soll-Ergebnis:** Antwort `{"ok":false,"grund":"voll"}` mit HTTP 200; keine neue Zeile in `tx_casinolobby_seat`; die Seite lädt nicht neu.
- **Vorbedingung:** QR-Modus AN, angemeldet, Lobby besetzt bis `seats_max`.
- **Beobachtbar an:** JSON-Antwort `grund: "voll"`, Statuscode 200.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:640-644`

### F-LOBBY-15  Platz 1 sitzt ganz rechts
- **Was:** Die eröffnende Person sitzt optisch am rechten Ende des Tisches; die Plätze werden von rechts nach links gezeichnet.
- **Wie ausgelöst:** Automatisch beim Zeichnen der Platzleiste.
- **Soll-Ergebnis:** Platz 1 erscheint rechts, die höheren Nummern nach links — die Reihenfolge im HTML bleibt dabei aufsteigend (1, 2, 3 …).
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `.cl-strip__seats { flex-direction: row-reverse; }`; im HTML steht `data-cl-seat="1"` als erstes `<li>`.
- **Umgesetzt in:** `Resources/Public/Css/lobby.css:173-181`, `Classes/Frontend/SeatStrip.php:75-104`

### F-LOBBY-16  Zweiter Platz für dieselbe Person wird abgefangen
- **Was:** Eine Person kann im ganzen Haus höchstens einen Platz haben. Ein zweiter Versuch derselben Person wird entweder als "du sitzt ja schon hier" bejaht oder mit "bereits andernorts" abgesagt — nie mit einem Serverfehler.
- **Wie ausgelöst:** Handlung `eroeffnen` oder `beitreten`, obwohl schon ein Platz besteht (z. B. beim Wiederaufwachen der Registerkarte oder bei zwei fast gleichzeitigen Anfragen).
- **Soll-Ergebnis:** Zielt die Handlung auf denselben Tisch bzw. dasselbe Spiel: `{"ok":true, …}` mit dem tatsächlichen Platz. Zielt sie woandershin: `{"ok":false,"grund":"bereits_andernorts"}`. In beiden Fällen HTTP 200, kein 500.
- **Vorbedingung:** QR-Modus AN, angemeldet, bestehender Platz.
- **Beobachtbar an:** JSON-Antwort (`ok`/`grund`), Statuscode 200; Datenbankschlüssel `UNIQUE KEY player` in `tx_casinolobby_seat`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:577-586` und `:684-698`, `ext_tables.sql:82`

### F-LOBBY-17  Knopf "Tisch verlassen"
- **Was:** Der Knopf unten in der Platzleiste gibt den eigenen Platz ausdrücklich frei.
- **Wie ausgelöst:** Klick auf `button[data-cl-leave]`; schickt POST `{"art":"verlassen"}`; danach lädt die Seite neu.
- **Soll-Ergebnis:** Die eigene Zeile in `tx_casinolobby_seat` ist weg, die eigenen Einsatz-Anzeigezeilen in `tx_casinolobby_bet` sind gelöscht (keine Rückbuchung!), die Lobby bekommt `revision` + 1; die anderen sehen den Platz binnen einer Sekunde als `frei`; die eigene Seite zeigt danach die Übersicht.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Antwort `{"ok":true}`; `[data-cl-seat="<nr>"] .cl-seat__name` zeigt bei den anderen "frei"; die Zeile ist aus `tx_casinolobby_seat` verschwunden.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:462-467`, `Classes/Service/LobbyService.php:701-742`

### F-LOBBY-18  Kein Verlassen mehr beim Schließen des Tabs
- **Was:** Das Schließen oder Neuladen der Seite gibt den Platz **nicht** sofort frei — dafür sorgt allein die 30-Sekunden-Frist.
- **Wie ausgelöst:** `pagehide` (Tab schließen, `reload()`) — bewusst ohne jede Wirkung.
- **Soll-Ergebnis:** Nach einem Neuladen der Tischseite sitzt man weiterhin auf demselben Platz, die Lobby-Nummer bleibt dieselbe.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `data-cl-state` trägt nach dem Neuladen dieselbe `"lobby"`- und `"platz"`-Zahl; keine `verlassen`-Anfrage im Netzprotokoll.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:469-495` (nur noch der Kommentar, der den entfernten Aufruf erklärt)

---

## Die Platzleiste am Tisch

### F-LOBBY-19  Die Platzleiste selbst
- **Was:** Ein Balken am Tisch, der alle Plätze von 1 bis `seats_max` zeigt — belegte mit Namen, freie mit dem Wort "frei" — und den eigenen Platz hervorhebt.
- **Wie ausgelöst:** Automatisch beim Ausliefern der Tischseite; danach bei jeder Abfrage nachgeführt.
- **Soll-Ergebnis:** Eine `<ol>` mit genau `seats_max` Einträgen; der eigene Eintrag ist rot umrandet und fett.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `<li class="cl-seat" data-cl-seat="<nr>">`, eigener Platz zusätzlich `data-cl-seat-mine`; CSS `.cl-seat[data-cl-seat-mine] { border-color: var(--ck-print-red) }`.
- **Umgesetzt in:** `Resources/Private/Templates/Lobby/Strip.html:39-66`, `Classes/Frontend/SeatStrip.php:35-62`

### F-LOBBY-20  Anzeige "Du sitzt allein" / "N am Tisch"
- **Was:** Ein Satz sagt, mit wie vielen Leuten man am Tisch sitzt.
- **Wie ausgelöst:** Seitenaufbau und jede Abfrage mit geändertem Stand.
- **Soll-Ergebnis:** Bei einem Besetzten "Du sitzt allein am Tisch.", sonst "N am Tisch."
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Textinhalt von `p[data-cl-together]`.
- **Umgesetzt in:** `Classes/Frontend/SeatStrip.php:122-124`, `Resources/Public/JavaScript/lobby-live.js:228-231`

### F-LOBBY-21  Zustandsanzeige der Runde
- **Was:** Ein Satz sagt, was gerade gilt: "Es wird gesetzt." / "Nichts geht mehr." / "Die Runde läuft." / "Ergebnis: `<Wert>`".
- **Wie ausgelöst:** Seitenaufbau und jeder Zustandswechsel, der über die Abfrage hereinkommt.
- **Soll-Ergebnis:** Der Text wechselt mit dem Zustand `setzen` → `gesperrt` → `laeuft` → `auswerten` → `setzen`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Textinhalt von `p[data-cl-state-text]`; Antwortfeld `z` an `/casino-lobby/stand`; Spalte `tx_casinolobby_lobby.state`.
- **Umgesetzt in:** `Classes/Frontend/SeatStrip.php:163-176`, `Resources/Public/JavaScript/lobby-live.js:234-243`

### F-LOBBY-22  Die Setzuhr als Anzeige
- **Was:** Eine Restzeitanzeige "Noch N Sekunden." beziehungsweise "Keine Uhr — du bestimmst, wann es losgeht."
- **Wie ausgelöst:** Seitenaufbau; danach zählt ein lokaler Sekundenzähler herunter, jede Serverantwort setzt den Wert neu.
- **Soll-Ergebnis:** Die Zahl sinkt im Sekundentakt; bei `rest` = 0 steht der Satz "Keine Uhr …".
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `p[data-cl-timer]` mit Attribut `data-cl-rest="<ms>"`; Antwortfeld `rest` (Millisekunden) an `/casino-lobby/stand`.
- **Umgesetzt in:** `Classes/Frontend/SeatStrip.php:184-191`, `Resources/Public/JavaScript/lobby-live.js:128-149`, `Classes/Domain/Lobby.php:62-65`

### F-LOBBY-23  Rundennummer und Saat-Anzeige
- **Was:** Die Leiste zeigt "Runde N" und die ersten acht Zeichen der aktuellen Saat.
- **Wie ausgelöst:** Seitenaufbau und jede Abfrage.
- **Soll-Ergebnis:** Bei jedem Rundenwechsel steigt die Nummer um eins und die acht Zeichen wechseln.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `p.cl-strip__round` mit `<span data-cl-seed>`; Antwortfelder `runde` und `saat`; Spalten `round_no`, `seed`.
- **Umgesetzt in:** `Resources/Private/Templates/Lobby/Strip.html:71`, `Resources/Public/JavaScript/lobby-live.js:409-412`

### F-LOBBY-24  Einsatzanzeige je Platz
- **Was:** An jedem Platz steht, wie viel diese Person in dieser Runde gesetzt hat ("12 €") oder "nichts gesetzt".
- **Wie ausgelöst:** Jede Abfrage mit geändertem Stand; gespeist aus den Meldungen der Tische (Handlung `einsatz`).
- **Soll-Ergebnis:** Die Zahl entspricht der Summe der gemeldeten Felder dieses Platzes; an freien Plätzen steht nichts.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch; der Tisch hat `einsatz` gemeldet.
- **Beobachtbar an:** `span.cl-seat__stake[data-cl-seat-stake]`; Antwortfeld `p[].e` (Summe) und `p[].f` (Einzelfelder).
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:181-187`, `Classes/Service/LobbyService.php:279-307`

### F-LOBBY-25  Gewinn- und Verlustanzeige je Platz
- **Was:** Nach der Auswertung steht am Platz "+35 €" grün oder "−5 €" rot.
- **Wie ausgelöst:** Handlung `bilanz` eines Tisches; erscheint bei der nächsten Abfrage bei allen.
- **Soll-Ergebnis:** Grüner Text bei positivem, roter bei negativem Ausgang; bei 0 bleibt das Feld leer.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch; die Runde wurde abgerechnet.
- **Beobachtbar an:** `span.cl-seat__outcome[data-cl-tone="win"]` bzw. `="loss"`; Antwortfeld `p[].o`; Spalte `tx_casinolobby_bet.outcome`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:188-199`, `Classes/Service/LobbyService.php:310-330`

### F-LOBBY-26  Kartenrücken je Platz (Blackjack)
- **Was:** An jedem fremden Platz wird angezeigt, wie viele Karten dort verdeckt liegen — Rücken, keine Werte.
- **Wie ausgelöst:** Der Blackjack-Tisch setzt `data-cl-seat-cards` auf die Anzahl.
- **Soll-Ergebnis:** Am Platz ist ablesbar, dass und wie viele Karten dort liegen; die eigenen Karten sieht man nur in der eigenen Bedienleiste.
- **Vorbedingung:** QR-Modus AN, Platz an einem Blackjack-Tisch.
- **Beobachtbar an:** `span.cl-seat__cards[data-cl-seat-cards="<anzahl>"]` (Anfangswert "0").
- **Umgesetzt in:** `Resources/Private/Templates/Lobby/Strip.html:54-61`, `Resources/Public/Css/lobby.css:216-220`

### F-LOBBY-27  Meldung "Dein Platz wurde frei"
- **Was:** Wer seinen Platz verloren hat (Frist abgelaufen oder Lobby geschlossen), bekommt einen Hinweis mit Knopf "Seite neu laden"; das Abfragen hört auf.
- **Wie ausgelöst:** Antwort `{"r":0,"weg":1}` auf eine Abfrage.
- **Soll-Ergebnis:** Der Hinweisblock wird sichtbar, der Neu-laden-Knopf erscheint, es gehen keine weiteren Abfragen mehr hinaus.
- **Vorbedingung:** QR-Modus AN, vorher Platz am Tisch.
- **Beobachtbar an:** `p[data-cl-notice]` ohne `hidden`, Text "Dein Platz wurde frei. Lade die Seite neu, um dich wieder zu setzen."; Ende der Anfragen an `/casino-lobby/stand`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:398-403`, `Classes/Middleware/LobbyEndpoint.php:120-123`

### F-LOBBY-28  Meldung "Keine Verbindung zum Tisch"
- **Was:** Ab dem dritten Fehlschlag in Folge zeigt die Leiste, dass die Verbindung hängt; kommt die Antwort wieder, verschwindet der Hinweis.
- **Wie ausgelöst:** Drei fehlgeschlagene Abfragen hintereinander (`RUECKFALL_ANZEIGE_AB` = 3).
- **Soll-Ergebnis:** Text "Keine Verbindung zum Tisch. Es wird weiter versucht." ohne Neu-laden-Knopf; nach der ersten erfolgreichen Antwort ist der Block wieder `hidden`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Netz-/Serverstörung.
- **Beobachtbar an:** `p[data-cl-notice]` sichtbar, `button[data-cl-notice-reload]` `hidden`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:30-31` und `:447-454`

### F-LOBBY-29  Sitzung abgelaufen: Seite lädt sich selbst neu
- **Was:** Läuft die Sitzung ab, während man am Tisch sitzt, lädt die Seite sich selbst neu, statt stumm stehenzubleiben.
- **Wie ausgelöst:** HTTP 401 auf eine Abfrage (Endpunkt antwortet `{"ok":false,"grund":"keine_sitzung"}`).
- **Soll-Ergebnis:** Browserseitiges `location.reload()`; danach erscheint die Torseite aus `casino_account`.
- **Vorbedingung:** QR-Modus AN, Sitzung in der Zwischenzeit abgelaufen.
- **Beobachtbar an:** Antwort mit Statuscode 401 und JSON `grund: "keine_sitzung"`; anschließender Seitenwechsel.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:81-84`, `Resources/Public/JavaScript/lobby-live.js:374-378` (Tisch) und `:536-540` (Übersicht)

---

## Der Rundentakt und die Zeitregeln

Vier Zustände im Kreis: **setzen** → **gesperrt** → **läuft** → **auswerten** →
zurück zu **setzen** (`RoundClock`). Jede Zahl unten steht als Konstante in
`Classes/Service/RoundClock.php`.

### F-LOBBY-30  Die Setzuhr: 20 Sekunden
- **Was:** Sitzen mindestens zwei Personen am Tisch, läuft eine Setzuhr von **20 Sekunden** (`RoundClock::SETZZEIT = 20`); danach sperrt der Tisch von selbst.
- **Wie ausgelöst:** Zeitablauf. Die Uhr springt an, sobald der zweite Platz besetzt ist; sie läuft ab, wenn 20 Sekunden vorbei sind.
- **Soll-Ergebnis:** Nach Ablauf wechselt der Zustand auf `gesperrt`, eine neue Saat wird gezogen und die Rundennummer steigt um eins.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, mindestens 2 besetzte Plätze (`RoundClock::UHR_AB = 2`), Zustand `setzen`.
- **Beobachtbar an:** `p[data-cl-timer]` zählt von 20 herunter; Antwortfeld `rest` startet bei 20000 ms; `tx_casinolobby_lobby.state_until` = jetzt + 20, danach `state` = `gesperrt`, `round_no` + 1, neue `seed`.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:50` und `:133-138`

### F-LOBBY-31  Uhr an ab zwei Sitzenden, Uhr aus bei einem
- **Was:** Sitzt jemand allein, gibt es **keine** Uhr — er löst die Runde selbst aus. Setzt sich ein Zweiter dazu, springt die Uhr an; steht der Zweite wieder auf, hält sie an.
- **Wie ausgelöst:** Beitritt bzw. Verlassen/Fristablauf eines Platzes.
- **Soll-Ergebnis:** Bei einem Besetzten `state_until` = 0 und die Anzeige "Keine Uhr — du bestimmst, wann es losgeht."; ab dem zweiten `state_until` = jetzt + 20.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `setzen`.
- **Beobachtbar an:** Antwortfeld `rest` (0 oder 20000); Spalte `state_until`; Text in `p[data-cl-timer]`.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:75`, `:136-145`, `:169-172`; `Classes/Service/LobbyService.php:186-188` (Uhr anhalten bei genau einem Platz)

### F-LOBBY-32  Runde selbst starten (allein am Tisch)
- **Was:** Wer allein sitzt, startet die Runde selbst — genau wie ohne Lobby-System.
- **Wie ausgelöst:** Handlung `starten` (POST `{"art":"starten"}`), die der Tisch auslöst.
- **Soll-Ergebnis:** `state_until` wird auf "jetzt" gesetzt; die nächste Abfrage findet die Frist abgelaufen und sperrt regulär — es gibt also nur EINEN Weg in den Zustand `gesperrt`. Läuft bereits eine Uhr oder sitzen zwei Leute, kommt `{"ok":false,"grund":"uhr_laeuft"}`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `setzen`, keine laufende Uhr (`state_until` = 0), genau ein Besetzter.
- **Beobachtbar an:** JSON `{"ok":true}`; danach `state` = `gesperrt` bei der nächsten Abfrage.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:175-178`, `Classes/Service/LobbyService.php:840-882`

### F-LOBBY-33  Sperrzeit: 2 Sekunden
- **Was:** Zwischen "nichts geht mehr" und dem Loslaufen der Runde liegen **2 Sekunden** (`RoundClock::SPERRZEIT = 2`) — lang genug, dass jeder Browser die neue Saat bei seiner nächsten Abfrage (Takt 1 s) sicher bekommt.
- **Wie ausgelöst:** Zeitablauf nach dem Wechsel auf `gesperrt`.
- **Soll-Ergebnis:** Nach 2 Sekunden Wechsel auf `laeuft`; die Anzeige springt von "Nichts geht mehr." auf "Die Runde läuft."
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `gesperrt`.
- **Beobachtbar an:** Antwortfeld `rest` = 2000 ms im Zustand `z: "gesperrt"`; `state_until` = jetzt + 2.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:55`, `:147-155`

### F-LOBBY-34  Notbremse: 20 Sekunden ohne gemeldetes Ergebnis
- **Was:** Meldet innerhalb von **20 Sekunden** (`RoundClock::LAUFFRIST = 20`) niemand ein Ergebnis, endet die Runde ohne eines und es wird neu gesetzt.
- **Wie ausgelöst:** Zeitablauf im Zustand `laeuft`.
- **Soll-Ergebnis:** Zustand springt zurück auf `setzen`, `result` bleibt unverändert (also auf der alten Rundennummer stehen), die Setzuhr beginnt neu, falls mindestens zwei sitzen.
- **Vorbedingung:** QR-Modus AN, Zustand `laeuft`; beim Blackjack zusätzlich `turn_seat` = 0 (solange ein Platz gefragt ist, gilt statt dessen F-LOBBY-42).
- **Beobachtbar an:** Antwortfeld `z` wechselt von `laeuft` auf `setzen` ohne neues `erg`/`ergR`; `state`-Spalte.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:58`, `:157-159`

### F-LOBBY-35  Ergebnis bleibt 5 Sekunden stehen
- **Was:** Ein festgeschriebenes Ergebnis bleibt **5 Sekunden** (`RoundClock::ERGEBNISZEIT = 5`) sichtbar, bevor wieder gesetzt werden darf.
- **Wie ausgelöst:** Zeitablauf im Zustand `auswerten`.
- **Soll-Ergebnis:** 5 Sekunden lang steht "Ergebnis: `<Wert>`" in der Leiste, dann Wechsel auf `setzen`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `auswerten`.
- **Beobachtbar an:** `p[data-cl-state-text]` = "Ergebnis: …"; `rest` = 5000 ms; `state_until` = jetzt + 5.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:61`, `:161-162`, `Classes/Service/LobbyService.php:920-927`

### F-LOBBY-36  Ein Platz verfällt nach 30 Sekunden ohne Lebenszeichen
- **Was:** Wer **30 Sekunden** (`RoundClock::FRIST` = `Player::SESSION_TIMEOUT` = 30) nichts von sich hören lässt, verliert seinen Platz — aber **nur** in den Zuständen `setzen` und `gesperrt`.
- **Wie ausgelöst:** Zeitablauf; geprüft wird bei jeder Handlung und jeder Abfrage an diesem Spiel (kein Scheduler).
- **Soll-Ergebnis:** Die Platzzeile wird gelöscht, die Einsatz-Anzeigezeilen dieser Person werden entfernt (keine Rückbuchung), `revision` steigt; bei den anderen steht der Platz binnen einer Sekunde auf "frei". Während `laeuft` und `auswerten` läuft **keine** Frist, sonst verlöre jeder seinen Platz, dessen Runde länger als 30 Sekunden dauert.
- **Vorbedingung:** QR-Modus AN, `last_seen` älter als 30 Sekunden, Zustand `setzen` oder `gesperrt`.
- **Beobachtbar an:** Spalte `tx_casinolobby_seat.last_seen`; Verschwinden der Zeile; bei der betroffenen Person Antwort `{"r":0,"weg":1}` und der Hinweis aus F-LOBBY-27.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:73`, `:187-190`, `Classes/Service/LobbyService.php:158-181`

### F-LOBBY-37  Lebenszeichen höchstens alle 5 Sekunden schreiben
- **Was:** Die Abfrage schreibt das Lebenszeichen (`last_seen`) nur, wenn seit dem letzten mindestens 5 Sekunden vergangen sind — sonst wäre die Ersparnis der leeren 204-Antworten wieder aufgehoben.
- **Wie ausgelöst:** Jede Abfrage an `/casino-lobby/stand`.
- **Soll-Ergebnis:** `last_seen` steigt in 5-Sekunden-Schritten, nicht im Sekundentakt; die 30-Sekunden-Frist wird dadurch nicht ungenauer.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Spalte `tx_casinolobby_seat.last_seen` über mehrere Abfragen hinweg.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:773-775`

### F-LOBBY-38  Eine leer gewordene Lobby schließt sich von selbst
- **Was:** Sobald der letzte Platz einer Lobby frei wird — durch ordentliches Verlassen, durch die 30-Sekunden-Frist oder durch einen Umzug an ein anderes Spiel —, wird die Lobby **gelöscht**, nicht versteckt.
- **Wie ausgelöst:** Aufräumen beim nächsten Aufruf, bei dem jemand eine Handlung an diesem Spiel auslöst oder eine Abfrage stellt (es gibt keinen Scheduler-Auftrag).
- **Soll-Ergebnis:** Die Zeile in `tx_casinolobby_lobby` verschwindet; wer danach dieses Spiel öffnet, findet keine Lobby vor und eröffnet automatisch eine neue (mit der nächsthöheren Nummer).
- **Vorbedingung:** QR-Modus AN; Lobby ohne besetzten Platz; irgendjemand ruft dieses Spiel auf.
- **Beobachtbar an:** Zeilenzahl in `tx_casinolobby_lobby`; Antwortfeld `l` an `/casino-lobby/uebersicht` enthält die Lobby nicht mehr.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:182-185`, `:722-728`, `Classes/Service/LobbyService.php:45-50` (`aufraeumen` als Kehrblech)

### F-LOBBY-39  Nachzügler setzen erst ab der nächsten Runde mit
- **Was:** Wer mitten in der Setzzeit dazukommt, wird für die laufende Runde noch nicht als Mitspieler gezählt (`joined_round`).
- **Wie ausgelöst:** Beitritt während einer laufenden Runde.
- **Soll-Ergebnis:** `tx_casinolobby_seat.joined_round` trägt die laufende Rundennummer; beim Blackjack wird dieser Platz in der laufenden Runde nicht gefragt; sichtbar als "Wartet auf die nächste Runde".
- **Vorbedingung:** QR-Modus AN, Beitritt zu einer Lobby mit `round_no` > 0.
- **Beobachtbar an:** Spalte `joined_round`; Textbaustein `strip.wartet` ("Wartet auf die nächste Runde"), als `data-cl-text-wartet` am Wurzelelement der Leiste.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:646`, `:200-212` (`zugNummern`), `Resources/Private/Templates/Lobby/Strip.html:36`

---

## Blackjack: Zugreihenfolge und Zugprotokoll

### F-LOBBY-40  Reihenfolge der Entscheidungen
- **Was:** Beim Blackjack ist `laeuft` keine Animation, sondern die Reihe der Entscheidungen: die Plätze werden nacheinander gefragt, aufsteigend nach Platznummer, beginnend beim kleinsten Platz, der schon vor Rundenbeginn saß.
- **Wie ausgelöst:** Übergang von `gesperrt` nach `laeuft`.
- **Soll-Ergebnis:** `turn_seat` trägt die Nummer des gefragten Platzes; an diesem Platz steht "ist am Zug" (bzw. beim eigenen Platz "Du bist am Zug — N Sekunden"), und der Platz ist messingfarben umrandet.
- **Vorbedingung:** QR-Modus AN, Platz an einem Blackjack-Tisch, Zustand `laeuft`.
- **Beobachtbar an:** Antwortfeld `t` (= `turn_seat`); Attribut `data-cl-turn` am `<li>` des gefragten Platzes; Spalte `tx_casinolobby_lobby.turn_seat`; CSS `.cl-seat[data-cl-turn] { outline: 2px solid … }`.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:147-155`, `:203-211` (`naechsterZug`), `Classes/Service/LobbyService.php:139-146`

### F-LOBBY-41  20 Sekunden je Platz für eine Entscheidung
- **Was:** Jeder Platz hat **20 Sekunden** (`RoundClock::ZUGZEIT = 20`) für seine Entscheidung. Bei jeder Entscheidung, die den Zug nicht beendet (z. B. "Karte"), beginnen die 20 Sekunden neu.
- **Wie ausgelöst:** Zeitablauf; bzw. Handlung `zug`.
- **Soll-Ergebnis:** `state_until` = jetzt + 20 für den gefragten Platz; die Restanzeige am eigenen Platz zählt von 20 herunter.
- **Vorbedingung:** QR-Modus AN, Blackjack, Zustand `laeuft`, `turn_seat` > 0.
- **Beobachtbar an:** Antwortfeld `rest` = 20000 ms bei `z: "laeuft"`; Text "Du bist am Zug — 20 Sekunden" in `span.cl-seat__mark` des eigenen Platzes.
- **Umgesetzt in:** `Classes/Service/RoundClock.php:79`, `Classes/Service/LobbyService.php:228-237`, `:373-381`

### F-LOBBY-42  Abgelaufene Zugfrist: automatisch "stehen"
- **Was:** Wer seine 20 Sekunden verstreichen lässt, steht automatisch (Buchstabe `s`), und die Runde schaltet zum nächsten Platz weiter — sie bricht **nicht** ab.
- **Wie ausgelöst:** Zeitablauf, geprüft beim Aufräumen; ausdrücklich **vor** der allgemeinen Notbremse (F-LOBBY-34), weil beide Fristen in derselben Spalte `state_until` stehen.
- **Soll-Ergebnis:** Das Zugprotokoll bekommt `<platznummer>s` angehängt, `turn_seat` springt auf den nächsten Platz (oder 0, wenn keiner mehr aussteht), `revision` steigt.
- **Vorbedingung:** QR-Modus AN, Blackjack, Zustand `laeuft`, `turn_seat` > 0, `state_until` erreicht.
- **Beobachtbar an:** Antwortfelder `t` und `mv`; Spalten `turn_seat` und `moves`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:103-110`, `:223-237` (`zugWeiterschalten`)

### F-LOBBY-43  Das Zugprotokoll
- **Was:** Alle Entscheidungen der laufenden Runde stehen kompakt als Paare aus Platznummer und Buchstabe in einer Zeichenkette ("1h1s2n2h2s3s") — nur so zieht jeder Browser aus derselben Saat dieselben Karten, denn wer eine Karte nimmt, verschiebt die Karten aller nach ihm.
- **Wie ausgelöst:** Jede Handlung `zug` und jede abgelaufene Zugfrist; zu Rundenbeginn wird das Protokoll geleert.
- **Soll-Ergebnis:** Die Zeichenkette wächst; erlaubte Buchstaben sind `h`, `s`, `d`, `p`, `i`, `n` (`LobbyEndpoint::ZUEGE`); alles andere wird mit `{"ok":false,"grund":"unbrauchbar"}` und HTTP 400 abgewiesen.
- **Vorbedingung:** QR-Modus AN, Blackjack, Zustand `laeuft`, eigener Platz ist der gefragte.
- **Beobachtbar an:** Antwortfeld `mv`; Spalte `tx_casinolobby_lobby.moves` (max. 255 Zeichen).
- **Umgesetzt in:** `ext_tables.sql:37-54`, `Classes/Middleware/LobbyEndpoint.php:53`, `:240-257`, `Classes/Service/LobbyService.php:340-393`

### F-LOBBY-44  Nur der gefragte Platz darf ziehen
- **Was:** Eine Entscheidung von einem Platz, der gerade nicht dran ist, wird abgelehnt.
- **Wie ausgelöst:** Handlung `zug` von einem anderen Platz als `turn_seat`.
- **Soll-Ergebnis:** `{"ok":false,"grund":"nicht_dran"}` mit HTTP 200; das Protokoll bleibt unverändert.
- **Vorbedingung:** QR-Modus AN, Blackjack, Zustand `laeuft`.
- **Beobachtbar an:** JSON-Antwort; unveränderte Spalte `moves`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:361-363`

### F-LOBBY-45  Volles Zugprotokoll: Platz wird gestanden
- **Was:** Erreicht das Protokoll 250 Zeichen, wird der gefragte Platz zwangsweise gestanden, statt das Protokoll überlaufen zu lassen — ein abgeschnittenes Protokoll ließe alle Browser ab dieser Stelle andere Karten ziehen.
- **Wie ausgelöst:** Handlung `zug` bei `strlen(moves) >= 250`.
- **Soll-Ergebnis:** Weiterschalten zum nächsten Platz mit Buchstabe `s`; Antwort `{"ok":false,"grund":"zu_lang"}`.
- **Vorbedingung:** QR-Modus AN, Blackjack, sehr lange Runde.
- **Beobachtbar an:** JSON `grund: "zu_lang"`; Länge von `moves`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:364-372`

---

## Craps: Würfel-Warteliste und Weitergabe

### F-LOBBY-46  Knopf "Würfel übernehmen" / "Warteliste verlassen"
- **Was:** Ein Knopf, der nur am Craps-Tisch erscheint: man trägt sich in die Würfel-Warteliste ein oder wieder aus.
- **Wie ausgelöst:** Klick auf `button[data-cl-shooter]`; sendet intern das Ereignis `casino:lobby-handlung` mit `{art:'shooter', daten:{ein: <Gegenteil des jetzigen Zustands>}}`.
- **Soll-Ergebnis:** Beim Eintragen bekommt der Platz die nächsthöhere Wartelistennummer (`shooter_no` = höchste vorhandene + 1); beim Austragen 0. Die Knopfbeschriftung wechselt zwischen "Würfel übernehmen" und "Warteliste verlassen".
- **Vorbedingung:** QR-Modus AN, Platz an einem **Craps**-Tisch (bei anderen Spielen kommt `{"ok":false,"grund":"unpassend"}`).
- **Beobachtbar an:** Antwort `{"ok":true,"nr":<nummer>}`; Spalte `tx_casinolobby_seat.shooter_no`; Antwortfeld `p[].sn`; Knopftext.
- **Umgesetzt in:** `Resources/Private/Templates/Lobby/Strip.html:86-91`, `Resources/Public/JavaScript/lobby-live.js:110-116`, `Classes/Service/LobbyService.php:413-435`

### F-LOBBY-47  Wer die Würfel hält
- **Was:** Die Würfel hält, wer die kleinste Wartelistennummer hat. Hat sich niemand eingetragen, hält sie der kleinste besetzte Platz — an einem echten Tisch muss jemand werfen.
- **Wie ausgelöst:** Automatisch bei jeder Abfrage berechnet.
- **Soll-Ergebnis:** An genau einem Platz steht "hat die Würfel"; die Reihenfolge richtet sich nach dem Zeitpunkt des Eintragens, nicht nach der Platznummer.
- **Vorbedingung:** QR-Modus AN, Platz an einem Craps-Tisch.
- **Beobachtbar an:** Antwortfeld `w` (Platznummer); Attribut `data-cl-shooter` am `<li>`; Text in `span.cl-seat__mark`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:239-252`, `:803` (Feld `w`), `Resources/Public/JavaScript/lobby-live.js:201-226`

### F-LOBBY-48  Weitergabe der Würfel nach einem Seven-out
- **Was:** Nach einem Seven-out gehen die Würfel an die nächste Person in der Warteliste: der bisherige Shooter wird aus der Liste gestrichen.
- **Wie ausgelöst:** Festgeschriebenes Ergebnis, das die Marke `_so` enthält (gesetzt vom Craps-Tisch, `lobby-craps.js`). Der Server rechnet das Ergebnis nicht nach, er liest nur die Marke.
- **Soll-Ergebnis:** `shooter_no` des bisherigen Shooters wird auf 0 gesetzt; ab der nächsten Abfrage trägt ein anderer Platz die Würfelmarke. Hat sich niemand eingetragen, passiert nichts.
- **Vorbedingung:** QR-Modus AN, Craps, Ergebnis der Runde enthält `_so`, bisheriger Shooter stand mit `shooter_no` > 0 in der Liste.
- **Beobachtbar an:** Spalte `shooter_no`; Antwortfeld `w` wechselt auf eine andere Platznummer.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:929-933`, `:966-977` (`shooterWeitergeben`)

### F-LOBBY-49  Wartelistenanzeige je Platz
- **Was:** Wer eingetragen ist, aber noch nicht dran, ist an seinem Platz als Wartender erkennbar ("wartet auf die Würfel (Platz N)").
- **Wie ausgelöst:** Automatisch bei jeder Abfrage; Textbaustein `strip.shooter.warte`.
- **Soll-Ergebnis:** Die Wartelistennummer ist im Stand jedes Platzes mitgeliefert.
- **Vorbedingung:** QR-Modus AN, Craps, mindestens ein Eintrag in der Warteliste.
- **Beobachtbar an:** Antwortfeld `p[].sn`; Attribut `data-cl-text-shooter-warte` am Wurzelelement der Leiste.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:810-812`, `Resources/Private/Templates/Lobby/Strip.html:32`, `Resources/Private/Language/locallang.xlf:178-180`

---

## Die gemeinsame Saat und das Ergebnis

### F-LOBBY-50  Gemeinsame Saat für alle am Tisch
- **Was:** Der Server zieht bei jedem Sperren eine neue Zufallssaat (8 Zufallsbytes als 16 Hex-Zeichen) und verteilt sie an alle Sitzenden — damit rechnet jeder Browser dieselbe Kugel, dieselben Würfel, dieselben Karten.
- **Wie ausgelöst:** Zustandswechsel `setzen` → `gesperrt` (Ablauf der Setzuhr oder Handlung `starten`).
- **Soll-Ergebnis:** Alle am Tisch bekommen dieselbe Zeichenkette; niemand kann sie wählen.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Antwortfeld `saat`; Spalte `tx_casinolobby_lobby.seed`; die ersten acht Zeichen stehen sichtbar in `span[data-cl-seed]`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:126-128`, `Classes/Service/RoundClock.php:133-134`

### F-LOBBY-51  Die Probeziehung als Vergleichswert
- **Was:** Aus der Saat rechnet jeder Browser dieselbe Zahlenfolge; die ersten drei Ziehungen ("12-4-31") sind der Messpunkt, an dem sich zeigt, ob zwei Browser wirklich dasselbe rechnen. Das ist **kein Spielergebnis**.
- **Wie ausgelöst:** Rundenstart im Browser (`probe(saat)`).
- **Soll-Ergebnis:** Zwei Browser am selben Tisch zeigen für dieselbe Runde dieselbe Zeichenkette. Gezogen wird mit dem Verwerfungsverfahren, nicht per Restdivision.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Runde gestartet.
- **Beobachtbar an:** `p[data-cl-probe]` (im HTML `hidden`, Textinhalt trotzdem auslesbar).
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-seed.js:35-94`, `Resources/Public/JavaScript/lobby-live.js:268-271`

### F-LOBBY-52  Der Melder ist der kleinste besetzte Platz
- **Was:** Das Rundenergebnis meldet der besetzte Platz mit der **kleinsten Nummer** — nicht die eröffnende Person. Steht die eröffnende Person auf, meldet sonst niemand mehr.
- **Wie ausgelöst:** Automatisch bei jeder Abfrage neu berechnet; jeder Browser kann den Melder auch selbst aus der Platzliste ausrechnen.
- **Soll-Ergebnis:** Genau ein Platz trägt das Melder-Kennzeichen; wechselt der kleinste besetzte Platz, wechselt der Melder mit.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Antwortfeld `m` (1 = ich bin Melder, sonst 0); Feld `melder` im Zustandsblock `data-cl-state` (Momentaufnahme beim Laden).
- **Umgesetzt in:** `Classes/Service/LobbyService.php:952-956`, `Classes/Service/LobbyState.php:47-53`

### F-LOBBY-53  Ergebnis einmal festschreiben
- **Was:** Das Ergebnis einer Runde wird genau einmal festgeschrieben; ein abweichendes Ergebnis eines anderen Platzes ändert nichts mehr und landet nur im TYPO3-Protokoll.
- **Wie ausgelöst:** Handlung `ergebnis` (POST `{"art":"ergebnis","wert":"…","runde":N}`), gesendet vom Melder.
- **Soll-Ergebnis:** `result` = "`<Rundennummer>`-`<Wert>`", Zustand wechselt auf `auswerten` für 5 Sekunden, `turn_seat` auf 0, `revision` steigt. Von einem anderen Platz: `{"ok":false,"grund":"nicht_melder"}`. Nicht im Zustand `laeuft`: `{"ok":false,"grund":"unpassend"}`. Ein `wert` außerhalb von 1–64 Zeichen aus `[A-Za-z0-9_-]`: HTTP 400 `unbrauchbar`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `laeuft`, eigener Platz = Melder.
- **Beobachtbar an:** Antwortfelder `erg` und `ergR`; Spalte `tx_casinolobby_lobby.result`; Warnung im TYPO3-Protokoll "Abweichendes Ergebnis für Lobby …".
- **Umgesetzt in:** `Classes/Service/LobbyService.php:885-950`, `Classes/Middleware/LobbyEndpoint.php:346-354`

### F-LOBBY-54  Rundenmarkiertes Ergebnis
- **Was:** Das gespeicherte Ergebnis trägt die Rundennummer vor sich ("17-4_3_so_0"), damit ein Browser, der eine Runde verpasst hat, erkennt, ob das Ergebnis noch zur laufenden Runde gehört. Es wird zu Rundenbeginn **nicht** geleert — sonst könnte ein Craps-Spieler, der mitten in einer Serie dazukommt, den geltenden Point nicht erfahren.
- **Wie ausgelöst:** Automatisch beim Festschreiben und beim Auslesen.
- **Soll-Ergebnis:** Antwort liefert `erg` (nur die Nutzlast) und `ergR` (die Rundennummer) getrennt; in der Leiste steht "Ergebnis: rot", nicht "Ergebnis: 5-rot".
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Spalte `result` (mit Präfix) gegenüber Antwortfeld `erg` (ohne); Text in `p[data-cl-state-text]`.
- **Umgesetzt in:** `Classes/Domain/Lobby.php:67-90`, `Classes/Frontend/SeatStrip.php:163-176`

---

## Der Endpunkt: drei Adressen, neun Handlungsarten

### F-LOBBY-55  Adresse `/casino-lobby/stand` (die Abfrage am Tisch)
- **Was:** Liefert den vollständigen Stand des eigenen Tisches: Stand-Nummer, Zustand, Restzeit, Zahl der Sitzenden, Rundennummer, Melder-Kennzeichen, Saat, Ergebnis, gefragter Platz, Zugprotokoll, Shooter und die Platzliste.
- **Wie ausgelöst:** `GET /casino-lobby/stand?r=<zuletzt gesehene Stand-Nummer>`, im Sekundentakt von `lobby-live.js`.
- **Soll-Ergebnis:** Hat sich nichts geändert (`r` gleich): **HTTP 204** mit null Byte Rumpf. Sonst JSON mit kurzen Schlüsseln (`r`, `z`, `rest`, `n`, `runde`, `m`, `saat`, `erg`, `ergR`, `t`, `mv`, `w`, `p`). Kein eigener Platz mehr: `{"r":0,"weg":1}`. Falsche Methode: HTTP 405.
- **Vorbedingung:** QR-Modus AN, gültige Sitzung (sonst HTTP 401).
- **Beobachtbar an:** Statuscode 204 bzw. 200; Kopfzeile `Cache-Control: no-store, private`.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:44`, `:118-131`, `Classes/Service/LobbyService.php:749-830`

### F-LOBBY-56  Adresse `/casino-lobby/uebersicht` (die Abfrage in der Übersicht)
- **Was:** Liefert die Belegung aller Tische eines Spiels und ob noch ein neuer Tisch aufgemacht werden darf.
- **Wie ausgelöst:** `GET /casino-lobby/uebersicht?spiel=<key>&r=<Stand>`, alle 3 Sekunden.
- **Soll-Ergebnis:** JSON `{"r":"<Stand>","max":<Plätze>,"neu":0|1,"l":[{"u":…,"n":…,"z":…}]}`; unveränderter Stand → HTTP 204. Unbekannter Spielschlüssel → HTTP 400 `unbekanntes_spiel`.
- **Vorbedingung:** QR-Modus AN, gültige Sitzung.
- **Beobachtbar an:** Statuscode 204/200/400; Feld `neu`.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:45`, `:138-165`, `Classes/Domain/LobbyRepository.php:201-220`

### F-LOBBY-57  Adresse `/casino-lobby/handlung` (alles, was etwas ändert)
- **Was:** Die einzige Adresse, über die etwas verändert wird. Sie nimmt ausschließlich `POST` mit `Content-Type: application/json` an.
- **Wie ausgelöst:** `POST /casino-lobby/handlung` mit `{"art": …}`.
- **Soll-Ergebnis:** Falscher Inhaltstyp → HTTP 415 `inhaltstyp`; unlesbarer Rumpf → HTTP 400 `unlesbar`; unbekannte `art` → HTTP 400 `unbrauchbar`; `GET` → HTTP 405 `methode`. Eine **Ablehnung ist kein Fehler**: "voll", "zu spät", "Uhr läuft", "bereits andernorts" kommen mit HTTP 200 und `ok:false`.
- **Vorbedingung:** QR-Modus AN, gültige Sitzung.
- **Beobachtbar an:** Statuscodes 200/400/405/415; JSON-Feld `grund`.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:46`, `:86-110`, `:181-206`

### F-LOBBY-58  Die neun Handlungsarten
- **Was:** `LobbyEndpoint::ARTEN` zählt alles auf, was gesendet werden darf: `eroeffnen`, `beitreten`, `verlassen`, `starten`, `ergebnis`, `einsatz`, `bilanz`, `zug`, `shooter`. Was hier nicht steht, wird abgewiesen.
  - `eroeffnen` — neuen Tisch aufmachen (F-LOBBY-09)
  - `beitreten` — an einen bestehenden Tisch setzen (F-LOBBY-07)
  - `verlassen` — eigenen Platz freigeben (F-LOBBY-17)
  - `starten` — Runde selbst auslösen, allein am Tisch (F-LOBBY-32)
  - `ergebnis` — Rundenergebnis festschreiben, nur vom Melder (F-LOBBY-53)
  - `einsatz` — melden, was auf dem eigenen Tuch liegt (F-LOBBY-59)
  - `bilanz` — melden, was aus den eigenen Feldern geworden ist (F-LOBBY-60)
  - `zug` — Blackjack-Entscheidung (F-LOBBY-43)
  - `shooter` — Würfel-Warteliste ein/aus (F-LOBBY-46)
- **Wie ausgelöst:** Feld `art` im JSON-Rumpf von `/casino-lobby/handlung`.
- **Soll-Ergebnis:** Genau eine der neun Verzweigungen; alles andere HTTP 400 `unbrauchbar`.
- **Vorbedingung:** QR-Modus AN, gültige Sitzung.
- **Beobachtbar an:** JSON-Antwort je Art; Konstante `ARTEN`.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:48-50`, `:181-206`

### F-LOBBY-59  Einsatz melden (Anzeige, keine Buchung)
- **Was:** Der Tisch meldet, was gerade auf dem eigenen Tuch liegt, damit die anderen es in Echtzeit sehen. Die Lobby **bucht dabei kein Geld** — das ist längst über `casino_account` gelaufen.
- **Wie ausgelöst:** `POST {"art":"einsatz","runde":N,"felder":[{"f":"rot","b":5}, …]}`.
- **Soll-Ergebnis:** Die Einsatzzeilen dieses Platzes für diese Runde werden ersetzt, `revision` steigt, das Lebenszeichen wird aufgefrischt. Nur während `setzen` und nur für die laufende Runde — sonst `{"ok":false,"grund":"zu_spaet"}`. Grenzen: höchstens 24 Felder, Feldname 1–32 Zeichen aus `[A-Za-z0-9_-]`, Betrag ganzzahlig 1–1 000 000; sonst HTTP 400 `unbrauchbar`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustand `setzen`, `runde` = laufende Rundennummer.
- **Beobachtbar an:** Zeilen in `tx_casinolobby_bet`; Antwortfelder `p[].e` und `p[].f`; Anzeige am Platz (F-LOBBY-24).
- **Umgesetzt in:** `Classes/Service/LobbyService.php:279-307`, `Classes/Middleware/LobbyEndpoint.php:211-221`, `:271-296`

### F-LOBBY-60  Bilanz melden (Anzeige, keine Buchung)
- **Was:** Nach der eigenen Abrechnung meldet der Tisch, was aus jedem eigenen Feld geworden ist — wieder nur zur Anzeige für die anderen.
- **Wie ausgelöst:** `POST {"art":"bilanz","runde":N,"aus":{"rot":-5,"17":175}}`.
- **Soll-Ergebnis:** Die Spalte `outcome` der eigenen Einsatzzeilen wird gesetzt, `revision` steigt. Grenzen: höchstens 24 Felder, Beträge ganzzahlig mit Betrag ≤ 1 000 000 (dürfen negativ sein); sonst HTTP 400 `unbrauchbar`. Falsche Rundennummer: `{"ok":false,"grund":"zu_spaet"}`.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, `runde` = laufende Rundennummer.
- **Beobachtbar an:** Spalte `tx_casinolobby_bet.outcome`; Antwortfeld `p[].o`; grüne/rote Anzeige am Platz (F-LOBBY-25).
- **Umgesetzt in:** `Classes/Service/LobbyService.php:310-330`, `Classes/Middleware/LobbyEndpoint.php:224-238`

### F-LOBBY-61  Einsatzzeilen werden nach der Auswertung nicht aufbewahrt
- **Was:** Beim Beginn einer neuen Runde werden die Einsatzzeilen aller älteren Runden dieser Lobby gelöscht.
- **Wie ausgelöst:** Rundenwechsel (Zustandswechsel mit erhöhter Rundennummer).
- **Soll-Ergebnis:** `tx_casinolobby_bet` enthält nur noch Zeilen der laufenden Runde.
- **Vorbedingung:** QR-Modus AN, laufender Tisch.
- **Beobachtbar an:** Zeilenzahl und Spalte `round_no` in `tx_casinolobby_bet`.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:130-134`, `Classes/Domain/LobbyRepository.php:470-482`

### F-LOBBY-62  Ohne QR-Modus gibt es keine dieser Adressen
- **Was:** Bei ausgeschaltetem QR-Modus prüfen beide Schichten den Schalter als Allererstes und reichen die Anfrage unverändert durch — es gibt keine Lobby-Adresse, kein Lobby-Markup, keine Zeile Unterschied zur gewöhnlichen Website.
- **Wie ausgelöst:** Jeder Frontend-Aufruf bei ausgeschaltetem Schalter.
- **Soll-Ergebnis:** `/casino-lobby/stand`, `/casino-lobby/uebersicht`, `/casino-lobby/handlung` enden in der gewöhnlichen 404-Seite; die Tischseiten tragen weder `data-cl-strip` noch `data-cl-state` noch `lobby.css`.
- **Vorbedingung:** QR-Modus AUS.
- **Beobachtbar an:** Statuscode 404 auf den drei Adressen; ausgeliefertes HTML ohne jede Zeichenfolge `cl-` / `casino-lobby`.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:70-72`, `Classes/Middleware/LobbyTable.php:62-64`

### F-LOBBY-63  Kein Bezeichner einer Person aus der Anfrage
- **Was:** Wer etwas tut, steht ausschließlich in der Sitzung. Keine Anfrage darf eine Spieler-Nummer, eine Kennung oder einen Namen mitbringen; der einzige Bezeichner in einer Anfrage ist die Lobby-Nummer beim Beitreten — ein öffentlicher Tisch, keine Person.
- **Wie ausgelöst:** Jede Anfrage an den Endpunkt.
- **Soll-Ergebnis:** Eine mitgeschickte fremde Spieler-Nummer bleibt wirkungslos; auch der Zustandsblock enthält weder Name noch Kennung noch Rolle.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Inhalt von `<script data-cl-state>` (nur `endpunkte`, `spiel`, `lobby`, `platz`, `max`, `melder`, `takt`, `taktUebersicht`, `frist`).
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:78-84`, `Classes/Service/LobbyState.php:34-69`

---

## Die Brücke zu den drei Tischen: vier DOM-Ereignisse

`lobby-live.js` ist das **alleinige** Tor zum Server. Keine der drei
Tisch-Extensions ruft selbst `fetch()` auf, keine importiert etwas aus
`casino_lobby` — sie reden ausschließlich über diese vier Ereignisse auf
`document`.

### F-LOBBY-64  Ereignis `casino:lobby-stand` (hinaus)
- **Was:** Bei jeder Abfrage, die etwas Geändertes zurückbringt, gibt die Lobby den vollständigen Stand an den Tisch weiter: Zustand, Runde, Plätze, Restzeit, Saat, Einsätze, Shooter, gefragter Platz.
- **Wie ausgelöst:** **Sender:** `lobby-live.js`, nach jeder Antwort mit Statuscode 200. **Hörer:** die Adapter der drei Tische (`lobby-roulette.js`, `lobby-craps.js`, `lobby-blackjack.js`).
- **Soll-Ergebnis:** Der Tisch zeichnet daraus die Einsätze der anderen, die Würfelmarke, die Zugmarke. Es gibt absichtlich kein zweites Abfragen und keinen zweiten Takt.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** `document.addEventListener('casino:lobby-stand', …)`; `detail` ist die vollständige JSON-Antwort.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:418`

### F-LOBBY-65  Ereignis `casino:lobby-runde` (hinaus)
- **Was:** Beim Start einer Runde bekommt der Tisch alles, was er zum Rechnen braucht: `{saat, zahl, runde, melder, plaetze, mein}`.
- **Wie ausgelöst:** **Sender:** `lobby-live.js`, sobald der Zustand auf `laeuft` wechselt und eine Saat vorliegt. **Hörer:** die drei Tisch-Adapter.
- **Soll-Ergebnis:** Der Tisch startet seine Simulation mit genau dieser Saat; `melder` sagt ihm, ob **er** das Ergebnis melden muss; `plaetze` gibt die Platznummern für die Austeilfolge (Blackjack), `mein` die eigene Platznummer.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Zustandswechsel nach `laeuft`.
- **Beobachtbar an:** `p[data-cl-probe]` bekommt im selben Moment die Probeziehung; `detail.melder` (true/false).
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:268-289`

### F-LOBBY-66  Ereignis `casino:lobby-fertig` (herein)
- **Was:** Der Tisch meldet sein lokal gerechnetes Rundenergebnis zurück: `{ergebnis}`.
- **Wie ausgelöst:** **Sender:** die Tisch-Extension. **Hörer:** `lobby-live.js`, das den Wert als Handlung `ergebnis` an den Server weiterreicht.
- **Soll-Ergebnis:** Die Sperre "während der Runde wird nicht abgefragt" fällt, der Zuhörer wird abgemeldet, das Ergebnis geht einmal an den Server, danach läuft der Abfragetakt weiter. Ein zweites Ereignis derselben Runde bleibt wirkungslos.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, laufende Runde.
- **Beobachtbar an:** Anfrage `POST /casino-lobby/handlung` mit `art: "ergebnis"`; Spalte `result`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:291-316`

### F-LOBBY-67  Ereignis `casino:lobby-handlung` (herein)
- **Was:** Der Tisch schickt eine beliebige Handlung — Einsatz, Shooter-Wechsel, Blackjack-Zug — als `{art, daten}`; die Lobby reicht sie unverändert an den Server weiter.
- **Wie ausgelöst:** **Sender:** die Tisch-Extension (und der Shooter-Knopf der Platzleiste selbst). **Hörer:** `lobby-live.js`.
- **Soll-Ergebnis:** Ein `POST /casino-lobby/handlung` mit `{art, lobby: <eigene Lobby>, …daten}`. So steht in keiner Tisch-Extension eine Endpunktadresse, und niemand kann dort versehentlich einen zweiten Geldweg aufmachen.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch; `art` darf nicht leer sein.
- **Beobachtbar an:** Netzanfrage an `/casino-lobby/handlung`; JSON-Antwort.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:333-339` (Hörer), `:341-353` (`senden`)

### F-LOBBY-68  Notbremse im Browser, wenn der Tisch nicht antwortet
- **Was:** Meldet der Tisch nach dem Rundenstart gar kein Ergebnis, meldet die Lobby von sich aus die Probeziehung — nach **3 Sekunden** (`LAUF_RUECKFALL_MS`), beim Blackjack erst nach `(Plätze + 1) × 20 Sekunden`, weil dort absichtlich auf Menschen gewartet wird.
- **Wie ausgelöst:** Zeitablauf nach dem Rundenstart.
- **Soll-Ergebnis:** Die Runde bleibt nicht stehen; das Abfragen läuft danach weiter.
- **Vorbedingung:** QR-Modus AN, Platz am Tisch, Runde gestartet, kein `casino:lobby-fertig`.
- **Beobachtbar an:** Verzögerte Anfrage `art: "ergebnis"` mit dem Probewert.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:33-34`, `:317-325`

---

## Abfragen im Takt

### F-LOBBY-69  Takt 1 Sekunde am Tisch, 3 Sekunden in der Übersicht
- **Was:** Abgefragt wird, nicht gestreamt: ein einziger, verketteter `setTimeout` je Seite — die nächste Abfrage wird erst geplant, nachdem die vorige beantwortet ist, damit sich nie Anfragen stauen.
- **Wie ausgelöst:** Zeitablauf; die Werte kommen aus dem Zustandsblock (`takt` 1000 ms, `taktUebersicht` 3000 ms).
- **Soll-Ergebnis:** Höchstens eine offene Anfrage je Seite; keine `setInterval`-Abfrage, keine offene Dauerverbindung.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Felder `takt` / `taktUebersicht` im Zustandsblock; Abstände der Anfragen im Netzprotokoll.
- **Umgesetzt in:** `Classes/Service/LobbyState.php:27-30`, `Resources/Public/JavaScript/lobby-live.js:355-360`

### F-LOBBY-70  Leere Antwort bei unveränderter Lage (HTTP 204)
- **Was:** Der Browser schickt bei jeder Abfrage die zuletzt gesehene Stand-Nummer mit; hat sich nichts geändert, antwortet der Server mit null Byte Rumpf.
- **Wie ausgelöst:** `?r=<Stand>` in der Abfrage, Vergleich mit `tx_casinolobby_lobby.revision` (Tisch) bzw. mit "Anzahl:Summe der Stand-Nummern" (Übersicht).
- **Soll-Ergebnis:** HTTP 204 ohne Rumpf; die Anzeige bleibt unverändert stehen.
- **Vorbedingung:** QR-Modus AN, keine Änderung seit der letzten Abfrage.
- **Beobachtbar an:** Statuscode 204; Rumpflänge 0.
- **Umgesetzt in:** `Classes/Middleware/LobbyEndpoint.php:125-128`, `:148-151`, `Classes/Domain/LobbyRepository.php:201-220`

### F-LOBBY-71  Ruhezustand im Hintergrund
- **Was:** Ist die Registerkarte im Hintergrund, wird **gar nicht** gefragt. Wird sie wieder sichtbar, wird sofort einmal gefragt.
- **Wie ausgelöst:** `document.visibilityState === 'hidden'` bzw. das Ereignis `visibilitychange`.
- **Soll-Ergebnis:** Keine Anfragen, solange die Karte verborgen ist; unmittelbar eine beim Zurückkommen.
- **Vorbedingung:** QR-Modus AN, Tisch- oder Übersichtsseite offen.
- **Beobachtbar an:** Lücke im Netzprotokoll während der Verborgenheit. (Achtung: die 30-Sekunden-Frist läuft weiter — der Platz kann dabei verfallen.)
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:362-364`, `:456-460`, `:525-527`, `:588-592`

### F-LOBBY-72  Keine Abfrage während einer laufenden Runde
- **Was:** Während der Zustand `laeuft` ist, wird nicht abgefragt — alle rechnen ohnehin dasselbe aus derselben Saat. **Ausnahme Blackjack:** dort ist `laeuft` die Reihe der Entscheidungen, deshalb wird dort weiter abgefragt.
- **Wie ausgelöst:** Zustandswechsel nach `laeuft`.
- **Soll-Ergebnis:** Bei Roulette und Craps steht der Takt bis zum gemeldeten Ergebnis still; beim Blackjack läuft er weiter (sonst erführe niemand, dass er dran ist).
- **Vorbedingung:** QR-Modus AN, Platz am Tisch.
- **Beobachtbar an:** Pause im Netzprotokoll bei Roulette/Craps; durchgehende Abfragen bei Blackjack.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:423-439`, `:362-364`

### F-LOBBY-73  Wachsender Abstand bei Störung
- **Was:** Bei Fehlschlägen wächst der Abstand: 1 s, 2 s, 5 s, 10 s, 30 s. Kommt die Antwort wieder, kehrt der Takt auf 1 s zurück und der Hinweis verschwindet.
- **Wie ausgelöst:** Fehlgeschlagene Anfrage (Netzfehler, Statuscode ≠ 204 und nicht ok, unlesbares JSON).
- **Soll-Ergebnis:** Die Abstände im Netzprotokoll folgen genau dieser Folge; ab dem dritten Fehlschlag zusätzlich der Hinweis aus F-LOBBY-28.
- **Vorbedingung:** QR-Modus AN, Seite offen.
- **Beobachtbar an:** Zeitabstände der Anfragen; `RUECKFALL_MS = [1000, 2000, 5000, 10000, 30000]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-live.js:27-28`, `:447-454`, `:582-586`

### F-LOBBY-74  Aufräumen ohne Scheduler
- **Was:** Es gibt keinen Hintergrundauftrag. Aufgeräumt wird immer dann, wenn jemand eine Handlung an diesem Spiel auslöst oder eine Abfrage stellt — dann werden alle Lobbys dieses Spiels nachgezogen: Zustandswechsel, abgelaufene Plätze, leer gewordene Lobbys.
- **Wie ausgelöst:** Seitenaufruf einer Tischadresse, Abfrage an `/casino-lobby/stand` (nur die eigene Lobby) oder an `/casino-lobby/uebersicht` (alle Lobbys des Spiels).
- **Soll-Ergebnis:** Eine Lobby, die niemand mehr aufruft, bleibt als Zeile stehen, bis das nächste Mal jemand dieses Spiel öffnet.
- **Vorbedingung:** QR-Modus AN.
- **Beobachtbar an:** Zeilen in `tx_casinolobby_lobby`/`_seat` vor und nach einem Aufruf.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:45-50`, `:66-198`, `Classes/Middleware/LobbyTable.php:80`, `Classes/Middleware/LobbyEndpoint.php:145`

---

## Rückseite (Backend)

### F-LOBBY-75  Kein Backend-Modul, keine pflegbaren Felder
- **Was:** Diese Extension bringt **kein** Backend-Modul und **kein** Formular. Die drei Tabellen haben zwar eine TCA, aber jede einzelne Spalte ist `passthrough`: sie existiert, wird gespeichert, erscheint in keinem Formular und ist über kein Formular änderbar. Geschrieben wird ausschließlich vom Lobby-Dienst.
- **Wie ausgelöst:** Aufruf des TYPO3-Backends durch einen Redakteur oder Administrator.
- **Soll-Ergebnis:** Die drei Tabellen tauchen in keiner Listenansicht auf (`hideTable` = true) und sind auch sonst nur für Administratoren sichtbar (`adminOnly` = true); `types.0.showitem` ist leer, es gibt also nichts zu bearbeiten. Kein Redakteur kann eine laufende Runde durch einen Klick zerstören.
- **Vorbedingung:** keine (gilt in beiden Schalterstellungen des QR-Modus).
- **Beobachtbar an:** Fehlen der drei Tabellen in der Listenansicht; `hideTable`/`adminOnly` in den TCA-Dateien.
- **Umgesetzt in:** `Configuration/TCA/tx_casinolobby_lobby.php:28-87`, `Configuration/TCA/tx_casinolobby_seat.php:14-52`, `Configuration/TCA/tx_casinolobby_bet.php:16-54`

### F-LOBBY-76  Das einzige, was ein Admin bedient: das Inhaltselement des Tisches
- **Was:** Ob eine Seite eine Lobby bekommt, entscheidet ein Administrator ausschließlich dadurch, dass er dort ein Inhaltselement vom Typ `roulette`, `blackjack` oder `craps` einsetzt (verwaltet von den jeweiligen Tisch-Extensions, nicht von dieser).
- **Wie ausgelöst:** Anlegen/Verschieben/Verstecken eines dieser Inhaltselemente im Seitenbaum.
- **Soll-Ergebnis:** Auf der Seite mit dem Element greift die Weiche (F-LOBBY-01); ein verstecktes oder gelöschtes Element nimmt die Lobby von dieser Seite wieder weg. Übersetzungen des Elements (`sys_language_uid` außer 0/-1) zählen nicht.
- **Vorbedingung:** QR-Modus AN für die Wirkung; das Anlegen selbst geht in beiden Schalterstellungen.
- **Beobachtbar an:** Spalte `tt_content.CType` der Seite; Erscheinen/Verschwinden von `data-cl-strip` im Frontend.
- **Umgesetzt in:** `Classes/Middleware/LobbyTable.php:104-133`

### F-LOBBY-77  Lobby-Datensätze liegen auf Seiten-Nummer 0
- **Was:** Lobbys, Plätze und Einsätze werden auf `pid` 0 abgelegt, nicht in einem Ordner — Maschinenzustand mit einer Lebensdauer von Minuten gehört in keinen Seitenbaum. Damit hängt das Lobby-System an keiner Ordnernummer, die im Frontend fehlen könnte.
- **Wie ausgelöst:** Jedes Eröffnen einer Lobby.
- **Soll-Ergebnis:** `tx_casinolobby_lobby.pid` = 0; kein Sysordner nötig, keine Backend-Einrichtung nötig.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Spalte `pid`; `rootLevel => -1` in der TCA.
- **Umgesetzt in:** `Classes/Domain/LobbyRepository.php:228-256`, `Configuration/TCA/tx_casinolobby_lobby.php:36`

### F-LOBBY-78  Keine gelöschten und keine versteckten Lobbys
- **Was:** Die drei Tabellen führen weder eine Spalte `deleted` noch `hidden`. Eine leer gewordene Lobby wird wirklich gelöscht, nicht als gelöscht markiert; eine "versteckte" Lobby hätte keine Bedeutung.
- **Wie ausgelöst:** Schließen einer leeren Lobby (F-LOBBY-38).
- **Soll-Ergebnis:** Die Zeile ist aus der Datenbank verschwunden; kein Papierkorb-Eintrag, keine Wiederherstellung.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Spaltenliste der drei Tabellen; Zeilenzahl.
- **Umgesetzt in:** `ext_tables.sql:8-12`, `Configuration/TCA/tx_casinolobby_lobby.php:20`

### F-LOBBY-79  Protokolleintrag bei abweichendem Ergebnis
- **Was:** Meldet ein Platz ein Ergebnis, das von dem bereits festgeschriebenen abweicht, ändert das nichts — aber es wird als Warnung ins TYPO3-Protokoll geschrieben, mit Lobby-Nummer, Runde, festgeschriebenem und gemeldetem Wert.
- **Wie ausgelöst:** Zweite, abweichende Handlung `ergebnis` für dieselbe Runde.
- **Soll-Ergebnis:** Eintrag "Abweichendes Ergebnis für Lobby {lobby}, Runde {runde}: festgeschrieben {fest}, gemeldet {gemeldet}." in der Protokolldatei; die Antwort bleibt `{"ok":true}`.
- **Vorbedingung:** QR-Modus AN, Ergebnis der laufenden Runde bereits festgeschrieben.
- **Beobachtbar an:** TYPO3-Protokoll (`var/log/`), Stufe *warning*.
- **Umgesetzt in:** `Classes/Service/LobbyService.php:911-919`

### F-LOBBY-80  Installationsschritte
- **Was:** Die Extension wird wie üblich aktiviert; ohne `cache:flush` läuft **keine** der beiden Middleware-Schichten, und zwar ohne Fehlermeldung, weil TYPO3 den Middleware-Stapel zwischenspeichert.
- **Wie ausgelöst:** `extension:activate casino_lobby`, `dumpautoload`, `extension:setup`, `cache:flush`.
- **Soll-Ergebnis:** Die drei Tabellen sind angelegt; die Adressen antworten (bei eingeschaltetem QR-Modus).
- **Vorbedingung:** `casino_startpage` ≥ 0.5.0 und `casino_account` ≥ 0.5.0 vorhanden; TYPO3 13.4.
- **Beobachtbar an:** Vorhandensein der drei Tabellen; Statuscode ≠ 404 auf `/casino-lobby/stand`.
- **Umgesetzt in:** `README.md:33-45`, `ext_emconf.php:13-23`

---

## Beobachtungen, nicht bewertet

- Die README nennt für `/casino-lobby/handlung` fünf Handlungsarten (`eroeffnen`, `beitreten`, `verlassen`, `starten`, `ergebnis`); `LobbyEndpoint::ARTEN` führt neun (zusätzlich `einsatz`, `bilanz`, `zug`, `shooter`).
- Der Kommentar in `LobbyEndpoint::uebersicht()` beschreibt die Stand-Kennung der Übersicht als "eine Zeichenkette aus drei Teilen"; `LobbyRepository::overviewRevision()` baut sie aus zwei Teilen ("Anzahl:Summe").
- Die README sagt, `tx_casinolobby_bet` werde "weiterhin nicht gelesen oder geschrieben"; `LobbyService::einsatz()`, `::bilanz()` und `LobbyRepository::replaceBets()`/`::settleBets()`/`::betsOfRound()` lesen und schreiben die Tabelle.
- Mehrere Textbausteine aus `locallang.xlf` werden von keiner der gelesenen Dateien verwendet: `uebersicht.alles.voll`, `strip.label`, `strip.saat`, `ansage.dazu`, `ansage.weg`.
- Die README nennt die Live-Probe `probe-lobby-strip.mjs` als Teil dieser Extension; die drei anderen Proben (`probe-lobby-roulette.mjs`, `-craps.mjs`, `-blackjack.mjs`) liegen in den Tisch-Extensions.
- Die README legt offen, dass Barrierefreiheit (D.12) für Platzleiste und Übersicht in D4c/D4d nicht umgesetzt ist: keine Live-Region für den laufenden Betrieb, keine `prefers-reduced-motion`-Behandlung der Leiste. Die Übersichtsseite trägt allerdings bereits ein leeres `p[role="status"][data-cl-announce]`, das von keiner gelesenen Datei gefüllt wird.
- `RoundClock::ZUSTAENDE` listet vier Zustände; das browserseitige Zustandswerk der Tische (`table-round.js`) hat laut Kommentar fünf (zusätzlich `auszahlen`).

---

<!-- ===================== video_slot ===================== -->

# Funktionsinventur — `video_slot` (Video Slot)

Der zweite Spielautomat des Casino Kunterbunt: fünf Walzen, drei Reihen, fünf feste
Gewinnlinien und ein Scatter, gespielt vollständig im Browser — mit Münzeinwurf,
Gerätekredit, Risiko-Leiter, Auto-Modus und eigenem Klang.
Diese Datei listet auf, welche Funktionen das Gerät hat und was sie tun sollen — eine
Inventur, kein Urteil.

Stand des Quelltexts: Version 0.5.0 (alpha), TYPO3 13.4, klassische Installation.
Alle Zeilenangaben beziehen sich auf `typo3conf/ext/video_slot/`.

---

## Rückseite: Inhaltselement und Backend

### F-VS-01  Inhaltselement „Video Slot" anlegen
- **Was:** Ein Redakteur stellt mit diesem Inhaltselement den Automaten auf einer Seite spielbereit auf.
- **Wie ausgelöst:** Im Backend ein neues Inhaltselement vom Typ „Video Slot" (`CType = video_slot`) anlegen, im Assistenten in der Gruppe „Spezielle Elemente"; Speichern.
- **Soll-Ergebnis:** Auf der Seite erscheint im Frontend das große, bedienbare Gehäuse. Das Element hat **keine** Einstellungsfelder und keine eigene Datenbankspalte.
- **Vorbedingung:** Extension aktiviert; Seite ohne eigenes Backend-Layout (sonst greift laut README `Pages/Default.html` nicht).
- **Beobachtbar an:** Im Frontend ein `<div class="vs-machine ck-room-fill">` mit genau einem `<div class="vs-cabinet">` darin; in der Datenbank `tt_content.CType = 'video_slot'`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php` (ganze Datei), `ext_localconf.php:1-70`, `Resources/Private/ContentElements/Machine.html:28-31`

### F-VS-02  Beschriftung und Symbol des Elements im Backend
- **Was:** Das Element trägt im Backend den Namen „Video Slot", eine erklärende Beschreibung und ein eigenes Symbol.
- **Wie ausgelöst:** Öffnen des Inhaltselement-Assistenten oder der Seitenansicht.
- **Soll-Ergebnis:** Sichtbarer Name „Video Slot"; Beschreibungstext „Stellt den Automaten ‚Video Slot' auf dieser Seite spielbereit auf. Das Element hat keine Einstellungen – alles, was der Automat braucht, bringt er selbst mit. Damit das Gerät auch im Spielsaal steht, gehört auf die Startseite zusätzlich ein Inhaltselement ‚Casino-Automat', das auf diese Seite verweist."; Icon `content-video-slot`.
- **Vorbedingung:** keine
- **Beobachtbar an:** sichtbarer Text im Assistenten; Icon-Bezeichner `content-video-slot`.
- **Umgesetzt in:** `Resources/Private/Language/locallang_be.xlf:6-11`, `Configuration/Icons.php`, `Classes/VideoSlot.php:226`

### F-VS-03  Anmeldung des Automaten im Spielsaal (Registry)
- **Was:** Der Automat meldet sich beim Site Package an, damit ihn das Inhaltselement „Casino-Automat" auf der Startseite als Miniatur aufstellen kann.
- **Wie ausgelöst:** Automatisch beim Laden von `ext_localconf.php` (Extension aktiviert).
- **Soll-Ergebnis:** Im Auswahlfeld des Elements „Casino-Automat" steht „Video Slot" zur Wahl; auf der Startseite erscheint die Miniatur des Gehäuses. Die Partial-Pfade dieser Extension werden automatisch an die `partialRootPaths` des Saal-Elements angehängt.
- **Vorbedingung:** `casino_startpage` >= 0.5.0 installiert.
- **Beobachtbar an:** Eintrag „Video Slot" im Auswahlfeld des Elements „Casino-Automat"; im Saal ein `.ck-cabinet` mit einem `<svg class="ck-cabinet__drawing">` im Seitenverhältnis 100:160.
- **Umgesetzt in:** `ext_localconf.php`, `Classes/VideoSlot.php:209-223`, `Resources/Private/Partials/Automat/VideoSlot/Cabinet.html`

---

## Gewinnlinien, Gewinntabelle und Auswertung

Die maßgeblichen Tabellen stehen zweimal im Quelltext, absichtlich wortgleich:
`Classes/Rules.php` (für die serverseitige Zeichnung des Gewinnplans) und
`Resources/Public/JavaScript/paytable.js` (für die Auswertung im Browser).

### F-VS-04  Fünf feste Gewinnlinien, alle immer aktiv
- **Was:** Das Gerät wertet fünf fest vorgegebene Linien durch das Sichtfeld aus; sie sind nicht wählbar und immer alle aktiv.
- **Wie ausgelöst:** Nach jedem Rundenende automatisch (`evaluate()`).
- **Soll-Ergebnis:** Die fünf Linien (Zeilennummer je Walze 1…5, 0 = oben, 2 = unten) sind:
  | Linie | W1 | W2 | W3 | W4 | W5 | Verlauf |
  |---|---|---|---|---|---|---|
  | 1 | 1 | 1 | 1 | 1 | 1 | Mitte |
  | 2 | 0 | 0 | 0 | 0 | 0 | oben |
  | 3 | 2 | 2 | 2 | 2 | 2 | unten |
  | 4 | 0 | 0 | 1 | 2 | 2 | fallend |
  | 5 | 2 | 2 | 1 | 0 | 0 | steigend |
- **Vorbedingung:** keine
- **Beobachtbar an:** fünf Elemente `[data-vs-line="1"]` … `[data-vs-line="5"]` im Sichtfeld; eine getroffene Linie bekommt zusätzlich die Klasse `vs-payline--win`.
- **Umgesetzt in:** `Classes/Rules.php:59-65`, `Resources/Public/JavaScript/paytable.js:44-50`, `Resources/Public/JavaScript/machine.js:440-445`

### F-VS-05  Linienauswertung „Gleiche von links"
- **Was:** Eine Linie zahlt, wenn ab Walze 1 mehrere gleiche Symbole nebeneinander stehen; das Symbol auf Walze 1 legt fest, wonach gesucht wird, und die Kette bricht beim ersten abweichenden Symbol ab.
- **Wie ausgelöst:** Automatisch nach dem Stillstand aller fünf Walzen.
- **Soll-Ergebnis:** Kettenlänge ≥ 3 zahlt (bei der Kirsche schon ab 2). Steht auf Walze 1 der Scatter, zahlt die Linie gar nichts — der Scatter ist ausdrücklich **kein** Liniensymbol und wird nicht doppelt bezahlt.
- **Vorbedingung:** abgeschlossene Runde
- **Beobachtbar an:** Ereignis `vs:result` mit `detail.lines` (je Treffer `{index, symbol, length, factor, cells}`); die getroffenen Felder bekommen die Klasse `vs-cell--win`.
- **Umgesetzt in:** `Resources/Public/JavaScript/paytable.js:91-117`, `machine.js:440-450`

### F-VS-06  Kirsche zahlt schon ab zwei gleichen
- **Was:** Das Symbol Kirsche ist das einzige, für das zwei gleiche nebeneinander ab Walze 1 bereits einen Gewinn ergeben.
- **Wie ausgelöst:** Automatisch bei der Linienauswertung.
- **Soll-Ergebnis:** 2× Kirsche auf einer Linie ergibt Faktor 1 (mal Einsatz). Alle anderen Symbole brauchen mindestens 3.
- **Vorbedingung:** keine
- **Beobachtbar an:** `vs:result` → `detail.lines[].length === 2` und `factor === 1`; im gedruckten Gewinnplan die Sonderzeile „AB 2 GLEICHE: 1".
- **Umgesetzt in:** `Resources/Public/JavaScript/paytable.js:38,66,79-81`, `Classes/Rules.php:51,92`, `Resources/Private/Language/locallang.xlf:34-36`

### F-VS-07  Scatter zahlt unabhängig von den Linien
- **Was:** Das Scatter-Symbol zahlt allein dadurch, dass es oft genug irgendwo im Sichtfeld liegt — gleich in welcher Zeile, gleich auf welcher Linie.
- **Wie ausgelöst:** Automatisch nach jeder Runde, zusätzlich zur Linienauswertung.
- **Soll-Ergebnis:** Ab **3** Scattern im Feld gibt es einen Gewinn: 3 → Faktor 3, 4 → Faktor 10, 5 → Faktor 50. Bei weniger als 3 kein Scattergewinn. Der Scatterfaktor wird zur Summe der Linienfaktoren addiert und mit demselben Einsatz multipliziert wie die Linien.
- **Vorbedingung:** keine
- **Beobachtbar an:** `vs:result` → `detail.scatter` = `{count, factor, cells}` bzw. `null`; die Scatterfelder bekommen `vs-cell--win`; der Ansagesatz enthält „Scatter: …".
- **Umgesetzt in:** `Resources/Public/JavaScript/paytable.js:126-142,153-178`, `Classes/Rules.php:48,93,119`

### F-VS-08  Die Gewinntabelle (Faktoren, bezogen auf Einsatz 1)
- **Was:** Die vollständige Tabelle, welche Kombination wie viel zahlt.
- **Wie ausgelöst:** Automatisch bei der Auswertung; dieselbe Tabelle wird als Gewinnplan hinter Glas gedruckt.
- **Soll-Ergebnis:** Faktoren je Symbol und Kettenlänge:
  | Symbol | 2 gleiche | 3 gleiche | 4 gleiche | 5 gleiche |
  |---|---|---|---|---|
  | sieben | – | 30 | 180 | 900 |
  | glocke | – | 18 | 100 | 500 |
  | weintraube | – | 12 | 60 | 300 |
  | melone | – | 9 | 40 | 200 |
  | pflaume | – | 7 | 30 | 120 |
  | orange | – | 5 | 18 | 75 |
  | zitrone | – | 3 | 12 | 50 |
  | kirsche | 1 | 2 | 8 | 30 |
  | scatter (überall im Feld) | – | 3 | 10 | 50 |

  Der ausgezahlte Betrag ist `Summe aller Faktoren × gewählter Einsatz`.
- **Vorbedingung:** keine
- **Beobachtbar an:** `vs:result` → `{factor, bet, win}` mit `win === factor * bet`; die GEWINN-Röhrengruppe zeigt `win`.
- **Umgesetzt in:** `Classes/Rules.php:84-94`, `Resources/Public/JavaScript/paytable.js:58-68`, `machine.js:421-423`

### F-VS-09  Grundstellung des Sichtfelds beim Seitenaufruf
- **Was:** Beim Aufruf der Seite steht ein festgelegtes Bild im Fenster, in dem alle neun Symbole gleichzeitig zu sehen sind und das trotzdem kein Gewinn ist.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Zeile 0 (oben): glocke · orange · sieben · zitrone · melone; Zeile 1 (Mitte): sieben · melone · kirsche · weintraube · pflaume; Zeile 2 (unten): pflaume · weintraube · zitrone · scatter · orange. Alle fünf Walzen stehen auf Bandposition 1 (mittlere Zeile).
- **Vorbedingung:** keine
- **Beobachtbar an:** die 15 Felder des Sichtfelds im ausgelieferten HTML; `--vs-reel-pos` je Walze; nur ein Scatter im Feld.
- **Umgesetzt in:** `Classes/Rules.php:109-113,122`, `Classes/DataProcessing/CabinetProcessor.php`

### F-VS-10  Neun Symbole, kein BAR
- **Was:** Der Zeichenvorrat des Geräts.
- **Wie ausgelöst:** Zeichnung des Gehäuses.
- **Soll-Ergebnis:** Genau neun Symbole in der Rangfolge sieben, glocke, weintraube, melone, pflaume, orange, zitrone, kirsche, scatter. Der BAR-Block des Reel Slot kommt hier ausdrücklich nicht vor.
- **Vorbedingung:** keine
- **Beobachtbar an:** neun `<symbol id="vs-sym-…">` in `Machine/Shell.html`, neun `vs-mini-…` in der Saal-Miniatur; Verwendung nur per `<use href="#vs-sym-…">`.
- **Umgesetzt in:** `Classes/Rules.php:35-45`, `Resources/Private/Partials/Automat/VideoSlot/Machine/Shell.html`

### F-VS-11  Gewinnplan hinter Glas
- **Was:** Auf dem Gehäuse ist der Gewinnplan gedruckt, damit der Spieler ohne Nachschlagen sieht, was was zahlt.
- **Wie ausgelöst:** Seitenaufruf (serverseitig gezeichnet).
- **Soll-Ergebnis:** Überschrift „GEWINNPLAN · 5 LINIEN · GLEICHE VON LINKS · EINSATZ 1", darunter die Zeilen aus derselben Tabelle wie die Auswertung, mit den Sonderzeilen „AB 2 GLEICHE: 1" (Kirsche) und „ÜBERALL IM FELD" (Scatter).
- **Vorbedingung:** keine
- **Beobachtbar an:** sichtbarer Text am Gehäuse; Zeilen aus `CabinetProcessor`.
- **Umgesetzt in:** `Classes/DataProcessing/CabinetProcessor.php`, `Resources/Private/Language/locallang.xlf:26-39`, `Machine/Shell.html`

### F-VS-12  Walzenbänder
- **Was:** Jede der fünf Walzen hat ein eigenes, festes Band mit 25 Positionen; daraus entsteht das Bild im Fenster.
- **Wie ausgelöst:** Zeichnung beim Seitenaufruf, Landung nach jeder Runde.
- **Soll-Ergebnis:** 25 Positionen je Walze; kein Symbol zweimal nebeneinander (auch über den Rundumschluss Position 24→0); genau ein Scatter je Walze; die Positionen 0/1/2 jeder Walze ergeben von oben nach unten genau die Spalte dieser Walze aus der Grundstellung.
- **Vorbedingung:** keine
- **Beobachtbar an:** Attribut `data-vs-strip` je Walze im ausgelieferten HTML.
- **Umgesetzt in:** `Classes/Rules.php:144-185`, `Resources/Private/Partials/Automat/VideoSlot/Machine/Grid.html`

---

## Bedienung am Gehäuse: Rundenablauf

### F-VS-13  START — eine Runde starten
- **Was:** Die große START-Taste an der rechten Flanke setzt die fünf Walzen in Bewegung.
- **Wie ausgelöst:** `pointerdown` auf `.vs-start[data-vs-button="start"]` löst sofort aus; ein `click` mit `event.detail === 0` (Enter/Leertaste/Hilfsmittel) löst ebenfalls aus. Außerdem: Ereignis `vs:spin` am Gehäuse.
- **Soll-Ergebnis:** In genau diesem Moment wird gewürfelt (fünf unabhängige Ziehungen über je 25 Rasterpositionen); danach laufen die Walzen an. Zustand wechselt `idle`/`result` → `spinning`. Vorheriges Ergebnis (Hervorhebungen, GEWINN-Anzeige, Ansage) wird abgeräumt.
- **Vorbedingung:** Zustand ist `idle` oder `result` (`canPull`); die Runde darf nicht per `vs:round` abgesagt werden (z. B. zu wenig Gerätekredit); sichere Zufallsquelle vorhanden.
- **Beobachtbar an:** `data-vs-round` am `.vs-machine` = die fünf gezogenen Positionen, mit `-` verbunden (z. B. `7-19-3-22-0`) — steht **vor** dem ersten STOP da; Ereignis `vs:state` mit `{from:'idle'|'result', to:'spinning'}`; Klasse `vs-start--pressed` während des Drückens.
- **Umgesetzt in:** `machine.js:288-322,195`, `press.js:521-558`, `rng.js:79-94`

### F-VS-14  STOP — die nächste laufende Walze anhalten
- **Was:** Die STOP-Taste hält die von links gesehen erste noch laufende Walze an.
- **Wie ausgelöst:** `pointerdown` auf `.vs-btn[data-vs-button="stop"]`, oder Enter/Leertaste (click mit `detail === 0`).
- **Soll-Ergebnis:** Diese Walze bremst und landet punktgenau auf der beim Start gezogenen Position. Der Druckzeitpunkt ändert das Ergebnis **nicht** — nur den Zeitpunkt der Bremse. Zwischen zwei Stillständen liegen mindestens 0,1 s. Beim ersten STOP wechselt der Zustand `spinning` → `stopping`.
- **Vorbedingung:** Zustand `spinning` oder `stopping`; mindestens eine Walze noch anhaltbar. Sonst tut die Taste nichts.
- **Beobachtbar an:** `vs:state` `{from:'spinning', to:'stopping'}`; je stillstehender Walze ein `vs:reelrest` mit `{reel, cell, symbols}`; Klasse `vs-btn--pressed` während des Drückens.
- **Umgesetzt in:** `machine.js:331-352,196`, `reel.js:255-270`

### F-VS-15  Selbsttätiger Halt der Walzen
- **Was:** Wer nicht drückt, bekommt die Walzen trotzdem der Reihe nach zum Stehen.
- **Wie ausgelöst:** Zeitablauf ab dem START-Druck.
- **Soll-Ergebnis:** Walze 1 hält ab 1,2 s, Walze 2 ab 1,8 s, Walze 3 ab 2,4 s, Walze 4 ab 3,0 s, Walze 5 ab 3,6 s — sofern nicht vorher per STOP angehalten. Eine Runde ohne Eingriff dauert damit rund 3,6 s plus Bremse.
- **Vorbedingung:** laufende Runde
- **Beobachtbar an:** fünf `vs:reelrest`-Ereignisse in dieser zeitlichen Folge.
- **Umgesetzt in:** `machine.js:135,373-408`

### F-VS-16  Anlauf- und Bremsverhalten der Walzen (Optik)
- **Was:** Die Walzen laufen versetzt an, laufen unterschiedlich schnell, bremsen gleichmäßig und federn beim Halt kurz nach.
- **Wie ausgelöst:** Rundenstart und Stillstand.
- **Soll-Ergebnis:** Anlaufverzug 0 / 60 / 120 / 180 / 240 ms; Anlauf 260 ms; Laufgeschwindigkeit 40 / 42 / 38 / 41 / 39 Zellen je Sekunde; Bremsstrecke fest 9 Zellen; Nachfedern 0,30 Zellen über 130 ms.
- **Vorbedingung:** laufende Runde
- **Beobachtbar an:** CSS-Eigenschaft `--vs-reel-pos` je Walze ändert sich Bild für Bild; nur mit dem Auge, was die Optik betrifft.
- **Umgesetzt in:** `reel.js:57-120`

### F-VS-17  Auswertung und Hervorhebung der Treffer
- **Was:** Stehen alle fünf Walzen still, wertet das Gerät aus, was **im Fenster steht**, zeigt den Betrag an und hebt die Treffer hervor.
- **Wie ausgelöst:** Automatisch, sobald alle fünf Walzen ruhen.
- **Soll-Ergebnis:** Zustand `stopping` → `evaluating` → `result`; die GEWINN-Röhrengruppe zeigt den Betrag (`factor × Einsatz`); jedes getroffene Feld bekommt `vs-cell--win` (Rahmen, also Form statt nur Farbe); jede getroffene Linie bekommt `vs-payline--win` und wird sichtbar; der Live-Bereich sagt einen Satz mit Betrag und Liniennummern an.
- **Vorbedingung:** alle Walzen in Ruhe
- **Beobachtbar an:** Ereignis `vs:result` mit `{grid, lines, scatter, factor, bet, win}`; Klassen `vs-cell--win`, `vs-payline--win`; Text im `[data-vs-grid-announce]`.
- **Umgesetzt in:** `machine.js:415-463`

### F-VS-18  Ansage der Runde im Live-Bereich (ein Satz je Runde)
- **Was:** Ein Bildschirmleser bekommt pro Runde genau einen vollständigen Satz vorgelesen, statt fünfzehn Bruchstücke.
- **Wie ausgelöst:** Ende der Auswertung; beim Rundenstart wird der Bereich zuvor geleert.
- **Soll-Ergebnis:** Vier Satzmuster, je nach Ausgang:
  - Linien getroffen und Scatter: „Walzen: {Aufzählung}. Gewinn {Betrag}, getroffene Linien: {Nummern}, Scatter: {Anzahl}"
  - nur Linien: „Walzen: {…}. Gewinn {Betrag}, getroffene Linien: {Nummern}"
  - nur Scatter: „Walzen: {…}. Gewinn {Betrag}, Scatter: {Anzahl}"
  - nichts getroffen: „Walzen: {…}. Kein Gewinn"

  Die Aufzählung nennt die Symbole innerhalb einer Walze mit „, " und zwischen den Walzen mit „; ", von oben nach unten, Walze 1 bis 5, mit den deutschen Namen (Sieben, Glocke, Weintraube, Melone, Pflaume, Orange, Zitrone, Kirsche, Scatter). Ansagen werden entprellt: die erste geht sofort hinaus, jede weitere frühestens nach 700 ms.
- **Vorbedingung:** keine
- **Beobachtbar an:** Textinhalt des `[data-vs-grid-announce]` (`role="status"`).
- **Umgesetzt in:** `grid-announce.js:132,176-269`, `locallang.xlf:77-129`

### F-VS-19  Sichtfeld wird leer ausgeliefert und bleibt bis zur ersten Runde leer
- **Was:** Vor der ersten echten Runde steht im Ansagebereich des Sichtfelds nichts.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Kein Text im Live-Bereich, bis die erste Runde ausgewertet ist. (Der Konstruktor sagt den Anfangsstand ausdrücklich **nicht** mehr an.)
- **Vorbedingung:** keine
- **Beobachtbar an:** `[data-vs-grid-announce]` ist im ausgelieferten HTML und in den ersten Sekunden leer.
- **Umgesetzt in:** `machine.js:200-207`

### F-VS-20  Zweites Gehäuse auf derselben Seite bleibt unbedienbar
- **Was:** Steht das Element zweimal auf einer Seite, wird nur das erste Gerät verdrahtet.
- **Wie ausgelöst:** Seitenaufruf mit zwei `.vs-machine` im Dokument.
- **Soll-Ergebnis:** Das zweite Gehäuse bekommt die Klasse `vs-machine--duplicate` und reagiert auf nichts; in der Browserkonsole steht eine Fehlermeldung (Grund: es gibt je Schlüssel und Seite nur einen Gerätekredit).
- **Vorbedingung:** zwei Elemente „Video Slot" auf derselben Seite
- **Beobachtbar an:** Klasse `vs-machine--duplicate` am zweiten `.vs-machine`; Konsolenzeile `[video-slot] Ein zweites "Video Slot"-Gehäuse …`.
- **Umgesetzt in:** `video-slot.js:381-392`

### F-VS-21  Aufräumen beim Verlassen der Seite und Rückkehr über den Zurück-Knopf
- **Was:** Beim Verlassen der Seite hält alles an und der Gerätekredit wandert vollständig in die Kasse zurück; kommt die Seite aus dem Vor-/Zurück-Zwischenspeicher zurück, wird das Gehäuse neu verdrahtet.
- **Wie ausgelöst:** `pagehide` beim Verlassen; `pageshow` mit `event.persisted === true` beim Zurückkommen.
- **Soll-Ergebnis:** Reihenfolge beim Verlassen: Klang → Auto-Modus → Risiko-Leiter (ein offener Gewinn wird dabei noch gutgeschrieben) → Spielkern → Kassenanzeige → Verrechnung (`machineCredit.close()`: Gerätekredit vollständig zurück in die Kasse, Spiegel gelöscht) → Klang der ganzen Seite aus. `data-vs-round` wird vom Gehäuse entfernt. Beim Zurückkommen ist das Gerät wieder bedienbar.
- **Vorbedingung:** mindestens ein verdrahteter Automat
- **Beobachtbar an:** `data-vs-round` verschwindet; Kassenstand enthält danach den vorherigen Gerätekredit; nach `pageshow` reagieren die Tasten wieder.
- **Umgesetzt in:** `video-slot.js:281-332,456-460`, `machine.js:506-520`

### F-VS-22  AUSSER BETRIEB ohne sichere Zufallsquelle
- **Was:** Fehlt dem Browser `crypto.getRandomValues`, spielt das Gerät gar nicht erst.
- **Wie ausgelöst:** Seitenaufruf; Prüfung einmal für die ganze Seite.
- **Soll-Ergebnis:** Kein Gehäuse wird verdrahtet; auf dem Meldungsschild steht dauerhaft (ohne Selbstausblenden) **AUSSER BETRIEB**; eine Fehlermeldung steht in der Browserkonsole. Es wird ausdrücklich **nicht** heimlich auf `Math.random()` ausgewichen.
- **Vorbedingung:** Browser ohne `crypto.getRandomValues`
- **Beobachtbar an:** Text „AUSSER BETRIEB" im `.vs-message` mit Klasse `vs-message--shown`, der stehen bleibt; Konsolenzeile `[video-slot] Keine sichere Zufallsquelle …`.
- **Umgesetzt in:** `video-slot.js:353-372`, `rng.js:33-60`, `message.js:412-446`

---

## Anzeigen und Meldungen

### F-VS-23  Meldungsschild über dem Sichtfeld
- **Was:** Eine Tafel nach Art der alten „TILT"-Schilder, die kurze Meldungen zeigt.
- **Wie ausgelöst:** Von den Modulen, wenn etwas zu melden ist (siehe die einzelnen Funktionen).
- **Soll-Ergebnis:** Sechs mögliche Meldungen: **GUTHABEN ZU GERING** (`insufficient`), **BETRAG UNGÜLTIG** (`invalid`), **KONTO VOLL** (`capped`), **RUNDE UNGÜLTIG** (`void`), **KASSE ZU GERING** (`nocash`), **AUSSER BETRIEB** (`norng`). Eine Meldung steht 2,6 s und blendet dann von allein aus; jede neue Meldung setzt die Uhr zurück; 400 ms nach dem Ausblenden wird der Text abgeräumt. Nur `norng` bleibt dauerhaft stehen.
- **Vorbedingung:** keine
- **Beobachtbar an:** Textinhalt und Klasse `vs-message--shown` am `.vs-message[data-vs-message]` (`role="status"`); die sechs Texte stehen als `data-vs-text-*` im ausgelieferten HTML.
- **Umgesetzt in:** `message.js:346-361,372-379,412-467`, `Machine/Cabinet.html:97-103`, `locallang.xlf:174-191`

### F-VS-24  Vier Nixie-Röhrengruppen: GUTHABEN, EINSATZ, STUFE, GEWINN
- **Was:** Vier gezeichnete Röhrenanzeigen auf der Nixie-Platte.
- **Wie ausgelöst:** Seitenaufruf (Grundstellung) und laufender Betrieb.
- **Soll-Ergebnis:** GUTHABEN (6 Röhren) und STUFE (2 Röhren) starten **dunkel** (`--vs-digit: -1`), weil eine gemalte Zahl eine sichtbare Lüge wäre; EINSATZ startet auf `01` (Einsatz 1 ist vorgewählt) und GEWINN auf `00000`. Jede Gruppe hat einen unsichtbaren Ansagebereich mit Beschriftung und Wert in **einem** Satz: „Guthaben: {0}", „Einsatz: {0}", „Stufe: {0}", „Gewinn: {0}". Die gezeichneten Röhren tragen `aria-hidden="true"`.
- **Vorbedingung:** keine
- **Beobachtbar an:** vier Gruppen mit `data-vs-display="guthaben"|"einsatz"|"stufe"|"gewinn"`; je Gruppe ein `role="status"`-Bereich mit `data-vs-text-*`-Satzmuster; `--vs-digit` je Röhre.
- **Umgesetzt in:** `Machine/Cabinet.html:119-128`, `Machine/NixieGroup.html`, `Machine/NixieTube.html`, `nixie.js`, `locallang.xlf:44-74`

### F-VS-25  Kassenfenster im Sockel
- **Was:** Ein zweites, getrenntes Fenster zeigt den **Kassenstand** (alle Geräte der Seite gemeinsam) — im Unterschied zur GUTHABEN-Gruppe, die den Gerätekredit zeigt.
- **Wie ausgelöst:** Seitenaufruf und jede Änderung der Kasse.
- **Soll-Ergebnis:** Vor dem ersten Wert steht ein Gedankenstrich „–", keine gemalte Zahl. Beschriftung „Kasse" und Zahl sind `aria-hidden`; daneben ein unsichtbarer Live-Bereich mit dem Satz „Kasse: {0}".
- **Vorbedingung:** keine
- **Beobachtbar an:** `[data-vs-bank-display]` (sichtbare Zahl), `[data-vs-bank-announce]` (`role="status"`), `data-vs-bank` am Gehäuse.
- **Umgesetzt in:** `Machine/Cabinet.html:269-275`, `bank.js`, `locallang.xlf:215-220`

### F-VS-26  Sieben leere Live-Bereiche im ausgelieferten HTML
- **Was:** Sieben Ansagebereiche stehen von Anfang an leer im HTML, damit ein Bildschirmleser spätere Änderungen überhaupt vorliest.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Genau sieben `role="status"`: Meldungsschild, Sichtfeld, die vier Röhrengruppen und das Kassenfenster — alle leer. Verborgen wird nur über `opacity`/`pointer-events`, nie über `visibility`/`display`.
- **Vorbedingung:** keine
- **Beobachtbar an:** sieben Elemente mit `role="status"` und leerem Textinhalt im ausgelieferten HTML.
- **Umgesetzt in:** `Machine/Cabinet.html:97,273`, `Machine/Grid.html`, `Machine/NixieGroup.html`

---

## Das Geld: Kasse, Gerätekredit, Einwurf, Einsatz, Gewinn, Auszahlung

Zwei Töpfe, absichtlich getrennt:
- die **Kasse** (`casinoKunterbunt.credits`) — allen Geräten der Seite gemeinsam, sichtbar im Kassenfenster im Sockel;
- der **Gerätekredit** (`casinoKunterbunt.machine.video_slot`) — was in *diesem* Gerät liegt, sichtbar in den GUTHABEN-Röhren, beim Betreten der Seite **immer 0**.

Gespielt wird ausschließlich vom Gerätekredit. Weg des Geldes: Kasse → Münzschlitz → Gerät → Einsatz/Gewinn → `CASH OUT` oder Verlassen der Seite → zurück in die Kasse.

### F-VS-27  Gerätekredit anlegen (beim Betreten der Seite immer 0)
- **Was:** Beim Aufruf der Seite bekommt das Gerät einen eigenen, leeren Kredittopf; ein aus einem Absturz übrig gebliebener Restbetrag wandert sofort in die Kasse zurück.
- **Wie ausgelöst:** Seitenaufruf (`openMachineCredit('video_slot')`, genau einmal im Quelltext).
- **Soll-Ergebnis:** GUTHABEN steht auf 0 und die sechs Röhren kommen aus dem Dunkeln; ein Restbetrag aus einer abgestürzten Sitzung ist danach in der Kasse, nicht im Gerät; der Speicherspiegel ist leer.
- **Vorbedingung:** keine
- **Beobachtbar an:** `data-vs-machine-credit="0"` und `data-vs-mirror=""` am `.vs-machine`; GUTHABEN-Röhren zeigen 000000.
- **Umgesetzt in:** `wallet.js` (Konstruktor, `openMachineCredit(MACHINE_KEY)`; `MACHINE_KEY = 'video_slot'`)

### F-VS-28  Münzeinwurf über die drei Schnellwerte +10 / +50 / +100
- **Was:** Drei Messingknöpfe werfen einen festen Betrag aus der Kasse ins Gerät.
- **Wie ausgelöst:** `click` auf `.vs-coinslot__button[data-vs-coin-add="10"|"50"|"100"]` (echte Schaltflächen, also auch mit Enter/Leertaste).
- **Soll-Ergebnis:** Der Betrag wandert **aus der Kasse** in den Gerätekredit — erst Abbuchung aus der Kasse, dann Gutschrift im Gerät, nie umgekehrt. Die GUTHABEN-Röhren zählen sichtbar hoch, das Kassenfenster springt auf den neuen Stand. Eine Münze fällt sichtbar in den Schlitz (CSS-Animation, 460 ms; Klasse wird nach 480 ms wieder abgenommen), der Schlitz blitzt kurz auf.
- **Vorbedingung:** Kasse deckt den Betrag vollständig (**alles oder nichts**).
- **Beobachtbar an:** Ereignis `vs:coin` mit `{amount, moved, reason, machineCredit}`; `data-vs-machine-credit` und `data-vs-bank` ändern sich; `data-vs-total` bleibt **unverändert**; Klassen `vs-coinslot__coin--drop` und `vs-coinslot__slot--flash`.
- **Umgesetzt in:** `coinslot.js:224-291`, `Machine/Cabinet.html:224-231`

### F-VS-29  Münzeinwurf über den freien Betrag
- **Was:** Ein Eingabefeld nimmt einen beliebigen Betrag an; abgeschickt wird über den gezeichneten Münzschlitz oder die Eingabetaste.
- **Wie ausgelöst:** Zahl in `[data-vs-coin-input]` eintragen, dann `[data-vs-coin-insert]` (der Schlitz, ein `type="submit"`) drücken oder im Feld Enter drücken. Das Feld hat `min="1"`, `max="999999999"`, `step="1"`, Platzhalter „Betrag", unsichtbare Beschriftung „Freier Betrag"; der Schlitz trägt die unsichtbare Beschriftung „Einwerfen".
- **Soll-Ergebnis:** Wie F-VS-28. Nach erfolgreichem Einwurf wird das Feld geleert; bei ungültigem Betrag bleibt die Eingabe stehen, damit man sie berichtigen kann. Die Seite lädt dabei **nicht** neu.
- **Vorbedingung:** ganze Zahl ≥ 1 und ≤ Höchststand; Kasse deckt sie.
- **Beobachtbar an:** `vs:coin`; Feldinhalt danach leer bzw. erhalten.
- **Umgesetzt in:** `coinslot.js:162-204,224-260`, `Machine/Cabinet.html:233-246`

### F-VS-30  Meldung BETRAG UNGÜLTIG
- **Was:** Ein unsinniger Einwurfbetrag wird abgewiesen, ohne dass etwas gebucht wird.
- **Wie ausgelöst:** Einwurf mit leerem Feld, keiner ganzen Zahl, einem Wert < 1 oder über dem Höchstbetrag des Gerätekredits.
- **Soll-Ergebnis:** Meldungsschild zeigt **BETRAG UNGÜLTIG**; es fällt keine Münze; es wird nichts gebucht.
- **Vorbedingung:** keine
- **Beobachtbar an:** Text „BETRAG UNGÜLTIG" im `.vs-message`; `data-vs-total`, `data-vs-bank`, `data-vs-machine-credit` unverändert.
- **Umgesetzt in:** `coinslot.js:225-228`, `locallang.xlf:177-179`

### F-VS-31  Meldung KASSE ZU GERING
- **Was:** Reicht die Kasse für den gewünschten Einwurf nicht, wird gar nichts bewegt.
- **Wie ausgelöst:** Einwurf über den Kassenstand hinaus.
- **Soll-Ergebnis:** Meldungsschild zeigt **KASSE ZU GERING**; keine Teilbuchung. Die Münze fällt trotzdem sichtbar — der Druck ist angekommen, das Schild sagt im selben Augenblick warum.
- **Vorbedingung:** Einwurfbetrag > Kassenstand
- **Beobachtbar an:** Text „KASSE ZU GERING"; `vs:coin` mit `moved: 0` und `reason` ungleich `'ok'`.
- **Umgesetzt in:** `coinslot.js:236-241`, `locallang.xlf:186-188`

### F-VS-32  Meldung KONTO VOLL (Kappung am Höchststand)
- **Was:** Passt ein Betrag nicht mehr in den Gerätekredit (Höchststand 999.999.999), wird auf den Höchststand gekappt und das gesagt.
- **Wie ausgelöst:** Einwurf, Gewinn-Gutschrift oder `CASH OUT`, bei dem gekappt werden muss.
- **Soll-Ergebnis:** Meldungsschild zeigt **KONTO VOLL**; der Rest bleibt stehen (beim `CASH OUT` im Gerät), es verschwindet nichts.
- **Vorbedingung:** Höchststand erreicht
- **Beobachtbar an:** Text „KONTO VOLL"; `vs:collect` bzw. `vs:cashout` mit `capped: true`.
- **Umgesetzt in:** `coinslot.js:241`, `wallet.js` (`onCollect`), `bank.js` (`cashOut`), `payout.js:465-482`

### F-VS-33  Einsatzwahl 1 / 2 / 5 / 10
- **Was:** Vier Tasten in der Sockelreihe wählen den Einsatz je Runde.
- **Wie ausgelöst:** `click` auf `.vs-bet[data-vs-bet="1"|"2"|"5"|"10"]` (echte Schaltflächen; Enter und Leertaste lösen sie ebenfalls aus). Jede trägt ein `aria-label` „Einsatz 1" … „Einsatz 10".
- **Soll-Ergebnis:** Genau eine Taste ist gewählt (`vs-bet--selected`, `aria-pressed="true"`, alle anderen `false`). Die EINSATZ-Röhren **springen** auf den Wert (kein Hochzählen, weil der Einsatz eine Schalterstellung ist). Vorgewählt ist 1.
- **Vorbedingung:** Einsatzwahl nicht gesperrt (siehe F-VS-34)
- **Beobachtbar an:** `aria-pressed` und Klasse `vs-bet--selected`; EINSATZ-Röhrengruppe; Ansage „Einsatz: 10".
- **Umgesetzt in:** `wallet.js` (`selectBet`), `Machine/Cabinet.html:195-204`, `locallang.xlf:163-165`

### F-VS-34  Einsatzwahl während eines Zuges gesperrt
- **Was:** Solange die Walzen laufen und ausgewertet wird, lässt sich der Einsatz nicht ändern.
- **Wie ausgelöst:** Zustandswechsel (`vs:state`) auf etwas anderes als `idle` oder `result`.
- **Soll-Ergebnis:** Alle vier Einsatztasten bekommen `aria-disabled="true"`, die Gruppe die Klasse `vs-bets--locked`; ein Druck bleibt wirkungslos. Gesperrt wird über `aria-disabled`, **nicht** über `disabled`, damit der Tastfokus nicht mitten im Zug verloren geht; die wirksame Sperre ist die Prüfung im Code. Nach dem Zug (`result`) ist die Wahl wieder offen — auch während einer laufenden Risiko-Leiter.
- **Vorbedingung:** laufender Zug
- **Beobachtbar an:** `aria-disabled="true"` an `.vs-bet`; Klasse `vs-bets--locked`.
- **Umgesetzt in:** `wallet.js` (`OPEN_STATES`, `setLocked`, `onState`)

### F-VS-35  START leuchtet genau dann, wenn ein Zug möglich ist
- **Was:** Die START-Taste leuchtet auf, sobald der gewählte Einsatz aus dem Gerätekredit bezahlbar ist und kein Zug läuft.
- **Wie ausgelöst:** Jede Änderung des Gerätekredits, jede Einsatzwahl, jeder Zustandswechsel.
- **Soll-Ergebnis:** Klasse `vs-start--lit` ist gesetzt, wenn `Gerätekredit ≥ Einsatz` und das Gerät in Ruhe ist; während eines Zuges wird sie entfernt.
- **Vorbedingung:** keine
- **Beobachtbar an:** Klasse `vs-start--lit` an `.vs-start`.
- **Umgesetzt in:** `wallet.js` (`reviewAffordability`, `setLocked`)

### F-VS-36  Meldung GUTHABEN ZU GERING und Absage der Runde
- **Was:** Reicht der Gerätekredit für den gewählten Einsatz nicht, kommt die Runde nicht zustande.
- **Wie ausgelöst:** START drücken (oder `vs:spin`) bei zu geringem Gerätekredit; außerdem meldet die Wahl eines zu hohen Einsatzes das sofort, ohne START.
- **Soll-Ergebnis:** Die Runde wird per `preventDefault()` auf `vs:round` abgesagt — die Walzen laufen **nicht** an, es wird **nichts** abgebucht; Meldungsschild zeigt **GUTHABEN ZU GERING**. Solange der Besucher das Gerät noch gar nicht bedient hat, schweigt das Schild (ein Erstbesucher wird nicht mit einer Fehlermeldung begrüßt); als Bedienhandlung zählen Einwurf, Einsatz, Gewinn, Auszahlung, eine Einsatzwahl und ein START-Druck.
- **Vorbedingung:** Gerätekredit < gewählter Einsatz
- **Beobachtbar an:** Text „GUTHABEN ZU GERING"; kein `data-vs-round`-Wechsel, kein `vs:state`; `data-vs-machine-credit` unverändert.
- **Umgesetzt in:** `wallet.js` (`onRound`, `reviewAffordability`, `ENGAGING_REASONS`), `locallang.xlf:174-176`

### F-VS-37  Abbuchung des Einsatzes
- **Was:** Mit dem Rundenstart wird der Einsatz vom Gerätekredit abgebucht.
- **Wie ausgelöst:** Zustandekommen der Runde (`vs:round` nicht abgesagt).
- **Soll-Ergebnis:** Gerätekredit sinkt um den Einsatz; GUTHABEN zählt sichtbar herunter; die Kasse bleibt unberührt. Prüfung und Abbuchung liegen im selben synchronen Block, so dass dazwischen nichts passieren kann.
- **Vorbedingung:** Gerätekredit ≥ Einsatz
- **Beobachtbar an:** `data-vs-machine-credit` um den Einsatz kleiner; `data-vs-bank` unverändert; `data-vs-total` um den Einsatz kleiner; `vs:count`-Ereignisse der Zählfahrt.
- **Umgesetzt in:** `wallet.js` (`onRound`, `pendingDebit`)

### F-VS-38  Gutschrift des Gewinns
- **Was:** Ein erspielter Gewinn wird dem **Gerätekredit** gutgeschrieben, nicht der Kasse.
- **Wie ausgelöst:** Nach `vs:result` mit `win > 0`, sofern die Risiko-Leiter den Gewinn nicht übernimmt.
- **Soll-Ergebnis:** Der Betrag `factor × Einsatz` wandert in den Gerätekredit; GUTHABEN zählt sichtbar hoch; die Kasse bleibt unberührt. Ein Gewinn von 0 wird gar nicht erst gebucht und nicht gemeldet.
- **Vorbedingung:** Der Einsatz muss tatsächlich bezahlt worden sein.
- **Beobachtbar an:** Ereignis `vs:collect` mit `{amount, credited, capped, machineCredit}`; `data-vs-machine-credit` steigt.
- **Umgesetzt in:** `wallet.js` (`onResult`), `payout.js:437-483`

### F-VS-39  Ein Gewinn kann nicht zweimal eingelöst werden
- **Was:** Derselbe Gewinnanspruch bucht höchstens einmal.
- **Wie ausgelöst:** Zweiter Aufruf von `collect()` oder `discard()` auf demselben Anspruch.
- **Soll-Ergebnis:** Es wird nichts gebucht; der Programmfehler wird in der Browserkonsole gemeldet (`ok: false`, `reason: 'settled'`).
- **Vorbedingung:** bereits erledigter Anspruch
- **Beobachtbar an:** kein zweites `vs:collect`; `data-vs-machine-credit` unverändert; Konsolenzeile.
- **Umgesetzt in:** `payout.js:418-452,495-501`

### F-VS-40  Meldung RUNDE UNGÜLTIG (Einsatz konnte nicht abgebucht werden)
- **Was:** Ist der Einsatz nachträglich doch nicht buchbar (etwa weil der Server absagt, während die Walzen schon laufen), läuft die Runde zu Ende, wird aber nicht ausgezahlt.
- **Wie ausgelöst:** Rückmeldung `{ok: false}` der Abbuchung, sichtbar erst bei `vs:result`.
- **Soll-Ergebnis:** Die Walzen halten normal, das Ergebnis wird angezeigt und die GEWINN-Röhren zeigen weiter den erspielten Betrag; es entsteht **kein** Gewinnanspruch, `vs:payout` wird gar nicht gesendet; Meldungsschild zeigt **RUNDE UNGÜLTIG**; der Gerätekredit bleibt unangetastet; danach ist nichts gesperrt.
- **Vorbedingung:** fehlgeschlagene Abbuchung (im reinen Browserbetrieb baulich unerreichbar; erreichbar mit serverseitigem Konto)
- **Beobachtbar an:** Text „RUNDE UNGÜLTIG"; kein `vs:collect`; `data-vs-machine-credit` unverändert; Konsolenzeile.
- **Umgesetzt in:** `wallet.js` (`onResult`, `pendingDebit`), `locallang.xlf:183-185`

### F-VS-41  CASH OUT — Gerätekredit in die Kasse zurückbuchen
- **Was:** Die Taste auf der Auswurfschale zahlt den gesamten Gerätekredit in die Kasse aus.
- **Wie ausgelöst:** `click` auf `.vs-cashout[data-vs-cashout]` — bewusst `click` und nicht `pointerdown`, damit Enter und Leertaste sie auslösen.
- **Soll-Ergebnis:** Gerätekredit → 0, Kassenstand um denselben Betrag höher; das Kassenfenster **springt** auf den neuen Wert (zählt nicht hoch); GUTHABEN zählt herunter. Passt nicht alles in die Kasse, bleibt der Rest im Gerät und **KONTO VOLL** sagt es. Ein zuvor stehendes Meldungsschild wird bei Erfolg abgeräumt.
- **Vorbedingung:** Gerätekredit > 0 (sonst folgenlos)
- **Beobachtbar an:** Ereignis `vs:cashout` mit `{moved, capped, machineCredit}`; `data-vs-cashout` wechselt von `on` auf `off`; `data-vs-bank` steigt, `data-vs-machine-credit` fällt, `data-vs-total` bleibt gleich.
- **Umgesetzt in:** `bank.js` (`cashOut`), `Machine/Cabinet.html:293-296`

### F-VS-42  CASH OUT ist dunkel und gesperrt, wenn nichts im Gerät liegt
- **Was:** Steht der Gerätekredit auf 0, sieht die Taste nicht nach einem Angebot aus und tut nichts.
- **Wie ausgelöst:** Jede Änderung des Gerätekredits; Anfangszustand schon im ausgelieferten HTML.
- **Soll-Ergebnis:** `aria-disabled="true"` und keine Leuchtklasse bei 0; bei > 0 wird `aria-disabled` entfernt und `vs-cashout--lit` gesetzt. Die Taste bleibt in jedem Fall im Tastaturweg erreichbar (kein echtes `disabled`).
- **Vorbedingung:** keine
- **Beobachtbar an:** `aria-disabled` an `.vs-cashout`; Klasse `vs-cashout--lit`; `data-vs-cashout="on"|"off"`.
- **Umgesetzt in:** `bank.js` (`paint`), `Machine/Cabinet.html:293`

### F-VS-43  Bilanz Kasse + Gerätekredit ist von außen ablesbar
- **Was:** Das Gehäuse schreibt die Summe aus Kasse und Gerätekredit als eigenen Messpunkt heraus.
- **Wie ausgelöst:** Jede Änderung an einer der beiden Zahlen.
- **Soll-Ergebnis:** `data-vs-total` ändert sich durch Einwurf und Auszahlung **nie**; Einsatz und Gewinn verschieben sie um genau den gesetzten bzw. gewonnenen Betrag.
- **Vorbedingung:** keine
- **Beobachtbar an:** `data-vs-total` am `.vs-machine`, neben `data-vs-bank` und `data-vs-machine-credit`.
- **Umgesetzt in:** `bank.js` (`paint`), `wallet.js` (`syncAttributes`)

### F-VS-44  Gerätewechsel mit stehen gebliebenem Kredit
- **Was:** Verlässt der Spieler die Seite — auch durch Neuladen oder durch den Wechsel an ein anderes Gerät — wandert der Gerätekredit von selbst vollständig in die Kasse zurück. Es kann nichts liegenbleiben.
- **Wie ausgelöst:** `pagehide` (Seitenwechsel, Neuladen, Schließen).
- **Soll-Ergebnis:** `machineCredit.close()` bucht den vollständigen Gerätekredit in die Kasse und löscht den Speicherspiegel — genau einmal, aus einer einzigen Stelle im Quelltext. Ein zu diesem Zeitpunkt noch offener Gewinn der Risiko-Leiter ist vorher schon gutgeschrieben und wandert mit zurück. Das Abräumen der Kassenanzeige bucht ausdrücklich **nicht** mit (sonst zahlte der Kredit zweimal aus). Beim Betreten des nächsten Geräts steht dessen Gerätekredit wieder auf 0, das Geld ist in der Kasse.
- **Vorbedingung:** Gerätekredit > 0
- **Beobachtbar an:** Kassenstand am Zielgerät/Leuchtschild enthält den Betrag; `casinoKunterbunt.machine.video_slot` im Speicher leer; `data-vs-machine-credit`/`data-vs-mirror` vom Gehäuse entfernt.
- **Umgesetzt in:** `wallet.js` (`destroy`), `video-slot.js:281-307`, `bank.js` (`destroy`)

### F-VS-45  Zählwerk der Röhrenanzeigen
- **Was:** Ändert sich eine Zahl, fährt die Anzeige sichtbar dorthin, statt zu springen.
- **Wie ausgelöst:** Jede Änderung von GUTHABEN (und der Gewinnanzeige der Leiter).
- **Soll-Ergebnis:** 70 ms je Zählschritt, höchstens 12 Schritte; die Einsatzwahl **springt** dagegen (`snap()`), weil sie eine Schalterstellung ist. Der Kassenstand springt ebenfalls. Der Anfangsstand beim Seitenaufbau wird gesetzt, nicht gefahren, und **nicht** angesagt.
- **Vorbedingung:** keine
- **Beobachtbar an:** Ereignis `vs:count` mit `{display, value, index, steps, direction}` je sichtbarem Zählschritt; `--vs-digit` je Röhre.
- **Umgesetzt in:** `counter.js:104,107,185-301`

---

## Die Risiko-Leiter

Das **Bedienfeld** steht in `risk.js` dieser Extension; das **Spielwerk** (Blinken,
Wertung, Verdoppelung, Verwaltung des offenen Gewinns) liegt im Site Package
(`@phomo17/casino-startpage/risk-ladder.js`), die Zeitkurve in
`@phomo17/casino-startpage/risk-timing.js`. Die Zahlen unten stammen aus diesen
beiden geteilten Dateien; das Gerät enthält selbst keine einzige Zeitangabe und
keine Wertungsregel.

Drei Zustände: `off` (nichts los), `offer` (ein Gewinn liegt vor, RISK blinkt),
`ladder` (die Leiter läuft).

### F-VS-46  Angebot der Leiter nach einem Gewinn
- **Was:** Nach einer gewonnenen Runde bietet das Gerät an, den Gewinn zu riskieren, statt ihn sofort gutzuschreiben.
- **Wie ausgelöst:** Automatisch, wenn `vs:result` einen Gewinn > 0 ergibt (die Leiter übernimmt den Gewinnanspruch von der Verrechnung).
- **Soll-Ergebnis:** RISK blinkt (`vs-btn--blink`), REWARD leuchtet (`vs-btn--lit`), die beiden Risiko-Tasten bleiben dunkel, STUFE zeigt 0 (Röhren dunkel). Die GEWINN-Röhren zeigen weiterhin den erspielten Betrag (sie gehören in diesem Moment noch dem Spielkern). Der Spieler hat drei Wege: **START** (gutschreiben und neue Runde), **RISK** (Leiter starten), **REWARD** (gutschreiben, keine neue Runde).
- **Vorbedingung:** Gewinn > 0; der Auto-Modus darf das Angebot nicht abgesagt haben.
- **Beobachtbar an:** Ereignis `vs:risk` mit `{phase:'offer', level:0, win}` (abbrechbar); `data-vs-risk-phase="offer"`, `data-vs-risk-level="0"`, `data-vs-risk-win={Betrag}`; Klassen `vs-btn--blink` an RISK und `vs-btn--lit` an REWARD.
- **Umgesetzt in:** `risk.js:308-328,491-503`, `payout.js` (der Anspruch), `risk-ladder.js` (`offer`)

### F-VS-47  RISK — in die Leiter einsteigen
- **Was:** Die Taste RISK startet die Leiter auf Stufe 1.
- **Wie ausgelöst:** `pointerdown` auf `.vs-btn[data-vs-button="risk"]` (löst sofort aus) oder Enter/Leertaste (click mit `detail === 0`).
- **Soll-Ergebnis:** Zustand wechselt von `offer` auf `ladder`, Stufe 1. RISK hört auf zu blinken; die beiden Risiko-Tasten leuchten (`vs-btn--lit`); STUFE zeigt 1; die GEWINN-Röhren gehören ab jetzt der Leiter. Die Lichtfelder über den beiden Risiko-Tasten beginnen zu wandern.
- **Vorbedingung:** Zustand `offer`. In jedem anderen Zustand ist die Taste wirkungslos.
- **Beobachtbar an:** `vs:risk` mit `{phase:'start', level:1, win}`; `data-vs-risk-phase="ladder"`, `data-vs-risk-level="1"`, `data-vs-risk-side="200"`, `data-vs-risk-on="89"`.
- **Umgesetzt in:** `risk.js:255,468-476`, `risk-ladder.js:413-424`

### F-VS-48  Das wandernde Lichtfeld und das Trefferfenster je Stufe
- **Was:** Über den beiden Risiko-Tasten wandert ein Licht hin und her; getroffen werden muss, solange eines an ist.
- **Wie ausgelöst:** Läuft, solange die Leiter läuft (Zeichenschleife).
- **Soll-Ergebnis:** Jede Seite bekommt **200 ms** (feste Periode, zugleich die Sicherheitsgrenze gegen zu schnelles Blinken); davon **brennt** das Licht nur einen Teil, den Rest der 200 ms ist es dunkel. Die Brenndauer (= das Trefferfenster) je Stufe, gerechnet als `200 × 0,85^(Stufe+4)`, gerundet, aber nie unter 40 ms:

  | Stufe | Trefferfenster | Seitendauer |
  |---|---|---|
  | 1 | 89 ms | 200 ms |
  | 2 | 75 ms | 200 ms |
  | 3 | 64 ms | 200 ms |
  | 4 | 54 ms | 200 ms |
  | 5 | 46 ms | 200 ms |
  | 6 und höher | 40 ms (Untergrenze) | 200 ms |

  Ein voller Umlauf über beide Seiten dauert also 400 ms plus eine Pause, die genauso lang ist wie das Trefferfenster derselben Stufe. Gewertet wird ausdrücklich das zuletzt **gemalte** Lichtfeld, nicht die Uhr.
- **Vorbedingung:** Zustand `ladder`
- **Beobachtbar an:** Ereignis `vs:risktick` mit `{level, lit, on}` bei jedem Wechsel; `data-vs-risk-lit` = `left` | `right` | `none`; `data-vs-risk-side="200"`; `data-vs-risk-on` = Trefferfenster der laufenden Stufe; Klasse `vs-lamp--on` am `[data-vs-lamp="risk-left"|"risk-right"]`.
- **Umgesetzt in:** `risk.js:451-455,608-616`, `risk-timing.js:123-137,261-267`, `risk-ladder.js` (`tick`, `beginLevel`)

### F-VS-49  Treffen — die richtige Risiko-Taste drücken
- **Was:** Wer die Taste drückt, über der gerade das Licht brennt, verdoppelt den offenen Gewinn und steigt eine Stufe höher.
- **Wie ausgelöst:** `pointerdown` (oder Enter/Leertaste) auf `.vs-btn[data-vs-button="risk-left"]` bzw. `"risk-right"`, während genau dieses Lichtfeld an ist.
- **Soll-Ergebnis:** Der offene Gewinn wird **verdoppelt** (`amount × 2`, gesättigt beim höchsten sicheren Zahlenwert); die Stufe steigt um 1; das Blinken beginnt sofort von vorn, mit dem kürzeren Trefferfenster der neuen Stufe, ohne Pause und ohne Zwischenanzeige. STUFE und GEWINN stehen neu. Die Verdoppelung wird **sofort** gesetzt, noch bevor gebucht, die Stufe erhöht oder gemalt wird — auch im Servermodus; ein zweiter, schneller Treffer rechnet damit schon auf dem verdoppelten Betrag (10 → 20 → 40).
- **Vorbedingung:** Zustand `ladder`; das gedrückte Feld brennt gerade. Ein Druck, während beide Felder dunkel sind, gilt als Fehlgriff.
- **Beobachtbar an:** `vs:risk` mit `{phase:'hit', level, win}` — `level` und `win` sind bereits die **neuen**; `data-vs-risk-level` und `data-vs-risk-win` steigen; `data-vs-risk-on` wird kleiner.
- **Umgesetzt in:** `risk.js:257-258,468-476`, `risk-ladder.js:438-497`

### F-VS-50  Danebengreifen — alles verlieren
- **Was:** Wer die falsche Taste drückt oder im Dunkeln drückt, verliert den gesamten offenen Gewinn.
- **Wie ausgelöst:** Druck auf eine Risiko-Taste, während das andere Feld brennt oder beide dunkel sind.
- **Soll-Ergebnis:** Der Gewinnanspruch wird verworfen, es wird **nichts** gutgeschrieben; der Gerätekredit bleibt unverändert (der Einsatz war schon beim Rundenstart abgebucht). Die Leiter kehrt in den Grundzustand zurück: RISK und die Risiko-Tasten dunkel, STUFE dunkel, Lichtfelder aus.
- **Vorbedingung:** Zustand `ladder`
- **Beobachtbar an:** `vs:risk` mit `{phase:'miss', level, win, lost}` — `lost` ist der verlorene Betrag —, direkt gefolgt von `{phase:'end', level:0, win:0}`; `data-vs-risk-phase="off"`, `data-vs-risk-level="0"`, `data-vs-risk-win="0"`; `data-vs-machine-credit` unverändert.
- **Umgesetzt in:** `risk.js:257-258,382-393,536-544`, `risk-ladder.js:533-558`

### F-VS-51  REWARD — aussteigen und gutschreiben
- **Was:** Die Taste REWARD nimmt den offenen Gewinn mit und beendet die Leiter.
- **Wie ausgelöst:** `pointerdown` (oder Enter/Leertaste) auf `.vs-btn[data-vs-button="reward"]`. Wirkt **jederzeit** — im Angebot wie mitten in der Leiter.
- **Soll-Ergebnis:** Der offene Betrag wird dem Gerätekredit gutgeschrieben; GUTHABEN zählt sichtbar hoch; die GEWINN-Röhren zeigen zuletzt den ausgestiegenen Betrag; das Gerät kehrt in den Grundzustand zurück. Die Gruppe STUFE sagt **einmal** den **Ausgang** der Leiter an (auf welcher Stufe sie endete), nicht jede einzelne Stufe.
- **Vorbedingung:** Zustand `offer` oder `ladder`; im Grundzustand wirkungslos.
- **Beobachtbar an:** `vs:risk` mit `{phase:'collect', level, win}`, danach `{phase:'end', ...}`; Ereignis `vs:collect`; `data-vs-machine-credit` steigt; Ansage „Stufe: {n}".
- **Umgesetzt in:** `risk.js:256,420-427`, `risk-ladder.js:559-578`

### F-VS-52  START während des Angebots: gutschreiben und gleich weiterspielen
- **Was:** Wer im Angebot START drückt, bekommt den Gewinn gutgeschrieben und die nächste Runde beginnt sofort.
- **Wie ausgelöst:** START drücken, während RISK blinkt.
- **Soll-Ergebnis:** Der Gewinn wird gutgeschrieben, **bevor** die Verrechnung prüft, ob der Einsatz gedeckt ist — wer mit Gerätekredit 0 und 100 offenem Gewinn START drückt, kann also weiterspielen. RISK geht aus, die nächste Runde läuft an. Ein stehen gebliebenes Überlaufblinken der GEWINN-Röhren wird abgeräumt.
- **Vorbedingung:** Zustand `offer`
- **Beobachtbar an:** `vs:risk` `{phase:'collect'}` unmittelbar vor `vs:state` `{to:'spinning'}`; `data-vs-machine-credit` steigt und fällt danach um den Einsatz.
- **Umgesetzt in:** `risk.js:339-365` (Zuhörer in der Erfassungsphase am Dokument, läuft garantiert vor der Verrechnung)

### F-VS-53  START während der laufenden Leiter ist wirkungslos
- **Was:** Solange die Leiter läuft, startet START keine neue Runde.
- **Wie ausgelöst:** START drücken im Zustand `ladder`.
- **Soll-Ergebnis:** Es passiert nichts: keine neue Runde, und es wird auch **kein Einsatz abgebucht** (das Ereignis wird zusätzlich gestoppt, damit die Verrechnung es gar nicht erst zu sehen bekommt).
- **Vorbedingung:** Zustand `ladder`
- **Beobachtbar an:** kein `vs:state`-Wechsel; `data-vs-round` unverändert; `data-vs-machine-credit` unverändert.
- **Umgesetzt in:** `risk.js:344-352`

### F-VS-54  Einsatzwahl bleibt während der Leiter bedienbar
- **Was:** Während Angebot und Leiter kann der Einsatz weiter umgestellt werden.
- **Wie ausgelöst:** Klick auf eine Einsatztaste, während RISK blinkt oder die Leiter läuft.
- **Soll-Ergebnis:** Die Wahl wirkt; der Automat steht in diesem Zeitraum im Zustand `result`, und die Sperre gilt nur „bis zum Ende des Zuges".
- **Vorbedingung:** Zustand `result` (also Angebot oder Leiter)
- **Beobachtbar an:** `aria-disabled="false"` an `.vs-bet`; EINSATZ-Röhren ändern sich.
- **Umgesetzt in:** `wallet.js` (`OPEN_STATES`), `risk.js:86-96`

### F-VS-55  Überlauf der Anzeigen STUFE und GEWINN
- **Was:** Passt die Zahl nicht mehr in die Röhren, zeigt die Gruppe lauter Neunen und blinkt.
- **Wie ausgelöst:** Stufe > 99 (zwei Röhren) bzw. Gewinn > 99.999 (fünf Röhren).
- **Soll-Ergebnis:** Klasse `vs-nixie-group--overflow` an der betroffenen Gruppe, alle Röhren zeigen 9. Beim Beginn der nächsten Runde wird ein stehen gebliebenes Überlaufblinken der GEWINN-Gruppe abgeräumt.
- **Vorbedingung:** Wert über der Röhrenzahl
- **Beobachtbar an:** Klasse `vs-nixie-group--overflow`.
- **Umgesetzt in:** `risk.js:227-228,561-594`

### F-VS-56  `vs:riskcollect` von außen — aussteigen ohne Tastendruck
- **Was:** Ein Ereignis am Gehäuse kann die Leiter zum Aussteigen und Gutschreiben bringen; das braucht der Auto-Modus.
- **Wie ausgelöst:** `vs:riskcollect` am `.vs-machine`.
- **Soll-Ergebnis:** Wie REWARD (F-VS-51). Im Grundzustand wirkungslos.
- **Vorbedingung:** Zustand `offer` oder `ladder`
- **Beobachtbar an:** `vs:risk` `{phase:'collect'}`; `data-vs-machine-credit` steigt.
- **Umgesetzt in:** `risk.js:246`

### F-VS-57  Offener Gewinn geht beim Verlassen der Seite nicht verloren
- **Was:** Wer die Seite mitten in einer laufenden Leiter verlässt, bekommt den offenen Gewinn gutgeschrieben statt ihn zu verlieren.
- **Wie ausgelöst:** `pagehide`.
- **Soll-Ergebnis:** Der offene Betrag wird dem Gerätekredit gutgeschrieben und wandert von dort mit dem Gerätekredit in die Kasse zurück (das Abräumen der Risiko-Bedienfelder läuft vor dem der Verrechnung). Doppelt gutschreiben ist baulich ausgeschlossen. Danach steht das Gehäuse im Grundzustand — auch beim Zurückkommen aus dem Vor-/Zurück-Zwischenspeicher spielt niemand eine schon bezahlte Leiter weiter. Gemeldet wird dabei nichts.
- **Vorbedingung:** offener Gewinn > 0
- **Beobachtbar an:** Kassenstand nach dem Seitenwechsel enthält den Betrag; Lichtfelder aus, `data-vs-risk-*` entfernt/zurückgesetzt.
- **Umgesetzt in:** `risk.js:624-642`, `risk-ladder.js:687-700`, `video-slot.js:288-296`

### F-VS-58  Nachziehen des Gewinns bei Serverbuchung (`sync`)
- **Was:** Läuft der QR-Modus (serverseitiges Konto), bestätigt oder berichtigt der Server den verdoppelten Betrag; das Gerät zieht dann **nur** die Gewinnanzeige nach.
- **Wie ausgelöst:** Antwort der Server-Buchung nach einem Treffer (oder, seltener, nach dem Angebot).
- **Soll-Ergebnis:** Es wird **ausschließlich** der Gewinn nachgezogen: kein Licht wechselt, keine Taste wird freigegeben, die Stufe ändert sich nicht, es wird nichts angesagt, und das Risikofeld wird nicht ausgeschaltet. Läuft die Leiter gerade, werden auch die GEWINN-Röhren nachgezogen; steht das Gerät noch im Angebot, wird nur der Messpunkt nachgezogen und die Röhrengruppe bleibt unberührt (sie gehört dann noch dem Spielkern).
- **Vorbedingung:** QR-Modus eingeschaltet (serverseitiges Konto). Im reinen Browserbetrieb tritt dieser Fall nicht auf.
- **Beobachtbar an:** `data-vs-risk-win` ändert sich, während `data-vs-risk-level`, `data-vs-risk-phase`, `data-vs-risk-lit` und die Tastenklassen unverändert bleiben.
- **Umgesetzt in:** `risk.js:428-436,505-527`, `risk-ladder.js:501-530`

---

## Der Auto-Modus

### F-VS-59  AUTO MODE ein- und ausschalten
- **Was:** Eine Taste schaltet um; ist sie an, zieht der Automat nach jeder Auswertung selbst wieder.
- **Wie ausgelöst:** `pointerdown` (oder Enter/Leertaste) auf `.vs-btn[data-vs-button="auto"]`.
- **Soll-Ergebnis:** Beim Einschalten leuchtet die Taste (`vs-btn--lit`), beim Ausschalten wird sie dunkel und eine laufende Pause wird gelöscht (es beginnt kein weiterer Zug).
- **Vorbedingung:** keine
- **Beobachtbar an:** Ereignis `vs:auto` mit `{on, reason:'user', rounds}`; `data-vs-auto="on"|"off"`; Klasse `vs-btn--lit`.
- **Umgesetzt in:** `auto.js:294-342`

### F-VS-60  Selbsttätig gezogene Runde nach rund einer Sekunde
- **Was:** Im Auto-Modus wartet der Automat nach jeder Auswertung rund eine Sekunde und startet dann selbst die nächste Runde.
- **Wie ausgelöst:** `vs:result` der laufenden Runde spannt die Pause (1000 ms), danach wird gezogen.
- **Soll-Ergebnis:** Nach Ablauf der Pause wird `vs:spin` gesendet — **derselbe Weg** wie ein Tastendruck auf START, also mit Würfeln, abbrechbarem `vs:round`, Abbuchung und Veto. Die Walzen halten wie immer von allein bei 1,2 / 1,8 / 2,4 / 3,0 / 3,6 s. Es gibt je Gerät höchstens **einen** laufenden Zeitgeber.
- **Vorbedingung:** Auto-Modus an; der Automat ist frei (`idle` oder `result`). Läuft gerade ein Zug, wird nicht gespannt — dessen `vs:result` spannt dann. Daraus folgt: Einschalten mitten in einem laufenden Zug wirkt ab dem nächsten Zug.
- **Beobachtbar an:** `data-vs-auto-pending` ist `1`, solange die Pause läuft, sonst `0`; `data-vs-auto-rounds` zählt die selbst ausgelösten Züge hoch; Ereignis `vs:spin`.
- **Umgesetzt in:** `auto.js:196,353-413,433-438`

### F-VS-61  Keine Risiko-Leiter im Auto-Modus
- **Was:** Im Auto-Modus wird gar nicht erst angeboten zu riskieren; der Gewinn wird sofort gutgeschrieben.
- **Wie ausgelöst:** Automatisch, wenn nach einem Gewinn das Angebot anstünde.
- **Soll-Ergebnis:** Das abbrechbare `vs:risk` `{phase:'offer'}` wird abgebrochen; RISK blinkt **nicht**; die Verrechnung zahlt den Gewinn sofort aus. Entscheidend ist der Schalterstand im **Augenblick des Angebots**: ist der Auto-Modus zu diesem Zeitpunkt aus, kommt das Angebot wie immer.
- **Vorbedingung:** Auto-Modus an
- **Beobachtbar an:** kein `vs-btn--blink` an RISK; `data-vs-risk-phase` bleibt `off`; `vs:collect` unmittelbar nach `vs:result`.
- **Umgesetzt in:** `auto.js:454-459`, `risk.js:317-321`

### F-VS-62  Einschalten, während RISK blinkt oder die Leiter läuft
- **Was:** Wer den Auto-Modus einschaltet, während ein Gewinn offen ist, bekommt ihn gutgeschrieben statt ihn zu verlieren.
- **Wie ausgelöst:** AUTO MODE drücken, während RISK blinkt oder die Leiter läuft.
- **Soll-Ergebnis:** Beim Einschalten wird **immer** `vs:riskcollect` gesendet: ein offener Gewinn — auch ein bereits mehrfach verdoppelter — wird gutgeschrieben und die Leiter entfällt. Im Grundzustand ist das Ereignis wirkungslos.
- **Vorbedingung:** keine
- **Beobachtbar an:** `vs:riskcollect`, danach `vs:risk` `{phase:'collect'}` und `vs:collect`; `data-vs-machine-credit` steigt.
- **Umgesetzt in:** `auto.js:316-323`, `risk.js:246`

### F-VS-63  Selbstabschaltung bei zu geringem Gerätekredit
- **Was:** Reicht der Gerätekredit für den nächsten Zug nicht mehr, schaltet sich der Auto-Modus selbst ab.
- **Wie ausgelöst:** Der selbst ausgelöste Zug kommt nicht zustande (die Verrechnung sagt ab) — oder er scheitert aus irgendeinem anderen Grund.
- **Soll-Ergebnis:** Der Auto-Modus schaltet ab, die Taste wird dunkel, es wird keine weitere Runde versucht. Eine eigene Meldung gibt es dafür nicht — die Verrechnung hat im selben Augenblick bereits **GUTHABEN ZU GERING** gezeigt.
- **Vorbedingung:** Auto-Modus an; Gerätekredit < Einsatz
- **Beobachtbar an:** Ereignis `vs:auto` mit `{on:false, reason:'insufficient', rounds}`; `data-vs-auto="off"`.
- **Umgesetzt in:** `auto.js:399-409,333-342`

### F-VS-64  Handbedienung während des Auto-Modus
- **Was:** START, STOP, RISK und REWARD verhalten sich im Auto-Modus unverändert.
- **Wie ausgelöst:** Tastendruck während des Auto-Modus.
- **Soll-Ergebnis:** STOP verkürzt die Runde (der nächste `vs:result` spannt einfach früher). START während der Pause startet eine zusätzliche Runde; feuert der Zeitgeber dann in einen laufenden Zug, wird nichts getan und **nicht** abgeschaltet. RISK und REWARD sind wirkungslos, weil die Leiter im Grundzustand steht.
- **Vorbedingung:** Auto-Modus an
- **Beobachtbar an:** `data-vs-auto` bleibt `on`; `data-vs-auto-rounds` steigt nur bei selbst ausgelösten Zügen.
- **Umgesetzt in:** `auto.js:380-413`

### F-VS-65  Auto-Modus beim Verlassen der Seite
- **Was:** Beim Verlassen der Seite hört der Auto-Modus auf, ohne noch etwas zu melden.
- **Wie ausgelöst:** `pagehide`.
- **Soll-Ergebnis:** Der Zeitgeber wird gelöscht, alle Zuhörer abgemeldet, die Taste dunkel. Es wird **kein** `vs:auto` gesendet.
- **Vorbedingung:** keine
- **Beobachtbar an:** `data-vs-auto="off"`, `data-vs-auto-pending="0"`.
- **Umgesetzt in:** `auto.js:488-500`

---

## Der Klang

Die Klangerzeugung selbst liegt im Site Package (`sound.js`, `sound-kit.js`,
`idle-noise.js`); `sound.js` dieser Extension sagt nur, **wann welcher Klang** kommt.
Es hört ausschließlich zu, ändert keinen Spielzustand und bricht kein Ereignis ab.

### F-VS-66  Ton-Schalter am Gehäuse
- **Was:** Ein Kippschalter in der Sockelreihe schaltet den Ton an und aus.
- **Wie ausgelöst:** `click` auf `.vs-sound[data-vs-sound]` — bewusst `click`, also auch mit Enter und Leertaste.
- **Soll-Ergebnis:** Der Ton ist laut Konzept standardmäßig **ein**, deshalb steht im ausgelieferten HTML schon `vs-sound--on` und `aria-pressed="true"`. Beim **Einschalten** bestätigt ein Relaisklack mit Pip, dass der Ton läuft; beim **Ausschalten** klingt nichts (der letzte Ton wäre sonst ausgerechnet der, den man abstellen wollte). Der Ton-Schalter schaltet alles ab, Leerlaufgeräusche eingeschlossen. Schaltet eine andere Registerkarte um, folgt dieser Schalter (auch `aria-pressed`).
- **Vorbedingung:** keine
- **Beobachtbar an:** Klasse `vs-sound--on` und `aria-pressed` am Schalter; `data-vs-sound-state="on"|"off"`.
- **Umgesetzt in:** `sound.js:886-906,1001-1030`, `Machine/Cabinet.html:205-210`

### F-VS-67  Ton wird erst nach einer echten Nutzergeste freigeschaltet
- **Was:** Vor der ersten echten Bedienung entsteht gar kein Tonkontext (Browser-Regel gegen unerwünschtes Autoplay).
- **Wie ausgelöst:** Erstes echtes `pointerdown` **oder** `click` am Gehäuse — der Tastaturweg zählt ausdrücklich mit, damit ein Spieler ohne Zeigergerät nicht dauerhaft stumm bleibt. Nachgemachte Ereignisse zählen nicht (`isTrusted`).
- **Soll-Ergebnis:** Danach ist der Ton freigeschaltet und die Leerlaufgeräusche beginnen.
- **Vorbedingung:** Ton eingeschaltet
- **Beobachtbar an:** `data-vs-sound-context` (Zustand des Tonkontexts) wechselt; `data-vs-sound-played` beginnt zu zählen.
- **Umgesetzt in:** `sound.js:367-390`

### F-VS-68  Startklang und Laufgeräusch
- **Was:** Beim Anlaufen zieht ein Relais an und die Anzeige läuft hoch; solange die Walzen laufen, klingt ein dichtes, trockenes Laufgeräusch.
- **Wie ausgelöst:** `vs:state` mit `to === 'spinning'` (Startklang und Beginn des Laufgeräuschs), `to === 'evaluating'` (Ende).
- **Soll-Ergebnis:** Der Startklang kommt **genau einmal je wirklich zustande gekommener Runde** — auch beim selbst ausgelösten Zug des Auto-Modus, aber **nicht** bei einer abgelehnten Runde. Das Laufgeräusch ist ein sich selbst neu spannender Zeitgeber mit 60 ms Abstand, höchstens einer je Gerät.
- **Vorbedingung:** Ton an; Runde kam zustande
- **Beobachtbar an:** `data-vs-sound-played` steigt; `data-vs-sound-keys` enthält die Klangschlüssel.
- **Umgesetzt in:** `sound.js:176,392-443,959-1000`

### F-VS-69  Walzenstopp — fünf unterscheidbare Tonhöhen
- **Was:** Jede stillstehende Walze klingt anders; je weiter rechts, desto tiefer.
- **Wie ausgelöst:** `vs:reelrest` je Walze.
- **Soll-Ergebnis:** Grundton fallend von Walze 1 bis 5: Start **360 / 330 / 300 / 275 / 250 Hz**, jeweils absackend auf 160 / 150 / 140 / 130 / 120 Hz. Dazu drei hörbare Anteile in dieser Reihenfolge: der Klick der einschnappenden Klinke (5 ms), das Einfallen des Werks, der dumpfe Aufschlag (8 ms versetzt).
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `stop-1` … `stop-5`.
- **Umgesetzt in:** `sound.js:444-467`

### F-VS-70  Gewinn-Jingle in vier Stufen
- **Was:** Ein gewonnener Zug klingt, und zwar umso größer, je größer der Gewinn.
- **Wie ausgelöst:** `vs:result` mit `detail.factor ≥ 1`; gestaffelt nach dem **Faktor**, nicht nach dem Betrag.
- **Soll-Ergebnis:** Vier Stufen:
  | Faktor | Stufe | Klang |
  |---|---|---|
  | 1 … 4 | `klein` | eine einzelne größere Münze, die in eine Schale fällt und ausrollt — kein Tonfolgen-Jingle. Der mit Abstand häufigste Klang, deshalb zurückhaltend. |
  | 5 … 17 | `mittel` | vier aufsteigende Töne (740 / 988 / 1175 / 1480 Hz), rund 0,42 s |
  | 18 … 99 | `gross` | sechs aufsteigende Töne (587 … 1760 Hz) mit Rauschglanz, rund 0,79 s |
  | ab 100 | `jackpot` | Lauf, drei Schläge und ein gehaltener Ton, rund 1,5 s |
  Ein Zug ohne Gewinn klingt gar nicht.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `win-klein` | `win-mittel` | `win-gross` | `win-jackpot`.
- **Umgesetzt in:** `sound.js:210-217,475-572`

### F-VS-71  Kassenklingel und Münzkaskade bei der Gutschrift
- **Was:** Wird ein Gewinn gutgeschrieben, klingelt die Kasse und danach fallen Münzen.
- **Wie ausgelöst:** `vs:collect` mit `credited > 0`.
- **Soll-Ergebnis:** Gestaffelt nach der **Stellenzahl** des tatsächlich gutgeschriebenen Betrags (nicht nach dem Anspruch): 1–9 → klein, ab 10.000 → größte Stufe. Die Münzen fallen 0,13 s **nach** der Glocke. Fällt die Gutschrift mit einem Jingle zusammen (Auto-Modus), wird die Kaskade **hinter** das Ende des Jingles gelegt, damit sich nichts überlagert. Bei `credited === 0` klingt gar nichts — dann sagt das Meldungsschild „KONTO VOLL".
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `collect` und `collect-coins`.
- **Umgesetzt in:** `sound.js:594-643`

### F-VS-72  Münzeinwurf und zwei verschiedene Absagen
- **Was:** Der Einwurf klingt; eine abgelehnte Münze und ein abgelehnter Zug klingen hörbar **verschieden**.
- **Wie ausgelöst:** `vs:coin` (Einwurf) bzw. `vs:round` mit abgesagter Runde (am Dokument, in der Blasenphase abgehört).
- **Soll-Ergebnis:**
  - angenommener Einwurf → Münzklang, die Münze verschwindet in einem Schacht (kein Ausrollen);
  - **Absage 1** (Münze abgelehnt, `reason ≠ 'ok'`) → zwei dumpfe Anschläge, tief, kein Metall; Mindestabstand 250 ms, damit keine Salve entsteht;
  - **Absage 2** (Zug abgelehnt, z. B. GUTHABEN ZU GERING) → ein einzelner tiefer Anschlag;
  - **dritter Fall**: START während der laufenden Risiko-Leiter bleibt **stumm** (das Ereignis erreicht den Klang gar nicht).

  Beide hörbaren Absagen haben stets eine sichtbare Entsprechung am Meldungsschild — der Klang ist Zugabe, nie die einzige Auskunft.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `coin`, `coin-refused` bzw. `round-refused`.
- **Umgesetzt in:** `sound.js:645-691,773-790`

### F-VS-73  Auszahlungsklang bei CASH OUT
- **Was:** Die Auszahlung klingt nach Schale und fallenden Münzen.
- **Wie ausgelöst:** `vs:cashout` mit `moved > 0`.
- **Soll-Ergebnis:** Ein Blechklang (Schale) und 0,10 s später eine Münzkaskade — etwas mehr Münzen und minimal tiefer als bei einer einzelnen Gutschrift, weil hier der ganze Gerätekredit ausgeschüttet wird. Bei `moved === 0` klingt nichts.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `cashout-tray` und `cashout`.
- **Umgesetzt in:** `sound.js:723-754`

### F-VS-74  Zählklang der GUTHABEN-Röhren
- **Was:** Zählt das Guthaben sichtbar hoch, klingt jeder Schritt.
- **Wie ausgelöst:** `vs:count` mit `display === 'guthaben'` und `direction === 'up'`.
- **Soll-Ergebnis:** Ein kurzer Ton je sichtbarem Zählschritt auf einer pentatonischen Leiter über dem Grundton 880 Hz. **Nur aufwärts** — eine Fahrt nach unten (Einsatz, Auszahlung) hat schon ihren eigenen Klang. Der Klang hängt an der sichtbaren Fahrt, nicht an einer vorausgeplanten Folge.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `count`; `vs:count`-Ereignisse.
- **Umgesetzt in:** `sound.js:219-241,692-722`

### F-VS-75  Klänge der Risiko-Leiter
- **Was:** Blinken, Treffer und Fehlgriff der Leiter klingen je eigen.
- **Wie ausgelöst:** `vs:risktick` mit `on === true` (Blinkton), `vs:risk` mit `phase === 'hit'` bzw. `'miss'`.
- **Soll-Ergebnis:**
  - **Blinkton:** ein kurzer Pip von 30 ms bei jedem Aufleuchten; **rechts 1480 Hz, links 1245 Hz** — die Seite ist also hörbar. Auf jeder Stufe wechselt das Feld zehnmal je Sekunde, davon tragen fünf Wechsel einen Pip.
  - **Treffer:** zwei aufsteigende Töne (880 Hz, dann 1480 Hz).
  - **Fehlgriff:** ein abfallender Sägezahnton von 300 auf 70 Hz über 0,45 s mit dumpfem Rauschanteil.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `risktick`, `riskhit`, `riskmiss`.
- **Umgesetzt in:** `sound.js:791-865`

### F-VS-76  Schaltklang der AUTO-Taste
- **Was:** Das Umlegen des Auto-Modus klingt wie ein Relais.
- **Wie ausgelöst:** `vs:auto`.
- **Soll-Ergebnis:** Ein kurzer Relaisknack, danach ein Ton — **beim Einschalten 260 Hz, beim Ausschalten 190 Hz**, also hörbar unterscheidbar.
- **Vorbedingung:** Ton an
- **Beobachtbar an:** `data-vs-sound-keys` enthält `auto`.
- **Umgesetzt in:** `sound.js:866-885`

### F-VS-77  Leerlaufgeräusche und ihr Zurücktreten
- **Was:** Steht das Gerät still, brummt und tickt es leise; arbeitet es, schweigt das vollständig.
- **Wie ausgelöst:** Beginnt nach der ersten Nutzergeste; tritt zurück bei den Rundenzuständen `spinning`, `stopping`, `evaluating` und bei laufender Risiko-Leiter (ab `vs:risk` `phase:'start'` bis `miss`/`collect`/`end`).
- **Soll-Ergebnis:** Im Zustand `result` und während des blinkenden Angebots lebt das Gerät wieder hörbar; im Arbeiten und in der laufenden Leiter ist es still. Je Gehäuse eigene Leerlaufgeräusche — zwei Automaten auf einer Seite brummen getrennt.
- **Vorbedingung:** Ton an, Geste erfolgt
- **Beobachtbar an:** `data-vs-sound-sustained` (Zahl der Dauerklänge); nach dem Abräumen muss dort 0 stehen.
- **Umgesetzt in:** `sound.js:186-194,392-443,791-812`

### F-VS-78  Verstecktes Browserfenster
- **Was:** Wird das Fenster versteckt, verstummt der Automat; beim Zurückkommen klingt er weiter.
- **Wie ausgelöst:** `visibilitychange`.
- **Soll-Ergebnis:** Bei `hidden` wird das Laufgeräusch gelöscht, alle Stimmen werden abgebrochen und die Leerlaufgeräusche samt ihrem Zeitgeber gestoppt. Bei der Rückkehr läuft das Laufgeräusch nur dann wieder an, wenn die Walzen noch laufen; die Leerlaufgeräusche werden neu angelegt.
- **Vorbedingung:** keine
- **Beobachtbar an:** `data-vs-sound-*` Messwerte; `data-vs-sound-sustained` fällt auf 0.
- **Umgesetzt in:** `sound.js:908-958`

### F-VS-79  Messpunkte des Klangs am Gehäuse
- **Was:** Der Klangzustand ist von außen ablesbar, weil sich ein Ton nicht ansehen lässt.
- **Wie ausgelöst:** Jede echte Bedienung und jeder Klangvorgang schreiben sie fort.
- **Soll-Ergebnis:** Am `.vs-machine` stehen `data-vs-sound-state` (`on`/`off`), `-context`, `-played` (gestartete Stimmen), `-peak-voices`, `-dropped`, `-gap`, `-level` (Ausschlag), `-sustained`, `-sustain-dropped` und `-keys` (Zähler je Klangschlüssel als JSON).
- **Vorbedingung:** keine
- **Beobachtbar an:** ebendiese `data-`Attribute.
- **Umgesetzt in:** `sound.js:1039-1058`

---

## Kleinere sichtbare Rückmeldungen

### F-VS-80  Zündvorgang der Nixie-Röhren beim Ziffernwechsel
- **Was:** Wechselt eine Röhre ihre Ziffer, gibt es kurz einen Helligkeitseinbruch, wie bei einer echten Nixie.
- **Wie ausgelöst:** Jeder Ziffernwechsel in einer Röhrengruppe.
- **Soll-Ergebnis:** Die betroffene Röhre bekommt kurz die Klasse `vs-nixie--strike` (200 ms), mit einer Sperre gegen zu schnelle Wiederholung.
- **Vorbedingung:** keine
- **Beobachtbar an:** Klasse `vs-nixie--strike` an der Röhre.
- **Umgesetzt in:** `nixie.js:49,195-211`, `machine.css:555`

### F-VS-81  Gedrückte Taste ist sichtbar
- **Was:** Solange eine Taste gedrückt gehalten wird, fährt die Kappe sichtbar ein.
- **Wie ausgelöst:** `pointerdown` auf einer Spieltaste; die Klasse geht bei `pointerup`, `pointercancel` und `pointerleave` wieder ab.
- **Soll-Ergebnis:** `vs-btn--pressed` an den Tasten der Bedienleiste, `vs-start--pressed` an START. Der Tastaturweg löst die Handlung aus, ohne die Kappe einzufahren.
- **Vorbedingung:** keine
- **Beobachtbar an:** Klassen `vs-btn--pressed` / `vs-start--pressed`.
- **Umgesetzt in:** `press.js:521-558`

### F-VS-82  Sichtbarer Fokusrahmen auf jedem Bedienteil
- **Was:** Wer mit der Tastatur navigiert, sieht, wo er gerade ist.
- **Wie ausgelöst:** Tabulatortaste.
- **Soll-Ergebnis:** Jedes Bedienteil bekommt über eine einzige Regel `.vs-cabinet :focus-visible` einen sichtbaren Rahmen.
- **Vorbedingung:** keine
- **Beobachtbar an:** nur mit dem Auge.
- **Umgesetzt in:** `Resources/Public/Css/machine.css`

### F-VS-83  Gewinnplan- und Feldgeometrie werden beim Rendern grob geprüft
- **Was:** Beim Aufbau der Seite prüft der Server, dass Feldgröße, Symbolnamen und Gewinnlinien überhaupt stimmig sind.
- **Wie ausgelöst:** Jeder Seitenaufruf mit dem Inhaltselement.
- **Soll-Ergebnis:** Bei falscher Feldgröße, unbekanntem Symbolnamen, unmöglicher Gewinnlinie oder einem Band, das nicht zur Grundstellung passt, wird der Aufbau abgebrochen statt stillschweigend etwas Falsches zu zeichnen. Die inhaltliche Prüfung (Quote, Symbolverteilung) gehört dagegen den Prüfskripten und läuft **nicht** bei jedem Seitenaufruf.
- **Vorbedingung:** keine
- **Beobachtbar an:** Fehlerseite statt gezeichnetem Gehäuse.
- **Umgesetzt in:** `Classes/DataProcessing/CabinetProcessor.php:266-420`

### F-VS-84  QR-Modus: das Gerät kennt den Schalter nicht
- **Was:** Ist der QR-Modus eingeschaltet, laufen Kasse und Gerätekredit dieses Automaten über den Server statt über den Browserspeicher — ohne dass an dieser Extension etwas geändert wurde.
- **Wie ausgelöst:** Schalterstellung des QR-Modus im Site Package (`account-backend.js`); der Automat ruft nur die Kassen-Schnittstelle auf (`credit.js`, `machine-credit.js`).
- **Soll-Ergebnis:** Für den Spieler ändert sich am Gerät nichts. Zwei Wirkungen sind dennoch an diesen Schalter gebunden: der `sync`-Nachzug der Gewinnanzeige in der Risiko-Leiter (F-VS-58) tritt **nur** im Servermodus auf, und die Meldung **RUNDE UNGÜLTIG** (F-VS-40) ist nur dort erreichbar. Verliert das Gerät mitten im Spiel die Verbindung, erscheint die Sperranzeige des Site Package; solange sie steht, wird nichts gebucht und nichts weitergerechnet.
- **Vorbedingung:** QR-Modus an
- **Beobachtbar an:** `data-vs-risk-win` ändert sich ohne Stufenwechsel; Meldung „RUNDE UNGÜLTIG"; die Sperranzeige des Site Package.
- **Umgesetzt in:** `risk.js:428-436,505-527`, `wallet.js` (`onResult`); die Umschaltstelle selbst liegt in `casino_startpage/Resources/Public/JavaScript/account-backend.js` (nicht in dieser Extension)

---

## Beobachtungen, nicht bewertet

- Die README beschreibt unter „Spielkern" acht ES-Module und sagt, `paytable.js` stamme „aus Phase 6b"; im Ordner liegen inzwischen 17 Module — die spätere Aufzählung „Neun weitere ES-Module" ergänzt das, die erste Tabelle allein ist also unvollständig.
- Die README nennt in der Tabelle „Vier DOM-Ereignisse am Gehäuse" zuerst vier Ereignisse und weiter unten dieselbe Liste um neun weitere erweitert; beide Tabellen stehen unverändert nebeneinander.
- Die README nennt den Tastenhelfer an einer Stelle „`wirePressButton()` in `machine.js`" und an anderer Stelle „`wirePressButton()` in `press.js`". Im Quelltext liegt er in `press.js` und wird von `machine.js`, `risk.js` und `auto.js` importiert.
- Der Dateikopf von `payout.js` beschreibt als dritten Weg „Hebel ziehen"; dieses Gerät hat ausdrücklich keinen Hebel, sondern die START-Taste.
- `Classes/Rules.php` führt für alle Symbole außer Kirsche und Scatter einen Eintrag `2 => null`; `paytable.js` lässt diese Einträge weg. Die README-Tabelle zeigt an dieser Stelle „–".
- Die README nennt als Kommentar in `payout.js` „rund 81 % der Runden" ohne Gewinn, abgeleitet aus der Trefferhäufigkeit 0,192662; an anderer Stelle in `sound.js` steht „36 % aller Züge" für kleine Beträge. Beide Zahlen stehen unkommentiert nebeneinander.
- Die Zeitwerte der Risiko-Leiter (Seitendauer 200 ms, Trefferfenster je Stufe) stammen vollständig aus `casino_startpage`; diese Extension enthält dazu keine einzige Zahl. Ein Prüfer, der die Tabelle in F-VS-48 nachrechnen will, findet die Formel dort, nicht hier.
- `message.js` kennt sechs Meldungen; `machine.js` und `video-slot.js` rufen davon nur `norng` auf, alle übrigen werden von `wallet.js`, `coinslot.js` und `bank.js` gesetzt.

---

<!-- ===================== craps ===================== -->

# Funktionsinventur: `craps`

Der vierte Spieltisch des Casino Kunterbunt: eine Wanne mit zwei selbst gezeichneten
Würfeln, ein Tuch mit 48 Wettfeldern, der Craps-Rundenablauf mit Come-out und Point,
Auszahlungen, Klang — und seit Umsetzungsstück D5-3 ein Anschluss an die QR-Lobby.
Die gesamte Spiellogik läuft im Browser; serverseitig wird nur das Tuch gezeichnet.

Quellen: Quelltext unter `typo3conf/ext/craps/`, `README.md` derselben Extension.
Stand der Extension laut `ext_emconf.php`/README: 0.5.0 (alpha).

---

## Rückseite: Inhaltselement und Anmeldung

### F-CRAPS-1  Inhaltselement „Craps" anlegen
- **Was:** Ein Redakteur legt auf einer Seite das Inhaltselement „Craps" an; damit steht der Spieltisch auf dieser Seite.
- **Wie ausgelöst:** Backend → Seite → „Neues Inhaltselement" → Gruppe der Casino-Elemente → „Craps". Es gibt **keine** Einstellungsfelder; man speichert nur.
- **Soll-Ergebnis:** Auf der Seite rendert `tt_content.craps` als FLUIDTEMPLATE mit `Resources/Private/ContentElements/Table.html`; im Frontend erscheint Wanne, Tuch, Bedienleiste und Wurfleiste. Keine eigene Datenbankspalte, keine `ext_tables.sql`.
- **Vorbedingung:** Extension aktiviert; `casino_startpage` >= 0.5.0 vorhanden.
- **Beobachtbar an:** Spalte `tt_content.CType` = `craps`; im Frontend das Wurzelelement `[data-ck-table]`; im Backend Icon `content-craps` (`Resources/Public/Icons/ContentCraps.svg`).
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:26-35`; `ext_localconf.php:71-89`; `Classes/Craps.php:25-63`; `Configuration/Icons.php:14-19`.

### F-CRAPS-2  Kachel im Spielsaal (Anmeldung als Gattung „Tisch")
- **Was:** Der Tisch meldet sich beim Saal an und bekommt dort eine eigene Kachel, über die man zur Spielseite gelangt.
- **Wie ausgelöst:** Ein Inhaltselement „Casino-Automat" auf der Startseite, in dem dieser Tisch gewählt und eine Zielseite angegeben wird.
- **Soll-Ergebnis:** Im Saal steht eine Craps-Kachel; weil `gattung: Gattung::Tisch` angemeldet ist, baut der Saal sie ohne Podest, mit breitem Bodenschatten und querer viewBox (160:100), und in der Backend-Auswahlliste steht das Gerät in der Tisch-Gruppe.
- **Vorbedingung:** Inhaltselement „Casino-Automat" ist angelegt und verweist auf die Craps-Seite.
- **Beobachtbar an:** sichtbare Kachel im Saal; das Gehäuse-Partial `Table/Craps/Cabinet` wird gerendert.
- **Umgesetzt in:** `ext_localconf.php:26-33`; `Resources/Private/Partials/Table/Craps/Cabinet.html`.

### F-CRAPS-3  Beschreibung und strukturierte Daten der Spielseite
- **Was:** Die Craps-Spielseite bekommt automatisch eine Kurzbeschreibung für Suchmaschinen und KI-Crawler sowie einen `Game`-Eintrag in den strukturierten Daten.
- **Wie ausgelöst:** Aufruf der Seite, auf der das Inhaltselement „Craps" liegt (dataProcessing-Schritt 20, `casino-device-description`, `gattung = tisch`).
- **Soll-Ergebnis:** Im `<head>` stehen `<meta name="description">` und ein `<script type="application/ld+json">` mit `@type: Game` — nur auf dieser Seite.
- **Vorbedingung:** keine.
- **Beobachtbar an:** ausgeliefertes HTML im `<head>`.
- **Umgesetzt in:** `ext_localconf.php:78-82` (Schritt `20`), Texte aus `Resources/Private/Language/locallang.xlf` (`automat.title`, `automat.description`).

### F-CRAPS-4  Serverseitige Zeichnung des Tuchs
- **Was:** Die 48 Feldknöpfe des Tuchs samt ihrer Lage im Gitter werden serverseitig vorgerechnet, damit das Tuch auch ohne JavaScript im Markup steht und zwischengespeichert werden kann.
- **Wie ausgelöst:** Seitenaufruf (dataProcessing-Schritt 30, `craps-felt`, Ergebnis unter `{felt}`).
- **Soll-Ergebnis:** Das gelieferte HTML enthält 48 `<button>`-Felder mit Gitterkoordinaten, Aufschrift, erreichbarem Namen, Höchsteinsatz und Einheit; die Lage stammt ausschließlich aus `Classes/BetLayout.php`, nicht aus CSS.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<button data-ck-field="…">` im HTML, Gitterangaben als Inline-Stil; 96 Spalten- und 11 Zeilenspuren.
- **Umgesetzt in:** `Classes/DataProcessing/FeltProcessor.php`; `Classes/BetLayout.php:318-620`; `Resources/Private/Partials/Table/Craps/Felt.html`.

---

## Die Einsatzarten auf dem Tuch (48 Felder, 20 Wettarten)

Alle Felder sind `<button>`-Knöpfe im Tuch-Gitter; gesetzt wird, indem man mit dem
gewählten Chip auf ein Feld tippt oder klickt (Bedienung siehe „Setzen und Abräumen").
Die Quoten stehen als exakte Brüche in `Resources/Public/JavaScript/bets-craps.js`
(`RATIO`) und ein zweites Mal zum Zeichnen in `Classes/BetLayout.php`.
Gemeinsame Grenzen: `ROUND_MAX = 300 €` Gesamteinsatz je Wurf über alle Felder
**außer** den Odds; `LINE_MAX = 100 €` je Linienwette.
„Einheit" heißt: der Nenner der Quote; ein Einsatz, der kein Vielfaches davon ist,
verliert beim Abrunden (`Math.floor`) einen Teil der Auszahlung.

### F-CRAPS-5  Pass Line (`pass`)
- **Was:** Die Grundwette für den Schützen: gewinnt beim Come-out mit 7 oder 11, verliert mit 2, 3, 12; steht danach ein Point, gewinnt sie, wenn der Point vor der 7 wiederkommt.
- **Wie ausgelöst:** Chip auf das Querband „PASS LINE" (Zeile 10, Spuren 65…93, mit Schenkel 93…97).
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €, Einheit 1 €. Zählt in die 300-€-Grenze.
- **Vorbedingung:** **Nur beim Come-out** (kein Point steht). Steht ein Point, wird abgelehnt („Die Pass Line liegt fest, solange der Point steht.") — sie ist ab dann Vertragswette und kann auch nicht mehr zurückgenommen werden (Sockel).
- **Beobachtbar an:** `<button data-ck-field="pass">`, gesetzter Betrag im erreichbaren Namen (`felt.fieldname`); Absage im Live-Bereich `[data-cr-status]` (`round.reject.contract`).
- **Umgesetzt in:** `bets-craps.js:328`; `wagers-craps.js:127-129` (Setzregel), `wagers-craps.js:297-306` (Urteil), `wagers-craps.js:213-215` (Sockel); `BetLayout.php:503-505`.

### F-CRAPS-6  Don't Pass Bar (`dont-pass`)
- **Was:** Die Gegenwette zur Pass Line: gewinnt beim Come-out mit 2 oder 3, verliert mit 7 oder 11, bei 12 Patt („Bar 12"); steht ein Point, gewinnt sie, wenn die 7 vor dem Point fällt.
- **Wie ausgelöst:** Chip auf das Querband „Don't Pass Bar" (Zeile 9, Spuren 65…90, mit Schenkel 90…93).
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €, Einheit 1 €. Bei 12 kommt der Einsatz zurück (Urteil `push`).
- **Vorbedingung:** **Nur beim Come-out**; steht ein Point, Absage `round.reject.contract`. Sie darf aber jederzeit **zurückgenommen** werden (kein Sockel).
- **Beobachtbar an:** `<button data-ck-field="dont-pass">`; doppelter Rahmen als Formunterscheidung zur hellen Seite; Würfelbild 6+6 als Bar-Paar.
- **Umgesetzt in:** `bets-craps.js:329`; `wagers-craps.js:127-129`, `wagers-craps.js:308-318`; `BetLayout.php:500-502`.

### F-CRAPS-7  COME (`come`)
- **Was:** Wie eine Pass Line, aber mitten in der Runde gestartet: gewinnt sofort bei 7 oder 11, verliert bei 2, 3, 12, bei jeder anderen Zahl **wandert** der Einsatz auf den Zahlenkasten dieser Zahl.
- **Wie ausgelöst:** Chip auf das Querband „COME" (Zeile 7, Spuren 65…90).
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €, Einheit 1 €. Beim Wandern Urteil `move` mit Ziel `come-<Summe>`.
- **Vorbedingung:** **Nur bei stehendem Point.** Beim Come-out Absage „Come und Don't Come gehen erst, wenn ein Point steht." (`round.reject.comeout`).
- **Beobachtbar an:** `<button data-ck-field="come">`; nach dem Wurf liegen die Chips sichtbar auf `come-N`.
- **Umgesetzt in:** `bets-craps.js:330`; `wagers-craps.js:132-134`, `wagers-craps.js:331-343`; `BetLayout.php:487-489`.

### F-CRAPS-8  Don't Come Bar (`dont-come`)
- **Was:** Die Gegenwette zu COME: gewinnt bei 2 oder 3, verliert bei 7 oder 11, bei 12 Patt, sonst wandert der Einsatz auf `dont-come-<Summe>`.
- **Wie ausgelöst:** Chip auf den hohen Kasten „Don't Come / Bar" am äußeren Ende der Zahlenreihe (Spuren 85…90, Zeilen 2…7).
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €, Einheit 1 €.
- **Vorbedingung:** **Nur bei stehendem Point** (sonst `round.reject.comeout`).
- **Beobachtbar an:** `<button data-ck-field="dont-come">`, Aufschrift „Don't Come" + „Bar" + Würfelpaar 6+6.
- **Umgesetzt in:** `bets-craps.js:331`; `wagers-craps.js:132-134`, `wagers-craps.js:331-343`; `BetLayout.php:466-474`.

### F-CRAPS-9  Odds hinter der Pass Line (`pass-odds`)
- **Was:** Die Zusatzwette ohne Hausvorteil hinter der eigenen Pass Line: gewinnt, wenn der Point vor der 7 kommt.
- **Wie ausgelöst:** Chip auf den rechten „ODDS"-Kasten der Schulter (Zeile 11, Spuren 79…93).
- **Soll-Ergebnis:** Quote hängt am Point: 4/10 → 2:1, 5/9 → 3:2, 6/8 → 6:5. Hausvorteil 0. Höchsteinsatz nach Staffel 3-4-5×: 3× der Pass-Line-Einsatz bei Point 4/10, 4× bei 5/9, 5× bei 6/8. Einheit = Nenner der Point-Quote (1, 2 bzw. 5).
- **Vorbedingung:** Ein Point muss stehen (sonst `round.reject.nopoint`) **und** es muss eine Pass-Line-Wette liegen (sonst `round.reject.nobase`). Überschreitung der Staffel → `round.reject.oddsmax` mit Nennung des Höchstbetrags.
- **Beobachtbar an:** `<button data-ck-field="pass-odds">`; Absagen im Live-Bereich `[data-cr-status]`. Zählt **nicht** in die 300-€-Grenze (`countsToRoundMax: false`).
- **Umgesetzt in:** `bets-craps.js:332`, `bets-craps.js:166-175` (`oddsMax`); `wagers-craps.js:142-156`, `wagers-craps.js:320-329`; `BetLayout.php:526-528`.

### F-CRAPS-10  Odds hinter Don't Pass (`dont-pass-odds`)
- **Was:** Dasselbe für die dunkle Seite: gewinnt, wenn die 7 vor dem Point kommt.
- **Wie ausgelöst:** Chip auf den linken „ODDS"-Kasten der Schulter (Zeile 11, Spuren 65…79).
- **Soll-Ergebnis:** Quote 4/10 → 1:2, 5/9 → 2:3, 6/8 → 5:6. Hausvorteil 0. Höchsteinsatz so bemessen, dass der mögliche **Gewinn** ebenfalls das Sechsfache der Linienwette ist (12× bei 4/10, 9× bei 5/9, 7,2× bei 6/8).
- **Vorbedingung:** Point steht **und** eine Don't-Pass-Wette liegt. Sonst `round.reject.nopoint` / `round.reject.nobase` / `round.reject.oddsmax`.
- **Beobachtbar an:** `<button data-ck-field="dont-pass-odds">`; zählt nicht in die 300-€-Grenze.
- **Umgesetzt in:** `bets-craps.js:333`; `wagers-craps.js:142-156`, `wagers-craps.js:320-329`; `BetLayout.php:523-525`.

### F-CRAPS-11  Come-Zahlen (`come-4`, `come-5`, `come-6`, `come-8`, `come-9`, `come-10`)
- **Was:** Die sechs äußeren Streifen der Zahlenkästen: hierher **wandert** eine Come-Wette von selbst; sie gewinnt, wenn ihre Zahl vor der 7 wiederkommt.
- **Wie ausgelöst:** **Nicht** durch Setzen — ausschließlich durch das Wandern einer COME-Wette (Urteil `move`).
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €, Einheit 1 €. Ein direkt gelegter Chip wird abgelehnt: „Auf diese Zahl wandert eine Come-Wette von selbst; hier wird nicht gelegt." (`round.reject.traveled`).
- **Vorbedingung:** Nie direkt setzbar. Der gewanderte Betrag liegt danach **fest** (Sockel, keine Rücknahme).
- **Beobachtbar an:** `<button data-ck-field="come-6">` usw. (Zeile 6 jedes Zahlenkastens); Chips erscheinen dort nach dem Wurf.
- **Umgesetzt in:** `bets-craps.js:334`; `wagers-craps.js:138-140` (Absage), `wagers-craps.js:346-356` (Urteil), `wagers-craps.js:216-220` (Sockel); `BetLayout.php:452-456`.

### F-CRAPS-12  Odds hinter einer Come-Zahl (`come-odds-4/5/6/8/9/10`)
- **Was:** Die hausvorteilfreie Zusatzwette unmittelbar an einer Come-Zahl.
- **Wie ausgelöst:** Chip auf den schmalen Streifen direkt unter der großen Zahl (Zeile 5 des Zahlenkastens).
- **Soll-Ergebnis:** Quote 4/10 → 2:1, 5/9 → 3:2, 6/8 → 6:5; Höchsteinsatz nach Staffel 3-4-5× bezogen auf die darunterliegende `come-N`-Wette; Einheit 1, 2 bzw. 5 €. Zählt nicht in die 300-€-Grenze.
- **Vorbedingung:** Auf `come-N` muss bereits ein Einsatz liegen (sonst `round.reject.nobase`); Staffelgrenze (sonst `round.reject.oddsmax`). Ein stehender Point ist hier **nicht** nötig — die Come-Zahl selbst ist die Grundlage.
- **Beobachtbar an:** `<button data-ck-field="come-odds-8">` usw.; dunklerer Tuchton der Odds-Streifen.
- **Umgesetzt in:** `bets-craps.js:335`; `wagers-craps.js:158-172`, `wagers-craps.js:346-356`; `BetLayout.php:446-450`.

### F-CRAPS-13  Don't-Come-Zahlen (`dont-come-4/5/6/8/9/10`)
- **Was:** Die sechs breiten äußeren Streifen oberhalb der Zahl: hierher wandert eine Don't-Come-Wette; sie gewinnt, wenn die 7 vor ihrer Zahl fällt.
- **Wie ausgelöst:** Nicht setzbar — nur durch Wandern einer Don't-Come-Wette.
- **Soll-Ergebnis:** Quote 1 : 1, Höchsteinsatz 100 €. Direktes Legen wird mit `round.reject.traveled` abgelehnt.
- **Vorbedingung:** Nie direkt setzbar. Anders als Come-Zahlen **kein** Sockel — die dunkle Seite darf zurückgenommen werden.
- **Beobachtbar an:** `<button data-ck-field="dont-come-8">` usw. (Zeile 2 des Zahlenkastens), doppelter Rahmen.
- **Umgesetzt in:** `bets-craps.js:336`; `wagers-craps.js:138-140`, `wagers-craps.js:346-356`; `BetLayout.php:425-430`.

### F-CRAPS-14  Odds hinter einer Don't-Come-Zahl (`dont-come-odds-4/5/6/8/9/10`)
- **Was:** Die hausvorteilfreie Zusatzwette der dunklen Seite, unmittelbar über der Zahl.
- **Wie ausgelöst:** Chip auf den schmalen Streifen direkt über der großen Zahl (Zeile 3).
- **Soll-Ergebnis:** Quote 4/10 → 1:2, 5/9 → 2:3, 6/8 → 5:6; Höchsteinsatz so, dass der Gewinn sechsmal die `dont-come-N`-Wette ergibt; Einheit 2, 3 bzw. 6 €. Zählt nicht in die 300-€-Grenze.
- **Vorbedingung:** Auf `dont-come-N` muss ein Einsatz liegen (`round.reject.nobase`); Staffelgrenze (`round.reject.oddsmax`).
- **Beobachtbar an:** `<button data-ck-field="dont-come-odds-5">` usw.
- **Umgesetzt in:** `bets-craps.js:337`; `wagers-craps.js:158-172`; `BetLayout.php:431-436`.

### F-CRAPS-15  Place-Wetten (`place-4/5/6/8/9/10`)
- **Was:** Die Wette auf den großen Zahlenkasten selbst: die Zahl kommt vor der nächsten 7.
- **Wie ausgelöst:** Chip auf den Kasten mit der großen Zahl (Zeile 4; Aufschrift „4", „5", „SIX", „8", „NINE", „10").
- **Soll-Ergebnis:** Quote 4/10 → 9:5, 5/9 → 7:5, 6/8 → 7:6. Höchsteinsatz 100 € (bei 6 und 8: **96 €**, weil Vielfaches von 6). Einheit 5 € (4/5/9/10) bzw. 6 € (6/8); ein krummer Einsatz erzeugt den Hinweis „Volle Auszahlung nur in Schritten von {0} Euro." (`round.hint.unit`) — eine Ansage, **keine** Absage.
- **Vorbedingung:** Jederzeit setzbar. **Sie ruhen beim Come-out immer** (Urteil `stay`) und arbeiten bei stehendem Point nur, wenn der Schalter „Place-Wetten arbeiten" angehakt ist (siehe F-CRAPS-23).
- **Beobachtbar an:** `<button data-ck-field="place-6">` usw.; erreichbarer Name endet auf „ruht beim Come-out".
- **Umgesetzt in:** `bets-craps.js:338`; `wagers-craps.js:175-177`, `wagers-craps.js:358-367`; `BetLayout.php:437-443`.

### F-CRAPS-16  FIELD (`field`)
- **Was:** Eine Einmalwette auf den nächsten Wurf: gewinnt bei 2, 3, 4, 9, 10, 11, 12.
- **Wie ausgelöst:** Chip auf das Querband „FIELD · 3 · 4 · 9 · 10 · 11 ·" (Zeile 8, Spuren 65…90).
- **Soll-Ergebnis:** 1 : 1 auf 3, 4, 9, 10, 11; die eingekreiste **2 zahlt 2 : 1** („PAYS DOUBLE"), die eingekreiste **12 zahlt 3 : 1** („PAYS TRIPLE"). Höchsteinsatz 100 €, Einheit 1 €. Bei jeder anderen Summe verloren.
- **Vorbedingung:** keine — jederzeit setzbar, arbeitet immer.
- **Beobachtbar an:** `<button data-ck-field="field">`; die zwei eingekreisten Sonderfälle im Markup.
- **Umgesetzt in:** `bets-craps.js:339`, `bets-craps.js:215-223` (kontextabhängige Quote); `wagers-craps.js:369-373`; `BetLayout.php:490-499`.

### F-CRAPS-17  Hardways (`hard-4`, `hard-6`, `hard-8`, `hard-10`)
- **Was:** Die Zahl als Pasch, bevor sie „einfach" fällt und bevor die 7 kommt.
- **Wie ausgelöst:** Chip auf einen der vier Hardway-Kästen der Mittensektion (Hard 6 und Hard 10 in Zeile 4, Hard 8 und Hard 4 in Zeile 5). Sie tragen kein Wort, sondern ein Würfelpaar (2+2, 3+3, 4+4, 5+5) und den Zahlenaufdruck.
- **Soll-Ergebnis:** Hard 4 und Hard 10 zahlen 7 : 1 (Aufdruck „8 FOR 1"), Hard 6 und Hard 8 zahlen 9 : 1 (Aufdruck „10 FOR 1"). Höchsteinsatz 10 €, Einheit 1 €. Gewinn nur bei Pasch mit dieser Summe; Verlust bei derselben Summe „einfach" oder bei 7; sonst bleibt die Wette liegen (`stay`).
- **Vorbedingung:** keine — **Hardways arbeiten immer**, auch beim Come-out (Hausregel, eigene Festlegung).
- **Beobachtbar an:** `<button data-ck-field="hard-6">` usw.; Aufdruck „10 FOR 1"/„8 FOR 1"; Würfelbilder aus demselben `<symbol>`-Satz wie die echten Würfel.
- **Umgesetzt in:** `bets-craps.js:340`; `wagers-craps.js:375-382`; `BetLayout.php:553-562`.

### F-CRAPS-18  Seven / Any Seven (`any-seven`)
- **Was:** Einmalwette: die 7 im nächsten Wurf.
- **Wie ausgelöst:** Chip auf den Streifen „Seven" über die volle Breite der Mittensektion (Zeile 3).
- **Soll-Ergebnis:** Zahlt 4 : 1 (Aufdruck „5 FOR 1", links und rechts gedruckt). Höchsteinsatz 10 €. Gewinnt bei Summe 7, sonst verloren.
- **Vorbedingung:** keine, arbeitet immer.
- **Beobachtbar an:** `<button data-ck-field="any-seven">`.
- **Umgesetzt in:** `bets-craps.js:341`; `wagers-craps.js:384-403`; `BetLayout.php:581`.

### F-CRAPS-19  Any Craps (`any-craps`)
- **Was:** Einmalwette: 2, 3 oder 12 im nächsten Wurf.
- **Wie ausgelöst:** Chip auf den Streifen „Any Craps" (Zeile 8 der Mittensektion, volle Breite).
- **Soll-Ergebnis:** Zahlt 7 : 1 (Aufdruck „8 FOR 1", beidseitig). Höchsteinsatz 10 €.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<button data-ck-field="any-craps">`.
- **Umgesetzt in:** `bets-craps.js:342`; `wagers-craps.js:386`; `BetLayout.php:586`.

### F-CRAPS-20  Die Einzelzahlen 2, 3, 11, 12 (`two`, `three`, `eleven`, `twelve`)
- **Was:** Vier Einmalwetten auf genau eine Summe im nächsten Wurf.
- **Wie ausgelöst:** Chip auf einen der drei Drittelkästen der Zeile 6 (die 3 links, die 2 in der Mitte, die 12 rechts) bzw. auf den Streifen der 11 (Zeile 7, volle Breite — die Vorlage druckt ihn zweimal, es ist **ein** Feld mit einem Tabstopp).
- **Soll-Ergebnis:** die 2 zahlt 30 : 1 („31 FOR 1"), die 12 zahlt 30 : 1 („31 FOR 1"), die 3 zahlt 15 : 1 („16 FOR 1"), die 11 zahlt 15 : 1 („16 FOR 1"). Höchsteinsatz je 10 €, Einheit 1 €.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<button data-ck-field="two">` / `"three"` / `"eleven"` / `"twelve"`; Würfelbilder 1+1, 1+2, 6+5 (zweimal), 6+6.
- **Umgesetzt in:** `bets-craps.js:343-346`; `wagers-craps.js:387-390`; `BetLayout.php:582-585`.

### F-CRAPS-21  C & E — Craps und Elf (`craps-eleven`)
- **Was:** Die einzige abgeleitete Wette des Tisches: der Einsatz zählt je zur Hälfte für Any Craps und für die Elf.
- **Wie ausgelöst:** Chip auf die schmale Kreisspalte zwischen Mitten- und Zahlensektion (Spuren 58…61, Zeilen 3…12). Die sieben E/C-Kreispaare der Vorlage sind hier **ein** Feld mit **einem** Tabstopp.
- **Soll-Ergebnis:** Auf den ganzen Einsatz gerechnet: bei 2, 3 oder 12 zahlt sie **3 : 1**, bei der 11 **7 : 1**. Höchsteinsatz 10 €, Einheit 1 € (die Halbierung erzeugt keinen Rundungsverlust). Bei jeder anderen Summe verloren.
- **Vorbedingung:** keine — arbeitet immer, auch beim Come-out.
- **Beobachtbar an:** `<button data-ck-field="craps-eleven">`, sichtbare Buchstaben „E" und „C"; erreichbarer Name beginnt mit „C und E".
- **Umgesetzt in:** `bets-craps.js:349`, `bets-craps.js:253-255`; `wagers-craps.js:395`; `BetLayout.php:613-619`.

### F-CRAPS-22  Was dieser Tisch ausdrücklich nicht anbietet
- **Was:** Big 6 / Big 8 und Buy-/Lay-Wetten gibt es nicht; die Ecke des Tuchs, in der andere Häuser Big 6/8 drucken, bleibt leer.
- **Wie ausgelöst:** entfällt.
- **Soll-Ergebnis:** In den Spuren 61…65 der Zeilen 7…12 liegt kein Feld und kein Knopf.
- **Vorbedingung:** keine.
- **Beobachtbar an:** kein `<button>` an dieser Gitterstelle (Prüfung F-19 belegt es).
- **Umgesetzt in:** `Classes/BetLayout.php:136-145` (Kommentar zu `BAND_COL`); README „Die Wetten und ihre Quoten".

---

## Setzen und Abräumen am Tuch

### F-CRAPS-23  Chip auf ein Feld legen
- **Was:** Der gewählte Chip wird auf ein Wettfeld gelegt; erst wird die Craps-Regel geprüft, dann das Geld gebucht.
- **Wie ausgelöst:** Klick/Tipp/Eingabetaste auf einen der 48 Feldknöpfe (`<button data-ck-field>`), mit dem in der Bedienleiste gewählten Chipwert (1, 5, 20, 25, 100 €).
- **Soll-Ergebnis:** Der Chip liegt sichtbar als Stapel auf dem Feld, der Buy-in-Betrag sinkt um den Chipwert, der erreichbare Name des Feldes nennt den neuen gesetzten Betrag. Bei Regelverstoß wird **nichts** gebucht und die Absage im craps-eigenen Live-Bereich angesagt.
- **Vorbedingung:** Runde im Zustand `setzen` (Tuch nicht gesperrt), genug Buy-in, Feld-Höchsteinsatz und 300-€-Rundengrenze nicht überschritten, und die feldspezifische Bedingung aus F-CRAPS-5 bis F-CRAPS-21 erfüllt.
- **Beobachtbar an:** `[data-cr-status]` mit dem Absagetext; geteilter Ansagebereich `[data-ck-table-status]` für die Chip-Meldungen; `data-cr-total` unverändert bei Absage; Klang `cr-chip-place`.
- **Umgesetzt in:** `Resources/Public/JavaScript/craps.js:457-473` (`onPlace`), `craps.js:288-300` (`absageSatz`); Regeln in `wagers-craps.js:121-179`.

### F-CRAPS-24  Chip zurücknehmen
- **Was:** Der oberste Chip eines Feldes wird wieder heruntergenommen und dem Buy-in gutgeschrieben.
- **Wie ausgelöst:** Zweite Bedienung desselben Feldes im Rücknahme-Weg des geteilten Bausteins (`table-felt.js` → `onTakeBack`).
- **Soll-Ergebnis:** Chipstapel schrumpft, Buy-in steigt, Klang `cr-chip-remove`.
- **Vorbedingung:** Runde im Zustand `setzen`. **Nicht möglich bis zur Höhe eines Sockels**: eine Pass Line bei stehendem Point und jede bereits gewanderte Come-Wette sind festgelegt (Meldung `frozen` aus dem geteilten Ansagebereich).
- **Beobachtbar an:** Chipstapel im Markup; `data-cr-total` bleibt gleich (Geld wandert nur zwischen Tuch und Buy-in).
- **Umgesetzt in:** `craps.js:475-479`; Sockel: `round-craps.js:302-312`, `wagers-craps.js:210-222`.

### F-CRAPS-25  Schalter „Place-Wetten arbeiten"
- **Was:** Ein Kontrollkästchen, das bestimmt, ob die Place-Wetten mitspielen, solange ein Point steht.
- **Wie ausgelöst:** Kontrollkästchen unter dem Tisch, standardmäßig **angehakt**.
- **Soll-Ergebnis:** Angehakt → Place-Wetten gewinnen bei ihrer Zahl und verlieren bei der 7. Nicht angehakt → sie bleiben bei jedem Wurf liegen (`stay`). **Beim Come-out ruhen sie unabhängig vom Schalter immer.**
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-cr-place-working]` mit `checked`; die Urteile im Verlauf (Chips bleiben liegen statt abgeräumt zu werden); erläutert durch `#cr-working-hint`.
- **Umgesetzt in:** `Resources/Private/ContentElements/Table.html:155-164`; `craps.js:227-229` (`placeArbeitet`); `round-craps.js:239`; `wagers-craps.js:358-367`.

### F-CRAPS-26  Sprunglink über das Tuch
- **Was:** Ein Link am Anfang des Tuchs, der die 48 Feldknöpfe überspringt und direkt zur Bedienleiste führt.
- **Wie ausgelöst:** Tabulator auf den Sprunglink, dann Eingabetaste.
- **Soll-Ergebnis:** Der Fokus springt auf `#cr-controls`; der Link ist nur bei `:focus-visible` sichtbar.
- **Vorbedingung:** Tastaturbedienung.
- **Beobachtbar an:** `.ck-skiplink.cr-felt__skip` im Markup, Ziel `#cr-controls` (`Table.html:174`).
- **Umgesetzt in:** `Resources/Private/Partials/Table/Craps/Felt.html`; Text `felt.skip`.

### F-CRAPS-27  Gezeichnete Gegenseite (nicht bespielbar)
- **Was:** Die linke Tischhälfte zeigt dasselbe Bild spiegelverkehrt — nur Zeichnung, kein zweites Bedienteil; davor steht eine sichtbare Erklärung.
- **Wie ausgelöst:** entfällt (rein sichtbar).
- **Soll-Ergebnis:** Kein Tabstopp, kein Klickziel: `aria-hidden="true"` und `pointer-events: none`. Der Satz „Nur gezeichnet: dorthin fliegen die Würfel. Gesetzt wird auf der rechten Tischseite." steht sichtbar davor.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `.cr-felt__mirror-hint` im Markup; gespiegelte Felder ohne `<button>`.
- **Umgesetzt in:** `Table.html:106-109`; `Felt.html`; `BetLayout.php:360-368` (`mirrorCol`).

### F-CRAPS-28  Waagerechter Rollbereich des Tisches
- **Was:** Auf schmalem Bildschirm wird der Tisch gerollt statt verkleinert.
- **Wie ausgelöst:** Fensterbreite unter rund 1382 Bildpunkten; waagerechtes Rollen im Tischkasten.
- **Soll-Ergebnis:** Nur `.cr-cloth__scroll` rollt, die Seite selbst nicht; an den Rändern zeigt eine Kante an, dass es weitergeht.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `overflow-x: auto` an `.cr-cloth__scroll`; `.cr-cloth__frame` mit den Kanten-Pseudoelementen.
- **Umgesetzt in:** `Table.html:125-139`; `Resources/Public/Css/felt.css`.

---

## Der Rundenablauf: Come-out, Point, Seven-out

Ein Rundendurchlauf des geteilten Zustandswerks (`setzen → gesperrt → laeuft →
auswerten → auszahlen → setzen`) entspricht am Craps-Tisch **genau einem Wurf**.
Was über den Wurf hinaus lebt, ist der Point.

### F-CRAPS-29  Come-out-Wurf
- **Was:** Solange kein Point steht, ist jeder Wurf ein Come-out: 7 oder 11 ist ein „Natural", 2, 3 oder 12 ist „Craps", jede andere Summe setzt den Point.
- **Wie ausgelöst:** Ein Wurf (Taste „Würfel werfen" oder Werfen mit der Hand), während `data-cr-point` leer ist.
- **Soll-Ergebnis:** Bei 7/11 gewinnt Pass Line, Don't Pass verliert; bei 2/3 gewinnt Don't Pass, Pass Line verliert; bei 12 verliert Pass Line und Don't Pass ist Patt (Einsatz zurück); bei 4, 5, 6, 8, 9, 10 wird der Point gesetzt und beide Linienwetten bleiben liegen. Ansage nennt beide Augenzahlen, die Summe und den Ausgang.
- **Vorbedingung:** Es muss ein Einsatz auf Pass Line **oder** Don't Pass liegen — sonst Absage „Für den Come-out braucht es einen Einsatz auf Pass Line oder Don't Pass."
- **Beobachtbar an:** `data-cr-round` durchläuft die fünf Zustände; `data-cr-sum`, `data-cr-die-a`, `data-cr-die-b`; Ansage `round.announce.natural` / `.craps` / `.pointset`; Verlaufsstreifen-Eintrag mit Ton `win`/`loss`/`event`.
- **Umgesetzt in:** `wagers-craps.js:243-261`; `round-craps.js:152-160` (`mayThrow`); `craps.js:302-313` (`ereignisSatz`).

### F-CRAPS-30  Point setzen und der Puck
- **Was:** Fällt beim Come-out eine 4, 5, 6, 8, 9 oder 10, wird diese Zahl zum Point; der Puck wandert über den zugehörigen Zahlenkasten.
- **Wie ausgelöst:** Automatisch als Ergebnis des Come-out-Wurfs.
- **Soll-Ergebnis:** `data-cr-point` trägt die Zahl, der Puck springt in die Spur dieses Zahlenkastens (er gleitet nicht, sondern springt), der sichtbare Text lautet „Der Point steht auf {0}.", die Pass-Line-Wette ist ab jetzt festgelegt (Sockel), Come/Don't Come werden setzbar, Odds hinter der Linie werden setzbar, Place-Wetten beginnen zu arbeiten (falls der Schalter an ist). Klang `cr-puck`.
- **Vorbedingung:** Come-out-Wurf mit einer Point-Zahl.
- **Beobachtbar an:** `data-cr-point` = `"6"` o. ä. am Wurzelelement (einziger Schreiber `craps.js`); `.cr-round__point` als gewöhnlicher Text; Puck über `grid-column` in `felt.css`.
- **Umgesetzt in:** `craps.js:408-415`; `wagers-craps.js:251-253`; `BetLayout.php:731-745` (`puckLanes`).

### F-CRAPS-31  Point fällt (Point made)
- **Was:** Kommt der Point noch einmal, bevor die 7 fällt, ist er „gefallen": Pass Line gewinnt, die Runde beginnt wieder mit einem Come-out.
- **Wie ausgelöst:** Wurf mit der Summe des stehenden Points.
- **Soll-Ergebnis:** Pass Line und ihre Odds gewinnen, Don't Pass und deren Odds verlieren, der Point wird gelöscht, der Puck geht zurück auf „OFF", der Sockel der Pass Line wird gelöscht. Ansage „Der Point ist gefallen, Pass Line gewinnt."
- **Vorbedingung:** Ein Point steht.
- **Beobachtbar an:** `data-cr-point` wird leer; Ansage `round.announce.pointmade`; Verlaufseintrag mit Ton `win`.
- **Umgesetzt in:** `wagers-craps.js:255-257`, `wagers-craps.js:302`, `wagers-craps.js:320-329`; `round-craps.js:285-313` (Sockel neu setzen).

### F-CRAPS-32  Seven-out
- **Was:** Fällt bei stehendem Point eine 7, ist die Serie zu Ende: fast alles auf dem Tuch verliert.
- **Wie ausgelöst:** Wurf mit Summe 7 bei stehendem Point.
- **Soll-Ergebnis:** Pass Line, Pass-Odds, alle Come-Zahlen und deren Odds sowie alle arbeitenden Place-Wetten verlieren; Don't Pass, Don't-Pass-Odds, alle Don't-Come-Zahlen und deren Odds gewinnen; Hardways verlieren; der Point wird gelöscht, der Puck geht auf „OFF". Ansage „Seven-out – der Point ist verloren." Klang `cr-sevenout`.
- **Vorbedingung:** Ein Point steht.
- **Beobachtbar an:** `data-cr-point` wird leer; Ansage `round.announce.sevenout`; Verlaufseintrag mit Ton `loss`; abgeräumte Chipstapel.
- **Umgesetzt in:** `wagers-craps.js:258-261` und die Urteilsblöcke `wagers-craps.js:296-403`.

### F-CRAPS-33  Was mit liegenden Einsätzen geschieht — die fünf Urteile
- **Was:** Jeder liegende Einsatz bekommt nach jedem gültigen Wurf genau ein Urteil: `win` (Einsatz und Gewinn zurück, Chips weg), `loss` (Chips weg, nichts zurück), `push` (Einsatz zurück, Chips weg — nur Don't Pass/Don't Come bei der 12), `stay` (Chips bleiben liegen und warten auf den nächsten Wurf), `move` (Chips wandern auf ein anderes Feld).
- **Wie ausgelöst:** Automatisch, sobald die Würfel liegen und der Wurf gültig war.
- **Soll-Ergebnis:** Die Urteile werden **gegen den Zustand vor dem Wurf** gefällt, obwohl der neue Point bereits feststeht. Danach räumt der Tisch nur die aufgelösten Felder ab, nicht das ganze Tuch; wandernde Chips wechseln das Feld; Sockel werden erst gelöscht, dann neu gesetzt.
- **Vorbedingung:** Gültiger (nicht zu kurzer) Wurf.
- **Beobachtbar an:** Chipstapel, die auf `come-N` neu erscheinen; Chipstapel, die trotz Wurf liegen bleiben; `data-cr-total` (Bilanz aus Kasse + Buy-in + liegendem Einsatz).
- **Umgesetzt in:** `wagers-craps.js:263-428`; `round-craps.js:223-313`.

### F-CRAPS-34  Auszahlung nach dem Wurf
- **Was:** Eine Sekunde lang bleiben die gewinnenden Stapel sichtbar, danach wird gebucht und abgeräumt.
- **Wie ausgelöst:** Automatisch nach der Auswertung.
- **Soll-Ergebnis:** Der Buy-in-Betrag steigt um die Rückgabe; angesagt wird „Zurück: {0} Euro auf {1} Euro Einsatz. Buy-in {2} Euro." bei Gewinn, „Teilrückgabe: …" wenn weniger als der Einsatz zurückkommt, „Verloren: {1} Euro. …" wenn nichts, und „Kein Einsatz aufgelöst." wenn kein Einsatz fällig war. Bei „Bewegung reduzieren" entfällt die Wartezeit.
- **Vorbedingung:** Gültiger Wurf, geöffnete Tischkasse.
- **Beobachtbar an:** Buy-in-Anzeige; `data-cr-total`; Ansage in `[data-cr-status]`; Klang `cr-payout` / `cr-partial` / `cr-loss`.
- **Umgesetzt in:** `round-craps.js:245-275`; `craps.js:315-327` (`geldSatz`), `craps.js:120-124` (`SETTLE_DELAY_MS`, Reduzierte Bewegung).

### F-CRAPS-35  Wurfsperre: wann darf überhaupt geworfen werden
- **Was:** Der Auslöser ist nur freigegeben, wenn ein Wurf jetzt zulässig ist.
- **Wie ausgelöst:** Zustandsänderung, Chip gelegt, Chip zurückgenommen.
- **Soll-Ergebnis:** Freigegeben, wenn die Runde auf `setzen` steht **und** (ein Point steht **oder** eine Linienwette liegt); außerdem, während die Runde `laeuft` und die Würfel gerade nicht rollen (für den Wiederholwurf). Sonst `aria-disabled="true"` — **nie** ein echtes `disabled`, damit der Knopf in der Tastaturreihenfolge bleibt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `aria-disabled` am `[data-ck-table-go]`; Absagen „Die Würfel rollen noch." bzw. „Für den Come-out braucht es einen Einsatz …".
- **Umgesetzt in:** `craps.js:330-339` (`zeichneAusloeser`), `craps.js:482-500` (`onGo`); `round-craps.js:141-160`.

### F-CRAPS-36  Verlaufsstreifen
- **Was:** Jeder gewertete Wurf hinterlässt einen Eintrag im Verlaufsstreifen des Tisches.
- **Wie ausgelöst:** Automatisch nach jedem gültigen Wurf.
- **Soll-Ergebnis:** Eintrag „3+4" mit dem Zusatz „Point {0}", falls ein Point steht, und einem Ton: `win` bei Natural/Point made, `loss` bei Craps/Seven-out, `event` beim Point-Setzen, sonst `neutral`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-ck-table-history]` im Markup, sichtbarer Text der Einträge.
- **Umgesetzt in:** `craps.js:416-426`; geteilter Baustein `table-history.js` aus `casino_startpage`.

### F-CRAPS-37  Kasse geschlossen mitten im Wurf
- **Was:** Wird die Tischkasse geschlossen, während die Würfel noch rollen, wird nichts gebucht und nichts abgeräumt.
- **Wie ausgelöst:** Verlassen der Seite (`pagehide`), während ein Wurf läuft.
- **Soll-Ergebnis:** Ansage „Die Kasse dieses Tisches ist geschlossen. Die Runde ist zu Ende."; die Chips bleiben als Aufzeichnung liegen, das Tuch bleibt gesperrt, der Auslöser wird gesperrt.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** `[data-cr-status]` mit `round.announce.closed`; `aria-disabled` am Auslöser.
- **Umgesetzt in:** `round-craps.js:247-263`; `craps.js:436-439` (`onAbort`).

---

## Die Würfel und ihr Wurf

### F-CRAPS-38  Würfel aufnehmen, schütteln, werfen (Maus, Finger, Stift)
- **Was:** Man nimmt die beiden Würfel mit gedrückter Maustaste oder gedrücktem Finger auf, schüttelt sie durch Bewegen und wirft sie durch Loslassen.
- **Wie ausgelöst:** `pointerdown` auf der Wanne → `pointermove` → `pointerup`. Vier Zustände: `bereit` → `hand` → `schuetteln` → `geworfen`.
- **Soll-Ergebnis:** In der Hand folgen die Würfel dem Zeiger (auch außerhalb der Wanne, wegen `setPointerCapture`); je 16 Bildpunkte angesammelter Bewegung kippen **beide** Würfel einmal in Bewegungsrichtung; beim Loslassen entsteht aus der Zeigergeschwindigkeit der letzten rund 120 ms die Wurfkraft (begrenzt auf 90…520 Wanneneinheiten/s). Eine Wurfrichtung nach rechts wird an der Senkrechten gespiegelt — rückwärts wird nicht geworfen.
- **Vorbedingung:** Modus „Selbst werfen", Würfel rollen gerade nicht, ein Wurf ist zulässig (`mayThrow`) oder die Runde läuft noch (Wiederholwurf) — **und keine Lobby-Runde** (dort bleibt die Schiene kalt).
- **Beobachtbar an:** `data-cr-hand` an der Würfelgruppe und die Eigenschaften `--cr-hx`/`--cr-hy` während des Haltens; Ansage „Die Würfel liegen in der Hand. Bewegen schüttelt sie, Loslassen wirft."; danach `data-cr-state="rollt"`; Klang `cr-shake`.
- **Umgesetzt in:** `Resources/Public/JavaScript/throw-input.js`; `craps.js:560-570` (`isArmed`), `craps.js:504-516` (`onThrowFromInput`).

### F-CRAPS-39  Wurfkraft-Schiene (Tastaturalternative)
- **Was:** Eine Schiene von 1 bis 10 stellt die Wurfkraft ein, ohne dass man ziehen muss.
- **Wie ausgelöst:** `<input type="range" id="cr-power">` — Maus oder Pfeiltasten/Pos1/Ende.
- **Soll-Ergebnis:** Der Wert wird beim Drücken der Taste „Würfel werfen" in eine Wurfgeschwindigkeit umgerechnet (linear zwischen 90 und 520). Jede Änderung wird angesagt: „Wurfkraft {0} von 10." Nach einem Zeigerwurf zeigt die Schiene rückwirkend an, wie kräftig er war — **ohne** Ansage. Startwert 6.
- **Vorbedingung:** keine (die Umrechnung wirkt nur im Modus „Selbst werfen").
- **Beobachtbar an:** `[data-cr-power]` mit `value`; Ansage `throw.announce.power` in `[data-cr-status]`.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Craps/Throw.html:70-76`; `craps.js:341-351` (`wurfSetup`), `craps.js:589-593` (Ansage), `craps.js:505-511` (Rückweg).

### F-CRAPS-40  Taste „Würfel werfen"
- **Was:** Der eigentliche Rundenauslöser des Tisches.
- **Wie ausgelöst:** Klick oder Eingabetaste auf `[data-ck-table-go]` in der Wurfleiste.
- **Soll-Ergebnis:** Steht die Runde auf `setzen`, beginnt ein Wurf (Tuch sperren, Würfel werfen). Läuft die Runde schon und liegen die Würfel, wird nachgeworfen (Mindestwurf-Regel). Rollen die Würfel gerade, kommt die Ansage „Die Würfel rollen noch."
- **Vorbedingung:** siehe F-CRAPS-35.
- **Beobachtbar an:** `data-cr-round` wechselt auf `gesperrt`/`laeuft`; `data-cr-state="rollt"`; `data-cr-throws` zählt hoch.
- **Umgesetzt in:** `Throw.html:78-83`; `craps.js:482-500` (`onGo`); `round-craps.js:167-196`.

### F-CRAPS-41  Modewahl „Wer wirft?" — Selbst werfen / Zuschauen
- **Was:** Eine Radiogruppe entscheidet, ob der Spieler selbst wirft oder der Tisch.
- **Wie ausgelöst:** Zwei Radioknöpfe in `fieldset`/`legend` „Wer wirft?" (`shoot` vorausgewählt, `watch`).
- **Soll-Ergebnis:** „Selbst werfen": Ziehen ist erlaubt und die Wurfkraft-Schiene wird für den Tastenwurf ausgewertet. „Zuschauen": der Tisch wirft, **alles** wird gezogen — auch die Wurfkraft; die Schiene wird dann bewusst ignoriert. Jede Option trägt eine eigene, sichtbare und per `aria-describedby` verknüpfte Erklärung.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-cr-mode="shoot"]` / `[data-cr-mode="watch"]` mit `checked`; im Zuschauen-Modus liefert `wurfSetup()` `null`.
- **Umgesetzt in:** `Throw.html:40-68`; `craps.js:222-224` (`modus`), `craps.js:341-351`.

### F-CRAPS-42  Mindestwurf-Regel („zu kurz geworfen")
- **Was:** Erreichen die Würfel die gegenüberliegende (linke) Bande nicht, zählt der Wurf nicht.
- **Wie ausgelöst:** Automatisch am Ende eines Wurfs, abgelesen an einer körperlichen Tatsache (`farWall`).
- **Soll-Ergebnis:** Ansage „Zu kurz geworfen: die Würfel haben die gegenüberliegende Bande nicht erreicht. Der Wurf zählt nicht und wird wiederholt." Der Wurf wird **nicht** sofort wiederholt — man soll sehen, wie weit die Würfel kamen. Im Zuschauen-Modus (und in jeder Lobby-Runde) wirft der Tisch nach 1 Sekunde von selbst erneut; bei „Selbst werfen" bleibt der Auslöser frei. Das Tuch bleibt dabei gesperrt, die Einsätze bleiben liegen.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** `data-cr-valid="nein"`, `data-cr-state="ungueltig"`; `data-cr-throws` zählt trotzdem hoch; Ansage `throw.announce.short`.
- **Umgesetzt in:** `craps.js:387-406` (`onInvalid`), `craps.js:353-370` (`onRest`); `round-craps.js:198-216` (`rethrow`).

### F-CRAPS-43  Wurfergebnis ablesen
- **Was:** Wenn beide Würfel liegen, werden die Augenzahlen und ihre Summe abgelesen und angesagt.
- **Wie ausgelöst:** Automatisch, sobald die Physik zur Ruhe gekommen ist.
- **Soll-Ergebnis:** Die Ansage nennt beide Augenzahlen **und** die Summe („{0} und {1}, zusammen {2}."), ergänzt um den Ausgang des Wurfs und die Geldantwort. Klang `cr-dice-rest`.
- **Vorbedingung:** gültiger Wurf.
- **Beobachtbar an:** `data-cr-die-a`, `data-cr-die-b`, `data-cr-sum`, `data-cr-valid="ja"`, `data-cr-state="liegt"` am Wurzelelement.
- **Umgesetzt in:** `craps.js:353-370`; Texte `throw.announce.result`, `round.announce.*`.

### F-CRAPS-44  Bewegung reduzieren
- **Was:** Wer im Betriebssystem „Bewegung reduzieren" eingestellt hat, bekommt das Ergebnis eines Wurfs sofort statt seines Ablaufs.
- **Wie ausgelöst:** `prefers-reduced-motion: reduce`.
- **Soll-Ergebnis:** Die Physik wird trotzdem vollständig durchgerechnet, aber nur einmal am Ende gemalt; außerdem entfällt die Wartezeit vor dem Abräumen (`settleDelayMs = 0`).
- **Vorbedingung:** entsprechende Systemeinstellung.
- **Beobachtbar an:** kein sichtbarer Ablauf, aber dieselben Messpunkte `data-cr-die-a/b`, `data-cr-sum`.
- **Umgesetzt in:** `craps.js:126-129` (`reducedMotionActive`), `craps.js:581`; `Resources/Public/JavaScript/dice-view.js`.

### F-CRAPS-45  Kein sicherer Zufall im Browser
- **Was:** Stellt der Browser keine sichere Zufallsquelle bereit, spielt der Tisch gar nicht erst.
- **Wie ausgelöst:** Seitenaufruf (`isAvailable()` aus `rng.js`).
- **Soll-Ergebnis:** Der Auslöser wird gesperrt und es wird angesagt: „Dieser Browser stellt keine sichere Zufallsquelle bereit. Der Tisch spielt nicht." Nichts wird verdrahtet.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `aria-disabled="true"` am `[data-ck-table-go]`; Text `throw.announce.norandom` in `[data-cr-status]`.
- **Umgesetzt in:** `craps.js:231-235`; `Resources/Public/JavaScript/rng.js`.

---

## Der Klang

Alle Klänge entstehen aus Tonfrequenzen im Browser — keine Audiodatei, kein
Netzzugriff, keine Melodie. Dieser Tisch hat **keinen** Dauerklang.

### F-CRAPS-46  Ton-Schalter
- **Was:** Ein Umschaltknopf „Ton" schaltet den Klang des Tisches an und aus.
- **Wie ausgelöst:** Klick oder Eingabetaste auf `[data-cr-sound]`.
- **Soll-Ergebnis:** `aria-pressed` wechselt; der erreichbare Name lautet „Ton ist an, ausschalten" bzw. „Ton ist aus, einschalten" und enthält den sichtbaren Text „Ton". Schaltet eine **andere** Registerkarte um, wird der Schalter nachgeführt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-cr-sound-on` = `'1'`/`'0'` am Wurzelelement; `aria-pressed` am Knopf.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Craps/SoundSwitch.html`; `sound-craps.js:191-208`.

### F-CRAPS-47  Klang je Anlass
- **Was:** Zehn Anlässe haben je einen eigenen Klang.
- **Wie ausgelöst:** Die jeweilige Handlung bzw. das Ereignis.
- **Soll-Ergebnis:**
  | Anlass | Klang | Schlüssel |
  |---|---|---|
  | Chip aufs Tuch gelegt | `metal`, tiefe Tonlage | `cr-chip-place` |
  | Chip zurückgenommen | `metal`, höher und leiser | `cr-chip-remove` |
  | Wurf beginnt | `ratchet` — das Rasseln in der Hand, einmal | `cr-shake` |
  | Würfel liegen | `metal`, hoch — ein Aufschlag (nicht zwei) | `cr-dice-rest` |
  | Point wird gesetzt | `metal`, tief und laut — der Puck wird umgelegt | `cr-puck` |
  | Seven-out | `sheet` — das Abräumen | `cr-sevenout` |
  | Gewinn (Rückgabe > Einsatz) | `coinCascade` | `cr-payout` |
  | Teilrückgabe (0 < Rückgabe ≤ Einsatz) | `coin` | `cr-partial` |
  | Verlust mit Einsatz | `sheet` | `cr-loss` |
  | CASH OUT | `cashRegister` | `cr-cashout` |
  Lag **kein** Einsatz, klingt keine der vier Geldantworten. Das Ereignisgeräusch (Puck, Seven-out) kommt **vor** der Geldantwort, nicht statt ihrer; von den vier Geldantworten kommt immer genau eine.
- **Vorbedingung:** Ton eingeschaltet; der Tonkontext wird erst nach einer echten Geste (`pointerdown` oder `keydown` mit `isTrusted`) freigeschaltet.
- **Beobachtbar an:** hörbar; `data-cr-sound-sustained` steht **immer** auf `'0'` (Nachweis, dass kein Dauerklang hängen bleibt).
- **Umgesetzt in:** `sound-craps.js:147-189` (Wurf, Ruhe, Ergebnis), `sound-craps.js:232-241` (Chips und CASH OUT).

### F-CRAPS-48  Leerlaufgeräusch
- **Was:** Zwischen den Runden läuft das geteilte Leerlaufgeräusch des Hauses; während eine Runde läuft, schweigt es.
- **Wie ausgelöst:** Zustandswechsel der Runde (`setBusy`).
- **Soll-Ergebnis:** Sobald die Runde nicht mehr auf `setzen` steht, wird der Leerlauf stumm; danach wieder hörbar.
- **Vorbedingung:** Ton an, Tonkontext freigeschaltet.
- **Beobachtbar an:** nur mit dem Ohr.
- **Umgesetzt in:** `sound-craps.js:227-230` (`setBusy`, `IdleNoise`); `craps.js:372-377` (`onState`).

---

## Der Lobby-Anschluss (QR-Lobby, Umsetzungsstück D5-3)

Der Adapter `Resources/Public/JavaScript/lobby-craps.js` hört auf genau vier
DOM-Ereignisse und importiert aus `casino_lobby` **nichts**. Läuft keine Lobby,
sind die Zuhörer wirkungslos angemeldet und der Tisch verhält sich wie im Einzelspiel.

### F-CRAPS-49  In der Lobby wirft die Saat, nicht die Hand
- **Was:** Sobald eine Lobby-Runde läuft, wirft nicht mehr der Spieler, sondern die vom Server gezogene Saat — damit jeder Browser dieselben Würfel fallen sieht.
- **Wie ausgelöst:** Ereignis `casino:lobby-runde` mit einer Saat; der Adapter macht daraus den Zufallsgeber (`createSeeded(saatZuZahl(saat))`) und startet den Wurf mit „alles ziehen" (`game.start(null)`).
- **Soll-Ergebnis:** Alle Browser derselben Lobby rechnen denselben Wurf. Nach dem Melden des Ergebnisses wird der Geber wieder auf echten Zufall zurückgestellt.
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel läuft ausschließlich `drawUint32()` (echter Zufall).
- **Beobachtbar an:** identische `data-cr-die-a`/`data-cr-die-b`/`data-cr-sum` in zwei Browsern derselben Lobby-Runde.
- **Umgesetzt in:** `lobby-craps.js:120-133`; `craps.js:259` (die eine Umschaltstelle `let geber`), `craps.js:610-613`.

### F-CRAPS-50  Wurfschiene liegt in der Lobby für jeden Platz still
- **Was:** In einer Lobby-Runde kann **niemand** von Hand werfen — auch der Shooter nicht.
- **Wie ausgelöst:** Erster eintreffender `casino:lobby-stand` setzt `inLobby = true`.
- **Soll-Ergebnis:** Aufnehmen/Schütteln/Werfen ist gesperrt (`isArmed` prüft zusätzlich `!inLobby`), die Taste „Würfel werfen" wird auf `aria-disabled="true"` gesetzt.
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel ist beides immer bedienbar (F-CRAPS-38, F-CRAPS-40).
- **Beobachtbar an:** `aria-disabled="true"` am `[data-ck-table-go]` trotz laufender Lobby; kein `data-cr-hand` beim Ziehen.
- **Umgesetzt in:** `craps.js:560-570`, `craps.js:621-631` (`sperren`).

### F-CRAPS-51  Tuch sperren und freigeben nach dem Lobby-Zustand
- **Was:** Das Tuch nimmt nur dann Chips an, wenn die Lobby im Zustand „setzen" steht.
- **Wie ausgelöst:** Jede geänderte Abfrage (`casino:lobby-stand`) mit dem Feld `z`.
- **Soll-Ergebnis:** `z !== 'setzen'` → Tuch gesperrt; sonst freigegeben. Feldknöpfe und Bedienleiste werden nachgeführt.
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel entscheidet allein der eigene Rundenzustand.
- **Beobachtbar an:** `aria-disabled` an den 48 Feldknöpfen.
- **Umgesetzt in:** `lobby-craps.js:174`; `craps.js:621-631`.

### F-CRAPS-52  Point kommt in der Lobby vom Server
- **Was:** Der Point wird bei jeder geänderten Abfrage aus dem festgeschriebenen Ergebnis des Servers nachgezogen, nie aus dem eigenen Gedächtnis.
- **Wie ausgelöst:** `casino:lobby-stand` mit `erg` (Nutzlast `"<würfel1>_<würfel2>_<ereignis>_<point>"`) und `ergR` (Rundennummer der Nutzlast).
- **Soll-Ergebnis:** Ein Browser, der eine Runde verpasst hat (Registerkarte im Hintergrund, Netz weg, gerade beigetreten), rechnet seine eigenen Einsätze trotzdem gegen den richtigen Point ab. Ist die Nutzlast mehr als eine Runde alt, bleibt der zuletzt bekannte Stand stehen, statt einen Point zu raten.
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel führt `wagers-craps.js` den Point allein.
- **Beobachtbar an:** `data-cr-point` am Wurzelelement; die reine Funktion `pointAusStand()` ist einzeln nachrechenbar.
- **Umgesetzt in:** `lobby-craps.js:92-98`, `lobby-craps.js:168-173`; `craps.js:633` (`pointSetzen` → `wagers.restore`).

### F-CRAPS-53  Ergebnis an die Lobby melden
- **Was:** Ein Browser meldet, was herauskam, und die eigene Bilanz je abgerechnetem Feld.
- **Wie ausgelöst:** Automatisch nach jedem gültigen Wurf, genau einmal je Runde.
- **Soll-Ergebnis:** Ereignis `casino:lobby-fertig` mit der Nutzlast (Würfel, Ereigniskürzel `so`/`ps`/`pm`/`na`/`cr`/`r`, Point) und Ereignis `casino:lobby-handlung` mit `art: 'bilanz'`. Gemeldet wird nur, was wirklich abgerechnet wurde (`win`/`loss`/`push`) — liegen bleibende (`stay`) und wandernde (`move`) Einsätze haben in diesem Wurf keinen Ausgang.
- **Vorbedingung:** **Nur in der Lobby.**
- **Beobachtbar an:** die beiden `CustomEvent` am `document`; der festgeschriebene Wert auf Serverseite.
- **Umgesetzt in:** `lobby-craps.js:59-63` (`nutzlast`), `lobby-craps.js:143-161`; `craps.js:428-432`.

### F-CRAPS-54  Eigenen Einsatz an die Lobby melden
- **Was:** Ändert sich der eigene Einsatz, wird er der Lobby gemeldet, damit die anderen Plätze ihn sehen.
- **Wie ausgelöst:** Jede geänderte Abfrage im Zustand „setzen", wenn sich der Abdruck der eigenen Felder geändert hat.
- **Soll-Ergebnis:** Ereignis `casino:lobby-handlung` mit `art: 'einsatz'` und der Liste `{f: Feldkennung, b: Betrag}`.
- **Vorbedingung:** **Nur in der Lobby.**
- **Beobachtbar an:** `CustomEvent` am `document`.
- **Umgesetzt in:** `lobby-craps.js:178-189`; `craps.js:614-620` (`einsaetze`).

### F-CRAPS-55  Einsätze der Mitspieler anzeigen
- **Was:** Was die anderen Plätze gesetzt haben, wird auf dem eigenen Tuch sichtbar.
- **Wie ausgelöst:** `casino:lobby-stand` mit der Platzliste `p`.
- **Soll-Ergebnis:** Die fremden Einsätze werden an den geteilten Tuch-Baustein weitergereicht (`felt.foreign(plaetze)`).
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel gibt es keine fremden Einsätze.
- **Beobachtbar an:** fremde Chipmarkierungen auf den Feldern (Darstellung im Site Package).
- **Umgesetzt in:** `lobby-craps.js:176`; `craps.js:632` (`fremdeEinsaetze`).

### F-CRAPS-56  Würfel-Warteliste und Weitergabe nach Seven-out
- **Was:** In der Lobby gibt es eine Warteliste, wer die Würfel als Nächstes bekommt; nach einem Seven-out gehen sie weiter.
- **Wie ausgelöst:** Ein-/Austragen in der **Platzleiste** der Lobby; die Weitergabe löst der Server aus, sobald eine gemeldete Nutzlast die Marke `_so` trägt.
- **Soll-Ergebnis:** Der Shooter wechselt zum nächsten Platz auf der Warteliste. **Die Marke `_so` ist das Einzige, was der Server an der Nutzlast versteht** — er rechnet das Seven-out nicht nach, die Regeln liegen im Browser.
- **Vorbedingung:** **Nur in der Lobby.** Im Einzelspiel gibt es weder Shooter noch Warteliste.
- **Beobachtbar an:** `stand.w` (Platznummer des Shooters) und `stand.p[].sn` (Wartelistennummern) in der Abfrage; Anzeige in der Platzleiste.
- **Umgesetzt in:** Anzeige und Ein-/Austragen liegen **vollständig in `casino_lobby`** (`SeatStrip.php`, `Strip.html`, `lobby-live.js`); die Weitergabe in `LobbyService::ergebnis()`. `craps` liefert nur die Marke: `lobby-craps.js:59-63`. Diese Datei liest `stand.w`/`stand.p[].sn` **nicht** gesondert (im Dateikopf als bewusste Abweichung vom Plantext vermerkt, `lobby-craps.js:19-28`).

### F-CRAPS-57  Ungültiger Wurf in der Lobby bleibt gleichläufig
- **Was:** Ist der Saat-Wurf zu kurz, wird automatisch wiederholt — auch bei gewähltem Modus „Selbst werfen".
- **Wie ausgelöst:** Automatisch 1 Sekunde nach einem ungültigen Wurf, solange eine Lobby-Runde läuft.
- **Soll-Ergebnis:** Der Geber wird dabei **nicht** zurückgestellt; der nächste Zug kommt aus derselben fortlaufenden Folge, in jedem Browser gleich.
- **Vorbedingung:** **Nur in der Lobby** greift die Wiederholung unabhängig vom Modus; im Einzelspiel wiederholt nur der Zuschauen-Modus automatisch.
- **Beobachtbar an:** `data-cr-throws` zählt hoch, `data-cr-valid="nein"`, danach ein neuer Wurf ohne Bedienung.
- **Umgesetzt in:** `craps.js:387-406`.

### F-CRAPS-58  Ein Craps-Einsatz kann länger leben als eine Lobby-Runde
- **Was:** Ein Wurf ist ein Lobby-Umlauf; ein Einsatz, der beim Come-out einen Point **setzt**, bleibt aber auf dem Tuch aktiv, während die Lobby schon zur nächsten Setzrunde weiterschaltet.
- **Wie ausgelöst:** Come-out-Wurf mit einer Point-Zahl während einer Lobby-Runde.
- **Soll-Ergebnis:** Der Einsatz bleibt liegen und wird erst in einer späteren Runde abgerechnet. Das ist die Spielregel, kein Fehler — anders als bei Roulette und Blackjack, wo sich jeder Einsatz innerhalb einer Runde vollständig auflöst.
- **Vorbedingung:** Lobby-Betrieb.
- **Beobachtbar an:** Differenz zwischen `data-cr-total` und dem Server-Kontostand in Höhe des noch aktiven Einsatzes; der Chipstapel liegt sichtbar weiter auf `pass`.
- **Umgesetzt in:** Dokumentiert in `README.md`, Abschnitt „Stand", Behebungslauf D5-4; Verhalten aus `wagers-craps.js:296-306` und `round-craps.js:285-313`.

---

## Geld am Tisch

Der Geldweg gehört den geteilten Bausteinen des Site Packages
(`table-buyin.js`, `credit.js`, `table-controls.js`, Partial `Table/BuyIn`);
`craps` bringt dafür keine eigene Zeile Geldlogik mit, sondern nur den Schlüssel
`craps`. Bedienbar sind diese Funktionen trotzdem an diesem Tisch.

### F-CRAPS-59  Chipkasse: Chips einzeln kaufen
- **Was:** Für jede Chipsorte gibt es einen eigenen Kaufknopf; ein Druck holt genau einen Chip dieses Werts ins Rack.
- **Wie ausgelöst:** Knopf „Kaufen" der jeweiligen Sorte in der Chipkasse.
- **Soll-Ergebnis:** Der Betrag wird vom Guthaben in den Gerätekredit des Tisches gebucht, der Chip liegt im Rack. Chipsorten an diesem Tisch: 100, 25, 20, 5, 1 €.
- **Vorbedingung:** Ausreichendes Guthaben. Der sichtbare Knopftext ist „Kaufen"; die Ergänzung „ein Chip zu … Euro" steht nur für Hilfsmittel dahinter, damit eine Sprachsteuerung „Kaufen" trifft.
- **Beobachtbar an:** Guthabenanzeige und Buy-in-Anzeige; Chipstapel im Rack.
- **Umgesetzt in:** `Table.html:54-56` (Chipsatz des Tisches); Partial `Table/BuyIn` und `table-buyin.js` aus `casino_startpage`.

### F-CRAPS-60  Chipkasse: Chips einzeln zurückgeben
- **Was:** Ein Rückgabeknopf je Sorte nimmt einen Chip aus dem Rack und bucht ihn als Teilrückgabe zurück.
- **Wie ausgelöst:** Knopf „Zurück" der jeweiligen Sorte.
- **Soll-Ergebnis:** Der Gerätekredit sinkt um den Chipwert, das Guthaben steigt.
- **Vorbedingung:** Mindestens ein Chip dieser Sorte im Rack. Ist die Sorte leer, ist der Knopf mit `aria-disabled="true"` markiert und abgeblendet — **außer** wenn er gerade den Fokus trägt, damit der Fokusrahmen sichtbar bleibt.
- **Beobachtbar an:** `aria-disabled` am Rückgabeknopf; Guthaben- und Buy-in-Anzeige.
- **Umgesetzt in:** Partial `Table/BuyIn` und `table-buyin.js` aus `casino_startpage`.

### F-CRAPS-61  CASH OUT
- **Was:** Der gesamte Gerätekredit des Tisches wandert in einem Zug zurück aufs Guthaben.
- **Wie ausgelöst:** Knopf „CASH OUT" in der Bedienleiste.
- **Soll-Ergebnis:** Der Buy-in geht auf 0, das Guthaben steigt entsprechend. Klang `cr-cashout`.
- **Vorbedingung:** **Gesperrt, solange Chips auf dem Tuch liegen** (Hausregel an jedem Gerät).
- **Beobachtbar an:** `aria-disabled` am CASH-OUT-Knopf; `data-cr-total` bleibt gleich (das Geld wechselt nur die Seite).
- **Umgesetzt in:** Partial `Table/Controls` und `table-controls.js`/`table-buyin.js` aus `casino_startpage`; Klangzuordnung `sound-craps.js:238-240`.

### F-CRAPS-62  Chipwahl
- **Was:** Mit welchem Chipwert der nächste Klick aufs Tuch setzt.
- **Wie ausgelöst:** Radiogruppe der Chips in der Bedienleiste.
- **Soll-Ergebnis:** Der gewählte Wert wird beim nächsten Feldklick gelegt (Vorgabe 1 €, wenn nichts gewählt ist).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `checked` am Chip-Radioknopf; der gelegte Chipwert im Stapel.
- **Umgesetzt in:** `craps.js:527` (`selectedChip`); Partial `Table/Controls` aus `casino_startpage`.

### F-CRAPS-63  Chips teilen und zusammenlegen
- **Was:** Ein größerer Chip lässt sich in kleinere zerlegen und kleinere lassen sich zusammenlegen.
- **Wie ausgelöst:** Die entsprechenden Knöpfe der Chipkasse.
- **Soll-Ergebnis:** Teilbar bzw. zusammenlegbar sind an diesem Tisch die Werte 100, 25, 20 und 5 € (nicht der 1er).
- **Vorbedingung:** passende Chips im Rack.
- **Beobachtbar an:** Chipstapel im Rack.
- **Umgesetzt in:** `Table.html:55-56` (`splittable`, `mergeable`); Baustein aus `casino_startpage`.

### F-CRAPS-64  Bilanzanzeige `data-cr-total`
- **Was:** Ein Messpunkt führt die Summe aus Kasse, Buy-in und liegendem Einsatz mit.
- **Wie ausgelöst:** Nach jedem ausgewerteten Wurf.
- **Soll-Ergebnis:** Die Zahl bleibt über einen ganzen Spielverlauf hinweg schlüssig: nichts verschwindet, nichts entsteht aus dem Nichts (abgesehen von Gewinn und Verlust gegen das Haus).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-cr-total` am `[data-ck-table]`.
- **Umgesetzt in:** `craps.js:410`.

---

## Anzeigen, Ansagen und Messpunkte

### F-CRAPS-65  Craps-eigener Ansagebereich
- **Was:** Ein Live-Bereich sagt Wurf, Ergebnis, Geld und jede craps-eigene Absage an.
- **Wie ausgelöst:** Automatisch bei jedem dieser Ereignisse; die Ansagen sind um 700 ms entprellt, die erste kommt sofort.
- **Soll-Ergebnis:** Der Bereich wird **leer** ausgeliefert (ein Live-Bereich, den ein Skript anlegt und füllt, wird sonst nicht angesagt) und trägt `role="status"`, nicht `role="alert"`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-cr-status]` — beim Laden leer, danach mit Text.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Craps/Status.html`; `craps.js:195-212` (`sag`).

### F-CRAPS-66  Sichtbarer Point-Stand
- **Was:** Ein gewöhnlicher, jederzeit ansteuerbarer Textabsatz zeigt, wie der Tisch gerade steht.
- **Wie ausgelöst:** Nach jedem gewerteten Wurf.
- **Soll-Ergebnis:** „Kein Point – der nächste Wurf ist ein Come-out." oder „Der Point steht auf {0}." Er wird **mit** Text ausgeliefert, weil der Come-out-Zustand der tatsächliche Anfangszustand ist. Ausdrücklich **kein** zweiter Live-Bereich — sonst hörte man jeden Wurf zweimal.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-cr-point-text]` im Markup (`.cr-round__point`).
- **Umgesetzt in:** `Resources/Private/Partials/Table/Craps/Round.html:42-44`; `craps.js:418-421`.

### F-CRAPS-67  Geteilter Ansagebereich für Chips und Bedienleiste
- **Was:** Die Chip- und Bedienmeldungen („gelegt", „abgeräumt", „Feldgrenze", „Rundengrenze", „gesperrt", „kein Chip", „festgelegt") laufen über den geteilten Bereich des Site Packages.
- **Wie ausgelöst:** Chip legen, zurücknehmen, Grenzen erreichen.
- **Soll-Ergebnis:** Der Satz steht nur einmal auf der Seite: craps-eigene Absagen gehen in `[data-cr-status]`, Chipmeldungen in `[data-ck-table-status]`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-ck-table-status]`.
- **Umgesetzt in:** `craps.js:530-535`, `craps.js:536-551` (Texte); Partial `Table/Status` aus `casino_startpage`.

### F-CRAPS-68  Die elf Messpunkte am Wurzelelement
- **Was:** Der Zustand des Tisches ist von außen ablesbar.
- **Wie ausgelöst:** Jede Zustandsänderung.
- **Soll-Ergebnis:**
  | Messpunkt | Bedeutung |
  |---|---|
  | `data-cr-state` | `ruht` / `rollt` / `liegt` / `ungueltig` |
  | `data-cr-throws` | Zahl aller bisherigen Würfe |
  | `data-cr-valid` | `ja` / `nein`, nur nach einem beendeten Wurf |
  | `data-cr-die-a`, `data-cr-die-b` | Augenzahl je Würfel des letzten gültigen Wurfs |
  | `data-cr-sum` | ihre Summe |
  | `data-cr-round` | `setzen` / `gesperrt` / `laeuft` / `auswerten` / `auszahlen` |
  | `data-cr-point` | der stehende Point oder leer — steuert zugleich den Puck |
  | `data-cr-total` | Bilanz aus Kasse, Buy-in und liegendem Einsatz |
  | `data-cr-sound-on` | `1` / `0`, Ton-Schalter |
  | `data-cr-sound-sustained` | immer `0` — dieser Tisch hat keinen Dauerklang |
  Die ersten acht schreibt ausschließlich `craps.js`, die beiden Ton-Messpunkte ausschließlich `sound-craps.js`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** den Attributen selbst am `[data-ck-table][data-ck-table-key="craps"]`.
- **Umgesetzt in:** `Table.html:64-67` (Auslieferungswerte); `craps.js:353-370`, `craps.js:372-377`, `craps.js:409-410`; `sound-craps.js:145`, `sound-craps.js:200`.

### F-CRAPS-69  Der Puck als Spielstein
- **Was:** Eine runde Marke zeigt über dem Zahlenkasten an, welcher Point steht — oder „OFF" über der Mitte, wenn keiner steht.
- **Wie ausgelöst:** Änderung von `data-cr-point`.
- **Soll-Ergebnis:** Der Puck **springt** zwischen den Spuren, statt zu gleiten (`grid-column` ist nicht animierbar; das ist so gewollt). Er ist `aria-hidden`, nicht fokussierbar und trägt keine eigene Aussage — was er zeigt, steht als Text in `.cr-round__point`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Puck-Element in Zeile 1 des Tuchs; sechs Regeln in `felt.css`, die auf `data-cr-point` hören.
- **Umgesetzt in:** `Classes/BetLayout.php:745-758` (`puckLanes`); `Resources/Public/Css/felt.css`; `Resources/Private/Partials/Table/Craps/Felt.html`.

### F-CRAPS-70  Der erreichbare Name jedes Feldes
- **Was:** Jeder Feldknopf sagt auf Deutsch, welche Wette er ist, was sie zahlt, wie hoch der Höchsteinsatz ist und wie viel gerade darauf liegt.
- **Wie ausgelöst:** Fokus oder Vorlesen des Knopfes; der gesetzte Betrag wird zur Laufzeit nachgeführt.
- **Soll-Ergebnis:** Form „{Name}, höchstens {2} Euro, {3} Euro gesetzt" bzw. „… nichts gesetzt". Steht auf dem Tuch ein englisches Wort, kommt es wörtlich im Namen vor (Label in Name); steht dort eine englische Zahl („31 FOR 1"), nennt der Name **beide** Zählweisen („zahlt 31 for 1, also 30 zu 1").
- **Vorbedingung:** keine. Bekannte Grenze: in einem `aria-label` lässt sich kein Sprachwechsel auszeichnen, der Name wird durchgehend deutsch gesprochen.
- **Beobachtbar an:** `aria-label` bzw. `data-ck-field-label` am Feldknopf; `felt.fieldname` / `felt.fieldname.empty` in `locallang.xlf`.
- **Umgesetzt in:** `Resources/Private/Language/locallang.xlf:103-215`; `BetLayout.php` (`labelKey`/`labelArgs`); `Felt.html`.

### F-CRAPS-71  Die Aufschrift des Tuchs bleibt englisch
- **Was:** Was auf dem Tuch gedruckt steht, ist englisch und wörtlich wie auf der Vorlage — es wird in keiner Sprachfassung übersetzt.
- **Wie ausgelöst:** entfällt (rein sichtbar).
- **Soll-Ergebnis:** „PASS LINE", „Don't Pass Bar", „COME", „Don't Come", „Bar", „FIELD", „· 3 · 4 · 9 · 10 · 11 ·", „Seven", „Any Craps", „ODDS", „PAYS DOUBLE", „PAYS TRIPLE", „E", „C", „OFF"/„ON", „SIX", „NINE". Jedes englische **Wort** trägt `lang="en"`; reine Ziffern bekommen **kein** `lang`-Attribut. Die Zahlenaufdrucke („5 FOR 1", „8 FOR 1", „10 FOR 1", „16 FOR 1", „31 FOR 1") werden aus derselben Quote **gerechnet**, aus der auch ausgezahlt wird.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `lang="en"` an den Aufschriftteilen im Markup.
- **Umgesetzt in:** `Classes/BetLayout.php:160`, `BetLayout.php:192-208` (Konstanten), `BetLayout.php:296-306` (`forOne`).

---

## Beobachtungen, nicht bewertet

- An mehreren Stellen ist noch von **47** Feldern die Rede, während der Quelltext 48 führt: `ext_localconf.php:60` („die 47 Felder des Tuchs"), `Table.html:8` und `Table.html:87` („die 47 Knöpfe"), sowie der C7d-Punkt im README-Abschnitt „Stand"; `bets-craps.js:311` und der README-Abschnitt „Bauabschnitt U" nennen dagegen 48.
- `ext_localconf.php:47` sagt „dataProcessing hat in Phase C6 genau EINEN Schritt", darunter stehen zwei Schritte (20 und 30); der Absatz ab Zeile 59 ergänzt den zweiten nachträglich.
- `Configuration/JavaScriptModules.php:42-45` hält fest: „STAND UMSETZUNGSSTÜCK C6a: Kein Fluid-Template dieser Extension bindet ein Modul ein" — `Table.html:62` bindet `@phomo17/craps/craps.js` ein.
- `Classes/Craps.php:47-53` beschreibt `CREDIT_KEY` als „In Phase C6 ungenutzt"; der Tischschlüssel `craps` steht im Markup als `data-ck-table-key` (`Table.html:64`) und wird von `craps.js` von dort gelesen, nicht über die Konstante.
- `Dice.html` nennt die Prüfsummen-Prüfung der Physikdateien „P-10", der README-Abschnitt „Die Würfel und ihre 24 Lagen" nennt sie „P-11" und erklärt die Umbenennung.
- Der in `bets-craps.js` und `BetLayout.php` hinterlegte **Höchsteinsatz** der beiden Linien-Odds-Felder (`pass-odds` 500 €, `dont-pass-odds` 1200 €) ist der größtmögliche Wert bei voller Linienwette; die tatsächlich geltende Grenze wird zur Laufzeit aus Point und Linieneinsatz gerechnet (`oddsMax`).
- Der README-Abschnitt „Klang" und `sound-craps.js` beschreiben die Zuordnung gleichlautend; `Table.html:41-46` spricht von „neun Messpunkten am Wurzelelement", die beiden Ton-Messpunkte kommen aus `sound-craps.js` hinzu.
- `lobby-craps.js:19-28` vermerkt selbst eine Abweichung vom Plantext: `stand.w` und `stand.p[].sn` (Shooter und Warteliste) werden von dieser Datei nicht gelesen, weil die Auswertung vollständig in `casino_lobby` liegt.
- Der README-Abschnitt „Stand" nennt unter „ausdrücklich nicht gebaut" unter anderem „mehrere Personen an einem Tisch" — das ist inzwischen über den Lobby-Anschluss (D5-3) teilweise vorhanden; der Abschnitt „Stand" beschreibt beides an verschiedenen Stellen.

---

<!-- ===================== fruit_risk ===================== -->

# Funktionsinventur: `fruit_risk` (FruitRisk)

Der vierte Automat des Spaß-Casinos: ein breiter Fruchtautomat mit sechs Walzen
und fünf Reihen, gebaut um **drei** Risikospiele herum (Faktor ×2, ×4, ×8), die
nach jeder Runde entscheiden, was aus dem garantierten Gewinn wird.
Diese Datei listet auf, was das Gerät kann, wie man es auslöst und woran man von
außen sieht, dass es geschehen ist — eine Inventur, kein Urteil.

Alle Zeilenangaben beziehen sich auf den Stand vom 2026-09-11, Version 0.5.0 (alpha).

---

## Rückseite: Inhaltselement und Anmeldung

### F-FRUITRISK-01  Inhaltselement „FruitRisk" anlegen
- **Was:** Ein Redakteur stellt mit diesem Inhaltselement den Automaten auf der Seite auf, auf der das Element liegt.
- **Wie ausgelöst:** Im Backend im Assistenten „Neues Inhaltselement", Gruppe der Casino-Geräte, Eintrag „FruitRisk" (`CType = fruit_risk`); speichern.
- **Soll-Ergebnis:** Auf der Frontend-Seite steht das komplette Gehäuse. Im ausgelieferten HTML erscheint `<div class="fr-machine ck-room-fill">` mit `<div class="fr-cabinet" data-fr-cabinet>` darin; zusätzlich werden `machine.css` und das ES-Modul `@phomo17/fruit-risk/fruit-risk.js` genau auf dieser Seite geladen.
- **Vorbedingung:** Extension aktiviert; `casino_startpage` ≥ 0.5.0 vorhanden.
- **Beobachtbar an:** `.fr-machine` im Seitenquelltext; `<link>` auf `machine.css`; Import-Map-Eintrag `@phomo17/fruit-risk/`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:32-41`, `ext_localconf.php:62-78`, `Resources/Private/ContentElements/Machine.html:39-45`.

### F-FRUITRISK-02  Keine Einstellungen am Inhaltselement
- **Was:** Das Element hat bewusst **kein** eigenes Feld — der Redakteur wählt nichts aus.
- **Wie ausgelöst:** Öffnen des Elements im Backend.
- **Soll-Ergebnis:** Sichtbar sind nur die Systemfelder (Typ, Spalte, Sprache, Zugriff, Notizen), die TYPO3 seit 13.3 selbst ergänzt. Keine Einsatzwahl, keine Zielseite, keine Gerätewahl. Es gibt keine eigene Datenbankspalte und keine `ext_tables.sql`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** leere Feldliste (zweites Argument `''` in `addRecordType()`); Fehlen einer `ext_tables.sql` in der Extension.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:40`.

### F-FRUITRISK-03  Beschreibungstext im Assistenten
- **Was:** Der Assistent „Neues Inhaltselement" zeigt zum Eintrag eine Erklärung, was das Element tut und dass zusätzlich ein „Casino-Automat"-Element auf der Startseite gehört.
- **Wie ausgelöst:** Assistent öffnen.
- **Soll-Ergebnis:** Sichtbarer Text „Stellt den Automaten „FruitRisk" auf dieser Seite spielbereit auf. …"
- **Vorbedingung:** keine.
- **Beobachtbar an:** sichtbarer Text im Assistenten.
- **Umgesetzt in:** `Resources/Private/Language/locallang_be.xlf:9-11`.

### F-FRUITRISK-04  Anmeldung im Spielsaal (Saal-Miniatur)
- **Was:** Der Automat meldet sich bei der Geräte-Registry des Site Package an und kann dadurch im Saal auf der Startseite als Miniatur aufgestellt werden.
- **Wie ausgelöst:** Auf der Startseite ein Inhaltselement „Casino-Automat" anlegen, dort „FruitRisk" auswählen und als Zielseite die Automatenseite angeben.
- **Soll-Ergebnis:** Im Saal steht eine Kachel mit dem gezeichneten Gehäuse (`.ck-cabinet` mit genau einem `<svg class="ck-cabinet__drawing">`, viewBox-Verhältnis 100 : 160) und dem Kopfschild „FRUITRISK"; ein Klick führt auf die Automatenseite.
- **Vorbedingung:** Extension aktiviert; Automatenseite existiert.
- **Beobachtbar an:** `.ck-cabinet` mit der FruitRisk-Zeichnung im Saal; Auswahlpunkt „FruitRisk" im Element „Casino-Automat".
- **Umgesetzt in:** `ext_localconf.php:26-32`, `Resources/Private/Partials/Automat/FruitRisk/Cabinet.html`, `Classes/FruitRisk.php:24-38`.

### F-FRUITRISK-05  Gedruckter Gewinnplan aus der Regelquelle
- **Was:** Der Gewinnplan hinter Glas wird beim Seitenaufbau aus der einen Regelquelle `Classes/Rules.php` erzeugt, nicht im Markup abgeschrieben.
- **Wie ausgelöst:** Seitenaufruf (serverseitig, `dataProcessing`-Schritt `fruit-risk-cabinet`).
- **Soll-Ergebnis:** Im gezeichneten Gewinnplan stehen 48 Gewinnwerte, vier Spaltenköpfe, zwölf Symbolnamen und der Feldtreppen-Hinweis; dieselben Werte stehen zusätzlich in einer visuell verborgenen `<table class="fr-offscreen">`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<table class="fr-offscreen">` mit `<caption>GEWINNPLAN</caption>` im ausgelieferten HTML; die Zahlen darin stimmen mit `Rules::PAYTABLE` überein.
- **Umgesetzt in:** `ext_localconf.php:68-74`, `Classes/DataProcessing/CabinetProcessor.php`, `Configuration/Services.yaml:17-19`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:404-430`.

### F-FRUITRISK-06  Seitenbeschreibung für Suchmaschinen und KI-Bots
- **Was:** Die Automatenseite bekommt automatisch eine `<meta name="description">` und einen Game-Eintrag aus dem Titel und der Beschreibung des Geräts.
- **Wie ausgelöst:** Seitenaufruf (`dataProcessing`-Schritt `casino-device-description`).
- **Soll-Ergebnis:** Im `<head>` steht `<meta name="description" content="Breiter Fruchtautomat mit sechs Walzen und fünf Reihen. …">`; ein im Seitendatensatz hinterlegter eigener Beschreibungstext wird dabei bewusst überschrieben (`replace=true`).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<meta name="description">` im Seitenquelltext.
- **Umgesetzt in:** `ext_localconf.php:70-73`, `Resources/Private/Language/locallang.xlf:6-11`.

---

## Spielerseite: Walzenspiel und Rundenablauf

### F-FRUITRISK-07  START — eine Runde beginnen
- **Was:** Löst eine Runde aus: würfelt, bucht den festen Einsatz ab und lässt die sechs Walzen anlaufen.
- **Wie ausgelöst:** Taste `START` (viereckig, 19 × 19, rechts neben den Walzen), Aufschrift „START", `data-fr-button="start"`. Zeiger (`pointerdown`, nur linke/primäre Taste) oder Tastatur (Enter/Leertaste), oder ein direkt synthetisiertes `click` eines Hilfsmittels.
- **Soll-Ergebnis:** Die sechs Walzen laufen an (versetzt um 0/60/120/180/240/300 ms Verzug, Anlauf 260 ms). Der feste Einsatz **10** wird vom Gerätekredit abgebucht; ein noch offenes Angebot wird vorher eingelöst. Die Ziehung steht sofort am Gehäuse.
- **Vorbedingung:** Zustand `idle` oder `offer`; Gerätekredit ≥ 10; sichere Zufallsquelle vorhanden.
- **Beobachtbar an:** `data-fr-state` wechselt von `idle`/`offer` auf `spinning`; `data-fr-round` trägt die sechs gezogenen Bandpositionen, mit `-` verbunden (Prüfsiegel, steht **vor** dem ersten STOP); `data-fr-machine-credit` sinkt um genau 10; `data-fr-win` steht auf `0`; Ereignisse `fr:round` (abbrechbar, `{draw, stake}`) und `fr:state` (`{from, to:'spinning'}`); Startklang (zwei steigende Rechteckstöne 180 → 240 Hz + Klinke).
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:306-334`, `Resources/Public/JavaScript/press.js:97-192`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:171-172`.

### F-FRUITRISK-08  Zug abgelehnt, weil der Gerätekredit nicht reicht
- **Was:** Reicht der Gerätekredit nicht für den festen Einsatz 10, kommt die Runde nicht zustande.
- **Wie ausgelöst:** `START` drücken (oder `fr:spin` des Auto-Modus) bei zu geringem Gerätekredit.
- **Soll-Ergebnis:** Die Walzen laufen **nicht** an, es wird nichts abgebucht, die Tafel zeigt „GUTHABEN ZU GERING", dazu ein tiefer Anschlag als hörbare Absage.
- **Vorbedingung:** Gerätekredit < 10.
- **Beobachtbar an:** `fr:round` ist `defaultPrevented`; `data-fr-state` bleibt unverändert; `data-fr-round` ändert sich nicht; sichtbarer Text „GUTHABEN ZU GERING" auf `.fr-message`; Ansage im Live-Bereich `data-fr-announce="machine"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:318-320`, `Resources/Public/JavaScript/wallet.js`, `Resources/Private/Language/locallang.xlf:132-134`.

### F-FRUITRISK-09  Zweiter START während einer laufenden Runde bleibt wirkungslos
- **Was:** Wer während des Laufs noch einmal `START` drückt, löst keine zweite Runde aus und zahlt nichts doppelt.
- **Wie ausgelöst:** `START` im Zustand `spinning`, `stopping` oder `evaluating`.
- **Soll-Ergebnis:** Nichts geschieht — keine Abbuchung, keine neue Ziehung.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** `data-fr-machine-credit` unverändert; `data-fr-round` unverändert; kein zweites `fr:round`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:249-251, 306-309`.

### F-FRUITRISK-10  STOP — die nächste laufende Walze anhalten
- **Was:** Hält die erste noch laufende Walze an; sechsmaliges Drücken hält alle sechs nacheinander an.
- **Wie ausgelöst:** Taste `STOP` (viereckig, 19 × 19, unmittelbar unter START), `data-fr-button="stop"`, Zeiger oder Tastatur.
- **Soll-Ergebnis:** Die betroffene Walze bremst über eine feste Strecke von 9 Zellen und federt 0,30 Zellen zurück (130 ms). Zwischen zwei Stillständen liegen mindestens 0,1 s. Das **Ergebnis ändert sich dadurch nicht** — gewürfelt wurde nur bei START, `requestStop()` nimmt kein Ziel entgegen.
- **Vorbedingung:** Zustand `spinning` oder `stopping`, mindestens eine noch anhaltbare Walze.
- **Beobachtbar an:** `data-fr-state` wechselt beim ersten STOP von `spinning` auf `stopping`; je Stillstand ein `fr:reelrest` mit `{reel, cell, symbols}`; die sechs Ruhelagen passen zu `data-fr-round`; Klang: sechs **steigende** Töne 262/294/330/370/415/466 Hz + kurzer Blechschlag.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:343-364`, `Resources/Public/JavaScript/reel.js`.

### F-FRUITRISK-11  Selbsttätiger Halt der Walzen
- **Was:** Ohne jeden Tastendruck kommen die sechs Walzen von allein nacheinander zur Ruhe.
- **Wie ausgelöst:** Zeitablauf ab Tastendruck: 1,2 / 1,7 / 2,2 / 2,7 / 3,2 / 3,7 Sekunden.
- **Soll-Ergebnis:** Alle sechs Walzen stehen spätestens nach 3,7 s plus Bremsweg; danach wird ausgewertet.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** sechs `fr:reelrest` in aufsteigender Walzenreihenfolge; anschließend `data-fr-state` = `evaluating`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:166, 385-420`.

### F-FRUITRISK-12  Auswertung einer Runde (zwei Gewinnwege)
- **Was:** Wenn alle sechs Walzen stehen, rechnet das Gerät aus, was im Fenster steht, und zahlt auf zwei Wegen, die sich **addieren**: 30 feste Gewinnlinien und die Feldzählung der drei kleinen Früchte.
- **Wie ausgelöst:** Stillstand der sechsten Walze (kein Tastendruck).
- **Soll-Ergebnis:** Der Gewinn steht in den Röhren `GEWINN` (Zählfahrt); getroffene Zellen bekommen einen Rahmen (`.fr-cell--win`), getroffene Gewinnlinien werden als sichtbare Linie eingeblendet (`.fr-payline--win`, über `opacity`). Es gibt **keine** Runde ohne Gewinn (baulich erzwungen). Kein Deckel auf dem Rundengewinn; der höchste beobachtete Rundengewinn ist 386.
- **Vorbedingung:** alle sechs Walzen stehen.
- **Beobachtbar an:** `data-fr-state` = `evaluating`, danach `offer`; `data-fr-win` trägt den Gewinn der Runde (immer ≥ 1); Ereignis `fr:result` mit `{grid, lines, field, lineAmount, fieldAmount, stake, win}`; Klasse `fr-payline--win`; Gewinn-Jingle (2 bis 5 steigende Ganztonschritte ab 392 Hz, gestaffelt nach 1–3 / 4–9 / 10–39 / ab 40 Kredite, danach Registrierkasse).
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:427-490`, `Resources/Public/JavaScript/paytable.js`, `Classes/Rules.php`.

### F-FRUITRISK-13  Ansage des Rundenergebnisses (ein Satz je Runde)
- **Was:** Ein Hilfsmittel bekommt genau **einen** Satz je Runde: was im Sichtfeld steht, wie viel gewonnen wurde, welche Linien getroffen haben und was im Feld gezählt wurde.
- **Wie ausgelöst:** Auswertung einer Runde; beim Rundenstart wird der Bereich zuerst geleert.
- **Soll-Ergebnis:** Text nach einem der drei Muster: „Sichtfeld: {0}. Gewinn {1} Kredite. Getroffene Linien: {2}. Im Feld: {3}." bzw. die Varianten nur-Feld / nur-Linien.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Textinhalt des Live-Bereichs `data-fr-announce="grid"` (`role="status"`), der vor der ersten Runde **leer** ist.
- **Umgesetzt in:** `Resources/Public/JavaScript/grid-announce.js`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:457-474`, `Resources/Private/Language/locallang.xlf:195-247`.

### F-FRUITRISK-14  Gerät ohne sichere Zufallsquelle: AUSSER BETRIEB
- **Was:** Fehlt dem Browser `crypto.getRandomValues`, bleibt das Gehäuse unbedient und sagt das auch.
- **Wie ausgelöst:** Seitenaufruf in einem Browser ohne sichere Zufallsquelle.
- **Soll-Ergebnis:** Keine Taste tut etwas, keine Kasse, kein Münzschlitz; die Tafel zeigt dauerhaft (nicht selbstlöschend) „AUSSER BETRIEB". Es gibt ausdrücklich **keinen** Rückfall auf `Math.random()`.
- **Vorbedingung:** fehlende Zufallsquelle.
- **Beobachtbar an:** sichtbarer Text „AUSSER BETRIEB" auf `.fr-message`; kein `data-fr-state` am Gehäuse; Konsolenmeldung `[fruit-risk] Keine sichere Zufallsquelle …`.
- **Umgesetzt in:** `Resources/Public/JavaScript/fruit-risk.js:180-195`, `Resources/Public/JavaScript/rng.js:47-62`.

### F-FRUITRISK-15  Zweites Gehäuse auf derselben Seite wird gesperrt
- **Was:** Steht versehentlich ein zweites FruitRisk-Element auf derselben Seite, bleibt es unbedienbar statt still falsch zu spielen.
- **Wie ausgelöst:** Zwei Inhaltselemente „FruitRisk" auf einer Seite.
- **Soll-Ergebnis:** Das zweite Gehäuse wird sichtbar gesperrt und auch für Tastatur und Hilfsmittel unerreichbar (`inert`).
- **Vorbedingung:** mehr als ein `.fr-machine` auf der Seite.
- **Beobachtbar an:** Klasse `fr-machine--duplicate` und Attribut `inert` am zweiten `.fr-machine`; Konsolenmeldung `[fruit-risk] Ein zweites FruitRisk-Gehäuse …`.
- **Umgesetzt in:** `Resources/Public/JavaScript/fruit-risk.js:204-218`.

### F-FRUITRISK-16  Gehäuse mit fehlerhaftem Markup: GERÄT GESTÖRT
- **Was:** Passt das Markup nicht zum Spielkern (etwa nicht genau sechs Walzen), wird das Gerät nicht verdrahtet und meldet das sichtbar.
- **Wie ausgelöst:** Seitenaufruf mit beschädigtem Markup.
- **Soll-Ergebnis:** Die Tafel zeigt dauerhaft „GERÄT GESTÖRT"; bereits Gebautes wird wieder abgeräumt; die übrige Seite läuft weiter.
- **Vorbedingung:** Markup-Fehler.
- **Beobachtbar an:** sichtbarer Text „GERÄT GESTÖRT"; Konsolenmeldung `[fruit-risk] Ein Automat konnte nicht verdrahtet werden.`
- **Umgesetzt in:** `Resources/Public/JavaScript/fruit-risk.js:282-301`, `Resources/Public/JavaScript/machine.js:180-203`.

---

## Das Geld: Einwurf, Einsatz, Gewinn, Gerätekredit, Auszahlung

Zwei Töpfe, zwei Anzeigen: die **Kasse** (Gesamtbestand, allen Geräten gemeinsam,
Kassenfenster im Sockel) und der **Gerätekredit** (was bewusst in dieses Gerät
geworfen wurde, Röhrengruppe `GUTHABEN`). Gespielt wird ausschließlich vom
Gerätekredit. Der Gerätekredit heißt im Speicher `casinoKunterbunt.machine.fruit_risk`;
ist der QR-Modus an, läuft dieselbe Rechnung über das serverseitige Konto, ohne dass
das Gerät den Unterschied kennt.

### F-FRUITRISK-17  Gerätekredit beim Betreten der Seite: immer 0
- **Was:** Beim Öffnen der Automatenseite ist im Gerät nichts drin; ein vorgefundener Restbetrag aus einem Absturz wird sofort in die Kasse zurückgeräumt.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Die Röhrengruppe `GUTHABEN` startet **dunkel** (keine gemalte Zahl); nach dem Anmelden steht dort 0. Die Kasse zeigt ihren Stand im Fenster im Sockel.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-fr-machine-credit` = `0`; `data-fr-mirror` (roher Spiegelwert der Absturzsicherung) leer; `data-fr-bank` = Kassenstand; `data-fr-total` = Kasse + Gerätekredit.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:132`, `Resources/Public/JavaScript/bank.js:272-310`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:155-156`.

### F-FRUITRISK-18  Münzeinwurf über die Schnellwerte +10 / +100 / +500
- **Was:** Verschiebt 10, 100 oder 500 Kredite aus der Kasse in das Gerät. Kredite entstehen dabei nicht — sie wandern nur.
- **Wie ausgelöst:** Knöpfe `+10`, `+100`, `+500` am Sockel (`data-fr-coin-add="10|100|500"`), Klick oder Tastatur. `+10` ist genau eine Runde.
- **Soll-Ergebnis:** Eine Münze fällt sichtbar in den Schlitz (Animation 460 ms), der Schlitz blitzt kurz auf; `GUTHABEN` fährt auf den neuen Stand hoch, der Kassenstand sinkt um denselben Betrag; Münzklang aus dem geteilten Baukasten.
- **Vorbedingung:** Kassenstand ≥ Betrag.
- **Beobachtbar an:** Ereignis `fr:coin` mit `{amount, moved, reason:'ok', machineCredit}`; `data-fr-machine-credit` steigt um den Betrag; `data-fr-bank` sinkt um denselben; **`data-fr-total` bleibt unverändert**; Klasse `fr-coinslot__coin--drop`; Ansage im Live-Bereich `credit` („Kasse: …, Guthaben: …").
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:148-185, 249-285`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:283-290`.

### F-FRUITRISK-19  Münzeinwurf über einen frei gewählten Betrag
- **Was:** Ein selbst eingetippter Betrag wird eingeworfen.
- **Wie ausgelöst:** Zahl in das Feld „Freier Betrag" (`data-fr-coin-input`, `type="number"`, `min="1"`, `max="9999999"`, `step="1"`) eintragen, dann entweder in den gezeichneten Münzschlitz greifen (`data-fr-coin-insert`) oder die Eingabetaste im Feld drücken.
- **Soll-Ergebnis:** Wie F-FRUITRISK-18. Nach geglücktem Einwurf wird das Feld geleert; bei ungültigem Betrag bleibt die Eingabe stehen, damit man sie berichtigen kann.
- **Vorbedingung:** Kassenstand ≥ Betrag.
- **Beobachtbar an:** wie F-FRUITRISK-18; leeres bzw. stehen gebliebenes Eingabefeld.
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:162-175, 219-230`.

### F-FRUITRISK-20  Einwurf abgelehnt: „KASSE ZU GERING"
- **Was:** Reicht die Kasse nicht, wird **nichts** bewegt — alles oder nichts, keine stille Teilbuchung.
- **Wie ausgelöst:** Einwurf eines Betrags über dem Kassenstand.
- **Soll-Ergebnis:** Die Münze fällt trotzdem sichtbar (der Druck ist angekommen), es wird aber nichts gebucht; die Tafel zeigt „KASSE ZU GERING"; Klang: zurückgegebene Münze + tiefer Anschlag.
- **Vorbedingung:** Kassenstand < Betrag.
- **Beobachtbar an:** `fr:coin` mit `moved: 0` und `reason` ≠ `'ok'`; `data-fr-bank` und `data-fr-machine-credit` unverändert; sichtbarer Text „KASSE ZU GERING".
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:259-279`, `Resources/Private/Language/locallang.xlf:144-146`.

### F-FRUITRISK-21  Einwurf abgelehnt: „BETRAG UNGÜLTIG"
- **Was:** Ein leeres Feld, eine Null, eine gebrochene Zahl oder ein Wert über dem Höchststand wird abgewiesen.
- **Wie ausgelöst:** Einwurf mit unbrauchbarem Betrag (auch Exponentialschreibweise wie `1.5e3` wird erkannt und abgewiesen).
- **Soll-Ergebnis:** Es fällt **keine** Münze, es wird nichts gebucht, die Tafel zeigt „BETRAG UNGÜLTIG".
- **Vorbedingung:** keine.
- **Beobachtbar an:** kein `fr:coin`; sichtbarer Text „BETRAG UNGÜLTIG"; Zahlen unverändert.
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:249-253`, `Resources/Private/Language/locallang.xlf:135-137`.

### F-FRUITRISK-22  Einwurf gekappt: „KONTO VOLL"
- **Was:** Steht der Gerätekredit am Höchststand, passt nicht alles hinein.
- **Wie ausgelöst:** Einwurf über den Höchststand hinaus.
- **Soll-Ergebnis:** Der Rest bleibt in der Kasse; die Tafel zeigt „KONTO VOLL".
- **Vorbedingung:** Gerätekredit nahe am Höchststand.
- **Beobachtbar an:** `fr:coin` mit `reason: 'full'`; sichtbarer Text „KONTO VOLL".
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:261-269`.

### F-FRUITRISK-23  Fester Einsatz 10 je Runde
- **Was:** Jede Runde kostet genau 10 Kredite. Es gibt **keine** Einsatztasten; `EINSATZ` ist eine reine Anzeige.
- **Wie ausgelöst:** Jeder zustande gekommene Rundenstart (F-FRUITRISK-07).
- **Soll-Ergebnis:** `GUTHABEN` sinkt um genau 10; die Röhrengruppe `EINSATZ` zeigt dauerhaft 10.
- **Vorbedingung:** Gerätekredit ≥ 10.
- **Beobachtbar an:** `data-fr-machine-credit` sinkt um 10; `fr:round` `detail.stake` = 10; `data-fr-total` sinkt um 10; für Hilfsmittel: der verborgene Satz „Einsatz: 10 Kredite, fest." (Zahl kommt live aus `Rules::STAKE`).
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:232-263`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:444-446`, `Resources/Private/Language/locallang.xlf:189-191`.

### F-FRUITRISK-24  Gewinnanspruch: erspielt, aber noch nicht gutgeschrieben
- **Was:** Nach der Auswertung wird der Gewinn **nicht sofort** gebucht, sondern als offener Anspruch gehalten und angeboten. An diesem Gerät entsteht in **jeder** Runde ein Anspruch, weil jede Runde gewinnt.
- **Wie ausgelöst:** Ende einer Runde (`fr:result`).
- **Soll-Ergebnis:** Der Gewinn steht in `GEWINN`, ist aber noch nicht in `GUTHABEN`. Ein bereits erledigter Anspruch kann nicht zweimal eingelöst werden.
- **Vorbedingung:** Einsatz wurde tatsächlich abgebucht (sonst Tafel „RUNDE UNGÜLTIG").
- **Beobachtbar an:** `data-fr-offer` = `open`; `data-fr-claim` trägt den offenen Betrag; abbrechbares Ereignis `fr:offer` mit `{win, stake, claim}`.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:271-320`, `Resources/Public/JavaScript/payout.js:64-161`.

### F-FRUITRISK-25  REWARD — Gewinn gutschreiben
- **Was:** Schreibt den offenen Gewinn (bzw. den aktuellen Leiterstand) dem Gerätekredit gut und beendet das Angebot.
- **Wie ausgelöst:** Taste `REWARD` (Kappe 20 × 10, rechts außen im Bedienfeld), `data-fr-button="reward"`, Zeiger oder Tastatur.
- **Soll-Ergebnis:** `GUTHABEN` fährt um den Betrag hoch, der Anspruch ist erledigt, das Angebot erlischt; Klang: Münzkaskade, nach Betrag gestaffelt.
- **Vorbedingung:** ein offener Anspruch (`data-fr-offer` = `open`) oder eine laufende Leiter. Ohne Anspruch ist die Taste folgenlos.
- **Beobachtbar an:** `data-fr-offer` wechselt auf `none`, `data-fr-claim` auf `0`; Ereignis `fr:collect` mit `{amount, credited, capped, machineCredit}` und `fr:offerend` mit `reason: 'reward'`; `data-fr-machine-credit` steigt um den Betrag; die Taste verliert `.fr-btn--lit`.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:165-166, 333-345`, `Resources/Public/JavaScript/risk.js`.

### F-FRUITRISK-26  START löst ein offenes Angebot mit ein
- **Was:** Wer statt `REWARD` gleich `START` drückt, bekommt den Gewinn trotzdem gutgeschrieben — und zwar **bevor** der neue Einsatz geprüft wird.
- **Wie ausgelöst:** `START` bei offenem Angebot.
- **Soll-Ergebnis:** Erst Gutschrift, dann Deckungsprüfung, dann Abbuchung. Wer mit Gerätekredit 0 und einem Gewinn von 25 dasteht, kann mit `START` weiterspielen.
- **Vorbedingung:** offener Anspruch.
- **Beobachtbar an:** `fr:offerend` mit `reason: 'start'` unmittelbar vor der Abbuchung; `data-fr-machine-credit` steigt erst um den Gewinn und sinkt dann um 10.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:232-246`.

### F-FRUITRISK-27  Gewinn gekappt: „KONTO VOLL"
- **Was:** Übersteigt ein hoch geleiterter Gewinn den Höchststand des Gerätekredits, wird auf den Höchstbetrag gekappt und das gemeldet.
- **Wie ausgelöst:** Gutschrift eines sehr hohen Betrags.
- **Soll-Ergebnis:** Der Gerätekredit steht am Höchststand, die Tafel zeigt „KONTO VOLL".
- **Vorbedingung:** Betrag über dem Höchststand.
- **Beobachtbar an:** `fr:collect` mit `capped: true`; sichtbarer Text „KONTO VOLL".
- **Umgesetzt in:** `Resources/Public/JavaScript/payout.js:128-142`, `Resources/Public/JavaScript/wallet.js:397-401`.

### F-FRUITRISK-28  CASH OUT — Gerätekredit in die Kasse zurückbuchen
- **Was:** Bucht den gesamten Gerätekredit zurück in die Kasse. Die Taste sitzt auf der Auswurfschale.
- **Wie ausgelöst:** Taste `CASH OUT` (`data-fr-cashout`), sichtbare Aufschrift „CASH OUT". Sie hört auf `click` (nicht `pointerdown`) und reagiert damit auf Eingabe- **und** Leertaste.
- **Soll-Ergebnis:** `GUTHABEN` fällt auf 0, das Kassenfenster steigt um denselben Betrag; die Bilanz ändert sich nicht. Passt nicht alles in die Kasse, bleibt der Rest im Gerät stehen und die Tafel zeigt „KONTO VOLL". Klang: Blech + Münzkaskade.
- **Vorbedingung:** Gerätekredit > 0; sonst ist die Taste dunkel (`aria-disabled="true"`) und folgenlos, bleibt aber im Tastaturweg erreichbar.
- **Beobachtbar an:** Ereignis `fr:cashout` mit `{moved, capped, machineCredit}`; `data-fr-cashout-on` wechselt von `on` auf `off`; `data-fr-machine-credit` = `0`; **`data-fr-total` unverändert**; Klasse `fr-cashout--lit` verschwindet.
- **Umgesetzt in:** `Resources/Public/JavaScript/bank.js:163-165, 199-221, 286-298`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:346-349`.

### F-FRUITRISK-29  Kassenfenster und Ansage von Kasse und Guthaben
- **Was:** Das beleuchtete Fenster im Sockel zeigt die Kasse; für Hilfsmittel werden Kasse und Gerätekredit in **einem** Satz angesagt.
- **Wie ausgelöst:** Jede Änderung an Kasse oder Gerätekredit.
- **Soll-Ergebnis:** Sichtbare Zahl im Fenster (Anfangswert ist ein Strich „–", keine gemalte Zahl); Ansage „Kasse: 250, Guthaben: 40". **Beim bloßen Seitenaufbau wird nichts angesagt** — nur die sichtbare Anzeige bekommt ihren Anfangsstand.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Textinhalt von `.fr-bank__value`; Textinhalt des Live-Bereichs `data-fr-announce="credit"` (vor der ersten Bedienung leer); `data-fr-bank`, `data-fr-total`.
- **Umgesetzt in:** `Resources/Public/JavaScript/bank.js:236-310`, `Resources/Private/Language/locallang.xlf:182-184`.

### F-FRUITRISK-30  Wechsel an ein anderes Gerät mit stehen gebliebenem Kredit
- **Was:** Wer die Automatenseite verlässt, ohne `CASH OUT` gedrückt zu haben, verliert nichts: der Gerätekredit wandert vollständig in die Kasse zurück, und ein **offenes Angebot wird vorher noch eingelöst**.
- **Wie ausgelöst:** Verlassen der Seite (`pagehide`) — Wechsel zu einem anderen Gerät, Zurück-Taste, Schließen der Registerkarte.
- **Soll-Ergebnis:** In fester Reihenfolge: Auto-Modus aus, Spielkern aus, Risikospiele schreiben ihren offenen Gewinn **gut**, Klangpult aus, Kassenanzeige ab, dann löst `wallet` das Angebot ein und schließt den Gerätekredit. Danach steht der Betrag in der Kasse und ist am nächsten Gerät sofort da. Es bleibt nichts liegen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `fr:offerend` mit `reason: 'teardown'` (bzw. `ladder-collect` aus der Leiter) und anschließend `fr:collect`; nach dem Wechsel zeigt das Kassenfenster des nächsten Geräts den erhöhten Stand; alle `data-fr-*`-Messpunkte des laufenden Betriebs sind vom Gehäuse entfernt.
- **Umgesetzt in:** `Resources/Public/JavaScript/fruit-risk.js:109-143`, `Resources/Public/JavaScript/wallet.js:434-456`.

### F-FRUITRISK-31  Eine mitten im Lauf verlassene Runde wird nicht mehr ausgewertet
- **Was:** Wer die Seite verlässt, während die Walzen noch laufen oder gerade ausgewertet wird, gibt diesen Zug auf.
- **Wie ausgelöst:** Seitenwechsel bei `data-fr-state` = `spinning`, `stopping` oder `evaluating`.
- **Soll-Ergebnis:** Die Runde wird **nicht** nachträglich zu Ende ausgewertet; es entsteht kein `fr:result` und kein Angebot. Der beim Tastendruck bereits abgebuchte Einsatz von 10 und der garantierte, aber noch nicht ausgewertete Gewinn sind weg. Es entsteht dabei kein Geld — die Bilanz aus Kasse und Gerätekredit bleibt stimmig.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** kein `fr:result` nach dem Verlassen; `data-fr-total` vor und nach dem Wechsel stimmig (um den Einsatz 10 gemindert).
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:551-574`, `Resources/Public/JavaScript/fruit-risk.js:109-143`.

### F-FRUITRISK-32  Zurück aus dem Vor-/Zurück-Zwischenspeicher
- **Was:** Kommt die Seite aus dem Browser-Zwischenspeicher zurück, wird das Gerät vollständig neu verdrahtet statt als totes Gehäuse dazustehen.
- **Wie ausgelöst:** Zurück-Taste des Browsers (`pageshow` mit `persisted === true`).
- **Soll-Ergebnis:** Alle Tasten wirken wieder; die Treffer-Hervorhebung der letzten Runde steht nicht mehr im Sichtfeld; der Gerätekredit beginnt wieder bei 0.
- **Vorbedingung:** Browser liefert die Seite aus dem Zwischenspeicher.
- **Beobachtbar an:** `data-fr-state` ist wieder vorhanden und steht auf `idle`; keine `.fr-payline--win` mehr.
- **Umgesetzt in:** `Resources/Public/JavaScript/fruit-risk.js:155-161`, `Resources/Public/JavaScript/machine.js:562-568`.

### F-FRUITRISK-33  Die Tafel (Meldeschild) über dem Sichtfeld
- **Was:** Eine gezeichnete Anzeige, die kurze Betriebsmeldungen zeigt; ihr Text reist zusätzlich durch den Live-Bereich `machine`.
- **Wie ausgelöst:** Betriebsereignisse. Sieben Meldungen sind hinterlegt: „GUTHABEN ZU GERING", „BETRAG UNGÜLTIG", „KONTO VOLL", „RUNDE UNGÜLTIG", „KASSE ZU GERING", „AUSSER BETRIEB", „GERÄT GESTÖRT".
- **Soll-Ergebnis:** Die Tafel blendet ein (`.fr-message--shown`, über `opacity`/`pointer-events`, nie über `display`/`visibility`) und nimmt sich nach kurzer Zeit selbst zurück; die beiden Dauermeldungen „AUSSER BETRIEB" und „GERÄT GESTÖRT" bleiben stehen. Vor jeder Bedienung schweigt die Tafel, auch wenn der Gerätekredit 0 ist.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Textinhalt und Klasse von `.fr-message` (`data-fr-message`); Textinhalt des Live-Bereichs `data-fr-announce="machine"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/message.js`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:135-142`, `Resources/Public/JavaScript/wallet.js:381-389`.

---

## Das Angebot: der gemeinsame Einstieg in die drei Risikospiele

Jede Runde gewinnt, also endet **jede** Runde im Angebot. Danach gibt es vier
Wege: `REWARD` (Gewinn gutschreiben), eine der **drei** Starttasten (Risikospiel
beginnen), `START` (Gewinn gutschreiben **und** sofort weiterspielen), oder die
Seite verlassen (Gewinn wird gutgeschrieben).

### F-FRUITRISK-34  Das Angebot öffnet sich
- **Was:** Nach jeder Auswertung übernimmt das Risikospiel-Modul den Gewinnanspruch und lädt zu den drei Risikospielen ein.
- **Wie ausgelöst:** Ende einer Runde (`fr:offer`, das `risk.js` abbricht und den Anspruch übernimmt).
- **Soll-Ergebnis:** **Nur die drei Starttasten** blinken (`.fr-btn--invite`, Periode 1,2 s, gemeinsam) und werden erreichbar (`aria-disabled="false"`); die acht Richtungstasten bleiben dunkel und `aria-disabled="true"`; `REWARD` leuchtet (`.fr-btn--lit`). Ansage im Live-Bereich `risk`: „Risikospiel möglich: RISK START, RISK x4 START oder RISK x8 START drücken. Danach führen die Richtungstasten die Leiter. REWARD schreibt den Gewinn gut."
- **Vorbedingung:** ausgewertete Runde mit Gewinn; Auto-Modus **aus**.
- **Beobachtbar an:** `data-fr-risk-phase` = `offer`; `data-fr-risk-ladder` = `none`; `data-fr-risk-level` = `0`; `data-fr-risk-win` = offener Gewinn; `data-fr-risk-lit` = `none`; `data-fr-offer` = `open`; Ereignis `fr:risk` mit `phase: 'offer'` (abbrechbar); Klasse `fr-btn--invite` an genau drei Tasten. **Kein Klang** — das Angebot steht in jeder Runde und würde sonst zum Dauerton.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:340-359, 516-548`, `Resources/Public/Css/machine.css:1072-1076`.

### F-FRUITRISK-35  Die Leiter starten ist kein Versuch
- **Was:** Der Druck auf eine Starttaste beginnt genau diese Leiter auf **Stufe 1** und **wertet nicht**. Es kann dabei nichts verloren gehen.
- **Wie ausgelöst:** Eine der drei Starttasten (`risk-start`, `risk4-start`, `risk8-start`).
- **Soll-Ergebnis:** Das Einladungsblinken erlischt, die Richtungstasten **dieser** Gruppe werden erreichbar und beginnen zu blinken, `STUFE` zeigt 1, `GEWINN` zeigt den unveränderten Anspruch. `REWARD` holt unmittelbar danach noch den ungeschmälerten Anspruch zurück.
- **Vorbedingung:** offenes Angebot, noch keine Leiter gestartet.
- **Beobachtbar an:** `data-fr-risk-phase` = `ladder`; `data-fr-risk-ladder` = `risk` / `risk4` / `risk8`; `data-fr-risk-level` = `1`; `data-fr-risk-win` unverändert; Ereignis `fr:risk` mit `phase: 'start'`; der Live-Bereich `risk` wird **geleert**, ohne etwas Neues anzusagen.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:404-430`, `casino_startpage/Resources/Public/JavaScript/risk-ladder-multi.js:396-446`.

### F-FRUITRISK-36  Einmal gewählt, bleibt die Leiter
- **Was:** Während eine Leiter läuft, sind die Richtungstasten der beiden anderen Gruppen **und alle drei Starttasten** wirkungslos — kein Fehlgriff, einfach nichts.
- **Wie ausgelöst:** Druck auf eine fremde Richtungstaste oder auf irgendeine Starttaste bei laufender Leiter.
- **Soll-Ergebnis:** Nichts geschieht: kein Treffer, kein Fehlgriff, keine Stufenänderung, kein Geldfluss.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** `data-fr-risk-level` und `data-fr-risk-win` unverändert; kein `fr:risk`-Ereignis; die Tasten der untätigen Gruppen tragen nie `.fr-btn--lit`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:376-382, 404-410`.

### F-FRUITRISK-37  Nie leuchten zwei Risiko-Tasten gleichzeitig
- **Was:** Von den acht Risiko-Tasten leuchtet zu jedem Zeitpunkt höchstens **eine** — ohne Übergang, ohne Nachglühen.
- **Wie ausgelöst:** Laufende Leiter (Blinkwerk).
- **Soll-Ergebnis:** Genau eine Taste trägt `.fr-btn--lit`, alle anderen keine; die Tasten der untätigen Gruppen werden mitgelöscht. Die drei Starttasten tragen **nie** `.fr-btn--lit`.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** `data-fr-risk-lit` trägt den Schlüssel der brennenden Taste (`risk-left`, `risk8-up`, …), sonst `none`; Zählung der Elemente mit `.fr-btn--lit` unter den acht Risiko-Tasten ergibt nie mehr als 1.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:598-613`.

### F-FRUITRISK-38  Treffer auf einer Leiter
- **Was:** Wer die Taste drückt, die in genau diesem Moment leuchtet, vervielfacht den offenen Gewinn mit dem Faktor seiner Gruppe und steigt eine Stufe höher.
- **Wie ausgelöst:** Druck auf eine Richtungstaste **der laufenden Gruppe**, während sie leuchtet.
- **Soll-Ergebnis:** Der Betrag in `GEWINN` fährt auf `alter Betrag × Faktor` hoch, `STUFE` steigt um 1, das Blinkwerk beginnt die nächste Stufe (schneller). Gewertet wird das zuletzt **gemalte** Feld, nicht die Uhr. Klang: zwei steigende Töne (523 → 784 Hz) + Metallschlag.
- **Vorbedingung:** laufende Leiter dieser Gruppe; die gedrückte Taste leuchtet gerade.
- **Beobachtbar an:** `data-fr-risk-win` = alter Wert × Faktor; `data-fr-risk-level` um 1 erhöht; Ereignis `fr:risk` mit `phase: 'hit'`, `{ladder, level, win}`. Im Servermodus zieht ein nachträgliches `fr:risk`-loses Nachmalen (`render('sync')`) nur den Gewinnbetrag nach — kein Licht, keine Tastenfreigabe, keine Ansage, keine Stufenänderung.
- **Umgesetzt in:** `casino_startpage/Resources/Public/JavaScript/risk-ladder-multi.js:459-523`, `Resources/Public/JavaScript/risk.js:723-745, 754-779`.

### F-FRUITRISK-39  Fehlgriff — der gesamte offene Gewinn ist weg
- **Was:** Wer eine Taste drückt, die gerade **nicht** leuchtet (auch in der Dunkelpause), verliert den gesamten offenen Gewinn.
- **Wie ausgelöst:** Druck auf eine Richtungstaste der laufenden Gruppe zum falschen Zeitpunkt. Ein Druck im Dunkeln gilt ausdrücklich als falsch.
- **Soll-Ergebnis:** Der Gewinn wird **verworfen, nicht gutgeschrieben**. Der Gerätekredit bleibt unverändert (der Einsatz war schon beim Rundenstart abgebucht). `GEWINN` fällt auf 0, `STUFE` wird dunkel, alle Lichter aus, `REWARD` erlischt. Das Gerät zeigt und sagt danach **nichts Zusätzliches** an — insbesondere **nicht**, was ein Treffer gebracht hätte. Klang: ein fallender Ton (220 → 110 Hz) wie ein abfallendes Relais.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** Ereignis `fr:risk` mit `phase: 'miss'`, `{ladder, level, win: 0, lost: <verlorener Betrag>}`; `fr:offerend` mit `reason: 'ladder-lost'`, `amount: 0`; `data-fr-risk-win` = `0`; `data-fr-machine-credit` unverändert; Ansage im Live-Bereich `risk`: „Risikospiel verloren auf Stufe {0}. Der Gewinn ist weg."
- **Umgesetzt in:** `casino_startpage/Resources/Public/JavaScript/risk-ladder-multi.js:547-575`, `Resources/Public/JavaScript/risk.js:789-795`, `Resources/Private/Language/locallang.xlf:93-95`.

### F-FRUITRISK-40  Aussteigen mit REWARD während einer laufenden Leiter
- **Was:** `REWARD` schreibt den jeweils aktuellen Leiterstand jederzeit gut und beendet die laufende Leiter.
- **Wie ausgelöst:** Taste `REWARD` bei laufender Leiter.
- **Soll-Ergebnis:** Der aktuelle Betrag wandert in den Gerätekredit; die Leiter endet, alle Lichter aus, `STUFE` dunkel, `GEWINN` zurück auf 0 (die Röhren gehören danach wieder dem Walzenwerk). Klang: Münzkaskade.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** `fr:risk` mit `phase: 'collect'`; `fr:offerend` mit `reason: 'ladder-collect'` und dem Betrag; `fr:collect`; `data-fr-risk-phase` zurück auf `off`; `data-fr-machine-credit` steigt um den Betrag; Ansage „Risikospiel gewonnen: {0} Kredite auf Stufe {1}."
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:438-450, 796-801`, `Resources/Private/Language/locallang.xlf:90-92`.

### F-FRUITRISK-41  START während einer laufenden Leiter bleibt wirkungslos
- **Was:** Solange eine Leiter läuft, kommt keine neue Runde zustande — und es wird auch kein Einsatz abgebucht.
- **Wie ausgelöst:** `START` bei laufender Leiter.
- **Soll-Ergebnis:** Nichts geschieht; die Leiter läuft weiter.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** `fr:round` wird in der Erfassungsphase am Dokument abgefangen (`preventDefault()` **und** `stopPropagation()`); `data-fr-machine-credit` unverändert; `data-fr-state` unverändert.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:453-483`.

### F-FRUITRISK-42  START im stehenden Angebot löst den Anspruch ein
- **Was:** Wer im Angebot statt `REWARD` gleich `START` drückt, bekommt den Gewinn ungeschmälert gutgeschrieben und spielt sofort weiter.
- **Wie ausgelöst:** `START` bei offenem Angebot, ohne dass eine Leiter gestartet wurde.
- **Soll-Ergebnis:** Der Anspruch wird gutgeschrieben, **bevor** die Deckung für den neuen Einsatz geprüft wird; danach läuft die Runde wie gewohnt an.
- **Vorbedingung:** offenes Angebot, keine laufende Leiter.
- **Beobachtbar an:** `fr:offerend` mit `reason: 'start'`; `fr:collect`; anschließend `data-fr-state` = `spinning`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:453-513`.

---

## Risikospiel 1 von 3: „RISK" (Faktor 2)

### F-FRUITRISK-43  Leiter RISK — zwei Tasten, Faktor 2, flache Kurve
- **Was:** Das mildeste der drei Risikospiele: jeder Treffer **verdoppelt** den offenen Gewinn.
- **Wie ausgelöst:** Starttaste `RISK START` (`data-fr-button="risk-start"`, flache Platte 16,8 × 2,6, sichtbare Aufschrift „RISK START"), danach die **zwei** Richtungstasten `risk-left` („Risiko links") und `risk-right` („Risiko rechts"), rund, ⌀ 7,4, als Paar.
- **Soll-Ergebnis (die Zahlen dieser Leiter):**
  - **Zahl der Richtungstasten:** 2 → Chance auf Stufe 1 ist 1 zu 2, reine Chance ohne Können.
  - **Faktor je Treffer:** × 2.
  - **Schwierigkeitskurve:** flach (`CURVE_FLAT`, Exponent Stufe + 4).
  - **Periode je Taste:** 200 ms auf **jeder** Stufe.
  - **Trefferfenster je Stufe:** Stufe 1 = 89 ms, Stufe 2 = 75 ms, Stufe 3 = 64 ms, Stufe 4 = 54 ms, Stufe 5 = 46 ms, **ab Stufe 6 = 40 ms** (Untergrenze, ändert sich danach nicht mehr).
  - **Dunkelzeit je Stufe:** 111 / 125 / 136 / 146 / 154 / 160 ms.
  - **Reihenfolge:** je **Stufe** neu gezogen (`ORDER_PER_LEVEL`) — das klassische Hin und Her.
  - **Pause nach vollem Umlauf:** **keine** (0 ms).
  - **Voller Umlauf:** 2 × 200 ms = **400 ms** → eine einzelne Taste blitzt 2,5-mal je Sekunde.
- **Vorbedingung:** offenes Angebot (Einstieg) bzw. laufende RISK-Leiter (Versuch).
- **Beobachtbar an:** `data-fr-risk-ladder` = `risk`; `data-fr-risk-side` = `200`; `data-fr-risk-on` = `89`/`75`/`64`/`54`/`46`/`40` je nach Stufe; `data-fr-risk-pause` = `0`; `data-fr-risk-cycle` = `400`; `data-fr-risk-level`; `data-fr-risk-win`; `data-fr-risk-lit` ∈ {`risk-left`, `risk-right`, `none`}. Klang: ein Tick bei **523 Hz** je Blinkschritt (`fr:risktick`).
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:160-164`, `casino_startpage/Resources/Public/JavaScript/risk-timing.js:123-161, 260-300`.

---

## Risikospiel 2 von 3: „RISK x4" (Faktor 4)

### F-FRUITRISK-44  Leiter RISK x4 — zwei Tasten, Faktor 4, steile Kurve
- **Was:** Dasselbe Tastenpaar-Prinzip wie RISK, aber jeder Treffer **vervierfacht** — und das Trefferfenster wird viel schneller eng.
- **Wie ausgelöst:** Starttaste `RISK x4 START` (`data-fr-button="risk4-start"`, sichtbare Aufschrift „RISK x4 START"), danach die **zwei** Richtungstasten `risk4-left` („Risiko x4 links") und `risk4-right` („Risiko x4 rechts").
- **Soll-Ergebnis (die Zahlen dieser Leiter):**
  - **Zahl der Richtungstasten:** 2 → Chance auf Stufe 1 ist 1 zu 2.
  - **Faktor je Treffer:** × 4.
  - **Schwierigkeitskurve:** steil (`CURVE_STEEP`, Exponent 2 × Stufe + 5).
  - **Periode je Taste:** 200 ms auf jeder Stufe.
  - **Trefferfenster je Stufe:** Stufe 1 = 64 ms, Stufe 2 = 46 ms, **ab Stufe 3 = 40 ms** (Untergrenze).
  - **Dunkelzeit je Stufe:** 136 / 154 / 160 ms.
  - **Reihenfolge:** je **Stufe** neu gezogen (`ORDER_PER_LEVEL`).
  - **Pause nach vollem Umlauf:** **keine** (0 ms).
  - **Voller Umlauf:** 2 × 200 ms = **400 ms** → 2,5 Blitze je Sekunde je Taste.
- **Vorbedingung:** offenes Angebot bzw. laufende RISK-x4-Leiter.
- **Beobachtbar an:** `data-fr-risk-ladder` = `risk4`; `data-fr-risk-side` = `200`; `data-fr-risk-on` = `64`/`46`/`40`; `data-fr-risk-pause` = `0`; `data-fr-risk-cycle` = `400`; `data-fr-risk-lit` ∈ {`risk4-left`, `risk4-right`, `none`}. Klang: derselbe Tick, höher — **698 Hz**.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:165-169`, `casino_startpage/Resources/Public/JavaScript/risk-timing.js:152-161`.

---

## Risikospiel 3 von 3: „RISK x8" (Faktor 8)

### F-FRUITRISK-45  Leiter RISK x8 — vier Tasten im Kreuz, Faktor 8, steile Kurve, mit Pause
- **Was:** Das schärfste der drei Risikospiele: vier Tasten im Kreuz, jeder Treffer **verachtfacht**, und die Reihenfolge wird bei **jedem Umlauf** neu gezogen, sodass kein Rhythmus erlernbar ist.
- **Wie ausgelöst:** Starttaste `RISK x8 START` (`data-fr-button="risk8-start"`, sichtbare Aufschrift „RISK x8 START"), danach die **vier** Richtungstasten im Kreuz: `risk8-left` („Risiko x8 links"), `risk8-right` („Risiko x8 rechts"), `risk8-up` („Risiko x8 oben"), `risk8-down` („Risiko x8 unten"). Die Reihenfolge der Seitennummern ist links, rechts, oben, unten.
- **Soll-Ergebnis (die Zahlen dieser Leiter):**
  - **Zahl der Richtungstasten:** 4 → Chance auf Stufe 1 ist 1 zu 4.
  - **Faktor je Treffer:** × 8.
  - **Schwierigkeitskurve:** steil (`CURVE_STEEP`), dieselbe wie RISK x4.
  - **Periode je Taste:** 200 ms auf jeder Stufe.
  - **Trefferfenster je Stufe:** Stufe 1 = 64 ms, Stufe 2 = 46 ms, **ab Stufe 3 = 40 ms**.
  - **Reihenfolge:** je **Umlauf** neu gezogen (`ORDER_PER_PASS`) — anders als bei den beiden Paar-Leitern.
  - **Pause nach vollem Umlauf:** **ja**, und sie ist genauso lang wie das Trefferfenster derselben Stufe: 64 ms auf Stufe 1, 46 ms auf Stufe 2, 40 ms ab Stufe 3.
  - **Voller Umlauf:** 4 × 200 ms + Pause = **864 ms** (Stufe 1), **846 ms** (Stufe 2), **840 ms** (ab Stufe 3) → rund 1,2 Blitze je Sekunde je Taste.
- **Vorbedingung:** offenes Angebot bzw. laufende RISK-x8-Leiter.
- **Beobachtbar an:** `data-fr-risk-ladder` = `risk8`; `data-fr-risk-side` = `200`; `data-fr-risk-on` = `64`/`46`/`40`; `data-fr-risk-pause` = `64`/`46`/`40`; `data-fr-risk-cycle` = `864`/`846`/`840`; `data-fr-risk-lit` ∈ {`risk8-left`, `risk8-right`, `risk8-up`, `risk8-down`, `none`}. Klang: **vier unterscheidbare Tonhöhen, eine je Taste** — links 392 Hz, rechts 494 Hz, oben 587 Hz, unten 698 Hz.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:170-174`, `casino_startpage/Resources/Public/JavaScript/risk-timing.js:164-172, 286-300`.

### F-FRUITRISK-46  Die Sicherheitsgrenze für die Blinkgeschwindigkeit
- **Was:** Keine Taste dieses Geräts blitzt öfter als dreimal je Sekunde (WCAG 2.2 SC 2.3.1), und nie leuchten oder überblenden zwei gleichzeitig.
- **Wie ausgelöst:** Jede laufende Leiter, auf jeder Stufe.
- **Soll-Ergebnis:** Die Periode je Taste ist fest **200 ms** und darf nie unterschritten werden; der volle Umlauf ist nie kürzer als **1000/3 ms ≈ 333 ms**. Bei zwei Tasten: 400 ms Umlauf = 2,5 Blitze je Sekunde. Bei vier Tasten: 840–864 ms Umlauf ≈ 1,2 Blitze je Sekunde. Das Leuchten schaltet hart, ohne Übergang und ohne Nachglühen. Das Einladungsblinken der drei Starttasten hat eine Periode von 1,2 s.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-fr-risk-side` (Periode je Taste in ms), `data-fr-risk-on` (Trefferfenster in ms), `data-fr-risk-pause` (Pause in ms), `data-fr-risk-cycle` (voller Umlauf in ms) — alle vier im laufenden Browser ablesbar; `data-fr-risk-cycle` nie unter 333.
- **Umgesetzt in:** `casino_startpage/Resources/Public/JavaScript/risk-timing.js:123-137, 164-172`, `Resources/Public/JavaScript/risk.js:598-613`, `Resources/Public/Css/machine.css:1072-1076`.

### F-FRUITRISK-47  Die Röhrengruppen STUFE und GEWINN im Risikospiel
- **Was:** `STUFE` zeigt die erreichte Leiterstufe, `GEWINN` den aktuell offenen Betrag der Leiter.
- **Wie ausgelöst:** Start und jeder Treffer einer Leiter.
- **Soll-Ergebnis:** `STUFE` (zwei Röhren) startet **dunkel** und zeigt ab dem Leiterstart 1, 2, 3 …; bei zweistelligem Überlauf gibt es ein Überlaufblinken. `GEWINN` (sieben Röhren) fährt den Betrag hoch. Nach Ende der Leiter wird `STUFE` wieder dunkel und `GEWINN` auf 0 gesetzt — die Gruppe gehört danach wieder dem Walzenwerk.
- **Vorbedingung:** laufende Leiter.
- **Beobachtbar an:** `data-fr-risk-level`, `data-fr-risk-win`; die gezeichneten Röhren tragen `aria-hidden="true"`, ihre Werte reisen für Hilfsmittel durch den Live-Bereich `risk`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:684-722, 723-779`, `Resources/Private/Partials/Automat/FruitRisk/Machine/NixieGroup.html`.

### F-FRUITRISK-48  Die Leiter sagt ihren Ausgang an, nicht jede Stufe
- **Was:** Für Hilfsmittel gibt es genau **zwei** Ansagen je Runde mit Risikospiel: dass eines möglich ist, und wie es ausgegangen ist.
- **Wie ausgelöst:** Öffnen des Angebots bzw. Ende einer Leiter.
- **Soll-Ergebnis:** Gewonnen: „Risikospiel gewonnen: {Betrag} Kredite auf Stufe {Stufe}." Verloren: „Risikospiel verloren auf Stufe {Stufe}. Der Gewinn ist weg." Es gibt ausdrücklich **keine** Ansage je Stufe (acht Ansagen in zwei Sekunden wären unbenutzbar).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Textinhalt des Live-Bereichs `data-fr-announce="risk"` (`role="status"`), der vor der ersten Runde **leer** ist und bei jedem Rundenbeginn geleert wird.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:663-668`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:480-483`.

### F-FRUITRISK-49  Verlassen der Seite mit laufender Leiter
- **Was:** Wer mitten in einer Leiter die Seite verlässt, verliert den offenen Gewinn nicht — er wird gutgeschrieben.
- **Wie ausgelöst:** Seitenwechsel bei `data-fr-risk-phase` = `ladder` oder `offer`.
- **Soll-Ergebnis:** Der offene Gewinn wandert in den Gerätekredit und mit diesem zurück in die Kasse. Angesagt wird dabei nichts.
- **Vorbedingung:** laufende Leiter oder stehendes Angebot.
- **Beobachtbar an:** Kassenstand nach dem Wechsel um den Betrag höher; `data-fr-total` bleibt stimmig; alle `data-fr-risk-*`-Messpunkte sind vom Gehäuse entfernt.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:826-868`, `Resources/Public/JavaScript/fruit-risk.js:118-121`.

---

## Der Auto-Modus

### F-FRUITRISK-50  AUTO MODE einschalten
- **Was:** Das Gerät spielt selbstständig weiter — denselben Weg wie ein Mensch, mit derselben Abbuchung und derselben Deckungsprüfung.
- **Wie ausgelöst:** Taste `AUTO MODE` (Kappe 20 × 10, links außen im Bedienfeld, `data-fr-button="auto"`), Zeiger oder Tastatur. Es ist ein **Umschalter**, kein Drucktaster.
- **Soll-Ergebnis:** Die Taste leuchtet (`.fr-btn--lit`) und trägt `aria-pressed="true"`. Rund **eine Sekunde** nach jeder Auswertung löst das Gerät die nächste Runde selbst aus. Klang: Umschaltklang, steigend (330 → 440 Hz).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-fr-auto` = `on`; `aria-pressed="true"` an der Taste; Ereignis `fr:auto` mit `{on: true, reason: 'user', rounds}`; `data-fr-auto-rounds` zählt die selbst ausgelösten Züge hoch; `data-fr-auto-pending` = `1`, solange die Pause läuft.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`enable()`, `arm()`, `fire()`), `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:213-214`.

### F-FRUITRISK-51  Im Auto-Modus entfällt jedes Angebot
- **Was:** Solange der Auto-Modus an ist, gibt es **kein** Risikospiel; der Gewinn wird sofort gutgeschrieben.
- **Wie ausgelöst:** Automatisch bei jeder Auswertung, solange der Schalter im Augenblick des Angebots an ist.
- **Soll-Ergebnis:** Keine Taste blinkt, keine Starttaste lädt ein, alle elf Risiko-Bedienteile bleiben `aria-disabled="true"`. Der Gewinn steht unmittelbar im Gerätekredit.
- **Vorbedingung:** Auto-Modus an.
- **Beobachtbar an:** `fr:risk` `phase: 'offer'` ist `defaultPrevented`; `fr:offerend` mit `reason: 'auto'`; keine Taste mit `.fr-btn--invite` oder `.fr-btn--lit` unter den elf Risiko-Bedienteilen; `data-fr-risk-phase` bleibt `off`.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`onRisk()`), `Resources/Public/JavaScript/risk.js:351-359`.

### F-FRUITRISK-52  Die vier Umschaltzeitpunkte
- **Was:** Maßgeblich ist stets der Schalterstand **im Augenblick des Angebots**, nicht der zum Zeitpunkt des Tastendrucks.
- **Wie ausgelöst:** Umschalten in vier verschiedenen Situationen.
- **Soll-Ergebnis:**
  1. **Eingeschaltet während eines laufenden Zugs:** Das Angebot dieses Zugs entfällt, der Gewinn wird sofort gutgeschrieben; die selbst ausgelöste Rundenfolge beginnt erst mit der nächsten Auswertung (`fr:offerend` `reason: "auto"`).
  2. **Ausgeschaltet während eines laufenden Zugs:** Das Angebot kommt wie immer, die drei Starttasten laden ein (kein `fr:offerend`).
  3. **Eingeschaltet, während das Angebot steht:** Der Gewinn wird genommen, kein Risikospiel (`fr:offerend` `reason: "auto"`, ausdrücklich nicht `"reward"` — sonst wäre es nicht von einer Handbedienung zu unterscheiden).
  4. **Eingeschaltet, während eine Leiter läuft:** Dieselbe Wirkung — die Leiter steigt mit dem bereits vervielfachten Gewinn aus (`fr:offerend` `reason: "ladder-collect"`).
- **Vorbedingung:** je nach Fall.
- **Beobachtbar an:** `reason`-Feld des `fr:offerend`-Ereignisses; `data-fr-machine-credit` steigt um den jeweiligen Betrag; `data-fr-risk-phase` zurück auf `off`.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`enable()` sendet `fr:riskcollect`), `Resources/Public/JavaScript/risk.js:438-450`.

### F-FRUITRISK-53  Selbstabschaltung, wenn der Gerätekredit nicht mehr reicht
- **Was:** Kommt eine selbst ausgelöste Runde wegen zu geringen Gerätekredits nicht zustande, schaltet sich der Auto-Modus **selbst** ab.
- **Wie ausgelöst:** Zeitablauf der Pause bei Gerätekredit < 10.
- **Soll-Ergebnis:** Die Taste geht dunkel und auf `aria-pressed="false"`; die Tafel zeigt „GUTHABEN ZU GERING"; Klang: Umschaltklang, fallend (440 → 330 Hz) plus der tiefe Anschlag der Absage.
- **Vorbedingung:** Auto-Modus an, Gerätekredit < 10.
- **Beobachtbar an:** `fr:auto` mit `{on: false, reason: 'insufficient'}`; `data-fr-auto` = `off`.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`fire()`, `disable('insufficient')`).

### F-FRUITRISK-54  Höchstens ein Zeitgeber je Gerät
- **Was:** Der Auto-Modus hält nie mehr als eine Pause gleichzeitig; die Walzen hält er gar nicht an (das tut das Walzenwerk ohnehin von allein).
- **Wie ausgelöst:** Laufender Auto-Modus.
- **Soll-Ergebnis:** Wer während der Pause selbst `START` drückt, startet eine zusätzliche Runde; feuert der Zeitgeber dann in einen laufenden Zug, geschieht nichts und es wird **nicht** abgeschaltet — ein besetzter Automat ist kein Veto.
- **Vorbedingung:** Auto-Modus an.
- **Beobachtbar an:** `data-fr-auto-pending` ist stets `0` oder `1`, nie mehr.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`arm()`, `disarm()`, `syncAttributes()`).

### F-FRUITRISK-55  START, STOP und REWARD bleiben im Auto-Modus benutzbar
- **Was:** Die drei Tasten verhalten sich unverändert, auch während der Auto-Modus läuft.
- **Wie ausgelöst:** Tastendruck bei laufendem Auto-Modus.
- **Soll-Ergebnis:** `STOP` verkürzt die Runde (die nächste Pause spannt dann früher), `START` während der Pause startet eine zusätzliche Runde.
- **Vorbedingung:** Auto-Modus an.
- **Beobachtbar an:** `data-fr-state`-Folge; `data-fr-auto-rounds` zählt nur die **selbst** ausgelösten Züge.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js` (`fire()`, `onResult()`).

---

## Der Klang

Aller Klang entsteht im Browser aus Tonfrequenzen (Web Audio API) — keine
Audiodatei, nichts gesampelt. Vor der ersten echten Nutzergeste entsteht kein
`AudioContext`; jeder Klangaufruf liefert davor still 0.

### F-FRUITRISK-56  Ton-Schalter am Sockel
- **Was:** Schaltet den Ton **dieses** Automaten ein und aus. Standardmäßig eingeschaltet.
- **Wie ausgelöst:** Kippschalter mit Lämpchen am Sockel, rechts neben der Auswurfschale (`data-fr-sound`, sichtbare Aufschrift „TON"). Kein dreizehntes Bedienteil aus der Tastenvorlage, sondern ein eigener `aria-pressed`-Umschalter.
- **Soll-Ergebnis:** Einschalten bestätigt eine kurze, doppelte Klinke; beim Ausschalten klingt **nichts** — die eintretende Stille ist die Rückmeldung. Mehrere Automaten auf einer Seite teilen sich zwar einen `AudioContext`, aber nicht ihren Ein/Aus-Zustand.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-fr-sound-on` = `on`/`off` am Gehäuse; `aria-pressed` und Klasse `fr-sound--on` am Schalter; `data-fr-sound-sustained` (laufende Dauerklänge, `0`/`1`); `data-fr-sound-dropped` (verworfene Stimmen, im Dauerlauf `0`).
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:685-710, 790-840`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:365-370`.

### F-FRUITRISK-57  Ton-Schalter folgt einer anderen Registerkarte
- **Was:** Schaltet der Besucher den Ton in einer anderen Registerkarte um, zieht dieses Gerät den Zustand nach.
- **Wie ausgelöst:** Änderung des geteilten Ton-Zustands (Browserspeicher).
- **Soll-Ergebnis:** Schalter, Lämpchen und Messpunkt folgen sofort, ohne dass jemand hier etwas drückt; ein nachgemachtes Ereignis erteilt dabei **keine** Tonfreigabe.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `aria-pressed` und `data-fr-sound-on` folgen dem geteilten Zustand.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:790-815`.

### F-FRUITRISK-58  Die Klangzuordnung dieses Geräts
- **Was:** Welcher Klang zu welchem Ereignis gehört. Die Stimme ist eigens für dieses Gerät erfunden — beim Fünf-Walzen-Nachbarn **fallen** die Walzenstopps, hier **steigen** sie.
- **Wie ausgelöst:** Die jeweiligen Spielereignisse.
- **Soll-Ergebnis (vollständige Zuordnung):**
  - **Erste echte Nutzergeste:** Kontext entsteht, Leerlaufgeräusch beginnt — kein Ton.
  - **Runde startet** (`fr:state` → `spinning`): zwei steigende Rechteckstöne 180 → 240 Hz + Klinke.
  - **Walzen laufen:** Laufgeräusch, ein Rauschstoß alle **52 ms**.
  - **Jede Walze steht** (`fr:reelrest`): sechs **steigende** Töne 262 / 294 / 330 / 370 / 415 / 466 Hz + kurzer Blechschlag.
  - **Rundengewinn** (`fr:result`): Gewinn-Jingle, 2 bis 5 steigende Ganztonschritte ab **392 Hz**, gestaffelt nach Gewinnhöhe (1–3 / 4–9 / 10–39 / ab 40 Kredite), gefolgt von der Registrierkasse.
  - **Angebot steht** (`fr:risk` `phase: 'offer'`): **kein Klang** — käme sonst in jeder Runde und würde zum Dauerton.
  - **Leiter RISK blinkt** (`fr:risktick`): ein Tick bei **523 Hz**.
  - **Leiter RISK x4 blinkt:** derselbe Tick, höher — **698 Hz**.
  - **Leiter RISK x8 blinkt:** vier unterscheidbare Tonhöhen, eine je Taste — links **392**, rechts **494**, oben **587**, unten **698 Hz**.
  - **Treffer** (`fr:risk` `phase: 'hit'`): zwei steigende Töne 523 → 784 Hz + Metallschlag.
  - **Fehlgriff** (`fr:risk` `phase: 'miss'`): ein fallender Ton 220 → 110 Hz, wie ein abfallendes Relais.
  - **AUTO MODE umgelegt** (`fr:auto`): ein steigt 330 → 440 Hz, aus fällt 440 → 330 Hz.
  - **Ton-Schalter ein:** kurze, doppelte Klinke. **Aus:** kein Klick.
  - **Münzeinwurf angenommen / abgelehnt** (`fr:coin`): Münzklang bzw. zurückgegebene Münze + tiefer Anschlag.
  - **Gewinn gutgeschrieben** (`fr:collect`): Münzkaskade, nach Betrag gestaffelt.
  - **CASH OUT** (`fr:cashout`): Blech + Münzkaskade.
  - **Zählschritt der Anzeige GUTHABEN** (`fr:count`): ein Zählschritt je sichtbarem Schritt — **kein** Klang für GEWINN oder STUFE.
  - **Abgelehnter Zug** (`fr:round` am Dokument, Blasenphase, `defaultPrevented`): ein tiefer, hörbarer Anschlag — die Absage.
  - **Leerlauf:** Brummen (eine Instanz je Gehäuse); es schweigt vollständig, solange das Gerät arbeitet **oder** eine Leiter läuft.
- **Vorbedingung:** Ton eingeschaltet; erste echte Nutzergeste erfolgt.
- **Beobachtbar an:** hörbar; messbar an `data-fr-sound-dropped` (muss im Dauerlauf `0` bleiben) und `data-fr-sound-sustained`; `fr:count` mit `{display, value, index, steps, direction}`.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:165-245, 360-690`, `Resources/Public/JavaScript/counter.js:285-296`.

### F-FRUITRISK-59  Der Startklang hängt am Zustand, nicht am Tastendruck
- **Was:** Der Startklang ertönt nur, wenn die Runde wirklich zustande gekommen ist.
- **Wie ausgelöst:** `fr:state` mit `to === 'spinning'` — bei einem Tastendruck ebenso wie beim selbst ausgelösten Zug des Auto-Modus.
- **Soll-Ergebnis:** Ein abgelehnter Zug klingt **nicht** wie ein Start, sondern nur nach der tiefen Absage.
- **Vorbedingung:** keine.
- **Beobachtbar an:** hörbar; `data-fr-state`-Wechsel.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:177-186, 378-420`.

---

## Anzeigen, Bedienwege und Barrierefreiheit

### F-FRUITRISK-60  Fünfzehn Bedienteile, jedes mit eigenem Namen
- **Was:** Am Gehäuse gibt es fünfzehn Bedienteile (plus Ton-Schalter, Münzschlitz, drei Aufladeknöpfe, Betragsfeld und CASH OUT), alle als echte `<button>` und alle mit einem eigenen, unterscheidenden Namen.
- **Wie ausgelöst:** Tabulatortaste oder Zeiger.
- **Soll-Ergebnis:** Sichtbare Aufschrift bei START, STOP, AUTO MODE, REWARD und den drei Starttasten; `aria-label` bei den acht namenlosen Risiko-Tasten („Risiko links", „Risiko x4 rechts", „Risiko x8 oben" …). Jedes Bedienteil reagiert auf Zeiger **und** Tastatur; ein sichtbarer Fokusrahmen erscheint bei Tastaturbedienung.
- **Vorbedingung:** keine.
- **Beobachtbar an:** je ein `<button type="button" class="fr-btn …" data-fr-button="<schlüssel>">` im HTML; nicht leerer erreichbarer Name; CSS-Regel `.fr-cabinet :focus-visible`.
- **Umgesetzt in:** `Resources/Private/Partials/Automat/FruitRisk/Machine/Button.html:122-152`, `Resources/Private/Language/locallang.xlf:25-78`, `Resources/Public/JavaScript/press.js`.

### F-FRUITRISK-61  Druckrückmeldung an der Kappe
- **Was:** Eine gedrückte Taste sinkt sichtbar ein — bei Zeiger **und** Tastatur.
- **Wie ausgelöst:** `pointerdown` bzw. `keydown` (Enter/Leertaste).
- **Soll-Ergebnis:** Die Kappe trägt `.fr-btn--pressed`, solange gedrückt wird, und hebt beim Loslassen wieder ab. Ein Rechts- oder Mittelklick löst **nie** aus. Ein Hilfsmittel, das `click` direkt synthetisiert, löst genau **einmal** aus, nie doppelt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Klasse `fr-btn--pressed`; genau eine Auslösung je Bedienweg.
- **Umgesetzt in:** `Resources/Public/JavaScript/press.js:97-192`.

### F-FRUITRISK-62  Vier Live-Bereiche, je genau ein Eigentümer
- **Was:** Für Hilfsmittel gibt es genau **vier** Ansagebereiche: `machine` (Betriebszustand/Tafel), `grid` (Sichtfeld und Rundenergebnis), `credit` (Kasse und Gerätekredit), `risk` (Angebot und Ausgang eines Risikospiels).
- **Wie ausgelöst:** Die jeweiligen Spielereignisse.
- **Soll-Ergebnis:** Alle vier stehen im ausgelieferten HTML **leer** und bleiben leer, bis wirklich etwas geschieht — beim bloßen Öffnen der Seite wird nichts angesagt. Je Bereich schreibt genau ein Modul; Ansagen werden entprellt (700 ms), damit eine Zählfahrt nicht dutzendfach vorgelesen wird. Die vier Röhrengruppen bringen ausdrücklich **keinen** fünften Bereich mit.
- **Vorbedingung:** keine.
- **Beobachtbar an:** vier `<p class="fr-offscreen" data-fr-announce="machine|grid|credit|risk" role="status">`; Textinhalt vor der ersten Bedienung leer.
- **Umgesetzt in:** `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:456-483`, `Resources/Public/JavaScript/announce.js`.

### F-FRUITRISK-63  Gewinnplan als verborgene Tabelle
- **Was:** Der hinter Glas gezeichnete Gewinnplan ist für Hilfsmittel unsichtbar; dieselben 48 Werte stehen deshalb zusätzlich als echte Tabelle im HTML.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Eine `<h2>` „GEWINNPLAN" macht den Abschnitt per Überschriftensprung auffindbar; darunter eine `<table>` mit `<caption>`, Spaltenköpfen, Zeilenköpfen je Symbol und dem Feldtreppen-Hinweis. Verborgen wird ausschließlich über `clip-path` (`.fr-offscreen`), nie über `display` oder `visibility`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<h2 class="fr-offscreen">` und `<table class="fr-offscreen">` im Seitenquelltext; die Werte stammen aus `{machine.paytable}`.
- **Umgesetzt in:** `Resources/Private/Partials/Automat/FruitRisk/Machine/Cabinet.html:404-430`, `Classes/DataProcessing/CabinetProcessor.php`.

### F-FRUITRISK-64  Kein Kanal ist rein farblich
- **Was:** Ein Treffer wird nicht nur durch Farbe gemeldet.
- **Wie ausgelöst:** Auswertung einer Runde.
- **Soll-Ergebnis:** Zusätzlich zur Farbe bekommt eine getroffene Zelle eine **Form** (`.fr-cell--win`, ein Rahmen), die getroffene Gewinnlinie wird als **sichtbare Linie** eingeblendet (`.fr-payline--win`, über `opacity`), und die Ansage im Bereich `grid` nennt Betrag und Linien zusätzlich als **Text**.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Klassen `fr-cell--win` und `fr-payline--win`; Textinhalt des Live-Bereichs `grid`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:469-490`, `Resources/Private/Partials/Automat/FruitRisk/Machine/Grid.html:59-64`.

### F-FRUITRISK-65  Die Saal-Miniatur auf der Startseite
- **Was:** Im Spielsaal steht eine verkleinerte Zeichnung desselben Geräts mit dem Kopfschild „FRUITRISK".
- **Wie ausgelöst:** Ein Inhaltselement „Casino-Automat" auf der Startseite, das FruitRisk gewählt hat.
- **Soll-Ergebnis:** Genau ein `.ck-cabinet` mit genau einem `<svg class="ck-cabinet__drawing">` im Verhältnis 100 : 160, darin dieselben zwölf Symbole und dieselbe Feldstellung wie am großen Gehäuse. Die Zeichnung trägt `aria-hidden="true"`; Breite, Podest, Schattenwurf und Licht liefert der Saal.
- **Vorbedingung:** Automatenseite angelegt und im Element verknüpft.
- **Beobachtbar an:** `.ck-cabinet--fruit-risk` im Saal-HTML; sichtbarer Text „FRUITRISK" im Kopfschild.
- **Umgesetzt in:** `Resources/Private/Partials/Automat/FruitRisk/Cabinet.html:38-222`, `Resources/Private/Language/locallang.xlf:14-16`.

### F-FRUITRISK-66  Zielgröße der Bedienteile skaliert mit dem Gehäuse
- **Was:** Jedes Bedienteil wächst und schrumpft mit dem Gehäuse; es gibt keine absolute Mindestgröße.
- **Wie ausgelöst:** Ändern der Fensterbreite bzw. -höhe.
- **Soll-Ergebnis (nachgemessene Zahlen, Fensterhöhe 900 px):** `+10`/`+100`/`+500` und das Betragsfeld erreichen 24 × 24 px ab rund **469 px** Fensterbreite; die acht runden Risiko-Tasten ab rund **528 px** Gehäusebreite (560 px Fensterbreite); `RISK x8 START` trägt die Abstandsausnahme erst ab rund **738 px** Gehäusebreite (770 px Fensterbreite); der Ton-Schalter erreicht bei 900 px Fensterhöhe keine der vier gemessenen Breiten (höchstens 23 px), bei 1200 px Fensterhöhe jedoch 28,2 px.
- **Vorbedingung:** keine.
- **Beobachtbar an:** gemessene Kantenlängen der Bedienteile im Browser bei verschiedenen Fenstergrößen.
- **Umgesetzt in:** `Resources/Public/Css/machine.css` (Koordinatentabelle im Dateikopf, `--fr-u: 0.625cqi`).

---

## QR-Modus: Kasse und Gerätekredit laufen über den Server

### F-FRUITRISK-67  Serverseitiges Konto statt Browserspeicher
- **Was:** Ist der QR-Modus eingeschaltet, laufen Kasse und Gerätekredit dieses Automaten über den Server statt über den Browserspeicher. Der Automat selbst kennt den Unterschied nicht — er ruft nur die Kassen-Schnittstelle des Site Package.
- **Wie ausgelöst:** Schalterstellung des QR-Modus (liegt außerhalb dieser Extension); wirkt bei jedem Einwurf, Einsatz, Gewinn und jeder Auszahlung.
- **Soll-Ergebnis:** Dieselben Anzeigen und dieselben Messpunkte wie im Browserspeicher-Betrieb; die Buchungen liegen aber auf dem Konto des angemeldeten Spielers. Auf der Leiter wird der erhöhte Gewinn **sofort** (optimistisch) gesetzt, und eine später eintreffende Serverbestätigung zieht **nur** den Gewinnbetrag nach — kein Licht, keine Tastenfreigabe, keine Ansage, keine Stufenänderung.
- **Vorbedingung:** QR-Modus an, Spieler angemeldet.
- **Beobachtbar an:** `data-fr-risk-win` wird nach einer Serverbestätigung ohne Stufen- oder Lichtwechsel aktualisiert; `data-fr-risk-level` und `data-fr-risk-lit` bleiben dabei unverändert.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:754-779` (Zweig `'sync'`), `casino_startpage/Resources/Public/JavaScript/risk-ladder-multi.js:485-540`, `casino_startpage/Resources/Public/JavaScript/account-backend.js`.

### F-FRUITRISK-68  Verbindungsabriss mitten im Spiel
- **Was:** Wer mitten im Spiel die Verbindung verliert, bekommt die Sperranzeige.
- **Wie ausgelöst:** Ausfall der Serververbindung im QR-Modus.
- **Soll-Ergebnis:** Solange die Sperranzeige steht, wird nichts gebucht und nichts weitergerechnet. Was in der Sekunde des Abrisses noch nicht gebucht war, ist verloren.
- **Vorbedingung:** QR-Modus an.
- **Beobachtbar an:** Sperranzeige des Site Package (liegt außerhalb dieser Extension).
- **Umgesetzt in:** `casino_startpage/Resources/Public/JavaScript/account-backend.js` (die eine Umschaltstelle; dieses Gerät enthält dafür keinen eigenen Code).

---

## Beobachtungen, nicht bewertet

- Der Dateikopf von `Classes/FruitRisk.php:43-51` sagt zum Gerätekredit-Schlüssel „Nach Phase F2 weiterhin ungenutzt — das Gerät … nimmt erst ab F4 Geld an"; `Resources/Public/JavaScript/wallet.js:102` benutzt denselben Schlüssel inzwischen tatsächlich.
- Der Dateikopf von `Configuration/JavaScriptModules.php:31-33` trägt noch den „STAND F1: unter Resources/Public/JavaScript/ liegt noch kein Modul. Diese Datei ist damit noch wirkungslos"; dort liegen inzwischen 18 Module.
- `Resources/Private/Partials/Automat/FruitRisk/Machine/Button.html:82-90` beschreibt das Argument `disabled` als „ab Phase F5c nur noch für den Notfall vorhanden … kein einziger f:render-Aufruf reicht das Argument noch durch"; `Machine/Cabinet.html` reicht es an elf Stellen durch (Zeilen 221-252).
- `Machine/Button.html:73-77` und mehrere Kommentare sprechen von „zwölf Bedienteilen", der README und `Cabinet.html:98-108` von fünfzehn Aufrufen der Tastenvorlage.
- README, Abschnitt „Die drei Risikospiele", sagt zur Leiter „Ein Druck auf eine Starttaste beginnt genau diese Leiter auf Stufe 1 und **wertet nicht**"; `risk-ladder-multi.js` `start()` setzt `level = 1` ohne Vervielfachung, `hit()` vervielfacht bei jedem Treffer, auch beim ersten (dem Übergang von Stufe 1 auf Stufe 2).
- Der Dateikopf von `machine.js:101-112` und `payout.js:10-27` sprechen von einer „künftigen Phase F5" (Auto-Modus, Risikospiel); beides ist inzwischen umgesetzt.
- `Resources/Private/ContentElements/Machine.html:18-21` trägt noch die Zeile „STAND F2: … Das JavaScript kommt erst in Phase F4: es wird hier deshalb noch kein Modul eingebunden"; drei Kommentarblöcke weiter unten und in Zeile 41 wird das Modul eingebunden.
- Die README nennt im Abschnitt „Das Bedienfeld" fünfzehn Bedienteile und im Abschnitt „Barrierefreiheit" an einer Stelle „Alle zwölf Bedienteile sind seit Phase F5 verdrahtet".
- Die README nennt unter „Was noch nicht da ist" das serverseitige Guthaben als ausdrückliches Nicht-Ziel und beschreibt es zugleich unter „Aus Teil D ist eingearbeitet" als seit Phase D3 wirksam.

---

<!-- ===================== roulette ===================== -->

# Funktionsinventur: Extension `roulette` (Der Roulettetisch)

Der amerikanische Roulettetisch des Casino Kunterbunt: ein Rad mit 38 Fächern
(1–36, `0`, `00`), ein Tuch mit 159 Setzfeldern, eine Kugel, deren Lauf im
Browser simuliert wird, Geld aus der gemeinsamen Kasse und — seit Umsetzungsstück
D5-3 — ein Anschluss an die QR-Lobby, in der mehrere Menschen dieselbe Runde sehen.
Diese Datei listet auf, was ein Mensch an diesem Tisch bedienen kann und was
dabei geschehen soll.

## Rückseite: Backend und Aufstellung

### F-ROULETTE-001  Inhaltselement „Roulette" anlegen
- **Was:** Ein Redakteur legt auf einer Seite ein Inhaltselement „Roulette" an; damit steht der Spieltisch auf dieser Seite.
- **Wie ausgelöst:** Backend → Seite → „Neues Inhaltselement" → Gruppe der Casino-Elemente → „Roulette" (`CType` = `roulette`), speichern.
- **Soll-Ergebnis:** Das Element wird ohne jede Einstellung gespeichert (leere Feldliste, nur die Systemfelder Typ/Spalte/Sprache/Zugriff/Notizen). Im Frontend dieser Seite erscheint danach der vollständige Tisch: Tischzeichnung, Rad, Tuch mit 159 Feldern, Bedienleiste, Ton-Schalter, Verlaufsstreifen.
- **Vorbedingung:** Extension aktiviert; Cache geleert. Das Element hat keine eigene Datenbankspalte und keine `ext_tables.sql`.
- **Beobachtbar an:** Datenbankspalte `tt_content.CType` = `roulette`; im Frontend das Wurzelelement `<div class="ck-table ro-table" data-ck-table data-ck-table-key="roulette">`; Backend-Beschriftung „Roulette" aus `locallang_be.xlf:tt_content.CType.roulette`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:26-35`; `ext_localconf.php:74-94`; `Resources/Private/ContentElements/Table.html:62-113`; `Resources/Private/Language/locallang_be.xlf:6-11`.

### F-ROULETTE-002  Anmeldung als Spieltisch im Saal (Geräte-Registry)
- **Was:** Der Tisch meldet sich beim Site Package als Gerät der Gattung „Tisch" an, damit er im Spielsaal als Kachel wählbar ist.
- **Wie ausgelöst:** Automatisch beim Laden von `ext_localconf.php` (also beim Aktivieren der Extension).
- **Soll-Ergebnis:** Im Backend erscheint „Roulette" in der Auswahlliste des Inhaltselements „Casino-Automat", in der Gruppe der Tische (nicht der Automaten). Im Saal kann eine Kachel auf die Roulette-Seite verweisen.
- **Vorbedingung:** `casino_startpage` >= 0.5.0 installiert.
- **Beobachtbar an:** Auswahleintrag „Roulette" mit der Beschreibung „Amerikanisches Rad mit 38 Fächern und doppelter Null. Die Kugel läuft wirklich – wo sie liegen bleibt, ist das Ergebnis." (`locallang.xlf:automat.title` / `automat.description`); Kachel im Saal mit `.ck-cabinet`.
- **Umgesetzt in:** `ext_localconf.php:26-33`; `Classes/Roulette.php:22-39`; `Resources/Private/Language/locallang.xlf:6-11`.

### F-ROULETTE-003  Kachel (Miniatur) des Tisches im Saal
- **Was:** Im Spielsaal zeigt eine kleine Zeichnung, wie der Tisch aussieht — Tischplatte, Rad und Zahlenfeld.
- **Wie ausgelöst:** Aufruf der Saal-/Startseite, auf der ein „Casino-Automat"-Element auf diesen Tisch zeigt.
- **Soll-Ergebnis:** Genau ein `.ck-cabinet` mit genau einem `<svg class="ck-cabinet__drawing">` im Seitenverhältnis 160 : 100 (Gattung Tisch, quer). Die Kachel führt beim Anklicken auf die Roulette-Seite.
- **Vorbedingung:** Kachel im Saal eingerichtet (Inhaltselement „Casino-Automat" mit Zielseite).
- **Beobachtbar an:** `.ck-cabinet__drawing` mit `viewBox` im Verhältnis 160:100 im Saal-Markup.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Roulette/Cabinet.html:1-139`; `Classes/Roulette.php:36`.

## Das Tuch: die Einsatzarten

Alle 159 Setzfelder sind echte `<button type="button">` mit `data-ck-field="<Kennung>"`.
Ein Klick (oder Eingabe-/Leertaste) legt den gerade gewählten Chip auf das Feld,
ein zweiter Weg (Zurücknehmen in der Bedienleiste) holt ihn wieder herunter.
Für **jede** Einsatzart gilt gemeinsam: Höchsteinsatz je Feld = `min(10 € × abgedeckte Zahlen, 100 €)`,
Rundenhöchstbetrag über alle Felder = **100 €**. Trifft die Kugel eine abgedeckte
Zahl, bekommt die Spielerin den Einsatz plus die Auszahlung; sonst verfällt er.

### F-ROULETTE-010  Einsatz auf eine einzelne Zahl (Plein) — 35 : 1
- **Was:** Ein Chip auf genau eine der 38 Zahlen (`0`, `00`, `1`…`36`); trifft die Kugel genau diese Zahl, zahlt sie 35 : 1.
- **Wie ausgelöst:** Klick/Tastendruck auf eins der 38 Zahlenfelder (`data-ck-field="n-0"`, `n-00`, `n-1` … `n-36`). Die Zahlen erscheinen als farbiges Oval, `0`/`00` als Pfeilfeld.
- **Soll-Ergebnis:** Auf dem Feld liegt ein sichtbarer Chipstapel; der gesetzte Betrag wandert vom Buy-in auf das Tuch. Bei Treffer: Rückgabe = Einsatz × 36.
- **Vorbedingung:** Runde offen (`data-ro-state="setzen"`), Buy-in vorhanden, Feldgrenze 10 € und Rundengrenze 100 € nicht überschritten.
- **Beobachtbar an:** `<button data-ck-field="n-17">` enthält `<span data-ck-stack>` mit Chip-SVGs; `aria-label` nennt Name, Auszahlung, Höchsteinsatz und gesetzten Betrag („17, schwarz, zahlt 35 zu 1, …"); nach der Auswertung `data-ro-result="17"`, `data-ro-colour="black"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/bets-roulette.js:139-146` (Feldliste), `Classes/BetLayout.php:378-397`, `Resources/Private/Partials/Table/Roulette/Felt.html:93-100`.

### F-ROULETTE-011  Split (zwei benachbarte Zahlen) — 17 : 1
- **Was:** Ein Chip auf die Linie zwischen zwei Zahlen, die auf dem Tuch aneinandergrenzen; trifft eine von beiden, zahlt sie 17 : 1.
- **Wie ausgelöst:** Klick auf eins der 60 Split-Felder (`data-ck-field="s-<a>-<b>"`, z. B. `s-1-2`, `s-0-00`, `s-0-1`, `s-00-3`).
- **Soll-Ergebnis:** Chipstapel auf der Linie; Höchsteinsatz 20 €. Bei Treffer Rückgabe = Einsatz × 18.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 20 €.
- **Beobachtbar an:** `data-ck-field` beginnt mit `s-`; `aria-label` „Zwei Zahlen 1 und 2, …". Es gibt bewusst **keine** Splits `0-2` und `00-2` (die Felder berühren sich auf diesem Tuch nicht).
- **Umgesetzt in:** `bets-roulette.js:148-169`, `Classes/BetLayout.php:400-427`, `locallang.xlf:99-101`.

### F-ROULETTE-012  Dreierreihe (Street) — 11 : 1
- **Was:** Ein Chip am Kopf einer Tuchspalte deckt deren drei Zahlen ab (z. B. 1, 2, 3); Treffer zahlt 11 : 1.
- **Wie ausgelöst:** Klick auf eins der 12 Felder `data-ck-field="st-<erste Zahl>"` (`st-1`, `st-4`, … `st-34`).
- **Soll-Ergebnis:** Chipstapel am Reihenkopf; Höchsteinsatz 30 €. Bei Treffer Rückgabe = Einsatz × 12.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 30 €.
- **Beobachtbar an:** `data-ck-field` beginnt mit `st-`; `aria-label` „Dreierreihe 1, 2 und 3, …".
- **Umgesetzt in:** `bets-roulette.js:171-177`, `Classes/BetLayout.php:430-437`, `locallang.xlf:102-104`.

### F-ROULETTE-013  Trio an der Null — 11 : 1
- **Was:** Drei Zahlen rund um die beiden Nullen: `0-1-2`, `0-00-2` und `00-2-3`; Treffer zahlt 11 : 1. Eigene Bauform, weil diese drei Felder die Nullspalte mit dem Zahlenfeld verbinden.
- **Wie ausgelöst:** Klick auf `data-ck-field="t-0-1-2"`, `t-0-00-2` oder `t-00-2-3`.
- **Soll-Ergebnis:** Chipstapel an der Nullspalte; Höchsteinsatz 30 €. Bei Treffer Rückgabe = Einsatz × 12.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 30 €.
- **Beobachtbar an:** `data-ck-field` beginnt mit `t-`; `aria-label` „Dreierwette 0, 00 und 2, …".
- **Umgesetzt in:** `bets-roulette.js:178-180`, `Classes/BetLayout.php:439-441`, `locallang.xlf:105-107`.

### F-ROULETTE-014  Viererblock (Ecke/Corner) — 8 : 1
- **Was:** Ein Chip auf den Punkt, an dem sich vier Zahlen berühren; Treffer zahlt 8 : 1.
- **Wie ausgelöst:** Klick auf eins der 22 Felder `data-ck-field="c-<linke obere Zahl>"` (`c-1`, `c-2`, `c-4` …).
- **Soll-Ergebnis:** Chipstapel im Kreuzungspunkt; Höchsteinsatz 40 €. Bei Treffer Rückgabe = Einsatz × 9.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 40 €.
- **Beobachtbar an:** `data-ck-field` beginnt mit `c-`; `aria-label` „Viererblock 1, 2, 4 und 5, …".
- **Umgesetzt in:** `bets-roulette.js:182-190`, `Classes/BetLayout.php:444-455`, `locallang.xlf:108-110`.

### F-ROULETTE-015  Fünferwette (Top Line) — 6 : 1
- **Was:** Ein einziges Feld deckt `0`, `00`, `1`, `2` und `3` ab und zahlt 6 : 1 — die einzige Wette des Tisches, deren Auszahlung nicht zur Anzahl der Zahlen passt (Rückflussquote 92,11 % statt 94,74 %).
- **Wie ausgelöst:** Klick auf `data-ck-field="five"` (Gitterlage Spalte 2, Zeile 1).
- **Soll-Ergebnis:** Chipstapel auf dem Fünferfeld; Höchsteinsatz 50 €. Bei Treffer Rückgabe = Einsatz × 7.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 50 €.
- **Beobachtbar an:** `data-ck-field="five"`; `aria-label` „Fünferwette 0, 00, 1, 2 und 3, zahlt 6 zu 1, …".
- **Umgesetzt in:** `bets-roulette.js:192-201`, `Classes/BetLayout.php:458-467`, `locallang.xlf:111-113`.

### F-ROULETTE-016  Sechserreihe (Six Line) — 5 : 1
- **Was:** Ein Chip zwischen zwei Reihenköpfen deckt sechs Zahlen ab; Treffer zahlt 5 : 1.
- **Wie ausgelöst:** Klick auf eins der 11 Felder `data-ck-field="sl-<erste Zahl>"` (`sl-1`, `sl-4` … `sl-31`).
- **Soll-Ergebnis:** Chipstapel; Höchsteinsatz 60 €. Bei Treffer Rückgabe = Einsatz × 6.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 60 €.
- **Beobachtbar an:** `data-ck-field` beginnt mit `sl-`; `aria-label` „Sechserreihe 1, 2, 3, 4, 5 und 6, …".
- **Umgesetzt in:** `bets-roulette.js:203-212`, `Classes/BetLayout.php:470-479`, `locallang.xlf:114-116`.

### F-ROULETTE-017  Kolonne — 2 : 1
- **Was:** Eins von drei Feldern am rechten Rand deckt eine der drei waagerechten Zwölferreihen ab (1, 4, … 34 / 2, 5, … 35 / 3, 6, … 36); Treffer zahlt 2 : 1.
- **Wie ausgelöst:** Klick auf `data-ck-field="col-1"`, `col-2` oder `col-3`. Aufschrift auf allen dreien: **`2 to 1`**.
- **Soll-Ergebnis:** Chipstapel; Höchsteinsatz 100 €. Bei Treffer Rückgabe = Einsatz × 3.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 100 €.
- **Beobachtbar an:** `data-ck-field="col-2"`; sichtbarer Text `2 to 1` mit `lang="en"`; `aria-label` beginnt mit „2 to 1 — Kolonne 2, die Zahlen …, zahlt 2 zu 1" (die Auszahlung steht hier ausdrücklich schon in der Grundbeschriftung und wird deshalb nicht ein zweites Mal angesagt).
- **Umgesetzt in:** `bets-roulette.js:214-220`, `Classes/BetLayout.php:482-496`, `locallang.xlf:173-175`.

### F-ROULETTE-018  Dutzend — 2 : 1
- **Was:** Eins von drei Feldern unter dem Zahlenfeld deckt die Zahlen 1–12, 13–24 oder 25–36 ab; Treffer zahlt 2 : 1.
- **Wie ausgelöst:** Klick auf `data-ck-field="dz-1"`, `dz-2` oder `dz-3`. Aufschrift `1st 12`, `2nd 12`, `3rd 12`.
- **Soll-Ergebnis:** Chipstapel; Höchsteinsatz 100 €. Bei Treffer Rückgabe = Einsatz × 3.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 100 €.
- **Beobachtbar an:** `data-ck-field="dz-1"`; sichtbarer Text `1st 12` (`lang="en"`); `aria-label` „1st 12 — das erste Dutzend, die Zahlen 1 bis 12, …".
- **Umgesetzt in:** `bets-roulette.js:221-229`, `Classes/BetLayout.php:499-510`, `locallang.xlf:181-189`.

### F-ROULETTE-019  Einfache Chancen (1–18, Even, Rot, Schwarz, Odd, 19–36) — 1 : 1
- **Was:** Sechs Felder in der untersten Reihe, jedes deckt achtzehn Zahlen ab; Treffer zahlt 1 : 1. Die Nullen gewinnen bei keinem von ihnen.
- **Wie ausgelöst:** Klick auf `data-ck-field="low"`, `even`, `red`, `black`, `odd` oder `high` — in genau dieser Reihenfolge von links nach rechts.
- **Soll-Ergebnis:** Chipstapel; Höchsteinsatz 100 €. Bei Treffer Rückgabe = Einsatz × 2.
- **Vorbedingung:** wie F-ROULETTE-010, Feldgrenze 100 €.
- **Beobachtbar an:** sichtbare Aufschriften `1–18` (ohne `lang`), `Even` / `Odd` (`lang="en"`), `19–36` (ohne `lang`); Rot und Schwarz tragen **keine Aufschrift**, sondern je eine `.ro-felt__diamond--red` / `--black`-Raute; `aria-label` z. B. „Rote Raute — Rot, die achtzehn roten Zahlen, …".
- **Umgesetzt in:** `bets-roulette.js:230-243`, `Classes/BetLayout.php:513-556`, `locallang.xlf:194-211`, `Felt.html:156-158`.

### F-ROULETTE-020  Sprunglink über das Tuch
- **Was:** Ein Tastaturbenutzer kann die 159 Feldknöpfe in einem Schritt überspringen und landet bei der Bedienleiste.
- **Wie ausgelöst:** Tabulator auf das erste fokussierbare Element im Tuch, dann Eingabetaste.
- **Soll-Ergebnis:** Der Fokus springt auf `#ro-controls` (Bedienleiste mit Chipwahl, Auslöser, `CASH OUT`). Der Link ist nur im Fokus sichtbar.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<a class="ck-skiplink ro-felt__skip" href="#ro-controls">Setzfläche überspringen, weiter zur Bedienleiste</a>` als erstes Kind von `[data-ro-felt]`.
- **Umgesetzt in:** `Felt.html:84-86`; `Table.html:106`; `locallang.xlf:95-97`.

### F-ROULETTE-021  Vier Feldgruppen für Vorleseprogramme
- **Was:** Das Tuch ist in vier ansteuerbare Abschnitte geteilt, damit ein Bildschirmleser nicht 159 Knöpfe am Stück durchläuft.
- **Wie ausgelöst:** Navigation mit einem Vorleseprogramm über Gruppen/Regionen.
- **Soll-Ergebnis:** Vier Bereiche mit den Namen „Zahlenfeld und Linienwetten", „Kolonnen", „Dutzende", „Einfache Chancen".
- **Vorbedingung:** keine.
- **Beobachtbar an:** vier `<div class="ro-felt__group" role="group" aria-label="…">`.
- **Umgesetzt in:** `Felt.html:88-104`; `locallang.xlf:83-94`; `Classes/DataProcessing/FeltProcessor.php`.

### F-ROULETTE-022  Tuch sperren, solange die Kugel läuft
- **Was:** Während einer laufenden Runde nimmt kein Feld mehr einen Chip an; der Knopf bleibt aber ansteuerbar und sagt, warum er nicht geht.
- **Wie ausgelöst:** Rundenstart („Kugel werfen") bzw. in der Lobby die Uhr des Servers.
- **Soll-Ergebnis:** Alle 159 Felder tragen `aria-disabled="true"` (nie `disabled`); ein Setzversuch wird im geteilten Ansagebereich mit dem Grund „gesperrt" beantwortet.
- **Vorbedingung:** Runde nicht im Zustand `setzen`.
- **Beobachtbar an:** `data-ro-state` ≠ `setzen` am Wurzelelement und `aria-disabled="true"` an `[data-ck-field]`; Text im `[data-ck-table-status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/roulette.js:250-261`, `round-roulette.js` (Sperre/Freigabe), `casino_startpage/.../table-felt.js:283-289`.

## Der Rundenablauf

### F-ROULETTE-030  „Kugel werfen" — eine Runde starten
- **Was:** Der Spieler gibt dem Rad neuen Schwung und wirft die Kugel gegenläufig ein; danach entscheidet allein die Simulation, wo sie liegen bleibt.
- **Wie ausgelöst:** Klick/Tastendruck auf den Rundenauslöser `[data-ck-table-go]` in der geteilten Bedienleiste (Beschriftung „Kugel werfen").
- **Soll-Ergebnis:** Das Tuch wird gesperrt, der Zustand wandert `setzen` → `gesperrt` → `laeuft`, das Rad dreht sichtbar, die Kugel läuft, und im Rundenbereich steht „Die Kugel läuft."
- **Vorbedingung:** Zustand `setzen`, mindestens ein Chip auf dem Tuch, sichere Zufallsquelle vorhanden, Tisch verdrahtet.
- **Beobachtbar an:** `data-ro-state="laeuft"` am Wurzelelement; `aria-disabled="true"` am Auslöser; Text „Die Kugel läuft." in `[data-ro-status]`; laufende CSS-Variablen `--ro-wheel-turn`/`--ro-ball-turn` an `[data-ro-head]`/`[data-ro-ball]`.
- **Umgesetzt in:** `round-roulette.js:184-214`; `roulette.js:348-365`; `Table.html:106-111`; `locallang.xlf:14-19, 22-23`.

### F-ROULETTE-031  Absage: es liegt kein Einsatz auf dem Tuch
- **Was:** Ohne einen einzigen Chip startet keine Runde — das Rad lässt sich nicht leer drehen.
- **Wie ausgelöst:** Druck auf „Kugel werfen", während `bets.total` 0 ist.
- **Soll-Ergebnis:** Es passiert nichts (kein Sperren, kein Wurf); angesagt wird „Es liegt kein Chip auf dem Tuch. Legen Sie zuerst einen Einsatz."
- **Vorbedingung:** Zustand `setzen`, Tuch leer.
- **Beobachtbar an:** `data-ro-state` bleibt `setzen`; Text `round.announce.nostake` in `[data-ro-status]`.
- **Umgesetzt in:** `round-roulette.js:188-190`; `roulette.js:349-357`; `locallang.xlf:234-236`.

### F-ROULETTE-032  Absage: die Kugel läuft noch
- **Was:** Ein zweiter Druck auf den Auslöser während einer laufenden Runde bleibt wirkungslos und wird erklärt.
- **Wie ausgelöst:** Druck auf „Kugel werfen" bei `data-ro-state` ≠ `setzen`.
- **Soll-Ergebnis:** Keine zweite Runde; Ansage „Die Kugel läuft noch."
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** Text `wheel.announce.blocked` in `[data-ro-status]`; unveränderter `data-ro-state`.
- **Umgesetzt in:** `round-roulette.js:185-187`; `roulette.js:350-352`; `locallang.xlf:28-30`.

### F-ROULETTE-033  Ergebnis feststellen, verrechnen und auszahlen
- **Was:** Sobald die Kugel liegt, werden alle gesetzten Felder ausgewertet, der Gewinn gutgeschrieben und die Chips vom Tuch genommen.
- **Wie ausgelöst:** Automatisch, genau einmal je Lauf, wenn die Physik die Kugel in ein Fach legt.
- **Soll-Ergebnis:** Reihenfolge: Ergebnis übernehmen → rechnen → eine Sekunde stehen lassen (bei „Bewegung reduzieren" sofort) → Geld gutschreiben → Chips abräumen → Tuch wieder freigeben. Zustand `laeuft` → `auswerten` → `auszahlen` → `setzen`.
- **Vorbedingung:** laufende Runde; Bank noch offen.
- **Beobachtbar an:** `data-ro-result` = Fachbeschriftung (`'0'`, `'00'`, `'1'` … `'36'`), `data-ro-colour` = `red`/`black`/`green`, `data-ro-total` = Kasse + Buy-in + liegender Einsatz (nur hier geschrieben), `data-ro-state="setzen"`; Chipstapel auf dem Tuch sind verschwunden.
- **Umgesetzt in:** `round-roulette.js:223-278`; `roulette.js:270-307, 342-345`.

### F-ROULETTE-034  Ergebnisansage im eigenen Live-Bereich
- **Was:** Nach jeder Runde wird genau ein deutscher Satz angesagt, der Zahl, Farbe, Einsatz, Auszahlung und den neuen Buy-in nennt.
- **Wie ausgelöst:** Ende der Auswertung (F-ROULETTE-033).
- **Soll-Ergebnis:** Vier Satzbauten je nach Ausgang: echter Gewinn („Einsatz {3} Euro, Auszahlung {2} Euro"), Teilrückgabe („davon {2} Euro zurück"), Totalverlust („Einsatz {3} Euro verloren"), kein Einsatz („Es lag kein Einsatz auf dem Tuch."). Entprellung 700 ms, erste Ansage sofort.
- **Vorbedingung:** Runde ausgewertet.
- **Beobachtbar an:** Textinhalt von `<p class="ro-status" data-ro-status role="status">`; die Satzvorlagen stehen dort als `data-text-win`/`-loss`/`-partial`/`-nobet`.
- **Umgesetzt in:** `roulette.js:178-195, 286-294`; `Status.html:25-39`; `locallang.xlf:222-233`.

### F-ROULETTE-035  Marke im Verlaufsstreifen
- **Was:** Jedes Ergebnis hinterlässt eine Marke im Verlaufsstreifen unter dem Tisch — die Zahl als Text, der Farbname als Tooltip.
- **Wie ausgelöst:** Automatisch am Ende jeder Runde.
- **Soll-Ergebnis:** Eine neue Marke mit dem Zahlentext; die Farbe ist nie die einzige Aussage.
- **Vorbedingung:** Verlaufsstreifen im Markup vorhanden (`[data-ck-table-history]`).
- **Beobachtbar an:** neues Element im `[data-ck-table-history]` mit `title` = „Rot"/„Schwarz"/„Grün"; vorher steht dort der Leertext aus `[data-ck-table-history-empty]`.
- **Umgesetzt in:** `roulette.js:275-277, 383-385`; `Table.html:112`.

### F-ROULETTE-036  Abbruch: Tisch verlassen, während die Kugel läuft
- **Was:** Wurde die Bank geschlossen (Seite verlassen), während die Kugel noch lief, wird nichts mehr ausgezahlt — und das wird ausdrücklich gesagt, statt es wie eine Verlustrunde klingen zu lassen.
- **Wie ausgelöst:** `pagehide` während `data-ro-state="laeuft"`; danach kommt die Kugel zur Ruhe und die Auszahlung schlägt fehl.
- **Soll-Ergebnis:** Kein Abräumen (die Chips bleiben als Aufzeichnung liegen), das Tuch bleibt gesperrt, der Auslöser bleibt gesperrt, Ansage „Der Tisch wurde verlassen, diese Runde wird nicht mehr ausgezahlt."
- **Vorbedingung:** Bank bereits geschlossen.
- **Beobachtbar an:** Text `round.announce.closed` in `[data-ro-status]`; `aria-disabled="true"` am `[data-ck-table-go]`; Chipstapel liegen noch.
- **Umgesetzt in:** `round-roulette.js:235-262`; `roulette.js:323-326`; `locallang.xlf:240-242`.

### F-ROULETTE-037  Absage: keine sichere Zufallsquelle im Browser
- **Was:** Stellt der Browser keine kryptografische Zufallsquelle bereit, spielt der Tisch gar nicht — statt heimlich schlechter zu würfeln.
- **Wie ausgelöst:** Seitenaufruf in einem Browser ohne `crypto.getRandomValues()`.
- **Soll-Ergebnis:** Der Auslöser ist gesperrt, kein Tisch wird verdrahtet, Ansage „Dieser Browser stellt keine sichere Zufallsquelle bereit. Der Tisch spielt nicht."
- **Vorbedingung:** keine.
- **Beobachtbar an:** `aria-disabled="true"` am `[data-ck-table-go]`; Text `wheel.announce.norandom` in `[data-ro-status]`.
- **Umgesetzt in:** `roulette.js:216-222`; `Resources/Public/JavaScript/rng.js`; `locallang.xlf:31-33`.

### F-ROULETTE-038  Absage: derselbe Tisch zweimal auf einer Seite
- **Was:** Liegen zwei Roulette-Inhaltselemente auf derselben Seite, bleibt das zweite unbespielbar, statt still zu versagen.
- **Wie ausgelöst:** Zwei Elemente `CType=roulette` auf einer Seite; beide tragen `data-ck-table-key="roulette"`.
- **Soll-Ergebnis:** Der zweite Tisch bekommt einen gesperrten Auslöser und die Ansage „Dieser Tisch ist auf dieser Seite bereits offen und kann kein zweites Mal gespielt werden."; zusätzlich eine Fehlermeldung in der Browser-Konsole.
- **Vorbedingung:** ein Tisch mit demselben Schlüssel bereits verdrahtet.
- **Beobachtbar an:** Text `round.announce.unavailable`; `aria-disabled="true"` am zweiten `[data-ck-table-go]`.
- **Umgesetzt in:** `roulette.js:372-377, 505-517`; `locallang.xlf:237-239`.

## Das Geld am Tisch

Der Tisch kennt den QR-Schalter nicht: er ruft nur die Kassen-Schnittstelle des
Site Package auf (`credit.js`, `table-buyin.js`). Ob dahinter der Browserspeicher
oder das Serverkonto steht, entscheidet `account-backend.js` im Site Package.
Der Tisch benutzt **fünf** Chipwerte: 100 €, 25 €, 20 €, 5 €, 1 €. Die hohen Chips
zu 500 € und 1.000 € gibt es hier bewusst nicht (sie wären bei 100 € Feldgrenze
nirgends legbar).

### F-ROULETTE-040  Chips am Tisch kaufen (Einkauf/Buy-in)
- **Was:** Die Spielerin wechselt Geld aus der gemeinsamen Kasse in Chips, die vor ihr im Rack liegen — einzeln, Chip für Chip.
- **Wie ausgelöst:** Kaufknopf je Chipwert in der Bedienleiste (`[data-ck-table-chip-buy]`, Wert im Attribut).
- **Soll-Ergebnis:** Ein Chip dieses Werts liegt zusätzlich im Rack, die gemeinsame Kasse ist um denselben Betrag kleiner, der Buy-in ist um ihn größer. Reicht die Kasse nicht, passiert nichts und der Grund wird angesagt.
- **Vorbedingung:** Kasse hat Deckung.
- **Beobachtbar an:** Anzeige `[data-ck-table-rack]` für diesen Wert, `[data-ck-table-amount]` (Buy-in), Kassenanzeige des Site Package; Meldung in `[data-ck-table-status]`.
- **Umgesetzt in:** `Table.html:53-55, 110` (die fünf Chipwerte); `casino_startpage/.../table-controls.js:130, 252-254`; `table-buyin.js`.

### F-ROULETTE-041  Chips zurückgeben und wechseln
- **Was:** Ein Chip wandert aus dem Rack zurück in die Kasse, oder ein Chip wird in kleinere bzw. größere Stücke gewechselt.
- **Wie ausgelöst:** `[data-ck-table-chip-sell]` (zurückgeben), `[data-ck-table-exchange-down]` / `[data-ck-table-exchange-up]` (wechseln). An diesem Tisch sind die Werte 100, 25, 20 und 5 teilbar bzw. zusammenlegbar.
- **Soll-Ergebnis:** Rackbestand und Buy-in ändern sich entsprechend; die Gesamtsumme bleibt gleich.
- **Vorbedingung:** passender Chip im Rack.
- **Beobachtbar an:** `[data-ck-table-rack]`-Anzeigen je Wert; `[data-ck-table-amount]` bleibt beim Wechseln unverändert.
- **Umgesetzt in:** `Table.html:54-55` (`splittable`, `mergeable`); `casino_startpage/.../table-controls.js:131-134, 265-289`.

### F-ROULETTE-042  Chip auf ein Feld legen
- **Was:** Der gerade gewählte Chip wandert vom Rack auf das angeklickte Setzfeld.
- **Wie ausgelöst:** Klick/Taste auf einen der 159 Feldknöpfe; der Wert kommt aus der Chipwahl `[data-ck-table-chip]`.
- **Soll-Ergebnis:** Reihenfolge `bets.place()` → `bank.placeChip()`; schlägt die Buchung fehl, wird die Buchung sofort zurückgerollt. Der Betrag ist danach aus dem Buy-in heraus und liegt auf dem Tuch.
- **Vorbedingung:** Runde offen, Chip dieses Werts im Rack, Feldgrenze und Rundengrenze (100 €) nicht überschritten.
- **Beobachtbar an:** Chip-SVGs in `[data-ck-stack]` des Feldes; `[data-ck-table-staked]` (Gesamteinsatz) steigt, `[data-ck-table-amount]` sinkt; `aria-label` des Feldes nennt den gesetzten Betrag; Ansage in `[data-ck-table-status]`.
- **Umgesetzt in:** `roulette.js:387-412` (Verdrahtung `onPlace`); `casino_startpage/.../table-felt.js`; `bets-roulette.js:73-81` (Grenzen).

### F-ROULETTE-043  Einsatz zurücknehmen (letzter Chip / alles)
- **Was:** Der zuletzt gelegte Chip — oder der gesamte Einsatz — kommt vom Tuch zurück ins Rack.
- **Wie ausgelöst:** `[data-ck-table-undo]` (letzter Einsatz) bzw. `[data-ck-table-clear]` (alles) in der Bedienleiste.
- **Soll-Ergebnis:** Chipstapel verschwinden vom Tuch, Buy-in steigt um denselben Betrag, Gesamteinsatz sinkt.
- **Vorbedingung:** Runde offen (`setzen`), mindestens ein Chip auf dem Tuch.
- **Beobachtbar an:** `[data-ck-stack]` des Feldes leert sich; `[data-ck-table-staked]` und `[data-ck-table-amount]`; Klang „Chip zurückgenommen".
- **Umgesetzt in:** `roulette.js:390` (`onTakeBack` → `bank.returnChip`); `casino_startpage/.../table-controls.js:125-126`.

### F-ROULETTE-044  Einsatz verdoppeln und Einsatz wiederholen
- **Was:** Der liegende Einsatz wird auf allen Feldern verdoppelt; oder der Einsatz der vorigen Runde wird noch einmal gelegt.
- **Wie ausgelöst:** `[data-ck-table-double]` bzw. `[data-ck-table-repeat]` in der Bedienleiste.
- **Soll-Ergebnis:** Die Stapel auf dem Tuch wachsen entsprechend, solange Feldgrenzen und der Rundenhöchstbetrag von 100 € es zulassen; sonst wird der Grund angesagt.
- **Vorbedingung:** Runde offen; beim Wiederholen: eine vorige Runde wurde abgeräumt (`bets.sweep()` merkt sie sich).
- **Beobachtbar an:** veränderte Chipstapel, `[data-ck-table-staked]`, Ansagetexte `data-text-doubled`/`data-text-repeated` im `[data-ck-table-status]`.
- **Umgesetzt in:** `casino_startpage/.../table-controls.js:127-128, 368, 395`; Rundengrenze `bets-roulette.js:73`.

### F-ROULETTE-045  Auszahlung nach der Runde
- **Was:** Die Rückgaben aller getroffenen Felder werden dem Buy-in gutgeschrieben, die verlorenen Einsätze verfallen.
- **Wie ausgelöst:** Automatisch, Schritt 5 der Auswertung, eine Sekunde nachdem die gewinnenden Stapel sichtbar stehengeblieben sind (bei „Bewegung reduzieren" sofort).
- **Soll-Ergebnis:** Gutschrift = Summe aller Rückgaben; abgeräumt = Summe aller Einsätze. Beides wird getrennt übergeben, damit kein Betrag doppelt oder gar nicht ankommt.
- **Vorbedingung:** Bank offen.
- **Beobachtbar an:** `[data-ck-table-amount]` (Buy-in) steigt; `data-ro-total` am Wurzelelement wird neu geschrieben; Klang „Auszählleiter" und „Münzkaskade".
- **Umgesetzt in:** `round-roulette.js:231-233, 264-268`; `roulette.js:270-296`.

### F-ROULETTE-046  `CASH OUT` — Buy-in in die Kasse zurückgeben
- **Was:** Der gesamte Chipbestand wandert zurück in die gemeinsame Kasse; der Tisch ist damit für diese Spielerin abgerechnet.
- **Wie ausgelöst:** `[data-ck-table-cashout]` in der Bedienleiste.
- **Soll-Ergebnis:** Rack leer, Buy-in 0, Kasse um den Betrag größer, Klang „Registrierkasse".
- **Vorbedingung:** **Kein** Chip liegt auf dem Tuch — sonst liefert die Bank die Absage `'staked'` und der Knopf bleibt wirkungslos (mit Begründung).
- **Beobachtbar an:** `[data-ck-table-amount]` = 0, leeres `[data-ck-table-rack]`; bei Absage Meldung aus `data-message-cashout-blocked` im `[data-ck-table-status]`.
- **Umgesetzt in:** `casino_startpage/.../table-controls.js:132, 242`; `table-buyin.js:245-256`; Klang: `sound-roulette.js`.

### F-ROULETTE-047  Tisch verlassen — was mit dem Geld geschieht
- **Was:** Wer die Seite verlässt (auch durch Neuladen), gibt den Tisch auf: der Buy-in wandert von selbst in die gemeinsame Kasse zurück, ein **offener Einsatz auf dem Tuch verfällt**.
- **Wie ausgelöst:** `pagehide` — angemeldet von der geteilten Bedienleiste, nicht von diesem Tisch.
- **Soll-Ergebnis:** Kasse = vorheriger Stand + Rackbestand. Der bereits gesetzte Betrag ist schon vorher aus dem Buy-in heraus und kommt nicht zurück. Läuft in diesem Moment eine Runde, greift zusätzlich F-ROULETTE-036.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Kassenstand nach dem Seitenwechsel; nachgewiesen über die Bilanz `data-ro-total` (Kasse + Buy-in + liegender Einsatz).
- **Umgesetzt in:** `roulette.js:36-40, 451` (`connectControls` meldet `pagehide` an); `casino_startpage/.../table-buyin.js:378-386`.

### F-ROULETTE-048  Die Bilanz als eine Zahl
- **Was:** Ein einziger Messwert am Tisch sagt, wie viel Geld insgesamt im Spiel ist — damit nachprüfbar ist, dass nichts liegenbleibt und nichts aus dem Nichts entsteht.
- **Wie ausgelöst:** Automatisch am Ende jeder Auswertung.
- **Soll-Ergebnis:** `data-ro-total` = gemeinsame Kasse + Buy-in + liegender Einsatz. Sie ändert sich je Runde um genau „Auszahlung − Einsatz" und um sonst nichts.
- **Vorbedingung:** mindestens eine ausgewertete Runde. Zwischen den Runden (nach Buy-in, `CASH OUT`, jedem gelegten Chip) wird sie **nicht** nachgeführt und zeigt bis zur nächsten Auswertung den Stand der letzten Runde.
- **Beobachtbar an:** Attribut `data-ro-total` am `[data-ck-table]`.
- **Umgesetzt in:** `roulette.js:273`; `Table.html:63`.

## Rad, Kugel und Ansicht

### F-ROULETTE-050  Das laufende Rad mit 38 Fächern
- **Was:** Auf dem Tisch steht ein amerikanisches Rad mit 38 Fächern (1–36, `0`, `00`) in der festen Reihenfolge des amerikanischen Rades; es dreht sich sichtbar und wird zwischen den Runden **nie** zurückgesetzt.
- **Wie ausgelöst:** Seitenaufruf (Zeichnung) und jeder Druck auf „Kugel werfen" (neuer Schwung).
- **Soll-Ergebnis:** Die Radscheibe läuft über beliebig viele Würfe hinweg dort weiter, wo sie stand; jedes Fach trägt seine Zahl als Text und seine Farbe (rot/schwarz/grün). Ein Neuladen der Seite ist ein Neuanfang — die Radstellung wandert nicht mit.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<div class="ro-wheel" data-ro-wheel>` mit `<svg viewBox="0 0 200 200" aria-hidden="true">`; CSS-Variable `--ro-wheel-turn` an `[data-ro-head]` wächst monoton.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Roulette/Wheel.html:48-128`; `Classes/WheelGeometry.php`; `Classes/DataProcessing/WheelProcessor.php`; `Resources/Public/JavaScript/wheel-physics.js:313-341`.

### F-ROULETTE-051  Die Kugel: Bahn, Abstieg, Rotor, Fach
- **Was:** Die Kugel wird gegenläufig eingeworfen, rollt an der Bahnwand, fällt nach innen, kann eine der acht Rauten treffen, springt über die Rillen der Radscheibe und bleibt in genau einem Fach liegen. Das Ergebnis entsteht aus diesem Lauf und wird nicht vorher gezogen.
- **Wie ausgelöst:** „Kugel werfen".
- **Soll-Ergebnis:** Fünf Abschnitte `ruht` → `bahn` → `abstieg` → `rotor` → `liegt`. Gezogen werden nur drei Startwerte (Drehkraft des Rades, Anstoßkraft der Kugel, Einwurfpunkt); danach entscheidet allein die Simulation. Jeder Lauf endet mit genau einem Fach, die Kugel verlässt das Rad nie.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** sichtbare Kugel in `[data-ro-ball]` (vorher `hidden`); CSS-Variablen `--ro-ball-turn`, `--ro-ball-r`, `--ro-ball-hop`; am Ende `data-ro-result`/`data-ro-colour`.
- **Umgesetzt in:** `wheel-physics.js:278-341, 343-560`; `Resources/Public/JavaScript/wheel-view.js:174-182, 212-270`.

### F-ROULETTE-052  Bewegungsdrosselung: Ergebnis statt Ablauf
- **Was:** Wer im Betriebssystem „Bewegung reduzieren" eingestellt hat, bekommt das Ergebnis sofort statt der Animation — die Rechnung läuft dabei unverändert vollständig durch.
- **Wie ausgelöst:** „Kugel werfen" bei aktivem `prefers-reduced-motion: reduce`.
- **Soll-Ergebnis:** Der ganze Lauf wird ohne Bild durchgerechnet und nur sein Ende gezeigt; die Wartezeit vor dem Abräumen entfällt (0 statt 1000 ms); angesagt wird „Die Runde wird ausgewertet." statt „Die Kugel läuft."
- **Vorbedingung:** Systemeinstellung „Bewegung reduzieren".
- **Beobachtbar an:** Text `wheel.announce.evaluating` in `[data-ro-status]`; `data-ro-result` erscheint praktisch sofort nach dem Druck.
- **Umgesetzt in:** `roulette.js:128-130, 359-364, 444`; `wheel-view.js:295-310`; `wheel-physics.js:605-612`; `locallang.xlf:25-27`.

### F-ROULETTE-053  Versteckter Tab hält das Rad an
- **Was:** Wechselt der Besucher in einen anderen Tab, wird nicht weitergezeichnet und die aufgelaufene Zeit verworfen — beim Zurückkommen springt nichts.
- **Wie ausgelöst:** `visibilitychange` des Dokuments.
- **Soll-Ergebnis:** Die Zeichenschleife hält an und wird beim Sichtbarwerden wieder angeworfen; der Zeitübertrag wird verworfen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** nur mit dem Auge (die CSS-Variablen stehen still, während der Tab verdeckt ist).
- **Umgesetzt in:** `wheel-view.js:188-210, 322-330`.

### F-ROULETTE-054  Der Tisch rollt, statt zu schrumpfen
- **Was:** Auf einem schmalen Bildschirm wird der Tisch nicht verkleinert, sondern innerhalb seines eigenen Kastens waagerecht gerollt — damit jedes Setzfeld mindestens 24 × 24 Bildpunkte groß bleibt.
- **Wie ausgelöst:** Schmales Fenster / kleines Gerät.
- **Soll-Ergebnis:** Der Tischkasten (Seitenverhältnis 504 : 160, mindestens 1512 Bildpunkte breit) bekommt eine waagerechte Rollleiste; die **Seite** rollt nicht waagerecht. An der rollbaren Kante steht ein sichtbarer Hinweisrand.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `.ro-cloth__frame` > `.ro-cloth__scroll` > `.ro-cloth` im Markup; waagerechte Rollleiste am `.ro-cloth__scroll`.
- **Umgesetzt in:** `Table.html:86-100`; `Resources/Public/Css/felt.css`; `Classes/BetLayout.php:90-125, 152-167`.

## Der Klang

Alle Klänge entstehen im Browser aus Tonfrequenzen (Web Audio), keine Audiodatei.
Welcher Klang zu welchem Anlass gehört, ist allein Sache dieses Tisches.
Grundsatz: jeder Klang gehört zu etwas, das wirklich passiert — kein
hervorgehobener Beinahe-Treffer, keine Verlustrunde, die wie ein Gewinn klingt.

### F-ROULETTE-060  Ton-Schalter „Ton"
- **Was:** Ein Knopf schaltet den Klang des Tisches an und aus.
- **Wie ausgelöst:** Klick/Taste auf `<button data-ro-sound>` mit dem sichtbaren Text „Ton".
- **Soll-Ergebnis:** Der Ton schaltet um; beim **Ausschalten erklingt bewusst kein Klick** — die eintretende Stille ist die Rückmeldung. Die Einstellung gilt geräteübergreifend (gemeinsamer Ton-Schalter des Hauses).
- **Vorbedingung:** keine. Ton ist standardmäßig AN (`aria-pressed="true"` steht schon im ausgelieferten Markup).
- **Beobachtbar an:** `aria-pressed="true"`/`"false"` am Schalter, `aria-label` „Ton ist an"/„Ton ist aus", Messpunkt `data-ro-sound-on` = `'1'`/`'0'` am Wurzelelement.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Roulette/SoundSwitch.html:23-29`; `sound-roulette.js:444-462`; `locallang.xlf:249-257`.

### F-ROULETTE-061  Autoplay-Sperre: Ton erst nach einer echten Geste
- **Was:** Vor der ersten echten Nutzergeste entsteht kein Tonkanal — der Browser wird nicht ungefragt beschallt.
- **Wie ausgelöst:** Erster echter `pointerdown` oder `keydown` innerhalb des Tisches (nur mit `isTrusted`).
- **Soll-Ergebnis:** Tonkanal wird freigegeben und der Leerlaufklang startet. Ein nachgemachtes Ereignis erzeugt keinen Tonkanal.
- **Vorbedingung:** keine.
- **Beobachtbar an:** erst ab diesem Moment hörbare Klänge; `data-ro-sound-sustained` kann von 0 abweichen.
- **Umgesetzt in:** `sound-roulette.js:469-478`.

### F-ROULETTE-062  Chip aufs Tuch gelegt — trockener, tiefer Metallanschlag
- **Was:** Ein kurzer Metallklang bestätigt, dass ein Chip gelegt wurde.
- **Wie ausgelöst:** erfolgreiche Buchung `reason: 'place'` der Bank (F-ROULETTE-042).
- **Soll-Ergebnis:** genau ein Anschlag je gelegtem Chip.
- **Vorbedingung:** Ton an, Tonkanal freigegeben.
- **Beobachtbar an:** nur mit dem Ohr; auslösende Stelle `metal({ key: 'ro-chip-place', pitch: 0.55 })`.
- **Umgesetzt in:** `sound-roulette.js:485-492`.

### F-ROULETTE-063  Chip zurückgenommen — derselbe Anschlag höher und leiser
- **Was:** Das Zurücknehmen klingt wie das Legen, nur heller und leiser.
- **Wie ausgelöst:** Buchung `reason: 'return'` (F-ROULETTE-043).
- **Soll-Ergebnis:** ein Anschlag mit `pitch: 0.83`, `gain: 0.7`.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr.
- **Umgesetzt in:** `sound-roulette.js:488-489`.

### F-ROULETTE-064  „Nichts geht mehr" — zwei kurze, absteigende Holzschläge
- **Was:** Der Rundenstart wird mit zwei absteigenden Holzschlägen markiert.
- **Wie ausgelöst:** erfolgreicher Rundenstart (F-ROULETTE-030).
- **Soll-Ergebnis:** zwei Schläge im Abstand von 0,1 s (520 Hz, dann 400 Hz).
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr; `sequence({ key: 'ro-nogomore' })`.
- **Umgesetzt in:** `sound-roulette.js:349-358`; ausgelöst in `roulette.js:358`.

### F-ROULETTE-065  Radscheibe dreht — leiser Dauerklang
- **Was:** Solange sich die Radscheibe dreht, liegt ein leiser Dauerton darüber, dessen Tonhöhe der Drehgeschwindigkeit folgt.
- **Wie ausgelöst:** jedes gezeichnete Bild, solange Bewegung ist.
- **Soll-Ergebnis:** Tonhöhe fällt mit dem Rad ab; endet, wenn wirklich gar keine Bewegung mehr ist.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** Zähler `data-ro-sound-sustained` am Wurzelelement (0/1/2 laufende Dauerklänge).
- **Umgesetzt in:** `sound-roulette.js:204-250, 297-331`.

### F-ROULETTE-066  Kugel auf der Laufbahn — zweiter, hellerer Dauerklang
- **Was:** Ein zweiter, hellerer Dauerton begleitet die laufende Kugel und fällt mit ihrer Geschwindigkeit ab.
- **Wie ausgelöst:** wie F-ROULETTE-065, solange die Kugel läuft.
- **Soll-Ergebnis:** zwei gleichzeitig laufende Dauerklänge während des Laufs.
- **Vorbedingung:** Ton an, laufende Runde.
- **Beobachtbar an:** `data-ro-sound-sustained="2"`.
- **Umgesetzt in:** `sound-roulette.js:251-296, 297-318`.

### F-ROULETTE-067  Rillenstoß — sehr kurzer, harter Klick
- **Was:** Jedes Mal, wenn die Kugel über einen Trennsteg der Radscheibe springt, klickt es kurz und hart (rund 40 Stöße je Lauf).
- **Wie ausgelöst:** Rückruf `onFret(zahl)` aus der Ansicht — erkannt an bereits öffentlichen Werten der Physik, ohne die Physik zu verändern.
- **Soll-Ergebnis:** ein Klick je Stoß, mit leicht gestreuter Tonhöhe.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr; `noise({ key: 'ro-fret' })`.
- **Umgesetzt in:** `sound-roulette.js:332-341`; `wheel-view.js` (`onFret`); `roulette.js:421`.

### F-ROULETTE-068  Rautentreffer — tieferer, deutlicherer Anschlag
- **Was:** Trifft die Kugel eine der acht Rauten, klingt ein tieferer, deutlicherer Anschlag (im Mittel genau einmal je Lauf).
- **Wie ausgelöst:** Rückruf `onDeflector()` aus der Ansicht.
- **Soll-Ergebnis:** ein Anschlag `pitch: 0.5`, `gain: 1.15`.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr.
- **Umgesetzt in:** `sound-roulette.js:344-346`; `roulette.js:422`.

### F-ROULETTE-069  Kugel liegt — drei enger werdende Klicks
- **Was:** Der Moment, in dem die Kugel liegen bleibt, bekommt einen eigenen Klang.
- **Wie ausgelöst:** `onRest()` der Ansicht, genau einmal je Lauf.
- **Soll-Ergebnis:** drei Klicks mit abnehmendem Abstand (`count: 3, tighten: 0.8`).
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr; fällt zeitlich mit dem Wechsel von `data-ro-state` auf `auswerten` zusammen.
- **Umgesetzt in:** `sound-roulette.js:361-363`; `roulette.js:342-345`.

### F-ROULETTE-070  Gewinn: Zählleiter, dann Münzkaskade
- **Was:** Ein echter Gewinn (mehr zurück als eingesetzt) wird ausgezählt — eine aufsteigende Tonleiter, danach eine Münzkaskade, deren Länge am Betrag hängt.
- **Wie ausgelöst:** Ergebnisrückruf mit `credited > staked`.
- **Soll-Ergebnis:** feste kurze Zählfolge, anschließend 2 bis 9 Münzstöße je nach Höhe (`credited / 10`, begrenzt).
- **Vorbedingung:** Ton an, Einsatz lag auf dem Tuch.
- **Beobachtbar an:** nur mit dem Ohr; zeitgleich `data-ro-total` neu geschrieben.
- **Umgesetzt in:** `sound-roulette.js:398-440`.

### F-ROULETTE-071  Verlust und Teilrückgabe: einmaliges Blechrutschen
- **Was:** Ein Totalverlust **und** eine Teilrückgabe (netto kein Gewinn) klingen gleich — ein einmaliges Blechrutschen. Eine Verlustrunde darf nie wie ein Gewinn klingen.
- **Wie ausgelöst:** Ergebnisrückruf mit `0 <= credited <= staked` und gesetztem Einsatz.
- **Soll-Ergebnis:** genau ein `sheet({ key: 'ro-loss' })`, keine Zählleiter.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** nur mit dem Ohr; parallel Ansagetext `round.announce.loss` bzw. `round.announce.partial`.
- **Umgesetzt in:** `sound-roulette.js:419-441`.

### F-ROULETTE-072  Runde ohne Einsatz klingt gar nicht
- **Was:** Lag kein Chip auf dem Tuch, ist finanziell nichts passiert — also erklingt auch nichts.
- **Wie ausgelöst:** Ergebnisrückruf mit `hadBet: false`.
- **Soll-Ergebnis:** Stille; nur der Ansagetext „Es lag kein Einsatz auf dem Tuch." erscheint.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Text `round.announce.nobet` in `[data-ro-status]` ohne Klang.
- **Umgesetzt in:** `sound-roulette.js:421-425`.

### F-ROULETTE-073  `CASH OUT` — Registrierkasse
- **Was:** Das Auszahlen des Buy-ins klingt wie eine Registrierkasse.
- **Wie ausgelöst:** Buchung `reason: 'cashout'` (F-ROULETTE-046).
- **Soll-Ergebnis:** ein `cashRegister({ key: 'ro-cashout' })`.
- **Vorbedingung:** Ton an, `CASH OUT` erfolgreich.
- **Beobachtbar an:** nur mit dem Ohr.
- **Umgesetzt in:** `sound-roulette.js:490-491`.

### F-ROULETTE-074  Leerlauf: Brummen, Relaisklicken, Ticken
- **Was:** Steht der Tisch still, brummt und tickt er leise vor sich hin; sobald eine Runde läuft, tritt dieser Klang zurück.
- **Wie ausgelöst:** Freigabe des Tonkanals (Start), und jeder Zustandswechsel des Tisches.
- **Soll-Ergebnis:** Leerlauf hörbar nur im Zustand `setzen`; in `gesperrt`/`laeuft`/`auswerten`/`auszahlen` tritt er zurück. Eine Instanz je Gerät.
- **Vorbedingung:** Ton an, Tonkanal freigegeben.
- **Beobachtbar an:** nur mit dem Ohr, gekoppelt an `data-ro-state`.
- **Umgesetzt in:** `sound-roulette.js:480-483`; `roulette.js:257-260`.

## Der Lobby-Anschluss (QR-Lobby, mehrere Menschen an einem Tisch)

Läuft der Tisch in einer QR-Lobby, ist es **derselbe** Tisch — mit drei
Unterschieden: die Runde beginnt nicht auf Knopfdruck, sondern wenn der Server
eine Saat schickt; das Tuch geht nach der Uhr des Servers zu; und die Einsätze
der Mitspieler werden sichtbar. Der Adapter importiert aus `casino_lobby`
**nichts** — er hört zwei DOM-Ereignisse ab und wirft zwei.
Läuft keine Lobby, kommt nie ein Ereignis, und der Tisch spielt wie gewohnt.

### F-ROULETTE-080  Runde beginnt mit der Saat des Servers (nur Lobby)
- **Was:** Statt dass die Hand des Spielers wirft, schickt der Server eine Saat; jeder Browser rechnet daraus **dieselbe** Runde, sodass alle dieselbe Zahl fallen sehen.
- **Wie ausgelöst:** DOM-Ereignis `casino:lobby-runde` mit `detail.saat` (16 Hex-Zeichen) und `detail.runde`.
- **Soll-Ergebnis:** Der Zufallsgeber wird für die Dauer der Runde auf einen wiederholbaren Geber aus dieser Saat umgestellt, die Runde startet, und nach dem Ergebnis geht der Geber zurück auf echten Zufall. Liegt kein eigener Einsatz, schaut dieser Browser nur zu und der Geber geht sofort zurück.
- **Vorbedingung:** QR-Modus/Lobby aktiv (`lobby-live.js` eingespeist).
- **Beobachtbar an:** Rad läuft ohne Knopfdruck an; `data-ro-state` wechselt auf `laeuft`; dasselbe `data-ro-result` in allen beteiligten Browsern.
- **Umgesetzt in:** `Resources/Public/JavaScript/lobby-roulette.js:50-66, 120`; `roulette.js:240-241, 414, 457-459`; `Resources/Public/JavaScript/rng.js` (`createSeeded`, `saatZuZahl`).

### F-ROULETTE-081  Tuch geht nach der Uhr des Servers zu (nur Lobby)
- **Was:** Wann „nichts mehr geht" entscheidet in der Lobby der Server, nicht der eigene Knopf.
- **Wie ausgelöst:** DOM-Ereignis `casino:lobby-stand` mit `detail.z` (Zustand) — `setzen` heißt offen, alles andere zu.
- **Soll-Ergebnis:** Ist der Serverzustand nicht `setzen`, werden alle 159 Felder gesperrt; wechselt er zurück, werden sie wieder freigegeben. Tuch und Bedienleiste werden neu gezeichnet.
- **Vorbedingung:** Lobby aktiv.
- **Beobachtbar an:** `aria-disabled="true"` an `[data-ck-field]` ohne dass `data-ro-state` sich geändert hätte.
- **Umgesetzt in:** `lobby-roulette.js:95-99, 121`; `roulette.js:470-479`.

### F-ROULETTE-082  Rundenauslöser dauerhaft gesperrt (nur Lobby)
- **Was:** In der Lobby beginnt eine Runde nie auf Knopfdruck — „Kugel werfen" ist deshalb dauerhaft gesperrt.
- **Wie ausgelöst:** Erstes `casino:lobby-stand`-Ereignis.
- **Soll-Ergebnis:** `[data-ck-table-go]` trägt dauerhaft `aria-disabled="true"`, bleibt aber in der Tastaturreihenfolge.
- **Vorbedingung:** Lobby aktiv.
- **Beobachtbar an:** `aria-disabled="true"` am `[data-ck-table-go]`, auch während `data-ro-state="setzen"`.
- **Umgesetzt in:** `roulette.js:470-475`.

### F-ROULETTE-083  Eigenen Einsatz an die Lobby melden (nur Lobby)
- **Was:** Was diese Spielerin auf dem Tuch liegen hat, wird an die Lobby gemeldet, damit die anderen es sehen können.
- **Wie ausgelöst:** Jedes `casino:lobby-stand`-Ereignis, solange der Server auf `setzen` steht — gemeldet wird aber nur, wenn sich der eigene Einsatz seit der letzten Meldung **geändert** hat.
- **Soll-Ergebnis:** DOM-Ereignis `casino:lobby-handlung` mit `{art: 'einsatz', daten: {runde, felder: [{f: Feldkennung, b: Betrag}]}}`; je Feld eine Summe.
- **Vorbedingung:** Lobby aktiv, Serverzustand `setzen`.
- **Beobachtbar an:** abgesendetes `casino:lobby-handlung`-Ereignis am Dokument.
- **Umgesetzt in:** `lobby-roulette.js:101-117`; `roulette.js:461-469`.

### F-ROULETTE-084  Einsätze der anderen sichtbar machen (nur Lobby)
- **Was:** Die Chips der Mitspieler sollen auf demselben Tuch erscheinen.
- **Wie ausgelöst:** `casino:lobby-stand` mit `detail.p` (Liste der Plätze).
- **Soll-Ergebnis:** Die fremden Einsätze werden an die Tuchansicht weitergereicht.
- **Vorbedingung:** Lobby aktiv.
- **Beobachtbar an:** laut README: fremde Chips auf dem Tuch. Im Quelltext ist der Aufruf `felt?.foreign?.(plaetze)` optional gesetzt (siehe „Beobachtungen").
- **Umgesetzt in:** `roulette.js:480`; `lobby-roulette.js:99`.

### F-ROULETTE-085  Ergebnis an die Lobby melden (nur Lobby)
- **Was:** Ein Browser meldet das Ergebnis der Runde an den Server, der es einmal festschreibt — der Server kann die Physik nicht nachrechnen.
- **Wie ausgelöst:** Ende der eigenen Auswertung (F-ROULETTE-033), genau einmal je Runde.
- **Soll-Ergebnis:** DOM-Ereignis `casino:lobby-fertig` mit `{ergebnis: '<Zahl>'}`; danach geht der Geber zurück auf echten Zufall. Eine zweite Meldung derselben Runde unterbleibt.
- **Vorbedingung:** Lobby aktiv, eigene Runde ausgewertet.
- **Beobachtbar an:** abgesendetes `casino:lobby-fertig`-Ereignis; festgeschriebenes Ergebnis in der Lobby.
- **Umgesetzt in:** `lobby-roulette.js:75-87`; `roulette.js:301-306`.

### F-ROULETTE-086  Eigene Bilanz an die Lobby melden (nur Lobby)
- **Was:** Was die Runde für diesen Platz gebracht oder gekostet hat, geht als reine Anzeige an die anderen.
- **Wie ausgelöst:** Zusammen mit F-ROULETTE-085.
- **Soll-Ergebnis:** DOM-Ereignis `casino:lobby-handlung` mit `{art: 'bilanz', daten: {runde, aus: {Feldkennung: Rückgabe − Einsatz}}}`. Es wird **kein** Geld über diesen Weg gebucht — die Auszahlung läuft unverändert über die Bank.
- **Vorbedingung:** Lobby aktiv.
- **Beobachtbar an:** abgesendetes `casino:lobby-handlung`-Ereignis mit `art: 'bilanz'`.
- **Umgesetzt in:** `lobby-roulette.js:84-86`; `roulette.js:301-306`.

### Was es nur im Einzelspiel gibt
- **F-ROULETTE-030 „Kugel werfen":** nur im Einzelspiel startet ein Mensch die Runde; in der Lobby ist der Auslöser gesperrt (F-ROULETTE-082).
- **F-ROULETTE-031 / F-ROULETTE-032 (Absagen „kein Einsatz" / „Kugel läuft noch"):** diese Ansagen hängen am Auslöserweg (`onGo`) und erklingen in der Lobby nicht — dort wird eine nicht startbare Runde stillschweigend nur beobachtet.
- **Echter Zufall je Runde:** außerhalb der Lobby zieht der Tisch aus `crypto.getRandomValues()`; in der Lobby tritt für die Rundenlaufzeit der saatgesteuerte Geber an diese Stelle.

### Was es nur in der Lobby gibt
- F-ROULETTE-080 bis F-ROULETTE-086.
- Zusätzlich der Uhr-Rückruf `uhr(rest, zustand)`: die Lobby liefert die Restzeit, dieser Tisch tut damit derzeit nichts (`uhr: () => {}`).

## Anzeigen, Texte und Reihenfolge am Tisch

### F-ROULETTE-090  Überschrift „Setzfläche" und Bedienhinweis
- **Was:** Der Tisch trägt eine Überschrift für das Tuch und einen Satz, der erklärt, wie das Rad sich verhält.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Sichtbar: „Setzfläche" als Überschrift; darunter der Hinweis „Das Rad läuft immer weiter. Ein Druck auf ‚Kugel werfen' gibt ihm einen neuen Schwung und wirft die Kugel gegenläufig ein."
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<h2 class="ro-felt__title" id="ro-felt-title">`; `<p class="ck-table__hint">`; `<section aria-labelledby="ro-felt-title">`.
- **Umgesetzt in:** `Table.html:67-70, 107-109`; `locallang.xlf:17-19, 80-82`.

### F-ROULETTE-091  Die Reihenfolge beim Durchtabben
- **Was:** Wer den Tisch zum ersten Mal mit der Tastatur betritt, hört zuerst, wie er bedient wird.
- **Wie ausgelöst:** Tabulator ab dem Seitenanfang.
- **Soll-Ergebnis:** Reihenfolge: geteilte Ansage → Überschrift und Tisch (mit Sprunglink an seinem Anfang) → Rundenansage → Ton-Schalter → Hinweis und Bedienleiste → Verlaufsstreifen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Reihenfolge der Elemente im Markup des `[data-ck-table]`.
- **Umgesetzt in:** `Table.html:62-113`.

### F-ROULETTE-092  Zwei getrennte Live-Bereiche
- **Was:** Der Tisch sagt zwei verschiedene Dinge an zwei verschiedenen Stellen an, damit keine Ansage die andere überschreibt: Chips und Bedienleiste im geteilten Bereich, der Rundenausgang im eigenen.
- **Wie ausgelöst:** jede Bedienhandlung bzw. jedes Rundenereignis.
- **Soll-Ergebnis:** Beide Bereiche werden **leer** ausgeliefert und erst von JavaScript gefüllt; beide sagen mit 700 ms Entprellung und sofortiger erster Ansage an.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `[data-ck-table-status]` (geteilt) und `<p class="ro-status" data-ro-status role="status">` (dieser Tisch) — beim ersten Laden beide ohne Textinhalt.
- **Umgesetzt in:** `Status.html:1-39`; `roulette.js:178-195, 391-395`.

### F-ROULETTE-093  Verlaufsstreifen mit Leertext
- **Was:** Unter dem Tisch steht ein Streifen der bisherigen Ergebnisse; solange keins da ist, steht dort ein erklärender Satz.
- **Wie ausgelöst:** Seitenaufruf (Leertext), jede ausgewertete Runde (Marke).
- **Soll-Ergebnis:** Der Leertext verschwindet, sobald die erste Marke eingetragen ist.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `<ol class="ck-history" data-ck-table-history>` und `<p data-ck-table-history-empty>`.
- **Umgesetzt in:** `Table.html:112`; `roulette.js:155, 383-385`.

### F-ROULETTE-094  Die Tischzeichnung (Holzrahmen, Mulde, Pfeilfelder)
- **Was:** Rad und Spielplan liegen auf **einer** Fläche mit Holzrahmen, Messingfase, Zarge, Tuch und Radmulde; die zwei Pfeilumrisse für `0` und `00` sind gerechnete Pfade.
- **Wie ausgelöst:** Seitenaufruf.
- **Soll-Ergebnis:** Ein Kasten im Seitenverhältnis 504 : 160 mit drei gestapelten Schichten (Zeichnung / Rad / Knöpfe). Die Zeichnung sagt für Vorleseprogramme nichts.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `Cloth.html`-SVG mit `viewBox="0 0 504 160"` und `aria-hidden`; Pfeilpfade aus `BetLayout::arrowPaths()`.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Roulette/Cloth.html`; `Classes/BetLayout.php:152-179, 290-320`; `Table.html:86-100`.

### F-ROULETTE-095  Seitenbeschreibung und strukturierte Daten der Tischseite
- **Was:** Die Seite, auf der der Tisch steht, bekommt automatisch eine Kurzbeschreibung für Suchmaschinen und KI-Bots.
- **Wie ausgelöst:** Rendern des Inhaltselements „Roulette" (DataProcessor-Kette, Schritt 20).
- **Soll-Ergebnis:** `<meta name="description">` mit dem Text „Amerikanisches Rad mit 38 Fächern und doppelter Null. …" und ein schema.org-Eintrag vom Typ `Game`, Gattung `tisch` — nur auf dieser Seite, nicht global.
- **Vorbedingung:** Inhaltselement liegt auf der Seite.
- **Beobachtbar an:** `<meta name="description" content="Amerikanisches Rad …">` im Quelltext der Seite; JSON-LD-Block.
- **Umgesetzt in:** `ext_localconf.php:84-87`; `casino_startpage/Classes/DataProcessing/DeviceDescriptionProcessor.php`.

## Beobachtungen, nicht bewertet

- Die README sagt für die Lobby „die Einsätze der anderen werden sichtbar"; im Quelltext ruft `roulette.js:480` dafür `felt?.foreign?.(plaetze)` auf, und eine Methode `foreign` ist im geteilten Baustein `casino_startpage/.../table-felt.js` nicht zu finden (dieselbe Aufrufform steht auch in `craps.js` und `blackjack.js`).
- Die README beschreibt den Lobby-Adapter als „hört vier DOM-Ereignisse ab"; im Quelltext hört er **zwei** ab (`casino:lobby-runde`, `casino:lobby-stand`) und wirft **zwei** (`casino:lobby-fertig`, `casino:lobby-handlung`).
- Der Uhr-Rückruf der Lobby (`uhr(rest, zustand)`) ist in `roulette.js:481` als leere Funktion verdrahtet — die Restzeit des Servers wird an diesem Tisch nirgends angezeigt.
- Die README sagt selbst, dass ihre Wettentabelle von keinem Prüfskript gegengelesen wird und veralten kann, ohne dass etwas auffällt.
- `data-ro-total` wird ausdrücklich nur nach einer Auswertung geschrieben und zeigt zwischen den Runden (nach Buy-in, `CASH OUT`, gelegten Chips) den Stand der letzten Runde — so in der README festgehalten.
- Der Ton-Schalter liefert `aria-pressed="true"` bereits im Markup aus; steht im Speicher „Ton aus", meldet er bis zum ersten JavaScript-Lauf einen anderen Zustand, als tatsächlich gilt — in der README als projektweit konsistent benannt.
- `Classes/Roulette.php:48` legt einen `CREDIT_KEY` fest; der Tisch bezieht seinen Schlüssel zur Laufzeit aus dem Markup (`data-ck-table-key`).
- Die beiden hohen Chipwerte (500 € und 1.000 €) fehlen an diesem Tisch bewusst, weil der Feldhöchsteinsatz bei 100 € liegt.
- Für die Zählleiter beim Gewinn gibt es an diesem Tisch keine sichtbare Zähleranzeige; der Klang zählt eine feste kurze Folge — im Quelltext als bewusste Vereinfachung vermerkt.
- Die README nennt als Stand Version 0.5.0 (alpha).

---

<!-- ===================== reel_slot ===================== -->

# Funktionsinventur: `reel_slot` — „Reel Slot"

Der erste Spielautomat des Hauses: ein klassischer Drei-Walzen-Automat („einarmiger
Bandit") mit Hebel, Gewinntabelle, Münzeinwurf, Risiko-Leiter, Auto-Modus und Klang.
Die gesamte Spiellogik läuft im Browser; die Extension hat kein Extbase-Plugin, keine
eigene Datenbanktabelle und keine serverseitige Spiellogik — sie liefert nur das
Inhaltselement, das Gehäuse (SVG/Fluid) und sechzehn ES-Module aus.

---

## Rückseite: Backend-Pflege

### F-REELSLOT-01  Inhaltselement „Reel Slot" anlegen
- **Was:** Ein Redakteur legt auf einer Seite das Inhaltselement „Reel Slot" an; damit
  steht der Automat spielbereit auf dieser Seite.
- **Wie ausgelöst:** Im Backend „Neues Inhaltselement" → Gruppe der Casino-Elemente →
  „Reel Slot" (`CType = reel_slot`), speichern.
- **Soll-Ergebnis:** Auf der Seite wird im Frontend das vollständige Gehäuse gerendert
  (`div.rs-machine.ck-room-fill`), `machine.css` und das ES-Modul
  `@phomo17/reel-slot/reel-slot.js` werden nur auf dieser Seite geladen.
- **Vorbedingung:** Extension aktiviert; keine weitere Einstellung nötig.
- **Beobachtbar an:** `tt_content.CType = 'reel_slot'`; im Frontend `.rs-machine` im
  Quelltext; `<link>` auf `machine.css` und Import-Map-Eintrag `@phomo17/reel-slot/`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:30-39`;
  `ext_localconf.php:55-71`; `Resources/Private/ContentElements/Machine.html:36-43`.

### F-REELSLOT-02  Das Element hat keine Einstellungen
- **Was:** Das Inhaltselement bietet dem Redakteur bewusst kein einziges eigenes Feld;
  es gibt nichts zu konfigurieren.
- **Wie ausgelöst:** Öffnen des Datensatzes im Backend.
- **Soll-Ergebnis:** Nur die Systemfelder (Typ, Spalte, Sprache, Zugriff, Notizen)
  erscheinen; keine Überschriften-Palette, kein Automaten-spezifisches Feld.
- **Vorbedingung:** keine.
- **Beobachtbar an:** leere Feldliste (zweites Argument `''` bei `addRecordType`); keine
  `ext_tables.sql` in der Extension.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:31-39`.

### F-REELSLOT-03  Anmeldung als Automat im Spielsaal
- **Was:** Der Automat meldet sich beim Saal (Site Package) an, damit ihn ein
  Redakteur im Inhaltselement „Casino-Automat" auswählen und mit einer Zielseite
  verknüpfen kann.
- **Wie ausgelöst:** Automatisch beim Laden von `ext_localconf.php`; sichtbar wird es,
  wenn der Redakteur auf der Startseite ein Element „Casino-Automat" anlegt und dort
  „Reel Slot" wählt.
- **Soll-Ergebnis:** „Reel Slot" steht in der Auswahlliste des Elements
  „Casino-Automat"; die Saal-Miniatur wird aus
  `Automat/ReelSlot/Cabinet` gezeichnet; `Resources/Private/Partials/` wird automatisch
  an die `partialRootPaths` des Saal-Elements gehängt.
- **Vorbedingung:** `casino_startpage` >= 0.5.0 installiert.
- **Beobachtbar an:** Eintrag im Auswahlfeld des Elements „Casino-Automat"; im Saal eine
  `.ck-cabinet` mit `svg.ck-cabinet__drawing` (viewBox 100 : 160).
- **Umgesetzt in:** `ext_localconf.php:21-27`; `Classes/ReelSlot.php:21-47`;
  `Resources/Private/Partials/Automat/ReelSlot/Cabinet.html`.

### F-REELSLOT-04  Seitenbeschreibung und strukturierte Daten
- **Was:** Auf der Automatenseite setzt ein generischer Baustein des Site Package die
  `<meta name="description">` und einen Game-Eintrag als strukturierte Daten, mit Titel
  und Beschreibung dieses Automaten.
- **Wie ausgelöst:** Automatisch beim Rendern der Seite, auf der das Element liegt.
- **Soll-Ergebnis:** Im `<head>` der Seite steht
  `<meta name="description" content="Klassischer Drei-Walzen-Automat im
  Chrom-und-Holz-Gehäuse der 1950er Jahre, mit Hebel, Risiko-Leiter und Auto-Modus.">`
  sowie ein JSON-LD-Eintrag mit dem Titel „Reel Slot".
- **Vorbedingung:** Das Inhaltselement liegt auf der Seite.
- **Beobachtbar an:** `meta[name=description]` im HTML-Kopf; JSON-LD im Quelltext.
- **Umgesetzt in:** `ext_localconf.php:61-67`;
  `Resources/Private/Language/locallang.xlf:6-11`.

---

## Der Hebel (eigene Funktionsgruppe)

### F-REELSLOT-05  Hebel ziehen und damit eine Runde starten
- **Was:** Der Spieler packt den Hebel und zieht ihn nach unten; dadurch beginnt eine
  Spielrunde. Ein bloßer Klick löst ausdrücklich nichts aus — es muss gezogen werden.
- **Wie ausgelöst:** `pointerdown` auf `.rs-lever` (Maus, Finger oder Stift), dann
  Zeiger nach unten bewegen, dann loslassen (`pointerup`). Ausgelöst wird beim
  Loslassen, wenn mindestens **70 % des Zugwegs** zurückgelegt wurden
  (`TRIGGER = 0.7`). Der Zugweg ist **22 % der Gehäusehöhe** (`PULL_FRACTION = 0.22`),
  mindestens 1 px.
- **Soll-Ergebnis:** `Machine.startRound()` wird gerufen: es wird gewürfelt, das
  abbrechbare Ereignis `rs:round` gefeuert, bei Nicht-Abbruch wechselt der Zustand von
  `idle`/`result` auf `spinning` und die drei Walzen laufen an. Der Hebel schlägt in
  90 ms bis zum Anschlag durch (`.rs-lever--pulled`, Winkel +80°) und schnellt danach
  in 520 ms in die Ruhelage −25° zurück.
- **Vorbedingung:** Zustand `idle` oder `result` (`Machine.canPull`); der Gerätekredit
  muss für den gewählten Einsatz reichen, sonst bricht `wallet.js` `rs:round` ab.
  Während einer laufenden Risiko-Leiter fängt `risk.js` `rs:round` in der
  Erfassungsphase am Dokument ab, der Hebel bleibt dann folgenlos.
- **Beobachtbar an:** `data-rs-round` am `.rs-machine` trägt die Ziehung als
  `"a-b-c"` (drei Zahlen 0–19); Ereignis `rs:state` mit `{from, to: 'spinning'}`;
  CSS-Eigenschaft `--rs-lever-angle` am `.rs-lever` während des Zugs; Klang
  „Klack der Klinke".
- **Umgesetzt in:** `Resources/Public/JavaScript/lever.js:26-60` (Konstanten),
  `lever.js:103-168` (Zug und Auslösung); `machine.js:202-209`, `machine.js:276-310`.

### F-REELSLOT-06  Hebel folgt dem Zeiger, auch außerhalb des Hebels
- **Was:** Solange gezogen wird, folgt der Hebelarm der Zeigerbewegung ohne
  Verzögerung — auch dann, wenn der Zeiger den Hebel verlässt.
- **Wie ausgelöst:** `pointermove` nach `pointerdown`; der Hebel fängt den Zeiger mit
  `setPointerCapture()` ein.
- **Soll-Ergebnis:** Der Winkel wandert linear von −25° (Ruhe) bis +80° (Anschlag),
  proportional zum Anteil des zurückgelegten Zugwegs; `--rs-lever-duration` steht
  während des Zugs auf `0ms`. Die Kugel dreht gegenläufig, damit ihr Glanzpunkt
  stehen bleibt.
- **Vorbedingung:** ein laufender Zug (`dragging === true`), derselbe `pointerId`.
- **Beobachtbar an:** Inline-Stil `--rs-lever-angle` am `.rs-lever`, Wert in Grad mit
  einer Nachkommastelle.
- **Umgesetzt in:** `Resources/Public/JavaScript/lever.js:108-131`, `lever.js:174-176`.

### F-REELSLOT-07  Hebel zu kurz gezogen — er schnellt folgenlos zurück
- **Was:** Wer den Hebel loslässt, bevor 70 % des Wegs erreicht sind, löst nichts aus;
  der Hebel geht federnd in die Ruhelage zurück.
- **Wie ausgelöst:** `pointerup` mit `progress < 0.7`, oder `pointercancel` (ein
  abgebrochener Zeiger löst nie aus, auch bei vollem Weg nicht).
- **Soll-Ergebnis:** Keine Runde, kein `rs:round`, kein Zustandswechsel. Der
  Inline-Winkel wird entfernt, `--rs-lever-duration` auf `520ms` gesetzt, der Arm
  kehrt nach −25° zurück.
- **Vorbedingung:** ein laufender Zug.
- **Beobachtbar an:** `data-rs-round` am `.rs-machine` bleibt unverändert; kein
  `rs:state`-Ereignis; `--rs-lever-duration: 520ms`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lever.js:137-168`.

### F-REELSLOT-08  Hebelzug zur Unzeit — Bewegung ja, Wirkung nein
- **Was:** Zieht jemand den Hebel, während die Walzen laufen oder ausgewertet wird,
  bewegt sich der Hebel normal, aber es beginnt keine Runde.
- **Wie ausgelöst:** Vollständiger Hebelzug, während der Zustand `spinning`,
  `stopping` oder `evaluating` ist.
- **Soll-Ergebnis:** `startRound()` gibt sofort `false` zurück (`canPull === false`);
  es wird nicht gewürfelt, `rs:round` wird nicht gefeuert, nichts abgebucht. Der
  Hebel führt trotzdem Nachschlag und Zurückschnellen aus.
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** `data-rs-round` behält den Wert der laufenden Runde; kein
  zusätzliches `rs:round`-Ereignis; kein Klang der Absage.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:216-219`,
  `machine.js:276-279`.

### F-REELSLOT-09  Seite scrollt beim Fingerzug nicht weg
- **Was:** Ein Fingerzug am Hebel zieht den Hebel, statt die Seite zu scrollen.
- **Wie ausgelöst:** Berührung auf `.rs-lever`.
- **Soll-Ergebnis:** Die Seite bleibt stehen; nur der Hebel bewegt sich. Ohne
  JavaScript bleibt die Seite dagegen ganz normal scrollbar, weil `touch-action`
  erst vom Skript gesetzt wird.
- **Vorbedingung:** JavaScript aktiv.
- **Beobachtbar an:** Inline-Stil `touch-action: none` am `.rs-lever`.
- **Umgesetzt in:** `Resources/Public/JavaScript/lever.js:87`.

### F-REELSLOT-10  Runde von außen anstoßen (`rs:spin`)
- **Was:** Ein Ereignis von außen wirkt genau wie ein Hebelzug — das ist der Weg, über
  den der Auto-Modus spielt.
- **Wie ausgelöst:** `rs:spin` am `.rs-machine` (nicht abbrechbar, ohne `detail`).
- **Soll-Ergebnis:** Genau ein `startRound()`, also derselbe Weg samt Ziehung,
  `rs:round`-Veto und Abbuchung. Ob die Runde zustande kam, ist am folgenden
  `rs:state` mit `to: 'spinning'` abzulesen.
- **Vorbedingung:** dieselben wie beim Hebel (`canPull`, Gerätekredit reicht).
- **Beobachtbar an:** `rs:state`-Ereignis; `data-rs-round` am `.rs-machine`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:507-512`.

---

## Rundenablauf, Walzen und Taste STOP

### F-REELSLOT-11  Die Ziehung beim Hebelzug
- **Was:** Im Moment des Hebelzugs wird das Ergebnis gezogen — dreimal unabhängig,
  je gleichverteilt über die 20 Rasterpositionen der eigenen Walze. Danach ist es
  nicht mehr beeinflussbar.
- **Wie ausgelöst:** `startRound()`, der einzige Aufruf von `drawIndex(20)`.
- **Soll-Ergebnis:** Drei Zahlen 0–19 stehen fest; sie stehen ab diesem Moment und
  schon vor dem ersten STOP von außen am Gehäuse.
- **Vorbedingung:** `canPull`.
- **Beobachtbar an:** `data-rs-round` am `.rs-machine`, Format `"12-3-19"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:284-295`;
  `Resources/Public/JavaScript/rng.js`.

### F-REELSLOT-12  Die Walzen laufen an und halten von allein
- **Was:** Nach dem Hebelzug laufen die drei Walzen an und kommen nacheinander von
  selbst zum Stehen, wenn niemand STOP drückt.
- **Wie ausgelöst:** automatisch nach `startRound()`; Halt befohlen bei
  **1,2 s / 1,9 s / 2,6 s** nach dem Hebelzug.
- **Soll-Ergebnis:** Walze 1 bis 3 laufen mit 40 / 42 / 38 Zellen je Sekunde,
  verzögert um 0 / 70 / 140 ms, mit 260 ms Anlauf; nach dem Haltbefehl folgen
  Auslauf, feste Bremsstrecke von 9 Zellen und ein Nachfedern von 0,30 Zellen über
  130 ms. Zwischen zwei Stillständen liegen mindestens 0,1 s, die Reihenfolge
  1 → 2 → 3 bleibt gewahrt.
- **Vorbedingung:** Runde zustande gekommen (Zustand `spinning`).
- **Beobachtbar an:** CSS-Eigenschaft `--rs-reel-pos` je `.rs-reel` (Bruchzahl,
  ändert sich je Bild); Ereignis `rs:reelrest` je Walze mit
  `{reel, cell, symbol}`; Klang „Walzenstopp, je Walze eine Stufe tiefer".
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:149`, `machine.js:159`,
  `machine.js:362-397`; `Resources/Public/JavaScript/reel.js:88-111`.

### F-REELSLOT-13  Taste STOP
- **Was:** Die Taste STOP hält die erste noch laufende Walze an. Auf das Ergebnis hat
  der Zeitpunkt des Drückens keinen Einfluss.
- **Wie ausgelöst:** `pointerdown` auf `.rs-btn[data-rs-button="stop"]` (nicht erst
  beim Loslassen); nur der primäre Zeiger.
- **Soll-Ergebnis:** Die vorderste noch anhaltbare Walze bekommt den Haltbefehl und
  bremst auf ihre bereits feststehende Zielposition; der Zustand wechselt von
  `spinning` auf `stopping`. Die Tastenkappe bleibt gedrückt, solange der Zeiger
  unten ist.
- **Vorbedingung:** Zustand `spinning` oder `stopping`, und mindestens eine Walze ist
  noch anhaltbar. Sonst tut die Taste ausdrücklich nichts.
- **Beobachtbar an:** Klasse `rs-btn--pressed` an der Taste; `rs:state` mit
  `to: 'stopping'`; kürzere Laufzeit der Walze; `data-rs-round` bleibt unverändert.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:320-341`,
  `machine.js:473-493`.

### F-REELSLOT-14  Auswertung und Anzeige des Gewinns
- **Was:** Stehen alle drei Walzen, wird gelesen, was auf der Gewinnlinie steht, und
  gegen die Gewinntabelle geprüft.
- **Wie ausgelöst:** automatisch, sobald alle drei Walzen ruhen.
- **Soll-Ergebnis:** Zustand `evaluating`, dann `result`. Die Nixie-Gruppe `gewinn`
  zeigt `Faktor × Einsatz`; bei einem Treffer bekommen die beteiligten Walzen die
  Klasse `rs-reel--win` und die Gewinnlinie `rs-payline--win`. Es zählt immer nur die
  **höchste** zutreffende Zeile, nie die Summe mehrerer Zeilen.
- **Vorbedingung:** Runde gelaufen.
- **Beobachtbar an:** Ereignis `rs:result` mit
  `{symbols, row, factor, bet, win}`; Klassen `rs-reel--win` / `rs-payline--win`;
  `--rs-digit` an den Röhren der Gruppe `data-rs-display="gewinn"`; Gewinn-Jingle.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:404-447`;
  `Resources/Public/JavaScript/paytable.js:113-129`.

### F-REELSLOT-15  Anzeige der Vorrunde wird abgeräumt
- **Was:** Beim Start einer neuen Runde verschwinden Hervorhebung und Gewinnbetrag der
  vorigen Runde.
- **Wie ausgelöst:** automatisch in `startRound()`, vor dem Anlaufen.
- **Soll-Ergebnis:** `rs-reel--win` und `rs-payline--win` sind entfernt, die
  Nixie-Gruppe `gewinn` zeigt 00000.
- **Vorbedingung:** Runde kommt zustande.
- **Beobachtbar an:** Fehlen der beiden Klassen; `--rs-digit: 0` an allen fünf
  GEWINN-Röhren.
- **Umgesetzt in:** `Resources/Public/JavaScript/machine.js:454-460`.

---

## Die Gewinntabelle

### F-REELSLOT-16  Gewinnzeilen und ihre Werte
- **Was:** Neun Gewinnzeilen, absteigend nach Wert. Der ausgezahlte Betrag ist
  **Faktor × Einsatz**; es zählt immer nur die höchste zutreffende Zeile.
- **Wie ausgelöst:** Auswertung am Ende jeder Runde (`evaluate(symbols)`).
- **Soll-Ergebnis:** Aus dem Quelltext (`paytable.js:56-70`), von links nach rechts
  Walze 1 / 2 / 3, `*` = beliebiges Symbol:

  | Kennung | Muster | Faktor |
  |---|---|---|
  | `sieben3` | Sieben · Sieben · Sieben | **100** |
  | `bar3` | BAR · BAR · BAR | **50** |
  | `glocke3` | Glocke · Glocke · Glocke | **20** |
  | `melone3` | Melone · Melone · Melone | **14** |
  | `orange3` | Orange · Orange · Orange | **10** |
  | `zitrone3` | Zitrone · Zitrone · Zitrone | **8** |
  | `kirsche3` | Kirsche · Kirsche · Kirsche | **5** |
  | `kirsche2` | Kirsche · Kirsche · `*` | **3** |
  | `kirsche1` | Kirsche · `*` · `*` | **1** |

  Trifft keine Zeile, liefert `evaluate()` `null` und der Gewinn ist 0.
- **Vorbedingung:** genau drei Symbolnamen; sonst `TypeError`.
- **Beobachtbar an:** `rs:result.detail.row` (die Kennung oder `null`),
  `.detail.factor`, `.detail.win`; die gezeichnete Gewinnkarte hinter Glas zeigt
  dieselben Werte 100 / 50 / 20 / 14 / 10 links und 8 / 5 / 3 / 1 rechts.
- **Umgesetzt in:** `Resources/Public/JavaScript/paytable.js:40-70`,
  `paytable.js:92-129`; gedruckte Fassung
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Shell.html:223-310`.

### F-REELSLOT-17  Welche Walzen der Treffer hervorhebt
- **Was:** Nach einem Treffer leuchten genau die Walzen auf, die am Treffer beteiligt
  sind — bei „Kirsche nur auf Walze 1" also nur die erste.
- **Wie ausgelöst:** automatisch nach der Auswertung.
- **Soll-Ergebnis:** `row.reels` ist je Walze `true`, wenn das Musterfeld kein
  Platzhalter ist; nur diese Walzen bekommen `rs-reel--win`.
- **Vorbedingung:** ein Treffer.
- **Beobachtbar an:** Klasse `rs-reel--win` an den betroffenen `.rs-reel`.
- **Umgesetzt in:** `Resources/Public/JavaScript/paytable.js:120-124`;
  `Resources/Public/JavaScript/machine.js:430-437`.

### F-REELSLOT-18  Die Walzenbänder
- **Was:** Jede der drei Walzen trägt 20 Rasterpositionen mit den sieben Symbolen;
  die Verteilung bestimmt, wie oft welcher Treffer fällt.
- **Wie ausgelöst:** serverseitig beim Rendern der Seite; der Spielkern liest die
  Reihenfolge aus dem Markup, statt sie zu wiederholen.
- **Soll-Ergebnis:** Symbolzahlen je Walze — Kirsche 8/9/5, Zitrone 3/3/4,
  Orange 2/3/2, Melone 2/2/2, Glocke 2/1/3, BAR 2/1/2, Sieben 1/1/2 (Summe je 20).
  Gerendert werden je Walze 40 Zellen (zwei volle Umläufe), damit der Rundumschluss
  nicht sichtbar springt. Beim Seitenaufruf stehen die Walzen auf den Zellen
  21 / 25 / 32. Der Kommentar im Quelltext nennt dafür „BAR · Glocke · Sieben"
  (bezogen auf den alten Anhang A); nach den heute eingetragenen Bändern
  (`Rules::STRIPS`) ergibt derselbe Zellindex Zitrone · Melone · Kirsche. Ein Gewinn
  nach der Gewinntabelle ist beides nicht.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Attribut `data-rs-strip` je `svg.rs-reel__strip` (20 Namen,
  kommagetrennt); Inline-Stil `--rs-reel-pos` mit 21 / 25 / 32 beim Laden;
  `data-rs-reel` mit 1 / 2 / 3.
- **Umgesetzt in:** `Classes/Rules.php:44-90`;
  `Classes/DataProcessing/MachineProcessor.php:128-207`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Reel.html:32-43`.

---

## Das Geld (eigene Funktionsgruppe)

Zwei Töpfe: die **Kasse** (Gesamtbestand aller Geräte, Anzeige im Kassenfenster im
Sockel) und der **Gerätekredit** (was in *diesem* Gerät liegt, Anzeige in der
Nixie-Gruppe GUTHABEN). Gespielt wird ausschließlich vom Gerätekredit; der ist beim
Betreten der Seite immer 0. Der Automat greift nie selbst auf den Browserspeicher zu.

### F-REELSLOT-19  Geld einwerfen über die drei Messingknöpfe
- **Was:** Drei Knöpfe am Sockel werfen 10, 50 oder 100 aus der Kasse in das Gerät.
- **Wie ausgelöst:** `click` auf `.rs-coinslot__button[data-rs-coin-add="10|50|100"]`.
- **Soll-Ergebnis:** Der Betrag wird aus der Kasse abgebucht und dem Gerätekredit
  gutgeschrieben — **alles oder nichts**. Eine Münze fällt sichtbar in den Schlitz
  (480 ms), der Schlitz blitzt kurz auf, die GUTHABEN-Röhren zählen sichtbar hoch, das
  Kassenfenster sinkt um denselben Betrag. Die Summe beider Töpfe bleibt gleich.
- **Vorbedingung:** Die Kasse muss den vollen Betrag hergeben; der Gerätekredit darf
  nicht am Höchststand stehen.
- **Beobachtbar an:** `data-rs-machine-credit` und `data-rs-bank` am `.rs-machine`
  ändern sich gegenläufig, `data-rs-total` bleibt **unverändert**; Ereignis `rs:coin`
  mit `{amount, moved, reason: 'ok', machineCredit}`; Klasse
  `rs-coinslot__coin--drop`; Münzeinwurf-Klang.
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:154-161`,
  `coinslot.js:228-264`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:166-173`.

### F-REELSLOT-20  Freien Betrag einwerfen
- **Was:** Ein Eingabefeld am Sockel nimmt einen beliebigen ganzzahligen Betrag
  entgegen.
- **Wie ausgelöst:** Zahl in `.rs-coinslot__input[data-rs-coin-input]` eintragen, dann
  entweder auf den gezeichneten Münzschlitz drücken
  (`button[data-rs-coin-insert]`, `type="submit"`) oder im Feld die **Eingabetaste**
  drücken. Beides löst dasselbe aus.
- **Soll-Ergebnis:** Wie F-REELSLOT-19. Nach einem geglückten Einwurf wird das Feld
  geleert; bei einem ungültigen Betrag bleibt die Eingabe stehen. Die Seite lädt dabei
  nicht neu.
- **Vorbedingung:** Feld trägt `min="1"`, `max="999999999"`, `step="1"` — 0 und
  negative Zahlen blockt bereits der Browser mit seiner eigenen Sprechblase.
- **Beobachtbar an:** wie F-REELSLOT-19; zusätzlich leerer `value` des Eingabefelds
  nach Erfolg.
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:163-168`,
  `coinslot.js:188-209`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:175-188`.

### F-REELSLOT-21  Einwurf abgelehnt — Kasse zu gering
- **Was:** Reicht die Kasse für den gewählten Betrag nicht, wird nichts bewegt und das
  Meldungsschild sagt es.
- **Wie ausgelöst:** Einwurfversuch (Knopf, Schlitz oder Eingabetaste) über den
  Kassenbestand hinaus.
- **Soll-Ergebnis:** Weder Kasse noch Gerätekredit ändern sich. Das Meldungsschild
  zeigt **„KASSE ZU GERING"**. Die Münze fällt trotzdem sichtbar — der Druck ist
  angekommen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-total`, `data-rs-bank`, `data-rs-machine-credit`
  unverändert; Ereignis `rs:coin` mit `reason: 'nocash'` und `moved: 0`; Text
  „KASSE ZU GERING" im `p.rs-message[role=status]`; Klang „Absage 1" (zwei dumpfe
  Anschläge, kein Metall).
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:238-248`;
  `Resources/Private/Language/locallang.xlf:110-112`.

### F-REELSLOT-22  Einwurf abgelehnt — Betrag ungültig oder Konto voll
- **Was:** Ein unsinniger Betrag oder ein bereits voller Gerätekredit werden abgewiesen.
- **Wie ausgelöst:** Einwurfversuch mit leerem/unsinnigem Feld (→ `BETRAG UNGÜLTIG`)
  oder bei erreichtem Höchststand des Gerätekredits (→ `KONTO VOLL`).
- **Soll-Ergebnis:** Nichts wird gebucht. Bei ungültigem Betrag fällt **keine** Münze
  („dann war nichts in der Hand"). Beim vollen Konto fällt die Münze.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Text „BETRAG UNGÜLTIG" bzw. „KONTO VOLL" im `p.rs-message`;
  Ereignis `rs:coin` mit `reason: 'full'` (nur im zweiten Fall; bei ungültigem Betrag
  gibt es kein `rs:coin`); Klang „Absage 1".
- **Umgesetzt in:** `Resources/Public/JavaScript/coinslot.js:229-232`,
  `coinslot.js:241-248`; `Resources/Private/Language/locallang.xlf:101-106`.

### F-REELSLOT-23  Einsatz wählen (1 / 2 / 5 / 10)
- **Was:** Vier Tasten in der Sockelreihe wählen den Einsatz je Runde. Vorgewählt ist 1.
- **Wie ausgelöst:** `click` auf `.rs-bet[data-rs-bet="1|2|5|10"]`.
- **Soll-Ergebnis:** Die gewählte Taste bekommt `rs-bet--selected`, alle anderen
  verlieren sie. Die Nixie-Gruppe EINSATZ **springt** auf den Wert (sie zählt
  ausdrücklich nicht hoch, weil der Einsatz eine Schalterstellung ist). Reicht der
  Gerätekredit für den neuen Einsatz nicht, erscheint sofort „GUTHABEN ZU GERING",
  ohne dass man erst am Hebel zieht.
- **Vorbedingung:** Die Einsatzwahl ist offen, also Zustand `idle` oder `result`.
- **Beobachtbar an:** Klasse `rs-bet--selected`; `--rs-digit` an den beiden
  EINSATZ-Röhren; ggf. Text „GUTHABEN ZU GERING".
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:373-416`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:136-141`.

### F-REELSLOT-24  Einsatzwahl während des Zuges gesperrt
- **Was:** Solange die Walzen laufen oder ausgewertet wird, lässt sich der Einsatz nicht
  ändern.
- **Wie ausgelöst:** Automatisch bei jedem `rs:state`; offen nur in `idle` und `result`,
  in jedem anderen Zustand gesperrt.
- **Soll-Ergebnis:** Die Tastengruppe bekommt `rs-bets--locked` (sichtbare Sperre); ein
  Druck auf eine Einsatztaste bleibt zusätzlich im Programm folgenlos — die Sperre
  besteht nicht nur aus CSS. Während einer laufenden Risiko-Leiter bleibt die
  Einsatzwahl absichtlich **offen**, weil der Zug da schon vorbei ist.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Klasse `rs-bets--locked` an `.rs-bets`.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:203-218`,
  `wallet.js:418-431`, `wallet.js:594-605`.

### F-REELSLOT-25  Einsatz abbuchen beim Hebelzug
- **Was:** Mit dem Hebelzug wird der Einsatz vom Gerätekredit abgebucht.
- **Wie ausgelöst:** Zuhörer auf dem abbrechbaren `rs:round`.
- **Soll-Ergebnis:** Ist der Einsatz gedeckt (`canAfford()`), wird die Abbuchung im
  selben Takt angestoßen, das Meldungsschild abgeräumt und die Runde läuft. Der
  Gerätekredit sinkt um den Einsatz, die Kasse bleibt unberührt.
- **Vorbedingung:** Gerätekredit ≥ Einsatz.
- **Beobachtbar an:** `data-rs-machine-credit` sinkt um den Einsatz; `data-rs-bank`
  unverändert; `data-rs-total` sinkt um den Einsatz.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:496-537`.

### F-REELSLOT-26  Zu wenig Gerätekredit — Runde kommt nicht zustande
- **Was:** Reicht der Gerätekredit für den gewählten Einsatz nicht, ist der Zug nicht
  auslösbar.
- **Wie ausgelöst:** Hebelzug (oder `rs:spin`) bei ungedecktem Einsatz.
- **Soll-Ergebnis:** `preventDefault()` auf `rs:round`; die Walzen laufen nicht an,
  **nichts wird abgebucht**, das Meldungsschild zeigt „GUTHABEN ZU GERING". Der Hebel
  schnellt sauber zurück. Nachwerfen ist jederzeit möglich; sobald nachgeworfen ist,
  verschwindet die Meldung sofort.
- **Vorbedingung:** keine.
- **Beobachtbar an:** kein `rs:state` mit `to: 'spinning'`; `data-rs-round`
  unverändert; `data-rs-machine-credit` unverändert; Text „GUTHABEN ZU GERING" im
  `p.rs-message`; Klang „Absage 2" (ein einzelner tiefer Anschlag).
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:500-516`;
  `Resources/Private/Language/locallang.xlf:98-100`.

### F-REELSLOT-27  Erstbesucher wird nicht mit einer Fehlermeldung begrüßt
- **Was:** Beim bloßen Laden der Seite schweigt das Meldungsschild, obwohl der
  Gerätekredit 0 und der Einsatz 1 ist.
- **Wie ausgelöst:** Seitenaufruf ohne jede Bedienung.
- **Soll-Ergebnis:** Kein Text im Meldungsschild. Erst nach der ersten Bedienhandlung
  (Einwurf, Einsatzwahl, Hebelzug, Auszahlung — `ENGAGING_REASONS` = `insert`,
  `stake`, `award`, `cashout`) meldet das Schild wieder von sich aus.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `p.rs-message` ist leer und trägt nicht `rs-message--shown`.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:222-234`,
  `wallet.js:433-446`, `wallet.js:464-487`.

### F-REELSLOT-28  Gewinn gutschreiben
- **Was:** Nach einem Treffer wird der Gewinn dem Gerätekredit gutgeschrieben — sofern
  ihn niemand übernimmt.
- **Wie ausgelöst:** Nach `rs:result` fragt die Verrechnung mit dem **abbrechbaren**
  `rs:payout`, ob jemand den Gewinn übernehmen will. Sagt niemand etwas, wird sofort
  eingelöst.
- **Soll-Ergebnis:** Der Gerätekredit steigt um `Faktor × Einsatz`, die GUTHABEN-Röhren
  zählen sichtbar hoch, je Zählschritt erklingt ein Ton. Vor der Gutschrift wird
  abgewartet, dass der Einsatz wirklich bezahlt ist; scheiterte die Abbuchung, zeigt
  das Schild „RUNDE UNGÜLTIG" und es wird nichts gutgeschrieben. Ein Gewinn von 0
  bucht gar nichts und meldet nichts.
- **Vorbedingung:** `rs:result.detail.win > 0`; Abbuchung erfolgreich.
- **Beobachtbar an:** Ereignis `rs:payout` (abbrechbar, `{win, bet, claim}`) und
  danach `rs:collect` mit `{amount, credited, capped, machineCredit}`;
  `data-rs-machine-credit` steigt; `rs:count`-Ereignisse je sichtbarem Zählschritt;
  Klang Registrierkasse plus Münzkaskade.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:539-588`;
  `Resources/Public/JavaScript/payout.js:98-151`.

### F-REELSLOT-29  Gewinn größer als der Höchststand — Kappung
- **Was:** Passt ein Gewinn nicht vollständig in den Gerätekredit, wird gekappt und
  gesagt.
- **Wie ausgelöst:** Gutschrift, deren Betrag den Höchststand überschreitet.
- **Soll-Ergebnis:** Es wird so viel gutgeschrieben wie hineinpasst, das Meldungsschild
  zeigt **„KONTO VOLL"**. Dieselbe Meldung gilt auch, wenn die Risiko-Leiter
  gutschreibt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `rs:collect.detail.capped === true`; Text „KONTO VOLL".
- **Umgesetzt in:** `Resources/Public/JavaScript/payout.js:135-151`;
  `Resources/Public/JavaScript/wallet.js:607-622`.

### F-REELSLOT-30  Kassenfenster im Sockel
- **Was:** Ein beleuchtetes Fenster im Sockel zeigt den Gesamtbestand — die Kasse —,
  während die Nixie-Gruppe GUTHABEN darüber den Gerätekredit zeigt.
- **Wie ausgelöst:** automatisch bei jeder Änderung von Kasse oder Gerätekredit.
- **Soll-Ergebnis:** Der formatierte Kassenstand steht im Fenster. Beim bloßen Laden
  wird er sofort sichtbar gesetzt, aber **nicht** angesagt; jede spätere Änderung wird
  einem Hilfsmittel als ganzer Satz „Kasse: 250" angesagt, entprellt (700 ms; die
  erste Ansage ohne Wartezeit). Ausgeliefert wird das Fenster mit einem Strich „–".
- **Vorbedingung:** keine.
- **Beobachtbar an:** Textinhalt von `.rs-bank__value[data-rs-bank-display]`;
  `data-rs-bank` am `.rs-machine`; Textinhalt von
  `.rs-bank__announce[data-rs-bank-announce][role=status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/bank.js:279-357`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:233-239`.

### F-REELSLOT-31  Taste CASH OUT
- **Was:** Die Taste auf der Auswurfschale bucht den Gerätekredit vollständig in die
  Kasse zurück.
- **Wie ausgelöst:** `click` auf `.rs-cashout[data-rs-cashout]` — mit Zeiger **und**
  mit Tastatur (Eingabe- und Leertaste).
- **Soll-Ergebnis:** Der Gerätekredit geht auf 0, die Kasse steigt um denselben Betrag,
  das Kassenfenster und die GUTHABEN-Röhren ziehen nach. Passt nicht alles in die
  Kasse, bleibt der Rest im Gerät stehen und „KONTO VOLL" sagt es. War vorher
  „GUTHABEN ZU GERING" zu lesen, wird das Schild abgeräumt.
- **Vorbedingung:** Gerätekredit > 0. Bei 0 ist die Taste dunkel und trägt
  `aria-disabled="true"`; sie bleibt aber im Tastaturweg erreichbar und ist dann ein
  folgenloser Leerlauf.
- **Beobachtbar an:** `data-rs-cashout` am `.rs-machine` wechselt zwischen `on` und
  `off`; `data-rs-machine-credit` auf 0; `data-rs-total` **unverändert**; Ereignis
  `rs:cashout` mit `{moved, capped, machineCredit}`; Klang Klappe der Auswurfschale
  plus Münzen, aber **nur** wenn `moved > 0`.
- **Umgesetzt in:** `Resources/Public/JavaScript/bank.js:190-192`,
  `bank.js:234-258`, `bank.js:297-309`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:265-268`.

### F-REELSLOT-32  Seite verlassen — der Gerätekredit wandert zurück
- **Was:** Wer die Seite verlässt (oder neu lädt), bekommt sein Geld aus dem Gerät
  zurück in die Kasse; es kann nirgends Geld liegenbleiben.
- **Wie ausgelöst:** Ereignis `pagehide` am Fenster → `teardown()` → als letzte
  Verrechnung `Wallet.destroy()` → `machineCredit.close()`.
- **Soll-Ergebnis:** Der Gerätekredit wird vollständig in die Kasse gebucht und der
  Spiegel im Speicher gelöscht. Ein zu diesem Zeitpunkt noch offener Gewinn der
  Risiko-Leiter ist bereits gutgeschrieben, weil die Bedienfelder vor den
  Verrechnungen abgeräumt werden, und wandert mit zurück. Dieser Weg meldet
  ausdrücklich **kein** `rs:cashout` und bleibt baulich stumm.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Nach dem Neuladen steht `data-rs-machine-credit` auf `0` und
  `data-rs-mirror` ist leer; `data-rs-bank` trägt den zurückgebuchten Betrag.
- **Umgesetzt in:** `Resources/Public/JavaScript/reel-slot.js:94-119`;
  `Resources/Public/JavaScript/wallet.js:660-705`.

### F-REELSLOT-33  Absturz — vorgefundener Restbetrag wandert zurück
- **Was:** Ist beim Öffnen der Seite noch ein Restbetrag im Gerät vermerkt (etwa nach
  einem Absturz), wandert er sofort in die Kasse.
- **Wie ausgelöst:** `openMachineCredit('reel_slot')` beim Verdrahten des Automaten.
- **Soll-Ergebnis:** Der Restbetrag ist in der Kasse, der Spiegel gelöscht; der Automat
  beginnt in jedem Fall bei Gerätekredit 0.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-machine-credit` = `0` unmittelbar nach dem Laden;
  `data-rs-mirror` leer; Grund `claimed` in der Änderungsmeldung des Gerätekredits.
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:258-266`.

### F-REELSLOT-34  Wechsel an ein anderes Gerät mit stehen gebliebenem Kredit
- **Was:** Verlässt der Spieler die Seite mit Geld im Gerät und wechselt zu einem
  anderen Automaten, ist das Geld dort über die gemeinsame Kasse wieder verfügbar.
- **Wie ausgelöst:** Seitenwechsel (`pagehide`); dann Einwurf am anderen Gerät.
- **Soll-Ergebnis:** Der Gerätekredit dieses Automaten ist 0, der Betrag steht in der
  gemeinsamen Kasse und ist am neuen Gerät einwerfbar. Der Gerätekredit gilt je
  Schlüssel und Seite; er ist beim Betreten einer Automatenseite immer 0.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Kassenstand am neuen Gerät (`data-rs-bank` bzw. das Leuchtschild
  im Saal); Speicherschlüssel `casinoKunterbunt.credits` (Kasse) bzw.
  `casinoKunterbunt.machine.reel_slot` (Spiegel, im Ruhezustand leer).
- **Umgesetzt in:** `Resources/Public/JavaScript/wallet.js:187-195`,
  `wallet.js:660-680`; Werk in `casino_startpage` (`machine-credit.js`, `credit.js`).

### F-REELSLOT-35  Bilanz von außen ablesbar
- **Was:** Die Summe aus Kasse und Gerätekredit steht als eine einzige Zahl am Gehäuse
  und darf sich durch Einwurf und Auszahlung nie ändern.
- **Wie ausgelöst:** automatisch bei jeder Änderung einer der beiden Zahlen.
- **Soll-Ergebnis:** `data-rs-total` = Kasse + Gerätekredit. Einwurf und Auszahlung
  lassen den Wert unverändert; Einsatz und Gewinn verschieben ihn um genau den
  gesetzten bzw. gewonnenen Betrag.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-total`, `data-rs-bank`, `data-rs-machine-credit`,
  `data-rs-mirror` am `.rs-machine`. Je Attribut genau ein Schreiber: `data-rs-bank`,
  `data-rs-total`, `data-rs-cashout` gehören `bank.js`; `data-rs-machine-credit` und
  `data-rs-mirror` gehören `wallet.js`.
- **Umgesetzt in:** `Resources/Public/JavaScript/bank.js:311-314`;
  `Resources/Public/JavaScript/wallet.js:624-647`.

### F-REELSLOT-36  Zweites Gehäuse auf derselben Seite bleibt unbedienbar
- **Was:** Legt ein Redakteur zwei „Reel Slot"-Elemente auf dieselbe Seite, bleibt das
  zweite unbedienbar und sagt das sichtbar.
- **Wie ausgelöst:** automatisch beim Verdrahten.
- **Soll-Ergebnis:** Das zweite Gehäuse bekommt die Klasse `rs-machine--duplicate`, es
  wird nicht verdrahtet, und in der Browserkonsole steht eine Fehlermeldung. Grund:
  ein Gerätekredit gilt je Schlüssel und Seite genau einmal.
- **Vorbedingung:** zwei Inhaltselemente „Reel Slot" auf einer Seite.
- **Beobachtbar an:** Klasse `rs-machine--duplicate`; Konsolenzeile
  `[reel-slot] Ein zweites "Reel Slot"-Gehäuse …`.
- **Umgesetzt in:** `Resources/Public/JavaScript/reel-slot.js:190-203`.

### F-REELSLOT-37  Ohne sichere Zufallsquelle bleibt der Automat stehen
- **Was:** Fehlt dem Browser `crypto.getRandomValues`, wird gar nicht erst verdrahtet.
- **Wie ausgelöst:** automatisch beim Laden.
- **Soll-Ergebnis:** Kein Automat wird bedienbar; eine Fehlermeldung steht in der
  Browserkonsole. Es wird ausdrücklich **nicht** heimlich auf `Math.random()`
  ausgewichen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Konsolenzeile `[reel-slot] Keine sichere Zufallsquelle …`; das
  Gehäuse reagiert auf nichts.
- **Umgesetzt in:** `Resources/Public/JavaScript/reel-slot.js:176-184`;
  `Resources/Public/JavaScript/rng.js`.

---

## Die Risiko-Leiter (eigene Funktionsgruppe)

Drei Zustände: `off` (nichts los), `offer` (ein Gewinn liegt vor, RISK blinkt),
`ladder` (die Leiter läuft). Das **Bedienfeld** (`risk.js`) gehört dieser Extension,
das **Werk** (Blinken, Wertung, Verwaltung des offenen Gewinns) liegt seit
Ausbaustufe 2 als geteilter Baustein in `casino_startpage`
(`risk-ladder.js`, `risk-timing.js`). Die Zeiten und der Vervielfacher stehen
deshalb dort; sie sind hier mit aufgeführt, weil ohne sie kein Test zu bauen wäre.

### F-REELSLOT-38  Das Angebot — RISK blinkt
- **Was:** Nach jedem Gewinn wird gefragt, ob der Spieler ihn riskieren will: RISK
  blinkt, REWARD leuchtet.
- **Wie ausgelöst:** Das Bedienfeld hört das abbrechbare `rs:payout` der Verrechnung
  ab und übernimmt den Gewinnanspruch.
- **Soll-Ergebnis:** Die Taste RISK bekommt `rs-btn--blink`, REWARD bekommt
  `rs-btn--lit`, die beiden Risiko-Tasten bleiben dunkel, STUFE bleibt dunkel. Der
  Gewinnbetrag steht weiter in den GEWINN-Röhren (die gehören in diesem Moment noch
  dem Spielkern und werden vom Bedienfeld ausdrücklich nicht angefasst). Der Gewinn
  ist noch **nicht** gutgeschrieben.
- **Vorbedingung:** `rs:result.detail.win > 0`; der Auto-Modus darf das Angebot nicht
  abgebrochen haben (siehe F-REELSLOT-48).
- **Beobachtbar an:** `data-rs-risk-phase="offer"` am `.rs-machine`,
  `data-rs-risk-level="0"`, `data-rs-risk-win` = Gewinnbetrag; Klassen
  `rs-btn--blink` an `.rs-btn--risk` und `rs-btn--lit` an `.rs-btn--reward`;
  Ereignis `rs:risk` mit `{phase: 'offer', level: 0, win}` (abbrechbar).
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:301-330`,
  `risk.js:485-497`.

### F-REELSLOT-39  Einsteigen — Taste RISK
- **Was:** Die Taste RISK startet die Leiter auf Stufe 1.
- **Wie ausgelöst:** `pointerdown` auf `.rs-btn[data-rs-button="risk"]` (nicht erst
  beim Loslassen — bei einem Trefferfenster von zuletzt 40 ms wäre `click` zu spät).
- **Soll-Ergebnis:** RISK hört auf zu blinken, die beiden Risiko-Tasten leuchten
  (`rs-btn--lit`), STUFE zeigt `01`, GEWINN zeigt den offenen Betrag. Die beiden
  Lichtfelder über den Risiko-Tasten beginnen abwechselnd zu leuchten.
- **Vorbedingung:** Zustand `offer`. In `off` und `ladder` ist die Taste wirkungslos
  (die Kappe fährt trotzdem ein).
- **Beobachtbar an:** `data-rs-risk-phase="ladder"`, `data-rs-risk-level="1"`;
  Ereignis `rs:risk` mit `{phase: 'start', level: 1, win}`; Klasse `rs-btn--lit` an
  `risk-left`/`risk-right`; `--rs-digit` an den STUFE-Röhren.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:234-237`,
  `risk.js:265-292`, `risk.js:463-483`.

### F-REELSLOT-40  Das Blinken — Trefferfenster je Stufe
- **Was:** Links und rechts leuchten abwechselnd auf; getroffen hat, wer drückt,
  während die Seite leuchtet.
- **Wie ausgelöst:** läuft, solange der Zustand `ladder` ist.
- **Soll-Ergebnis:** Die **Periode je Seite ist auf jeder Stufe konstant 200 ms** —
  das ist die unverhandelbare Sicherheitsgrenze gegen Blinkanfälle. Schwerer wird die
  Leiter ausschließlich über das **Trefferfenster** (wie lange die Seite innerhalb
  ihrer 200 ms wirklich leuchtet). Die Kurve ist `flat`:
  `onMs = round(200 × 0,85^(Stufe + 4))`, nach unten begrenzt auf 40 ms.

  | Stufe | Periode je Seite | Trefferfenster |
  |---|---|---|
  | 1 | 200 ms | **89 ms** |
  | 2 | 200 ms | **75 ms** |
  | 3 | 200 ms | **64 ms** |
  | 4 | 200 ms | **54 ms** |
  | 5 | 200 ms | **46 ms** |
  | ab 6 | 200 ms | **40 ms** (Untergrenze) |

  Ein voller Umlauf (links + rechts) dauert damit immer 400 ms, also 2,5 Blitze je
  Taste und Sekunde.
- **Vorbedingung:** Zustand `ladder`.
- **Beobachtbar an:** `data-rs-risk-side` (die Periode, immer `200`),
  `data-rs-risk-on` (das Trefferfenster in ms), `data-rs-risk-lit`
  (`left` / `right` / leer) am `.rs-machine`; Klasse `rs-lamp--on` an
  `.rs-lamp[data-rs-lamp="risk-left"|"risk-right"]`; Ereignis `rs:risktick` mit
  `{level, lit, on}` bei jedem Wechsel; metallischer Pip (links 1175 Hz, rechts
  1397 Hz) jeweils bei `on === true`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:452-461`,
  `risk.js:377-404`, `risk.js:584-595`; Zeiten in
  `casino_startpage/Resources/Public/JavaScript/risk-timing.js:123-195`.

### F-REELSLOT-41  Treffen — der Gewinn verdoppelt sich
- **Was:** Wer die leuchtende Seite trifft, verdoppelt seinen offenen Gewinn und
  steigt eine Stufe höher.
- **Wie ausgelöst:** `pointerdown` auf `.rs-btn[data-rs-button="risk-left"]` bzw.
  `"risk-right"`, während dieselbe Seite leuchtet.
- **Soll-Ergebnis:** Der offene Gewinn wird **sofort und unbedingt verdoppelt**
  (`amount × 2`; ab dem halben Höchstwert wird auf den Höchstwert gesetzt), die Stufe
  steigt um 1, das Blinken beginnt auf der neuen Stufe von vorn — ohne Pause, ohne
  Zwischenanzeige. STUFE und GEWINN stehen neu. Im Servermodus bestätigt oder
  korrigiert der Server den Betrag anschließend; dieser Automat zieht darauf
  ausschließlich den **Gewinn** nach (Malgrund `sync`), nicht die Stufe, nicht die
  Tastenfreigabe, nicht das Ausschalten. Ein `sync`, der noch während des Angebots
  eintrifft, zieht nur den Messpunkt nach und lässt die GEWINN-Röhren unberührt.
- **Vorbedingung:** Zustand `ladder`; die gedrückte Seite muss die gerade gemalte
  leuchtende Seite sein. Gewertet wird das **gemalte Lichtfeld**, nicht die Uhr; es
  gibt keine Kulanzspanne.
- **Beobachtbar an:** Ereignis `rs:risk` mit `{phase: 'hit', level, win}` — `level`
  und `win` sind bereits die **neuen**; `data-rs-risk-level` und `data-rs-risk-win`
  am `.rs-machine`; Klang: Aufwärts-Zweiklang.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:238-239`, `risk.js:520-527`;
  `casino_startpage/Resources/Public/JavaScript/risk-ladder.js:478-495`.

### F-REELSLOT-42  Danebengreifen — der ganze Gewinn ist weg
- **Was:** Wer die dunkle Seite drückt, verliert den gesamten offenen Gewinn.
- **Wie ausgelöst:** `pointerdown` auf die Risiko-Taste der Seite, die gerade
  **nicht** leuchtet.
- **Soll-Ergebnis:** Der Anspruch wird verworfen, es wird nichts gutgeschrieben und
  nichts abgebucht — der Gerätekredit bleibt unverändert, denn der Einsatz war schon
  beim Hebelzug abgebucht. GEWINN geht auf 0, die Leiter fällt in den Grundzustand
  zurück, RISK und die Risiko-Tasten gehen aus, STUFE wird dunkel.
- **Vorbedingung:** Zustand `ladder`.
- **Beobachtbar an:** Ereignis `rs:risk` mit `{phase: 'miss', level, win: 0, lost}`,
  danach `{phase: 'end', …}`; `data-rs-risk-phase="off"`, `data-rs-risk-level="0"`,
  `data-rs-risk-win="0"`; `data-rs-machine-credit` **unverändert**; Klang: absackender
  Sägezahn.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:238-239`, `risk.js:528-538`;
  `casino_startpage/Resources/Public/JavaScript/risk-ladder.js:522-548`.

### F-REELSLOT-43  Aussteigen — Taste REWARD
- **Was:** REWARD nimmt den offenen Gewinn und schreibt ihn gut. Das wirkt im Angebot
  genauso wie mitten in der Leiter.
- **Wie ausgelöst:** `pointerdown` auf `.rs-btn[data-rs-button="reward"]`.
- **Soll-Ergebnis:** Der offene Betrag wird dem Gerätekredit gutgeschrieben, die
  GUTHABEN-Röhren zählen sichtbar hoch, die Leiter fällt in den Grundzustand. Es
  beginnt **kein** neuer Zug.
- **Vorbedingung:** Zustand `offer` oder `ladder`; im Grundzustand ist die Taste
  wirkungslos.
- **Beobachtbar an:** Ereignis `rs:risk` mit `{phase: 'collect', …}`, danach
  `{phase: 'end', …}`; danach `rs:collect`; `data-rs-machine-credit` steigt;
  `data-rs-risk-phase="off"`.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:235-236`;
  `casino_startpage/Resources/Public/JavaScript/risk-ladder.js:549+`.

### F-REELSLOT-44  Aussteigen von außen (`rs:riskcollect`)
- **Was:** Ein Ereignis von außen steigt aus und schreibt gut — der Weg, den der
  Auto-Modus benutzt.
- **Wie ausgelöst:** `rs:riskcollect` am `.rs-machine`.
- **Soll-Ergebnis:** Wie F-REELSLOT-43. Im Grundzustand wirkungslos.
- **Vorbedingung:** Zustand `offer` oder `ladder`.
- **Beobachtbar an:** wie F-REELSLOT-43.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:232`.

### F-REELSLOT-45  Hebel im Angebot — Gewinn mitnehmen und weiterspielen
- **Was:** Zieht der Spieler während des blinkenden RISK den Hebel, wird der Gewinn
  gutgeschrieben, RISK geht aus, und der nächste Zug beginnt.
- **Wie ausgelöst:** Hebelzug im Zustand `offer`. Das Bedienfeld hört `rs:round` in
  der **Erfassungsphase am Dokument** ab und läuft damit garantiert vor der
  Verrechnung.
- **Soll-Ergebnis:** Erst wird gutgeschrieben, dann prüft die Verrechnung den
  Gerätekredit — so kann jemand mit Stand 0 und 100 offenem Gewinn den Hebel ziehen.
  Die Runde kommt zustande. Ein stehen gebliebenes Überlaufblinken der GEWINN-Gruppe
  wird beim Rückgeben an den Spielkern abgeräumt.
- **Vorbedingung:** Zustand `offer`.
- **Beobachtbar an:** `rs:risk` mit `{phase: 'collect'}` **vor** `rs:state` mit
  `to: 'spinning'`; `data-rs-machine-credit` steigt und sinkt danach um den Einsatz;
  Klasse `rs-nixie-group--overflow` ist entfernt.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:333-367`.

### F-REELSLOT-46  Hebel in der laufenden Leiter — wirkungslos und still
- **Was:** Während die Leiter läuft, tut der Hebel nichts.
- **Wie ausgelöst:** Hebelzug im Zustand `ladder`.
- **Soll-Ergebnis:** `preventDefault()` **und** `stopPropagation()` — die Runde kommt
  nicht zustande, und die Verrechnung bekommt das Ereignis gar nicht erst zu sehen, es
  wird also auch kein Einsatz abgebucht. Der Hebel schnellt sauber zurück. Diese
  Absage bleibt absichtlich **still**: es blinkt und piept ohnehin schon zehnmal je
  Sekunde.
- **Vorbedingung:** Zustand `ladder`.
- **Beobachtbar an:** `data-rs-round` unverändert; kein `rs:state`;
  `data-rs-machine-credit` unverändert; kein Absage-Klang.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:344-352`.

### F-REELSLOT-47  Überlauf der Anzeigen STUFE und GEWINN
- **Was:** Läuft eine Röhrengruppe über, zeigt sie lauter Neunen und blinkt.
- **Wie ausgelöst:** STUFE > 99 (zwei Röhren) bzw. GEWINN > 99999 (fünf Röhren).
- **Soll-Ergebnis:** Alle Röhren der Gruppe zeigen 9 und die Gruppe blinkt. STUFE 0
  lässt beide Röhren dunkel (es gibt keine Stufe null).
- **Vorbedingung:** keine.
- **Beobachtbar an:** Klasse `rs-nixie-group--overflow` an der
  `.rs-nixie-group[data-rs-display="stufe"|"gewinn"]`; `--rs-digit: 9` an allen
  Röhren; `--rs-digit: -1` bei dunkler STUFE.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:539-576`.

### F-REELSLOT-48  Seite verlassen mit offener Leiter — es wird gutgeschrieben
- **Was:** Wer die Seite mit einem offenen Gewinn in der Leiter verlässt, verliert ihn
  nicht.
- **Wie ausgelöst:** `pagehide` → `RiskPanel.destroy()` → `RiskLadder.destroy()`.
- **Soll-Ergebnis:** Der offene Gewinn wird dem Gerätekredit gutgeschrieben; das
  Gehäuse steht danach im Grundzustand. Anschließend wandert der Gerätekredit über
  `close()` in die Kasse zurück (F-REELSLOT-32) — die Bedienfelder werden ausdrücklich
  **vor** den Verrechnungen abgeräumt, damit das in dieser Reihenfolge geschieht.
- **Vorbedingung:** offener Gewinn in `offer` oder `ladder`.
- **Beobachtbar an:** nach dem Neuladen steht der Betrag in `data-rs-bank`;
  `data-rs-risk-phase` ist nicht mehr gesetzt.
- **Umgesetzt in:** `Resources/Public/JavaScript/risk.js:617-640`;
  `Resources/Public/JavaScript/reel-slot.js:94-119`.

---

## Der Auto-Modus

### F-REELSLOT-49  Taste AUTO MODE — ein- und ausschalten
- **Was:** Die Taste schaltet den Auto-Modus um. Ist er an, spielt der Automat von
  selbst weiter.
- **Wie ausgelöst:** `pointerdown` auf `.rs-btn[data-rs-button="auto"]`.
- **Soll-Ergebnis:** Beim Einschalten leuchtet die Taste (`rs-btn--lit`); zusätzlich
  wird sofort `rs:riskcollect` gesendet — ein gerade offenes Risiko-Angebot oder eine
  laufende Leiter wird also mitgenommen und gutgeschrieben, die Leiter entfällt. Beim
  Ausschalten geht das Licht aus und die laufende Pause wird gelöscht.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-auto` am `.rs-machine` (`on` / `off`); Klasse
  `rs-btn--lit` an `.rs-btn--auto`; Ereignis `rs:auto` mit
  `{on, reason: 'user', rounds}`; Klang: Relaisklack, an höher als aus.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js:315-368`.

### F-REELSLOT-50  Selbsttätiger nächster Zug
- **Was:** Ist der Auto-Modus an, wartet der Automat nach jeder Auswertung rund eine
  Sekunde und zieht dann selbst.
- **Wie ausgelöst:** Zuhörer auf `rs:result` spannt einen Zeitgeber von **1000 ms**
  (gemessen ab der Auswertung, nicht ab dem Stillstand der letzten Walze). Nach Ablauf
  wird `rs:spin` gesendet.
- **Soll-Ergebnis:** Eine neue Runde läuft über genau denselben Weg wie ein Hebelzug —
  es wird gewürfelt, `rs:round` gefeuert, der Einsatz abgebucht. Es läuft immer
  höchstens ein Zeitgeber. Hat der Mensch in der Pause selbst gezogen, wird nicht
  eingegriffen und nicht abgeschaltet; der nächste `rs:result` spannt neu.
- **Vorbedingung:** Auto-Modus an; der Rundenzustand muss `idle` oder `result` sein.
  Wird mitten in einem laufenden Zug eingeschaltet, wirkt das erst ab dem nächsten Zug.
- **Beobachtbar an:** `data-rs-auto-pending` (`0` / `1`) und `data-rs-auto-rounds`
  (Zähler der selbst ausgelösten Runden) am `.rs-machine`; Ereignis `rs:spin`.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js:295-305`,
  `auto.js:370-458`.

### F-REELSLOT-51  Keine Risiko-Leiter im Auto-Modus
- **Was:** Solange der Auto-Modus an ist, wird das Risiko-Angebot nicht gemacht; jeder
  Gewinn wird sofort gutgeschrieben.
- **Wie ausgelöst:** Zuhörer auf `rs:risk`; nur die Phase `offer` wird abgebrochen.
- **Soll-Ergebnis:** RISK blinkt nicht, `rs:payout` bleibt unangetastet und die
  Verrechnung zahlt sofort aus.
- **Vorbedingung:** Auto-Modus an.
- **Beobachtbar an:** `data-rs-risk-phase` bleibt `off`; keine Klasse `rs-btn--blink`;
  `rs:collect` folgt unmittelbar auf `rs:result`.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js:465-486`.

### F-REELSLOT-52  Selbstabschaltung bei zu geringem Gerätekredit
- **Was:** Reicht der Gerätekredit für den nächsten Zug nicht mehr, schaltet sich der
  Auto-Modus von selbst ab. Er wirft nie selbst nach und schaltet sich nie von selbst
  wieder ein.
- **Wie ausgelöst:** Nach dem Senden von `rs:spin` wird der Rundenzustand geprüft; ist
  er nicht `spinning`, hat jemand `rs:round` abgebrochen — im Regelfall die Verrechnung.
- **Soll-Ergebnis:** Der Auto-Modus geht aus, das Licht der Taste erlischt, kein neuer
  Zeitgeber wird gespannt. Das Meldungsschild zeigt (von der Verrechnung)
  „GUTHABEN ZU GERING".
- **Vorbedingung:** Auto-Modus an.
- **Beobachtbar an:** `data-rs-auto="off"`; Ereignis `rs:auto` mit
  `{on: false, reason: 'insufficient', rounds}`; Klang: Relaisklack (aus).
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js:425-438`, `auto.js:355-368`.

### F-REELSLOT-53  Seite verlassen bei laufendem Auto-Modus
- **Was:** Beim Verlassen der Seite wird die laufende Pause gelöscht und die Taste
  dunkel.
- **Wie ausgelöst:** `pagehide` → `AutoPlay.destroy()`.
- **Soll-Ergebnis:** Kein Zeitgeber überlebt das Verlassen. Es wird ausdrücklich
  **kein** `rs:auto` mehr gemeldet.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-auto`, `data-rs-auto-rounds` und
  `data-rs-auto-pending` sind vom `.rs-machine` entfernt.
- **Umgesetzt in:** `Resources/Public/JavaScript/auto.js:503-534`.

---

## Der Klang

Alle Klänge entstehen im Browser aus Frequenzen — keine Audiodatei, kein Netzzugriff.
Die Erzeugung liegt im Site Package; **welcher** Klang zu **welchem** Ereignis gehört,
steht ausschließlich in `sound.js` dieser Extension. Diese Datei hört nur zu: sie
ändert keinen Zustand, bricht kein Ereignis ab.

### F-REELSLOT-54  Ton-Schalter am Sockel
- **Was:** Ein Kippschalter in der Sockelreihe schaltet den Ton der ganzen Seite an
  und aus. Der Ton ist standardmäßig **an**.
- **Wie ausgelöst:** Druck auf `.rs-sound[data-rs-sound]`.
- **Soll-Ergebnis:** Beim Einschalten bestätigt ein Relaisklack samt Pip (300 Hz,
  dann 1319 Hz), dass der Ton läuft. Beim Ausschalten klingt ausdrücklich **nichts**.
  Die Einstellung überlebt das Neuladen und gleicht sich über mehrere Registerkarten
  ab; der Automat fasst den Browserspeicher dafür selbst nicht an. Auch die
  Leerlaufgeräusche werden mitgenommen.
- **Vorbedingung:** keine. Ohne JavaScript zeigt der Schalter durch die im Markup
  mitgelieferte Klasse `rs-sound--on` trotzdem den richtigen Zustand.
- **Beobachtbar an:** `data-rs-sound-state` am `.rs-machine` (`on` / `off`); Klasse
  `rs-sound--on` am Schalter.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:860-884`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:142-147`.

### F-REELSLOT-55  Klänge des Rundenablaufs
- **Was:** Jeder Schritt einer Runde hat seinen eigenen Klang.
- **Wie ausgelöst:** Zuhörer auf den Ereignissen des Gehäuses.
- **Soll-Ergebnis:**
  - `rs:state` → `spinning`: Klack der Klinke plus anlaufendes Werk.
  - Zeitgeber alle **85 ms** während `spinning`/`stopping`: Klappern des Walzenlaufs
    (rund 12 Rasten je Sekunde, Grundton 124 → 92 Hz).
  - `rs:state` → `evaluating`: das Klappern endet.
  - `rs:reelrest`: Walzenstopp, je Walze eine Stufe tiefer.
  - `rs:result`: Gewinn-Jingle in **vier Stufen nach dem Faktor** (nicht nach dem
    Betrag): Faktor 1 und 3 → *klein* (530 ms), 5 bis 14 → *mittel* (420 ms),
    20 und 50 → *groß* (790 ms), 100 → *Jackpot* (1530 ms).
  - `rs:collect`: Registrierkasse und Münzkaskade, gestaffelt nach der gutgeschriebenen
    Summe; bei 0 bleibt es still.
  - `rs:count`: ein Schritt einer pentatonischen Zählleiter über dem Grundton 784 Hz —
    **nur** für die Anzeige GUTHABEN und **nur** aufwärts.
- **Vorbedingung:** Ton an; ein `AudioContext` besteht (siehe F-REELSLOT-58).
- **Beobachtbar an:** `data-rs-sound-played` (Zahl der gestarteten Stimmen),
  `data-rs-sound-keys` (JSON, je Klangkennung ein Zähler) am `.rs-machine`.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:175-240`, `sound.js:500-560`.

### F-REELSLOT-56  Klänge von Geld, Risiko und Auto
- **Was:** Auch Einwurf, Auszahlung, Absagen, Risiko-Leiter und Auto-Modus klingen.
- **Wie ausgelöst:** Zuhörer auf den entsprechenden Ereignissen.
- **Soll-Ergebnis:**
  - `rs:coin` mit `reason: 'ok'`: Münzeinwurf.
  - `rs:coin` mit `reason ≠ 'ok'`: **Absage 1** — zwei dumpfe Anschläge, kein Metall.
  - `rs:cashout` mit `moved > 0`: Klappe der Auswurfschale, danach die Münzen. Bei
    `moved === 0` bleibt es still.
  - `rs:round` am Dokument mit `defaultPrevented`: **Absage 2** — ein einzelner tiefer
    Anschlag (320 → 80 Hz Sägezahn).
  - `rs:risk` `phase: 'hit'`: Aufwärts-Zweiklang (784 → 1175 Hz);
    `phase: 'miss'`: absackender Sägezahn.
  - `rs:risktick` mit `on === true`: metallischer Pip, links **1175 Hz**, rechts
    **1397 Hz**.
  - `rs:auto`: Relaisklack, an (240 Hz) höher als aus (180 Hz).
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** `data-rs-sound-keys` am `.rs-machine`. Beide hörbaren Absagen
  haben zusätzlich eine **sichtbare** Entsprechung am Meldungsschild; der Klang ist nie
  die einzige Auskunft. Die dritte Absage — der Hebelzug in der laufenden
  Risiko-Leiter — bleibt absichtlich **stumm**.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:380-460`,
  `sound.js:790-856`.

### F-REELSLOT-57  Leerlaufgeräusche
- **Was:** Das Gehäuse brummt, klickt und tickt leise vor sich hin, wenn es nichts tut
  — eine eigene Geräuschquelle je Gehäuse.
- **Wie ausgelöst:** automatisch, sobald ein `AudioContext` besteht.
- **Soll-Ergebnis:** Die Geräusche schweigen vollständig, solange das Gerät arbeitet.
  Das kommt aus **zwei** Quellen: dem Rundenzustand (`spinning`, `stopping`,
  `evaluating`) **und** der laufenden Risiko-Leiter (`rs:risk` `start` bis `end`) —
  denn eine Leiter läuft im Zustand `result` weiter, in dem der Spielkern längst ruht.
  Wird das Fenster versteckt, verstummen sie ebenfalls.
- **Vorbedingung:** Ton an.
- **Beobachtbar an:** `data-rs-sound-sustained` am `.rs-machine` zählt die laufenden
  Dauerklänge; nach dem Abräumen des letzten Geräts muss dort **0** stehen.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:178-193`,
  `sound.js:940-975`.

### F-REELSLOT-58  Erster Ton erst nach einer echten Geste
- **Was:** Beim Laden der Seite entsteht kein `AudioContext`; er wird erst beim ersten
  echten Zeigerdruck auf dem Gehäuse angelegt.
- **Wie ausgelöst:** `pointerdown` auf dem Gehäuse, in der Erfassungsphase abgehört.
- **Soll-Ergebnis:** Der Kontext startet sofort im Zustand `running`, ohne Warnung in
  der Konsole. Ein nachgemachtes Ereignis (`isTrusted === false`) gilt ausdrücklich
  **nicht** als Geste.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-sound-context` am `.rs-machine` (leer bzw. `running`).
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:250-300`.

### F-REELSLOT-59  Messpunkte des Klangs
- **Was:** Der Klang der ganzen Seite ist von außen in Zahlen ablesbar.
- **Wie ausgelöst:** automatisch bei jeder Änderung.
- **Soll-Ergebnis:** Am `.rs-machine` stehen `data-rs-sound-state`, `-context`,
  `-played`, `-peak-voices`, `-dropped`, `-gap`, `-level`, `-keys`, `-sustained` und
  `-sustain-dropped`. `-level` ist der größte gemessene Ausschlag am Ausgang; 1,000
  wäre Übersteuern. Die Zahlen gelten für die **Seite**, nicht für das einzelne
  Gehäuse — alle Geräte teilen sich einen `AudioContext`.
- **Vorbedingung:** keine.
- **Beobachtbar an:** ebendiese `data-`Attribute.
- **Umgesetzt in:** `Resources/Public/JavaScript/sound.js:1022-1041`.

---

## Anzeigen und Meldungen

### F-REELSLOT-60  Die vier Nixie-Anzeigen
- **Was:** Vier beschriftete Röhrengruppen zeigen GUTHABEN (6 Röhren), EINSATZ (2),
  STUFE (2) und GEWINN (5).
- **Wie ausgelöst:** serverseitig gerendert; gesetzt von den jeweiligen Eigentümern —
  GUTHABEN und EINSATZ von der Verrechnung, STUFE vom Risiko-Bedienfeld, GEWINN
  wechselnd zwischen Spielkern und Risiko-Bedienfeld. Zwei Stellen pflegen nie
  dieselbe Anzeige.
- **Soll-Ergebnis:** Beim Seitenaufruf sind GUTHABEN und STUFE **dunkel** (eine
  gemalte Zahl wäre eine sichtbare Lüge bzw. es gibt keine Stufe null), EINSATZ zeigt
  `01` und GEWINN `00000`. Welche Ziffer brennt, entscheidet `--rs-digit` je Röhre;
  `-1` bedeutet: keine. Läuft eine Gruppe über, zeigt sie lauter Neunen und blinkt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `data-rs-display="guthaben|einsatz|stufe|gewinn"` an der
  `.rs-nixie-group`; Inline-Stil `--rs-digit` je `.rs-nixie`; Klasse
  `rs-nixie-group--overflow`.
- **Umgesetzt in:**
  `Resources/Private/Partials/Automat/ReelSlot/Machine/NixieGroup.html:42-55`,
  `Machine/NixieTube.html:24-35`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:93-102`.

### F-REELSLOT-61  Ansage der Anzeigen für Hilfsmittel
- **Was:** Neben jeder gezeichneten Röhrengruppe steht ein unsichtbarer Bereich, der
  Beschriftung und Wert in **einem** Satz trägt („Guthaben: 250").
- **Wie ausgelöst:** bei jeder Wertänderung durch die Gruppe selbst.
- **Soll-Ergebnis:** Die gezeichneten Röhren tragen `aria-hidden="true"` und sind für
  ein Hilfsmittel nicht da; angesagt wird der eine vollständige Satz. Die Ansage ist
  **entprellt** (700 ms; die allererste ohne Wartezeit), weil eine Zählfahrt den Wert
  dutzendfach in kurzer Folge ändert. Der Bereich wird **leer** ausgeliefert — ein
  Live-Bereich, den ein Skript anlegt und füllt, wird nicht angesagt. Beim bloßen
  Laden der Seite wird ausdrücklich **nichts** angesagt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `span.rs-nixie-group__announce[data-rs-announce][role=status]`
  mit `data-rs-text-display` (Satzmuster mit `{0}`); Textinhalt beim Laden leer.
- **Umgesetzt in:**
  `Resources/Private/Partials/Automat/ReelSlot/Machine/NixieGroup.html:52-54`;
  `Resources/Private/Language/locallang.xlf:51-62`;
  `Resources/Public/JavaScript/nixie.js`.

### F-REELSLOT-62  Das Meldungsschild
- **Was:** Über dem Walzenfenster erscheint bei Bedarf eine von fünf Meldungen.
- **Wie ausgelöst:** von der Verrechnung, dem Einwurf und der Auszahlung.
- **Soll-Ergebnis:** Fünf mögliche Texte, alle aus der Sprachdatei:
  **„GUTHABEN ZU GERING"** (Einsatz nicht gedeckt), **„BETRAG UNGÜLTIG"** (Einwurf
  unsinnig), **„KONTO VOLL"** (Gerätekredit am Höchststand), **„RUNDE UNGÜLTIG"**
  (Abbuchung gescheitert), **„KASSE ZU GERING"** (Kasse gibt den Einwurf nicht her).
  Das Schild ist `role="status"` und wird von einem Bildschirmleser selbst vorgelesen.
  Ausgeliefert wird es **leer**. Eine Meldung steht **2600 ms** und wird danach in
  400 ms ausgeblendet, sofern sie nicht vorher abgeräumt wird.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `p.rs-message[data-rs-message][role=status]`; Klasse
  `rs-message--shown`; die fünf Texte stehen als `data-rs-text-insufficient`,
  `-invalid`, `-capped`, `-void`, `-nocash` am Element.
- **Umgesetzt in:**
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Cabinet.html:67-72`;
  `Resources/Private/Language/locallang.xlf:98-112`;
  `Resources/Public/JavaScript/message.js`.

### F-REELSLOT-63  Sichtbares Zählwerk mit Ereignis je Schritt
- **Was:** Das GUTHABEN zählt sichtbar hoch, statt zu springen; jeder sichtbare
  Schritt wird gemeldet.
- **Wie ausgelöst:** jede Änderung des Gerätekredits außer dem Anfangsstand.
- **Soll-Ergebnis:** Die Röhren laufen von der alten zur neuen Zahl: **70 ms je
  Schritt**, höchstens **12 Schritte** je Fahrt (größere Sprünge werden auf 12
  Schritte verteilt); je sichtbarem Schritt erklingt ein Ton. Ein **Setzen** (`snap()`, wie beim EINSATZ) löst
  ausdrücklich **kein** Ereignis aus — das ist ein Setzen, kein Zählen. Der Einsatz
  springt deshalb, weil er eine Schalterstellung ist und eine Fahrt von 1 auf 10
  unterwegs Einsätze zeigte, die es nicht gibt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Ereignis `rs:count` mit
  `{display, value, index, steps, direction}`, ausgelöst am Element der Röhrengruppe.
- **Umgesetzt in:** `Resources/Public/JavaScript/counter.js`;
  `Resources/Public/JavaScript/wallet.js:464-474`, `wallet.js:405-410`.

### F-REELSLOT-64  Die gedruckte Gewinnkarte hinter Glas
- **Was:** Auf dem Gehäuse steht die Gewinntabelle als gedruckte Karte —
  „GEWINNPLAN · WERTE BEI EINSATZ 1".
- **Wie ausgelöst:** serverseitig gerendert, fester Bestandteil der Zeichnung.
- **Soll-Ergebnis:** Zwei Spalten: links Sieben×3 = 100, BAR×3 = 50, Glocke×3 = 20,
  Melone×3 = 14, Orange×3 = 10; rechts Zitrone×3 = 8, Kirsche×3 = 5,
  Kirsche×2 = 3, Kirsche×1 = 1.
- **Vorbedingung:** keine.
- **Beobachtbar an:** `g.rs-paytable` im Gehäuse-SVG mit den Zahlen als sichtbarem
  Text.
- **Umgesetzt in:**
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Shell.html:217-310`;
  `Resources/Private/Language/locallang.xlf:26-28`.

### F-REELSLOT-65  Namensschild und Beschriftungen
- **Was:** Kopfschild „REEL / SLOT", Tastenbeschriftungen und Anzeigen-Namen.
- **Wie ausgelöst:** serverseitig gerendert aus der Sprachdatei.
- **Soll-Ergebnis:** Sichtbar sind STOP, AUTO MODE, RISK, REWARD (englisch, wie auf
  echten Geräten), TON, CASH OUT, „Kasse" sowie die Anzeigen Guthaben, Einsatz, Stufe,
  Gewinn (deutsch, weil es Anzeigen sind) und die Münzknöpfe +10 / +50 / +100. Die
  beiden Risiko-Tasten tragen **keine** sichtbare Beschriftung, aber für ein
  Hilfsmittel die Namen „Risiko links" und „Risiko rechts" per `aria-label`. Die
  Tastenbeschriftungen liegen auf einem blickdichten Namensschild, damit sie den
  Kontrastwert erreichen (nachgemessen 9,22:1); die beiden unbeschrifteten
  Risiko-Tasten sind davon ausgenommen.
- **Vorbedingung:** keine.
- **Beobachtbar an:** sichtbarer Text; `aria-label` an
  `.rs-btn[data-rs-button="risk-left"|"risk-right"]`; `.rs-btn__label:not(:empty)`.
- **Umgesetzt in:** `Resources/Private/Language/locallang.xlf:13-152`;
  `Resources/Private/Partials/Automat/ReelSlot/Machine/Button.html:34-58`;
  `Resources/Public/Css/machine.css`.

---

## Der QR-Modus

Dieser Automat hat **keine eigene Funktion, die nur in einer bestimmten
Schalterstellung des QR-Modus existiert**. Er kennt den Schalter nicht: er ruft
ausschließlich die Kassen-Schnittstelle des Site Package auf (`credit.js`,
`machine-credit.js`); ob dahinter der Browserspeicher oder ein serverseitiges Konto
steht, entscheidet `account-backend.js` im Site Package. Eine Suche nach
QR-/Konto-bezogenem Code in dieser Extension liefert keinen Treffer.

Wirkung auf die oben beschriebenen Funktionen, laut README:

- Ist der QR-Modus an, laufen Kasse (F-REELSLOT-30/31) und Gerätekredit
  (F-REELSLOT-19 bis 35) über den Server statt über den Browserspeicher.
- Bei einem Treffer in der Risiko-Leiter (F-REELSLOT-41) bestätigt oder korrigiert
  der Server den verdoppelten Betrag nachträglich; dieser Automat zieht darauf über
  den Malgrund `sync` **nur** die GEWINN-Anzeige und den Messpunkt
  `data-rs-risk-win` nach.
- Wer mitten im Spiel die Verbindung verliert, bekommt die Sperranzeige des Site
  Package; solange sie steht, wird nichts gebucht.

---

## Beobachtungen, nicht bewertet

- `MachineProcessor::DEFAULT_POSITIONS` beschreibt die Startstellung 21 / 25 / 32 im
  Kommentar als „BAR · Glocke · Sieben" nach Anhang A; nach den heute in
  `Classes/Rules.php` stehenden Bändern (Anhang C) ergeben dieselben Zellindizes
  Zitrone · Melone · Kirsche.
- Die Gewinntabelle steht an zwei Stellen: als Regel in `paytable.js` und als
  gedruckte Karte im Gehäuse-SVG (`Shell.html`). Die README hält das ausdrücklich
  fest und verlangt, beide zusammen zu ändern.
- `wallet.js` und `machine.js` lesen den gewählten Einsatz mit vier wortgleichen,
  doppelt geführten Zeilen; beide Dateien kommentieren das als bewusste Entscheidung.
- Die Meldung „RUNDE UNGÜLTIG" (`machine.message.void`) erscheint nur, wenn die
  Abbuchung des Einsatzes scheitert; die README-Tabelle der Kassenvorgänge führt sie
  nicht auf, der Quelltext schon.
- Die README beschreibt die Taste REWARD in den Ereignistabellen nicht eigens, im
  Markup und in `risk.js` ist sie eine der sechs Tasten der Bedienleiste.
- Die drei Münztasten `+10` / `+50` / `+100` erreichen die Zielgröße 24 × 24 px erst
  ab 480 px Fensterbreite; die README legt das als bewusst nicht behobene Grenze offen
  (gemessen 18,7 × 19,0 px bei 360 px Fensterbreite).
- `ext_emconf.php` nennt Version 0.5.0; die README nennt denselben Stand.

---

<!-- ===================== blackjack ===================== -->

# Funktionsinventur — Extension `blackjack`

Der dritte Spieltisch des Casino Kunterbunt: ein Blackjack-Kartentisch mit Kartenschlitten,
festem Geberschema, Versicherung, Teilen und Doppeln — vollständig im Browser gerechnet,
einzeln spielbar oder gemeinsam in der QR-Lobby.

Quellen: Quelltext unter `typo3conf/ext/blackjack/`, die README derselben Extension,
die Fluid-Vorlagen, die XLIFF-Dateien und die TCA-Überschreibung. Zeilenangaben beziehen
sich auf den Stand zum Zeitpunkt dieser Inventur.

---

## Rückseite: Anmeldung, Inhaltselement, Backend-Pflege

### F-BJ-1  Inhaltselement „Blackjack" anlegen
- **Was:** Ein Redakteur stellt mit einem Inhaltselement den kompletten Spieltisch auf eine Seite.
- **Wie ausgelöst:** Backend → Seite → „Neues Inhaltselement" → Gruppe der Casino-Elemente → „Blackjack" → speichern.
- **Soll-Ergebnis:** Der `tt_content`-Datensatz bekommt `CType = blackjack`; im Frontend rendert die Seite den vollständigen Tisch (Tuch, Bedienleiste, Verlaufsstreifen). Das Element hat **keine einzige Einstellung** — es gibt kein Feld auszufüllen.
- **Vorbedingung:** Extension aktiviert; `casino_startpage` >= 0.5.0 installiert (liefert Design-Tokens, Registry, Kasse, geteilte Tisch-Bausteine).
- **Beobachtbar an:** Backend-Spalte `tt_content.CType` = `blackjack`; im Frontend das Wurzelelement `div.ck-table.bj-table` mit `data-ck-table-key="blackjack"`.
- **Umgesetzt in:** `Configuration/TCA/Overrides/tt_content.php:26-35`; Rendering `ext_localconf.php:64-80`; Vorlage `Resources/Private/ContentElements/Table.html:45-65`.

### F-BJ-2  Icon und Beschreibungstext im Auswahl-Assistenten
- **Was:** Das Element zeigt im Assistenten „Neues Inhaltselement" ein eigenes, selbst gezeichnetes Icon und einen erklärenden Satz.
- **Wie ausgelöst:** Öffnen des Assistenten „Neues Inhaltselement".
- **Soll-Ergebnis:** Eintrag „Blackjack" mit Icon `content-blackjack` und dem Hinweistext, dass das Element keine Einstellungen hat und zusätzlich ein „Casino-Automat"-Element auf der Startseite nötig ist.
- **Vorbedingung:** keine.
- **Beobachtbar an:** sichtbarer Text aus `locallang_be.xlf:tt_content.CType.blackjack.description`; SVG aus `Resources/Public/Icons/ContentBlackjack.svg`.
- **Umgesetzt in:** `Configuration/Icons.php:14-19`; `Resources/Private/Language/locallang_be.xlf:6-11`.

### F-BJ-3  Anmeldung als Gerät der Gattung „Tisch" im Spielsaal
- **Was:** Der Tisch meldet sich bei der Geräte-Registry des Site Packages an, damit er im Saal auf der Startseite als Kachel gewählt werden kann.
- **Wie ausgelöst:** automatisch beim Laden von `ext_localconf.php` (Extension aktiv). Der Redakteur wählt den Tisch anschließend im Inhaltselement „Casino-Automat" aus.
- **Soll-Ergebnis:** „Blackjack" steht in der Backend-Auswahlliste in der Gruppe *Tisch*; der Saal baut die Bühne ohne Podest, mit breitem Bodenschatten und quer liegender viewBox 160:100. Zusätzlich wird `Resources/Private/Partials/` an die `partialRootPaths` des Elements „Casino-Automat" angehängt.
- **Vorbedingung:** `casino_startpage` aktiv.
- **Beobachtbar an:** Auswahlliste im Backend-Element „Casino-Automat"; im Frontend die Saal-Kachel `span.ck-cabinet` mit `svg.ck-cabinet__drawing[viewBox="0 0 160 100"]`.
- **Umgesetzt in:** `ext_localconf.php:26-33`; Bezeichner `Classes/Blackjack.php:29-46`; Kachel `Resources/Private/Partials/Table/Blackjack/Cabinet.html:53-110`.

### F-BJ-4  Beschreibung und strukturierte Daten der Spielseite
- **Was:** Die Seite, auf der der Tisch steht, bekommt automatisch eine Beschreibung für Suchmaschinen und KI-Crawler sowie einen `Game`-Eintrag in strukturierten Daten.
- **Wie ausgelöst:** automatisch beim Rendern des Inhaltselements (dataProcessing-Schritt `20`, `casino-device-description`, `gattung = tisch`).
- **Soll-Ergebnis:** Im `<head>` der Spielseite stehen `<meta name="description">` mit dem Text aus `automat.description` und ein `<script type="application/ld+json">` mit `@type: Game`.
- **Vorbedingung:** Das Inhaltselement rendert tatsächlich auf dieser Seite.
- **Beobachtbar an:** ausgelieferter Quelltext der Seite: `meta[name=description]` und das JSON-LD-Skript.
- **Umgesetzt in:** `ext_localconf.php:71-76`; Texte `Resources/Private/Language/locallang.xlf:6-11`.

### F-BJ-5  Saal-Kachel als Anzeige (nicht bedienbar für sich)
- **Was:** Die Zeichnung des Blackjack-Tisches auf der Startseite ist reine Ansicht — sie trägt keinen Text und keinen eigenen Namen.
- **Wie ausgelöst:** Rendering des Inhaltselements „Casino-Automat" auf der Startseite mit Auswahl „Blackjack".
- **Soll-Ergebnis:** Eine SVG-Zeichnung des Tisches (Bande, Tuch in zwei Grüntönen, Geberbogen, Versicherungsbogen, Setzkreis, zwei angedeutete Karten, Kartenschlitten rechts, Ablage links); sie ist für Hilfsmittel unsichtbar, der Name kommt vom umgebenden Link des Saals.
- **Vorbedingung:** F-BJ-3.
- **Beobachtbar an:** `svg.ck-cabinet__drawing` mit `aria-hidden="true"`, `focusable="false"`, ohne `<title>` und ohne `<text>`.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Blackjack/Cabinet.html:53-111`.

---

## Spielerseite: der Tisch, das Setzen, der Rundenstart

### F-BJ-6  Buy-in am Tisch (Kasse → Tischbank)
- **Was:** Der Spieler bringt Geld aus der Casino-Kasse an den Tisch; daraus entsteht sein Chip-Rack.
- **Wie ausgelöst:** Bedienleiste des Site Packages (Wechselfeld / Einwerfen), verdrahtet über `openTableBank('blackjack')`.
- **Soll-Ergebnis:** Der Buy-in-Betrag steht als Chip-Rack bereit; `bank.amount` ist größer 0; alle Nachlege-Handlungen (Doppeln, Teilen, Versichern) sind bezahlbar.
- **Vorbedingung:** Guthaben in der Kasse; bei eingeschaltetem QR-Modus ein angemeldetes Konto (`account-backend.js` entscheidet, ob Browserspeicher oder Server dahintersteht).
- **Beobachtbar an:** `data-bj-total` am Wurzelelement (Kasse + Buy-in + liegender Einsatz); die Chip-Anzeigen der geteilten Bedienleiste.
- **Umgesetzt in:** `Resources/Public/JavaScript/blackjack.js:660` (`openTableBank(key)`), Kasse selbst im Site Package.

### F-BJ-7  Chip auf den Setzkreis legen
- **Was:** Der Spieler legt einen Chip auf das einzige Setzfeld des Tisches, den Setzkreis.
- **Wie ausgelöst:** Klick oder Eingabetaste auf `button[data-ck-field="box"]` im Tuch.
- **Soll-Ergebnis:** Der Chip liegt sichtbar auf dem Setzkreis, `bets.total` steigt um den Chipwert, der Buy-in sinkt entsprechend, ein Metallanschlag ist zu hören, und der Auslöser „Geben" wird freigegeben, sobald der Einsatz regelgerecht ist.
- **Vorbedingung:** Runde im Zustand `setzen` (Tuch nicht gesperrt), passender Chip im Rack, Höchsteinsatz 100 € je Runde noch nicht erreicht.
- **Beobachtbar an:** sichtbare Chips im Setzkreis; `aria-label` des Setzkreises nennt „… Euro gesetzt"; `[data-ck-table-go]` verliert `aria-disabled`; Ansage im geteilten `[data-ck-table-status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/blackjack.js:671-684` (`onPlace`); Feldliste `Resources/Public/JavaScript/bets-blackjack.js:41-49`; Markup `Resources/Private/Partials/Table/Blackjack/Felt.html:101-107`.

### F-BJ-8  Obersten Chip zurücknehmen
- **Was:** Der Spieler nimmt den zuletzt gelegten Chip wieder vom Setzkreis herunter.
- **Wie ausgelöst:** Umschalt-Klick oder Entf-Taste auf dem Setzkreis.
- **Soll-Ergebnis:** Der Chip wandert ins Rack zurück, `bets.total` sinkt, ein höherer und leiserer Metallanschlag ist zu hören; verlässt der Einsatz dabei die Regel (ungerade oder unter 2 €), sperrt „Geben" wieder.
- **Vorbedingung:** mindestens ein Chip liegt, Tuch nicht gesperrt.
- **Beobachtbar an:** Chipstapel im Setzkreis wird kleiner; `[data-ck-table-go][aria-disabled="true"]`, sobald der Einsatz unzulässig ist.
- **Umgesetzt in:** `Resources/Public/JavaScript/blackjack.js:685-695` (`onTakeBack`).

### F-BJ-9  Einsatzregel: gerade Zahl von 2 bis 100 Euro
- **Was:** Nur ein geradzahliger Einsatz zwischen 2 € und 100 € wird angenommen — damit jede Auszahlung ein ganzer Euro bleibt.
- **Wie ausgelöst:** Prüfung bei jedem Chip-Legen und beim Druck auf „Geben".
- **Soll-Ergebnis:** Bei zulässigem Einsatz ist „Geben" bedienbar; bei unzulässigem bleibt es gesperrt, und ein Druck darauf sagt „Der Einsatz muss eine gerade Zahl von 2 bis 100 Euro sein."
- **Vorbedingung:** keine.
- **Beobachtbar an:** Text im Live-Bereich `[data-bj-status]`; Hinweiszeile `[data-bj-hint]` nennt dieselben beiden Zahlen; `aria-disabled` am Auslöser.
- **Umgesetzt in:** `Resources/Public/JavaScript/rules-blackjack.js:190-196, 438-442` (`BET_MIN`/`BET_MAX`/`BET_STEP`, `isLegalStake`); Ansage `Resources/Public/JavaScript/blackjack.js:525-530`; Hinweis `blackjack.js:335-337`.

### F-BJ-10  Runde starten („Geben")
- **Was:** Der Tisch teilt aus: zwei Karten für den Spieler, eine offene und eine verdeckte für den Geber.
- **Wie ausgelöst:** Klick/Enter auf den Rundenauslöser `[data-ck-table-go]` mit der Aufschrift „Geben".
- **Soll-Ergebnis:** Der Einsatz ist gesperrt; vier Karten liegen (Reihenfolge Spieler, Geber offen, Spieler, Geber verdeckt); pro gegebener Karte ein Wischgeräusch; der Zustand wechselt auf `versicherung` (Geber zeigt Ass) oder `spieler`; der Fokus wandert selbsttätig auf den ersten erlaubten Knopf.
- **Vorbedingung:** legaler Einsatz liegt, Runde im Zustand `setzen`, Tisch nicht durch die Lobby gesperrt.
- **Beobachtbar an:** `data-bj-state` am Wurzelelement wechselt von `bereit`/`fertig` auf `versicherung` bzw. `spieler`; `[data-bj-dealer-cards]` und `[data-bj-hands]` füllen sich; Ansage im `[data-bj-status]`.
- **Umgesetzt in:** `Resources/Public/JavaScript/blackjack.js:518-533` (`onGo`); `round-table-blackjack.js:156-200` (`deal()`); `round-blackjack.js:212-248` (`begin()`).

### F-BJ-11  Mischen zwischen zwei Runden
- **Was:** Ist die Trennkarte erreicht oder der verdeckte Zähler des Hauses zu hoch, wird vor dem Austeilen neu gemischt.
- **Wie ausgelöst:** automatisch in `deal()`, ausschließlich **vor** dem Austeilen — nie mitten in einer Hand.
- **Soll-Ergebnis:** Ein frisch aufgebauter und gemischter Schlitten aus 6 Decks (312 Karten); im Verlaufsstreifen erscheint die Marke „Neu gemischt" (ohne Begründung); Blattrauschen und das Einsetzen des Schlittens sind zu hören.
- **Vorbedingung:** `shoe.needsShuffle` ist wahr — also entweder Trennkarte bei 234 gezogenen Karten (75 % Durchdringung) erreicht (`cut`) oder der wahre Zähler **über** +3 (`count`). Treffen beide zu, gilt `cut`.
- **Beobachtbar an:** Eintrag „Neu gemischt" im Verlaufsstreifen `[data-ck-table-history]`; Klang; intern `shoe.shuffleCount`.
- **Umgesetzt in:** `round-table-blackjack.js:165-171`; `shoe.js:150-163, 213-243`; Schwelle `rules-blackjack.js:172, 182, 426-428`.

### F-BJ-12  Leerer Schlitten mischt nicht heimlich nach
- **Was:** Geht dem Schlitten mitten in einer Hand die Karte aus, bricht der Tisch ab, statt still neu zu mischen.
- **Wie ausgelöst:** ein `draw()` jenseits der letzten Karte.
- **Soll-Ergebnis:** Ein Fehler wird geworfen; der Tisch spielt nicht weiter mit einem heimlich neu gemischten Schlitten.
- **Vorbedingung:** praktisch unerreichbar — die Trennkarte liegt bei 234 von 312 Karten, es bleiben 78 Karten Reserve.
- **Beobachtbar an:** Fehlermeldung in der Browserkonsole; nur mit dem Auge am stehengebliebenen Tisch.
- **Umgesetzt in:** `shoe.js:178-186`.

### F-BJ-13  Die eigenen Karten: verdeckt auf dem Tuch, offen in der Handtafel
- **Was:** Dasselbe Blatt wird zweimal gezeichnet — auf dem Tuch mit dem Rücken nach oben, in der Bedienleiste rechts unten aufgedeckt.
- **Wie ausgelöst:** jedes Neuzeichnen (`paint`) während einer laufenden Runde.
- **Soll-Ergebnis:** Auf dem Tuch stehen Kartenrücken, die die Identität der Karte nirgends im Quelltext tragen und für Hilfsmittel „verdeckte Karte" heißen; in der Handtafel stehen dieselben Karten offen, mit Rang als Text, Farbzeichen und dem gesprochenen Namen (z. B. „Herz Dame"), dazu Summe (mit Zusatz „weich"), Einsatz und — nach Rundenende — der Ausgang als Wort.
- **Vorbedingung:** eine laufende oder eben beendete Runde.
- **Beobachtbar an:** `[data-bj-hands] li[data-bj-hand="0"]` (verdeckt) gegenüber `[data-bj-panel] li[data-bj-hand="0"]` (offen); `data-bj-active="true"` am aktiven Blatt.
- **Umgesetzt in:** `view-blackjack.js:210-255`; Kartenzeichnung `cards-blackjack.js`; Vorlage `Resources/Private/Partials/Table/Blackjack/Actions.html:61-69`.

### F-BJ-14  Die verdeckte Karte des Gebers bleibt verdeckt
- **Was:** Die zweite Karte des Gebers ist nicht einsehbar, solange der Geber nicht aufdeckt — auch nicht im Seitenquelltext.
- **Wie ausgelöst:** jedes Neuzeichnen, solange der Zustand nicht `geber` oder `fertig` ist.
- **Soll-Ergebnis:** Auf dem Tuch liegt beim Geber eine offene und eine verdeckte Karte; die Geberanzeige nennt **nur** den Wert der offenen Karte („zeigt 10"). Erst beim Aufdecken steht dort die volle Summe („Geber 19").
- **Vorbedingung:** laufende Runde.
- **Beobachtbar an:** Text in `[data-bj-dealer-total]`; Markup in `[data-bj-dealer-cards]` enthält für die verdeckte Karte keinen Rang und keine Farbe.
- **Umgesetzt in:** `view-blackjack.js:185-205`.

### F-BJ-15  Verlaufsstreifen der Runden
- **Was:** Jede beendete Runde hinterlässt eine Marke im Verlaufsstreifen, ebenso jedes Neumischen.
- **Wie ausgelöst:** automatisch nach jeder Auswertung bzw. jedem Mischen.
- **Soll-Ergebnis:** Eintrag „Gewonnen" / „Verloren" / „Patt" mit der Gebersumme als Titel und einem Farbton (win/loss/neutral); zusätzlich „Neu gemischt" als Ereignismarke.
- **Vorbedingung:** eine abgeschlossene Runde.
- **Beobachtbar an:** Einträge in `[data-ck-table-history]`.
- **Umgesetzt in:** `blackjack.js:542-547` (Rundenmarke) und `:593-596` (Mischmarke).

### F-BJ-16  Sprunglink vom Tuch zur Bedienleiste
- **Was:** Ein nur bei Tastaturfokus sichtbarer Link springt vom Tuch zur Bedienleiste.
- **Wie ausgelöst:** Tabulatortaste; der Link ist erstes Kind des Tuchs.
- **Soll-Ergebnis:** Der Fokus springt auf `#bj-controls`; der Link ist sichtbar, solange er den Fokus hat.
- **Vorbedingung:** keine.
- **Beobachtbar an:** sichtbarer Text „Weiter zur Bedienleiste"; `a.ck-skiplink[href="#bj-controls"]`.
- **Umgesetzt in:** `Resources/Private/Partials/Table/Blackjack/Felt.html:52-54`; Ziel `Resources/Private/ContentElements/Table.html:57`.

### F-BJ-17  Fokusführung zwischen den Zuständen
- **Was:** Der Tastaturfokus wandert selbsttätig dorthin, wo als Nächstes entschieden wird.
- **Wie ausgelöst:** nach jedem Zustandswechsel (Austeilen, jede Handlung, jede Versicherungsentscheidung).
- **Soll-Ergebnis:** Im Zustand `versicherung` steht der Fokus auf „Versichern"; im Zustand `spieler` auf dem ersten gerade erlaubten Handlungsknopf; in jedem anderen Fall zurück auf „Geben".
- **Vorbedingung:** keine.
- **Beobachtbar an:** `document.activeElement`; nur mit dem Auge am sichtbaren Fokusrahmen.
- **Umgesetzt in:** `blackjack.js:498-514` (`fokusAufErsteHandlung`).

### F-BJ-18  Absage „Das geht gerade nicht"
- **Was:** Ein Druck auf einen gesperrten Knopf tut nichts, sagt das aber.
- **Wie ausgelöst:** Klick auf ein Bedienteil mit `aria-disabled="true"`.
- **Soll-Ergebnis:** keine Karte, kein Geld, keine Zustandsänderung — nur der Satz „Das geht gerade nicht." im Live-Bereich der Runde.
- **Vorbedingung:** der Knopf trägt `aria-disabled="true"` (echtes `disabled` gibt es an diesem Tisch nirgends, damit der Tastaturweg erhalten bleibt).
- **Beobachtbar an:** Text in `[data-bj-status]`; unverändertes `data-bj-state`.
- **Umgesetzt in:** `blackjack.js:620-623` und `:643-647`.

### F-BJ-19  Absage „Dafür reicht der Buy-in nicht"
- **Was:** Reicht das Geld am Tisch für Doppeln, Teilen oder Versichern nicht, wird die Handlung abgelehnt.
- **Wie ausgelöst:** Klick auf „Doppeln", „Teilen" oder „Versichern" bei zu kleinem Buy-in.
- **Soll-Ergebnis:** Bereits nachgelegte Chips werden vollständig zurückgenommen, **keine Karte verlässt den Schlitten**, und es erscheint „Dafür reicht der Buy-in nicht. Wechseln Sie am Tischrand nach."
- **Vorbedingung:** `bank.amount` kleiner als der nachzulegende Betrag.
- **Beobachtbar an:** Text in `[data-bj-status]`; unveränderte Kartenzahl in `[data-bj-panel]`; unveränderter `data-bj-total`.
- **Umgesetzt in:** `round-table-blackjack.js:257-262, 337-347`; Ansage `blackjack.js:626-628, 649-651`.

### F-BJ-20  Absage „Dieser Tisch ist geschlossen"
- **Was:** Wird die Tischbank geschlossen (Seite verlassen), während eine Hand läuft, wird das ausdrücklich angesagt statt als Verlust getarnt.
- **Wie ausgelöst:** `pagehide` während einer laufenden Hand; die Auszahlung findet eine geschlossene Bank vor.
- **Soll-Ergebnis:** „Geben" wird gesperrt, und es erscheint „Dieser Tisch ist geschlossen. Ihr Buy-in ist in der Kasse."
- **Vorbedingung:** laufende Hand zum Zeitpunkt des Schließens.
- **Beobachtbar an:** Text in `[data-bj-status]`; `[data-ck-table-go][aria-disabled="true"]`.
- **Umgesetzt in:** `blackjack.js:606-609` (`onAbort`); ausgelöst in `round-table-blackjack.js:317-321`.

### F-BJ-21  Absage „keine sichere Zufallsquelle"
- **Was:** Ohne sicheren Zufallsgeber des Browsers wird an diesem Tisch gar nicht gespielt.
- **Wie ausgelöst:** Prüfung beim Verdrahten des Tisches (`isAvailable()`).
- **Soll-Ergebnis:** Der Tisch bleibt unverdrahtet, „Geben" ist gesperrt, und es erscheint „An diesem Tisch wird nicht gespielt: der Browser liefert keine sichere Zufallsquelle."
- **Vorbedingung:** `crypto.getRandomValues()` fehlt.
- **Beobachtbar an:** Text in `[data-bj-status]`; `data-bj-state` bleibt auf `bereit`.
- **Umgesetzt in:** `blackjack.js:341-346`; `rng.js` (`isAvailable`, `drawUint32` wirft statt zurückzufallen).

### F-BJ-22  Zwei Blackjack-Elemente auf einer Seite
- **Was:** Liegt das Inhaltselement versehentlich zweimal auf derselben Seite, bleibt der zweite Tisch bewusst unbedienbar.
- **Wie ausgelöst:** zweiter Verdrahtungsversuch mit demselben Tisch-Schlüssel.
- **Soll-Ergebnis:** „Geben" des zweiten Tisches ist gesperrt, Ansage „Das geht gerade nicht.", Fehlermeldung in der Konsole.
- **Vorbedingung:** zwei Inhaltselemente `blackjack` auf einer Seite.
- **Beobachtbar an:** `aria-disabled` am zweiten `[data-ck-table-go]`; Konsolenmeldung `[blackjack] … Tisch-Schlüssel "blackjack" ist auf dieser Seite bereits vergeben`.
- **Umgesetzt in:** `blackjack.js:349-355`.

---

## Die Spielzüge — jeder mit seiner Erlaubnisbedingung

Alle vier Handlungsknöpfe stehen dauerhaft im Markup und werden nie echt `disabled`,
sondern nur mit `aria-disabled="true"` gesperrt (der Tastaturweg bleibt erhalten).
Die beiden Versicherungsknöpfe sind statt dessen `hidden`, solange keine Versicherung
angeboten wird. Welche Handlung erlaubt ist, entscheidet `legalActions()`; zusätzlich
prüft `act()` dieselben Bedingungen noch einmal strukturell, unabhängig davon, ob
vorher gefragt wurde.

### F-BJ-23  Karte (Hit)
- **Was:** Der Spieler nimmt eine weitere Karte auf das laufende Blatt.
- **Wie ausgelöst:** Knopf „Karte" (`[data-bj-act="hit"]`), Klick oder Enter/Leertaste.
- **Soll-Ergebnis:** Eine Karte kommt aufs Blatt (Wischgeräusch); Summe in der Handtafel steigt. Übersteigt sie 21, ist das Blatt sofort fertig (überkauft) und der Zug geht an das nächste Blatt bzw. an den Geber.
- **Vorbedingung:** Zustand `spieler`; es gibt ein noch nicht fertiges Blatt; das Blatt stammt **nicht** aus geteilten Assen; das Blatt ist **kein** natürlicher Blackjack (ungeteilt, genau zwei Karten, Summe 21 — dort ist nur „Stehen" erlaubt). Kein Geld nötig.
- **Beobachtbar an:** zusätzliche Karte in `[data-bj-panel] li` und `[data-bj-hands] li`; geänderter Summentext; bei Überkauf die Marke „Überkauft" (`span.bj-outcome--bust`); Ansage des neuen Zustands.
- **Umgesetzt in:** `round-blackjack.js:383-387, 450-463`; Knopf `Resources/Private/Partials/Table/Blackjack/Actions.html:43-46`.

### F-BJ-24  Stehen (Stand)
- **Was:** Das Blatt bleibt, wie es ist; der Spieler ist mit diesem Blatt fertig.
- **Wie ausgelöst:** Knopf „Stehen" (`[data-bj-act="stand"]`).
- **Soll-Ergebnis:** Das Blatt gilt als fertig. Sind alle Blätter fertig, deckt der Geber sofort auf und zieht nach Schema; danach folgen Auswertung und Auszahlung.
- **Vorbedingung:** Zustand `spieler` und ein noch nicht fertiges Blatt. Sonst keine — „Stehen" ist die einzige Handlung, die immer erlaubt ist, wenn überhaupt eine erlaubt ist (auch beim natürlichen Blackjack, wo sie die **einzige** ist).
- **Beobachtbar an:** `data-bj-state` wechselt auf `geber` und dann `fertig`; `data-bj-active` verschwindet vom Blatt; Ansage „Der Geber deckt auf und hat …".
- **Umgesetzt in:** `round-blackjack.js:465-469`; Knopf `Actions.html:47-50`.

### F-BJ-25  Doppeln (Double Down)
- **Was:** Der Einsatz dieses Blattes wird noch einmal nachgelegt, genau eine Karte kommt, danach steht das Blatt.
- **Wie ausgelöst:** Knopf „Doppeln" (`[data-bj-act="double"]`). Heißt bewusst **nicht** „Verdoppeln" — so heißt bereits der Knopf der geteilten Bedienleiste, der den Einsatz **vor** der Runde verdoppelt.
- **Soll-Ergebnis:** Der Einsatz dieses Blattes verdoppelt sich (der Chipstapel daneben wächst), genau eine Karte kommt, das Blatt ist sofort fertig. Der nachgelegte Betrag wird bei Bedarf durch Kleinwechseln aus dem Rack zusammengelegt (siehe F-BJ-31).
- **Vorbedingung:** Zustand `spieler`; das Blatt besteht aus **genau zwei** Karten; das Blatt stammt nicht aus geteilten Assen; kein natürlicher Blackjack; verfügbarer Buy-in ≥ Einsatz dieses Blattes. Nach einer Teilung ist Doppeln ausdrücklich **erlaubt** (Hausregel „Verdoppeln nach Teilen: erlaubt"). Der Höchsteinsatz von 100 € gilt nur für den Grundeinsatz; das Nachlegen darf darüber hinausgehen.
- **Beobachtbar an:** `[data-bj-panel] li` nennt den verdoppelten „Einsatz … Euro"; zusätzlicher Chipstapel in `[data-bj-hands] li`; das Blatt verliert `data-bj-active`.
- **Umgesetzt in:** `round-blackjack.js:471-490`; Geldweg `round-table-blackjack.js:253-275`; Knopf `Actions.html:51-54`.

### F-BJ-26  Teilen (Split)
- **Was:** Aus einem Paar werden zwei Blätter; das zweite bekommt denselben Einsatz.
- **Wie ausgelöst:** Knopf „Teilen" (`[data-bj-act="split"]`).
- **Soll-Ergebnis:** Aus einem Blatt werden zwei, jedes bekommt sofort eine weitere Karte (so bestehen beide unmittelbar aus zwei Karten und könnten sofort gedoppelt werden). In der Handtafel erscheinen „Blatt 1", „Blatt 2" usw.
- **Vorbedingung:** Zustand `spieler`; genau zwei Karten; die beiden Karten sind ein Paar **nach Wert** (Zehn, Bube, Dame, König gelten deshalb untereinander als Paar, ebenso Ass + Ass); bisher weniger als **3** Teilungen; bisher weniger als **4** Blätter; verfügbarer Buy-in ≥ Einsatz dieses Blattes; das Blatt stammt nicht aus geteilten Assen.
- **Beobachtbar an:** Zahl der `li[data-bj-hand]` in `[data-bj-panel]` und `[data-bj-hands]` steigt; die Kennung „Blatt {n}" erscheint; Ansage nach dem Satzbau „Blatt {0} von {1} …".
- **Umgesetzt in:** `round-blackjack.js:492-517`; Paarregel `rules-blackjack.js:374-376`; Grenzen `rules-blackjack.js:230-231`.

### F-BJ-27  Geteilte Asse: genau eine Karte, kein Weiterspielen
- **Was:** Werden zwei Asse geteilt, bekommt jedes Ass genau eine Karte — und mehr geschieht mit diesen Blättern nicht.
- **Wie ausgelöst:** Teilen eines Ass-Paares (F-BJ-26).
- **Soll-Ergebnis:** Beide Blätter sind sofort fertig: kein weiteres „Karte", kein Doppeln, kein erneutes Teilen. Ein Ass mit einer Zehnerkarte zählt danach 21, ist aber **kein** Blackjack und zahlt wie jede gewonnene Hand 1:1.
- **Vorbedingung:** das geteilte Paar waren zwei Asse.
- **Beobachtbar an:** beide Blätter tragen sofort kein `data-bj-active`; alle vier Handlungsknöpfe `aria-disabled="true"`; nach Rundenende zeigt die Marke „Gewonnen"/„Verloren", nie „Blackjack".
- **Umgesetzt in:** `round-blackjack.js:251-261` (`_neueHand`, `done: fromSplitAce`), `:370-376, 451-453, 475-477, 496-498`; Hausregeln `rules-blackjack.js:234-238`.

### F-BJ-28  Versicherung annehmen
- **Was:** Der Spieler versichert sich gegen einen Blackjack des Gebers — für den halben Grundeinsatz.
- **Wie ausgelöst:** Knopf „Versichern" (`[data-bj-insure="take"]`). Die Höhe wird **nicht** gewählt: es ist immer genau der halbe Grundeinsatz.
- **Soll-Ergebnis:** Der Versicherungsbetrag wird aus dem Rack nachgelegt und liegt sichtbar auf dem Versicherungsbogen. Hat der Geber Blackjack, zahlt die Versicherung 2:1 (der Einsatz kommt zurück, plus das Doppelte — insgesamt das Dreifache); hat er keinen, ist der Betrag verloren. Die Versicherung wird **sofort** nach der Entscheidung ausgewertet, nicht erst am Rundenende.
- **Vorbedingung:** Zustand `versicherung` — also: die offene Karte des Gebers ist ein **Ass**. Buy-in reicht für den halben Grundeinsatz. Weil Mindesteinsatz und Schrittweite geradzahlig sind, ist der halbe Einsatz stets ein ganzer Euro.
- **Beobachtbar an:** Chipstapel in `[data-bj-insurance-stack]`; `aria-label` des Knopfes nennt den Betrag („Versichern für {n} Euro …"); die Gruppe `[data-bj-insure-group]` verliert `hidden` nur in diesem Zustand.
- **Umgesetzt in:** `round-blackjack.js:277-291` (`takeInsurance`); Geld `round-table-blackjack.js:208-227`; Auszahlung `rules-blackjack.js:499-502`.

### F-BJ-29  Versicherung ablehnen
- **Was:** Der Spieler spielt ohne Versicherung weiter.
- **Wie ausgelöst:** Knopf „Ohne Versicherung" (`[data-bj-insure="decline"]`).
- **Soll-Ergebnis:** Kein Geld wird nachgelegt; der Geber prüft sofort auf Blackjack und die Runde geht in den Zustand `spieler` über (oder endet sofort, wenn der Geber Blackjack hat).
- **Vorbedingung:** Zustand `versicherung`.
- **Beobachtbar an:** `[data-bj-insure-group][hidden]` kehrt zurück; `data-bj-state` wechselt auf `spieler` oder `fertig`; `[data-bj-insurance-stack]` bleibt leer.
- **Umgesetzt in:** `round-blackjack.js:294-304`; `round-table-blackjack.js:229-242`.

### F-BJ-30  Aufgeben (Surrender) — gibt es nicht
- **Was:** Der Tisch kennt kein Aufgeben.
- **Wie ausgelöst:** gar nicht — es gibt keinen Knopf dafür.
- **Soll-Ergebnis:** `legalActions()` gibt `surrender` niemals zurück; ein programmatischer Aufruf wird **immer** abgewiesen (`reason: 'unsupported'`), unabhängig vom Zustand, statt stillschweigend ignoriert zu werden.
- **Vorbedingung:** entfällt.
- **Beobachtbar an:** kein `[data-bj-act="surrender"]` im Markup.
- **Umgesetzt in:** `round-blackjack.js:413-416`; Hausregel `rules-blackjack.js:246`.

### F-BJ-31  Nachlegen ohne passenden Chip
- **Was:** Doppeln, Teilen und Versichern brauchen einen **Betrag**, keinen Chip — der Tisch legt ihn selbst aus dem Rack zusammen.
- **Wie ausgelöst:** automatisch bei jeder dieser drei Handlungen.
- **Soll-Ergebnis:** Der Tisch legt abwechselnd den größten passenden Chip; passt keiner, wird der kleinste zu große kleingewechselt (der Wert des Racks ändert sich dabei nicht) und weitergelegt. Geht es unterwegs nicht auf, werden **alle** bereits gelegten Chips einzeln zurückgenommen und die Handlung abgelehnt, ohne dass eine Karte gezogen wurde (Alles-oder-nichts).
- **Vorbedingung:** `bank.amount` ≥ Betrag (diese Prüfung steht ganz vorn); kleinster Chipwert ist 1 €.
- **Beobachtbar an:** veränderte Chipstapel im Rack und neben dem Blatt; unveränderter Gesamtbetrag `data-bj-total` beim Nachlegen (Geld wandert nur vom Rack aufs Tuch).
- **Umgesetzt in:** `round-table-blackjack.js:337-401`.

---

## Das Regelwerk des Gebers

Alle Zahlen und Regeln dieses Abschnitts stehen ausschließlich in
`Resources/Public/JavaScript/rules-blackjack.js`; sie lassen sich mit
`Resources/Private/Scripts/dump-rules.mjs` aus genau dieser Quelle ausdrucken.

### F-BJ-32  Austeilreihenfolge und verdeckte Karte
- **Was:** Der Geber teilt in der Reihenfolge eines echten Tisches aus und behält eine Karte verdeckt.
- **Wie ausgelöst:** „Geben" (F-BJ-10).
- **Soll-Ergebnis:** Vier Karten in der Folge Spieler / Geber offen / Spieler / Geber verdeckt. Die verdeckte Karte ist die zweite des Gebers.
- **Vorbedingung:** legaler Einsatz.
- **Beobachtbar an:** zwei Karten in `[data-bj-dealer-cards]`, davon eine als Rücken; zwei Karten in `[data-bj-panel]`.
- **Umgesetzt in:** `round-blackjack.js:228-233`; Hausregel „Verdeckte Karte: ja" `rules-blackjack.js:214`.

### F-BJ-33  Sofortige Blackjack-Prüfung des Gebers (Peek)
- **Was:** Zeigt der Geber ein Ass oder eine Zehnerkarte, prüft er sofort, ob er selbst Blackjack hat.
- **Wie ausgelöst:** automatisch unmittelbar nach der Versicherungsentscheidung — beziehungsweise, ohne sichtbares Ass, unmittelbar nach dem Austeilen; in jedem Fall **vor** jeder Spielerhandlung.
- **Soll-Ergebnis:** Hat der Geber Blackjack, endet die Runde sofort: alle Blätter verlieren, ein Blackjack des Spielers ist ein **Patt** (Einsatz zurück), eine abgeschlossene Versicherung zahlt 2:1. Hat er keinen, geht es in den Zustand `spieler`.
- **Vorbedingung:** die offene Karte des Gebers ist ein Ass oder zählt 10 (Zehn, Bube, Dame, König).
- **Beobachtbar an:** `data-bj-state` springt ohne Zwischenschritt auf `fertig`; Ausgangsmarke am Blatt; Ansage des Rundenausgangs.
- **Umgesetzt in:** `round-blackjack.js:310-345`; Hausregel „peek" `rules-blackjack.js:216`.

### F-BJ-34  Das starre Zieh-Schema
- **Was:** Beim Aufdecken zieht der Geber nach einem festen Schema, von dem er nie abweicht.
- **Wie ausgelöst:** automatisch, sobald alle Blätter des Spielers fertig sind.
- **Soll-Ergebnis:** Der Geber zieht, solange seine Summe **16 oder weniger** beträgt, und steht ab **17** — unabhängig davon, ob die Summe hart oder weich ist. Insbesondere: **auf einer weichen 17 steht er** (S17); eine weiche Summe von 16 oder weniger wird gezogen; ab weich 18 wird gestanden.
- **Vorbedingung:** Zustand `geber`; nicht alle Blätter des Spielers überkauft (siehe F-BJ-35).
- **Beobachtbar an:** weitere Karten in `[data-bj-dealer-cards]`; Endsumme in `[data-bj-dealer-total]` („Geber {n}"); Ansage „Der Geber deckt auf und hat {n}."
- **Umgesetzt in:** `rules-blackjack.js:361-363` (`dealerMustDraw`); Schleife `round-blackjack.js:526-548`; Hausregel „standsOnSoft17" `rules-blackjack.js:212`.

### F-BJ-35  Der Geber zieht nicht, wenn alles überkauft ist
- **Was:** Sind alle Blätter des Spielers überkauft, deckt der Geber auf, zieht aber nicht mehr.
- **Wie ausgelöst:** automatisch beim Übergang in den Zustand `geber`.
- **Soll-Ergebnis:** Der Geber bekommt keine weitere Karte; die Runde wird ausgewertet (alle Blätter verloren). Das ist keine Abweichung vom Schema, sondern das Rundenende **vor** dem Schema.
- **Vorbedingung:** jedes Blatt des Spielers über 21.
- **Beobachtbar an:** `[data-bj-dealer-cards]` enthält weiterhin genau zwei Karten, beide offen; `dealer.playedOut` bleibt intern `false`.
- **Umgesetzt in:** `round-blackjack.js:526-548`.

### F-BJ-36  Weiche und harte Summe, Ass-Herabsetzung
- **Was:** Ein Ass zählt 11 oder 1 — je nachdem, ob 11 das Blatt über 21 treiben würde.
- **Wie ausgelöst:** bei jeder Summenberechnung von Spieler- und Geberblatt.
- **Soll-Ergebnis:** Jedes Ass wird zunächst als 11 gezählt; überschreitet die Summe 21 und ist noch ein als 11 gezähltes Ass vorhanden, wird eines auf 1 herabgesetzt. Ein Blatt mit einem als 11 gezählten Ass heißt **weich** und wird in der Handtafel mit dem Zusatz „weich" angezeigt.
- **Vorbedingung:** keine.
- **Beobachtbar an:** Summentext in `[data-bj-panel]`, z. B. „17, weich".
- **Umgesetzt in:** `rules-blackjack.js:310-325`; Anzeige `view-blackjack.js:117-119`; Texte `locallang.xlf:67-68`.

### F-BJ-37  Der verdeckte Zähler des Hauses
- **Was:** Der Tisch führt einen Hi-Lo-Zähler über alle den Schlitten verlassenden Karten — er steuert **ausschließlich** den Mischzeitpunkt.
- **Wie ausgelöst:** automatisch bei jeder gezogenen Karte, auch bei der verdeckten Karte des Gebers.
- **Soll-Ergebnis:** Karten mit Wert 2–6 zählen +1, 7–9 zählen 0, Zehner/Bildkarten/Asse zählen −1. Steigt der wahre Zähler (laufender Zähler geteilt durch die verbleibenden Decks) **über** +3, wird vor der nächsten Runde vorzeitig gemischt. Der Zähler ist **nie sichtbar** und beeinflusst **keine** Entscheidung des Gebers.
- **Vorbedingung:** keine.
- **Beobachtbar an:** nicht direkt sichtbar; mittelbar am Eintrag „Neu gemischt" im Verlaufsstreifen.
- **Umgesetzt in:** `rules-blackjack.js:387-396, 411-428`; Zustand `shoe.js:183-185, 199-243`.

---

## Die Auszahlungen

### F-BJ-38  Blackjack zahlt 3:2
- **Was:** Ein natürlicher Blackjack — genau die ersten zwei Karten mit Summe 21, **nicht** aus einer Teilung entstanden — zahlt anderthalbfach.
- **Wie ausgelöst:** Auswertung am Rundenende.
- **Soll-Ergebnis:** Zurück kommt der Einsatz plus die Hälfte davon zusätzlich (bei 10 € Einsatz: 25 € zurück). Weil der Einsatz geradzahlig ist, ist das stets ein ganzer Euro. Die Marke am Blatt lautet „Blackjack".
- **Vorbedingung:** ungeteiltes Blatt, genau zwei Karten, Summe 21, Geber hat keinen Blackjack. Ein natürlicher Blackjack schlägt jede Nicht-Blackjack-21 des Gebers, unabhängig von dessen Kartenzahl.
- **Beobachtbar an:** `span.bj-outcome--blackjack` mit dem Wort „Blackjack"; Gewinnbetrag in der Schlussansage; aufsteigende Tonfolge plus helle Münzkaskade.
- **Umgesetzt in:** `rules-blackjack.js:218, 463-466`; Auswertung `round-blackjack.js:550-583`.

### F-BJ-39  Gewonnene Hand zahlt 1:1
- **Was:** Eine gewöhnliche gewonnene Hand verdoppelt den Einsatz.
- **Wie ausgelöst:** Auswertung am Rundenende.
- **Soll-Ergebnis:** Zurück kommt der Einsatz plus derselbe Betrag noch einmal. Marke „Gewonnen"; Münzkaskade.
- **Vorbedingung:** Blatt nicht überkauft **und** (Geber überkauft **oder** eigene Summe größer als die des Gebers).
- **Beobachtbar an:** `span.bj-outcome--win`; Verlaufsmarke „Gewonnen"; Ansage „… Ausgezahlt {n} Euro bei {m} Euro Einsatz."
- **Umgesetzt in:** `rules-blackjack.js:219, 474-477`; `round-blackjack.js:566-568`.

### F-BJ-40  Patt: Einsatz zurück
- **Was:** Bei Gleichstand mit dem Geber bekommt der Spieler seinen Einsatz zurück.
- **Wie ausgelöst:** Auswertung am Rundenende.
- **Soll-Ergebnis:** Genau der Einsatz kommt zurück, kein Gewinn, kein Verlust. Marke „Patt"; ein einzelner gedämpfter Metallanschlag.
- **Vorbedingung:** eigene Summe gleich der Gebersumme, beide nicht überkauft. Sonderfall: Blackjack des Gebers gegen Blackjack des Spielers ist ebenfalls Patt.
- **Beobachtbar an:** `span.bj-outcome--push`; Ansage „Der Einsatz von {n} Euro kommt zurück."
- **Umgesetzt in:** `rules-blackjack.js:223, 484-486`; `round-blackjack.js:569-571`; Geber-Blackjack `round-blackjack.js:332-345`.

### F-BJ-41  Verlorene Hand und Überkauf
- **Was:** Eine verlorene oder überkaufte Hand gibt nichts zurück.
- **Wie ausgelöst:** Auswertung am Rundenende, bei Überkauf bereits beim Ziehen.
- **Soll-Ergebnis:** Rückgabe 0. Marke „Überkauft" bei eigener Summe über 21, sonst „Verloren"; ein Rutschen (bei Überkauf ein dunkles, absteigendes Rutschen).
- **Vorbedingung:** eigene Summe über 21, oder eigene Summe kleiner als die des Gebers, oder Blackjack des Gebers.
- **Beobachtbar an:** `span.bj-outcome--bust` bzw. `--loss`; Ansage „… {n} Euro Einsatz verloren."
- **Umgesetzt in:** `rules-blackjack.js:489-491`; `round-blackjack.js:558-575`.

### F-BJ-42  Versicherung zahlt 2:1
- **Was:** Trifft die Versicherung zu, kommt das Dreifache des versicherten Betrags zurück.
- **Wie ausgelöst:** sofort nach der Versicherungsentscheidung, sobald die Blackjack-Prüfung des Gebers gelaufen ist.
- **Soll-Ergebnis:** Bei Blackjack des Gebers: versicherter Betrag zurück plus das Doppelte davon. Sonst: 0. Der versicherte Betrag ist höchstens der halbe Grundeinsatz.
- **Vorbedingung:** F-BJ-28 wurde angenommen.
- **Beobachtbar an:** Gesamtsumme `data-bj-total`; Schlussansage nennt den ausgezahlten Betrag; `[data-bj-insurance-stack]` wird beim Abräumen geleert.
- **Umgesetzt in:** `rules-blackjack.js:222, 243-244, 453-456, 499-502`; `round-blackjack.js:322-330`.

### F-BJ-43  Auszahlung und Bilanz
- **Was:** Am Rundenende werden Einsätze eingezogen und Gewinne gutgeschrieben — zentgenau.
- **Wie ausgelöst:** automatisch, sobald die Runde `fertig` ist.
- **Soll-Ergebnis:** Die gewinnenden Stapel bleiben kurz stehen (1 Sekunde; bei eingeschalteter Bewegungsdrosselung sofort), dann werden die Chips vom Setzkreis genommen und die Bank bucht. Es gilt: Kasse + Buy-in + liegender Einsatz = vorher + Rundenergebnis. Der Rundenbericht wird genau einmal berechnet und eingefroren, damit ein zweites Auslesen nie eine andere Zahl liefert.
- **Vorbedingung:** Bank noch offen (sonst F-BJ-20).
- **Beobachtbar an:** `data-bj-total` am Wurzelelement; Buy-in-Anzeige der Bedienleiste; Schlussansage nennt „Buy-in jetzt {n} Euro".
- **Umgesetzt in:** `round-table-blackjack.js:308-329`; Bericht `round-blackjack.js:639-676`.

### F-BJ-44  Schlussansage der Runde
- **Was:** Nach jeder Runde sagt der Tisch in einem Satz, wie sie ausging.
- **Wie ausgelöst:** automatisch nach der Auszahlung.
- **Soll-Ergebnis:** Ein Satz nach dem Muster „Gewonnen. Der Geber hat 18. Ausgezahlt 20 Euro bei 10 Euro Einsatz. Buy-in jetzt 90 Euro." (entsprechend für Verlust und Patt), im eigenen Live-Bereich der Runde — als Auskunft (`role="status"`), nicht als Warnung.
- **Vorbedingung:** abgeschlossene Runde; in der Lobby zusätzlich: kein Geberdeckel mehr (F-BJ-56).
- **Beobachtbar an:** Textinhalt von `p.bj-status[data-bj-status][role="status"]`.
- **Umgesetzt in:** `blackjack.js:542-561` (`ansagen`); Satzbauten `locallang.xlf:90-98`.

---

## Klang

Alles entsteht aus Tonfrequenzen im Browser — keine Audiodatei, kein Netzzugriff,
keine Melodie, kein Sample. Grundsatz: ehrlich, nicht spannungssteigernd — jeder Klang
gehört zu etwas, das wirklich passiert.

### F-BJ-45  Ton-Schalter
- **Was:** Ein Schalter stellt den Ton dieses Tisches an und aus.
- **Wie ausgelöst:** Klick oder Enter/Leertaste auf `button[data-bj-sound]` mit der sichtbaren Aufschrift „Ton".
- **Soll-Ergebnis:** Der Ton schaltet um. Der Zustand steht nie allein in der Farbe: `aria-pressed` wechselt, `aria-label` wechselt zwischen „Ton ist an" und „Ton ist aus", und ein Ring wechselt sichtbar von durchgezogen auf gestrichelt.
- **Vorbedingung:** keine. Ausgeliefert wird er mit `aria-pressed="true"`.
- **Beobachtbar an:** `[data-bj-sound-on="true"|"false"]` und `aria-pressed` am Schalter selbst (nicht an der Tischwurzel).
- **Umgesetzt in:** `sound-blackjack.js:338-356`; Markup `Resources/Private/Partials/Table/Blackjack/SoundSwitch.html:26-32`.

### F-BJ-46  Autoplay-Sperre
- **Was:** Ton entsteht erst nach einer echten Nutzergeste.
- **Wie ausgelöst:** erstes `pointerdown` oder `keydown` auf dem Tisch, nur wenn es ein echtes Ereignis ist (`isTrusted`).
- **Soll-Ergebnis:** Der Klang wird freigeschaltet und der Leerlaufton beginnt; ein nachgemachtes Ereignis schaltet nichts frei.
- **Vorbedingung:** keine.
- **Beobachtbar an:** nur mit dem Ohr; kein Ton vor der ersten Geste.
- **Umgesetzt in:** `sound-blackjack.js:358-372`.

### F-BJ-47  Die zwölf Klanganlässe
- **Was:** Jeder Anlass hat genau einen zuständigen Klang und genau eine zuständige Funktion.
- **Wie ausgelöst:** durch das jeweilige Spielereignis.
- **Soll-Ergebnis:**
  | Anlass | Klang |
  |---|---|
  | Chip auf den Setzkreis gelegt | Metallanschlag, tief |
  | Chip zurückgenommen | Metallanschlag, höher und leiser |
  | Karte wird gegeben | kurzes Wischen über Filz, **eine Karte je gegebener Karte**, ~140 ms Abstand |
  | Karte des Gebers aufgedeckt | dasselbe Wischen, kürzer und heller (nur beim Wechsel in den Zustand `geber`) |
  | Neu gemischt | Blattrauschen, dann das Einsetzen des Schlittens |
  | Blatt überkauft | dunkles, absteigendes Rutschen |
  | Blackjack | drei aufsteigende Zählschritte, dann eine helle Münzkaskade |
  | Hand gewonnen | Münzkaskade |
  | Patt | einzelner gedämpfter Metallanschlag |
  | Hand verloren | Rutschen |
  | `CASH OUT` | Glocke, dann die aufgezogene Kassenschublade |
  | Leerlauf | leises Brummen, solange nichts zu entscheiden ist |
- **Vorbedingung:** Ton eingeschaltet und freigeschaltet.
- **Beobachtbar an:** nur mit dem Ohr; im Quelltext an den Klangschlüsseln `bj-chip-place`, `bj-chip-remove`, `bj-card-deal`, `bj-card-flip`, `bj-shuffle`, `bj-bust`, `bj-blackjack`, `bj-payout`, `bj-push`, `bj-loss`, `bj-cashout`.
- **Umgesetzt in:** `sound-blackjack.js:169-330`; ausgelöst aus `blackjack.js:417-424` (Karten, Aufdecken, Leerlauf), `:557-561` (Rundenausgang), `:595` (Mischen), `:674, 687` (Chips).

### F-BJ-48  Leerlaufton
- **Was:** Solange nichts zu entscheiden ist, brummt es leise; sobald Spieler oder Geber am Zug sind, verstummt es.
- **Wie ausgelöst:** automatisch bei jedem Neuzeichnen (`setBusy`).
- **Soll-Ergebnis:** Leerlauf in den Zuständen `bereit` und `fertig`; kein Leerlauf in `versicherung`, `spieler`, `geber`.
- **Vorbedingung:** Ton freigeschaltet.
- **Beobachtbar an:** nur mit dem Ohr; mittelbar an `data-bj-state`.
- **Umgesetzt in:** `blackjack.js:424`; `sound-blackjack.js:374-376`.

### F-BJ-49  Klang bei gedrosselter Bewegung
- **Was:** Wer „Bewegung reduzieren" eingestellt hat, hört eine ausgeteilte Hand als **einen** Klang statt als Kette.
- **Wie ausgelöst:** Systemeinstellung `prefers-reduced-motion: reduce`.
- **Soll-Ergebnis:** Statt vier einzelner Kartenklänge ein einziger, etwas vollerer Klang. Zusätzlich entfällt die Wartezeit, in der die gewinnenden Stapel stehen bleiben (Auszahlung sofort).
- **Vorbedingung:** Systemeinstellung gesetzt.
- **Beobachtbar an:** nur mit dem Ohr bzw. mit dem Auge am sofortigen Abräumen.
- **Umgesetzt in:** `sound-blackjack.js:201-224`; Wartezeit `blackjack.js:109, 738`.

---

## Der Lobby-Anschluss (QR-Modus, gemeinsame Runde)

Dieser Abschnitt beschreibt, was geschieht, wenn derselbe Tisch in einer QR-Lobby läuft,
also mehrere Menschen gleichzeitig an ihm sitzen. Bei ausgeschaltetem QR-Modus wird
`lobby-live.js` nie eingespeist; dann kommt keines der vier Ereignisse an, und der Tisch
verhält sich unverändert wie im Einzelspiel.

**Nur in der Lobby:** gemeinsame Kartenfolge aus einer Saat (F-BJ-50), das Zugprotokoll
(F-BJ-52), die Geberreserve am Schlittenende (F-BJ-53), die Reihenfolge der
Entscheidungen und die 20 Sekunden je Platz (F-BJ-54, F-BJ-55), der Geberdeckel
(F-BJ-56), die verdeckten Karten der anderen (F-BJ-57), die pro Platz gestellte
Versicherung (F-BJ-58), der dauerhaft gesperrte „Geben"-Knopf (F-BJ-59) und die
Ergebnismeldung an den Server (F-BJ-60).

**Nur im Einzelspiel:** der Schlitten, der über viele Runden hinweg lebt, bis die
Trennkarte kommt (F-BJ-11) — und damit jeder Sinn des Kartenzählens; das vorzeitige
Mischen wegen des Zählers; der Start einer Runde auf Knopfdruck (F-BJ-10); die sofortige
Schlussansage (F-BJ-44 ohne Verzögerung).

### F-BJ-50  Gemeinsame Kartenfolge aus einer Saat
- **Was:** Alle Plätze sehen dieselben Karten, weil jeder Browser aus derselben Saat des Servers denselben Schlitten mischt.
- **Wie ausgelöst:** Ereignis `casino:lobby-runde` mit `saat`, `runde`, `mein` (eigene Platznummer) und `plaetze`.
- **Soll-Ergebnis:** Der Zufallsgeber des Tisches wird für die Dauer der Runde durch einen aus der Saat abgeleiteten, wiederholbaren Geber ersetzt; der Schlitten wird frisch gemischt; die Austeilfolge ist in jedem Browser gleich (erste Runde: Platz 1, 2, …, Geber offen; zweite Runde: Platz 1, 2, …, Geber verdeckt).
- **Vorbedingung:** QR-Modus an, Lobby läuft, eigener Platz zugeteilt.
- **Beobachtbar an:** zwei echte Browser zeigen dieselben Karten (nachgewiesen durch `Resources/Private/Scripts/probe-lobby-blackjack.mjs`); im Einzelspiel bleibt der Geber `drawUint32`.
- **Umgesetzt in:** `blackjack.js:757-773` (`saatGeber`/`geberSetzen`/`folgeBauen`); `lobby-blackjack.js:147-176`; `round-lobby-blackjack.js:86-99`; Umrechnung `rng.js` (`saatZuZahl`, `createSeeded`).

### F-BJ-51  Frisch gemischter Schlitten je Lobby-Runde — Kartenzählen wirkungslos
- **Was:** In der Lobby beginnt **jede** Runde mit einem neu gemischten Schlitten.
- **Wie ausgelöst:** automatisch bei jedem `casino:lobby-runde`.
- **Soll-Ergebnis:** Der Schlitten wird vor dem Austeilen gemischt; ein Ersatzschlitten meldet dauerhaft „kein Mischbedarf", sodass mitten in der Runde nie gemischt wird. Kartenzählen bringt in der Lobby deshalb nichts.
- **Vorbedingung:** Lobby-Runde.
- **Beobachtbar an:** kein Eintrag „Neu gemischt" im Verlaufsstreifen während einer Lobby-Runde; intern `needsShuffle === false` am Ersatzschlitten.
- **Umgesetzt in:** `blackjack.js:167-196` (`ersatzSchlitten`), `:766`.

### F-BJ-52  Das Zugprotokoll
- **Was:** Der Server führt Buch über jede Entscheidung jedes Platzes; daraus rechnet jeder Browser die Kartenfolge nach.
- **Wie ausgelöst:** Ereignis `casino:lobby-stand` mit dem Feld `mv` (z. B. `"1h1s2n2s"`).
- **Soll-Ergebnis:** Für jeden **fremden** Zug werden die entsprechenden Karten aus dem gemeinsamen Schlitten gezogen (`h` und `d` je eine, `p` zwei, `s`/`i`/`n` keine). Die **eigenen** Züge werden übersprungen, weil die eigene Rundenlogik ihre Karten bereits gezogen hat — sonst liefen zwei Browser auseinander. Das Protokoll wird nur so weit angewendet, wie es noch nicht angewendet wurde.
- **Vorbedingung:** ausgeteilte Lobby-Runde.
- **Beobachtbar an:** Kartenzahlen der anderen Plätze (F-BJ-57); zwei Browser zeigen dasselbe Geberblatt.
- **Umgesetzt in:** `round-lobby-blackjack.js:56, 115-132`; eigene Meldung `lobby-blackjack.js:191-202`; ausgelöst aus `blackjack.js:632-638, 651-653`.

### F-BJ-53  Die Geberreserve am Schlittenende
- **Was:** Die Nachkarten des Gebers kommen aus einer zu Rundenbeginn abgeschnittenen Reserve am Ende des Schlittens, nicht aus der laufenden Folge.
- **Wie ausgelöst:** automatisch, sobald die eigene Rundenlogik in den Zustand `geber` wechselt.
- **Soll-Ergebnis:** Die ersten beiden Geberkarten stammen aus der regulären Austeilfolge; jede weitere aus den letzten 16 Karten des Schlittens (von hinten). Dadurch sieht jeder Browser dasselbe Geberblatt, egal wann er es ausrechnet — ein Platz, der zuerst steht, spielt seinen Geber sofort lokal aus und wartet auf niemanden.
- **Vorbedingung:** Lobby-Runde. Reicht die Reserve nicht (ein Geberblatt länger als elf Karten), wird ein Fehler geworfen.
- **Beobachtbar an:** gleiche Gebersumme in `[data-bj-dealer-total]` bei zwei Browsern; nachgewiesen in `verify-lobby-blackjack.mjs` (B-1 bis B-10).
- **Umgesetzt in:** `round-lobby-blackjack.js:90, 150-156`; Weichenstellung `blackjack.js:167-196` (liest `game.state` live bei jedem Kartenzug).

### F-BJ-54  Die Reihenfolge der Entscheidungen
- **Was:** In der Lobby ist immer genau ein Platz am Zug — der Reihe nach, vom Server bestimmt.
- **Wie ausgelöst:** Feld `t` (der gefragte Platz) in `casino:lobby-stand`.
- **Soll-Ergebnis:** Ist der eigene Platz nicht der gefragte, sind alle Handlungsknöpfe gesperrt, die Versicherungsfrage bleibt verborgen, kein Blatt ist als aktiv markiert und es gibt keine Ansage. Ist der eigene Platz gefragt, gilt wieder die gewöhnliche Erlaubnisprüfung.
- **Vorbedingung:** laufende Lobby-Runde.
- **Beobachtbar an:** alle `[data-bj-act]` mit `aria-disabled="true"`; `[data-bj-insure-group][hidden]`; kein `data-bj-active="true"`.
- **Umgesetzt in:** `lobby-blackjack.js:250-251`; Anzeige `blackjack.js:458-468`; `meinZug`-Rückruf `blackjack.js:818-821`.

### F-BJ-55  Die 20 Sekunden je Platz
- **Was:** Wer am Zug ist, hat eine begrenzte Zeit; danach schaltet der Server weiter.
- **Wie ausgelöst:** Zeitablauf auf dem Server (Notbremse); im Protokoll erscheint dann für diesen Platz der Buchstabe `s`.
- **Soll-Ergebnis:** Wurde der **eigene** Platz so übersprungen, zieht die eigene Rundenlogik nach: im Zustand `versicherung` wird die Versicherung abgelehnt, im Zustand `spieler` wird „Stehen" ausgeführt. Dabei wird keine Karte gezogen, die gemeinsame Folge verschiebt sich also nicht.
- **Vorbedingung:** Lobby-Runde; der eigene Platz war am Zug und hat nichts entschieden.
- **Beobachtbar an:** `data-bj-state` wechselt ohne eigenen Klick auf `geber`/`fertig`; die Restzeit steht im Feld `rest` des Standes.
- **Umgesetzt in:** `blackjack.js:780-797`; Protokollbuchstabe `round-lobby-blackjack.js:56`.

### F-BJ-56  Der Geberdeckel — das eigene Ergebnis bleibt verborgen, solange jemand aussteht
- **Was:** Das eigene Rundenergebnis wird erst gezeigt, wenn kein Platz mehr am Zug ist.
- **Wie ausgelöst:** Feld `t` größer 0 im Stand (jemand ist noch am Zug).
- **Soll-Ergebnis:** Ausgangsmarken, Gebersumme und Schlussansage bleiben zurückgehalten; die Anzeige tut so, als liefe der eigene Zug noch. Sobald der Server `t = 0` meldet, wird die zurückgehaltene Ansage samt Klang **nachgeholt**. Die **Auszahlung** wird dabei nie zurückgehalten — sie ist längst gebucht; nur die Ansage wartet.
- **Vorbedingung:** Lobby-Runde, eigenes Blatt bereits fertig.
- **Beobachtbar an:** `data-bj-state` bleibt auf `spieler`, obwohl das eigene Blatt fertig ist; keine `span.bj-outcome` an den Blättern; `data-bj-total` ist dagegen bereits fortgeschrieben.
- **Umgesetzt in:** `blackjack.js:458-473, 576-586, 822-829`; Auslöser `lobby-blackjack.js:252`.

### F-BJ-57  Die verdeckten Karten der anderen
- **Was:** In der Platzleiste der Lobby sieht man, wie viele Karten jeder andere Platz hat — aber nicht, welche.
- **Wie ausgelöst:** jedes Anwenden des Zugprotokolls.
- **Soll-Ergebnis:** Je Platz wird die Kartenzahl in die Platzleiste geschrieben (gezeichnet von `casino_lobby`, nicht auf dem eigenen Tuch). Bei 0 Karten bleibt der Text leer. Die Identität fremder Karten steht nirgends.
- **Vorbedingung:** Lobby mit mehr als einem Platz; die Platzleiste `[data-cl-strip]` ist vorhanden.
- **Beobachtbar an:** `[data-cl-seat="{n}"] [data-cl-seat-cards]` trägt die Zahl als Attributwert und einen Text daneben.
- **Umgesetzt in:** `blackjack.js:805-816` (Schleife über `folge.plaetze`), `round-lobby-blackjack.js:134-137` (`kartenAm`).

### F-BJ-58  Versicherung pro Platz statt für alle zugleich
- **Was:** Die Versicherung wird in der Lobby als erste Frage im **eigenen** Zug gestellt, nicht allen gleichzeitig vor dem Spiel.
- **Wie ausgelöst:** Der Server schaltet den eigenen Platz auf „am Zug", während die eigene Rundenlogik im Zustand `versicherung` steht.
- **Soll-Ergebnis:** Die Versicherungsgruppe erscheint erst dann; die Entscheidung wird als Buchstabe `i` (versichern) bzw. `n` (ohne) ins Zugprotokoll gemeldet. Auf das Geld hat die Reihenfolge keinen Einfluss — die Versicherung ist eine Einzelwette gegen den Geber.
- **Vorbedingung:** Geber zeigt ein Ass; eigener Platz am Zug.
- **Beobachtbar an:** `[data-bj-insure-group]` verliert `hidden` erst im eigenen Zug; Buchstabe `i`/`n` im Feld `mv` des Standes.
- **Umgesetzt in:** `blackjack.js:641-656`; `round-lobby-blackjack.js:39-46, 56`.

### F-BJ-59  In der Lobby beginnt keine Runde auf Knopfdruck
- **Was:** Der Auslöser „Geben" ist in der Lobby dauerhaft gesperrt — die Uhr des Servers entscheidet, wann ausgeteilt wird.
- **Wie ausgelöst:** erstes eintreffendes `casino:lobby-stand`.
- **Soll-Ergebnis:** `[data-ck-table-go]` trägt dauerhaft `aria-disabled="true"`; das Tuch wird je nach Tischphase des Servers gesperrt (`z !== 'setzen'`) oder freigegeben; eigene Einsätze werden dem Server gemeldet, sobald sie sich ändern; fremde Einsätze werden angezeigt.
- **Vorbedingung:** Lobby läuft.
- **Beobachtbar an:** `aria-disabled` am Auslöser; Ereignis `casino:lobby-handlung` mit `art: 'einsatz'`.
- **Umgesetzt in:** `blackjack.js:843-854` (`sperren`), `:855` (`fremdeEinsaetze`); `lobby-blackjack.js:264-286`.

### F-BJ-60  Ergebnismeldung an den Server
- **Was:** Ein Browser meldet am Ende der Runde, was beim Geber herauskam, und die eigene Bilanz.
- **Wie ausgelöst:** Stand mit `t = 0` (niemand mehr am Zug) **und** eigene Runde fertig.
- **Soll-Ergebnis:** Zwei Ereignisse gehen an die Lobby: `casino:lobby-fertig` mit der Nutzlast `"<Gebersumme>_<bust|bj|ok>"` (z. B. `"18_ok"`, `"23_bust"`, `"21_bj"`) und `casino:lobby-handlung` mit `art: 'bilanz'` und dem eigenen Nettoergebnis. Jede Runde wird höchstens einmal gemeldet.
- **Vorbedingung:** Lobby-Runde; eigene Runde tatsächlich abgeschlossen.
- **Beobachtbar an:** serverseitiger Rundeneintrag der Lobby; die beiden `CustomEvent`-Namen.
- **Umgesetzt in:** `lobby-blackjack.js:73-76, 210-225, 271-273`.

### F-BJ-61  Geber-Blackjack in der Lobby: sofortige Weiterschaltung
- **Was:** Hat der Geber Blackjack, steht das eigene Blatt schon beim Austeilen fest — der Platz meldet das sofort, statt die Uhr ablaufen zu lassen.
- **Wie ausgelöst:** Der eigene Platz wird gefragt, hat aber nichts zu entscheiden.
- **Soll-Ergebnis:** Der Buchstabe `s` wird einmalig gemeldet (kostet keine Karte), der Server schaltet weiter, die wartenden Plätze verlieren keine 20 Sekunden.
- **Vorbedingung:** Lobby-Runde, eigene Runde bereits `fertig`, eigener Zug noch nicht gemeldet.
- **Beobachtbar an:** `s` für den eigenen Platz im Feld `mv`, ohne dass jemand geklickt hat.
- **Umgesetzt in:** `lobby-blackjack.js:254-262`.

### F-BJ-62  Wer mitten in der Runde geht
- **Was:** Verlässt jemand die Lobby während einer Runde, läuft sie für die anderen weiter.
- **Wie ausgelöst:** Verschwinden eines Platzes aus dem Stand.
- **Soll-Ergebnis:** Seine bisher gezogenen Karten bleiben in der gemeinsamen Folge liegen, sein Protokoll bleibt stehen (es hat die Folge bereits verschoben), der Server überspringt ihn beim Weiterschalten. Sein Geld ist zu diesem Zeitpunkt bereits abgerechnet.
- **Vorbedingung:** laufende Lobby-Runde.
- **Beobachtbar an:** Platz fehlt in der Platzleiste, die Kartenfolge der übrigen bleibt unverändert.
- **Umgesetzt in:** `round-lobby-blackjack.js:48-52` (beschrieben); Serverseite in `casino_lobby`.

---

## Die Karten — was ein Mensch an ihnen ablesen kann

### F-BJ-63  Jede offene Karte trägt drei unabhängige Merkmale
- **Was:** Eine Karte ist nie allein an der Farbe zu erkennen.
- **Wie ausgelöst:** jedes Zeichnen einer offenen Karte (Handtafel, aufgedeckter Geber).
- **Soll-Ergebnis:** Jede Karte zeigt (1) den Rang als gewöhnlichen Text — **deutsch**: `B`, `D`, `K`, `A` für Bube, Dame, König, Ass —, (2) ein Farbzeichen mit eigener, unterscheidbarer Silhouette (vier verschiedene Umrisse, nicht zweimal derselbe Umriss in zwei Farben) und (3) einen für Hilfsmittel lesbaren Namen wie „Herz Dame".
- **Vorbedingung:** die Karte liegt offen.
- **Beobachtbar an:** `svg.bj-card[role="img"][aria-label="Herz Dame"]`; sichtbares Rangzeichen als Text; Anzahl der Karten einer Hand in `[data-bj-count]`.
- **Umgesetzt in:** `cards-blackjack.js:33-57, 88-165`; Vorrat `Resources/Private/Partials/Table/Blackjack/CardSprite.html`; Wörter `locallang.xlf:12-34`.

### F-BJ-64  Die verdeckte Karte verrät nichts
- **Was:** Eine Karte mit dem Rücken nach oben trägt ihre Identität nirgends.
- **Wie ausgelöst:** jedes Zeichnen der eigenen Karten auf dem Tuch und der Lochkarte des Gebers.
- **Soll-Ergebnis:** Im Markup steht weder Rang noch Farbe; der erreichbare Name lautet „verdeckte Karte". Jede Karte wird damit genau einmal mit Inhalt vorgelesen (verdeckt auf dem Tuch, offen in der Handtafel).
- **Vorbedingung:** keine.
- **Beobachtbar an:** `svg[role="img"][aria-label="verdeckte Karte"]` ohne Rang- oder Farbangabe im Quelltext.
- **Umgesetzt in:** `cards-blackjack.js:130-139`; Text `locallang.xlf:15-17`.

---

## Beobachtungen, nicht bewertet

- Die README hält zwei bewusste Abweichungen vom Konzepttext fest: der Mindesteinsatz ist 2 € statt der im Konzept genannten 1 €, und die gemessene Auszahlungsquote liegt bei rund 99,3 % statt des im Konzept zugesagten Fensters. Beides ist in README und `rules-blackjack.js` ausdrücklich als Abweichung benannt.
- `measure-payout.mjs` prüft laut README weiterhin gegen die Konzeptzahl und fällt dabei erwartungsgemäß durch; die README nennt statt dessen die gemessene Zahl.
- Der Kopfkommentar von `Configuration/JavaScriptModules.php` sagt „STAND PHASE C4: Kein Fluid-Template dieser Extension bindet ein Modul ein"; `Resources/Private/ContentElements/Table.html:43` bindet inzwischen `@phomo17/blackjack/blackjack.js` ein.
- Der Kommentar in `ext_localconf.php:38-45` beschreibt `partialRootPaths.20` als „in Phase C4 noch ungenutzt"; das Template rendert inzwischen vier Partials aus dem Site Package über diesen Pfad.
- `Classes/Blackjack.php:55` beschreibt `CREDIT_KEY` als „in Phase C4 ungenutzt"; die Konstante kommt im gesamten übrigen Quelltext nicht vor — der Tisch-Schlüssel wird im JavaScript aus `data-ck-table-key` gelesen.
- Der `uhr`-Rückruf an `connectLobby()` ist in `blackjack.js:856` eine leere Funktion; die Restzeit eines Zuges wird an diesem Tisch selbst nicht angezeigt.
- Das Zitat aus dem Konzept in `rules-blackjack.js:50-51` nennt die Handlung „Verdoppeln"; der Knopf heißt im Markup und in der README bewusst „Doppeln", um ihn vom Knopf „Verdoppeln" der geteilten Bedienleiste zu unterscheiden.
- Die README-Tabelle im Abschnitt „Die Bedienung" führt vier Handlungsknöpfe auf; die beiden Versicherungsknöpfe stehen nicht in derselben Tabelle, sondern im Absatz darunter.
- Die Fluid-Kommentare in `Cabinet.html:48-51` verweisen auf Prüfung A-7 als „in Phase C4a übersprungen"; die Spielseite existiert inzwischen.

---
