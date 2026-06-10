# FOGBOUND SMP

Forge 1.20.1 server сборка под хоррор-выживание с прогрессией, боссами, измерениями, магией, данжами и оптимизацией под 6-10 игроков.

Сборка рассчитана на сервер примерно такого уровня:

- 24 GB RAM
- 8 CPU cores
- SSD 400 GB
- Linux-путь на VPS: `/root/server/`

## Что есть на сервере

### Хоррор и атмосфера

Сервер не просто про ванильное выживание: мир постоянно давит, пугает и подкидывает опасные встречи.

Основные хоррор-моды:

- `From The Fog`
- `The Man From The Fog`
- `Better Cave Dweller`
- `The Knocker`
- `The Mimic`
- `Siren Head`
- `The Graveyard`
- `Born in Chaos`
- `BOH`
- `Deimos`
- `SanityDim`
- `The Obsessed`
- `ServerSideHorror`

### Прогрессия, боссы и смысл игры

Чтобы игрокам было чем заниматься кроме страха, добавлен большой adventure/progression слой:

- `DivineRPG` - измерения, боссы, оружие, броня, долгий прогресс.
- `Twilight Forest` - отдельное измерение с данжами, боссами и линейкой прохождения.
- `Apotheosis` - усиленная система лута, аффиксы, прокачка зачарований.
- `L_Ender's Cataclysm` - мощные боссы и структуры.
- `Mowzie's Mobs` - красивые опасные мобы и мини-боссы.
- `Iron's Spells n Spellbooks` - магия, заклинания, книги, магический лут.
- `Artifacts` - полезные редкие артефакты за исследование.
- `When Dungeons Arise` - большие структуры и данжи в мире.
- `YUNG's Better Dungeons` - улучшенные ванильные данжи.
- `Sophisticated Backpacks` - рюкзаки и удобное хранение в походах.

### Удобство

- `TeleportCraft` - телепорты, home/sethome/tpa.
- `Chunky` - предгенерация чанков, чтобы снизить лаги при исследовании.
- `Spark` - профилирование лагов и TPS.
- `JEI` - просмотр рецептов на клиенте.
- `WTHIT` - подсказки по блокам и мобам на клиенте.
- `Xaero's Minimap` и `Xaero's World Map` - карта и миникарта на клиенте.

### Оптимизация сервера

Серверная часть настроена на стабильность для 6-10 игроков:

- `ModernFix`
- `FerriteCore`
- `ServerCore`
- `Canary`
- `Saturn`
- `Alternate Current`
- `AI Improvements`
- `Let Me Despawn`
- `Memory Leak Fix`
- `Noisium`
- `Clumps`
- `Almanac`

Текущие важные настройки:

- `Xms8G`
- `Xmx12G`
- G1GC JVM flags
- `view-distance=9`
- `simulation-distance=6`
- ServerCore dynamic tuning включен
- ServerCore ограничивает пики нагрузки при полном онлайне

### Оптимизация и визуал клиента

Клиентская папка `mods/client` содержит моды, которые игроки должны поставить себе в клиент:

- `Embeddium`
- `Oculus`
- `Entity Culling`
- `Dynamic FPS`
- `ImmediatelyFast`
- `BadOptimizations`
- `FerriteCore`
- `ModernFix`
- `Canary`
- `Memory Leak Fix`
- `Entity Model Features`
- `Entity Texture Features`
- `PartiCull`
- `ModelFix`
- `FastChest`
- `BetterF3`
- `JEI`
- `WTHIT`
- `Xaero's Minimap`
- `Xaero's World Map`

## Как установить клиент игроку

1. Установить Minecraft `1.20.1`.
2. Установить Forge `47.4.10` для Minecraft `1.20.1`.
3. Очистить свою папку `mods` от лишних модов, если они конфликтуют.
4. Скопировать все `.jar` из:

   ```text
   mods/client
   ```

   в свою клиентскую папку:

   ```text
   .minecraft/mods
   ```

5. Выделить клиенту примерно `6-8 GB RAM`.
6. Запустить игру через Forge-профиль.

## Как запустить сервер вручную

На Linux:

```sh
cd /root/server
chmod +x run.sh
./run.sh nogui
```

На Windows:

```bat
run.bat nogui
```

## Запуск через PM2

Для VPS подготовлен файл:

```text
ecosystem.config.cjs
```

Он запускает два процесса:

- `minecraft-forge` - сам Forge-сервер.
- `mc-restart-scheduler` - автоматический рестарт каждые 4 часа.

Запуск:

```sh
cd /root/server
pm2 start ecosystem.config.cjs
pm2 save
```

Полная инструкция лежит в:

```text
PM2_SERVER_START_INSTRUCTION.txt
```

## Автоматический рестарт

Сервер перезапускается раз в 4 часа.

Перед рестартом всем игрокам в чат отправляются цветные предупреждения:

- за 10 минут
- за 5 минут
- за 1 минуту

После этого scheduler выполняет:

```text
save-all flush
stop
```

PM2 видит, что Minecraft остановился, и автоматически запускает его снова.

Для работы scheduler нужен RCON:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=CHANGE_ME
broadcast-rcon-to-ops=false
```

Пароль RCON нужно хранить локально в файле:

```text
/root/server/.rcon-password
```

Этот файл добавлен в `.gitignore`.

## Важные файлы

- `mods/` - серверные моды.
- `mods/client/` - моды для игроков на клиент.
- `config/` - конфиги модов.
- `defaultconfigs/` - дефолтные серверные конфиги для миров.
- `user_jvm_args.txt` - настройки памяти и JVM.
- `server.properties.example` - безопасный шаблон настроек сервера.
- `ecosystem.config.cjs` - PM2-конфиг.
- `scripts/scheduled-restart.js` - scheduler для рестартов.
- `PM2_SERVER_START_INSTRUCTION.txt` - подробная инструкция запуска через PM2.

## Что не должно попадать в репозиторий

`.gitignore` настроен так, чтобы не заливать личные и runtime-данные:

- `server.properties`
- `.rcon-password`
- `world/`
- `logs/`
- `crash-reports/`
- `modernfix/`
- `ops.json`
- `whitelist.json`
- `banned-ips.json`
- `banned-players.json`
- `usercache.json`
- `usernamecache.json`

Исключение: маленький datapack `world/datapacks/codex_fixes` можно держать в репозитории, потому что он нужен для совместимости сборки и не содержит личных данных игроков.

## Если сервер не видит unix_args.txt

Если при запуске появляется ошибка:

```text
Error: could not open `libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt`
```

значит на VPS не попала папка `libraries/` или Forge installer не был выполнен.

Проверь:

```sh
test -f /root/server/libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt
```

Если файла нет, нужно догрузить `libraries/` из подготовленной сборки или выполнить Forge installer:

```sh
cd /root/server
java -jar forge-1.20.1-47.4.10-installer.jar --installServer
```

## Рекомендации админам

- Не открывать RCON-порт `25575` наружу.
- Для публичного сервера лучше включить `online-mode=true`.
- Перед активной игрой прогнать предгенерацию через `Chunky`.
- При лагах использовать `spark profiler`, а не гадать по ощущениям.
- Если онлайн стабильно 10 человек и игроки активно разбегаются по новым измерениям, лучше держать `view-distance=9`, а не повышать до 12+.
