import { createParamDecorator,ExecutionContext } from "@nestjs/common";
export interface RequestUser {sub:string;organizationId:string;email:string;role:string}
export const CurrentUser=createParamDecorator((_data:unknown,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest<{user:RequestUser}>().user);
