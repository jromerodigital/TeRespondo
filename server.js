// server.js - Servidor de Producción para Railway & Local (Zero-Dependencies)
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Cargar variables de .env si existe en local
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (_) {}
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = fs.existsSync(DIST_DIR) ? DIST_DIR : path.join(__dirname, 'public');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yfkhtxwhdsdbztnrrqiv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UbUlPOZONHDLxYDNWtgz_A_36DRqzNc';
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'waitlist_leads';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Formateador de fecha en hora oficial de Lima, Perú: "DD/MM/YYYY HH:mm"
function formatLimaDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}`;
}

function readJsonBody(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload demasiado grande'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  // Cabeceras de Seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqPath = req.url.split('?')[0];

  // Healthcheck para Railway
  if (req.method === 'GET' && (reqPath === '/health' || reqPath === '/api/health')) {
    sendJson(res, 200, {
      status: 'ok',
      service: 'terespondo-landing',
      uptime: Math.round(process.uptime()),
      timestamp: formatLimaDateTime(new Date())
    });
    return;
  }

  // Endpoint Backend para registro de Leads en Supabase (Oculta credenciales y tablas al navegador)
  if (req.method === 'POST' && reqPath === '/api/lead') {
    try {
      const data = await readJsonBody(req);
      const cleanName = String(data.fullName || '').trim();
      const cleanPhone = String(data.phone || '').trim();
      const cleanEmail = String(data.email || '').trim().toLowerCase();
      const serviceType = String(data.serviceType || '').trim();
      const dailyMessages = String(data.dailyMessages || 'Entre 10 y 50 al día').trim();

      if (!cleanName || !cleanPhone || !cleanEmail || !serviceType) {
        sendJson(res, 400, { ok: false, error: 'Todos los campos son obligatorios.' });
        return;
      }

      const fechaLima = formatLimaDateTime(new Date());
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      const tempPassword = digitsOnly.length >= 6 ? digitsOnly : `${cleanPhone}TR2026`;

      // 1. Crear usuario en Supabase Auth -> crea fila en `profiles` con status = "pending"
      const authPromise = fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: tempPassword,
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            service_type: serviceType,
            daily_messages: dailyMessages,
            status: 'pending',
            fecha_registro_lima: fechaLima
          }
        })
      }).catch(() => ({ ok: false }));

      // 2. Insertar cabecera en `waitlist_leads`
      const leadPromise = fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          full_name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          service_type: serviceType,
          daily_messages: dailyMessages,
          fecha_registro_lima: fechaLima,
          status: 'pending'
        })
      }).catch(() => ({ ok: false }));

      const [authRes, leadRes] = await Promise.all([authPromise, leadPromise]);

      if (!authRes.ok && !leadRes.ok) {
        sendJson(res, 502, { ok: false, error: 'Error al registrar en el servidor.' });
        return;
      }

      sendJson(res, 200, { ok: true, fecha_registro_lima: fechaLima });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: 'Solicitud inválida.' });
    }
    return;
  }

  // Archivos estáticos
  let safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip') && (ext === '.html' || ext === '.js' || ext === '.css')) {
        zlib.gzip(content, (gzipErr, compressed) => {
          if (gzipErr) {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
          }
          res.writeHead(200, { 'Content-Type': contentType, 'Content-Encoding': 'gzip' });
          res.end(compressed);
        });
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 TeRespondo Landing Page corriendo en vivo:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`🌐 Listo para producción y Railway (${HOST}:${PORT})`);
  console.log(`=================================================`);
});
