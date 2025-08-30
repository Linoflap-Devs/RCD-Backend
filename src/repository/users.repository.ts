import { db } from "../db/db";
import { TblUsers } from "../db/db-types";
import { QueryResult } from "../types/global.types";

export const getUsers = async (): QueryResult<TblUsers[]> => {
    try {
        const users = await db.selectFrom('Tbl_Users').selectAll().execute();
        return {
            success: true,
            data: users
        }
    }

    catch (err: any) {
        const error = err as Error
        return {
            success: false,
            data: [],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
    
};