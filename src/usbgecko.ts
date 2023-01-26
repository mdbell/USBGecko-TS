export const cmd_version = 0x99;
export const cmd_pause = 0x06;
export const cmd_resume = 0x07;

export const cmd_poke08 = 0x01;
export const cmd_poke16 = 0x02;
export const cmd_poke32 = 0x03;

export const cmd_step = 0x44;

export const cmd_status = 0x50;

export const cmd_readmem = 0x04;

export const packetsize = 0xF800;

export const GCACK = 0xAA;
export const GCRETRY = 0xBB;
export const GCFAIL = 0xCC;
export const GCDONE = 0xFF;

export enum Status{
    Running = 0,
    Paused,
    Breakpoint,
    Loader,
    Unknown
}

const raw_buffer = Buffer.alloc(1);

export abstract class AbstractUSBGecko{

    protected abstract read(size : number) : Promise<Buffer>;

    protected abstract write(buffer : Buffer) : Promise<void>;

    abstract connected() : boolean;

    abstract close();

    protected async write_single(cmd : number){
        raw_buffer[0] = cmd;
        await this.write(raw_buffer);
    }

    protected createMessage(cmd : number, size? : number) {
        const buffer = Buffer.alloc(size ? size + 1 : 1);
        const view = new DataView(buffer.buffer);
        buffer[0] = cmd;
        return {buffer : buffer, view : view};
    }

    async getVersion() {
        await this.write_single(cmd_version);
        let read = await this.read(1);
        return read[0];
    }

    async getStatus(){
        await this.write_single(cmd_status);
        let read = await this.read(1);
        return read[0];
    }

    async pause(){
        await this.write_single(cmd_pause);
    }

    async resume(){
        await this.write_single(cmd_resume);
    }

    async step(){
        await this.write_single(cmd_step);
    }

    async getTitle(){
        let buffer = await this.readmem_s(0x80000000, 4);
        return buffer.toString("ascii");
    }

    async peek8(address : number){
        let buffer = await this.readmem_s(address, 1);
        return buffer[0];
    }

    async poke8(address : number, value : number){
        await this.poke(cmd_poke08, address, value);
    }

    async peek16(address : number){
        address &= 0xFFFFFFFE
        let buffer = await this.readmem_s(address, 2);
        let view = new DataView(buffer.buffer, buffer.byteOffset);
        return view.getUint16(0);
    }

    async poke16(address : number, value : number){
        address &= 0xFFFFFFFE
        await this.poke(cmd_poke16, address, value);
    }

    async peek32(address: number){
        let buffer = await this.readmem_s(address, 4);
        let view = new DataView(buffer.buffer, buffer.byteOffset);
        return view.getUint32(0); 
    }

    async poke32(address : number, value : number) {
        address &= 0xFFFFFFFC;
        await this.poke(cmd_poke32, address, value);
    }

    async readmem(startAddress: number, endAddress : number){
        let size = endAddress - startAddress;
        await this.write_single(cmd_readmem);
        let read = await this.read(1);
        if(!read){
            throw "No response to readmem request :(";
        }
        let code = read[0];
        if(code != GCACK){
            throw `Unexpected response '${code}' on readmem. Excpected GCACK(${GCACK})`;
        }
        //write the addresses
        let message = this.createMessage(0, 7);
        message.view.setUint32(0, startAddress);
        message.view.setUint32(4, endAddress);
        await this.write(message.buffer);
        
        let remaining = size;
        const _buf = Array<Buffer>();
        while(remaining > 0){
            const len = Math.min(packetsize, remaining);
            let res = await this.read(len);
            if(!res){
                //TODO count retries
                await this.write_single(GCFAIL);
            }else{
                remaining -= len;
                _buf.push(res);
                await this.write_single(GCACK);
            }
        }
        return Buffer.concat(_buf);
    }

    async readmem_s(address : number, size : number){
        return this.readmem(address, address + size)
    }

    protected async poke(cmd : number, address : number, value : number){
        const message = this.createMessage(cmd, 8);
        message.view.setUint32(1, address);
        message.view.setUint32(5, value);
        await this.write(message.buffer);
    }

}