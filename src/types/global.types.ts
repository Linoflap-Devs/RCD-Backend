export type QueryResult<T> = Promise<{
    success: boolean,
    data: T,
    error?: {
        code: number,
        message: string
    }
}>