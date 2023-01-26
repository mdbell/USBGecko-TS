import { AbstractUSBGecko } from "./usbgecko";

async function readInfo(port : SerialPort, dest : Buffer, size : number) {
    let read = 0;
    let reader = port.readable.getReader();
    while(port.readable && read < size) {
        let {done, value} = await reader.read();
        if(done){
            break;
        }
        dest.set(value, read);
        read += value.length;
    }
    reader.releaseLock();
    return read;
}

export class WebUSBGecko extends AbstractUSBGecko{

    private port : SerialPort;

    constructor(port : SerialPort) {
        super();
        this.port = port;
    }

    protected read(size: number): Promise<Buffer> {
        let res = Buffer.alloc(size);
        return readInfo(this.port, res, size).then(() => res);
    }

    protected write(buffer: Buffer): Promise<void> {
        let writer = this.port.writable.getWriter();
        return writer.write(buffer).then(() =>{
            writer.releaseLock();
        });
    }

}