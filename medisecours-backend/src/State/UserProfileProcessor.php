<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Service\WebSocketNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserProfileProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly WebSocketNotifier $wsNotifier,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        $oldPhoto = null;
        $oldPassword = null;

        if ($data instanceof User) {
            if ($data->getPassword()) {
                $oldPassword = $data->getPassword();
                $data->setPassword($this->passwordHasher->hashPassword($data, $data->getPassword()));
            }

            $current = $this->em->find(User::class, $data->getId());
            if ($current) {
                $oldPhoto = $current->getPhotoProfil();
            }
        }

        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        if ($result instanceof User && $oldPhoto !== $result->getPhotoProfil()) {
            $this->wsNotifier->broadcast([
                'event' => 'profile_photo_changed',
                'payload' => [
                    'userId' => (string) $result->getId(),
                    'photoProfil' => $result->getPhotoProfil(),
                ],
            ]);
        }

        return $result;
    }
}
