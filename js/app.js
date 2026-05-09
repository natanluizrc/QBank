// =====================================================================
// CONFIGURAÇÃO FIREBASE
// Substitua os valores abaixo pelos do seu projeto no Firebase Console
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyClB2xCaotvwvvokpfZ3APU-hRMpM42v9o",
  authDomain: "qbank-v01.firebaseapp.com",
  projectId: "qbank-v01",
  storageBucket: "qbank-v01.firebasestorage.app",
  messagingSenderId: "465595574154",
  appId: "1:465595574154:web:dab51b68e511d0c2d00a73"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =====================================================================
// CONTEÚDO — registrar cada aula aqui após extrair o PDF
// =====================================================================
const MATERIAS = [
  {
    id: 'contabilidade',
    nome: 'ContG',
    aulas: [
      { slug: 'aula-00',  titulo: 'Aula 00' },
      { slug: 'aula-01a', titulo: 'Aula 01A' },
      { slug: 'aula-01b', titulo: 'Aula 01B' },
      { slug: 'aula-02a', titulo: 'Aula 02A' },
      { slug: 'aula-02b', titulo: 'Aula 02B' },
      { slug: 'aula-04',  titulo: 'Aula 04' },
      { slug: 'aula-05',  titulo: 'Aula 05' },
    ]
  }
];

// =====================================================================
// ESTADO
// =====================================================================
let usuario = null;
let materiaAtiva = MATERIAS[0];
let aulaAtiva = MATERIAS[0].aulas[0];
let tabGlobal = null;       // null | 'simulado' | 'historico'
let modoQuestoes = 'lista'; // 'lista' | 'foco'
let aulaCache = {};         // 'materiaId/slug' → dados JSON
let focoIdx = 0;
let focoRespostas = {};     // questaoId → { dada, acertou }
let listaRespostas = {};   // questaoId → { dada, acertou }
let revisaoIds = new Set();
let revisaoQuestoes = [];
let salvosFiltroSlug = null;
let simuladoState = null;

// =====================================================================
// AUTH
// =====================================================================
auth.onAuthStateChanged(user => {
  if (user) {
    usuario = user;
    mostrarApp();
  } else {
    usuario = null;
    mostrarLogin();
  }
});

function mostrarLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
}

async function mostrarApp() {
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const avatar = document.getElementById('avatar');
  if (usuario.photoURL) {
    avatar.src = usuario.photoURL;
    avatar.style.display = '';
  } else {
    avatar.style.display = 'none';
  }

  salvarPerfil();
  inicializarApp();
}

async function salvarPerfil() {
  const ref = db.collection('usuarios').doc(usuario.uid).collection('perfil').doc('dados');
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        nome: usuario.displayName,
        email: usuario.email,
        fotoUrl: usuario.photoURL,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.error('Erro ao salvar perfil:', e);
  }
}

async function inicializarApp() {
  await carregarRevisao();
  document.querySelector('.aba-global[data-tab="inicio"]')?.classList.add('ativa');
  renderConteudo();
}

// =====================================================================
// NAVEGAÇÃO
// =====================================================================
function renderBarraMaterias() {
  const barra = document.getElementById('barra-materias');
  barra.innerHTML = MATERIAS.map(m =>
    `<button class="aba-materia ${m.id === materiaAtiva.id ? 'ativa' : ''}" data-mid="${m.id}">${m.nome}</button>`
  ).join('');
  barra.querySelectorAll('.aba-materia').forEach(btn => {
    btn.addEventListener('click', () => {
      materiaAtiva = MATERIAS.find(m => m.id === btn.dataset.mid);
      aulaAtiva = materiaAtiva.aulas[0];
      tabGlobal = null;
      salvosFiltroSlug = null;
      document.querySelectorAll('.aba-global').forEach(b => b.classList.remove('ativa'));
      document.querySelector('.aba-global[data-tab="inicio"]')?.classList.add('ativa');
      renderConteudo();
    });
  });
}

function renderBarraAulas() {
  const barra = document.getElementById('barra-aulas');
  if (tabGlobal && tabGlobal !== 'revisao') {
    barra.style.display = 'none';
    return;
  }
  barra.style.display = '';
  const isRevisao = tabGlobal === 'revisao';
  barra.innerHTML = materiaAtiva.aulas.map(a => {
    const ativa = isRevisao ? salvosFiltroSlug === a.slug : a.slug === aulaAtiva.slug;
    return `<button class="aba-aula ${ativa ? 'ativa' : ''}" data-slug="${a.slug}">${a.titulo}</button>`;
  }).join('');

  barra.querySelectorAll('.aba-aula').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.slug;
      if (tabGlobal === 'revisao') {
        salvosFiltroSlug = salvosFiltroSlug === slug ? null : slug;
        renderBarraAulas();
        renderRevisao();
      } else {
        aulaAtiva = materiaAtiva.aulas.find(a => a.slug === slug);
        barra.querySelectorAll('.aba-aula').forEach(b => b.classList.remove('ativa'));
        btn.classList.add('ativa');
        renderQuestoes();
      }
    });
  });
}

function renderConteudo() {
  renderBarraMaterias();
  renderBarraAulas();

  if (tabGlobal === 'simulado') { renderSimuladoConfig(); return; }
  if (tabGlobal === 'historico') { renderHistorico(); return; }
  if (tabGlobal === 'revisao')  { renderRevisao();  return; }

  renderQuestoes();
}

// =====================================================================
// CARREGAMENTO DE DADOS
// =====================================================================
async function carregarAulaDados(materiaId, slug) {
  const key = `${materiaId}/${slug}`;
  if (aulaCache[key]) return aulaCache[key];
  try {
    const resp = await fetch(`data/${materiaId}/${slug}.json`);
    if (!resp.ok) throw new Error();
    const dados = await resp.json();
    aulaCache[key] = dados;
    return dados;
  } catch {
    return null;
  }
}

async function carregarAula(slug) {
  return carregarAulaDados(materiaAtiva.id, slug);
}

// =====================================================================
// TEORIA
// =====================================================================
async function renderTeoria() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<p class="msg-vazio">Carregando...</p>';

  const dados = await carregarAula(aulaAtiva.slug);
  if (!dados) {
    conteudo.innerHTML = '<p class="msg-vazio">Conteúdo ainda não disponível.</p>';
    return;
  }

  conteudo.innerHTML = `<div class="teoria-conteudo">${marked.parse(dados.teoria || '')}</div>`;
}

// =====================================================================
// QUESTÕES
// =====================================================================
async function renderQuestoes() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<p class="msg-vazio">Carregando...</p>';

  const dados = await carregarAula(aulaAtiva.slug);
  if (!dados || !dados.questoes?.length) {
    conteudo.innerHTML = '<p class="msg-vazio">Nenhuma questão disponível.</p>';
    return;
  }

  focoIdx = 0;
  focoRespostas = {};
  listaRespostas = {};

  conteudo.innerHTML = `
    <div class="questoes-cabecalho">
      <div class="questoes-modo">
        <button class="btn-modo ${modoQuestoes === 'foco' ? 'ativo' : ''}" id="btn-foco">Foco</button>
        <button class="btn-modo ${modoQuestoes === 'lista' ? 'ativo' : ''}" id="btn-lista">Lista</button>
      </div>
    </div>
    <div id="questoes-area"></div>
  `;

  document.getElementById('btn-lista').addEventListener('click', () => {
    modoQuestoes = 'lista';
    renderQuestoes();
  });
  document.getElementById('btn-foco').addEventListener('click', () => {
    modoQuestoes = 'foco';
    renderQuestoes();
  });

  if (modoQuestoes === 'lista') {
    renderListaQuestoes(dados.questoes);
  } else {
    renderFocoQuestao(dados.questoes);
  }
}

// ---- Modo lista ----
function renderListaQuestoes(questoes) {
  const area = document.getElementById('questoes-area');

  const placarHtml = () => {
    const acertos = Object.values(listaRespostas).filter(r => r.acertou).length;
    const erros   = Object.values(listaRespostas).filter(r => !r.acertou).length;
    return `<span class="total">${String(questoes.length).padStart(3,'0')}</span><span class="acerto">${String(acertos).padStart(3,'0')}</span><span class="erro">${String(erros).padStart(3,'0')}</span>`;
  };

  area.innerHTML = `
    <div class="questoes-barra">
      <div class="barra-placar">${placarHtml()}</div>
      <button id="btn-expandir">Expandir tudo</button>
    </div>
    ${questoes.map((q, i) => htmlQuestaoLista(q, i)).join('')}
  `;
  diagramasParaCanvas();

  const atualizarPlacar = () => {
    const pl = area.querySelector('.barra-placar');
    if (pl) pl.innerHTML = placarHtml();
  };

  document.getElementById('btn-expandir').addEventListener('click', () => {
    const btn = document.getElementById('btn-expandir');
    const expandir = btn.textContent === 'Expandir tudo';
    area.querySelectorAll('.gabarito-inline').forEach(gab => {
      gab.classList.toggle('hidden', !expandir);
      const revelar = area.querySelector(`.btn-revelar[data-id="${gab.dataset.id}"]`);
      if (revelar) revelar.textContent = expandir ? 'Ocultar' : 'Ver gabarito';
    });
    btn.textContent = expandir ? 'Recolher tudo' : 'Expandir tudo';
  });

  area.querySelectorAll('.btn-revelar').forEach(btn => {
    btn.addEventListener('click', () => {
      const gab = area.querySelector(`.gabarito-inline[data-id="${btn.dataset.id}"]`);
      gab.classList.toggle('hidden');
      btn.textContent = gab.classList.contains('hidden') ? 'Ver gabarito' : 'Ocultar';
    });
  });

  area.querySelectorAll('.opcao[data-letra]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const card = btn.closest('.questao-card');
      const q = questoes.find(x => x.id === card.dataset.qid);
      listaRespostas[q.id] = { dada: btn.dataset.letra, acertou: btn.dataset.letra === q.resposta };
      card.querySelectorAll('.opcao').forEach(o => {
        o.disabled = true;
        if (o.dataset.letra === q.resposta) o.classList.add('correta');
        else if (o.dataset.letra === btn.dataset.letra) o.classList.add('errada');
      });
      atualizarPlacar();
    });
  });

  area.querySelectorAll('.btn-ce[data-resp]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const card = btn.closest('.questao-card');
      const q = questoes.find(x => x.id === card.dataset.qid);
      listaRespostas[q.id] = { dada: btn.dataset.resp, acertou: btn.dataset.resp === q.resposta };
      card.querySelectorAll('.btn-ce').forEach(b => {
        b.disabled = true;
        if (b.dataset.resp === q.resposta) b.classList.add('correta');
        else if (b.dataset.resp === btn.dataset.resp) b.classList.add('errada');
      });
      atualizarPlacar();
    });
  });

  area.querySelectorAll('.btn-marcar').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const qIdx = questoes.findIndex(x => x.id === btn.dataset.qid);
      const q = questoes[qIdx];
      if (!q) return;
      toggleRevisao(q, qIdx + 1);
      const marcado = revisaoIds.has(q.id);
      if (tabGlobal === 'revisao' && !marcado) {
        const card = btn.closest('.questao-card');
        card?.remove();
        if (!area.querySelector('.questao-card')) {
          area.innerHTML = '<p class="msg-vazio">Nenhuma questão salva ainda.</p>';
        }
      } else {
        btn.classList.toggle('marcado', marcado);
        btn.textContent = marcado ? 'Salvo' : 'Salvar';
      }
    });
  });
}

function diagramasParaCanvas() {
  document.querySelectorAll('pre.diagrama').forEach(pre => {
    const lines = pre.textContent.split('\n');
    const fontSize = 13;
    const lh = Math.round(fontSize * 1.5);
    const px = 12, py = 10;
    const fontStr = `${fontSize}px 'Courier New', Consolas, monospace`;

    const tmp = document.createElement('canvas').getContext('2d');
    tmp.font = fontStr;
    const cw = tmp.measureText('─').width;
    const maxLen = Math.max(...lines.map(l => l.length));
    const w = Math.ceil(maxLen * cw + px * 2);
    const h = Math.ceil(lines.length * lh + py * 2);

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width       = w + 'px';
    canvas.style.maxWidth    = '100%';
    canvas.style.aspectRatio = `${w} / ${h}`;
    canvas.style.display     = 'block';
    canvas.style.margin      = '0.75rem 0';
    canvas.style.borderRadius = '6px';
    canvas.style.border      = '1px solid #e5e7eb';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h);
    ctx.font = fontStr;
    ctx.fillStyle = '#1a1a1a';
    lines.forEach((line, i) => {
      ctx.fillText(line, px, py + (i + 1) * lh - 3);
    });

    pre.replaceWith(canvas);
  });
}

function htmlEnunciado(q) {
  const banca = q.banca ? `<div class="questao-banca">(${q.banca})</div>` : '';
  const boxRe = /[┌┐└┘│─┬┴┼├┤]/;
  const linhas = q.enunciado.split('\n');
  let html = '';
  let diagBuf = [];

  const flushDiag = () => {
    if (diagBuf.length) {
      html += `<pre class="diagrama">${diagBuf.join('\n')}</pre>`;
      diagBuf = [];
    }
  };

  for (const linha of linhas) {
    if (boxRe.test(linha)) {
      diagBuf.push(linha);
    } else {
      flushDiag();
      html += linha + '\n';
    }
  }
  flushDiag();

  return `${banca}<div class="questao-enunciado">${html.trimEnd()}</div>`;
}

function htmlQuestaoLista(q, i) {
  const dif = '★'.repeat(q.dificuldade) + '☆'.repeat(5 - q.dificuldade);

  const opcoes = q.tipo === 'multipla_escolha'
    ? `<div class="opcoes">${q.opcoes.map((o, idx) => {
        const letra = String.fromCharCode(65 + idx);
        return `<button class="opcao" data-letra="${letra}">${o}</button>`;
      }).join('')}</div>`
    : `<div class="certo-errado-btns">
        <button class="btn-ce" data-resp="certo">Certo</button>
        <button class="btn-ce" data-resp="errado">Errado</button>
       </div>`;

  return `
    <div class="questao-card" data-qid="${q.id}">
      <div class="questao-meta">
        <span>Q${q._qNum ?? i + 1}</span>
        <span title="Dificuldade">${dif}</span>
        <span>${q.tipo === 'multipla_escolha' ? 'Múltipla escolha' : 'Certo/Errado'}</span>
        ${q._aula ? `<span class="questao-fonte">${q._materia} — ${q._aula}</span>` : ''}
        <button class="btn-marcar ${revisaoIds.has(q.id) ? 'marcado' : ''}" data-qid="${q.id}">${revisaoIds.has(q.id) ? 'Salvo' : 'Salvar'}</button>
      </div>
      ${htmlEnunciado(q)}
      ${opcoes}
      <button class="btn-revelar" data-id="${q.id}">Ver gabarito</button>
      <div class="gabarito-inline hidden" data-id="${q.id}">
        <strong>Resposta: ${String(q.resposta).toUpperCase()}</strong><br>${q.comentario}
      </div>
    </div>`;
}

// ---- Modo foco ----
function renderFocoQuestao(questoes) {
  const area = document.getElementById('questoes-area');
  const q = questoes[focoIdx];
  const total = questoes.length;
  const respondidas = Object.keys(focoRespostas).length;
  const acertos = Object.values(focoRespostas).filter(r => r.acertou).length;
  const isLast = focoIdx === total - 1;
  const resp = focoRespostas[q.id];

  area.innerHTML = `
    <div class="foco-wrapper">
      <div class="questoes-barra">
        <div class="barra-placar">
          <span class="total">${String(total).padStart(3,'0')}</span>
          <span class="acerto">${String(acertos).padStart(3,'0')}</span>
          <span class="erro">${String(respondidas - acertos).padStart(3,'0')}</span>
        </div>
        <div></div>
      </div>
      ${htmlQuestaoFoco(q, resp, isLast, focoIdx + 1)}
    </div>`;
  diagramasParaCanvas();

  if (!resp) {
    bindFocoInteracao(q, questoes);
  } else {
    area.querySelector('.btn-proxima')?.addEventListener('click', () => {
      if (isLast) {
        renderFocoConcluido(questoes);
      } else {
        focoIdx++;
        renderFocoQuestao(questoes);
      }
    });
  }

  area.querySelector('.btn-marcar')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleRevisao(q, focoIdx + 1);
    const marcado = revisaoIds.has(q.id);
    const btn = area.querySelector('.btn-marcar');
    if (btn) { btn.classList.toggle('marcado', marcado); btn.textContent = marcado ? 'Salvo' : 'Salvar'; }
  });
}

function htmlQuestaoFoco(q, resp, isLast = false, num = null) {
  const dif = '★'.repeat(q.dificuldade) + '☆'.repeat(5 - q.dificuldade);

  let interacaoHtml;
  if (q.tipo === 'multipla_escolha') {
    interacaoHtml = `<div class="opcoes">${q.opcoes.map((o, i) => {
      const letra = String.fromCharCode(65 + i);
      let cls = 'opcao';
      if (resp) {
        if (letra === q.resposta) cls += ' correta';
        else if (letra === resp.dada) cls += ' errada';
      }
      return `<button class="${cls}" data-letra="${letra}" ${resp ? 'disabled' : ''}>${o}</button>`;
    }).join('')}</div>`;
  } else {
    const mkCE = (val, label) => {
      let cls = 'btn-ce';
      if (resp) {
        if (q.resposta === val) cls += ' correta';
        else if (resp.dada === val) cls += ' errada';
      }
      return `<button class="${cls}" data-resp="${val}" ${resp ? 'disabled' : ''}>${label}</button>`;
    };
    interacaoHtml = `<div class="certo-errado-btns">${mkCE('certo', 'Certo')}${mkCE('errado', 'Errado')}</div>`;
  }

  const gabaritoHtml = resp ? `
    <div class="gabarito-inline ${resp.acertou ? 'acerto' : 'erro'}">
      ${resp.acertou ? '✓ Correto!' : '✗ Incorreto.'} Resposta: <strong>${String(q.resposta).toUpperCase()}</strong><br>${q.comentario}
    </div>
    <button class="btn-proxima">${isLast ? 'Ver resultado' : 'Próxima →'}</button>` : '';

  return `
    <div class="questao-card">
      <div class="questao-meta">
        ${num !== null ? `<span>Q${q._qNum ?? num}</span>` : ''}
        <span title="Dificuldade">${dif}</span>
        <span>${q.tipo === 'multipla_escolha' ? 'Múltipla escolha' : 'Certo/Errado'}</span>
        ${q._aula ? `<span class="questao-fonte">${q._materia} — ${q._aula}</span>` : ''}
        <button class="btn-marcar ${revisaoIds.has(q.id) ? 'marcado' : ''}" data-qid="${q.id}">${revisaoIds.has(q.id) ? 'Salvo' : 'Salvar'}</button>
      </div>
      ${htmlEnunciado(q)}
      ${interacaoHtml}
      ${gabaritoHtml}
    </div>`;
}

function bindFocoInteracao(q, questoes) {
  const area = document.getElementById('questoes-area');
  const responder = (dada) => {
    const acertou = dada.toLowerCase() === String(q.resposta).toLowerCase();
    focoRespostas[q.id] = { dada, acertou };
    renderFocoQuestao(questoes);
  };

  if (q.tipo === 'multipla_escolha') {
    area.querySelectorAll('.opcao[data-letra]').forEach(btn =>
      btn.addEventListener('click', () => responder(btn.dataset.letra))
    );
  } else {
    area.querySelectorAll('.btn-ce[data-resp]').forEach(btn =>
      btn.addEventListener('click', () => responder(btn.dataset.resp))
    );
  }
}

function renderFocoConcluido(questoes) {
  const area = document.getElementById('questoes-area');
  const acertos = Object.values(focoRespostas).filter(r => r.acertou).length;
  const total = questoes.length;
  const pct = Math.round((acertos / total) * 100);

  area.innerHTML = `
    <div class="foco-wrapper">
      <div class="resultado-placar">
        <div class="score">${acertos} / ${total}</div>
        <div class="pct">${pct}%</div>
      </div>
      <div class="resultado-acoes">
        <button class="btn-iniciar" id="btn-reiniciar">Tentar novamente</button>
      </div>
    </div>`;

  document.getElementById('btn-reiniciar').addEventListener('click', () => {
    focoIdx = 0;
    focoRespostas = {};
    renderFocoQuestao(questoes);
  });
}

// =====================================================================
// SIMULADO
// =====================================================================
function renderSimuladoConfig() {
  if (simuladoState?.fase === 'quiz') { renderSimuladoQuiz(); return; }
  if (simuladoState?.fase === 'resultado') { renderSimuladoResultado(); return; }

  const conteudo = document.getElementById('conteudo');

  const opsFonte = [
    ...MATERIAS.map(m => `<option value="materia:${m.id}">${m.nome}</option>`),
    ...MATERIAS.flatMap(m => m.aulas.map(a =>
      `<option value="aula:${m.id}:${a.slug}">${m.nome} — ${a.titulo}</option>`
    ))
  ].join('');

  conteudo.innerHTML = `
    <div class="simulado-config">
      <h2>Novo Simulado</h2>
      <div class="config-grupo">
        <label>Fonte das questões</label>
        <select id="sim-fonte">${opsFonte}</select>
      </div>
      <div class="config-grupo">
        <label>Quantidade</label>
        <select id="sim-qtd">
          <option value="10">10 questões</option>
          <option value="20">20 questões</option>
          <option value="30">30 questões</option>
        </select>
      </div>
      <button class="btn-iniciar" id="btn-iniciar-sim">Iniciar Simulado</button>
    </div>`;

  document.getElementById('btn-iniciar-sim').addEventListener('click', () =>
    iniciarSimulado(
      document.getElementById('sim-fonte').value,
      parseInt(document.getElementById('sim-qtd').value)
    )
  );
}

async function iniciarSimulado(fonte, qtd) {
  document.getElementById('conteudo').innerHTML = '<p class="msg-vazio">Preparando simulado...</p>';

  let pool = [];

  const carregarParaPool = async (m, a) => {
    const dados = await carregarAulaDados(m.id, a.slug);
    if (dados?.questoes) {
      pool.push(...dados.questoes.map(q => ({ ...q, _materia: m.nome, _aula: a.titulo })));
    }
  };

  if (fonte === 'base') {
    for (const m of MATERIAS) for (const a of m.aulas) await carregarParaPool(m, a);
  } else if (fonte.startsWith('materia:')) {
    const m = MATERIAS.find(x => x.id === fonte.split(':')[1]);
    if (m) for (const a of m.aulas) await carregarParaPool(m, a);
  } else if (fonte.startsWith('aula:')) {
    const [, mid, slug] = fonte.split(':');
    const m = MATERIAS.find(x => x.id === mid);
    const a = m?.aulas.find(x => x.slug === slug);
    if (m && a) await carregarParaPool(m, a);
  }

  if (!pool.length) {
    document.getElementById('conteudo').innerHTML =
      '<p class="msg-vazio">Nenhuma questão disponível para esta seleção.</p>';
    return;
  }

  const questoes = pool.sort(() => Math.random() - 0.5).slice(0, qtd);

  simuladoState = {
    fase: 'quiz',
    questoes,
    respostas: {},
    idx: 0,
    fonte,
    qtd,
    tempoInicio: Date.now(),
    tempoSegundos: 0,
    intervalo: setInterval(atualizarCronometro, 1000)
  };

  renderSimuladoQuiz();
}

function renderSimuladoQuiz() {
  const conteudo = document.getElementById('conteudo');
  const s = simuladoState;
  const q = s.questoes[s.idx];
  const isLast = s.idx === s.questoes.length - 1;
  const resp = s.respostas[q.id];

  conteudo.innerHTML = `
    <div class="foco-wrapper">
      <div class="simulado-header">
        <span>${s.idx + 1} / ${s.questoes.length}</span>
        <span id="cronometro">00:00</span>
      </div>
      ${htmlQuestaoFoco(q, resp, isLast, s.idx + 1)}
    </div>`;
  diagramasParaCanvas();

  atualizarCronometro();

  if (!resp) {
    const responder = (dada) => {
      const acertou = dada.toLowerCase() === String(q.resposta).toLowerCase();
      s.respostas[q.id] = { dada, acertou };
      renderSimuladoQuiz();
    };

    if (q.tipo === 'multipla_escolha') {
      conteudo.querySelectorAll('.opcao[data-letra]').forEach(btn =>
        btn.addEventListener('click', () => responder(btn.dataset.letra))
      );
    } else {
      conteudo.querySelectorAll('.btn-ce[data-resp]').forEach(btn =>
        btn.addEventListener('click', () => responder(btn.dataset.resp))
      );
    }
  } else {
    conteudo.querySelector('.btn-proxima')?.addEventListener('click', () => {
      if (isLast) {
        finalizarSimulado();
      } else {
        s.idx++;
        renderSimuladoQuiz();
      }
    });
  }

  conteudo.querySelector('.btn-marcar')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleRevisao(q, s.idx + 1);
    const marcado = revisaoIds.has(q.id);
    const btn = conteudo.querySelector('.btn-marcar');
    if (btn) { btn.classList.toggle('marcado', marcado); btn.textContent = marcado ? 'Salvo' : 'Salvar'; }
  });
}

function atualizarCronometro() {
  const el = document.getElementById('cronometro');
  if (!el || !simuladoState) return;
  const seg = Math.floor((Date.now() - simuladoState.tempoInicio) / 1000);
  el.textContent = formatarTempo(seg);
}

async function finalizarSimulado() {
  const s = simuladoState;
  clearInterval(s.intervalo);
  s.fase = 'resultado';
  s.tempoSegundos = Math.floor((Date.now() - s.tempoInicio) / 1000);
  s.acertos = Object.values(s.respostas).filter(r => r.acertou).length;

  try {
    await db.collection('usuarios').doc(usuario.uid).collection('historico').add({
      data: firebase.firestore.FieldValue.serverTimestamp(),
      fonte: s.fonte,
      placar: s.acertos,
      total: s.questoes.length,
      tempoSegundos: s.tempoSegundos,
      questoes: s.questoes.map(q => ({
        id: q.id,
        enunciado: q.enunciado,
        tipo: q.tipo,
        opcoes: q.opcoes || null,
        resposta: q.resposta,
        comentario: q.comentario,
        respondido: s.respostas[q.id]?.dada || null,
        acertou: s.respostas[q.id]?.acertou || false,
        _materia: q._materia || '',
        _aula: q._aula || ''
      }))
    });
  } catch (e) {
    console.error('Erro ao salvar simulado:', e);
  }

  renderSimuladoResultado();
}

function renderSimuladoResultado() {
  const conteudo = document.getElementById('conteudo');
  const s = simuladoState;
  const pct = Math.round((s.acertos / s.questoes.length) * 100);

  const gabHtml = s.questoes.map((q, i) => {
    const resp = s.respostas[q.id] || {};
    return `
      <div class="questao-card">
        <div class="questao-meta">
          <span>Q${i + 1}</span>
          <span style="color:${resp.acertou ? '#4a9a5a' : '#c05050'}">${resp.acertou ? '✓' : '✗'}</span>
          ${q._aula ? `<span>${q._materia} — ${q._aula}</span>` : ''}
        </div>
        ${htmlEnunciado(q)}
        <div class="gabarito-inline ${resp.acertou ? 'acerto' : 'erro'}">
          Sua resposta: <strong>${String(resp.dada || '—').toUpperCase()}</strong> ·
          Correta: <strong>${String(q.resposta).toUpperCase()}</strong><br>${q.comentario}
        </div>
      </div>`;
  }).join('');

  conteudo.innerHTML = `
    <div class="resultado-placar">
      <div class="score">${s.acertos} / ${s.questoes.length}</div>
      <div class="pct">${pct}%</div>
      <div class="tempo">Tempo: ${formatarTempo(s.tempoSegundos)}</div>
    </div>
    <div class="resultado-acoes">
      <button class="btn-iniciar" id="btn-novo-sim">Novo Simulado</button>
    </div>
    <div class="resultado-gabarito">${gabHtml}</div>`;
  diagramasParaCanvas();

  document.getElementById('btn-novo-sim').addEventListener('click', () => {
    simuladoState = null;
    renderSimuladoConfig();
  });
}

// =====================================================================
// GABARITO GLOBAL
// =====================================================================
async function renderGabarito() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<p class="msg-vazio">Carregando questões...</p>';

  const todas = [];
  for (const m of MATERIAS) {
    for (const a of m.aulas) {
      const dados = await carregarAulaDados(m.id, a.slug);
      if (dados?.questoes) {
        todas.push(...dados.questoes.map(q => ({
          ...q, _materia: m.nome, _materiaId: m.id, _aula: a.titulo, _slug: a.slug
        })));
      }
    }
  }

  if (!todas.length) {
    conteudo.innerHTML = '<p class="msg-vazio">Nenhuma questão disponível ainda.</p>';
    return;
  }

  renderGabaritoFiltrado(todas);
}

function renderGabaritoFiltrado(todas) {
  const conteudo = document.getElementById('conteudo');
  const materias = [...new Set(todas.map(q => q._materia))];

  conteudo.innerHTML = `
    <div class="gabarito-filtros">
      <select id="fil-materia">
        <option value="">Todas as matérias</option>
        ${materias.map(m => `<option value="${m}">${m}</option>`).join('')}
      </select>
      <select id="fil-tipo">
        <option value="">Todos os tipos</option>
        <option value="multipla_escolha">Múltipla escolha</option>
        <option value="certo_errado">Certo/Errado</option>
      </select>
      <select id="fil-dif">
        <option value="">Todas as dificuldades</option>
        ${[1,2,3,4,5].map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>
    <div id="gabarito-lista"></div>`;

  const aplicar = () => {
    const fm = document.getElementById('fil-materia').value;
    const ft = document.getElementById('fil-tipo').value;
    const fd = document.getElementById('fil-dif').value;

    const filtradas = todas.filter(q =>
      (!fm || q._materia === fm) &&
      (!ft || q.tipo === ft) &&
      (!fd || q.dificuldade === parseInt(fd))
    );

    const lista = document.getElementById('gabarito-lista');
    if (!filtradas.length) {
      lista.innerHTML = '<p class="msg-vazio">Nenhuma questão encontrada.</p>';
      return;
    }

    lista.innerHTML = filtradas.map((q, i) => htmlQuestaoLista(q, i)).join('');
    lista.querySelectorAll('.btn-revelar').forEach(btn => {
      btn.addEventListener('click', () => {
        const gab = lista.querySelector(`.gabarito-inline[data-id="${btn.dataset.id}"]`);
        gab.classList.toggle('hidden');
        btn.textContent = gab.classList.contains('hidden') ? 'Ver gabarito' : 'Ocultar';
      });
    });
  };

  ['fil-materia', 'fil-tipo', 'fil-dif'].forEach(id =>
    document.getElementById(id).addEventListener('change', aplicar)
  );

  aplicar();
}

// =====================================================================
// HISTÓRICO
// =====================================================================
async function renderHistorico() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<p class="msg-vazio">Carregando...</p>';

  try {
    const snap = await db.collection('usuarios').doc(usuario.uid)
      .collection('historico').orderBy('data', 'desc').get();

    if (snap.empty) {
      conteudo.innerHTML = '<p class="msg-vazio">Nenhum simulado realizado ainda.</p>';
      return;
    }

    const simulados = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    conteudo.innerHTML = `
      <button class="btn-limpar-historico" id="btn-limpar">Limpar histórico</button>
      <ul class="historico-lista">
        ${simulados.map(s => {
          const data = s.data?.toDate?.().toLocaleDateString('pt-BR') || '—';
          const pct = Math.round((s.placar / s.total) * 100);
          return `
            <li class="historico-item" data-id="${s.id}">
              <div>
                <div class="historico-titulo">${data} · ${s.total} questões</div>
                <div class="historico-info">${formatarTempo(s.tempoSegundos || 0)}</div>
              </div>
              <div class="historico-placar">${s.placar}/${s.total} (${pct}%)</div>
            </li>`;
        }).join('')}
      </ul>`;

    simulados.forEach(s => {
      conteudo.querySelector(`.historico-item[data-id="${s.id}"]`)
        ?.addEventListener('click', () => renderDetalhesSimulado(s));
    });

    document.getElementById('btn-limpar').addEventListener('click', () => limparHistorico(simulados));

  } catch (e) {
    conteudo.innerHTML = '<p class="msg-vazio">Erro ao carregar histórico.</p>';
    console.error(e);
  }
}

function renderDetalhesSimulado(s) {
  const conteudo = document.getElementById('conteudo');
  const data = s.data?.toDate?.().toLocaleDateString('pt-BR') || '—';
  const pct = Math.round((s.placar / s.total) * 100);

  const gabHtml = (s.questoes || []).map((q, i) => `
    <div class="questao-card">
      <div class="questao-meta">
        <span>Q${i + 1}</span>
        <span style="color:${q.acertou ? '#4a9a5a' : '#c05050'}">${q.acertou ? '✓' : '✗'}</span>
        ${q._aula ? `<span>${q._materia} — ${q._aula}</span>` : ''}
      </div>
      ${htmlEnunciado(q)}
      <div class="gabarito-inline ${q.acertou ? 'acerto' : 'erro'}">
        Respondido: <strong>${String(q.respondido || '—').toUpperCase()}</strong> ·
        Correto: <strong>${String(q.resposta).toUpperCase()}</strong><br>${q.comentario}
      </div>
    </div>`).join('');

  conteudo.innerHTML = `
    <button class="btn-voltar" id="btn-voltar-hist">← Histórico</button>
    <div class="resultado-placar">
      <div class="score">${s.placar} / ${s.total}</div>
      <div class="pct">${pct}%</div>
      <div class="tempo">${data} · ${formatarTempo(s.tempoSegundos || 0)}</div>
    </div>
    <div class="resultado-gabarito">${gabHtml}</div>`;

  document.getElementById('btn-voltar-hist').addEventListener('click', renderHistorico);
}

async function limparHistorico(simulados) {
  if (!confirm('Apagar todo o histórico de simulados?')) return;
  const batch = db.batch();
  simulados.forEach(s =>
    batch.delete(db.collection('usuarios').doc(usuario.uid).collection('historico').doc(s.id))
  );
  await batch.commit();
  renderHistorico();
}

// =====================================================================
// REVISÃO
// =====================================================================
async function carregarRevisao() {
  try {
    const snap = await db.collection('usuarios').doc(usuario.uid).collection('revisao').get();
    revisaoIds = new Set(snap.docs.map(d => d.id));
    revisaoQuestoes = snap.docs.map(d => d.data());
  } catch (e) { console.error('Erro ao carregar revisão:', e); }
}

function toggleRevisao(q, qNum) {
  const ref = db.collection('usuarios').doc(usuario.uid).collection('revisao').doc(q.id);
  if (revisaoIds.has(q.id)) {
    revisaoIds.delete(q.id);
    revisaoQuestoes = revisaoQuestoes.filter(x => x.id !== q.id);
    ref.delete().catch(e => console.error('Erro ao remover revisão:', e));
  } else {
    const qRich = {
      ...q,
      _materia:   q._materia   || materiaAtiva.nome,
      _materiaId: q._materiaId || materiaAtiva.id,
      _aula:      q._aula      || aulaAtiva?.titulo || '',
      _slug:      q._slug      || aulaAtiva?.slug   || '',
      _qNum:      q._qNum      ?? qNum,
    };
    revisaoIds.add(q.id);
    revisaoQuestoes.push(qRich);
    ref.set({
      id: qRich.id, banca: qRich.banca || '', tipo: qRich.tipo, enunciado: qRich.enunciado,
      opcoes: qRich.opcoes || null, resposta: qRich.resposta, comentario: qRich.comentario,
      dificuldade: qRich.dificuldade || 1,
      _materia: qRich._materia, _materiaId: qRich._materiaId,
      _aula: qRich._aula, _slug: qRich._slug, _qNum: qRich._qNum || null,
      marcadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error('Erro ao salvar revisão:', e));
  }
}

function renderRevisao() {
  const conteudo = document.getElementById('conteudo');
  const questoes = salvosFiltroSlug
    ? revisaoQuestoes.filter(q => q._slug === salvosFiltroSlug)
    : revisaoQuestoes;
  if (!questoes.length) {
    conteudo.innerHTML = `<p class="msg-vazio">${salvosFiltroSlug ? 'Nenhuma questão salva nesta aula.' : 'Nenhuma questão salva ainda.'}</p>`;
    return;
  }
  focoIdx = 0; focoRespostas = {}; listaRespostas = {};
  conteudo.innerHTML = `
    <div class="questoes-cabecalho">
      <div class="questoes-modo">
        <button class="btn-modo ${modoQuestoes === 'foco' ? 'ativo' : ''}" id="btn-foco">Foco</button>
        <button class="btn-modo ${modoQuestoes === 'lista' ? 'ativo' : ''}" id="btn-lista">Lista</button>
      </div>
    </div>
    <div id="questoes-area"></div>`;
  document.getElementById('btn-lista').addEventListener('click', () => { modoQuestoes = 'lista'; renderRevisao(); });
  document.getElementById('btn-foco').addEventListener('click', () => { modoQuestoes = 'foco'; renderRevisao(); });
  if (modoQuestoes === 'lista') renderListaQuestoes(questoes);
  else renderFocoQuestao(questoes);
}

// =====================================================================
// UTILITÁRIOS
// =====================================================================
function formatarTempo(seg) {
  const mm = String(Math.floor(seg / 60)).padStart(2, '0');
  const ss = String(seg % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// =====================================================================
// EVENT LISTENERS (globais, fixos no DOM)
// =====================================================================
document.getElementById('btn-login').addEventListener('click', () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(console.error);
});

document.getElementById('btn-logout').addEventListener('click', () => {
  auth.signOut();
});


document.querySelectorAll('.aba-global').forEach(btn => {
  btn.addEventListener('click', () => {
    const newTab = btn.dataset.tab === 'inicio' ? null : btn.dataset.tab;
    if (newTab !== 'revisao') salvosFiltroSlug = null;
    tabGlobal = newTab;
    simuladoState = null;
    document.querySelectorAll('.aba-global').forEach(b => b.classList.remove('ativa'));
    btn.classList.add('ativa');
    renderConteudo();
  });
});

