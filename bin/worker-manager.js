
// this script uses worker threads to have multiple workers concurrently access
// the same queue.

// eslint-disable-next-line
const { Worker } = require('worker_threads');
const path = require('path');

const program = require('commander');

program.version('0.1.0')
  .option('-n, --workers <number>', 'the number of concurrent workers', 1)
  .option('-h, --host <hostname>', 'the redis host', 'localhost')
  .option('-p, --port <number>', 'the redis port', '6379')
  .option('-c, --cluster', 'wheter we should use redis cluster mode')
  .parse(process.argv);

for (let i = 0; i < program.workers; ++i) {
  const worker = new Worker(path.join(__dirname, 'worker.js'), {
    workerData: {
      host: program.host,
      port: program.port,
      cluster: program.cluster,
      ID: i,
    },
  });
  worker.on('error', err => console.log(`[worker ${i}] ERR: ${err}`));
  worker.on('message', msg => console.log(`[worker ${i}] MSG: ${msg}`));
  worker.on('exit', () => console.log(`[worker ${i}] exit`));
}
