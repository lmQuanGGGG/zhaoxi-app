export type MediaKind = "logo"|"banner"|"product"|"gallery"|"document";
export type MediaAsset = {id:string;organizationId:string;serviceId?:string|null;kind:MediaKind;blobUrl:string;pathname?:string|null;mimeType?:string|null;sizeBytes?:number|null;sortOrder:number;isPublished:boolean;metadata?:Record<string,unknown>};
export function mediaKindFromFolder(folder:string):MediaKind{if(folder==="logo")return "logo";if(folder==="banners")return "banner";if(folder==="items")return "product";return "gallery"}
export function revokePreview(url:string){if(url.startsWith("blob:"))URL.revokeObjectURL(url)}
