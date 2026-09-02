<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Backend\FormEngine;

use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;

/**
 * Füllt das Auswahlfeld „Automat" des Inhaltselements aus der Registry.
 *
 * Eingehängt in der TCA über
 *   'itemsProcFunc' => AutomatItemsProvider::class . '->addAutomatItems'
 *
 * TYPO3 erzeugt die Klasse dabei mit GeneralUtility::makeInstance()
 * (AbstractItemProvider::resolveItemProcessorFunction -> GeneralUtility::callUserFunction).
 * Deshalb muss sie entweder ohne Argumente konstruierbar oder ein öffentlicher
 * Dienst sein — #[Autoconfigure(public: true)] stellt Letzteres sicher, genau
 * wie im Core bei TcaItemsProcessorFunctions.
 *
 * $params['items'] enthält beim Aufruf bereits SelectItem-Objekte; angehängte
 * assoziative Arrays wandelt TYPO3 danach selbst wieder in SelectItem um.
 * Numerisch indizierte Item-Arrays sind seit TYPO3 12.3 veraltet.
 *
 * Sind keine Automaten angemeldet, wird nichts angehängt. Das Feld zeigt dann
 * nur den in der TCA fest hinterlegten Leer-Eintrag — keine Fehlermeldung.
 */
#[Autoconfigure(public: true)]
final class AutomatItemsProvider
{
    public function addAutomatItems(array &$fieldDefinition): void
    {
        foreach (AutomatRegistry::all() as $automat) {
            $fieldDefinition['items'][] = [
                'label' => $automat->title,
                'value' => $automat->identifier,
                'description' => $automat->description,
                'icon' => 'content-casino-automat',
            ];
        }
    }
}
