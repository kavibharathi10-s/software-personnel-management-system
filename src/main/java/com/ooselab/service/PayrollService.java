package com.ooselab.service;

import com.ooselab.model.Payroll;
import com.ooselab.model.User;
import com.ooselab.repository.PayrollRepository;
import com.ooselab.repository.UserRepository;
import com.ooselab.repository.ProjectRepository;
import com.ooselab.model.Project;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;
import java.util.Date;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
import com.ooselab.service.UserService;

@Service
public class PayrollService {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private UserService userService;

    // Process Manager Salary (by HR)
    public Map<String, Object> processManagerSalary(Payroll payroll) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate user exists
            User manager = userRepository.findById(payroll.getUserId())
                .orElseThrow(() -> new RuntimeException("Manager not found"));
            
            // Set payroll details
            payroll.setId(UUID.randomUUID().toString());
            payroll.setStatus("PROCESSED");
            payroll.setProcessedDate(new Date());
            payroll.setRole("MANAGER");
            payroll.setUserName(manager.getName());
            
            // Calculate Manager Performance using standardized rating
            User managerWithRating = userService.calculateAndSetRating(manager.getId());
            double managerRating = managerWithRating.getPerformanceRating() != null ? managerWithRating.getPerformanceRating() : 0;
            
            double basicSalary = payroll.getBasicSalary() != null ? payroll.getBasicSalary() : 0;
            
            // Standardized Increment Logic: >=80 (10%), >=60 (5%), <60 (0%)
            double increment = 0;
            if (managerRating >= 80) increment = 0.10;
            else if (managerRating >= 60) increment = 0.05;
            
            basicSalary = Math.round(basicSalary * (1 + increment));
            payroll.setBasicSalary(basicSalary);
            payroll.setPerformanceRating(managerRating);
            
            double allowances = payroll.getAllowances() != null ? payroll.getAllowances() : 0;
            double deductions = payroll.getDeductions() != null ? payroll.getDeductions() : 0;
            double netSalary = basicSalary + allowances - deductions;
            payroll.setNetSalary(netSalary);
            
            // Generate payslip
            String payslipUrl = generatePayslip(payroll);
            payroll.setPayslipUrl(payslipUrl);
            
            Payroll saved = payrollRepository.save(payroll);
            
            response.put("success", true);
            response.put("message", "Manager salary processed successfully");
            response.put("payroll", saved);
            response.put("netSalary", netSalary);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to process salary: " + e.getMessage());
        }
        
        return response;
    }

    // Process Employee Salary (by Manager)
    public Map<String, Object> processEmployeeSalary(Payroll payroll, String managerId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Verify employee exists
            User employee = userRepository.findById(payroll.getUserId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));
            
            // Verify manager exists
            User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));
            
            // Set payroll details
            payroll.setId(UUID.randomUUID().toString());
            payroll.setStatus("PROCESSED");
            payroll.setProcessedDate(new Date());
            payroll.setRole("EMPLOYEE");
            payroll.setUserName(employee.getName());
            
            // Calculate Employee Performance using standardized rating
            User employeeWithRating = userService.calculateAndSetRating(employee.getId());
            double employeeRating = employeeWithRating.getPerformanceRating() != null ? employeeWithRating.getPerformanceRating() : 0;
            
            double basicSalary = payroll.getBasicSalary() != null ? payroll.getBasicSalary() : 0;
            
            // Standardized Increment Logic: >=80 (10%), >=60 (5%), <60 (0%)
            double incRate = 0;
            if (employeeRating >= 80) incRate = 0.10;
            else if (employeeRating >= 60) incRate = 0.05;
            
            basicSalary = Math.round(basicSalary * (1 + incRate));
            payroll.setBasicSalary(basicSalary);
            payroll.setPerformanceRating(employeeRating);
            
            double allowances = payroll.getAllowances() != null ? payroll.getAllowances() : 0;
            double deductions = payroll.getDeductions() != null ? payroll.getDeductions() : 0;
            double netSalary = basicSalary + allowances - deductions;
            payroll.setNetSalary(netSalary);
            
            // Generate payslip
            String payslipUrl = generatePayslip(payroll);
            payroll.setPayslipUrl(payslipUrl);
            
            Payroll saved = payrollRepository.save(payroll);
            
            response.put("success", true);
            response.put("message", "Employee salary processed successfully");
            response.put("payroll", saved);
            response.put("netSalary", netSalary);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to process salary: " + e.getMessage());
        }
        
        return response;
    }

    // Get payslip by user, month, year
    public Payroll getPayslip(String userId, String month, Integer year) {
        List<Payroll> payrolls = payrollRepository.findByUserId(userId);
        
        // Also try to get by role if not found
        if (payrolls.isEmpty()) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                payrolls = payrollRepository.findByRole(user.getRole());
            }
        }
        
        return payrolls.stream()
            .filter(p -> p.getMonth() != null && p.getMonth().equalsIgnoreCase(month) && p.getYear().equals(year))
            .findFirst()
            .orElse(null);
    }

    // ========== NEW METHOD: Get payslip by ID (for HR to view manager payslips) ==========
    public Payroll getPayslipById(String payrollId) {
        return payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payslip not found with ID: " + payrollId));
    }

    // Get payroll history for user
    public List<Payroll> getPayrollHistory(String userId) {
        List<Payroll> payrolls = payrollRepository.findByUserId(userId);
        
        // Sort by date (newest first)
        payrolls.sort((a, b) -> b.getProcessedDate().compareTo(a.getProcessedDate()));
        
        return payrolls;
    }

    // Get all payroll records for manager dashboard
    public List<Payroll> getPayrollByManager(String managerId) {
        // Get all employees under this manager
        List<User> employees = userRepository.findAll().stream()
            .filter(user -> "EMPLOYEE".equals(user.getRole()))
            .filter(user -> managerId.equals(user.getManagerId()))
            .collect(java.util.stream.Collectors.toList());
        
        List<String> employeeIds = employees.stream()
            .map(User::getId)
            .collect(java.util.stream.Collectors.toList());
        
        return payrollRepository.findByUserIdIn(employeeIds);
    }

    // Generate payslip (internal method)
    private String generatePayslip(Payroll payroll) {
        User user = userRepository.findById(payroll.getUserId()).orElse(null);
        
        StringBuilder payslip = new StringBuilder();
        payslip.append("╔══════════════════════════════════════════════════════════════╗\n");
        payslip.append("║                    📄 PAYSLIP                                ║\n");
        payslip.append("╠══════════════════════════════════════════════════════════════╣\n");
        payslip.append("║ Month: ").append(payroll.getMonth()).append(" ").append(payroll.getYear()).append("\n");
        payslip.append("║ Employee: ").append(user != null ? user.getName() : "Unknown").append("\n");
        payslip.append("║ Role: ").append(payroll.getRole()).append("\n");
        payslip.append("╠══════════════════════════════════════════════════════════════╣\n");
        payslip.append("║ Basic Salary: ₹").append(payroll.getBasicSalary()).append("\n");
        payslip.append("║ Allowances:   ₹").append(payroll.getAllowances() != null ? payroll.getAllowances() : 0).append("\n");
        payslip.append("║ Deductions:   ₹").append(payroll.getDeductions() != null ? payroll.getDeductions() : 0).append("\n");
        payslip.append("╠══════════════════════════════════════════════════════════════╣\n");
        payslip.append("║ NET SALARY:   ₹").append(payroll.getNetSalary()).append("\n");
        payslip.append("╠══════════════════════════════════════════════════════════════╣\n");
        payslip.append("║ Status: ").append(payroll.getStatus()).append("\n");
        payslip.append("║ Date: ").append(payroll.getProcessedDate()).append("\n");
        payslip.append("╚══════════════════════════════════════════════════════════════╝\n");
        
        // Store payslip text for download
        return payslip.toString();
    }

    // Get payslip text for download
    public String getPayslipText(String payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payslip not found"));
        return payroll.getPayslipUrl();
    }

    // Mark payment as PAID
    public void markAsPaid(String payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payroll record not found"));
        
        payroll.setStatus("PAID");
        payrollRepository.save(payroll);
    }

    // Mark payment as FAILED
    public void markAsFailed(String payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payroll record not found"));
        
        payroll.setStatus("FAILED");
        payrollRepository.save(payroll);
    }

    // Get all payroll records for a specific month
    public List<Payroll> getMonthlyPayroll(String month, Integer year) {
        return payrollRepository.findByMonthAndYear(month, year);
    }

    // Get payroll by role
    public List<Payroll> getPayrollByRole(String role) {
        return payrollRepository.findByRole(role);
    }

    // Get all payroll records
    public List<Payroll> getAllPayroll() {
        return payrollRepository.findAll();
    }

    // Calculate total payroll for month
    public Double calculateTotalPayroll(String month, Integer year) {
        List<Payroll> payrolls = getMonthlyPayroll(month, year);
        
        return payrolls.stream()
            .filter(p -> "PAID".equals(p.getStatus()) || "PROCESSED".equals(p.getStatus()))
            .mapToDouble(Payroll::getNetSalary)
            .sum();
    }

    // Generate payroll report
    public String generatePayrollReport(String month, Integer year) {
        List<Payroll> payrolls = getMonthlyPayroll(month, year);
        
        StringBuilder report = new StringBuilder();
        report.append("=== PAYROLL REPORT - ").append(month).append(" ").append(year).append(" ===\n\n");
        
        double total = 0;
        
        for (Payroll p : payrolls) {
            User user = userRepository.findById(p.getUserId()).orElse(null);
            report.append("Name: ").append(user != null ? user.getName() : "Unknown").append("\n");
            report.append("Role: ").append(p.getRole()).append("\n");
            report.append("Net Salary: ₹").append(p.getNetSalary()).append("\n");
            report.append("Status: ").append(p.getStatus()).append("\n");
            report.append("------------------------\n");
            
            total += p.getNetSalary();
        }
        
        report.append("\nTOTAL PAYROLL: ₹").append(total);
        
        return report.toString();
    }
}