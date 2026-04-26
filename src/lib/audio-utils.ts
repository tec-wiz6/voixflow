/**
 * Helper to convert float32 audio buffer to int16 PCM (the format Gemini expects)
 */
export function float32ToInt16(buffer: Float32Array): ArrayBuffer {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff;
  }
  return buf.buffer;
}

/**
 * Helper to convert int16 PCM to float32 (the format the Web Audio API expects)
 */
export function int16ToFloat32(buffer: Int16Array): Float32Array {
  const l = buffer.length;
  const buf = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    buf[i] = buffer[i] / 0x7fff;
  }
  return buf;
}

/**
 * Converts a base64 string to an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
