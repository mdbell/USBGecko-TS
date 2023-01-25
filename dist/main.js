"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const usbgecko_1 = require("./usbgecko");
async function init(port) {
    let gecko = new usbgecko_1.USBGecko(port);
    let status = await gecko.getStatus();
    console.log(`Console status: ${usbgecko_1.Status[status]}`);
    if (status == usbgecko_1.Status.Running) {
        console.log("Pausing system...");
        await gecko.pause();
    }
    let version = await gecko.getVersion();
    console.log(`Gecko Version: ${version}`);
    //console.log("Giving us 50 lives");
    //await gecko.poke32(0x80578A04, 50);
    let lives = await gecko.peek32(0x80578A04);
    console.log(`You have ${lives} lives!`);
    //just some code messing with screenbuffer stuff (mostly to detect if we're dumping concecutive memory correctly)
    let mem = await gecko.readmem(0xCC002000, 0x80);
    let view = new DataView(mem.buffer, mem.byteOffset);
    let swidth = mem[0x49] << 3;
    let sheight = (mem[0] << 5 | mem[1] >> 3) & 0x7FE;
    let soffset = mem[0x1D] << 16 | mem[0x1E] << 8 | mem[0x1F];
    if (mem[0x1C] & 0x10) {
        soffset = soffset << 5;
    }
    soffset += 0x80000000;
    ;
    soffset -= (mem[0x1C] & 0xF) << 3;
    console.log(`Screen info: ${swidth}x${sheight} - offset: ${soffset.toString(16)}`);
    mem = await gecko.readmem(soffset, sheight * swidth * 2);
    if (sheight > 600) {
        sheight = sheight / 2;
        swidth *= 2;
    }
    if (status == usbgecko_1.Status.Paused) {
        console.log("Unpausing...");
        await gecko.resume();
    }
}
async function main() {
    let port = await (0, usbgecko_1.getGeckoPort)();
    if (!port) {
        console.error("No USBGecko Found!");
        return;
    }
    port.open((err) => {
        if (err) {
            console.log(err);
            return;
        }
        init(port).finally(() => {
            port.close();
        });
    });
}
main();
//# sourceMappingURL=main.js.map