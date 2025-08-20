// const tick = require('./4tick.js')
// Отключаем предупреждения о устаревших функциях
process.noDeprecation = true

const fetch = require('node-fetch') // Импортируем модуль fetch
require('dotenv').config()
//Логика билетов
const crypto = require('crypto')
const morgan = require('morgan') // Импортируем morgan для логирования
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
	// Переводим в формат UTC и добавляем 4 часа для Самары
	const samaraTime = new Date(now.getTime() + 4 * 60 * 60 * 1000)

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
