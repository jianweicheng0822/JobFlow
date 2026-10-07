package com.jobflow.config;

import com.jobflow.dto.CreateJobApplicationRequest;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.dto.UpdateJobApplicationRequest;
import com.jobflow.exception.ApiException;
import com.jobflow.exception.ExternalServiceException;
import com.jobflow.exception.NotFoundException;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.beanvalidation.SpringValidatorAdapter;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// The machine-readable side of error responses: "code" and "params" for the frontend to translate
class ErrorCodeTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final SpringValidatorAdapter validator =
            new SpringValidatorAdapter(Validation.buildDefaultValidatorFactory().getValidator());

    // Runs real bean validation, like Spring does for @Valid, and hands the result to the handler
    private Map<String, Object> validate(Object request) throws Exception {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, result);
        MethodParameter param = new MethodParameter(ErrorCodeTest.class.getDeclaredMethod("validate", Object.class), 0);
        return handler.handleValidation(new MethodArgumentNotValidException(param, result)).getBody();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> params(Map<String, Object> body) {
        return (Map<String, Object>) body.get("params");
    }

    @Test
    void apiException_carriesStatusCodeAndParams() {
        ResponseEntity<Map<String, Object>> response = handler.handleApi(
                ApiException.badRequest("COMPANY_NAME_TAKEN", "A company named 'Acme' already exists", Map.of("name", "Acme")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .containsEntry("code", "COMPANY_NAME_TAKEN")
                .containsEntry("params", Map.of("name", "Acme"))
                .containsEntry("message", "A company named 'Acme' already exists");
    }

    @Test
    void missingRequiredField_isFieldRequired() throws Exception {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setCompanyName("Acme");

        Map<String, Object> body = validate(request);

        assertThat(body).containsEntry("code", "FIELD_REQUIRED").containsEntry("message", "Position title is required");
        assertThat(params(body)).containsEntry("field", "positionTitle");
    }

    @Test
    void tooLongField_includesTheLimit() throws Exception {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("x".repeat(256));

        Map<String, Object> body = validate(request);

        assertThat(body).containsEntry("code", "FIELD_TOO_LONG");
        assertThat(params(body)).containsEntry("field", "positionTitle").containsEntry("max", 255);
    }

    @Test
    void blankPatternField_isFieldBlank() throws Exception {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setPositionTitle("   ");

        Map<String, Object> body = validate(request);

        assertThat(body).containsEntry("code", "FIELD_BLANK");
        assertThat(params(body)).containsEntry("field", "positionTitle");
    }

    @Test
    void shortPasswordAndBadEmail_eachGetTheirOwnCode() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("A");
        request.setEmail("not-an-email");
        request.setPassword("123");

        Map<String, Object> body = validate(request);

        // Several problems: a summary code plus one entry per field
        assertThat(body).containsEntry("code", "VALIDATION_FAILED");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
        assertThat(errors).extracting(e -> e.get("code")).containsExactlyInAnyOrder("INVALID_EMAIL", "FIELD_TOO_SHORT");
        Map<String, Object> password = errors.stream().filter(e -> "FIELD_TOO_SHORT".equals(e.get("code"))).findFirst().orElseThrow();
        assertThat(password.get("params")).isEqualTo(Map.of("field", "password", "min", 6));
    }

    @Test
    void notFound_defaultsToGenericCode() {
        assertThat(handler.handleNotFound(new NotFoundException("Job application not found: 9")).getBody())
                .containsEntry("code", "NOT_FOUND");
    }

    @Test
    void legacyIllegalArgument_hasNoCode_soTheMessageIsShownAsIs() {
        assertThat(handler.handleBadRequest(new IllegalArgumentException("Something specific")).getBody())
                .doesNotContainKey("code")
                .containsEntry("message", "Something specific");
    }

    @Test
    void externalAndServerErrors_haveCodes() {
        assertThat(handler.handleExternalService(new ExternalServiceException("GMAIL_UNAVAILABLE", "Couldn't reach Gmail", null)).getBody())
                .containsEntry("code", "GMAIL_UNAVAILABLE");
        assertThat(handler.handleGeneral(new RuntimeException("boom")).getBody())
                .containsEntry("code", "SERVER_ERROR");
    }

    @Test
    void rateLimit_bodyHasCodeAndSeconds() throws Exception {
        RateLimitInterceptor limiter = new RateLimitInterceptor();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.9.9.9");
        MockHttpServletResponse response = new MockHttpServletResponse();
        for (int i = 0; i < 61; i++) {
            response = new MockHttpServletResponse();
            limiter.preHandle(request, response, new Object());
        }

        assertThat(response.getContentAsString())
                .contains("\"code\":\"RATE_LIMITED\"")
                .containsPattern("\"params\":\\{\"seconds\":\\d+}");
    }
}
