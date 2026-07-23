import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isLocalImageUri, resolveImageUrlForPayload, uploadImage } from './uploads.service';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('./api', () => ({
  api: { post },
  unwrapData: <T>(payload: T) => payload
}));

describe('uploads.service', () => {
  beforeEach(() => post.mockReset());

  it('identifica URIs locais sem confundir URLs remotas', () => {
    expect(isLocalImageUri('file:///banner.jpg')).toBe(true);
    expect(isLocalImageUri('content://media/banner.jpg')).toBe(true);
    expect(isLocalImageUri('ph://asset-id')).toBe(true);
    expect(isLocalImageUri('https://res.cloudinary.com/demo/banner.jpg')).toBe(false);
  });

  it('preserva ausência e só retorna null após remoção explícita', () => {
    expect(resolveImageUrlForPayload(undefined, false)).toBeUndefined();
    expect(resolveImageUrlForPayload('', false)).toBeUndefined();
    expect(resolveImageUrlForPayload('https://res.cloudinary.com/demo/banner.jpg', false))
      .toBe('https://res.cloudinary.com/demo/banner.jpg');
    expect(resolveImageUrlForPayload('https://res.cloudinary.com/demo/banner.jpg', true)).toBeNull();
  });

  it('aguarda o upload e retorna somente secure_url HTTPS', async () => {
    const secureUrl = 'https://res.cloudinary.com/demo/image/upload/banner.jpg';
    post.mockResolvedValue({ data: { secure_url: secureUrl } });

    await expect(uploadImage('file:///banner.heic', 'banner.heic', undefined, 'image/heic')).resolves.toBe(secureUrl);
    expect(post).toHaveBeenCalledOnce();
    expect(post.mock.calls[0][0]).toBe('/uploads/image');
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData);
  });

  it('não reenvia uma URL remota HTTPS para o Cloudinary', async () => {
    const secureUrl = 'https://res.cloudinary.com/demo/image/upload/existente.jpg';
    await expect(uploadImage(secureUrl)).resolves.toBe(secureUrl);
    expect(post).not.toHaveBeenCalled();
  });

  it('rejeita URI vazia e resposta sem URL segura', async () => {
    await expect(uploadImage('')).rejects.toThrow('URI da imagem não informada');
    post.mockResolvedValue({ data: { url: 'http://example.com/insegura.jpg' } });
    await expect(uploadImage('file:///banner.jpg')).rejects.toThrow('URL HTTPS válida');
  });
});
