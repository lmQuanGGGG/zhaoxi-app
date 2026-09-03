export const MEDIA_KINDS=["logo","banner","product","gallery","document"] as const;
export type MediaKind=(typeof MEDIA_KINDS)[number];
export class MediaService { isPublicUrl(value:string){try{const url=new URL(value);return url.protocol==="https:";}catch{return false;}} }
export const mediaService=new MediaService();
