package com.ooselab.controller;

import com.ooselab.model.User;
import com.ooselab.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private JavaMailSender mailSender;

    @GetMapping("/test")
    public String test() {
        return "API is working!";
    }
    
    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail() {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo("your-test-email@gmail.com");
            message.setSubject("Test Email from SPMS");
            message.setText("If you receive this, email is working!");
            
            mailSender.send(message);
            return ResponseEntity.ok(Map.of("message", "✅ Email sent successfully!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        
        System.out.println("========== LOGIN ATTEMPT ==========");
        System.out.println("Email: " + email);
        System.out.println("Password: " + password);
        System.out.println("===================================");
        
        try {
            User user = userService.login(email, password);
            System.out.println("Login successful for: " + user.getName());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("userId", user.getId());
            response.put("name", user.getName());
            response.put("role", user.getRole());
            response.put("status", user.getStatus());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("Login failed: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ========== SIGNUP WITH FILE UPLOAD ==========
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestParam("name") String name,
                                     @RequestParam("email") String email,
                                     @RequestParam("phone") String phone,
                                     @RequestParam("role") String role,
                                     @RequestParam("qualification") String qualification,
                                     @RequestParam(value = "certificate", required = false) MultipartFile certificate) {
        try {
            // Create user object
            User user = new User();
            user.setId(UUID.randomUUID().toString());
            user.setName(name);
            user.setEmail(email);
            user.setPhone(phone);
            user.setRole(role);
            user.setQualification(qualification);
            
            // Save certificate file if uploaded
            if (certificate != null && !certificate.isEmpty()) {
                String certificateUrl = saveCertificateFile(certificate);
                user.setCertificateProof(certificateUrl);
                System.out.println("Certificate saved: " + certificateUrl);
            }
            
            if ("CLIENT".equals(role)) {
                user.setStatus("ACTIVE");
                userService.registerUser(user);
                return ResponseEntity.ok(Map.of("message", "Client registered successfully! You can login now."));
            } else {
                user.setStatus("PENDING");
                userService.registerUser(user);
                return ResponseEntity.ok(Map.of("message", "Signup request sent to HR for approval"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // Helper method to save certificate file
    private String saveCertificateFile(MultipartFile file) throws IOException {
        // Create upload directory if not exists
        String uploadDir = "uploads/certificates/";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        
        // Generate unique filename
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String fileName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + fileExtension;
        
        // Save file
        Path filePath = uploadPath.resolve(fileName);
        Files.write(filePath, file.getBytes());
        
        // Return URL to access the file
        return "/uploads/certificates/" + fileName;
    }
}