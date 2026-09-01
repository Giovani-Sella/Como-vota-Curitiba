const _rodapeHome = (() => {
  const src = document.currentScript?.src;
  return src ? new URL('../', src).href : './';
})();

function injetarRodape(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const ano = new Date().getFullYear();
  el.innerHTML = `
    <h1 class="textoRodape"><a href="${_rodapeHome}">COMO VOTA CURITIBA</a></h1>
    <p class="textoRodape2">
      Projeto mantido e criado por
      <a href="https://www.giovanisella.com.br" target="_blank">Giovani Sella</a>. <a href="https://github.com/Giovani-Sella/Como-vota-Curitiba" target="_blank">Ver no GitHub</a>. <a href="https://docs.google.com/presentation/d/19rNfTEn6mL7B8KK7uZSXl4YhtxfE9HAPqhjK3hLWvXw/edit?usp=sharing" target="_blank">Apresentação expocom nacional 2026</a>
    </p>
    <p class="textoRodape2">© ${ano} Como Vota Curitiba — Todos os direitos reservados</p>
  `;
}
