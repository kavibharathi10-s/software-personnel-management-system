package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private String phone;
    private String address;
    private String role; // EMPLOYEE, MANAGER, HR, CLIENT
    private String status; // PENDING, ACTIVE, REJECTED, TERMINATED
    private String profilePhoto;
    private Date registrationDate;
    private String rejectionReason;
    
    // ========== EMPLOYMENT DETAILS ==========
    private Double salary;           // Employee/Manager salary
    private String department;       // Department name
    private String designation;      // Job title/Designation
    private Date joiningDate;        // Date of joining
    private String employeeId;       // Unique employee ID (EMP001, MGR001, etc.)
    
    // ========== PERSONAL DETAILS ==========
    private String qualification;    // Educational qualification
    private String certificateProof; // Path to uploaded certificate
    private String dateOfBirth;      // Date of birth (YYYY-MM-DD)
    private String emergencyContact; // Emergency contact number
    private String bloodGroup;       // Blood group
    private String panNumber;        // PAN card number
    private String aadharNumber;     // Aadhar card number
    
    // ========== ADDRESS DETAILS ==========
    private String permanentAddress; // Permanent address
    private String currentAddress;   // Current address
    private String city;             // City
    private String state;            // State
    private String pincode;          // Pincode
    
    // ========== BANK DETAILS ==========
    private String bankName;         // Bank name
    private String accountNumber;    // Bank account number
    private String ifscCode;         // IFSC code
    
    // ========== PERFORMANCE & REVIEW ==========
    private Double performanceRating; // Performance rating (0-100)
    private String performanceReview; // Performance review comments
    private Date lastReviewDate;      // Last performance review date
    private Integer completedTasks;   // ADDED: Number of completed projects/tasks
    private Integer totalTasks;       // ADDED: Total assigned projects/tasks
    
    // ========== PROJECT & TEAM ==========
    private String managerId;        // ID of the manager (for employees)
    private String projectId;        // Currently assigned project ID
    
    // ========== LEAVE BALANCE ==========
    private Double annualLeaveBalance;  // Annual leave balance
    private Double sickLeaveBalance;    // Sick leave balance
    private Double casualLeaveBalance;  // Casual leave balance

}