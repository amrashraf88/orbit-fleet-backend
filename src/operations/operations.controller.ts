import { Body,Controller,Delete,Get,Param,Patch,Post,Query } from "@nestjs/common";
import { ApiBearerAuth,ApiTags } from "@nestjs/swagger";
import { AlertStatus,Role } from "@prisma/client";
import { CurrentUser,RequestUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { AlertDto,AlertStatusDto,CameraMediaDto,CommandDto,CommandStatusDto,ConfigurationOptionDto,FuelDto,GeofenceDto,MaintenanceDto,TaskDto,UserDto } from "./dto";
import { OperationsService } from "./operations.service";
@ApiBearerAuth() @ApiTags("Operations") @Controller() export class OperationsController {
  constructor(private ops:OperationsService){}
  @Get("geofences") geofences(@CurrentUser()u:RequestUser){return this.ops.geofences(u.organizationId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Post("geofences") createGeofence(@CurrentUser()u:RequestUser,@Body()d:GeofenceDto){return this.ops.createGeofence(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Patch("geofences/:id") updateGeofence(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:GeofenceDto){return this.ops.updateGeofence(u.organizationId,id,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("geofences/:id") removeGeofence(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteGeofence(u.organizationId,id)}
  @Get("alerts") alerts(@CurrentUser()u:RequestUser,@Query("status")s?:AlertStatus){return this.ops.alerts(u.organizationId,s)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.DISPATCHER) @Post("alerts") createAlert(@CurrentUser()u:RequestUser,@Body()d:AlertDto){return this.ops.createAlert(u.organizationId,d)}
  @Patch("alerts/:id/status") alertStatus(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:AlertStatusDto){return this.ops.updateAlert(u.organizationId,id,d.status)}
  @Get("maintenance") maintenance(@CurrentUser()u:RequestUser){return this.ops.maintenance(u.organizationId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Post("maintenance") createMaintenance(@CurrentUser()u:RequestUser,@Body()d:MaintenanceDto){return this.ops.createMaintenance(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Patch("maintenance/:id") updateMaintenance(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:MaintenanceDto){return this.ops.updateMaintenance(u.organizationId,id,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("maintenance/:id") removeMaintenance(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteMaintenance(u.organizationId,id)}
  @Get("fuel") fuel(@CurrentUser()u:RequestUser){return this.ops.fuel(u.organizationId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER) @Post("fuel") createFuel(@CurrentUser()u:RequestUser,@Body()d:FuelDto){return this.ops.createFuel(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("fuel/:id") removeFuel(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteFuel(u.organizationId,id)}
  @Get("tasks") tasks(@CurrentUser()u:RequestUser){return this.ops.tasks(u.organizationId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER,Role.DISPATCHER) @Post("tasks") createTask(@CurrentUser()u:RequestUser,@Body()d:TaskDto){return this.ops.createTask(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.MANAGER,Role.DISPATCHER) @Patch("tasks/:id") updateTask(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:TaskDto){return this.ops.updateTask(u.organizationId,id,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("tasks/:id") removeTask(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteTask(u.organizationId,id)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Get("users") users(@CurrentUser()u:RequestUser){return this.ops.users(u.organizationId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Post("users") createUser(@CurrentUser()u:RequestUser,@Body()d:UserDto){return this.ops.createUser(u.organizationId,d)}
  @Roles(Role.SUPER_ADMIN) @Delete("users/:id") deleteUser(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteUser(u.organizationId,id)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Get("audit-logs") audit(@CurrentUser()u:RequestUser){return this.ops.audit(u.organizationId)}
  @Get("commands") commands(@CurrentUser()u:RequestUser,@Query("vehicleId")vehicleId?:string){return this.ops.commands(u.organizationId,vehicleId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.DISPATCHER) @Post("commands") createCommand(@CurrentUser()u:RequestUser,@Body()d:CommandDto){return this.ops.createCommand(u.organizationId,u.sub,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Patch("commands/:id/status") commandStatus(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:CommandStatusDto){return this.ops.updateCommand(u.organizationId,id,d)}
  @Get("cameras") cameras(@CurrentUser()u:RequestUser,@Query("vehicleId")vehicleId?:string){return this.ops.cameras(u.organizationId,vehicleId)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN,Role.DISPATCHER) @Post("cameras") createCamera(@CurrentUser()u:RequestUser,@Body()d:CameraMediaDto){return this.ops.createCamera(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("cameras/:id") deleteCamera(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteCamera(u.organizationId,id)}
  @Get("configuration-options") configuration(@CurrentUser()u:RequestUser,@Query("category")category?:string,@Query("includeInactive")all?:string){return this.ops.configuration(u.organizationId,category,all==="true")}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Post("configuration-options") createConfiguration(@CurrentUser()u:RequestUser,@Body()d:ConfigurationOptionDto){return this.ops.createConfiguration(u.organizationId,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Patch("configuration-options/:id") updateConfiguration(@CurrentUser()u:RequestUser,@Param("id")id:string,@Body()d:ConfigurationOptionDto){return this.ops.updateConfiguration(u.organizationId,id,d)}
  @Roles(Role.ADMIN,Role.SUPER_ADMIN) @Delete("configuration-options/:id") deleteConfiguration(@CurrentUser()u:RequestUser,@Param("id")id:string){return this.ops.deleteConfiguration(u.organizationId,id)}
}
