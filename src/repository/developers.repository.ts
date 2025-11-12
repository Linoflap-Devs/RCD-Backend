import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { IAddDeveloper, ITblDevelopers } from "../types/developers.types";
import { TblDevelopers } from "../db/db-types";

export const getDevelopers = async (
    filters?: {
        developerCode?: string,
        developerId?: number
    }, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, data:ITblDevelopers[]}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let baseQuery = db.selectFrom('Tbl_Developers')
            .selectAll()

        let countQuery = db.selectFrom('Tbl_Developers')
            .select(({fn}) => fn.countAll<number>().as('count'))

        if(filters && filters.developerId){
            baseQuery = baseQuery.where('DeveloperID', '=', filters.developerId)
            countQuery = countQuery.where('DeveloperID', '=', filters.developerId)
        }

        if(filters && filters.developerCode){
            baseQuery = baseQuery.where('DeveloperCode', '=', filters.developerCode)
            countQuery = countQuery.where('DeveloperCode', '=', filters.developerCode)
        }

        baseQuery = baseQuery.orderBy('DeveloperName', 'asc')

        if(pagination && pagination.page && pagination.pageSize){
            console.log(offset)
            baseQuery = baseQuery.offset(offset).fetch(pagination.pageSize)
        }

        const result = await baseQuery.execute()
        const countResult = await countQuery.execute()

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        return {
            success: true,
            data: {
                totalResults: totalCount,
                totalPages: totalPages,
                data: result
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, data:ITblDevelopers[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addDeveloper = async (
    userId: number,
    data: IAddDeveloper
): QueryResult<ITblDevelopers> => {
    try {
        const result = await db.insertInto('Tbl_Developers')
            .values({
                DeveloperCode: data.developerCode,
                DeveloperName: data.developerName,
                ContactPerson: data.contactPerson || '',
                ContactNumber: data.contactNumber || '',
                Position: data.position || '',
                Address: data.address || '',
                PartialReleaseType: data.partialReleaseType ? 1 : 0,
                PartialReleaseAmount: data.releaseAmount,
                CommRate: data.commissionRate,
                WtaxRate: data.withholdingTaxRate,
                VATRate: data.valueAddedTaxRate,
                ReleaseSchedule: data.commissionSchedule,
                TaxIDNumber: data.taxIdNumber || '',
                UpdateBy: userId,
                LastUpdate: new Date()
            })
            .outputAll('inserted')
            .executeTakeFirst()

        if(!result){
            throw new Error('Failed to add developer.');
        }

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as ITblDevelopers,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editDeveloper = async (
    userId: number,
    developerId: number,
    editData: Partial<ITblDevelopers>
): QueryResult<ITblDevelopers> => {
    try {
        const updateData: Partial<ITblDevelopers> = {
            ...editData,
            LastUpdate: new Date(),
            UpdateBy: userId
        }

        console.log(updateData)

        const result = await db.updateTable('Tbl_Developers')
            .where('DeveloperID', '=', developerId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirst()

        if(!result){
            throw new Error('Failed to update developer.');
        }

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblDevelopers,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}