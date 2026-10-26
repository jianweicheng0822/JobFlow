package com.jobflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    // Optional for OAuth users setting password for the first time
    private String currentPassword;

    // BCrypt only looks at the first 72 bytes
    @NotBlank(message = "New password is required")
    @Size(min = 6, max = 72, message = "New password must be 6 to 72 characters")
    private String newPassword;
}
