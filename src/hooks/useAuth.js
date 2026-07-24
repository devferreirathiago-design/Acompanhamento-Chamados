import { useState, useEffect } from "react";
import {
  fetchSessaoAtual,
  ouvirMudancasDeSessao,
  fetchPerfilPorId,
  sair as sairAuth,
} from "../services/auth";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroPerfil, setErroPerfil] = useState("");

  useEffect(() => {
    let ativo = true;

    fetchSessaoAtual()
      .then((s) => {
        if (ativo) setSession(s);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    const unsubscribe = ouvirMudancasDeSessao((s) => {
      setSession(s);
    });

    return () => {
      ativo = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setPerfil(null);
      return;
    }
    let ativo = true;
    fetchPerfilPorId(session.user.id)
      .then((p) => {
        if (ativo) setPerfil(p);
      })
      .catch((err) => ativo && setErroPerfil(err.message));
    return () => {
      ativo = false;
    };
  }, [session?.user?.id]);

  async function sair() {
    await sairAuth();
    setSession(null);
    setPerfil(null);
  }

  const usuario = perfil?.nome || session?.user?.email || "";
  const inativo = perfil?.status === "Inativo";

  return { session, perfil, usuario, loading, erroPerfil, inativo, sair };
}
