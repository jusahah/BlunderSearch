var Promise = require('bluebird');
var _ = require('lodash');
var spawn = require('child_process').spawn;

function fakeAnalysis(fen, movenum, fromgame) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve({
				fen: fen,
				movenum: movenum,
				fromgame: fromgame,
				eval: (2 - (Math.random() * 4)).toFixed(2),
				bestmove: 'a2a3',
				depth: 16
			});
		}, Math.random()*50 + 100);
	});
}

function realAnalysis(fen, depth) {
	return new Promise(function(resolve, reject) {
		startAnalysis(fen,depth, resolve, reject);
	});

}


function startAnalysis(fen, movenum, fromgame, successCb, errorCb) {
	// Depth between 16 and 24, default is 22
	var depth = 16;
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
		console.log("Fen analysis over");
		stockfish.stdin.end();
		setTimeout(function() {
			successCb({
				fen: fen,
				movenum: movenum,
				fromgame: fromgame,
				eval: evaluation,
				bestmove: bestmove,
				depth: depth
			});
		}, 0)
	}

	function launch() {
		var movetime = Math.floor(Math.random()*1500) + 2000;
		stockfish.stdin.write('ucinewgame\n');
		stockfish.stdin.write('position fen ' + fen + '\n');
		stockfish.stdin.write('go movetime ' + movetime + '\n');			
	}

	setTimeout(launch, 0);

}


module.exports = function(fen, movenum, fromgame) {

	if (process.env.NODE_ENV === 'production') {
		return realAnalysis(fen, movenum, fromgame);
	} 
	return fakeAnalysis(fen, movenum, fromgame);

}