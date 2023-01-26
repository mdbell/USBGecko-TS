"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeckoPort = exports.getGeckoPortInfo = exports.NodeUSBGecko = exports.Status = void 0;
const serialport_1 = require("serialport");
const usbgecko_1 = require("./usbgecko");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function writePromisified(port, data) {
    return new Promise((resolve, reject) => {
        port.write(data, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve(null);
            }
        });
    });
}
async function readChecked(port, size, maxRetries) {
    let retry = 0;
    let read = port.read(size);
    while (retry < 100 && read == null) {
        retry++;
        await delay(10);
        read = port.read(size);
    }
    return read;
}
var Status;
(function (Status) {
    Status[Status["Running"] = 0] = "Running";
    Status[Status["Paused"] = 1] = "Paused";
    Status[Status["Breakpoint"] = 2] = "Breakpoint";
    Status[Status["Loader"] = 3] = "Loader";
    Status[Status["Unknown"] = 4] = "Unknown";
})(Status = exports.Status || (exports.Status = {}));
class NodeUSBGecko extends usbgecko_1.AbstractUSBGecko {
    port;
    retryCount;
    constructor(port, options) {
        super();
        this.port = port;
        if (!options) {
            options = {};
        }
        this.retryCount = options.retryCount || 10;
    }
    read(size) {
        return readChecked(this.port, size, this.retryCount);
    }
    write(buffer) {
        return writePromisified(this.port, buffer);
    }
}
exports.NodeUSBGecko = NodeUSBGecko;
async function getGeckoPortInfo() {
    let ports = await serialport_1.SerialPort.list();
    ports = ports.filter(p => p.serialNumber == "GECKUSB0");
    if (ports.length == 0) {
        return null;
    }
    return ports[0];
}
exports.getGeckoPortInfo = getGeckoPortInfo;
async function getGeckoPort() {
    let info = await getGeckoPortInfo();
    if (!info) {
        return null;
    }
    return new serialport_1.SerialPort({
        path: info.path,
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false
    });
}
exports.getGeckoPort = getGeckoPort;
//# sourceMappingURL=nodegecko.js.map