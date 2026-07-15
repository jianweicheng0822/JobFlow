package com.jobflow.dto;

import com.jobflow.model.ApplicationStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateJobApplicationRequest {
    private String positionTitle;
    private Long companyId;
    private String location;
    private String salary;
    private ApplicationStatus status;
    private LocalDate appliedDate;
    private String lastAction;
    private String notes;
}