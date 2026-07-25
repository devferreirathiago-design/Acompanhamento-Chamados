-- ============================================================
-- Migração: numero_sic -> id_solicitacao
--
-- Motivo: o campo deixou de servir só pro número do SIC. Agora
-- também recebem protocolo de atendimento do chat e outros
-- identificadores numéricos, cada um com um tamanho diferente.
-- Continua só dígitos, mas sem limite de 7 caracteres.
-- ============================================================

-- 0) CONFERÊNCIA ANTES DE RODAR (rode isso separado e olhe o resultado):
--    Se aparecer alguma linha, tem valor com letra/símbolo no meio dos
--    dados atuais e a constraint nova (passo 3) vai falhar até limpar.
--
-- select id, numero_sic from chamados where numero_sic !~ '^[0-9]+$';

-- 1) Renomeia a coluna (o Postgres atualiza sozinho as constraints
--    existentes pra apontar pro novo nome)
alter table chamados rename column numero_sic to id_solicitacao;

-- 2) Remove qualquer constraint de formato antiga que restringia esse
--    campo (ex: a de 7 dígitos), sem precisar saber o nome exato dela
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'chamados'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%id_solicitacao%'
  loop
    execute format('alter table chamados drop constraint %I', r.conname);
  end loop;
end $$;

-- 3) Nova regra: só dígitos (0-9), qualquer quantidade, sem teto de
--    tamanho. Campo vazio continua sendo gravado como NULL (o app já
--    faz isso), então NULL passa numa boa.
alter table chamados
  add constraint chamados_id_solicitacao_formato_check
  check (id_solicitacao is null or id_solicitacao ~ '^[0-9]+$');

-- 4) Renomeia a constraint de unicidade pra combinar com o novo nome
--    da coluna (ela continua ativa e funcionando durante todo o
--    processo — isso aqui é só estética/organização)
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'chamados'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%id_solicitacao%'
  loop
    execute format('alter table chamados rename constraint %I to chamados_id_solicitacao_key', r.conname);
  end loop;
end $$;
