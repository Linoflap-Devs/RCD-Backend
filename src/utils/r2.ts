import { GetObjectCommand, PutObjectCommand, PutObjectCommandOutput, S3Client } from "@aws-sdk/client-s3"
import { QueryResult } from "../types/global.types"
import { R2ImageUploadResult } from "../types/r2.types"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"


if(!process.env.R2_ENDPOINT) throw new Error('R2_ENDPOINT is not defined')
if(!process.env.R2_S3_ACCESS_KEY) throw new Error('R2_S3_ACCESS_KEY is not defined')
if(!process.env.R2_S3_SECRET_KEY) throw new Error('R2_S3_SECRET_KEY is not defined')
if(!process.env.R2_BUCKET) throw new Error('R2_BUCKET is not defined')
if(!process.env.R2_PUBLIC_BUCKET) throw new Error('R2_PUBLIC_BUCKET is not defined')

const bucket = process.env.R2_BUCKET
const publicBucket = process.env.R2_PUBLIC_BUCKET

const s3client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_S3_ACCESS_KEY,
        secretAccessKey: process.env.R2_S3_SECRET_KEY
    },
})

export const getPresignedUrl = async (storageKey: string): QueryResult<string> => {
    const url = await getSignedUrl(s3client, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), { expiresIn: 60 });

    if(!url) return {
        success: false,
        data: '',
        error: {
            code: 500,
            message: 'Failed to get presigned url'
        }
    }

    return {
        success: true,
        data: url
    }
}

const uploadImage = async (bucketName: string, key: string, body: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    
    try {
        const storageKey = `${key}_${new Date().toISOString()}.${body.originalname.split('.').pop()}`

        const result = await s3client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: storageKey,
                Body: body.buffer,
                ContentType: body.mimetype
            })
        )

        return {
            success: true,
            data: {
                output: result,
                storageKey
            }   
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as R2ImageUploadResult,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const r2UploadGovId = async (agentRegistrationId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(bucket, `identification/reg-${agentRegistrationId}/govid`, file)

    return result
}

export const r2UploadGovSelfie = async (agentRegistrationId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(bucket, `identification/reg-${agentRegistrationId}/selfie`, file)

    return result
}

export const r2UploadAgentAvatar = async (agentId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(publicBucket, `avatars/user-${agentId}/avatar`, file)

    return result
}

export const r2UploadBrokerGovId = async (brokerRegistrationId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(bucket, `identification/b_reg-${brokerRegistrationId}/govid`, file)

    return result
}

export const r2UploadBrokerGovSelfie = async (brokerId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(bucket, `identification/b_reg-${brokerId}/selfie`, file)

    return result
}

export const r2UploadBrokerAvatar = async (brokerId: number, file: Express.Multer.File): QueryResult<R2ImageUploadResult> => {
    const result = await uploadImage(publicBucket, `avatars/broker-${brokerId}/avatar`, file)

    return result
}