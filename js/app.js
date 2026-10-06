// Estado global
// modo: 'bairros' → id = IPPUC number ou null; modo: 'locais' → id = "zona-numero" ou null
let selecao                 = { modo: 'bairros', id: null, nm: null };
let visualizacaoSelecionada = 'Numero_total_votos';
let mostrarPorcentagem      = true;

const ANOS_SITE       = [2022, 2024, 2026];
let seletorState      = { ano: null, eleicaoId: null };
let eleicaoAtualId    = null;
let carregandoEleicao = false;

// Paleta de fallback para partidos sem cor definida (persiste na sessão)
const _paletaFallback = new Map();

// Cache da última tabela normalizada — atualiza o marcador da legenda sem recolorir o mapa
let _ultimaTabelaInfo = null;

const camposVisualizaveis = [
  'Numero_total_votos',
  'Numero_votos_validos',
  'Numero_votos_pessoas_negras',
  'Porcentagem_votos_pessoas_negras',
  'Numero_votos_mulheres',
  'Porcentagem_votos_mulheres',
  'Numero_votos_nulos',
  'Numero_votos_brancos',
  'Numero_total_moradores',
  'RendaPercapta',
];

// Campos que usam coloração categórica (desativam o toggle)
const camposCategoricos = ['PartidoMaisVotado', 'VereadorMaisVotado'];

const titulosPorVisualizacao = {
  Numero_total_votos:               t => `Total de votos — ${t}`,
  Numero_votos_validos:             t => `Votos válidos — ${t}`,
  Numero_votos_pessoas_negras:      t => `Votos em pessoas negras — ${t}`,
  Porcentagem_votos_pessoas_negras: t => `% de votos em pessoas negras — ${t}`,
  Numero_votos_mulheres:            t => `Votos em mulheres — ${t}`,
  Porcentagem_votos_mulheres:       t => `% de votos em mulheres — ${t}`,
  Numero_votos_nulos:               t => `Votos nulos — ${t}`,
  Numero_votos_brancos:             t => `Votos brancos — ${t}`,
  Numero_total_moradores:           () => 'Moradores por bairro de Curitiba (Censo 2022)',
  RendaPercapta:                    () => 'Renda per capita por bairro de Curitiba (Censo 2010)',
  PartidoMaisVotado:                () => 'Partido mais votado por bairro',
  VereadorMaisVotado:               () => 'Candidato mais votado por bairro',
};

// Retorna properties do GeoJSON para um id IPPUC
function propGeoJson(idBairro) {
  const f = dadosGeoJson.features.find(f => f.properties.id === idBairro);
  return f ? f.properties : {};
}

// Normalização 0–100 (min→0, max→100) sobre os campos de visualização.
// Retorna { tabela, info } onde info[campo] = { min, max, idMin, idMax }.
function criarTabelaNormalizada() {
  const rows = [];
  for (const [id, b] of dadosBairros) {
    const geo   = propGeoJson(id);
    const total = b.qt_votos_total;
    rows.push({
      id,
      Numero_total_votos:               b.qt_votos_total,
      Numero_votos_validos:             b.votos_validos,
      Numero_votos_pessoas_negras:      b.votos_negros,
      Porcentagem_votos_pessoas_negras: total > 0 ? (b.votos_negros   / total) * 100 : 0,
      Numero_votos_mulheres:            b.votos_mulheres,
      Porcentagem_votos_mulheres:       total > 0 ? (b.votos_mulheres / total) * 100 : 0,
      Numero_votos_nulos:               b.qt_votos_nulos,
      Numero_votos_brancos:             b.qt_votos_brancos,
      Numero_total_moradores:           geo.populacao   || 0,
      RendaPercapta:                    geo.renda_media || 0,
    });
  }

  const info = {};
  camposVisualizaveis.forEach(campo => {
    const vals = rows.map(r => r[campo]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rMin = rows.find(r => r[campo] === min);
    const rMax = rows.find(r => r[campo] === max);
    info[campo] = { min, max, idMin: rMin?.id ?? null, idMax: rMax?.id ?? null };
  });

  const tabela = rows.map(row => {
    const norm = { id: row.id };
    camposVisualizaveis.forEach(campo => {
      const { min, max } = info[campo];
      norm[campo] = max === min ? 0 : ((row[campo] - min) / (max - min)) * 100;
    });
    return norm;
  });

  return { tabela, info };
}

// Degradê cinza→azul-claro (mesma fórmula do código anterior)
function getCorBairro(idBairro, campo, tabelaNormalizada) {
  const obj = tabelaNormalizada.find(r => r.id === idBairro);
  if (!obj) return '#f0f0f0';
  const norm = isNaN(obj[campo]) ? 0 : obj[campo] / 100;
  const r = Math.round(240 - norm * 120);
  const g = Math.round(240 - norm * 120);
  const b = Math.round(240 + norm * 15);
  return `rgb(${r}, ${g}, ${b})`;
}

// Aplica a mesma fórmula de getCorBairro a um valor normalizado 0–1
function corParaNorm(norm) {
  const r = Math.round(240 - norm * 120);
  const g = Math.round(240 - norm * 120);
  const b = Math.round(240 + norm * 15);
  return `rgb(${r},${g},${b})`;
}

function formatarValorLegenda(valor, campo) {
  if (campo === 'RendaPercapta') return fmtDinheiro(valor);
  if (campo.startsWith('Porcentagem_')) return fmtPorcentagem(valor);
  return fmtInteiro(valor);
}

// Formata votos no partido/candidato respeitando o toggle de porcentagem
function fmtVotosToggle(v, ref) {
  if (v === null || v === undefined) return '—';
  if (mostrarPorcentagem && ref > 0) return fmtPorcentagem(v / ref * 100);
  return fmtInteiro(v);
}

// Monta o rótulo da eleição a partir dos campos disponíveis no eleicoes.json.
// Se o cargo tem mais de um turno no mesmo ano → inclui "Xº turno".
function tituloEleicao(eleicao) {
  if (!eleicao) return '';
  const temVariosTurnos = dadosEleicoes.filter(
    e => e.ano === eleicao.ano && e.cargo === eleicao.cargo
  ).length > 1;
  return temVariosTurnos
    ? `${eleicao.rotulo_cargo} ${eleicao.ano}, ${eleicao.turno}º turno`
    : `${eleicao.rotulo_cargo} ${eleicao.ano}`;
}

function atualizarTituloMapa(campo) {
  const el = document.querySelector('#tituloMapa h2');
  if (!el) return;
  const titulo = tituloEleicao(dadosEleicaoAtual);
  const fn = titulosPorVisualizacao[campo];
  el.textContent = fn ? fn(titulo) : 'Mapa de Curitiba';
}

function atualizarDestaque() {
  document.querySelectorAll('.divinformacoes').forEach(el => el.classList.remove('ativo'));
  // Porcentagem e número compartilham o mesmo card; usa o card do número
  let alvo = visualizacaoSelecionada;
  if (alvo === 'Porcentagem_votos_pessoas_negras') alvo = 'Numero_votos_pessoas_negras';
  if (alvo === 'Porcentagem_votos_mulheres')       alvo = 'Numero_votos_mulheres';
  const div = document.querySelector(`[data-visualization="${alvo}"]`);
  if (div) div.classList.add('ativo');
}

function obterVisualizacaoCorreta(campo) {
  if (mostrarPorcentagem) {
    if (campo === 'Numero_votos_pessoas_negras') return 'Porcentagem_votos_pessoas_negras';
    if (campo === 'Numero_votos_mulheres')       return 'Porcentagem_votos_mulheres';
  }
  return campo;
}

function atualizarToggle() {
  const categorico = camposCategoricos.includes(visualizacaoSelecionada);
  document.querySelector('#permitirSaltos')
    ?.closest('.containerOpcaoToggle')
    ?.classList.toggle('toggle-desativado', categorico);
}

function atualizarPainelInformacoes(idBairro) {
  const b    = dadosBairros.get(idBairro) || null;
  const geo  = propGeoJson(idBairro);
  const pct  = (n, d) => d > 0 && n != null ? fmtPorcentagem((n / d) * 100) : '—';

  document.getElementById('Porcentagem_votos_pessoas_negras').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Porcentagem_votos_mulheres').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Numero_votos_pessoas_negras').classList.toggle('hidden', mostrarPorcentagem);
  document.getElementById('Numero_votos_mulheres').classList.toggle('hidden', mostrarPorcentagem);

  if (!b) {
    const semVoto = 'Sem local de votação';
    ['Numero_total_votos', 'Numero_votos_validos',
     'Numero_votos_pessoas_negras', 'Porcentagem_votos_pessoas_negras',
     'Numero_votos_mulheres', 'Porcentagem_votos_mulheres',
     'Numero_votos_nulos', 'Numero_votos_brancos',
     'PartidoMaisVotado', 'VotosNoPartido',
     'VereadorMaisVotado', 'VotosNoCandidato',
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = semVoto;
    });
  } else {
    const total      = b.qt_votos_total;
    const validosRef = b.votos_validos || 0;
    document.getElementById('Numero_total_votos').textContent               = fmtInteiro(total);
    document.getElementById('Numero_votos_validos').textContent             = fmtInteiro(b.votos_validos);
    document.getElementById('Numero_votos_pessoas_negras').textContent      = fmtInteiro(b.votos_negros);
    document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(b.votos_negros, total);
    document.getElementById('Numero_votos_mulheres').textContent            = fmtInteiro(b.votos_mulheres);
    document.getElementById('Porcentagem_votos_mulheres').textContent       = pct(b.votos_mulheres, total);
    document.getElementById('Numero_votos_nulos').textContent               = fmtInteiro(b.qt_votos_nulos);
    document.getElementById('Numero_votos_brancos').textContent             = fmtInteiro(b.qt_votos_brancos);
    document.getElementById('PartidoMaisVotado').textContent                = b.partido_mais_votado || '—';
    document.getElementById('VotosNoPartido').textContent                   = fmtVotosToggle(b.votos_partido_mais_votado, validosRef);
    document.getElementById('VereadorMaisVotado').textContent               = b.candidato_mais_votado || '—';
    document.getElementById('VotosNoCandidato').textContent                 = fmtVotosToggle(b.votos_candidato_mais_votado, validosRef);
  }

  document.getElementById('Numero_total_moradores').textContent = fmtInteiro(geo.populacao);
  document.getElementById('RendaPercapta').textContent          = fmtDinheiro(geo.renda_media);
}

function atualizarPainelTodosBairros() {
  let totaisSum = 0, validosSum = 0, negrosSum = 0, mulheresSum = 0,
      nulosSum = 0, brancosSum = 0, moradores = 0;

  for (const b of dadosBairros.values()) {
    totaisSum   += b.qt_votos_total   || 0;
    validosSum  += b.votos_validos    || 0;
    negrosSum   += b.votos_negros     || 0;
    mulheresSum += b.votos_mulheres   || 0;
    nulosSum    += b.qt_votos_nulos   || 0;
    brancosSum  += b.qt_votos_brancos || 0;
  }
  dadosGeoJson.features.forEach(f => { moradores += f.properties.populacao || 0; });

  const pct = (n, d) => d > 0 ? fmtPorcentagem((n / d) * 100) : '—';

  document.getElementById('Porcentagem_votos_pessoas_negras').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Porcentagem_votos_mulheres').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Numero_votos_pessoas_negras').classList.toggle('hidden', mostrarPorcentagem);
  document.getElementById('Numero_votos_mulheres').classList.toggle('hidden', mostrarPorcentagem);

  document.getElementById('Numero_total_votos').textContent               = fmtInteiro(totaisSum);
  document.getElementById('Numero_votos_validos').textContent             = fmtInteiro(validosSum);
  document.getElementById('Numero_votos_pessoas_negras').textContent      = fmtInteiro(negrosSum);
  document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(negrosSum, totaisSum);
  document.getElementById('Numero_votos_mulheres').textContent            = fmtInteiro(mulheresSum);
  document.getElementById('Porcentagem_votos_mulheres').textContent       = pct(mulheresSum, totaisSum);
  document.getElementById('Numero_votos_nulos').textContent               = fmtInteiro(nulosSum);
  document.getElementById('Numero_votos_brancos').textContent             = fmtInteiro(brancosSum);
  document.getElementById('PartidoMaisVotado').textContent  = dadosCidade?.partido_mais_votado   || '—';
  document.getElementById('VotosNoPartido').textContent     = fmtVotosToggle(dadosCidade?.votos_partido_mais_votado   ?? null, validosSum);
  document.getElementById('VereadorMaisVotado').textContent = dadosCidade?.candidato_mais_votado || '—';
  document.getElementById('VotosNoCandidato').textContent   = fmtVotosToggle(dadosCidade?.votos_candidato_mais_votado ?? null, validosSum);
  document.getElementById('Numero_total_moradores').textContent           = fmtInteiro(moradores);
  document.getElementById('RendaPercapta').textContent                    = '—';
}

function gerarListaBairros() {
  const lista = document.getElementById('listaContainer');
  lista.innerHTML = '';

  const optTodos = document.createElement('option');
  optTodos.value = '';
  optTodos.textContent = 'Curitiba – todos os bairros';
  lista.appendChild(optTodos);

  const features = [...dadosGeoJson.features]
    .sort((a, b) => a.properties.nome_exib.localeCompare(b.properties.nome_exib, 'pt-BR'));

  features.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.properties.id;
    opt.textContent = f.properties.nome_exib;
    lista.appendChild(opt);
  });

  lista.value = selecao.modo === 'bairros' ? (selecao.id ?? '') : '';
}

const _PREPOSICOES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

function tituloCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map((w, i) =>
    i > 0 && _PREPOSICOES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

function gerarListaLocais() {
  const lista = document.getElementById('listaContainer');
  lista.innerHTML = '';

  const optTodos = document.createElement('option');
  optTodos.value = '';
  optTodos.textContent = 'Curitiba – todos os locais';
  lista.appendChild(optTodos);

  // Agrupa por ID_BAIRRO
  const porBairro = new Map();
  for (const row of dadosLocaisRaw) {
    const idBairro = +row.ID_BAIRRO;
    if (!porBairro.has(idBairro)) porBairro.set(idBairro, []);
    porBairro.get(idBairro).push(row);
  }

  // Ordena bairros alfabeticamente
  const bairrosOrdenados = [...porBairro.keys()].sort((a, b) => {
    const na = propGeoJson(a).nome_exib || '';
    const nb = propGeoJson(b).nome_exib || '';
    return na.localeCompare(nb, 'pt-BR');
  });

  for (const idBairro of bairrosOrdenados) {
    const geo = propGeoJson(idBairro);
    const group = document.createElement('optgroup');
    group.label = geo.nome_exib || String(idBairro);

    const locaisOrdenados = [...porBairro.get(idBairro)]
      .sort((a, b) => tituloCase(a.NM_LOCAL_VOTACAO).localeCompare(tituloCase(b.NM_LOCAL_VOTACAO), 'pt-BR'));

    for (const row of locaisOrdenados) {
      const opt = document.createElement('option');
      opt.value = `${row.NR_ZONA}-${row.NR_LOCAL_VOTACAO}`;
      let nome = tituloCase(row.NM_LOCAL_VOTACAO);
      if (+row.FL_TRANSITO === 1) nome += ' (voto em trânsito)';
      opt.textContent = nome;
      group.appendChild(opt);
    }
    lista.appendChild(group);
  }

  lista.value = selecao.id ?? '';
  lista.classList.toggle('select--todos', !selecao.id);
}

function atualizarPainelLocal(chave) {
  const row = dadosLocaisRaw.find(r => `${r.NR_ZONA}-${r.NR_LOCAL_VOTACAO}` === chave);
  if (!row) { atualizarPainelTodosBairros(); return; }

  const qtTotal   = +row.QT_VOTOS_TOTAL   || 0;
  const qtBrancos = +row.QT_VOTOS_BRANCOS || 0;
  const qtNulos   = +row.QT_VOTOS_NULOS   || 0;

  const _cand = {}, _leg = {};
  for (const [col, val] of Object.entries(row)) {
    if (col.startsWith('CAND_'))      _cand[col.slice(5)] = +val || 0;
    else if (col.startsWith('LEG_')) _leg[col.slice(4)]  = +val || 0;
  }

  const votos_validos = dadosCandNums.reduce((s, nr) => s + (_cand[nr] || 0), 0)
    + Object.values(_leg).reduce((s, v) => s + v, 0);

  let votos_negros = 0, votos_mulheres = 0;
  for (const nr of dadosCandNums) {
    const c = dadosCandMap.get(nr);
    if (!c) continue;
    const v = _cand[nr] || 0;
    if (c.NEGRO === '1')            votos_negros   += v;
    if (c.DS_GENERO === 'FEMININO') votos_mulheres += v;
  }

  const b = { _cand, _leg, qt_votos_total: qtTotal, votos_validos };
  _calcVencedores(b);

  const idBairro = +row.ID_BAIRRO;
  const geo = propGeoJson(idBairro);
  const pct = (n, d) => d > 0 && n != null ? fmtPorcentagem((n / d) * 100) : '—';

  document.getElementById('Porcentagem_votos_pessoas_negras').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Porcentagem_votos_mulheres').classList.toggle('hidden', !mostrarPorcentagem);
  document.getElementById('Numero_votos_pessoas_negras').classList.toggle('hidden', mostrarPorcentagem);
  document.getElementById('Numero_votos_mulheres').classList.toggle('hidden', mostrarPorcentagem);

  document.getElementById('Numero_total_votos').textContent               = fmtInteiro(qtTotal);
  document.getElementById('Numero_votos_validos').textContent             = fmtInteiro(votos_validos);
  document.getElementById('Numero_votos_pessoas_negras').textContent      = fmtInteiro(votos_negros);
  document.getElementById('Porcentagem_votos_pessoas_negras').textContent = pct(votos_negros, qtTotal);
  document.getElementById('Numero_votos_mulheres').textContent            = fmtInteiro(votos_mulheres);
  document.getElementById('Porcentagem_votos_mulheres').textContent       = pct(votos_mulheres, qtTotal);
  document.getElementById('Numero_votos_nulos').textContent               = fmtInteiro(qtNulos);
  document.getElementById('Numero_votos_brancos').textContent             = fmtInteiro(qtBrancos);
  document.getElementById('PartidoMaisVotado').textContent                = b.partido_mais_votado || '—';
  document.getElementById('VotosNoPartido').textContent                   = fmtVotosToggle(b.votos_partido_mais_votado, votos_validos);
  document.getElementById('VereadorMaisVotado').textContent               = b.candidato_mais_votado || '—';
  document.getElementById('VotosNoCandidato').textContent                 = fmtVotosToggle(b.votos_candidato_mais_votado, votos_validos);

  document.getElementById('Numero_total_moradores').textContent = fmtInteiro(geo.populacao);
  document.getElementById('RendaPercapta').textContent          = fmtDinheiro(geo.renda_media);

  const nomeBairro = geo.nome_exib ? ` – ${geo.nome_exib}` : '';
  const spanMoradores = document.getElementById('label-moradores-bairro');
  const spanRenda     = document.getElementById('label-renda-bairro');
  if (spanMoradores) spanMoradores.textContent = nomeBairro;
  if (spanRenda)     spanRenda.textContent     = nomeBairro;
}

function _limparLabelsBairro() {
  const spanMoradores = document.getElementById('label-moradores-bairro');
  const spanRenda     = document.getElementById('label-renda-bairro');
  if (spanMoradores) spanMoradores.textContent = '';
  if (spanRenda)     spanRenda.textContent     = '';
}

// --- Seletor de eleição ---

function estadoInicial() {
  const comDados = new Set(dadosEleicoes.filter(e => e.locais).map(e => e.ano));
  const ano = [...ANOS_SITE].reverse().find(a => comDados.has(a)) ?? null;
  if (!ano) return { ano: null, eleicaoId: null };
  const entrada = dadosEleicoes.find(e => e.ano === ano && e.padrao && e.locais)
               ?? dadosEleicoes.find(e => e.ano === ano && e.locais);
  return { ano, eleicaoId: entrada?.id ?? null };
}

function renderizarSeletor() {
  const comDados = new Set(dadosEleicoes.filter(e => e.locais).map(e => e.ano));

  const containerAnos = document.getElementById('seletorAnos');
  containerAnos.innerHTML = '';
  ANOS_SITE.forEach(ano => {
    const btn = document.createElement('button');
    btn.className = 'btn-seletor';
    btn.textContent = ano;
    btn.dataset.ano = ano;
    btn.setAttribute('aria-pressed', String(seletorState.ano === ano));
    if (!comDados.has(ano)) {
      btn.disabled = true;
      btn.title = 'Dados em breve';
    }
    containerAnos.appendChild(btn);
  });

  const containerCargos = document.getElementById('seletorCargos');
  containerCargos.innerHTML = '';
  dadosEleicoes
    .filter(e => e.ano === seletorState.ano)
    .forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'btn-seletor';
      btn.textContent = e.rotulo || e.rotulo_cargo;
      btn.dataset.eleicaoId = e.id;
      btn.setAttribute('aria-pressed', String(seletorState.eleicaoId === e.id));
      if (!e.locais) {
        btn.disabled = true;
        btn.title = 'Dados em breve';
      }
      containerCargos.appendChild(btn);
    });
}

function setBotoesDesabilitados(disabled) {
  document.querySelectorAll('#seletorEleicao .btn-seletor:not([title="Dados em breve"])').forEach(btn => {
    btn.disabled = disabled;
  });
}

async function trocarEleicao() {
  const eleicao = dadosEleicoes.find(e => e.id === seletorState.eleicaoId);
  if (!eleicao || !eleicao.locais || eleicao.id === eleicaoAtualId) return;

  carregandoEleicao = true;
  setBotoesDesabilitados(true);

  await carregarEleicao(eleicao);
  eleicaoAtualId = eleicao.id;

  recolorirTodosBairros();
  atualizarTituloMapa(visualizacaoSelecionada);
  desenharLocais(dadosLocais);
  mostrarLocais(document.getElementById('exibirLocais')?.checked ?? false);

  if (selecao.modo === 'locais') {
    if (selecao.id !== null) {
      const [zona, numLocal] = selecao.id.split('-');
      const match = dadosLocaisRaw.find(r =>
        r.NR_ZONA === zona && r.NR_LOCAL_VOTACAO === numLocal && r.NM_LOCAL_VOTACAO === selecao.nm
      );
      if (!match) {
        selecao = { modo: 'locais', id: null, nm: null };
        destacarLocalSelecionado(-1);
        selecionarBairro(null);
      }
    }
    gerarListaLocais();
    if (selecao.id === null) {
      document.getElementById('listaContainer').value = '';
      document.getElementById('listaContainer').classList.add('select--todos');
      atualizarPainelTodosBairros();
    } else {
      selecionarLocal(selecao.id);
    }
  } else {
    if (selecao.id === null) atualizarPainelTodosBairros();
    else atualizarPainelInformacoes(selecao.id);
  }

  carregandoEleicao = false;
  setBotoesDesabilitados(false);
}

function configurarSeletorEleicao() {
  document.getElementById('seletorAnos').addEventListener('click', async e => {
    const btn = e.target.closest('.btn-seletor');
    if (!btn || btn.disabled || carregandoEleicao) return;
    const novoAno = +btn.dataset.ano;
    if (seletorState.ano === novoAno) return;

    const eleicaoAnterior = dadosEleicoes.find(e => e.id === seletorState.eleicaoId);
    const entradas = dadosEleicoes.filter(e => e.ano === novoAno && e.locais);

    const novaEntrada = !eleicaoAnterior || !entradas.length
      ? (entradas[0] ?? null)
      : (entradas.find(e => e.cargo === eleicaoAnterior.cargo && e.turno === eleicaoAnterior.turno)
          ?? entradas.find(e => e.cargo === eleicaoAnterior.cargo)
          ?? entradas[0]);

    seletorState = { ano: novoAno, eleicaoId: novaEntrada?.id ?? null };
    renderizarSeletor();
    await trocarEleicao();
  });

  document.getElementById('seletorCargos').addEventListener('click', async e => {
    const btn = e.target.closest('.btn-seletor');
    if (!btn || btn.disabled || carregandoEleicao) return;
    const novoId = btn.dataset.eleicaoId;
    if (seletorState.eleicaoId === novoId) return;

    seletorState = { ...seletorState, eleicaoId: novoId };
    renderizarSeletor();
    await trocarEleicao();
  });
}

// --- Coloração categórica ---

function corPartido(sigla) {
  if (!sigla) return '#aaaaaa';
  if (dadosCoresPartidos[sigla]) return dadosCoresPartidos[sigla];
  if (!_paletaFallback.has(sigla)) {
    console.warn(`cores_partidos.json: falta cor para "${sigla}"`);
    _paletaFallback.set(sigla, d3.schemeTableau10[_paletaFallback.size % d3.schemeTableau10.length]);
  }
  return _paletaFallback.get(sigla);
}

function variarCor(corBase, index) {
  if (index === 0) return corBase;
  const c = d3.color(corBase);
  if (!c) return corBase;
  return c.darker(index * 0.4).formatHex();
}

// Retorna { mapaCores: Map<idBairro, cor>, contadorPartido: Map<sigla, count> }
function construirMapaCoresPartidos() {
  const contadorPartido = new Map();
  for (const b of dadosBairros.values()) {
    if (!b.empate_partido && b.partido_mais_votado && b.partido_mais_votado !== '—') {
      const sg = b.partido_mais_votado;
      contadorPartido.set(sg, (contadorPartido.get(sg) || 0) + 1);
    }
  }

  const mapaCores = new Map();
  for (const [id, b] of dadosBairros) {
    if (b.empate_partido) {
      mapaCores.set(id, 'url(#hachura)');
    } else if (b.partido_mais_votado && b.partido_mais_votado !== '—') {
      mapaCores.set(id, corPartido(b.partido_mais_votado));
    }
    // sem dado → não entra no map → colorirTodosCategorico usa #cccccc
  }
  return { mapaCores, contadorPartido };
}

// Retorna { mapaCores, contadorCand: Map<"NM|SG", {nm,sg,count}>, corPorCand: Map<"NM|SG", cor> }
function construirMapaCoresCandidatos() {
  // Conta bairros por candidato
  const contadorCand = new Map();
  for (const b of dadosBairros.values()) {
    if (!b.empate_candidato && b.nm_candidato_mais_votado) {
      const key = `${b.nm_candidato_mais_votado}|${b.sg_partido_candidato_mais_votado}`;
      if (!contadorCand.has(key)) {
        contadorCand.set(key, {
          nm: b.nm_candidato_mais_votado,
          sg: b.sg_partido_candidato_mais_votado,
          count: 0,
        });
      }
      contadorCand.get(key).count++;
    }
  }

  // Agrupa por partido e atribui variações de cor
  const porPartido = new Map();
  for (const v of contadorCand.values()) {
    if (!porPartido.has(v.sg)) porPartido.set(v.sg, []);
    porPartido.get(v.sg).push(v);
  }

  const corPorCand = new Map();
  for (const [sg, cands] of porPartido) {
    cands.sort((a, b) => b.count - a.count); // mais bairros primeiro → cor original
    const base = corPartido(sg);
    cands.forEach((c, i) => {
      corPorCand.set(`${c.nm}|${c.sg}`, variarCor(base, i));
    });
  }

  const mapaCores = new Map();
  for (const [id, b] of dadosBairros) {
    if (b.empate_candidato) {
      mapaCores.set(id, 'url(#hachura)');
    } else if (b.nm_candidato_mais_votado) {
      const key = `${b.nm_candidato_mais_votado}|${b.sg_partido_candidato_mais_votado}`;
      mapaCores.set(id, corPorCand.get(key) || '#aaaaaa');
    }
  }
  return { mapaCores, contadorCand, corPorCand };
}

// --- Legenda categórica ---

function renderizarLegenda(itens) {
  const el = document.getElementById('legendaMapa');
  if (!el) return;

  const vis   = itens.slice(0, 8);
  const resto = itens.slice(8);

  const html = vis.map(item => {
    const corStyle = item.cor === 'url(#hachura)'
      ? 'class="legenda-cor legenda-cor--hachura"'
      : `class="legenda-cor" style="background:${item.cor}"`;
    return `<span class="legenda-item"><span ${corStyle}></span>${item.nome} (${fmtInteiro(item.count)})</span>`;
  }).join('');

  const outrosHtml = resto.length > 0
    ? (() => {
        const n = resto.reduce((s, i) => s + i.count, 0);
        return `<span class="legenda-item"><span class="legenda-cor" style="background:#999"></span>Outros (${fmtInteiro(n)})</span>`;
      })()
    : '';

  el.innerHTML = html + outrosHtml;
}

function limparLegenda() {
  const el = document.getElementById('legendaMapa');
  if (el) el.innerHTML = '';
}

function renderizarLegendaDegrade(campo, tabela, info) {
  const el = document.getElementById('legendaMapa');
  if (!el) return;

  const campoInfo = info[campo];
  if (!campoInfo) { el.innerHTML = ''; return; }

  const { min, max, idMin, idMax } = campoInfo;

  // Gradiente com 5 paradas usando a mesma fórmula de getCorBairro
  const paradas = [0, 0.25, 0.5, 0.75, 1].map(n => corParaNorm(n)).join(', ');

  // Marcador do bairro selecionado (sempre no DOM, oculto quando sem seleção)
  let marcadorStyle = 'display:none';
  if (selecao.modo === 'bairros' && selecao.id !== null) {
    const row = tabela.find(r => r.id === selecao.id);
    if (row) marcadorStyle = `left:${row[campo] ?? 0}%`;
  }

  // Bairros sem dado (presentes no GeoJSON mas sem local de votação)
  const camposEleitorais = [
    'Numero_total_votos', 'Numero_votos_validos',
    'Numero_votos_pessoas_negras', 'Porcentagem_votos_pessoas_negras',
    'Numero_votos_mulheres', 'Porcentagem_votos_mulheres',
    'Numero_votos_nulos', 'Numero_votos_brancos',
  ];
  const hasSemDado = dadosGeoJson.features.some(f => !dadosBairros.has(f.properties.id));
  const semDadoHtml = hasSemDado
    ? `<div class="legenda-item" style="margin-top:2px">
         <span class="legenda-cor" style="background:#aaaaaa"></span>
         ${camposEleitorais.includes(campo) ? 'Sem local de votação' : 'Sem dado'}
       </div>`
    : '';

  el.innerHTML = `
    <div class="legenda-degrade">
      <div class="legenda-degrade-barra-wrap">
        <div class="legenda-degrade-barra" style="background:linear-gradient(to right,${paradas})"></div>
        <div class="legenda-marcador" style="${marcadorStyle}"></div>
      </div>
      <div class="legenda-degrade-labels">
        <div class="legenda-degrade-label">
          <span>${formatarValorLegenda(min, campo)}</span>
          <span class="legenda-degrade-nome">${propGeoJson(idMin).nome_exib || ''}</span>
        </div>
        <div class="legenda-degrade-label legenda-degrade-label--right">
          <span>${formatarValorLegenda(max, campo)}</span>
          <span class="legenda-degrade-nome">${propGeoJson(idMax).nome_exib || ''}</span>
        </div>
      </div>
      ${semDadoHtml}
    </div>`;
}

function atualizarMarcadorLegenda() {
  const marcador = document.querySelector('#legendaMapa .legenda-marcador');
  if (!marcador) return; // modo categórico — sem legenda degradê

  if (selecao.modo !== 'bairros' || selecao.id === null || !_ultimaTabelaInfo) {
    marcador.style.display = 'none';
    return;
  }

  const row = _ultimaTabelaInfo.tabela.find(r => r.id === selecao.id);
  if (!row) { marcador.style.display = 'none'; return; }

  marcador.style.left = `${row[visualizacaoSelecionada] ?? 0}%`;
  marcador.style.removeProperty('display');
}

// --- Coloração do mapa (gradient + categórico) ---

function recolorirTodosBairros() {
  if (visualizacaoSelecionada === 'PartidoMaisVotado') {
    _ultimaTabelaInfo = null;
    const { mapaCores, contadorPartido } = construirMapaCoresPartidos();
    colorirTodosCategorico(mapaCores);

    const nEmpate = [...dadosBairros.values()].filter(b => b.empate_partido).length;
    const itens = [...contadorPartido.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sg, count]) => ({ cor: corPartido(sg), nome: sg, count }));
    if (nEmpate > 0) itens.push({ cor: 'url(#hachura)', nome: 'Empate', count: nEmpate });
    renderizarLegenda(itens);

  } else if (visualizacaoSelecionada === 'VereadorMaisVotado') {
    _ultimaTabelaInfo = null;
    const { mapaCores, contadorCand, corPorCand } = construirMapaCoresCandidatos();
    colorirTodosCategorico(mapaCores);

    const nEmpate = [...dadosBairros.values()].filter(b => b.empate_candidato).length;
    const itens = [...contadorCand.values()]
      .sort((a, b) => b.count - a.count)
      .map(c => ({
        cor:   corPorCand.get(`${c.nm}|${c.sg}`) || '#999',
        nome:  `${c.nm} (${c.sg})`,
        count: c.count,
      }));
    if (nEmpate > 0) itens.push({ cor: 'url(#hachura)', nome: 'Empate', count: nEmpate });
    renderizarLegenda(itens);

  } else {
    const { tabela, info } = criarTabelaNormalizada();
    _ultimaTabelaInfo = { tabela, info };
    colorirTodos(tabela, visualizacaoSelecionada);
    renderizarLegendaDegrade(visualizacaoSelecionada, tabela, info);
  }
}

// --- Configuração dos cliques nos cards ---

function configurarClickCamposEleitorais() {
  document.querySelectorAll('.divinformacoes').forEach(div => {
    const campo = div.getAttribute('data-visualization');
    if (!campo) return;

    if (camposVisualizaveis.includes(campo)) {
      div.addEventListener('click', () => {
        const campoCorreto = obterVisualizacaoCorreta(campo);
        visualizacaoSelecionada = campoCorreto;
        atualizarTituloMapa(campoCorreto);
        atualizarDestaque();
        atualizarToggle();
        recolorirTodosBairros();
      });
    } else if (camposCategoricos.includes(campo)) {
      div.addEventListener('click', () => {
        visualizacaoSelecionada = campo;
        atualizarTituloMapa(campo);
        atualizarDestaque();
        atualizarToggle();
        recolorirTodosBairros();
      });
    }
  });
  atualizarDestaque();
}

// ---

function atualizarBairroSelecionado(idBairro) {
  selecao = { modo: 'bairros', id: idBairro, nm: null };
  const lista = document.getElementById('listaContainer');
  lista.value = idBairro;
  lista.classList.remove('select--todos');
  selecionarBairro(idBairro);
  atualizarPainelInformacoes(idBairro);
  atualizarMarcadorLegenda();
}

function selecionarTodosBairros() {
  selecao = { modo: 'bairros', id: null, nm: null };
  const lista = document.getElementById('listaContainer');
  lista.value = '';
  lista.classList.add('select--todos');
  selecionarBairro(null);
  atualizarPainelTodosBairros();
  atualizarTituloMapa(visualizacaoSelecionada);
  atualizarMarcadorLegenda();
}

function selecionarLocal(chave) {
  const row = dadosLocaisRaw.find(r => `${r.NR_ZONA}-${r.NR_LOCAL_VOTACAO}` === chave);
  if (!row) { selecionarTodosLocais(); return; }

  const lat = parseFloat(row.NR_LATITUDE);
  const lng = parseFloat(row.NR_LONGITUDE);
  const dotIdx = dadosLocais.findIndex(p => p.lat === lat && p.lng === lng);

  selecao = { modo: 'locais', id: chave, nm: row.NM_LOCAL_VOTACAO };
  const lista = document.getElementById('listaContainer');
  lista.value = chave;
  lista.classList.remove('select--todos');
  destacarLocalSelecionado(dotIdx >= 0 ? dotIdx : -1);
  selecionarBairro(+row.ID_BAIRRO);
  atualizarPainelLocal(chave);
  atualizarMarcadorLegenda();
}

function selecionarTodosLocais() {
  selecao = { modo: 'locais', id: null, nm: null };
  const lista = document.getElementById('listaContainer');
  lista.value = '';
  lista.classList.add('select--todos');
  destacarLocalSelecionado(-1);
  selecionarBairro(null);
  _limparLabelsBairro();
  atualizarPainelTodosBairros();
  atualizarMarcadorLegenda();
}

function configurarToggleLocais() {
  const checkbox = document.getElementById('exibirLocais');
  if (!checkbox) return;
  mostrarLocais(checkbox.checked); // aplica estado inicial (começa desmarcado)
  checkbox.addEventListener('change', e => {
    const ligado = e.target.checked;
    mostrarLocais(ligado);
    if (ligado) {
      // Entra no modo locais: dropdown mostra locais, "todos" selecionado
      selecao = { modo: 'locais', id: null, nm: null };
      destacarLocalSelecionado(-1);
      selecionarBairro(null);
      gerarListaLocais();
      atualizarPainelTodosBairros();
    } else {
      // Sai do modo locais: seleciona o bairro do local (se havia) ou todos
      let idBairro = null;
      if (selecao.id !== null) {
        const r = dadosLocaisRaw.find(row => `${row.NR_ZONA}-${row.NR_LOCAL_VOTACAO}` === selecao.id);
        if (r) idBairro = +r.ID_BAIRRO;
      }
      destacarLocalSelecionado(-1);
      _limparLabelsBairro();
      selecao = { modo: 'bairros', id: idBairro, nm: null };
      gerarListaBairros();
      if (idBairro !== null) atualizarBairroSelecionado(idBairro);
      else selecionarTodosBairros();
    }
  });
}

function configurarToggle() {
  const checkbox = document.getElementById('permitirSaltos');
  if (!checkbox) return;
  checkbox.checked = true;
  checkbox.addEventListener('change', e => {
    mostrarPorcentagem = e.target.checked;
    if (['Numero_votos_pessoas_negras', 'Porcentagem_votos_pessoas_negras'].includes(visualizacaoSelecionada)) {
      visualizacaoSelecionada = mostrarPorcentagem
        ? 'Porcentagem_votos_pessoas_negras'
        : 'Numero_votos_pessoas_negras';
    } else if (['Numero_votos_mulheres', 'Porcentagem_votos_mulheres'].includes(visualizacaoSelecionada)) {
      visualizacaoSelecionada = mostrarPorcentagem
        ? 'Porcentagem_votos_mulheres'
        : 'Numero_votos_mulheres';
    }
    atualizarDestaque();
    if (selecao.modo === 'locais') {
      if (selecao.id === null) atualizarPainelTodosBairros();
      else atualizarPainelLocal(selecao.id);
    } else {
      if (selecao.id === null) atualizarPainelTodosBairros();
      else atualizarPainelInformacoes(selecao.id);
    }
    recolorirTodosBairros();
  });
}

// Callbacks do mapa D3
function onHover(props, event, isMove) {
  const textoMouse = document.getElementById('textoMouse');
  const followArea = document.getElementById('followArea');
  if (!props) {
    textoMouse.style.display = 'none';
    setLocalHover(-1);
    return;
  }

  let texto    = props.nome_exib;
  let localIdx = -1;
  const locaisAtivos = document.getElementById('exibirLocais')?.checked;
  if (locaisAtivos && event) {
    const achado = localProximoSVG(event.clientX, event.clientY);
    if (achado) {
      texto    = achado.ponto.nomes.join('\n') || props.nome_exib;
      localIdx = achado.idx;
    }
  }
  setLocalHover(localIdx);

  textoMouse.textContent   = texto;
  textoMouse.style.display = 'block';

  if (isMove) {
    const areaRect = followArea.getBoundingClientRect();
    const ttRect   = textoMouse.getBoundingClientRect();
    const OFFSET   = 10;
    let left = event.clientX - areaRect.left + OFFSET;
    let top  = event.clientY - areaRect.top  + OFFSET;
    if (event.clientX + OFFSET + ttRect.width  > window.innerWidth)
      left = event.clientX - areaRect.left - ttRect.width  - OFFSET;
    if (event.clientY + OFFSET + ttRect.height > window.innerHeight)
      top  = event.clientY - areaRect.top  - ttRect.height - OFFSET;
    textoMouse.style.left = `${Math.max(0, left)}px`;
    textoMouse.style.top  = `${Math.max(0, top)}px`;
  }
}

function onClick(idBairro, event) {
  if (selecao.modo === 'locais') {
    if (!event) return;
    const achado = localProximoSVG(event.clientX, event.clientY);
    if (!achado) return; // clique longe dos pontos → nada
    const rawRows = achado.ponto.rawRows || [];
    const escolhido = rawRows.find(r => +r.FL_TRANSITO === 0) || rawRows[0];
    if (!escolhido) return;
    selecionarLocal(`${escolhido.NR_ZONA}-${escolhido.NR_LOCAL_VOTACAO}`);
    return;
  }

  atualizarBairroSelecionado(idBairro);
  // Celular (hover: none): mostra tooltip do local por 2 s junto ao toque
  if (!event || !window.matchMedia('(hover: none)').matches) return;
  const locaisAtivos = document.getElementById('exibirLocais')?.checked;
  if (!locaisAtivos) return;
  const achado = localProximoSVG(event.clientX, event.clientY);
  if (!achado || !achado.ponto.nomes.length) return;
  const textoMouse = document.getElementById('textoMouse');
  const followArea = document.getElementById('followArea');
  textoMouse.textContent = achado.ponto.nomes.join('\n');
  textoMouse.classList.add('tooltip-touch');
  textoMouse.style.display = 'block';
  const areaRect = followArea.getBoundingClientRect();
  const ttRect   = textoMouse.getBoundingClientRect();
  const OFFSET   = 10;
  let left = event.clientX - areaRect.left + OFFSET;
  let top  = event.clientY - areaRect.top  + OFFSET;
  if (event.clientX + OFFSET + ttRect.width  > window.innerWidth)
    left = event.clientX - areaRect.left - ttRect.width  - OFFSET;
  if (event.clientY + OFFSET + ttRect.height > window.innerHeight)
    top  = event.clientY - areaRect.top  - ttRect.height - OFFSET;
  textoMouse.style.left = `${Math.max(0, left)}px`;
  textoMouse.style.top  = `${Math.max(0, top)}px`;
  setTimeout(() => {
    textoMouse.classList.remove('tooltip-touch');
    textoMouse.style.display = 'none';
  }, 2000);
}

// Ponto de entrada — chamado em index.html após a injeção dos componentes
async function init() {
  await carregarTudo();

  seletorState = estadoInicial();
  const eleicaoInicial = dadosEleicoes.find(e => e.id === seletorState.eleicaoId);
  await carregarEleicao(eleicaoInicial);
  eleicaoAtualId = eleicaoInicial.id;

  inicializarMapa(
    document.getElementById('Svg_Container'),
    dadosGeoJson,
    { onHover, onClick }
  );
  desenharLocais(dadosLocais);

  gerarListaBairros();
  renderizarSeletor();
  configurarSeletorEleicao();
  configurarClickCamposEleitorais();
  configurarToggle();
  configurarToggleLocais();

  document.getElementById('listaContainer').addEventListener('change', e => {
    const val = e.target.value;
    if (selecao.modo === 'locais') {
      if (val === '') selecionarTodosLocais();
      else selecionarLocal(val);
    } else {
      if (val === '') selecionarTodosBairros();
      else atualizarBairroSelecionado(+val);
    }
  });

  setTimeout(() => {
    selecionarTodosBairros();
    const divTotal = document.querySelector('[data-visualization="Numero_total_votos"]');
    if (divTotal) divTotal.click();
  }, 0);
}
