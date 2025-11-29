// Plow Daddy Cloud - Multi-tenant Express server
// Each company/tenant has isolated customers + jobs.
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

function readAll() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { tenants: {} };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{"tenants":{}}';
    const parsed = JSON.parse(raw);
    if (!parsed.tenants || typeof parsed.tenants !== 'object') {
      return { tenants: {} };
    }
    return parsed;
  } catch (e) {
    console.error('Error reading data.json', e);
    return { tenants: {} };
  }
}

function writeAll(allState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(allState, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing data.json', e);
  }
}

function sanitizeTenant(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'default';
  return s.replace(/[^a-z0-9_-]/g, '') || 'default';
}

function readTenantState(tenantId) {
  const all = readAll();
  const tid = sanitizeTenant(tenantId);
  if (!all.tenants[tid]) {
    all.tenants[tid] = { customers: [], jobs: [] };
    writeAll(all);
  }
  return { state: all.tenants[tid], all, tid };
}

function writeTenantState(tenantId, nextState) {
  const tid = sanitizeTenant(tenantId);
  const all = readAll();
  all.tenants[tid] = {
    customers: Array.isArray(nextState.customers) ? nextState.customers : [],
    jobs: Array.isArray(nextState.jobs) ? nextState.jobs : []
  };
  writeAll(all);
}

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/state', (req, res) => {
  const tenantId = req.query.tenant || 'default';
  const { state } = readTenantState(tenantId);
  res.json(state);
});

app.put('/api/state', (req, res) => {
  const tenantId = req.query.tenant || 'default';
  const body = req.body || {};
  const customers = Array.isArray(body.customers) ? body.customers : [];
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  writeTenantState(tenantId, { customers, jobs });
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Plow Daddy Cloud (multi-tenant) running on port ${PORT}`);
});
