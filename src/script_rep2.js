document.addEventListener('DOMContentLoaded', () => {
  // =============================
  // ELEMENTOS DO DOM
  // =============================
  const nomeBairro = document.getElementById('Nome_Bairro');
  const listaContainer = document.getElementById('listaContainer');
  const textoMouse  = document.getElementById('textoMouse');
  const containerSVG = document.getElementById('Svg_Container');
  const visualozacaomapa = document.getElementById('visualozacaomapa');
  // =============================
  // PATHS DE DADOS
  // =============================
  const svgPath = '/Bases/bairros_curitiba.svg';
  const caminhoDadosEleitorais = '/Bases/Dados_eleitorais_vereadores_por_bairro_CWB.csv';
  const caminhoDadosHab = '/bases/infocuritiba/DB_HAB_INFOCURITIBA.csv';
  const caminhoDadosRenda = '/bases/infocuritiba/DB_RENDA_INFOCURITIBA.csv';

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

    const renda = dadosRenda['2010'];
    document.getElementById('RendaPercapta').textContent = formatarRenda(renda);
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
      'Numero_total_votos',
      'Numero_votos_pessoas_negras',
      'Porcentagem_votos_pessoas_negras',
      'Numero_votos_mulheres',
      'Porcentagem_votos_mulheres',
      'Numero_votos_nulos',
      'Numero_votos_brancos',
      'PartidoMaisVotado',
      'VereadorMaisVotado',
      'Numero_total_moradores',
      'RendaPercapta'
    ];

    camposEleitorais.forEach(id => {
      const elemento = document.getElementById(id);
      if (!elemento) return;

      elemento.addEventListener('click', () => {
        visualizacaoSelecionada = id;
        visualozacaomapa.textContent = visualizacaoSelecionada;
        const tabelaNormalizada = criarTabelaNormalizada(dadosEleitoraisBairros);
        console.log(tabelaNormalizada);
        const corCabral = getCorBairro('CABRAL', 'QT_VOTOS_NEGROS', tabelaNormalizada);
        console.log(corCabral); // deve retornar a cor correspondente
        pintarBairroSVG('CABRAL', corCabral);
      });
    });

  }

  function criarTabelaNormalizada(dadosEleitoraisBairros) {
    const bairros = Object.keys(dadosEleitoraisBairros);
    const campos = [
      'QT_VOTOS_TOTAIS',
      'QT_VOTOS_NEGROS',
      'QT_VOTOS_MULHERES',
      'QT_VOTOS_NULOS',
      'QT_VOTOS_BRANCOS'
    ];

    // Primeiro, encontrar min e max de cada campo
    const minMax = {};
    campos.forEach(campo => {
      const valores = bairros.map(bairro => parseFloat(dadosEleitoraisBairros[bairro][campo]) || 0);
      minMax[campo] = {
        min: Math.min(...valores),
        max: Math.max(...valores)
      };
    });

    // Criar tabela normalizada
    const tabela = bairros.map((bairro, index) => {
      const linha = { id: index, bairro: bairro };
      campos.forEach(campo => {
        const valor = parseFloat(dadosEleitoraisBairros[bairro][campo]) || 0;
        const { min, max } = minMax[campo];
        // normaliza de 0 a 100
        linha[campo] = max === min ? 0 : ((valor - min) / (max - min)) * 100;
      });
      return linha;
    });

    return tabela;
  }

  function getCorBairro(bairro, coluna, tabelaNormalizada) {
    // Encontra o objeto do bairro
    const objBairro = tabelaNormalizada.find(b => b.bairro.toUpperCase() === bairro.toUpperCase());
    if (!objBairro) return '#f0f0f0'; // padrão caso não encontre

    // Pega o valor da coluna e normaliza entre 0 e 1
    const valor = parseFloat(objBairro[coluna]);
    const norm = isNaN(valor) ? 0 : valor / 100; // assumindo tabela de 0-100

    // Gera cor RGB do degradê
    const r = Math.round(240 - norm * 120); // vermelho
    const g = Math.round(240 - norm * 120); // verde
    const b = Math.round(240 + norm * 15);  // azul

    return `rgb(${r}, ${g}, ${b})`;
  }

  function pintarBairroSVG(bairro, cor) {
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


