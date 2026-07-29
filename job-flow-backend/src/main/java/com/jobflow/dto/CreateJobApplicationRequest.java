package com.jobflow.dto;

import com.jobflow.model.ApplicationStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateJobApplicationRequest {
    private String positionTitle;
    private Long companyId;       // use existing company
    private String companyName;   // or create/find by name
    private String location;
    private String salary;
    private ApplicationStatus status;
    private LocalDate appliedDate;
    private String lastAction;
    private String notes;
}