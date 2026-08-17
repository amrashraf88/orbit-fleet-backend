import { ExecutionContext,UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  const reflector = { getAllAndOverride: jest.fn(() => false) } as never;
  const config = { getOrThrow: jest.fn(() => "secret") } as never;

  it("accepts an access token from an HttpOnly cookie", async () => {
    const request:{headers:Record<string,string>;user?:unknown}={headers:{cookie:"theme=dark; access_token=signed.jwt"}};
    const jwt={verifyAsync:jest.fn().mockResolvedValue({sub:"user-1",organizationId:"org-1"})} as never;
    const context={switchToHttp:()=>({getRequest:()=>request}),getHandler:()=>null,getClass:()=>null} as unknown as ExecutionContext;
    await expect(new JwtAuthGuard(reflector,jwt,config).canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({sub:"user-1",organizationId:"org-1"});
  });

  it("rejects requests without a bearer token or cookie", async () => {
    const jwt={verifyAsync:jest.fn()} as never;
    const context={switchToHttp:()=>({getRequest:()=>({headers:{}})}),getHandler:()=>null,getClass:()=>null} as unknown as ExecutionContext;
    await expect(new JwtAuthGuard(reflector,jwt,config).canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
