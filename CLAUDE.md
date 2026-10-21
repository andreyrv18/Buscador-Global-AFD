# Buscador Global AFD

Extensão do Chrome que lê e audita arquivos **AFD** (Arquivo Fonte de Dados) de relógios de ponto, conforme as Portarias **595/2013**, **1510/2009** e **671/2021**. Todo o processamento é **local**: nenhum dado sai da máquina do usuário.

Em produção desde a v3.8 (JS puro). Este repositório é a reconstrução em React + TypeScript, que será publicada como **3.9.0**.

> O roteiro de trabalho está em `PLANO-DE-ACAO.md`. Leia antes de implementar qualquer fase.

---

## Stack

React 19 · TypeScript (strict) · Vite · CRXJS · Vitest + Testing Library · Playwright · Manifest V3

```bash
npm run dev        # desenvolvimento
npm run build      # tsc -b && vite build → dist/ e release/*.zip
npm test           # Vitest (watch)
npm run coverage   # Vitest + cobertura
npm run test:e2e   # Playwright (faz o build antes)
```

---

## Arquitetura

Camadas, de dentro para fora. A dependência só aponta para dentro.

```
arquivo (File)
   ↓
src/afd/afd.worker.ts     thread separada, cancelável
   ↓
src/afd/parser.ts         TypeScript puro, sem React
   ↓
src/state/AfdContext      estado compartilhado pelas abas
   ↓
src/views/afd/*           componentes de tela
```

### Regra de ouro

**Nenhum componente React lê posição de caractere.** Todo parsing, validação de leiaute e cálculo de domínio vive em `src/afd/`, em funções puras, cobertas por teste unitário. Componente só recebe dado já estruturado e o exibe.

### Estrutura de pastas

```
src/
  afd/              domínio: tipos, detecção de portaria, parser, worker, fixtures
  state/            contextos React (AfdContext)
  hooks/            hooks reutilizáveis (usePaginacao, useFiltrosAfd)
  components/       design system, uma pasta por componente
  views/            telas, agrupadas por módulo (afd/, coletor/, showcase/)
  routes/           VIEW_REGISTRY — mapa chave → componente de view
  pages/            layout (Dashboard)
  styles/           tokens e tipografia globais
  util/             utilidades genéricas
```

Um componente do design system é sempre uma pasta com 4 arquivos:

```
components/botao/
  Botao.tsx          implementação
  Botao.types.ts     interfaces e tipos públicos
  Botao.css          estilos
  Botao.test.tsx     teste ao lado do código
```

### Adicionar uma tela nova

Três passos, descritos em `src/components/navbar/NovaPagina.md`: declarar a chave em `Navbar.types.ts`, incluir o item em `Navbar.data.tsx` e registrar o componente no `VIEW_REGISTRY`.

---

## TypeScript

- `strict` ligado. **`any` é proibido** — use `unknown` + narrowing, ou generics. (Existe um `as any` em `Tabela.tsx`; corrija ao encostar nele.)
- **Sempre `import type`** para importar tipos. O projeto usa `isolatedModules`, e um import de tipo sem a palavra `type` quebra o build.
- Tipos públicos de um componente ficam no `.types.ts` dele; tipos de domínio ficam em `src/afd/tipos.ts`.
- Prefira união de literais a `enum` (`type Portaria = '671' | '595' | '1510'`).
- Sem exceção para controle de fluxo em parsing: retorne um resultado que represente a falha e contabilize a linha inválida.
- Não engula erro com `catch {}` vazio.

### Idioma

Domínio, variáveis e nomes de componentes em **português**, mantendo o vocabulário das portarias (`marcacoes`, `ajustesRelogio`, `eventosRep`, `cpfPis`, `nsr`). Termos consagrados de React e do ecossistema ficam em inglês (`props`, `hooks`, `render`, `key`). Comentários e mensagens ao usuário em português.

---

## CSS — BEM com prefixo `bga-`

Metodologia **BEM**, prefixo `bga-` em todo seletor de componente:

```
.bga-bloco                 bloco
.bga-bloco__elemento       elemento (dois underscores)
.bga-bloco--modificador    modificador (dois hífens)
```

```css
.bga-navbar { }
.bga-navbar__item { }
.bga-navbar__item--ativo { }
```

**Dívida conhecida:** parte do código usa `__` onde deveria ser `--` (`bga-btn__outline`, `bga-btn__small`, `bga-switch__checked`, `bga-input__error`). São modificadores escritos como elementos. Normalize na Fase 3 e atualize os testes que fazem asserção nessas classes.

O Combobox usa o prefixo `dixi-`, herdado da referência de UI. Padronize para `bga-` na Fase 3.

### Regras de estilo

- **Sempre tokens**, nunca valor cru: `var(--azul-base)`, não `#3379bc`. Tokens em `src/styles/index.css`.
- Estilo de componente no `.css` do componente. Nada de `style={{}}` inline, exceto valor realmente dinâmico (largura vinda de prop, cor de grupo).
- O tema escuro é suportado: toda cor nova precisa de valor nos dois temas. Não use `--background` para texto sobre superfície escura fixa.
- Não use `!important`.
- Sem `@import` de CDN. Fontes e ícones são empacotados — a extensão precisa funcionar sem internet.
- Nunca aplique `user-select: none` em área com dado do arquivo: o usuário precisa copiar CPF e nome.

### Acessibilidade

Elemento clicável é `<button>`. Se precisar ser `<li>` ou `<div>`, inclua `role`, `tabIndex` e `onKeyDown`. Todo campo tem `<label htmlFor>` ligado ao `id` do input.

---

## Testes

- Teste ao lado do código (`Componente.test.tsx`, `parser.test.ts`).
- Escrever o teste junto com a implementação, não depois.
- `src/afd/` exige cobertura acima de **90%** — é onde estão os bugs que causam laudo de auditoria errado.
- Teste comportamento visível, não detalhe interno. Prefira `getByRole` e `getByLabelText` a seletor de classe.
- **Teste condicional é proibido.** Um `if (x > 0) { expect(...) }` passa sem verificar nada. Se a condição pode não ocorrer, o teste está no lugar errado.
- Nome do teste descreve o comportamento em português: `deve ignorar a linha de assinatura digital`.
- Fixtures de AFD em `src/afd/__fixtures__/`, anonimizadas, uma por portaria.

---

## Domínio AFD — regras invioláveis

As posições completas de cada tipo de registro estão em `PLANO-DE-ACAO.md`, seção 1.2.

1. **Codificação ISO-8859-1.** O leiaute exige ASCII da ISO 8859-1. Decodificar como UTF-8 corrompe todo nome acentuado.
2. **Detecção de portaria:** se `linha[20] === 'T'`, é a 671; caso contrário é legado (595/1510). A 595 e a 1510 compartilham o mesmo parser — a 595 só acrescenta campos no fim da linha.
3. **Índices são 0-based.** O leiaute é 1-based: posição `011-034` vira `substring(10, 34)`.
4. **Descarte linha cujas 9 primeiras posições não sejam numéricas** — é a assinatura digital, não um registro.
5. **O CPF do responsável nunca identifica o empregado.** Só o identificador do Tipo 5 (CPF na 671, PIS no legado) alimenta o dicionário de nomes.
6. **Normalize documento** para dígitos e compare ignorando zeros à esquerda, nos dois lados.
7. Arquivo AFD pode ter centenas de milhares de linhas: leia em chunks no worker e **pagine antes de renderizar**. Nunca jogue a coleção inteira na tabela.
8. Trocar de arquivo encerra o processamento anterior (`worker.terminate()`) e descarta mensagens atrasadas.

---

## Extensão Chrome

- **Permissões: apenas `notifications`.** Pedir permissão nova faz o Chrome desativar a extensão para os usuários já instalados até que aceitem. Não adicione permissão sem necessidade real.
- Não use `innerHTML` nem `dangerouslySetInnerHTML` com conteúdo vindo do arquivo.
- Antes de publicar, confira o `manifest.json` gerado em `dist/`: o CRXJS injeta `web_accessible_resources` com `<all_urls>` para o HMR, e isso não pode ir para a loja.
- O pacote enviado não leva PDFs das portarias, `assets/` de documentação nem `.idea/`.

---

## Versionamento — SemVer

`MAJOR.MINOR.PATCH`, a partir da 3.8 publicada:

| Parte | Quando subir |
|---|---|
| MAJOR | mudança que quebra o fluxo do usuário ou remove funcionalidade |
| MINOR | funcionalidade nova compatível (nova aba, novo filtro, suporte a outro leiaute) |
| PATCH | correção de bug, sem funcionalidade nova |

- A versão vive no `package.json`; o `manifest.config.ts` a consome. **Altere só o `package.json`.**
- **Nunca publique versão menor que a da loja.** A Chrome Web Store recusa.
- O campo `version` do manifest aceita de 1 a 4 números separados por ponto. **Sufixo de pré-lançamento do SemVer não é válido ali** — `3.9.0-rc.1` quebra. Para rótulo de pré-lançamento use `version_name`, que aceita texto livre.
- Correção de bug de parsing é PATCH, mesmo mudando número de laudo: o comportamento anterior estava errado.

### Commits

Conventional Commits em português:

```
feat: filtro por intervalo de datas na aba de marcações
fix: data do ajuste de relógio na Portaria 671
test: fixtures da Portaria 595
refactor: extrai usePaginacao de FuncionariosAfdView
docs: atualiza o plano de ação
chore: remove dependências não usadas
```

---

## Como trabalhar neste repositório

- Siga as fases do `PLANO-DE-ACAO.md` e respeite a lista de arquivos de cada uma: fases diferentes podem estar rodando em paralelo.
- Não renomeie `src/ultil/` para `src/util/` junto com outra alteração: o renomear mexe em imports de vários arquivos e colide com quem estiver editando componentes.
- Não altere a estrutura de pastas nem introduza biblioteca nova sem combinar antes.
- A v3.8 original fica em outro diretório e serve de referência funcional. Qualquer diferença de número entre 3.8 e 3.9 precisa ser justificada como correção de bug conhecido.
- `npm install` pode falhar na máquina de trabalho (registro npm bloqueado). Evite tarefa que dependa de instalar pacote novo; se for inevitável, avise em vez de insistir.
