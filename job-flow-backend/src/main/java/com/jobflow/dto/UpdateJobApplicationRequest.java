package com.jobflow.dto;

import com.jobflow.model.ApplicationStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

// Partial update: a null field means "leave it as is"
@Data
public class UpdateJobApplicationRequest {
    // Optional, but if it's sent it can't be blank (null skips this check)
    @Pattern(regexp = "(?s).*\\S.*", message = "Position title cannot be blank")
    @Size(max = 255, message = "Position title must be at most 255 characters")
    private String positionTitle;

    // companyId wins if both are sent; companyName finds or creates the user's company
    private Long companyId;

    @Pattern(regexp = "(?s).*\\S.*", message = "Company name cannot be blank")
    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String companyName;

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
