// ===============================
// CONFIGURAR SUPABASE
// ===============================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.42.5/+esm";

const SUPABASE_URL = "https://bjbikfopvjtvcusffrjp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmlrZm9wdmp0dmN1c2ZmcmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDk1NjEsImV4cCI6MjA3ODAyNTU2MX0.lWD6NrbeqwdB2KhBRUKk5jy822bcWe4ufIhQ58s_2dc";


export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabase;

// ===============================
// CARREGAR USUÁRIO LOGADO
// ===============================
let usuario = null;

async function carregarUsuario() {
  // Primeiro tenta pegar a sessão
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
// PEGAR LOCALIZAÇÃO DO USUÁRIO
// ===============================
function pegarLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve("Localização indisponível");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const txt = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        resolve(txt);
      },
      () => resolve("Localização negada")
    );
  });
}

// ===============================
// REGISTRAR ENTRADA OU SAÍDA
// ===============================
document.getElementById("btnPonto").addEventListener("click", async () => {
  if (!usuario) return;

  const hoje = new Date().toISOString().split("T")[0];

  // Verificar se já existe entrada hoje
  const { data: registros } = await supabase
    .from("pontos")
    .select("*")
    .eq("user_id", usuario.id)
    .eq("data", hoje)
    .order("id", { ascending: false })
    .limit(1);

  const local = await pegarLocalizacao();
  const agora = new Date().toLocaleTimeString("pt-BR", { hour12: false });

  // ============================
  // 1) Registrar ENTRADA
  // ============================
  const { data: registros, error } = await supabase
  .from("pontos")
  .select("*")
  .eq("user_id", usuario.id)
  .eq("data", hoje)
  .order("id", { ascending: false })
  .limit(1);

  console.log("SELECT registros →", registros, error);

  // Se deu erro no SELECT → provavelmente é problema de RLS
  if (error) {
    alert("Erro ao consultar registros: " + error.message);
    return;
  }

  // Se registros é null, vira array vazio
  const lista = registros ?? [];

  if (lista.length === 0 || (lista[0].hora_entrada !== null && lista[0].hora_saida !== null)) {
    
    if (error) {
      alert("Erro ao registrar entrada.");
      return;
    }

    document.getElementById("mensagem").innerText = "Entrada registrada!";
    carregarHistorico();
    return;
  }

  // ============================
  // 2) Registrar SAÍDA
  // ============================
  const registro = registros[0];

  if (registro.hora_entrada && !registro.hora_saida) {
    const h1 = new Date(`${hoje}T${registro.hora_entrada}`);
    const h2 = new Date(`${hoje}T${agora}`);
    const total = ((h2 - h1) / 1000 / 60 / 60).toFixed(2);

    const { error } = await window.supabase
      .from("pontos")
      .update({
        hora_saida: agora,
        total_horas: total
      })
      .eq("id", registro.id);

    if (error) {
      alert("Erro ao registrar saída.");
      return;
    }

    document.getElementById("mensagem").innerText = "Saída registrada!";
    carregarHistorico();
    return;
  }
});

// ===============================
// CARREGAR HISTÓRICO
// ===============================
async function carregarHistorico() {
  if (!usuario) return;

  const { data, error } = await window.supabase
    .from("pontos")
    .select("*")
    .eq("user_id", usuario.id)
    .order("id", { ascending: false });

  if (error) return;

  const tbody = document.querySelector("#tabelaPontos tbody");
  tbody.innerHTML = "";

  data.forEach((p) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${p.data}</td>
      <td>${p.hora_entrada ?? "-"}</td>
      <td>${p.hora_saida ?? "-"}</td>
      <td>${p.localizacao ?? "-"}</td>
      <td>${p.total_horas ?? "-"}</td>
      <td><button class="btnExcluir" data-id="${p.id}">Excluir</button></td>
    `;

    tbody.appendChild(linha);
  });

  // Eventos excluir
  document.querySelectorAll(".btnExcluir").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");

      await window.supabase.from("pontos").delete().eq("id", id);
      carregarHistorico();
    });
  });
}

carregarHistorico();

// ===============================
// LOGOUT
// ===============================
document.getElementById("btnLogout").addEventListener("click", async () => {
  await window.supabase.auth.signOut();
  window.location.href = "index.html";
});

