import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp({ apiKey: config.demoApiKey, logger: true });

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info({ port: config.port }, "digit-fnol-demo-api listening");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
