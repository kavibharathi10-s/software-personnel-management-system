package com.ooselab.service;

import com.ooselab.model.Attendance;
import com.ooselab.model.User;
import com.ooselab.repository.AttendanceRepository;
import com.ooselab.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    public Attendance markAttendance(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Date today = getStartOfDay(new Date());
        Optional<Attendance> existing = attendanceRepository.findByUserIdAndDate(userId, today);

        if (existing.isPresent()) {
            return existing.get();
        }

        Attendance attendance = new Attendance();
        attendance.setUserId(userId);
        attendance.setUserName(user.getName());
        attendance.setRole(user.getRole());
        attendance.setDate(today);
        attendance.setStatus("PRESENT");
        attendance.setCheckInTime(new Date());
        
        return attendanceRepository.save(attendance);
    }

    public Attendance checkout(String userId) {
        Date today = getStartOfDay(new Date());
        Attendance attendance = attendanceRepository.findByUserIdAndDate(userId, today)
            .orElseThrow(() -> new RuntimeException("No check-in record found for today"));
            
        attendance.setCheckOutTime(new Date());
        return attendanceRepository.save(attendance);
    }

    public List<Attendance> getUserAttendance(String userId) {
        return attendanceRepository.findByUserId(userId);
    }

    public List<Attendance> getDailyAttendance(Date date) {
        return attendanceRepository.findByDate(getStartOfDay(date));
    }

    public double calculateAttendanceRate(String userId) {
        List<Attendance> records = attendanceRepository.findByUserId(userId);
        if (records.isEmpty()) return 0.0;

        long presentCount = records.stream()
            .filter(a -> "PRESENT".equals(a.getStatus()))
            .count();

        // Simple calculation: (Present Days / Total Records) * 100
        return ((double) presentCount / records.size()) * 100;
    }

    private Date getStartOfDay(Date date) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTime();
    }
}
