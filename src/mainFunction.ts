// Copyright (c) 2021. Heusala Group Oy <info@heusalagroup.fi>. All rights reserved.

import HTTP, { IncomingMessage, ServerResponse } from 'http';

import ProcessUtils from "./fi/nor/ts/ProcessUtils";

// Must be first import to define environment variables before anything else
ProcessUtils.initEnvFromDefaultFiles();

import {
    BACKEND_LOG_LEVEL,
    BACKEND_PORT,
    REACT_APP_DIR
} from "./runtime-constants";
import LogService from "./fi/nor/ts/LogService";

LogService.setLogLevel(BACKEND_LOG_LEVEL);

import ExitStatus from "./types/ExitStatus";
import LogLevel from "./fi/nor/ts/types/LogLevel";
import RequestClient from "./fi/nor/ts/RequestClient";
import RequestServer from "./fi/nor/ts/RequestServer";
import RequestRouter from "./fi/nor/ts/requestServer/RequestRouter";
import Headers from "./fi/nor/ts/request/Headers";
import HttpServerController from "./controller/HttpServerController";
import TestApp from "./TestApp";

const LOG = LogService.createLogger('main');

export async function main (
    args: string[] = []
) : Promise<ExitStatus> {

    let server : HTTP.Server | undefined;

    try {

        Headers.setLogLevel(LogLevel.INFO);
        RequestRouter.setLogLevel(LogLevel.INFO);
        RequestClient.setLogLevel(LogLevel.INFO);
        RequestServer.setLogLevel(LogLevel.INFO);
        // SimpleMatrixClient.setLogLevel(LogLevel.INFO);
        // MatrixCrudRepository.setLogLevel(LogLevel.INFO);

        LOG.debug(`Loglevel as ${LogService.getLogLevelString()}`);

        server = HTTP.createServer(
            (
                req : IncomingMessage,
                res : ServerResponse
            ) => {

                HttpServerController.handleRequest(req, res, REACT_APP_DIR, TestApp);

            }
        );

        server.listen(BACKEND_PORT);
        server.on('error', onError);
        server.on('listening', onListening);

        const stopPromise = new Promise<void>((resolve, reject) => {
            try {
                LOG.debug('Stopping server from RequestServer stop event');
                server.once('close', () => {
                    resolve();
                });
            } catch(err) {
                reject(err);
            }
        });

        ProcessUtils.setupDestroyHandler( () => {

            server.removeListener('error', onError);
            server.removeListener('listening', onListening);

            LOG.debug('Stopping server from process utils event');

            if (server?.close) {
                server.close();
            }

        }, (err : any) => {
            LOG.error('Error while shutting down the service: ', err);
        });

        await stopPromise;

        return ExitStatus.OK;

    } catch (err) {
        LOG.error(`Fatal error: `, err);
        return ExitStatus.FATAL_ERROR;
    }

    /**
     * Event listener for HTTP server "error" event.
     */
    function onError (error : any) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof BACKEND_PORT === 'string'
            ? 'Pipe ' + BACKEND_PORT
            : 'Port ' + BACKEND_PORT;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */

    function onListening () {
        const addr = server.address();
        const bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        LOG.info('Listening on ' + bind);
    }

}

export default main;