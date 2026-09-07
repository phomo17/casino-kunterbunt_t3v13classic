<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-craps" ist das Icon des gleichnamigen Inhaltselements. Es
 * erscheint im Seitenmodul und im Assistenten „Neues Inhaltselement". Das SVG
 * ist selbst gezeichnet — CONCEPT.md Abschnitt 2 verbietet externe Assets.
 */
return [
    'content-craps' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:craps/Resources/Public/Icons/ContentCraps.svg',
    ],
];
