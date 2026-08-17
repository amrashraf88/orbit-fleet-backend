import { Injectable } from "@nestjs/common";
import { AlertStatus,VehicleState } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
@Injectable() export class ReportsService {
  constructor(private prisma:PrismaService){}
  async dashboard(org:string){
    const [totalVehicles,states,openAlerts,dueMaintenance,activeTasks,fuel,latestAlerts]=await this.prisma.$transaction([
      this.prisma.vehicle.count({where:{organizationId:org}}),
      this.prisma.vehicle.groupBy({by:["state"],where:{organizationId:org},_count:{_all:true},orderBy:{state:"asc"}}),
      this.prisma.alert.count({where:{organizationId:org,status:{in:[AlertStatus.OPEN,AlertStatus.ACKNOWLEDGED]}}}),
      this.prisma.maintenanceRecord.count({where:{vehicle:{organizationId:org},status:{in:["DUE","OVERDUE"]}}}),
      this.prisma.task.count({where:{organizationId:org,status:{in:["NEW","IN_PROGRESS"]}}}),
      this.prisma.fuelRecord.aggregate({where:{vehicle:{organizationId:org},filledAt:{gte:new Date(Date.now()-30*86400000)}},_sum:{liters:true,totalCost:true}}),
      this.prisma.alert.findMany({where:{organizationId:org},include:{vehicle:{select:{name:true,plateNumber:true}}},orderBy:{occurredAt:"desc"},take:10}),
    ]);
    return {vehicles:{total:totalVehicles,states:Object.fromEntries(states.map(s=>[s.state.toLowerCase(),(s._count as {_all:number})._all]))},openAlerts,dueMaintenance,activeTasks,fuelLast30Days:fuel._sum,latestAlerts};
  }
  async utilization(org:string,from:Date,to:Date){const vehicles=await this.prisma.vehicle.findMany({where:{organizationId:org},select:{id:true,name:true,plateNumber:true,positions:{where:{recordedAt:{gte:from,lte:to}},select:{speed:true,recordedAt:true},orderBy:{recordedAt:"asc"}}}});return vehicles.map(v=>{let movingMinutes=0,idleMinutes=0;for(let i=1;i<v.positions.length;i++){const minutes=Math.min((v.positions[i].recordedAt.getTime()-v.positions[i-1].recordedAt.getTime())/60000,30);if(v.positions[i-1].speed>5)movingMinutes+=minutes;else idleMinutes+=minutes;}return {id:v.id,name:v.name,plateNumber:v.plateNumber,movingMinutes:Math.round(movingMinutes),idleMinutes:Math.round(idleMinutes),utilization:Math.round(movingMinutes/Math.max(movingMinutes+idleMinutes,1)*100)};});}
  async route(org:string,vehicleId:string,from:Date,to:Date){const vehicle=await this.prisma.vehicle.findFirstOrThrow({where:{id:vehicleId,organizationId:org}});const positions=await this.prisma.position.findMany({where:{vehicleId,recordedAt:{gte:from,lte:to}},orderBy:{recordedAt:"asc"},take:20000});return {vehicle,from,to,points:positions.map(p=>({...p,id:String(p.id)})),summary:{points:positions.length,maxSpeed:Math.max(0,...positions.map(p=>p.speed))}};}
}
