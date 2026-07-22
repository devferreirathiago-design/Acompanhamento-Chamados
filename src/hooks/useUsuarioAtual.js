import { useState, useEffect } from "react";

const CHAVE = "statushub_usuario";

export function useUsuarioAtual() {
  const [usuario, setUsuarioState] = useState(() => {
    try {
      return localStorage.getItem(CHAVE) || "";
    } catch {
      return "";
    }
  });

  function setUsuario(nome) {
    setUsuarioState(nome);
    try {
      localStorage.setItem(CHAVE, nome);
    } catch {
      // navegador sem suporte a localStorage — segue só em memória
    }
  }

  return [usuario, setUsuario];
}
