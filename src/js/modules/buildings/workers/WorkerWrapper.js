//import Worker from "worker-loader!../util/GeoWorker.js";
//import GeoWorker from "worker-loader!../util/GeoWorker.js";
import GeoWorker from "../util/GeoWorker";

export default class WorkerWrapper {

    constructor (path) {
        this.busy = false;
        this.thread = new GeoWorker();
    }

    postMessage (message) {
/*
        this.thread.onmessage = function (event) {
            console.log(e);
        }
*/
        this.thread.postMessage(message);
    }

    onMessage (callback) {
        this.thread.onmessage = function (e) {
            console.log(e);
            callback(e.data);
        };
    }

    free () {
        this.thread.onmessage = function (e) {};
        this.busy = false;
    }

    destroy () {
        this.thread.close();
    }
}
