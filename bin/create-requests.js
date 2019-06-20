const Redis = require('ioredis');
const program = require('commander');
const genId = require('uuid/v4');
const path = require('path');
const fs = require('fs');

program.version('0.1.0')
  .option('-h, --host <hostname>', 'the redis host', 'localhost')
  .option('-p, --port <number>', 'the redis port', '6379')
  .option('-f, --file <path>', 'the input file, with one request per line')
  .option('-c, --cluster', 'enable redis cluster mode')
  .parse(process.argv);

let client;
if (!program.cluster) {
  client = new Redis(program.port, program.host);
} else {
  client = new Redis.Cluster([{ host: program.host, port: program.port }]);
}

client.defineCommand('insertSubrequests', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/insert-subrequests.lua')),
});

client.defineCommand('insertTokens', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/insert-tokens.lua')),
});

(async function main() {
  const requests = fs.readFileSync(program.file, { encoding: 'utf8' })
    .split('\n')
    .filter(line => !line.startsWith('#'));
  for (let i = 0; i < requests.length; ++i) {
    const subreq = requests[i]
      .split(':')
      .filter(str => str.trim() !== '');
    if (subreq.length > 0) {
      const conc = subreq.shift();
      const reqID = genId();
      await client.insertSubrequests(reqID, ...subreq);
      await client.insertTokens(`{req}:${i}`, reqID, conc);
    }
  }
}()).catch(err => console.error(err)).finally(() => client.quit());
