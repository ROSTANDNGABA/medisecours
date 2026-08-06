<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ProtocoleEtape;
use App\Entity\ProtocolePremiersGestes;

/** Serialisation publique minimale, sans donnees administratives internes. */
final class FirstAidProtocolPublicSerializer
{
    /**
     * @return array<string, mixed>
     */
    public function serialize(ProtocolePremiersGestes $protocol): array
    {
        return [
            'slug' => $protocol->getSlug(),
            'titre' => $protocol->getTitre(),
            'categorie' => $protocol->getCategorie(),
            'masterSlug' => $protocol->getMasterSlug(),
            'variantKey' => $protocol->getVariantKey(),
            'niveauUrgence' => $protocol->getNiveauUrgence(),
            'population' => $protocol->getPopulation(),
            'version' => $protocol->getVersion(),
            'sourceClinique' => $protocol->getSourceClinique(),
            'restrictionsPopulations' => $protocol->getRestrictionsPopulations(),
            'etapes' => array_map(
                static fn (ProtocoleEtape $step): array => [
                    'position' => $step->getPosition(),
                    'type' => $step->getType(),
                    'titre' => $step->getTitre(),
                    'instruction' => $step->getInstruction(),
                ],
                $protocol->getEtapes()->toArray()
            ),
        ];
    }

    /**
     * @param ProtocolePremiersGestes[] $protocols
     * @return array<int, array<string, mixed>>
     */
    public function serializeMany(array $protocols): array
    {
        return array_map(fn (ProtocolePremiersGestes $protocol): array => $this->serialize($protocol), $protocols);
    }
}
