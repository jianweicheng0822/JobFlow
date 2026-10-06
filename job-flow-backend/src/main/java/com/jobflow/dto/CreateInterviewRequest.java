package com.jobflow.dto;

import com.jobflow.model.InterviewType;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

// Shared by create and update. Update is partial, so the required fields
// are checked in InterviewService.create instead of with @NotNull here.
@Data
public class CreateInterviewRequest {
    private Long jobApplicationId;
    private LocalDateTime interviewDate;
    private InterviewType interviewType;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;

    private Boolean reminderEnabled;
    private Integer reminderHoursBefore;
}
