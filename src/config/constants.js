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

// Команды бота
const botCommands = [
	{
		command: 'start',
		description: 'Запуск бота',
	},
	{
		command: 'tickets',
		description: 'Информация о билетах',
	},
	{
		command: 'qrcode',
		description: 'Создать QR-код с UTM меткой',
	},
]

// Состояния сессии для QR-кода
const sessionStates = {
	WAITING_URL: 'waiting_url',
	WAITING_URL_CONFIRMATION: 'waiting_url_confirmation',
	WAITING_UTM: 'waiting_utm',
	WAITING_CONFIRMATION: 'waiting_confirmation',
}

// Форматы QR-кода
const qrFormats = {
	PNG: 'png',
	JPG: 'jpg',
}

module.exports = {
	colors,
	botCommands,
	sessionStates,
	qrFormats,
}
