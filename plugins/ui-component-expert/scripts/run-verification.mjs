import { main } from './cli.mjs';
process.exitCode = await main(['run-verification', ...process.argv.slice(2)]);
