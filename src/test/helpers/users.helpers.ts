import { sql } from "kysely";
import { db } from "../../db/db";
import { TblAgentUser } from "../../db/db-types";
import { ITblAgentUser, ITblBrokerUser, ITblUsersWeb } from "../../types/auth.types";
import { QueryResult } from "../../types/global.types";
import { hashPassword } from "../../utils/scrypt";
import 'dotenv/config'
import { ITblBroker } from "../../types/brokers.types";

const createUser = async (
    data: {
        firstName: string;
        agentCode: string,
        email: string;
        password: string;
        roleId: number;
        referredById?: number;
        referredCode?: string;
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
                            AgentCode: data.agentCode,
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
                            ReferredByID: data.referredById || null,
                            ReferredCode: data.referredCode || null,
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

        const registration = await trx.insertInto('Tbl_AgentRegistration')
                        .values({
                            FirstName: data.firstName,
                            LastName: 'USER',
                            PositionID: data.roleId,
                            Address: '',
                            AddressEmergency: '',
                            AffiliationDate: new Date(),
                            AgentCode: data.agentCode,
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
                            ReferredByID: data.referredById || null,
                            ReferredCode: data.referredCode || null,
                            Religion: null,
                            Sex: 'Male',
                            SSSNumber: null,
                            TelephoneNumber: null,
                            IsVerified: 2,
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
                            AgentID: agent.AgentID,
                            AgentRegistrationID: registration.AgentRegistrationID
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

const createWebUser = async (
    data: {
        empName: string, 
        username: string,
        password: string,
        role: string,
        usercode: string,
    }
): QueryResult<ITblUsersWeb> => {
    const trx = await db.startTransaction().execute();
    try {
        const result = await trx.insertInto('Tbl_UsersWeb')
            .values({
                UserCode: data.usercode,
                EmpName: data.empName,
                UserName: data.username,
                Password: await hashPassword(data.password),
                Role: data.role,
                BranchID: 1,
                BranchName: 'HEAD OFFICE'
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        await trx.commit().execute()

        return {
            success: true,
            data: result
        }

    } catch (err: unknown) {
        await trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: {} as ITblUsersWeb,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

const createBrokerUser = async (
    data: {
        firstName: string;
        email: string;
        password: string;
        roleId: number;
        divisionId?: number  
    }
): QueryResult<ITblBrokerUser> => {
    const trx = await db.startTransaction().execute();

    try {

        const idInsertBrokersOn = await sql`SET IDENTITY_INSERT Tbl_Broker ON`.execute(trx);
        const idInsertUsersOn = await sql`SET IDENTITY_INSERT Tbl_BrokerUser ON`.execute(trx);

        const agent = await trx.insertInto('Tbl_Broker')
                        .values({
                            Broker: data.firstName,
                            RepresentativeName: data.firstName,
                            PositionID: data.roleId,
                            Address: '',
                            AddressEmergency: '',
                            BrokerCode: '',
                            BrokerTaxRate: 0,
                            Birthdate: new Date(),
                            Birthplace: '',
                            CivilStatus: '',
                            ContactEmergency: '',
                            ContactNumber: '',
                            DSHUDNumber: null,
                            EmployeeIDNumber: null,
                            PagIbigNumber: null,
                            PersonEmergency: '',
                            PhilhealthNumber: null,
                            PRCNumber: null,
                            ReferredByID: null,
                            Religion: null,
                            Sex: 'Male',
                            SSSNumber: null,
                            TelephoneNumber: null,
                            IsActive: 1,
                            LastUpdate: new Date(),
                            UpdateBy: 1
                        })
                        .outputAll('inserted')
                        .executeTakeFirstOrThrow()

        const user = await trx.insertInto('Tbl_BrokerUser')
                        .values({ 
                            Email: data.email,
                            Password: await hashPassword(data.password),
                            IsVerified: 1,
                            BrokerID: agent.BrokerID
                         })
                        .outputAll('inserted')
                        .executeTakeFirstOrThrow()

        const idInsertBrokersOff = await sql`SET IDENTITY_INSERT Tbl_Broker OFF`.execute(trx);
        const idInsertUsersOff = await sql`SET IDENTITY_INSERT Tbl_BrokerUser OFF`.execute(trx);

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
            data: {} as ITblBrokerUser,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const createSP = async (divisionId?: number, referredById?: number, referredCode?: string): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'SALESPERSON',
        agentCode: 'SP',
        email: 'sp@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 5,
        divisionId: divisionId,
        referredById: referredById,
        referredCode: referredCode
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

export const createSPs = async (amount: number, divisionId?: number, referredById?: number, referredCode?: string): QueryResult<ITblAgentUser[]> => {

    const results: ITblAgentUser[] = [];

    for (let i = 0; i < amount; i++) {
        const result = await createUser({ 
            firstName: 'SALESPERSON',
            agentCode: 'SP',
            email: `sp${i}@gmail.com`,
            password: process.env.TESTING_PW || 'password',
            roleId: 5,
            divisionId: divisionId,
            referredById: referredById,
            referredCode: referredCode
        })
    
        if(!result.success){
            return {
                success: false,
                data: [] as ITblAgentUser[],
                error: result.error
            }
        }
        
        results.push(result.data)
    }

    return {
        success: true,
        data: results,
    }
}

export const createUM = async (divisionId?: number, referredById?: number, referredCode?: string): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'UNITMANAGER',
        agentCode: 'UM',
        email: 'um@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 86,
        divisionId: divisionId,
        referredById: referredById,
        referredCode: referredCode
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

export const createSD = async (divisionId?: number, referredById?: number, referredCode?: string): QueryResult<ITblAgentUser> => {
    const result = await createUser({ 
        firstName: 'SALESDIRECTOR',
        agentCode: 'SD',
        email: 'sd@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 85,
        divisionId: divisionId,
        referredById: referredById,
        referredCode: referredCode
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

export const createAdmin = async (): QueryResult<ITblUsersWeb> => {
    const result = await createWebUser({ 
        empName: 'ADMIN USER',
        username: 'admin',
        password: process.env.TESTING_PW || 'password',
        role: 'SALES ADMIN',
        usercode: 'SA'
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblUsersWeb,
            error: result.error
        }
    }

    return {
        success: result.success,
        data: result.data,
    }
}

export const createHandsOffBroker = async (): QueryResult<ITblBrokerUser> => {
    const result = await createBrokerUser({ 
        firstName: 'HANDSOFF BROKER',
        email: 'broker@gmail.com',
        password: process.env.TESTING_PW || 'password',
        roleId: 1
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblBrokerUser,
            error: result.error
        }
    }

    return {
        success: result.success,
        data: result.data,
    }
}