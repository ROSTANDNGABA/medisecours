<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Maladie;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:build-patient-disease-catalog',
    description: 'Selectionne exactement 200 fiches pour le catalogue patient.',
)]
final class BuildPatientDiseaseCatalogCommand extends Command
{
    private const TARGET_SIZE = 200;

    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        /** @var Maladie[] $maladies */
        $maladies = $this->entityManager->getRepository(Maladie::class)
            ->createQueryBuilder('m')
            ->leftJoin('m.symptomesStructures', 'ms')->addSelect('ms')
            ->leftJoin('m.premiersSoins', 'ps')->addSelect('ps')
            ->orderBy('m.id', 'ASC')
            ->getQuery()
            ->getResult();

        if (count($maladies) < self::TARGET_SIZE) {
            $output->writeln(sprintf('<error>Seulement %d maladies disponibles. Il en faut au moins %d.</error>', count($maladies), self::TARGET_SIZE));
            return Command::FAILURE;
        }

        $ranked = array_map(static function (Maladie $maladie): array {
            $score = 0;
            $score += $maladie->getSymptomesStructures()->count() > 0 ? 40 : 0;
            $score += $maladie->getPremiersSoins()->count() > 0 ? 25 : 0;
            $score += trim((string) $maladie->getSymptomes()) !== '' ? 15 : 0;
            $score += trim((string) $maladie->getDescription()) !== '' ? 10 : 0;
            $score += trim((string) $maladie->getCauses()) !== '' ? 5 : 0;
            $score += $maladie->isIsAccident() ? 5 : 0;

            return ['maladie' => $maladie, 'score' => $score];
        }, $maladies);

        usort($ranked, static function (array $a, array $b): int {
            $score = $b['score'] <=> $a['score'];
            return $score !== 0 ? $score : (($a['maladie']->getId() ?? 0) <=> ($b['maladie']->getId() ?? 0));
        });

        foreach ($maladies as $maladie) {
            $maladie
                ->setPatientVisible(false)
                ->setPatientPriority(null);
        }

        foreach (array_slice($ranked, 0, self::TARGET_SIZE) as $index => $row) {
            /** @var Maladie $maladie */
            $maladie = $row['maladie'];
            $maladie
                ->setPatientVisible(true)
                ->setPatientPriority($index + 1);
        }

        $this->entityManager->flush();
        $output->writeln('<info>200 fiches sont maintenant visibles dans le catalogue patient.</info>');
        $output->writeln('<comment>Cette selection repose sur la qualite et la completude des donnees disponibles.</comment>');

        return Command::SUCCESS;
    }
}
