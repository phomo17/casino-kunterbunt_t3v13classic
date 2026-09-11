<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Domain;

/**
 * Ein Platz an einer Lobby, so wie er aus der Datenbank kommt (CONCEPT.md
 * D.10, D.13).
 *
 * Gleiche Bauart wie Lobby.php. Das Feld $name stammt NICHT aus der
 * Platz-Tabelle selbst, sondern kommt beim Lesen per JOIN aus
 * tx_casinoaccount_player.name dazu (LobbyRepository) — sonst bräuchte
 * jede Abfrage der Platzliste eine Einzelabfrage je Platz.
 */
final readonly class Seat
{
    public function __construct(
        public int $uid,
        public int $lobby,
        public int $player,
        public int $seatNo,
        public int $lastSeen,
        public int $joinedRound,
        public int $shooterNo,
        public string $name,
    ) {}

    /**
     * Baut das Objekt aus einer Datenbankzeile, mit dem beigefügten
     * Anzeigenamen aus dem JOIN (Spaltenalias 'player_name').
     *
     * @param array<string, mixed> $zeile
     */
    public static function fromRow(array $zeile): self
    {
        return new self(
            uid: (int)$zeile['uid'],
            lobby: (int)$zeile['lobby'],
            player: (int)$zeile['player'],
            seatNo: (int)$zeile['seat_no'],
            lastSeen: (int)$zeile['last_seen'],
            joinedRound: (int)$zeile['joined_round'],
            shooterNo: (int)$zeile['shooter_no'],
            name: (string)($zeile['player_name'] ?? ''),
        );
    }
}
