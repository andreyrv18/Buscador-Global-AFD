# Como adicionar um novo Grupo/Página no futuro?
Sempre que precisar adicionar um novo módulo à extensão (ex: módulo Auditoria), você precisará fazer apenas 3 passos simples:

1. Adicionar a chave no Navbar.types.ts:
````typescript
export type NavItemKey = 
  | "funcionario" | "relogio" | "eventos" | "marcacoes"
  | "coletor_funcionario" | "coletor_matricula"
  | "auditoria_logs"; // <-- Novo item
 ````

2. Adicionar a opção nos dados do Menu (Navbar.data.tsx):

````typescript
{
  groupKey: "auditoria",
  groupLabel: "Auditoria",
  icon: <AppIcons.Eventos_Rep />,
  items: [
    { key: "auditoria_logs", label: "Logs de Sistema", icon: <AppIcons.Eventos_Rep /> }
  ]
}
````

3. Registrar a View no VIEW_REGISTRY:

````typescript
auditoria_logs: AuditoriaLogsView
````