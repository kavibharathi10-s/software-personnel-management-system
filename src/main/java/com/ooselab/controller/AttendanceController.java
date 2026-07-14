package com.ooselab.controller;

import com.ooselab.model.Attendance;
import com.ooselab.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @PostMapping("/mark/{userId}")
    public Attendance markAttendance(@PathVariable String userId) {
        return attendanceService.markAttendance(userId);
    }

    @PostMapping("/checkout/{userId}")
    public Attendance checkout(@PathVariable String userId) {
        return attendanceService.checkout(userId);
    }

    @GetMapping("/user/{userId}")
    public List<Attendance> getUserAttendance(@PathVariable String userId) {
        return attendanceService.getUserAttendance(userId);
    }

    @GetMapping("/daily")
    public List<Attendance> getDailyAttendance(@RequestParam @DateTimeFormat(pattern="yyyy-MM-dd") Date date) {
        return attendanceService.getDailyAttendance(date);
    }
}
