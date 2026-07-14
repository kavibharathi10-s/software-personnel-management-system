package com.ooselab.repository;

import com.ooselab.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByClientId(String clientId);
    List<Project> findByManagerId(String managerId);
    List<Project> findByEmployeeIdsContaining(String employeeId);
    List<Project> findByStatus(String status);
}