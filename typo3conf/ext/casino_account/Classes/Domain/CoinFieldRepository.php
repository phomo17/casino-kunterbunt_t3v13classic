<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Domain;

use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

/**
 * Der Gerätespeicher einer Person (CONCEPT.md D.8, D.13).
 *
 * Die einzige Stelle, die tx_casinoaccount_coinfield liest oder schreibt.
 * KEIN GELD: diese Tabelle geht in kein Gesamtvermögen ein und hat keine
 * Buchungsnummer — deshalb liegt sie in einer eigenen Klasse und nicht in
 * BookingService.
 */
final readonly class CoinFieldRepository
{
    public const TABLE = 'tx_casinoaccount_coinfield';

    /** Mehr nimmt der Endpunkt nicht an. Ein voller Coin-Pusher-Stand liegt bei rund 9 kB. */
    public const MAX_LAENGE = 65536;

    public function __construct(private ConnectionPool $connectionPool) {}

    /**
     * Alle Speicherstände einer Person, als Schlüssel => Text.
     *
     * @return array<string, string>
     */
    public function allForPlayer(int $playerUid): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll();

        return $queryBuilder
            ->select('store_key', 'payload')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'player',
                    $queryBuilder->createNamedParameter($playerUid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAllKeyValue();
    }

    /**
     * Schreibt einen Speicherstand. Ein leerer Text löscht den Datensatz —
     * so bleibt die Tabelle klein und ein „kein Stand" ist ein DEFINIERTER
     * Zustand statt einer leeren Zeichenkette.
     *
     * Die Abfrage ist ein UPSERT über die eindeutige Kennzeichnung
     * (player, store_key): Connection::insert() im Erfolgsfall, bei
     * Schlüsselverletzung Connection::update(). Kein „erst prüfen, dann
     * schreiben" — das wäre wieder ein Wettrennen.
     */
    public function save(int $playerUid, int $storagePid, string $storeKey, string $payload): void
    {
        $connection = $this->connectionPool->getConnectionForTable(self::TABLE);
        $now = (int)($GLOBALS['EXEC_TIME'] ?? time());

        if ($payload === '') {
            $connection->delete(
                self::TABLE,
                ['player' => $playerUid, 'store_key' => $storeKey],
                [Connection::PARAM_INT, Connection::PARAM_STR]
            );
            return;
        }

        try {
            $connection->insert(
                self::TABLE,
                [
                    'pid' => $storagePid,
                    'player' => $playerUid,
                    'store_key' => $storeKey,
                    'payload' => $payload,
                    'tstamp' => $now,
                    'crdate' => $now,
                ],
                [
                    Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_STR,
                    Connection::PARAM_STR, Connection::PARAM_INT, Connection::PARAM_INT,
                ]
            );
        } catch (UniqueConstraintViolationException) {
            $connection->update(
                self::TABLE,
                ['payload' => $payload, 'tstamp' => $now],
                ['player' => $playerUid, 'store_key' => $storeKey],
                [Connection::PARAM_STR, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_STR]
            );
        }
    }
}
