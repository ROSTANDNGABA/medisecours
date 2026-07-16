<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Consultation;
use App\Entity\Patient;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ConsultationProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof Consultation && $data->getPatient() === null) {
            $user = $this->security->getUser();

            if (!$user instanceof Patient) {
                throw new AccessDeniedHttpException('Seul un patient peut creer une consultation.');
            }

            $data->setPatient($user);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
