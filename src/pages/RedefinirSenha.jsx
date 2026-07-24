import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { definirNovaSenha } from "../services/auth";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await definirNovaSenha(senha);
      setOk(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setErro(err.message || "Não consegui atualizar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sh-gate">
      <p className="sh-eyebrow">StatusHub · Rede D1000</p>
      <h1 className="sh-title" style={{ marginBottom: 18 }}>
        Definir nova senha
      </h1>

      {erro && <div className="sh-error">{erro}</div>}
      {ok && <div className="sh-toast">Senha atualizada! Redirecionando...</div>}

      {!ok && (
        <form className="sh-form-gate" onSubmit={handleSubmit}>
          <div className="sh-field">
            <label className="sh-label">Nova senha</label>
            <input
              type="password"
              autoFocus
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="sh-submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}
    </div>
  );
}
