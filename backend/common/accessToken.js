const {generateKeyPairSync, constants, privateEncrypt, publicDecrypt} = require('crypto');
const {getKnex} = require('../database');
const {getHash, generateVerificationCode} = require('./common');

let globalAccessToken = null;

function getNewKeys() {
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    crypto_id: 'access_token',
    private_key: keys.privateKey,
    public_key: keys.publicKey,
  };
}

async function initAccessToken(knex, forceNew=false){
    try {
        const [existingRecord] = await knex('crypto').select(['*']).where({crypto_id: 'access_token'})
        if (forceNew && existingRecord){
            await knex('crypto').delete().where({crypto_id: 'access_token'});
        }else if (existingRecord){
            globalAccessToken=existingRecord;
            return;
        }

        const newKeys = getNewKeys();
        await knex('crypto').insert([newKeys]);

        const [accessTokenRecord] = await knex('crypto').select(['*']).where({crypto_id: 'access_token'});
        if (!accessTokenRecord){
            throw Error("Unable to generate and store access keys");
        }
        console.log("Initial access tokens generated");
        globalAccessToken=accessTokenRecord;
    } catch (e) {
        console.error('unable to generate and store access keys', e)
    }
}


function generateAccessToken(data){
    if (!globalAccessToken?.private_key) throw Error('global access token not initialized');

    const jsonData=JSON.stringify(data);
    return privateEncrypt(
        {key: globalAccessToken.private_key, padding: constants.RSA_PKCS1_PADDING}, 
        Buffer.from(jsonData)
    ).toString('base64');
}

function decryptAccessToken(data){
    if (!globalAccessToken?.public_key) throw Error('global access token not initialized');
    
    try {
        const decrypted = publicDecrypt(
            {key: globalAccessToken.public_key, padding: constants.RSA_PKCS1_PADDING},
            Buffer.from(data, 'base64')
        );

        return JSON.parse(decrypted.toString());
    } catch (e) {
        return null;
    }
}



const ROLES = ['unverified', 'member', 'admin', 'super'];

function isHigherRanked(a, b){
    const aRank = ROLES.indexOf(a.trim().toLowerCase());
    const bRank = ROLES.indexOf(b.trim().toLowerCase());

    if (aRank===-1 || bRank===-1){
        throw Error('isHigherRanked: invalid role on either '+a+' or '+b);
    }

    return aRank>bRank;
}

function setAccessCookies(res, user, remember=false){
    const hashcess = generateVerificationCode();
    const generatedAccessToken = generateAccessToken({id: user.id, session: user.session, hashcess});

    let cookieBase = {
        sameSite:'lax',
        secure: true,
        domain: process.env.DOMAIN
    };

    if (remember){
        cookieBase.maxAge=31536000000;
    }

    res.cookie('accessToken', generatedAccessToken, {httpOnly: true, ...cookieBase});
    res.cookie('hashcess', getHash(hashcess), cookieBase);
}

async function getUserFromToken(token){
    const knex=getKnex();
    const [user] = await knex('users').select('id', 'email', 'role').where({id: token.id, session: token.session});;
    if (user){
        return {id: user.id, email: user.email, role: user.role};
    }
    return null;
}

async function authenticate(minRole, req, res, next){
    try {
        if (!ROLES.includes(minRole)){
            throw Error('unknown min role '+minRole+', expected one of '+ROLES.join(', '));
        }
        
        req.user=null;

        const login = () => res.status(401).json({error: 'log in'});

        const decryptedAccessToken = decryptAccessToken(req.cookies['accessToken']);
        if (!decryptedAccessToken) return login();

        if (getHash(decryptedAccessToken.hashcess) !== req.cookies['hashcess']){
            res.clearCookie('accessToken', {
                httpOnly: true,
                sameSite: 'lax',
                secure: true,
                domain: process.env.DOMAIN
            });
            res.clearCookie('hashcess', {
                sameSite: 'lax',
                secure: true,
                domain: process.env.DOMAIN
            });
            return login();
        }

        const user=await getUserFromToken(decryptedAccessToken);
        if (!user) return login();

        const userRank = ROLES.indexOf(user.role.toLowerCase());
        const minRank = ROLES.indexOf(minRole.toLowerCase());
        if (userRank < minRank) return res.status(403).json({error: 'insufficient privileges'});

        req.user=user;
        return next();
        
    }catch (e){
        console.error('ERROR authenticate', e);
        return res.status(400).json({error: 'failed'});
    }
}


module.exports = {initAccessToken, generateAccessToken, decryptAccessToken, authenticate, getUserFromToken, isHigherRanked, setAccessCookies};