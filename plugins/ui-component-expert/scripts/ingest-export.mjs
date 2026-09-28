import { main } from './cli.mjs';
process.exitCode = await main(['ingest-export', ...process.argv.slice(2)]);
