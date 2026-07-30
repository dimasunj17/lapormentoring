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

// Modul Elements
const btnAddModule = document.getElementById('btn-add-module');
const modalModuleOverlay = document.getElementById('modal-module-overlay');
const btnCloseModuleModal = document.getElementById('btn-close-module-modal');
const btnCancelModule = document.getElementById('btn-cancel-module');
const moduleForm = document.getElementById('module-form');
const modulesContainer = document.getElementById('modules-container');
const searchModuleInput = document.getElementById('search-module-input');

// Metrics
const statTotalMentors = document.getElementById('stat-total-mentors');
const statTotalMembers = document.getElementById('stat-total-members');
const statTotalMaterials = document.getElementById('stat-total-materials');

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    checkSession();
});

// --- AUTHENTICATION & SESSION MANAGEMENT ---

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        // Fetch user profile & role
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            currentUserData = profile;
            displayUserName.textContent = profile.name;
            displayUserRole.textContent = profile.role;

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

linkToRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(registerForm); });
linkToLoginFromReg.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(loginForm); });
linkToForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(forgotForm); });
linkToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthForm(loginForm); });

function showAuthForm(targetForm) {
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    forgotForm.classList.remove('active');
    targetForm.classList.add('active');
}

// 1. REGISTRASI AKUN KE SUPABASE
// REGISTRASI AKUN (PERBAIKAN METADATA & PROFILE)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-reg');
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Mendaftarkan...";

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
        alert('Password dan Konfirmasi Password tidak cocok!');
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Daftar Akun";
        return;
    }

    try {
        // 1. Mendaftarkan User ke Supabase Auth beserta Metadata
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: role
                }
            }
        });

        if (authError) throw authError;

        // Cek jika email sudah pernah terdaftar sebelumnya
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            alert('Email ini sudah terdaftar! Silakan langsung login atau reset password.');
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Daftar Akun";
            return;
        }

        // 2. Pastikan Profile di-update/dibuat ulang secara tegas jika Trigger belum sempat memproses metadata
        if (authData.user) {
            const { error: profileError } = await _supabase
                .from('profiles')
                .upsert([
                    {
                        id: authData.user.id,
                        name: name,
                        email: email,
                        role: role
                    }
                ], { onConflict: 'id' });

            if (profileError) {
                console.warn('Upsert profile fallback:', profileError.message);
            }
        }

        alert(`Registrasi berhasil! Akun dibuat sebagai [${role}]. Silakan login.`);
        registerForm.reset();
        showAuthForm(loginForm);

    } catch (err) {
        alert('Gagal Registrasi: ' + err.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Daftar Akun";
    }
});

// registerForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const btnSubmit = document.getElementById('btn-submit-reg');
//     btnSubmit.disabled = true;
//     btnSubmit.textContent = "Mendaftarkan...";

//     const name = document.getElementById('reg-name').value.trim();
//     const email = document.getElementById('reg-email').value.trim();
//     const role = document.getElementById('reg-role').value;
//     const password = document.getElementById('reg-password').value;
//     const confirmPassword = document.getElementById('reg-confirm-password').value;

//     if (password !== confirmPassword) {
//         alert('Password dan Konfirmasi Password tidak cocok!');
//         btnSubmit.disabled = false;
//         btnSubmit.textContent = "Daftar Akun";
//         return;
//     }

//     try {
//         // A. SignUp User di Supabase Auth
//         const { data: authData, error: authError } = await _supabase.auth.signUp({
//             email,
//             password
//         });

//         if (authError) throw authError;

//         if (authData.user) {
//             // B. Simpan data tambahan profil & role ke tabel `profiles`
//             const { error: profileError } = await _supabase
//                 .from('profiles')
//                 .insert([
//                     { id: authData.user.id, name, email, role }
//                 ]);

//             if (profileError) throw profileError;

//             alert('Registrasi berhasil! Silakan login.');
//             registerForm.reset();
//             showAuthForm(loginForm);
//         }
//     } catch (err) {
//         alert('Gagal Registrasi: ' + err.message);
//     } finally {
//         btnSubmit.disabled = false;
//         btnSubmit.textContent = "Daftar Akun";
//     }
// });

// 2. LOGIN DENGAN SUPABASE
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

// 3. LOGOUT
btnLogout.addEventListener('click', async () => {
    if (confirm('Keluar dari sistem?')) {
        await _supabase.auth.signOut();
        checkSession();
    }
});

// 4. RESET PASSWORD VIA EMAIL
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

// --- PERMISSIONS CONTROL ---
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

// --- TABS NAVIGATION ---
tabReportsBtn.addEventListener('click', () => switchTab('reports'));
tabModulesBtn.addEventListener('click', () => switchTab('modules'));
tabUsersBtn.addEventListener('click', () => switchTab('users'));

function switchTab(tab) {
    [tabReportsBtn, tabModulesBtn, tabUsersBtn].forEach(b => b.classList.remove('active'));
    [viewReports, viewModules, viewUsers].forEach(v => v.classList.remove('active'));

    if (tab === 'reports') {
        tabReportsBtn.classList.add('active');
        viewReports.classList.add('active');
    } else if (tab === 'modules') {
        tabModulesBtn.classList.add('active');
        viewModules.classList.add('active');
    } else if (tab === 'users') {
        tabUsersBtn.classList.add('active');
        viewUsers.classList.add('active');
    }
}

// --- FETCH DATA FROM SUPABASE DATABASE ---
async function loadAllData() {
    // 1. Fetch Reports
    const { data: reportsData } = await _supabase.from('reports').select('*').order('created_at', { ascending: false });
    reports = reportsData || [];
    renderTable();
    updateDashboard();

    // 2. Fetch Modules
    const { data: modulesData } = await _supabase.from('modules').select('*').order('created_at', { ascending: false });
    modules = modulesData || [];
    renderModules();

    // 3. Fetch Users (Khusus Admin/Pengelola)
    if (currentUserData.role === 'Admin Super' || currentUserData.role === 'Pengelola') {
        const { data: profilesData } = await _supabase.from('profiles').select('*');
        usersList = profilesData || [];
        renderUserTable();
    }
}

// --- CRUD LAPORAN MENTORING (SUPABASE) ---
btnAdd.addEventListener('click', () => openModal('Tambah Laporan Mentoring'));
btnCloseModal.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
mentoringForm.addEventListener('submit', handleFormSubmit);
searchInput.addEventListener('input', handleSearch);

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('report-id').value;
    const reportData = {
        mentor_name: document.getElementById('mentor-name').value.trim(),
        member_count: parseInt(document.getElementById('member-count').value),
        fakultas: document.getElementById('fakultas').value.trim(),
        prodi: document.getElementById('prodi').value.trim(),
        angkatan: document.getElementById('angkatan').value.trim(),
        materi: document.getElementById('materi').value.trim()
    };

    try {
        if (id) {
            // Update Data
            const { error } = await _supabase.from('reports').update(reportData).eq('id', id);
            if (error) throw error;
        } else {
            // Insert Data Baru
            const { error } = await _supabase.from('reports').insert([reportData]);
            if (error) throw error;
        }

        closeModal();
        loadAllData();
    } catch (err) {
        alert('Gagal menyimpan laporan: ' + err.message);
    }
}

function renderTable(dataToRender = reports) {
    tableBody.innerHTML = '';
    const isViewer = currentUserData.role === 'Viewer';

    if (dataToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${isViewer ? '5' : '6'}" style="text-align: center; color: var(--text-muted);">Belum ada data laporan.</td></tr>`;
        return;
    }

    dataToRender.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(item.mentor_name)}</strong></td>
            <td><i class="fa-solid fa-user-group"></i> ${item.member_count} Orang</td>
            <td><div>${escapeHtml(item.prodi)}</div><small style="color: var(--text-muted);">${escapeHtml(item.fakultas)}</small></td>
            <td><span class="badge-angkatan">${escapeHtml(item.angkatan)}</span></td>
            <td><div class="materi-preview" title="${escapeHtml(item.materi)}">${escapeHtml(item.materi)}</div></td>
            ${isViewer ? '' : `
            <td>
                <button class="btn-action btn-edit" onclick="editReport('${item.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-action btn-delete" onclick="deleteReport('${item.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </td>
            `}
        `;
        tableBody.appendChild(row);
    });
}

window.editReport = function(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    document.getElementById('report-id').value = report.id;
    document.getElementById('mentor-name').value = report.mentor_name;
    document.getElementById('member-count').value = report.member_count;
    document.getElementById('fakultas').value = report.fakultas;
    document.getElementById('prodi').value = report.prodi;
    document.getElementById('angkatan').value = report.angkatan;
    document.getElementById('materi').value = report.materi;

    openModal('Edit Laporan Mentoring');
};

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
    statTotalMentors.textContent = reports.length;
    const totalMembers = reports.reduce((acc, curr) => acc + parseInt(curr.member_count || 0), 0);
    statTotalMembers.textContent = totalMembers;
    const uniqueMaterials = new Set(reports.map(r => r.materi.trim().toLowerCase())).size;
    statTotalMaterials.textContent = uniqueMaterials;
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    currentFilteredReports = reports.filter(r => 
        r.mentor_name.toLowerCase().includes(query) ||
        r.fakultas.toLowerCase().includes(query) ||
        r.prodi.toLowerCase().includes(query) ||
        r.angkatan.toString().includes(query) ||
        r.materi.toLowerCase().includes(query)
    );
    renderTable(currentFilteredReports);
}

// --- MODUL LOGIC (SUPABASE DATABASE) ---
btnAddModule.addEventListener('click', () => modalModuleOverlay.classList.add('active'));
btnCloseModuleModal.addEventListener('click', () => modalModuleOverlay.classList.remove('active'));
btnCancelModule.addEventListener('click', () => modalModuleOverlay.classList.remove('active'));
searchModuleInput.addEventListener('input', handleSearchModule);

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

function renderModules(dataToRender = modules) {
    modulesContainer.innerHTML = '';
    if (dataToRender.length === 0) {
        modulesContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Belum ada modul di-upload.</p>`;
        return;
    }

    const isManagerOrAdmin = currentUserData.role === 'Admin Super' || currentUserData.role === 'Pengelola';

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
                ${isManagerOrAdmin ? `<button class="btn-action btn-delete" onclick="deleteModule('${mod.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
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
        m.title.toLowerCase().includes(query) ||
        m.target.toLowerCase().includes(query) ||
        m.uploader.toLowerCase().includes(query)
    );
    renderModules(filtered);
}

// --- USER MANAGEMENT (UBAH ROLE DI SUPABASE) ---
function renderUserTable() {
    userTableBody.innerHTML = '';
    const isAdminSuper = currentUserData.role === 'Admin Super';
    thUserAction.style.display = isAdminSuper ? '' : 'none';

    usersList.forEach(user => {
        const row = document.createElement('tr');
        const isSelf = user.id === currentUserData.id;

        row.innerHTML = `
            <td><strong>${escapeHtml(user.name)}</strong> ${isSelf ? '<small>(Anda)</small>' : ''}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge-role">${user.role}</span></td>
            ${isAdminSuper ? `
            <td>
                ${isSelf ? '-' : `
                    <select onchange="changeUserRole('${user.id}', this.value)" style="padding: 0.3rem;">
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
btnExportExcel.addEventListener('click', () => {
    const dataToExport = currentFilteredReports.length > 0 ? currentFilteredReports : reports;
    if (dataToExport.length === 0) return alert('Tidak ada data laporan untuk diekspor!');

    const excelData = dataToExport.map((item, index) => ({
        "No": index + 1,
        "Nama Mentor": item.mentor_name,
        "Jumlah Anggota": item.member_count,
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

// Helper Modal & Escape HTML
function openModal(title) { modalTitle.textContent = title; modalOverlay.classList.add('active'); }
function closeModal() { modalOverlay.classList.remove('active'); mentoringForm.reset(); document.getElementById('report-id').value = ''; }
function escapeHtml(str) { return str ? str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : ''; }