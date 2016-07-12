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
				return position.movenum >= 5 && position.movenum <= 10;
			});
			console.log("Position count: " + toBeAnalyzed.length);
			return toBeAnalyzed;
		})
		.map(function(singlePosition) {
			// Analyze each position 
			console.log(singlePosition);
			return analyzePosition(
				singlePosition.fen, 
				singlePosition.movenum, 
				singlePosition.fromgame
			);
		}, {concurrency: 2})
		.then(function(results) {
			console.log("Analyzed: " + results.length);
			// Pack positions back into games
			var groupedIntoGames = _.groupBy(results, function(result) { 
				return result.fromgame
			});
			return _.mapValues(groupedIntoGames, function(positions) {
				return _.sortBy(positions, function(p) { return p.movenum})
			});

			console.log(groupedIntoGames);

		})
		.then(function(groupedIntoGames) {
			return _.mapValues(groupedIntoGames, function(positions) {
				if (!positions || positions.length < 2) return [];
				var currEval = parseFloat(positions[0].eval);
				var foundMistakes = [];

				_.each(_.tail(positions), function(position) {
					var thisEval = parseFloat(position.eval);
					var evalDiff = Math.abs(thisEval - currEval);
					if (evalDiff > 0.90) {
						// Mistake found
						foundMistakes.push({
							movenum: position.movenum,
							evalDiff: evalDiff
						});
					}

					currEval = parseFloat(position.eval);
				});

				return foundMistakes;


			});
		});



	}
}