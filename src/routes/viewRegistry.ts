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

// Tabela de roteamento baseada em chave.
// O Show Case só é registrado em desenvolvimento: em produção `import.meta.env.DEV`
// vira `false` no build e a view sai do pacote.
export const VIEW_REGISTRY: Partial<Record<NavItemKey, ComponentType>> = {
  funcionario: FuncionariosAfdView,
  relogio: RelogioAfdView,
  eventos: EventosAfdView,
  marcacoes: MarcacoesAfdView,
  coletor_funcionario: FuncionariosColetorView,
  coletor_matricula: MatriculaColetorView,
  ...(import.meta.env.DEV ? { show_case: ShowCaseView } : {}),
};
