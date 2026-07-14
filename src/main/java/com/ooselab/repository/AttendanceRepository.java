package com.ooselab.repository;

import com.ooselab.model.Attendance;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findByUserId(String userId);
    Optional<Attendance> findByUserIdAndDate(String userId, Date date);
    List<Attendance> findByDate(Date date);
}
