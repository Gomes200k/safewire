# SafeWire — Guia de integração ESP → Servidor → Dashboard

Este guia liga as três pontas do sistema:

```
ESP32/ESP8266 + DS18B20  --HTTP POST-->  server.js  --Socket.io-->  dashboard (safewire-app.html)
```

## 1. Estrutura de pastas

```
safewire/
├── server.js
├── package.json
├── public/
│   └── safewire-app.html          <-- dashboard servido pelo server.js
├── firmware_safewire_esp32/
│   └── firmware_safewire_esp32.ino  <-- abrir na Arduino IDE
├── index.html                     <-- cópia do dashboard (modo demo, sem servidor)
└── GUIA_INTEGRACAO.md
```

## 2. Instalar o servidor Node.js

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

No terminal, dentro da pasta `safewire-server`:

```bash
npm install
```

Isso vai instalar `express`, `cors` e `socket.io` conforme o `package.json`.

## 3. Rodar o servidor

```bash
npm start
```

Você verá algo como:

```
SafeWire server rodando em http://localhost:3000
Rota do ESP: POST http://<IP-DESTE-PC>:3000/api/temperature
```

Abra `http://localhost:3000` no navegador para ver o dashboard já servido pelo próprio servidor (recomendado, evita problemas de CORS/porta).

## 4. Descobrir o IP do computador na rede local

O ESP precisa falar com o IP do computador (não `localhost`), pois são dispositivos diferentes na mesma rede Wi-Fi.

- **Windows**: `ipconfig` → veja "Endereço IPv4" (ex.: `192.168.0.100`)
- **macOS/Linux**: `ifconfig` ou `ip a` → veja o IP da interface Wi-Fi (ex.: `192.168.0.100`)

Anote esse IP — ele vai para o firmware do ESP.

## 5. Pegar o Token de integração do dashboard

1. Faça login no dashboard (ou use a conta demo `demo@safewire.com` / `123456`).
2. Vá em **Configurações → Token de integração IoT**.
3. Copie o token (formato `sw_live_...`).
4. Cadastre a tomada em **Minhas Tomadas** com o **ID do dispositivo** exatamente igual ao que você vai usar no firmware (ex.: `SW-001`).

## 6. Configurar e gravar o firmware no ESP32/ESP8266

1. Abra `firmware_safewire_esp32.ino` na Arduino IDE.
2. Instale as bibliotecas (Gerenciador de Bibliotecas):
   - `OneWire`
   - `DallasTemperature`
3. Instale o suporte à placa:
   - ESP32: adicione a URL do Board Manager da Espressif e instale "esp32" pelo Gerenciador de Placas.
   - ESP8266: adicione a URL do Board Manager da comunidade ESP8266 e instale "esp8266".
4. No topo do arquivo, ajuste:
   ```cpp
   #define USE_ESP32   1   // mude para 0 se estiver usando ESP8266
   const char* WIFI_SSID     = "NOME_DA_SUA_REDE_WIFI";
   const char* WIFI_PASSWORD = "SENHA_DA_SUA_REDE_WIFI";
   const char* SERVER_HOST   = "192.168.0.100";   // IP do PC (passo 4)
   const int   SERVER_PORT   = 3000;
   const char* USER_TOKEN    = "sw_live_XXXXXXXXXX"; // token do passo 5
   const char* DEVICE_ID     = "SW-001";             // igual ao cadastrado no dashboard
   ```
5. Ligação física do DS18B20:
   - VCC → 3V3
   - GND → GND
   - DATA → GPIO 4 (com resistor de pull-up de 4,7 kΩ entre DATA e VCC)
6. Selecione a placa e a porta correta na Arduino IDE e grave o firmware.
7. Abra o **Monitor Serial** (115200 baud) para acompanhar as leituras e o envio.

## 7. Verificar o funcionamento ponta a ponta

1. Com o `server.js` rodando e o ESP ligado e conectado ao Wi-Fi, observe no terminal do servidor:
   ```
   [SafeWire] SW-001 -> 42.3°C (14:02:11)
   ```
2. No dashboard (aba **Conectar Dispositivo**), a tomada deve passar de "🔴 Desconectado" para "🟢 Conectado", com a última temperatura recebida atualizada.
3. O indicador no topo do dashboard ("Servidor: conectado") confirma que o WebSocket está ativo.
4. Troque para o modo **🟢 REAL** no topo do dashboard para garantir que nenhuma leitura simulada está sendo exibida junto com os dados reais.

## 8. Solução de problemas comuns

| Sintoma | Causa provável |
|---|---|
| ESP não conecta ao Wi-Fi | SSID/senha incorretos, ou rede 5GHz (ESP só conecta em 2,4GHz) |
| Servidor não recebe nada | IP errado no firmware, PC e ESP em redes diferentes, firewall bloqueando a porta 3000 |
| Dashboard não atualiza | `safewire-app.html` não está na pasta `public/`, ou o navegador está aberto em outro servidor/porta |
| Tomada continua "offline" no dashboard | `device_id` do firmware não bate com o "ID do dispositivo" cadastrado, ou `user_token` incorreto |
| "Sensor não encontrado" no Monitor Serial | Fiação do DS18B20 incorreta ou falta o resistor de pull-up de 4,7 kΩ |

## 9. Produção / apresentação na FECEAP

- Para a apresentação, mantenha o notebook com o `server.js` rodando conectado à mesma rede Wi-Fi do ESP.
- Se a rede da feira não permitir comunicação direta entre dispositivos, use o **modo 🟡 DEMO** do dashboard como alternativa de contingência — ele já está pronto e claramente identificado como dado simulado.
