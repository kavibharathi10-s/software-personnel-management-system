package com.ooselab.repository;

import com.ooselab.model.Payroll;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PayrollRepository extends MongoRepository<Payroll, String> {
    List<Payroll> findByUserId(String userId);
    List<Payroll> findByMonthAndYear(String month, Integer year);
    List<Payroll> findByRole(String employeeIds);
    List<Payroll> findByUserIdIn(List<String> employeeIds);
}