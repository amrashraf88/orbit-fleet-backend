import { Injectable,NotFoundException } from "@nestjs/common";
import { Prisma,VehicleState } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { CreateDriverDto,CreateVehicleDto,PositionDto,UpdateDriverDto,UpdateVehicleDto } from "./dto";
import { FleetGateway } from "./fleet.gateway";
@Injectable() export class FleetService {
  constructor(private prisma:PrismaService,private gateway:FleetGateway){}
  vehicles(org:string,search="",page=1,perPage=50){const where:Prisma.VehicleWhereInput={organizationId:org,...(search?{OR:[{name:{contains:search,mode:"insensitive"}},{plateNumber:{contains:search,mode:"insensitive"}},{group:{contains:search,mode:"insensitive"}}]}:{})};return this.paginate(this.prisma.vehicle,where,page,perPage,{driver:true});}
  vehicle(org:string,id:string){return this.prisma.vehicle.findFirst({where:{id,organizationId:org},include:{driver:true,maintenance:{orderBy:{createdAt:"desc"},take:5}}}).then(v=>v??Promise.reject(new NotFoundException("Vehicle not found")));}
  createVehicle(org:string,dto:CreateVehicleDto){return this.prisma.vehicle.create({data:{...dto,organizationId:org}});}
  async updateVehicle(org:string,id:string,dto:UpdateVehicleDto){await this.vehicle(org,id);return this.prisma.vehicle.update({where:{id},data:dto});}
  async deleteVehicle(org:string,id:string){await this.vehicle(org,id);await this.prisma.vehicle.delete({where:{id}});}
  drivers(org:string,page=1,perPage=50){return this.paginate(this.prisma.driver,{organizationId:org},page,perPage,{vehicles:true});}
  createDriver(org:string,dto:CreateDriverDto){return this.prisma.driver.create({data:{...dto,organizationId:org,licenseExpiresAt:dto.licenseExpiresAt?new Date(dto.licenseExpiresAt):undefined}});}
  updateDriver(org:string,id:string,dto:UpdateDriverDto){return this.prisma.driver.update({where:{id},data:{...dto,licenseExpiresAt:dto.licenseExpiresAt?new Date(dto.licenseExpiresAt):undefined}});}
  deleteDriver(org:string,id:string){return this.prisma.driver.deleteMany({where:{id,organizationId:org}});}
  async position(org:string,vehicleId:string,dto:PositionDto){const vehicle=await this.vehicle(org,vehicleId);const recordedAt=new Date(dto.recordedAt);const state=dto.speed>5?VehicleState.MOVING:dto.ignition?VehicleState.IDLE:VehicleState.STOPPED;const [position,updated]=await this.prisma.$transaction([this.prisma.position.create({data:{...dto,raw:dto.raw as Prisma.InputJsonValue,vehicleId,recordedAt}}),this.prisma.vehicle.update({where:{id:vehicleId},data:{latitude:dto.latitude,longitude:dto.longitude,speed:dto.speed,heading:dto.heading,altitude:dto.altitude,engineOn:dto.ignition,state,lastSeenAt:recordedAt}})]);const payload={...updated,positionId:String(position.id)};this.gateway.position(org,payload);return payload;}
  async history(org:string,vehicleId:string,from:Date,to:Date){await this.vehicle(org,vehicleId);const positions=await this.prisma.position.findMany({where:{vehicleId,recordedAt:{gte:from,lte:to}},orderBy:{recordedAt:"asc"},take:10000});return positions.map(position=>({...position,id:String(position.id)}));}
  private async paginate(model:any,where:unknown,page:number,perPage:number,include?:unknown){const skip=(Math.max(page,1)-1)*perPage;const [data,total]=await this.prisma.$transaction([model.findMany({where,include,skip,take:perPage,orderBy:{createdAt:"desc"}}),model.count({where})]);return {data,meta:{total,page,perPage,pages:Math.ceil(total/perPage)}};}
}
