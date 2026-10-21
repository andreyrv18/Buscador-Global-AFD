# Plano de Ação — Buscador Global AFD 3.9

Migração da extensão publicada (v3.8, JS puro, 27 usuários ativos) para a base React + TypeScript + Vite + CRXJS.

**Decisões já tomadas**

| Decisão | Definição |
|---|---|
| Versionamento | Continua de 3.8 → próxima publicação **3.9.0** |
| Permissões | Mantém `notifications` (aviso de conclusão do processamento) |
| Menu lateral | **Mantido** — navbar em acordeão da reconstrução |
| Módulo Coletor | **Mantido** — nova implementação, fora do escopo da paridade AFD |
| Base de código | A reconstrução React é a base; a v3.8 é a referência funcional |

---

## 1. Princípio da arquitetura

A v3.8 misturava leitura de arquivo, estado e DOM num único `index.js`. A reconstrução tem o oposto: só interface, sem domínio. O alvo é separar em camadas, com o parser isolado de React.

```
arquivo (File)
   ↓
afd.worker.ts            ← thread separada, cancelável
   ↓
src/afd/parser.ts        ← TypeScript puro, sem React, 100% testável
   ↓
AfdContext (estado)      ← resultado + status + filtros por aba
   ↓
views/afd/*              ← Funcionários, Relógio, Eventos, Marcações
```

Regra prática: **nada que leia posição de caractere entra em componente React.** Todo parsing vive em `src/afd/` e é coberto por teste unitário.

### Estrutura de pastas alvo

```
src/
  afd/                      ← NOVO (domínio)
    tipos.ts                tipos por registro + Portaria + RelatorioAfd
    deteccao.ts             identifica 671 vs legado (595/1510)
    parser.ts               parsing por tipo de registro
    parser.test.ts          fixtures das 3 portarias
    afd.worker.ts           worker que usa o parser
    __fixtures__/           amostras .txt por portaria
  state/                    ← NOVO
    AfdContext.tsx          arquivo, relatório, status, erro
    useAfd.ts
  hooks/                    ← NOVO
    usePaginacao.ts
    useFiltrosAfd.ts
  components/               ← MANTIDO (correções da Fase 3)
  views/
    afd/                    ← implementar (Fase 4)
    coletor/                ← MANTIDO (implementação futura)
    showcase/               ← MANTIDO, visível só em DEV
  pages/ routes/ styles/    ← MANTIDO
  util/                     ← renomear de "ultil"
```

---

## 2. Fases

### Fase 0 — Higiene e manifest *(bloqueia a publicação)*

- [ ] `package.json`: `version` → `3.9.0`
- [ ] `manifest.config.ts`: `name` → `"Buscador Global AFD"` (ou `__MSG_extName__` + `default_locale: 'pt_BR'` e restaurar `_locales/pt_BR`)
- [ ] `permissions`: **remover** `sidePanel` e `contentSettings`, **adicionar** `notifications`
  - `contentSettings` dispara aviso de permissão nova → o Chrome desativa a extensão para os 27 usuários até aceitarem
- [ ] Ícones 16 / 32 / 48 / 128 em `public/icons/`
- [ ] `index.html`: `lang="pt-BR"`, `<title>Buscador Global AFD</title>`
- [ ] `.gitignore`: adicionar `playwright-report/`, `test-results/`, `coverage/` e remover os já versionados do índice
- [ ] Renomear `src/ultil/` → `src/util/`
- [ ] `src/util/DicionarioDeRotas.ts`: se for a API do módulo Coletor, mover para `src/coletor/api/rotas.ts`; se não for, remover
- [ ] Dependências: remover `@types/chrome` (duplicado com `chrome-types`), `@types/jest`, `@vitest/browser*` se não usados
- [ ] Node ≥ 22.22.2 (exigência do jsdom 30) — registrar em `engines`
- [ ] Reescrever o `README.md` (hoje é o template do CRXJS)

**Aceite:** `npm run build` gera `dist/` cujo `manifest.json` tem versão 3.9.0, nome correto e apenas `notifications`.

---

### Fase 1 — Domínio AFD *(maior valor, fazer antes da UI)*

#### 1.1 Tipos e detecção

- [ ] `tipos.ts`: `Portaria = '671' | '595' | '1510'`, `RegistroTipo3|4|5|6|7`, `CabecalhoAfd`, `TrailerAfd`, `RelatorioAfd`, `LinhaInvalida`
- [ ] `deteccao.ts`: a distinção decisiva é o caractere no índice 20 das linhas de registro
  - `linha[20] === 'T'` → **671** (data/hora ISO `AAAA-MM-ddThh:mm:00ZZZZZ`)
  - caso contrário → **legado** (595/1510, `ddmmaaaa` + `hhmm`)
  - dentro do legado, 595 e 1510 só diferem por campos extras no fim da linha (CRC, CPF do responsável, registro Tipo 6) → **um único parser legado** que lê os campos opcionais quando a linha for comprida o bastante
- [ ] Descartar linhas cujas 9 primeiras posições não sejam numéricas (elimina a linha de assinatura digital, bug #6 da análise)
- [ ] Decodificar com **ISO-8859-1** (`TextDecoder('iso-8859-1')`), nunca UTF-8 (bug #3 — acentos corrompidos)

#### 1.2 Mapa de posições (índices JS `substring(início, fim)`)

**Portaria 671**

| Tipo | Campo | substring |
|---|---|---|
| todos | NSR | `(0, 9)` |
| todos | tipo do registro | `charAt(9)` |
| **3** | data / hora / CPF | `(10,20)` / `(21,29)` / `(34,46)` |
| **4** | antes: data/hora | `(10,20)` / `(21,29)` |
| **4** | depois: data/hora | `(34,44)` / `(45,53)` |
| **4** | CPF responsável | `(58,69)` |
| **5** | data / hora | `(10,20)` / `(21,29)` |
| **5** | operação I/A/E | `charAt(34)` |
| **5** | CPF (12) / nome (52) | `(35,47)` / `(47,99)` |
| **5** | demais dados / CPF resp. | `(99,103)` / `(103,114)` |
| **6** | data / hora / evento | `(10,20)` / `(21,29)` / `(34,36)` |
| **7** | data / hora / CPF | `(10,20)` / `(21,29)` / `(34,46)` |
| **7** | gravação / coletor / on-off / hash | `(46,70)` / `(70,72)` / `charAt(72)` / `(73,137)` |

> Correções críticas em relação à v3.8: o `T` do Tipo 4 está no índice **20**, não no 10; a data ajustada começa em **34**, não em 35; o CPF do responsável existe em `(58,69)` e não é `"N/A"`; o CPF tem **12** posições e o nome do Tipo 5 vai até **99**.

**Portaria 1510 / 595 (legado)**

| Tipo | Campo | substring |
|---|---|---|
| **3** | data `ddmmaaaa` / hora `hhmm` / PIS | `(10,18)` / `(18,22)` / `(22,34)` |
| **4** | antes: data / hora | `(10,18)` / `(18,22)` |
| **4** | depois: data / hora | `(22,30)` / `(30,34)` |
| **4** | CPF responsável *(só 595)* | `(34,45)` |
| **5** | data / hora / operação | `(10,18)` / `(18,22)` / `charAt(22)` |
| **5** | PIS (12) / nome (52) | `(23,35)` / `(35,87)` |
| **5** | demais dados / CPF resp. *(só 595)* | `(87,91)` / `(91,102)` |
| **6** | data / hora / evento *(só 595)* | `(10,18)` / `(18,22)` / `(22,24)` |

> O campo `(87,98)` que a v3.8 usava como "PIS/CPF secundário" na verdade mistura "demais dados" com o CPF do responsável — era isso que cadastrava nome errado nas marcações (bug #5). O CPF do responsável **não** identifica o empregado e não entra no dicionário de nomes.

#### 1.3 Regras de negócio

- [ ] Dicionário de nomes: alimentado **apenas** pelo identificador do empregado do Tipo 5 (CPF no 671, PIS no legado)
- [ ] Resolução do nome nas marcações: `Map` pré-normalizado (dígitos, sem zeros à esquerda) em vez de varredura linear — O(1) por marcação
- [ ] Códigos do Tipo 6: incluir `07` (disponibilidade de serviço, REP-P) e `08` (indisponibilidade), ausentes na v3.8
- [ ] Contar linhas inválidas em vez de engolir exceção (`catch {}`) e expor o total na interface

#### 1.4 Testes do parser

- [ ] `__fixtures__/afd-671.txt`, `afd-595.txt`, `afd-1510.txt` — amostras curtas e anonimizadas, com todos os tipos de registro
- [ ] Um teste por bug da análise da v3.8:
  - Tipo 4 do 671 reconhecido e com CPF do responsável lido
  - acento preservado em nome com `Ç`/`Ã`
  - CPF de 12 posições com zero à esquerda não corta dígito nem invade o nome
  - CPF do responsável não vira nome de empregado
  - linha de assinatura digital ignorada
  - eventos 07 e 08 descritos
  - marcação sem Tipo 5 correspondente → "Desconhecido"
  - contagem de linhas inválidas

**Aceite:** `npm test` verde, cobertura de `src/afd/` acima de 90%, e os mesmos arquivos AFD de produção produzem na 3.9 um relatório igual ou melhor que o da 3.8.

---

### Fase 2 — Worker e estado

- [ ] `afd.worker.ts` importando `parser.ts` (worker como módulo ES, suportado pelo CRXJS)
- [ ] **Cancelamento:** cada upload gera um token; ao trocar de arquivo, `worker.terminate()` e descarte de mensagens do token anterior (a v3.8 deixava o resultado antigo sobrescrever o novo)
- [ ] Leitura em chunks com `file.stream()` + `TextDecoderStream('iso-8859-1')`, emitindo progresso (%) — evita carregar 100 MB de uma vez
- [ ] `worker.terminate()` também no caminho de erro
- [ ] `AfdContext`: `{ arquivo, relatorio, status: 'ocioso'|'lendo'|'pronto'|'erro', progresso, erro, linhasInvalidas }`
- [ ] Upload no topo da Dashboard (fora das abas) — um arquivo alimenta as 4 views
- [ ] Filtros por aba preservados no contexto, para que trocar de aba não perca busca e página

**Aceite:** carregar arquivo de ~50 MB sem travar a interface; trocar de arquivo no meio do processamento mantém o resultado do último selecionado.

---

### Fase 3 — Correções do design system

- [ ] `NavBar.tsx`: `import tipografia from '...module.css'` e usar `tipografia.tituloModal` (hoje interpola o objeto e gera `[object Object]`); remover o import inerte em `App.tsx`
- [ ] Modo escuro: título e rótulos da navbar usam `--background`/`--background-2`, que ficam quase pretos sobre a navbar `#2a2a2a` → criar tokens próprios (`--navbar-texto`) fixos em claro
- [ ] Remover `user-select: none` do `:root` (impede copiar CPF e nome das tabelas); aplicar só onde fizer sentido
- [ ] `Combobox.css`: corrigir o agrupamento do bloco de hover — hoje pinta todos os rótulos de azul e nunca mostra o cinza de "Título de Campo"
- [ ] Unificar a cor de erro (`--vermelho-red-stop`) entre Input e Combobox
- [ ] `Navbar.css`: remover a definição duplicada de `.bga-navbar__item`
- [ ] Empacotar **Open Sans** localmente (`@fontsource/open-sans`) — hoje é declarada e não carregada, e CDN contraria o "processa localmente"
- [ ] Acessibilidade: itens do menu e opções do Combobox como `<button>` ou com `role`/`tabIndex`/`onKeyDown`; `<label htmlFor>` ligado ao `id` do campo; `role="combobox"` + `aria-expanded`
- [ ] Corrigir `data-testid` copiados: `EventosAfdView` usa `view-funcionarios-afd`; `FuncionariosColetorView` usa `view-matricula-coletor`
- [ ] Padronizar `data-testid` por view (`view-afd-funcionarios`, `view-coletor-matricula`, …)
- [ ] `ShowCase` visível apenas com `import.meta.env.DEV` (Coletor permanece em produção)

---

### Fase 4 — Views AFD com paridade da v3.8

Todas consomem `useAfd()` e reusam `Tabela`, `Input`, `Combobox`, `Button`, `Card`.

- [ ] `usePaginacao` (10/20/50/100/500) e `useFiltrosAfd` (nome, CPF/PIS só dígitos, data, ordem) com debounce de ~200 ms
- [ ] Paginar **antes** de passar para `Tabela` (nunca renderizar o conjunto inteiro)
- [ ] Zebra por dia: pré-calcular `Map<data, índice>` uma vez, em vez de `indexOf` por linha

| View | Conteúdo | Recursos |
|---|---|---|
| **Funcionários** (Tipo 5) | Data, Hora, Operação, CPF/PIS, Colaborador | filtros, ordem, paginação, cards clicáveis Todas/Inclusão/Alteração/Exclusão com contagem filtrada + totais do arquivo, zebra, cores por operação, exportar |
| **Ajustes Relógio** (Tipo 4) | Antes (vermelho), Depois (verde), CPF responsável | contador; **novo:** paginação e filtro de data |
| **Eventos REP** (Tipo 6) | Data/Hora, Código, Descrição | contador, paginação; **novo:** filtro por código |
| **Marcações** (Tipo 3/7) | Data, Hora, NSR, CPF/PIS, Colaborador | filtros, ordem, paginação, total × encontradas; **novo (Tipo 7):** coletor e on-line/off-line |

**Aceite:** com o mesmo AFD, os números de cada aba batem com os da v3.8 (exceto onde a 3.9 corrige um bug conhecido — nesse caso, documentar a diferença).

---

### Fase 5 — Exportação e notificação

- [ ] Exportar JSON equivalente ao da v3.8 (`auditoria_afd_<timestamp>.json`), **sem** duplicar `porData` e `porCPF` (a v3.8 gravava o mesmo registro duas vezes)
- [ ] Exportar CSV do resultado **filtrado** da aba ativa
- [ ] `chrome.notifications.create` ao concluir, com fallback silencioso quando a API não existir (ambiente de teste)

---

### Fase 6 — Testes e CI

- [ ] Unitários: parser (Fase 1), `usePaginacao`, `useFiltrosAfd`, `AfdContext`
- [ ] E2E: upload de uma fixture AFD real → conferir contagem em cada aba, filtro, troca de página e exportação
- [ ] Corrigir o E2E do Switch, que hoje passa sem testar nada (`if (count > 0)` pula tudo quando a tela não tem switch)
- [ ] Testes da Dashboard devem conferir **qual** view abriu, via `data-testid`, e não apenas "main não vazio"
- [ ] Playwright: `headless: process.env.CI ? 'new' : false` para rodar em CI
- [ ] Renomear o teste `should show "Vite + React" text`
- [ ] GitHub Actions: `npm ci && npm run build && npm test && npm run test:e2e`

---

### Fase 7 — Publicação da 3.9.0

- [ ] `dist/manifest.json` conferido: versão 3.9.0, apenas `notifications`, sem `key` nem `update_url` (se usar `key` em desenvolvimento para fixar o ID, remover antes do envio)
- [ ] Conferir `web_accessible_resources` no pacote final — o CRXJS injeta `<all_urls>` com `**/*` para o HMR; isso não deve ir para a loja
- [ ] Zip sem `assets/` de documentação, sem PDFs das portarias, sem `.idea/`
- [ ] Testar o pacote em perfil limpo do Chrome, carregado sem compactar
- [ ] Testar o fluxo de atualização: instalar a 3.8, substituir pela 3.9 e confirmar que não aparece pedido de permissão nova
- [ ] Atualizar prints e descrição na Chrome Web Store
- [ ] Tag `v3.9.0` no repositório

---

## 3. Backlog pós-3.9

| Item | Valor |
|---|---|
| Cabeçalho (Tipo 1) e empresa (Tipo 2) | Empregador, CNPJ/CPF, nº de fabricação do REP, período, versão do leiaute |
| Trailer (Tipo 9) | Conferir contagens declaradas × lidas — divergência indica arquivo truncado |
| **Lacunas e duplicidades de NSR** | Principal indício de adulteração; alto valor de auditoria |
| CRC-16 | 671 REP-A/REP-P usa CRC-16/KERMIT; validar por registro |
| Cadeia SHA-256 do Tipo 7 | Verificação de integridade encadeada do REP-P |
| Filtro por intervalo de datas | A v3.8 só filtra data exata |
| i18n (pt_BR/en/es) | O `i18n.js` da v3.8 ficou órfão; refazer com o idioma vindo do contexto |
| Módulo Coletor | Implementação nova, escopo próprio |

---

## 4. Riscos

| Risco | Mitigação |
|---|---|
| Aviso de permissão desativa a extensão para os 27 usuários | Fase 0: só `notifications`; testar o fluxo de atualização antes de enviar |
| Divergência de números entre 3.8 e 3.9 assusta o usuário | Rodar as duas lado a lado com os mesmos arquivos; documentar cada diferença como correção |
| Fabricante que preenche CPF com zero à esquerda | Normalizar para dígitos e comparar sem zeros à esquerda nos dois lados |
| Arquivo AFD muito grande trava a interface | Leitura em chunks no worker + paginação antes da renderização |
| Sem acesso ao registro npm na máquina de trabalho | Manter `node_modules` instalado em máquina com acesso ou usar cache offline do npm |

---

## 5. Ordem sugerida de execução

```
Fase 0 ──┐
         ├──► Fase 1 ──► Fase 2 ──► Fase 4 ──► Fase 5 ──► Fase 6 ──► Fase 7
Fase 3 ──┘
```

As fases 0 e 3 são independentes do domínio e podem ser feitas em paralelo. A Fase 1 é o caminho crítico: sem o parser testado, nada da paridade existe.
