<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Consultation;
use App\Entity\Medecin;
use App\Entity\Patient;
use App\Message\WebSocketNotification;
use App\Service\ConsultationEmailService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Messenger\MessageBusInterface;

class ConsultationProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
        private readonly MessageBusInterface $messageBus,
        private readonly ConsultationEmailService $emailService,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof Consultation) {
            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        $user = $this->security->getUser();
        $originalStatut = $this->em->getUnitOfWork()->getOriginalEntityData($data)['statut'] ?? null;

        // Création — le patient est l'utilisateur connecté
        if ($data->getPatient() === null) {
            if (!$user instanceof Patient) {
                throw new AccessDeniedHttpException('Seul un patient peut creer une consultation.');
            }
            $data->setPatient($user);
        }

        // Prise en charge — le médecin devient le responsable de la consultation
        if ($data->getMedecin() === null && $user instanceof Medecin && $data->getStatut() === Consultation::STATUT_EN_COURS) {
            $data->setMedecin($user);
        }

        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        if ($result instanceof Consultation) {
            $this->notifyStatusChange($result, $originalStatut);
        }

        return $result;
    }

    private function notifyStatusChange(Consultation $consultation, ?string $originalStatut): void
    {
        $statut = $consultation->getStatut();

        if ($originalStatut === null && $statut === Consultation::STATUT_OUVERTE) {
            $this->logger->info('Dispatch consultation_created', ['id' => $consultation->getId()]);
            $this->messageBus->dispatch(new WebSocketNotification(
                event: 'consultation_created',
                payload: $this->buildPayload($consultation),
            ));
        }

        if ($statut === Consultation::STATUT_EN_COURS && $originalStatut === Consultation::STATUT_OUVERTE) {
            $this->logger->info('Dispatch consultation_accepted', ['id' => $consultation->getId()]);
            $this->messageBus->dispatch(new WebSocketNotification(
                event: 'consultation_accepted',
                payload: $this->buildPayload($consultation),
            ));
        }

        if ($statut === Consultation::STATUT_TERMINEE) {
            $this->logger->info('Dispatch consultation_closed', ['id' => $consultation->getId()]);
            $this->messageBus->dispatch(new WebSocketNotification(
                event: 'consultation_closed',
                payload: $this->buildPayload($consultation),
            ));
            $prescription = $consultation->getPrescriptions()->last() ?: null;
            $this->emailService->sendClosingEmail($consultation, $prescription);
        }
    }

    private function buildPayload(Consultation $c): array
    {
        return [
            'id' => $c->getId(),
            'statut' => $c->getStatut(),
            'motif' => $c->getMotif(),
            'priorite' => $c->getPriorite(),
            'createdAt' => $c->getCreatedAt()?->format('c'),
            'patient' => $c->getPatient() ? [
                'id' => $c->getPatient()->getId(),
                'nom' => $c->getPatient()->getNom(),
                'prenom' => $c->getPatient()->getPrenom(),
                'photoProfil' => $c->getPatient()->getPhotoProfil(),
                'telephone' => $c->getPatient()->getTelephone(),
            ] : null,
            'medecin' => $c->getMedecin() ? [
                'id' => $c->getMedecin()->getId(),
                'nom' => $c->getMedecin()->getNom(),
                'prenom' => $c->getMedecin()->getPrenom(),
                'photoProfil' => $c->getMedecin()->getPhotoProfil(),
                'telephone' => $c->getMedecin()->getTelephone(),
            ] : null,
        ];
    }
}
