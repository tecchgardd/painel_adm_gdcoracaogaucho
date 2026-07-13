import { api, unwrapData } from './api';

export type FotoUploadResult = {
  totalRecebidos: number;
  totalEnviados: number;
  totalFalhas: number;
  fotos: Array<{
    id: string;
    originalName: string;
    publicId: string;
    url: string;
    secureUrl: string;
    folder?: string;
  }>;
  erros: Array<{ arquivo: string; erro: string }>;
};

export async function uploadFotos(files: File[], folder?: string) {
  const formData = new FormData();
  if (folder) formData.append('folder', folder);
  files.forEach((file) => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    formData.append('photos', file, relativePath || file.name);
  });
  const response = await api.post('/admin/fotos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return unwrapData<FotoUploadResult>(response.data);
}
