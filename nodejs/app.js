import MainServer from "./libs/MainServer.js";
import EmulatorWebApi from "./tests/libs/EmulatorWebApi.js";
import readline from "readline";

async function startIteration(srcConfig, trgConfig) {
  const server = new MainServer();
  await server.iteration(srcConfig, trgConfig);
}

async function runApp() {
  const webApis = {
    demo: {
      url: "http://localhost:8040/api/read?from_ge=1754475000&to_lt=1755510000",
      from_ts: 1754475000,
      to_ts: 1755510000,
    },
    //тут список внешних web api
  };

  const trgConfig = {
    host: "localhost",
    port: 20432,
    user: "demo_user",
    password: "demo_pw",
    database: "demo_db",
  };

  const emulatorPort = 8040;
  const emulator = new EmulatorWebApi({ port: emulatorPort });
  const emulatorMethods = {
    get: {
      "/api/read": {
        value: [
          { ts: 1754480000, group_name: "группа 2", cnt: 300 },
          { ts: 1755490000, group_name: "группа 1", cnt: 400 },
          { ts: 1755500000, group_name: "группа 2", cnt: 500 },
        ],
        fn: (rows, params) => {
          const from = parseInt(params?.from_ge ?? 0);
          const to = parseInt(params?.to_lt ?? 1e10);
          return rows.filter((row) => row.ts >= from && row.ts < to);
        },
      },
    },
  };
  emulator.init(emulatorMethods);
  console.log(`Эмулятор запущен на порту ${emulatorPort}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const apiKey = await new Promise((resolve) => {
    rl.question(
      `Выберите Web API (${Object.keys(webApis).join(
        "/"
      )}) [demo](пока работает только demo): `,
      (answer) => {
        rl.close();
        resolve(answer || "demo");
      }
    );
  });

  const srcConfig = webApis[apiKey] || webApis["demo"];
  console.log(`Используется Web API: ${apiKey}`);

  const rlMode = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const mode = await new Promise((resolve) => {
    rlMode.question(
      "Режим работы: 1 - однократная итерация, 2 - циклическая: ",
      (answer) => {
        rlMode.close();
        resolve(answer.trim() || "1");
      }
    );
  });

  if (mode === "2") {
    const intervalSeconds = 10;
    console.log(
      `[${new Date().toISOString()}] Запуск циклической обработки каждые ${intervalSeconds} секунд`
    );

    const intervalId = setInterval(async () => {
      try {
        await startIteration(srcConfig, trgConfig);
      } catch (err) {
        console.error(
          `[${new Date().toISOString()}] Ошибка получения данных с ${
            srcConfig.url
          }:`,
          err.message
        );
      }
    }, intervalSeconds * 1000);

    process.on("SIGINT", () => {
      clearInterval(intervalId);
      emulator.stop();
      console.log(
        `[${new Date().toISOString()}] Циклическая обработка остановлена, эмулятор выключен`
      );
      process.exit(0);
    });
  } else {
    await startIteration(srcConfig, trgConfig);
    emulator.stop();
    console.log("Эмулятор остановлен");
  }
}

runApp();
