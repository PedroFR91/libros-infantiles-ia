import pino from "pino";

export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  }),
});

/**
 * Create a child logger with a context label (e.g. route name)
 */
export function createLogger(context: string) {
  return logger.child({ context });
}
