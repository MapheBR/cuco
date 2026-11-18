function csrfToken() {
  const entry = document.cookie.split('; ').find((part) => part.startsWith('cuco_csrf='));
  return entry ? entry.slice('cuco_csrf='.length) : '';
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json' };
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = csrfToken();
  let response;
  try {
    response = await fetch(path, {
      headers,
      credentials: 'same-origin',
      ...options,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor local');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Resposta inválida do servidor');
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') {
      window.dispatchEvent(new CustomEvent('cuco:unauthorized'));
    }
    const error = new Error(payload.error || 'Erro na requisição');
    error.issues = payload.issues;
    throw error;
  }
  return payload.data !== undefined ? payload.data : payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (dataUrl) => request('/api/upload', { method: 'POST', body: JSON.stringify({ data: dataUrl }) }),
};
