import equal from 'fast-deep-equal';

let lastDevices=[];

export async function devicesList(){
    try {
        const response = await fetch('/api/devices/list', {credentials: 'include'});
        const devices = await response.json();
        if (response.status>=200 && response.status<=299){
            devices.sort((a, b) => {
                if (a.device_id>b.device_id){
                    return 1;
                }
                if  (a.device_id<b.device_id){
                    return -1;
                }
                return 0;
            })
            if (equal(lastDevices, devices)){
                return [true, lastDevices, response.status];
            }
            lastDevices=devices;
            return [true, devices, response.status];
        }else{
            return [false, devices, response.status];
        }
    }catch(e){
        return [false, 'failed', 400];
    }
}

export async function devicesImage(id){
    try {
        const options={
            credentials: 'include',
            method: "GET",
            cache: "no-cache",
        }
        const response = await fetch('/api/devices/image/'+id, options);
        if (response.status>=200 && response.status<=299){
            const blob = await response.blob();
            return [true, blob, response.status];
        }else{
            return [false, null, response.status];
        }
    }catch(e){
        return [false, 'failed', 400];
    }
}


export async function devicesAdd(name, encroKey){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name, encro_key: encroKey})
        };
        const response = await fetch('/api/devices/add', options);
        const devices = await response.json();
        if (response.status>=200 && response.status<=299){
            devices.sort((a, b) => {
                if (a.device_id>b.device_id){
                    return 1;
                }
                if  (a.device_id<b.device_id){
                    return -1;
                }
                return 0;
            })
            if (equal(lastDevices, devices)){
                return [true, lastDevices, response.status];
            }
            lastDevices=devices;
            return [true, devices, response.status];
        }else{
            return [false, devices, response.status];
        }
    }catch(e){
        return [false, 'failed', 400];
    }
}
export async function devicesUpdate(id, name, encroKey){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({device_id: id, name, encro_key: encroKey})
        };
        const response = await fetch('/api/devices/update', options);
        const devices = await response.json();
        if (response.status>=200 && response.status<=299){
            devices.sort((a, b) => {
                if (a.device_id>b.device_id){
                    return 1;
                }
                if  (a.device_id<b.device_id){
                    return -1;
                }
                return 0;
            })
            if (equal(lastDevices, devices)){
                return [true, lastDevices, response.status];
            }
            lastDevices=devices;
            return [true, devices, response.status];
        }else{
            return [false, devices, response.status];
        }
    }catch(e){
        return [false, 'failed', 400];
    }
}
export async function devicesDelete(id){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({device_id: id})
        };
        const response = await fetch('/api/devices/delete', options);
        const devices = await response.json();
        if (response.status>=200 && response.status<=299){
            devices.sort((a, b) => {
                if (a.device_id>b.device_id){
                    return 1;
                }
                if  (a.device_id<b.device_id){
                    return -1;
                }
                return 0;
            })
            if (equal(lastDevices, devices)){
                return [true, lastDevices, response.status];
            }
            lastDevices=devices;
            return [true, devices, response.status];
        }else{
            return [false, devices, response.status];
        }
    }catch(e){
        return [false, 'failed', 400];
    }
}
export async function devicesAction(id, action, data){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({device_id: id, action, data})
        };
        const response = await fetch('/api/devices/action', options);
        return [response.status>=200 && response.status<=299, true, response.status];
    }catch(e){
        return [false, 'failed', 400];
    }
}

export async function devicesLog(id, startTime, endTime){
    try {
        const response = await fetch('/api/devices/log/'+Number(id)+'/'+startTime+'/'+endTime, {credentials: 'include', method: 'GET', cache: 'no-cache'});
        const message = await response.json();
        console.log(message);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch(e){
        console.error(e);
        return [false, 'failed', 400];
    }
}