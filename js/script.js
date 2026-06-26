// =============================
// POPUP DE AVISO DE CONSTRUÇÃO
// =============================
const avisoOverlay = document.getElementById('avisoOverlay');
const fecharAvisoBtn = document.getElementById('fecharAviso');

if (fecharAvisoBtn) {
  fecharAvisoBtn.addEventListener('click', () => {
    avisoOverlay.style.display = 'none';
  });
}

// Fecha o aviso também ao clicar no overlay
if (avisoOverlay) {
  avisoOverlay.addEventListener('click', (e) => {
    if (e.target === avisoOverlay) {
      avisoOverlay.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // =============================
  // ELEMENTOS DO DOM
  // =============================
  const nomeBairro = document.getElementById('Nome_Bairro');
  const listaContainer = document.getElementById('listaContainer');
  const textoMouse = document.getElementById('textoMouse');
  const containerSVG = document.getElementById('Svg_Container');
  const visualozacaomapa = document.getElementById('tituloMapa');
  const UsarDadosRelativos = document.getElementById('UsarDadosRelativos');

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
  let mostrarPorcentagem = false;
  let visualizacaoSelecionada = 'Numero_total_votos';
  let todosBairros = false;

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
        svgElement.setAttribute('viewBox', '0 0 576.00 400.00');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // Inicializa interações
      addEventListenersToShapes();
      gerarLista();
      carregarCSV(caminhoDadosEleitorais, dadosEleitoraisBairros, 'Eleitorais');
      carregarCSV(caminhoDadosHab, dadosHabBairros, 'Hab');
      carregarCSV(caminhoDadosRenda, dadosRendaBairros, 'Renda');
      configurarClickCamposEleitorais();
      atualizarTituloMapa(visualizacaoSelecionada);
      
      // Listener para o toggle de porcentagens
      const checkboxPorcentagem = document.getElementById('permitirSaltos');
      if (checkboxPorcentagem) {
        checkboxPorcentagem.addEventListener('change', (e) => {
          mostrarPorcentagem = e.target.checked;
          
          // Atualiza o painel
          if (todosBairros) {
            atualizarPainelTodosBairros();
          } else if (bairroSelecionado) {
            atualizarPainelInformacoes(bairroSelecionado);
          }
          
          // Alterna entre visualizações de números e porcentagens no mapa
          if (visualizacaoSelecionada === 'Numero_votos_pessoas_negras') {
            visualizacaoSelecionada = mostrarPorcentagem ? 'Porcentagem_votos_pessoas_negras' : 'Numero_votos_pessoas_negras';
          } else if (visualizacaoSelecionada === 'Porcentagem_votos_pessoas_negras') {
            visualizacaoSelecionada = mostrarPorcentagem ? 'Porcentagem_votos_pessoas_negras' : 'Numero_votos_pessoas_negras';
          } else if (visualizacaoSelecionada === 'Numero_votos_mulheres') {
            visualizacaoSelecionada = mostrarPorcentagem ? 'Porcentagem_votos_mulheres' : 'Numero_votos_mulheres';
          } else if (visualizacaoSelecionada === 'Porcentagem_votos_mulheres') {
            visualizacaoSelecionada = mostrarPorcentagem ? 'Porcentagem_votos_mulheres' : 'Numero_votos_mulheres';
          }
          
          // Atualiza o destaque visual e o mapa
          atualizarDestaque();
          
          const tabelaNormalizada = criarTabelaNormalizada(dadosEleitoraisBairros);
          tabelaNormalizada.forEach(bairroObj => {
            const nomeBairro = bairroObj.bairro;
            const cor = getCorBairro(nomeBairro, visualizacaoSelecionada, tabelaNormalizada);
            pintarBairroSVG(nomeBairro, cor);
          });
        });
      }
      // Seleciona todos os bairros por padrão e exibe total de votos
      setTimeout(() => {
        selecionarTodosBairros();
        // Inicializa a visualização de total de votos
        const divAtivo = document.querySelector('[data-visualization="Numero_total_votos"]');
        if (divAtivo) {
          divAtivo.click();
        }
      }, 500);
    })
    .catch(error => {
      console.error('Erro ao carregar SVG:', error);
      containerSVG.innerHTML = '<p style="color:red;">Falha ao carregar o arquivo SVG.</p>';
    });

  // =============================
  // ATUALIZAÇÃO DE BAIRRO SELECIONADO
  // =============================

  function atualizarBairroSelecionado(nome) {
    todosBairros = false;
    bairroSelecionado = nome;
    nomeBairro.textContent = nome;

    containerSVG.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
    const shape = containerSVG.querySelector(`#${CSS.escape(nome)}`);
    if (shape) shape.classList.add('selected');

    atualizarPainelInformacoes(nome);
  }

  // =============================
  // SELECIONA TODOS OS BAIRROS
  // =============================
  function selecionarTodosBairros() {
    todosBairros = true;
    bairroSelecionado = '';
    nomeBairro.textContent = 'Todos os bairros';

    containerSVG.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
    atualizarPainelTodosBairros();
    atualizarTituloMapa(visualizacaoSelecionada);
    gerarLista();
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
        textoMouse.style.left = `${e.clientX - rect.left + 220}px`;
        textoMouse.style.top = `${e.clientY - rect.top + 200}px`;
      });
    });
  }
  // =============================
  // GERA LISTA LATERAL DE BAIRROS
  // =============================

  function gerarLista() {
    listaContainer.innerHTML = '';
    
    // Adiciona "Todos os bairros" como primeiro item
    const itemTodosBairros = document.createElement('div');
    itemTodosBairros.className = 'item';
    itemTodosBairros.textContent = 'Todos os bairros';
    
    if (todosBairros) {
      itemTodosBairros.classList.add('ativo');
    }
    
    itemTodosBairros.addEventListener('click', () => selecionarTodosBairros());
    listaContainer.appendChild(itemTodosBairros);
    
    // Adiciona os bairros individuais
    containerSVG.querySelectorAll('svg [id]').forEach(shape => {
      if (!shape.id) return;
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = shape.id;
      
      if (shape.id === bairroSelecionado) {
        item.classList.add('ativo');
      }

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
  // ATUALIZAÇÃO DO PAINEL TODOS OS BAIRROS
  // =============================
  function atualizarPainelTodosBairros() {
    // Soma todos os dados de todos os bairros
    let votosTotaisSum = 0;
    let votosNegrosSum = 0;
    let votosMulheresSum = 0;
    let votosNulosSum = 0;
    let votosBrancosSum = 0;
    let moradoresTotalSum = 0;

    Object.keys(dadosEleitoraisBairros).forEach(bairro => {
      const dados = dadosEleitoraisBairros[bairro];
      votosTotaisSum += parseFloat(dados['QT_VOTOS_TOTAIS']) || 0;
      votosNegrosSum += parseFloat(dados['QT_VOTOS_NEGROS']) || 0;
      votosMulheresSum += parseFloat(dados['QT_VOTOS_MULHERES']) || 0;
      votosNulosSum += parseFloat(dados['QT_VOTOS_NULOS']) || 0;
      votosBrancosSum += parseFloat(dados['QT_VOTOS_BRANCOS']) || 0;
    });

    Object.keys(dadosHabBairros).forEach(bairro => {
      const dados = dadosHabBairros[bairro];
      moradoresTotalSum += parseFloat(dados['2024']) || 0;
    });

    const pct = (parte, total) =>
      total > 0 && parte !== null
        ? `${((parte * 100) / total).toFixed(2)}%`
        : '—';

    // Alterna visibilidade
    document.getElementById('Porcentagem_votos_pessoas_negras').classList.toggle('hidden', !mostrarPorcentagem);
    document.getElementById('Porcentagem_votos_mulheres').classList.toggle('hidden', !mostrarPorcentagem);

    document.getElementById('Numero_votos_mulheres').classList.toggle('hidden', mostrarPorcentagem);
    document.getElementById('Numero_votos_pessoas_negras').classList.toggle('hidden', mostrarPorcentagem);

    // Atualiza campos eleitorais com os totais
    document.getElementById('Numero_total_votos').textContent = votosTotaisSum || '—';
    document.getElementById('Numero_votos_pessoas_negras').textContent = votosNegrosSum || '—';
    document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(votosNegrosSum, votosTotaisSum);
    document.getElementById('Numero_votos_mulheres').textContent = votosMulheresSum || '—';
    document.getElementById('Porcentagem_votos_mulheres').textContent = pct(votosMulheresSum, votosTotaisSum);
    document.getElementById('Numero_votos_nulos').textContent = votosNulosSum || '—';
    document.getElementById('Numero_votos_brancos').textContent = votosBrancosSum || '—';
    document.getElementById('PartidoMaisVotado').textContent = '—';
    document.getElementById('VereadorMaisVotado').textContent = '—';

    // Dados habitacionais / renda
    document.getElementById('Numero_total_moradores').textContent = moradoresTotalSum || '—';
    document.getElementById('RendaPercapta').textContent = '—';
  }

  // =============================
  // ATUALIZAÇÃO DO PAINEL LATERAL
  // =============================

  function atualizarPainelInformacoes(bairroNome) {
    const bairro = bairroNome?.toUpperCase?.() || '';

    const dadosEleitorais = dadosEleitoraisBairros[bairro] || {};
    const dadosHab = dadosHabBairros[bairro] || {};
    const dadosRenda = dadosRendaBairros[bairro] || {};

    const getNumero = v => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    const votosTotais = getNumero(dadosEleitorais['QT_VOTOS_TOTAIS']);
    const votosNegros = getNumero(dadosEleitorais['QT_VOTOS_NEGROS']);
    const votosMulheres = getNumero(dadosEleitorais['QT_VOTOS_MULHERES']);
    const votosNulos = getNumero(dadosEleitorais['QT_VOTOS_NULOS']);
    const votosBrancos = getNumero(dadosEleitorais['QT_VOTOS_BRANCOS']);

    const pct = (parte, total) =>
      total > 0 && parte !== null
        ? `${((parte * 100) / total).toFixed(2)}%`
        : '—';

    // Alterna visibilidade
    document.getElementById('Porcentagem_votos_pessoas_negras').classList.toggle('hidden', !mostrarPorcentagem);
    document.getElementById('Porcentagem_votos_mulheres').classList.toggle('hidden', !mostrarPorcentagem);

    document.getElementById('Numero_votos_mulheres').classList.toggle('hidden', mostrarPorcentagem);
    document.getElementById('Numero_votos_pessoas_negras').classList.toggle('hidden', mostrarPorcentagem);

    // Atualiza campos eleitorais
    document.getElementById('Numero_total_votos').textContent = votosTotais ?? '—';
    document.getElementById('Numero_votos_pessoas_negras').textContent = votosNegros ?? '—';
    document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(votosNegros, votosTotais);
    document.getElementById('Numero_votos_mulheres').textContent = votosMulheres ?? '—';
    document.getElementById('Porcentagem_votos_mulheres').textContent = pct(votosMulheres, votosTotais);
    document.getElementById('Numero_votos_nulos').textContent = votosNulos ?? '—';
    document.getElementById('Numero_votos_brancos').textContent = votosBrancos ?? '—';
    document.getElementById('PartidoMaisVotado').textContent = dadosEleitorais['PARTIDO_MAIS_VOTADO'] || '—';
    document.getElementById('VereadorMaisVotado').textContent = dadosEleitorais['VEREADOR_MAIS_VOTADO'] || '—';

    // Dados habitacionais / renda
    document.getElementById('Numero_total_moradores').textContent = dadosHab['2024'] ?? '—';
    document.getElementById('RendaPercapta').textContent = formatarRenda(dadosRenda['2010']);
  }




  // =============================
  // Mapa de títulos para cada visualização
  // =============================
  const titulosVisualizacao = {
    'Numero_total_votos': 'Número total de votos em 2024 por bairro de Curitiba',
    'Numero_votos_pessoas_negras': 'Número total de votos em 2024 em pessoas negras por bairro de Curitiba',
    'Porcentagem_votos_pessoas_negras': 'Porcentagem de votos em 2024 em pessoas negras por bairro de Curitiba',
    'Numero_votos_mulheres': 'Número total de votos em 2024 em mulheres por bairro de Curitiba',
    'Porcentagem_votos_mulheres': 'Porcentagem de votos em 2024 em mulheres por bairro de Curitiba',
    'Numero_votos_nulos': 'Número total de votos em 2024 nulos por bairro de Curitiba',
    'Numero_votos_brancos': 'Número total de votos em 2024 brancos por bairro de Curitiba',
    'Numero_total_moradores': 'Número total de moradores por bairro de Curitiba',
    'RendaPercapta': 'Renda per capita por bairro de Curitiba'
  };

  // =============================
  // Atualiza o título do mapa
  // =============================
  function atualizarTituloMapa(nomeVisualizacao) {
    const tituloMapa = document.getElementById('tituloMapa');
    if (tituloMapa) {
      const h2 = tituloMapa.querySelector('h2');
      if (h2) {
        h2.textContent = titulosVisualizacao[nomeVisualizacao] || 'Mapa de Curitiba';
      }
    }
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
  // Atualiza o destaque visual dos informações
  // =============================
  function atualizarDestaque() {
    // Remove a classe ativo de todos os divinformacoes
    document.querySelectorAll('.divinformacoes').forEach(elem => {
      elem.classList.remove('ativo');
    });
    
    // Mapeamento de porcentagens para seus números correspondentes
    let visualizacaoParaDestaque = visualizacaoSelecionada;
    if (visualizacaoSelecionada === 'Porcentagem_votos_pessoas_negras') {
      visualizacaoParaDestaque = 'Numero_votos_pessoas_negras';
    } else if (visualizacaoSelecionada === 'Porcentagem_votos_mulheres') {
      visualizacaoParaDestaque = 'Numero_votos_mulheres';
    }
    
    // Adiciona a classe ativo ao divinformacoes correspondente
    const divAtivo = document.querySelector(`[data-visualization="${visualizacaoParaDestaque}"]`);
    if (divAtivo) {
      divAtivo.classList.add('ativo');
    }
  }

  // =============================
  // Determina a visualização correta baseado no toggle
  // =============================
  function obterVisualizacaoCorreta(campoClicado) {
    // Se o toggle está ativado E o campo tem uma versão em porcentagem, retorna a versão em %
    if (mostrarPorcentagem) {
      if (campoClicado === 'Numero_votos_pessoas_negras') {
        return 'Porcentagem_votos_pessoas_negras';
      } else if (campoClicado === 'Numero_votos_mulheres') {
        return 'Porcentagem_votos_mulheres';
      }
    }
    // Caso contrário, retorna o campo como foi clicado
    return campoClicado;
  }

  // =============================
  // Seleciona todos os campos eleitorais que devem atualizar visualizacaoSelecionada
  // =============================

  function configurarClickCamposEleitorais() {
    // Lista de campos que podem ser visualizados no mapa
    const camposVizualizaveis = [
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

    // Adiciona listeners apenas aos divinformacoes que têm visualização de mapa
    document.querySelectorAll('.divinformacoes').forEach(div => {
      const id = div.getAttribute('data-visualization');
      if (!id || !camposVizualizaveis.includes(id)) return;

      div.addEventListener('click', () => {
        // Obtém a visualização correta baseado no toggle
        const idCorreto = obterVisualizacaoCorreta(id);
        visualizacaoSelecionada = idCorreto;
        atualizarTituloMapa(idCorreto);
        atualizarDestaque();

        const tabelaNormalizada = criarTabelaNormalizada(dadosEleitoraisBairros);

        // Percorre TODOS os bairros da tabela normalizada
        tabelaNormalizada.forEach(bairroObj => {
          const nomeBairro = bairroObj.bairro;
          const cor = getCorBairro(nomeBairro, idCorreto, tabelaNormalizada);

          pintarBairroSVG(nomeBairro, cor);
        });
      });
    });

    // Marca a visualização inicial como ativa
    atualizarDestaque();
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
    shape.style.fill = cor;  // força a cor
    console.warn('Bshape.style.fill = ', cor);
  }

});

