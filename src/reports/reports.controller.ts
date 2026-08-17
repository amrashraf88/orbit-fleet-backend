import { Controller,Get,Param,Query } from "@nestjs/common";
import { ApiBearerAuth,ApiTags } from "@nestjs/swagger";
import { CurrentUser,RequestUser } from "../auth/current-user.decorator";
import { ReportsService } from "./reports.service";
@ApiBearerAuth() @ApiTags("Reports") @Controller("reports") export class ReportsController {
  constructor(private reports:ReportsService){}
  @Get("dashboard") dashboard(@CurrentUser()u:RequestUser){return this.reports.dashboard(u.organizationId)}
  @Get("utilization") utilization(@CurrentUser()u:RequestUser,@Query("from")from:string,@Query("to")to:string){return this.reports.utilization(u.organizationId,new Date(from),new Date(to))}
  @Get("vehicles/:id/route") route(@CurrentUser()u:RequestUser,@Param("id")id:string,@Query("from")from:string,@Query("to")to:string){return this.reports.route(u.organizationId,id,new Date(from),new Date(to))}
}
