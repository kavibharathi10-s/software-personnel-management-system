package com.ooselab.repository;

import com.ooselab.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    List<User> findByStatus(String status);
    List<User> findByRoleNot(String role);  // Keep ONLY ONE
    
    Optional<User> findByEmployeeId(String employeeId);
    List<User> findByRoleAndStatus(String role, String status);
    List<User> findByManagerId(String managerId);
    List<User> findByStatusNot(String status);
    List<User> findByRoleAndStatusNot(String role, String status);
    List<User> findAllByStatus(String status);
    List<User> findByDepartment(String department);
    List<User> findByEmailNot(String email);
    List<User> findByRoleIn(List<String> roles);
    List<User> findByRoleAndEmailNot(String role, String email);
}