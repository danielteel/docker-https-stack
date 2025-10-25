const { WebSocketServer } = require("ws");
const { manualAuthenticate } = require("./common/accessToken");
const cookieParser = require('cookie-parser');
const parseCookies = cookieParser();

let wss=null;

const onMessage = (ws, message) => {

}

const onConnection = (ws, req) => {
    ws.isAlive=true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log('Pong from client');

        parseCookies(req, {}, async () => {
            const user = await manualAuthenticate('member', req.cookies);
            if (!user) {
                console.log('Authentication failed — closing WebSocket');
                return ws.close(1008, 'Authentication failed');
            }

            ws.user = user;

            ws.on('close', () => {
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

            ws.send(`✅ Welcome ${user.email}! Auth successful.`);
        });
    });
    
}


function getWebSocketServer(server, path, deviceServer){
    if (wss) return wss;

    wss = new WebSocketServer({server, path});
    wss.on('connection', onConnection);
    return wss;
}


module.exports={getWebSocketServer};

// const wss = new WebSocketServer({ server, path: '/api/ws' });

// wss.on('connection', (ws, req) => {
//     console.log('New WebSocket connection from', req.socket.remoteAddress);

//     ws.isAlive = true;

//     // Handle pong early so heartbeat always works
//     ws.on('pong', () => {
//         ws.isAlive = true;
//         console.log('Pong from client');
//     });

//     parseCookies(req, {}, async () => {
//         console.log('Parsed cookies:', req.cookies);

//         const user = await manualAuthenticate('member', req.cookies);
//         if (!user) {
//             console.log('Authentication failed — closing WebSocket');
//             return ws.close(1008, 'Authentication failed');
//         }

//         ws.user = user;

//         // ✅ Start heartbeat only if authenticated
//         ws.interval = setInterval(() => {
//             if (!ws.isAlive) {
//                 console.log('Client unresponsive — terminating');
//                 return ws.terminate();
//             }
//             ws.isAlive = false;
//             ws.ping();
//         }, 30000);

//         ws.on('close', () => {
//             clearInterval(ws.interval);
//             console.log('WebSocket disconnected');
//         });

//         ws.send(`✅ Welcome ${user.email}! Auth successful.`);

//         ws.on('message', (msg) => {
//             console.log(`📩 From ${user.email}:`, msg.toString());
//             ws.send(`Echo: ${msg}`);
//         });
//     });
// });

