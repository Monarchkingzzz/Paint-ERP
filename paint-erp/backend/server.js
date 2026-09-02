const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db'); // initializes DB + seeds demo users on first run

const authRoutes = require('./routes/auth');
const colorRoutes = require('./routes/colors');
const paintPinRoutes = require('./routes/paintpin');
const posRoutes = require('./routes/pos');
const stockRoutes = require('./routes/stock');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const financialsRoutes = require('./routes/financials');
const quotationsRoutes = require('./routes/quotations');
const suppliersRoutes = require('./routes/suppliers');
const branchRoutes = require('./routes/branches');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/paintpin', paintPinRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/mpesa', (req, res, next) => {
  // Alias /api/mpesa/* to /api/pos/mpesa/*
  if (req.url === '/callback') req.url = '/mpesa/callback';
  else if (req.url === '/stkpush' || req.url === '/stk-push') req.url = '/mpesa/stk-push';
  else if (!req.url.startsWith('/mpesa/')) req.url = '/mpesa' + req.url;
  posRoutes(req, res, next);
});
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/financials', financialsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/branches', branchRoutes);

// Serve the PWA frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'icons', 'favicon.svg')));

const PORT = process.env.PORT || 4000;

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Paint ERP backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
