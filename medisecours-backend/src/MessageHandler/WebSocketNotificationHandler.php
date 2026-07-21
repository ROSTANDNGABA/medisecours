<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\WebSocketNotification;
use App\Service\WebSocketNotifier;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class WebSocketNotificationHandler
{
    public function __construct(
        private readonly WebSocketNotifier $wsNotifier,
    ) {
    }

    public function __invoke(WebSocketNotification $message): void
    {
        if ($message->isBroadcast()) {
            $this->wsNotifier->broadcast([
                'event' => $message->getEvent(),
                'payload' => $message->getPayload(),
            ]);
        } else {
            $this->wsNotifier->notifyConversation(
                (string) ($message->getPayload()['conversationId'] ?? ''),
                $message->getEvent(),
                $message->getPayload(),
                $message->getTargetUserIds(),
            );
        }
    }
}
