-- ============================================================
-- Migração: campos "perda" e "ordem" + chamados incompletos
--
-- Motivo: agora dá pra criar um chamado só com o número de
-- solicitação e a data de abertura (importação rápida da fila),
-- preenchendo o resto manualmente depois. Pra isso, os campos que
-- hoje são obrigatórios no banco precisam aceitar ficar em branco
-- até alguém completar pela tela de edição.
-- ============================================================

-- 1) Novas colunas
--    perda: se a loja teve perda financeira dos itens (Sim/Não na
--    planilha -> true/false aqui; NULL = não informado)
--    ordem: prioridade/ordem de tratamento (vem da planilha de
--    acompanhamento; a maioria é 3, alguns são 1 ou 2)
alter table chamados add column if not exists perda boolean;
alter table chamados add column if not exists ordem integer;

-- 2) Derruba a exigência de preenchimento nesses campos. Rodar
--    "drop not null" numa coluna que já aceita nulo não dá erro,
--    então é seguro rodar isso mesmo se parte já estiver assim.
alter table chamados alter column id_pedido drop not null;
alter table chamados alter column numero_filial drop not null;
alter table chamados alter column canal_venda drop not null;
alter table chamados alter column modal_logistico drop not null;
alter table chamados alter column valor_pedido drop not null;
alter table chamados alter column tipo_ocorrencia drop not null;
alter table chamados alter column solicitante drop not null;
