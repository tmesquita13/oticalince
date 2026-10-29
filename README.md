# 👓 ÓTICA LINCE - Sistema Web & Painel de Gestão Óptica

Sistema web completo desenvolvido em **JavaScript** (Front-end moderno, Back-end em **Node.js/Express** e Banco de Dados relacional **SQLite**), com **separação completa entre a Loja / Vitrine do Cliente e o Painel Administrativo de Gestão da Ótica**, focado 100% nas operações reais do setor óptico.

---

## 🏛️ Arquitetura dos Ambientes

### 🛍️ 1. Loja & Vitrine Pública (`/`)
* **URL:** `http://localhost:3000`
* **Público:** Clientes da Ótica Lince.
* **Recursos:**
  * **Vitrine de Armações:** Modelos em titânio japonês cirúrgico, acetato italiano polido à mão, metal nobre e TR-90 flexível.
  * **Óculos de Sol:** Proteção UV400 total e lentes polarizadas (G-15, degradê, espelhadas).
  * **Lentes Oftálmicas:** Filtro de luz azul (*BlueProtect*), Multifocais HD Freeform, Fotossensíveis (*SunSync / Transitions*) e Alto Índice 1.67 / 1.74 ultrafinas.
  * **Lentes de Contato & Acessórios:** Caixas diárias/mensais, kits spray nano limpa-lentes com microfibra, estojos de couro e correntes 18k.
  * **Simulador de Lentes & Montagem (Orçamento Online):** Combina armação + lente + grau médico + tratamentos com cálculo em tempo real e envio direto para o WhatsApp da ótica.
  * **Guia de Rosto & Visagismo Óptico:** Recomendações de armações que harmonizam com o formato facial (oval, redondo, quadrado, coração, diamante).
  * **Serviços de Laboratório & Atendimento Especializado:**
    * 🔬 **Laboratório Digital Próprio:** Montagem computadorizada e biselamento 3D de precisão.
    * 📐 **Medição Digital de DNP:** Tiragem com pupilômetro de alta precisão.
    * 🛠️ **Ajuste & Manutenção Vitalícia Gratuita:** Alinhamento de hastes, troca de plaquetas de silicone e limpeza ultrassônica.
    * 📋 **Conferência de Receita Médica:** Envio da foto da receita do médico oftalmologista para orçamento instantâneo.

---

### 🛡️ 2. Painel de Gestão da Ótica (`/admin`)
* **URL:** `http://localhost:3000/admin`
* **Público:** Proprietária da loja, gerência e consultores ópticos.
* **Credenciais de Acesso (Login):**
  * **Usuário:** `admin`
  * **Senha:** `admin`
* **Recursos:**
  * **Autenticação Segura:** Tela de login dedicada com validação de credenciais, botão de visualização de senha e encerramento de sessão (*Logout*).
  * **Dashboard Executivo:** Métricas em tempo real de clientes, produtos em estoque, receitas arquivadas e ordens de serviço (O.S.).
  * **CRM de Clientes:** Cadastro completo com Nome, CPF, Telefone, E-mail, Data de Nascimento, Endereço e Observações.
  * **Prontuário de Receitas Médicas:** 
    * Matriz técnica clássica **OD** e **OE** com Esférico, Cilíndrico, Eixo, Adição e DNP (mm).
    * Registro de Oftalmologista e CRM.
    * **Alerta visual automático para receitas vencidas** (mais de 1 ano da data do exame).
    * Upload e visualização de fotos/arquivos escaneados da receita do médico.
  * **Controle de Estoque & Catálogo:** Cadastro de novos produtos com upload de fotos ou link, edição de preços e quantidades em estoque.
  * **Configurador do Simulador de Lentes & Orçamentos:**
    * **Modelos de Lentes Oftálmicas:** Adição, edição de preços, tags comerciais (*Mais Recomendada, Alta Estética*), descrições técnicas e ordenação.
    * **Tratamentos & Películas:** Configuração de tratamentos pagos ou cortesia (*Antirreflexo, Antirrisco, Hidrorrepelente, UV400*), preços e pré-seleção padrão.
    * **Regras Comerciais & WhatsApp:** Edição das parcelas sem juros (ex: 10x), desconto no Pix à vista (ex: 5%), número do WhatsApp de atendimento e texto de taxa de montagem.
  * **Gestão de Ordens de Serviço & Laboratório (O.S.):** Acompanhamento de pedidos recebidos pelo simulador com status de produção (*Em Análise, Aprovado, No Laboratório, Pronto para Retirada, Entregue*) e contato via WhatsApp com o cliente.

---

## 🛠️ Tecnologias Utilizadas

* **Front-end:** HTML5 Semântico, CSS3 Moderno, JavaScript ES6+, Tailwind CSS, FontAwesome 6 e Google Fonts (*Playfair Display* e *Plus Jakarta Sans*).
* **Back-end:** Node.js com Express e Multer (para upload de arquivos e imagens).
* **Banco de Dados:** SQLite (`otica_lince.db`) com estrutura relacional robusta.
* **Identidade Visual:** Baseada na logomarca oficial da **Ótica Lince** (tons vinho rubi, ouro nobre e branco).

---

## 🚀 Como Executar o Projeto

1. **Pelo arquivo executável (.bat):**
   * Dê um duplo clique no arquivo [`iniciar-otica-lince.bat`](file:///c:/Users/Thales%20Mesquita/Desktop/otica%20lince/iniciar-otica-lince.bat).

2. **Pelo terminal:**
   ```bash
   npm start
   ```

3. **Acessos:**
   * **💻 No Computador (Local):**
     * Loja / Vitrine do Cliente: `http://localhost:3000`
     * Painel de Gestão (Admin): `http://localhost:3000/admin`
   * **📱 No Celular / Tablet (Wi-Fi Local):**
     * Loja / Vitrine do Cliente: `http://192.168.2.136:3000`
     * Painel de Gestão (Admin): `http://192.168.2.136:3000/admin`
     * *(Ou clique no botão "Ver no Celular" no topo do site para abrir via QR Code)*
