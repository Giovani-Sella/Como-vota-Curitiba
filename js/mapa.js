let _svgEl      = null;
let _projection = null;
let _viewBoxW   = null;
let _viewBoxH   = null;
let _gLocais    = null;
let _pontos     = null;
let _pontosSVG  = null;
let _delaunay   = null;
let _hoveredIdx      = -1;
let _selectedLocalIdx = -1;

function inicializarMapa(containerEl, geoJson, callbacks) {
  d3.select(containerEl).selectAll('*').remove();

  const rect = containerEl.getBoundingClientRect();
  const w = rect.width  || 500;
  const h = rect.height || 400;

  const svg = d3.select(containerEl)
    .append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('width', '100%')
    .attr('height', '100%');

  // Padrão de hachura para bairros empatados
  svg.append('defs')
    .append('pattern')
    .attr('id', 'hachura')
    .attr('width', 4).attr('height', 4)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)')
    .append('line')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', 0).attr('y2', 4)
    .attr('stroke', '#999').attr('stroke-width', 1.5);

  // RFC 7946 usa anel externo anti-horário; D3 espera sentido horário.
  // Se d3.geoArea retorna > 2π, o anel está invertido — corrigir in-place.
  geoJson.features.forEach(feature => {
    if (d3.geoArea(feature) > 2 * Math.PI) {
      const rings = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
      rings.forEach(polygon => polygon.forEach(ring => ring.reverse()));
    }
  });

  const projection = d3.geoMercator().fitSize([w, h], geoJson);
  const pathGen = d3.geoPath().projection(projection);

  svg.append('g')
    .selectAll('path')
    .data(geoJson.features)
    .join('path')
    .attr('d', pathGen)
    .attr('data-id', d => d.properties.id)
    .on('mouseover', (ev, d) => callbacks.onHover(d.properties, ev, false))
    .on('mouseout',  ()       => callbacks.onHover(null, null, false))
    .on('mousemove', (ev, d) => callbacks.onHover(d.properties, ev, true))
    .on('click',     (ev, d) => callbacks.onClick(d.properties.id, ev));

  _svgEl      = svg.node();
  _projection = projection;
  _viewBoxW   = w;
  _viewBoxH   = h;
  _gLocais    = svg.append('g').attr('id', 'g-locais');
  window.removeEventListener('resize', _atualizarRaio);
  window.addEventListener('resize', _atualizarRaio);
}

function colorirBairro(idBairro, cor) {
  const el = document.querySelector(`#Svg_Container [data-id="${idBairro}"]`);
  if (el) el.style.fill = cor;
}

function colorirTodos(tabelaNormalizada, campo) {
  tabelaNormalizada.forEach(row => {
    const cor = getCorBairro(row.id, campo, tabelaNormalizada);
    colorirBairro(row.id, cor);
  });
}

// Colore todos os paths do SVG a partir de um Map<idBairro, cor>.
// Paths sem entrada no map recebem a cor padrão "sem dado".
function colorirTodosCategorico(mapaCores) {
  document.querySelectorAll('#Svg_Container [data-id]').forEach(el => {
    const id = +el.getAttribute('data-id');
    el.style.fill = mapaCores.get(id) || '#aaaaaa';
  });
}

function selecionarBairro(idBairro) {
  document.querySelectorAll('#Svg_Container path.selected')
    .forEach(el => el.classList.remove('selected'));
  if (idBairro === null) return;
  const el = document.querySelector(`#Svg_Container [data-id="${idBairro}"]`);
  if (el) {
    el.classList.add('selected');
    el.parentElement.appendChild(el); // traz para frente (z-order dentro do grupo de bairros)
  }
}

// ---- Locais de votação ----

function _calcRaio() {
  if (!_svgEl || !_viewBoxW || !_viewBoxH) return 3;
  const rect  = _svgEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 3;
  // preserveAspectRatio:meet → scale = min das duas razões
  const scale = Math.min(rect.width / _viewBoxW, rect.height / _viewBoxH);
  return scale > 0 ? 3 / scale : 3;
}

function _atualizarRaio() {
  if (!_gLocais) return;
  const r = _calcRaio();
  _gLocais.selectAll('circle').each(function(d, i) {
    const c = d3.select(this);
    if (i === _hoveredIdx) {
      c.attr('r', r * 5 / 3).attr('stroke-width', 2);
    } else if (i === _selectedLocalIdx) {
      c.attr('r', r * 4 / 3).attr('stroke-width', 2);
    } else {
      c.attr('r', r).attr('stroke-width', 0.75);
    }
  });
}

function desenharLocais(pontos) {
  if (!_gLocais || !_projection) return;
  _gLocais.selectAll('circle').remove();
  _hoveredIdx       = -1;
  _selectedLocalIdx = -1;
  _pontos     = pontos && pontos.length ? pontos : null;
  if (!_pontos) { _pontosSVG = null; _delaunay = null; return; }

  _pontosSVG = _pontos.map(d => {
    const p = _projection([d.lng, d.lat]);
    return p ?? [-9999, -9999];
  });
  _delaunay = d3.Delaunay.from(_pontosSVG);

  const r = _calcRaio();
  _gLocais.selectAll('circle')
    .data(_pontos)
    .join('circle')
    .attr('cx', (d, i) => _pontosSVG[i][0])
    .attr('cy', (d, i) => _pontosSVG[i][1])
    .attr('r', r)
    .attr('fill', '#000')
    .attr('stroke', 'rgba(255,255,255,0.8)')
    .attr('stroke-width', 0.75)
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('pointer-events', 'none');
}

function mostrarLocais(visivel) {
  if (_gLocais) _gLocais.style('display', visivel ? null : 'none');
}

function localProximoSVG(clientX, clientY) {
  if (!_delaunay || !_svgEl || !_pontos) return null;
  const ctm = _svgEl.getScreenCTM();
  if (!ctm) return null;
  const pt = _svgEl.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const sp = pt.matrixTransform(ctm.inverse());
  const idx = _delaunay.find(sp.x, sp.y);
  const [px, py] = _pontosSVG[idx];
  const dx = sp.x - px, dy = sp.y - py;
  const limiar = _calcRaio() / 3 * 10; // 10 px de tela em unidades SVG
  return Math.sqrt(dx * dx + dy * dy) <= limiar ? { idx, ponto: _pontos[idx] } : null;
}

function setLocalHover(idx) {
  if (!_gLocais) return;
  const circles = _gLocais.selectAll('circle');
  if (_hoveredIdx >= 0 && _hoveredIdx !== idx) {
    const r = _calcRaio();
    const prev = circles.filter((d, i) => i === _hoveredIdx);
    if (_hoveredIdx === _selectedLocalIdx) {
      prev.attr('r', r * 4 / 3).attr('stroke', '#fff').attr('stroke-width', 2).attr('fill', '#2563eb');
    } else {
      prev.attr('r', r).attr('stroke', 'rgba(255,255,255,0.8)').attr('stroke-width', 0.75);
    }
  }
  _hoveredIdx = idx;
  if (idx >= 0) {
    circles.filter((d, i) => i === idx)
      .attr('r', _calcRaio() * 5 / 3)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
  }
}

function destacarLocalSelecionado(idx) {
  if (!_gLocais) return;
  const circles = _gLocais.selectAll('circle');
  const r = _calcRaio();
  if (_selectedLocalIdx >= 0 && _selectedLocalIdx !== idx) {
    circles.filter((d, i) => i === _selectedLocalIdx)
      .attr('r', r)
      .attr('fill', '#000')
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 0.75);
  }
  _selectedLocalIdx = idx;
  if (idx >= 0) {
    circles.filter((d, i) => i === idx)
      .attr('r', r * 4 / 3)
      .attr('fill', '#2563eb')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
  }
}

function colorirLocais(mapaCores) {
  if (!_gLocais) return;
  _gLocais.selectAll('circle').each(function(d, i) {
    if (i === _selectedLocalIdx) return; // preserva seleção azul
    d3.select(this).attr('fill', mapaCores.get(i) ?? '#000000');
  });
}
