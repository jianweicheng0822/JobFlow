package com.jobflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GmailImportConfirmRequest {

    @NotNull(message = "No emails selected to import")
    private List<@NotNull(message = "Import items can't be empty") @Valid ImportItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportItem {
        @NotBlank(message = "Each email to import needs a gmailMessageId")
        @Size(max = 255, message = "gmailMessageId must be at most 255 characters")
        private String gmailMessageId;

        // Company and title come from email subjects (and can be edited in the modal),
        // so the service trims, defaults and truncates them instead of rejecting the batch
        private String companyName;
        private String positionTitle;
        private LocalDate appliedDate;
    }
}
