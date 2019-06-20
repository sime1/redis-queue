const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line
const { workerData, parentPort, isMainThread } = require('worker_threads');
const readMessageFromGroup = require('../lib/read-message');

if (isMainThread) {
  console.log('this script should not be run as main thread, but it should be used with worker threads');
  process.exit(1);
}

let client;
if (!workerData.cluster) {
  client = new Redis(workerData.port, workerData.host);
} else {
  client = new Redis.Cluster([{ host: workerData.host, port: workerData.port }]);
}

client.defineCommand('jobDone', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/job-done.lua')),
});

(async function processRequest() {
  // we generate the list of the ids of priority lists
  const lists = [...Array(100).keys()].map(prio => `{req}:${prio}`);
  // we try to retrie
  // eslint-disable-next-line
  for (let [priority, reqID] = (await client.brpop(...lists, 1)) || []; reqID != null; ([priority, reqID] = (await client.brpop(...lists, 1)) || [])) {
    parentPort.postMessage('request received');
    let jobID;
    let msg;
    try {
      ([jobID, msg] = await readMessageFromGroup(client, reqID, `worker-${workerData.ID}`));
    } catch (err) {
      continue;
    }
    parentPort.postMessage(`token received: ${reqID}`);
    const obj = {};
    for (let j = 0; j < msg.length; j += 2) {
      obj[msg[j]] = msg[j + 1];
    }
    await client.jobDone(reqID, jobID);
    await client.lpush(priority, reqID);
    parentPort.postMessage(`transformed: ${JSON.stringify(obj)}`);
  }
}()).catch(console.error).finally(() => client.quit());
