<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use App\Repository\PrescriptionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: PrescriptionRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_MEDECIN') or is_granted('ROLE_PATIENT')"),
        new Get(security: "is_granted('ROLE_ADMIN') or object.getMedecin() == user or object.getPatient() == user"),
        new Post(security: "is_granted('ROLE_MEDECIN')", processor: \App\State\PrescriptionProcessor::class),
        new Patch(security: "is_granted('ROLE_MEDECIN') and object.getMedecin() == user"),
    ],
    normalizationContext: ['groups' => ['prescription:read']],
    denormalizationContext: ['groups' => ['prescription:write']],
)]
class Prescription
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['prescription:read', 'consultation:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'prescriptions')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['prescription:read', 'prescription:write'])]
    private ?Consultation $consultation = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['prescription:read'])]
    private ?Medecin $medecin = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['prescription:read'])]
    private ?Patient $patient = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    #[Groups(['prescription:read', 'prescription:write'])]
    private ?string $diagnostic = null;

    #[ORM\Column(type: Types::JSON)]
    #[Assert\NotBlank]
    #[Groups(['prescription:read', 'prescription:write'])]
    private array $medicaments = [];

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prescription:read', 'prescription:write'])]
    private ?string $recommandations = null;

    #[ORM\Column]
    #[Groups(['prescription:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getConsultation(): ?Consultation { return $this->consultation; }
    public function setConsultation(?Consultation $consultation): static { $this->consultation = $consultation; return $this; }

    public function getMedecin(): ?Medecin { return $this->medecin; }
    public function setMedecin(?Medecin $medecin): static { $this->medecin = $medecin; return $this; }

    public function getPatient(): ?Patient { return $this->patient; }
    public function setPatient(?Patient $patient): static { $this->patient = $patient; return $this; }

    public function getDiagnostic(): ?string { return $this->diagnostic; }
    public function setDiagnostic(?string $diagnostic): static { $this->diagnostic = $diagnostic; return $this; }

    public function getMedicaments(): array { return $this->medicaments; }
    public function setMedicaments(array $medicaments): static { $this->medicaments = $medicaments; return $this; }

    public function getRecommandations(): ?string { return $this->recommandations; }
    public function setRecommandations(?string $recommandations): static { $this->recommandations = $recommandations; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
