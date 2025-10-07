import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { VwWebKPIs } from "../db/db-types";

export const getWebKPIs = async (): QueryResult<VwWebKPIs> => {
    try {
        const result = await db.selectFrom('vw_WebKPIs').selectAll().executeTakeFirstOrThrow();
        
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as VwWebKPIs,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}