import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Copy, Check, Pencil, AlertTriangle, Loader2, History, Trash2, ChevronDown, X, User } from "lucide-react";
import {
  fetchFiliais,
  fetchChamados,
  fetchHistorico,
  updateChamadoStatus,
  updateChamado,
  updateResponsavel,
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
  ORDEM_OPCOES,
  BANDEIRA_COLOR,
  TIPO_OCORRENCIA_GRUPOS,
  grupoDoTipo,
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
  const [fFilialList, setFFilialList] = useState([]);
  const [fSolicitante, setFSolicitante] = useState("Todos");
  const [statusMenuAberto, setStatusMenuAberto] = useState(false);
  const [filialMenuAberto, setFilialMenuAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 100;

  const [copiedId, setCopiedId] = useState(null);
  const [copiedSolicitacao, setCopiedSolicitacao] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErro, setEditErro] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [editandoResponsavel, setEditandoResponsavel] = useState(null);
  const [responsavelValor, setResponsavelValor] = useState("");

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
      .filter((c) => fFilialList.length === 0 || fFilialList.includes(String(c.filial)))
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
  }, [chamados, filiais, fStatusList, fBandeira, fFilialList, fSolicitante, busca, ordenacao]);

  // Sempre que os filtros/busca/ordenação mudam a lista resultante, volta
  // pra primeira página — senão dava pra ficar "presa" numa página 5 que
  // não existe mais depois de filtrar.
  useEffect(() => {
    setPaginaAtual(1);
  }, [fStatusList, fBandeira, fFilialList, fSolicitante, busca, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const paginados = filtrados.slice(
    (paginaSegura - 1) * ITENS_POR_PAGINA,
    paginaSegura * ITENS_POR_PAGINA
  );

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

  // Os cards de status (lá em cima) são exclusivos: clicar num card mostra
  // SÓ aquele status, substituindo qualquer seleção anterior — clicar de
  // novo no mesmo card volta pra "Todos". Isso é diferente do menu
  // suspenso de Status, que continua permitindo marcar vários ao mesmo
  // tempo (esse aqui usa toggleStatusFiltro acima).
  function selecionarStatusCard(s) {
    setFStatusList((prev) => (prev.length === 1 && prev[0] === s ? [] : [s]));
  }

  function toggleFilialFiltro(numero) {
    const chave = String(numero);
    setFFilialList((prev) => (prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]));
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

  async function salvarResponsavel(chamado) {
    const novoValor = responsavelValor.trim();
    setEditandoResponsavel(null);
    if (novoValor === (chamado.responsavel || "")) return;
    setChamados((prev) =>
      prev.map((c) => (c.dbId === chamado.dbId ? { ...c, responsavel: novoValor } : c))
    );
    try {
      await updateResponsavel(chamado.dbId, novoValor, usuario);
      setActionError("");
    } catch (err) {
      setChamados((prev) =>
        prev.map((c) => (c.dbId === chamado.dbId ? { ...c, responsavel: chamado.responsavel } : c))
      );
      setActionError(`Não consegui atualizar o responsável: ${err.message}`);
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
    setEditForm({
      ...c,
      valor: c.valor == null ? "" : String(c.valor),
      responsavel: c.responsavel || "",
      tipoGrupo: grupoDoTipo(c.tipoOcorrencia),
    });
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
    comparar("Responsável", original.responsavel || "—", (editado.responsavel || "").trim() || "—");
    comparar(
      "Valor",
      original.valor,
      Number(editado.valor),
      (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
    );
    comparar(
      "Ordem de prioridade",
      original.ordem ?? "",
      editado.ordem === "" ? "" : Number(editado.ordem),
      (v) => ORDEM_OPCOES.find((o) => o.value === v)?.label ?? "—"
    );
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
            className={`sh-stat ${fStatusList.length === 1 && fStatusList[0] === s ? "active" : ""}`}
            style={{ "--dot": STATUS_META[s].color }}
            onClick={() => selecionarStatusCard(s)}
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

        <div className="sh-filter-group" style={{ position: "relative" }}>
          <label className="sh-filter-label">Filial</label>
          <button
            type="button"
            className="sh-select sh-multiselect-btn"
            onClick={() => setFilialMenuAberto((o) => !o)}
          >
            {fFilialList.length === 0
              ? "Todas"
              : `${fFilialList.length} selecionada${fFilialList.length > 1 ? "s" : ""}`}
            <ChevronDown size={13} />
          </button>
          {filialMenuAberto && (
            <div className="sh-multiselect-panel" style={{ maxHeight: 260, overflowY: "auto" }}>
              {filiais.map((f) => (
                <label key={f.numero} className="sh-multiselect-option">
                  <input
                    type="checkbox"
                    checked={fFilialList.includes(String(f.numero))}
                    onChange={() => toggleFilialFiltro(f.numero)}
                  />
                  {f.nome}
                </label>
              ))}
              {fFilialList.length > 0 && (
                <button
                  type="button"
                  className="sh-multiselect-clear"
                  onClick={() => setFFilialList([])}
                >
                  <X size={11} /> Limpar seleção
                </button>
              )}
            </div>
          )}
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
          <div>Data de abertura</div>
          <div>Cadastro</div>
          <div>Responsável</div>
        </div>

        {filtrados.length === 0 && !loading && (
          <div className="sh-empty">Nenhum chamado encontrado com esses filtros.</div>
        )}

        {paginados.map((c) => {
          const f = filialInfo(filiais, c.filial);
          const sm = STATUS_META[c.status] || STATUS_META["Não iniciado"];
          const StatusIcon = sm.icon;
          const isOpen = expanded === c.dbId;
          const editandoResp = editandoResponsavel === c.dbId;
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
                  <span className="sh-id-text-lg">{c.id}</span>
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
                      style={{ color: "#3d2705", background: "#E8A23D", fontWeight: 700 }}
                      title={`Faltam: ${camposFaltando(c).join(", ")}`}
                    >
                      <AlertTriangle size={11} />
                      Preencher dados
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {formatDate(c.criado)}
                </div>
                <div style={{ fontSize: 12, color: urgencyColor(c), fontWeight: urgencyColor(c) !== "var(--text-faint)" ? 700 : 400 }}>
                  {timeAgo(c.criado)}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  {editandoResp ? (
                    <input
                      autoFocus
                      className="sh-mono"
                      style={{
                        width: "100%",
                        fontSize: 12,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "4px 6px",
                        color: "var(--text)",
                      }}
                      value={responsavelValor}
                      onChange={(e) => setResponsavelValor(e.target.value)}
                      onBlur={() => salvarResponsavel(c)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditandoResponsavel(null);
                      }}
                      placeholder="Nome..."
                    />
                  ) : (
                    <button
                      type="button"
                      className="sh-id-btn"
                      style={{ fontSize: 12.5, color: c.responsavel ? "var(--text-dim)" : "var(--text-faint)" }}
                      onClick={() => {
                        setEditandoResponsavel(c.dbId);
                        setResponsavelValor(c.responsavel || "");
                      }}
                      title="Clique para editar quem está tratando"
                    >
                      <User size={12} />
                      <span className="sh-id-text">{c.responsavel || "—"}</span>
                    </button>
                  )}
                </div>
              </div>

              {isOpen && editingId !== c.dbId && (
                <div className="sh-detail" onClick={(e) => e.stopPropagation()}>
                  {incompleto && (
                    <div
                      style={{
                        background: "rgba(232,162,61,0.28)",
                        border: "1px solid #e8a23d",
                        color: "#fff1d6",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
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
                      <strong>Responsável:</strong> {c.responsavel || "—"}
                    </div>
                    <div>
                      <strong>Ordem de prioridade:</strong>{" "}
                      {ORDEM_OPCOES.find((o) => o.value === c.ordem)?.label ?? "—"}
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

                  <div className="sh-edit-grid">
                    <div className="sh-field">
                      <label className="sh-label">Categoria da ocorrência</label>
                      <select
                        value={editForm.tipoGrupo || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tipoGrupo: e.target.value, tipoOcorrencia: "" })
                        }
                      >
                        <option value="" disabled>
                          Selecione a categoria...
                        </option>
                        {TIPO_OCORRENCIA_GRUPOS.map((g) => (
                          <option key={g.grupo} value={g.grupo}>
                            {g.grupo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sh-field">
                      <label className="sh-label">Tipo de ocorrência</label>
                      <select
                        value={editForm.tipoOcorrencia}
                        disabled={!editForm.tipoGrupo}
                        onChange={(e) => setEditForm({ ...editForm, tipoOcorrencia: e.target.value })}
                      >
                        <option value="" disabled>
                          {editForm.tipoGrupo ? "Selecione..." : "Escolha a categoria primeiro"}
                        </option>
                        {(TIPO_OCORRENCIA_GRUPOS.find((g) => g.grupo === editForm.tipoGrupo)?.opcoes || []).map(
                          (o) => (
                            <option key={o}>{o}</option>
                          )
                        )}
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
                      <label className="sh-label">Ordem de prioridade</label>
                      <select
                        value={editForm.ordem ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, ordem: e.target.value })}
                      >
                        <option value="">Não definida</option>
                        {ORDEM_OPCOES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sh-field" style={{ display: "flex", alignItems: "center" }}>
                      <label className="sh-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 18, width: "100%" }}>
                        Houve perda financeira pra loja?
                        <input
                          type="checkbox"
                          checked={!!editForm.perda}
                          onChange={(e) => setEditForm({ ...editForm, perda: e.target.checked })}
                        />
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
                      <label className="sh-label">Responsável (quem está tratando)</label>
                      <input
                        value={editForm.responsavel || ""}
                        placeholder="Nome de quem está tratando..."
                        onChange={(e) => setEditForm({ ...editForm, responsavel: e.target.value })}
                      />
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

      {filtrados.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 12,
            fontSize: 12.5,
            color: "var(--text-dim)",
            flexWrap: "wrap",
          }}
        >
          <div>
            Mostrando {(paginaSegura - 1) * ITENS_POR_PAGINA + 1}–
            {Math.min(paginaSegura * ITENS_POR_PAGINA, filtrados.length)} de {filtrados.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="sh-ghost-btn"
              disabled={paginaSegura <= 1}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span>
              Página {paginaSegura} de {totalPaginas}
            </span>
            <button
              type="button"
              className="sh-ghost-btn"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </>
  );
}
