<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class NotificationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notification::class);
    }

    public function countUnreadFor(User $recipient): int
    {
        return (int) $this->createQueryBuilder('notification')
            ->select('COUNT(notification.id)')
            ->andWhere('notification.recipient = :recipient')
            ->andWhere('notification.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return Notification[]
     */
    public function findUnreadFor(User $recipient): array
    {
        return $this->createQueryBuilder('notification')
            ->andWhere('notification.recipient = :recipient')
            ->andWhere('notification.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->orderBy('notification.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function deleteAllFor(User $recipient): int
    {
        return $this->createQueryBuilder('notification')
            ->delete(Notification::class, 'notification')
            ->andWhere('notification.recipient = :recipient')
            ->setParameter('recipient', $recipient)
            ->getQuery()
            ->execute();
    }
}
