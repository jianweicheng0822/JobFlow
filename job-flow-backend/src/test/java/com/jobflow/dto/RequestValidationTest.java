package com.jobflow.dto;

import com.jobflow.model.FeedbackType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

// Checks the bean validation annotations that back the 400 responses
class RequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static Set<String> messages(Object request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    // --- CreateJobApplicationRequest ---

    @Test
    void createApplication_validRequest_passes() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Engineer");
        request.setCompanyName("Acme");

        assertThat(messages(request)).isEmpty();
    }

    @Test
    void createApplication_missingOrBlankTitle_fails() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        assertThat(messages(request)).contains("Position title is required");

        request.setPositionTitle("   ");
        assertThat(messages(request)).contains("Position title is required");
    }

    @Test
    void createApplication_tooLongFields_fail() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("x".repeat(256));
        request.setCompanyName("x".repeat(256));
        request.setSalary("x".repeat(256));
        request.setNotes("x".repeat(5001));

        assertThat(messages(request)).contains(
                "Position title must be at most 255 characters",
                "Company name must be at most 255 characters",
                "Salary must be at most 255 characters",
                "Notes must be at most 5000 characters");
    }

    @Test
    void createApplication_fieldsAtTheLimit_pass() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("x".repeat(255));
        request.setNotes("x".repeat(5000));

        assertThat(messages(request)).isEmpty();
    }

    // --- UpdateJobApplicationRequest (partial update) ---

    @Test
    void updateApplication_emptyRequest_passes() {
        assertThat(messages(new UpdateJobApplicationRequest())).isEmpty();
    }

    @Test
    void updateApplication_blankTitle_fails() {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setPositionTitle("  \n ");

        assertThat(messages(request)).contains("Position title cannot be blank");
    }

    @Test
    void updateApplication_multiLineTitle_passes() {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setPositionTitle("\nEngineer");

        assertThat(messages(request)).isEmpty();
    }

    @Test
    void updateApplication_blankCompanyName_fails() {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setCompanyName("   ");

        assertThat(messages(request)).contains("Company name cannot be blank");
    }

    // --- CreateCompanyRequest ---

    @Test
    void company_missingOrBlankName_fails() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        assertThat(messages(request)).contains("Company name is required");

        request.setName("");
        assertThat(messages(request)).contains("Company name is required");
    }

    @Test
    void company_tooLongWebsite_fails() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("Acme");
        request.setWebsite("https://" + "x".repeat(250));

        assertThat(messages(request)).contains("Website must be at most 255 characters");
    }

    // --- CreateInterviewRequest ---

    @Test
    void interview_tooLongNotes_fail() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setNotes("x".repeat(5001));

        assertThat(messages(request)).contains("Notes must be at most 5000 characters");
    }

    // --- GmailImportConfirmRequest ---

    @Test
    void gmailImport_missingItems_fails() {
        assertThat(messages(new GmailImportConfirmRequest())).contains("No emails selected to import");
    }

    @Test
    void gmailImport_itemWithoutMessageId_fails() {
        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(java.util.List.of(new GmailImportConfirmRequest.ImportItem(" ", "Acme", "Role", null)));

        assertThat(messages(request)).contains("Each email to import needs a gmailMessageId");
    }

    @Test
    void gmailImport_longTitleIsLeftForTheServiceToTruncate() {
        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(java.util.List.of(new GmailImportConfirmRequest.ImportItem("msg1", "Acme", "x".repeat(600), null)));

        assertThat(messages(request)).isEmpty();
    }

    // --- UpdateTimeZoneRequest ---

    @Test
    void timeZone_blank_fails() {
        UpdateTimeZoneRequest request = new UpdateTimeZoneRequest();
        assertThat(messages(request)).contains("Time zone is required");

        request.setTimeZone("  ");
        assertThat(messages(request)).contains("Time zone is required");
    }

    // --- FeedbackRequest ---

    private static FeedbackRequest feedback(String message) {
        FeedbackRequest request = new FeedbackRequest();
        request.setType(FeedbackType.BUG);
        request.setMessage(message);
        return request;
    }

    @Test
    void feedback_validRequest_passes() {
        FeedbackRequest request = feedback("The dashboard is blank");
        request.setEmail("me@example.com");

        assertThat(messages(request)).isEmpty();
    }

    @Test
    void feedback_missingType_fails() {
        FeedbackRequest request = feedback("The dashboard is blank");
        request.setType(null);

        assertThat(messages(request)).contains("Feedback type is required");
    }

    @Test
    void feedback_messageTooShortOrTooLong_fails() {
        assertThat(messages(feedback("hey"))).contains("Feedback must be 5 to 1000 characters");
        assertThat(messages(feedback("x".repeat(1001)))).contains("Feedback must be 5 to 1000 characters");
        assertThat(messages(feedback("x".repeat(1000)))).isEmpty();
    }

    @Test
    void feedback_badEmail_fails_butBlankEmailIsFine() {
        FeedbackRequest request = feedback("The dashboard is blank");
        request.setEmail("not-an-email");
        assertThat(messages(request)).contains("Invalid email format");

        request.setEmail("");
        assertThat(messages(request)).isEmpty();
    }

    @Test
    void feedback_honeypot_marksBots() {
        FeedbackRequest request = feedback("The dashboard is blank");
        assertThat(request.isFromBot()).isFalse();

        request.setWebsite("  ");
        assertThat(request.isFromBot()).isFalse();

        request.setWebsite("https://spam.example");
        assertThat(request.isFromBot()).isTrue();
    }
}
