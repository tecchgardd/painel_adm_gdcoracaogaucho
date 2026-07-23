import { api, unwrapData } from './api';

export type FotoUploadResult = {
  totalRecebidos: number;
  totalEnviados: number;
  totalFalhas: number;
  fotos: {
    id: string;
    originalName: string;
    publicId: string;
    url: string;
    secureUrl: string;
    folder?: string;
  }[];
  erros: { arquivo: string; erro: string }[];
};

export type UploadablePhoto = File | { uri: string; name: string; type: string };
export async function uploadFotos(files: UploadablePhoto[], folder?: string) {
  const formData = new FormData();
  if (folder) formData.append('folder', folder);
  files.forEach((file) => {
    const relativePath = 'webkitRelativePath' in file ? file.webkitRelativePath : undefined;
    formData.append('photos', file as any, relativePath || file.name);
  });
  const response = await api.post('/admin/fotos/upload', formData);
  return unwrapData<FotoUploadResult>(response.data);
}
