<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-fruit-risk" ist das Icon des gleichnamigen Inhaltselements. Es
 * erscheint im Seitenmodul und im Assistenten „Neues Inhaltselement". Das SVG
 * ist selbst gezeichnet — CONCEPT.md Teil A Abschnitt 2, harte Regel 1
 * verbietet Assets von außen.
 *
 * Resources/Public/Icons/Extension.svg braucht keine Anmeldung: TYPO3 sucht
 * das Symbol der Extension selbst unter genau diesem Pfad.
 */
return [
    'content-fruit-risk' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:fruit_risk/Resources/Public/Icons/ContentFruitRisk.svg',
    ],
];
