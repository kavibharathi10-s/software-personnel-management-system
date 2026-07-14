package com.ooselab.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = "managers")
public class Manager extends Employee {
    private List<String> teamMemberIds;
    private String managerLevel;
    private Integer teamSize;
}