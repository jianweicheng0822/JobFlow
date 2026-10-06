package com.jobflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

// Used for both create and update (update replaces every field)
@Data
public class CreateCompanyRequest {
    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String name;

    @Size(max = 255, message = "Logo URL must be at most 255 characters")
    private String logoUrl;

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    @Size(max = 255, message = "Website must be at most 255 characters")
    private String website;
}
