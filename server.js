const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const path = require('path');
const { saveToken, loadToken } = require('./config/tokenStore');

const app = express();

app.use(cors());
app.use(express.json());

// Configurações globais
const API_CONFIG = {
    apikey: '43c740cba09bc98605ca53908213f46e',
    token: null,
    baseURL: 'https://api.service24gps.com/api/v1',
    credentials: {
        username: 'GLOBALTRAK24H.FELIPE', 
        password: '68J-5$!QXR@#Gtk.'    
    },
    tokenExpiration: null
};

// Função para obter novo token
async function getNewToken() {
    try {
        const formData = new FormData();
        formData.append('apikey', API_CONFIG.apikey);
        formData.append('token', '');
        formData.append('username', API_CONFIG.credentials.username);
        formData.append('password', API_CONFIG.credentials.password);
        formData.append('get_info', '1');

        const response = await axios.post(
            `${API_CONFIG.baseURL}/gettoken`,
            formData,
            { 
                headers: formData.getHeaders(),
                validateStatus: false
            }
        );

        if (response.data && response.data.status === 200 && response.data.data.token) {
            API_CONFIG.token = response.data.data.token;
            const timeLeftMs = response.data.data.time_left * 60 * 1000;
            API_CONFIG.tokenExpiration = Date.now() + timeLeftMs;
            
            // Salvar token no arquivo
            await saveToken(API_CONFIG.token, API_CONFIG.tokenExpiration);
            
            console.log('Novo token obtido e salvo com sucesso:', {
                token: API_CONFIG.token,
                expiraEm: new Date(API_CONFIG.tokenExpiration).toLocaleString()
            });
            return true;
        }

        throw new Error(`Falha ao obter token. Resposta: ${JSON.stringify(response.data)}`);
    } catch (error) {
        console.error('Erro completo:', error);
        throw error;
    }
}

// Middleware para verificar e renovar o token
const checkToken = async (req, res, next) => {
    try {
        // Primeiro, tenta carregar o token do arquivo se não estiver em memória
        if (!API_CONFIG.token) {
            const savedToken = await loadToken();
            if (savedToken) {
                API_CONFIG.token = savedToken.token;
                API_CONFIG.tokenExpiration = savedToken.expiration;
            }
        }

        // Verifica se precisa renovar o token
        if (!API_CONFIG.token || !API_CONFIG.tokenExpiration || Date.now() >= API_CONFIG.tokenExpiration) {
            await getNewToken();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erro na autenticação', details: error.message });
    }
};

// Aplicar middleware de verificação de token em todas as rotas
app.use(checkToken);

//ROTA PARA CRIAR UM RASTREADOR
app.post('/createDevice', async (req, res) => {
    const { tipo, nombre, imei, marca, modelo, zona } = req.body;

    try {
        const formData = new FormData();
        formData.append('apikey', API_CONFIG.apikey);
        formData.append('token', API_CONFIG.token);
        formData.append('tipo_equipo', tipo);
        formData.append('nombre', nombre);
        formData.append('imei', imei);
        formData.append('marca', marca);
        formData.append('modelo', modelo);
        formData.append('idzona_horaria', zona);

        const response = await axios.post(
            `${API_CONFIG.baseURL}/createDevice`,
            formData,
            { headers: formData.getHeaders() }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao fazer a requisição para a API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao cadastrar o dispositivo', details: error.response ? error.response.data : error.message });
    }
});

// ROTA PARA ATUALIZAR UM RASTREADOR
app.post('/updateDevice', async (req, res) => {
    const { iddevice, tipo, nombre, imei, marca, modelo, estado } = req.body;

    try {
        const formData = new FormData();
        formData.append('apikey', API_CONFIG.apikey);
        formData.append('token', API_CONFIG.token);
        formData.append('iddevice', iddevice); // ID do equipamento a ser atualizado
        formData.append('tipo_equipo', tipo);
        formData.append('nombre', nombre);
        formData.append('marca', marca);
        formData.append('modelo', modelo);
        formData.append('estado', estado);
        formData.append('imei', imei);

        const response = await axios.post(
            `${API_CONFIG.baseURL}/updateDevice`,
            formData,
            { headers: formData.getHeaders() }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao fazer a requisição para a API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao atualizar o dispositivo', details: error.response ? error.response.data : error.message });
    }
});

// ROTA PARA CRIAR UM SIM CARD (CHIP)
app.post('/setSIM', async (req, res) => {
    const { nombre, nro_tel, id_compania, es_prepago, zona, nro_nip } = req.body;

    try {
        const formData = new FormData();
        formData.append('apikey', API_CONFIG.apikey);
        formData.append('token', API_CONFIG.token);
        formData.append('nombre', nombre);
        formData.append('nro_tel', nro_tel);
        formData.append('id_compania', id_compania);
        formData.append('es_prepago', es_prepago);
        formData.append('idzona_horaria', zona); 
        formData.append('nro_nip', nro_nip);

        const response = await axios.post(
            `${API_CONFIG.baseURL}/setSim`,
            formData,
            { headers: formData.getHeaders() }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao fazer a requisição para a API:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Erro ao cadastrar o SIM Card',
            details: error.response ? error.response.data : error.message
        });
    }
});

// ROTA PARA LISTAR VEÍCULOS
app.get('/vehicles', async (req, res) => {
    try {
        const formData = new FormData();
        formData.append('apikey', API_CONFIG.apikey);
        formData.append('token', API_CONFIG.token);

        const response = await axios.post(
            `${API_CONFIG.baseURL}/vehicleGetAll`,
            formData,
            { headers: formData.getHeaders() }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao listar veículos:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao listar veículos', details: error.response ? error.response.data : error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    try {
        // Tenta carregar token existente ao iniciar
        const savedToken = await loadToken();
        if (savedToken && savedToken.expiration > Date.now()) {
            API_CONFIG.token = savedToken.token;
            API_CONFIG.tokenExpiration = savedToken.expiration;
            console.log('Token carregado do arquivo:', {
                token: API_CONFIG.token,
                expiraEm: new Date(API_CONFIG.tokenExpiration).toLocaleString()
            });
        } else {
            // Se não houver token válido, obtém um novo
            await getNewToken();
        }
        console.log(`Servidor rodando na porta ${PORT}`);
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error.message);
    }
});