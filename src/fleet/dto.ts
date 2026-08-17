import { VehicleState } from "@prisma/client";
import { IsBoolean,IsEnum,IsInt,IsLatitude,IsLongitude,IsNumber,IsOptional,IsString,Max,Min } from "class-validator";
export class CreateVehicleDto {
  @IsString() name!:string; @IsString() plateNumber!:string; @IsOptional() @IsString() vin?:string;
  @IsOptional() @IsString() group?:string; @IsOptional() @IsString() make?:string; @IsOptional() @IsString() model?:string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) year?:number; @IsOptional() @IsString() color?:string; @IsOptional() @IsString() driverId?:string;
}
export class UpdateVehicleDto extends CreateVehicleDto { @IsOptional() declare name:string; @IsOptional() declare plateNumber:string; @IsOptional() @IsEnum(VehicleState) state?:VehicleState; }
export class PositionDto {
  @IsLatitude() latitude!:number; @IsLongitude() longitude!:number; @IsNumber() @Min(0) speed!:number;
  @IsNumber() @Min(0) @Max(360) heading!:number; @IsOptional() @IsNumber() altitude?:number;
  @IsBoolean() ignition!:boolean; @IsOptional() @IsNumber() accuracy?:number; @IsString() recordedAt!:string; @IsOptional() raw?:Record<string,unknown>;
}
export class CreateDriverDto { @IsString() name!:string; @IsString() licenseNumber!:string; @IsOptional() @IsString() phone?:string; @IsOptional() @IsString() email?:string; @IsOptional() @IsString() licenseExpiresAt?:string; }
export class UpdateDriverDto extends CreateDriverDto { @IsOptional() declare name:string; @IsOptional() declare licenseNumber:string; @IsOptional() @IsBoolean() active?:boolean; }
