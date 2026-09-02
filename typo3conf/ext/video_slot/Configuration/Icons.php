<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-video-slot" ist das Icon des gleichnamigen Inhaltselements. Es
 * erscheint im Seitenmodul und im Assistenten „Neues Inhaltselement". Das SVG
 * ist selbst gezeichnet — CONCEPT.md Abschnitt 2 verbietet externe Assets.
 */
return [
    'content-video-slot' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:video_slot/Resources/Public/Icons/ContentVideoSlot.svg',
    ],
];
