/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const path = require('path');
const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect } = chai;

const Redis = require('ioredis');

const redisOptions = { host: 'localhost', port: 6379 };
const client = new Redis(redisOptions);

const readMessageFromGroup = require('../lib/read-message');

client.defineCommand('insertSubrequests', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/insert-subrequests.lua')),
});

client.defineCommand('insertTokens', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/insert-tokens.lua')),
});

client.defineCommand('jobDone', {
  numberOfKeys: 1,
  lua: fs.readFileSync(path.join(__dirname, '../lua-scripts/job-done.lua')),
});

beforeEach(async function () {
  await client.flushall();
});
after(async function () {
  await client.quit();
});

describe('scripts', function () {
  const list = '{req}:1';
  const reqID = 'ID';
  const requests = ['req1', 'req2', 'req3'];
  describe('push-requests', () => {
    it('should insert the request into the list', async function () {
      await client.insertTokens(list, reqID, 1);
      const len = await client.llen(list);
      expect(len).to.equal(1);
      const el = await client.rpop(list);
      expect(el).to.equal(reqID);
    });
    it('should create a request for every allowed worker', async function () {
      await client.insertTokens(list, reqID, 3);
      const len = await client.llen(list);
      expect(len).to.equal(3);
      const el = await client.rpop(list);
      expect(el).to.equal(reqID);
    });
  });
  describe('create-subrequests', () => {
    it('should insert all the subrequests into the stream', async function () {
      await client.insertSubrequests(reqID, ...requests);
      const len = await client.xlen(`sub:{${reqID}}`);
      expect(len).to.equal(requests.length);
      const res = await client.xread('STREAMS', `sub:{${reqID}}`, 0);
      for (let i = 0; i < requests.length; ++i) {
        const msg = res[0][1][i];
        expect(msg[1]).to.deep.equal(['req', requests[i]]);
      }
    });
    it('should set the counter to the number of requests', async function () {
      await client.insertSubrequests(reqID, ...requests);
      const count = await client.get(`counter:{${reqID}}`);
      expect(+count).to.equal(requests.length);
    });
    it('should create a consumer group with the same name as the request stream', async function () {
      await client.insertSubrequests(reqID, ...requests);
      const [info] = await client.xinfo('GROUPS', `sub:{${reqID}}`);
      const infoObj = {};
      for (let i = 0; i < info.length; i += 2) {
        infoObj[info[i]] = info[i + 1];
      }
      expect(infoObj).to.have.property('name', `sub:{${reqID}}`);
      expect(infoObj).to.have.property('consumers', 0);
      expect(infoObj).to.have.property('pending', 0);
    });
    it('should create a group that can deliver the requests from the stream', async function () {
      const stream = `sub:{${reqID}}`;
      await client.insertSubrequests(reqID, ...requests);
      const [[, res]] = await client.xreadgroup('GROUP', stream, 'consumer', 'STREAMS', stream, '>');
      expect(res).to.have.lengthOf(3);
      for (let i = 0; i < res.length; ++i) {
        const [, msg] = res[i];
        expect(msg[0]).to.equal('req');
        expect(msg[1]).to.equal(requests[i]);
      }
    });
  });
  describe('job-done', function () {
    describe('not the last job', function () {
      this.beforeEach(async function () {
        await client.insertSubrequests(reqID, ...requests);
        const [jobID] = await readMessageFromGroup(client, reqID);
        await client.jobDone(reqID, jobID);
      });
      it('should acknowledge the request completion', async function () {
        const stream = `sub:{${reqID}}`;
        const [pending] = await client.xpending(stream, stream);
        expect(+pending).to.equal(0);
      });
      it('should decrease the counter', async function () {
        const counter = `counter:{${reqID}}`;
        const remaining = await client.get(counter);
        expect(+remaining).to.equal(requests.length - 1);
      });
    });
    describe('last job', () => {
      // we need to use this and not a beforeEach hook because of the pub/sub
      async function init() {
        await client.insertSubrequests(reqID, requests[0]);
        const [jobID] = await readMessageFromGroup(client, reqID);
        await client.jobDone(reqID, jobID);
      }

      it('should delete the counter', async function () {
        await init();
        const counter = `counter:{${reqID}}`;
        const counterExists = await client.exists(counter);
        expect(+counterExists).to.equal(0);
      });
      it('should delete the consumer group', async function () {
        await init();
        const group = `sub:{${reqID}}`;
        await expect(client.xinfo('GROUPS', group)).to.be.rejected;
      });
      it('should delete the stream', async function () {
        await init();
        const stream = `sub:{${reqID}}`;
        await expect(client.xinfo('STREAM', stream)).to.be.rejected;
      });
      it('should publish to the pub/sub channel', (done) => {
        // we need to do this to be able to pass the `done` callback and use
        // async await at the same time, else mocha complains.
        (async function test() {
          const sub = new Redis(redisOptions);
          await sub.subscribe(reqID);
          sub.on('message', () => {
            sub.quit();
            done();
          });
          await init();
        }()).catch(done);
      });
    });
  });
});
