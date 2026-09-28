import { main } from './cli.mjs';
process.exitCode = await main(['generate-brief', ...process.argv.slice(2)]);
