const { getMinMatchDateForTickets } = require('./timeUtils')

/**
 * Матчи для отчёта о билетах: дата матча не раньше «вчера» по самарскому календарю.
 * @param {Array<{ matchDate: string }>} matches
 * @returns {Array}
 */
function filterMatchesForTickets(matches) {
	const min = getMinMatchDateForTickets()
	return matches.filter(m => m.matchDate >= min)
}

module.exports = { filterMatchesForTickets }
