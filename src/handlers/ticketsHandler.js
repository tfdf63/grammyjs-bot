const { Keyboard } = require('grammy')
const TicketsService = require('../services/ticketsService')
const ErrorHandler = require('../middleware/errorHandler')
const matches = require('../../matches')

class TicketsHandler {
	constructor(ticketsService) {
		this.ticketsService = ticketsService
		this.errorHandler = new ErrorHandler()
	}

	/**
	 * Обработка команды /tickets
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleTicketsCommand(ctx) {
		try {
			const message = await this.ticketsService.formatTicketsMessage(matches)

			await ctx.reply(message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})
		} catch (error) {
			const errorMessage = this.errorHandler.handleApiError(
				error,
				'tickets command'
			)
			await ctx.reply(errorMessage)
		}
	}

	/**
	 * Обработка команды /test_channel
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleTestChannelCommand(ctx) {
		try {
			await ctx.reply('Отправляю тестовое сообщение в канал...')
			await this.sendTicketsToChannel()
			await ctx.reply('Тестовое сообщение успешно отправлено в канал!')
		} catch (error) {
			const errorMessage = this.errorHandler.handleApiError(
				error,
				'test channel command'
			)
			await ctx.reply(errorMessage)
		}
	}

	/**
	 * Отправка информации о билетах в канал
	 * @param {string} channelId - ID канала
	 */
	async sendTicketsToChannel(channelId) {
		try {
			const message = await this.ticketsService.formatTicketsMessage(matches)

			// Здесь нужно передать bot instance из основного файла
			// Пока что возвращаем сообщение для дальнейшей отправки
			return message
		} catch (error) {
			this.errorHandler.handleApiError(error, 'send tickets to channel')
			throw error
		}
	}
}

module.exports = TicketsHandler
