import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchFiliais, fetchChamados, createChamado } from "../services/chamados";
import { CANAIS, MODAIS, SOLICITANTES, TIPO_OCORRENCIA_GRUPOS, ORDEM_OPCOES } from "../constants/chamados";

export default function NovoChamado() {
  const navigate = useNavigate();
  const { usuario } = useOutletContext();
  const [filiais, setFiliais] = useState([]);
  const [existentes, setExistentes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmandoSemDescricao, setConfirmandoSemDescricao] = useState(false);

  const [form, setForm] = useState({
    id: "",
    idSolicitacao: "",
    filial: "",
    canal: CANAIS[0],
    modal: MODAIS[0],
    valor: "",
    solicitante: SOLICITANTES[0],
    cadastradoPor: usuario || "",
    tipoGrupo: "",
    tipoOcorrencia: "",
    descricao: "",
    perda: false,
    ordem: "",
    responsavel: "",
  });

  useEffect(() => {
    fetchFiliais()
      .then((f) => {
        setFiliais(f);
        setForm((prev) => ({ ...prev, filial: prev.filial || f[0]?.numero || "" }));
      })
      .catch((err) => setErro(`Não consegui carregar as filiais: ${err.message}`));
    fetchChamados()
      .then(setExistentes)
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const idPedido = form.id.trim();
    if (!idPedido) {
      setErro("Informe o ID do pedido.");
      return;
    }
    if (!form.idSolicitacao.trim()) {
      setErro("Informe o ID de solicitação.");
      return;
    }
    if (existentes.some((c) => c.idSolicitacao === form.idSolicitacao.trim())) {
      setErro("Já existe um chamado com esse ID de solicitação.");
      return;
    }
    if (!form.cadastradoPor.trim()) {
      setErro("Informe quem está cadastrando o chamado.");
      return;
    }
    if (!form.tipoOcorrencia) {
      setErro("Selecione o tipo de ocorrência.");
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      setErro("Informe um valor de pedido válido.");
      return;
    }
    if (!form.descricao.trim() && !confirmandoSemDescricao) {
      setErro('A descrição está vazia. Clique em "Abrir chamado" de novo se quiser salvar assim mesmo.');
      setConfirmandoSemDescricao(true);
      return;
    }
    setErro("");
    setSaving(true);
    try {
      await createChamado({
        idPedido,
        idSolicitacao: form.idSolicitacao.trim(),
        filial: form.filial,
        canal: form.canal,
        modal: form.modal,
        valor: form.valor,
        solicitante: form.solicitante,
        cadastradoPor: form.cadastradoPor.trim(),
        tipoOcorrencia: form.tipoOcorrencia,
        descricao: form.descricao.trim(),
        perda: form.perda,
        ordem: form.ordem === "" ? null : Number(form.ordem),
        responsavel: form.responsavel.trim(),
      });
      navigate("/");
    } catch (err) {
      setErro(`Não consegui salvar no Supabase: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sh-form" onSubmit={handleSubmit}>
      {erro && <div className="sh-error">{erro}</div>}

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">ID de solicitação</label>
          <input
            placeholder="Ex: SIC, protocolo do chat..."
            inputMode="numeric"
            value={form.idSolicitacao}
            onChange={(e) =>
              setForm({ ...form, idSolicitacao: e.target.value.replace(/\D/g, "") })
            }
          />
        </div>
        <div className="sh-field">
          <label className="sh-label">ID do pedido</label>
          <input
            placeholder="Ex: PED-004900"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
        </div>
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">Categoria da ocorrência</label>
          <select
            value={form.tipoGrupo}
            onChange={(e) => setForm({ ...form, tipoGrupo: e.target.value, tipoOcorrencia: "" })}
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
            value={form.tipoOcorrencia}
            disabled={!form.tipoGrupo}
            onChange={(e) => setForm({ ...form, tipoOcorrencia: e.target.value })}
          >
            <option value="" disabled>
              {form.tipoGrupo ? "Selecione..." : "Escolha a categoria primeiro"}
            </option>
            {(TIPO_OCORRENCIA_GRUPOS.find((g) => g.grupo === form.tipoGrupo)?.opcoes || []).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">Filial</label>
          <select value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })}>
            {filiais.map((f) => (
              <option key={f.numero} value={f.numero}>
                {f.nome} — {f.bandeira}
              </option>
            ))}
          </select>
        </div>
        <div className="sh-field">
          <label className="sh-label">Canal de venda</label>
          <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })}>
            {CANAIS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">Modal logístico</label>
          <select value={form.modal} onChange={(e) => setForm({ ...form, modal: e.target.value })}>
            {MODAIS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="sh-field">
          <label className="sh-label">Solicitante</label>
          <select
            value={form.solicitante}
            onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
          >
            {SOLICITANTES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sh-field">
        <label className="sh-label">Valor do pedido (R$)</label>
        <input
          type="number"
          step="0.01"
          placeholder="0,00"
          value={form.valor}
          onChange={(e) => setForm({ ...form, valor: e.target.value })}
        />
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">Ordem de prioridade</label>
          <select value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })}>
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
              checked={form.perda}
              onChange={(e) => setForm({ ...form, perda: e.target.checked })}
            />
          </label>
        </div>
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label">Cadastrado por</label>
          <input
            placeholder="Seu nome"
            value={form.cadastradoPor}
            onChange={(e) => setForm({ ...form, cadastradoPor: e.target.value })}
          />
        </div>
        <div className="sh-field">
          <label className="sh-label">Responsável (quem vai tratar)</label>
          <input
            placeholder="Opcional — pode preencher depois"
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
          />
        </div>
      </div>

      <div className="sh-field">
        <label className="sh-label">Descrição da ocorrência</label>
        <textarea
          placeholder="Descreva o que aconteceu..."
          value={form.descricao}
          onChange={(e) => {
            setForm({ ...form, descricao: e.target.value });
            if (e.target.value.trim()) setConfirmandoSemDescricao(false);
          }}
        />
      </div>

      <button className="sh-submit" type="submit" disabled={saving}>
        {saving
          ? "Salvando..."
          : confirmandoSemDescricao
          ? "Confirmar sem descrição"
          : "Abrir chamado"}{" "}
        <ArrowRight size={14} />
      </button>
    </form>
  );
}
