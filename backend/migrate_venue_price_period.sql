-- Migration: Ajout de la colonne price_period à la table venues
-- Cette migration ajoute la possibilité de définir la périodicité du prix (journalier, hebdomadaire, week-end, au choix)

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS price_period TEXT DEFAULT 'daily'
CHECK (price_period IN ('daily', 'weekly', 'weekend', 'custom'));

-- Mettre à jour tous les lieux existants avec la valeur par défaut 'daily'
UPDATE venues SET price_period = 'daily' WHERE price_period IS NULL;
