const {getHash, generateVerificationCode} = require('../common/common');

exports.seed = async function(knex) {
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
    //const devices=[
    //];

    //await knex('devices').insert(devices);
};