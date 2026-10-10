const mineflayer = require('mineflayer');

// ============ KONFIGURASI MANUAL ============
const CONFIG = {
  host: 'host.zettanode.my.id',
  port: 19131,
  version: '1.21',

  // ==== BOT & SESSION ====
  totalBots: 1000,          // total bot yang mau dijalankan
  sessionSize: 5,         // bot per session (per batch spawn)
  sessionDelay: 5000,     // jeda antar session (ms)

  // ==== TIMING ====
  delayRegisterLogin: 1500, // jeda antar command (/register, /login, /sv2)
  reconnectDelay: 8000,     // jeda sebelum reconnect setelah disconnect (ms)

  // ==== AUTH ====
  password: 'iikgmg iikgmg',
  serverCmd: '/sv2',

  // ==== NAMA ====
  namePrefix: 'Rxxy',
  nameLength: 8,

  // ==== DEBUG ====
  verbose: false          // true = tampilkan semua chat server
};
// ============================================

// Generate random username
function randomName(prefix, length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix + s;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Statistik global
const stats = { connected: 0, total: 0, reconnects: 0 };

// ===== Bot wrapper dengan auto-reconnect =====
class BotSession {
  constructor(username) {
    this.username = username;
    this.bot = null;
    this.reconnectTimer = null;
    this.stopped = false;
    this.connect();
  }

  connect() {
    if (this.stopped) return;
    console.log(`[+] ${this.username} connecting...`);

    try {
      this.bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: this.username,
        version: CONFIG.version,
        auth: 'offline',
        hideErrors: true
      });
    } catch (err) {
      console.log(`[!] ${this.username} createBot error: ${err.message}`);
      this.scheduleReconnect();
      return;
    }

    let spawned = false;

    this.bot.once('spawn', async () => {
      spawned = true;
      stats.connected++;
      console.log(`[✓] ${this.username} spawned (${stats.connected}/${stats.total} online)`);

      try {
        await sleep(CONFIG.delayRegisterLogin);
        if (!this.bot || !this.bot.entity) return;
        this.bot.chat(`/register ${CONFIG.password} ${CONFIG.password}`);

        await sleep(CONFIG.delayRegisterLogin);
        if (!this.bot || !this.bot.entity) return;
        this.bot.chat(`/login ${CONFIG.password}`);

        await sleep(CONFIG.delayRegisterLogin);
        if (!this.bot || !this.bot.entity) return;
        this.bot.chat(CONFIG.serverCmd);
      } catch (e) {
        console.log(`[!] ${this.username} command error: ${e.message}`);
      }
    });

    this.bot.on('message', (msg) => {
      const text = msg.toString();
      if (CONFIG.verbose || /register|login|berhasil|success|already|sudah|gagal|wrong|salah|kick|ban/i.test(text)) {
        console.log(`[${this.username}] ${text}`);
      }
    });

    this.bot.on('kicked', (reason) => {
      let r = reason;
      try { r = JSON.stringify(reason); } catch {}
      console.log(`[✗] ${this.username} kicked: ${r}`);
    });

    this.bot.on('error', (err) => {
      // biar ga spam, skip error umum
      if (!/ECONNRESET|EPIPE|ETIMEDOUT/i.test(err.message)) {
        console.log(`[!] ${this.username} error: ${err.message}`);
      }
    });

    this.bot.on('end', () => {
      if (spawned) {
        stats.connected = Math.max(0, stats.connected - 1);
        console.log(`[-] ${this.username} disconnect (${stats.connected}/${stats.total} online)`);
      }
      this.bot = null;
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    // jitter biar ga barengan
    const delay = CONFIG.reconnectDelay + Math.floor(Math.random() * 3000);
    this.reconnectTimer = setTimeout(() => {
      stats.reconnects++;
      this.connect();
    }, delay);
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.bot) {
      try { this.bot.quit(); } catch {}
      try { this.bot.end(); } catch {}
    }
  }
}

// ===== Main =====
(async () => {
  console.log(`=== Starting ${CONFIG.totalBots} bots ke ${CONFIG.host}:${CONFIG.port} (v${CONFIG.version}) ===`);
  console.log(`=== Session size: ${CONFIG.sessionSize}, delay antar session: ${CONFIG.sessionDelay}ms ===`);

  const sessions = [];
  const usedNames = new Set();

  for (let i = 0; i < CONFIG.totalBots; i++) {
    let name;
    do { name = randomName(CONFIG.namePrefix, CONFIG.nameLength); } while (usedNames.has(name));
    usedNames.add(name);
    sessions.push({ name, started: false });
  }

  stats.total = sessions.length;

  // spawn per session
  for (let i = 0; i < sessions.length; i += CONFIG.sessionSize) {
    const batch = sessions.slice(i, i + CONFIG.sessionSize);
    console.log(`\n--- Session ${Math.floor(i / CONFIG.sessionSize) + 1}: spawning ${batch.length} bot ---`);
    for (const s of batch) {
      if (s.started) continue;
      s.started = true;
      s.instance = new BotSession(s.name);
      await sleep(500); // jeda kecil antar bot dalam satu session
    }
    if (i + CONFIG.sessionSize < sessions.length) {
      console.log(`--- Nunggu ${CONFIG.sessionDelay}ms sebelum session berikutnya ---`);
      await sleep(CONFIG.sessionDelay);
    }
  }

  console.log(`\n=== Semua ${CONFIG.totalBots} bot sudah di-spawn, auto-reconnect aktif ===\n`);

  // Statistik tiap 30 detik
  setInterval(() => {
    console.log(`📊 Online: ${stats.connected}/${stats.total} | Reconnects: ${stats.reconnects}`);
  }, 30000);

  // Handle CTRL+C → matikan semua bot dengan rapi
  process.on('SIGINT', () => {
    console.log('\n[!] Shutting down...');
    sessions.forEach((s) => s.instance && s.instance.stop());
    setTimeout(() => process.exit(0), 1500);
  });
})();
