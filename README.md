# Como Vota Curitiba

Plataforma interativa de dados eleitorais por bairro de Curitiba, construída para democratizar a interpretação dos dados públicos do TSE.

## Sobre

**Como Vota Curitiba** surgiu durante a produção da reportagem [Bancada negra ainda é minoria na Câmara Municipal de Curitiba](https://github.com/Giovani-Sella/Como-vota-Curitiba). Ao cruzar os dados eleitorais do TSE com dados socioeconômicos do IBGE e da Prefeitura de Curitiba, o projeto oferece uma ferramenta para que jornalistas, cientistas políticos e pesquisadores encontrem padrões e compreendam os fenômenos das eleições curitibanas.

## Funcionalidades

- Mapa interativo de Curitiba com navegação por bairro
- Visualização de dados eleitorais por bairro (votos totais, votos em pessoas negras, votos em mulheres, votos nulos e brancos, partido e vereador mais votado)
- Visualização de dados socioeconômicos (população, renda per capita)
- Colorização do mapa por variável selecionada
- Alternância entre valores absolutos e relativos à população
- Páginas de reportagem integradas ao mapa

## Dados utilizados

| Arquivo | Fonte |
|---|---|
| `dados/Dados_eleitorais_vereadores_por_bairro_CWB.csv` | TSE — Tribunal Superior Eleitoral |
| `dados/DB_HAB_INFOCURITIBA.csv` | IPPUC — Instituto de Pesquisa e Planejamento Urbano de Curitiba |
| `dados/DB_RENDA_INFOCURITIBA.csv` | IBGE / InfoCuritiba |
| `dados/bairros_curitiba.svg` | Mapa vetorial dos bairros de Curitiba |

## Estrutura do projeto

```
Como-vota-Curitiba/
├── index.html              # Página principal
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker para cache offline
├── css/
│   ├── style.css
│   ├── toggle.css
│   └── mobile.css
├── js/
│   └── script.js           # Lógica principal (mapa, dados, interações)
├── componentes/
│   ├── mapa-painel.js      # Componente do mapa interativo + painel lateral
│   └── rodape.js           # Componente do rodapé
├── reportagens/
│   ├── rep1.html           # Bancada negra na Câmara de Curitiba
│   └── rep2.html           # Bairros de risco climático e propostas eleitorais
├── dados/                  # CSVs e SVG do mapa
├── icons/                  # Ícones PWA
└── midia/                  # Imagens das reportagens
```

## Tecnologias

- HTML, CSS e JavaScript puros — sem frameworks ou dependências externas
- Progressive Web App (PWA) com cache offline via Service Worker
- Hospedado no GitHub Pages

## Autores

**Giovani Sella** — desenvolvimento e reportagem  
[giovanisella.com.br](https://www.giovanisella.com.br)

**Rodrigo Matana** — reportagem  
[LinkedIn](https://www.linkedin.com/in/rodrigomatana/)

## Licença

© 2025 Como Vota Curitiba — Todos os direitos reservados.  
Os dados eleitorais são públicos e disponibilizados pelo TSE.
