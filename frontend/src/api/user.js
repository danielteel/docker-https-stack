export async function userMe(){
    try {
        const response = await fetch('/api/user/me', {credentials: 'include'});
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch(e){
    }
    return [false, 'failed', 400];
}

export async function userLogin(email, password, remember){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password, remember})
        };
        const response = await fetch('/api/user/login', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userLogout(){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache"
        };
        const response = await fetch('/api/user/logout', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userLogoutEverywhere(){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache"
        };
        const response = await fetch('/api/user/logouteverywhere', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}


export async function userChangePassword(oldPassword, newPassword){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({oldPassword, newPassword})
        };
        const response = await fetch('/api/user/changepassword', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userForgotStart(email){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email})
        };
        const response = await fetch('/api/user/forgotstart', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}
export async function userForgotEnd(email, newPassword, confirmCode){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, newPassword, confirmCode})
        };
        const response = await fetch('/api/user/forgotend', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}



export async function userChangeEmailEnd(confirmCode){
    try {
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({confirmCode})
        };
        const response = await fetch('/api/user/changemailend', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userChangeEmailStart(newEmail, password){
    try {
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({newEmail, password})
        };
        const response = await fetch('/api/user/changemailstart', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];

    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userChangeEmailStatus(){
    try{
        const response = await fetch('/api/user/changemailstatus', {credentials: 'include'});
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}


export async function userVerifyEmail(email, password, confirmCode){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password, confirmCode})
        };
        const response = await fetch('/api/user/verifyemail', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}

export async function userCreate(email){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email})
        };
        const response = await fetch('/api/user/create', options);
        return [response.status>=200 && response.status<=299, await response.json(), response.status];
    }catch (e){
        return [false, 'failed', 400];
    }
}