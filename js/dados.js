const _dadosBase = (() => {
  const src = document.currentScript?.src;
  return src ? new URL('..', src).href.replace(/\/$/, '') : '.';
})();

let dadosGeoJson       = null;
let dadosEleicoes      = [];
let dadosBairros       = new Map(); // id_ippuc (número) → objeto agregado
let dadosEleicaoAtual  = null;
let dadosCoresPartidos = {};
let dadosCidade        = null;    // vencedores para toda Curitiba

async function carregarTudo() {
  const [geo, eleicoes, coresPartidos] = await Promise.all([
    fetch(`${_dadosBase}/dados/Mapa_Curitiba.json`).then(r => r.json()),
    fetch(`${_dadosBase}/dados/eleicoes.json`).then(r => r.json()),
    fetch(`${_dadosBase}/dados/cores_partidos.json`).then(r => r.json()),
  ]);
  dadosGeoJson       = geo;
  dadosEleicoes      = eleicoes;
  dadosCoresPartidos = coresPartidos;
  return eleicoes[0];
}

async function carregarEleicao(eleicao) {
  const [locais, todosOsCands] = await Promise.all([
    d3.csv(`${_dadosBase}/${eleicao.locais}`),
    d3.csv(`${_dadosBase}/${eleicao.candidatos}`),
  ]);

  // Filtra candidatos para este cargo e turno
  const cands = todosOsCands.filter(
    c => c.DS_CARGO === eleicao.cargo && c.NR_TURNO === eleicao.turno
  );

  // Lookups para cruzamento rápido
  const candMap = new Map(cands.map(c => [c.NR_CANDIDATO, c]));
  // NR_PARTIDO → SG_PARTIDO (para vincular votos de legenda)
  const legMap = new Map(cands.map(c => [c.NR_PARTIDO, c.SG_PARTIDO]));

  // Descobre colunas CAND_* e LEG_* dinamicamente
  const row0 = locais[0] || {};
  const candCols = Object.keys(row0).filter(c => c.startsWith('CAND_'));
  const legCols  = Object.keys(row0).filter(c => c.startsWith('LEG_'));
  const candNums = candCols.map(c => c.slice(5)); // 'CAND_13' → '13'

  // Calcula candidato e partido vencedores num objeto { _cand, _leg }.
  // Fecha sobre candNums, candMap e legMap — chamada para cada bairro e para a cidade.
  function _calcVencedores(b) {
    // Candidato mais votado
    let maxV = -1, maxNr = null;
    for (const nr of candNums) {
      const v = b._cand[nr] || 0;
      if (v > maxV) { maxV = v; maxNr = nr; }
    }
    const tiedCands = maxV > 0 ? candNums.filter(nr => (b._cand[nr] || 0) === maxV) : [];
    b.empate_candidato = tiedCands.length > 1;

    if (!b.empate_candidato && maxNr && candMap.has(maxNr)) {
      const c = candMap.get(maxNr);
      b.candidato_mais_votado            = `${c.NM_URNA_CANDIDATO} (${c.SG_PARTIDO})`;
      b.nm_candidato_mais_votado         = c.NM_URNA_CANDIDATO;
      b.sg_partido_candidato_mais_votado = c.SG_PARTIDO;
    } else if (b.empate_candidato) {
      b.candidato_mais_votado            = 'Empate';
      b.nm_candidato_mais_votado         = null;
      b.sg_partido_candidato_mais_votado = null;
    } else {
      b.candidato_mais_votado            = '—';
      b.nm_candidato_mais_votado         = null;
      b.sg_partido_candidato_mais_votado = null;
    }

    // Partido mais votado (votos nominais por partido + votos de legenda)
    const vpp = {};
    for (const nr of candNums) {
      const c = candMap.get(nr);
      if (!c) continue;
      vpp[c.SG_PARTIDO] = (vpp[c.SG_PARTIDO] || 0) + (b._cand[nr] || 0);
    }
    for (const [nrPartido, votos] of Object.entries(b._leg)) {
      const sg = legMap.get(nrPartido);
      if (sg) vpp[sg] = (vpp[sg] || 0) + votos;
    }
    let maxPV = -1, maxP = null;
    for (const [p, v] of Object.entries(vpp)) {
      if (v > maxPV) { maxPV = v; maxP = p; }
    }
    const tiedPartidos = maxPV > 0 ? Object.keys(vpp).filter(p => vpp[p] === maxPV) : [];
    b.empate_partido      = tiedPartidos.length > 1;
    b.partido_mais_votado = b.empate_partido ? 'Empate' : (maxP || '—');

    b.votos_candidato_mais_votado = b.empate_candidato || maxV  <= 0 ? null : maxV;
    b.votos_partido_mais_votado   = b.empate_partido   || maxPV <= 0 ? null : maxPV;
  }

  dadosBairros = new Map();

  // Agrega por bairro
  for (const row of locais) {
    const idBairro = +row.ID_BAIRRO;
    if (!dadosBairros.has(idBairro)) {
      dadosBairros.set(idBairro, {
        qt_votos_total:   0,
        qt_votos_brancos: 0,
        qt_votos_nulos:   0,
        qt_eleitores:     0,
        _cand: {},
        _leg:  {},
      });
    }
    const b = dadosBairros.get(idBairro);
    b.qt_votos_total   += +row.QT_VOTOS_TOTAL   || 0;
    b.qt_votos_brancos += +row.QT_VOTOS_BRANCOS || 0;
    b.qt_votos_nulos   += +row.QT_VOTOS_NULOS   || 0;
    if (+row.FL_TRANSITO === 0) b.qt_eleitores += +row.QT_ELEITORES || 0;

    for (const col of candCols) {
      const nr = col.slice(5);
      b._cand[nr] = (b._cand[nr] || 0) + (+row[col] || 0);
    }
    for (const col of legCols) {
      const nr = col.slice(4);
      b._leg[nr] = (b._leg[nr] || 0) + (+row[col] || 0);
    }
  }

  // Pós-processamento por bairro
  for (const [, b] of dadosBairros) {
    // Votos válidos = nominais + legenda
    b.votos_validos =
      candNums.reduce((s, nr) => s + (b._cand[nr] || 0), 0) +
      Object.values(b._leg).reduce((s, v) => s + v, 0);

    // Votos em pessoas negras e em mulheres
    b.votos_negros   = 0;
    b.votos_mulheres = 0;
    for (const nr of candNums) {
      const c = candMap.get(nr);
      if (!c) continue;
      const v = b._cand[nr] || 0;
      if (c.NEGRO === '1')            b.votos_negros   += v;
      if (c.DS_GENERO === 'FEMININO') b.votos_mulheres += v;
    }

    _calcVencedores(b);
  }

  // Agrega _cand e _leg de toda a cidade (inclui FL_TRANSITO = 1, já presente nos bairros)
  // e calcula os vencedores usando a mesma função
  const cidade = { _cand: {}, _leg: {} };
  for (const b of dadosBairros.values()) {
    for (const [nr, v] of Object.entries(b._cand)) {
      cidade._cand[nr] = (cidade._cand[nr] || 0) + v;
    }
    for (const [nr, v] of Object.entries(b._leg)) {
      cidade._leg[nr] = (cidade._leg[nr] || 0) + v;
    }
  }
  _calcVencedores(cidade);
  dadosCidade = cidade;

  dadosEleicaoAtual = eleicao;
}
