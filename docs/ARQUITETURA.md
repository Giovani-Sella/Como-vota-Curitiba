# Arquitetura — Como Vota Curitiba

Site estático (HTML/CSS/JS puro). Branch `reforma` — mapa D3 v7 + dados por local de votação.

---

## js/dados.js — carregamento e pré-processamento

Expõe globais: `dadosGeoJson`, `dadosEleicoes`, `dadosBairros` (Map id→objeto), `dadosEleicaoAtual`,
`dadosCoresPartidos`, `dadosCidade`, `dadosLocais`, `dadosLocaisRaw`, `dadosCandMap`, `dadosCandNums`, `dadosLegMap`.

- `carregarTudo()` — fetch paralelo de `Mapa_Curitiba.json`, `eleicoes.json`, `cores_partidos.json`.
- `carregarEleicao(eleicao)` — fetch do CSV de locais + CSV de candidatos; agrega votos por bairro em
  `dadosBairros`; popula `dadosLocais` (deduplica por coordenada) e `dadosLocaisRaw`.
- `_calcVencedores(b)` — calcula partido e candidato mais votado para um objeto bairro/cidade;
  detecta empate; escreve os resultados no mesmo objeto `b`.

## js/mapa.js — mapa D3 + pontos de locais de votação

- `inicializarMapa(containerEl, geoJson, callbacks)` — cria SVG via D3, projeção Mercator com
  `fitSize`, paths por bairro com eventos hover/click.
- `colorirBairro(id, cor)` / `colorirTodos(tabela, campo)` / `colorirTodosCategorico(mapaCores)` —
  aplica cor nos paths pelo atributo `data-id`.
- `selecionarBairro(idBairro)` — aplica classe `.selected` ao path correspondente.
- `desenharLocais(pontos)` — desenha círculos SVG; monta índice Delaunay para detecção de proximidade.
- `mostrarLocais(visivel)` / `colorirLocais(mapaCores)` — visibilidade e cor dos círculos.
- `localProximoSVG(clientX, clientY)` — busca Delaunay para detectar local sob o cursor.
- `setLocalHover(idx)` / `destacarLocalSelecionado(idx)` — estado visual de hover e seleção.

## js/app.js — controlador principal da UI

- `init()` — ponto de entrada chamado em `index.html`; orquestra carregamento, mapa, seletor, toggles.
- `recolorirTodosBairros()` — despacha coloração gradiente ou categórica e atualiza a legenda.
- `renderizarSeletor()` / `configurarSeletorEleicao()` — seletor de ano/cargo lido de `eleicoes.json`.
- `trocarEleicao()` — troca os dados carregados e redesenha mapa, locais e painel.
- `atualizarPainelInformacoes(id)` / `atualizarPainelTodosBairros()` / `atualizarPainelLocal(chave)` —
  preenche os cards do painel lateral.
- `criarTabelaNormalizada()` — normaliza campos 0–100 para coloração gradiente; retorna `{tabela, info}`.
- `construirMapaCoresPartidos()` / `construirMapaCoresCandidatos()` — coloração categórica.
- `renderizarLegenda(itens)` / `renderizarLegendaDegrade(campo, tabela, info)` — legenda do mapa.
- `atualizarCoresLocais()` — recolore os pontos de locais conforme a visualização ativa.
- `onHover(props, ev, isMove)` / `onClick(id, ev)` — callbacks passados a `inicializarMapa`.
- `configurarToggle()` / `configurarToggleLocais()` — toggles de % e de locais de votação.

## js/formatar.js — formatação numérica em pt-BR

- `fmtInteiro(v)` / `fmtPorcentagem(v)` / `fmtDinheiro(v)` / `fmtDecimal(v)`

## componentes/

- `mapa-painel.js` — injeta o HTML do mapa + painel lateral via `injetarMapaPainel(id)`.
- `reportagens-lista.js` — injeta a lista de reportagens via `injetarReportagens(id)`.
- `rodape.js` — injeta o rodapé via `injetarRodape(id)`.

## Dados

| Arquivo | Papel |
|---|---|
| `dados/Mapa_Curitiba.json` | GeoJSON dos 75 bairros (id IPPUC, demografias, renda) |
| `dados/eleicoes.json` | Lista de eleições; aponta para os CSVs de locais e candidatos |
| `dados/cores_partidos.json` | Mapa `sigla → cor hex` para coloração categórica |
| `dados/<ano>/*_por_local.csv` | Uma linha por local de votação; colunas CAND_* e LEG_* |
| `dados/<ano>/<ano>_Dados_cand.csv` | Uma linha por candidato; vincula a CAND_* por NR_CANDIDATO |

Chave de bairro: código IPPUC (`id` no GeoJSON = `ID_BAIRRO` nos CSVs). Nunca o nome.
