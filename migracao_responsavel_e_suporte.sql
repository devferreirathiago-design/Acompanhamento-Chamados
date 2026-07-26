-- ============================================================
-- 1) Novo campo "responsável" (pessoa que está tratando o chamado).
--    Substitui de vez o antigo campo "Próxima ação" (que só indicava
--    um grupo genérico como "Operação"/"Loja"/"SAC"). Agora fica
--    registrado o nome de quem está com o chamado de fato.
--
-- 2) Renomeia o valor "Operação" para "Suporte" na coluna antiga
--    responsavel_proxima_acao. Essa coluna deixou de aparecer na
--    interface, mas continua existindo no banco (só pra não quebrar
--    a constraint de NOT NULL) — o app sempre grava "Suporte" nela
--    a partir de agora, tanto em chamados novos quanto na importação
--    rápida da fila.
--
-- Rode isso antes de publicar a versão nova do frontend.
-- ============================================================

alter table chamados add column if not exists responsavel_atual text;

-- Se existir alguma constraint de check em responsavel_proxima_acao
-- (mirrorando a lista antiga Operação/Loja/SAC/Transportadora), derruba —
-- esse campo não é mais editado por ninguém na interface, então não faz
-- sentido continuar restringindo os valores aceitos.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'chamados'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%responsavel_proxima_acao%'
  loop
    execute format('alter table chamados drop constraint %I', r.conname);
  end loop;
end $$;

update chamados
set responsavel_proxima_acao = 'Suporte'
where responsavel_proxima_acao = 'Operação';
