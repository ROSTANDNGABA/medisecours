<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;

/**
 * Tests des endpoints de messagerie.
 */
class MessageTest extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    // ── Accès non authentifié ─────────────────────────────────────────────────

    public function testGetCollectionRequiresAuthentication(): void
    {
        static::createClient()->request('GET', '/api/messages');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetItemRequiresAuthentication(): void
    {
        static::createClient()->request('GET', '/api/messages/1');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testPostMessageRequiresAuthentication(): void
    {
        static::createClient()->request('POST', '/api/messages', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json'    => ['contenu' => 'Test message'],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testPatchMessageRequiresAuthentication(): void
    {
        static::createClient()->request('PATCH', '/api/messages/1', [
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
            'json'    => ['isRead' => true],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testDeleteMessageRequiresAuthentication(): void
    {
        static::createClient()->request('DELETE', '/api/messages/1');
        $this->assertResponseStatusCodeSame(401);
    }
}
