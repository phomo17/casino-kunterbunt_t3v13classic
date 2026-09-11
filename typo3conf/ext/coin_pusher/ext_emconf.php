<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Coin Pusher',
    'description' => 'Münzschieber für das Spaß-Casino Casino Kunterbunt: ein Feld voller Münzen, eine Schubplatte, eine Abwurfkante und zwei seitliche Verlustschächte. Selbst geschriebene 2D-Physik mit fester Zeitschrittweite, wiederholbarem Ablauf und gemessener Auszahlungsquote.',
    'category' => 'plugin',
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
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\CoinPusher\\' => 'Classes/',
        ],
    ],
];
