<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Avis;
use App\Entity\Medecin;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Avis>
 */
class AvisRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Avis::class);
    }

    /**
     * Calcule la note moyenne d'un médecin (utilisée pour afficher ★★★★☆).
     */
    public function getNoteMoyenne(Medecin $medecin): float
    {
        $result = $this->createQueryBuilder('a')
            ->select('AVG(a.note) as moyenne')
            ->where('a.medecin = :medecin')
            ->andWhere('a.signale = false')
            ->setParameter('medecin', $medecin)
            ->getQuery()
            ->getSingleScalarResult();

        return round((float) $result, 1);
    }

    /**
     * Retourne les avis signalés en attente de modération.
     *
     * @return Avis[]
     */
    public function findSignales(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.signale = true')
            ->orderBy('a.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Retourne les avis d'un médecin, sans les avis signalés.
     *
     * @return Avis[]
     */
    public function findByMedecin(Medecin $medecin): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.medecin = :medecin')
            ->andWhere('a.signale = false')
            ->setParameter('medecin', $medecin)
            ->orderBy('a.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
