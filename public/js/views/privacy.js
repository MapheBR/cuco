import { store } from '../store.js?v=20';

const SECTIONS = [
  {
    title: 'Dados coletados',
    text: 'Nome, login, cargo, e-mail, foto de perfil, escalas atribuídas e registro de ações no sistema (com data, IP e tipo de navegador).',
  },
  {
    title: 'Base legal',
    text: 'O tratamento é feito com base no art. 7º, II e V da LGPD: cumprimento de obrigação legal e execução do contrato de trabalho. Não solicitamos consentimento para a gestão da jornada.',
  },
  {
    title: 'Finalidade',
    text: 'Organizar escalas, registrar jornada, apontar riscos de conformidade e manter trilha de auditoria para defesa em reclamação trabalhista.',
  },
  {
    title: 'Retenção',
    text: 'Registros de jornada são mantidos pelo prazo prescricional trabalhista de até cinco anos após o desligamento. Fotos e contas inativas são removidas a pedido.',
  },
  {
    title: 'Seus direitos',
    text: 'Você pode solicitar acesso, correção, anonimização, bloqueio ou eliminação dos seus dados (art. 18 da LGPD) usando os botões do seu perfil.',
  },
  {
    title: 'Compartilhamento e incidentes',
    text: 'Os dados ficam no banco local da empresa e não são compartilhados com terceiros. Incidentes com risco relevante são comunicados à ANPD e aos titulares no prazo de três dias úteis.',
  },
];

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Privacidade e proteção de dados</h2>
      <p>Informações claras sobre o tratamento dos seus dados (LGPD).</p></div></div>
      <p class="small muted">Titular: ${store.user?.name || ''} · Perfil: ${store.user?.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
    </section>
    <section class="grid grid-two">${SECTIONS.map((section) => `<div class="card">
      <h3>${section.title}</h3><p class="small muted" style="margin-top:8px">${section.text}</p></div>`).join('')}</section>
  </div>`;
}

export function mount() {}
