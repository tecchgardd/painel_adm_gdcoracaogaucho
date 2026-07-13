import { api, unwrapData } from './api';

type UploadResponse = {
  url?: string;
  secureUrl?: string;
  secure_url?: string;
};

export async function uploadImage(uri: string, name = 'banner.jpg') {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name,
    type: 'image/jpeg'
  } as any);

  const response = await api.post('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const data = unwrapData<UploadResponse>(response.data);
  const url = data.url ?? data.secureUrl ?? data.secure_url;
  if (!url) throw new Error('Upload concluído sem URL da imagem.');
  return url;
}
