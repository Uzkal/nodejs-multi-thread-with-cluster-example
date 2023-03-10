const { runTask } = require("./shared");

process.on("message", async (payload) => {
  await runTask(payload.data);
  // Call async function

  process.send({
    ...payload,
    data: "Child executed:" + payload.data,
  });
});
