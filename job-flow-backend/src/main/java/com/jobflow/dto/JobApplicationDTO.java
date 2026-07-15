package com.jobflow.dto;

import com.jobflow.model.ApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplicationDTO {
    private Long id;
    private String positionTitle;
    private CompanyDTO company;
    private String location;
    private String salary;
    private ApplicationStatus status;
    private LocalDate appliedDate;
    private String lastAction;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}