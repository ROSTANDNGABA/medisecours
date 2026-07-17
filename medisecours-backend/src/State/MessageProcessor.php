<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Consultation;
use App\Entity\Conversation;
use App\Entity\Medecin;
use App\Entity\Message;
use App\Entity\Patient;
use App\Entity\User;
use App\Service\WebSocketNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class MessageProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
        private readonly WebSocketNotifier $wsNotifier,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof Message) {
            $user = $this->security->getUser();

            if (!$user instanceof User) {
                throw new AccessDeniedHttpException('Authentification requise.');
            }

            $data->setExpediteur($user);

            $conversation = $data->getConversation();

            if ($data->getConsultation() instanceof Consultation) {
                $conversation = $this->prepareFromConsultation($data, $data->getConsultation(), $user);
            }

            if (!$conversation instanceof Conversation) {
                throw new BadRequestHttpException('La conversation est obligatoire.');
            }

            if (!$conversation->getParticipants()->contains($user)) {
                throw new AccessDeniedHttpException('Vous ne participez pas à cette conversation.');
            }

            $data->setConversation($conversation);
            $data->setStatut(Message::STATUT_ENVOYE);

            $conversation->setUpdatedAt(new \DateTimeImmutable());
        }

        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        if ($result instanceof Message) {
            $conv = $result->getConversation();
            $conv?->setDernierMessage($result);
            $this->em->flush();
            $this->notifyWebSocket($result);
        }

        return $result;
    }

    private function notifyWebSocket(Message $message): void
    {
        $conv = $message->getConversation();
        if (!$conv) return;

        $this->wsNotifier->notifyConversation(
            (string) $conv->getId(),
            'new_message',
            [
                'id' => $message->getId(),
                'contenu' => $message->getContenu(),
                'typeMessage' => $message->getTypeMessage(),
                'statut' => $message->getStatut(),
                'createdAt' => $message->getCreatedAt()?->format('c'),
                'expediteur' => [
                    'id' => $message->getExpediteur()?->getId(),
                    'nom' => $message->getExpediteur()?->getNom(),
                    'prenom' => $message->getExpediteur()?->getPrenom(),
                ],
                'conversation' => '/api/conversations/' . $conv->getId(),
                'media' => $message->getMedia() ? [
                    '@id' => '/api/media_objects/' . $message->getMedia()->getId(),
                    'contentUrl' => '/uploads/media/' . $message->getMedia()->getFilePath(),
                    'originalName' => $message->getMedia()->getOriginalName(),
                    'mimeType' => $message->getMedia()->getMimeType(),
                    'size' => $message->getMedia()->getSize(),
                ] : null,
                'dureeVoix' => $message->getDureeVoix(),
            ]
        );
    }

    private function prepareFromConsultation(Message $message, Consultation $consultation, User $user): ?Conversation
    {
        $patient = $consultation->getPatient();
        $medecin = $consultation->getMedecin();

        if (!$patient instanceof Patient || !$medecin instanceof Medecin) {
            throw new BadRequestHttpException('La consultation doit avoir un patient et un médecin.');
        }

        if ($user !== $patient && $user !== $medecin) {
            throw new AccessDeniedHttpException('Vous ne participez pas à cette consultation.');
        }

        return $this->findOrCreateConversation([$patient, $medecin]);
    }

    private function findOrCreateConversation(array $users): Conversation
    {
        $ids = array_map(fn(User $u) => (string) $u->getId(), $users);
        sort($ids);

        $qb = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Conversation::class, 'c')
            ->join('c.participants', 'p')
            ->groupBy('c.id')
            ->having('COUNT(c.id) = :count')
            ->setParameter('count', count($ids));

        foreach ($ids as $i => $id) {
            $qb->andWhere("p.id IN (:id{$i})")
               ->setParameter("id{$i}", $id);
        }

        $existing = $qb->getQuery()->getResult();

        foreach ($existing as $conv) {
            $convIds = array_map(fn(User $u) => (string) $u->getId(), $conv->getParticipants()->toArray());
            sort($convIds);
            if ($convIds === $ids) {
                return $conv;
            }
        }

        $conversation = new Conversation();
        foreach ($users as $u) {
            $conversation->addParticipant($u);
        }
        $this->em->persist($conversation);

        return $conversation;
    }
}
