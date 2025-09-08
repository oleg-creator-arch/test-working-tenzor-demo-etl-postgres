//
// Основной класс сервера приложений
// Реализует обращение к источнику, обработку и запись в БД
//

export default class MainServer {
  constructor() {}

  // Чтение данных из Web API источника
  async getData(srcUrl, timeout = 1000) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(srcUrl, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`Ошибка при запросе ${srcUrl}: ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error("getData error:", err);
      throw err;
    }
  }

  // Обработка прочитанных данных
  //      dataIn - массив входящих строк
  //      from_ts - метка времени начала (включая)
  //      to_ts - метка времени окончания периода (не включая)
  prepareData(dataIn, from_ts, to_ts) {
    if (!Array.isArray(dataIn)) return [];

    const grouped = {};

    for (const row of dataIn) {
      // Фильтруем строки по глобальному from_ts / to_ts
      if (row.ts < from_ts || row.ts >= to_ts) continue;

      const key = row.group_name;
      if (!grouped[key]) {
        grouped[key] = {
          group_name: key,
          cnt: row.cnt,
          from_ts: row.ts,
          to_ts: row.ts,
        };
      } else {
        grouped[key].cnt += row.cnt;
        grouped[key].from_ts = Math.min(grouped[key].from_ts, row.ts);
        grouped[key].to_ts = Math.max(grouped[key].to_ts, row.ts);
      }
    }

    return Object.values(grouped);
  }

  // Запись обработанных данных в БД
  async saveData(dataIn) {
    if (!Array.isArray(dataIn) || dataIn.length === 0) return false;

    const { Client } = await import("pg");
    let client = null;

    try {
      client = new Client({
        user: process.env.DB_USER || "demo_user",
        password: process.env.DB_PASS || "demo_pw",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 20432,
        database: process.env.DB_NAME || "demo_db",
      });

      await client.connect();

      for (const row of dataIn) {
        await client.query(
          `INSERT INTO demo_schema.demo_data(from_ts, to_ts, group_name, cnt) 
                 VALUES (to_timestamp($1), to_timestamp($2), $3, $4)`,
          [row.from_ts, row.to_ts, row.group_name, row.cnt]
        );
      }

      return true;
    } catch (err) {
      console.error("saveData error:", err);
      return false;
    } finally {
      if (client) await client.end();
    }
  }

  // Вызов выполнения итерации обработки: снятие -> обработка -> запись в БД
  //      srcConfig - объект с атрибутами подключения к Web API
  //      trgConfig - объект подключения к
  async iteration(srcConfig, trgConfig) {
    console.log(`[${new Date().toISOString()}] Начало выполнения итерации`);
    try {
      const dataRaw = await this.getData(srcConfig.url);
      console.log(
        `[${new Date().toISOString()}] Получено ${dataRaw.length} строк`
      );

      const dataPrepared = this.prepareData(
        dataRaw,
        srcConfig.from_ts,
        srcConfig.to_ts
      );
      console.log(
        `[${new Date().toISOString()}] Обработано ${dataPrepared.length} групп`
      );

      const success = await this.saveData(dataPrepared);
      if (success) {
        console.log(
          `[${new Date().toISOString()}] Вставлено ${
            dataPrepared.length
          } строк в БД`
        );
      } else {
        console.error(
          `[${new Date().toISOString()}] Ошибка при вставке данных в БД`
        );
      }

      console.log(
        `[${new Date().toISOString()}] Итерация завершена. Успех: ${success}`
      );
      return success;
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Ошибка итерации:`, err);
      return false;
    }
  }
}
