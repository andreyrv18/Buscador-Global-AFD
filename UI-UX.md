# UI/UX — volta ao conceito original

Documento de direção visual para a 3.9.x. A reconstrução ficou bonita, mas perdeu a identidade da 3.8. Aqui estão as decisões para recuperá-la, mantendo o que a nova base trouxe de bom: componentes tipados, BEM, acessibilidade, fontes empacotadas e dados no worker.

**O conceito:** barra lateral azul, conteúdo numa "ilha" branca sobre fundo acinzentado, azul como cor de estrutura (cabeçalho, destaques, rodapé) e cor usada com parcimônia, só onde carrega significado — operação, código de evento, hora da marcação.

---

## 1. Tokens

Alterações em `src/styles/index.css`.

### Alterar

| Token | Hoje | Passa a ser | Motivo |
|---|---|---|---|
| `--background-navbar` | `#2a2a2a` | `#0d6efd` | barra lateral volta ao azul |
| `--navbar-item-ativo` | `rgb(255 255 255 / 15%)` | `#0b5ed7` | item ativo da 3.8 |
| `--tabela-cabecalho` | `#e9ecef` | `#3379bc` | cabeçalho colorido |
| `--operacao-inclusao` | `#1e7d32` | `#28a745` | verde da 3.8 |
| `--operacao-alteracao` | `#b45309` | `#fd7e14` | laranja da 3.8 |
| `--operacao-exclusao` | `#c62828` | `#dc3545` | vermelho da 3.8 |
| `--ajuste-antes` | `#c62828` | `#dc3545` | mesma paleta |
| `--ajuste-depois` | `#1e7d32` | `#28a745` | mesma paleta |

### Acrescentar

| Token | Valor | Uso |
|---|---|---|
| `--fundo-area` | `#f4f6f9` | fundo da área de conteúdo, atrás da ilha |
| `--tabela-cabecalho-texto` | `#fff` | texto do `th` sobre o azul |
| `--azul-destaque` | `#004085` | "Página X de Y" e contorno do card "Todas" |
| `--faixa-fundo` | `#f8f9fa` | rodapé da paginação e faixa de filtros |
| `--faixa-borda` | `#dee2e6` | borda dessas faixas |
| `--linha-hover` | `#e2eafc` | linha da tabela sob o cursor |
| `--card-todas-fundo` | `#e2eafc` | card de filtro ativo |
| `--card-inclusao-fundo` | `#e8f5e9` | card de filtro ativo |
| `--card-alteracao-fundo` | `#fff3e0` | card de filtro ativo |
| `--card-exclusao-fundo` | `#ffebee` | card de filtro ativo |

### Modo escuro sai de cena

A barra preta existia como ensaio de tema escuro. Com ela voltando ao azul fixo, o bloco `@media (prefers-color-scheme: dark)` passa a produzir uma tela híbrida — barra azul clara sobre conteúdo escuro — para quem usa o Windows no tema escuro. Enquanto o tema escuro não for retomado, troque `color-scheme: light dark` por `color-scheme: light` e neutralize esse bloco.

Os tokens escuros podem ficar comentados no arquivo, para quando o assunto voltar.

---

## 2. Barra lateral

Fundo `--background-navbar`, agora azul. Item ativo em `--navbar-item-ativo` (`#0b5ed7`), sem a barra branca translúcida à esquerda. Texto e ícones permanecem brancos: `--navbar-texto` e `--navbar-texto-secundario` já estão corretos.

Os divisores (`--divisor-itens`) e o hover (`--hover-itens`), ambos brancos translúcidos, continuam funcionando sobre azul sem alteração.

---

## 3. Ilha de conteúdo

É o ponto que mais devolve a identidade.

```
.bga-dashboard-content   fundo var(--fundo-area), padding 24px
  └─ ilha                fundo #fff, raio 8px,
                         sombra 0 4px 6px rgb(0 0 0 / 10%),
                         padding 24px
```

Na 3.8 havia caixas demais: o container branco, a faixa de filtros com borda própria, a tabela e mais a faixa de paginação, cada uma com sua moldura. **Uma ilha por aba**, com os blocos internos separados por espaçamento e linhas sutis, não por novas molduras. A faixa de filtros e o rodapé da paginação são as únicas superfícies internas que ganham fundo próprio (`--faixa-fundo`).

Sem `max-width` fixo como os 1000px da 3.8 — a ilha ocupa a largura disponível, que é o ganho de proporção da 3.9.

---

## 4. Tabela

**Cabeçalho colorido.** `thead` com fundo `--tabela-cabecalho` e `th` em `--tabela-cabecalho-texto`, negrito. O `position: sticky` continua.

**Cor só onde significa.** A coloração por operação sai da linha inteira e fica apenas na célula da coluna Operação. Em `FuncionariosAfdView.tsx`, a função `classeDaLinha` deixa de aplicar `--${MODIFICADOR_OPERACAO[item.operacao]}`; o `render` da coluna `operacao` devolve um `<span>` com a classe da cor.

A zebra por dia continua na linha, como está.

**Hover** em `--linha-hover`, no lugar de `--background-2`.

### Destaques por coluna

| Aba | Coluna | Tratamento |
|---|---|---|
| Funcionários | Operação | cor da operação, negrito |
| Relógio | Antes / Depois | `--ajuste-antes` / `--ajuste-depois`, semibold |
| Eventos | Código | `--azul-base`, negrito |
| Marcações | Hora | `--azul-base`, semibold |

Na 3.8 a coluna Código exibia `Tipo 02`, não só `02`. Se quiser a leitura idêntica, o `render` da coluna compõe o prefixo; se preferir a coluna enxuta, só a cor já resolve.

---

## 5. Cards de filtro por operação

Mantida a proporção e o tamanho atuais, que ficaram melhores que os da 3.8. Muda a cor.

Estado neutro: fundo branco, borda `--faixa-borda`, texto na cor da operação. **Sai a borda-esquerda de 4px**; a cor volta para o texto e para o estado ativo, como era.

Estado ativo: borda de 2px e fundo na cor correspondente.

| Card | Borda ativa | Fundo ativo |
|---|---|---|
| Todas | `--azul-destaque` | `--card-todas-fundo` |
| Inclusões | `--operacao-inclusao` | `--card-inclusao-fundo` |
| Alterações | `--operacao-alteracao` | `--card-alteracao-fundo` |
| Exclusões | `--operacao-exclusao` | `--card-exclusao-fundo` |

O foco visível por teclado continua — é ganho da 3.9 e não se perde aqui.

> As cores da 3.8 são mais claras que os tokens atuais. No número grande do card elas funcionam bem; no texto de 13px da coluna Operação podem ficar lavadas em monitor claro. Se incomodar, use a variante escura só nessa coluna.

---

## 6. Rodapé da paginação

Volta a ser uma faixa, não uma linha solta: fundo `--faixa-fundo`, borda `--faixa-borda`, raio 8px, padding 12–16px. "Página X de Y" em `--azul-destaque`, negrito, 16px. Botões Anterior e Próxima em azul preenchido.

A contagem de registros e o seletor de tamanho, que são da 3.9, permanecem dentro da mesma faixa.

---

## 7. Layout de tela cheia

A tela inteira cabe na janela: **a página não rola, só o corpo da tabela.**

```
.bga-dashboard-layout     height: 100vh; overflow: hidden
  ├─ .bga-navbar          largura fixa
  └─ .bga-dashboard-content
         height: 100vh; overflow: hidden;      ← deixa de ser auto
         display: flex; flex-direction: column
       └─ ilha            flex: 1; min-height: 0;
                          display: flex; flex-direction: column
            ├─ upload e filtros    altura natural
            ├─ tabela              flex: 1; min-height: 0; overflow: auto
            └─ paginação           altura natural, no rodapé
```

Dois detalhes decidem se isso funciona:

O `min-height: 0` em cada nível que deve encolher. Sem ele, o filho em flex adota a altura do conteúdo e a página volta a rolar — é a causa mais comum desse layout não fechar.

E remover o `max-height: 520px` de `.bga-tabela-container`. A altura passa a vir do espaço que sobra, não de um número fixo.

---

## 8. O que não muda

Prefixo `bga-` e BEM. Elementos clicáveis como `<button>`, `<label>` ligado ao campo, foco visível. Open Sans empacotada. Os componentes do design system e o `Paginador`. Os registros no worker e a consulta paginada. A zebra calculada por página, que já decidimos manter.

---

## Checklist

- [x] Tokens alterados e acrescentados em `index.css`
- [x] `color-scheme: light` e bloco de tema escuro neutralizado
- [x] Barra lateral azul, item ativo `#0b5ed7`
- [x] Ilha branca sobre `--fundo-area`, uma por aba
- [x] Cabeçalho da tabela azul com texto branco
- [x] Cor da operação só na coluna, não na linha
- [x] Hover da linha em `--linha-hover`
- [x] Destaques: código do evento e hora da marcação em azul
- [x] Cards de filtro com as cores da 3.8, dimensão da 3.9
- [x] Rodapé da paginação como faixa destacada
- [x] Layout de tela cheia, só a tabela rolando
- [x] Conferir as quatro abas em 1366×768, a resolução mais apertada de uso comum
