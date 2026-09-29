import type { ComponentType } from "react";
import type { NavItemKey } from "../components/navbar/Navbar.types";

// Import das Views
import { FuncionariosAfdView } from "../views/afd/FuncionariosAfdView";
import { RelogioAfdView } from "../views/afd/RelogioAfdView";
import { EventosAfdView } from "../views/afd/EventosAfdView";
import { MarcacoesAfdView } from "../views/afd/MarcacoesAfdView";
import { FuncionariosColetorView } from "../views/coletor/FuncionariosColetorView";
import { MatriculaColetorView } from "../views/coletor/MatriculaColetorView";
import { ShowCaseView } from "@/views/showcase/ShowCaseView";

// Tabela de Roteamento baseada em chave
export const VIEW_REGISTRY: Record<NavItemKey, ComponentType> = {
  funcionario: FuncionariosAfdView,
  relogio: RelogioAfdView,
  eventos: EventosAfdView,
  marcacoes: MarcacoesAfdView,
  coletor_funcionario: FuncionariosColetorView,
  coletor_matricula: MatriculaColetorView,
  show_case: ShowCaseView
};