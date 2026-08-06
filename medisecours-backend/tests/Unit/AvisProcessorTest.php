<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Avis;
use App\Entity\Medecin;
use App\Entity\Patient;
use App\Repository\AvisRepository;
use App\Repository\ConsultationRepository;
use App\State\AvisProcessor;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

final class AvisProcessorTest extends TestCase
{
    public function testPatientCanLeaveAnAvisAfterACompletedConsultation(): void
    {
        $patient = (new Patient())->setNom('Patient');
        $medecin = (new Medecin())->setNom('Test');
        $avis = (new Avis())->setMedecin($medecin)->setNote(4);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($patient);

        $consultationRepository = $this->createMock(ConsultationRepository::class);
        $consultationRepository->method('hasCompletedConsultation')->willReturn(true);

        $avisRepository = $this->createMock(AvisRepository::class);
        $avisRepository->method('existsForPatientAndMedecin')->willReturn(false);

        $persistProcessor = $this->createMock(ProcessorInterface::class);
        $persistProcessor->expects(self::once())->method('process')->willReturnArgument(0);

        $processor = new AvisProcessor(
            $persistProcessor,
            $security,
            $consultationRepository,
            $avisRepository
        );

        $result = $processor->process($avis, new Post());

        self::assertSame($patient, $avis->getPatient());
        self::assertSame($avis, $result);
    }

    public function testAvisRequiresACompletedConsultation(): void
    {
        $patient = (new Patient())->setNom('Patient');
        $medecin = (new Medecin())->setNom('Test');
        $avis = (new Avis())->setMedecin($medecin)->setNote(4);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($patient);

        $consultationRepository = $this->createMock(ConsultationRepository::class);
        $consultationRepository->method('hasCompletedConsultation')->willReturn(false);

        $avisRepository = $this->createMock(AvisRepository::class);
        $avisRepository->method('existsForPatientAndMedecin')->willReturn(false);

        $persistProcessor = $this->createMock(ProcessorInterface::class);
        $persistProcessor->expects(self::never())->method('process');

        $processor = new AvisProcessor(
            $persistProcessor,
            $security,
            $consultationRepository,
            $avisRepository
        );

        $this->expectException(AccessDeniedHttpException::class);
        $processor->process($avis, new Post());
    }

    public function testDuplicateAvisForSameMedecinIsRejected(): void
    {
        $patient = (new Patient())->setNom('Patient');
        $medecin = (new Medecin())->setNom('Test');
        $avis = (new Avis())->setMedecin($medecin)->setNote(4);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($patient);

        $consultationRepository = $this->createMock(ConsultationRepository::class);
        $consultationRepository->method('hasCompletedConsultation')->willReturn(true);

        $avisRepository = $this->createMock(AvisRepository::class);
        $avisRepository->method('existsForPatientAndMedecin')->willReturn(true);

        $persistProcessor = $this->createMock(ProcessorInterface::class);
        $persistProcessor->expects(self::never())->method('process');

        $processor = new AvisProcessor(
            $persistProcessor,
            $security,
            $consultationRepository,
            $avisRepository
        );

        $this->expectException(UnprocessableEntityHttpException::class);
        $processor->process($avis, new Post());
    }
}
