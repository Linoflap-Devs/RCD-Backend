export interface IImage {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: Buffer
}

export interface IImageBase64 {
    FileName: string,
    ContentType: string,
    FileExt: string,
    FileSize: number,
    FileContent: string
}

export interface TblImageWithId {
    ContentType: string;
    CreatedAt: Date;
    FileContent: Buffer;
    FileExtension: string;
    Filename: string;
    FileSize: number;
    ImageID: number;
}