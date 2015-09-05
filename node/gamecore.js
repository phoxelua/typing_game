var fs = require('fs');
// DOS file so split on \r\n
var all_words = fs.readFileSync(__dirname + '/word_list.txt', 'utf8').split('\r\n');
var start_letters = {};
// Set ALL the attributes to null!
// Except a couple.

// Creates an engine when called
var engineMaker = module.exports = function () {
    var engine = { curr_words: new Array(),
                     MAX_WORDS: 10,
                     player1: {
                        userid: null,
                        word: null,
                        partial: null,
                        score: 0,
                        client: null
                     },
                     player2: {
                        userid: null,
                        word: null,
                        partial: null,
                        score: 0,
                        client: null
                     },
                   };
    attachFunctions(engine);
    return engine;
};

// We need a word object. This creates it.
function makeWord(text) {
    return {word: text, score: 1};
}
               
// this game engine (might) be exposed to client,
// so use a function with engine as argument
function finishedWord(game_engine, player) {
    player.score += player.word.score;
    game_engine.replaceWord(player.word);
    player.word = null;
}

function attachFunctions(engine) {
    // Semi fancy logging!
    engine.log = function (msg) {
        console.log("Game engine: " + msg);
    }

    // TODO consider making these functions not attributes
     
    engine.setupGame = function (id1, id2, socket1, socket2) {
        // Add random words to fill up bank
        engine.player1.userid = id1;
        engine.player2.userid = id2;
        engine.player1.client = socket1;
        engine.player2.client = socket2;
        var raw_word;
        var word;
        // generate words, emit to both clients
        while (this.curr_words.length < this.MAX_WORDS) {
            raw_word = all_words[Math.floor(Math.random()*all_words.length)];
            if (raw_word && !(raw_word[0] in start_letters)) {
                word = makeWord(raw_word);
                this.curr_words.push(word);
                start_letters[raw_word[0]] = word;
                this.player1.client.emit('newWord', { word: word });
                this.player2.client.emit('newWord', { word: word });
            }
        }
    };

    // Only sends the id, so it shouldn't be able to change game state
    // Return the word updated, or null if none were updated
    engine.keyPressed = function (userid, ch) {
        // Check given player is in game
        this.log('keyPressed: ' + userid + ", " + ch);
        if (userid != this.player1.userid && userid != this.player2.userid) {
            this.log("player " + userid + " is not a player in this game.");
        }
        // because players are objects, these should be references
        var player, opp;
        if (userid == this.player1.userid) {
            player = this.player1;
            opp = this.player2;
        } else {
            player = this.player2;
            opp = this.player1;
        }
        if (!player.word) {
            // Check if player claims a word
            if (ch in start_letters) {
                var to_claim = start_letters[ch];
                if (opp.word == to_claim) {
                    this.log(to_claim.word + " already claimed by " + opp.userid + "!");
                    return null; // TODO maybe a message about this to client?
                }
                player.word = to_claim;
                player.partial = ch;
                opp.client.emit('opponentKey',
                                { word: player.word,
                                  partial: player.partial,
                                  letter: ch});
            }
        } else {
            // Check if next letter was typed
            // assumes partial is always a substring of the word
            if (player.word.word[player.partial.length] == ch) {
                player.partial += ch;
                if (player.partial == player.word.word) {
                    opp.client.emit('opponentKey',
                                    { word: player.word,
                                      partial: player.partial,
                                      letter: ch});
                    finishedWord(this, player);
                } else {
                    opp.client.emit('opponentKey',
                                    { word: player.word,
                                      partial: player.partial,
                                      letter: ch});
                }
            } else {
                return null; // TODO maybe a message about this?
            }
        }
    };

    engine.replaceWord = function (word) {
        delete start_letters[word.word[0]];
        // this removal is O(n) but it should be miniscule
        var index = this.curr_words.indexOf(word);
        if (index > -1) {
            // Don't want to distub indices
            delete this.curr_words[index];
            var raw_word;
            do {
                raw_word = all_words[Math.floor(Math.random()*all_words.length)];
            } while (raw_word[0] in start_letters);
            var word = makeWord(raw_word);
            this.curr_words[index] = word;
            start_letters[raw_word[0]] = word;
            // send new word to both clients
            this.player1.client.emit('newWord', { word: word });
            this.player2.client.emit('newWord', { word: word });
        }
    };
}