<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Consultation;
use App\Entity\Conversation;
use App\Entity\Message;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

class CurrentUserExtension implements QueryCollectionExtensionInterface
{
    public function __construct(private readonly Security $security)
    {
    }

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        if (!in_array($resourceClass, [Message::class, Conversation::class, Consultation::class], true)) {
            return;
        }

        $user = $this->security->getUser();

        if (null === $user || $this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        if (Message::class === $resourceClass) {
            $queryBuilder
                ->innerJoin(sprintf('%s.conversation', $rootAlias), 'conv')
                ->innerJoin('conv.participants', 'p')
                ->andWhere('p = :current_user')
                ->setParameter('current_user', $user);

            return;
        }

        if (Conversation::class === $resourceClass) {
            $queryBuilder
                ->innerJoin(sprintf('%s.participants', $rootAlias), 'p')
                ->andWhere('p = :current_user')
                ->setParameter('current_user', $user);

            return;
        }

        $queryBuilder
            ->andWhere(sprintf('%s.patient = :current_user OR %s.medecin = :current_user', $rootAlias, $rootAlias))
            ->setParameter('current_user', $user);
    }
}
