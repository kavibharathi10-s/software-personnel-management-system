package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "payroll")
public class Payroll {
    @Id
    private String id;
    private String userId;
    private String userName;
    private String role; // EMPLOYEE, MANAGER
    private String month;
    private Integer year;
    private Double basicSalary;
    private Double allowances;
    private Double deductions;
    private Double netSalary;
    private Double performanceRating; // Standardized rating (0-100) at time of processing
    private String status; // PENDING, PROCESSED, PAID, FAILED
    private Date processedDate;
    private String paymentMode;
    private String payslipUrl;
}