package com.jobflow.dto;

import com.jobflow.model.InterviewType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateInterviewRequest {
    private Long jobApplicationId;
    private LocalDateTime interviewDate;
    private InterviewType interviewType;
    private String notes;
}