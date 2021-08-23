import {ErrorCodes, ActionCodes} from "./codes";

async function onMessage(connection,message) {
    const result = JSON.parse(message.utf8Data);
    console.log(result);
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
                await hset(`game:${game_id}`, `rounds`, rounds, `seconds`, seconds, `admin`, connection.id);
                await sadd(`gameplayers:${game_id}`, connection.id);
                await sadd(`gameplayernames:${game_id}`, name);
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
                const existing_game = await hgetall(`game:${game_id}`);
                if(!existing_game){
                    return connection.send(JSON.stringify({status:'Error', code: ErrorCodes.GameDNE}));
                }
                await sadd(`gameplayers:${game_id}`, connection.id);
                const all_players= await smembers(`gameplayers:${game_id}`);
                const player_names = await smembers(`gameplayernames:${game_id}`)
                for(let index in player_names){
                    if(player_names[index] == name){
                       return connection.send(JSON.stringify({status:"Error", code:ErrorCodes.NameTaken}));
                    }
                }
                if(all_players.length > 11){
                    return connection.send(JSON.stringify({status:"Error", message:"Game Full"}));
                }
                for(let index in all_players){
                    clients[all_players[index]].send(JSON.stringify({status:"Player Joined", player:name}));
                }
                return connection.send(JSON.stringify({status:"Success", game:existing_game, members:all_players}));
                //send to other connections 
            }
            catch(err){
                return connection.send(JSON.stringify({status:"Error", code: ErrorCodes.SystemError}));
            }
    }
}