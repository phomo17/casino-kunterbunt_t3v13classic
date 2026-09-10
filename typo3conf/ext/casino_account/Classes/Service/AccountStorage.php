<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Domain\Repository\PageRepository;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Registry;
use TYPO3\CMS\Core\Site\SiteFinder;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Sorgt dafür, dass es den Ordner für die Konten und die Benutzergruppe für
 * die Schattendatensätze gibt (CONCEPT.md D.6.2).
 *
 * Beide Nummern liegen in der sys_registry des Kerns. Warum nicht in einer
 * eigenen Tabelle: es sind zwei Zahlen. Der Kern hat für genau diesen Fall
 * bereits einen Ort, und CONCEPT.md D.5 schreibt ihn für den QR-Modus ohnehin
 * vor.
 *
 * WIEDERHOLBAR. Jede Methode schaut zuerst nach, ob es das Gesuchte schon
 * gibt. Zweimal aufgerufen entsteht nichts doppelt. Das ist die Bedingung
 * dafür, dass ensure() gefahrlos bei jedem Modulaufruf mitlaufen kann.
 *
 * SCHEITERT LAUT, NICHT STILL. Kann der Ordner nicht angelegt werden — weil
 * dem angemeldeten Backend-Benutzer die Rechte fehlen —, gibt ensure() 0
 * zurück, und das Modul sagt es in einer Meldung. Es tut nicht so, als sei
 * alles in Ordnung.
 */
final class AccountStorage
{
    public const REGISTRY_NAMESPACE = 'tx_casinoaccount';
    private const KEY_STORAGE_PID = 'storagePid';
    private const KEY_GROUP_UID = 'feGroupUid';
    private const LANG = 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:';

    public function __construct(
        private readonly Registry $registry,
        private readonly ConnectionPool $connectionPool,
        private readonly SiteFinder $siteFinder,
        private readonly LanguageServiceFactory $languageServiceFactory,
    ) {}

    /**
     * Die Seitennummer des Kontenordners, oder 0, wenn er weder vorhanden ist
     * noch angelegt werden konnte.
     */
    public function ensure(): int
    {
        $pid = (int)$this->registry->get(self::REGISTRY_NAMESPACE, self::KEY_STORAGE_PID, 0);
        if ($pid > 0 && $this->pageExists($pid)) {
            return $pid;
        }

        $pid = $this->createFolder();
        if ($pid > 0) {
            $this->registry->set(self::REGISTRY_NAMESPACE, self::KEY_STORAGE_PID, $pid);
        }
        return $pid;
    }

    /**
     * Die Nummer der Benutzergruppe für die Schattendatensätze, oder 0.
     *
     * Warum überhaupt eine Gruppe: die TCA des Kerns setzt für fe_users.usergroup
     * 'minitems' => 1 — ein Frontend-Benutzer ohne Gruppe ist im Sinne des
     * Formulars unvollständig. Außerdem braucht D2 sie: eine eigene Gruppe ist
     * der saubere Weg, den Zugang zu den Spielseiten zu steuern.
     */
    public function ensureGroup(int $storagePid): int
    {
        $uid = (int)$this->registry->get(self::REGISTRY_NAMESPACE, self::KEY_GROUP_UID, 0);
        if ($uid > 0 && $this->recordExists('fe_groups', $uid)) {
            return $uid;
        }

        $uid = $this->createGroup($storagePid);
        if ($uid > 0) {
            $this->registry->set(self::REGISTRY_NAMESPACE, self::KEY_GROUP_UID, $uid);
        }
        return $uid;
    }

    /**
     * Legt den Ordner an — über den DataHandler, wie jeder Redakteur es auch
     * täte, nur ohne Klicks.
     */
    private function createFolder(): int
    {
        $parent = $this->rootPageId();
        $newId = 'NEW' . substr(md5('casino_account_folder'), 0, 10);

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            'pages' => [
                $newId => [
                    'pid' => $parent,
                    'title' => $this->translate('storage.folder.title'),
                    'doktype' => PageRepository::DOKTYPE_SYSFOLDER,
                    'hidden' => 0,
                    // „module = fe_users" sagt TYPO3, dass in diesem Ordner
                    // Frontend-Benutzer liegen. Der Ordner bekommt dadurch das
                    // richtige Symbol und das Listenmodul zeigt gleich die
                    // passende Tabelle.
                    'module' => 'fe_users',
                ],
            ],
        ], []);
        $dataHandler->process_datamap();

        return (int)($dataHandler->substNEWwithIDs[$newId] ?? 0);
    }

    private function createGroup(int $storagePid): int
    {
        if ($storagePid <= 0) {
            return 0;
        }
        $newId = 'NEW' . substr(md5('casino_account_group'), 0, 10);

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            'fe_groups' => [
                $newId => [
                    'pid' => $storagePid,
                    'title' => $this->translate('storage.group.title'),
                ],
            ],
        ], []);
        $dataHandler->process_datamap();

        return (int)($dataHandler->substNEWwithIDs[$newId] ?? 0);
    }

    /**
     * Die Wurzelseite der Site. Gibt es mehrere Sites, gewinnt die mit der
     * kleinsten Nummer — dieses Haus hat genau eine, und eine willkürliche,
     * aber immer gleiche Wahl ist besser als eine wechselnde.
     */
    private function rootPageId(): int
    {
        $rootPageIds = array_map(
            static fn($site): int => $site->getRootPageId(),
            $this->siteFinder->getAllSites()
        );
        if ($rootPageIds === []) {
            return 0;
        }
        sort($rootPageIds);
        return $rootPageIds[0];
    }

    private function pageExists(int $uid): bool
    {
        return $this->recordExists('pages', $uid);
    }

    private function recordExists(string $table, int $uid): bool
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable($table);
        $queryBuilder->getRestrictions()->removeAll();
        return (bool)$queryBuilder
            ->count('uid')
            ->from($table)
            ->where(
                $queryBuilder->expr()->eq('uid', $queryBuilder->createNamedParameter($uid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT))
            )
            ->executeQuery()
            ->fetchOne();
    }

    private function translate(string $key): string
    {
        // Der Titel des Ordners entsteht in der Sprache des Backends, in der
        // er angelegt wird, und bleibt dann so stehen. Das ist richtig: es ist
        // ein Datensatz, keine Beschriftung.
        return $this->languageServiceFactory
            ->createFromUserPreferences($GLOBALS['BE_USER'] ?? null)
            ->sL(self::LANG . $key);
    }
}
