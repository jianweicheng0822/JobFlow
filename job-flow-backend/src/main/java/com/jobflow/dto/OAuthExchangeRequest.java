package com.jobflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthExchangeRequest {

    @NotBlank(message = "Code is required")
    private String code;
}
