"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractUSBGecko = exports.Status = exports.GCDONE = exports.GCFAIL = exports.GCRETRY = exports.GCACK = exports.packetsize = exports.cmd_readmem = exports.cmd_status = exports.cmd_poke32 = exports.cmd_poke16 = exports.cmd_poke08 = exports.cmd_resume = exports.cmd_pause = exports.cmd_version = void 0;
exports.cmd_version = 0x99;
exports.cmd_pause = 0x06;
exports.cmd_resume = 0x07;
exports.cmd_poke08 = 0x01;
exports.cmd_poke16 = 0x02;
exports.cmd_poke32 = 0x03;
exports.cmd_status = 0x50;
exports.cmd_readmem = 0x04;
exports.packetsize = 0xF800;
exports.GCACK = 0xAA;
exports.GCRETRY = 0xBB;
exports.GCFAIL = 0xCC;
exports.GCDONE = 0xFF;
var Status;
(function (Status) {
    Status[Status["Running"] = 0] = "Running";
    Status[Status["Paused"] = 1] = "Paused";
    Status[Status["Breakpoint"] = 2] = "Breakpoint";
    Status[Status["Loader"] = 3] = "Loader";
    Status[Status["Unknown"] = 4] = "Unknown";
})(Status = exports.Status || (exports.Status = {}));
const raw_buffer = Buffer.alloc(1);
class AbstractUSBGecko {
    async write_single(cmd) {
        raw_buffer[0] = cmd;
        await this.write(raw_buffer);
    }
    createMessage(cmd, size) {
        const buffer = Buffer.alloc(size ? size + 1 : 1);
        const view = new DataView(buffer.buffer);
        buffer[0] = cmd;
        return { buffer: buffer, view: view };
    }
    async getVersion() {
        await this.write_single(exports.cmd_version);
        let read = await this.read(1);
        return read[0];
    }
    async getStatus() {
        await this.write_single(exports.cmd_status);
        let read = await this.read(1);
        return read[0];
    }
    async pause() {
        await this.write_single(exports.cmd_pause);
    }
    async resume() {
        await this.write_single(exports.cmd_resume);
    }
    async getTitle() {
        let buffer = await this.readmem(0x80000000, 4);
        return buffer.toString("ascii");
    }
    async peek8(address) {
        let buffer = await this.readmem(address, address + 1);
        return buffer[0];
    }
    async poke8(address, value) {
        await this.poke(exports.cmd_poke08, address, value);
    }
    async peek16(address) {
        address &= 0xFFFFFFFE;
        let buffer = await this.readmem(address, address + 2);
        let view = new DataView(buffer.buffer);
        return view.getUint16(0);
    }
    async poke16(address, value) {
        address &= 0xFFFFFFFE;
        await this.poke(exports.cmd_poke16, address, value);
    }
    async peek32(address) {
        let buffer = await this.readmem(address, 4);
        let view = new DataView(buffer.buffer, buffer.byteOffset);
        return view.getUint32(0);
    }
    async poke32(address, value) {
        address &= 0xFFFFFFFC;
        await this.poke(exports.cmd_poke32, address, value);
    }
    async readmem(startAddress, size) {
        await this.write_single(exports.cmd_readmem);
        let read = await this.read(1);
        if (!read) {
            throw "No response to readmem request :(";
        }
        let code = read[0];
        if (code != exports.GCACK) {
            throw `Unexpected response '${code}' on readmem. Excpected GCACK(${exports.GCACK})`;
        }
        //write the addresses
        let message = this.createMessage(0, 7);
        message.view.setUint32(0, startAddress);
        message.view.setUint32(4, startAddress + size);
        await this.write(message.buffer);
        let remaining = size;
        const _buf = Array();
        while (remaining > 0) {
            const len = Math.min(exports.packetsize, remaining);
            let res = await this.read(len);
            if (!res) {
                //TODO count retries
                await this.write_single(exports.GCFAIL);
            }
            else {
                remaining -= len;
                _buf.push(res);
                await this.write_single(exports.GCACK);
            }
        }
        return Buffer.concat(_buf);
    }
    async poke(cmd, address, value) {
        const message = this.createMessage(cmd, 8);
        message.view.setUint32(1, address);
        message.view.setUint32(5, value);
        await this.write(message.buffer);
    }
}
exports.AbstractUSBGecko = AbstractUSBGecko;
//# sourceMappingURL=usbgecko.js.map