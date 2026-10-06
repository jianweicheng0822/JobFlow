package com.jobflow.config;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.jobflow.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

// Known client mistakes get a 400/404 with a message the user can act on.
// handleGeneral is only the safety net for real bugs and never leaks internals.
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        // Our validation messages already name the field, so show them as-is
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining("; "));
        return body(HttpStatus.BAD_REQUEST, "Validation Error", message.isEmpty() ? "Validation failed" : message);
    }

    // Body that isn't valid JSON, or has a value of the wrong type (e.g. an unknown status)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        String message = "Request body is not valid JSON";
        if (ex.getCause() instanceof InvalidFormatException ife) {
            message = "Invalid value '" + ife.getValue() + "' for '" + fieldPath(ife) + "'";
        } else if (ex.getCause() instanceof JsonMappingException jme && !jme.getPath().isEmpty()) {
            message = "Invalid value for '" + fieldPath(jme) + "'";
        }
        return body(HttpStatus.BAD_REQUEST, "Bad Request", message);
    }

    // Query/path parameter of the wrong type, e.g. ?status=BOGUS or /applications/abc
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request",
                "Invalid value '" + ex.getValue() + "' for '" + ex.getName() + "'");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return body(HttpStatus.BAD_REQUEST, "Bad Request",
                "Missing required parameter '" + ex.getParameterName() + "'");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return body(HttpStatus.CONFLICT, "Conflict",
                "Operation failed due to a data constraint. The record may have dependent data.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        // Full details go to the log only; the client gets a generic message
        log.error("Unhandled exception", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "Unexpected server error. Please try again later.");
    }

    // "interviews[0].status" style path from the Jackson error
    private static String fieldPath(JsonMappingException ex) {
        return ex.getPath().stream()
                .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
                .collect(Collectors.joining("."))
                .replace(".[", "[");
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String error, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "timestamp", LocalDateTime.now().toString(),
            "status", status.value(),
            "error", error,
            "message", message != null ? message : error
        ));
    }
}
