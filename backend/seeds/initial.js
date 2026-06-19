const {getHash, generateVerificationCode} = require('../common/common');

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


    const devices=[];
    let deviceNumber=1;
    while (process.env[`DEVICE${deviceNumber}_NAME`] && process.env[`DEVICE${deviceNumber}_KEY`]) {
        devices.push({
            name: process.env[`DEVICE${deviceNumber}_NAME`],
            encro_key: process.env[`DEVICE${deviceNumber}_KEY`]
        });
        deviceNumber++;
    }
    await knex('devices').insert(devices);

    await knex("api_keys").insert({
        name: "omlet",
        api_key: process.env.OMLET_API_KEY,
    });
};