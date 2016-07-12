var Promise = require('bluebird');
var _ = require('lodash');
var spawn = require('child_process').spawn;

function fakeAnalysis(fen) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve({
				evaluation: (2 - (Math.random() * 4)).toFixed(2),
				bestmove: 'a2a4'
			});
		}, Math.random()*50 + 100);
	});
}

function realAnalysis(fen, movetime) {
	movetime = _.clamp((movetime || 5000), 1000, 30000);
	return new Promise(function(resolve, reject) {
		startAnalysis(fen, movetime, resolve, reject);
	});

}


function startAnalysis(fen, movetime, successCb, errorCb) {
	// Depth between 16 and 24, default is 22
	var depth = 20; // Not in use for now
	var stockfish = spawn('stockfish');
	var lastStartTime;
	var currentEval = '?';

	// This should be abstracted so that pgn and fen can use one listening function.
	stockfish.stdout.on('data', function(data) {

		var msg = data.toString('utf8');
		//console.log(msg);
		

		var nparts = msg.split('\n');

		_.each(nparts, function(part) {

			if (part.trim() === '') return;

			//console.log(part);

			var parts = part.split(" ");

			// check for score info
			var scoreIndex = parts.indexOf('score');
			if (scoreIndex !== -1) {
				//console.log("Changing eval: " + currentEval);
				currentEval = parts[scoreIndex+2];
			}

			// check for bestmove info
			var bestMoveIndex = parts.indexOf('bestmove');
			if (bestMoveIndex !== -1) {
				analysisDone(currentEval, parts[bestMoveIndex+1]);
			}
		});


	});

	function analysisDone(evaluation, bestmove) {
		console.log("Fen analysis over: " + fen);
		stockfish.stdin.end();
		
		successCb({
			fen: fen,
			bestmove: bestmove,
			evaluation: standardizeToWhite(fen, evaluation)
		});
		
	}

	function standardizeToWhite(fen, evaluation) {
		if (fen.split(" ")[1] === 'b') return evaluation * (-1);
		return evaluation * 1; // Cast to number
	}

	function launch() {
		console.log("Launching with: " + fen);

		stockfish.stdin.write('ucinewgame\n');
		stockfish.stdin.write('position fen ' + fen + '\n');
		stockfish.stdin.write('go movetime ' + movetime + '\n');			
	}

	setTimeout(launch, 0); // Let the call stack empty first for peace of mind?

}

// Factory taking in movetime and returning analysis function
module.exports = function(movetime) {

	return function(position) {

		console.log("INITING ANALYSIS FOR POS: " + position.fen);
		//console.log(position);

		return new Promise(function(resolve, reject) {
			var decoratePosition = function(evalInfo) {
				return resolve(_.assign({
					evaluation: evalInfo.evaluation, 
					bestmove: evalInfo.bestmove
				}, position));
			};

			if (process.env.NODE_ENV === 'production') {
				return realAnalysis(position.fen, movetime).then(decoratePosition);
			} 

			fakeAnalysis(position.fen).then(decoratePosition);
		});



	}
}