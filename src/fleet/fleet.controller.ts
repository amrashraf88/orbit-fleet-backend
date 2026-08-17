import { Body,Controller,Delete,Get,Param,ParseIntPipe,Patch,Post,Query } from "@nestjs/common";
import { ApiBearerAuth,ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser,RequestUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { CreateDriverDto,CreateVehicleDto,PositionDto,UpdateDriverDto,UpdateVehicleDto } from "./dto";
import { FleetService } from "./fleet.service";
@ApiBearerAuth() @ApiTags("Fleet") @Controller() export class FleetController {
  constructor(private fleet:FleetService){}
  @Get("vehicles") vehicles(@CurrentUser()u:RequestUser,@Query("search")q="",@Query("page")p="1",@Query("perPage")pp="50"){return this.fleet.vehicles(u.organizationId,q,+p,+pp);}
  @Get("vehicles/:id") vehicle(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.fleet.vehicle(u.organizationId,id);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Post("vehicles") createVehicle(@CurrentUser()u:RequestUser,@Body()dto:CreateVehicleDto){return this.fleet.createVehicle(u.organizationId,dto);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Patch("vehicles/:id") updateVehicle(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()dto:UpdateVehicleDto){return this.fleet.updateVehicle(u.organizationId,id,dto);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("vehicles/:id") async deleteVehicle(@CurrentUser()u:RequestUser,@Param("id")id:string){await this.fleet.deleteVehicle(u.organizationId,id);return {success:true};}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.DISPATCHER) @Post("vehicles/:id/positions") position(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()dto:PositionDto){return this.fleet.position(u.organizationId,id,dto);}
  @Get("vehicles/:id/history") history(@CurrentUser()u:RequestUser,@Param("id")id:string,@Query("from")from:string,@Query("to")to:string){return this.fleet.history(u.organizationId,id,new Date(from),new Date(to));}
  @Get("drivers") drivers(@CurrentUser()u:RequestUser,@Query("page")p="1",@Query("perPage")pp="50"){return this.fleet.drivers(u.organizationId,+p,+pp);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Post("drivers") createDriver(@CurrentUser()u:RequestUser,@Body()dto:CreateDriverDto){return this.fleet.createDriver(u.organizationId,dto);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Patch("drivers/:id") updateDriver(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()dto:UpdateDriverDto){return this.fleet.updateDriver(u.organizationId,id,dto);}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("drivers/:id") async deleteDriver(@CurrentUser()u:RequestUser,@Param("id")id:string){await this.fleet.deleteDriver(u.organizationId,id);return {success:true};}
}
