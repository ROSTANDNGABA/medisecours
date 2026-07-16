<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;

/**
 * Tests des endpoints de consultation.
 */
class ConsultationTest extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    public function testGetCollectionRequiresAuthentication(): void
    {
        static::createClient()->request('GET', '/api/consultations');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testPostRequiresAuthentication(): void
    {
        static::createClient()->request('POST', '/api/consultations', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json'    => ['motif' => 'Douleur thoracique'],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testPatchRequiresAuthentication(): void
    {
        static::createClient()->request('PATCH', '/api/consultations/1', [
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
            'json'    => ['statut' => 'TERMINEE'],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }
}
