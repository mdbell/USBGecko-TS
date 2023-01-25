"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeckoPort = exports.getGeckoPortInfo = exports.USBGecko = exports.Status = void 0;
const serialport_1 = require("serialport");
const cmd_version = 0x99;
const cmd_pause = 0x06;
const cmd_resume = 0x07;
const cmd_poke08 = 0x01;
const cmd_poke16 = 0x02;
const cmd_poke32 = 0x03;
const cmd_status = 0x50;
const cmd_readmem = 0x04;
const packetsize = 0xF800;
const GCACK = 0xAA;
const GCRETRY = 0xBB;
const GCFAIL = 0xCC;
const GCDONE = 0xFF;
const ACK_BUFFER = Buffer.from(new Uint8Array([GCACK]));
const FAIL_BUFFER = Buffer.from(new Uint8Array([GCFAIL]));
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
class USBGecko {
    port;
    constructor(port) {
        this.port = port;
    }
    async getVersion() {
        const message = this.createMessage(cmd_version);
        await writePromisified(this.port, message.buffer);
        let read = await readChecked(this.port, 1, 10);
        if (read == null) {
            throw "unable to read version!";
        }
        return read[0];
    }
    async getStatus() {
        const message = this.createMessage(cmd_status);
        await writePromisified(this.port, message.buffer);
        let read = await readChecked(this.port, 1, 10);
        if (read == null) {
            throw "Unable to get status!";
        }
        return read[0];
    }
    async pause() {
        const message = this.createMessage(cmd_pause);
        await writePromisified(this.port, message.buffer);
    }
    async resume() {
        const message = this.createMessage(cmd_resume);
        await writePromisified(this.port, message.buffer);
    }
    async peek8(address) {
        let buffer = await this.readmem(address, address + 1);
        return buffer[0];
    }
    async poke8(address, value) {
        await this.poke(cmd_poke08, address, value);
    }
    async peek16(address) {
        address &= 0xFFFFFFFE;
        let buffer = await this.readmem(address, address + 2);
        let view = new DataView(buffer.buffer);
        return view.getUint16(0);
    }
    async poke16(address, value) {
        address &= 0xFFFFFFFE;
        await this.poke(cmd_poke16, address, value);
    }
    async peek32(address) {
        let buffer = await this.readmem(address, 4);
        let view = new DataView(buffer.buffer, buffer.byteOffset);
        return view.getUint32(0);
    }
    async poke32(address, value) {
        address &= 0xFFFFFFFC;
        await this.poke(cmd_poke32, address, value);
    }
    async readmem(startAddress, size) {
        let message = this.createMessage(cmd_readmem);
        await writePromisified(this.port, message.buffer);
        let read = await readChecked(this.port, 1, 10);
        if (!read) {
            throw "No response to readmem request :(";
        }
        let code = read[0];
        if (code != GCACK) {
            throw `Unexpected response '${code}' on readmem. Excpected GCACK(${GCACK})`;
        }
        //write the addresses
        message = this.createMessage(0, 7);
        message.view.setUint32(0, startAddress);
        message.view.setUint32(4, startAddress + size);
        await writePromisified(this.port, message.buffer);
        let remaining = size;
        const _buf = Array();
        while (remaining > 0) {
            const len = Math.min(packetsize, remaining);
            let res = await readChecked(this.port, len, 10);
            if (!res) {
                //TODO count retries
                await writePromisified(this.port, FAIL_BUFFER);
            }
            else {
                remaining -= len;
                _buf.push(res);
                await writePromisified(this.port, ACK_BUFFER);
            }
        }
        return Buffer.concat(_buf);
    }
    createMessage(cmd, size) {
        const buffer = Buffer.alloc(size ? size + 1 : 1);
        const view = new DataView(buffer.buffer);
        buffer[0] = cmd;
        return { buffer: buffer, view: view };
    }
    async poke(cmd, address, value) {
        const message = this.createMessage(cmd, 8);
        message.view.setUint32(1, address);
        message.view.setUint32(5, value);
        await writePromisified(this.port, message.buffer);
    }
}
exports.USBGecko = USBGecko;
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
//# sourceMappingURL=usbgecko.js.map