import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://bjbikfopvjtvcusffrjp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmlrZm9wdmp0dmN1c2ZmcmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDk1NjEsImV4cCI6MjA3ODAyNTU2MX0.lWD6NrbeqwdB2KhBRUKk5jy822bcWe4ufIhQ58s_2dc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabase; // <-- AQUI!

// ======================================================
// FUNÇÕES ÚTEIS
// ======================================================
function qs(id) { return document.getElementById(id); }
function getPontos() { return JSON.parse(localStorage.getItem('pontos')) || []; }
function setPontos(p) { localStorage.setItem('pontos', JSON.stringify(p)); }


// ======================================================
// TELA LOGIN / CADASTRO
// ======================================================
function mostrarCadastro() {
  qs('loginForm').style.display = 'none';
  qs('cadastroForm').style.display = 'block';
}
function mostrarLogin() {
  qs('cadastroForm').style.display = 'none';
  qs('loginForm').style.display = 'block';
}


// ======================================================
// CADASTRO (SUPABASE)
// ======================================================
async function cadastrarUsuario() {
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

  // Criar usuário sem confirmação de e-mail
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: null, // impede redirecionamento
    }
  });

  if (error) {
    msgCadastro.style.color = 'red';
    msgCadastro.textContent = "Erro: " + error.message;
    return;
  }

  const userId = data.user?.id;

  // Salvar dados adicionais na tabela "usuarios"
  await supabase.from("usuarios").insert({
    id_auth: userId,
    nome,
    email,
    cargo,
    departamento,
  });

  msgCadastro.style.color = 'green';
  msgCadastro.textContent = 'Conta criada com sucesso!';

  setTimeout(mostrarLogin, 1200);
}



// ======================================================
// LOGIN (SUPABASE)
// ======================================================
async function login() {
  const email = qs('emailLogin').value.trim();
  const senha = qs('senhaLogin').value.trim();
  const erroLogin = qs('erroLogin');

  erroLogin.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha,
  });

  if (error) {
    erroLogin.textContent = 'E-mail ou senha inválidos.';
    return;
  }

  // Salvar user na sessão local
  localStorage.setItem('usuarioLogado', JSON.stringify(data.user));

  // Vai para o dashboard
  window.location.href = 'dashboard.html';
}


// ======================================================
// CARREGAR USUÁRIO LOGADO
// ======================================================
function carregarUsuario() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  const userInfo = qs('userInfo');
  if (userInfo) userInfo.textContent = `Bem-vindo, ${user.email}`;
  return user;
}


// ======================================================
// LOCALIZAÇÃO / BATER PONTO
// ======================================================
async function buscarLocalizacao() {
  return "Remoto"; // placeholder
}

async function baterPonto() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!user) return;

  const registros = getPontos();
  const agora = new Date();
  const agoraMs = agora.getTime();
  const dataStr = agora.toLocaleDateString();

  const registroHoje = registros.find(r =>
    r.userId === user.id && r.data === dataStr && !r.horaSaida
  );

  if (registroHoje) {
    if (!registroHoje.horaEntradaTS && registroHoje.horaEntrada) {
      const parsed = parseDateTimeToMs(registroHoje.data, registroHoje.horaEntrada);
      registroHoje.horaEntradaTS = parsed;
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
    const cidade = await buscarLocalizacao();
    const novoPonto = {
      id: Date.now(),
      userId: user.id,
      data: dataStr,
      horaEntrada: agora.toLocaleTimeString(),
      horaEntradaTS: agoraMs,
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


// ======================================================
// HISTÓRICO DO PONTO
// ======================================================
function carregarHistorico() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!user) return;

  const registros = getPontos();
  const meusPontos = registros.filter(p => p.userId === user.id).sort((a, b) => b.id - a.id);

  const tbody = document.querySelector('#tabelaPontos tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  meusPontos.forEach(p => {
    if (!p.horaEntradaTS && p.horaEntrada) {
      const parsed = parseDateTimeToMs(p.data, p.horaEntrada);
      if (parsed) p.horaEntradaTS = parsed;
    }

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

  tbody.querySelectorAll('.btnDel').forEach(b => {
    b.addEventListener('click', (e) => excluirPonto(Number(e.target.dataset.id)));
  });

  tbody.querySelectorAll('.btnEdit').forEach(b => {
    b.addEventListener('click', (e) => editarPontoPrompt(Number(e.target.dataset.id)));
  });
}


// ======================================================
// EDITAR / EXCLUIR
// ======================================================
function excluirPonto(id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) return;
  const registros = getPontos().filter(r => r.id !== id);
  setPontos(registros);
  carregarHistorico();
}

function editarPontoPrompt(id) {
  const registros = getPontos();
  const ponto = registros.find(r => r.id === id);
  if (!ponto) return alert('Registro não encontrado.');

  const novaObs = prompt("Observação (opcional):", ponto.observacao || "");
  if (novaObs === null) return;
  ponto.observacao = novaObs;

  setPontos(registros);
  carregarHistorico();
}


// ======================================================
// CONVERSÃO DE DATA/HORA
// ======================================================
function parseDateTimeToMs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [dd, mm, yyyy] = dateStr.split('/').map(n => parseInt(n));
  const [hh, min, sec] = timeStr.split(':').map(n => parseInt(n) || 0);
  return new Date(yyyy, mm - 1, dd, hh, min, sec).getTime();
}


// ======================================================
// LOGOUT
// ======================================================
function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'index.html';
}


// ======================================================
// INICIALIZAÇÃO DA PÁGINA
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (qs('btnLogin') || qs('btnCadastro')) {
    qs('linkCadastro')?.addEventListener('click', (e) => { e.preventDefault(); mostrarCadastro(); });
    qs('linkLogin')?.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });

    qs('btnLogin')?.addEventListener('click', (e) => { e.preventDefault(); login(); });
    qs('btnCadastro')?.addEventListener('click', (e) => { e.preventDefault(); cadastrarUsuario(); });
  }

  if (path.includes("dashboard.html")) {
    carregarUsuario();
    carregarHistorico();
    qs('btnPonto')?.addEventListener('click', (e) => { e.preventDefault(); baterPonto(); });
    qs('btnLogout')?.addEventListener('click', () => logout());
  }
});

