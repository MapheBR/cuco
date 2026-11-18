import { api } from './api.js?v=15';

export const store = {
  view: 'dashboard',
  month: new Date().toISOString().slice(0, 7),
  user: null,
  members: [],
  shifts: [],
  users: [],
  audit: [],
  compliance: null,
  auditFilters: { q: '', limit: '100' },
  myShifts: { shifts: [], stats: {} },
  summary: null,
  settings: {},
  editingShift: null,
  editingMember: null,
  editingUser: null,
  filters: { from: '', to: '', member: '', status: '', q: '' },
};

export async function loadMembers() {
  store.members = await api.get('/api/members');
  return store.members;
}

export async function loadUsers() {
  store.users = await api.get('/api/users');
  return store.users;
}

export async function loadCompliance() {
  store.compliance = await api.get(`/api/compliance?month=${store.month}`);
  return store.compliance;
}

export async function loadAudit() {
  const query = new URLSearchParams(store.auditFilters);
  store.audit = await api.get(`/api/audit?${query}`);
  return store.audit;
}

export async function loadMyShifts() {
  store.myShifts = await api.get('/api/my-shifts');
  return store.myShifts;
}

export async function loadSummary() {
  store.summary = await api.get(`/api/summary?month=${store.month}`);
  return store.summary;
}

export async function loadSettings() {
  store.settings = await api.get('/api/settings');
  return store.settings;
}

export async function loadShifts() {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(store.filters)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString() ? `?${query}` : '';
  store.shifts = await api.get(`/api/shifts${suffix}`);
  return store.shifts;
}
