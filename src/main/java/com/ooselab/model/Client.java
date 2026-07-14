package com.ooselab.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = "clients")
public class Client extends User {
    private String clientId;
    private String companyName;
    private String gstNumber;
    private List<String> projectIds;
}