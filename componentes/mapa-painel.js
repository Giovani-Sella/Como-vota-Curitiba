function injetarMapaPainel(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `
      <!-- MAPA INTERATIVO -->
      <div class="mapa">
        <div class="tituloMapa" id="tituloMapa">
          <h2>Mapa de Curitiba (titulo vai ser alterado conforme visualização)</h2>
          <div id="legendaMapa"></div>
        </div>
        <div class="followArea" id="followArea">
          <div id="Svg_Container"></div>
          <div id="textoMouse"></div>
        </div>
      </div>

      <!-- PAINEL LATERAL -->
      <div class="lateralDireita">
        <div id="seletorEleicao" class="seletor-eleicao">
          <div class="seletor-linha" id="seletorAnos"></div>
          <div class="seletor-linha" id="seletorCargos"></div>
        </div>
        <div class="Escolha_bairros">
          <label class="visually-hidden" for="listaContainer">Bairro</label>
          <select id="listaContainer" class="select--todos"></select>
        </div>
        <div class="containerOpcaoToggle">
          <h3>Usar dados relativos a população </h3>
          <label class="toggle-switch">
            <input type="checkbox" id="permitirSaltos">
            <div class="toggle-switch-background">
              <div class="toggle-switch-handle"></div>
            </div>
          </label>
        </div>
        <div class="informacoes">

          <div class="divinformacoes" data-visualization="Numero_total_votos">
            <h3>Total de votos</h3>
            <h2 id="Numero_total_votos">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="Numero_votos_validos">
            <h3>Votos válidos</h3>
            <h2 id="Numero_votos_validos">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="Numero_votos_pessoas_negras">
            <h3>Em pessoas negras</h3>
            <div class="subdivinformacoes">
              <h2 id="Numero_votos_pessoas_negras">—</h2>
              <h2 id="Porcentagem_votos_pessoas_negras">—</h2>
            </div>
          </div>

          <div class="divinformacoes" data-visualization="Numero_votos_mulheres">
            <h3>Em mulheres</h3>
            <div class="subdivinformacoes">
              <h2 id="Numero_votos_mulheres">—</h2>
              <h2 id="Porcentagem_votos_mulheres">—</h2>
            </div>
          </div>

          <div class="divinformacoes" data-visualization="Numero_votos_nulos">
            <h3>Votos nulos</h3>
            <h2 id="Numero_votos_nulos">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="Numero_votos_brancos">
            <h3>Votos brancos</h3>
            <h2 id="Numero_votos_brancos">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="PartidoMaisVotado">
            <h3>Partido mais votado</h3>
            <h2 id="PartidoMaisVotado">—</h2>
          </div>

          <div class="divinformacoes divinformacoes--informativo">
            <h3>Votos no partido</h3>
            <h2 id="VotosNoPartido">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="VereadorMaisVotado">
            <h3>Candidato mais votado</h3>
            <h2 id="VereadorMaisVotado">—</h2>
          </div>

          <div class="divinformacoes divinformacoes--informativo">
            <h3>Votos no candidato</h3>
            <h2 id="VotosNoCandidato">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="Numero_total_moradores">
            <h3>Total de moradores <small>(Censo 2022)</small></h3>
            <h2 id="Numero_total_moradores">—</h2>
          </div>

          <div class="divinformacoes" data-visualization="RendaPercapta">
            <h3>Renda per capita <small>(Censo 2010)</small></h3>
            <h2 id="RendaPercapta">—</h2>
          </div>

          <p class="destaque">Clique nas variáveis acima para ver os dados representados no mapa</p>

        </div>
      </div>
  `;
}
