<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;

/**
 * Tests des endpoints d'authentification.
 * Couvre les scénarios d'échec — pas besoin de DB pour ces cas.
 */
class AuthTest extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    // ── /api/auth/login ───────────────────────────────────────────────────────

    public function testLoginRequiresCredentials(): void
    {
        static::createClient()->request('POST', '/api/auth/login', [
            'json' => [],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testLoginWithMissingPassword(): void
    {
        static::createClient()->request('POST', '/api/auth/login', [
            'json' => ['email' => 'test@test.com'],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testLoginWithInvalidCredentialsReturns401(): void
    {
        static::createClient()->request('POST', '/api/auth/login', [
            'json' => [
                'email'    => 'nonexistent@test.com',
                'password' => 'WrongPassword123!',
            ],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    // ── /api/auth/register ────────────────────────────────────────────────────

    public function testRegisterRequiresCredentials(): void
    {
        static::createClient()->request('POST', '/api/auth/register', [
            'json' => [],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testRegisterWithInvalidEmailReturns422(): void
    {
        static::createClient()->request('POST', '/api/auth/register', [
            'json' => [
                'email'    => 'not-an-email',
                'password' => 'ValidPass123!',
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testRegisterWithWeakPasswordReturns422(): void
    {
        static::createClient()->request('POST', '/api/auth/register', [
            'json' => [
                'email'    => 'test@test.com',
                'password' => '12345678', // Pas de majuscule ni caractère spécial
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    // ── /api/auth/google ──────────────────────────────────────────────────────

    public function testGoogleAuthRequiresIdToken(): void
    {
        static::createClient()->request('POST', '/api/auth/google', [
            'json' => [],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testGoogleAuthWithInvalidTokenReturns401Or503(): void
    {
        static::createClient()->request('POST', '/api/auth/google', [
            'json' => ['googleIdToken' => 'invalid-token'],
        ]);

        // 401 si Google répond (token invalide) ou 503 si réseau indisponible en CI
        $this->assertContains(
            static::getClient()->getResponse()->getStatusCode(),
            [401, 503]
        );
    }

    // ── /api/auth/forgot-password ─────────────────────────────────────────────

    public function testForgotPasswordRequiresEmail(): void
    {
        static::createClient()->request('POST', '/api/auth/forgot-password', [
            'json' => [],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testForgotPasswordWithUnknownEmailReturns200(): void
    {
        // Anti-énumération : même réponse si l'email n'existe pas
        static::createClient()->request('POST', '/api/auth/forgot-password', [
            'json' => ['email' => 'unknown@test.com'],
        ]);

        $this->assertResponseStatusCodeSame(200);
    }

    // ── Route legacy /api/login ───────────────────────────────────────────────

    public function testLegacyLoginIsDisabledOrGone(): void
    {
        static::createClient()->request('POST', '/api/login', [
            'json' => ['email' => 'test@test.com', 'password' => 'test'],
        ]);

        // La route legacy retourne soit 404 (non enregistrée si LexikJWT ne la prend pas)
        // soit 410 Gone (si SecurityController répond en premier).
        // Dans les deux cas, elle NE doit PAS retourner 200.
        $status = static::getClient()->getResponse()->getStatusCode();
        $this->assertNotEquals(200, $status, 'La route legacy /api/login ne doit plus retourner 200.');
    }

    // ── Accès public au catalogue ─────────────────────────────────────────────

    public function testCatalogueIsPubliclyAccessible(): void
    {
        static::createClient()->request('GET', '/api/maladies');
        $this->assertResponseStatusCodeSame(200);
    }

    public function testCategoriesIsPubliclyAccessible(): void
    {
        static::createClient()->request('GET', '/api/categories');
        $this->assertResponseStatusCodeSame(200);
    }

    public function testCentresIsPubliclyAccessible(): void
    {
        static::createClient()->request('GET', '/api/centre_de_santes');
        $this->assertResponseStatusCodeSame(200);
    }

    // ── GET /api/users — doit être protégé ───────────────────────────────────

    public function testUsersListRequiresAdminAuth(): void
    {
        static::createClient()->request('GET', '/api/users');
        // Doit retourner 401 (non authentifié) ou 403 (authentifié mais pas admin)
        $this->assertContains(
            static::getClient()->getResponse()->getStatusCode(),
            [401, 403]
        );
    }
}
