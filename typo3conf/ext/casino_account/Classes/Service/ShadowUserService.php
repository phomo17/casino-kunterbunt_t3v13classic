<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Doctrine\DBAL\ArrayParameterType;
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

    /**
     * Die Spielenden-Nummern zu einer Liste von Schattendatensätzen.
     *
     * @param list<int> $feUserUids
     * @return array<int, int> feUserUid => playerUid (nur gültige Paare)
     */
    public function playersForUsers(array $feUserUids): array
    {
        if ($feUserUids === []) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll();
        $rows = $queryBuilder
            ->select('uid', 'tx_casinoaccount_player')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->in(
                    'uid',
                    $queryBuilder->createNamedParameter($feUserUids, ArrayParameterType::INTEGER)
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();

        $result = [];
        foreach ($rows as $row) {
            $playerUid = (int)($row['tx_casinoaccount_player'] ?? 0);
            if ($playerUid > 0) {
                $result[(int)$row['uid']] = $playerUid;
            }
        }
        return $result;
    }

    /**
     * Der Schattendatensatz, so wie ihn der Anmeldedienst braucht: als volle
     * Zeile, mit allen Sperren des Kerns geprüft.
     *
     * WARUM NICHT AbstractAuthenticationService::fetchUserRecord(): jene
     * Methode sucht über den BENUTZERNAMEN und wendet dabei die
     * „check_pid_clause" des Kerns an — eine Einschränkung auf eine
     * Seitennummer, die aus dem Anmeldeformular kommt. Unsere
     * Schattendatensätze liegen im Kontenordner, dessen Nummer NIEMAND von
     * außen mitschicken soll. Deshalb wird hier gezielt über die uid gesucht
     * und die Sperren werden ausdrücklich selbst geprüft:
     * deleted = 0, disable = 0, starttime <= jetzt, (endtime = 0 OR endtime > jetzt).
     * Das ist dieselbe Liste, die der Kern in userConstraints() aufstellt —
     * nur an einer Stelle, die man beim Lesen sieht.
     *
     * @return array<string, mixed>|null
     */
    public function findEnabledRow(int $feUserUid): ?array
    {
        if ($feUserUid <= 0) {
            return null;
        }
        $now = (int)($GLOBALS['EXEC_TIME'] ?? time());
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll();
        $row = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'uid',
                    $queryBuilder->createNamedParameter($feUserUid, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->eq(
                    'deleted',
                    $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->eq(
                    'disable',
                    $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->lte(
                    'starttime',
                    $queryBuilder->createNamedParameter($now, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->or(
                    $queryBuilder->expr()->eq(
                        'endtime',
                        $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                    ),
                    $queryBuilder->expr()->gt(
                        'endtime',
                        $queryBuilder->createNamedParameter($now, Connection::PARAM_INT)
                    )
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        return $row === false ? null : $row;
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
