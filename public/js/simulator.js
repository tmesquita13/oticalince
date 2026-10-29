/**
 * ÓTICA LINCE - Simulador Interativo de Lentes & Orçamento de Montagem
 * Conectado dinamicamente ao banco de dados e ao painel administrativo
 */
const Simulator = {
  selectedFrame: null,
  selectedLens: null,
  treatments: [],
  settings: {
    max_installments: '10',
    pix_discount: '5',
    whatsapp_phone: '5511987654321',
    assembly_fee_text: 'Cortesia'
  },
  lensOptions: [],
  prescription: {
    od_spherical: '0.00',
    od_cylindrical: '0.00',
    od_axis: '0',
    oe_spherical: '0.00',
    oe_cylindrical: '0.00',
    oe_axis: '0',
    addition: '0.00'
  },

  async init() {
    await this.loadConfig();
    this.bindEvents();
    this.calculateTotal();

    // Armação padrão selecionada se disponível
    try {
      const res = await API.getProducts({ category: 'armacao_grau' });
      if (res.success && res.data.length > 0) {
        this.selectedFrame = res.data[0];
        this.updateSelectedFrameUI();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadConfig() {
    try {
      const res = await API.getSimulatorConfig();
      if (res.success && res.data) {
        this.lensOptions = res.data.lenses.map(l => ({
          id: l.id,
          lens_key: l.lens_key,
          name: l.name,
          badge: l.badge,
          price: parseFloat(l.price) || 0,
          description: l.description
        }));

        this.treatments = res.data.treatments.map(t => ({
          id: t.id,
          key: t.treatment_key,
          name: t.name,
          price: parseFloat(t.price) || 0,
          description: t.description,
          is_free: Boolean(t.is_free),
          selected: Boolean(t.is_default)
        }));

        if (res.data.settings) {
          this.settings = { ...this.settings, ...res.data.settings };
        }

        // Escolhe lente inicial
        if (this.lensOptions.length > 0) {
          const blue = this.lensOptions.find(l => l.lens_key === 'blue_filter');
          this.selectedLens = blue || this.lensOptions[0];
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do simulador:', err);
    }

    this.renderLensOptions();
    this.renderTreatments();
    this.applySettingsUI();
  },

  applySettingsUI() {
    const feeEl = document.getElementById('simAssemblyFeeDisplay');
    if (feeEl) {
      feeEl.textContent = this.settings.assembly_fee_text || 'Cortesia';
    }

    const pixEl = document.getElementById('simPixDiscountDisplay');
    if (pixEl) {
      pixEl.textContent = `${this.settings.pix_discount || '5'}% de desconto no Pix à vista`;
    }
  },

  async startWithFrame(frameId) {
    try {
      const res = await API.getProductById(frameId);
      if (res.success) {
        this.selectedFrame = res.data;
        this.updateSelectedFrameUI();
        
        // Rolar até o simulador
        const simSection = document.getElementById('simulatorSection');
        if (simSection) {
          simSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  },

  updateSelectedFrameUI() {
    const frameBox = document.getElementById('simSelectedFrameContainer');
    if (!frameBox) return;

    if (!this.selectedFrame) {
      frameBox.innerHTML = `
        <div class="text-center py-6 text-gray-500">
          <p>Nenhuma armação selecionada.</p>
          <a href="#catalogo" class="text-lince-red font-bold text-xs underline mt-2 inline-block">Escolher no Catálogo</a>
        </div>
      `;
      return;
    }

    const price = this.selectedFrame.promo_price || this.selectedFrame.price;
    frameBox.innerHTML = `
      <div class="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <img 
          src="${this.selectedFrame.image_url}" 
          alt="${this.selectedFrame.name}" 
          class="w-24 h-16 object-contain bg-gray-50 rounded-lg p-2 filter drop-shadow-sm"
          onerror="this.src='https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'"
        />
        <div class="flex-1">
          <span class="text-[11px] font-bold text-lince-red uppercase tracking-wider">${this.selectedFrame.brand}</span>
          <h4 class="font-bold text-gray-900 text-sm">${this.selectedFrame.name}</h4>
          <p class="text-xs text-gray-500">${this.selectedFrame.material || ''} • ${this.selectedFrame.dimensions || ''}</p>
        </div>
        <div class="text-right">
          <span class="text-sm font-extrabold text-gray-900">R$ ${price.toFixed(2).replace('.', ',')}</span>
          <button onclick="Simulator.changeFrameModal()" class="block text-[11px] text-lince-red font-bold hover:underline mt-1">
            Trocar
          </button>
        </div>
      </div>
    `;
    this.calculateTotal();
  },

  renderLensOptions() {
    const container = document.getElementById('simLensOptions');
    if (!container) return;

    if (this.lensOptions.length === 0) {
      container.innerHTML = `<div class="col-span-2 text-center text-xs text-gray-400 py-4">Carregando lentes disponíveis...</div>`;
      return;
    }

    container.innerHTML = this.lensOptions.map(lens => {
      const isSelected = this.selectedLens && this.selectedLens.id === lens.id;
      return `
        <div 
          class="p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-lince-red bg-red-50/40 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}"
          onclick="Simulator.selectLens(${lens.id})"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${isSelected ? 'bg-lince-red text-white' : 'bg-gray-100 text-gray-600'}">
              ${lens.badge || 'Opção'}
            </span>
            <span class="font-extrabold text-lince-red text-sm">
              + R$ ${lens.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <h5 class="font-bold text-gray-900 text-sm mb-1">${lens.name}</h5>
          <p class="text-xs text-gray-500">${lens.description || ''}</p>
        </div>
      `;
    }).join('');
  },

  renderTreatments() {
    const container = document.getElementById('simTreatmentsContainer');
    if (!container) return;

    if (this.treatments.length === 0) {
      container.innerHTML = `<div class="col-span-2 text-center text-xs text-gray-400 py-2">Sem tratamentos adicionais.</div>`;
      return;
    }

    container.innerHTML = this.treatments.map((t, idx) => {
      const isFree = t.is_free || t.price === 0;
      return `
        <label class="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition">
          <div class="flex items-center gap-3">
            <input 
              type="checkbox" 
              data-treatment-idx="${idx}"
              ${t.selected ? 'checked' : ''}
              ${isFree ? 'checked disabled' : ''}
              class="w-4 h-4 text-lince-red rounded focus:ring-0 cursor-pointer"
            >
            <div>
              <span class="font-bold text-gray-900 block">${t.name}</span>
              <span class="text-gray-400 text-[11px]">${t.description || ''}</span>
            </div>
          </div>
          <span class="font-bold ${isFree ? 'text-emerald-600 uppercase text-[10px]' : 'text-gray-700'}">
            ${isFree ? 'Grátis' : `+ R$ ${t.price.toFixed(2).replace('.', ',')}`}
          </span>
        </label>
      `;
    }).join('');

    // Adiciona listener para checkboxes de tratamentos
    container.querySelectorAll('input[data-treatment-idx]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-treatment-idx'));
        if (this.treatments[idx] && !this.treatments[idx].is_free) {
          this.treatments[idx].selected = e.target.checked;
          this.calculateTotal();
        }
      });
    });
  },

  selectLens(lensId) {
    const lens = this.lensOptions.find(l => l.id === lensId);
    if (lens) {
      this.selectedLens = lens;
      this.renderLensOptions();
      this.calculateTotal();
    }
  },

  bindEvents() {
    // Inputs de grau óptico
    const rxInputs = ['od_spherical', 'od_cylindrical', 'od_axis', 'oe_spherical', 'oe_cylindrical', 'oe_axis', 'addition'];
    rxInputs.forEach(id => {
      const input = document.getElementById(`sim_${id}`);
      if (input) {
        input.addEventListener('input', (e) => {
          this.prescription[id] = e.target.value;
          this.calculateTotal();
        });
      }
    });

    // Botão de envio de orçamento
    const submitBtn = document.getElementById('btnSubmitQuote');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitQuote());
    }
  },

  calculateTotal() {
    const framePrice = this.selectedFrame ? (this.selectedFrame.promo_price || this.selectedFrame.price) : 0;
    const lensPrice = this.selectedLens ? this.selectedLens.price : 0;
    
    let treatmentsTotal = 0;
    const activeTreatmentsList = [];
    this.treatments.forEach(t => {
      if (t.selected || t.is_free) {
        if (!t.is_free) {
          treatmentsTotal += t.price;
        }
        activeTreatmentsList.push(t.name);
      }
    });

    const total = framePrice + lensPrice + treatmentsTotal;
    const maxInst = parseInt(this.settings.max_installments) || 10;
    const instVal = maxInst > 0 ? (total / maxInst).toFixed(2).replace('.', ',') : total.toFixed(2).replace('.', ',');

    // Atualiza elementos de UI
    const totalEl = document.getElementById('simTotalDisplay');
    const installmentsEl = document.getElementById('simInstallmentsDisplay');
    const breakdownFrame = document.getElementById('simBreakdownFrame');
    const breakdownLens = document.getElementById('simBreakdownLens');
    const breakdownTreatments = document.getElementById('simBreakdownTreatments');

    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    if (installmentsEl) installmentsEl.textContent = `ou ${maxInst}x de R$ ${instVal} sem juros`;
    if (breakdownFrame) breakdownFrame.textContent = `R$ ${framePrice.toFixed(2).replace('.', ',')}`;
    if (breakdownLens) breakdownLens.textContent = `R$ ${lensPrice.toFixed(2).replace('.', ',')}`;
    if (breakdownTreatments) breakdownTreatments.textContent = `R$ ${treatmentsTotal.toFixed(2).replace('.', ',')}`;

    return {
      framePrice,
      lensPrice,
      treatmentsTotal,
      activeTreatmentsList,
      total,
      maxInst,
      instVal
    };
  },

  async submitQuote() {
    const nameInput = document.getElementById('simClientName');
    const phoneInput = document.getElementById('simClientPhone');
    const notesInput = document.getElementById('simClientNotes');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';

    if (!name || !phone) {
      alert('Por favor, informe seu Nome e WhatsApp para gerar o orçamento da montagem.');
      if (nameInput && !name) nameInput.focus();
      else if (phoneInput) phoneInput.focus();
      return;
    }

    const { framePrice, lensPrice, treatmentsTotal, activeTreatmentsList, total, maxInst, instVal } = this.calculateTotal();

    const rxSummary = `OD: Esf ${this.prescription.od_spherical} Cil ${this.prescription.od_cylindrical} Eixo ${this.prescription.od_axis}° | OE: Esf ${this.prescription.oe_spherical} Cil ${this.prescription.oe_cylindrical} Eixo ${this.prescription.oe_axis}°${this.prescription.addition !== '0.00' ? ` | Adição: ${this.prescription.addition}` : ''}`;

    const quoteData = {
      client_name: name,
      client_phone: phone,
      client_email: null,
      frame_id: this.selectedFrame ? this.selectedFrame.id : null,
      frame_name: this.selectedFrame ? this.selectedFrame.name : 'Armação Própria / Sob Consulta',
      frame_price: framePrice,
      lens_type: this.selectedLens ? this.selectedLens.name : 'Lente Selecionada',
      lens_treatments: activeTreatmentsList.join(', '),
      lens_price: lensPrice + treatmentsTotal,
      total_price: total,
      prescription_details: rxSummary,
      notes: notes
    };

    const submitBtn = document.getElementById('btnSubmitQuote');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando Orçamento...`;
    }

    try {
      const res = await API.createQuote(quoteData);
      if (res.success) {
        const quote = res.data;
        const targetPhone = (this.settings.whatsapp_phone || '5511987654321').replace(/\D/g, '');
        
        // Mensagem WhatsApp formatada
        const waMsg = `Olá, Ótica Lince! Gostaria de confirmar meu orçamento online #${quote.quote_code}:%0A%0A` +
          `👤 *Cliente:* ${name}%0A` +
          `👓 *Armação:* ${quote.frame_name} (R$ ${framePrice.toFixed(2)})%0A` +
          `🔬 *Lentes:* ${quote.lens_type}%0A` +
          `✨ *Tratamentos:* ${activeTreatmentsList.join(', ')}%0A` +
          `📋 *Grau Informado:* ${rxSummary}%0A` +
          `💰 *Total Estimado:* R$ ${total.toFixed(2)} (ou ${maxInst}x de R$ ${instVal})%0A%0A` +
          `Poderiam verificar a receita e me passar o link de pagamento ou agendamento?`;

        const successModal = document.getElementById('quoteSuccessModal');
        const codeDisplay = document.getElementById('quoteSuccessCode');
        const waBtn = document.getElementById('quoteSuccessWhatsAppBtn');

        if (codeDisplay) codeDisplay.textContent = quote.quote_code;
        if (waBtn) {
          waBtn.href = `https://wa.me/${targetPhone}?text=${waMsg}`;
        }

        if (successModal) {
          successModal.classList.remove('hidden');
          successModal.classList.add('flex');
        } else {
          window.open(`https://wa.me/${targetPhone}?text=${waMsg}`, '_blank');
        }
      } else {
        alert('Erro ao salvar orçamento: ' + res.message);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com o servidor da ótica.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-lg"></i> Gerar Orçamento & Enviar p/ WhatsApp`;
      }
    }
  },

  async changeFrameModal() {
    const res = await API.getProducts({ category: 'armacao_grau' });
    if (!res.success) return;

    const modal = document.getElementById('changeFrameModal');
    const container = document.getElementById('changeFrameList');
    if (!modal || !container) return;

    container.innerHTML = res.data.map(p => `
      <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-lince-red transition cursor-pointer" onclick="Simulator.pickFrame(${p.id})">
        <div class="flex items-center gap-3">
          <img src="${p.image_url}" alt="${p.name}" class="w-16 h-12 object-contain bg-gray-50 p-1 rounded" />
          <div>
            <div class="font-bold text-sm text-gray-900">${p.name}</div>
            <div class="text-xs text-gray-500">${p.material || ''} • ${p.dimensions || ''}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lince-red text-sm">R$ ${(p.promo_price || p.price).toFixed(2).replace('.', ',')}</div>
          <button class="text-xs bg-lince-red text-white px-3 py-1 rounded-md mt-1">Selecionar</button>
        </div>
      </div>
    `).join('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  pickFrame(id) {
    this.startWithFrame(id);
    const modal = document.getElementById('changeFrameModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
};
