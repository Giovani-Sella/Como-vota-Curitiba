# Arquitetura — Como Vota Curitiba

Mapa do código. Mapa D3 v7 gerado do GeoJSON, dados por local de votação.
Branches: `dev` (desenvolvimento) → `main` (deploy automático no GitHub Pages).

## Ordem de carregamento (index.html)

D3 (cdnjs) → componentes (injetam o HTML) → dados.js → mapa.js → formatar.js → app.js → `init()`.
Tudo é script clássico com funções e variáveis globais; não há módulos ES.
`dados.js` e os componentes calculam a URL base a partir de `document.currentScript`,
para funcionar tanto na raiz quanto em `reportagens/`.

## Arquivos JS

**js/dados.js** — carrega e pré-processa os dados.
- Globais: `dadosGeoJson`, `dadosEleicoes`, `dadosCoresPartidos`, `dadosEleicaoAtual`,
  `dadosBairros` (Map id IPPUC → agregado), `dadosCidade` (vencedores da cidade),
  `dadosLocais` (pontos deduplicados por coordenada: `{ lat, lng, nomes, rawRows }`),
  `dadosLocaisRaw` (linhas cruas do CSV), `dadosCandMap`, `dadosCandNums`, `dadosLegMap`.
- `carregarTudo()` — fetch paralelo de Mapa_Curitiba.json, eleicoes.json, cores_partidos.json.
- `carregarEleicao(eleicao)` — d3.csv do CSV de locais + CSV de candidatos; filtra candidatos por
  cargo e turno; descobre as colunas CAND_* e LEG_*; agrega por ID_BAIRRO (votos, válidos, negros,
  mulheres; eleitores só de FL_TRANSITO = 0); calcula vencedores por bairro e da cidade; deduplica locais.
- `_calcVencedores(b)` — partido (nominais + legenda) e candidato mais votados de um objeto
  `{ _cand, _leg }`; detecta empate. Usada para bairro, cidade e local.

**js/mapa.js** — mapa D3 + pontos dos locais de votação.
- `inicializarMapa(containerEl, geoJson, callbacks)` — SVG com viewBox, Mercator `fitSize`, corrige o
  sentido dos anéis do GeoJSON, padrão `#hachura` (empates), fundo clicável, paths `[data-id]`,
  grupo `#g-locais`. Callbacks: `onHover`, `onClick`, `onBackgroundClick`.
- `colorirBairro(id, cor)` / `colorirTodos(tabela, campo)` / `colorirTodosCategorico(mapaCores, corDefault)`.
- `selecionarBairro(idBairro)` — classe `.selected` e traz o path para frente; `null` limpa.
- `desenharLocais(pontos)` — círculos com `pointer-events: none`; índice Delaunay para proximidade.
- `_calcRaio()` / `_atualizarRaio()` — raio constante em pixels de tela (recalcula no resize).
- `mostrarLocais(v)` / `colorirLocais(mapaCores)` — visibilidade e cor dos círculos (Map índice → cor).
- `localProximoSVG(clientX, clientY)` — ponto mais próximo do cursor, até 10 px de tela.
- `setLocalHover(idx)` / `destacarLocalSelecionado(idx)` — estados visuais de hover e seleção (azul).

**js/app.js** — controlador da UI; ponto de entrada: `init()`.
- Estado: `selecao` (`{ modo: 'bairros' | 'locais', id, nm }`; id = IPPUC ou `"zona-local"`),
  `visualizacaoSelecionada`, `mostrarPorcentagem`, `seletorState`, `ANOS_SITE`.
- Campos: `camposVisualizaveis` (degradê), `camposCategoricos` (partido/candidato),
  `camposDegrade` (eleitorais), `titulosPorVisualizacao` (título do mapa).
- Coloração: `criarTabelaNormalizada()` (0–100 por campo), `getCorBairro()` / `getColor()` (degradê
  cinza → azul), `recolorirTodosBairros()` (despacha degradê ou categórico e atualiza legenda; com
  locais ligados e campo eleitoral, bairros ficam neutros e a cor vai para os pontos).
- Categórico: `corPartido(sigla)`, `variarCor(base, i)`, `construirMapaCoresPartidos()`,
  `construirMapaCoresCandidatos()` (candidatos do mesmo partido em tons mais escuros).
- Locais: `_calcularStatsLocal(row)`, `_getValorLocal(stats)`, `atualizarCoresLocais()`.
- Legenda: `renderizarLegenda(itens)` (categórica, até 8 + "Outros"),
  `renderizarLegendaDegrade({...})`, `atualizarMarcadorLegenda()`, `limparLegenda()`.
- Painel: `atualizarPainelInformacoes(id)` / `atualizarPainelTodosBairros()` / `atualizarPainelLocal(chave)`.
- Dropdown: `gerarListaBairros()` / `gerarListaLocais()` (optgroup por bairro).
- Seleção: `atualizarBairroSelecionado()`, `selecionarTodosBairros()`, `selecionarLocal()`, `selecionarTodosLocais()`.
- Seletor de eleição: `estadoInicial()`, `renderizarSeletor()`, `configurarSeletorEleicao()`,
  `trocarEleicao()` (ao trocar de ano tenta manter o mesmo cargo e turno).
- Toggles: `configurarToggle()` (absoluto/percentual), `configurarToggleLocais()` (modo locais).
- Eventos do mapa: `onHover()`, `onClick()`, `onBackgroundClick()`; `rolarParaMapa()`.

**js/formatar.js** — `fmtInteiro(v)`, `fmtPorcentagem(v)`, `fmtDinheiro(v)`, `fmtDecimal(v)`.
Usar sempre estas funções para exibir números.

## Componentes HTML (injetados via innerHTML)

- `componentes/mapa-painel.js` — `injetarMapaPainel(id)`: mapa (`#Svg_Container`, `#textoMouse`,
  `#legendaMapa`) + painel lateral (seletor, dropdown, toggles, cards `[data-visualization]`).
- `componentes/reportagens-lista.js` — `injetarReportagens(id)`.
- `componentes/rodape.js` — `injetarRodape(id)`.

## CSS

- `css/style.css` — layout, mapa, painel, seletor de eleição, legenda.
- `css/toggle.css` — componente visual do toggle (switch on/off).
- `css/mobile.css` — media query única ≤ 768 px.

## Fluxo de dados

`eleicoes.json` → lista de eleições com caminhos dos CSVs
  ↓
`carregarEleicao()` faz fetch do CSV de locais + CSV de candidatos em paralelo
  ↓
agrega votos por ID_BAIRRO em `dadosBairros`; calcula vencedores via `_calcVencedores()`;
deduplica locais em `dadosLocais`
  ↓
`recolorirTodosBairros()` → `colorirTodos()` / `colorirTodosCategorico()` → mapa colorido
`atualizarCoresLocais()` → `colorirLocais()` → pontos coloridos (se o toggle de locais estiver ligado)
`atualizarPainel*()` → painel lateral

## Outros arquivos

- `reportagens/rep1–3.html` — páginas de reportagem; usam os componentes de lista de reportagens e rodapé.
- `service-worker.js` — kill-switch que remove caches e o SW antigo; não registrar de novo.
- `manifest.json` — manifesto PWA, não referenciado no index.html enquanto o PWA está desativado.
- `.github/workflows/static.yml` — deploy no GitHub Pages a cada push na `main`.

## Legado (removido — não recriar)

- `js/script.js` — script do mapa SVG fixo antigo; substituído por dados.js + mapa.js + app.js.
- `dados/bairros_curitiba.svg` — mapa SVG fixo; substituído pelo GeoJSON + D3.
- `dados/Dados_eleitorais_vereadores_por_bairro_CWB.csv` — dados por bairro (vereadores 2020).
- `dados/DB_HAB_INFOCURITIBA.csv` e `DB_RENDA_INFOCURITIBA.csv` — dados demográficos legados.
