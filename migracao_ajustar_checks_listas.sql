-- ============================================================
-- Corrige o erro "violates check constraint chamados_canal_venda_check"
-- que apareceu ao rodar a carga histórica.
--
-- O banco tem uma constraint de checagem (check) em várias colunas de
-- "chamados" que só aceita os valores que existiam nas listas do app
-- ANTES dessa rodada de mudanças. Como agora:
--   - "Logística" foi adicionado a CANAIS
--   - "Não entregue" e "Entregador atrasado" foram adicionados a
--     TIPO_OCORRENCIA_GRUPOS
--   - esses campos podem ficar em branco (chamado incompleto)
-- as constraints antigas rejeitam esses valores nas linhas.
--
-- Esse script derruba as constraints de canal_venda, modal_logistico,
-- solicitante, status e tipo_ocorrencia (sem precisar saber o nome
-- exato de cada uma) e recria todas já alinhadas com as listas atuais
-- de constants/chamados.js, permitindo também NULL (chamado
-- incompleto). Rode isso ANTES de tentar a carga histórica de novo.
--
-- ATUALIZAÇÃO: apareceu um segundo erro — "check constraint
-- chamados_tipo_ocorrencia_check is violated by some row" — ao tentar
-- ADICIONAR a constraint. Isso significa que já existe algum chamado
-- de verdade no banco (de antes dessa mudança) com um valor de tipo de
-- ocorrência que não está na lista atual do app. Como não dá pra saber
-- qual é esse valor sem acesso ao banco, as 5 constraints abaixo agora
-- são criadas com "NOT VALID": elas passam a valer pra qualquer
-- inserção ou edição NOVA a partir de agora, mas não voltam pra
-- validar (e travar) linhas que já existiam. Se quiser ver quais
-- linhas antigas têm valor fora da lista, rode as consultas comentadas
-- logo abaixo de cada "add constraint".
-- ============================================================

do $$
declare
  r record;
  colunas text[] := array['canal_venda', 'modal_logistico', 'solicitante', 'status', 'tipo_ocorrencia'];
  coluna text;
begin
  foreach coluna in array colunas loop
    for r in
      select conname
      from pg_constraint
      where conrelid = 'chamados'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%' || coluna || '%'
    loop
      execute format('alter table chamados drop constraint %I', r.conname);
    end loop;
  end loop;
end $$;

-- select distinct canal_venda from chamados where canal_venda is not null
--   and canal_venda not in ('VTEX', 'iFood', 'Rappi', 'Call Center', 'Logística');
alter table chamados add constraint chamados_canal_venda_check
  check (canal_venda is null or canal_venda in ('VTEX', 'iFood', 'Rappi', 'Call Center', 'Logística'))
  not valid;

-- select distinct modal_logistico from chamados where modal_logistico is not null
--   and modal_logistico not in ('Entrega Rápida', 'Entregador de Loja', 'Retirada em Loja', 'Coleta agendada');
alter table chamados add constraint chamados_modal_logistico_check
  check (modal_logistico is null or modal_logistico in ('Entrega Rápida', 'Entregador de Loja', 'Retirada em Loja', 'Coleta agendada'))
  not valid;

-- select distinct solicitante from chamados where solicitante is not null
--   and solicitante not in ('Loja', 'SAC');
alter table chamados add constraint chamados_solicitante_check
  check (solicitante is null or solicitante in ('Loja', 'SAC'))
  not valid;

-- select distinct status from chamados
--   where status not in ('Não iniciado', 'Em andamento', 'Aguardando Loja', 'Aguardando SAC', 'Aguardando Transportadora', 'Finalizado');
alter table chamados add constraint chamados_status_check
  check (status in ('Não iniciado', 'Em andamento', 'Aguardando Loja', 'Aguardando SAC', 'Aguardando Transportadora', 'Finalizado'))
  not valid;

-- select distinct tipo_ocorrencia from chamados where tipo_ocorrencia is not null
--   and tipo_ocorrencia not in (
--     'Cadastro de item', 'Devolução', 'Erro de estoque', 'Falta de item', 'Item avariado', 'Item incorreto', 'Troca',
--     'Coleta', 'Entrega concluída', 'Entregador atrasado', 'Entregador extra', 'Extravio', 'Falta de energia', 'Fora de rota', 'Não entregue', 'Reclamação sobre entregador', 'Reenvio',
--     'Comprovante de estorno', 'Cupom de desconto', 'PBM',
--     'Acareação', 'Cancelamento', 'Erro de integração', 'Erro FMS/PDV', 'Erro operacional', 'Solicitação incorreta', 'Verificação de status'
--   );
alter table chamados add constraint chamados_tipo_ocorrencia_check
  check (tipo_ocorrencia is null or tipo_ocorrencia in (
    'Cadastro de item', 'Devolução', 'Erro de estoque', 'Falta de item', 'Item avariado', 'Item incorreto', 'Troca',
    'Coleta', 'Entrega concluída', 'Entregador atrasado', 'Entregador extra', 'Extravio', 'Falta de energia', 'Fora de rota', 'Não entregue', 'Reclamação sobre entregador', 'Reenvio',
    'Comprovante de estorno', 'Cupom de desconto', 'PBM',
    'Acareação', 'Cancelamento', 'Erro de integração', 'Erro FMS/PDV', 'Erro operacional', 'Solicitação incorreta', 'Verificação de status'
  ))
  not valid;
