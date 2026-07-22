import { createApp } from "./app.ts";

const PORT = Number(process.env["PORT"] ?? 3000);
// 0.0.0.0 es necesario para que el contenedor sea alcanzable desde fuera.
const HOST = process.env["HOST"] ?? "0.0.0.0";
// Margen antes de forzar la salida si alguna conexión no termina.
const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor escuchando en http://${HOST}:${PORT}`);
});

/**
 * Apagado ordenado: deja de aceptar conexiones nuevas, espera a que terminen
 * las que están en curso y sale. Es lo que permite que `docker stop` y el
 * drenaje de targets en ECS/EC2 no corten peticiones a medias.
 */
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`Recibida señal ${signal}, cerrando el servidor...`);

  const forceExit = setTimeout(() => {
    console.error("Cierre forzado: se agotó el tiempo de espera.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  // No mantener el proceso vivo solo por este temporizador.
  forceExit.unref();

  server.close((err) => {
    if (err) {
      console.error("Error al cerrar el servidor:", err);
      process.exit(1);
    }
    console.log("Servidor cerrado correctamente.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
