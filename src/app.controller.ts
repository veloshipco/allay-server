import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: "OK",
      message: "Allay API Server is running",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health")
  getHealthCheck() {
    return {
      status: "OK",
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
