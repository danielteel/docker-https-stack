const {getHash, generateVerificationCode} = require('../common/common');

function getConfiguredDevices(){
    if (process.env.DEVICES) {
        const parsed = JSON.parse(process.env.DEVICES);
        if (!Array.isArray(parsed)) throw new Error('DEVICES must be a JSON array');

        return parsed.map((device, index) => {
            if (!device || typeof device !== 'object') throw new Error(`DEVICES entry ${index + 1} must be an object`);

            const name = String(device.name || '').trim();
            const encro_key = String(device.encro_key || device.key || '').trim();
            if (!name) throw new Error(`DEVICES entry ${index + 1} is missing name`);
            if (!encro_key) throw new Error(`DEVICES entry ${index + 1} is missing encro_key`);

            return {name, encro_key};
        });
    }

    const devices=[];
    let deviceNumber=1;
    while (process.env[`DEVICE${deviceNumber}_NAME`] && process.env[`DEVICE${deviceNumber}_KEY`]) {
        devices.push({
            name: process.env[`DEVICE${deviceNumber}_NAME`],
            encro_key: process.env[`DEVICE${deviceNumber}_KEY`]
        });
        deviceNumber++;
    }
    return devices;
}

exports.seed = async function(knex) {
    await knex('api_keys').del();
    await knex('user_changeemail').del();
    await knex('user_changepassword').del();
    await knex('users').del();
    await knex('unverified_users').del();
    await knex('devices').del();
    await knex('crypto').del();

    const superUser = process.env.SUPER_USERNAME || ('super_'+generateVerificationCode(2));
    const superPass = process.env.SUPER_PASSWORD || generateVerificationCode(8);
    console.log(`Super user is ${superUser} and password is ${superPass}`);

    await knex('users').insert({email: superUser, pass_hash: getHash(superPass), role: 'super'});


    const devices = getConfiguredDevices();
    if (devices.length) {
        await knex('devices').insert(devices);
    }

    await knex("api_keys").insert({
        name: "omlet",
        api_key: process.env.OMLET_API_KEY,
    });
};
