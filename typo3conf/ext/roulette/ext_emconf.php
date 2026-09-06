<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Roulette',
    'description' => 'Amerikanisches Roulette mit doppelter Null für das Spaß-Casino Casino Kunterbunt: 38 Fächer, Mahagoni-Ring, Messingrillen, echte Kugelphysik mit festen Zeitschritten. Das Ergebnis entsteht aus der Simulation und wird nicht gezogen. Meldet sich als Spieltisch bei der Geräte-Registry von casino_startpage an.',
    'category' => 'plugin',
    'author' => 'Phomo17',
    'author_email' => 'phomo17@users.noreply.github.com',
    'license' => 'AGPL-3.0-or-later',
    'state' => 'alpha',
    'version' => '0.2.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'frontend' => '13.4.0-13.4.99',
            'fluid' => '13.4.0-13.4.99',
            'casino_startpage' => '0.2.0-0.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\Roulette\\' => 'Classes/',
        ],
    ],
];
