/**
 * Форматирование чисел с пробелами
 * @param {number} num - Число для форматирования
 * @returns {string} - Отформатированное число
 */
function formatNumber(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Заголовок матча в сообщении: название и дата в формате DD.MM.YYYY
 * @param {{ game: string, matchDate?: string }} match
 * @returns {string}
 */
function formatMatchHeading(match) {
	if (!match.matchDate || !/^\d{4}-\d{2}-\d{2}$/.test(match.matchDate)) {
		return match.game
	}
	const [y, m, d] = match.matchDate.split('-')
	return `${match.game} // ${d}.${m}.${y}`
}

/**
 * Суффикс изменения к метрике: (-), (без изм.), (+N, +P%) / (-N, -P%) или (+N, —) при prev=0.
 * @param {number} current
 * @param {number|null|undefined} previous вчерашнее значение; null/undefined — нет снимка
 * @returns {string}
 */
function formatMetricDeltaSuffix(current, previous) {
	if (previous == null) {
		return ' (-)'
	}
	if (current === previous) {
		return ' (без изм.)'
	}
	const diff = current - previous
	const diffStr =
		diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)

	let pctPart
	if (previous !== 0) {
		const pct = ((current - previous) / previous) * 100
		pctPart = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
	} else {
		pctPart = '—'
	}

	return ` (${diffStr}, ${pctPart})`
}

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
			message += `❌ <b>${formatMatchHeading(result.match)}</b>\n`
			message += `Ошибка: ${result.error}\n\n`
			continue
		}

		const { match, tickets, previousMetrics } = result
		const pm = previousMetrics || null

		// Расчет процента выполнения плана и средней стоимости билетов
		const planCompletionPercent = (
			(tickets.totalPrice / match.planRevenue) *
			100
		).toFixed(0)
		const averageTicketPrice =
			tickets.count > 0 ? Math.round(tickets.totalPrice / tickets.count) : 0
		const invitesNow = tickets.allCount - tickets.count

		message += `<b>${formatMatchHeading(match)}</b>\n\n`
		message += `Продано: <b>${formatNumber(tickets.count)}</b>${formatMetricDeltaSuffix(
			tickets.count,
			pm ? pm.sold : null
		)}\n`
		message += `Пригласительных: <b>${formatNumber(invitesNow)}</b>${formatMetricDeltaSuffix(
			invitesNow,
			pm ? pm.invites : null
		)}\n`
		message += `Сумма: <b>${formatNumber(tickets.totalPrice)} ₽</b>${formatMetricDeltaSuffix(
			tickets.totalPrice,
			pm ? pm.sum : null
		)}\n`
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
	formatMetricDeltaSuffix,
	formatMatchHeading,
	formatSamaraTime,
	formatTicketsMessage,
}
