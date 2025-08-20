const fetch = require('node-fetch')
const crypto = require('crypto')
require('dotenv').config()

const login = process.env.BOT_TICKETS_LOGIN
const password = process.env.BOT_TICKETS_PASSWORD
const timestamp = Math.floor(Date.now() / 1000)

const hashedPassword = crypto
	.createHash('sha1')
	.update(crypto.createHash('md5').update(password).digest('hex') + timestamp)
	.digest('hex')

const auth = `${login}:${hashedPassword}:${timestamp}`

async function fetchOrderList(auth) {
	const url = `https://api.tickets.yandex.net/api/agent?action=order.list&auth=${auth}&city_id=3296193`

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		})

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`)
		}

		const data = await response.json()
		return data.result.map(order => order.id)
	} catch (error) {
		console.error('Error fetching order list:', error)
	}
}

async function fetchOrderInfo(auth, orderId) {
	const url = `https://api.tickets.yandex.net/api/agent?action=order.info&auth=${auth}&city_id=3296193&id=${orderId}`

	try {
		const response = await fetch(url)

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`)
		}

		const data = await response.json()
		return processTickets(data.result.tickets)
	} catch (error) {
		console.error('Error fetching order info:', error)
	}
}

function processTickets(tickets) {
	const sectorStats = {}

	tickets.forEach(ticket => {
		const { sector, price, status } = ticket
		if (!sectorStats[sector]) {
			sectorStats[sector] = {
				totalTickets: 0,
				soldTickets: 0,
				freeTickets: 0,
				totalRevenue: 0,
			}
		}

		sectorStats[sector].totalTickets++
		if (price === 0) {
			sectorStats[sector].freeTickets++
		}
		if (status === 1) {
			sectorStats[sector].soldTickets++
			sectorStats[sector].totalRevenue += price
		}
	})

	return sectorStats
}

async function processAllOrders(cityId) {
	const orderIds = await fetchOrderList(cityId)
	if (!orderIds) return

	const allStats = {}
	for (const orderId of orderIds) {
		const stats = await fetchOrderInfo(cityId, orderId)
		for (const sector in stats) {
			if (!allStats[sector]) {
				allStats[sector] = {
					totalTickets: 0,
					soldTickets: 0,
					freeTickets: 0,
					totalRevenue: 0,
				}
			}
			allStats[sector].totalTickets += stats[sector].totalTickets
			allStats[sector].soldTickets += stats[sector].soldTickets
			allStats[sector].freeTickets += stats[sector].freeTickets
			allStats[sector].totalRevenue += stats[sector].totalRevenue
		}
	}
	console.log(allStats)
}

// Пример вызова функции
processAllOrders(3296193)
