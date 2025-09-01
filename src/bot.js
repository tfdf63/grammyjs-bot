// Отключаем предупреждения о устаревших функциях
process.noDeprecation = true

const { Bot, session } = require('grammy')

// Импорты конфигурации
const config = require('./config')
const { colors } = require('./config/constants')

// Импорты сервисов
const AuthService = require('./services/authService')
const TicketsService = require('./services/ticketsService')
const QRCodeService = require('./services/qrCodeService')

// Импорты middleware
const Logger = require('./middleware/logger')
const ErrorHandler = require('./middleware/errorHandler')

// Импорты обработчиков
const CommonHandler = require('./handlers/commonHandler')
const TicketsHandler = require('./handlers/ticketsHandler')
const QRCodeHandler = require('./handlers/qrCodeHandler')

// Импорт планировщика
const ReportScheduler = require('./scheduler/reportScheduler')

class TelegramBot {
	constructor() {
		this.bot = new Bot(config.bot.token)
		this.logger = new Logger()
		this.errorHandler = new ErrorHandler()

		// Инициализация сервисов
		this.authService = new AuthService()
		this.ticketsService = new TicketsService(this.authService)
		this.qrCodeService = new QRCodeService()

		// Инициализация обработчиков
		this.commonHandler = new CommonHandler()
		this.ticketsHandler = new TicketsHandler(this.ticketsService)
		this.qrCodeHandler = new QRCodeHandler(this.qrCodeService)

		// Инициализация планировщика
		this.scheduler = new ReportScheduler(this.bot, this.ticketsService)

		this.setupBot()
	}

	/**
	 * Настройка бота
	 */
	setupBot() {
		// Настраиваем сессии для хранения состояния пользователя
		this.bot.use(
			session({
				initial: () => ({
					step: null,
					url: null,
					utmTag: null,
					finalUrl: null,
					format: 'png',
				}),
			})
		)

		// Middleware для логирования
		this.bot.use(this.logger.middleware())

		// Настройка команд
		this.setupCommands()

		// Настройка обработчиков
		this.setupHandlers()

		// Обработка ошибок
		this.bot.catch(this.errorHandler.middleware())
	}

	/**
	 * Настройка команд бота
	 */
	async setupCommands() {
		await this.commonHandler.setupCommands(this.bot)
	}

	/**
	 * Настройка обработчиков
	 */
	setupHandlers() {
		// Команда /start
		this.bot.command('start', ctx => this.commonHandler.handleStartCommand(ctx))

		// Команда /tickets
		this.bot.command('tickets', ctx =>
			this.ticketsHandler.handleTicketsCommand(ctx)
		)

		// Команда /test_channel
		this.bot.command('test_channel', ctx =>
			this.ticketsHandler.handleTestChannelCommand(ctx)
		)

		// Команда /qrcode
		this.bot.command('qrcode', ctx =>
			this.qrCodeHandler.handleQRCodeCommand(ctx)
		)

		// Обработка ругательств
		this.bot.hears(/пипец/, ctx => this.commonHandler.handleSwearing(ctx))

		// Обработка текстовых сообщений для QR-кодов
		this.bot.on('message:text', ctx =>
			this.qrCodeHandler.handleTextMessage(ctx)
		)
	}

	/**
	 * Запуск бота
	 */
	async start() {
		try {
			// Сначала выводим сообщения о запуске
			this.logger.info('Сервер запущен! Логирование настроено.')

			// Запускаем планировщик
			this.scheduler.start()

			// В последнюю очередь запускаем бота (это блокирующая операция)
			await this.bot.start()
		} catch (error) {
			this.logger.error('Ошибка при запуске бота', error)
			process.exit(1)
		}
	}

	/**
	 * Остановка бота
	 */
	async stop() {
		try {
			this.scheduler.stop()
			await this.bot.stop()
			this.logger.info('Бот остановлен')
		} catch (error) {
			this.logger.error('Ошибка при остановке бота', error)
		}
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	console.log('\nПолучен сигнал SIGINT, останавливаем бота...')
	if (global.bot) {
		await global.bot.stop()
	}
	process.exit(0)
})

process.on('SIGTERM', async () => {
	console.log('\nПолучен сигнал SIGTERM, останавливаем бота...')
	if (global.bot) {
		await global.bot.stop()
	}
	process.exit(0)
})

module.exports = TelegramBot
