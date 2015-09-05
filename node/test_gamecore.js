var engine = require('./gamecore.js')();

engine.printStuff = function () {
    console.log(this.curr_words);
    console.log("MAX_WORDS: " + this.MAX_WORDS);
    console.log(this.player1);
    console.log(this.player2);
};

// Enter commands of the form b, 1<letter>, 2<letter>
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
    if (chunk[0] === "b") {
        engine.setupGame('1', '2');
    } else {
        if (chunk[0] === '1') {
            engine.keyPressed(engine.player1.userid, chunk[1]);
        } else if (chunk[0] === '2') {
            engine.keyPressed(engine.player2.userid, chunk[1]);
        }
    }
    engine.printStuff();
});