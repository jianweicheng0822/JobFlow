package com.jobflow.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * An error the client can act on, with a stable code for the frontend to translate.
 *
 * The English message is kept for logs, API clients and as the frontend's fallback.
 * Params fill the translated template, e.g. COMPANY_NAME_TAKEN with {name: "Acme"}.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, Object> params;

    public ApiException(HttpStatus status, String code, String message, Map<String, Object> params) {
        super(message);
        this.status = status;
        this.code = code;
        this.params = params == null ? Map.of() : Map.copyOf(params);
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, Map.of());
    }

    public static ApiException badRequest(String code, String message, Map<String, Object> params) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, params);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
