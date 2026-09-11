<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Lobby',
    'description' => 'Das Lobby-System für das Spaß-Casino Casino Kunterbunt: mehrere Personen sitzen an einem Tisch, sehen einander, teilen eine Setzuhr und dieselbe Saat, damit alle dieselbe Kugel, dieselben Würfel und dieselben Karten erleben. Höchstens vier Tische je Spiel, acht Plätze bei Roulette und Craps, fünf bei Blackjack. Ohne eingeschalteten QR-Modus ist die Lobby vollständig unsichtbar.',
    'category' => 'fe',
    'author' => 'Phomo17',
    'author_email' => 'phomo17@users.noreply.github.com',
    'license' => 'AGPL-3.0-or-later',
    'state' => 'alpha',
    'version' => '0.5.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'frontend' => '13.4.0-13.4.99',
            'fluid' => '13.4.0-13.4.99',
            'casino_startpage' => '0.5.0-0.99.99',
            'casino_account' => '0.5.0-0.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\CasinoLobby\\' => 'Classes/',
        ],
    ],
];
