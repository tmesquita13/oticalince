/**
 * ÓTICA LINCE - Aplicação Principal
 */
// Funções globais da aplicação
window.App = {
  openUploadPrescriptionModal() {
    const modal = document.getElementById('uploadPrescriptionModal');
    const form = document.getElementById('publicPrescriptionUploadForm');
    const successView = document.getElementById('publicRxSuccessView');
    if (!modal) return;

    if (form) {
      form.classList.remove('hidden');
      form.reset();
    }
    if (successView) successView.classList.add('hidden');

    const emptyState = document.getElementById('publicRxFileEmptyState');
    const selectedState = document.getElementById('publicRxFileSelectedState');
    if (emptyState) emptyState.classList.remove('hidden');
    if (selectedState) {
      selectedState.classList.add('hidden');
      selectedState.classList.remove('flex');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  async openMobileAccessModal() {
    const modal = document.getElementById('mobileAccessModal');
    if (!modal) return;

    try {
      const res = await API.getNetworkInfo();
      if (res && res.success) {
        const netUrl = res.primaryNetworkUrl || 'http://192.168.2.136:3000';
        const adminUrl = res.adminNetworkUrl || 'http://192.168.2.136:3000/admin';

        const qrEl = document.getElementById('mobileQrImage');
        const linkEl = document.getElementById('mobileLinkDisplay');
        const adminLinkEl = document.getElementById('mobileAdminLinkDisplay');

        if (qrEl) {
          qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(netUrl)}`;
        }
        if (linkEl) {
          linkEl.href = netUrl;
          linkEl.textContent = netUrl;
        }
        if (adminLinkEl) {
          adminLinkEl.href = adminUrl;
          adminLinkEl.textContent = '/admin';
        }
      }
    } catch (e) {
      console.error('Erro ao obter dados de rede:', e);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Iniciando Ótica Lince...');

  // Initialize all storefront interactive modules
  try {
    if (typeof Catalog !== 'undefined') await Catalog.init();
    if (typeof Simulator !== 'undefined') await Simulator.init();
    if (typeof FaceGuide !== 'undefined') FaceGuide.init();
    if (typeof Booking !== 'undefined') Booking.init();
  } catch (err) {
    console.error('Erro na inicialização dos módulos:', err);
  }

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Close modals on clicking backdrop or close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  });

  // Close modal when clicking outside content area
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }
    });
  });

  // Handle public prescription file upload & preview
  const rxFileInput = document.getElementById('publicRxFileInput');
  if (rxFileInput) {
    rxFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const emptyState = document.getElementById('publicRxFileEmptyState');
      const selectedState = document.getElementById('publicRxFileSelectedState');
      const fileNameEl = document.getElementById('publicRxFileName');
      const imgPreview = document.getElementById('publicRxImagePreview');
      const pdfIcon = document.getElementById('publicRxPdfIcon');

      if (file) {
        if (emptyState) emptyState.classList.add('hidden');
        if (selectedState) {
          selectedState.classList.remove('hidden');
          selectedState.classList.add('flex');
        }
        if (fileNameEl) fileNameEl.textContent = file.name;

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (re) => {
            if (imgPreview) {
              imgPreview.src = re.target.result;
              imgPreview.classList.remove('hidden');
            }
            if (pdfIcon) pdfIcon.classList.add('hidden');
          };
          reader.readAsDataURL(file);
        } else {
          if (imgPreview) imgPreview.classList.add('hidden');
          if (pdfIcon) pdfIcon.classList.remove('hidden');
        }
      }
    });
  }

  // Handle public prescription form submit
  const rxForm = document.getElementById('publicPrescriptionUploadForm');
  if (rxForm) {
    rxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitPublicRx');
      const orig = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando Receita ao Laboratório...`;
      }

      try {
        const formData = new FormData(rxForm);
        const res = await API.uploadPrescription(formData);
        if (res && res.success) {
          const formEl = document.getElementById('publicPrescriptionUploadForm');
          const successView = document.getElementById('publicRxSuccessView');
          const waNotify = document.getElementById('btnPublicRxNotifyWhatsApp');

          if (formEl) formEl.classList.add('hidden');
          if (successView) successView.classList.remove('hidden');

          const clientName = formData.get('client_name') || '';
          const msg = encodeURIComponent(`Olá, Ótica Lince! Acabei de enviar minha receita médica pelo site (${clientName}) para análise e orçamento de lentes.`);
          if (waNotify) {
            waNotify.href = `https://wa.me/5511987654321?text=${msg}`;
          }
        } else {
          alert('Erro ao enviar receita: ' + (res ? res.message : 'Erro desconhecido'));
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao conectar ao servidor da ótica. Verifique sua conexão.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = orig;
        }
      }
    });
  }
});

