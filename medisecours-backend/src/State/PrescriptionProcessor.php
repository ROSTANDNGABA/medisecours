<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Medecin;
use App\Entity\Prescription;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class PrescriptionProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof Prescription) {
            $user = $this->security->getUser();
            if (!$user instanceof Medecin) {
                throw new AccessDeniedHttpException('Seul un médecin peut prescrire.');
            }

            $data->setMedecin($user);

            $consultation = $data->getConsultation();
            if (!$consultation) {
                throw new BadRequestHttpException('La consultation est obligatoire.');
            }

            $patient = $consultation->getPatient();
            if (!$patient) {
                throw new BadRequestHttpException('La consultation doit avoir un patient.');
            }

            $data->setPatient($patient);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
