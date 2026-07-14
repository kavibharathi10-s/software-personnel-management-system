package com.ooselab.repository;

import com.ooselab.model.Meeting;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeetingRepository extends MongoRepository<Meeting, String> {
    List<Meeting> findByOrganizedBy(String organizedBy);
    List<Meeting> findByStatus(String status);
}