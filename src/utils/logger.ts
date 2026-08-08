type LogFields = Record<string, unknown>;

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    if (!isDev()) return;
    console.debug(message, fields ?? '');
  },
  info(message: string, fields?: LogFields) {
    if (!isDev()) return;
    console.info(message, fields ?? '');
  },
  warn(message: string, fields?: LogFields) {
    console.warn(message, fields ?? '');
  },
  error(message: string, error?: unknown, fields?: LogFields) {
    console.error(message, error, fields ?? '');
  }
};
