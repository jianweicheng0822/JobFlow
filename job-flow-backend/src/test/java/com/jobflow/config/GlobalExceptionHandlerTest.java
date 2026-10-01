package com.jobflow.config;

import com.jobflow.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.core.MethodParameter;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    // --- NotFoundException ---

    @Test
    void handleNotFound_returns404() {
        NotFoundException ex = new NotFoundException("Job application not found: 42");

        ResponseEntity<Map<String, Object>> response = handler.handleNotFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).containsEntry("status", 404);
        assertThat(response.getBody()).containsEntry("error", "Not Found");
        assertThat(response.getBody()).containsEntry("message", "Job application not found: 42");
        assertThat(response.getBody()).containsKey("timestamp");
    }

    // --- IllegalArgumentException ---

    @Test
    void handleBadRequest_returns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid status value");

        ResponseEntity<Map<String, Object>> response = handler.handleBadRequest(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("status", 400);
        assertThat(response.getBody()).containsEntry("error", "Bad Request");
        assertThat(response.getBody()).containsEntry("message", "Invalid status value");
    }

    // --- MethodArgumentNotValidException ---

    @Test
    void handleValidation_returns400WithFieldErrors() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "email", "must not be blank"));
        bindingResult.addError(new FieldError("request", "name", "must not be null"));

        // Need a MethodParameter for the constructor
        MethodParameter param = new MethodParameter(
                this.getClass().getDeclaredMethod("handleValidation_returns400WithFieldErrors"), -1);
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(param, bindingResult);

        ResponseEntity<Map<String, Object>> response = handler.handleValidation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("status", 400);
        assertThat(response.getBody()).containsEntry("error", "Validation Error");
        String message = (String) response.getBody().get("message");
        assertThat(message).contains("email: must not be blank");
        assertThat(message).contains("name: must not be null");
    }

    // --- DataIntegrityViolationException ---

    @Test
    void handleDataIntegrity_returns409() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Duplicate entry");

        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("status", 409);
        assertThat(response.getBody()).containsEntry("error", "Conflict");
        assertThat(response.getBody().get("message").toString()).contains("data constraint");
    }

    // --- General Exception ---

    @Test
    void handleGeneral_returns500() {
        Exception ex = new RuntimeException("Something went wrong");

        ResponseEntity<Map<String, Object>> response = handler.handleGeneral(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).containsEntry("status", 500);
        assertThat(response.getBody()).containsEntry("error", "Internal Server Error");
        assertThat(response.getBody()).containsEntry("message", "Something went wrong");
    }

    @Test
    void handleGeneral_nullMessage_returnsUnexpectedError() {
        Exception ex = new RuntimeException((String) null);

        ResponseEntity<Map<String, Object>> response = handler.handleGeneral(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).containsEntry("message", "Unexpected error");
    }
}
