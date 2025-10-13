import { QueryResult } from "../types/global.types";
import { TblAgentRegistration, TblAgents, TblAgentSession, TblUsersWeb } from "../db/db-types";
import { db } from "../db/db";
import { IAgentRegister, IAgentSession, IAgentUser, IAgentUserSession, IEmployeeRegister, IEmployeeSession, IEmployeeUserSession, ITblUsersWeb, Token } from "../types/auth.types";
import { IImage } from "../types/image.types";
import { profile } from "console";
import { hashPassword } from "../utils/scrypt";
import { logger } from "../utils/logger";
import { IAgent } from "../types/users.types";
import { IAgentRegistration } from "../types/agent.types";

// Agent Sessions

export const insertSession =  async (sessionString: string, agentUserId: number): QueryResult<IAgentSession> => {
    try {
        const result = await db.insertInto('Tbl_AgentSession').values({
            SessionString: sessionString,
            AgentUserID: agentUserId,
            ExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }).outputAll('inserted').executeTakeFirstOrThrow();

        if(!result) return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: 'Failed to insert session.',
                code: 500
            }
        }

        const find = await db.selectFrom('Tbl_AgentSession').where('SessionID', '=', Number(result.SessionID)).selectAll().executeTakeFirst();

        if(!find) return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                SessionID: find.SessionID,
                SessionString: find.SessionString,
                AgentUserID: find.AgentUserID,
                ExpiresAt: find.ExpiresAt
            }
        }
    }
    catch(err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const findSession = async (sessionString: string): QueryResult<IAgentUserSession> => {
    try {

        const result = await db.
            selectFrom('Tbl_AgentSession').
            where('SessionString', '=', sessionString).
            innerJoin('Tbl_AgentUser', 'Tbl_AgentSession.AgentUserID', 'Tbl_AgentUser.AgentUserID').
            innerJoin('Vw_Agents', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID').
            selectAll().
            executeTakeFirst();

        if(!result) return {
            success: false,
            data: {} as IAgentUserSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                AgentSession: {
                    SessionID: result.SessionID,
                    SessionString: result.SessionString,
                    AgentUserID: result.AgentUserID,
                    ExpiresAt: result.ExpiresAt
                },
                AgentUser: {
                    AgentID: result.AgentID,
                    AgentRegistrationID: result.AgentRegistrationID,
                    AgentUserID: result.AgentUserID,
                    Email: result.Email,
                    ImageID: result.ImageID,
                    IsVerified: result.IsVerified,
                    Position: result.Position || ''
                }
            }
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentUserSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const deleteSession = async (sessionId: number): QueryResult<null> => {
    try {

        const result = await db.deleteFrom('Tbl_AgentSession').where('SessionID', '=', sessionId).executeTakeFirst();

        return {
            success: true,
            data: null,
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteSessionUser = async (userId: number): QueryResult<null> => {
    try {

        const result = await db.deleteFrom('Tbl_AgentSession').where('AgentUserID', '=', userId).execute();

        console.log(result)

        return {
            success: true,
            data: null,
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const extendSessionExpiry = async (sessionId: number, expiry: Date): QueryResult<null> => {
    try {

        const result = await db.updateTable('Tbl_AgentSession').set({ ExpiresAt: expiry }).where('SessionID', '=', sessionId).executeTakeFirstOrThrow();

        return {
            success: true,
            data: null,
        }

    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// Employee Sessions

export const insertEmployeeSession =  async (sessionString: string, userId: number): QueryResult<IEmployeeSession> => {
    try {
        const result = await db.insertInto('Tbl_UserWebSession').values({
            SessionString: sessionString,
            UserID: userId,
            ExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }).outputAll('inserted').executeTakeFirstOrThrow();

        if(!result) return {
            success: false,
            data: {} as IEmployeeSession,
            error: {
                message: 'Failed to insert session.',
                code: 500
            }
        }

        const find = await db.selectFrom('Tbl_UserWebSession').where('SessionID', '=', Number(result.SessionID)).selectAll().executeTakeFirst();

        if(!find) return {
            success: false,
            data: {} as IEmployeeSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                SessionID: find.SessionID,
                SessionString: find.SessionString,
                UserID: find.UserID,
                ExpiresAt: find.ExpiresAt
            }
        }
    }
    catch(err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IEmployeeSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const findEmployeeSession = async (sessionString: string): QueryResult<IEmployeeUserSession> => {
    try {

        const result = await db.
            selectFrom('Tbl_UserWebSession').
            innerJoin('Tbl_UsersWeb', 'Tbl_UsersWeb.UserWebID', 'Tbl_UserWebSession.UserID').
            where('SessionString', '=', sessionString).
            selectAll().
            executeTakeFirst();

        if(!result) return {
            success: false,
            data: {} as IEmployeeUserSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                EmployeeSession: {
                    SessionID: result.SessionID,
                    SessionString: result.SessionString,
                    UserID: result.UserID,
                    ExpiresAt: result.ExpiresAt
                },
                EmployeeUser: {
                    UserID: result.UserID,
                    UserName: result.UserName,
                    EmpName: result.EmpName,
                    Role: result.Role,
                    BranchName: result.BranchName
                }
            }
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IEmployeeUserSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const deleteEmployeeSession = async (sessionId: number): QueryResult<null> => {
    try {

        const result = await db.deleteFrom('Tbl_UserWebSession').where('SessionID', '=', sessionId).executeTakeFirst();

        return {
            success: true,
            data: null,
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const extendEmployeeSessionExpiry = async (sessionId: number, expiry: Date): QueryResult<null> => {
    try {

        const result = await db.updateTable('Tbl_UserWebSession').set({ ExpiresAt: expiry }).where('SessionID', '=', sessionId).executeTakeFirstOrThrow();

        return {
            success: true,
            data: null,
        }

    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}


export const registerAgentTransaction = async(
    data: IAgentRegister, 
    profileImageMetadata?: IImage, 
    govIdImageMetadata?: IImage,
    selfieImageMetadata?: IImage
): QueryResult<any> => {

    const registerTransaction = await db.startTransaction().execute();

    try {

        // insert into image
        let imageId = -1;
        if(profileImageMetadata){
            const agentImage = await registerTransaction.insertInto('Tbl_Image').values({
                Filename: profileImageMetadata.FileName,
                ContentType: profileImageMetadata.ContentType,
                FileExtension: profileImageMetadata.FileExt,
                FileSize: profileImageMetadata.FileSize,
                FileContent: profileImageMetadata.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            imageId = agentImage.ImageID
        }

        let govImageId = -1
        if(govIdImageMetadata){
            const govImage = await registerTransaction.insertInto('Tbl_Image').values({
                Filename: govIdImageMetadata.FileName,
                ContentType: govIdImageMetadata.ContentType,
                FileExtension: govIdImageMetadata.FileExt,
                FileSize: govIdImageMetadata.FileSize,
                FileContent: govIdImageMetadata.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            govImageId = govImage.ImageID
        }

        let selfieImageId = -1
        if(selfieImageMetadata){
            const selfieImage = await registerTransaction.insertInto('Tbl_Image').values({
                Filename: selfieImageMetadata.FileName,
                ContentType: selfieImageMetadata.ContentType,
                FileExtension: selfieImageMetadata.FileExt,
                FileSize: selfieImageMetadata.FileSize,
                FileContent: selfieImageMetadata.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            selfieImageId = selfieImage.ImageID
        }

        // insert into agent registration
        const agentRegistration = await registerTransaction.insertInto('Tbl_AgentRegistration').values({
            AgentCode: '',
            LastName: data.lastName,
            FirstName: data.firstName,
            MiddleName: data.middleName ?? '',
            ContactNumber: data.contactNumber,
            AgentTaxRate: 5,
            CivilStatus: data.civilStatus,
            Sex: data.gender,
            Address: data.address,
            Birthdate: data.birthdate,
            Birthplace: data.birthplace ?? '',
            Religion: data.religion ?? '',
            PhilhealthNumber: data.philhealthNumber ?? '',
            SSSNumber: data.sssNumber ?? '',
            PagIbigNumber: data.pagibigNumber ?? '',
            TINNumber: data.tinNumber ?? '',
            PRCNumber: data.prcNumber ?? '',
            DSHUDNumber: data.dshudNumber ?? '',
            EmployeeIDNumber: data.employeeIdNumber ?? '',
            PersonEmergency: '',
            ContactEmergency: '',
            AddressEmergency: '',
            AffiliationDate: new Date(),
            GovImageID: govImageId > 0 ? govImageId : null,
            SelfieImageID: selfieImageId > 0 ? selfieImageId : null,
        }).outputAll('inserted').executeTakeFirstOrThrow();

        // insert into work exp
        if(data.experience && data.experience.length > 0) {
            const agentWork = await registerTransaction.insertInto('Tbl_AgentWorkExp').values(
                data.experience.map((exp: any) => ({
                    Company: exp.company,
                    JobTitle: exp.jobTitle,
                    StartDate: exp.startDate,
                    EndDate: exp.endDate,
                    AgentRegistrationID: agentRegistration.AgentRegistrationID
                }))
            ).execute()
        }

        // insert into educ
        if(data.education && data.education.length > 0) {
            const agentEduc = await registerTransaction.insertInto('Tbl_AgentEducation').values(
                data.education.map((educ: any) => ({
                    School: educ.school,
                    Degree: educ.degree,
                    StartDate: educ.startDate,
                    EndDate: educ.endDate,
                    AgentRegistrationID: agentRegistration.AgentRegistrationID
                }))
            ).execute()
        }

        
        // insert into Agent User

        const hash = await hashPassword(data.password);

        const agentUser = await registerTransaction.insertInto('Tbl_AgentUser').values({
            AgentRegistrationID: agentRegistration.AgentRegistrationID,
            Email: data.email,
            Password: hash,
            ImageID: imageId > 0 ? imageId : null
        }).executeTakeFirstOrThrow();

        await registerTransaction.commit().execute();

        return {
            success: true,
            data: agentRegistration
        }
    }
    catch (err: unknown) {

        await registerTransaction.rollback().execute();
        const error = err as Error;

        let message = error.message
        let code = 500
        console.log(error.message)
        console.log(error.message.includes('IX_Tbl_AgentUser_Email') && error.message.includes('Tbl_AgentUser'))
        if(error.message.includes('IX_Tbl_AgentUser_Email') && error.message.includes('Tbl_AgentUser')){
            message = 'Email already exists.'
            code = 401
        }


        return {
            success: false,
            data: null,
            error: {
                code: code,
                message: message
            }
        }
    }
}

export const findAgentRegistrationById = async(agentRegistrationId: number): QueryResult<IAgentRegistration> => {
    try {
        const result = await db.selectFrom('Tbl_AgentRegistration')
            .where('AgentRegistrationID', '=', agentRegistrationId)
            .selectAll()
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }

    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const approveAgentRegistrationTransaction = async(agentRegistrationId: number, agentId?: number): QueryResult<IAgentUser> => {
    try {

        // get all relevant data
        const [registration] = await Promise.all([
            db.selectFrom('Tbl_AgentRegistration')
                .where('AgentRegistrationID', '=', agentRegistrationId)
                .where('IsVerified', '=', 0)
                .selectAll()
                .executeTakeFirstOrThrow(),
            
        ]);

        if(!registration) {
            logger(
                'Failed to find agent registration or agent user account. Target registration may already be verified.', 
                {
                    agentRegistrationId: agentRegistrationId, 
                    agentId: agentId
                }
            );
            return {
                success: false,
                data: {} as IAgentUser,
                error: {
                    code: 500,
                    message: 'Failed to find agent registration or agent user account. Target registration may already be verified.'
                }
            }
        }

        let agentData: IAgent | undefined = undefined
        if(agentId){
            // prepare data for linking
            const findAgent = await db.selectFrom('Tbl_Agents').where('AgentID', '=', agentId).selectAll().executeTakeFirstOrThrow();
            if(!findAgent){
                logger('Failed to find agent registration, agent user account, or agent data.', {agentRegistrationId: agentRegistrationId, agentId: agentId});
                return {
                    success: false,
                    data: {} as IAgentUser,
                    error: {
                        code: 500,
                        message: 'Failed to find agent data.'
                    }
                }
            }
            agentData = {
                ...findAgent,
                AgentID: Number(findAgent.AgentID)
            }
        }

        const trx = await db.startTransaction().execute();

        let agentIdInserted = 0;
        try {
            if(agentData){
                // link existing agent to agent tables
                const updateAgentUser = await trx.updateTable('Tbl_AgentUser')
                                            .set('IsVerified', 1)
                                            .set('AgentID', Number(agentData.AgentID))
                                            .where('AgentRegistrationID', '=', agentRegistrationId)
                                            .executeTakeFirstOrThrow();

                const updateAgentEducation = await trx.updateTable('Tbl_AgentEducation')
                                                .set('AgentID', Number(agentData.AgentID))
                                                .where('AgentRegistrationID', '=', agentRegistrationId)
                                                .executeTakeFirstOrThrow()
                
                const updateAgentWorkExp = await trx.updateTable('Tbl_AgentWorkExp') 
                                                .set('AgentID', Number(agentData.AgentID))
                                                .where('AgentRegistrationID', '=', agentRegistrationId)
                                                .executeTakeFirstOrThrow()

                const updateAgentRegistration = await trx.updateTable('Tbl_AgentRegistration')
                                                    .set('IsVerified', 1)
                                                    .where('AgentRegistrationID', '=', agentRegistrationId)
                                                    .executeTakeFirstOrThrow();

                                                    
                // assign agent id
                agentIdInserted = Number(agentData.AgentID);
                console.log('Assigning agent id to existing row: ', agentIdInserted)
            }
            else {
                // push registration details to agents table

                // generate 6 digit number
                const generateAgentCode = (): string => {
                    const randomNumber = (Math.floor(Math.random() * 900000) + 100000).toString().padStart(6, '0');
                    return `0.${randomNumber}`;
                };

                const checkDuplicateAgentCode = async (agentCode: string): Promise<boolean> => {
                    const agent = await trx.selectFrom('Tbl_Agents')
                        .where('AgentCode', '=', agentCode)
                        .selectAll()
                        .executeTakeFirst();
                    return !!agent; // Returns true if agent exists, false otherwise
                };

                const getUniqueAgentCode = async (): Promise<string> => {
                    let agentCode: string;
                    do {
                        agentCode = generateAgentCode();
                    } while (await checkDuplicateAgentCode(agentCode));
                    return agentCode;
                };

                const uniqueCode = await getUniqueAgentCode();

                const insertAgent = await trx.insertInto('Tbl_Agents').values({
                    AgentCode: uniqueCode,
                    LastName: registration.LastName,
                    FirstName: registration.FirstName,
                    MiddleName: registration.MiddleName ?? '',
                    ContactNumber: registration.ContactNumber,
                    AgentTaxRate: 5,
                    CivilStatus: registration.CivilStatus,
                    Sex: registration.Sex,
                    Address: registration.Address,
                    Birthdate: registration.Birthdate,
                    Birthplace: registration.Birthplace ?? '',
                    Religion: registration.Religion ?? '',
                    PhilhealthNumber: registration.PhilhealthNumber ?? '',
                    SSSNumber: registration.SSSNumber ?? '',
                    PagIbigNumber: registration.PagIbigNumber ?? '',
                    TINNumber: registration.TINNumber ?? '',
                    PRCNumber: registration.PRCNumber ?? '',
                    DSHUDNumber: registration.DSHUDNumber ?? '',
                    EmployeeIDNumber: registration.EmployeeIDNumber ?? '',
                    PersonEmergency: '',
                    ContactEmergency: '',
                    AddressEmergency: '',
                    AffiliationDate: new Date(),

                    IsActive: 1,
                    LastUpdate: new Date(),
                    UpdateBy: 0
                })
                .output('inserted.AgentID')
                .executeTakeFirstOrThrow();
                
                // update related tables

                const updateAgentUser = await trx.updateTable('Tbl_AgentUser')
                                            .set('IsVerified', 1)
                                            .set('AgentID', Number(insertAgent.AgentID))
                                            .where('AgentRegistrationID', '=', agentRegistrationId)
                                            .executeTakeFirstOrThrow();

                const updateAgentEducation = await trx.updateTable('Tbl_AgentEducation')
                                                .set('AgentID', Number(insertAgent.AgentID))
                                                .where('AgentRegistrationID', '=', agentRegistrationId)
                                                .executeTakeFirstOrThrow()
                
                const updateAgentWorkExp = await trx.updateTable('Tbl_AgentWorkExp') 
                                                .set('AgentID', Number(insertAgent.AgentID))
                                                .where('AgentRegistrationID', '=', agentRegistrationId)
                                                .executeTakeFirstOrThrow()

                const updateAgentRegistration = await trx.updateTable('Tbl_AgentRegistration')
                                                    .set('IsVerified', 1)
                                                    .where('AgentRegistrationID', '=', agentRegistrationId)
                                                    .executeTakeFirstOrThrow();

                // assign new id
                agentIdInserted = insertAgent.AgentID;
                console.log('Assigning agentIdInserted from new row: ', agentIdInserted)
            }

            if(agentIdInserted > 0){

                console.log('agentIdInserted: ', agentIdInserted)
                await trx.commit().execute()

                const checkData = await db.selectFrom('Tbl_AgentUser')
                    .selectAll()
                    .where('Tbl_AgentUser.AgentRegistrationID', '=', registration.AgentRegistrationID)
                    .executeTakeFirst()

                console.log(checkData)
                
                const data = await db.selectFrom('Tbl_AgentUser')
                .innerJoin('Vw_Agents', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID')
                .where('Tbl_AgentUser.AgentID', '=', agentIdInserted)
                .select([
                    // From Tbl_AgentUser
                    'Tbl_AgentUser.AgentUserID',
                    'Tbl_AgentUser.Email',
                    'Tbl_AgentUser.Password',
                    'Tbl_AgentUser.ImageID',
                    'Tbl_AgentUser.AgentID',
                    'Tbl_AgentUser.AgentRegistrationID',
                    'Tbl_AgentUser.IsVerified',
                    
                    // From Vw_Agents
                    'Vw_Agents.AgentCode',
                    'Vw_Agents.LastName',
                    'Vw_Agents.FirstName',
                    'Vw_Agents.MiddleName',
                    'Vw_Agents.ContactNumber',
                    'Vw_Agents.DivisionID',
                    'Vw_Agents.AgentTaxRate',
                    'Vw_Agents.CivilStatus',
                    'Vw_Agents.Sex',
                    'Vw_Agents.Address',
                    'Vw_Agents.Birthdate',
                    'Vw_Agents.PositionID',
                    'Vw_Agents.ReferredByID',
                    'Vw_Agents.UpdateBy',
                    'Vw_Agents.LastUpdate',
                    'Vw_Agents.PRCNumber',
                    'Vw_Agents.DSHUDNumber',
                    'Vw_Agents.IsActive',
                    'Vw_Agents.ReferredCode',
                    'Vw_Agents.PersonEmergency',
                    'Vw_Agents.ContactEmergency',
                    'Vw_Agents.AddressEmergency',
                    'Vw_Agents.Division',
                    'Vw_Agents.Position',
                    'Vw_Agents.AgentTaxRateName',
                    'Vw_Agents.AgentName',
                    'Vw_Agents.ReferredName',
                    'Vw_Agents.DivisionCode'
                ])
                .executeTakeFirstOrThrow();

                return {
                    success: true,
                    data: {
                        AgentID: data.AgentID,
                        AgentRegistrationID: data.AgentRegistrationID,
                        AgentUserID: data.AgentUserID,
                        Email: data.Email,
                        ImageID: data.ImageID,
                        IsVerified: data.IsVerified,
                        Position: data.Position || ''
                    }
                }
            }

            else {
                throw new Error('AgentID not assigned properly.');
            }
        }

        catch(err: unknown){
            await trx.rollback().execute();
            const error = err as Error;
            return {
                success: false,
                data: {} as IAgentUser,
                error: {
                    code: 500,
                    message: error.message
                }
            }
        }

        return {
            success: false,
            data: {} as IAgentUser
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentUser,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const rejectAgentRegistration = async (agentRegistrationId: number): QueryResult<null> => {
    try {
        const result = await db.updateTable('Tbl_AgentRegistration')
            .set('IsVerified', 2)
            .where('AgentRegistrationID', '=', agentRegistrationId)
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: null
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const findUserOTP = async (userId: number, token: string): QueryResult<boolean> => {
    try {
        const result = await db.selectFrom('Tbl_Tokens')
            .where('Token', '=', token)
            .where('UserID', '=', userId)
            .selectAll()
            .executeTakeFirst()
        
        if(!result){
            return {
                success: false,
                data: false,
                error: {
                    code: 404,
                    message: 'Token not found.'
                }
            }
        }

        if(result.ValidUntil){
            if(result.ValidUntil < new Date()){
                return {
                    success: false,
                    data: false,
                    error: {
                        code: 400,
                        message: 'Token is expired.'
                    }
                }
            }
        }

        return {
            success: true,
            data: true
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: false,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const insertOTP = async (userId: number, token: string, expiry: Date): QueryResult<Token> => {
    try {
        const result = await db.insertInto('Tbl_Tokens')
            .values({
                Token: token,
                UserID: userId,
                ValidUntil: expiry
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()
        
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as Token,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteOTP = async (token: string): QueryResult<null> => {
    try {
        const result = await db.deleteFrom('Tbl_Tokens')
            .where('Token', '=', token)
            .executeTakeFirstOrThrow()
        
        return {
            success: true,
            data: null
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const registerEmployee = async (data: IEmployeeRegister): QueryResult<ITblUsersWeb> => {
    try {

        const hash = await hashPassword(data.Password)
        const result = await db.insertInto('Tbl_UsersWeb').values({
            UserCode: data.UserCode,
            UserName: data.UserName,
            Password: hash,
            EmpName: data.EmpName,
            Role: data.Role,
            BranchName: data.BranchName || '',
            BranchID: data.BranchID
        })
        .outputAll('inserted')
        .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as ITblUsersWeb,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const findAgentEmail = async (email: string): QueryResult<IAgentUser> => {
    try {
        const result = await db.selectFrom('Tbl_AgentUser')
            .innerJoin('Vw_Agents', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID')
            .where('Email', '=', email)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        return {
            success: true,
            data: {
                AgentID: result.AgentID,
                AgentRegistrationID: result.AgentRegistrationID,
                AgentUserID: result.AgentUserID,
                Email: result.Email,
                ImageID: result.ImageID,
                IsVerified: result.IsVerified,
                Position: result.Position || ''
            }
        }
    }

    catch(err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentUser,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const insertResetPasswordToken = async (userId: number, token: string, validUntil: Date): QueryResult<{UserID: number, Token: string, ValidUntil: Date}> => {
    try {
        const result = await db.insertInto('Tbl_ResetPasswordToken')
            .values({
                UserID: userId,
                Token: token,
                ValidUntil: validUntil
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: {
                UserID: userId,
                Token: token,
                ValidUntil: validUntil
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as {UserID: number, Token: string, ValidUntil: Date},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const updateResetPasswordToken = async (userId: number, token: string, validUntil: Date): QueryResult<{UserID: number, Token: string, ValidUntil: Date}> => {
    try {
        const result = await db.updateTable('Tbl_ResetPasswordToken')
            .set({ ValidUntil: validUntil })
            .set({ Token: token })
            .where('UserID', '=', userId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: {
                UserID: result.UserID,
                Token: result.Token,
                ValidUntil: result.ValidUntil
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as {UserID: number, Token: string, ValidUntil: Date},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const findResetPasswordToken = async (userId: number, token: string): QueryResult<any> => {
    try {
        const result = await db.selectFrom('Tbl_ResetPasswordToken')
            .where('UserID', '=', userId)
            .where('Token', '=', token)
            .where('ValidUntil', '>', new Date())
            .selectAll()
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }   
    }
}

export const findResetPasswordTokenByUserId = async (userId: number): QueryResult<boolean> => {
    try {
        const result = await db.selectFrom('Tbl_ResetPasswordToken')
            .where('UserID', '=', userId)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        if(result) {
            return {
                success: true,
                data: true
            }
        }

        else {
            return {
                success: true,
                data: false
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: false,
            error: {
                code: 500,
                message: error.message
            }
        }   
    }
}

export const deleteResetPasswordToken = async (userId: number, token: string): QueryResult<any> => {
    try {
        const result = await db.deleteFrom('Tbl_ResetPasswordToken')
            .where('UserID', '=', userId)
            .where('Token', '=', token)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }   
    }
}

export const changePassword = async (userId: number, password: string): QueryResult<any> => {
    try {
        const result = await db.updateTable('Tbl_AgentUser')
            .set({ Password: password })
            .where('AgentUserID', '=', userId)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}