document.addEventListener('DOMContentLoaded', () => {
  // =============================
  // ELEMENTOS DO DOM
  // =============================
  const nomeBairro = document.getElementById('Nome_Bairro');
  const listaContainer = document.getElementById('listaContainer');
  const textoMouse = document.getElementById('textoMouse');
  const containerSVG = document.getElementById('Svg_Container');
  const visualozacaomapa = document.getElementById('visualozacaomapa');
  // =============================
  // PATHS DE DADOS
  // =============================
  const svgPath = './pasta/bairros_curitiba.svg';
  const caminhoDadosEleitorais = './pasta/Dados_eleitorais_vereadores_por_bairro_CWB.csv';
  const caminhoDadosHab = './pasta/DB_HAB_INFOCURITIBA.csv';
  const caminhoDadosRenda = './pasta/DB_RENDA_INFOCURITIBA.csv';

  // =============================
  // VARIÁVEIS GLOBAIS
  // =============================
  let bairroSelecionado = '';
  const defaultText = 'AA';
  let dadosEleitoraisBairros = {};
  let dadosHabBairros = {};
  let dadosRendaBairros = {};

  // =============================
  // CARREGAMENTO DO SVG
  // =============================
  fetch(svgPath)
    .then(response => {
      if (!response.ok) throw new Error('Não foi possível carregar o SVG.');
      return response.text();
    })
    .then(svgText => {
      containerSVG.innerHTML = svgText;
      const svgElement = containerSVG.querySelector('svg');

      if (svgElement) {
        Object.assign(svgElement.style, {
          width: '100%',
          height: '100%',
          display: 'block',
          transform: 'scale(1.7)',
          transformOrigin: 'center',
          transformBox: 'fill-box'
        });
        svgElement.setAttribute('viewBox', '0 0 576.00 432.00');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // Inicializa interações
      addEventListenersToShapes();
      gerarLista();
      carregarCSV(caminhoDadosEleitorais, dadosEleitoraisBairros, 'Eleitorais');
      carregarCSV(caminhoDadosHab, dadosHabBairros, 'Hab');
      carregarCSV(caminhoDadosRenda, dadosRendaBairros, 'Renda');
      configurarClickCamposEleitorais();


      // 🚀 Aqui: simula o clique em “Total de votos”
      document.getElementById("Numero_total_votos")?.click();
    })
    .catch(error => {
      console.error('Erro ao carregar SVG:', error);
      containerSVG.innerHTML = '<p style="color:red;">Falha ao carregar o arquivo SVG.</p>';
    });

  // =============================
  // ATUALIZAÇÃO DE BAIRRO SELECIONADO
  // =============================

  function atualizarBairroSelecionado(nome) {
    bairroSelecionado = nome;
    nomeBairro.textContent = nome;

    containerSVG.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
    const shape = containerSVG.querySelector(`#${CSS.escape(nome)}`);
    if (shape) shape.classList.add('selected');

    atualizarPainelInformacoes(nome);
  }

  // =============================
  // EVENTOS DE HOVER E CLIQUE NO SVG
  // =============================

  function addEventListenersToShapes() {
    containerSVG.querySelectorAll('svg [id]').forEach(shape => {
      shape.addEventListener('mouseover', () => {
        textoMouse.textContent = shape.id
        textoMouse.style.display = 'block';
      });
      shape.addEventListener('mouseout', () => {
        textoMouse.textContent = bairroSelecionado || defaultText
        textoMouse.style.display = 'none';
      });
      shape.addEventListener('click', () => atualizarBairroSelecionado(shape.id));
      shape.addEventListener('mousemove', e => {
        const rect = containerSVG.getBoundingClientRect();
        textoMouse.style.left = `${e.clientX - rect.left + 10}px`;
        textoMouse.style.top = `${e.clientY - rect.top + 10}px`;
      });
    });
  }
  // =============================
  // GERA LISTA LATERAL DE BAIRROS
  // =============================

  function gerarLista() {
    listaContainer.innerHTML = '';
    containerSVG.querySelectorAll('svg [id]').forEach(shape => {

      if (shape.id === bairroSelecionado) {
        item.classList.add('ativo');
      }

      if (!shape.id) return;
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = shape.id;
      item.addEventListener('click', () => atualizarBairroSelecionado(shape.id));
      listaContainer.appendChild(item);
    });
  }

  // =============================
  // FUNÇÃO GENÉRICA DE CARREGAMENTO DE CSV
  // =============================

  function carregarCSV(caminho, objetoDestino, tipo) {
    fetch(caminho)
      .then(response => {
        if (!response.ok) throw new Error(`Não foi possível carregar o CSV de ${tipo}.`);
        return response.text();
      })
      .then(csvText => {
        const linhas = csvText.trim().split('\n');
        const colunas = linhas[0].split(',');

        for (let i = 1; i < linhas.length; i++) {
          const valores = linhas[i].split(',');
          const bairro = valores[0].trim().toUpperCase();
          objetoDestino[bairro] = {};

          for (let j = 1; j < colunas.length; j++) {
            objetoDestino[bairro][colunas[j].trim()] = valores[j] ? valores[j].trim() : '';
          }
        }

        console.log(`CSV ${tipo} carregado:`, objetoDestino);
      })
      .catch(error => console.error(`Erro ao carregar CSV ${tipo}:`, error));
  }

  // =============================
  // ATUALIZAÇÃO DO PAINEL LATERAL
  // =============================

  function atualizarPainelInformacoes(bairroNome) {
    const bairro = bairroNome.toUpperCase();

    const dadosEleitorais = dadosEleitoraisBairros[bairro] || {};
    const dadosHab = dadosHabBairros[bairro] || {};
    const dadosRenda = dadosRendaBairros[bairro] || {};

    const getNumero = v => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
    const votosTotais = getNumero(dadosEleitorais['QT_VOTOS_TOTAIS']);
    const votosNegros = getNumero(dadosEleitorais['QT_VOTOS_NEGROS']);
    const votosMulheres = getNumero(dadosEleitorais['QT_VOTOS_MULHERES']);
    const votosNulos = getNumero(dadosEleitorais['QT_VOTOS_NULOS']);
    const votosBrancos = getNumero(dadosEleitorais['QT_VOTOS_BRANCOS']);

    const pct = (parte, total) => total > 0 ? `${((parte * 100) / total).toFixed(2)}%` : '—';

    // Atualiza campos eleitorais
    document.getElementById('Numero_total_votos').textContent = votosTotais || '—';
    document.getElementById('Numero_votos_pessoas_negras').textContent = votosNegros || '—';
    document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(votosNegros, votosTotais);
    document.getElementById('Numero_votos_mulheres').textContent = votosMulheres || '—';
    document.getElementById('Porcentagem_votos_mulheres').textContent = pct(votosMulheres, votosTotais);
    document.getElementById('Numero_votos_nulos').textContent = votosNulos || '—';
    document.getElementById('Numero_votos_brancos').textContent = votosBrancos || '—';
    document.getElementById('PartidoMaisVotado').textContent = dadosEleitorais['PARTIDO_MAIS_VOTADO'] || '—';
    document.getElementById('VereadorMaisVotado').textContent = dadosEleitorais['VEREADOR_MAIS_VOTADO'] || '—';
    // Atualiza campos habitacionais / socioeconômicos
    document.getElementById('Numero_total_moradores').textContent = dadosHab['2024'] || '—';
    document.getElementById('RendaPercapta').textContent = formatarRenda(dadosRenda['2010']);
  }

  // =============================
  // formata Renda
  // =============================

  function formatarRenda(valor) {
    let num = parseFloat(valor);
    if (isNaN(num) || num <= 0) return '—';

    // Se o valor estiver absurdamente alto (> 10000), provavelmente está em centavos
    if (num > 10000) num = num / 100;
    else num = num * 1000;

    // Formata em reais
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }

  // =============================
  // Seleciona todos os campos eleitorais que devem atualizar visualizacaoSelecionada
  // =============================

  function configurarClickCamposEleitorais() {
    const camposEleitorais = [
      "Numero_total_votos",
      "Numero_votos_pessoas_negras",
      "Porcentagem_votos_pessoas_negras",
      "Numero_votos_mulheres",
      "Porcentagem_votos_mulheres",
      "Numero_votos_nulos",
      "Numero_votos_brancos",
      "Numero_total_moradores",
      "RendaPercapta"
    ];

    camposEleitorais.forEach(id => {
      const elemento = document.getElementById(id);
      if (!elemento) return;

      elemento.addEventListener('click', () => {
        visualizacaoSelecionada = id;
        visualozacaomapa.textContent = visualizacaoSelecionada;

        const tabelaNormalizada = criarTabelaNormalizada(dadosEleitoraisBairros);

        // Percorre TODOS os bairros da tabela normalizada
        tabelaNormalizada.forEach(bairroObj => {
          const nomeBairro = bairroObj.bairro;
          const cor = getCorBairro(nomeBairro, id, tabelaNormalizada);

          pintarBairroSVG(nomeBairro, cor);
        });
      });

    });

  }

  function criarTabelaNormalizada(dadosEleitoraisBairros) {
    const bairros = Object.keys(dadosEleitoraisBairros);

    // Campos numéricos que serão normalizados 0–100
    const campos = [
      "Numero_total_votos",
      "Numero_votos_pessoas_negras",
      "Porcentagem_votos_pessoas_negras",
      "Numero_votos_mulheres",
      "Porcentagem_votos_mulheres",
      "Numero_votos_nulos",
      "Numero_votos_brancos",
      "Numero_total_moradores",
      "RendaPercapta"
    ];

    // Converter header original → novos nomes
    // e calcular percentuais necessários
    const tabelaConvertida = bairros.map(bairro => {
      const dados = dadosEleitoraisBairros[bairro];

      const total = parseFloat(dados.QT_VOTOS_TOTAIS) || 0;

      return {
        bairro: bairro,

        Numero_total_votos: total,
        Numero_votos_pessoas_negras: parseFloat(dados.QT_VOTOS_NEGROS) || 0,
        Porcentagem_votos_pessoas_negras: total > 0 ? (dados.QT_VOTOS_NEGROS / total) * 100 : 0,

        Numero_votos_mulheres: parseFloat(dados.QT_VOTOS_MULHERES) || 0,
        Porcentagem_votos_mulheres: total > 0 ? (dados.QT_VOTOS_MULHERES / total) * 100 : 0,

        Numero_votos_nulos: parseFloat(dados.QT_VOTOS_NULOS) || 0,
        Numero_votos_brancos: parseFloat(dados.QT_VOTOS_BRANCOS) || 0,

        Numero_total_moradores: parseFloat(dados.NUMERO_TOTAL_MORADORES) || 0,
        RendaPercapta: parseFloat(dados.RENDAPERCAPTA) || 0,

      };
    });

    // Obter min e max de cada campo
    const minMax = {};
    campos.forEach(campo => {
      const valores = tabelaConvertida.map(linha => linha[campo]);
      minMax[campo] = {
        min: Math.min(...valores),
        max: Math.max(...valores)
      };
    });

    // Criar tabela final normalizada
    const tabelaNormalizada = tabelaConvertida.map((linha, idx) => {
      const novaLinha = { id: idx, bairro: linha.bairro };

      campos.forEach(campo => {
        const valor = linha[campo];
        const { min, max } = minMax[campo];

        novaLinha[campo] = max === min ? 0 : ((valor - min) / (max - min)) * 100;
      });

      return novaLinha;
    });

    return tabelaNormalizada;
  }

  function getCorBairro(bairro, coluna, tabelaNormalizada) {
    // Encontra o objeto do bairro EXATAMENTE como está no SVG
    const objBairro = tabelaNormalizada.find(b => b.bairro === bairro);
    if (!objBairro) return '#f0f0f0'; // padrão caso não encontre

    // Pega o valor da coluna e normaliza entre 0 e 1
    const valor = parseFloat(objBairro[coluna]);
    const norm = isNaN(valor) ? 0 : valor / 100; // assumindo tabela de 0-100

    // Gera cor RGB do degradê
    const r = Math.round(240 - norm * 120);
    const g = Math.round(240 - norm * 120);
    const b = Math.round(240 + norm * 15);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function pintarBairroSVG(bairro, cor) {
    if (!bairro || typeof bairro !== "string" || bairro.trim() === "") {
      console.warn("Bairro inválido recebido:", bairro);
      return;
    }

    const containerSVG = document.getElementById('Svg_Container');
    const svg = containerSVG.querySelector('svg'); // <--- pega o svg
    if (!svg) return;
    const shape = svg.querySelector(`#${CSS.escape(bairro)}`.toLowerCase());
    if (!shape) {
      console.warn('Bairro não encontrado no SVG:', bairro);
      return;
    }
    shape.setAttribute('fill', cor);
    shape.style.fill = cor;  // força a cor
  }

});



