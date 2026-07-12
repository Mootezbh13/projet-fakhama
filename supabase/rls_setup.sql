-- ═══════════════════════════════════════════════════════════════════
-- FAKHAMA — Row-Level Security (RLS) Setup
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase :
--   Dashboard → SQL Editor → New query → coller ce fichier → Run
--
-- Principe : seuls les utilisateurs authentifiés (auth.role() = 'authenticated')
-- peuvent lire et modifier les données. La clé anon publique ne peut rien faire.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Activer RLS sur toutes les tables ─────────────────────────
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assurances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vignettes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburants    ENABLE ROW LEVEL SECURITY;

-- ── 2. Supprimer les anciennes policies si elles existent ─────────
DROP POLICY IF EXISTS "authenticated_all_bookings"     ON bookings;
DROP POLICY IF EXISTS "authenticated_all_maintenances" ON maintenances;
DROP POLICY IF EXISTS "authenticated_all_assurances"   ON assurances;
DROP POLICY IF EXISTS "authenticated_all_vignettes"    ON vignettes;
DROP POLICY IF EXISTS "authenticated_all_carburants"   ON carburants;

-- ── 3. Créer les policies : accès total aux utilisateurs connectés ─
-- bookings
CREATE POLICY "authenticated_all_bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- maintenances
CREATE POLICY "authenticated_all_maintenances"
  ON maintenances FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- assurances
CREATE POLICY "authenticated_all_assurances"
  ON assurances FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- vignettes
CREATE POLICY "authenticated_all_vignettes"
  ON vignettes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- carburants
CREATE POLICY "authenticated_all_carburants"
  ON carburants FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. Vérification (facultatif) ──────────────────────────────────
-- Après exécution, ces requêtes doivent retourner des lignes :
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('bookings','maintenances','assurances','vignettes','carburants');
