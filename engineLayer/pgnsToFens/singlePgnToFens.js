var Chess    = require('chess.js').Chess;
var _ = require('lodash');

module.exports = function(pgn) {
	
	var chess = new Chess();
	var succ = chess.load_pgn(pgn);	
	//succ ? console.log('true') : console.error('false');	
	if (!succ) return false;

	// Get fens for the game
	return getPositions(chess.history({verbose: true}));

}

function getPositions(moves) {
	// moves has 1st move at index 0
	var moveNum = 1;
	var newchess = new Chess(); // Temporary Chess instance to apply moves to

	// Applying moves one by one and collecting positions
	var positions = _.map(moves, function(move) {
		newchess.move(move);
		return {move: move.san, color: move.color, fen: newchess.fen(), eval: '?', movenum: moveNum++};
	});

	return positions;
}