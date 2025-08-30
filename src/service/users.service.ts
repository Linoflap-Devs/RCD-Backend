import { TblUsers } from "../db/db-types";
import { getUsers } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";

export const getUsersService = async (): QueryResult<TblUsers[]> => {
    const result = await getUsers();
    return result;
};