import MainServer from "../libs/MainServer.js";
import EmulatorWebApi from "./libs/EmulatorWebApi.js";
import {
  execSQLRequests,
  checkSQLResults,
} from "./libs/test_utils_postgres.mjs";
import { prepareTest } from "./libs/test_utils.mjs";

describe("Iteration mode tests", () => {
  const emulatorPort = 8050; // другой порт, чтобы не конфликтовать
  let emulator;

  beforeAll(() => {
    emulator = new EmulatorWebApi({ port: emulatorPort });
    emulator.init({
      get: {
        "/api/read": {
          value: [
            { ts: 1754480000, group_name: "group1", cnt: 100 },
            { ts: 1754490000, group_name: "group2", cnt: 200 },
          ],
          fn: (rows, params) => {
            const from = parseInt(params?.from_ge ?? 0);
            const to = parseInt(params?.to_lt ?? 1e10);
            return rows.filter((r) => r.ts >= from && r.ts < to);
          },
        },
      },
    });
  });

  afterAll(() => {
    emulator.stop();
  });

  const srcConfig = {
    url: `http://localhost:${emulatorPort}/api/read?from_ge=1754475000&to_lt=1754500000`,
    from_ts: 1754475000,
    to_ts: 1754500000,
  };

  const trgConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 20432,
    user: process.env.DB_USER || "demo_user",
    password: process.env.DB_PASS || "demo_pw",
    database: process.env.DB_NAME || "demo_db",
  };

  beforeEach(async () => {
    const dbClient = new (await import("pg")).Client(trgConfig);
    await dbClient.connect();
    await execSQLRequests(dbClient, [
      { sql: "TRUNCATE TABLE demo_schema.demo_data" },
    ]);
    await dbClient.end();
  });

  test("Single iteration inserts data", async () => {
    const server = new MainServer();
    const result = await server.iteration(srcConfig, trgConfig);
    expect(result).toBe(true);

    const dbClient = new (await import("pg")).Client(trgConfig);
    await dbClient.connect();
    const res = await dbClient.query("SELECT * FROM demo_schema.demo_data");
    expect(res.rows.length).toBe(2); // две группы
    await dbClient.end();
  });

  test("Cyclic iteration works for 2 intervals", async () => {
    jest.useFakeTimers();
    const server = new MainServer();

    // Запуск "цикла" вручную с двумя итерациями
    const intervalId = setInterval(async () => {
      await server.iteration(srcConfig, trgConfig);
    }, 1000);

    // Прокрутим таймер на 2500 мс (должно сработать 2 раза)
    jest.advanceTimersByTime(2500);
    clearInterval(intervalId);

    const dbClient = new (await import("pg")).Client(trgConfig);
    await dbClient.connect();
    const res = await dbClient.query("SELECT * FROM demo_schema.demo_data");
    expect(res.rows.length).toBe(4); // две группы * 2 итерации
    await dbClient.end();

    jest.useRealTimers();
  });
});
