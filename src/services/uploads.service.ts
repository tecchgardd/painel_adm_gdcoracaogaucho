import { api, unwrapData } from './api';

type UploadResponse = {
  url?: string;
  secureUrl?: string;
  secure_url?: string;
};

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

export function isLocalImageUri(uri?: string | null) {
  if (!uri) return false;
  return /^(file|content|ph|blob):\/\//i.test(uri);
}

export function resolveImageUrlForPayload(uri: string | undefined, explicitlyRemoved: boolean) {
  if (explicitlyRemoved) return null;
  const value = uri?.trim();
  return value || undefined;
}

function inferMimeType(name: string, mimeType?: string, webFile?: Blob) {
  const detected = mimeType || webFile?.type;
  if (detected?.startsWith('image/')) return detected;
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return `image/${extension}`;
  return 'image/jpeg';
}

export async function uploadImage(uri: string, name = 'banner.jpg', webFile?: Blob, mimeType?: string): Promise<string> {
  if (!uri?.trim()) throw new Error('URI da imagem não informada.');
  if (!webFile && REMOTE_IMAGE_PATTERN.test(uri)) {
    if (!/^https:\/\//i.test(uri)) throw new Error('A imagem remota deve usar HTTPS.');
    return uri;
  }
  if (!webFile && !isLocalImageUri(uri)) {
    throw new Error('URI da imagem inválida.');
  }

  const fileName = name.trim() || `image-${Date.now()}.jpg`;
  const formData = new FormData();
  if (webFile) formData.append('image', webFile, fileName);
  else formData.append('image', { uri, name: fileName, type: inferMimeType(fileName, mimeType) } as any);

  const response = await api.post('/uploads/image', formData);
  const data = unwrapData<UploadResponse>(response.data);
  const url = data.secure_url ?? data.secureUrl ?? data.url;
  if (!url || !/^https:\/\//i.test(url)) throw new Error('Upload concluído sem uma URL HTTPS válida.');
  return url;
}
