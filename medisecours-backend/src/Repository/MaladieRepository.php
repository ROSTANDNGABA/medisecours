<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Maladie;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Maladie>
 */
class MaladieRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Maladie::class);
    }

    /**
     * Recherche full-text PostgreSQL sur les maladies.
     *
     * Problème avec LIKE '%terme%' multi-colonnes :
     * - L'utilisateur tape "mal de tête fièvre" → aucun résultat car les mots
     *   sont dans des colonnes différentes (nom, symptomes, description)
     * - LIKE ne supporte pas la recherche multi-mots ni la tolérance aux fautes
     *
     * Solution : PostgreSQL tsvector + tsquery
     * - Recherche sur nom + symptomes + description + causes simultanément
     * - Pondération : nom (A, poids max) > symptomes (B) > description (C) > causes (D)
     * - to_tsquery gère la recherche multi-mots avec opérateur &
     * - plainto_tsquery tolère les phrases naturelles
     *
     * Index GIN créé dans la migration pour les performances à 200k+ utilisateurs.
     *
     * @param string $query     Terme(s) de recherche
     * @param int    $limit     Nombre de résultats max
     * @param int    $offset    Pour la pagination
     * @return Maladie[]
     */
    public function searchFullText(string $query, int $limit = 30, int $offset = 0): array
    {
        if (trim($query) === '') {
            return [];
        }

        // Nettoyage sécurisé de la requête
        $cleanQuery = preg_replace('/[^a-zA-ZÀ-ÿ0-9\s]/u', ' ', $query);
        $cleanQuery = trim(preg_replace('/\s+/', ' ', $cleanQuery));

        if ($cleanQuery === '') {
            return [];
        }

        $conn = $this->getEntityManager()->getConnection();

        // Recherche full-text avec classement par pertinence
        $sql = <<<SQL
            SELECT m.id,
                   ts_rank_cd(
                       setweight(to_tsvector('french', COALESCE(m.nom,         '')), 'A') ||
                       setweight(to_tsvector('french', COALESCE(m.symptomes,   '')), 'B') ||
                       setweight(to_tsvector('french', COALESCE(m.description, '')), 'C') ||
                       setweight(to_tsvector('french', COALESCE(m.causes,      '')), 'D'),
                       plainto_tsquery('french', :query)
                   ) AS rank
            FROM maladie m
            WHERE (
                setweight(to_tsvector('french', COALESCE(m.nom,         '')), 'A') ||
                setweight(to_tsvector('french', COALESCE(m.symptomes,   '')), 'B') ||
                setweight(to_tsvector('french', COALESCE(m.description, '')), 'C') ||
                setweight(to_tsvector('french', COALESCE(m.causes,      '')), 'D')
            ) @@ plainto_tsquery('french', :query)
            ORDER BY rank DESC
            LIMIT :limit OFFSET :offset
        SQL;

        $rows = $conn->executeQuery($sql, [
            'query'  => $cleanQuery,
            'limit'  => $limit,
            'offset' => $offset,
        ])->fetchAllAssociative();

        if (empty($rows)) {
            // Fallback ILIKE si aucun résultat full-text (termes très courts, mots-clés spéciaux)
            return $this->searchFallback($cleanQuery, $limit, $offset);
        }

        $ids           = array_column($rows, 'id');
        $rankById      = array_column($rows, 'rank', 'id');

        $entities = $this->createQueryBuilder('m')
            ->where('m.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();

        // Trier dans l'ordre de pertinence retourné par PostgreSQL
        usort($entities, fn($a, $b) =>
            ($rankById[$b->getId()] ?? 0) <=> ($rankById[$a->getId()] ?? 0)
        );

        return $entities;
    }

    /**
     * Fallback ILIKE multi-colonnes pour les requêtes trop courtes pour le full-text.
     * Utilisé si la recherche full-text ne retourne rien.
     *
     * @return Maladie[]
     */
    private function searchFallback(string $query, int $limit, int $offset): array
    {
        return $this->createQueryBuilder('m')
            ->where('LOWER(m.nom) LIKE :q OR LOWER(m.symptomes) LIKE :q OR LOWER(m.description) LIKE :q')
            ->setParameter('q', '%' . strtolower($query) . '%')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function save(Maladie $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Maladie $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
