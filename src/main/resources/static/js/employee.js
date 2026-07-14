// API Base URL
const API_BASE_URL = 'http://localhost:8080';

// Chart instance for leave chart
let leaveChart = null;

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
        case 'myProjects': loadMyProjects(); break;
        case 'attendance': loadAttendanceLogs(); break;
        case 'raiseLeave': break;
        case 'leaveHistory': loadLeaveHistory(); break;
        case 'myMeetings': loadMyMeetings(); break;
        case 'payslip': loadPayslipPage(); break;
        case 'profile': loadProfile(); loadAttendanceLogs(); break;
    }
}

// ========== MY TASKS ==========
let uploadProjectId = null;
let uploadTaskId = null;

async function loadMyProjects() {
    const employeeId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/employee/${employeeId}`);
        const projects = await response.json();
        const container = document.getElementById('tasksContainer');
        
        if (projects.length === 0) { 
            container.innerHTML = '<div class="empty-state">No tasks assigned to you</div>'; 
            return; 
        }
        
        container.innerHTML = '';
        projects.forEach(project => {
            const myTasks = (project.tasks || []).filter(t => t.assignedEmployeeId === employeeId);
            
            myTasks.forEach(task => {
                const card = document.createElement('div'); 
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="project-header">
                        <h4><i class="fas fa-tasks"></i> ${task.taskName}</h4>
                        <span class="status-badge status-${task.status?.toLowerCase().replace(' ', '-')}">${task.status}</span>
                    </div>
                    <p><strong>Project:</strong> ${project.projectName}</p>
                    <p><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Progress:</strong> ${task.progressPercentage || 0}%</p>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${task.progressPercentage || 0}%"></div></div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-primary" onclick="showUploadModal('${project.id}', '${task.id}')"><i class="fas fa-upload"></i> Update Task Status</button>
                        ${task.uploadedFile ? `<button class="btn btn-sm btn-view" onclick="window.open('${API_BASE_URL}${task.uploadedFile}', '_blank')"><i class="fas fa-file"></i> View Work</button>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<div class="empty-state">No individual tasks assigned to you yet</div>';
        }
    } catch (error) { 
        console.error('Error loading tasks:', error);
        showToast('Failed to load tasks', 'error'); 
    }
}

// ========== UPLOAD WORK ==========
function showUploadModal(projectId, taskId) { 
    uploadProjectId = projectId; 
    uploadTaskId = taskId;
    document.getElementById('uploadProjectId').value = projectId; 
    document.getElementById('uploadTaskId').value = taskId; 
    document.getElementById('uploadModal').style.display = 'flex'; 
}

function closeUploadModal() { 
    document.getElementById('uploadModal').style.display = 'none'; 
    document.getElementById('uploadForm').reset(); 
    uploadProjectId = null; 
    uploadTaskId = null;
}

async function uploadTaskWork(event) {
    event.preventDefault();
    
    const files = document.getElementById('projectFiles').files;
    const progress = document.getElementById('projectProgress').value;
    
    if (!progress) { 
        showToast('Please enter progress percentage', 'warning'); 
        return; 
    }
    
    // Validate file size (max 5MB)
    if (files.length > 0 && files[0].size > 5 * 1024 * 1024) {
        showToast('File is too large! Maximum allowed size: 5MB. Your file: ' + (files[0].size / (1024 * 1024)).toFixed(2) + 'MB.', 'error');
        return;
    }
    
    const formData = new FormData();
    if (files.length > 0) {
        formData.append('file', files[0]);
    }
    formData.append('progress', progress);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${uploadProjectId}/tasks/${uploadTaskId}/work`, { 
            method: 'POST', 
            body: formData 
        });
        
        if (response.ok) { 
            showToast('Task work submitted successfully!', 'success'); 
            closeUploadModal(); 
            loadMyProjects(); 
        } else {
            const data = await response.json();
            showToast(data.error || 'Submission failed', 'error');
        }
    } catch (error) { 
        console.error('Submission error:', error);
        showToast('Error submitting work', 'error'); 
    }
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
            loadAttendanceLogs();
            
            // Trigger performance recalculation
            fetch(`${API_BASE_URL}/api/users/calculate-rating/${userId}`, { method: 'POST' });
        } else {
            showToast('Failed to mark attendance', 'error');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showToast('Error marking attendance', 'error');
    }
}

function updateAttendanceUI(attendance) {
    if (attendance) {
        document.getElementById('checkInTime').textContent = new Date(attendance.checkInTime).toLocaleTimeString();
        document.getElementById('checkOutTime').textContent = attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString() : '-';
        
        if (attendance.checkOutTime) {
            // Already checked out
            document.getElementById('checkInBtn').style.display = 'none';
            document.getElementById('checkOutBtn').style.display = 'none';
            document.getElementById('statusText').textContent = 'Shift completed';
            document.getElementById('attendanceStatus').style.color = '#718096';
        } else {
            // Checked in but not yet checked out
            document.getElementById('checkInBtn').style.display = 'none';
            document.getElementById('checkOutBtn').style.display = 'inline-flex';
            document.getElementById('statusText').textContent = 'You are checked in';
            document.getElementById('attendanceStatus').querySelector('i').className = 'fas fa-check-circle';
            document.getElementById('attendanceStatus').querySelector('i').style.color = '#10b981';
            document.getElementById('statusText').style.color = '#10b981';
        }
    } else {
        // Not checked in yet
        document.getElementById('checkInBtn').style.display = 'inline-flex';
        document.getElementById('checkOutBtn').style.display = 'none';
        document.getElementById('statusText').textContent = 'Ready to start your day?';
        document.getElementById('attendanceStatus').querySelector('i').className = 'fas fa-user-clock';
        document.getElementById('attendanceStatus').querySelector('i').style.color = '#667eea';
        document.getElementById('statusText').style.color = '#2d3748';
        document.getElementById('checkInTime').textContent = '-';
        document.getElementById('checkOutTime').textContent = '-';
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
            loadAttendanceLogs();
            
            // Trigger performance recalculation
            fetch(`${API_BASE_URL}/api/users/calculate-rating/${userId}`, { method: 'POST' });
        } else {
            showToast('Failed to check out', 'error');
        }
    } catch (error) {
        console.error('Error checking out:', error);
        showToast('Error checking out', 'error');
    }
}

async function loadAttendanceLogs() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/user/${userId}`);
        const logs = await response.json();
        
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No attendance logs found</td></tr>';
            return;
        }

        // Check if today's attendance is already marked
        const todayStr = new Date().toDateString();
        const todayLog = logs.find(log => new Date(log.date).toDateString() === todayStr);
        if (todayLog) updateAttendanceUI(todayLog);
        else updateAttendanceUI(null);

        tbody.innerHTML = '';
        logs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(log => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${new Date(log.date).toLocaleDateString()}</td>
                <td><span class="status-badge status-active">${log.status}</span></td>
                <td>${log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '-'}</td>
                <td>${log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '-'}</td>
            `;
        });
    } catch (error) {
        console.error('Error loading attendance logs:', error);
    }
}

// ========== LEAVE CHART FUNCTION ==========
function updateLeaveChart(leaves) {
    const totalAnnualLeave = 20;
    let totalDaysTaken = 0;
    
    leaves.forEach(leave => {
        if (leave.status === 'APPROVED') {
            totalDaysTaken += leave.numberOfDays || 1;
        }
    });
    
    const remainingLeave = Math.max(0, totalAnnualLeave - totalDaysTaken);
    const usedPercentage = (totalDaysTaken / totalAnnualLeave) * 100;
    
    document.getElementById('leaveTaken').textContent = totalDaysTaken;
    document.getElementById('leaveRemaining').textContent = remainingLeave;
    document.getElementById('leaveProgressFill').style.width = `${usedPercentage}%`;
    
    const ctx = document.getElementById('leaveChart');
    if (ctx) {
        if (leaveChart) leaveChart.destroy();
        
        leaveChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Leave Taken', 'Leave Remaining'],
                datasets: [{
                    data: [totalDaysTaken, remainingLeave],
                    backgroundColor: ['#f59e0b', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// ========== RAISE LEAVE ==========
async function raiseLeaveRequest(event) {
    event.preventDefault();
    const leaveRequest = { 
        employeeId: sessionStorage.getItem('userId'), 
        employeeName: sessionStorage.getItem('userName'), 
        leaveType: document.getElementById('leaveType').value, 
        startDate: document.getElementById('leaveFrom').value, 
        endDate: document.getElementById('leaveTo').value, 
        reason: document.getElementById('leaveReason').value, 
        status: 'PENDING' 
    };
    if (!leaveRequest.startDate || !leaveRequest.endDate || !leaveRequest.reason) { 
        showToast('Fill all fields', 'warning'); 
        return; 
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaves/raise`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(leaveRequest) 
        });
        if (response.ok) { 
            showToast('Leave request submitted!', 'success'); 
            document.getElementById('leaveForm').reset(); 
            showSection('leaveHistory'); 
            loadLeaveHistory(); 
        } else showToast('Failed', 'error');
    } catch (error) { showToast('Error', 'error'); }
}

// ========== LEAVE HISTORY ==========
async function loadLeaveHistory() {
    const employeeId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaves/employee/${employeeId}`);
        const leaves = await response.json();
        
        updateLeaveChart(leaves);
        
        const tbody = document.getElementById('leaveHistoryBody');
        if (leaves.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No leave history<\/td><\/tr>';
            return; 
        }
        tbody.innerHTML = '';
        leaves.forEach(leave => { 
            const row = tbody.insertRow(); 
            row.innerHTML = `
                <td>${leave.leaveType || 'Casual'}</td>
                <td>${new Date(leave.startDate).toLocaleDateString()}</td>
                <td>${new Date(leave.endDate).toLocaleDateString()}</td>
                <td>${leave.numberOfDays || 1}</td>
                <td><span class="status-badge status-${leave.status?.toLowerCase()}">${leave.status || 'PENDING'}</span></td>
                <td>${leave.reason || '-'}</td>
                <td>${leave.rejectionReason || '-'}</td>
            `;
        });
    } catch (error) { showToast('Failed to load history', 'error'); }
}

// ========== MY MEETINGS ==========
async function loadMyMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings/all`);
        const meetings = await response.json();
        const container = document.getElementById('meetingsContainer');
        if (meetings.length === 0) { 
            container.innerHTML = '<div class="empty-state">No meetings scheduled</div>'; 
            return; 
        }
        container.innerHTML = '';
        meetings.forEach(meeting => {
            const card = document.createElement('div'); 
            card.className = 'meeting-card';
            let locationHtml = meeting.location;
            if (meeting.location && (meeting.location.includes('http') || meeting.location.includes('zoom') || meeting.location.includes('meet'))) {
                locationHtml = `<a href="${meeting.location}" target="_blank">${meeting.location}</a>`;
            }
            card.innerHTML = `
                <div class="meeting-header"><h4>${meeting.title}</h4><span class="meeting-time">${meeting.date} at ${meeting.time}</span></div>
                <p><strong>Purpose:</strong> ${meeting.purpose}</p>
                <p><strong>Location:</strong> ${locationHtml}</p>
                <p><strong>Attendees:</strong> ${meeting.attendees || 'All'}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) { showToast('Failed to load meetings', 'error'); }
}

// ========== PAYSLIP - MONTH & YEAR SELECTION WITH VIEW BUTTON ==========

// Load payslip page with month/year selection
function loadPayslipPage() {
    // Set default year to current year
    const currentYear = new Date().getFullYear();
    document.getElementById('payslipYear').value = currentYear;
    
    // Clear previous display
    document.getElementById('payslipDisplay').style.display = 'none';
    document.getElementById('payslipDisplay').innerHTML = '';
}

// View Payslip based on selected month and year
async function viewPayslip() {
    const month = document.getElementById('payslipMonth').value;
    const year = document.getElementById('payslipYear').value;
    
    if (!month) {
        showToast('Please select a month', 'warning');
        return;
    }
    
    if (!year) {
        showToast('Please select a year', 'warning');
        return;
    }
    
    const userId = sessionStorage.getItem('userId');
    
    try {
        showToast('Loading payslip...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/payroll/payslip/${userId}/${month}/${year}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('No payslip found for selected month and year');
            }
            throw new Error('Failed to fetch payslip');
        }
        
        const payroll = await response.json();
        
        // Display payslip with download button
        const payslipHtml = `
            <div class="card" style="padding: 20px; animation: fadeIn 0.3s ease;">
                <div style="text-align:center; border-bottom:2px solid #667eea; padding-bottom:15px; margin-bottom:20px;">
                    <h2 style="color:#667eea;">💰 SALARY PAYSLIP</h2>
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
                        <span style="font-weight:bold; font-size:16px;">NET SALARY:</span>
                        <span style="font-weight:bold; font-size:18px; color:#667eea;">₹${payroll.netSalary?.toLocaleString() || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0; margin-top:10px;">
                        <span style="font-weight:bold;">Status:</span><span>${payroll.status || 'PROCESSED'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:10px 0;">
                        <span style="font-weight:bold;">Payment Date:</span><span>${payroll.processedDate ? new Date(payroll.processedDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn btn-primary" onclick="downloadPayslipByMonth('${payroll.month}', '${payroll.year}')" style="flex:1;">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('payslipDisplay').innerHTML = payslipHtml;
        document.getElementById('payslipDisplay').style.display = 'block';
        
        // Store current month/year for download
        window.currentPayslip = { month: payroll.month, year: payroll.year, userId: userId };
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('payslipDisplay').style.display = 'none';
        document.getElementById('payslipDisplay').innerHTML = `
            <div class="card" style="padding: 20px; text-align:center;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f56565;"></i>
                <p style="margin-top: 15px; color: #e53e3e;">${error.message}</p>
                <p style="margin-top: 10px; color: #718096;">Please select a different month/year</p>
            </div>
        `;
        document.getElementById('payslipDisplay').style.display = 'block';
        showToast(error.message, 'error');
    }
}

// Download Payslip by Month and Year
async function downloadPayslipByMonth(month, year) {
    try {
        showToast('Generating PDF...', 'info');
        
        const userId = sessionStorage.getItem('userId');
        
        const response = await fetch(`${API_BASE_URL}/api/payroll/payslip/${userId}/${month}/${year}`);
        if (!response.ok) throw new Error('Failed to fetch payslip');
        const payroll = await response.json();
        
        const currentDate = new Date().toLocaleString();
        
        const pdfHtml = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Payslip_${payroll.userName}_${payroll.month}_${payroll.year}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 50px;
                    background: white;
                }
                .payslip-container {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 2px solid #667eea;
                    border-radius: 16px;
                    padding: 30px;
                    background: white;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    color: #667eea;
                    margin: 0;
                    font-size: 28px;
                }
                .header p {
                    color: #764ba2;
                    margin: 5px 0 0;
                }
                .payslip-title {
                    text-align: center;
                    margin: 20px 0;
                }
                .payslip-title h2 {
                    background: #667eea;
                    color: white;
                    display: inline-block;
                    padding: 8px 25px;
                    border-radius: 25px;
                    font-size: 18px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }
                .info-label {
                    font-weight: bold;
                    color: #4a5568;
                    width: 40%;
                }
                .info-value {
                    color: #2d3748;
                    width: 60%;
                }
                .salary-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .salary-table th, .salary-table td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                .salary-table th {
                    background: #667eea;
                    color: white;
                }
                .salary-table tr:nth-child(even) {
                    background: #f9fafb;
                }
                .net-salary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    border-radius: 10px;
                    margin-top: 20px;
                    text-align: center;
                    color: white;
                }
                .net-salary strong {
                    font-size: 16px;
                }
                .net-salary span {
                    font-size: 28px;
                    font-weight: bold;
                    display: block;
                    margin-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 10px;
                    color: #999;
                }
                .amount {
                    text-align: right;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="payslip-container">
                <div class="header">
                    <h1>SPMS</h1>
                    <p>Software Personnel Management System</p>
                </div>
                
                <div class="payslip-title">
                    <h2>SALARY PAYSLIP</h2>
                </div>
                
                <div class="info-row">
                    <div class="info-label">Employee Name:</div>
                    <div class="info-value">${payroll.userName}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Role:</div>
                    <div class="info-value">${payroll.role || 'EMPLOYEE'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Pay Period:</div>
                    <div class="info-value">${payroll.month} ${payroll.year}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Payment Date:</div>
                    <div class="info-value">${payroll.processedDate ? new Date(payroll.processedDate).toLocaleDateString() : 'N/A'}</div>
                </div>
                
                <table class="salary-table">
                    <thead>
                        <tr><th>Particulars</th><th>Amount (₹)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Basic Salary</td><td class="amount">${payroll.basicSalary?.toLocaleString() || 0}</td></tr>
                        <tr><td>House Rent Allowance (HRA)</td><td class="amount">${Math.floor((payroll.basicSalary || 0) * 0.4).toLocaleString()}</td></tr>
                        <tr><td>Dearness Allowance (DA)</td><td class="amount">${Math.floor((payroll.basicSalary || 0) * 0.1).toLocaleString()}</td></tr>
                        <tr><td>Other Allowances</td><td class="amount">${payroll.allowances?.toLocaleString() || 0}</td></tr>
                        <tr style="background:#f0f0f0;"><td><strong>Total Earnings</strong></td><td class="amount"><strong>${((payroll.basicSalary || 0) + (payroll.allowances || 0) + Math.floor((payroll.basicSalary || 0) * 0.5)).toLocaleString()}</strong></td></tr>
                        <tr><td>Professional Tax</td><td class="amount">${Math.floor((payroll.basicSalary || 0) * 0.02).toLocaleString()}</td></tr>
                        <tr><td>Provident Fund (PF)</td><td class="amount">${Math.floor((payroll.basicSalary || 0) * 0.12).toLocaleString()}</td></tr>
                        <tr><td>Other Deductions</td><td class="amount">${payroll.deductions?.toLocaleString() || 0}</td></tr>
                        <tr style="background:#f0f0f0;"><td><strong>Total Deductions</strong></td><td class="amount"><strong>${(payroll.deductions || 0 + Math.floor((payroll.basicSalary || 0) * 0.14)).toLocaleString()}</strong></td></tr>
                    </tbody>
                </table>
                
                <div class="net-salary">
                    <strong>NET SALARY (₹)</strong>
                    <span>₹${payroll.netSalary?.toLocaleString() || 0}</span>
                </div>
                
                <div class="footer">
                    <p>This is a computer generated payslip. No signature required.</p>
                    <p>Generated on: ${currentDate}</p>
                    <p>Software Personnel Management System</p>
                </div>
            </div>
        </body>
        </html>`;
        
        // Download as HTML file
        const blob = new Blob([pdfHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payslip_${payroll.userName}_${payroll.month}_${payroll.year}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Payslip downloaded! Open and press Ctrl+P to save as PDF', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to download payslip: ' + error.message, 'error');
    }
}

// ========== PROFILE ==========
async function loadProfile() {
    const userId = sessionStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`);
        const user = await response.json();
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userPhone').textContent = user.phone || 'Not provided';
        document.getElementById('userDept').textContent = user.department || 'Not assigned';
        document.getElementById('userQualification').textContent = user.qualification || 'Not provided';
        if (user.registrationDate) document.getElementById('userJoinDate').textContent = new Date(user.registrationDate).toLocaleDateString();
        if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) {
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
        const response = await fetch(`${API_BASE_URL}/api/users/profile/photo/${sessionStorage.getItem('userId')}`, { 
            method: 'POST', 
            body: formData 
        });
        const data = await response.json();
        if (response.ok) { 
            document.getElementById('profileImg').src = data.photoUrl; 
            showToast('Photo updated!', 'success'); 
        } else showToast('Failed', 'error');
    } catch (error) { showToast('Error', 'error'); }
}

// ========== CHANGE PASSWORD ==========
function showChangePasswordModal() { 
    document.getElementById('changePasswordModal').style.display = 'flex'; 
}

function closePasswordModal() { 
    document.getElementById('changePasswordModal').style.display = 'none'; 
    document.getElementById('changePasswordForm').reset(); 
}

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) { 
        showToast('Passwords do not match!', 'warning'); 
        return; 
    }
    if (newPassword.length < 6) { 
        showToast('Password must be 6+ characters', 'warning'); 
        return; 
    }
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

function logout() { 
    sessionStorage.clear(); 
    window.location.href = '/'; 
}

document.addEventListener('DOMContentLoaded', function() { 
    const name = sessionStorage.getItem('userName'); 
    if (name) { 
        document.getElementById('employeeName').textContent = name; 
        loadMyProjects(); 
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