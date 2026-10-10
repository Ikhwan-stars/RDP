import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import crypto from 'crypto';

/* ============================ CONFIG ============================ */
const BOT_TOKEN = '8859828766:AAGUvoL0FYR7J3L6vfcOyFEtjUQS0nAzlJY';
const ADMIN_ID = '8809271296';

const cfg = {
  key: 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0',
  idt: 'https://www.googleapis.com/identitytoolkit/v3/relyingparty',
  stk: 'https://securetoken.googleapis.com/v1/token',
  vfy: 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase'
};

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

/* ======================== HELPER UTILS ========================== */
const dip = () =>
  [
    crypto.randomInt(1, 255),
    crypto.randomInt(0, 255),
    crypto.randomInt(0, 255),
    crypto.randomInt(1, 255)
  ].join('.');

const sp = (h) => ({
  ...h,
  'x-forwarded-for': dip(),
  'x-real-ip': dip(),
  'client-ip': dip(),
  'x-client-ip': dip(),
  'x-originating-ip': dip(),
  'x-cluster-client-ip': dip()
});

const h1 = {
  'content-type': 'application/json',
  'x-android-package': 'com.alightcreative.motion',
  'x-android-cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
  'user-agent':
    'dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)'
};

const h2 = {
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'okhttp/3.12.1',
  'accept-encoding': 'gzip'
};

const bad = (e) => {
  const d = e.response?.data;
  return d
    ? typeof d === 'object'
      ? JSON.stringify(d)
      : String(d)
    : e.message;
};

const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const divider = '━━━━━━━━━━━━━━━━━━━━━━━';

/* ========================== SESSION STORE ======================= */
const sessions = new Map();

const getSession = (chatId) => {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { email: null, step: 'idle', messageId: null });
  }
  return sessions.get(chatId);
};

/* ========================== CORE LOGIC ========================== */
async function link(email) {
  const c1 = { identifier: email, continueUri: 'http://localhost' };
  const c2 = {
    requestType: 6,
    email: email,
    androidInstallApp: true,
    canHandleCodeInApp: true,
    continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
    iosBundleId: 'com.alightcreative.motion',
    androidPackageName: 'com.alightcreative.motion',
    androidMinimumVersion: '585',
    clientType: 'CLIENT_TYPE_ANDROID'
  };
  try {
    await axios.post(`${cfg.idt}/createAuthUri?key=${cfg.key}`, c1, {
      headers: sp(h1)
    });
    const r = await axios.post(
      `${cfg.idt}/getOobConfirmationCode?key=${cfg.key}`,
      c2,
      { headers: sp(h1) }
    );
    return { ok: true, r: r.data };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

function extractCode(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/&/g, '&');
  try {
    s = decodeURIComponent(s);
  } catch {}
  try {
    const u = new URL(s);
    let c = u.searchParams.get('oobCode');
    if (!c) {
      const n =
        u.searchParams.get('link') ||
        u.searchParams.get('q') ||
        u.searchParams.get('url');
      if (n) {
        try {
          c = new URL(n).searchParams.get('oobCode');
        } catch {}
      }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, '');
  } catch {}
  const m = s.match(/oobCode=([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  const t = raw.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes('://')) return t;
  return null;
}

async function auth(email, raw) {
  const c = extractCode(raw);
  if (!c) return { ok: false, why: 'Verification code not found in link' };
  try {
    const a = await axios.post(
      `${cfg.idt}/emailLinkSignin?key=${cfg.key}`,
      {
        email: email,
        oobCode: c,
        clientType: 'CLIENT_TYPE_ANDROID'
      },
      { headers: sp(h1) }
    );
    let u = null;
    try {
      const b = await axios.post(
        `${cfg.idt}/getAccountInfo?key=${cfg.key}`,
        { idToken: a.data.idToken },
        { headers: sp(h1) }
      );
      u = b.data?.users?.[0] || null;
    } catch {}
    return {
      ok: true,
      email: email,
      id: a.data.idToken,
      ref: a.data.refreshToken,
      uid: a.data.localId,
      isNew: !!a.data.isNewUser,
      user: u
    };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

async function pro(id) {
  const o = 'neo-' + crypto.randomBytes(6).toString('hex');
  const b = {
    data: {
      productId: 'am.full.sub.annual.19q4',
      token:
        'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw',
      skuType: 'subs',
      orderId: o
    }
  };
  const h = {
    ...h2,
    authorization: 'Bearer ' + id,
    'firebase-instance-id-token':
      'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI'
  };
  try {
    const r = await axios.post(cfg.vfy, b, { headers: sp(h) });
    return { ok: true, order: o, r: r.data };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

/* ========================== UI PANELS =========================== */
const mainMenu = (name) => ({
  text:
`<blockquote>❄️ <b>SnowyPay</b> — <i>Alight Motion Premium</i></blockquote>

${divider}

👋 Halo, <b>${escapeHtml(name)}</b>!

Bot ini mengaktifkan <b>Alight Motion Premium</b> ke akunmu
menggunakan verifikasi <i>email link</i> yang aman.
<b>Tanpa password</b>, tanpa data tersimpan.

${divider}

<blockquote>⚡ <b>Fitur</b>
• Instant Activation
• Secure Email Link
• No Password Required
• Annual Full Plan
• Zero Data Storage</blockquote>

${divider}

<i>Pilih menu di bawah untuk memulai 👇</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀  Mulai Aktivasi', callback_data: 'start_activation' }],
        [
          { text: '📖  Cara Kerja', callback_data: 'how' },
          { text: 'ℹ️  Tentang', callback_data: 'about' }
        ]
      ]
    }
  }
});

const step1Panel = () => ({
  text:
`<blockquote>📧  <b>Langkah 1 dari 3</b> — Masukkan Email</blockquote>

${divider}

Kirimkan <b>alamat email</b> yang terhubung dengan
akun <b>Alight Motion</b> kamu.

${divider}

<blockquote>⚠️ <b>Perhatian</b>
Pastikan email aktif & benar.
Link verifikasi akan dikirim ke inbox kamu.</blockquote>

${divider}

<i>Ketik email sekarang, atau tekan tombol di bawah untuk batal 👇</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '❌  Batal', callback_data: 'cancel' }]
      ]
    }
  }
});

const step2Panel = (email) => ({
  text:
`<blockquote>🔗  <b>Langkah 2 dari 3</b> — Paste Link Verifikasi</blockquote>

${divider}

📬 <b>Link sudah dikirim ke:</b>
<code>${escapeHtml(email)}</code>

${divider}

<blockquote>📌 <b>Cara ambil link</b>
1. Buka inbox email kamu
2. Cari email dari <b>Alight Creative</b>
3. Copy seluruh link verifikasi
4. Paste ke chat ini</blockquote>

${divider}

<i>Paste link verifikasi sekarang 👇</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄  Kirim Ulang Link', callback_data: 'resend_link' }],
        [
          { text: '✏️  Ganti Email', callback_data: 'change_email' },
          { text: '❌  Batal', callback_data: 'cancel' }
        ]
      ]
    }
  }
});

const successPanel = (data) => ({
  text:
`<blockquote>✅  <b>Premium Aktif</b> — Alight Motion</blockquote>

${divider}

🎉 Selamat! Akun kamu berhasil di-upgrade ke
<b>Alight Motion Premium</b>.

${divider}

<blockquote>📋 <b>Detail Akun</b>
• 📧 <b>Email</b> : <code>${escapeHtml(data.email)}</code>
• 🆔 <b>UID</b> : <code>${escapeHtml((data.uid || '—').slice(0, 20))}</code>
• 🧾 <b>Order</b> : <code>${escapeHtml(data.order || '—')}</code>
• 💎 <b>Plan</b> : Annual · Full
• 🟢 <b>Status</b> : ACTIVE</blockquote>

${divider}

<i>Buka Alight Motion & nikmati semua fitur premium 🚀</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔁  Aktivasi Akun Lain', callback_data: 'start_activation' }],
        [{ text: '🏠  Menu Utama', callback_data: 'menu' }]
      ]
    }
  }
});

const howPanel = () => ({
  text:
`<blockquote>📖  <b>Cara Kerja SnowyPay</b></blockquote>

${divider}

<blockquote><b>1️⃣  Masukkan Email</b>
Kirim email yang terhubung dengan akun Alight Motion kamu.</blockquote>

<blockquote><b>2️⃣  Paste Link Verifikasi</b>
Cek inbox, copy link dari Alight Creative, paste ke bot.</blockquote>

<blockquote><b>3️⃣  Premium Aktif</b>
Akun kamu langsung di-upgrade — tanpa password, tanpa ribet.</blockquote>

${divider}

<blockquote>🔒 <b>Keamanan</b>
Kredensial tidak pernah disimpan. Verifikasi via link
one-time Firebase yang expired setelah dipakai.</blockquote>

${divider}

<i>Tekan tombol di bawah untuk mulai 👇</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀  Mulai Aktivasi', callback_data: 'start_activation' }],
        [{ text: '🏠  Menu Utama', callback_data: 'menu' }]
      ]
    }
  }
});

const aboutPanel = () => ({
  text:
`<blockquote>ℹ️  <b>Tentang SnowyPay</b></blockquote>

${divider}

❄️ <b>SnowyPay</b> adalah layanan aktivasi
<b>Alight Motion Premium</b> berbasis Telegram bot.

${divider}

<blockquote>⚙️ <b>Teknologi</b>
• Firebase Email Link Auth
• Secure Token Exchange
• Purchase Verification API
• Anti-Detect IP Rotation</blockquote>

<blockquote>🛡️ <b>Privasi</b>
• Tanpa simpan password
• Tanpa simpan data pribadi
• One-time verification code</blockquote>

${divider}

<i>SnowyPay © ${new Date().getFullYear()} — All rights reserved.</i>`,
  options: {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀  Mulai Aktivasi', callback_data: 'start_activation' }],
        [{ text: '🏠  Menu Utama', callback_data: 'menu' }]
      ]
    }
  }
});

/* ========================== UI HELPERS ========================== */
const editOrSend = async (chatId, msgId, payload) => {
  try {
    if (msgId) {
      await bot.editMessageText(payload.text, {
        chat_id: chatId,
        message_id: msgId,
        ...payload.options
      });
      return msgId;
    }
  } catch (e) {}
  const sent = await bot.sendMessage(chatId, payload.text, payload.options);
  return sent.message_id;
};

/* ========================== ADMIN NOTIFY ======================== */
const notifyAdmin = async (text) => {
  if (!ADMIN_ID) return;
  try {
    await bot.sendMessage(ADMIN_ID, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error('[admin notify failed]', e.message);
  }
};

/* ========================== COMMANDS ============================ */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const s = getSession(chatId);
  s.step = 'idle';
  s.email = null;
  const sent = await bot.sendMessage(
    chatId,
    mainMenu(msg.from.first_name || 'Friend').text,
    mainMenu().options
  );
  s.messageId = sent.message_id;
});

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const s = getSession(chatId);
  s.step = 'idle';
  s.email = null;
  const sent = await bot.sendMessage(
    chatId,
    mainMenu(msg.from.first_name || 'Friend').text,
    mainMenu().options
  );
  s.messageId = sent.message_id;
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
`<blockquote>🆘  <b>Bantuan SnowyPay</b></blockquote>

${divider}

<b>Perintah tersedia:</b>
• /start — Mulai bot
• /menu — Menu utama
• /help — Bantuan ini

${divider}

<blockquote>💡 Jika link verifikasi tidak diterima:
• Cek folder <b>Spam</b> / <b>Promotions</b>
• Tunggu 1–2 menit
• Pastikan email benar</blockquote>

${divider}

<i>Butuh bantuan? Hubungi admin.</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠  Menu Utama', callback_data: 'menu' }]
        ]
      }
    }
  );
});

/* ========================== CALLBACKS =========================== */
bot.on('callback_query', async (q) => {
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;
  const s = getSession(chatId);
  const action = q.data;

  try {
    await bot.answerCallbackQuery(q.id);
  } catch {}

  if (action === 'menu') {
    s.step = 'idle';
    s.email = null;
    await editOrSend(chatId, msgId, mainMenu(q.from.first_name || 'Friend'));
    return;
  }

  if (action === 'how') {
    await editOrSend(chatId, msgId, howPanel());
    return;
  }

  if (action === 'about') {
    await editOrSend(chatId, msgId, aboutPanel());
    return;
  }

  if (action === 'cancel') {
    s.step = 'idle';
    s.email = null;
    await editOrSend(chatId, msgId, {
      text:
`<blockquote>❌  <b>Dibatalkan</b></blockquote>

${divider}

<i>Proses aktivasi dibatalkan.
Tekan tombol di bawah untuk memulai lagi 👇</i>`,
      options: {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀  Mulai Aktivasi', callback_data: 'start_activation' }],
            [{ text: '🏠  Menu Utama', callback_data: 'menu' }]
          ]
        }
      }
    });
    return;
  }

  if (action === 'start_activation' || action === 'change_email') {
    s.step = 'await_email';
    s.email = null;
    await editOrSend(chatId, msgId, step1Panel());
    return;
  }

  if (action === 'resend_link') {
    if (!s.email) {
      s.step = 'await_email';
      await editOrSend(chatId, msgId, step1Panel());
      return;
    }
    await editOrSend(chatId, msgId, {
      text: `<blockquote>⏳ <b>Mengirim ulang link...</b></blockquote>`,
      options: { parse_mode: 'HTML' }
    });
    const r = await link(s.email);
    if (!r.ok) {
      await editOrSend(chatId, msgId, {
        text:
`<blockquote>❌  <b>Gagal Kirim Ulang</b></blockquote>

${divider}

<blockquote><b>Reason:</b>
<code>${escapeHtml(r.why).slice(0, 300)}</code></blockquote>

${divider}

<i>Tekan tombol untuk coba lagi 👇</i>`,
        options: {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄  Coba Lagi', callback_data: 'resend_link' }],
              [
                { text: '✏️  Ganti Email', callback_data: 'change_email' },
                { text: '🏠  Menu', callback_data: 'menu' }
              ]
            ]
          }
        }
      });
      return;
    }
    s.step = 'await_link';
    await editOrSend(chatId, msgId, step2Panel(s.email));
    return;
  }
});

/* ========================== TEXT HANDLER ======================== */
bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const s = getSession(chatId);

  if (text.startsWith('/')) return;

  /* ---------- AWAIT EMAIL ---------- */
  if (s.step === 'await_email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      const sent = await bot.sendMessage(
        chatId,
`<blockquote>⚠️  <b>Email Tidak Valid</b></blockquote>

${divider}

<code>${escapeHtml(text)}</code>

${divider}

<i>Kirim alamat email yang benar,
contoh: <code>user@gmail.com</code></i>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌  Batal', callback_data: 'cancel' }]
            ]
          }
        }
      );
      s.messageId = sent.message_id;
      return;
    }

    const loading = await bot.sendMessage(
      chatId,
`<blockquote>⏳  <b>Mengirim link verifikasi...</b></blockquote>

${divider}

📧 <code>${escapeHtml(text)}</code>

${divider}

<i>Mohon tunggu sebentar...</i>`,
      { parse_mode: 'HTML' }
    );

    const r = await link(text);

    if (!r.ok) {
      await bot.editMessageText(
`<blockquote>❌  <b>Gagal Kirim Link</b></blockquote>

${divider}

<blockquote><b>Reason:</b>
<code>${escapeHtml(r.why).slice(0, 300)}</code></blockquote>

${divider}

<i>Coba lagi atau ganti email 👇</i>`,
        {
          chat_id: chatId,
          message_id: loading.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄  Coba Lagi', callback_data: 'resend_link' }],
              [
                { text: '✏️  Ganti Email', callback_data: 'change_email' },
                { text: '🏠  Menu', callback_data: 'menu' }
              ]
            ]
          }
        }
      );
      s.email = text;
      s.step = 'await_email';
      return;
    }

    s.email = text;
    s.step = 'await_link';

    await bot.editMessageText(step2Panel(text).text, {
      chat_id: chatId,
      message_id: loading.message_id,
      ...step2Panel(text).options
    });

    notifyAdmin(
`🔔 <b>New Activation</b>

${divider}

👤 <b>User:</b> <a href="tg://user?id=${msg.from.id}">${escapeHtml(msg.from.first_name || 'User')}</a>
🆔 <b>Chat ID:</b> <code>${chatId}</code>
📧 <b>Email:</b> <code>${escapeHtml(text)}</code>

${divider}

<i>Link terkirim — menunggu verifikasi.</i>`
    );
    return;
  }

  /* ---------- AWAIT LINK ---------- */
  if (s.step === 'await_link') {
    if (!s.email) {
      s.step = 'await_email';
      const sent = await bot.sendMessage(chatId, step1Panel().text, step1Panel().options);
      s.messageId = sent.message_id;
      return;
    }

    if (!text.includes('oobCode') && text.length < 10) {
      const sent = await bot.sendMessage(
        chatId,
`<blockquote>⚠️  <b>Link Tidak Valid</b></blockquote>

${divider}

Sepertinya itu bukan link verifikasi.
Pastikan kamu meng-copy <b>seluruh link</b> dari email.

${divider}

<i>Paste ulang link verifikasi 👇</i>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄  Kirim Ulang Link', callback_data: 'resend_link' },
                { text: '✏️  Ganti Email', callback_data: 'change_email' }
              ],
              [{ text: '❌  Batal', callback_data: 'cancel' }]
            ]
          }
        }
      );
      s.messageId = sent.message_id;
      return;
    }

    const loading = await bot.sendMessage(
      chatId,
`<blockquote>🔐  <b>Memverifikasi...</b></blockquote>

${divider}

📧 <code>${escapeHtml(s.email)}</code>

${divider}

<blockquote>1️⃣ Authenticating email link...
2️⃣ Promoting to Premium...</blockquote>`,
      { parse_mode: 'HTML' }
    );

    const v = await auth(s.email, text);

    if (!v.ok) {
      await bot.editMessageText(
`<blockquote>❌  <b>Verifikasi Gagal</b></blockquote>

${divider}

<blockquote><b>Stage:</b> Authentication
<b>Reason:</b>
<code>${escapeHtml(v.why).slice(0, 300)}</code></blockquote>

${divider}

<i>Kemungkinan link sudah expired atau sudah dipakai.
Kirim ulang link baru 👇</i>`,
        {
          chat_id: chatId,
          message_id: loading.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄  Kirim Ulang Link', callback_data: 'resend_link' }],
              [
                { text: '✏️  Ganti Email', callback_data: 'change_email' },
                { text: '🏠  Menu', callback_data: 'menu' }
              ]
            ]
          }
        }
      );
      s.step = 'await_link';
      return;
    }

    const p = await pro(v.id);

    if (!p.ok) {
      await bot.editMessageText(
`<blockquote>❌  <b>Aktivasi Gagal</b></blockquote>

${divider}

<blockquote><b>Stage:</b> Promote to Premium
<b>Reason:</b>
<code>${escapeHtml(p.why).slice(0, 300)}</code></blockquote>

${divider}

<i>Auth berhasil, tapi promo gagal.
Coba lagi beberapa saat 👇</i>`,
        {
          chat_id: chatId,
          message_id: loading.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄  Coba Lagi', callback_data: 'resend_link' }],
              [{ text: '🏠  Menu', callback_data: 'menu' }]
            ]
          }
        }
      );
      s.step = 'await_link';
      return;
    }

    s.step = 'idle';
    const successData = {
      email: v.email,
      uid: v.uid,
      order: p.order
    };

    await bot.editMessageText(successPanel(successData).text, {
      chat_id: chatId,
      message_id: loading.message_id,
      ...successPanel(successData).options
    });

    notifyAdmin(
`✅ <b>Activation Success</b>

${divider}

👤 <b>User:</b> <a href="tg://user?id=${msg.from.id}">${escapeHtml(msg.from.first_name || 'User')}</a>
🆔 <b>Chat ID:</b> <code>${chatId}</code>
📧 <b>Email:</b> <code>${escapeHtml(v.email)}</code>
🆔 <b>UID:</b> <code>${escapeHtml(v.uid || '—')}</code>
🧾 <b>Order:</b> <code>${escapeHtml(p.order)}</code>
💎 <b>Plan:</b> Annual · Full
🟢 <b>Status:</b> ACTIVE

${divider}

<i>SnowyPay © ${new Date().getFullYear()}</i>`
    );

    s.email = null;
    return;
  }

  /* ---------- IDLE ---------- */
  const sent = await bot.sendMessage(
    chatId,
    mainMenu(msg.from.first_name || 'Friend').text,
    mainMenu().options
  );
  s.messageId = sent.message_id;
});

/* ========================== ERROR HANDLING ====================== */
bot.on('polling_error', (e) => {
  console.error('[polling_error]', e.message);
});

process.on('unhandledRejection', (e) => {
  console.error('[unhandledRejection]', e);
});

console.log(`\x1b[36m%s\x1b[0m`, '❄  SnowyPay Bot is running...');
console.log(`\x1b[90m%s\x1b[0m`, '→ Send /start to your bot on Telegram');