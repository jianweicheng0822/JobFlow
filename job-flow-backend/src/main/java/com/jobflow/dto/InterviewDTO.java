package com.jobflow.dto;

import com.jobflow.model.InterviewType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewDTO {
    private Long id;
    private Long jobApplicationId;
    private String positionTitle;
    private String companyName;
    // The time as entered, on timeZone's clock (what the form edits)
    private LocalDateTime interviewDate;
    private String timeZone;
    // The same moment with its offset, e.g. "2026-11-10T10:00:00-08:00"
    private OffsetDateTime startsAt;
    private InterviewType interviewType;
    private String notes;
    private boolean reminderEnabled;
    private int reminderHoursBefore;
    private boolean reminderSent;
    private Long daysUntil;
}