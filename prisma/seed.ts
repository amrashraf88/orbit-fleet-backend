import { PrismaClient,Role,VehicleState } from "@prisma/client";
import * as bcrypt from "bcryptjs";
const prisma=new PrismaClient();
async function main(){
  const organization=await prisma.organization.upsert({where:{id:"orbit-demo"},update:{},create:{id:"orbit-demo",name:"ORBIT Fleet Demo"}});
  await prisma.user.upsert({where:{email:"admin@orbit.sa"},update:{},create:{organizationId:organization.id,name:"مدير الأسطول",email:"admin@orbit.sa",passwordHash:await bcrypt.hash("Orbit@2026",12),role:Role.SUPER_ADMIN}});
  const vehicles=[
    {plateNumber:"2414 ASA",name:"تجريبي — متحرك",group:"أسطول الرياض",state:VehicleState.MOVING,speed:73,latitude:24.7136,longitude:46.6753,fuelLevel:72,engineOn:true},
    {plateNumber:"2447 ASA",name:"تجريبي — خاملة",group:"أسطول الرياض 2",state:VehicleState.IDLE,speed:2,latitude:24.7743,longitude:46.7386,fuelLevel:64,engineOn:true},
    {plateNumber:"7926 BXA",name:"تجريبي — متوقفة",group:"أسطول جدة",state:VehicleState.STOPPED,speed:0,latitude:21.560717,longitude:39.208975,fuelLevel:38,engineOn:false},
    {plateNumber:"2451 ASA",name:"تجريبي — متصلة",group:"بدون مجموعة",state:VehicleState.ONLINE,speed:0,latitude:24.633,longitude:46.716,fuelLevel:81,engineOn:false},
  ];
  for(const vehicle of vehicles)await prisma.vehicle.upsert({where:{organizationId_plateNumber:{organizationId:organization.id,plateNumber:vehicle.plateNumber}},update:vehicle,create:{...vehicle,organizationId:organization.id}});
  const configuration:Record<string,string[]>={
    vehicle_group:["بدون مجموعة","أسطول الرياض","أسطول جدة","RUHTCS","RUHOPS","JEDTCS"],
    task_priority:["منخفضة","عادية","مرتفعة"],
    geofence_type:["دائرة","مضلع"],
    alert_type:["تجاوز السرعة","دخول نطاق","خروج من نطاق","مدة التوقف","SOS"],
    camera_position:["أمامية","داخلية","خلفية"],
    maintenance_service:["تغيير الزيت","الفحص الدوري","الإطارات","البطارية"],
    report_type:["الحركة والتوقف","المسافة","الوقود","التنبيهات","المهام"],
    report_format:["PDF","Excel","CSV"],
    record_status:["active","attention","inactive"],
  };
  for(const [category,values] of Object.entries(configuration))for(const [sortOrder,value] of values.entries())await prisma.configurationOption.upsert({where:{organizationId_category_value:{organizationId:organization.id,category,value}},update:{label:value,sortOrder,active:true},create:{organizationId:organization.id,category,label:value,value,sortOrder}});
}
main().finally(()=>prisma.$disconnect());
