package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "leaves")
public class LeaveRequest {
    @Id
    private String id;
    private String employeeId;
    private String employeeName;
    private String leaveType; // SICK, CASUAL, ANNUAL, OTHER
    private Date startDate;
    private Date endDate;
    private Integer numberOfDays;
    private String reason;
    private String status; // PENDING, APPROVED, REJECTED, CANCELLED
    private String rejectionReason;
    private Date appliedDate;
    private Date reviewedDate;
    private String reviewedBy; // managerId
}