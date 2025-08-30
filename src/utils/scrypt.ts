import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export const hashPassword = async (pw: string): Promise<string> => {
    const salt = randomBytes(16).toString('hex');
    const keyLength = 64;

    const hashBuffer = (await scryptAsync(pw, salt, keyLength)) as Buffer;
    const hash = hashBuffer.toString('hex');

    return `${salt}|${hash}`
}

export const verifyPassword = async (pw: string, storedHash: string): Promise<boolean> => {
    const [ salt, originalHash ] = storedHash.split('|');
    const keyLength = 64;

    const hashBuffer = (await scryptAsync(pw, salt, keyLength)) as Buffer;
    const hash = hashBuffer.toString('hex');

    return hash === originalHash;
}