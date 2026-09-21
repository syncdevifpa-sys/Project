// Cliente de API HTTP do Arcádia conectado ao Back-end Express

export function getToken(): string {
  try {
    const raw = localStorage.getItem('arcadiaSessao');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token) return parsed.token;
    }
    const tok = localStorage.getItem('arcadiaToken');
    if (tok) return tok;
  } catch {}
  return '';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Erro ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};

/**
 * Utilitário para exportar dados reais em formato CSV e disparar o download no navegador.
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || rows.length === 0) {
    alert('Nenhum dado selecionado para exportar.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Cabeçalho
  csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'));

  // Linhas
  rows.forEach((row) => {
    const line = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvLines.push(line.join(';'));
  });

  const csvContent = '\uFEFF' + csvLines.join('\r\n'); // UTF-8 BOM para Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
