package com.jobflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationActivityDTO {
    // ISO year-month like "2026-10"; the frontend formats it for the user's language
    private String yearMonth;
    private long count;
}