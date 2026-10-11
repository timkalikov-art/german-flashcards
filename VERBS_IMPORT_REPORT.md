# Verbs Import Report

Дата: 2026-10-11

## Источники

- Основная база: `data_verified.js`
- Резервная копия: `data_verified.backup-before-verbs-import-20261011.js`
- Итоговый JSON: `/Users/timurkalikov/Desktop/Flashcards/verbs_reviewed_FINAL_for_codex.json`
- CSV изменений: `/Users/timurkalikov/Desktop/Flashcards/verbs_ALL_changes_for_codex.csv`

## Результаты импорта

- Строк изменений в CSV: 1496
- Карточек в итоговом JSON: 1206
- Глагольных карточек в основной базе после импорта: 1206
- Обновлено карточек: 738
- Изменено полей: 1496
- Уже совпадало с итоговым JSON: 0
- Конфликтов: 0
- Пропущено из-за отсутствия карточки: 0
- Пропущено из-за отсутствия поля в JSON: 0

## Структурная проверка

- Всего карточек: 8390
- Уникальных ID: 8390
- Дубликатов ID: 0
- Ожидаемое количество карточек: 8390
- Количество карточек сохранено: да

## Конфликты

Конфликтов не найдено.

## Примеры применённых изменений

| ID | Слово | Поле | Было | Стало |
|---:|---|---|---|---|
| 16 | grüßen | exampleDe | undefined | Er grüßt seine Nachbarn freundlich. |
| 16 | grüßen | exampleRu | undefined | Он приветливо здоровается с соседями. |
| 19 | begrüßen | exampleDe | undefined | Die Lehrerin begrüßt die neue Schülerin. |
| 19 | begrüßen | exampleRu | undefined | Учительница приветствует новую ученицу. |
| 35 | entschuldigen | exampleDe | undefined | Bitte entschuldige meinen Fehler. |
| 35 | entschuldigen | exampleRu | undefined | Пожалуйста, извини мою ошибку. |
| 39 | verzeihen | exampleDe | undefined | Kannst du mir verzeihen? |
| 39 | verzeihen | exampleRu | undefined | Ты можешь меня простить? |
| 140 | subtrahieren | exampleDe | undefined | Wir subtrahieren drei von zehn. |
| 140 | subtrahieren | exampleRu | undefined | Мы вычитаем три из десяти. |
| 142 | dividieren | exampleDe | undefined | Wir dividieren zwölf durch vier. |
| 142 | dividieren | exampleRu | undefined | Мы делим двенадцать на четыре. |
| 144 | addieren | exampleDe | undefined | Wir addieren fünf und sieben. |
| 144 | addieren | exampleRu | undefined | Мы складываем пять и семь. |
| 145 | hinzufügen | exampleDe | undefined | Bitte füge noch etwas Salz hinzu. |
| 145 | hinzufügen | exampleRu | undefined | Добавь, пожалуйста, ещё немного соли. |
| 147 | multiplizieren | exampleDe | undefined | Wir multiplizieren sechs mit drei. |
| 147 | multiplizieren | exampleRu | undefined | Мы умножаем шесть на три. |
| 155 | zählen | exampleDe | undefined | Das Kind zählt bis zehn. |
| 155 | zählen | exampleRu | undefined | Ребёнок считает до десяти. |
| 156 | berechnen | exampleDe | undefined | Sie berechnet die Gesamtkosten. |
| 156 | berechnen | exampleRu | undefined | Она подсчитывает общие расходы. |
| 157 | vergleichen | exampleDe | undefined | Wir vergleichen die beiden Angebote. |
| 157 | vergleichen | exampleRu | undefined | Мы сравниваем оба предложения. |
| 178 | einwenden | exampleDe | Ich wende nichts ein. | Ich habe nichts dagegen einzuwenden. |
| 178 | einwenden | exampleRu | Я ничего не возражаю. | Я ничего не имею против. |
| 179 | hereinkommen | exampleDe | Ich komme ins Zimmer herein. | Komm bitte herein! |
| 179 | hereinkommen | exampleRu | Я вхожу в комнату. | Заходи, пожалуйста! |
| 181 | ausgehen | exampleDe | Ich gehe heute Abend aus. | Ich gehe heute Abend mit Freunden aus. |
| 181 | ausgehen | exampleRu | Сегодня вечером я выхожу из дома. | Сегодня вечером я иду гулять с друзьями. |

## Проверка валидатором

Команда:

```bash
/Users/timurkalikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tools/validate-data.js data_verified.js
```

Результат:

- Cards: 8390
- Errors: 0
- Warnings: 1605
- Итог: `VALIDATION PASSED`

Предупреждения относятся к повторяющимся примерам. Они не блокируют совместимость базы с приложением, но остаются отдельной задачей для последующей языковой чистки.
