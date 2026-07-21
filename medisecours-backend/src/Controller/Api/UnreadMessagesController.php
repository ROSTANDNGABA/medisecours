<?php

namespace App\Controller\Api;

use App\Entity\Message;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class UnreadMessagesController extends AbstractController
{
    #[Route('/messages/unread-count', name: 'api_messages_unread_count', methods: ['GET'], priority: 10)]
    #[IsGranted('ROLE_USER')]
    public function getUnreadCount(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return new JsonResponse(['unreadCount' => 0]);
        }

        $qb = $em->createQueryBuilder();
        $qb->select('COUNT(m.id)')
           ->from(Message::class, 'm')
           ->join('m.conversation', 'c')
           ->join('c.participants', 'p')
           ->where('p = :user')
           ->andWhere('m.expediteur != :user')
           ->andWhere('m.statut != :statut_lu')
           ->setParameter('user', $user)
           ->setParameter('statut_lu', Message::STATUT_LU);

        $count = (int) $qb->getQuery()->getSingleScalarResult();

        return new JsonResponse(['unreadCount' => $count]);
    }
}
