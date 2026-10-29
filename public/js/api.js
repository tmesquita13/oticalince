/**
 * ÓTICA LINCE - Cliente de API Frontend
 */
const API = {
  baseUrl: '/api',

  // 1. Estatísticas do Dashboard
  async getStats() {
    const res = await fetch(`${this.baseUrl}/stats`);
    return await res.json();
  },

  // 2. Produtos (Armações, Óculos de Sol, Lentes, Acessórios)
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const res = await fetch(`${this.baseUrl}/products?${query.toString()}`);
    return await res.json();
  },

  async getProductById(id) {
    const res = await fetch(`${this.baseUrl}/products/${id}`);
    return await res.json();
  },

  async createProduct(formData) {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      body: formData // multipart/form-data for image upload
    });
    return await res.json();
  },

  async updateProduct(id, formData) {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      body: formData
    });
    return await res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // 3. Clientes
  async getClients(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${this.baseUrl}/clients${query}`);
    return await res.json();
  },

  async getClientById(id) {
    const res = await fetch(`${this.baseUrl}/clients/${id}`);
    return await res.json();
  },

  async createClient(data) {
    if (data instanceof FormData) {
      const res = await fetch(`${this.baseUrl}/clients`, {
        method: 'POST',
        body: data // supports file attachments for prescriptions
      });
      return await res.json();
    }
    const res = await fetch(`${this.baseUrl}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateClient(id, data) {
    const res = await fetch(`${this.baseUrl}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteClient(id) {
    const res = await fetch(`${this.baseUrl}/clients/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // 4. Receitas Oftalmológicas (Prontuário)
  async getPrescriptions(clientId = null) {
    const query = clientId ? `?client_id=${clientId}` : '';
    const res = await fetch(`${this.baseUrl}/prescriptions${query}`);
    return await res.json();
  },

  async createPrescription(formData) {
    const res = await fetch(`${this.baseUrl}/prescriptions`, {
      method: 'POST',
      body: formData // allows image attachment
    });
    return await res.json();
  },

  async uploadPrescription(formData) {
    const res = await fetch(`${this.baseUrl}/prescriptions/upload`, {
      method: 'POST',
      body: formData // public upload from website customer
    });
    return await res.json();
  },

  async deletePrescription(id) {
    const res = await fetch(`${this.baseUrl}/prescriptions/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // 5. Agendamentos
  async getAppointments() {
    const res = await fetch(`${this.baseUrl}/appointments`);
    return await res.json();
  },

  async createAppointment(data) {
    const res = await fetch(`${this.baseUrl}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateAppointmentStatus(id, status) {
    const res = await fetch(`${this.baseUrl}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  },

  // 6. Orçamentos e O.S.
  async getQuotes() {
    const res = await fetch(`${this.baseUrl}/quotes`);
    return await res.json();
  },

  async createQuote(data) {
    const res = await fetch(`${this.baseUrl}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateQuoteStatus(id, status) {
    const res = await fetch(`${this.baseUrl}/quotes/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  },

  // 7. Simulador de Lentes e Orçamentos
  async getSimulatorConfig() {
    const res = await fetch(`${this.baseUrl}/simulator/config`);
    return await res.json();
  },

  async getSimulatorAdminConfig() {
    const res = await fetch(`${this.baseUrl}/simulator/admin-config`);
    return await res.json();
  },

  async createSimulatorLens(data) {
    const res = await fetch(`${this.baseUrl}/simulator/lenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateSimulatorLens(id, data) {
    const res = await fetch(`${this.baseUrl}/simulator/lenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteSimulatorLens(id) {
    const res = await fetch(`${this.baseUrl}/simulator/lenses/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async createSimulatorTreatment(data) {
    const res = await fetch(`${this.baseUrl}/simulator/treatments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateSimulatorTreatment(id, data) {
    const res = await fetch(`${this.baseUrl}/simulator/treatments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteSimulatorTreatment(id) {
    const res = await fetch(`${this.baseUrl}/simulator/treatments/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async updateSimulatorSettings(data) {
    const res = await fetch(`${this.baseUrl}/simulator/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // 8. Informações de Rede Local & Mobile
  async getNetworkInfo() {
    const res = await fetch(`${this.baseUrl}/network-info`);
    return await res.json();
  },

  // 9. Autenticação Administrativa (admin / admin)
  async login(username, password) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return await res.json();
  },

  async verifyAuth(token) {
    const res = await fetch(`${this.baseUrl}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  // 10. Editor de Conteúdo do Site (CMS 100% Editável)
  async getSiteContent() {
    const res = await fetch(`${this.baseUrl}/site-content`);
    return await res.json();
  },

  async updateSiteContent(content) {
    let headers = {};
    let body;

    if (content instanceof FormData) {
      body = content;
      // Não definir Content-Type quando o corpo for FormData: o browser define multipart/form-data com boundary automaticamente
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ content });
    }

    const res = await fetch(`${this.baseUrl}/site-content`, {
      method: 'PUT',
      headers,
      body
    });
    return await res.json();
  }
};

