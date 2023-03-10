const cluster = require("cluster");
let { queue } = require("./shared");

let workerCount = 2;
let workerList = [];
let finishedWorkers = [];

Init();

async function Init() {
  cluster.setupPrimary({
    exec: "./service.js",
    args: ["--use"],
    silent: true,
  });

  workerList = Array(workerCount)
    .fill(cluster.fork("./service.js"))
    .map((worker, index) => {
      worker.on("message", (payload) => {
        if (payload.workerId != index + 1) {
          return;
        }

        console.log("parent:", payload);

        if (queue?.length) {
          let processData = queue.shift();

          worker.send({
            threadId: worker.process.pid,
            workerId: index + 1,
            data: processData,
          });
        } else {
          console.log("Worker Finished:", payload.workerId);
          finishedWorkers.push(payload.workerId);

          if (finishedWorkers.length === workerList.length) {
            console.log("All Finished!");
            setTimeout(() => {
              workerList.forEach((worker) => worker.kill());
              cluster.disconnect();
            });
          }
        }
      });
      worker.on("error", (error) => {
        console.error("error", error);
      });
      worker.on("exit", (code) => {
        console.warn(`exit of ${index + 1}: `, code);
      });

      return worker;
    });

  workerList.forEach((worker, index) => {
    if (queue?.length) {
      let processData = queue.shift();

      worker.send({
        threadId: worker.process.pid,
        workerId: index + 1,
        data: processData,
      });
    }
  });
}
