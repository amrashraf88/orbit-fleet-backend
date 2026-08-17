import { Injectable,UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import { LoginDto } from "./dto";
import type { StringValue } from "ms";

@Injectable() export class AuthService {
  constructor(private prisma:PrismaService,private jwt:JwtService,private config:ConfigService){}
  async login(dto:LoginDto){
    const user=await this.prisma.user.findUnique({where:{email:dto.email.toLowerCase()},include:{organization:true}});
    if(!user?.active||!(await bcrypt.compare(dto.password,user.passwordHash)))throw new UnauthorizedException("Invalid credentials");
    return this.issueTokens(user.id,user.organizationId,user.email,user.role,{name:user.name,organization:user.organization.name});
  }
  async refresh(raw:string){
    try{
      const payload=await this.jwt.verifyAsync<{sub:string;organizationId:string;email:string;role:string}>(raw,{secret:this.config.getOrThrow("JWT_REFRESH_SECRET")});
      const stored=await this.prisma.refreshToken.findFirst({where:{userId:payload.sub,tokenHash:this.hash(raw),revokedAt:null,expiresAt:{gt:new Date()}}});
      if(!stored)throw new Error(); await this.prisma.refreshToken.update({where:{id:stored.id},data:{revokedAt:new Date()}});
      return this.issueTokens(payload.sub,payload.organizationId,payload.email,payload.role);
    }catch{throw new UnauthorizedException("Invalid refresh token");}
  }
  async logout(raw:string){await this.prisma.refreshToken.updateMany({where:{tokenHash:this.hash(raw),revokedAt:null},data:{revokedAt:new Date()}});}
  async me(userId:string){const user=await this.prisma.user.findUnique({where:{id:userId},select:{id:true,name:true,email:true,role:true,active:true,organization:{select:{id:true,name:true}}}});if(!user?.active)throw new UnauthorizedException();return user;}
  private async issueTokens(sub:string,organizationId:string,email:string,role:string,extra?:Record<string,unknown>){
    const payload={sub,organizationId,email,role};
    const accessTtl=this.config.get<string>("JWT_ACCESS_TTL")??"15m";
    const refreshTtl=this.config.get<string>("JWT_REFRESH_TTL")??"30d";
    const accessToken=await this.jwt.signAsync(payload,{secret:this.config.getOrThrow("JWT_ACCESS_SECRET"),expiresIn:accessTtl as StringValue});
    const refreshToken=await this.jwt.signAsync(payload,{secret:this.config.getOrThrow("JWT_REFRESH_SECRET"),expiresIn:refreshTtl as StringValue});
    await this.prisma.refreshToken.create({data:{userId:sub,tokenHash:this.hash(refreshToken),expiresAt:new Date(Date.now()+30*86400000)}});
    return {accessToken,refreshToken,user:{id:sub,email,role,...extra}};
  }
  private hash(value:string){return createHash("sha256").update(value).digest("hex");}
}
