package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "projects")
public class Project {
    @Id
    private String id;
    private String projectName;
    private String description;
    private String clientId;
    private String clientName;
    private Date startDate;
    private Date endDate;
    private String status; // CREATED, PENDING, ASSIGNED_TO_MANAGER, ASSIGNED_TO_EMPLOYEE, IN_PROGRESS, COMPLETED, CLOSED
    private String managerId;
    private String managerName; // Store manager name for display
    private List<String> employeeIds;
    private List<String> employeeNames; // Store employee names for display
    private List<Task> tasks; // ADDED: Nested tasks
    private Double budget;
    private Integer progress; // 0-100
    private Integer completedTasks; // ADDED: Specific task count
    private Integer totalTasks;     // ADDED: Specific task count
    private List<String> documents;
    
    // NEW FIELDS
    private Map<String, Integer> monthlyProgress; // Track progress per month (e.g., "1/2024": 50)
    private String technologyStack; // Technology used in project
    private String additionalNotes; // Additional notes from client
    private Date lastUpdated; // Last updated timestamp
    private String priority; // HIGH, MEDIUM, LOW
    private String category; // Web, Mobile, Desktop, etc.
}