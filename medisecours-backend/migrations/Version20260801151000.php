<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260801151000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Aligne le nom de l’index des étapes de protocole avec Doctrine.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER INDEX idx_protocole_etape_protocole RENAME TO IDX_E30866EFF77FB932');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER INDEX IDX_E30866EFF77FB932 RENAME TO idx_protocole_etape_protocole');
    }
}
