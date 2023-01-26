import { read } from "fs";
import { SerialPort } from "serialport";
import { AbstractUSBGecko } from "./usbgecko";

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

    protected read(size: number): Promise<Buffer> {
        return readChecked(this.port, size, this.retryCount);
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