import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchFiliais, fetchChamados, createChamado } from "../services/chamados";
import { CANAIS, MODAIS, SOLICITANTES, TIPO_OCORRENCIA_GRUPOS } from "../constants/chamados";

export default function NovoChamado() {
  const navigate = useNavigate();
  const { usuario } = useOutletContext();
  const [filiais, setFiliais] = useState([]);
  const [existentes, setExistentes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    id: "",
    numeroSic: "",
    filial: "",
    canal: CANAIS[0],
    modal: MODAIS[0],
    valor: "",
    solicitante: SOLICITANTES[0],
    cadastradoPor: usuario || "",
    tipoOcorrencia: "",
    descricao: "",
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
    if (existentes.some((c) => c.id === idPedido)) {
      setErro("Já existe um chamado com esse ID de pedido.");
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
    setErro("");
    setSaving(true);
    try {
      await createChamado({
        idPedido,
        numeroSic: form.numeroSic.trim(),
        filial: form.filial,
        canal: form.canal,
        modal: form.modal,
        valor: form.valor,
        solicitante: form.solicitante,
        cadastradoPor: form.cadastradoPor.trim(),
        tipoOcorrencia: form.tipoOcorrencia,
        descricao: form.descricao.trim(),
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
          <label className="sh-label">ID do pedido</label>
          <input
            placeholder="Ex: PED-004900"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
        </div>
        <div className="sh-field">
          <label className="sh-label">Número do SIC (opcional)</label>
          <input
            placeholder="Ex: 12345"
            value={form.numeroSic}
            onChange={(e) => setForm({ ...form, numeroSic: e.target.value })}
          />
        </div>
      </div>

      <div className="sh-field">
        <label className="sh-label">Tipo de ocorrência</label>
        <select
          value={form.tipoOcorrencia}
          onChange={(e) => setForm({ ...form, tipoOcorrencia: e.target.value })}
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

      <div className="sh-field">
        <label className="sh-label">Cadastrado por</label>
        <input
          placeholder="Seu nome"
          value={form.cadastradoPor}
          onChange={(e) => setForm({ ...form, cadastradoPor: e.target.value })}
        />
      </div>

      <div className="sh-field">
        <label className="sh-label">Descrição da ocorrência</label>
        <textarea
          placeholder="Descreva o que aconteceu..."
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
      </div>

      <button className="sh-submit" type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Abrir chamado"} <ArrowRight size={14} />
      </button>
    </form>
  );
}
