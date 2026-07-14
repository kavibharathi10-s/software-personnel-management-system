package com.ooselab.controller;

import com.ooselab.model.Payroll;
import com.ooselab.service.PayrollService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll")
@CrossOrigin(origins = "*")
public class PayrollController {

    @Autowired
    private PayrollService payrollService;

    // Process Manager Salary (by HR)
    @PostMapping("/process/manager")
    public ResponseEntity<?> processManagerSalary(@RequestBody Payroll payroll) {
        try {
            Map<String, Object> result = payrollService.processManagerSalary(payroll);
            if ((boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Process Employee Salary (by Manager)
    @PostMapping("/process/employee")
    public ResponseEntity<?> processEmployeeSalary(@RequestBody Payroll payroll, @RequestParam String managerId) {
        try {
            Map<String, Object> result = payrollService.processEmployeeSalary(payroll, managerId);
            if ((boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Get payslip by user, month, year
    @GetMapping("/payslip/{userId}/{month}/{year}")
    public ResponseEntity<?> getPayslip(@PathVariable String userId, @PathVariable String month, @PathVariable Integer year) {
        try {
            Payroll payroll = payrollService.getPayslip(userId, month, year);
            if (payroll != null) {
                return ResponseEntity.ok(payroll);
            } else {
                return ResponseEntity.ok(Map.of("message", "No payslip found for " + month + " " + year));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== NEW ENDPOINT: Get payslip by ID (for HR to view manager payslips) ==========
    @GetMapping("/payslip/{payrollId}")
    public ResponseEntity<?> getPayslipById(@PathVariable String payrollId) {
        try {
            Payroll payroll = payrollService.getPayslipById(payrollId);
            return ResponseEntity.ok(payroll);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Get payslip text for download
    @GetMapping("/payslip/download/{payrollId}")
    public ResponseEntity<?> downloadPayslip(@PathVariable String payrollId) {
        try {
            String payslipText = payrollService.getPayslipText(payrollId);
            return ResponseEntity.ok()
                .header("Content-Type", "text/plain")
                .header("Content-Disposition", "attachment; filename=payslip_" + payrollId + ".txt")
                .body(payslipText);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Get payroll history for user
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<Payroll>> getPayrollHistory(@PathVariable String userId) {
        return ResponseEntity.ok(payrollService.getPayrollHistory(userId));
    }

    // Get all payroll records
    @GetMapping("/all")
    public ResponseEntity<List<Payroll>> getAllPayroll() {
        return ResponseEntity.ok(payrollService.getAllPayroll());
    }

    // Get manager payments (for HR)
    @GetMapping("/manager-payments")
    public ResponseEntity<List<Payroll>> getManagerPayments() {
        return ResponseEntity.ok(payrollService.getPayrollByRole("MANAGER"));
    }

    // Get employee payments for a manager
    @GetMapping("/manager/{managerId}")
    public ResponseEntity<List<Payroll>> getPayrollByManager(@PathVariable String managerId) {
        return ResponseEntity.ok(payrollService.getPayrollByManager(managerId));
    }

    // Get payroll by role
    @GetMapping("/role/{role}")
    public ResponseEntity<List<Payroll>> getPayrollByRole(@PathVariable String role) {
        return ResponseEntity.ok(payrollService.getPayrollByRole(role));
    }
}