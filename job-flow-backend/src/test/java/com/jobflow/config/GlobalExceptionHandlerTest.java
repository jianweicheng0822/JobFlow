package com.jobflow.config;

import com.jobflow.exception.ExternalServiceException;
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
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.jobflow.model.ApplicationStatus;

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
        // Messages are shown as-is, without the "field: " prefix
        assertThat(message).isEqualTo("must not be blank; must not be null");
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
        // Internal details stay in the log, not in the response
        assertThat(response.getBody()).containsEntry("message", "Unexpected server error. Please try again later.");
    }

    @Test
    void handleGeneral_nullMessage_stillReturnsGenericMessage() {
        Exception ex = new RuntimeException((String) null);

        ResponseEntity<Map<String, Object>> response = handler.handleGeneral(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).containsEntry("message", "Unexpected server error. Please try again later.");
    }

    // --- Bad input that never reaches our code ---

    @Test
    void handleUnreadableBody_invalidEnum_namesFieldAndValue() {
        InvalidFormatException cause = InvalidFormatException.from(null, "bad enum", "NOT_A_STATUS", ApplicationStatus.class);
        cause.prependPath(new Object(), "status");
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException(
                "JSON parse error", cause, new MockHttpInputMessage(new byte[0]));

        ResponseEntity<Map<String, Object>> response = handler.handleUnreadableBody(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Invalid value 'NOT_A_STATUS' for 'status'");
    }

    @Test
    void handleUnreadableBody_malformedJson_returnsGenericBadRequest() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException(
                "JSON parse error", new JsonParseException(null, "Unexpected character"), new MockHttpInputMessage(new byte[0]));

        ResponseEntity<Map<String, Object>> response = handler.handleUnreadableBody(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Request body is not valid JSON");
        // No class names or parser internals leak out
        assertThat(response.getBody().get("message").toString()).doesNotContain("com.").doesNotContain("Unexpected character");
    }

    @Test
    void handleTypeMismatch_returns400WithParamName() throws Exception {
        MethodParameter param = new MethodParameter(
                this.getClass().getDeclaredMethod("handleTypeMismatch_returns400WithParamName"), -1);
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "BOGUS", ApplicationStatus.class, "status", param, new IllegalArgumentException("No enum constant"));

        ResponseEntity<Map<String, Object>> response = handler.handleTypeMismatch(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Invalid value 'BOGUS' for 'status'");
    }

    @Test
    void handleMissingParam_returns400WithParamName() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("status", "ApplicationStatus");

        ResponseEntity<Map<String, Object>> response = handler.handleMissingParam(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Missing required parameter 'status'");
    }

    @Test
    void handleBadRequest_nullMessage_doesNotBlowUp() {
        ResponseEntity<Map<String, Object>> response = handler.handleBadRequest(new IllegalArgumentException());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Bad Request");
    }

    // --- ExternalServiceException ---

    @Test
    void handleExternalService_returns502WithFriendlyMessage() {
        ExternalServiceException ex = new ExternalServiceException(
                "Couldn't reach Gmail. Please try again in a moment.", new RuntimeException("Google internals"));

        ResponseEntity<Map<String, Object>> response = handler.handleExternalService(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody()).containsEntry("status", 502);
        assertThat(response.getBody()).containsEntry("message", "Couldn't reach Gmail. Please try again in a moment.");
    }
}
