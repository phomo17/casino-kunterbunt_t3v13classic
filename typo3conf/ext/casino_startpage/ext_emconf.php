<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Startseite',
    'description' => 'Site Package für das Spaß-Casino Casino Kunterbunt: Vegas-Saal als Startseite, gemeinsame Design-Tokens, geteilte Bausteine (Guthaben, Klang, Risiko-Leiter) und die Grundlage aller Automaten-Extensions.',
    'category' => 'templates',
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
            'fluid_styled_content' => '13.4.0-13.4.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\CasinoStartpage\\' => 'Classes/',
        ],
    ],
];
