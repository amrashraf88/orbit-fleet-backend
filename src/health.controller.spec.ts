import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports a healthy API", () => {
    const result = new HealthController().check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("orbit-fleet-api");
  });
});
