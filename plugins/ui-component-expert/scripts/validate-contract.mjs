import { main } from './cli.mjs';
process.exitCode = await main(['validate-contract', ...process.argv.slice(2)]);
