const mineflayer = require('mineflayer');

// ============ KONFIGURASI MANUAL ============
const CONFIG = {
  host: 'alwination.id',         // IP server
  port: 25565,              // Port server
  version: '1.21',          // Versi Minecraft
  botCount: 5,              // Jumlah bot
  password: 'rxxykontol',       // Password register/login
  serverCmd: '/sv2',        // Command setelah login
  delayBetweenBots: 3000,   // Jeda antar spawn bot (ms)
  delayRegisterLogin: 2000, // Jeda antar command (ms)
  namePrefix: 'Rxxy',       // Awalan nama bot
  nameLength: 8             // Panjang random suffix (total 12 char)
};
// ============================================

// Generate random username: Rxxy + random alfanumerik
function randomName(prefix, length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

// Sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Buat 1 bot
function createBot(username) {
  console.log(`[+] Spawning bot: ${username}`);

  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: username,
    version: CONFIG.version,
    auth: 'offline'
  });

  bot.once('spawn', async () => {
    console.log(`[✓] ${username} spawned di server`);

    // Step 1: Register
    await sleep(CONFIG.delayRegisterLogin);
    bot.chat(`/register ${CONFIG.password} ${CONFIG.password}`);
    console.log(`[→] ${username} mengirim /register`);

    // Step 2: Login
    await sleep(CONFIG.delayRegisterLogin);
    bot.chat(`/login ${CONFIG.password}`);
    console.log(`[→] ${username} mengirim /login`);

    // Step 3: Kirim /sv2
    await sleep(CONFIG.delayRegisterLogin);
    bot.chat(CONFIG.serverCmd);
    console.log(`[→] ${username} mengirim ${CONFIG.serverCmd}`);
  });

  // Log pesan penting dari server
  bot.on('message', (msg) => {
    const text = msg.toString();
    if (
      /register|login|berhasil|success|already|sudah|gagal|wrong|salah/i.test(text)
    ) {
      console.log(`[${username}] ${text}`);
    }
  });

  bot.on('kicked', (reason) => {
    console.log(`[✗] ${username} kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[!] ${username} error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`[-] ${username} disconnect`);
  });

  return bot;
}

// Main: spawn banyak bot berurutan
(async () => {
  console.log(`=== Spawning ${CONFIG.botCount} bot ke ${CONFIG.host}:${CONFIG.port} (v${CONFIG.version}) ===`);

  const bots = [];
  const usedNames = new Set();

  for (let i = 0; i < CONFIG.botCount; i++) {
    let name;
    do {
      name = randomName(CONFIG.namePrefix, CONFIG.nameLength);
    } while (usedNames.has(name));

    usedNames.add(name);
    bots.push(createBot(name));

    if (i < CONFIG.botCount - 1) {
      await sleep(CONFIG.delayBetweenBots);
    }
  }

  console.log(`=== Semua ${CONFIG.botCount} bot sudah di-spawn ===`);
})();