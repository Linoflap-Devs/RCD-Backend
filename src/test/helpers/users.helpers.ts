import { sql } from "kysely";
import { db } from "../../db/db";
import { TblAgentUser } from "../../db/db-types";
import { ITblAgentUser } from "../../types/auth.types";
import { QueryResult } from "../../types/global.types";
import { hashPassword } from "../../utils/scrypt";
import 'dotenv/config'

const createUser = async (
    data: {
        firstName: string;
        email: string;
        password: string;
        roleId: number;
        divisionId?: number  
    },
): QueryResult<ITblAgentUser> => {
    const trx = await db.startTransaction().execute();

    try {

        const idInsertAgentsOn = await sql`SET IDENTITY_INSERT Tbl_Agents ON`.execute(trx);
        const idInsertUsersOn = await sql`SET IDENTITY_INSERT Tbl_AgentUser ON`.execute(trx);

        const agent = await trx.insertInto('Tbl_Agents')
                        .values({
                            FirstName: data.firstName,
                            LastName: 'USER',
                            PositionID: data.roleId,
                            Address: '',
                            AddressEmergency: '',
                            AffiliationDate: new Date(),
                            AgentCode: '',
                            AgentTaxRate: 0,
                            Birthdate: new Date(),
                            Birthplace: '',
                            CivilStatus: '',
                            ContactEmergency: '',
                            ContactNumber: '',
                            DivisionID: data.divisionId ? data.divisionId.toString() : "1",
                            DSHUDNumber: null,
                            EmployeeIDNumber: null,
                            PagIbigNumber: null,
                            PersonEmergency: '',
                            PhilhealthNumber: null,
                            PRCNumber: null,
                            ReferredByID: null,
                            ReferredCode: null,
                            Religion: null,
                            Sex: 'Male',
                            SSSNumber: null,
                            TelephoneNumber: null,
                            IsActive: 1,
                            LastUpdate: new Date(),
                            MiddleName: '',
                            UpdateBy: 1
                        })
                        .outputAll('inserted')
                        .executeTakeFirstOrThrow()

        const user = await trx.insertInto('Tbl_AgentUser')
                        .values({ 
                            Email: data.email,
                            Password: await hashPassword(data.password),
                            IsVerified: 1,
                            AgentID: agent.AgentID
                         })
                        .outputAll('inserted')
                        .executeTakeFirstOrThrow()

        const idInsertAgentsOff = await sql`SET IDENTITY_INSERT Tbl_Agents OFF`.execute(trx);
        const idInsertUsersOff = await sql`SET IDENTITY_INSERT Tbl_AgentUser OFF`.execute(trx);

        await trx.commit().execute()

        return { 
            success: true, 
            data: user 
        }
    } catch (err: unknown) {
        await trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const createSP = async (divisionId?: number): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'SALESPERSON',
        email: 'sp@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 5,
        divisionId: divisionId
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: result.error
        }
    }

    return {
        success: result.success,
        data: result.data,
    }
}

export const createUM = async (divisionId?: number): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'UNITMANAGER',
        email: 'um@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 86,
        divisionId: divisionId
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: result.error
        }
    }

    return {
        success: result.success,
        data: result.data,
    }
}

export const createSD = async (divisionId?: number): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'SALESDIRECTOR',
        email: 'sd@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 85,
        divisionId: divisionId
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: result.error
        }
    }

    return {
        success: result.success,
        data: result.data,
    }
}