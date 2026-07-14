package com.ooselab.controller;

import com.ooselab.model.Meeting;
import com.ooselab.repository.MeetingRepository;
import com.ooselab.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meetings")
@CrossOrigin(origins = "*")
public class MeetingController {

    @Autowired
    private MeetingService meetingService;

    // Schedule a new meeting
    @PostMapping("/schedule")
public ResponseEntity<?> scheduleMeeting(@RequestBody Meeting meeting) {
    try {
        meeting.setId(UUID.randomUUID().toString());
        meeting.setStatus("SCHEDULED");
        Meeting saved = new Meeting();
        return ResponseEntity.ok(Map.of("message", "Meeting scheduled", "meeting", saved));
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

    // Get all meetings
    @GetMapping("/all")
    public ResponseEntity<List<Meeting>> getAllMeetings() {
        return ResponseEntity.ok(meetingService.getAllMeetings());
    }

    // Get upcoming meetings
    @GetMapping("/upcoming")
    public ResponseEntity<List<Meeting>> getUpcomingMeetings() {
        return ResponseEntity.ok(meetingService.getUpcomingMeetings());
    }

    // Get meetings by organizer
    @GetMapping("/organizer/{organizerId}")
    public ResponseEntity<List<Meeting>> getMeetingsByOrganizer(@PathVariable String organizerId) {
        return ResponseEntity.ok(meetingService.getMeetingsByOrganizer(organizerId));
    }

    // Get meeting by ID
    @GetMapping("/{meetingId}")
    public ResponseEntity<Meeting> getMeetingById(@PathVariable String meetingId) {
        return ResponseEntity.ok(meetingService.getMeetingById(meetingId));
    }

    // Cancel meeting
    @PutMapping("/cancel/{meetingId}")
    public ResponseEntity<?> cancelMeeting(@PathVariable String meetingId) {
        try {
            meetingService.cancelMeeting(meetingId);
            return ResponseEntity.ok(Map.of("message", "Meeting cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Complete meeting
    @PutMapping("/complete/{meetingId}")
    public ResponseEntity<?> completeMeeting(@PathVariable String meetingId) {
        try {
            meetingService.completeMeeting(meetingId);
            return ResponseEntity.ok(Map.of("message", "Meeting marked as completed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}