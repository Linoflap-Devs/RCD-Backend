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