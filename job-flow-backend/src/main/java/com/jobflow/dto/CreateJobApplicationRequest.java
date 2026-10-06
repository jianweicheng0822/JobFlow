package com.jobflow.dto;

import com.jobflow.model.ApplicationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateJobApplicationRequest {
    @NotBlank(message = "Position title is required")
    @Size(max = 255, message = "Position title must be at most 255 characters")
    private String positionTitle;

    private Long companyId;       // use existing company

    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String companyName;   // or create/find by name

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    @Size(max = 255, message = "Salary must be at most 255 characters")
    private String salary;

    private ApplicationStatus status;
    private LocalDate appliedDate;

    @Size(max = 255, message = "Last action must be at most 255 characters")
    private String lastAction;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;
}
