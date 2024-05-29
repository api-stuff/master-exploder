const winston = require('winston');

const { format } = winston;
const {
  combine, timestamp, json,
} = format;

const renameProperties = format((info) => {
  if (info.message) {
    info.msg = info.message; // eslint-disable-line no-param-reassign
    delete info.message; // eslint-disable-line no-param-reassign
  }

  return info;
});

const logging = winston.createLogger({
  level: process.env.WINSTON_LOG_LEVEL || 'info',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
      alias: 'time',
    }),
    renameProperties(),
    json(),
  ),
  transports: [new winston.transports.Console()],
  silent: process.env.NODE_ENV === 'test',
});

module.exports = logging;
