package com.ooselab.controller;

import com.ooselab.model.Project;
import com.ooselab.model.Task;
import com.ooselab.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    // ========== TASK MANAGEMENT (NEW) ==========

    @PostMapping("/{projectId}/tasks")
    public ResponseEntity<?> createTask(@PathVariable String projectId, @RequestBody Task task) {
        try {
            Task created = projectService.createTask(projectId, task);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{projectId}/tasks/{taskId}/work")
    public ResponseEntity<?> updateTaskWork(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @RequestParam(required = false) Integer progress,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            projectService.updateTaskWork(projectId, taskId, progress, file);
            return ResponseEntity.ok(Map.of("message", "Task work updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== CREATE PROJECT ==========
    @PostMapping("/create")
    public ResponseEntity<?> createProject(@RequestBody Project project) {
        try {
            Project saved = projectService.createProject(project);
            return ResponseEntity.ok(Map.of("message", "Project created successfully", "project", saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== GET ALL PROJECTS ==========
    @GetMapping("/all")
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    // ========== GET PROJECTS BY CLIENT ==========
    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<Project>> getProjectsByClient(@PathVariable String clientId) {
        return ResponseEntity.ok(projectService.getProjectsByClient(clientId));
    }
    // ========== GET PROJECTS BY MANAGER ==========
    @GetMapping("/manager/{managerId}")
    public ResponseEntity<List<Project>> getProjectsByManager(@PathVariable String managerId) {
        return ResponseEntity.ok(projectService.getProjectsByManager(managerId));
    }

    // ========== GET PROJECTS BY EMPLOYEE ==========
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Project>> getProjectsByEmployee(@PathVariable String employeeId) {
        return ResponseEntity.ok(projectService.getProjectsByEmployee(employeeId));
    }

    // ========== ASSIGN PROJECT TO MANAGER (WITH RESPONSE) ==========
    @PostMapping("/assign/manager")
    public ResponseEntity<?> assignToManager(@RequestParam String projectId, @RequestParam String managerId) {
        try {
            Map<String, Object> result = projectService.assignToManager(projectId, managerId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== ASSIGN PROJECT TO EMPLOYEE (WITH RESPONSE) ==========
    @PostMapping("/assign/employee")
    public ResponseEntity<?> assignToEmployee(@RequestParam String projectId, @RequestParam String employeeId) {
        try {
            Map<String, Object> result = projectService.assignToEmployee(projectId, employeeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== GET PROJECT OVERVIEW (NEW) ==========
    @GetMapping("/overview/{projectId}")
    public ResponseEntity<?> getProjectOverview(@PathVariable String projectId) {
        try {
            Map<String, Object> overview = projectService.getProjectOverview(projectId);
            return ResponseEntity.ok(overview);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== GET PROJECTS BY MANAGER WITH DETAILS (NEW) ==========
    @GetMapping("/manager-details/{managerId}")
    public ResponseEntity<?> getProjectsByManagerWithDetails(@PathVariable String managerId) {
        try {
            List<Map<String, Object>> projects = projectService.getProjectsByManagerWithDetails(managerId);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== UPDATE PROJECT PROGRESS ==========
    @PutMapping("/update-progress/{projectId}")
    public ResponseEntity<?> updateProjectProgress(@PathVariable String projectId, @RequestBody Map<String, Object> update) {
        try {
            int progress = (Integer) update.get("progress");
            String status = (String) update.get("status");
            
            Map<String, Object> result = projectService.updateProjectProgress(projectId, progress, status);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== GET MONTHLY PROJECT GROWTH ==========
    @GetMapping("/monthly-growth/{projectId}")
    public ResponseEntity<?> getMonthlyProjectGrowth(@PathVariable String projectId) {
        try {
            Map<String, Object> growth = projectService.getMonthlyProjectGrowth(projectId);
            return ResponseEntity.ok(growth);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== UPLOAD PROJECT FILES ==========
    @PostMapping("/upload/{projectId}")
    public ResponseEntity<?> uploadFiles(@PathVariable String projectId, @RequestParam("files") MultipartFile[] files) {
        try {
            projectService.uploadProjectFiles(projectId, files);
            return ResponseEntity.ok(Map.of("message", "Files uploaded successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== UPDATE PROJECT STATUS ==========
    @PutMapping("/status/{projectId}")
    public ResponseEntity<?> updateStatus(@PathVariable String projectId, @RequestParam String status) {
        try {
            projectService.updateProjectStatus(projectId, status);
            return ResponseEntity.ok(Map.of("message", "Status updated to: " + status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== GET PROJECTS BY STATUS ==========
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Project>> getProjectsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(projectService.getProjectsByStatus(status));
    }

    // ========== GENERATE PERFORMANCE REPORT ==========
    @GetMapping("/performance-report/{projectId}")
    public ResponseEntity<?> generatePerformanceReport(@PathVariable String projectId) {
        try {
            String report = projectService.generatePerformanceReport(projectId);
            return ResponseEntity.ok(Map.of("report", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
@GetMapping("/{projectId}")
public ResponseEntity<Project> getProjectById(@PathVariable String projectId) {
    return ResponseEntity.ok(projectService.getProjectById(projectId));
}
}