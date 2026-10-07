package com.jobflow.config;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.jobflow.exception.ApiException;
import com.jobflow.exception.ExternalServiceException;
import com.jobflow.exception.NotFoundException;
import jakarta.validation.ConstraintViolation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Known client mistakes get a 400/404 with a message the user can act on.
// handleGeneral is only the safety net for real bugs and never leaks internals.
//
// Every body keeps an English "message"; most also carry a stable "code" plus
// "params" so the frontend can show the error in the user's language.
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        return body(ex.getStatus(), ex.getStatus().getReasonPhrase(), ex.getMessage(), ex.getCode(), ex.getParams(), null);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), ex.getCode(), ex.getParams(), null);
    }

    // Older throw sites without a code; the frontend shows their English message as-is
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), null, null, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        List<Map<String, Object>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::describe)
                .distinct()
                .toList();
        // Our validation messages already name the field, so show them as-is
        String message = errors.stream()
                .map(e -> String.valueOf(e.get("message")))
                .distinct()
                .collect(Collectors.joining("; "));
        if (errors.size() == 1) {
            Map<String, Object> only = errors.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> params = (Map<String, Object>) only.get("params");
            return body(HttpStatus.BAD_REQUEST, "Validation Error", message, (String) only.get("code"), params, errors);
        }
        return body(HttpStatus.BAD_REQUEST, "Validation Error", message.isEmpty() ? "Validation failed" : message,
                "VALIDATION_FAILED", null, errors);
    }

    // Body that isn't valid JSON, or has a value of the wrong type (e.g. an unknown status)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof InvalidFormatException ife) {
            String field = fieldPath(ife);
            return body(HttpStatus.BAD_REQUEST, "Bad Request",
                    "Invalid value '" + ife.getValue() + "' for '" + field + "'",
                    "INVALID_VALUE", params("field", field, "value", String.valueOf(ife.getValue())), null);
        }
        if (ex.getCause() instanceof JsonMappingException jme && !jme.getPath().isEmpty()) {
            String field = fieldPath(jme);
            return body(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid value for '" + field + "'",
                    "INVALID_VALUE", params("field", field), null);
        }
        return body(HttpStatus.BAD_REQUEST, "Bad Request", "Request body is not valid JSON", "INVALID_JSON", null, null);
    }

    // Query/path parameter of the wrong type, e.g. ?status=BOGUS or /applications/abc
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request",
                "Invalid value '" + ex.getValue() + "' for '" + ex.getName() + "'",
                "INVALID_VALUE", params("field", ex.getName(), "value", String.valueOf(ex.getValue())), null);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request",
                "Missing required parameter '" + ex.getParameterName() + "'",
                "MISSING_PARAMETER", params("field", ex.getParameterName()), null);
    }

    // Gmail and friends: not the user's fault and not ours, so 502 with a retry hint
    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<Map<String, Object>> handleExternalService(ExternalServiceException ex) {
        log.warn("External service failed: {}", ex.getMessage(), ex.getCause());
        return body(HttpStatus.BAD_GATEWAY, "Bad Gateway", ex.getMessage(), ex.getCode(), null, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return body(HttpStatus.CONFLICT, "Conflict",
                "Operation failed due to a data constraint. The record may have dependent data.",
                "DATA_CONFLICT", null, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        // Full details go to the log only; the client gets a generic message
        log.error("Unhandled exception", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "Unexpected server error. Please try again later.", "SERVER_ERROR", null, null);
    }

    // One field error as {code, params, message}. Codes are generic per constraint type
    // (FIELD_REQUIRED, FIELD_TOO_LONG...) and the frontend translates the field name.
    private static Map<String, Object> describe(FieldError error) {
        Map<String, Object> attrs = constraintAttributes(error);
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("field", error.getField());

        String code = switch (error.getCode() == null ? "" : error.getCode()) {
            case "NotBlank", "NotNull", "NotEmpty" -> "FIELD_REQUIRED";
            // Our @Pattern constraints only check "has a non-space character"
            case "Pattern" -> "FIELD_BLANK";
            case "Email" -> "INVALID_EMAIL";
            case "Size" -> {
                int min = attrs.get("min") instanceof Integer i ? i : 0;
                int max = attrs.get("max") instanceof Integer i ? i : Integer.MAX_VALUE;
                if (min > 0 && lengthOf(error.getRejectedValue()) < min) {
                    params.put("min", min);
                    yield "FIELD_TOO_SHORT";
                }
                params.put("max", max);
                yield "FIELD_TOO_LONG";
            }
            default -> "INVALID_FIELD";
        };

        Map<String, Object> described = new LinkedHashMap<>();
        described.put("code", code);
        described.put("params", params);
        described.put("message", error.getDefaultMessage());
        return described;
    }

    private static Map<String, Object> constraintAttributes(FieldError error) {
        try {
            return error.unwrap(ConstraintViolation.class).getConstraintDescriptor().getAttributes();
        } catch (IllegalArgumentException e) {
            return Map.of(); // not from bean validation (e.g. a hand-built error)
        }
    }

    private static int lengthOf(Object value) {
        if (value instanceof CharSequence s) return s.length();
        if (value instanceof Collection<?> c) return c.size();
        return 0;
    }

    // "interviews[0].status" style path from the Jackson error
    private static String fieldPath(JsonMappingException ex) {
        return ex.getPath().stream()
                .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
                .collect(Collectors.joining("."))
                .replace(".[", "[");
    }

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String error, String message,
                                                            String code, Map<String, Object> params,
                                                            List<Map<String, Object>> errors) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message != null ? message : error);
        if (code != null) body.put("code", code);
        if (params != null && !params.isEmpty()) body.put("params", params);
        if (errors != null && !errors.isEmpty()) body.put("errors", errors);
        return ResponseEntity.status(status).body(body);
    }
}
