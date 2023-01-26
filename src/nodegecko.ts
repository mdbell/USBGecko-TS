import { read } from "fs";
import { SerialPort } from "serialport";
import { AbstractUSBGecko } from "./usbgecko";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function writePromisified(port : SerialPort, data : Buffer) : Promise<void>{
    return new Promise((resolve, reject) =>{
        port.write(data, err =>{
            if(err){
                reject(err);
            }else{
                resolve(null);
            }
        })
    });
}

async function readChecked(port : SerialPort, size : number, maxRetries : number){
    let retry = 0;
    let read = port.read(size);
    while(retry < 100 && read == null){
        retry++;
        await delay(10);
        read = port.read(size);
    }
    return read;
}

export enum Status{
    Running = 0,
    Paused,
    Breakpoint,
    Loader,
    Unknown
}

export type NodeUSBGeckoOptions = {
    retryCount? : number;
}

export class NodeUSBGecko extends AbstractUSBGecko{
    port : SerialPort;
    retryCount : number;

    constructor(port : SerialPort, options? : NodeUSBGeckoOptions){
        super();
        this.port = port;

        if(!options){
            options = {};
        }

        this.retryCount = options.retryCount || 10;
    }

    connected(): boolean {
        return this.port.isOpen;
    }

    close() {
        this.port.close();
    }

    protected read(size: number): Promise<Buffer> {
        return readChecked(this.port, size, this.retryCount).then(buffer =>{
            if(!buffer){
                throw "No buffer read";
            }
            return buffer;
        });
    }
    protected write(buffer: Buffer): Promise<void> {
        return writePromisified(this.port, buffer);
    }

}

export async function getGeckoPortInfo() {
    let ports = await SerialPort.list();
    ports = ports.filter(p => p.serialNumber == "GECKUSB0");
    if(ports.length == 0){
        return null;
    }
    return ports[0];
}

export async function getGeckoPort(){
    let info = await getGeckoPortInfo();
    if(!info){
        return null;
    }
    return new SerialPort({
        path : info.path,
        baudRate : 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen : false
    });
}