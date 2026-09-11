<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

/**
 * Symbol-Anmeldung dieser Extension.
 *
 * Beide SVG sind selbst gezeichnet — CONCEPT.md Teil A, Abschnitt 2, Regel 1
 * verbietet externe Dateien, und D.2 verlangt für die Gruppe ausdrücklich ein
 * eigenes Symbol statt eines fremden Symbolpakets.
 *
 * Für die QR-SCHALTFLÄCHE in der Liste wird KEIN eigenes Symbol angemeldet:
 * der Kern bringt „actions-qrcode" mit
 * (typo3/sysext/core/Resources/Public/Icons/T3Icons/svgs/actions/actions-qrcode.svg,
 * registriert in derselben icons.json). D.3.4 verlangt „ein allgemeines
 * QR-Symbol" — genau das ist es. Ein selbst gezeichnetes zweites QR-Symbol
 * daneben wäre doppelte Arbeit ohne Gewinn, und der Kern ist kein „fremdes
 * Symbolpaket" im Sinn von D.2, sondern die Grundlage, auf der alles hier
 * steht.
 */
return [
    'modulegroup-casino' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_account/Resources/Public/Icons/ModuleGroupCasino.svg',
    ],
    'module-casino-players' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_account/Resources/Public/Icons/ModulePlayers.svg',
    ],
    'module-casino-qrmode' => [
        'provider' => SvgIconProvider::class,
        'source' => 'EXT:casino_account/Resources/Public/Icons/ModuleQrMode.svg',
    ],
];
