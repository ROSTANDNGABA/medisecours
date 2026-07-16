<?php

namespace App\Controller\Api;

use App\Entity\MediaObject;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/messages')]
class UploadMessageMediaController extends AbstractController
{
    #[Route('/media/upload', name: 'api_message_media_upload', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function upload(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $file = $request->files->get('file');

        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'Aucun fichier fourni.'], Response::HTTP_BAD_REQUEST);
        }

        $maxSize = 50 * 1024 * 1024;
        if ($file->getSize() > $maxSize) {
            return $this->json(['error' => 'Fichier trop volumineux (max 50 MB).'], Response::HTTP_BAD_REQUEST);
        }

        $allowedMimePrefixes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-', 'application/vnd.oasis.opendocument', 'text/plain', 'text/csv', 'application/zip', 'application/x-rar', 'application/x-7z'];
        $mime = $file->getMimeType();
        $valid = false;
        foreach ($allowedMimePrefixes as $prefix) {
            if (str_starts_with($mime, $prefix)) { $valid = true; break; }
        }
        if (!$valid) {
            return $this->json(['error' => 'Type de fichier non autorisé.'], Response::HTTP_BAD_REQUEST);
        }

        $media = new MediaObject();
        $media->setFile($file);
        $media->setUploadedBy($this->getUser());

        $em->persist($media);
        $em->flush();

        return $this->json([
            '@id' => '/api/media_objects/' . $media->getId(),
            'id' => $media->getId(),
            'contentUrl' => '/uploads/media/' . $media->getFilePath(),
            'originalName' => $media->getOriginalName(),
            'mimeType' => $media->getMimeType(),
            'size' => $media->getSize(),
        ]);
    }
}
