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
    id: row.id_pedido,
    numeroSic: row.numero_sic || "",
    filial: row.numero_filial,
    canal: row.canal_venda,
    modal: row.modal_logistico,
    valor: Number(row.valor_pedido),
    solicitante: row.solicitante,
    cadastradoPor: row.cadastrado_por,
    tipoOcorrencia: row.tipo_ocorrencia,
    status: row.status,
    proxima: row.responsavel_proxima_acao,
    descricao: row.descricao,
    criado: row.data_criacao,
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
  numeroSic,
  filial,
  canal,
  modal,
  valor,
  solicitante,
  cadastradoPor,
  tipoOcorrencia,
  descricao,
}) {
  const { data, error } = await supabase
    .from("chamados")
    .insert({
      id_pedido: idPedido,
      numero_sic: numeroSic || null,
      numero_filial: Number(filial),
      canal_venda: canal,
      modal_logistico: modal,
      valor_pedido: Number(valor),
      solicitante,
      cadastrado_por: cadastradoPor,
      tipo_ocorrencia: tipoOcorrencia,
      responsavel_proxima_acao: "Operação",
      descricao: descricao || "Sem descrição informada.",
    })
    .select()
    .single();
  if (error) throw error;
  const chamado = normalizeChamado(data);
  await addHistorico(chamado.dbId, cadastradoPor, "Chamado aberto.");
  return chamado;
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
      id_pedido: fields.id,
      numero_sic: fields.numeroSic || null,
      numero_filial: Number(fields.filial),
      canal_venda: fields.canal,
      modal_logistico: fields.modal,
      valor_pedido: Number(fields.valor),
      solicitante: fields.solicitante,
      tipo_ocorrencia: fields.tipoOcorrencia,
      status: fields.status,
      responsavel_proxima_acao: fields.proxima,
      descricao: fields.descricao || "Sem descrição informada.",
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
