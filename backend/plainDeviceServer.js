const crypto = require('crypto');
const {getKnex} = require('./database');


const textDecoder = new TextDecoder;
const textEncoder = new TextEncoder;


let server = null;



class PLAINPACKETSTATE {
    // Private Fields
    static get NAMELEN() { return 0; }
    static get NAME() { return 1; }
    static get LEN1() { return 2; }
    static get LEN2() { return 3; }
    static get LEN3() { return 4; }
    static get LEN4() { return 5; }
    static get PAYLOAD() { return 6; }
    static get ERROR() { return 7; }
}

class PLAINNETSTATUS {
    static get OPENED() { return 1; }
    static get READY() { return 2; }
    static get ERROR() { return 3; }
}

class PlainDeviceIO {
    static socketTimeoutTime = 30000;
    static devices=[];
    

    static getDevices = () => {
        return this.devices;
    }

    static removeDevice = (device) => {
        try{
            if (device.socket){
                device.socket.destroy();
            }
        }catch{
        }
        this.devices=this.devices.filter( v => {
            if (v===device) return false;
            return true;
        });
    }

    static isNameConnected = (name) =>{
        for (const device of this.devices){
            if (device.name===name){
                return true;
            }
        }
        return false;
    }

    static addDevice = (device) => {
        this.devices.push(device);
    }

    constructor(socket){
        this.onDone=()=>{
            console.log("Device disconnected: ",this.name);
            this.constructor.removeDevice(this);
        };

        this.socket=socket;
        this.socket.setTimeout(this.constructor.socketTimeoutTime);
    
        socket.on('data', this.onData);

        this.netStatus=PLAINNETSTATUS.OPENED;
        this.packetState=PLAINPACKETSTATE.NAMELEN;

        this.pauseReading=false;
        this.buffersWhilePaused=[];

        this.nameLength=0;
        this.nameWriteIndex=0;
        this.name=null;
        this.key=null;

        this.payloadLength=0;
        this.payloadWriteIndex=0;
        this.payload=null;

        this.actions=null;

        this.deviceValues={};

        socket.on('end', () => {
            console.log('name',this.name, this.socket.address, 'disconnected');
            this.deviceErrored();
        });        
        socket.on('timeout', () => {
            console.log('name',this.name, this.socket.address, 'timed out');
            this.deviceErrored();
        });
        socket.on('error', (err)=>{
            console.log('name',this.name, this.socket.address, 'error occured', err);
            this.deviceErrored();
        });
    }

    sendAction = (actionTitle, data) => {
        if (!Array.isArray(this.actions)) return false;
        for (const action of this.actions){
            if (action.title.toLowerCase().trim()===actionTitle.toLowerCase().trim()){
                switch (action.type.toLowerCase().trim()){
                    case 'void':
                        this.sendPacket(new Uint8Array([action.commandByte]));
                        return true;
                    case 'byte':
                        this.sendPacket(new Uint8Array([action.commandByte, data]));
                        return true;
                }
            }
        }
        return false;
    }

    pauseIncomingData = () => {
        this.pauseReading=true;
    }
    unpauseIncomingData = () => {
        //Must not pause incoming data again until this returns
        this.pauseReading=false;
        for (const buffer of this.buffersWhilePaused){
            this.onData(buffer);
        }
        this.buffersWhilePaused=[];
    }
    
    onDeviceDatabaseDelete = () => {
        this.deviceErrored();
        console.log(this.name, 'device was deleted from database, closing connection');
    }
    deviceErrored = () => {
        this.socket.destroy();
        this.socket=null;
        this.payload=null;
        this.packetState=PLAINPACKETSTATE.ERROR;
        this.netStatus=PLAINNETSTATUS.ERROR;
        this.onDone(this);
        this.constructor.removeDevice(this);
    }

    sendPacket = (data) => {
        if (typeof data==='string') data=textEncoder.encode(data);
        if (data && data.length>0xFFFFFFFF){
            console.log(this.name, 'cant send a message bigger than 0x0FFFF0');
            return false;
        }
  
        const header=new Uint8Array([0, 0, 0, 0]);
        (new DataView(header.buffer)).setUint32(0, data.length, true);
        this.socket.write(header);
        this.socket.write(data);
        return true;
    }

    onFullPacket = (data) => {
        if (data){
            if (data[0]===0xFF && data[1]===0xD8){
                this.image=data;
            }else if (data[0]==='i'.charCodeAt(0) && data[1]==='='.charCodeAt(0)){
                //Device sent interface information
                this.actions=[];
                const actions=textDecoder.decode(data).slice(2).split(',');
                for (const action of actions){
                    const [title, type, commandByte] = action.split(':');
                    this.actions.push({title, type, commandByte});
                }
            }else{
                const [name, value]=textDecoder.decode(data).split('=');
                if (name && typeof name==='string'){
                    this.deviceValues[name]=value;
                    console.log(name, value);
                }
            }
        }
    }

    onData = (buffer) => {
        if (this.pauseReading){
            this.buffersWhilePaused.push(buffer);
            return;
        }

        for (let i=0;i<buffer.length;i++){
            const byte=buffer[i];
            if (this.netStatus===PLAINNETSTATUS.OPENED && this.packetState===PLAINPACKETSTATE.NAMELEN){
                this.nameLength=byte;
                this.name="";
                this.packetState=PLAINPACKETSTATE.NAME;
            }else if (this.netStatus===PLAINNETSTATUS.OPENED && this.packetState===PLAINPACKETSTATE.NAME){
                this.name+=String.fromCharCode(byte);
                this.nameWriteIndex++;
                if (this.nameWriteIndex>=this.nameLength){
                    //Get device encro key from database or wherever
                    this.pauseIncomingData();
                    if (i+1<buffer.length){
                        this.buffersWhilePaused.push(buffer.subarray(i+1));
                    }
                    getKnex()('devices').select('encro_key').where({name: this.name}).then( (val) => {
                        if (val && val[0] && val[0].encro_key.trim()===""){
                            if (this.constructor.isNameConnected(this.name)){
                                this.deviceErrored();
                                console.log('device "'+this.name+'"is already connected');
                            }else{
                                this.packetState=PLAINPACKETSTATE.LEN1;
                                this.unpauseIncomingData();
                                this.constructor.addDevice(this);
                            }
                        }else{
                            this.deviceErrored();
                            console.log('device record "'+this.name+'" with no encryption key not found');
                        }
                    }).catch((e)=>{
                        this.deviceErrored();
                        console.log("failed to retrieve device info for '"+this.name+"' from database");
                    });
                    return;
                }
            }else if (this.packetState===PLAINPACKETSTATE.LEN1){
                this.payloadLength=byte;
                this.packetState=PLAINPACKETSTATE.LEN2;

            }else if (this.packetState===PLAINPACKETSTATE.LEN2){
                this.payloadLength|=byte<<8;
                this.packetState=PLAINPACKETSTATE.LEN3;

            }else if (this.packetState===PLAINPACKETSTATE.LEN3){
                this.payloadLength|=byte<<16;
                this.packetState=PLAINPACKETSTATE.LEN4;

            }else if (this.packetState===PLAINPACKETSTATE.LEN4){
                this.payloadLength|=byte<<24;
                this.packetState=PLAINPACKETSTATE.PAYLOAD;

                if (this.payloadLength>0x0FFFFFFFF){
                    console.log(this.name, 'device sent packet larger than 0x0FFFFFFFF', this.payloadLength);
                    this.deviceErrored();
                    return;
                }

                if (this.payloadLength<0){
                    console.log(this.name, 'device sent packet smaller than 0', this.payloadLength);
                    this.deviceErrored();
                    return;
                }
                this.payload = Buffer.alloc(this.payloadLength);
                this.payloadWriteIndex=0;

            }else if (this.packetState===PLAINPACKETSTATE.PAYLOAD){
                const howFar = Math.min(this.payloadLength-this.payloadWriteIndex, buffer.length-i);
                buffer.copy(this.payload, this.payloadWriteIndex, i, howFar+i);
                this.payloadWriteIndex+=howFar;
                if (this.payloadWriteIndex>=this.payloadLength){
                    //Process complete packet here
                    try{
                        this.onFullPacket(this.payload);
                        this.packetState=PLAINPACKETSTATE.LEN1;
                    }catch(e){
                        console.log('name',this.name, 'failed to process packet:', e);
                        this.deviceErrored();
                        return;
                    }
                }
                i+=howFar-1;
            }else{
                console.log('name',this.name, 'unknown packet/net status', this.packetState+'/'+this.netStatus);
                this.deviceErrored();
                return;
            }
        }
    }
}

function createPlainDeviceServer(){
    if (server) return;
    
    server = new (require('net')).Server();

    server.on('connection', function(socket) {
        new PlainDeviceIO(socket);
    });

    return server;
}

module.exports = {createPlainDeviceServer, PlainDeviceIO};