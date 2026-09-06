<?php

declare(strict_types=1);

namespace Phomo17\Roulette\DataProcessing;

use Phomo17\Roulette\WheelGeometry;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Rechnet die Drehwinkel des Rades vor.
 *
 * TypoScript:
 *
 *     dataProcessing {
 *         10 = roulette-wheel
 *         10.as = wheel
 *     }
 *
 * Ergebnis im Fluid-Template: {wheel} mit drei Listen.
 *
 *   wheel.pockets     38 Einträge: index, label, colour, angle, labelAngle
 *   wheel.frets       38 Einträge: angle — die Messingrillen ZWISCHEN den
 *                     Fächern, also jeweils an der Fachkante
 *   wheel.deflectors  8 Einträge: angle — die Rauten am inneren Rand der
 *                     Laufbahn (CONCEPT.md C.6.3)
 *
 * Alle Winkel in Grad, von zwölf Uhr im Uhrzeigersinn gemessen — genau die
 * Zählweise von SVG-transform="rotate(…)" und von CSS rotate().
 *
 * WARUM NUR WINKEL UND KEINE KOORDINATEN
 * ======================================
 * Die Zeichnung setzt jedes Fach als gedrehte Kopie EINES Segments ein
 * (<use transform="rotate(…)">). Damit braucht weder PHP noch JavaScript
 * jemals einen Sinus oder Kosinus — die Drehung macht der Zeichner selbst.
 * Das ist nicht nur kürzer, es ist auch der Grund, warum die Physik ohne
 * Winkelfunktionen auskommt (siehe wheel-physics.js).
 *
 * Der Processor liest KEINEN Datenbankwert: das Inhaltselement hat keine
 * Einstellung. Er ist eine reine Rechnung und hängt nur an Anhang F.
 */
final class WheelProcessor implements DataProcessorInterface
{
    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'wheel');

        $pocketCount = count(WheelGeometry::ORDER);
        $pocketStep = 360.0 / $pocketCount;

        $pockets = [];
        $frets = [];
        foreach (WheelGeometry::ORDER as $index => $label) {
            $pockets[] = [
                'index' => $index,
                'label' => $label,
                'colour' => WheelGeometry::colourOf($label),
                // Das Fach mit dem Zeiger k belegt den Winkelbereich
                // [k·Schritt, (k+1)·Schritt). Gedreht wird um seinen Anfang;
                // das Segment selbst ist ab zwölf Uhr gezeichnet.
                'angle' => round($index * $pocketStep, 6),
                // Die Fachzahl steht MITTIG im Fach: ein halber Fachschritt
                // hinter dem Fachanfang. Fluid kann in {…}-Ausdrücken nicht
                // rechnen (angle + pocketStep / 2 geht dort nicht), deshalb
                // liefert der Processor diesen vierten Wert bereits fertig.
                'labelAngle' => round($index * $pocketStep + $pocketStep / 2, 6),
            ];
            // Die Rille sitzt auf der Kante, also am Anfang des Fachs.
            $frets[] = ['angle' => round($index * $pocketStep, 6)];
        }

        $deflectorStep = 360.0 / WheelGeometry::DEFLECTOR_COUNT;
        $deflectors = [];
        for ($i = 0; $i < WheelGeometry::DEFLECTOR_COUNT; $i++) {
            $deflectors[] = ['angle' => round($i * $deflectorStep, 6)];
        }

        $processedData[$targetVariableName] = [
            'pocketCount' => $pocketCount,
            'pocketStep' => round($pocketStep, 6),
            'pockets' => $pockets,
            'frets' => $frets,
            'deflectors' => $deflectors,
        ];

        return $processedData;
    }
}
