# Como Vota Curitiba — contexto para o Claude Code

Mapa do código: docs/ARQUITETURA.md. Leia antes de procurar arquivos.

Site estático (HTML/CSS/JS puro) hospedado no GitHub Pages. Sem build, sem frameworks.
Tratamento de dados é feito em R na pasta `dados/Tratamento de dados/`, que está no .gitignore
e NÃO faz parte do site. Ela gera os arquivos finais que são copiados para `dados/`.

## Estado atual
Mapa D3 v7 gerado do GeoJSON, locais de votação como pontos e dados no formato
"uma linha por local de votação". O mapa SVG fixo e os CSVs por bairro antigos foram removidos.
Eleições com dados: 2022 (pres 1t/2t, gov, sen, depfed, depes), 2024 (pref 1t/2t, ver),
2026 (pres 1t, gov 1t, sen, depfed, depes). 2º turno de 2026 ainda não incluído.

## Branches e deploy
- `dev`: desenvolvimento. `main`: produção. O GitHub Actions (.github/workflows/static.yml)
  publica o repositório inteiro no GitHub Pages a cada push na `main` (domínio em CNAME).
- Tudo o que está commitado na `main` vai para o ar: nada de arquivos brutos (zip, PDF do TSE) no git.

## Adicionar uma eleição
1. Gerar em R o CSV `dados/<ano>/<ano>_resultado_<cargo>_cwb[_<n>t]_por_local.csv` e atualizar
   `dados/<ano>/<ano>_Dados_cand.csv` (o turno entra em NR_TURNO).
2. Adicionar a entrada em dados/eleicoes.json. Nenhuma mudança no JS deve ser necessária.
3. Ano novo: incluir também em `ANOS_SITE` (js/app.js), que define os botões de ano.

## Dados (gerados em R; não editar à mão)
- dados/Mapa_Curitiba.json — GeoJSON, 75 bairros. Propriedades: id (código IPPUC), nome, nome_exib,
  regional, populacao, pop_feminina, pop_branca/preta/parda/amarela/indigena, pop_negra,
  area_km2, densidade_hab_ha (Censo 2022), renda_media, renda_mediana (Censo 2010, R$ de 2010).
- dados/eleicoes.json — lista de eleições. Campos: id, ano, cargo, rotulo_cargo, turno, locais (CSV),
  candidatos (CSV), rotulo (texto exato do botão no seletor), padrao (true na eleição aberta por padrão).
  "locais": null significa eleição listada mas ainda sem dados — botão aparece desativado.
  Abertura: o site abre no ano mais recente com dados e, dentro dele, na entrada com padrao: true.
- dados/cores_partidos.json — SG_PARTIDO → cor hex. Partido sem cor recebe uma cor da paleta
  Tableau10 e gera aviso no console.
- dados/<ano>/*_por_local.csv — uma linha por local de votação: NR_ZONA, NR_LOCAL_VOTACAO,
  NM_LOCAL_VOTACAO, DS_LOCAL_VOTACAO_ENDERECO, NM_BAIRRO, NR_LATITUDE, NR_LONGITUDE,
  ID_BAIRRO (= id do GeoJSON), FL_TRANSITO (1 = local de voto em trânsito), QT_ELEITORES,
  QT_VOTOS_TOTAL, QT_VOTOS_BRANCOS, QT_VOTOS_NULOS, QT_VOTOS_ANULADOS,
  LEG_<nº partido> (votos de legenda), CAND_<nº candidato> (votos nominais).
- dados/<ano>/<ano>_Dados_cand.csv — uma linha por candidato: liga com CAND_<n> por
  DS_CARGO + NR_TURNO + NR_CANDIDATO e com LEG_<n> por DS_CARGO + NR_PARTIDO.
  Colunas úteis: NM_URNA_CANDIDATO, SG_PARTIDO, DS_GENERO, NEGRO (1 = preta/parda), ELEITO, URL_FOTO.
- dados/<ano>/<ano>_Eleitorado.csv — perfil do eleitorado por zona eleitoral (ainda não usado no site).
- Votos válidos = soma de CAND_* + LEG_*. Locais com FL_TRANSITO = 1 entram nos votos,
  mas não no cálculo de comparecimento.

## Regras
- Não mudar o layout/visual atual sem eu pedir.
- Chave de bairro é sempre o código IPPUC (`id` no GeoJSON, `ID_BAIRRO` nos CSVs), nunca o nome.
- Nada de nomes de candidatos, cores ou arquivos fixos no JS: tudo vem de dados/eleicoes.json
  e dados/cores_partidos.json. Única exceção: `ANOS_SITE` em js/app.js.
- D3 via CDN (cdnjs). Sem npm, sem bundler.
- Testar com `python3 -m http.server` (fetch não funciona abrindo o arquivo direto).
- Caminhos de arquivo: o GitHub Pages diferencia maiúsculas/minúsculas.
- Nunca ler, mover ou commitar nada em `dados/Tratamento de dados/`.
- Os CSVs de dados/<ano>/ têm centenas de colunas: para ver a estrutura use `head -2`; nunca leia o arquivo inteiro.
- Mudanças pequenas: não rode servidor nem testes; responda só com o resumo.
- Antes de apagar qualquer arquivo, listar e pedir confirmação.
- Ao terminar cada etapa, resumir o que mudou e o que devo testar.
- PWA desativado; service-worker.js é um kill-switch e não deve ser registrado de novo sem eu pedir.
- Ao mudar a estrutura do código, atualizar docs/ARQUITETURA.md.
