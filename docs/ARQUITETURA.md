# Arquitetura — Como Vota Curitiba

Mapa do código. Branch `reforma` — mapa D3 v7, dados por local de votação.

## Arquivos JS

**js/dados.js** — carrega e pré-processa dados.
- `carregarTudo()` — fetch paralelo de Mapa_Curitiba.json, eleicoes.json, cores_partidos.json.
- `carregarEleicao(eleicao)` — fetch CSV de locais + CSV de candidatos; agrega votos por bairro; popula dadosBairros, dadosLocais, dadosLocaisRaw.
- `_calcVencedores(b)` — partido e candidato mais votado para um objeto bairro/cidade; detecta empate.

**js/mapa.js** — mapa D3 + pontos de locais de votação.
- `inicializarMapa(containerEl, geoJson, callbacks)` — cria SVG, projeção Mercator fitSize, paths por bairro.
- `colorirTodos(tabela, campo)` / `colorirTodosCategorico(mapaCores)` — aplica cor nos paths via data-id.
- `selecionarBairro(idBairro)` — aplica .selected ao path.
- `desenharLocais(pontos)` — círculos SVG; índice Delaunay para detecção de proximidade.
- `mostrarLocais(v)` / `colorirLocais(mapaCores)` — visibilidade e cor dos círculos.
- `localProximoSVG(clientX, clientY)` — busca Delaunay para o cursor.
- `setLocalHover(idx)` / `destacarLocalSelecionado(idx)` — estado visual hover/seleção.

**js/app.js** — controlador da UI; ponto de entrada: `init()`.
- `recolorirTodosBairros()` — despacha coloração gradiente ou categórica; atualiza legenda.
- `trocarEleicao()` — troca dados e redesenha mapa, locais, painel.
- `atualizarPainelInformacoes(id)` / `atualizarPainelTodosBairros()` / `atualizarPainelLocal(chave)` — painel lateral.
- `renderizarSeletor()` / `configurarSeletorEleicao()` — seletor de ano/cargo via eleicoes.json.
- `construirMapaCoresPartidos()` / `construirMapaCoresCandidatos()` — coloração categórica.
- `renderizarLegenda()` / `renderizarLegendaDegrade()` / `atualizarCoresLocais()` — legenda.
- `onHover(props, ev, isMove)` / `onClick(id, ev)` — callbacks do mapa D3.

**js/formatar.js** — `fmtInteiro(v)`, `fmtPorcentagem(v)`, `fmtDinheiro(v)`, `fmtDecimal(v)`.

## Componentes HTML (injetados via innerHTML)

- `componentes/mapa-painel.js` — `injetarMapaPainel(id)`: mapa + painel lateral.
- `componentes/reportagens-lista.js` — `injetarReportagens(id)`.
- `componentes/rodape.js` — `injetarRodape(id)`.

## CSS

- `css/style.css` — layout, mapa, painel, seletor de eleição, legenda, toggle.
- `css/toggle.css` — componente visual do toggle (switch on/off).
- `css/mobile.css` — media query única ≤ 768 px.

## Fluxo de dados

`eleicoes.json` → lista de eleições com paths para CSVs
  ↓
`carregarEleicao()` faz fetch do CSV de locais + CSV de candidatos em paralelo
  ↓
agrega votos por ID_BAIRRO em `dadosBairros` (Map); calcula vencedores via `_calcVencedores()`
  ↓
`recolorirTodosBairros()` → `colorirTodos()` / `colorirTodosCategorico()` → mapa colorido
`atualizarPainelTodosBairros()` / `atualizarPainelInformacoes()` → painel lateral

## Legado (removidos na limpeza — não recriar)

- `js/script.js` — script do mapa SVG fixo antigo; substituído por dados.js + mapa.js + app.js.
- `dados/bairros_curitiba.svg` — mapa SVG fixo; substituído pelo GeoJSON + D3.
- `dados/Dados_eleitorais_vereadores_por_bairro_CWB.csv` — dados por bairro (vereadores 2020).
- `dados/DB_HAB_INFOCURITIBA.csv` e `DB_RENDA_INFOCURITIBA.csv` — dados demográficos legados.
