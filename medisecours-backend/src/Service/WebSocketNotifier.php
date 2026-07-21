<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class WebSocketNotifier
{
    private string $publishUrl;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
        string $wsPublishUrl = 'http://127.0.0.1:8082',
    ) {
        $this->publishUrl = rtrim($wsPublishUrl, '/') . '/publish';
    }

    public function broadcast(array $data): void
    {
        try {
            $response = $this->httpClient->request('POST', $this->publishUrl, [
                'json' => $data + ['broadcast' => true],
                'timeout' => 2,
            ]);
            $status = $response->getStatusCode();
            $this->logger->debug('WS broadcast sent', ['status' => $status, 'event' => $data['event'] ?? 'unknown']);
        } catch (\Throwable $e) {
            $this->logger->warning('WS broadcast failed', ['error' => $e->getMessage()]);
        }
    }

    public function notifyConversation(string $conversationId, string $event, array $payload, array $targetUserIds = []): void
    {
        try {
            $this->httpClient->request('POST', $this->publishUrl, [
                'json' => [
                    'conversationId' => $conversationId,
                    'event' => $event,
                    'payload' => $payload,
                    'targetUserIds' => $targetUserIds,
                ],
                'timeout' => 2,
            ]);
        } catch (\Throwable $e) {
            $this->logger->warning('WS notifyConversation failed', ['error' => $e->getMessage()]);
        }
    }
}
