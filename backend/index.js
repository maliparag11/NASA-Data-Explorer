// backend/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// CORS: in dev allow localhost; in prod set ALLOWED_ORIGINS env to comma-list
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.split(',').map(s => s.trim());
    if (allowed.includes(origin)) return callback(null, true);
    return callback(null, true); // dev-friendly: allow all; set to reject in prod if desired
  }
}));

// Rate limiting (protect both your server and NASA)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120
}));

// Cache
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 3600;
const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });

// Config
const NASA_KEY = process.env.NASA_API_KEY || '';
const NASA_BASE = 'https://api.nasa.gov';

// Axios instance
const axiosInstance = axios.create({
  timeout: Number(process.env.AXIOS_TIMEOUT_MS) || 15000,
  headers: { 'User-Agent': 'Bounce-NASA-Explorer-Server/1.0' }
});

// Helper: fetch with simple retry/backoff
async function fetchWithRetry(url, params = {}, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await axiosInstance.get(url, { params });
    } catch (err) {
      lastErr = err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, (i + 1) * 500));
    }
  }
  throw lastErr;
}

// Cache middleware
function cacheMiddleware(keyFn, ttl = CACHE_TTL_SECONDS) {
  return (req, res, next) => {
    try {
      const key = keyFn(req);
      const cached = cache.get(key);
      if (cached) return res.json(cached);
      res.locals.cacheKey = key;
      res.locals.cacheTtl = ttl;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Root
app.get('/', (req, res) => res.json({ ok: true, message: 'NASA proxy running' }));

// ------------------ 1. NeoWs (Asteroids) ------------------
// Feed: GET /api/neo?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
app.get('/api/neo',
  cacheMiddleware(req => `neo:feed:${req.query.start_date||'today'}:${req.query.end_date||'today'}`, 1800),
  async (req, res) => {
    try {
      const params = { api_key: NASA_KEY };
      if (req.query.start_date) params.start_date = req.query.start_date;
      if (req.query.end_date) params.end_date = req.query.end_date;
      const url = `${NASA_BASE}/neo/rest/v1/feed`;
      const r = await fetchWithRetry(url, params, 2);
      cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
      res.json(r.data);
    } catch (err) {
      console.error('NEO feed error', err?.response?.data || err?.message);
      res.status(500).json({ error: 'NEO feed failed', detail: err?.response?.data || err?.message });
    }
  });

// Lookup NEO by ID: GET /api/neo/:id
app.get('/api/neo/:id',
  cacheMiddleware(req => `neo:id:${req.params.id}`, 86400),
  async (req, res) => {
    try {
      const url = `${NASA_BASE}/neo/rest/v1/neo/${encodeURIComponent(req.params.id)}`;
      const r = await fetchWithRetry(url, { api_key: NASA_KEY }, 2);
      cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
      res.json(r.data);
    } catch (err) {
      console.error('NEO id error', err?.response?.data || err?.message);
      res.status(500).json({ error: 'NEO id failed', detail: err?.response?.data || err?.message });
    }
  });

// // ------------------ 2. DONKI (space weather) ------------------
// // FLR (flares): GET /api/donki/flare?startDate=YYYY-MM-DD&endDate=...
// app.get('/api/donki/flare',
//   cacheMiddleware(req => `donki:flare:${req.query.startDate||''}:${req.query.endDate||''}`, 1800),
//   async (req, res) => {
//     try {
//       const params = { api_key: NASA_KEY };
//       if (req.query.startDate) params.startDate = req.query.startDate;
//       if (req.query.endDate) params.endDate = req.query.endDate;
//       const url = `${NASA_BASE}/DONKI/FLR`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('DONKI FLR error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'DONKI FLR failed', detail: err?.response?.data || err?.message });
//     }
//   });

// // CME (coronal mass ejections)
// app.get('/api/donki/cme',
//   cacheMiddleware(req => `donki:cme:${req.query.startDate||''}:${req.query.endDate||''}`, 1800),
//   async (req, res) => {
//     try {
//       const params = { api_key: NASA_KEY };
//       if (req.query.startDate) params.startDate = req.query.startDate;
//       if (req.query.endDate) params.endDate = req.query.endDate;
//       const url = `${NASA_BASE}/DONKI/CME`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('DONKI CME error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'DONKI CME failed', detail: err?.response?.data || err?.message });
//     }
//   });

// // Other DONKI endpoints can be added similarly - IPS, GST, RBE, etc.
// // Example generic DONKI route:
// app.get('/api/donki/:type',
//   cacheMiddleware(req => `donki:${req.params.type}:${JSON.stringify(req.query)}`, 1800),
//   async (req, res) => {
//     try {
//       const type = req.params.type.toUpperCase();
//       const url = `${NASA_BASE}/DONKI/${type}`;
//       const params = { api_key: NASA_KEY, ...req.query };
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('DONKI generic error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'DONKI request failed', detail: err?.response?.data || err?.message });
//     }
//   });

// // ------------------ 3. EPIC ------------------
// // EPIC metadata natural: GET /api/epic/natural?date=YYYY-MM-DD
// app.get('/api/epic/natural',
//   cacheMiddleware(req => `epic:natural:${req.query.date||'latest'}`, 3600),
//   async (req, res) => {
//     try {
//       const params = { api_key: NASA_KEY };
//       if (req.query.date) params.date = req.query.date;
//       const url = `${NASA_BASE}/EPIC/api/natural`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('EPIC natural error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'EPIC natural failed', detail: err?.response?.data || err?.message });
//     }
//   });

// // EPIC enhanced
// app.get('/api/epic/enhanced',
//   cacheMiddleware(req => `epic:enhanced:${req.query.date||'latest'}`, 3600),
//   async (req, res) => {
//     try {
//       const params = { api_key: NASA_KEY };
//       if (req.query.date) params.date = req.query.date;
//       const url = `${NASA_BASE}/EPIC/api/enhanced`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('EPIC enhanced error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'EPIC enhanced failed', detail: err?.response?.data || err?.message });
//     }
//   });

// // EPIC image URL builder (returns canonical archive URL)
// app.get('/api/epic/image-url', (req, res) => {
//   try {
//     const { image, date, type } = req.query;
//     if (!image || !date) return res.status(400).json({ error: 'image and date are required' });
//     const d = new Date(date);
//     const yyyy = d.getUTCFullYear();
//     const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
//     const dd = String(d.getUTCDate()).padStart(2, '0');
//     const t = type || 'natural';
//     const url = `https://epic.gsfc.nasa.gov/archive/${t}/${yyyy}/${mm}/${dd}/png/${image}.png`;
//     res.json({ url });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to build EPIC image URL' });
//   }
// });

// // ------------------ 4. GIBS (tile URL builder / layer list helper) ------------------
// // GIBS doesn't use api.nasa.gov — we provide helper info for frontend tile construction
// app.get('/api/gibs/layers', (req, res) => {
//   // Provide a small curated list of common GIBS layers (name + tile template)
//   const layers = [
//     {
//       id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
//       title: 'MODIS Terra True Color',
//       template: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{Time}/{TileMatrixSet}/{z}/{y}/{x}.jpg'
//     },
//     {
//       id: 'VIIRS_CityLights_2012',
//       title: 'VIIRS City Lights',
//       template: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_CityLights_2012/default/{Time}/{TileMatrixSet}/{z}/{y}/{x}.jpg'
//     }
//   ];
//   res.json({ layers });
// });

// ------------------ 5. InSight ------------------
// InSight weather: GET /api/insight?feedtype=json&ver=1.0
app.get("/api/insight", async (req, res) => {
  try {
    const url = `https://api.nasa.gov/insight_weather/?api_key=${NASA_KEY}&feedtype=json&ver=1.0`;
    const r = await axios.get(url);
    res.json(r.data);
  } catch (error) {
    console.error("InSight API error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch InSight data" });
  }
});

// // ------------------ 6. Mars Rover Photos ------------------
// app.get('/api/mars',
//   cacheMiddleware(req => `mars:${req.query.rover||'curiosity'}:${req.query.sol||''}:${req.query.earth_date||''}:${req.query.camera||''}:${req.query.page||1}`, 1800),
//   async (req, res) => {
//     try {
//       const rover = req.query.rover || 'curiosity';
//       const params = { api_key: NASA_KEY, page: req.query.page || 1 };
//       if (req.query.sol) params.sol = req.query.sol;
//       if (req.query.earth_date) params.earth_date = req.query.earth_date;
//       if (req.query.camera) params.camera = req.query.camera;
//       const url = `${NASA_BASE}/mars-photos/api/v1/rovers/${rover}/photos`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('Mars error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'Mars photos failed', detail: err?.response?.data || err?.message });
//     }
//   });

// ------------------ 7. NASA Image & Video Library ------------------
app.get('/api/imagesearch',
  cacheMiddleware(req => `imagesearch:${req.query.q||'space'}:${req.query.page||1}`, 1800),
  async (req, res) => {
    try {
      const url = 'https://images-api.nasa.gov/search';
      const params = { q: req.query.q || 'space', page: req.query.page || 1 };
      const r = await fetchWithRetry(url, params, 2);
      cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
      res.json(r.data);
    } catch (err) {
      console.error('Image search error', err?.response?.data || err?.message);
      res.status(500).json({ error: 'Image search failed', detail: err?.response?.data || err?.message });
    }
  });


// // Generic proxy (careful): GET /api/proxy?path=/planetary/apod&...
// app.get('/api/proxy',
//   cacheMiddleware(req => `proxy:${req.query.path}:${JSON.stringify(req.query)}`, 60),
//   async (req, res) => {
//     try {
//       const path = req.query.path;
//       if (!path) return res.status(400).json({ error: 'path query required' });
//       const params = { api_key: NASA_KEY };
//       Object.keys(req.query).forEach(k => {
//         if (k === 'path') return;
//         params[k] = req.query[k];
//       });
//       const url = `${NASA_BASE}${path}`;
//       const r = await fetchWithRetry(url, params, 2);
//       cache.set(res.locals.cacheKey, r.data, res.locals.cacheTtl);
//       res.json(r.data);
//     } catch (err) {
//       console.error('Proxy error', err?.response?.data || err?.message);
//       res.status(500).json({ error: 'Proxy failed', detail: err?.response?.data || err?.message });
//     }
//   });

// 404 & global error
app.use((req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'server error', detail: err?.message || null });
});

// Start
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`API server started on ${PORT}`));
