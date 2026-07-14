package com.ooselab.service;

import com.ooselab.model.LeaveRequest;
import com.ooselab.model.User;
import com.ooselab.repository.LeaveRepository;
import com.ooselab.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class LeaveService {

    @Autowired
    private LeaveRepository leaveRepository;

    @Autowired
    private UserRepository userRepository;

    // Raise leave request (by Employee)
    public LeaveRequest raiseLeaveRequest(LeaveRequest leaveRequest) {
        leaveRequest.setId(UUID.randomUUID().toString());
        leaveRequest.setStatus("PENDING");
        leaveRequest.setAppliedDate(new Date());
        
        // Calculate number of days
        long diffInMillies = leaveRequest.getEndDate().getTime() - leaveRequest.getStartDate().getTime();
        long days = TimeUnit.DAYS.convert(diffInMillies, TimeUnit.MILLISECONDS) + 1;
        leaveRequest.setNumberOfDays((int) days);
        
        // Get employee name if not set
        if (leaveRequest.getEmployeeName() == null) {
            userRepository.findById(leaveRequest.getEmployeeId()).ifPresent(emp -> {
                leaveRequest.setEmployeeName(emp.getName());
            });
        }
        
        return leaveRepository.save(leaveRequest);
    }

    // Get pending leaves for Manager (FIXED - now properly filters by manager's team)
    public List<LeaveRequest> getPendingLeavesForManager(String managerId) {
        // Get the manager details
        User manager = userRepository.findById(managerId)
            .orElseThrow(() -> new RuntimeException("Manager not found"));
        
        // Get all employees (users with role EMPLOYEE)
        List<User> allEmployees = userRepository.findAll().stream()
            .filter(user -> "EMPLOYEE".equals(user.getRole()))
            .filter(user -> !"TERMINATED".equals(user.getStatus()))
            .collect(Collectors.toList());
        
        // Filter employees under this manager (by managerId field)
        List<User> teamMembers = allEmployees.stream()
            .filter(emp -> managerId.equals(emp.getManagerId()))
            .collect(Collectors.toList());
        
        List<String> employeeIds = teamMembers.stream()
            .map(User::getId)
            .collect(Collectors.toList());
        
        // Get pending leaves for these employees
        List<LeaveRequest> pendingLeaves = leaveRepository.findAll().stream()
            .filter(leave -> "PENDING".equals(leave.getStatus()))
            .filter(leave -> employeeIds.contains(leave.getEmployeeId()))
            .collect(Collectors.toList());
        
        // Add employee names if missing
        for (LeaveRequest leave : pendingLeaves) {
            if (leave.getEmployeeName() == null) {
                userRepository.findById(leave.getEmployeeId()).ifPresent(emp -> {
                    leave.setEmployeeName(emp.getName());
                });
            }
        }
        
        return pendingLeaves;
    }

    // Get all pending leaves (for HR overview)
    public List<LeaveRequest> getAllPendingLeaves() {
        List<LeaveRequest> pendingLeaves = leaveRepository.findByStatus("PENDING");
        
        // Add employee names if missing
        for (LeaveRequest leave : pendingLeaves) {
            if (leave.getEmployeeName() == null) {
                userRepository.findById(leave.getEmployeeId()).ifPresent(emp -> {
                    leave.setEmployeeName(emp.getName());
                });
            }
        }
        
        return pendingLeaves;
    }

    // Approve leave (by Manager)
    public void approveLeave(String leaveId) {
        LeaveRequest leave = leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));
        
        leave.setStatus("APPROVED");
        leave.setReviewedDate(new Date());
        leaveRepository.save(leave);
        
        // Update leave balance for employee
        updateLeaveBalance(leave.getEmployeeId(), leave.getNumberOfDays());
    }

    // Reject leave with reason (by Manager)
    public void rejectLeave(String leaveId, String reason) {
        LeaveRequest leave = leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));
        
        leave.setStatus("REJECTED");
        leave.setRejectionReason(reason);
        leave.setReviewedDate(new Date());
        leaveRepository.save(leave);
    }

    // Update leave balance for employee
    private void updateLeaveBalance(String employeeId, int daysTaken) {
        User employee = userRepository.findById(employeeId).orElse(null);
        if (employee != null) {
            Double currentBalance = employee.getAnnualLeaveBalance() != null ? employee.getAnnualLeaveBalance() : 20.0;
            employee.setAnnualLeaveBalance(currentBalance - daysTaken);
            userRepository.save(employee);
        }
    }

    // Get leaves by Employee ID
    public List<LeaveRequest> getLeavesByEmployee(String employeeId) {
        List<LeaveRequest> leaves = leaveRepository.findByEmployeeId(employeeId);
        
        // Sort by applied date (newest first)
        leaves.sort((a, b) -> b.getAppliedDate().compareTo(a.getAppliedDate()));
        
        return leaves;
    }

    // Get leaves by status
    public List<LeaveRequest> getLeavesByStatus(String status) {
        return leaveRepository.findByStatus(status);
    }

    // Get leave by ID
    public LeaveRequest getLeaveById(String leaveId) {
        return leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));
    }

    // Cancel leave request (by Employee)
    public void cancelLeaveRequest(String leaveId) {
        LeaveRequest leave = leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));
        
        if (!"PENDING".equals(leave.getStatus())) {
            throw new RuntimeException("Cannot cancel leave that is already " + leave.getStatus());
        }
        
        leave.setStatus("CANCELLED");
        leaveRepository.save(leave);
    }

    // Get leave balance for employee
    public Double getLeaveBalance(String employeeId) {
        User employee = userRepository.findById(employeeId).orElse(null);
        if (employee != null && employee.getAnnualLeaveBalance() != null) {
            return employee.getAnnualLeaveBalance();
        }
        
        // Calculate based on approved leaves
        List<LeaveRequest> approvedLeaves = leaveRepository.findByEmployeeId(employeeId).stream()
            .filter(leave -> "APPROVED".equals(leave.getStatus()))
            .collect(Collectors.toList());
        
        int totalDaysTaken = approvedLeaves.stream()
            .mapToInt(LeaveRequest::getNumberOfDays)
            .sum();
        
        // Assuming 20 days annual leave
        return 20.0 - totalDaysTaken;
    }
}