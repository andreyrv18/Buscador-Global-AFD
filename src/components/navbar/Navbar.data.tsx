import { AppIcons } from "../../ultil/DicionariosDeIcones";
import type { NavGroup } from "./Navbar.types";

export const navGroups: NavGroup[] = [
  {
    groupKey: "afd",
    groupLabel: "AFD",
    icon: <AppIcons.Funcionario />, // Ícone representante do grupo
    colorVariant: "var(--azul-padrao)",
    items: [
      {
        key: "funcionario",
        label: "Funcionários (Tipo 5)",
        icon: <AppIcons.Funcionario />,
      },
      {
        key: "relogio",
        label: "Ajustes Relógio (Tipo 4)",
        icon: <AppIcons.Ajustes_Relogio />,
      },
      {
        key: "eventos",
        label: "Eventos REP (Tipo 6)",
        icon: <AppIcons.Eventos_Rep />,
      },
      {
        key: "marcacoes",
        label: "Marcações (Tipo 3/7)",
        icon: <AppIcons.Marcacoes />,
      },
    ],
  },
  {
    groupKey: "coletor",
    groupLabel: "Coletor",
    icon: <AppIcons.Ajustes_Relogio />,
    colorVariant: "var(--vermelho-red-stop)",
    items: [
      {
        key: "coletor_funcionario",
        label: "Funcionários",
        icon: <AppIcons.Funcionario />,
      },
      {
        key: "coletor_matricula",
        label: "Matrícula",
        icon: <AppIcons.Ajustes_Relogio />,
      },
    ],
  },
  {
    groupKey: "showCase",
    groupLabel: "Show Case",
    colorVariant: "var(--roxo-vivid-violet)",
    icon: <AppIcons.Show_case />,
    items: [
      { key: "show_case", label: "Show Case", icon: <AppIcons.Show_case_item /> }
    ]
  }
];