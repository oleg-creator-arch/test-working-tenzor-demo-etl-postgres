// 
// Основной класс сервера приложений
// Реализует обращение к источнику, обработку и запись в БД 
//

export default class MainServer {
    constructor(){
    }

    // Чтение данных из Web API источника
    async getData(srcUrl, timeout = 1000){
        // Заглушка - вместо константы необходимо реализовать получение данных через GET HTTP запрос по URL из srcUrl
        return [
            { "ts": 1754480000, "group_name": "группа 2", "cnt": 300 },
            { "ts": 1755490000, "group_name": "группа 1", "cnt": 400 },
            { "ts": 1755500000, "group_name": "группа 2", "cnt": 500 },
        ];
    }

    // Обработка прочитанных данных
    //      dataIn - массив входящих строк 
    //      from_ts - метка времени начала (включая)
    //      to_ts - метка времени окончания периода (не включая)
    prepareData(dataIn, from_ts, to_ts){
        // Заглушка - пример трансформации корректно работающей на одной строке
        if(!dataIn) return []
        return dataIn.map( row => {
            return {
                "group_name": row?.group_name,
                "cnt": row?.cnt,
                "from_ts": from_ts,
                "to_ts": to_ts
            }
        });
    }

    // Запись обработанных данных в БД
    async saveData(dataIn){
        // Заглушка - без какой-либо записи в БД 
        return true
    }

    // Вызов выполнения итерации обработки: снятие -> обработка -> запись в БД 
    //      srcConfig - объект с атрибутами подключения к Web API
    //      trgConfig - объект подключения к 
    async iteration(srcConfig, trgConfig){
        // Заглушка - общий порядок действий 
        // Чтение
        const dataRaw = await this.getData(srcConfig)
        // Подготовка
        const dataPrepared = this.prepareData(dataRaw, from_ts, to_ts)
        // Запись
        await this.sendData(trgConfig, dataPrepared)
    }
}