// const tick = require('./4tick.js')
// Отключаем предупреждения о устаревших функциях
process.noDeprecation = true

const fetch = require('node-fetch') // Импортируем модуль fetch
require('dotenv').config()
//Логика билетов
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Коды цветов ANSI для консоли
const colors = {
	green: '\x1b[32m',
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	underscore: '\x1b[4m',
	blink: '\x1b[5m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
}

// const urls = process.env.BOT_API_URL
const login = process.env.BOT_TICKETS_LOGIN
const password = process.env.BOT_TICKETS_PASSWORD
const timestamp = Math.floor(Date.now() / 1000) // Текущая метка времени в секундах
// Хешируем пароль сначала с помощью MD5, затем с помощью SHA1
const hashedPassword = crypto
	.createHash('sha1')
	.update(crypto.createHash('md5').update(password).digest('hex') + timestamp)
	.digest('hex')

// Формируем строку
const resultString = `${login}:${hashedPassword}:${timestamp}`

// Импортируем конфигурацию матчей
const matches = require('./matches.js')

// ID канала для автоматической отправки
const CHANNEL_ID = '-1002396067751'

async function ticketsGetInfo(resultString, eventId) {
	const url = `https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=${resultString}&city_id=3296193&event_id=${eventId}`
	const response = await fetch(url)

	if (!response.ok) {
		throw new Error('Network response was not ok')
	}

	const data = await response.json()
	if (data.status === '0') {
		const results = data.result
		const tickets = {
			allCount: results.length,
			count: results.filter(item => item.price !== 0).length,
			totalPrice: results.reduce((sum, ticket) => sum + ticket.price, 0),
		}
		return tickets
	} else {
		throw new Error(`Ошибка в ответе API: ${data.error}`)
	}
}

// Функция для форматирования чисел с пробелами
function formatNumber(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Функция для обработки всех матчей
async function processAllMatches(resultString, matches) {
	const results = []

	for (const match of matches) {
		try {
			const tickets = await ticketsGetInfo(resultString, match.eventId)
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

//Завершение логики билетов

const { Bot, GrammyError, HttpError } = require('grammy')

const bot = new Bot(process.env.BOT_API_KEY)

// Настройка логирования с помощью Morgan
// Создаем директорию logs, если она не существует
const logsDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir)
}

// Создаем потоки для логирования
const accessLogStream = fs.createWriteStream(
	path.join(logsDir, 'telegram-bot.log'),
	{ flags: 'a' }
)

// Настройка логов Telegram бота
const logTelegramRequest = ctx => {
	if (!ctx.from) return

	// Получаем дату в часовом поясе Самары (UTC+4)
	const now = new Date()
	// Добавляем 4 часа для Самары
	const samaraOffset = 4 * 60 * 60 * 1000
	const samaraTime = new Date(now.getTime() + samaraOffset)

	// Форматируем дату в нужном формате
	const year = samaraTime.getUTCFullYear()
	const month = String(samaraTime.getUTCMonth() + 1).padStart(2, '0')
	const day = String(samaraTime.getUTCDate()).padStart(2, '0')
	const hours = String(samaraTime.getUTCHours()).padStart(2, '0')
	const minutes = String(samaraTime.getUTCMinutes()).padStart(2, '0')
	const seconds = String(samaraTime.getUTCSeconds()).padStart(2, '0')

	const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

	const username = ctx.from.username || 'anonymous'
	const userId = ctx.from.id
	const firstName = ctx.from.first_name || ''
	const lastName = ctx.from.last_name || ''
	const command = ctx.message?.text || 'неизвестная команда'

	const logEntry = `[${timestamp}] Пользователь: @${username} (${firstName} ${lastName}, ID: ${userId}) | Запрос: ${command}`

	// Выводим в консоль с цветом
	console.log(`${colors.cyan}${logEntry}${colors.reset}`)

	// Записываем в файл (без цветов)
	fs.appendFileSync(path.join(logsDir, 'telegram-bot.log'), logEntry + '\n')
}

bot.api.setMyCommands([
	{
		command: 'start',
		description: 'Запуск бота',
	},
	{
		command: 'tickets',
		description: 'Информация о билетах',
	},
	{
		command: 'test_channel',
		description: 'Тест отправки в канал (только для администраторов)',
	},
])

// Мидлвар для логирования запросов к боту
bot.use((ctx, next) => {
	logTelegramRequest(ctx)
	return next()
})

bot.command('start', async ctx => {
	await ctx.react('👍')
	await ctx.reply(
		'Привет! Я - бот ФК "Акрон". Молодой и звонкий! <span class="tg-spoiler">Хорошего дня!</span>',
		{
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		}
	)
})

bot.command('tickets', async ctx => {
	try {
		const message = await formatTicketsMessage()

		await ctx.reply(message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})
	} catch (error) {
		console.error('Произошла ошибка при получении информации о билетах:', error)
		await ctx.reply(
			'Извините, произошла ошибка при получении информации о билетах.'
		)
	}
})

// Команда для тестирования отправки в канал
bot.command('test_channel', async ctx => {
	try {
		await ctx.reply('Отправляю тестовое сообщение в канал...')
		await sendTicketsToChannel()
		await ctx.reply('Тестовое сообщение успешно отправлено в канал!')
	} catch (error) {
		console.error('Ошибка при тестировании отправки в канал:', error)
		await ctx.reply(
			'Произошла ошибка при отправке тестового сообщения в канал.'
		)
	}
})

// <b>${ticketsSum}руб.</b>
bot.hears(/пипец/, async ctx => {
	await ctx.reply('Ругаемся?')
})

bot.catch(err => {
	const ctx = err.ctx
	console.error(`Error while handling update ${ctx.update.update_id}:`)
	const e = err.error
	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description)
	} else if (e instanceof HttpError) {
		console.error('Could not contact Telegram:', e)
	} else console.error('Unknown error:', e)
})

bot.start()
console.log(
	`${colors.cyan}Сервер запущен! ${colors.green}Логирование настроено.${colors.reset}`
)

// Функция для формирования сообщения о билетах (выносим логику из команды)
async function formatTicketsMessage() {
	try {
		// Получаем данные по всем матчам
		const allResults = await processAllMatches(resultString, matches)

		// Формируем сообщение со всеми матчами
		let message = '<b>ИНФОРМАЦИЯ О БИЛЕТАХ ПО ВСЕМ МАТЧАМ</b>\n\n'

		for (let i = 0; i < allResults.length; i++) {
			const result = allResults[i]

			if (result.error) {
				message += `❌ <b>${result.match.game}</b>\n`
				message += `Ошибка: ${result.error}\n\n`
				continue
			}

			const { match, tickets } = result

			// Расчет процента выполнения плана и средней стоимости билетов
			const planCompletionPercent = (
				(tickets.totalPrice / match.planRevenue) *
				100
			).toFixed(0)
			const averageTicketPrice =
				tickets.count > 0 ? Math.round(tickets.totalPrice / tickets.count) : 0

			message += `<b>${match.game}</b>\n\n`
			message += `Продано: <b>${formatNumber(tickets.count)}</b>\n`
			message += `Пригласительных: <b>${formatNumber(
				tickets.allCount - tickets.count
			)}</b>\n`
			message += `Сумма: <b>${formatNumber(tickets.totalPrice)} ₽</b>\n`
			message += `Средняя стоимость: <b>${formatNumber(
				averageTicketPrice
			)} ₽</b>\n\n`
			// message += `План: <b>${formatNumber(match.planTickets)} билетов</b>\n`
			message += `План: <b>${formatNumber(match.planRevenue)} ₽</b>\n`
			message += `Выполнения плана: <b>${planCompletionPercent}%</b>\n`
			message += `Итого: <b>${formatNumber(tickets.allCount)}</b>\n`

			// Добавляем разделитель между матчами (кроме последнего)
			if (i < allResults.length - 1) {
				message += '\n' + '─'.repeat(12) + '\n\n'
			}
		}

		return message
	} catch (error) {
		console.error(
			'Произошла ошибка при формировании сообщения о билетах:',
			error
		)
		return 'Извините, произошла ошибка при получении информации о билетах.'
	}
}

// Функция для автоматической отправки информации о билетах в канал
async function sendTicketsToChannel() {
	try {
		console.log(
			`${
				colors.yellow
			}[${new Date().toISOString()}] Отправка автоматического отчета о билетах в канал...${
				colors.reset
			}`
		)

		const message = await formatTicketsMessage()

		await bot.api.sendMessage(CHANNEL_ID, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})

		console.log(
			`${
				colors.green
			}[${new Date().toISOString()}] Отчет о билетах успешно отправлен в канал${
				colors.reset
			}`
		)

		// Логируем успешную отправку
		const logEntry = `[${new Date().toISOString()}] Автоматическая отправка отчета о билетах в канал ${CHANNEL_ID} - УСПЕШНО`
		fs.appendFileSync(path.join(logsDir, 'telegram-bot.log'), logEntry + '\n')
	} catch (error) {
		console.error(
			`${
				colors.red
			}[${new Date().toISOString()}] Ошибка при отправке отчета в канал:${
				colors.reset
			}`,
			error
		)

		// Логируем ошибку
		const logEntry = `[${new Date().toISOString()}] Ошибка при автоматической отправке отчета в канал ${CHANNEL_ID}: ${
			error.message
		}`
		fs.appendFileSync(path.join(logsDir, 'telegram-bot.log'), logEntry + '\n')
	}
}

// Функция для проверки, нужно ли отправить отчет (11:00 по самарскому времени)
function shouldSendReport() {
	const now = new Date()

	// Получаем текущее время в Самаре (UTC+4)
	// Используем простой подход: добавляем 4 часа к UTC
	const samaraOffset = 4 * 60 * 60 * 1000 // 4 часа в миллисекундах
	const samaraTime = new Date(now.getTime() + samaraOffset)

	const hours = samaraTime.getUTCHours()
	const minutes = samaraTime.getUTCMinutes()

	// Отправляем только в 11:00 по самарскому времени
	return hours === 11 && minutes === 0
}

// Функция для запуска планировщика
function startScheduler() {
	// Проверяем каждую минуту
	setInterval(() => {
		if (shouldSendReport()) {
			sendTicketsToChannel()
		}
	}, 60 * 1000) // 60 секунд = 1 минута

	console.log(
		`${colors.cyan}Планировщик автоматической отправки отчетов запущен${colors.reset}`
	)
	console.log(
		`${colors.cyan}Отчеты будут отправляться в канал ${CHANNEL_ID} каждый день в 11:00 по самарскому времени${colors.reset}`
	)
}

startScheduler()
