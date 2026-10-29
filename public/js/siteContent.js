/**
 * ÓTICA LINCE - Carregador Dinâmico de Conteúdo do Site (CMS 100% Editável)
 */
const SiteContent = {
  data: {},

  async init() {
    try {
      const res = await API.getSiteContent();
      if (res && res.success && res.map) {
        this.data = res.map;
        this.applyToDOM();
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdo dinâmico do CMS:', err);
    }
  },

  applyToDOM() {
    const d = this.data;

    // Atualiza todos os elementos que possuem data-cms="key"
    document.querySelectorAll('[data-cms]').forEach(el => {
      const key = el.getAttribute('data-cms');
      if (d[key] !== undefined && d[key] !== '') {
        el.textContent = d[key];
      }
    });

    // Atualiza links (href) com data-cms-href="key"
    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const key = el.getAttribute('data-cms-href');
      if (d[key]) {
        if (key === 'store_whatsapp') {
          const num = d[key].replace(/\D/g, '');
          el.href = `https://wa.me/${num}?text=Olá,%20Ótica%20Lince!%20Gostaria%20de%20atendimento%20online.`;
        } else if (key === 'store_phone') {
          el.href = `tel:${d[key].replace(/\D/g, '')}`;
        } else if (key === 'store_email') {
          el.href = `mailto:${d[key]}`;
        } else {
          el.href = d[key];
        }
      }
    });

    // Atualiza imagens (src) com data-cms-src="key"
    document.querySelectorAll('[data-cms-src]').forEach(el => {
      const key = el.getAttribute('data-cms-src');
      if (d[key]) {
        el.src = d[key];
      }
    });
  }
};

// Inicializa no carregamento da página pública
document.addEventListener('DOMContentLoaded', () => {
  if (typeof SiteContent !== 'undefined' && !document.getElementById('view_dashboard')) {
    SiteContent.init();
  }
});

