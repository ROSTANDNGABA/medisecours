<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Consultation;
use App\Entity\Medecin;
use App\Entity\Patient;
use App\Service\ConsultationEmailService;
use App\Service\WebSocketNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ConsultationProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
        private readonly WebSocketNotifier $wsNotifier,
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

        // Création
        if ($data->getPatient() === null) {
            if (!$user instanceof Patient) {
                throw new AccessDeniedHttpException('Seul un patient peut creer une consultation.');
            }
            $data->setPatient($user);
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

        try {
            if ($originalStatut === null && $statut === Consultation::STATUT_OUVERTE) {
                $this->logger->info('WS notify consultation_created', ['id' => $consultation->getId()]);
                $this->wsNotifier->broadcast([
                    'event' => 'consultation_created',
                    'payload' => $this->buildPayload($consultation),
                ]);
            }

            if ($statut === Consultation::STATUT_EN_COURS && $originalStatut === Consultation::STATUT_OUVERTE) {
                $this->logger->info('WS notify consultation_accepted', ['id' => $consultation->getId()]);
                $this->wsNotifier->broadcast([
                    'event' => 'consultation_accepted',
                    'payload' => $this->buildPayload($consultation),
                ]);
            }

            if ($statut === Consultation::STATUT_TERMINEE) {
                $this->logger->info('WS notify consultation_closed', ['id' => $consultation->getId()]);
                $this->wsNotifier->broadcast([
                    'event' => 'consultation_closed',
                    'payload' => $this->buildPayload($consultation),
                ]);
                $prescription = $consultation->getPrescriptions()->last() ?: null;
                $this->emailService->sendClosingEmail($consultation, $prescription);
            }
        } catch (\Throwable $e) {
            $this->logger->warning('WS notify failed', ['error' => $e->getMessage()]);
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
            ] : null,
            'medecin' => $c->getMedecin() ? [
                'id' => $c->getMedecin()->getId(),
                'nom' => $c->getMedecin()->getNom(),
                'prenom' => $c->getMedecin()->getPrenom(),
            ] : null,
        ];
    }
}
