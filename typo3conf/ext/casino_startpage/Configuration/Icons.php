<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Icon-Anmeldung dieser Extension.
 *
 * „content-casino-automat" ist das Icon der Gattung Automat, „content-casino-tisch"
 * das der Gattung Tisch (CONCEPT.md C.1 Nr. 1). Welches ein Gerät bekommt,
 * entscheidet Gattung::getIcon(). Sie erscheinen im Seitenmodul, im Assistenten
 * „Neues Inhaltselement" und in der Geräte-Auswahlliste.
 *
 * Beide SVG sind selbst gezeichnet — CONCEPT.md Teil A, Abschnitt 2, Regel 1
 * verbietet externe Assets.
 */
return [
    'content-casino-automat' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_startpage/Resources/Public/Icons/ContentCasinoAutomat.svg',
    ],
    'content-casino-tisch' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_startpage/Resources/Public/Icons/ContentCasinoTisch.svg',
    ],
];
