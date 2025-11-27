import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

import { configDotenv } from "dotenv";
configDotenv(); // CORRETO

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// =========================================================
//  LISTAR USERS (GET /users)
// =========================================================
app.get('/users', async (req, res) => {
    try {
        let { data, error } = await supabase.from('users').select('*');

        if (error) {
            return res.status(500).json({ error });
        }

        res.json(data);
    } catch (error) {
        console.log("ERRO /users " + error);
        res.status(500).json({ error: error.message });
    }
});


// =========================================================
//  CRIAR USER (POST /users)
// =========================================================
app.post('/users', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Todos os campos são obrigatórios." });
        }

        const { data, error } = await supabase
            .from('users')
            .insert([{ nome, email, senha }])
            .select()
            .single();

        if (error) return res.status(500).json({ error });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =========================================================
//  LISTAR PONTOS (GET /pontos)
// =========================================================
app.get('/pontos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pontos')
            .select(`
                id,
                data,
                hora_entrada,
                hora_saida,
                localizacao,
                total_horas,
                users (
                    id,
                    nome,
                    email
                )
            `);

        if (error) return res.status(500).json({ error });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =========================================================
//  CRIAR PONTO (POST /pontos)
// =========================================================
app.post('/pontos', async (req, res) => {
    try {
        const { user_id, data, hora_entrada, hora_saida, localizacao, total_horas } = req.body;

        if (!user_id || !data || !hora_entrada) {
            return res.status(400).json({ error: "user_id, data e hora_entrada são obrigatórios." });
        }

        const { data: result, error } = await supabase
            .from('pontos')
            .insert([{ user_id, data, hora_entrada, hora_saida, localizacao, total_horas }])
            .select()
            .single();

        if (error) return res.status(500).json({ error });

        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =========================================================
//  Servidor
// =========================================================
app.listen(3000, () => {
    console.log("API rodando em http://localhost:3000");
});
