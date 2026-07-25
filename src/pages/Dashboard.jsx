import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Copy, Check, Pencil, AlertTriangle, Loader2, History, Trash2, ChevronDown, X } from "lucide-react";
import {
  fetchFiliais,
  fetchChamados,
  fetchHistorico,
  updateChamadoStatus,
  updateChamado,
  deleteChamado,
  subscribeToChamados,
  subscribeToHistorico,
} from "../services/chamados";
import {
  CANAIS,
  MODAIS,
  SOLICITANTES,
  STATUS_LIST,
  STATUS_META,
  PARTY_META,
  PARTY_LIST,
  BANDEIRA_COLOR,
  TIPO_OCORRENCIA_GRUPOS,
  filialInfo,
  formatDate,
  timeAgo,
  urgencyColor,
  chamadoIncompleto,
  camposFaltando,
} from "../constants/chamados";

export default function Dashboard() {
  const { usuario } = useOutletContext();
  const [filiais, setFiliais] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [historicos, setHistoricos] = useState({});
  const [historicoAberto, setHistoricoAberto] = useState({});
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [fStatusList, setFStatusList] = useState([]);
  const [fBandeira, setFBandeira] = useState("Todas");
  const [fFilial, setFFilial] = useState("Todas");
  const [fSolicitante, setFSolicitante] = useState("Todos");
  const [statusMenuAberto, setStatusMenuAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");

  const [copiedId, setCopiedId] = useState(null);
  const [copiedSolicitacao, setCopiedSolicitacao] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErro, setEditErro] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      try {
        const [f, c] = await Promise.all([fetchFiliais(), fetchChamados()]);
        if (!vivo) return;
        setFiliais(f);
        setChamados(c);
        setLoadError("");
      } catch (err) {
        if (vivo) setLoadError(`Não consegui carregar do Supabase: ${err.message}`);
      } finally {
        if (vivo) setLoading(false);
      }
    }
    carregar();
    return () => {
      vivo = false;
    };
  }, []);

  // Mantém o painel sincronizado ao vivo — se outra pessoa (ou outra aba)
  // criar, editar ou mudar o status de um chamado, aparece aqui na hora.
  useEffect(() => {
    const unsubscribe = subscribeToChamados({
      onInsert: (novo) => {
        setChamados((prev) => (prev.some((c) => c.dbId === novo.dbId) ? prev : [novo, ...prev]));
      },
      onUpdate: (atualizado) => {
        setChamados((prev) =>
          prev.map((c) => (c.dbId === atualizado.dbId ? atualizado : c))
        );
      },
      onDelete: (dbId) => {
        setChamados((prev) => prev.filter((c) => c.dbId !== dbId));
      },
    });
    return unsubscribe;
  }, []);

  const counts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = chamados.filter((c) => c.status === s).length;
    return acc;
  }, {});

  const filtrados = useMemo(() => {
    const lista = chamados
      .filter((c) => fStatusList.length === 0 || fStatusList.includes(c.status))
      .filter((c) => {
        if (fBandeira === "Todas") return true;
        return filialInfo(filiais, c.filial)?.bandeira === fBandeira;
      })
      .filter((c) => fFilial === "Todas" || String(c.filial) === String(fFilial))
      .filter((c) => fSolicitante === "Todos" || c.solicitante === fSolicitante)
      .filter((c) => {
        if (!busca.trim()) return true;
        const f = filialInfo(filiais, c.filial);
        return `${c.id} ${c.idSolicitacao ?? ""} ${f?.nome ?? ""}`
          .toLowerCase()
          .includes(busca.toLowerCase());
      });

    if (ordenacao === "antigos") {
      return [...lista].sort((a, b) => new Date(a.criado) - new Date(b.criado));
    }

    if (ordenacao === "atraso") {
      // Chamados ainda não finalizados, do mais parado pro mais recente;
      // finalizados vão pro fim, já que não têm mais urgência.
      const abertos = lista
        .filter((c) => c.status !== "Finalizado")
        .sort((a, b) => new Date(a.criado) - new Date(b.criado));
      const finalizados = lista
        .filter((c) => c.status === "Finalizado")
        .sort((a, b) => new Date(b.criado) - new Date(a.criado));
      return [...abertos, ...finalizados];
    }

    // "recentes" (padrão)
    return [...lista].sort((a, b) => new Date(b.criado) - new Date(a.criado));
  }, [chamados, filiais, fStatusList, fBandeira, fFilial, fSolicitante, busca, ordenacao]);

  // `expanded`/`editingId` guardam o dbId (chave interna do Supabase), nunca
  // o id_pedido — o pedido pode ficar vazio (chamado incompleto) ou repetido
  // (SAC liga de novo pro mesmo pedido), então não serve como identidade.

  // Enquanto um card estiver aberto, escuta novas entradas de histórico
  // (ex: outra pessoa editando o mesmo chamado) e adiciona na timeline ao vivo.
  useEffect(() => {
    if (!expanded) return;
    const unsubscribe = subscribeToHistorico(expanded, (novoItem) => {
      setHistoricos((prev) => {
        const atual = prev[expanded] || [];
        if (atual.some((h) => h.id === novoItem.id)) return prev;
        return { ...prev, [expanded]: [...atual, novoItem] };
      });
    });
    return unsubscribe;
  }, [expanded]);

  function toggleExpand(c) {
    setExpanded(expanded === c.dbId ? null : c.dbId);
  }

  function toggleStatusFiltro(s) {
    setFStatusList((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleHistorico(c) {
    const abrindo = !historicoAberto[c.dbId];
    setHistoricoAberto((prev) => ({ ...prev, [c.dbId]: abrindo }));
    if (abrindo && !historicos[c.dbId]) {
      setLoadingHistorico(true);
      fetchHistorico(c.dbId)
        .then((items) => setHistoricos((prev) => ({ ...prev, [c.dbId]: items })))
        .catch((err) => setActionError(`Não consegui carregar o histórico: ${err.message}`))
        .finally(() => setLoadingHistorico(false));
    }
  }

  function copyToClipboard(value) {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // sem suporte a clipboard neste navegador
      }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(fallback);
    } else {
      fallback();
    }
  }

  function copyId(id) {
    copyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
  }

  function copySolicitacao(value) {
    copyToClipboard(value);
    setCopiedSolicitacao(value);
    setTimeout(() => setCopiedSolicitacao((cur) => (cur === value ? null : cur)), 1500);
  }

  async function quickStatusChange(chamado, novoStatus) {
    const anterior = chamado.status;
    setChamados((prev) =>
      prev.map((c) => (c.dbId === chamado.dbId ? { ...c, status: novoStatus } : c))
    );
    try {
      await updateChamadoStatus(chamado.dbId, anterior, novoStatus, usuario);
      setActionError("");
      if (historicos[chamado.dbId]) {
        fetchHistorico(chamado.dbId).then((items) =>
          setHistoricos((prev) => ({ ...prev, [chamado.dbId]: items }))
        );
      }
    } catch (err) {
      setChamados((prev) =>
        prev.map((c) => (c.dbId === chamado.dbId ? { ...c, status: anterior } : c))
      );
      setActionError(`Não consegui atualizar o status: ${err.message}`);
    }
  }

  async function confirmarExclusao(chamado) {
    setExcluindo(true);
    try {
      await deleteChamado(chamado.dbId);
      setChamados((prev) => prev.filter((c) => c.dbId !== chamado.dbId));
      setExpanded(null);
      setConfirmandoExclusao(null);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setActionError(`Não consegui excluir o chamado: ${err.message}`);
    } finally {
      setExcluindo(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.dbId);
    setEditForm({ ...c, valor: c.valor == null ? "" : String(c.valor) });
    setEditErro("");
    setExpanded(c.dbId);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditErro("");
  }

  function resumoDeMudancas(original, editado) {
    const partes = [];
    const comparar = (label, antes, depois, formatar = (v) => v) => {
      if (String(antes) !== String(depois)) {
        partes.push(`${label}: ${formatar(antes)} → ${formatar(depois)}`);
      }
    };
    comparar("ID do pedido", original.id, editado.id.trim());
    comparar("ID de solicitação", original.idSolicitacao || "—", editado.idSolicitacao.trim() || "—");
    comparar("Tipo de ocorrência", original.tipoOcorrencia, editado.tipoOcorrencia);
    comparar("Filial", original.filial, Number(editado.filial), (v) => {
      const f = filialInfo(filiais, v);
      return f ? f.nome : v;
    });
    comparar("Canal", original.canal, editado.canal);
    comparar("Modal logístico", original.modal, editado.modal);
    comparar("Solicitante", original.solicitante, editado.solicitante);
    comparar("Status", original.status, editado.status);
    comparar("Próxima ação", original.proxima, editado.proxima);
    comparar(
      "Valor",
      original.valor,
      Number(editado.valor),
      (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
    );
    comparar("Ordem/prioridade", original.ordem ?? "—", editado.ordem === "" ? "—" : editado.ordem);
    comparar("Perda financeira", !!original.perda, !!editado.perda, (v) => (v ? "Sim" : "Não"));
    if (original.descricao !== editado.descricao.trim()) {
      partes.push("Descrição atualizada");
    }
    return partes.length ? partes.join("; ") + "." : "Chamado salvo sem alterações de valor.";
  }

  async function saveEdit(e) {
    e.preventDefault();
    const novoId = editForm.id.trim();
    if (!novoId) {
      setEditErro("Informe o ID do pedido.");
      return;
    }
    if (!editForm.idSolicitacao.trim()) {
      setEditErro("Informe o ID de solicitação.");
      return;
    }
    if (
      chamados.some(
        (c) => c.idSolicitacao === editForm.idSolicitacao.trim() && c.dbId !== editForm.dbId
      )
    ) {
      setEditErro("Já existe um chamado com esse ID de solicitação.");
      return;
    }
    if (!editForm.filial) {
      setEditErro("Selecione a filial.");
      return;
    }
    if (!editForm.canal) {
      setEditErro("Selecione o canal de venda.");
      return;
    }
    if (!editForm.modal) {
      setEditErro("Selecione o modal logístico.");
      return;
    }
    if (!editForm.solicitante) {
      setEditErro("Selecione o solicitante.");
      return;
    }
    if (!editForm.tipoOcorrencia) {
      setEditErro("Selecione o tipo de ocorrência.");
      return;
    }
    if (!editForm.valor || Number(editForm.valor) <= 0) {
      setEditErro("Informe um valor de pedido válido.");
      return;
    }
    setEditErro("");
    try {
      const original = chamados.find((c) => c.dbId === editForm.dbId);
      const resumo = resumoDeMudancas(original, editForm);
      const atualizado = await updateChamado(editForm.dbId, editForm, usuario, resumo);
      setChamados((prev) =>
        prev.map((c) => (c.dbId === editForm.dbId ? atualizado : c))
      );
      setExpanded(atualizado.dbId);
      setEditingId(null);
      setEditForm(null);
      fetchHistorico(editForm.dbId).then((items) =>
        setHistoricos((prev) => ({ ...prev, [editForm.dbId]: items }))
      );
    } catch (err) {
      setEditErro(`Não consegui salvar no Supabase: ${err.message}`);
    }
  }

  return (
    <>
      {loading && (
        <div className="sh-toast" style={{ background: "rgba(79,143,232,0.12)", borderColor: "#4f8fe8", color: "#bcd6f7" }}>
          <Loader2 size={16} className="sh-spin" />
          Carregando dados do Supabase...
        </div>
      )}
      {loadError && (
        <div className="sh-toast" style={{ background: "rgba(232,162,61,0.12)", borderColor: "#e8a23d", color: "#f3d3a3" }}>
          <AlertTriangle size={16} />
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="sh-toast" style={{ background: "rgba(232,115,93,0.12)", borderColor: "#e8735d", color: "#f3b6ab" }}>
          <AlertTriangle size={16} />
          {actionError}
        </div>
      )}

      <div className="sh-stats">
        <div
          className={`sh-stat ${fStatusList.length === 0 ? "active" : ""}`}
          style={{ "--dot": "var(--accent)" }}
          onClick={() => setFStatusList([])}
        >
          <div className="sh-stat-num" style={{ color: "var(--accent)" }}>
            {chamados.length}
          </div>
          <div className="sh-stat-label">Todos</div>
        </div>
        {STATUS_LIST.map((s) => (
          <div
            key={s}
            className={`sh-stat ${fStatusList.includes(s) ? "active" : ""}`}
            style={{ "--dot": STATUS_META[s].color }}
            onClick={() => toggleStatusFiltro(s)}
          >
            <div className="sh-stat-num" style={{ color: STATUS_META[s].color }}>
              {counts[s]}
            </div>
            <div className="sh-stat-label">{s}</div>
          </div>
        ))}
      </div>

      <div className="sh-toolbar">
        <div className="sh-filter-group" style={{ flex: 1, minWidth: 200 }}>
          <label className="sh-filter-label">Buscar</label>
          <div className="sh-search">
            <Search size={14} />
            <input
              placeholder="ID do pedido, ID de solicitação ou filial..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="sh-filter-group" style={{ position: "relative" }}>
          <label className="sh-filter-label">Status</label>
          <button
            type="button"
            className="sh-select sh-multiselect-btn"
            onClick={() => setStatusMenuAberto((o) => !o)}
          >
            {fStatusList.length === 0
              ? "Todos"
              : `${fStatusList.length} selecionado${fStatusList.length > 1 ? "s" : ""}`}
            <ChevronDown size={13} />
          </button>
          {statusMenuAberto && (
            <div className="sh-multiselect-panel">
              {STATUS_LIST.map((s) => (
                <label key={s} className="sh-multiselect-option">
                  <input
                    type="checkbox"
                    checked={fStatusList.includes(s)}
                    onChange={() => toggleStatusFiltro(s)}
                  />
                  {s}
                </label>
              ))}
              {fStatusList.length > 0 && (
                <button
                  type="button"
                  className="sh-multiselect-clear"
                  onClick={() => setFStatusList([])}
                >
                  <X size={11} /> Limpar seleção
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sh-filter-group">
          <label className="sh-filter-label">Bandeira</label>
          <select className="sh-select" value={fBandeira} onChange={(e) => setFBandeira(e.target.value)}>
            <option value="Todas">Todas</option>
            {Object.keys(BANDEIRA_COLOR).map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="sh-filter-group">
          <label className="sh-filter-label">Filial</label>
          <select className="sh-select" value={fFilial} onChange={(e) => setFFilial(e.target.value)}>
            <option value="Todas">Todas</option>
            {filiais.map((f) => (
              <option key={f.numero} value={f.numero}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="sh-filter-group">
          <label className="sh-filter-label">Solicitante</label>
          <select
            className="sh-select"
            value={fSolicitante}
            onChange={(e) => setFSolicitante(e.target.value)}
          >
            <option value="Todos">Todos</option>
            {SOLICITANTES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="sh-filter-group">
          <label className="sh-filter-label">Ordenar por</label>
          <select className="sh-select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
            <option value="recentes">Mais recentes primeiro</option>
            <option value="antigos">Mais antigos primeiro</option>
            <option value="atraso">Maior atraso primeiro</option>
          </select>
        </div>
      </div>

      <div className="sh-table-wrap">
        <div className="sh-row head">
          <div>ID Solic.</div>
          <div>Pedido</div>
          <div>Filial</div>
          <div>Canal</div>
          <div>Status</div>
          <div>Próxima ação</div>
          <div>Data abertura</div>
          <div>Aberto</div>
        </div>

        {filtrados.length === 0 && !loading && (
          <div className="sh-empty">Nenhum chamado encontrado com esses filtros.</div>
        )}

        {filtrados.map((c) => {
          const f = filialInfo(filiais, c.filial);
          const sm = STATUS_META[c.status] || STATUS_META["Não iniciado"];
          const pm = PARTY_META[c.proxima] || PARTY_META["Operação"];
          const StatusIcon = sm.icon;
          const PartyIcon = pm.icon;
          const isOpen = expanded === c.dbId;
          const incompleto = chamadoIncompleto(c);
          return (
            <div key={c.dbId}>
              <div className="sh-row" onClick={() => toggleExpand(c)}>
                {c.idSolicitacao ? (
                  <button
                    type="button"
                    className={`sh-mono sh-id-btn ${copiedSolicitacao === c.idSolicitacao ? "copied" : ""}`}
                    style={{ fontSize: 12, color: "var(--text-dim)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      copySolicitacao(c.idSolicitacao);
                    }}
                    title={`${c.idSolicitacao} — clique para copiar`}
                  >
                    {copiedSolicitacao === c.idSolicitacao ? <Check size={12} /> : <Copy size={12} />}
                    <span className="sh-id-text">{c.idSolicitacao}</span>
                  </button>
                ) : (
                  <div className="sh-mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    —
                  </div>
                )}
                <button
                  type="button"
                  className={`sh-mono sh-id-btn ${copiedId === c.id ? "copied" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyId(c.id);
                  }}
                  title={`${c.id} — clique para copiar`}
                >
                  {copiedId === c.id ? <Check size={12} /> : <Copy size={12} />}
                  <span className="sh-id-text">{c.id}</span>
                </button>
                <div>
                  <div className="sh-filial-name">{f?.nome}</div>
                  <div className="sh-filial-bandeira">
                    <span className="sh-dot" style={{ background: BANDEIRA_COLOR[f?.bandeira] }} />
                    {f?.bandeira}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{c.canal}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  <span className="sh-pill" style={{ color: sm.color, background: `${sm.color}22` }}>
                    <StatusIcon size={12} />
                    {c.status}
                  </span>
                  {incompleto && (
                    <span
                      className="sh-pill"
                      style={{ color: "#E8A23D", background: "#E8A23D22" }}
                      title={`Faltam: ${camposFaltando(c).join(", ")}`}
                    >
                      <AlertTriangle size={11} />
                      Preencher dados
                    </span>
                  )}
                </div>
                <div className="sh-baton" style={{ color: pm.color }}>
                  <span className="sh-baton-icon" style={{ background: `${pm.color}22` }}>
                    <PartyIcon size={12} />
                  </span>
                  {c.proxima}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {formatDate(c.criado)}
                </div>
                <div style={{ fontSize: 12, color: urgencyColor(c), fontWeight: urgencyColor(c) !== "var(--text-faint)" ? 700 : 400 }}>
                  {timeAgo(c.criado)}
                </div>
              </div>

              {isOpen && editingId !== c.dbId && (
                <div className="sh-detail" onClick={(e) => e.stopPropagation()}>
                  {incompleto && (
                    <div
                      style={{
                        background: "rgba(232,162,61,0.12)",
                        border: "1px solid #e8a23d",
                        color: "#f3d3a3",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12.5,
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={14} />
                      Chamado importado rapidamente — falta preencher: {camposFaltando(c).join(", ")}.
                    </div>
                  )}
                  <div className="sh-detail-row">
                    <strong style={{ marginRight: 2 }}>Status:</strong>
                    <select
                      className="sh-select"
                      value={c.status}
                      onChange={(e) => quickStatusChange(c, e.target.value)}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Tipo de ocorrência:</strong> {c.tipoOcorrencia || "—"}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Descrição:</strong> {c.descricao}
                  </div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div>
                      <strong>ID de solicitação:</strong> {c.idSolicitacao || "—"}
                    </div>
                    <div>
                      <strong>Modal logístico:</strong> {c.modal || "—"}
                    </div>
                    <div>
                      <strong>Valor do pedido:</strong>{" "}
                      {c.valor != null
                        ? c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </div>
                    <div>
                      <strong>Solicitante:</strong> {c.solicitante || "—"}
                    </div>
                    <div>
                      <strong>Cadastrado por:</strong> {c.cadastradoPor}
                    </div>
                    <div>
                      <strong>Ordem/prioridade:</strong> {c.ordem ?? "—"}
                    </div>
                    <div>
                      <strong>Perda financeira:</strong>{" "}
                      {c.perda == null ? "Não informado" : c.perda ? "Sim" : "Não"}
                    </div>
                  </div>
                  <div className="sh-detail-actions">
                    <button type="button" className="sh-ghost-btn" onClick={() => startEdit(c)}>
                      <Pencil size={12} /> Editar chamado
                    </button>
                    {confirmandoExclusao === c.dbId ? (
                      <>
                        <span style={{ fontSize: 12, color: "#e8735d", alignSelf: "center" }}>
                          Excluir permanentemente?
                        </span>
                        <button
                          type="button"
                          className="sh-ghost-btn"
                          style={{ borderColor: "#e8735d", color: "#e8735d" }}
                          disabled={excluindo}
                          onClick={() => confirmarExclusao(c)}
                        >
                          {excluindo ? "Excluindo..." : "Sim, excluir"}
                        </button>
                        <button
                          type="button"
                          className="sh-ghost-btn"
                          onClick={() => setConfirmandoExclusao(null)}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="sh-ghost-btn"
                        onClick={() => setConfirmandoExclusao(c.dbId)}
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    )}
                  </div>

                  <div className="sh-timeline">
                    <button
                      type="button"
                      className="sh-timeline-toggle"
                      onClick={() => toggleHistorico(c)}
                    >
                      <History size={11} />
                      Histórico
                      <ChevronDown
                        size={12}
                        style={{
                          transform: historicoAberto[c.dbId] ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>
                    {historicoAberto[c.dbId] && (
                      <div className="sh-timeline-list">
                        {!historicos[c.dbId] && loadingHistorico && (
                          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Carregando...</div>
                        )}
                        {historicos[c.dbId]?.length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                            Nenhum evento registrado ainda.
                          </div>
                        )}
                        {historicos[c.dbId]?.map((h) => (
                          <div key={h.id} className="sh-timeline-item">
                            <span className="sh-timeline-dot" />
                            <div>
                              <div>{h.descricao}</div>
                              <div className="sh-timeline-meta">
                                {h.usuario} · {timeAgo(h.dataHora)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isOpen && editingId === c.dbId && editForm && (
                <form className="sh-detail" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
                  {editErro && <div className="sh-error">{editErro}</div>}

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">ID de solicitação</label>
                      <input
                        inputMode="numeric"
                        value={editForm.idSolicitacao}
                        onChange={(e) =>
                          setEditForm({ ...editForm, idSolicitacao: e.target.value.replace(/\D/g, "") })
                        }
                      />
                    </div>
                    <div className="sh-field">
                      <label className="sh-label">ID do pedido</label>
                      <input
                        value={editForm.id}
                        onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="sh-edit-grid full">
                    <div className="sh-field">
                      <label className="sh-label">Tipo de ocorrência</label>
                      <select
                        value={editForm.tipoOcorrencia}
                        onChange={(e) => setEditForm({ ...editForm, tipoOcorrencia: e.target.value })}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {TIPO_OCORRENCIA_GRUPOS.map((g) => (
                          <optgroup key={g.grupo} label={g.grupo}>
                            {g.opcoes.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">Filial</label>
                      <select
                        value={editForm.filial ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, filial: e.target.value })}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {filiais.map((f) => (
                          <option key={f.numero} value={f.numero}>
                            {f.nome} — {f.bandeira}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sh-field">
                      <label className="sh-label">Canal de venda</label>
                      <select
                        value={editForm.canal || ""}
                        onChange={(e) => setEditForm({ ...editForm, canal: e.target.value })}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {CANAIS.map((ca) => (
                          <option key={ca}>{ca}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">Modal logístico</label>
                      <select
                        value={editForm.modal || ""}
                        onChange={(e) => setEditForm({ ...editForm, modal: e.target.value })}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {MODAIS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sh-field">
                      <label className="sh-label">Solicitante</label>
                      <select
                        value={editForm.solicitante || ""}
                        onChange={(e) => setEditForm({ ...editForm, solicitante: e.target.value })}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {SOLICITANTES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">Ordem / prioridade</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.ordem ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, ordem: e.target.value })}
                      />
                    </div>
                    <div className="sh-field" style={{ display: "flex", alignItems: "center" }}>
                      <label className="sh-label" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
                        <input
                          type="checkbox"
                          checked={!!editForm.perda}
                          onChange={(e) => setEditForm({ ...editForm, perda: e.target.checked })}
                        />
                        Houve perda financeira pra loja?
                      </label>
                    </div>
                  </div>

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sh-field">
                      <label className="sh-label">Próxima ação — responsável</label>
                      <select
                        value={editForm.proxima}
                        onChange={(e) => setEditForm({ ...editForm, proxima: e.target.value })}
                      >
                        {PARTY_LIST.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sh-field">
                    <label className="sh-label">Valor do pedido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.valor}
                      onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                    />
                  </div>

                  <div className="sh-field">
                    <label className="sh-label">Descrição da ocorrência</label>
                    <textarea
                      value={editForm.descricao}
                      onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                    />
                  </div>

                  <div className="sh-detail-actions">
                    <button type="submit" className="sh-ghost-btn primary">
                      <Check size={12} /> Salvar alterações
                    </button>
                    <button type="button" className="sh-ghost-btn" onClick={cancelEdit}>
                      Cancelar
                    </button>
                    <span style={{ flex: 1 }} />
                    {confirmandoExclusao === c.dbId ? (
                      <>
                        <span style={{ fontSize: 12, color: "#e8735d" }}>
                          Excluir permanentemente?
                        </span>
                        <button
                          type="button"
                          className="sh-ghost-btn"
                          style={{ borderColor: "#e8735d", color: "#e8735d" }}
                          disabled={excluindo}
                          onClick={() => confirmarExclusao(c)}
                        >
                          {excluindo ? "Excluindo..." : "Sim, excluir"}
                        </button>
                        <button
                          type="button"
                          className="sh-ghost-btn"
                          onClick={() => setConfirmandoExclusao(null)}
                        >
                          Cancelar exclusão
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="sh-ghost-btn"
                        onClick={() => setConfirmandoExclusao(c.dbId)}
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
