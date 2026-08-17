import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { PrismaModule } from "./database/prisma.module";
import { FleetModule } from "./fleet/fleet.module";
import { OperationsModule } from "./operations/operations.module";
import { ReportsModule } from "./reports/reports.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { HealthController } from "./health.controller";

@Module({
  imports:[ConfigModule.forRoot({isGlobal:true}),PrismaModule,AuthModule,FleetModule,OperationsModule,ReportsModule],
  controllers:[HealthController],
  providers:[{provide:APP_GUARD,useClass:JwtAuthGuard},{provide:APP_GUARD,useClass:RolesGuard},{provide:APP_INTERCEPTOR,useClass:AuditInterceptor}],
})
export class AppModule {}
