# Документация API билетной системы

## Описание

Бот взаимодействует с API билетной системы через REST API для получения информации о билетах на матчи ФК "Акрон".

## Базовые параметры

### URL API
```
https://api.tickets.yandex.net/api/crm/
```

### City ID
```
3296193 (Самара)
```

## Аутентификация

### Механизм аутентификации

API использует кастомную систему аутентификации на основе временных меток и хеширования пароля.

### Алгоритм генерации строки аутентификации

1. **Получение временной метки** (timestamp)
   ```javascript
   timestamp = Math.floor(Date.now() / 1000)  // Unix timestamp в секундах
   ```

2. **Хеширование пароля**
   ```javascript
   // Шаг 1: MD5 хеш пароля
   md5Hash = MD5(password)
   
   // Шаг 2: SHA1 хеш от (MD5 + timestamp)
   sha1Hash = SHA1(md5Hash + timestamp)
   ```

3. **Формирование строки аутентификации**
   ```
   authString = login:sha1Hash:timestamp
   ```

### Реализация (AuthService)

```javascript
generateAuthString() {
  const timestamp = getTimestamp()  // Текущая метка времени в секундах
  
  // MD5 хеш пароля
  const md5Hash = crypto
    .createHash('md5')
    .update(this.password)
    .digest('hex')
  
  // SHA1 хеш от (MD5 + timestamp)
  const hashedPassword = crypto
    .createHash('sha1')
    .update(md5Hash + timestamp)
    .digest('hex')
  
  return `${this.login}:${hashedPassword}:${timestamp}`
}
```

### Переменные окружения

Для аутентификации требуются следующие переменные:

```env
BOT_TICKETS_LOGIN=your_login
BOT_TICKETS_PASSWORD=your_password
```

**Важно:** Строка аутентификации генерируется заново при каждом запросе, так как timestamp меняется. Это обеспечивает защиту от replay-атак.

## Эндпоинты API

### Получение списка билетов

**Эндпоинт:** `GET https://api.tickets.yandex.net/api/crm/`

**Параметры запроса:**
- `action` (обязательный) - действие API: `crm.order.ticket.list`
- `auth` (обязательный) - строка аутентификации: `login:sha1Hash:timestamp`
- `city_id` (обязательный) - ID города: `3296193`
- `event_id` (обязательный) - ID события (матча)

**Пример запроса:**
```
GET https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=login:hash:timestamp&city_id=3296193&event_id=48450863
```

**Пример полного URL:**
```javascript
const url = `${baseUrl}?action=crm.order.ticket.list&auth=${authString}&city_id=${cityId}&event_id=${eventId}`
```

## Структура ответа API

### Успешный ответ (status: "0")

```json
{
  "status": "0",
  "result": [
    {
      "price": 1000,
      // ... другие поля билета
    },
    {
      "price": 0,  // Пригласительный билет
      // ... другие поля билета
    }
  ]
}
```

### Ошибка (status !== "0")

```json
{
  "status": "1",
  "error": "Описание ошибки"
}
```

## Обработка ответа

### Реализация (TicketsService)

```javascript
async getTicketsInfo(eventId) {
  const authString = this.authService.getAuthString()
  const url = `${this.baseUrl}?action=crm.order.ticket.list&auth=${authString}&city_id=${this.cityId}&event_id=${eventId}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data.status === '0') {
    const results = data.result
    return {
      allCount: results.length,                    // Общее количество билетов
      count: results.filter(item => item.price !== 0).length,  // Проданные билеты
      totalPrice: results.reduce((sum, ticket) => sum + ticket.price, 0),  // Общая сумма
    }
  } else {
    throw new Error(`Ошибка в ответе API: ${data.error}`)
  }
}
```

## Обработка данных

### Структура данных билета

Из ответа API извлекаются следующие данные:

1. **allCount** - общее количество билетов (включая пригласительные)
   ```javascript
   allCount = results.length
   ```

2. **count** - количество проданных билетов (price !== 0)
   ```javascript
   count = results.filter(item => item.price !== 0).length
   ```

3. **totalPrice** - общая сумма продаж
   ```javascript
   totalPrice = results.reduce((sum, ticket) => sum + ticket.price, 0)
   ```

4. **Пригласительные билеты** - билеты с price === 0
   ```javascript
   complimentaryCount = allCount - count
   ```

### Обработка нескольких матчей

Для получения информации по всем матчам используется метод `processAllMatches()`:

```javascript
async processAllMatches(matches) {
  const results = []
  
  for (const match of matches) {
    try {
      const tickets = await this.getTicketsInfo(match.eventId)
      results.push({
        match: match,
        tickets: tickets,
      })
    } catch (error) {
      results.push({
        match: match,
        error: error.message,
      })
    }
  }
  
  return results
}
```

**Особенности:**
- Обрабатываются матчи последовательно
- Ошибки для отдельных матчей не прерывают обработку остальных
- Для каждого матча возвращается либо данные о билетах, либо сообщение об ошибке

## Конфигурация API

### Настройки (src/config/index.js)

```javascript
api: {
  baseUrl: 'https://api.tickets.yandex.net/api/crm/',
  login: process.env.BOT_TICKETS_LOGIN,
  password: process.env.BOT_TICKETS_PASSWORD,
  cityId: '3296193',
}
```

## Обработка ошибок

### Типы ошибок

1. **HTTP ошибки**
   - Код ответа не 200 OK
   - Ошибка сети
   - Таймаут запроса

2. **Ошибки API**
   - `status !== "0"` в ответе
   - Сообщение об ошибке в поле `error`

3. **Ошибки обработки данных**
   - Некорректный формат ответа
   - Отсутствие обязательных полей

### Обработка в коде

```javascript
// HTTP ошибки
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`)
}

// Ошибки API
if (data.status === '0') {
  // Успешный ответ
} else {
  throw new Error(`Ошибка в ответе API: ${data.error}`)
}
```

### Сообщения пользователю

Ошибки API обрабатываются через `ErrorHandler.handleApiError()`:

```javascript
handleApiError(error, context = '') {
  if (error.message.includes('Network response was not ok')) {
    return 'Ошибка сети при получении данных'
  }
  
  if (error.message.includes('Ошибка в ответе API')) {
    return 'Ошибка API сервиса билетов'
  }
  
  return 'Произошла ошибка при получении данных'
}
```

## Структура события (матча)

Для каждого матча необходимо знать `eventId`. Матчи хранятся в файле `matches.js`:

```javascript
{
  eventId: 48450863,                    // ID события в API
  game: 'Акрон х Сочи // 21.11.2025',   // Название матча
  planTickets: 8000,                     // План по количеству билетов
  planRevenue: 3076000,                  // План по выручке (в рублях)
}
```

## Пример использования

### Полный цикл получения данных

1. **Инициализация сервиса**
   ```javascript
   const authService = new AuthService()
   const ticketsService = new TicketsService(authService)
   ```

2. **Получение информации по одному матчу**
   ```javascript
   const tickets = await ticketsService.getTicketsInfo(48450863)
   // Результат: { allCount: 1290, count: 1234, totalPrice: 2345678 }
   ```

3. **Получение информации по всем матчам**
   ```javascript
   const matches = require('./matches')
   const message = await ticketsService.formatTicketsMessage(matches)
   // Результат: HTML-форматированное сообщение со статистикой
   ```

## Безопасность

### Защита учетных данных

- Логин и пароль хранятся в переменных окружения (`.env`)
- Файл `.env` не должен попадать в систему контроля версий (указан в `.gitignore`)

### Защита от replay-атак

- Каждый запрос использует новый timestamp
- Строка аутентификации уникальна для каждого запроса
- Старые запросы с устаревшим timestamp будут отклонены

### Валидация данных

- Проверка успешности HTTP-ответа
- Проверка статуса ответа API
- Обработка ошибок на каждом этапе

## Зависимости

Для работы с API используется:
- `node-fetch` - для HTTP-запросов
- `crypto` (встроенный модуль Node.js) - для хеширования

## Примеры запросов

### cURL пример

```bash
# Генерация строки аутентификации (требуется реализация хеширования)
AUTH_STRING="login:hash:timestamp"

# Запрос информации о билетах
curl "https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=${AUTH_STRING}&city_id=3296193&event_id=48450863"
```

### JavaScript пример

```javascript
const crypto = require('crypto')
const fetch = require('node-fetch')

const login = 'your_login'
const password = 'your_password'
const timestamp = Math.floor(Date.now() / 1000)
const md5Hash = crypto.createHash('md5').update(password).digest('hex')
const sha1Hash = crypto.createHash('sha1').update(md5Hash + timestamp).digest('hex')
const authString = `${login}:${sha1Hash}:${timestamp}`

const url = `https://api.tickets.yandex.net/api/crm/?action=crm.order.ticket.list&auth=${authString}&city_id=3296193&event_id=48450863`

const response = await fetch(url)
const data = await response.json()

if (data.status === '0') {
  console.log('Билеты:', data.result)
} else {
  console.error('Ошибка:', data.error)
}
```

