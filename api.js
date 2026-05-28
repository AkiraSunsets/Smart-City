document.addEventListener('DOMContentLoaded', function() {
    // Configurações da API (Sincronizadas com o PDF de Endpoints oficiais da escola)
    const API_BASE_URL = 'http://192.168.0.101:8000/api';
    const AUTH_ENDPOINT = `${API_BASE_URL}/token/`;
    const REFRESH_ENDPOINT = `${API_BASE_URL}/token/refresh/`;
    
    // IDs dos sensores do vosso grupo
    const TEMP_SENSOR_ID = 5;
    const HUMIDITY_SENSOR_ID = 6;
    
    // Credenciais padrão do projeto
    const CREDENTIALS = {
        username: 'smart_city',
        password: 'senai501'
    };

    // Variáveis globais de controle de sessão e mapeamento
    let jwtToken = null;
    let refreshToken = null;
    let sensorsCache = {}; // Armazena { id: { localizacao: "Lab X", responsavel: "SCRM-X", tipo: "Temperatura" } }

    // Mapeamento dos elementos do HTML em Alto Contraste
    const tempElement = document.getElementById('valor-temperatura');
    const humidityElement = document.getElementById('valor-umidade');
    const dataTempElement = document.getElementById('data-temperatura');
    const localTempElement = document.getElementById('local-temperatura');
    const dataHumElement = document.getElementById('data-umidade');
    const localHumElement = document.getElementById('local-umidade');
    const historyBody = document.getElementById('history-body');

    // Elementos da nova secção dinâmica de outros sensores
    const seletorSensores = document.getElementById('seletor-sensores');
    const painelOutroSensor = document.getElementById('painel-outro-sensor');
    const iconeOutroWrapper = document.getElementById('icone-outro-wrapper');
    const iconeOutroSensor = document.getElementById('icone-outro-sensor');
    const nomeOutroSensor = document.getElementById('nome-outro-sensor');
    const valorOutroSensor = document.getElementById('valor-outro-sensor');
    const dataOutroSensor = document.getElementById('data-outro-sensor');
    const localOutroSensor = document.getElementById('local-outro-sensor');
    const responsavelOutroSensor = document.getElementById('responsavel-outro-sensor');

    // Funções de formatação amigável de data e hora locais
    function formatDateBR(date) {
        return date.toLocaleDateString('pt-BR');
    }

    function formatTimeBR(date) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // 1. OBTENÇÃO DO TOKEN JWT (POST /api/token/)
    async function getToken() {
        try {
            const response = await fetch(AUTH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(CREDENTIALS)
            });

            if (!response.ok) throw new Error('Falha na autenticação');

            const data = await response.json();
            jwtToken = data.access;
            refreshToken = data.refresh;
            console.log('Login efetuado! Token de autenticação ativo.');
            return true;
        } catch (error) {
            console.error('Erro ao autenticar:', error);
            showError('Erro de Login');
            return false;
        }
    }

    // 2. RENOVAÇÃO DO TOKEN EXPIRADO (POST /api/token/refresh/)
    async function refreshTokenIfNeeded() {
        try {
            const response = await fetch(REFRESH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (!response.ok) return await getToken();

            const data = await response.json();
            jwtToken = data.access;
            return true;
        } catch (error) {
            return await getToken();
        }
    }

    // 3. FUNÇÃO AUXILIAR PARA REQUISIÇÕES AUTENTICADAS (Bearer Token)
    async function makeAuthenticatedRequest(url, options = {}) {
        if (!jwtToken) {
            const authSuccess = await getToken();
            if (!authSuccess) return null;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`,
                    ...options.headers
                }
            });

            if (response.status === 401) {
                const refreshSuccess = await refreshTokenIfNeeded();
                if (refreshSuccess) return makeAuthenticatedRequest(url, options);
                return null;
            }

            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Erro ao acessar endereço: ${url}`, error);
            return null;
        }
    }

    // 4. MAPEAR METADADOS DOS SENSORES DA ESCOLA (GET /api/sensores/)
    async function fetchSensorsMetadata() {
        console.log("Puxando a lista completa de sensores cadastrados no ecossistema...");
        const sensorsList = await makeAuthenticatedRequest(`${API_BASE_URL}/sensores/`);
        
        if (sensorsList && Array.isArray(sensorsList)) {
            sensorsList.forEach(sensor => {
                sensorsCache[sensor.id] = {
                    localizacao: sensor.localizacao || "Ambiente Indefinido",
                    responsavel: sensor.responsavel || "Sem Equipe Atribuída",
                    tipo: sensor.tipo || "Temperatura" // Identifica dinamicamente a natureza do dispositivo
                };
            });
            console.log("Mapeamento de sensores concluído com sucesso:", sensorsCache);
        } else {
            // Backup Estático Seguro (Evita que a tela fique em branco caso a rota falhe)
            sensorsCache[TEMP_SENSOR_ID] = { localizacao: "Laboratório 03", responsavel: "SCRM-05", tipo: "Temperatura" };
            sensorsCache[HUMIDITY_SENSOR_ID] = { localizacao: "Laboratório 03", responsavel: "SCRM-06", tipo: "Umidade" };
        }
    }

    // 5. PREENCHER O MENU SELECT COM OS OUTROS SENSORES DA ESCOLA
    function popularMenuSensores() {
        // Limpa opções antigas mantendo apenas a primeira descritiva
        seletorSensores.innerHTML = '<option value="">Selecione um ambiente para consultar...</option>';
        
        Object.keys(sensorsCache).forEach(id => {
            // Regra de Negócio: Exclui do seletor os sensores principais monitorados pelo grupo
            if (id != TEMP_SENSOR_ID && id != HUMIDITY_SENSOR_ID) {
                const sensor = sensorsCache[id];
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${sensor.tipo} - ${sensor.localizacao} (ID: ${id})`;
                seletorSensores.appendChild(option);
            }
        });
    }

    // 6. EVENTO LISTENER PARA CONSULTAR QUALQUER OUTRO SENSOR SELECIONADO
    seletorSensores.addEventListener('change', async function(e) {
        const selectedId = e.target.value;
        
        if (!selectedId) {
            painelOutroSensor.style.display = 'none';
            return;
        }

        const sensorMeta = sensorsCache[selectedId];
        // Determina dinamicamente o endpoint e o sufixo com base no tipo mapeado no cache
        const isHumidity = sensorMeta.tipo.toLowerCase().includes('umi') || sensorMeta.tipo.toLowerCase().includes('hum');
        const endpointFilter = isHumidity ? `${API_BASE_URL}/umidade_filter/` : `${API_BASE_URL}/temperatura_filter/`;
        const unitSuffix = isHumidity ? ' %' : ' °C';

        // Executa a requisição baseada nos padrões recomendados via POST filtrado
        const latestData = await makeAuthenticatedRequest(endpointFilter, {
            method: 'POST',
            body: JSON.stringify({ sensor_id: parseInt(selectedId), latest: true })
        });

        if (latestData && latestData.valor) {
            painelOutroSensor.style.display = 'block';
            nomeOutroSensor.textContent = sensorMeta.tipo;
            valorOutroSensor.textContent = `${parseFloat(latestData.valor).toFixed(1)}${unitSuffix}`;
            
            // Tratamento visual dinâmico com base na grandeza medida
            if (isHumidity) {
                valorOutroSensor.className = "sensor-value hum-text";
                iconeOutroWrapper.className = "icon-wrapper hum";
                iconeOutroSensor.className = "bi bi-droplet-fill";
            } else {
                valorOutroSensor.className = "sensor-value temp-text";
                iconeOutroWrapper.className = "icon-wrapper temp";
                iconeOutroSensor.className = "bi bi-thermometer-half";
            }

            if (latestData.timestamp) {
                const dateObj = new Date(latestData.timestamp);
                dataOutroSensor.textContent = `${formatDateBR(dateObj)} às ${formatTimeBR(dateObj)}`;
            }
            
            localOutroSensor.textContent = sensorMeta.localizacao;
            responsavelOutroSensor.textContent = `Equipe: ${sensorMeta.responsavel}`;
        } else {
            painelOutroSensor.style.display = 'block';
            valorOutroSensor.textContent = "S/ SINAL";
            valorOutroSensor.className = "sensor-value loading-state";
            dataOutroSensor.textContent = "--";
            localOutroSensor.textContent = sensorMeta.localizacao;
            responsavelOutroSensor.textContent = `Equipe: ${sensorMeta.responsavel}`;
        }
    });

    // 7. ATUALIZA OS CARDS PRINCIPAIS DO GRUPO EM TEMPO REAL
    function updateDisplay(tempData, humidityData) {
        // --- TEMPERATURA PRINCIPAL ---
        if (tempData.valor) {
            tempElement.textContent = `${parseFloat(tempData.valor).toFixed(1)} °C`;
        }
        if (tempData.timestamp) {
            const dateObj = new Date(tempData.timestamp);
            dataTempElement.textContent = `${formatDateBR(dateObj)} às ${formatTimeBR(dateObj)}`;
        }
        const tempId = tempData.sensor || TEMP_SENSOR_ID;
        localTempElement.textContent = sensorsCache[tempId]?.localizacao || "Laboratório 03";

        // --- UMIDADE PRINCIPAL ---
        if (humidityData.valor) {
            humidityElement.textContent = `${parseFloat(humidityData.valor).toFixed(1)} %`;
        }
        if (humidityData.timestamp) {
            const dateObj = new Date(humidityData.timestamp);
            dataHumElement.textContent = `${formatDateBR(dateObj)} às ${formatTimeBR(dateObj)}`;
        }
        const humId = humidityData.sensor || HUMIDITY_SENSOR_ID;
        localHumElement.textContent = sensorsCache[humId]?.localizacao || "Laboratório 03";
    }

    // 8. CRIAÇÃO DINÂMICA DA TABELA DE HISTÓRICO (ÚLTIMOS 15 REGISTROS)
    function loadHistory(tempHistory, humHistory) {
        historyBody.innerHTML = '';

        if (!humHistory || !humHistory.length) {
            historyBody.innerHTML = `<tr><td colspan="4" class="loading-state">Sem medições registradas</td></tr>`;
            return;
        }

        // Ordenação decrescente de timestamp (mais recente no topo)
        const sortedHumHistory = [...humHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const last15Records = sortedHumHistory.slice(0, 15);

        last15Records.forEach(humItem => {
            const humDate = new Date(humItem.timestamp);
            let closestTemp = null;
            let minDiff = Infinity;

            // Pareamento inteligente de medições por aproximação temporal milimétrica
            if (tempHistory && tempHistory.length) {
                tempHistory.forEach(tempItem => {
                    const tempTime = new Date(tempItem.timestamp).getTime();
                    const humTime = humDate.getTime();
                    const diff = Math.abs(tempTime - humTime);

                    if (diff < minDiff) {
                        minDiff = diff;
                        closestTemp = tempItem;
                    }
                });
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDateBR(humDate)}</td>
                <td>${formatTimeBR(humDate)}</td>
                <td>${closestTemp ? parseFloat(closestTemp.valor).toFixed(1) : '--'} °C</td>
                <td>${parseFloat(humItem.valor).toFixed(1)} %</td>
            `;
            historyBody.appendChild(tr);
        });
    }

    // 9. COLETAR DADOS EM TEMPO REAL DOS ENDPOINTS FILTRADOS DO GRUPO
    async function fetchSensorData() {
        // Obter últimos dados em tempo real
        const tempLatest = await makeAuthenticatedRequest(`${API_BASE_URL}/temperatura_filter/`, {
            method: 'POST',
            body: JSON.stringify({ sensor_id: TEMP_SENSOR_ID, latest: true })
        });

        const humidityLatest = await makeAuthenticatedRequest(`${API_BASE_URL}/umidade_filter/`, {
            method: 'POST',
            body: JSON.stringify({ sensor_id: HUMIDITY_SENSOR_ID, latest: true })
        });

        if (tempLatest && humidityLatest) {
            updateDisplay(tempLatest, humidityLatest);
        }

        // Obter conjuntos completos para montagem do histórico
        const tempHistory = await makeAuthenticatedRequest(`${API_BASE_URL}/temperatura_filter/`, {
            method: 'POST',
            body: JSON.stringify({ sensor_id: TEMP_SENSOR_ID })
        });

        const humidityHistory = await makeAuthenticatedRequest(`${API_BASE_URL}/umidade_filter/`, {
            method: 'POST',
            body: JSON.stringify({ sensor_id: HUMIDITY_SENSOR_ID })
        });

        const tData = Array.isArray(tempHistory) ? tempHistory : (tempHistory?.dados || []);
        const hData = Array.isArray(humidityHistory) ? humidityHistory : (humidityHistory?.dados || []);
        
        loadHistory(tData, hData);
    }

    // 10. EXIBIÇÃO TRATADA DE QUEDA DE REDE OU FALHA DE LOGIN
    function showError(message) {
        tempElement.textContent = 'ERRO';
        humidityElement.textContent = 'ERRO';
        localTempElement.textContent = message;
        localHumElement.textContent = message;
    }

    // 11. ANCORAGEM E SCROLL SUAVE CORRIGIDO COM OFFSET FIXO
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================
    // INICIALIZAÇÃO DO ECOSSISTEMA DO DASHBOARD
    // ==========================================
    (async function init() {
        const authed = await getToken();
        if (authed) {
            // Passo A: Carrega o cache completo de metadados da escola
            await fetchSensorsMetadata();
            
            // Passo B: Popula dinamicamente a área de consulta do seletor obrigatório
            popularMenuSensores();
            
            // Passo C: Efetua a primeira renderização dos dados do próprio grupo
            await fetchSensorData(); 
            
            // Passo D: Ativa o ciclo de Auto-refresh contínuo (A cada 5 segundos)
            setInterval(fetchSensorData, 5000); 
        }
    })();
});
