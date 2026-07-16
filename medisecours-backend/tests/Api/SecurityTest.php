<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;

/**
 * Tests de sécurité transversaux.
 * Vérifie que les endpoints sensibles sont correctement protégés.
 */
class SecurityTest extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    // ── Endpoints admin protégés ──────────────────────────────────────────────

    public function testAdminStatsRequiresAuth(): void
    {
        static::createClient()->request('GET', '/api/admin/stats');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testAdminMedecinValidationRequiresAuth(): void
    {
        static::createClient()->request('PATCH', '/api/admin/medecins/1/validation', [
            'json' => ['estValide' => true],
        ]);
        $this->assertResponseStatusCodeSame(401);
    }

    public function testAdminMedecinsEnAttenteRequiresAuth(): void
    {
        static::createClient()->request('GET', '/api/admin/medecins/en-attente');
        $this->assertResponseStatusCodeSame(401);
    }

    // ── Exposition des données utilisateurs ──────────────────────────────────

    public function testUsersListIsNotPubliclyAccessible(): void
    {
        static::createClient()->request('GET', '/api/users');
        // 401 sans token
        $this->assertResponseStatusCodeSame(401);
    }

    // ── Endpoints publics accessibles sans token ──────────────────────────────

    public function testMedecinsPublicsIsAccessible(): void
    {
        static::createClient()->request('GET', '/api/medecins-publics');
        $this->assertResponseStatusCodeSame(200);
    }

    public function testAvisIsPubliclyAccessible(): void
    {
        static::createClient()->request('GET', '/api/avis');
        $this->assertResponseStatusCodeSame(200);
    }

    // ── Endpoints d'écriture protégés ────────────────────────────────────────

    public function testPostMaladieRequiresAdmin(): void
    {
        static::createClient()->request('POST', '/api/maladies', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json'    => ['nom' => 'Test', 'description' => 'Test description'],
        ]);
        $this->assertResponseStatusCodeSame(401);
    }

    public function testPostCentreSanteRequiresAdmin(): void
    {
        static::createClient()->request('POST', '/api/centre_de_santes', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json'    => ['nom' => 'Test Centre'],
        ]);
        $this->assertResponseStatusCodeSame(401);
    }

    // ── Vérification email ────────────────────────────────────────────────────

    public function testVerifyEmailWithMissingTokenReturns400(): void
    {
        static::createClient()->request('GET', '/api/auth/verify-email');
        $this->assertResponseStatusCodeSame(400);
    }

    public function testVerifyEmailWithInvalidTokenReturns404(): void
    {
        static::createClient()->request('GET', '/api/auth/verify-email', [
            'query' => ['token' => 'invalid-token-that-does-not-exist'],
        ]);
        $this->assertResponseStatusCodeSame(404);
    }

    // ── Reset password ────────────────────────────────────────────────────────

    public function testResetPasswordWithMissingDataReturns400(): void
    {
        static::createClient()->request('POST', '/api/auth/reset-password', [
            'json' => [],
        ]);
        $this->assertResponseStatusCodeSame(400);
    }
}
