import { sql } from "kysely";
import { db } from "../../db/db";
import { QueryResult } from "../../types/global.types";

import 'dotenv/config'

export const truncateAllTables = async (): QueryResult<null> => {

    console.log('Truncating all tables...')

    if(process.env.TESTING_SERVER){
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'No testing server detected'
            }
        }
    }

    if(process.env.TESTING_DATABASE_NAME !== 'RCDTestingDB'){
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'No testing database detected'
            }
        }
    }

    if(process.env.NODE_ENV !== 'testing'){
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'Not in testing environment'
            }
        }
    }

    console.log('All conditions met.')

    try {
        const result = await
            sql`;
                -- Truncate all tables (this automatically resets identity columns)
                EXEC sp_MSforeachtable 'TRUNCATE TABLE ?';;
            `
            .execute(db);

        console.log("truncate results", result)

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

export const truncateTables = async (tableNames: string[]): Promise<QueryResult<null>> => {
    console.log('Truncating specified tables...')
    
    // Same safety checks as above...
    if (!process.env.TESTING_DATABASE_SERVER) {
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'No testing server detected'
            }
        }
    }
    
    if (process.env.TESTING_DATABASE_NAME !== 'RCDTestingDB') {
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'No testing database detected'
            }
        }
    }
    
    if (process.env.NODE_ENV !== 'testing') {
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: 'Not in testing environment'
            }
        }
    }
    
    if (!tableNames || tableNames.length === 0) {
        return {
            success: false,
            data: null,
            error: {
                code: 400,
                message: 'No table names provided'
            }
        }
    }
    
    console.log('All conditions met. Truncating tables:', tableNames)
    
    try {
        for (const tableName of tableNames) {
            const sanitizedTableName = tableName.replace(/[^\w]/g, '');
            
            // Disable foreign key checks temporarily if needed
            await sql`
                IF OBJECT_ID(${sanitizedTableName}, 'U') IS NOT NULL
                TRUNCATE TABLE ${sql.raw(sanitizedTableName)}
            `.execute(db);
            
            console.log(`Truncated table: ${sanitizedTableName}`);
        }
        
        return { success: true, data: null };
    } catch (err: unknown) {
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