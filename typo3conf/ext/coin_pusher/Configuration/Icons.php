<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-coin-pusher" ist das Icon des gleichnamigen Inhaltselements. Es
 * erscheint im Seitenmodul und im Assistenten „Neues Inhaltselement". Das SVG
 * ist selbst gezeichnet — CONCEPT.md Abschnitt 2 verbietet externe Assets.
 */
return [
    'content-coin-pusher' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:coin_pusher/Resources/Public/Icons/ContentCoinPusher.svg',
    ],
];
