var Promise = require('bluebird');
var _ = require('lodash');
var uuid = require('node-uuid');

var pgnsToFens = require('./pgnsToFens/processPgns');
var analyzePosition = require('./analysis/analyze');

module.exports = function(options) {
	// Returns Promise
	return function(pgnText) {
		console.log("Process games starts");
		var separated = pgnsToFens(pgnText);

		return Promise.resolve(separated)
		.then(function(separated) {
			// Associate each position with uniq game id (that is generated)
			return _.map(separated.positionalizedGames, function(gamePositions) {
				var gameID = uuid.v4();
				_.each(gamePositions, function(pos) {
					pos.fromgame = gameID;
				});
				return gamePositions;
			});
		})
		.then(function(gamesPositionalized) {
			// Get an flattened array of positions
			return _.flattenDeep(gamesPositionalized);
		})
		.then(function(allPositions) {
			// Filter out those not in movenumber range
			//console.log(_.map(allPositions, function(p) {return p.movenum}));
			//kkk;
			var toBeAnalyzed = _.filter(allPositions, function(position) {
				return position.movenum >= 1 && position.movenum <= 10;
			});
			console.log("Position count: " + toBeAnalyzed.length);
			return toBeAnalyzed;
		})
		.map(analyzePosition, {concurrency: 2})
		.then(function(results) {
			console.log("Analyzed: " + results.length);
			console.log(results);
			// Pack positions back into games
			var groupedIntoGames = _.groupBy(results, function(result) { 
				return result.fromgame
			});
			return _.mapValues(groupedIntoGames, function(positions) {
				return _.sortBy(positions, function(p) { return p.movenum})
			});

			

		})
		.then(function(groupedIntoGames) {
			console.log(groupedIntoGames);
			return _.mapValues(groupedIntoGames, function(positions) {
				if (!positions || positions.length < 2) return [];
				var currPosition = positions[0];

				return _.compact(_.map(_.tail(positions), function(position) {
					var thisEval = parseFloat(position.evaluation);
					var evalDiff = Math.abs(thisEval - parseFloat(currPosition.evaluation));

					var oldFen = currPosition.fen;
					currPosition = position;

					if (evalDiff > 1.90) {
						// Mistake found
						return {
							fenBefore: oldFen,
							fenAfter: position.fen,
							movenum: position.movenum,
							evalDiff: evalDiff,
							playedMove: position.move,
							bestMove: position.bestmove
						};
					}

					return null;

					
				}));

				


			});
		});



	}
}