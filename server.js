/**
 * SafeWire — server.js
 * ---------------------------------------------------------------
 * Backend responsável por:
 *  1) Servir o dashboard (safewire-app.html) como arquivo estático;
 *  2) Receber os dados do ESP32/ESP8266 via HTTP POST em /api/temperature;
 *  3) Retransmitir cada leitura em tempo real para todos os dashboards
 *     conectados através do WebSocket (Socket.io), evento "esp_data".
 *
 * O servidor NÃO inventa nem simula temperaturas: ele apenas repassa
 * o que o dispositivo físico enviar. Enquanto nenhum POST chegar para
 * uma tomada, o dashboard mantém aquele ponto como "offline".
 * ---------------------------------------------------------------
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // em produção, restrinja para o domínio do seu dashboard
});

const PORT = process.env.PORT || 3000;

/* ------------------------- Middlewares ------------------------- */
app.use(cors());
app.use(express.json());

// Serve o dashboard e outros arquivos estáticos da mesma pasta do server.js.
// Coloque o arquivo "safewire-app.html" nesta pasta (ou ajuste o caminho abaixo).
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'safewire-app.html'));
});

/* ------------------------- Histórico em memória (opcional) -------------------------
 * Guarda a última leitura de cada dispositivo, útil para depuração via GET.
 * Isso NÃO substitui o armazenamento por usuário feito no próprio dashboard
 * (localStorage); é apenas um espelho simples do lado do servidor.
 * ------------------------------------------------------------------------------- */
const lastReadings = {}; // device_id -> { user_token, device_id, temperature, timestamp }

/* ------------------------- Rota principal do ESP ------------------------- */
app.post('/api/temperature', (req, res) => {
  const { user_token, device_id, temperature, timestamp } = req.body || {};

  // Validação básica do payload
  if (!user_token || !device_id || typeof temperature !== 'number') {
    return res.status(400).json({
      ok: false,
      error: 'Payload inválido. Esperado: { user_token, device_id, temperature, timestamp }',
    });
  }

  const reading = {
    user_token,
    device_id,
    temperature,
    timestamp: timestamp || Date.now(),
  };

  lastReadings[device_id] = reading;

  // Retransmite em tempo real para todos os dashboards conectados.
  // O frontend filtra pelo user_token para exibir apenas os dados do usuário logado.
  io.emit('esp_data', reading);

  console.log(`[SafeWire] ${device_id} -> ${temperature.toFixed(1)}°C (${new Date(reading.timestamp).toLocaleTimeString('pt-BR')})`);

  return res.status(200).json({ ok: true, received: reading });
});

/* ------------------------- Rota auxiliar de depuração ------------------------- */
app.get('/api/last/:device_id', (req, res) => {
  const reading = lastReadings[req.params.device_id];
  if (!reading) return res.status(404).json({ ok: false, error: 'Nenhuma leitura recebida ainda para este dispositivo.' });
  res.json({ ok: true, reading });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), devices: Object.keys(lastReadings) });
});

/* ------------------------- WebSocket ------------------------- */
io.on('connection', (socket) => {
  console.log('[SafeWire] Dashboard conectado via WebSocket:', socket.id);
  socket.on('disconnect', () => {
    console.log('[SafeWire] Dashboard desconectado:', socket.id);
  });
});

/* ------------------------- Start ------------------------- */
server.listen(PORT, () => {
  console.log(`SafeWire server rodando em http://localhost:${PORT}`);
  console.log(`Rota do ESP: POST http://<IP-DESTE-PC>:${PORT}/api/temperature`);
});
