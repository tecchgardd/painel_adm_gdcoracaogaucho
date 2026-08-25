import type { ScannerResult } from '@/shared/types/entities';
import { api, unwrapData } from '@/core/api/client';

export async function validarQRCode(codigo: string) {
  const response = await api.post('/admin/scanner/validar', { codigo });
  return unwrapData<ScannerResult>(response.data);
}

export async function validarCodigoManual(codigo: string) {
  const response = await api.post('/admin/scanner/digitar-codigo', { codigo });
  return unwrapData<ScannerResult>(response.data);
}

export async function getHistoricoValidacoes() {
  const response = await api.get('/admin/scanner/historico');
  return unwrapData(response.data);
}
