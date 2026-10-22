# Buscador Global AFD

Extensão do Chrome que lê e audita arquivos **AFD** (Arquivo Fonte de Dados) de relógios de ponto, conforme as Portarias **595/2013**, **1510/2009** e **671/2021**.

Todo o processamento é **local**: o arquivo é lido no próprio navegador e nenhum dado sai da máquina do usuário. A única permissão pedida é `notifications`.

Em produção desde a v3.8 (JavaScript puro). Este repositório é a reconstrução em React + TypeScript, que será publicada como **3.9.0**.

## O que a extensão faz

- Detecta a portaria do arquivo (671 ou legado 595/1510) e decodifica em ISO-8859-1.
- Lista funcionários (Tipo 5), marcações de ponto (Tipo 3/7), ajustes de relógio (Tipo 4) e eventos do REP (Tipo 6).
- Aponta linhas inválidas e descarta a linha de assinatura digital.
- Processa arquivos de centenas de milhares de linhas em um Web Worker, com paginação.

## Requisitos

- Node.js **22.22.2** ou superior (exigência do jsdom 30)
- Google Chrome

## Comandos

```bash
npm install        # instala as dependências
npm run dev        # desenvolvimento com HMR
npm run build      # tsc -b && vite build → dist/ e release/*.zip
npm test           # Vitest (watch)
npm run coverage   # Vitest + cobertura
npm run test:e2e   # Playwright (faz o build antes)
```

### Carregar no Chrome

1. Rode `npm run build` (ou `npm run dev`).
2. Abra `chrome://extensions/` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta `dist/`.
4. Clique no ícone da extensão para abrir o Buscador em uma nova aba.

## Stack

React 19 · TypeScript (strict) · Vite · CRXJS · Vitest + Testing Library · Playwright · Manifest V3

## Arquitetura

Camadas, de dentro para fora; a dependência só aponta para dentro:

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

Nenhum componente React lê posição de caractere: parsing, validação de leiaute e cálculo de domínio ficam em `src/afd/`, em funções puras cobertas por teste.

```
src/
  afd/              domínio: tipos, detecção de portaria, parser, worker, fixtures
  state/            contextos React
  hooks/            hooks reutilizáveis
  components/       design system, uma pasta por componente
  views/            telas, agrupadas por módulo (afd/, coletor/, showcase/)
  routes/           VIEW_REGISTRY — mapa chave → componente de view
  pages/            layout (Dashboard)
  styles/           tokens e tipografia globais
```

## Versionamento

SemVer a partir da 3.8 publicada. A versão vive só no `package.json`; o `manifest.config.ts` a consome. O campo `version` do manifest não aceita sufixo de pré-lançamento (`3.9.0-rc.1`); para rótulo use `version_name`.

## Documentação do projeto

- `CLAUDE.md` — convenções de código, CSS, testes e regras do domínio AFD
- `PLANO-DE-ACAO.md` — roteiro de trabalho da 3.9, por fases
