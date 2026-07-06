const SeasonService = require('../services/seasonService')
const ErrorHandler = require('../middleware/errorHandler')
const seasons = require('../../seasons')

class SeasonsHandler {
	constructor(seasonService) {
		this.seasonService = seasonService
		this.errorHandler = new ErrorHandler()
	}

	/**
	 * Обработка команды /seasons
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleSeasonsCommand(ctx) {
		try {
			const message = await this.seasonService.formatSeasonsMessage(seasons)

			await ctx.reply(message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})
		} catch (error) {
			const errorMessage = this.errorHandler.handleApiError(
				error,
				'seasons command'
			)
			await ctx.reply(errorMessage)
		}
	}
}

module.exports = SeasonsHandler
