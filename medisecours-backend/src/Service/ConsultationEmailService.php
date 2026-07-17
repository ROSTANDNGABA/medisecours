<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Consultation;
use App\Entity\Prescription;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class ConsultationEmailService
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly string $appUrl,
        private readonly string $senderEmail,
        private readonly string $senderName,
    ) {
    }

    public function sendClosingEmail(Consultation $consultation, ?Prescription $prescription = null): void
    {
        $patient = $consultation->getPatient();
        $medecin = $consultation->getMedecin();
        if (!$patient || !$medecin) return;

        $patientEmail = $patient->getEmail();
        if (!$patientEmail) {
            $this->logger->warning('No patient email for closing notification', ['consultation' => $consultation->getId()]);
            return;
        }

        $prenom = htmlspecialchars($patient->getPrenom() ?? '', ENT_QUOTES);
        $nom = htmlspecialchars($patient->getNom() ?? '', ENT_QUOTES);
        $medPrenom = htmlspecialchars($medecin->getPrenom() ?? '', ENT_QUOTES);
        $medNom = htmlspecialchars($medecin->getNom() ?? '', ENT_QUOTES);
        $appUrl = rtrim($this->appUrl, '/');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Consultation terminée — MediSecours+</title></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; padding: 32px;">
    <h2 style="color: #1E3A5F;">MediSecours+ 🏥</h2>
    <div style="background: #D1FAE5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #065F46; font-weight: bold; font-size: 18px; margin: 0;">✅ Consultation terminée</p>
    </div>
    <p>Bonjour <strong>{$prenom} {$nom}</strong>,</p>
    <p>Votre consultation avec le <strong>Dr {$medPrenom} {$medNom}</strong> est terminée.</p>
    <p>Un récapitulatif de votre ordonnance est disponible dans votre espace patient.</p>
    <a href="{$appUrl}/patient/consultations" style="display:inline-block; margin: 20px 0; padding: 14px 28px; background: #1E3A5F; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      Voir mes consultations
    </a>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #9CA3AF; font-size: 12px;">
      Cet email a été envoyé à {$patientEmail}.<br>
      MediSecours+ — Plateforme médicale d'urgence — Cameroun
    </p>
  </div>
</body>
</html>
HTML;

        $text = "Bonjour {$prenom} {$nom},\n\nVotre consultation avec le Dr {$medPrenom} {$medNom} est terminée.\n\nConsultez votre ordonnance sur {$appUrl}/patient/consultations\n\nMediSecours+ — Cameroun";

        try {
            $email = (new Email())
                ->from(sprintf('%s <%s>', $this->senderName, $this->senderEmail))
                ->to($patientEmail)
                ->subject('MediSecours+ — Consultation terminée')
                ->html($html)
                ->text($text)
                ->priority(Email::PRIORITY_HIGH);

            if ($prescription) {
                $this->attachPrescriptionAsText($email, $prescription);
            }

            $this->mailer->send($email);
            $this->logger->info('Email de clôture envoyé.', ['consultation' => $consultation->getId(), 'email' => $patientEmail]);
        } catch (\Throwable $e) {
            $this->logger->error('Échec envoi email de clôture.', [
                'consultation' => $consultation->getId(),
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function attachPrescriptionAsText(Email $email, Prescription $prescription): void
    {
        $lines = [];
        $lines[] = 'ORDONNANCE MEDICALE';
        $lines[] = str_repeat('=', 50);
        $lines[] = '';
        $lines[] = "Diagnostic : {$prescription->getDiagnostic()}";
        $lines[] = '';
        $lines[] = 'Médicaments prescrits :';
        foreach ($prescription->getMedicaments() as $med) {
            $nom = $med['nom'] ?? 'Médicament';
            $posologie = $med['posologie'] ?? '';
            $duree = $med['duree'] ?? '';
            $lines[] = "  - {$nom}" . ($posologie ? " : {$posologie}" : '') . ($duree ? " ({$duree})" : '');
        }
        if ($prescription->getRecommandations()) {
            $lines[] = '';
            $lines[] = "Recommandations : {$prescription->getRecommandations()}";
        }
        $lines[] = '';
        $lines[] = 'MediSecours+ — Plateforme médicale d\'urgence';

        $email->attach(implode("\n", $lines), 'ordonnance.txt', 'text/plain');
    }
}
