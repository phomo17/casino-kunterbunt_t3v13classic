<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\EventListener;

use Phomo17\CasinoAccount\Service\AccountStorage;
use Phomo17\CasinoAccount\Service\BackendUserMirror;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Package\Event\AfterPackageActivationEvent;

/**
 * Der erste Abgleich beim Aktivieren der Extension (CONCEPT.md D.7.3:
 * „Der Abgleich läuft beim Aktivieren der Extension einmal über alle
 * vorhandenen").
 *
 * Das ist die Kür, nicht die Pflicht: der verlässliche Abgleich läuft bei
 * jedem Aufruf des Moduls (PlayerModuleController). Hier geschieht er einmal
 * früher, damit die Liste beim allerersten Öffnen bereits gefüllt ist.
 *
 * Es wird ausdrücklich NICHT geprüft, ob der Abgleich erfolgreich war. Beim
 * Aktivieren über die Kommandozeile gibt es unter Umständen keinen
 * angemeldeten Backend-Benutzer, und ohne ihn kann der DataHandler nichts
 * anlegen. Das ist kein Fehler, sondern der erwartete Fall — deshalb schluckt
 * diese Klasse jeden Fehlschlag und verlässt sich auf das Sicherheitsnetz im
 * Modul. Ein Abbruch würde hier das Aktivieren der Extension verhindern, und
 * das wäre unverhältnismäßig.
 */
final readonly class ActivateExtension
{
    public function __construct(
        private AccountStorage $storage,
        private BackendUserMirror $mirror,
    ) {}

    #[AsEventListener(identifier: 'casino-account/activate')]
    public function __invoke(AfterPackageActivationEvent $event): void
    {
        if ($event->getPackageKey() !== 'casino_account') {
            return;
        }
        try {
            $storagePid = $this->storage->ensure();
            if ($storagePid > 0) {
                $this->mirror->syncAll($storagePid);
            }
        } catch (\Throwable) {
            // Bewusst still — siehe Kopfkommentar. Das Modul holt es nach.
        }
    }
}
