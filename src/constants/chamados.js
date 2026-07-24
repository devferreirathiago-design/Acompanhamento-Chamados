import {
  Clock3,
  CheckCircle2,
  Circle,
  Truck,
  Store,
  Headphones,
  Building2,
} from "lucide-react";

export const CANAIS = ["VTEX", "iFood", "Rappi", "Call Center"];
export const MODAIS = ["Entrega Rápida", "Entregador de Loja", "Retirada em Loja", "Coleta agendada"];
export const SOLICITANTES = ["Loja", "SAC"];

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

export const PARTY_META = {
  Operação: { color: "#4F8FE8", icon: Building2 },
  Loja: { color: "#38B2A3", icon: Store },
  SAC: { color: "#C77DE0", icon: Headphones },
  Transportadora: { color: "#E8A23D", icon: Truck },
};

export const PARTY_LIST = Object.keys(PARTY_META);

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
      "Entregador extra",
      "Extravio",
      "Falta de energia",
      "Fora de rota",
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

export const BANDEIRA_COLOR = {
  Drogasmil: "#4F8FE8",
  Farmalife: "#4FBF7A",
  Tamoio: "#E8A23D",
  Rosário: "#C77DE0",
};

export function filialInfo(filiais, numero) {
  return filiais.find((f) => f.numero === Number(numero));
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
