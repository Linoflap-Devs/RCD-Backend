import { IAgentRegister } from "../types/auth.types";
import { QueryResult } from "../types/global.types";
import { format } from 'date-fns'
import { IImage } from "../types/image.types";
import path from "path";
import { approveAgentRegistrationTransaction, findSession, insertSession, registerAgentTransaction } from "../repository/auth.repository";
import { findAgentUserByEmail } from "../repository/users.repository";
import { logger } from "../utils/logger";
import { verifyPassword } from "../utils/scrypt";
import crypto from 'crypto';
import { success } from "zod";

export const generateSessionToken = (): string => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const token = Buffer.from(bytes).toString('hex');
    return token;
}

export const createSession = async (token: string, userId: number) => {
    const result = await insertSession(token, userId);

    return result;
}   

// export const validateSessionToken = async (token: string) => {   
//     const find = await findSession(token)
    
//     if(find === null) {
//         logger('Session not found', {token: token})
//         return { session: null, user: null }
//     }

//     if(find !== undefined && find.data.session !== null) {
//         console.log(find.data.session)
//         if(Date.now() >= find.data.session?.ExpiresAt.getTime()) {
//             await deleteSession(find.data.session.SessionID)
//             return { session: null, user: null}
//         }

//         if(Date.now() >= find.data.session?.ExpiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
//             find.data.session.ExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
//             await extendSessionExpiry(find.data.session.SessionID, find.data.session.ExpiresAt)
//         }

//         return { session: find.data.session, user: find.data.user }
//     }

//     logger('Session not found', {token: token})
//     return { session: null, user: null }
// }

export const registerAgentService = async (data: IAgentRegister, image?: Express.Multer.File): QueryResult<any> => {
    console.log(data, image)
    const filename = `${data.lastName}-${data.firstName}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();

    let metadata: IImage | undefined = undefined

    if(image)(
        metadata = {
            FileName: filename,
            ContentType: image.mimetype,
            FileExt: path.extname(image.originalname),
            FileSize: image.size,
            FileContent: image.buffer
        }
    )

    const result = await registerAgentTransaction(data, metadata)

    if(!result.success) return result

    return result
}

export const loginAgentService = async (email: string, password: string): QueryResult<{token: string, email: string}> => {
    const user = await findAgentUserByEmail(email)

    if(!user.success) {
        logger((user.error?.message || 'Failed to find user.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    if(!user.data.isVerified){
        logger(('User is not verified.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    // compare passwords
    const storedPw = user.data.password
    const compare = await verifyPassword(password, storedPw)

    if(!compare){
        logger(('Password does not match.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    const token = generateSessionToken()
    const session = await createSession(token, user.data.agentUserId)

    if(!session.success) {
        logger(( session.error?.message || 'Failed to create session.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Failed to create session.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {
            token: token,
            email: email
        }
    }
}

export const approveAgentRegistrationService = async (agentRegistrationId: number, agentId?: number) => {
    const result = await approveAgentRegistrationTransaction(agentRegistrationId, agentId)

    if(!result.success){
        logger((result.error?.message || 'Failed to approve agent registration.'), {agentRegistrationId: agentRegistrationId, agentId: agentId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Failed to create session.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {
            email: result.data.Email,
            isVerified: result.data.IsVerified
        }
    }

}   