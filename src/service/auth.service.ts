import { IAgentInvite, IAgentRegister, IBrokerRegister, IEmployeeRegister, IInviteTokens } from "../types/auth.types";
import { QueryResult } from "../types/global.types";
import { addMinutes, format } from 'date-fns'
import { IImage } from "../types/image.types";
import path from "path";
import { approveAgentRegistrationTransaction, approveBrokerRegistrationTransaction, changeEmployeePassword, changePassword, deleteAllInviteTokensByEmail, deleteBrokerSession, deleteEmployeeAllSessions, deleteEmployeeSession, deleteInviteRegistrationTransaction, deleteOTP, deleteResetPasswordToken, deleteSession, deleteSessionUser, extendEmployeeSessionExpiry, extendSessionExpiry, findAgentEmail, findAgentRegistrationById, findBrokerRegistrationById, findBrokerSession, findEmployeeSession, findInviteToken, findResetPasswordToken, findResetPasswordTokenByUserId, findSession, findUserOTP, getTblAgentUsers, insertBrokerSession, insertEmployeeSession, insertInviteToken, insertOTP, insertResetPasswordToken, insertSession, registerAgentTransaction, registerBrokerTransaction, registerEmployee, rejectAgentRegistration, rejectBrokerRegistration, updateInviteToken, updateResetPasswordToken } from "../repository/auth.repository";
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, findAgentUserByEmail, findAgentUserById, findBrokerDetailsByUserId, findBrokerUserByEmail, findEmployeeUserById, findEmployeeUserByUsername, getAgentUsers } from "../repository/users.repository";
import { logger } from "../utils/logger";
import { hashPassword, verifyPassword } from "../utils/scrypt";
import crypto from 'crypto';
import { sendMail } from "../utils/email";
import { emailChangePasswordTemplate, emailInviteTemplate, emailOTPTemplate } from "../assets/email/email.template";
import 'dotenv/config'
import { verifyDESPassword } from "../utils/utils";
import { getSalesBranch } from "../repository/sales.repository";
import is from "zod/v4/locales/is.cjs";
import { ITblBroker, ITblBrokerRegistration } from "../types/brokers.types";
import { ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { getPositions } from "../repository/position.repository";
import { getBrokerUsers } from "../repository/brokers.repository";
import { sendSimpleEmail, sendTemplateEmail } from "./email.service";
import { send } from "process";
import { editAgentRegistration, getAgent, getAgentRegistration } from "../repository/agents.repository";

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

export const createBrokerSession = async (token: string, userId: number) => {
    const result = await insertBrokerSession(token, userId);

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

export const validateBrokerSessionToken = async (token: string) => {   
    const find = await findBrokerSession(token)
    
    if(find === null) {
        logger('Session not found', {token: token})
        return { session: null, user: null }
    }

    if(find !== undefined && find.data.BrokerSession !== null) {
        console.log(find.data.BrokerSession)
        if(Date.now() >= find.data.BrokerSession?.ExpiresAt.getTime()) {
            await deleteSession(find.data.BrokerSession.SessionID)
            return { session: null, user: null}
        }

        if(Date.now() >= find.data.BrokerSession?.ExpiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
            find.data.BrokerSession.ExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
            await extendEmployeeSessionExpiry(find.data.BrokerSession.SessionID, find.data.BrokerSession.ExpiresAt)
        }

        return { session: find.data.BrokerSession, user: find.data.BrokerUser }
    }

    logger('Session not found', {token: token})
    return { session: null, user: null }
}

// Invite Token
const generateInviteToken = (): string => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const token = Buffer.from(bytes).toString('hex');
    return token;
}

export const inviteNewUserService = async (userId: number, email: string) => {
    const agentData = await findAgentDetailsByUserId(userId)

    if(!agentData.success){
        return { success: false, data: {}, error: { code: 500, message: 'Failed to find agent user.' } }
    }

    if(!agentData.data.AgentID){
        return { success: false, data: {}, error: { code: 404, message: 'Agent not found.' } }
    }

    if(!agentData.data.DivisionID){
        return { success: false, data: {}, error: { code: 400, message: 'Agent division not found.' } }
    }

    const existingInvite = await findInviteToken({email: email})

    if(existingInvite.data){
        if(existingInvite.data.some(invite => invite.IsUsed == 1)){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Email is already registered.'
                }
            }
        }

        const deleteAllTokens = await deleteAllInviteTokensByEmail(email)
    }

    const existingRegistration = await getAgentUsers({emails: [email]})

    if(existingRegistration.success && existingRegistration.data.length > 0){
        return { 
            success: false, 
            data: {}, 
            error: { 
                code: 400, 
                message: 'Email is already registered.' 
            } 
        }
    }

    const token = generateInviteToken();

    const expiry = addMinutes(new Date(), 60 * 24 * 1); // 1 days expiration
    
    const insertToken = await insertInviteToken(token, email, Number(agentData.data.DivisionID), agentData.data.AgentID, expiry);

    const template = emailInviteTemplate(`${agentData.data.FirstName} ${agentData.data.LastName}` , process.env.FRONTEND_DOMAIN || 'localhost:3000', token)

    const sendMail = await sendTemplateEmail(`Recipient <${email}>`, "You're invited to join RCD Realty Marketing Corp.", '', template)

    console.log(sendMail)

    if(sendMail.data.succeeded == 0){
        return { success: false, data: {}, error: { code: 500, message: 'Failed to send invite email.' } }
    }    

    return { success: true, data: { inviteToken: token } } 
}

export const getInviteTokenDetailsService = async (token: string): QueryResult<Partial<IInviteTokens> & { AgentID: number, Division: string, FirstName: string, MiddleName: string, LastName: string}> => {

    console.log('getInviteTokenDetailsService', token)
    const tokenDetails = await findInviteToken({inviteToken: token})

    console.log('tokenDetails', tokenDetails)
    if(!tokenDetails.success || tokenDetails.data.length === 0){
        return { 
            success: false, 
            data: {} as Partial<IInviteTokens> & { AgentID: number, Division: string, FirstName: string, MiddleName: string, LastName: string},
            error: { 
                code: tokenDetails.data.length === 0 ? 404 : 500, 
                message: 'Token not found or may have already expired.' 
            } 
        }
    }

    return {
        success: true,
        data: {
            Email: tokenDetails.data[0].Email,
            ExpiryDate: tokenDetails.data[0].ExpiryDate,
            DivisionID: tokenDetails.data[0].DivisionID,
            AgentID: tokenDetails.data[0].LinkedUserID,
            Division: tokenDetails.data[0].Division,
            FirstName: tokenDetails.data[0].FirstName,
            MiddleName: tokenDetails.data[0].MiddleName,
            LastName: tokenDetails.data[0].LastName,
        }
    }
}

export const registerAgentService = async (
    data: IAgentRegister, 
    image?: Express.Multer.File,
    govIdImage?: Express.Multer.File,
    selfieImage?: Express.Multer.File,
    agentId?: number
): QueryResult<any> => {

    if(agentId){
        const agent = await findAgentDetailsByAgentId(agentId)

        if(!agent.success){
            return {
                success: false,
                data: {},
                error: {
                    code: 500,
                    message: 'Failed to find agent details.'
                }
            }
        }
    }

    const filename = `${data.lastName}-${data.firstName}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    const govIdFilename = `${data.lastName}-${data.firstName}-govid_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    const selfieFilename = `${data.lastName}-${data.firstName}-selfie_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();

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

    let govIdMetadata: IImage | undefined = undefined
    if(govIdImage)(
        govIdMetadata = {
            FileName: govIdFilename,
            ContentType: govIdImage.mimetype,
            FileExt: path.extname(govIdImage.originalname),
            FileSize: govIdImage.size,
            FileContent: govIdImage.buffer
        }
    )
    
    let selfieMetadata: IImage | undefined = undefined
    if(selfieImage)(
        selfieMetadata = {
            FileName: selfieFilename,
            ContentType: selfieImage.mimetype,
            FileExt: path.extname(selfieImage.originalname),
            FileSize: selfieImage.size,
            FileContent: selfieImage.buffer
        }
    )

    const result = await registerAgentTransaction(data, metadata, govIdMetadata, selfieMetadata, agentId)

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

export const registerInviteService = async (
    inviteToken: string,
    data: IAgentInvite
): QueryResult<any> => {

    const tokenDetails = await getInviteTokenDetailsService(inviteToken)

    if(!tokenDetails.success || tokenDetails.data.IsUsed == 1){
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: 'Token is invalid, expired, or already used.'
            }
        }
    }

    if(tokenDetails.data.Email != data.email){
        console.log(tokenDetails.data)
        console.log(tokenDetails.data.Email, data.email)
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: 'Email does not match with invited email.'
            }
        }
    }

    const referringAgent = await findAgentDetailsByAgentId(tokenDetails.data.AgentID)

    if(!referringAgent.success){
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: 'Failed to find referring agent details.'
            }
        }
    }

    data.referredById = referringAgent.data.AgentID
    data.referredCode = referringAgent.data.AgentCode
    data.divisionId = tokenDetails.data.DivisionID

    const obj: IAgentRegister = {
        ...data,
        education: [],
        experience: []
    }   

    const result = await registerAgentTransaction(obj)

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

    const updateIsUsed = await updateInviteToken(inviteToken, { IsUsed: 1 })

    return result
}

export const loginAgentService = async (email: string, password: string): QueryResult<{token: string, email: string, position: string, division: number | undefined}> => {
    const user = await findAgentUserByEmail(email)

    if(!user.success) {
        logger((user.error?.message || 'Failed to find user.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string, position: string, division: number},
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
            data: {} as {token: string, email: string, position: string, division: number},
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
            data: {} as {token: string, email: string, position: string, division: number},
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
            data: {} as {token: string, email: string, position: string, division: number},
            error: {
                message: 'Failed to create session.',
                code: 500
            }
        }
    }

    const agentDetails = await findAgentDetailsByUserId(user.data.agentUserId)

    if(!agentDetails.success) {
        logger(( agentDetails.error?.message || 'Failed to find agent details.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string, position: string, division: number},
            error: {
                message: 'Failed to find agent details.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {
            token: token,
            email: email,
            position: agentDetails.data.Position || '',
            division: Number(agentDetails.data.DivisionID) || undefined,
        }
    }
}

export const registerBrokerService = async (
    data: IBrokerRegister, 
    brokerType: "hands-on" | "hands-off",
    image?: Express.Multer.File,
    govIdImage?: Express.Multer.File,
    selfieImage?: Express.Multer.File,
    //agentId?: number
): QueryResult<any> => {

    const filename = `${data.lastName}-${data.firstName}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    const govIdFilename = `${data.lastName}-${data.firstName}-govid_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    const selfieFilename = `${data.lastName}-${data.firstName}-selfie_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();

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

    let govIdMetadata: IImage | undefined = undefined
    if(govIdImage)(
        govIdMetadata = {
            FileName: govIdFilename,
            ContentType: govIdImage.mimetype,
            FileExt: path.extname(govIdImage.originalname),
            FileSize: govIdImage.size,
            FileContent: govIdImage.buffer
        }
    )
    
    let selfieMetadata: IImage | undefined = undefined
    if(selfieImage)(
        selfieMetadata = {
            FileName: selfieFilename,
            ContentType: selfieImage.mimetype,
            FileExt: path.extname(selfieImage.originalname),
            FileSize: selfieImage.size,
            FileContent: selfieImage.buffer
        }
    )

    // check email availability
    const [
        agentEmailCheck,
        brokerEmailCheck
    ] = await Promise.all([
        findAgentUserByEmail(data.email),
        findBrokerUserByEmail(data.email)
    ])

    console.log(agentEmailCheck, brokerEmailCheck)

    if(agentEmailCheck.success || brokerEmailCheck.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Email already exists.',
                code: 400
            }
        }
    }

    let result: ITblBrokerRegistration | ITblAgentRegistration | undefined = undefined 

    if(brokerType == "hands-on"){

        // get position id for broker
        const brokerPosition = await getPositions({positionName: "BROKER"})

        const mappedData = {
            ...data,
            positionId: brokerPosition.data[0].PositionID ? brokerPosition.data[0].PositionID : 76
        }

        const response = await registerAgentTransaction(mappedData, metadata, govIdMetadata, selfieMetadata, undefined)

        if(!response.success) {
            return {
                success: false,
                data: {},
                error: {
                    message: response.error?.message || 'Failed to register hands-on broker.',
                    code: response.error?.code || 500 
                }
            }
        }

        result = response.data

    } else {
        const response = await registerBrokerTransaction(data, metadata, govIdMetadata, selfieMetadata, undefined)
        
        if(!response.success) {
            return {
                success: false,
                data: {},
                error: {
                    message: response.error?.message || 'Failed to register hands-off broker.',
                    code: response.error?.code || 500 
                }
            }
        }

        result = response.data
    }

    if(!result) {
        return {
            success: false,
            data: {},
            error: {
                message: 'Failed to register broker.',
                code: 500 
            }
        }
    }

    return {
        success: true,
        data: result
    }
}

// export const loginBrokerService = async (email: string, password: string): QueryResult<{token: string, email: string, position: string}> => {

//     const [
//         agentUser,
//         brokerUser
//     ] = await Promise.all([
//         findAgentUserByEmail(email),
//         findBrokerUserByEmail(email)
//     ])

//     if(!agentUser.success && !brokerUser.success){
//         return {
//             success: false,
//             data: {} as {token: string, email: string, position: string},
//             error: {
//                 message: 'Invalid credentials.',
//                 code: 400
//             }
//         }
//     }

//     let storedPassword = ''

//     if(agentUser.success){
//         const user = await findAgentUserByEmail(email)

//         if(!user.success) {
//             logger((user.error?.message || 'Failed to find user.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }

//         if(!user.data.isVerified){
//             logger(('User is not verified.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }

//         const positionCheck = await findAgentDetailsByUserId(user.data.agentUserId)

//         if(!positionCheck.success) {
//             logger((positionCheck.error?.message || 'Failed to find agent details.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }
        
//         if(positionCheck.data.Position?.toLowerCase().includes('broker') == false){
//             logger(('User is not a broker.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }

//         storedPassword = user.data.password
//     } else {
//         const user = await findBrokerUserByEmail(email)

//         if(!user.success) {
//             logger((user.error?.message || 'Failed to find user.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }

//         if(!user.data.isVerified){
//             logger(('User is not verified.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Invalid credentials.',
//                     code: 400
//                 }
//             }
//         }

//         storedPassword = user.data.password
//     }

    

//     // compare passwords
//     //const storedPw = user.data.password
//     const compare = await verifyPassword(password, storedPassword)
//     const userId = agentUser.success ? agentUser.data.agentUserId : brokerUser.data.brokerUserId

//     if(!compare){
//         logger(('Password does not match.'), {email: email})
//         return {
//             success: false,
//             data: {} as {token: string, email: string, position: string},
//             error: {
//                 message: 'Invalid credentials.',
//                 code: 400
//             }
//         }
//     }

//     const token = generateSessionToken()
//     if(agentUser.success){
//         const session = await createSession(token, userId)

//         if(!session.success) {
//             logger(( session.error?.message || 'Failed to create session.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Failed to create session.',
//                     code: 500
//                 }
//             }
//         }
//     }
//     else {
//         const session = await createBrokerSession(token, userId)

//         if(!session.success) {
//             logger(( session.error?.message || 'Failed to create session.'), {email: email})
//             return {
//                 success: false,
//                 data: {} as {token: string, email: string, position: string},
//                 error: {
//                     message: 'Failed to create session.',
//                     code: 500
//                 }
//             }
//         }
//     }

//     return {
//         success: true,
//         data: {
//             token: token,
//             email: email,
//             position: agentUser.success ? 'HANDS-ON BROKER' : 'HANDS-OFF BROKER'
//         }
//     }
// }

export const loginBrokerService = async (email: string, password: string): QueryResult<{token: string, email: string, position: string}> => {

    const brokerUser = await findBrokerUserByEmail(email)

    if(!brokerUser.success){
        return {
            success: false,
            data: {} as {token: string, email: string, position: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    let storedPassword = ''

    const user = await findBrokerUserByEmail(email)

    if(!user.success) {
        logger((user.error?.message || 'Failed to find user.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string, position: string},
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
            data: {} as {token: string, email: string, position: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    storedPassword = user.data.password

    const compare = await verifyPassword(password, storedPassword)
    const userId = brokerUser.data.brokerUserId

    if(!compare){
        logger(('Password does not match.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string, position: string},
            error: {
                message: 'Invalid credentials.',
                code: 400
            }
        }
    }

    const token = generateSessionToken()
    const session = await createBrokerSession(token, userId)

    if(!session.success) {
        logger(( session.error?.message || 'Failed to create session.'), {email: email})
        return {
            success: false,
            data: {} as {token: string, email: string, position: string},
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
            email: email,
            position: 'HANDS-OFF BROKER'
        }
    }
}

export const registerEmployeeService = async (data: IEmployeeRegister): QueryResult<any> => {

    const branchName = await getSalesBranch(data.BranchID)

    if(!branchName.success){
        return {
            success: false,
            data: {},
            error: {
                message: branchName.error?.message || 'Invalid branch.',
                code: branchName.error?.code || 400

            }
        }
    }

    if(!branchName.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'Invalid branch.',
                code: 400
            }
        }
    }

    data.BranchName = branchName.data?.BranchName || ''

    const result = await registerEmployee(data)

    if(!result.success) {
        return {
            success: false,
            data: {},
            error: {
                message: result.error?.message || 'Failed to register employee.',
                code: result.error?.code || 500 
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const loginEmployeeService = async (username: string, password: string): QueryResult<{token: string, username: string, role: string, branchId: number}> => {
    const user = await findEmployeeUserByUsername(username)

    if(!user.success) {
        logger((user.error?.message || 'Failed to find user.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string, role: string, branchId: number},
            error: {
                message: 'Invalid credentials.',
                code: 401
            }
        }
    }

    // compare passwords
    // const checkPw = await verifyDESPassword(password, user.data.password, DES_KEY)

    const checkPw = await verifyPassword(password, user.data.password)

    if(!checkPw){
        logger(('Password does not match.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string, role: string, branchId: number},
            error: {
                message: 'Invalid credentials.',
                code: 401
            }
        }
    }

    const token = generateSessionToken()
    const session = await createEmployeeSession(token, user.data.userId)

    if(!session.success) {
        logger(( session.error?.message || 'Failed to create session.'), {username: username})
        return {
            success: false,
            data: {} as {token: string, username: string, role: string, branchId: number},
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
            username: username,
            role: user.data.role,
            branchId: user.data.branchId
        }
    }    
}

export const approveInviteRegistrationService = async (userId: number, inviteToken: string): QueryResult<ITblAgentRegistration> => {

    const tokenDetails = await findInviteToken({inviteToken: inviteToken, showUsed: true, showExpired: true})

    if(!tokenDetails.success || tokenDetails.data.length === 0){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: tokenDetails.error?.message || 'Failed to get invite token details.',
                code: tokenDetails.error?.code || 500
            }
        }
    }

    const umAgent = await findAgentDetailsByUserId(userId)

    if(!umAgent.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: umAgent.error?.message || 'Failed to get agent details.',
                code: umAgent.error?.code || 500
            }
        }
    }

    if(tokenDetails.data[0].LinkedUserID !== umAgent.data.AgentID){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: 'Invite token does not belong to the provided user ID.',
                code: 400
            }
        }
    }

    const agentUser = await getAgentUsers({ emails: [tokenDetails.data[0].Email] })

    if(!agentUser.success || agentUser.data.length === 0){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: 'Agent user not found for the provided invite token.',
                code: 404
            }
        }
    }

    console.log(agentUser.data[0])

    const registration = await getAgentRegistration({ agentRegistrationId: agentUser.data[0].AgentRegistrationID || 0 })

    if(!registration.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: registration.error?.message || 'Failed to get agent registration.',
                code: registration.error?.code || 500
            }
        }
    }

    const approve = await editAgentRegistration({ agentId: umAgent.data.AgentID }, registration.data.AgentRegistrationID,  { IsVerified: 1 })

    if(!approve.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: approve.error?.message || 'Failed to approve agent registration.',
                code: approve.error?.code || 500
            }
        }
    }

    return {
        success: true,
        data: approve.data
    }
}

export const rejectInviteRegistrationService = async (userId: number, inviteToken: string): QueryResult<null | ITblAgentRegistration> => {
    const tokenDetails = await findInviteToken({inviteToken: inviteToken, showUsed: true, showExpired: true})

    if(!tokenDetails.success || tokenDetails.data.length === 0){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: tokenDetails.error?.message || 'Failed to get invite token details.',
                code: tokenDetails.error?.code || 500
            }
        }
    }

    const umAgent = await findAgentDetailsByUserId(userId)

    if(!umAgent.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: umAgent.error?.message || 'Failed to get agent details.',
                code: umAgent.error?.code || 500
            }
        }
    }

    if(tokenDetails.data[0].LinkedUserID !== umAgent.data.AgentID){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: 'Invite token does not belong to the provided user ID.',
                code: 400
            }
        }
    }

    const agentUser = await getAgentUsers({ emails: [tokenDetails.data[0].Email] })

    if(!agentUser.success || agentUser.data.length === 0){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: 'Agent user not found for the provided invite token.',
                code: 404
            }
        }
    }

    console.log(agentUser.data[0])

    const registration = await getAgentRegistration({ agentRegistrationId: agentUser.data[0].AgentRegistrationID || 0 })

    if(!registration.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: registration.error?.message || 'Failed to get agent registration.',
                code: registration.error?.code || 500
            }
        }
    }

    const reject = await deleteInviteRegistrationTransaction(registration.data.AgentRegistrationID, inviteToken, agentUser.data[0].AgentUserID)

    if(!reject.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                message: reject.error?.message || 'Failed to reject agent registration.',
                code: reject.error?.code || 500
            }
        }
    }

    return {
        success: true,
        data: reject.data
    }
}

export const approveAgentRegistrationService = async (agentRegistrationId: number, agentId?: number) => {

    if(agentId){
        const checkAgentUsers = await getTblAgentUsers({agentIds: [agentId]})

        if(!checkAgentUsers.success){
            logger((checkAgentUsers.error?.message || 'Failed to check agent ID.'), {agentId: agentId})
            return {
                success: false,
                data: {} as {token: string, email: string},
                error: {
                    message: 'Failed to check agent ID. \n' + checkAgentUsers.error?.message,
                    code: 500
                }
            }
        }

        if(checkAgentUsers.success && checkAgentUsers.data.length > 0){
            return {
                success: false,
                data: {} as {token: string, email: string},
                error: {
                    message: 'Agent already has a mobile account.',
                    code: 400
                }
            }
        }

    }


    const result = await approveAgentRegistrationTransaction(agentRegistrationId, agentId)

    if(!result.success){
        logger((result.error?.message || 'Failed to approve agent registration.'), {agentRegistrationId: agentRegistrationId, agentId: agentId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: result.error?.message || 'Failed to approve agent registration.',
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

export const approveBrokerRegistrationService = async (brokerRegistrationId: number, brokerId?: number) => {

    if(brokerId){
        const checkBroker = await getBrokerUsers({brokerIds: [brokerId]})

        if(!checkBroker.success){
            logger((checkBroker.error?.message || 'Failed to check broker ID.'), {brokerId: brokerId})
            return {
                success: false,
                data: {} as {token: string, email: string},
                error: {
                    message: 'Failed to check broker ID. \n' + checkBroker.error?.message,
                    code: 500
                }
            }
        }

        if(checkBroker.success && checkBroker.data.length > 0){
            return {
                success: false,
                data: {} as {token: string, email: string},
                error: {
                    message: 'Broker already has a mobile account.',
                    code: 400
                }
            }
        }
    }

    const result = await approveBrokerRegistrationTransaction(brokerRegistrationId, brokerId)

    if(!result.success){
        logger((result.error?.message || 'Failed to approve broker registration.'), {brokerRegistrationId: brokerRegistrationId, brokerId: brokerId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: result.error?.message || 'Failed to approve broker registration.',
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

export const rejectAgentRegistrationService = async (agentRegistrationId: number) => {

    // validations
    const agentRegistration = await findAgentRegistrationById(agentRegistrationId)

    if(!agentRegistration.success){
        logger((agentRegistration.error?.message || 'Failed to find agent registration.'), {agentRegistrationId: agentRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: agentRegistration.error?.message || 'Failed to find agent registration.',
                code: 404
            }
        }
    }

    if(agentRegistration.data.IsVerified !== 0){
        logger(('Agent registration is already processed.'), {agentRegistrationId: agentRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Agent registration is already processed.',
                code: 400
            }
        }
    }

    const result = await rejectAgentRegistration(agentRegistrationId)

    if(!result.success){
        logger((result.error?.message || 'Failed to reject agent registration.'), {agentRegistrationId: agentRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: result.error?.message || 'Failed to reject agent registration.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {}
    }
}

export const rejectBrokerRegistrationService = async (brokerRegistrationId: number) => {

    // validations
    const brokerRegistration = await findBrokerRegistrationById(brokerRegistrationId)

    if(!brokerRegistration.success){
        logger((brokerRegistration.error?.message || 'Failed to find broker registration.'), {brokerRegistrationId: brokerRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: brokerRegistration.error?.message || 'Failed to find broker registration.',
                code: 404
            }
        }
    }

    if(brokerRegistration.data.IsVerified !== 0){
        logger(('Broker registration is already processed.'), {brokerRegistrationId: brokerRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: 'Broker registration is already processed.',
                code: 400
            }
        }
    }

    const result = await rejectBrokerRegistration(brokerRegistrationId)

    if(!result.success){
        logger((result.error?.message || 'Failed to reject broker registration.'), {brokerRegistrationId: brokerRegistrationId})
        return {
            success: false,
            data: {} as {token: string, email: string},
            error: {
                message: result.error?.message || 'Failed to reject broker registration.',
                code: 500
            }
        }
    }

    return {
        success: true,
        data: {}
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

export const logoutBrokerSessionService = async(sessionId: number): QueryResult<any> => {
    const result = await deleteBrokerSession(sessionId)

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

export const changeEmployeePasswordService = async (userId: number, oldPassword: string, newPassword: string): QueryResult<any> => {
    const user = await findEmployeeUserById(userId)

    if(!user.success){
        logger('Failed to find user.', {userId: userId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 404
            }
        }
    }

    // check if old password matches
    const checkOldPassword = await verifyPassword(oldPassword, user.data.Password)

    if(!checkOldPassword) {
        logger('Old password does not match.', {userId: userId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Old password does not match.',
                code: 400
            }
        }
    }

    const hash = await hashPassword(newPassword)

    const updatePassword = await changeEmployeePassword(user.data.UserWebID, hash)

    if(!updatePassword.success){
        logger('Failed to update password.', {userId: userId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to update password.',
                code: 500
            }
        }
    }

    // delete sessions

    const deleteSessions = await deleteEmployeeAllSessions(userId)

    return {
        success: true,
        data: {}
    }
}

export const changeEmployeePasswordAdminService = async (userId: number, employeeUserId: number, newPassword: string): QueryResult<any> => {
    const user = await findEmployeeUserById(employeeUserId)

    if(!user.success){
        logger('Failed to find user.', {userId: employeeUserId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 404
            }
        }
    }

    const hash = await hashPassword(newPassword)

    const updatePassword = await changeEmployeePassword(user.data.UserWebID, hash)

    if(!updatePassword.success){
        logger('Failed to update password.', {userId: userId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to update password.',
                code: 500
            }
        }
    }

    // delete sessions

    const deleteSessions = await deleteEmployeeAllSessions(employeeUserId)

    return {
        success: true,
        data: {}
    }
}

export const changeAgentUserPasswordAdminService = async (userId: number, agentUserId: number, newPassword: string): QueryResult<any> => {
    const agentUser = await findAgentUserById(agentUserId)

    if(!agentUser.success){
        logger('Failed to find user.', {userId: agentUserId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 404
            }
        }
    }

    const hash = await hashPassword(newPassword)

    const updatePassword = await changePassword(agentUser.data.agentUserId, hash)

    if(!updatePassword.success){
        logger('Failed to update password.', {userId: userId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to update password.',
                code: 500
            }
        }
    }

    // delete sessions

    const deleteSessionsAgent = await deleteSessionUser(agentUser.data.agentUserId)

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
    const send = sendMail(findEmail.data.Email, 'Password OTP', emailOTPTemplate(code, minuteExpiry))
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

export const changePasswordService = async (email: string, resetToken: string, oldPassword: string, newPassword: string, forgotPass?: boolean): QueryResult<any> => {
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
    if(!forgotPass){
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

    const send = sendMail(user.data.email, 'Password Changed', emailChangePasswordTemplate(date, time))
    const spare = sendMail('wendell.ravago@linoflaptech.com', 'Password Changed', emailChangePasswordTemplate(date, time))

    return {    
        success: true,
        data: null
    }
}