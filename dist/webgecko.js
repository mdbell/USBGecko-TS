"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebUSBGecko = void 0;
const usbgecko_1 = require("./usbgecko");
async function readInfo(port, dest, size) {
    let reader = port.readable.getReader();
    let remaining = size;
    while (port.readable && remaining > 0) {
        let { done, value } = await reader.read();
        if (done) {
            break;
        }
        let len = Math.min(remaining, value.length);
        if (len < value.length) {
            //TODO cache the data that has read instead of this silly hack
            console.warn(`buffer size mismatch! Expected ${len} Actual:${value.length}`);
            console.warn(`there will be missing data!`);
            value = value.slice(0, len);
        }
        dest.set(value, size - remaining);
        remaining -= len;
    }
    reader.releaseLock();
    return size - remaining;
}
class WebUSBGecko extends usbgecko_1.AbstractUSBGecko {
    port;
    constructor(port) {
        super();
        this.port = port;
    }
    connected() {
        if (!this.port.readable || !this.port.writable) {
            return false;
        }
        return true;
    }
    close() {
        this.port.close();
    }
    read(size) {
        let res = Buffer.alloc(size);
        return readInfo(this.port, res, size).then((size) => res.subarray(0, size));
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