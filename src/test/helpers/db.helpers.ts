import { sql } from "kysely";
import { db } from "../../db/db";
import { QueryResult } from "../../types/global.types";

import 'dotenv/config'

export const truncateAllTables = async (): QueryResult<null> => {

    if(process.env.TESTING_SERVER){
        return {
            success: true,
            data: null,
            error: {
                code: 500,
                message: 'No testing server detected'
            }
        }
    }

    if(process.env.NODE_ENV !== 'testing'){
        return {
            success: true,
            data: null,
            error: {
                code: 500,
                message: 'Not in testing environment'
            }
        }
    }

    try {
        const result = await
            sql`
                -- Disable all foreign key constraints
                EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

                -- Truncate all tables (this automatically resets identity columns)
                EXEC sp_MSforeachtable 'TRUNCATE TABLE ?';

                -- Re-enable all foreign key constraints
                EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

                -- Optional: Explicitly reset identity columns to ensure they start at 1
                EXEC sp_MSforeachtable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableHasIdentity'') = 1 DBCC CHECKIDENT(''?'', RESEED, 0)';
            `
            .execute(db);

        return { success: true, data: null };
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