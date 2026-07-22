import { useState } from "react";

const CHAVE = "statushub_tema";

export function useTema() {
  const [tema, setTemaState] = useState(() => {
    try {
      return localStorage.getItem(CHAVE) || "dark";
    } catch {
      return "dark";
    }
  });

  function setTema(novo) {
    setTemaState(novo);
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // navegador sem suporte a localStorage — segue só em memória
    }
  }

  function alternar() {
    setTema(tema === "dark" ? "light" : "dark");
  }

  return [tema, alternar];
}