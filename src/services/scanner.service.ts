import { api, unwrapData } from './api';
import type { ScannerResult } from '@/types/entities';

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
