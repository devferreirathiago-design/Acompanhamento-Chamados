import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import * as XLSX from "xlsx";
import { Loader2, CheckCircle2 } from "lucide-react";
import { fetchChamados, createChamadosRapidos } from "../services/chamados";

// Tira acento e deixa minúsculo, pra comparar cabeçalho de coluna sem
// depender de escrever exatamente igual ao export do sistema.
function normalizarTexto(v) {
  return String(v ?? "").toLowerCase();
}

function acharColuna(linhaCabecalho, ...palavrasChave) {
  return linhaCabecalho.findIndex((h) => {
    const norm = normalizarTexto(h);
    return palavrasChave.every((p) => norm.includes(p));
  });
}

// Aceita "25/07/2026 15:32", "25/07/2026" ou já um Date (quando o Excel
// grava a célula como data de verdade).
function parseDataBR(valor) {
  if (valor instanceof Date && !isNaN(valor)) return valor;
  const texto = String(valor ?? "").trim();
  const m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0"] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return isNaN(dt) ? null : dt;
}

export default function ImportarChamados() {
  const { usuario } = useOutletContext();
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState("");

  async function handleArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPreview(null);
    setErro("");
    setResultado("");
    setProcessando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      if (!linhas.length) throw new Error("A planilha está vazia.");

      const cabecalho = linhas[0];
      const colChamado = acharColuna(cabecalho, "chamado");
      const colData = acharColuna(cabecalho, "data", "abertura");
      if (colChamado === -1) {
        throw new Error(
          'Não encontrei uma coluna de "Chamado / Solicitação" na primeira linha da planilha.'
        );
      }
      if (colData === -1) {
        throw new Error(
          'Não encontrei uma coluna de "Data de Abertura" na primeira linha da planilha.'
        );
      }

      const existentes = await fetchChamados();
      const existentesSet = new Set(existentes.map((c) => c.idSolicitacao).filter(Boolean));

      const vistos = new Set();
      let semNumero = 0;
      let semData = 0;
      let jaExistentes = 0;
      let duplicadosNoArquivo = 0;
      const novos = [];

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha || linha.every((v) => v === undefined || v === null || v === "")) continue;

        const numero = String(linha[colChamado] ?? "").replace(/\D/g, "");
        if (!numero) {
          semNumero++;
          continue;
        }
        if (existentesSet.has(numero)) {
          jaExistentes++;
          continue;
        }
        if (vistos.has(numero)) {
          duplicadosNoArquivo++;
          continue;
        }
        vistos.add(numero);

        const data = parseDataBR(linha[colData]);
        if (!data) semData++;
        novos.push({ idSolicitacao: numero, criadoEm: data ? data.toISOString() : null });
      }

      setPreview({
        novos,
        semNumero,
        semData,
        jaExistentes,
        duplicadosNoArquivo,
        totalLinhas: linhas.length - 1,
      });
    } catch (err) {
      setErro(`Não consegui ler a planilha: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarImportacao() {
    if (!preview?.novos.length) return;
    setImportando(true);
    setErro("");
    try {
      await createChamadosRapidos(preview.novos, usuario || "Importação");
      setResultado(
        `${preview.novos.length} chamado(s) novo(s) criado(s) — vão aparecer no Painel com a tag "Preencher dados".`
      );
      setPreview(null);
    } catch (err) {
      setErro(`Não consegui importar: ${err.message}`);
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="sh-form">
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.6 }}>
        Suba o export da fila do sistema (com as colunas "Chamado / Solicitação" e
        "Data de Abertura"). Chamados que já existem no StatusHub são ignorados
        automaticamente — só os números novos entram, com o resto em branco pra
        completar depois.
      </p>

      {erro && <div className="sh-error">{erro}</div>}

      <div className="sh-field">
        <label className="sh-label">Planilha da fila (.xlsx)</label>
        <input type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={handleArquivo} />
      </div>

      {processando && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
          <Loader2 size={14} className="sh-spin" /> Lendo planilha...
        </div>
      )}

      {preview && (
        <div className="sh-detail" style={{ marginTop: 4 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{preview.novos.length}</strong> chamado(s) novo(s) encontrado(s) de{" "}
            {preview.totalLinhas} linha(s) na planilha.
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 12 }}>
            {preview.jaExistentes} já existem no StatusHub · {preview.duplicadosNoArquivo}{" "}
            duplicados na própria planilha
            {preview.semNumero > 0 && ` · ${preview.semNumero} sem número de chamado`}
            {preview.semData > 0 && ` · ${preview.semData} sem data reconhecida (viram "sem data")`}
          </div>

          {preview.novos.length > 0 && (
            <>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
                {preview.novos.map((n) => (
                  <div key={n.idSolicitacao} className="sh-mono" style={{ fontSize: 12.5, padding: "3px 0" }}>
                    {n.idSolicitacao} —{" "}
                    {n.criadoEm ? new Date(n.criadoEm).toLocaleString("pt-BR") : "sem data"}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="sh-submit"
                onClick={confirmarImportacao}
                disabled={importando}
              >
                {importando ? "Importando..." : `Importar ${preview.novos.length} chamado(s) novo(s)`}
              </button>
            </>
          )}
        </div>
      )}

      {resultado && (
        <div
          className="sh-toast"
          style={{ marginTop: 12, background: "rgba(79,191,122,0.28)", border: "1.5px solid #4fbf7a", color: "#eafff2", fontWeight: 600 }}
        >
          <CheckCircle2 size={16} />
          {resultado}
        </div>
      )}
    </div>
  );
}
