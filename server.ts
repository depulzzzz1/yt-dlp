import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const app = express();
const PORT = 3000;

// Enable JSON middleware for request body decoding
app.use(express.json());

// In-memory system transaction logs
const serverLogs: string[] = [
  `[SYSTEM] UltraProMax production server initialized.`,
  `[SYSTEM] DNS authoritative resolver binding online.`,
  `[SYSTEM] High-contrast neon interface telemetry streaming.`
];

function addServerLog(msg: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logLine = `[${timestamp}] ${msg}`;
  serverLogs.push(logLine);
  if (serverLogs.length > 100) {
    serverLogs.shift(); // Keep logs memory bound
  }
  console.log(logLine);
}

// Indonesian custom carrier lookups based on phone prefixes
const detectCarrierName = (phoneStr: string): string => {
  const clean = phoneStr.replace(/\D/g, '');
  let normalized = clean;
  if (clean.startsWith('62')) {
    normalized = '0' + clean.slice(2);
  } else if (clean.startsWith('8')) {
    normalized = '0' + clean;
  }

  if (normalized.startsWith('08')) {
    const prefix4 = normalized.slice(0, 4);
    
    // Telkomsel
    if (['0811', '0812', '0813', '0821', '0822', '0823', '0852', '0853', '0851'].includes(prefix4)) {
      return "Telkomsel (kartuHALO / simPATI / KARTU As / Loop / by.U)";
    }
    // Indosat
    if (['0814', '0815', '0816', '0855', '0856', '0857', '0858'].includes(prefix4)) {
      return "Indosat Ooredoo (IM3 / Mentari)";
    }
    // XL
    if (['0817', '0818', '0819', '0859', '0877', '0878'].includes(prefix4)) {
      return "XL Axiata";
    }
    // Axis
    if (['0831', '0832', '0833', '0838'].includes(prefix4)) {
      return "Axis (XL Axiata)";
    }
    // Three
    if (['0895', '0896', '0897', '0898', '0899'].includes(prefix4)) {
      return "Hutchison Three (3)";
    }
    // Smartfren
    if (['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'].includes(prefix4)) {
      return "Smartfren Telecom";
    }
  }
  return "Unknown / Global Operator";
};

// --- API ROUTES ---

// 1. Core Health Probe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    uptime: process.uptime(),
    platform: os.platform(),
    cores: os.cpus().length,
    freeMemory: os.freemem(),
    totalMemory: os.totalmem()
  });
});

// 2. Cobalt Video / Audio Link Extractor Proxy
app.post('/api/download', async (req, res) => {
  const { url, videoQuality, isAudioOnly } = req.body;

  if (!url) {
    addServerLog(`API_ERR: Attempted extraction with missing URL.`);
    return res.status(400).json({ error: 'Missing target media URL.' });
  }

  addServerLog(`EXTRACT_REQUEST: URL=${url} QUALITY=${videoQuality} MODE=${isAudioOnly ? 'audio' : 'video'}`);

  try {
    const payload = {
      url: url,
      videoQuality: videoQuality || "720",
      isAudioOnly: !!isAudioOnly,
      filenamePattern: "classic"
    };

    // Forward to Cobalt API safely from backend
    const cobaltResponse = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!cobaltResponse.ok) {
      addServerLog(`COBALT_FAILED: Server returned status code ${cobaltResponse.status}`);
      throw new Error(`Extraction node returned HTTP code: ${cobaltResponse.status}`);
    }

    const data = await cobaltResponse.json();

    if (data.status === 'error') {
      addServerLog(`EXTRACT_API_ERROR: ${data.text || 'Unknown error'}`);
      return res.status(400).json({ error: data.text || "Cobalt engine failed to parse this video link." });
    }

    addServerLog(`EXTRACT_SUCCESS: Extracted stream. Filename="${data.filename || 'media'}"`);
    return res.json({
      status: 'ok',
      title: data.filename || 'Universal_Media_Stream',
      url: data.url,
      picker: !!data.picker
    });

  } catch (error: any) {
    addServerLog(`EXTRACT_FALLBACK_TRIGGERED: Extraction failed (${error.message}). Creating safe fallback redirection stream...`);
    
    // Create elegant fallback matching client logic
    let platform = "Universal";
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) platform = "Youtube";
    else if (u.includes("tiktok.com")) platform = "Tiktok";
    else if (u.includes("instagram.com")) platform = "Instagram";
    else if (u.includes("x.com") || u.includes("twitter.com")) platform = "Twitter/X";
    else if (u.includes("facebook.com") || u.includes("fb.watch")) platform = "Facebook";

    let cleanTitle = `${platform}_Media_Stream_Offline_Fallback`;
    
    return res.json({
      status: 'fallback',
      title: cleanTitle,
      url: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
      picker: false,
      message: 'Secure fallback channel route established successfully.'
    });
  }
});

// 3. Geolocation / ISP IP Lookup Proxy
app.post('/api/ip-lookup', async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    addServerLog(`API_ERR: IP Lookup attempted with missing IP.`);
    return res.status(400).json({ error: 'Missing IP address parameter.' });
  }

  addServerLog(`IP_LOOKUP: Querying credentials for IP [${ip}]`);

  try {
    const response = await fetch(`https://ipapi.co/${ip.trim()}/json/`);
    if (response.ok) {
      const data = await response.json();
      if (data.error) {
        throw new Error(data.reason || "Invalid IP address syntax.");
      }
      addServerLog(`IP_SUCCESS: IP [${ip}] resolved to ${data.city || 'N/A'}, ${data.country_name || 'N/A'}`);
      return res.json({
        ip: ip,
        country: data.country_name,
        country_code: data.country_code,
        region: data.region,
        city: data.city,
        postal: data.postal,
        isp: data.org,
        asn_org: data.asn,
        timezone: data.timezone
      });
    } else {
      // Fallback
      const responseFallback = await fetch(`https://ip-api.com/json/${ip.trim()}`);
      if (!responseFallback.ok) {
        throw new Error(`ISP server connection failed.`);
      }
      const dataFallback = await responseFallback.json();
      if (dataFallback.status === "fail") {
        throw new Error(dataFallback.message || "Invalid IP address.");
      }
      addServerLog(`IP_SUCCESS_FALLBACK: IP [${ip}] resolved via ip-api`);
      return res.json({
        ip: ip,
        country: dataFallback.country,
        country_code: dataFallback.countryCode,
        region: dataFallback.regionName,
        city: dataFallback.city,
        postal: dataFallback.zip,
        isp: dataFallback.isp,
        asn_org: dataFallback.as,
        timezone: dataFallback.timezone
      });
    }
  } catch (error: any) {
    addServerLog(`IP_FAILED: Could not lookup IP [${ip}] -> ${error.message}`);
    return res.status(400).json({ error: error.message || 'IP parsing error.' });
  }
});

// 4. Authoritative Domain dns resolution (Direct container socket execution!)
app.post('/api/dns-resolve', (req, res) => {
  const { hostname } = req.body;

  if (!hostname) {
    addServerLog(`API_ERR: DNS lookup missing hostname.`);
    return res.status(400).json({ error: 'Missing hostname parameter.' });
  }

  const cleanHost = hostname.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  addServerLog(`DNS_RESOLVE_LOCAL: Attempting socket resolution on [${cleanHost}]`);

  dns.resolve4(cleanHost, (err, addresses) => {
    if (err) {
      addServerLog(`DNS_RESOLVED_FAIL: Local socket resolution failed for ${cleanHost}: ${err.message}. Fetching via backup cloudflare DoH...`);
      
      // Attempt DoH backup over Cloudflare https dns-json
      fetch(`https://cloudflare-dns.com/query?name=${cleanHost}&type=A`, {
        headers: { 'accept': 'application/dns-json' }
      })
        .then(dohRes => dohRes.json())
        .then(dohData => {
          if (dohData.Status === 0 && dohData.Answer && dohData.Answer.length > 0) {
            const ipAddress = dohData.Answer[0].data;
            addServerLog(`DNS_RESOLVED_DOH: Resolved ${cleanHost} -> ${ipAddress}`);
            return res.json({
              hostname: cleanHost,
              resolvedIp: ipAddress,
              details: dohData.Answer,
              source: 'Authoritative DoH Gateway'
            });
          } else {
            throw new Error("Doh records empty.");
          }
        })
        .catch(dohErr => {
          addServerLog(`DNS_FATAL_ERROR: Resolving ${cleanHost} failed.`);
          return res.status(400).json({ error: 'Domain name resolution failed. Target might be offline or invalid.' });
        });
    } else {
      const ipAddress = addresses[0];
      addServerLog(`DNS_RESOLVED_LOCAL_OK: Resolved ${cleanHost} -> ${ipAddress}`);
      return res.json({
        hostname: cleanHost,
        resolvedIp: ipAddress,
        details: addresses.map(addr => ({ data: addr, type: 1 })),
        source: 'Server Socket Resolution'
      });
    }
  });
});

// 5. Phone Analyzer Service
app.post('/api/phone-lookup', (req, res) => {
  const { rawNumber, defaultRegion } = req.body;

  if (!rawNumber) {
    addServerLog(`API_ERR: Phone analysis missing raw number.`);
    return res.status(400).json({ error: 'Missing rawNumber parameters.' });
  }

  const region = defaultRegion || 'ID';
  addServerLog(`PHONE_LOOKUP: Parsing [${rawNumber}] in region [${region}]`);

  try {
    const parsedNumber = parsePhoneNumberFromString(rawNumber, region);
    if (!parsedNumber || !parsedNumber.isValid()) {
      addServerLog(`PHONE_INVALID: Could not parse or validate [${rawNumber}]`);
      return res.status(400).json({ error: 'Format nomor tidak valid atau tidak dikenali oleh validator.' });
    }

    const carrierName = detectCarrierName(rawNumber);
    const result = {
      input: rawNumber,
      e164: parsedNumber.number,
      international: parsedNumber.formatInternational(),
      country_code: `+${parsedNumber.countryCallingCode}`,
      region_code: parsedNumber.country || region,
      carrier: carrierName,
      type: parsedNumber.getType() || 'MOBILE',
      valid: true,
      possible: parsedNumber.isPossible(),
      national: parsedNumber.nationalNumber
    };

    addServerLog(`PHONE_SUCCESS: Verified parsed number as valid ${result.type}. Carrier="${carrierName}"`);
    return res.json(result);

  } catch (error: any) {
    addServerLog(`PHONE_FATAL_ERROR: Exception parsing phone -> ${error.message}`);
    return res.status(400).json({ error: error.message || 'Phone signature parse error.' });
  }
});

// 6. Streaming Logs and Terminal Telemetry Feed
app.get('/api/terminal-logs', (req, res) => {
  res.json({
    logs: serverLogs,
    stats: {
      memoryUsed: (os.totalmem() - os.freemem()),
      memoryTotal: os.totalmem(),
      uptime: process.uptime(),
      loadAvg: os.loadavg()
    }
  });
});


// --- VITE MIDDLEWARE OR STATIC APP SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    addServerLog(`DEVELOPMENT: Launching Vite development dev-server routing middleware...`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    addServerLog(`PRODUCTION: Mounting static directory asset routing folders from "/dist"...`);
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    addServerLog(`SUCCESS: UltraProMax system completely up and listening on port ${PORT}`);
  });
}

startServer();
