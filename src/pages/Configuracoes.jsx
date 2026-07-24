import { useState, useEffect } from "react";
import { Users, Store, Settings2, Plus, Pencil, Ban, CheckCircle2, X } from "lucide-react";
import { fetchFiliais, createFilial, updateFilial } from "../services/chamados";
import { fetchPerfis, atualizarStatusPerfil, enviarRedefinicaoSenha } from "../services/auth";

const SUB_TABS = [
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "lojas", label: "Lojas", icon: Store },
  { id: "conta", label: "Conta", icon: Settings2 },
];

export default function Configuracoes() {
  const [subTab, setSubTab] = useState("usuarios");

  return (
    <div>
      <div className="sh-subtabs">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`sh-subtab ${subTab === id ? "active" : ""}`}
            onClick={() => setSubTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {subTab === "usuarios" && <AbaUsuarios />}
      {subTab === "lojas" && <AbaLojas />}
      {subTab === "conta" && <AbaConta />}
    </div>
  );
}

function AbaUsuarios() {
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  function carregar() {
    setLoading(true);
    fetchPerfis()
      .then(setPerfis)
      .catch((err) => setErro(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  async function alternarStatus(perfil) {
    const novoStatus = perfil.status === "Ativo" ? "Inativo" : "Ativo";
    setOcupado(perfil.id);
    setErro("");
    try {
      await atualizarStatusPerfil(perfil.id, novoStatus);
      setPerfis((prev) =>
        prev.map((p) => (p.id === perfil.id ? { ...p, status: novoStatus } : p))
      );
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function reenviarSenha(perfil) {
    setOcupado(perfil.id);
    setErro("");
    setAviso("");
    try {
      await enviarRedefinicaoSenha(perfil.email);
      setAviso(`Link de redefinição enviado para ${perfil.email}.`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="sh-config-panel">
      <div className="sh-config-panel-head">
        <p className="sh-config-hint">
          Aqui é onde as contas aparecem depois que a pessoa se cadastra pela
          tela de login. Não existe convite automático por enquanto — peça
          pra pessoa criar a conta dela mesma (opção "Criar conta" no login),
          e depois é só ativar/desativar o acesso por aqui.
        </p>
      </div>

      {erro && <div className="sh-error">{erro}</div>}
      {aviso && <div className="sh-toast">{aviso}</div>}
      {loading && <div className="sh-empty">Carregando usuários...</div>}

      {!loading && (
        <div className="sh-table-wrap">
          <div className="sh-config-row head">
            <span>Nome</span>
            <span>Email</span>
            <span>Status</span>
            <span></span>
          </div>
          {perfis.length === 0 && (
            <div className="sh-empty">Nenhum usuário cadastrado ainda.</div>
          )}
          {perfis.map((p) => (
            <div className="sh-config-row" key={p.id}>
              <span>{p.nome}</span>
              <span className="sh-text-dim">{p.email}</span>
              <span>
                <span className={`sh-pill ${p.status === "Ativo" ? "sh-pill-ok" : "sh-pill-off"}`}>
                  {p.status}
                </span>
              </span>
              <span className="sh-config-actions">
                <button
                  type="button"
                  className="sh-icon-btn"
                  title="Enviar link de redefinição de senha"
                  disabled={ocupado === p.id}
                  onClick={() => reenviarSenha(p)}
                >
                  {ocupado === p.id ? "…" : "🔑"}
                </button>
                <button
                  type="button"
                  className={`sh-icon-btn ${p.status === "Ativo" ? "danger" : ""}`}
                  title={p.status === "Ativo" ? "Desativar acesso" : "Reativar acesso"}
                  disabled={ocupado === p.id}
                  onClick={() => alternarStatus(p)}
                >
                  {p.status === "Ativo" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaLojas() {
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(null); // numero da filial em edição, ou "nova"

  function carregar() {
    setLoading(true);
    fetchFiliais()
      .then(setFiliais)
      .catch((err) => setErro(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  function fecharEdicao() {
    setEditando(null);
  }

  function onSalvo(filialSalva, criando) {
    if (criando) {
      setFiliais((prev) => [...prev, filialSalva].sort((a, b) => a.numero - b.numero));
    } else {
      setFiliais((prev) =>
        prev.map((f) => (f.numero === filialSalva.numero ? filialSalva : f))
      );
    }
    setEditando(null);
  }

  return (
    <div className="sh-config-panel">
      <div className="sh-config-panel-head">
        <p className="sh-config-hint">
          Cadastre lojas novas e ajuste bandeira ou regional sem precisar mexer no código.
        </p>
        <button type="button" className="sh-ghost-btn primary" onClick={() => setEditando("nova")}>
          <Plus size={14} /> Nova filial
        </button>
      </div>

      {loading && <div className="sh-empty">Carregando lojas...</div>}
      {erro && <div className="sh-error">{erro}</div>}

      {editando === "nova" && (
        <FormFilial onCancel={fecharEdicao} onSalvo={(f) => onSalvo(f, true)} />
      )}

      {!loading && !erro && (
        <div className="sh-table-wrap">
          <div className="sh-config-row head sh-config-row-lojas">
            <span>Número</span>
            <span>Nome</span>
            <span>Bandeira</span>
            <span>Regional</span>
            <span></span>
          </div>
          {filiais.map((f) =>
            editando === f.numero ? (
              <div key={f.numero} className="sh-config-edit-wrap">
                <FormFilial filial={f} onCancel={fecharEdicao} onSalvo={(sv) => onSalvo(sv, false)} />
              </div>
            ) : (
              <div className="sh-config-row sh-config-row-lojas" key={f.numero}>
                <span className="sh-mono">{f.numero}</span>
                <span>{f.nome}</span>
                <span>{f.bandeira}</span>
                <span className="sh-text-dim">{f.regional || "—"}</span>
                <span className="sh-config-actions">
                  <button
                    type="button"
                    className="sh-icon-btn"
                    title="Editar"
                    onClick={() => setEditando(f.numero)}
                  >
                    <Pencil size={14} />
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function FormFilial({ filial, onCancel, onSalvo }) {
  const criando = !filial;
  const [numero, setNumero] = useState(filial?.numero ?? "");
  const [nome, setNome] = useState(filial?.nome ?? "");
  const [bandeira, setBandeira] = useState(filial?.bandeira ?? "");
  const [regional, setRegional] = useState(filial?.regional ?? "");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (criando && !numero) {
      setErro("Informe o número da filial.");
      return;
    }
    if (!nome.trim() || !bandeira.trim()) {
      setErro("Preencha nome e bandeira.");
      return;
    }
    setErro("");
    setSaving(true);
    try {
      const salva = criando
        ? await createFilial({ numero, nome: nome.trim(), bandeira: bandeira.trim(), regional: regional.trim() })
        : await updateFilial(filial.numero, { nome: nome.trim(), bandeira: bandeira.trim(), regional: regional.trim() });
      onSalvo(salva);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sh-form" style={{ maxWidth: 520, marginBottom: 14 }} onSubmit={handleSubmit}>
      <div className="sh-detail-row" style={{ justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13 }}>{criando ? "Nova filial" : `Editar filial ${filial.numero}`}</strong>
        <button type="button" className="sh-icon-btn" onClick={onCancel} title="Cancelar">
          <X size={14} />
        </button>
      </div>

      {erro && <div className="sh-error">{erro}</div>}

      <div className="sh-edit-grid">
        <div className="sh-field">
          <label className="sh-label">Número da filial</label>
          <input
            type="number"
            disabled={!criando}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <div className="sh-field">
          <label className="sh-label">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
      </div>
      <div className="sh-edit-grid">
        <div className="sh-field">
          <label className="sh-label">Bandeira</label>
          <input value={bandeira} onChange={(e) => setBandeira(e.target.value)} />
        </div>
        <div className="sh-field">
          <label className="sh-label">Regional</label>
          <input value={regional} onChange={(e) => setRegional(e.target.value)} />
        </div>
      </div>

      <div className="sh-detail-actions">
        <button type="submit" className="sh-ghost-btn primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="sh-ghost-btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AbaConta() {
  return (
    <div className="sh-config-panel">
      <div className="sh-form" style={{ maxWidth: 480 }}>
        <div className="sh-field">
          <label className="sh-label">Nome do sistema</label>
          <input placeholder="StatusHub" defaultValue="StatusHub" />
        </div>
        <p className="sh-config-note" style={{ marginTop: -6, marginBottom: 16 }}>
          Ainda em definição — assim que decidirem o nome novo, atualizo aqui.
        </p>
        <div className="sh-field">
          <label className="sh-label">Cores por bandeira</label>
          <p className="sh-config-hint" style={{ marginBottom: 8 }}>
            Aguardando o template de cores da empresa pra aplicar aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
