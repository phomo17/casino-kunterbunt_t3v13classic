<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Domain;

/**
 * Ein Spielender, so wie er aus der Datenbank kommt (CONCEPT.md Anhang I).
 *
 * Die Summe wird HIER gerechnet und nirgends sonst. CONCEPT.md D.13:
 * „Das Gesamtvermögen wird nicht gespeichert, sondern immer aus den drei
 * Beträgen gerechnet. Es kann so nicht auseinanderlaufen." Eine zweite
 * Rechenstelle wäre genau das Auseinanderlaufen, das damit ausgeschlossen
 * werden soll.
 */
final readonly class Player
{
    public function __construct(
        public int $uid,
        public string $name,
        public string $token,
        public int $balanceCash,
        public int $balanceMachine,
        public int $balanceWin,
        public int $role,
        public int $feUser,
        public int $beUser,
        public bool $isAdmin,
        public int $bookingSequence,
        public string $bookingClient,
        public int $lastSeen,
        public bool $hidden,
    ) {}

    /** Kasse + Gerätekredit + Gewinnspeicher (CONCEPT.md D.7). */
    public function total(): int
    {
        return $this->balanceCash + $this->balanceMachine + $this->balanceWin;
    }

    /**
     * Gilt als angemeldet, wenn das letzte Lebenszeichen weniger als
     * SESSION_TIMEOUT Sekunden her ist.
     *
     * In D1 steht last_seen immer auf 0, weil noch niemand sich anmelden kann
     * — die Spalte wird erst in D2 beschrieben. Die Methode steht trotzdem
     * schon hier, damit die Liste aus D.3.1 ihre Spalte „Anmeldezustand" hat
     * und D2 nichts umbauen muss.
     */
    public function isOnline(int $now): bool
    {
        return $this->lastSeen > 0 && ($now - $this->lastSeen) < self::SESSION_TIMEOUT;
    }

    /**
     * 30 Sekunden — dieselbe Frist, die CONCEPT.md D.10.5 für einen
     * verlassenen Lobbyplatz nennt. Eine zweite, abweichende Frist für
     * dasselbe Wort „angemeldet" wäre eine Falle.
     */
    public const SESSION_TIMEOUT = 30;

    /**
     * Baut das Objekt aus einer Datenbankzeile.
     *
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            uid: (int)$row['uid'],
            name: (string)$row['name'],
            token: (string)$row['token'],
            balanceCash: (int)$row['balance_cash'],
            balanceMachine: (int)$row['balance_machine'],
            balanceWin: (int)$row['balance_win'],
            role: (int)$row['role'],
            feUser: (int)$row['fe_user'],
            beUser: (int)$row['be_user'],
            isAdmin: (bool)$row['is_admin'],
            bookingSequence: (int)$row['booking_seq'],
            bookingClient: (string)$row['booking_client'],
            lastSeen: (int)$row['last_seen'],
            hidden: (bool)$row['hidden'],
        );
    }
}
