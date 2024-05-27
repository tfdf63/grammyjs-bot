// const tick = require('./4tick.js')
const fetch = require('node-fetch'); // Импортируем модуль fetch
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
//Название команд
let game = 'Акрон х Урал // 01.06.2024';

async function ticketsGetInfo(resultString) {
  const url = `https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=${resultString}&city_id=3296193&event_id=18485824`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  if (data.status === '0') {
    const results = data.result;
    const tickets = {
      allCount: results.length,
      count: results.filter((item) => item.price !== 0).length,
    };
    return tickets;
  } else {
    throw new Error(`Ошибка в ответе API: ${data.error}`);
  }
}
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
      disable_web_page_preview: true,
    }
  );
});

bot.command('tickets', async (ctx) => {
  try {
    // Получаем данные о билетах, передавая resultString из глобальной области видимости
    const tickets = await ticketsGetInfo(resultString);

    await ctx.reply(
      `
      <b>${game}</b>

      Продано: <b>${tickets.count}</b>
      Пригласительных: <b>${tickets.allCount - tickets.count}</b>

      Итого: <b>${tickets.allCount}</b>
      `,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }
    );
  } catch (error) {
    console.error(
      'Произошла ошибка при получении информации о билетах:',
      error
    );
    await ctx.reply(
      'Извините, произошла ошибка при получении информации о билетах.'
    );
  }
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
