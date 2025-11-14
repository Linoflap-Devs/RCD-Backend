
import { ITblSalesSector } from "../types/sectors.types";
import { db } from "../db/db";
import { QueryResult } from "../types/global.types";

export const getSectors = async (filters?: { sectorId?: number, sectorCode?: string}): QueryResult<ITblSalesSector[]> => {
    try {

        let baseQuery = await db.selectFrom('Tbl_SalesSector')
            .selectAll()
        
        if(filters && filters.sectorId){
            baseQuery = baseQuery.where('SectorID', '=', filters.sectorId)
        }

        if(filters && filters.sectorCode){
            baseQuery = baseQuery.where('SectorCode', '=', filters.sectorCode)
        }

        const result = await baseQuery.execute()

        if(!result){
            return {
                success: false,
                data: [] as ITblSalesSector[],
                error: {
                    code: 404,
                    message: 'Sector not found.'
                }
            }
        }

        return {
            success: true,
            data: result
        };
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblSalesSector[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}