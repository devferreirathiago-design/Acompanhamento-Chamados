-- ============================================================
-- Ativa RLS nas 3 tabelas e cria policies para o papel "anon"
-- (mesmo nível de acesso que já existe hoje sem login, só que
-- agora explícito e documentado — protege qualquer tabela nova
-- que você criar no futuro sem querer deixar aberta por engano)
--
-- Quando o login/permissões entrar em cena (fase futura do PRD),
-- essas policies devem ser trocadas para exigir "authenticated"
-- em vez de "anon", e idealmente filtrar por perfil/loja.
-- ============================================================

alter table chamados enable row level security;
alter table filiais enable row level security;
alter table historico_chamados enable row level security;

-- filiais: só leitura (é referência, não deve ser editada pela interface)
create policy "anon pode ler filiais"
  on filiais for select
  to anon
  using (true);

-- chamados: leitura, criação e atualização (abrir e tratar chamados)
create policy "anon pode ler chamados"
  on chamados for select
  to anon
  using (true);

create policy "anon pode inserir chamados"
  on chamados for insert
  to anon
  with check (true);

create policy "anon pode atualizar chamados"
  on chamados for update
  to anon
  using (true)
  with check (true);

-- historico_chamados: leitura e criação de novas entradas
create policy "anon pode ler historico"
  on historico_chamados for select
  to anon
  using (true);

create policy "anon pode inserir historico"
  on historico_chamados for insert
  to anon
  with check (true);

-- ============================================================
-- Bônus: reparo de um detalhe que ficou faltando no schema original.
-- id_pedido está como "not null" mas não como "unique" — hoje o
-- protótipo confere duplicidade só no navegador, o que não impede
-- duas pessoas de cadastrarem o mesmo pedido ao mesmo tempo.
-- Rode isso também (só funciona se não houver duplicatas hoje):
-- ============================================================

alter table chamados add constraint chamados_id_pedido_key unique (id_pedido);

