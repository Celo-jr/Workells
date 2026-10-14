function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto == null ? '' : texto;
  return d.innerHTML;
}
function htmlParaTexto(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
function formatarData(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
}
const CATEGORIAS = {
  'software-dev': 'Desenvolvimento', 'customer-support': 'Atendimento', 'design': 'Design',
  'marketing': 'Marketing', 'sales': 'Vendas', 'product': 'Produto', 'business': 'Negócios',
  'data': 'Dados', 'devops': 'DevOps', 'finance-legal': 'Financeiro',
  'human-resources': 'Recursos Humanos', 'qa': 'Qualidade (QA)', 'writing': 'Redação', 'all-others': 'Outras áreas'
};

const API_VAGAS = 'https://remotive.com/api/remote-jobs';
let vagasCarregadas = [];

async function carregarVagas() {
  const lista = document.getElementById('listaVagas');
  if (!lista) return;
  const status = document.getElementById('statusVagas');
  const busca = (document.getElementById('campoBusca')?.value || '').trim();
  const categoria = document.getElementById('campoCategoria')?.value || '';

  const params = new URLSearchParams({ limit: 12 });
  if (busca) params.set('search', busca);
  if (categoria) params.set('category', categoria);

  lista.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 mb-0">Buscando vagas...</p></div>';
  status.textContent = '';

  try {
    const resposta = await fetch(API_VAGAS + '?' + params.toString());
    if (!resposta.ok) throw new Error('Falha na API');
    const dados = await resposta.json();
    vagasCarregadas = dados.jobs || [];
    desenharVagas();
  } catch (erro) {
    lista.innerHTML = '<div class="col-12"><div class="alert alert-warning mb-0">Não foi possível carregar as vagas agora. Verifique sua conexão e tente novamente.</div></div>';
  }
}

function desenharVagas() {
  const lista = document.getElementById('listaVagas');
  const status = document.getElementById('statusVagas');
  if (!vagasCarregadas.length) {
    lista.innerHTML = '<div class="col-12"><div class="alert alert-info mb-0">Nenhuma vaga encontrada. Tente outra palavra ou outra área.</div></div>';
    status.textContent = '';
    return;
  }
  status.textContent = vagasCarregadas.length + ' vagas encontradas';
  lista.innerHTML = vagasCarregadas.map((v, i) => {
    const logo = v.company_logo
      ? '<img class="vaga-logo" src="' + escapar(v.company_logo) + '" alt="Logo da empresa ' + escapar(v.company_name) + '" loading="lazy">'
      : '<div class="vaga-logo-vazio" aria-hidden="true">' + escapar((v.company_name || '?').charAt(0).toUpperCase()) + '</div>';
    const tipo = v.job_type ? v.job_type.replace('_', ' ') : '';
    return '' +
      '<div class="col-md-6 col-lg-4">' +
        '<article class="vaga-card p-4 d-flex flex-column">' +
          '<div class="d-flex gap-3 mb-3">' + logo +
            '<div><h3 class="titulo mb-1">' + escapar(v.title) + '</h3>' +
            '<div class="small text-secondary">' + escapar(v.company_name) + '</div></div></div>' +
          '<div class="d-flex flex-wrap gap-2 mb-3">' +
            '<span class="badge badge-tag">' + escapar(CATEGORIAS[v.category_slug] || v.category) + '</span>' +
            (tipo ? '<span class="badge badge-neutra">' + escapar(tipo) + '</span>' : '') +
            '<span class="badge badge-neutra"><i class="bi bi-geo-alt"></i> ' + escapar(v.candidate_required_location || 'Remoto') + '</span>' +
          '</div>' +
          '<div class="mt-auto d-flex justify-content-between align-items-center">' +
            '<small class="text-secondary">' + formatarData(v.publication_date) + '</small>' +
            '<button type="button" class="btn btn-outline-primary btn-sm" data-vaga="' + i + '">Ver detalhes</button>' +
          '</div>' +
        '</article>' +
      '</div>';
  }).join('');
}

function abrirModalVaga(indice) {
  const v = vagasCarregadas[indice];
  if (!v) return;
  document.getElementById('modalVagaTitulo').textContent = v.title;
  document.getElementById('modalVagaEmpresa').textContent = v.company_name + ' • ' + (v.candidate_required_location || 'Remoto');
  document.getElementById('modalVagaSalario').textContent = v.salary ? 'Salário: ' + v.salary : 'Salário não informado';
  const texto = htmlParaTexto(v.description);
  document.getElementById('modalVagaDescricao').textContent = texto.length > 900 ? texto.slice(0, 900) + '...' : texto;
  document.getElementById('modalVagaLink').href = v.url;
  new bootstrap.Modal(document.getElementById('modalVaga')).show();
}

function iniciarVagas() {
  const form = document.getElementById('formBusca');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    carregarVagas();
    document.getElementById('vagas').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('listaVagas').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-vaga]');
    if (botao) abrirModalVaga(Number(botao.dataset.vaga));
  });
  carregarVagas();
}

function mascaraCep(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 8);
  return n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n;
}
function mascaraTelefone(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length > 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7);
  if (n.length > 6) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
  if (n.length > 2) return '(' + n.slice(0, 2) + ') ' + n.slice(2);
  return n;
}

async function buscarCep() {
  const campoCep = document.getElementById('cep');
  const status = document.getElementById('statusCep');
  const cep = campoCep.value.replace(/\D/g, '');
  if (cep.length !== 8) return;

  status.className = 'status-cep text-secondary';
  status.textContent = 'Buscando endereço...';
  try {
    const resposta = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    const dados = await resposta.json();
    if (dados.erro) throw new Error('CEP não encontrado');
    document.getElementById('logradouro').value = dados.logradouro || '';
    document.getElementById('bairro').value = dados.bairro || '';
    document.getElementById('cidade').value = dados.localidade || '';
    document.getElementById('uf').value = dados.uf || '';
    campoCep.setCustomValidity('');
    status.className = 'status-cep text-success';
    status.textContent = 'Endereço preenchido automaticamente.';
    document.getElementById('numero').focus();
  } catch (erro) {
    ['logradouro', 'bairro', 'cidade', 'uf'].forEach((id) => (document.getElementById(id).value = ''));
    campoCep.setCustomValidity('CEP não encontrado');
    status.className = 'status-cep text-danger';
    status.textContent = 'CEP não encontrado. Confira os números digitados.';
  }
  campoCep.classList.toggle('is-invalid', !campoCep.checkValidity());
}

function ligarValidacao(form, aoEnviar) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      const primeiroErro = form.querySelector(':invalid');
      if (primeiroErro) primeiroErro.focus();
      return;
    }
    aoEnviar(new FormData(form));
  });
}

function iniciarCadastro() {
  const form = document.getElementById('formCadastro');
  if (!form) return;
  const cep = document.getElementById('cep');
  cep.addEventListener('input', () => {
    cep.value = mascaraCep(cep.value);
    cep.setCustomValidity('');
    if (cep.value.replace(/\D/g, '').length === 8) buscarCep();
  });
  const tel = document.getElementById('telefone');
  tel.addEventListener('input', () => (tel.value = mascaraTelefone(tel.value)));

  ligarValidacao(form, (dados) => {
    document.getElementById('nomeSucesso').textContent = dados.get('nome').split(' ')[0];
    new bootstrap.Modal(document.getElementById('modalSucesso')).show();
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('statusCep').textContent = '';
  });
}

function iniciarContato() {
  const form = document.getElementById('formContato');
  if (!form) return;
  ligarValidacao(form, (dados) => {
    document.getElementById('nomeSucesso').textContent = dados.get('nome').split(' ')[0];
    new bootstrap.Modal(document.getElementById('modalSucesso')).show();
    form.reset();
    form.classList.remove('was-validated');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarVagas();
  iniciarCadastro();
  iniciarContato();
});
