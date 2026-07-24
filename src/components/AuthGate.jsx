import { useState } from "react";
import { entrar, cadastrar, enviarRedefinicaoSenha } from "../services/auth";

const MODOS = {
  LOGIN: "login",
  CADASTRO: "cadastro",
  ESQUECI: "esqueci",
};

export default function AuthGate() {
  const [modo, setModo] = useState(MODOS.LOGIN);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(traduzErro(err.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleCadastro(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    if (!nome.trim()) {
      setErro("Informe seu nome.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      setAviso(
        "Conta criada! Se a confirmação por email estiver ativa, verifique sua caixa de entrada antes de entrar."
      );
      setModo(MODOS.LOGIN);
    } catch (err) {
      setErro(traduzErro(err.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleEsqueci(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setSaving(true);
    try {
      await enviarRedefinicaoSenha(email.trim());
      setAviso("Se esse email existir, enviamos um link pra redefinir a senha.");
    } catch (err) {
      setErro(traduzErro(err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sh-gate">
      <p className="sh-eyebrow">StatusHub · Rede D1000</p>
      <h1 className="sh-title" style={{ marginBottom: 18 }}>
        {modo === MODOS.LOGIN && "Entrar"}
        {modo === MODOS.CADASTRO && "Criar conta"}
        {modo === MODOS.ESQUECI && "Redefinir senha"}
      </h1>

      {erro && <div className="sh-error">{erro}</div>}
      {aviso && <div className="sh-toast">{aviso}</div>}

      {modo === MODOS.LOGIN && (
        <form className="sh-form-gate" onSubmit={handleLogin}>
          <div className="sh-field">
            <label className="sh-label">Email</label>
            <input
              type="email"
              autoFocus
              placeholder="seuemail@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="sh-field">
            <label className="sh-label">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="sh-submit" disabled={saving}>
            {saving ? "Entrando..." : "Entrar"}
          </button>
          <div className="sh-gate-links">
            <button type="button" className="sh-link-btn" onClick={() => { setErro(""); setAviso(""); setModo(MODOS.ESQUECI); }}>
              Esqueci minha senha
            </button>
            <button type="button" className="sh-link-btn" onClick={() => { setErro(""); setAviso(""); setModo(MODOS.CADASTRO); }}>
              Criar conta
            </button>
          </div>
        </form>
      )}

      {modo === MODOS.CADASTRO && (
        <form className="sh-form-gate" onSubmit={handleCadastro}>
          <div className="sh-field">
            <label className="sh-label">Nome</label>
            <input
              autoFocus
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="sh-field">
            <label className="sh-label">Email</label>
            <input
              type="email"
              placeholder="seuemail@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="sh-field">
            <label className="sh-label">Senha</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="sh-submit" disabled={saving}>
            {saving ? "Criando..." : "Criar conta"}
          </button>
          <div className="sh-gate-links">
            <button type="button" className="sh-link-btn" onClick={() => { setErro(""); setAviso(""); setModo(MODOS.LOGIN); }}>
              Já tenho conta
            </button>
          </div>
        </form>
      )}

      {modo === MODOS.ESQUECI && (
        <form className="sh-form-gate" onSubmit={handleEsqueci}>
          <div className="sh-field">
            <label className="sh-label">Email</label>
            <input
              type="email"
              autoFocus
              placeholder="seuemail@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="sh-submit" disabled={saving}>
            {saving ? "Enviando..." : "Enviar link de redefinição"}
          </button>
          <div className="sh-gate-links">
            <button type="button" className="sh-link-btn" onClick={() => { setErro(""); setAviso(""); setModo(MODOS.LOGIN); }}>
              Voltar pro login
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function traduzErro(msg) {
  if (msg?.includes("Invalid login credentials")) return "Email ou senha incorretos.";
  if (msg?.includes("User already registered")) return "Já existe uma conta com esse email.";
  if (msg?.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg || "Algo deu errado. Tenta de novo.";
}
