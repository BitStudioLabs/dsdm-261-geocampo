export function getAvatarStorageKey(userId: string) {
  return `profile-avatar-path:${userId}`;
}

export function extractAvatarPath(value: string) {
  const publicMarker = '/storage/v1/object/public/avatares/';
  const signMarker = '/storage/v1/object/sign/avatares/';
  if (value.includes(publicMarker)) return decodeURIComponent(value.split(publicMarker)[1]?.split('?')[0] ?? '');
  if (value.includes(signMarker)) return decodeURIComponent(value.split(signMarker)[1]?.split('?')[0] ?? '');
  return value;
}

export function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
