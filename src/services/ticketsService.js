const fetch = require('node-fetch')
const config = require('../config')
const { formatTicketsMessage } = require('../utils/formatters')

class TicketsService {
	constructor(authService) {
		this.authService = authService
		this.baseUrl = config.api.baseUrl
		this.cityId = config.api.cityId
	}

	/**
	 * Получение информации о билетах для конкретного события
	 * @param {string} eventId - ID события
	 * @returns {Promise<Object>} - Информация о билетах
	 */
	async getTicketsInfo(eventId) {
		const authString = this.authService.getAuthString()
		const url = `${this.baseUrl}?action=crm.order.ticket.list&auth=${authString}&city_id=${this.cityId}&event_id=${eventId}`

		const response = await fetch(url)

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()

		if (data.status === '0') {
			const results = data.result
			return {
				allCount: results.length,
				count: results.filter(item => item.price !== 0).length,
				totalPrice: results.reduce((sum, ticket) => sum + ticket.price, 0),
			}
		} else {
			throw new Error(`Ошибка в ответе API: ${data.error}`)
		}
	}

	/**
	 * Обработка всех матчей
	 * @param {Array} matches - Массив матчей
	 * @returns {Promise<Array>} - Результаты по всем матчам
	 */
	async processAllMatches(matches) {
		const results = []

		for (const match of matches) {
			try {
				const tickets = await this.getTicketsInfo(match.eventId)
				results.push({
					match: match,
					tickets: tickets,
				})
			} catch (error) {
				console.error(
					`Ошибка при получении данных для матча ${match.game}:`,
					error
				)
				results.push({
					match: match,
					error: error.message,
				})
			}
		}

		return results
	}

	/**
	 * Формирование сообщения о билетах
	 * @param {Array} matches - Массив матчей
	 * @returns {Promise<string>} - Отформатированное сообщение
	 */
	async formatTicketsMessage(matches) {
		try {
			const allResults = await this.processAllMatches(matches)
			return formatTicketsMessage(allResults)
		} catch (error) {
			console.error(
				'Произошла ошибка при формировании сообщения о билетах:',
				error
			)
			return 'Извините, произошла ошибка при получении информации о билетах.'
		}
	}
}

module.exports = TicketsService
