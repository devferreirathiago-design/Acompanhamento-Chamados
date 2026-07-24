import { supabase } from "./supabaseClient";

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw error;
  return data;
}

export async function cadastrar(nome, email, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) throw error;
  return data;
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function enviarRedefinicaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (error) throw error;
}

export async function definirNovaSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

export async function fetchSessaoAtual() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function ouvirMudancasDeSessao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export function normalizePerfil(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    status: row.status,
    criadoEm: row.criado_em,
  };
}

export async function fetchPerfilPorId(userId) {
  const { data, error } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePerfil(data) : null;
}

export async function fetchPerfis() {
  const { data, error } = await supabase
    .from("perfis")
    .select("*")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return data.map(normalizePerfil);
}

export async function atualizarStatusPerfil(id, status) {
  const { error } = await supabase.from("perfis").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function atualizarNomePerfil(id, nome) {
  const { error } = await supabase.from("perfis").update({ nome }).eq("id", id);
  if (error) throw error;
}
