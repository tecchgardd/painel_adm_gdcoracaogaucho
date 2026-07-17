import { api, unwrapData } from './api';

export type IntegrationHealth = { status: string; stripeConfigured: boolean };

export async function getIntegrationHealth() {
  const response = await api.get('/health', { baseURL: String(api.defaults.baseURL ?? '').replace(/\/api\/?$/, '') });
  return unwrapData<IntegrationHealth>(response.data);
}
