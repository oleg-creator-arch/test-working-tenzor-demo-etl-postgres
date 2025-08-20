// 
//  Библиотека "обвязки" для автотестов c БД Postgres
// 

import path from 'path';
import fs from 'fs';
import {prepareTest, assertTextFilesEqual, sortedJson} from './test_utils.mjs';
// const {prepareTest, assertTextFilesEqual, sortedJson} = require('./tests_utils.mjs')

// module.exports = {
//     checkSQLResults: checkSQLResults,
//     execSQLRequests: execSQLRequests
// }

// Последовательно выполнение SQL запросов
//      атрибут 'sql' - строка SQL запроса
//      атрибут 'file' - название файла SQL скрипта
export async function execSQLRequests(dbm, prepareSQL){
    if(!dbm)
        throw new Error(`ERROR execSQLRequests-001: database manager is not defined`)
    if(!prepareSQL){
        throw new Error(`WARNING execSQLRequests-002: prepareSQL is not defined, stop execSQLRequests`)
    }
    if(!Array.isArray(prepareSQL))
        throw new Error(`ERROR execSQLRequests-002: prepareSQL must be array`)
    if(prepareSQL.length === 0){
        throw new Error(`WARNING execSQLRequests-002: prepareSQL is empty array, stop execSQLRequests`)
    }

    // Последовательно выполнение SQL запросов или скритов 
    for (let step = 0; step < prepareSQL.length; step++) {    
        const item = prepareSQL[step]
        try {
            // Выполнение SQL запроса
            if( item.hasOwnProperty('sql')){
                console.log(`Prepare [${step}]: sql ${item.sql}`)
                await dbm.query(item.sql)
            }
            // Выполнение скприта файла
            else if( item.hasOwnProperty('file')){
                console.log(`Prepare [${step}]: file ${path.resolve(item.file)}`)
                const sql = fs.readFileSync(path.resolve(item.file)).toString()
                await dbm.query(sql)
            } else {
                console.log(`Prepare [${step}]: unknown type`)
                throw new Error(`TEST wrong type of SQL: required sql or file attribute`);
            }
        } catch(err) {
            console.log(`ERROR [${step}]:`, err)
            throw new Error(`TEST ERROR on sql init item ${ JSON.stringify(item) }:\n${err}`);
        }
    }
}

// Проверка содержимого БД - сравнение результата SQL запроса с содержимым файла ожидаемых данных 
export async function checkSQLResults(dbm, testId, testgroup, checks, flgRecreateTemp = true){
    if(!checks || checks.length === 0)
        throw new Error(`ERROR on checkSQLResults: check is empty`);

    const testDir = prepareTest(testId, flgRecreateTemp)
    if(!testgroup) testgroup = ''

    for (let checkStep = 0; checkStep < checks.length; checkStep++) {    
        const item = checks[checkStep]
        try {
            if( (item?.desc ?? '' ) === '' ) item.desc = item.sql
            // Выполнение SQL запроса
            console.log(`Check [${checkStep}]: ${ item?.desc }`)
            const result = await dbm.query(item.sql)
            
            // Полученный объект должен быть не пустым
            expect(result, `[${checkStep}] check "${item.desc}": empty object`).not.toBeNull()

            const testOutFilename = path.resolve(`${testDir}/${testId}-out-${testgroup}-${checkStep}.json`)

            console.log(`Files [${checkStep}] "${item.desc}":\n  result: ${testOutFilename}\n  expected: ${item.expectedFileName}`)

            fs.writeFileSync(testOutFilename, JSON.stringify(sortedJson(result.rows), null, "    "))

            // Вызов построчной проверки полученного с эталоном
            assertTextFilesEqual(item.expectedFileName, testOutFilename, 
                `[${checkStep}] check "${item.desc}", files:\n  result: ${testOutFilename}:0\n  expected: ${item.expectedFileName}:0`
            )
        } catch(err) {
            console.log(`ERROR check [${checkStep}]:`, err)
            throw new Error(`TEST ERROR on check [${checkStep}]:\n${err}`);
        }
    }
}