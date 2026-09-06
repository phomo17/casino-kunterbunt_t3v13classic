<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CasinoStartpage\Automat\Gattung;
use Phomo17\CasinoStartpage\Automat\Mustertisch;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Diese Datei läuft bei JEDEM nicht gecachten Request und bleibt deshalb so
 * knapp wie möglich. Bis Ausbaustufe 2 war sie ganz leer; seit Phase C1 stehen
 * hier die zwei Anmeldungen des Mustertisches — wortgleich zu dem, was jede
 * Geräte-Extension in ihrer eigenen ext_localconf.php tut.
 *
 * Was hier weiterhin NICHT hingehört: alles, was TYPO3 von sich aus lazy
 * einliest und zwischenspeichert — TCA, Site Sets, Icons, Backend-Module. Das
 * steht unter Configuration/.
 *
 * Die Registry selbst braucht hier nach wie vor keine Vorbereitung: sie ist
 * statisch und füllt sich aus den ext_localconf.php-Dateien der
 * Geräte-Extensions. Die laufen später als diese, weil sie von
 * casino_startpage abhängen.
 */

/*
 * 1. Anmeldung des Mustertisches bei der Geräte-Registry.
 *
 * Der Beispieltisch aus CONCEPT.md C.9 — siehe den ausführlichen Kommentar in
 * Classes/Automat/Mustertisch.php zur Frage, warum er hier und nicht in einer
 * eigenen Extension liegt.
 *
 * Nebenwirkung von register(): das Verzeichnis Resources/Private/Partials/
 * dieser Extension wird an tt_content.casino_automat.partialRootPaths
 * angehängt. Es ist das erste angehängte Verzeichnis (Index 100); die
 * Geräte-Extensions zählen danach weiter. Ihre Verzeichnisse werden dadurch
 * NICHT verdrängt — publishCabinetPartialRootPath() vergibt für jedes einen
 * eigenen Index.
 */
AutomatRegistry::register(new Automat(
    identifier: Mustertisch::IDENTIFIER,
    title: Mustertisch::LANG_FRONTEND . 'mustertisch.title',
    description: Mustertisch::LANG_FRONTEND . 'mustertisch.description',
    extensionKey: Mustertisch::EXTENSION_KEY,
    cabinetPartial: Mustertisch::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));

/*
 * 2. Rendering des Inhaltselements „Mustertisch".
 *
 * Bewusst hier und nicht im Site Set: ein Tisch soll sich genauso anmelden wie
 * eine fremde Geräte-Extension, und die kann das Site Set nicht anfassen
 * (CONCEPT.md Abschnitt 5.1). Dass der Mustertisch im Site Package liegt,
 * ändert daran nichts — er wäre sonst ein Beispiel, dem man nicht folgen kann.
 *
 * dataProcessing seit dem GEO-Behebungslauf (Auditbericht 2026-09-05,
 * Befunde G-01/G-02): derselbe generische Baustein
 * DeviceDescriptionProcessor, den jede Geräte-Extension an ihr eigenes
 * Inhaltselement hängt (siehe casino_startpage/README.md). Der Mustertisch
 * meldet sich hier wortgleich an — auch das ist Teil des Nachweises, dass
 * der Vertrag vollständig ist (Classes/Automat/Mustertisch.php).
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = CasinoTischMuster
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/PageView/Partials/
    dataProcessing {
        10 = casino-device-description
        10.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:mustertisch.title
        10.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:mustertisch.description
        10.gattung = tisch
    }
}',
    Mustertisch::CTYPE,
    Mustertisch::EXTENSION_KEY
));
