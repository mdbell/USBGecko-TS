import { WebUSBGecko } from "./webgecko"

export function createFrom(port :SerialPort){
    return new WebUSBGecko(port);
}

export async function create(){
    const port = await navigator.serial.requestPort();
    if(!port){
        alert("No serial port selected!")
        return;
    }
    await port.open({baudRate: 115200});
    return createFrom(port);
}