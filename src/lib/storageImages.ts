import { supabase } from '@/integrations/supabase/client';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const extractStoragePath = (value: string, bucket: string): string | null => {
  const raw = value.trim();
  if (!raw) return null;

  const stripBucketPrefix = (path: string) =>
    path.replace(/^\/+/, '').replace(new RegExp(`^${bucket}[\\\\/]`), '');

  try {
    const url = ABSOLUTE_URL_PATTERN.test(raw)
      ? new URL(raw)
      : new URL(raw.startsWith('/') ? raw : `/${raw}`, 'http://local');

    const parts = url.pathname.split('/').filter(Boolean);
    const bucketIndex = parts.findIndex((part) => part === bucket);

    if (bucketIndex >= 0) {
      return parts.slice(bucketIndex + 1).join('/');
    }

    return ABSOLUTE_URL_PATTERN.test(raw) ? null : stripBucketPrefix(url.pathname);
  } catch {
    return ABSOLUTE_URL_PATTERN.test(raw) ? null : stripBucketPrefix(raw);
  }
};

export const resolveStoragePublicUrl = (
  value: string | null | undefined,
  bucket: string
): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  const filePath = extractStoragePath(trimmed, bucket);

  if (!filePath) {
    return trimmed;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl || trimmed;
};

export const resolveProductImageUrl = (value: string | null | undefined): string | null =>
  resolveStoragePublicUrl(value, 'product-images');

export const resolveStoreLogoUrl = (value: string | null | undefined): string | null =>
  resolveStoragePublicUrl(value, 'store-logos');
