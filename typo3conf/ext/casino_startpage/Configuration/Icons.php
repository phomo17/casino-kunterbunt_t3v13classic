<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-casino-automat" ist das Icon des Inhaltselements „Casino-Automat".
 * Es erscheint im Seitenmodul, im Assistenten „Neues Inhaltselement" und in der
 * Automaten-Auswahlliste. Das SVG ist selbst gezeichnet — CONCEPT.md verbietet
 * externe Assets.
 */
return [
    'content-casino-automat' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_startpage/Resources/Public/Icons/ContentCasinoAutomat.svg',
    ],
];
