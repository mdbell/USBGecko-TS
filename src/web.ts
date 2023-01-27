import { AbstractUSBGecko } from "./usbgecko";
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

export async function getScreenData(gecko : AbstractUSBGecko) {
    if(!gecko.connected()){
        throw "Gecko not connected!"
    }
    let mem = await gecko.readmem_s(0xCC002000, 0x80);
    let swidth = mem[0x49] << 3;
    let sheight = (mem[0] << 5 | mem[1] >> 3) & 0x7FE
    let soffset = mem[0x1D] << 16 | mem[0x1E] << 8 | mem[0x1F]

    if(mem[0x1C] & 0x10){
        soffset = soffset << 5;
    }
    soffset += 0x80000000;;
    soffset -= (mem[0x1C] & 0xF) << 3;
    
    mem = await gecko.readmem_s(soffset, sheight * swidth * 2);
    if(sheight > 600){
        sheight = sheight / 2;
        swidth *= 2;
    }

    let buffer = new Uint8ClampedArray(sheight * swidth * 4)

    let y = 0;
    let u = 0;
    let v = 0;
    let yvpos = 0;
    let rgbpos = 0;

    for(let i = 0; i < swidth * sheight; i++){
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
        buffer[rgbpos] = ConvertSafely(1.164 * (y - 16) + 1.596 * (v - 128));                     //Red pixel value
        buffer[rgbpos + 1] = ConvertSafely(1.164 * (y - 16) - 0.392 * (u - 128) - 0.813 * (v - 128)); //Greeen pixel value
        buffer[rgbpos + 2] = ConvertSafely(1.164 * (y - 16) + 2.017 * (u - 128));                     //Blue pixel value
        buffer[rgbpos + 3] = 0xFF; // A
    }

    return new ImageData(buffer, swidth, sheight);
}

function ConvertSafely(value){
    return Math.round(Math.max(0, Math.min(value, 255)));
}