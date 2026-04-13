import { PutObjectCommandOutput } from "@aws-sdk/client-s3";

export interface R2ImageUploadResult {
    output: PutObjectCommandOutput,
    storageKey: string
}