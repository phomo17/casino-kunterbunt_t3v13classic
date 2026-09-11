<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

/**
 * Die EINZIGE Stelle, die im Frontend Beträge in tx_casinoaccount_player
 * schreibt (CONCEPT.md D.8, Vorgriff auf D.7.2).
 *
 * WARUM NICHT ÜBER DEN DataHandler: im Frontend gibt es keinen
 * Backend-Benutzer, ohne den der DataHandler nichts tun darf (nachgewiesen in
 * Umsetzungsstück Dd: DataHandler::hasPageContextPermission() verlangt eine
 * echte BE_USER->getUserId()). Diese Klasse schreibt deshalb unmittelbar über
 * den QueryBuilder mit gebundenen Parametern — und NUR sie. Das ist keine
 * Abkehr von „Core-first": der QueryBuilder IST die Kern-API für
 * Datenbankzugriff; bewusst nicht benutzt wird nur der DataHandler, und zwar
 * mit dem oben belegten Grund. PlayerRepository liest nur (siehe deren
 * Klassenkopf) und schreibt nie.
 *
 * WARUM JEDE BUCHUNG EINE EINZIGE UPDATE-ANWEISUNG IST. Ein Ablauf „lesen,
 * rechnen, schreiben" verliert Geld, wenn zwei Anfragen sich überholen (zwei
 * Registerkarten, ein Abmelden und ein Zeitablauf gleichzeitig). Die Rechnung
 * gehört deshalb in die Datenbankanweisung selbst, nicht in PHP.
 */
final readonly class AccountBookkeeper
{
    /**
     * Sekunden, die last_seen mindestens alt sein muss, bevor touch() erneut
     * schreibt. Player::SESSION_TIMEOUT ist 30 Sekunden; eine Schonfrist von
     * 5 Sekunden hält den Wert genau genug, um innerhalb dieser 30 Sekunden
     * nie fälschlich „weg" zu zeigen, und spart trotzdem die allermeisten
     * Schreibvorgänge.
     */
    public const SCHONFRIST = 5;

    public function __construct(private ConnectionPool $connectionPool) {}

    /**
     * D.8: „Beim Abmelden werden Gerätekredit und Gewinnspeicher vollständig
     * in die Kasse gebucht — es kann kein Geld in einem Gerät liegenbleiben."
     *
     * Eine einzige Anweisung, keine Vorab-Abfrage:
     *   balance_cash = balance_cash + balance_machine + balance_win,
     *   balance_machine = 0, balance_win = 0
     * Nur für den einen Datensatz, nur wenn tatsächlich etwas zu buchen ist.
     *
     * @return bool ob wirklich gebucht wurde (für die Meldung im Modul)
     */
    public function bookDeviceMoneyToCash(int $playerUid): bool
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(PlayerRepository::TABLE);

        $affected = $queryBuilder
            ->update(PlayerRepository::TABLE)
            // QueryBuilder mit Ausdruck auf der rechten Seite: hier ist
            // set(…, …, false) richtig — das dritte Argument `false` sagt
            // „das ist ein Ausdruck, keine Zeichenkette". Ein Wert von außen
            // steht hier NICHT, deshalb ist es keine offene Tür.
            ->set('balance_cash', 'balance_cash + balance_machine + balance_win', false)
            ->set('balance_machine', 0)
            ->set('balance_win', 0)
            ->where(
                $queryBuilder->expr()->eq(
                    'uid',
                    $queryBuilder->createNamedParameter($playerUid, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->or(
                    $queryBuilder->expr()->gt(
                        'balance_machine',
                        $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                    ),
                    $queryBuilder->expr()->gt(
                        'balance_win',
                        $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                    )
                )
            )
            ->executeStatement();

        return $affected > 0;
    }

    /**
     * Hält den Zeitstempel „zuletzt gesehen" (Anhang I: last_seen) nach.
     *
     * Wird vom Tor bei JEDER Seitenanfrage einer angemeldeten Person gerufen
     * (Umsetzungsstück D2c). Damit daraus nicht ein Schreibvorgang je Bild
     * wird, schreibt die Methode nur, wenn der gespeicherte Wert älter als
     * SCHONFRIST Sekunden ist — die Bedingung steht in der WHERE-Klausel,
     * nicht in PHP, damit auch hier keine zweite Abfrage nötig ist.
     */
    public function touch(int $playerUid, int $now): void
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(PlayerRepository::TABLE);

        $queryBuilder
            ->update(PlayerRepository::TABLE)
            ->set('last_seen', $now)
            ->where(
                $queryBuilder->expr()->eq(
                    'uid',
                    $queryBuilder->createNamedParameter($playerUid, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->lt(
                    'last_seen',
                    $queryBuilder->createNamedParameter($now - self::SCHONFRIST, Connection::PARAM_INT)
                )
            )
            ->executeStatement();
    }
}
