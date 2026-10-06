package com.jobflow.dto;

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
}
