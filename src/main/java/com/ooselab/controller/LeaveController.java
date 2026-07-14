package com.ooselab.controller;

import com.ooselab.model.LeaveRequest;
import com.ooselab.service.LeaveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaves")
@CrossOrigin(origins = "*")
public class LeaveController {

    @Autowired
    private LeaveService leaveService;

    @PostMapping("/raise")
    public ResponseEntity<?> raiseLeave(@RequestBody LeaveRequest leaveRequest) {
        LeaveRequest saved = leaveService.raiseLeaveRequest(leaveRequest);
        return ResponseEntity.ok("Leave request submitted successfully");
    }

    @GetMapping("/pending/{managerId}")
    public ResponseEntity<List<LeaveRequest>> getPendingLeaves(@PathVariable String managerId) {
        return ResponseEntity.ok(leaveService.getPendingLeavesForManager(managerId));
    }

    @PostMapping("/approve/{leaveId}")
    public ResponseEntity<?> approveLeave(@PathVariable String leaveId) {
        leaveService.approveLeave(leaveId);
        return ResponseEntity.ok("Leave approved successfully");
    }

    @PostMapping("/reject/{leaveId}")
    public ResponseEntity<?> rejectLeave(@PathVariable String leaveId, @RequestBody Map<String, String> request) {
        String reason = request.get("reason");
        leaveService.rejectLeave(leaveId, reason);
        return ResponseEntity.ok("Leave rejected with reason");
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveRequest>> getEmployeeLeaves(@PathVariable String employeeId) {
        return ResponseEntity.ok(leaveService.getLeavesByEmployee(employeeId));
    }
}