// module.exports is the object returned on import
var lobby = module.exports = { games: {}, game_count:0 };
var UUID = require('node-uuid');

// prepends all logging with Lobby label
lobby.log = function (msg) {
    console.log('Lobby: ' + msg);
};

lobby.findGame = function (player) {
    // tries the match the player with a game
    // returns the game the player is added to
    this.log('looking for a game for ' + player.userid);
    // if open game, add player to that game
    if (this.game_count) {
        for (var gameid in this.games) {
            var game_instance = this.games[gameid];
            // only supports 2 player
            if (game_instance.player_count < 2) {
                // make this player join
                // game instance has host and client attribute
                game_instance.player_client = player;
                game_instance.player_count += 1;
                player.gameid = gameid;
                this.log(player.userid + ' joined game hosted by ' + game_instance.player_host.userid);
                return 1;
            } else {
                // cannot find open game, host one
                this.createGame(player);
                return 0;
            }
        }
    } else {
        // cannot find any game, host one
        this.createGame(player);
        return 0;
    }
};

lobby.createGame = function (player) {
    // player is the host of this game
    // game IDs are UUIDs
    var newgame = {
        id: UUID(),
        player_host: player,
        player_client: null,
        player_count: 1,
    };
    this.games[newgame.id] = newgame
    this.game_count++;
    player.gameid = newgame.id;
    this.log(player.userid + ' started hosting a game');
};

lobby.endGame = function (game) {
    // Removes game, removes game attribute on those players.
    delete this.games[game.id]; // I think this leaves an empty spot. Shouldn't matter unless large scale
    if (game.player_host) {
        game.player_host.gameid = null;
    }
    if (game.player_client) {
        game.player_client.gameid = null;
    }
    this.game_count -= 1;
    this.log('game was deleted.');
}