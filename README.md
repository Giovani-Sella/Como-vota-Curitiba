# Como Vota Curitiba

Plataforma interativa de dados eleitorais de Curitiba por bairro e por local de votação, construída para democratizar a interpretação dos dados públicos do TSE.

Acesse: [comovotacuritiba.com.br](https://comovotacuritiba.com.br)

## Sobre

**Como Vota Curitiba** surgiu durante a produção da reportagem *Bancada negra ainda é minoria na Câmara Municipal de Curitiba*. Ao cruzar os dados eleitorais do TSE com dados socioeconômicos do IBGE e do IPPUC, o projeto oferece uma ferramenta para que jornalistas, cientistas políticos e pesquisadores encontrem padrões e compreendam os fenômenos das eleições curitibanas.

## Funcionalidades

- Mapa interativo dos 75 bairros de Curitiba, gerado com D3 a partir de GeoJSON
- Seletor de eleição por ano e cargo: 2022 (presidente, governador, senador, deputados federal e estadual), 2024 (prefeito e vereador) e 2026
- Locais de votação exibidos como pontos no mapa, com resultado individual de cada local
- Indicadores por bairro, por local ou para a cidade toda: votos totais e válidos, votos em pessoas negras, votos em mulheres, nulos, brancos, partido e candidato mais votado
- Dados socioeconômicos por bairro: população (Censo 2022) e renda per capita (Censo 2010)
- Mapa colorido pela variável escolhida: degradê para valores numéricos, cores de partido para os mais votados, hachura em empates
- Alternância entre valores absolutos e percentuais
- Reportagens produzidas a partir dos dados

## Dados utilizados

| Arquivo | Conteúdo | Fonte |
|---|---|---|
| `dados/Mapa_Curitiba.json` | GeoJSON dos bairros com população, raça/cor, área, densidade e renda | IPPUC, IBGE (Censos 2010 e 2022) |
| `dados/eleicoes.json` | Lista das eleições exibidas no seletor | — |
| `dados/cores_partidos.json` | Cor de cada partido no mapa | — |
| `dados/<ano>/*_por_local.csv` | Resultado por local de votação (uma linha por local) | TSE |
| `dados/<ano>/<ano>_Dados_cand.csv` | Candidatos: nome de urna, partido, gênero, raça/cor, situação | TSE |
| `dados/<ano>/<ano>_Eleitorado.csv` | Perfil do eleitorado por zona eleitoral | TSE |

Os arquivos de `dados/` são gerados por scripts em R, a partir dos dados abertos do TSE e do IBGE, fora deste repositório.

## Estrutura do projeto

```
Como-vota-Curitiba/
├── index.html              # Página principal
├── CNAME                   # Domínio do GitHub Pages
├── manifest.json           # Manifesto PWA (PWA desativado no momento)
├── service-worker.js       # Kill-switch: remove o service worker antigo
├── css/
│   ├── style.css           # Layout, mapa, painel, seletor, legenda
│   ├── toggle.css          # Componente de toggle
│   └── mobile.css          # Ajustes para telas ≤ 768 px
├── js/
│   ├── dados.js            # Carrega e agrega os dados
│   ├── mapa.js             # Mapa D3 e pontos dos locais de votação
│   ├── app.js              # Interface: painel, seletor, legenda, cores
│   └── formatar.js         # Formatação numérica pt-BR
├── componentes/
│   ├── mapa-painel.js      # Mapa + painel lateral
│   ├── reportagens-lista.js
│   └── rodape.js
├── reportagens/            # rep1, rep2, rep3
├── dados/                  # GeoJSON, JSONs de configuração e CSVs por ano
├── docs/ARQUITETURA.md     # Mapa do código
├── icons/                  # Ícones
└── midia/                  # Imagens das reportagens
```

## Tecnologias

- HTML, CSS e JavaScript puros, sem build nem frameworks
- [D3.js v7](https://d3js.org/) via CDN (cdnjs)
- Hospedado no GitHub Pages, com deploy automático a cada push na `main`

## Rodando localmente

O site carrega os dados via `fetch`, então precisa de um servidor local (abrir o `index.html` direto no navegador não funciona):

```bash
python3 -m http.server
```

Depois acesse `http://localhost:8000`.

## Autores

**Giovani Sella**: desenvolvimento e reportagem
[giovanisella.com.br](https://www.giovanisella.com.br)

**Rodrigo Matana**: reportagem
[LinkedIn](https://www.linkedin.com/in/rodrigomatana/)

## Licença

© 2025 Como Vota Curitiba. Todos os direitos reservados.
Os dados eleitorais são públicos e disponibilizados pelo TSE.
