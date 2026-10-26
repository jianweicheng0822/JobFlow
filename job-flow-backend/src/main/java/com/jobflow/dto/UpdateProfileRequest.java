package com.jobflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    private String name;

    private String email;

    @Size(max = 255, message = "Job title must be at most 255 characters")
    private String jobTitle;

    @Size(max = 5000, message = "Bio must be at most 5000 characters")
    private String bio;
}
