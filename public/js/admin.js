/**
 * ÓTICA LINCE - Painel Administrativo Dedicado (admin.html)
 */
const Admin = {
  currentTab: 'dashboard',
  activeClient: null,

  async init() {
    this.bindAuthEvents();
    this.bindEvents();

    if (this.isAuthenticated()) {
      this.showMainLayout();
      await this.loadStats();
      await this.switchTab('dashboard');
    } else {
      this.showLoginScreen();
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('otica_lince_auth_token'));
  },

  showLoginScreen() {
    const login = document.getElementById('adminLoginScreen');
    const main = document.getElementById('adminMainLayout');
    if (login) {
      login.classList.remove('hidden');
      login.classList.add('flex');
    }
    if (main) main.classList.add('hidden');
  },

  showMainLayout() {
    const login = document.getElementById('adminLoginScreen');
    const main = document.getElementById('adminMainLayout');
    if (login) {
      login.classList.add('hidden');
      login.classList.remove('flex');
    }
    if (main) main.classList.remove('hidden');
  },

  bindAuthEvents() {
    // Form de login
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    // Toggle de visualização da senha
    const togglePassBtn = document.getElementById('btnTogglePassword');
    const passInput = document.getElementById('adminPassword');
    const toggleIcon = document.getElementById('togglePasswordIcon');
    if (togglePassBtn && passInput && toggleIcon) {
      togglePassBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleIcon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    }
  },

  fillDefaultCredentials() {
    const u = document.getElementById('adminUsername');
    const p = document.getElementById('adminPassword');
    if (u) u.value = 'admin';
    if (p) p.value = 'admin';
  },

  async handleLogin() {
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    const errorBox = document.getElementById('loginErrorMessage');
    const errorText = document.getElementById('loginErrorText');
    const submitBtn = document.getElementById('btnLoginSubmit');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
      if (errorBox && errorText) {
        errorText.textContent = 'Por favor, informe o usuário e a senha.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    const origBtn = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Validando...`;
    }

    try {
      const res = await API.login(username, password);
      if (res && res.success) {
        localStorage.setItem('otica_lince_auth_token', res.token);
        if (errorBox) errorBox.classList.add('hidden');
        
        this.showMainLayout();
        await this.loadStats();
        await this.switchTab('dashboard');
      } else {
        if (errorBox && errorText) {
          errorText.textContent = res ? res.message : 'Credenciais inválidas. Use admin / admin.';
          errorBox.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error(err);
      if (errorBox && errorText) {
        errorText.textContent = 'Erro ao conectar ao servidor da ótica.';
        errorBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtn;
      }
    }
  },

  logout() {
    if (confirm('Deseja realmente sair do painel administrativo da Ótica Lince?')) {
      localStorage.removeItem('otica_lince_auth_token');
      this.showLoginScreen();
      const errorBox = document.getElementById('loginErrorMessage');
      if (errorBox) errorBox.classList.add('hidden');
    }
  },

  bindEvents() {
    // 1. Sidebar Nav Items
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-nav-tab');
        this.switchTab(tab);

        // Auto-close menu on mobile screens
        const navMenu = document.getElementById('adminNavMenu');
        if (window.innerWidth < 1024 && navMenu && !navMenu.classList.contains('hidden')) {
          navMenu.classList.add('hidden');
        }
      });
    });

    // 2. Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('adminMobileToggle');
    const navMenu = document.getElementById('adminNavMenu');
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('hidden');
      });
    }

    // 3. Client Search
    const clientSearch = document.getElementById('adminClientSearch');
    if (clientSearch) {
      let debounce;
      clientSearch.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.loadClients(e.target.value.trim());
        }, 300);
      });
    }

    // 4. Client Form Submit
    const clientForm = document.getElementById('newClientForm');
    if (clientForm) {
      clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleClientSubmit(clientForm);
      });
    }

    // 5. Prescription Form Submit
    const rxForm = document.getElementById('newPrescriptionForm');
    if (rxForm) {
      rxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePrescriptionSubmit(rxForm);
      });
    }

    // 6. Product Form Submit
    const prodForm = document.getElementById('newProductForm');
    if (prodForm) {
      prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleProductSubmit(prodForm);
      });
    }

    // 7. Simulator Lens Form Submit
    const lensForm = document.getElementById('simulatorLensForm');
    if (lensForm) {
      lensForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLensSubmit(lensForm);
      });
    }

    // 8. Simulator Treatment Form Submit
    const treatForm = document.getElementById('simulatorTreatmentForm');
    if (treatForm) {
      treatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleTreatmentSubmit(treatForm);
      });
    }

    // 9. Simulator Commercial Settings Form Submit
    const settingsForm = document.getElementById('simulatorSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSettingsSubmit(settingsForm);
      });
    }

    // 10. CMS Forms Submit (Personalização do Site Tópico por Tópico)
    document.querySelectorAll('.cms-section-form, #cmsContentForm').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCmsSubmit(form);
      });
    });

    // 11. Generic modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close-modal');
        this.closeModal(id);
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
        }
      });
    });
  },

  async switchTab(tab) {
    if (tab === 'cms') tab = 'cms_identity';
    this.currentTab = tab;

    // Update Sidebar Navigation state
    document.querySelectorAll('[data-nav-tab]').forEach(b => {
      b.classList.remove('bg-lince-red', 'text-white', 'shadow-sm');
      b.classList.add('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
      if (b.getAttribute('data-nav-tab') === tab) {
        b.classList.add('bg-lince-red', 'text-white', 'shadow-sm');
        b.classList.remove('text-slate-300', 'hover:bg-slate-800');
      }
    });

    // Hide all views
    document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));

    // Show selected view
    const view = document.getElementById(`view_${tab}`);
    if (view) view.classList.remove('hidden');

    // Update Topbar Title & Subtitle
    const titleEl = document.getElementById('adminViewTitle');
    const subEl = document.getElementById('adminViewSubtitle');

    const viewHeaders = {
      dashboard: {
        title: 'Dashboard & Visão Geral',
        subtitle: 'Métricas em tempo real, atendimentos e movimentações da Ótica Lince'
      },
      clients: {
        title: 'Clientes & Prontuários (CRM)',
        subtitle: 'Cadastro completo de pacientes, endereços e histórico oftalmológico'
      },
      prescriptions: {
        title: 'Prontuário de Receitas Oftalmológicas',
        subtitle: 'Graus OD/OE, oftalmologistas responsáveis e conferência de validade'
      },
      products: {
        title: 'Estoque & Catálogo de Produtos',
        subtitle: 'Gestão de armações de grau, solares, lentes oftálmicas e acessórios'
      },
      quotes: {
        title: 'Orçamentos & Ordens de Serviço (O.S.)',
        subtitle: 'Cotações montadas pelo simulador do cliente para confecção laboratorial'
      },
      simulator: {
        title: 'Configuração do Simulador de Lentes & Orçamentos',
        subtitle: 'Personalize tipos de lentes, valores, tratamentos e regras comerciais exibidas no site'
      },
      cms_identity: {
        title: 'Personalização do Site: 1. Identidade & Contatos',
        subtitle: 'Nome oficial, slogan, telefones, WhatsApp, horários, endereço físico e redes sociais'
      },
      cms_topbar: {
        title: 'Personalização do Site: 2. Barra Superior (Topo)',
        subtitle: 'Faixa colorida no topo da vitrine com avisos rápidos de promoções, frete grátis e garantias'
      },
      cms_hero: {
        title: 'Personalização do Site: 3. Banner Principal (Hero)',
        subtitle: 'Chamada principal de boas-vindas, textos dos botões e as 4 métricas rápidas'
      },
      cms_featured: {
        title: 'Personalização do Site: 4. Armação em Destaque',
        subtitle: 'Modelo exclusivo em evidência com foto, selo de lançamento e valores promocionais'
      },
      cms_services: {
        title: 'Personalização do Site: 5. Serviços Especializados',
        subtitle: 'Laboratório próprio, medição de DNP, ajustes vitalícios e banner de WhatsApp'
      },
      cms_footer: {
        title: 'Personalização do Site: 6. Rodapé & Textos Legais',
        subtitle: 'História da marca no rodapé, termos de conformidade e direitos autorais'
      },
      cms: {
        title: 'Personalização do Site (CMS)',
        subtitle: 'Gestão visual completa da vitrine da Ótica Lince'
      }
    };

    if (viewHeaders[tab]) {
      if (titleEl) titleEl.textContent = viewHeaders[tab].title;
      if (subEl) subEl.textContent = viewHeaders[tab].subtitle;
    }

    // Load data for specific tab
    try {
      if (tab === 'dashboard') {
        await this.loadStats();
        await this.loadDashboardWidgets();
      } else if (tab === 'clients') {
        await this.loadClients();
      } else if (tab === 'prescriptions') {
        await this.loadPrescriptionsList();
        await this.populateClientsDropdown('rxClientIdSelect');
      } else if (tab === 'products') {
        await this.loadProductsList();
      } else if (tab === 'quotes') {
        await this.loadQuotesList();
      } else if (tab === 'simulator') {
        await this.loadSimulatorConfig();
      } else if (tab.startsWith('cms')) {
        await this.loadCmsContent();
      }
    } catch (err) {
      console.error(`Erro ao carregar dados da aba "${tab}":`, err);
    }
  },

  async loadStats() {
    try {
      const res = await API.getStats();
      if (res.success) {
        const s = res.data;
        const elC = document.getElementById('dashTotalClients');
        const elP = document.getElementById('dashTotalProducts');
        const elRx = document.getElementById('dashTotalPrescriptions');
        const elQ = document.getElementById('dashTotalQuotes');

        if (elC) elC.textContent = s.totalClients;
        if (elP) elP.textContent = s.totalProducts;
        if (elRx) elRx.textContent = s.totalPrescriptions;
        if (elQ) elQ.textContent = s.totalQuotes;
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadDashboardWidgets() {
    // 1. Recent Prescriptions widget
    const rxEl = document.getElementById('dashRecentPrescriptions');
    if (rxEl) {
      try {
        const res = await API.getPrescriptions();
        if (res.success && res.data.length > 0) {
          rxEl.innerHTML = res.data.slice(0, 4).map(rx => `
            <div class="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <i class="fa-solid fa-file-prescription"></i>
                </div>
                <div>
                  <h4 class="font-bold text-slate-900 text-xs">${rx.client_name}</h4>
                  <div class="text-[11px] text-slate-500">
                    Dr(a). ${rx.doctor_name || 'Oftalmologista'} • OD: ${rx.od_spherical > 0 ? `+${rx.od_spherical}` : rx.od_spherical} | OE: ${rx.oe_spherical > 0 ? `+${rx.oe_spherical}` : rx.oe_spherical}
                  </div>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                ${rx.exam_date ? rx.exam_date.split('-').reverse().join('/') : 'Receita Ativa'}
              </span>
            </div>
          `).join('');
        } else {
          rxEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Nenhuma receita registrada recentemente.</div>`;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Recent Quotes widget
    const quotesEl = document.getElementById('dashRecentQuotes');
    if (quotesEl) {
      try {
        const res = await API.getQuotes();
        if (res.success && res.data.length > 0) {
          quotesEl.innerHTML = res.data.slice(0, 4).map(q => `
            <div class="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition">
              <div>
                <span class="text-[10px] font-mono font-bold text-lince-red bg-red-50 px-1.5 py-0.5 rounded">${q.quote_code}</span>
                <h4 class="font-bold text-slate-900 text-xs mt-1">${q.client_name}</h4>
                <div class="text-[11px] text-slate-500 truncate max-w-xs">${q.frame_name}</div>
              </div>
              <div class="text-right">
                <div class="font-black text-lince-red text-xs">R$ ${q.total_price.toFixed(2).replace('.', ',')}</div>
                <span class="text-[10px] text-slate-400">${q.status}</span>
              </div>
            </div>
          `).join('');
        } else {
          quotesEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Nenhum orçamento registrado ainda.</div>`;
        }
      } catch (e) {
        console.error(e);
      }
    }
  },

  // ==========================================
  // CLIENTS
  // ==========================================
  async loadClients(search = '') {
    const listEl = document.getElementById('adminClientsList');
    if (!listEl) return;

    listEl.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-xl text-lince-red"></i> Carregando clientes...</div>`;

    try {
      const res = await API.getClients(search);
      if (res.success) {
        const clients = res.data;
        if (clients.length === 0) {
          listEl.innerHTML = `
            <div class="p-8 text-center text-slate-400">
              <i class="fa-regular fa-folder-open text-3xl mb-2"></i>
              <p>Nenhum cliente cadastrado${search ? ` para "${search}"` : ''}.</p>
            </div>
          `;
          return;
        }

        listEl.innerHTML = clients.map(c => `
          <div class="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-red-50 text-lince-red flex items-center justify-center font-extrabold text-base border border-red-100">
                ${c.name.charAt(0)}
              </div>
              <div>
                <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                  ${c.name}
                  ${c.gender ? `<span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-normal">${c.gender}</span>` : ''}
                </div>
                <div class="text-xs text-slate-500 flex flex-wrap gap-3 mt-0.5">
                  <span><i class="fa-solid fa-phone text-[10px] text-slate-400"></i> ${c.phone}</span>
                  ${c.cpf ? `<span><i class="fa-regular fa-id-card text-[10px] text-slate-400"></i> ${c.cpf}</span>` : ''}
                  ${c.email ? `<span><i class="fa-regular fa-envelope text-[10px] text-slate-400"></i> ${c.email}</span>` : ''}
                  ${c.city ? `<span><i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i> ${c.city}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end md:self-center">
              <button onclick="Admin.viewClientDetail(${c.id})" class="px-3 py-1.5 bg-red-50 text-lince-red text-xs font-bold rounded-xl hover:bg-red-100 transition flex items-center gap-1.5 shadow-xs">
                <i class="fa-solid fa-file-prescription"></i> Prontuário & Receitas
              </button>
              <button onclick="Admin.openAddPrescriptionForClient(${c.id}, '${c.name}')" class="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition flex items-center gap-1">
                <i class="fa-solid fa-plus text-xs"></i> Receita
              </button>
              <button onclick="Admin.deleteClient(${c.id}, '${c.name}')" class="p-2 text-slate-400 hover:text-red-600 transition" title="Excluir Cliente">
                <i class="fa-solid fa-trash-can text-sm"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
      listEl.innerHTML = `<div class="p-4 text-center text-red-600">Erro ao carregar lista de clientes.</div>`;
    }
  },

  toggleNewClientRxSection() {
    const sec = document.getElementById('newClientRxSection');
    const chev = document.getElementById('newClientRxChevron');
    const txt = document.getElementById('newClientRxStatusText');
    if (!sec) return;
    const isHidden = sec.classList.contains('hidden');
    if (isHidden) {
      sec.classList.remove('hidden');
      if (chev) chev.className = 'fa-solid fa-chevron-up text-[10px]';
      if (txt) txt.textContent = 'Ocultar';
    } else {
      sec.classList.add('hidden');
      if (chev) chev.className = 'fa-solid fa-chevron-down text-[10px]';
      if (txt) txt.textContent = 'Anexar';
    }
  },

  async handleClientSubmit(form) {
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();

    if (!name || !phone) {
      alert('Nome e Telefone são campos obrigatórios.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando no banco...`;

    try {
      const formData = new FormData(form);
      const res = await API.createClient(formData);
      if (res.success) {
        alert('Cliente e dados médicos cadastrados com sucesso no banco de dados!');
        form.reset();
        
        // Reset prescription section if open
        const rxSection = document.getElementById('newClientRxSection');
        if (rxSection) rxSection.classList.add('hidden');
        const rxStatus = document.getElementById('newClientRxStatusText');
        if (rxStatus) rxStatus.textContent = 'Anexar';
        const rxChev = document.getElementById('newClientRxChevron');
        if (rxChev) rxChev.className = 'fa-solid fa-chevron-down text-[10px]';

        this.closeModal('newClientModal');
        await this.loadClients();
        await this.loadStats();
      } else {
        alert('Erro ao cadastrar cliente: ' + (res.message || 'Erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão com o servidor.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async viewClientDetail(clientId) {
    try {
      const res = await API.getClientById(clientId);
      if (!res.success) return;

      const client = res.data;
      this.activeClient = client;

      const modal = document.getElementById('clientDetailModal');
      const container = document.getElementById('clientDetailContent');
      if (!modal || !container) return;

      const prescriptionsHtml = client.prescriptions.length === 0
        ? `<div class="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">Nenhuma receita oftalmológica anexada a este paciente ainda.</div>`
        : client.prescriptions.map(rx => {
            const isExpired = rx.expiration_date && new Date(rx.expiration_date) < new Date();
            return `
              <div class="bg-white p-5 rounded-2xl border border-slate-200 mb-4 shadow-xs">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span class="font-bold text-slate-900 text-sm">${rx.doctor_name || 'Médico Oftalmologista'}</span>
                    <span class="text-xs text-slate-500 ml-1">(${rx.crm || 'CRM N/D'})</span>
                    <div class="text-[11px] text-slate-400">Consulta: ${rx.exam_date ? rx.exam_date.split('-').reverse().join('/') : 'N/D'}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    ${isExpired 
                      ? `<span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Receita Vencida (> 1 ano)</span>`
                      : `<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check mr-1"></i> Receita Válida</span>`
                    }
                    <button onclick="Admin.deletePrescription(${rx.id}, ${client.id})" class="text-slate-400 hover:text-red-600 text-xs p-1" title="Excluir Receita">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                <!-- Tabela Óptica OD / OE -->
                <div class="overflow-x-auto mb-3">
                  <table class="w-full text-center text-xs rx-table border-collapse">
                    <thead>
                      <tr>
                        <th class="w-16">Olho</th>
                        <th>Esférico (Esf)</th>
                        <th>Cilíndrico (Cil)</th>
                        <th>Eixo (°)</th>
                        <th>Adição (Add)</th>
                        <th>DNP (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="rx-badge-od">OD</td>
                        <td class="font-mono font-bold">${rx.od_spherical > 0 ? `+${rx.od_spherical.toFixed(2)}` : rx.od_spherical.toFixed(2)}</td>
                        <td class="font-mono font-bold">${rx.od_cylindrical.toFixed(2)}</td>
                        <td class="font-mono">${rx.od_axis}°</td>
                        <td class="font-mono">${rx.od_addition > 0 ? `+${rx.od_addition.toFixed(2)}` : '0.00'}</td>
                        <td class="font-mono">${rx.dnp_od || 31}mm</td>
                      </tr>
                      <tr>
                        <td class="rx-badge-oe">OE</td>
                        <td class="font-mono font-bold">${rx.oe_spherical > 0 ? `+${rx.oe_spherical.toFixed(2)}` : rx.oe_spherical.toFixed(2)}</td>
                        <td class="font-mono font-bold">${rx.oe_cylindrical.toFixed(2)}</td>
                        <td class="font-mono">${rx.oe_axis}°</td>
                        <td class="font-mono">${rx.oe_addition > 0 ? `+${rx.oe_addition.toFixed(2)}` : '0.00'}</td>
                        <td class="font-mono">${rx.dnp_oe || 31}mm</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                ${rx.lens_recommendation ? `
                  <div class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl mb-2">
                    <strong>Recomendação de Lente:</strong> ${rx.lens_recommendation}
                  </div>
                ` : ''}

                ${rx.prescription_file ? `
                  <div class="mt-2">
                    <a href="${rx.prescription_file}" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-lince-red font-bold hover:underline">
                      <i class="fa-solid fa-file-image"></i> Ver Arquivo / Foto Escaneada da Receita
                    </a>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('');

      container.innerHTML = `
        <div class="mb-6 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-slate-900">${client.name}</h3>
            <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
              <span><i class="fa-solid fa-phone text-lince-red"></i> ${client.phone}</span>
              ${client.email ? `<span><i class="fa-solid fa-envelope text-slate-400"></i> ${client.email}</span>` : ''}
              ${client.cpf ? `<span><i class="fa-solid fa-id-card text-slate-400"></i> ${client.cpf}</span>` : ''}
              <span><i class="fa-solid fa-location-dot text-slate-400"></i> ${client.address || 'Endereço não informado'}</span>
            </div>
          </div>
          <button onclick="Admin.openAddPrescriptionForClient(${client.id}, '${client.name}')" class="px-4 py-2 bg-lince-red hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Nova Receita para ${client.name.split(' ')[0]}
          </button>
        </div>

        <div class="mb-4">
          <h4 class="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <i class="fa-solid fa-notes-medical text-lince-red"></i> Histórico Oftalmológico (Prontuário)
          </h4>
          ${prescriptionsHtml}
        </div>
      `;

      this.openModal('clientDetailModal');
    } catch (e) {
      console.error(e);
    }
  },

  async deleteClient(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${name}" e todo o seu prontuário médico?`)) {
      return;
    }
    try {
      const res = await API.deleteClient(id);
      if (res.success) {
        await this.loadClients();
        await this.loadStats();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // PRESCRIPTIONS (RECEITAS OFTALMOLÓGICAS)
  // ==========================================
  allPrescriptions: [],
  rxFilter: 'all',

  async loadPrescriptionsList() {
    const listEl = document.getElementById('adminPrescriptionsList');
    if (!listEl) return;

    listEl.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-xl text-lince-red"></i> Carregando prontuário de receitas...</div>`;

    try {
      const res = await API.getPrescriptions();
      if (res.success) {
        this.allPrescriptions = res.data;
        this.renderPrescriptionsList();
      }
    } catch (e) {
      console.error(e);
      listEl.innerHTML = `<div class="p-6 text-center text-red-600">Erro ao carregar receitas do servidor.</div>`;
    }
  },

  filterPrescriptions(filter) {
    this.rxFilter = filter;
    this.renderPrescriptionsList();
  },

  renderPrescriptionsList() {
    const listEl = document.getElementById('adminPrescriptionsList');
    if (!listEl) return;

    const all = this.allPrescriptions || [];

    // Contadores
    const siteCount = all.filter(rx => (rx.notes && rx.notes.includes('[Upload via Site]')) || (rx.prescription_file && (!rx.crm || rx.crm === 'N/A' || rx.crm === 'N/D'))).length;
    const storeCount = all.length - siteCount;

    const elTotal = document.getElementById('countRxTotal');
    const elSite = document.getElementById('countRxSite');
    const elStore = document.getElementById('countRxStore');
    if (elTotal) elTotal.textContent = all.length;
    if (elSite) elSite.textContent = siteCount;
    if (elStore) elStore.textContent = storeCount;

    // Estilo dos botões de filtro
    ['all', 'site', 'store'].forEach(f => {
      const btn = document.getElementById(`btnFilterRx_${f}`);
      if (btn) {
        if (f === this.rxFilter) {
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs transition flex items-center gap-1.5 font-bold';
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 font-bold';
        }
      }
    });

    const filtered = all.filter(rx => {
      const isFromSite = Boolean(rx.notes && rx.notes.includes('[Upload via Site]')) || (Boolean(rx.prescription_file) && (!rx.crm || rx.crm === 'N/A' || rx.crm === 'N/D'));
      if (this.rxFilter === 'site') return isFromSite;
      if (this.rxFilter === 'store') return !isFromSite;
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="p-10 text-center text-slate-400">
          <i class="fa-regular fa-folder-open text-3xl mb-2 text-slate-300 block"></i>
          <p class="font-bold text-slate-600">Nenhuma receita encontrada para este filtro.</p>
          <span class="text-xs text-slate-400">Quando os clientes enviarem receitas pelo site ou balcão, elas aparecerão aqui.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(rx => {
      const isExpired = rx.expiration_date && new Date(rx.expiration_date) < new Date();
      const isFromSite = Boolean(rx.notes && rx.notes.includes('[Upload via Site]')) || (Boolean(rx.prescription_file) && (!rx.crm || rx.crm === 'N/A' || rx.crm === 'N/D'));
      const isImage = rx.prescription_file && /\.(jpg|jpeg|png|webp|gif)$/i.test(rx.prescription_file);
      
      const cleanPhone = (rx.client_phone || '').replace(/\D/g, '');
      const waMsg = encodeURIComponent(`Olá, ${rx.client_name}! Sou da Ótica Lince. Recebemos sua receita médica enviada pelo nosso site e já temos as opções e orçamento de lentes prontos para você!`);
      const waLink = cleanPhone ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${waMsg}` : null;

      return `
        <div class="p-5 bg-white rounded-3xl border ${isFromSite ? 'border-purple-200/90 shadow-sm' : 'border-slate-200'} space-y-4 hover:border-slate-300 transition">
          
          <!-- Topo do Card -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl ${isFromSite ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700'} flex items-center justify-center text-lg font-black shrink-0">
                <i class="fa-solid ${isFromSite ? 'fa-cloud-arrow-up' : 'fa-file-prescription'}"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-bold text-slate-900 text-sm sm:text-base">${rx.client_name}</h4>
                  ${isFromSite 
                    ? `<span class="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1"><i class="fa-solid fa-cloud-arrow-up text-purple-600"></i> Upload pelo Site</span>`
                    : `<span class="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">Cadastrada na Loja</span>`
                  }
                </div>
                <div class="text-xs text-slate-500 flex flex-wrap gap-3 mt-1">
                  ${rx.client_phone ? `<span class="font-semibold text-slate-700 flex items-center gap-1"><i class="fa-solid fa-phone text-slate-400"></i> ${rx.client_phone}</span>` : ''}
                  <span><i class="fa-solid fa-user-doctor text-lince-red"></i> ${rx.doctor_name || 'Dr(a). Oftalmologista'} ${rx.crm ? `(${rx.crm})` : ''}</span>
                  <span class="text-slate-400"><i class="fa-regular fa-calendar"></i> ${rx.exam_date ? rx.exam_date.split('-').reverse().join('/') : 'Data N/D'}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-auto">
              ${waLink ? `
                <a href="${waLink}" target="_blank" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs">
                  <i class="fa-brands fa-whatsapp"></i> Chamar no WhatsApp
                </a>
              ` : ''}
              
              ${isExpired 
                ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Vencida</span>`
                : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check mr-1"></i> Válida</span>`
              }

              <button onclick="Admin.deletePrescription(${rx.id})" class="p-2 text-slate-400 hover:text-red-600 transition" title="Excluir Receita">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Matriz Óptica OD / OE se houver graus informados -->
          ${(rx.od_spherical != 0 || rx.oe_spherical != 0 || rx.od_cylindrical != 0 || rx.oe_cylindrical != 0) ? `
            <div class="overflow-x-auto">
              <table class="w-full text-center text-xs rx-table border-collapse">
                <thead>
                  <tr>
                    <th class="w-16">Olho</th>
                    <th>Esférico (Esf)</th>
                    <th>Cilíndrico (Cil)</th>
                    <th>Eixo</th>
                    <th>Adição</th>
                    <th>DNP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="rx-badge-od">OD</td>
                    <td class="font-mono font-bold">${rx.od_spherical > 0 ? `+${rx.od_spherical.toFixed(2)}` : rx.od_spherical.toFixed(2)}</td>
                    <td class="font-mono font-bold">${rx.od_cylindrical.toFixed(2)}</td>
                    <td class="font-mono">${rx.od_axis}°</td>
                    <td class="font-mono">${rx.od_addition > 0 ? `+${rx.od_addition.toFixed(2)}` : '0.00'}</td>
                    <td class="font-mono">${rx.dnp_od || 31}mm</td>
                  </tr>
                  <tr>
                    <td class="rx-badge-oe">OE</td>
                    <td class="font-mono font-bold">${rx.oe_spherical > 0 ? `+${rx.oe_spherical.toFixed(2)}` : rx.oe_spherical.toFixed(2)}</td>
                    <td class="font-mono font-bold">${rx.oe_cylindrical.toFixed(2)}</td>
                    <td class="font-mono">${rx.oe_axis}°</td>
                    <td class="font-mono">${rx.oe_addition > 0 ? `+${rx.oe_addition.toFixed(2)}` : '0.00'}</td>
                    <td class="font-mono">${rx.dnp_oe || 31}mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Recomendação de Lente ou Notas do Cliente -->
          <div class="flex flex-wrap gap-2 text-xs">
            ${rx.lens_recommendation ? `
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-700 flex-1 min-w-[240px]">
                <strong class="text-slate-900"><i class="fa-solid fa-tag text-lince-red mr-1"></i> Recomendação / Tipo de Lente:</strong> ${rx.lens_recommendation}
              </div>
            ` : ''}

            ${rx.notes ? `
              <div class="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200/80 text-purple-900 flex-1 min-w-[240px]">
                <strong class="text-purple-950"><i class="fa-solid fa-message text-purple-600 mr-1"></i> Mensagem / Detalhes:</strong> ${rx.notes}
              </div>
            ` : ''}
          </div>

          <!-- ARQUIVO ANEXADO (FOTO / PDF) -->
          ${rx.prescription_file ? `
            <div class="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                ${isImage ? `
                  <a href="${rx.prescription_file}" target="_blank" title="Clique para abrir foto ampliada" class="block w-16 h-16 bg-white rounded-xl border-2 border-slate-200 overflow-hidden hover:scale-105 transition shrink-0 shadow-xs cursor-zoom-in">
                    <img src="${rx.prescription_file}" alt="Foto da Receita" class="w-full h-full object-cover">
                  </a>
                ` : `
                  <div class="w-14 h-14 bg-red-100 text-lince-red rounded-xl flex items-center justify-center text-2xl shrink-0 border border-red-200">
                    <i class="fa-solid fa-file-pdf"></i>
                  </div>
                `}
                <div>
                  <div class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <i class="fa-solid fa-paperclip text-lince-red"></i> Documento / Foto da Receita Anexada
                  </div>
                  <span class="text-[11px] text-slate-500 font-mono block truncate max-w-xs mt-0.5">
                    ${rx.prescription_file.split('/').pop()}
                  </span>
                  <span class="text-[10px] text-emerald-600 font-bold block mt-0.5">
                    <i class="fa-solid fa-circle-check"></i> Arquivo disponível no servidor da ótica
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <a href="${rx.prescription_file}" target="_blank" class="px-4 py-2 bg-lince-red hover:bg-red-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir em Tela Cheia
                </a>
                <a href="${rx.prescription_file}" download class="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition" title="Baixar Documento">
                  <i class="fa-solid fa-download"></i>
                </a>
              </div>
            </div>
          ` : ''}

        </div>
      `;
    }).join('');
  },

  async populateClientsDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
      const res = await API.getClients();
      if (res.success) {
        select.innerHTML = `<option value="">Selecione o Cliente / Paciente</option>` +
          res.data.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async openAddPrescriptionForClient(clientId, clientName) {
    this.closeModal('clientDetailModal');
    await this.populateClientsDropdown('rxClientIdSelect');
    this.openModal('newPrescriptionModal');
    
    const select = document.getElementById('rxClientIdSelect');
    if (select) {
      select.value = clientId;
    }
  },

  async handlePrescriptionSubmit(form) {
    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando receita...`;

    try {
      const res = await API.createPrescription(formData);
      if (res.success) {
        alert('Receita oftalmológica cadastrada com sucesso!');
        form.reset();
        this.closeModal('newPrescriptionModal');
        await this.loadPrescriptionsList();
        await this.loadStats();
        if (this.activeClient) {
          await this.viewClientDetail(this.activeClient.id);
        }
      } else {
        alert('Erro ao cadastrar receita: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar receita.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async deletePrescription(id, reloadClientId = null) {
    if (!confirm('Deseja excluir esta receita do prontuário?')) return;
    try {
      const res = await API.deletePrescription(id);
      if (res.success) {
        if (reloadClientId) {
          await this.viewClientDetail(reloadClientId);
        } else {
          await this.loadPrescriptionsList();
        }
        await this.loadStats();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // PRODUCTS MANAGEMENT
  // ==========================================
  async loadProductsList() {
    const listEl = document.getElementById('adminProductsList');
    if (!listEl) return;

    listEl.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-xl text-lince-red"></i> Carregando produtos...</div>`;

    try {
      const res = await API.getProducts();
      if (res.success) {
        const products = res.data;
        listEl.innerHTML = products.map(p => `
          <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img 
                src="${p.image_url}" 
                alt="${p.name}" 
                class="w-16 h-12 object-contain bg-slate-50 rounded-xl p-1 border border-slate-100" 
                onerror="this.src='https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'"
              />
              <div>
                <div class="font-bold text-slate-900 text-sm">${p.name}</div>
                <div class="text-xs text-slate-500">${p.brand} • ${p.category} ${p.frame_shape && p.frame_shape !== 'N/A' ? `• ${p.frame_shape}` : ''}</div>
              </div>
            </div>

            <div class="flex items-center gap-4 text-right">
              <div>
                <div class="font-bold text-lince-red text-sm">R$ ${(p.promo_price || p.price).toFixed(2).replace('.', ',')}</div>
                <div class="text-[11px] text-slate-400">Estoque: <strong>${p.in_stock} un.</strong></div>
              </div>
              <button onclick="Admin.deleteProduct(${p.id}, '${p.name}')" class="p-2 text-slate-400 hover:text-red-600 transition" title="Excluir Produto">
                <i class="fa-solid fa-trash text-sm"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async handleProductSubmit(form) {
    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...`;

    try {
      const res = await API.createProduct(formData);
      if (res.success) {
        alert('Produto cadastrado com sucesso no catálogo!');
        form.reset();
        this.closeModal('newProductModal');
        await this.loadProductsList();
        await this.loadStats();
      } else {
        alert('Erro ao cadastrar: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar produto.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async deleteProduct(id, name) {
    if (!confirm(`Deseja excluir o produto "${name}" do catálogo?`)) return;
    try {
      const res = await API.deleteProduct(id);
      if (res.success) {
        await this.loadProductsList();
        await this.loadStats();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // QUOTES & ORDERS
  // ==========================================
  async loadQuotesList() {
    const listEl = document.getElementById('adminQuotesList');
    if (!listEl) return;

    listEl.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-xl text-lince-red"></i> Carregando orçamentos...</div>`;

    try {
      const res = await API.getQuotes();
      if (res.success) {
        const quotes = res.data;
        if (quotes.length === 0) {
          listEl.innerHTML = `<div class="p-8 text-center text-slate-400">Nenhum orçamento gerado ainda.</div>`;
          return;
        }

        listEl.innerHTML = quotes.map(q => `
          <div class="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span class="text-xs font-mono font-bold text-lince-red bg-red-50 px-2 py-0.5 rounded border border-red-100">${q.quote_code}</span>
                <span class="font-bold text-slate-900 text-sm ml-2">${q.client_name}</span>
                <span class="text-xs text-slate-500 ml-1">(${q.client_phone})</span>
              </div>
              <div class="text-right">
                <span class="text-base font-extrabold text-lince-red">R$ ${q.total_price.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div class="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
              <div><strong>Armação:</strong> ${q.frame_name} (R$ ${q.frame_price.toFixed(2).replace('.', ',')})</div>
              <div><strong>Lentes:</strong> ${q.lens_type} + ${q.lens_treatments || 'Sem tratamentos adicionais'} (R$ ${q.lens_price.toFixed(2).replace('.', ',')})</div>
              ${q.prescription_details ? `<div><strong>Grau Prescrito:</strong> <span class="font-mono">${q.prescription_details}</span></div>` : ''}
              ${q.notes ? `<div><strong>Obs do Cliente:</strong> <em>${q.notes}</em></div>` : ''}
            </div>

            <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">Status O.S.:</span>
                <select onchange="Admin.changeQuoteStatus(${q.id}, this.value)" class="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-bold">
                  <option value="Em Análise" ${q.status === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                  <option value="Aprovado" ${q.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                  <option value="Em Produção no Laboratório" ${q.status === 'Em Produção no Laboratório' ? 'selected' : ''}>Em Produção</option>
                  <option value="Pronto para Retirada" ${q.status === 'Pronto para Retirada' ? 'selected' : ''}>Pronto p/ Retirada</option>
                  <option value="Entregue" ${q.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                </select>
              </div>
              <a href="https://wa.me/55${q.client_phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(q.client_name)}!%20Falamos%20da%20Ótica%20Lince%20sobre%20o%20seu%20orçamento%20${q.quote_code}." target="_blank" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <i class="fa-brands fa-whatsapp text-sm"></i> Falar com Cliente
              </a>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async changeQuoteStatus(id, newStatus) {
    try {
      await API.updateQuoteStatus(id, newStatus);
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // SIMULATOR & QUOTE CONFIGURATION
  // ==========================================
  simulatorData: {
    lenses: [],
    treatments: [],
    settings: {}
  },

  async loadSimulatorConfig() {
    const lensesTable = document.getElementById('adminSimulatorLensesTable');
    const treatmentsTable = document.getElementById('adminSimulatorTreatmentsTable');

    if (lensesTable) {
      lensesTable.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin"></i> Carregando lentes do simulador...</td></tr>`;
    }
    if (treatmentsTable) {
      treatmentsTable.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin"></i> Carregando tratamentos...</td></tr>`;
    }

    try {
      const res = await API.getSimulatorAdminConfig();
      if (res.success && res.data) {
        this.simulatorData = res.data;
        this.renderSimulatorLensesTable();
        this.renderSimulatorTreatmentsTable();
        this.populateSimulatorSettingsForm();
      }
    } catch (e) {
      console.error(e);
      if (lensesTable) lensesTable.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500">Erro ao carregar dados do simulador.</td></tr>`;
    }
  },

  renderSimulatorLensesTable() {
    const table = document.getElementById('adminSimulatorLensesTable');
    if (!table) return;

    const lenses = this.simulatorData.lenses || [];
    if (lenses.length === 0) {
      table.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Nenhuma opção de lente cadastrada.</td></tr>`;
      return;
    }

    table.innerHTML = lenses.map(l => `
      <tr class="hover:bg-slate-50/80 transition ${l.active ? '' : 'opacity-60 bg-slate-50/40'}">
        <td class="py-3 px-4 font-bold text-slate-400">${l.order_num || 0}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${l.name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${l.lens_key}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-lince-red border border-red-100">
            ${l.badge || 'Padrão'}
          </span>
        </td>
        <td class="py-3 px-4 font-extrabold text-slate-900">
          R$ ${parseFloat(l.price).toFixed(2).replace('.', ',')}
        </td>
        <td class="py-3 px-4 max-w-xs text-slate-500 truncate" title="${l.description || ''}">
          ${l.description || '—'}
        </td>
        <td class="py-3 px-4">
          ${l.active ? 
            '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Ativo no Site</span>' : 
            '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">Inativo</span>'
          }
        </td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="Admin.openEditLensModal(${l.id})" class="px-2.5 py-1 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>
            <button onclick="Admin.deleteSimulatorLens(${l.id}, '${l.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openNewLensModal() {
    const form = document.getElementById('simulatorLensForm');
    if (form) form.reset();
    document.getElementById('lens_modal_id').value = '';
    document.getElementById('lens_modal_order').value = ((this.simulatorData.lenses || []).length + 1);
    document.getElementById('lens_modal_active').checked = true;
    document.getElementById('simulatorLensModalTitle').innerHTML = '<i class="fa-solid fa-glasses text-lince-red"></i> Nova Opção de Lente Oftálmica';
    this.openModal('simulatorLensModal');
  },

  openEditLensModal(id) {
    const lens = (this.simulatorData.lenses || []).find(l => l.id === id);
    if (!lens) return;

    document.getElementById('lens_modal_id').value = lens.id;
    document.getElementById('lens_modal_name').value = lens.name;
    document.getElementById('lens_modal_badge').value = lens.badge || '';
    document.getElementById('lens_modal_price').value = lens.price;
    document.getElementById('lens_modal_description').value = lens.description || '';
    document.getElementById('lens_modal_order').value = lens.order_num || 1;
    document.getElementById('lens_modal_active').checked = Boolean(lens.active);

    document.getElementById('simulatorLensModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-lince-red"></i> Editar Opção de Lente';
    this.openModal('simulatorLensModal');
  },

  async handleLensSubmit(form) {
    const id = document.getElementById('lens_modal_id').value;
    const name = document.getElementById('lens_modal_name').value.trim();
    const badge = document.getElementById('lens_modal_badge').value.trim();
    const price = parseFloat(document.getElementById('lens_modal_price').value) || 0;
    const description = document.getElementById('lens_modal_description').value.trim();
    const order_num = parseInt(document.getElementById('lens_modal_order').value) || 0;
    const active = document.getElementById('lens_modal_active').checked ? 1 : 0;

    const data = { name, badge, price, description, order_num, active };
    const btn = document.getElementById('btnSaveLensModal');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;

    try {
      let res;
      if (id) {
        res = await API.updateSimulatorLens(id, data);
      } else {
        res = await API.createSimulatorLens(data);
      }

      if (res.success) {
        this.closeModal('simulatorLensModal');
        await this.loadSimulatorConfig();
      } else {
        alert('Erro ao salvar lente: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão com o servidor.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  async deleteSimulatorLens(id, name) {
    if (!confirm(`Deseja realmente excluir a opção de lente "${name}" do simulador?`)) return;
    try {
      const res = await API.deleteSimulatorLens(id);
      if (res.success) {
        await this.loadSimulatorConfig();
      } else {
        alert('Erro ao excluir: ' + res.message);
      }
    } catch (e) {
      console.error(e);
    }
  },

  renderSimulatorTreatmentsTable() {
    const table = document.getElementById('adminSimulatorTreatmentsTable');
    if (!table) return;

    const treatments = this.simulatorData.treatments || [];
    if (treatments.length === 0) {
      table.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Nenhum tratamento cadastrado.</td></tr>`;
      return;
    }

    table.innerHTML = treatments.map(t => `
      <tr class="hover:bg-slate-50/80 transition ${t.active ? '' : 'opacity-60 bg-slate-50/40'}">
        <td class="py-3 px-4 font-bold text-slate-400">${t.order_num || 0}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${t.name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${t.treatment_key}</div>
        </td>
        <td class="py-3 px-4 font-extrabold ${t.is_free ? 'text-emerald-600' : 'text-slate-900'}">
          ${t.is_free ? 'Grátis (R$ 0,00)' : `+ R$ ${parseFloat(t.price).toFixed(2).replace('.', ',')}`}
        </td>
        <td class="py-3 px-4">
          ${t.is_default ? 
            '<span class="text-xs font-bold text-blue-600"><i class="fa-solid fa-check"></i> Sim</span>' : 
            '<span class="text-xs text-slate-400">Não</span>'
          }
        </td>
        <td class="py-3 px-4">
          ${t.is_free ? 
            '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Cortesia</span>' : 
            '<span class="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">Opcional Pago</span>'
          }
        </td>
        <td class="py-3 px-4">
          ${t.active ? 
            '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Ativo</span>' : 
            '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">Inativo</span>'
          }
        </td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="Admin.openEditTreatmentModal(${t.id})" class="px-2.5 py-1 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>
            <button onclick="Admin.deleteSimulatorTreatment(${t.id}, '${t.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openNewTreatmentModal() {
    const form = document.getElementById('simulatorTreatmentForm');
    if (form) form.reset();
    document.getElementById('treatment_modal_id').value = '';
    document.getElementById('treatment_modal_order').value = ((this.simulatorData.treatments || []).length + 1);
    document.getElementById('treatment_modal_active').checked = true;
    document.getElementById('treatment_modal_default').checked = false;
    document.getElementById('treatment_modal_free').checked = false;
    document.getElementById('simulatorTreatmentModalTitle').innerHTML = '<i class="fa-solid fa-shield-halved text-blue-600"></i> Novo Tratamento de Lente';
    this.openModal('simulatorTreatmentModal');
  },

  openEditTreatmentModal(id) {
    const t = (this.simulatorData.treatments || []).find(item => item.id === id);
    if (!t) return;

    document.getElementById('treatment_modal_id').value = t.id;
    document.getElementById('treatment_modal_name').value = t.name;
    document.getElementById('treatment_modal_price').value = t.price;
    document.getElementById('treatment_modal_description').value = t.description || '';
    document.getElementById('treatment_modal_order').value = t.order_num || 1;
    document.getElementById('treatment_modal_default').checked = Boolean(t.is_default);
    document.getElementById('treatment_modal_free').checked = Boolean(t.is_free);
    document.getElementById('treatment_modal_active').checked = Boolean(t.active);

    document.getElementById('simulatorTreatmentModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-600"></i> Editar Tratamento';
    this.openModal('simulatorTreatmentModal');
  },

  async handleTreatmentSubmit(form) {
    const id = document.getElementById('treatment_modal_id').value;
    const name = document.getElementById('treatment_modal_name').value.trim();
    const is_free = document.getElementById('treatment_modal_free').checked ? 1 : 0;
    const price = is_free ? 0 : (parseFloat(document.getElementById('treatment_modal_price').value) || 0);
    const description = document.getElementById('treatment_modal_description').value.trim();
    const order_num = parseInt(document.getElementById('treatment_modal_order').value) || 0;
    const is_default = document.getElementById('treatment_modal_default').checked ? 1 : 0;
    const active = document.getElementById('treatment_modal_active').checked ? 1 : 0;

    const data = { name, price, description, order_num, is_default, is_free, active };
    const btn = document.getElementById('btnSaveTreatmentModal');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;

    try {
      let res;
      if (id) {
        res = await API.updateSimulatorTreatment(id, data);
      } else {
        res = await API.createSimulatorTreatment(data);
      }

      if (res.success) {
        this.closeModal('simulatorTreatmentModal');
        await this.loadSimulatorConfig();
      } else {
        alert('Erro ao salvar tratamento: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão com o servidor.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  async deleteSimulatorTreatment(id, name) {
    if (!confirm(`Deseja realmente excluir o tratamento "${name}" do simulador?`)) return;
    try {
      const res = await API.deleteSimulatorTreatment(id);
      if (res.success) {
        await this.loadSimulatorConfig();
      } else {
        alert('Erro ao excluir: ' + res.message);
      }
    } catch (e) {
      console.error(e);
    }
  },

  populateSimulatorSettingsForm() {
    const s = this.simulatorData.settings || {};
    const maxInst = document.getElementById('setting_max_installments');
    const pixDisc = document.getElementById('setting_pix_discount');
    const wa = document.getElementById('setting_whatsapp_phone');
    const fee = document.getElementById('setting_assembly_fee_text');

    if (maxInst) maxInst.value = s.max_installments || '10';
    if (pixDisc) pixDisc.value = s.pix_discount || '5';
    if (wa) wa.value = s.whatsapp_phone || '5511987654321';
    if (fee) fee.value = s.assembly_fee_text || 'Cortesia';
  },

  async handleSettingsSubmit(form) {
    const max_installments = document.getElementById('setting_max_installments').value;
    const pix_discount = document.getElementById('setting_pix_discount').value;
    const whatsapp_phone = document.getElementById('setting_whatsapp_phone').value.trim();
    const assembly_fee_text = document.getElementById('setting_assembly_fee_text').value.trim();

    const btn = document.getElementById('btnSaveSimulatorSettings');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;

    try {
      const res = await API.updateSimulatorSettings({
        max_installments,
        pix_discount,
        whatsapp_phone,
        assembly_fee_text
      });

      if (res.success) {
        alert('Condições comerciais e regras de orçamento salvas com sucesso!');
        await this.loadSimulatorConfig();
      } else {
        alert('Erro ao salvar: ' + res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar configurações.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  // ==========================================
  // CMS (PERSONALIZAÇÃO DO SITE TÓPICO POR TÓPICO)
  // ==========================================
  async loadCmsContent() {
    try {
      const res = await API.getSiteContent();
      if (res && res.success && res.map) {
        for (const [key, val] of Object.entries(res.map)) {
          const inputs = document.querySelectorAll(`[name="${key}"], #cms_${key}`);
          inputs.forEach(input => {
            if (input.type !== 'file') {
              input.value = val;
            }
          });
        }

        // Informações e pré-visualização da imagem da armação em destaque
        const featImg = document.getElementById('cms_preview_featured_img');
        const featInput = document.getElementById('cms_hero_featured_image');
        const featInfo = document.getElementById('cms_featured_file_info');
        const featBadge = document.getElementById('cms_featured_status_badge');
        const featFileInput = document.getElementById('cms_hero_featured_image_file');

        if (featFileInput) featFileInput.value = '';

        if (featInput && featInput.value) {
          if (featImg) featImg.src = featInput.value;
          if (featInfo) {
            const fileName = featInput.value.split('/').pop();
            featInfo.textContent = `Foto ativa no site: ${fileName}`;
            featInfo.className = 'text-[11px] text-slate-500 font-mono truncate mt-1';
          }
          if (featBadge) {
            featBadge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> Foto atual ativa`;
            featBadge.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shrink-0';
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar conteúdo do CMS:', e);
    }
  },

  handleFeaturedImageChange(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const preview = document.getElementById('cms_preview_featured_img');
    const info = document.getElementById('cms_featured_file_info');
    const badge = document.getElementById('cms_featured_status_badge');

    if (info) {
      info.textContent = `Novo arquivo pronto: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      info.className = 'text-[11px] text-pink-700 font-bold font-mono truncate mt-1';
    }

    if (badge) {
      badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-pink-600 animate-bounce"></i> Novo arquivo pronto para envio (clique em Salvar)`;
      badge.className = 'inline-flex items-center gap-1.5 text-[11px] font-extrabold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200 shrink-0';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  },

  async handleCmsSubmit(form) {
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando no Site...`;
    }

    try {
      const formData = new FormData(form);
      const res = await API.updateSiteContent(formData);
      if (res && res.success) {
        alert('Alterações salvas com sucesso! A vitrine da Ótica Lince já foi atualizada em tempo real.');
        await this.loadCmsContent();
      } else {
        alert('Erro ao salvar conteúdo: ' + (res ? res.message : 'Erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar alterações do site.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    }
  },

  // Mobile access modal with dynamic QR Code
  async openMobileAccessModal() {
    const modal = document.getElementById('mobileAccessModal');
    if (!modal) return;

    try {
      const res = await API.getNetworkInfo();
      if (res && res.success) {
        const netUrl = res.primaryNetworkUrl || 'http://192.168.2.136:3000';
        const adminUrl = res.adminNetworkUrl || 'http://192.168.2.136:3000/admin';

        const qrEl = document.getElementById('adminMobileQrImage');
        const linkEl = document.getElementById('adminMobileLinkDisplay');
        const adminLinkEl = document.getElementById('adminMobileAdminLinkDisplay');

        if (qrEl) {
          qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(adminUrl)}`;
        }
        if (linkEl) {
          linkEl.href = netUrl;
          linkEl.textContent = netUrl;
        }
        if (adminLinkEl) {
          adminLinkEl.href = adminUrl;
          adminLinkEl.textContent = adminUrl;
        }
      }
    } catch (e) {
      console.error(e);
    }

    this.openModal('mobileAccessModal');
  },

  // Modal helpers
  openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    }
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  }
};

// Auto-boot if on admin page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('view_dashboard')) {
    Admin.init();
  }
});
