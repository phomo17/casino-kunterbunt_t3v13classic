<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Blackjack',
    'description' => 'Blackjack als eigenständiger Spieltisch für das Spaß-Casino Casino Kunterbunt: Kartenschlitten, gleichverteiltes Mischen aus sicherem Zufall, ein Geber, der nie von seiner Hausregel abweicht, und ein Mischzeitpunkt, den das Haus nach einem mitlaufenden Zähler bestimmt. Meldet sich als Spieltisch bei der Geräte-Registry von casino_startpage an.',
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
            'Phomo17\\Blackjack\\' => 'Classes/',
        ],
    ],
];
