package com.jobflow.dto;

import lombok.Data;

@Data
public class CreateCompanyRequest {
    private String name;
    private String logoUrl;
    private String location;
    private String website;
}