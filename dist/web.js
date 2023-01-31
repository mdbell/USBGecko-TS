"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumpScreen = exports.step = exports.peekmem = exports.pokemem = exports.resume = exports.pause = exports.connect = exports.getScreenData = exports.create = exports.createFrom = void 0;
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
async function getScreenData(gecko) {
    if (!gecko.connected()) {
        throw "Gecko not connected!";
    }
    let mem = await gecko.readmem_s(0xCC002000, 0x80);
    let swidth = mem[0x49] << 3;
    let sheight = (mem[0] << 5 | mem[1] >> 3) & 0x7FE;
    let soffset = mem[0x1D] << 16 | mem[0x1E] << 8 | mem[0x1F];
    if (mem[0x1C] & 0x10) {
        soffset = soffset << 5;
    }
    soffset += 0x80000000;
    ;
    soffset -= (mem[0x1C] & 0xF) << 3;
    mem = await gecko.readmem_s(soffset, sheight * swidth * 2);
    if (sheight > 600) {
        sheight = sheight / 2;
        swidth *= 2;
    }
    let buffer = new Uint8ClampedArray(sheight * swidth * 4);
    let y = 0;
    let u = 0;
    let v = 0;
    let yvpos = 0;
    let rgbpos = 0;
    for (let i = 0; i < swidth * sheight; i++) {
        yvpos = i * 2;
        //YV encoding is a bit awkward!
        if (i % 2 == 0) //Even
         {
            y = mem[yvpos];
            u = mem[yvpos + 1]; //U value is taken from current V block
            v = mem[yvpos + 3]; //Take V from next data YV block
        }
        else //Odd
            y = mem[yvpos];
        //u is taken from last pixel
        //v too!
        rgbpos = (i * 4);
        buffer[rgbpos] = ConvertSafely(1.164 * (y - 16) + 1.596 * (v - 128)); //Red pixel value
        buffer[rgbpos + 1] = ConvertSafely(1.164 * (y - 16) - 0.392 * (u - 128) - 0.813 * (v - 128)); //Greeen pixel value
        buffer[rgbpos + 2] = ConvertSafely(1.164 * (y - 16) + 2.017 * (u - 128)); //Blue pixel value
        buffer[rgbpos + 3] = 0xFF; // A
    }
    return new ImageData(buffer, swidth, sheight);
}
exports.getScreenData = getScreenData;
function ConvertSafely(value) {
    return Math.round(Math.max(0, Math.min(value, 255)));
}
//functions called from the webpage
let gecko = null;
async function connect() {
    if (gecko) {
        gecko.close();
    }
    gecko = await create();
}
exports.connect = connect;
async function pause() {
    if (!gecko || !gecko.connected()) {
        alert("Need to have an active connection before pausing");
        return;
    }
    await gecko.pause();
}
exports.pause = pause;
async function resume() {
    if (!gecko || !gecko.connected()) {
        alert("Need to have an active connection before resuming");
        return;
    }
    await gecko.resume();
}
exports.resume = resume;
async function pokemem() {
    if (!gecko || !gecko.connected()) {
        alert("Need to have an active connection before poking");
        return;
    }
    let mem_addr = document.getElementById("mem_addr");
    let mem_value = document.getElementById("mem_value");
    const address = parseInt(mem_addr.value, 16);
    const value = parseInt(mem_value.value);
    await gecko.poke32(address, value);
}
exports.pokemem = pokemem;
async function peekmem() {
    if (!gecko || !gecko.connected()) {
        alert("Need to have an active connection before peeking");
        return;
    }
    let mem_addr = document.getElementById("mem_addr");
    let mem_value = document.getElementById("mem_value");
    const address = parseInt(mem_addr.value, 16);
    const value = await gecko.peek32(address);
    mem_value.value = value.toString();
}
exports.peekmem = peekmem;
async function step() {
    if (!gecko || !gecko.connected()) {
        alert("Need to have an active connection before stepping");
        return;
    }
    await gecko.step();
}
exports.step = step;
async function dumpScreen() {
    if (!gecko || !gecko.connected()) {
        alert("You need to have an active gecko connection!");
        return;
    }
    await gecko.pause();
    let img = await getScreenData(gecko);
    let canvas = document.getElementById('screen');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').putImageData(img, 0, 0);
    await gecko.resume();
}
exports.dumpScreen = dumpScreen;
//# sourceMappingURL=web.js.map