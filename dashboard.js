// ===============================
// CONFIGURAR SUPABASE
// ===============================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.42.5/+esm";

const SUPABASE_URL = "https://bjbikfopvjtvcusffrjp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmlrZm9wdmp0dmN1c2ZmcmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDk1NjEsImV4cCI6MjA3ODAyNTU2MX0.lWD6NrbeqwdB2KhBRUKk5jy822bcWe4ufIhQ58s_2dc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabase;


// ===============================
// FUNÇÃO PARA FORMATAR HORA (HH:MM)
// ===============================
function formatarHora(date = new Date()) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}


// ===============================
// CARREGAR USUÁRIO LOGADO
// ===============================
let usuario = null;

async function carregarUsuario() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  usuario = sessionData.session.user;
  document.getElementById("userInfo").innerText = usuario.email;
}

carregarUsuario();


// ===============================
// LOCALIZAÇÃO SEMPRE = "REMOTO"
// ===============================
async function pegarLocalizacao() {
  return "REMOTO";
}


// ===============================
// REGISTRAR ENTRADA E SAÍDA
// ===============================
document.getElementById("btnPonto").addEventListener("click", async () => {
  if (!usuario) return;

  const hoje = new Date().toISOString().split("T")[0];
  const agora = formatarHora(); // hora bonitinha
  const local = "REMOTO";

  const { data: registros, error } = await supabase
    .from("pontos")
    .select("*")
    .eq("user_id", usuario.id)
    .eq("data", hoje)
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    alert("Erro ao consultar registros: " + error.message);
    return;
  }

  const ultimo = registros?.[0];


  // ======================
  // NOVO REGISTRO → ENTRADA
  // ======================
  if (!ultimo || (ultimo.hora_entrada && ultimo.hora_saida)) {
    const { error } = await supabase
      .from("pontos")
      .insert({
        user_id: usuario.id,
        data: hoje,
        hora_entrada: agora,
        localizacao: local
      });

    if (error) {
      alert("Erro ao registrar entrada!");
      return;
    }

    document.getElementById("mensagem").innerText = "Entrada registrada!";
    carregarHistorico();
    return;
  }


  // ======================
  // EXISTE ENTRADA → REGISTRAR SAÍDA
  // ======================
  if (ultimo.hora_entrada && !ultimo.hora_saida) {
    const h1 = new Date(`${hoje}T${ultimo.hora_entrada}`);
    const h2 = new Date(`${hoje}T${formatarHora()}`);
    const total = ((h2 - h1) / 1000 / 60 / 60).toFixed(2);

    const { error } = await supabase
      .from("pontos")
      .update({
        hora_saida: agora,
        total_horas: total
      })
      .eq("id", ultimo.id);

    if (error) {
      alert("Erro ao registrar saída!");
      return;
    }

    document.getElementById("mensagem").innerText = "Saída registrada!";
    carregarHistorico();
  }
});


// ===============================
// CARREGAR HISTÓRICO
// ===============================
async function carregarHistorico() {
  if (!usuario) return;

  const { data, error } = await supabase
    .from("pontos")
    .select("*")
    .eq("user_id", usuario.id)
    .order("id", { ascending: false });

  if (error) return;

  const tbody = document.querySelector("#tabelaPontos tbody");
  tbody.innerHTML = "";

  data.forEach((p) => {
    // formatação de horas antes de mostrar
    const entrada = p.hora_entrada ? p.hora_entrada.slice(0, 5) : "-";
    const saida = p.hora_saida ? p.hora_saida.slice(0, 5) : "-";

    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${p.data}</td>
      <td>${entrada}</td>
      <td>${saida}</td>
      <td>REMOTO</td>
      <td>${p.total_horas ?? "-"}</td>
      <td><button class="btnExcluir" data-id="${p.id}">Excluir</button></td>
    `;

    tbody.appendChild(linha);
  });

  document.querySelectorAll(".btnExcluir").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await supabase.from("pontos").delete().eq("id", id);
      carregarHistorico();
    });
  });
}

carregarHistorico();


// ===============================
// LOGOUT
// ===============================
document.getElementById("btnLogout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});
