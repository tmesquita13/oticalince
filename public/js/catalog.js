/**
 * ÓTICA LINCE - Módulo de Catálogo & Vitrine Virtual
 */
const Catalog = {
  products: [],
  filters: {
    category: 'all',
    shape: 'all',
    gender: 'all',
    sort: 'default',
    search: ''
  },

  async init() {
    this.bindEvents();
    await this.loadProducts();
  },

  bindEvents() {
    // Category pill buttons
    document.querySelectorAll('[data-category]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filters.category = btn.getAttribute('data-category');
        this.loadProducts();
      });
    });

    // Search input
    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.filters.search = e.target.value.trim();
          this.loadProducts();
        }, 300);
      });
    }

    // Shape filter
    const shapeSelect = document.getElementById('filterShape');
    if (shapeSelect) {
      shapeSelect.addEventListener('change', (e) => {
        this.filters.shape = e.target.value;
        this.loadProducts();
      });
    }

    // Gender filter
    const genderSelect = document.getElementById('filterGender');
    if (genderSelect) {
      genderSelect.addEventListener('change', (e) => {
        this.filters.gender = e.target.value;
        this.loadProducts();
      });
    }

    // Sort
    const sortSelect = document.getElementById('filterSort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.filters.sort = e.target.value;
        this.loadProducts();
      });
    }
  },

  async loadProducts() {
    const grid = document.getElementById('productsGrid');
    const countBadge = document.getElementById('productCountBadge');
    if (!grid) return;

    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-gray-500">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-lince-red mb-3"></i>
        <p class="font-medium">Carregando catálogo Ótica Lince...</p>
      </div>
    `;

    try {
      const res = await API.getProducts(this.filters);
      if (res.success) {
        this.products = res.data;
        if (countBadge) {
          countBadge.textContent = `${this.products.length} itens encontrados`;
        }
        this.renderGrid(this.products);
      } else {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-red-600">Erro ao carregar produtos.</div>`;
      }
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="col-span-full py-12 text-center text-red-600">Erro de conexão ao servidor.</div>`;
    }
  },

  renderGrid(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-50 text-lince-red rounded-full flex items-center justify-center text-2xl">
            <i class="fa-solid fa-glasses"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-1">Nenhum modelo encontrado</h3>
          <p class="text-gray-500 text-sm max-w-md mx-auto mb-4">Experimente remover alguns filtros ou buscar por outro termo.</p>
          <button onclick="Catalog.resetFilters()" class="px-5 py-2.5 bg-lince-red text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition shadow">
            Limpar Filtros
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => this.createProductCardHtml(p)).join('');
  },

  createProductCardHtml(p) {
    const categoryLabels = {
      armacao_grau: 'Armação de Grau',
      oculos_sol: 'Óculos de Sol',
      lentes_oftalmicas: 'Lente Oftálmica',
      lentes_contato: 'Lente de Contato',
      acessorios: 'Acessório Óptico'
    };

    const finalPrice = p.promo_price || p.price;
    const installments = (finalPrice / 10).toFixed(2).replace('.', ',');
    const formattedPrice = finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const originalPrice = p.promo_price ? p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

    let featuresList = [];
    try {
      if (p.features) {
        featuresList = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
      }
    } catch (e) {
      featuresList = [];
    }

    return `
      <div class="product-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between group">
        <div>
          <!-- Imagem & Badges -->
          <div class="relative product-image-container bg-gradient-to-b from-gray-50 to-gray-100 p-6 flex items-center justify-center h-64 cursor-pointer" onclick="Catalog.showProductDetail(${p.id})">
            ${p.badge ? `<span class="absolute top-4 left-4 badge-lince text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">${p.badge}</span>` : ''}
            <span class="absolute top-4 right-4 bg-white/90 backdrop-blur text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs">
              ${p.brand}
            </span>
            <img 
              src="${p.image_url}" 
              alt="${p.name}" 
              class="max-h-48 max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition duration-300"
              onerror="this.src='https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'"
            />
          </div>

          <!-- Informações -->
          <div class="p-5">
            <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>${categoryLabels[p.category] || p.category}</span>
              ${p.frame_shape && p.frame_shape !== 'N/A' ? `<span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">${p.frame_shape}</span>` : ''}
            </div>

            <h3 class="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-lince-red transition cursor-pointer" onclick="Catalog.showProductDetail(${p.id})">
              ${p.name}
            </h3>

            <p class="text-xs text-gray-500 line-clamp-2 mb-3">
              ${p.description || ''}
            </p>

            ${p.material ? `
              <div class="flex items-center gap-1.5 text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">
                <i class="fa-solid fa-circle-info text-lince-red text-[11px]"></i>
                <span class="truncate"><strong>Material:</strong> ${p.material}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Preço e Ações -->
        <div class="p-5 pt-0 border-t border-gray-50">
          <div class="mb-3 pt-3 flex items-baseline justify-between">
            <div>
              ${originalPrice ? `<span class="text-xs text-gray-400 line-through mr-1">${originalPrice}</span>` : ''}
              <div class="text-xl font-extrabold text-lince-red">${formattedPrice}</div>
              <div class="text-[11px] text-gray-500 font-medium">ou 10x de R$ ${installments} sem juros</div>
            </div>
            <span class="text-xs px-2 py-1 ${p.in_stock > 0 ? 'bg-emerald-50 text-emerald-700 font-medium' : 'bg-red-50 text-red-600'} rounded">
              ${p.in_stock > 0 ? 'Em estoque' : 'Sob Encomenda'}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="Catalog.showProductDetail(${p.id})" class="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-eye text-xs"></i> Detalhes
            </button>
            
            ${p.category === 'armacao_grau' ? `
              <button onclick="Simulator.startWithFrame(${p.id})" class="w-full py-2 px-3 bg-lince-red hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-wand-magic-sparkles text-xs"></i> + Lentes
              </button>
            ` : `
              <button onclick="Catalog.buyDirectWhatsapp(${p.id})" class="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm">
                <i class="fa-brands fa-whatsapp text-xs"></i> Comprar
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  async showProductDetail(id) {
    const product = this.products.find(p => p.id === id) || (await API.getProductById(id)).data;
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const container = document.getElementById('productDetailContent');
    if (!modal || !container) return;

    const finalPrice = product.promo_price || product.price;
    const installments = (finalPrice / 10).toFixed(2).replace('.', ',');
    const formattedPrice = finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const originalPrice = product.promo_price ? product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

    let featuresList = [];
    try {
      if (product.features) {
        featuresList = typeof product.features === 'string' ? JSON.parse(product.features) : product.features;
      }
    } catch (e) {
      featuresList = [];
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <!-- Imagem Ampliada -->
        <div class="bg-gray-50 p-8 rounded-2xl flex items-center justify-center border border-gray-100 relative">
          ${product.badge ? `<span class="absolute top-4 left-4 badge-lince text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">${product.badge}</span>` : ''}
          <img 
            src="${product.image_url}" 
            alt="${product.name}" 
            class="max-h-72 max-w-full object-contain filter drop-shadow-xl"
            onerror="this.src='https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'"
          />
        </div>

        <!-- Detalhes Técnicos Ópticos -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs uppercase tracking-wider font-bold text-lince-red">${product.brand}</span>
            <span class="text-gray-300">•</span>
            <span class="text-xs text-gray-500">${product.subcategory || 'Unissex'}</span>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 mb-3">${product.name}</h2>
          
          <div class="mb-4">
            ${originalPrice ? `<span class="text-sm text-gray-400 line-through mr-2">${originalPrice}</span>` : ''}
            <div class="text-3xl font-extrabold text-lince-red">${formattedPrice}</div>
            <div class="text-xs text-gray-500 font-medium">em até 10x de R$ ${installments} sem juros no cartão ou 5% à vista no Pix</div>
          </div>

          <p class="text-gray-600 text-sm leading-relaxed mb-6">
            ${product.description}
          </p>

          <!-- Especificações Ópticas -->
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200/80 mb-6 space-y-2 text-xs">
            <div class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <i class="fa-solid fa-ruler-combined text-lince-red"></i> Especificações do Modelo:
            </div>
            ${product.dimensions ? `<div><strong>Dimensões:</strong> ${product.dimensions}</div>` : ''}
            ${product.material ? `<div><strong>Material:</strong> ${product.material}</div>` : ''}
            ${product.color ? `<div><strong>Cor da Peça:</strong> ${product.color}</div>` : ''}
            ${product.frame_shape && product.frame_shape !== 'N/A' ? `<div><strong>Formato do Aro:</strong> ${product.frame_shape}</div>` : ''}
            <div><strong>Garantia Ótica Lince:</strong> 2 Anos contra defeitos de fabricação</div>
          </div>

          <!-- Destaques -->
          ${featuresList.length > 0 ? `
            <div class="mb-6">
              <span class="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Diferenciais Ópticos:</span>
              <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                ${featuresList.map(f => `<li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-600"></i> ${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Botões de Ação -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            ${product.category === 'armacao_grau' ? `
              <button onclick="Simulator.startWithFrame(${product.id}); Catalog.closeProductDetail();" class="flex-1 py-3 px-4 bg-lince-red hover:bg-red-800 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Montar Óculos com Grau
              </button>
            ` : ''}
            <button onclick="Catalog.buyDirectWhatsapp(${product.id})" class="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-brands fa-whatsapp text-lg"></i> Pedir pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeProductDetail() {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  buyDirectWhatsapp(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    const finalPrice = (product.promo_price || product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const message = `Olá, Ótica Lince! Gostei muito do produto "${product.name}" (${finalPrice}) e gostaria de saber mais informações sobre disponibilidade e formas de pagamento!`;
    const whatsappUrl = `https://wa.me/5511987654321?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  },

  resetFilters() {
    this.filters = { category: 'all', shape: 'all', gender: 'all', sort: 'default', search: '' };
    document.querySelectorAll('[data-category]').forEach(b => {
      b.classList.remove('active');
      if (b.getAttribute('data-category') === 'all') b.classList.add('active');
    });
    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) searchInput.value = '';
    const shapeSelect = document.getElementById('filterShape');
    if (shapeSelect) shapeSelect.value = 'all';
    const genderSelect = document.getElementById('filterGender');
    if (genderSelect) genderSelect.value = 'all';
    const sortSelect = document.getElementById('filterSort');
    if (sortSelect) sortSelect.value = 'default';
    this.loadProducts();
  }
};

