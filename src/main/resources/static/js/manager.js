// API Base URL
const API_BASE_URL = 'http://localhost:8080';

// Chart instance
let progressChart = null;
let allEmployees = [];

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(sectionId);
    if (section) section.style.display = 'block';
    switch(sectionId) {
        case 'teamMembers': loadTeamMembers(); break;
        case 'teamAttendance': loadTeamAttendance(); break;
        case 'attendance': loadAttendanceLogs(); break;
        case 'leaveRequests': loadLeaveRequests(); break;
        case 'assignProject': loadAssignProjectData(); break;
        case 'projectStatus': loadProjectStatus(); break;
        case 'performance': loadPerformanceDetails(); break;
        case 'payEmployee': loadPayrollData(); break;
        case 'meetings': loadMeetings(); loadEmployeesForMeeting(); break;
        case 'profile': loadProfile(); loadAttendanceLogs(); break;
    }
}

// ========== TEAM MEMBERS ==========
async function loadTeamMembers() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = await response.json();
        const team = employees.filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
        
        const tbody = document.getElementById('teamTableBody');
        if (team.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No team members found</td></tr>';
            return; 
        }

        tbody.innerHTML = '';
        for (const emp of team) {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><i class="fas fa-user"></i> ${emp.name}</td>
                <td><i class="fas fa-envelope"></i> ${emp.email}</td>
                <td>${emp.designation || 'Software Engineer'}</td>
                <td>${emp.department || 'Engineering'}</td>
                <td>₹${(emp.salary || 0).toLocaleString()}</td>
                <td><span class="performance-rating" style="color:${getPerformanceColor((emp.performanceRating || 0) / 20)}">${(emp.performanceRating || 0).toFixed(1)}%</span></td>
                <td><span class="status-badge status-${emp.status?.toLowerCase()}">${emp.status}</span></td>
                <td><div class="action-buttons-horizontal">
                    <button class="btn btn-sm btn-success" onclick="autoIncrementSalary('${emp.id}', ${emp.salary || 0}, ${emp.performanceRating || 0})"><i class="fas fa-arrow-up"></i> Incr.</button>
                    <button class="btn btn-sm btn-view" onclick="viewEmployeeDetails('${emp.id}')"><i class="fas fa-eye"></i> View</button>
                </div></td>
            `;
        }
    } catch (error) { 
        console.error("Team Load Error:", error);
        showToast('Failed to load team', 'error'); 
    }
}

async function autoIncrementSalary(userId, salary, performanceRating) {
    if (!performanceRating) { showToast('No performance rating', 'warning'); return; }
    if (!salary) { showToast('No base salary set', 'warning'); return; }
    
    let increment = 0;
    if (performanceRating >= 80) increment = 0.10;
    else if (performanceRating >= 60) increment = 0.05;
    else { showToast('Performance too low for increment (Threshold: 60%)', 'warning'); return; }
    
    const newSalary = Math.round(salary * (1 + increment));
    if (!confirm(`Increment employee salary from ₹${salary} to ₹${newSalary} (based on ${performanceRating.toFixed(1)}%)?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/update-salary/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salary: newSalary })
        });
        if (response.ok) {
            showToast('Salary successfully incremented!', 'success');
            loadTeamMembers();
            if (document.getElementById('performance').style.display !== 'none') loadPerformanceDetails();
        } else {
            showToast('Failed to update salary', 'error');
        }
    } catch (error) { showToast('Error updating salary', 'error'); }
}

function getPerformanceColor(rating) { 
    if (!rating) return '#a0aec0'; 
    if (rating >= 4.5) return '#48bb78'; 
    if (rating >= 3.5) return '#4299e1'; 
    if (rating >= 2.5) return '#ed8936'; 
    return '#f56565'; 
}

function filterTeam() {
    const input = document.getElementById('teamFilter');
    const filter = input.value.toUpperCase();
    const table = document.getElementById('teamTable');
    const tr = table.getElementsByTagName('tr');
    for (let i = 1; i < tr.length; i++) {
        const name = tr[i].getElementsByTagName('td')[0]?.innerText.toUpperCase() || '';
        const email = tr[i].getElementsByTagName('td')[1]?.innerText.toUpperCase() || '';
        tr[i].style.display = (name.indexOf(filter) > -1 || email.indexOf(filter) > -1) ? '' : 'none';
    }
}

async function viewEmployeeDetails(employeeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${employeeId}`);
        const emp = await response.json();
        
        let modal = document.getElementById('employeeDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'employeeDetailsModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Employee Details</h3><span class="close" onclick="closeEmployeeModal()">&times;</span></div><div id="employeeDetailsContent" style="padding:20px"></div></div>`;
            document.body.appendChild(modal);
        }
        
        document.getElementById('employeeDetailsContent').innerHTML = `
            <p><strong>Name:</strong> ${emp.name}</p>
            <p><strong>Email:</strong> ${emp.email}</p>
            <p><strong>Phone:</strong> ${emp.phone || 'N/A'}</p>
            <p><strong>Department:</strong> ${emp.department || 'N/A'}</p>
            <p><strong>Designation:</strong> ${emp.designation || 'N/A'}</p>
            <p><strong>Salary:</strong> ₹${emp.salary ? emp.salary.toLocaleString() : 'N/A'}</p>
            <p><strong>Performance:</strong> ${emp.performanceRating ? emp.performanceRating.toFixed(1) + '%' : 'N/A'}</p>
            <p><strong>Join Date:</strong> ${emp.registrationDate ? new Date(emp.registrationDate).toLocaleDateString() : 'N/A'}</p>`;
        modal.style.display = 'flex';
    } catch (error) { showToast('Failed to load details', 'error'); }
}

function closeEmployeeModal() { 
    const modal = document.getElementById('employeeDetailsModal');
    if (modal) modal.style.display = 'none';
}

// ========== LEAVE REQUESTS ==========
async function loadLeaveRequests() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaves/pending/${managerId}`);
        const leaves = await response.json();
        const tbody = document.getElementById('leaveTableBody');
        if (!leaves || leaves.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No pending leave requests<\/td><\/tr>';
            return; 
        }
        tbody.innerHTML = '';
        leaves.forEach(leave => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${leave.employeeName || 'Unknown'}<\/td>
                <td>${leave.leaveType || 'Casual'}<\/td>
                <td>${new Date(leave.startDate).toLocaleDateString()}<\/td>
                <td>${new Date(leave.endDate).toLocaleDateString()}<\/td>
                <td>${leave.numberOfDays || 1}<\/td>
                <td>${leave.reason || 'No reason'}<\/td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-approve" onclick="approveLeave('${leave.id}')"><i class="fas fa-check"></i> Approve</button>
                    <button class="btn btn-sm btn-reject" onclick="rejectLeavePrompt('${leave.id}')"><i class="fas fa-times"></i> Reject</button>
                 <\/td>
            `;
        });
    } catch (error) { showToast('Failed to load leave requests', 'error'); }
}

async function approveLeave(leaveId) {
    try { 
        const response = await fetch(`${API_BASE_URL}/api/leaves/approve/${leaveId}`, { method: 'POST' }); 
        if (response.ok) { 
            showToast('Leave approved!', 'success'); 
            loadLeaveRequests(); 
        } else showToast('Failed', 'error'); 
    } catch (error) { showToast('Error', 'error'); }
}

function rejectLeavePrompt(leaveId) { 
    const reason = prompt('Enter reason for rejection:'); 
    if (reason) rejectLeave(leaveId, reason); 
}

async function rejectLeave(leaveId, reason) {
    try { 
        const response = await fetch(`${API_BASE_URL}/api/leaves/reject/${leaveId}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ reason }) 
        }); 
        if (response.ok) { 
            showToast('Leave rejected', 'warning'); 
            loadLeaveRequests(); 
        } else showToast('Failed', 'error'); 
    } catch (error) { showToast('Error', 'error'); }
}

// ========== ATTENDANCE ==========
async function markAttendance() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/mark/${userId}`, {
            method: 'POST'
        });
        if (response.ok) {
            const attendance = await response.json();
            showToast('Attendance marked successfully!', 'success');
            updateAttendanceUI(attendance);
        } else {
            showToast('Failed to mark attendance', 'error');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showToast('Error marking attendance', 'error');
    }
}

function updateAttendanceUI(attendance) {
    const status = document.getElementById('attendanceStatus');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const timesDiv = document.getElementById('attendanceTimes');
    const inDisplay = document.getElementById('checkInTimeDisplay');
    const outDisplay = document.getElementById('checkOutTimeDisplay');

    if (attendance) {
        if (attendance.checkInTime) {
            checkInBtn.disabled = true;
            checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Checked In';
            status.innerHTML = `<span style="color: #48bb78; font-weight: 600;"><i class="fas fa-check-circle"></i> Present Today</span>`;
            
            timesDiv.style.display = 'block';
            inDisplay.innerHTML = `<b>In:</b> ${new Date(attendance.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            
            if (attendance.checkOutTime) {
                checkOutBtn.disabled = true;
                checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Checked Out';
                outDisplay.innerHTML = `<b>Out:</b> ${new Date(attendance.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                outDisplay.style.display = 'inline';
            } else {
                checkOutBtn.disabled = false;
                outDisplay.style.display = 'none';
            }
        }
    } else {
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
        status.innerHTML = "Have you checked in today?";
        timesDiv.style.display = 'none';
    }
}

async function checkout() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/checkout/${userId}`, {
            method: 'POST'
        });
        if (response.ok) {
            const attendance = await response.json();
            showToast('Checked out successfully!', 'success');
            updateAttendanceUI(attendance);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to check out', 'error');
        }
    } catch (error) {
        showToast('Error during check-out', 'error');
    }
}

async function loadAttendanceLogs() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/user/${userId}`);
        const logs = await response.json();
        
        // Check if today's attendance is already marked
        const todayStr = new Date().toDateString();
        const todayLog = logs.find(log => new Date(log.date).toDateString() === todayStr);
        if (todayLog) updateAttendanceUI(todayLog);
    } catch (error) {
        console.error('Error loading attendance logs:', error);
    }
}

async function loadTeamAttendance() {
    const dateInput = document.getElementById('attendanceDateFilter');
    if (!dateInput.value) {
        // Default to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    const managerId = sessionStorage.getItem('userId');
    try {
        // Fetch daily attendance for the selected date
        const resp = await fetch(`${API_BASE_URL}/api/attendance/daily?date=${dateInput.value}`);
        const allAttendance = await resp.json();
        
        // Fetch all employees to see who is missing (ABSENT)
        const empRes = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = (await empRes.json()).filter(e => e.managerId === managerId);
        
        const tbody = document.getElementById('teamAttendanceBody');
        tbody.innerHTML = '';
        
        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No team members assigned</td></tr>';
            return;
        }

        employees.forEach(emp => {
            const att = allAttendance.find(a => a.userId === emp.id);
            const row = tbody.insertRow();
            
            let status = 'ABSENT';
            let checkIn = '-';
            let checkOut = '-';
            let statusClass = 'status-terminated'; // using existing red color class
            
            if (att) {
                status = att.status;
                checkIn = new Date(att.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                if (att.checkOutTime) {
                    checkOut = new Date(att.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
                statusClass = 'status-active';
            }
            
            row.innerHTML = `
                <td>${emp.name}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
            `;
        });
    } catch (error) {
        console.error('Error loading team attendance:', error);
        showToast('Failed to load team attendance', 'error');
    }
}

// ========== MANAGE PROJECT TASKS (NEW) ==========
async function loadAssignProjectData() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const projectsRes = await fetch(`${API_BASE_URL}/api/projects/manager/${managerId}`);
        const projects = await projectsRes.json();
        const teamRes = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = (await teamRes.json()).filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
        
        const projectSelect = document.getElementById('projectSelect');
        const employeeSelect = document.getElementById('employeeSelect');
        
        if (projectSelect) { 
            projectSelect.innerHTML = '<option value="">Choose Project</option>'; 
            projects.forEach(p => {
                projectSelect.innerHTML += `<option value="${p.id}">${p.projectName} (${p.status})</option>`;
            });
        }
        
        if (employeeSelect) { 
            employeeSelect.innerHTML = '<option value="">Choose Employee</option>'; 
            employees.forEach(e => employeeSelect.innerHTML += `<option value="${e.id}">${e.name} (${e.designation || 'Employee'})</option>`); 
        }
        
    } catch (error) { showToast('Failed to load data', 'error'); }
}

async function loadProjectTasks(projectId) {
    if (!projectId) {
        document.getElementById('projectTasksBody').innerHTML = '<tr><td colspan="6" class="empty-state">Select a project to view tasks</td></tr>';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
        const project = await response.json();
        const tasks = project.tasks || [];
        const tbody = document.getElementById('projectTasksBody');
        
        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tasks created for this project</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        tasks.forEach(task => {
            const row = tbody.insertRow();
            const statusClass = `status-${task.status.toLowerCase().replace(' ', '-')}`;
            
            // File Column Logic
            let fileHtml = '<span class="text-muted">No files</span>';
            if (task.uploadedFile) {
                fileHtml = `<a href="${API_BASE_URL}${task.uploadedFile}" class="btn btn-sm btn-download" target="_blank" download>
                                <i class="fas fa-download"></i> View File
                            </a>`;
            }

            row.innerHTML = `
                <td><strong>${task.taskName}</strong></td>
                <td>${task.employeeName || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${task.status}</span></td>
                <td>${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px">
                        <div class="progress-bar" style="height:10px; width:100px"><div class="progress-fill" style="width:${task.progressPercentage}%"></div></div>
                        <span>${task.progressPercentage}%</span>
                    </div>
                </td>
                <td>${fileHtml}</td>
            `;
        });
    } catch (error) { showToast('Error loading tasks', 'error'); }
}

async function createNewTask(event) {
    event.preventDefault();
    const projectId = document.getElementById('projectSelect').value;
    const taskName = document.getElementById('taskNameInput').value;
    const employeeId = document.getElementById('employeeSelect').value;
    const deadline = document.getElementById('taskDeadlineInput').value;

    if (!projectId || !taskName || !employeeId || !deadline) {
        showToast('Please fill all task fields', 'warning');
        return;
    }

    const taskData = {
        taskName: taskName,
        assignedEmployeeId: employeeId,
        deadline: deadline,
        status: 'Pending',
        progressPercentage: 0
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            showToast('Task created and assigned successfully!', 'success');
            document.getElementById('taskNameInput').value = '';
            document.getElementById('taskDeadlineInput').value = '';
            loadProjectTasks(projectId);
            loadProjectStatus(); // Update status counts in dashboard
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to create task', 'error');
        }
    } catch (error) { showToast('Error creating task', 'error'); }
}

async function loadProjectStatus() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/manager/${managerId}`);
        const projects = await response.json();
        const container = document.getElementById('projectsContainer');
        if (projects.length === 0) { 
            container.innerHTML = '<div class="empty-state">No projects assigned</div>'; 
            return; 
        }
        
        
        container.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            let tasksTableHtml = '';
            if (project.tasks && project.tasks.length > 0) {
                tasksTableHtml = `
                    <table class="nested-tasks-table">
                        <thead>
                            <tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Deadline</th></tr>
                        </thead>
                        <tbody>
                            ${project.tasks.map(t => `
                                <tr>
                                    <td><strong>${t.taskName}</strong></td>
                                    <td>${t.employeeName || 'N/A'}</td>
                                    <td><span class="status-badge status-${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
                                    <td>${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`;
            } else {
                tasksTableHtml = '<p class="empty-state" style="padding:10px; font-size:0.8rem">No tasks created</p>';
            }

            card.innerHTML = `
                <div class="project-header">
                    <h4><i class="fas fa-folder-open"></i> ${project.projectName}</h4>
                    <span class="status-badge status-${project.status?.toLowerCase()}">${project.status || 'CREATED'}</span>
                </div>
                <div style="margin-bottom: 15px;">
                    <p><strong>Client:</strong> ${project.clientName || 'N/A'}</p>
                    <p><strong>Progress:</strong> ${project.progress || 0}%</p>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${project.progress || 0}%"></div></div>
                </div>
                
                <h5 style="margin-top: 15px; color: #4a5568;"><i class="fas fa-tasks"></i> Project Tasks</h5>
                ${tasksTableHtml}
                
                <div class="card-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-sm btn-download" onclick="downloadProjectReportAsPDF('${project.id}', '${project.projectName}')">
                        <i class="fas fa-file-pdf"></i> Download PDF Report
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) { 
        console.error('Error:', error);
        showToast('Failed to load projects', 'error'); 
    }
}

let statusGrowthChart = null;

async function loadProjectGrowthChart(projectId) {
    const managerId = sessionStorage.getItem('userId');
    const ctx = document.getElementById('projectStatusGrowthChart').getContext('2d');
    
    try {
        let labels = [];
        let data = [];
        let title = '';

        if (projectId === 'all') {
            const resp = await fetch(`${API_BASE_URL}/api/projects/manager/${managerId}`);
            const projects = await resp.json();
            const monthlyData = {};
            projects.forEach(p => { 
                if (p.monthlyProgress) { 
                    Object.entries(p.monthlyProgress).forEach(([m, prog]) => { 
                        if (!monthlyData[m]) monthlyData[m] = []; 
                        monthlyData[m].push(prog); 
                    }); 
                } 
            });
            labels = Object.keys(monthlyData).sort();
            data = labels.map(m => monthlyData[m].reduce((a,b)=>a+b,0)/monthlyData[m].length);
            title = 'Average Growth (All Projects)';
        } else {
            const growthRes = await fetch(`${API_BASE_URL}/api/projects/monthly-growth/${projectId}`);
            const growthData = await growthRes.json();
            const monthlyProgress = growthData.monthlyProgress || {};
            labels = Object.keys(monthlyProgress).sort();
            data = labels.map(month => monthlyProgress[month]);
            title = `Growth Chart: ${growthData.projectName || 'Selected Project'}`;
        }

        if (statusGrowthChart) statusGrowthChart.destroy();
        statusGrowthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Progress %',
                    data: data,
                    borderColor: '#4c51bf',
                    backgroundColor: 'rgba(76, 81, 191, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { title: { display: true, text: title } },
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    } catch (error) { console.error("Chart load error:", error); }
}

// View Project Growth Chart
async function viewProjectDetails(projectId, projectName) {
    try {
        const growthRes = await fetch(`${API_BASE_URL}/api/projects/monthly-growth/${projectId}`);
        const growthData = await growthRes.json();
        const monthlyProgress = growthData.monthlyProgress || {};
        
        const months = Object.keys(monthlyProgress).sort();
        const progressValues = months.map(month => monthlyProgress[month]);
        
        if (months.length === 0) {
            showToast('No monthly progress data available yet', 'info');
            return;
        }
        
        const modalContent = `
            <div style="padding:20px">
                <h3><i class="fas fa-chart-line"></i> ${projectName} - Monthly Progress</h3>
                <hr>
                <canvas id="growthChartCanvas" style="max-height: 300px; width: 100%;"></canvas>
                <div style="margin-top:15px; text-align:center">
                    <button class="btn btn-download" onclick="downloadChartAsImage()">Download Chart as PNG</button>
                    <button class="btn btn-secondary" onclick="closeGrowthChartModal()">Close</button>
                </div>
            </div>
        `;
        
        let modal = document.getElementById('growthChartModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'growthChartModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><div class="modal-header"><h3>Project Growth Chart</h3><span class="close" onclick="closeGrowthChartModal()">&times;</span></div><div id="growthChartContent"></div></div>`;
            document.body.appendChild(modal);
        }
        
        document.getElementById('growthChartContent').innerHTML = modalContent;
        modal.style.display = 'flex';
        
        const ctx = document.getElementById('growthChartCanvas').getContext('2d');
        if (progressChart) progressChart.destroy();
        progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Progress %',
                    data: progressValues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: `Monthly Progress - ${projectName}` } },
                scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Progress (%)' } } }
            }
        });
        
        window.downloadChartAsImage = function() {
            const canvas = document.getElementById('growthChartCanvas');
            const link = document.createElement('a');
            link.download = `${projectName}_growth_chart.png`;
            link.href = canvas.toDataURL();
            link.click();
            showToast('Chart downloaded as PNG', 'success');
        };
        
        window.closeGrowthChartModal = function() {
            modal.style.display = 'none';
            if (progressChart) progressChart.destroy();
        };
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load growth chart', 'error');
    }
}

// ========== DOWNLOAD PROJECT REPORT AS PDF - FIXED VERSION ==========
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Download Project Report as PDF - FIXED VERSION
async function downloadProjectReportAsPDF(projectId, projectName) {
    try {
        showToast('Generating report...', 'info');
        
        console.log("Project ID:", projectId);
        console.log("Project Name:", projectName);
        
        // Try different API endpoints to fetch project details
        let project = null;
        let monthlyProgress = {};
        
        // Option 1: Try /api/projects/{projectId}
        try {
            const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
            if (projectRes.ok) {
                project = await projectRes.json();
                console.log("Project fetched from /api/projects/:", project);
            }
        } catch (e) {
            console.log("Option 1 failed:", e);
        }
        
        // Option 2: If Option 1 failed, try /api/projects/overview/{projectId}
        if (!project) {
            try {
                const overviewRes = await fetch(`${API_BASE_URL}/api/projects/overview/${projectId}`);
                if (overviewRes.ok) {
                    project = await overviewRes.json();
                    console.log("Project fetched from /api/projects/overview/:", project);
                }
            } catch (e) {
                console.log("Option 2 failed:", e);
            }
        }
        
        // Option 3: If both failed, use project name only
        if (!project) {
            console.log("Using fallback - project name only");
            project = {
                projectName: projectName,
                status: 'CREATED',
                clientName: 'N/A',
                budget: 0,
                startDate: null,
                endDate: null,
                progress: 0,
                technologyStack: 'N/A',
                description: 'No description available',
                documents: []
            };
        }
        
        // Fetch monthly progress separately
        try {
            const growthRes = await fetch(`${API_BASE_URL}/api/projects/monthly-growth/${projectId}`);
            if (growthRes.ok) {
                const growthData = await growthRes.json();
                monthlyProgress = growthData.monthlyProgress || {};
                console.log("Monthly progress fetched:", monthlyProgress);
            }
        } catch (e) {
            console.log("Failed to fetch monthly progress:", e);
        }
        
        // Fetch team members under this manager
        const managerId = sessionStorage.getItem('userId');
        let teamMembers = [];
        try {
            const employeesRes = await fetch(`${API_BASE_URL}/api/users/employees`);
            if (employeesRes.ok) {
                const allEmployees = await employeesRes.json();
                teamMembers = allEmployees.filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
                console.log("Team members:", teamMembers.length);
            }
        } catch (e) {
            console.log("Failed to fetch team members:", e);
        }
        
        const currentDate = new Date().toLocaleString();
        
        // Build HTML for PDF
        const reportHtml = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Project Report - ${escapeHtml(projectName)}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; background: white; }
                h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
                h2 { color: #764ba2; margin: 25px 0 15px 0; border-left: 4px solid #764ba2; padding-left: 15px; }
                .header { text-align: center; margin-bottom: 30px; }
                .company-name { color: #667eea; font-size: 14px; margin-top: 5px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f7fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
                .info-item strong { color: #4a5568; display: block; margin-bottom: 5px; }
                .status-completed { background: #c6f6d5; color: #22543d; padding: 4px 12px; border-radius: 20px; display: inline-block; }
                .status-in_progress { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; display: inline-block; }
                .status-created { background: #e9d8fd; color: #553c9a; padding: 4px 12px; border-radius: 20px; display: inline-block; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #667eea; color: white; font-weight: 600; }
                tr:nth-child(even) { background: #f9fafb; }
                .progress-bar-container { background: #e2e8f0; border-radius: 10px; height: 20px; margin: 10px 0; }
                .progress-bar-fill { background: #48bb78; border-radius: 10px; height: 20px; width: ${project.progress || 0}%; text-align: center; color: white; font-size: 12px; line-height: 20px; }
                .doc-list { list-style: none; padding-left: 0; }
                .doc-list li { background: #edf2f7; margin: 5px 0; padding: 8px 12px; border-radius: 6px; }
                .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 PROJECT PERFORMANCE REPORT</h1>
                <div class="company-name">Software Personnel Management System</div>
                <p style="margin-top: 10px;">Generated on: ${currentDate}</p>
            </div>
            
            <h2>📁 Project Overview</h2>
            <div class="info-grid">
                <div class="info-item"><strong>Project Name</strong>${escapeHtml(project.projectName)}</div>
                <div class="info-item"><strong>Status</strong><span class="status-${(project.status || 'CREATED').toLowerCase()}">${project.status || 'CREATED'}</span></div>
                <div class="info-item"><strong>Client</strong>${escapeHtml(project.clientName || 'N/A')}</div>
                <div class="info-item"><strong>Budget</strong>₹${project.budget ? project.budget.toLocaleString() : 0}</div>
                <div class="info-item"><strong>Start Date</strong>${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</div>
                <div class="info-item"><strong>End Date</strong>${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</div>
                <div class="info-item"><strong>Current Progress</strong>${project.progress || 0}%</div>
                <div class="info-item"><strong>Technology Stack</strong>${escapeHtml(project.technologyStack || 'N/A')}</div>
            </div>
            
            <div class="progress-bar-container">
                <div class="progress-bar-fill">${project.progress || 0}%</div>
            </div>
            
            <h2>📝 Description</h2>
            <p style="background: #f7fafc; padding: 15px; border-radius: 10px;">${escapeHtml(project.description || 'No description provided')}</p>
            
            <h2>👥 Team Members (${teamMembers.length})</h2>
            ${teamMembers.length > 0 ? `
                <table>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Designation</th><th>Department</th><th>Performance</th></tr>
                    </thead>
                    <tbody>
                        ${teamMembers.map(emp => `
                            <tr>
                                <td>${escapeHtml(emp.name)}</td>
                                <td>${emp.email}</td>
                                <td>${emp.designation || 'N/A'}</td>
                                <td>${emp.department || 'N/A'}</td>
                                <td>${emp.performanceRating ? emp.performanceRating + ' ★' : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: #718096;">No team members assigned</p>'}
            
            <h2>📈 Monthly Progress</h2>
            <table>
                <thead><tr><th>Month</th><th>Progress (%)</th></tr></thead>
                <tbody>
                    ${Object.entries(monthlyProgress).length > 0 ? 
                        Object.entries(monthlyProgress).map(([m,p]) => `<tr><td>${escapeHtml(m)}</td><td>${p}%</td></tr>`).join('') : 
                        '<tr><td colspan="2">No monthly progress data available</td></tr>'}
                </tbody>
            </table>
            
            <h2>📎 Documents</h2>
            <ul class="doc-list">
                ${project.documents && project.documents.length ? 
                    project.documents.map(doc => `<li>📄 ${escapeHtml(doc)}</li>`).join('') : 
                    '<li>No documents uploaded yet</li>'}
            </ul>
            
            <div class="footer">
                <p>This report is system generated</p>
                <p>Software Personnel Management System | Confidential</p>
            </div>
        </body>
        </html>`;
        
        // Open in new window and print to save as PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.print();
        
        showToast('Report opened - Use Print to save as PDF', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to generate report: ' + error.message, 'error');
    }
}

async function loadPerformanceDetails() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = await response.json();
        const team = employees.filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
        
        // Render charts
        const projRes = await fetch(`${API_BASE_URL}/api/projects/manager/${managerId}`);
        const projects = await projRes.json();
        renderPerformanceCharts(team, projects);
        
    } catch (error) { showToast('Failed to load performance details', 'error'); }
}

let empPerfChart = null;
let projGrowthChart = null;

function renderPerformanceCharts(team, projects) {
    const empCtx = document.getElementById('employeePerformanceChart').getContext('2d');
    const projCtx = document.getElementById('projectGrowthChart').getContext('2d');
    
    if (empPerfChart) empPerfChart.destroy();
    empPerfChart = new Chart(empCtx, {
        type: 'bar',
        data: {
            labels: team.map(e => e.name),
            datasets: [{
                label: 'Performance (%)',
                data: team.map(e => e.performanceRating || 0),
                backgroundColor: team.map(e => getPerformanceColor((e.performanceRating || 0)/20)),
                borderRadius: 5
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    if (projGrowthChart) projGrowthChart.destroy();
    projGrowthChart = new Chart(projCtx, {
        type: 'doughnut',
        data: {
            labels: projects.map(p => p.projectName),
            datasets: [{
                data: projects.map(p => p.progress || 0),
                backgroundColor: ['#667eea', '#764ba2', '#48bb78', '#f56565', '#ed8936'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// ========== PAY EMPLOYEE ==========
async function loadPayrollData() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = await response.json();
        const teamEmployees = employees.filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
        
        const select = document.getElementById('payEmployeeSelect');
        if (select) { 
            select.innerHTML = '<option value="">Choose Employee</option>'; 
            if (teamEmployees.length === 0) {
                select.innerHTML += '<option disabled>No employees assigned to you yet</option>';
            } else {
                teamEmployees.forEach(e => {
                    const option = document.createElement('option');
                    option.value = e.id;
                    option.textContent = `${e.name}`;
                    // Store employee data in dataset for easy access
                    option.dataset.salary = e.salary || 0;
                    option.dataset.email = e.email || '';
                    option.dataset.designation = e.designation || '';
                    select.appendChild(option);
                });
            }

            // Auto-fill listener
            select.onchange = function() {
                const selectedOption = select.options[select.selectedIndex];
                const basicInput = document.getElementById('payBasic');
                if (selectedOption && selectedOption.dataset.salary) {
                    basicInput.value = selectedOption.dataset.salary;
                    showToast(`Details loaded for ${selectedOption.text}`, 'info');
                } else {
                    basicInput.value = '';
                }
            };
        }
        
        const historyRes = await fetch(`${API_BASE_URL}/api/payroll/manager/${managerId}`);
        const history = await historyRes.json();
        const historyBody = document.getElementById('payrollHistoryBody');
        if (!history || history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="8" class="empty-state">No payment history<\/td><\/tr>';
        } else { 
            historyBody.innerHTML = ''; 
            history.forEach(p => { 
                const row = historyBody.insertRow(); 
                row.innerHTML = `
                    <td>${p.userName}<\/td>
                    <td>${p.month} ${p.year}<\/td>
                    <td>₹${p.basicSalary?.toLocaleString() || 0}<\/td>
                    <td>₹${p.allowances?.toLocaleString() || 0}<\/td>
                    <td>₹${p.deductions?.toLocaleString() || 0}<\/td>
                    <td><strong>₹${p.netSalary?.toLocaleString() || 0}<\/strong><\/td>
                    <td><span class="status-badge">${p.status || 'PROCESSED'}<\/span><\/td>
                    <td><button class="btn btn-sm btn-view" onclick="viewEmployeePayslipAsModal('${p.id}')">View Payslip<\/button><\/td>
                `;
            }); 
        }
    } catch (error) { console.error('Error:', error); }
}

async function processEmployeeSalary(event) {
    event.preventDefault();
    const employeeId = document.getElementById('payEmployeeSelect').value;
    const month = document.getElementById('payMonth').value;
    const year = document.getElementById('payYear').value;
    const basicSalary = document.getElementById('payBasic').value;
    const allowances = document.getElementById('payAllowances').value;
    const deductions = document.getElementById('payDeductions').value;
    const managerId = sessionStorage.getItem('userId');
    
    if (!employeeId) { showToast('Select employee', 'warning'); return; }
    
    const payroll = { 
        userId: employeeId, 
        month: month, 
        year: parseInt(year), 
        basicSalary: parseFloat(basicSalary), 
        allowances: parseFloat(allowances) || 0, 
        deductions: parseFloat(deductions) || 0, 
        status: 'PROCESSED' 
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/payroll/process/employee?managerId=${managerId}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payroll) 
        });
        const data = await response.json();
        if (response.ok && data.success) { 
            showToast('Salary processed successfully!', 'success'); 
            document.getElementById('payEmployeeForm').reset(); 
            loadPayrollData(); 
        } else { 
            showToast(data.message || 'Failed to process salary', 'error'); 
        }
    } catch (error) { showToast('Error processing salary', 'error'); }
}

// View Employee Payslip as MODAL
async function viewEmployeePayslipAsModal(payrollId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payroll/payslip/${payrollId}`);
        const payroll = await response.json();
        
        const modalContent = `
            <div style="padding:20px">
                <div style="text-align:center; border-bottom:2px solid #667eea; padding-bottom:15px; margin-bottom:20px;">
                    <h2 style="color:#667eea;">SALARY PAYSLIP</h2>
                    <p style="color:#764ba2;">Software Personnel Management System</p>
                    <p><strong>${payroll.month} ${payroll.year}</strong></p>
                </div>
                <div style="margin:20px 0">
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #ddd;">
                        <span style="font-weight:bold;">Employee Name:</span><span>${payroll.userName}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #ddd;">
                        <span style="font-weight:bold;">Role:</span><span>${payroll.role || 'EMPLOYEE'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #ddd;">
                        <span style="font-weight:bold;">Basic Salary:</span><span>₹${payroll.basicSalary?.toLocaleString() || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #ddd;">
                        <span style="font-weight:bold;">Allowances:</span><span>₹${payroll.allowances?.toLocaleString() || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #ddd;">
                        <span style="font-weight:bold;">Deductions:</span><span>₹${payroll.deductions?.toLocaleString() || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:15px; background:#f7fafc; border-radius:8px; margin-top:15px;">
                        <span style="font-weight:bold;">NET SALARY:</span><span style="font-weight:bold; color:#667eea;">₹${payroll.netSalary?.toLocaleString() || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; margin-top:10px;">
                        <span style="font-weight:bold;">Status:</span><span>${payroll.status || 'PROCESSED'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0;">
                        <span style="font-weight:bold;">Date:</span><span>${payroll.processedDate ? new Date(payroll.processedDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                <div style="text-align:center; margin-top:20px; font-size:10px; color:#a0aec0;">
                    <p>This is a system generated payslip. No signature required.</p>
                </div>
                <div style="text-align:center; margin-top:15px;">
                    <button class="btn btn-primary" onclick="closePayslipModal()">Close</button>
                </div>
            </div>
        `;
        
        let modal = document.getElementById('payslipModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'payslipModal';
            modal.className = 'modal';
            modal.innerHTML = `<div class="modal-content" style="max-width:500px;"><div class="modal-header"><h3>Payslip Details</h3><span class="close" onclick="closePayslipModal()">&times;</span></div><div id="payslipContent"></div></div>`;
            document.body.appendChild(modal);
        }
        
        document.getElementById('payslipContent').innerHTML = modalContent;
        modal.style.display = 'flex';
        
        window.closePayslipModal = function() {
            modal.style.display = 'none';
        };
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load payslip', 'error');
    }
}

function closePayslipModal() {
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'none';
}

// ========== MEETINGS (Requirement 5 Refactored) ==========
let selectedAttendees = [];

async function loadEmployeesForMeeting() {
    const managerId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/employees`);
        const employees = await response.json();
        const teamEmployees = employees.filter(e => e.role === 'EMPLOYEE' && e.managerId === managerId);
        
        const attendeesSelect = document.getElementById('meetingAttendees');
        if (attendeesSelect) {
            attendeesSelect.innerHTML = '<option value="">Select Employee to Add</option><option value="all">📧 ALL TEAM MEMBERS</option>';
            teamEmployees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.email;
                option.textContent = `👥 ${emp.name} (${emp.designation || 'Employee'})`;
                attendeesSelect.appendChild(option);
            });
        }
    } catch (error) { showToast('Failed to load team', 'error'); }
}

function filterAttendees() {
    const searchTerm = document.getElementById('attendeeSearch').value.toLowerCase();
    const select = document.getElementById('meetingAttendees');
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        if (option.value === "" || option.value === "all") continue;
        const text = option.text.toLowerCase();
        option.style.display = text.includes(searchTerm) ? 'block' : 'none';
    }
}

function addAttendee(value) {
    if (!value) return;
    const select = document.getElementById('meetingAttendees');
    const selectedText = select.options[select.selectedIndex].text;
    
    if (value === 'all') {
        selectedAttendees = [{ id: 'all', name: 'All Team Members' }];
    } else {
        selectedAttendees = selectedAttendees.filter(a => a.id !== 'all');
        if (!selectedAttendees.find(a => a.id === value)) {
            selectedAttendees.push({ id: value, name: selectedText });
        }
    }
    updateMeetingAttendeeUI();
    select.value = '';
}

function removeAttendee(id) {
    selectedAttendees = selectedAttendees.filter(a => a.id !== id);
    updateMeetingAttendeeUI();
}

function updateMeetingAttendeeUI() {
    const container = document.getElementById('selectedAttendeesContainer');
    if (!container) return;
    container.innerHTML = '';
    selectedAttendees.forEach(a => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${a.name} <i class="fas fa-times" onclick="removeAttendee('${a.id}')"></i>`;
        container.appendChild(tag);
    });
}

async function scheduleMeeting(event) {
    event.preventDefault();
    const title = document.getElementById('meetingTitle').value;
    const date = document.getElementById('meetingDate').value;
    const time = document.getElementById('meetingTime').value;
    const purpose = document.getElementById('meetingPurpose').value;
    const location = document.getElementById('meetingLocation').value;
    
    if (!title || !date || !time || !purpose || !location || selectedAttendees.length === 0) { 
        showToast('Please fill all fields and select attendees', 'warning'); 
        return; 
    }
    
    const attendeesString = selectedAttendees.map(a => a.name).join(', ');
    const meetingData = { 
        title, date, time, purpose, location, 
        attendees: attendeesString,
        organizedBy: sessionStorage.getItem('userId') 
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings/schedule`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(meetingData) 
        });
        
        if (response.ok) { 
            showToast('Meeting scheduled!', 'success'); 
            document.getElementById('meetingForm').reset(); 
            selectedAttendees = [];
            updateMeetingAttendeeUI();
            loadMeetings(); 
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed', 'error');
        }
    } catch (error) { showToast('Error scheduling meeting', 'error'); }
}

async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings/all`);
        const meetings = await response.json();
        const container = document.getElementById('meetingsContainer');
        if (!meetings || meetings.length === 0) { 
            container.innerHTML = '<div class="empty-state">No upcoming meetings</div>'; 
            return; 
        }
        container.innerHTML = '';
        for (const meeting of meetings) {
            const card = document.createElement('div'); 
            card.className = 'meeting-card';
            
            let locationHtml = meeting.location;
            if (meeting.location && (meeting.location.includes('http') || meeting.location.includes('zoom') || meeting.location.includes('meet'))) {
                locationHtml = `<a href="${meeting.location}" target="_blank"><i class="fas fa-external-link-alt"></i> ${meeting.location}</a>`;
            }
            
            let attendeesDisplay = meeting.attendees;
            if (meeting.attendees === 'all') {
                attendeesDisplay = 'All Team Members';
            } else if (meeting.attendees && meeting.attendees !== '') {
                attendeesDisplay = meeting.attendees;
            } else {
                attendeesDisplay = 'None';
            }
            
            card.innerHTML = `
                <div class="meeting-header">
                    <h4><i class="fas fa-chalkboard"></i> ${meeting.title}</h4>
                    <span class="meeting-time">${meeting.date} at ${meeting.time}</span>
                </div>
                <p><strong>Purpose:</strong> ${meeting.purpose}</p>
                <p><strong>Location:</strong> ${locationHtml}</p>
                <p><strong>Attendees:</strong> ${attendeesDisplay}</p>
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
        document.getElementById('userDept').textContent = user.department || 'Engineering';
        if (user.profilePhoto) document.getElementById('profileImg').src = user.profilePhoto;
        else document.getElementById('profileImg').src = `https://ui-avatars.com/api/?background=667eea&color=fff&size=150&name=${encodeURIComponent(user.name)}`;
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
        const data = await response.json();
        if (response.ok) { document.getElementById('profileImg').src = data.photoUrl; showToast('Photo updated!', 'success'); } 
        else showToast('Failed', 'error');
    } catch (error) { showToast('Error', 'error'); }
}

function showChangePasswordModal() { document.getElementById('changePasswordModal').style.display = 'flex'; }
function closePasswordModal() { document.getElementById('changePasswordModal').style.display = 'none'; document.getElementById('changePasswordForm').reset(); }

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) { showToast('Passwords do not match!', 'warning'); return; }
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

document.addEventListener('DOMContentLoaded', function() { 
    const name = sessionStorage.getItem('userName'); 
    if (name) { 
        document.getElementById('managerName').textContent = name; 
        loadTeamMembers(); 
    } else window.location.href = '/'; 
});

// ========== PERSONAL DETAILS MODAL ==========
async function openPersonalDetailsModal() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`);
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
        showToast('Failed to load personal details', 'error');
    }
}

function closePersonalDetailsModal() {
    document.getElementById('personalDetailsModal').style.display = 'none';
}

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
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/personal-details/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personalDetails)
        });
        
        if (response.ok) {
            showToast('Personal details updated successfully!', 'success');
            closePersonalDetailsModal();
            loadProfile();
        } else {
            const data = await response.json();
            showToast(data.error || 'Update failed', 'error');
        }
    } catch (error) {
        showToast('Error updating personal details', 'error');
    }
}