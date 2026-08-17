import { Injectable,NotFoundException } from "@nestjs/common";
import { AlertStatus,Prisma,Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import { FleetGateway } from "../fleet/fleet.gateway";
import { AlertDto,CameraMediaDto,CommandDto,CommandStatusDto,ConfigurationOptionDto,FuelDto,GeofenceDto,MaintenanceDto,TaskDto,UserDto } from "./dto";
@Injectable() export class OperationsService {
  constructor(private prisma:PrismaService,private gateway:FleetGateway){}
  geofences(org:string){return this.prisma.geofence.findMany({where:{organizationId:org},orderBy:{createdAt:"desc"}});}
  createGeofence(org:string,dto:GeofenceDto){return this.prisma.geofence.create({data:{...dto,geometry:dto.geometry as Prisma.InputJsonValue,organizationId:org}});}
  updateGeofence(org:string,id:string,dto:Partial<GeofenceDto>){return this.prisma.geofence.updateMany({where:{id,organizationId:org},data:{...dto,geometry:dto.geometry as Prisma.InputJsonValue}});}
  deleteGeofence(org:string,id:string){return this.prisma.geofence.deleteMany({where:{id,organizationId:org}});}
  alerts(org:string,status?:AlertStatus){return this.prisma.alert.findMany({where:{organizationId:org,status},include:{vehicle:true},orderBy:{occurredAt:"desc"},take:500});}
  async createAlert(org:string,dto:AlertDto){const alert=await this.prisma.alert.create({data:{...dto,metadata:dto.metadata as Prisma.InputJsonValue,organizationId:org}});this.gateway.alert(org,alert);return alert;}
  updateAlert(org:string,id:string,status:AlertStatus){const now=new Date();return this.prisma.alert.updateMany({where:{id,organizationId:org},data:{status,acknowledgedAt:status===AlertStatus.ACKNOWLEDGED?now:undefined,resolvedAt:status===AlertStatus.RESOLVED?now:undefined}});}
  maintenance(org:string){return this.prisma.maintenanceRecord.findMany({where:{vehicle:{organizationId:org}},include:{vehicle:true},orderBy:{createdAt:"desc"}});}
  createMaintenance(org:string,dto:MaintenanceDto){return this.prisma.maintenanceRecord.create({data:{...dto,dueAt:dto.dueAt?new Date(dto.dueAt):undefined,cost:dto.cost}});}
  updateMaintenance(org:string,id:string,dto:Partial<MaintenanceDto>){return this.prisma.maintenanceRecord.updateMany({where:{id,vehicle:{organizationId:org}},data:{...dto,dueAt:dto.dueAt?new Date(dto.dueAt):undefined,cost:dto.cost}});}
  deleteMaintenance(org:string,id:string){return this.prisma.maintenanceRecord.deleteMany({where:{id,vehicle:{organizationId:org}}});}
  fuel(org:string){return this.prisma.fuelRecord.findMany({where:{vehicle:{organizationId:org}},include:{vehicle:true},orderBy:{filledAt:"desc"}});}
  createFuel(org:string,dto:FuelDto){return this.prisma.fuelRecord.create({data:{...dto,filledAt:new Date(dto.filledAt)}});}
  deleteFuel(org:string,id:string){return this.prisma.fuelRecord.deleteMany({where:{id,vehicle:{organizationId:org}}});}
  tasks(org:string){return this.prisma.task.findMany({where:{organizationId:org},include:{vehicle:true},orderBy:{createdAt:"desc"}});}
  createTask(org:string,dto:TaskDto){return this.prisma.task.create({data:{...dto,organizationId:org,startsAt:dto.startsAt?new Date(dto.startsAt):undefined,dueAt:dto.dueAt?new Date(dto.dueAt):undefined}});}
  updateTask(org:string,id:string,dto:Partial<TaskDto>){return this.prisma.task.updateMany({where:{id,organizationId:org},data:{...dto,startsAt:dto.startsAt?new Date(dto.startsAt):undefined,dueAt:dto.dueAt?new Date(dto.dueAt):undefined}});}
  deleteTask(org:string,id:string){return this.prisma.task.deleteMany({where:{id,organizationId:org}});}
  users(org:string){return this.prisma.user.findMany({where:{organizationId:org},select:{id:true,name:true,email:true,role:true,active:true,createdAt:true,updatedAt:true}});}
  async createUser(org:string,dto:UserDto){return this.prisma.user.create({data:{organizationId:org,name:dto.name,email:dto.email.toLowerCase(),passwordHash:await bcrypt.hash(dto.password,12),role:dto.role as Role,active:dto.active??true},select:{id:true,name:true,email:true,role:true,active:true}});}
  async deleteUser(org:string,id:string){const result=await this.prisma.user.deleteMany({where:{id,organizationId:org}});if(!result.count)throw new NotFoundException();return result;}
  audit(org:string){return this.prisma.auditLog.findMany({where:{organizationId:org},include:{user:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"},take:500}).then(rows=>rows.map(row=>({...row,id:String(row.id)})));}
  commands(org:string,vehicleId?:string){return this.prisma.deviceCommand.findMany({where:{organizationId:org,vehicleId},include:{vehicle:{select:{name:true,plateNumber:true}}},orderBy:{createdAt:"desc"},take:500});}
  async createCommand(org:string,userId:string,dto:CommandDto){await this.prisma.vehicle.findFirstOrThrow({where:{id:dto.vehicleId,organizationId:org}});return this.prisma.deviceCommand.create({data:{organizationId:org,vehicleId:dto.vehicleId,type:dto.type,payload:dto.payload as Prisma.InputJsonValue,requestedById:userId}});}
  updateCommand(org:string,id:string,dto:CommandStatusDto){const now=new Date();return this.prisma.deviceCommand.updateMany({where:{id,organizationId:org},data:{status:dto.status,response:dto.response as Prisma.InputJsonValue,sentAt:dto.status==="SENT"?now:undefined,acknowledgedAt:dto.status==="ACKNOWLEDGED"?now:undefined}});}
  cameras(org:string,vehicleId?:string){return this.prisma.cameraMedia.findMany({where:{organizationId:org,vehicleId},include:{vehicle:{select:{name:true,plateNumber:true}}},orderBy:{capturedAt:"desc"},take:500});}
  async createCamera(org:string,dto:CameraMediaDto){await this.prisma.vehicle.findFirstOrThrow({where:{id:dto.vehicleId,organizationId:org}});return this.prisma.cameraMedia.create({data:{...dto,organizationId:org,capturedAt:new Date(dto.capturedAt),metadata:dto.metadata as Prisma.InputJsonValue}});}
  deleteCamera(org:string,id:string){return this.prisma.cameraMedia.deleteMany({where:{id,organizationId:org}});}
  configuration(org:string,category?:string,includeInactive=false){return this.prisma.configurationOption.findMany({where:{organizationId:org,category,active:includeInactive?undefined:true},orderBy:[{category:"asc"},{sortOrder:"asc"},{label:"asc"}]});}
  createConfiguration(org:string,dto:ConfigurationOptionDto){return this.prisma.configurationOption.create({data:{...dto,organizationId:org,metadata:dto.metadata as Prisma.InputJsonValue}});}
  updateConfiguration(org:string,id:string,dto:Partial<ConfigurationOptionDto>){return this.prisma.configurationOption.updateMany({where:{id,organizationId:org},data:{...dto,metadata:dto.metadata as Prisma.InputJsonValue}});}
  deleteConfiguration(org:string,id:string){return this.prisma.configurationOption.deleteMany({where:{id,organizationId:org}});}
}
