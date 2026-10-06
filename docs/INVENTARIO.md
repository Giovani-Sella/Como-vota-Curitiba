# Inventário do projeto Como Vota Curitiba

> Gerado em 2026-10-05. Branch: `reforma`. Estado: sem alterações de código.

---

## 1. Estrutura de pastas e arquivos

```
/
├── index.html                              Página principal do site
├── CNAME                                   Domínio customizado para GitHub Pages
├── manifest.json                           Manifesto PWA (ícones, display standalone)
├── service-worker.js                       SW mínimo: cache de index.html, style.css e script.js
├── README.md                               Descrição pública do projeto no GitHub
├── CLAUDE.md                               Instruções para o Claude Code (não vai ao site)
├── .gitignore                              Exclui o zip de dados brutos do TSE
│
├── css/
│   ├── style.css                           Estilos globais (layout, mapa, painel lateral, cores)
│   ├── toggle.css                          Componente visual do toggle de porcentagens
│   └── mobile.css                          Media query ≤ 768 px (única breakpoint do projeto)
│
├── js/
│   └── script.js                           Toda a lógica interativa: carga do SVG, CSVs, cores, painel
│
├── componentes/
│   ├── mapa-painel.js                      Injeta o HTML do mapa + painel lateral via innerHTML
│   ├── reportagens-lista.js                Injeta a lista de reportagens via innerHTML
│   └── rodape.js                           Injeta o rodapé via innerHTML
│
├── dados/
│   ├── bairros_curitiba.svg                Mapa de Curitiba com 75 paths, ~700 KB
│   ├── Dados_eleitorais_vereadores_por_bairro_CWB.csv   Dados eleitorais por bairro (70 linhas)
│   ├── DB_HAB_INFOCURITIBA.csv             População estimada por bairro (coluna "2024")
│   ├── DB_RENDA_INFOCURITIBA.csv           Renda per capita por bairro (dados de 2010)
│   ├── perfil_eleitor_secao_ATUAL_PR.zip   Arquivo bruto do TSE — não referenciado no site
│   └── perfil_eleitor_secao_ATUAL_PR/
│       ├── perfil_eleitor_secao_ATUAL_PR.csv   Dados brutos — não referenciados no site
│       └── leiame.pdf                          Documentação TSE — não referenciada no site
│
├── reportagens/
│   ├── rep1.html                           Reportagem 1: bancada negra (usa mapa + script.js completo)
│   ├── rep2.html                           Reportagem 2: risco climático (usa mapa + script.js completo)
│   └── rep3.html                           Reportagem 3: Expocom 2026 (SEM mapa; só rodapé e lista)
│
├── icons/
│   ├── icon-comovotacuritiba-192x192.png   Ícone PWA 192 px (minúsculo — referenciado no manifest)
│   ├── Icon-Comovotacuritiba-192x192.png   Duplicata com inicial maiúscula — arquivo órfão
│   ├── icon-comovotacuritiba-512x512.png   Ícone PWA 512 px (minúsculo — referenciado no manifest)
│   ├── Icon-Comovotacuritiba-512x512.png   Duplicata com inicial maiúscula — arquivo órfão
│   └── icon-git.png                        Ícone do GitHub — não referenciado em nenhum HTML/JS
│
├── midia/
│   ├── caximba_1.jpg                       Fotografia — não referenciada no código atual
│   └── caximba_4.jpg                       Fotografia — não referenciada no código atual
│
├── .github/workflows/
│   └── static.yml                          Deploy automático no GitHub Pages (push → main)
│
└── .vscode/
    └── settings.json                       Configurações locais do VS Code
```

### Páginas HTML e arquivos carregados

| Página | CSS | Scripts |
|---|---|---|
| `index.html` | `style.css`, `toggle.css`, `mobile.css` | `mapa-painel.js`, `reportagens-lista.js`, `rodape.js`, `script.js` + SW inline |
| `reportagens/rep1.html` | `../css/style.css`, `toggle.css`, `mobile.css` | `../componentes/mapa-painel.js`, `reportagens-lista.js`, `rodape.js`, `../js/script.js` |
| `reportagens/rep2.html` | idem | idem (mesmos 4 scripts) |
| `reportagens/rep3.html` | idem | **só** `reportagens-lista.js` e `rodape.js` — sem mapa |

Fonte externa comum a todas as páginas: `fonts.googleapis.com` (Space Grotesk).

---

## 2. O mapa atual

### Localização e tamanho do SVG

O SVG **não está inline** no HTML. É um arquivo separado: `dados/bairros_curitiba.svg`.

- Tamanho em disco: ~700 KB, 89 linhas (paths muito longos em coordenadas geográficas brutas).
- Dimensões declaradas no arquivo: `width='576.00pt'` × `height='432.00pt'`.
- `viewBox` original: `-49.38929 -25.64491 0.2049065 0.2981907` (coordenadas geográficas em graus, não pixels).
- O `script.js` **sobrescreve** o viewBox ao carregar: `svgElement.setAttribute('viewBox', '0 0 576.00 400.00')` e adiciona `preserveAspectRatio="xMidYMid meet"`.

### Identificação dos bairros no SVG

Cada bairro é um elemento `<path>` com atributo `id`. Não há classes, `data-*` attributes, `<title>` ou `<desc>` nos paths.

**Padrão dos IDs:** minúsculas, sem acentos, com espaços. Exemplos:

```
id="agua verde"
id="alto da gloria"
id="cidade industrial de curitiba"
id="jardim botanico"
id="prado velho"
```

O SVG contém **75 paths com id** (todos os bairros de Curitiba). Cinco desses IDs não têm linha correspondente no CSV eleitoral:

| ID no SVG | Motivo provável |
|---|---|
| `cascatinha` | Bairro pequeno, sem votos registrados na base |
| `centro civico` | Idem |
| `lamenha pequena` | Idem |
| `riviera` | Idem |
| `sao joao` | Idem |

Não há bairros no CSV que faltem no SVG.

### Funções JS que leem ou alteram o SVG

Todas estão em `js/script.js`, dentro do listener `DOMContentLoaded`:

| Função | O que faz |
|---|---|
| *(código inline no `.then()`)* | Faz `fetch` do SVG, injeta em `#Svg_Container` via `innerHTML`, sobrescreve `viewBox`, e chama as inicializações |
| `addEventListenersToShapes()` | Percorre `svg [id]` e adiciona `mouseover`, `mouseout`, `mousemove` e `click` a cada path |
| `atualizarBairroSelecionado(nome)` | Remove `.selected` de todos os paths, adiciona ao path clicado (por `#id`), move-o para o final do DOM (z-order), atualiza o painel |
| `selecionarTodosBairros()` | Remove `.selected` de todos e mostra dados agregados |
| `gerarLista()` | Lê os IDs de todos os `svg [id]` e popula o `<select #listaContainer>` |
| `pintarBairroSVG(bairro, cor)` | Recebe nome em MAIÚSCULAS, converte para lowercase, faz `svg.querySelector('#' + CSS.escape(bairro).toLowerCase())` e aplica `style.fill` |
| `configurarClickCamposEleitorais()` → chama `pintarBairroSVG` | Pinta todos os 70 bairros ao clicar em um campo de visualização |

**Atenção — bug de case:** `pintarBairroSVG` recebe o nome em MAIÚSCULAS (vindo das chaves de `dadosEleitoraisBairros`) e converte para lowercase antes do querySelector. Funciona porque os IDs do SVG são sempre minúsculos. Porém há `console.warn('Bshape.style.fill = ', cor)` no código — um log de debug não removido.

### Como a cor de cada bairro é definida

1. `criarTabelaNormalizada()` pega todos os valores de uma coluna e normaliza linearmente para 0–100 (min→0, max→100).
2. `getCorBairro()` converte o valor normalizado (0–1) para RGB com degradê cinza→azul-claro:
   ```
   r = 240 – norm × 120   (240 → 120)
   g = 240 – norm × 120   (240 → 120)
   b = 240 + norm × 15    (240 → 255)
   ```
   Valores mais altos ficam mais escuros e levemente azulados.
3. Bairros sem dado no CSV recebem `#f0f0f0` (cinza).

A cor padrão de todos os paths (antes de qualquer clique) é `#cccccc`, definida em CSS: `#Svg_Container path { fill: #cccccc; }`. A coloração programática usa `style.fill` inline, o que tem prioridade sobre o CSS.

### Interações existentes

| Interação | Descrição | Elementos HTML / IDs / Classes |
|---|---|---|
| **Hover** | Exibe tooltip com o nome do bairro, posicionado via `clientX/Y` relativo ao container | `#textoMouse` (posição absoluta dentro de `#followArea`) |
| **Clique no path** | Seleciona bairro: aplica `.selected` (borda amarela), atualiza `#Nome_Bairro` e o painel | `shape.classList.add('selected')` via CSS `#Svg_Container path.selected` |
| **Dropdown** | `<select #listaContainer>` populado com os IDs do SVG; mudar de valor chama `atualizarBairroSelecionado` ou `selecionarTodosBairros` | `#listaContainer`, `.Escolha_bairros` |
| **Toggle** | Checkbox `#permitirSaltos` alterna entre número absoluto e porcentagem; afeta painel e coloração do mapa | `.toggle-switch`, `#permitirSaltos` |
| **Clique em card de dado** | Cada `.divinformacoes[data-visualization]` muda a variável exibida no mapa (recolore todos os bairros) | `.divinformacoes`, `.ativo` |
| **Título do mapa** | `#tituloMapa > h2` é atualizado com texto descritivo ao mudar visualização | `#tituloMapa` |
| **Modo "todos"** | Ao selecionar "Todos os bairros", soma todos os dados e exibe no painel | — |

---

## 3. Os dados

### Como o CSV eleitoral chega ao site

Carregado via `fetch` em `script.js:85`:
```js
carregarCSV(caminhoDadosEleitorais, dadosEleitoraisBairros, 'Eleitorais');
```
O CSV é parseado manualmente (split por `\n` e por `,`). O resultado é armazenado em `dadosEleitoraisBairros`, um objeto plano com **chave = nome do bairro em MAIÚSCULAS**.

### Colunas do CSV eleitoral e onde são usadas

| Coluna CSV | Usado como | Onde no código |
|---|---|---|
| `BAIRRO` (col 0) | Chave do objeto (`toUpperCase`) | `carregarCSV()`, linha 241 |
| `QT_VOTOS_TOTAIS` | Total de votos, normalização base, `Numero_total_votos` | `atualizarPainelInformacoes`, `criarTabelaNormalizada` |
| `QT_VOTOS_NEGROS` | Votos em negros (abs e %) | idem |
| `QT_VOTOS_MULHERES` | Votos em mulheres (abs e %) | idem |
| `QT_VOTOS_NULOS` | Votos nulos | idem |
| `QT_VOTOS_BRANCOS` | Votos brancos | idem |
| `PARTIDO_MAIS_VOTADO` | Texto exibido em `#PartidoMaisVotado` | `atualizarPainelInformacoes` |
| `VEREADOR_MAIS_VOTADO` | Texto exibido em `#VereadorMaisVotado` | idem |
| `QT_VOTOS_PARTIDO_MAIS_VOTADO` | **Não utilizado** no JS atual | — |
| `QT_VOTOS_VEREADOR_MAIS_VOTADO` | **Não utilizado** no JS atual | — |
| `NUMERO_TOTAL_MORADORES ` (com espaço) | Número de moradores | `criarTabelaNormalizada` (campo `NUMERO_TOTAL_MORADORES`) |
| `RENDAPERCAPTA ` (com espaço) | Renda per capita | idem |

**Atenção:** Os cabeçalhos `NUMERO_TOTAL_MORADORES` e `RENDAPERCAPTA` têm um espaço à direita no CSV. O parser não faz `.trim()` nos nomes de coluna, mas faz nos valores. A leitura funciona porque `criarTabelaNormalizada` acessa `dados.NUMERO_TOTAL_MORADORES` e `dados.RENDAPERCAPTA` sem espaço — isso só funciona pois o split por `,` e o acesso por chave com espaço trailing coincidem acidentalmente. **Risco latente de quebra se o CSV for regenerado com ou sem espaços.**

Há ainda dois CSVs auxiliares:
- `DB_HAB_INFOCURITIBA.csv`: colunas `BAIRRO`, `Variável`, `2024`. Apenas a coluna `2024` é usada (`dadosHabBairros[bairro]['2024']`).
- `DB_RENDA_INFOCURITIBA.csv`: colunas `BAIRRO`, `Variável`, `2010`. Apenas `2010` é usado.

---

## 4. Layout em volta do mapa

### Desktop (sem media query)

- `.principal` (contêiner da seção): `100vh`, flex row, padding horizontal `10%`, `gap: 20px`.
- `.mapa` (bloco do mapa): `flex: 1`, altura `100%`, flex column, `overflow: hidden`.
  - `.tituloMapa`: `height: 150px`, padding 20 px.
  - `#followArea`: `display: flex`, `height: 100%`, padding 20 px.
  - `#Svg_Container`: `display: flex`, `100% × 100%`.
  - `#Svg_Container svg`: `transform: scale(1.6)` — o SVG é ampliado 1,6× no CSS.
- `.lateralDireita` (painel): `flex: 1`, `overflow-y: auto`, `padding: 20px`.
  - `.informacoes`: grid `repeat(2, 1fr)`.

### Mobile (≤ 768 px)

- `.mapa`: `flex: none`, `height: 40vh` (mín. 300 px), `order: 1`.
- `#Svg_Container`: `transform: scale(0.7)`, `margin-top: -160px` — compensação manual de posição.
- `.lateralDireita`: `flex: none`, `order: 2`, `height: auto`.
- `#textoMouse`: `font-size: 0` e box-shadow zerado (tooltip oculto no mobile).
- `.tituloMapa`: `font-size: 0.8rem`, `margin-top: -15px`.

**Resumo:** há apenas uma breakpoint (768 px). O mapa usa `transform: scale()` em vez de unidades flexíveis, o que cria necessidade de compensações manuais de margem. Não há comportamento responsivo intermediário entre mobile e desktop.

---

## 5. Dependências externas

| Dependência | Como carregada | Versão |
|---|---|---|
| Space Grotesk (fonte) | `<link>` para `fonts.googleapis.com` | sem versão fixada |
| **Nenhuma biblioteca JS** | — | — |

Não há D3, jQuery, Leaflet, nem qualquer outro framework. Todo o código é vanilla JS. O CDN de D3 (previsto na reforma) ainda **não está presente**.

---

## 6. Problemas e sobras

| Item | Tipo | Motivo |
|---|---|---|
| `console.warn('Bshape.style.fill = ', cor)` em `script.js:591` | Log de debug | Nunca deve entrar em produção; aparece no console para cada bairro pintado |
| `const visualozacaomapa = document.getElementById('tituloMapa')` em `script.js:36` | Variável morta | Declarada, mas nunca lida após a atribuição |
| `.visualozacaomapa { … }` em `style.css:308` | CSS sem uso | Nenhum elemento tem esta classe no HTML/JS atual; além disso o nome tem um erro de digitação ("visualozacaomapa" em vez de "visualizacaomapa") |
| `.item { … }`, `.seletor { … }`, `.opcao { … }`, `.opcao_Genero`, `.opcao_Raca`, `.opcao_Partido` em `style.css` | CSS sem uso | Nenhum elemento com essas classes é gerado pelo código atual |
| `.card { … }` em `style.css:391` | CSS provavelmente sem uso | Nenhum elemento usa a classe `card` no HTML/JS analisado |
| `#info { … }` em `style.css:537` | CSS sem uso | Nenhum `id="info"` encontrado |
| Popup de aviso (`.aviso-overlay`, `.aviso-modal`, `.aviso-botao`) em `style.css` | CSS de feature desativada | O HTML do popup está comentado em `index.html`; os estilos permanecem |
| `QT_VOTOS_PARTIDO_MAIS_VOTADO` e `QT_VOTOS_VEREADOR_MAIS_VOTADO` no CSV | Colunas não lidas | Existem no CSV, mas o JS não as acessa |
| `dados/perfil_eleitor_secao_ATUAL_PR/` e `.zip` | Arquivos órfãos | Dados brutos do TSE não referenciados em nenhuma página |
| `midia/caximba_1.jpg` e `caximba_4.jpg` | Arquivos órfãos | Não referenciados em nenhuma página |
| `icons/Icon-Comovotacuritiba-192x192.png` e `Icon-Comovotacuritiba-512x512.png` | Duplicatas com case errado | `manifest.json` referencia a versão minúscula; as versões com `I` maiúsculo são sobras; podem causar 404 em servidores case-sensitive |
| Espaço trailing em colunas do CSV (`NUMERO_TOTAL_MORADORES `, `RENDAPERCAPTA `) | Inconsistência de dados | O parser não faz trim dos cabeçalhos; funciona hoje por coincidência |
| Bug de case em `pintarBairroSVG` | Inconsistência de design | Chave do mapa é uppercase (do CSV), ID do SVG é lowercase; a conversão `CSS.escape(bairro).toLowerCase()` funciona mas é frágil |
| `rep1.html` e `rep2.html` carregam `script.js` completo (incluindo toda a lógica do mapa) | Acoplamento implícito | Qualquer mudança em script.js afeta as reportagens mesmo quando elas mostram só parte do mapa |

---

## 7. Riscos para a troca do SVG por GeoJSON com D3

| Ponto de dependência | Onde no código | Risco |
|---|---|---|
| **Fetch e injeção do SVG via `innerHTML`** | `script.js:62-140` | Toda essa lógica de carregamento precisará ser substituída pela inicialização do D3 |
| **IDs dos paths como strings com espaços** (`id="agua verde"`) | `script.js:153, 191, 585` | D3 gera paths sem IDs por padrão; os IDs precisarão ser adicionados explicitamente via `.attr('id', d => d.properties.XXX)` e a chave de bairro no GeoJSON precisa coincidir com o identificador de negócio |
| **`CSS.escape(nome)`** em dois lugares | `script.js:153, 585` | IDs com espaços precisam de escape; se os novos IDs forem numéricos (código IPPUC) ou sem espaços, o escape deixa de ser necessário e a lógica fica mais simples |
| **`containerSVG.querySelectorAll('svg [id]')`** | `addEventListenersToShapes`, `gerarLista` | A seleção pelo seletor CSS `svg [id]` continua funcionando se D3 adicionar IDs nos paths; mas os listeners terão que ser atribuídos via `.on()` do D3, não via `querySelectorAll` pós-renderização |
| **`shape.parentElement.appendChild(shape)`** (z-order hack) | `atualizarBairroSelecionado`, linha 156 | Ainda pode funcionar se os paths ficarem num mesmo `<g>`; D3 usa `<g>` por padrão |
| **`#Svg_Container path { fill: #cccccc; }`** e **`path.selected { stroke: … }`** | `style.css:280-292` | CSS genérico `path` continuará funcionando independente de como o path é gerado; `.selected` também |
| **`svgElement.setAttribute('viewBox', '0 0 576.00 400.00')`** | `script.js:71` | D3 define o viewBox ao criar o `<svg>`; esta linha deve ser removida/migrada |
| **`transform: scale(1.6)`** no SVG e **`scale(0.7)` + `margin-top: -160px`** no mobile | `style.css:275`, `mobile.css:72-73` | Esses hacks compensam o viewBox inconsistente do SVG atual. Com D3 e projeção geográfica correta, a escala será controlada via `fitSize`/`fitExtent`; os hacks de CSS precisarão ser removidos |
| **Junção bairro-nome como chave** (CSV usa nome, SVG usa nome) | `criarTabelaNormalizada`, `pintarBairroSVG` | A reforma prevê usar código IPPUC (`id`) como chave; o CSV eleitoral atual usa **nome do bairro** — precisará ser regenerado com a coluna de código, ou a junção precisará de uma tabela de-para |
| **`carregarCSV` — parser manual de CSV** | `script.js:229-252` | Parser frágil (sem suporte a valores com vírgula, sem trim de cabeçalhos). Na reforma pode ser substituído por `d3.csv()` |

---

## Avaliação final

**Vale manter os IDs do SVG antigo nos paths do D3 ou reescrever do zero?**

**Recomendação: reescrever a camada do mapa do zero**, mantendo apenas os nomes dos IDs/elementos HTML do painel lateral (`.divinformacoes`, `#Nome_Bairro`, etc.) e os contratos de dados (nomes de colunas do CSV).

**Justificativa:**

1. **Os IDs atuais são strings com espaços** (`"agua verde"`, `"cidade industrial de curitiba"`), que exigem `CSS.escape` e não são válidas como seletores sem escape. Substituí-los pelo código IPPUC numérico eliminaria completamente essa fragilidade.

2. **O CSS de mapa é mínimo e genérico** (`#Svg_Container path`, `path.selected`). Não há regras por ID de bairro nem gradientes definidos no CSS — toda a coloração é feita em JS via `style.fill`. Portanto não há CSS a "reaproveitar" nos paths novos.

3. **Toda a lógica de carregamento do SVG** (fetch + innerHTML + override de viewBox + scale hack) precisa ser reescrita de qualquer forma. O código que sobra (painel lateral, carregamento de CSV, coloração) é independente do SVG e pode ser mantido quase intacto.

4. **O `transform: scale(1.6)` e `scale(0.7)` no CSS** são gambiarras para compensar o viewBox inconsistente do SVG exportado. D3 com `fitSize` renderiza o mapa no tamanho certo diretamente, eliminando a necessidade dessas correções.

5. **Código morto já acumulou** (CSS sem uso, variável morta, log de debug). A reforma é o momento natural para remover essas sobras junto com a troca do mapa, sem risco de regredir funcionalidades.

O que **deve ser preservado** da camada existente: os IDs e classes do painel lateral (`#Nome_Bairro`, `#listaContainer`, `.divinformacoes[data-visualization]`, `#tituloMapa`), a função `carregarCSV` ou equivalente D3, e toda a lógica de `criarTabelaNormalizada` / `getCorBairro` / `pintarBairroSVG` (renomeada para operar sobre elementos D3).
