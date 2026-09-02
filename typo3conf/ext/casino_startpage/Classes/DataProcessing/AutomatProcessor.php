<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\DataProcessing;

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Löst den im Backend gewählten Automaten-Schlüssel in seinen Registry-Eintrag auf.
 *
 * TypoScript:
 *
 *     dataProcessing {
 *         10 = casino-automat
 *         10.as = automat
 *     }
 *
 * Ergebnis im Fluid-Template: {automat} — entweder ein Automat-Objekt oder NULL.
 *
 * NULL bedeutet: kein Automat gewählt, oder der gewählte Automat ist nicht
 * (mehr) installiert. Das Template gibt dann nichts aus. Genau so verlangt es
 * CONCEPT.md Phase 2: ein ungültiger oder gelöschter Schlüssel bricht das
 * Frontend nicht, sondern wird stillschweigend übersprungen. Deshalb wird hier
 * bewusst nichts geloggt und nichts geworfen.
 *
 * Optionen:
 *   as        Name der Template-Variablen. Vorgabe „automat".
 *   fieldName Spalte mit dem Schlüssel. Vorgabe tx_casinostartpage_automat.
 */
final class AutomatProcessor implements DataProcessorInterface
{
    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'automat');
        $fieldName = (string)$cObj->stdWrapValue(
            'fieldName',
            $processorConfiguration,
            AutomatContentElement::FIELD_AUTOMAT
        );

        $identifier = trim((string)($cObj->data[$fieldName] ?? ''));

        $processedData[$targetVariableName] = $identifier === ''
            ? null
            : AutomatRegistry::get($identifier);

        return $processedData;
    }
}
