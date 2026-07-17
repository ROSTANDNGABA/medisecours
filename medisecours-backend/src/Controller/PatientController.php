<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\UserSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/patients')]
class PatientController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function index(Request $request, EntityManagerInterface $em, UserSerializer $userSerializer): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_MEDECIN');

        $qb = $em->getRepository(User::class)->createQueryBuilder('u')
            ->where("u INSTANCE OF App\Entity\Patient")
            ->andWhere('u.actif = :actif')
            ->setParameter('actif', true)
            ->orderBy('u.nom', 'ASC')
            ->addOrderBy('u.prenom', 'ASC');

        $search = $request->query->get('search');
        if ($search && strlen(trim($search)) >= 2) {
            $qb->andWhere('(LOWER(u.nom) LIKE :q OR LOWER(u.prenom) LIKE :q OR LOWER(u.email) LIKE :q OR u.telephone LIKE :q)')
               ->setParameter('q', '%' . mb_strtolower(trim($search)) . '%');
        }

        $patients = $qb->getQuery()->getResult();

        $data = array_map(fn($u) => $userSerializer->serialize($u), $patients);

        return $this->json($data);
    }
}
