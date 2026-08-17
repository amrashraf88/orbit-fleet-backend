import { Module } from "@nestjs/common";
import { FleetModule } from "../fleet/fleet.module";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";
@Module({imports:[FleetModule],controllers:[OperationsController],providers:[OperationsService]}) export class OperationsModule {}
