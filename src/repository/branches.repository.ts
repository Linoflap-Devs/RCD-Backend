import { db } from "../db/db";
import { TblSalesBranch } from "../db/db-types";
import { QueryResult } from "../types/global.types";

export const getSalesBranches = async (): QueryResult<TblSalesBranch[]> => {
    try {
        const result = await db.selectFrom('Tbl_SalesBranch')
            .selectAll()
            .execute();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        return {
            success: false,
            data: [] as TblSalesBranch[],
            error: {
                code: 500, 
                message: 'Error fetching sales branches'
            }
        }
    }
}