/**
 * Форматирование чисел с пробелами
 * @param {number} num - Число для форматирования
 * @returns {string} - Отформатированное число
 */
function formatNumber(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Форматирование даты в самарском времени
 * @param {Date} date - Дата для форматирования
 * @returns {string} - Отформатированная дата
 */
function formatSamaraTime(date = new Date()) {
	const samaraOffset = 4 * 60 * 60 * 1000 // 4 часа в миллисекундах
	const samaraTime = new Date(date.getTime() + samaraOffset)

	const year = samaraTime.getUTCFullYear()
	const month = String(samaraTime.getUTCMonth() + 1).padStart(2, '0')
	const day = String(samaraTime.getUTCDate()).padStart(2, '0')
	const hours = String(samaraTime.getUTCHours()).padStart(2, '0')
	const minutes = String(samaraTime.getUTCMinutes()).padStart(2, '0')
	const seconds = String(samaraTime.getUTCSeconds()).padStart(2, '0')

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Форматирование сообщения о билетах
 * @param {Array} results - Результаты по матчам
 * @returns {string} - Отформатированное сообщение
 */
function formatTicketsMessage(results) {
	let message = '<b>ИНФОРМАЦИЯ О БИЛЕТАХ ПО ВСЕМ МАТЧАМ</b>\n\n'

	for (let i = 0; i < results.length; i++) {
		const result = results[i]

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
		message += `План: <b>${formatNumber(match.planRevenue)} ₽</b>\n`
		message += `Выполнения плана: <b>${planCompletionPercent}%</b>\n`
		message += `Итого: <b>${formatNumber(tickets.allCount)}</b>\n`

		// Добавляем разделитель между матчами (кроме последнего)
		if (i < results.length - 1) {
			message += '\n' + '─'.repeat(12) + '\n\n'
		}
	}

	return message
}

module.exports = {
	formatNumber,
	formatSamaraTime,
	formatTicketsMessage,
}
