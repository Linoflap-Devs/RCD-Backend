export type QueryResult<T> = Promise<{
    success: boolean,
    data: T,
    error?: {
        code: number,
        message: string
    }
}>

export type PaginationResult<T> = {
    totalPages: number,
    totalResults: number,
    page: number,
    results: T
}