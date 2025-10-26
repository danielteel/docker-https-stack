const { WebSocketServer } = require("ws");
const { manualAuthenticate } = require("./common/accessToken");
const cookieParser = require('cookie-parser');
const parseCookies = cookieParser();

let wss=null;
let deviceServer=null;

const activeConnections = new Set();

const onMessage = (ws, rawMessage) => {
    let msg;
    try {
        msg = JSON.parse(rawMessage);
    } catch {
        return console.warn("Received invalid JSON");
    }

    if (msg.type === "subscribe" && Number.isInteger(msg.deviceId)) {
        ws.subscriptions.add(msg.deviceId);
        console.log(ws.user.email, "subscribed to", msg.deviceId);
        //TODO send current device data
        return;
    }

    if (msg.type === "unsubscribe" && Number.isInteger(msg.deviceId)) {
        ws.subscriptions.delete(msg.deviceId);
        console.log(ws.user.email, "unsubscribed from", msg.deviceId);
        return;
    }

    console.log("Unknown message type", msg);
};

const onConnection = (ws, req) => {
    ws.isAlive=true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    parseCookies(req, {}, async () => {
        const user = await manualAuthenticate('member', req.cookies);
        if (!user) {
            console.log('Authentication failed — closing WebSocket');
            return ws.close(1008, 'Authentication failed');
        }

        ws.user = user;

        activeConnections.add(ws);

        console.log('WebSocket authenticated for user:', user.email);

        ws.on('close', () => {
            activeConnections.delete(ws);
            clearInterval(ws.interval);
            console.log('WebSocket disconnected');
        });

        ws.interval = setInterval(() => {
            if (!ws.isAlive) {
                console.log('Client unresponsive — terminating');
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        }, 30000);

        ws.on('message', (msg) => onMessage(ws, msg));
    });
    
}


function getWebSocketServer(server, path, deviceSrv){
    if (wss) return wss;

    deviceServer=deviceSrv;

    wss = new WebSocketServer({server, path});
    wss.on('connection', onConnection);
    return wss;
}


module.exports={getWebSocketServer};