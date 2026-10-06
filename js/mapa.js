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
    .on('click',     (ev, d) => callbacks.onClick(d.properties.id));
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
    el.parentElement.appendChild(el); // traz para frente (z-order)
  }
}
