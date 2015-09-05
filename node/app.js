var UUID = require('node-uuid');
var express = require('express');
var app = express();
app.use('/game', express.static(__dirname + '/static'));
// socket.io needs to use http server for Express 3
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var player_list = {};
var running_engines = {};

server.listen(3000);

app.get('/', function(request, response){
	response.sendfile(__dirname + '/index.html');
});

app.get('/game/', function(request, response){
    response.sendfile(__dirname + '/frontend/index.html');
});

io.configure(function () {
    io.set('log level', 0);
});

lobby = require('./lobby.js')
engine_maker = require('./gamecore.js')
// called when client connects
// (at least if i'm reading docs/tutorial right)
io.sockets.on('connection', function (client) {
    // use UUID as client id
    client.userid = UUID();
    client.gameid = null;
    player_list[client.userid] = client;
    
    console.log('socket.io:: client ' + client.userid + ' connected');
    // try to find game
    num = lobby.findGame(client);
    // If started hosting, add to game list
    // Inform of connection and player number
    client.emit('onconnected', { id: client.userid,
                                 num: num});
    client.on('startGame', function (data) {
        var player = player_list[data.pid];
        // Only start a game once
        if (player.gameid) {
            if (lobby.games[player.gameid].player_count == 2) {
                // start the engine
                var engine = engine_maker();
                var game = lobby.games[player.gameid];
                engine.setupGame(game.player_host.userid, game.player_client.user_id,
                                 getClient(game.player_host.userid), getClient(game.player_client.userid));
                running_engines[player.gameid] = engine;
                // attach a callback on engine end
                engine.endGame = function () {
                    // TODO is there other stuff to do here?
                    delete running_engines[player.gameid];
                    lobby.endGame(player.gameid);
                };
                // send messages to both clients to remove starts
                // because game can only be started once this works well enough
                getClient(game.player_host.userid).emit('gameStarted', {});
                getClient(game.player_client.userid).emit('gameStarted', {});
                console.log('Started engine');
            }
        }
    });
    // called on key press from either client
    client.on('key', function (data) {
        // the name game here is somewhat misleading
        // "game" is actually the game engine
        console.log('Key: ' + data.letter);
        console.log('ID: ' + data.id);
        var engine = getEngine(player_list[data.id].gameid);
        if (engine) {
            engine.keyPressed(data.id, data.letter);
            // send game state to client for verifying
            // avoid sending client info (can be used to cheat)
            /*
            while (true) {
                var k2 = new Array();
                for (var obj in k) {
                    for (var key in Object.keys(obj)) {
                        if (obj.key in temp) {
                            console.log(key);
                        }
                        temp.push(key);
                        k2.push(obj.key);
                    }
                }
                k = k2;
            }
            */
            //client.emit('verify', { to_send: engine });
        }

    }); 
    // called when client disconnects
    client.on('disconnect', function () {
        console.log('socket.io:: client disconnected ' + client.userid);
        // if player was in game, end that game
        // TODO remove client from player list
        if (client.gameid) {
            lobby.endGame(client.gameid);
        }
    });
});

function getEngine(id) {
    return running_engines[id];
}

function getClient(id) {
    return player_list[id];
}