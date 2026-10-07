package com.jobflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTimeZoneRequest {
    @NotBlank(message = "Time zone is required")
    @Size(max = 64, message = "Time zone must be at most 64 characters")
    private String timeZone;
}
