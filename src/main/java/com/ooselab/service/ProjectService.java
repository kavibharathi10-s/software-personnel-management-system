package com.ooselab.service;

import com.ooselab.model.Project;
import com.ooselab.model.Task;
import com.ooselab.model.User;
import com.ooselab.repository.ProjectRepository;
import com.ooselab.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Calendar;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    // Create new project (by Client)
    public Project createProject(Project project) {
        project.setId(UUID.randomUUID().toString());
        project.setStatus("CREATED");
        project.setProgress(0);
        project.setDocuments(new ArrayList<>());
        project.setMonthlyProgress(new HashMap<>());
        project.setLastUpdated(new Date());
        return projectRepository.save(project);
    }

    // Assign project to Manager (by HR) - with manager name
    public Map<String, Object> assignToManager(String projectId, String managerId) {
        Map<String, Object> response = new HashMap<>();
        
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        User manager = userRepository.findById(managerId)
            .orElseThrow(() -> new RuntimeException("Manager not found"));
        
        project.setManagerId(managerId);
        project.setManagerName(manager.getName());
        project.setStatus("ASSIGNED_TO_MANAGER");
        project.setLastUpdated(new Date());
        
        // Initialize task list
        if (project.getTasks() == null) project.setTasks(new ArrayList<>());
        
        projectRepository.save(project);
        
        response.put("success", true);
        response.put("message", "Project assigned to " + manager.getName() + " successfully");
        response.put("project", project);
        
        return response;
    }

    // ========== TASK MANAGEMENT (NEW) ==========

    public Task createTask(String projectId, Task task) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
            
        if (project.getTasks() == null) project.setTasks(new ArrayList<>());
        
        // Set employee name if employee ID is provided
        if (task.getAssignedEmployeeId() != null) {
            userRepository.findById(task.getAssignedEmployeeId()).ifPresent(e -> task.setEmployeeName(e.getName()));
        }
        
        task.setProjectId(projectId);
        project.getTasks().add(task);
        
        // Update project team if not already in list
        if (task.getAssignedEmployeeId() != null) {
            if (project.getEmployeeIds() == null) project.setEmployeeIds(new ArrayList<>());
            if (project.getEmployeeNames() == null) project.setEmployeeNames(new ArrayList<>());
            
            if (!project.getEmployeeIds().contains(task.getAssignedEmployeeId())) {
                project.getEmployeeIds().add(task.getAssignedEmployeeId());
                project.getEmployeeNames().add(task.getEmployeeName());
            }
        }
        
        updateProjectStats(project);
        projectRepository.save(project);
        
        // Trigger rating update for assigned employee
        if (task.getAssignedEmployeeId() != null) {
            userService.calculateAndSetRating(task.getAssignedEmployeeId());
        }
        
        return task;
    }

    public void updateProjectStats(Project project) {
        if (project.getTasks() == null || project.getTasks().isEmpty()) {
            project.setTotalTasks(0);
            project.setCompletedTasks(0);
            project.setProgress(0);
            return;
        }
        
        int total = project.getTasks().size();
        
        // Use average of progress percentages instead of just counting "Completed"
        double totalProgressSum = project.getTasks().stream()
            .mapToDouble(t -> t.getProgressPercentage() != null ? t.getProgressPercentage() : 0)
            .sum();
            
        long completedCount = project.getTasks().stream()
            .filter(t -> t.getProgressPercentage() != null && t.getProgressPercentage() >= 100)
            .count();
            
        project.setTotalTasks(total);
        project.setCompletedTasks((int)completedCount);
        
        // Calculate project progress as average of task progress
        double avgProgress = totalProgressSum / total;
        project.setProgress((int)avgProgress);
        
        // Update status based on progress
        if (project.getProgress() >= 100) {
            project.setStatus("COMPLETED");
        } else if (project.getProgress() > 0) {
            project.setStatus("IN_PROGRESS");
        }
        
        // Update monthly progress for charts
        if (project.getMonthlyProgress() == null) project.setMonthlyProgress(new HashMap<>());
        String month = Calendar.getInstance().getDisplayName(Calendar.MONTH, Calendar.LONG, java.util.Locale.ENGLISH);
        project.getMonthlyProgress().put(month, project.getProgress());
        
        project.setLastUpdated(new Date());
    }

    public void updateTaskWork(String projectId, String taskId, Integer progress, MultipartFile file) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
            
        if (project.getTasks() == null) throw new RuntimeException("Project has no tasks");
        
        Task task = project.getTasks().stream()
            .filter(t -> t.getId().equals(taskId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Task not found"));
            
        // Update status and progress
        if (progress != null) {
            task.setProgressPercentage(progress);
            if (progress >= 100) task.setStatus("Completed");
            else if (progress > 0) task.setStatus("In Progress");
        }
        
        // Handle file upload for task
        if (file != null && !file.isEmpty()) {
            try {
                String uploadDir = "uploads/tasks/";
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
                
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Files.write(uploadPath.resolve(fileName), file.getBytes());
                task.setUploadedFile("/uploads/tasks/" + fileName);
            } catch (IOException e) {
                throw new RuntimeException("File upload failed: " + e.getMessage());
            }
        }
        
        updateProjectStats(project);
        projectRepository.save(project);
        
        // Trigger rating update for assigned employee
        if (task.getAssignedEmployeeId() != null) {
            userService.calculateAndSetRating(task.getAssignedEmployeeId());
        }
        
        // Trigger rating update for project manager
        if (project.getManagerId() != null) {
            userService.calculateAndSetRating(project.getManagerId());
        }
    }

    // Assign project to Employee (by Manager) - with employee names
    public Map<String, Object> assignToEmployee(String projectId, String employeeId) {
        Map<String, Object> response = new HashMap<>();
        
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        User employee = userRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));
        
        List<String> employeeIds = project.getEmployeeIds();
        List<String> employeeNames = project.getEmployeeNames();
        
        if (employeeIds == null) {
            employeeIds = new ArrayList<>();
            employeeNames = new ArrayList<>();
        }
        
        if (!employeeIds.contains(employeeId)) {
            employeeIds.add(employeeId);
            employeeNames.add(employee.getName());
        }
        
        project.setEmployeeIds(employeeIds);
        project.setEmployeeNames(employeeNames);
        project.setStatus("ASSIGNED_TO_EMPLOYEE");
        project.setLastUpdated(new Date());
        projectRepository.save(project);
        
        response.put("success", true);
        response.put("message", "Project assigned to " + employee.getName() + " successfully");
        response.put("project", project);
        
        return response;
    }

    // Update project progress with monthly tracking
    public Map<String, Object> updateProjectProgress(String projectId, int progress, String status) {
        Map<String, Object> response = new HashMap<>();
        
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        project.setProgress(progress);
        project.setStatus(status);
        project.setLastUpdated(new Date());
        
        // Track monthly progress
        Calendar cal = Calendar.getInstance();
        String monthYear = (cal.get(Calendar.MONTH) + 1) + "/" + cal.get(Calendar.YEAR);
        
        if (project.getMonthlyProgress() == null) {
            project.setMonthlyProgress(new HashMap<>());
        }
        project.getMonthlyProgress().put(monthYear, progress);
        
        if (status.equals("COMPLETED")) {
            project.setEndDate(new Date());
        }
        
        projectRepository.save(project);
        
        response.put("success", true);
        response.put("message", "Progress updated to " + progress + "%");
        response.put("project", project);
        
        return response;
    }

    // Get complete project overview with details
    public Map<String, Object> getProjectOverview(String projectId) {
        Project project = getProjectById(projectId);
        Map<String, Object> overview = new HashMap<>();
        
        overview.put("id", project.getId());
        overview.put("projectName", project.getProjectName());
        overview.put("description", project.getDescription());
        overview.put("clientName", project.getClientName());
        overview.put("managerName", project.getManagerName());
        overview.put("employeeNames", project.getEmployeeNames());
        overview.put("status", project.getStatus());
        overview.put("progress", project.getProgress());
        overview.put("budget", project.getBudget());
        overview.put("startDate", project.getStartDate());
        overview.put("endDate", project.getEndDate());
        overview.put("technologyStack", project.getTechnologyStack());
        overview.put("additionalNotes", project.getAdditionalNotes());
        overview.put("monthlyProgress", project.getMonthlyProgress());
        overview.put("documents", project.getDocuments());
        overview.put("lastUpdated", project.getLastUpdated());
        
        // Calculate days remaining
        if (project.getEndDate() != null && project.getStartDate() != null) {
            long totalDays = (project.getEndDate().getTime() - project.getStartDate().getTime()) / (1000 * 60 * 60 * 24);
            long daysPassed = (new Date().getTime() - project.getStartDate().getTime()) / (1000 * 60 * 60 * 24);
            overview.put("totalDays", totalDays);
            overview.put("daysPassed", daysPassed);
            overview.put("daysRemaining", Math.max(0, totalDays - daysPassed));
        }
        
        return overview;
    }

    // Get projects by manager with details
    public List<Map<String, Object>> getProjectsByManagerWithDetails(String managerId) {
        List<Project> projects = getProjectsByManager(managerId);
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (Project project : projects) {
            Map<String, Object> projectMap = new HashMap<>();
            projectMap.put("id", project.getId());
            projectMap.put("projectName", project.getProjectName());
            projectMap.put("description", project.getDescription());
            projectMap.put("clientName", project.getClientName());
            projectMap.put("status", project.getStatus());
            projectMap.put("progress", project.getProgress());
            projectMap.put("budget", project.getBudget());
            projectMap.put("startDate", project.getStartDate());
            projectMap.put("endDate", project.getEndDate());
            projectMap.put("employeeNames", project.getEmployeeNames());
            projectMap.put("monthlyProgress", project.getMonthlyProgress());
            result.add(projectMap);
        }
        
        return result;
    }

    // Upload project files (by Employee)
    // Upload project files (by Employee)
public void uploadProjectFiles(String projectId, MultipartFile[] files) {
    try {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        // Create upload directory if not exists
        String uploadDir = "uploads/projects/";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        
        List<String> documents = project.getDocuments();
        if (documents == null) {
            documents = new ArrayList<>();
        }
        
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                // Generate unique filename
                String originalFileName = file.getOriginalFilename();
                String fileExtension = "";
                if (originalFileName != null && originalFileName.contains(".")) {
                    fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
                }
                String fileName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + fileExtension;
                
                // Save file
                Path filePath = uploadPath.resolve(fileName);
                Files.write(filePath, file.getBytes());
                
                // Store file path in documents list
                documents.add("/uploads/projects/" + fileName);
                System.out.println("File saved: " + filePath.toString());
            }
        }
        
        project.setDocuments(documents);
        project.setStatus("IN_PROGRESS");
        project.setLastUpdated(new Date());
        projectRepository.save(project);
        
    } catch (IOException e) {
        e.printStackTrace();
        throw new RuntimeException("Failed to upload files: " + e.getMessage());
    }
}

    // Update project status (by Employee)
    public void updateProjectStatus(String projectId, String status) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        project.setStatus(status);
        project.setLastUpdated(new Date());
        
        switch(status) {
            case "IN_PROGRESS":
                project.setProgress(50);
                break;
            case "COMPLETED":
                project.setProgress(100);
                project.setEndDate(new Date());
                break;
        }
        
        projectRepository.save(project);
    }

    // Get monthly project growth for chart
    public Map<String, Object> getMonthlyProjectGrowth(String projectId) {
        Project project = getProjectById(projectId);
        Map<String, Object> result = new HashMap<>();
        
        result.put("projectName", project.getProjectName());
        result.put("monthlyProgress", project.getMonthlyProgress());
        result.put("currentProgress", project.getProgress());
        
        return result;
    }

    // Get all projects with manager names
    public List<Project> getAllProjectsWithDetails() {
        List<Project> projects = projectRepository.findAll();
        for (Project project : projects) {
            if (project.getManagerId() != null) {
                userRepository.findById(project.getManagerId()).ifPresent(manager -> {
                    project.setManagerName(manager.getName());
                });
            }
        }
        return projects;
    }

    // Get projects by Employee ID with details
    public List<Project> getProjectsByEmployee(String employeeId) {
        return projectRepository.findByEmployeeIdsContaining(employeeId);
    }

    // Get projects by Manager ID with details
    public List<Project> getProjectsByManager(String managerId) {
        List<Project> projects = projectRepository.findByManagerId(managerId);
        for (Project project : projects) {
            if (project.getManagerId() != null) {
                userRepository.findById(project.getManagerId()).ifPresent(manager -> {
                    project.setManagerName(manager.getName());
                });
            }
        }
        return projects;
    }

    // Get projects by Client ID
    public List<Project> getProjectsByClient(String clientId) {
        return projectRepository.findByClientId(clientId);
    }

    // Get project by ID
    public Project getProjectById(String projectId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        
        if (project.getManagerId() != null) {
            userRepository.findById(project.getManagerId()).ifPresent(manager -> {
                project.setManagerName(manager.getName());
            });
        }
        
        return project;
    }

    // Get all projects (for HR)
    public List<Project> getAllProjects() {
        return getAllProjectsWithDetails();
    }

    // Get projects by status
    public List<Project> getProjectsByStatus(String status) {
        return projectRepository.findByStatus(status);
    }

    // Track project progress
    public Integer getProjectProgress(String projectId) {
        Project project = getProjectById(projectId);
        return project.getProgress();
    }

    // Generate performance report
    public String generatePerformanceReport(String projectId) {
        Project project = getProjectById(projectId);
        
        StringBuilder report = new StringBuilder();
        report.append("=== PROJECT PERFORMANCE REPORT ===\n");
        report.append("Project Name: ").append(project.getProjectName()).append("\n");
        report.append("Status: ").append(project.getStatus()).append("\n");
        report.append("Progress: ").append(project.getProgress()).append("%\n");
        report.append("Client: ").append(project.getClientName()).append("\n");
        report.append("Manager: ").append(project.getManagerName() != null ? project.getManagerName() : "Not assigned").append("\n");
        report.append("Start Date: ").append(project.getStartDate()).append("\n");
        report.append("End Date: ").append(project.getEndDate() != null ? project.getEndDate() : "In Progress").append("\n");
        
        if (project.getMonthlyProgress() != null && !project.getMonthlyProgress().isEmpty()) {
            report.append("\nMonthly Progress:\n");
            for (Map.Entry<String, Integer> entry : project.getMonthlyProgress().entrySet()) {
                report.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("%\n");
            }
        }
        
        return report.toString();
    }
    
    // Update project (for progress updates)
    public Project updateProject(Project project) {
        project.setLastUpdated(new Date());
        return projectRepository.save(project);
    }
}