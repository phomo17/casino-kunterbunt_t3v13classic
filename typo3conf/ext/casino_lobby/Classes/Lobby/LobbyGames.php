<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Lobby;

/**
 * Welche Spiele eine Lobby haben (CONCEPT.md D.10.2).
 *
 * Ein Namensschild, kein Dienst — deshalb der private Konstruktor und der
 * Ausschluss in Configuration/Services.yaml (dieselbe Bauart wie
 * Phomo17\Roulette\Roulette).
 *
 * WARUM HIER GERÄTENAMEN STEHEN DÜRFEN: die Entkopplungszusage des Projekts
 * gilt dem SITE PACKAGE — casino_startpage darf kein Gerät beim Namen
 * kennen, weil sonst jedes neue Gerät eine Änderung dort erzwänge. Diese
 * Extension IST das Lobby-System, und D.10.2 zählt seine drei Spiele
 * namentlich und mit unterschiedlichen Platzzahlen auf. Eine Registry, bei
 * der sich ein Spiel selbst anmeldet, hätte in D4 keinen einzigen Anmelder
 * (die drei Tische werden erst in D5 angefasst) und wäre damit genau die
 * spekulative Vorratshaltung, die dieses Projekt vermeidet.
 *
 * DIE SCHLÜSSEL SIND DREIFACH BELEGT und das ist Absicht: sie sind zugleich
 *   - der Wert von tt_content.CType des Inhaltselements jedes Tisches
 *     (Roulette::CTYPE === 'roulette'),
 *   - der Wert von data-ck-table-key im ausgelieferten Markup,
 *   - der Wert der Spalte tx_casinolobby_lobby.game.
 * Deshalb genügt EINE Liste, um eine Seite einem Spiel zuzuordnen.
 */
final class LobbyGames
{
    /** Spiel => Plätze je Lobby (CONCEPT.md D.10.2). */
    public const SPIELE = [
        'roulette' => 8,
        'blackjack' => 5,
        'craps' => 8,
    ];

    /** „Höchstens 4 Lobbys je Spiel. Ausdrückliche Vorgabe." (D.10.2) */
    public const MAX_LOBBYS = 4;

    public static function kennt(string $spiel): bool
    {
        return array_key_exists($spiel, self::SPIELE);
    }

    /** Plätze dieses Spiels, oder 0 für ein Spiel ohne Lobby (Coin Pusher, Walzenautomaten). */
    public static function plaetze(string $spiel): int
    {
        return self::SPIELE[$spiel] ?? 0;
    }

    private function __construct() {}
}
