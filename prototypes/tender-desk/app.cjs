// CommonJS startup for CloudLinux/Passenger. Passenger owns public port routing.
const { createServer } = require('./api/server.cjs');
const server = createServer();
server.listen(Number(process.env.PORT || 8053), process.env.HOST || '127.0.0.1');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
