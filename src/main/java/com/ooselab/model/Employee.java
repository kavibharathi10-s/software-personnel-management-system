package com.ooselab.model;

import java.sql.Date;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = "employees")
public class Employee extends User {
    private String employeeId;
    private String designation;
    private String department;
    private Date joinDate;
    private String qualification;
    private List<String> certificateProofs;
    private String managerId;
    private Double salary;
    private Double leaveBalance;
}