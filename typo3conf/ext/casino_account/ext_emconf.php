<?php

declare(strict_types=1);

$EM_CONF[$_EXTKEY] = [
    'title' => 'Casino Kunterbunt – Konten und QR-Codes',
    'description' => 'Konten der Spielenden für das Spaß-Casino Casino Kunterbunt: ein eigener Backend-Reiter „Casino" mit dem Modul „Spielende", eine einmalige Kennung je Person, ihr persönlicher QR-Code zum Ansehen, Herunterladen und Ausdrucken, unsichtbare Schattendatensätze in fe_users für die spätere Anmeldung und der Abgleich aller Backend-Benutzer mit einem Startguthaben.',
    'category' => 'module',
    'author' => 'Phomo17',
    'author_email' => 'phomo17@users.noreply.github.com',
    'license' => 'AGPL-3.0-or-later',
    'state' => 'alpha',
    'version' => '0.5.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'backend' => '13.4.0-13.4.99',
            'frontend' => '13.4.0-13.4.99',
            'fluid' => '13.4.0-13.4.99',
            'casino_startpage' => '0.5.0-0.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'Phomo17\\CasinoAccount\\' => 'Classes/',
        ],
    ],
];
