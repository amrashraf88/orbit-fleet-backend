import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OnGatewayConnection,WebSocketGateway,WebSocketServer } from "@nestjs/websockets";
import { Server,Socket } from "socket.io";
@WebSocketGateway({namespace:"/fleet",cors:{origin:true,credentials:true}}) export class FleetGateway implements OnGatewayConnection {
  @WebSocketServer() server!:Server;
  constructor(private jwt:JwtService,private config:ConfigService){}
  async handleConnection(client:Socket){try{const raw=client.handshake.auth.token??client.handshake.headers.authorization?.replace(/^Bearer\s+/i,"")??this.cookie(client.handshake.headers.cookie,"access_token");const user=await this.jwt.verifyAsync<{organizationId:string}>(raw,{secret:this.config.getOrThrow("JWT_ACCESS_SECRET")});client.join(`org:${user.organizationId}`);}catch{client.disconnect(true);}}
  position(organizationId:string,payload:unknown){this.server.to(`org:${organizationId}`).emit("vehicle.position",payload);}
  alert(organizationId:string,payload:unknown){this.server.to(`org:${organizationId}`).emit("alert.created",payload);}
  private cookie(header:string|undefined,name:string){return header?.split(";").map(value=>value.trim().split("=")).find(([key])=>key===name)?.slice(1).join("=");}
}
