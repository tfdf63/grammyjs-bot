const { GrammyError, HttpError } = require('grammy')
const Logger = require('./logger')

class ErrorHandler {
	constructor() {
		this.logger = new Logger()
	}

	/**
	 * Обработка ошибок бота
	 * @param {Error} err - Объект ошибки
	 * @param {Object} ctx - Контекст Telegram
	 */
	handle(err, ctx) {
		const e = err.error || err

		// Логируем ошибку
		this.logger.error('Bot error occurred', e)

		// Определяем тип ошибки и отправляем соответствующее сообщение
		if (e instanceof GrammyError) {
			this.logger.error('Grammy API error', e)
			return ctx.reply('❌ Произошла ошибка Telegram API. Попробуйте позже.')
		}

		if (e instanceof HttpError) {
			this.logger.error('HTTP error', e)
			return ctx.reply('❌ Ошибка сети. Проверьте подключение к интернету.')
		}

		// Для неизвестных ошибок
		this.logger.error('Unknown error', e)
		return ctx.reply('❌ Произошла внутренняя ошибка. Попробуйте позже.')
	}

	/**
	 * Middleware для обработки ошибок
	 */
	middleware() {
		return err => {
			const ctx = err.ctx
			this.handle(err, ctx)
		}
	}

	/**
	 * Обработка ошибок API
	 * @param {Error} error - Объект ошибки
	 * @param {string} context - Контекст ошибки
	 */
	handleApiError(error, context = '') {
		this.logger.error(`API Error in ${context}`, error)

		if (error.message.includes('Network response was not ok')) {
			return 'Ошибка сети при получении данных'
		}

		if (error.message.includes('Ошибка в ответе API')) {
			return 'Ошибка API сервиса билетов'
		}

		return 'Произошла ошибка при получении данных'
	}
}

module.exports = ErrorHandler
