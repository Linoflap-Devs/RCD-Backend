export interface IImage {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: Buffer,
    StorageKey?: string
}

export interface IImageR2 {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: Buffer | null,
    StorageKey: string | null
}

export interface IImageBase64 {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: string
}

export interface ITypedImageBase64 {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: string,
    ImageType: 'profile' | 'govid' | 'selfie'
}

export interface TblImageWithId {
    ContentType: string;
    CreatedAt: Date;
    FileContent: Buffer | null;
    FileExtension: string;
    Filename: string;
    FileSize: number;
    ImageID: number;
    StorageKey: string | null
}