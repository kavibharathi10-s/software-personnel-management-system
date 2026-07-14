package com.ooselab.model;

import lombok.Data;
import java.util.Date;
import java.util.UUID;

@Data
public class Task {
    private String id = UUID.randomUUID().toString();
    private String projectId;
    private String taskName;
    private String assignedEmployeeId;
    private String employeeName;
    private String status = "Pending"; // Pending / In Progress / Completed
    private Date deadline;
    private String uploadedFile; // ADDED: File path or reference
    private Integer progressPercentage = 0; // ADDED: 0-100
}
