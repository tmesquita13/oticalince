const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, run, get, all, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// Route for dedicated admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 0. AUTENTICAÇÃO (ADMINISTRADOR / PROPRIETÁRIA)
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    const token = 'lince_token_' + Buffer.from(`admin:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token,
      user: {
        username: 'admin',
        role: 'Proprietária / Gerência',
        name: 'Administradora Ótica Lince'
      },
      message: 'Login realizado com sucesso!'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Usuário ou senha incorretos. Utilize usuário: admin e senha: admin'
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer lince_token_')) {
    return res.json({ success: true, valid: true });
  }
  return res.json({ success: false, valid: false });
});

// ==========================================
// 1. STATS / DASHBOARD
// ==========================================
app.get('/api/stats', async (req, res) => {
  try {
    const clientsCount = await get('SELECT COUNT(*) as count FROM clients');
    const productsCount = await get('SELECT COUNT(*) as count FROM products');
    const prescriptionsCount = await get('SELECT COUNT(*) as count FROM prescriptions');
    const quotesCount = await get('SELECT COUNT(*) as count FROM quotes');

    res.json({
      success: true,
      data: {
        totalClients: clientsCount.count,
        totalProducts: productsCount.count,
        totalPrescriptions: prescriptionsCount.count,
        totalQuotes: quotesCount.count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. CLIENTS API
// ==========================================
app.get('/api/clients', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM clients';
    const params = [];

    if (search) {
      sql += ' WHERE name LIKE ? OR cpf LIKE ? OR phone LIKE ? OR email LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += ' ORDER BY id DESC';

    const clients = await all(sql, params);
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const prescriptions = await all('SELECT * FROM prescriptions WHERE client_id = ? ORDER BY exam_date DESC', [req.params.id]);
    const appointments = await all('SELECT * FROM appointments WHERE client_name = ? OR client_phone = ? ORDER BY appointment_date DESC', [client.name, client.phone]);

    res.json({
      success: true,
      data: {
        ...client,
        prescriptions,
        appointments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clients', upload.single('client_prescription_file'), async (req, res) => {
  try {
    const { 
      name, cpf, phone, email, birth_date, gender, address, city, notes,
      rx_doctor, rx_crm, rx_exam_date, rx_expiration_date,
      od_spherical, od_cylindrical, od_axis, od_addition, dnp_od,
      oe_spherical, oe_cylindrical, oe_axis, oe_addition, dnp_oe,
      lens_recommendation, rx_notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nome e Telefone são obrigatórios.' });
    }

    const result = await run(`
      INSERT INTO clients (name, cpf, phone, email, birth_date, gender, address, city, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, cpf || null, phone, email || null, birth_date || null, gender || null, address || null, city || 'São Paulo - SP', notes || null]);

    const clientId = result.id;
    let prescriptionFile = null;
    if (req.file) {
      prescriptionFile = `/uploads/${req.file.filename}`;
    }

    // Se uma receita foi enviada junto com o cadastro do cliente (arquivo anexado ou dados médicos)
    if (prescriptionFile || rx_doctor || od_spherical || oe_spherical || lens_recommendation) {
      await run(`
        INSERT INTO prescriptions (
          client_id, doctor_name, crm, exam_date, expiration_date,
          od_spherical, od_cylindrical, od_axis, od_addition,
          oe_spherical, oe_cylindrical, oe_axis, oe_addition,
          dnp_od, dnp_oe, dp, lens_recommendation, prescription_file, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clientId,
        rx_doctor || 'Médico Oftalmologista',
        rx_crm || null,
        rx_exam_date || new Date().toISOString().split('T')[0],
        rx_expiration_date || null,
        parseFloat(od_spherical) || 0,
        parseFloat(od_cylindrical) || 0,
        parseInt(od_axis) || 0,
        parseFloat(od_addition) || 0,
        parseFloat(oe_spherical) || 0,
        parseFloat(oe_cylindrical) || 0,
        parseInt(oe_axis) || 0,
        parseFloat(oe_addition) || 0,
        parseFloat(dnp_od) || 31,
        parseFloat(dnp_oe) || 31,
        (parseFloat(dnp_od) || 31) + (parseFloat(dnp_oe) || 31),
        lens_recommendation || null,
        prescriptionFile,
        rx_notes || null
      ]);
    }

    const newClient = await get('SELECT * FROM clients WHERE id = ?', [clientId]);
    res.status(201).json({ success: true, data: newClient, message: 'Cliente e prontuário salvos com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { name, cpf, phone, email, birth_date, gender, address, city, notes } = req.body;
    await run(`
      UPDATE clients
      SET name = ?, cpf = ?, phone = ?, email = ?, birth_date = ?, gender = ?, address = ?, city = ?, notes = ?
      WHERE id = ?
    `, [name, cpf, phone, email, birth_date, gender, address, city, notes, req.params.id]);

    const updated = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated, message: 'Dados do cliente atualizados com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await run('DELETE FROM prescriptions WHERE client_id = ?', [req.params.id]);
    await run('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Cliente e prontuários excluídos com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. PRESCRIPTIONS (RECEITAS OFTALMOLÓGICAS)
// ==========================================
app.get('/api/prescriptions', async (req, res) => {
  try {
    const { client_id } = req.query;
    let sql = `
      SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email, c.cpf as client_cpf 
      FROM prescriptions p
      JOIN clients c ON p.client_id = c.id
    `;
    const params = [];

    if (client_id) {
      sql += ' WHERE p.client_id = ?';
      params.push(client_id);
    }
    sql += ' ORDER BY p.id DESC';

    const prescriptions = await all(sql, params);
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint público de upload de receita médica pelo cliente no site
app.post('/api/prescriptions/upload', upload.single('prescription_file'), async (req, res) => {
  try {
    const {
      client_name,
      client_phone,
      client_email,
      doctor_name,
      crm,
      exam_date,
      od_spherical,
      od_cylindrical,
      od_axis,
      od_addition,
      oe_spherical,
      oe_cylindrical,
      oe_axis,
      oe_addition,
      lens_recommendation,
      notes
    } = req.body;

    const name = (client_name || '').trim();
    const phone = (client_phone || '').trim();

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nome e Telefone / WhatsApp são obrigatórios para enviar a receita.'
      });
    }

    if (!req.file && !od_spherical && !oe_spherical && !notes) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, anexe uma foto / PDF da receita médica ou informe os graus.'
      });
    }

    // 1. Busca ou cadastra o cliente
    let client = await get('SELECT id, name, phone FROM clients WHERE phone = ?', [phone]);
    let clientId;

    if (client) {
      clientId = client.id;
      if (name && name !== client.name) {
        await run('UPDATE clients SET name = ? WHERE id = ?', [name, clientId]);
      }
    } else {
      const clientRes = await run(`
        INSERT INTO clients (name, phone, email, notes)
        VALUES (?, ?, ?, ?)
      `, [
        name,
        phone,
        client_email ? client_email.trim() : null,
        'Cadastrado automaticamente via upload de receita no site'
      ]);
      clientId = clientRes.id;
    }

    // 2. Arquivo escaneado / foto da receita
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 3. Cadastra a receita no prontuário
    const today = new Date().toISOString().split('T')[0];
    const uploadNotes = notes
      ? `[Upload via Site]: ${notes}`
      : `[Upload via Site]: Receita médica anexada pelo cliente online`;

    const result = await run(`
      INSERT INTO prescriptions (
        client_id, doctor_name, crm, exam_date, expiration_date,
        od_spherical, od_cylindrical, od_axis, od_addition,
        oe_spherical, oe_cylindrical, oe_axis, oe_addition,
        dnp_od, dnp_oe, dp, lens_recommendation, prescription_file, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clientId,
      doctor_name || 'A conferir pelo laboratório',
      crm || null,
      exam_date || today,
      null,
      parseFloat(od_spherical) || 0,
      parseFloat(od_cylindrical) || 0,
      parseInt(od_axis) || 0,
      parseFloat(od_addition) || 0,
      parseFloat(oe_spherical) || 0,
      parseFloat(oe_cylindrical) || 0,
      parseInt(oe_axis) || 0,
      parseFloat(oe_addition) || 0,
      31, 31, 62,
      lens_recommendation || 'Consultoria de Lentes Solicitada Online',
      fileUrl,
      uploadNotes
    ]);

    const prescription = await get(`
      SELECT p.*, c.name as client_name, c.phone as client_phone 
      FROM prescriptions p 
      JOIN clients c ON p.client_id = c.id 
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Receita médica enviada com sucesso! Nossos optometristas já receberam seu arquivo.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/prescriptions', upload.single('prescription_file'), async (req, res) => {
  try {
    const {
      client_id,
      doctor_name,
      crm,
      exam_date,
      expiration_date,
      od_spherical,
      od_cylindrical,
      od_axis,
      od_addition,
      oe_spherical,
      oe_cylindrical,
      oe_axis,
      oe_addition,
      dnp_od,
      dnp_oe,
      dp,
      lens_recommendation,
      notes
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ success: false, message: 'ID do cliente é obrigatório para anexar a receita.' });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(`
      INSERT INTO prescriptions (
        client_id, doctor_name, crm, exam_date, expiration_date,
        od_spherical, od_cylindrical, od_axis, od_addition,
        oe_spherical, oe_cylindrical, oe_axis, oe_addition,
        dnp_od, dnp_oe, dp, lens_recommendation, prescription_file, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      client_id, doctor_name || null, crm || null,
      exam_date || new Date().toISOString().split('T')[0],
      expiration_date || null,
      parseFloat(od_spherical) || 0,
      parseFloat(od_cylindrical) || 0,
      parseInt(od_axis) || 0,
      parseFloat(od_addition) || 0,
      parseFloat(oe_spherical) || 0,
      parseFloat(oe_cylindrical) || 0,
      parseInt(oe_axis) || 0,
      parseFloat(oe_addition) || 0,
      parseFloat(dnp_od) || 31,
      parseFloat(dnp_oe) || 31,
      parseFloat(dp) || 62,
      lens_recommendation || null,
      fileUrl,
      notes || null
    ]);

    const newPrescription = await get('SELECT * FROM prescriptions WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: newPrescription, message: 'Receita oftalmológica salva no prontuário!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/prescriptions/:id', async (req, res) => {
  try {
    await run('DELETE FROM prescriptions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Receita excluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. PRODUCTS API (ARMAÇÕES, LENTES, ACESSÓRIOS)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const { category, shape, gender, brand, min_price, max_price, search, sort } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (shape && shape !== 'all') {
      sql += ' AND frame_shape = ?';
      params.push(shape);
    }
    if (gender && gender !== 'all') {
      sql += ' AND (subcategory = ? OR subcategory = "Unissex")';
      params.push(gender);
    }
    if (brand && brand !== 'all') {
      sql += ' AND brand = ?';
      params.push(brand);
    }
    if (min_price) {
      sql += ' AND price >= ?';
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      sql += ' AND price <= ?';
      params.push(parseFloat(max_price));
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR material LIKE ? OR color LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (sort === 'price_asc') {
      sql += ' ORDER BY COALESCE(promo_price, price) ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY COALESCE(promo_price, price) DESC';
    } else if (sort === 'name') {
      sql += ' ORDER BY name ASC';
    } else {
      sql += ' ORDER BY id DESC';
    }

    const products = await all(sql, params);
    res.json({ success: true, data: products, total: products.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', upload.single('product_image'), async (req, res) => {
  try {
    const {
      name, category, subcategory, brand, frame_shape, material,
      color, dimensions, price, promo_price, description, badge, in_stock, features
    } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Nome, Categoria e Preço são obrigatórios.' });
    }

    let imageUrl = req.body.image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await run(`
      INSERT INTO products (
        name, category, subcategory, brand, frame_shape, material,
        color, dimensions, price, promo_price, description, image_url, badge, in_stock, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, category, subcategory || 'Unissex', brand || 'Lince Eyewear',
      frame_shape || 'N/A', material || 'Acetato', color || 'Padrão',
      dimensions || '', parseFloat(price), promo_price ? parseFloat(promo_price) : null,
      description || '', imageUrl || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80',
      badge || null, parseInt(in_stock) || 10, features || '[]'
    ]);

    const created = await get('SELECT * FROM products WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: created, message: 'Produto cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', upload.single('product_image'), async (req, res) => {
  try {
    const {
      name, category, subcategory, brand, frame_shape, material,
      color, dimensions, price, promo_price, description, badge, in_stock, features
    } = req.body;

    let imageUrl = req.body.image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    await run(`
      UPDATE products SET
        name = ?, category = ?, subcategory = ?, brand = ?, frame_shape = ?, material = ?,
        color = ?, dimensions = ?, price = ?, promo_price = ?, description = ?,
        image_url = COALESCE(?, image_url), badge = ?, in_stock = ?, features = ?
      WHERE id = ?
    `, [
      name, category, subcategory, brand, frame_shape, material,
      color, dimensions, parseFloat(price), promo_price ? parseFloat(promo_price) : null,
      description, imageUrl, badge, parseInt(in_stock), features, req.params.id
    ]);

    const updated = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated, message: 'Produto atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Produto removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. APPOINTMENTS (AGENDAMENTO DE CONSULTAS / EXAMES)
// ==========================================
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await all('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC');
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { client_name, client_phone, client_email, service_type, appointment_date, appointment_time, notes } = req.body;
    if (!client_name || !client_phone || !appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, message: 'Nome, Telefone, Data e Horário são obrigatórios.' });
    }

    const result = await run(`
      INSERT INTO appointments (client_name, client_phone, client_email, service_type, appointment_date, appointment_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [client_name, client_phone, client_email || null, service_type || 'Exame de Vista Completo', appointment_date, appointment_time, notes || null]);

    const created = await get('SELECT * FROM appointments WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: created, message: 'Agendamento confirmado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Status do agendamento alterado para ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 6. QUOTES & ORDERS (ORÇAMENTO DE ÓCULOS COMPLETO)
// ==========================================
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await all('SELECT * FROM quotes ORDER BY id DESC');
    res.json({ success: true, data: quotes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { client_name, client_phone, client_email, frame_id, frame_name, frame_price, lens_type, lens_treatments, lens_price, total_price, prescription_details, notes } = req.body;

    const quoteCode = `LINCE-${Date.now().toString().slice(-6)}`;

    const result = await run(`
      INSERT INTO quotes (
        quote_code, client_name, client_phone, client_email, frame_id, frame_name, frame_price,
        lens_type, lens_treatments, lens_price, total_price, prescription_details, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quoteCode, client_name || 'Cliente Online', client_phone, client_email || null,
      frame_id || null, frame_name || 'Armação Personalizada', parseFloat(frame_price) || 0,
      lens_type || 'Lentes Standard', lens_treatments || '', parseFloat(lens_price) || 0,
      parseFloat(total_price) || 0, prescription_details || '', notes || null
    ]);

    const created = await get('SELECT * FROM quotes WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: created, message: 'Orçamento gerado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/quotes/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await run('UPDATE quotes SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Status da O.S. atualizado para ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. SIMULATOR & QUOTE CONFIGURATION (PAINEL ADMIN)
// ==========================================

// Configuração pública ativa para o simulador do site
app.get('/api/simulator/config', async (req, res) => {
  try {
    const lenses = await all('SELECT * FROM simulator_lenses WHERE active = 1 ORDER BY order_num ASC, id ASC');
    const treatments = await all('SELECT * FROM simulator_treatments WHERE active = 1 ORDER BY order_num ASC, id ASC');
    const settingsRows = await all('SELECT * FROM simulator_settings');
    
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({
      success: true,
      data: {
        lenses,
        treatments,
        settings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configuração completa para o painel administrativo (inclui inativos)
app.get('/api/simulator/admin-config', async (req, res) => {
  try {
    const lenses = await all('SELECT * FROM simulator_lenses ORDER BY order_num ASC, id ASC');
    const treatments = await all('SELECT * FROM simulator_treatments ORDER BY order_num ASC, id ASC');
    const settingsRows = await all('SELECT * FROM simulator_settings');
    
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({
      success: true,
      data: {
        lenses,
        treatments,
        settings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CRUD - Lentes do Simulador
app.post('/api/simulator/lenses', async (req, res) => {
  try {
    const { name, badge, price, description, active, order_num } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nome e Preço da lente são obrigatórios.' });
    }

    const lens_key = 'lens_' + Date.now();
    const result = await run(`
      INSERT INTO simulator_lenses (lens_key, name, badge, price, description, active, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      lens_key,
      name,
      badge || 'Opção Especial',
      parseFloat(price) || 0,
      description || '',
      active !== undefined ? (active ? 1 : 0) : 1,
      parseInt(order_num) || 0
    ]);

    const created = await get('SELECT * FROM simulator_lenses WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: created, message: 'Lente cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/simulator/lenses/:id', async (req, res) => {
  try {
    const { name, badge, price, description, active, order_num } = req.body;
    await run(`
      UPDATE simulator_lenses
      SET name = ?, badge = ?, price = ?, description = ?, active = ?, order_num = ?
      WHERE id = ?
    `, [
      name,
      badge,
      parseFloat(price) || 0,
      description || '',
      active ? 1 : 0,
      parseInt(order_num) || 0,
      req.params.id
    ]);

    const updated = await get('SELECT * FROM simulator_lenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated, message: 'Opção de lente atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/simulator/lenses/:id', async (req, res) => {
  try {
    await run('DELETE FROM simulator_lenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Lente removida do simulador com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CRUD - Tratamentos do Simulador
app.post('/api/simulator/treatments', async (req, res) => {
  try {
    const { name, price, description, is_default, is_free, active, order_num } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nome e Preço do tratamento são obrigatórios.' });
    }

    const treatment_key = 'treatment_' + Date.now();
    const result = await run(`
      INSERT INTO simulator_treatments (treatment_key, name, price, description, is_default, is_free, active, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      treatment_key,
      name,
      parseFloat(price) || 0,
      description || '',
      is_default ? 1 : 0,
      is_free ? 1 : 0,
      active !== undefined ? (active ? 1 : 0) : 1,
      parseInt(order_num) || 0
    ]);

    const created = await get('SELECT * FROM simulator_treatments WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: created, message: 'Tratamento cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/simulator/treatments/:id', async (req, res) => {
  try {
    const { name, price, description, is_default, is_free, active, order_num } = req.body;
    await run(`
      UPDATE simulator_treatments
      SET name = ?, price = ?, description = ?, is_default = ?, is_free = ?, active = ?, order_num = ?
      WHERE id = ?
    `, [
      name,
      parseFloat(price) || 0,
      description || '',
      is_default ? 1 : 0,
      is_free ? 1 : 0,
      active ? 1 : 0,
      parseInt(order_num) || 0,
      req.params.id
    ]);

    const updated = await get('SELECT * FROM simulator_treatments WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated, message: 'Tratamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/simulator/treatments/:id', async (req, res) => {
  try {
    await run('DELETE FROM simulator_treatments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tratamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configurações Gerais de Orçamento (Parcelamento, Pix, WhatsApp, Montagem)
app.put('/api/simulator/settings', async (req, res) => {
  try {
    const { max_installments, pix_discount, whatsapp_phone, assembly_fee_text } = req.body;

    const updates = [
      { key: 'max_installments', value: max_installments !== undefined ? String(max_installments) : '10' },
      { key: 'pix_discount', value: pix_discount !== undefined ? String(pix_discount) : '5' },
      { key: 'whatsapp_phone', value: whatsapp_phone || '5511987654321' },
      { key: 'assembly_fee_text', value: assembly_fee_text || 'Cortesia' }
    ];

    for (const item of updates) {
      await run(`
        INSERT INTO simulator_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [item.key, item.value]);
    }

    res.json({ success: true, message: 'Configurações de orçamento salvas com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 8. SITE CONTENT CMS (SITE 100% EDITÁVEL)
// ==========================================
app.get('/api/site-content', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM site_content ORDER BY section, rowid');
    const map = {};
    rows.forEach(r => {
      map[r.key] = r.value;
    });

    res.json({
      success: true,
      data: rows,
      map: map
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/site-content', upload.single('hero_featured_image'), async (req, res) => {
  try {
    let content = req.body.content || req.body;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {}
    }
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ success: false, message: 'Dados inválidos fornecidos.' });
    }

    // Se foi feito upload de um novo arquivo para a foto da armação em destaque:
    if (req.file) {
      const uploadedPath = `/uploads/${req.file.filename}`;
      await run(`
        UPDATE site_content
        SET value = ?
        WHERE key = 'hero_featured_image'
      `, [uploadedPath]);
    }

    for (const [key, value] of Object.entries(content)) {
      // Ignora chave hero_featured_image caso não tenha novo arquivo (mantém a atual)
      if (key === 'hero_featured_image' || key === 'hero_featured_image_current') {
        continue;
      }

      await run(`
        UPDATE site_content
        SET value = ?
        WHERE key = ?
      `, [String(value), key]);
    }

    const rows = await all('SELECT * FROM site_content ORDER BY section, rowid');
    const map = {};
    rows.forEach(r => {
      map[r.key] = r.value;
    });

    res.json({
      success: true,
      message: 'Conteúdo do site atualizado com sucesso!',
      map,
      uploadedFile: req.file ? `/uploads/${req.file.filename}` : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 9. REDE LOCAL & ACESSO MOBILE (CELULAR / TABLET)
// ==========================================
const os = require('os');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

app.get('/api/network-info', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips[0] || 'localhost';
  res.json({
    success: true,
    localUrl: `http://localhost:${PORT}`,
    primaryNetworkUrl: `http://${primaryIp}:${PORT}`,
    adminNetworkUrl: `http://${primaryIp}:${PORT}/admin`,
    allIps: ips,
    primaryIp: primaryIp,
    port: PORT
  });
});

// Start Server ouvindo em 0.0.0.0 (todos os dispositivos da rede)
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    const primaryIp = ips[0] || '127.0.0.1';
    console.log(`=======================================================`);
    console.log(`  👓 ÓTICA LINCE - Sistema Completo Web & Gestão`);
    console.log(`=======================================================`);
    console.log(`  💻 Acesso Local (Neste Computador):`);
    console.log(`     Loja:   http://localhost:${PORT}`);
    console.log(`     Painel: http://localhost:${PORT}/admin`);
    console.log(`-------------------------------------------------------`);
    console.log(`  📱 Acesso na Rede Wi-Fi (Celular / Outros Aparelhos):`);
    console.log(`     Loja:   http://${primaryIp}:${PORT}`);
    console.log(`     Painel: http://${primaryIp}:${PORT}/admin`);
    console.log(`=======================================================`);
  });
}).catch(err => {
  console.error('Falha ao inicializar banco de dados:', err);
});

