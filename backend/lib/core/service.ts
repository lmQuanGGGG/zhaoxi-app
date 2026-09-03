export type ServiceContext = { requestId?:string; actorId?:string; role?:"customer"|"partner"|"admin" };
export abstract class ApplicationService { constructor(protected readonly context:ServiceContext={}){} }
