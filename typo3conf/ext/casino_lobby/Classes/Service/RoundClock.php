<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Service;

use Phomo17\CasinoAccount\Domain\Player;

/**
 * Der Rundentakt (CONCEPT.md D.10.6, C.3).
 *
 * VIER ZUSTÄNDE, wie Anhang I sie nennt:
 *   setzen     Chips dürfen gelegt und zurückgenommen werden.
 *   gesperrt   „Nichts geht mehr." Das Tuch ist zu, das Ereignis noch nicht
 *              gestartet — an einem echten Tisch winkt hier der Croupier ab.
 *   laeuft     Rad, Würfel oder Karten sind unterwegs.
 *   auswerten  Das Ergebnis steht fest.
 *
 * DAS BROWSERSEITIGE ZUSTANDSWERK (table-round.js) HAT FÜNF: es kennt
 * zusätzlich 'auszahlen'. Das ist kein Widerspruch — Auszahlen ist ein
 * Schritt IM BROWSER, der innerhalb des serverseitigen 'auswerten' abläuft
 * (jeder bucht seinen eigenen Gewinn über den Endpunkt aus D.7.2). Der
 * Server hat davon nichts zu wissen; Anhang I nennt deshalb vier.
 *
 * WARUM DIESE KLASSE NICHTS ANFASST: sie ist eine Funktion, kein Vorgang.
 * Wer sie liest, sieht den ganzen Takt auf einem Bildschirm; wer sie ändert,
 * ändert nichts anderes mit. LobbyService führt aus, was sie sagt.
 *
 * BEHOBENER FEHLER (2026-09-11, DECISIONS.md-Kandidat): eine Person allein
 * am Tisch konnte über starten() zwar ok:true bekommen, die Runde begann
 * aber nie — die Match-Reihenfolge in faellig() nahm den von starten()
 * gesetzten Ablauf sofort wieder zurück, bevor er je zum Sperren-Übergang
 * führte. Entschieden: eine Person allein DARF starten (das sagen
 * darfStarten()/starten() bereits ausdrücklich); faellig() prüft die
 * abgelaufene Frist jetzt VOR der Abbruch-Regel für "nur noch einer sitzt".
 * Kein neues Feld nötig — Begründung und Einzelheiten direkt am geänderten
 * match-Zweig in faellig().
 */
final class RoundClock
{
    public const SETZEN = 'setzen';
    public const GESPERRT = 'gesperrt';
    public const LAEUFT = 'laeuft';
    public const AUSWERTEN = 'auswerten';

    /** Alle vier, in der Reihenfolge des Ablaufs. Was hier nicht steht, gibt es nicht. */
    public const ZUSTAENDE = [self::SETZEN, self::GESPERRT, self::LAEUFT, self::AUSWERTEN];

    /** „Roulette und Craps: 20 Sekunden Setzzeit. Ausdrückliche Vorgabe." (D.10.6) */
    public const SETZZEIT = 20;

    /** Der Augenblick, in dem der Croupier abwinkt (C.3). Lang genug, dass jeder
     *  Browser die Saat bei seiner nächsten Abfrage (Takt 1 s) sicher bekommt,
     *  BEVOR die Runde losläuft. */
    public const SPERRZEIT = 2;

    /** Notbremse: meldet bis dahin niemand ein Ergebnis, endet die Runde ohne eines. */
    public const LAUFFRIST = 20;

    /** So lange bleibt das Ergebnis stehen, bevor neu gesetzt werden darf. */
    public const ERGEBNISZEIT = 5;

    /**
     * Die Frist für ein Lebenszeichen (D.10.5: „Wer 30 Sekunden nichts von
     * sich hören lässt, gilt als gegangen").
     *
     * BEWUSST GEBORGT statt neu gesetzt: Player::SESSION_TIMEOUT ist genau
     * diese Zahl und trägt in casino_account bereits den Kommentar
     * „dieselbe Frist, die CONCEPT.md D.10.5 für einen verlassenen
     * Lobbyplatz nennt. Eine zweite, abweichende Frist für dasselbe Wort
     * wäre eine Falle." Diese Zeile löst das Versprechen ein.
     */
    public const FRIST = Player::SESSION_TIMEOUT;

    /** Ab so vielen besetzten Plätzen läuft die Setzuhr (Entscheidung 4.0.4). */
    public const UHR_AB = 2;

    /** „jeder Platz hat 20 Sekunden für seine Entscheidung" (D.10.6). */
    public const ZUGZEIT = 20;

    /**
     * Was gilt als Nächstes? null heißt: nichts zu tun.
     *
     * @param string $zustand  einer aus ZUSTAENDE
     * @param int    $bis      Zeitstempel, an dem der Zustand endet; 0 = keine Uhr
     * @param int    $jetzt    Zeitstempel jetzt
     * @param int    $besetzt  besetzte Plätze dieser Lobby
     * @param string $spiel    der Spielschlüssel dieser Lobby ('' = unbekannt/irrelevant)
     *
     * @return array{zustand: string, bis: int, saat: bool, runde: bool, zuege: bool, zug: bool}|null
     *         saat  = eine neue Saat ziehen
     *         runde = die Rundennummer um eins erhöhen
     *         zuege = das Zugprotokoll leeren (turn_seat auf 0)
     *         zug   = beim Übergang zu 'laeuft' beginnt beim Blackjack die
     *                 Reihe der Entscheidungen; turn_seat setzt LobbyService
     */
    public static function faellig(string $zustand, int $bis, int $jetzt, int $besetzt, string $spiel = ''): ?array
    {
        $abgelaufen = $bis > 0 && $jetzt >= $bis;

        return match (true) {
            // BEHOBENER FEHLER (Protokollfund/Nachstellung 2026-09-11): eine
            // allein sitzende Person konnte die Runde nie starten, obwohl
            // darfStarten() und LobbyService::starten() das ausdrücklich
            // erlauben. starten() setzt state_until = jetzt (dieselbe
            // Zusicherung, mit der eine ausgelaufene Setzzeit erkannt wird —
            // "ein einziger Weg in den Zustand 'gesperrt'", siehe dortiger
            // Kommentar); die NÄCHSTE Abfrage sah dann bis > 0 UND
            // besetzt < UHR_AB und nahm den Ablauf über die Zeile darunter
            // ("…und wieder aus, sobald nur noch einer sitzt") sofort wieder
            // zurück, BEVOR der Sperren-Übergang je geprüft wurde — die Uhr
            // lief nie ab, sie wurde immer schon vorher abgewürgt.
            //
            // ENTSCHEIDUNG (DECISIONS.md-Kandidat): eine Person allein DARF
            // starten — das ist die ausdrückliche, bereits gebaute Zusage
            // von darfStarten()/starten(); eine Absage an dieser Stelle
            // hätte zwei Funktionen widersprochen, die bereits sagen "ja,
            // darf sie". Die Abhilfe ist deshalb NICHT ein neues Feld, das
            // "abgelaufene Setzzeit" von "von Hand ausgelöst" unterscheidet
            // — beide Fälle sind ein und dasselbe Ereignis aus Sicht dieser
            // Klasse: eine Frist, die erreicht ist ($abgelaufen). Es genügt,
            // DIESE Prüfung vor der Abbruch-Regel zu stellen, und die
            // Abbruch-Regel selbst auf den Fall zu begrenzen, für den sie
            // gedacht war: die Uhr läuft NOCH (nicht abgelaufen), aber der
            // zweite Platz ist inzwischen leer — dann, und nur dann, wird
            // abgebrochen statt gesperrt.
            //
            // Setzzeit vorbei — ob durch natürlichen Ablauf (zwei Sitzende,
            // 20 Sekunden um) oder durch einen ausdrücklichen Start (eine
            // Person allein, starten() hat bis auf jetzt gesetzt): sperren,
            // Saat ziehen, neue Rundennummer. MUSS vor den beiden Zeilen
            // darunter geprüft werden.
            $zustand === self::SETZEN && $abgelaufen
                => self::schritt(self::GESPERRT, $jetzt + self::SPERRZEIT, saat: true, runde: true, zuege: true),

            // Die Uhr springt an, sobald ein Zweiter sitzt (Entscheidung 4.0.4).
            $zustand === self::SETZEN && $bis === 0 && $besetzt >= self::UHR_AB
                => self::schritt(self::SETZEN, $jetzt + self::SETZZEIT),

            // …und wieder aus, sobald nur noch einer sitzt — ABER NUR, wenn
            // die Frist noch nicht abgelaufen ist (der Fall oben hat sonst
            // bereits entschieden). Ohne diese Zeile liefe die Uhr für eine
            // Person weiter, die auf niemanden wartet.
            $zustand === self::SETZEN && $bis > 0 && !$abgelaufen && $besetzt < self::UHR_AB
                => self::schritt(self::SETZEN, 0),

            $zustand === self::GESPERRT && $abgelaufen
                => $spiel === 'blackjack'
                    // Beim Blackjack beginnt mit 'laeuft' NICHT eine Animation,
                    // sondern die Reihe der Entscheidungen. Die Frist ist
                    // deshalb die des ERSTEN Platzes, nicht die Notbremse der
                    // ganzen Runde. Welcher Platz das ist, setzt LobbyService
                    // (die Uhr weiß nicht, wer sitzt).
                    ? self::schritt(self::LAEUFT, $jetzt + self::ZUGZEIT, zug: true)
                    : self::schritt(self::LAEUFT, $jetzt + self::LAUFFRIST),

            // Notbremse: kein Ergebnis gemeldet. Zurück zum Setzen, ohne Ergebnis.
            $zustand === self::LAEUFT && $abgelaufen
                => self::schritt(self::SETZEN, self::setzUhr($jetzt, $besetzt)),

            $zustand === self::AUSWERTEN && $abgelaufen
                => self::schritt(self::SETZEN, self::setzUhr($jetzt, $besetzt)),

            default => null,
        };
    }

    /** Die Uhr für die nächste Setzrunde: nur bei zwei oder mehr Sitzenden. */
    public static function setzUhr(int $jetzt, int $besetzt): int
    {
        return $besetzt >= self::UHR_AB ? $jetzt + self::SETZZEIT : 0;
    }

    /** Darf dieser Platz die Runde selbst auslösen? Nur, wenn keine Uhr läuft. */
    public static function darfStarten(string $zustand, int $bis, int $besetzt): bool
    {
        return $zustand === self::SETZEN && $bis === 0 && $besetzt < self::UHR_AB && $besetzt >= 1;
    }

    /**
     * Läuft in diesem Zustand die 30-Sekunden-Frist? (Entscheidung 4.0.5)
     *
     * NICHT während 'laeuft' und 'auswerten': D.10.5 verlangt zugleich, dass
     * während einer laufenden Animation NICHT abgefragt wird — wer sich an
     * die eine Regel hält, verlöre sonst durch die andere seinen Platz.
     */
    public static function fristLaeuft(string $zustand): bool
    {
        return $zustand === self::SETZEN || $zustand === self::GESPERRT;
    }

    /**
     * Der nächste Platz, der beim Blackjack gefragt wird — oder 0, wenn
     * niemand mehr aussteht.
     *
     * REINE FUNKTION, wie alles in dieser Klasse: sie bekommt die Liste der
     * Platznummern, die in dieser Runde mitspielen (aufsteigend), und den
     * gerade gefragten Platz. Sie fragt nicht, wer noch sitzt — das weiß
     * LobbyService, und nur der.
     *
     * @param list<int> $nummern aufsteigend sortierte Platznummern der Runde
     */
    public static function naechsterZug(array $nummern, int $aktuell): int
    {
        foreach ($nummern as $nr) {
            if ($nr > $aktuell) {
                return $nr;
            }
        }
        return 0;
    }

    /** @return array{zustand: string, bis: int, saat: bool, runde: bool, zuege: bool, zug: bool} */
    private static function schritt(string $zustand, int $bis, bool $saat = false, bool $runde = false, bool $zuege = false, bool $zug = false): array
    {
        return ['zustand' => $zustand, 'bis' => $bis, 'saat' => $saat, 'runde' => $runde, 'zuege' => $zuege, 'zug' => $zug];
    }
}
