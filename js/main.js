class ClockApp {
    constructor() {
        this.initializedTabs = new Set();
        this.init();
    }

    init() {
        // тут запускаю главные часы и навигацию
        this.startClock();
        this.setupNavigation();
        this.initTab('alarm');
    }

    // тут обновляю время каждую секунду
    startClock() {
        const update = () => {
            const now = new Date();
            document.getElementById('digitalClock').textContent =
                now.toLocaleTimeString('ru-RU', { hour12: false });

            const day = now.toLocaleDateString('ru-RU', { weekday: 'long' });
            document.getElementById('dayDisplay').textContent =
                day.charAt(0).toUpperCase() + day.slice(1);

            document.getElementById('dateDisplay').textContent =
                now.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        update();
        setInterval(update, 1000);
    }

    // тут переключаю вкладки по клику
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.getElementById(target).classList.add('active');
                this.initTab(target);
            });
        });
    }

    initTab(tabId) {
        if (this.initializedTabs.has(tabId)) return;
        switch (tabId) {
            case 'alarm':     this.setupAlarm();     break;
            case 'timer':     this.setupTimer();     break;
            case 'stopwatch': this.setupStopwatch(); break;
            case 'world':     this.setupWorldClock(); break;
        }
        this.initializedTabs.add(tabId);
    }

    // --- БУДИЛЬНИК ---
    setupAlarm() {
        let alarms = JSON.parse(localStorage.getItem('clock-alarms')) || [];
        const audio = document.getElementById('alarmAudio');

        const hoursEl = document.getElementById('alarmHours');
        const minsEl = document.getElementById('alarmMinutes');

        for (let i = 0; i < 24; i++) {
            hoursEl.innerHTML += `<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`;
        }
        for (let i = 0; i < 60; i += 5) {
            minsEl.innerHTML += `<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`;
        }

        const render = () => {
            const list = document.getElementById('alarmsList');
            list.innerHTML = alarms.length ? '' :
                '<div style="text-align:center;padding:36px;color:#888">Нет будильников</div>';

            alarms.forEach(a => {
                const div = document.createElement('div');
                div.className = 'alarm-item ' + (a.active ? 'active' : 'inactive');
                div.innerHTML = `
                    <div class="alarm-info">
                        <div class="alarm-time">${a.time}</div>
                        <div class="alarm-status">${a.active ? 'Активен' : 'Выкл'}</div>
                    </div>
                    <div class="alarm-actions">
                        <button data-id="${a.id}" data-action="toggle">${a.active ? '❌' : '✅'}</button>
                        <button data-id="${a.id}" data-action="delete">🗑️</button>
                    </div>`;
                list.appendChild(div);
            });

            // тут вешаю события на кнопки будильников
            list.querySelectorAll('button[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.dataset.id);
                    if (btn.dataset.action === 'toggle') {
                        const alarm = alarms.find(a => a.id === id);
                        if (alarm) { alarm.active = !alarm.active; save(); render(); }
                    } else {
                        if (confirm('Удалить будильник?')) {
                            alarms = alarms.filter(a => a.id !== id);
                            save();
                            render();
                        }
                    }
                });
            });
        };

        const save = () => localStorage.setItem('clock-alarms', JSON.stringify(alarms));

        document.getElementById('addAlarm').addEventListener('click', () => {
            alarms.unshift({ id: Date.now(), time: hoursEl.value + ':' + minsEl.value, active: true });
            save();
            render();
        });

        document.getElementById('stopAlarm').addEventListener('click', () => {
            document.getElementById('activeAlarm').classList.remove('show');
            audio.pause();
            audio.currentTime = 0;
        });

        render();

        // тут проверяю сработал ли будильник каждую минуту
        setInterval(() => {
            const now = new Date();
            const t = now.toTimeString().slice(0, 5);
            const triggered = alarms.find(a => a.active && a.time === t);
            if (triggered) {
                document.getElementById('activeAlarm').classList.add('show');
                document.querySelector('.alarm-message').textContent = 'Будильник ' + triggered.time + ' сработал!';
                audio.play().catch(() => {});
            }
        }, 60000);
    }

    // --- ТАЙМЕР ---
    setupTimer() {
        let timerInterval, timerTime = 60, paused = false;

        const display = document.getElementById('timerDisplay');
        const fmt = s => {
            const h = String(Math.floor(s / 3600)).padStart(2, '0');
            const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
            const sec = String(s % 60).padStart(2, '0');
            return h + ':' + m + ':' + sec;
        };

        const syncDisplay = () => { display.textContent = fmt(timerTime); };

        ['timerHours', 'timerMinutes', 'timerSeconds'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                timerTime = (+document.getElementById('timerHours').value || 0) * 3600
                    + (+document.getElementById('timerMinutes').value || 0) * 60
                    + (+document.getElementById('timerSeconds').value || 0);
                syncDisplay();
            });
        });

        document.getElementById('timerSlider').addEventListener('input', e => {
            timerTime = +e.target.value;
            document.getElementById('timerHours').value = Math.floor(timerTime / 3600);
            document.getElementById('timerMinutes').value = Math.floor((timerTime % 3600) / 60);
            document.getElementById('timerSeconds').value = timerTime % 60;
            const m = Math.floor(timerTime / 60);
            document.getElementById('timerValue').textContent =
                String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
            syncDisplay();
        });

        document.getElementById('startTimer').addEventListener('click', () => {
            document.getElementById('startTimer').disabled = true;
            document.getElementById('pauseTimer').disabled = false;
            paused = false;
            timerInterval = setInterval(() => {
                if (!paused && timerTime > 0) {
                    timerTime--;
                    syncDisplay();
                    if (timerTime <= 0) {
                        clearInterval(timerInterval);
                        alert('Таймер завершён!');
                        document.getElementById('startTimer').disabled = false;
                    }
                }
            }, 1000);
        });

        document.getElementById('pauseTimer').addEventListener('click', () => {
            paused = !paused;
            document.getElementById('pauseTimer').textContent = paused ? 'Продолжить' : 'Пауза';
        });

        document.getElementById('resetTimer').addEventListener('click', () => {
            clearInterval(timerInterval);
            timerTime = 60;
            syncDisplay();
            document.getElementById('timerHours').value = 0;
            document.getElementById('timerMinutes').value = 1;
            document.getElementById('timerSeconds').value = 0;
            document.getElementById('startTimer').disabled = false;
            document.getElementById('pauseTimer').disabled = true;
            paused = false;
        });

        syncDisplay();
    }

    // --- СЕКУНДОМЕР ---
    setupStopwatch() {
        let time = 0, running = false, swInterval, lapTime = 0, lapNum = 0;

        const display = document.getElementById('stopwatchDisplay');
        const fmt = t => {
            const m = String(Math.floor(t / 6000)).padStart(2, '0');
            const s = String(Math.floor((t % 6000) / 100)).padStart(2, '0');
            const c = String(t % 100).padStart(2, '0');
            return m + ':' + s + ':' + c;
        };

        document.getElementById('startStopwatch').addEventListener('click', () => {
            const btn = document.getElementById('startStopwatch');
            if (running) {
                clearInterval(swInterval);
                btn.textContent = 'Старт'; btn.className = 'btn-primary';
                document.getElementById('lapStopwatch').disabled = true;
                running = false;
            } else {
                swInterval = setInterval(() => { time++; display.textContent = fmt(time); }, 10);
                btn.textContent = 'Стоп'; btn.className = 'btn-danger';
                document.getElementById('lapStopwatch').disabled = false;
                running = true;
            }
        });

        document.getElementById('lapStopwatch').addEventListener('click', () => {
            lapNum++;
            const lapDelta = time - lapTime;
            lapTime = time;
            const li = document.createElement('div');
            li.className = 'lap-item';
            li.innerHTML = `<span class="lap-number">#${lapNum}</span>
                <span class="lap-time">${fmt(lapDelta)}</span>
                <span class="lap-total">${fmt(time)}</span>`;
            document.getElementById('lapsList').prepend(li);
        });

        document.getElementById('resetStopwatch').addEventListener('click', () => {
            clearInterval(swInterval);
            time = 0; lapTime = 0; lapNum = 0; running = false;
            display.textContent = '00:00:00';
            document.getElementById('startStopwatch').textContent = 'Старт';
            document.getElementById('startStopwatch').className = 'btn-primary';
            document.getElementById('lapStopwatch').disabled = true;
            document.getElementById('lapsList').innerHTML = '';
        });
    }

    // --- МИРОВОЕ ВРЕМЯ ---
    setupWorldClock() {
        const cities = [
            { name: 'Москва',   tz: 'Europe/Moscow' },
            { name: 'Лондон',   tz: 'Europe/London' },
            { name: 'Нью-Йорк', tz: 'America/New_York' },
            { name: 'Токио',    tz: 'Asia/Tokyo' }
        ];

        const grid = document.getElementById('worldGrid');

        // тут создаю карточки для каждого города
        cities.forEach(city => {
            const card = document.createElement('div');
            card.className = 'city-card';
            card.innerHTML = `
                <div class="city-name">${city.name}</div>
                <div class="city-time" data-tz="${city.tz}">--:--</div>
                <div class="city-date" data-tz-date="${city.tz}"></div>`;
            grid.appendChild(card);
        });

        // тут обновляю время в городах каждую секунду
        const updateWorld = () => {
            cities.forEach(city => {
                const now = new Date();
                const timeEl = grid.querySelector(`[data-tz="${city.tz}"]`);
                const dateEl = grid.querySelector(`[data-tz-date="${city.tz}"]`);
                if (timeEl) {
                    timeEl.textContent = now.toLocaleTimeString('ru-RU', {
                        hour12: false, timeZone: city.tz,
                        hour: '2-digit', minute: '2-digit'
                    });
                }
                if (dateEl) {
                    dateEl.textContent = now.toLocaleDateString('ru-RU', {
                        timeZone: city.tz, weekday: 'short', day: 'numeric', month: 'short'
                    });
                }
            });
        };

        updateWorld();
        setInterval(updateWorld, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClockApp();
});
