<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260801153000 extends AbstractMigration
{
    public function getDescription(): string { return 'Aligne l’index de relecteur de protocole avec Doctrine.'; }
    public function up(Schema $schema): void { $this->addSql('ALTER INDEX idx_protocole_reviewed_by RENAME TO IDX_9D8A83A5FC6B21F1'); }
    public function down(Schema $schema): void { $this->addSql('ALTER INDEX IDX_9D8A83A5FC6B21F1 RENAME TO idx_protocole_reviewed_by'); }
}
