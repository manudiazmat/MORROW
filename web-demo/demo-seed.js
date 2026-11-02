// Example data for the web demo only. Dates are relative to today so the demo never looks stale.
// It is labelled as example data in the demo banner and can be wiped with one tap.
(function () {
  var KEY = 'morrow-v1';
  try {
    if (localStorage.getItem(KEY) || localStorage.getItem('morrow-demo') === 'off') return;
  } catch (e) {
    return;
  }
  var n = 0;
  var id = function () { n++; return '00000000-0000-4000-8000-' + String(n).padStart(12, '0'); };
  var pad = function (x) { return String(x).padStart(2, '0'); };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var dk = function (off) { var d = new Date(today); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dt = function (off, hm) { return dk(off) + 'T' + hm; };
  var mk = function (back) { var d = new Date(today.getFullYear(), today.getMonth() - back, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  var dow = today.getDay();
  var toMon = (dow + 6) % 7; // days since Monday
  var iso = new Date().toISOString();
  var E = function (o) { return Object.assign({ id: id(), createdAt: dk(-60) + 'T08:00:00.000Z', updatedAt: iso, deletedAt: null }, o); };
  var events = [
    E({ title: 'Trabajo', category: 'work', start: dt(-60 - ((dow + 6 + 60) % 7) + 0, '09:00'), end: dt(-60 - ((dow + 6 + 60) % 7), '17:30'), allDay: false, recurrence: 'weekdays', reminderMinutes: null, exceptions: [] }),
    E({ title: 'Gimnasio', category: 'sport', start: dt(-toMon - 56, '19:00'), end: dt(-toMon - 56, '20:00'), allDay: false, recurrence: 'weekly', location: 'Gimnasio del barrio', reminderMinutes: 30, exceptions: [] }),
    E({ title: 'Clase de inglés', category: 'learning', start: dt(-toMon - 54, '18:30'), end: dt(-toMon - 54, '19:30'), allDay: false, recurrence: 'weekly', reminderMinutes: null, exceptions: [] }),
    E({ title: 'Cena con amigos', category: 'social', start: dt(5, '21:00'), end: dt(5, '23:30'), allDay: false, recurrence: 'none', location: 'Centro', reminderMinutes: 60, exceptions: [] }),
    E({ title: 'Llamada con el casero', category: 'personal', start: dt(1, '17:00'), end: dt(1, '18:00'), allDay: false, recurrence: 'none', reminderMinutes: null, exceptions: [] }),
    E({ title: 'Running', category: 'sport', start: dt(-2, '10:00'), end: dt(-2, '11:00'), allDay: false, recurrence: 'none', reminderMinutes: null, exceptions: [] }),
    E({ title: 'Cine', category: 'leisure', start: dt(-8, '20:00'), end: dt(-8, '22:15'), allDay: false, recurrence: 'none', reminderMinutes: null, exceptions: [] }),
  ];
  // first event: make the weekday series start on a Monday two months ago
  events[0].start = dt(-toMon - 56, '09:00'); events[0].end = dt(-toMon - 56, '17:30');
  var T = function (o) { return E(Object.assign({ notes: '', subtasks: [], recurrence: 'none', goalId: null, milestoneId: null, completedAt: null, status: 'todo', priority: 2 }, o)); };
  var tasks = [
    T({ title: 'Enviar la propuesta al cliente', category: 'work', priority: 1, due: dk(0) }),
    T({ title: 'Pagar el alquiler', category: 'personal', priority: 1, due: dk(0) }),
    T({ title: 'Comprar regalo para Ana', category: 'social', due: dk(0), subtasks: [{ id: id(), title: 'Mirar ideas', done: true }, { id: id(), title: 'Pedirlo', done: false }] }),
    T({ title: 'Renovar el DNI', category: 'personal', due: dk(-3) }),
    T({ title: 'Preparar la entrevista de inglés', category: 'learning', due: dk(3) }),
    T({ title: 'Ordenar el armario', category: 'personal', priority: 3, due: null }),
    T({ title: 'Informe mensual', category: 'work', status: 'done', completedAt: dk(-3) + 'T15:00:00.000Z', due: dk(-3) }),
    T({ title: 'Reservar fisio', category: 'sport', status: 'done', completedAt: dk(-5) + 'T10:00:00.000Z', due: dk(-5) }),
  ];
  var X = function (o) { return E(Object.assign({ account: '', subscriptionId: null }, o)); };
  var tx = [];
  [[3, 1980, 750, 310, 140, 60], [2, 1980, 750, 290, 120, 55], [1, 2050, 750, 330, 210, 70]].forEach(function (r) {
    var m = mk(r[0]);
    tx.push(X({ amount: r[1] * 100, type: 'income', category: 'salary', date: m + '-01', description: 'Nómina' }));
    tx.push(X({ amount: r[2] * 100, type: 'expense', category: 'home', date: m + '-01', description: 'Alquiler' }));
    tx.push(X({ amount: r[3] * 100, type: 'expense', category: 'food', date: m + '-15', description: 'Supermercado' }));
    tx.push(X({ amount: r[4] * 100, type: 'expense', category: 'leisure', date: m + '-20', description: 'Ocio y salidas' }));
    tx.push(X({ amount: r[5] * 100, type: 'expense', category: 'transport', date: m + '-05', description: 'Abono transporte' }));
  });
  var m0 = mk(0);
  tx.push(X({ amount: 205000, type: 'income', category: 'salary', date: m0 + '-01', description: 'Nómina' }));
  tx.push(X({ amount: 75000, type: 'expense', category: 'home', date: m0 + '-01', description: 'Alquiler' }));
  tx.push(X({ amount: 4380, type: 'expense', category: 'food', date: dk(0), description: 'Supermercado' }));
  tx.push(X({ amount: 2650, type: 'expense', category: 'leisure', date: dk(0), description: 'Concierto' }));
  tx.push(X({ amount: 1299, type: 'expense', category: 'subscriptions', date: m0 + '-01', description: 'Música en streaming' }));
  var fg = E({ name: 'Fondo para independizarme', target: 600000, current: 240000, dueDate: dk(300), priority: 1, contributions: [{ date: mk(3) + '-28', amount: 150000 }, { date: mk(2) + '-28', amount: 45000 }, { date: mk(1) + '-28', amount: 45000 }] });
  var ms = function (t, done, off) { return { id: id(), title: t, done: done, doneAt: done ? dk(off) + 'T00:00:00Z' : null }; };
  var goals = [
    E({ title: 'Independizarme', description: 'Vivir por mi cuenta antes de que acabe el año que viene.', dimension: 'home', horizon: 'long', startDate: dk(-150), targetDate: dk(300), priority: 1, status: 'active', financialGoalId: fg.id, manualProgress: 0, milestones: [ms('Ahorrar 6.000 € de colchón', false), ms('Conseguir ingresos estables', true, -120), ms('Investigar barrios y precios', true, -12), ms('Fijar fecha de mudanza', false)] }),
    E({ title: 'Correr una 10K', dimension: 'health', horizon: 'short', startDate: dk(-30), targetDate: dk(40), priority: 2, status: 'active', financialGoalId: null, manualProgress: 0, milestones: [ms('Correr 5 km sin parar', true, -8), ms('Correr 8 km', false), ms('Inscribirme en la carrera', false)] }),
    E({ title: 'Nivel C1 de inglés', dimension: 'growth', horizon: 'medium', startDate: dk(-240), targetDate: dk(60), priority: 2, status: 'active', financialGoalId: null, manualProgress: 0, milestones: [ms('Terminar el curso B2', true, -150), ms('Hacer 3 exámenes de práctica', false), ms('Presentarme al examen', false)] }),
  ];
  var seedR = 7;
  var rnd = function () { seedR = (seedR * 9301 + 49297) % 233280; return seedR / 233280; };
  var habit = function (title, slot, dimension, rate) { var log = []; for (var i = 1; i < 40; i++) if (rnd() < rate) log.push(dk(-i)); return E({ title: title, slot: slot, dimension: dimension, days: [0, 1, 2, 3, 4, 5, 6], log: log }); };
  var keys = ['career', 'finance', 'health', 'relationships', 'growth', 'leisure', 'home', 'purpose'];
  var selfVals = [8, 7, 9, 10, 6, 5, 7, 8];
  var snap = function (back, vals) { return { month: mk(back), takenAt: mk(back) + '-28T10:00:00.000Z', values: Object.fromEntries(keys.map(function (k, i) { return [k, { self: vals[i], data: null, combined: vals[i] }]; })) }; };
  var state = {
    user: { id: null, email: null, mode: 'local' },
    prefs: { name: '', language: 'es', currency: 'EUR', dateFormat: 'dmy', weekStartsOn: 1, units: 'metric', theme: 'system', dayStartHour: 8, dayEndHour: 22, weeklySportTarget: 3, notifications: { reminders: true, weeklyReview: true, insights: true }, assistant: { consent: false, modules: { calendar: true, tasks: true, goals: true, finance: true, habits: true, lifeBalance: true, reviews: true } }, onboarded: true },
    finance: { openingBalance: 120000 },
    tasks: tasks, events: events,
    habits: [habit('Meditar 10 minutos', 'morning', 'health', 0.7), habit('Leer 20 páginas', 'evening', 'growth', 0.6), habit('Ordenar la casa', 'anytime', 'home', 0.5)],
    leisure_items: [E({ title: 'Escapada a Lisboa', kind: 'trip', date: dk(33), done: false }), E({ title: 'Museo Sorolla', kind: 'place', date: null, done: false }), E({ title: 'Clase de cerámica', kind: 'experience', date: null, done: true })],
    ideas: [E({ text: 'App para compartir los gastos del piso' })],
    transactions: tx,
    budgets: [E({ category: 'leisure', monthlyLimit: 15000 }), E({ category: 'food', monthlyLimit: 32000 })],
    subscriptions: [E({ name: 'Música en streaming', amount: 1299, cycle: 'monthly', nextDate: dk(25), category: 'subscriptions', active: true }), E({ name: 'Almacenamiento en la nube', amount: 299, cycle: 'monthly', nextDate: dk(12), category: 'subscriptions', active: true })],
    financial_goals: [fg], personal_goals: goals, assistant_conversations: [],
    dimensions: keys.map(function (k) { return { key: k, priority: 2, enabled: true, label: null }; }),
    scores: keys.map(function (k, i) { return { key: k, self: selfVals[i], ratedAt: iso }; }),
    snapshots: [snap(3, [7, 6, 7, 9, 6, 4, 6, 7]), snap(2, [7, 6, 8, 9, 5, 5, 6, 7]), snap(1, [8, 7, 8, 10, 6, 6, 6, 8])],
    reviews: [], messages: [], outbox: [], lastPulledAt: null,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify({ state: state, version: 1 }));
    localStorage.setItem('morrow-demo', 'on');
  } catch (e) {}
})();
