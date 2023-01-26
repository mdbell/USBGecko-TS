"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.createFrom = void 0;
const webgecko_1 = require("./webgecko");
function createFrom(port) {
    return new webgecko_1.WebUSBGecko(port);
}
exports.createFrom = createFrom;
async function create() {
    const port = await navigator.serial.requestPort();
    if (!port) {
        alert("No serial port selected!");
        return;
    }
    await port.open({ baudRate: 115200 });
    return createFrom(port);
}
exports.create = create;
//# sourceMappingURL=web.js.map