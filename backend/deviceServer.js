const {encrypt, decrypt} = require('./encro');
const crypto = require('crypto');
const {getKnex} = require('./database');

const textDecoder = new TextDecoder;
const textEncoder = new TextEncoder;

let deviceServer = null;

function getDeviceServer(){
    return deviceServer;
}


const PACKETSTATE = Object.freeze({
  NAMELEN: 0,
  NAME: 1,
  LEN1: 2,
  LEN2: 3,
  LEN3: 4,
  LEN4: 5,
  PAYLOAD: 6,
  ERROR: 7,
});

const NETSTATUS = Object.freeze({
  OPENED: 1,
  READY: 2,
  ERROR: 3,
});

class DeviceIO {
    constructor(socket, deviceServer, socketTimeoutTime=30000){
        this.deviceServer=deviceServer;

        this.socket=socket;
        this.socket.setTimeout(socketTimeoutTime);
    
        socket.on('data', this.onData);

        this.netStatus=NETSTATUS.OPENED;
        this.packetState=PACKETSTATE.NAMELEN;

        this.pauseReading=false;
        this.buffersWhilePaused=[];

        this.nameLength=0;
        this.nameWriteIndex=0;
        this.name=null;
        this.key=null;
        this.clientHandshake=Uint32Array.from([0]);
        this.serverHandshake=Uint32Array.from([crypto.randomInt(4294967295)]); 

        this.payloadLength=0;
        this.payloadWriteIndex=0;
        this.payload=null;

        this.deviceId=null;
        
        this.actions=null;
        this.values={};
        this.image=null;

        socket.on('end', () => {
            this.disconnect(this.name+' '+this.socket.address+' disconnected.');
        });        
        socket.on('timeout', () => {
            this.disconnect(this.name+' '+this.socket.address+' timed out.');
        });
        socket.on('error', (err)=>{
            this.disconnect(this.name+' '+this.socket.address+' error occured: '+err);
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


    disconnect = (logMessage) => {
        try {
            this.socket.destroy();
        }catch{}
        this.socket=null;
        this.payload=null;
        this.packetState=PACKETSTATE.ERROR;
        this.netStatus=NETSTATUS.ERROR;
        if (logMessage) console.log(logMessage);
        console.log('name',this.name, 'connection closed');
        this.deviceServer?.removeDevice(this);
    }

    sendPacket = (data) => {
        if (!this.socket) return false;

        if (typeof data==='string') data=textEncoder.encode(data);
        if (data && data.length>0x0FFFF0){
            console.log(this.name, 'cant send a message bigger than 0x0FFFF0');
            return false;
        }
  
        const encryptedData = encrypt(this.serverHandshake[0], data, this.key);
        const header=new Uint8Array([0, 0, 0, 0]);
        (new DataView(header.buffer)).setUint32(0, encryptedData.length, true);
        this.socket.write(header);
        this.socket.write(encryptedData);

        this.serverHandshake[0]++;

        return true;
    }

    onFullPacket = (handshake, data) => {
        if (this.netStatus===NETSTATUS.OPENED){
            this.clientHandshake[0]=handshake;
            this.clientHandshake[0]++;
            this.netStatus=NETSTATUS.READY;
            this.sendPacket(null);
        }else{
            if (this.clientHandshake[0]!==handshake){
                this.disconnect(this.name+' incorrect handshake, exepcted '+this.clientHandshake[0]+' but recvd '+handshake);
                return;
            }
            
            if (data){
                if (data[0]===0xFF && data[1]===0xD8){
                    this.image=data;
                    this.deviceServer.imageUpdate(this.deviceId, this.image);
                }else if (data[0]===0xFF){
                }else{
                    const [dataName, dataVal]=textDecoder.decode(data).split('=');

                    if (dataName.toLowerCase().trim()==='log'){
                        getKnex()('device_logs').insert({device_id: this.deviceId, data: JSON.stringify(this.values)}).then( (val) => {
                            console.log("Device Log: ", new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver' }),  this.values);
                        }).catch((e)=>{
                            console.log("Failed to store into logs", {device_id: this.deviceId, data: this.values});
                        });
                    }else{
                        this.values[dataName]=dataVal;
                        this.deviceServer.valueUpdate(this.deviceId, dataName, dataVal);
                    }
                }
            }
            this.clientHandshake[0]++;
        }
    }

    onData = (buffer) => {
        if (this.pauseReading){
            this.buffersWhilePaused.push(buffer);
            return;
        }

        for (let i=0;i<buffer.length;i++){
            const byte=buffer[i];
            if (this.netStatus===NETSTATUS.OPENED && this.packetState===PACKETSTATE.NAMELEN){
                this.nameLength=byte;
                this.name="";
                this.packetState=PACKETSTATE.NAME;
            }else if (this.netStatus===NETSTATUS.OPENED && this.packetState===PACKETSTATE.NAME){
                this.name+=String.fromCharCode(byte);
                this.nameWriteIndex++;
                if (this.nameWriteIndex>=this.nameLength){
                    //Get device encro key from database or wherever
                    this.pauseIncomingData();
                    if (i+1<buffer.length){
                        this.buffersWhilePaused.push(buffer.subarray(i+1));
                    }
                    getKnex()('devices').select('encro_key', 'id').where({name: this.name}).then( (val) => {
                        if (val && val[0] && val[0].encro_key){

                            const oldDeviceFound = this.deviceServer?.getDeviceOfId(val[0].id);
                            if (oldDeviceFound){
                                console.log('Disconnecting old device connection for', this.name);
                                oldDeviceFound.disconnect('New device connection established for "'+this.name+'"');
                            }

                            this.key=val[0].encro_key;
                            this.deviceId=val[0].id;
                            


                            this.packetState=PACKETSTATE.LEN1;
                            this.unpauseIncomingData();

                        }else{
                            this.disconnect('device record "'+this.name+'" not found');
                        }
                    }).catch((e)=>{
                        this.disconnect("failed to retrieve device info for '"+this.name+"' from database");
                    });
                    return;
                }
            }else if (this.packetState===PACKETSTATE.LEN1){
                this.payloadLength=byte;
                this.packetState=PACKETSTATE.LEN2;

            }else if (this.packetState===PACKETSTATE.LEN2){
                this.payloadLength|=byte<<8;
                this.packetState=PACKETSTATE.LEN3;

            }else if (this.packetState===PACKETSTATE.LEN3){
                this.payloadLength|=byte<<16;
                this.packetState=PACKETSTATE.LEN4;

            }else if (this.packetState===PACKETSTATE.LEN4){
                this.payloadLength|=byte<<24;
                this.packetState=PACKETSTATE.PAYLOAD;

                if (this.payloadLength>0x0FFFFF){
                    this.disconnect(this.name+' device sent packet larger than 0x0FFFFF -> '+this.payloadLength);
                    return;
                }

                if (this.payloadLength<0){
                    this.disconnect(this.name+' device sent packet smaller than 0 -> '+this.payloadLength);
                    return;
                }
                this.payload = Buffer.alloc(this.payloadLength);
                this.payloadWriteIndex=0;

            }else if (this.packetState===PACKETSTATE.PAYLOAD){
                const howFar = Math.min(this.payloadLength-this.payloadWriteIndex, buffer.length-i);
                buffer.copy(this.payload, this.payloadWriteIndex, i, howFar+i);
                this.payloadWriteIndex+=howFar;
                if (this.payloadWriteIndex>=this.payloadLength){
                    //Process complete packet here
                    try{
                        const {data: decrypted, handshake: recvdHandshake} = decrypt(this.payload, this.key);
                        this.onFullPacket(recvdHandshake, decrypted);
                        this.packetState=PACKETSTATE.LEN1;
                    }catch(e){
                        this.disconnect(this.name+' failed to decrypt packet: '+String(e));
                        return;
                    }
                }
                i+=howFar-1;
            }else{
                this.disconnect(this.name+' unknown packet/net status '+this.packetState+'/'+this.netStatus);
                return;
            }
        }
    }
}


class DeviceServer{
    static socketTimeoutTime = 30000;

    constructor(port){
        
        deviceServer=this;

        this.port=port;
        this.server=new (require('net')).Server();

        this.devices=[];
        
        this.updateCallbacks=new Set();

        this.server.on('connection', (socket) => {
            const newDevice=new DeviceIO(socket, this, this.constructor.socketTimeoutTime);
            this.devices.push(newDevice);
        });

        this.server.listen(port, function(){
            console.log(`Device server listening on port ${port}`);
        });
    }

    removeDevice = (device) => {
        try {
            if (device.socket) device.socket.destroy();
        }catch{}
        this.devices=this.devices.filter(v => !(v===device));
    }

    disconnectDeviceId = (deviceId) => {
        deviceId=Number(deviceId);
        this.devices=this.devices.filter( (device) => {
            if (Number(device.deviceId)===deviceId){
                try{
                    device.disconnect();
                }catch{}
                return false;
            }
            return true;
        });
    }

    
    getDevices = () => {
        return this.devices;
    }

    getDeviceOfName = (name) =>{
        for (const device of this.devices){
            if (device.name===name){
                return device;
            }
        }
        return null;
    }    

    getDeviceOfId = (id) =>{
        id=Number(id);
        for (const device of this.devices){
            if (device.deviceId===id){
                return device;
            }
        }
        return null;
    }

    getDeviceData = (deviceId) => {
        deviceId=Number(deviceId);
        const device = this.getDeviceOfId(deviceId);
        if (!device) return null;

        return {values: device.values, image: Buffer.from(device.image).toString('base64')};
    }

    subscribeToUpdates = (callback) => {
        this.updateCallbacks.add(callback);
    }

    unsubscribeFromUpdates = (callback) => {
        this.updateCallbacks.delete(callback);
    }

    valueUpdate = (deviceId, valueName, valueData) => {
        for (const callback of this.updateCallbacks){
            if (typeof callback==='function'){
                callback('value', deviceId, valueName, valueData);
            }else{
                this.updateCallbacks.delete(callback);
            }
        }
    }

    imageUpdate = (deviceId, imageData) => {
        for (const callback of this.updateCallbacks){
            if (typeof callback==='function'){
                callback('image', deviceId, null, Buffer.from(imageData).toString('base64'));
            }else{
                this.updateCallbacks.delete(callback);
            }
        }
    }
}

module.exports = {DeviceServer, DeviceIO, getDeviceServer};