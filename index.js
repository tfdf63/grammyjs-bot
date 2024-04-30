// const tick = require('./4tick.js')
require('dotenv').config();
//Логика билетов
const crypto = require('crypto');

const login = process.env.BOT_TICKETS_LOGIN;
const password = process.env.BOT_TICKETS_PASSWORD;
const timestamp = Math.floor(Date.now() / 1000); // Текущая метка времени в секундах
// Хешируем пароль сначала с помощью MD5, затем с помощью SHA1
const hashedPassword = crypto
  .createHash('sha1')
  .update(crypto.createHash('md5').update(password).digest('hex') + timestamp)
  .digest('hex');

// Формируем строку
const resultString = `${login}:${hashedPassword}:${timestamp}`;
//Название команды
let game = 'Акрон х Динамо // 12.05.2024';
//Сумма билетов
let ticketsSum = 0;
let ticketsAllCount = 0;
let ticketsCount = 0;
let ticketsFreeCount = 0;

const url = `https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=${resultString}&city_id=3296193&event_id=17771827`;
fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then((data) => {
    if ((data.status = '0')) {
      const results = data.result;
      //Количество билетов
      ticketsAllCount = results.length;
      let filterData = results.filter((item) => item.price !== 0);
      ticketsCount = filterData.length;
      ticketsFreeCount = ticketsAllCount - ticketsCount;

      results.forEach((result) => {
        ticketsSum += result.price;
      });
      game = 'Акрон х Динамо / 12.05.2024';
      ticketsSum = ticketsSum;
      ticketsCount = ticketsCount;
      ticketsFreeCount = ticketsFreeCount;
      ticketsAllCount = ticketsAllCount;
    } else {
      console.error('Ошибка в ответе API:', data.error);
    }
  });
//Завершение логики билетов

const { Bot, GrammyError, HttpError } = require('grammy');

const bot = new Bot(process.env.BOT_API_KEY);

bot.api.setMyCommands([
  {
    command: 'start',
    description: 'Запуск бота',
  },
  {
    command: 'tickets',
    description: 'Информация о билетах',
  },
]);

bot.command('start', async (ctx) => {
  await ctx.react('👍');
  await ctx.reply(
    'Привет! Я - бот ФК "Акрон". Молодой и звонкий! <span class="tg-spoiler">Хорошего дня!</span>',
    {
      parse_mode: 'HTML',
      disable_web_page_priview: true,
    }
  );
});

bot.command('tickets', async (ctx) => {
  await ctx.reply(
    `
  <b>${game}</b>

  Продано: <b>${ticketsCount}</b>
  Пригласительных: <b>${ticketsFreeCount}</b>

  Итого: <b>${ticketsAllCount}</b>
  `,
    {
      parse_mode: 'HTML',
      disable_web_page_priview: true,
    }
  );
});
// <b>${ticketsSum}руб.</b>
bot.hears(/пипец/, async (ctx) => {
  await ctx.reply('Ругаемся?');
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else console.error('Unknown error:', e);
});
bot.start();
console.log('Сервер запущен!');
