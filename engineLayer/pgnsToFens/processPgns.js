var _ = require('lodash');

var processPgn = require('./singlePgnToFens');
var separatePgns = require('./separatePgns');

module.exports = function(pgnsText) {

	var separationObj = separatePgns(pgnsText);
	
	var positionsPerGame = _.map(separationObj.games, function(singlePGN) {
		return processPgn(singlePGN.moves);
	});

	return {
		positionalizedGames: positionsPerGame, 
		failedGamesCount: separationObj.failed
	};
}