const { shouldSendReport } = require('../utils/timeUtils')
const config = require('../config')
const { colors } = require('../config/constants')
const Logger = require('../middleware/logger')

class ReportScheduler {
	constructor(bot, ticketsService) {
		this.bot = bot
		this.ticketsService = ticketsService
		this.logger = new Logger()
		this.isRunning = false
	}

	/**
	 * Запуск планировщика
	 */
	start() {
		if (this.isRunning) {
			this.logger.warn('Планировщик уже запущен')
			return
		}

		this.isRunning = true

		// Проверяем каждую минуту
		this.interval = setInterval(() => {
			if (shouldSendReport()) {
				this.sendTicketsToChannel()
			}
		}, config.scheduler.checkInterval)

		this.logger.info('Планировщик автоматической отправки отчетов запущен')
		this.logger.info(
			`Отчеты будут отправляться в канал ${config.bot.channelId} каждый день в ${config.scheduler.reportHour}:00 по самарскому времени`
		)
	}

	/**
	 * Остановка планировщика
	 */
	stop() {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = null
		}
		this.isRunning = false
		this.logger.info('Планировщик остановлен')
	}

	/**
	 * Отправка информации о билетах в канал
	 */
	async sendTicketsToChannel() {
		try {
			this.logger.info('Отправка автоматического отчета о билетах в канал...')

			const matches = require('../../matches')
			const message = await this.ticketsService.formatTicketsMessage(matches)

			await this.bot.api.sendMessage(config.bot.channelId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})

			this.logger.info('Отчет о билетах успешно отправлен в канал')

			// Логируем успешную отправку
			const logEntry = `[${new Date().toISOString()}] Автоматическая отправка отчета о билетах в канал ${
				config.bot.channelId
			} - УСПЕШНО`
			this.logger.info(logEntry)
		} catch (error) {
			// Не логируем ошибку как критическую, чтобы не вызывать перезапуск
			this.logger.warn(
				'Ошибка при отправке отчета в канал (не критическая)',
				error.message
			)

			// Логируем ошибку
			const logEntry = `[${new Date().toISOString()}] Ошибка при автоматической отправке отчета в канал ${
				config.bot.channelId
			}: ${error.message}`
			this.logger.warn(logEntry)

			// НЕ выбрасываем ошибку дальше, чтобы не вызывать перезапуск процесса
		}
	}
}

module.exports = ReportScheduler
