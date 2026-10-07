package com.jobflow.exception;

import java.util.Map;

// 404. Code and params let the frontend say what wasn't found in the user's language.
public class NotFoundException extends RuntimeException {

    private final String code;
    private final Map<String, Object> params;

    public NotFoundException(String message) {
        this("NOT_FOUND", message, Map.of());
    }

    public NotFoundException(String code, String message, Map<String, Object> params) {
        super(message);
        this.code = code;
        this.params = params == null ? Map.of() : Map.copyOf(params);
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
