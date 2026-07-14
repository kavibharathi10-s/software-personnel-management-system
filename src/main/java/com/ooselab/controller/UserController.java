package com.ooselab.controller;

import com.ooselab.model.User;
import com.ooselab.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/pending")
    public ResponseEntity<List<User>> getPendingRequests() {
        return ResponseEntity.ok(userService.getPendingUsers());
    }

    @PostMapping("/approve/{userId}")
    public ResponseEntity<?> approveUser(@PathVariable String userId) {
        try {
            User user = userService.approveUser(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User approved successfully");
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/approve-with-manager/{userId}")
    public ResponseEntity<?> approveUserWithManager(@PathVariable String userId, @RequestBody Map<String, String> request) {
        try {
            String managerId = request.get("managerId");
            User user = userService.approveUserWithManager(userId, managerId);
            return ResponseEntity.ok(Map.of("message", "User approved", "user", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reject/{userId}")
    public ResponseEntity<?> rejectUser(@PathVariable String userId, @RequestBody Map<String, String> request) {
        try {
            String reason = request.get("reason");
            userService.rejectUser(userId, reason);
            return ResponseEntity.ok(Map.of("message", "User rejected"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> addEmployee(@RequestBody User user) {
        try {
            User newUser = userService.addUser(user);
            return ResponseEntity.ok(Map.of("message", "Employee added", "user", newUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/remove/{userId}")
    public ResponseEntity<?> removeUser(@PathVariable String userId, @RequestBody Map<String, String> request) {
        try {
            String reason = request.get("reason");
            userService.removeUser(userId, reason);
            return ResponseEntity.ok(Map.of("message", "User terminated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/workers")
    public ResponseEntity<List<User>> getAllWorkers() {
        return ResponseEntity.ok(userService.getAllWorkersExceptDefaultHR());
    }

    @PutMapping("/update-position-salary/{userId}")
    public ResponseEntity<?> updateEmployeePositionAndSalary(@PathVariable String userId, @RequestBody Map<String, Object> details) {
        try {
            Double salary = details.containsKey("salary") ? Double.parseDouble(details.get("salary").toString()) : null;
            String designation = (String) details.get("designation");
            User user = userService.updateEmployeePositionAndSalary(userId, salary, designation);
            return ResponseEntity.ok(Map.of("message", "Updated", "user", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/update-salary/{userId}")
    public ResponseEntity<?> updateSalary(@PathVariable String userId, @RequestBody Map<String, Object> details) {
        try {
            Double salary = Double.parseDouble(details.get("salary").toString());
            User user = userService.updateSalary(userId, salary);
            return ResponseEntity.ok(Map.of("message", "Salary updated", "user", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/update/{userId}")
    public ResponseEntity<?> updateEmployeeDetails(@PathVariable String userId, @RequestBody Map<String, Object> details) {
        try {
            Double salary = details.containsKey("salary") ? Double.parseDouble(details.get("salary").toString()) : null;
            String department = (String) details.get("department");
            String designation = (String) details.get("designation");
            User user = userService.updateEmployeeDetails(userId, salary, department, designation);
            return ResponseEntity.ok(Map.of("message", "Updated", "user", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== MAIN PERSONAL DETAILS UPDATE - FIXED ==========
    @PutMapping("/personal-details/{userId}")
    public ResponseEntity<?> updatePersonalDetails(@PathVariable String userId, @RequestBody Map<String, String> details) {
        try {
            System.out.println("Received update for user: " + userId);
            System.out.println("Details: " + details);
            
            User user = userService.updatePersonalDetails(userId, details);
            
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }
            
            return ResponseEntity.ok(Map.of("message", "Personal details updated successfully", "user", user));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/personal-details/{userId}")
    public ResponseEntity<User> getCompletePersonalDetails(@PathVariable String userId) {
        try {
            User user = userService.getCompletePersonalDetails(userId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<User> getProfile(@PathVariable String userId) {
        try {
            return ResponseEntity.ok(userService.getUserById(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/employees")
    public ResponseEntity<List<User>> getAllEmployees() {
        return ResponseEntity.ok(userService.getAllEmployees());
    }

    @GetMapping("/managers")
    public ResponseEntity<List<User>> getAllManagers() {
        return ResponseEntity.ok(userService.getAllManagers());
    }

    @GetMapping("/clients")
    public ResponseEntity<List<User>> getAllClients() {
        return ResponseEntity.ok(userService.getAllClients());
    }

    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<User> getUserByEmail(@PathVariable String email) {
        User user = userService.findByEmail(email);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }

    @GetMapping("/employee-id/{employeeId}")
    public ResponseEntity<User> getUserByEmployeeId(@PathVariable String employeeId) {
        User user = userService.findByEmployeeId(employeeId);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        try {
            userService.changePassword(request.get("userId"), request.get("oldPassword"), request.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "Password changed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/profile/photo/{userId}")
    public ResponseEntity<?> uploadPhoto(@PathVariable String userId, @RequestParam("photo") MultipartFile file) {
        try {
            String photoUrl = userService.uploadProfilePhoto(userId, file);
            return ResponseEntity.ok(Map.of("photoUrl", photoUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/performance/{userId}")
    public ResponseEntity<?> getEmployeePerformance(@PathVariable String userId) {
        try {
            User user = userService.getUserById(userId);
            Map<String, Object> performance = new HashMap<>();
            performance.put("name", user.getName());
            performance.put("role", user.getRole());
            performance.put("designation", user.getDesignation());
            performance.put("performanceRating", user.getPerformanceRating() != null ? user.getPerformanceRating() : 0);
            performance.put("performanceReview", user.getPerformanceReview() != null ? user.getPerformanceReview() : "No review");
            return ResponseEntity.ok(performance);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/performance/{userId}")
    public ResponseEntity<?> updatePerformance(@PathVariable String userId, @RequestBody Map<String, Object> performance) {
        try {
            Double rating = performance.containsKey("rating") ? Double.parseDouble(performance.get("rating").toString()) : null;
            String review = (String) performance.get("review");
            User user = userService.updatePerformance(userId, rating, review);
            return ResponseEntity.ok(Map.of("message", "Performance updated", "user", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/auto-increment/{userId}")
    public ResponseEntity<?> autoIncrementSalary(@PathVariable String userId) {
        try {
            User user = userService.autoIncrementSalary(userId);
            return ResponseEntity.ok(Map.of(
                "message", "Salary auto-incremented based on performance!",
                "newSalary", user.getSalary(),
                "rating", user.getPerformanceRating()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/export/csv")
    public ResponseEntity<?> exportEmployeesToCsv() {
        try {
            List<User> employees = userService.getAllEmployees();
            StringBuilder csv = new StringBuilder();
            csv.append("Name,Email,Phone,Role,Department,Designation,Salary,Status\n");
            for (User emp : employees) {
                csv.append("\"").append(emp.getName()).append("\",")
                   .append(emp.getEmail()).append(",")
                   .append(emp.getPhone() != null ? emp.getPhone() : "").append(",")
                   .append(emp.getRole()).append(",")
                   .append(emp.getDepartment() != null ? emp.getDepartment() : "").append(",")
                   .append(emp.getDesignation() != null ? emp.getDesignation() : "").append(",")
                   .append(emp.getSalary() != null ? emp.getSalary() : 0).append(",")
                   .append(emp.getStatus())
                   .append("\n");
            }
            return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=employees.csv")
                .body(csv.toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}