import { supabase } from "./supabaseClient";

export function normalizeFilial(row) {
  return {
    numero: row.numero_filial,
    nome: row.nome_filial,
    bandeira: row.bandeira,
    regional: row.regional || "",
  };
}

export function normalizeChamado(row) {
  return {
    dbId: row.id,
    id: row.id_pedido || "",
    idSolicitacao: row.id_solicitacao || "",
    filial: row.numero_filial,
    canal: row.canal_venda || "",
    modal: row.modal_logistico || "",
    valor: row.valor_pedido == null ? null : Number(row.valor_pedido),
    solicitante: row.solicitante || "",
    cadastradoPor: row.cadastrado_por,
    tipoOcorrencia: row.tipo_ocorrencia || "",
    status: row.status,
    proxima: row.responsavel_proxima_acao,
    descricao: row.descricao,
    criado: row.data_criacao,
    perda: row.perda,
    ordem: row.ordem,
  };
}

export async function fetchFiliais() {
  const { data, error } = await supabase
    .from("filiais")
    .select("numero_filial, nome_filial, bandeira, regional")
    .order("numero_filial", { ascending: true });
  if (error) throw error;
  return data.map(normalizeFilial);
}

export async function createFilial({ numero, nome, bandeira, regional }) {
  const { data, error } = await supabase
    .from("filiais")
    .insert({
      numero_filial: Number(numero),
      nome_filial: nome,
      bandeira,
      regional: regional || null,
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeFilial(data);
}

export async function updateFilial(numero, { nome, bandeira, regional }) {
  const { data, error } = await supabase
    .from("filiais")
    .update({
      nome_filial: nome,
      bandeira,
      regional: regional || null,
    })
    .eq("numero_filial", numero)
    .select()
    .single();
  if (error) throw error;
  return normalizeFilial(data);
}

export async function fetchChamados() {
  const { data, error } = await supabase
    .from("chamados")
    .select("*")
    .order("data_criacao", { ascending: false });
  if (error) throw error;
  return data.map(normalizeChamado);
}

export function normalizeHistorico(row) {
  return {
    id: row.id,
    chamadoId: row.chamado_id,
    usuario: row.usuario,
    dataHora: row.data_hora,
    descricao: row.descricao,
  };
}

export async function fetchHistorico(chamadoDbId) {
  const { data, error } = await supabase
    .from("historico_chamados")
    .select("*")
    .eq("chamado_id", chamadoDbId)
    .order("data_hora", { ascending: true });
  if (error) throw error;
  return data.map(normalizeHistorico);
}

export async function addHistorico(chamadoDbId, usuario, descricao) {
  const { error } = await supabase
    .from("historico_chamados")
    .insert({ chamado_id: chamadoDbId, usuario, descricao });
  if (error) throw error;
}

export async function createChamado({
  idPedido,
  idSolicitacao,
  filial,
  canal,
  modal,
  valor,
  solicitante,
  cadastradoPor,
  tipoOcorrencia,
  descricao,
  perda,
  ordem,
  criadoEm,
}) {
  const linha = {
    id_pedido: idPedido || null,
    id_solicitacao: idSolicitacao || null,
    numero_filial: filial ? Number(filial) : null,
    canal_venda: canal || null,
    modal_logistico: modal || null,
    valor_pedido: valor ? Number(valor) : null,
    solicitante: solicitante || null,
    cadastrado_por: cadastradoPor,
    tipo_ocorrencia: tipoOcorrencia || null,
    responsavel_proxima_acao: "Operação",
    descricao: descricao || "Sem descrição informada.",
    perda: perda ?? null,
    ordem: ordem ?? null,
  };
  if (criadoEm) linha.data_criacao = criadoEm;

  const { data, error } = await supabase
    .from("chamados")
    .insert(linha)
    .select()
    .single();
  if (error) throw error;
  const chamado = normalizeChamado(data);
  await addHistorico(chamado.dbId, cadastradoPor, "Chamado aberto.");
  return chamado;
}

// Criação em lote pra importação rápida da fila: só id de solicitação +
// data de abertura. O resto fica em branco até alguém completar pela
// tela de edição (o chamado aparece com a tag "Preencher dados").
export async function createChamadosRapidos(lista, cadastradoPor) {
  const linhas = lista.map((item) => ({
    id_solicitacao: item.idSolicitacao || null,
    // Preenche null explicitamente (em vez de omitir a chave) porque
    // algumas colunas têm valor padrão '' no banco — se a gente só
    // omitisse, o Postgres usaria o padrão em vez de deixar em branco,
    // e '' não bate com nenhum valor aceito pelas constraints de check.
    id_pedido: null,
    numero_filial: null,
    canal_venda: null,
    modal_logistico: null,
    valor_pedido: null,
    solicitante: null,
    tipo_ocorrencia: null,
    perda: null,
    ordem: null,
    cadastrado_por: cadastradoPor,
    responsavel_proxima_acao: "Operação",
    descricao: "Importado da fila — aguardando preenchimento dos dados.",
    // Sempre manda data_criacao (nunca omite): num insert em lote, o
    // Supabase monta um único INSERT com a união das colunas de todas
    // as linhas — se só ALGUMAS linhas tivessem essa chave, as outras
    // receberiam NULL explícito nessa coluna (e não o padrão now() do
    // banco), o que quebra a constraint de "not null". Por isso, se
    // não veio data reconhecida da planilha, usa a data de agora.
    data_criacao: item.criadoEm || new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("chamados").insert(linhas).select();
  if (error) throw error;
  const chamados = data.map(normalizeChamado);

  const historicoLinhas = chamados.map((c) => ({
    chamado_id: c.dbId,
    usuario: cadastradoPor,
    descricao: "Chamado importado da fila (dados pendentes de preenchimento).",
  }));
  const { error: histError } = await supabase.from("historico_chamados").insert(historicoLinhas);
  if (histError) throw histError;

  return chamados;
}

export async function updateChamadoStatus(dbId, statusAnterior, novoStatus, usuario) {
  const { data, error } = await supabase
    .from("chamados")
    .update({ status: novoStatus })
    .eq("id", dbId)
    .select()
    .single();
  if (error) throw error;
  await addHistorico(
    dbId,
    usuario,
    `Status alterado de "${statusAnterior}" para "${novoStatus}".`
  );
  return normalizeChamado(data);
}

export async function updateChamado(dbId, fields, usuario, resumoMudancas) {
  const { data, error } = await supabase
    .from("chamados")
    .update({
      id_pedido: fields.id || null,
      id_solicitacao: fields.idSolicitacao || null,
      numero_filial: fields.filial ? Number(fields.filial) : null,
      canal_venda: fields.canal || null,
      modal_logistico: fields.modal || null,
      valor_pedido: fields.valor ? Number(fields.valor) : null,
      solicitante: fields.solicitante || null,
      tipo_ocorrencia: fields.tipoOcorrencia || null,
      status: fields.status,
      responsavel_proxima_acao: fields.proxima,
      descricao: fields.descricao || "Sem descrição informada.",
      perda: fields.perda ?? null,
      ordem: fields.ordem === "" || fields.ordem == null ? null : Number(fields.ordem),
    })
    .eq("id", dbId)
    .select()
    .single();
  if (error) throw error;
  await addHistorico(
    dbId,
    usuario,
    resumoMudancas || "Chamado editado."
  );
  return normalizeChamado(data);
}

export async function deleteChamado(dbId) {
  const { error } = await supabase.from("chamados").delete().eq("id", dbId);
  if (error) throw error;
}

// ---------------------------------------------------------------
// Realtime — mantém o painel sincronizado entre abas/usuários
// sem precisar recarregar a página.
// ---------------------------------------------------------------

export function subscribeToChamados({ onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel("realtime-chamados")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chamados" },
      (payload) => {
        console.log("[realtime] INSERT chamados", payload);
        onInsert?.(normalizeChamado(payload.new));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chamados" },
      (payload) => {
        console.log("[realtime] UPDATE chamados", payload);
        onUpdate?.(normalizeChamado(payload.new));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "chamados" },
      (payload) => {
        console.log("[realtime] DELETE chamados", payload);
        onDelete?.(payload.old.id);
      }
    )
    .subscribe((status, err) => {
      console.log("[realtime] status do canal 'realtime-chamados':", status, err || "");
    });

  return () => supabase.removeChannel(channel);
}

export function subscribeToHistorico(chamadoDbId, onInsert) {
  const channel = supabase
    .channel(`realtime-historico-${chamadoDbId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "historico_chamados",
        filter: `chamado_id=eq.${chamadoDbId}`,
      },
      (payload) => onInsert(normalizeHistorico(payload.new))
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
