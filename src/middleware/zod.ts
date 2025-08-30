import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

export const validate = <T>(schema: z.ZodSchema<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log(req.body)
            schema.parse(req.body);
            next()
        }
        catch(err: unknown) {
            if (err instanceof ZodError) {
                console.log(err.issues)
                const errorMessages = err.issues.map((issue) => ({
                    [issue.path.join('.')]: `${issue.message}`,
                }))
                console.log(errorMessages)
                res.status(400).json({success: false, data: {}, message: errorMessages})
            }
            else {
                const error = err as Error
                res.status(500).json({success: false, data: {}, message: error.message })
            }   
        }
    }
}