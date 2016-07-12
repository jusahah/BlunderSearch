var Promise = require('bluebird');
var _ = require('lodash');
var uuid = require('node-uuid');

var pgnsToFens = require('./pgnsToFens/processPgns');
var analyzePosition = require('./analysis/analyze')(6 * 1000 /* Movetime */);

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
				return position.movenum >= 10 && position.movenum <= 30;
			});
			console.log("Position count: " + toBeAnalyzed.length);
			return toBeAnalyzed;
		})
		.map(analyzePosition, {concurrency: 4} /*Num of parallel engine instances to use?*/)
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
					var oldBest = currPosition.bestmove;
					var oldEval = currPosition.evaluation;

					// Replace old with the current for next loop run
					currPosition = position;

					if (evalDiff > 25) {
						// Mistake found
						return {
							fenBefore: oldFen,
							fenAfter: position.fen,
							evalBefore: oldEval,
							evalAfter: position.evaluation,
							movenum: position.movenum,
							evalDiff: evalDiff,
							playedMove: position.move,
							bestMove: oldBest
						};
					}

					return null;

					
				}));

				


			});
		}).catch(function(err) {
			console.log(err);
			throw err;
		})



	}
}