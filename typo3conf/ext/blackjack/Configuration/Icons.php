<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-blackjack" ist das Icon des gleichnamigen Inhaltselements. Es
 * erscheint im Seitenmodul und im Assistenten „Neues Inhaltselement". Das SVG
 * ist selbst gezeichnet — CONCEPT.md Abschnitt 2 verbietet externe Assets.
 */
return [
    'content-blackjack' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:blackjack/Resources/Public/Icons/ContentBlackjack.svg',
    ],
];
