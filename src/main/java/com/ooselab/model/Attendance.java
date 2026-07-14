package com.ooselab.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "attendance")
public class Attendance {
    @Id
    private String id;
    private String userId;
    private String userName;
    private String role;
    private Date date;
    private String status; // PRESENT, ABSENT, ON_LEAVE
    private Date checkInTime;
    private Date checkOutTime;
}
