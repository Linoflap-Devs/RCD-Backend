export const bufferToBase64 = (buffer: Uint8Array<ArrayBufferLike>) => {
    const base64String = btoa(
        Array.from(buffer)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );

    return base64String
}