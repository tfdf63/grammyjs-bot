const fetch = require('node-fetch')
const config = require('../config')
const { formatSeasonsMessage } = require('../utils/formatters')
const {
	getSamaraCalendarTodayString,
	getSamaraCalendarYesterdayString,
} = require('../utils/timeUtils')
const { getSnapshotForDate } = require('./seasonsSnapshotStore')

/**
 * Подмешать вчерашние метрики из снимка (ключ seasonId) для дельт в сообщении.
 * @param {Array} results
 */
function attachPreviousMetrics(results) {
	const yesterday = getSamaraCalendarYesterdayString()
	const snap = getSnapshotForDate(yesterday)
	for (const r of results) {
		if (r.tickets) {
			const key = String(r.season.seasonId)
			r.previousMetrics = snap[key] != null ? snap[key] : null
		}
	}
}

/**
 * Карта для сохранения снимка за «сегодня» (только успешные ответы API).
 * @param {Array} results
 * @returns {Record<string, { sold: number, invites: number, sum: number }>}
 */
function buildSnapshotMapFromResults(results) {
	const map = {}
	for (const r of results) {
		if (r.tickets && !r.error) {
			map[String(r.season.seasonId)] = {
				sold: r.tickets.count,
				invites: r.tickets.invites,
				sum: r.tickets.totalPrice,
			}
		}
	}
	return map
}

/**
 * @param {unknown} result
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeOrders(result) {
	return (result || [])
		.map(item => (Array.isArray(item) ? item[0] : item))
		.filter(Boolean)
}

/**
 * @param {unknown} result
 * @returns {Record<string, unknown>|null}
 */
function normalizeOrderInfo(result) {
	if (!result) {
		return null
	}
	if (Array.isArray(result)) {
		return result[0] || null
	}
	return result
}

/**
 * Агрегация мест абонемента по price (как в ticketsService).
 * @param {Array<{ price: number }>} items
 */
function aggregateSeasonPlaces(items) {
	const soldItems = items.filter(item => item.price !== 0)
	const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
	return {
		allCount: items.length,
		count: soldItems.length,
		invites: items.length - soldItems.length,
		totalPrice,
	}
}

/**
 * Последний день месяца YYYY-MM-DD для даты YYYY-MM-01.
 * @param {string} monthStart YYYY-MM-01
 */
function monthEndDate(monthStart) {
	const [y, m] = monthStart.split('-').map(Number)
	const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
	return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

/**
 * Список месяцев [start, end] от salesStartDate до сегодня (календарь Самары).
 * @param {string} salesStartDate YYYY-MM-DD
 */
function buildMonthRanges(salesStartDate) {
	const end = getSamaraCalendarTodayString()
	const ranges = []
	const [sy, sm] = salesStartDate.split('-').map(Number)
	const [ey, em] = end.split('-').map(Number)

	let y = sy
	let m = sm
	while (y < ey || (y === ey && m <= em)) {
		const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
		let start = monthStart
		if (y === sy && m === sm) {
			start = salesStartDate
		}
		let rangeEnd = monthEndDate(monthStart)
		if (y === ey && m === em) {
			rangeEnd = end
		}
		ranges.push([start, rangeEnd])
		m += 1
		if (m > 12) {
			m = 1
			y += 1
		}
	}
	return ranges
}

class SeasonService {
	constructor(authService) {
		this.authService = authService
		this.baseUrl = config.api.baseUrl
		this.cityId = config.api.cityId
	}

	/**
	 * @param {string} action
	 * @param {Record<string, string|number|number[]>} params
	 */
	async fetchCrm(action, params = {}) {
		const authString = this.authService.getAuthString()
		let url =
			`${this.baseUrl}?action=${action}` +
			`&auth=${authString}` +
			`&city_id=${this.cityId}`

		for (const [key, value] of Object.entries(params)) {
			if (Array.isArray(value)) {
				for (const item of value) {
					url += `&${key}[]=${item}`
				}
			} else {
				url += `&${key}=${value}`
			}
		}

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()
		if (data.status !== '0') {
			throw new Error(`Ошибка в ответе API: ${data.error || data.status}`)
		}

		return data
	}

	/**
	 * Проданные заказы за период (crm.order.list).
	 * @param {string} startDate YYYY-MM-DD
	 * @param {string} endDate YYYY-MM-DD
	 */
	async fetchOrdersInRange(startDate, endDate) {
		const data = await this.fetchCrm('crm.order.list', {
			start_date: startDate,
			end_date: endDate,
			status: 1,
		})
		return normalizeOrders(data.result)
	}

	/**
	 * ID заказов абонемента за период продаж.
	 * @param {number} seasonId
	 * @param {string} salesStartDate YYYY-MM-DD
	 */
	async fetchSeasonOrderIds(seasonId, salesStartDate) {
		const orderIds = new Set()
		const ranges = buildMonthRanges(salesStartDate)

		for (const [startDate, endDate] of ranges) {
			const orders = await this.fetchOrdersInRange(startDate, endDate)
			for (const order of orders) {
				if (Number(order.season_id) === seasonId) {
					orderIds.add(order.id)
				}
			}
		}

		return [...orderIds]
	}

	/**
	 * Места абонемента из заказа (crm.order.info → season_places).
	 * @param {number} orderId
	 * @param {number} seasonId
	 */
	async fetchSeasonPlacesFromOrder(orderId, seasonId) {
		const data = await this.fetchCrm('crm.order.info', {
			order_id: orderId,
		})
		const order = normalizeOrderInfo(data.result)
		if (!order || !Array.isArray(order.season_places)) {
			return []
		}

		return order.season_places.filter(
			place =>
				Number(place.season_id) === seasonId && Number(place.status) === 1
		)
	}

	/**
	 * @param {{ seasonId: number, salesStartDate?: string }} season
	 */
	async getSeasonTicketsInfo(season) {
		const salesStartDate = season.salesStartDate || '2026-06-01'
		const orderIds = await this.fetchSeasonOrderIds(
			season.seasonId,
			salesStartDate
		)

		const places = []
		for (const orderId of orderIds) {
			const seasonPlaces = await this.fetchSeasonPlacesFromOrder(
				orderId,
				season.seasonId
			)
			places.push(...seasonPlaces)
		}

		return aggregateSeasonPlaces(places)
	}

	/**
	 * @param {Array<{ seasonId: number, name: string, salesStartDate?: string }>} seasons
	 */
	async processAllSeasons(seasons) {
		const results = []

		for (const season of seasons) {
			try {
				const tickets = await this.getSeasonTicketsInfo(season)
				results.push({ season, tickets })
			} catch (error) {
				console.error(
					`Ошибка при получении данных для абонемента ${season.name} (${season.seasonId}):`,
					error
				)
				results.push({
					season,
					error: error.message,
				})
			}
		}

		return results
	}

	/**
	 * @param {Array<{ seasonId: number, name: string }>} seasons
	 * @returns {Promise<string>}
	 */
	async formatSeasonsMessage(seasons) {
		try {
			const results = await this.processAllSeasons(seasons)
			attachPreviousMetrics(results)
			return formatSeasonsMessage(results)
		} catch (error) {
			console.error(
				'Произошла ошибка при формировании сообщения об абонементах:',
				error
			)
			return 'Извините, произошла ошибка при получении информации об абонементах.'
		}
	}

	/**
	 * Один прогон API + HTML и карта для снимка (после успешной отправки в канал).
	 * @param {Array<{ seasonId: number, name: string, salesStartDate?: string }>} seasons
	 */
	async buildChannelSeasonsReport(seasons) {
		try {
			const results = await this.processAllSeasons(seasons)
			attachPreviousMetrics(results)
			const message = formatSeasonsMessage(results)
			const snapshotMap = buildSnapshotMapFromResults(results)
			return { message, snapshotMap }
		} catch (error) {
			console.error(
				'Произошла ошибка при формировании отчёта об абонементах для канала:',
				error
			)
			return {
				message:
					'Извините, произошла ошибка при получении информации об абонементах.',
				snapshotMap: {},
			}
		}
	}
}

module.exports = SeasonService
