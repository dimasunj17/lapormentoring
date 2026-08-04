// ==========================================
// 1. ISIKAN URL DAN ANON KEY SUPABASE ANDA
// ==========================================
const SUPABASE_URL = "https://bovkynryjqxskypgvnim.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdmt5bnJ5anF4c2t5cGd2bmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzQzOTEsImV4cCI6MjEwMDk1MDM5MX0.BuEN0Op4wnsO2cnpEWtsRpWz-OCBEKcJVDkHmvkugpc";

// Inisialisasi Supabase Client
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- STATE MANAGEMENT ---
let currentUserData = null;
let reports = [];
let modules = [];
let usersList = [];
let currentFilteredReports = [];
let currentReportAttendees = [];
let keterlaksanaanChartInstance = null;

// --- DOM ELEMENTS ---
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');

// Forms Auth
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');

// Navigasi Auth
const linkToRegister = document.getElementById('link-to-register');
const linkToLoginFromReg = document.getElementById('link-to-login-from-reg');
const linkToForgot = document.getElementById('link-to-forgot');
const linkToLoginFromForgot = document.getElementById('link-to-login-from-forgot');
const btnLogout = document.getElementById('btn-logout');

// Top Navbar Details
const displayUserName = document.getElementById('display-user-name');
const displayUserRole = document.getElementById('display-user-role');

// Tabs
const tabReportsBtn = document.getElementById('tab-reports-btn');
const tabModulesBtn = document.getElementById('tab-modules-btn');
const tabUsersBtn = document.getElementById('tab-users-btn');

const viewReports = document.getElementById('view-reports');
const viewModules = document.getElementById('view-modules');
const viewUsers = document.getElementById('view-users');
const thUserAction = document.getElementById('th-user-action');

// Mentoring Elements
const tableBody = document.getElementById('report-table-body');
const userTableBody = document.getElementById('user-table-body');
const mentoringForm = document.getElementById('mentoring-form');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const searchInput = document.getElementById('search-input');
const btnAdd = document.getElementById('btn-add');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel');
const btnExportExcel = document.getElementById('btn-export-excel');

// Presensi & Preset Elements
const inputNewMember = document.getElementById('input-new-member');
const btnAddMemberList = document.getElementById('btn-add-member-list');
const membersChecklistContainer = document.getElementById('members-checklist-container');
const displayAutoCount = document.getElementById('display-auto-count');
const btnLoadPresetMembers = document.getElementById('btn-load-preset-members');
const btnSaveAsPreset = document.getElementById('btn-save-as-preset');

// Modul Elements
const btnAddModule = document.getElementById('btn-add-module');
const modalModuleOverlay = document.getElementById('modal-module-overlay');
const btnCloseModuleModal = document.getElementById('btn-close-module-modal');
const moduleForm = document.getElementById('module-form');
const modulesContainer = document.getElementById('modules-container');
const searchModuleInput = document.getElementById('search-module-input');

// Metrics
const statTotalMentors = document.getElementById('stat-total-mentors');
const statTotalMembers = document.getElementById('stat-total-members');
const statTotalMaterials = document.getElementById('stat-total-materials');

// Chart Elements
const chartRangeFilter = document.getElementById('chart-range-filter');
const chartGroupFilter = document.getElementById('chart-group-filter');

// --- HELPER FUNCTIONS ---
function escapeHtml(str) { 
    return str ? str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : ''; 
}

function openModal(title = 'Tambah Laporan Mentoring') { 
    if (modalTitle) modalTitle.textContent = title; 
    if (modalOverlay) modalOverlay.classList.add('active'); 
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (mentoringForm) mentoringForm.reset();
    
    const reportIdInput = document.getElementById('report-id');
    if (reportIdInput) reportIdInput.value = '';
    
    currentReportAttendees = [];
    renderAttendeesChecklist();
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    checkSession();
});

// --- AUTHENTICATION & SESSION MANAGEMENT ---
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            currentUserData = profile;
            displayUserName.textContent = profile.name;
            displayUserRole.textContent = `${profile.role} ${profile.fakultas ? '(' + profile.fakultas + ')' : ''}`;

            authSection.style.display = 'none';
            appSection.classList.remove('app-hidden');

            applyRolePermissions();
            loadAllData();
        }
    } else {
        currentUserData = null;
        authSection.style.display = 'flex';
        appSection.classList.add('app-hidden');
        showAuthForm(loginForm);
    }
}

if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(registerForm); });
if (linkToLoginFromReg) linkToLoginFromReg.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(loginForm); });
if (linkToForgot) linkToForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(forgotForm); });
if (linkToLoginFromForgot) linkToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(loginForm); });

function showAuthForm(targetForm) {
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    forgotForm.classList.remove('active');
    targetForm.classList.add('active');
}

// REGISTRASI AKUN (DENGAN FAKULTAS)
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit-reg');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Mendaftarkan...";

        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const role = document.getElementById('reg-role').value;
        const fakultas = document.getElementById('reg-fakultas').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        if (password !== confirmPassword) {
            alert('Password dan Konfirmasi Password tidak cocok!');
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Daftar Akun";
            return;
        }

        try {
            const { data: authData, error: authError } = await _supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { name: name, role: role, fakultas: fakultas } }
            });

            if (authError) throw authError;

            if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                alert('Email ini sudah terdaftar! Silakan langsung login atau reset password.');
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Daftar Akun";
                return;
            }

            if (authData.user) {
                await _supabase.from('profiles').upsert([
                    { id: authData.user.id, name: name, email: email, role: role, fakultas: fakultas }
                ], { onConflict: 'id' });
            }

            alert(`Registrasi berhasil! Akun dibuat sebagai [${role}] di [${fakultas}]. Silakan login.`);
            registerForm.reset();
            showAuthForm(loginForm);

        } catch (err) {
            alert('Gagal Registrasi: ' + err.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Daftar Akun";
        }
    });
}

// LOGIN
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit-login');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Memeriksa...";

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            loginForm.reset();
            checkSession();
        } catch (err) {
            alert('Login Gagal! Email atau password salah.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Masuk";
        }
    });
}

// TOGGLE LIHAT/SEMBUNYIKAN PASSWORD
const toggleLoginPassword = document.getElementById('toggle-login-password');
const loginPasswordInput = document.getElementById('login-password');

if (toggleLoginPassword && loginPasswordInput) {
    toggleLoginPassword.addEventListener('click', () => {
        const isPassword = loginPasswordInput.getAttribute('type') === 'password';
        loginPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleLoginPassword.classList.toggle('fa-eye', !isPassword);
        toggleLoginPassword.classList.toggle('fa-eye-slash', isPassword);
    });
}

// LOGOUT
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (confirm('Keluar dari sistem?')) {
            await _supabase.auth.signOut();
            checkSession();
        }
    });
}

// RESET PASSWORD
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();

        try {
            const { error } = await _supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            alert('Link reset password telah dikirim ke email Anda.');
            showAuthForm(loginForm);
        } catch (err) {
            alert('Gagal: ' + err.message);
        }
    });
}

// PERMISSIONS CONTROL
function applyRolePermissions() {
    const isViewer = currentUserData.role === 'Viewer';
    const isAdminSuper = currentUserData.role === 'Admin Super';
    const isPengelola = currentUserData.role === 'Pengelola';

    document.querySelectorAll('.role-write-only').forEach(el => {
        el.style.display = isViewer ? 'none' : '';
    });

    document.querySelectorAll('.role-manager-only').forEach(el => {
        el.style.display = (isAdminSuper || isPengelola) ? '' : 'none';
    });

    if (isAdminSuper || isPengelola) {
        tabUsersBtn.style.display = '';
    } else {
        tabUsersBtn.style.display = 'none';
        switchTab('reports');
    }
}

// TABS NAVIGATION
if (tabReportsBtn) tabReportsBtn.addEventListener('click', () => switchTab('reports'));
if (tabModulesBtn) tabModulesBtn.addEventListener('click', () => switchTab('modules'));
if (tabUsersBtn) tabUsersBtn.addEventListener('click', () => switchTab('users'));

function switchTab(tab) {
    [tabReportsBtn, tabModulesBtn, tabUsersBtn].forEach(b => b && b.classList.remove('active'));
    [viewReports, viewModules, viewUsers].forEach(v => v && v.classList.remove('active'));

    if (tab === 'reports') {
        if (tabReportsBtn) tabReportsBtn.classList.add('active');
        if (viewReports) viewReports.classList.add('active');
    } else if (tab === 'modules') {
        if (tabModulesBtn) tabModulesBtn.classList.add('active');
        if (viewModules) viewModules.classList.add('active');
    } else if (tab === 'users') {
        if (tabUsersBtn) tabUsersBtn.classList.add('active');
        if (viewUsers) viewUsers.classList.add('active');
    }
}

// --- LOAD ALL DATA (DENGAN MULTITENANCY FAKULTAS) ---
async function loadAllData() {
    try {
        let query = _supabase.from('reports').select('*');

        // 1. JIKA ROLE MENTOR: Hanya ambil laporannya sendiri
        if (currentUserData && currentUserData.role === 'Mentor') {
            query = query.eq('user_id', currentUserData.id);
        } 
        // 2. JIKA ROLE PENGELOLA FAKULTAS: Saring khusus dari fakultasnya
        else if (currentUserData && currentUserData.role === 'Pengelola' && currentUserData.fakultas) {
            query = query.ilike('fakultas', `%${currentUserData.fakultas}%`);
        }

        const { data: reportsData, error: reportsError } = await query.order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        reports = reportsData || [];
        
        renderTable();
        updateDashboard();
        renderKeterlaksanaanChart();

        // Load Modul
        if (typeof renderModules === 'function') {
            const { data: modulesData } = await _supabase.from('modules').select('*').order('created_at', { ascending: false });
            modules = modulesData || [];
            renderModules();
        }

        // Load Users
        if (currentUserData && (currentUserData.role === 'Admin Super' || currentUserData.role === 'Pengelola')) {
            let userQuery = _supabase.from('profiles').select('*');
            if (currentUserData.role === 'Pengelola' && currentUserData.fakultas) {
                userQuery = userQuery.ilike('fakultas', `%${currentUserData.fakultas}%`);
            }
            const { data: profilesData } = await userQuery;
            usersList = profilesData || [];
            if (typeof renderUserTable === 'function') renderUserTable();
        }
    } catch (err) {
        console.error('Error loadAllData:', err.message);
    }
}

// --- PRESENSI ANGGOTA DINAMIS & PRESET KELOMPOK BINAAN ---
if (btnLoadPresetMembers) btnLoadPresetMembers.addEventListener('click', () => loadPresetMembersToForm(true));
if (btnSaveAsPreset) btnSaveAsPreset.addEventListener('click', saveCurrentMembersAsPreset);

if (btnAddMemberList) btnAddMemberList.addEventListener('click', addMemberToChecklist);
if (inputNewMember) {
    inputNewMember.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMemberToChecklist();
        }
    });
}

function addMemberToChecklist() {
    if (!inputNewMember) return;
    const name = inputNewMember.value.trim();
    if (!name) return;

    if (currentReportAttendees.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert('Nama anggota tersebut sudah ada di daftar!');
        return;
    }

    currentReportAttendees.push({ name: name, isPresent: true });
    inputNewMember.value = '';
    renderAttendeesChecklist();
}

function renderAttendeesChecklist() {
    if (!membersChecklistContainer) return;
    membersChecklistContainer.innerHTML = '';

    if (currentReportAttendees.length === 0) {
        membersChecklistContainer.innerHTML = `
            <p id="empty-members-msg" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0;">
                Belum ada anggota ditambahkan. Klik tombol "Muat Kelompok Saya" di atas untuk memuat daftar otomatis.
            </p>
        `;
        updateAttendanceCount();
        return;
    }

    currentReportAttendees.forEach((member, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 0.4rem;';

        itemDiv.innerHTML = `
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0; font-size: 0.9rem; flex: 1;">
                <input type="checkbox" ${member.isPresent ? 'checked' : ''} onchange="window.toggleAttendance(${index})">
                <span style="${member.isPresent ? 'font-weight: 600;' : 'color: #94a3b8; text-decoration: line-through;'}">${escapeHtml(member.name)}</span>
            </label>
            <button type="button" class="btn-action btn-delete" onclick="window.removeMemberFromChecklist(${index})" title="Hapus Anggota" style="font-size: 0.85rem;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        membersChecklistContainer.appendChild(itemDiv);
    });

    updateAttendanceCount();
}

window.toggleAttendance = function(index) {
    currentReportAttendees[index].isPresent = !currentReportAttendees[index].isPresent;
    renderAttendeesChecklist();
};

window.removeMemberFromChecklist = function(index) {
    currentReportAttendees.splice(index, 1);
    renderAttendeesChecklist();
};

function updateAttendanceCount() {
    if (!displayAutoCount) return;
    const presentCount = currentReportAttendees.filter(m => m.isPresent).length;
    displayAutoCount.textContent = `Total Hadir: ${presentCount} Orang`;
}

// LOGIKA KELOMPOK BINAAN TETAP (PRESET)
function loadPresetMembersToForm(showAlertIfEmpty = false) {
    if (currentUserData && Array.isArray(currentUserData.group_members) && currentUserData.group_members.length > 0) {
        currentReportAttendees = currentUserData.group_members.map(name => ({
            name: typeof name === 'object' ? name.name : name,
            isPresent: true
        }));
        renderAttendeesChecklist();
    } else {
        if (showAlertIfEmpty) {
            alert('Anda belum menyimpan Kelompok Binaan Tetap. Silakan tambahkan nama-nama anggota Anda, lalu klik "Simpan daftar di atas sebagai Kelompok Binaan Tetap saya".');
        }
    }
}

async function saveCurrentMembersAsPreset() {
    if (!currentUserData || !currentUserData.id) return alert('Sesi berakhir!');
    if (currentReportAttendees.length === 0) return alert('Tambahkan minimal 1 nama anggota terlebih dahulu!');

    const memberNames = currentReportAttendees.map(m => m.name);

    try {
        const { error } = await _supabase
            .from('profiles')
            .update({ group_members: memberNames })
            .eq('id', currentUserData.id);

        if (error) throw error;

        currentUserData.group_members = memberNames;
        alert('Daftar anggota berhasil disimpan sebagai Kelompok Binaan Tetap Anda!');
    } catch (err) {
        alert('Gagal menyimpan kelompok tetap: ' + err.message);
    }
}

// --- CRUD LAPORAN MENTORING ---
if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        currentReportAttendees = [];
        
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
        if (document.getElementById('mentoring-date')) document.getElementById('mentoring-date').value = today;
        if (document.getElementById('mentoring-time')) document.getElementById('mentoring-time').value = now;

        // Auto Load Anggota Tetap Jika Ada
        loadPresetMembersToForm();

        openModal('Tambah Laporan Mentoring');
    });
}

if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
if (btnCancel) btnCancel.addEventListener('click', closeModal);
if (mentoringForm) mentoringForm.addEventListener('submit', handleFormSubmit);
if (searchInput) searchInput.addEventListener('input', handleSearch);

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!currentUserData || !currentUserData.id) return alert('Sesi Anda telah berakhir. Silakan login kembali.');
    if (!Array.isArray(currentReportAttendees) || currentReportAttendees.length === 0) {
        return alert('Silakan tambahkan minimal 1 nama anggota binaan di bagian ceklis terlebih dahulu!');
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Menyimpan...";

    const id = document.getElementById('report-id').value;
    const presentMembersCount = currentReportAttendees.filter(m => m.isPresent).length;

    const reportData = {
        mentor_name: document.getElementById('mentor-name').value.trim(),
        mentoring_date: document.getElementById('mentoring-date').value,
        mentoring_time: document.getElementById('mentoring-time').value,
        location: document.getElementById('location').value.trim(),
        member_count: presentMembersCount,
        attendees: currentReportAttendees,
        fakultas: document.getElementById('fakultas').value.trim(),
        prodi: document.getElementById('prodi').value.trim(),
        angkatan: document.getElementById('angkatan').value.trim(),
        materi: document.getElementById('materi').value.trim(),
        user_id: currentUserData.id
    };

    try {
        if (id) {
            const { error } = await _supabase.from('reports').update(reportData).eq('id', id);
            if (error) throw error;
            alert('Laporan berhasil diperbarui!');
        } else {
            const { error } = await _supabase.from('reports').insert([reportData]);
            if (error) throw error;
            alert('Laporan berhasil disimpan!');
        }

        closeModal();
        await loadAllData();
    } catch (err) {
        console.error('Error simpan laporan:', err);
        alert('Gagal menyimpan laporan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalBtnText;
    }
}

// RENDER TABEL
function renderTable(dataToRender = reports) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const isViewer = currentUserData && currentUserData.role === 'Viewer';

    if (!dataToRender || dataToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${isViewer ? '6' : '7'}" style="text-align: center; color: var(--text-muted);">Belum ada data laporan.</td></tr>`;
        return;
    }

    dataToRender.forEach((item) => {
        let dateFormatted = '-';
        if (item.mentoring_date) {
            try {
                dateFormatted = new Date(item.mentoring_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            } catch (e) {
                dateFormatted = item.mentoring_date;
            }
        }

        const timeFormatted = item.mentoring_time ? item.mentoring_time.substring(0, 5) + ' WIB' : '';
        const dateTimeText = timeFormatted ? `${dateFormatted}, ${timeFormatted}` : dateFormatted;
        const locationText = item.location || 'Lokasi belum diisi';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(item.mentor_name || '-')}</strong></td>
            <td>
                <div style="font-size: 0.9rem; font-weight: 500;">
                    <i class="fa-regular fa-calendar-days" style="color: var(--primary-color);"></i> ${escapeHtml(dateTimeText)}
                </div>
                <small style="color: var(--text-muted); display: block; margin-top: 2px;">
                    <i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ${escapeHtml(locationText)}
                </small>
            </td>
            <td><i class="fa-solid fa-user-group"></i> ${item.member_count || 0} Orang</td>
            <td>
                <div>${escapeHtml(item.prodi || '-')}</div>
                <small style="color: var(--text-muted);">${escapeHtml(item.fakultas || '-')}</small>
            </td>
            <td><span class="badge-angkatan">${escapeHtml(item.angkatan || '-')}</span></td>
            <td><div class="materi-preview" title="${escapeHtml(item.materi || '')}">${escapeHtml(item.materi || '-')}</div></td>
            ${isViewer ? '' : `
            <td>
                <button type="button" class="btn-action btn-edit" onclick="window.editReport('${item.id}')" title="Edit Laporan">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" class="btn-action btn-delete" onclick="window.deleteReport('${item.id}')" title="Hapus Laporan">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
            `}
        `;
        tableBody.appendChild(row);
    });
}

// EDIT LAPORAN
window.editReport = function(id) {
    const report = reports.find(r => String(r.id) === String(id));
    if (!report) return alert('Data laporan tidak ditemukan!');

    document.getElementById('report-id').value = report.id;
    document.getElementById('mentor-name').value = report.mentor_name || '';
    document.getElementById('mentoring-date').value = report.mentoring_date || '';
    document.getElementById('mentoring-time').value = report.mentoring_time || '';
    document.getElementById('location').value = report.location || '';
    document.getElementById('fakultas').value = report.fakultas || '';
    document.getElementById('prodi').value = report.prodi || '';
    document.getElementById('angkatan').value = report.angkatan || '';
    document.getElementById('materi').value = report.materi || '';

    currentReportAttendees = Array.isArray(report.attendees) ? [...report.attendees] : [];
    renderAttendeesChecklist();

    openModal('Edit Laporan Mentoring');
};

// HAPUS LAPORAN
window.deleteReport = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
        try {
            const { error } = await _supabase.from('reports').delete().eq('id', id);
            if (error) throw error;
            loadAllData();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    }
};

function updateDashboard() {
    if (statTotalMentors) statTotalMentors.textContent = reports.length;
    const totalMembers = reports.reduce((acc, curr) => acc + parseInt(curr.member_count || 0), 0);
    if (statTotalMembers) statTotalMembers.textContent = totalMembers;
    const uniqueMaterials = new Set(reports.map(r => (r.materi || '').trim().toLowerCase())).size;
    if (statTotalMaterials) statTotalMaterials.textContent = uniqueMaterials;
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    currentFilteredReports = reports.filter(r => 
        (r.mentor_name || '').toLowerCase().includes(query) ||
        (r.fakultas || '').toLowerCase().includes(query) ||
        (r.prodi || '').toLowerCase().includes(query) ||
        (r.angkatan || '').toString().includes(query) ||
        (r.materi || '').toLowerCase().includes(query)
    );
    renderTable(currentFilteredReports);
}

// --- MODUL LOGIC ---
if (btnAddModule) btnAddModule.addEventListener('click', () => modalModuleOverlay.classList.add('active'));
if (btnCloseModuleModal) btnCloseModuleModal.addEventListener('click', () => modalModuleOverlay.classList.remove('active'));
if (searchModuleInput) searchModuleInput.addEventListener('input', handleSearchModule);

if (moduleForm) {
    moduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('module-file');
        if (fileInput.files.length === 0) return alert('Pilih file terlebih dahulu!');

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function(event) {
            try {
                const modulePayload = {
                    title: document.getElementById('module-title').value.trim(),
                    target: document.getElementById('module-target').value.trim(),
                    description: document.getElementById('module-desc').value.trim(),
                    file_name: file.name,
                    file_data: event.target.result,
                    uploader: currentUserData.name
                };

                const { error } = await _supabase.from('modules').insert([modulePayload]);
                if (error) throw error;

                moduleForm.reset();
                modalModuleOverlay.classList.remove('active');
                alert('Modul berhasil disimpan ke Supabase Database!');
                loadAllData();
            } catch (err) {
                alert('Gagal upload modul: ' + err.message);
            }
        };

        reader.readAsDataURL(file);
    });
}

function renderModules(dataToRender = modules) {
    if (!modulesContainer) return;
    modulesContainer.innerHTML = '';
    if (dataToRender.length === 0) {
        modulesContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Belum ada modul di-upload.</p>`;
        return;
    }

    const isManagerOrAdmin = currentUserData && (currentUserData.role === 'Admin Super' || currentUserData.role === 'Pengelola');

    dataToRender.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'module-card';
        card.innerHTML = `
            <div>
                <div class="module-icon"><i class="fa-solid fa-file-pdf"></i></div>
                <div class="module-title">${escapeHtml(mod.title)}</div>
                <div class="module-meta"><i class="fa-solid fa-bullseye"></i> ${escapeHtml(mod.target)} | <i class="fa-solid fa-user"></i> ${escapeHtml(mod.uploader)}</div>
                <div class="module-desc">${escapeHtml(mod.description || 'Tidak ada deskripsi.')}</div>
            </div>
            <div class="module-actions">
                <a href="${mod.file_data}" download="${escapeHtml(mod.file_name)}" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;"><i class="fa-solid fa-download"></i> Unduh File</a>
                ${isManagerOrAdmin ? `<button class="btn-action btn-delete" onclick="window.deleteModule('${mod.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        modulesContainer.appendChild(card);
    });
}

window.deleteModule = async function(id) {
    if (confirm('Hapus modul ini dari Database?')) {
        try {
            const { error } = await _supabase.from('modules').delete().eq('id', id);
            if (error) throw error;
            loadAllData();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    }
};

function handleSearchModule(e) {
    const query = e.target.value.toLowerCase();
    const filtered = modules.filter(m => 
        (m.title || '').toLowerCase().includes(query) ||
        (m.target || '').toLowerCase().includes(query) ||
        (m.uploader || '').toLowerCase().includes(query)
    );
    renderModules(filtered);
}

// --- USER MANAGEMENT ---
function renderUserTable() {
    if (!userTableBody) return;
    userTableBody.innerHTML = '';
    const isAdminSuper = currentUserData && currentUserData.role === 'Admin Super';
    if (thUserAction) thUserAction.style.display = isAdminSuper ? '' : 'none';

    usersList.forEach(user => {
        const row = document.createElement('tr');
        const isSelf = user.id === currentUserData.id;

        row.innerHTML = `
            <td><strong>${escapeHtml(user.name)}</strong> ${isSelf ? '<small>(Anda)</small>' : ''}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge-role">${user.role} ${user.fakultas ? '(' + user.fakultas + ')' : ''}</span></td>
            ${isAdminSuper ? `
            <td>
                ${isSelf ? '-' : `
                    <select onchange="window.changeUserRole('${user.id}', this.value)" style="padding: 0.3rem;">
                        <option value="Mentor" ${user.role === 'Mentor' ? 'selected' : ''}>Mentor</option>
                        <option value="Pengelola" ${user.role === 'Pengelola' ? 'selected' : ''}>Pengelola</option>
                        <option value="Viewer" ${user.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                        <option value="Admin Super" ${user.role === 'Admin Super' ? 'selected' : ''}>Admin Super</option>
                    </select>
                `}
            </td>
            ` : ''}
        `;
        userTableBody.appendChild(row);
    });
}

window.changeUserRole = async function(userId, newRole) {
    if (currentUserData.role !== 'Admin Super') return alert('Hanya Admin Super yang dapat mengubah hak akses!');
    try {
        const { error } = await _supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        alert('Role user berhasil diperbarui!');
        loadAllData();
    } catch (err) {
        alert('Gagal mengubah role: ' + err.message);
    }
};

// --- EXPORT TO EXCEL ---
if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
        const dataToExport = currentFilteredReports.length > 0 ? currentFilteredReports : reports;
        if (dataToExport.length === 0) return alert('Tidak ada data laporan untuk diekspor!');

        const excelData = dataToExport.map((item, index) => ({
            "No": index + 1,
            "Nama Mentor": item.mentor_name,
            "Tanggal Mentoring": item.mentoring_date || '-',
            "Waktu": item.mentoring_time || '-',
            "Tempat / Lokasi": item.location || '-',
            "Jumlah Anggota Hadir": item.member_count,
            "Fakultas": item.fakultas,
            "Program Studi": item.prodi,
            "Angkatan": item.angkatan,
            "Materi Disampaikan": item.materi
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Mentoring");
        XLSX.writeFile(workbook, `Laporan_Mentoring_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
}

// --- GRAFIK KETERLAKSANAAN MENTORING (CHART.JS) ---
if (chartRangeFilter && chartGroupFilter) {
    chartRangeFilter.addEventListener('change', renderKeterlaksanaanChart);
    chartGroupFilter.addEventListener('change', renderKeterlaksanaanChart);
}

function renderKeterlaksanaanChart() {
    const canvas = document.getElementById('keterlaksanaanChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const range = chartRangeFilter ? chartRangeFilter.value : '6M';
    const group = chartGroupFilter ? chartGroupFilter.value : 'monthly';

    const now = new Date();
    let startDate = new Date();

    if (range === '1M') {
        startDate.setMonth(now.getMonth() - 1);
    } else if (range === '6M') {
        startDate.setMonth(now.getMonth() - 6);
    } else if (range === '1Y') {
        startDate.setFullYear(now.getFullYear() - 1);
    }

    const filteredReports = reports.filter(r => {
        if (!r.mentoring_date) return false;
        const rDate = new Date(r.mentoring_date);
        return rDate >= startDate && rDate <= now;
    });

    const groupedData = {};

    filteredReports.forEach(r => {
        const date = new Date(r.mentoring_date);
        let key = '';

        if (group === 'monthly') {
            key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        } else {
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const weekNo = Math.ceil((((date - firstDayOfMonth) / 86400000) + firstDayOfMonth.getDay() + 1) / 7);
            const monthLabel = date.toLocaleDateString('id-ID', { month: 'short' });
            key = `Pekan ${weekNo} (${monthLabel})`;
        }

        if (!groupedData[key]) {
            groupedData[key] = { totalSesi: 0, totalHadir: 0 };
        }

        groupedData[key].totalSesi += 1;
        groupedData[key].totalHadir += (parseInt(r.member_count) || 0);
    });

    const labels = Object.keys(groupedData);
    const datasetSesi = labels.map(k => groupedData[k].totalSesi);
    const datasetHadir = labels.map(k => groupedData[k].totalHadir);

    if (keterlaksanaanChartInstance) {
        keterlaksanaanChartInstance.destroy();
    }

    keterlaksanaanChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [
                {
                    label: 'Total Sesi Mentoring',
                    data: datasetSesi.length > 0 ? datasetSesi : [0],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Total Anggota Hadir',
                    data: datasetHadir.length > 0 ? datasetHadir : [0],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}