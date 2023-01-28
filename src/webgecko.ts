import { AbstractUSBGecko } from "./usbgecko";

async function readInfo(port : SerialPort, dest : Buffer, size : number) {
    let reader = port.readable.getReader();
    let remaining = size;
    while(port.readable && remaining > 0) {
        let {done, value} = await reader.read();
        if(done){
            break;
        }
        let len = Math.min(remaining, value.length);
        if(len < value.length){
            //TODO cache the data that has read instead of this silly hack
            console.warn(`buffer size mismatch! Expected ${len} Actual:${value.length}`)
            console.warn(`there will be missing data!`)
            value = value.slice(0, len);
        }
        dest.set(value, size - remaining);
        remaining -= len;
    }
    reader.releaseLock();
    return size - remaining;
}

export class WebUSBGecko extends AbstractUSBGecko{
    private port : SerialPort;

    constructor(port : SerialPort) {
        super();
        this.port = port;
    }

    connected(): boolean {
        if(!this.port.readable || !this.port.writable){
            return false;
        }
        return true;
    }

    close() {
        this.port.close();
    }

    protected read(size: number): Promise<Buffer> {
        let res = Buffer.alloc(size);
        return readInfo(this.port, res, size).then((size) => res.subarray(0, size));
    }

    protected write(buffer: Buffer): Promise<void> {
        let writer = this.port.writable.getWriter();
        return writer.write(buffer).then(() =>{
            writer.releaseLock();
        });
    }

}