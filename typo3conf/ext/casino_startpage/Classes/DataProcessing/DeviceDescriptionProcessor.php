<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\DataProcessing;

use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Generischer Baustein: „Beschreibe die Seite, auf der du gerade stehst."
 *
 * casino_startpage kennt kein einziges Gerät (README.md, Grundsatz 2). Diese
 * Klasse löst trotzdem Auditbefund G-02 (fehlende <meta name="description">)
 * und einen Teil von G-01 (fehlender Eintrag „was ist dieses Gerät") — indem
 * sie NICHTS über ein Gerät weiß, sondern nur drei Werte entgegennimmt, die
 * IHR über TypoScript mitgegeben werden: title, description, optional gattung.
 *
 * Jede Geräte-Extension hängt diesen Prozessor an die dataProcessing-Kette
 * IHRES EIGENEN Inhaltselements — genau dort, wo sie ohnehin schon ihren
 * eigenen Automaten/Tisch rendert. Dadurch läuft er nur auf der Seite, auf
 * der das jeweilige Gerät tatsächlich steht (Content-Element-Rendering
 * findet nur auf DIESER einen Seite statt), nicht global. So bekommt jede
 * Geräteseite ihre eigene Beschreibung, ohne dass casino_startpage je
 * erführe, welches Gerät sie ihm geliefert hat.
 *
 * Beispiel (in der ext_localconf.php einer Geräte-Extension):
 *
 *     tt_content.mein_automat.dataProcessing {
 *         10 = mein-automat-machine
 *         10.as = machine
 *         20 = casino-device-description
 *         20.title.data = lll:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.title
 *         20.description.data = lll:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.description
 *     }
 *
 * WARUM PageRenderer UND NICHT page.meta.description
 * ===================================================
 * page.meta.description ist eine GLOBALE TypoScript-Konstante — sie würde,
 * einmal von einer Geräte-Extension gesetzt, auf JEDER Seite der
 * Installation gelten, nicht nur auf der eigenen. Diese Klasse ruft
 * PageRenderer::setMetaTag() dagegen zur LAUFZEIT auf, und zwar nur dann,
 * wenn das eigene Inhaltselement tatsächlich gerendert wird — das ist die
 * Stelle, an der "nur auf meiner Seite" tatsächlich wahr ist.
 *
 * WARUM „Game" ALS SCHEMA.ORG-TYP
 * ===============================
 * schema.org kennt keinen eigenen Typ für einen Spielautomaten oder einen
 * Spieltisch. „Game" passt auf beide Gattungen gleichermaßen und ist ein
 * echter, in schema.org existierender Typ — kein erfundener.
 */
final class DeviceDescriptionProcessor implements DataProcessorInterface
{
    public function __construct(private readonly PageRenderer $pageRenderer) {}

    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $title = trim((string)$cObj->stdWrapValue('title', $processorConfiguration));
        $description = trim((string)$cObj->stdWrapValue('description', $processorConfiguration));
        $gattung = trim((string)$cObj->stdWrapValue('gattung', $processorConfiguration, 'automat'));

        if ($description === '') {
            // Ohne Text lieber schweigen als eine leere <meta> ausliefern.
            return $processedData;
        }

        $this->pageRenderer->setMetaTag('name', 'description', $description);

        if ($title !== '') {
            $schema = [
                '@context' => 'https://schema.org',
                '@type' => 'Game',
                'name' => $title,
                'description' => $description,
                'genre' => $gattung === 'tisch' ? 'Tischspiel' : 'Automatenspiel',
                'url' => (string)$cObj->getRequest()->getUri(),
            ];
            $this->pageRenderer->addHeaderData(
                '<script type="application/ld+json">'
                . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)
                . '</script>'
            );
        }

        return $processedData;
    }
}
