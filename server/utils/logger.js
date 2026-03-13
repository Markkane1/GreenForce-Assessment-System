const isTestEnv = process.env.NODE_ENV === 'test';
const noop = () => {};

export const logger = {
  info: (...args) => {
    if (isTestEnv) {
      return noop();
    }

    return console.info(...args);
  },
  warn: (...args) => {
    if (isTestEnv) {
      return noop();
    }

    return console.warn(...args);
  },
  error: (...args) => {
    if (isTestEnv) {
      return noop();
    }

    return console.error(...args);
  },
};
