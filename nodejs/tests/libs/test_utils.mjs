// 
//  Библиотека "обвязки" для автотекстов
// 

import fs from 'fs'
import path from 'path'

// Подготовка временного каталога с тестовыми результатами
export function prepareTest(test_id){
    // Создаём TMP каталог, если его нет
    const tmp_dir = './tmp'

    if( !fs.existsSync(tmp_dir) ) {
        fs.mkdirSync(tmp_dir, {})
    }

    // Пересоздаём каталог теста
    const test_dir = `${tmp_dir}/${test_id}`

    // Удаление если тестовый каталог уже существует - включая содержимое от предыдущего запуска теста 
    if( fs.existsSync(test_dir) ) fs.readdirSync(test_dir, (err, files) => {
            if (err) throw err;
            
            for (const file of files) {
                fs.unlinkSync(path.join(test_dir, file), (err) => {
                    if (err) throw err;
                });
            }
        })

    // Создание тестового каталога
    fs.mkdirSync(test_dir, {recursive: true})

    return test_dir
}

// Сравнить два текстовых файла
//      expected_result_filepath - путь и название файла эталона (ожидаемого содержимого)
//      actual_result_filepath - путь и название проверяемого файла
//      msg - опциональное дополнительное сообщение в случае ошибки
export function assertTextFilesEqual(
    expected_result_filepath,
    actual_result_filepath,
    msg = "",
) {
    if( !fs.existsSync(expected_result_filepath) ) {
        throw new Error(`Expected result file not found\n  ${expected_result_filepath}, ${fs.existsSync(expected_result_filepath)}`)
    }
    if( !fs.existsSync(actual_result_filepath) ) {
        throw new Error(`Actual result file not found\n  ${actual_result_filepath}`)
    }

    const expected_result = fs.readFileSync(expected_result_filepath, { encoding: 'utf8', flag: 'r' })
    const actual_result = fs.readFileSync(actual_result_filepath, { encoding: 'utf8', flag: 'r' })

    const arr_expected = expected_result.split('\n')
    const actual_expected = actual_result.split('\n')

    for( let index = 0; index < Math.min(arr_expected.length, actual_expected.length); index++ ){
        expect(actual_expected[index], `diff in line ${index+1}\n${msg.replaceAll(':0', `:${index+1}`)}`).toEqual(arr_expected[index])
    }

    expect(arr_expected.length, `lines count is differ, ${actual_expected.length} vs expected ${arr_expected.length}\n${msg}`).toEqual(actual_expected.length)
}

export function sortedJson(obj){
    return SortByKeys.smart(obj)
}

// Класс для получения строки из объекта с применением сортировки ключей 
class SortByKeys {
	static keyToKey(a, b) {
		return a.toString().localeCompare(b.toString())
	}
	
	static ofArray(values = []) {
        return values.map( v => {
            return (typeof v === 'object' )
                ? SortByKeys.smart(v)
                : v
        })
	}
	
	static ofObject(objectData) {
		const mapCollection = new Map();
		
		for (const key in objectData) {
			const value = objectData[key];
			
			mapCollection.set(
				key,
				["string", "number", "boolean"].includes(typeof value)
					? value
					: SortByKeys.smart(value)
			)
		}
		
		const sortedEntries = Array.from(mapCollection).toSorted((first, second) => {
			return SortByKeys.keyToKey(first[0], second[0])
		})
		
		
		return Object.fromEntries(sortedEntries);
	}
	
	static smart(data) {
		if (Array.isArray(data)) {
			return SortByKeys.ofArray(data);
		}
		
		if (typeof data === 'object') {
			return SortByKeys.ofObject(data);
		}

		console.log(`Unsupported data type, ${typeof data}`)
        return data
	}
	
	constructor(data) {
		return SortByKeys.smart(data);
	}
	
	ofUnknown
}
