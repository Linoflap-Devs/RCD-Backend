import { QueryResult } from "../types/global.types";
import { TblAgentSession } from "../db/db-types";
import { db } from "../db/db";
import { IAgentRegister, IAgentSession, IAgentUserSession } from "../types/auth.types";
import { IImage } from "../types/image.types";
import { profile } from "console";

export const insertSession =  async (sessionString: string, agentUserId: number): QueryResult<IAgentSession> => {
    try {
        const result = await db.insertInto('Tbl_AgentSession').values({
            SessionString: sessionString,
            AgentUserID: agentUserId,
            ExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }).execute();

        if(!result[0].insertId) return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: 'Failed to insert session.',
                code: 500
            }
        }

        const find = await db.selectFrom('Tbl_AgentSession').where('SessionID', '=', Number(result[0].insertId)).selectAll().executeTakeFirst();

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
                    ImageID: result.ImageID
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

export const registerAgentTransaction = async(data: IAgentRegister, imageMetadata?: IImage): QueryResult<any> => {

    const registerTransaction = await db.startTransaction().execute();

    try {
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

        // insert into image
        let imageId = -1;
        if(imageMetadata){
            const agentImage = await registerTransaction.insertInto('Tbl_Image').values({
                Filename: imageMetadata.FileName,
                ContentType: imageMetadata.ContentType,
                FileExtension: imageMetadata.FileExt,
                FileSize: imageMetadata.FileSize,
                FileContent: imageMetadata.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            imageId = agentImage.ImageID
        }

        // insert into Agent User
        const agentUser = await registerTransaction.insertInto('Tbl_AgentUser').values({
            AgentRegistrationID: agentRegistration.AgentRegistrationID,
            Email: data.email,
            Password: data.password,
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