<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\MediaObject;
use App\Entity\Message;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

final class MediaDownloadController extends AbstractController
{
    #[Route('/api/media_objects/{id}/download', name: 'api_media_download', methods: ['GET'])]
    public function __invoke(MediaObject $media, EntityManagerInterface $entityManager): BinaryFileResponse
    {
        $user = $this->getUser();
        if (!$media->isPublic() && !$this->canReadPrivateMedia($media, $entityManager, $user instanceof User ? $user : null)) {
            throw $this->createAccessDeniedException('Vous ne pouvez pas accéder à ce fichier.');
        }

        $fileName = $media->getFilePath();
        if (!$fileName || basename($fileName) !== $fileName) {
            throw new NotFoundHttpException('Fichier introuvable.');
        }

        $path = dirname(__DIR__, 3) . '/var/uploads/media/' . $fileName;
        if (!is_file($path)) {
            throw new NotFoundHttpException('Fichier introuvable.');
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $media->getMimeType() ?? 'application/octet-stream');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Security-Policy', "default-src 'none'; sandbox");
        $response->headers->set(
            'Cache-Control',
            $media->isPublic() ? 'public, max-age=86400, immutable' : 'private, no-store'
        );
        $disposition = $media->getMimeType() === 'application/pdf'
            ? ResponseHeaderBag::DISPOSITION_ATTACHMENT
            : ResponseHeaderBag::DISPOSITION_INLINE;
        $response->setContentDisposition($disposition, $media->getOriginalName() ?? 'document');

        return $response;
    }

    private function canReadPrivateMedia(MediaObject $media, EntityManagerInterface $entityManager, ?User $user): bool
    {
        if (!$user) {
            return false;
        }
        if ($this->isGranted('ROLE_ADMIN') || $media->getUploadedBy() === $user) {
            return true;
        }

        $message = $entityManager->getRepository(Message::class)->findOneBy(['media' => $media]);

        return $message !== null && $message->getConversation()?->getParticipants()->contains($user);
    }
}
