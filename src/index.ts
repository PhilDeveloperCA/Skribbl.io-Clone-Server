import {ErrorCodes, ActionCodes} from "./codes";
require('dotenv').config();
const http = require('http');
import {WebSocketConnection} from 'websocket';
const websocketServer = require("websocket").server
const app = require('express')();

app.use('/api', (req,res,next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE','OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
})

app.get('/api/game/:gameid', async(req,res,next) => {
    const game_id = req.params.gameid;
    const all_players= await smembers(`gameplayers:${game_id}`);
    const player_names = await smembers(`gameplayernames:${game_id}`);
    const gameinfo = await hgetall(`game:${game_id}`);
    if(!gameinfo){
        res.status(404).json({status:"Error", message:ErrorCodes.GameDNE});
    }
    res.json({players:player_names, game:{rounds:gameinfo.rounds, seconds:gameinfo.seconds, admin:gameinfo.admin}});
    //check if actually part of game 
});

const httpServer = http.createServer(app);
const redis = require('redis');
const {promisify} = require('util');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
})

//redis Prosimify Block
/* Basic Keys  */   
const get = promisify(redisClient.get).bind(redisClient);
const set = promisify(redisClient.set).bind(redisClient);
const del = promisify(redisClient.del).bind(redisClient);
/* Hash Sets */
const hget = promisify(redisClient.hget).bind(redisClient);
const hgetall = promisify(redisClient.hgetall).bind(redisClient);
const hdel = promisify(redisClient.hdel).bind(redisClient);
const hset = promisify(redisClient.hset).bind(redisClient);
const hincrby = promisify(redisClient.hincrby).bind(redisClient);
/* Unordered Lists */
const sadd = promisify(redisClient.sadd).bind(redisClient);
const srem = promisify(redisClient.srem).bind(redisClient);
const smembers = promisify(redisClient.smembers).bind(redisClient);

type UserSocket = WebSocketConnection & {id?: string, name?:string, game?:string}

const clients:Record<string, UserSocket> = {}; //delete client[key]
const port = process.env.WS_PORT||9090;
httpServer.listen(port,() => console.log(`LIstening On Port ${port}`))


const wsServer = new websocketServer({
    "httpServer" : httpServer,
})

wsServer.getUniqueID = function():string{
    function s4(){
        return Math.floor((1+Math.random()*0x10000)).toString(16).substring(1);
    }
    return s4() +s4() + '-' + s4();
}

const handleClose = async(connection) => {
    await del(`user:${connection.id}`);
    delete clients[connection.id];
    await srem(`gameplayers:${connection.game}`, connection.id);  //what this is the groups though 
    await srem(`gameplayernames:${connection.game}`, connection.name);// find username??
    const players = await smembers(`gameplayers:${connection.id}`);
    if(players.length === 0){
        await del(`game:${connection.game}`);
    }
}

wsServer.on("request", ws  => {
    const connection= ws.accept(null, ws.origin);
    connection.id = wsServer.getUniqueID();
    connection.name = "";
    connection.game = null;
    clients[connection.id] = connection;
    connection.on("open", () => {
        clients[connection.id] = connection;
        clients.send(JSON.stringify({clientId:connection.id}));
    })
    connection.on("close", async () => {
        await handleClose(connection);
    });
    connection.on("message", message => onMessage(connection,message))
})

// what else
async function onMessage(connection,message) {
    const result = JSON.parse(message.utf8Data);
    switch(result.type){
        case 'create':
            let name = result.payload.name;
            const rounds = result.payload.rounds;
            const seconds = result.payload.seconds;
            if(!name || !rounds || !seconds){
                return connection.send(JSON.stringify({status: "Error", code: ErrorCodes.InvalidCreate}));
            }
            const game_id = wsServer.getUniqueID();
            try {
                await set(`player:${connection.id}`, name);
                //name instead of id ??? -> Enforce Unique
                await hset(`game:${game_id}`, `rounds`, rounds, `seconds`, seconds, `admin`, name);
                await sadd(`gameplayers:${game_id}`, connection.id);
                await sadd(`gameplayernames:${game_id}`, name);
                connection.game = game_id;
                return connection.send(JSON.stringify({status:"Success", game:{id:game_id, rounds, seconds, admin:name}}));
            }
            catch(err){
                return connection.send(JSON.stringify({status:"Error", code: ErrorCodes.SystemError}));
            }
        case 'join':
            const group_id = result.payload.game;
            name = result.payload.username;
            if(!group_id || !name){
                return connection.send(JSON.stringify({status: "Error", code: ErrorCodes.InvalidJoin}));
            }
            try {
                const existing_game = await hgetall(`game:${group_id}`);
                if(!existing_game){
                    return connection.send(JSON.stringify({status:'Error', code: ErrorCodes.GameDNE}));
                }
                await sadd(`gameplayers:${group_id}`, connection.id);
                const all_players= await smembers(`gameplayers:${group_id}`);
                const player_names = await smembers(`gameplayernames:${group_id}`)
                for(let index in player_names){
                    if(player_names[index] == name){
                       return connection.send(JSON.stringify({status:"Error", code:ErrorCodes.NameTaken}));
                    }
                }
                if(all_players.length > 11){
                    return connection.send(JSON.stringify({status:"Error", message:"Game Full"}));
                }
                for(let index in all_players){
                    //console.log(all_players[index]);
                    //console.log(clients[all_players[index].toString()]);
                    try{
                        clients[all_players[index].toString()].send(JSON.stringify({status:ActionCodes.PlayerJoined, player:name}));
                    }
                    catch(e){};
                }
                await sadd(`gameplayers:${group_id}`, connection.id);
                await sadd(`gameplayernames:${group_id}`, name);
                connection.name = name;
                connection.game = group_id;
                return connection.send(JSON.stringify({status:"Success", game:existing_game, members:all_players}));
                //send to other connections 
            }
            catch(err){
                return connection.send(JSON.stringify({status:"Error", code: ErrorCodes.SystemError}));
            }
    }
}

