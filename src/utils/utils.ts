
import crypto from 'crypto'
export const bufferToBase64 = (buffer: Uint8Array<ArrayBufferLike>) => {
    const base64String = btoa(
        Array.from(buffer)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );

    return base64String
}

const decryptDES = (encryptedString: string, key: string) => {
    try {
        const md5key = crypto.createHash('md5').update(key, 'ascii').digest()

        const encryptedBuffer = Buffer.from(encryptedString, 'base64')

        const decipher = crypto.createDecipheriv('des-ede3-ecb', md5key, null)
        decipher.setAutoPadding(true)

        let decrypted = decipher.update(encryptedBuffer)
        decrypted = Buffer.concat([decrypted, decipher.final()])

        return decrypted.toString('ascii')
    }

    catch (err: unknown){
        const error = err as Error
        console.log(`Decryption failed: ${error.message}`)
    }
}

export const verifyDESPassword = (pw: string, storedHash: string, key: string) => {
    const decryptedString = decryptDES(storedHash, key)

    return decryptedString === pw
}