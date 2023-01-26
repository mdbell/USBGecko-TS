"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebUSBGecko = void 0;
const usbgecko_1 = require("./usbgecko");
async function readInfo(port, dest, size) {
    let read = 0;
    let reader = port.readable.getReader();
    while (port.readable && read < size) {
        let { done, value } = await reader.read();
        if (done) {
            break;
        }
        dest.set(value, read);
        read += value.length;
    }
    reader.releaseLock();
    return read;
}
class WebUSBGecko extends usbgecko_1.AbstractUSBGecko {
    port;
    constructor(port) {
        super();
        this.port = port;
    }
    read(size) {
        let res = Buffer.alloc(size);
        return readInfo(this.port, res, size).then(() => res);
    }
    write(buffer) {
        let writer = this.port.writable.getWriter();
        return writer.write(buffer).then(() => {
            writer.releaseLock();
        });
    }
}
exports.WebUSBGecko = WebUSBGecko;
//# sourceMappingURL=webgecko.js.map