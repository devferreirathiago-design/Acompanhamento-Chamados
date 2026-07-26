import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, AlertTriangle, ChevronDown, X } from "lucide-react";
import { fetchFiliais, fetchChamados } from "../services/chamados";
import {
  STATUS_LIST,
  BANDEIRA_COLOR,
  ORDEM_OPCOES,
  SOLICITANTES,
  filialInfo,
  formatDate,
} from "../constants/chamados";

// Gera o rótulo (e nome de arquivo) do período escolhido pro relatório.
function rotuloPeriodo({ modo, mes, dataDe, dataAte }) {
  if (modo === "mes") {
    if (!mes) return "todos-os-periodos";
    const [ano, m] = mes.split("-");
    const nomesMes = [
      "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
    ];
    return `${nomesMes[Number(m) - 1]}-${ano}`;
  }
  if (!dataDe && !dataAte) return "todos-os-periodos";
  return `${dataDe || "inicio"}_a_${dataAte || "hoje"}`;
}

export default function Relatorios() {
  const [filiais, setFiliais] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [modoPeriodo, setModoPeriodo] = useState("mes");
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const [fStatusList, setFStatusList] = useState([]);
  const [statusMenuAberto, setStatusMenuAberto] = useState(false);
  const [fBandeira, setFBandeira] = useState("Todas");
  const [fSolicitante, setFSolicitante] = useState("Todos");

  useEffect(() => {
    let vivo = true;
    Promise.all([fetchFiliais(), fetchChamados()])
      .then(([f, c]) => {
        if (!vivo) return;
        setFiliais(f);
        setChamados(c);
      })
      .catch((err) => vivo && setErro(`Não consegui carregar do Supabase: ${err.message}`))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, []);

  function toggleStatusFiltro(s) {
    setFStatusList((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function dentroDoPeriodo(c) {
    const d = new Date(c.criado);
    if (modoPeriodo === "mes") {
      if (!mesSelecionado) return true;
      const [ano, mes] = mesSelecionado.split("-").map(Number);
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    }
    if (dataDe && d < new Date(`${dataDe}T00:00:00`)) return false;
    if (dataAte && d > new Date(`${dataAte}T23:59:59`)) return false;
    return true;
  }

  const filtrados = useMemo(() => {
    return chamados
      .filter(dentroDoPeriodo)
      .filter((c) => fStatusList.length === 0 || fStatusList.includes(c.status))
      .filter((c) => {
        if (fBandeira === "Todas") return true;
        return filialInfo(filiais, c.filial)?.bandeira === fBandeira;
      })
      .filter((c) => fSolicitante === "Todos" || c.solicitante === fSolicitante)
      .sort((a, b) => new Date(b.criado) - new Date(a.criado));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamados, filiais, modoPeriodo, mesSelecionado, dataDe, dataAte, fStatusList, fBandeira, fSolicitante]);

  function exportarExcel() {
    const linhas = filtrados.map((c) => {
      const f = filialInfo(filiais, c.filial);
      return {
        "ID de Solicitação": c.idSolicitacao || "",
        "ID do Pedido": c.id || "",
        Filial: f?.nome || "",
        Bandeira: f?.bandeira || "",
        "Canal de venda": c.canal || "",
        "Modal logístico": c.modal || "",
        "Valor do pedido": c.valor ?? "",
        Solicitante: c.solicitante || "",
        "Tipo de ocorrência": c.tipoOcorrencia || "",
        Status: c.status,
        Responsável: c.responsavel || "",
        "Perda financeira": c.perda == null ? "" : c.perda ? "Sim" : "Não",
        "Ordem de prioridade": ORDEM_OPCOES.find((o) => o.value === c.ordem)?.label || "",
        "Cadastrado por": c.cadastradoPor || "",
        "Data de abertura": formatDate(c.criado),
        Descrição: c.descricao || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(linhas);
    // Larguras de coluna manuais pra não ficar tudo espremido no Excel.
    ws["!cols"] = [
      { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chamados");
    XLSX.writeFile(wb, `relatorio_chamados_${rotuloPeriodo({ modo: modoPeriodo, mes: mesSelecionado, dataDe, dataAte })}.xlsx`);
  }

  return (
    <div>
      {erro && (
        <div className="sh-toast" style={{ background: "rgba(232,115,93,0.2)", borderColor: "#e8735d", color: "#f3b6ab" }}>
          <AlertTriangle size={16} />
          {erro}
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 18, lineHeight: 1.6, maxWidth: 640 }}>
        Monte um relatório em Excel pra mandar pro seu chefe. Escolhe o período (um mês
        específico ou um intervalo de datas customizado, tipo os últimos 15 dias) e, se
        quiser, filtra por status/bandeira/solicitante antes de baixar.
      </p>

      <div className="sh-toolbar" style={{ marginBottom: 10 }}>
        <div className="sh-filter-group">
          <label className="sh-filter-label">Período</label>
          <select
            className="sh-select"
            value={modoPeriodo}
            onChange={(e) => setModoPeriodo(e.target.value)}
          >
            <option value="mes">Por mês</option>
            <option value="intervalo">Intervalo de datas</option>
          </select>
        </div>

        {modoPeriodo === "mes" ? (
          <div className="sh-filter-group">
            <label className="sh-filter-label">Mês</label>
            <input
              type="month"
              className="sh-select"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="sh-filter-group">
              <label className="sh-filter-label">De</label>
              <input
                type="date"
                className="sh-select"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
              />
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Até</label>
              <input
                type="date"
                className="sh-select"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
              />
            </div>
          </>
        )}

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
                <button type="button" className="sh-multiselect-clear" onClick={() => setFStatusList([])}>
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
          <label className="sh-filter-label">Solicitante</label>
          <select className="sh-select" value={fSolicitante} onChange={(e) => setFSolicitante(e.target.value)}>
            <option value="Todos">Todos</option>
            {SOLICITANTES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
          <Loader2 size={14} className="sh-spin" /> Carregando chamados...
        </div>
      ) : (
        <div className="sh-detail" style={{ borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{filtrados.length}</strong> chamado(s) encontrado(s) com esse período/filtros
              (de {chamados.length} no total).
            </div>
            <button
              type="button"
              className="sh-submit"
              onClick={exportarExcel}
              disabled={filtrados.length === 0}
            >
              <Download size={14} /> Baixar Excel ({filtrados.length})
            </button>
          </div>

          {filtrados.length > 0 && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {filtrados.slice(0, 30).map((c) => {
                const f = filialInfo(filiais, c.filial);
                return (
                  <div
                    key={c.dbId}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 12.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="sh-mono" style={{ minWidth: 80 }}>{c.idSolicitacao || "—"}</span>
                    <span style={{ minWidth: 140 }}>{f?.nome || "—"}</span>
                    <span style={{ minWidth: 110 }}>{c.status}</span>
                    <span style={{ minWidth: 90 }}>{formatDate(c.criado)}</span>
                    <span>{c.responsavel || "—"}</span>
                  </div>
                );
              })}
              {filtrados.length > 30 && (
                <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "8px 0" }}>
                  ...e mais {filtrados.length - 30} chamado(s) (todos entram no Excel, essa é só uma prévia).
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
