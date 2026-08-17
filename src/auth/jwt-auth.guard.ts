import { CanActivate,ExecutionContext,Injectable,UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "./public.decorator";
@Injectable() export class JwtAuthGuard implements CanActivate {
  constructor(private reflector:Reflector,private jwt:JwtService,private config:ConfigService){}
  async canActivate(ctx:ExecutionContext){if(this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[ctx.getHandler(),ctx.getClass()]))return true;const req=ctx.switchToHttp().getRequest();const token=req.headers.authorization?.replace(/^Bearer\s+/i,"")??this.cookie(req.headers.cookie,"access_token");if(!token)throw new UnauthorizedException();try{req.user=await this.jwt.verifyAsync(token,{secret:this.config.getOrThrow("JWT_ACCESS_SECRET")});return true;}catch{throw new UnauthorizedException();}}
  private cookie(header:string|undefined,name:string){return header?.split(";").map(value=>value.trim().split("=")).find(([key])=>key===name)?.slice(1).join("=");}
}
