package com.jobflow.dto;

import lombok.Data;

@Data
public class DeleteAccountRequest {

    // Required when the account has a password
    private String password;

    // Accounts without a password confirm by typing their email instead
    private String confirmEmail;
}
