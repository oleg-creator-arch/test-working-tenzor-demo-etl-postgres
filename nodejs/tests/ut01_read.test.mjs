// 
// Тесты сервера приложений:
//      01.1 - чтение из Web API
//      01.2 - обработка
//      01.3 - запись в БД
// 

import fs from 'fs';
import path from 'path';
// Тестируемый класс
import MainServer from '../libs/MainServer.js';
// Вспомогательный - эмулятор источника
import EmulatorWebApi from './libs/EmulatorWebApi.js';
// Вспомогательные - методы для автотеста 
import {prepareTest, assertTextFilesEqual, sortedJson} from './libs/test_utils.mjs';
import {execSQLRequests, checkSQLResults} from './libs/test_utils_postgres.mjs';

import { assert } from 'console';

const pg = require('pg');
const { Client } = pg;

describe('ut01.1 Чтение данных из WebUI', () => {

    const emulator_port = 8040;
    // Эмулятор источника - создание
    const emulatorWebApi = new EmulatorWebApi({'port': emulator_port});

    afterAll(() => {
        // Эмулятор источника - закрытие
        emulatorWebApi.stop();
    })

    test('ut01.1.1 чтение 3х строк', async () => {

        const test_id = 'ut01.1.1'

        // Тестовый каталог
        const test_dir = prepareTest(test_id)
        // Файлы - ожидаемый эталон и результат вызова тестируемого кода 
        const expected_filename = path.resolve(`./nodejs/tests/resources/ut01.1/${test_id}-expected.json`)
        const result_filename = path.resolve(`${test_dir}/${test_id}-result.json`)
        
        // ===  Тестовые данные 

        // Сервер - определяем эндпоинты эмулятора Web API, возвращаемые данные
        // Конкретно - задаём один ожидаемый эндпоинт get /api/read, который возвращает строки из массива value с наложением фильтра по ts

        const emulatorMethods = {
            'get': {
                '/api/read': {
                    // Массив возвращаемых данных - на него накладывается фильтр в fn
                    'value': [
                        { "ts": 1754460000, "group_name": "группа 1", "cnt": 100 },
                        { "ts": 1754470000, "group_name": "группа 1", "cnt": 200 },
                        { "ts": 1754480000, "group_name": "группа 2", "cnt": 300 },
                        { "ts": 1755490000, "group_name": "группа 1", "cnt": 400 },
                        { "ts": 1755500000, "group_name": "группа 2", "cnt": 500 },
                    ],
                    // Функция фильтрации данных
                    'fn': (rows, params) => {
                        
                        // TRACE
                        // Параметры строки URL
                        console.log('  -> fn params', params)
                        // Данные - передаётся содержимое value
                        if(!rows) return null 
                        if(!params) params = {} 

                        const filter_from = parseInt(params?.from_ge ?? "") ?? 0;
                        const filter_to   = parseInt(params?.to_lt   ?? "") ?? 1900000000;

                        // Фильтр строк по значениями TS - по значениям параметров из запроса
                        return rows.filter( row => row?.ts >= filter_from && row?.ts < filter_to);
                    }
                }
            }
        }
        emulatorWebApi.init( emulatorMethods )

        // === Оъект тестирования

        const app = new MainServer()
        // Запрашиваем с наложением фильтра по TS
        const resultData = await app.getData(`http://localhost:${emulator_port}/api/read?from_ge=1754475000&to_lt=1755510000`)

        // === Проверка результата

        // Полученное от HTTP запроса - в файл, с предварительной сортировкой JSON атрибутов
        fs.writeFileSync(result_filename, JSON.stringify(sortedJson(resultData), null, "    "))
        // Сравнение файлов
        assertTextFilesEqual(expected_filename, result_filename,
            `Файлы:\n  result: ${result_filename}\n  expected: ${expected_filename}`
        )
    })
})

describe('ut01.2 Обработка полученных данных', () => {

    test('ut01.1.1 одна строка', async () => {

        const test_id = 'ut01.2.1'

        // Тестовый каталог
        const test_dir = prepareTest(test_id)
        // Файлы - входящие данные, ожидаемый эталон и результат вызова тестируемого кода 
        const data_filename = path.resolve(`./nodejs/tests/resources/ut01.2/${test_id}-data-in.json`)
        const expected_filename = path.resolve(`./nodejs/tests/resources/ut01.2/${test_id}-expected.json`)
        const result_filename = path.resolve(`${test_dir}/${test_id}-result.json`)
        
        // ===  Тестовые данные 

        // Входящие тестовые данные для обработки
        const dataTestIn = JSON.parse(fs.readFileSync(data_filename, { encoding: 'utf8', flag: 'r' }).toString())
        // 1. ответ от Web API - сами данные
        const dataIn = dataTestIn.dataIn
        // 2. дата-время начала периода
        const from_ts = dataTestIn?.from_ts
        // 3. дата-время окончания периода
        const to_ts = dataTestIn?.to_ts

        // === Оъект тестирования

        const app = new MainServer()
        const dataOut = app.prepareData(dataIn, from_ts, to_ts)

        // === Проверка результата

        // Полученное от HTTP запроса - в файл, с предварительной сортировкой JSON атрибутов
        fs.writeFileSync(result_filename, JSON.stringify(sortedJson(dataOut), null, "    "))
        // Сравнение файлов
        assertTextFilesEqual(expected_filename, result_filename,
            `Файлы:\n  result: ${result_filename}\n  expected: ${expected_filename}\n  in data: ${data_filename}`
        )
    })
})

describe('ut01.3 Запись в БД', () => {

    // Конфиг подключения к БД
    const dbConfig = {
        'host': 'localhost',
        'port': '20432',
        'login': 'demo_user',
        'password': 'demo_pw',
        'db': 'demo_db',
    }
    var dbms = new Client({
        user:       dbConfig.login,
        password:   dbConfig.password,
        host:       dbConfig.host,
        port:       dbConfig.port,
        database:   dbConfig.db,
    })

    // Перед каждым тестом - создаём и открывает новое чистое полключение, для избежания накопленного в сессии от других тестов
    beforeEach( async() => {

        await dbms
            .connect()
            .then(() => {
                console.log('INFO: Connected to PostgreSQL database');
            })
            .catch((err) => {
                const errComment = `ERROR: DBM-103 connecting to PostgreSQL database failed (${
                    dbConfig.host}:${dbConfig.port}, ${dbConfig.db}, ${dbConfig.login})`
                console.error(errComment, err)
                throw new Error(errComment)
            })
    })

    // Закрытие подключения по окончанию теста
    afterEach( async() => {
        // Отключение от Postgres
        if(dbms) try {
            await dbms
                .end()
                .then(() => {
                    console.log('INFO: Connection to PostgreSQL closed');
                })
                .catch((err) => {
                    const errComment = 'ERROR: DBM-104 error closing connection'
                    console.error(errComment, err)
                    throw new Error(errComment)
                })
        } catch (err) {
            console.log('ERROR on disconnect:\n', err)
        }
    })

    test('ut01.3.1 запись 1й строки', async () => {

        const test_id = 'ut01.3.1';

        // Тестовый каталог
        const test_dir = prepareTest(test_id)
        // Файлы - входящие данные, ожидаемый эталон и результат вызова тестируемого кода 
        const data_filename = path.resolve(`./nodejs/tests/resources/ut01.3/${test_id}-data-in.json`);
        const expected_filename = path.resolve(`./nodejs/tests/resources/ut01.3/${test_id}-expected.json`);
        const result_filename = path.resolve(`${test_dir}/${test_id}-result.json`);
        
        // ===  Тестовые данные 

        // Инициализировать данные в таблице БД - удалить и создать начальное состояние строк в таблице
        await execSQLRequests( dbms,  [{ 'sql': `truncate table demo_schema.demo_data` }]);

        // Входящие тестовые данные для обработки
        const dataIn = JSON.parse(fs.readFileSync(data_filename, { encoding: 'utf8', flag: 'r' }).toString());

        // === Оъект тестирования

        const app = new MainServer();
        const writeResult = await app.saveData(dataIn);

        // === Проверка результата

        // Проверяем что результат записи успешный
        assert(writeResult, "Результат записи в файл не положительный");
        
        // Прочитать строки из таблицы БД и сравнить с эталоном - на примере одной проверки
        await checkSQLResults(dbms, test_id, 'general', [
            {
                'desc': 'Целиком demo_db.demo_table',
                'sql': `select from_ts, to_ts, group_name, cnt from demo_schema.demo_data`,
                'expectedFileName': expected_filename
            },
            false
        ])
    })
})