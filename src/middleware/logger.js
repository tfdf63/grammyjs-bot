const fs = require('fs')
const path = require('path')
const config = require('../config')
const { colors } = require('../config/constants')
const { formatSamaraTime } = require('../utils/formatters')

class Logger {
	constructor() {
		this.logsDir = config.logging.logsDir
		this.telegramLogFile = config.logging.telegramLogFile
		this.ensureLogsDirectory()
	}

	/**
	 * Создание директории для логов
	 */
	ensureLogsDirectory() {
		if (!fs.existsSync(this.logsDir)) {
			fs.mkdirSync(this.logsDir, { recursive: true })
		}
	}

	/**
	 * Логирование запроса к Telegram боту
	 * @param {Object} ctx - Контекст Telegram
	 */
	logTelegramRequest(ctx) {
		if (!ctx.from) return

		const timestamp = formatSamaraTime()
		const username = ctx.from.username || 'anonymous'
		const userId = ctx.from.id
		const firstName = ctx.from.first_name || ''
		const lastName = ctx.from.last_name || ''
		const command = ctx.message?.text || 'неизвестная команда'

		const logEntry = `[${timestamp}] Пользователь: @${username} (${firstName} ${lastName}, ID: ${userId}) | Запрос: ${command}`

		// Выводим в консоль с цветом
		console.log(`${colors.cyan}${logEntry}${colors.reset}`)

		// Записываем в файл (без цветов)
		fs.appendFileSync(
			path.join(this.logsDir, this.telegramLogFile),
			logEntry + '\n'
		)
	}

	/**
	 * Логирование информации
	 * @param {string} message - Сообщение
	 * @param {Object} meta - Дополнительные данные
	 */
	info(message, meta = {}) {
		const timestamp = formatSamaraTime()
		const logEntry = `[${timestamp}] [INFO] ${message} ${
			Object.keys(meta).length ? JSON.stringify(meta) : ''
		}`
		console.log(`${colors.green}${logEntry}${colors.reset}`)
	}

	/**
	 * Логирование ошибок
	 * @param {string} message - Сообщение об ошибке
	 * @param {Error} error - Объект ошибки
	 */
	error(message, error) {
		const timestamp = formatSamaraTime()
		const logEntry = `[${timestamp}] [ERROR] ${message} ${
			error ? error.stack || error.message : ''
		}`
		console.error(`${colors.red}${logEntry}${colors.reset}`)
	}

	/**
	 * Логирование предупреждений
	 * @param {string} message - Сообщение предупреждения
	 * @param {Object} meta - Дополнительные данные
	 */
	warn(message, meta = {}) {
		const timestamp = formatSamaraTime()
		const logEntry = `[${timestamp}] [WARN] ${message} ${
			Object.keys(meta).length ? JSON.stringify(meta) : ''
		}`
		console.warn(`${colors.yellow}${logEntry}${colors.reset}`)
	}

	/**
	 * Middleware для логирования запросов к боту
	 */
	middleware() {
		return (ctx, next) => {
			this.logTelegramRequest(ctx)
			return next()
		}
	}
}

module.exports = Logger
