# Como Vota Curitiba — contexto para o Claude Code

Site estático (HTML/CSS/JS puro) hospedado no GitHub Pages. Sem build, sem frameworks.
Tratamento de dados é feito em R na pasta `dados/Tratamento de dados/`, que está no .gitignore
e NÃO faz parte do site. Ela gera os arquivos finais que são copiados para `dados/`.

## Reforma em andamento (branch `reforma`)
Objetivo: trocar o mapa SVG fixo por um mapa D3 v7 gerado do GeoJSON, mostrar locais de votação
como pontos e ler dados no formato "uma linha por local de votação".

## Dados (gerados em R; não editar à mão)
- dados/Mapa_Curitiba.json — GeoJSON, 75 bairros. Propriedades: id (código IPPUC), nome, nome_exib,
  regional, populacao, pop_feminina, pop_branca/preta/parda/amarela/indigena, pop_negra,
  area_km2, densidade_hab_ha (Censo 2022), renda_media, renda_mediana (Censo 2010, R$ de 2010).
- dados/eleicoes.json — lista de eleições. Campos: id, ano, cargo, rotulo_cargo, turno, locais (CSV),
  candidatos (CSV), rotulo (texto exato do botão no seletor), padrao (true na eleição aberta por padrão).
  "locais": null significa eleição listada mas ainda sem dados — botão aparece desativado.
- dados/2022/*_por_local.csv — uma linha por local de votação: NR_ZONA, NR_LOCAL_VOTACAO,
  NM_LOCAL_VOTACAO, DS_LOCAL_VOTACAO_ENDERECO, NM_BAIRRO, NR_LATITUDE, NR_LONGITUDE,
  ID_BAIRRO (= id do GeoJSON), FL_TRANSITO (1 = local de voto em trânsito), QT_ELEITORES,
  QT_VOTOS_TOTAL, QT_VOTOS_BRANCOS, QT_VOTOS_NULOS, QT_VOTOS_ANULADOS,
  LEG_<nº partido> (votos de legenda), CAND_<nº candidato> (votos nominais).
- dados/2022/2022_Dados_cand.csv — uma linha por candidato: liga com CAND_<n> por
  DS_CARGO + NR_TURNO + NR_CANDIDATO e com LEG_<n> por DS_CARGO + NR_PARTIDO.
  Colunas úteis: NM_URNA_CANDIDATO, SG_PARTIDO, DS_GENERO, NEGRO (1 = preta/parda), ELEITO, URL_FOTO.
- dados/2022/2022_Eleitorado.csv — perfil do eleitorado por zona eleitoral (ainda não usado no site).
- Votos válidos = soma de CAND_* + LEG_*. Locais com FL_TRANSITO = 1 entram nos votos,
  mas não no cálculo de comparecimento.
- Arquivos antigos ainda em uso pelo site atual (remover só na etapa de limpeza):
  dados/bairros_curitiba.svg, dados/Dados_eleitorais_vereadores_por_bairro_CWB.csv,
  dados/DB_HAB_INFOCURITIBA.csv, dados/DB_RENDA_INFOCURITIBA.csv.

## Regras
- Não mudar o layout/visual atual sem eu pedir.
- Chave de bairro é sempre o código IPPUC (`id` no GeoJSON, `ID_BAIRRO` nos CSVs), nunca o nome.
- Nada de nomes de candidatos, cores ou arquivos fixos no JS: tudo vem de dados/eleicoes.json.
- D3 via CDN (cdnjs). Sem npm, sem bundler.
- Testar com `python3 -m http.server` (fetch não funciona abrindo o arquivo direto).
- Caminhos de arquivo: o GitHub Pages diferencia maiúsculas/minúsculas.
- Nunca ler, mover ou commitar nada em `dados/Tratamento de dados/`.
- Antes de apagar qualquer arquivo, listar e pedir confirmação.
- Ao terminar cada etapa, resumir o que mudou e o que devo testar.
- PWA desativado durante a reforma; service-worker.js é um kill-switch e não deve ser registrado de novo até o fim.