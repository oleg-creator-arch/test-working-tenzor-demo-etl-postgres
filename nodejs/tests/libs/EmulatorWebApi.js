//
// Эмулятор Web API для автоматизированного тестирования
// Основной внутренний объект - сервер express, с динамически определяемыми методами
//

import express from 'express';
import http from 'http';

export default class EmulatorWebApi {
    constructor(config = {}){
        this.app = null;
        this.httpServer = null;
        this.host = config?.host ?? '0.0.0.0';
        this.port = config?.port ?? 8089;
    }
    
    // Инициализация методов API
    // allRoutes - объект, 
    // ключ первого уровеня - метод (get, post и др.), 
    // ключ второго уровеня - путь
    // значение содержит:
    //      value - массив значений (строк) - возвращается целиком если нет fn
    //      fn - функция, которая вызывается с передачей параметром объекта параметров из строки
    init(allRoutes){

        // TRAC
        // console.log('Emulator init', )
        
        if(this.httpServer) this.httpServer.stop();
        this.app = null;

        // if(!allRoutes) return;

        this.app = express();
        this.app.get(/(.*)/, (req, res) => {

            // TRACE
            console.log('Emulator:', req.method, req.path)

            const routes = allRoutes['get']

            // Ответ по умолчанию - 404
            if(!routes || !routes.hasOwnProperty(req.path)){
                res.status(404).send('')
            }
            // Возвращаем ответ из routes метода
            else {
                const route = routes[req.path]

                // TRACE
                console.log('Emulator: route data', route)

                // Вызываем функцию
                if( route.hasOwnProperty('fn') ){
                    res
                        .status(200)
                        .json(route.fn(route?.value, req?.query));
                }
                // Отдаём массив строк целиком
                else {
                    // Для упрощения - считаем что все ответы в формате JSON
                    res
                        .status(200)
                        .json(route?.value ?? {});
                }
            }

        });

        this.httpServer = http.createServer(this.app).listen(this.port, this.host);
    }

    stop(){
        if(this.httpServer)
            try {
                this.httpServer.close()
                this.httpServer = null
            } catch(err) {
                console.log('ERROR on stop:', err)
            }
    }
}
