import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

/**
 * Construye la aplicación Express sin arrancar el servidor.
 * Separarlo de `server.ts` permite reutilizar la app (tests, serverless, etc.).
 */
export function createApp(): Express {
  const app = express();

  // No revelar la tecnología del servidor en las cabeceras.
  app.disable("x-powered-by");

  app.use(express.json());

  // Endpoint principal.
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ message: "¡Hola mundo!" });
  });

  // Endpoint de health, usado por el HEALTHCHECK de Docker y por los
  // health checks del balanceador en AWS.
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Cualquier otra ruta.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Middleware de errores: los 4 argumentos son obligatorios para que
  // Express lo reconozca como manejador de errores.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error no controlado:", err);
    // No se devuelve el stack trace al cliente.
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}
