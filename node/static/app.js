
angular.module('game', [])
.controller('gameController',
function($scope,$timeout){
	s = $scope;
	wordNum = -1;
	alphabet = "abcdefghijklmnopqrstuvwxyz";
	getTestWord = function(){
		wordNum += 1;
		var index = wordNum % 26;
		return { word:{
                'word':alphabet.charAt(index)+'TestWord',
                'score':1,
            }};
	}

	GAME_HEIGHT = 600;
	GAME_WIDTH = window.innerWidth;
	WORD_HEIGHT = 34;
	WORD_WIDTH = 100;

	$scope.words = [];
	$scope.wordMap = {};
	$scope.initials = {};


	function awardWord(word){
		this.score += word.score;
	};
	$scope.player = null;
	var initPlayer = function(pid){
		var player = {};
		player.pid = pid;
        player.num = 0;
		player.score = 0;
		$scope.player = player;
		player.awardWord = awardWord.bind(player);
		return player;
	};
    $scope.socket = io.connect('/');
    // on initial connection, create player
    $scope.socket.on('onconnected', function (data) {
        console.log('Connected. ID = ' + data.id);
        initPlayer(data.id);
    });
    // Uh...this is kinda sketchy?
    $scope.opponent = initPlayer(null, 1);
	inputBox = document.getElementById('inputBox');
	$scope.bodyClick = function(){
		inputBox.focus();
	};

	function typeLetter(letter, player){
        var correct = this.remaining.charAt(0);
		if (correct.toLowerCase()==letter) {
			this.typed += correct;
			this.remaining = this.remaining.slice(1,this.remaining.length);
            if (player.pid) {
                $scope.socket.emit('key', {letter:letter, id:$scope.player.pid});
            }
		} else {
			return;
		}
		if (this.remaining.length == 0){
			player.awardWord(this);
			this.destroy(this);
		}
	};

	function destroy(){
		$timeout.cancel(this.tick);
		var index = this.container.indexOf(this);
		$scope.initials[this.word.charAt(0).toLowerCase()] = undefined;
		if ($scope.currentWord == this){
			$scope.currentWord = undefined;
		}
		this.opacity = 0;
		$timeout(function(){
			this.container.splice(index, 1);
		}.bind(this), 500);
	};

	function wordTick(){
		this.tick = $timeout(function(){
			if (this.life <= 0){
				this.destroy();
				return;
			}
            // For test purposes
			this.life -= 100;
			this.Yoffset = (1-this.life/this.maxLife)*(GAME_HEIGHT+WORD_HEIGHT)-WORD_HEIGHT;
			this.wordTick();
		}.bind(this), 500);
	};

	$scope.createWord = function(data){
        var word = data.word;
		word.maxLife = word.maxLife || 1000;
		word.life = word.maxLife;
		word.Yoffset = -WORD_HEIGHT + 130;
		word.container = $scope.words;
		word.typeLetter = typeLetter.bind(word);
		word.destroy = destroy.bind(word);
		word.wordTick = wordTick.bind(word);
		word.Xoffset = getXoffset(WORD_WIDTH);
		word.typed = "";
		word.remaining = word.word;
		word.owner = -1;
		word.opacity = 1;

		$scope.words.push(word);
		$scope.initials[word.word.charAt(0).toLowerCase()] = word;
		$scope.wordMap[word.word] = word;
		$timeout(word.wordTick);
	};

	var getXoffset = function(word_width){
		return Math.random()*(GAME_WIDTH-word_width);
	};

	$scope.wordStyle = function(word){
		style = {}
		style.top = String(word.Yoffset)+"px";
		style.left = String(word.Xoffset)+"px";
		if (word.opacity == 0){
			style.opacity = "0";
			style.transform = "rotateY(90deg)";
			style['-webkit-transform'] = style.transform;
		}
		return style;
	};

	$scope.keyPressed = function(event){
		letter = String.fromCharCode(event.charCode).toLowerCase();
		if (!$scope.currentWord){
			var word = $scope.initials[letter]
			if (word.owner != -1){
				return;
			}
			$scope.currentWord = word;
			$scope.currentWord.owner = 0;
		}
		if ($scope.currentWord){
			$scope.currentWord.typeLetter(letter, $scope.player);
		}
	};

	$scope.opponentKey = function(obj){
		var word = $scope.wordMap[obj.word.word];
		if (word.owner != 1){
			word.owner = 1;
			word.remaining = word.word;
			word.typed = "";
		}
		typeLetter.bind(word)(obj.letter, $scope.opponent);
	};

	$scope.timeRemaining = 90;
	$scope.countdownStarted = false;
	$scope.timerTick = function(){
		if ($scope.timeRemaining <= 0){
			while ($scope.words.length){
				$scope.words[0].destroy();
			}
			return;
		}
		$scope.bodyClick();
		$timeout(function(){
			$scope.timeRemaining -= 1;
			$scope.timerTick();
		},1000);
	};
	$scope.startTimer = function(){
		$scope.countdownStarted = true;
		$scope.socket.emit('startGame', {pid:$scope.player.pid});
		$scope.timerTick();
	};
    
    $scope.socket.on('gameStarted', function (empty) {
        if (!$scope.countdownStarted) {
            $scope.countdownStarted = true;
            $scope.timerTick();
        }
    });

	$scope.socket.on('newWord', $scope.createWord);
	// param: data = {word: word object}
    // can change this later

	$scope.socket.on('opponentKey', $scope.opponentKey);
	// param: {word: String, letter: String}
    
    // verifies state (server state overrides all of client)
    $scope.socket.on('verify', function (data) {
        var engine = data.to_send;
        // Replace words, but keep timeout/other attributes
        for (var word in engine.curr_words) {
            if (!(word in $scope.words)) {
                $scope.createWord( {word: word} );
            }
        }
        var to_remove = new Array();
        for (var word in $scope.words) {
            if (!(word in engine.curr_words)) {
                to_remove.push(word);
            }
        }
        for (var word in to_remove) {
            word.destroy();
        }
        // Rebuild initials/word maps
        $scope.initials = {};
        $scope.wordMap = {};
        for (var word in $scope.words) {
            $scope.initials[word.word.charAt(0).toLowerCase()] = word;
            $scope.wordMap[word.word] = word;
        }
        // Set player attributes
        var player;
        if ($scope.player.pid == engine.player1.userid) {
            player = engine.player1;
        } else if ($scope.player.pid == engine.player1.userid) {
            player = engine.player2;
        }
        $scope.player.score = player.score;
        // Set current player word and progress
        if (!player.word) {
            $scope.currentWord = null;
        } else {
            $scope.currentWord = $scope.wordMap[player.word.word];
            $scope.currentWord.remaining = player.word.slice(player.partial.length);
        }
    });
});
