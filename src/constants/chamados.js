import {
  Clock3,
  CheckCircle2,
  Circle,
} from "lucide-react";

export const CANAIS = ["VTEX", "iFood", "Rappi", "Call Center", "Logística"];
export const MODAIS = [
  "Entrega Rápida",
  "Entregador de Loja",
  "Retirada em Loja",
  "Coleta agendada",
  "Não definido",
];
export const SOLICITANTES = ["Loja", "SAC"];

// Prioridade do chamado — lista fechada (1 a 3) pra não ficar um número
// solto sem limite e sem explicação, como era antes.
export const ORDEM_OPCOES = [
  { value: 1, label: "1 — Alta" },
  { value: 2, label: "2 — Média" },
  { value: 3, label: "3 — Baixa" },
];

export const STATUS_LIST = [
  "Não iniciado",
  "Em andamento",
  "Aguardando Loja",
  "Aguardando SAC",
  "Aguardando Transportadora",
  "Finalizado",
];

export const STATUS_META = {
  "Não iniciado": { color: "#6B7280", icon: Circle },
  "Em andamento": { color: "#4F8FE8", icon: Clock3 },
  "Aguardando Loja": { color: "#E8A23D", icon: Clock3 },
  "Aguardando SAC": { color: "#E8735D", icon: Clock3 },
  "Aguardando Transportadora": { color: "#C77DE0", icon: Clock3 },
  Finalizado: { color: "#4FBF7A", icon: CheckCircle2 },
};

export const TIPO_OCORRENCIA_GRUPOS = [
  {
    grupo: "Item e Estoque",
    opcoes: [
      "Cadastro de item",
      "Devolução",
      "Erro de estoque",
      "Falta de item",
      "Item avariado",
      "Item incorreto",
      "Troca",
    ],
  },
  {
    grupo: "Logística e Entrega",
    opcoes: [
      "Coleta",
      "Entrega concluída",
      "Entregador atrasado",
      "Entregador extra",
      "Extravio",
      "Falta de energia",
      "Fora de rota",
      "Não entregue",
      "Reclamação sobre entregador",
      "Reenvio",
    ],
  },
  {
    grupo: "Financeiro",
    opcoes: ["Comprovante de estorno", "Cupom de desconto", "PBM"],
  },
  {
    grupo: "Processo e Sistema",
    opcoes: [
      "Acareação",
      "Cancelamento",
      "Erro de integração",
      "Erro FMS/PDV",
      "Erro operacional",
      "Solicitação incorreta",
      "Verificação de status",
    ],
  },
];

export const TIPO_OCORRENCIA_LIST = TIPO_OCORRENCIA_GRUPOS.flatMap((g) => g.opcoes);

// Acha o grupo (Item e Estoque / Logística e Entrega / etc.) de um tipo de
// ocorrência já escolhido — usado pra abrir a seleção em duas etapas
// (grupo primeiro, opção depois) já no grupo certo ao editar um chamado.
export function grupoDoTipo(tipo) {
  return TIPO_OCORRENCIA_GRUPOS.find((g) => g.opcoes.includes(tipo))?.grupo || "";
}

// Cores oficiais das bandeiras, extraídas do logo da Rede D1000
export const BANDEIRA_COLOR = {
  Drogasmil: "#FBB813",
  Farmalife: "#F5891F",
  Tamoio: "#70BD4A",
  Rosário: "#006CB6",
};

export function filialInfo(filiais, numero) {
  return filiais.find((f) => f.numero === Number(numero));
}

// Um chamado criado pela importação rápida (só número + data) fica sem
// esses campos até alguém completar manualmente pela edição.
const CAMPOS_OBRIGATORIOS = [
  ["filial", "Filial"],
  ["canal", "Canal de venda"],
  ["modal", "Modal logístico"],
  ["tipoOcorrencia", "Tipo de ocorrência"],
  ["valor", "Valor do pedido"],
  ["solicitante", "Solicitante"],
];

export function chamadoIncompleto(c) {
  return CAMPOS_OBRIGATORIOS.some(([campo]) => !c[campo]);
}

export function camposFaltando(c) {
  return CAMPOS_OBRIGATORIOS.filter(([campo]) => !c[campo]).map(([, label]) => label);
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export function hoursSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

// Define a cor do tempo em aberto conforme a urgência (chamados finalizados
// não têm urgência, então não entram nessa lógica)
export function urgencyColor(chamado) {
  if (chamado.status === "Finalizado") return "var(--text-faint)";
  const hrs = hoursSince(chamado.criado);
  if (hrs >= 24) return "#E8735D";
  if (hrs >= 4) return "#E8A23D";
  return "var(--text-faint)";
}