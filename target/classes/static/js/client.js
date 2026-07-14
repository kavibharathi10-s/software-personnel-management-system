// API Base URL
const API_BASE_URL = '';

// Chart instance
let growthChart = null;

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
    document.getElementById(sectionId).style.display = 'block';
    
    switch(sectionId) {
        case 'myProjects':
            loadMyProjects();
            break;
        case 'createProject':
            // Just show the form
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// ========== CREATE PROJECT ==========
async function createProject(event) {
    event.preventDefault();
    
    const project = {
        projectName: document.getElementById('projectName').value,
        description: document.getElementById('projectDesc').value,
        startDate: document.getElementById('projectStart').value,
        endDate: document.getElementById('projectEnd').value,
        budget: parseFloat(document.getElementById('projectBudget').value),
        technologyStack: document.getElementById('projectTech').value,
        additionalNotes: document.getElementById('projectNotes').value,
        clientId: sessionStorage.getItem('userId'),
        clientName: sessionStorage.getItem('userName'),
        status: 'CREATED',
        progress: 0,
        monthlyProgress: {}
    };
    
    if (!project.projectName || !project.description || !project.startDate || !project.endDate || !project.budget) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Project created successfully!', 'success');
            document.getElementById('createProjectForm').reset();
            showSection('myProjects');
            loadMyProjects();
        } else {
            showToast(data.error || 'Failed to create project', 'error');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project', 'error');
    }
}

// ========== LOAD MY PROJECTS ==========
async function loadMyProjects() {
    const clientId = sessionStorage.getItem('userId');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/client/${clientId}`);
        const projects = await response.json();
        const container = document.getElementById('projectsContainer');
        
        if (projects.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i> No projects yet. Create your first project!</div>';
            return;
        }
        
        container.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            let statusText = project.status || 'CREATED';
            let statusClass = statusText.toLowerCase().replace(/_/g, '-');
            
            card.innerHTML = `
                <div class="project-header">
                    <h4><i class="fas fa-folder"></i> ${project.projectName}</h4>
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
                <p class="project-desc">${project.description || 'No description'}</p>
                <p><i class="fas fa-rupee-sign"></i> <strong>Budget:</strong> ₹${project.budget ? project.budget.toLocaleString() : 0}</p>
                <p><i class="fas fa-calendar"></i> <strong>Start:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><i class="fas fa-calendar-check"></i> <strong>End:</strong> ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</p>
                <p><i class="fas fa-chart-line"></i> <strong>Progress:</strong> ${project.progress || 0}%</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                </div>
                <p><i class="fas fa-user-tie"></i> <strong>Assigned Manager:</strong> ${project.managerName || 'Not assigned yet'}</p>
                <div class="card-actions">
                    <button class="btn btn-sm btn-view" onclick="viewProjectDetails('${project.id}')">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showMonthlyGrowth('${project.id}', '${project.projectName}')">
                        <i class="fas fa-chart-line"></i> Monthly Growth
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsContainer').innerHTML = '<div class="empty-state error"><i class="fas fa-exclamation-triangle"></i> Failed to load projects</div>';
    }
}

// ========== SHOW MONTHLY GROWTH CHART ==========
async function showMonthlyGrowth(projectId, projectName) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/monthly-growth/${projectId}`);
        const data = await response.json();
        
        const monthlyProgress = data.monthlyProgress || {};
        
        // Prepare data for chart
        const months = Object.keys(monthlyProgress).sort();
        const progressValues = months.map(month => monthlyProgress[month]);
        
        // If no monthly data yet, show placeholder
        if (months.length === 0) {
            showToast('No monthly progress data available yet', 'info');
            return;
        }
        
        // Show modal with chart
        document.getElementById('growthChartModal').style.display = 'flex';
        
        // Destroy existing chart if exists
        if (growthChart) {
            growthChart.destroy();
        }
        
        const ctx = document.getElementById('growthChart').getContext('2d');
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: `${projectName} - Progress %`,
                    data: progressValues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Monthly Progress - ${projectName}`,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Progress: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Progress (%)',
                            font: { weight: 'bold' }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month',
                            font: { weight: 'bold' }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading monthly growth:', error);
        showToast('Failed to load monthly growth data', 'error');
    }
}

function closeGrowthChartModal() {
    document.getElementById('growthChartModal').style.display = 'none';
    if (growthChart) {
        growthChart.destroy();
        growthChart = null;
    }
}

// ========== VIEW PROJECT DETAILS ==========
async function viewProjectDetails(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
        const project = await response.json();
        
        const modalContent = document.getElementById('projectDetailsContent');
        modalContent.innerHTML = `
            <h4><i class="fas fa-info-circle"></i> ${project.projectName}</h4>
            <hr>
            <p><strong>Description:</strong> ${project.description || 'N/A'}</p>
            <p><strong>Budget:</strong> ₹${project.budget ? project.budget.toLocaleString() : 0}</p>
            <p><strong>Start Date:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>End Date:</strong> ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Status:</strong> ${project.status || 'CREATED'}</p>
            <p><strong>Progress:</strong> ${project.progress || 0}%</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
            </div>
            <p><strong>Technology Stack:</strong> ${project.technologyStack || 'N/A'}</p>
            <p><strong>Assigned Manager:</strong> ${project.managerName || 'Not assigned yet'}</p>
            <p><strong>Team Members:</strong> ${project.employeeNames ? project.employeeNames.join(', ') : 'Not assigned yet'}</p>
            <p><strong>Additional Notes:</strong> ${project.additionalNotes || 'N/A'}</p>
            ${project.documents && project.documents.length > 0 ? `
                <p><strong>Documents:</strong></p>
                <ul>
                    ${project.documents.map(doc => `<li><i class="fas fa-file"></i> ${doc}</li>`).join('')}
                </ul>
            ` : ''}
        `;
        
        document.getElementById('projectDetailsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading project details:', error);
        showToast('Failed to load project details', 'error');
    }
}

function closeProjectModal() {
    document.getElementById('projectDetailsModal').style.display = 'none';
}

// ========== PROFILE ==========
async function loadProfile() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`);
        if (!response.ok) throw new Error('Profile not found');
        
        const user = await response.json();
        
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userRole').textContent = user.role;
        document.getElementById('userPhone').textContent = user.phone || 'Not provided';
        
        if (user.registrationDate) {
            document.getElementById('userJoinDate').textContent = new Date(user.registrationDate).toLocaleDateString();
        } else {
            document.getElementById('userJoinDate').textContent = 'N/A';
        }
        
        if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) {
            document.getElementById('profileImg').src = user.profilePhoto;
        } else {
            document.getElementById('profileImg').src = `https://ui-avatars.com/api/?background=667eea&color=fff&size=150&name=${encodeURIComponent(user.name)}`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

// ========== UPLOAD PROFILE PHOTO ==========
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
    
    const userId = sessionStorage.getItem('userId');
    const formData = new FormData();
    formData.append('photo', file);
    
    showToast('Uploading...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/photo/${userId}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('profileImg').src = data.photoUrl;
            showToast('Profile photo updated!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(data.error || 'Failed to upload', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error uploading photo', 'error');
    }
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
        showToast('New passwords do not match!', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }
    
    const userId = sessionStorage.getItem('userId');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, oldPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully! Please login again.', 'success');
            closePasswordModal();
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            showToast(data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Error changing password', 'error');
    }
}

// ========== LOGOUT ==========
function logout() {
    sessionStorage.clear();
    window.location.href = '/';
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    const clientName = sessionStorage.getItem('userName');
    if (clientName) {
        document.getElementById('clientName').textContent = clientName;
        loadMyProjects();
    } else {
        window.location.href = '/';
    }
});