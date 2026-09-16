package com.jobflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GmailImportConfirmRequest {

    private List<ImportItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportItem {
        private String gmailMessageId;
        private String companyName;
        private String positionTitle;
        private LocalDate appliedDate;
    }
}
