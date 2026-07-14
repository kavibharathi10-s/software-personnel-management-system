// API Base URL
const API_BASE_URL = window.location.origin;

// Chart instances
let performanceChart = null;
let growthChart = null;
let employeeRankingChart = null;
let allEmployeesList = [];

// ========== TOAST NOTIFICATION ==========
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== SECTION SWITCHING ==========
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) selectedSection.style.display = 'block';
    
    switch(sectionId) {
        case 'pendingRequests': loadPendingRequests(); break;
        case 'allEmployees': loadAllEmployees(); break;
        case 'attendance': loadGlobalAttendance(); break;
        case 'projects': loadAllProjects(); break;
        case 'performance': loadPerformanceData(); loadMonthlyGrowthChart(); break;
        case 'payroll': loadPayrollRecords(); loadManagers(); break;
        case 'meetings': loadMeetings(); loadAllUsersForMeeting(); break;
        case 'profile': loadProfile(); break;
    }
}

// ========== PENDING REQUESTS ==========
async function loadPendingRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/pending`);
        if (!response.ok) throw new Error('Network response was not ok');
        const requests = await response.json();
        const managersRes = await fetch(`${API_BASE_URL}/api/users/managers`);
        const managers = await managersRes.json();
        
        const tbody = document.getElementById('requestsTableBody');
        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No pending requests</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        requests.forEach(req => {
            const row = tbody.insertRow();
            let roleColor = req.role === 'EMPLOYEE' ? 'badge-employee' : req.role === 'MANAGER' ? 'badge-manager' : req.role === 'HR' ? 'badge-hr' : 'badge-client';
            
            let actionButtons = '';
            if (req.role === 'EMPLOYEE') {
                actionButtons = `
                    <div class="action-buttons-horizontal">
                        <select id="managerSelect_${req.id}" class="manager-select-dropdown">
                            <option value="">-- Select Manager --</option>
                            ${managers.map(m => `<option value="${m.id}">👔 ${m.name}</option>`).join('')}
                        </select>
                        <button class="btn btn-sm btn-approve" onclick="approveUserWithManager('${req.id}', '${req.name}')">Approve</button>
                        <button class="btn btn-sm btn-reject" onclick="rejectUserWithReason('${req.id}', '${req.name}')">Reject</button>
                        <button class="btn btn-sm btn-view" onclick="viewDocument('${req.certificateProof || ''}')">View Doc</button>
                    </div>
                `;
            } else {
                actionButtons = `
                    <div class="action-buttons-horizontal">
                        <button class="btn btn-sm btn-approve" onclick="approveUser('${req.id}', '${req.name}')">Approve</button>
                        <button class="btn btn-sm btn-reject" onclick="rejectUserWithReason('${req.id}', '${req.name}')">Reject</button>
                        <button class="btn btn-sm btn-view" onclick="viewDocument('${req.certificateProof || ''}')">View Doc</button>
                    </div>
                `;
            }
            
            row.innerHTML = `
                <td>${req.name}</td>
                <td>${req.email}</td>
                <td><span class="badge ${roleColor}">${req.role}</span></td>
                <td>${req.qualification || 'N/A'}</td>
                <td class="action-buttons-cell">${actionButtons}</td>
            `;
        });
    } catch (error) { 
        console.error('Error:', error);
        showToast('Failed to load pending requests', 'error');
    }
}

function viewDocument(certificateProof) {
    if (certificateProof && certificateProof !== 'null' && certificateProof !== 'undefined' && certificateProof !== '') {
        const fullUrl = certificateProof.startsWith('http') ? certificateProof : `${API_BASE_URL}${certificateProof}`;
        window.open(fullUrl, '_blank');
    } else {
        showToast('No document uploaded by this user', 'info');
    }
}

async function approveUserWithManager(userId, userName) {
    const managerSelect = document.getElementById(`managerSelect_${userId}`);
    const managerId = managerSelect?.value;
    if (!managerId) { showToast(`Please select a manager for ${userName}`, 'warning'); return; }
    if (!confirm(`Approve ${userName}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/approve-with-manager/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ managerId })
        });
        if (response.ok) {
            showToast(`${userName} approved!`, 'success');
            loadPendingRequests();
            loadAllEmployees();
        }
    } catch (error) { showToast('Error', 'error'); }
}

async function approveUser(userId, userName) {
    if (!confirm(`Approve ${userName}?`)) return;
    try {
        await fetch(`${API_BASE_URL}/api/users/approve/${userId}`, { method: 'POST' });
        showToast(`${userName} approved!`, 'success');
        loadPendingRequests();
        loadAllEmployees();
    } catch (error) { showToast('Error', 'error'); }
}

function rejectUserWithReason(userId, userName) {
    const reason = prompt(`Reason for rejecting ${userName}:`);
    if (!reason) return;
    rejectUser(userId, reason, userName);
}

async function rejectUser(userId, reason, userName) {
    try {
        await fetch(`${API_BASE_URL}/api/users/reject/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        showToast(`${userName} rejected`, 'warning');
        loadPendingRequests();
    } catch (error) { showToast('Error', 'error'); }
}

// ========== ALL EMPLOYEES ==========
async function loadAllEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/workers`);
        if (!response.ok) throw new Error('Failed to fetch workers');
        let workers = await response.json();
        workers = workers.filter(w => w.role === 'EMPLOYEE' || w.role === 'MANAGER');
        
        try {
            // Backend now provides standardized performanceRating (0-100)
            workers.forEach(w => {
                if (w.performanceRating === null || w.performanceRating === undefined) {
                    w.performanceRating = 0;
                }
            });
        } catch(e) {}

        
        allEmployeesList = workers;
        
        const tbody = document.getElementById('employeesTableBody');
        if (workers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No employees found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        for (const worker of workers) {
            const isTerminated = worker.status === 'TERMINATED';
            const row = tbody.insertRow();
            let roleColor = worker.role === 'EMPLOYEE' ? 'badge-employee' : 'badge-manager';
            let statusColor = worker.status === 'ACTIVE' ? 'status-active' : worker.status === 'TERMINATED' ? 'status-terminated' : 'status-pending';
            
            const removeButton = isTerminated ? '' : `<button class="btn btn-sm btn-danger" onclick="showRemoveEmployeeModal('${worker.id}', '${worker.name}')">Remove</button>`;
            
            // Auto Increment Button for Managers alone - now with manual control logic
            let autoIncBtn = '-';
            if (worker.role === 'MANAGER' && !isTerminated) {
                autoIncBtn = `<button class="btn btn-sm btn-success" onclick="triggerAutoIncrement('${worker.id}', '${worker.name}', ${worker.salary || 0}, ${worker.performanceRating || 0})"><i class="fas fa-arrow-up"></i> Incr.</button>`;
            }

            row.innerHTML = `
                <td>${worker.name}</td>
                <td>${worker.email}</td>
                <td><span class="badge ${roleColor}">${worker.role}</span></td>
                <td>${worker.department || '-'}</td>
                <td>${worker.designation || '-'}</td>
                <td>₹${worker.salary?.toLocaleString() || '-'}</td>
                <td><span class="performance-rating" style="color:${getPerformanceColor((worker.performanceRating || 0) / 20)}">${(worker.performanceRating || 0).toFixed(1)}%</span></td>
                <td>${autoIncBtn}</td>
                <td><span class="status-badge ${statusColor}">${worker.status}</span></td>
                <td class="action-buttons-cell">
                    <div class="action-buttons-horizontal">
                        <button class="btn btn-sm btn-primary" onclick="showEditModal('${worker.id}', '${worker.name}', '${worker.email}', '${worker.department || ''}', '${worker.designation || ''}', '${worker.salary || ''}', '${worker.performanceRating || ''}')">Edit</button>
                        <button class="btn btn-sm btn-view" onclick="viewPersonalDetails('${worker.id}')">View</button>
                        ${removeButton}
                    </div>
                </td>
            `;
        }
    } catch (error) { 
        console.error('Error:', error);
        showToast('Failed to load employees', 'error');
    }
}

// ========== ATTENDANCE MONITORING ==========
async function loadGlobalAttendance() {
    const dateInput = document.getElementById('attendanceDateFilter');
    if (!dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/daily?date=${dateInput.value}`);
        const attendance = await response.json();
        const usersRes = await fetch(`${API_BASE_URL}/api/users/workers`);
        const allUsers = await usersRes.json();
        
        const tbody = document.getElementById('globalAttendanceBody');
        tbody.innerHTML = '';
        
        allUsers.filter(u => u.role !== 'HR').forEach(user => {
            const att = attendance.find(a => a.userId === user.id);
            const row = tbody.insertRow();
            
            let status = 'ABSENT';
            let checkIn = '-';
            let checkOut = '-';
            let statusClass = 'status-terminated';
            
            if (att) {
                status = att.status;
                checkIn = att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : '-';
                checkOut = att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString() : '-';
                statusClass = 'status-active';
            }
            
            row.innerHTML = `
                <td>${user.name}</td>
                <td><span class="badge ${user.role === 'MANAGER' ? 'badge-manager' : 'badge-employee'}">${user.role}</span></td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
            `;
        });
    } catch (error) { showToast('Error loading attendance', 'error'); }
}

// ========== LEAVE OVERSIGHT ==========



function getPerformanceColor(rating) {
    if (!rating) return '#a0aec0';
    if (rating >= 4.5) return '#10b981';
    if (rating >= 3.5) return '#3b82f6';
    if (rating >= 2.5) return '#f59e0b';
    return '#ef4444';
}



function filterEmployees() {
    const input = document.getElementById('employeeFilter');
    if (!input) return;
    const filter = input.value.toUpperCase();
    const table = document.getElementById('employeesTable');
    const tr = table.getElementsByTagName('tr');
    for (let i = 1; i < tr.length; i++) {
        const name = tr[i].getElementsByTagName('td')[0]?.innerText.toUpperCase() || '';
        const email = tr[i].getElementsByTagName('td')[1]?.innerText.toUpperCase() || '';
        tr[i].style.display = (name.indexOf(filter) > -1 || email.indexOf(filter) > -1) ? '' : 'none';
    }
}

// ========== VIEW PERSONAL DETAILS ==========
async function viewPersonalDetails(userId) {
    try {
        console.log("Fetching personal details for userId:", userId);
        
        const response = await fetch(`${API_BASE_URL}/api/users/personal-details/${userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const user = await response.json();
        console.log("User data received:", user);
        
        const modalContent = `
            <div style="padding:20px">
                <h4><i class="fas fa-user-circle"></i> Complete Personal Details</h4>
                <hr>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                    <div><strong>Name:</strong></div><div>${user.name || 'N/A'}</div>
                    <div><strong>Email:</strong></div><div>${user.email || 'N/A'}</div>
                    <div><strong>Phone:</strong></div><div>${user.phone || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong></div><div>${user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Blood Group:</strong></div><div>${user.bloodGroup || 'N/A'}</div>
                    <div><strong>Emergency Contact:</strong></div><div>${user.emergencyContact || 'N/A'}</div>
                    <div><strong>Qualification:</strong></div><div>${user.qualification || 'N/A'}</div>
                    <div><strong>PAN Number:</strong></div><div>${user.panNumber || 'N/A'}</div>
                    <div><strong>Aadhar Number:</strong></div><div>${user.aadharNumber || 'N/A'}</div>
                    <div><strong>Department:</strong></div><div>${user.department || 'N/A'}</div>
                    <div><strong>Designation:</strong></div><div>${user.designation || 'N/A'}</div>
                    <div><strong>Salary:</strong></div><div>₹${user.salary?.toLocaleString() || 'N/A'}</div>
                    <div><strong>Bank Name:</strong></div><div>${user.bankName || 'N/A'}</div>
                    <div><strong>Account Number:</strong></div><div>${user.accountNumber || 'N/A'}</div>
                    <div><strong>IFSC Code:</strong></div><div>${user.ifscCode || 'N/A'}</div>
                    <div><strong>Permanent Address:</strong></div><div>${user.permanentAddress || 'N/A'}</div>
                    <div><strong>Current Address:</strong></div><div>${user.currentAddress || 'N/A'}</div>
                    <div><strong>City:</strong></div><div>${user.city || 'N/A'}</div>
                    <div><strong>State:</strong></div><div>${user.state || 'N/A'}</div>
                    <div><strong>Pincode:</strong></div><div>${user.pincode || 'N/A'}</div>
                    <div><strong>Manager ID:</strong></div><div>${user.managerId || 'Not assigned'}</div>
                    <div><strong>Joining Date:</strong></div><div>${user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : (user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A')}</div>
                </div>
                <button class="btn btn-primary" onclick="closeViewDetailsModal()" style="margin-top:20px; width:100%">Close</button>
            </div>
        `;
        
        let modal = document.getElementById('viewDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewDetailsModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content" style="max-width:700px;"><div class="modal-header"><h3><i class="fas fa-user"></i> Employee Personal Details</h3><span class="close" onclick="closeViewDetailsModal()">&times;</span></div><div id="viewDetailsContent"></div></div>`;
            document.body.appendChild(modal);
        }
        
        document.getElementById('viewDetailsContent').innerHTML = modalContent;
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading personal details:', error);
        showToast('Failed to load personal details: ' + error.message, 'error');
    }
}

function closeViewDetailsModal() {
    const modal = document.getElementById('viewDetailsModal');
    if (modal) modal.style.display = 'none';
}

// ========== EDIT MODAL ==========
let editUserId = null;

function showEditModal(id, name, email, department, designation, salary, performanceRating) {
    editUserId = id;
    document.getElementById('editUserId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editEmail').value = email;
    document.getElementById('editDepartment').value = department || '';
    document.getElementById('editDesignation').value = designation || '';
    document.getElementById('editSalary').value = salary || '';
    if (document.getElementById('editPerformance')) {
        document.getElementById('editPerformance').value = performanceRating || '';
    }
    document.getElementById('editEmployeeModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editEmployeeModal').style.display = 'none';
    editUserId = null;
}

async function updateEmployeeDetails(event) {
    event.preventDefault();
    const details = {
        department: document.getElementById('editDepartment').value,
        designation: document.getElementById('editDesignation').value,
        salary: document.getElementById('editSalary').value,
        performanceRating: document.getElementById('editPerformance')?.value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/update-position-salary/${editUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
        if (response.ok) {
            showToast('Salary and position updated!', 'success');
            closeEditModal();
            loadAllEmployees();
            loadPayrollRecords();
        }
    } catch (error) { showToast('Error', 'error'); }
}

// ========== REMOVE EMPLOYEE ==========
let removeEmployeeId = null;

function showRemoveEmployeeModal(userId, userName) {
    removeEmployeeId = userId;
    document.getElementById('removeUserId').value = userId;
    document.getElementById('removeUserName').value = userName;
    loadActiveManagersForReallocation();
    document.getElementById('removeEmployeeModal').style.display = 'flex';
}

async function loadActiveManagersForReallocation() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/managers`);
        const managers = await response.json();
        const activeManagers = managers.filter(m => m.status === 'ACTIVE');
        const select = document.getElementById('reallocateManagerSelect');
        if (select) {
            select.innerHTML = '<option value="">Select new manager (optional)</option>';
            activeManagers.forEach(m => {
                select.innerHTML += `<option value="${m.id}">${m.name} (${m.department || 'N/A'})</option>`;
            });
        }
    } catch (error) { console.error('Error:', error); }
}

function closeRemoveModal() {
    document.getElementById('removeEmployeeModal').style.display = 'none';
    removeEmployeeId = null;
}

async function confirmRemoveEmployee(event) {
    event.preventDefault();
    const reason = document.getElementById('removeReason').value;
    const newManagerId = document.getElementById('reallocateManagerSelect')?.value;
    
    if (!reason) { showToast('Please provide a reason', 'warning'); return; }
    
    try {
        const userToRemove = allEmployeesList.find(u => u.id === removeEmployeeId);
        if (userToRemove?.role === 'MANAGER' && newManagerId) {
            const employeesUnderManager = allEmployeesList.filter(e => e.role === 'EMPLOYEE' && e.managerId === removeEmployeeId);
            for (let emp of employeesUnderManager) {
                await fetch(`${API_BASE_URL}/api/users/update-manager/${emp.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ managerId: newManagerId })
                });
            }
            showToast(`Reallocated ${employeesUnderManager.length} employees`, 'info');
        }
        
        const response = await fetch(`${API_BASE_URL}/api/users/remove/${removeEmployeeId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showToast('Employee terminated successfully', 'success');
            closeRemoveModal();
            loadAllEmployees();
            loadPayrollRecords();
        }
    } catch (error) { showToast('Error', 'error'); }
}

// ========== PROJECTS ==========
async function loadAllProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/all`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        const projects = await response.json();
        const container = document.getElementById('projectsContainer');
        if (projects.length === 0) { container.innerHTML = '<div class="empty-state">No projects found</div>'; return; }
        
        container.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-header"><h4>${project.projectName}</h4><span class="status-badge">${project.status || 'CREATED'}</span></div>
                <p>${project.description || 'No description'}</p>
                <p><strong>Client:</strong> ${project.clientName || 'N/A'}</p>
                <p><strong>Manager:</strong> ${project.managerName || 'Not assigned'}</p>
                <p><strong>Budget:</strong> ₹${project.budget || 0}</p>
                <p><strong>Progress:</strong> ${project.progress || 0}%</p>
                <progress value="${project.progress || 0}" max="100"></progress>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="assignProjectToManager('${project.id}')">Assign to Manager</button>
                    <button class="btn btn-sm btn-view" onclick="viewProjectDetails('${project.id}')">Details</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) { console.error('Error:', error); }
}

async function viewProjectDetails(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/overview/${projectId}`);
        const project = await response.json();
        
        const modalContent = `
            <div style="padding:20px">
                <h4>${project.projectName}</h4><hr>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                    <div><strong>Client:</strong> ${project.clientName || 'N/A'}</div>
                    <div><strong>Manager:</strong> ${project.managerName || 'Not assigned'}</div>
                    <div><strong>Status:</strong> ${project.status}</div>
                    <div><strong>Progress:</strong> ${project.progress}%</div>
                    <div><strong>Budget:</strong> ₹${project.budget?.toLocaleString() || 0}</div>
                    <div><strong>Start:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>End:</strong> ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Technology:</strong> ${project.technologyStack || 'N/A'}</div>
                </div>
                <div><strong>Team Members:</strong> ${project.employeeNames?.join(', ') || 'Not assigned'}</div>
                <div><strong>Monthly Progress:</strong><ul>${Object.entries(project.monthlyProgress || {}).map(([m,p]) => `<li>${m}: ${p}%</li>`).join('') || '<li>No data</li>'}</ul></div>
                <button class="btn btn-primary" onclick="closeProjectDetailsModal()">Close</button>
            </div>
        `;
        
        let modal = document.getElementById('projectDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'projectDetailsModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Project Details</h3><span class="close" onclick="closeProjectDetailsModal()">&times;</span></div><div id="projectDetailsContent"></div></div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('projectDetailsContent').innerHTML = modalContent;
        modal.style.display = 'flex';
    } catch (error) { showToast('Failed to load details', 'error'); }
}

function closeProjectDetailsModal() {
    const modal = document.getElementById('projectDetailsModal');
    if (modal) modal.style.display = 'none';
}

async function assignProjectToManager(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/managers`);
        const managers = await response.json();
        const activeManagers = managers.filter(m => m.status === 'ACTIVE');
        if (activeManagers.length === 0) { showToast('No active managers', 'warning'); return; }
        
        const modalHtml = `
            <div id="managerSelectModal" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:25px; border-radius:16px; z-index:10001; min-width:300px;">
                <h3>Select Manager</h3>
                <select id="managerSelect" style="width:100%; padding:10px; margin:15px 0; border-radius:8px;">
                    <option value="">-- Select Manager --</option>
                    ${activeManagers.map(m => `<option value="${m.id}">${m.name} (${m.department || 'N/A'})</option>`).join('')}
                </select>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="closeManagerModal()">Cancel</button>
                    <button onclick="confirmAssignToManager('${projectId}')" style="background:#667eea; color:white;">Assign</button>
                </div>
            </div>
            <div id="managerModalOverlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000;"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) { showToast('Failed', 'error'); }
}

function closeManagerModal() {
    document.getElementById('managerSelectModal')?.remove();
    document.getElementById('managerModalOverlay')?.remove();
}

async function confirmAssignToManager(projectId) {
    const managerId = document.getElementById('managerSelect')?.value;
    if (!managerId) { showToast('Select a manager', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/assign/manager?projectId=${projectId}&managerId=${managerId}`, { method: 'POST' });
        if (response.ok) {
            showToast('Project assigned!', 'success');
            closeManagerModal();
            loadAllProjects();
        }
    } catch (error) { showToast('Error', 'error'); }
}

// ========== PERFORMANCE CHARTS ==========
// Chart instances extended
let managerPerfChart = null;
let employeePerfChart = null;

async function loadPerformanceData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/workers`);
        let workers = await response.json();
        workers = workers.filter(w => (w.role === 'EMPLOYEE' || w.role === 'MANAGER') && w.status !== 'TERMINATED');
        
        // Sort by performance descending
        const managers = workers.filter(w => w.role === 'MANAGER').sort((a,b) => (b.performanceRating||0) - (a.performanceRating||0));
        const employees = workers.filter(w => w.role === 'EMPLOYEE').sort((a,b) => (b.performanceRating||0) - (a.performanceRating||0));
        
        const getPerfColor = (r) => r >= 80 ? '#48bb78' : (r >= 60 ? '#4299e1' : '#f56565');

        // Render Manager Performance Bar Chart
        const mgrCtx = document.getElementById('managerPerfChart');
        if (mgrCtx) {
            if (managerPerfChart) managerPerfChart.destroy();
            
            // Set dynamic height based on number of managers (min 350px)
            const dynamicHeight = Math.max(350, managers.length * 50);
            const managerInner = document.getElementById('managerChartInner');
            if (managerInner) managerInner.style.height = dynamicHeight + 'px';

            managerPerfChart = new Chart(mgrCtx, {
                type: 'bar',
                data: {
                    labels: managers.map(m => m.name),
                    datasets: [{
                        label: 'Performance (%)',
                        data: managers.map(m => m.performanceRating || 0),
                        backgroundColor: managers.map(m => getPerfColor(m.performanceRating || 0)),
                        borderRadius: 8,
                        barThickness: 25
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        x: { beginAtZero: true, max: 100 },
                        y: { 
                            ticks: { 
                                font: { weight: '600', size: 12 },
                                padding: 15
                            } 
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Render Employee Performance Bar Chart
        const empCtx = document.getElementById('employeePerfChart');
        if (empCtx) {
            if (employeePerfChart) employeePerfChart.destroy();
            
            // Set dynamic height based on number of employees (min 350px)
            const dynamicHeight = Math.max(350, employees.length * 50);
            const employeeInner = document.getElementById('employeeChartInner');
            if (employeeInner) employeeInner.style.height = dynamicHeight + 'px';

            employeePerfChart = new Chart(empCtx, {
                type: 'bar',
                data: {
                    labels: employees.map(e => e.name),
                    datasets: [{
                        label: 'Performance (%)',
                        data: employees.map(e => e.performanceRating || 0),
                        backgroundColor: employees.map(e => getPerfColor(e.performanceRating || 0)),
                        borderRadius: 8,
                        barThickness: 25
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        x: { beginAtZero: true, max: 100 },
                        y: { 
                            ticks: { 
                                font: { weight: '600', size: 12 },
                                padding: 15
                            } 
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Top 5 Performers Rankings
        const top5 = [...workers].sort((a,b) => (b.performanceRating||0) - (a.performanceRating||0)).slice(0,5);
        const topGrid = document.getElementById('topRankingsGrid');
        if (topGrid) {
            topGrid.innerHTML = top5.map((w, index) => {
                const icons = ['🥇', '🥈', '🥉', '🏅', '🏅'];
                const colors = ['#f59e0b', '#94a3b8', '#d97706', '#667eea', '#667eea'];
                return `
                    <div class="card fade-in-slide" style="text-align:center; padding:15px; border-top: 4px solid ${colors[index]}; animation-delay: ${index * 0.1}s">
                        <div style="font-size: 24px; margin-bottom: 5px;">${icons[index]}<\/div>
                        <div style="font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${w.name}<\/div>
                        <div style="color: #666; font-size: 12px; margin-bottom: 8px;">${w.role}<\/div>
                        <div style="font-size: 18px; font-weight: 800; color: ${colors[index]}">${(w.performanceRating||0).toFixed(1)}%<\/div>
                    <\/div>
                `;
            }).join('');
        }
    } catch (error) { console.error('Error:', error); }
}

async function loadMonthlyGrowthChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/all`);
        const projects = await response.json();
        const monthlyData = {};
        projects.forEach(p => { if (p.monthlyProgress) { Object.entries(p.monthlyProgress).forEach(([m, prog]) => { if (!monthlyData[m]) monthlyData[m] = []; monthlyData[m].push(prog); }); } });
        const avgData = {}; Object.entries(monthlyData).forEach(([m, prog]) => { avgData[m] = prog.reduce((a,b)=>a+b,0)/prog.length; });
        
        const ctx = document.getElementById('monthlyGrowthChart');
        if (ctx) {
            if (growthChart) growthChart.destroy();
            growthChart = new Chart(ctx, {
                type: 'line',
                data: { labels: Object.keys(avgData), datasets: [{ label: 'Avg Progress %', data: Object.values(avgData), borderColor: '#667eea', fill: true }] },
                options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
            });
        }
    } catch (error) { console.error('Error:', error); }
}

// ========== DOWNLOAD CSV ==========
async function downloadEmployeesCSV() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/workers`);
        let workers = await response.json();
        workers = workers.filter(w => w.role === 'EMPLOYEE' || w.role === 'MANAGER');
        
        try {
            const projRes = await fetch(`${API_BASE_URL}/api/projects/all`);
            if(projRes.ok) {
                const allProjects = await projRes.json();
                workers.forEach(w => {
                    let projs = w.role === 'MANAGER' ? allProjects.filter(p => p.managerId === w.id) : allProjects.filter(p => p.employeeIds && p.employeeIds.includes(w.id));
                    if (projs.length > 0) {
                        w.performanceRating = Number(((projs.reduce((s, p) => s + (p.progress||0), 0) / projs.length) / 100 * 5).toFixed(1));
                    } else w.performanceRating = 0;
                });
            }
        } catch(e) {}
        
        let csv = 'Name,Email,Role,Department,Designation,Salary,Performance Rating,Status\n';
        workers.forEach(w => { csv += `"${w.name}",${w.email},${w.role},${w.department || ''},${w.designation || ''},${w.salary || 0},${w.performanceRating || 0},${w.status}\n`; });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Export successful!', 'success');
    } catch (error) { showToast('Failed to export', 'error'); }
}

// ========== PAYROLL ==========
async function loadManagers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/managers`);
        const managers = await response.json();
        const activeManagers = managers.filter(m => m.status === 'ACTIVE');
        
        const salarySelect = document.getElementById('salaryUserId');
        const processSelect = document.getElementById('processManagerId');
        
        if (salarySelect) {
            salarySelect.innerHTML = '<option value="">Select Manager</option>';
            activeManagers.forEach(m => { salarySelect.innerHTML += `<option value="${m.id}">${m.name}</option>`; });
            
            // Auto-populate basic salary when manager is selected
            salarySelect.onchange = async (e) => {
                const managerId = e.target.value;
                if (!managerId) {
                    document.getElementById('basicSalary').value = '';
                    return;
                }
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users/profile/${managerId}`);
                    const user = await res.json();
                    document.getElementById('basicSalary').value = user.salary || 0;
                } catch (err) { console.error(err); }
            };
        }
        if (processSelect) {
            processSelect.innerHTML = '<option value="">Select Manager</option>';
            activeManagers.forEach(m => { processSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`; });
        }
    } catch (error) { console.error('Error:', error); }
}

async function setSalaryStructure(event) {
    event.preventDefault();
    const userId = document.getElementById('salaryUserId').value;
    const basicSalary = document.getElementById('basicSalary').value;
    const allowances = document.getElementById('allowances').value;
    if (!userId) { showToast('Select a manager', 'warning'); return; }
    
    const totalSalary = parseFloat(basicSalary) + parseFloat(allowances || 0);
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/update-salary/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salary: totalSalary })
        });
        if (response.ok) {
            showToast('Salary updated!', 'success');
            document.getElementById('salaryForm').reset();
            loadPayrollRecords();
            loadAllEmployees();
        }
    } catch (error) { showToast('Error', 'error'); }
}

function showProcessSalaryModal() { document.getElementById('processSalaryModal').style.display = 'flex'; }
function closeSalaryModal() { document.getElementById('processSalaryModal').style.display = 'none'; }

async function processSalarySubmit(event) {
    event.preventDefault();
    const managerId = document.getElementById('processManagerId').value;
    const month = document.getElementById('processMonth').value;
    const year = document.getElementById('processYear').value;
    if (!managerId) { showToast('Select a manager', 'warning'); return; }
    
    try {
        const userRes = await fetch(`${API_BASE_URL}/api/users/profile/${managerId}`);
        const manager = await userRes.json();
        const salary = manager.salary || 0;
        if (salary <= 0) { showToast('Set salary first', 'warning'); return; }
        
        const payrollData = { userId: managerId, userName: manager.name, role: 'MANAGER', month, year: parseInt(year), basicSalary: salary, allowances: salary * 0.2, deductions: salary * 0.1, status: 'PROCESSED' };
        const response = await fetch(`${API_BASE_URL}/api/payroll/process/manager`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payrollData) });
        if (response.ok) {
            showToast('Salary processed!', 'success');
            closeSalaryModal();
            loadPayrollRecords();
        }
    } catch (error) { showToast('Error', 'error'); }
}

async function loadPayrollRecords() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payroll/manager-payments`);
        const payrolls = await response.json();
        const tbody = document.getElementById('payrollTableBody');
        if (!payrolls?.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No records</td></tr>'; return; }
        
        tbody.innerHTML = '';
        payrolls.forEach(p => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${p.userName}</td>
                <td>MANAGER</span></td>
                <td>₹${p.basicSalary?.toLocaleString() || 0}</td>
                <td>₹${p.allowances?.toLocaleString() || 0}</td>
                <td>₹${p.deductions?.toLocaleString() || 0}</td>
                <td><strong>₹${p.netSalary?.toLocaleString() || 0}</strong></td>
                <td><span class="performance-rating" style="color:${getPerformanceColor((p.performanceRating || 0) / 20)}">${(p.performanceRating || 0).toFixed(1)}%</span></td>
                <td>${p.month} ${p.year}</td>
                <td><span class="status-badge">${p.status || 'PROCESSED'}</span></td>
                <td><button class="btn btn-sm btn-view" onclick="viewPayslip('${p.id}')">View Payslip</button></td>
            `;
        });
    } catch (error) { console.error('Error:', error); }
}

async function viewPayslip(payrollId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payroll/payslip/${payrollId}`);
        const payroll = await response.json();
        
        const modalContent = `
            <div style="padding:20px">
                <div style="text-align:center"><h3>Salary Payslip</h3><p>${payroll.month} ${payroll.year}</p></div>
                <div style="border:1px solid #ddd; border-radius:12px; padding:20px">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px">
                        <div><strong>Employee:</strong></div><div>${payroll.userName}</div>
                        <div><strong>Basic Salary:</strong></div><div>₹${payroll.basicSalary?.toLocaleString() || 0}</div>
                        <div><strong>Allowances:</strong></div><div>₹${payroll.allowances?.toLocaleString() || 0}</div>
                        <div><strong>Deductions:</strong></div><div>₹${payroll.deductions?.toLocaleString() || 0}</div>
                        <div style="border-top:2px solid #667eea"><strong>Net Salary:</strong></div><div style="border-top:2px solid #667eea"><strong>₹${payroll.netSalary?.toLocaleString() || 0}</strong></div>
                        <div><strong>Status:</strong></div><div>${payroll.status || 'PROCESSED'}</div>
                    </div>
                </div>
                <button class="btn btn-download" onclick="downloadPayslipAsPDF('${payrollId}')" style="margin-top:15px; width:100%">Download PDF</button>
                <button class="btn btn-secondary" onclick="closePayslipModal()" style="margin-top:10px; width:100%">Close</button>
            </div>
        `;
        
        let modal = document.getElementById('payslipModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'payslipModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Payslip</h3><span class="close" onclick="closePayslipModal()">&times;</span></div><div id="payslipContent"></div></div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('payslipContent').innerHTML = modalContent;
        modal.style.display = 'flex';
    } catch (error) { showToast('Failed to load payslip', 'error'); }
}

function closePayslipModal() {
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'none';
}

function downloadPayslipAsPDF(payrollId) {
    window.open(`${API_BASE_URL}/api/payroll/payslip/download/${payrollId}`, '_blank');
    showToast('PDF download started', 'success');
}

// ========== MEETINGS ==========
async function loadAllUsersForMeeting() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/managers`);
        const managers = await response.json();
        const activeManagers = managers.filter(m => m.status === 'ACTIVE');
        
        const attendeesSelect = document.getElementById('meetingAttendees');
        if (attendeesSelect) {
            attendeesSelect.innerHTML = '<option value="">-- Select Manager --</option>';
            activeManagers.forEach(m => {
                attendeesSelect.innerHTML += `<option value="${m.id}">👔 ${m.name} (${m.department || 'N/A'})</option>`;
            });
            attendeesSelect.multiple = false;
            attendeesSelect.size = 1;
        }
    } catch (error) {
        console.error('Error loading managers:', error);
        showToast('Failed to load managers list', 'error');
    }
}

async function scheduleMeeting(event) {
    event.preventDefault();
    
    const attendeesSelect = document.getElementById('meetingAttendees');
    const managerId = attendeesSelect ? attendeesSelect.value : '';
    
    if (!managerId) {
        showToast('Please select a manager', 'warning');
        return;
    }
    
    const meeting = {
        title: document.getElementById('meetingTitle').value,
        date: document.getElementById('meetingDate').value,
        time: document.getElementById('meetingTime').value,
        purpose: document.getElementById('meetingPurpose').value,
        location: document.getElementById('meetingLocation').value,
        attendees: managerId,
        organizedBy: sessionStorage.getItem('userId')
    };
    
    if (!meeting.title || !meeting.date || !meeting.time || !meeting.purpose || !meeting.location) {
        showToast('Fill all fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meeting)
        });
        
        if (response.ok) {
            showToast('Meeting scheduled!', 'success');
            document.getElementById('meetingForm').reset();
            loadMeetings();
        } else {
            showToast('Failed', 'error');
        }
    } catch (error) {
        showToast('Error', 'error');
    }
}

async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings/all`);
        const meetings = await response.json();
        const container = document.getElementById('meetingsContainer');
        if (!meetings?.length) { 
            container.innerHTML = '<div class="empty-state">No meetings</div>'; 
            return; 
        }
        
        container.innerHTML = '';
        for (const meeting of meetings) {
            const card = document.createElement('div');
            card.className = 'meeting-card';
            
            let locationHtml = meeting.location;
            if (meeting.location && (meeting.location.includes('http') || meeting.location.includes('zoom'))) {
                locationHtml = `<a href="${meeting.location}" target="_blank">${meeting.location}</a>`;
            }
            
            let attendeesDisplay = meeting.attendees;
            if (meeting.attendees === 'all') {
                attendeesDisplay = 'All Managers';
            } else if (meeting.attendees && meeting.attendees !== '') {
                attendeesDisplay = meeting.attendees;
            }
            
            card.innerHTML = `
                <div class="meeting-header"><h4>${meeting.title}</h4><span class="meeting-time">${meeting.date} ${meeting.time}</span></div>
                <p><strong>Purpose:</strong> ${meeting.purpose}</p>
                <p><strong>Location:</strong> ${locationHtml}</p>
                <p><strong>Attendees:</strong> ${attendeesDisplay || 'None'}</p>
            `;
            container.appendChild(card);
        }
    } catch (error) { 
        console.error('Error:', error);
        showToast('Failed to load meetings', 'error'); 
    }
}

// ========== PROFILE & PASSWORD ==========
async function loadProfile() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`);
        const user = await response.json();
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userRole').textContent = user.role;
        if (user.profilePhoto?.startsWith('data:image')) {
            document.getElementById('profileImg').src = user.profilePhoto;
        } else {
            document.getElementById('profileImg').src = `https://ui-avatars.com/api/?background=667eea&color=fff&size=150&name=${encodeURIComponent(user.name)}`;
        }
    } catch (error) { showToast('Failed to load profile', 'error'); }
}

async function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Profile photo is too large! Maximum allowed size: 2MB. Your file: ' + (file.size / (1024 * 1024)).toFixed(2) + 'MB.', 'error');
        event.target.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('Invalid file type. Please select an image file (JPG, PNG, etc.)', 'error');
        event.target.value = '';
        return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/photo/${sessionStorage.getItem('userId')}`, { method: 'POST', body: formData });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('profileImg').src = data.photoUrl;
            showToast('Photo updated!', 'success');
        }
    } catch (error) { showToast('Error', 'error'); }
}

function showChangePasswordModal() { document.getElementById('changePasswordModal').style.display = 'flex'; }
function closePasswordModal() { document.getElementById('changePasswordModal').style.display = 'none'; document.getElementById('changePasswordForm').reset(); }

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'warning'); return; }
    if (newPassword.length < 6) { showToast('Password must be 6+ characters', 'warning'); return; }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: sessionStorage.getItem('userId'), oldPassword, newPassword })
        });
        if (response.ok) {
            showToast('Password changed! Please login again.', 'success');
            closePasswordModal();
            setTimeout(() => logout(), 2000);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed', 'error');
        }
    } catch (error) { showToast('Error', 'error'); }
}

function logout() { sessionStorage.clear(); window.location.href = '/'; }

document.addEventListener('DOMContentLoaded', () => {
    const name = sessionStorage.getItem('userName');
    if (name) {
        document.getElementById('hrName').textContent = name;
        loadPendingRequests();
    } else {
        window.location.href = '/';
    }
});

// ========== PERSONAL DETAILS MODAL - FIXED VERSION ==========
async function openPersonalDetailsModal() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const user = await response.json();
        
        document.getElementById('pdName').value = user.name || '';
        document.getElementById('pdEmail').value = user.email || '';
        document.getElementById('pdPhone').value = user.phone || '';
        document.getElementById('pdDob').value = user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '';
        document.getElementById('pdPermAddress').value = user.permanentAddress || '';
        document.getElementById('pdCurrAddress').value = user.currentAddress || '';
        document.getElementById('pdCity').value = user.city || '';
        document.getElementById('pdState').value = user.state || '';
        document.getElementById('pdPincode').value = user.pincode || '';
        document.getElementById('pdBloodGroup').value = user.bloodGroup || '';
        document.getElementById('pdEmergency').value = user.emergencyContact || '';
        document.getElementById('pdPan').value = user.panNumber || '';
        document.getElementById('pdAadhar').value = user.aadharNumber || '';
        document.getElementById('pdBankName').value = user.bankName || '';
        document.getElementById('pdAccountNo').value = user.accountNumber || '';
        document.getElementById('pdIfsc').value = user.ifscCode || '';
        document.getElementById('pdDept').value = user.department || 'Not assigned';
        document.getElementById('pdDesignation').value = user.designation || 'Not assigned';
        document.getElementById('pdEmpId').value = user.employeeId || 'Not assigned';
        document.getElementById('pdJoinDate').value = user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : (user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A');
        
        document.getElementById('personalDetailsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load personal details', 'error');
    }
}

function closePersonalDetailsModal() {
    document.getElementById('personalDetailsModal').style.display = 'none';
}

// ========== UPDATE PERSONAL DETAILS - FIXED WITH BETTER ERROR HANDLING ==========
async function updatePersonalDetails(event) {
    event.preventDefault();
    
    const userId = sessionStorage.getItem('userId');
    
    const personalDetails = {
        name: document.getElementById('pdName').value,
        phone: document.getElementById('pdPhone').value,
        dateOfBirth: document.getElementById('pdDob').value,
        permanentAddress: document.getElementById('pdPermAddress').value,
        currentAddress: document.getElementById('pdCurrAddress').value,
        city: document.getElementById('pdCity').value,
        state: document.getElementById('pdState').value,
        pincode: document.getElementById('pdPincode').value,
        bloodGroup: document.getElementById('pdBloodGroup').value,
        emergencyContact: document.getElementById('pdEmergency').value,
        panNumber: document.getElementById('pdPan').value,
        aadharNumber: document.getElementById('pdAadhar').value,
        bankName: document.getElementById('pdBankName').value,
        accountNumber: document.getElementById('pdAccountNo').value,
        ifscCode: document.getElementById('pdIfsc').value
    };
    
    console.log("Sending update for user:", userId);
    console.log("Data being sent:", personalDetails);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/personal-details/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personalDetails)
        });
        
        console.log("Response status:", response.status);
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (response.ok) {
            showToast('Personal details updated successfully!', 'success');
            closePersonalDetailsModal();
            loadProfile();
        } else {
            showToast('Error: ' + (data.error || data.message || 'Update failed'), 'error');
        }
    } catch (error) {
        console.error('Error details:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

// ========== TRIGGER AUTO INCREMENT (Manual Control Flow) ==========
async function triggerAutoIncrement(userId, name, salary, performanceRating) {
    if (!performanceRating || performanceRating <= 0) { 
        showToast(`No performance rating available for ${name}`, 'warning'); 
        return; 
    }
    if (!salary || salary <= 0) { 
        showToast(`No base salary set for ${name}`, 'warning'); 
        return; 
    }
    
    let increment = 0;
    if (performanceRating >= 80) increment = 0.10;
    else if (performanceRating >= 60) increment = 0.05;
    else { 
        showToast('Performance too low for increment (Threshold: 60%)', 'warning'); 
        return; 
    }
    
    const newSalary = Math.round(salary * (1 + increment));
    const confirmMsg = `Increment ${name}'s salary from ₹${salary.toLocaleString()} to ₹${newSalary.toLocaleString()}? \n\nPerformance: ${performanceRating.toFixed(1)}% \nIncrement: ${(increment*100)}%`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/update-salary/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salary: newSalary })
        });
        
        if (response.ok) {
            showToast(`${name}'s salary successfully updated!`, 'success');
            loadAllEmployees();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update salary', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}