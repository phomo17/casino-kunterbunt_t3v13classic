<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Hook;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Service\AccountStorage;
use Phomo17\CasinoAccount\Service\BackendUserMirror;
use Phomo17\CasinoAccount\Service\PlayerTokenGenerator;
use Phomo17\CasinoAccount\Service\ShadowUserService;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;

/**
 * Alles, was beim Speichern eines Spielenden von selbst geschehen muss.
 *
 * VIER Hook-Einstiege des Kerns (nicht sechs, wie ein früherer Zahlenfehler
 * im Plantext behauptete — siehe DECISIONS.md 2026-09-09, Umsetzungsstück
 * Dc), jeder an seiner richtigen Stelle im Ablauf des DataHandlers:
 *
 *   processDatamap_postProcessFieldArray     Kennung erzeugen, Schatten-
 *                                             datensatz anlegen, „Guthaben"
 *                                             (balance_cash) in die Kasse
 *                                             buchen, is_admin ableiten
 *   processDatamap_afterDatabaseOperations   Rückverweis setzen; einen neuen
 *                                             Backend-Benutzer spiegeln;
 *                                             Namen des Schattendatensatzes
 *                                             nachziehen
 *   processCmdmap                            Kopieren verweigern
 *   processCmdmap_postProcess                Löschen/Zurückholen weitergeben
 *
 * WARUM EIN HOOK UND KEIN PSR-14-EREIGNIS: In TYPO3 13.4 löst DataHandler.php
 * genau EIN Ereignis aus, und das betrifft die Passwortregel (Zeile 1739).
 * Für „ein Datensatz wurde gespeichert" gibt es keines. Der Hook ist der
 * dokumentierte Weg — nachgesehen, nicht angenommen.
 *
 * DAS FELD „GUTHABEN" IST balance_cash SELBST (Umsetzungsstück Dc, siehe
 * DECISIONS.md 2026-09-09): das ursprünglich geplante virtuelle Feld
 * „balance" kann seit Umsetzungsstück Db keinen Wert mehr aus dem Formular
 * entgegennehmen (type => 'none' hat kein 'name'-Attribut). balance_cash
 * trägt seither die Beschriftung „Guthaben" und ist editierbar; ändert sich
 * sein Wert beim Speichern, bucht diese Klasse den ganzen Betrag in die Kasse
 * und setzt balance_machine sowie balance_win auf 0 — wörtlich CONCEPT.md
 * D.3.3, ohne eine vierte Geldspalte einzuführen (D.13 schließt das aus).
 */
final class PlayerDataHandlerHook
{
    private const PLAYER_TABLE = PlayerRepository::TABLE;
    private const LANG = 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:';

    public function __construct(
        private readonly PlayerTokenGenerator $tokens,
        private readonly ShadowUserService $shadowUsers,
        private readonly AccountStorage $storage,
        private readonly PlayerRepository $players,
        private readonly BackendUserMirror $mirror,
        private readonly FlashMessageService $flashMessageService,
    ) {}

    /**
     * Läuft, NACHDEM der DataHandler die Werte geprüft hat und BEVOR er sie
     * schreibt. Genau die richtige Stelle für Werte, die der Bearbeiter nicht
     * eingibt.
     *
     * @param array<string, mixed> $fieldArray  das, was gleich geschrieben wird
     * @param string $id  bei 'new' eine Platzhalter-Kennung („NEW…"), sonst die Nummer
     */
    public function processDatamap_postProcessFieldArray(
        string $status,
        string $table,
        string|int $id,
        array &$fieldArray,
        DataHandler $dataHandler
    ): void {
        if ($table !== self::PLAYER_TABLE) {
            return;
        }

        // 1. „Guthaben" ist balance_cash selbst. array_key_exists ist hier
        //    absichtlich gewählt: bei einem UPDATE entfernt der DataHandler
        //    unveränderte Felder vorher aus $fieldArray
        //    (compareFieldArrayWithCurrentAndUnset()) — dieser Zweig läuft
        //    deshalb nur, wenn der Bearbeiter das Guthaben TATSÄCHLICH
        //    geändert hat, nie beim bloßen erneuten Abspeichern eines
        //    unveränderten Formulars.
        if (array_key_exists('balance_cash', $fieldArray)) {
            $fieldArray['balance_cash'] = max(0, (int)$fieldArray['balance_cash']);
            $fieldArray['balance_machine'] = 0;
            $fieldArray['balance_win'] = 0;

            // Wer gerade spielt, verliert damit sein Geld aus dem Gerät. Das
            // wird laut D.3.3 deutlich gesagt, aber NICHT verhindert.
            if ($status === 'update') {
                $player = $this->players->findByUid((int)$id);
                if ($player !== null && $player->isOnline((int)($GLOBALS['EXEC_TIME'] ?? time()))) {
                    $this->warnAboutOnlinePlayer($player->name);
                }
            }
        }

        // 2. is_admin ist abgeleitet, nie eingegeben: wer aus einem
        //    Backend-Benutzer gespiegelt wurde, darf sein Guthaben selbst
        //    setzen (CONCEPT.md D.7.3).
        if (array_key_exists('be_user', $fieldArray)) {
            $fieldArray['is_admin'] = (int)$fieldArray['be_user'] > 0 ? 1 : 0;
        }

        if ($status !== 'new') {
            return;
        }

        // 3. Die Kennung. Einmal vergeben, nie wieder geändert (D.4.2).
        //    Ein von außen mitgeschickter Wert wird überschrieben — die
        //    Kennung ist nichts, was jemand mitbringen darf.
        $fieldArray['token'] = $this->tokens->generate();

        // 4. Der Schattendatensatz (D.6.2).
        $storagePid = $this->storage->ensure();
        $fieldArray['fe_user'] = $this->shadowUsers->createFor(
            (string)($fieldArray['name'] ?? ''),
            $storagePid
        );
    }

    /**
     * Läuft, NACHDEM geschrieben wurde. Erst hier ist die Nummer eines neuen
     * Datensatzes bekannt.
     *
     * @param array<string, mixed> $fieldArray
     */
    public function processDatamap_afterDatabaseOperations(
        string $status,
        string $table,
        string|int $id,
        array &$fieldArray,
        DataHandler $dataHandler
    ): void {
        // Ein neuer Backend-Benutzer bekommt seinen Spielenden-Eintrag
        // (CONCEPT.md D.7.3, „danach bei jedem neu angelegten
        // Backend-Benutzer"). Auch der Kommandozeilenbefehl
        // backend:user:create läuft über den DataHandler und wird deshalb
        // hier mit erfasst.
        if ($table === 'be_users' && $status === 'new') {
            $uid = (int)($dataHandler->substNEWwithIDs[$id] ?? $id);
            $this->mirror->mirrorOne($uid);
            return;
        }

        if ($table !== self::PLAYER_TABLE) {
            return;
        }

        $uid = (int)($dataHandler->substNEWwithIDs[$id] ?? $id);
        if ($uid <= 0) {
            return;
        }

        if ($status === 'new') {
            // Der Rückverweis vom Schattendatensatz auf den Spielenden und
            // sein endgültiger Benutzername.
            $this->shadowUsers->linkBack((int)($fieldArray['fe_user'] ?? 0), $uid);
            return;
        }

        // Umbenannt? Dann zieht der Schattendatensatz nach.
        if (array_key_exists('name', $fieldArray)) {
            $player = $this->players->findByUid($uid);
            if ($player !== null) {
                $this->shadowUsers->rename($player->feUser, $player->name);
            }
        }
    }

    /**
     * Verweigert das Kopieren eines Spielenden, BEVOR der Kern es ausführt.
     *
     * Warum: der Kopiervorgang schreibt die neue Zeile unmittelbar, ohne
     * processDatamap_postProcessFieldArray zu durchlaufen
     * (DataHandler::copyRecord() ruft insertDB() direkt auf). Die Kopie trüge
     * dieselbe Kennung; der eindeutige Datenbankschlüssel wiese sie ab und der
     * Bearbeiter bekäme einen rohen Datenbankfehler zu sehen. Eine
     * verständliche Absage ist besser.
     *
     * $commandIsProcessed MUSS als Referenz deklariert werden — der Kern
     * fragt danach, ob ein Hook den Befehl schon erledigt hat
     * (DataHandler.php:3344-3350).
     */
    public function processCmdmap(
        string $command,
        string $table,
        string|int $id,
        mixed $value,
        bool &$commandIsProcessed,
        DataHandler $dataHandler,
        mixed $pasteUpdate
    ): void {
        if ($table !== self::PLAYER_TABLE) {
            return;
        }
        if ($command !== 'copy' && $command !== 'localize' && $command !== 'copyToLanguage') {
            return;
        }
        $commandIsProcessed = true;
        $this->flash('message.noCopy', ContextualFeedbackSeverity::ERROR);
    }

    /**
     * Löschen und Zurückholen gibt der Spielende an seinen Schattendatensatz
     * weiter (CONCEPT.md D.6.2: „Er wird zusammen mit dem Spielenden angelegt,
     * umbenannt und gelöscht.").
     */
    public function processCmdmap_postProcess(
        string $command,
        string $table,
        string|int $id,
        mixed $value,
        DataHandler $dataHandler,
        mixed $pasteUpdate,
        mixed $pasteDatamap
    ): void {
        if ($table !== self::PLAYER_TABLE) {
            return;
        }
        $feUserUid = $this->shadowUsers->findByPlayer((int)$id);
        if ($feUserUid <= 0) {
            return;
        }
        if ($command === 'delete') {
            $this->shadowUsers->delete($feUserUid);
        } elseif ($command === 'undelete') {
            $this->shadowUsers->undelete($feUserUid);
        }
    }

    private function warnAboutOnlinePlayer(string $name): void
    {
        $this->flash('message.balanceWhileOnline', ContextualFeedbackSeverity::WARNING, [$name]);
    }

    /**
     * Wortgleiche Bauart zu PlayerModuleController::flash()/translate(). Die
     * Verdopplung ist in Kauf genommen: eine gemeinsame Basisklasse für zwei
     * Aufrufer wäre mehr Bauwerk als Nutzen, und Vererbung zwischen einem
     * Controller und einem Hook wäre eine falsche Verwandtschaft.
     */
    private function flash(string $key, ContextualFeedbackSeverity $severity, array $arguments = []): void
    {
        $text = $this->translate($key);
        if ($arguments !== []) {
            $text = vsprintf($text, $arguments);
        }
        $this->flashMessageService
            ->getMessageQueueByIdentifier()
            ->enqueue(new FlashMessage(
                $text,
                $this->translate($key . '.title'),
                $severity,
                true
            ));
    }

    private function translate(string $key): string
    {
        return $this->getLanguageService()->sL(self::LANG . $key);
    }

    private function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }
}
