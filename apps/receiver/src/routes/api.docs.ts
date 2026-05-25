import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const router = Router();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HQRelay API",
      version: "1.0.0",
      description: "Webhook relay for Indian B2B startups",
    },
  },
  apis: ["./src/routes/*.route.ts"],
};

const specs = swaggerJsdoc(options);

router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

export default router;
