<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Medecin;
use App\Entity\Prescription;
use ApiPlatform\Metadata\Post;
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

            $consultation = $data->getConsultation();
            if (!$consultation) {
                throw new BadRequestHttpException('La consultation est obligatoire.');
            }

            if ($consultation->getMedecin() !== $user) {
                throw new AccessDeniedHttpException('Vous ne pouvez prescrire que pour une consultation dont vous êtes responsable.');
            }

            if ($consultation->getStatut() !== \App\Entity\Consultation::STATUT_EN_COURS) {
                throw new BadRequestHttpException('Une prescription ne peut être créée ou modifiée que pendant une consultation en cours.');
            }

            if ($operation instanceof Post) {
                $data->setMedecin($user);
            } elseif ($data->getMedecin() !== $user) {
                throw new AccessDeniedHttpException('Le prescripteur ne peut pas être modifié.');
            }

            $patient = $consultation->getPatient();
            if (!$patient) {
                throw new BadRequestHttpException('La consultation doit avoir un patient.');
            }

            if ($operation instanceof Post) {
                $data->setPatient($patient);
            } elseif ($data->getPatient() !== $patient) {
                throw new AccessDeniedHttpException('Le patient associé à une prescription ne peut pas être modifié.');
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
