<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Endpoint de santé publique pour monitoring.
 */
class HealthController extends AbstractController
{
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function health(EntityManagerInterface $entityManager): JsonResponse
    {
        $dbOk = false;
        try {
            $entityManager->getConnection()->executeQuery('SELECT 1');
            $dbOk = true;
        } catch (\Throwable) {
            $dbOk = false;
        }

        $mercureConfigured = !empty($_ENV['MERCURE_URL'] ?? null) || !empty($_ENV['MERCURE_PUBLIC_URL'] ?? null);

        $status = $dbOk ? 'ok' : 'degraded';
        $httpCode = $dbOk ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE;

        return new JsonResponse([
            'status' => $status,
            'services' => [
                'api' => 'ok',
                'database' => $dbOk ? 'ok' : 'error',
                'mercure' => $mercureConfigured ? 'configured' : 'not_configured',
            ],
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], $httpCode);
    }
}
