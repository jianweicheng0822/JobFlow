package com.jobflow.dto;

import com.jobflow.model.InterviewType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewDTO {
    private Long id;
    private Long jobApplicationId;
    private String positionTitle;
    private String companyName;
    private LocalDateTime interviewDate;
    private InterviewType interviewType;
    private String notes;
}