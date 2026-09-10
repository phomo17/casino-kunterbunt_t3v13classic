<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Craps',
    'description' => 'Craps als eigenständiger Spieltisch für das Spaß-Casino Casino Kunterbunt: eine Wanne mit hohen Banden und Pyramidengummi, zwei selbst gezeichnete Würfel und ein Ergebnis, das ausschließlich aus der Simulation entsteht. Geworfen wird mit der Maus, dem Finger oder der Tastatur; ein Wurf, der die gegenüberliegende Bande nicht erreicht, zählt nicht. Meldet sich als Spieltisch bei der Geräte-Registry von casino_startpage an.',
    'category' => 'plugin',
    'author' => 'Phomo17',
    'author_email' => 'phomo17@users.noreply.github.com',
    'license' => 'AGPL-3.0-or-later',
    'state' => 'alpha',
    'version' => '0.4.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'frontend' => '13.4.0-13.4.99',
            'fluid' => '13.4.0-13.4.99',
            'casino_startpage' => '0.4.0-0.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\Craps\\' => 'Classes/',
        ],
    ],
];
