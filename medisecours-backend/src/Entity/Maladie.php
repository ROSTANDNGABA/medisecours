<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Metadata\ApiFilter;
use App\Repository\MaladieRepository;
use App\State\MaladieSearchProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use App\Entity\MediaObject;

#[ORM\Entity(repositoryClass: MaladieRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        // Endpoint de recherche full-text PostgreSQL (multi-colonnes, multi-mots)
        new GetCollection(
            uriTemplate: '/maladies/search',
            provider: MaladieSearchProvider::class,
            description: 'Recherche full-text sur nom, symptômes, description et causes.'
        ),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Patch(security: "is_granted('ROLE_ADMIN')"),
        new Delete(security: "is_granted('ROLE_ADMIN')")
    ],
    normalizationContext: ['groups' => ['maladie:read']],
    denormalizationContext: ['groups' => ['maladie:write']],
    paginationEnabled: true,
    paginationItemsPerPage: 30,
    paginationMaximumItemsPerPage: 100
)]
// Filtres complets pour la recherche dans le catalogue (200k+ utilisateurs)
#[ApiFilter(SearchFilter::class, properties: [
    'nom'          => 'partial',   // Recherche textuelle sur le nom
    'symptomes'    => 'partial',   // Recherche dans les symptômes
    'description'  => 'partial',  // Recherche dans la description
    'causes'       => 'partial',  // Recherche dans les causes
    'categorie'    => 'exact',    // Filtrage par catégorie (id ou IRI)
    'niveauGravite' => 'exact',   // ex: ?niveauGravite=CRITIQUE
])]
#[ApiFilter(BooleanFilter::class, properties: ['urgence', 'contagieux', 'isAccident'])]
#[ApiFilter(OrderFilter::class, properties: ['nom', 'niveauGravite', 'createdAt'])]
class Maladie
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['maladie:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Le nom est obligatoire')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le nom doit contenir au moins {{ limit }} caractères', maxMessage: 'Le nom ne peut pas dépasser {{ limit }} caractères')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $nom = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank(message: 'La description est obligatoire')]
    #[Assert\Length(min: 10, max: 10000, minMessage: 'La description doit contenir au moins {{ limit }} caractères', maxMessage: 'La description ne peut pas dépasser {{ limit }} caractères')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $description = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 10000, maxMessage: 'Les symptômes ne peuvent pas dépasser {{ limit }} caractères')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $symptomes = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 10000, maxMessage: 'Les précautions ne peuvent pas dépasser {{ limit }} caractères')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $precautions = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 10000, maxMessage: 'Le traitement ne peut pas dépasser {{ limit }} caractères')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $traitement = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Le niveau de gravité est obligatoire')]
    #[Assert\Choice(
        choices: ['LÉGÈRE', 'MODÉRÉE', 'SÉVÈRE', 'CRITIQUE', 'VARIABLE'],
        message: 'Valeur invalide. Choix possibles : LÉGÈRE, MODÉRÉE, SÉVÈRE, CRITIQUE, VARIABLE.'
    )]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $niveauGravite = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Type(type: 'bool', message: 'Cette valeur doit être un booléen')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?bool $contagieux = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Type(type: 'bool', message: 'Cette valeur doit être un booléen')]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?bool $urgence = null;

    #[ORM\Column]
    #[Groups(['maladie:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['maladie:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\ManyToOne(inversedBy: 'maladies')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?Categorie $categorie = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $causes = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?bool $isAccident = false;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['maladie:read', 'maladie:write'])]
    private ?string $typeAccident = null;

    /**
     * @var Collection<int, PremierSoin>
     */
    #[ORM\OneToMany(targetEntity: PremierSoin::class, mappedBy: 'maladie', cascade: ['persist', 'remove'])]
    #[Groups(['maladie:read'])]
    private Collection $premiersSoins;

    /**
     * @var Collection<int, MediaObject>
     */
    #[ORM\OneToMany(targetEntity: MediaObject::class, mappedBy: 'maladie', cascade: ['persist', 'remove'])]
    #[Groups(['maladie:read', 'maladie:write'])]
    private Collection $images;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->premiersSoins = new ArrayCollection();
        $this->images = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNom(): ?string
    {
        return $this->nom;
    }

    public function setNom(string $nom): static
    {
        $this->nom = $nom;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getSymptomes(): ?string
    {
        return $this->symptomes;
    }

    public function setSymptomes(?string $symptomes): static
    {
        $this->symptomes = $symptomes;

        return $this;
    }

    public function getPrecautions(): ?string
    {
        return $this->precautions;
    }

    public function setPrecautions(?string $precautions): static
    {
        $this->precautions = $precautions;

        return $this;
    }

    public function getTraitement(): ?string
    {
        return $this->traitement;
    }

    public function setTraitement(?string $traitement): static
    {
        $this->traitement = $traitement;

        return $this;
    }

    public function getNiveauGravite(): ?string
    {
        return $this->niveauGravite;
    }

    public function setNiveauGravite(string $niveauGravite): static
    {
        $this->niveauGravite = $niveauGravite;

        return $this;
    }

    public function isContagieux(): ?bool
    {
        return $this->contagieux;
    }

    public function setContagieux(?bool $contagieux): static
    {
        $this->contagieux = $contagieux;

        return $this;
    }

    public function isUrgence(): ?bool
    {
        return $this->urgence;
    }

    public function setUrgence(?bool $urgence): static
    {
        $this->urgence = $urgence;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getCategorie(): ?Categorie
    {
        return $this->categorie;
    }

    public function setCategorie(?Categorie $categorie): static
    {
        $this->categorie = $categorie;

        return $this;
    }

    public function getCauses(): ?string
    {
        return $this->causes;
    }

    public function setCauses(?string $causes): static
    {
        $this->causes = $causes;

        return $this;
    }

    public function isIsAccident(): ?bool
    {
        return $this->isAccident;
    }

    public function setIsAccident(?bool $isAccident): static
    {
        $this->isAccident = $isAccident;

        return $this;
    }

    public function getTypeAccident(): ?string
    {
        return $this->typeAccident;
    }

    public function setTypeAccident(?string $typeAccident): static
    {
        $this->typeAccident = $typeAccident;

        return $this;
    }

    /**
     * @return Collection<int, PremierSoin>
     */
    public function getPremiersSoins(): Collection
    {
        return $this->premiersSoins;
    }

    public function addPremierSoin(PremierSoin $premierSoin): static
    {
        if (!$this->premiersSoins->contains($premierSoin)) {
            $this->premiersSoins->add($premierSoin);
            $premierSoin->setMaladie($this);
        }

        return $this;
    }

    public function removePremierSoin(PremierSoin $premierSoin): static
    {
        if ($this->premiersSoins->removeElement($premierSoin)) {
            if ($premierSoin->getMaladie() === $this) {
                $premierSoin->setMaladie(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, MediaObject>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MediaObject $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setMaladie($this);
        }

        return $this;
    }

    public function removeImage(MediaObject $image): static
    {
        if ($this->images->removeElement($image) && $image->getMaladie() === $this) {
            $image->setMaladie(null);
        }

        return $this;
    }
}
