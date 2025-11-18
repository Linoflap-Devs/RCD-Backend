import { db } from "../db/db"
import { TblBrokerRegistration, TblBrokerWorkExp } from "../db/db-types"
import { ITblBrokerEducation, ITblBrokerRegistration, ITblBrokerWorkExp } from "../types/brokers.types"
import { QueryResult } from "../types/global.types"

export const getBrokerRegistrationByUserId = async (brokerUserId: number): QueryResult<ITblBrokerRegistration> => {
    try {
        const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        const brokerRegistration = await db.selectFrom('Tbl_BrokerRegistration')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: brokerRegistration
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBrokerRegistration,
            error: {
                code: 400,
                message: error.message
            },
        }
    }   
}

export const getBrokerWorkExp = async(brokerUserId: number): QueryResult<ITblBrokerWorkExp[]> => {
    try {
         const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()

        const workExp = await db.selectFrom('Tbl_BrokerWorkExp')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .execute()

        return {
            success: true,
            data: workExp
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerWorkExp[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getBrokerEducation = async (brokerUserId: number): QueryResult<ITblBrokerEducation[]> => {
    try {
         const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()

        const educ = await db.selectFrom('Tbl_BrokerEducation')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .execute()

        return {
            success: true,
            data: educ
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerEducation[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}