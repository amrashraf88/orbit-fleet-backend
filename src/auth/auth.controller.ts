import { Body,Controller,Get,Post,Req,Res,UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth,ApiTags } from "@nestjs/swagger";
import type { Request,Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser,RequestUser } from "./current-user.decorator";
import { LoginDto,RefreshDto } from "./dto";
import { Public } from "./public.decorator";
@ApiTags("Auth") @Controller("auth") export class AuthController {
  constructor(private auth:AuthService){}
  @Public() @Post("login") async login(@Body()dto:LoginDto,@Res({passthrough:true})res:Response){const result=await this.auth.login(dto);this.setCookies(res,result.accessToken,result.refreshToken);return result;}
  @Public() @Post("refresh") async refresh(@Body()dto:RefreshDto,@Req()req:Request,@Res({passthrough:true})res:Response){const raw=dto.refreshToken??this.cookie(req,"refresh_token");if(!raw)throw new UnauthorizedException();const result=await this.auth.refresh(raw);this.setCookies(res,result.accessToken,result.refreshToken);return result;}
  @Post("logout") async logout(@Body()dto:RefreshDto,@Req()req:Request,@Res({passthrough:true})res:Response){const raw=dto.refreshToken??this.cookie(req,"refresh_token");if(raw)await this.auth.logout(raw);res.clearCookie("access_token",{path:"/"});res.clearCookie("refresh_token",{path:"/v1/auth"});return {success:true};}
  @ApiBearerAuth() @Get("me") me(@CurrentUser()user:RequestUser){return this.auth.me(user.sub);}
  private setCookies(res:Response,accessToken:string,refreshToken:string){const secure=process.env.NODE_ENV==="production";res.cookie("access_token",accessToken,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:15*60*1000});res.cookie("refresh_token",refreshToken,{httpOnly:true,secure,sameSite:"lax",path:"/v1/auth",maxAge:30*86400000});}
  private cookie(req:Request,name:string){return req.headers.cookie?.split(";").map(value=>value.trim().split("=")).find(([key])=>key===name)?.slice(1).join("=");}
}
