<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Legt den Schattendatensatz eines Spielenden in fe_users an, hält seinen
 * Namen nach und räumt ihn wieder weg (CONCEPT.md D.6.2).
 *
 * DER BENUTZERNAME ÄNDERT SICH NIE. Er ist „casino-<Nummer des Spielenden>"
 * und damit technisch, nicht menschlich. Wird ein Spielender umbenannt, ändert
 * sich nur das Feld „name" des Schattendatensatzes, nie sein Benutzername.
 * Der Grund: der Benutzername ist innerhalb des Ordners eindeutig
 * (uniqueInPid in der TCA des Kerns) und darf beliebige Zeichen NICHT
 * enthalten — der Name eines Spielenden darf sie laut D.3.2 aber sehr wohl.
 * Zwei Personen namens „Anna" hätten sonst denselben Benutzernamen gewollt.
 *
 * DAS PASSWORT IST UNBENUTZBAR UND WIRD NIRGENDS AUFBEWAHRT. Es entsteht aus
 * random_bytes(), geht einmal an den DataHandler, wird dort verschlüsselt
 * gespeichert und ist danach verloren — auch für uns. Genau das ist gewollt:
 * „ohne brauchbares Passwort, ohne Anmeldemöglichkeit über ein Formular"
 * (D.6.2). Angemeldet wird ab D2 ausschließlich über die Kennung.
 */
final readonly class ShadowUserService
{
    public const TABLE = 'fe_users';
    private const USERNAME_PREFIX = 'casino-';

    public function __construct(
        private ConnectionPool $connectionPool,
        private AccountStorage $storage,
    ) {}

    /**
     * Legt den Schattendatensatz für einen NEUEN Spielenden an, dessen Nummer
     * es noch nicht gibt.
     *
     * Aufgerufen aus processDatamap_postProcessFieldArray('new'): dort ist der
     * Name schon bekannt, die Nummer des Spielenden noch nicht. Der Rückverweis
     * in der Gegenrichtung wird deshalb erst danach gesetzt — siehe
     * linkBack().
     *
     * @return int die Nummer des Schattendatensatzes, oder 0 bei Fehlschlag
     */
    public function createFor(string $playerName, int $storagePid): int
    {
        $groupUid = $this->storage->ensureGroup($storagePid);
        if ($storagePid <= 0 || $groupUid <= 0) {
            return 0;
        }

        $newId = 'NEW' . substr(md5('casino_account_feuser_' . microtime(true) . random_bytes(8)), 0, 10);

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            self::TABLE => [
                $newId => [
                    'pid' => $storagePid,
                    // Vorläufig; sobald die Nummer des Spielenden feststeht,
                    // setzt linkBack() den endgültigen Namen.
                    'username' => self::USERNAME_PREFIX . 'neu-' . bin2hex(random_bytes(6)),
                    'password' => self::unusablePassword(),
                    'usergroup' => (string)$groupUid,
                    'name' => $playerName,
                    'disable' => 0,
                ],
            ],
        ], []);
        $dataHandler->process_datamap();

        return (int)($dataHandler->substNEWwithIDs[$newId] ?? 0);
    }

    /**
     * Setzt den Rückverweis und den endgültigen Benutzernamen, sobald die
     * Nummer des Spielenden feststeht.
     */
    public function linkBack(int $feUserUid, int $playerUid): void
    {
        if ($feUserUid <= 0 || $playerUid <= 0) {
            return;
        }
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            self::TABLE => [
                $feUserUid => [
                    'username' => self::USERNAME_PREFIX . $playerUid,
                    'tx_casinoaccount_player' => $playerUid,
                ],
            ],
        ], []);
        $dataHandler->process_datamap();
    }

    /** Hält den angezeigten Namen des Schattendatensatzes nach. */
    public function rename(int $feUserUid, string $playerName): void
    {
        if ($feUserUid <= 0) {
            return;
        }
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            self::TABLE => [$feUserUid => ['name' => $playerName]],
        ], []);
        $dataHandler->process_datamap();
    }

    /**
     * Wirft den Schattendatensatz weg — als „gelöscht" markiert, nicht
     * physisch entfernt. So macht es der DataHandler bei jedem Datensatz, und
     * so lässt sich ein versehentliches Löschen im Papierkorb rückgängig
     * machen.
     */
    public function delete(int $feUserUid): void
    {
        if ($feUserUid <= 0) {
            return;
        }
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], [
            self::TABLE => [$feUserUid => ['delete' => 1]],
        ]);
        $dataHandler->process_cmdmap();
    }

    /** Holt einen versehentlich gelöschten Schattendatensatz zurück. */
    public function undelete(int $feUserUid): void
    {
        if ($feUserUid <= 0) {
            return;
        }
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], [
            self::TABLE => [$feUserUid => ['undelete' => 1]],
        ]);
        $dataHandler->process_cmdmap();
    }

    /**
     * Ein Passwort, das jede Passwortregel erfüllt und das niemand kennt.
     *
     * Warum die vier Zeichenklassen einzeln beigemischt werden: der
     * DataHandler prüft das Passwort gegen die eingestellte Passwortregel
     * (DataHandler.php:1725-1757). Wäre die Regel scharf gestellt und das
     * Zufallspasswort enthielte zufällig keine Ziffer, wiese der DataHandler
     * den ganzen Datensatz ab — und der Spielende bliebe ohne
     * Schattendatensatz, ohne dass jemand den Grund sähe.
     */
    public static function unusablePassword(): string
    {
        $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $password = '';
        for ($i = 0; $i < 56; $i++) {
            $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        // Je ein Zeichen aus den vier Klassen an fester Stelle beimischen.
        return 'Aa1!' . $password;
    }

    /** Der Schattendatensatz zu einem Spielenden, oder 0. */
    public function findByPlayer(int $playerUid): int
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll();
        $uid = $queryBuilder
            ->select('uid')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'tx_casinoaccount_player',
                    $queryBuilder->createNamedParameter($playerUid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchOne();
        return (int)$uid;
    }
}
