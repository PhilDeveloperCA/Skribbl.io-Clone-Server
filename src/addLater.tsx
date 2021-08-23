/*
    Drawing Logic :

       case 'draw':
                const members = await smembers(`gameplayers:${connection.groupid}`);
                for(var member in members){
                    if(members[member] === connection.id) return;
                    clients[members[member]].send(JSON.stringify(result.payload));
                }
                return;

                    case 'leave':
                return leave(connection);

                        case 'turn':
                const gameid = connection.gameid||null;
                const currentround = hget(`game${gameid}`, 'current_round');
                const lastround = hget(`game${gameid}`,'rounds');
                const members = await smembers(`gameplayers:${connection.groupid}`);
                const turn = await hget(`game${connection.gameid}`);
                turn++;
                if(turn-1 === members.length){
                    if(currentround === lastround){
                        const results = {};
                    }
                    turn = 1;
                    hincrby(`game${gameid}`,'current_round',1);
                }
                const turnplayer = get(`user:${members[turn]}`);
                for(let member in members){
                    if(members[turn]){
                        
                    }
                }
                return null;

                            case 'choose':
                if(result.question||null === null){ return connection.send(JSON.stringify({error:'Invalid Question'}))};
                await hset(`game:${connection.gameid}`, 'current_answer', result.question);
                const members = await smembers(`gameplayers:${connection.groupid}`);
                const time = await hget(`game${connection.gameid}`, 'seconds');
                for(var member in members){
                    if(members[member] === connection.id) return;
                    clients[members[member]].send(JSON.stringify({question:result.question, time}));
                }
                return;
*/