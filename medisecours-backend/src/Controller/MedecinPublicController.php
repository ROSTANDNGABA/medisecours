<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Medecin;
use App\Repository\AvisRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Endpoints publics pour les profils médecins visibles par tous les utilisateurs.
 *
 * Ces endpoints n'exposent que les informations professionnelles publiques :
 * nom, spécialité, disponibilités, note moyenne, avis.
 * Email, téléphone et données personnelles sont exclus.
 */
class MedecinPublicController extends AbstractController
{
    /**
     * Liste publique des médecins validés.
     * Utilisée par la messagerie pour choisir un médecin.
     *
     * GET /api/medecins-publics
     * Paramètres optionnels : ?specialite=Cardiologie&page=1&limit=30
     */
    #[Route('/api/medecins-publics', name: 'api_medecins_publics', methods: ['GET'])]
    public function list(
        Request $request,
        EntityManagerInterface $entityManager,
        AvisRepository $avisRepository
    ): JsonResponse {
        $specialite = $request->query->get('specialite');
        $page       = max(1, (int) $request->query->get('page', 1));
        $limit      = min(50, max(1, (int) $request->query->get('limit', 30)));
        $offset     = ($page - 1) * $limit;

        $qb = $entityManager->createQueryBuilder()
            ->select('m')
            ->from(Medecin::class, 'm')
            ->where('m.estValide = true')
            ->orderBy('m.nom', 'ASC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        if ($specialite) {
            $qb->andWhere('LOWER(m.specialite) LIKE :specialite')
               ->setParameter('specialite', '%' . strtolower($specialite) . '%');
        }

        $medecins = $qb->getQuery()->getResult();

        $total = (int) $entityManager->createQueryBuilder()
            ->select('COUNT(m.id)')
            ->from(Medecin::class, 'm')
            ->where('m.estValide = true')
            ->getQuery()
            ->getSingleScalarResult();

        return new JsonResponse([
            'hydra:member'     => array_map(fn(Medecin $m) => $this->serializePublic($m, $avisRepository), $medecins),
            'hydra:totalItems' => $total,
            'page'             => $page,
            'limit'            => $limit,
        ]);
    }

    /**
     * Profil public d'un médecin spécifique avec ses avis.
     * GET /api/medecins-publics/{id}
     */
    #[Route('/api/medecins-publics/{id}', name: 'api_medecin_public_detail', methods: ['GET'])]
    public function show(
        string $id,
        EntityManagerInterface $entityManager,
        AvisRepository $avisRepository
    ): JsonResponse {
        $medecin = $entityManager->getRepository(Medecin::class)->find($id);

        if (!$medecin || !$medecin->isEstValide()) {
            return new JsonResponse(['error' => 'Médecin introuvable.'], 404);
        }

        $avis = $avisRepository->findByMedecin($medecin);

        $data = $this->serializePublic($medecin, $avisRepository);
        $data['avis'] = array_map(fn($a) => [
            'id'          => $a->getId(),
            'note'        => $a->getNote(),
            'commentaire' => $a->getCommentaire(),
            'createdAt'   => $a->getCreatedAt()->format('c'),
            'patient'     => [
                'prenom' => $a->getPatient()?->getPrenom(),
                'nom'    => $a->getPatient()?->getNom(),
            ],
        ], $avis);

        return new JsonResponse($data);
    }

    /**
     * Sérialise les données publiques d'un médecin (sans email ni téléphone).
     *
     * @return array<string, mixed>
     */
    private function serializePublic(Medecin $medecin, AvisRepository $avisRepository): array
    {
        return [
            'id'                    => (string) $medecin->getId(),
            'nom'                   => $medecin->getNom(),
            'prenom'                => $medecin->getPrenom(),
            'specialite'            => $medecin->getSpecialite(),
            'disponibilites'        => $medecin->getDisponibilites(),
            'disponibilitesTexte'   => $medecin->getDisponibilitesTexte(),
            'disponibilitesLabel'   => $medecin->getDisponibilitesLabel(),
            'isDisponibleMaintenant' => $medecin->isDisponibleMaintenant(),
            'photoProfil'           => $medecin->getPhotoProfil(),
            'noteMoyenne'           => $avisRepository->getNoteMoyenne($medecin),
            'roles'                 => $medecin->getRoles(),
        ];
    }
}
