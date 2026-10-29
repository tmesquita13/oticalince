const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'otica_lince.db');
const db = new sqlite3.Database(dbPath);

// Helper function to run queries with Promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  db.serialize(async () => {
    // 1. Clientes
    await run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cpf TEXT UNIQUE,
        phone TEXT NOT NULL,
        email TEXT,
        birth_date TEXT,
        gender TEXT,
        address TEXT,
        city TEXT DEFAULT 'São Paulo - SP',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Receitas Oftalmológicas (Prescrições)
    await run(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        doctor_name TEXT,
        crm TEXT,
        exam_date TEXT,
        expiration_date TEXT,
        od_spherical REAL DEFAULT 0,
        od_cylindrical REAL DEFAULT 0,
        od_axis INTEGER DEFAULT 0,
        od_addition REAL DEFAULT 0,
        oe_spherical REAL DEFAULT 0,
        oe_cylindrical REAL DEFAULT 0,
        oe_axis INTEGER DEFAULT 0,
        oe_addition REAL DEFAULT 0,
        dnp_od REAL DEFAULT 31,
        dnp_oe REAL DEFAULT 31,
        dp REAL DEFAULT 62,
        lens_recommendation TEXT,
        prescription_file TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // 3. Produtos (Armações, Óculos de Sol, Lentes Oftálmicas, Lentes de Contato, Acessórios)
    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        brand TEXT NOT NULL,
        frame_shape TEXT,
        material TEXT,
        color TEXT,
        dimensions TEXT,
        price REAL NOT NULL,
        promo_price REAL,
        description TEXT,
        image_url TEXT,
        badge TEXT,
        in_stock INTEGER DEFAULT 1,
        features TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Agendamentos (Exame de Vista / Consultoria)
    await run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        service_type TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT DEFAULT 'Agendado',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Orçamentos & Ordens de Serviço (O.S.)
    await run(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_code TEXT UNIQUE NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        frame_id INTEGER,
        frame_name TEXT,
        frame_price REAL DEFAULT 0,
        lens_type TEXT,
        lens_treatments TEXT,
        lens_price REAL DEFAULT 0,
        total_price REAL NOT NULL,
        prescription_details TEXT,
        status TEXT DEFAULT 'Em Análise',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Lentes Oftálmicas do Simulador (Editáveis pelo Painel)
    await run(`
      CREATE TABLE IF NOT EXISTS simulator_lenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lens_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        badge TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        active INTEGER DEFAULT 1,
        order_num INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Tratamentos de Lentes do Simulador (Editáveis pelo Painel)
    await run(`
      CREATE TABLE IF NOT EXISTS simulator_treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        treatment_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        is_free INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        order_num INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Configurações Gerais do Simulador & Orçamentos
    await run(`
      CREATE TABLE IF NOT EXISTS simulator_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // 9. Conteúdo 100% Editável do Site (Textos, Banners, Serviços, Contato)
    await run(`
      CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        section TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT DEFAULT 'text'
      )
    `);

    // Inicializar opções do simulador se tabelas estiverem vazias
    await initSimulatorDefaults();
    await initSiteContentDefaults();

    // Seed Initial Sample Data if empty
    const productCount = await get(`SELECT COUNT(*) as count FROM products`);
    if (productCount.count === 0) {
      console.log('Populando banco de dados com dados iniciais da Ótica Lince...');
      await seedData();
    }
  });
}

async function initSimulatorDefaults() {
  const lensCount = await get(`SELECT COUNT(*) as count FROM simulator_lenses`);
  if (lensCount.count === 0) {
    const defaultLenses = [
      {
        key: 'monofocal',
        name: 'Lentes Monofocais Standard 1.56',
        badge: 'Básica & Eficaz',
        price: 190.00,
        description: 'Lentes para visão simples de perto ou longe. Ideal para graus baixos até 2 graus.',
        order: 1
      },
      {
        key: 'blue_filter',
        name: 'Lentes BlueProtect com Filtro de Luz Azul',
        badge: 'Mais Recomendada',
        price: 399.00,
        description: 'Bloqueia o cansaço visual gerado por telas de celular e monitores de computador.',
        order: 2
      },
      {
        key: 'photocromic',
        name: 'Lentes Fotossensíveis SunSync (Escurece ao Sol)',
        badge: '2 em 1 Praticidade',
        price: 450.00,
        description: 'Ficam escuras sob o sol e transparentes em ambientes fechados automaticamente.',
        order: 3
      },
      {
        key: 'multifocal_hd',
        name: 'Lentes Multifocais Progressivas HD Freeform',
        badge: 'Tecnologia Digital',
        price: 749.00,
        description: 'Para quem precisa de correção para perto, média distância e longe em uma só lente.',
        order: 4
      },
      {
        key: 'hi_index',
        name: 'Lentes Ultrafinas 1.67 / 1.74 para Graus Altos',
        badge: 'Estética Perfeita',
        price: 850.00,
        description: 'Até 50% mais finas, ideais para miopia ou hipermetropia moderada e alta.',
        order: 5
      }
    ];

    for (const l of defaultLenses) {
      await run(`
        INSERT OR IGNORE INTO simulator_lenses (lens_key, name, badge, price, description, active, order_num)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `, [l.key, l.name, l.badge, l.price, l.description, l.order]);
    }
  }

  const treatmentCount = await get(`SELECT COUNT(*) as count FROM simulator_treatments`);
  if (treatmentCount.count === 0) {
    const defaultTreatments = [
      {
        key: 'antireflective',
        name: 'Antirreflexo Premium Diamond',
        price: 80.00,
        description: 'Elimina reflexos em fotos e direção noturna',
        is_default: 1,
        is_free: 0,
        order: 1
      },
      {
        key: 'antiscratch',
        name: 'Película Antirrisco Reforçada',
        price: 50.00,
        description: 'Camada endurecida contra riscos acidentais',
        is_default: 1,
        is_free: 0,
        order: 2
      },
      {
        key: 'hydrophobic',
        name: 'Camada Hidrorrepelente e Oleofóbica',
        price: 60.00,
        description: 'Repele vapor d\'água, chuva e marcas de dedos',
        is_default: 0,
        is_free: 0,
        order: 3
      },
      {
        key: 'uv400',
        name: 'Bloqueio UV400 Total',
        price: 0.00,
        description: 'Proteção solar contra radiação UVA e UVB',
        is_default: 1,
        is_free: 1,
        order: 4
      }
    ];

    for (const t of defaultTreatments) {
      await run(`
        INSERT OR IGNORE INTO simulator_treatments (treatment_key, name, price, description, is_default, is_free, active, order_num)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `, [t.key, t.name, t.price, t.description, t.is_default, t.is_free, t.order]);
    }
  }

  const defaultSettings = [
    { key: 'max_installments', value: '10' },
    { key: 'pix_discount', value: '5' },
    { key: 'whatsapp_phone', value: '5511987654321' },
    { key: 'assembly_fee_text', value: 'Cortesia' }
  ];

  for (const s of defaultSettings) {
    await run(`
      INSERT OR IGNORE INTO simulator_settings (key, value)
      VALUES (?, ?)
    `, [s.key, s.value]);
  }
}

async function initSiteContentDefaults() {
  const contentCount = await get(`SELECT COUNT(*) as count FROM site_content`);
  if (contentCount.count === 0) {
    const defaultContents = [
      // 1. Identidade & Contato Geral
      { key: 'store_name', value: 'Ótica Lince', section: 'identidade', label: 'Nome Oficial da Ótica', type: 'text' },
      { key: 'store_slogan', value: 'Precisão & Elegância', section: 'identidade', label: 'Slogan / Subtítulo da Marca', type: 'text' },
      { key: 'store_phone', value: '(11) 98765-4321', section: 'identidade', label: 'Telefone Principal', type: 'text' },
      { key: 'store_whatsapp', value: '5511987654321', section: 'identidade', label: 'WhatsApp de Atendimento (com DDI e DDD)', type: 'text' },
      { key: 'store_email', value: 'contato@oticalince.com.br', section: 'identidade', label: 'E-mail Comercial', type: 'text' },
      { key: 'store_address', value: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP', section: 'identidade', label: 'Endereço Completo da Loja', type: 'text' },
      { key: 'store_hours', value: 'Seg a Sex: 09h às 19h | Sáb: 09h às 15h', section: 'identidade', label: 'Horário de Funcionamento', type: 'text' },
      { key: 'store_cnpj', value: '12.345.678/0001-90', section: 'identidade', label: 'CNPJ da Ótica', type: 'text' },
      { key: 'store_instagram', value: 'https://instagram.com', section: 'identidade', label: 'Link do Instagram', type: 'text' },
      { key: 'store_facebook', value: 'https://facebook.com', section: 'identidade', label: 'Link do Facebook', type: 'text' },

      // 2. Barra Superior de Avisos (Topbar)
      { key: 'topbar_tag', value: 'Laboratório Digital', section: 'topbar', label: 'Selo do Topo', type: 'text' },
      { key: 'topbar_text', value: 'Lentes montadas com precisão computadorizada em até 24 horas', section: 'topbar', label: 'Texto de Destaque do Topo', type: 'text' },
      { key: 'topbar_shipping', value: 'Frete Grátis acima de R$ 299', section: 'topbar', label: 'Aviso de Frete', type: 'text' },
      { key: 'topbar_warranty', value: '2 Anos de Garantia', section: 'topbar', label: 'Aviso de Garantia', type: 'text' },

      // 3. Banner Principal (Hero Section)
      { key: 'hero_badge', value: 'Excelência e Tradição Óptica', section: 'hero', label: 'Selo / Tag do Banner', type: 'text' },
      { key: 'hero_title', value: 'Sua visão com a precisão e a elegância de um Lince.', section: 'hero', label: 'Título Principal do Banner', type: 'text' },
      { key: 'hero_subtitle', value: 'Catálogo exclusivo de armações nobres, óculos de sol polarizados, lentes digitais de alto índice com filtro de luz azul e laboratório de montagem computadorizado.', section: 'hero', label: 'Subtítulo / Descrição do Banner', type: 'textarea' },
      { key: 'hero_btn_catalog', value: 'Explorar Catálogo', section: 'hero', label: 'Texto do Botão Catálogo', type: 'text' },
      { key: 'hero_btn_simulator', value: 'Simular Lentes & Grau', section: 'hero', label: 'Texto do Botão Simulador', type: 'text' },
      { key: 'hero_btn_prescription', value: 'Orçar Receita Médica', section: 'hero', label: 'Texto do Botão Receita', type: 'text' },
      
      // 4 Métricas Rápidas do Hero
      { key: 'hero_stat1_val', value: '100%', section: 'hero', label: 'Métrica 1 - Valor', type: 'text' },
      { key: 'hero_stat1_label', value: 'Proteção UV400 em todas as lentes', section: 'hero', label: 'Métrica 1 - Descrição', type: 'text' },
      { key: 'hero_stat2_val', value: '10x', section: 'hero', label: 'Métrica 2 - Valor', type: 'text' },
      { key: 'hero_stat2_label', value: 'Sem juros no cartão de crédito', section: 'hero', label: 'Métrica 2 - Descrição', type: 'text' },
      { key: 'hero_stat3_val', value: '2 Anos', section: 'hero', label: 'Métrica 3 - Valor', type: 'text' },
      { key: 'hero_stat3_label', value: 'Garantia total de fabricação', section: 'hero', label: 'Métrica 3 - Descrição', type: 'text' },
      { key: 'hero_stat4_val', value: 'Digital', section: 'hero', label: 'Métrica 4 - Valor', type: 'text' },
      { key: 'hero_stat4_label', value: 'Prontuário e receitas salvos online', section: 'hero', label: 'Métrica 4 - Descrição', type: 'text' },

      // Armação em Destaque no Hero
      { key: 'hero_featured_badge', value: 'Lançamento 2026', section: 'hero_featured', label: 'Selo da Armação Destaque', type: 'text' },
      { key: 'hero_featured_image', value: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80', section: 'hero_featured', label: 'Foto da Armação em Destaque', type: 'image' },
      { key: 'hero_featured_collection', value: 'Coleção Signature', section: 'hero_featured', label: 'Nome da Coleção', type: 'text' },
      { key: 'hero_featured_title', value: 'Armação Lince Titanium Imperial', section: 'hero_featured', label: 'Nome do Modelo em Destaque', type: 'text' },
      { key: 'hero_featured_desc', value: 'Titânio puro cirúrgico ultraleve (11g) com aro hexagonal polido à mão.', section: 'hero_featured', label: 'Descrição da Armação', type: 'textarea' },
      { key: 'hero_featured_old_price', value: 'R$ 589,00', section: 'hero_featured', label: 'Preço Anterior (Riscado)', type: 'text' },
      { key: 'hero_featured_price', value: 'R$ 499,00', section: 'hero_featured', label: 'Preço Promocional em Destaque', type: 'text' },

      // 4. Seção de Serviços Especializados
      { key: 'services_tag', value: 'Experiência & Precisão Óptica', section: 'services', label: 'Selo da Seção de Serviços', type: 'text' },
      { key: 'services_title', value: 'Serviços Especializados da Ótica Lince', section: 'services', label: 'Título da Seção de Serviços', type: 'text' },
      { key: 'services_subtitle', value: 'Muito além da venda de óculos: tecnologia de laboratório próprio, conferência rigorosa de receitas médicas, ajuste anatômico sob medida e assistência vitalícia.', section: 'services', label: 'Subtítulo da Seção', type: 'textarea' },

      { key: 'service1_title', value: 'Laboratório Digital Próprio', section: 'services', label: 'Serviço 1 - Título', type: 'text' },
      { key: 'service1_desc', value: 'Desbaste computadorizado e biselamento 3D de alta precisão. Montagem rápida em até 24 horas mantendo o alinhamento óptico exato prescrito na receita.', section: 'services', label: 'Serviço 1 - Descrição', type: 'textarea' },
      { key: 'service1_badge', value: 'Calibragem Ponto a Ponto', section: 'services', label: 'Serviço 1 - Selo', type: 'text' },

      { key: 'service2_title', value: 'Medição Digital de DNP', section: 'services', label: 'Serviço 2 - Título', type: 'text' },
      { key: 'service2_desc', value: 'Tiragem computadorizada da Distância Naso-Pupilar (DNP) e altura de montagem. Fundamental para o sucesso e adaptação imediata de lentes multifocais.', section: 'services', label: 'Serviço 2 - Descrição', type: 'textarea' },
      { key: 'service2_badge', value: 'Precisão em Décimos de Milímetro', section: 'services', label: 'Serviço 2 - Selo', type: 'text' },

      { key: 'service3_title', value: 'Ajuste & Manutenção Vitalícia', section: 'services', label: 'Serviço 3 - Título', type: 'text' },
      { key: 'service3_desc', value: 'Alinhamento de hastes, troca de plaquetas de silicone hipoalergênicas, reaperto de parafusos ópticos e limpeza por ultrassom sem nenhum custo aos nossos clientes.', section: 'services', label: 'Serviço 3 - Descrição', type: 'textarea' },
      { key: 'service3_badge', value: 'Cortesia Gratuita na Loja', section: 'services', label: 'Serviço 3 - Selo', type: 'text' },

      { key: 'service4_title', value: 'Análise de Receita Médica', section: 'services', label: 'Serviço 4 - Título', type: 'text' },
      { key: 'service4_desc', value: 'Traga ou envie a receita do seu oftalmologista. Nossos consultores ópticos indicam o índice de refração e tratamentos ideais para lentes finas e sem distorções.', section: 'services', label: 'Serviço 4 - Descrição', type: 'textarea' },
      { key: 'service4_badge', value: 'Consultoria Especializada', section: 'services', label: 'Serviço 4 - Selo', type: 'text' },

      { key: 'service_cta_tag', value: 'Tem uma receita em mãos?', section: 'services', label: 'Banner WhatsApp - Tag', type: 'text' },
      { key: 'service_cta_title', value: 'Envie uma foto para o nosso WhatsApp', section: 'services', label: 'Banner WhatsApp - Título', type: 'text' },
      { key: 'service_cta_desc', value: 'Calculamos na hora o orçamento das lentes ideais para o seu grau com simulação de espessura e tratamentos antirreflexo e luz azul.', section: 'services', label: 'Banner WhatsApp - Descrição', type: 'textarea' },
      { key: 'service_cta_btn', value: 'Enviar Foto da Receita', section: 'services', label: 'Banner WhatsApp - Botão', type: 'text' },

      // 5. Rodapé & Textos Institucionais
      { key: 'footer_about', value: 'Excelência óptica em armações premium, óculos solares e lentes de alta definição tecnológica. Cuidando da saúde dos seus olhos com precisão e sofisticação.', section: 'footer', label: 'Texto Institucional do Rodapé', type: 'textarea' },
      { key: 'footer_copyright', value: '© 2026 Ótica Lince. Todos os direitos reservados.', section: 'footer', label: 'Texto de Direitos Autorais', type: 'text' },
      { key: 'footer_compliance', value: 'Em conformidade com a LGPD e Conselho de Óptica', section: 'footer', label: 'Texto de Conformidade Legal', type: 'text' }
    ];

    for (const item of defaultContents) {
      await run(`
        INSERT OR IGNORE INTO site_content (key, value, section, label, type)
        VALUES (?, ?, ?, ?, ?)
      `, [item.key, item.value, item.section, item.label, item.type]);
    }
  }
}

async function seedData() {
  // Clientes de exemplo
  const client1 = await run(`
    INSERT OR IGNORE INTO clients (name, cpf, phone, email, birth_date, gender, address, city, notes)
    VALUES ('Camila Albuquerque Silva', '321.654.987-12', '(11) 98765-4321', 'camila.albuquerque@email.com', '1992-05-14', 'Feminino', 'Av. Paulista, 1500, Apto 82', 'São Paulo - SP', 'Prefere armações leves de titânio e lentes com filtro de luz azul para trabalho no computador.')
  `);

  const client2 = await run(`
    INSERT OR IGNORE INTO clients (name, cpf, phone, email, birth_date, gender, address, city, notes)
    VALUES ('Rodrigo Mendes de Castro', '147.258.369-45', '(11) 97123-8899', 'rodrigo.mendes@email.com', '1985-11-20', 'Masculino', 'Rua Oscar Freire, 920', 'São Paulo - SP', 'Pratica esportes ao ar livre. Interessado em óculos de sol com grau polarizado.')
  `);

  const client3 = await run(`
    INSERT OR IGNORE INTO clients (name, cpf, phone, email, birth_date, gender, address, city, notes)
    VALUES ('Mariana Fagundes Rocha', '987.321.456-78', '(11) 99812-3456', 'mariana.rocha@email.com', '1998-08-30', 'Feminino', 'Rua Bela Cintra, 450', 'São Paulo - SP', 'Usuária de lentes de contato diárias e armações gatinho.')
  `);

  // Receitas Oftalmológicas dos clientes
  await run(`
    INSERT INTO prescriptions (client_id, doctor_name, crm, exam_date, expiration_date, od_spherical, od_cylindrical, od_axis, od_addition, oe_spherical, oe_cylindrical, oe_axis, oe_addition, dnp_od, dnp_oe, dp, lens_recommendation, notes)
    VALUES (?, 'Dra. Beatriz Fontana', 'CRM/SP 142.890', '2026-06-15', '2027-06-15', -2.25, -0.75, 85, 0.00, -2.50, -0.50, 95, 0.00, 31.5, 31.0, 62.5, 'Lente Monofocal Digital 1.67 com Filtro BlueProtect e Antirreflexo', 'Paciente relata fadiga visual no final da tarde.')
  `, [client1.id]);

  await run(`
    INSERT INTO prescriptions (client_id, doctor_name, crm, exam_date, expiration_date, od_spherical, od_cylindrical, od_axis, od_addition, oe_spherical, oe_cylindrical, oe_axis, oe_addition, dnp_od, dnp_oe, dp, lens_recommendation, notes)
    VALUES (?, 'Dr. Marcos Vinicius Meirelles', 'CRM/SP 119.450', '2026-08-10', '2027-08-10', +1.50, -1.25, 180, +2.00, +1.75, -1.00, 175, +2.00, 32.0, 32.0, 64.0, 'Multifocal Progressiva HD com Campo Visual Amplo e Fotossensível', 'Presbiopia e astigmatismo bilateral.')
  `, [client2.id]);

  // Produtos: Armações de Grau, Óculos de Sol, Lentes Oftálmicas, Lentes de Contato e Acessórios
  const sampleProducts = [
    // 1. Armações de Grau
    {
      name: 'Armação Lince Titanium Imperial',
      category: 'armacao_grau',
      subcategory: 'Unissex',
      brand: 'Lince Signature',
      frame_shape: 'Hexagonal',
      material: 'Titânio Japonês Ultraleve',
      color: 'Dourado Escovado',
      dimensions: 'Aro: 51mm | Ponte: 19mm | Haste: 142mm',
      price: 589.00,
      promo_price: 499.00,
      description: 'Estrutura premium em titânio cirúrgico ultraleve pesando apenas 11 gramas. Haste ergonômica com acabamento dourado e plaquetas de silicone hipoalergênicas.',
      image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80',
      badge: 'Mais Vendido',
      in_stock: 8,
      features: JSON.stringify(['Material: 100% Titânio Puro', 'Peso: 11g', 'Garantia de 2 anos', 'Ajuste de alta precisão'])
    },
    {
      name: 'Armação Lince Cat-Eye Viena',
      category: 'armacao_grau',
      subcategory: 'Feminino',
      brand: 'Lince Eyewear',
      frame_shape: 'Gatinho',
      material: 'Acetato Italiano Mazzucchelli',
      color: 'Tartaruga Havana com Vinho',
      dimensions: 'Aro: 53mm | Ponte: 17mm | Haste: 140mm',
      price: 460.00,
      promo_price: 399.00,
      description: 'Linhas gatinho clássicas e sofisticadas que valorizam o olhar. Feita no nobre acetato italiano polido à mão com detalhes refinados nas hastes.',
      image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=800&q=80',
      badge: 'Destaque',
      in_stock: 12,
      features: JSON.stringify(['Design Cat-Eye moderno', 'Acetato trabalhado à mão', 'Dobradiças de 5 dentes em aço inoxidável'])
    },
    {
      name: 'Armação Urban Classic Retangular',
      category: 'armacao_grau',
      subcategory: 'Masculino',
      brand: 'Lince Eyewear',
      frame_shape: 'Retangular',
      material: 'TR-90 Flex com Metal',
      color: 'Preto Fosco com Grafite',
      dimensions: 'Aro: 55mm | Ponte: 18mm | Haste: 145mm',
      price: 380.00,
      promo_price: null,
      description: 'Visual moderno e discreto para o dia a dia profissional. O polímero TR-90 confere resistência extrema ao impacto e conforto térmico.',
      image_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80',
      badge: 'Lançamento',
      in_stock: 15,
      features: JSON.stringify(['Alta flexibilidade', 'Resistente a quedas', 'Plaquetas integradas anatômicas'])
    },
    {
      name: 'Armação Round Minimalist Vintage',
      category: 'armacao_grau',
      subcategory: 'Unissex',
      brand: 'Lince Heritage',
      frame_shape: 'Redondo',
      material: 'Aço Inoxidável Cirúrgico',
      color: 'Prata com Ponteira Preta',
      dimensions: 'Aro: 49mm | Ponte: 20mm | Haste: 140mm',
      price: 420.00,
      promo_price: 360.00,
      description: 'Estética atemporal inspirada nos intelectuais dos anos 60. Aro redondo fino com ponte geométrica e hastes balanceadas.',
      image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
      badge: 'Estilo Retrô',
      in_stock: 6,
      features: JSON.stringify(['Design redondinho vintage', 'Hastes com molas flexíveis', 'Leveza e conforto'])
    },
    {
      name: 'Armação Geometric Bold Quadrada',
      category: 'armacao_grau',
      subcategory: 'Feminino',
      brand: 'Vogue Eyewear',
      frame_shape: 'Quadrado',
      material: 'Acetato Translúcido',
      color: 'Cristal Rose Gold',
      dimensions: 'Aro: 54mm | Ponte: 16mm | Haste: 140mm',
      price: 520.00,
      promo_price: 450.00,
      description: 'Bordas chanfradas em acetato translúcido que criam jogo de luz deslumbrante. Perfeita para quem busca personalidade e moda.',
      image_url: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=800&q=80',
      badge: 'Tendência',
      in_stock: 9,
      features: JSON.stringify(['Acetato cristal cristalino', 'Aro espesso marcante', 'Logo delicado gravado a laser'])
    },

    // 2. Óculos de Sol
    {
      name: 'Óculos de Sol Lince Aviator Master Polarizado',
      category: 'oculos_sol',
      subcategory: 'Unissex',
      brand: 'Lince Signature',
      frame_shape: 'Aviador',
      material: 'Liga Metálica Nobre com Couro',
      color: 'Dourado com Lentes G-15 Polarizadas',
      dimensions: 'Aro: 58mm | Ponte: 14mm | Haste: 140mm',
      price: 640.00,
      promo_price: 549.00,
      description: 'O clássico aviador aperfeiçoado. Lentes solares polarizadas com 100% de bloqueio UVA/UVB (UV400) e redução absoluta do reflexo de água e asfalto.',
      image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
      badge: 'Exclusivo',
      in_stock: 10,
      features: JSON.stringify(['Lentes Polarizadas G-15', 'Proteção UV400 Máxima', 'Estojo em couro legítimo Ótica Lince'])
    },
    {
      name: 'Óculos de Sol Wayfarer Riviera Black',
      category: 'oculos_sol',
      subcategory: 'Masculino',
      brand: 'Lince Eyewear',
      frame_shape: 'Quadrado',
      material: 'Acetato Preto Brilhante',
      color: 'Black Piano com Lentes Cinza Escuro',
      dimensions: 'Aro: 54mm | Ponte: 19mm | Haste: 145mm',
      price: 490.00,
      promo_price: null,
      description: 'Ícone de autenticidade e rebeldia com acabamento preto piano sofisticado. Perfeito para dirigir, praia ou ocasiões urbanas elegantes.',
      image_url: 'https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=800&q=80',
      badge: 'Clássico',
      in_stock: 14,
      features: JSON.stringify(['Design Wayfarer clássico', 'Lentes em policarbonato anti-risco', 'Proteção solar total UV400'])
    },
    {
      name: 'Óculos de Sol Diva Oversized Degradê',
      category: 'oculos_sol',
      subcategory: 'Feminino',
      brand: 'Lince Couture',
      frame_shape: 'Quadrado',
      material: 'Acetato e Aço Banhado a Ouro',
      color: 'Degradê Vinho & Âmbar',
      dimensions: 'Aro: 60mm | Ponte: 15mm | Haste: 140mm',
      price: 590.00,
      promo_price: 499.00,
      description: 'Armação ampla inspirada no glamour das celebridades de Cannes. Lentes com degradê suave e proteção ultravioleta total.',
      image_url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=800&q=80',
      badge: 'Luxo',
      in_stock: 7,
      features: JSON.stringify(['Aro amplo protetor', 'Lente degradê anti-reflexo interna', 'Detalhes com brasão Lince dourado'])
    },

    // 3. Lentes Oftálmicas (Lentes de Grau)
    {
      name: 'Lentes Lince BlueProtect Digital 1.67',
      category: 'lentes_oftalmicas',
      subcategory: 'Filtro Luz Azul',
      brand: 'Lince Optical Lab',
      frame_shape: 'N/A',
      material: 'Resina Alto Índice 1.67 Asférica',
      color: 'Transparente com Reflexo Azul Suave',
      dimensions: 'Diâmetro 70mm/75mm | Curvas 2 a 8',
      price: 480.00,
      promo_price: 399.00,
      description: 'Lentes ultrafinas com tecnologia de bloqueio seletivo da luz azul-violeta nociva emitida por computadores e celulares. Reduz a fadiga ocular e melhora a qualidade do sono.',
      image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
      badge: 'Essencial Trabalho',
      in_stock: 99,
      features: JSON.stringify(['Bloqueio de 99.9% da luz azul nociva', '35% mais finas que lentes comuns', 'Camada hidrorrepelente e antiestática'])
    },
    {
      name: 'Lentes Multifocais Progressivas HD Lince Panorama',
      category: 'lentes_oftalmicas',
      subcategory: 'Multifocal',
      brand: 'Lince Precision Free-Form',
      frame_shape: 'N/A',
      material: 'Policarbonato Digital Freeform',
      color: 'Transparente com Antirreflexo Premium',
      dimensions: 'Corredores progressivos 11mm a 17mm',
      price: 890.00,
      promo_price: 749.00,
      description: 'Desenvolvida com cálculo óptico ponto a ponto (Free-Form Digital). Transição suave entre visão de longe, intermediária (computador) e perto (leitura), com rápida adaptação.',
      image_url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80',
      badge: 'Alta Tecnologia',
      in_stock: 99,
      features: JSON.stringify(['Campo de visão 40% mais largo', 'Adaptação garantida em 30 dias', 'Tratamento antirreflexo de 8 camadas'])
    },
    {
      name: 'Lentes Fotossensíveis Lince SunSync Transitions',
      category: 'lentes_oftalmicas',
      subcategory: 'Fotossensível',
      brand: 'Lince Optical Lab',
      frame_shape: 'N/A',
      material: 'Resina Orgânica 1.56 Fotocromática',
      color: 'Clara em ambientes internos / Escura ao Sol',
      dimensions: 'Diâmetro 70mm',
      price: 520.00,
      promo_price: 450.00,
      description: 'Lentes inteligentes 2 em 1: totalmente transparentes em locais fechados e escurecem automaticamente em menos de 30 segundos sob o sol. Conforto em qualquer iluminação.',
      image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
      badge: '2 em 1',
      in_stock: 99,
      features: JSON.stringify(['Ativação rápida em raios UV', '100% proteção UVA/UVB', 'Tratamento antirrisco endurecido'])
    },
    {
      name: 'Lentes Ultra-Finoview 1.74 para Graus Altos',
      category: 'lentes_oftalmicas',
      subcategory: 'Alto Índice',
      brand: 'Lince Optical Lab',
      frame_shape: 'N/A',
      material: 'Resina Hi-Index 1.74 Double Aspheric',
      color: 'Ultra Transparente',
      dimensions: 'Espessura de borda minimizada',
      price: 980.00,
      promo_price: 850.00,
      description: 'A lente mais fina e leve do mundo para graus médios e altos de miopia ou hipermetropia. Elimina o efeito "fundo de garrafa" e o efeito que diminui os olhos.',
      image_url: 'https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=800&q=80',
      badge: 'Graus Elevados',
      in_stock: 99,
      features: JSON.stringify(['Até 55% mais fina que lentes padrão', 'Desenho duplamente asférico', 'Estética perfeita no rosto'])
    },

    // 4. Lentes de Contato
    {
      name: 'Lentes de Contato Acuvue Oasys com Hydraclear Plus',
      category: 'lentes_contato',
      subcategory: 'Descarte Quinzenal/Mensal',
      brand: 'Johnson & Johnson / Acuvue',
      frame_shape: 'N/A',
      material: 'Silicone Hidrogel (Senofilcon A)',
      color: 'Azul de visibilidade (Incolor no olho)',
      dimensions: 'Curvatura: 8.4mm / 8.8mm | Diâmetro: 14.0mm',
      price: 219.00,
      promo_price: 189.00,
      description: 'Caixa com 6 lentes. Excelente retenção de umidade para quem passa horas em ambientes com ar condicionado ou diante de telas digitais.',
      image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      badge: 'Mais Vendida',
      in_stock: 45,
      features: JSON.stringify(['Alta oxigenação da córnea', 'Filtro UV classe 1', 'Tecnologia Hydraclear Plus'])
    },
    {
      name: 'Lentes de Contato Diárias 1-Day Lince Moist',
      category: 'lentes_contato',
      subcategory: 'Descarte Diário',
      brand: 'Lince Care',
      frame_shape: 'N/A',
      material: 'Etafilcon A com Agente Umectante',
      color: 'Incolor',
      dimensions: 'Curva 8.5mm | Diâmetro 14.2mm (Caixa com 30 unidades)',
      price: 199.00,
      promo_price: null,
      description: 'Praticidade e higiene absoluta: use um par novo todos os dias sem necessidade de estojos e soluções de limpeza. Ideal para viagens e esportes.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
      badge: 'Praticidade',
      in_stock: 30,
      features: JSON.stringify(['Sem necessidade de manutenção', 'Máxima higiene diária', 'Ideal para atletas'])
    },
    {
      name: 'Lentes de Contato Coloridas FreshGlamour com Grau',
      category: 'lentes_contato',
      subcategory: 'Coloridas Anual/Mensal',
      brand: 'FreshGlamour',
      frame_shape: 'N/A',
      material: 'Polimacon Hidrogel',
      color: 'Mel / Verde Esmeralda / Cinza Cristal',
      dimensions: 'Curva 8.6mm | Diâmetro 14.2mm',
      price: 160.00,
      promo_price: 139.00,
      description: 'Realce natural para o olhar com padrão de cores tridimensional que mescla perfeitamente com a íris. Disponível com e sem grau.',
      image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      badge: 'Estética',
      in_stock: 22,
      features: JSON.stringify(['Cores naturais e realistas', 'Disponível do grau 0.00 até -6.00', 'Bordas ultrafinas'])
    },

    // 5. Acessórios de Óculos
    {
      name: 'Kit Limpa Lentes Ótica Lince NanoClean (Spray 60ml + 2 Microfibras)',
      category: 'acessorios',
      subcategory: 'Limpeza e Cuidados',
      brand: 'Lince Care',
      frame_shape: 'N/A',
      material: 'Fórmula sem álcool & Microfibra de Alta Densidade',
      color: 'Frasco Âmbar + Flanelas Vermelho Lince',
      dimensions: 'Frasco 60ml | Flanelas 18x18cm',
      price: 49.90,
      promo_price: 39.90,
      description: 'Fórmula exclusiva antisséptica, antiembaçante e antiestática que repele poeira e gordura sem agredir os tratamentos antirreflexo das lentes.',
      image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80',
      badge: 'Item Essencial',
      in_stock: 50,
      features: JSON.stringify(['Fórmula 100% segura para antirreflexo', 'Efeito antiembaçante prolongado', 'Microfibra aveludada lavável'])
    },
    {
      name: 'Estojo Rígido de Couro Legítimo Premium Lince',
      category: 'acessorios',
      subcategory: 'Estojos e Cases',
      brand: 'Lince Leather Goods',
      frame_shape: 'N/A',
      material: 'Couro Bovino Genuíno com Forro de Veludo Macio',
      color: 'Bordeaux (Vinho Lince) e Caramelo',
      dimensions: '16.5cm x 7.0cm x 4.5cm',
      price: 120.00,
      promo_price: 89.00,
      description: 'Proteção blindada contra impactos e quedas com a sofisticação do couro genuíno trabalhado artesanalmente. Fecho magnético e gravação do brasão Lince.',
      image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
      badge: 'Luxo Artesanal',
      in_stock: 18,
      features: JSON.stringify(['Couro legítimo de alta durabilidade', 'Interior aveludado anti-risco', 'Fechamento com imã de neodímio'])
    },
    {
      name: 'Corrente para Óculos Cordão Dourado Elegance 18k',
      category: 'acessorios',
      subcategory: 'Correntes e Cordões',
      brand: 'Lince Jewels',
      frame_shape: 'N/A',
      material: 'Metal Banhado a Ouro 18k com Verniz Protetor',
      color: 'Dourado Polido',
      dimensions: 'Comprimento: 72cm',
      price: 89.00,
      promo_price: 69.90,
      description: 'Acessório de moda que une praticidade e sofisticação. Mantém seus óculos sempre seguros junto ao peito com ponteiras de silicone ajustáveis a qualquer haste.',
      image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      badge: 'Acessório Tendência',
      in_stock: 25,
      features: JSON.stringify(['Banho de ouro 18k antialérgico', 'Borrachas de fixação universal', 'Design elo delicado'])
    },
    {
      name: 'Kit de Manutenção Óptica e Precisão (Chave 3 em 1 + Parafusos + Plaquetas)',
      category: 'acessorios',
      subcategory: 'Manutenção e Peças',
      brand: 'Lince Tech',
      frame_shape: 'N/A',
      material: 'Aço Temperado e Silicone Cirúrgico',
      color: 'Prata Metálico',
      dimensions: 'Chaveiro portátil 6cm',
      price: 35.00,
      promo_price: 25.00,
      description: 'Chaveiro multifuncional com fenda, philips e chave de porca óptica, acompanhado de 4 pares de plaquetas de silicone e parafusos sobressalentes.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      badge: 'Prático',
      in_stock: 40,
      features: JSON.stringify(['Chave 3 em 1 formato chaveiro', 'Plaquetas ultra macias de reposição', 'Parafusos universais'])
    }
  ];

  for (const p of sampleProducts) {
    await run(`
      INSERT INTO products (name, category, subcategory, brand, frame_shape, material, color, dimensions, price, promo_price, description, image_url, badge, in_stock, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      p.name, p.category, p.subcategory, p.brand, p.frame_shape, p.material, p.color,
      p.dimensions, p.price, p.promo_price, p.description, p.image_url, p.badge, p.in_stock, p.features
    ]);
  }

  // Orçamento / O.S. de exemplo no laboratório
  await run(`
    INSERT OR IGNORE INTO quotes (quote_code, client_name, client_phone, client_email, frame_id, frame_name, frame_price, lens_type, lens_treatments, lens_price, total_price, prescription_details, status, notes)
    VALUES ('LINCE-2026-001', 'Camila Albuquerque Silva', '(11) 98765-4321', 'camila.albuquerque@email.com', 1, 'Armação Lince Titanium Imperial', 499.00, 'Lentes Lince BlueProtect Digital 1.67', 'Filtro Luz Azul, Antirreflexo Premium, Antirrisco', 399.00, 898.00, 'OD: -2.25 Cil -0.75 Eixo 85° | OE: -2.50 Cil -0.50 Eixo 95° | DNP: 62.5mm', 'Aprovado', 'Enviado para montagem no laboratório óptico.')
  `);

  console.log('Banco de dados inicializado e populado com sucesso!');
}

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase
};

