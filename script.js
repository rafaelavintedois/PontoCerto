
function qs(id) { return document.getElementById(id); }
function getUsuarios() { return JSON.parse(localStorage.getItem('usuarios')) || []; }
function setUsuarios(u) { localStorage.setItem('usuarios', JSON.stringify(u)); }
function getPontos() { return JSON.parse(localStorage.getItem('pontos')) || []; }
function setPontos(p) { localStorage.setItem('pontos', JSON.stringify(p)); }


// CADASTRO / LOGIN 
function mostrarCadastro() {
  qs('loginForm').style.display = 'none';
  qs('cadastroForm').style.display = 'block';
}
function mostrarLogin() {
  qs('cadastroForm').style.display = 'none';
  qs('loginForm').style.display = 'block';
}

function cadastrarUsuario() {
  const nome = qs('nomeCadastro').value.trim();
  const email = qs('emailCadastro').value.trim();
  const senha = qs('senhaCadastro').value.trim();
  const cargo = qs('cargoCadastro').value.trim();
  const departamento = qs('departamentoCadastro').value.trim();
  const msgCadastro = qs('msgCadastro');

  msgCadastro.textContent = '';

  if (!nome || !email || !senha) {
    msgCadastro.style.color = 'red';
    msgCadastro.textContent = 'Preencha todos os campos obrigatórios.';
    return;
  }

  const usuarios = getUsuarios();
  if (usuarios.some(u => u.email === email)) {
    msgCadastro.style.color = 'red';
    msgCadastro.textContent = 'E-mail já cadastrado.';
    return;
  }

  const novoUsuario = {
    id: Date.now(),
    nome, email, senha, cargo, departamento
  };

  usuarios.push(novoUsuario);
  setUsuarios(usuarios);

  msgCadastro.style.color = 'green';
  msgCadastro.textContent = 'Conta criada! Você será redirecionado para login.';

  qs('nomeCadastro').value = '';
  qs('emailCadastro').value = '';
  qs('senhaCadastro').value = '';
  qs('cargoCadastro').value = '';
  qs('departamentoCadastro').value = '';

  setTimeout(mostrarLogin, 1200);
}

function login() {
  const email = qs('emailLogin').value.trim();
  const senha = qs('senhaLogin').value.trim();
  const erroLogin = qs('erroLogin');

  erroLogin.textContent = '';

  const usuarios = getUsuarios();
  const user = usuarios.find(u => u.email === email && u.senha === senha);

  if (user) {
    localStorage.setItem('usuarioLogado', JSON.stringify(user));
    window.location.href = 'dashboard.html';
  } else {
    erroLogin.textContent = 'E-mail ou senha inválidos.';
  }
}

//DASHBOARD / PONTO 
function carregarUsuario() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  const userInfo = qs('userInfo');
  if (userInfo) userInfo.textContent = `Bem-vindo, ${user.nome}`;
  return user;
}

async function buscarLocalizacao() {
  return "Remoto";
}

async function baterPonto() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;
  
    const registros = getPontos();
    const agora = new Date();
    const agoraMs = agora.getTime();
    const dataStr = agora.toLocaleDateString();
  
    // procura registro de hoje sem horaSaida
    const registroHoje = registros.find(r => r.userId === user.id && r.data === dataStr && !r.horaSaida);
  
    if (registroHoje) {
      // registra saída usando timestamp (se não tiver horaEntradaTS, tenta migrar)
      if (!registroHoje.horaEntradaTS && registroHoje.horaEntrada) {
        const parsed = parseDateTimeToMs(registroHoje.data, registroHoje.horaEntrada);
        registroHoje.horaEntradaTS = parsed; // pode ser null se parsing falhar
      }
  
      registroHoje.horaSaida = agora.toLocaleTimeString();
      registroHoje.horaSaidaTS = agoraMs;
  
      if (registroHoje.horaEntradaTS) {
        const diffMs = registroHoje.horaSaidaTS - registroHoje.horaEntradaTS;
        if (isFinite(diffMs) && diffMs >= 0) {
          const diffMin = Math.floor(diffMs / 1000 / 60);
          const horas = Math.floor(diffMin / 60);
          const minutos = diffMin % 60;
          registroHoje.totalHoras = `${horas}h ${minutos}min`;
        } else {
          registroHoje.totalHoras = "-";
        }
      } else {
        registroHoje.totalHoras = "-";
      }
  
      qs('mensagem').textContent = '✅ Saída registrada com sucesso!';
    } else {
      // cria novo registro com timestamp de entrada
      const cidade = await buscarLocalizacao();
      const novoPonto = {
        id: Date.now(),
        userId: user.id,
        data: dataStr,
        horaEntrada: agora.toLocaleTimeString(),
        horaEntradaTS: agoraMs,   // <-- guarda timestamp aqui
        horaSaida: null,
        horaSaidaTS: null,
        localizacao: cidade,
        observacao: '',
        totalHoras: null
      };
      registros.push(novoPonto);
      qs('mensagem').textContent = '✅ Entrada registrada com sucesso!';
    }
  
    setPontos(registros);
    carregarHistorico();
  }  
  
  function carregarHistorico() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;
    const registros = getPontos();
    const meusPontos = registros.filter(p => p.userId === user.id).sort((a,b)=>b.id-a.id);
    const tbody = document.querySelector('#tabelaPontos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
  
    meusPontos.forEach(p => {
      // tenta migrar registros antigos sem timestamp (não altera se já tem)
      if (!p.horaEntradaTS && p.horaEntrada) {
        const parsed = parseDateTimeToMs(p.data, p.horaEntrada);
        if (parsed) p.horaEntradaTS = parsed;
      }
      // se existe horaSaidaTS mas horaSaida string ausente, converte pra exibição
      if (p.horaSaidaTS && !p.horaSaida) {
        p.horaSaida = new Date(p.horaSaidaTS).toLocaleTimeString();
      }
  
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.data}</td>
        <td>${p.horaEntrada || '-'}</td>
        <td>${p.horaSaida || '-'}</td>
        <td>${p.localizacao || '-'}</td>
        <td>${p.totalHoras || '-'}</td>
        <td>
          <button class="btnEdit" data-id="${p.id}">Editar</button>
          <button class="btnDel" data-id="${p.id}">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);      
    });
  
    // (restante da delegação de eventos permanece igual)
    tbody.querySelectorAll('.btnDel').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        excluirPonto(id);
      });
    });
    tbody.querySelectorAll('.btnEdit').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        editarPontoPrompt(id);
      });
    });
  }
  

function excluirPonto(id) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  const registros = getPontos().filter(r => r.id !== id);
  setPontos(registros);
  carregarHistorico();
}

function editarPontoPrompt(id) {
  const registros = getPontos();
  const ponto = registros.find(r => r.id === id);
  if (!ponto) return alert('Registro não encontrado.');

  const novaObs = prompt('Observação (opcional):', ponto.observacao || '');
  if (novaObs === null) return;
  ponto.observacao = novaObs;
  setPontos(registros);
  carregarHistorico();
}

// Parse seguro de "dd/mm/yyyy" + "HH:MM:SS" para timestamp (ms)
function parseDateTimeToMs(dateStr, timeStr) {
    // espera dateStr = "06/11/2025" e timeStr = "14:23:29" (ou "14:23")
    if (!dateStr || !timeStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(p => parseInt(p, 10));
    const tParts = timeStr.split(':').map(p => parseInt(p, 10));
    const hh = tParts[0] || 0;
    const min = tParts[1] || 0;
    const sec = tParts[2] || 0;
    // Note: month em Date é 0-11
    return new Date(yyyy, mm - 1, dd, hh, min, sec).getTime();
  }
  

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'index.html';
}

// -------------------- BOOTSTRAP --------------------
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (qs('btnLogin') || qs('btnCadastro')) {
    const btnLogin = qs('btnLogin');
    const btnCadastro = qs('btnCadastro');
    const linkCadastro = qs('linkCadastro');
    const linkLogin = qs('linkLogin');

    if (linkCadastro) linkCadastro.addEventListener('click', (e)=>{ e.preventDefault(); mostrarCadastro(); });
    if (linkLogin) linkLogin.addEventListener('click', (e)=>{ e.preventDefault(); mostrarLogin(); });

    if (btnLogin) btnLogin.addEventListener('click', (e)=>{ e.preventDefault(); login(); });
    if (btnCadastro) btnCadastro.addEventListener('click', (e)=>{ e.preventDefault(); cadastrarUsuario(); });
  }

  if (path.includes('dashboard.html') || qs('btnPonto') || qs('userInfo')) {
    const btnPonto = qs('btnPonto');
    const btnLogout = qs('btnLogout');

    const user = carregarUsuario();
    carregarHistorico();

    if (btnPonto) btnPonto.addEventListener('click', (e)=>{ e.preventDefault(); baterPonto(); });
    if (btnLogout) btnLogout.addEventListener('click', (e)=>{ e.preventDefault(); logout(); });
  }
});

// Botão de logout
document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html'; 
      });
    }
  });
  