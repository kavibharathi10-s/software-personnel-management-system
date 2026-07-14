package com.ooselab.service;

import com.ooselab.model.User;
import com.ooselab.model.Project;
import com.ooselab.repository.UserRepository;
import com.ooselab.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private JavaMailSender mailSender;
    
    // ========== REGISTRATION & LOGIN ==========
    
    public User registerUser(User user) {
        user.setId(UUID.randomUUID().toString());
        user.setStatus("PENDING");
        user.setRegistrationDate(new java.util.Date());
        return userRepository.save(user);
    }
    
    public User registerClient(User user) {
        user.setId(UUID.randomUUID().toString());
        user.setStatus("ACTIVE");
        user.setRegistrationDate(new java.util.Date());
        return userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Invalid password");
        }
        
        if ("TERMINATED".equals(user.getStatus())) {
            throw new RuntimeException("Account has been terminated. Contact HR for assistance.");
        }
        
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("Account is not active. Status: " + user.getStatus());
        }
        
        return user;
    }

    // ========== PENDING REQUESTS ==========
    
    public List<User> getPendingUsers() {
        return userRepository.findByStatus("PENDING");
    }

    // ========== GET ALL WORKERS ==========
    
    public List<User> getAllWorkersExceptDefaultHR() {
        return userRepository.findAll().stream()
            .filter(user -> !"CLIENT".equals(user.getRole()))
            .filter(user -> !"hr@spms.com".equals(user.getEmail()))
            .collect(Collectors.toList());
    }

    // ========== APPROVE USER ==========
    
    public User approveUser(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setStatus("ACTIVE");
        
        String generatedPassword = generateRandomPassword();
        user.setPassword(generatedPassword);
        
        sendEmailWithCredentials(user.getEmail(), user.getName(), generatedPassword);
        
        return userRepository.save(user);
    }
    
    // Approve user with manager assignment
    public User approveUserWithManager(String userId, String managerId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setStatus("ACTIVE");
        
        if ("EMPLOYEE".equals(user.getRole()) && managerId != null && !managerId.isEmpty()) {
            user.setManagerId(managerId);
        }
        
        String generatedPassword = generateRandomPassword();
        user.setPassword(generatedPassword);
        
        sendEmailWithCredentials(user.getEmail(), user.getName(), generatedPassword);
        
        return userRepository.save(user);
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
        StringBuilder password = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            int index = (int) (Math.random() * chars.length());
            password.append(chars.charAt(index));
        }
        return password.toString();
    }

    private void sendEmailWithCredentials(String email, String name, String password) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("🎉 Your Account is Approved - Software Personnel Management System");
            
            String emailContent = "Hello " + name + ",\n\n" +
                    "Your account has been approved by HR!\n\n" +
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                    "🔐 LOGIN CREDENTIALS\n" +
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                    "📧 Login ID: " + email + "\n" +
                    "🔑 Password: " + password + "\n" +
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                    "🔐 Please change your password after first login.\n\n" +
                    "🌐 Login here: http://localhost:8080\n\n" +
                    "Best regards,\n" +
                    "HR Team\n" +
                    "Software Personnel Management System";
            
            message.setText(emailContent);
            mailSender.send(message);
            
            System.out.println("✅ EMAIL SENT SUCCESSFULLY to: " + email);
            System.out.println("   Password: " + password);
            
        } catch (Exception e) {
            System.err.println("❌ EMAIL FAILED to: " + email);
            System.err.println("   Error: " + e.getMessage());
            
            System.out.println("");
            System.out.println("╔══════════════════════════════════════════════════════════════╗");
            System.out.println("║              📧 EMAIL WOULD BE SENT TO: " + email + " ║");
            System.out.println("╠══════════════════════════════════════════════════════════════╣");
            System.out.println("║  Hello " + name + ",");
            System.out.println("║  Your account has been approved!");
            System.out.println("║  Login ID: " + email);
            System.out.println("║  Password: " + password);
            System.out.println("╚══════════════════════════════════════════════════════════════╝");
            System.out.println("");
        }
    }

    private void sendRejectionEmail(String email, String name, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("❌ Your Account Request Status - Software Personnel Management System");
            message.setText("Hello " + name + ",\n\n" +
                            "We regret to inform you that your account request has been rejected.\n\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                            "📋 REJECTION REASON\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                            reason + "\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                            "If you have any questions, please contact HR.\n\n" +
                            "Best regards,\n" +
                            "HR Team\n" +
                            "Software Personnel Management System");
            
            mailSender.send(message);
            System.out.println("✅ Rejection email sent to: " + email);
            
        } catch (Exception e) {
            System.err.println("❌ Failed to send rejection email to: " + email);
            System.err.println("Error: " + e.getMessage());
        }
    }

    private void sendTerminationEmail(String email, String name, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("⚠️ Employment Termination Notice - Software Personnel Management System");
            message.setText("Hello " + name + ",\n\n" +
                            "We regret to inform you that your employment has been terminated.\n\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                            "📋 TERMINATION REASON\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                            reason + "\n" +
                            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                            "You will no longer have access to the system.\n\n" +
                            "If you have any questions, please contact HR.\n\n" +
                            "Best regards,\n" +
                            "HR Team\n" +
                            "Software Personnel Management System");
            
            mailSender.send(message);
            System.out.println("✅ Termination email sent to: " + email);
        } catch (Exception e) {
            System.err.println("❌ Failed to send termination email to: " + email);
        }
    }

    private void sendPasswordChangeEmail(String email, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("🔐 Password Changed Successfully - Software Personnel Management System");
            message.setText("Hello " + name + ",\n\n" +
                            "Your password has been changed successfully.\n\n" +
                            "If you did not make this change, please contact HR immediately.\n\n" +
                            "Best regards,\n" +
                            "HR Team\n" +
                            "Software Personnel Management System");
            
            mailSender.send(message);
            System.out.println("✅ Password change confirmation sent to: " + email);
        } catch (Exception e) {
            System.err.println("❌ Failed to send password change email: " + e.getMessage());
        }
    }

    // ========== REJECT USER ==========
    
    public User rejectUser(String userId, String reason) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("REJECTED");
        user.setRejectionReason(reason);
        
        sendRejectionEmail(user.getEmail(), user.getName(), reason);
        
        return userRepository.save(user);
    } 
    
    // ========== ADD USER ==========
    
    public User addUser(User user) {
        user.setId(UUID.randomUUID().toString());
        user.setStatus("ACTIVE");
        user.setRegistrationDate(new java.util.Date());
        return userRepository.save(user);
    }

    // ========== REMOVE USER ==========
    
    public void removeUser(String userId, String reason) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("TERMINATED");
        user.setRejectionReason(reason);
        userRepository.save(user);
        
        sendTerminationEmail(user.getEmail(), user.getName(), reason);
    }

    // ========== UPDATE EMPLOYEE POSITION AND SALARY ==========
    
    public User updateEmployeePositionAndSalary(String userId, Double salary, String designation) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (salary != null) {
            user.setSalary(salary);
        }
        if (designation != null && !designation.isEmpty()) {
            user.setDesignation(designation);
        }
        
        return userRepository.save(user);
    }

    // ========== UPDATE ONLY SALARY ==========
    
    public User updateSalary(String userId, Double salary) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setSalary(salary);
        return userRepository.save(user);
    }

    // ========== UPDATE EMPLOYEE DETAILS ==========
    
    public User updateEmployeeDetails(String userId, Double salary, String department, String designation) {
        User user = getUserById(userId);
        
        if (salary != null) {
            user.setSalary(salary);
        }
        if (department != null && !department.isEmpty()) {
            user.setDepartment(department);
        }
        if (designation != null && !designation.isEmpty()) {
            user.setDesignation(designation);
        }
        
        return userRepository.save(user);
    }

    // ========== GET COMPLETE PERSONAL DETAILS ==========
    
    public User getCompletePersonalDetails(String userId) {
        return getUserById(userId);
    }

    // ========== UPDATE PERSONAL DETAILS - SIMPLIFIED VERSION ==========
    
    public User updatePersonalDetails(String userId, Map<String, String> details) {
        try {
            System.out.println("=== STARTING UPDATE PERSONAL DETAILS ===");
            System.out.println("User ID: " + userId);
            System.out.println("Details received: " + details);
            
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            
            System.out.println("User found: " + user.getName());
            
            // Update name
            String name = details.get("name");
            if (name != null && !name.isEmpty()) {
                user.setName(name);
                System.out.println("✓ Name updated to: " + name);
            }
            
            // Update phone
            String phone = details.get("phone");
            if (phone != null) {
                user.setPhone(phone);
                System.out.println("✓ Phone updated to: " + phone);
            }
            
            // Update date of birth
            String dob = details.get("dateOfBirth");
            if (dob != null && !dob.isEmpty()) {
                user.setDateOfBirth(dob);
                System.out.println("✓ DOB updated to: " + dob);
            }
            
            // Update permanent address
            String permAddr = details.get("permanentAddress");
            if (permAddr != null) {
                user.setPermanentAddress(permAddr);
                System.out.println("✓ Permanent Address updated");
            }
            
            // Update current address
            String currAddr = details.get("currentAddress");
            if (currAddr != null) {
                user.setCurrentAddress(currAddr);
                System.out.println("✓ Current Address updated");
            }
            
            // Update city
            String city = details.get("city");
            if (city != null) {
                user.setCity(city);
                System.out.println("✓ City updated to: " + city);
            }
            
            // Update state
            String state = details.get("state");
            if (state != null) {
                user.setState(state);
                System.out.println("✓ State updated to: " + state);
            }
            
            // Update pincode
            String pincode = details.get("pincode");
            if (pincode != null) {
                user.setPincode(pincode);
                System.out.println("✓ Pincode updated to: " + pincode);
            }
            
            // Update blood group
            String bloodGroup = details.get("bloodGroup");
            if (bloodGroup != null) {
                user.setBloodGroup(bloodGroup);
                System.out.println("✓ Blood Group updated to: " + bloodGroup);
            }
            
            // Update emergency contact
            String emergency = details.get("emergencyContact");
            if (emergency != null) {
                user.setEmergencyContact(emergency);
                System.out.println("✓ Emergency Contact updated");
            }
            
            // Update PAN number
            String pan = details.get("panNumber");
            if (pan != null) {
                user.setPanNumber(pan);
                System.out.println("✓ PAN Number updated");
            }
            
            // Update Aadhar number
            String aadhar = details.get("aadharNumber");
            if (aadhar != null) {
                user.setAadharNumber(aadhar);
                System.out.println("✓ Aadhar Number updated");
            }
            
            // Update bank name
            String bankName = details.get("bankName");
            if (bankName != null) {
                user.setBankName(bankName);
                System.out.println("✓ Bank Name updated to: " + bankName);
            }
            
            // Update account number
            String accountNo = details.get("accountNumber");
            if (accountNo != null) {
                user.setAccountNumber(accountNo);
                System.out.println("✓ Account Number updated");
            }
            
            // Update IFSC code
            String ifsc = details.get("ifscCode");
            if (ifsc != null) {
                user.setIfscCode(ifsc);
                System.out.println("✓ IFSC Code updated to: " + ifsc);
            }
            
            User savedUser = userRepository.save(user);
            System.out.println("✅ User saved successfully: " + savedUser.getId());
            System.out.println("=== UPDATE COMPLETED SUCCESSFULLY ===");
            
            return savedUser;
            
        } catch (Exception e) {
            System.err.println("❌ ERROR in updatePersonalDetails: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update personal details: " + e.getMessage());
        }
    }

    // ========== GET USERS ==========
    
    public User getUserById(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
    
    public User findByEmployeeId(String employeeId) {
        return userRepository.findByEmployeeId(employeeId).orElse(null);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getAllEmployees() {
        return userRepository.findAll().stream()
            .filter(user -> "EMPLOYEE".equals(user.getRole()) && !"TERMINATED".equals(user.getStatus()))
            .collect(Collectors.toList());
    }

    public List<User> getAllManagers() {
        return userRepository.findAll().stream()
            .filter(user -> "MANAGER".equals(user.getRole()) && !"TERMINATED".equals(user.getStatus()))
            .collect(Collectors.toList());
    }

    public List<User> getAllClients() {
        return userRepository.findAll().stream()
            .filter(user -> "CLIENT".equals(user.getRole()))
            .collect(Collectors.toList());
    }

    public List<User> getEmployeesByManager(String managerId) {
        return userRepository.findAll().stream()
            .filter(user -> "EMPLOYEE".equals(user.getRole()) && !"TERMINATED".equals(user.getStatus()))
            .filter(user -> managerId.equals(user.getManagerId()))
            .collect(Collectors.toList());
    }

    // ========== PROFILE PHOTO UPLOAD ==========
    
    public String uploadProfilePhoto(String userId, MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String base64Image = java.util.Base64.getEncoder().encodeToString(bytes);
            String fileType = file.getContentType();
            String photoUrl = "data:" + fileType + ";base64," + base64Image;
            
            User user = getUserById(userId);
            user.setProfilePhoto(photoUrl);
            userRepository.save(user);
            
            return photoUrl;
        } catch (IOException e) {
            e.printStackTrace();
            return "upload_failed";
        }
    }

    // ========== UPDATE PROFILE ==========
    
    public User updateUserProfile(String userId, User updatedUser) {
        User existingUser = getUserById(userId);
        
        if (updatedUser.getName() != null) existingUser.setName(updatedUser.getName());
        if (updatedUser.getPhone() != null) existingUser.setPhone(updatedUser.getPhone());
        if (updatedUser.getAddress() != null) existingUser.setAddress(updatedUser.getAddress());
        if (updatedUser.getQualification() != null) existingUser.setQualification(updatedUser.getQualification());
        
        return userRepository.save(existingUser);
    }

    // ========== CHANGE PASSWORD ==========
    
    public void changePassword(String userId, String oldPassword, String newPassword) {
        User user = getUserById(userId);
        
        if (!user.getPassword().equals(oldPassword)) {
            throw new RuntimeException("Current password is incorrect");
        }
        
        user.setPassword(newPassword);
        userRepository.save(user);
        
        sendPasswordChangeEmail(user.getEmail(), user.getName());
    }

    // ========== PERFORMANCE UPDATE ==========
    
    public User updatePerformance(String userId, Double rating, String review) {
        User user = getUserById(userId);
        
        if (rating != null) user.setPerformanceRating(rating);
        if (review != null) user.setPerformanceReview(review);
        user.setLastReviewDate(new Date());
        
        return userRepository.save(user);
    }

    // ========== PERFORMANCE RATING CALCULATION ==========
    
    public User calculateAndSetRating(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        if ("EMPLOYEE".equals(user.getRole())) {
            // UPDATED: EMPLOYEE RATING = (completed_tasks / total_tasks) * 100
            // Calculate strictly based on tasks assigned to THIS individual
            List<Project> projects = projectRepository.findByEmployeeIdsContaining(userId);
            int totalEmpTasks = 0;
            double totalProgressSum = 0;
            
            for (Project project : projects) {
                if (project.getTasks() != null) {
                    for (com.ooselab.model.Task task : project.getTasks()) {
                        if (userId.equals(task.getAssignedEmployeeId())) {
                            totalEmpTasks++;
                            if (task.getProgressPercentage() != null) {
                                totalProgressSum += task.getProgressPercentage();
                            } else if ("Completed".equalsIgnoreCase(task.getStatus())) {
                                totalProgressSum += 100;
                            }
                        }
                    }
                }
            }
            
            user.setTotalTasks(totalEmpTasks);
            // We'll consider a task 'completed' for stats if it's 100%
            user.setCompletedTasks((int) projects.stream()
                .flatMap(p -> p.getTasks() != null ? p.getTasks().stream() : java.util.stream.Stream.empty())
                .filter(t -> userId.equals(t.getAssignedEmployeeId()) && (t.getProgressPercentage() != null && t.getProgressPercentage() >= 100 || "Completed".equalsIgnoreCase(t.getStatus())))
                .count());
            
            // 1. Task Completion Percentage based on progress (0-100)
            double taskRating = totalEmpTasks > 0 ? (totalProgressSum / totalEmpTasks) : 0;
            
            // 2. Attendance Rate (0-100)
            double attendanceRate = attendanceService.calculateAttendanceRate(userId);
            
            // 3. Leave Consistency (0-100)
            // Penalty based on days taken relative to yearly allowance (e.g., 20 days)
            double leaveBalance = leaveService.getLeaveBalance(userId);
            double leaveConsistency = (leaveBalance / 20.0) * 100;
            if (leaveConsistency < 0) leaveConsistency = 0;
            if (leaveConsistency > 100) leaveConsistency = 100;

            // Final Formula: 50% Tasks + 30% Attendance + 20% Leaves
            double finalRating = (taskRating * 0.5) + (attendanceRate * 0.3) + (leaveConsistency * 0.2);
            
            user.setPerformanceRating(finalRating);
            
            System.out.println("✅ Calculated EMPLOYEE rating for " + user.getName() + ": " + finalRating + "%");
            System.out.println("   Tasks: " + taskRating + "% | Attendance: " + attendanceRate + "% | Leave: " + leaveConsistency + "%");
            
            return userRepository.save(user);
        } else if ("MANAGER".equals(user.getRole())) {
            // UPDATED: MANAGER RATING Logic
            
            // 1. Project Management Success (50%)
            List<Project> managedProjects = projectRepository.findByManagerId(userId);
            double projectCompletion = managedProjects.isEmpty() ? 0 :
                managedProjects.stream()
                    .mapToDouble(p -> p.getProgress() != null ? p.getProgress() : 0)
                    .average().orElse(0);
                
            // 2. Attendance (30%)
            double attendanceRate = attendanceService.calculateAttendanceRate(userId);

            // 3. Management Factor (20%) - Average Team Rating
            List<User> team = userRepository.findAll().stream()
                .filter(u -> userId.equals(u.getManagerId()) && "EMPLOYEE".equals(u.getRole()))
                .collect(Collectors.toList());
            
            double avgTeamRating = team.isEmpty() ? 0 :
                team.stream()
                    .mapToDouble(u -> u.getPerformanceRating() != null ? u.getPerformanceRating() : 0)
                    .average().orElse(0);
                
            double overallRating = (projectCompletion * 0.5) + (attendanceRate * 0.3) + (avgTeamRating * 0.2);
            user.setPerformanceRating(overallRating);
            
            System.out.println("✅ Calculated MANAGER rating for " + user.getName() + ": " + overallRating + "%");
            
            return userRepository.save(user);
        }
        
        return userRepository.save(user);
    }

    // ========== AUTO INCREMENT SALARY ==========
    public User autoIncrementSalary(String userId) {
        User user = calculateAndSetRating(userId);
        double rating = user.getPerformanceRating() != null ? user.getPerformanceRating() : 0;
        double currentSalary = user.getSalary() != null ? user.getSalary() : 0;
        if (currentSalary <= 0) throw new RuntimeException("Salary not set for user");
        
        double incrementRate = 0;
        if (rating >= 80) incrementRate = 0.10;
        else if (rating >= 60) incrementRate = 0.05;
        
        if (incrementRate > 0) {
            double newSalary = Math.round(currentSalary * (1 + incrementRate));
            user.setSalary(newSalary);
            return userRepository.save(user);
        }
        return user;
    }
}