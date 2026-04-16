-- Permite que o proprietario visualize os instrutores atribuidos
-- somente as propriedades vinculadas ao proprio produtor.
--
-- Execute este arquivo no SQL Editor do Supabase depois do schema base.

CREATE OR REPLACE FUNCTION proprietario_pode_ver_atribuicao(p_id_propriedade INT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM propriedades p
    JOIN produtores pr ON pr.id = p.id_produtor
    WHERE p.id = p_id_propriedade
      AND pr.usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION proprietario_pode_ver_instrutor_atribuido(p_id_instrutor UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM atribuicoes a
    JOIN propriedades p ON p.id = a.id_propriedade
    JOIN produtores pr ON pr.id = p.id_produtor
    WHERE a.id_instrutor = p_id_instrutor
      AND a.ativa = true
      AND pr.usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION proprietario_pode_ver_propriedade(p_id_propriedade INT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT proprietario_pode_ver_atribuicao(p_id_propriedade);
$$;

GRANT EXECUTE ON FUNCTION proprietario_pode_ver_atribuicao(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION proprietario_pode_ver_instrutor_atribuido(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION proprietario_pode_ver_propriedade(INT) TO authenticated;

DROP POLICY IF EXISTS "atribuicoes: proprietario ve as das suas propriedades" ON atribuicoes;
CREATE POLICY "atribuicoes: proprietario ve as das suas propriedades"
  ON atribuicoes FOR SELECT
  USING (proprietario_pode_ver_atribuicao(id_propriedade));

DROP POLICY IF EXISTS "usuarios: proprietario ve instrutores atribuidos" ON usuarios;
CREATE POLICY "usuarios: proprietario ve instrutores atribuidos"
  ON usuarios FOR SELECT
  USING (
    perfil = 'instrutor'
    AND proprietario_pode_ver_instrutor_atribuido(id)
  );

DROP POLICY IF EXISTS "visitas: proprietario ve as das suas propriedades" ON visitas;
CREATE POLICY "visitas: proprietario ve as das suas propriedades"
  ON visitas FOR SELECT
  USING (
    dt_exclusao IS NULL
    AND proprietario_pode_ver_propriedade(id_propriedade)
  );
