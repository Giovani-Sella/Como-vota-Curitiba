const _reportagensBase = (() => {
  const src = document.currentScript?.src;
  return src ? new URL('../reportagens/', src).href : './reportagens/';
})();

function injetarReportagens(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `
    <div class="margemTexto">
      <h1>Reportagens baseadas em nós</h1>
      <div class="reportagens">
        <div class="reportagem">
          <h2><a href="${_reportagensBase}rep1.html">Bancada negra ainda é minoria na Câmara Municipal de Curitiba</a></h2>
          <h3>Na capital mais negra do Sul do Brasil, apenas um a cada dez vereadores eleitos é negro ou negra</h3>
        </div>
        <div class="reportagem">
          <h2><a href="${_reportagensBase}rep2.html">Vereadores mais votados nos bairros sob maior risco climático de Curitiba não apresentaram propostas ambientais na campanha de 2024</a></h2>
          <h3>Relatório da prefeitura e do Ippuc aponta regiões sob risco de alagamentos, inundações, deslizamentos e ondas de calor</h3>
        </div>
      </div>
    </div>
  `;
}
