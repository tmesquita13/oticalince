/**
 * ÓTICA LINCE - Guia de Formato de Rosto & Visagismo Óptico
 */
const FaceGuide = {
  shapes: {
    redondo: {
      name: 'Rosto Redondo',
      subtitle: 'Ângulos suaves com largura e comprimento proporcionais',
      recommendations: ['Retangular', 'Quadrado', 'Hexagonal'],
      avoid: 'Armações excessivamente redondas ou muito pequenas',
      tip: 'Armações angulares, retangulares e quadradas trazem definição aos traços faciais, alongando a percepção do rosto.',
      icon: 'fa-regular fa-circle',
      filterShape: 'Retangular'
    },
    quadrado: {
      name: 'Rosto Quadrado',
      subtitle: 'Maxilar bem definido e testa larga e marcante',
      recommendations: ['Redondo', 'Oval', 'Aviador'],
      avoid: 'Armações muito geométricas ou retangulares com cantos vivos',
      tip: 'Modelos redondos, ovais ou aviador suavizam as linhas retas do maxilar, criando um equilíbrio harmônico e elegante.',
      icon: 'fa-regular fa-square',
      filterShape: 'Redondo'
    },
    oval: {
      name: 'Rosto Oval',
      subtitle: 'Proporções equilibradas com queixo suavemente estreito',
      recommendations: ['Hexagonal', 'Gatinho', 'Aviador', 'Quadrado'],
      avoid: 'Praticamente qualquer modelo cai bem!',
      tip: 'É o formato mais versátil da óptica. Permite ousar com modelos gatinho, geométricos modernos ou aviadores clássicos.',
      icon: 'fa-solid fa-egg',
      filterShape: 'Hexagonal'
    },
    coracao: {
      name: 'Rosto Coração / Triangular',
      subtitle: 'Testa mais larga que afunila em direção a um queixo delicado',
      recommendations: ['Gatinho', 'Redondo', 'Metal Fino'],
      avoid: 'Armações com topos muito pesados ou com muitos detalhes superiores',
      tip: 'Armações estilo gatinho (Cat-Eye) ou modelos com bordas inferiores arredondadas equilibram perfeitamente o terço inferior do rosto.',
      icon: 'fa-regular fa-heart',
      filterShape: 'Gatinho'
    },
    diamante: {
      name: 'Rosto Diamante',
      subtitle: 'Maçãs do rosto altas e destacadas com testa e queixo estreitos',
      recommendations: ['Gatinho', 'Oval', 'Sem Aro / Três Peças'],
      avoid: 'Armações muito estreitas que comprimam a linha dos olhos',
      tip: 'Destaque seus olhos e suavize as maçãs do rosto com armações gatinho, detalhes elegantes nas hastes ou modelos delicados em titânio.',
      icon: 'fa-regular fa-gem',
      filterShape: 'Gatinho'
    }
  },

  init() {
    this.bindEvents();
    this.selectShape('oval');
  },

  bindEvents() {
    document.querySelectorAll('[data-face-shape]').forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-face-shape');
        this.selectShape(shape);
      });
    });
  },

  selectShape(shapeKey) {
    const data = this.shapes[shapeKey];
    if (!data) return;

    // Highlight card
    document.querySelectorAll('[data-face-shape]').forEach(b => {
      b.classList.remove('selected', 'border-lince-red');
      if (b.getAttribute('data-face-shape') === shapeKey) {
        b.classList.add('selected', 'border-lince-red');
      }
    });

    const infoBox = document.getElementById('faceGuideInfo');
    if (!infoBox) return;

    infoBox.innerHTML = `
      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 bg-red-50 text-lince-red rounded-xl flex items-center justify-center text-xl">
            <i class="${data.icon}"></i>
          </div>
          <div>
            <h4 class="text-xl font-bold text-gray-900">${data.name}</h4>
            <p class="text-xs text-gray-500">${data.subtitle}</p>
          </div>
        </div>

        <p class="text-gray-700 text-sm leading-relaxed mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <i class="fa-solid fa-lightbulb text-amber-500 mr-1.5"></i> ${data.tip}
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
          <div class="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <span class="font-bold text-emerald-800 uppercase tracking-wide block mb-1">
              <i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Armações Indicadas:
            </span>
            <div class="flex flex-wrap gap-1.5 mt-2">
              ${data.recommendations.map(r => `<span class="bg-white text-emerald-900 font-bold px-2.5 py-1 rounded-md shadow-xs">${r}</span>`).join('')}
            </div>
          </div>

          <div class="bg-red-50/60 p-4 rounded-xl border border-red-100">
            <span class="font-bold text-red-800 uppercase tracking-wide block mb-1">
              <i class="fa-solid fa-circle-xmark text-red-500 mr-1"></i> Evitar se possível:
            </span>
            <p class="text-red-700 mt-1">${data.avoid}</p>
          </div>
        </div>

        <button onclick="FaceGuide.filterCatalogByShape('${data.filterShape}')" class="w-full sm:w-auto px-6 py-3 bg-lince-red hover:bg-red-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2">
          <i class="fa-solid fa-glasses"></i> Ver Armações Recomendadas (${data.filterShape})
        </button>
      </div>
    `;
  },

  filterCatalogByShape(shape) {
    const shapeSelect = document.getElementById('filterShape');
    if (shapeSelect) {
      shapeSelect.value = shape;
    }
    Catalog.filters.shape = shape;
    Catalog.filters.category = 'armacao_grau';

    document.querySelectorAll('[data-category]').forEach(b => {
      b.classList.remove('active');
      if (b.getAttribute('data-category') === 'armacao_grau') b.classList.add('active');
    });

    Catalog.loadProducts();

    const catalogSection = document.getElementById('catalogo');
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

