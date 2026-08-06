<?php

namespace App\Repository;

use App\Entity\Consultation;
use App\Entity\Medecin;
use App\Entity\Patient;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Consultation>
 */
class ConsultationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Consultation::class);
    }

    public function hasCompletedConsultation(Patient $patient, Medecin $medecin): bool
    {
        return (int) $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->where('c.patient = :patient')
            ->andWhere('c.medecin = :medecin')
            ->andWhere('c.statut = :status')
            ->setParameter('patient', $patient)
            ->setParameter('medecin', $medecin)
            ->setParameter('status', Consultation::STATUT_TERMINEE)
            ->getQuery()
            ->getSingleScalarResult() > 0;
    }
}
