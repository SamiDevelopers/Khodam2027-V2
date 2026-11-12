
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, query, where, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBncCf-PVK6PzEYR09zDryD3ObgpxS2gpE",
  authDomain: "khodam-27-v2.firebaseapp.com",
  projectId: "khodam-27-v2",
  storageBucket: "khodam-27-v2.firebasestorage.app",
  messagingSenderId: "84798945598",
  appId: "1:84798945598:web:b0e8f519e54338585bd46f",
  measurementId: "G-J3C5HGZ2GC"
};

const firebaseApp = initializeApp(firebaseConfig);
const studentRegistrationApp = initializeApp(firebaseConfig, 'student-registration');
const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});
const auth = getAuth(firebaseApp);
const studentRegistrationAuth = getAuth(studentRegistrationApp);
isSupported().then(supported => { if (supported) getAnalytics(firebaseApp); }).catch(() => {});

const COLLECTIONS = {
  STUDENTS: 'students', SERVANTS: 'servants', ADMINS: 'admins',
  ATTENDANCE: 'attendance', PREPARATIONS: 'preparations', COURSEWORK: 'coursework',
  COMPETITIONS: 'competitions', EVALUATIONS: 'coursework', EXAMS: 'exams',
  SETTINGS: 'settings', VISITATION_NOTES: 'visitation_notes', LOGS: 'logs',
  SPIRITUAL_DAILY: 'spiritualDailyRecords', SPIRITUAL_MONTHLY: 'spiritualMonthlyNotes',
  BOOKS: 'books', SUBJECTS: 'subjects', ACADEMIC_YEARS: 'academicYears',
  BATCHES: 'batches', TERMS: 'terms', LECTURES: 'lectures', WEEKS: 'weeks',
  ACTIVE_SESSIONS: 'activeSessions', LOGS_AUDIT: 'auditLogs'
};

// صلاحيات الحسابات: لا تعتمد الواجهة وحدها عليها؛ يجب أن تطابقها قواعد Firestore.
const ACCESS_ACTIONS = [
  { value: 'view', label: 'عرض' }, { value: 'create', label: 'إنشاء' },
  { value: 'edit', label: 'تعديل' }, { value: 'archive', label: 'أرشفة' },
  { value: 'approve', label: 'اعتماد' }, { value: 'export', label: 'تصدير' },
  { value: 'manageUsers', label: 'إدارة مستخدمين' }, { value: 'manageSettings', label: 'إدارة إعدادات' },
  { value: 'managePermissions', label: 'إدارة صلاحيات' }, { value: 'viewAuditLog', label: 'سجل التدقيق' }
];
const ACCESS_RESOURCES = [
  { value: 'students', label: 'الطلاب والملفات الأكاديمية' }, { value: 'servants', label: 'الخدام والمسؤولون' },
  { value: 'attendance', label: 'الحضور والغياب' }, { value: 'grades', label: 'الدرجات والامتحانات' },
  { value: 'spiritualNotes', label: 'النوتة الروحية' }, { value: 'curriculum', label: 'الكتب والمناهج والدفعات' },
  { value: 'reports', label: 'التقارير' }, { value: 'system', label: 'إعدادات النظام' }, { value: 'audit', label: 'سجل التدقيق' }
];
const ROLE_PRESETS = {
  father_priest: ['view','create','edit','archive','approve','export','manageUsers','manageSettings','managePermissions','viewAuditLog'],
  service_manager: ['view','create','edit','archive','approve','export','manageUsers','viewAuditLog'],
  main_control: ['view','create','edit','approve','export'],
  admin_control: ['view','create','edit','export'],
  class_supervisor: ['view','create','edit'], subject_teacher: ['view','create','edit'],
  monitor: ['view'], student: ['view']
};

const STAGES_DEFAULT = ['السنة الأولى', 'السنة الثانية'];
const SCHOOL_YEARS = ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي', 'شباب', 'خريجين', 'أولياء أمور'];
const STUDY_BOOKS = ['الكتاب الأول', 'الكتاب الثاني', 'الكتاب الثالث', 'الكتاب الرابع'];
const STUDENT_STATUSES = ['نشط', 'ناجح', 'راسب', 'مؤجل', 'منقطع', 'عائد', 'مستكمل', 'خريج', 'مستمع'];
const TRAINING_BOOKS = {
  'السنة الأولى': ['الكتاب الأول', 'الكتاب الثالث'],
  'السنة الثانية': ['الكتاب الثاني', 'الكتاب الرابع']
};
const TRAINING_YEARS_DEFAULT = ['السنة الأولى', 'السنة الثانية'];
const CLASS_LETTERS = ['A','B'];
const CURRICULUM_SUBJECTS_DEFAULT = [
  { id: 'ritual-theology', value: 'ritual-theology', label: 'اللاهوت الطقسي', icon: '⛪', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'doctrinal-theology', value: 'doctrinal-theology', label: 'اللاهوت العقيدي', icon: '✝️', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'church-history', value: 'church-history', label: 'تاريخ الكنيسة', icon: '🏛️', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'human-development', value: 'human-development', label: 'التنمية البشرية', icon: '🌱', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'psychology', value: 'psychology', label: 'علم النفس', icon: '🧠', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'bible', value: 'bible', label: 'الكتاب المقدس', icon: '📖', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'pastoral-theology', value: 'pastoral-theology', label: 'اللاهوت الرعوي', icon: '🕊️', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'comparative-theology', value: 'comparative-theology', label: 'اللاهوت المقارن', icon: '⚖️', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 },
  { id: 'coptic-language', value: 'coptic-language', label: 'اللغة القبطية', icon: '☦️', books: ['الكتاب الأول', 'الكتاب الثالث'], countInTotal: true, competition: true, examQuestions: 30 }
];

const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'partial', 'excused', 'cancelled'];
const ATTENDANCE_POLICY_DEFAULT = {
  eligibilityPercent: 65,
  warningInterrupted: 7,
  warningConsecutive: 4,
  attendanceWeight: 50,
  questionsWeight: 50,
  lecture1: { quarterAfter: '18:30', absenceAt: '19:00' },
  lecture2: { quarterAfter: '19:30', absenceAt: '20:00' },
  compareBoundary: 'after' // strict boundary belongs to the later period
};

function createAcademicRecordId(prefix = 'record') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

const COURSEWORK_TYPES_DEFAULT = [
  { key: 'bibleCompetition', label: 'مسابقة الكتاب المقدس', icon: '📖', max: 20, active: true },
  { key: 'curriculumCompetition', label: 'مسابقة المنهج الدراسي', icon: '📚', max: 20, active: true, books: [...STUDY_BOOKS] },
  { key: 'servicePreparation', label: 'تحضير دروس الخدمة', icon: '🎓', max: 20, active: true, occurrences: 5, interval: 'شهريًا / خمس مرات في الترم' },
  { key: 'psalms', label: 'مسابقة تسميع المزامير', icon: '🎶', max: 20, active: true },
  { key: 'coptic', label: 'مسابقة اللغة القبطية', icon: '🔤', max: 20, active: true }
];

const COURSEWORK_BONUS_DEFAULT = [
  { key: 'memorization', label: 'بونص التسميع في المعاد', max: 5, active: true },
  { key: 'vespers', label: 'بونص حضور التسبيحة', max: 5, active: true },
  { key: 'service', label: 'بونص الخدمة أثناء الخدمة', max: 5, active: true },
  { key: 'other', label: 'بنود إضافية', max: 5, active: true }
];

const CourseworkEngine = {
  types() { return AppData.settings.courseworkTypes?.length ? AppData.settings.courseworkTypes.map(item => ({ max: 20, active: true, ...item })) : COURSEWORK_TYPES_DEFAULT.map(item => ({ ...item })); },
  bonusItems() { return AppData.settings.courseworkBonus?.length ? AppData.settings.courseworkBonus.map(item => ({ max: 0, active: true, ...item })) : COURSEWORK_BONUS_DEFAULT.map(item => ({ ...item })); },
  safeScore(value, max) { return Math.max(0, Math.min(max, parseFloat(value) || 0)); },
  total(records, studentId) {
    const core = this.types().filter(item => item.active).reduce((sum, item) => {
      const studentRecords = records.filter(r => String(r.studentId) === String(studentId) && r.courseworkType === item.key && r.isDeduction !== true && r.isBonus !== true);
      const score = studentRecords.length > 1
        ? studentRecords.reduce((total, record) => total + this.safeScore(record.score, record.maxScore || item.max), 0)
        : this.safeScore(studentRecords[0]?.score, item.max);
      return sum + Math.min(item.max, score);
    }, 0);
    const bonus = this.bonusItems().filter(item => item.active).reduce((sum, item) => {
      const studentRecords = records.filter(r => String(r.studentId) === String(studentId) && r.courseworkType === item.key && r.isBonus === true && r.isDeduction !== true);
      const score = studentRecords.length > 1
        ? studentRecords.reduce((total, record) => total + this.safeScore(record.score, record.maxScore || item.max), 0)
        : this.safeScore(studentRecords[0]?.score, item.max);
      return sum + Math.min(item.max, score);
    }, 0);
    const deductions = records.filter(r => String(r.studentId) === String(studentId) && r.isDeduction === true).reduce((sum, r) => sum + this.safeScore(r.score, 20), 0);
    return { core: Math.round(core * 100) / 100, bonus: Math.round(bonus * 100) / 100, deductions: Math.round(deductions * 100) / 100, total: Math.max(0, Math.round((core + bonus - deductions) * 100) / 100) };
  }
};

const COURSEWORK_VIEW_TABS = [
  { key: 'bibleCompetition', icon: '📖', label: 'مسابقة الكتاب المقدس', kind: 'core' },
  { key: 'curriculumCompetition', icon: '📚', label: 'مسابقات المنهج الدراسي', kind: 'core' },
  { key: 'servicePreparation', icon: '📝', label: 'تحضير دروس الخدمة', kind: 'core' },
  { key: 'psalms', icon: '🎵', label: 'مسابقات تسميع المزامير', kind: 'core' },
  { key: 'coptic', icon: '☦️', label: 'مسابقات اللغة القبطية', kind: 'core' },
  { key: '__bonus__', icon: '🌟', label: 'البونص', kind: 'bonus' }
];

function renderCourseworkBreakdown(records, stateKey, totalWeeks, onSelect) {
  const tabs = COURSEWORK_VIEW_TABS;
  const activeKey = State.activeTab[stateKey] || tabs[0].key;
  const active = tabs.find(tab => tab.key === activeKey) || tabs[0];
  const coreTypes = CourseworkEngine.types();
  const bonusTypes = CourseworkEngine.bonusItems();
  const rowDefinitions = active.kind === 'bonus'
    ? bonusTypes.filter(item => item.active).map(item => ({ key: item.key, label: item.label, max: item.max || 5 }))
    : [coreTypes.find(item => item.key === active.key) || { key: active.key, label: active.label, max: 20 }].map(item => ({ key: item.key, label: item.label, max: item.max || 20 }));
  const weeks = Array.from({ length: totalWeeks || 15 }, (_, index) => index + 1);
  const recordsForRow = row => records.filter(record =>
    String(record.courseworkType) === String(row.key) &&
    (active.kind === 'bonus' ? record.isBonus === true : record.isBonus !== true && record.isDeduction !== true)
  );
  const valueFor = (row, week) => recordsForRow(row).filter(record => Number(record.week) === week);
  const scoreText = row => {
    const rows = recordsForRow(row);
    if (!rows.length) return { score: '—', max: 0, notes: '—' };
    const score = rows.reduce((sum, record) => sum + Number(record.score || 0), 0);
    const max = rows.reduce((sum, record) => sum + Number(record.maxScore ?? row.max), 0);
    const notes = rows.map(record => record.note).filter(Boolean).join('، ') || '—';
    return { score: `${score} / ${max}`, max, notes };
  };
  const cells = row => weeks.map(week => {
    const values = valueFor(row, week);
    if (!values.length) return '<td class="coursework-empty">—</td>';
    const score = values.reduce((sum, record) => sum + Number(record.score || 0), 0);
    const max = values.reduce((sum, record) => sum + Number(record.maxScore ?? row.max), 0);
    const note = values.map(record => record.note).filter(Boolean).join('، ');
    return `<td class="coursework-score" title="${Helpers.escapeHtml(note || '')}">${score} / ${max}</td>`;
  }).join('');
  const rows = rowDefinitions.map(row => {
    const total = scoreText(row);
    return `<tr><th>${Helpers.escapeHtml(row.label)}</th>${cells(row)}<td class="coursework-total"><strong>${total.score}</strong></td><td>${Helpers.escapeHtml(total.notes)}</td></tr>`;
  }).join('');
  const table = `<div class="table-wrap coursework-matrix-wrap"><table class="coursework-matrix"><thead><tr><th>البند</th>${weeks.map(week => `<th>الأسبوع ${week}</th>`).join('')}<th>الإجمالي</th><th>ملاحظات</th></tr></thead><tbody>${rows || `<tr><td colspan="${weeks.length + 3}"><div class="empty-state">لا توجد درجات مسجلة لهذا البند</div></td></tr>`}</tbody></table></div>`;
  const tabButtons = tabs.map(tab => `<button class="btn ${tab.key === active.key ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="${onSelect(tab.key)}">${tab.icon} ${tab.label}</button>`).join('');
  return `<div class="coursework-subtabs" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">${tabButtons}</div>${table}`;
}

function renderCourseworkPrintMatrices(records, totalWeeks) {
  const weeks = Array.from({ length: totalWeeks || 15 }, (_, index) => index + 1);
  const coreTypes = CourseworkEngine.types();
  const bonusTypes = CourseworkEngine.bonusItems();
  return COURSEWORK_VIEW_TABS.map(tab => {
    const rowDefinitions = tab.kind === 'bonus'
      ? bonusTypes.filter(item => item.active).map(item => ({ key: item.key, label: item.label, max: item.max || 5 }))
      : [coreTypes.find(item => item.key === tab.key) || { key: tab.key, label: tab.label, max: 20 }].map(item => ({ key: item.key, label: item.label, max: item.max || 20 }));
    const rows = rowDefinitions.map(row => {
      const rowRecords = records.filter(record => String(record.courseworkType) === String(row.key) && (tab.kind === 'bonus' ? record.isBonus === true : record.isBonus !== true && record.isDeduction !== true));
      const cells = weeks.map(week => {
        const values = rowRecords.filter(record => Number(record.week) === week);
        if (!values.length) return '<td style="text-align:center;color:#aaa;">—</td>';
        const score = values.reduce((sum, record) => sum + Number(record.score || 0), 0);
        const max = values.reduce((sum, record) => sum + Number(record.maxScore ?? row.max), 0);
        return `<td style="text-align:center;white-space:nowrap;">${score} / ${max}</td>`;
      }).join('');
      const totalScore = rowRecords.reduce((sum, record) => sum + Number(record.score || 0), 0);
      const totalMax = rowRecords.reduce((sum, record) => sum + Number(record.maxScore ?? row.max), 0);
      const notes = rowRecords.map(record => record.note).filter(Boolean).join('، ') || '—';
      return `<tr><th>${Helpers.escapeHtml(row.label)}</th>${cells}<td style="white-space:nowrap;"><strong>${rowRecords.length ? `${totalScore} / ${totalMax}` : '—'}</strong></td><td>${Helpers.escapeHtml(notes)}</td></tr>`;
    }).join('');
    return `<section class="print-section print-coursework-section"><h3>${tab.icon} ${Helpers.escapeHtml(tab.label)}</h3><table class="coursework-print-matrix"><thead><tr><th>البند</th>${weeks.map(week => `<th>الأسبوع ${week}</th>`).join('')}<th>الإجمالي</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
}

const AttendanceEngine = {
  policy() {
    return { ...ATTENDANCE_POLICY_DEFAULT, ...(AppData.settings.attendancePolicy || {}), lecture1: { ...ATTENDANCE_POLICY_DEFAULT.lecture1, ...(AppData.settings.attendancePolicy?.lecture1 || {}) }, lecture2: { ...ATTENDANCE_POLICY_DEFAULT.lecture2, ...(AppData.settings.attendancePolicy?.lecture2 || {}) } };
  },
  statusLabel(status) {
    return { present: 'حاضر', late: 'متأخر', absent: 'غائب', partial: 'غياب جزئي', excused: 'غياب بعذر', cancelled: 'ملغاة/غير منعقدة' }[status] || status;
  },
  termSummary(records, studentId, totalWeeks = AppData.settings.totalWeeks || 15) {
    const safeTotalWeeks = Math.max(0, Number(totalWeeks) || 0);
    const studentRecords = records.filter(r => String(r.studentId) === String(studentId) && r.type !== 'visitation' && r.status !== 'cancelled');
    const weekKey = record => String(record.week ?? record.studyDay ?? record.date ?? '').trim();
    const grouped = new Map();
    studentRecords.forEach(record => {
      const key = weekKey(record);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    let attendedWeeks = 0;
    let recordedWeeks = 0;
    grouped.forEach(rows => {
      if (!rows.length) return;
      recordedWeeks += 1;
      const units = rows.reduce((sum, row) => {
        if (['present', 'late'].includes(row.status)) return sum + 1;
        if (row.status === 'partial') return sum + 0.5;
        return sum;
      }, 0);
      const lectureCount = Math.max(2, rows.length);
      attendedWeeks += Math.min(1, units / lectureCount);
    });
    attendedWeeks = Math.round(attendedWeeks * 10) / 10;
    const absentWeeks = Math.round(Math.max(0, recordedWeeks - attendedWeeks) * 10) / 10;
    const remainingWeeks = Math.max(0, safeTotalWeeks - recordedWeeks);
    const percent = value => safeTotalWeeks ? Math.round(value / safeTotalWeeks * 1000) / 10 : 0;
    return {
      totalWeeks: safeTotalWeeks,
      recordedWeeks,
      attendedWeeks,
      absentWeeks,
      remainingWeeks,
      attendedPercent: percent(attendedWeeks),
      absentPercent: percent(absentWeeks),
      remainingPercent: percent(remainingWeeks)
    };
  },
  calculate(records, studentId) {
    const policy = this.policy();
    const term = this.termSummary(records, studentId);
    const studentRecords = records.filter(r => String(r.studentId) === String(studentId) && r.type !== 'visitation' && r.status !== 'cancelled');
    const counted = studentRecords.filter(r => r.status !== 'cancelled');
    const present = studentRecords.filter(r => ['present', 'late'].includes(r.status)).length;
    const late = studentRecords.filter(r => r.status === 'late').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const excused = studentRecords.filter(r => r.status === 'excused').length;
    const partial = studentRecords.filter(r => r.status === 'partial').length;
    const attendanceUnits = present + partial * 0.5;
    const percentage = term.attendedPercent;
    const eligible = percentage >= policy.eligibilityPercent;
    const sessions = [...new Set(studentRecords.map(r => r.studyDay || r.week || r.date).filter(Boolean))];
    let currentConsecutive = 0;
    let consecutiveAbsentDays = 0;
    let interruptedAbsences = 0;
    sessions.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).forEach(week => {
      const dayRecords = studentRecords.filter(r => (r.studyDay || r.week || r.date) === week);
      const fullAbsence = dayRecords.length > 0 && dayRecords.every(r => r.status === 'absent');
      if (fullAbsence) { currentConsecutive++; consecutiveAbsentDays = Math.max(consecutiveAbsentDays, currentConsecutive); }
      else currentConsecutive = 0;
    });
    interruptedAbsences = new Set(studentRecords.filter(r => r.status === 'absent').map(r => r.studyDay || r.week || r.date).filter(Boolean)).size;
    return {
      percentage, eligible: eligible ? 'مؤهل' : 'غير مؤهل',
      termTotalWeeks: term.totalWeeks,
      termRecordedWeeks: term.recordedWeeks,
      termAttendedWeeks: term.attendedWeeks,
      termAbsentWeeks: term.absentWeeks,
      termRemainingWeeks: term.remainingWeeks,
      termAttendedPercent: term.attendedPercent,
      termAbsentPercent: term.absentPercent,
      termRemainingPercent: term.remainingPercent,
      total: counted.length, held: counted.length,
      present: present + partial,
      absent, late, excused,
      partial,
      interruptedAbsences,
      consecutiveAbsentDays,
      consecutive: consecutiveAbsentDays,
      remainingInterrupted: Math.max(0, policy.warningInterrupted - interruptedAbsences),
      remainingConsecutive: Math.max(0, policy.warningConsecutive - consecutiveAbsentDays),
      needsWarning: interruptedAbsences >= policy.warningInterrupted || consecutiveAbsentDays >= policy.warningConsecutive,
      warning: interruptedAbsences >= policy.warningInterrupted
        ? `تم بلوغ حد الغياب المتقطع (${policy.warningInterrupted})`
        : consecutiveAbsentDays >= policy.warningConsecutive
          ? `تم بلوغ حد الغياب المتتالي (${policy.warningConsecutive})`
          : ''
    };
  },
  getStatusByArrival(arrivalTime, lectureNumber) {
    const policy = this.policy();
    const rules = lectureNumber === 2 ? policy.lecture2 : policy.lecture1;
    if (!arrivalTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime)) return null;
    if (arrivalTime < rules.quarterAfter) return 'present';
    if (arrivalTime < rules.absenceAt) return 'late';
    return 'absent';
  }
};

function attendanceTermSummaryHtml(summary) {
  const fmt = value => Number.isInteger(value) ? value : Number(value).toFixed(1);
  return `<div class="card attendance-term-summary"><div class="card-title">📊 موقف الحضور والغياب التراكمي للترم</div><div class="gold-line"></div>
    <div class="info-msg">النسب محسوبة من إجمالي الترم المحدد: ${fmt(summary.totalWeeks)} أسبوع، وليس من عدد السجلات المدخلة فقط.</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${fmt(summary.totalWeeks)}</div><div class="lbl">إجمالي أسابيع الترم</div></div>
      <div class="stat-card"><div class="num">${fmt(summary.attendedWeeks)} (${summary.attendedPercent}%)</div><div class="lbl">الحضور الفعلي</div></div>
      <div class="stat-card"><div class="num">${fmt(summary.absentWeeks)} (${summary.absentPercent}%)</div><div class="lbl">الغياب الفعلي</div></div>
      <div class="stat-card"><div class="num">${fmt(summary.remainingWeeks)} (${summary.remainingPercent}%)</div><div class="lbl">المتبقي من الترم</div></div>
    </div>
    <div class="info-msg">المسجل حتى الآن: ${fmt(summary.recordedWeeks)} أسبوع • المتبقي غير المسجل: ${fmt(summary.remainingWeeks)} أسبوع • إجمالي النسبة = الحضور الفعلي ÷ إجمالي أسابيع الترم.</div>
  </div>`;
}

function normalizeSubject(subject) {
  const safeBooks = Array.isArray(subject.books) ? subject.books.filter(book => STUDY_BOOKS.includes(book)) : [];
  const value = String(subject.value || subject.id || subject.label || '').trim().toLowerCase().replace(/\s+/g, '-');
  return {
    id: String(subject.id || value),
    value: String(subject.value || value),
    label: String(subject.label || subject.name || 'مادة جديدة'),
    icon: String(subject.icon || '📚'),
    books: safeBooks.length ? safeBooks : ['الكتاب الأول', 'الكتاب الثالث'],
    countInTotal: subject.countInTotal !== false,
    competition: subject.competition !== false,
    examQuestions: Math.max(1, parseInt(subject.examQuestions) || 30)
  };
}

/* ============================================================
   نظام الدرجات
   ============================================================ */
const GRADING_SYSTEM = {
  regular: { attendance: 20, evaluations: 30, exam: 50, total: 100 },
  hymns: { attendance: 20, evaluations: 20, exam: 60, total: 100 },
  getWeights(subject) { return subject === 'hymns' ? this.hymns : this.regular; },
  calculateSubjectGrade(studentId, subject, totalWeeks, totalEvaluations) {
    const weights = this.getWeights(subject);
    let attRecords = AppData.attendance.filter(a => a.studentId === studentId && a.type !== 'visitation' && a.subject === subject);
    if (attRecords.length === 0) attRecords = AppData.attendance.filter(a => a.studentId === studentId && a.type !== 'visitation');
    const presentCount = attRecords.filter(a => a.status === 'present').length;
    const attendancePercent = totalWeeks > 0 ? presentCount / totalWeeks : 0;
    const attendanceScore = Math.round(attendancePercent * weights.attendance * 100) / 100;
    const evals = AppData.evaluations.filter(e => e.studentId === studentId && e.subject === subject);
    let evalScore = 0;
    if (totalEvaluations > 0) {
      const evalTotal = evals.reduce((sum, e) => sum + (e.score || 0), 0);
      const maxEvalTotal = 10 * totalEvaluations;
      const evalPercent = maxEvalTotal > 0 ? evalTotal / maxEvalTotal : 0;
      evalScore = Math.round(evalPercent * weights.evaluations * 100) / 100;
    }
    const exam = AppData.exams.find(e => e.studentId === studentId && e.subject === subject);
    const examRawScore = exam ? Math.max(0, Math.min(100, Number(exam.score) || 0)) : 0;
    const examScore = exam ? Math.round((examRawScore / 100) * weights.exam * 100) / 100 : 0;
    return {
      attendanceScore, attendancePresent: presentCount, attendanceTotal: totalWeeks,
      evalScore, evalCount: evals.length, examScore, examRawScore, examMax: 100,
      total: Math.round((attendanceScore + evalScore + examScore) * 100) / 100, weights
    };
  },
  getGradeLetter(score) {
    if (score >= 90) return { letter: 'A', label: 'ممتاز', color: '#2e7d32' };
    if (score >= 80) return { letter: 'B', label: 'جيد جدًا', color: '#1976d2' };
    if (score >= 70) return { letter: 'C', label: 'جيد', color: '#f9a825' };
    if (score >= 60) return { letter: 'D', label: 'مقبول', color: '#e65100' };
    return { letter: 'F', label: 'ضعيف', color: '#c62828' };
  }
};

const CodeGenerator = {
  SERVANT_PATTERN: /^A[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/,
  STUDENT_PATTERN: /^S[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/,
  LETTERS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  generateCode(prefix) {
    const rl = () => this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)];
    const rd = () => Math.floor(10 + Math.random() * 90).toString();
    return `${prefix}${rl()}${rd()}${rl()}${rl()}${rd()}`;
  },
  generateServantCode() { return this.generateCode('A'); },
  generateStudentCode() { return this.generateCode('S'); },
  isValidServantCode(code) { return this.SERVANT_PATTERN.test(code); },
  isValidStudentCode(code) { return this.STUDENT_PATTERN.test(code); },
  generateUniqueCode(prefix, existingCodes = new Set(), maxAttempts = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      const code = this.generateCode(prefix);
      if (!existingCodes.has(code)) return code;
    }
    throw new Error('فشل توليد كود فريد');
  }
};

const AuthManager = {
  currentUid: null, ready: false,
  async init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) this.currentUid = user.uid;
        else this.currentUid = null;
        this.ready = true;
        resolve(this.currentUid);
      });
    });
  }
};

const ConnectionState = {
  isOnline: true,
  init() { window.addEventListener('online', () => this.update(true)); window.addEventListener('offline', () => this.update(false)); this.update(navigator.onLine); },
  update(online) {
    this.isOnline = online;
    const badge = document.getElementById('fbStatus');
    if (!badge) return;
    badge.className = online ? 'fb-status online' : 'fb-status offline';
    badge.textContent = online ? '🟢 متصل بـ Firebase' : '🔴 غير متصل';
  },
  setSyncing() {
    const badge = document.getElementById('fbStatus');
    if (badge) { badge.className = 'fb-status syncing'; badge.textContent = '⏳ جارٍ المزامنة...'; }
  }
};

/* ============================================================
   Device Fingerprint
   ============================================================ */
function getDeviceFingerprint() {
  let fingerprint = localStorage.getItem('habib_device_fp');
  if (!fingerprint) {
    const nav = window.navigator;
    const screen = window.screen;
    const data = [
      nav.userAgent, nav.language, screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency || 'unknown',
      nav.platform || 'unknown'
    ].join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    fingerprint = 'dev_' + Math.abs(hash).toString(36);
    localStorage.setItem('habib_device_fp', fingerprint);
  }
  return fingerprint;
}

/* ============================================================
   Session Tracker
   ============================================================ */
const SessionTracker = {
  currentSessionId: null,
  heartbeatInterval: null,
  unsubscribe: null,
  deviceFingerprint: null,

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  async startSession(user) {
    try {
      this.deviceFingerprint = getDeviceFingerprint();
      this.currentSessionId = this.generateSessionId();
      
      await setDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, this.currentSessionId), {
        sessionId: this.currentSessionId,
        userType: user.type,
        userId: user.data.id || user.data.username || user.data.uid,
        userName: user.data.name || 'غير محدد',
        userCode: user.data.code || user.data.id || '',
        userRole: user.type,
        roles: Helpers.getServantAdminRoles(user.data),
        classes: Helpers.getServantClassGroups(user.data),
        device: navigator.userAgent,
        deviceFingerprint: this.deviceFingerprint,
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? '📱 جوال' : '💻 كمبيوتر',
        loginAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isActive: true
      }, { merge: true });

      localStorage.setItem('habib_session_id', this.currentSessionId);
      this.startHeartbeat();
      console.log('✅ Session started:', this.currentSessionId);
    } catch (e) { console.error('Failed to start session:', e); }
  },

  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => {
      if (!this.currentSessionId) return;
      try {
        await updateDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, this.currentSessionId), {
          lastSeen: new Date().toISOString(),
          isActive: true
        });
      } catch (e) {}
    }, 30000);
  },

  async endSession() {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.currentSessionId) {
      try {
        await updateDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, this.currentSessionId), {
          isActive: false,
          logoutAt: new Date().toISOString()
        });
      } catch (e) {}
      localStorage.removeItem('habib_session_id');
      this.currentSessionId = null;
    }
  },

  async forceLogout(sessionId) {
    try {
      await updateDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, sessionId), {
        isActive: false,
        forcedLogout: true,
        logoutAt: new Date().toISOString()
      });
      return true;
    } catch (e) { return false; }
  },

  isThisDevice(session) {
    if (!this.deviceFingerprint) this.deviceFingerprint = getDeviceFingerprint();
    return session.deviceFingerprint === this.deviceFingerprint;
  },

  startMonitoring(callback) {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = onSnapshot(collection(db, COLLECTIONS.ACTIVE_SESSIONS), (snap) => {
      const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(sessions);
    });
  },

  isSessionActive(session) {
    if (!session.isActive) return false;
    return (Date.now() - new Date(session.lastSeen).getTime()) < 120000;
  },

  isSessionIdle(session) {
    if (!session.isActive) return false;
    const diff = Date.now() - new Date(session.lastSeen).getTime();
    return diff >= 120000 && diff < 300000;
  },

  async cleanupOldSessions() {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.ACTIVE_SESSIONS));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (Date.now() - new Date(data.lastSeen).getTime() > 300000) {
          batch.update(d.ref, { isActive: false });
          count++;
        }
      });
      if (count > 0) await batch.commit();
    } catch (e) {}
  }
};

/* ============================================================
   DB Layer
   ============================================================ */
const DB = {
  KEYS: { STUDENTS: 'habib_students', SERVANTS: 'habib_servants', ATTENDANCE: 'habib_attendance',
    EVALUATIONS: 'habib_evaluations', EXAMS: 'habib_exams', NOTES: 'habib_notes',
    LOGS: 'habib_logs', SETTINGS: 'habib_settings', SESSION: 'habib_session' },

  _cacheGet(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
  _cacheSet(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} },

  async getStudents() {
    try {
      ConnectionState.setSyncing();
      const ref = collection(db, COLLECTIONS.STUDENTS);
      const source = State.currentUser?.type === 'student'
        ? query(ref, where('uid', '==', AuthManager.currentUid))
        : ref;
      const snap = await getDocs(source);
      const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._cacheSet(this.KEYS.STUDENTS, students);
      ConnectionState.update(true);
      return students;
    } catch (e) { ConnectionState.update(false); return State.currentUser?.type === 'student' ? [] : this._cacheGet(this.KEYS.STUDENTS); }
  },
  async addStudent(student) {
    if (!CodeGenerator.isValidStudentCode(student.id)) throw new Error('كود غير صالح');
    const allCodes = await this.getAllCodes();
    if (allCodes.has(student.id)) throw new Error('الكود مستخدم');
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), { ...student, uid: student.uid || AuthManager.currentUid, createdAt: serverTimestamp() });
    const cache = this._cacheGet(this.KEYS.STUDENTS); cache.push(student);
    this._cacheSet(this.KEYS.STUDENTS, cache);
  },
  async updateStudent(id, updates) {
    const historicalFields = ['academicRegistrations', 'bookAttempts', 'academicAttempts', 'academicRecords', 'transferHistory', 'academicDecisions'];
    const currentSnap = await getDoc(doc(db, COLLECTIONS.STUDENTS, id));
    const current = currentSnap.exists() ? currentSnap.data() : {};
    const safeUpdates = { ...updates };
    historicalFields.forEach(field => {
      if (!Array.isArray(updates[field]) && !Array.isArray(current[field])) return;
      const merged = [...(Array.isArray(current[field]) ? current[field] : []), ...(Array.isArray(updates[field]) ? updates[field] : [])];
      safeUpdates[field] = [...new Map(merged.map((record, index) => [record.id || record.key || `${field}_${index}`, record])).values()];
    });
    await updateDoc(doc(db, COLLECTIONS.STUDENTS, id), { ...safeUpdates, updatedAt: serverTimestamp() });
    const cache = this._cacheGet(this.KEYS.STUDENTS);
    const idx = cache.findIndex(s => s.id === id);
    if (idx !== -1) { cache[idx] = { ...cache[idx], ...safeUpdates }; this._cacheSet(this.KEYS.STUDENTS, cache); }
  },
  async deleteStudent(id) {
    await deleteDoc(doc(db, COLLECTIONS.STUDENTS, id));
    this._cacheSet(this.KEYS.STUDENTS, this._cacheGet(this.KEYS.STUDENTS).filter(s => s.id !== id));
  },
  async generateStudentCode() { return CodeGenerator.generateUniqueCode('S', await this.getAllCodes()); },

  async getServants() {
    if (State.currentUser?.type === 'student') return [];
    try {
      ConnectionState.setSyncing();
      const snap = await getDocs(collection(db, COLLECTIONS.SERVANTS));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._cacheSet(this.KEYS.SERVANTS, data);
      ConnectionState.update(true);
      return data;
    } catch (e) { ConnectionState.update(false); return this._cacheGet(this.KEYS.SERVANTS); }
  },
  async addServant(s) {
    if (!CodeGenerator.isValidServantCode(s.code)) throw new Error('كود غير صالح');
    const allCodes = await this.getAllCodes();
    if (allCodes.has(s.code)) throw new Error('الكود مستخدم');
    await setDoc(doc(db, COLLECTIONS.SERVANTS, s.id), { ...s, uid: AuthManager.currentUid, createdAt: serverTimestamp() });
    const cache = this._cacheGet(this.KEYS.SERVANTS).filter(item => item.id !== s.id);
    cache.push(s);
    this._cacheSet(this.KEYS.SERVANTS, cache);
  },
  async updateServant(id, updates) {
    await updateDoc(doc(db, COLLECTIONS.SERVANTS, id), { ...updates, updatedAt: serverTimestamp() });
    const cache = this._cacheGet(this.KEYS.SERVANTS);
    const idx = cache.findIndex(s => s.id === id);
    if (idx !== -1) { cache[idx] = { ...cache[idx], ...updates }; this._cacheSet(this.KEYS.SERVANTS, cache); }
  },
  async deleteServant(id) {
    await deleteDoc(doc(db, COLLECTIONS.SERVANTS, id));
    this._cacheSet(this.KEYS.SERVANTS, this._cacheGet(this.KEYS.SERVANTS).filter(s => s.id !== id));
  },
  async generateServantCode() { return CodeGenerator.generateUniqueCode('A', await this.getAllCodes()); },
  async getAdmins() {
    try { const snap = await getDocs(collection(db, COLLECTIONS.ADMINS)); return snap.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch { return []; }
  },
  async getAllCodes() {
    const codes = new Set();
    (await this.getStudents()).forEach(s => codes.add(s.id));
    (await this.getServants()).forEach(s => { if (s.code) codes.add(s.code); });
    return codes;
  },

  async getAttendance() {
    try {
      const ref = collection(db, COLLECTIONS.ATTENDANCE);
      const source = State.currentUser?.type === 'student'
        ? query(ref, where('studentId', '==', State.currentUser.data.id))
        : ref;
      const snap = await getDocs(source);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._cacheSet(this.KEYS.ATTENDANCE, data);
      return data;
    } catch { return State.currentUser?.type === 'student' ? [] : this._cacheGet(this.KEYS.ATTENDANCE); }
  },
  async saveAttendanceBulk(records) {
    const batch = writeBatch(db);
    records.forEach(r => {
      const lectureSuffix = r.lecture ? `_L${r.lecture}` : '';
      const courseworkSuffix = r.courseworkType ? `_${r.courseworkType}` : '';
      const docId = `${r.studentId}_W${r.week}_${r.type || 'attendance'}${lectureSuffix}${courseworkSuffix}`;
      batch.set(doc(db, COLLECTIONS.ATTENDANCE, docId), { ...r, recordedBy: AuthManager.currentUid, date: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  },

  async getVisitationNotes() {
    try {
      const ref = collection(db, COLLECTIONS.VISITATION_NOTES);
      const source = State.currentUser?.type === 'student'
        ? query(ref, where('studentId', '==', State.currentUser.data.id))
        : ref;
      const snap = await getDocs(source);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._cacheSet(this.KEYS.NOTES, data);
      return data;
    } catch { return State.currentUser?.type === 'student' ? [] : this._cacheGet(this.KEYS.NOTES); }
  },
  async addVisitationNote(note) {
    const ref = await addDoc(collection(db, COLLECTIONS.VISITATION_NOTES), { ...note, servantUid: AuthManager.currentUid, createdAt: serverTimestamp() });
    const saved = { id: ref.id, ...note };
    const cache = this._cacheGet(this.KEYS.NOTES); cache.push(saved);
    this._cacheSet(this.KEYS.NOTES, cache);
    return saved;
  },
  async updateVisitationNote(id, updates) {
    await updateDoc(doc(db, COLLECTIONS.VISITATION_NOTES, id), { ...updates, updatedAt: serverTimestamp() });
    const cache = this._cacheGet(this.KEYS.NOTES).map(n => n.id === id ? { ...n, ...updates } : n);
    this._cacheSet(this.KEYS.NOTES, cache);
  },
  async deleteVisitationNote(id) {
    await deleteDoc(doc(db, COLLECTIONS.VISITATION_NOTES, id));
    this._cacheSet(this.KEYS.NOTES, this._cacheGet(this.KEYS.NOTES).filter(n => n.id !== id));
  },

  async getEvaluations() {
    try {
      const ref = collection(db, COLLECTIONS.EVALUATIONS);
      const source = State.currentUser?.type === 'student'
        ? query(ref, where('studentId', '==', State.currentUser.data.id))
        : ref;
      const snap = await getDocs(source);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return State.currentUser?.type === 'student' ? [] : this._cacheGet(this.KEYS.EVALUATIONS); }
  },
  async saveEvaluationsBulk(records) {
    const batch = writeBatch(db);
    records.forEach(r => {
      const courseworkSuffix = r.courseworkType ? `_${r.courseworkType}` : '';
      const deductionSuffix = r.isDeduction ? '_deduction' : '';
      const docId = `${r.studentId}_${r.subject || r.courseworkType || 'coursework'}${courseworkSuffix}_W${r.week}${deductionSuffix}`;
      batch.set(doc(db, COLLECTIONS.EVALUATIONS, docId), { ...r, recordedBy: AuthManager.currentUid, date: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  },

  async getExams() {
    try {
      const ref = collection(db, COLLECTIONS.EXAMS);
      const source = State.currentUser?.type === 'student'
        ? query(ref, where('studentId', '==', State.currentUser.data.id))
        : ref;
      const snap = await getDocs(source);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return State.currentUser?.type === 'student' ? [] : this._cacheGet(this.KEYS.EXAMS); }
  },
  async saveExamsBulk(records) {
    const batch = writeBatch(db);
    records.forEach(r => {
      const docId = `${r.studentId}_${r.subject}_${r.examType || 'final'}`;
      batch.set(doc(db, COLLECTIONS.EXAMS, docId), { ...r, recordedBy: AuthManager.currentUid, date: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  },

  async getLogs() {
    if (State.currentUser?.type === 'student') return [];
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.LOGS));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return this._cacheGet(this.KEYS.LOGS); }
  },
  async addLog(log) {
    try {
      await addDoc(collection(db, COLLECTIONS.LOGS), { ...log, user: State.currentUser?.data?.name || 'System', userId: AuthManager.currentUid, timestamp: serverTimestamp() });
    } catch (e) {}
  },

  async getSettings() {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'main'));
      if (snap.exists()) { const d = snap.data(); this._cacheSet(this.KEYS.SETTINGS, d); return d; }
    } catch (e) {}
    const cached = this._cacheGet(this.KEYS.SETTINGS);
    if (cached && cached.termStart) return cached;
    return {
      centerName: 'نظام خدمة إعداد الخدام - كنيسة السيدة العذراء ومار يوحنا الحبيب - فيصل',
      termStart: '2025-09-01', termEnd: '2025-12-31',
      totalWeeks: 15, currentWeek: 1, totalEvaluations: 10,
      academicYear: '2025 / 2026', currentTerm: 'الترم الأول'
    };
  },
  async setSettings(data) {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'main'), data, { merge: true });
    this._cacheSet(this.KEYS.SETTINGS, data);
  },

  getSession() { try { return JSON.parse(localStorage.getItem(this.KEYS.SESSION) || 'null'); } catch { return null; } },
  setSession(d) { localStorage.setItem(this.KEYS.SESSION, JSON.stringify(d)); },
  clearSession() { localStorage.removeItem(this.KEYS.SESSION); },

  listenToStudents(cb) {
    const ref = collection(db, COLLECTIONS.STUDENTS);
    const source = State.currentUser?.type === 'student' ? query(ref, where('uid', '==', AuthManager.currentUid)) : ref;
    return onSnapshot(source, snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.STUDENTS, d); cb(d); });
  },
  listenToServants(cb) { return onSnapshot(collection(db, COLLECTIONS.SERVANTS), snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.SERVANTS, d); cb(d); }); },
  listenToAttendance(cb) {
    const ref = collection(db, COLLECTIONS.ATTENDANCE);
    const source = State.currentUser?.type === 'student' ? query(ref, where('studentId', '==', State.currentUser.data.id)) : ref;
    return onSnapshot(source, snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.ATTENDANCE, d); cb(d); });
  },
  listenToEvaluations(cb) {
    const ref = collection(db, COLLECTIONS.EVALUATIONS);
    const source = State.currentUser?.type === 'student' ? query(ref, where('studentId', '==', State.currentUser.data.id)) : ref;
    return onSnapshot(source, snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.EVALUATIONS, d); cb(d); });
  },
  listenToExams(cb) {
    const ref = collection(db, COLLECTIONS.EXAMS);
    const source = State.currentUser?.type === 'student' ? query(ref, where('studentId', '==', State.currentUser.data.id)) : ref;
    return onSnapshot(source, snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.EXAMS, d); cb(d); });
  },
  listenToVisitationNotes(cb) {
    const ref = collection(db, COLLECTIONS.VISITATION_NOTES);
    const source = State.currentUser?.type === 'student' ? query(ref, where('studentId', '==', State.currentUser.data.id)) : ref;
    return onSnapshot(source, snap => { const d = snap.docs.map(x => ({ id: x.id, ...x.data() })); this._cacheSet(this.KEYS.NOTES, d); cb(d); });
  },

  async clearCollection(collectionName) {
    const batch = writeBatch(db);
    const snap = await getDocs(collection(db, collectionName));
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },
  async deleteAllStudents() { await this.clearCollection(COLLECTIONS.STUDENTS); },
  async deleteAllServants() { await this.clearCollection(COLLECTIONS.SERVANTS); },
  async deleteAllAttendance() { await this.clearCollection(COLLECTIONS.ATTENDANCE); },
  async deleteAllEvaluations() { await this.clearCollection(COLLECTIONS.EVALUATIONS); },
  async deleteAllExams() { await this.clearCollection(COLLECTIONS.EXAMS); },
  async deleteAllVisitationNotes() { await this.clearCollection(COLLECTIONS.VISITATION_NOTES); },
  async deleteAllLogs() { await this.clearCollection(COLLECTIONS.LOGS); }
};

const AppData = {
  students: [], servants: [], attendance: [], evaluations: [], exams: [],
  visitationNotes: [], logs: [], activeSessions: [],
  subjects: CURRICULUM_SUBJECTS_DEFAULT.map(subject => ({ ...subject })),
  stages: [...STAGES_DEFAULT],
  settings: {
    centerName: 'نظام خدمة إعداد الخدام - كنيسة السيدة العذراء ومار يوحنا الحبيب - فيصل',
    termStart: '2025-09-01', termEnd: '2025-12-31',
    totalWeeks: 15, currentWeek: 1, totalEvaluations: 10,
    academicYear: '2025 / 2026', currentTerm: 'الترم الأول'
  },

  async loadAll() {
    showLoading('جارٍ تحميل البيانات...');
    try {
      const [students, servants, attendance, notes, settings, evaluations, exams, logs] = await Promise.all([
        DB.getStudents(), DB.getServants(), DB.getAttendance(),
        DB.getVisitationNotes(), DB.getSettings(),
        DB.getEvaluations(), DB.getExams(), DB.getLogs()
      ]);
      const savedTypes = Array.isArray(settings.courseworkTypes) ? settings.courseworkTypes : [];
      const savedBonus = Array.isArray(settings.courseworkBonus) ? settings.courseworkBonus : [];
      const normalizedSettings = {
        ...settings,
        courseworkTypes: COURSEWORK_TYPES_DEFAULT.map(defaultItem =>
          ({ ...defaultItem, ...(savedTypes.find(item => item.key === defaultItem.key) || {}) })),
        courseworkBonus: COURSEWORK_BONUS_DEFAULT.map(defaultItem =>
          ({ ...defaultItem, ...(savedBonus.find(item => item.key === defaultItem.key) || {}) }))
      };
      const uniqueServants = [...new Map(servants.map(servant => [servant.code || servant.id, servant])).values()];
      Object.assign(this, { students, servants: uniqueServants, attendance, visitationNotes: notes, settings: normalizedSettings, evaluations, exams, logs });
      const savedSubjects = Array.isArray(settings.subjects) ? settings.subjects : [];
      const defaultKeys = new Set(CURRICULUM_SUBJECTS_DEFAULT.map(subject => subject.value));
      const mergedSubjects = CURRICULUM_SUBJECTS_DEFAULT.map(defaultSubject => normalizeSubject({
        ...defaultSubject,
        ...(savedSubjects.find(subject => subject.value === defaultSubject.value || subject.id === defaultSubject.id) || {})
      }));
      const customSubjects = savedSubjects.filter(subject => !defaultKeys.has(subject.value)).map(normalizeSubject);
      this.subjects = [...mergedSubjects, ...customSubjects];
      this.startRealtimeListeners();
    } catch (e) { console.error(e); showToast('⚠️ فشل تحميل البيانات', 'error'); }
    finally { hideLoading(); }
  },

  startRealtimeListeners() {
    DB.listenToStudents(d => { this.students = d; if (State.currentPage === 'dashboard') renderApp(); });
    if (State.currentUser?.type !== 'student') {
      DB.listenToServants(d => { this.servants = [...new Map(d.map(servant => [servant.code || servant.id, servant])).values()]; if (State.currentPage === 'dashboard') renderApp(); });
    }
    DB.listenToAttendance(d => { this.attendance = d; if (State.currentPage === 'dashboard') renderApp(); });
    DB.listenToEvaluations(d => { this.evaluations = d; if (State.currentPage === 'dashboard') renderApp(); });
    DB.listenToExams(d => { this.exams = d; if (State.currentPage === 'dashboard') renderApp(); });
    DB.listenToVisitationNotes(d => { this.visitationNotes = d; if (State.currentPage === 'dashboard') renderApp(); });
  }
};

const State = {
  currentPage: 'home', currentUser: null, activeTab: {}, sidebarOpen: false, classFilter: 'all', studyBookFilter: 'all', batchFilter: String(new Date().getFullYear()), graduateBatchFilter: 'all',
  setPage(page) { this.currentPage = page; renderApp(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  setUser(user) { this.currentUser = user; DB.setSession(user); renderApp(); },
  async logout() {
    await SessionTracker.endSession();
    this.currentUser = null;
    DB.clearSession();
    this.currentPage = 'home';
    renderApp();
    showToast('👋 تم تسجيل الخروج');
  },
  setTab(tab) { this.activeTab[this.currentPage] = tab; renderApp(); },
  getTab() { return this.activeTab[this.currentPage] || null; },
  setClassFilter(cls) { this.classFilter = cls; requestAnimationFrame(() => renderApp()); },
  setStudentFilter(key, value) { this[key] = value; requestAnimationFrame(() => renderApp()); }
};

const Helpers = {
  formatDate(d) { if (!d) return '—'; try { const dt = d.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return '—'; } },
  formatDateTime(d) { if (!d) return '—'; try { const dt = d.toDate ? d.toDate() : new Date(d); return dt.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } },
  formatTimeAgo(d) {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
      if (diff < 60) return 'منذ لحظات';
      if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
      if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
      return `منذ ${Math.floor(diff / 86400)} يوم`;
    } catch { return '—'; }
  },
  percentage(p, t) { return t === 0 ? 0 : Math.round((p / t) * 100); },
  getStages() { return STAGES_DEFAULT; },
  getStudyBooks() { return STUDY_BOOKS; },
  getTrainingYears() { return Object.keys(TRAINING_BOOKS); },
  getBooksForTrainingYear(year) { return TRAINING_BOOKS[year] || STUDY_BOOKS; },
  getTrainingYear(student) { return student?.trainingYear || student?.academicYear || student?.stage || ''; },
  getTrainingTrackLabel(student) {
    const year = student?.trainingYear || student?.academicYear || student?.stage || '';
    const book = student?.studyBook || student?.class || '';
    return year && book ? `${year} - ${book}` : (book || year || '—');
  },
  isTrainingGraduate(student) {
    if (!student) return false;
    const completed = Array.isArray(student.completedBooks) ? student.completedBooks : [];
    return student.status === 'خريج' || STUDY_BOOKS.every(book => completed.includes(book));
  },
  getStudentStatuses() { return STUDENT_STATUSES; },
  getStudentStatusMeta(status) {
    const value = status || 'نشط';
    const meta = {
      'نشط': ['🟢', 'نشط', '#2e7d32'],
      'ناجح': ['✅', 'ناجح', '#1976d2'],
      'راسب': ['🔴', 'راسب', '#c62828'],
      'مؤجل': ['🟡', 'مؤجل', '#f57c00'],
      'منقطع': ['⚫', 'منقطع', '#616161'],
      'عائد': ['🔄', 'عائد', '#6a1b9a'],
      'مستكمل': ['📘', 'مستكمل', '#00838f'],
      'خريج': ['🎓', 'خريج', '#795548'],
      'مستمع': ['👂', 'مستمع', '#455a64']
    };
    return meta[value] || meta['نشط'];
  },
  studentStatusBadge(status) {
    const [icon, label, color] = this.getStudentStatusMeta(status);
    return `<span class="badge" style="background:${color}18;color:${color};border:1px solid ${color}55;font-weight:700">${icon} ${label}</span>`;
  },
  getBatchYears(from = 2017) {
    const current = new Date().getFullYear() + 1;
    return Array.from({ length: current - from + 1 }, (_, i) => from + i).reverse();
  },
  getClassGroups() { return TRAINING_YEARS_DEFAULT; },
  getClassLetters() { return CLASS_LETTERS; },
  getSubjects() {
    const selectedBook = State.studyBookFilter;
    if (selectedBook && selectedBook !== 'all' && STUDY_BOOKS.includes(selectedBook)) {
      return AppData.subjects.filter(subject => subject.books?.includes(selectedBook));
    }
    return AppData.subjects;
  },
  getSubjectsForBook(book) { return AppData.subjects.filter(subject => !book || subject.books?.includes(book)); },
  getCompetitionSubjects(book) { return this.getSubjectsForBook(book).filter(subject => subject.competition !== false); },
  getSubjectLabel(v) { if (!v) return '—'; const s = AppData.subjects.find(x => x.value === v); return s ? `${s.icon} ${s.label}` : '—'; },
  getDeaconRanks(g) { const b = ['أبصالطس', 'أغنسطس', 'لم يتم الرسامة']; if (g === 'أنثى') return [...b, 'غير مطلوب']; return b; },
  getNoteCategories() { return [
    { value: 'general', label: '📝 ملاحظة عامة' }, { value: 'behavior', label: '🎭 سلوك' },
    { value: 'academic', label: '📚 أكاديمي' }, { value: 'family', label: '👨‍👩‍👧 أسري' },
    { value: 'health', label: '🏥 صحي' }, { value: 'spiritual', label: '🙏 روحي' },
    { value: 'urgent', label: '🚨 عاجل' }
  ]; },
  getCategoryLabel(v) { const f = this.getNoteCategories().find(c => c.value === v); return f ? f.label : '📝 عام'; },
  getServantAdminRolesList() { return [
    { value: 'class_supervisor', label: '👨‍🏫 مسؤول فصل', description: 'يسجل غياب فصله + يرى الدرجات + يسجل النوتة الروحية', color: '#1976d2' },
    { value: 'subject_teacher', label: '📚 مسؤول مادة', description: 'يرى ويعدل درجات مادته فقط', color: '#7b1fa2' },
    { value: 'main_control', label: '🎛️ كنترول أساسي', description: 'يرى كل البيانات + يعدل الغياب والدرجات', color: '#c62828' },
    { value: 'admin_control', label: '⚙️ خادم إداري كنترول', description: 'يختار الفصول المسؤولة + يضيف دارسين', color: '#e65100' },
    { value: 'service_manager', label: '👨‍💼 مسؤول الخدمة', description: 'كل الصلاحيات', color: '#2e7d32' },
    { value: 'father_priest', label: '⛪ الأب الكاهن', description: 'كل الصلاحيات', color: '#6B0F1A' },
    { value: 'assistant', label: '🤝 خادم مساعد', description: 'صلاحيات محدودة', color: '#9e9e9e' },
    { value: 'monitor', label: '👁️ مراقب', description: 'عرض فقط ضمن نطاق البيانات المحدد', color: '#546e7a' },
    { value: 'student', label: '🎓 طالب', description: 'ملفه وبياناته الأكاديمية فقط', color: '#00897b' }
  ]; },
  getServantAdminRoles(s) { if (!s || !s.adminRole) return []; return Array.isArray(s.adminRole) ? s.adminRole : [s.adminRole]; },
  getServantSubjects(s) { if (!s || !s.subjectSpecialty) return []; return Array.isArray(s.subjectSpecialty) ? s.subjectSpecialty : [s.subjectSpecialty]; },
  getServantClassGroups(s) { if (!s || !s.classGroup) return []; if (Array.isArray(s.classGroup)) return s.classGroup; if (s.classGroup === 'الكل') return Helpers.getTrainingYears(); return [s.classGroup]; },
  getServantAdminRoleLabel(v) { const f = this.getServantAdminRolesList().find(r => r.value === v); return f ? f.label : '—'; },
  hasAdminRole(s, role) { return this.getServantAdminRoles(s).includes(role); },
  isMainControl(s) { return this.hasAdminRole(s, 'main_control'); },
  isAdminControl(s) { return this.hasAdminRole(s, 'admin_control'); },
  isServiceManager(s) { return this.hasAdminRole(s, 'service_manager'); },
  isFatherPriest(s) { return this.hasAdminRole(s, 'father_priest'); },
  isClassSupervisor(s) { return this.hasAdminRole(s, 'class_supervisor'); },
  isSubjectTeacherRole(s) { return this.hasAdminRole(s, 'subject_teacher'); },
  isSubjectTeacher(s) { return this.getServantSubjects(s).length > 0; },
  isSuperAdmin(s) { return this.isServiceManager(s) || this.isFatherPriest(s); },
  canEditAttendance(s) { return this.isMainControl(s) || this.isAdminControl(s) || this.isClassSupervisor(s) || this.isSuperAdmin(s); },
  canEditGrades(s, sub = null) {
    if (this.isMainControl(s) || this.isAdminControl(s) || this.isSuperAdmin(s)) return true;
    if (sub && (this.isSubjectTeacherRole(s) || this.isClassSupervisor(s))) return this.getServantSubjects(s).includes(sub);
    return false;
  },
  canViewAllGrades(s) { return this.isMainControl(s) || this.isAdminControl(s) || this.isClassSupervisor(s) || this.isSuperAdmin(s); },
  canEditStudents(s) { return this.isMainControl(s) || this.isAdminControl(s) || this.isSuperAdmin(s); },
  canDeleteStudents(s) { return this.isSuperAdmin(s); },
  canViewAllData(s) { return this.isMainControl(s) || this.isAdminControl(s) || this.isSuperAdmin(s); },
  canAddVisitationNotes(s) { return this.isClassSupervisor(s) || this.isAdminControl(s) || this.isSuperAdmin(s); },
  canApproveSpiritualNotes(s) { return this.isMainControl(s) || this.isAdminControl(s) || this.isSuperAdmin(s); },
  canPrintReports(s) { return this.isClassSupervisor(s) || this.isMainControl(s) || this.isAdminControl(s) || this.isSuperAdmin(s); },
  canManageSystem(s) { return this.isSuperAdmin(s); },
  getPermissionMatrix(s) { return s?.permissions && typeof s.permissions === 'object' ? s.permissions : {}; },
  canAccess(s, resource, action) {
    if (this.isSuperAdmin(s)) return true;
    return this.getPermissionMatrix(s)?.[resource]?.[action] === true;
  },
  getAccessScope(s) { return s?.accessScope && typeof s.accessScope === 'object' ? s.accessScope : { classes: this.getServantClassGroups(s), subjects: this.getServantSubjects(s) }; },
  
  getWeekWithDate(w) {
    const s = AppData.settings;
    if (!s || !s.termStart) return { week: w, date: '—', dateShort: '—' };
    const start = new Date(s.termStart);
    const d = new Date(start); d.setDate(start.getDate() + (w - 1) * 7);
    return {
      week: w,
      date: d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      dateShort: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
    };
  },
  getWeekDate(w) { return this.getWeekWithDate(w).date; },
  getWeekDateShort(w) { return this.getWeekWithDate(w).dateShort; },
  getStudentAdder(s) { if (!s) return '—'; return s.addedByName || 'غير محدد'; },
  
  escapeHtml(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
};

function showLoading(t = 'جارٍ التحميل...') { document.getElementById('loadingText').textContent = t; document.getElementById('loadingOverlay').classList.add('show'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }
function showToast(m, t = 'success') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${t}`; el.textContent = m;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2800);
}
function showModal(html, size = '') {
  const c = document.getElementById('modalContent');
  c.className = `modal ${size}`; c.innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
function toggleSidebar() { State.sidebarOpen = !State.sidebarOpen; document.getElementById('sidebar').classList.toggle('open', State.sidebarOpen); }

function renderClassFilterChips() {
  return `
    <div class="class-filter-chips">
      <button class="class-chip ${State.studyBookFilter === 'all' ? 'active' : ''}" onclick="State.setStudentFilter('studyBookFilter','all')">
        📚 كل الكتب <span class="count">${AppData.students.filter(s => s.status !== 'خريج').length}</span>
      </button>
      ${Helpers.getStudyBooks().map(book => {
        const count = AppData.students.filter(s => s.status !== 'خريج' && (s.studyBook || s.class) === book).length;
        return `<button class="class-chip ${State.studyBookFilter === book ? 'active' : ''}" onclick="State.setStudentFilter('studyBookFilter','${book}')">
          ${book} <span class="count">${count}</span>
        </button>`;
      }).join('')}
      <select class="filter-select" onchange="State.setStudentFilter('batchFilter', this.value)">
        <option value="all">جميع الدفعات</option>
        ${Helpers.getBatchYears().map(year => `<option value="${year}" ${State.batchFilter === String(year) ? 'selected' : ''}>دفعة ${year}</option>`).join('')}
      </select>
    </div>
  `;
}

function filterStudentsByClass(students) {
  return students.filter(s => {
    const active = s.status !== 'خريج';
    const book = s.studyBook || s.class || '';
    const batch = String(s.batchYear || s.classGroup || '');
    return active
      && (State.studyBookFilter === 'all' || book === State.studyBookFilter)
      && (State.batchFilter === 'all' || batch === State.batchFilter);
  });
}

function filterStudentsByServantClasses(students, servant) { return students; }

/* ============================================================
   RENDER
   ============================================================ */
function renderHome() {
  return `
    <section class="hero public-hero">
      <div class="public-cross">☩</div>
      <h1><span>نظام خدمة إعداد الخدام</span></h1>
      <h2>كنيسة السيدة العذراء ومار يوحنا الحبيب - فيصل</h2>
      <p>نظام متكامل لإدارة الدراسة والخدمة والنمو الروحي والسجل الأكاديمي للدارسين.</p>
      <button class="btn btn-primary btn-lg" onclick="State.setPage('login')"><span>🔐</span> تسجيل الدخول </button>
    </section>
    <section class="public-section">
      <h2 class="section-title">الرؤية والرسالة والهدف</h2>
      <div class="grid-3">
        <article class="vision-card"><span class="icon">👁️</span><h3>رؤية اجتماع إعداد الخدام</h3><p>اجتماع إعداد الخدام كيان متكامل في فكره، شامل في موضوعاته، شيق في أساليبه، متطور ومتجدد. فعال في إدارته، كفء في نظامه، يجذب الجميع ويحتوي الكل، حي بالمشاركة، مفيد للخدام ومثمر للخدمة.</p></article>
        <article class="vision-card"><span class="icon">🌟</span><h3>رؤية لخريجي إعداد الخدام</h3><p>خادم أرثوذكسي صحيح العقيدة والفكر، متأصل كنسياً، عميق روحياً، مفكر ومبدع، معاصر لزمنه وواعٍ لمتطلبات عصره، سوي نفسياً، ناجح اجتماعياً، منتمٍ لكنيسته القبطية، فخور بوطنه والخدمة أساس في حياته.</p></article>
        <article class="vision-card"><span class="icon">📜</span><h3>رسالة إعداد الخدام</h3><p>غايتنا بناء أجيال من الخدام المتخصصين في مجالات مختلفة لتثري الخدمة وتغطي احتياجات جميع مراحلها وأنشطتها، ونعمل على تأسيس الخادم روحياً وعقلياً وتنموياً عن طريق اكتشاف وتدريب وتنمية مهاراته وقدراته وإعداده لحقل الخدمة من خلال التعليم بالمعايشة والتلمذة والتكوين.</p></article>
      </div>
    </section>

    <section class="public-section grid-2 public-info-grid">
      <article class="public-card"><h2>🎯 الفئة المستهدفة ومواعيد القبول</h2><div class="gold-line"></div><p><strong>الفئة المستهدفة:</strong> يفضل أن يبدأ إعداد الخدام في سن مبكر، وخصوصاً خلال المرحلة الثانوية، حتى يتسنى للخادم أن يخدم في ريعان شبابه.</p><p><strong>استقبال الدفعات الجديدة:</strong> يتم استقبال الدفعات الجديدة في صيف الصف الأول الثانوي، بعد أن يكون المخدوم قد أمضى فترة كافية واندَمَج في مرحلة ثانوي.</p></article>
      <article class="public-card"><h2>📚 نظام الدراسة</h2><div class="gold-line"></div><p>مدة الدراسة الإجمالية <strong>سنتان</strong> مقسمة إلى <strong>4 ترمات</strong>، وكل ترم يدرس كتاباً كاملاً يشمل مجموعة من المواد الدراسية.</p><div class="study-books-row"><div class="study-year-box"><strong>السنة الأولى :</strong><br><strong>الترم الأول</strong> : الكتاب الأول أو الكتاب الثالث<br><strong>الترم الثاني</strong>   : الكتاب الثاني أو الكتاب الرابع</div><div class="study-year-box"><strong>السنة الثانية :</strong><br><strong>الترم الأول</strong> : الكتاب الأول أو الكتاب الثالث<br><strong>الترم الثاني</strong> : الكتاب الثاني أو الكتاب الرابع</div></div></article>   
    </section>

    <section class="public-section">
      <h2 class="section-title">مواعيد الخدمة والهيكل الأسبوعي</h2>
      <div class="schedule-banner"><strong>كل يوم سبت</strong><span>من الساعة 6:00 مساءً حتى 9:00 مساءً</span></div>
      <div class="timeline-grid">
        <div class="timeline-item"><b>6:00 - 6:30</b><h3>صلاة رفع بخور عشية</h3><p>فترة صلاة جماعية لبدء الاجتماع الروحي، ولا يحسب فيها غياب للدارسين.</p></div>
        <div class="timeline-item"><b>6:30 - 7:00</b><h3>الفقرة الافتتاحية والتعليمية</h3><p>الترانيم والأيبصالية، آية وحكاية، سؤال دفاعي أو تسميع المزامير. التأخير يحسب ربع محاضرة غياب.</p></div>
        <div class="timeline-item"><b>7:00 - 7:45</b><h3>المحاضرة الأولى</h3><p>شرح المادة الأولى المقررة في المنهج الأسبوعي.</p></div>
        <div class="timeline-item"><b>7:45 - 8:00</b><h3>استراحة وتنظيم</h3><p>فترة انتقالية قصيرة بين المحاضرتين.</p></div>
        <div class="timeline-item"><b>8:00 - 8:45</b><h3>المحاضرة الثانية</h3><p>شرح المادة الثانية المقررة في المنهج الأسبوعي.</p></div>
        <div class="timeline-item"><b>8:45 - 9:00</b><h3>الختام والصلاة</h3><p>مراجعة الأسئلة، المسابقات، تسليم النوتة الروحية والختام بالصلاة.</p></div>
      </div>
    </section>

    <section class="public-section public-news">
      <div class="flex-between"><h2 class="section-title">📰 أخبارنا وإعلاناتنا</h2><span class="badge badge-info">آخر التحديثات</span></div>
      <div class="grid-3">
        <article class="news-card"><span>📣</span><h3>فتح باب التقدم</h3><p>تعلن الخدمة عن مواعيد استقبال الدفعة الجديدة في صيف الصف الأول الثانوي، وفقاً للجدول المعتمد.</p></article>
        <article class="news-card"><span>🎓</span><h3>الامتحانات والنتائج</h3><p>تابعوا إعلانات مواعيد الامتحانات المركزية واعتماد نتائج الدارسين من خلال النظام.</p></article>
        <article class="news-card"><span>🙏</span><h3>الأنشطة والأيام الروحية</h3><p>سيتم نشر مواعيد الرحلات والأيام الروحية وأخبار خريجي إعداد الخدام فور اعتمادها.</p></article>
      </div>
    </section>
  `;
}
function renderLogin() {
  return `
    <div class="login-box">
      <h2>☩ تسجيل الدخول</h2>
      <p class="sub">أدخل بياناتك للوصول إلى لوحة التحكم</p>
      <div class="login-tabs" id="loginTabs">
        <button data-role="student" class="active">دارس</button>
        <button data-role="servant">خادم</button>
        <button data-role="admin">مسؤول</button>
      </div>
      <div id="loginFormContainer">${renderStudentLoginForm()}</div>
      <div class="error-msg" id="loginError" style="display:none;"></div>
    </div>
  `;
}
function renderStudentLoginForm() {
  return `<form class="login-form" onsubmit="handleLogin('student'); return false;">
  <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="studentEmail" autocomplete="email" placeholder="name@example.com"></div>
  <div class="form-group"><label>كلمة المرور</label><input type="password" id="studentPassword" autocomplete="current-password" placeholder="أدخل كلمة المرور"></div>
  <button type="submit" class="btn btn-primary btn-block">دخول</button>
  </form>`;
}
function renderServantLoginForm() {
  return `<form class="login-form" onsubmit="handleLogin('servant'); return false;">
  <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="servantEmail" autocomplete="email" placeholder="name@example.com"></div>
  <div class="form-group"><label>كلمة المرور</label><input type="password" id="servantPassword" autocomplete="current-password" placeholder="أدخل كلمة المرور"></div>
  <button type="submit" class="btn btn-primary btn-block">دخول</button>
  </form>`;
}
function renderAdminLoginForm() {
  return `<form class="login-form" onsubmit="handleLogin('admin'); return false;">
  <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="adminUsername" autocomplete="username" placeholder="name@example.com"></div>
  <div class="form-group"><label>كلمة المرور</label><input type="password" id="adminPassword" autocomplete="current-password" placeholder="كلمة المرور"></div>
  <button type="submit" class="btn btn-primary btn-block">دخول</button>
  </form>`;
}

/* ============ Student Dashboard ============ */
function renderStudentDashboard() {
  const u = State.currentUser;
  if (!u || u.type !== 'student') return '';
  const s = u.data;
  const t = State.getTab() || 'profile';
  return `
    <div class="dashboard-header">
      <h2>👨‍🎓 مرحباً، ${s.name}</h2>
      <div class="info"><span>🆔 ${s.id}</span><span>📚 ${s.trainingYear || s.academicYear || '—'} - ${s.studyBook || s.class || '—'}</span><span>🏫 ${s.schoolYear || s.stage || '—'}</span><span>📅 دفعة ${s.batchYear || s.classGroup || '—'}</span></div>
    </div>
    <div class="tabs" id="studentTabs">
      <button data-tab="profile" class="${t === 'profile' ? 'active' : ''}">👤 الملف</button>
      <button data-tab="grades" class="${t === 'grades' ? 'active' : ''}">📊 الدرجات</button>
      <button data-tab="attendance" class="${t === 'attendance' ? 'active' : ''}">📋 الحضور</button>
      <button data-tab="spiritualNote" class="${t === 'spiritualNote' ? 'active' : ''}">📔 النوتة الروحية</button>
      <button data-tab="termPerformance" class="${t === 'termPerformance' ? 'active' : ''}">📊 أداء الطالب في الترم</button>
      <button data-tab="academicRecord" class="${t === 'academicRecord' ? 'active' : ''}">🎓 السجل الأكاديمي</button>
    </div>
    <div class="tab-content">${renderStudentTab(t, s)}</div>
  `;
}
function renderStudentTab(t, s) {
  switch (t) {
    case 'profile': return renderStudentProfile(s);
    case 'grades': return renderStudentGradesFull(s);
    case 'termPerformance': return renderTermPerformance(s);
    case 'attendance': return renderStudentAttendance(s);
    case 'spiritualNote': return renderStudentSpiritualNote(s);
    case 'academicRecord': return renderStudentAcademicRecord(s);
    default: return renderStudentProfile(s);
  }

  function renderStudentSpiritualNote(s) {
    const month = State.activeTab['student_note_month'] || new Date().toISOString().slice(0, 7);
    const notes = AppData.visitationNotes.filter(n =>
      n.type === 'spiritualDaily' &&
      String(n.studentId) === String(s.id) &&
      String(n.noteDate || '').startsWith(month)
    ).sort((a, b) => String(b.noteDate).localeCompare(String(a.noteDate)));
    const labels = { gospel: 'الإنجيل', morningPrayer: 'باكر', eveningPrayer: 'الغروب', nightPrayer: 'النوم', communion: 'التناول', confession: 'الاعتراف' };
    return `
      <div class="card">
        <div class="flex-between mb-2"><div class="card-title">📔 النوتة الروحية</div><button class="btn btn-gold btn-sm" onclick="openStudentSpiritualNoteModal('${s.id}')">+ تسجيل اليوم</button></div>
        <div class="gold-line"></div>
        <div class="form-group" style="max-width:220px"><label>الشهر</label><input type="month" value="${month}" onchange="State.activeTab['student_note_month']=this.value;renderApp()"></div>
        <div class="table-wrap">
          <table><thead><tr><th>التاريخ</th>${Object.values(labels).map(v => `<th>${v}</th>`).join('')}<th>الحالة</th></tr></thead>
          <tbody>${notes.length ? notes.map(n => `<tr><td>${Helpers.escapeHtml(n.noteDate)}</td>${Object.keys(labels).map(k => `<td>${n.items?.[k] ? '✅' : '—'}</td>`).join('')}<td><span class="badge ${n.reviewStatus === 'approved' ? 'badge-success' : 'badge-info'}">${n.reviewStatus === 'approved' ? 'معتمدة' : 'بانتظار الاعتماد'}</span></td></tr>`).join('') : `<tr><td colspan="8"><div class="empty-state">لا توجد نوتة مسجلة لهذا الشهر</div></td></tr>`}</tbody></table>
        </div>
      </div>
    `;
  }
}
function renderStudentAcademicRecord(s) {
  const attendance = AttendanceEngine.calculate(AppData.attendance, s.id);
  const attendanceTerm = AttendanceEngine.termSummary(AppData.attendance, s.id);
  const registrations = Array.isArray(s.academicRegistrations) && s.academicRegistrations.length ? s.academicRegistrations : [{
    id: `legacy-registration-${s.id}`, type: 'registration', studentId: s.id,
    trainingYear: s.trainingYear || s.academicYear || s.stage, studyBook: s.studyBook || s.class,
    batchYear: s.batchYear || s.classGroup, status: s.status || 'نشط', createdAt: s.enrollmentDate || s.createdAt
  }];
  const attempts = [...(Array.isArray(s.bookAttempts) ? s.bookAttempts : []), ...(Array.isArray(s.academicAttempts) ? s.academicAttempts : [])];
  const history = Array.isArray(s.academicRecords) ? s.academicRecords : [];
  const exams = AppData.exams.filter(exam => String(exam.studentId) === String(s.id));
  const statusLabel = { enrollment: 'التحاق', graduation: 'تخرج', 'academic-update': 'تحديث أكاديمي', 'book-attempt': 'محاولة كتاب' };
  const eventRows = [...history, ...registrations.map(row => ({ ...row, type: 'enrollment' })), ...attempts.map(row => ({ ...row, type: 'book-attempt' }))]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return `<div class="card">
    <div class="card-title">🎓 السجل الأكاديمي الكامل</div><div class="gold-line"></div>
    ${attendanceTermSummaryHtml(attendanceTerm)}
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${attendance.held}</div><div class="lbl">محاضرات منعقدة</div></div>
      <div class="stat-card"><div class="num">${attendance.present}</div><div class="lbl">حضور فعلي</div></div>
      <div class="stat-card"><div class="num">${attendance.absent}</div><div class="lbl">غياب</div></div>
      <div class="stat-card"><div class="num">${attendance.percentage}%</div><div class="lbl">نسبة الحضور</div></div>
    </div>
    <div class="info-msg">التأخير: ${attendance.late} • الغياب الجزئي: ${attendance.partial} • الغياب بعذر: ${attendance.excused} • الغياب المتقطع: ${attendance.interruptedAbsences} • الغياب المتتالي: ${attendance.consecutive} • المتبقي قبل حد الغياب المتقطع: ${attendance.remainingInterrupted}</div>
    <div class="flex-between mb-2"><strong>الأهلية لدخول الامتحان</strong><span class="badge ${attendance.eligible === 'مؤهل' ? 'badge-success' : 'badge-danger'}">${attendance.eligible}</span></div>
    ${attendance.warning ? `<div class="info-msg" style="border-right-color:var(--danger)">⚠️ ${attendance.warning}</div>` : ''}
    <h4>التسجيلات ومحاولات الكتب</h4>
    <div class="table-wrap"><table><thead><tr><th>النوع</th><th>السنة</th><th>الكتاب</th><th>الدفعة</th><th>الحالة</th><th>المعرف</th></tr></thead><tbody>
      ${eventRows.length ? eventRows.map(row => `<tr><td>${statusLabel[row.type] || row.label || 'سجل'}</td><td>${Helpers.escapeHtml(row.trainingYear || row.academicYear || '—')}</td><td>${Helpers.escapeHtml(row.studyBook || row.book || '—')}</td><td>${Helpers.escapeHtml(row.batchYear || row.originalBatchYear || '—')}</td><td>${Helpers.escapeHtml(row.status || '—')}</td><td><code>${Helpers.escapeHtml(row.id || row.key || '—')}</code></td></tr>`).join('') : '<tr><td colspan="6">لا توجد تسجيلات تاريخية</td></tr>'}
    </tbody></table></div>
    <h4>الامتحانات والنتائج المعتمدة</h4>
    <div class="table-wrap"><table><thead><tr><th>الكتاب/المادة</th><th>الدرجة</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
      ${exams.length ? exams.map(exam => `<tr><td>${Helpers.escapeHtml(exam.studyBook || exam.book || Helpers.getSubjectLabel(exam.subject) || '—')}</td><td>${Helpers.escapeHtml(exam.score ?? '—')} / 100</td><td>${Helpers.escapeHtml(exam.status || exam.result || 'مسجل')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(exam.date || exam.examDate || exam.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="4">لا توجد نتائج امتحانات معتمدة</td></tr>'}
    </tbody></table></div>
  </div>`;
}
function renderStudentProfile(s) {
  const courseworkRecords = AppData.evaluations.filter(record =>
    String(record.studentId) === String(s.id) &&
    (record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction)
  );
  const courseworkTotal = CourseworkEngine.total(AppData.evaluations, s.id);
  const exams = AppData.exams.filter(record =>
    String(record.studentId) === String(s.id)
  );
  const attendance = AppData.attendance.filter(record =>
    String(record.studentId) === String(s.id) && record.type !== 'visitation'
  );
  const attendanceTerm = AttendanceEngine.termSummary(attendance, s.id, AppData.settings.totalWeeks || 15);
  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="icon">📝</div><div class="num">${courseworkTotal.total} / 120</div><div class="lbl">إجمالي أعمال السنة</div></div>
      <div class="stat-card"><div class="icon">📋</div><div class="num">${attendanceTerm.attendedPercent}%</div><div class="lbl">نسبة الحضور من إجمالي الترم</div></div>
      <div class="stat-card"><div class="icon">🎓</div><div class="num">${exams.length}</div><div class="lbl">امتحانات مسجلة</div></div>
      <div class="stat-card"><div class="icon">🔄</div><div class="num">${courseworkRecords.length}</div><div class="lbl">آخر التقييمات المسجلة</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title">👤 البيانات الشخصية</div><div class="gold-line"></div>
        <table style="min-width:auto;box-shadow:none;">
          <tr><td><strong>الاسم:</strong></td><td>${s.name}</td></tr>
          <tr><td><strong>الكود:</strong></td><td><code class="code-badge">${s.id}</code></td></tr>
          <tr><td><strong>النوع:</strong></td><td>${s.gender || '—'}</td></tr>
          <tr><td><strong>الميلاد:</strong></td><td>${Helpers.formatDate(s.birthdate)}</td></tr>
        </table>
      </div>
      <div class="card"><div class="card-title">📚 البيانات الدراسية</div><div class="gold-line"></div>
        <table style="min-width:auto;box-shadow:none;">
          <tr><td><strong>السنة الدراسية:</strong></td><td>${s.schoolYear || s.stage || '—'}</td></tr>
          <tr><td><strong>إعداد الخدام:</strong></td><td>${s.trainingYear || s.academicYear || '—'}</td></tr>
          <tr><td><strong>الكتاب:</strong></td><td>${s.studyBook || s.class || '—'}</td></tr>
          <tr><td><strong>الدفعة:</strong></td><td>${s.batchYear || s.classGroup || '—'}</td></tr>
          <tr><td><strong>الرتبة:</strong></td><td>${s.deaconRank || '—'}</td></tr>
        </table>
      </div>
    </div>
    <div class="card mt-2">
      <div class="flex-between"><div class="card-title">📌 آخر تقييماتي</div><button class="btn btn-outline btn-sm" onclick="State.setTab('grades');renderApp()">عرض جميع الدرجات</button></div>
      <div class="gold-line"></div>
      ${courseworkRecords.length ? `
        <div class="table-wrap"><table><thead><tr><th>التقييم</th><th>الدرجة</th><th>من</th><th>ملاحظات المسؤول</th><th>آخر تحديث</th></tr></thead><tbody>
          ${courseworkRecords.slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))).slice(0, 6).map(record => {
            const core = CourseworkEngine.types().find(item => item.key === record.courseworkType);
            const bonus = CourseworkEngine.bonusItems().find(item => item.key === record.courseworkType);
            const label = record.isDeduction ? 'خصم من البونص' : (bonus?.label || core?.label || record.componentLabel || record.courseworkType || 'تقييم أعمال السنة');
            return `<tr><td>${Helpers.escapeHtml(label)}</td><td><strong>${Helpers.escapeHtml(record.score ?? '—')}</strong></td><td>${Helpers.escapeHtml(record.maxScore ?? 20)}</td><td>${Helpers.escapeHtml(record.note || '—')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(record.updatedAt || record.createdAt))}</td></tr>`;
          }).join('')}
        </tbody></table></div>
      ` : '<div class="empty-state">سيظهر هنا كل تقييم جديد فور اعتماده وتسجيله من المسؤول</div>'}
    </div>
  `;
}

const TERM_PERFORMANCE_TABS = [
  { key: 'attendance', label: 'الحضور والغياب', icon: '📅' },
  { key: 'spiritual', label: 'النوتة الروحية', icon: '🕊️' },
  { key: 'coursework', label: 'أعمال السنة', icon: '📝' },
  { key: 'exams', label: 'درجات الامتحانات', icon: '📚' },
  { key: 'final', label: 'النتيجة النهائية', icon: '🏆' }
];

function getTermSpiritualSummary(records, totalMonths = 6) {
  const keys = { gospel: 'الكتاب المقدس', morningPrayer: 'صلاة باكر', eveningPrayer: 'صلاة غروب', nightPrayer: 'صلاة النوم', communion: 'التناول', confession: 'الاعتراف' };
  const months = [...new Set(records.map(record => String(record.noteDate || '').slice(0, 7)).filter(Boolean))].sort();
  const stats = Object.entries(keys).map(([key, label]) => {
    const counts = months.map(month => records.filter(record => String(record.noteDate).startsWith(month) && record.items?.[key]).length);
    const required = key === 'communion' ? 2 : key === 'confession' ? 1 : 21;
    const passedMonths = counts.filter(count => count >= required).length;
    return { key, label, required, counts, total: counts.reduce((sum, count) => sum + count, 0), passedMonths };
  });
  const monthsSubmitted = months.length;
  const complete = monthsSubmitted >= totalMonths && stats.every(stat => stat.passedMonths >= totalMonths);
  const average = stats.length ? Math.round(stats.reduce((sum, stat) => sum + Math.min(100, stat.passedMonths / Math.max(1, totalMonths) * 100), 0) / stats.length * 10) / 10 : 0;
  return { months, monthsSubmitted, totalMonths, stats, complete, average };
}

function getTermResultSummary(student) {
  const totalWeeks = AppData.settings.totalWeeks || 15;
  const attendance = AttendanceEngine.termSummary(AppData.attendance, student.id, totalWeeks);
  const notes = AppData.visitationNotes.filter(record => String(record.studentId) === String(student.id) && record.type === 'spiritualDaily');
  const spiritual = getTermSpiritualSummary(notes);
  const courseworkRecords = AppData.evaluations.filter(record => String(record.studentId) === String(student.id) && (record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction));
  const coursework = CourseworkEngine.total(courseworkRecords, student.id);
  const courseworkMax = Math.max(1, CourseworkEngine.types().filter(item => item.active).reduce((sum, item) => sum + item.max, 0) + CourseworkEngine.bonusItems().filter(item => item.active).reduce((sum, item) => sum + item.max, 0));
  const courseworkPercent = Math.min(100, Math.round(coursework.total / courseworkMax * 1000) / 10);
  const subjects = Helpers.getSubjects().filter(subject => subject.countInTotal !== false);
  const exams = subjects.map(subject => AppData.exams.find(record => String(record.studentId) === String(student.id) && record.subject === subject.value)).filter(Boolean);
  const examPercent = subjects.length ? Math.round(exams.reduce((sum, exam) => sum + Math.min(100, Number(exam.score || 0) / Math.max(1, Number(exam.maxScore || 100)) * 100), 0) / subjects.length * 10) / 10 : 0;
  const complete = attendance.recordedWeeks >= totalWeeks && spiritual.complete && courseworkPercent >= 55 && exams.length >= subjects.length;
  const finalPercent = Math.round((attendance.attendedPercent + spiritual.average + courseworkPercent + examPercent) / 4 * 10) / 10;
  return { attendance, spiritual, coursework, courseworkPercent, exams, subjects, examPercent, finalPercent, complete };
}

function renderTermPerformance(s) {
  const stateKey = `termPerformance_${s.id}`;
  const active = State.activeTab[stateKey] || 'attendance';
  const isStudentAccount = State.currentUser?.type === 'student';
  const openSubTab = key => isStudentAccount ? `State.activeTab['${stateKey}']='${key}';renderApp()` : `State.activeTab['${stateKey}']='${key}';openStudentFile('${s.id}','performance')`;
  const result = getTermResultSummary(s);
  const attendance = result.attendance;
  let content = '';
  if (active === 'attendance') {
    content = `${attendanceTermSummaryHtml(attendance)}<div class="info-msg">التحويل للمستمعين عند 7 غيابات متقطعة أو 4 غيابات متتالية. دخول الامتحان يتطلب 65% حضور على الأقل.</div>`;
  } else if (active === 'spiritual') {
    content = `<div class="card"><div class="card-title">🕊️ النوتة الروحية خلال الترم</div><div class="gold-line"></div><div class="info-msg">المطلوب: 21 يومًا شهريًا للصلوات والكتاب المقدس، وتناول مرتين واعتراف مرة شهريًا. عدم تقديم 3 أشهر يحرم من الامتحان.</div><div class="stats-grid">${result.spiritual.stats.map(stat => `<div class="stat-card"><div class="num">${stat.passedMonths}/${result.spiritual.totalMonths}</div><div class="lbl">${stat.label}<br><small>المطلوب ${stat.required} شهريًا</small></div></div>`).join('')}</div><span class="badge ${result.spiritual.complete ? 'badge-success' : 'badge-danger'}">${result.spiritual.complete ? 'النوتة مستوفاة' : 'النوتة غير مكتملة'}</span></div>`;
  } else if (active === 'coursework') {
    const records = AppData.evaluations.filter(record => String(record.studentId) === String(s.id) && (record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction));
    content = `<div class="card"><div class="card-title">📝 أعمال السنة</div><div class="gold-line"></div><div class="print-meta"><span>الأساس: ${result.coursework.core} / 100</span><span>البونص: ${result.coursework.bonus} / 20</span><span>الخصم: ${result.coursework.deductions}</span><span>النسبة: ${result.courseworkPercent}%</span></div>${renderCourseworkBreakdown(records, stateKey, AppData.settings.totalWeeks || 15, key => { State.activeTab[stateKey] = key; if (isStudentAccount) renderApp(); else openStudentFile(s.id, 'performance'); })}</div>`;
  } else if (active === 'exams') {
    content = `<div class="card"><div class="card-title">📚 درجات الامتحانات</div><div class="gold-line"></div><div class="info-msg">كل مادة من 100 درجة، ومتوسط المواد المكتملة يمثل نسبة الامتحانات.</div><div class="table-wrap"><table><thead><tr><th>المادة</th><th>الدرجة</th><th>الحالة</th></tr></thead><tbody>${result.subjects.map(subject => { const exam = result.exams.find(item => item.subject === subject.value); return `<tr><td>${subject.icon} ${Helpers.escapeHtml(subject.label)}</td><td>${exam ? `${Helpers.escapeHtml(exam.score ?? '—')} / 100` : '—'}</td><td>${exam ? Helpers.escapeHtml(exam.status || 'مسجل') : 'غير مسجل'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  } else {
    const rankRows = AppData.students.map(student => ({ student, result: getTermResultSummary(student) })).filter(item => item.result.complete && item.student.batchYear === s.batchYear).sort((a, b) => b.result.finalPercent - a.result.finalPercent);
    const rank = rankRows.findIndex(item => String(item.student.id) === String(s.id)) + 1;
    content = `<div class="card"><div class="card-title">🏆 النتيجة النهائية</div><div class="gold-line"></div><div class="stats-grid"><div class="stat-card"><div class="num">${attendance.attendedPercent}%</div><div class="lbl">الحضور</div></div><div class="stat-card"><div class="num">${result.spiritual.average}%</div><div class="lbl">النوتة الروحية</div></div><div class="stat-card"><div class="num">${result.courseworkPercent}%</div><div class="lbl">أعمال السنة</div></div><div class="stat-card"><div class="num">${result.examPercent}%</div><div class="lbl">الامتحانات</div></div></div><div class="info-msg"><strong>الإجمالي: ${result.complete ? `${result.finalPercent}%` : 'تحت الحساب'}</strong> • التقدير: ${result.complete ? GRADING_SYSTEM.getGradeLetter(result.finalPercent).label : 'تحت الحساب'} • الترتيب على الدفعة: ${rank > 0 ? rank : 'تحت الحساب'}</div></div>`;
  }
  const buttons = TERM_PERFORMANCE_TABS.map(tab => `<button class="btn btn-sm ${active === tab.key ? 'btn-primary' : 'btn-outline'}" onclick="${openSubTab(tab.key)}">${tab.icon} ${tab.label}</button>`).join('');
  return `<div class="card"><div class="card-title">📊 أداء الطالب في الترم</div><div class="gold-line"></div><div class="tabs" style="overflow-x:auto">${buttons}</div></div>${content}`;
}

function renderTermPerformanceOverview(students) {
  const rows = students.map(student => {
    const result = getTermResultSummary(student);
    return `<tr><td>${Helpers.escapeHtml(student.name || '—')}</td><td>${result.attendance.attendedPercent}%</td><td>${result.spiritual.average}%</td><td>${result.courseworkPercent}%</td><td>${result.examPercent}%</td><td><strong>${result.complete ? `${result.finalPercent}%` : 'تحت الحساب'}</strong></td><td><button class="btn btn-outline btn-sm" onclick="openStudentFile('${student.id}','performance')">فتح الأداء</button></td></tr>`;
  }).join('');
  return `<div class="card"><div class="card-title">📊 أداء الطلاب في الترم</div><div class="gold-line"></div><div class="info-msg">يعرض هذا الجدول النسب التراكمية لكل طالب، ويمكن فتح التبويبات التفصيلية من خلال زر «فتح الأداء».</div><div class="table-wrap"><table><thead><tr><th>الدارس</th><th>الحضور</th><th>النوتة</th><th>أعمال السنة</th><th>الامتحانات</th><th>النتيجة النهائية</th><th>الإجراء</th></tr></thead><tbody>${rows || '<tr><td colspan="7">لا يوجد دارسون</td></tr>'}</tbody></table></div></div>`;
}
function renderStudentGradesFull(s) {
  const subjects = Helpers.getSubjects();
  const tw = AppData.settings.totalWeeks || 15;
  const te = AppData.settings.totalEvaluations || 10;
  const coursework = AppData.evaluations.filter(e =>
    String(e.studentId) === String(s.id) &&
    (e.subject === 'coursework' || e.courseworkType || e.isBonus || e.isDeduction)
  );
  const courseworkTotal = CourseworkEngine.total(AppData.evaluations, s.id);
  const studentExams = AppData.exams.filter(exam => String(exam.studentId) === String(s.id));
  return `
    <div class="card">
      <div class="flex-between"><div class="card-title">📊 درجاتي التفصيلية</div><span class="badge badge-success">● متابعة تلقائية للتحديثات الجديدة</span></div>
      <div class="gold-line"></div>
      <div class="card" style="border-right-color:#C9A227;">
        <div class="card-title">📚 أعمال السنة</div>
        <div class="gold-line"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="badge badge-info">أساس أعمال السنة: ${courseworkTotal.core} / 100</span>
          <span class="badge badge-warning">البونص: ${courseworkTotal.bonus} / 20</span>
          <span class="badge badge-danger">الخصم: ${courseworkTotal.deductions}</span>
          <span class="badge badge-success" style="font-size:1rem;">الإجمالي: ${courseworkTotal.total} / 120</span>
        </div>
        ${renderCourseworkBreakdown(coursework, 'studentCourseworkTab', tw, key => `State.activeTab['studentCourseworkTab']='${key}';renderApp()`)}
      </div>
          <div class="card">
            <div class="card-title">🎓 الامتحانات والنتائج</div>
            <div class="gold-line"></div>
            ${studentExams.length ? `
              <div class="table-wrap"><table><thead><tr><th>الكتاب / المادة</th><th>الدرجة</th><th>من</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>
                ${studentExams.slice().sort((a, b) => String(b.date || b.examDate || b.updatedAt || '').localeCompare(String(a.date || a.examDate || a.updatedAt || ''))).map(exam => `<tr><td>${Helpers.escapeHtml(exam.studyBook || exam.book || Helpers.getSubjectLabel(exam.subject) || 'امتحان')}</td><td><strong>${Helpers.escapeHtml(exam.score ?? exam.result ?? '—')}</strong></td><td>100</td><td>${Helpers.escapeHtml(exam.status || exam.grade || 'مسجل')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(exam.date || exam.examDate || exam.updatedAt))}</td></tr>`).join('')}
              </tbody></table></div>
            ` : '<div class="empty-state">لا توجد نتائج امتحانات مسجلة حتى الآن</div>'}
          </div>
      <div class="info-msg">أداء الطالب في أمتحانات الفاينال للكتاب الدراسي</div>
      ${subjects.map(sub => {
        const grade = GRADING_SYSTEM.calculateSubjectGrade(s.id, sub.value, tw, te);
        const letter = GRADING_SYSTEM.getGradeLetter(grade.total);
        return `
          <div class="card" style="border-right-color:${letter.color};">
            <div class="flex-between mb-2">
              <h3>${sub.icon} ${sub.label}</h3>
              <div>
                <span class="badge" style="background:${letter.color};color:white;font-size:1rem;padding:6px 14px;">${grade.total} / 100</span>
                <span class="badge" style="background:${letter.color};color:white;">${letter.label}</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span class="badge badge-info">📋 الحضور: ${grade.attendanceScore} / ${grade.weights.attendance}</span>
              <span class="badge badge-warning">📝 أعمال السنة: ${grade.evalScore} / ${grade.weights.evaluations}</span>
              <span class="badge badge-success">🎓 درجة الامتحان: ${grade.examRawScore} / 100 (وزنها في النتيجة ${grade.examScore} / ${grade.weights.exam})</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
function renderStudentAttendance(s) {
  const tw = AppData.settings.totalWeeks || 15;
  const att = AppData.attendance.filter(a => a.studentId === s.id && a.type !== 'visitation');
  const summary = AttendanceEngine.calculate(att, s.id);
  const attendanceTerm = AttendanceEngine.termSummary(att, s.id, tw);
  const present = summary.present;
  const pct = summary.percentage;
  return `
    ${attendanceTermSummaryHtml(attendanceTerm)}
    <div class="stats-grid">
      <div class="stat-card"><div class="icon">📅</div><div class="num">${summary.held}</div><div class="lbl">محاضرات منعقدة</div></div>
      <div class="stat-card"><div class="icon">✅</div><div class="num">${present}</div><div class="lbl">حضور</div></div>
      <div class="stat-card"><div class="icon">❌</div><div class="num">${summary.absent}</div><div class="lbl">غياب</div></div>
      <div class="stat-card"><div class="icon">📊</div><div class="num">${pct}%</div><div class="lbl">النسبة</div></div>
    </div>
    <div class="info-msg">التأخير: ${summary.late} • الغياب الجزئي: ${summary.partial} • الغياب المتقطع: ${summary.interruptedAbsences} • الغياب المتتالي: ${summary.consecutive} • الغياب المتبقي: ${summary.remainingInterrupted} • الأهلية: <strong>${summary.eligible}</strong></div>
    ${summary.warning ? `<div class="info-msg" style="border-right-color:var(--danger)">⚠️ ${summary.warning}</div>` : ''}
    <div class="card">
      <div class="card-title">📅 سجل الحضور</div>
      <div class="gold-line"></div>
      <div class="table-wrap">
        <table><thead><tr><th>الأسبوع</th><th>التاريخ</th><th>الحالة</th></tr></thead>
        <tbody>
          ${Array.from({length: tw}, (_, i) => {
            const w = Helpers.getWeekWithDate(i + 1);
            const r = att.find(a => a.week === i + 1);
            const icon = !r ? '⏳' : ({ present: '✅', late: '⏰', partial: '◐', excused: '📝', absent: '❌' }[r.status] || '—');
            return `<tr><td>الأسبوع ${w.week}</td><td>${w.date}</td><td>${icon}</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    </div>
  `;
}

/* ============ Servant Dashboard ============ */
function renderServantDashboard() {
  const u = State.currentUser;
  if (!u || u.type !== 'servant') return '';
  const s = u.data;
  const subjects = Helpers.getServantSubjects(s);
  const roles = Helpers.getServantAdminRoles(s);
  const classes = Helpers.getServantClassGroups(s);
  const students = AppData.students;
  const isSubjectTeacher = Helpers.isSubjectTeacher(s);
  
  const tabs = [];
  if (Helpers.canEditStudents(s)) tabs.push({ key: 'manage_students', label: 'إدارة الدارسين', icon: '👨‍🎓' });
  if (Helpers.canEditAttendance(s)) tabs.push({ key: 'attendance', label: 'الحضور', icon: '📋' });
  if (Helpers.canViewAllGrades(s) || isSubjectTeacher) tabs.push({ key: 'quick_eval', label: 'أعمال السنة', icon: '⚡' });
  if (Helpers.canViewAllGrades(s) || isSubjectTeacher) tabs.push({ key: 'exams', label: 'الامتحانات', icon: '🎓' });
  if (Helpers.canViewAllGrades(s)) tabs.push({ key: 'grades_overview', label: 'نظرة عامة', icon: '📊' });
  tabs.push({ key: 'students', label: 'الدارسين', icon: '👥' });
  if (Helpers.canAddVisitationNotes(s)) tabs.push({ key: 'visitation', label: 'النوتة الروحية', icon: '🙏' });
  if (Helpers.canViewAllGrades(s) || Helpers.canAddVisitationNotes(s)) tabs.push({ key: 'term_performance', label: 'أداء الطالب في الترم', icon: '📊' });
  if (Helpers.canPrintReports(s)) tabs.push({ key: 'reports', label: 'التقارير', icon: '🖨️' });
  tabs.push({ key: 'account', label: 'حسابي', icon: '🔑' });

  const activeTab = State.getTab() || tabs[0]?.key || 'account';

  return `
    <div class="dashboard-header">
      <h2>👨‍🏫 مرحباً، ${s.name}</h2>
      <div class="info">
        <span>🏫 ${classes.join(' • ')}</span>
        <span>👥 ${students.length} دارس</span>
        ${subjects.length > 0 ? `<span>📚 ${subjects.length} مادة</span>` : ''}
      </div>
    </div>
    ${roles.length > 0 ? `
      <div class="info-msg" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <strong>🎯 أدوارك:</strong>
        ${roles.map(r => {
          const role = Helpers.getServantAdminRolesList().find(x => x.value === r);
          return role ? `<span class="badge" style="background:${role.color};color:white;">${role.label}</span>` : '';
        }).join('')}
      </div>` : ''}
    <div class="stats-grid">
      <div class="stat-card"><div class="icon">👥</div><div class="num">${students.length}</div><div class="lbl">الدارسين</div></div>
      <div class="stat-card"><div class="icon">📅</div><div class="num">${AppData.settings.currentWeek || 1}/${AppData.settings.totalWeeks || 15}</div><div class="lbl">الأسبوع</div></div>
      <div class="stat-card"><div class="icon">📊</div><div class="num">${AppData.evaluations.length}</div><div class="lbl">تقييمات</div></div>
      <div class="stat-card"><div class="icon">🎓</div><div class="num">${AppData.exams.length}</div><div class="lbl">امتحانات</div></div>
    </div>
    <div class="tabs" id="servantTabs">
      ${tabs.map(t => `<button data-tab="${t.key}" class="${activeTab === t.key ? 'active' : ''}">${t.icon} ${t.label}</button>`).join('')}
    </div>
    <div class="tab-content">${renderServantTab(activeTab, s, students)}</div>
  `;
}

function renderServantTab(tab, s, students) {
  switch (tab) {
    case 'manage_students': return renderManageStudents(s, students);
    case 'attendance': return renderAttendanceTab(s, students);
    case 'quick_eval': return renderQuickEvalTab(s, students);
    case 'exams': return renderExamsTab(s, students);
    case 'grades_overview': return renderGradesOverview(s, students);
    case 'students': return renderStudentsList(s, students);
    case 'visitation': return renderVisitation(s, students);
    case 'term_performance': return renderTermPerformanceOverview(students);
    case 'reports': return renderReportsTab(s, students);
    case 'account': return renderAccount(s);
    default: return renderAccount(s);
  }
}

function renderManageStudents(servant, students) {
  const canDel = Helpers.canDeleteStudents(servant);
  let filtered = filterStudentsByClass(students);
  const search = State.activeTab['servant_students_search'] || '';
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.phone1 || '').includes(q));
  }
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">👨‍🎓 إدارة الدارسين (${filtered.length})</div>
        <div class="flex gap-1">
          <button class="btn btn-gold btn-sm" onclick="openAddStudentModal()">+ إضافة دارس</button>
          <button class="btn btn-outline btn-sm" onclick="exportStudentsExcel()">📊 Excel</button>
          <button class="btn btn-outline btn-sm" onclick="printClassList('${State.classFilter}')">🖨️ طباعة</button>
        </div>
      </div>
      <div class="gold-line"></div>
      <div class="filters-bar">
        <div class="search-box filter-item">
          <label>بحث</label>
          <input type="text" value="${search}" placeholder="الاسم / الكود / الهاتف..." oninput="State.activeTab['servant_students_search']=this.value;clearTimeout(window._st);window._st=setTimeout(()=>renderApp(),400)">
        </div>
        <button class="btn btn-outline btn-sm" onclick="State.activeTab['servant_students_search']='';renderApp()">✖ مسح</button>
      </div>
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد دارسين</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>النوع</th><th>الكتاب</th><th>الدفعة</th><th>الهاتف</th><th>أضيف بواسطة</th><th>إجراءات</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => `
                <tr>
                  <td>${i + 1}</td><td>${s.name}</td>
                  <td><code class="code-badge">${s.id}</code></td>
                  <td>${s.gender === 'ذكر' ? '👦' : '👧'}</td>
                  <td>${s.studyBook || s.class || '—'}</td><td>دفعة ${s.batchYear || s.classGroup || '—'}</td>
                  <td>${Helpers.studentStatusBadge(s.status)}</td>
                  <td>${s.phone1 || '—'}</td>
                  <td><span class="badge badge-adder">${Helpers.getStudentAdder(s)}</span></td>
                  <td>
                    <div class="table-actions">
                      <button class="icon-btn gold" onclick="openEditStudentModal('${s.id}')" title="تعديل">✏️</button>
                      <button class="icon-btn" onclick="printStudentCard('${s.id}')" title="طباعة">🖨️</button>
                      ${canDel ? `<button class="icon-btn danger" onclick="deleteStudentConfirm('${s.id}')" title="حذف">🗑️</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderAttendanceTab(servant, students) {
  const cw = AppData.settings.currentWeek || 1;
  const canEdit = Helpers.canEditAttendance(servant);
  const filtered = filterStudentsByClass(students);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">📋 الحضور - الأسبوع ${cw} (${Helpers.getWeekDate(cw)})</div>
        ${canEdit ? `
          <div class="flex gap-1" style="flex-wrap:wrap;">
            <button class="btn btn-info btn-sm" onclick="markAllPresent()">✅ تحديد الكل حاضر</button>
            <button class="btn btn-outline btn-sm" onclick="markAllAbsent()">❌ تحديد الكل غائب</button>
            <button class="btn btn-success btn-sm" onclick="saveAttendanceBulk(${cw})">💾 حفظ الحضور</button>
          </div>
        ` : ''}
      </div>
      <div class="gold-line"></div>
      <div class="form-group" style="max-width:400px;">
        <label>الأسبوع</label>
        <select onchange="changeWeek(this.value)">
          ${Array.from({length: AppData.settings.totalWeeks || 15}, (_, i) => {
            const w = Helpers.getWeekWithDate(i + 1);
            return `<option value="${i + 1}" ${i + 1 === cw ? 'selected' : ''}>الأسبوع ${w.week} - ${w.date}</option>`;
          }).join('')}
        </select>
      </div>
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="info-msg">💡 <strong>${filtered.length} طالب</strong> - اضغط "تحديد الكل حاضر" ثم أزل الغائبين فقط</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>المحاضرة الأولى</th><th>المحاضرة الثانية</th><th>سبب التغيير</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => {
                const r1 = AppData.attendance.find(a => a.studentId === s.id && a.week === cw && Number(a.lecture) === 1 && a.type !== 'visitation');
                const r2 = AppData.attendance.find(a => a.studentId === s.id && a.week === cw && Number(a.lecture) === 2 && a.type !== 'visitation');
                const options1 = ATTENDANCE_STATUSES.map(status => `<option value="${status}" ${(r1?.status || 'present') === status ? 'selected' : ''}>${AttendanceEngine.statusLabel(status)}</option>`).join('');
                const options2 = ATTENDANCE_STATUSES.map(status => `<option value="${status}" ${(r2?.status || 'present') === status ? 'selected' : ''}>${AttendanceEngine.statusLabel(status)}</option>`).join('');
                return `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.classGroup}</td>
                  <td><select name="att_${s.id}_lecture_1" ${!canEdit ? 'disabled' : ''}>${options1}</select></td>
                  <td><select name="att_${s.id}_lecture_2" ${!canEdit ? 'disabled' : ''}>${options2}</select></td>
                  <td><input type="text" name="att_reason_${s.id}" placeholder="السبب" ${!canEdit ? 'disabled' : ''}></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderQuickEvalTab(servant, students) {
  const tw = AppData.settings.totalWeeks || 15;
  const cw = State.activeTab['quick_eval_week'] || AppData.settings.currentWeek || 1;
  const sub = State.activeTab['quick_eval_subject'] || 'rituals';
  const subject = Helpers.getSubjects().find(s => s.value === sub);
  const canEdit = Helpers.canEditGrades(servant, sub);
  const filtered = filterStudentsByClass(students);
  const weekEvals = AppData.evaluations.filter(e => e.week === cw && e.subject === sub);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">⚡ أعمال السنة - ${subject?.label || ''}</div>
        ${canEdit ? `<button class="btn btn-success btn-sm" onclick="saveQuickEvaluations('${sub}', ${cw})">💾 حفظ</button>` : ''}
      </div>
      <div class="gold-line"></div>
      <div class="filters-bar">
        <div class="filter-item">
          <label>المادة</label>
          <select onchange="State.activeTab['quick_eval_subject']=this.value;renderApp()">
            ${Helpers.getSubjects().map(s => `<option value="${s.value}" ${s.value === sub ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-item">
          <label>الأسبوع</label>
          <select onchange="State.activeTab['quick_eval_week']=parseInt(this.value);renderApp()">
            ${Array.from({length: tw}, (_, i) => {
              const w = Helpers.getWeekWithDate(i + 1);
              return `<option value="${i + 1}" ${i + 1 === cw ? 'selected' : ''}>الأسبوع ${w.week} - ${w.date}</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      ${!canEdit ? '<div class="info-msg">👁️ عرض فقط</div>' : ''}
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>الدرجة (1-10)</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => {
                const e = weekEvals.find(x => x.studentId === s.id);
                const score = e ? e.score : '';
                return `<tr>
                  <td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>
                  <td><input type="number" min="1" max="10" class="quick-eval-input ${score ? 'filled' : ''}" data-student="${s.id}" value="${score}" ${!canEdit ? 'disabled' : ''} onchange="this.classList.toggle('filled', !!this.value)"></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderExamsTab(servant, students) {
  const sub = State.activeTab['exams_subject'] || 'rituals';
  const subject = Helpers.getSubjects().find(s => s.value === sub);
  const canEdit = Helpers.canEditGrades(servant, sub);
  const filtered = filterStudentsByClass(students);
  const weights = GRADING_SYSTEM.getWeights(sub);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">🎓 درجات الامتحانات</div>
        ${canEdit ? `<button class="btn btn-success btn-sm" onclick="saveExamsBulk('${sub}')">💾 حفظ</button>` : ''}
      </div>
      <div class="gold-line"></div>
      <div class="filters-bar">
        <div class="filter-item">
          <label>المادة</label>
          <select onchange="State.activeTab['exams_subject']=this.value;renderApp()">
            ${Helpers.getSubjects().map(s => `<option value="${s.value}" ${s.value === sub ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      ${!canEdit ? '<div class="info-msg">👁️ عرض فقط</div>' : ''}
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>درجة الامتحان النهائية (من 100)</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => {
                const exam = AppData.exams.find(e => e.studentId === s.id && e.subject === sub);
                const score = exam ? exam.score : '';
                return `<tr>
                  <td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>
                  <td><input type="number" min="0" max="100" step="0.5" class="exam-input" data-student="${s.id}" value="${score}" ${!canEdit ? 'disabled' : ''}></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderGradesOverview(servant, students) {
  const subjects = Helpers.getSubjects();
  const tw = AppData.settings.totalWeeks || 15;
  const te = AppData.settings.totalEvaluations || 10;
  const filtered = filterStudentsByClass(students);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="card-title">📊 نظرة عامة على الدرجات</div>
      <div class="gold-line"></div>
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>الدارس</th><th>الدفعة</th>${subjects.map(s => `<th>${s.icon} ${s.label}</th>`).join('')}<th>المجموع</th><th>التقدير</th></tr></thead>
            <tbody>
              ${filtered.map(s => {
                const grades = subjects.map(sub => GRADING_SYSTEM.calculateSubjectGrade(s.id, sub.value, tw, te));
                const countedGrades = grades.filter((grade, index) => subjects[index]?.countInTotal !== false);
                const total = countedGrades.reduce((sum, g) => sum + g.total, 0);
                const avg = countedGrades.length > 0 ? total / countedGrades.length : 0;
                const letter = GRADING_SYSTEM.getGradeLetter(avg);
                return `<tr>
                  <td>${s.name}</td><td>${s.classGroup}</td>
                  ${grades.map(g => `<td><strong style="color:${GRADING_SYSTEM.getGradeLetter(g.total).color};">${g.total}</strong></td>`).join('')}
                  <td><strong>${total.toFixed(1)}</strong></td>
                  <td><span class="badge" style="background:${letter.color};color:white;">${letter.label}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderStudentsList(servant, students) {
  const filtered = filterStudentsByClass(students);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="card-title">👥 الدارسين (<span id="activeStudentsCount">${filtered.length}</span>)</div>
      <div class="gold-line"></div>
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>الكتاب</th><th>الدفعة</th><th>الهاتف</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => `
                <tr><td>${i + 1}</td><td>${s.name}</td><td><code class="code-badge">${s.id}</code></td>
                <td>${s.stage}</td><td>${s.classGroup}</td><td>${s.phone1 || '—'}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderVisitation(servant, students) {
  const cw = AppData.settings.currentWeek || 1;
  const filtered = filterStudentsByClass(students);
  const canAdd = Helpers.canAddVisitationNotes(servant);
  const notes = AppData.visitationNotes.filter(n => n.week === cw);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="card-title">🙏 النوتة الروحية - الأسبوع ${cw} (${Helpers.getWeekDate(cw)})</div>
      <div class="gold-line"></div>
      ${filtered.length === 0 ? '<div class="empty-state">لا يوجد طلاب</div>' : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>ملاحظات</th></tr></thead>
            <tbody>
              ${filtered.map((s, i) => {
                const studentNotes = notes.filter(n => n.studentId === s.id);
                const safeName = s.name.replace(/'/g, "\\'");
                return `<tr>
                  <td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>
                  <td><button class="btn btn-sm ${studentNotes.length > 0 ? 'btn-info' : 'btn-outline'}"
                    onclick="openNotesModal('${s.id}', '${safeName}', ${cw})">
                    📔 ${studentNotes.length > 0 ? `عرض (${studentNotes.length})` : (canAdd ? 'إضافة' : 'عرض')}
                  </button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderReportsTab(servant, students) {
  const classGroups = Helpers.getTrainingYears();
  const selectedClass = State.activeTab['report_class'] || 'all';
  const filteredStudents = selectedClass === 'all' ? students : students.filter(s => Helpers.getTrainingYear(s) === selectedClass);
  
  return `
    <div class="report-section">
      <div class="report-header-row">
        <div class="report-buttons-grid">
          <button class="report-btn all-btn" onclick="selectReportClass('all')">📋 كل المسارات (${students.length})</button>
          ${classGroups.map(g => {
            const count = students.filter(s => Helpers.getTrainingYear(s) === g).length;
            return `<button class="report-btn" onclick="selectReportClass('${g.replace(/'/g, "\\'")}')" style="${selectedClass === g ? 'background:linear-gradient(135deg,var(--wine),#8a1422);' : ''}">${g} (${count})</button>`;
          }).join('')}
        </div>
        <div class="report-section-title">
          <span>اختيار السنة التدريبية للطباعة</span>
          <span class="icon">📋</span>
        </div>
      </div>
      <div class="selected-class-info"><strong>✅ السنة التدريبية المختارة:</strong> ${selectedClass === 'all' ? 'كل المسارات' : selectedClass} — ${filteredStudents.length} دارس</div>
    </div>
    
    <div class="report-section">
      <div class="report-header-row">
        <div class="report-buttons-grid">
          <button class="report-btn excel-btn" onclick="exportStudentsExcel()">📊 Excel</button>
          <button class="report-btn" onclick="printClassList('${selectedClass}')">🖨️ طباعة القائمة</button>
        </div>
        <div class="report-section-title">
          <span>قوائم المسارات التدريبية</span>
          <span class="icon">📋</span>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <div class="report-header-row">
        <div class="report-buttons-grid">
          <button class="report-btn all-btn" onclick="printAttendanceReport('all')">📋 شامل</button>
          ${classGroups.map(g => `<button class="report-btn" onclick="printAttendanceReport('${g.replace(/'/g, "\\'")}')">${g}</button>`).join('')}
        </div>
        <div class="report-section-title">
          <span>كشوف الحضور</span>
          <span class="icon">📊</span>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <div class="report-header-row">
        <div class="report-buttons-grid">
          <button class="report-btn all-btn" onclick="printClassGradesReport('all', 'all')">📋 كل المسارات</button>
          ${classGroups.map(g => `<button class="report-btn" onclick="printClassGradesReport('${g.replace(/'/g, "\\'")}', 'all')">${g}</button>`).join('')}
        </div>
        <div class="report-section-title">
          <span>كشوف أعمال السنة</span>
          <span class="icon">📝</span>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <div class="report-header-row">
        <div class="report-buttons-grid">
          <button class="report-btn all-btn" onclick="printMonthlySpiritualNoteReport()">📋 الكشف الشهري الكامل</button>
          ${Helpers.getBatchYears().map(year => `<button class="report-btn" onclick="printMonthlySpiritualNoteReport('${year}')">دفعة ${year}</button>`).join('')}
        </div>
        <div class="report-section-title">
          <span>تقارير النوتة الروحية</span>
          <span class="icon">📔</span>
        </div>
      </div>
    </div>
  `;
}

function selectReportClass(cls) {
  State.activeTab['report_class'] = cls;
  renderApp();
  showToast(`✅ تم اختيار: ${cls === 'all' ? 'كل المسارات التدريبية' : cls}`, 'info');
}

function renderAccount(servant) {
  const subjects = Helpers.getServantSubjects(servant);
  const roles = Helpers.getServantAdminRoles(servant);
  const classes = Helpers.getServantClassGroups(servant);
  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">👤 بياناتي</div>
        <div class="gold-line"></div>
        <table style="min-width:auto;box-shadow:none;">
          <tr><td><strong>الاسم:</strong></td><td>${servant.name}</td></tr>
          <tr><td><strong>الكود:</strong></td><td><code class="code-badge">${servant.code}</code></td></tr>
          <tr><td><strong>الهاتف:</strong></td><td>${servant.phone || '—'}</td></tr>
          <tr><td><strong>الفصول:</strong></td><td>${classes.join(' • ')}</td></tr>
          <tr><td><strong>المواد:</strong></td><td>${subjects.map(x => Helpers.getSubjectLabel(x)).join('، ') || '—'}</td></tr>
          <tr><td><strong>الأدوار:</strong></td><td>${roles.map(r => Helpers.getServantAdminRoleLabel(r)).join('، ') || '—'}</td></tr>
        </table>
      </div>
      <div class="card">
        <div class="card-title">🔑 تغيير كلمة المرور</div>
        <div class="gold-line"></div>
        <div class="form-group"><label>كلمة المرور الحالية</label><input type="password" id="currentPassword"></div>
        <div class="form-group"><label>كلمة المرور الجديدة</label><input type="password" id="newPassword"></div>
        <div class="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="confirmPassword"></div>
        <button class="btn btn-primary" onclick="changeServantPassword('${servant.id}')">🔑 تغيير</button>
      </div>
    </div>
  `;
}

/* ============ Admin Dashboard ============ */
function renderAdminDashboard() {
  const u = State.currentUser;
  if (!u || u.type !== 'admin') return '';
  const students = AppData.students;
  const servants = AppData.servants;
  const activeTab = State.getTab() || 'students';
  const activeSessions = AppData.activeSessions.filter(s => SessionTracker.isSessionActive(s)).length;
  const idleSessions = AppData.activeSessions.filter(s => SessionTracker.isSessionIdle(s)).length;

  return `
    <div class="dashboard-header">
      <h2>👨‍💼 لوحة تحكم المسؤول العام</h2>
      <div class="info">
        <span>👥 ${students.length} دارس</span>
        <span>👨‍🏫 ${servants.length} خادم</span>
        <span>🟢 ${activeSessions} متصل الآن</span>
        <span>🟡 ${idleSessions} خامل</span>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="icon">👥</div><div class="num">${students.length}</div><div class="lbl">الدارسين</div></div>
      <div class="stat-card"><div class="icon">👨‍🏫</div><div class="num">${servants.length}</div><div class="lbl">الخدام</div></div>
      <div class="stat-card"><div class="icon">🟢</div><div class="num">${activeSessions}</div><div class="lbl">متصل الآن</div></div>
      <div class="stat-card"><div class="icon">📊</div><div class="num">${AppData.evaluations.length}</div><div class="lbl">أعمال السنة</div></div>
    </div>
    <div class="tabs" id="adminTabs">
      <button data-tab="students" class="${activeTab === 'students' ? 'active' : ''}">👨‍🎓 الدارسين</button>
      <button data-tab="graduates" class="${activeTab === 'graduates' ? 'active' : ''}">🎓 خريجي إعداد الخدام</button>
      <button data-tab="servants" class="${activeTab === 'servants' ? 'active' : ''}">👨‍🏫 الخدام</button>
      <button data-tab="attendance" class="${activeTab === 'attendance' ? 'active' : ''}">📋 الحضور</button>
      <button data-tab="evaluation" class="${activeTab === 'evaluation' ? 'active' : ''}">⚡ التقييم</button>
      <button data-tab="exams" class="${activeTab === 'exams' ? 'active' : ''}">🎓 الامتحانات</button>
      <button data-tab="notes" class="${activeTab === 'notes' ? 'active' : ''}">📔 النوتة الروحية</button>
      <button data-tab="term_performance" class="${activeTab === 'term_performance' ? 'active' : ''}">📊 أداء الطالب في الترم</button>
      <button data-tab="sessions" class="${activeTab === 'sessions' ? 'active' : ''}">👁️ المتصلون (${activeSessions + idleSessions})</button>
      <button data-tab="reports" class="${activeTab === 'reports' ? 'active' : ''}">🖨️ التقارير</button>
      <button data-tab="system" class="${activeTab === 'system' ? 'active' : ''}">⚙️ إدارة النظام</button>
    </div>
    <div class="tab-content">${renderAdminTab(activeTab, students, servants)}</div>
  `;
}

function renderAdminTab(tab, students, servants) {
  switch (tab) {
    case 'students': return renderAdminStudents(students);
    case 'graduates': return renderGraduates(students);
    case 'servants': return renderAdminServants(servants);
    case 'attendance': return renderAdminAttendance(students);
    case 'evaluation': return renderAdminQuickEval(students);
    case 'exams': return renderAdminExams(students);
    case 'notes': return renderAdminNotes();
    case 'term_performance': return renderTermPerformanceOverview(students);
    case 'sessions': return renderActiveSessionsTab();
    case 'reports': return renderAdminReports();
    case 'system': return renderSystemManagement();
    default: return renderAdminStudents(students);
  }
}

function renderActiveSessionsTab() {
  const allSessions = AppData.activeSessions;
  const activeSessions = allSessions.filter(s => SessionTracker.isSessionActive(s));
  const idleSessions = allSessions.filter(s => SessionTracker.isSessionIdle(s));
  const inactiveSessions = allSessions.filter(s => !s.isActive || (!SessionTracker.isSessionActive(s) && !SessionTracker.isSessionIdle(s)));
  
  const sortByLastSeen = (a, b) => new Date(b.lastSeen) - new Date(a.lastSeen);
  activeSessions.sort(sortByLastSeen);
  idleSessions.sort(sortByLastSeen);
  
  const renderSessionCard = (s, status) => {
    const statusLabel = status === 'active' ? '🟢 متصل الآن' : status === 'idle' ? '🟡 خامل' : '⚫ غير نشط';
    const statusClass = status === 'active' ? 'online-now' : status === 'idle' ? 'idle' : '';
    const userIcon = s.userType === 'servant' ? '👨‍🏫' : s.userType === 'admin' ? '👨‍💼' : '👨‍🎓';
    const typeLabel = s.userType === 'servant' ? 'خادم' : s.userType === 'admin' ? 'مسؤول' : 'دارس';
    const isThisDevice = SessionTracker.isThisDevice(s);
    
    return `
      <div class="active-user-card ${statusClass} ${isThisDevice ? 'this-device' : ''}">
        <div class="user-header">
          <span class="user-name">${userIcon} ${s.userName}${isThisDevice ? ' <span class="badge badge-me">📱 هذا جهازك</span>' : ''}</span>
          <span class="badge ${status === 'active' ? 'badge-success' : status === 'idle' ? 'badge-warning' : 'badge-info'}" style="${status === 'active' ? 'background:#2e7d32;color:white;' : ''}">
            ${status === 'active' ? '<span class="online-dot"></span>' : ''}${statusLabel}
          </span>
        </div>
        <div class="user-info">
          <strong>النوع:</strong> ${typeLabel} • 
          <strong>الكود:</strong> ${s.userCode || '—'}<br>
          <strong>الجهاز:</strong> ${s.deviceType || '—'}<br>
          <strong>تسجيل الدخول:</strong> ${Helpers.formatDateTime(s.loginAt)}<br>
          <strong>آخر نشاط:</strong> ${Helpers.formatTimeAgo(s.lastSeen)}
        </div>
        <div class="user-actions">
          ${status !== 'inactive' && s.isActive ? `
            ${isThisDevice ? `
              <button class="btn btn-sm btn-primary" onclick="State.logout()">🚪 خروج من هذا الجهاز</button>
            ` : `
              <button class="btn btn-sm btn-danger" onclick="forceLogoutUser('${s.id}', '${s.userName.replace(/'/g, "\\'")}')">
                🚫 إخراج من النظام
              </button>
            `}
          ` : `<span class="badge badge-info">انتهت الجلسة</span>`}
        </div>
      </div>
    `;
  };
  
  return `
    <div class="active-users-section">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="color:var(--navy);margin-bottom:6px;">👁️ مراقبة المستخدمين المتصلين</h3>
          <p class="text-muted">متابعة مباشرة لجميع المستخدمين داخل النظام</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="cleanupSessions()">🧹 تنظيف الجلسات القديمة</button>
      </div>
      
      <div class="stats-grid" style="margin-top:16px;">
        <div class="stat-card" style="border-top-color:var(--success);">
          <div class="icon">🟢</div>
          <div class="num" style="color:var(--success);">${activeSessions.length}</div>
          <div class="lbl">متصل الآن</div>
        </div>
        <div class="stat-card" style="border-top-color:var(--warning);">
          <div class="icon">🟡</div>
          <div class="num" style="color:var(--warning);">${idleSessions.length}</div>
          <div class="lbl">خامل</div>
        </div>
        <div class="stat-card" style="border-top-color:var(--info);">
          <div class="icon">📊</div>
          <div class="num" style="color:var(--info);">${allSessions.length}</div>
          <div class="lbl">إجمالي الجلسات</div>
        </div>
      </div>
    </div>
    
    ${activeSessions.length > 0 ? `
      <div class="card" style="border-right-color:var(--success);">
        <div class="card-title"><span class="online-dot"></span> المتصلون الآن (${activeSessions.length})</div>
        <div class="gold-line"></div>
        <div class="active-users-grid">
          ${activeSessions.map(s => renderSessionCard(s, 'active')).join('')}
        </div>
      </div>
    ` : ''}
    
    ${idleSessions.length > 0 ? `
      <div class="card" style="border-right-color:var(--warning);">
        <div class="card-title">🟡 الخاملون (${idleSessions.length})</div>
        <div class="gold-line"></div>
        <div class="active-users-grid">
          ${idleSessions.map(s => renderSessionCard(s, 'idle')).join('')}
        </div>
      </div>
    ` : ''}
    
    ${inactiveSessions.length > 0 ? `
      <div class="card">
        <div class="card-title">⚫ الجلسات المنتهية (${inactiveSessions.length})</div>
        <div class="gold-line"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>المستخدم</th><th>النوع</th><th>الكود</th><th>دخول</th><th>خروج</th><th>الحالة</th></tr></thead>
            <tbody>
              ${inactiveSessions.slice(0, 20).map(s => `
                <tr>
                  <td>${s.userName}${SessionTracker.isThisDevice(s) ? ' <span class="badge badge-me">📱 جهازك</span>' : ''}</td>
                  <td>${s.userType === 'servant' ? '👨‍🏫 خادم' : s.userType === 'admin' ? '👨‍💼 مسؤول' : '👨‍🎓 دارس'}</td>
                  <td><code class="code-badge">${s.userCode || '—'}</code></td>
                  <td>${Helpers.formatDateTime(s.loginAt)}</td>
                  <td>${s.logoutAt ? Helpers.formatDateTime(s.logoutAt) : '—'}</td>
                  <td>${s.forcedLogout ? '<span class="badge badge-danger">🚫 مُخرج</span>' : '<span class="badge badge-info">انتهت</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
    
    ${allSessions.length === 0 ? `
      <div class="empty-state">
        <span class="icon">👁️</span>
        <h4>لا توجد جلسات نشطة</h4>
        <p>سيظهر هنا كل مستخدم يقوم بتسجيل الدخول</p>
      </div>
    ` : ''}
  `;
}

function renderAdminStudents(students) {
  let filtered = filterStudentsByClass(students);
  const search = State.activeTab['admin_students_search'] || '';
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.id || '').toLowerCase().includes(q) ||
      String(s.email || '').toLowerCase().includes(q)
    );
  }

  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">👥 الدارسين (${filtered.length})</div>
        <div class="flex gap-1">
          <button class="btn btn-gold btn-sm" onclick="openAddStudentModal()">+ إضافة</button>
          <button class="btn btn-outline btn-sm" onclick="exportStudentsExcel()">📊 Excel</button>
        </div>
      </div>
      <div class="gold-line"></div>
      <div class="filters-bar">
        <div class="search-box filter-item">
          <label>بحث</label>
          <input id="activeStudentsSearch" type="search" value="${search}" placeholder="الاسم / الكود / البريد..." oninput="filterStudentsTable(this.value, 'activeStudentsTable', 'activeStudentsCount')">
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('activeStudentsSearch')?.focus()">🔍 بحث تلقائي</button>
      </div>
      <div class="table-wrap">
        <table id="activeStudentsTable">
          <thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>النوع</th><th>الكتاب</th><th>الدفعة</th><th>الحالة</th><th>أضيف بواسطة</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${filtered.map((s, i) => `
              <tr data-search="${Helpers.escapeHtml(`${s.name || ''} ${s.id || ''} ${s.email || ''} ${s.phone1 || ''}`.toLowerCase())}">
                <td>${i + 1}</td><td>${s.name}</td>
                <td><code class="code-badge">${s.id}</code></td>
                <td>${s.gender === 'ذكر' ? '👦' : '👧'}</td>
                <td>${s.studyBook || s.class || '—'}</td><td>دفعة ${s.batchYear || s.classGroup || '—'}</td>
                <td>${Helpers.studentStatusBadge(s.status)}</td>
                <td><span class="badge badge-adder">${Helpers.getStudentAdder(s)}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" onclick="openStudentFile('${s.id}')" title="عرض ملف الطالب">👤</button>
                    <button class="icon-btn gold" onclick="openEditStudentModal('${s.id}')">✏️</button>
                    <button class="icon-btn" onclick="printStudentCard('${s.id}')">🖨️</button>
                    <button class="icon-btn danger" onclick="deleteStudentConfirm('${s.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderGraduates(students) {
  const isGraduated = s => Helpers.isTrainingGraduate(s) || s.isGraduate === true || String(s.graduationName || '').includes('خريج');
  const graduates = students.filter(s =>
    isGraduated(s)
  ).filter(s =>
    State.graduateBatchFilter === 'all' ||
    String(s.graduationYear || s.batchYear || s.classGroup || '') === State.graduateBatchFilter
  );
  return `
    <div class="filters-bar">
      <div class="search-box filter-item" style="min-width:260px">
        <label>بحث باسم الخريج أو الكود</label>
        <input id="graduatesSearch" type="search" placeholder="الاسم / الكود..." oninput="filterStudentsTable(this.value, 'graduatesTable', 'graduatesCount')">
      </div>
      <div class="form-group" style="min-width:220px">
        <label>دفعة الخريجين</label>
        <select onchange="State.setStudentFilter('graduateBatchFilter', this.value)">
          <option value="all">جميع الدفعات</option>
          ${Helpers.getBatchYears().map(year => `<option value="${year}" ${State.graduateBatchFilter === String(year) ? 'selected' : ''}>دفعة ${year}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🎓 خريجي إعداد الخدام (<span id="graduatesCount">${graduates.length}</span>)</div>
      <div class="gold-line"></div>
      ${graduates.length ? `<div class="table-wrap"><table id="graduatesTable">
        <thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>الدفعة</th><th>بيان التخرج</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>${graduates.map((s, i) => `
          <tr data-search="${Helpers.escapeHtml(`${s.name || ''} ${s.id || ''} ${s.email || ''}`.toLowerCase())}"><td>${i + 1}</td><td>${s.name}</td><td><code>${s.id}</code></td>
          <td>دفعة ${s.batchYear || s.classGroup || '—'}</td>
          <td>${s.graduationName || (s.graduationYear ? `خريج نيروز - ${s.graduationYear}` : '—')}</td>
          <td>${Helpers.studentStatusBadge('خريج')}</td>
          <td><div class="table-actions">
            <button class="icon-btn" onclick="openStudentFile('${s.id}')" title="عرض ملف الطالب">👤</button>
            <button class="icon-btn gold" onclick="openEditStudentModal('${s.id}')" title="تعديل">✏️</button>
            <button class="icon-btn" onclick="printStudentCard('${s.id}')" title="طباعة">🖨️</button>
            <button class="icon-btn danger" onclick="deleteStudentConfirm('${s.id}')" title="حذف">🗑️</button>
          </div></td></tr>`).join('')}</tbody>
      </table></div>` : '<div class="empty-state">لا يوجد خريجون مطابقة للدفعة المختارة</div>'}
    </div>`;
}

function filterStudentsTable(query, tableId, countId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const normalized = String(query || '').trim().toLocaleLowerCase('ar');
  let visible = 0;
  table.querySelectorAll('tbody tr[data-search]').forEach(row => {
    const matches = !normalized || row.dataset.search.includes(normalized);
    row.style.display = matches ? '' : 'none';
    if (matches) visible++;
  });
  const count = document.getElementById(countId);
  if (count) count.textContent = String(visible);
}

function renderAdminServants(servants) {
  servants = [...new Map(servants.map(servant => [servant.code || servant.id, servant])).values()];
  return `
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">👨‍🏫 الخدام (${servants.length})</div>
        <button class="btn btn-gold btn-sm" onclick="openAddServantModal()">+ إضافة خادم</button>
      </div>
      <div class="gold-line"></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>الهاتف</th><th>الحالة</th><th>النطاق</th><th>الفصول</th><th>الأدوار</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${servants.map((s, i) => {
              const roles = Helpers.getServantAdminRoles(s);
              const classes = Helpers.getServantClassGroups(s);
              const isHigher = Helpers.isFatherPriest(s);
              const canManageHigher = Helpers.isFatherPriest(State.currentUser?.data) || State.currentUser?.role === 'priest' || State.currentUser?.role === 'admin';
              return `<tr>
                <td>${i + 1}</td><td>${s.name}</td>
                <td><code class="code-badge">${s.code}</code></td>
                <td>${s.phone || '—'}</td>
                <td><span class="badge ${s.accountStatus === 'suspended' || s.active === false ? 'badge-danger' : s.accountStatus === 'pending' ? 'badge-warning' : 'badge-success'}">${s.accountStatus === 'suspended' || s.active === false ? 'معلق' : s.accountStatus === 'pending' ? 'بانتظار التفعيل' : 'نشط'}</span></td>
                <td>${s.accessScope?.mode === 'all' ? 'كل البيانات' : s.accessScope?.mode === 'selected' ? 'محدد' : 'المكلف به'}</td>
                <td style="font-size:0.75rem;">${classes.join(' • ')}</td>
                <td style="font-size:0.75rem;">${roles.map(r => {
                  const role = Helpers.getServantAdminRolesList().find(x => x.value === r);
                  return role ? `<span class="badge" style="background:${role.color};color:white;font-size:0.68rem;">${role.label}</span>` : '';
                }).join(' ')}</td>
                <td>
                  <div class="table-actions">
                    ${!isHigher || canManageHigher ? `<button class="icon-btn gold" onclick="openEditServantModal('${s.id}')">✏️</button><button class="icon-btn danger" onclick="deleteServantConfirm('${s.id}')">🗑️</button>` : '<span class="badge badge-info">محمي</span>'}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminAttendance(students) {
  const cw = AppData.settings.currentWeek || 1;
  const filtered = filterStudentsByClass(students);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">📋 الحضور - الأسبوع ${cw} (${Helpers.getWeekDate(cw)})</div>
        <div class="flex gap-1">
          <button class="btn btn-info btn-sm" onclick="markAllPresent()">✅ الكل حاضر</button>
          <button class="btn btn-outline btn-sm" onclick="markAllAbsent()">❌ الكل غائب</button>
          <button class="btn btn-success btn-sm" onclick="saveAttendanceBulk(${cw})">💾 حفظ</button>
        </div>
      </div>
      <div class="gold-line"></div>
      <div class="form-group" style="max-width:400px;">
        <label>الأسبوع</label>
        <select onchange="changeWeek(this.value)">
          ${Array.from({length: AppData.settings.totalWeeks || 15}, (_, i) => {
            const w = Helpers.getWeekWithDate(i + 1);
            return `<option value="${i + 1}" ${i + 1 === cw ? 'selected' : ''}>الأسبوع ${w.week} - ${w.date}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>المحاضرة الأولى</th><th>المحاضرة الثانية</th><th>سبب التغيير</th></tr></thead>
          <tbody>
            ${filtered.map((s, i) => {
              const r1 = AppData.attendance.find(a => a.studentId === s.id && a.week === cw && Number(a.lecture) === 1 && a.type !== 'visitation');
              const r2 = AppData.attendance.find(a => a.studentId === s.id && a.week === cw && Number(a.lecture) === 2 && a.type !== 'visitation');
              const options1 = ATTENDANCE_STATUSES.map(status => `<option value="${status}" ${(r1?.status || 'present') === status ? 'selected' : ''}>${AttendanceEngine.statusLabel(status)}</option>`).join('');
              const options2 = ATTENDANCE_STATUSES.map(status => `<option value="${status}" ${(r2?.status || 'present') === status ? 'selected' : ''}>${AttendanceEngine.statusLabel(status)}</option>`).join('');
              return `<tr>
                <td>${i + 1}</td><td><strong>${s.name}</strong></td><td>${s.classGroup}</td>
                <td><select name="att_${s.id}_lecture_1">${options1}</select></td>
                <td><select name="att_${s.id}_lecture_2">${options2}</select></td>
                <td><input type="text" name="att_reason_${s.id}" placeholder="السبب"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminQuickEval(students) {
  const tw = AppData.settings.totalWeeks || 15;
  const cw = State.activeTab['admin_eval_week'] || AppData.settings.currentWeek || 1;
  const selectedType = State.activeTab['admin_coursework_type'] || 'bibleCompetition';
  const filtered = filterStudentsByClass(students);
  const coreTypes = CourseworkEngine.types().filter(item => item.active);
  const bonusTypes = CourseworkEngine.bonusItems().filter(item => item.active);
  const deductionMode = selectedType === '__deduction__';
  const selectedItem = deductionMode ? null : [...coreTypes, ...bonusTypes.map(item => ({ ...item, isBonus: true }))].find(item => item.key === selectedType);
  const maxScore = selectedItem?.max || 20;
  const weekEvals = AppData.evaluations.filter(e => e.week === cw && e.courseworkType === selectedType || e.week === cw && deductionMode && e.isDeduction === true);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">⚡ التقييمات - أعمال السنة</div>
        <button class="btn btn-success btn-sm" onclick="saveCourseworkEvaluations('${selectedType}', ${cw})">💾 حفظ الدرجة</button>
      </div>
      <div class="gold-line"></div>
      <div class="tabs" style="overflow-x:auto;display:flex;gap:8px;margin:12px 0">
        ${coreTypes.map(item => `<button class="btn ${selectedType === item.key ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="State.activeTab['admin_coursework_type']='${item.key}';renderApp()">${item.icon} ${Helpers.escapeHtml(item.label)}</button>`).join('')}
        <button class="btn ${selectedType === '__bonus__' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="State.activeTab['admin_coursework_type']='${bonusTypes[0]?.key || '__bonus__'}';renderApp()">➕ البونص</button>
        <button class="btn ${deductionMode ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="State.activeTab['admin_coursework_type']='__deduction__';renderApp()">➖ خصم أعمال السنة</button>
      </div>
      <div class="filters-bar">
        <div class="filter-item">
          <label>${deductionMode ? 'سبب الخصم' : 'نوع التقييم / بند البونص'}</label>
          <select onchange="State.activeTab['admin_coursework_type']=this.value;renderApp()">
            ${coreTypes.map(item => `<option value="${item.key}" ${selectedType === item.key ? 'selected' : ''}>${item.icon} ${Helpers.escapeHtml(item.label)} (${item.max}%)</option>`).join('')}
            ${bonusTypes.map(item => `<option value="${item.key}" ${selectedType === item.key ? 'selected' : ''}>➕ ${Helpers.escapeHtml(item.label)} (${item.max}%)</option>`).join('')}
            <option value="__deduction__" ${deductionMode ? 'selected' : ''}>➖ خصم من أعمال السنة</option>
          </select>
        </div>
        <div class="filter-item">
          <label>الأسبوع</label>
          <select onchange="State.activeTab['admin_eval_week']=parseInt(this.value);renderApp()">
            ${Array.from({length: tw}, (_, i) => {
              const w = Helpers.getWeekWithDate(i + 1);
              return `<option value="${i + 1}" ${i + 1 === cw ? 'selected' : ''}>الأسبوع ${w.week} - ${w.date}</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>${deductionMode ? 'الخصم' : `الدرجة (من ${maxScore})`}</th><th>${deductionMode ? 'السبب' : 'الكتاب / ملاحظات'}</th><th>إجمالي أعمال السنة</th></tr></thead>
          <tbody>
            ${filtered.map((s, i) => {
              const e = weekEvals.find(x => x.studentId === s.id);
              const score = e ? e.score : '';
              const courseworkTotal = CourseworkEngine.total(AppData.evaluations, s.id);
              return `<tr>
                <td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>
                <td><input type="number" min="0" max="${deductionMode ? 20 : maxScore}" step="0.5" class="coursework-score-input ${score ? 'filled' : ''}" data-student="${s.id}" value="${score}" onchange="this.classList.toggle('filled', this.value !== '')"></td>
                <td><input type="text" class="coursework-note-input" data-student="${s.id}" value="${Helpers.escapeHtml(e?.note || '')}" placeholder="${deductionMode ? 'سبب الخصم' : selectedItem?.books?.join(' / ') || ''}"></td>
                <td><strong>${courseworkTotal.total}%</strong><br><small>أساس ${courseworkTotal.core}% + بونص ${courseworkTotal.bonus}% - خصم ${courseworkTotal.deductions}%</small></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminExams(students) {
  const sub = State.activeTab['admin_exam_subject'] || 'rituals';
  const filtered = filterStudentsByClass(students);
  const weights = GRADING_SYSTEM.getWeights(sub);
  return `
    ${renderClassFilterChips()}
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">🎓 درجات الامتحانات</div>
        <button class="btn btn-success btn-sm" onclick="saveExamsBulk('${sub}')">💾 حفظ</button>
      </div>
      <div class="gold-line"></div>
      <div class="filters-bar">
        <div class="filter-item">
          <label>المادة</label>
          <select onchange="State.activeTab['admin_exam_subject']=this.value;renderApp()">
            ${Helpers.getSubjects().map(s => `<option value="${s.value}" ${s.value === sub ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>الدارس</th><th>الدفعة</th><th>الدرجة النهائية (من 100)</th></tr></thead>
          <tbody>
            ${filtered.map((s, i) => {
              const exam = AppData.exams.find(e => e.studentId === s.id && e.subject === sub);
              const score = exam ? exam.score : '';
              return `<tr>
                <td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>
                <td><input type="number" min="0" max="100" step="0.5" class="exam-input" data-student="${s.id}" value="${score}"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminNotes() {
  const view = State.activeTab['notes_view'] || 'daily';
  const month = State.activeTab['notes_month'] || new Date().toISOString().slice(0, 7);
  const search = String(State.activeTab['notes_search'] || '').trim().toLocaleLowerCase('ar');
  let students = AppData.students.filter(s => String(s.status || '') !== 'خريج');
  if (State.studyBookFilter !== 'all') students = students.filter(s => (s.studyBook || s.class) === State.studyBookFilter);
  if (State.batchFilter !== 'all') students = students.filter(s => String(s.batchYear || s.classGroup || '') === String(State.batchFilter));
  if (search) students = students.filter(s => `${s.name || ''} ${s.id || ''}`.toLocaleLowerCase('ar').includes(search));
  const itemLabels = { gospel: 'قراءة الإنجيل', morningPrayer: 'صلاة باكر', eveningPrayer: 'صلاة الغروب', nightPrayer: 'صلاة النوم', communion: 'التناول', confession: 'الاعتراف' };
  const dailyNotes = AppData.visitationNotes.filter(n => n.type === 'spiritualDaily');
  const summarizeMonth = studentId => {
    const days = dailyNotes.filter(n => String(n.studentId) === String(studentId) && String(n.noteDate || '').startsWith(month));
    const uniqueDays = [...new Set(days.map(n => n.noteDate))];
    const itemStats = Object.keys(itemLabels).map(key => {
      const done = uniqueDays.filter(date => days.find(n => n.noteDate === date)?.items?.[key] === true).length;
      return { key, label: itemLabels[key], done, percent: uniqueDays.length ? Math.round(done / uniqueDays.length * 100) : 0 };
    });
    return { days: uniqueDays.length, itemStats };
  };
  return `
    ${renderClassFilterChips()}
    <div class="filters-bar">
      <div class="search-box filter-item" style="min-width:260px"><label>بحث عن دارس</label><input type="search" value="${Helpers.escapeHtml(search)}" placeholder="الاسم أو الكود..." oninput="State.activeTab['notes_search']=this.value;filterNotesStudents(this.value)"></div>
      <div class="form-group"><label>الشهر</label><input type="month" value="${month}" onchange="State.activeTab['notes_month']=this.value;renderApp()"></div>
      <div class="form-group"><label>العرض</label><select onchange="State.activeTab['notes_view']=this.value;renderApp()"><option value="daily" ${view === 'daily' ? 'selected' : ''}>التسجيل اليومي</option><option value="monthly" ${view === 'monthly' ? 'selected' : ''}>التقرير الشهري</option></select></div>
      <button class="btn btn-outline btn-sm" onclick="openSpiritualNoteRules()">⚙️ شروط أهلية الامتحان</button>
      <button class="btn btn-outline btn-sm" onclick="printMonthlySpiritualNoteReport()">🖨️ طباعة الكشف الشهري</button>
    </div>
    <div class="card">
      <div class="card-title">📔 النوتة الروحية (${students.length})</div>
      <div class="gold-line"></div>
      ${students.length === 0 ? '<div class="empty-state">لا يوجد دارسون مطابقون للفلاتر</div>' : view === 'daily' ? `
        <div class="table-wrap"><table><thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>الدفعة</th><th>الكتاب</th><th>أيام الشهر المسجلة</th><th>إجراء</tr></thead><tbody>
        ${students.map((s, i) => {
          const summary = summarizeMonth(s.id);
          const monthRecords = dailyNotes.filter(n => String(n.studentId) === String(s.id) && String(n.noteDate || '').startsWith(month));
          const pending = monthRecords.filter(n => n.reviewStatus !== 'approved').length;
          return `<tr><td>${i + 1}</td><td>${Helpers.escapeHtml(s.name)}</td><td><code>${Helpers.escapeHtml(s.id)}</code></td><td>دفعة ${Helpers.escapeHtml(s.batchYear || s.classGroup || '—')}</td><td>${Helpers.escapeHtml(s.studyBook || s.class || '—')}</td><td><span class="badge badge-info">${summary.days} يوم</span></td><td><div class="table-actions"><button class="btn btn-gold btn-sm" onclick="openSpiritualNoteModal('${s.id}')">📝 تسجيل</button>${canApproveMonthlyNotes() && pending ? `<button class="btn btn-outline btn-sm" onclick="approveMonthlySpiritualNotes('${s.id}')">✅ اعتماد (${pending})</button>` : ''}</div></td></tr>`;
        }).join('')}
        </tbody></table></div>` : `
        <div class="table-wrap"><table><thead><tr><th>الدارس</th><th>الأيام المسجلة</th>${Object.values(itemLabels).map(label => `<th>${label}</th>`).join('')}<th>الحالة</th><th>الاعتماد</th><th>أهلية النوتة</th></tr></thead><tbody>
        ${students.map(s => {
          const summary = summarizeMonth(s.id);
          const confessionCount = summary.days ? dailyNotes.filter(n => String(n.studentId) === String(s.id) && String(n.noteDate || '').startsWith(month) && n.items?.confession).length : 0;
          const communionCount = summary.days ? dailyNotes.filter(n => String(n.studentId) === String(s.id) && String(n.noteDate || '').startsWith(month) && n.items?.communion).length : 0;
          const eligible = summary.days > 0 && summary.itemStats.every(x => x.key === 'confession' || x.key === 'communion' || x.percent >= 65) && confessionCount >= 1 && communionCount >= 2;
          const monthRecords = dailyNotes.filter(n => String(n.studentId) === String(s.id) && String(n.noteDate || '').startsWith(month));
          const approvedCount = monthRecords.filter(n => n.reviewStatus === 'approved').length;
          return `<tr><td>${Helpers.escapeHtml(s.name)}<br><code>${Helpers.escapeHtml(s.id)}</code></td><td>${summary.days}</td>${summary.itemStats.map(x => `<td><strong>${x.percent}%</strong><br><small>${x.done} يومًا</small></td>`).join('')}<td><span class="badge ${approvedCount === monthRecords.length && monthRecords.length ? 'badge-success' : 'badge-info'}">${approvedCount}/${monthRecords.length} معتمد</span></td><td>${canApproveMonthlyNotes() && approvedCount < monthRecords.length ? `<button class="btn btn-outline btn-sm" onclick="approveMonthlySpiritualNotes('${s.id}')">اعتماد الشهر</button>` : approvedCount === monthRecords.length && monthRecords.length ? 'معتمد' : '—'}</td><td><span class="badge ${eligible ? 'badge-success' : 'badge-danger'}">${eligible ? 'مؤهل' : 'غير مؤهل'}${confessionCount ? '' : ' - الاعتراف'}</span></td></tr>`;
        }).join('')}
        </tbody></table></div>`}
    </div>
  `;
}

function filterNotesStudents(value) {
  State.activeTab['notes_search'] = value;
  clearTimeout(window._notesSearchTimer);
  window._notesSearchTimer = setTimeout(() => renderApp(), 250);
}

function canApproveMonthlyNotes() {
  if (State.currentUser?.type === 'admin') return true;
  const servant = State.currentUser?.data;
  return State.currentUser?.type === 'servant' && (Helpers.canApproveSpiritualNotes(servant) || Helpers.canAddVisitationNotes(servant));
}

async function approveMonthlySpiritualNotes(studentId) {
  if (!canApproveMonthlyNotes()) return showToast('ليس لديك صلاحية اعتماد النوتة', 'error');
  const month = State.activeTab['notes_month'] || new Date().toISOString().slice(0, 7);
  const records = AppData.visitationNotes.filter(n =>
    n.type === 'spiritualDaily' &&
    String(n.studentId) === String(studentId) &&
    String(n.noteDate || '').startsWith(month) &&
    n.reviewStatus !== 'approved'
  );
  if (!records.length) return showToast('لا توجد سجلات تنتظر الاعتماد لهذا الشهر', 'warning');
  try {
    showLoading('جارٍ اعتماد النوتة الشهرية...');
    await Promise.all(records.map(async note => {
      await DB.updateVisitationNote(note.id, {
        reviewStatus: 'approved',
        reviewedBy: State.currentUser?.data?.name || State.currentUser?.email || 'مسؤول معتمد',
        reviewedAt: new Date().toISOString()
      });
      note.reviewStatus = 'approved';
    }));
    showToast(`✅ تم اعتماد ${records.length} سجل شهري`);
    closeModal();
    renderApp();
  } catch (error) {
    console.error(error);
    showToast('تعذر اعتماد النوتة الشهرية', 'error');
  } finally { hideLoading(); }
}

function openSpiritualNoteModal(studentId) {
  const student = AppData.students.find(s => String(s.id) === String(studentId));
  if (!student) return;
  const studentEntry = State.currentUser?.type === 'student';
  if (studentEntry && String(student.id) !== String(State.currentUser?.data?.id)) {
    return showToast('ليس من حقك فتح نوتة دارس آخر', 'error');
  }
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isoLocal = date => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  const selectedDate = State.activeTab['spiritual_note_date'] || isoLocal(today);
  const existing = AppData.visitationNotes.find(n => n.type === 'spiritualDaily' && String(n.studentId) === String(studentId) && n.noteDate === selectedDate);
  const items = existing?.items || {};
  const isApproved = existing?.reviewStatus === 'approved';
  const isAdminApprovalContext = canApproveMonthlyNotes();
  const dateBounds = studentEntry ? `min="${isoLocal(yesterday)}" max="${isoLocal(today)}"` : '';
  const labels = {
    gospel: 'قراءة الإنجيل', morningPrayer: 'صلاة باكر', eveningPrayer: 'صلاة الغروب',
    nightPrayer: 'صلاة النوم', communion: 'التناول', confession: 'الاعتراف'
  };
  showModal(`
    <h3>📔 نوتة ${Helpers.escapeHtml(student.name)} الروحية</h3>
    <div class="form-grid">
      <div><strong>الكود:</strong> <code>${Helpers.escapeHtml(student.id)}</code></div>
      <div><strong>الدفعة:</strong> دفعة ${Helpers.escapeHtml(student.batchYear || student.classGroup || '—')}</div>
    </div>
    <div class="form-group" style="margin-top:12px"><label>التاريخ</label><input type="date" id="spiritualNoteDate" value="${selectedDate}" ${dateBounds} onchange="reloadSpiritualNote('${studentId}', this.value)"></div>
    <div class="form-section">
      <div class="section-header">بنود اليوم</div>
      ${Object.entries(labels).map(([key, label]) => `<label style="display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid #eee"><input type="checkbox" id="spiritual_${key}" ${items[key] === true ? 'checked' : ''}><span>${label}</span></label>`).join('')}
    </div>
    <div class="form-group"><label>${studentEntry ? 'ملاحظات الدارس' : 'ملاحظات الخادم'}</label><textarea id="spiritualNoteText" rows="3">${Helpers.escapeHtml(existing?.text || '')}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-gold" onclick="saveSpiritualNote('${studentId}')">💾 حفظ النوتة اليومية</button>
      ${isAdminApprovalContext && existing?.id && !isApproved ? `<button class="btn btn-outline" onclick="approveSpiritualNote('${existing.id}', '${studentId}')">✅ اعتماد النوتة</button>` : ''}
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
    </div>
  `);
}

function openStudentSpiritualNoteModal(studentId) {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  State.activeTab['spiritual_note_date'] = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  openSpiritualNoteModal(studentId);
}

async function approveSpiritualNote(noteId, studentId) {
  try {
    await DB.updateVisitationNote(noteId, {
      reviewStatus: 'approved',
      reviewedBy: State.currentUser?.data?.name || State.currentUser?.email || 'مسؤول معتمد',
      reviewedAt: new Date().toISOString()
    });
    const note = AppData.visitationNotes.find(n => n.id === noteId);
    if (note) Object.assign(note, { reviewStatus: 'approved' });
    closeModal();
    showToast('✅ تم اعتماد النوتة الروحية');
    renderApp();
  } catch (error) {
    console.error(error);
    showToast('❌ تعذر اعتماد النوتة', 'error');
  }
}

function reloadSpiritualNote(studentId, noteDate) {
  State.activeTab['spiritual_note_date'] = noteDate;
  openSpiritualNoteModal(studentId);
}

async function saveSpiritualNote(studentId) {
  const noteDate = document.getElementById('spiritualNoteDate').value;
  if (!noteDate) return showToast('اختر تاريخ النوتة', 'error');
  const studentEntry = State.currentUser?.type === 'student';
  if (studentEntry && String(studentId) !== String(State.currentUser?.data?.id)) {
    return showToast('لا يمكنك تسجيل نوتة دارس آخر', 'error');
  }
  if (studentEntry) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isoLocal = date => {
      const offset = date.getTimezoneOffset();
      return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
    };
    if (![isoLocal(today), isoLocal(yesterday)].includes(noteDate)) {
      return showToast('يمكن للدارس تسجيل نوتة اليوم أو أمس فقط', 'error');
    }
  }
  const student = AppData.students.find(s => String(s.id) === String(studentId));
  const keys = ['gospel', 'morningPrayer', 'eveningPrayer', 'nightPrayer', 'communion', 'confession'];
  const items = {};
  keys.forEach(key => { items[key] = document.getElementById(`spiritual_${key}`).checked; });
  const existing = AppData.visitationNotes.find(n => n.type === 'spiritualDaily' && String(n.studentId) === String(studentId) && n.noteDate === noteDate);
  if (existing?.reviewStatus === 'approved' && State.currentUser?.type === 'student') {
    showToast('⚠️ النوتة المعتمدة تحتاج طلب تصحيح من المسؤول', 'warning');
    return;
  }
  const data = {
    studentId, studentName: student?.name || '', noteDate, type: 'spiritualDaily',
    noteDateTs: Timestamp.fromDate(new Date(`${noteDate}T00:00:00`)),
    category: 'spiritual', items, text: document.getElementById('spiritualNoteText').value.trim(),
    reviewStatus: existing?.reviewStatus || 'draft',
    classGroup: student?.batchYear || student?.classGroup || ''
  };
  try {
    showLoading('جارٍ حفظ النوتة...');
    let saved;
    if (existing?.id) {
      await DB.updateVisitationNote(existing.id, data);
      Object.assign(existing, data);
    } else {
      saved = await DB.addVisitationNote(data);
      AppData.visitationNotes.push(saved);
    }
    closeModal();
    showToast('✅ تم حفظ النوتة اليومية');
    renderApp();
  } catch (e) {
    console.error(e);
    showToast('❌ فشل حفظ النوتة', 'error');
  } finally { hideLoading(); }
}

function openSpiritualNoteRules() {
  showModal(`
    <h3>⚙️ شروط أهلية النوتة للامتحان</h3>
    <div class="info-msg">يتم احتساب النسب تلقائيًا من الأيام المسجلة ولا يمكن إدخال نسب يدوية.</div>
    <div class="form-grid" style="margin-top:12px">
      <div><strong>قراءة الإنجيل والصلاة:</strong><br>65% على الأقل لكل شهر</div>
      <div><strong>قراءة الإنجيل والصلاة:</strong><br>21 يومًا على الأقل شهريًا لكل بند</div>
      <div><strong>التناول:</strong><br>مرتان على الأقل كل شهر</div>
      <div><strong>الاعتراف:</strong><br>مرة واحدة على الأقل كل شهر</div>
      <div><strong>عدم تقديم النوتة:</strong><br>عدم تقديمها لمدة 3 أشهر يمنع الأهلية</div>
      <div><strong>التعويض:</strong><br>يطبق بموافقة مسجلة من مسؤول معتمد</div>
    </div>
    <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>
  `);
}

function renderAdminReports() {
  const reports = [
    ['general', '👥', 'التقرير العام للطلاب والدفعات والكتب'],
    ['studentFile', '📁', 'تقرير ملف الطالب والسجل الأكاديمي'],
    ['attendance', '📋', 'تقرير الحضور والغياب'],
    ['eligibility', '✅', 'تقرير أهلية الامتحانات'],
    ['dailyNote', '📔', 'تقرير النوتة الروحية اليومية'],
    ['monthlyNote', '📅', 'تقرير النوتة الشهرية لكل طالب'],
    ['termNote', '📊', 'تقرير النوتة الفصلية والنسب الإجمالية'],
    ['sacraments', '🕯️', 'تقرير الاعتراف والتناول'],
    ['mass', '⛪', 'تقرير حضور القداس والتسبحة'],
    ['assignments', '📝', 'تقرير الواجبات والأبحاث وحالة التسليم'],
    ['servicePreparation', '🎓', 'تقرير تقييم وتحضير دروس الخدمة'],
    ['coursework', '📈', 'تقرير أعمال السنة'],
    ['biblicalCompetition', '📖', 'تقرير مسابقات الكتاب المقدس'],
    ['curriculumCompetition', '🏆', 'تقرير مسابقات كتاب المنهج'],
    ['coptic', '🔤', 'تقرير اللغة القبطية'],
    ['morningPrayer', '🌅', 'تقرير تسميع صلاة باكر'],
    ['exams', '✍️', 'تقرير الامتحانات والنتائج'],
    ['failedRetried', '🔄', 'تقرير الراسبين والمعيدين'],
    ['transfers', '↔️', 'تقرير انتقالات الطلاب بين الدفعات والكتب'],
    ['servants', '👨‍🏫', 'تقرير الخدام والتكليفات والتقييمات'],
    ['decisions', '⚖️', 'تقرير القرارات والاستثناءات'],
    ['gradeChanges', '✏️', 'تقرير تعديل الدرجات والصلاحيات والاعتمادات'],
    ['imports', '📥', 'تقرير عمليات الاستيراد من Excel'],
    ['sync', '🔧', 'تقرير الأعطال والمزامنة والتغييرات']
  ];
  return `
    <div class="card">
      <div class="flex-between mb-2">
        <div class="card-title">🖨️ قائمة التقارير المعتمدة</div>
        <button class="btn btn-outline btn-sm" onclick="printAllReports()">📄 طباعة الكشاف العام</button>
      </div>
      <div class="gold-line"></div>
      <div class="reports-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:16px">
        ${reports.map(([type, icon, title], index) => `
          <div class="report-section" style="margin:0;padding:14px">
            <div style="font-weight:700;margin-bottom:10px"><span style="color:#b89120">${index + 1}</span> ${icon} ${Helpers.escapeHtml(title)}</div>
            <button class="btn btn-gold btn-sm" onclick="printSystemReport('${type}')">🖨️ عرض وطباعة</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
function renderSystemManagement() {
  return `
    <div class="card mb-2">
      <div class="card-title">🔑 تغيير كلمة مرور المسؤول</div>
      <div class="gold-line"></div>
      <div class="form-group"><label>كلمة المرور الحالية *</label><input type="password" id="adminCurrentPassword"></div>
      <div class="form-grid">
        <div class="form-group"><label>كلمة المرور الجديدة *</label><input type="password" id="adminNewPassword" placeholder="6 أحرف على الأقل"></div>
        <div class="form-group"><label>تأكيد كلمة المرور *</label><input type="password" id="adminConfirmPassword"></div>
      </div>
      <button class="btn btn-primary" onclick="changeAdminPassword()">🔑 تغيير كلمة المرور</button>
    </div>
    
    <div class="card mb-2">
      <div class="card-title">💾 النسخ الاحتياطي</div>
      <div class="gold-line"></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="icon">👥</div><div class="num">${AppData.students.length}</div><div class="lbl">دارس</div></div>
        <div class="stat-card"><div class="icon">👨‍🏫</div><div class="num">${AppData.servants.length}</div><div class="lbl">خادم</div></div>
        <div class="stat-card"><div class="icon">📋</div><div class="num">${AppData.attendance.length}</div><div class="lbl">حضور</div></div>
        <div class="stat-card"><div class="icon">📊</div><div class="num">${AppData.evaluations.length}</div><div class="lbl">تقييم</div></div>
      </div>
      <div class="flex gap-1 mt-2" style="flex-wrap:wrap;">
        <button class="btn btn-success" onclick="backupFullData()">💾 إنشاء نسخة احتياطية</button>
        <button class="btn btn-outline" onclick="document.getElementById('restoreFile').click()">📥 استعادة</button>
        <input type="file" id="restoreFile" accept=".json" style="display:none" onchange="restoreFullData(this)">
      </div>
    </div>
    
    <div class="card mb-2">
      <div class="card-title">📤 تصدير البيانات</div>
      <div class="gold-line"></div>
      <div class="flex gap-1" style="flex-wrap:wrap;">
        <button class="btn btn-gold" onclick="exportStudentsExcel()">📊 الدارسين</button>
        <button class="btn btn-gold" onclick="exportAllGradesExcel()">📊 الدرجات الكاملة</button>
        <button class="btn btn-gold" onclick="exportServantsExcel()">📊 الخدام</button>
        <button class="btn btn-gold" onclick="exportAttendanceExcel()">📊 الحضور</button>
        <button class="btn btn-gold" onclick="exportEvaluationsExcel()">📊 أعمال السنة</button>
        <button class="btn btn-gold" onclick="exportExamsExcel()">📊 الامتحانات</button>
        <button class="btn btn-print" onclick="exportPDF()">📄 PDF</button>
      </div>
    </div>

    <div class="card mb-2">
      <div class="card-title">📚 مواد كتاب المنهج</div>
      <div class="gold-line"></div>
      <div class="info-msg">المواد الافتراضية تخص الكتاب الأول والثالث. كل امتحان افتراضيًا من 30 سؤالًا. يمكن تخصيص أي مادة لكتاب واحد أو أكثر، وتحديد دخولها في المجموع والمسابقات.</div>
      <div id="curriculumSubjectsEditor" style="display:grid;gap:10px;margin-top:14px">
        ${AppData.subjects.map((subject, index) => `
          <div class="curriculum-subject-row" style="display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(220px,1fr) 90px repeat(2,auto) auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--border-color);border-radius:10px">
            <input type="text" class="subject-name" value="${Helpers.escapeHtml(subject.label || '')}" placeholder="اسم المادة" data-index="${index}">
            <select class="subject-books" multiple size="2" data-index="${index}" title="الكتب المرتبطة بالمادة">
              ${STUDY_BOOKS.map(book => `<option value="${book}" ${subject.books?.includes(book) ? 'selected' : ''}>${book}</option>`).join('')}
            </select>
            <input type="number" class="subject-exam-questions" min="1" value="${parseInt(subject.examQuestions) || 30}" title="عدد أسئلة الامتحان">
            <label><input type="checkbox" class="subject-count-total" ${subject.countInTotal !== false ? 'checked' : ''}> تدخل في المجموع</label>
            <label><input type="checkbox" class="subject-competition" ${subject.competition !== false ? 'checked' : ''}> تدخل في المسابقة</label>
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.curriculum-subject-row').remove()">🗑️</button>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-outline mt-2" type="button" onclick="addCurriculumSubject()">➕ إضافة مادة أخرى</button>
    </div>
    
    <div class="card mb-2">
      <div class="card-title">⚖️ إعداد درجات أعمال السنة والبونص</div>
      <div class="gold-line"></div>
      <div class="info-msg">المكونات الأساسية 100% هي مجموع خمسة بنود × 20%. البونص يضاف حتى 20% إلى الحد الأقصى 120%.</div>
      <div class="form-grid">
        ${CourseworkEngine.types().map(item => `<div class="form-group"><label>${Helpers.escapeHtml(item.label)}</label><input type="number" class="coursework-core-setting" data-key="${item.key}" min="0" max="100" value="${item.max}"></div>`).join('')}
      </div>
      <div class="section-header mt-2">➕ بنود البونص القابلة للضبط</div>
      <div class="form-grid">
        ${CourseworkEngine.bonusItems().map(item => `<div class="form-group"><label>${Helpers.escapeHtml(item.label)}</label><input type="number" class="coursework-bonus-setting" data-key="${item.key}" min="0" max="20" value="${item.max}"></div>`).join('')}
      </div>
      <div class="info-msg" id="courseworkWeightsMessage"></div>
    </div>

    <div class="card mb-2">
      <div class="card-title">📅 إعدادات الترم</div>
      <div class="gold-line"></div>
      <div class="form-grid">
        <div class="form-group"><label>اسم المركز</label><input type="text" id="setCenterName" value="${AppData.settings.centerName || ''}"></div>
        <div class="form-group"><label>الشعار</label><input type="text" id="setSlogan" value="${AppData.settings.slogan || ''}"></div>
        <div class="form-group"><label>بداية الترم</label><input type="date" id="settingsStart" value="${AppData.settings.termStart || ''}"></div>
        <div class="form-group"><label>نهاية الترم</label><input type="date" id="settingsEnd" value="${AppData.settings.termEnd || ''}"></div>
        <div class="form-group"><label>عدد الأسابيع</label><input type="number" id="settingsWeeks" value="${AppData.settings.totalWeeks || 15}" min="1" max="30"></div>
        <div class="form-group"><label>الأسبوع الحالي</label><input type="number" id="settingsCurrentWeek" value="${AppData.settings.currentWeek || 1}" min="1" max="30"></div>
        <div class="form-group"><label>عدد أعمال السنة</label><input type="number" id="settingsTotalEval" value="${AppData.settings.totalEvaluations || 10}" min="1" max="30"></div>
      </div>
      <button class="btn btn-primary mt-2" onclick="saveSettings()">💾 حفظ الإعدادات</button>
    </div>

    <div class="card mb-2">
      <div class="card-title">📋 سياسة الحضور والأهلية</div>
      <div class="gold-line"></div>
      <div class="info-msg">تُحفظ نسخ السياسة عند كل تعديل، ولا يعاد حساب السجلات القديمة تلقائيًا.</div>
      <div class="form-grid">
        <div class="form-group"><label>نسبة الأهلية الأعلى من</label><input type="number" id="attendanceEligibility" min="0" max="100" value="${AppData.settings.attendancePolicy?.eligibilityPercent ?? ATTENDANCE_POLICY_DEFAULT.eligibilityPercent}">%</div>
        <div class="form-group"><label>الغياب المتقطع للتنبيه</label><input type="number" id="attendanceInterrupted" min="1" value="${AppData.settings.attendancePolicy?.warningInterrupted ?? 7}"></div>
        <div class="form-group"><label>الغياب المتتالي للتنبيه</label><input type="number" id="attendanceConsecutive" min="1" value="${AppData.settings.attendancePolicy?.warningConsecutive ?? 4}"></div>
        <div class="form-group"><label>لحظة ربع غياب - المحاضرة الأولى</label><input type="time" id="lecture1Quarter" value="${AppData.settings.attendancePolicy?.lecture1?.quarterAfter || '18:30'}"></div>
        <div class="form-group"><label>غياب المحاضرة الأولى</label><input type="time" id="lecture1Absent" value="${AppData.settings.attendancePolicy?.lecture1?.absenceAt || '19:00'}"></div>
        <div class="form-group"><label>لحظة ربع غياب - المحاضرة الثانية</label><input type="time" id="lecture2Quarter" value="${AppData.settings.attendancePolicy?.lecture2?.quarterAfter || '19:30'}"></div>
        <div class="form-group"><label>غياب المحاضرة الثانية</label><input type="time" id="lecture2Absent" value="${AppData.settings.attendancePolicy?.lecture2?.absenceAt || '20:00'}"></div>
        <div class="form-group"><label>طريقة اللحظة الفاصلة</label><select id="attendanceBoundary"><option value="after" ${(AppData.settings.attendancePolicy?.compareBoundary || 'after') === 'after' ? 'selected' : ''}>تدخل في الفترة التالية (بعد الدقيقة المحددة)</option><option value="at" ${(AppData.settings.attendancePolicy?.compareBoundary) === 'at' ? 'selected' : ''}>تدخل في الفترة عند الدقيقة المحددة</option></select></div>
        <div class="form-group"><label>وزن الحضور في اليوم</label><input type="number" id="attendanceWeight" min="0" max="100" value="${AppData.settings.attendancePolicy?.attendanceWeight ?? 50}">%</div>
        <div class="form-group"><label>وزن الأسئلة في اليوم</label><input type="number" id="questionsWeight" min="0" max="100" value="${AppData.settings.attendancePolicy?.questionsWeight ?? 50}">%</div>
      </div>
      <button class="btn btn-primary mt-2" onclick="saveAttendancePolicy()">💾 اعتماد نسخة السياسة</button>
      <button class="btn btn-outline mt-2" onclick="viewAttendancePolicyHistory()">📜 نسخ السياسات السابقة</button>
    </div>
    
    <div class="danger-zone">
      <h3>🚨 إعادة ضبط النظام</h3>
      <div class="danger-msg">⚠️ <strong>تحذير!</strong> هذه العمليات لا يمكن التراجع عنها.</div>
      <h4 style="margin-top:16px;">اختر ما تريد حذفه:</h4>
      <label class="danger-checkbox"><input type="checkbox" id="del_students"><span>👨‍🎓 <strong>جميع الدارسين</strong> (${AppData.students.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_servants"><span>👨‍🏫 <strong>جميع الخدام</strong> (${AppData.servants.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_attendance"><span>📋 <strong>جميع بيانات الحضور</strong> (${AppData.attendance.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_evaluations"><span>📊 <strong>جميع أعمال السنة</strong> (${AppData.evaluations.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_exams"><span>🎓 <strong>جميع درجات الامتحانات</strong> (${AppData.exams.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_notes"><span>📔 <strong>جميع ملاحظات النوتة الروحية</strong> (${AppData.visitationNotes.length})</span></label>
      <label class="danger-checkbox"><input type="checkbox" id="del_logs"><span>📜 <strong>سجل العمليات</strong> (${AppData.logs.length})</span></label>
      <div class="form-group mt-3">
        <label>اكتب "<strong>تأكيد الحذف</strong>" للمتابعة:</label>
        <input type="text" id="confirmDelete" placeholder="تأكيد الحذف">
      </div>
      <button class="btn btn-danger btn-lg" onclick="executeSystemReset()">🚨 تنفيذ الحذف</button>
    </div>
  `;
}

/* ============================================================
   EVENT HANDLERS
   ============================================================ */
async function handleLogin(role) {
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.style.display = 'none';
  try {
    showLoading('جارٍ التحقق...');
    const email = role === 'student'
      ? document.getElementById('studentEmail')?.value.trim()
      : role === 'servant'
        ? document.getElementById('servantEmail')?.value.trim()
        : document.getElementById('adminUsername')?.value.trim();
    const password = role === 'student'
      ? document.getElementById('studentPassword')?.value
      : role === 'servant'
        ? document.getElementById('servantPassword')?.value
        : document.getElementById('adminPassword')?.value;
    if (!email || !password) { hideLoading(); showLoginError('أدخل البريد الإلكتروني وكلمة المرور'); return; }
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userSnapshot = await getDoc(doc(db, 'users', credential.user.uid));
    const profile = userSnapshot.exists() ? userSnapshot.data() : null;
    if (!profile || profile.active === false) {
      await signOut(auth);
      const reason = profile === null
        ? `الحساب مسجل في Authentication ولكن لا يوجد مستند Firestore بالمفتاح UID التالي:\n${credential.user.uid}`
        : 'ملف المستخدم موجود، لكن الحقل active ليس true.';
      showLoginError(reason);
      return;
    }
    const adminRoles = ['service_admin', 'control_admin', 'priest', 'monitor', 'admin'];
    const roleMatches = role === 'admin' ? adminRoles.includes(profile.role) : profile.role === role;
    if (!roleMatches) { await signOut(auth); showLoginError('نوع الحساب لا يطابق صفحة الدخول'); return; }
    const profileId = profile.profileId;
    const data = profile.role === 'student'
      ? AppData.students.find(s => s.id === profileId || s.uid === credential.user.uid) || { id: profileId, name: profile.name, uid: credential.user.uid }
      : profile.role === 'servant'
        ? AppData.servants.find(s => s.id === profileId || s.uid === credential.user.uid) || { id: profileId, name: profile.name, uid: credential.user.uid }
        : { ...profile, id: credential.user.uid, name: profile.name };
    State.setUser({ type: role, role: profile.role, data });
    await AppData.loadAll();
    const loadedProfile = profile.role === 'student'
      ? AppData.students.find(s => s.id === profileId || s.uid === credential.user.uid)
      : AppData.servants.find(s => s.id === profileId || s.uid === credential.user.uid);
    if (loadedProfile) {
      State.currentUser.data = loadedProfile;
      DB.setSession(State.currentUser);
    }
    await SessionTracker.startSession({ type: role, role: profile.role, data });
    State.setPage('dashboard');
    showToast('مرحباً بك في نظام إعداد الخدام');
  } catch (e) {
    console.error(e);
    if (e?.code === 'permission-denied' || e?.code === 'unavailable') {
      showLoginError('تعذّر الاتصال بقاعدة البيانات. عطّل مانع الإعلانات لهذه الصفحة أو تحقق من اتصال الإنترنت.');
    } else if (e?.code === 'auth/user-not-found' || e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
      showLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } else {
      showLoginError('حدث خطأ أثناء تسجيل الدخول');
    }
  }
  finally { hideLoading(); }
}
function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function switchLoginTab(role) {
  const c = document.getElementById('loginFormContainer');
  document.querySelectorAll('#loginTabs button').forEach(t => t.classList.remove('active'));
  document.querySelector(`#loginTabs button[data-role="${role}"]`).classList.add('active');
  if (role === 'student') c.innerHTML = renderStudentLoginForm();
  else if (role === 'servant') c.innerHTML = renderServantLoginForm();
  else if (role === 'admin') c.innerHTML = renderAdminLoginForm();
  const err = document.getElementById('loginError');
  if (err) err.style.display = 'none';
}

async function changeWeek(w) {
  AppData.settings.currentWeek = parseInt(w);
  await DB.setSettings(AppData.settings);
  renderApp();
}

function markAllPresent() {
  document.querySelectorAll('select[name$="_lecture_1"], select[name$="_lecture_2"]').forEach(select => { if (!select.disabled) select.value = 'present'; });
  document.querySelectorAll('input[type="radio"][value="present"]').forEach(r => { if (!r.disabled) r.checked = true; });
  showToast('✅ تم تحديد الجميع كحاضر', 'info');
}
function markAllAbsent() {
  document.querySelectorAll('select[name$="_lecture_1"], select[name$="_lecture_2"]').forEach(select => { if (!select.disabled) select.value = 'absent'; });
  document.querySelectorAll('input[type="radio"][value="absent"]').forEach(r => { if (!r.disabled) r.checked = true; });
  showToast('⚠️ تم تحديد الجميع كغائب', 'warning');
}

async function saveAttendanceBulk(week) {
  const records = [];
  const studentIds = new Set(Array.from(document.querySelectorAll('select[name^="att_"][name$="_lecture_1"]')).map(input => input.name.split('_lecture_')[0].replace('att_', '')));
  if (!studentIds.size) {
    document.querySelectorAll('input[type="radio"][name^="att_"]:checked:not(:disabled)').forEach(input => studentIds.add(input.name.replace('att_', '')));
  }
  if (!studentIds.size) { showToast('⚠️ لم يتم تحديد أي طالب', 'warning'); return; }
  studentIds.forEach(studentId => {
    const reason = document.querySelector(`input[name="att_reason_${studentId}"]`)?.value.trim() || '';
    [1, 2].forEach(lecture => {
      const select = document.querySelector(`select[name="att_${studentId}_lecture_${lecture}"]`);
      if (select && !select.disabled) {
        records.push({
          studentId, week, studyDay: week, lecture, status: select.value, type: 'attendance',
          changeReason: reason, policyVersion: AppData.settings.attendancePolicy?.version || 1,
          changedBy: State.currentUser?.data?.name || 'System', changedAt: new Date().toISOString()
        });
      }
    });
  });
  try {
    showLoading(`جارٍ حفظ ${records.length} سجل...`);
    await DB.saveAttendanceBulk(records);
    for (const record of records) {
      await DB.addLog({
        action: 'تعديل حضور',
        studentId: record.studentId,
        details: `الأسبوع ${record.week} - المحاضرة ${record.lecture}: ${AttendanceEngine.statusLabel(record.status)}${record.changeReason ? ` - السبب: ${record.changeReason}` : ''}`,
        policyVersion: record.policyVersion
      });
    }
    records.forEach(r => {
      const idx = AppData.attendance.findIndex(a => a.studentId === r.studentId && a.week === r.week && Number(a.lecture) === Number(r.lecture) && a.type === 'attendance');
      if (idx !== -1) AppData.attendance[idx] = { ...AppData.attendance[idx], ...r };
      else AppData.attendance.push(r);
    });
    showToast(`✅ تم حفظ ${records.length} سجل حضور`);
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

async function saveQuickEvaluations(subject, week) {
  const inputs = document.querySelectorAll('.quick-eval-input');
  const records = [];
  inputs.forEach(input => {
    const score = parseInt(input.value);
    if (!isNaN(score) && score >= 1 && score <= 10) records.push({ studentId: input.dataset.student, subject, week, score });
  });
  if (records.length === 0) { showToast('⚠️ لا توجد درجات', 'warning'); return; }
  try {
    showLoading(`جارٍ حفظ ${records.length} تقييم...`);
    await DB.saveEvaluationsBulk(records);
    records.forEach(r => {
      const idx = AppData.evaluations.findIndex(e => e.studentId === r.studentId && e.subject === r.subject && e.week === r.week);
      if (idx !== -1) AppData.evaluations[idx] = { ...AppData.evaluations[idx], ...r };
      else AppData.evaluations.push(r);
    });
    showToast(`✅ تم حفظ ${records.length} تقييم`);
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

async function saveCourseworkEvaluations(selectedType, week) {
  const bonus = CourseworkEngine.bonusItems().find(item => item.key === selectedType);
  const core = CourseworkEngine.types().find(item => item.key === selectedType);
  const deduction = selectedType === '__deduction__';
  const item = bonus || core;
  const max = deduction ? 20 : (item?.max || 20);
  const records = [];
  let missingDeductionReason = false;
  document.querySelectorAll('.coursework-score-input').forEach(input => {
    const score = CourseworkEngine.safeScore(input.value, max);
    if (!input.value && input.value !== '0') return;
    const note = document.querySelector(`.coursework-note-input[data-student="${input.dataset.student}"]`)?.value.trim() || '';
    if (deduction && score > 0 && !note) {
      missingDeductionReason = true;
    }
    records.push({
      studentId: input.dataset.student,
      subject: 'coursework',
      courseworkType: selectedType,
      week,
      score,
      maxScore: max,
      note,
      isBonus: Boolean(bonus) && !deduction,
      isDeduction: deduction,
      componentLabel: deduction ? 'خصم أعمال السنة' : item?.label || selectedType,
      updatedAt: new Date().toISOString()
    });
  });
  if (missingDeductionReason) {
    showToast('سبب الخصم مطلوب عند إدخال درجة خصم', 'error');
    return;
  }
  if (!records.length) { showToast('لا توجد درجات للحفظ', 'warning'); return; }
  try {
    await DB.saveEvaluationsBulk(records);
    records.forEach(record => {
      const index = AppData.evaluations.findIndex(e => String(e.studentId) === String(record.studentId) && e.week === record.week && e.courseworkType === record.courseworkType && Boolean(e.isDeduction) === record.isDeduction);
      if (index >= 0) AppData.evaluations[index] = { ...AppData.evaluations[index], ...record };
      else AppData.evaluations.push(record);
    });
    await DB.addLog({ action: 'تسجيل تقييم أعمال سنة', details: `${item?.label || 'خصم أعمال سنة'} - الأسبوع ${week} - عدد السجلات ${records.length}` });
    showToast('✅ تم حفظ تقييمات أعمال السنة');
    renderApp();
  } catch (error) { console.error(error); showToast('فشل حفظ التقييمات', 'error'); }
}

async function saveExamsBulk(subject) {
  const inputs = document.querySelectorAll('.exam-input');
  const records = [];
  inputs.forEach(input => {
    const score = parseFloat(input.value);
    if (!isNaN(score) && score >= 0 && score <= 100) records.push({ studentId: input.dataset.student, subject, score, examType: 'final', maxScore: 100 });
  });
  if (records.length === 0) { showToast('⚠️ لا توجد درجات', 'warning'); return; }
  try {
    showLoading(`جارٍ حفظ ${records.length} امتحان...`);
    await DB.saveExamsBulk(records);
    records.forEach(r => {
      const idx = AppData.exams.findIndex(e => e.studentId === r.studentId && e.subject === r.subject && e.examType === r.examType);
      if (idx !== -1) AppData.exams[idx] = { ...AppData.exams[idx], ...r };
      else AppData.exams.push(r);
    });
    showToast(`✅ تم حفظ ${records.length} امتحان`);
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

async function changeServantPassword(id) {
  const s = AppData.servants.find(x => x.id === id);
  if (!s?.email) return showToast('لا يوجد بريد موثق لهذا الحساب', 'error');
  await sendServantResetLink(s.email);
}

async function changeAdminPassword() {
  const current = document.getElementById('adminCurrentPassword').value.trim();
  const newPass = document.getElementById('adminNewPassword').value.trim();
  const confirmPass = document.getElementById('adminConfirmPassword').value.trim();
  const admin = State.currentUser?.data;
  if (!admin) return;
  if (!current) { showToast('⚠️ أدخل كلمة المرور الحالية', 'error'); return; }
  if (current !== admin.password) { showToast('❌ كلمة المرور الحالية غير صحيحة', 'error'); return; }
  if (!newPass || newPass.length < 6) { showToast('⚠️ 6 أحرف على الأقل', 'error'); return; }
  if (newPass !== confirmPass) { showToast('⚠️ غير متطابقتين', 'error'); return; }
  try {
    showLoading('جارٍ التغيير...');
    await setDoc(doc(db, COLLECTIONS.ADMINS, admin.id), { password: newPass, updatedAt: serverTimestamp() }, { merge: true });
    admin.password = newPass;
    State.currentUser.data.password = newPass;
    DB.setSession(State.currentUser);
    document.getElementById('adminCurrentPassword').value = '';
    document.getElementById('adminNewPassword').value = '';
    document.getElementById('adminConfirmPassword').value = '';
    showToast('✅ تم تغيير كلمة المرور');
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

function updateDeaconOptions(p) {
  const g = document.getElementById(`${p}StudentGender`).value;
  const sel = document.getElementById(`${p}StudentDeacon`);
  const cur = sel.value;
  sel.innerHTML = `<option value="">-- اختر --</option><option value="أبصالطس">أبصالطس</option><option value="أغنسطس">أغنسطس</option><option value="لم يتم الرسامة">لم يتم الرسامة</option>${g === 'أنثى' ? '<option value="غير مطلوب">غير مطلوب</option>' : ''}`;
  if (cur) sel.value = cur;
}

/* ============================================================
   ✅ استمارة إضافة دارس جديدة شاملة (8 أقسام)
   ============================================================ */
async function openAddStudentModal() {
  showLoading('جارٍ توليد الكود...');
  try {
    const code = await DB.generateStudentCode();
    hideLoading();
    const curUser = State.currentUser;
    let adderName = 'غير محدد';
    if (curUser?.type === 'servant') adderName = curUser.data.name;
    else if (curUser?.type === 'admin') adderName = curUser.data.name || 'الأدمن';
    
    showModal(`
      <h3>👤 إضافة دارس جديد</h3>
      
      <div class="code-display">
        <div class="code-label">كود الدارس (تلقائي)</div>
        <div class="code-value" id="newStudentCodeDisplay">${code}</div>
        <div class="code-actions">
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);" onclick="copyToClipboard('${code}')">📋 نسخ</button>
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);" onclick="regenerateStudentCode()">🔄 تغيير</button>
        </div>
      </div>
      
      <div class="info-msg" style="font-size:0.82rem;">
        📌 <strong>سيتم تسجيل الدارس باسمك:</strong> ${adderName}
      </div>
      
      <input type="hidden" id="addStudentCode" value="${code}">
      
      <div class="form-section">
        <div class="section-header">📋 البيانات الشخصية</div>
        <div class="form-group">
          <label>الاسم الكامل *</label>
          <input type="text" id="addStudentName" placeholder="أدخل اسم الدارس بالكامل">
        </div>
        <div class="form-group">
          <label>البريد الإلكتروني *</label>
          <input type="email" id="addStudentEmail" autocomplete="email" placeholder="name@example.com">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>النوع *</label>
            <select id="addStudentGender" onchange="updateDeaconOptions('add')">
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </div>
          <div class="form-group">
            <label>تاريخ الميلاد</label>
            <input type="date" id="addStudentBirth">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>الرقم القومي</label>
            <input type="text" id="addStudentNationalId" placeholder="14 رقم" maxlength="14">
          </div>
          <div class="form-group">
            <label>المدرسة / الوظيفة</label>
            <input type="text" id="addStudentSchool" placeholder="اسم المدرسة أو الوظيفة">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">📚 البيانات الدراسية</div>
        <div class="form-grid">
          <div class="form-group">
            <label>السنة الدراسية *</label>
            <select id="addStudentSchoolYear">
              ${SCHOOL_YEARS.map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>دفعة التسجيل *</label>
            <select id="addStudentClassGroup">
              ${Array.from({ length: new Date().getFullYear() - 2016 }, (_, i) => 2017 + i).reverse().map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>السنة الدراسية في إعداد الخدام *</label>
            <select id="addStudentStage" onchange="updateStudyBookOptions('add')">
              ${Helpers.getTrainingYears().map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الكتاب الدراسي في إعداد الخدام *</label>
            <select id="addStudentClass">
              ${Helpers.getBooksForTrainingYear(Helpers.getTrainingYears()[0]).map(book => `<option value="${book}">${book}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>رتبة الشماسية</label>
            <select id="addStudentDeacon">
              <option value="">-- اختر --</option>
              <option value="أبصالطس">أبصالطس</option>
              <option value="أغنسطس">أغنسطس</option>
              <option value="لم يتم الرسامة">لم يتم الرسامة</option>
            </select>
          </div>
          <div class="form-group">
            <label>المستوى الدراسي</label>
            <select id="addStudentLevel">
              <option value="مبتدئ">مبتدئ</option>
              <option value="متوسط">متوسط</option>
              <option value="متقدم">متقدم</option>
              <option value="متفوق">متفوق</option>
            </select>
          </div>
          <div class="form-group">
            <label>حالة الدارس</label>
            <select id="addStudentAcademicStatus">
              ${Helpers.getStudentStatuses().map(status => `<option value="${status}" ${status === 'نشط' ? 'selected' : ''}>${status}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>نظام التسجيل</label>
            <select id="addStudentIsNew">
              <option value="جديد">نظام جديد</option>
              <option value="قديم">نظام قديم</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">📞 بيانات الاتصال</div>
        <div class="form-grid">
          <div class="form-group">
            <label>هاتف الدارس *</label>
            <input type="tel" id="addStudentPhone1" placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>هاتف ولي الأمر</label>
            <input type="tel" id="addStudentPhone2" placeholder="01xxxxxxxxx">
          </div>
        </div>
        <div class="form-group">
          <label>هاتف إضافي</label>
          <input type="tel" id="addStudentPhone3" placeholder="01xxxxxxxxx">
        </div>
        <div class="form-group">
          <label>العنوان بالتفصيل</label>
          <textarea id="addStudentAddress" rows="2" placeholder="المحافظة - المدينة - الشارع - رقم العقار"></textarea>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">👨‍👩‍👧 بيانات الأسرة</div>
        <div class="form-grid">
          <div class="form-group">
            <label>اسم الأب</label>
            <input type="text" id="addStudentFather" placeholder="اسم الأب">
          </div>
          <div class="form-group">
            <label>اسم الأم</label>
            <input type="text" id="addStudentMother" placeholder="اسم الأم">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>هاتف الأب</label>
            <input type="tel" id="addStudentFatherPhone" placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>هاتف الأم</label>
            <input type="tel" id="addStudentMotherPhone" placeholder="01xxxxxxxxx">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>عدد الأخوات</label>
            <input type="number" id="addStudentSiblings" min="0" value="0">
          </div>
          <div class="form-group">
            <label>ترتيب الدارس</label>
            <input type="number" id="addStudentOrder" min="1" value="1">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">⛪ البيانات الكنسية</div>
        <div class="form-group">
          <label>الكنيسة التابع لها</label>
          <input type="text" id="addStudentChurch" placeholder="اسم الكنيسة">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>الأب الكاهن المسؤول</label>
            <input type="text" id="addStudentPriest" placeholder="اسم الأب الكاهن">
          </div>
          <div class="form-group">
            <label>المنطقة الكنسية</label>
            <input type="text" id="addStudentChurchArea" placeholder="المنطقة">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">📎 المستندات</div>
        <div class="form-grid">
          <div class="form-group">
            <label>📷 الصورة الشخصية</label>
            <input type="file" id="addStudentPhoto" accept="image/*">
          </div>
          <div class="form-group">
            <label>📄 صورة الاستمارة</label>
            <input type="file" id="addStudentFormPhoto" accept="image/*">
          </div>
        </div>
        <div class="form-group">
          <label>📋 شهادة الميلاد</label>
          <input type="file" id="addStudentBirthCert" accept="image/*,application/pdf">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📘 البطاقة (وجه)</label>
            <input type="file" id="addStudentIdFront" accept="image/*">
          </div>
          <div class="form-group">
            <label>📘 البطاقة (ظهر)</label>
            <input type="file" id="addStudentIdBack" accept="image/*">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">✅ حالة الاستمارة والدفع</div>
        <div class="checkbox-group">
          <input type="checkbox" id="addStudentForm">
          <label>تم استلام الاستمارة الورقية</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="addStudentPaid">
          <label>تم دفع رسوم الاشتراك</label>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>المبلغ المدفوع</label>
            <input type="number" id="addStudentPaidAmount" min="0" value="0">
          </div>
          <div class="form-group">
            <label>تاريخ الدفع</label>
            <input type="date" id="addStudentPaidDate">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">📝 ملاحظات إضافية</div>
        <div class="form-group">
          <textarea id="addStudentNotes" rows="3" placeholder="أي ملاحظات إضافية..."></textarea>
        </div>
      </div>
      
      <div class="modal-actions" style="position:sticky;bottom:0;background:white;padding-top:16px;border-top:2px solid var(--gray-light);margin-top:20px;">
        <button class="btn btn-gold" onclick="saveNewStudent()" style="flex:1;">💾 حفظ الدارس</button>
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    `, 'lg');
  } catch (e) { 
    hideLoading(); 
    showToast('❌ فشل توليد الكود', 'error'); 
  }
}

async function regenerateStudentCode() {
  try {
    const c = await DB.generateStudentCode();
    document.getElementById('addStudentCode').value = c;
    document.getElementById('newStudentCodeDisplay').textContent = c;
    showToast('🔄 تم تغيير الكود');
  } catch (e) {}
}

function updateStudyBookOptions(mode = 'add') {
  const yearId = mode === 'edit' ? 'editStudentStage' : 'addStudentStage';
  const bookId = mode === 'edit' ? 'editStudentClass' : 'addStudentClass';
  const select = document.getElementById(bookId);
  if (!select) return;
  const selected = select.value;
  const books = Helpers.getBooksForTrainingYear(document.getElementById(yearId)?.value);
  select.innerHTML = books.map(book => `<option value="${book}" ${book === selected ? 'selected' : ''}>${book}</option>`).join('');
}

function copyToClipboard(text) { navigator.clipboard.writeText(text).then(() => showToast('📋 تم النسخ')); }

async function saveNewStudent() {
  const code = document.getElementById('addStudentCode').value.trim().toUpperCase();
  const name = document.getElementById('addStudentName').value.trim();
  const email = document.getElementById('addStudentEmail').value.trim().toLowerCase();
  const phone1 = document.getElementById('addStudentPhone1').value.trim();
  
  if (!name) { showToast('⚠️ أدخل اسم الدارس', 'error'); return; }
  if (!email || !email.includes('@')) { showToast('⚠️ أدخل بريدًا إلكترونيًا صحيحًا', 'error'); return; }
  if (!phone1) { showToast('⚠️ أدخل هاتف الدارس', 'error'); return; }
  if (!code || !CodeGenerator.isValidStudentCode(code)) { showToast('❌ الكود غير صالح', 'error'); return; }

  try {
    const allCodes = await DB.getAllCodes();
    if (allCodes.has(code)) { showToast('❌ الكود مستخدم', 'error'); await regenerateStudentCode(); return; }

    const cur = State.currentUser;
    let addedByName = 'غير محدد', addedByType = '';
    if (cur?.type === 'servant') { addedByName = cur.data.name; addedByType = 'خادم'; }
    else if (cur?.type === 'admin') { addedByName = cur.data.name || 'الأدمن'; addedByType = 'مسؤول'; }

    showLoading('جارٍ حفظ الدارس...');
    
    const secondaryCredential = await createUserWithEmailAndPassword(studentRegistrationAuth, email, code);
    const studentUid = secondaryCredential.user.uid;
    await signOut(studentRegistrationAuth);
    await setDoc(doc(db, 'users', studentUid), {
      active: true,
      role: 'student',
      name,
      email,
      profileId: code,
      createdAt: serverTimestamp()
    });

    const student = {
      id: code, name, email, uid: studentUid, type: 'جديد',
      gender: document.getElementById('addStudentGender').value,
      birthdate: document.getElementById('addStudentBirth').value,
      nationalId: document.getElementById('addStudentNationalId').value.trim(),
      school: document.getElementById('addStudentSchool').value.trim(),
      schoolYear: document.getElementById('addStudentSchoolYear').value,
      stage: document.getElementById('addStudentSchoolYear').value,
      classGroup: document.getElementById('addStudentClassGroup').value,
      class: document.getElementById('addStudentClass').value,
      trainingYear: document.getElementById('addStudentStage').value,
      academicYear: document.getElementById('addStudentStage').value,
      batchYear: document.getElementById('addStudentClassGroup').value,
      studyBook: document.getElementById('addStudentClass').value,
      completedBooks: [],
      enrollmentDate: new Date().toISOString(),
      admission: { requestStatus: 'مسجل', interviewStatus: 'غير محدد', decision: 'قيد المتابعة' },
      photoUrl: '', documents: [], transferHistory: [], academicDecisions: [],
      academicRegistrations: [{
        id: createAcademicRecordId('registration'), type: 'registration', studentId: code,
        trainingYear: document.getElementById('addStudentStage').value,
        studyBook: document.getElementById('addStudentClass').value,
        batchYear: document.getElementById('addStudentClassGroup').value,
        status: 'نشط', createdAt: new Date().toISOString()
      }],
      bookAttempts: [{
        id: createAcademicRecordId('book-attempt'), type: 'book-attempt', studentId: code,
        trainingYear: document.getElementById('addStudentStage').value,
        studyBook: document.getElementById('addStudentClass').value,
        attemptNumber: 1, status: 'جارية', createdAt: new Date().toISOString()
      }],
      academicRecords: [{ id: createAcademicRecordId('history'), type: 'enrollment', label: 'التحاق بإعداد الخدام', createdAt: new Date().toISOString() }],
      status: document.getElementById('addStudentAcademicStatus').value,
      deaconRank: document.getElementById('addStudentDeacon').value,
      level: document.getElementById('addStudentLevel').value,
      isNew: document.getElementById('addStudentIsNew').value,
      phone1,
      phone2: document.getElementById('addStudentPhone2').value.trim(),
      phone3: document.getElementById('addStudentPhone3').value.trim(),
      address: document.getElementById('addStudentAddress').value.trim(),
      fatherName: document.getElementById('addStudentFather').value.trim(),
      motherName: document.getElementById('addStudentMother').value.trim(),
      fatherPhone: document.getElementById('addStudentFatherPhone').value.trim(),
      motherPhone: document.getElementById('addStudentMotherPhone').value.trim(),
      siblings: parseInt(document.getElementById('addStudentSiblings').value) || 0,
      order: parseInt(document.getElementById('addStudentOrder').value) || 1,
      church: document.getElementById('addStudentChurch').value.trim(),
      priest: document.getElementById('addStudentPriest').value.trim(),
      churchArea: document.getElementById('addStudentChurchArea').value.trim(),
      formReceived: document.getElementById('addStudentForm').checked,
      formPaid: document.getElementById('addStudentPaid').checked,
      paidAmount: parseFloat(document.getElementById('addStudentPaidAmount').value) || 0,
      paidDate: document.getElementById('addStudentPaidDate').value,
      notes: document.getElementById('addStudentNotes').value.trim(),
      addedByName, addedByType,
      addedAt: new Date().toISOString()
    };
    
    await DB.addStudent(student);
    AppData.students.push(student);
    DB.addLog({ action: 'إضافة دارس', target: name, details: `الكود: ${code} - بواسطة: ${addedByName}` });
    
    closeModal();
    showToast(`✅ تمت إضافة الدارس - الكود: ${code}`);
    renderApp();
  } catch (e) {
    console.error(e);
    const message = e?.code === 'auth/email-already-in-use'
      ? 'البريد الإلكتروني مسجل بالفعل'
      : e?.code === 'permission-denied'
        ? 'ليس لديك صلاحية إنشاء حساب الدارس'
        : e?.message || 'حدث خطأ غير متوقع';
    showToast('❌ فشل الحفظ: ' + message, 'error');
  } finally { hideLoading(); }
}

function openEditStudentModal(id) {
  const s = AppData.students.find(x => x.id === id);
  if (!s) return;
  showModal(`
    <h3>✏️ تعديل بيانات الدارس</h3>
    <div class="info-msg"><strong>الكود:</strong> ${s.id} • <strong>أضيف بواسطة:</strong> ${Helpers.getStudentAdder(s)}</div>
    
    <div class="form-section">
      <div class="section-header">📋 البيانات الشخصية</div>
      <div class="form-group"><label>الاسم الكامل</label><input type="text" id="editStudentName" value="${s.name || ''}"></div>
      <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="editStudentEmail" autocomplete="email" value="${s.email || ''}"></div>
      <div class="form-grid">
        <div class="form-group"><label>النوع</label><select id="editStudentGender"><option value="ذكر" ${s.gender === 'ذكر' ? 'selected' : ''}>ذكر</option><option value="أنثى" ${s.gender === 'أنثى' ? 'selected' : ''}>أنثى</option></select></div>
        <div class="form-group"><label>الميلاد</label><input type="date" id="editStudentBirth" value="${s.birthdate || ''}"></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>الرقم القومي</label><input type="text" id="editStudentNationalId" value="${s.nationalId || ''}" maxlength="14"></div>
        <div class="form-group"><label>المدرسة / الوظيفة</label><input type="text" id="editStudentSchool" value="${s.school || ''}"></div>
      </div>
    </div>
    
    <div class="form-section">
      <div class="section-header">📚 البيانات الدراسية</div>
      <div class="form-grid">
        <div class="form-group"><label>السنة الدراسية</label><select id="editStudentSchoolYear">${SCHOOL_YEARS.map(year => `<option value="${year}" ${year === (s.schoolYear || s.stage) ? 'selected' : ''}>${year}</option>`).join('')}</select></div>
        <div class="form-group"><label>دفعة التسجيل</label><select id="editStudentClassGroup">${Array.from({ length: new Date().getFullYear() - 2016 }, (_, i) => 2017 + i).reverse().map(year => `<option value="${year}" ${String(year) === String(s.batchYear || s.classGroup) ? 'selected' : ''}>${year}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>السنة الدراسية في إعداد الخدام</label><select id="editStudentStage" onchange="updateStudyBookOptions('edit')">${Helpers.getTrainingYears().map(year => `<option value="${year}" ${year === (s.trainingYear || s.academicYear) ? 'selected' : ''}>${year}</option>`).join('')}</select></div>
        <div class="form-group"><label>الكتاب الدراسي في إعداد الخدام</label><select id="editStudentClass">${Helpers.getBooksForTrainingYear(s.trainingYear || s.academicYear).map(book => `<option value="${book}" ${book === (s.studyBook || s.class) ? 'selected' : ''}>${book}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>رتبة الشماسية</label><select id="editStudentDeacon">${Helpers.getDeaconRanks(s.gender).map(r => `<option value="${r}" ${r === s.deaconRank ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="form-group"><label>حالة الدارس</label><select id="editStudentStatus">${Helpers.getStudentStatuses().map(status => `<option value="${status}" ${(s.status || 'نشط') === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
        <div class="form-group"><label>فترة التخرج (نيروز / ختام)</label><input type="text" id="editStudentGraduationName" value="${s.graduationName || ''}" placeholder="خريج نيروز - 2024"></div>
      </div>
      <div class="form-group"><label>الكتب المكتملة</label><div class="subjects-grid">${STUDY_BOOKS.map(book => `<label class="subject-checkbox"><input type="checkbox" class="edit-completed-book" value="${book}" ${(s.completedBooks || []).includes(book) ? 'checked' : ''}><span>${book}</span></label>`).join('')}</div><div class="info-msg">عند إكمال الكتب الأربعة ينتقل الدارس تلقائيًا إلى تبويب خريجي إعداد الخدام.</div></div>
      ${s.status === 'راسب' || s.status === 'مستكمل' ? `
      <div class="info-msg">📌 تم حفظ نتيجة المحاولة الحالية. عند إضافة إعادة، سيتم إنشاء محاولة جديدة دون حذف التقييمات والحضور والنوتة السابقة.</div>
      <div class="form-grid">
        <div class="form-group"><label>دفعة إعادة الدراسة</label><select id="editStudentRetryBatch">${Helpers.getBatchYears().map(year => `<option value="${year}" ${String(year) === String(s.retryBatchYear) ? 'selected' : ''}>دفعة ${year}</option>`).join('')}</select></div>
        <div class="form-group"><label>الترم</label><select id="editStudentRetryTerm"><option value="الترم الأول" ${s.retryTerm === 'الترم الأول' ? 'selected' : ''}>الترم الأول</option><option value="الترم الثاني" ${s.retryTerm === 'الترم الثاني' ? 'selected' : ''}>الترم الثاني</option></select></div>
      </div>` : ''}
    </div>
    
    <div class="form-section">
      <div class="section-header">📞 بيانات الاتصال</div>
      <div class="form-grid">
        <div class="form-group"><label>هاتف 1</label><input type="tel" id="editStudentPhone1" value="${s.phone1 || ''}"></div>
        <div class="form-group"><label>هاتف 2</label><input type="tel" id="editStudentPhone2" value="${s.phone2 || ''}"></div>
      </div>
      <div class="form-group"><label>العنوان</label><textarea id="editStudentAddress" rows="2">${s.address || ''}</textarea></div>
    </div>
    
    <div class="form-section">
      <div class="section-header">👨‍👩‍👧 بيانات الأسرة</div>
      <div class="form-grid">
        <div class="form-group"><label>اسم الأب</label><input type="text" id="editStudentFather" value="${s.fatherName || ''}"></div>
        <div class="form-group"><label>اسم الأم</label><input type="text" id="editStudentMother" value="${s.motherName || ''}"></div>
      </div>
    </div>
    
    <div class="form-section">
      <div class="section-header">⛪ البيانات الكنسية</div>
      <div class="form-group"><label>الكنيسة</label><input type="text" id="editStudentChurch" value="${s.church || ''}"></div>
      <div class="form-grid">
        <div class="form-group"><label>الأب الكاهن</label><input type="text" id="editStudentPriest" value="${s.priest || ''}"></div>
        <div class="form-group"><label>المنطقة</label><input type="text" id="editStudentChurchArea" value="${s.churchArea || ''}"></div>
      </div>
    </div>
    
    <div class="form-section">
      <div class="section-header">✅ حالة الاستمارة والدفع</div>
      <div class="checkbox-group"><input type="checkbox" id="editStudentForm" ${s.formReceived ? 'checked' : ''}><label>تم استلام الاستمارة</label></div>
      <div class="checkbox-group"><input type="checkbox" id="editStudentPaid" ${s.formPaid ? 'checked' : ''}><label>تم الدفع</label></div>
      <div class="form-grid">
        <div class="form-group"><label>المبلغ المدفوع</label><input type="number" id="editStudentPaidAmount" value="${s.paidAmount || 0}" min="0"></div>
        <div class="form-group"><label>تاريخ الدفع</label><input type="date" id="editStudentPaidDate" value="${s.paidDate || ''}"></div>
      </div>
    </div>
    
    <div class="form-section">
      <div class="section-header">📝 ملاحظات</div>
      <div class="form-group"><textarea id="editStudentNotes" rows="3">${s.notes || ''}</textarea></div>
    </div>
    
    <div class="modal-actions" style="position:sticky;bottom:0;background:white;padding-top:16px;border-top:2px solid var(--gray-light);">
      <button class="btn btn-gold" onclick="updateStudentData('${s.id}')" style="flex:1;">💾 حفظ التعديلات</button>
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
    </div>
  `, 'lg');
}

async function updateStudentData(id) {
  const existingStudent = AppData.students.find(student => student.id === id) || {};
  const completedBooks = Array.from(document.querySelectorAll('.edit-completed-book:checked')).map(input => input.value);
  const isGraduated = STUDY_BOOKS.every(book => completedBooks.includes(book));
  const updates = {
    name: document.getElementById('editStudentName').value.trim(),
    email: document.getElementById('editStudentEmail').value.trim().toLowerCase(),
    gender: document.getElementById('editStudentGender').value,
    birthdate: document.getElementById('editStudentBirth').value,
    nationalId: document.getElementById('editStudentNationalId').value.trim(),
    school: document.getElementById('editStudentSchool').value.trim(),
    schoolYear: document.getElementById('editStudentSchoolYear').value,
    stage: document.getElementById('editStudentSchoolYear').value,
    classGroup: document.getElementById('editStudentClassGroup').value,
    class: document.getElementById('editStudentClass').value,
    trainingYear: document.getElementById('editStudentStage').value,
    academicYear: document.getElementById('editStudentStage').value,
    batchYear: document.getElementById('editStudentClassGroup').value,
    studyBook: document.getElementById('editStudentClass').value,
    status: isGraduated ? 'خريج' : document.getElementById('editStudentStatus').value,
    completedBooks,
    isGraduate: isGraduated,
    graduationName: document.getElementById('editStudentGraduationName').value.trim(),
    retryBatchYear: document.getElementById('editStudentRetryBatch')?.value || existingStudent.retryBatchYear || '',
    retryTerm: document.getElementById('editStudentRetryTerm')?.value || existingStudent.retryTerm || '',
    deaconRank: document.getElementById('editStudentDeacon').value,
    phone1: document.getElementById('editStudentPhone1').value.trim(),
    phone2: document.getElementById('editStudentPhone2').value.trim(),
    address: document.getElementById('editStudentAddress').value.trim(),
    fatherName: document.getElementById('editStudentFather').value.trim(),
    motherName: document.getElementById('editStudentMother').value.trim(),
    church: document.getElementById('editStudentChurch').value.trim(),
    priest: document.getElementById('editStudentPriest').value.trim(),
    churchArea: document.getElementById('editStudentChurchArea').value.trim(),
    formReceived: document.getElementById('editStudentForm').checked,
    formPaid: document.getElementById('editStudentPaid').checked,
    paidAmount: parseFloat(document.getElementById('editStudentPaidAmount').value) || 0,
    paidDate: document.getElementById('editStudentPaidDate').value,
    notes: document.getElementById('editStudentNotes').value.trim()
  };
  if (!updates.name) { showToast('⚠️ أدخل الاسم', 'error'); return; }
  if (!updates.email || !updates.email.includes('@')) { showToast('⚠️ أدخل بريدًا إلكترونيًا صحيحًا', 'error'); return; }
  try {
    showLoading('جارٍ الحفظ...');
    const now = new Date().toISOString();
    const previousTrainingYear = existingStudent.trainingYear || existingStudent.academicYear || existingStudent.stage || '';
    const previousBook = existingStudent.studyBook || existingStudent.class || '';
    const registrationHistory = Array.isArray(existingStudent.academicRegistrations) ? [...existingStudent.academicRegistrations] : [];
    const lastRegistration = registrationHistory[registrationHistory.length - 1];
    if (!lastRegistration || lastRegistration.trainingYear !== updates.trainingYear || lastRegistration.studyBook !== updates.studyBook || String(lastRegistration.batchYear) !== String(updates.batchYear)) {
      registrationHistory.push({
        id: createAcademicRecordId('registration'), type: 'registration', studentId: id,
        trainingYear: updates.trainingYear, studyBook: updates.studyBook, batchYear: updates.batchYear,
        status: updates.status, createdAt: now
      });
    }
    updates.academicRegistrations = registrationHistory;
    const bookAttempts = Array.isArray(existingStudent.bookAttempts) ? [...existingStudent.bookAttempts] : [];
    const lastAttempt = bookAttempts[bookAttempts.length - 1];
    if (!lastAttempt || lastAttempt.trainingYear !== updates.trainingYear || lastAttempt.studyBook !== updates.studyBook || (['راسب', 'مستكمل'].includes(existingStudent.status) && lastAttempt.status !== existingStudent.status)) {
      const sameBookAttempts = bookAttempts.filter(attempt => attempt.trainingYear === updates.trainingYear && attempt.studyBook === updates.studyBook);
      bookAttempts.push({
        id: createAcademicRecordId('book-attempt'), type: 'book-attempt', studentId: id,
        trainingYear: updates.trainingYear, studyBook: updates.studyBook,
        attemptNumber: sameBookAttempts.length + 1, status: updates.status, createdAt: now
      });
    }
    updates.bookAttempts = bookAttempts;
    const history = Array.isArray(existingStudent.academicRecords) ? [...existingStudent.academicRecords] : [];
    if (previousTrainingYear !== updates.trainingYear || previousBook !== updates.studyBook || existingStudent.status !== updates.status || (existingStudent.status !== 'خريج' && updates.status === 'خريج')) {
      history.push({
        id: createAcademicRecordId('history'), type: updates.status === 'خريج' ? 'graduation' : 'academic-update',
        studentId: id, fromTrainingYear: previousTrainingYear, fromBook: previousBook,
        trainingYear: updates.trainingYear, studyBook: updates.studyBook, status: updates.status, createdAt: now
      });
    }
    updates.academicRecords = history;
    if (updates.status === 'راسب' || updates.status === 'مستكمل') {
      const attempts = existingStudent.academicAttempts || [];
      const attemptKey = `${existingStudent.academicYear || existingStudent.stage || ''}-${existingStudent.studyBook || existingStudent.class || ''}-${attempts.length + 1}`;
      if (!attempts.some(attempt => attempt.key === attemptKey)) {
        attempts.push({
          key: attemptKey,
          studentId: id,
          academicYear: existingStudent.academicYear || existingStudent.stage || '',
          term: existingStudent.currentTerm || AppData.settings.currentTerm || '',
          book: existingStudent.studyBook || existingStudent.class || '',
          originalBatchYear: existingStudent.batchYear || existingStudent.classGroup || '',
          retryBatchYear: updates.retryBatchYear || '',
          status: updates.status,
          updatedAt: new Date().toISOString()
        });
        updates.academicAttempts = attempts;
      }
    }
    await DB.updateStudent(id, updates);
    const idx = AppData.students.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(AppData.students[idx], updates);
    closeModal();
    showToast('✅ تم التحديث');
    renderApp();
  } catch (e) { showToast('❌ فشل الحفظ', 'error'); }
  finally { hideLoading(); }
}

async function deleteStudentConfirm(id) {
  if (!confirm('حذف الدارس؟')) return;
  try {
    await DB.deleteStudent(id);
    AppData.students = AppData.students.filter(s => s.id !== id);
    showToast('🗑️ تم');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
}

function openStudentFile(id, requestedTab) {
  const student = AppData.students.find(s => String(s.id) === String(id));
  if (!student) {
    showToast('لم يتم العثور على ملف الطالب', 'error');
    return;
  }
  const matchesStudent = record => {
    const value = `${record.studentId || ''}|${record.studentCode || ''}|${record.studentName || ''}|${record.name || ''}`;
    return String(record.studentId || '') === String(student.id) ||
      String(record.studentCode || '') === String(student.id) ||
      String(record.studentName || record.name || '') === String(student.name || '');
  };
  const formatFileDate = value => {
    if (!value) return '—';
    if (typeof value === 'object' && value.seconds != null) value = new Date(value.seconds * 1000);
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? String(value) : date.toLocaleString('ar-EG');
  };
  const recordCard = (row, type) => {
    if (!row || typeof row !== 'object') return String(row || '—');
    const status = row.status || row.result || row.score;
    const label = row.subject ? Helpers.getSubjectLabel(row.subject) : '';
    return `${type}${row.id || row.registrationId || row.attemptId ? ` • رقم السجل: ${row.id || row.registrationId || row.attemptId}` : ''}
      ${label ? ` • المادة: ${label}` : ''}
      ${row.week ? ` • الأسبوع: ${row.week}` : ''}
      ${row.studyBook || row.book ? ` • الكتاب: ${row.studyBook || row.book}` : ''}
      ${row.batchYear || row.classGroup ? ` • الدفعة: ${row.batchYear || row.classGroup}` : ''}
      ${row.term ? ` • الفصل: ${row.term}` : ''}
      ${status !== undefined ? ` • النتيجة/الحالة: ${status}` : ''}
      ${row.score !== undefined ? ` • الدرجة: ${row.score}` : ''}
      ${row.text ? ` • ${row.text}` : ''}
      ${row.category ? ` • التصنيف: ${Helpers.getCategoryLabel(row.category)}` : ''}
      ${row.createdAt ? ` • التاريخ: ${formatFileDate(row.createdAt)}` : ''}
      ${row.date ? ` • التاريخ: ${formatFileDate(row.date)}` : ''}`;
  };
  const section = (title, rows, type = '') => `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">${title}</div><div class="gold-line"></div>
      ${rows && rows.length ? rows.map(row => `<div style="padding:7px 0;border-bottom:1px solid #eee">${Helpers.escapeHtml(recordCard(row, type)).replace(/\n/g, '<br>')}</div>`).join('') : '<div class="empty-state" style="padding:12px">لا توجد بيانات مسجلة</div>'}
    </div>`;
  const attempts = Array.isArray(student.academicAttempts) ? student.academicAttempts : [];
  const records = Array.isArray(student.academicRecords) ? student.academicRecords : [];
  const attendance = AppData.attendance.filter(matchesStudent);
  const evaluations = AppData.evaluations.filter(matchesStudent);
  const courseworkRecords = evaluations.filter(record =>
    record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction
  );
  const courseworkSummary = CourseworkEngine.total(AppData.evaluations, student.id);
  const exams = AppData.exams.filter(matchesStudent);
  const notes = AppData.visitationNotes.filter(matchesStudent);
  const activeTab = requestedTab || State.activeTab.studentFileTab || 'profile';
  State.activeTab.studentFileTab = activeTab;
  const tabButton = (key, icon, label) => `<button class="btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-outline'}" onclick="openStudentFile('${student.id}','${key}')">${icon} ${label}</button>`;

  // Attendance records are stored per lecture and `date` is a Firestore
  // Timestamp, so comparing String(Timestamp) with YYYY-MM-DD removes all
  // records. Use the student's loaded records; the Firestore query already
  // scopes them to this student.
  const termAttendance = attendance;
  const attendanceByWeek = [...new Set(termAttendance.map(record => String(record.week ?? record.studyDay ?? record.date ?? '')))]
    .map(weekKey => {
      const rows = termAttendance.filter(record => String(record.week ?? record.studyDay ?? record.date ?? '') === weekKey);
      return {
        key: weekKey,
        first: rows[0],
        lecture1: rows.find(record => Number(record.lecture) === 1),
        lecture2: rows.find(record => Number(record.lecture) === 2),
        status: rows.some(record => record.status === 'absent') ? 'absent' : rows.some(record => record.status === 'partial') ? 'partial' : rows.some(record => record.status === 'late') ? 'late' : 'present'
      };
    });
  const attendanceSummary = AttendanceEngine.calculate(attendance, student.id);
  const attendanceTerm = AttendanceEngine.termSummary(attendance, student.id, AppData.settings.totalWeeks || 15);
  const registrationHistory = Array.isArray(student.academicRegistrations) ? student.academicRegistrations : [];
  const bookAttempts = [...(Array.isArray(student.bookAttempts) ? student.bookAttempts : []), ...(Array.isArray(student.academicAttempts) ? student.academicAttempts : [])];
  const academicHistory = Array.isArray(student.academicRecords) ? student.academicRecords : [];
  const dailyNotes = notes.filter(note => note.type === 'spiritualDaily' && note.noteDate);
  const noteMonths = [...new Set(dailyNotes.map(note => String(note.noteDate).slice(0, 7)))].sort();
  const spiritualLabels = { gospel: 'الإنجيل', morningPrayer: 'صلاة باكر', eveningPrayer: 'الصلاة المسائية', nightPrayer: 'صلاة النوم', confession: 'الاعتراف', communion: 'التناول' };
  const spiritualStats = Object.keys(spiritualLabels).map(key => {
    const matching = dailyNotes.filter(note => note.items?.[key]);
    const monthCounts = noteMonths.map(month => matching.filter(note => String(note.noteDate).startsWith(month)).length);
    return { key, total: matching.length, monthCounts, percent: noteMonths.length ? Math.min(100, Math.round(monthCounts.reduce((a, b) => a + b, 0) / noteMonths.length / 30 * 100)) : 0 };
  });

  let tabContent = '';
  if (activeTab === 'performance') {
    tabContent = renderTermPerformance(student);
  } else if (activeTab === 'attendance') {
    const consecutive = AttendanceEngine.calculate(attendance, student.id)?.consecutiveAbsent || 0;
    tabContent = `<div class="card"><div class="card-title">📋 الحضور والغياب - ترم الكتاب الأول</div><div class="gold-line"></div>
      <div class="info-msg">فصل إعداد الخدام: يوليو إلى ديسمبر 2026. يخرج الطالب إلى المستمعين عند 7 غيابات متقطعة أو 4 غيابات متتالية، ويشترط تجاوز نسبة الحضور 65% لدخول الامتحان.</div>
       ${attendanceTermSummaryHtml(attendanceTerm)}
       <div class="stats-grid"><div class="stat-card"><div class="num">${attendanceTerm.attendedPercent}%</div><div class="lbl">نسبة الحضور من إجمالي الترم</div></div><div class="stat-card"><div class="num">${attendanceTerm.absentWeeks} (${attendanceTerm.absentPercent}%)</div><div class="lbl">الغياب الفعلي</div></div><div class="stat-card"><div class="num">${consecutive}</div><div class="lbl">الغياب المتتالي</div></div></div>
       <span class="badge ${attendanceTerm.attendedPercent >= 65 ? 'badge-success' : 'badge-danger'}">${attendanceTerm.attendedPercent >= 65 ? 'مؤهل لدخول الامتحان' : 'غير مؤهل لدخول الامتحان حاليًا'}</span>
       <div class="table-wrap mt-2"><table><thead><tr><th>الأسبوع</th><th>المحاضرة الأولى</th><th>المحاضرة الثانية</th><th>الحالة</th></tr></thead><tbody>${attendanceByWeek.length ? attendanceByWeek.map(record => `<tr><td>${Helpers.escapeHtml(record.key || '—')}</td><td>${Helpers.escapeHtml(AttendanceEngine.statusLabel(record.lecture1?.status || '—'))}</td><td>${Helpers.escapeHtml(AttendanceEngine.statusLabel(record.lecture2?.status || '—'))}</td><td>${Helpers.escapeHtml(AttendanceEngine.statusLabel(record.status))}</td></tr>`).join('') : '<tr><td colspan="4"><div class="empty-state">لا توجد سجلات لهذا الترم</div></td></tr>'}</tbody></table></div></div>`;
  } else if (activeTab === 'spiritual') {
    const coreEligible = ['gospel', 'morningPrayer', 'eveningPrayer'].every(key => spiritualStats.find(stat => stat.key === key)?.percent >= 65);
    tabContent = `<div class="card"><div class="card-title">📔 النوتة الروحية والأهلية للامتحان</div><div class="gold-line"></div>
      <div class="info-msg">الإنجيل والصلاة بحد أدنى 21 يومًا في الشهر، الاعتراف مرة على الأقل كل شهر، والتناول مرتين شهريًا. عدم تقديم النوتة ثلاثة أشهر يحرم من الامتحان.</div>
      <div class="stats-grid">${spiritualStats.map(stat => `<div class="stat-card"><div class="num">${stat.percent}%</div><div class="lbl">${spiritualLabels[stat.key]}</div></div>`).join('')}</div>
      <span class="badge ${coreEligible && noteMonths.length >= 3 ? 'badge-success' : 'badge-danger'}">${coreEligible && noteMonths.length >= 3 ? 'النوتة مستوفاة' : 'النوتة غير مستوفاة حاليًا'}</span>
      <div class="table-wrap mt-2"><table><thead><tr><th>البند</th><th>الإجمالي</th><th>الأشهر المسجلة</th><th>النسبة</th></tr></thead><tbody>${spiritualStats.map(stat => `<tr><td>${spiritualLabels[stat.key]}</td><td>${stat.total}</td><td>${stat.monthCounts.join(' / ') || '—'}</td><td>${stat.percent}%</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if (activeTab === 'coursework') {
    tabContent = `<div class="card"><div class="card-title">📝 أعمال السنة</div><div class="gold-line"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><span class="badge badge-info">الأساس: ${courseworkSummary.core} / 100</span><span class="badge badge-warning">البونص: ${courseworkSummary.bonus} / 20</span><span class="badge badge-danger">الخصم: ${courseworkSummary.deductions}</span><span class="badge badge-success">الإجمالي: ${courseworkSummary.total} / 120</span></div>
      ${renderCourseworkBreakdown(courseworkRecords, 'studentFileCourseworkTab', AppData.settings.totalWeeks || 15, key => `State.activeTab['studentFileCourseworkTab']='${key}';openStudentFile('${student.id}','coursework')`)}</div>`;
  } else if (activeTab === 'academic') {
    const historyRows = [...academicHistory, ...registrationHistory, ...bookAttempts].sort((a, b) => String(b.createdAt || b.updatedAt || '').localeCompare(String(a.createdAt || a.updatedAt || '')));
    tabContent = `<div class="card"><div class="card-title">🎓 ملخص السجل الأكاديمي والحضور</div><div class="gold-line"></div>
       ${attendanceTermSummaryHtml(attendanceTerm)}
       <div class="stats-grid"><div class="stat-card"><div class="num">${attendanceSummary.held}</div><div class="lbl">محاضرات مسجلة</div></div><div class="stat-card"><div class="num">${attendanceTerm.attendedWeeks}</div><div class="lbl">حضور فعلي بالأسابيع</div></div><div class="stat-card"><div class="num">${attendanceTerm.absentWeeks}</div><div class="lbl">غياب فعلي بالأسابيع</div></div><div class="stat-card"><div class="num">${attendanceTerm.attendedPercent}%</div><div class="lbl">نسبة الحضور من إجمالي الترم</div></div></div>
      <div class="info-msg">التأخير: ${attendanceSummary.late} • الغياب الجزئي: ${attendanceSummary.partial} • المتقطع: ${attendanceSummary.interruptedAbsences} • المتتالي: ${attendanceSummary.consecutive} • المتبقي: ${attendanceSummary.remainingInterrupted}</div>
      <span class="badge ${attendanceSummary.eligible === 'مؤهل' ? 'badge-success' : 'badge-danger'}">${attendanceSummary.eligible} لدخول الامتحان</span>
      ${attendanceSummary.warning ? `<div class="info-msg" style="border-right-color:var(--danger)">⚠️ ${attendanceSummary.warning}</div>` : ''}
      <h4>التسجيلات والمحاولات السابقة</h4><div class="table-wrap"><table><thead><tr><th>المعرف</th><th>السنة</th><th>الكتاب</th><th>الدفعة</th><th>الحالة</th></tr></thead><tbody>${historyRows.length ? historyRows.map(row => `<tr><td><code>${Helpers.escapeHtml(row.id || row.key || '—')}</code></td><td>${Helpers.escapeHtml(row.trainingYear || row.academicYear || '—')}</td><td>${Helpers.escapeHtml(row.studyBook || row.book || '—')}</td><td>${Helpers.escapeHtml(row.batchYear || row.originalBatchYear || '—')}</td><td>${Helpers.escapeHtml(row.status || row.label || '—')}</td></tr>`).join('') : '<tr><td colspan="5">لا توجد سجلات تاريخية</td></tr>'}</tbody></table></div>
      <h4>نتائج الامتحانات</h4><div class="table-wrap"><table><thead><tr><th>الكتاب/المادة</th><th>الدرجة</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${exams.length ? exams.map(row => `<tr><td>${Helpers.escapeHtml(row.studyBook || row.book || Helpers.getSubjectLabel(row.subject) || '—')}</td><td>${Helpers.escapeHtml(row.score ?? '—')} / 100</td><td>${Helpers.escapeHtml(row.status || row.result || 'مسجل')}</td><td>${Helpers.escapeHtml(formatFileDate(row.date || row.examDate || row.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="4">لا توجد نتائج امتحانات</td></tr>'}</tbody></table></div></div>`;
  } else {
    tabContent = `<div class="form-grid"><div class="card"><div class="card-title">👤 البيانات الشخصية</div><div class="gold-line"></div><div><strong>الاسم:</strong> ${Helpers.escapeHtml(student.name || '—')}</div><div><strong>الكود:</strong> <code>${Helpers.escapeHtml(student.id || '—')}</code></div><div><strong>البريد:</strong> ${Helpers.escapeHtml(student.email || '—')}</div><div><strong>الهاتف:</strong> ${Helpers.escapeHtml(student.phone1 || student.phone || '—')}</div><div><strong>تاريخ الميلاد:</strong> ${Helpers.escapeHtml(formatFileDate(student.birthdate))}</div></div>
      <div class="card"><div class="card-title">📚 البيانات الدراسية</div><div class="gold-line"></div><div><strong>الحالة:</strong> ${Helpers.studentStatusBadge(student.status)}</div><div><strong>المرحلة:</strong> ${Helpers.escapeHtml(student.stage || '—')}</div><div><strong>الدفعة الأصلية:</strong> ${Helpers.escapeHtml(String(student.batchYear || student.classGroup || '—'))}</div><div><strong>الكتاب الحالي:</strong> ${Helpers.escapeHtml(student.studyBook || student.class || '—')}</div><div><strong>تاريخ الالتحاق:</strong> ${Helpers.escapeHtml(formatFileDate(student.joinDate || student.enrollmentDate || student.createdAt))}</div></div></div>`;
  }
  showModal(`
    <div class="flex-between"><h3>📁 ملف الطالب الأكاديمي</h3><div><button class="btn btn-outline btn-sm" onclick="printStudentAcademicFile('${student.id}')">🖨️ طباعة الملف</button><button class="btn btn-outline btn-sm" onclick="closeModal()">إغلاق</button></div></div>
    <div class="tabs mt-2" style="overflow-x:auto">${tabButton('profile','👤','البيانات')}${tabButton('performance','📊','أداء الطالب في الترم')}${tabButton('attendance','📋','الحضور والغياب')}${tabButton('spiritual','📔','النوتة الروحية')}${tabButton('coursework','📝','أعمال السنة')}${tabButton('academic','🎓','السجل الأكاديمي والامتحانات')}</div>
    <div class="mt-2">${tabContent}</div>
  `, 'large');
}

/* Servants */
function permissionMatrixMarkup(prefix, permissions = {}) {
  return `<div class="permission-matrix-wrap">
    <p class="text-muted">حدد العمليات المسموح بها لكل نوع بيانات. يتم التحقق منها مرة أخرى في الخادم.</p>
    <div class="permission-matrix"><table><thead><tr><th>نطاق البيانات</th>${ACCESS_ACTIONS.map(a => `<th title="${a.label}">${a.label}</th>`).join('')}</tr></thead><tbody>
      ${ACCESS_RESOURCES.map(resource => `<tr><th>${resource.label}</th>${ACCESS_ACTIONS.map(action => {
        const checked = permissions?.[resource.value]?.[action.value] === true;
        return `<td><label class="permission-cell"><input type="checkbox" class="${prefix}-permission" data-resource="${resource.value}" data-action="${action.value}" ${checked ? 'checked' : ''}><span>${action.label}</span></label></td>`;
      }).join('')}</tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function readPermissionMatrix(prefix) {
  const permissions = {};
  document.querySelectorAll(`.${prefix}-permission:checked`).forEach(input => {
    permissions[input.dataset.resource] ||= {};
    permissions[input.dataset.resource][input.dataset.action] = true;
  });
  return permissions;
}

function applyRolePreset(prefix, role) {
  const allowed = ROLE_PRESETS[role] || [];
  document.querySelectorAll(`.${prefix}-permission`).forEach(input => { input.checked = allowed.includes(input.dataset.action); });
}

function explainAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'هذا البريد الإلكتروني مستخدم بالفعل. استخدم بريدًا آخر أو افتح حساب المستخدم الحالي وأرسل رابط إعادة التعيين.';
  if (code === 'auth/invalid-email') return 'صيغة البريد الإلكتروني غير صحيحة.';
  if (code === 'auth/operation-not-allowed') return 'تسجيل البريد الإلكتروني غير مفعل في Firebase Authentication.';
  if (code === 'auth/weak-password') return 'تعذر إنشاء كلمة المرور المؤقتة؛ تحقق من إعدادات Firebase Authentication.';
  if (code === 'auth/network-request-failed') return 'تعذر الاتصال بـ Firebase. تحقق من الإنترنت أو إعدادات الحماية.';
  if (code === 'permission-denied') return 'ليس لديك صلاحية تنفيذ هذه العملية وفق قواعد Firestore.';
  return error?.message || 'حدث خطأ غير معروف أثناء إنشاء الحساب.';
}

async function openAddServantModal() {
  const actor = State.currentUser?.data;
  if (!['admin', 'priest'].includes(State.currentUser?.role) && !Helpers.canAccess(actor, 'servants', 'manageUsers')) return showToast('ليس لديك صلاحية إدارة المستخدمين', 'error');
  showLoading('جارٍ توليد الكود...');
  try {
    const code = await DB.generateServantCode();
    hideLoading();
    showModal(`
      <h3>👨‍🏫 إضافة خادم جديد</h3>
      <div class="code-display">
        <div class="code-label">كود الخادم (تلقائي)</div>
        <div class="code-value" id="newServantCodeDisplay">${code}</div>
        <div class="code-actions"><button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;" onclick="copyToClipboard('${code}')">📋 نسخ</button></div>
      </div>
      <input type="hidden" id="addServantCode" value="${code}">
      
      <div class="form-section">
        <div class="section-header">👤 البيانات الأساسية</div>
        <div class="form-group"><label>اسم الخادم *</label><input type="text" id="addServantName" placeholder="الاسم الكامل"></div>
        <div class="form-grid">
          <div class="form-group"><label>الهاتف *</label><input type="tel" id="addServantPhone" placeholder="01xxxxxxxxx"></div>
          <div class="form-group"><label>البريد الإلكتروني / معرف الدخول *</label><input type="email" id="addServantEmail" placeholder="name@example.com" autocomplete="email"></div>
        </div>
        <div class="info-msg">سيصل للمستخدم رابط تفعيل/استعادة آمن. لا يتم حفظ كلمة مرور ثابتة أو عرضها للمسؤول.</div>
        <div class="form-grid">
          <div class="form-group"><label>نوع الحساب</label><select id="addServantAccountType"><option value="servant">خادم</option><option value="admin">مسؤول</option><option value="monitor">مراقب</option></select></div>
          <div class="form-group"><label>حالة الحساب</label><select id="addServantStatus"><option value="pending">بانتظار التفعيل</option><option value="active">نشط</option><option value="suspended">معلق</option></select></div>
        </div>
        <label class="security-toggle"><input type="checkbox" id="addServantMfa"> فرض المصادقة متعددة العوامل MFA</label>
      </div>
      
      <div class="form-section">
        <div class="section-header">📚 المواد التي يدرسها</div>
        <div class="subjects-grid">
          ${Helpers.getSubjects().map(s => `<label class="subject-checkbox"><input type="checkbox" class="add-servant-subject" value="${s.value}"><span>${s.icon} ${s.label}</span></label>`).join('')}
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">⚙️ الأدوار الإدارية</div>
        <div class="roles-grid">
          ${Helpers.getServantAdminRolesList().map(r => `<label class="role-option" style="border-right-color:${r.color};"><input type="checkbox" class="add-servant-admin-role" value="${r.value}"><div><div class="role-title" style="color:${r.color};">${r.label}</div><div class="role-desc">${r.description}</div></div></label>`).join('')}
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">🔐 نطاق الوصول ومصفوفة الصلاحيات</div>
        <div class="form-grid">
          <div class="form-group"><label>نطاق البيانات</label><select id="addServantScope"><option value="assigned">المكلف به فقط</option><option value="selected">الفصول/المواد المحددة</option><option value="all">كل البيانات (للمخولين فقط)</option></select></div>
          <div class="form-group"><label>نسخة صلاحيات جاهزة</label><select id="addServantPermissionPreset" onchange="applyRolePreset('add-servant', this.value)"><option value="">اختر دورًا لتعبئة المصفوفة</option>${Helpers.getServantAdminRolesList().map(r => `<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
        </div>
        ${permissionMatrixMarkup('add-servant')}
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-gold" onclick="saveNewServant()" style="flex:1;">💾 حفظ</button>
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    `, 'lg');
  } catch (e) { hideLoading(); showToast('❌ فشل', 'error'); }
}

function toggleAllClassesBtn(el) {
  el.classList.toggle('checked');
  document.querySelectorAll('#add_all_class_btn ~ .class-checkbox-btn').forEach(btn => btn.classList.remove('checked'));
}
function toggleClassBtn(el) {
  el.classList.toggle('checked');
  document.getElementById('add_all_class_btn')?.classList.remove('checked');
}

async function saveNewServant() {
  const actor = State.currentUser?.data;
  if (!['admin', 'priest'].includes(State.currentUser?.role) && !Helpers.canAccess(actor, 'servants', 'manageUsers')) return showToast('ليس لديك صلاحية إدارة المستخدمين', 'error');
  const name = document.getElementById('addServantName').value.trim();
  const code = document.getElementById('addServantCode').value.trim().toUpperCase();
  const phone = document.getElementById('addServantPhone').value.trim();
  const email = document.getElementById('addServantEmail').value.trim().toLowerCase();
  const accountType = document.getElementById('addServantAccountType').value;
  const accountStatus = document.getElementById('addServantStatus').value;
  if (!name || !phone || !email || !email.includes('@')) { showToast('أكمل الاسم والهاتف والبريد الإلكتروني الصحيح', 'error'); return; }
  if (AppData.servants.some(s => String(s.email || '').toLowerCase() === email)) { showToast('هذا البريد مستخدم لخادم مسجل بالفعل', 'error'); return; }
  const subjects = [];
  document.querySelectorAll('.add-servant-subject:checked').forEach(c => subjects.push(c.value));
  const roles = [];
  document.querySelectorAll('.add-servant-admin-role:checked').forEach(c => roles.push(c.value));
  if (subjects.length === 0 && roles.length === 0) { showToast('اختر مادة أو دور', 'error'); return; }
  const profileRole = accountType === 'admin'
    ? (roles.includes('father_priest') ? 'priest' : roles.includes('service_manager') ? 'service_admin' : 'control_admin')
    : accountType;
  try {
    const allCodes = await DB.getAllCodes();
    if (allCodes.has(code)) { showToast('❌ الكود مستخدم', 'error'); return; }
    const temporaryPassword = `${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}Aa1!`;
    showLoading('جارٍ إنشاء الحساب وإرسال رابط التفعيل...');
    const credential = await createUserWithEmailAndPassword(studentRegistrationAuth, email, temporaryPassword);
    await sendPasswordResetEmail(studentRegistrationAuth, email);
    await signOut(studentRegistrationAuth);
    const servant = { id: 'SRV' + Date.now(), name, code, phone, email, uid: credential.user.uid,
      accountType, accountStatus, active: accountStatus !== 'suspended', mfaRequired: document.getElementById('addServantMfa').checked,
      accessScope: { mode: document.getElementById('addServantScope').value, classes: [], subjects: subjects },
      classGroup: 'الكل', subjectSpecialty: subjects, adminRole: roles,
      permissions: readPermissionMatrix('add-servant') };
    await setDoc(doc(db, 'users', credential.user.uid), { active: servant.active, role: profileRole, name, email, profileId: servant.id,
      permissions: servant.permissions, accessScope: servant.accessScope, mfaRequired: servant.mfaRequired, createdAt: serverTimestamp() });
    showLoading('جارٍ الحفظ...');
    await DB.addServant(servant);
    await DB.addLog({ action: 'إنشاء حساب خادم', target: name, details: `الدور: ${profileRole} - الصلاحيات والنطاق محفوظان - MFA: ${servant.mfaRequired ? 'مفعل' : 'غير مفعل'}` });
    AppData.servants = [...AppData.servants.filter(item => item.id !== servant.id), servant];
    closeModal();
    showToast(`✅ الكود: ${code}`);
    renderApp();
  } catch (e) {
    console.error('إنشاء حساب الخادم:', e);
    showToast(`❌ ${explainAuthError(e)}`, 'error');
  }
  finally { hideLoading(); }
}

function openEditServantModal(id) {
  const s = AppData.servants.find(x => x.id === id);
  if (!s) return;
  const subjects = Array.isArray(s.subjectSpecialty) ? s.subjectSpecialty : (s.subjectSpecialty ? [s.subjectSpecialty] : []);
  const roles = Array.isArray(s.adminRole) ? s.adminRole : (s.adminRole ? [s.adminRole] : []);
  showModal(`
    <h3>✏️ تعديل الخادم</h3>
    <div class="form-section">
      <div class="section-header">👤 البيانات الأساسية</div>
      <div class="form-group"><label>الاسم</label><input type="text" id="editServantName" value="${s.name}"></div>
      <div class="form-grid">
        <div class="form-group"><label>الهاتف</label><input type="tel" id="editServantPhone" value="${s.phone || ''}"></div>
        <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="editServantEmail" value="${s.email || ''}"></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>حالة الحساب</label><select id="editServantStatus"><option value="pending" ${s.accountStatus === 'pending' ? 'selected' : ''}>بانتظار التفعيل</option><option value="active" ${s.accountStatus === 'active' || s.active === true ? 'selected' : ''}>نشط</option><option value="suspended" ${s.accountStatus === 'suspended' || s.active === false ? 'selected' : ''}>معلق</option></select></div>
        <label class="security-toggle"><input type="checkbox" id="editServantMfa" ${s.mfaRequired ? 'checked' : ''}> فرض MFA</label>
      </div>
      <div class="info-msg">لا تظهر كلمات المرور. استخدم زر إرسال رابط إعادة التعيين عند الحاجة.</div>
    </div>
    <div class="form-section">
      <div class="section-header">📚 المواد</div>
      <div class="subjects-grid">
        ${Helpers.getSubjects().map(sub => `<label class="subject-checkbox ${subjects.includes(sub.value) ? 'checked' : ''}"><input type="checkbox" class="edit-servant-subject" value="${sub.value}" ${subjects.includes(sub.value) ? 'checked' : ''}><span>${sub.icon} ${sub.label}</span></label>`).join('')}
      </div>
    </div>
    <div class="form-section">
      <div class="section-header">⚙️ الأدوار</div>
      <div class="roles-grid">
        ${Helpers.getServantAdminRolesList().map(r => `<label class="role-option" style="border-right-color:${r.color};"><input type="checkbox" class="edit-servant-admin-role" value="${r.value}" ${roles.includes(r.value) ? 'checked' : ''}><div><div class="role-title" style="color:${r.color};">${r.label}</div><div class="role-desc">${r.description}</div></div></label>`).join('')}
      </div>
    </div>
    <div class="form-section">
      <div class="section-header">🔐 نطاق الوصول ومصفوفة الصلاحيات</div>
      <div class="form-group"><label>نطاق البيانات</label><select id="editServantScope"><option value="assigned" ${s.accessScope?.mode === 'assigned' ? 'selected' : ''}>المكلف به فقط</option><option value="selected" ${s.accessScope?.mode === 'selected' ? 'selected' : ''}>الفصول/المواد المحددة</option><option value="all" ${s.accessScope?.mode === 'all' ? 'selected' : ''}>كل البيانات</option></select></div>
      ${permissionMatrixMarkup('edit-servant', s.permissions)}
    </div>
    <div class="modal-actions">
      <button class="btn btn-gold" onclick="updateServantData('${s.id}')" style="flex:1;">💾 حفظ</button>
      ${s.email ? `<button class="btn btn-outline" onclick="sendServantResetLink('${s.email}')">📧 رابط تفعيل/تعيين كلمة المرور</button>` : ''}
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
    </div>
  `, 'lg');
}

function toggleEditAllClassesBtn(el) {
  el.classList.toggle('checked');
  document.querySelectorAll('#edit_all_class_btn ~ .class-checkbox-btn').forEach(btn => btn.classList.remove('checked'));
}
function toggleEditClassBtn(el) {
  el.classList.toggle('checked');
  document.getElementById('edit_all_class_btn')?.classList.remove('checked');
}

async function updateServantData(id) {
  const actor = State.currentUser?.data;
  const existingServant = AppData.servants.find(servant => servant.id === id);
  if (!['admin', 'priest'].includes(State.currentUser?.role) && !Helpers.canAccess(actor, 'servants', 'manageUsers')) return showToast('ليس لديك صلاحية إدارة المستخدمين', 'error');
  const subjects = [];
  document.querySelectorAll('.edit-servant-subject:checked').forEach(c => subjects.push(c.value));
  const roles = [];
  document.querySelectorAll('.edit-servant-admin-role:checked').forEach(c => roles.push(c.value));
  const updates = {
    name: document.getElementById('editServantName').value.trim(),
    phone: document.getElementById('editServantPhone').value.trim(),
    email: document.getElementById('editServantEmail').value.trim().toLowerCase(),
    accountStatus: document.getElementById('editServantStatus').value,
    active: document.getElementById('editServantStatus').value !== 'suspended',
    mfaRequired: document.getElementById('editServantMfa').checked,
    accessScope: { mode: document.getElementById('editServantScope').value, classes: existingServant?.accessScope?.classes || [], subjects },
    classGroup: existingServant?.classGroup || 'الكل',
    subjectSpecialty: subjects, adminRole: roles, permissions: readPermissionMatrix('edit-servant')
  };
  try {
    showLoading('جارٍ الحفظ...');
    await DB.updateServant(id, updates);
    const current = AppData.servants.find(s => s.id === id);
    if (current?.uid) await setDoc(doc(db, 'users', current.uid), {
      name: updates.name, email: updates.email, active: updates.active, role: updates.accountType || current.accountType || 'servant',
      permissions: updates.permissions, accessScope: updates.accessScope, mfaRequired: updates.mfaRequired, updatedAt: serverTimestamp()
    }, { merge: true });
    const idx = AppData.servants.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(AppData.servants[idx], updates);
    await DB.addLog({ action: 'تعديل صلاحيات حساب', target: updates.name, details: `النطاق: ${updates.accessScope.mode} - حالة الحساب: ${updates.accountStatus}` });
    closeModal();
    showToast('✅ تم');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

async function deleteServantConfirm(id) {
  const actor = State.currentUser?.data;
  if (!['admin', 'priest'].includes(State.currentUser?.role) && !Helpers.canAccess(actor, 'servants', 'archive')) return showToast('ليس لديك صلاحية أرشفة المستخدمين', 'error');
  const target = AppData.servants.find(s => s.id === id);
  if (target && Helpers.isFatherPriest(target)) return showToast('لا يمكن حذف حساب الكاهن المسؤول من مسؤول أدنى', 'error');
  if (!confirm('حذف الخادم؟')) return;
  try {
    await DB.deleteServant(id);
    await DB.addLog({ action: 'أرشفة حساب خادم', target: target?.name || id, details: 'تمت العملية بواسطة مسؤول مخول' });
    AppData.servants = AppData.servants.filter(s => s.id !== id);
    showToast('🗑️ تم');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
}

async function sendServantResetLink(email) {
  if (!email) return showToast('لا يوجد بريد إلكتروني للحساب', 'error');
  try { await sendPasswordResetEmail(auth, email); showToast('✅ تم إرسال رابط آمن لتعيين كلمة المرور'); }
  catch (e) { showToast('تعذر إرسال الرابط', 'error'); }
}

function openNotesModal(studentId, studentName, week) {
  const notes = AppData.visitationNotes.filter(n => n.studentId === studentId && n.week === week);
  const name = State.currentUser?.data?.name || 'خادم';
  const canAdd = State.currentUser?.type === 'servant' ? Helpers.canAddVisitationNotes(State.currentUser.data) : true;
  showModal(`
    <h3>📔 ملاحظات - ${studentName}</h3>
    ${notes.length > 0 ? `<div style="max-height:250px;overflow-y:auto;margin-bottom:12px;">${notes.map(n => `
      <div class="note-card"><div class="note-header"><span class="badge badge-info">${Helpers.getCategoryLabel(n.category)}</span><span>${Helpers.formatDateTime(n.createdAt)}</span></div><div class="note-body">${Helpers.escapeHtml(n.text)}</div></div>
    `).join('')}</div>` : ''}
    ${canAdd ? `
      <hr><h4>➕ إضافة</h4>
      <div class="form-group"><label>التصنيف</label><select id="noteCategory">${Helpers.getNoteCategories().map(c => `<option value="${c.value}">${c.label}</option>`).join('')}</select></div>
      <div class="form-group"><label>الملاحظة</label><textarea id="noteText" rows="3"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-gold" onclick="saveNote('${studentId}', ${week}, '${name.replace(/'/g, "\\'")}')">💾 حفظ</button>
        <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      </div>
    ` : `<div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>`}
  `);
}

async function saveNote(studentId, week, servantName) {
  const cat = document.getElementById('noteCategory').value;
  const text = document.getElementById('noteText').value.trim();
  if (!text) { showToast('اكتب الملاحظة', 'error'); return; }
  try {
    const saved = await DB.addVisitationNote({ studentId, week, category: cat, text, servantName, classGroup: AppData.students.find(s => s.id === studentId)?.classGroup || '' });
    AppData.visitationNotes.push(saved);
    closeModal();
    showToast('✅ تم');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
}

async function forceLogoutUser(sessionId, userName) {
  if (!confirm(`هل تريد إخراج "${userName}" من النظام؟`)) return;
  try {
    showLoading('جارٍ إخراج المستخدم...');
    await SessionTracker.forceLogout(sessionId);
    DB.addLog({ action: 'إخراج مستخدم', target: userName, details: 'إخراج قسري بواسطة المسؤول' });
    showToast(`✅ تم إخراج "${userName}" من النظام`);
    renderApp();
  } catch (e) { showToast('❌ فشل الإخراج', 'error'); }
  finally { hideLoading(); }
}

async function cleanupSessions() {
  if (!confirm('هل تريد تنظيف الجلسات القديمة (أكثر من 5 دقائق)؟')) return;
  try {
    showLoading('جارٍ التنظيف...');
    await SessionTracker.cleanupOldSessions();
    showToast('✅ تم تنظيف الجلسات القديمة');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

function addCurriculumSubject() {
  const editor = document.getElementById('curriculumSubjectsEditor');
  if (!editor) return;
  const row = document.createElement('div');
  row.className = 'curriculum-subject-row';
  row.style.cssText = 'display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(220px,1fr) 90px repeat(2,auto) auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--border-color);border-radius:10px';
  row.innerHTML = `
    <input type="text" class="subject-name" value="" placeholder="اسم المادة الجديدة">
    <select class="subject-books" multiple size="2" title="الكتب المرتبطة بالمادة">
      ${STUDY_BOOKS.map(book => `<option value="${book}" ${book === 'الكتاب الأول' ? 'selected' : ''}>${book}</option>`).join('')}
    </select>
    <input type="number" class="subject-exam-questions" min="1" value="30" title="عدد أسئلة الامتحان">
    <label><input type="checkbox" class="subject-count-total" checked> تدخل في المجموع</label>
    <label><input type="checkbox" class="subject-competition" checked> تدخل في المسابقة</label>
    <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.curriculum-subject-row').remove()">🗑️</button>
  `;
  editor.appendChild(row);
  row.querySelector('.subject-name').focus();
}

function collectCurriculumSubjects() {
  const subjects = [];
  document.querySelectorAll('#curriculumSubjectsEditor .curriculum-subject-row').forEach((row, index) => {
    const name = row.querySelector('.subject-name')?.value.trim();
    if (!name) return;
    const valueBase = name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || `subject-${index + 1}`;
    const selectedBooks = Array.from(row.querySelector('.subject-books')?.selectedOptions || []).map(option => option.value);
    subjects.push(normalizeSubject({
      id: `${valueBase}-${index + 1}`,
      value: `${valueBase}-${index + 1}`,
      label: name,
      icon: '📚',
      books: selectedBooks.length ? selectedBooks : ['الكتاب الأول'],
      examQuestions: parseInt(row.querySelector('.subject-exam-questions')?.value) || 30,
      countInTotal: row.querySelector('.subject-count-total')?.checked === true,
      competition: row.querySelector('.subject-competition')?.checked === true
    }));
  });
  return subjects;
}

async function saveSettings() {
  const subjects = collectCurriculumSubjects();
  const courseworkTypes = CourseworkEngine.types().map(item => {
    const input = document.querySelector(`.coursework-core-setting[data-key="${item.key}"]`);
    return { ...item, max: input ? Math.max(0, parseFloat(input.value) || 0) : item.max };
  });
  const courseworkBonus = CourseworkEngine.bonusItems().map(item => {
    const input = document.querySelector(`.coursework-bonus-setting[data-key="${item.key}"]`);
    return { ...item, max: input ? Math.max(0, parseFloat(input.value) || 0) : item.max };
  });
  const coreTotal = courseworkTypes.reduce((sum, item) => sum + (item.active ? item.max : 0), 0);
  const bonusTotal = courseworkBonus.reduce((sum, item) => sum + (item.active ? item.max : 0), 0);
  if (coreTotal !== 100) { showToast(`يجب أن يكون مجموع أعمال السنة الأساسي 100% (الحالي ${coreTotal}%)`, 'error'); return; }
  if (bonusTotal !== 20) { showToast(`يجب أن يكون مجموع البونص 20% (الحالي ${bonusTotal}%)`, 'error'); return; }
  const settings = {
    centerName: document.getElementById('setCenterName')?.value || AppData.settings.centerName,
    slogan: document.getElementById('setSlogan')?.value || AppData.settings.slogan,
    termStart: document.getElementById('settingsStart')?.value,
    termEnd: document.getElementById('settingsEnd')?.value,
    totalWeeks: parseInt(document.getElementById('settingsWeeks')?.value) || 15,
    currentWeek: parseInt(document.getElementById('settingsCurrentWeek')?.value) || 1,
    totalEvaluations: parseInt(document.getElementById('settingsTotalEval')?.value) || 10,
    subjects,
    courseworkTypes,
    courseworkBonus
  };
  try {
    showLoading('جارٍ الحفظ...');
    await DB.setSettings(settings);
    AppData.settings = { ...AppData.settings, ...settings };
    AppData.subjects = subjects.map(normalizeSubject);
    showToast('✅ تم');
    renderApp();
  } catch (e) { showToast('❌ فشل', 'error'); }
  finally { hideLoading(); }
}

async function saveAttendancePolicy() {
  const policy = {
    version: (parseInt(AppData.settings.attendancePolicy?.version) || 0) + 1,
    effectiveFrom: new Date().toISOString(),
    eligibilityPercent: Math.max(0, Math.min(100, parseInt(document.getElementById('attendanceEligibility').value) || 65)),
    warningInterrupted: parseInt(document.getElementById('attendanceInterrupted').value) || 7,
    warningConsecutive: parseInt(document.getElementById('attendanceConsecutive').value) || 4,
    attendanceWeight: parseInt(document.getElementById('attendanceWeight').value) || 50,
    questionsWeight: parseInt(document.getElementById('questionsWeight').value) || 50,
    compareBoundary: document.getElementById('attendanceBoundary').value,
    lecture1: { quarterAfter: document.getElementById('lecture1Quarter').value, absenceAt: document.getElementById('lecture1Absent').value },
    lecture2: { quarterAfter: document.getElementById('lecture2Quarter').value, absenceAt: document.getElementById('lecture2Absent').value }
  };
  if (policy.attendanceWeight + policy.questionsWeight !== 100) { showToast('يجب أن يكون مجموع وزن الحضور والأسئلة 100%', 'error'); return; }
  if (policy.lecture1.quarterAfter >= policy.lecture1.absenceAt || policy.lecture2.quarterAfter >= policy.lecture2.absenceAt) { showToast('حدود الوقت غير متسلسلة', 'error'); return; }
  const history = [...(AppData.settings.attendancePolicyHistory || [])];
  if (AppData.settings.attendancePolicy) history.push({ ...AppData.settings.attendancePolicy, archivedAt: new Date().toISOString() });
  const settings = { ...AppData.settings, attendancePolicy: policy, attendancePolicyHistory: history };
  try {
    await DB.setSettings(settings);
    AppData.settings = settings;
    await DB.addLog({ action: 'اعتماد سياسة حضور', details: `نسخة ${policy.version}`, policyVersion: policy.version });
    showToast('✅ تم اعتماد سياسة الحضور وحفظ نسختها السابقة');
    renderApp();
  } catch (e) { console.error(e); showToast('فشل حفظ السياسة', 'error'); }
}

function viewAttendancePolicyHistory() {
  const history = AppData.settings.attendancePolicyHistory || [];
  const current = AppData.settings.attendancePolicy;
  const rows = [...history, ...(current ? [current] : [])].reverse().map((policy, index) => `
    <tr><td>${index + 1}</td><td>${policy.version || '—'}</td><td>${Helpers.escapeHtml(policy.effectiveFrom || policy.archivedAt || '—')}</td><td>${policy.eligibilityPercent}%</td><td>${policy.warningInterrupted}/${policy.warningConsecutive}</td></tr>
  `).join('');
  showModal('نسخ سياسات الحضور المعتمدة', `<div class="table-wrap"><table><thead><tr><th>#</th><th>النسخة</th><th>تاريخ السريان/الأرشفة</th><th>الأهلية</th><th>متقطع/متتالي</th></tr></thead><tbody>${rows || '<tr><td colspan="5">لا توجد نسخ سابقة</td></tr>'}</tbody></table></div>`);
}

function backupFullData() {
  const data = {
    version: '9.0', timestamp: new Date().toISOString(),
    students: AppData.students, servants: AppData.servants,
    attendance: AppData.attendance, evaluations: AppData.evaluations,
    exams: AppData.exams, visitationNotes: AppData.visitationNotes,
    settings: AppData.settings
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ تم إنشاء النسخة الاحتياطية');
}

function restoreFullData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('⚠️ سيتم استبدال جميع البيانات الحالية. متابعة؟')) return;
      showLoading('جارٍ الاستعادة...');
      if (data.students) { await DB.deleteAllStudents(); for (const s of data.students) await DB.addStudent(s); }
      if (data.servants) { await DB.deleteAllServants(); for (const s of data.servants) await DB.addServant(s); }
      if (data.attendance) { await DB.deleteAllAttendance(); if (data.attendance.length > 0) await DB.saveAttendanceBulk(data.attendance); }
      if (data.evaluations) { await DB.deleteAllEvaluations(); if (data.evaluations.length > 0) await DB.saveEvaluationsBulk(data.evaluations); }
      if (data.exams) { await DB.deleteAllExams(); if (data.exams.length > 0) await DB.saveExamsBulk(data.exams); }
      if (data.settings) await DB.setSettings(data.settings);
      showToast('✅ تمت الاستعادة');
      setTimeout(() => location.reload(), 1500);
    } catch (err) { showToast('❌ فشل: ' + err.message, 'error'); }
    finally { hideLoading(); }
  };
  reader.readAsText(file);
}

async function executeSystemReset() {
  const confirmText = document.getElementById('confirmDelete').value.trim();
  if (confirmText !== 'تأكيد الحذف') { showToast('⚠️ اكتب "تأكيد الحذف"', 'error'); return; }
  const delStudents = document.getElementById('del_students').checked;
  const delServants = document.getElementById('del_servants').checked;
  const delAttendance = document.getElementById('del_attendance').checked;
  const delEvaluations = document.getElementById('del_evaluations').checked;
  const delExams = document.getElementById('del_exams').checked;
  const delNotes = document.getElementById('del_notes').checked;
  const delLogs = document.getElementById('del_logs').checked;
  if (!delStudents && !delServants && !delAttendance && !delEvaluations && !delExams && !delNotes && !delLogs) { showToast('⚠️ اختر عنصر', 'warning'); return; }
  const items = [];
  if (delStudents) items.push('الدارسين');
  if (delServants) items.push('الخدام');
  if (delAttendance) items.push('الحضور');
  if (delEvaluations) items.push('أعمال السنة');
  if (delExams) items.push('الامتحانات');
  if (delNotes) items.push('النوتة الروحية');
  if (delLogs) items.push('السجل');
  if (!confirm(`⚠️ سيتم حذف: ${items.join(' • ')}\n\nلا يمكن التراجع!`)) return;
  try {
    showLoading('جارٍ الحذف...');
    if (delStudents) { await DB.deleteAllStudents(); AppData.students = []; }
    if (delServants) { await DB.deleteAllServants(); AppData.servants = []; }
    if (delAttendance) { await DB.deleteAllAttendance(); AppData.attendance = []; }
    if (delEvaluations) { await DB.deleteAllEvaluations(); AppData.evaluations = []; }
    if (delExams) { await DB.deleteAllExams(); AppData.exams = []; }
    if (delNotes) { await DB.deleteAllVisitationNotes(); AppData.visitationNotes = []; }
    if (delLogs) { await DB.deleteAllLogs(); AppData.logs = []; }
    showToast(`✅ تم حذف: ${items.join(' • ')}`);
    renderApp();
  } catch (e) { showToast('❌ فشل: ' + e.message, 'error'); }
  finally { hideLoading(); }
}

/* ============================================================
   EXPORT FUNCTIONS
   ============================================================ */
function exportStudentsExcel() {
  const rows = AppData.students.map(s => ({
    'الكود': s.id, 'الاسم': s.name, 'النوع': s.gender, 'الميلاد': s.birthdate,
    'الكتاب': s.stage, 'الدفعة': s.classGroup, 'الرتبة': s.deaconRank || '',
    'هاتف 1': s.phone1, 'هاتف 2': s.phone2 || '', 'العنوان': s.address || '',
    'الاستمارة': s.formReceived ? 'نعم' : 'لا', 'الدفع': s.formPaid ? 'نعم' : 'لا',
    'أضيف بواسطة': Helpers.getStudentAdder(s)
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الدارسين');
  XLSX.writeFile(wb, `students_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportServantsExcel() {
  const rows = AppData.servants.map(s => ({
    'الكود': s.code, 'الاسم': s.name, 'الهاتف': s.phone,
    'الفصول': Helpers.getServantClassGroups(s).join(' • '),
    'المواد': Helpers.getServantSubjects(s).map(x => Helpers.getSubjectLabel(x)).join(' • '),
    'الأدوار': Helpers.getServantAdminRoles(s).map(r => Helpers.getServantAdminRoleLabel(r)).join(' • ')
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الخدام');
  XLSX.writeFile(wb, `servants_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportAllGradesExcel() {
  const tw = AppData.settings.totalWeeks || 15;
  const te = AppData.settings.totalEvaluations || 10;
  const subjects = Helpers.getSubjects();
  const rows = AppData.students.map(s => {
    const row = { 'الكود': s.id, 'الاسم': s.name, 'الدفعة': s.classGroup };
    let totalAll = 0;
    subjects.forEach(sub => {
      const g = GRADING_SYSTEM.calculateSubjectGrade(s.id, sub.value, tw, te);
      row[`${sub.label} - حضور`] = g.attendanceScore;
      row[`${sub.label} - تقييم`] = g.evalScore;
      row[`${sub.label} - امتحان`] = g.examScore;
      row[`${sub.label} - المجموع`] = g.total;
      totalAll += g.total;
    });
    row['المجموع الكلي'] = totalAll.toFixed(1);
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الدرجات');
  XLSX.writeFile(wb, `grades_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportAttendanceExcel() {
  const tw = AppData.settings.totalWeeks || 15;
  const rows = AppData.students.map(s => {
    const row = { 'الكود': s.id, 'الاسم': s.name, 'الدفعة': s.classGroup };
    const att = AppData.attendance.filter(a => a.studentId === s.id && a.type !== 'visitation');
    for (let w = 1; w <= tw; w++) {
      const r = att.find(a => a.week === w);
      row[`أ${w}`] = !r ? '' : (r.status === 'present' ? 'حاضر' : 'غائب');
    }
    row['الحضور'] = att.filter(a => a.status === 'present').length;
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
  XLSX.writeFile(wb, `attendance_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportEvaluationsExcel() {
  const rows = AppData.evaluations.map(e => {
    const st = AppData.students.find(s => s.id === e.studentId);
    return { 'الدارس': st ? st.name : e.studentId, 'الدفعة': st?.classGroup || '', 'المادة': Helpers.getSubjectLabel(e.subject), 'الأسبوع': e.week, 'الدرجة': e.score };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'أعمال السنة');
  XLSX.writeFile(wb, `evaluations_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportExamsExcel() {
  const rows = AppData.exams.map(e => {
    const st = AppData.students.find(s => s.id === e.studentId);
    return { 'الدارس': st ? st.name : e.studentId, 'الدفعة': st?.classGroup || '', 'المادة': Helpers.getSubjectLabel(e.subject), 'الدرجة': e.score };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الامتحانات');
  XLSX.writeFile(wb, `exams_${Date.now()}.xlsx`);
  showToast('✅ تم التصدير');
}
function exportPDF() {
  showToast('جاري إنشاء PDF...', 'info');
  setTimeout(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('نظام خدمة إعداد الخدام - تقرير', 105, 20, { align: 'center' });
    let y = 40;
    AppData.students.slice(0, 40).forEach((s, i) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${s.id} - ${s.name} - ${s.classGroup}`, 10, y);
      y += 7;
    });
    doc.save('report.pdf');
    showToast('✅ تم');
  }, 500);
}

/* ============================================================
   PRINT FUNCTIONS
   ============================================================ */
const SYSTEM_REPORT_TITLES = {
  general: 'التقرير العام للطلاب والدفعات والكتب',
  studentFile: 'تقرير ملف الطالب والسجل الأكاديمي',
  attendance: 'تقرير الحضور والغياب',
  eligibility: 'تقرير أهلية الامتحانات',
  dailyNote: 'تقرير النوتة الروحية اليومية',
  monthlyNote: 'تقرير النوتة الشهرية لكل طالب',
  termNote: 'تقرير النوتة الفصلية والنسب الإجمالية',
  sacraments: 'تقرير الاعتراف والتناول',
  mass: 'تقرير حضور القداس والتسبحة',
  assignments: 'تقرير الواجبات والأبحاث وحالة التسليم',
  servicePreparation: 'تقرير تقييم وتحضير دروس الخدمة',
  coursework: 'تقرير أعمال السنة',
  biblicalCompetition: 'تقرير مسابقات الكتاب المقدس',
  curriculumCompetition: 'تقرير مسابقات كتاب المنهج',
  coptic: 'تقرير اللغة القبطية',
  morningPrayer: 'تقرير تسميع صلاة باكر',
  exams: 'تقرير الامتحانات والنتائج',
  failedRetried: 'تقرير الراسبين والمعيدين',
  transfers: 'تقرير انتقالات الطلاب بين الدفعات والكتب',
  servants: 'تقرير الخدام والتكليفات والتقييمات',
  decisions: 'تقرير القرارات والاستثناءات',
  gradeChanges: 'تقرير تعديل الدرجات والصلاحيات والاعتمادات',
  imports: 'تقرير عمليات الاستيراد من Excel',
  sync: 'تقرير الأعطال والمزامنة والتغييرات'
};

function printSystemReport(reportType) {
  if (reportType === 'attendance') return printAttendanceReport('all');
  if (reportType === 'coursework') return printClassGradesReport('all', 'all');
  if (reportType === 'monthlyNote') return printMonthlySpiritualNoteReport();
  if (reportType === 'dailyNote' || reportType === 'termNote') {
    const records = AppData.visitationNotes.filter(n => n.type === 'spiritualDaily');
    const rows = records.sort((a, b) => String(b.noteDate || '').localeCompare(String(a.noteDate || ''))).map((record, index) => {
      const student = AppData.students.find(s => String(s.id) === String(record.studentId));
      const items = record.items || {};
      return `<tr><td>${index + 1}</td><td>${Helpers.escapeHtml(student?.name || record.studentName || '—')}</td><td>${Helpers.escapeHtml(record.noteDate || '—')}</td><td>${items.gospel ? '✓' : '—'}</td><td>${items.morningPrayer ? '✓' : '—'}</td><td>${items.eveningPrayer ? '✓' : '—'}</td><td>${items.nightPrayer ? '✓' : '—'}</td><td>${items.confession ? '✓' : '—'}</td><td>${items.communion ? '✓' : '—'}</td><td>${Helpers.escapeHtml(record.reviewStatus === 'approved' ? 'معتمد' : 'قيد الاعتماد')}</td></tr>`;
    }).join('');
    const body = records.length ? rows : `<tr><td colspan="10" style="text-align:center;padding:24px;color:#777">لا توجد بيانات نوتة مسجلة حتى الآن</td></tr>`;
    return openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>${SYSTEM_REPORT_TITLES[reportType]}</p></div><table style="font-size:0.75rem"><thead><tr><th>#</th><th>الاسم</th><th>التاريخ</th><th>الإنجيل</th><th>باكر</th><th>غروب</th><th>نوم</th><th>اعتراف</th><th>تناول</th><th>الحالة</th></tr></thead><tbody>${body}</tbody></table></div>`, SYSTEM_REPORT_TITLES[reportType]);
  }
  if (reportType === 'general') return printClassList('all');
  if (reportType === 'studentFile') {
    const students = [...AppData.students].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
    if (!students.length) return showToast('لا توجد بيانات طلاب للطباعة', 'error');
    const rows = students.map((student, index) => `<tr><td>${index + 1}</td><td>${Helpers.escapeHtml(student.name || '')}</td><td><code>${Helpers.escapeHtml(student.id || '')}</code></td><td>${Helpers.escapeHtml(student.batchYear || student.batch || '—')}</td><td>${Helpers.escapeHtml(student.studyBook || student.classGroup || '—')}</td><td>${Helpers.escapeHtml(student.status || 'نشط')}</td></tr>`).join('');
    return openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>${SYSTEM_REPORT_TITLES.studentFile}</p></div><table><thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>الدفعة</th><th>الكتاب</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><div class="print-footer">تم الطباعة بواسطة: ${Helpers.escapeHtml(State.currentUser?.data?.name || '—')}</div></div>`, SYSTEM_REPORT_TITLES.studentFile);
  }

  const sourceMap = {
    exams: [AppData.exams || [], ['الدارس', 'النتيجة', 'الحالة']],
    eligibility: [AppData.attendance || [], ['الدارس', 'الأسبوع', 'الحالة']],
    sacraments: [AppData.visitationNotes.filter(n => n.type === 'spiritualDaily'), ['الدارس', 'التاريخ', 'الاعتراف', 'التناول']],
    mass: [AppData.attendance.filter(a => ['mass', 'vespers'].includes(a.category || a.type)), ['الدارس', 'التاريخ', 'النوع', 'الحالة']],
    assignments: [AppData.evaluations || [], ['الدارس', 'المادة', 'التقييم']],
    servicePreparation: [AppData.evaluations || [], ['الدارس', 'المادة', 'التقييم']],
    failedRetried: [AppData.exams || [], ['الدارس', 'الكتاب', 'النتيجة', 'الحالة']],
    transfers: [AppData.logs || [], ['التاريخ', 'الطالب', 'تفاصيل النقل']],
    servants: [AppData.servants || [], ['الاسم', 'الصلاحية', 'المجموعات']],
    decisions: [AppData.logs || [], ['التاريخ', 'الطالب', 'القرار']],
    gradeChanges: [AppData.logs || [], ['التاريخ', 'المستخدم', 'التعديل']],
    imports: [AppData.logs.filter(l => String(l.action || '').includes('استيراد')), ['التاريخ', 'المستخدم', 'تفاصيل الاستيراد']],
    sync: [AppData.logs.filter(l => /مزامن|sync|خطأ|offline/i.test(`${l.action || ''} ${l.details || ''}`)), ['التاريخ', 'الحالة', 'التفاصيل']]
  };
  const entry = sourceMap[reportType];
  const records = entry ? entry[0] : [];
  const headers = entry ? entry[1] : ['البيان', 'الحالة'];
  let rows = records.map((record, index) => {
    const student = AppData.students.find(s => String(s.id) === String(record.studentId));
    const values = reportRecordValues(reportType, record, student);
    return `<tr><td>${index + 1}</td>${values.map(value => `<td>${Helpers.escapeHtml(String(value ?? '—'))}</td>`).join('')}</tr>`;
  }).join('');
  if (!records.length) {
    rows = `<tr><td colspan="${headers.length + 1}" style="text-align:center;padding:24px;color:#777">لا توجد بيانات مسجلة لهذا التقرير حتى الآن</td></tr>`;
  }
  openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>${SYSTEM_REPORT_TITLES[reportType]}</p></div><table><thead><tr><th>#</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="print-footer">تم الطباعة بواسطة: ${Helpers.escapeHtml(State.currentUser?.data?.name || '—')} • ${new Date().toLocaleString('ar-EG')}</div></div>`, SYSTEM_REPORT_TITLES[reportType]);
}

function reportRecordValues(type, record, student) {
  const name = student?.name || record.studentName || record.name || '—';
  if (type === 'exams') return [name, record.score ?? record.result ?? record.grade ?? '—', record.status || 'مسجل'];
  if (type === 'eligibility') return [name, record.week ?? '—', record.status || '—'];
  if (type === 'sacraments') return [name, record.noteDate || '—', record.items?.confession ? 'نعم' : 'لا', record.items?.communion ? 'نعم' : 'لا'];
  if (type === 'mass') return [name, record.date || record.noteDate || '—', record.category || record.type || '—', record.status || '—'];
  if (type === 'assignments' || type === 'servicePreparation') return [name, record.subject || record.subjectName || '—', record.score ?? record.value ?? '—'];
  if (type === 'failedRetried') return [name, record.studyBook || record.book || '—', record.score ?? record.result ?? '—', record.status || record.result || '—'];
  if (type === 'servants') return [record.name || name, record.role || record.permissions || '—', Array.isArray(record.classGroups) ? record.classGroups.join('، ') : '—'];
  return [record.createdAt || record.date || record.timestamp || '—', record.userName || record.studentName || record.name || name, record.details || record.description || record.action || record.decision || '—'];
}

function printAllReports() {
  const studentsCount = AppData.students.length;
  const rows = Object.entries(SYSTEM_REPORT_TITLES).map(([type, title], index) => `<tr><td>${index + 1}</td><td>${Helpers.escapeHtml(title)}</td><td>${type === 'general' ? studentsCount : 'متاح للطباعة'}</td></tr>`).join('');
  openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>الكشاف العام للتقارير المعتمدة</p></div><table><thead><tr><th>#</th><th>التقرير</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table></div>`, 'الكشاف العام للتقارير');
}

function printClassList(classGroup) {
  const students = AppData.students.filter(s => classGroup === 'all' || classGroup === 'الكل' || Helpers.getTrainingYear(s) === classGroup).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  if (students.length === 0) { showToast('لا يوجد دارسين', 'error'); return; }
  const rows = students.map((s, i) => `
    <tr><td>${i + 1}</td><td>${s.name}</td><td>${s.id}</td>
    <td>${s.gender}</td><td>${Helpers.getTrainingYear(s)}</td><td>${s.studyBook || s.class || '—'}</td>
    <td>${s.phone1 || ''}</td><td>${s.deaconRank || 'غير مطلوب'}</td><td>${Helpers.getStudentAdder(s)}</td></tr>
  `).join('');
  const title = classGroup === 'all' || classGroup === 'الكل' ? 'كل المسارات التدريبية' : classGroup;
  openPrintWindow(`
    <div class="print-area">
      <div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>قائمة دارسي ${title}</p></div>
      <div class="print-meta">
        <span><strong>إجمالي:</strong> ${students.length}</span>
        <span><strong>ذكور:</strong> ${students.filter(s => s.gender === 'ذكر').length}</span>
        <span><strong>إناث:</strong> ${students.filter(s => s.gender === 'أنثى').length}</span>
      </div>
      <table><thead><tr><th>#</th><th>الاسم</th><th>الكود</th><th>النوع</th><th>السنة التدريبية</th><th>الكتاب</th><th>الهاتف</th><th>الرتبة</th><th>أضيف بواسطة</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="print-footer">تم الطباعة بواسطة: ${State.currentUser?.data?.name || '—'} • ${new Date().toLocaleString('ar-EG')}</div>
    </div>
  `, `قائمة_${title}`);
}

function printAttendanceReport(classGroup) {
  const students = AppData.students.filter(s => classGroup === 'all' || classGroup === 'الكل' || Helpers.getTrainingYear(s) === classGroup).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  if (students.length === 0) { showToast('لا يوجد دارسين', 'error'); return; }
  const tw = AppData.settings.totalWeeks || 15;
  const weeks = Array.from({length: tw}, (_, i) => i + 1);
  const headerCols = weeks.map(w => {
    const wd = Helpers.getWeekWithDate(w);
    return `<th style="font-size:0.65rem;padding:4px 2px;"><div><span style="font-weight:700;">أ${w}</span><br><span style="opacity:0.7;font-size:0.55rem;">${wd.dateShort}</span></div></th>`;
  }).join('');
  const rows = students.map((s, i) => {
    const att = AppData.attendance.filter(a => a.studentId === s.id && a.type !== 'visitation');
    const cells = weeks.map(w => {
      const r = att.find(a => a.week === w);
      if (!r) return '<td style="text-align:center;color:#ccc;">—</td>';
      return r.status === 'present' ? '<td style="text-align:center;color:#2e7d32;font-weight:bold;">✓</td>' : '<td style="text-align:center;color:#c62828;font-weight:bold;">✗</td>';
    }).join('');
    const present = att.filter(a => a.status === 'present').length;
    const pct = Math.round((present / tw) * 100);
    return `<tr><td>${i + 1}</td><td>${s.name}</td>${cells}<td>${present}/${tw}</td><td>${pct}%</td></tr>`;
  }).join('');
  const title = classGroup === 'all' || classGroup === 'الكل' ? 'كل المسارات التدريبية' : classGroup;
  openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ كشف الحضور - ${title} ☩</h1></div><table style="font-size:0.7rem;"><thead><tr><th>#</th><th>الاسم</th>${headerCols}<th>الحضور</th><th>%</th></tr></thead><tbody>${rows}</tbody></table><div class="print-footer">تم الطباعة بواسطة: ${State.currentUser?.data?.name || '—'}</div></div>`, `حضور_${title}`);
}

function printClassGradesReport(classGroup, subjectFilter = 'all') {
  const students = AppData.students.filter(s => classGroup === 'all' || classGroup === 'الكل' || Helpers.getTrainingYear(s) === classGroup).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  if (students.length === 0) { showToast('لا يوجد دارسين', 'error'); return; }
  const tw = AppData.settings.totalWeeks || 15;
  const te = AppData.settings.totalEvaluations || 10;
  const subjects = Helpers.getSubjects();
  const rows = students.map((s, i) => {
    const grades = subjects.map(sub => GRADING_SYSTEM.calculateSubjectGrade(s.id, sub.value, tw, te));
    const countedGrades = grades.filter((grade, index) => subjects[index]?.countInTotal !== false);
    const totalAll = countedGrades.reduce((sum, g) => sum + g.total, 0);
    const avg = countedGrades.length > 0 ? totalAll / countedGrades.length : 0;
    const letter = GRADING_SYSTEM.getGradeLetter(avg);
    return `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.classGroup}</td>${grades.map(g => `<td>${g.total}</td>`).join('')}<td><strong>${totalAll.toFixed(1)}</strong></td><td><strong>${avg.toFixed(1)}</strong></td><td style="color:${letter.color};font-weight:700;">${letter.label}</td></tr>`;
  }).join('');
  const title = classGroup === 'all' || classGroup === 'الكل' ? 'كل المسارات التدريبية' : classGroup;
  openPrintWindow(`<div class="print-area"><div class="print-header"><h1>☩ كشف أعمال السنة - ${title} ☩</h1><p style="font-size:0.8rem;">المواد العادية: 20+30+50 | الألحان: 20+20+60</p></div><table style="font-size:0.7rem;"><thead><tr><th>#</th><th>الاسم</th><th>الدفعة</th>${subjects.map(s => `<th>${s.icon} ${s.label}</th>`).join('')}<th>المجموع</th><th>المتوسط</th><th>التقدير</th></tr></thead><tbody>${rows}</tbody></table><div class="print-footer">تم الطباعة بواسطة: ${State.currentUser?.data?.name || '—'}</div></div>`, `تقييمات_${title}`);
}

function printAllVisitationReports() {
  printMonthlySpiritualNoteReport();
}

function printClassNotesReport(classGroup) {
  printMonthlySpiritualNoteReport(classGroup);
}

function printMonthlySpiritualNoteReport(batchFilter = 'all') {
  const month = State.activeTab['notes_month'] || new Date().toISOString().slice(0, 7);
  const itemLabels = {
    gospel: 'قراءة الإنجيل', morningPrayer: 'صلاة باكر', eveningPrayer: 'صلاة الغروب',
    nightPrayer: 'صلاة النوم', communion: 'التناول', confession: 'الاعتراف'
  };
  const students = AppData.students.filter(s => batchFilter === 'all' || String(s.batchYear || s.classGroup) === String(batchFilter));
  if (!students.length) { showToast('لا يوجد دارسون لهذه الدفعة', 'error'); return; }
  const rows = students.map((student, index) => {
    const records = AppData.visitationNotes.filter(n =>
      n.type === 'spiritualDaily' && String(n.studentId) === String(student.id) && String(n.noteDate || '').startsWith(month)
    );
    const recordedDays = [...new Set(records.map(n => n.noteDate))].length;
    const cells = Object.keys(itemLabels).map(key => {
      const done = records.filter(n => n.items?.[key] === true).length;
      const percent = recordedDays ? Math.round(done / recordedDays * 100) : 0;
      return `<td><strong>${percent}%</strong><br><small>${done}/${recordedDays}</small></td>`;
    }).join('');
    const approved = records.length > 0 && records.every(n => n.reviewStatus === 'approved');
    return `<tr><td>${index + 1}</td><td>${Helpers.escapeHtml(student.name)}<br><code>${Helpers.escapeHtml(student.id)}</code></td><td>${recordedDays}</td>${cells}<td>${approved ? 'معتمد' : 'قيد الاعتماد'}</td></tr>`;
  }).join('');
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  const batchLabel = batchFilter === 'all' ? 'جميع الدفعات' : `دفعة ${batchFilter}`;
  openPrintWindow(`
    <div class="print-area">
      <div class="print-header"><h1>☩ كشف النوتة الروحية الشهري ☩</h1><p>${AppData.settings.centerName}</p><p>${monthLabel} - ${batchLabel}</p></div>
      <table style="font-size:0.72rem;"><thead><tr><th>#</th><th>الاسم والرمز</th><th>أيام مسجلة</th>${Object.values(itemLabels).map(label => `<th>${label}</th>`).join('')}<th>اعتماد الشهر</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="print-footer">النسب محسوبة آليًا من السجلات اليومية. تم الطباعة بواسطة: ${Helpers.escapeHtml(State.currentUser?.data?.name || '—')}</div>
    </div>
  `, `نوتة_شهرية_${month}_${batchFilter}`);
}

function printStudentCard(studentId) {
  const s = AppData.students.find(x => x.id === studentId);
  if (!s) return;
  openPrintWindow(`
    <div class="print-area">
      <div class="print-header"><h1>☩ ${AppData.settings.centerName} ☩</h1><p>${AppData.settings.slogan || ''}</p></div>
      <div style="text-align:center;padding:20px;border:3px double #0B1F3A;border-radius:12px;max-width:450px;margin:20px auto;">
        <div style="font-size:30px;color:#C9A227;">☩</div>
        <h3 style="color:#0B1F3A;margin:10px 0;">${s.name}</h3>
        <code style="background:#f0f0f0;padding:4px 10px;border-radius:6px;font-weight:bold;">${s.id}</code>
        <div style="margin-top:14px;text-align:right;font-size:13px;">
          <p><strong>الكتاب:</strong> ${s.stage}</p>
          <p><strong>الدفعة:</strong> ${s.classGroup}</p>
          <p><strong>النوع:</strong> ${s.gender}</p>
          <p><strong>الهاتف:</strong> ${s.phone1 || '—'}</p>
          <p><strong>الرتبة:</strong> ${s.deaconRank || '—'}</p>
          <p><strong>الكنيسة:</strong> ${s.church || '—'}</p>
          <p><strong>أضيف بواسطة:</strong> ${Helpers.getStudentAdder(s)}</p>
        </div>
      </div>
    </div>
  `, `بطاقة_${s.name}`);
}

function printStudentAcademicFileLegacy(id) {
  const student = AppData.students.find(s => String(s.id) === String(id));
  if (!student) return showToast('لم يتم العثور على الطالب', 'error');
  const matchesStudent = record => String(record.studentId || record.studentCode || record.studentName || '') === String(id) ||
    String(record.studentName || record.name || '') === String(student.name || '');
  const attendance = AppData.attendance.filter(matchesStudent);
  const evaluations = AppData.evaluations.filter(matchesStudent);
  const exams = AppData.exams.filter(matchesStudent);
  const notes = AppData.visitationNotes.filter(matchesStudent);
  const coursework = CourseworkEngine.total(evaluations, student.id);
  const attended = attendance.filter(record => ['present', 'late'].includes(record.status)).length +
    attendance.filter(record => record.status === 'partial').length * 0.5;
  const attendancePercent = attendance.length ? Math.round(attended / attendance.filter(record => record.status !== 'cancelled').length * 1000) / 10 : 0;
  const books = STUDY_BOOKS.map(book => {
    const bookExam = exams.find(exam => String(exam.studyBook || exam.book || '') === book || (!exam.studyBook && !exam.book && student.studyBook === book));
    return `<tr><td>${book}</td><td>${attendancePercent || '—'}%</td><td>—</td><td>—</td><td>${Helpers.escapeHtml(bookExam?.score ?? '—')}</td></tr>`;
  }).join('');
  openPrintWindow(`
    <div class="print-area">
      <div class="print-header"><h1>☩ ${Helpers.escapeHtml(AppData.settings.centerName)} ☩</h1><p>الملف الأكاديمي للطالب</p></div>
      <div class="print-meta"><span><strong>الاسم:</strong> ${Helpers.escapeHtml(student.name || '—')}</span><span><strong>الكود:</strong> ${Helpers.escapeHtml(student.id || '—')}</span><span><strong>الدفعة:</strong> ${Helpers.escapeHtml(student.batchYear || student.classGroup || '—')}</span></div>
      <h3>أداء الطالب بحسب الكتب</h3>
      <table><thead><tr><th>الكتاب</th><th>الحضور</th><th>النوتة الروحية</th><th>أعمال السنة</th><th>امتحان الكتاب</th></tr></thead><tbody>${books}</tbody></table>
      <h3 style="margin-top:18px">تفصيل أعمال السنة</h3>
      <div class="print-meta"><span>أساس أعمال السنة: ${coursework.core} / 100</span><span>البونص: ${coursework.bonus} / 20</span><span>الخصم: ${coursework.deductions}</span><span><strong>الإجمالي: ${coursework.total} / 120</strong></span></div>
      <table><thead><tr><th>البند</th><th>الدرجة</th><th>من</th><th>الملاحظات</th></tr></thead><tbody>
        ${evaluations.filter(record => record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction).length ? evaluations.filter(record => record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction).map(record => {
          const core = CourseworkEngine.types().find(item => item.key === record.courseworkType);
          const bonus = CourseworkEngine.bonusItems().find(item => item.key === record.courseworkType);
          const label = record.isDeduction ? 'خصم من البونص' : (bonus?.label || core?.label || record.componentLabel || record.courseworkType || 'تقييم');
          return `<tr><td>${Helpers.escapeHtml(label)}</td><td>${Helpers.escapeHtml(record.score ?? '—')}</td><td>${Helpers.escapeHtml(record.maxScore ?? 20)}</td><td>${Helpers.escapeHtml(record.note || '—')}</td></tr>`;
        }).join('') : '<tr><td colspan="4"><div class="empty-state">لا توجد تقييمات مسجلة</div></td></tr>'}
      </tbody></table>
      <div class="print-footer">تمت الطباعة بواسطة: ${Helpers.escapeHtml(State.currentUser?.data?.name || '—')} • ${new Date().toLocaleString('ar-EG')}</div>
    </div>`, `ملف_${student.name}`);
}

function printStudentAcademicFile(id) {
  const student = AppData.students.find(s => String(s.id) === String(id));
  if (!student) return showToast('لم يتم العثور على الطالب', 'error');
  const matchesStudent = record => String(record.studentId || record.studentCode || record.studentName || '') === String(id) ||
    String(record.studentName || record.name || '') === String(student.name || '');
  const attendance = AppData.attendance.filter(matchesStudent).filter(record => record.type !== 'visitation');
  const evaluations = AppData.evaluations.filter(matchesStudent).filter(record => record.subject === 'coursework' || record.courseworkType || record.isBonus || record.isDeduction);
  const exams = AppData.exams.filter(matchesStudent);
  const notes = AppData.visitationNotes.filter(matchesStudent).filter(note => note.type === 'spiritualDaily').sort((a, b) => String(a.noteDate).localeCompare(String(b.noteDate)));
  const history = [
    ...(Array.isArray(student.academicRegistrations) ? student.academicRegistrations : []),
    ...(Array.isArray(student.bookAttempts) ? student.bookAttempts : []),
    ...(Array.isArray(student.academicAttempts) ? student.academicAttempts : []),
    ...(Array.isArray(student.academicRecords) ? student.academicRecords : [])
  ].sort((a, b) => String(a.createdAt || a.updatedAt || '').localeCompare(String(b.createdAt || b.updatedAt || '')));
  const total = CourseworkEngine.total(evaluations, student.id);
  const attendanceSummary = AttendanceEngine.calculate(attendance, student.id);
  const attendanceTerm = AttendanceEngine.termSummary(attendance, student.id, AppData.settings.totalWeeks || 15);
  const weeks = Array.from({ length: AppData.settings.totalWeeks || 15 }, (_, index) => index + 1);
  const attendanceRows = weeks.map(week => {
    const rows = attendance.filter(record => Number(record.week) === week);
    const lecture1 = rows.find(record => Number(record.lecture) === 1);
    const lecture2 = rows.find(record => Number(record.lecture) === 2);
    return `<tr><td>الأسبوع ${week}</td><td>${Helpers.escapeHtml(AttendanceEngine.statusLabel(lecture1?.status || '—'))}</td><td>${Helpers.escapeHtml(AttendanceEngine.statusLabel(lecture2?.status || '—'))}</td><td>${rows.length ? Helpers.escapeHtml(rows.map(record => AttendanceEngine.statusLabel(record.status)).join(' / ')) : '—'}</td></tr>`;
  }).join('');
  const notesRows = notes.length ? notes.map(note => `<tr><td>${Helpers.escapeHtml(note.noteDate || '—')}</td><td>${note.items?.gospel ? '✓' : '—'}</td><td>${note.items?.morningPrayer ? '✓' : '—'}</td><td>${note.items?.eveningPrayer ? '✓' : '—'}</td><td>${note.items?.nightPrayer ? '✓' : '—'}</td><td>${note.items?.communion ? '✓' : '—'}</td><td>${note.items?.confession ? '✓' : '—'}</td><td>${note.reviewStatus === 'approved' ? 'معتمدة' : 'بانتظار الاعتماد'}</td></tr>`).join('') : '<tr><td colspan="8">لا توجد نوتة روحية مسجلة</td></tr>';
  const examRows = exams.length ? exams.map(exam => `<tr><td>${Helpers.escapeHtml(exam.studyBook || exam.book || Helpers.getSubjectLabel(exam.subject) || '—')}</td><td>${Helpers.escapeHtml(exam.score ?? exam.result ?? '—')}</td><td>100</td><td>${Helpers.escapeHtml(exam.status || exam.result || 'مسجل')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(exam.date || exam.examDate || exam.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="5">لا توجد نتائج امتحانات مسجلة</td></tr>';
  const historyRows = history.length ? history.map(row => `<tr><td>${Helpers.escapeHtml(row.type || row.label || 'سجل')}</td><td>${Helpers.escapeHtml(row.trainingYear || row.academicYear || '—')}</td><td>${Helpers.escapeHtml(row.studyBook || row.book || '—')}</td><td>${Helpers.escapeHtml(row.batchYear || row.originalBatchYear || '—')}</td><td>${Helpers.escapeHtml(row.status || '—')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(row.createdAt || row.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="6">لا توجد سجلات أكاديمية تاريخية</td></tr>';
  const deductionRows = evaluations.filter(record => record.isDeduction).length
    ? evaluations.filter(record => record.isDeduction).map(record => `<tr><td>${Helpers.escapeHtml(record.componentLabel || record.courseworkType || 'خصم')}</td><td>${Helpers.escapeHtml(record.score ?? record.amount ?? '—')}</td><td>${Helpers.escapeHtml(record.note || '—')}</td><td>${Helpers.escapeHtml(Helpers.formatDate(record.date || record.createdAt || record.updatedAt))}</td></tr>`).join('')
    : '<tr><td colspan="4">لا توجد خصومات مسجلة</td></tr>';
  const books = STUDY_BOOKS.map(book => `<tr><td>${Helpers.escapeHtml(book)}</td><td>${attendanceSummary.percentage}%</td><td>${Helpers.escapeHtml(student.studyBook === book ? `${total.total} / 120` : '—')}</td><td>${Helpers.escapeHtml(exams.find(exam => String(exam.studyBook || exam.book || '') === book)?.score ?? '—')}</td></tr>`).join('');
  openPrintWindow(`
    <div class="print-area academic-print-report">
      <div class="print-header"><h1>☩ ${Helpers.escapeHtml(AppData.settings.centerName)} ☩</h1><p>التقرير الأكاديمي الكامل للدارس</p></div>
      <div class="print-meta"><span><strong>الاسم:</strong> ${Helpers.escapeHtml(student.name || '—')}</span><span><strong>الكود:</strong> ${Helpers.escapeHtml(student.id || '—')}</span><span><strong>الدفعة:</strong> ${Helpers.escapeHtml(student.batchYear || student.classGroup || '—')}</span><span><strong>الكتاب:</strong> ${Helpers.escapeHtml(student.studyBook || student.class || '—')}</span></div>
      <section class="print-section"><h3>البيانات الأكاديمية</h3><table><tbody><tr><th>المرحلة</th><td>${Helpers.escapeHtml(student.stage || student.schoolYear || '—')}</td><th>السنة التدريبية</th><td>${Helpers.escapeHtml(student.trainingYear || student.academicYear || '—')}</td></tr><tr><th>الحالة</th><td>${Helpers.escapeHtml(student.status || '—')}</td><th>النوع</th><td>${Helpers.escapeHtml(student.gender || '—')}</td></tr></tbody></table></section>
      <section class="print-section"><h3>ملخص الأداء حسب الكتب</h3><table><thead><tr><th>الكتاب</th><th>الحضور</th><th>أعمال السنة</th><th>الامتحان</th></tr></thead><tbody>${books}</tbody></table></section>
      <section class="print-section"><h3>ملخص أعمال السنة</h3><div class="print-meta"><span>الأساس: ${total.core} / 100</span><span>البونص: ${total.bonus} / 20</span><span>الخصم: ${total.deductions}</span><span><strong>الإجمالي: ${total.total} / 120</strong></span></div>${renderCourseworkPrintMatrices(evaluations, AppData.settings.totalWeeks || 15)}</section>
      <section class="print-section"><h3>تفصيل الخصومات</h3><table><thead><tr><th>البند</th><th>القيمة</th><th>السبب / الملاحظات</th><th>التاريخ</th></tr></thead><tbody>${deductionRows}</tbody></table></section>
      <section class="print-section"><h3>الحضور والغياب</h3><div class="print-meta"><span>إجمالي الترم: ${attendanceTerm.totalWeeks} أسبوع</span><span>الحضور: ${attendanceTerm.attendedWeeks} (${attendanceTerm.attendedPercent}%)</span><span>الغياب: ${attendanceTerm.absentWeeks} (${attendanceTerm.absentPercent}%)</span><span>المتبقي: ${attendanceTerm.remainingWeeks} (${attendanceTerm.remainingPercent}%)</span><span>الأهلية: ${attendanceSummary.eligible}</span></div><table><thead><tr><th>الأسبوع</th><th>المحاضرة الأولى</th><th>المحاضرة الثانية</th><th>الحالة</th></tr></thead><tbody>${attendanceRows}</tbody></table></section>
      <section class="print-section"><h3>النوتة الروحية اليومية</h3><table><thead><tr><th>التاريخ</th><th>الإنجيل</th><th>باكر</th><th>الغروب</th><th>النوم</th><th>التناول</th><th>الاعتراف</th><th>الحالة</th></tr></thead><tbody>${notesRows}</tbody></table></section>
      <section class="print-section"><h3>الامتحانات والنتائج</h3><table><thead><tr><th>الكتاب / المادة</th><th>الدرجة</th><th>من</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>${examRows}</tbody></table></section>
      <section class="print-section"><h3>السجل الأكاديمي والمحاولات</h3><table><thead><tr><th>النوع</th><th>السنة</th><th>الكتاب</th><th>الدفعة</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${historyRows}</tbody></table></section>
      <div class="print-footer">تمت طباعة التقرير الكامل بواسطة: ${Helpers.escapeHtml(State.currentUser?.data?.name || '—')} • ${new Date().toLocaleString('ar-EG')}</div>
    </div>`, `التقرير_الأكاديمي_الكامل_${student.name}`);
}

function openPrintWindow(html, title) {
  const win = window.open('', '_blank');
  if (!win) { showToast('❌ يرجى السماح بالنوافذ', 'error'); return; }
  const embeddedStyles = Array.from(document.querySelectorAll('style'))
    .map(style => style.innerHTML)
    .join('\n');
  const printStyles = `
    @page { size: A4 portrait; margin: 12mm 10mm 12mm; }
    html, body { direction: rtl; background: #fff !important; color: #111; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-area { width: 100%; margin: 0; padding: 0; }
    .print-header { min-height: 92px; margin-bottom: 14px; padding: 12px 16px 10px; border: 0; border-bottom: 3px solid #c9a227; text-align: center; }
    .print-header h1 { margin: 0 0 4px; font-size: 18pt; line-height: 1.35; color: #0b1f3a; }
    .print-header p { margin: 0; font-size: 12pt; font-weight: 700; color: #333; }
    .print-meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 12px; padding: 8px 10px; background: #f7f3e8 !important; border: 1px solid #c9a227; border-radius: 5px; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; direction: rtl; font-size: 9pt; }
    thead { display: table-header-group; }
    table th { background: #0b1f3a !important; color: #fff !important; border: 1px solid #0b1f3a; padding: 7px 5px; text-align: center; font-size: 9pt; }
    table td { border: 1px solid #b9b9b9; padding: 6px 5px; text-align: right; font-size: 9pt; }
    tbody tr:nth-child(even) td { background: #f8f8f8 !important; }
    tbody tr { break-inside: avoid; }
    .print-footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #c9a227; text-align: center; color: #555; font-size: 8pt; }
    .print-section { margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
    .print-section h3 { margin: 0 0 8px; padding: 6px 8px; border-right: 4px solid #c9a227; color: #0b1f3a; font-size: 12pt; }
    .academic-print-report .print-coursework-section { break-inside: auto; page-break-inside: auto; margin-top: 12px; }
    .academic-print-report .coursework-print-matrix { font-size: 7pt; table-layout: auto; margin-top: 6px; }
    .academic-print-report .coursework-print-matrix th, .academic-print-report .coursework-print-matrix td { padding: 4px 3px; }
    .academic-print-report .coursework-print-matrix th:first-child { min-width: 100px; }
    .academic-print-report .coursework-print-matrix th:last-child, .academic-print-report .coursework-print-matrix td:last-child { min-width: 110px; }
    .academic-print-report .print-coursework-section + .print-coursework-section { break-before: page; page-break-before: always; }
    @media print {
      body { margin: 0; }
      button, input, select, textarea, nav, header, footer, .btn, .sidebar, .tabs { display: none !important; }
    }
  `;
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${Helpers.escapeHtml(title)}</title><style>${embeddedStyles}\n${printStyles}</style></head><body>${html}<script>window.onload=function(){setTimeout(()=>window.print(),400);}<\/script></body></html>`);
  win.document.close();
}

/* ============================================================
   SIDEBAR & MAIN RENDER
   ============================================================ */
function buildSidebar() {
  const nav = document.getElementById('sideNav');
  const sidebar = document.getElementById('sidebar');
  const user = State.currentUser;
  if (!user) { sidebar.classList.add('hidden'); return; }
  sidebar.classList.remove('hidden');
  let html = '';
  if (user.type === 'student') {
    html = `<div class="nav-section"><div class="nav-title">القائمة</div><div class="nav-item active" data-page="dashboard"><span class="icon">👤</span> ملفي</div></div>`;
  } else if (user.type === 'servant') {
    const s = user.data;
    html = `
      <div class="nav-section"><div class="nav-title">الرئيسية</div>
      <div class="nav-item active" data-page="dashboard"><span class="icon">📊</span> لوحة التحكم</div></div>
      <div class="nav-section"><div class="nav-title">التعليم</div>
        ${Helpers.canEditStudents(s) ? '<div class="nav-item" data-page="dashboard" data-tab="manage_students"><span class="icon">👨‍🎓</span> إدارة الدارسين</div>' : ''}
        ${Helpers.canEditAttendance(s) ? '<div class="nav-item" data-page="dashboard" data-tab="attendance"><span class="icon">📋</span> الحضور</div>' : ''}
        ${Helpers.canViewAllGrades(s) ? '<div class="nav-item" data-page="dashboard" data-tab="quick_eval"><span class="icon">⚡</span> أعمال السنة</div>' : ''}
        ${Helpers.canViewAllGrades(s) ? '<div class="nav-item" data-page="dashboard" data-tab="exams"><span class="icon">🎓</span> الامتحانات</div>' : ''}
        ${Helpers.canAddVisitationNotes(s) ? '<div class="nav-item" data-page="dashboard" data-tab="visitation"><span class="icon">🙏</span> النوتة الروحية</div>' : ''}
      </div>`;
  } else if (user.type === 'admin') {
    html = `
      <div class="nav-section"><div class="nav-title">الرئيسية</div>
      <div class="nav-item active" data-page="dashboard" data-tab="students"><span class="icon">📊</span> لوحة التحكم</div></div>
      <div class="nav-section"><div class="nav-title">الإدارة</div>
        <div class="nav-item" data-page="dashboard" data-tab="students"><span class="icon">👨‍🎓</span> الدارسين النشطين</div>
        <div class="nav-item" data-page="dashboard" data-tab="graduates"><span class="icon">🎓</span> خريجي إعداد الخدام</div>
        <div class="nav-item" data-page="dashboard" data-tab="servants"><span class="icon">👨‍🏫</span> الخدام</div>
        <div class="nav-item" data-page="dashboard" data-tab="attendance"><span class="icon">📋</span> الحضور</div>
        <div class="nav-item" data-page="dashboard" data-tab="evaluation"><span class="icon">⚡</span> التقييم</div>
        <div class="nav-item" data-page="dashboard" data-tab="exams"><span class="icon">🎓</span> الامتحانات</div>
        <div class="nav-item" data-page="dashboard" data-tab="notes"><span class="icon">📔</span> النوتة الروحية</div>
      </div>
      <div class="nav-section"><div class="nav-title">المراقبة</div>
        <div class="nav-item" data-page="dashboard" data-tab="sessions"><span class="icon">👁️</span> المتصلون الآن</div>
      </div>
      <div class="nav-section"><div class="nav-title">النظام</div>
        <div class="nav-item" data-page="dashboard" data-tab="reports"><span class="icon">🖨️</span> التقارير</div>
        <div class="nav-item" data-page="dashboard" data-tab="system"><span class="icon">⚙️</span> إدارة النظام</div>
      </div>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => {
      if (el.dataset.tab) State.activeTab['dashboard'] = el.dataset.tab;
      State.setPage(el.dataset.page);
      if (window.innerWidth <= 1024) document.getElementById('sidebar').classList.remove('open');
    };
  });
}

function renderApp() {
  const app = document.getElementById('appContainer');
  const navLogin = document.getElementById('navLoginBtn');
  const navDash = document.getElementById('navDashBtn');
  const navLogout = document.getElementById('navLogoutBtn');
  const user = State.currentUser;
  if (user) {
    navLogin.classList.add('hidden'); navDash.classList.remove('hidden'); navLogout.classList.remove('hidden');
    navDash.textContent = user.type === 'student' ? '👨‍🎓 لوحتي' : user.type === 'servant' ? '👨‍🏫 لوحة الخادم' : '👨‍💼 لوحة التحكم';
  } else {
    navLogin.classList.remove('hidden'); navDash.classList.add('hidden'); navLogout.classList.add('hidden');
  }
  buildSidebar();
  document.querySelectorAll('#mainNav button[data-page]').forEach(b => b.classList.remove('active'));
  const active = document.querySelector(`#mainNav button[data-page="${State.currentPage}"]`);
  if (active) active.classList.add('active');
  switch (State.currentPage) {
    case 'home': app.innerHTML = renderHome(); document.getElementById('sidebar').classList.add('hidden'); break;
    case 'login':
      app.innerHTML = renderLogin();
      document.getElementById('sidebar').classList.add('hidden');
      document.querySelectorAll('#loginTabs button').forEach(btn => btn.addEventListener('click', function() { switchLoginTab(this.dataset.role); }));
      break;
    case 'dashboard':
      if (!user) { State.setPage('login'); return; }
      if (user.type === 'student') {
        app.innerHTML = renderStudentDashboard();
        document.querySelectorAll('#studentTabs button').forEach(btn => btn.addEventListener('click', function() { State.setTab(this.dataset.tab); }));
      } else if (user.type === 'servant') {
        app.innerHTML = renderServantDashboard();
        document.querySelectorAll('#servantTabs button').forEach(btn => btn.addEventListener('click', function() { State.setTab(this.dataset.tab); }));
      } else if (user.type === 'admin') {
        app.innerHTML = renderAdminDashboard();
        document.querySelectorAll('#adminTabs button').forEach(btn => btn.addEventListener('click', function() { State.setTab(this.dataset.tab); }));
      }
      break;
    default: app.innerHTML = renderHome();
  }
  document.querySelectorAll('#mainNav button[data-page]').forEach(btn => {
    btn.addEventListener('click', function() { State.setPage(this.dataset.page); });
  });
}

/* ============================================================
   PWA - Service Worker Registration
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (deferredPrompt && !localStorage.getItem('pwa_dismissed')) {
      document.getElementById('pwaBanner').classList.add('show');
    }
  }, 5000);
});

function installPWA() {
  if (!deferredPrompt) { showToast('⚠️ التطبيق مثبت بالفعل', 'warning'); return; }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') showToast('✅ تم تثبيت التطبيق');
    deferredPrompt = null;
    document.getElementById('pwaBanner').classList.remove('show');
  });
}
function dismissPWA() {
  document.getElementById('pwaBanner').classList.remove('show');
  localStorage.setItem('pwa_dismissed', 'true');
}
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('✅ Service Worker registered:', registration.scope);
    } catch (e) { console.warn('❌ Service Worker registration failed:', e); }
  }
}

/* ============================================================
   Init
   ============================================================ */
async function init() {
  ConnectionState.init();
  await AuthManager.init();
  await registerServiceWorker();
  
  const session = DB.getSession();
  if (session) {
    State.currentUser = session;
    const savedSessionId = localStorage.getItem('habib_session_id');
    if (savedSessionId) {
      SessionTracker.currentSessionId = savedSessionId;
      SessionTracker.deviceFingerprint = getDeviceFingerprint();
      SessionTracker.startHeartbeat();
    } else {
      await SessionTracker.startSession(session);
    }
  }
  
  document.getElementById('navLogoutBtn').addEventListener('click', () => State.logout());
  document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
  
  window.addEventListener('beforeunload', () => { SessionTracker.endSession(); });
  
  if (State.currentUser) await AppData.loadAll();
  
  if (State.currentUser?.type === 'admin') {
    SessionTracker.startMonitoring((sessions) => {
      AppData.activeSessions = sessions;
      if (State.currentPage === 'dashboard' && State.getTab() === 'sessions') renderApp();
    });
  }
  
  setInterval(() => {
    if (State.currentUser?.type === 'admin' && State.currentPage === 'dashboard' && State.getTab() === 'sessions') {
      renderApp();
    }
  }, 30000);
  
  renderApp();
  showToast('✅ تم الاتصال');
}
document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   Global Exports
   ============================================================ */
Object.assign(window, {
  State, AppData, Helpers, GRADING_SYSTEM, SessionTracker, renderApp,
  handleLogin, switchLoginTab, closeModal, showToast, toggleSidebar,
  saveAttendanceBulk, markAllPresent, markAllAbsent, changeWeek,
  saveQuickEvaluations, saveExamsBulk,
  changeServantPassword, changeAdminPassword,
  openAddStudentModal, saveNewStudent, regenerateStudentCode, updateStudyBookOptions, copyToClipboard,
  openEditStudentModal, updateStudentData, deleteStudentConfirm, openStudentFile, filterStudentsTable, updateDeaconOptions,
  openAddServantModal, saveNewServant, toggleAllClassesBtn, toggleClassBtn,
  openEditServantModal, updateServantData, deleteServantConfirm, sendServantResetLink, applyRolePreset,
  toggleEditAllClassesBtn, toggleEditClassBtn,
  openNotesModal, saveNote, filterNotesStudents, openSpiritualNoteModal, reloadSpiritualNote, saveSpiritualNote, openSpiritualNoteRules,
  openStudentSpiritualNoteModal, approveSpiritualNote,
  saveSettings, addCurriculumSubject, saveAttendancePolicy, viewAttendancePolicyHistory, AttendanceEngine,
  saveCourseworkEvaluations, CourseworkEngine,
  backupFullData, restoreFullData, executeSystemReset,
  exportStudentsExcel, exportServantsExcel, exportAllGradesExcel,
  exportAttendanceExcel, exportEvaluationsExcel, exportExamsExcel, exportPDF,
  printClassList, printAttendanceReport, printClassGradesReport,
  printClassNotesReport, printAllVisitationReports, printStudentCard, printStudentAcademicFile,
  printMonthlySpiritualNoteReport, approveMonthlySpiritualNotes, canApproveMonthlyNotes,
  printSystemReport, printAllReports,
  selectReportClass,
  forceLogoutUser, cleanupSessions,
  installPWA, dismissPWA
});
