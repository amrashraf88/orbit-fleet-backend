import { CallHandler,ExecutionContext,Injectable,NestInterceptor } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Observable,tap } from "rxjs";
import { PrismaService } from "../database/prisma.service";
@Injectable() export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma:PrismaService){}
  intercept(context:ExecutionContext,next:CallHandler):Observable<unknown>{const req=context.switchToHttp().getRequest();const mutating=["POST","PATCH","PUT","DELETE"].includes(req.method);return next.handle().pipe(tap({next:()=>{if(mutating&&req.user?.organizationId)void this.prisma.auditLog.create({data:{organizationId:req.user.organizationId,userId:req.user.sub,action:req.method,entity:req.route?.path??req.url,entityId:req.params?.id,ip:req.ip,userAgent:req.headers["user-agent"],changes:req.body as Prisma.InputJsonValue}}).catch(()=>undefined);}}));}
}
