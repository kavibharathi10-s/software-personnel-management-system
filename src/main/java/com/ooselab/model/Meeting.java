package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "meetings")
public class Meeting {
    @Id
    private String id;
    private String title;
    private String purpose;
    private Date date;
    private String time;
    private String location;
    private String meetingLink;
    private String organizedBy; // HR or Manager ID
    private List<String> attendeeIds;
    private String status; // SCHEDULED, COMPLETED, CANCELLED
}