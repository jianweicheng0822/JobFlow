package com.jobflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GmailImportPreviewDTO {
    private String gmailMessageId;
    private String subject;
    private String from;
    private String companyName;
    private String positionTitle;
    private LocalDate appliedDate;
}
