# 🏙️ Smart City - Dashboard IoT

![Status do Projeto](https://img.shields.io/badge/Status-Concluído-success)
![Versão](https://img.shields.io/badge/Versão-1.0-blue)
![SENAI](https://img.shields.io/badge/Instituição-SENAI_Roberto_Mange-red)

O **Smart City** é um projeto de Internet das Coisas (IoT) desenvolvido para monitorar variáveis ambientais (temperatura e umidade) em tempo real dentro do ecossistema educacional do SENAI. Através de sensores físicos e uma interface web moderna, o sistema capta, processa e exibe dados críticos para a automação e controle de ambientes, especificamente no Laboratório 03.

---

## ✨ Funcionalidades

* **Monitoramento em Tempo Real:** Atualização automática das medições do grupo a cada 5 segundos.
* **Autenticação Segura:** Consumo de API RESTful utilizando tokens JWT (com sistema de *refresh* automático).
* **Histórico Inteligente:** Tabela dinâmica exibindo os últimos 15 registros com pareamento temporal milimétrico entre sensores distintos.
* **Mapeamento Global:** Consulta em tempo real aos demais sensores espalhados pela escola (via select dinâmico) com base em cache de metadados.
* **Interface *High Contrast*:** Design focado em acessibilidade e conforto visual, construído com tema Dark Mode nativo e detalhes em neon.

---

## 🛠️ Tecnologias e Instrumentos Utilizados

O projeto é dividido entre **Hardware** (coleta) e **Software** (processamento e exibição).

### Hardware (Camada Física)
* **ESP32:** Microcontrolador com Wi-Fi nativo responsável por processar o sinal digital.
* **Sensor DHT11:** Módulo com termistor NTC para temperatura e substrato de condutividade para umidade.
* **Componentes Auxiliares:** Protoboard, cabos jumpers, bateria/pilha, e invólucro de proteção com botão ON/OFF.

### Software (Camada Lógica)
* **Frontend:** HTML5, CSS3 (Variáveis CSS, Flexbox/Grid, Animações) e Vanilla JavaScript.
* **Integração:** Fetch API para requisições assíncronas (POST/GET).
* **Backend Externo:** Servidor local na rede da escola (`192.168.0.101:8000`) utilizando arquitetura REST e endpoints filtrados.

---

## ⚙️ Como Funciona a Arquitetura

1. **Coleta:** O sensor DHT11 realiza as leituras físicas do ambiente.
2. **Processamento:** O ESP32 converte os pulsos digitais em valores numéricos exatos.
3. **Transmissão:** A cada intervalo de tempo, o microcontrolador realiza um POST HTTP via Wi-Fi para o servidor central.
4. **Exibição:** O Dashboard web (este repositório) autentica-se na API via JWT, consome os dados atualizados e renderiza a interface interativa para o usuário final.

---

## 🚀 Como Executar o Projeto Localmente

Como o projeto é construído em tecnologias web nativas (Vanilla JS), não é necessário nenhum processo de *build* complexo para a interface.

1. Clone este repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/Smart-City.git](https://github.com/SEU_USUARIO/Smart-City.git)
