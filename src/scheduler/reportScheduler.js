const { shouldSendReport, getSamaraCalendarTodayString } = require('../utils/timeUtils')
const { filterMatchesForTickets } = require('../utils/matchFilter')
const { mergeSnapshotForDate: mergeTicketsSnapshotForDate } = require('../services/ticketsSnapshotStore')
const { mergeSnapshotForDate: mergeSeasonsSnapshotForDate } = require('../services/seasonsSnapshotStore')
const config = require('../config')
const Logger = require('../middleware/logger')

class ReportScheduler {
	constructor(bot, ticketsService, seasonService) {
		this.bot = bot
		this.ticketsService = ticketsService
		this.seasonService = seasonService
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
				this.sendReportsToChannel()
			}
		}, config.scheduler.checkInterval)

		this.logger.info('Планировщик автоматической отправки отчетов запущен')
		this.logger.info(
			`Отчеты по билетам и абонементам будут отправляться в канал ${config.bot.channelId} каждый день в ${config.scheduler.reportHour}:00 по самарскому времени`
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
	 * Отправка отчётов о билетах и абонементах в канал
	 */
	async sendReportsToChannel() {
		await this.sendTicketsToChannel()
		await this.sendSeasonsToChannel()
	}

	/**
	 * Отправка информации о билетах в канал
	 */
	async sendTicketsToChannel() {
		try {
			this.logger.info('Отправка автоматического отчета о билетах в канал...')

			const matches = require('../../matches')
			const { message, snapshotMap } =
				await this.ticketsService.buildChannelTicketsReport(
					filterMatchesForTickets(matches)
				)

			await this.bot.api.sendMessage(config.bot.channelId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})

			mergeTicketsSnapshotForDate(getSamaraCalendarTodayString(), snapshotMap)

			this.logger.info('Отчет о билетах успешно отправлен в канал')
		} catch (error) {
			this.logger.warn(
				'Ошибка при отправке отчета о билетах в канал (не критическая)',
				error.message
			)
		}
	}

	/**
	 * Отправка информации об абонементах в канал
	 */
	async sendSeasonsToChannel() {
		try {
			this.logger.info('Отправка автоматического отчета об абонементах в канал...')

			const seasons = require('../../seasons')
			const { message, snapshotMap } =
				await this.seasonService.buildChannelSeasonsReport(seasons)

			await this.bot.api.sendMessage(config.bot.channelId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})

			mergeSeasonsSnapshotForDate(getSamaraCalendarTodayString(), snapshotMap)

			this.logger.info('Отчет об абонементах успешно отправлен в канал')
		} catch (error) {
			this.logger.warn(
				'Ошибка при отправке отчета об абонементах в канал (не критическая)',
				error.message
			)
		}
	}
}

module.exports = ReportScheduler
