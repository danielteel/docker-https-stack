
export function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

export function isLegalPassword(password){
    if (typeof password !== 'string') return 'must be a string.';
    let failFor = '';
    if (password.trim() !== password){
        failFor+='no leading or trailing spaces allowed. ';
    }

    const upper = /[A-Z]/g;
    const lower = /[a-z]/g;
    const digit = /[0-9]/g;
    const special = /[`~!@#$%^&*()\-_=+[\];',./{}\\:"<>?|]/g;

    if (!password.match(upper)) failFor+='must have at least one uppercase character. ';
    if (!password.match(lower)) failFor+='must have at least one lowercase character. ';
    if (!password.match(digit)) failFor+='must have at least one digit. ';
    if (!password.match(special)) failFor+='must have at least one special character. ';
    if (password.trim().length>36) failFor+='must be less than 36 characters. ';
    if (password.trim().length<8) failFor+='must be at least 8 characters. ';
    return failFor.trim();
}

export function meetsMinRole(userRole, minRole){
    userRole=String(userRole).trim().toLowerCase();
    minRole=String(minRole).trim().toLowerCase();
    const roles = ['unverified', 'member', 'manager', 'admin', 'super'];
    const userLevel = roles.indexOf(userRole);
    const minLevel = roles.indexOf(minRole);
    if (userLevel===-1){
        console.error('meetsMinRole: invalid minRole of', minRole);
        return false;
    }
    if (minLevel===-1){
        console.error('meetsMinRole: invalid minRole of', minRole);
        return false;
    }

    if (userLevel>=minLevel) return true;

    return false;
}

export function laxStringsEqual(a, b){
    if (typeof a!=='string' || typeof b!=='string'){
        return false;
    }
    if (a.trim().toLowerCase()===b.trim().toLowerCase()){
        return true;
    }
    return false;
}