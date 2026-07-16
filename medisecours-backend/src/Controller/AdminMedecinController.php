<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Medecin;
use App\Entity\User;
use App\Security\Voter\MedecinVoter;
use App\Service\EmailVerificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Endpoints d'administration des médecins.
 * Protégés par le MedecinVoter (ROLE_ADMIN requis).
 */
class AdminMedecinController extends AbstractController
{
    public function __construct(
        private readonly EmailVerificationService $emailService,
        private readonly ValidatorInterface $validator,
    ) {
    }
    /**
     * Valide ou invalide un compte médecin.
     *
     * PATCH /api/admin/medecins/{id}/validation
     * Body : { "estValide": true }
     *     ou { "estValide": false, "motif": "Numéro d'ordre invalide." }
     */
    #[Route('/api/admin/medecins/{id}/validation', name: 'api_admin_medecin_validation', methods: ['PATCH'])]
    public function toggleValidation(string $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $entityManager->getRepository(User::class)->find($id);

        if (!$user instanceof Medecin) {
            return new JsonResponse(['error' => 'Médecin introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(MedecinVoter::VALIDATE, $user);

        $data = json_decode($request->getContent(), true);

        if (!isset($data['estValide']) || !is_bool($data['estValide'])) {
            // Bascule l'état si aucun paramètre explicite
            $data['estValide'] = !$user->isEstValide();
        }

        $wasValid = $user->isEstValide();
        $user->setEstValide($data['estValide']);
        $entityManager->flush();

        $emailError = null;
        if ($data['estValide'] === true) {
            // Validation → email de félicitations (même si déjà validé — retrigger explicite)
            try {
                $this->emailService->sendMedecinValidatedEmail($user);
            } catch (\Throwable $e) {
                $emailError = $e->getMessage();
            }
        } elseif ($data['estValide'] === false) {
            // Refus → email avec motif
            $motif = (string) ($data['motif'] ?? 'Aucun motif précisé.');
            try {
                $this->emailService->sendMedecinRejectedEmail($user, $motif);
            } catch (\Throwable $e) {
                $emailError = $e->getMessage();
            }
        }

        $response = [
            'message' => $user->isEstValide()
                ? 'Compte médecin validé.'
                : 'Compte médecin invalidé.',
            'user' => $this->serializeMedecin($user),
        ];

        // Inclure l'erreur email dans la réponse pour debug (non bloquant)
        if ($emailError !== null) {
            $response['emailError'] = $emailError;
        }

        return new JsonResponse($response);
    }

    /**
     * Retourne la liste de TOUS les médecins (validés + en attente), triés A-Z.
     * GET /api/admin/medecins
     */
    #[Route('/api/admin/medecins', name: 'api_admin_medecins_all', methods: ['GET'])]
    public function getAllMedecins(EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $medecins = $entityManager->getRepository(Medecin::class)->findBy(
            [],
            ['nom' => 'ASC', 'prenom' => 'ASC']
        );

        return new JsonResponse([
            'total'    => count($medecins),
            'medecins' => array_map($this->serializeMedecin(...), $medecins),
        ]);
    }

    /**
     * Retourne la liste des médecins en attente de validation.
     * GET /api/admin/medecins/en-attente
     */
    #[Route('/api/admin/medecins/en-attente', name: 'api_admin_medecins_en_attente', methods: ['GET'])]
    public function getMedecinsEnAttente(EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $medecins = $entityManager->getRepository(Medecin::class)->findBy(
            ['estValide' => false],
            ['nom' => 'ASC', 'prenom' => 'ASC']
        );

        return new JsonResponse([
            'total' => count($medecins),
            'medecins' => array_map($this->serializeMedecin(...), $medecins),
        ]);
    }

    /**
     * Active, désactive ou bannit un compte utilisateur.
     * PATCH /api/admin/users/{id}/status
     * Body : { "action": "activer" | "desactiver" | "bannir" | "debannir" }
     */
    #[Route('/api/admin/users/{id}/status', name: 'api_admin_user_status', methods: ['PATCH'])]
    public function toggleUserStatus(string $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $user = $entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return new JsonResponse(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        // Empêcher l'admin de se désactiver lui-même
        if ($user === $this->getUser()) {
            return new JsonResponse(['error' => 'Vous ne pouvez pas modifier votre propre statut.'], Response::HTTP_FORBIDDEN);
        }

        $data   = json_decode($request->getContent(), true);
        $action = $data['action'] ?? null;

        switch ($action) {
            case 'activer':
                $user->setActif(true);
                $user->setBanni(false);
                $message = 'Compte activé avec succès.';
                break;

            case 'desactiver':
                $user->setActif(false);
                $message = 'Compte désactivé avec succès. L\'utilisateur ne pourra plus se connecter.';
                break;

            case 'bannir':
                $user->setBanni(true);
                $user->setActif(false);
                $message = 'Compte banni avec succès.';
                break;

            case 'debannir':
                $user->setBanni(false);
                $user->setActif(true);
                $message = 'Bannissement levé avec succès.';
                break;

            default:
                return new JsonResponse(['error' => 'Action invalide. Valeurs acceptées : activer, desactiver, bannir, debannir.'], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->flush();

        return new JsonResponse([
            'message' => $message,
            'user'    => $this->serializeUser($user),
        ]);
    }

    /**
     * Liste tous les utilisateurs pour l'admin (sans les admins eux-mêmes).
     * GET /api/admin/users
     */
    #[Route('/api/admin/users', name: 'api_admin_users_list', methods: ['GET'])]
    public function listUsers(EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        // Exclure les comptes admin de la liste — ils ne doivent pas être gérés ici
        $allUsers = $entityManager->getRepository(User::class)->findBy(
            [],
            ['nom' => 'ASC', 'prenom' => 'ASC']
        );
        $users = array_filter($allUsers, fn(User $u) => !in_array('ROLE_ADMIN', $u->getRoles(), true));

        return new JsonResponse([
            'users' => array_values(array_map($this->serializeUser(...), $users)),
        ]);
    }

    /**
     * Crée un utilisateur depuis l'admin.
     * POST /api/admin/users
     */
    #[Route('/api/admin/users', name: 'api_admin_users_create', methods: ['POST'])]
    public function createUser(
        Request $request,
        EntityManagerInterface $entityManager,
        \Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true);

        if (!is_array($data) || !isset($data['email'], $data['password'], $data['type'])) {
            return new JsonResponse(['error' => 'email, password et type obligatoires.'], Response::HTTP_BAD_REQUEST);
        }

        $email = strtolower(trim($data['email']));
        $existing = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return new JsonResponse(['error' => 'Un compte existe déjà avec cet email.'], Response::HTTP_CONFLICT);
        }

        $user = $data['type'] === 'medecin' ? new Medecin() : new \App\Entity\Patient();
        $user->setEmail($email);
        $user->setPassword($passwordHasher->hashPassword($user, (string) $data['password']));
        if (isset($data['nom']))    $user->setNom((string)    $data['nom']);
        if (isset($data['prenom'])) $user->setPrenom((string) $data['prenom']);
        if (isset($data['telephone'])) $user->setTelephone((string) $data['telephone']);
        if (isset($data['quartier']))  $user->setQuartier((string)  $data['quartier']);

        if ($user instanceof Medecin) {
            if (isset($data['specialite']))  $user->setSpecialite((string)  $data['specialite']);
            if (isset($data['numeroOrdre'])) $user->setNumeroOrdre((string) $data['numeroOrdre']);
        }

        if ($user instanceof \App\Entity\Patient) {
            if (isset($data['groupeSanguin'])) $user->setGroupeSanguin((string) $data['groupeSanguin']);
            if (isset($data['allergies'])) {
                $allergies = $data['allergies'];
                if (is_string($allergies)) $allergies = array_filter(array_map('trim', explode(',', $allergies)));
                $user->setAllergies(array_values((array) $allergies));
            }
        }

        $entityManager->persist($user);
        $entityManager->flush();

        return new JsonResponse([
            'message' => 'Compte créé avec succès.',
            'user'    => $this->serializeUser($user),
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifie un utilisateur depuis l'admin.
     * PATCH /api/admin/users/{id}
     * Seuls les champs présents et non-vides sont mis à jour.
     */
    #[Route('/api/admin/users/{id}', name: 'api_admin_users_update', methods: ['PATCH'])]
    public function updateUser(string $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $user = $entityManager->getRepository(User::class)->find($id);
        if (!$user) {
            return new JsonResponse(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Corps de la requête invalide.'], Response::HTTP_BAD_REQUEST);
        }

        // Mise à jour uniquement si la valeur est non-nulle et non-vide
        $setIfPresent = function (string $key, callable $setter) use ($data): void {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                $setter($data[$key]);
            } elseif (array_key_exists($key, $data) && ($data[$key] === '' || $data[$key] === null)) {
                // Permettre d'effacer un champ optionnel en envoyant null ou ""
                $setter(null);
            }
        };

        $setIfPresent('nom',       fn($v) => $user->setNom((string) $v));
        $setIfPresent('prenom',    fn($v) => $user->setPrenom((string) $v));
        $setIfPresent('quartier',  fn($v) => $user->setQuartier($v !== null ? (string) $v : null));

        // Email — seulement si non-vide (champ obligatoire)
        if (!empty($data['email'])) {
            $user->setEmail(strtolower(trim((string) $data['email'])));
        }

        // Téléphone — accepte vide pour effacer, sinon valide le format
        if (array_key_exists('telephone', $data)) {
            $tel = trim((string) ($data['telephone'] ?? ''));
            $user->setTelephone($tel !== '' ? $tel : null);
        }

        if ($user instanceof Medecin) {
            if (array_key_exists('specialite',  $data)) $user->setSpecialite($data['specialite']  !== '' ? (string) $data['specialite']  : null);
            if (array_key_exists('numeroOrdre', $data)) $user->setNumeroOrdre($data['numeroOrdre'] !== '' ? (string) $data['numeroOrdre'] : null);
        }

        if ($user instanceof \App\Entity\Patient) {
            if (array_key_exists('groupeSanguin', $data)) {
                $user->setGroupeSanguin($data['groupeSanguin'] !== '' ? (string) $data['groupeSanguin'] : null);
            }
            if (array_key_exists('allergies', $data)) {
                $allergies = $data['allergies'];
                if (is_string($allergies)) {
                    $allergies = array_values(array_filter(array_map('trim', explode(',', $allergies))));
                }
                $user->setAllergies(is_array($allergies) ? $allergies : []);
            }
        }

        // Validation Symfony — retourne les erreurs explicites au lieu d'un 422 cryptique
        $errors = $this->validator->validate($user);
        if (count($errors) > 0) {
            $messages = [];
            foreach ($errors as $error) {
                $messages[$error->getPropertyPath()] = $error->getMessage();
            }
            return new JsonResponse(['errors' => $messages], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $entityManager->flush();

        return new JsonResponse([
            'message' => 'Utilisateur modifié avec succès.',
            'user'    => $this->serializeUser($user),
        ]);
    }

    /**
     * Retourne les statistiques globales de la plateforme.
     * GET /api/admin/stats
     */
    #[Route('/api/admin/stats', name: 'api_admin_stats', methods: ['GET'])]
    public function getStats(EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $conn = $entityManager->getConnection();

        // Toutes les requêtes en une seule fois pour minimiser les allers-retours DB
        $patients = (int) $conn->fetchOne("SELECT COUNT(*) FROM \"user\" WHERE type = 'patient'");
        $medecins = (int) $conn->fetchOne("SELECT COUNT(*) FROM \"user\" WHERE type = 'medecin'");
        $medecinsValides = (int) $conn->fetchOne("SELECT COUNT(*) FROM \"user\" WHERE type = 'medecin' AND est_valide = true");
        $medecinsEnAttente = $medecins - $medecinsValides;
        $maladies = (int) $conn->fetchOne('SELECT COUNT(*) FROM maladie');
        $categories = (int) $conn->fetchOne('SELECT COUNT(*) FROM categorie');
        $centres = (int) $conn->fetchOne('SELECT COUNT(*) FROM centre_de_sante WHERE est_actif = true');
        $consultations = (int) $conn->fetchOne('SELECT COUNT(*) FROM consultation');
        $consultationsEnCours = (int) $conn->fetchOne("SELECT COUNT(*) FROM consultation WHERE statut IN ('OUVERTE', 'EN_COURS')");
        $messages = (int) $conn->fetchOne('SELECT COUNT(*) FROM message WHERE deleted_at IS NULL');
        $avis = (int) $conn->fetchOne('SELECT COUNT(*) FROM avis WHERE signale = false');
        $avisSignales = (int) $conn->fetchOne('SELECT COUNT(*) FROM avis WHERE signale = true');

        return new JsonResponse([
            'utilisateurs' => [
                'patients'            => $patients,
                'medecins'            => $medecins,
                'medecinsValides'     => $medecinsValides,
                'medecinsEnAttente'   => $medecinsEnAttente,
                'total'               => $patients + $medecins,
            ],
            'contenu' => [
                'maladies'   => $maladies,
                'categories' => $categories,
                'centres'    => $centres,
            ],
            'activite' => [
                'consultations'          => $consultations,
                'consultationsEnCours'   => $consultationsEnCours,
                'messages'               => $messages,
                'avis'                   => $avis,
                'avisSignales'           => $avisSignales,
            ],
        ]);
    }

    private function serializeMedecin(Medecin $medecin): array
    {
        return [
            'id'          => (string) $medecin->getId(),
            'email'       => $medecin->getEmail(),
            'nom'         => $medecin->getNom(),
            'prenom'      => $medecin->getPrenom(),
            'specialite'  => $medecin->getSpecialite(),
            'numeroOrdre' => $medecin->getNumeroOrdre(),
            'telephone'   => $medecin->getTelephone(),
            'estValide'   => $medecin->isEstValide(),
            'actif'       => $medecin->isActif(),
            'banni'       => $medecin->isBanni(),
            'roles'       => $medecin->getRoles(),
        ];
    }

    private function serializeUser(User $user): array
    {
        $data = [
            'id'            => (string) $user->getId(),
            'email'         => $user->getEmail(),
            'nom'           => $user->getNom(),
            'prenom'        => $user->getPrenom(),
            'telephone'     => $user->getTelephone(),
            'quartier'      => $user->getQuartier(),
            'emailVerified' => $user->isEmailVerified(),
            'actif'         => $user->isActif(),
            'banni'         => $user->isBanni(),
            'roles'         => $user->getRoles(),
            'createdAt'     => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];

        if ($user instanceof Medecin) {
            $data['specialite']  = $user->getSpecialite();
            $data['numeroOrdre'] = $user->getNumeroOrdre();
            $data['estValide']   = $user->isEstValide();
        }

        if ($user instanceof \App\Entity\Patient) {
            $data['groupeSanguin'] = $user->getGroupeSanguin();
            $data['allergies']     = $user->getAllergies() ?? [];
        }

        return $data;
    }
}
