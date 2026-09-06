<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\DataProcessing;

use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CasinoStartpage\Automat\Gattung;
use TYPO3\CMS\Core\Domain\Repository\PageRepository;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Trägt die Kennwerte der SEITE SELBST nach — nicht die eines Geräts.
 *
 * Läuft über page.10.dataProcessing, also auf JEDER der sieben Seiten, und
 * liefert drei Dinge, die eine Antwortmaschine unabhängig vom aufgerufenen
 * Gerät braucht (Auditbericht 2026-09-05, Befund G-01):
 *
 *   1. Organization  — wer betreibt diese Seite.
 *   2. WebSite        — was ist diese Seite als Ganzes, mit einer
 *                        Beschreibung, die aus der Automaten-Registry
 *                        GEZÄHLT wird (wie viele Automaten, wie viele
 *                        Tische), nie aus einer eingetragenen Zahl. Meldet
 *                        sich ein Gerät ab, sinkt die Zahl von selbst; ein
 *                        fünftes Gerät erhöht sie von selbst.
 *   3. BreadcrumbList — der Weg von der Wurzelseite (dem Saal) zur
 *                        aktuellen Seite. Bei genau zwei Ebenen (Saal, dann
 *                        eine Geräteseite) genügt Position 1 und 2; auf dem
 *                        Saal selbst besteht der Pfad nur aus Position 1.
 *
 * Auf der Wurzelseite setzt diese Klasse zusätzlich die
 * <meta name="description"> der Seite (Befund G-02) — mit demselben Text wie
 * WebSite.description. Auf jeder anderen Seite tut sie das NICHT: die
 * Beschreibung einer Geräteseite ist Sache des Geräts selbst, siehe
 * {@see DeviceDescriptionProcessor}.
 *
 * KEIN GERÄT WIRD HIER GENANNT. AutomatRegistry::all() liefert nur Zahlen je
 * Gattung (Gattung::Automat, Gattung::Tisch) — niemals einen Bezeichner, einen
 * Namen oder einen Pfad. Das erfüllt Prüfung G-9 in verify-gattung.mjs
 * genauso wie jede andere Datei dieser Extension.
 */
final class SiteJsonLdProcessor implements DataProcessorInterface
{
    /**
     * Name des Hauses. Keine Geräte-Kenntnis: dies ist der Name der Seite
     * selbst, wortgleich zu websiteTitle in
     * typo3conf/sites/casino-kunterbunt/config.yaml und zur Überschrift des
     * Leuchtschilds (Hall/Sign.html).
     */
    private const SITE_NAME = 'Casino Kunterbunt';

    public function __construct(
        private readonly PageRenderer $pageRenderer,
        private readonly PageRepository $pageRepository,
    ) {}

    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $request = $cObj->getRequest();
        $site = $request->getAttribute('site');
        if (!$site instanceof Site) {
            // Kein Site-Kontext (z. B. ein Test-Rendering ohne Routing) —
            // ohne eine Site keine absolute URL, also lieber nichts ausgeben
            // als eine falsche.
            return $processedData;
        }

        $siteUrl = rtrim((string)$site->getBase(), '/') . '/';
        $currentUrl = (string)$request->getUri();
        $rootPageId = $site->getRootPageId();
        $currentPageId = (int)($cObj->data['uid'] ?? 0);
        $isRootPage = $currentPageId === $rootPageId;

        $description = $this->buildSiteDescription();

        if ($isRootPage) {
            $this->pageRenderer->setMetaTag('name', 'description', $description);
        }

        $this->pageRenderer->addHeaderData($this->scriptTag([
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            '@id' => $siteUrl . '#organization',
            'name' => self::SITE_NAME,
            'url' => $siteUrl,
        ]));

        $this->pageRenderer->addHeaderData($this->scriptTag([
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            '@id' => $siteUrl . '#website',
            'name' => self::SITE_NAME,
            'description' => $description,
            'url' => $siteUrl,
            'publisher' => ['@id' => $siteUrl . '#organization'],
            'inLanguage' => 'de-DE',
        ]));

        $this->pageRenderer->addHeaderData($this->scriptTag(
            $this->buildBreadcrumb($cObj, $isRootPage, $rootPageId, $siteUrl, $currentUrl)
        ));

        return $processedData;
    }

    /**
     * Zählt die angemeldeten Geräte nach Gattung — GEZÄHLT, nicht benannt.
     * Ein Gerät ohne bekannte Gattung kann laut {@see Gattung} nicht
     * vorkommen (der Konstruktor von Automat verlangt einen Enum-Wert).
     */
    private function buildSiteDescription(): string
    {
        $counts = [Gattung::Automat->value => 0, Gattung::Tisch->value => 0];
        foreach (AutomatRegistry::all() as $automat) {
            $counts[$automat->gattung->value] = ($counts[$automat->gattung->value] ?? 0) + 1;
        }

        return sprintf(
            'Ein Spaß-Casino ohne echtes Geld: %d Spielautomaten und %d Tische, '
            . 'jedes Gerät mit eigenen Regeln. Gespielt wird mit Spielgeld, ohne '
            . 'Anmeldung und ohne echten Einsatz.',
            $counts[Gattung::Automat->value],
            $counts[Gattung::Tisch->value]
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildBreadcrumb(
        ContentObjectRenderer $cObj,
        bool $isRootPage,
        int $rootPageId,
        string $siteUrl,
        string $currentUrl
    ): array {
        // Auf der Wurzelseite selbst liegt der Datensatz schon in $cObj->data;
        // auf jeder anderen Seite wird die Wurzelseite eigens nachgeschlagen,
        // um ihren Titel für Position 1 zu kennen. PageRepository::getPage()
        // ist ein lesender Kern-Aufruf mit den üblichen Sichtbarkeits-Regeln.
        $rootPageRecord = $isRootPage ? $cObj->data : $this->pageRepository->getPage($rootPageId);

        $items = [
            [
                '@type' => 'ListItem',
                'position' => 1,
                'name' => (string)($rootPageRecord['title'] ?? self::SITE_NAME),
                'item' => $siteUrl,
            ],
        ];

        if (!$isRootPage) {
            $items[] = [
                '@type' => 'ListItem',
                'position' => 2,
                'name' => (string)($cObj->data['title'] ?? ''),
                'item' => $currentUrl,
            ];
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => $items,
        ];
    }

    /**
     * @param array<string, mixed> $schema
     */
    private function scriptTag(array $schema): string
    {
        return '<script type="application/ld+json">'
            . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)
            . '</script>';
    }
}
