# Redis job queue

## Folder structure

The files in this repo demonstrate a basic job queue implemented with redis. The
files are organized in different folders:

* inside `bin` there are the scripts that show a basic interaction with the
  queue.
* inside `lib` there are helper functions shared between the actual scripts and
  the tests
* inside `lua-scripts` there are the redis scripts used to create and use the
  queue
* `sample` contains a sample file that can be used by the `create-requests`
  script.
* `test` contains some simple tests. These tests require a `redis-server`
  listening on port 6379 on localhost to be run.

## Running the scripts

In order to run the scripts, you need [Node.js](https://nodejs.org/en/).

Once you have node installed, run

```sh
npm install
npm run sample -- 2
```

This will run the `create-requests` and `worker-manager` scripts concurrently,
using the requests in the file `sample/requests`, and using 2 worker threads.

The number of workers can be changed, and you can also use the scripts
independently. The scripts use the package `commander` for command line options
parsing, so you can just use `--help` to print usage information.

**Note**: The worker scripts use experimental APIs (`worker_threads`), and have
been tested using Node.js v12.4.0. If you use a different version, it may not
work.
