import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { decorateOpenApi,swaggerTags } from "./swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  app.setGlobalPrefix("v1");
  app.use(helmet()); app.use(compression());
  app.enableCors({ origin: config.get("CORS_ORIGINS", "http://localhost:3000").split(","), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist:true, transform:true, forbidNonWhitelisted:true }));
  let builder=new DocumentBuilder().setTitle("ORBIT Fleet API").setDescription("Complete fleet operations API: authentication, vehicles, TCP-normalized telemetry, drivers, geofences, alerts, maintenance, fuel, tasks, device commands, cameras, configuration, users, audit and reports.").setVersion("1.0.0").addServer("http://localhost:4000","Local development").addBearerAuth({type:"http",scheme:"bearer",bearerFormat:"JWT",description:"Paste the access token returned by POST /v1/auth/login"},"bearerAuth").addCookieAuth("access_token",{type:"apiKey",in:"cookie",description:"HttpOnly browser session cookie"},"cookieAuth");
  for(const [name,description] of swaggerTags)builder=builder.addTag(name,description);
  const document = decorateOpenApi(SwaggerModule.createDocument(app,builder.build(),{operationIdFactory:(controller,method)=>`${controller.replace(/Controller$/,'')}_${method}`}));
  SwaggerModule.setup("docs", app, document, {jsonDocumentUrl:"docs/openapi.json",customSiteTitle:"ORBIT Fleet API Documentation",swaggerOptions:{persistAuthorization:true,filter:true,displayRequestDuration:true,docExpansion:"list",defaultModelsExpandDepth:2,defaultModelExpandDepth:2,tagsSorter:"alpha",operationsSorter:"method",tryItOutEnabled:true}});
  app.enableShutdownHooks();
  await app.listen(config.get<number>("PORT",4000), "0.0.0.0");
}
bootstrap();
