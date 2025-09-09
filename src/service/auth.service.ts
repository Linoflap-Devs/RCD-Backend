import { IAgentRegister } from "../types/auth.types";
import { QueryResult } from "../types/global.types";
import { addMinutes, format } from 'date-fns'
import { IImage } from "../types/image.types";
import path from "path";
import { approveAgentRegistrationTransaction, changePassword, deleteEmployeeSession, deleteOTP, deleteResetPasswordToken, deleteSession, extendEmployeeSessionExpiry, extendSessionExpiry, findAgentEmail, findEmployeeSession, findResetPasswordToken, findResetPasswordTokenByUserId, findSession, findUserOTP, insertEmployeeSession, insertOTP, insertResetPasswordToken, insertSession, registerAgentTransaction, updateResetPasswordToken } from "../repository/auth.repository";
import { findAgentUserByEmail, findAgentUserById, findEmployeeUserByUsername } from "../repository/users.repository";
import { logger } from "../utils/logger";
import { hashPassword, verifyPassword } from "../utils/scrypt";
import crypto from 'crypto';
import { sendMail } from "../utils/email";
import { emailChangePasswordTemplate, emailOTPTemplate } from "../assets/email/email.template";
import 'dotenv/config'
import { verifyDESPassword } from "../utils/utils";

const DES_KEY = process.env.DES_KEY || ''

const generateOTP = (): number => {
    return crypto.randomInt(100000, 999999);
}

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

export const createEmployeeSession = async (token: string, userId: number) => {
    const result = await insertEmployeeSession(token, userId);

    return result
}

export const validateSessionToken = async (token: string) => {   
    const find = await findSession(token)
    
    if(find === null) {
        logger('Session not found', {token: token})
        return { session: null, user: null }
    }

    if(find !== undefined && find.data.AgentSession !== null) {
        console.log(find.data.AgentSession)
        if(Date.now() >= find.data.AgentSession?.ExpiresAt.getTime()) {
            await deleteSession(find.data.AgentSession.SessionID)
            return { session: null, user: null}
        }

        if(Date.now() >= find.data.AgentSession?.ExpiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
            find.data.AgentSession.ExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
            await extendSessionExpiry(find.data.AgentSession.SessionID, find.data.AgentSession.ExpiresAt)
        }

        return { session: find.data.AgentSession, user: find.data.AgentUser }
    }

    logger('Session not found', {token: token})
    return { session: null, user: null }
}

export const validateEmployeeSessionToken = async (token: string) => {   
    const find = await findEmployeeSession(token)
    
    if(find === null) {
        logger('Session not found', {token: token})
        return { session: null, user: null }
    }

    if(find !== undefined && find.data.EmployeeSession !== null) {
        console.log(find.data.EmployeeSession)
        if(Date.now() >= find.data.EmployeeSession?.ExpiresAt.getTime()) {
            await deleteSession(find.data.EmployeeSession.SessionID)
            return { session: null, user: null}
        }

        if(Date.now() >= find.data.EmployeeSession?.ExpiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
            find.data.EmployeeSession.ExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
            await extendEmployeeSessionExpiry(find.data.EmployeeSession.SessionID, find.data.EmployeeSession.ExpiresAt)
        }

        return { session: find.data.EmployeeSession, user: find.data.EmployeeUser }
    }

    logger('Session not found', {token: token})
    return { session: null, user: null }
}

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

    if(!result.success) {
        return {
            success: false,
            data: {},
            error: {
                message: result.error?.message || 'Failed to register agent.',
                code: result.error?.code || 500 
            }
        }
    }

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

export const loginEmployeeService = async (username: string, password: string): QueryResult<{token: string, username: string}> => {
    const user = await findEmployeeUserByUsername(username)

    if(!user.success) {
        logger((user.error?.message || 'Failed to find user.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    // compare passwords
    const checkPw = await verifyDESPassword(password, user.data.password, DES_KEY)

    if(!checkPw){
        logger(('Password does not match.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    const token = generateSessionToken()
    const session = await createEmployeeSession(token, user.data.userId)

    if(!session.success) {
        logger(( session.error?.message || 'Failed to create session.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string},
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
            username: username
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

export const getCurrentAgentService = async (userId: number): QueryResult<{agentId: number, email: string, isVerified: boolean}> => {
    const result = await findAgentUserById(Number(userId));

    if(!result.success){
        logger('Failed to find user.', {userId: userId})
        return {
            success: false,
            data: {} as {agentId: number, email: string, isVerified: boolean},
            error: {
                message: 'Failed to find user.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {
            agentId: result.data.agentUserId,
            email: result.data.email,
            isVerified: result.data.isVerified
        }
    }
}

export const logoutAgentSessionService = async(sessionId: number): QueryResult<any> => {
    const result = await deleteSession(sessionId)

    if(!result.success){
        logger('Failed to delete session.', {sessionId: sessionId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to delete session.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {}
    }
}

export const logoutEmployeeSessionService = async(sessionId: number): QueryResult<any> => {
    const result = await deleteEmployeeSession(sessionId)

    if(!result.success){
        logger('Failed to delete session.', {sessionId: sessionId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to delete session.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {}
    }
}

export const findEmailSendOTP = async (email: string): QueryResult<null> => {
    const findEmail = await findAgentEmail(email)

    if(!findEmail.success){
        logger('Failed to find email.', {email: email})
        return {
            success: false,
            data: null,
            error: {
                message: 'Failed to find email.',
                code: 500
            }
        }
    }

    const code = generateOTP().toString()
    const minuteExpiry = 5
    const expiry = addMinutes(new Date(), minuteExpiry)

    // insert otp

    const otpInsert = await insertOTP(findEmail.data.AgentUserID, code, expiry)

    if(!otpInsert.success){
        logger('Failed to insert otp.', {email: email})
        return {
            success: false,
            data: null,
            error: {
                message: 'Failed to insert otp.',
                code: 500
            }
        }
    }

    // send email
    //const send = sendMail(findEmail.data.Email, 'Password OTP', emailOTPTemplate(code, minuteExpiry))
    const spare = sendMail('wendell.ravago@linoflaptech.com', 'Password OTP', emailOTPTemplate(code, minuteExpiry))

    return {
        success: true,
        data: null
    }
}

export const verifyOTPService = async (email: string, code: string): QueryResult<any> => {
    const user = await findAgentUserByEmail(email)

    if(!user.success){
        logger('Failed to find user.', {email: email})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 404
            }
        }
    }

    const otp = await findUserOTP(user.data.agentUserId, code)

    if(!otp.success){
        logger('Failed to find otp.', {email: email, code: code})
        return {
            success: false,
            data: {} as any,
            error: {
                message: otp.error?.message || 'Failed to find otp.',
                code: 404
            }
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const date30Mins = addMinutes(new Date(), 30)
    let resultToken = null;

    const existingToken = await findResetPasswordTokenByUserId(user.data.agentUserId)
    console.log('existingToken', existingToken)

    if(existingToken.success || existingToken.data){
        const updateToken = await updateResetPasswordToken(user.data.agentUserId, token, date30Mins)
        

        if(!updateToken.success){
            logger('Failed to update reset token.', {email: email, code: code})
            return {
                success: false,
                data: {} as any,
                error: {
                    message: updateToken.error?.message || 'Failed to update reset token.',
                    code: 500
                }
            }
        }

        resultToken = updateToken.data.Token
    }

    else {
        const resetToken = await insertResetPasswordToken(user.data.agentUserId, token, date30Mins)

        if(!resetToken.success){
            logger('Failed to insert reset token.', {email: email, code: code})
            return {
                success: false,
                data: {} as any,
                error: {
                    message: 'Failed to insert reset token.',
                    code: 500
                }
            }
        }

        resultToken = resetToken.data.Token
    }

    // delete otp

    const deleteOTPResult = await deleteOTP(code)

    return {
        success: true,
        data: {
            token: resultToken
        }
    }
}

export const changePasswordService = async (email: string, resetToken: string, oldPassword: string, newPassword: string): QueryResult<any> => {
    const user = await findAgentUserByEmail(email)

    if(!user.success){
        logger('Failed to find user.', {email: email})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 404
            }
        }
    }

    // find token for email
    const tokenExists = await findResetPasswordToken(user.data.agentUserId, resetToken)

    if(!tokenExists.success){
        logger('Failed to find token.', {email: email})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find token.',
                code: 404
            }
        }
    }

    // check if old password matches
    const checkOldPassword = await verifyPassword(oldPassword, user.data.password)

    if(!checkOldPassword) {
        logger('Old password does not match.', {email: email})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Old password does not match.',
                code: 400
            }
        }
    }

    // update password
    const pwHash = await hashPassword(newPassword)
    const updatePassword = await changePassword(user.data.agentUserId, pwHash)

    if(!updatePassword.success){
        logger('Failed to update password.', {email: email})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to update password.',
                code: 500
            }
        }
    }

    const deleteResetPasswordTokenResult = await deleteResetPasswordToken(user.data.agentUserId, resetToken)
    
    // send email

    const now = new Date()
    const date = format(now, 'MMM dd, yyyy')
    const time = format(now, 'hh:mmaa')

    //const send = sendMail(findEmail.data.Email, 'Password OTP', emailOTPTemplate(code, minuteExpiry))
    const spare = sendMail('wendell.ravago@linoflaptech.com', 'Password OTP', emailChangePasswordTemplate(date, time))

    return {    
        success: true,
        data: null
    }
}