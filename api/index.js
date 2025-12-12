// api/index.js
// Baseado no seu server.js, atualizado para Vercel/Serverless

// Importando bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const path = require('path'); 

const app = express();

// --- Variáveis de Configuração (Pronto para Vercel) ---
// CHAVE SECRETA: Lida da variável de ambiente (process.env.SECRET_KEY)
const SECRET_KEY = process.env.SECRET_KEY || 'SUA_CHAVE_SECRETA_PADRAO_DE_SEGURANCA_BAIXA'; 
// ---------------------------------------------

// Configuração da conexão ao banco de dados (PRONTO PARA DEPLOY)
// Estes valores serão lidos das suas Environment Variables no Vercel.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME
});

// Conectando ao banco de dados (Serverless)
db.connect(err => {
    if (err) {
        // Apenas loga o erro, não encerra o Serverless Function, que é o ideal no Vercel.
        console.error('🛑 Falha ao conectar ao banco de dados:', err);
    } else {
        console.log('✅ Conectado ao banco de dados MySQL!');
    }
});


// Aplicando middleware
app.use(cors()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 


// ------------------------------------------------------------------
// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// ------------------------------------------------------------------

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        jwt.verify(bearerToken, SECRET_KEY, (err, authData) => {
            if (err) {
                return res.status(403).json({ message: 'Acesso negado ou token inválido.' }); 
            }
            req.authData = authData;
            next();
        });
    } else {
        res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' }); 
    }
}


// ------------------------------------------------------------------
// --- ROTAS PÚBLICAS (/api/eventos e /api/eventos/:id) ---
// ------------------------------------------------------------------

// Endpoint 1: Listar todos os itens (PÚBLICO)
app.get('/api/eventos', (req, res) => {
    const sql = 'SELECT * FROM eventos ORDER BY data_evento DESC, hora_evento DESC, nome ASC';
    db.query(sql, (err, results) => {
        if (err) { 
            console.error('Erro ao listar eventos:', err);
            return res.status(500).json({ error: err.message }); 
        }
        res.json(results);
    });
});

// Endpoint 2: Buscar item por ID (PÚBLICO)
app.get('/api/eventos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM eventos WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.json(results[0]);
    });
});


// ------------------------------------------------------------------
// --- ROTA DE LOGIN (/api/login) ---
// ------------------------------------------------------------------

// Endpoint 3: Login do Administrador
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE usuario = ?'; 
    db.query(sql, [usuario], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const user = results[0];
        
        // Compara a senha fornecida com o hash no banco (necessita da coluna 'senha_hash' no DB)
        const isMatch = await bcrypt.compare(senha, user.senha_hash); 

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }
        
        // Geração do Token (expira em 1 hora)
        const token = jwt.sign({ id: user.id, usuario: user.usuario }, SECRET_KEY, { expiresIn: '1h' }); 
        res.json({ token });
    });
});

// ------------------------------------------------------------------
// --- ROTAS PROTEGIDAS (/api/...) ---
// ------------------------------------------------------------------

// Endpoint 4: Cadastrar novo item (PROTEGIDO)
app.post('/api/eventos', verifyToken, (req, res) => {
    const { nome, descricao, tipo, data_evento, hora_evento } = req.body;

    if (!nome || !descricao || !tipo) {
        return res.status(400).json({ message: 'Nome, descrição e tipo são obrigatórios.' });
    }

    const sql = 'INSERT INTO eventos (nome, descricao, tipo, data_evento, hora_evento) VALUES (?, ?, ?, ?, ?)'; 
    const values = [nome, descricao, tipo, data_evento || null, hora_evento || null]; 

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Erro ao inserir evento:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
            message: 'Item cadastrado com sucesso!', 
            id: result.insertId 
        });
    });
});

// Endpoint 5: Editar item (PROTEGIDO)
app.put('/api/eventos/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, tipo, data_evento, hora_evento } = req.body;

    if (!nome || !descricao || !tipo) {
        return res.status(400).json({ message: 'Nome, descrição e tipo são obrigatórios.' });
    }

    const sql = 'UPDATE eventos SET nome = ?, descricao = ?, tipo = ?, data_evento = ?, hora_evento = ? WHERE id = ?';
    const values = [nome, descricao, tipo, data_evento || null, hora_evento || null, id];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Erro ao atualizar evento:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        res.status(200).json({ message: 'Item atualizado com sucesso!' });
    });
});

// Endpoint 6: Excluir item (PROTEGIDO)
app.delete('/api/eventos/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM eventos WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.status(204).send(); 
    });
});

// Endpoint 7: Resetar o Auto Increment da tabela eventos (PROTEGIDO)
app.post('/api/manutencao/reset-id', verifyToken, (req, res) => {
    const sql = 'ALTER TABLE eventos AUTO_INCREMENT = 1'; 
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Erro ao resetar o ID:', err);
            return res.status(500).json({ message: 'Falha ao resetar o contador de ID.', error: err.message });
        }
        res.status(200).json({ 
            message: 'Contador de ID da tabela eventos resetado com sucesso para 1 (ou o próximo valor disponível).',
            detalhe: result 
        });
    });
});


// ----------------------------------------------------
// --- EXPORTANDO PARA O VERCEL ---
// ----------------------------------------------------
// Exporta o aplicativo Express para ser usado pelo Vercel como uma Serverless Function.
module.exports = app;

// O Vercel gerencia a inicialização do servidor. Você não precisa mais do app.listen().
