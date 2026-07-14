package com.ooselab.service;

import com.ooselab.model.Meeting;
import com.ooselab.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class MeetingService {

    @Autowired
    private MeetingRepository meetingRepository;

    // Schedule a new meeting
    public Meeting scheduleMeeting(Meeting meeting) {
        meeting.setId(UUID.randomUUID().toString());
        meeting.setStatus("SCHEDULED");
        meeting.setDate(new Date()); // Set current date
        return meetingRepository.save(meeting);
    }

    // Get all meetings
    public List<Meeting> getAllMeetings() {
        return meetingRepository.findAll();
    }

    // Get meetings by organizer
    public List<Meeting> getMeetingsByOrganizer(String organizerId) {
        return meetingRepository.findByOrganizedBy(organizerId);
    }

    // Get upcoming meetings (not completed or cancelled)
    public List<Meeting> getUpcomingMeetings() {
        return meetingRepository.findByStatus("SCHEDULED");
    }

    // Get meeting by ID
    public Meeting getMeetingById(String meetingId) {
        return meetingRepository.findById(meetingId)
            .orElseThrow(() -> new RuntimeException("Meeting not found"));
    }

    // Cancel meeting
    public void cancelMeeting(String meetingId) {
        Meeting meeting = getMeetingById(meetingId);
        meeting.setStatus("CANCELLED");
        meetingRepository.save(meeting);
    }

    // Complete meeting
    public void completeMeeting(String meetingId) {
        Meeting meeting = getMeetingById(meetingId);
        meeting.setStatus("COMPLETED");
        meetingRepository.save(meeting);
    }
}